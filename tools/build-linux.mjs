// Linux-csomagok (AppImage és .deb) készítése Windowson is, helyes Unix-jogosultságokkal.
// Az electron-builder Windowson az AppImage-hez symlink-jogot, a .deb-hez Linux-eszközöket (fpm)
// igényelne. Ez a szkript a már előkészített `dist/linux-unpacked` mappából (electron-builder
// --linux dir) dolgozik; az AppImage-hez a tar2sqfs és az AppImage-futtatórész kell
// (node tools/fetch-linux-tools.mjs).
//
//   node tools/build-linux.mjs
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const VERSION = pkg.version;
const PRODUCT = pkg.productName; // Adás
const BIN = pkg.name; // adas
const src = path.join(root, 'dist', 'linux-unpacked');
const out = path.join(root, 'dist');
if (!fs.existsSync(path.join(src, BIN))) {
  console.error(`Hiányzik: ${src}. Előbb: npx electron-builder --linux dir`);
  process.exit(1);
}
const MTIME = Math.floor(Date.now() / 1000);

// ---------------------------------------------------------------------------
// tar (ustar + PAX hosszú nevekhez)
// ---------------------------------------------------------------------------
function header(name, { size = 0, mode = 0o644, type = '0', link = '' }) {
  const h = Buffer.alloc(512);
  const put = (str, off, len) => Buffer.from(str, 'utf8').copy(h, off, 0, len);
  const field = (n, off, len) => Buffer.from(n.toString(8).padStart(len - 1, '0') + '\0').copy(h, off);
  let nm = Buffer.from(name, 'utf8');
  let prefix = Buffer.alloc(0);
  if (nm.length > 100) {
    // a / mentén kettévágjuk (prefix ≤ 155, név ≤ 100)
    const s = name;
    let cut = -1;
    for (let i = s.length - 1; i > 0; i--) {
      if (s[i] !== '/') continue;
      if (Buffer.byteLength(s.slice(i + 1)) <= 100 && Buffer.byteLength(s.slice(0, i)) <= 155) {
        cut = i;
        break;
      }
    }
    if (cut < 0) throw new Error('Túl hosszú útvonal a tar-ban: ' + name);
    prefix = Buffer.from(name.slice(0, cut));
    nm = Buffer.from(name.slice(cut + 1));
  }
  nm.copy(h, 0);
  field(mode & 0o7777, 100, 8);
  field(0, 108, 8);
  field(0, 116, 8);
  field(size, 124, 12);
  field(MTIME, 136, 12);
  h.fill(' ', 148, 156);
  put(type, 156, 1);
  put(link, 157, 100);
  put('ustar\0', 257, 6);
  put('00', 263, 2);
  put('root', 265, 32);
  put('root', 297, 32);
  prefix.copy(h, 345);
  let sum = 0;
  for (const b of h) sum += b;
  Buffer.from(sum.toString(8).padStart(6, '0') + '\0 ').copy(h, 148);
  return h;
}

function pad(n) {
  return Buffer.alloc((512 - (n % 512)) % 512);
}

class Tar {
  constructor() {
    this.parts = [];
  }
  entry(name, opts, data) {
    this.parts.push(header(name, { ...opts, size: data ? data.length : 0 }));
    if (data) this.parts.push(data, pad(data.length));
  }
  dir(name) {
    this.entry(name.endsWith('/') ? name : name + '/', { type: '5', mode: 0o755 });
  }
  file(name, data, mode = 0o644) {
    this.entry(name, { type: '0', mode }, data);
  }
  symlink(name, target) {
    this.entry(name, { type: '2', mode: 0o777, link: target });
  }
  buffer() {
    return Buffer.concat([...this.parts, Buffer.alloc(1024)]);
  }
}

const EXEC = new Set([BIN, 'chrome-sandbox', 'chrome_crashpad_handler']);
const modeOf = (rel) => (EXEC.has(rel) || rel === 'resources/ffmpeg/ffmpeg' || /\.so(\.\d+)*$/.test(rel) ? 0o755 : 0o644);

