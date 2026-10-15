// A Rádió oldal (menüsor: TV után): sorok a TV oldal mintájára (legutóbb hallgatott, kedvencek, a hazai
// adók, műfajok, a világ legnépszerűbbjei, országok), böngészés szűrőkkel és kereséssel, műfaj- és
// országoldalak. Mindenhol az elérhető adók állnak elöl. A lejátszás a radioui.js mini-lejátszójában szól.
// A menüpont kikapcsolható: Beállítások → Rádió.
import { esc, hashHue, initials, html, debounce, toast, bus, fmtTime, fmtDay, dayStart, dayLabel } from './util.js';
import { api, IS_TV } from './api.js';
import { epg } from './epg.js';
import { store } from './store.js';
import { countryName, countryFlag } from './catalog.js';
import { ICON, emptyState, rowTitleHtml, seeAllHtml, progressiveTrack, radioTabs, openModal } from './components.js';
import { canRecord, scheduleRadioRec, isRecScheduled } from './recorder.js';
import { _t } from './i18n.js';
import {
  radio, GENRES, genreName, loadRadio, loadRadioCountry, searchRadioOnline, genreOnline, radioCountries, radioAvailability,
  radioPopular, radioSearch, radioOfCountry, radioOfGenre, radioFavs, radioRecent, isRadioFav, toggleRadioFav, moveRadioFav,
} from './radio.js';
import { radioPlayer } from './radioplayer.js';

/** Látszik-e a Rádió menüpont (beállítás; gyerekprofilban nem). */
export const radioMenuOn = () => store.settings.radioMenu !== false && !store.profile?.kids;

const homeCC = () => {
  const c = (store.settings.homeCountry || 'HU').toUpperCase();
  return c === 'UK' ? 'GB' : c;
};
const GENRE_ICON = { pop: '🎤', rock: '🎸', news: '📰', classical: '🎻', jazz: '🎷', dance: '🎧', retro: '📻', folk: '🪕', hiphop: '🎙️', chill: '🌙', kids: '🧸', christian: '⛪' };

// ---------------------------------------------------------------------------
// Kártyák és sorok
// ---------------------------------------------------------------------------
// a kártyák listái (az indított adóhoz: előző / következő adó ugyanabból a sorból)
const lists = new Map();
let listSeq = 0;
const registerList = (list) => {
  const id = 'rl' + ++listSeq;
  lists.set(id, list);
  if (lists.size > 60) lists.delete(lists.keys().next().value);
  return id;
};

const fmtKbps = (b) => (b ? `${b} kbps` : '');
/** Négyzetes adókártya: logó (vagy monogram), név, ország / műfaj, állapot. */
export function stationCardHtml(st, ctx = '') {
  const av = radioAvailability(st);
  const on = radioPlayer.station?.id === st.id;
  const fav = isRadioFav(st.id);
  // (ha van műsorújság: a most futó műsor; különben ország, műfaj, minőség)
  const prog = epg.now(st.id)?.cur;
  const sub = prog ? `${fmtTime(prog.start)} ${prog.title}` : [countryFlag(st.country), st.genres[0] ? genreName(st.genres[0]) : st.tags[0] || countryName(st.country), fmtKbps(st.bitrate)].filter(Boolean).join(' · ');
  return `<div class="rcard ${av === 0 ? 'is-off' : ''} ${on ? 'on-air' : ''}" tabindex="0" data-rid="${esc(st.id)}" data-rl="${esc(ctx)}" title="${esc(st.name)}">
    <div class="rthumb" style="--h:${hashHue(st.name)}">
      ${st.logo ? `<img class="rlogo" src="${esc(st.logo)}" alt="" loading="lazy" referrerpolicy="no-referrer" />` : ''}<span class="initials">${esc(initials(st.name))}</span>
      <span class="st st-${av >= 2 ? 'ok' : av === 0 ? 'bad' : 'unknown'}" title="${av >= 2 ? _t('Működik') : av === 0 ? _t('Nem elérhető') : _t('Nem ellenőrzött')}"></span>
      ${fav ? '<span class="fav-mark">★</span>' : ''}
      <span class="eq-bars" aria-hidden="true"><i></i><i></i><i></i></span>
      <button class="round white rplay" data-ract="play" tabindex="-1" title="${_t('Lejátszás')}">${ICON.play}</button>
      <button class="round rfav" data-ract="fav" tabindex="-1" title="${fav ? _t('Eltávolítás a kedvencekből') : _t('Kedvencekhez')}">${fav ? ICON.check : ICON.plus}</button>
    </div>
    <div class="meta"><div class="name">${esc(st.name)}</div><div class="sub">${esc(sub)}</div></div>
  </div>`;
}
// (a betöltetlen logó helyett marad a monogram – a törölt imgur-képek helyén álló 161×81-es „nem létezik” kép is)
document.addEventListener('error', (e) => e.target.classList?.contains('rlogo') && e.target.remove(), true);
document.addEventListener('load', (e) => {
  const i = e.target;
  if (i.classList?.contains('rlogo') && i.naturalWidth === 161 && i.naturalHeight === 81 && /imgur\.com/i.test(i.currentSrc || i.src)) i.remove();
}, true);

