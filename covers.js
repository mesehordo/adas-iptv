'use strict';
// Tartós borítótár (asztali változat): a VOD-borítóképek a felhasználói adatmappa „covers” almappájába
// kerülnek, és legközelebb onnan töltődnek – a böngészőmotor gyorsítótárától függetlenül (az korlátos
// méretű, és bármikor kidobhatja őket). A felület a képet így kéri: adasimg://cover/<base64url(eredeti cím)>.
//  - Ha a kép a tárban van, onnan jön (hálózat nélkül is).
//  - Ha nincs, a főfolyamat letölti, elmenti (csak valódi képet; a MAX_IMAGE-nél nagyobb válasz letöltése
//    megszakad), és átadja.
//  - Méretkorlát: ha a tár meghaladja a MAX_BYTES-ot, a legrégebben használt képek törlődnek.
// A „Gyorsítótár törlése” ezt nem üríti (külön gomb: Beállítások → VOD és médiatár).
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const SCHEME = 'adasimg';
const MAX_BYTES = 1024 * 1024 * 1024; // 1 GB
const MAX_IMAGE = 8 * 1024 * 1024; // egy kép legfeljebb 8 MB
const TOUCH_AFTER = 24 * 3600e3; // a használat idejét naponta legfeljebb egyszer írjuk (a törlési sorrendhez)
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138 Safari/537.36 Adas';

let dir = '';
let added = 0; // a legutóbbi takarítás óta mentett bájtok
let gen = 0; // ürítéskor nő: a közben futó letöltések már nem mentenek
const inflight = new Map(); // eredeti cím → folyamatban lévő letöltés (ugyanaz a kép egyszerre csak egyszer)

const fileOf = (url) => path.join(dir, crypto.createHash('sha256').update(url).digest('hex'));

/** A kép típusa a tartalom első bájtjaiból (a tárban nincs külön típusjelölés) – nem képnél null. */
function sniff(b) {
  if (b.length < 12) return null;
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'image/jpeg';
  if (b[0] === 0x89 && b.toString('latin1', 1, 4) === 'PNG') return 'image/png';
  if (b.toString('latin1', 0, 4) === 'GIF8') return 'image/gif';
  if (b.toString('latin1', 0, 4) === 'RIFF' && b.toString('latin1', 8, 12) === 'WEBP') return 'image/webp';
  if (b.toString('latin1', 4, 8) === 'ftyp' && /^(avif|avis|heic|mif1)/.test(b.toString('latin1', 8, 12))) return 'image/avif';
  if (/^\s*(<\?xml[^>]*>\s*)?<svg[\s>]/i.test(b.toString('utf8', 0, Math.min(b.length, 512)))) return 'image/svg+xml';
  return null;
}

const respond = (buf, type) =>
  new Response(buf, { status: 200, headers: { 'Content-Type': type || sniff(buf) || 'application/octet-stream', 'Access-Control-Allow-Origin': '*' } });

async function save(file, buf) {
  const tmp = `${file}.${process.pid}.tmp`;
  try {
    await fs.promises.writeFile(tmp, buf);
    await fs.promises.rename(tmp, file);
    added += buf.length;
    if (added > 64 * 1024 * 1024) trim();
  } catch {
    fs.promises.unlink(tmp).catch(() => {});
  }
}

/** A tár mérete: { files, bytes } */
async function stats() {
  let files = 0;
  let bytes = 0;
  for (const name of await fs.promises.readdir(dir).catch(() => [])) {
    if (name.endsWith('.tmp')) continue;
    const st = await fs.promises.stat(path.join(dir, name)).catch(() => null);
    if (st?.isFile()) (files++, (bytes += st.size));
  }
  return { files, bytes, max: MAX_BYTES };
}

