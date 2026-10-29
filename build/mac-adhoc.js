// macOS: ad-hoc aláírás – electron-builder „afterPack” hook (a csomagolás után, a DMG / ZIP készítése előtt).
//
// Apple-fejlesztői tanúsítvány nélkül az electron-builder kihagyja az aláírást. A csomagolás viszont átírja az
// Electron-alkalmazást (név, Info.plist, erőforrások), így az eredeti aláírás érvénytelen, a bundle lezáratlan:
// Apple Silicon gépen el sem indul, letöltve (karanténban) minden Macen „sérült, nem nyitható meg”. Az ad-hoc
// aláírás („-”) lezárja a bundle-t: az első indításkor a macOS csak egyszeri jóváhagyást kér (nincs hitelesítés).
// Belülről kifelé: a beágyazott futtatható fájlok (ffmpeg), a frameworkök és a Helper-alkalmazások, végül maga az
// alkalmazás. Hardened runtime nélkül – így az Electronnak nem kell külön jogosultság (JIT). A végén ellenőrzés:
// érvénytelen aláírásnál a build elbukik (ne kerülhessen ki indíthatatlan csomag).
//
// A csomag neve ASCII (ADAS.app – productName): az Electron a segédfolyamat indításakor a futtatandó fájl valódi
// útvonalát (realpath) betűre összeveti a csomagból számolttal. Ékezetes névnél (az 1.34.0 előtti Adás.app) a kettő
// más Unicode-formában (NFC / NFD) áll, és az Electron induláskor leáll (EXC_BREAKPOINT a GPU-folyamat indításakor).
'use strict';
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const sign = (p) => execFileSync('codesign', ['--force', '--sign', '-', '--timestamp=none', p], { stdio: 'inherit' });

/** Mach-O fájl-e (a fejléc „mágikus” száma alapján). */
function isMachO(file) {
  let fd;
  try {
    fd = fs.openSync(file, 'r');
    const b = Buffer.alloc(4);
    if (fs.readSync(fd, b, 0, 4, 0) < 4) return false;
    const m = b.readUInt32BE(0);
    return [0xfeedface, 0xfeedfacf, 0xcefaedfe, 0xcffaedfe, 0xcafebabe, 0xbebafeca].includes(m);
  } catch {
    return false;
  } finally {
    if (fd !== undefined) fs.closeSync(fd);
  }
}

/** A mappa alatti (nem bundle-ön belüli) Mach-O fájlok – pl. Resources/ffmpeg/ffmpeg. */
function looseBinaries(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isSymbolicLink()) continue;
    if (e.isDirectory()) {
      if (/\.(app|framework)$/.test(e.name)) continue;
      looseBinaries(p, out);
    } else if (e.isFile() && isMachO(p)) out.push(p);
  }
  return out;
}

module.exports = async function afterPack(context) {
  if (context.electronPlatformName !== 'darwin') return;
  if (process.platform !== 'darwin') {
    console.log('  • macOS ad-hoc aláírás kihagyva (nem macOS-en fut a build)');
    return;
  }
  const app = path.join(context.appOutDir, `${context.packager.appInfo.productFilename}.app`);
  const contents = path.join(app, 'Contents');
  const frameworks = path.join(contents, 'Frameworks');

  // 0. a nevek: ASCII csomag és segédprogramok (ékezetes névvel nem indul – lásd fent)
  const bundleName = path.basename(app, '.app');
  if (!/^[\x20-\x7e]+$/.test(bundleName)) throw new Error(`mac-adhoc: a csomag neve nem ASCII (${bundleName}) – productName`);
  for (const e of fs.existsSync(frameworks) ? fs.readdirSync(frameworks) : [])
    if (!/^[\x20-\x7e]+$/.test(e)) throw new Error(`mac-adhoc: nem ASCII név a Frameworks mappában: ${e}`);
  if (!fs.existsSync(path.join(frameworks, `${bundleName} Helper.app`))) throw new Error(`mac-adhoc: hiányzik a segédprogram: ${bundleName} Helper.app`);

  // 1. a Resources alatti futtatható fájlok (ffmpeg)
  for (const f of looseBinaries(path.join(contents, 'Resources'))) sign(f);
  // 2. a frameworkök (a bennük lévő külön futtatható fájlokkal – pl. a chrome_crashpad_handler) és a Helper-appok
  if (fs.existsSync(frameworks)) {
    for (const e of fs.readdirSync(frameworks)) {
      const p = path.join(frameworks, e);
      if (e.endsWith('.framework')) {
        // (a framework fő binárisa – Versions/A/<név> – a frameworkkel együtt kap aláírást; a többi – Helpers,
        // Libraries – előtte, külön)
        const ver = path.join(p, 'Versions', 'A');
        const main = path.join(ver, e.replace(/\.framework$/, ''));
        if (fs.existsSync(ver)) for (const f of looseBinaries(ver)) if (f !== main) sign(f);
        sign(p);
      } else if (e.endsWith('.app')) sign(p);
      else if (isMachO(p)) sign(p); // (pl. különálló .dylib)
    }
  }
  // 3. maga az alkalmazás
  sign(app);
  execFileSync('codesign', ['--verify', '--deep', '--strict', '--verbose=2', app], { stdio: 'inherit' });
  console.log(`  • macOS ad-hoc aláírás kész: ${path.basename(app)} (${context.arch === 1 ? 'x64' : context.arch === 3 ? 'arm64' : context.arch})`);
};
