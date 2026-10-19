// Rádió – a lejátszó felülete: alul a mini-lejátszó (logó, adó, most szól, kis spektrum, előző / szünet /
// következő, kedvenc, hangerő, kinagyítás), kinagyítva a „Most szól” nézet (borító, vizualizáció, hangzás,
// előzmények, keresés a YouTube-on / Spotify-on, elalvás-időzítő). A videó indulásakor a rádió elhallgat,
// a rádió indulásakor a videólejátszó bezárul.
import { $, esc, hashHue, initials, html, fmtTime, toast, bus } from './util.js';
import { ICON } from './components.js';
import { player } from './player.js';
import { countryName, countryFlag } from './catalog.js';
import { _t } from './i18n.js';
import { store } from './store.js';
import { genreName, isRadioFav, toggleRadioFav } from './radio.js';
import { radioPlayer, fx, setFx, EQ_PRESETS, VIS_MODES, audioFxAvailable, drawVisualizer } from './radioplayer.js';
import { epg } from './epg.js';
import { canRecord, recordingOf, toggleRadioRecording } from './recorder.js';
import { openRadioProgram } from './radiopage.js';
import { radioStatsHtml, startRadioStats, stopRadioStats } from './radiostats.js';

const P = {
  pause: '<svg viewBox="0 0 24 24"><path d="M6 4h4v16H6zm8 0h4v16h-4z"/></svg>',
  prev: '<svg viewBox="0 0 24 24"><path d="M6 6h2v12H6zm3.5 6 8.5 6V6z"/></svg>',
  next: '<svg viewBox="0 0 24 24"><path d="M16 6h2v12h-2zM6 18l8.5-6L6 6z"/></svg>',
  expand: '<svg viewBox="0 0 24 24"><path d="M7.4 15.4 12 10.8l4.6 4.6L18 14l-6-6-6 6z"/></svg>',
  vol: '<svg viewBox="0 0 24 24"><path d="M3 9v6h4l5 5V4L7 9H3Zm13.5 3A4.5 4.5 0 0 0 14 8v8a4.5 4.5 0 0 0 2.5-4Z"/></svg>',
  heart: '★',
  vis: '<svg viewBox="0 0 24 24"><path d="M3 10h2v4H3zm4-4h2v12H7zm4-3h2v18h-2zm4 5h2v8h-2zm4 3h2v2h-2z"/></svg>',
  sound: '<svg viewBox="0 0 24 24"><path d="M3 17v2h6v-2H3zM3 5v2h10V5H3zm10 16v-2h8v-2h-8v-2h-2v6h2zM7 9v2H3v2h4v2h2V9H7zm14 4v-2H11v2h10zm-6-4h2V7h4V5h-4V3h-2v6z"/></svg>',
  eq: '<svg viewBox="0 0 24 24"><path d="M5 3h2v6h2v2H3V9h2zm0 10h2v8H5zm6-10h2v10h2v2H9v-2h2zm0 14h2v4h-2zm6-14h2v2h2v2h-6V5h2zm0 6h2v12h-2z"/></svg>',
  sleep: '<svg viewBox="0 0 24 24"><path d="M12.3 2a9.8 9.8 0 1 0 9.6 12.3A7.8 7.8 0 0 1 12.3 2z"/></svg>',
  stats: '<svg viewBox="0 0 24 24"><path d="M4 20h16v2H2V2h2v18zm3-3h2v-6H7v6zm4 0h2V7h-2v10zm4 0h2v-9h-2v9zm4 0h2V4h-2v13z"/></svg>',
  hist: '<svg viewBox="0 0 24 24"><path d="M13 3a9 9 0 0 0-9 9H1l4 4 4-4H6a7 7 0 1 1 2.05 4.95l-1.42 1.42A9 9 0 1 0 13 3zm-1 5v5l4.25 2.52.77-1.28-3.52-2.09V8z"/></svg>',
};

