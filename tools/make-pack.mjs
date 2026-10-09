// Kiegészítő csomag (.adaspack) készítése egy M3U / M3U8 lejátszólistából (helyi fájlból vagy webcímről).
//   node tools/make-pack.mjs <lista.m3u8 | https://…/lista.m3u> --kind tv|vod --id azonosito --name "Név"
//        [--desc "Leírás"] [--off] [--url https://…] [--epg https://…/epg.xml.gz] [--refresh 6] [--out mappa-vagy-fájl]
// Kimenet: <azonosito>_tv.adaspack vagy <azonosito>_vod.adaspack (a lista mellé, vagy az --out helyre).
// Webcímes forrásnál a csomag forráscíme (--url) magától ez a cím: a program innen frissíti a listát a
// beállított gyakorisággal (--refresh óra, alapból a program alapértéke), a beépített szöveg csak tartalék.
// A formátum leírása: docs/ADASPACK.md
import fs from 'node:fs';
import path from 'node:path';

// (a szkript utáni argumentumok – akkor is, ha egy indító burkoló hívja)
const args = process.argv.slice(process.argv.findIndex((a) => /make-pack\.mjs$/i.test(a)) + 1);
// (a megadott, de érték nélküli kapcsoló hiba – pl. utolsó argumentumként a --epg)
const opt = (k) => {
  const i = args.indexOf('--' + k);
  if (i < 0) return undefined;
  const v = args[i + 1];
  if (v === undefined || v.startsWith('--')) {
    console.error(`A --${k} kapcsolónak értéket kell adni.`);
    process.exit(1);
  }
  return v;
};
const usage = 'Használat: node tools/make-pack.mjs <lista.m3u8 | https://…> --kind tv|vod --id azonosito --name "Név" [--desc "Leírás"] [--off] [--url https://…] [--epg https://…] [--refresh 1|2|3|6|12|24|48] [--out mappa-vagy-fájl]';
const fail = (msg) => {
  console.error(msg + '\n' + usage);
  process.exit(1);
};
const REFRESH = [1, 2, 3, 6, 12, 24, 48];
const isWeb = (u) => /^https?:\/\/\S+$/i.test(u || '');

const src = args[0] && !args[0].startsWith('--') ? args[0] : undefined;
const kind = opt('kind');
const id = opt('id');
if (!src) fail('Hiányzik a lejátszólista.');
if (kind !== 'tv' && kind !== 'vod') fail('A --kind értéke tv (tévécsatornák) vagy vod (filmek, sorozatok) legyen.');
if (!id || !/^[a-z0-9_-]{1,40}$/i.test(id)) fail('Az --id csak betűt, számot, - és _ jelet tartalmazhat (legfeljebb 40 karakter).');
const url = opt('url') ?? (isWeb(src) ? src : undefined);
const epg = opt('epg');
const refresh = opt('refresh');
if (url !== undefined && !isWeb(url)) fail('Az --url csak http(s):// cím lehet.');
if (epg !== undefined && !isWeb(epg)) fail('Az --epg csak http(s):// cím lehet.');
if (refresh !== undefined && !REFRESH.includes(Number(refresh))) fail(`A --refresh értéke ${REFRESH.join(', ')} (óra) lehet.`);

let text;
if (isWeb(src)) {
  const r = await fetch(src, { headers: { 'User-Agent': 'Mozilla/5.0 (Adas make-pack)' } });
  if (!r.ok) fail(`A lista nem tölthető le (HTTP ${r.status}): ${src}`);
  text = await r.text();
} else text = fs.readFileSync(src, 'utf8');
text = text.replace(/^﻿/, '');
if (!/^#EXTM3U/m.test(text) || !/#EXTINF/i.test(text)) fail('A fájl nem M3U lista (#EXTM3U fejléc és #EXTINF sorok kellenek).');
// minden #EXTINF után legyen egy cím (az első nem üres, nem # kezdetű sor)
const lines = text.split(/\r?\n/);
let entries = 0;
let missing = 0;
for (let i = 0; i < lines.length; i++) {
  if (!/^\s*#EXTINF/i.test(lines[i])) continue;
  entries++;
  // a cím a következő nem üres, nem # sor – de a következő #EXTINF előtt kell lennie
  let j = i + 1;
  while (j < lines.length && !/^\s*#EXTINF/i.test(lines[j]) && (!lines[j].trim() || lines[j].trim().startsWith('#'))) j++;
  if (j >= lines.length || /^\s*#EXTINF/i.test(lines[j]) || !/^[a-z][a-z0-9+.-]*:\/\//i.test(lines[j].trim())) missing++;
}
if (!entries) fail('Nincs egyetlen #EXTINF bejegyzés sem.');
// (a program is elutasítja az ilyen csomagot – itt már készítéskor kiderül)
if (missing) fail(`${missing} bejegyzésnél nincs érvényes cím (http://, https://, file://…) az #EXTINF sor után.`);

const pack = { adasPack: 1, kind, id, name: opt('name') || id, desc: opt('desc') || '', off: args.includes('--off'), text };
if (url) pack.url = url;
if (epg) pack.epg = epg;
if (refresh) pack.refresh = Number(refresh);
let out = opt('out') || (isWeb(src) ? '.' : path.dirname(src));
if (!/\.adaspa(c)?k$/i.test(out)) out = path.join(out, `${id}_${kind}.adaspack`);
fs.writeFileSync(out, JSON.stringify(pack));
console.log(`Kész: ${out} (${kind === 'tv' ? 'tévécsatorna' : 'VOD'}-csomag, ${entries} bejegyzés, ${(fs.statSync(out).size / 1e6).toFixed(1)} MB${url ? `, forrás: ${url}${refresh ? ` (${refresh} óránként)` : ''}` : ''})`);
