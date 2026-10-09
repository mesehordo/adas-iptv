// A felület szövegeinek ellenőrzése: minden _t('…') kulcs (az index.html data-i18n jelölései és az
// Android-keret L.t(…, "…") szövegei) szerepel-e a nyelvi fájlokban (src/i18n/<nyelv>.js), és a fordítások
// helyőrzői ({név}) egyeznek-e. Az angol kötelező (ez a tartalék nyelv): hiányzó angol kulcs vagy súgótéma
// hiba. A többi nyelvnél a hiány csak tájékoztatás – ott az angol szöveg jelenik meg.
//   node tools/i18n-check.mjs          → angol hiányok és helyőrző-hibák, hiba esetén 1-es kilépési kód
//   node tools/i18n-check.mjs de       → az adott nyelv hiányzó kulcsainak teljes listája is
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const LANGS = fs.readdirSync(path.join(root, 'src/i18n')).map((f) => f.replace(/\.js$/, '')).filter((l) => /^[a-z]{2}$/.test(l) && l !== 'hu');
const detail = process.argv.slice(2);
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
const javaDir = path.join(root, 'android/src/hu/adas/tv');
for (const f of fs.readdirSync(javaDir)) {
  const src = fs.readFileSync(path.join(javaDir, f), 'utf8');
  for (const m of src.matchAll(/\bL\.t\(\s*\w+\s*,\s*"((?:[^"\\]|\\.)*)"/g)) add(unescape(m[1]), `android/${f}:${src.slice(0, m.index).split('\n').length}`);
}

const ph = (s) => [...String(s).matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(',');
let bad = 0;
const info = [];
for (const l of LANGS) {
  const t = fs.readFileSync(path.join(root, 'src/i18n', `${l}.js`), 'utf8');
  const dict = JSON.parse(t.slice(t.indexOf('{'), t.lastIndexOf('}') + 1));
  if (!dict['@lang']?.name || !dict['@lang']?.locale) {
    console.log(`[${l}] hiányzik a "@lang" name / locale adata`);
    bad++;
  }
  // (az üres fordítás is hiány)
  const missing = [...keys].filter(([k]) => !String(dict[k] ?? '').trim());
  const wrongPh = Object.entries(dict).filter(([k, v]) => k !== '@lang' && ph(k) !== ph(v));
  for (const [k] of wrongPh) console.log(`[${l}] helyőrző eltér: ${JSON.stringify(k)}`);
  bad += wrongPh.length;
  if (l === 'en' || detail.includes(l)) for (const [k, w] of missing) console.log(`[${l}] hiányzik: ${JSON.stringify(k)}  (${w})`);
  if (l === 'en') bad += missing.length;
  else if (missing.length) info.push(`${l}: ${missing.length} kulcs angolul`);
}

// súgó: az angolban minden magyar téma és témakör megvan-e
const ids = async (f) => {
  // (a csomag CommonJS-es, ezért a – import nélküli – ES-modult szövegként töltjük be)
  const m = await import('data:text/javascript;charset=utf-8,' + encodeURIComponent(fs.readFileSync(path.join(root, 'src/js', f), 'utf8')));
  return { a: m.ARTICLES.map((x) => x.id), c: m.HELP_CATEGORIES.map((x) => x.id) };
};
const hu = await ids('help-content.js');
for (const l of LANGS) {
  const f = `help/${l}.js`;
  if (!fs.existsSync(path.join(root, 'src/js', f))) {
    if (l === 'en') (bad++, console.log('[en] hiányzik a súgó (src/js/help/en.js)'));
    else info.push(`${l}: nincs saját súgó (angol)`);
    continue;
  }
  const h = await ids(f);
  const miss = [...hu.a.filter((x) => !h.a.includes(x)), ...hu.c.filter((x) => !h.c.includes(x))];
  if (l === 'en') {
    for (const x of miss) console.log(`[en] hiányzó súgótéma / témakör: ${x}`);
    bad += miss.length;
  } else if (miss.length) info.push(`${l}: ${miss.length} súgótéma angolul`);
}

if (info.length) console.log(`tájékoztatás (nem hiba) – ${info.join('; ')}`);
console.log(`${keys.size} kulcs, ${LANGS.length + 1} nyelv (kötelező: hu, en) – ${bad ? bad + ' hiba' : 'rendben'}`);
process.exit(bad ? 1 : 0);