// rádiózás közben a videó bezárul (és viszont: a videó indulásakor a rádió elhallgat – radioplayer.js)
bus.on('radio-start', () => {
  if (player.active) player.close();
});
// gyerekprofilban nincs rádió (a menüpont sem látszik)
bus.on('profile', () => store.profile?.kids && radioPlayer.active && (closeFull(), radioPlayer.stop()));

// ---------------------------------------------------------------------------
// Mini-lejátszó
// ---------------------------------------------------------------------------
let bar = null;
let full = null;

const logoBox = (st, cls = 'rb-logo') =>
  `<span class="${cls}" style="--h:${hashHue(st.name)}">${st.logo ? `<img class="rlogo" src="${esc(st.logo)}" alt="" referrerpolicy="no-referrer" />` : ''}<span class="initials">${esc(initials(st.name))}</span></span>`;

function stateText() {
  const r = radioPlayer;
  if (r.state === 'loading') return _t('Csatlakozás…');
  if (r.state === 'error') return r.error;
  if (r.state === 'paused') return _t('Szünetel');
  return r.now.text || epg.now(r.station.id)?.cur?.title || [countryName(r.station.country), r.station.genres?.[0] ? genreName(r.station.genres[0]) : ''].filter(Boolean).join(' · ');
}

function ensureBar() {
  if (bar) return bar;
  bar = html(`<div id="radio-bar" role="region" aria-label="${_t('Rádió')}">
    <button class="rb-main" data-rb="expand" title="${_t('Most szól – kinagyítás')}"><span class="rb-logo-slot"></span>
      <span class="rb-text"><b class="rb-name"></b><small class="rb-now"></small></span></button>
    <canvas class="rb-vis" aria-hidden="true"></canvas>
    <span class="rb-btns">
      <button class="round small" data-rb="prev" title="${_t('Előző adó (CH−)')}">${P.prev}</button>
      <button class="round white" data-rb="toggle" title="${_t('Lejátszás / szünet (szóköz)')}"></button>
      <button class="round small" data-rb="next" title="${_t('Következő adó (CH+)')}">${P.next}</button>
      <button class="round small rb-fav" data-rb="fav"></button>
      ${canRecord ? `<button class="round small rb-rec" data-rb="rec"></button>` : ''}
    </span>
    <label class="rb-vol" title="${_t('Hangerő')}">${P.vol}<input type="range" min="0" max="1" step="0.05" aria-label="${_t('Hangerő')}" /></label>
    <button class="round small" data-rb="expand" title="${_t('Most szól – kinagyítás')}">${P.expand}</button>
    <button class="round small" data-rb="close" title="${_t('Rádió kikapcsolása')}">${ICON.close}</button>
  </div>`);
  document.body.append(bar);
  bar.addEventListener('click', (e) => {
    const a = e.target.closest('[data-rb]')?.dataset.rb;
    if (a) cmd(a);
  });
  bar.querySelector('input').addEventListener('input', (e) => radioPlayer.setVolume(Number(e.target.value)));
  // (hangfeldolgozás nélkül – tévén – nincs mit mutatnia)
  if (audioFxAvailable) drawVisualizer(bar.querySelector('.rb-vis'), () => 'spectrum', { mini: true });
  else bar.querySelector('.rb-vis').remove();
  return bar;
}

function cmd(a) {
  const r = radioPlayer;
  if (a === 'toggle') r.toggle();
  else if (a === 'prev') r.step(-1);
  else if (a === 'next') r.step(1);
  else if (a === 'close') {
    closeFull();
    r.stop();
  } else if (a === 'expand') openFull();
  else if (a === 'rec' && r.station) toggleRadioRecording(r.station).then(() => radioPlayer.emit());
  else if (a === 'fav' && r.station) {
    const on = toggleRadioFav(r.station);
    toast(on ? _t('{name} hozzáadva a kedvencekhez', { name: r.station.name }) : _t('{name} eltávolítva a kedvencek közül', { name: r.station.name }));
  }
}

