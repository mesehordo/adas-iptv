'use strict';
// Frissítés-ellenőrzés az asztali változathoz.
// Forrás: GitHub-tároló („tulajdonos/tároló” – a legutóbbi kiadás) vagy egy JSON-cím:
//   { "version": "1.9.0", "notes": "…", "url": "https://…/Adás Setup 1.9.0.exe",
//     "assets": { "win": "…", "mac": "…", "linux": "…" }, "page": "https://…" }

const { app, shell, net } = require('electron');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const UA = 'Adas-Updater';

function cmpVersion(a, b) {
  const pa = String(a).replace(/^v/i, '').split(/[.-]/).map((x) => parseInt(x, 10) || 0);
  const pb = String(b).replace(/^v/i, '').split(/[.-]/).map((x) => parseInt(x, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] || 0) - (pb[i] || 0);
    if (d) return d;
  }
  return 0;
}

const isPortable = () => !!process.env.PORTABLE_EXECUTABLE_FILE;
// MSI-vel telepítve: a telepítési mappában nincs az NSIS-telepítő eltávolítója („Uninstall Adás.exe”)
let msiCache = null;
function isMsi() {
  if (process.platform !== 'win32' || isPortable() || !app.isPackaged) return false;
  if (msiCache === null) {
    try {
      msiCache = !fs.readdirSync(path.dirname(process.execPath)).some((n) => /^uninstall .*\.exe$/i.test(n));
    } catch {
      msiCache = false;
    }
  }
  return msiCache;
}

// Processzor-architektúra a fájlnévben (pl. „…-arm64.dmg”, „…_amd64.deb”, „…-x86_64.AppImage”)
const ARCH_RX = { arm64: /arm64|aarch64/, x64: /x64|x86_64|amd64/ };
function archOk(l) {
  const mine = process.arch === 'arm64' ? 'arm64' : 'x64';
  const other = mine === 'arm64' ? 'x64' : 'arm64';
  if (ARCH_RX[mine].test(l)) return 2; // kifejezetten erre a gépre
  if (/universal/.test(l)) return 2;
  return ARCH_RX[other].test(l) ? 0 : 1; // jelölés nélkül: valószínűleg x64 / mindegy
}
const best = (list, test) => list.filter((a) => test(a.l) && archOk(a.l)).sort((a, b) => archOk(b.l) - archOk(a.l))[0] || null;

function pickAsset(names) {
  const list = names.map((n) => ({ ...n, l: n.name.toLowerCase() }));
  if (process.platform === 'win32') {
    // (a kiadás fájlnevei: Adas-Setup-X.exe, Adas-X-portable.exe, Adas-X.msi)
    if (isPortable()) return list.find((a) => a.l.endsWith('.exe') && !a.l.includes('setup')) || null;
    if (isMsi()) return list.find((a) => a.l.endsWith('.msi')) || null;
    return list.find((a) => a.l.endsWith('.exe') && a.l.includes('setup')) || list.find((a) => a.l.endsWith('.exe')) || null;
  }
  if (process.platform === 'darwin') return best(list, (l) => l.endsWith('.dmg')) || best(list, (l) => l.endsWith('.zip') && /mac|darwin/.test(l));
  // Linux: AppImage-ből futva AppImage, telepítve (deb) inkább deb
  const appImage = best(list, (l) => l.endsWith('.appimage'));
  const deb = best(list, (l) => l.endsWith('.deb'));
  return process.env.APPIMAGE ? appImage || deb : deb || appImage;
}

