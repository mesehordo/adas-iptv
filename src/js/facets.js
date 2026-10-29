// Pipálható szűrőpanel (a Gyűjtemény elrendezés oldalsávja) – a játékkönyvtár-alkalmazások mintájára: lenyitható
// csoportok (ország, téma, elérhetőség, minőség…), bennük pipálható értékek darabszámmal. Egy csoporton belül
// bármelyik bepipált érték elég (VAGY), a csoportok együtt szűkítenek (ÉS); az „all” csoportnál (pl. Egyéb) minden
// bepipált értéknek teljesülnie kell. A darabszám azt mutatja, hány elem maradna, ha azt az értéket is bepipálnád
// (a többi csoport mostani szűrésével). A bepipált értékek a találatok fölött címkeként is látszanak (× = törlés).
import { esc, html, norm } from './util.js';
import { _t } from './i18n.js';

const SHOWN = 8; // (csoportonként ennyi érték látszik a „Továbbiak” előtt)

/**
 * facets: [{ id, title, keys: (x) => string[], label: (k) => string, order?: string[] (rögzített sorrend),
 *   all?: bool (ÉS a csoporton belül), open?: bool (alapból nyitva) }]
 * state: { sel: { [id]: string[] }, open: { [id]: bool } } – a hívó menti (pl. profilba)
 * onChange(state): a szűrés változott (a hívó újraszámolja a találatokat a filter()-rel)
 */
