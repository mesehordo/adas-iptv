// Témák színváltozatai. Egy változat a téma saját stílusszabályainak átszínezése: a színes (nem szürke) színek
// árnyalata elfordul az OKLCH színtérben – az észlelt világosság és a telítettség marad, így a szöveg ugyanúgy
// olvasható –, a fekete / fehér / szürke és az állapotszínek (működik / hiba / figyelmeztetés, felvétel) nem
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
    return (chosen || ['red', 'blue', 'green']).map((id) => FAMILIES.find((f) => f.id === id)).filter(Boolean).map((f) => ({ id: f.id, family: f, deg: 0, tint: true }));
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
  return pick.map((f) => ({ id: f.id, family: f, deg: f.hue - accentHue }));
}

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
function recolorRule(rule, selector, deg, only = null) {
  const st = rule.style;
  const decls = [];
  let changed = false;
  for (let i = 0; i < st.length; i++) {
    const prop = st[i];
    const val = st.getPropertyValue(prop);
    if (!COLOR_RX.test(val)) continue;
    COLOR_RX.lastIndex = 0;
    if (KEEP_PROPS.test(prop)) continue;
    const nv = val.replace(COLOR_RX, (c) => (!only || only(c) ? rotateColor(c, deg) : c));
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
  if (v.tint) {
    const acc = fmt([...oklchToRgb(0.62, 0.17, v.family.hue), 1]);
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
      const css = recolorRule(rule, sel.split(pSel).join(vSel), v.deg);
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
function recolorInPlace(style, deg, only) {
  for (let i = 0; i < style.length; i++) {
    const prop = style[i];
    if (KEEP_PROPS.test(prop)) continue;
    const val = style.getPropertyValue(prop);
    if (!COLOR_RX.test(val)) continue;
    COLOR_RX.lastIndex = 0;
    const nv = val.replace(COLOR_RX, (c) => (!only || only(c) ? rotateColor(c, deg) : c));
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
  if (variant.tint) {
    // fekete-fehér témánál: színes kiemelő (a téma többi része marad)
    const light = document.body.dataset.tone === 'light';
    document.body.style.setProperty('--accent', fmt([...oklchToRgb(light ? 0.55 : 0.66, 0.17, variant.family.hue), 1]));
    document.body.style.setProperty('--accent-2', fmt([...oklchToRgb(light ? 0.62 : 0.74, 0.15, variant.family.hue), 1]));
    return;
  }
  const tSel = `[data-theme="${theme}"]`;
  const baseDeg = variant.family.hue - BASE_HUE;
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
      if (sel.includes(tSel)) recolorInPlace(rule.style, variant.deg);
      // általános szabály (a :root változói is): csak a piros család – a téma saját szabálya továbbra is erősebb
      else if (!/data-theme|data-preview/.test(sel) && (rule.style.cssText.match(COLOR_RX) || []).some(nearBase)) recolorInPlace(rule.style, baseDeg, nearBase);
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
