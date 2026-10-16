// Műsorújság: XMLTV források letöltése, feldolgozása (worker) és a csatornákhoz rendelése.
import { api, IS_ANDROID } from './api.js';
import { store, epgSourceName } from './store.js';
import { catalog } from './catalog.js';
import { radio, radioEpgEntries, radioEpgSig } from './radio.js';
import { bus, key } from './util.js';

// A TV-s (egy fájlba csomagolt) változatban az import.meta nem használható; ott a js/ mappából töltjük.
import { _t } from './i18n.js';
let workerUrl;
try {
  workerUrl = new URL('./epg-worker.js', import.meta.url);
} catch {
  workerUrl = 'js/epg-worker.js';
}
let reqId = 0;
let indexFor = null; // melyik csatornalistához készült a háttérszálnak elküldött index
let indexRadio = ''; // … és melyik rádióadó-körhöz (radioEpgSig)
let reloadAfter = false; // betöltés közben újabb kérés érkezett
let reloadForce = false;
// (B24) csatorna → a forrás címe, amelyből a mostani műsora jött: egy forrás sikertelen frissítésekor a
// korábbi, még használható műsorai ebből maradnak meg (a már meglévő adatra hivatkozva, másolás nélkül)
let sourceOf = new Map();
const pending = new Map();
const onWorkerMessage = (e) => {
  const p = pending.get(e.data.id);
  if (!p) return;
  if (e.data.error) {
    pending.delete(e.data.id);
    return p.reject(new Error(e.data.error));
  }
  // a párosított műsorok részletekben jönnek; az utolsó üzenet hozza az összesítést
  (p.matched ||= []).push(...e.data.chunk);
  if (!e.data.done) return;
  pending.delete(e.data.id);
  p.resolve({ ...e.data, matched: p.matched });
};
// Androidon a háttérszál szkriptjét a memóriából indítjuk: a WebView a worker betöltését nem
// mindig a keret saját kiszolgálóján át kéri.
// (B23) A háttérszál szükség szerint indul; sikertelen indítás vagy futási hiba után újra létrejön (a függő
// kérések hibát kapnak, az index újraküldésre kerül) – nem marad egyetlen, végleg elutasított ígéret.
let workerP = null;
function getWorker() {
  if (!workerP) {
    const p = (IS_ANDROID
      ? fetch(workerUrl).then((r) => r.text()).then((t) => new Worker(URL.createObjectURL(new Blob([t], { type: 'application/javascript' }))))
      : Promise.resolve().then(() => new Worker(workerUrl))
    ).then((w) => {
      w.onmessage = onWorkerMessage;
      w.onerror = (e) => {
        w.terminate();
        // (egy már lecserélt háttérszál késői hibája ne állítsa le az újat, és ne utasítsa el annak kéréseit)
        if (workerP === p) failWorker(new Error(e?.message || 'a műsorújság-feldolgozó leállt'));
      };
      return w;
    });
    workerP = p;
    p.catch(() => {
      if (workerP === p) workerP = null;
    });
  }
  return workerP;
}
function failWorker(err) {
  for (const p of pending.values()) p.reject(err);
  pending.clear();
  workerP?.then((w) => w.terminate()).catch(() => {});
  workerP = null;
  indexFor = null; // (az új háttérszál még nem kapta meg az indexet)
  indexRadio = '';
}
/** Feldolgozás a háttérszálon. `data`: szöveg, vagy UTF-8 bájtok (asztali változat – ezt másolás nélkül adjuk át). */
async function parse(data) {
  const worker = await getWorker();
  const id = ++reqId;
  const from = Date.now() - 24 * 3600e3;
  const to = Date.now() + 7 * 24 * 3600e3;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    if (typeof data === 'string') worker.postMessage({ id, text: data, from, to });
    else {
      const u8 = data instanceof Uint8Array ? data : new Uint8Array(data);
      const buf = u8.byteOffset === 0 && u8.byteLength === u8.buffer.byteLength ? u8.buffer : u8.slice().buffer;
      worker.postMessage({ id, bytes: buf, from, to }, [buf]);
    }
  });
}
/** Letöltés (gyorsítótárral): ahol lehet, bájtként. */
const fetchSource = (url, opts) =>
  // (a bájtos út csak http(s); a helyi – file:// – forrás a szöveges úton megy)
  api.fetchBytes && /^https?:\/\//i.test(url) ? api.fetchBytes(url, opts).then((r) => ({ data: r.bytes, cachedAt: r.cachedAt })) : api.fetchText(url, opts).then((r) => ({ data: r.text, cachedAt: r.cachedAt }));

