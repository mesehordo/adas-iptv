'use strict';
const { _t } = require('./i18n-main');
// Lejátszási híd (asztali változat) az FFmpeg segítségével – a beépített (Chromium) lejátszó
// hiányosságaira:
//  - AC3 / E-AC3 / DTS / TrueHD hang → menet közben AAC-re alakítva (a kép érintetlen marad);
//  - a fájlba ágyazott feliratok (MKV: ASS / SRT, MP4: mov_text) → WebVTT, a lejátszó feliratmenüjébe;
//  - több hangsáv közül bármelyik választható (nem csak az, amelyiket a böngésző ismer);
//  - régi videóformátumok (pl. XviD, WMV) → H.264-re alakítva;
//  - beágyazott borítókép (MKV-melléklet, MP4 „covr”) kinyerése.
// A kimenet töredékes MP4, amit a felület MediaSource-szal játszik le (valódi időtengellyel, tekerhetően).

const http = require('http');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { spawn } = require('child_process');
const lan = require('./lan'); // hálózati szabály (fetchPolicy) és korlátos olvasás (readBody)

let opts = { headersFor: () => null, emit: () => {} };
let server = null;
let port = 0;
const token = crypto.randomBytes(12).toString('hex');
const sessions = new Map(); // id -> { args, proc }
let seq = 0;

/** A csomagolt FFmpeg (resources/ffmpeg) vagy fejlesztéskor az ffmpeg-static csomagé. */
function ffmpegPath() {
  const exe = process.platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg';
  const cands = [];
  if (process.resourcesPath) cands.push(path.join(process.resourcesPath, 'ffmpeg', exe));
  try {
    cands.push(require('ffmpeg-static'));
  } catch {}
  const found = cands.find((p) => p && fs.existsSync(p)) || null;
  // Linux / macOS: ha a fájl futtathatósági jog nélkül került a gépre, pótoljuk (ahol írható)
  if (found && process.platform !== 'win32') {
    try {
      fs.accessSync(found, fs.constants.X_OK);
    } catch {
      try {
        fs.chmodSync(found, 0o755);
      } catch {}
    }
  }
  return found;
}
const FF = ffmpegPath();

function init(o) {
  opts = { ...opts, ...o };
}

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36';

/**
 * Az FFmpeg bemenete.
 *  - http(s): a helyi továbbítón át (127.0.0.1) – a névfeloldást, a HTTPS-t, az átirányítást és a
 *    fejléceket (User-Agent, Referer) az Electron végzi. A Linuxos FFmpeg teljesen statikus, és az ilyen
 *    bináris sok rendszeren nem tud domainnevet feloldani (DNS) – közvetlenül el sem érné a tárhelyet.
 *  - file://: helyi (vagy UNC) útvonal, mert a file: protokollt az FFmpeg nem dekódolja.
 * Hívás előtt a helyi kiszolgálónak futnia kell (ensureServer).
 */
const srcKeys = new Map(); // eredeti cím -> kulcs
const srcUrls = new Map(); // kulcs -> eredeti cím
const srcRoots = new Map(); // kulcs -> a felhasználó választotta forrás (a hálózati szabályhoz, lásd lan.fetchPolicy)
/** root: a lista, amelyik erre a címre hivatkozik, a gyökérforrással (üres: ez maga a választott forrás) */
function inputOf(url, root = '') {
  if (/^https?:/i.test(url)) {
    let k = srcKeys.get(url);
    if (!k) {
      k = crypto.randomBytes(8).toString('hex');
      srcKeys.set(url, k);
      srcUrls.set(k, url);
      srcRoots.set(k, root || url);
    }
    return `http://127.0.0.1:${port}/${token}/src/${k}`;
  }
  if (!/^file:/i.test(url)) return url;
  try {
    return require('url').fileURLToPath(url);
  } catch {
    return decodeURIComponent(url.replace(/^file:\/+/i, process.platform === 'win32' ? '' : '/'));
  }
}

/** Hálózati bemenetnél: újracsatlakozás megszakadt kapcsolat után (a továbbító Range-dzsel folytatja). */
function headerArgs(url) {
  return /^https?:/i.test(url) ? ['-reconnect', '1', '-reconnect_streamed', '1', '-reconnect_delay_max', '4'] : [];
}

// A naplóba írható hibakódok (rögzített lista – a távoli forrásból jövő szöveg nem kerülhet a naplóba)
const LOG_CODES = ['ECONNREFUSED', 'ECONNRESET', 'ENOTFOUND', 'ETIMEDOUT', 'EHOSTUNREACH', 'ENETUNREACH', 'EAI_AGAIN', 'EPROTO', 'ABORT_ERR', '403', 'CERT_HAS_EXPIRED', 'UND_ERR_SOCKET'];