export function facetPanel({ facets, items, state, onChange }) {
  state.sel ||= {};
  state.open ||= {};
  const el = html('<div class="fc-panel"></div>');
  const chips = html('<div class="fc-chips" hidden></div>');
  const more = new Set(); // (a „Továbbiak” gombbal kinyitott csoportok)
  const labels = new Map(); // facet id → (kulcs → felirat)
  let keys = []; // elemenként: csoportonként a kulcsok
  let list = [];

  const sel = (f) => state.sel[f.id] || [];
  const okIn = (f, ks) => {
    const s = sel(f);
    if (!s.length) return true;
    return f.all ? s.every((k) => ks.includes(k)) : s.some((k) => ks.includes(k));
  };
  const okExcept = (i, skip) => facets.every((f, j) => j === skip || okIn(f, keys[i][j]));
  const labelOf = (f, k) => {
    let m = labels.get(f.id);
    if (!m) labels.set(f.id, (m = new Map()));
    if (!m.has(k)) m.set(k, String(f.label ? f.label(k) : k));
    return m.get(k);
  };

  function setItems(next) {
    list = next;
    keys = list.map((x) => facets.map((f) => [...new Set((f.keys(x) || []).filter((k) => k !== '' && k != null).map(String))]));
    render();
  }

  function facetHtml(f, j) {
    const counts = new Map();
    for (let i = 0; i < list.length; i++) {
      if (!okExcept(i, j)) continue;
      for (const k of keys[i][j]) counts.set(k, (counts.get(k) || 0) + 1);
    }
    const s = sel(f);
    for (const k of s) if (!counts.has(k)) counts.set(k, 0);
    if (!counts.size) return '';
    let vals = [...counts.keys()];
    if (f.order) vals.sort((a, b) => (f.order.indexOf(a) + 1 || 999) - (f.order.indexOf(b) + 1 || 999));
    else vals.sort((a, b) => counts.get(b) - counts.get(a) || labelOf(f, a).localeCompare(labelOf(f, b)));
    // (a 0 darabos értékek csak bepipálva látszanak; a bepipáltak mindig a lista elején)
    vals = vals.filter((k) => counts.get(k) || s.includes(k));
    // (first: elöl álló értékek, pl. a saját ország)
    if (f.first) vals = [...vals.filter((k) => f.first.includes(k)), ...vals.filter((k) => !f.first.includes(k))];
    if (!f.order) vals = [...vals.filter((k) => s.includes(k)), ...vals.filter((k) => !s.includes(k))];
    const all = more.has(f.id) || vals.length <= SHOWN + 2;
    const open = state.open[f.id] ?? f.open ?? false;
    return `<details class="fc" data-fc="${esc(f.id)}" ${open || s.length ? 'open' : ''}>
      <summary><span class="fc-title">${esc(f.title)}</span>${s.length ? `<span class="fc-badge">${s.length}</span>` : ''}</summary>
      ${vals.length > 12 ? `<input class="input fc-q" type="search" placeholder="${_t('Keresés…')}" aria-label="${esc(_t('Keresés: {name}', { name: f.title }))}" />` : ''}
      <div class="fc-opts">${vals
        .map((k, i) => `<label class="uni-check fc-opt" ${!all && i >= SHOWN ? 'hidden data-fc-extra' : ''} data-fc-label="${esc(norm(labelOf(f, k)))}">
          <input type="checkbox" data-fc-k="${esc(k)}" ${s.includes(k) ? 'checked' : ''} /> <span>${esc(labelOf(f, k))}</span><small class="fc-n">${counts.get(k)}</small></label>`)
        .join('')}</div>
      ${all ? '' : `<button class="btn small fc-more" type="button">${_t('Továbbiak ({n})', { n: vals.length - SHOWN })}</button>`}
    </details>`;
  }

  function render() {
    // (a fókusz és a csoporton belüli keresés megmarad az újrarajzolás után)
    const ae = document.activeElement;
    const focus = el.contains(ae) ? { fc: ae.closest('[data-fc]')?.dataset.fc, k: ae.dataset.fcK, q: ae.classList.contains('fc-q') } : null;
    const qs = Object.fromEntries([...el.querySelectorAll('[data-fc] .fc-q')].map((q) => [q.closest('[data-fc]').dataset.fc, q.value]));
    el.innerHTML = facets.map(facetHtml).join('') + `<button class="btn small fc-reset" type="button" ${anySel() ? '' : 'hidden'}>${_t('Szűrők törlése')}</button>`;
    for (const [id, v] of Object.entries(qs)) {
      const q = el.querySelector(`[data-fc="${CSS.escape(id)}"] .fc-q`);
      if (q && v) (q.value = v), filterOpts(q);
    }
    if (focus?.fc) {
      const box = el.querySelector(`[data-fc="${CSS.escape(focus.fc)}"]`);
      const t = focus.q ? box?.querySelector('.fc-q') : focus.k != null ? box?.querySelector(`[data-fc-k="${CSS.escape(focus.k)}"]`) : box?.querySelector('summary');
      t?.focus({ preventScroll: true });
    }
    renderChips();
  }

  const anySel = () => facets.some((f) => sel(f).length);
  function renderChips() {
    const on = facets.flatMap((f) => sel(f).map((k) => [f, k]));
    chips.hidden = !on.length;
    chips.innerHTML = on.length
      ? on.map(([f, k]) => `<button class="chip on fc-chip" type="button" data-fc-chip="${esc(f.id)}" data-k="${esc(k)}" title="${esc(_t('Szűrő törlése'))}"><small>${esc(f.title)}:</small> ${esc(labelOf(f, k))} ×</button>`).join('') +
        `<button class="btn small fc-reset" type="button">${_t('Összes törlése')}</button>`
      : '';
  }

  function filterOpts(q) {
    const box = q.closest('[data-fc]');
    const t = norm(q.value.trim());
    box.querySelectorAll('.fc-opt').forEach((o) => (o.hidden = t ? !o.dataset.fcLabel.includes(t) : o.hasAttribute('data-fc-extra') && !more.has(box.dataset.fc)));
    const b = box.querySelector('.fc-more');
    if (b) b.hidden = !!t;
  }

  const changed = () => {
    render();
    onChange(state);
  };
  const toggle = (id, k, on) => {
    const s = new Set(state.sel[id] || []);
    if (on) s.add(k);
    else s.delete(k);
    if (s.size) state.sel[id] = [...s];
    else delete state.sel[id];
    changed();
  };
  const reset = () => {
    state.sel = {};
    changed();
  };

  el.addEventListener('change', (e) => {
    const k = e.target.dataset.fcK;
    if (k === undefined) return;
    toggle(e.target.closest('[data-fc]').dataset.fc, k, e.target.checked);
  });
  el.addEventListener('input', (e) => e.target.classList.contains('fc-q') && filterOpts(e.target));
  el.addEventListener('toggle', (e) => {
    const d = e.target.closest?.('[data-fc]');
    if (d === e.target) state.open[d.dataset.fc] = d.open;
  }, true);
  el.addEventListener('click', (e) => {
    if (e.target.closest('.fc-reset')) return reset();
    const b = e.target.closest('.fc-more');
    if (!b) return;
    const box = b.closest('[data-fc]');
    more.add(box.dataset.fc);
    box.querySelectorAll('[data-fc-extra]').forEach((o) => (o.hidden = false));
    b.remove();
    box.querySelector('[data-fc-extra] input')?.focus({ preventScroll: true });
  });
  chips.addEventListener('click', (e) => {
    if (e.target.closest('.fc-reset')) return reset();
    const c = e.target.closest('[data-fc-chip]');
    if (c) toggle(c.dataset.fcChip, c.dataset.k, false);
  });

  setItems(items);
  return {
    el,
    chips,
    /** A szűrőknek megfelelő elemek (az eredeti sorrendben). */
    filter: () => list.filter((_, i) => okExcept(i, -1)),
    /** Új elemlista (pl. betöltés vagy ellenőrzés után) – a bepipált értékek megmaradnak. */
    setItems,
    reset,
  };
}