/** Program: { start, stop, title, desc, category, subtitle, episode, age (korhatár, 0 = nincs adat) } */
const toProg = (r) => ({ start: r[0], stop: r[1], title: r[2] || _t('Műsor'), desc: r[3], category: r[4], subtitle: r[5], episode: r[6], age: r[7] || 0 });
// A háttérszál tömböket ad; a műsor-objektumok csatornánként, az első használatkor jönnek létre
// (több százezer objektum egyszerre a felületet másodpercekre megakasztotta).
const PROGS = Symbol('progs');
/**
 * Egy csatorna műsorai két forrásból: a `have` (magasabb prioritású) sorai maradnak, a `rows`-ból csak az kerül
 * hozzá, ami a `have` első műsora előtt véget ér, vagy az utolsó vége után kezdődik. A `have` lehet nyers
 * (tömbös) vagy már átalakított (objektumos) lista – az eredmény ugyanolyan fajta, időrendben. → új lista, vagy
 * változás nélkül maga a `have`.
 */
function fillGaps(have, rows) {
  const st = (r) => (Array.isArray(r) ? r[0] : r.start);
  const sp = (r) => (Array.isArray(r) ? r[1] : r.stop);
  const first = st(have[0]);
  const last = sp(have[have.length - 1]);
  const extra = rows.filter((r) => sp(r) <= first || st(r) >= last);
  if (!extra.length) return have;
  const conv = !!have[PROGS];
  const add = new Set(conv ? extra.map((r) => (Array.isArray(r) ? toProg(r) : r)) : extra);
  const all = [...have, ...add].sort((a, b) => st(a) - st(b));
  // a pótló sorok egymással is átfedhetnek (a forrásban): ami az előző megtartott sor vége előtt kezdődik, kimarad –
  // így az epg.now() nem egy átfedő, később kezdődő sort ad. A magasabb prioritású forrás sorai érintetlenek.
  const out = [];
  for (const r of all) {
    const prev = out[out.length - 1];
    if (add.has(r) && prev && st(r) < sp(prev)) continue;
    out.push(r);
  }
  if (conv) out[PROGS] = true;
  return out;
}
/** Egy csatorna műsorai objektumként (az első híváskor alakítjuk át és cseréljük a térképben). */
function progsOf(map, id) {
  const v = map.get(id);
  if (!v || v[PROGS]) return v;
  const out = v.map(toProg);
  out[PROGS] = true;
  map.set(id, out);
  return out;
}

