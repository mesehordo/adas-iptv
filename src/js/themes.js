// Felületstílusok (profilonként választható) és a főoldali sorok sorrendje.
import { store } from './store.js';
import { categoryName, countryName } from './catalog.js';

import { _t } from './i18n.js';
/**
 * Minden stílus ugyanazzal az elrendezéssel (felső menüsáv, azonos kártyaméretek);
 * a stílus csak a kinézetet adja (színek, betűk, keretek, árnyékok, minták) – themes.css, body[data-theme].
 */
export const THEMES = {
  netflix: {
    label: 'Kurenai',
    desc: _t('Kurenai (bíborvörös): az esti mozi hangulata – fekete háttér, vörös kiemelés, rámutatásra kinagyuló kártyák.'),
  },
  disney: {
    label: 'Mahō',
    desc: _t('Mahō (varázslat): mesés, csillagos mélykék színátmenet, fénylő keretes, lekerekített kártyák.'),
  },
  skyshowtime: {
    label: 'Murasaki',
    desc: _t('Murasaki (bíbor): sötét alap lila–rózsaszín színátmenetekkel és fénylő kiemeléssel.'),
  },
  rakuten: {
    label: 'Akane',
    desc: _t('Akane (mélyvörös): fekete alap, vörös jelölések, nagybetűs sorcímek – mozivászon-hangulat.'),
  },
  prime: {
    label: 'Shinkai',
    desc: _t('Shinkai (mélytenger): sötét éjkék háttér, tengerkék kiemelés.'),
  },
  apple: {
    label: 'Garasu',
    desc: _t('Garasu (üveg): mélyfekete háttér, áttetsző, elmosott üvegfelületek, lebegő árnyékok, letisztult betűk.'),
  },
  zen: {
    label: 'Zen',
    desc: _t('Zen: világos rizspapír-háttér, mohazöld kiemelés, sok levegő és csendes, lassú mozgások.'),
    light: true,
  },
  wabisabi: {
    label: 'Wabi-sabi',
    desc: _t('Wabi-sabi: meleg, földszínű papírtextúra, kissé szabálytalan, kézműves kártyák, arany kintsugi-repedés.'),
    light: true,
  },
  nintendo: {
    label: 'Asobiba',
    desc: _t('Asobiba (játszótér): világos, csíkos háttér, fehér keretes buborékkártyák, ruganyos mozgás – játékbolt-hangulat.'),
    light: true,
  },
  switch: {
    label: 'Futago',
    desc: _t('Futago (ikrek): kézikonzol-menü – sötétszürke alap, piros–kék kontrollerpár, szögletes csempék türkiz kerettel.'),
  },
  wii: {
    label: 'Hiroba',
    desc: _t('Hiroba (tér): a „csatornás” konzolmenü – fehér, finoman csíkos háttér, fényes, szürke keretes csempék.'),
    light: true,
  },
  cyberpunk: {
    label: 'Neon City',
    desc: _t('Neon City: éjszakai neonváros – neonsárga, cián és bíbor, levágott sarkú kártyák, pásztázó sorok, „glitch”.'),
  },
  neotokyo: {
    label: 'Neo-Tokyo',
    desc: _t('Neo-Tokyo: az AKIRA világa – éjszakai romváros sziluettje, Kaneda-vörös, száguldó motorfény-csíkok, fehér kapszula-jelvény, döntött tömbös címbetűk.'),
  },
  manga: {
    label: 'Manga',
    desc: _t('Manga: fekete tus fehér papíron – rasztertónus, vastag panelkeretek, beszédbuborék-gombok, dőlt tömör címek.'),
    light: true,
  },
  comic: {
    label: 'Pow!',
    desc: _t('Pow!: amerikai képregény – Ben-Day pöttyök, vörös–sárga–kék, vastag fekete kontúr eltolt árnyékkal, sárga szövegdobozok, „POW!” csillagrobbanás.'),
    light: true,
  },
  snes: {
    label: '16-Bit',
    desc: _t('16-Bit: a 90-es évek szürke konzolja – lila gombok, színes A–B–X–Y pöttyök, pixeles keretek és képernyő-pásztázás, kockás betűk.'),
    light: true,
  },
  bauhaus: {
    label: 'Kikagaku',
    desc: _t('Kikagaku (geometria): plakátművészet – törtfehér papír, vörös–kék–sárga–fekete, vastag keretek kemény árnyékkal.'),
    light: true,
  },
  aurora: {
    label: 'Kyokkō',
    desc: _t('Kyokkō (sarki fény): lassan hullámzó színes háttér, matt üveg kártyák és lágy fénylés.'),
  },
  sketch: {
    label: 'Rakugaki',
    desc: _t('Rakugaki (firka): vonalas füzetlap kézírással – a csatornák beragasztott polaroid fotók, ceruzás keretek.'),
    light: true,
  },
  terminal: {
    label: 'Phosphor',
    desc: _t('Phosphor: régi zöld foszforos monitor – fix szélességű betűk, parancssori feliratok, inverz kijelölés.'),
  },
};

