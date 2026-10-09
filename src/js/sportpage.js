// A Sport oldal (menüsor: TV, VOD mellett): élő eredmények, a tévében most futó sportműsorok, a következő
// események napokra bontva, friss eredmények és tabellák – a Sportfigyelőben követett tételekből. Mit követ
// a felhasználó, és látszik-e a menüpont: Beállítások → Sport (a Sportfigyelő ablak is onnan nyílik).
// Élő esemény közben percenként, egyébként 5 percenként frissül, amíg az oldal nyitva van.
import { esc, fmtTime, fmtDay, dayStart, dayLabel, toast, norm } from './util.js';
import { store } from './store.js';
import { catalog, channelStatus } from './catalog.js';
import { epg } from './epg.js';
import { player } from './player.js';
import { logoHtml, emptyState, ICON } from './components.js';
import { _t } from './i18n.js';
import { watchList, loadSportEvents, sportEventsCached, sportErrors, sportStale, eventRowHtml, channelFor, sportOf, sportOnTvNow, followedLeagues, loadStandings, dayLbl } from './sports.js';

const st = { sport: '', table: '', timer: 0, root: null, at: 0 };
const standings = new Map(); // bajnokság → { at, groups } | { at, err }

/** Látszik-e a Sport menüpont (beállítás; gyerekprofilban nem). */
export const sportMenuOn = () => store.settings.sportMenu !== false && !store.profile?.kids;

const here = () => !!st.root && document.body.contains(st.root) && location.hash.startsWith('#/sport');

export function renderSport(view, params) {
  st.sport = params.get('s') || '';
  const ev = sportEventsCached();
  draw(view, ev);
  // (a betöltés után újraütemezünk: ha élő esemény jött, percenként frissüljön)
  if (!ev || sportStale()) loadSportEvents().then(() => here() && (draw(view, sportEventsCached()), schedule(view)), () => {});
  schedule(view);
}

/** Frissítés ütemezése: élő esemény közben percenként (friss eredménnyel), különben 5 percenként. */
function schedule(view) {
  clearTimeout(st.timer);
  const live = (sportEventsCached() || []).some((e) => e.state === 'in');
  st.timer = setTimeout(() => {
    if (!here()) return;
    if (player.active || document.querySelector('#modal-root .modal')) return schedule(view); // (nem rajzolunk a lejátszó / ablak alatt)
    loadSportEvents(true, { live })
      .then(() => here() && draw(view, sportEventsCached()), () => {})
      .then(() => here() && schedule(view));
  }, live ? 60e3 : 5 * 60e3);
}

// a Sportfigyelőben (Beállítások → Sport) történt módosítás után
document.addEventListener('adas-sport-changed', () => {
  standings.clear();
  if (here()) loadSportEvents(true).then(() => here() && draw(st.root.parentElement, sportEventsCached()), () => {});
});