export const epg = {
  byChannel: new Map(), // catalog id -> program[] (első használatig nyers sorok)
  status: {}, // forrás url -> { ok, channels, matched, programs, error, at }
  loading: false,
  loadedAt: 0,

  has(id) {
    return this.byChannel.has(id);
  },

  list(id) {
    return progsOf(this.byChannel, id) || [];
  },

  now(id, t = Date.now()) {
    const list = progsOf(this.byChannel, id);
    if (!list) return null;
    let lo = 0;
    let hi = list.length - 1;
    let idx = -1;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      if (list[mid].start <= t) {
        idx = mid;
        lo = mid + 1;
      } else hi = mid - 1;
    }
    const cur = idx >= 0 && list[idx].stop > t ? list[idx] : null;
    const next = list[idx + 1] || null;
    if (!cur && !next) return null;
    const progress = cur ? (t - cur.start) / (cur.stop - cur.start) : 0;
    return { cur, next, progress };
  },

  range(id, from, to) {
    return this.list(id).filter((p) => p.stop > from && p.start < to);
  },

  /** Műsorok keresése a következő 2 napban. */
  searchPrograms(tokens, limit = 60) {
    const out = [];
    const now = Date.now();
    const until = now + 48 * 3600e3;
    const fold = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
    for (const [id, list] of this.byChannel) {
      const conv = !!list[PROGS];
      for (let i = 0; i < list.length; i++) {
        const x = list[i];
        // még nem átalakított csatornánál a nyers sort nézzük, és csak a találatot alakítjuk át
        const start = conv ? x.start : x[0];
        const stop = conv ? x.stop : x[1];
        if (stop < now || start > until) continue;
        const hay = conv ? x._n || (x._n = fold(x.title + ' ' + (x.subtitle || ''))) : fold((x[2] || _t('Műsor')) + ' ' + (x[5] || ''));
        if (tokens.every((t) => hay.includes(t))) out.push({ channelId: id, prog: conv ? x : toProg(x) }); // csak a találat lesz objektum
      }
    }
    out.sort((a, b) => a.prog.start - b.prog.start);
    return out.slice(0, limit);
  },

  sources() {
    const s = store.settings;
    const list = s.epgSources.filter((x) => x.enabled).map((x) => ({ url: x.url, name: epgSourceName(x) }));
    if (s.useEmbeddedEpg) for (const url of catalog.tvgUrls || []) if (!list.some((x) => x.url === url)) list.push({ url, name: _t('Lejátszólista műsorújsága') });
    return list;
  },

  async load({ force = false } = {}) {
    // betöltés közben érkező kérés (pl. közben cserélődött a csatornalista): a végén újra lefut
    if (this.loading) {
      reloadAfter = true;
      reloadForce ||= force;
      return;
    }
    this.loading = true;
    bus.emit('epg-loading', true);
    let failed = false;
    try {
      await this.loadOnce(force);
      this.lastError = '';
    } catch (err) {
      // (B23) bármilyen hiba után is véget ér a betöltés – a következő kérés valóban újrapróbál
      failed = true;
      this.lastError = String(err?.message || err);
      console.warn('Műsorújság:', err);
    } finally {
      this.loading = false;
      bus.emit('epg-loading', false);
    }
    bus.emit('epg');
    // ha közben kérték, vagy a csatornalista cserélődött (régi indexszel párosítottunk): még egy kör. Hiba után
    // csak kifejezett újabb kérésre – az érvénytelen index magában ne indítson azonnali, végtelen újrapróbálást.
    if (reloadAfter || (!failed && (indexFor !== catalog.channels || indexRadio !== radioEpgSig()))) {
      const f = reloadForce;
      reloadAfter = false;
      reloadForce = false;
      return this.load({ force: f });
    }
  },

  async loadOnce(force) {
    // A párosításhoz szükséges index a háttérszálba megy – csak ha a csatornalista azóta változott; érvényesnek
    // csak a sikeres átadás után számít
    if (indexFor !== catalog.channels || indexRadio !== radioEpgSig()) {
      const forList = catalog.channels;
      const forRadio = radioEpgSig();
      (await getWorker()).postMessage({ type: 'index', index: buildIndex() });
      indexFor = forList;
      indexRadio = forRadio;
    }
    const sources = this.sources();
    const parsed = new Array(sources.length);
    // Egyszerre legfeljebb 3 forrás töltődik.
    let i = 0;
    const run = async () => {
      while (i < sources.length) {
        const n = i++;
        const src = sources[n];
        try {
          const { data, cachedAt } = await fetchSource(src.url, { maxAgeHours: store.settings.epgRefreshHours, force });
          parsed[n] = await parse(data);
          this.status[src.url] = {
            ok: true,
            channels: parsed[n].nChannels,
            programs: parsed[n].count,
            at: cachedAt,
            okAt: Date.now(),
          };
        } catch (err) {
          // (az utolsó próbálkozás és az utolsó sikeres betöltés ideje külön)
          this.status[src.url] = { ok: false, error: String(err.message || err), at: Date.now(), okAt: this.status[src.url]?.okAt || 0 };
        }
        bus.emit('epg-progress', this.status);
      }
    };
    await Promise.all([run(), run(), run()]);
    // Párosítás a lista sorrendjében: a korábbi forrás élvez elsőbbséget. A sikertelen forrás korábbi, még
    // használható műsorai megmaradnak (elavultként jelölve); a kikapcsolt / törölt forrásé nem (nincs a listában).
    const result = new Map();
    const nextSource = new Map();
    sources.forEach((src, n) => {
      let matched = 0;
      if (parsed[n]) {
        for (const [chId, rows] of parsed[n].matched) {
          const have = result.get(chId);
          if (have?.length) {
            // a korábbi (magasabb prioritású) forrás műsorai maradnak; ahol azok véget érnek vagy később kezdődnek,
            // ez a forrás pótolja – egy csak a tegnapi napot adó forrás mellett is van mai műsor
            const filled = fillGaps(have, rows);
            if (filled !== have) result.set(chId, filled);
            continue;
          }
          result.set(chId, rows);
          nextSource.set(chId, src.url);
          matched++;
        }
        this.status[src.url].matched = matched;
        return;
      }
      for (const [chId, url] of sourceOf) {
        if (url !== src.url || result.has(chId) || !this.byChannel.has(chId)) continue;
        result.set(chId, this.byChannel.get(chId));
        nextSource.set(chId, url);
        matched++;
      }
      if (matched) Object.assign(this.status[src.url], { stale: true, matched });
    });
    this.byChannel = result;
    sourceOf = nextSource;
    this.lastAttempt = Date.now();
    // (teljes kudarcnál a „frissítve” időpont nem lesz friss)
    if (parsed.some(Boolean)) this.loadedAt = Date.now();
  },
};