let lastId = '';
function updateBar() {
  const r = radioPlayer;
  document.body.classList.toggle('radio-on', r.active);
  if (!r.active) {
    bar?.remove();
    bar = null;
    lastId = '';
    return;
  }
  const b = ensureBar();
  const st = r.station;
  if (lastId !== st.id) {
    lastId = st.id;
    b.querySelector('.rb-logo-slot').innerHTML = logoBox(st);
    b.querySelector('.rb-name').textContent = st.name;
  }
  b.querySelector('.rb-now').textContent = stateText();
  b.classList.toggle('is-error', r.state === 'error');
  b.classList.toggle('is-loading', r.state === 'loading');
  const t = b.querySelector('[data-rb="toggle"]');
  t.innerHTML = r.playing ? P.pause : ICON.play;
  t.setAttribute('aria-label', r.playing ? _t('Szünet') : _t('Lejátszás'));
  const fav = isRadioFav(st.id);
  const f = b.querySelector('.rb-fav');
  f.innerHTML = fav ? ICON.check : ICON.plus;
  f.title = fav ? _t('Eltávolítás a kedvencekből') : _t('Kedvencekhez');
  b.querySelector('input').value = String(fx().volume);
  recBtn(b.querySelector('.rb-rec'), st);
  const multi = r.list.length > 1;
  b.querySelectorAll('[data-rb="prev"], [data-rb="next"]').forEach((x) => (x.hidden = !multi));
  if (full) updateFull();
}
/** A ● gomb állapota (felvétel közben piros, „Felvétel leállítása”). */
function recBtn(b, st) {
  if (!b) return;
  const on = !!recordingOf(st.id);
  b.classList.toggle('on', on);
  b.innerHTML = '<span class="rec-ico">●</span>';
  b.title = on ? _t('Felvétel leállítása') : _t('Felvétel (a Rádió → Felvételek alatt találod)');
}
bus.on('radio-player', updateBar);
bus.on('rec', () => radioPlayer.active && updateBar());
bus.on('epg', () => radioPlayer.active && updateBar());
bus.on('radio-favs', () => radioPlayer.active && updateBar());
bus.on('radio-fx', () => {
  if (bar) bar.querySelector('input').value = String(fx().volume);
  if (full) drawFxChips();
});
// (betöltetlen logó helyett a monogram marad)
document.addEventListener('error', (e) => e.target.classList?.contains('rlogo') && e.target.remove(), true);

// ---------------------------------------------------------------------------
// „Most szól” nézet
// ---------------------------------------------------------------------------
const SLEEP = [0, 15, 30, 60, 90];
const XFADE = [0, 2, 4];

function openFull() {
  if (!radioPlayer.active || full) return;
  full = html(`<section id="radio-full" role="dialog" aria-label="${_t('Most szól')}">
    <div class="rf-head">
      <span class="muted">${_t('Most szól')}</span><span class="grow"></span>
      <button class="round small" data-rf="close" title="${_t('Vissza (Esc)')}">${ICON.chevron}</button>
    </div>
    <div class="rf-main">
      <div class="rf-art"><div class="rf-cover"></div></div>
      <div class="rf-info">
        <div class="rf-station"></div>
        <h1 class="rf-title"></h1>
        <div class="rf-artist"></div>
        <div class="rf-state muted"></div>
        <div class="rf-prog"></div>
        <div class="rf-links"></div>
      </div>
      ${audioFxAvailable ? '<canvas class="rf-vis" aria-hidden="true"></canvas>' : ''}
    </div>
    <div class="rf-bar">
      <div class="rf-ctrls">
        <button class="round" data-rf="prev" title="${_t('Előző adó (CH−)')}">${P.prev}</button>
        <button class="round white big" data-rf="toggle"></button>
        <button class="round" data-rf="next" title="${_t('Következő adó (CH+)')}">${P.next}</button>
        <button class="round" data-rf="fav"></button>
        ${canRecord ? `<button class="round rb-rec" data-rf="rec"></button>` : ''}
        <label class="rb-vol">${P.vol}<input type="range" min="0" max="1" step="0.05" aria-label="${_t('Hangerő')}" /></label>
      </div>
      <div class="rf-menus"></div>
    </div>
    <div class="p-menu rf-menu" role="menu" hidden></div>
  </section>`);
  document.body.append(full);
  document.body.classList.add('radio-full');
  full.addEventListener('click', onFullClick);
  full.querySelector('input').addEventListener('input', (e) => radioPlayer.setVolume(Number(e.target.value)));
  if (audioFxAvailable) drawVisualizer(full.querySelector('.rf-vis'), () => fx().vis);
  lastCover = '';
  drawFxChips();
  updateFull();
  full.querySelector('[data-rf="toggle"]').focus({ preventScroll: true });
}