// ---------------------------------------------------------------------------
// Kirajzolás
// ---------------------------------------------------------------------------
function draw(view, events) {
  // (újrarajzoláskor a fókusz ugyanarra az elemre kerüljön vissza – távirányítóval fontos)
  const f = st.root?.contains(document.activeElement) ? document.activeElement : null;
  const fKey = f && ['play', 'spChip', 'sp', 'remCh', 'spTable'].map((k) => (f.dataset[k] !== undefined ? `[data-${k.replace(/[A-Z]/g, (c) => '-' + c.toLowerCase())}="${CSS.escape(f.dataset[k])}"]` : '')).find(Boolean);
  const watched = watchList().filter((w) => w.on !== false);
  const all = events || [];
  // sportágválasztó: a követett tételek és az események sportágai
  const sports = [...new Set([...watched.map((w) => w.sport), ...all.map((e) => e.sport)])].filter(Boolean);
  if (st.sport && !sports.includes(st.sport)) st.sport = '';
  const list = all.filter((e) => !st.sport || e.sport === st.sport);
  const live = list.filter((e) => e.state === 'in');
  const next = list.filter((e) => e.state === 'pre').sort((a, b) => a.start - b.start).slice(0, 40);
  const done = list.filter((e) => e.state === 'post').sort((a, b) => b.start - a.start).slice(0, 20);
  const errs = Object.keys(sportErrors() || {}).length;
  const leagues = followedLeagues().filter((l) => !st.sport || l.sport === st.sport);
  const chanOn = store.settings.sportChannels !== false;

  const chips = sports.length > 1
    ? `<div class="sp-chips" role="tablist">${[['', '🏆', _t('Mind')], ...sports.sort((a, b) => sportOf(a).name.localeCompare(sportOf(b).name)).map((s) => [s, sportOf(s).ico, sportOf(s).name])]
        .map(([id, ico, name]) => {
          const n = id ? all.filter((e) => e.sport === id).length : all.length;
          return `<button class="sw-chip ${st.sport === id ? 'on' : ''}" data-sp-chip="${esc(id)}" role="tab" aria-selected="${st.sport === id}">${ico} ${esc(name)}${n ? ` <small>${n}</small>` : ''}</button>`;
        })
        .join('')}</div>`
    : '';

  const head = `<div class="page-head sp-head"><h1>${_t('Sport')}</h1>
      <span class="muted">${esc(fmtDay(Date.now()))}${events ? ` · ${_t('{n} követett tétel', { n: watched.length })}` : ''}${errs ? ` · <span class="warn">${_t('{n} forrás nem érhető el', { n: errs })}</span>` : ''}</span>
      <span class="sp-head-btns"><button class="btn small" data-sp="refresh" title="${_t('Az eredmények és a menetrend újratöltése')}">${ICON.refresh} ${_t('Frissítés@@újratöltés')}</button>
        <a class="btn small" href="#/settings?g=sport">${_t('⚙ Mit követek?')}</a></span></div>`;

  let body;
  if (!events) body = '<div class="spinner"></div>';
  else {
    // Fent az élő események (teljes szélességben), alattuk oszlopok: következik | a tévében most + eredmények | tabella
    // (keskeny képernyőn egymás alatt, ebben a sorrendben)
    const cols = [
      watched.length ? [card('next', _t('Következik'), next.length ? dayGroups(next, chanOn) : `<p class="muted">${_t('A beállított időszakban nincs közelgő esemény.')}</p>`)] : [],
      [
        card('tv', _t('Sport a tévében most'), tvNow(), `<a class="dc-link" href="#/guide">${_t('Műsorújság ›')}</a>`),
        watched.length ? card('done', _t('Eredmények'), done.length ? `<ul class="d-sport">${done.map((e) => eventRowHtml(e, { channels: false })).join('')}</ul>` : `<p class="muted">${_t('Még nincs friss eredmény.')}</p>`) : '',
      ],
      leagues.length ? [card('table', _t('Tabella'), tableBox(leagues))] : [],
    ].filter((c) => c.some(Boolean));
    body = `${chips}
      ${!watched.length ? `<section class="dcard spc spc-empty">${emptyState(_t('Még nem követsz semmit'), _t('Bajnokságot, csapatot, sportágat vagy versenynaptárt a Sportfigyelőben adhatsz hozzá (Beállítások → Sport). Addig is: lent a tévében most futó sportműsorok.'), `<a class="btn primary" href="#sportwatch">${_t('Sportfigyelő megnyitása')}</a>`)}</section>` : ''}
      ${watched.length ? card('live', `${_t('Élő most')}${live.length ? ` <span class="live-badge">${live.length}</span>` : ''}`, live.length ? `<div class="spl-grid">${live.map((e) => liveTile(e, chanOn)).join('')}</div>` : `<p class="muted">${nextHint(next)}</p>`) : ''}
      <div class="sp-cols">${cols.map((c) => `<div class="sp-col">${c.join('')}</div>`).join('')}</div>`;
  }

  view.innerHTML = `<div class="page sport-page">${head}${body}</div>`;
  st.root = view.firstElementChild;
  bind(view);
  if (leagues.length) fillTable(view, leagues);
  if (fKey) st.root.querySelector(fKey)?.focus({ preventScroll: true });
}

const card = (cls, title, inner, link = '') => `<section class="dcard spc spc-${cls}"><h2 class="dc-title"><span>${title}</span>${link}</h2><div class="dc-body sp-body">${inner}</div></section>`;

function nextHint(next) {
  const n = next[0];
  if (!n) return _t('Most nincs élő esemény a követett tételek közül.');
  const what = n.home ? `${n.home} – ${n.away}` : n.title;
  return _t('Most nincs élő esemény. Következő: {what}, {when}', { what: esc(what), when: esc(`${dayLbl(n.start)} ${n.allDay ? '' : fmtTime(n.start)}`.trim()) });
}

/** Nap felirata: Ma, Holnap, a hét napjai, távolabb dátum. */
function whenDay(t) {
  const off = Math.round((dayStart(t) - dayStart()) / 864e5);
  return off >= -1 && off < 7 ? dayLabel(off) : fmtDay(t);
}

