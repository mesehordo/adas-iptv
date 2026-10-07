// macOS-változat (Adás.app, x64 és arm64 .zip) készítése Windowson / Linuxon is.
// Az electron-builder Mac-csomagot csak macOS-en készít; ez a szkript a hivatalos Electron
// macOS-csomagjából rakja össze az alkalmazást (a keretrendszerek symlinkjeit és a futtatási
// jogokat megőrizve), a `dist/linux-unpacked/resources/app.asar` felhasználásával (az alkalmazás
// kódja platformfüggetlen, natív modul nincs benne).
//
//   node tools/build-mac.mjs            (előtte: npx electron-builder --linux dir)
//
// A kész alkalmazás nincs Apple-fejlesztői tanúsítvánnyal aláírva: első indítás előtt a Macen
//   xattr -cr /Applications/Adás.app && codesign --force --deep --sign - /Applications/Adás.app
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const electronVersion = require(path.join(root, 'node_modules', 'electron', 'package.json')).version;
const APP = `${pkg.productName}.app`; // Adás.app
const asarFile = path.join(root, 'dist', 'linux-unpacked', 'resources', 'app.asar');
if (!fs.existsSync(asarFile)) {
  console.error('Hiányzik az app.asar. Előbb: npx electron-builder --linux dir');
  process.exit(1);
}

// ---------------------------------------------------------------------------
// ZIP olvasás / írás (a tömörített adat érintetlenül átmásolható)
// ---------------------------------------------------------------------------
function readZip(buf) {
  let eocd = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65557); i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new Error('Hibás ZIP');
  let count = buf.readUInt16LE(eocd + 10);
  let p = buf.readUInt32LE(eocd + 16);
  // ZIP64 (nagy keretrendszer-fájlok miatt előfordulhat)
  if (p === 0xffffffff || count === 0xffff) {
    const loc = buf.readUInt32LE(eocd - 20) === 0x07064b50 ? Number(buf.readBigUInt64LE(eocd - 12)) : -1;
    if (loc < 0) throw new Error('ZIP64 könyvtár nem található');
    count = Number(buf.readBigUInt64LE(loc + 32));
    p = Number(buf.readBigUInt64LE(loc + 48));
  }
  const out = [];
  for (let n = 0; n < count; n++) {
    if (buf.readUInt32LE(p) !== 0x02014b50) throw new Error('Hibás központi könyvtár');
    const madeBy = buf.readUInt16LE(p + 4);
    const flags = buf.readUInt16LE(p + 8);
    const method = buf.readUInt16LE(p + 10);
    const crc = buf.readUInt32LE(p + 16);
    let csize = buf.readUInt32LE(p + 20);
    let usize = buf.readUInt32LE(p + 24);
    const nameLen = buf.readUInt16LE(p + 28);
    const extraLen = buf.readUInt16LE(p + 30);
    const commentLen = buf.readUInt16LE(p + 32);
    const ext = buf.readUInt32LE(p + 38);
    let local = buf.readUInt32LE(p + 42);
    const name = buf.subarray(p + 46, p + 46 + nameLen).toString(flags & 0x800 ? 'utf8' : 'latin1');
    // ZIP64 kiegészítő mező
    let e = p + 46 + nameLen;
    const eEnd = e + extraLen;
    while (e + 4 <= eEnd) {
      const id = buf.readUInt16LE(e);
      const sz = buf.readUInt16LE(e + 2);
      if (id === 1) {
        let q = e + 4;
        if (usize === 0xffffffff) (usize = Number(buf.readBigUInt64LE(q))), (q += 8);
        if (csize === 0xffffffff) (csize = Number(buf.readBigUInt64LE(q))), (q += 8);
        if (local === 0xffffffff) local = Number(buf.readBigUInt64LE(q));
      }
      e += 4 + sz;
    }
    const lName = buf.readUInt16LE(local + 26);
    const lExtra = buf.readUInt16LE(local + 28);
    const start = local + 30 + lName + lExtra;
    out.push({ name, madeBy, method, crc, csize, usize, ext, data: buf.subarray(start, start + csize) });
    p += 46 + nameLen + extraLen + commentLen;
  }
  return out;
}

const S_IFREG = 0o100000;
const S_IFDIR = 0o040000;

