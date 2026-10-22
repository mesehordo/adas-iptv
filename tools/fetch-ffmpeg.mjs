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

// Az ffmpeg-static kiadás fájljainak SHA-256 lenyomata (a GitHub-kiadás közzétett „digest” értékei). A csomag új
// kiadásánál (binary-release-tag) ezeket is frissíteni kell – addig a letöltés hibával leáll, nem ellenőrizetlen.
const STATIC_TAG = 'b6.1.1';
const STATIC_SHA = {
  'ffmpeg-win32-x64.gz': '8883a3dffbd0a16cf4ef95206ea05283f78908dbfb118f73c83f4951dcc06d77',
  'win32-x64.LICENSE': '8ceb4b9ee5adedde47b31e975c1d90c73ad27b6b165a1dcd80c7c545eb65b903',
  'win32-x64.README': 'a636a7183c58006351acbaf35303c0ed85c6e1320fd4e80de453ba6157de6311',
  'ffmpeg-darwin-x64.gz': '929b375c1182d956c51f7ac25e0b2b0411fb01f6f407aa15c9758efeb4242106',
  'darwin-x64.LICENSE': '2e1d16c72fd74e12063776371da757322f8b77589386532f4fd8634bde7de1af',
  'darwin-x64.README': 'e88a0325f8e5b75210355e37341824f074d3cd82def2125be54c914b62848a36',
  'ffmpeg-darwin-arm64.gz': '8923876afa8db5585022d7860ec7e589af192f441c56793971276d450ed3bbfa',
  'darwin-arm64.LICENSE': 'cb48bf09a11f5fb576cddb0431c8f5ed0a60157a9ec942adffc13907cbe083f2',
  'darwin-arm64.README': '05ba4b92c96605434b1aaae3eedf5a2c280c9607bf78ffca9a5b536d9af2dc6a',
};

/** Letöltés a várt SHA-256 lenyomat ellenőrzésével (eltérésnél hiba – semmi nem íródik ki). */
async function get(url, sha256) {
  if (!/^[0-9a-f]{64}$/.test(sha256 || '')) throw new Error(`${url}: nincs rögzített SHA-256 lenyomat`);
  const res = await fetch(url, { redirect: 'follow' });
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  const got = crypto.createHash('sha256').update(buf).digest('hex');
  if (got !== sha256) throw new Error(`${url}: hibás SHA-256 (${got}, várt: ${sha256})`);
  return buf;
}
const staticFile = (name) => {
  if (meta['binary-release-tag'] !== STATIC_TAG) throw new Error(`Az ffmpeg-static kiadása (${meta['binary-release-tag']}) nem ${STATIC_TAG}: frissítsd a STATIC_SHA táblát (tools/fetch-ffmpeg.mjs).`);
  return get(`${base}/${name}`, STATIC_SHA[name]);
};

const sha256File = (file) => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');

/** BtbN-csomag: letöltés, SHA-256 ellenőrzés, a bin/ffmpeg és a LICENSE kicsomagolása (tar -xJ). */
async function fetchBtbn(t, dir, exe) {
  const { url, sha256 } = BTBN[t];
  const buf = await get(url, sha256);
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
  // (a meglévő bináris csak akkor jó, ha ugyanonnan való – pl. a régi, összeomló Linux-build újra letöltődik –, és a
  // tartalma is ép: a SOURCE a letöltéskori, ellenőrzött bináris SHA-256-ját is őrzi; a sérült vagy jelölő nélküli
  // régi fájl újra letöltődik, nem kerül így a kiadásba)
  const same = () => {
    let mark = '';
    try {
      mark = fs.readFileSync(sourceFile, 'utf8');
    } catch {
      return false;
    }
    const [src, sha] = mark.trim().split('\n');
    return src === source && /^[0-9a-f]{64}$/.test(sha || '') && sha === sha256File(exe);
  };
  // (egyetlen stat – nem létezés-ellenőrzés, majd külön olvasás)
  let size = 0;
  try {
    size = fs.statSync(exe).size;
  } catch {}
  if (size > 1e6 && same()) {
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
      fs.writeFileSync(exe, zlib.gunzipSync(await staticFile(`ffmpeg-${t}.gz`)));
      for (const ext of ['LICENSE', 'README']) fs.writeFileSync(path.join(dir, ext), await staticFile(`${t}.${ext}`));
    }
    console.log('kész');
  }
  fs.writeFileSync(sourceFile, `${source}\n${sha256File(exe)}\n`);
  if (!t.startsWith('win32')) fs.chmodSync(exe, 0o755);
  console.log(path.relative(root, exe), (fs.statSync(exe).size / 1e6).toFixed(1), 'MB');
}
