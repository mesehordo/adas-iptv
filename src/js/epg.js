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
const pending = new Map();
const onWorkerMessage = (e) => {
  const p = pending.get(e.data.id);
  if (!p) return;
  pending.delete(e.data.id);
  e.data.error ? p.reject(new Error(e.data.error)) : p.resolve(e.data);
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
async function parse(text) {
  const worker = await workerReady;
  const id = ++reqId;
  const from = Date.now() - 24 * 3600e3;
  const to = Date.now() + 7 * 24 * 3600e3;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    worker.postMessage({ id, text, from, to });
  });
}

/** Program: { start, stop, title, desc, category, subtitle, episode, age (korhatár, 0 = nincs adat) } */
const toProg = (r) => ({ start: r[0], stop: r[1], title: r[2] || 'Műsor', desc: r[3], category: r[4], subtitle: r[5], episode: r[6], age: r[7] || 0 });

export const epg = {
  byChannel: new Map(), // catalog id -> program[]
  status: {}, // forrás url -> { ok, channels, matched, programs, error, at }
  loading: false,
  loadedAt: 0,

  has(id) {
    return this.byChannel.has(id);
  },

  list(id) {
    return this.byChannel.get(id) || [];
  },

  now(id, t = Date.now()) {
    const list = this.byChannel.get(id);
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
    for (const [id, list] of this.byChannel) {
      for (const p of list) {
        if (p.stop < now || p.start > until) continue;
        const hay = p._n || (p._n = (p.title + ' ' + (p.subtitle || '')).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase());
        if (tokens.every((t) => hay.includes(t))) out.push({ channelId: id, prog: p });
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
    const index = buildIndex();
    const sources = this.sources();
    const parsed = new Array(sources.length);
    // Egyszerre legfeljebb 3 forrás töltődik.
    let i = 0;
    const run = async () => {
      while (i < sources.length) {
        const n = i++;
        const src = sources[n];
        try {
          const { text, cachedAt } = await api.fetchText(src.url, { maxAgeHours: store.settings.epgRefreshHours, force });
          parsed[n] = await parse(text);
          this.status[src.url] = {
            ok: true,
            channels: Object.keys(parsed[n].channels).length,
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
      if (parsed[n]) this.status[src.url].matched = assign(parsed[n], index, result);
    });
    this.byChannel = result;
    this.loading = false;
    this.loadedAt = Date.now();
    bus.emit('epg-loading', false);
    bus.emit('epg');
  },
};

// ---------------------------------------------------------------------------
// Párosítás: pontos tvg-id → azonosító-kulcs országgal → név országgal → név
// ---------------------------------------------------------------------------
function stripSuffix(k) {
  return k.replace(/(uhd|fhd|hd|sd|4k)$/, '') || k;
}

function idKey(id) {
  const base = id.split('@')[0];
  const m = base.match(/^(.*)\.([a-z]{2,3})$/i);
  const name = m ? m[1] : base;
  const cc = m ? m[2].toLowerCase() : '';
  return { k: stripSuffix(key(name)), cc };
}

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

function resolve(epgId, names, idx) {
  const lower = epgId.toLowerCase();
  if (idx.exact.has(lower)) return idx.exact.get(lower);
  const base = lower.split('@')[0];
  if (idx.exact.has(base)) return idx.exact.get(base);
  const { k, cc } = idKey(epgId);
  const ccs = cc === 'uk' ? ['gb', 'uk'] : [cc];
  for (const c of ccs) {
    const hit = idx.withCc.get(k + '.' + c);
    if (hit) return hit;
  }
  for (const n of names) {
    const nk = stripSuffix(key(n));
    for (const c of ccs) {
      const hit = idx.nameCc.get(nk + '.' + c);
      if (hit) return hit;
    }
  }
  for (const n of [k, ...names.map((n) => stripSuffix(key(n)))]) {
    const hit = idx.nameOnly.get(n);
    if (hit) return hit;
  }
  return null;
}

function assign(data, idx, result) {
  let matched = 0;
  const ids = new Set([...Object.keys(data.channels), ...Object.keys(data.programs)]);
  for (const epgId of ids) {
    const progs = data.programs[epgId];
    if (!progs?.length) continue;
    const chId = resolve(epgId, data.channels[epgId] || [], idx);
    // Az elsőként betöltött (magasabb prioritású) forrás nyer.
    if (!chId || result.has(chId)) continue;
    result.set(chId, progs.map(toProg));
    matched++;
  }
  return matched;
}