// ---------------------------------------------------------------------------
// Párosítási index (a párosítás maga a háttérszálban fut: epg-worker.js)
// ---------------------------------------------------------------------------
/** A minőségjelölő végződés (HD, FHD, 4K...) levágása. */
function stripSuffix(k) {
  return k.replace(/(uhd|fhd|hd|sd|4k)$/, '') || k;
}

/** XMLTV-azonosító -> { k: névkulcs, cc: országkód } */
function idKey(id) {
  const base = id.split('@')[0];
  const m = base.match(/^(.*)\.([a-z]{2,3})$/i);
  const name = m ? m[1] : base;
  const cc = m ? m[2].toLowerCase() : '';
  return { k: stripSuffix(key(name)), cc };
}

/** Párosítási index a csatornalistából (pontos tvg-id, azonosító-kulcs + ország, név + ország, név). */
function buildIndex() {
  const exact = new Map();
  const withCc = new Map();
  const nameCc = new Map();
  const nameOnly = new Map();
  const put = (map, k, id) => {
    if (!k) return;
    if (!map.has(k)) map.set(k, id);
    else if (map.get(k) !== id) map.set(k, null); // nem egyértelmű
  };
  for (const ch of catalog.channels) {
    const cc = (ch.country === 'UK' ? 'gb' : ch.country).toLowerCase();
    for (const t of ch.tvgIds) {
      exact.set(t.toLowerCase(), ch.id);
      exact.set(t.split('@')[0].toLowerCase(), ch.id);
      const { k, cc: c2 } = idKey(t);
      put(withCc, k + '.' + (c2 || cc), ch.id);
    }
    for (const n of [ch.name, ...ch.altNames]) {
      const k = stripSuffix(key(n));
      put(nameCc, k + '.' + cc, ch.id);
      put(nameOnly, k, ch.id);
    }
  }
  // rádióadók: csak név szerint, és csak ahol egyetlen tévécsatorna neve sem ugyanaz (a tévé elsőbbséget élvez)
  const tvNames = new Set(nameOnly.keys());
  for (const r of radioEpgEntries()) {
    for (const n of r.names) {
      const k = stripSuffix(key(n));
      if (!k || tvNames.has(k)) continue;
      put(nameCc, k + '.' + r.cc, r.id);
      put(nameOnly, k, r.id);
    }
  }
  return { exact, withCc, nameCc, nameOnly };
}

// betöltött rádióadók (hazai ország, új kedvenc): a műsorújság újrapárosítása – a forrásfájlok a gyorsítótárból jönnek
let radioEpgTimer = 0;
bus.on('radio', () => {
  clearTimeout(radioEpgTimer);
  radioEpgTimer = setTimeout(() => {
    if (radio.ready && epg.loadedAt && !epg.loading && indexRadio !== radioEpgSig()) epg.load();
  }, 4000);
});
bus.on('radio-favs', () => bus.emit('radio'));