function rowWrap(title, href, count, inner, cls = '') {
  return html(`<section class="row radio-row ${cls}">
    ${rowTitleHtml(title, href, count)}
    <div class="row-wrap">
      <button class="row-arrow left" aria-label="${_t('Balra')}" tabindex="-1">${ICON.left}</button>
      <div class="row-track">${inner}</div>
      <button class="row-arrow right" aria-label="${_t('Jobbra')}" tabindex="-1">${ICON.right}</button>
    </div>
  </section>`);
}
function arrows(el) {
  const track = el.querySelector('.row-track');
  const update = () => {
    el.classList.toggle('can-left', track.scrollLeft > 5);
    el.classList.toggle('can-right', track.scrollLeft + track.clientWidth < track.scrollWidth - 5);
  };
  el.querySelector('.left').onclick = () => track.scrollBy({ left: -track.clientWidth * 0.9, behavior: 'smooth' });
  el.querySelector('.right').onclick = () => track.scrollBy({ left: track.clientWidth * 0.9, behavior: 'smooth' });
  track.addEventListener('scroll', update, { passive: true });
  requestAnimationFrame(update);
  return el;
}
/** Adók sora (fokozatos feltöltéssel, mint a TV oldal sorai). */
export function stationRowEl(title, list, { href = '', limit = 60 } = {}) {
  const ctx = registerList(list);
  const el = rowWrap(title, href, list.length, list.slice(0, 14).map((s) => stationCardHtml(s, ctx)).join('') + seeAllHtml(href, list.length));
  progressiveTrack(el.querySelector('.row-track'), list, (s) => stationCardHtml(s, ctx), limit);
  return arrows(el);
}
function tileRowEl(title, tiles, href = '') {
  return arrows(rowWrap(title, href, 0, tiles.join(''), 'tile-row'));
}
const genreTile = (id) =>
  `<a class="rtile" href="#/radio?g=${id}" style="--h:${hashHue(id + 'genre')}"><span class="rt-ico">${GENRE_ICON[id] || '♪'}</span><b>${esc(genreName(id))}</b></a>`;
const countryTile = (cc, count) =>
  `<a class="rtile country" href="#/radio?c=${esc(cc)}" style="--h:${hashHue(cc)}"><span class="rt-ico">${countryFlag(cc) || esc(cc)}</span><b>${esc(countryName(cc))}</b>${count ? `<small>${_t('{count} adó', { count })}</small>` : ''}</a>`;

function gridHtml(list, { limit = 120 } = {}) {
  if (!list.length) return `<p class="muted">${_t('Nincs találat.')}</p>`;
  const ctx = registerList(list);
  return `<div class="rgrid">${list.slice(0, limit).map((s) => stationCardHtml(s, ctx)).join('')}</div>${list.length > limit ? `<div class="rmore"><button class="btn" data-rmore="${limit}">${_t('Továbbiak ({n})', { n: list.length - limit })}</button></div>` : ''}`;
}
/** A „Továbbiak” gomb; getList: a rács aktuális listája. */
function bindMore(box, getList) {
  box.addEventListener('click', (e) => {
    const b = e.target.closest('[data-rmore]');
    if (!b) return;
    const list = getList();
    const from = Number(b.dataset.rmore);
    const ctx = registerList(list);
    const grid = box.querySelector('.rgrid');
    grid.insertAdjacentHTML('beforeend', list.slice(from, from + 120).map((s) => stationCardHtml(s, ctx)).join(''));
    if (from + 120 >= list.length) b.parentElement.remove();
    else {
      b.dataset.rmore = String(from + 120);
      b.textContent = _t('Továbbiak ({n})', { n: list.length - from - 120 });
    }
  });
}

