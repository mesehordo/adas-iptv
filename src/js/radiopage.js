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
import { canRecord, scheduleRadioRec, isRecScheduled, recordingOf, toggleRadioRecording } from './recorder.js';
import { _t } from './i18n.js';
import {
  radio, GENRES, genreName, loadRadio, loadRadioCountry, searchRadioOnline, genreOnline, radioCountries, radioAvailability, radioGeo, radioOffLabel, queueRadioChecks,
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
const SOURCE_NAME = { rb: 'Radio Browser', verified: 'Verified Radio Streams', iprd: 'IPRD', saved: _t('mentett adó') };
const sourceName = (s) => SOURCE_NAME[s] || (String(s).startsWith('list:') ? _t('saját lista / csomag') : s);
/**
 * Adókártya – a tévés csatornakártya felépítésével (.card / .thumb / .pop), így a felületstílusok (témák)
 * ugyanúgy alakítják: logó, állapot, minőség, kedvenc, most futó műsor; felugró gombok: hallgatás, kedvenc,
 * részletek. (data-rid: a tévés kártyakezelők a data-id nélküli kártyát nem kezelik.)
 */
export function stationCardHtml(st, ctx = '') {
  const av = radioAvailability(st);
  const on = radioPlayer.station?.id === st.id;
  const fav = isRadioFav(st.id);
  const now = epg.now(st.id);
  const off = av === 0;
  const geo = off && radioGeo(st) === 'sure';
  const genre = st.genres[0] ? genreName(st.genres[0]) : st.tags[0] || '';
  const sub = off
    ? `<span class="off-text">${geo ? _t('Innen nem hallgatható – földrajzi korlát') : _t('Most nem szól – a címei nem indultak el')}</span>`
    : now?.cur
      ? esc(now.cur.title)
      : esc([countryName(st.country), genre].filter(Boolean).join(' · '));
  return `<div class="card rcard ${off ? 'is-off' : ''} ${on ? 'on-air' : ''}" tabindex="0" data-rid="${esc(st.id)}" data-rl="${esc(ctx)}">
    <div class="thumb" style="--h:${hashHue(st.name)}">
      ${st.logo ? `<img class="rlogo" src="${esc(st.logo)}" alt="" loading="lazy" referrerpolicy="no-referrer" />` : ''}<span class="initials">${esc(initials(st.name))}</span>
      ${off ? `<span class="off-badge ${geo ? 'geo' : ''}">${geo ? _t('🌐 GEO-KORLÁT') : 'OFFLINE'}</span>` : ''}
      ${st.bitrate ? `<span class="q">${esc(String(st.bitrate))}k</span>` : ''}
      <span class="st st-${av >= 2 ? 'ok' : off ? 'bad' : 'unknown'}" title="${av >= 2 ? _t('Működik') : off ? _t('Nem elérhető') : _t('Nem ellenőrzött')}"></span>
      ${fav ? '<span class="fav-mark">★</span>' : ''}
      <span class="eq-bars" aria-hidden="true"><i></i><i></i><i></i></span>
      ${now?.cur ? `<div class="bar"><i style="width:${(now.progress * 100).toFixed(1)}%"></i></div>` : ''}
    </div>
    <div class="meta"><div class="name">${esc(st.name)}</div><div class="sub">${sub}</div></div>
    <div class="pop">
      <div class="pop-btns">
        <button class="round white" data-ract="play" title="${_t('Hallgatás')}" tabindex="-1">${ICON.play}</button>
        <button class="round" data-ract="fav" title="${fav ? _t('Eltávolítás a kedvencekből') : _t('Kedvencekhez')}" tabindex="-1">${fav ? ICON.check : ICON.plus}</button>
        <span class="grow"></span>
        <button class="round" data-ract="info" title="${_t('Részletek (I)')}" tabindex="-1">${ICON.chevron}</button>
      </div>
      <div class="pop-line">${countryFlag(st.country)} ${esc(countryName(st.country))}${genre ? ' · ' + esc(genre) : ''}${st.bitrate ? ` <span class="pill">${esc(fmtKbps(st.bitrate))}</span>` : ''}</div>
      ${now?.cur ? `<div class="pop-now"><b>${fmtTime(now.cur.start)}</b> ${esc(now.cur.title)}</div>` : ''}
      ${now?.next ? `<div class="pop-next">${_t('Utána: {time} {title}', { time: fmtTime(now.next.start), title: esc(now.next.title) })}</div>` : ''}
    </div>
  </div>`;
}
// (a betöltetlen logó helyett marad a monogram – a törölt imgur-képek helyén álló 161×81-es „nem létezik” kép is)
document.addEventListener('error', (e) => e.target.classList?.contains('rlogo') && e.target.remove(), true);
document.addEventListener('load', (e) => {
  const i = e.target;
  if (!i.classList?.contains('rlogo') || i.naturalWidth !== 161 || i.naturalHeight !== 81) return;
  let host = '';
  try {
    host = new URL(i.currentSrc || i.src).hostname.toLowerCase();
  } catch {}
  if (host === 'imgur.com' || host.endsWith('.imgur.com')) i.remove();
}, true);

function rowWrap(title, href, count, inner, cls = '') {
  return html(`<section class="row radio-row ${cls}">
    ${rowTitleHtml(title, href, count)}
    <div class="row-wrap">
      <button class="row-arrow left" aria-label="${_t('Balra')}" tabindex="-1">${ICON.left}</button>
      <div class="row-track ${cls === 'tile-row' ? 'tiles' : ''}">${inner}</div>
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
  queueRadioChecks(list.slice(0, limit)); // (a sor fokozatosan betöltött kártyáié is)
  const el = rowWrap(title, href, list.length, list.slice(0, 14).map((s) => stationCardHtml(s, ctx)).join('') + seeAllHtml(href, list.length));
  progressiveTrack(el.querySelector('.row-track'), list, (s) => stationCardHtml(s, ctx), limit);
  return arrows(el);
}
function tileRowEl(title, tiles, href = '', count = 0) {
  return arrows(rowWrap(title, href, count, tiles.join(''), 'tile-row'));
}
// (a tévés böngészés csempéi: .tile / .tile.cat)
const genreTile = (id) =>
  `<a class="tile cat" href="#/radio?g=${id}" style="--h:${hashHue(id + 'genre')}"><span class="flag">${GENRE_ICON[id] || '♪'}</span><b>${esc(genreName(id))}</b></a>`;
const countryTile = (cc, count) =>
  `<a class="tile" href="#/radio?c=${esc(cc)}" style="--h:${hashHue(cc)}"><span class="flag">${countryFlag(cc) || `<span class="cc">${esc(cc)}</span>`}</span><b>${esc(countryName(cc))}</b>${count ? `<small>${_t('{count} adó', { count })}</small>` : ''}</a>`;

function gridHtml(list, { limit = 120 } = {}) {
  if (!list.length) return `<p class="muted">${_t('Nincs találat.')}</p>`;
  const ctx = registerList(list);
  queueRadioChecks(list.slice(0, limit));
  return `<div class="grid rgrid">${list.slice(0, limit).map((s) => stationCardHtml(s, ctx)).join('')}</div>${list.length > limit ? `<div class="rmore"><button class="btn" data-rmore="${limit}">${_t('Továbbiak ({n})', { n: list.length - limit })}</button></div>` : ''}`;
}
// Az elérhetőség-ellenőrzés után a látható kártyák jelölése frissül (OFFLINE / földrajzi korlát)
let healthTimer = 0;
bus.on('health', () => {
  clearTimeout(healthTimer);
  healthTimer = setTimeout(() => {
    document.querySelectorAll('.rcard[data-rid]').forEach((card) => {
      const st = radio.byId.get(card.dataset.rid);
      if (!st) return;
      const av = radioAvailability(st);
      const state = av >= 2 ? 'ok' : av === 0 ? 'bad' : 'unknown';
      const geo = av === 0 && radioGeo(st) === 'sure';
      if (card.querySelector(`.st.st-${state}`) && geo === !!card.querySelector('.off-badge.geo')) return;
      const tmp = document.createElement('div');
      tmp.innerHTML = stationCardHtml(st, card.dataset.rl || '');
      const fresh = tmp.firstElementChild;
      // (a fókuszban lévő kártya is frissül – a fókusz az új kártyára kerül, a felugró gombok nélkül)
      const hadFocus = card.contains(document.activeElement);
      card.replaceWith(fresh);
      if (hadFocus) fresh.focus({ preventScroll: true });
    });
  }, 800);
});
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
    queueRadioChecks(list.slice(from, from + 120));
    if (from + 120 >= list.length) b.parentElement.remove();
    else {
      b.dataset.rmore = String(from + 120);
      b.textContent = _t('Továbbiak ({n})', { n: list.length - from - 120 });
    }
  });
}

// ---------------------------------------------------------------------------
// Kattintás, billentyű – mint a tévés kártyánál: rövid OK = hallgatás, hosszan nyomva / I / jobb klikk = adatlap,
// F (piros gomb) = kedvenc. Az egész lapon (a Kedvencek oldalon is vannak adókártyák).
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
  if (what === 'info') return void openStationInfo(st, list.length ? list : [st]);
  if (radioPlayer.station?.id === st.id && radioPlayer.playing) return void document.dispatchEvent(new CustomEvent('adas-radio-expand'));
  radioPlayer.play(st, list.length ? list : [st]);
}
document.addEventListener('click', (e) => {
  const card = e.target.closest?.('.rcard');
  if (!card) return;
  e.preventDefault();
  act(card, e.target.closest('[data-ract]')?.dataset.ract || 'play');
});
document.addEventListener('contextmenu', (e) => {
  const card = e.target.closest?.('.rcard');
  if (!card) return;
  e.preventDefault();
  act(card, 'info');
});
let okTimer = 0;
let okCard = null;
document.addEventListener('keydown', (e) => {
  const card = e.target.closest?.('.rcard');
  if (!card || e.defaultPrevented) return;
  if (e.key === 'Enter') {
    if (!e.repeat) {
      clearTimeout(okTimer);
      okCard = card;
      okTimer = setTimeout(() => {
        okCard = null;
        act(card, 'info');
      }, 550);
    }
  } else if (e.key === 'i' || e.key === 'I' || e.key === 'ContextMenu') act(card, 'info');
  else if (e.key === 'f' || e.key === 'F' || e.key === 'ColorF0Red') act(card, 'fav');
  else return;
  e.preventDefault();
  e.stopPropagation();
});
document.addEventListener('keyup', (e) => {
  if (e.key !== 'Enter' || !okCard) return;
  clearTimeout(okTimer);
  const card = okCard;
  okCard = null;
  act(card, 'play');
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
    const th = c.querySelector('.thumb');
    th.querySelector('.fav-mark')?.remove();
    if (on) th.insertAdjacentHTML('beforeend', '<span class="fav-mark">★</span>');
    const b = c.querySelector('[data-ract="fav"]');
    if (!b) return;
    b.innerHTML = on ? ICON.check : ICON.plus;
    b.title = on ? _t('Eltávolítás a kedvencekből') : _t('Kedvencekhez');
  });
});

// ---------------------------------------------------------------------------
// Adatlap – a tévés csatorna-adatlap felépítésével (.info): fejléc, gombok, napi műsor, adatok, adáscímek
// ---------------------------------------------------------------------------
export function openStationInfo(st, list = [st]) {
  const el = html(`<div class="info radio-info"></div>`);
  let day = 0;
  const render = () => {
    const now = epg.now(st.id);
    const fav = isRadioFav(st.id);
    const av = radioAvailability(st);
    const playingThis = radioPlayer.station?.id === st.id && radioPlayer.playing;
    const recOn = !!recordingOf(st.id);
    const icy = radioPlayer.station?.id === st.id ? radioPlayer.now.text : '';
    const facts = [
      [_t('Ország'), `${countryFlag(st.country)} ${esc(countryName(st.country))}`],
      [_t('Műfaj'), esc(st.genres.map(genreName).join(', '))],
      [_t('Címkék'), esc(st.tags.slice(0, 10).join(', '))],
      [_t('Formátum'), esc([st.codec, fmtKbps(st.bitrate)].filter(Boolean).join(' · '))],
      [_t('Adatbázis'), esc([...new Set(st.sources.map(sourceName))].join(', '))],
      [_t('Népszerűség'), st.votes ? esc(String(st.votes)) : ''],
      [_t('Kipróbálva'), esc(st.verified || '')],
      [_t('Weboldal'), st.homepage ? `<a href="#" data-ext="${esc(st.homepage)}">${esc(st.homepage.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, ''))}</a>` : ''],
    ].filter((f) => f[1] && f[1].trim());
    const from = dayStart(Date.now(), day);
    const progs = epg.range(st.id, from, dayStart(Date.now(), day + 1)); // (a következő helyi éjfélig)
    const t = Date.now();
    el.innerHTML = `
      <div class="info-hero" style="--h:${hashHue(st.name)}">
        <div class="info-logo">${st.logo ? `<img class="rlogo" src="${esc(st.logo)}" alt="" referrerpolicy="no-referrer" />` : ''}<span class="initials">${esc(initials(st.name))}</span></div>
        <div class="info-head">
          <h1>${esc(st.name)}</h1>
          <div class="info-tags">
            <span class="st-label st-${av >= 2 ? 'ok' : av === 0 ? 'bad' : 'unknown'}">${av >= 2 ? _t('Működik') : av === 0 ? `${radioOffLabel(st)} ${_t('– jelenleg nem elérhető')}` : _t('Nem ellenőrzött')}</span>
            ${{ sure: `<span class="pill warn" title="${_t('Az adó innen elutasította a kérést (403 / 451)')}">${_t('🌐 Földrajzi korlát – innen nem hallgatható')}</span>`, maybe: `<span class="pill warn" title="${_t('A lista szerint csak bizonyos országokból hallgatható')}">${_t('🌐 Földrajzilag korlátozott lehet')}</span>` }[radioGeo(st)] || ''}
            ${st.bitrate ? `<span class="pill">${esc(fmtKbps(st.bitrate))}</span>` : ''}
            ${st.codec ? `<span class="pill">${esc(st.codec)}</span>` : ''}
            ${st.urls.length > 1 ? `<span class="pill">${_t('{length} forrás', { length: st.urls.length })}</span>` : ''}
            ${playingThis ? `<span class="pill">${_t('Most szól')}</span>` : ''}
          </div>
          ${now?.cur
            ? `<div class="info-now"><span class="now-label">${_t('MOST')}</span> <b>${esc(now.cur.title)}</b> <span class="muted">${fmtTime(now.cur.start)}–${fmtTime(now.cur.stop)}</span>
              <div class="bar wide"><i style="width:${(now.progress * 100).toFixed(1)}%"></i></div>
              ${now.cur.desc ? `<p class="desc">${esc(now.cur.desc)}</p>` : ''}</div>`
            : icy ? `<div class="info-now"><span class="now-label">${_t('MOST')}</span> <b>${esc(icy)}</b></div>` : ''}
          <div class="info-btns">
            <button class="btn primary big" data-a="play" autofocus>${playingThis ? _t('Most szól ›') : _t('{play} Hallgatás', { play: ICON.play })}</button>
            <button class="btn ${fav ? 'on' : ''}" data-a="fav" title="${fav ? _t('Eltávolítás a kedvencekből') : _t('Kedvencekhez')}">${fav ? '★' : '☆'} ${_t('Kedvenc')}</button>
            ${canRecord ? `<button class="btn ${recOn ? 'on' : ''}" data-a="rec">● ${recOn ? _t('Felvétel leállítása') : _t('Felvétel')}</button>` : ''}
          </div>
        </div>
      </div>
      <div class="info-body">
        <div class="info-schedule">
          <div class="sched-head"><h3>${_t('Műsor')}</h3>
            <div class="tabs">${[-1, 0, 1, 2].map((d) => `<button class="tab ${d === day ? 'active' : ''}" data-day="${d}">${dayLabel(d)}</button>`).join('')}</div></div>
          ${progs.length
            ? `<ol class="sched">${progs
                .map((p) => {
                  const live = p.start <= t && p.stop > t;
                  const past = p.stop <= t;
                  const sch = isRecScheduled(st.id, p.start);
                  return `<li class="${live ? 'live' : ''} ${past ? 'past' : ''}" data-start="${p.start}">
                    <span class="time">${fmtTime(p.start)}</span>
                    <div class="pt">${past ? `<b>${esc(p.title)}</b>` : `<button class="link-btn" data-rprog="${p.start}"><b>${esc(p.title)}</b></button>`}${p.subtitle ? ` <span class="muted">– ${esc(p.subtitle)}</span>` : ''}
                      ${p.category ? `<span class="pill small">${esc(p.category)}</span>` : ''}
                      ${p.desc ? `<p>${esc(p.desc)}</p>` : ''}</div>
                    ${live ? `<span class="now-label">${_t('MOST')}</span>` : ''}
                    ${canRecord && !past ? `<button class="round small ${sch ? 'on' : ''}" data-rrec="${p.start}" title="${sch ? _t('Felvétel törlése') : _t('Felvétel')}">●</button>` : ''}
                  </li>`;
                })
                .join('')}</ol>`
            : `<p class="empty">${epg.has(st.id) ? _t('Erre a napra nincs műsoradat.') : _t('Ehhez az adóhoz nem érhető el műsorújság. A „most szól” cím (ha az adó küldi) a lejátszóban látszik.')}</p>`}
        </div>
        <div class="info-side">
          <dl class="facts">${facts.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('')}</dl>
          <h3>${_t('Adáscímek')}</h3>
          <ul class="streams">${st.urls
            .map((u, i) => {
              const h = store.healthOf(u);
              let host = '';
              try {
                host = new URL(u).host;
              } catch {}
              return `<li><span class="st st-${h ? (h.ok ? 'ok' : 'bad') : 'unknown'}"></span>
                <span class="s-name">${esc(_t('Forrás {x}', { x: i + 1 }))} · ${esc(host)}</span>
                <button class="btn small" data-rurl="${i}" title="${_t('Hallgatás ezen a címen')}">${ICON.play}</button></li>`;
            })
            .join('')}</ul>
        </div>
      </div>`;
  };
  const draw = () => {
    const f = el.contains(document.activeElement) ? document.activeElement : null;
    const sel = f && ['a', 'rrec', 'day', 'rurl'].map((k) => (f.dataset[k] !== undefined ? `[data-${k}="${CSS.escape(f.dataset[k])}"]` : '')).find(Boolean);
    render();
    if (sel) (el.querySelector(sel) || el.querySelector('[data-a="play"]'))?.focus({ preventScroll: true });
  };
  render();
  // (bezáráskor a figyelők leiratkoznak)
  const off = [bus.on('radio-favs', draw), bus.on('rec', draw), bus.on('epg', draw), bus.on('health', draw)];
  const close = openModal(el, { cls: 'wide', onClose: () => off.forEach((fn) => fn()) });
  el.addEventListener('click', async (e) => {
    const a = e.target.closest('[data-a]')?.dataset.a;
    const dayBtn = e.target.closest('[data-day]');
    const rr = e.target.closest('[data-rrec]');
    const ru = e.target.closest('[data-rurl]');
    const rp = e.target.closest('[data-rprog]');
    if (a === 'play') {
      close();
      if (radioPlayer.station?.id === st.id && radioPlayer.playing) document.dispatchEvent(new CustomEvent('adas-radio-expand'));
      else radioPlayer.play(st, list);
    } else if (a === 'fav') {
      const on = toggleRadioFav(st);
      toast(on ? _t('{name} hozzáadva a kedvencekhez', { name: st.name }) : _t('{name} eltávolítva a kedvencek közül', { name: st.name }));
      draw();
    } else if (a === 'rec') {
      await toggleRadioRecording(st);
      draw();
    } else if (rp) {
      // (élő műsornál Hallgatás, jövőbelinél felvétel-ütemezés – múltbelinél nincs: az az élő adást indítaná)
      const p = epg.list(st.id).find((x) => x.start === Number(rp.dataset.rprog));
      if (p) openRadioProgram(st, p, list, draw);
    } else if (dayBtn) {
      day = Number(dayBtn.dataset.day);
      draw();
    } else if (rr) {
      const p = epg.list(st.id).find((x) => x.start === Number(rr.dataset.rrec));
      if (p) scheduleRadioRec(st, p);
      draw();
    } else if (ru) {
      // a választott cím elöl, a többi tartalékként marad
      const i = Number(ru.dataset.rurl);
      close();
      radioPlayer.play({ ...st, urls: [st.urls[i], ...st.urls.filter((_, k) => k !== i)] }, list);
    }
  });
}

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
  const to = dayStart(Date.now(), guideState.day + 1); // (a következő helyi éjfél – nyári időszámításnál is)
  // (a nap hossza a valós helyi nap: óraátállításkor 23 vagy 25 óra – a szélesség és a jelölők ehhez igazodnak)
  const width = ((to - from) / 60000) * PX_PER_MIN;
  const marks = Math.round((to - from) / 1800e3);
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
      <div class="g-head"><div class="g-corner"></div><div class="g-times" style="width:${width}px">${Array.from({ length: marks }, (_, i) => `<span style="left:${i * 30 * PX_PER_MIN}px">${fmtTime(from + i * 1800e3)}</span>`).join('')}</div></div>
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
  const countries = [...new Set([...radio.byId.values()].map((s) => s.country).filter(Boolean))];
  if (/^[A-Z]{2}$/.test(f.cc) && !countries.includes(f.cc)) countries.push(f.cc);
  countries.sort((a, b) => countryName(a).localeCompare(countryName(b)));
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
  // A szűrő ne csak a már betöltött adókból válogasson: a választott ország összes adója (mindegyik
  // forrásból) és a választott műfaj világszerte népszerű adói betöltődnek, utána a lista újrarajzolódik.
  const pending = new Set();
  const ensure = (cc, g) => {
    if (cc && !radio.loaded.has(cc) && !pending.has(cc)) {
      pending.add(cc);
      loadRadioCountry(cc).finally(() => {
        pending.delete(cc);
        if (view.isConnected) fill();
      });
    }
    if (g && !genreCache.has(g)) {
      genreCache.set(g, []);
      genreOnline(g)
        .then((r) => {
          genreCache.set(g, r);
          if (view.isConnected) fill();
        })
        .catch(() => genreCache.delete(g)); // (hiba után a műfaj újra kiválasztva újrapróbál)
    }
  };
  const fill = () => {
    const query = view.querySelector('#rq').value.trim();
    const cc = view.querySelector('#rcc').value;
    const g = view.querySelector('#rg').value;
    const kb = Number(view.querySelector('#rkb').value) || 0;
    const ok = view.querySelector('#rok').checked;
    ensure(cc, g);
    const ids = new Set();
    const pool = [...radio.byId.values(), ...(g ? genreCache.get(g) || [] : [])];
    let list = query ? [...radioSearch(query, pool), ...online] : radioPopular(pool);
    list = list.filter((s) => !ids.has(s.id) && ids.add(s.id));
    if (cc) list = list.filter((s) => s.country === cc);
    if (g) list = list.filter((s) => s.genres.includes(g));
    if (kb) list = list.filter((s) => (s.bitrate || 0) >= kb);
    if (ok) list = list.filter((s) => radioAvailability(s) >= 2);
    cur = radioPopular(list);
    view.querySelector('#rcount').textContent = pending.has(cc) ? _t('Az adók betöltése…') : _t('{n} adó', { n: cur.length });
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
  // az országválasztó: minden ország, ahonnan van adó (a Radio Browser összesítése szerint, adószámmal)
  radioCountries()
    .then((all) => {
      const sel = view.querySelector('#rcc');
      if (!sel || !all.length) return;
      const keep = sel.value || f.cc;
      const known = new Map(all.map((c) => [c.code, c.count]));
      for (const c of countries) if (!known.has(c)) known.set(c, 0);
      const opts = [...known.entries()].sort((a, b) => countryName(a[0]).localeCompare(countryName(b[0])));
      sel.innerHTML = `<option value="">${_t('Minden ország')}</option>${opts.map(([c, n]) => `<option value="${esc(c)}" ${c === keep ? 'selected' : ''}>${esc(countryName(c))}${n ? ` (${n})` : ''}</option>`).join('')}`;
      if (sel.value !== keep) return;
      fill();
    })
    .catch(() => {});
}
const genreCache = new Map(); // műfaj → a világ népszerű adói (Radio Browser)

/** A Kedvencek oldal „Rádiók” sora (üresen egy rövid tipp). */
// A Keresés oldal rádiós találatai: a betöltött adók közül, és ha ott kevés van, a Radio Browserből is (név
// szerint; kifejezésenként egyszer kérdezve – az újrarajzolás nem kérdez újra).
const onlineHits = new Map(); // kifejezés → adók (vagy a folyamatban lévő kérés)
export function radioSearchCount(q) {
  if (!radioMenuOn()) return 0;
  const seen = new Set(radioSearch(q).map((s) => s.id));
  const extra = (Array.isArray(onlineHits.get(q)) ? onlineHits.get(q) : []).filter((s) => !seen.has(s.id));
  return seen.size + extra.length;
}
export function radioSearchSection(q, { limit = 18 } = {}) {
  if (!radioMenuOn()) return null;
  if (!radio.ready) loadRadio(); // (a betöltés végén a Keresés oldal újrarajzolódik – app.js)
  const local = radioSearch(q);
  const known = onlineHits.get(q);
  if (!known && local.length < 12 && q.trim().length >= 2) {
    onlineHits.set(q, 'pending');
    searchRadioOnline(q)
      .then((r) => onlineHits.set(q, r))
      .catch(() => onlineHits.set(q, []))
      .finally(() => {
        if (onlineHits.size > 30) onlineHits.delete(onlineHits.keys().next().value);
        if (document.body.dataset.route === 'search') bus.emit('radio-search');
      });
  }
  const seen = new Set(local.map((s) => s.id));
  const list = [...local, ...(Array.isArray(known) ? known.filter((s) => !seen.has(s.id)) : [])];
  if (!list.length) return null;
  const box = html(`<section class="sc-radio"><h2 class="section-title">${_t('Rádió')} <a class="btn small" href="#/radio?tab=browse&amp;q=${encodeURIComponent(q)}">${_t('Keresés a Rádió oldalon ›')}</a></h2></section>`);
  const grid = html(`<div class="rbox">${gridHtml(list, { limit })}</div>`);
  bindMore(grid, () => list);
  box.append(grid);
  return box;
}

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