/** Helyi továbbító: GET /<token>/src/<kulcs> → az eredeti cím (Range, átirányítás, fejlécek). */
async function relay(key, req, res) {
  const target = srcUrls.get(key);
  if (!target) {
    res.statusCode = 404;
    return res.end();
  }
  const h = opts.headersFor(target) || {};
  const headers = { 'User-Agent': h.ua || UA, 'Accept-Encoding': 'identity', Accept: '*/*' };
  if (h.referrer) headers.Referer = h.referrer;
  if (req.headers.range) headers.Range = req.headers.range;
  const ac = new AbortController();
  res.on('close', () => ac.abort());
  try {
    // átirányítás és a listában hivatkozott címek: internetes forrásból nem vezethetnek helyi címre
    const root = srcRoots.get(key) || target;
    const { res: up, finalUrl } = await lan.fetchPolicy(target, { method: req.method === 'HEAD' ? 'HEAD' : 'GET', headers, signal: ac.signal }, root);
    const out = { 'Content-Type': up.headers.get('content-type') || 'application/octet-stream' };
    for (const k of ['content-length', 'content-range', 'accept-ranges', 'last-modified', 'etag']) {
      const v = up.headers.get(k);
      if (v) out[k] = v;
    }
    if (up.headers.get('content-encoding') && up.headers.get('content-encoding') !== 'identity') delete out['content-length'];
    // HLS-lista (élő adás felvétele): a benne lévő címek is a továbbítón át menjenek
    const looksList = /mpegurl/i.test(out['Content-Type']) || /\.m3u8?(\?|$)/i.test(new URL(finalUrl).pathname);
    if (looksList && up.ok && req.method !== 'HEAD') {
      const text = await lan.readBody(up, 4 * 1024 * 1024); // a lista legfeljebb 4 MB (kicsomagolva)
      if (text.trimStart().startsWith('#EXTM3U')) {
        const abs = (x) => {
          try {
            return new URL(x, finalUrl).href;
          } catch {
            return x;
          }
        };
        const body = text
          .split(/\r?\n/)
          .map((line) => {
            const l = line.trim();
            if (!l) return line;
            if (l.startsWith('#')) return line.replace(/URI="([^"]+)"/g, (_m, x) => `URI="${inputOf(abs(x), root)}"`);
            return inputOf(abs(l), root);
          })
          .join('\n');
        res.writeHead(200, { 'Content-Type': 'application/vnd.apple.mpegurl', 'Cache-Control': 'no-cache' });
        return res.end(body);
      }
      res.writeHead(up.status, out);
      return res.end(text);
    }
    res.writeHead(up.status, out);
    if (req.method === 'HEAD' || !up.body) return res.end();
    const { Readable } = require('stream');
    Readable.fromWeb(up.body)
      .on('error', () => res.destroy())
      .pipe(res);
  } catch (err) {
    if (res.headersSent) return res.destroy();
    res.statusCode = 502;
    // csak a hibakód kerül a naplóba (az üzenet a távoli címet / választ is tartalmazhatná)
    const got = String(err.cause?.code || err.code || '');
    const code = LOG_CODES.find((c) => c === got) || 'egyéb';
    console.warn('Továbbító – a forrás nem érhető el, hibakód:', code);
    res.end('A forrás nem érhető el');
  }
}

// ---------------------------------------------------------------------------
// Fájlelemzés: az FFmpeg „-i” kimenetéből
// ---------------------------------------------------------------------------
const TEXT_SUBS = new Set(['ass', 'ssa', 'subrip', 'srt', 'mov_text', 'webvtt', 'text', 'microdvd', 'subviewer', 'mpl2', 'sami', 'realtext', 'jacosub', 'stl', 'vplayer', 'pjs']);

function parseInfo(text) {
  const out = { duration: 0, title: '', video: [], audio: [], subs: [], cover: -1 };
  const d = /Duration: (\d+):(\d+):(\d+(?:\.\d+)?)/.exec(text);
  if (d) out.duration = +d[1] * 3600 + +d[2] * 60 + parseFloat(d[3]);
  const lines = text.split(/\r?\n/);
  let cur = null;
  let inGlobal = true;
  const counts = { Video: 0, Audio: 0, Subtitle: 0 };
  for (const line of lines) {
    const m = /^\s*Stream #0:(\d+)(?:\[[^\]]*\])?(?:\(([^)]*)\))?: (Video|Audio|Subtitle|Attachment|Data): (\w+)(.*)$/.exec(line);
    if (m) {
      inGlobal = false;
      const [, idx, lang = '', kind, codec, rest] = m;
      cur = { index: +idx, lang: lang === 'und' ? '' : lang, codec: codec.toLowerCase(), title: '', default: /\(default\)/.test(rest), forced: /\(forced\)/.test(rest) };
      if (kind === 'Video') {
        if (/attached pic/.test(rest)) {
          if (out.cover < 0) out.cover = cur.index;
          cur = null;
          continue;
        }
        const wh = /, (\d{2,5})x(\d{2,5})/.exec(rest);
        cur.width = wh ? +wh[1] : 0;
        cur.height = wh ? +wh[2] : 0;
        cur.profile = (/^\s*\(([^)]+)\)/.exec(rest) || [])[1] || '';
        cur.pix = (/, (yuv\w+|nv12|p010\w*)/.exec(rest) || [])[1] || '';
        cur.rel = counts.Video++;
        out.video.push(cur);
      } else if (kind === 'Audio') {
        cur.channels = (/\d+ Hz, ([^,]+)/.exec(rest) || [])[1] || '';
        cur.rel = counts.Audio++;
        out.audio.push(cur);
      } else if (kind === 'Subtitle') {
        cur.text = TEXT_SUBS.has(cur.codec);
        cur.rel = counts.Subtitle++;
        out.subs.push(cur);
      } else cur = null;
      continue;
    }
    const t = /^\s+title\s*:\s*(.+)$/.exec(line);
    if (t) {
      if (cur) cur.title = t[1].trim();
      else if (inGlobal && !out.title) out.title = t[1].trim();
    }
  }
  return out;
}

