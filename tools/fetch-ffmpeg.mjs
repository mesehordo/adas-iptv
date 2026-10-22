// Az FFmpeg (lejátszási híd) letöltése minden asztali célplatformra a vendor/ffmpeg mappába:
//   vendor/ffmpeg/<platform>-<arch>/ffmpeg(.exe) + LICENSE + README (+ SOURCE: honnan való)
// Forrás: az ffmpeg-static csomag kiadásai (GPL-es, statikusan fordított FFmpeg-buildek) – Linuxon kivétel:
// az ffmpeg-static ottani buildje (johnvansickle.com) minden MPEG-TS olvasásakor SIGSEGV-vel összeomlik (H.264 /
// AAC-nál, sima másolásnál és HLS-felvételnél is – mérve az ubuntu-latest gépen, 6.0 és 7.0.2 is), ezért Linuxra a
// BtbN/FFmpeg-Builds rögzített buildje kerül. (A BtbN minden hónap utolsó buildjét két évig megtartja; frissítéskor
// új hónapvégi buildet és a hozzá tartozó SHA-256-ot kell beírni.)
//   node tools/fetch-ffmpeg.mjs [win32-x64 linux-x64 darwin-x64 darwin-arm64]
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import zlib from 'node:zlib';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const meta = require(path.join(root, 'node_modules', 'ffmpeg-static', 'package.json'))['ffmpeg-static'];
const base = `https://github.com/eugeneware/ffmpeg-static/releases/download/${meta['binary-release-tag']}`;
const targets = process.argv.slice(2).length ? process.argv.slice(2) : ['win32-x64', 'linux-x64', 'darwin-x64', 'darwin-arm64'];

const BTBN = {
  'linux-x64': {
    url: 'https://github.com/BtbN/FFmpeg-Builds/releases/download/autobuild-2026-09-30-13-08/ffmpeg-n8.1.3-9-g29e619e767-linux64-gpl-8.1.tar.xz',
    sha256: '97ce978979194b5cf7e06a5e68020dbdaa7a4f3294c5452b6a1bc347100dbb79',
  },
};

async function get(url) {
  const res = await fetch(url, { redirect: 'follow' });
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

/** BtbN-csomag: letöltés, SHA-256 ellenőrzés, a bin/ffmpeg és a LICENSE kicsomagolása (tar -xJ). */
async function fetchBtbn(t, dir, exe) {
  const { url, sha256 } = BTBN[t];
  const buf = await get(url);
  const got = crypto.createHash('sha256').update(buf).digest('hex');
  if (got !== sha256) throw new Error(`${url}: hibás SHA-256 (${got}, várt: ${sha256})`);
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'adas-ffmpeg-'));
  try {
    const tarFile = path.join(tmp, 'ffmpeg.tar.xz');
    fs.writeFileSync(tarFile, buf);
    execFileSync('tar', ['-xJf', tarFile, '-C', tmp]);
    const top = fs.readdirSync(tmp).find((n) => fs.statSync(path.join(tmp, n)).isDirectory());
    fs.copyFileSync(path.join(tmp, top, 'bin', 'ffmpeg'), exe);
    fs.copyFileSync(path.join(tmp, top, 'LICENSE.txt'), path.join(dir, 'LICENSE'));
    fs.writeFileSync(path.join(dir, 'README'), `FFmpeg ${top} – BtbN/FFmpeg-Builds (GPL)\n${url}\nForráskód: https://github.com/FFmpeg/FFmpeg, buildszkriptek: https://github.com/BtbN/FFmpeg-Builds\n`);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

for (const t of targets) {
  const dir = path.join(root, 'vendor', 'ffmpeg', t);
  const exe = path.join(dir, t.startsWith('win32') ? 'ffmpeg.exe' : 'ffmpeg');
  const source = BTBN[t]?.url || `${base}/ffmpeg-${t}.gz`;
  const sourceFile = path.join(dir, 'SOURCE');
  fs.mkdirSync(dir, { recursive: true });
  // (a meglévő bináris csak akkor jó, ha ugyanonnan való – pl. a régi, összeomló Linux-build újra letöltődik)
  const same = () => (fs.existsSync(sourceFile) ? fs.readFileSync(sourceFile, 'utf8').trim() === source : !BTBN[t]);
  if (fs.existsSync(exe) && fs.statSync(exe).size > 1e6 && same()) {
    console.log('Megvan:', path.relative(root, exe));
    continue;
  }
  // Windowson a fejlesztői gépen az ffmpeg-static már letöltötte – nem kell újra.
  const local = path.join(root, 'node_modules', 'ffmpeg-static', 'ffmpeg.exe');
  if (!BTBN[t] && t === `${process.platform}-${process.arch}` && fs.existsSync(local)) {
    fs.copyFileSync(local, exe);
    for (const ext of ['LICENSE', 'README']) if (fs.existsSync(`${local}.${ext}`)) fs.copyFileSync(`${local}.${ext}`, path.join(dir, ext));
  } else {
    process.stdout.write(`Letöltés: ${t}… `);
    if (BTBN[t]) await fetchBtbn(t, dir, exe);
    else {
      fs.writeFileSync(exe, zlib.gunzipSync(await get(`${base}/ffmpeg-${t}.gz`)));
      for (const ext of ['LICENSE', 'README']) fs.writeFileSync(path.join(dir, ext), await get(`${base}/${t}.${ext}`));
    }
    console.log('kész');
  }
  fs.writeFileSync(sourceFile, source + '\n');
  if (!t.startsWith('win32')) fs.chmodSync(exe, 0o755);
  console.log(path.relative(root, exe), (fs.statSync(exe).size / 1e6).toFixed(1), 'MB');
}
