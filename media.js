'use strict';
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
function inputOf(url) {
  if (/^https?:/i.test(url)) {
    let k = srcKeys.get(url);
    if (!k) {
      k = crypto.randomBytes(8).toString('hex');
      srcKeys.set(url, k);
      srcUrls.set(k, url);
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
    const up = await fetch(target, { method: req.method === 'HEAD' ? 'HEAD' : 'GET', headers, redirect: 'follow', signal: ac.signal });
    const out = { 'Content-Type': up.headers.get('content-type') || 'application/octet-stream' };
    for (const k of ['content-length', 'content-range', 'accept-ranges', 'last-modified', 'etag']) {
      const v = up.headers.get(k);
      if (v) out[k] = v;
    }
    if (up.headers.get('content-encoding') && up.headers.get('content-encoding') !== 'identity') delete out['content-length'];
    // HLS-lista (élő adás felvétele): a benne lévő címek is a továbbítón át menjenek
    const looksList = /mpegurl/i.test(out['Content-Type']) || /\.m3u8?(\?|$)/i.test(new URL(up.url).pathname);
    if (looksList && up.ok && req.method !== 'HEAD') {
      const text = await up.text();
      if (text.trimStart().startsWith('#EXTM3U')) {
        const abs = (x) => {
          try {
            return new URL(x, up.url).href;
          } catch {
            return x;
          }
        };
        const body = text
          .split(/\r?\n/)
          .map((line) => {
            const l = line.trim();
            if (!l) return line;
            if (l.startsWith('#')) return line.replace(/URI="([^"]+)"/g, (_m, x) => `URI="${inputOf(abs(x))}"`);
            return inputOf(abs(l));
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
    console.warn('Továbbító – a forrás nem érhető el:', err.cause?.message || err.message || err);
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
        return resolve({ error: why || 'a fájl nem elemezhető' });
      }
      resolve(info);
    });
  }));
  probeCache.set(url, p);
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
  if (!FF) throw new Error('Az FFmpeg nem található');
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