// ---------------------------------------------------------------------------
// Kattintás, billentyű (az egész lapon: a Kedvencek oldalon is vannak adókártyák)
// ---------------------------------------------------------------------------
function stationOf(card) {
  const list = lists.get(card.dataset.rl) || [];
  return { st: list.find((s) => s.id === card.dataset.rid) || radio.byId.get(card.dataset.rid), list };
}
function act(card, what) {
  const { st, list } = stationOf(card);
  if (!st) return;
  if (what === 'fav') {
    const on = toggleRadioFav(st);
    toast(on ? _t('{name} hozzáadva a kedvencekhez', { name: st.name }) : _t('{name} eltávolítva a kedvencek közül', { name: st.name }));
    return;
  }
  if (radioPlayer.station?.id === st.id && radioPlayer.playing) return void document.dispatchEvent(new CustomEvent('adas-radio-expand'));
  radioPlayer.play(st, list.length ? list : [st]);
}
document.addEventListener('click', (e) => {
  const card = e.target.closest?.('.rcard');
  if (!card) return;
  e.preventDefault();
  act(card, e.target.closest('[data-ract]')?.dataset.ract === 'fav' ? 'fav' : 'play');
});
document.addEventListener('keydown', (e) => {
  const card = e.target.closest?.('.rcard');
  if (!card || e.defaultPrevented) return;
  if (e.key === 'Enter') act(card, 'play');
  else if (e.key === 'f' || e.key === 'F' || e.key === 'ColorF0Red') act(card, 'fav');
  else return;
  e.preventDefault();
  e.stopPropagation();
});
// a szóló adó és a kedvencek jelölése a kártyákon (újrarajzolás nélkül)
const mark = () => {
  const id = radioPlayer.station?.id || '';
  document.querySelectorAll('.rcard').forEach((c) => {
    c.classList.toggle('on-air', c.dataset.rid === id);
    c.classList.toggle('is-paused', c.dataset.rid === id && !radioPlayer.playing);
  });
};
bus.on('radio-player', mark);
bus.on('radio-favs', () => {
  document.querySelectorAll('.rcard').forEach((c) => {
    const on = isRadioFav(c.dataset.rid);
    const th = c.querySelector('.rthumb');
    th.querySelector('.fav-mark')?.remove();
    if (on) th.insertAdjacentHTML('beforeend', '<span class="fav-mark">★</span>');
    const b = c.querySelector('.rfav');
    if (!b) return;
    b.innerHTML = on ? ICON.check : ICON.plus;
    b.title = on ? _t('Eltávolítás a kedvencekből') : _t('Kedvencekhez');
  });
});

// ---------------------------------------------------------------------------
// Oldalak
// ---------------------------------------------------------------------------
const tabs = radioTabs;
const loadingHtml = () => `<p class="muted radio-loading">${_t('Az adók betöltése…')}</p>`;
const here = (v) => document.body.dataset.route === 'radio' && v.isConnected;
export { loadRadio };

export function renderRadio(view, params) {
  if (!radio.ready) loadRadio(); // (a betöltés végén a „radio” esemény újrarajzol – app.js)
  const g = params.get('g');
  const c = (params.get('c') || '').toUpperCase();
  if (g) return renderGenre(view, g);
  if (/^[A-Z]{2}$/.test(c)) return renderCountry(view, c);
  if (params.get('tab') === 'browse') return renderBrowse(view, params);
  if (params.get('tab') === 'guide') return renderGuide(view);
  if (params.get('tab') === 'favs') return renderFavs(view);
  renderHome(view);
}

