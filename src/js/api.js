// Híd a futtatókörnyezethez:
//  - Electron (asztali): a preload.js adja (window.api), minden képesség elérhető;
//  - LG webOS TV: a csomagban lévő háttérszolgáltatáson (Luna) keresztül tölt le CORS nélkül;
//  - sima böngésző (fejlesztéshez): korlátozott, a CORS miatt a legtöbb adás nem játszható.

export const IS_WEBOS = !!window.ADAS_WEBOS || /Web0S|webOS|NetCast/i.test(navigator.userAgent);
export const IS_ANDROID = !!window.ADAS_ANDROID && !!window.AdasAndroid;
const ANDROID_TV = IS_ANDROID && (() => {
  try {
    return !!window.AdasAndroid.isTv();
  } catch {
    return false;
  }
})();
/** Tévés (távirányítós, 10 lábas) felület: LG webOS vagy Android TV. */
export const IS_TV = IS_WEBOS || ANDROID_TV;
const WEBOS_SERVICE = 'luna://hu.adas.tv.service/';

// ---------------------------------------------------------------------------
// Kulcs–érték tár IndexedDB-ben (letöltések és feldolgozott katalógus gyorsítótára)
// ---------------------------------------------------------------------------
let dbPromise = null;
function db() {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open('adas', 2);
      req.onupgradeneeded = () => {
        const names = req.result.objectStoreNames;
        if (!names.contains('kv')) req.result.createObjectStore('kv');
        // Tartós adatok (pl. fájlból felvett nagy listák) – a gyorstár ürítése nem törli.
        if (!names.contains('docs')) req.result.createObjectStore('docs');
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
  return dbPromise;
}
async function idb(mode, fn, storeName = 'kv') {
  const d = await db();
  return new Promise((resolve, reject) => {
    const tx = d.transaction(storeName, mode);
    const req = fn(tx.objectStore(storeName));
    tx.oncomplete = () => resolve(req && req.result);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}
const idbGet = (k) => idb('readonly', (s) => s.get(k)).catch(() => undefined);
const idbSet = (k, v) => idb('readwrite', (s) => s.put(v, k)).catch(() => {});
const idbClear = () => idb('readwrite', (s) => s.clear()).catch(() => {});

import { bytesToText } from './unzip.js';

// Letöltött dokumentum (lista, műsorújság) felső mérete – kicsomagolva is (egy kicsi, de erősen tömörített
import { _t } from './i18n.js';
// válasz se foglalhasson sokszoros memóriát).
const MAX_DOC = 256 * 1024 * 1024;

/** Folyam beolvasása legfeljebb `max` bájtig → Uint8Array (afölött hiba, a folyam leáll). */
async function readCapped(stream, max = MAX_DOC) {
  const reader = stream.getReader();
  const parts = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > max) {
      reader.cancel().catch(() => {});
      throw new Error(_t('A letöltött fájl túl nagy'));
    }
    parts.push(value);
  }
  const out = new Uint8Array(size);
  let o = 0;
  for (const p of parts) out.set(p, (o += p.length) - p.length);
  return out;
}

async function gunzipIfNeeded(buf) {
  const b = new Uint8Array(buf);
  if (b[0] === 0x1f && b[1] === 0x8b) {
    if (!('DecompressionStream' in window)) throw new Error(_t('A tömörített fájl itt nem bontható ki'));
    const stream = new Blob([b]).stream().pipeThrough(new DecompressionStream('gzip'));
    return bytesToText(await readCapped(stream));
  }
  return bytesToText(b);
}

/** Gyorsítótárazott letöltés; a tényleges letöltést a `download` végzi. */
async function cachedFetchText(url, { maxAgeHours = 24, force = false } = {}, download) {
  const key = 'f:' + url;
  const hit = await idbGet(key);
  if (hit && !force && Date.now() - hit.at < maxAgeHours * 3600e3) {
    return { text: hit.text, cachedAt: hit.at, fromCache: true };
  }
  try {
    const text = await download(url);
    const at = Date.now();
    idbSet(key, { text, at });
    return { text, cachedAt: at, fromCache: false };
  } catch (err) {
    if (hit) return { text: hit.text, cachedAt: hit.at, fromCache: true, stale: true };
    throw err;
  }
}

async function directDownload(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return gunzipIfNeeded(res.body ? await readCapped(res.body) : await res.arrayBuffer());
}

// ---------------------------------------------------------------------------
// Böngésző
// ---------------------------------------------------------------------------
const webApi = {
  native: false,
  platform: 'web',
  caps: { mini: false, fullscreen: true, files: true, external: true, health: false, preview: false, exit: false, multiview: 4 },
  fetchText: (url, opts) => cachedFetchText(url, opts, directDownload),
  /** Általános HTTP-kérés: { method, url, headers, body } → { status, text } */
  async request({ method = 'GET', url, headers = {}, body } = {}) {
    // A böngésző a User-Agent fejlécet nem engedi; az OpenSubtitles X-User-Agent-et is elfogad.
    const h = { ...headers };
    if (h['User-Agent']) {
      h['X-User-Agent'] = h['User-Agent'];
      delete h['User-Agent'];
    }
    const res = await fetch(url, { method, headers: h, body });
    return { status: res.status, text: await res.text() };
  },
  /** Letöltés bájtként (ZIP, nem UTF-8 kódolású szöveg) → { status, bytes } */
  async requestBytes(url) {
    const res = await fetch(url);
    return { status: res.status, bytes: new Uint8Array(await res.arrayBuffer()) };
  },
  async setStreamHeaders() {},
  async checkStreams() {
    return { results: {}, cancelled: false };
  },
  async cancelCheck() {},
  onCheckProgress() {},
  kvGet: (k) => idbGet('kv:' + k),
  kvSet: (k, v) => idbSet('kv:' + k, v),
  docGet: (k) => idb('readonly', (s) => s.get(k), 'docs').catch(() => undefined),
  docSet: (k, v) => idb('readwrite', (s) => (v == null ? s.delete(k) : s.put(v, k)), 'docs'),
  async storeLoad() {
    try {
      return JSON.parse(localStorage.getItem('adas-store'));
    } catch {
      return null;
    }
  },
  async storeSave(data) {
    try {
      localStorage.setItem('adas-store', JSON.stringify(data));
    } catch {}
  },
  clearCache: idbClear,
  async saveFile(name, text) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    return true;
  },
  openFile(filters) {
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = (filters || []).map((f) => f.extensions.map((e) => '.' + e).join(',')).join(',');
      input.onchange = async () => {
        const f = input.files[0];
        resolve(f ? { name: f.name, text: await f.text() } : null);
      };
      input.click();
    });
  },
  /** Több fájl (akár ZIP) kiválasztása: [{ name, bytes: Uint8Array }] */
  openFiles(filters) {
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.multiple = true;
      input.accept = (filters || []).map((f) => f.extensions.map((e) => '.' + e).join(',')).join(',');
      input.onchange = async () => {
        const out = [];
        for (const f of input.files) out.push({ name: f.name, bytes: new Uint8Array(await f.arrayBuffer()) });
        resolve(out.length ? out : null);
      };
      input.click();
    });
  },
  async openExternal(url) {
    window.open(url, '_blank', 'noopener');
  },
  async setFullscreen(on) {
    try {
      if (on) await document.documentElement.requestFullscreen();
      else if (document.fullscreenElement) await document.exitFullscreen();
    } catch {}
  },
  onFullscreenChanged(cb) {
    document.addEventListener('fullscreenchange', () => cb(!!document.fullscreenElement));
  },
  async setMini() {},
  async setPlaying() {},
  /** Rendszerértesítés (a böngésző saját értesítése). */
  notify({ title, body, icon, channelId }) {
    try {
      if (!window.Notification || Notification.permission !== 'granted') return;
      const n = new Notification(title, { body, icon: icon || undefined });
      n.onclick = () => {
        window.focus();
        window.__adasOpenChannel?.(channelId);
      };
    } catch {}
  },
  notifyPermission() {
    try {
      if (window.Notification && Notification.permission === 'default') Notification.requestPermission()?.catch?.(() => {});
    } catch {}
  },
  async appInfo() {
    return { version: '1.25.0', dataDir: _t('böngésző tárhely'), platform: 'web' };
  },
  exit() {},
};