/** A linux-unpacked mappa felvétele a tar-ba `prefix` alá. */
function addTree(tar, prefix) {
  const walk = (dir, rel) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const r = rel ? rel + '/' + e.name : e.name;
      const p = path.join(dir, e.name);
      if (e.isDirectory()) {
        tar.dir(prefix + r);
        walk(p, r);
      } else tar.file(prefix + r, fs.readFileSync(p), modeOf(r));
    }
  };
  walk(src, '');
}

function dirSize(dir) {
  let n = 0;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    n += e.isDirectory() ? dirSize(p) : fs.statSync(p).size;
  }
  return n;
}

const desktop = (exec) =>
  [
    '[Desktop Entry]',
    `Name=${PRODUCT}`,
    'Comment=Élő TV lejátszó',
    `Exec=${exec} %U`,
    'Terminal=false',
    'Type=Application',
    `Icon=${BIN}`,
    `StartupWMClass=${PRODUCT}`,
    'Categories=AudioVideo;Video;Player;TV;',
    'Keywords=tv;iptv;élő;televízió;műsor;',
    '',
  ].join('\n');
const icon = fs.readFileSync(path.join(root, 'assets', 'icon.png'));

// ---------------------------------------------------------------------------
// AppImage – egyetlen futtatható fájl: az AppImage hivatalos type2-futtatórésze + squashfs-kép.
// A képet a squashfs-tools-ng tar2sqfs eszköze készíti a (helyes jogú, symlinkes) tar-ból, így
// Windowson sem kell symlink-jog. Eszközök: .linux-tools (tools/fetch-linux-tools.mjs).
// ---------------------------------------------------------------------------
{
  const tools = path.join(root, '.linux-tools');
  const tar2sqfs = [path.join(tools, 'sqfs', 'squashfs-tools-ng-1.3.2-mingw64', 'bin', 'tar2sqfs.exe'), '/usr/bin/tar2sqfs'].find((p) => fs.existsSync(p));
  const runtime = path.join(tools, 'runtime-x86_64');
  if (!tar2sqfs || !fs.existsSync(runtime)) {
    console.warn('AppImage kimarad: hiányzik a tar2sqfs vagy az AppImage-futtatórész (.linux-tools).');
  } else {
    const tar = new Tar();
    // AppRun: a homokozó (SUID-segéd) AppImage-ből nem működik, ezért --no-sandbox
    tar.file(
      'AppRun',
      Buffer.from(['#!/bin/sh', 'HERE="$(dirname "$(readlink -f "$0")")"', `exec "$HERE/${BIN}" --no-sandbox "$@"`, ''].join('\n')),
      0o755
    );
    tar.file(`${BIN}.desktop`, Buffer.from(desktop(BIN) + 'X-AppImage-Version=' + VERSION + '\n'));
    tar.file(`${BIN}.png`, icon);
    tar.symlink('.DirIcon', `${BIN}.png`);
    addTree(tar, '');
    const sqfs = path.join(out, `${BIN}-appimage.sqfs`);
    const r = spawnSync(tar2sqfs, ['-f', '-q', '-s', '-c', 'gzip', '-b', '131072', sqfs], { input: tar.buffer(), maxBuffer: 1 << 30 });
    if (r.status !== 0) throw new Error('tar2sqfs: ' + (r.stderr || r.error));
    const file = path.join(out, `Adas-${VERSION}-x86_64.AppImage`);
    fs.writeFileSync(file, Buffer.concat([fs.readFileSync(runtime), fs.readFileSync(sqfs)]));
    fs.rmSync(sqfs, { force: true });
    console.log('Kész:', path.relative(root, file), (fs.statSync(file).size / 1e6).toFixed(1), 'MB');
  }
}

