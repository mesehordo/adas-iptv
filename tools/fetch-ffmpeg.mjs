// Az FFmpeg (lejátszási híd) letöltése minden asztali célplatformra a vendor/ffmpeg mappába:
//   vendor/ffmpeg/<platform>-<arch>/ffmpeg(.exe) + LICENSE + README
// Forrás: az ffmpeg-static csomag kiadásai (GPL-es, statikusan fordított FFmpeg-buildek).
//   node tools/fetch-ffmpeg.mjs [win32-x64 linux-x64 darwin-x64 darwin-arm64]
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const meta = require(path.join(root, 'node_modules', 'ffmpeg-static', 'package.json'))['ffmpeg-static'];
const base = `https://github.com/eugeneware/ffmpeg-static/releases/download/${meta['binary-release-tag']}`;
const targets = process.argv.slice(2).length ? process.argv.slice(2) : ['win32-x64', 'linux-x64', 'darwin-x64', 'darwin-arm64'];

async function get(url) {
  const res = await fetch(url, { redirect: 'follow' });
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

for (const t of targets) {
  const dir = path.join(root, 'vendor', 'ffmpeg', t);
  const exe = path.join(dir, t.startsWith('win32') ? 'ffmpeg.exe' : 'ffmpeg');
  fs.mkdirSync(dir, { recursive: true });
  if (fs.existsSync(exe) && fs.statSync(exe).size > 1e6) {
    console.log('Megvan:', path.relative(root, exe));
    continue;
  }
  // Windowson a fejlesztői gépen az ffmpeg-static már letöltötte – nem kell újra.
  const local = path.join(root, 'node_modules', 'ffmpeg-static', 'ffmpeg.exe');
  if (t === `${process.platform}-${process.arch}` && fs.existsSync(local)) {
    fs.copyFileSync(local, exe);
    for (const ext of ['LICENSE', 'README']) if (fs.existsSync(`${local}.${ext}`)) fs.copyFileSync(`${local}.${ext}`, path.join(dir, ext));
  } else {
    process.stdout.write(`Letöltés: ${t}… `);
    fs.writeFileSync(exe, zlib.gunzipSync(await get(`${base}/ffmpeg-${t}.gz`)));
    for (const ext of ['LICENSE', 'README']) fs.writeFileSync(path.join(dir, ext), await get(`${base}/${t}.${ext}`));
    console.log('kész');
  }
  if (!t.startsWith('win32')) fs.chmodSync(exe, 0o755);
  console.log(path.relative(root, exe), (fs.statSync(exe).size / 1e6).toFixed(1), 'MB');
}