// ---------------------------------------------------------------------------
// LG webOS TV
// ---------------------------------------------------------------------------
const bridges = new Set(); // a hívás végéig hivatkozni kell rá, különben a szemétgyűjtő eldobja
function luna(uri, params = {}) {
  return new Promise((resolve, reject) => {
    if (typeof window.PalmServiceBridge !== 'function') return reject(new Error(_t('Nem webOS környezet')));
    const bridge = new window.PalmServiceBridge();
    bridges.add(bridge);
    bridge.onservicecallback = (msg) => {
      bridges.delete(bridge);
      let r;
      try {
        r = JSON.parse(msg);
      } catch {
        return reject(new Error(_t('Érvénytelen válasz')));
      }
      if (r.returnValue === false) reject(new Error(r.errorText || _t('Szolgáltatáshiba')));
      else resolve(r);
    };
    bridge.call(uri, JSON.stringify(params));
  });
}

/** Letöltés a TV-n futó háttérszolgáltatással (nincs CORS, kibontja a gzip-et), darabokban. */
async function serviceDownload(url, headers = {}) {
  const r = await luna(WEBOS_SERVICE + 'fetch', { url, ua: headers.ua || '', referrer: headers.referrer || '' });
  let text = '';
  for (let offset = 0; offset < r.length; offset += r.chunkSize) {
    const c = await luna(WEBOS_SERVICE + 'chunk', { id: r.id, offset });
    text += c.data;
  }
  return text;
}