// --- Kedvencek: sorba rendezhető rács (húzással; billentyűzeten Ctrl / ⌘ + nyilak, tévén CH+ / CH−)
function renderFavs(view) {
  const favs = radioFavs();
  const mac = /Mac/.test(navigator.platform);
  const how = IS_TV ? _t('áthelyezés: kijelölve a CH+ / CH− gombbal') : mac ? _t('áthelyezés: húzással vagy a ⌘← / ⌘→ billentyűvel') : _t('áthelyezés: húzással vagy a Ctrl+← / Ctrl+→ billentyűvel');
  view.innerHTML = `<div class="page radio-page">${tabs('favs')}
    <div class="page-head"><h1>${_t('Kedvenc rádiók')}</h1><span class="muted">${_t('{n} adó', { n: favs.length })}${favs.length > 1 ? ' · ' + how : ''}</span></div>
    ${favs.length ? `<div class="rbox rfav-grid">${gridHtml(favs, { limit: 1000 })}</div>` : emptyState(_t('Még nincsenek kedvenc rádióid'), _t('Egy rádióadó kártyáján a + gombbal (vagy kijelölve az F billentyűvel) teheted ide.'), `<a class="btn primary" href="#/radio">${_t('Rádiók')}</a>`)}</div>`;
  const grid = view.querySelector('.rgrid');
  if (!grid) return;
  grid.querySelectorAll('.rcard').forEach((c) => (c.draggable = true));
  let drag = '';
  grid.addEventListener('dragstart', (e) => {
    drag = e.target.closest('.rcard')?.dataset.rid || '';
    e.dataTransfer.effectAllowed = 'move';
  });
  grid.addEventListener('dragover', (e) => e.preventDefault());
  grid.addEventListener('drop', (e) => {
    e.preventDefault();
    const t = e.target.closest('.rcard');
    if (!drag || !t || t.dataset.rid === drag) return;
    moveRadioFav(drag, radioFavs().findIndex((s) => s.id === t.dataset.rid));
    renderFavs(view);
  });
  grid.addEventListener('keydown', (e) => {
    const c = e.target.closest('.rcard');
    const dir = { ArrowLeft: -1, ArrowRight: 1, ChannelDown: -1, ChannelUp: 1 }[e.key];
    if (!c || !dir || (!(e.ctrlKey || e.metaKey) && !e.key.startsWith('Channel'))) return;
    e.preventDefault();
    e.stopPropagation();
    const i = radioFavs().findIndex((s) => s.id === c.dataset.rid);
    moveRadioFav(c.dataset.rid, i + dir);
    renderFavs(view);
    view.querySelector(`.rcard[data-rid="${CSS.escape(c.dataset.rid)}"]`)?.focus();
  }, true);
}

