'use strict';
const { _t, setLang, getLang } = require('./i18n-main');
// Adás – Electron főfolyamat: ablak, gyorsítótárazott letöltés, adásfejlécek,
// elérhetőség-ellenőrzés, fájlpárbeszédek, mini lejátszó mód.

const { app, BrowserWindow, ipcMain, dialog, shell, session, net, protocol, powerSaveBlocker, Menu, Notification, Tray, nativeImage } = require('electron');
const covers = require('./covers');
const icy = require('./icy');
const path = require('path');
const fs = require('fs');
const zlib = require('zlib');
const crypto = require('crypto');

const CHROME_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36';

let win = null;
let normalBounds = null;
let sleepBlockerId = null;

const dataDir = () => app.getPath('userData');
const cacheDir = () => path.join(dataDir(), 'cache');
const storeFile = () => path.join(dataDir(), 'store.json');

// Külön adatmappa (pl. hordozható használathoz vagy teszteléshez): ADAS_DATA_DIR=/út/vonal
if (process.env.ADAS_DATA_DIR) app.setPath('userData', path.resolve(process.env.ADAS_DATA_DIR));

// Újrakezdés (Beállítások → Profilok és mentés): az előző futás jelölőfájlt hagyott – az adatmappa teljes tartalma
// törlődik, még mielőtt a Chromium megnyitná (beállítások, profilok, listák, gyorsítótár, borítók, saját témák,
// a lap tárhelye). Az előző folyamat épp kilép: a még lezáratlan fájlokat néhányszor újrapróbálja.
const RESET_MARK = '.adas-reset';
const RESET_TRIES = 3; // ennyi sikertelen kör után az Adás figyelmeztetéssel elindul (ne zárja ki végleg a felhasználót)
let resetFailed = null; // { rest, tries } – a törlés nem fejeződött be: ablak helyett üzenet (app.whenReady)
/** Újraindítás az indítási kapcsolókkal (pl. Linuxon --no-sandbox), a rejtett indítás nélkül; hordozható Windows-változatnál
 * és AppImage-nél az eredeti fájl (nem az ideiglenes kibontás). */
function relaunchSelf() {
  const execPath = process.env.PORTABLE_EXECUTABLE_FILE || process.env.APPIMAGE;
  const args = process.argv.slice(1).filter((a) => a !== '--hidden');
  app.relaunch(execPath ? { execPath, args } : { args });
}
// A jelölő csak akkor törlődik, ha minden más eltűnt – egy makacs fájl esetén a következő indítás újra próbálja.
try {
  const dir = app.getPath('userData');
  if (fs.existsSync(path.join(dir, RESET_MARK))) {
    const KEEP = /^(lockfile|Singleton)/; // (az épp induló példány zárolása)
    const left = () => fs.readdirSync(dir).filter((e) => e !== RESET_MARK && !KEEP.test(e));
    for (let round = 0; round < 4 && left().length; round++) {
      if (round) Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 500); // (a kilépő példány még zárhat fájlt)
      for (const e of left()) {
        try {
          fs.rmSync(path.join(dir, e), { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
        } catch {}
      }
    }
    const rest = left();
    if (!rest.length) fs.rmSync(path.join(dir, RESET_MARK), { force: true });
    else {
      // a jelölő számolja a sikertelen köröket (tartalma: „időbélyeg kör”)
      const mark = path.join(dir, RESET_MARK);
      const tries = (Number(String(fs.readFileSync(mark, 'utf8')).split(' ')[1]) || 0) + 1;
      console.warn(`Újrakezdés (${tries}. kör): nem törölhető:`, rest.join(', '));
      if (tries >= RESET_TRIES) fs.rmSync(mark, { force: true });
      else fs.writeFileSync(mark, `${Date.now()} ${tries}`);
      resetFailed = { rest, tries };
    }
  }
} catch (err) {
  console.warn('Újrakezdés:', err);
}

if (!app.requestSingleInstanceLock()) {
  app.quit();
}

app.on('second-instance', () => {
  // újraindításkor (pl. a tálcán futó példány) az ablak előjön
  if (win) {
    if (win.isMinimized()) win.restore();
    win.show();
    win.focus();
  }
});

// ---------------------------------------------------------------------------
// Adásonkénti HTTP-fejlécek (User-Agent, Referer) – a lejátszólista
// #EXTVLCOPT / http-referrer mezői alapján, gazdagépenként.
// ---------------------------------------------------------------------------
const hostHeaders = new Map();

function hostOf(url) {
  try {
    return new URL(url).host;
  } catch {
    return '';
  }
}

function installHeaderHooks() {
  const ses = session.defaultSession;
  ses.webRequest.onBeforeSendHeaders((details, cb) => {
    const h = details.requestHeaders;
    const custom = hostHeaders.get(hostOf(details.url));
    if (custom) {
      if (custom.ua) h['User-Agent'] = custom.ua;
      if (custom.referrer) {
        h['Referer'] = custom.referrer;
        try {
          h['Origin'] = new URL(custom.referrer).origin;
        } catch {
          delete h['Origin'];
        }
      }
    }
    // A file:// oldalról érkező kérések „null” Origin fejlécét sok szerver elutasítja.
    if (h['Origin'] === 'null' || h['Origin'] === 'file://') delete h['Origin'];
    cb({ requestHeaders: h });
  });
}

// ---------------------------------------------------------------------------
// Gyorsítótárazott letöltés
// ---------------------------------------------------------------------------
function cachePath(url) {
  return path.join(cacheDir(), crypto.createHash('sha1').update(url).digest('hex') + '.dat');
}

// Kicsomagolás a háttérben (a libuv szálkészletén): a több tíz MB-os műsorújságnál a szinkron
// változat másodpercekre megállította a főfolyamatot – és vele az ablakot is.
const gunzipAsync = require('util').promisify(zlib.gunzip);
// Letöltött dokumentum (lista, műsorújság) felső mérete – kicsomagolva is: egy kicsi, de erősen
// tömörített válasz se foglalhasson le sokszoros memóriát. (A legnagyobb műsorújságok is jóval alatta.)
const MAX_DOC = 512 * 1024 * 1024;
/** gzip-tömörített bájtok kicsomagolása (ha az); különben változatlanul adja vissza. */
async function maybeGunzip(buf) {
  if (buf.length > 2 && buf[0] === 0x1f && buf[1] === 0x8b) {
    try {
      return await gunzipAsync(buf, { maxOutputLength: MAX_DOC });
    } catch (err) {
      if (err.code === 'ERR_BUFFER_TOO_LARGE' || /larger than/i.test(err.message)) throw new Error(_t('A kicsomagolt fájl túl nagy'));
      throw err;
    }
  }
  return buf;
}

/** fetch-válasz törzse bájtokként, legfeljebb `max` bájtig (a kapcsolat maga is kicsomagolhat). */
async function readLimited(res, max = MAX_DOC) {
  if (!res.body) return Buffer.alloc(0);
  const reader = res.body.getReader();
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
    parts.push(Buffer.from(value.buffer, value.byteOffset, value.length));
  }
  return Buffer.concat(parts, size);
}

/**
 * Letöltés a főfolyamatból. onlyHttp: az átirányítások végén is csak http(s) cím fogadható el (a
 * műsorújság-források gyakran átirányítanak, ezért azt nem tiltjuk – de helyi erőforrásra nem vezethet).
 */
async function download(url, { ua, referrer, timeoutMs = 90000, onlyHttp = false } = {}) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const headers = { 'User-Agent': ua || CHROME_UA };
    if (referrer) headers.Referer = referrer;
    const res = await net.fetch(url, { signal: ctrl.signal, headers, bypassCustomProtocolHandlers: true });
    if (onlyHttp && !/^https?:\/\//i.test(res.url || url)) throw new Error('Nem engedélyezett átirányítás');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await readLimited(res);
  } finally {
    clearTimeout(t);
  }
}

/**
 * Bájtok → szöveg: BOM szerint UTF-8 / UTF-16; BOM nélkül UTF-8, ha érvényes – különben Windows-1250
 * (a magyar Windows ANSI kódolása, pl. Jegyzettömbbel mentett .m3u), így az ékezetek helyesek.
 */