const probeCache = new Map();
function probe(url) {
  if (!FF) return Promise.resolve({ error: 'nincs ffmpeg' });
  if (probeCache.has(url)) return probeCache.get(url);
  const p = ensureServer().then(() => new Promise((resolve) => {
    let err = '';
    const proc = spawn(FF, ['-hide_banner', '-nostdin', ...headerArgs(url), '-i', inputOf(url)], { stdio: ['ignore', 'ignore', 'pipe'], windowsHide: true });
    const timer = setTimeout(() => proc.kill('SIGKILL'), 20000);
    proc.stderr.on('data', (b) => (err += b));
    proc.on('error', (e) => resolve({ error: String(e.message || e) }));
    proc.on('close', () => {
      clearTimeout(timer);
      const info = parseInfo(err);
      if (!info.video.length && !info.audio.length) {
        const why =
          (/(HTTP error \d+[^\r\n]*|Server returned [^\r\n]+|Invalid data found[^\r\n]*|No such file[^\r\n]*)/.exec(err) || [])[1] ||
          err.trim().split(/\r?\n/).filter(Boolean).pop();
        probeCache.delete(url);
        console.warn('Lejátszási híd – elemzési hiba:', url, why);
        return resolve({ error: why || _t('a fájl nem elemezhető') });
      }
      resolve(info);
    });
  }));
  probeCache.set(url, p);
  p.catch(() => probeCache.get(url) === p && probeCache.delete(url)); // (pl. a helyi kiszolgáló nem indult – a következő próba újra)
  setTimeout(() => probeCache.delete(url), 30 * 60e3);
  return p;
}
/** Egy helyi fájl elemzésének elfelejtése (pl. vágás után más a hossza, de ugyanaz a címe). */
function forgetFile(p) {
  const want = path.resolve(p);
  for (const k of [...probeCache.keys()]) {
    if (!/^file:/i.test(k)) continue;
    try {
      if (path.resolve(inputOf(k)) === want) probeCache.delete(k);
    } catch {}
  }
}

// ---------------------------------------------------------------------------
// Lejátszási folyam
// ---------------------------------------------------------------------------
/**
 * plan: { url, ss, video: rel index, audio: rel index, vcopy, acopy, subs: [rel index], hevc }
 * → { id, url } – a felület ezt a címet tölti le (töredékes MP4), a feliratok 'media-subs' eseményként jönnek.
 */
async function start(plan) {
  if (!FF) throw new Error(_t('Az FFmpeg nem található'));
  await ensureServer();
  const id = String(++seq);
  sessions.set(id, { plan, proc: null });
  // A régi (pl. tekerés előtti) folyamokat a felület zárja le; biztonsági korlát:
  if (sessions.size > 6) for (const [k, s] of sessions) if (k !== id && sessions.size > 6) stopSession(k, s);
  return { id, url: `http://127.0.0.1:${port}/${token}/${id}` };
}

function buildArgs(plan) {
  const ss = Math.max(0, +plan.ss || 0);
  const a = ['-hide_banner', '-nostdin', '-loglevel', 'error'];
  if (ss > 0) a.push('-ss', ss.toFixed(3));
  // Az eredeti időbélyegek megmaradnak: a kép, a hang és a felirat a film saját idejében érkezik.
  a.push('-copyts', ...headerArgs(plan.url), '-i', inputOf(plan.url));
  a.push('-map', `0:V:${plan.video || 0}?`);
  if (plan.audio >= 0) a.push('-map', `0:a:${plan.audio}`);
  if (plan.vcopy) {
    a.push('-c:v', 'copy');
    if (plan.hevc) a.push('-tag:v', 'hvc1');
  } else {
    // Régi formátum (XviD, WMV…): H.264-re alakítva, a gép teljesítményéhez igazodva gyorsan.
    a.push('-c:v', 'libx264', '-preset', 'veryfast', '-crf', '21', '-profile:v', 'high', '-level', '4.1', '-pix_fmt', 'yuv420p', '-g', '50', '-sc_threshold', '0');
  }
  if (plan.audio >= 0) {
    if (plan.acopy) a.push('-c:a', 'copy');
    else a.push('-c:a', 'aac', '-b:a', '192k', '-ac', '2');
  }
  a.push('-f', 'mp4', '-movflags', 'frag_keyframe+empty_moov+default_base_moof', '-frag_duration', '2000000', 'pipe:1');
  const subs = plan.subs || [];
  subs.forEach((s, k) => a.push('-map', `0:s:${s}`, '-c:s', 'webvtt', '-f', 'webvtt', `pipe:${3 + k}`));
  // Az MP4-kimenet nulláról kezdi az időt; a nullpont az első videócsomag eredeti időpontja (átvett
  // képnél a tekerési pont előtti kulcskocka). Ezt egy apró mellékkimenet adja meg a felületnek.
  if (plan.vcopy && plan.hasVideo) a.push('-map', `0:V:${plan.video || 0}`, '-c:v', 'copy', '-frames:v', '1', '-f', 'framemd5', `pipe:${3 + subs.length}`);
  return a;
}

/** framemd5 → az első csomag DTS-e másodpercben */
function firstDts(text) {
  const tb = /#tb 0: (\d+)\/(\d+)/.exec(text);
  const row = /^0,\s*(-?\d+),/m.exec(text);
  return tb && row ? (+row[1] * +tb[1]) / +tb[2] : null;
}

function stopSession(id, s = sessions.get(id)) {
  if (!s) return;
  sessions.delete(id);
  try {
    s.proc?.kill('SIGKILL');
  } catch {}
}