// --- Műsorújság: ugyanaz a felület, mint a tévéé (szűrő, napok, idővonal / most műsoron)
const PX_PER_MIN = 4;
const guideState = { filter: 'fav', day: 0, mode: 'grid', timer: 0 };
const rLogo = (st) => `<span class="g-logo" style="--h:${hashHue(st.name)}">${st.logo ? `<img class="rlogo logo-sm" src="${esc(st.logo)}" alt="" referrerpolicy="no-referrer" />` : ''}<span class="initials">${esc(initials(st.name))}</span></span>`;
function renderGuide(view) {
  const cc = homeCC();
  const seen = new Set();
  const favs = radioFavs().filter((st) => epg.has(st.id));
  const all = [...favs, ...radioPopular([...radio.byId.values()])].filter((st) => !seen.has(st.id) && seen.add(st.id) && epg.has(st.id));
  if (guideState.filter === 'fav' && !favs.length) guideState.filter = 'home';
  if (guideState.filter === 'home' && !all.some((st) => st.country === cc)) guideState.filter = 'all';
  const list = guideState.filter === 'fav' ? favs : guideState.filter === 'home' ? all.filter((st) => st.country === cc) : all;
  const from = dayStart(Date.now(), guideState.day);
  const to = from + 864e5;
  const width = 24 * 60 * PX_PER_MIN;
  const t = Date.now();
  const nowGrid = () => `<div class="now-grid">${list
    .map((st) => {
      const n = epg.now(st.id, t);
      const cur = n?.cur;
      return `<div class="now-card">
        <button class="nc-ch" data-rgplay="${esc(st.id)}" title="${_t('Hallgatás')}">${rLogo(st)}<b>${esc(st.name)}</b>${ICON.play}</button>
        ${cur
          ? `<button class="nc-prog" data-rgp="${cur.start}" data-rgst="${esc(st.id)}"><span class="now-label">${_t('MOST')}</span> <b>${esc(cur.title)}</b>
            <span class="bar"><i style="width:${(n.progress * 100).toFixed(1)}%"></i></span>
            <small class="muted">${fmtTime(cur.start)}–${fmtTime(cur.stop)}</small></button>`
          : `<p class="muted small">${_t('Nincs műsoradat')}</p>`}
        ${n?.next ? `<button class="nc-next" data-rgp="${n.next.start}" data-rgst="${esc(st.id)}"><small class="muted">${fmtTime(n.next.start)}</small> ${esc(n.next.title)}</button>` : ''}
      </div>`;
    })
    .join('')}</div>`;
  const grid = () => `<div class="guide-scroll"><div class="guide-inner" style="width:${width + 220}px">
      <div class="g-head"><div class="g-corner"></div><div class="g-times" style="width:${width}px">${Array.from({ length: 48 }, (_, i) => `<span style="left:${i * 30 * PX_PER_MIN}px">${fmtTime(from + i * 1800e3)}</span>`).join('')}</div></div>
      <div class="g-rows">${list
        .map((st) => {
          const progs = epg.range(st.id, from, to);
          return `<div class="g-row" data-id="${esc(st.id)}"><button class="g-ch" data-rgplay="${esc(st.id)}" title="${_t('Hallgatás')}">${rLogo(st)}<span class="g-name">${esc(st.name)}</span></button><div class="g-progs" style="width:${width}px">${progs
            .map((pr) => {
              const l = ((Math.max(pr.start, from) - from) / 60000) * PX_PER_MIN;
              const w = ((Math.min(pr.stop, to) - Math.max(pr.start, from)) / 60000) * PX_PER_MIN;
              const rec = isRecScheduled(st.id, pr.start);
              return `<button class="g-prog ${pr.start <= t && pr.stop > t ? 'live' : ''} ${pr.stop <= t ? 'past' : ''} ${rec ? 'rem' : ''}" style="left:${l}px;width:${Math.max(w - 2, 2)}px" data-rgp="${pr.start}" data-rgst="${esc(st.id)}" title="${esc(pr.title)}">
                <b>${rec ? '● ' : ''}${esc(pr.title)}</b><small>${fmtTime(pr.start)}–${fmtTime(pr.stop)}</small></button>`;
            })
            .join('') || `<span class="g-empty muted small" style="left:232px">${_t('Nincs műsoradat')}</span>`}</div></div>`;
        })
        .join('')}</div>
      <div class="g-nowline" hidden></div>
    </div></div>`;
  view.innerHTML = `<div class="page guide-page radio-guide">${tabs('guide')}
    <div class="page-head"><h1>${_t('Műsorújság@@rádió')}</h1><span class="muted">${fmtDay(from)}</span></div>
    <div class="guide-bar">
      <div class="tabs">
        <button class="tab ${guideState.filter === 'fav' ? 'active' : ''}" data-f="fav">${_t('Kedvencek')}</button>
        <button class="tab ${guideState.filter === 'home' ? 'active' : ''}" data-f="home">${esc(countryName(cc))}</button>
        <button class="tab ${guideState.filter === 'all' ? 'active' : ''}" data-f="all">${_t('Minden adó')}</button>
      </div>
      <div class="tabs">${[-1, 0, 1, 2, 3].map((d) => `<button class="tab ${d === guideState.day ? 'active' : ''}" data-d="${d}">${dayLabel(d)}</button>`).join('')}</div>
      <button class="btn small" data-now>${_t('Ugrás a mostani időre')}</button>
      <div class="tabs"><button class="tab ${guideState.mode === 'grid' ? 'active' : ''}" data-gmode="grid">${_t('Idővonal')}</button><button class="tab ${guideState.mode === 'now' ? 'active' : ''}" data-gmode="now">${_t('Most műsoron')}</button></div>
    </div>
    ${!list.length
      ? epg.loading || !epg.loadedAt
        ? `<div class="empty-state"><div class="spinner"></div><p>${_t('A műsorújság betöltése folyamatban…')}</p></div>`
        : emptyState(_t('Nincs rádióműsor'), _t('A rádiók műsorát a műsorújság-források adják (Beállítások → Műsorújság): a magyar epgshare01-forrásban a Kossuth, a Petőfi és a Bartók szerepel. Más adók műsorához adj meg olyan XMLTV-forrást, amelyben az adó benne van.'), `<a class="btn primary" href="#/settings?g=epg">${_t('Műsorújság-források')}</a>`)
      : guideState.mode === 'now'
        ? nowGrid()
        : grid()}
  </div>`;
  const redraw = (sel) => {
    renderGuide(view);
    view.querySelector(sel)?.focus();
  };
  view.querySelectorAll('[data-f]').forEach((x) => (x.onclick = () => ((guideState.filter = x.dataset.f), redraw(`[data-f="${x.dataset.f}"]`))));
  view.querySelectorAll('[data-d]').forEach((x) => (x.onclick = () => ((guideState.day = Number(x.dataset.d)), redraw(`[data-d="${x.dataset.d}"]`))));
  view.querySelectorAll('[data-gmode]').forEach((x) => (x.onclick = () => {
    guideState.mode = x.dataset.gmode;
    if (guideState.mode === 'now') guideState.day = 0;
    redraw(`[data-gmode="${x.dataset.gmode}"]`);
  }));
  const scroll = view.querySelector('.guide-scroll');
  const jumpNow = () => scroll && (scroll.scrollLeft = guideState.day === 0 ? ((Date.now() - from) / 60000) * PX_PER_MIN - 120 : 6 * 60 * PX_PER_MIN);
  view.querySelector('[data-now]').onclick = () => {
    if (guideState.day !== 0 || guideState.mode !== 'grid') {
      guideState.day = 0;
      guideState.mode = 'grid';
      renderGuide(view);
    } else jumpNow();
  };
  if (scroll) {
    const nowLine = view.querySelector('.g-nowline');
    const placeNow = () => {
      const n = Date.now();
      if (n < from || n > to) return (nowLine.hidden = true);
      nowLine.hidden = false;
      nowLine.style.left = (scroll.querySelector('.g-ch')?.offsetWidth || 220) + ((n - from) / 60000) * PX_PER_MIN + 'px';
    };
    placeNow();
    clearInterval(guideState.timer);
    guideState.timer = setInterval(() => (nowLine.isConnected ? placeNow() : clearInterval(guideState.timer)), 30000);
    jumpNow();
  }
  view.onclick = (e) => {
    const pl = e.target.closest('[data-rgplay]');
    if (pl) {
      const st = list.find((x) => x.id === pl.dataset.rgplay);
      if (st) radioPlayer.play(st, list);
      return;
    }
    const b = e.target.closest('[data-rgp]');
    if (!b) return;
    const st = list.find((x) => x.id === b.dataset.rgst);
    const p = st && epg.list(st.id).find((x) => x.start === Number(b.dataset.rgp));
    if (p) openRadioProgram(st, p, list, () => renderGuide(view));
  };
}