function decodeText(buf) {
  if (buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf) return buf.subarray(3).toString('utf8');
  if (buf[0] === 0xff && buf[1] === 0xfe) return new TextDecoder('utf-16le').decode(buf.subarray(2));
  if (buf[0] === 0xfe && buf[1] === 0xff) return new TextDecoder('utf-16be').decode(buf.subarray(2));
  // Érvényes UTF-8? – gyors natív ellenőrzés (a hibát dobó TextDecoder nagy fájlon sokkal lassabb)
  const { isUtf8 } = require('buffer');
  let utf8 = false;
  if (isUtf8) utf8 = isUtf8(buf);
  else
    try {
      return new TextDecoder('utf-8', { fatal: true }).decode(buf);
    } catch {}
  if (utf8) return buf.toString('utf8');
  try {
    return new TextDecoder('windows-1250').decode(buf);
  } catch {
    return buf.toString('latin1');
  }
}

/**
 * Gyorsítótár-fájl írása atomikusan: egyedi átmeneti fájlba írunk, majd átnevezzük – így egy közben
 * futó olvasás soha nem lát félig megírt (hibás) fájlt. A hibát elnyeljük: a gyorsítótár nem kötelező.
 */
function writeCacheAtomically(file, data, encoding) {
  // a fájl saját sorában (queueFileOp): a párhuzamos írások sorban futnak, és a következő olvasás megvárja
  return queueFileOp(file, async () => {
    const tmp = `${file}.${process.pid}.${crypto.randomBytes(6).toString('hex')}.tmp`;
    try {
      await fs.promises.writeFile(tmp, data, encoding);
      await fs.promises.rename(tmp, file);
    } catch {
      await fs.promises.unlink(tmp).catch(() => {});
    }
  });
}
/** Megvárja a fájl függő írását (hogy egy azonnali olvasás ne a régi gyorsítótárat lássa). */
const pendingWrite = (file) => (writeChains.get(file) || Promise.resolve()).catch(() => {});

/**
 * Mint a fetchText, de UTF-8 bájtokként adja vissza (a nagy műsorújság-fájlokhoz): a bájtok az IPC-n
 * gyorsan átmennek, és a felület másolás nélkül adja tovább a háttérszálnak – a több tíz MB-os
 * szöveg átvétele a felületet közel egy másodpercre megakasztotta.
 */
async function fetchBytes(url, opts = {}) {
  const { maxAgeHours = 24, force = false } = opts;
  await fs.promises.mkdir(cacheDir(), { recursive: true });
  const file = cachePath(url);
  await pendingWrite(file);
  let stat = null;
  try {
    stat = await fs.promises.stat(file);
  } catch {}
  if (stat && !force && Date.now() - stat.mtimeMs < maxAgeHours * 3600e3) return { bytes: await fs.promises.readFile(file), cachedAt: stat.mtimeMs, fromCache: true };
  try {
    const buf = await maybeGunzip(await download(url, { onlyHttp: true }));
    const bytes = isUtf8Text(buf) ? stripBom(buf) : Buffer.from(decodeText(buf), 'utf8');
    writeCacheAtomically(file, bytes); // nem várjuk meg: a válasz ne késsen az írás miatt
    return { bytes, cachedAt: Date.now(), fromCache: false };
  } catch (err) {
    if (stat) return { bytes: await fs.promises.readFile(file), cachedAt: stat.mtimeMs, fromCache: true, stale: true };
    throw err;
  }
}
/** UTF-8 BOM levágása (ha van). */
const stripBom = (b) => (b[0] === 0xef && b[1] === 0xbb && b[2] === 0xbf ? b.subarray(3) : b);
/** Érvényes UTF-8 szöveg-e (UTF-16 BOM esetén nem). */
function isUtf8Text(buf) {
  if ((buf[0] === 0xff && buf[1] === 0xfe) || (buf[0] === 0xfe && buf[1] === 0xff)) return false;
  const { isUtf8 } = require('buffer');
  return isUtf8 ? isUtf8(stripBom(buf)) : false;
}

/** Szöveges letöltés lemezes gyorsítótárral; hálózati hibánál a régi példányt adja (stale). */
async function fetchText(url, opts = {}) {
  const { maxAgeHours = 24, force = false } = opts;
  // Minden fájlművelet aszinkron: a nagy (műsorújság) fájloknál a szinkron írás / olvasás az ablakot is megakasztotta.
  await fs.promises.mkdir(cacheDir(), { recursive: true });
  const file = cachePath(url);
  await pendingWrite(file);
  let stat = null;
  try {
    stat = await fs.promises.stat(file);
  } catch {}
  const fresh = stat && Date.now() - stat.mtimeMs < maxAgeHours * 3600e3;
  if (fresh && !force) {
    return { text: await fs.promises.readFile(file, 'utf8'), cachedAt: stat.mtimeMs, fromCache: true };
  }
  try {
    const buf = await maybeGunzip(await download(url));
    const text = decodeText(buf);
    writeCacheAtomically(file, text, 'utf8');
    return { text, cachedAt: Date.now(), fromCache: false };
  } catch (err) {
    // Hálózati hiba esetén a régi példány is jobb a semminél.
    if (stat) return { text: await fs.promises.readFile(file, 'utf8'), cachedAt: stat.mtimeMs, fromCache: true, stale: true };
    throw err;
  }
}

// ---------------------------------------------------------------------------
// Elérhetőség-ellenőrzés
// ---------------------------------------------------------------------------
let checkRun = 0;

/**
 * Kérés az átirányítások követésével: a végső címre szükség van a lejátszólista relatív
 * hivatkozásaihoz (pl. jmp2.uk → pluto.tv), és a net.fetch válasza ezt nem mindig adja meg.
 */
async function fetchFollow(url, opts, root = url) {
  // A Node saját fetch-e (undici), kézi átirányítás-követéssel: így megvan a végső cím, és minden lépés
  // ellenőrizhető – egy internetes forrás (átirányítással, listahivatkozással) ne küldhessen helyi címre
  // (pl. a távirányító kiszolgálójára). A `root` a felhasználó választotta forrás.
  return lan.fetchPolicy(url, opts, root);
}

/**
 * Él-e az adás – úgy, ahogy a lejátszó látja: HLS-nél a változatlistán és a médialistán át
 * egy valódi videószegmens elejét is letölti (földrajzi korlát, lejárt kulcs, üres adás kiszűrése).
 * trace: hibakereséshez a lépések naplója (probe-one { debug: true }).
 */
async function probeStream({ url, ua, referrer, trace, root }, depth = 0) {
  if (!depth) root = url; // a gyökér mindig a kért cím (a felülettől jövő érték nem számít)
  const T = (m) => trace && trace.push(m);
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 8000);
  const headers = { 'User-Agent': ua || CHROME_UA };
  if (referrer) headers.Referer = referrer;
  try {
    const { res, finalUrl } = await fetchFollow(url, { signal: ctrl.signal, headers }, root);
    T(depth + ' ' + res.status + ' ' + finalUrl.slice(0, 90) + ' ' + res.headers.get('content-type'));
    // 403 / 451: a szerver elutasította – jellemzően földrajzi korlátozás
    if (!res.ok) return res.status === 403 || res.status === 451 ? 'geo' : false;
    const type = (res.headers.get('content-type') || '').toLowerCase();
    if (/video|mp2t|octet-stream|dash|audio/.test(type) && !/mpegurl/.test(type)) {
      ctrl.abort();
      return true;
    }
    // A lejátszólista (legfeljebb 256 kB).
    const reader = res.body.getReader();
    let text = '';
    while (text.length < 262144) {
      const { done, value } = await reader.read();
      if (done) break;
      text += Buffer.from(value).toString('latin1');
    }
    ctrl.abort();
    if (text.includes('<MPD')) return true;
    if (!text.includes('#EXTM3U')) return false;
    const base = finalUrl;
    const lines = text.split(/\r?\n/).map((l) => l.trim());
    const abs = (u) => new URL(u, base).href;
    if (text.includes('#EXT-X-STREAM-INF')) {
      if (depth > 1) return false;
      const i = lines.findIndex((l) => l.startsWith('#EXT-X-STREAM-INF'));
      const variant = lines.slice(i + 1).find((l) => l && !l.startsWith('#'));
      return variant ? probeStream({ url: abs(variant), ua, referrer, trace, root }, depth + 1) : false;
    }
    // Médialista: a legutolsó (legfrissebb) szegmens eleje.
    const segs = lines.filter((l) => l && !l.startsWith('#'));
    if (!segs.length) return false; // üres lista: most nem sugároz
    T('seg ' + abs(segs[segs.length - 1]).slice(0, 90));
    return await probeSegment(abs(segs[segs.length - 1]), headers, T, root);
  } catch (e) {
    T('HIBA ' + e.message);
    // (a régi SHOUTcast „ICY 200 OK” fejléce a HTTP-elemzőnek érvénytelen – a szerver viszont válaszolt és sugároz)
    if (/HPE_INVALID_CONSTANT|Expected HTTP/i.test(`${e.code || ''} ${e.message || ''} ${e.cause?.code || ''} ${e.cause?.message || ''}`)) return true;
    return false;
  } finally {
    clearTimeout(t);
  }
}

