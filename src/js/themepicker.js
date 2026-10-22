// Témaválasztó: a témák mintái és a kiválasztott téma színváltozatai (az eredetivel együtt). A Beállítások →
// Megjelenés, az első indítás varázslója és a profilszerkesztő is ezt használja.
import { THEMES, themeVariants } from './themes.js';
import { showPreviewCss } from './themevariants.js';
import { esc, isLightColor } from './util.js';
import { _t } from './i18n.js';

/** Egy téma mintája (a stíluslap [data-preview] szabályai rajzolják; saját témánál a megadott színek). */
export function themeSwatchHtml(id, sel = false, attrs = '') {
  const t = THEMES[id];
  const cp = t.custom?.preview || [];
  return `<button type="button" class="theme-swatch ${sel ? 'sel' : ''} ${isLightColor(cp[0]) ? 'light' : ''}" data-theme-pick="${esc(id)}" data-preview="${esc(id)}" title="${esc(t.label)}" ${cp[0] ? `style="background:${esc(cp[0])}"` : ''} ${attrs}><i ${cp[1] ? `style="background:${esc(cp[1])}"` : ''}></i><i ${cp[2] ? `style="background:${esc(cp[2])}"` : ''}></i><i></i><span>${esc(t.label)}</span></button>`;
}

/** A téma változat-gombjai (az első az eredeti) – üres, ha a témának nincs változata. */
export function variantRowHtml(theme, variant = '') {
  const vs = themeVariants(theme);
  if (!vs.length) return '';
  const chip = (vid, label) =>
    `<button type="button" class="theme-swatch tv-chip ${(variant || '') === vid ? 'sel' : ''}" data-variant-pick="${esc(vid)}" data-preview="${esc(theme)}" ${vid ? `data-pvariant="${esc(vid)}"` : ''} aria-pressed="${(variant || '') === vid}"><i></i><i></i><i></i><span>${esc(label)}</span></button>`;
  return `<div class="tv-variants" role="group" aria-label="${esc(_t('Színváltozat'))}"><span class="tv-label">${esc(_t('Színváltozat'))}</span>${chip('', _t('Eredeti'))}${vs.map((v) => chip(v.id, v.family.name())).join('')}</div>`;
}

/**
 * Teljes választó (minták + változatok) egy elemben. onChange(theme, variant) minden választáskor (pl. előnézethez).
 * savedVariant(téma): a téma korábban megjegyzett változata (témaváltáskor az él tovább, nem az eredeti).
 * → { el, value(): { theme, variant } }
 */
export function themePicker({ theme = 'netflix', variant = '', compact = true, onChange = () => {}, savedVariant = () => '' } = {}) {
  if (!THEMES[theme]) theme = 'netflix';
  const el = document.createElement('div');
  el.className = 'theme-picker' + (compact ? ' compact' : '');
  const draw = () => {
    el.innerHTML = `<div class="theme-swatches">${Object.keys(THEMES).map((id) => themeSwatchHtml(id, id === theme)).join('')}</div>
      <p class="muted small tp-desc">${esc(THEMES[theme].desc)}</p>
      ${variantRowHtml(theme, variant)}`;
    showPreviewCss(theme, themeVariants(theme));
  };
  el.addEventListener('click', (e) => {
    const t = e.target.closest('[data-theme-pick]');
    const v = e.target.closest('[data-variant-pick]');
    if (t) {
      if (t.dataset.themePick === theme) return;
      theme = t.dataset.themePick;
      variant = savedVariant(theme) || '';
    } else if (v) variant = v.dataset.variantPick;
    else return;
    e.preventDefault();
    const focusKey = t ? `[data-theme-pick="${CSS.escape(theme)}"]` : `[data-variant-pick="${CSS.escape(variant)}"]`;
    draw();
    el.querySelector(focusKey)?.focus({ preventScroll: true });
    onChange(theme, variant);
  });
  draw();
  // a kijelölt téma a rácson belül látható legyen (a lap / párbeszédablak görgetése nélkül)
  requestAnimationFrame(() => {
    const grid = el.querySelector('.theme-swatches');
    const sel = grid?.querySelector('.sel');
    if (sel && grid.scrollHeight > grid.clientHeight) grid.scrollTop = Math.max(0, sel.offsetTop - grid.offsetTop - 8);
  });
  return { el, value: () => ({ theme, variant }) };
}