function liveTile(e, chanOn) {
  const sp = sportOf(e.sport);
  const ch = chanOn ? channelFor(e) : null;
  const logo = (src) => (src ? `<img src="${esc(src)}" alt="" loading="lazy" onerror="this.remove()" />` : '');
  const mid = e.home
    ? `<div class="spl-teams"><span class="spl-t">${logo(e.logoH)}<b>${esc(e.home)}</b></span><b class="spl-sc">${esc(e.hs ?? '')} : ${esc(e.as ?? '')}</b><span class="spl-t">${logo(e.logoA)}<b>${esc(e.away)}</b></span></div>`
    : `<div class="spl-title"><b>${esc(e.title)}</b></div>`;
  return `<div class="spl-tile" tabindex="0">
      <div class="spl-lg">${sp.ico} ${esc(e.leagueName || e.league || sp.name)}</div>
      ${mid}
      <div class="spl-det"><span class="live-badge">${_t('ÉLŐ')}</span> ${esc(e.detail || '')}</div>
      ${ch ? `<button class="btn small primary spl-play ${ch.sure ? '' : 'maybe'}" data-play="${esc(ch.id)}" title="${esc(ch.title)}${ch.sure ? '' : ` ${_t('(valószínű)')}`}">${ICON.play} ${esc(ch.name)}</button>` : ''}
    </div>`;
}

function tvNow() {
  const kw = st.sport && sportOf(st.sport).kw;
  let rx = null;
  try {
    rx = kw ? new RegExp(norm(kw), 'i') : null;
  } catch {}
  const now = Date.now();
  // (a sportág szerinti szűrés a levágás előtt – különben a többi sportág kiszoríthatná a találatokat)
  const rows = sportOnTvNow(12, rx ? (x) => rx.test(norm(`${x.p.title} ${x.p.category || ''}`)) : null);
  if (!rows.length) return `<p class="muted">${epg.byChannel?.size ? _t('Most nincs sportműsor a műsorújságban.') : _t('A műsorújság betöltése…')}</p>`;
  return `<ul class="sp-tvlist">${rows
    .map(({ ch, p }) => {
      const off = channelStatus(ch) === 'bad';
      const pct = Math.min(100, Math.max(0, ((now - p.start) / (p.stop - p.start)) * 100));
      return `<li><button class="sp-tvrow ${off ? 'is-off' : ''}" data-play="${esc(ch.id)}" title="${_t('{esc} lejátszása', { esc: esc(ch.name) })}">
          <span class="sp-tvlogo">${logoHtml(ch, 'logo-sm')}</span>
          <span class="sp-tvtxt"><b>${esc(p.title)}</b><small class="muted">${esc(ch.name)} · ${fmtTime(p.start)}–${fmtTime(p.stop)}${off ? ` · ${_t('nem elérhető')}` : ''}</small><span class="bar"><i style="width:${pct.toFixed(1)}%"></i></span></span>
        </button></li>`;
    })
    .join('')}</ul>`;
}

function dayGroups(next, chanOn) {
  const groups = [];
  for (const e of next) {
    const key = e.far ? 'far' : String(dayStart(e.start));
    let g = groups.find((x) => x.key === key);
    if (!g) groups.push((g = { key, label: e.far ? _t('Később') : whenDay(e.start), list: [] }));
    g.list.push(e);
  }
  return groups
    .map((g) => `<h3 class="sp-day">${esc(g.label)}</h3><ul class="d-sport">${g.list.map((e) => eventRowHtml(e, { channels: chanOn, remind: chanOn, time: g.key !== 'far' })).join('')}</ul>`)
    .join('');
}

// ---------------------------------------------------------------------------
// Tabella (ESPN)
// ---------------------------------------------------------------------------
// [statisztika, rövid fejléc, teljes név]
const COLS = [
  ['gamesPlayed', _t('M@@meccs'), _t('Lejátszott mérkőzés')],
  ['wins', _t('Gy@@győzelem'), _t('Győzelem')],
  ['ties', _t('D@@döntetlen'), _t('Döntetlen')],
  ['losses', _t('V@@vereség'), _t('Vereség')],
  ['pointDifferential', '+/−', _t('Különbség')],
  ['points', _t('P@@pont'), _t('Pont')],
  ['winPercent', '%', _t('Győzelmi arány')],
];

function tableBox(leagues) {
  if (!leagues.some((l) => l.ref === st.table)) st.table = leagues[0].ref;
  return `${leagues.length > 1 ? `<select class="sp-table-sel" data-sp-table aria-label="${_t('Bajnokság')}">${leagues.map((l) => `<option value="${esc(l.ref)}" ${l.ref === st.table ? 'selected' : ''}>${sportOf(l.sport).ico} ${esc(l.name)}</option>`).join('')}</select>` : `<p class="sp-table-name"><b>${sportOf(leagues[0].sport).ico} ${esc(leagues[0].name)}</b></p>`}
    <div class="sp-table-box"><div class="spinner small"></div></div>`;
}

