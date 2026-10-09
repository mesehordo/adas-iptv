// A felület szövegeinek ellenőrzése: minden _t('…') kulcs (és az index.html data-i18n jelölései)
// szerepel-e minden szótárban (src/i18n/<nyelv>.js), és a fordítások helyőrzői ({név}) egyeznek-e.
//   node tools/i18n-check.mjs        → hiányzó / hibás kulcsok listája, hiba esetén 1-es kilépési kód
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const LANGS = ['en', 'de', 'es', 'fr'];
const unescape = (s) => s.replace(/\\(u\{?[0-9a-fA-F]+\}?|x[0-9a-fA-F]{2}|.)/g, (m, c) => (c[0] === 'u' ? String.fromCodePoint(parseInt(c.replace(/[u{}]/g, ''), 16)) : c[0] === 'x' ? String.fromCharCode(parseInt(c.slice(1), 16)) : { n: '\n', t: '\t' }[c] ?? c));

// kulcsok a forrásból (csak szó szerinti szövegek; a változós _t(név) hívásokat nem lehet ellenőrizni)
const keys = new Map();
const add = (k, where) => k.trim() && (keys.has(k) || keys.set(k, where));
const files = ['main.js', 'lan.js', 'media.js', 'updater.js'].map((f) => path.join(root, f));
// (az i18n.js maga a fordító – a megjegyzésében lévő példa nem kulcs)
for (const f of fs.readdirSync(path.join(root, 'src/js'))) if (f.endsWith('.js') && f !== 'i18n.js') files.push(path.join(root, 'src/js', f));
const RX = /\b_t\(\s*(?:'((?:[^'\\\n]|\\.)*)'|"((?:[^"\\\n]|\\.)*)"|`((?:[^`\\$]|\\.|\$(?!\{))*)`)/g;
for (const f of files) {
  if (!fs.existsSync(f)) continue;
  const src = fs.readFileSync(f, 'utf8');
  for (const m of src.matchAll(RX)) add(unescape(m[1] ?? m[2] ?? m[3]), `${path.relative(root, f)}:${src.slice(0, m.index).split('\n').length}`);
}
const html = fs.readFileSync(path.join(root, 'src/index.html'), 'utf8');
for (const m of html.matchAll(/data-i18n(?:-title|-aria|-ph)?="([^"]+)"/g)) add(m[1].replace(/&quot;/g, '"').replace(/&amp;/g, '&'), 'src/index.html');
for (const m of html.matchAll(/<(\w+)[^>]*\sdata-i18n(?:\s|>)[^>]*>([^<]+)</g)) add(m[2].trim(), 'src/index.html');

const ph = (s) => [...String(s).matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(',');
let bad = 0;
for (const l of LANGS) {
  const t = fs.readFileSync(path.join(root, 'src/i18n', `${l}.js`), 'utf8');
  const dict = JSON.parse(t.slice(t.indexOf('{'), t.lastIndexOf('}') + 1));
  const missing = [...keys].filter(([k]) => !(k in dict));
  const wrongPh = Object.entries(dict).filter(([k, v]) => ph(k) !== ph(v));
  for (const [k, w] of missing) console.log(`[${l}] hiányzik: ${JSON.stringify(k)}  (${w})`);
  for (const [k] of wrongPh) console.log(`[${l}] helyőrző eltér: ${JSON.stringify(k)}`);
  bad += missing.length + wrongPh.length;
}
console.log(`${keys.size} kulcs, ${LANGS.length} nyelv – ${bad ? bad + ' hiba' : 'rendben'}`);
process.exit(bad ? 1 : 0);