async function probeSegment(url, headers, T = () => {}, root = url) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 8000);
  try {
    const { res } = await fetchFollow(url, { signal: ctrl.signal, headers: { ...headers, Range: 'bytes=0-4095' } }, root);
    T('seg status ' + res.status);
    if (res.status === 403 || res.status === 451) return 'geo';
    if (res.status !== 200 && res.status !== 206) return false;
    // A tartalom számít, nem a típusa: egyes adók .htm / text/html álcával küldik a videót.
    // Hibás csak az, ami HTML / XML hibaoldal (vagy üres).
    const { value } = await res.body.getReader().read();
    if (!value || !value.length) return false;
    const head = Buffer.from(value.slice(0, 64)).toString('latin1').trimStart();
    return !head.startsWith('<');
  } catch (e) {
    T('seg HIBA ' + e.message);
    return false;
  } finally {
    ctrl.abort();
    clearTimeout(t);
  }
}

async function checkStreams(event, list) {
  const run = ++checkRun;
  const results = {};
  let fresh = {}; // a legutóbbi jelentés óta elkészült eredmények (csak ezek mennek ki – nem az összes újra)
  let index = 0;
  let done = 0;
  const workers = Array.from({ length: 16 }, async () => {
    while (index < list.length && run === checkRun) {
      const item = list[index++];
      results[item.url] = fresh[item.url] = await probeStream(item);
      done++;
      if (done % 10 === 0 || done === list.length) {
        if (!event.sender.isDestroyed()) {
          event.sender.send('check-progress', { done, total: list.length, partial: fresh });
        }
        fresh = {};
      }
    }
  });
  await Promise.all(workers);
  return { results, cancelled: run !== checkRun };
}

// ---------------------------------------------------------------------------
// Ablak
// ---------------------------------------------------------------------------
/**
 * Önteszt (npm test – tools/run-tests.mjs): az ablak betöltése után a felület tesztjeit futtatja, az eredményt a
 * szabványos kimenetre írja, majd kilép. Csak a csomag saját test/ mappájából tölt be.
 */
function runSelfTest(w, file) {
  const abs = path.resolve(__dirname, file);
  if (!abs.startsWith(path.join(__dirname, 'test') + path.sep)) return;
  const url = require('url').pathToFileURL(abs).href;
  // (a takart / háttérbe került tesztablakban a böngészőmotor visszafogná az időzítőket – a tesztek sleep()-jei
  // percekig tartanának, és a futás véletlenszerűen időtúllépéssel állna le)
  w.webContents.setBackgroundThrottling(false);
  const ready = `!!document.querySelector('#view')?.childElementCount && !document.body.classList.contains('onboarding')`;
  // (a tesztkeret az épp induló teszt nevét a konzolra írja: elakadáskor az eredmény megmondja, hol tartott)
  let current = '';
  w.webContents.on('console-message', (...a) => {
    const msg = String(a[0]?.message ?? a[2] ?? '');
    if (msg.startsWith('@@T ')) current = msg.slice(4);
  });
  w.webContents.once('did-finish-load', async () => {
    let out = { error: 'az alkalmazás nem indult el' };
    for (let i = 0; i < 240; i++) {
      if (await w.webContents.executeJavaScript(ready).catch(() => false)) {
        const run = w.webContents.executeJavaScript(`import(${JSON.stringify(url)}).then((m) => m.run()).then((results) => ({ results }), (e) => ({ error: String(e && e.stack || e) }))`).catch((e) => ({ error: String(e) }));
        const limit = new Promise((r) => setTimeout(() => r({ error: `időtúllépés (4 perc) – elakadt: ${current || '?'}` }), 240e3));
        out = await Promise.race([run, limit]);
        break;
      }
      await new Promise((r) => setTimeout(r, 500));
    }
    process.stdout.write(`\n@@ADAS-SELFTEST@@${JSON.stringify(out)}\n`, () => app.exit(out.results ? 0 : 1));
  });
}

function createWindow() {
  win = new BrowserWindow({
    width: 1440,
    height: 880,
    show: !startHidden, // a rendszerrel induló, rejtett indításnál az ablak csak a tálcáról nyílik meg
    minWidth: 360,
    minHeight: 220,
    backgroundColor: '#141414',
    title: 'Adás',
    icon: path.join(__dirname, 'assets', 'icon.png'),
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      // Az adások többsége nem küld CORS-fejlécet, és sok csak http-n érhető el.
      // A felület csak helyi fájlokat tölt be, minden külső szöveget escape-elünk.
      webSecurity: false,
      autoplayPolicy: 'no-user-gesture-required',
      // a helyesírás-ellenőrző szótárai feleslegesen foglalnának memóriát (a keresőmezőkhöz nem kell)
      spellcheck: false,
    },
  });
  win.loadFile(path.join(__dirname, 'src', 'index.html'));
  if (process.env.ADAS_SELFTEST) runSelfTest(win, process.env.ADAS_SELFTEST);
  // A telepítő (MSI / Setup) által indított első ablak a Windows előtérzára miatt gyakran nem kapja meg a
  // billentyűzetfókuszt: a mező fókuszáltnak látszik, de a leütések máshová mennek (pl. az első profil névmezője
  // nem írható). Az ablakot ténylegesen előtérbe hozzuk, és a rendszerfókusz visszatérésekor a lap is megkapja.
  win.once('ready-to-show', () => {
    if (startHidden || !win) return;
    win.show();
    if (process.platform === 'win32') {
      win.setAlwaysOnTop(true);
      win.focus();
      win.setAlwaysOnTop(false);
    } else win.focus();
    win.webContents.focus();
  });
  win.on('focus', () => win?.webContents.focus());

  // Külső hivatkozások a rendszer böngészőjében nyíljanak meg.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
  win.webContents.on('will-navigate', (e, url) => {
    if (!url.startsWith('file://')) e.preventDefault();
  });
  win.on('enter-full-screen', () => win.webContents.send('fullscreen-changed', true));
  win.on('leave-full-screen', () => win.webContents.send('fullscreen-changed', false));
  // Háttérben futás: bezáráskor csak elrejtjük (az emlékeztetők így is megszólalnak), a tálcáról nyitható.
  win.on('close', (e) => {
    if (bg.enabled && !quitting) {
      e.preventDefault();
      win.hide();
      win.webContents.send('went-background');
      ensureTray();
    }
  });
  win.on('closed', () => {
    win = null;
  });
  if (startHidden) ensureTray();
}

// ---------------------------------------------------------------------------
// Háttérben futás (tálca), indítás a rendszerrel, értesítések
// ---------------------------------------------------------------------------
const bg = { enabled: false };
let tray = null;
let quitting = false;
const startHidden =
  process.argv.includes('--hidden') ||
  (process.platform === 'darwin' && (() => {
    try {
      const s = app.getLoginItemSettings();
      return s.wasOpenedAsHidden || s.wasOpenedAtLogin;
    } catch {
      return false;
    }
  })());
