// Többnyelvűség. A forrásnyelv a magyar: a t() kulcsa maga a magyar szöveg (gettext-stílus), a többi
// nyelv szótára ezt fordítja (src/i18n/<nyelv>.js, nyilvántartás: src/i18n/index.js). Hiányzó
// fordításnál az angol szöveg jelenik meg, ha az sincs, a magyar.
//  - Paraméter: _t('Még {n} perc', { n: 5 }) – a {név} helyére kerül az érték (a fordításban is így).
//  - A nyelv az egész lap élettartamára rögzített (váltáskor újratöltés), ezért a modulok betöltésekor
//    számolt szövegek (állandók) is a jó nyelven készülnek: a nyelvet szinkron olvassuk (localStorage).
import DICTS from '../i18n/index.js';

/**
 * A választható nyelvek: { id, name (saját nyelvén), locale (formázás), country, epg, city, fx, nameday,
 * news, wiki } – a nyelvfájl "@lang" adatai; a hiányzó mezők az angolból jönnek.
 */
export const LANGS = Object.keys(DICTS).map((id) => ({ ...DICTS.en['@lang'], ...DICTS[id]['@lang'], id }));
const KEY = 'adas-lang';

function readLang() {
  try {
    const l = localStorage.getItem(KEY);
    if (LANGS.some((x) => x.id === l)) return l;
  } catch {}
  return '';
}

/** Mentett nyelv; üres, ha még nem választottak (első indítás – a varázsló kérdezi meg). */
export const savedLang = readLang();
/** Az aktuális nyelv (mentett, különben a magyar – a korábbi telepítések magyarul folytatják). */
export const lang = savedLang || 'hu';
export const LANG = LANGS.find((x) => x.id === lang);
/** Dátum- és számformázáshoz (toLocaleDateString, Intl…) */
export const LOCALE = LANG.locale;
const own = lang === 'hu' ? null : DICTS[lang];
const fallback = lang === 'hu' ? null : DICTS.en;

/** A rendszer nyelvéből javasolt nyelv (az első indításkor ez van kijelölve). */
export function suggestedLang() {
  const nav = String(navigator.language || '').slice(0, 2).toLowerCase();
  return LANGS.some((x) => x.id === nav) ? nav : 'en';
}

/** Fordítás. vars: { név: érték } a {név} helyőrzőkhöz. */
// Azonos magyar szöveg más-más jelentésben: „szöveg@@környezet” kulcs (a magyar felület a @@ előtti részt mutatja).
export function _t(s, vars) {
  let r = (own && own[s]) || (fallback && fallback[s]) || (s.includes('@@') ? s.slice(0, s.indexOf('@@')) : s);
  if (vars) r = r.replace(/\{(\w+)\}/g, (m, k) => (Object.prototype.hasOwnProperty.call(vars, k) ? String(vars[k]) : m));
  return r;
}

/** Számtól függő alak (magyarban nincs többes szám a szám után; más nyelvekben a „{n} …” fordítás dönt). */
export function _tn(n, one, many, vars = {}) {
  return _t(n === 1 ? one : many, { n, ...vars });
}

/** A hét napjainak neve a felület nyelvén, vasárnappal kezdve (a Date#getDay sorrendje). style: 'long' | 'short' */
export function weekdayNames(style = 'long') {
  const f = new Intl.DateTimeFormat(LOCALE, { weekday: style });
  // 2023. január 1. vasárnap volt
  return Array.from({ length: 7 }, (_, i) => f.format(new Date(2023, 0, 1 + i)));
}

/** Nyelv neve a felület nyelvén (pl. 'de' → „német” / „German”); ismeretlennél a kód. */
export function languageName(code) {
  try {
    return new Intl.DisplayNames([LOCALE], { type: 'language' }).of(code) || code;
  } catch {
    return code;
  }
}

/** Nyelv mentése (újratöltés nélkül – a hívó dönti el, mikor tölt újra). */
/** → sikerült-e menteni (nem írható tárolónál false). */
export function saveLang(l) {
  if (!LANGS.some((x) => x.id === l)) return false;
  try {
    localStorage.setItem(KEY, l);
    return true;
  } catch {
    return false;
  }
}

/**
 * Nyelvváltás: mentés, értesítés (az app.js a beállításokba és a főfolyamatnak is továbbadja), majd
 * újratöltés – a felület minden szövege az új nyelven épül fel újra. Ha a választás nem menthető,
 * nem tölt újra (különben a régi nyelvvel indulna). → sikerült-e menteni
 */
export function setLanguage(l, { reload = true } = {}) {
  if (!LANGS.some((x) => x.id === l)) return false;
  const saved = saveLang(l);
  try {
    window.dispatchEvent(new CustomEvent('adas-lang', { detail: l }));
  } catch {}
  if (reload && saved && l !== lang) setTimeout(() => location.reload(), 150);
  return saved;
}

/** A lap elemeinek fordítása: data-i18n (szöveg), data-i18n-title, data-i18n-aria, data-i18n-ph (placeholder). */
export function translateDom(root = document) {
  if (lang === 'hu') return;
  root.querySelectorAll('[data-i18n]').forEach((el) => (el.textContent = _t(el.dataset.i18n || el.textContent.trim())));
  for (const [attr, prop] of [['title', 'i18nTitle'], ['aria-label', 'i18nAria'], ['placeholder', 'i18nPh']])
    root.querySelectorAll(`[data-${prop.replace(/[A-Z]/g, (c) => '-' + c.toLowerCase())}]`).forEach((el) => el.setAttribute(attr, _t(el.dataset[prop])));
}