function closeFull() {
  if (!full) return false;
  menuKind = '';
  stopRadioStats();
  full.remove();
  full = null;
  document.body.classList.remove('radio-full');
  bar?.querySelector('[data-rb="expand"]')?.focus({ preventScroll: true });
  return true;
}
document.addEventListener('adas-radio-expand', openFull);


// A beállítások a tévés / VOD-lejátszóhoz hasonlóan egy-egy rövid gombról nyíló menüben – így fekvő képernyőn
// minden egy képernyőre fér.
let menuKind = '';
const sleepLeft = () => (radioPlayer.sleepAt ? Math.max(1, Math.round((radioPlayer.sleepAt - Date.now()) / 60e3)) : 0);
const mi = (attr, val, label, on, title = '', role = 'menuitemradio') => `<button class="menu-item ${on ? 'sel' : ''}" role="${role}" aria-checked="${on}" ${attr}="${esc(val)}" ${title ? `title="${esc(title)}"` : ''}>${esc(label)}</button>`;

function drawFxChips() {
  const box = full?.querySelector('.rf-menus');
  if (!box) return;
  const f = fx();
  const left = sleepLeft();
  const visName = VIS_MODES.find(([id]) => id === f.vis)?.[1] || '';
  const eqName = EQ_PRESETS.find(([id]) => id === f.eq)?.[1] || '';
  const mb = (k, ico, label, title, on = false) => `<button class="btn small rf-mb ${on ? 'on' : ''}" data-rfm="${k}" aria-haspopup="menu" aria-expanded="${menuKind === k}" title="${esc(title)}">${ico}<span>${esc(label)}</span></button>`;
  box.innerHTML = [
    audioFxAvailable && mb('vis', P.vis, _t('Hangkép'), `${_t('Vizualizáció')}: ${visName}`),
    audioFxAvailable && mb('sound', P.sound, _t('Hangzás'), _t('Hangerő-kiegyenlítés, térhatás, retro rádió, átúsztatás'), f.widen || f.retro),
    audioFxAvailable && mb('eq', P.eq, _t('Hangszín'), `${_t('Hangszínszabályzó')}: ${eqName}`, f.eq !== 'flat'),
    mb('sleep', P.sleep, left ? _t('{m} perc', { m: left }) : _t('Elalvás'), _t('Elalvás-időzítő'), !!left),
    mb('hist', P.hist, _t('Előtte szólt'), _t('Előtte szólt')),
    mb('stats', P.stats, _t('Adás adatai'), _t('Adás adatai (D)')),
  ]
    .filter(Boolean)
    .join('');
  if (menuKind) renderMenu();
}

