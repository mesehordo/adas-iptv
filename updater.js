'use strict';
const { _t } = require('./i18n-main');
// Frissítés-ellenőrzés az asztali változathoz.
// Forrás: GitHub-tároló („tulajdonos/tároló” – a legutóbbi kiadás) vagy egy JSON-cím:
//   { "version": "1.9.0", "notes": "…", "url": "https://…/Adás Setup 1.9.0.exe",
//     "assets": { "win": "…", "mac": "…", "linux": "…" }, "page": "https://…",
//     "sha256": { "win": "<64 hexa jegy>", "mac": "…", "linux": "…" } }
// Csak https, és csak ellenőrző összeggel egyező fájl telepíthető (GitHubnál a kiadás SHA256SUMS.txt-je).

const { app, shell, net } = require('electron');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
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

const isHttps = (u) => /^https:\/\//i.test(String(u || ''));

async function getJson(url) {
  if (!isHttps(url)) throw new Error(_t('A frissítési forrás csak https:// cím lehet.'));
  const res = await net.fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/json' } });
  if (res.status === 404) throw new Error(_t('A megadott forrásban nincs kiadás.'));
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

/** A kiadás SHA256SUMS.txt-je → { fájlnév: sha256 } */
async function getSums(url) {
  if (!isHttps(url)) return {};
  const res = await net.fetch(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) return {};
  const out = {};
  for (const line of (await res.text()).slice(0, 200000).split(/\r?\n/)) {
    const m = /^([0-9a-f]{64})\s+\*?(.+)$/i.exec(line.trim());
    if (m) out[m[2].trim()] = m[1].toLowerCase();
  }
  return out;
}

// A legutóbb felajánlott fájl (a felülettől csak a címét fogadjuk el – az ellenőrző összeg innen jön),
// és a letöltött, ellenőrzött fájlok: csak ezek telepíthetők.
let offered = null;
const verified = new Set();

/** → { current, latest, newer, notes, page, asset: { name, url, size } | null } */
async function check(source) {
  offered = null; // egy sikertelen ellenőrzés után a korábbi ajánlat se maradjon letölthető
  source = String(source || '').trim();
  if (!source) throw new Error(_t('Nincs beállítva frissítési forrás.'));
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
    if (a) {
      // a kiadás ellenőrző összegei (SHA256SUMS.txt) – a letöltött fájl csak egyezés esetén telepíthető
      const sums = (rel.assets || []).find((x) => /^sha256sums(\.txt)?$/i.test(x.name));
      const sha256 = sums ? (await getSums(sums.browser_download_url).catch(() => ({})))[a.name] || '' : '';
      asset = { name: a.name, url: a.url, size: a.size, sha256 };
    }
  } else if (isHttps(source)) {
    const j = await getJson(source);
    latest = j.version;
    notes = j.notes || '';
    page = j.page || '';
    const key = process.platform === 'win32' ? 'win' : process.platform === 'darwin' ? 'mac' : 'linux';
    const url = j.assets?.[key] || j.url;
    // saját forrásnál az ellenőrző összeg a leírásban: "sha256": "…" vagy { "win": "…", … }
    const sha256 = String((typeof j.sha256 === 'object' ? j.sha256?.[key] : j.sha256) || '').toLowerCase();
    if (typeof url === 'string' && url) asset = { name: decodeURIComponent(url.split('/').pop().split('?')[0]), url, size: 0, sha256: /^[0-9a-f]{64}$/.test(sha256) ? sha256 : '' };
  } else {
    throw new Error(_t('A forrás „tulajdonos/tároló” (GitHub) vagy egy https:// cím lehet.'));
  }
  if (asset && !isHttps(asset.url)) asset = null; // csak titkosított kapcsolaton letölthető fájl
  offered = asset;
  if (!latest) throw new Error(_t('A forrás nem adott meg verziószámot.'));
  return { current, latest: String(latest).replace(/^v/i, ''), newer: cmpVersion(latest, current) > 0, notes, page, asset, portable: isPortable() };
}

let downloading = null;

/**
 * Letöltés egy saját, egyedi nevű ideiglenes mappába (csak a felhasználó érheti el), az ellenőrző összeg
 * számolásával; eltérés (vagy hiányzó összeg) esetén a fájl törlődik. onProgress(0..1).
 */
async function download(req, onProgress) {
  if (downloading) throw new Error(_t('Már folyamatban van egy letöltés.'));
  const asset = offered && req && req.url === offered.url ? offered : null;
  if (!asset) throw new Error(_t('Előbb keress frissítést.'));
  if (!asset.sha256) throw new Error(_t('Ehhez a kiadáshoz nincs ellenőrző összeg (SHA256SUMS.txt), ezért nem telepíthető automatikusan – töltsd le a kiadás oldaláról.'));
  const dir = fs.mkdtempSync(path.join(app.getPath('temp'), 'adas-update-'));
  const file = path.join(dir, asset.name.replace(/[\\/:*?"<>|]/g, '_'));
  downloading = true;
  let out = null;
  try {
    const res = await net.fetch(asset.url, { headers: { 'User-Agent': UA } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const total = Number(res.headers.get('content-length')) || asset.size || 0;
    out = fs.createWriteStream(file, { flags: 'wx', mode: 0o700 });
    let writeErr = null;
    out.on('error', (e) => (writeErr = e));
    const hash = crypto.createHash('sha256');
    const reader = res.body.getReader();
    let got = 0;
    let last = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      got += value.length;
      const b = Buffer.from(value);
      hash.update(b);
      if (writeErr) throw writeErr;
      if (!out.write(b)) await new Promise((r) => (out.once('drain', r), out.once('error', r)));
      if (total && Date.now() - last > 250) {
        last = Date.now();
        onProgress(got / total);
      }
    }
    if (writeErr) throw writeErr;
    await new Promise((r, j) => out.end((e) => (e ? j(e) : r())));
    if (hash.digest('hex') !== asset.sha256) throw new Error(_t('A letöltött fájl ellenőrző összege nem egyezik a kiadáséval – a frissítés megszakítva.'));
    verified.add(file);
    onProgress(1);
    return file;
  } catch (err) {
    // bármilyen hiba (HTTP, hálózat, írás, eltérő összeg): az ideiglenes mappa törlődik
    out?.destroy();
    fs.rmSync(dir, { recursive: true, force: true });
    throw err;
  } finally {
    downloading = null;
  }
}

/** A letöltött telepítő indítása, majd kilépés (Windows); máshol megnyitja a fájlt. */
async function install(file) {
  // csak az itt letöltött és ellenőrzött fájl (a felülettől kapott tetszőleges útvonal nem)
  if (!verified.has(file)) throw new Error(_t('Ismeretlen frissítési fájl.'));
  // hordozható változat: nincs telepítés, csak a letöltött fájl mappája nyílik meg (bármi is a neve)
  if (isPortable()) {
    shell.showItemInFolder(file);
    return 'shown';
  }
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
