// Műsorújság: XMLTV források letöltése, feldolgozása (worker) és a csatornákhoz rendelése.
import { api, IS_ANDROID } from './api.js';
import { store } from './store.js';
import { catalog } from './catalog.js';
import { bus, key } from './util.js';

// A TV-s (egy fájlba csomagolt) változatban az import.meta nem használható; ott a js/ mappából töltjük.
let workerUrl;
try {
  workerUrl = new URL('./epg-worker.js', import.meta.url);
} catch {
  workerUrl = 'js/epg-worker.js';
}
let reqId = 0;
let indexFor = null; // melyik csatornalistához készült a háttérszálnak elküldött index
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
const workerReady = (IS_ANDROID
  ? fetch(workerUrl).then((r) => r.text()).then((t) => new Worker(URL.createObjectURL(new Blob([t], { type: 'application/javascript' }))))
  : Promise.resolve(new Worker(workerUrl))
).then((w) => {
  w.onmessage = onWorkerMessage;
  return w;
});
/** Feldolgozás a háttérszálon. `data`: szöveg, vagy UTF-8 bájtok (asztali változat – ezt másolás nélkül adjuk át). */
async function parse(data) {
  const worker = await workerReady;
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
  api.fetchBytes ? api.fetchBytes(url, opts).then((r) => ({ data: r.bytes, cachedAt: r.cachedAt })) : api.fetchText(url, opts).then((r) => ({ data: r.text, cachedAt: r.cachedAt }));

/** Program: { start, stop, title, desc, category, subtitle, episode, age (korhatár, 0 = nincs adat) } */
const toProg = (r) => ({ start: r[0], stop: r[1], title: r[2] || 'Műsor', desc: r[3], category: r[4], subtitle: r[5], episode: r[6], age: r[7] || 0 });
// A háttérszál tömböket ad; a műsor-objektumok csatornánként, az első használatkor jönnek létre
// (több százezer objektum egyszerre a felületet másodpercekre megakasztotta).
const PROGS = Symbol('progs');
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
        const hay = conv ? x._n || (x._n = fold(x.title + ' ' + (x.subtitle || ''))) : fold((x[2] || 'Műsor') + ' ' + (x[5] || ''));
        if (tokens.every((t) => hay.includes(t))) out.push({ channelId: id, prog: conv ? x : this.list(id)[i] });
      }
    }
    out.sort((a, b) => a.prog.start - b.prog.start);
    return out.slice(0, limit);
  },

  sources() {
    const s = store.settings;
    const list = s.epgSources.filter((x) => x.enabled).map((x) => ({ url: x.url, name: x.name }));
    if (s.useEmbeddedEpg) for (const url of catalog.tvgUrls || []) if (!list.some((x) => x.url === url)) list.push({ url, name: 'Lejátszólista műsorújsága' });
    return list;
  },

  async load({ force = false } = {}) {
    if (this.loading) return;
    this.loading = true;
    bus.emit('epg-loading', true);
    // A párosításhoz szükséges index a háttérszálba megy – csak ha a csatornalista azóta változott
    if (indexFor !== catalog.channels) {
      indexFor = catalog.channels;
      (await workerReady).postMessage({ type: 'index', index: buildIndex() });
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
          };
        } catch (err) {
          this.status[src.url] = { ok: false, error: String(err.message || err), at: Date.now() };
        }
        bus.emit('epg-progress', this.status);
      }
    };
    await Promise.all([run(), run(), run()]);
    // Párosítás a lista sorrendjében: a korábbi forrás élvez elsőbbséget.
    const result = new Map();
    sources.forEach((src, n) => {
      if (!parsed[n]) return;
      let matched = 0;
      for (const [chId, rows] of parsed[n].matched) {
        if (result.has(chId)) continue; // az elsőként betöltött (magasabb prioritású) forrás nyer
        result.set(chId, rows);
        matched++;
      }
      this.status[src.url].matched = matched;
    });
    this.byChannel = result;
    this.loading = false;
    this.loadedAt = Date.now();
    bus.emit('epg-loading', false);
    bus.emit('epg');
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
  return { exact, withCc, nameCc, nameOnly };
}