function writeZip(entries, file) {
  const fd = fs.openSync(file, 'w');
  let off = 0;
  const central = [];
  const write = (b) => {
    fs.writeSync(fd, b);
    off += b.length;
  };
  for (const en of entries) {
    const name = Buffer.from(en.name, 'utf8');
    const lh = Buffer.alloc(30);
    lh.writeUInt32LE(0x04034b50, 0);
    lh.writeUInt16LE(en.method === 8 ? 20 : 10, 4);
    lh.writeUInt16LE(0x800, 6); // UTF-8 nevek
    lh.writeUInt16LE(en.method, 8);
    lh.writeUInt32LE(0, 10); // idő / dátum: 1980
    lh.writeUInt32LE(en.crc >>> 0, 14);
    lh.writeUInt32LE(en.csize, 18);
    lh.writeUInt32LE(en.usize, 22);
    lh.writeUInt16LE(name.length, 26);
    lh.writeUInt16LE(0, 28);
    const at = off;
    write(lh);
    write(name);
    write(en.data);
    const ch = Buffer.alloc(46);
    ch.writeUInt32LE(0x02014b50, 0);
    ch.writeUInt16LE((3 << 8) | 20, 4); // Unix, 2.0 – a külső attribútum a Unix-mód
    ch.writeUInt16LE(en.method === 8 ? 20 : 10, 6);
    ch.writeUInt16LE(0x800, 8);
    ch.writeUInt16LE(en.method, 10);
    ch.writeUInt32LE(0, 12);
    ch.writeUInt32LE(en.crc >>> 0, 16);
    ch.writeUInt32LE(en.csize, 20);
    ch.writeUInt32LE(en.usize, 24);
    ch.writeUInt16LE(name.length, 28);
    ch.writeUInt32LE(en.ext >>> 0, 38);
    ch.writeUInt32LE(at, 42);
    central.push(ch, name);
  }
  const cdStart = off;
  for (const b of central) write(b);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(off - cdStart, 12);
  end.writeUInt32LE(cdStart, 16);
  write(end);
  fs.closeSync(fd);
  if (off > 0xffffffff) throw new Error('A ZIP túl nagy (ZIP64 kellene)');
}

function fileEntry(name, data, mode = 0o644) {
  const comp = zlib.deflateRawSync(data, { level: 9 });
  return { name, method: 8, crc: zlib.crc32(data), csize: comp.length, usize: data.length, ext: ((S_IFREG | mode) << 16) >>> 0, data: comp };
}
function inflate(en) {
  return en.method === 8 ? zlib.inflateRawSync(en.data) : Buffer.from(en.data);
}

// ---------------------------------------------------------------------------
// Ikon (.icns, PNG-tartalommal) és Info.plist
// ---------------------------------------------------------------------------
function icns(png) {
  // ic09 = 512×512 PNG (a rendszer ebből méretez); ic10 = 1024 (Retina) – ugyanaz a kép
  const chunk = (type, data) => {
    const h = Buffer.alloc(8);
    h.write(type, 0, 'ascii');
    h.writeUInt32BE(8 + data.length, 4);
    return Buffer.concat([h, data]);
  };
  const body = Buffer.concat([chunk('ic09', png), chunk('ic10', png)]);
  const h = Buffer.alloc(8);
  h.write('icns', 0, 'ascii');
  h.writeUInt32BE(8 + body.length, 4);
  return Buffer.concat([h, body]);
}

const xml = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
function setKey(plist, key, valueXml) {
  const re = new RegExp(`(<key>${key}</key>\\s*)(<string>[^<]*</string>|<dict>[\\s\\S]*?</dict>\\s*</dict>|<true/>|<false/>)`);
  if (re.test(plist)) return plist.replace(re, `$1${valueXml}`);
  return plist.replace(/<\/dict>\s*<\/plist>\s*$/, `\t<key>${key}</key>\n\t${valueXml}\n</dict>\n</plist>\n`);
}

function asarHeaderHash(file) {
  // Az Electron az asar fejlécének (JSON) SHA256-ját ellenőrzi, ha a sértetlenség-vizsgálat be van kapcsolva.
  const asar = require('@electron/asar');
  const { headerString } = asar.getRawHeader(file);
  return crypto.createHash('sha256').update(headerString).digest('hex');
}