/** Rádióműsor adatlapja: idő, leírás, hallgatás (ha most megy), felvétel ütemezése. */
export function openRadioProgram(st, p, list = [st], onChange = null) {
  const now = Date.now();
  const live = p.start <= now && p.stop > now;
  const sched = isRecScheduled(st.id, p.start);
  const el = html(`<div class="dialog rg-dialog">
    <div class="muted small">${esc(st.name)} · ${esc(fmtDay(p.start))} ${fmtTime(p.start)}–${fmtTime(p.stop)}</div>
    <h2>${esc(p.title)}</h2>
    ${p.subtitle ? `<p><b>${esc(p.subtitle)}</b></p>` : ''}
    ${p.desc ? `<p class="rg-desc">${esc(p.desc)}</p>` : ''}
    <div class="inline">
      ${live ? `<button class="btn primary" data-a="play">${ICON.play} ${_t('Hallgatás')}</button>` : ''}
      ${canRecord && p.stop > now ? `<button class="btn ${sched ? 'on' : ''}" data-a="rec">● ${sched ? _t('Felvétel törlése') : _t('Felvétel')}</button>` : ''}
    </div></div>`);
  const close = openModal(el, { cls: 'medium' });
  el.addEventListener('click', (e) => {
    const a = e.target.closest('[data-a]')?.dataset.a;
    if (a === 'play') {
      close();
      radioPlayer.play(st, list);
    } else if (a === 'rec') {
      scheduleRadioRec(st, p);
      close();
      onChange?.();
    }
  });
}
// a betöltött műsorújság a nyitott Műsorújság fülre is kerüljön ki
bus.on('epg', () => {
  const v = document.getElementById('view');
  if (document.body.dataset.route === 'radio' && /tab=guide/.test(location.hash) && v) renderGuide(v);
});

