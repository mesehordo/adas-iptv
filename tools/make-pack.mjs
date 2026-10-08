// Kiegészítő csomag (.adaspack) készítése egy M3U / M3U8 lejátszólistából.
//   node tools/make-pack.mjs <lista.m3u8> --kind tv|vod --id azonosito --name "Név" [--desc "Leírás"] [--off] [--out mappa-vagy-fájl]
// Kimenet: <azonosito>_tv.adaspack vagy <azonosito>_vod.adaspack (a lista mellé, vagy az --out helyre).
// A formátum leírása: docs/ADASPACK.md
import fs from 'node:fs';
import path from 'node:path';

// (a szkript utáni argumentumok – akkor is, ha egy indító burkoló hívja)
const args = process.argv.slice(process.argv.findIndex((a) => /make-pack\.mjs$/i.test(a)) + 1);
const opt = (k) => {
  const i = args.indexOf('--' + k);
  return i >= 0 ? args[i + 1] : undefined;
};
const usage = 'Használat: node tools/make-pack.mjs <lista.m3u8> --kind tv|vod --id azonosito --name "Név" [--desc "Leírás"] [--off] [--out mappa-vagy-fájl]';
const fail = (msg) => {
  console.error(msg + '\n' + usage);
  process.exit(1);
};

const src = args[0] && !args[0].startsWith('--') ? args[0] : undefined;
const kind = opt('kind');
const id = opt('id');
if (!src) fail('Hiányzik a lejátszólista.');
if (kind !== 'tv' && kind !== 'vod') fail('A --kind értéke tv (tévécsatornák) vagy vod (filmek, sorozatok) legyen.');
if (!id || !/^[a-z0-9_-]{1,40}$/i.test(id)) fail('Az --id csak betűt, számot, - és _ jelet tartalmazhat (legfeljebb 40 karakter).');

const text = fs.readFileSync(src, 'utf8').replace(/^﻿/, '');
if (!/^#EXTM3U/m.test(text) || !/#EXTINF/i.test(text)) fail('A fájl nem M3U lista (#EXTM3U fejléc és #EXTINF sorok kellenek).');
// minden #EXTINF után legyen egy cím (az első nem üres, nem # kezdetű sor)
const lines = text.split(/\r?\n/);
let entries = 0;
let missing = 0;
for (let i = 0; i < lines.length; i++) {
  if (!/^#EXTINF/i.test(lines[i])) continue;
  entries++;
  let j = i + 1;
  while (j < lines.length && (!lines[j].trim() || lines[j].startsWith('#'))) j++;
  if (j >= lines.length || !/^[a-z][a-z0-9+.-]*:\/\//i.test(lines[j].trim())) missing++;
}
if (!entries) fail('Nincs egyetlen #EXTINF bejegyzés sem.');
if (missing) console.warn(`Figyelem: ${missing} bejegyzésnél nincs érvényes cím (http://, https://, file://…) a #EXTINF után.`);

const pack = { adasPack: 1, kind, id, name: opt('name') || id, desc: opt('desc') || '', off: args.includes('--off'), text };
let out = opt('out') || path.dirname(src);
if (!/\.adaspa(c)?k$/i.test(out)) out = path.join(out, `${id}_${kind}.adaspack`);
fs.writeFileSync(out, JSON.stringify(pack));
console.log(`Kész: ${out} (${kind === 'tv' ? 'tévécsatorna' : 'VOD'}-csomag, ${entries} bejegyzés, ${(fs.statSync(out).size / 1e6).toFixed(1)} MB)`);