app.on('before-quit', () => (quitting = true));

function showWindow() {
  if (!win) return createWindow();
  if (win.isMinimized()) win.restore();
  win.show();
  win.focus();
}

/** A tálca menüje és súgószövege (nyelvváltáskor újra). */
function trayTexts() {
  if (!tray) return;
  tray.setToolTip(_t('Adás – a háttérben fut (emlékeztetők)'));
  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: _t('Adás megnyitása'), click: showWindow },
      { type: 'separator' },
      { label: _t('Kilépés'), click: () => ((quitting = true), app.quit()) },
    ])
  );
}

function ensureTray() {
  if (tray) return;
  // A tálca ikonmérete: Windows 16, macOS menüsor 18, Linux (AppIndicator) 22–24 képpont.
  const size = process.platform === 'linux' ? 24 : process.platform === 'darwin' ? 18 : 16;
  tray = new Tray(nativeImage.createFromPath(path.join(__dirname, 'assets', 'icon.png')).resize({ width: size, height: size }));
  trayTexts();
  tray.on('click', showWindow);
}

// A felület nyelve (a felület küldi; induláskor a mentett beállításból)
try {
  setLang(JSON.parse(fs.readFileSync(storeFile(), 'utf8'))?.settings?.lang || 'hu');
} catch {}
ipcMain.on('set-lang', (_e, l) => {
  setLang(l);
  trayTexts();
});

ipcMain.handle('set-background', (_e, { enabled, startWithSystem }) => {
  bg.enabled = !!enabled;
  if (bg.enabled) ensureTray();
  else {
    if (tray) {
      tray.destroy();
      tray = null;
    }
    // rejtve indult, de a háttérben futás már nincs bekapcsolva: az ablak ne maradjon elérhetetlen
    if (win && !win.isVisible()) showWindow();
  }
  setStartWithSystem(!!startWithSystem && bg.enabled);
});

/** Indítás a rendszerrel, rejtve (a tálcán). Windows / macOS: beépített; Linux: ~/.config/autostart */
function setStartWithSystem(on) {
  try {
    if (process.platform === 'linux') {
      const dir = path.join(process.env.XDG_CONFIG_HOME || path.join(require('os').homedir(), '.config'), 'autostart');
      const file = path.join(dir, 'hu.adas.tv.desktop');
      if (!on) return fs.rmSync(file, { force: true });
      // AppImage-nél a .AppImage fájl útvonala kell (a futó példány egy ideiglenes mappából fut).
      const exe = process.env.APPIMAGE || process.execPath;
      const q = (s) => `"${String(s).replace(/(["\\$`])/g, '\\$1')}"`;
      const extra = process.argv.includes('--no-sandbox') ? ' --no-sandbox' : '';
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(
        file,
        ['[Desktop Entry]', 'Type=Application', 'Name=Adás', 'Comment=Élő TV – emlékeztetők a háttérben', `Exec=${q(exe)}${extra} --hidden`, 'X-GNOME-Autostart-enabled=true', 'NoDisplay=false', ''].join('\n')
      );
      return;
    }
    if (process.platform === 'darwin') {
      // macOS-en nincs parancssori kapcsoló: az „elrejtve nyitás” jelzi a rejtett indítást.
      app.setLoginItemSettings({ openAtLogin: on, openAsHidden: true });
      return;
    }
    // A hordozható változat egy ideiglenes mappából fut: a rendszerindításhoz az eredeti .exe kell.
    const exe = process.env.PORTABLE_EXECUTABLE_FILE || process.execPath;
    app.setLoginItemSettings({ openAtLogin: on, path: exe, args: ['--hidden'] });
  } catch (err) {
    console.warn('Indítás a rendszerrel:', err);
  }
}

ipcMain.handle('notify', (_e, { title, body, channelId }) => {
  if (!Notification.isSupported()) return false;
  const n = new Notification({ title, body, icon: path.join(__dirname, 'assets', 'icon.png'), silent: false });
  n.on('click', () => {
    showWindow();
    win?.webContents.send('open-channel', channelId);
  });
  n.show();
  return true;
});

// ---------------------------------------------------------------------------
// IPC
// ---------------------------------------------------------------------------
ipcMain.handle('fetch-text', (_e, url, opts) => fetchText(url, opts));
// rádió: a most szóló szám címe (ICY-metaadat)
ipcMain.handle('icy-title', (_e, url, country) => icy.icyTitle(url, country));
// csak http(s): a felület által adott cím ne olvashasson helyi fájlt (file:) a net.fetch-csel
ipcMain.handle('fetch-bytes', (_e, url, opts) => {
  let scheme = '';
  try {
    scheme = new URL(String(url)).protocol;
  } catch {}
  if (scheme !== 'http:' && scheme !== 'https:') throw new Error(_t('Érvénytelen cím'));
  return fetchBytes(url, opts);
});

ipcMain.handle('set-stream-headers', (_e, url, headers) => {
  const host = hostOf(url);
  if (!host) return;
  if (headers && (headers.ua || headers.referrer)) hostHeaders.set(host, headers);
  else hostHeaders.delete(host);
});