// ---------------------------------------------------------------------------
// .deb – /opt/Adás alá, menübejegyzéssel, ikonnal, /usr/bin/adas paranccsal
// ---------------------------------------------------------------------------
{
  const optDir = `opt/${PRODUCT}`;
  const data = new Tar();
  for (const d of ['./', './opt/', `./${optDir}/`, './usr/', './usr/bin/', './usr/share/', './usr/share/applications/', './usr/share/icons/', './usr/share/icons/hicolor/', './usr/share/icons/hicolor/512x512/', './usr/share/icons/hicolor/512x512/apps/'])
    data.dir(d);
  addTree(data, `./${optDir}/`);
  data.file(`./usr/share/applications/${BIN}.desktop`, Buffer.from(desktop(`"/${optDir}/${BIN}"`)));
  data.file(`./usr/share/icons/hicolor/512x512/apps/${BIN}.png`, icon);
  data.symlink(`./usr/bin/${BIN}`, `/${optDir}/${BIN}`);

  const installedKB = Math.ceil((dirSize(src) + icon.length) / 1024);
  const control = [
    `Package: ${BIN}`,
    `Version: ${VERSION}`,
    'Section: video',
    'Priority: optional',
    'Architecture: amd64',
    `Maintainer: ${pkg.build?.linux?.maintainer || 'Adás'}`,
    `Installed-Size: ${installedKB}`,
    'Depends: libgtk-3-0 | libgtk-3-0t64, libnotify4, libnss3, libxss1, libxtst6, xdg-utils, libatspi2.0-0 | libatspi2.0-0t64, libuuid1, libsecret-1-0, libgbm1, libasound2 | libasound2t64',
    'Recommends: libappindicator3-1 | libayatana-appindicator3-1',
    `Description: ${pkg.build?.linux?.synopsis || 'Élő TV lejátszó'}`,
    ` ${pkg.description}`,
    '',
  ].join('\n');
  // A Chromium homokozójának SUID-segédprogram kell (különben pl. Ubuntu 24.04-en nem indul).
  const postinst = [
    '#!/bin/sh',
    'set -e',
    `chmod 4755 '/${optDir}/chrome-sandbox' || true`,
    'command -v update-desktop-database >/dev/null && update-desktop-database -q || true',
    'command -v gtk-update-icon-cache >/dev/null && gtk-update-icon-cache -q -t -f /usr/share/icons/hicolor || true',
    '',
  ].join('\n');
  const postrm = ['#!/bin/sh', 'set -e', 'command -v update-desktop-database >/dev/null && update-desktop-database -q || true', ''].join('\n');
  const ctl = new Tar();
  ctl.dir('./');
  ctl.file('./control', Buffer.from(control));
  ctl.file('./postinst', Buffer.from(postinst), 0o755);
  ctl.file('./postrm', Buffer.from(postrm), 0o755);

  // ar archívum: debian-binary, control.tar.gz, data.tar.gz
  const arEntry = (name, buf) => {
    const h = Buffer.alloc(60, ' ');
    h.write(name, 0);
    h.write(String(MTIME), 16);
    h.write('0', 28);
    h.write('0', 34);
    h.write('100644', 40);
    h.write(String(buf.length), 48);
    h.write('`\n', 58);
    return Buffer.concat([h, buf, buf.length % 2 ? Buffer.from('\n') : Buffer.alloc(0)]);
  };
  const deb = Buffer.concat([
    Buffer.from('!<arch>\n'),
    arEntry('debian-binary', Buffer.from('2.0\n')),
    arEntry('control.tar.gz', zlib.gzipSync(ctl.buffer(), { level: 9 })),
    arEntry('data.tar.gz', zlib.gzipSync(data.buffer(), { level: 6 })),
  ]);
  const file = path.join(out, `${BIN}_${VERSION}_amd64.deb`);
  fs.writeFileSync(file, deb);
  console.log('Kész:', path.relative(root, file), (deb.length / 1e6).toFixed(1), 'MB');
}
