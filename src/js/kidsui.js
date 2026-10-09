// Beállítások → Tartalom és gyerekek → Gyerekprofilok: mit nézhetnek a gyerekprofilok (csatornák, VOD) – profilonként külön
// kapcsolóval –, és a közös gyerektartalom-jelölés.
import { esc, norm, toast, debounce } from './util.js';
import { store } from './store.js';
import { catalog, countryName } from './catalog.js';
import { vod, own } from './vod.js';
import { isKidsChannel, isKidsVod, kidsAllowed, setKidsMark, setKidsAllowed, kidsMark } from './kids.js';
import { limitsHtml, bindLimits } from './watchtime.js';

import { _t } from './i18n.js';
const LIMIT = 150;
// filter: 'kids' | 'all' | 'allowed:<profilId>' | 'denied:<profilId>'
const state = { kind: 'ch', filter: 'kids', q: '' };

export function renderKidsSettings(box) {
  const kidsProfiles = store.profiles.filter((p) => p.kids);
  const me = store.profile;
  box.innerHTML = `<h2>${_t('Gyerekprofilok – mit nézhetnek?')} <button class="help-link" data-help="kids" title="${_t('Súgó')}">?</button></h2>
    <p class="muted">${_t('A gyerekprofilok alapból a <b>gyerektartalmat</b> nézhetik: a Gyerek / Animáció / Családi / Oktatás kategóriájú csatornákat és a gyerek- / családi filmeket, sorozatokat. A <b>Gyerektartalom</b> jelölés minden profilban közös (az adatlapokon is állítható); a jobb oldali kapcsolókkal <b>gyerekprofilonként külön</b> megadhatod, ki mit nézhet.')}</p>
    <div class="kids-lim"></div>
    <div class="kids-ui"></div>`;
  const ui = box.querySelector('.kids-ui');
  if (!kidsProfiles.length) {
    ui.innerHTML = `<p class="muted small">${_t('Nincs gyerekprofil. Profil hozzáadásakor kapcsold be a <i>Gyerekprofil</i> lehetőséget.')}</p>`;
    return;
  }
  // Gyerekprofilban (PIN-nel nyitott beállítások) csak a saját profil állítható
  const profs = me.kids ? [me] : kidsProfiles;
  const lim = box.querySelector('.kids-lim');
  lim.innerHTML = `<h3>${_t('Napi nézési idő és korhatár')}</h3>` + limitsHtml(profs) + `<h3>${_t('Mit nézhetnek?')}</h3>`;
  bindLimits(lim);
  if (/^(allowed|denied):/.test(state.filter) && !profs.some((p) => p.id === state.filter.split(':')[1])) state.filter = 'kids';

  const draw = () => {
    const items = state.kind === 'ch' ? catalog.channels.filter((c) => !c.nsfw) : [...vod.series, ...vod.movies, ...own.series, ...own.movies];
    const isKids = (x) => (state.kind === 'ch' ? isKidsChannel(x) : isKidsVod(x));
    const tokens = norm(state.q).split(/\s+/).filter(Boolean);
    const match = (x) => !tokens.length || tokens.every((t) => (x.search || norm(x.name || x.title)).includes(t));
    const [fk, fid] = state.filter.split(':');
    const fp = profs.find((p) => p.id === fid);
    const keep = (x) => (fk === 'all' ? true : fk === 'kids' ? isKids(x) : fk === 'allowed' ? kidsAllowed(fp, state.kind, x) : !kidsAllowed(fp, state.kind, x));
    const filtered = items.filter((x) => match(x) && keep(x));
    const sub = (x) =>
      state.kind === 'ch' ? [countryName(x.country), x.categories.slice(0, 2).join(', ')].filter(Boolean).join(' · ') : [x.type === 'series' ? _t('sorozat') : _t('film'), x.groups.slice(0, 3).join(', ')].filter(Boolean).join(' · ');
    const vodLoading = state.kind === 'vod' && !vod.ready;
    ui.innerHTML = `
      <div class="filters kids-filters">
        <div class="tabs"><button class="tab ${state.kind === 'ch' ? 'active' : ''}" data-k-kind="ch">${_t('TV-csatornák')}</button><button class="tab ${state.kind === 'vod' ? 'active' : ''}" data-k-kind="vod">${_t('VOD')}</button></div>
        <select data-k="filter" aria-label="${_t('Mutasd')}">
          <option value="kids" ${state.filter === 'kids' ? 'selected' : ''}>${_t('Gyerektartalom')}</option>
          <option value="all" ${state.filter === 'all' ? 'selected' : ''}>${_t('Minden')}</option>
          ${profs.map((p) => `<option value="allowed:${esc(p.id)}" ${state.filter === 'allowed:' + p.id ? 'selected' : ''}>${_t('Amit {esc} nézhet', { esc: esc(p.name) })}</option><option value="denied:${esc(p.id)}" ${state.filter === 'denied:' + p.id ? 'selected' : ''}>${_t('Amit {esc} nem nézhet', { esc: esc(p.name) })}</option>`).join('')}
        </select>
        <input class="input" type="search" data-k="q" placeholder="${_t('Keresés…')}" value="${esc(state.q)}" />
      </div>
      ${vodLoading ? `<p class="muted small">${_t('A VOD-listák még töltődnek…')}</p>` : ''}
      <p class="muted small">${_t('{length} találat', { length: filtered.length })}${filtered.length > LIMIT ? ` ${_t('– az első {LIMIT} látszik, szűkíts kereséssel', { LIMIT })}` : ''}</p>
      <div class="kids-bulk">${profs
        .map((p) => `<span class="kb-prof"><b>${esc(p.name)}:</b> <button class="btn small" data-k-all="1" data-p="${esc(p.id)}">${_t('Mind nézheti')}</button><button class="btn small" data-k-all="0" data-p="${esc(p.id)}">${_t('Egyiket sem')}</button><button class="btn small" data-k-all="reset" data-p="${esc(p.id)}">${_t('Alapértelmezés')}</button></span>`)
        .join('')}<small class="muted">${_t('(a fenti listában szereplő tételekre)')}</small></div>
      <ul class="kids-list">${filtered
        .slice(0, LIMIT)
        .map(
          (x) => `<li data-id="${esc(x.id)}">
          <span class="kl-name"><b>${esc(x.name || x.title)}</b><small>${esc(sub(x))}${kidsMark(state.kind, x.id) !== undefined ? ` ${_t('· kézzel jelölve')}` : ''}</small></span>
          <label class="kl-sw"><input type="checkbox" class="switch" data-k-mark ${isKids(x) ? 'checked' : ''} ${me.kids ? 'disabled' : ''} /><small>${_t('Gyerektartalom')}</small></label>
          ${profs.map((p) => `<label class="kl-sw" title="${_t('{esc} nézheti-e', { esc: esc(p.name) })}"><input type="checkbox" class="switch" data-k-allow="${esc(p.id)}" ${kidsAllowed(p, state.kind, x) ? 'checked' : ''} /><small>${esc(p.name)}</small></label>`).join('')}
        </li>`
        )
        .join('')}</ul>`;
    ui._filtered = filtered;
  };
  const find = (id) => (state.kind === 'ch' ? catalog.byId.get(id) : vod.byId.get(id) || own.byId.get(id));
  const prof = (id) => store.profiles.find((p) => p.id === id);
  ui.addEventListener('change', (e) => {
    e.stopPropagation();
    const t = e.target;
    const li = t.closest('li[data-id]');
    if (t.dataset.k === 'filter') state.filter = t.value;
    else if (li && t.matches('[data-k-mark]')) setKidsMark(state.kind, find(li.dataset.id), t.checked);
    else if (li && t.matches('[data-k-allow]')) {
      setKidsAllowed(prof(t.dataset.kAllow), state.kind, find(li.dataset.id), t.checked);
      return;
    } else return;
    draw();
  });
  ui.addEventListener(
    'input',
    debounce((e) => {
      if (e.target.dataset.k !== 'q') return;
      state.q = e.target.value;
      draw();
      const inp = ui.querySelector('[data-k="q"]');
      inp?.focus();
      inp?.setSelectionRange(state.q.length, state.q.length);
    }, 300)
  );
  ui.addEventListener('click', (e) => {
    const kind = e.target.closest('[data-k-kind]');
    const all = e.target.closest('[data-k-all]');
    if (kind) {
      e.stopPropagation();
      state.kind = kind.dataset.kKind;
      draw();
    } else if (all) {
      e.stopPropagation();
      const v = all.dataset.kAll;
      const p = prof(all.dataset.p);
      for (const x of ui._filtered || []) setKidsAllowed(p, state.kind, x, v === 'reset' ? null : v === '1');
      toast(`${_t('{name}: {length} tétel –', { name: p.name, length: (ui._filtered || []).length })} ${v === 'reset' ? _t('alapértelmezés') : v === '1' ? _t('nézheti') : _t('nem nézheti')}`);
      draw();
    }
  });
  draw();
}