// (U10) a kiszolgáló indulásának közös ígérete: párhuzamos hívók a ténylegesen megnyitott portot várják meg
let serverReady = null;
function ensureServer() {
  if (serverReady) return serverReady;
  serverReady = new Promise((resolve, reject) => {
    server = http.createServer((req, res) => {
      // A forrás továbbítása az FFmpegnek (DNS, HTTPS, fejlécek az Electron oldalán)
      const src = /^\/([0-9a-f]+)\/src\/([0-9a-f]+)$/.exec(req.url.split('?')[0]);
      if (src && src[1] === token) return relay(src[2], req, res);
      const m = /^\/([0-9a-f]+)\/(\d+)$/.exec(req.url.split('?')[0]);
      const s = m && m[1] === token && sessions.get(m[2]);
      if (!s) {
        res.statusCode = 404;
        return res.end();
      }
      if (s.proc) {
        res.statusCode = 409; // egy folyamot csak egyszer lehet letölteni
        return res.end();
      }
      const id = m[2];
      const nSubs = (s.plan.subs || []).length;
      const withT0 = s.plan.vcopy && s.plan.hasVideo;
      const proc = spawn(FF, buildArgs(s.plan), { stdio: ['ignore', 'pipe', 'pipe', ...Array(nSubs + (withT0 ? 1 : 0)).fill('pipe')], windowsHide: true });
      s.proc = proc;
      let errText = '';
      proc.stderr.on('data', (b) => {
        if (errText.length < 4000) errText += b;
      });
      for (let k = 0; k < nSubs; k++) {
        proc.stdio[3 + k].setEncoding('utf8');
        proc.stdio[3 + k].on('data', (text) => opts.emit('media-subs', { id, k, text }));
        proc.stdio[3 + k].on('error', () => {});
      }
      // Átalakított (vagy kép nélküli) kimenetnél a nullpont maga a tekerési pont.
      if (!withT0) setImmediate(() => opts.emit('media-t0', { id, t0: Math.max(0, +s.plan.ss || 0) }));
      else {
        const pipe = proc.stdio[3 + nSubs];
        let txt = '';
        let sent = false;
        pipe.setEncoding('utf8');
        pipe.on('data', (t) => {
          txt += t;
          const v = !sent && firstDts(txt);
          if (v !== null && v !== false) {
            sent = true;
            opts.emit('media-t0', { id, t0: v });
          }
        });
        pipe.on('error', () => {});
      }
      res.writeHead(200, { 'Content-Type': 'video/mp4', 'Cache-Control': 'no-store', 'Access-Control-Allow-Origin': '*' });
      proc.stdout.pipe(res);
      proc.on('error', (e) => {
        opts.emit('media-end', { id, error: String(e.message || e) });
        res.destroy();
      });
      proc.on('close', (code) => {
        opts.emit('media-end', { id, code, error: code ? errText.trim().split(/\r?\n/).slice(-2).join(' ') : '' });
        sessions.delete(id);
      });
      // A felület bezárta a kapcsolatot (tekerés, másik sáv, kilépés): az FFmpeg leáll.
      res.on('close', () => stopSession(id, s));
    });
    server.on('error', (err) => {
      if (!port) (server = null), (serverReady = null); // (sikertelen indulás: a következő hívás újrapróbál)
      reject(err);
    });
    server.listen(0, '127.0.0.1', () => {
      port = server.address().port;
      resolve();
    });
  });
  return serverReady;
}

function stop(id) {
  stopSession(String(id));
}

// ---------------------------------------------------------------------------
// Beágyazott borítókép (MKV-melléklet / MP4 covr) → data: URL (342 px széles JPEG)
// ---------------------------------------------------------------------------
async function cover(url) {
  const info = await probe(url);
  if (info.error || info.cover < 0) return '';
  return new Promise((resolve) => {
    const chunks = [];
    const proc = spawn(
      FF,
      ['-hide_banner', '-nostdin', '-loglevel', 'error', ...headerArgs(url), '-i', inputOf(url), '-map', `0:${info.cover}`, '-frames:v', '1', '-vf', 'scale=342:-2', '-f', 'image2', '-c:v', 'mjpeg', '-q:v', '4', 'pipe:1'],
      { stdio: ['ignore', 'pipe', 'ignore'], windowsHide: true }
    );
    const timer = setTimeout(() => proc.kill('SIGKILL'), 20000);
    proc.stdout.on('data', (b) => chunks.push(b));
    proc.on('error', () => resolve(''));
    proc.on('close', () => {
      clearTimeout(timer);
      const buf = Buffer.concat(chunks);
      resolve(buf.length > 200 ? 'data:image/jpeg;base64,' + buf.toString('base64') : '');
    });
  });
}