async function fillTable(view, leagues) {
  const ref = st.table;
  const lg = leagues.find((l) => l.ref === ref);
  let c = standings.get(ref);
  if (!c || Date.now() - c.at > 30 * 60e3) {
    try {
      c = { at: Date.now(), groups: await loadStandings(ref) };
    } catch (err) {
      c = { at: Date.now(), err: err.message || String(err) };
    }
    standings.set(ref, c);
  }
  const box = st.root?.querySelector('.sp-table-box');
  if (!box || st.table !== ref) return;
  if (c.err || !c.groups?.length) return void (box.innerHTML = `<p class="muted">${_t('Ehhez a bajnoksághoz nincs tabella (pl. kupa, egyéni sportág vagy szezonon kívül).')}</p>`);
  const first = c.groups[0].rows[0]?.stats || {};
  let cols = COLS.filter(([k]) => first[k] !== undefined && first[k] !== '');
  // (győzelmi aránnyal számolt bajnokságban – pl. NBA – a „pont” nem pontszám)
  if (cols.some(([k]) => k === 'winPercent') && !cols.some(([k]) => k === 'ties')) cols = cols.filter(([k]) => k !== 'points');
  box.innerHTML = c.groups
    .map((g) => `${c.groups.length > 1 ? `<h3 class="sp-day">${esc(g.name)}</h3>` : ''}<table class="sp-table">
      <thead><tr><th>#</th><th class="t">${_t('Csapat')}</th>${cols.map(([k, s, full]) => `<th class="c-${k}" title="${esc(full)}">${esc(s)}</th>`).join('')}</tr></thead>
      <tbody>${g.rows
        .map((r, i) => `<tr class="${lg?.teams.has(r.id) ? 'mine' : ''}" ${r.color ? `style="--zone:${esc(r.color)}"` : ''} ${r.note ? `title="${esc(r.note)}"` : ''}>
          <td class="n ${r.color ? 'zone' : ''}">${esc(r.stats.rank || String(i + 1))}</td>
          <td class="t">${r.logo ? `<img src="${esc(r.logo)}" alt="" loading="lazy" onerror="this.remove()" />` : ''}<span>${esc(r.team)}</span></td>
          ${cols.map(([k]) => `<td class="c-${k}">${esc(r.stats[k] ?? '')}</td>`).join('')}</tr>`)
        .join('')}</tbody></table>`)
    .join('');
}

// ---------------------------------------------------------------------------
// Kezelés
// ---------------------------------------------------------------------------
function bind(view) {
  const root = st.root;
  root.addEventListener('click', async (e) => {
    const pl = e.target.closest('[data-play]');
    if (pl) {
      const ch = catalog.byId.get(pl.dataset.play);
      if (ch) player.play(ch);
      else toast(_t('A csatorna nem található a csatornalistákban.'));
      return;
    }
    const chip = e.target.closest('[data-sp-chip]');
    if (chip) {
      const s = chip.dataset.spChip;
      location.replace('#/sport' + (s ? '?s=' + encodeURIComponent(s) : ''));
      return;
    }
    const rem = e.target.closest('[data-rem-ch]');
    if (rem) {
      const chId = rem.dataset.remCh;
      const start = Number(rem.dataset.remStart);
      const p = epg.range(chId, start, start + 60e3).find((x) => x.start === start);
      if (!p) return toast(_t('A műsor nem található a műsorújságban.'));
      const on = store.toggleReminder(chId, p);
      toast(on ? _t('Emlékeztető beállítva: {title}', { title: p.title }) : _t('Emlékeztető törölve'));
      rem.classList.toggle('on', on);
      return;
    }
    if (e.target.closest('[data-sp="refresh"]')) {
      const b = e.target.closest('button');
      b.disabled = true;
      standings.clear();
      await loadSportEvents(true, { live: true }).catch(() => {});
      if (here()) {
        draw(view, sportEventsCached());
        toast(_t('Frissítve'));
        schedule(view);
      }
    }
  });
  root.addEventListener('change', (e) => {
    if (!e.target.matches('[data-sp-table]')) return;
    st.table = e.target.value;
    root.querySelector('.sp-table-box').innerHTML = '<div class="spinner small"></div>';
    fillTable(view, followedLeagues());
  });
}