function renderMenu() {
  const menu = full?.querySelector('.rf-menu');
  if (!menu) return;
  const f = fx();
  const r = radioPlayer;
  const left = sleepLeft();
  let body = '';
  if (menuKind === 'vis') body = `<h4>${_t('Vizualizáció')}</h4>${VIS_MODES.map(([id, n]) => mi('data-vis', id, n, f.vis === id)).join('')}`;
  else if (menuKind === 'sound')
    body = `<h4>${_t('Hangzás')}</h4>
      ${mi('data-tog', 'level', _t('Hangerő-kiegyenlítés'), f.level, _t('Az adók eltérő hangerejét kiegyenlíti, a halk részeket kiemeli'), 'menuitemcheckbox')}
      ${mi('data-tog', 'widen', _t('Térhatás'), f.widen, _t('Szélesebb sztereó kép'), 'menuitemcheckbox')}
      ${mi('data-tog', 'retro', _t('Retro rádió'), f.retro, _t('Régi középhullámú készülék hangja, halk sercegéssel'), 'menuitemcheckbox')}
      <h4>${_t('Átúsztatás adóváltáskor')}</h4>${XFADE.map((s) => mi('data-xfade', String(s), s ? _t('{s} mp', { s }) : _t('Ki'), f.xfade === s)).join('')}`;
  else if (menuKind === 'eq') body = `<h4>${_t('Hangszínszabályzó')}</h4>${EQ_PRESETS.map(([id, n]) => mi('data-eq', id, n, f.eq === id)).join('')}`;
  else if (menuKind === 'sleep')
    body = `<h4>${_t('Elalvás-időzítő')}</h4>${left ? `<p class="muted small">${_t('Még {m} perc', { m: left })}</p>` : ''}${SLEEP.map((m) => mi('data-sleep', String(m), m ? _t('{m} perc', { m }) : _t('Ki'), m ? false : !left)).join('')}`;
  else if (menuKind === 'stats') body = `<h4>${_t('Adás adatai')}</h4>${radioStatsHtml()}`;
  else if (menuKind === 'hist') {
    // (az éppen szóló szám nem „előtte szólt”)
    const hist = r.history.filter((h, i) => i > 0 || h.text !== r.now.text);
    body = `<h4>${_t('Előtte szólt')}</h4>${
      hist.length
        ? hist
            .map((h) => `<div class="rf-h">${h.cover ? `<img src="${esc(h.cover)}" alt="" />` : '<span class="rf-h-ph">♪</span>'}<span><b>${esc(h.title)}</b><small>${esc(h.artist)} · ${fmtTime(h.t)}</small></span>
          <a href="#" class="round small" data-ext="https://www.youtube.com/results?search_query=${encodeURIComponent(`${h.artist} ${h.title}`)}" title="${_t('Keresés a YouTube-on')}">${ICON.external}</a></div>`)
            .join('')
        : `<p class="muted small">${_t('Itt jelennek meg a rádióban elhangzott számok (ha az adó küldi a címüket).')}</p>`
    }`;
  }
  // (újrarajzoláskor – pl. új szám az előzményekben – a fókusz ugyanazon a helyen marad)
  const focusables = () => [...menu.querySelectorAll('button, a')];
  const fi = menu.contains(document.activeElement) ? focusables().indexOf(document.activeElement) : -1;
  menu.innerHTML = body;
  if (fi >= 0) {
    const list = focusables();
    list[Math.min(fi, list.length - 1)]?.focus({ preventScroll: true });
  }
  menu.dataset.kind = menuKind;
  menu.hidden = false;
  // a menü a gombja fölött (jobb széléhez igazítva, a képernyőn belül)
  const btn = full.querySelector(`[data-rfm="${menuKind}"]`);
  if (btn) {
    const fr = full.getBoundingClientRect();
    const br = btn.getBoundingClientRect();
    menu.style.bottom = `${Math.round(fr.bottom - br.top + 8)}px`;
    menu.style.right = `${Math.max(8, Math.round(fr.right - br.right))}px`;
  }
}
function openMenu(kind) {
  if (menuKind === kind) return void closeMenu(true);
  menuKind = kind;
  if (kind === 'stats') startRadioStats();
  else stopRadioStats();
  drawFxChips();
  const menu = full.querySelector('.rf-menu');
  (menu.querySelector('.menu-item.sel') || menu.querySelector('button, a'))?.focus({ preventScroll: true });
}
/** A menü bezárása; focusBtn: a fókusz vissza a gombjára (billentyűzet / távirányító). */
function closeMenu(focusBtn = false) {
  if (!full || !menuKind) return false;
  const k = menuKind;
  menuKind = '';
  stopRadioStats();
  full.querySelector('.rf-menu').hidden = true;
  drawFxChips();
  if (focusBtn) full.querySelector(`[data-rfm="${k}"]`)?.focus({ preventScroll: true });
  return true;
}

