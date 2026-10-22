// Témák színváltozatai. Egy változat a téma saját stílusszabályainak átszínezése: a színes (nem szürke) színek
// árnyalata az OKLCH színtérben a téma saját színeihez rendelt célszínek felé fordul (map: [[forrás, cél], …] – a
// téma fő- és kísérőszínei külön-külön, pl. Neon City neonsárga, cián és bíbor színe), a telítettség a változat
// szerint marad, élénkül vagy tompul; az észlelt világosság nem változik, így a szöveg ugyanúgy olvasható –, a fekete / fehér / szürke és az állapotszínek (működik / hiba / figyelmeztetés, felvétel) nem
// változnak. Az átszínezett szabályok futás közben, csak az aktív témához és változathoz készülnek (egy kis
// stíluslap), így a beégetett díszítőszínek is követik a változatot, és a stíluslap mérete nem nő.
import { _t } from './i18n.js';

// ---------------------------------------------------------------- színkezelés (sRGB ↔ OKLCH)
const srgbToLin = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const linToSrgb = (c) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);
function rgbToOklch(r, g, b) {
  const [lr, lg, lb] = [r, g, b].map((v) => srgbToLin(v / 255));
  const l = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb);
  const m = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb);
  const s = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb);
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  return [L, Math.hypot(A, B), ((Math.atan2(B, A) * 180) / Math.PI + 360) % 360];
}
function oklabToRgb(L, A, B) {
  const l = (L + 0.3963377774 * A + 0.2158037573 * B) ** 3;
  const m = (L - 0.1055613458 * A - 0.0638541728 * B) ** 3;
  const s = (L - 0.0894841775 * A - 1.291485548 * B) ** 3;
  return [4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s, -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s, -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s];
}
/** OKLCH → sRGB; a színtartományon kívüli színnél a telítettség csökken (nem levágás – így az árnyalat marad). */
function oklchToRgb(L, C, H) {
  const h = (H * Math.PI) / 180;
  for (let c = C, i = 0; i < 24; i++, c *= 0.9) {
    const rgb = oklabToRgb(L, c * Math.cos(h), c * Math.sin(h)).map(linToSrgb);
    if (rgb.every((v) => v >= -0.001 && v <= 1.001) || c < 0.002) return rgb.map((v) => Math.round(Math.min(1, Math.max(0, v)) * 255));
  }
  return oklabToRgb(L, 0, 0).map((v) => Math.round(Math.min(1, Math.max(0, linToSrgb(v))) * 255));
}
function hslToRgb(h, s, l) {
  s /= 100;
  l /= 100;
  const k = (n) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return [f(0), f(8), f(4)].map((v) => Math.round(v * 255));
}
/** Egy CSS-szín → [r, g, b, a] vagy null (pl. kulcsszó, változó). */
function parseColor(s) {
  let m = /^#([0-9a-f]{3,8})$/i.exec(s);
  if (m) {
    let h = m[1];
    if (h.length === 3 || h.length === 4) h = [...h].map((c) => c + c).join('');
    if (h.length !== 6 && h.length !== 8) return null;
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16), h.length === 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1];
  }
  m = /^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)(?:[\s,/]+([\d.]+%?))?\s*\)$/i.exec(s);
  if (m) return [+m[1], +m[2], +m[3], m[4] === undefined ? 1 : m[4].endsWith('%') ? parseFloat(m[4]) / 100 : +m[4]];
  m = /^hsla?\(\s*([\d.]+)(?:deg)?[\s,]+([\d.]+)%[\s,]+([\d.]+)%(?:[\s,/]+([\d.]+%?))?\s*\)$/i.exec(s);
  if (m) return [...hslToRgb(+m[1], +m[2], +m[3]), m[4] === undefined ? 1 : m[4].endsWith('%') ? parseFloat(m[4]) / 100 : +m[4]];
  return null;
}
const fmt = ([r, g, b, a]) => (a >= 1 ? '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('') : `rgba(${r}, ${g}, ${b}, ${+a.toFixed(3)})`);
const COLOR_RX = /#[0-9a-fA-F]{3,8}\b|rgba?\([^()]*\)|hsla?\([^()]*\)/g;
/** Egy szín árnyalatának elforgatása (a szürke árnyalatok és a nagyon halvány színek maradnak). */
export function rotateColor(css, deg) {
  const c = parseColor(css);
  if (!c) return css;
  const [L, C, H] = rgbToOklch(c[0], c[1], c[2]);
  if (C < 0.035) return css;
  return fmt([...oklchToRgb(L, C, (H + deg + 360) % 360), c[3]]);
}
/**
 * Egy szín a változat szerint (v.map: [[forrás árnyalat, cél árnyalat], …] – a legközelebbi forrás eltolása; v.chroma:
 * a telítettség szorzója). A szürke árnyalatok és a nagyon halvány színek maradnak.
 */
export function variantColor(css, v) {
  const c = parseColor(css);
  if (!c) return css;
  const [L, C, H] = rgbToOklch(c[0], c[1], c[2]);
  if (C < 0.035) return css;
  let best = v.map[0];
  for (const p of v.map) if (dist(p[0], H) < dist(best[0], H)) best = p;
  const nh = (H + best[1] - best[0] + 360) % 360;
  const want = Math.min(0.37, C * (v.chroma || 1));
  // (élénk színnél: ha a célárnyalat ezen a világosságon nem lehet elég telített – pl. a neonsárga világosságán nincs
  // élénk rózsaszín –, a világosság kissé csökken, amíg a telítettség nagy része megmarad; így a
  // változat nem fakul pasztellé. A halvány háttérárnyalatok világossága marad.)
  let L2 = L;
  if (want >= 0.08) {
    const mid = 0.7;
    // (csak lefelé: a sötét kiemelő – világos témán a szöveg – világosítva a kontrasztot rontaná)
    for (let i = 0; i < 20 && L2 > mid && maxChroma(L2, nh) < want * 0.85; i++) L2 -= 0.02;
  }
  return fmt([...oklchToRgb(L2, want, nh), c[3]]);
}
/** A legnagyobb, még megjeleníthető (sRGB) telítettség adott világosságnál és árnyalatnál. */
function maxChroma(L, H) {
  const h = (H * Math.PI) / 180;
  let lo = 0;
  let hi = 0.4;
  for (let i = 0; i < 14; i++) {
    const m = (lo + hi) / 2;
    const rgb = oklabToRgb(L, m * Math.cos(h), m * Math.sin(h)).map(linToSrgb);
    if (rgb.every((x) => x >= -0.001 && x <= 1.001)) lo = m;
    else hi = m;
  }
  return lo;
}
/** A szín OKLCH-árnyalata (fok), vagy null, ha szürke. */
export function hueOf(css) {
  const c = parseColor(String(css || '').trim());
  if (!c) return null;
  const [, C, H] = rgbToOklch(c[0], c[1], c[2]);
  return C < 0.035 ? null : H;
}

// ---------------------------------------------------------------- változatok
// színcsaládok (OKLCH-árnyalat) – a változat neve a kiemelőszín családja szerint
export const FAMILIES = [
  { id: 'red', hue: 27, name: () => _t('Piros') },
  { id: 'orange', hue: 55, name: () => _t('Narancs') },
  { id: 'gold', hue: 85, name: () => _t('Arany') },
  { id: 'green', hue: 145, name: () => _t('Zöld') },
  { id: 'teal', hue: 190, name: () => _t('Türkiz') },
  { id: 'blue', hue: 255, name: () => _t('Kék') },
  { id: 'purple', hue: 300, name: () => _t('Lila') },
  { id: 'pink', hue: 345, name: () => _t('Rózsaszín') },
];
const dist = (a, b) => Math.min(Math.abs(a - b), 360 - Math.abs(a - b));
/**
 * A téma változatai: [{ id, family, deg }] – az eredeti kiemelőszíntől és egymástól is távoli színcsaládok (3 db).
 * overrides: témánként kézzel választott családok (ahol az automatikus választás nem szép).
 */
export function variantsFor(accentHue, chosen = null) {
  // fekete-fehér kiemelésű téma (pl. Manga, Mu): nincs mit elforgatni – a változat színes kiemelőszínt ad
  if (accentHue == null) {
    return (chosen || ['red', 'blue', 'green']).map((id) => FAMILIES.find((f) => f.id === id)).filter(Boolean).map((f) => ({ id: f.id, name: f.name, family: f, deg: 0, tint: f.hue }));
  }
  const pick = chosen
    ? chosen.map((id) => FAMILIES.find((f) => f.id === id)).filter(Boolean)
    : (() => {
        const out = [];
        const cands = FAMILIES.filter((f) => dist(f.hue, accentHue) >= 60);
        // a legtávolabbitól indulva, egymástól is legalább 75°
        cands.sort((a, b) => dist(b.hue, accentHue) - dist(a.hue, accentHue));
        for (const f of cands) if (out.length < 3 && out.every((o) => dist(o.hue, f.hue) >= 75)) out.push(f);
        for (const f of cands) if (out.length < 3 && !out.includes(f)) out.push(f);
        return out;
      })();
  return pick.map((f) => ({ id: f.id, name: f.name, family: f, deg: f.hue - accentHue, map: [[accentHue, f.hue]] }));
}

// ---------------------------------------------------------------- témánként válogatott változatok
// A téma saját hangulatához illő paletták: a téma színeihez (forrás-árnyalat, mérve a stíluslapból) rendelt célszínek,
// ahol kell, élénkebb / tompább telítettséggel. A fekete-fehér témáknál (tint) színes kiemelő. Üres lista: nincs
// változat (a Kontraszt akadálymentességi okból).
const V = (id, name, map, o = {}) => ({ id, name, map, ...o });
const T = (id, name, tint, tint2) => ({ id, name, tint, tint2 });
export const THEME_VARIANTS = {
  netflix: [V('kobai', () => _t('Szilvavirág'), [[28, 352]]), V('ruri', () => _t('Lazúr'), [[28, 258]]), V('kohaku', () => _t('Borostyán'), [[28, 68]])],
  disney: [V('fairy', () => _t('Tündérlila'), [[257, 300]]), V('dawn', () => _t('Hajnalpír'), [[257, 350]]), V('emerald', () => _t('Smaragd'), [[257, 165]])],
  skyshowtime: [
    V('deepsea', () => _t('Mélytenger'), [[289, 245], [315, 205], [0, 190]]),
    V('sunset', () => _t('Naplemente'), [[289, 25], [315, 55], [0, 70]]),
    V('forest', () => _t('Erdei mágia'), [[289, 150], [315, 115], [0, 95]]),
  ],
  rakuten: [V('cobalt', () => _t('Kobalt'), [[29, 255]]), V('emerald', () => _t('Smaragd'), [[29, 155]]), V('gold', () => _t('Arany'), [[29, 85]])],
  prime: [V('coral', () => _t('Korallzátony'), [[250, 22]]), V('lagoon', () => _t('Lagúna'), [[250, 185]]), V('midnight', () => _t('Éjféli lila'), [[250, 295]])],
  apple: [V('ice', () => _t('Jégkék'), [[21, 240]]), V('mint', () => _t('Menta'), [[21, 165]]), V('lavender', () => _t('Levendula'), [[21, 300]])],
  zen: [V('sakura', () => _t('Sakura'), [[131, 355]], { chroma: 0.9 }), V('indigo', () => _t('Indigó'), [[131, 265]]), V('maple', () => _t('Juhar'), [[131, 40]])],
  wabisabi: [
    V('indigo', () => _t('Indigófesték'), [[45, 262], [75, 75], [255, 225]]),
    V('moss', () => _t('Moha'), [[45, 128], [75, 80], [255, 255]]),
    V('plum', () => _t('Szilva'), [[45, 345], [75, 75], [255, 280]]),
  ],
  nintendo: [
    V('strawberry', () => _t('Eper'), [[235, 355], [30, 250]]),
    V('lime', () => _t('Lime'), [[235, 128], [30, 30]]),
    V('tangerine', () => _t('Mandarin'), [[235, 55], [30, 345]]),
  ],
  switch: [
    V('neon', () => _t('Neon pár'), [[212, 130], [30, 345]], { chroma: 1.08 }),
    V('coral', () => _t('Korall'), [[212, 25], [30, 250]]),
    V('violet', () => _t('Ibolya'), [[212, 295], [30, 60]]),
  ],
  wii: [V('lime', () => _t('Lime'), [[226, 145]]), V('tangerine', () => _t('Mandarin'), [[226, 55]]), V('rose', () => _t('Rózsa'), [[226, 350]])],
  // Neon City: a neonsárga / cián / bíbor / vörös négyes más éjszakai neonpalettákra
  cyberpunk: [
    V('synthwave', () => _t('Szintihullám'), [[105, 345], [210, 200], [15, 60], [285, 300]], { chroma: 1.1 }),
    V('acid', () => _t('Savas zöld'), [[105, 135], [210, 320], [15, 15], [285, 265]], { chroma: 1.1 }),
    V('redneon', () => _t('Vörös neon'), [[105, 25], [210, 190], [15, 350], [285, 300]], { chroma: 1.1 }),
  ],
  neotokyo: [
    V('headlight', () => _t('Motorfény'), [[27, 245]], { chroma: 1.05 }),
    V('psy', () => _t('Pszí lila'), [[27, 300]], { chroma: 1.05 }),
    V('toxic', () => _t('Mérgező zöld'), [[27, 140]]),
  ],
  manga: [T('red', () => _t('Vörös tus'), 27), T('blue', () => _t('Kék tus'), 255), T('shojo', () => _t('Shōjo rózsa'), 350, 300)],
  comic: [
    V('night', () => _t('Éjféli hős'), [[26, 300], [256, 145], [90, 90]]),
    V('orange', () => _t('Narancs–türkiz'), [[26, 50], [256, 200], [90, 95]]),
    V('pop', () => _t('Rózsaszín pop'), [[26, 350], [256, 265], [90, 95]]),
  ],
  // (16-Bit: a színes A–B–X–Y pöttyök maradnak, csak a konzol lila gombjai változnak)
  snes: [
    V('burgundy', () => _t('Bordó'), [[289, 18], [30, 30], [90, 90], [150, 150]]),
    V('emerald', () => _t('Smaragd'), [[289, 158], [30, 30], [90, 90], [150, 150]]),
    V('cobalt', () => _t('Kobalt'), [[289, 245], [30, 30], [90, 90], [150, 150]]),
  ],
  // Kikagaku: a plakát alapszínei helyet cserélnek, ill. a másodlagos színek
  bauhaus: [
    V('blue', () => _t('Kék elöl'), [[30, 255], [255, 30], [90, 90]]),
    V('yellow', () => _t('Sárga elöl'), [[30, 90], [90, 30], [255, 255]]),
    V('secondary', () => _t('Másodlagos színek'), [[30, 55], [255, 145], [90, 310]]),
  ],
  aurora: [
    V('dawn', () => _t('Hajnalpír'), [[286, 15], [177, 75], [210, 45]]),
    V('deepsea', () => _t('Mélytenger'), [[286, 255], [177, 195], [210, 225]]),
    V('forest', () => _t('Erdei fény'), [[286, 150], [177, 105], [210, 170]]),
  ],
  // Rakugaki: csak a „toll” színe változik, a füzet kék vonalai és a sárga kiemelő marad
  sketch: [
    V('green', () => _t('Zöld toll'), [[28, 145], [255, 255], [90, 90], [105, 105]]),
    V('violet', () => _t('Lila toll'), [[28, 300], [255, 255], [90, 90], [105, 105]]),
    V('crayon', () => _t('Narancs kréta'), [[28, 55], [255, 255], [90, 90], [105, 105]]),
  ],
  // Phosphor: a régi monitorok foszforszínei
  terminal: [V('amber', () => _t('Borostyán'), [[147, 72]]), V('cyan', () => _t('Cián'), [[147, 200]]), V('plasma', () => _t('Plazma'), [[147, 40]])],
  contrast: [],
  large: [V('green', () => _t('Zöld'), [[254, 150]]), V('burgundy', () => _t('Bordó'), [[254, 18]]), V('violet', () => _t('Lila'), [[254, 300]])],
  shiro: [V('sage', () => _t('Zsálya'), [[263, 150]]), V('coral', () => _t('Korall'), [[263, 28]]), V('violet', () => _t('Ibolya'), [[263, 300]])],
  // Yoru: sötét szobába – tompa, nem vakító színek
  yoru: [
    V('ember', () => _t('Parázs'), [[72, 28], [30, 10]], { chroma: 0.95 }),
    V('moon', () => _t('Holdfény'), [[72, 245], [30, 230]], { chroma: 0.8 }),
    V('ash', () => _t('Hamuzöld'), [[72, 150], [30, 130]], { chroma: 0.8 }),
  ],
  mori: [V('autumn', () => _t('Ősz'), [[131, 52]]), V('lake', () => _t('Tópart'), [[131, 205]]), V('berry', () => _t('Áfonya'), [[131, 305]])],
  // Natsu: a homokszín marad, a tenger és a korall más nyári színekre
  natsu: [
    V('sunset', () => _t('Naplemente'), [[200, 45], [30, 350], [90, 90]]),
    V('tropic', () => _t('Trópusi'), [[200, 150], [30, 60], [90, 90]]),
    V('lavender', () => _t('Levendulamező'), [[200, 290], [30, 340], [90, 90]]),
  ],
  fuyu: [V('dawn', () => _t('Hajnalpír'), [[251, 350]]), V('aurora', () => _t('Sarki fény'), [[251, 165]]), V('dusk', () => _t('Alkony'), [[251, 295]])],
  // Deco: a fekete-arany mozipalota más nemesfémekkel és drágakövekkel
  deco: [V('rosegold', () => _t('Rózsaarany'), [[85, 40]], { chroma: 0.85 }), V('emerald', () => _t('Smaragd'), [[85, 160]]), V('silver', () => _t('Ezüst'), [[85, 85]], { chroma: 0.12 })],
  // Shōwa: a 70-es évek további lakberendezési színei
  showa: [V('avocado', () => _t('Avokádó'), [[51, 118]]), V('burgundy', () => _t('Bordó'), [[51, 15]]), V('petrol', () => _t('Petrol'), [[51, 205]], { chroma: 0.85 })],
  mu: [T('indigo', () => _t('Indigó'), 265), T('rust', () => _t('Rozsda'), 40), T('moss', () => _t('Moha'), 130)],
  // Holo: a sci-fi kezelőfelület riasztási és üzemmódszínei
  holo: [V('redalert', () => _t('Vörös riadó'), [[222, 25]]), V('amber', () => _t('Borostyán'), [[222, 70]]), V('matrix', () => _t('Mátrix'), [[222, 145]])],
  // Yume: a pasztell hármas (rózsaszín / levendula / menta) más édességszínekben
  yume: [
    V('peach', () => _t('Barack'), [[350, 40], [295, 20], [175, 95]]),
    V('soda', () => _t('Szóda'), [[350, 230], [295, 290], [175, 150]]),
    V('melon', () => _t('Dinnye'), [[350, 145], [295, 350], [175, 85]]),
  ],
  // Yami (keserédes): a púderrózsaszín / borvörös / levendula hármas más keserédes színekben
  yami: [
    V('wine', () => _t('Bordó csipke'), [[355, 15], [5, 5], [310, 345]], { chroma: 1.05 }),
    V('lavender', () => _t('Levendula'), [[355, 305], [5, 330], [310, 270]]),
    V('mint', () => _t('Menta macaron'), [[355, 170], [5, 350], [310, 330]]),
  ],
  // Csillagidő: a parancsnoki híd sávjai riasztási és nyugalmi színekben
  stardate: [
    V('redalert', () => _t('Vörös riadó'), [[65, 25], [45, 15], [330, 350], [285, 330], [75, 35]]),
    V('bluealert', () => _t('Kék riadó'), [[65, 250], [45, 235], [330, 205], [285, 280], [75, 260]]),
    V('emerald', () => _t('Smaragd'), [[65, 150], [45, 135], [330, 190], [285, 250], [75, 160]]),
  ],
};

// ---------------------------------------------------------------- a szabályok átszínezése
// állapotot jelző színek: nem változnak (a „működik” zöld, a hiba / felvétel piros jelentést hordoz)
const KEEP_PROPS = /^--(ok|bad|warn|unknown|danger|good|rec)\b/;
const KEEP_SEL = /\b(ok|bad|warn|good|danger|status|offline|health|rec-|recording|err(or)?|live-badge|rec-dot|rec-btn)\b/i;
// az általános (nem témafüggő) szabályok piros családja – az alaptéma kiemelőszíne és árnyalatai (pl. a „most futó”
// műsorblokk sötétpiros háttere): a változat ezeket a saját színcsaládjára fordítja
const BASE_HUE = 27;
const nearBase = (c) => {
  const h = hueOf(c);
  return h != null && dist(h, BASE_HUE) <= 30;
};

function* styleRules(list, media = '') {
  for (const r of list) {
    if (r.type === 1) yield { rule: r, media };
    else if (r.type === 4) {
      try {
        yield* styleRules(r.cssRules, r.conditionText || r.media?.mediaText || '');
      } catch {}
    }
  }
}
/** Egy szabály átszínezett másolata (szöveg) vagy '' (ha nincs mit átszínezni). */
function recolorRule(rule, selector, v, only = null) {
  const st = rule.style;
  const decls = [];
  let changed = false;
  for (let i = 0; i < st.length; i++) {
    const prop = st[i];
    const val = st.getPropertyValue(prop);
    if (!COLOR_RX.test(val)) continue;
    COLOR_RX.lastIndex = 0;
    if (KEEP_PROPS.test(prop)) continue;
    const nv = val.replace(COLOR_RX, (c) => (!only || only(c) ? variantColor(c, v) : c));
    COLOR_RX.lastIndex = 0;
    if (nv !== val) {
      changed = true;
      decls.push(`${prop}: ${nv}${st.getPropertyPriority(prop) ? ' !important' : ''}`);
    }
  }
  return changed ? `${selector} { ${decls.join('; ')} }` : '';
}
/**
 * A témaválasztó mintájának (.theme-swatch[data-preview]) átszínezett másolata egy változathoz → CSS-szöveg; a
 * változat-gombokon egyszerre több változat látszik, ezért itt másolat kell (a mintán nincs más szabály, ami ütközne).
 */
function swatchCss(theme, v) {
  const pSel = `[data-preview="${theme}"]`;
  const vSel = `${pSel}[data-pvariant="${v.id}"]`;
  if (v.tint != null) {
    const acc = fmt([...oklchToRgb(0.62, 0.17, v.tint), 1]);
    return `${vSel} i:first-child { background: ${acc} }`;
  }
  const out = [];
  for (const sheet of document.styleSheets) {
    if (sheet.ownerNode?.id === 'theme-variant-preview') continue;
    let rules;
    try {
      rules = sheet.cssRules;
    } catch {
      continue;
    }
    for (const { rule, media } of styleRules(rules)) {
      const sel = rule.selectorText || '';
      if (!sel.includes(pSel)) continue;
      const css = recolorRule(rule, sel.split(pSel).join(vSel), v);
      if (css) out.push(media ? `@media ${media} { ${css} }` : css);
    }
  }
  return out.join('\n');
}

// A változat a téma meglévő szabályainak színeit HELYBEN módosítja (és az eredetit megjegyzi): így a szabályok
// sorrendje és erőssége pontosan marad – egy erősebb szelektorú másolat felülírná a téma más, át nem színezett
// szabályait is (pl. a kitöltött „elsődleges” gombot egy halvány általános gombháttér).
const saved = []; // [{ style, prop, value, prio }]
let applied = '';
function restore() {
  for (const s of saved) s.style.setProperty(s.prop, s.value, s.prio);
  saved.length = 0;
  document.body.style.removeProperty('--accent');
  document.body.style.removeProperty('--accent-2');
}
function recolorInPlace(style, v, only) {
  for (let i = 0; i < style.length; i++) {
    const prop = style[i];
    if (KEEP_PROPS.test(prop)) continue;
    const val = style.getPropertyValue(prop);
    if (!COLOR_RX.test(val)) continue;
    COLOR_RX.lastIndex = 0;
    const nv = val.replace(COLOR_RX, (c) => (!only || only(c) ? variantColor(c, v) : c));
    COLOR_RX.lastIndex = 0;
    if (nv === val) continue;
    const prio = style.getPropertyPriority(prop);
    saved.push({ style, prop, value: val, prio });
    style.setProperty(prop, nv, prio);
  }
}
/** Az aktív változat alkalmazása (null: az eredeti színek). */
export function applyVariantCss(theme, variant) {
  const key = variant ? `${theme}|${variant.id}` : '';
  if (key === applied) return;
  restore();
  applied = key;
  if (!variant) return;
  if (variant.tint != null) {
    // fekete-fehér témánál: színes kiemelő (a téma többi része marad)
    const light = document.body.dataset.tone === 'light';
    document.body.style.setProperty('--accent', fmt([...oklchToRgb(light ? 0.55 : 0.66, 0.17, variant.tint), 1]));
    document.body.style.setProperty('--accent-2', fmt([...oklchToRgb(light ? 0.62 : 0.74, 0.15, variant.tint2 ?? variant.tint), 1]));
    return;
  }
  const tSel = `[data-theme="${theme}"]`;
  // (az általános szabályok piros családja a változat főszínére – a téma első színpárjának célja)
  const baseV = { map: [[BASE_HUE, variant.base ?? variant.map[0][1]]], chroma: variant.chroma };
  for (const sheet of document.styleSheets) {
    if (sheet.ownerNode?.id === 'theme-variant-preview') continue;
    let rules;
    try {
      rules = sheet.cssRules;
    } catch {
      continue;
    }
    for (const { rule } of styleRules(rules)) {
      const sel = rule.selectorText || '';
      if (KEEP_SEL.test(sel)) continue;
      if (sel.includes(tSel)) recolorInPlace(rule.style, variant);
      // általános szabály (a :root változói is): csak a piros család – a téma saját szabálya továbbra is erősebb
      else if (!/data-theme|data-preview/.test(sel) && (rule.style.cssText.match(COLOR_RX) || []).some(nearBase)) recolorInPlace(rule.style, baseV, nearBase);
    }
  }
}
/** A témaválasztó mintáinak változatai egy külön stíluslapban (minden változat egyszerre, a gombokhoz). */
export function showPreviewCss(theme, variants) {
  let el = document.getElementById('theme-variant-preview');
  if (!el) {
    el = document.createElement('style');
    el.id = 'theme-variant-preview';
    document.head.append(el);
  }
  el.textContent = variants.map((v) => swatchCss(theme, v)).join('\n');
}
