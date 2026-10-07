// Az AppImage elkészítéséhez szükséges eszközök letöltése a .linux-tools mappába (Windowson):
//  - squashfs-tools-ng (tar2sqfs.exe) a szerző oldaláról: https://infraroot.at/pub/squashfs/windows/
//  - az AppImage hivatalos type2-futtatórésze: https://github.com/AppImage/type2-runtime
// Linuxon a tar2sqfs a csomagkezelőből is telepíthető (squashfs-tools-ng), ilyenkor azt használja.
//   node tools/fetch-linux-tools.mjs
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dir = path.join(root, '.linux-tools');
fs.mkdirSync(dir, { recursive: true });

async function get(url, file) {
  if (fs.existsSync(file)) return console.log('Megvan:', path.relative(root, file));
  const res = await fetch(url, { redirect: 'follow' });
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
  fs.writeFileSync(file, Buffer.from(await res.arrayBuffer()));
  console.log('Letöltve:', path.relative(root, file));
}

await get('https://github.com/AppImage/type2-runtime/releases/download/continuous/runtime-x86_64', path.join(dir, 'runtime-x86_64'));
if (process.platform === 'win32') {
  const zip = path.join(dir, 'sqfs.zip');
  await get('https://infraroot.at/pub/squashfs/windows/squashfs-tools-ng-1.3.2-mingw64.zip', zip);
  if (!fs.existsSync(path.join(dir, 'sqfs', 'squashfs-tools-ng-1.3.2-mingw64', 'bin', 'tar2sqfs.exe'))) {
    execFileSync('powershell', ['-NoProfile', '-Command', `Expand-Archive -Force '${zip}' '${path.join(dir, 'sqfs')}'`], { stdio: 'inherit' });
  }
}
