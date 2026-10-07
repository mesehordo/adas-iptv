// LG webOS TV csomag készítése: node tools/build-webos.mjs [--no-package]
//
// - a felület egyfájlos, Chromium 53-on is futó csomagja (webbundle.mjs),
// - mellé az appinfo.json, az ikonok és a háttérszolgáltatás, végül az ares-package-dzsel .ipk.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { root, r, copy, buildWebBundle } from './webbundle.mjs';

const out = path.join(root, 'dist-webos');
const appDir = path.join(out, 'hu.adas.tv');
const svcDir = path.join(out, 'hu.adas.tv.service');

fs.rmSync(out, { recursive: true, force: true });
await buildWebBundle(appDir, { flagScript: 'window.ADAS_WEBOS = true;' });

// ---------------------------------------------------------------- appinfo, ikonok, szolgáltatás
const pkg = JSON.parse(fs.readFileSync(r('package.json'), 'utf8'));
const appinfo = JSON.parse(fs.readFileSync(r('webos/appinfo.json'), 'utf8'));
appinfo.version = pkg.version;
fs.writeFileSync(path.join(appDir, 'appinfo.json'), JSON.stringify(appinfo, null, 2));
copy(r('webos/icon.png'), path.join(appDir, 'icon.png'));
copy(r('webos/largeIcon.png'), path.join(appDir, 'largeIcon.png'));
for (const f of ['package.json', 'services.json', 'service.js', 'lib.js']) copy(r('webos/service', f), path.join(svcDir, f));

console.log('Elkészült:', path.relative(root, appDir), '+', path.relative(root, svcDir));

// ---------------------------------------------------------------- .ipk
if (!process.argv.includes('--no-package')) {
  const bin = r('node_modules/.bin', process.platform === 'win32' ? 'ares-package.cmd' : 'ares-package');
  execFileSync(bin, [appDir, svcDir, '-o', out], { stdio: 'inherit', shell: process.platform === 'win32' });
  const ipk = fs.readdirSync(out).find((f) => f.endsWith('.ipk'));
  console.log('Csomag:', ipk ? path.join('dist-webos', ipk) : '(nem készült el)');
}