function onFullClick(e) {
  const t = e.target.closest('button, a');
  // a menün kívüli kattintás bezárja a menüt
  if (menuKind && !e.target.closest('.rf-menu, [data-rfm]')) closeMenu();
  if (!t) return;
  const d = t.dataset;
  if (d.rfm) return void openMenu(d.rfm);
  if (d.rf === 'close') return void closeFull();
  if (d.rfProg && radioPlayer.station) {
    const p = epg.list(radioPlayer.station.id).find((x) => x.start === Number(d.rfProg));
    return void (p && openRadioProgram(radioPlayer.station, p, radioPlayer.list));
  }
  if (d.rf) return cmd(d.rf);
  if (d.vis) setFx({ vis: d.vis });
  else if (d.tog) setFx({ [d.tog]: !fx()[d.tog] });
  else if (d.eq) setFx({ eq: d.eq });
  else if (d.xfade !== undefined) setFx({ xfade: Number(d.xfade) });
  else if (d.sleep !== undefined) {
    radioPlayer.setSleep(Number(d.sleep));
    if (Number(d.sleep)) toast(_t('A rádió {m} perc múlva elhalkul és kikapcsol.', { m: d.sleep }));
    drawFxChips();
  } else return;
  // egyválasztós menü a választás után bezárul; a hangzásmenü nyitva marad (több kapcsoló), a fókusz a
  // kapcsolón marad
  if (d.tog !== undefined || d.xfade !== undefined) {
    const sel = Object.keys(d).map((k) => `[data-${k}="${CSS.escape(d[k])}"]`)[0];
    if (sel) full?.querySelector(`.rf-menu ${sel}`)?.focus({ preventScroll: true });
  } else closeMenu(true);
}

const searchLinks = (q) =>
  q
    ? `<a class="btn small" href="#" data-ext="https://www.youtube.com/results?search_query=${encodeURIComponent(q)}">${_t('Keresés a YouTube-on')}</a>
       <a class="btn small" href="#" data-ext="https://open.spotify.com/search/${encodeURIComponent(q)}">${_t('Keresés a Spotify-on')}</a>`
    : '';