ipcMain.handle('check-streams', (e, list) => checkStreams(e, list));
// Egyetlen adás gyors ellenőrzése (a lejátszó a tartalék források közül ezzel választ) – a
// háttérellenőrzés futását nem zavarja.
ipcMain.handle('probe-one', async (_e, item) => {
  if (!item.debug) return probeStream(item);
  const trace = [];
  const ok = await probeStream({ ...item, trace });
  return { ok, trace };
});
// Kapcsolat előkészítése (DNS, TLS) a kártyán állva, hogy a lejátszás gyorsabban induljon.
ipcMain.handle('preconnect', (_e, url) => {
  try {
    if (/^https?:\/\//.test(url)) session.defaultSession.preconnect({ url, numSockets: 2 });
  } catch {}
});
ipcMain.handle('cancel-check', () => {
  checkRun++;
});

ipcMain.handle('store-load', async () => {
  try {
    return JSON.parse(await fs.promises.readFile(storeFile(), 'utf8'));
  } catch {
    return null;
  }
});

// Fájlba írás aszinkron, fájlonként sorban (a nagy JSON-ok szinkron írása az ablakot is megakasztotta).
// Átmeneti fájlba írunk, majd átnevezzük – így megszakadt írás után sem sérül a régi.
const writeChains = new Map();
/** Egy fájlművelet sorba állítása: ugyanarra a fájlra az előző (írás / törlés) befejezése után fut. */
function queueFileOp(file, op) {
  const prev = writeChains.get(file) || Promise.resolve();
  const next = prev.catch(() => {}).then(op);
  writeChains.set(file, next);
  next.finally(() => writeChains.get(file) === next && writeChains.delete(file)).catch(() => {});
  return next;
}
/** JSON-fájl írása sorban, átmeneti fájlon és átnevezésen át (megszakadt írás után sem sérül a régi). */
function writeJsonFile(file, value) {
  return writeTextFile(file, () => JSON.stringify(value));
}
/** Szöveg atomi írása (ideiglenes fájl + átnevezés), a fájl írási sorában. text: szöveg vagy azt adó függvény. */
function writeTextFile(file, text) {
  return queueFileOp(file, async () => {
    await fs.promises.mkdir(path.dirname(file), { recursive: true });
    const tmp = `${file}.${process.pid}.tmp`;
    try {
      await fs.promises.writeFile(tmp, typeof text === 'function' ? text() : text, 'utf8');
      await fs.promises.rename(tmp, file);
    } catch (err) {
      await fs.promises.rm(tmp, { force: true }).catch(() => {}); // (sikertelen írás után ne maradjon ideiglenes fájl)
      throw err;
    }
  });
}

ipcMain.handle('store-save', (_e, data) => writeJsonFile(storeFile(), data));

/** Egy kérés a Chromium hálózati útján, átirányítás követése nélkül → { status, body } vagy { status, location }. */
function netOnce(url, { method = 'GET', headers = {}, body, signal } = {}) {
  let onAbort = null;
  return new Promise((resolve, reject) => {
    const req = net.request({ url, method, redirect: 'manual' });
    for (const [k, v] of Object.entries(headers)) req.setHeader(k, v);
    onAbort = () => {
      req.abort();
      reject(new Error('megszakítva'));
    };
    signal?.addEventListener('abort', onAbort, { once: true });
    req.on('redirect', (status, _m, location) => {
      req.abort();
      resolve({ status, location });
    });
    req.on('response', (res) => {
      const parts = [];
      let size = 0;
      res.on('data', (c) => {
        size += c.length;
        if (size > 25e6) {
          req.abort();
          return reject(new Error(_t('A fájl túl nagy.')));
        }
        parts.push(c);
      });
      res.on('end', () => resolve({ status: res.statusCode, body: Buffer.concat(parts) }));
      res.on('error', reject);
    });
    req.on('error', reject);
    if (body != null && body !== '') req.write(body);
    req.end();
  }).finally(() => signal?.removeEventListener('abort', onAbort));
}

/** Hitelesítő fejléces kérés kézi átirányítás-követéssel, a lan.redirectStep szabályaival (Chromium-úton). */
async function fetchSecret(url, opts) {
  const first = new URL(url);
  let cur = url;
  let o = { ...opts, headers: { ...(opts.headers || {}) } };
  for (let i = 0; i <= 5; i++) {
    const r = await netOnce(cur, o);
    if (!r.location) return r;
    ({ url: cur, opts: o } = lan.redirectStep(first, cur, r.status, r.location, o, true));
  }
  throw new Error('Túl sok átirányítás');
}

// Általános HTTP-kérés (pl. OpenSubtitles, TMDB): a főfolyamatból nincs CORS, és a
// User-Agent fejléc is beállítható.
ipcMain.handle('http-request', async (_e, { method = 'GET', url, headers = {}, body, binary = false } = {}) => {
  if (!/^https?:\/\//.test(url || '')) throw new Error(_t('Érvénytelen cím'));
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 30000);
  try {
    const opts = { method, headers: { 'User-Agent': CHROME_UA, ...headers }, body, signal: ctrl.signal };
    // Hitelesítő fejléccel (pl. OpenSubtitles API-kulcs, token) kézi átirányítás-követés: más szerverre a titok
    // nem megy tovább (a fetch csak az Authorization fejlécet dobná el, az egyedi kulcsfejléceket nem). Ez is a
    // Chromium hálózati útján megy (net.request), így a rendszer proxybeállítása ugyanúgy érvényes.
    if (lan.hasSecretHeader(headers)) {
      const r = await fetchSecret(url, opts);
      if (binary) {
        if (r.body.length > 20e6) throw new Error(_t('A fájl túl nagy.'));
        return { status: r.status, bytes: r.body };
      }
      return { status: r.status, text: r.body.toString('utf8') };
    }
    const res = await net.fetch(url, opts);
    // (H18) a válasz darabonként, korláttal olvasva – a túl nagy válasz a határnál megszakad, nem olvasódik végig a
    // memóriába (a szöveges válasz is: API-válasz, felirat)
    const buf = await readLimited(res, 20e6).catch((err) => {
      throw /túl nagy|too large/i.test(err.message) ? new Error(_t('A fájl túl nagy.')) : err;
    });
    // bájtként (pl. ZIP-be csomagolt vagy nem UTF-8 kódolású felirat): a megjelenítő dekódolja
    if (binary) return { status: res.status, bytes: buf };
    return { status: res.status, text: buf.toString('utf8') };
  } finally {
    clearTimeout(t);
  }
});

// ---------------------------------------------------------------------------
// Saját médiatár (NAS / helyi mappa): lejátszólisták keresése, olvasása, feliratok a videó mellett
// ---------------------------------------------------------------------------
const LIST_EXT = /\.(m3u8?|txt)$/i;
const SUB_EXT = /\.(srt|vtt)$/i;

ipcMain.handle('pick-folder', async () => {
  const res = await dialog.showOpenDialog(win, { properties: ['openDirectory'] });
  return res.canceled || !res.filePaths.length ? null : res.filePaths[0];
});

/** A mappa (és almappái, legfeljebb 4 szint mélyen) .m3u / .m3u8 fájljai. */
ipcMain.handle('scan-folder', async (_e, dir) => {
  const out = [];
  const walk = async (d, depth) => {
    if (depth > 4 || out.length >= 1000) return;
    let items;
    try {
      items = await fs.promises.readdir(d, { withFileTypes: true });
    } catch (err) {
      if (depth === 0) throw new Error(_t('A mappa nem olvasható: {message}', { message: err.message }));
      return;
    }
    for (const it of items) {
      if (it.name.startsWith('.') || it.name.startsWith('@') || it.name === '#recycle') continue; // rejtett, NAS-rendszermappák
      const p = path.join(d, it.name);
      if (it.isDirectory()) await walk(p, depth + 1);
      else if (/\.m3u8?$/i.test(it.name)) {
        try {
          const st = await fs.promises.stat(p);
          out.push({ name: it.name, path: p, rel: path.relative(dir, p), size: st.size, mtime: st.mtimeMs });
        } catch {}
      }
    }
  };
  await walk(dir, 0);
  return out.sort((a, b) => a.rel.localeCompare(b.rel));
});

/**
 * Kis fájl beolvasása: a méretet és a tartalmat ugyanabból a megnyitott fájlból olvassuk (nincs
 * versenyhelyzet a kettő között). Ha nagyobb a korlátnál, vagy nem közönséges fájl → null.
 */
async function readSmallFile(p, max) {
  // Nem közönséges fájl (pl. névvel ellátott cső / FIFO) megnyitása blokkolna: a megnyitás nem blokkoló
  // (Unixon), és a típust a már megnyitott leíróból ellenőrizzük (külön előzetes vizsgálat nélkül – nincs rés).
  const fh = await fs.promises.open(p, fs.constants.O_RDONLY | (process.platform === 'win32' ? 0 : fs.constants.O_NONBLOCK || 0));
  try {
    const st = await fh.stat();
    if (!st.isFile() || st.size > max) return null;
    // legfeljebb méret+1 bájtot olvasunk: ha a fájl közben megnőtt (változik), kihagyjuk
    const buf = Buffer.alloc(st.size + 1);
    let n = 0;
    for (let r; n < buf.length && (r = await fh.read(buf, n, buf.length - n, n)).bytesRead > 0; ) n += r.bytesRead;
    return n > st.size ? null : buf.subarray(0, n);
  } finally {
    await fh.close();
  }
}

ipcMain.handle('read-text-file', async (_e, p) => {
  if (!LIST_EXT.test(p) && !SUB_EXT.test(p)) throw new Error(_t('Csak lejátszólista és felirat olvasható.'));
  const buf = await readSmallFile(p, 30 * 1024 * 1024);
  if (!buf) throw new Error(_t('A fájl túl nagy.'));
  return decodeText(buf);
});

/**
 * A videó mellett lévő borítókép (Kodi / Plex szokás): Film.jpg, Film-poster.jpg, poster.jpg,
 * folder.jpg, cover.jpg – sorozatnál a szülőmappáé is. → kicsinyített JPEG data: URL vagy ''.
 */
ipcMain.handle('sidecar-image', async (_e, videoPath) => {
  try {
    const dir = path.dirname(videoPath);
    const base = path.basename(videoPath).replace(/\.[^.]+$/, '').toLowerCase();
    const pickIn = async (d, names) => {
      const files = await fs.promises.readdir(d).catch(() => []);
      const imgs = files.filter((n) => /\.(jpe?g|png|webp)$/i.test(n));
      for (const want of names) {
        const f = imgs.find((n) => n.toLowerCase().replace(/\.[^.]+$/, '') === want);
        if (f) return path.join(d, f);
      }
      return null;
    };
    const file =
      (await pickIn(dir, [base, base + '-poster', base + '.poster', base + '-cover', 'poster', 'folder', 'cover', 'movie', 'show'])) ||
      (await pickIn(path.dirname(dir), ['poster', 'folder', 'cover', 'show']));
    if (!file) return '';
    const img = nativeImage.createFromPath(file);
    if (img.isEmpty()) return '';
    const { width } = img.getSize();
    return 'data:image/jpeg;base64,' + (width > 400 ? img.resize({ width: 342 }) : img).toJPEG(82).toString('base64');
  } catch {
    return '';
  }
});

/** A videó mellett lévő azonos nevű feliratfájlok (pl. Film.srt, Film.hu.srt). */
ipcMain.handle('sidecar-subs', async (_e, videoPath) => {
  try {
    const dir = path.dirname(videoPath);
    const base = path.basename(videoPath).replace(/\.[^.]+$/, '').toLowerCase();
    // (H16) csak a pontos alapnév (Film.srt) vagy az utána ponttal kezdődő jelölők (Film.hu.srt) – a Film 2.hu.srt egy
    // másik videóé; a pontos egyezés áll elöl, a többi névsorban
    const mine = (n) => {
      const low = n.toLowerCase();
      return SUB_EXT.test(n) && low.startsWith(base) && (low.length === base.length + 4 || low[base.length] === '.');
    };
    const exact = (n) => n.toLowerCase().replace(SUB_EXT, '') === base;
    const files = (await fs.promises.readdir(dir)).filter(mine).sort((x, y) => exact(y) - exact(x) || x.localeCompare(y)).slice(0, 8);
    const out = [];
    for (const n of files) {
      const buf = await readSmallFile(path.join(dir, n), 5 * 1024 * 1024);
      // (X03) a kézi beolvasással azonos dekódoló: BOM-os UTF-8 / UTF-16, BOM nélkül UTF-8, különben Windows-1250
      if (buf) out.push({ name: n, text: decodeText(buf) });
    }
    return out;
  } catch {
    return [];
  }
});

// Feldolgozott adatok (pl. a csatornakatalógus) gyors újratöltéshez.
const kvFile = (key) => path.join(cacheDir(), 'kv-' + crypto.createHash('sha1').update(key).digest('hex') + '.json');
ipcMain.handle('kv-get', async (_e, key) => {
  try {
    return JSON.parse(await fs.promises.readFile(kvFile(key), 'utf8'));
  } catch {
    return undefined;
  }
});
ipcMain.handle('kv-set', (_e, key, value) => writeJsonFile(kvFile(key), value));
// (gyors út) JSON-szövegként: a nagy pillanatképek (pl. a ~10 MB-os csatornakatalógus) objektumként az IPC-n át a
// felület szálán másodpercekig tartó strukturált klónozással és szemétgyűjtéssel érkeznének – szövegként csak egy
// másolás, a JSON.parse a felületen töredéke ennek. Olvasáskor a fájl ideje frissül (a takarítás ehhez igazodik).
ipcMain.handle('kv-get-text', async (_e, key) => {
  const f = kvFile(String(key));
  try {
    const text = await fs.promises.readFile(f, 'utf8');
    const now = new Date();
    fs.promises.utimes(f, now, now).catch(() => {});
    return text;
  } catch {
    return null;
  }
});
ipcMain.handle('kv-set-text', (_e, key, text) => (typeof text === 'string' ? writeTextFile(kvFile(String(key)), text) : undefined));

/**
 * A gyorsítótár takarítása (indulás után, a háttérben): a nagy pillanatképekből (katalógus, VOD) a legutóbb
 * használt 4 marad, ezek is legfeljebb 7 napig – egy lista vagy beállítás változásakor új kulcs keletkezik, a régi
 * eddig örökre megmaradt (több száz MB); a kis bejegyzések (borító, adatlap) 60, a letöltések 45 nap után törlődnek.
 */
async function pruneCache() {
  const dir = cacheDir();
  let names = [];
  try {
    names = await fs.promises.readdir(dir);
  } catch {
    return;
  }
  const now = Date.now();
  const big = [];
  for (const n of names) {
    const isKv = /^kv-[0-9a-f]{40}\.json$/.test(n);
    if (!isKv && !/^[0-9a-f]{40}\.dat$/.test(n)) continue;
    const f = path.join(dir, n);
    try {
      const st = await fs.promises.stat(f);
      const age = now - st.mtimeMs;
      if (isKv && st.size > 1e6) big.push({ f, t: st.mtimeMs, age });
      else if (age > (isKv ? 60 : 45) * 864e5) await fs.promises.rm(f, { force: true });
    } catch {}
  }
  big.sort((a, b) => b.t - a.t);
  for (const [i, x] of big.entries()) if (i >= 4 || x.age > 7 * 864e5) await queueFileOp(x.f, () => fs.promises.rm(x.f, { force: true })).catch(() => {});
}
app.whenReady().then(() => setTimeout(() => pruneCache().catch(() => {}), 60e3));

// Tartós dokumentumok (pl. fájlból felvett nagy listák) a felhasználói adatok mellett, „lists” mappában.
const docFile = (key) => path.join(app.getPath('userData'), 'lists', String(key).replace(/[^\w.-]+/g, '_') + '.json');
// strict: csak a nem létező dokumentum ad üres választ; az olvashatatlan / sérült fájl hibát ad (B30 – a
// mentéstár hibája ne látsszon üres tárnak, amire a következő mentés rá is írna)
ipcMain.handle('doc-get', async (_e, key, opts) => {
  try {
    return JSON.parse(await fs.promises.readFile(docFile(key), 'utf8'));
  } catch (err) {
    if (opts?.strict && err?.code !== 'ENOENT') throw new Error(`A dokumentum nem olvasható (${err?.code || err?.name || 'hiba'})`);
    return undefined;
  }
});
ipcMain.handle('doc-set', (_e, key, value) => {
  const f = docFile(key);
  // a törlés is a fájl írási sorába áll (különben egy még futó írás átnevezése visszahozná a dokumentumot)
  if (value == null) return queueFileOp(f, () => fs.promises.rm(f, { force: true }));
  return writeJsonFile(f, value);
});

// Kiegészítő csomagok (.adaspack) a felhasználói adatmappa „packs” almappájából: ami ott van, az
// beépített listaként jelenik meg (a programmal nem szállítjuk őket).
const packsDir = () => path.join(app.getPath('userData'), 'packs');
ipcMain.handle('packs-scan', async () => {
  const MAX = 200;
  let names = [];
  try {
    names = (await fs.promises.readdir(packsDir())).filter((n) => /\.adaspa(c)?k$/i.test(n)).sort();
  } catch {
    return [];
  }
  // → [{ name, text }] vagy [{ name, error }] – a kihagyott fájl oka is visszamegy (a felület jelzi)
  const out = names.slice(MAX).map((name) => ({ name, error: _t('túl sok csomag a mappában (legfeljebb {max})', { max: MAX }) }));
  for (const name of names.slice(0, MAX)) {
    let fh = null;
    try {
      // egyetlen megnyitott leíróból vizsgálunk és olvasunk (a kettő között a fájl nem cserélődhet ki)
      // nem blokkoló megnyitás (FIFO ne akassza meg), a típus a megnyitott leíróból
      fh = await fs.promises.open(path.join(packsDir(), name), fs.constants.O_RDONLY | (process.platform === 'win32' ? 0 : fs.constants.O_NONBLOCK || 0));
      const st = await fh.stat();
      if (!st.isFile()) continue;
      if (st.size > 64e6) out.push({ name, error: _t('túl nagy (legfeljebb 64 MB)') });
      else out.push({ name, text: await fh.readFile('utf8') });
    } catch (err) {
      out.push({ name, error: _t('nem olvasható ({error})', { error: err.code || err.message }) });
    } finally {
      await fh?.close().catch(() => {});
    }
  }
  return out;
});
ipcMain.handle('packs-dir', () => {
  fs.mkdirSync(packsDir(), { recursive: true });
  return shell.openPath(packsDir());
});

// Újrakezdés: minden adat törlése, mintha most telepítették volna. Az automatikus indítás kikapcsol, a jelölőfájl
// után az alkalmazás újraindul – az induló példány törli az adatmappát (a futó Chromium-fájlok ekkor már szabadok).
// A felvett videók (a Videók mappában) megmaradnak: azok a felhasználó fájljai.
ipcMain.handle('factory-reset', async () => {
  try {
    setStartWithSystem(false);
  } catch {}
  try {
    await session.defaultSession.clearStorageData();
    await session.defaultSession.clearCache();
  } catch {}
  fs.mkdirSync(dataDir(), { recursive: true });
  fs.writeFileSync(path.join(dataDir(), RESET_MARK), `${Date.now()} 0`);
  quitting = true;
  // (hordozható Windows-változat és AppImage: az eredeti fájlt kell újraindítani, nem az ideiglenes kibontást)
  relaunchSelf();
  setTimeout(() => app.exit(0), 100);
  return true;
});

ipcMain.handle('clear-cache', () => {
  fs.rmSync(cacheDir(), { recursive: true, force: true });
});

ipcMain.handle('save-file', async (_e, defaultName, text) => {
  const res = await dialog.showSaveDialog(win, {
    defaultPath: defaultName,
    filters: [{ name: 'JSON', extensions: ['json'] }],
  });
  if (res.canceled || !res.filePath) return false;
  fs.writeFileSync(res.filePath, text, 'utf8');
  return true;
});

// Saját témák: a téma-mappa .json / .adastheme fájljai (alapból az adatmappa „themes” almappája)
const defaultThemeDir = () => path.join(app.getPath('userData'), 'themes');
ipcMain.handle('theme-dir-read', async (_e, dir) => {
  const d = dir || defaultThemeDir();
  if (!dir) fs.mkdirSync(d, { recursive: true });
  let names;
  try {
    names = await fs.promises.readdir(d);
  } catch (err) {
    throw new Error(_t('A téma-mappa nem olvasható: {message}', { message: err.message }));
  }
  const out = [];
  for (const n of names.filter((x) => /\.(adastheme|json)$/i.test(x)).slice(0, 200)) {
    try {
      const buf = await readSmallFile(path.join(d, n), 1024 * 1024);
      if (buf) out.push({ name: n, text: buf.toString('utf8') });
    } catch {}
  }
  return { dir: d, files: out };
});
ipcMain.handle('theme-dir-open', (_e, dir) => {
  const d = dir || defaultThemeDir();
  fs.mkdirSync(d, { recursive: true });
  return shell.openPath(d);
});

ipcMain.handle('open-file', async (_e, filters) => {
  const res = await dialog.showOpenDialog(win, { properties: ['openFile'], filters });
  if (res.canceled || !res.filePaths.length) return null;
  return { name: path.basename(res.filePaths[0]), text: fs.readFileSync(res.filePaths[0], 'utf8') };
});

ipcMain.handle('open-files', async (_e, filters) => {
  const res = await dialog.showOpenDialog(win, { properties: ['openFile', 'multiSelections'], filters });
  if (res.canceled || !res.filePaths.length) return null;
  return res.filePaths.map((p) => ({ name: path.basename(p), bytes: new Uint8Array(fs.readFileSync(p)) }));
});

ipcMain.handle('open-external', (_e, url) => {
  if (/^https?:\/\//.test(url)) shell.openExternal(url);
});

// Megnyitás külső lejátszóban (VLC, mpv, IINA…): egy ideiglenes .m3u lejátszólistát adunk át a rendszernek,
// így a lejátszó a sorozat további részeit is látja. → hibaüzenet vagy ''.
ipcMain.handle('open-in-player', async (_e, { items, name }) => {
  const list = (items || []).filter((x) => /^(https?|file):\/\//i.test(x?.url || ''));
  if (!list.length) return _t('Nincs megnyitható cím.');
  // Saját, egyedi nevű ideiglenes mappa (csak a felhasználó érheti el), benne új fájl ('wx': meglévőt –
  // pl. egy más által odatett hivatkozást – nem ír felül). Kilépéskor törlődik.
  const dir = fs.mkdtempSync(path.join(app.getPath('temp'), 'adas-player-'));
  playerTmpDirs.push(dir);
  const file = path.join(dir, String(name || 'adas').replace(/[\\/:*?"<>|\r\n]+/g, '_').slice(0, 80) + '.m3u');
  const clean = (s) => String(s || '').replace(/[\r\n]+/g, ' ');
  fs.writeFileSync(file, '#EXTM3U\n' + list.map((x) => `#EXTINF:-1,${clean(x.title)}\n${clean(x.url)}`).join('\n') + '\n', { encoding: 'utf8', flag: 'wx', mode: 0o600 });
  return shell.openPath(file); // '' = sikerült; különben pl. „nincs társított alkalmazás”
});
const playerTmpDirs = [];
app.on('will-quit', () => playerTmpDirs.forEach((d) => fs.rmSync(d, { recursive: true, force: true })));

ipcMain.handle('set-fullscreen', (_e, on) => {
  if (win) win.setFullScreen(!!on);
});

ipcMain.handle('set-mini', (_e, on) => {
  if (!win) return;
  if (on) {
    if (win.isFullScreen()) win.setFullScreen(false);
    normalBounds = win.getBounds();
    // (U15) a munkaterület kezdőpontja nem mindig 0,0 (bal / felső másodlagos kijelző, felül lévő tálca)
    const { x, y, width, height } = require('electron').screen.getDisplayMatching(normalBounds).workArea;
    const w = Math.min(480, width - 48);
    const h = Math.min(270, height - 48);
    win.setAlwaysOnTop(true, 'floating');
    win.setBounds({ x: x + width - w - 24, y: y + height - h - 24, width: w, height: h });
  } else {
    win.setAlwaysOnTop(false);
    if (normalBounds) win.setBounds(normalBounds);
  }
});

ipcMain.handle('set-playing', (_e, playing) => {
  if (playing && sleepBlockerId === null) {
    sleepBlockerId = powerSaveBlocker.start('prevent-display-sleep');
  } else if (!playing && sleepBlockerId !== null) {
    powerSaveBlocker.stop(sleepBlockerId);
    sleepBlockerId = null;
  }
});

ipcMain.handle('app-info', () => ({ version: app.getVersion(), dataDir: dataDir(), platform: process.platform }));

// ---------------------------------------------------------------------------
// Helyi hálózat: kivetítés (Chromecast / DLNA), beállítások átadása
// ---------------------------------------------------------------------------
const lan = require('./lan');
lan.init({
  headersFor: (url) => hostHeaders.get(hostOf(url)),
  emit: (ch, data) => win && !win.isDestroyed() && win.webContents.send(ch, data),
  pinsFile: path.join(app.getPath('userData'), 'cast-pins.json'),
});
ipcMain.handle('cast-discover', () => lan.discover());
ipcMain.handle('cast-forget', (_e, id) => lan.castForget(id));

// Lejátszási híd (FFmpeg): AC3/DTS hang, beágyazott feliratok, régi videóformátumok, borítókép
const media = require('./media');
media.init({
  headersFor: (url) => hostHeaders.get(hostOf(url)),
  emit: (ch, data) => win && !win.isDestroyed() && win.webContents.send(ch, data),
});
ipcMain.handle('media-available', () => media.available());
ipcMain.handle('media-status', () => media.status());
ipcMain.handle('media-probe', (_e, url) => media.probe(url));
ipcMain.handle('media-start', (_e, plan) => media.start(plan));
ipcMain.handle('media-stop', (_e, id) => media.stop(id));
ipcMain.handle('media-cover', (_e, url) => media.cover(url));
let writesFlushed = false;
app.on('will-quit', (e) => {
  // A még folyamatban lévő mentések (beállítások, gyorsítótár) megvárása kilépés előtt (legfeljebb 3 mp)
  if (!writesFlushed && writeChains.size) {
    e.preventDefault();
    writesFlushed = true;
    Promise.race([Promise.allSettled([...writeChains.values()]), new Promise((r) => setTimeout(r, 3000))]).then(() => app.quit());
    return;
  }
  media.recStopAll();
  media.stopAll();
});

// Felvételek: a Videók / Adás felvételek mappába
// ADAS_REC_DIR: más mappa (pl. teszteléshez, a valódi Videók mappa érintése nélkül)
// A mappa neve az első használatkor a felület nyelvén (egy már meglévő magyar nevű mappa marad), és ez a
// választás megmarad (recdir.json), hogy nyelvváltás után is ugyanott legyenek a felvételek.
let recDirCache = null;
const recDir = () => {
  if (process.env.ADAS_REC_DIR) return process.env.ADAS_REC_DIR;
  if (recDirCache) return recDirCache;
  const saved = path.join(app.getPath('userData'), 'recdir.json');
  try {
    const d = JSON.parse(fs.readFileSync(saved, 'utf8')).dir;
    if (typeof d === 'string' && path.isAbsolute(d)) return (recDirCache = d);
  } catch {}
  const legacy = path.join(app.getPath('videos'), 'Adás felvételek');
  const local = path.join(app.getPath('videos'), _t('Adás felvételek'));
  recDirCache = getLang() === 'hu' || fs.existsSync(legacy) ? legacy : local;
  try {
    fs.writeFileSync(saved, JSON.stringify({ dir: recDirCache }));
  } catch {}
  return recDirCache;
};
ipcMain.handle('rec-start', (_e, o) => media.recStart({ ...o, dir: recDir() }));
// Ütemezett felvételek indítási ideje: a főfolyamat időzítője pontos (a tálcára rejtett ablak időzítőit a
// böngészőmotor akár percekre is visszafogja). Időben szól a felületnek, az indítja a felvételt.
const recTimers = new Map(); // id -> időzítő
ipcMain.handle('rec-schedule', (_e, list) => {
  for (const t of recTimers.values()) clearTimeout(t);
  recTimers.clear();
  for (const s of Array.isArray(list) ? list.slice(0, 200) : []) {
    const wait = Number(s.at) - Date.now();
    if (!s.id || !(wait > -3600e3) || wait > 7 * 864e5) continue;
    recTimers.set(String(s.id), setTimeout(() => win && !win.isDestroyed() && win.webContents.send('rec-due', String(s.id)), Math.max(0, wait)));
  }
  return recTimers.size;
});
ipcMain.handle('rec-stop', (_e, id) => media.recStop(id));
ipcMain.handle('rec-list', () => ({ dir: recDir(), files: media.recList(recDir()) }));
ipcMain.handle('rec-open', (_e, p) => (inRecDir(p) ? shell.openPath(path.resolve(p)) : _t('Érvénytelen fájl')));
ipcMain.handle('rec-folder', () => {
  fs.mkdirSync(recDir(), { recursive: true });
  return shell.openPath(recDir());
});
// csak a felvételek mappájában lévő fájl (útvonal-normalizálással: „..” nem vezethet ki belőle)
const inRecDir = (p) => {
  const full = path.resolve(String(p || ''));
  return full.startsWith(path.resolve(recDir()) + path.sep) && /\.(ts|mkv|mp4|mp3|aac)$/i.test(full);
};
ipcMain.handle('rec-trash', async (_e, p) => {
  if (!inRecDir(p) || media.isRecording(p)) return false; // futó felvétel nem mehet a Lomtárba
  p = path.resolve(p);
  await shell.trashItem(p);
  // a vágás előtti eredeti is megy (külön nem játszható le, csak újravágáshoz kellett)
  const orig = media.originalOf(p);
  if (fs.existsSync(orig)) await shell.trashItem(orig).catch(() => {});
  return true;
});
ipcMain.handle('rec-trim', (_e, { path: p, start, end } = {}) => (inRecDir(p) ? media.recTrim(path.resolve(p), start, end) : Promise.reject(new Error(_t('Érvénytelen fájl')))));
ipcMain.handle('rec-original', (_e, p) => (inRecDir(p) ? { source: media.recSource(path.resolve(p)), trimmed: fs.existsSync(media.originalOf(path.resolve(p))) } : null));
ipcMain.handle('rec-restore', (_e, p) => (inRecDir(p) ? media.recRestore(path.resolve(p)) : false));
ipcMain.handle('cast-play', (_e, opts) => lan.castPlay(opts));
ipcMain.handle('cast-control', (_e, action, value) => lan.castControl(action, value));
ipcMain.handle('share-start', (_e, data, id) => lan.shareStart(data, 15, id));
ipcMain.handle('share-stop', () => lan.shareStop());
ipcMain.handle('lan-ips', () => lan.sortedIPs());
ipcMain.handle('lan-get', (_e, urls, timeout) => lan.lanGet(Array.isArray(urls) ? urls.slice(0, 1100) : [], timeout));
ipcMain.handle('rc-start', (_e, html, pin, key) => lan.rcStart(html, pin, key));
ipcMain.handle('rc-stop', () => lan.rcStop());
ipcMain.on('rc-state', (_e, json) => lan.rcState(json));

// ---------------------------------------------------------------------------
// Frissítések
// ---------------------------------------------------------------------------
const updater = require('./updater');
ipcMain.handle('update-check', (_e, source) => updater.check(source));
ipcMain.handle('update-download', (_e, asset) =>
  updater.download(asset, (p) => win && !win.isDestroyed() && win.webContents.send('update-progress', p))
);
ipcMain.handle('update-install', (_e, file) => updater.install(file));

// ---------------------------------------------------------------------------
app.userAgentFallback = CHROME_UA;
// A videóelem hangsáv-felülete (video.audioTracks) – több hangsávos MKV / MP4 fájlokhoz.
app.commandLine.appendSwitch('enable-blink-features', 'AudioVideoTracks');

// A Windows értesítései az alkalmazás azonosítójához kötődnek.
if (process.platform === 'win32') app.setAppUserModelId('hu.adas.tv');

// Tartós borítótár (covers.js): az adasimg:// sémát még az app „ready” előtt kell bejegyezni.
covers.registerScheme(protocol);
ipcMain.handle('covers-stats', () => covers.stats());
ipcMain.handle('covers-clear', () => covers.clear());

app.whenReady().then(() => {
  // (Újrakezdés) a törlés nem fejeződött be: a megmaradt régi adatokkal nem indul „tisztaként” – újrapróbálás vagy
  // kilépés; a megengedett körök után figyelmeztetéssel elindul
  if (resetFailed) {
    const last = resetFailed.tries >= RESET_TRIES;
    const r = dialog.showMessageBoxSync({
      type: 'warning',
      title: 'Adás',
      message: _t('Az újrakezdés nem fejeződött be'),
      detail:
        _t('Néhány fájl nem törölhető (talán egy másik program használja): {list}', { list: resetFailed.rest.slice(0, 6).join(', ') }) +
        '\n\n' +
        (last ? _t('Az Adás most a megmaradt adatokkal indul. A mappát kézzel is törölheted: {dir}', { dir: dataDir() }) : _t('Zárd be a többi programot, majd próbáld újra.')),
      buttons: last ? [_t('Rendben')] : [_t('Újrapróbálás'), _t('Kilépés')],
      defaultId: 0,
      cancelId: last ? 0 : 1,
    });
    if (!last) {
      if (r === 0) relaunchSelf();
      app.exit(0);
      return;
    }
  }
  // (H37) a borítótár vagy a menü hibája ne akadályozza meg az ablak létrehozását
  try {
    covers.install(protocol, net, dataDir());
  } catch (err) {
    console.error('[start] borítótár:', err);
  }
  // macOS-en a menüsor nélkül a Cmd+C / Cmd+V / Cmd+Q sem működne: ott egy minimális menü kell.
  Menu.setApplicationMenu(
    process.platform === 'darwin'
      ? Menu.buildFromTemplate([{ role: 'appMenu' }, { role: 'editMenu' }, { role: 'windowMenu' }])
      : null
  );
  try {
    installHeaderHooks();
  } catch (err) {
    console.error('[start] fejléc-kezelő:', err);
  }
  createWindow();
  // macOS: a Dock-ikonra kattintva az elrejtett (vagy bezárt) ablak előjön.
  app.on('activate', () => showWindow());
}).catch((err) => {
  // (H37) a váratlan indulási hiba ne hagyja ablak és üzenet nélkül a felhasználót
  console.error('[start]', err);
  try {
    dialog.showErrorBox('Adás', _t('Az Adás nem tudott elindulni: {msg}', { msg: err?.message || String(err) }));
  } catch {}
  app.exit(1);
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