async function tvDownload(url) {
  try {
    return await directDownload(url); // a GitHub-on lévő adatok CORS-engedélyesek
  } catch {
    return serviceDownload(url);
  }
}

let tvProgress = () => {};
let tvCheckRun = 0;
const tvApi = {
  ...webApi,
  platform: 'webos',
  caps: { mini: false, fullscreen: false, files: false, external: false, health: true, preview: false, exit: true, multiview: 2 },
  fetchText: (url, opts) => cachedFetchText(url, opts, tvDownload),
  async request(opts) {
    try {
      return await webApi.request(opts);
    } catch {
      // CORS-hiba esetén a TV háttérszolgáltatásán keresztül
      const r = await luna(WEBOS_SERVICE + 'request', {
        method: opts.method || 'GET', url: opts.url, headers: opts.headers || {}, body: opts.body || '',
      });
      return { status: r.status, text: r.text };
    }
  },
  async checkStreams(list) {
    const run = ++tvCheckRun;
    const results = {};
    for (let i = 0; i < list.length && run === tvCheckRun; i += 24) {
      const part = list.slice(i, i + 24);
      let r;
      try {
        r = await luna(WEBOS_SERVICE + 'probe', { items: part });
        Object.assign(results, r.results);
      } catch {
        break; // a szolgáltatás nem érhető el
      }
      // csak az új eredmények (a felület összegyűjti őket)
      tvProgress({ done: Math.min(i + 24, list.length), total: list.length, partial: r.results || {} });
    }
    return { results, cancelled: run !== tvCheckRun };
  },
  async cancelCheck() {
    tvCheckRun++;
  },
  async probe(item) {
    const r = await luna(WEBOS_SERVICE + 'probe', { items: [item] });
    return !!r.results?.[item.url];
  },
  onCheckProgress(cb) {
    tvProgress = cb;
  },
  async openExternal() {},
  async setFullscreen() {},
  onFullscreenChanged() {},
  notify({ title, body, channelId }) {
    luna('luna://com.webos.notification/createToast', {
      message: `${title} – ${body}`.slice(0, 120),
      onclick: { appId: 'hu.adas.tv', params: { channel: channelId } },
      noaction: false,
    }).catch(() => {});
  },
  notifyPermission() {},
  async appInfo() {
    return { version: '1.25.0', dataDir: _t('TV tárhely'), platform: 'LG webOS' };
  },
  exit() {
    try {
      if (window.webOS?.platformBack) window.webOS.platformBack();
      else window.close();
    } catch {
      window.close();
    }
  },
};

// ---------------------------------------------------------------------------
// Android (telefon, tablet, Android TV)
// A natív keret (android/) a WebView minden kérését maga tölti le: CORS-fejlécet tesz rá, és az adások
// User-Agent / Referer fejlécét is beállítja – így a fetch és a hls.js is közvetlenül működik. A POST-
// kéréseket (OpenSubtitles), az ellenőrzést és a fájlmentést az AdasAndroid hídon keresztül kérjük.
// ---------------------------------------------------------------------------
let androidSeq = 0;
const androidWait = new Map();
window.__adasNative = (id, ok, payload) => {
  const p = androidWait.get(id);
  if (!p) return;
  androidWait.delete(id);
  ok ? p.resolve(payload) : p.reject(new Error(payload || _t('Hiba')));
};
function native(method, args = {}) {
  return new Promise((resolve, reject) => {
    const id = ++androidSeq;
    androidWait.set(id, { resolve, reject });
    try {
      window.AdasAndroid.call(id, method, JSON.stringify(args));
    } catch (err) {
      androidWait.delete(id);
      reject(err);
    }
  });
}