function renderHome(view) {
  const recent = radioRecent();
  const favs = radioFavs();
  const cc = homeCC();
  const home = radioPopular(radioOfCountry(cc));
  const all = [...radio.byId.values()];
  const world = radioPopular(all.filter((s) => s.country !== cc && s.sources.includes('rb'))).slice(0, 120);
  view.innerHTML = '';
  const rows = html(`<div class="rows radio-rows"><div class="tv-head">${tabs('home')}</div></div>`);
  view.append(rows);
  if (recent.length) rows.append(stationRowEl(_t('Legutóbb hallgatott'), recent));
  if (favs.length) rows.append(stationRowEl(_t('Kedvenc rádiók'), favs));
  if (home.length) rows.append(stationRowEl(_t('{country} rádiói', { country: countryName(cc) }), home, { href: `#/radio?c=${cc}`, limit: 80 }));
  rows.append(tileRowEl(_t('Műfajok'), GENRES.map(([id]) => genreTile(id))));
  // a hazai adók a 4 legnagyobb műfajban (a többi a Műfajok csempéiről érhető el)
  GENRES.map(([id]) => [id, radioPopular(radioOfGenre(id, home))])
    .filter(([, l]) => l.length >= 6)
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, 4)
    .forEach(([id, l]) => rows.append(stationRowEl(_t('{country} – {genre}', { country: countryName(cc), genre: genreName(id) }), l, { href: `#/radio?g=${id}` })));
  if (world.length) rows.append(stationRowEl(_t('Népszerű a világban'), world, { limit: 120 }));
  const ctry = tileRowEl(_t('Országok'), [countryTile(cc, home.length)], '');
  rows.append(ctry);
  radioCountries()
    .then((list) => {
      if (!ctry.isConnected) return;
      ctry.querySelector('.row-track').innerHTML = list.slice(0, 60).map((x) => countryTile(x.code, x.count)).join('');
    })
    .catch(() => {});
  if (!radio.ready && !home.length) rows.append(html(loadingHtml()));
  else if (!all.length) rows.append(html(emptyState(_t('Nincs betölthető rádióadó'), _t('Kapcsolj be legalább egy rádióforrást, vagy adj meg saját rádiólistát.'), `<a class="btn primary" href="#/settings?g=radio">${_t('Beállítások')}</a>`)));
}

async function renderGenre(view, g) {
  if (!GENRES.some(([id]) => id === g)) return renderHome(view);
  const draw = (extra = []) => {
    const ids = new Set();
    const list = radioPopular([...radioOfGenre(g), ...extra].filter((s) => !ids.has(s.id) && ids.add(s.id)));
    // (a hazai adók elöl)
    const cc = homeCC();
    const sorted = [...list.filter((s) => s.country === cc), ...list.filter((s) => s.country !== cc)];
    view.innerHTML = `<div class="page radio-page">${tabs('')}
      <div class="page-head"><h1>${GENRE_ICON[g] || ''} ${esc(genreName(g))}</h1><span class="muted">${_t('{n} adó', { n: sorted.length })}</span></div>
      <div class="rbox">${gridHtml(sorted)}</div></div>`;
    bindMore(view.querySelector('.rbox'), () => sorted);
  };
  draw();
  try {
    const more = await genreOnline(g);
    if (here(view) && location.hash.includes('g=' + g)) draw(more);
  } catch {}
}

async function renderCountry(view, cc) {
  const draw = () => {
    const list = radioPopular(radioOfCountry(cc));
    view.innerHTML = `<div class="page radio-page">${tabs('')}
      <div class="page-head"><h1>${countryFlag(cc)} ${esc(countryName(cc))}</h1><span class="muted">${radio.loaded.has(cc) ? _t('{n} adó', { n: list.length }) : _t('Az adók betöltése…')}</span></div>
      <div class="rbox">${gridHtml(list)}</div></div>`;
    bindMore(view.querySelector('.rbox'), () => list);
  };
  draw();
  if (!radio.loaded.has(cc)) {
    await loadRadioCountry(cc);
    if (here(view) && location.hash.includes('c=' + cc)) draw();
  }
}