function ensureServer() {
  if (server) return Promise.resolve();
  return new Promise((resolve, reject) => {
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
    server.on('error', reject);
    server.listen(0, '127.0.0.1', () => {
      port = server.address().port;
      resolve();
    });
  });
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
  if (!FF) return Promise.resolve({ ok: false, error: 'Az FFmpeg nem található a programmal együtt (resources/ffmpeg).' });
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
      resolve(v ? { ok: true, version: v, path: FF } : { ok: false, path: FF, error: `kilépési kód ${code}` });
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
 */
async function recStart({ url, dir, name, until }) {
  if (!FF) throw new Error('Az FFmpeg nem érhető el.');
  await ensureServer();
  fs.mkdirSync(dir, { recursive: true });
  const safe = String(name || 'felvetel').replace(/[\\/:*?"<>|\u0000-\u001f]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 120) || 'felvetel';
  let file = path.join(dir, `${safe}.ts`);
  for (let i = 2; fs.existsSync(file); i++) file = path.join(dir, `${safe} (${i}).ts`);
  const hlsOpts = /\.m3u8?(\?|$)/i.test(url) ? ['-max_reload', '1000', '-m3u8_hold_counters', '1000'] : [];
  // Újraindításkor a kimenet ideje az addig eltelt idővel folytatódik (különben az összefűzött fájlban az idő visszaugrana)
  // (élő HLS-nél újraindításkor a legfrissebb résztől folytatjuk – különben a korábbi részek ismétlődnének)
  const argsFor = (offset) => ['-hide_banner', '-nostdin', '-loglevel', 'error', ...headerArgs(url), ...hlsOpts, ...(offset > 0 && hlsOpts.length ? ['-live_start_index', '-1'] : []), '-i', inputOf(url), '-c', 'copy', ...(offset > 0 ? ['-output_ts_offset', offset.toFixed(1)] : []), '-f', 'mpegts', 'pipe:1'];
  const id = String(++recSeq);
  const out = fs.createWriteStream(file, { flags: 'a' });
  const rec = { proc: null, file, out, started: Date.now(), until: until || 0, restarts: 0, err: '' };
  recordings.set(id, rec);
  const MAX_RESTARTS = 60;
  const finish = (error) => {
    clearTimeout(rec.timer);
    clearTimeout(rec.retry);
    recordings.delete(id);
    out.end(() => {
      let size = 0;
      try {
        size = fs.statSync(file).size;
      } catch {}
      opts.emit('rec-ended', { id, file, size, restarts: rec.restarts, error });
    });
  };
  const run = () => {
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
      if (rec.stopping) return finish('');
      // Váratlan leállás (megszakadt az adás): újrapróbálás, amíg az ütemezett vég el nem jön
      const left = rec.until ? rec.until - Date.now() : Infinity;
      if (left > 5000 && rec.restarts < MAX_RESTARTS) {
        rec.restarts++;
        rec.retry = setTimeout(run, 3000);
        return;
      }
      finish(code && left > 5000 ? rec.err.trim().split('\n').pop() || `kilépési kód: ${code}` : '');
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
  if (!r.proc || r.proc.exitCode !== null) {
    // éppen újraindításra vár: nincs futó FFmpeg – a fájlt lezárjuk
    r.proc = null;
    recordings.delete(String(id));
    r.out.end(() => opts.emit('rec-ended', { id: String(id), file: r.file, size: fs.existsSync(r.file) ? fs.statSync(r.file).size : 0, restarts: r.restarts, error: '' }));
    return true;
  }
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
      .filter((f) => /\.(ts|mkv|mp4)$/i.test(f) && !f.endsWith('.vagas.tmp.ts'))
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

/**
 * Vágás start és end (mp, a forrás idejében) között, újrakódolás nélkül. → { ok, size }
 * (A kezdet a legközelebbi előző kulcskockára esik – a kép így hibátlan marad.)
 */
async function recTrim(p, start, end) {
  if (!FF) throw new Error('Az FFmpeg nem érhető el.');
  start = Math.max(0, +start || 0);
  end = +end || 0;
  if (!(end > start + 1)) throw new Error('A vége legyen a kezdet után.');
  const orig = originalOf(p);
  await fs.promises.mkdir(path.dirname(orig), { recursive: true });
  if (!fs.existsSync(orig)) await fs.promises.rename(p, orig); // első vágás: az eredeti félretéve
  const tmp = p.replace(/\.[^.]+$/, '') + '.vagas.tmp.ts';
  const args = ['-hide_banner', '-nostdin', '-loglevel', 'error', '-y', '-ss', start.toFixed(3), '-i', orig, '-t', (end - start).toFixed(3), '-map', '0', '-c', 'copy', '-avoid_negative_ts', 'make_zero', '-f', 'mpegts', tmp];
  await new Promise((resolve, reject) => {
    const proc = spawn(FF, args, { stdio: ['ignore', 'ignore', 'pipe'], windowsHide: true });
    let err = '';
    proc.stderr.on('data', (b) => err.length < 2000 && (err += b));
    proc.on('error', reject);
    proc.on('close', (code) => (code ? reject(new Error(err.trim().split('\n').pop() || `kilépési kód: ${code}`)) : resolve()));
  }).catch(async (e) => {
    await fs.promises.rm(tmp, { force: true });
    // ha még nem volt vágott változat, az eredeti visszakerül a helyére
    if (!fs.existsSync(p)) await fs.promises.rename(orig, p).catch(() => {});
    throw e;
  });
  await fs.promises.rm(p, { force: true });
  await fs.promises.rename(tmp, p);
  forgetFile(p);
  return { ok: true, size: (await fs.promises.stat(p)).size };
}

/** Az eredeti visszaállítása (a vágás elvetése). */
async function recRestore(p) {
  const orig = originalOf(p);
  if (!fs.existsSync(orig)) return false;
  await fs.promises.rm(p, { force: true });
  await fs.promises.rename(orig, p);
  forgetFile(p);
  return true;
}

module.exports = {
  init, available: () => !!FF, status, probe, start, stop, stopAll, cover, parseInfo,
  recStart, recStop, recList, recTrim, recRestore, recSource, originalOf, recStopAll: () => [...recordings.keys()].forEach(recStop),
};