let androidProgress = () => {};
let androidCheckRun = 0;
let androidFs = () => {};
const androidApi = {
  ...webApi,
  platform: ANDROID_TV ? 'androidtv' : 'android',
  caps: {
    mini: false, fullscreen: !ANDROID_TV, files: true, external: !ANDROID_TV, health: true,
    preview: true, exit: true, multiview: 2, folders: false,
  },
  fetchText: (url, opts) => cachedFetchText(url, opts, directDownload),
  request: (opts) => native('request', { method: opts.method || 'GET', url: opts.url, headers: opts.headers || {}, body: opts.body || '' }),
  async setStreamHeaders(url, h) {
    try {
      window.AdasAndroid.setStreamHeaders(url, h?.ua || '', h?.referrer || '');
    } catch {}
  },
  async checkStreams(list) {
    const run = ++androidCheckRun;
    const results = {};
    for (let i = 0; i < list.length && run === androidCheckRun; i += 30) {
      let part;
      try {
        part = await native('probe', { items: list.slice(i, i + 30) });
        Object.assign(results, part);
      } catch {
        break;
      }
      androidProgress({ done: Math.min(i + 30, list.length), total: list.length, partial: part || {} });
    }
    return { results, cancelled: run !== androidCheckRun };
  },
  async cancelCheck() {
    androidCheckRun++;
  },
  onCheckProgress(cb) {
    androidProgress = cb;
  },
  saveFile: (name, text) => native('saveFile', { name, text }),
  // Háttérlejátszás (az első paraméter a megszűnt kép a képben módé – mindig false)
  setBackgroundPrefs(pip, audio) {
    try {
      window.AdasAndroid.setBackgroundPrefs(!!pip, !!audio);
    } catch {}
  },
  setNowPlaying(title) {
    try {
      window.AdasAndroid.setNowPlaying(String(title || ''));
    } catch {}
  },
  // a felület nyelve a keret értesítéseihez (a bezárt alkalmazás emlékeztetőjéhez is)
  setLang(l) {
    try {
      window.AdasAndroid.setLang?.(String(l || ''));
    } catch {}
  },
  // Helyi hálózat: beállítások átadása kóddal, távirányító (a keret LanServer-e)
  shareStart: (data, id) => native('shareStart', { data: JSON.stringify(data), id: id || '' }),
  shareStop: () => native('shareStop'),
  onShareUsed(cb) {
    window.__adasShareUsed = (from) => cb({ from });
  },
  lanIps: () => native('lanIps'),
  lanGet: (urls, timeout) => native('lanGet', { urls, timeout }),
  rcStart: (html, pin, key) => native('rcStart', { html, pin, key: key || '' }),
  rcStop: () => native('rcStop'),
  rcState(json) {
    try {
      window.AdasAndroid.rcState(json);
    } catch {}
  },
  onRemoteCmd(cb) {
    window.__adasRemote = (c, a) => cb({ c, a });
  },
  probe: (item) => native('probe', { items: [item] }).then((r) => !!r[item.url]),
  // Az értesítéseket a rendszer küldi (az alkalmazás bezárása után is): az ütemezést átadjuk a keretnek.
  scheduleReminders(list) {
    try {
      window.AdasAndroid.scheduleReminders(JSON.stringify(list));
    } catch {}
  },
  notify() {}, // előtérben az alkalmazáson belüli értesítés elég, háttérben a rendszer szól
  notifyPermission() {
    try {
      window.AdasAndroid.requestNotifyPermission();
    } catch {}
  },
  async openExternal(url) {
    if (/^https?:\/\//.test(url)) window.AdasAndroid.openExternal(url);
  },
  // Külső videólejátszó (VLC, MX Player, Kodi…) – a kiválasztott résszel
  async openInPlayer(items) {
    const x = items?.[0];
    if (!x || !window.AdasAndroid.openVideo) return _t('Ehhez frissítsd az alkalmazást.');
    window.AdasAndroid.openVideo(x.url, x.title || '');
    return '';
  },
  async setFullscreen(on) {
    window.AdasAndroid.setFullscreen(!!on);
    androidFs(!!on);
  },
  onFullscreenChanged(cb) {
    androidFs = cb;
  },
  async setPlaying(on) {
    window.AdasAndroid.setPlaying(!!on);
  },
  async appInfo() {
    return { version: window.AdasAndroid.version(), dataDir: _t('az alkalmazás saját tárhelye'), platform: ANDROID_TV ? 'Android TV' : 'Android' };
  },
  exit() {
    window.AdasAndroid.exit();
  },
};

export const api = window.api || (IS_ANDROID ? androidApi : IS_WEBOS ? tvApi : webApi);