/** Állapot a Beállításokhoz: megvan-e és elindul-e az FFmpeg. → { ok, version, path, error } */
let statusP = null;
function status() {
  if (!FF) return Promise.resolve({ ok: false, error: _t('Az FFmpeg nem található a programmal együtt (resources/ffmpeg).') });
  statusP ||= new Promise((resolve) => {
    let out = '';
    const proc = spawn(FF, ['-hide_banner', '-version'], { stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
    const timer = setTimeout(() => proc.kill('SIGKILL'), 8000);
    proc.stdout.on('data', (b) => (out += b));
    proc.on('error', (e) => {
      clearTimeout(timer);
      statusP = null;
      resolve({ ok: false, path: FF, error: String(e.message || e) });
    });
    proc.on('close', (code) => {
      clearTimeout(timer);
      const v = (/ffmpeg version (\S+)/.exec(out) || [])[1];
      if (!v) statusP = null;
      resolve(v ? { ok: true, version: v, path: FF } : { ok: false, path: FF, error: _t('kilépési kód {code}', { code }) });
    });
  });
  return statusP;
}

/** Kilépéskor: minden futó FFmpeg leáll (Windowson a gyermekfolyamat magától nem állna le). */
function stopAll() {
  for (const [id, s] of sessions) stopSession(id, s);
  try {
    server?.close();
  } catch {}
}

// ---------------------------------------------------------------------------
// Felvétel: az adás változatlan (újrakódolás nélküli) mentése MPEG-TS fájlba
// ---------------------------------------------------------------------------
const recordings = new Map(); // id -> { proc, file, timer, title }
let recSeq = 0;

/**
 * Felvétel indítása. Az FFmpeg a kimenetét nekünk adja (pipe), mi fűzzük a fájlhoz – így ha az adás
 * megszakad és az FFmpeg kilép, néhány másodperc múlva újraindítjuk, és ugyanabba a fájlba folytatja
 * (az MPEG-TS egyszerűen összefűzhető). Élő HLS-nél a lejátszólista frissítését is türelmesebben várja.
 * until: a leállás ideje (ütemezett felvétel), 0 = kézi leállításig.
 * audio (rádió): 'mp3' / 'aac' – a hang változatlanul MP3, ill. AAC (ADTS) fájlba; 'enc' – más kódolású adás
 * (Opus, Vorbis, FLAC…) AAC-be kódolva. Ezek a formátumok is egyszerűen összefűzhetők.
 */
const AUDIO_OUT = {
  mp3: { ext: '.mp3', args: ['-vn', '-c:a', 'copy', '-f', 'mp3'] },
  aac: { ext: '.aac', args: ['-vn', '-c:a', 'copy', '-f', 'adts'] },
  enc: { ext: '.aac', args: ['-vn', '-c:a', 'aac', '-b:a', '192k', '-f', 'adts'] },
};
async function recStart({ url, dir, name, until, audio }) {
  if (!FF) throw new Error(_t('Az FFmpeg nem érhető el.'));
  await ensureServer();
  fs.mkdirSync(dir, { recursive: true });
  const safe = String(name || 'felvetel').replace(/[\\/:*?"<>|\u0000-\u001f]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 120) || 'felvetel';
  const aOut = AUDIO_OUT[audio] || null;
  const ext = aOut ? aOut.ext : '.ts';
  // (H32) a szabad név lefoglalása kizárólagos létrehozással („wx”): az ellenőrzés és a megnyitás között egy másik,
  // egyszerre induló felvétel nem kaphatja ugyanazt a fájlt
  let file = '';
  let fd = -1;
  for (let i = 1; fd < 0; i++) {
    if (i > 9999) throw new Error(_t('Nem sikerült fájlnevet foglalni a felvételnek.'));
    file = path.join(dir, i === 1 ? `${safe}${ext}` : `${safe} (${i})${ext}`);
    try {
      fd = fs.openSync(file, 'wx');
    } catch (err) {
      if (err.code !== 'EEXIST') throw err;
    }
  }
  const hlsOpts = /\.m3u8?(\?|$)/i.test(url) ? ['-max_reload', '1000', '-m3u8_hold_counters', '1000'] : [];
  // Újraindításkor a kimenet ideje az addig eltelt idővel folytatódik (különben az összefűzött fájlban az idő visszaugrana)
  // (élő HLS-nél újraindításkor a legfrissebb résztől folytatjuk – különben a korábbi részek ismétlődnének)
  const argsFor = (offset) => ['-hide_banner', '-nostdin', '-loglevel', 'error', ...headerArgs(url), ...hlsOpts, ...(offset > 0 && hlsOpts.length ? ['-live_start_index', '-1'] : []), '-i', inputOf(url), ...(aOut ? aOut.args : ['-c', 'copy', ...(offset > 0 ? ['-output_ts_offset', offset.toFixed(1)] : []), '-f', 'mpegts']), 'pipe:1'];
  const id = String(++recSeq);
  const out = fs.createWriteStream(file, { fd, flags: 'a' });
  const rec = { proc: null, file, out, started: Date.now(), until: until || 0, restarts: 0, err: '' };
  recordings.set(id, rec);
  const MAX_RESTARTS = 60;
  let ended = false; // a lezárás elindult (rendes vég, végleges hiba vagy írási hiba)
  let notified = false;
  let endError = ''; // (a lezárás közben érkező írási hiba is ide kerül – az értesítés ezzel megy)
  // Egyetlen rec-ended értesítés, a fájl tényleges bezárásakor ('close' – hibánál is jön, autoDestroy)
  const notify = () => {
    if (notified) return;
    notified = true;
    let size = 0;
    try {
      size = fs.statSync(file).size;
    } catch {}
    opts.emit('rec-ended', { id, file, size, restarts: rec.restarts, error: endError });
  };
  out.once('close', notify);
  // (H38) minden lezárás (a recStop is) ezen az egy, egyszer futó úton megy – egyetlen rec-ended
  const finish = (rec.finish = (error) => {
    if (error && !endError) endError = error;
    if (ended) return;
    ended = true;
    clearTimeout(rec.timer);
    clearTimeout(rec.retry);
    recordings.delete(id);
    if (out.destroyed || out.closed) notify();
    else out.end();
  });
  // (H01) írási hiba (betelt lemez, jogosultság, eltűnt külső meghajtó): a kezeletlen stream-hiba a főfolyamatot
  // leállítaná – helyette az FFmpeg leáll, a felvétel hibával véget ér, újrapróbálás nincs
  out.on('error', (err) => {
    rec.stopping = true;
    try {
      rec.proc?.stdout.unpipe(out);
      rec.proc?.kill();
    } catch {}
    finish(_t('A felvétel nem írható a lemezre: {msg}', { msg: err.code || err.message }));
  });
  const run = () => {
    if (ended) return;
    const proc = spawn(FF, argsFor(rec.restarts ? (Date.now() - rec.started) / 1000 : 0), { stdio: ['pipe', 'pipe', 'pipe'], windowsHide: true });
    rec.proc = proc;
    rec.err = '';
    proc.stdout.pipe(out, { end: false });
    proc.stderr.on('data', (b) => {
      if (rec.err.length < 2000) rec.err += b;
    });
    proc.on('error', () => {});
    proc.on('close', (code) => {
      proc.stdout.unpipe(out);
      // (a kilépett folyamat már nem „fut” – jelzéssel leállt (összeomlott, kilőtt) FFmpegnél az exitCode null marad,
      // így a leállítás enélkül a halott folyamatra várna, és a felvétel soha nem zárulna le)
      if (rec.proc === proc) rec.proc = null;
      if (rec.stopping) return finish('');
      // Váratlan leállás (megszakadt az adás): újrapróbálás, amíg az ütemezett vég el nem jön
      const left = rec.until ? rec.until - Date.now() : Infinity;
      if (left > 5000 && rec.restarts < MAX_RESTARTS) {
        rec.restarts++;
        rec.retry = setTimeout(run, 3000);
        return;
      }
      finish(code && left > 5000 ? rec.err.trim().split('\n').pop() || _t('kilépési kód: {code}', { code }) : '');
    });
  };
  if (until) rec.timer = setTimeout(() => recStop(id), Math.max(1000, until - Date.now()));
  run();
  return { id, file };
}

function recStop(id) {
  const r = recordings.get(String(id));
  if (!r) return false;
  r.stopping = true;
  clearTimeout(r.retry);
  if (!r.proc) {
    // éppen újraindításra vár: nincs futó FFmpeg – a fájlt lezárjuk
    r.finish('');
    return true;
  }
  // (már kilépett, de a kimenete még ürül: a folyamat „close” eseménye zárja le a fájlt – a pufferelt adat sem vész el)
  if (r.proc.exitCode !== null || r.proc.signalCode !== null) return true;
  // „q”: az FFmpeg rendben lezárja a kimenetet; ha nem reagál, leállítjuk
  try {
    r.proc.stdin.write('q');
  } catch {}
  setTimeout(() => {
    try {
      r.proc?.kill('SIGKILL');
    } catch {}
  }, 4000);
  return true;
}

// Vágás: az első vágáskor az eredeti a rejtett „.eredeti” almappába kerül (onnan bármikor újravágható),
// a felvétel helyén a vágott változat lesz – a listában és a lejátszásban csak ez szerepel.
const ORIG_DIR = '.eredeti';
const originalOf = (p) => path.join(path.dirname(p), ORIG_DIR, path.basename(p));

function recList(dir) {
  try {
    return fs
      .readdirSync(dir)
      .filter((f) => /\.(ts|mkv|mp4|mp3|aac)$/i.test(f) && !/\.vagas\.tmp\.[a-z0-9]+$/i.test(f))
      .map((f) => {
        const p = path.join(dir, f);
        const st = fs.statSync(p);
        return { name: f, path: p, size: st.size, mtime: st.mtimeMs, active: [...recordings.values()].some((r) => r.file === p), trimmed: fs.existsSync(originalOf(p)) };
      })
      .sort((a, b) => b.mtime - a.mtime);
  } catch {
    return [];
  }
}

/** A vágás forrása: a megőrzött eredeti, ha már vágtuk, különben maga a felvétel. */
const recSource = (p) => (fs.existsSync(originalOf(p)) ? originalOf(p) : p);
/** Futó felvétel fájlja nem vágható és nem állítható vissza (az FFmpeg még ír bele). */
const isRecording = (p) => {
  const abs = path.resolve(p);
  return [...recordings.values()].some((r) => path.resolve(r.file) === abs);
};
function assertNotRecording(p) {
  if (isRecording(p)) throw new Error(_t('A felvétel még fut – a vágás a leállítása után lehetséges.'));
}

/** Egy FFmpeg-futtatás (kimenet nélkül); onLine(sor) a hibakimenet minden sorára. Hibánál az utolsó üzenetsorral. */
function ffRun(args, { onLine, onSpawn } = {}) {
  return new Promise((resolve, reject) => {
    const proc = spawn(FF, args, { stdio: ['ignore', 'ignore', 'pipe'], windowsHide: true });
    onSpawn?.(proc);
    let err = '';
    let buf = '';
    proc.stderr.on('data', (b) => {
      const s = String(b);
      err = (err + s).slice(-4000); // (a vége kell: ott az oka)
      if (!onLine) return;
      buf += s;
      const lines = buf.split(/\r?\n|\r/);
      buf = lines.pop();
      lines.forEach(onLine);
    });
    proc.on('error', reject);
    proc.on('close', (code, sig) => {
      if (buf && onLine) onLine(buf);
      if (sig) return reject(new Error(`FFmpeg: ${sig}`)); // (leállítva, vagy összeomlott)
      const last = err.trim().split(/\r?\n/).filter((l) => !/^\s*(frame|size)=/.test(l)).pop();
      code ? reject(new Error(last || _t('kilépési kód: {code}', { code }))) : resolve();
    });
  });
}

/**
 * A kulcskockák ideje (mp, a fájl kezdetéhez képest) – csak ezeket bontja ki, ezért gyors. Hang nélküli
 * vagy kép nélküli (rádió) fájlnál üres.
 */
async function keyframes(file) {
  const out = [];
  let start = NaN;
  await ffRun(['-hide_banner', '-nostdin', '-nostats', '-copyts', '-skip_frame:v', 'nokey', '-i', file, '-map', '0:v:0?', '-vf', 'showinfo', '-f', 'null', '-'], {
    onLine: (l) => {
      if (Number.isNaN(start)) {
        const m = /Duration:.*?, start: (-?[\d.]+)/.exec(l);
        if (m) start = +m[1];
      }
      const t = /\bpts_time:(-?[\d.]+)/.exec(l);
      if (t) out.push(+t[1]);
    },
  });
  const s0 = Number.isFinite(start) ? start : 0;
  return out.map((t) => t - s0).sort((a, b) => a - b);
}

/** A megtartandó szakaszok: [start, end] a kivágott részek (cuts) nélkül, rendezve, összevonva. */
function keepRanges(start, end, cuts = []) {
  const cs = (Array.isArray(cuts) ? cuts : [])
    .map((c) => [Math.max(start, +c?.start || 0), Math.min(end, +c?.end || 0)])
    .filter(([a, b]) => b - a > 0.2)
    .sort((x, y) => x[0] - y[0]);
  const merged = [];
  for (const c of cs) {
    const last = merged[merged.length - 1];
    if (last && c[0] <= last[1] + 0.2) last[1] = Math.max(last[1], c[1]);
    else merged.push(c);
  }
  const keep = [];
  let at = start;
  for (const [a, b] of merged) {
    if (a - at > 0.5) keep.push([at, a]);
    at = Math.max(at, b);
  }
  if (end - at > 0.5) keep.push([at, end]);
  return { keep, cuts: merged };
}

/**
 * Vágás start és end (mp, a forrás idejében) között, újrakódolás nélkül; a cuts ([{ start, end }], pl. reklámok)
 * részek kimaradnak. → { ok, size, length }
 * (A kezdet a legközelebbi előző kulcskockára esik – a kép így hibátlan marad. A kivágott részek után a kép csak
 * kulcskockától indulhat: ott a folytatás a vége utáni első kulcskockára kerül, így a reklámból nem marad benne.)
 */
async function recTrim(p, start, end, cuts = []) {
  if (!FF) throw new Error(_t('Az FFmpeg nem érhető el.'));
  start = Math.max(0, +start || 0);
  end = +end || 0;
  if (!(end > start + 1)) throw new Error(_t('A vége legyen a kezdet után.'));
  const { keep } = keepRanges(start, end, cuts);
  if (!keep.length) throw new Error(_t('A kivágások után nem marad semmi a felvételből.'));
  assertNotRecording(p);
  const orig = originalOf(p);
  await fs.promises.mkdir(path.dirname(orig), { recursive: true });
  if (!fs.existsSync(orig)) await fs.promises.rename(p, orig); // első vágás: az eredeti félretéve
  // (a rádiófelvétel MP3 / AAC marad; minden más MPEG-TS)
  const ext = (/\.(mp3|aac)$/i.exec(p)?.[1] || 'ts').toLowerCase();
  const fmt = { mp3: 'mp3', aac: 'adts', ts: 'mpegts' }[ext];
  const tmp = p.replace(/\.[^.]+$/, '') + '.vagas.tmp.' + ext;
  // a részek az eredeti mellett, a rejtett mappában (a felvételek listájában nem látszanak)
  const partBase = path.join(path.dirname(orig), path.basename(p).replace(/\.[^.]+$/, ''));
  const parts = [];
  const list = partBase + '.lista.tmp.txt';
  const cut = (ss, len, out) => ['-hide_banner', '-nostdin', '-loglevel', 'error', '-y', '-ss', ss.toFixed(3), '-i', orig, '-t', len.toFixed(3), '-map', '0', '-c', 'copy', '-avoid_negative_ts', 'make_zero', '-f', fmt, out];
  let length = 0;
  await (async () => {
    if (keep.length === 1) {
      length = keep[0][1] - keep[0][0];
      return ffRun(cut(keep[0][0], length, tmp));
    }
    const kf = ext === 'ts' ? await keyframes(orig) : [];
    for (let i = 0; i < keep.length; i++) {
      let [a, b] = keep[i];
      if (i > 0 && kf.length) {
        // (másolásnál a kép az első kulcskockánál indul, ami a megadott pont után jön – a hang is onnan)
        const k = kf.find((t) => t >= a - 0.05);
        if (k == null || k > b - 0.5) continue; // (a szakaszban nincs kulcskocka: kimarad)
        a = Math.max(0, k - 0.02);
      }
      const out = `${partBase}.resz${parts.length}.tmp.${ext}`;
      parts.push(out);
      await ffRun(cut(a, b - a, out));
      length += b - a;
    }
    const q = (f) => `file '${f.replace(/\\/g, '/').replace(/'/g, "'\\''")}'`;
    await fs.promises.writeFile(list, 'ffconcat version 1.0\n' + parts.map(q).join('\n') + '\n');
    await ffRun(['-hide_banner', '-nostdin', '-loglevel', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', list, '-map', '0', '-c', 'copy', '-f', fmt, tmp]);
  })()
    .finally(() => Promise.all([list, ...parts].map((f) => fs.promises.rm(f, { force: true }).catch(() => {}))))
    .catch(async (e) => {
      await fs.promises.rm(tmp, { force: true });
      // ha még nem volt vágott változat, az eredeti visszakerül a helyére (ha ez sem sikerül, azt jelezzük)
      if (!fs.existsSync(p)) {
        try {
          await fs.promises.rename(orig, p);
        } catch (e2) {
          throw new Error(`${e.message} – az eredeti a(z) ${orig} helyen maradt (${e2.message})`);
        }
      }
      throw e;
    });
  // a rename felülírja a régi vágott változatot (nincs fájl nélküli pillanat). (H33) Ha maga a csere bukik el: az
  // ideiglenes fájl törlődik, első vágásnál az eredeti visszakerül a helyére (különben eltűnne a listából); korábban
  // vágott felvételnél a régi vágott változat érintetlen marad
  try {
    await fs.promises.rename(tmp, p);
  } catch (e) {
    await fs.promises.rm(tmp, { force: true }).catch(() => {});
    if (!fs.existsSync(p)) {
      try {
        await fs.promises.rename(orig, p);
      } catch (e2) {
        throw new Error(`${e.message} – az eredeti a(z) ${orig} helyen maradt (${e2.message})`);
      }
    }
    throw e;
  }
  forgetFile(p);
  return { ok: true, size: (await fs.promises.stat(p)).size, length };
}

/** Az eredeti visszaállítása (a vágás elvetése). */
async function recRestore(p) {
  const orig = originalOf(p);
  if (!fs.existsSync(orig)) return false;
  assertNotRecording(p);
  await fs.promises.rename(orig, p);
  forgetFile(p);
  return true;
}

// Reklámhatárok keresése: a tévéreklámok közé (és a műsor és a reklámblokk közé) szinte mindig rövid csend és
// fekete kép kerül. Először a hangot elemezzük végig (gyors), aztán csak a csendek környékén a képet: volt-e ott
// fekete. Ez csak javaslat – a felület jelöltként mutatja, a kivágást a felhasználó dönti el.
const detecting = new Map(); // fájl -> { proc, stopped }
/** → { duration, video, silences: [[kezdet, vég]], blacks: [[kezdet, vég]] } (mp, a fájl kezdetéhez képest) */
async function recDetect(p, onProgress) {
  if (!FF) throw new Error(_t('Az FFmpeg nem érhető el.'));
  const file = recSource(p);
  recDetectStop(p);
  const job = { proc: null, stopped: false };
  detecting.set(p, job);
  const onSpawn = (proc) => (job.proc = proc);
  const check = () => {
    if (job.stopped) throw new Error(_t('megszakítva'));
  };
  try {
    let info = '';
    let probeErr = null;
    // (üres kimenettel: kimenet nélkül egyes – pl. CI-beli Linuxos – FFmpeg-ek összeomlanak; a hibaüzenet csak akkor
    // kell, ha nincs adatfolyam)
    await ffRun(['-hide_banner', '-nostdin', '-i', file, '-t', '0', '-f', 'null', '-'], { onSpawn, onLine: (l) => (info += l + '\n') }).catch((e) => (probeErr = e));
    check();
    const pi = parseInfo(info);
    const base = +(/Duration:.*?, start: (-?[\d.]+)/.exec(info) || [])[1] || 0;
    if (!pi.audio.length && !pi.video.length) {
      const why = (/(Invalid data found[^\r\n]*|No such file[^\r\n]*|Permission denied[^\r\n]*)/.exec(info) || [])[1] || probeErr?.message || info.trim().split(/\r?\n/).pop();
      throw new Error(`${_t('a fájl nem elemezhető')}${why ? ` (${why})` : ''}`);
    }
    const silences = [];
    const blacks = [];
    let lastPct = -1;
    const progress = (pct) => onProgress && (pct = Math.min(99, Math.floor(pct))) !== lastPct && onProgress((lastPct = pct));
    const timeOf = (l) => {
      const m = /time=(\d+):(\d+):(\d+(?:\.\d+)?)/.exec(l);
      return m ? +m[1] * 3600 + +m[2] * 60 + +m[3] : NaN;
    };
    if (pi.audio.length) {
      // 1. a hang végig: csendek
      let sStart = null;
      const share = pi.video.length ? 70 : 100;
      await ffRun(['-hide_banner', '-nostdin', '-stats', '-vn', '-sn', '-dn', '-i', file, '-map', '0:a:0', '-af', 'silencedetect=n=-45dB:d=0.25', '-f', 'null', '-'], {
        onSpawn,
        onLine: (l) => {
          let m;
          if ((m = /silence_start: (-?[\d.]+)/.exec(l))) sStart = Math.max(0, +m[1]);
          else if ((m = /silence_end: (-?[\d.]+)/.exec(l)) && sStart != null) silences.push([sStart, +m[1]]), (sStart = null);
          else if (pi.duration) {
            const t = timeOf(l);
            if (t >= 0) progress((t / pi.duration) * share);
          }
        },
      });
      check();
      if (sStart != null && pi.duration) silences.push([sStart, pi.duration]);
      // 2. a kép csak a csendek körül (néhány másodperc bontás csendenként): volt-e fekete. (Az MPEG-TS-ben a
      // tekerés pontatlan – akár egy másodperccel később is érkezhet –, ezért bővebb az ablak; az idők a kimenet
      // kezdetéhez (a fájl start-értékéhez) képest jönnek.)
      if (pi.video.length) {
        const list = silences.slice(0, 600);
        for (let i = 0; i < list.length; i++) {
          const [s, e] = list[i];
          const from = Math.max(0, s - 5);
          let black = null;
          await ffRun(['-hide_banner', '-nostdin', '-ss', from.toFixed(3), '-i', file, '-t', (Math.min(10, e - s) + 7.6).toFixed(3), '-map', '0:v:0', '-an', '-sn', '-vf', 'scale=64:-2,blackdetect=d=0:pix_th=0.12', '-f', 'null', '-'], {
            onSpawn,
            onLine: (l) => {
              const m = /black_start:(-?[\d.]+) black_end:(-?[\d.]+)/.exec(l);
              if (m && !black) black = [from + Math.max(0, +m[1] - base), from + Math.max(0, +m[2] - base)];
            },
          }).catch((err) => {
            check();
            throw err;
          });
          check();
          if (black) blacks.push(black);
          progress(70 + ((i + 1) / list.length) * 30);
        }
      }
    } else {
      // (hang nélküli felvétel: csak a kulcskockák feketesége – durva, de gyors)
      await ffRun(['-hide_banner', '-nostdin', '-stats', '-skip_frame:v', 'nokey', '-i', file, '-map', '0:v:0', '-vf', 'scale=64:-2,blackdetect=d=0:pix_th=0.12', '-f', 'null', '-'], {
        onSpawn,
        onLine: (l) => {
          const m = /black_start:(-?[\d.]+) black_end:(-?[\d.]+)/.exec(l);
          if (m) return blacks.push([Math.max(0, +m[1]), +m[2]]);
          const t = timeOf(l);
          if (t >= 0 && pi.duration) progress((t / pi.duration) * 100);
        },
      });
      check();
      // (a fekete részek számítanak határnak)
      silences.push(...blacks);
    }
    return { duration: pi.duration, video: pi.video.length > 0, silences, blacks };
  } catch (err) {
    if (job.stopped) throw new Error(_t('megszakítva'));
    throw err;
  } finally {
    if (detecting.get(p) === job) detecting.delete(p);
  }
}
function recDetectStop(p) {
  const job = detecting.get(p);
  if (!job) return false;
  detecting.delete(p);
  job.stopped = true;
  try {
    job.proc?.kill();
  } catch {}
  return true;
}

module.exports = {
  init, available: () => !!FF, status, probe, start, stop, stopAll, cover, parseInfo,
  recStart, recStop, recList, recTrim, recRestore, recDetect, recDetectStop, keepRanges, recSource, originalOf, isRecording, recStopAll: () => [...recordings.keys()].forEach(recStop),
};