// --- Böngészés: keresés (helyben és a Radio Browserben), szűrők
const QUALITY = [
  ['', _t('Bármilyen minőség')],
  ['128', _t('Legalább 128 kbps')],
  ['256', _t('Legalább 256 kbps')],
];
function renderBrowse(view, params) {
  const q = params.get('q') || '';
  const f = { cc: params.get('cc') || '', g: params.get('genre') || '', kb: params.get('kb') || '', ok: params.get('ok') === '1' };
  const countries = [...new Set([...radio.byId.values()].map((s) => s.country).filter(Boolean))].sort((a, b) => countryName(a).localeCompare(countryName(b)));
  view.innerHTML = `<div class="page radio-page">${tabs('browse')}
    <div class="radio-filters">
      <input class="input" type="search" id="rq" placeholder="${_t('Adó neve, műfaj, ország…')}" value="${esc(q)}" />
      <select id="rcc" aria-label="${_t('Ország')}"><option value="">${_t('Minden ország')}</option>${countries.map((c) => `<option value="${esc(c)}" ${c === f.cc ? 'selected' : ''}>${esc(countryName(c))}</option>`).join('')}</select>
      <select id="rg" aria-label="${_t('Műfaj')}"><option value="">${_t('Minden műfaj')}</option>${GENRES.map(([id, n]) => `<option value="${id}" ${id === f.g ? 'selected' : ''}>${esc(n)}</option>`).join('')}</select>
      <select id="rkb" aria-label="${_t('Minőség')}">${QUALITY.map(([v, n]) => `<option value="${v}" ${v === f.kb ? 'selected' : ''}>${esc(n)}</option>`).join('')}</select>
      <label class="check"><input type="checkbox" id="rok" ${f.ok ? 'checked' : ''} /> ${_t('Csak a működők')}</label>
    </div>
    <div class="page-head sub"><span class="muted" id="rcount"></span></div>
    <div class="rbox"></div></div>`;
  const box = view.querySelector('.rbox');
  let online = [];
  let cur = [];
  const fill = () => {
    const query = view.querySelector('#rq').value.trim();
    const cc = view.querySelector('#rcc').value;
    const g = view.querySelector('#rg').value;
    const kb = Number(view.querySelector('#rkb').value) || 0;
    const ok = view.querySelector('#rok').checked;
    const ids = new Set();
    let list = query ? [...radioSearch(query), ...online] : radioPopular([...radio.byId.values()]);
    list = list.filter((s) => !ids.has(s.id) && ids.add(s.id));
    if (cc) list = list.filter((s) => s.country === cc);
    if (g) list = list.filter((s) => s.genres.includes(g));
    if (kb) list = list.filter((s) => (s.bitrate || 0) >= kb);
    if (ok) list = list.filter((s) => radioAvailability(s) >= 2);
    cur = radioPopular(list);
    view.querySelector('#rcount').textContent = _t('{n} adó', { n: cur.length });
    box.innerHTML = gridHtml(cur);
    // (a cím a lap címében marad: vissza gombbal ugyanide)
    const u = new URLSearchParams({ tab: 'browse' });
    for (const [k, v] of [['q', query], ['cc', cc], ['genre', g], ['kb', kb ? String(kb) : ''], ['ok', ok ? '1' : '']]) if (v) u.set(k, v);
    history.replaceState(null, '', '#/radio?' + u);
  };
  bindMore(box, () => cur);
  const searchOnline = debounce(async () => {
    const query = view.querySelector('#rq')?.value.trim();
    if (!query || query.length < 2) return;
    try {
      const r = await searchRadioOnline(query);
      if (!view.isConnected || view.querySelector('#rq')?.value.trim() !== query) return;
      online = r;
      fill();
    } catch {}
  }, 500);
  view.querySelector('#rq').addEventListener('input', () => {
    online = [];
    fill();
    searchOnline();
  });
  view.querySelectorAll('select, #rok').forEach((x) => x.addEventListener('change', fill));
  fill();
  if (q) searchOnline();
}

/** A Kedvencek oldal „Rádiók” sora (üresen egy rövid tipp). */
export function radioFavsSection() {
  if (!radioMenuOn()) return null;
  const favs = radioFavs();
  const box = html(`<div class="radio-favs"><div class="page-head sub"><h2>${_t('Rádiók')}</h2>${favs.length ? `<span class="muted">${_t('{n} adó', { n: favs.length })}</span>` : ''}</div></div>`);
  if (favs.length) {
    const grid = html(`<div class="rbox">${gridHtml(favs)}</div>`);
    bindMore(grid, () => favs);
    box.append(grid);
  }
  else box.append(html(`<p class="muted">${_t('Egy rádióadó kártyáján a + gombbal (vagy kijelölve az F billentyűvel) teheted ide.')} <a href="#/radio">${_t('Rádiók')}</a></p>`));
  return box;
}
