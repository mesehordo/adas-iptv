// A kiadások aláíró kulcspárjának elkészítése (Ed25519) – egyszer kell lefuttatni, a saját gépeden:
//   node tools/make-update-key.mjs <mappa a tárolón KÍVÜL>
// A titkos kulcs (update-sign-key.pem) a megadott mappába kerül: ennek tartalmát kell a GitHub-tároló titkai közé
// tenni ADAS_UPDATE_SIGN_KEY néven (Settings → Secrets and variables → Actions → New repository secret), aztán a
// fájlt biztonságos helyen őrizd (vagy töröld). A nyilvános kulcsot a kimenet kiírja: az kerül az updater.js
// UPDATE_PUBKEY állandójába. A titkos kulcs SOHA ne kerüljön a tárolóba.
import { generateKeyPairSync } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { resolve, join, relative, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = process.argv[2];
if (!dir) {
  console.error('Használat: node tools/make-update-key.mjs <mappa a tárolón kívül>');
  process.exit(1);
}
const out = resolve(dir);
// (a tároló gyökere a szkript helyéből – bárhonnan futtatva)
const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const rel = relative(repoRoot, out);
if (!rel.startsWith('..') && !/^[a-zA-Z]:/.test(rel)) {
  console.error('A titkos kulcs nem kerülhet a tároló mappájába – adj meg egy azon kívüli mappát.');
  process.exit(1);
}
const file = join(out, 'update-sign-key.pem');
const { publicKey, privateKey } = generateKeyPairSync('ed25519');
try {
  // (wx: a meglévő fájlt nem írja felül)
  writeFileSync(file, privateKey.export({ type: 'pkcs8', format: 'pem' }), { mode: 0o600, flag: 'wx' });
} catch (e) {
  console.error(e.code === 'EEXIST' ? `Már van ilyen fájl: ${file} – nem írom felül.` : `Nem írható: ${file} (${e.message})`);
  process.exit(1);
}
console.log(`Titkos kulcs: ${file}\n(a tartalmát tedd a GitHub-tároló ADAS_UPDATE_SIGN_KEY titkába)\n`);
console.log('Nyilvános kulcs (az updater.js UPDATE_PUBKEY állandójába):\n');
console.log(publicKey.export({ type: 'spki', format: 'pem' }));
