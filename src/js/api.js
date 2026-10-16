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
import { cmpVersion, isPrerelease } from './semver.js';
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
  caps: { mini: false, fullscreen: true, files: true, external: true, health: false, preview: false, exit: false },
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
  // (strict: az olvasási hiba nem „üres”, hanem hiba – B30)
  docGet: (k, opts) => idb('readonly', (s) => s.get(k), 'docs').catch((err) => {
    if (opts?.strict) throw err;
    return undefined;
  }),
  docSet: (k, v) => idb('readwrite', (s) => (v == null ? s.delete(k) : s.put(v, k)), 'docs'),
  async storeLoad() {
    try {
      return JSON.parse(localStorage.getItem('adas-store'));
    } catch {
      return null;
    }
  },
  // (a hiba – pl. betelt tárhely – a hívóhoz jut: a felület jelzi, hogy a mentés nem sikerült)
  async storeSave(data) {
    localStorage.setItem('adas-store', JSON.stringify(data));
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
    return { version: '1.28.0', dataDir: _t('böngésző tárhely'), platform: 'web' };
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
  caps: { mini: false, fullscreen: false, files: false, external: false, health: true, preview: false, exit: true },
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
    return { version: '1.28.0', dataDir: _t('TV tárhely'), platform: 'LG webOS' };
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
// (F03) a kiadás APK-ja: a buildcélnak megfelelő (…-android-tv.apk / …-android-mobile.apk), ennek híján az
// egyetlen (univerzális) APK – a frissítő ne cserélje a tévés kiadást mobilosra vagy fordítva
function pickApk(assets) {
  const apks = assets.filter((x) => /\.apk$/i.test(x.name || ''));
  const tv = (x) => /(?:-android-?tv|-tv)\.apk$/i.test(x.name);
  const mobile = (x) => /(?:-android-?mobile|-mobile)\.apk$/i.test(x.name);
  if (ANDROID_TV) return apks.find(tv) || apks.find((x) => !mobile(x)) || null;
  return apks.find(mobile) || apks.find((x) => !tv(x)) || null;
}
let androidOffered = null;

const androidApi = {
  ...webApi,
  platform: ANDROID_TV ? 'androidtv' : 'android',
  caps: {
    // (B38) mini lejátszó: a rendszer kép a képben módja, ha az eszköz támogatja (egyébként a gomb sem látszik)
    update: true,
    cast: !ANDROID_TV, // (F04) telefonos / tabletes küldőfunkció (Chromecast, DLNA)
    mini: (() => {
      try {
        return !!window.AdasAndroid?.pipAvailable?.();
      } catch {
        return false;
      }
    })(),
    fullscreen: !ANDROID_TV, files: true, external: !ANDROID_TV, health: true,
    preview: true, exit: true, folders: true, // (F02) helyi / USB-mappa a rendszer mappaválasztójával
  },
  /** Mini lejátszó (kép a képben). → sikerült-e elindítani */
  enterPip() {
    try {
      return !!window.AdasAndroid.enterPip();
    } catch {
      return false;
    }
  },
  setVideoActive(on) {
    try {
      window.AdasAndroid.setVideoActive?.(!!on);
    } catch {}
  },
  // (F03) beépített frissítés: GitHub-kiadás vagy JSON-forrás → APK (SHA256SUMS.txt) → ellenőrzés → rendszertelepítő
  async updateCheck(source) {
    androidOffered = null;
    source = String(source || '').trim();
    if (!source) throw new Error(_t('Nincs beállítva frissítési forrás.'));
    const current = window.AdasAndroid.version();
    const getJson = async (url) => {
      if (!/^https:\/\//i.test(url)) throw new Error(_t('A frissítési forrás csak https:// cím lehet.'));
      const r = await native('request', { method: 'GET', url, headers: { Accept: 'application/json', 'User-Agent': 'Adas-Updater' }, body: '' });
      if (r.status === 404) throw new Error(_t('A megadott forrásban nincs kiadás.'));
      if (r.status < 200 || r.status >= 300) throw new Error(`HTTP ${r.status}`);
      return JSON.parse(r.text);
    };
    let latest = '';
    let notes = '';
    let page = '';
    let asset = null;
    const gh = source.match(/^(?:https?:\/\/github\.com\/)?([\w.-]+)\/([\w.-]+?)(?:\.git)?\/?$/i);
    if (gh && !/^https?:\/\/(?!github\.com)/i.test(source)) {
      const rel = await getJson(`https://api.github.com/repos/${gh[1]}/${gh[2]}/releases/latest`);
      latest = rel.tag_name;
      notes = rel.body || '';
      page = rel.html_url;
      const a = pickApk(rel.assets || []);
      if (a) {
        const sums = (rel.assets || []).find((x) => /^sha256sums(\.txt)?$/i.test(x.name));
        let sha256 = '';
        if (sums) {
          const r = await native('request', { method: 'GET', url: sums.browser_download_url, headers: { 'User-Agent': 'Adas-Updater' }, body: '' }).catch(() => null);
          for (const line of String(r?.text || '').split(/\r?\n/)) {
            const m = /^([0-9a-f]{64})\s+\*?(.+)$/i.exec(line.trim());
            if (m && m[2].trim() === a.name) sha256 = m[1].toLowerCase();
          }
        }
        asset = { name: a.name, url: a.browser_download_url, size: a.size || 0, sha256 };
      }
    } else if (/^https:\/\//i.test(source)) {
      const j = await getJson(source);
      latest = j.version;
      notes = j.notes || '';
      page = j.page || '';
      const key = ANDROID_TV ? 'androidtv' : 'android';
      const url = j.assets?.[key] || j.assets?.android || '';
      const sha = String((typeof j.sha256 === 'object' ? j.sha256?.[key] || j.sha256?.android : '') || '').toLowerCase();
      if (typeof url === 'string' && /^https:\/\//i.test(url)) asset = { name: decodeURIComponent(url.split('/').pop().split('?')[0]), url, size: 0, sha256: /^[0-9a-f]{64}$/.test(sha) ? sha : '' };
    } else throw new Error(_t('A forrás „tulajdonos/tároló” (GitHub) vagy egy https:// cím lehet.'));
    if (!latest) throw new Error(_t('A forrás nem adott meg verziószámot.'));
    if (asset && !/^https:\/\//i.test(asset.url)) asset = null;
    androidOffered = asset;
    const newer = cmpVersion(latest, current) > 0 && (!isPrerelease(latest) || isPrerelease(current));
    return { current, latest: String(latest).replace(/^v/i, ''), newer, notes, page, asset, portable: false, android: true };
  },
  async updateDownload(req) {
    // (csak a legutóbb felkínált fájl – a felülettől kapott tetszőleges cím nem)
    const a = androidOffered && req?.url === androidOffered.url ? androidOffered : null;
    if (!a) throw new Error(_t('Előbb keress frissítést.'));
    const r = await native('updateDownload', { url: a.url, sha256: a.sha256, name: a.name });
    return r.file;
  },
  updateInstall: (file) => native('updateInstall', { file }),
  // (F04) kivetítés – a cast.js ugyanazt a felületet kapja, mint az asztali változatban
  castDiscover: () => native('castDiscover', { ms: 3500 }),
  castPlay: (opts) => native('castPlay', opts),
  castControl: (action, value) => native('castControl', { action, value: Number(value) || 0 }),
  castForget: (id) => native('castForget', { id }),
  onCastStatus(cb) {
    window.__adasCastStatus = (s) => cb(s);
  },
  // (F02) helyi / USB-mappák (Storage Access Framework): a kiválasztott mappa content:// címe tartós engedéllyel
  async pickFolder() {
    const r = await native('pickFolder');
    return r?.uri || null;
  },
  scanFolder: (uri) => native('scanFolder', { uri }),
  readTextFile: (uri) => native('readDoc', { uri }),
  sidecarSubs: (uri) => native('sidecarSubs', { uri }),
  sidecarImage: (uri) => native('sidecarImage', { uri }),
  onUpdateProgress(cb) {
    window.__adasUpdateProgress = (p) => cb(p);
  },
  onUpdateStatus(cb) {
    window.__adasUpdateStatus = (s) => cb(s);
  },
  fetchText: (url, opts) => cachedFetchText(url, opts, directDownload),
  request: (opts) => native('request', { method: opts.method || 'GET', url: opts.url, headers: opts.headers || {}, body: opts.body || '' }),
  // tartós képtár (Covers.java): a képek kérése magától azon megy át; itt a mérete és az ürítése
  coverStats: () => native('coverStats'),
  coverClear: () => native('coverClear'),
  // rádió: a most szóló szám címe (ICY-metaadat)
  icyTitle: (url, country) => native('icyTitle', { url, country: country || '' }),
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
  // (B37) szünetel-e a lejátszás – a háttér-értesítés és a rendszer médiavezérlői ezt mutatják
  setMediaState(paused) {
    try {
      window.AdasAndroid.setMediaState?.(!!paused);
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

/**
 * A borítókép címe a tartós borítótárból (asztali változat: adasimg://, a főfolyamat lemezre menti).
 * Androidon a képtár a kéréseket magától kezeli; a többi változatban a böngésző gyorsítótára marad.
 */
export const coverSrc = (url) => (api.coverUrl ? api.coverUrl(url) : url);