let lastCover = '';
function updateFull() {
  const r = radioPlayer;
  if (!full) return;
  if (!r.active) return void closeFull();
  const st = r.station;
  const n = r.now;
  const isSong = !!n.artist;
  full.querySelector('.rf-station').innerHTML = `${logoBox(st, 'rf-logo')}<span><b>${esc(st.name)}</b><small>${esc([countryFlag(st.country), countryName(st.country), st.genres.map(genreName).join(', '), st.bitrate ? `${st.bitrate} kbps` : '', st.codec].filter(Boolean).join(' · '))}</small></span>`;
  full.querySelector('.rf-title').textContent = isSong ? n.title : n.text || st.name;
  full.querySelector('.rf-artist').textContent = isSong ? n.artist : '';
  full.querySelector('.rf-state').textContent = r.state === 'playing' ? (n.text ? '' : _t('Az adó nem küldi, mi szól éppen.')) : stateText();
  const cover = n.cover || st.logo || '';
  if (cover !== lastCover) {
    lastCover = cover;
    const c = full.querySelector('.rf-cover');
    c.classList.toggle('is-logo', !n.cover);
    c.style.setProperty('--h', String(hashHue(st.name)));
    c.innerHTML = cover ? `<img src="${esc(cover)}" alt="" referrerpolicy="no-referrer" />` : `<span class="initials">${esc(initials(st.name))}</span>`;
  }
  const tg = full.querySelector('[data-rf="toggle"]');
  tg.innerHTML = r.playing ? P.pause : ICON.play;
  tg.title = r.playing ? _t('Szünet (szóköz)') : _t('Lejátszás (szóköz)');
  const fav = isRadioFav(st.id);
  const fb = full.querySelector('[data-rf="fav"]');
  fb.innerHTML = fav ? ICON.check : ICON.plus;
  fb.title = fav ? _t('Eltávolítás a kedvencekből') : _t('Kedvencekhez');
  full.querySelectorAll('[data-rf="prev"], [data-rf="next"]').forEach((x) => (x.hidden = r.list.length < 2));
  recBtn(full.querySelector('[data-rf="rec"]'), st);
  // műsorújság: a most futó és a következő műsor (kattintva az adatlap: leírás, felvétel ütemezése)
  const ep = epg.now(st.id);
  full.querySelector('.rf-prog').innerHTML = ep
    ? [ep.cur && [_t('Most'), ep.cur], ep.next && [_t('Utána'), ep.next]]
        .filter(Boolean)
        .map(([l, p]) => `<button class="btn rf-p" data-rf-prog="${p.start}"><small>${esc(l)} · ${fmtTime(p.start)}–${fmtTime(p.stop)}</small><b>${esc(p.title)}</b>${p === ep.cur ? `<i class="rg-bar" style="width:${(ep.progress * 100).toFixed(1)}%"></i>` : ''}</button>`)
        .join('')
    : '';
  full.querySelector('input').value = String(fx().volume);
  full.querySelector('.rf-links').innerHTML = searchLinks(isSong ? `${n.artist} ${n.title}` : '') + (st.homepage && /^https?:\/\//.test(st.homepage) ? `<a class="btn small" href="#" data-ext="${esc(st.homepage)}">${_t('Az adó honlapja')}</a>` : '');
  if (menuKind === 'hist') renderMenu();
  full.classList.toggle('is-playing', r.state === 'playing');
}
// az Adás adatai másodpercenként frissül, amíg a menüje nyitva van
setInterval(() => full && menuKind === 'stats' && renderMenu(), 1000);
// az elalvás-időzítő hátralévő ideje percenként
setInterval(() => full && radioPlayer.sleepAt && drawFxChips(), 30e3);

// ---------------------------------------------------------------------------
// Billentyűk (az app.js hívja, a videólejátszó után): szóköz, CH+/−, médiagombok, Esc
// ---------------------------------------------------------------------------
export function radioKey(e) {
  if (!radioPlayer.active || player.active) return false;
  const k = e.key;
  const typing = e.target.matches?.('input:not([type=checkbox]):not([type=range]), textarea, select');
  if (full && (k === 'Escape' || ((k === 'Backspace' || k === 'BrowserBack') && !typing))) return closeMenu(true) || closeFull();
  // D: Adás adatai (mint a tévés lejátszóban)
  if (full && (k === 'd' || k === 'D') && !typing && !e.ctrlKey && !e.altKey && !e.metaKey) return (openMenu('stats'), true);
  if (['MediaPlayPause', 'MediaPlay', 'MediaPause'].includes(k)) {
    if (k === 'MediaPlay') radioPlayer.resume();
    else if (k === 'MediaPause') radioPlayer.pause();
    else radioPlayer.toggle();
    return true;
  }
  if (k === 'MediaStop') return (radioPlayer.stop(), true);
  if (k === 'ChannelUp' || k === 'MediaTrackNext') return (radioPlayer.step(1), true);
  if (k === 'ChannelDown' || k === 'MediaTrackPrevious') return (radioPlayer.step(-1), true);
  if (k === ' ' && !typing && !e.target.closest?.('button, a, .rcard, .card')) return (radioPlayer.toggle(), true);
  return false;
}
export const radioFullOpen = () => !!full;
export { closeFull as closeRadioFull };