async function getJson(url) {
  const res = await net.fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/json' } });
  if (res.status === 404) throw new Error('A megadott forrásban nincs kiadás.');
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

/** → { current, latest, newer, notes, page, asset: { name, url, size } | null } */
async function check(source) {
  source = String(source || '').trim();
  if (!source) throw new Error('Nincs beállítva frissítési forrás.');
  const current = app.getVersion();
  let latest;
  let notes = '';
  let page = '';
  let asset = null;
  const gh = source.match(/^(?:https?:\/\/github\.com\/)?([\w.-]+)\/([\w.-]+?)(?:\.git)?\/?$/i);
  if (gh && !/^https?:\/\/(?!github\.com)/i.test(source)) {
    const rel = await getJson(`https://api.github.com/repos/${gh[1]}/${gh[2]}/releases/latest`);
    latest = rel.tag_name;
    notes = rel.body || '';
    page = rel.html_url;
    const a = pickAsset((rel.assets || []).map((x) => ({ name: x.name, url: x.browser_download_url, size: x.size })));
    if (a) asset = { name: a.name, url: a.url, size: a.size };
  } else if (/^https?:\/\//i.test(source)) {
    const j = await getJson(source);
    latest = j.version;
    notes = j.notes || '';
    page = j.page || '';
    const key = process.platform === 'win32' ? 'win' : process.platform === 'darwin' ? 'mac' : 'linux';
    const url = j.assets?.[key] || j.url;
    if (url) asset = { name: decodeURIComponent(url.split('/').pop().split('?')[0]), url, size: 0 };
  } else {
    throw new Error('A forrás „tulajdonos/tároló” (GitHub) vagy egy https:// cím lehet.');
  }
  if (!latest) throw new Error('A forrás nem adott meg verziószámot.');
  return { current, latest: String(latest).replace(/^v/i, ''), newer: cmpVersion(latest, current) > 0, notes, page, asset, portable: isPortable() };
}

let downloading = null;

/** Letöltés az ideiglenes mappába; onProgress(0..1). */
async function download(asset, onProgress) {
  if (downloading) throw new Error('Már folyamatban van egy letöltés.');
  const dir = path.join(app.getPath('temp'), 'adas-update');
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, asset.name.replace(/[\\/:*?"<>|]/g, '_'));
  downloading = true;
  try {
    const res = await net.fetch(asset.url, { headers: { 'User-Agent': UA } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const total = Number(res.headers.get('content-length')) || asset.size || 0;
    const out = fs.createWriteStream(file);
    const reader = res.body.getReader();
    let got = 0;
    let last = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      got += value.length;
      if (!out.write(Buffer.from(value))) await new Promise((r) => out.once('drain', r));
      if (total && Date.now() - last > 250) {
        last = Date.now();
        onProgress(got / total);
      }
    }
    await new Promise((r, j) => out.end((e) => (e ? j(e) : r())));
    onProgress(1);
    return file;
  } finally {
    downloading = null;
  }
}

/** A letöltött telepítő indítása, majd kilépés (Windows); máshol megnyitja a fájlt. */
async function install(file) {
  // MSI: a Windows Installer frissíti a meglévő telepítést (azonos UpgradeCode), az Adás közben bezárul
  if (process.platform === 'win32' && /\.msi$/i.test(file)) {
    spawn('msiexec', ['/i', file], { detached: true, stdio: 'ignore' }).unref();
    setTimeout(() => app.quit(), 400);
    return 'started';
  }
  if (process.platform === 'win32' && /setup/i.test(path.basename(file))) {
    spawn(file, [], { detached: true, stdio: 'ignore' }).unref();
    setTimeout(() => app.quit(), 400);
    return 'started';
  }
  if (process.platform === 'linux' && file.toLowerCase().endsWith('.appimage')) {
    fs.chmodSync(file, 0o755);
    // AppImage-ből futva: a régi fájl helyére tesszük, és az új változattal újraindulunk.
    const cur = process.env.APPIMAGE;
    if (cur) {
      try {
        const tmp = cur + '.uj';
        fs.copyFileSync(file, tmp);
        fs.chmodSync(tmp, 0o755);
        fs.renameSync(tmp, cur);
        app.relaunch({ execPath: cur, args: process.argv.slice(1).filter((a) => a !== '--hidden') });
        setTimeout(() => app.quit(), 300);
        return 'started';
      } catch {
        // pl. írásvédett helyen van – marad a kézi csere
      }
    }
  }
  if (isPortable() || process.platform !== 'win32') {
    shell.showItemInFolder(file);
    return 'shown';
  }
  await shell.openPath(file);
  return 'opened';
}

module.exports = { check, download, install, cmpVersion };