function plistFor(src) {
  let p = src;
  const v = pkg.version;
  p = setKey(p, 'CFBundleDisplayName', `<string>${xml(pkg.productName)}</string>`);
  p = setKey(p, 'CFBundleName', `<string>${xml(pkg.productName)}</string>`);
  p = setKey(p, 'CFBundleIdentifier', `<string>${xml(pkg.build.appId)}</string>`);
  p = setKey(p, 'CFBundleShortVersionString', `<string>${v}</string>`);
  p = setKey(p, 'CFBundleVersion', `<string>${v}</string>`);
  p = setKey(p, 'LSApplicationCategoryType', `<string>${pkg.build.mac?.category || 'public.app-category.entertainment'}</string>`);
  p = setKey(
    p,
    'ElectronAsarIntegrity',
    `<dict>\n\t\t<key>Resources/app.asar</key>\n\t\t<dict>\n\t\t\t<key>algorithm</key>\n\t\t\t<string>SHA256</string>\n\t\t\t<key>hash</key>\n\t\t\t<string>${asarHeaderHash(asarFile)}</string>\n\t\t</dict>\n\t</dict>`
  );
  // Kivetítés (Chromecast / DLNA) és beállítás-átadás: a macOS 15 helyi hálózati engedélyt kér
  p = setKey(p, 'NSLocalNetworkUsageDescription', '<string>Az Adás a helyi hálózaton keresi a Chromecast- és DLNA-eszközöket, és így adja át a beállításokat a tévének.</string>');
  if (!p.includes('<key>NSBonjourServices</key>'))
    p = p.replace(/<\/dict>\s*<\/plist>\s*$/, '\t<key>NSBonjourServices</key>\n\t<array>\n\t\t<string>_googlecast._tcp</string>\n\t</array>\n</dict>\n</plist>\n');
  return p;
}

// ---------------------------------------------------------------------------
const cacheDir = path.join(process.env.LOCALAPPDATA || path.join(require('os').homedir(), '.cache'), 'electron', 'Cache');
async function electronZip(arch) {
  const { downloadArtifact } = require('@electron/get');
  return downloadArtifact({ version: electronVersion, platform: 'darwin', arch, artifactName: 'electron', cacheRoot: fs.existsSync(cacheDir) ? cacheDir : undefined });
}

const asarBuf = fs.readFileSync(asarFile);
const icon = icns(fs.readFileSync(path.join(root, 'assets', 'icon.png')));

for (const arch of ['arm64', 'x64']) {
  const zipPath = await electronZip(arch);
  const entries = readZip(fs.readFileSync(zipPath));
  const out = [];
  let plistDone = false;
  for (const en of entries) {
    if (!en.name.startsWith('Electron.app/')) continue; // LICENSE, version stb. kimarad
    const name = APP + en.name.slice('Electron.app'.length);
    if (name === `${APP}/Contents/Resources/default_app.asar`) continue;
    if (name === `${APP}/Contents/Info.plist`) {
      out.push(fileEntry(name, Buffer.from(plistFor(inflate(en).toString('utf8'))), 0o644));
      plistDone = true;
      continue;
    }
    if (name === `${APP}/Contents/Resources/electron.icns`) {
      out.push(fileEntry(name, icon, 0o644));
      continue;
    }
    // A Unix-mód (futtatható fájlok, symlinkek) a külső attribútumban marad.
    const ext = en.madeBy >> 8 === 3 ? en.ext : en.name.endsWith('/') ? ((S_IFDIR | 0o755) << 16) >>> 0 : ((S_IFREG | 0o644) << 16) >>> 0;
    out.push({ ...en, name, ext });
  }
  if (!plistDone) throw new Error('Info.plist nem található');
  out.push(fileEntry(`${APP}/Contents/Resources/app.asar`, asarBuf, 0o644));
  // Lejátszási híd: az FFmpeg az adott processzorhoz (npm run ffmpeg tölti le)
  const ffDir = path.join(root, 'vendor', 'ffmpeg', `darwin-${arch}`);
  if (fs.existsSync(path.join(ffDir, 'ffmpeg'))) {
    out.push({ name: `${APP}/Contents/Resources/ffmpeg/`, method: 0, crc: 0, csize: 0, usize: 0, ext: ((S_IFDIR | 0o755) << 16) >>> 0, data: Buffer.alloc(0) });
    out.push(fileEntry(`${APP}/Contents/Resources/ffmpeg/ffmpeg`, fs.readFileSync(path.join(ffDir, 'ffmpeg')), 0o755));
    for (const f of ['LICENSE', 'README']) if (fs.existsSync(path.join(ffDir, f))) out.push(fileEntry(`${APP}/Contents/Resources/ffmpeg/${f}`, fs.readFileSync(path.join(ffDir, f)), 0o644));
  } else console.warn(`Figyelem: nincs FFmpeg (${ffDir}) – a lejátszási híd nélkül készül. Futtasd: npm run ffmpeg`);
  const file = path.join(root, 'dist', `${pkg.productName}-${pkg.version}-mac-${arch}.zip`);
  writeZip(out, file);
  const links = out.filter((e) => ((e.ext >>> 16) & 0o170000) === 0o120000).length;
  console.log('Kész:', path.relative(root, file), (fs.statSync(file).size / 1e6).toFixed(1), 'MB', `· ${out.length} tétel, ${links} symlink`);
}