/** A legrégebben használt képek törlése, amíg a tár a korlát 90%-a alá nem kerül. */
let trimming = null;
function trim() {
  if (trimming) return trimming;
  added = 0;
  trimming = (async () => {
    const list = [];
    let total = 0;
    for (const name of await fs.promises.readdir(dir).catch(() => [])) {
      const f = path.join(dir, name);
      const st = await fs.promises.stat(f).catch(() => null);
      if (!st?.isFile()) continue;
      // (félbemaradt mentés)
      if (name.endsWith('.tmp')) {
        if (Date.now() - st.mtimeMs > 3600e3) await fs.promises.unlink(f).catch(() => {});
        continue;
      }
      list.push({ f, size: st.size, t: st.mtimeMs });
      total += st.size;
    }
    if (total <= MAX_BYTES) return;
    list.sort((a, b) => a.t - b.t);
    for (const x of list) {
      if (total <= MAX_BYTES * 0.9) break;
      await fs.promises.unlink(x.f).catch(() => {});
      total -= x.size;
    }
  })().finally(() => (trimming = null));
  return trimming;
}

async function clear() {
  gen++;
  for (const name of await fs.promises.readdir(dir).catch(() => [])) await fs.promises.unlink(path.join(dir, name)).catch(() => {});
}

/** Egy kép kérése: a tárból, vagy letöltve (és elmentve). */
async function load(orig, net) {
  const file = fileOf(orig);
  // (egyetlen megnyitott fájlleíróval: az ellenőrzés és az olvasás ugyanarra a fájlra vonatkozik)
  const fh = await fs.promises.open(file, 'r').catch(() => null);
  if (fh) {
    try {
      const st = await fh.stat();
      const buf = st.isFile() && st.size <= MAX_IMAGE ? await fh.readFile() : null;
      if (buf && sniff(buf)) {
        if (Date.now() - st.mtimeMs > TOUCH_AFTER) await fh.utimes(new Date(), new Date()).catch(() => {});
        return respond(buf);
      }
    } catch {
    } finally {
      await fh.close().catch(() => {});
    }
  }
  const g = gen;
  const ctrl = new AbortController();
  let res;
  try {
    res = await net.fetch(orig, { headers: { 'User-Agent': UA, Accept: 'image/avif,image/webp,image/*,*/*;q=0.8' }, bypassCustomProtocolHandlers: true, signal: ctrl.signal });
  } catch {
    return new Response('', { status: 502 });
  }
  if (!res.ok) return new Response('', { status: res.status >= 400 && res.status <= 599 ? res.status : 502 });
  // a válasz olvasása méretkorláttal (egy óriási válasz ne tölthesse meg a főfolyamat memóriáját)
  if (Number(res.headers.get('content-length')) > MAX_IMAGE) {
    ctrl.abort();
    return new Response('', { status: 413 });
  }
  const parts = [];
  let size = 0;
  try {
    const reader = res.body.getReader();
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > MAX_IMAGE) {
        ctrl.abort();
        return new Response('', { status: 413 });
      }
      parts.push(Buffer.from(value));
    }
  } catch {
    return new Response('', { status: 502 });
  }
  const buf = Buffer.concat(parts);
  const type = sniff(buf);
  // (csak valódi képet mentünk – egy hibaoldal ne kerüljön a tárba; ürítés közben indult letöltés sem)
  if (type && g === gen) save(file, buf);
  return respond(buf, type || res.headers.get('content-type'));
}

/** A séma bejegyzése – az app „ready” eseménye ELŐTT kell hívni. */
function registerScheme(protocol) {
  protocol.registerSchemesAsPrivileged([{ scheme: SCHEME, privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true } }]);
}

/** A kéréskezelő telepítése (az app „ready” után). dataDir: a felhasználói adatmappa. */
function install(protocol, net, dataDir) {
  dir = path.join(dataDir, 'covers');
  fs.mkdirSync(dir, { recursive: true });
  protocol.handle(SCHEME, async (req) => {
    let orig = '';
    try {
      const u = new URL(req.url);
      orig = Buffer.from(u.pathname.replace(/^\//, ''), 'base64url').toString('utf8');
    } catch {}
    if (!/^https?:\/\/[^\s]+$/i.test(orig)) return new Response('', { status: 400 });
    if (!inflight.has(orig)) inflight.set(orig, load(orig, net).finally(() => setTimeout(() => inflight.delete(orig), 0)));
    // (mindegyik várakozó saját példányt kap a válaszból)
    const r = await inflight.get(orig);
    return r.clone();
  });
  // indulás után a háttérben: a korlát betartása (pl. a régebbi verzió által hagyott tár)
  setTimeout(() => trim().catch(() => {}), 60e3);
}

module.exports = { registerScheme, install, stats, clear, SCHEME };