export function currentTheme() {
  const id = store.profile?.theme;
  return THEMES[id] ? id : 'netflix';
}

export function applyTheme() {
  const id = currentTheme();
  const t = THEMES[id];
  const def = t.custom;
  // Saját téma: a body egy beépített témára (vagy semmire) épül, a saját színek / CSS a data-custom alatt
  document.body.dataset.theme = def ? (def.base && THEMES[def.base] && !THEMES[def.base].custom ? def.base : 'custom') : id;
  if (def) document.body.dataset.custom = def.id;
  else delete document.body.dataset.custom;
  document.body.dataset.layout = 'top'; // minden stílus ugyanazzal az elrendezéssel (felső menüsáv)
  document.body.dataset.tone = (def ? def.tone === 'light' : t.light) ? 'light' : 'dark';
  let style = document.getElementById('custom-theme-css');
  if (!style) {
    style = document.createElement('style');
    style.id = 'custom-theme-css';
    document.head.append(style);
  }
  style.textContent = def ? def.compiled : '';
}

// ---------------------------------------------------------------------------
// Saját témák (téma-fájl: JSON) – a leírás: Súgó → Saját téma készítése, docs/TEMA-KESZITES.md
// ---------------------------------------------------------------------------
export const THEME_FORMAT = 1;
const COLOR_VARS = { bg: '--bg', bg2: '--bg-2', bg3: '--bg-3', bg4: '--bg-4', line: '--line', text: '--text', textStrong: '--text-strong', muted: '--muted', accent: '--accent', accent2: '--accent-2' };
// Az elrendezést befolyásoló tulajdonságok – egy téma ezeket nem módosíthatja (minden téma ugyanazzal az elrendezéssel)
const LAYOUT_PROPS = /^(width|height|min-width|min-height|max-width|max-height|margin(-[a-z-]+)?|padding(-[a-z-]+)?|top|bottom|left|right|inset(-[a-z-]+)?|gap|row-gap|column-gap|display|flex(-[a-z-]+)?|grid(-[a-z-]+)?|order|aspect-ratio|font-size|line-height|columns|float|zoom|white-space|-webkit-line-clamp|align-[a-z-]+|justify-[a-z-]+|place-[a-z-]+|visibility|scroll-[a-z-]+|overflow(-[xy])?|box-sizing|contain|content-visibility|--card-w|--gutter|--rail)$/;
const BAD_VALUE = /javascript:|expression\s*\(|@import|behavior\s*:|-moz-binding/i;
const safeValue = (v) => typeof v === 'string' && v.length < 600 && !BAD_VALUE.test(v) && !/[{};<>]/.test(v);

/** Deklarációk szűrése: elrendezés nélkül (kivéve ::before/::after díszítésnél), veszélyes érték nélkül. */
function cleanDecls(body, selector) {
  const pseudo = /::?(before|after)\b/.test(selector);
  return body
    .split(';')
    .map((d) => d.trim())
    .filter((d) => {
      const i = d.indexOf(':');
      if (i < 1) return false;
      const prop = d.slice(0, i).trim().toLowerCase();
      const val = d.slice(i + 1).trim();
      if (BAD_VALUE.test(val)) return false;
      if (!pseudo && LAYOUT_PROPS.test(prop)) return false;
      if (!pseudo && prop === 'position' && !/^relative/i.test(val)) return false;
      return true;
    })
    .join('; ');
}

/** A téma CSS-ének hatóköre: minden szabály a body[data-custom="id"] alá kerül („&” = maga a body). */
function scopeCss(css, root) {
  css = String(css || '').replace(/\/\*[\s\S]*?\*\//g, '');
  let out = '';
  let i = 0;
  const readBlock = (from) => {
    let depth = 0;
    for (let j = from; j < css.length; j++) {
      if (css[j] === '{') depth++;
      else if (css[j] === '}' && --depth === 0) return j;
    }
    return css.length;
  };
  while (i < css.length) {
    const open = css.indexOf('{', i);
    if (open < 0) break;
    const head = css.slice(i, open).trim();
    const close = readBlock(open);
    const inner = css.slice(open + 1, close);
    i = close + 1;
    if (/^@import/i.test(head)) continue;
    if (/^@media|^@supports/i.test(head)) out += `${head}{${scopeCss(inner, root)}}\n`;
    else if (/^@keyframes|^@-webkit-keyframes|^@font-face/i.test(head)) {
      if (!BAD_VALUE.test(inner)) out += `${head}{${inner}}\n`;
    } else if (!head.startsWith('@')) {
      const sel = head
        .split(',')
        .map((s) => s.trim())
        // mezőértékeket vizsgáló attribútum-szelektor nem lehet (pl. [value^="a"] + háttérkép → adatszivárgás)
        .filter((s) => s && !/\[\s*(value|data-ht|data-sw-key|placeholder)\b/i.test(s))
        .map((s) => (s.includes('&') ? s.replace(/&/g, root) : /^(html|body)\b/.test(s) ? s.replace(/^(html|body)/, root) : `${root} ${s}`))
        .join(', ');
      const decls = cleanDecls(inner, head);
      if (sel && decls) out += `${sel} { ${decls} }\n`;
    }
  }
  return out;
}

/** Téma-fájl (JSON szöveg) → ellenőrzött téma-leírás; hibánál kivételt dob, magyar üzenettel. */
export function parseThemeFile(text, source = '') {
  let j;
  try {
    j = JSON.parse(String(text).replace(/^﻿/, ''));
  } catch (err) {
    throw new Error(`${_t('Hibás JSON (')}${source || _t('téma-fájl')}): ${err.message}`);
  }
  if (!j || typeof j !== 'object' || (j.adasTheme !== THEME_FORMAT && j.adasTheme !== String(THEME_FORMAT))) throw new Error(_t('Ez nem Adás téma-fájl (hiányzik: "adasTheme": 1).'));
  const id = String(j.id || '').toLowerCase();
  if (!/^[a-z0-9][a-z0-9-]{1,39}$/.test(id)) throw new Error(_t('Az "id" 2–40 karakter lehet: kisbetű, számjegy, kötőjel.'));
  const name = String(j.name || '').trim().slice(0, 40);
  if (!name) throw new Error(_t('Hiányzik a téma neve ("name").'));
  const root = `body[data-custom="${id}"]`;
  const vars = [];
  for (const [k, v] of Object.entries(j.colors || {})) if (COLOR_VARS[k] && safeValue(v)) vars.push(`${COLOR_VARS[k]}: ${v}`);
  if (safeValue(j.fonts?.body)) vars.push(`--font: ${j.fonts.body}`);
  if (safeValue(j.radius)) vars.push(`--radius: ${j.radius}`);
  let compiled = `${root} { ${vars.join('; ')}${safeValue(j.background) ? `; background: ${j.background}` : j.colors?.bg && safeValue(j.colors.bg) ? `; background: ${j.colors.bg}` : ''} }\n`;
  if (safeValue(j.fonts?.headings)) compiled += `${root} h1, ${root} h2, ${root} h3, ${root} .row-title, ${root} .dc-title, ${root} .hero h1, ${root} .brand { font-family: ${j.fonts.headings} }\n`;
  if (j.css) {
    if (String(j.css).length > 200000) throw new Error(_t('A téma CSS-e túl hosszú (legfeljebb 200 000 karakter).'));
    compiled += scopeCss(j.css, root);
  }
  const preview = (Array.isArray(j.preview) ? j.preview : [j.colors?.bg, j.colors?.accent, j.colors?.bg3 || j.colors?.bg2]).filter(safeValue).slice(0, 3);
  return {
    id,
    key: 'c:' + id,
    name,
    description: String(j.description || '').slice(0, 300),
    author: String(j.author || '').slice(0, 80),
    tone: j.tone === 'light' ? 'light' : 'dark',
    base: typeof j.base === 'string' ? j.base : '',
    preview,
    compiled,
    source,
    raw: j,
  };
}

/** Saját témák felvétele a választható stílusok közé (a korábbiak cseréjével). */
export function registerCustomThemes(defs) {
  for (const k of Object.keys(THEMES)) if (THEMES[k].custom) delete THEMES[k];
  for (const d of defs) THEMES[d.key] = { label: d.name, desc: `${d.description || _t('Saját téma.')}${d.author ? ` – ${d.author}` : ''}`, light: d.tone === 'light', custom: d };
}

// ---------------------------------------------------------------------------
// Főoldali sorok
// ---------------------------------------------------------------------------
export const CATEGORY_ROWS = [
  'news', 'sports', 'movies', 'series', 'entertainment', 'kids', 'animation', 'music', 'documentary', 'general',
  'comedy', 'lifestyle', 'cooking', 'travel', 'science', 'culture', 'classic', 'business', 'outdoor', 'family',
  'education', 'auto', 'weather', 'religious', 'legislative', 'public', 'relax', 'shop', 'interactive', 'other',
];

// A főoldal a tévéé: a filmek / sorozatok „Folytatás” sora a VOD-oldalon van.
const DEFAULT_ROWS = [
  'recent', 'favorites', 'onair', 'home', 'custom',
  'cat:news', 'cat:sports', 'countries',
  ...CATEGORY_ROWS.filter((c) => c !== 'news' && c !== 'sports').map((c) => 'cat:' + c),
  'cattiles',
];
const DEFAULT_OFF = new Set(['cattiles']);

export function rowLabel(key) {
  if (key.startsWith('cat:')) return categoryName(key.slice(4));
  return {
    recent: _t('Legutóbb nézett'),
    favorites: _t('Kedvenceid'),
    onair: _t('Most a TV-ben'),
    home: _t('{country} csatornái', { country: countryName(store.settings.homeCountry) || _t('Hazai') }),
    custom: _t('Listák soronként (Pluto TV, Free-TV, saját listák…)'),
    countries: _t('Fedezz fel országokat'),
    cattiles: _t('Kategóriák (csempék)'),
  }[key] || key;
}

/** A profil sorai a mentett sorrendben; az új (még nem mentett) sorok a végére kerülnek. */
export function profileRows(profile = store.profile) {
  const saved = Array.isArray(profile.rows) ? profile.rows.filter((r) => DEFAULT_ROWS.includes(r.key)) : [];
  const known = new Set(saved.map((r) => r.key));
  const missing = DEFAULT_ROWS.filter((k) => !known.has(k)).map((key) => ({ key, on: !DEFAULT_OFF.has(key) }));
  return [...saved, ...missing];
}

export function defaultRows() {
  return DEFAULT_ROWS.map((key) => ({ key, on: !DEFAULT_OFF.has(key) }));
}
