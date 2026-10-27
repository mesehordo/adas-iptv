// Felület-elrendezések megjelenítése (a definíciók és a body-jelölés a layoutdefs.js-ben).
// A Főoldal (és a Részletes / Gyűjtemény elrendezésben a TV oldal) elrendezésenként más; a többi oldal közös.
import { esc, html, hashHue, fmtTime, bus, debounce, seededShuffle, norm } from './util.js';
import { api } from './api.js';
import { store } from './store.js';
import { epg } from './epg.js';
import { catalog, visible, getChannels, countryName, countryFlag, categoryName, channelStatus, homeRank, rankScore, byAvailability, activeLists, MINE, KIDS_CATEGORIES } from './catalog.js';
import { ICON, logoHtml, openInfo, gridEl, emptyState } from './components.js';
import { player, startPreview, stopPreview } from './player.js';
import { renderTv } from './views.js';
import { renderDashboard } from './dashboard.js';
import { radioMenuOn } from './radiopage.js';
import { sportMenuOn } from './sportpage.js';
import { LAYOUTS, currentLayout } from './layoutdefs.js';
import { _t } from './i18n.js';

const previewOn = () => !!api.caps.preview && store.settings.heroPreview !== false;

/** Az útvonal megjelenítője az aktuális elrendezésben (null: a közös oldal). */
export function layoutRoute(name) {
  const id = currentLayout();
  if (name === 'home') return { classic: renderDashboard, cinema: renderCinema, showcase: renderShowcase, shelf: renderShelf, library: renderLibraryHome, tiles: renderTiles, detail: renderDetail, unified: renderUnified }[id];
  if (name === 'tv' && (id === 'detail' || id === 'unified')) return id === 'detail' ? renderDetail : renderUnified;
  return null;
}

// ---------------------------------------------------------------------------
// Közös segédek
// ---------------------------------------------------------------------------
const visSet = () => new Set(visible());
const ok = (ch) => channelStatus(ch) !== 'bad';

/** Ajánlott csatornák a kiemelt helyekre: utoljára nézett, műsoron lévő kedvencek, aztán a népszerű hazaiak. */
function picks(n) {
  const vis = visSet();
  const p = store.profile;
  const favSet = new Set(p.favorites);
  const onAir = [...vis].filter((c) => epg.now(c.id)?.cur);
  onAir.sort((a, b) => favSet.has(b.id) - favSet.has(a.id) || homeRank(b) - homeRank(a) || rankScore(b) - rankScore(a));
  const pool = [...getChannels(p.recent).slice(0, 2), ...getChannels(p.favorites).filter((c) => epg.now(c.id)?.cur), ...onAir.slice(0, 30)].filter((c) => vis.has(c) && ok(c));
  const uniq = [...new Set(pool)];
  if (uniq.length < n) for (const c of byAvailability([...vis].sort((a, b) => homeRank(b) - homeRank(a) || rankScore(b) - rankScore(a)))) if (!uniq.includes(c)) uniq.push(c);
  // (az első mindig a legrelevánsabb, a többi napi változatossággal)
  const [first, ...rest] = uniq.slice(0, Math.max(n * 3, 12));
  return first ? [first, ...seededShuffle(rest, Math.floor(Date.now() / 86400e3)).slice(0, n - 1)] : [];
}

/** „Most / utána” sor egy csatornához. */
function nowLine(ch) {
  const now = epg.now(ch.id);
  if (!now?.cur) return '';
  return `<div class="hero-now"><span class="now-label">${_t('MOST')}</span> <b>${esc(now.cur.title)}</b> <span class="muted">${fmtTime(now.cur.start)}–${fmtTime(now.cur.stop)}</span></div>`;
}
const metaLine = (ch) => [countryFlag(ch.country) + ' ' + esc(countryName(ch.country)), ...ch.categories.slice(0, 3).map((c) => esc(categoryName(c)))].filter((x) => x.trim()).join(' · ');

/** A TV oldal sorai a Főoldal (kiemelt rész) alatt – a fülsor nélkül. */
function tvRowsInto(view) {
  renderTv(view);
  const rows = view.querySelector('.tv-rows');
  rows?.querySelector('.tv-head')?.remove();
  rows?.classList.add('after-hero');
  return rows;
}

// Lejátszás / adatlap egyedi (nem .card) elemekről: data-lplay / data-linfo = csatornaazonosító
document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-lplay], [data-linfo]');
  if (!el) return;
  const ch = catalog.byId.get(el.dataset.lplay || el.dataset.linfo);
  if (!ch) return;
  e.preventDefault();
  if (el.dataset.linfo) openInfo(ch);
  else player.play(ch);
});

// ---------------------------------------------------------------------------
// Kiemelt borító (Mozi, Kirakat, Csempék) – egy vagy több lapozható csatornával
// ---------------------------------------------------------------------------
let heroTimer = null;
function heroSlide(ch, i) {
  const now = epg.now(ch.id);
  return `<div class="hero-slide ${i === 0 ? 'active' : ''}" data-i="${i}" data-id="${esc(ch.id)}" style="--h:${hashHue(ch.name)}" ${i ? 'aria-hidden="true"' : ''}>
    <div class="hero-bg">${ch.logo ? `<img src="${esc(ch.logo)}" alt="" referrerpolicy="no-referrer" />` : ''}</div>
    <div class="hero-shade"></div>
    <div class="hero-content">
      <div class="hero-logo">${logoHtml(ch)}</div>
      <h1>${esc(ch.name)}</h1>
      <div class="hero-meta">${metaLine(ch)}</div>
      ${nowLine(ch)}
      ${now?.cur?.desc ? `<p class="hero-desc">${esc(now.cur.desc.slice(0, 260))}${now.cur.desc.length > 260 ? '…' : ''}</p>` : ''}
      <div class="hero-btns">
        <button class="btn white big" data-h="play">${ICON.play} ${_t('Lejátszás')}</button>
        <button class="btn gray big" data-h="info">${ICON.info} ${_t('További információk')}</button>
      </div>
    </div>
  </div>`;
}
function heroEl(heroes) {
  const multi = heroes.length > 1;
  const el = html(`<section class="hero lay-hero ${multi ? 'carousel' : ''}">
    <div class="hero-slides">${heroes.map(heroSlide).join('')}</div>
    ${
      multi
        ? `<button class="hero-arrow left" data-go="-1" aria-label="${_t('Előző')}" tabindex="-1">${ICON.left}</button>
           <button class="hero-arrow right" data-go="1" aria-label="${_t('Következő')}" tabindex="-1">${ICON.right}</button>
           <div class="hero-dots">${heroes.map((_, i) => `<button class="dot ${i ? '' : 'active'}" data-dot="${i}" aria-label="${_t('{n}. kiemelt', { n: i + 1 })}" tabindex="-1"></button>`).join('')}</div>`
        : ''
    }
  </section>`);
  let cur = 0;
  const slides = [...el.querySelectorAll('.hero-slide')];
  let previewTimer = null;
  const schedulePreview = () => {
    stopPreview();
    clearTimeout(previewTimer);
    if (!previewOn()) return;
    previewTimer = setTimeout(() => {
      if (el.isConnected && !player.active) startPreview(slides[cur].querySelector('.hero-bg'), heroes[cur]);
    }, 1500);
  };
  const show = (i) => {
    cur = (i + heroes.length) % heroes.length;
    slides.forEach((s, n) => {
      s.classList.toggle('active', n === cur);
      if (n === cur) s.removeAttribute('aria-hidden');
      else s.setAttribute('aria-hidden', 'true');
    });
    el.querySelectorAll('.dot').forEach((d, n) => d.classList.toggle('active', n === cur));
    schedulePreview();
  };
  el.addEventListener('click', (e) => {
    const h = e.target.closest('[data-h]');
    const go = e.target.closest('[data-go]');
    const dot = e.target.closest('[data-dot]');
    if (h) {
      const ch = heroes[cur];
      h.dataset.h === 'play' ? player.play(ch) : openInfo(ch);
    } else if (go) show(cur + Number(go.dataset.go));
    else if (dot) show(Number(dot.dataset.dot));
  });
  // lapozás a gombokon állva balra / jobbra (távirányító): az utolsó gombon jobbra a következő, az elsőn balra az előző
  el.addEventListener('keydown', (e) => {
    if (!multi || !e.target.closest('.hero-btns')) return;
    const first = e.target === e.target.parentElement.firstElementChild;
    const last = e.target === e.target.parentElement.lastElementChild;
    if ((e.key === 'ArrowLeft' && first && cur > 0) || (e.key === 'ArrowRight' && last)) {
      e.preventDefault();
      e.stopPropagation();
      show(cur + (e.key === 'ArrowLeft' ? -1 : 1));
      slides[cur].querySelector(e.key === 'ArrowLeft' ? '[data-h="info"]' : '[data-h="play"]').focus({ preventScroll: true });
    }
  });
  clearInterval(heroTimer);
  if (multi) {
    heroTimer = setInterval(() => {
      if (!el.isConnected) return clearInterval(heroTimer);
      if (el.matches(':hover') || el.contains(document.activeElement) || player.active) return;
      show(cur + 1);
    }, 12000);
  }
  schedulePreview();
  return el;
}

// ---------------------------------------------------------------------------
// 1. Mozi: egy nagy kiemelt borító + sorok
// ---------------------------------------------------------------------------
function renderCinema(view) {
  tvRowsInto(view);
  const h = picks(1);
  if (h.length) view.prepend(heroEl(h));
}

// ---------------------------------------------------------------------------
// 2. Kirakat: lapozó kiemelt sáv + a fő részek nagy gombjai + sorok
// ---------------------------------------------------------------------------
const GUIDE_ICO = '<svg viewBox="0 0 24 24"><path d="M3 4h18v16H3zm2 2v3h4V6zm6 0v3h8V6zM5 11v3h8v-3zm10 0v3h4v-3zM5 16v2h4v-2zm6 0v2h8v-2z"/></svg>';
const REC_ICO = '<svg viewBox="0 0 24 24"><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm0 2a8 8 0 1 1 0 16 8 8 0 0 1 0-16Zm0 3a5 5 0 1 0 0 10 5 5 0 0 0 0-10Z"/></svg>';
function navIcon(route) {
  return document.querySelector(`#nav .links a[data-route="${route}"] .nav-ico`)?.outerHTML || '';
}
function appRowEl() {
  const items = [
    ['tv', '#/tv', _t('TV')],
    ['guide', '#/guide', _t('Műsorújság'), GUIDE_ICO],
    radioMenuOn() && ['radio', '#/radio', _t('Rádió')],
    ['vod', '#/vod', _t('VOD')],
    sportMenuOn() && ['sport', '#/sport', _t('Sport')],
    ['favorites', '#/favorites', _t('Kedvencek')],
    ['recordings', '#/recordings', _t('Felvételek'), REC_ICO],
  ].filter(Boolean);
  return html(`<section class="app-row" aria-label="${_t('Fő részek')}">${items
    .map(([r, href, label, ico]) => `<a class="app-tile" href="${href}" style="--h:${hashHue(r + 'app')}">${ico || navIcon(r)}<b>${esc(label)}</b></a>`)
    .join('')}</section>`);
}
function renderShowcase(view) {
  tvRowsInto(view);
  const rows = view.querySelector('.tv-rows');
  rows?.prepend(appRowEl());
  const h = picks(6);
  if (h.length) view.prepend(heroEl(h));
}

// ---------------------------------------------------------------------------
// 3. Polc: a kijelölt kártya csatornája tölti ki a hátteret, alul egy sor nagy kártya
// ---------------------------------------------------------------------------
function shelfInfo(ch) {
  const now = epg.now(ch.id);
  return `<div class="shelf-logo">${logoHtml(ch)}</div>
    <h1>${esc(ch.name)}</h1>
    <div class="hero-meta">${metaLine(ch)}</div>
    ${now?.cur ? `<div class="shelf-now"><b>${esc(now.cur.title)}</b> <span class="muted">${fmtTime(now.cur.start)}–${fmtTime(now.cur.stop)}</span>
      <div class="bar"><i style="width:${(now.progress * 100).toFixed(1)}%"></i></div></div>` : ''}
    ${now?.next ? `<div class="muted">${_t('Utána: {time} {title}', { time: fmtTime(now.next.start), title: esc(now.next.title) })}</div>` : ''}`;
}
function renderShelf(view) {
  const vis = visSet();
  const p = store.profile;
  let list = getChannels(p.favorites).filter((c) => vis.has(c));
  if (list.length < 6) list = [...new Set([...list, ...getChannels(p.recent).filter((c) => vis.has(c)), ...picks(14)])];
  list = list.slice(0, 24);
  if (!list.length) {
    view.innerHTML = emptyState(_t('Nincs megjeleníthető csatorna'), _t('Ellenőrizd a beállításokat vagy a profil szűrőit.'), `<a class="btn primary" href="#/settings">${_t('Beállítások')}</a>`);
    return;
  }
  view.innerHTML = '';
  const el = html(`<section class="shelf" style="--h:${hashHue(list[0].name)}">
    <div class="shelf-bg"></div><div class="shelf-shade"></div>
    <div class="shelf-info"></div>
    <div class="shelf-row" role="list">${list
      .map((c) => `<button class="shelf-card" role="listitem" data-id="${esc(c.id)}" data-lplay="${esc(c.id)}" data-sid="${esc(c.id)}" style="--h:${hashHue(c.name)}" title="${esc(c.name)}">${logoHtml(c)}<span>${esc(c.name)}</span></button>`)
      .join('')}</div>
  </section>`);
  view.append(el);
  const bg = el.querySelector('.shelf-bg');
  const info = el.querySelector('.shelf-info');
  let cur = null;
  let previewTimer = null;
  const select = (ch) => {
    if (!ch || ch === cur) return;
    cur = ch;
    el.style.setProperty('--h', hashHue(ch.name));
    bg.innerHTML = ch.logo ? `<img src="${esc(ch.logo)}" alt="" referrerpolicy="no-referrer" />` : '';
    bg.classList.remove('has-video');
    info.innerHTML = shelfInfo(ch);
    el.querySelectorAll('.shelf-card').forEach((b) => b.classList.toggle('sel', b.dataset.sid === ch.id));
    stopPreview();
    clearTimeout(previewTimer);
    if (previewOn()) previewTimer = setTimeout(() => el.isConnected && !player.active && cur === ch && startPreview(bg, ch), 1500);
  };
  const pick = debounce((id) => select(catalog.byId.get(id)), 120);
  el.addEventListener('focusin', (e) => e.target.dataset?.sid && pick(e.target.dataset.sid));
  el.addEventListener('mouseover', (e) => {
    const b = e.target.closest('.shelf-card');
    if (b) pick(b.dataset.sid);
  });
  select(list[0]);
  // a polc alatt a többi sor (a kedvencek már a polcon vannak)
  const rest = html('<div class="shelf-rest"></div>');
  view.append(rest);
  tvRowsInto(rest);
  rest.querySelector('.tv-rows')?.classList.add('shelf-rows');
}

// ---------------------------------------------------------------------------
// 4. Könyvtár: oldalsó gyűjtemények + gyorsrács + sorok (a rádiósáv alul rögzítve – CSS)
// ---------------------------------------------------------------------------
function quickItem(ch) {
  const now = epg.now(ch.id);
  return `<button class="qitem" data-id="${esc(ch.id)}" data-lplay="${esc(ch.id)}" style="--h:${hashHue(ch.name)}"><span class="qlogo">${logoHtml(ch)}</span><span class="qtext"><b>${esc(ch.name)}</b>${now?.cur ? `<small>${esc(now.cur.title)}</small>` : ''}</span></button>`;
}
function greeting() {
  const h = new Date().getHours();
  const name = store.profile?.name || '';
  return h < 5 || h >= 21 ? _t('Jó éjszakát, {name}!', { name }) : h < 10 ? _t('Jó reggelt, {name}!', { name }) : h < 18 ? _t('Jó napot, {name}!', { name }) : _t('Jó estét, {name}!', { name });
}
function renderLibraryHome(view) {
  tvRowsInto(view);
  const vis = visSet();
  const p = store.profile;
  const quick = [...new Set([...getChannels(p.recent), ...getChannels(p.favorites)])].filter((c) => vis.has(c)).slice(0, 8);
  const head = html(`<section class="lib-head"><h1>${esc(greeting())}</h1>${quick.length ? `<div class="qgrid">${quick.map(quickItem).join('')}</div>` : ''}</section>`);
  view.querySelector('.tv-rows')?.prepend(head);
}

/** A Könyvtár elrendezés oldalsó gyűjteményei (a menü alatt). */
function libNavHtml() {
  const p = store.profile;
  const vis = visSet();
  const favs = getChannels(p.favorites).filter((c) => vis.has(c)).slice(0, 14);
  const links = [
    ['#/favorites', _t('Kedvenc csatornák')],
    ['#/guide', _t('Műsorújság')],
    ['#/recordings', _t('Felvételek')],
    radioMenuOn() && ['#/radio?tab=favs', _t('Kedvenc rádiók')],
    ['#/own', _t('Saját médiatár')],
  ].filter(Boolean);
  return `<h4>${_t('Gyűjteményeid')}</h4>${links.map(([h, l]) => `<a href="${h}">${esc(l)}</a>`).join('')}
    ${favs.length ? `<h4>${_t('Kedvenceid')}</h4>${favs.map((c) => `<button class="lib-ch" data-id="${esc(c.id)}" data-lplay="${esc(c.id)}" title="${esc(c.name)}">${logoHtml(c)}<span>${esc(c.name)}</span></button>`).join('')}` : ''}`;
}
const updateLibNav = debounce(() => {
  const nav = document.getElementById('nav');
  let box = document.getElementById('lib-nav');
  if (currentLayout() !== 'library' || !store.profile) return void box?.remove();
  if (!box) {
    box = html('<div id="lib-nav"></div>');
    nav.querySelector('.links')?.after(box);
  }
  box.innerHTML = libNavHtml();
}, 200);
for (const ev of ['profile', 'profile-layout', 'favorites', 'catalog']) bus.on(ev, updateLibNav);

// ---------------------------------------------------------------------------
// 5. Csempék: kiemelt borító + nagy témakör-csempék + sorok
// ---------------------------------------------------------------------------
const TILE_CATS = ['news', 'kids', 'sports', 'movies', 'series', 'music', 'documentary', 'entertainment', 'lifestyle', 'cooking', 'travel', 'science', 'religious', 'culture'];
function collTilesEl() {
  const vis = visible();
  const kids = store.profile?.kids;
  const count = new Map();
  for (const c of vis) for (const k of new Set(c.categories)) count.set(k, (count.get(k) || 0) + 1);
  const cats = TILE_CATS.filter((k) => (count.get(k) || 0) >= 3 && (!kids || KIDS_CATEGORIES.has(k))).slice(0, 10);
  const home = store.settings.homeCountry;
  const homeN = vis.filter((c) => c.country === home).length;
  const favN = store.profile?.favorites?.length || 0;
  const tiles = [
    favN && ['#/favorites', _t('Kedvencek'), _t('{count} csatorna', { count: favN }), 'fav'],
    homeN && !kids && ['#/browse?country=' + encodeURIComponent(home), countryName(home), _t('{count} csatorna', { count: homeN }), 'home'],
    ...cats.map((k) => ['#/browse?cat=' + encodeURIComponent(k), categoryName(k), _t('{count} csatorna', { count: count.get(k) }), k]),
  ].filter(Boolean);
  if (!tiles.length) return null;
  return html(`<section class="coll-tiles" aria-label="${_t('Témakörök')}">${tiles
    .map(([href, name, sub, key]) => `<a class="coll-tile" href="${href}" style="--h:${hashHue(key + 'coll')}"><b>${esc(name)}</b><small>${esc(sub)}</small></a>`)
    .join('')}</section>`);
}
function renderTiles(view) {
  tvRowsInto(view);
  const t = collTilesEl();
  if (t) view.querySelector('.tv-rows')?.prepend(t);
  const h = picks(1);
  if (h.length) view.prepend(heroEl(h));
}

// ---------------------------------------------------------------------------
// 6. Részletes: csatornalista + a kiválasztott csatorna adatlapja
// ---------------------------------------------------------------------------
let detailSel = '';
const fmtDur = (sec) => {
  const m = Math.round(sec / 60);
  return m < 60 ? _t('{m} perc', { m }) : _t('{h} óra {m} perc', { h: Math.floor(m / 60), m: m % 60 });
};
function mdItem(ch) {
  const now = epg.now(ch.id);
  return `<button class="md-item ${ch.id === detailSel ? 'sel' : ''}" data-id="${esc(ch.id)}" data-mid="${esc(ch.id)}">${logoHtml(ch)}<span><b>${esc(ch.name)}</b><small>${now?.cur ? esc(now.cur.title) : esc(categoryName(ch.categories[0]) || countryName(ch.country) || '')}</small></span></button>`;
}
function mdDetailHtml(ch) {
  const now = epg.now(ch.id);
  const fav = store.isFavorite(ch.id);
  const watched = store.profile?.stats?.ch?.[ch.id] || 0;
  const from = new Date().setHours(0, 0, 0, 0);
  const today = epg.range(ch.id, Date.now() - 3 * 3600e3, from + 86400e3 + 4 * 3600e3);
  return `<button class="btn small md-back" data-md-back>${ICON.left} ${_t('Vissza a listához')}</button>
    <div class="md-head" data-id="${esc(ch.id)}" style="--h:${hashHue(ch.name)}"><div class="md-bg"></div>
      <div class="md-title">${logoHtml(ch)}<div><h1>${esc(ch.name)}</h1><div class="hero-meta">${metaLine(ch)}</div></div></div>
    </div>
    <div class="md-btns">
      <button class="btn white" data-lplay="${esc(ch.id)}">${ICON.play} ${_t('Nézem')}</button>
      <button class="btn gray" data-md-fav>${fav ? ICON.check : ICON.plus} ${fav ? _t('Kedvenc') : _t('Kedvencekhez')}</button>
      <button class="btn gray" data-linfo="${esc(ch.id)}">${ICON.info} ${_t('Adatlap')}</button>
    </div>
    <div class="md-facts">
      ${now?.cur ? `<div><small>${_t('Most')}</small><b>${esc(now.cur.title)}</b><span class="muted">${fmtTime(now.cur.start)}–${fmtTime(now.cur.stop)}</span><div class="bar"><i style="width:${(now.progress * 100).toFixed(1)}%"></i></div></div>` : ''}
      ${now?.next ? `<div><small>${_t('Utána')}</small><b>${esc(now.next.title)}</b><span class="muted">${fmtTime(now.next.start)}</span></div>` : ''}
      <div><small>${_t('Nézési idő')}</small><b>${watched >= 60 ? fmtDur(watched) : _t('még nem nézted')}</b></div>
    </div>
    ${today.length ? `<h3>${_t('Mai műsor')}</h3><ol class="md-sched">${today
      .map((pr) => `<li class="${pr.stop < Date.now() ? 'past' : pr === now?.cur ? 'live' : ''}"><time>${fmtTime(pr.start)}</time><span>${esc(pr.title)}</span></li>`)
      .join('')}</ol>` : `<p class="muted">${_t('Ehhez a csatornához nincs műsoradat.')}</p>`}`;
}
function renderDetail(view) {
  const vis = visible();
  if (!vis.length) {
    view.innerHTML = emptyState(_t('Nincs megjeleníthető csatorna'), _t('Ellenőrizd a beállításokat vagy a profil szűrőit.'), `<a class="btn primary" href="#/settings">${_t('Beállítások')}</a>`);
    return;
  }
  const set = new Set(vis);
  const p = store.profile;
  const favs = getChannels(p.favorites).filter((c) => set.has(c));
  const recent = getChannels(p.recent).filter((c) => set.has(c) && !favs.includes(c)).slice(0, 10);
  const all = byAvailability(vis.slice().sort((a, b) => homeRank(b) - homeRank(a) || rankScore(b) - rankScore(a)));
  if (!catalog.byId.has(detailSel) || !set.has(catalog.byId.get(detailSel))) detailSel = (favs[0] || recent[0] || all[0]).id;
  view.innerHTML = `<div class="md">
    <aside class="md-list"><input class="input md-q" type="search" placeholder="${_t('Csatorna szűrése…')}" aria-label="${_t('Csatorna szűrése')}" />
      <div class="md-groups"></div></aside>
    <section class="md-detail" aria-live="polite"></section>
  </div>`;
  const groups = view.querySelector('.md-groups');
  const detail = view.querySelector('.md-detail');
  const md = view.querySelector('.md');
  const drawList = (q = '') => {
    const t = norm(q.trim());
    const match = (c) => !t || norm(c.name).includes(t);
    const sec = (title, list, limit) => {
      const l = list.filter(match).slice(0, limit);
      return l.length ? `<h4>${esc(title)}</h4>${l.map(mdItem).join('')}` : '';
    };
    groups.innerHTML = sec(_t('Kedvencek'), favs, 200) + sec(_t('Legutóbb nézett'), recent, 10) + sec(t ? _t('Találatok') : _t('Összes csatorna'), all, t ? 200 : 300) || `<p class="muted">${_t('Nincs találat.')}</p>`;
  };
  let previewTimer = null;
  const show = (id, { focusDetail = false } = {}) => {
    const ch = catalog.byId.get(id);
    if (!ch) return;
    detailSel = id;
    groups.querySelectorAll('.md-item').forEach((b) => b.classList.toggle('sel', b.dataset.mid === id));
    detail.innerHTML = mdDetailHtml(ch);
    stopPreview();
    clearTimeout(previewTimer);
    if (previewOn()) previewTimer = setTimeout(() => detail.isConnected && !player.active && detailSel === id && startPreview(detail.querySelector('.md-bg'), ch), 1500);
    if (focusDetail) {
      md.classList.add('show-detail');
      detail.querySelector('[data-lplay]')?.focus({ preventScroll: true });
    }
  };
  drawList();
  show(detailSel);
  view.querySelector('.md-q').addEventListener('input', debounce((e) => drawList(e.target.value), 150));
  const pickFocus = debounce((id) => show(id), 180);
  groups.addEventListener('focusin', (e) => e.target.dataset?.mid && pickFocus(e.target.dataset.mid));
  groups.addEventListener('click', (e) => {
    const b = e.target.closest('.md-item');
    if (!b) return;
    // (telefonon a listából az adatlapra lép; nagy képernyőn a második kattintás / OK indítja a lejátszást)
    if (b.dataset.mid === detailSel && !matchMedia('(max-width: 700px)').matches) return player.play(catalog.byId.get(b.dataset.mid));
    show(b.dataset.mid, { focusDetail: matchMedia('(max-width: 700px)').matches });
  });
  detail.addEventListener('click', (e) => {
    if (e.target.closest('[data-md-back]')) {
      md.classList.remove('show-detail');
      groups.querySelector('.md-item.sel')?.focus({ preventScroll: true });
    } else if (e.target.closest('[data-md-fav]')) {
      store.toggleFavorite(detailSel);
      show(detailSel);
    }
  });
}

// ---------------------------------------------------------------------------
// 7. Gyűjtemény: minden forrás egy helyen, szűrőkkel, rács- vagy listanézettel
// ---------------------------------------------------------------------------
const uniState = () => ({ lists: null, cats: [], country: '', working: false, favs: false, view: 'grid', sort: 'rec', q: '', ...(store.profile?.uni || {}) });
const saveUni = (u) => store.setProfileValue('uni', { ...u, q: '' });
function uniRow(ch) {
  const now = epg.now(ch.id);
  return `<button class="uni-row" data-id="${esc(ch.id)}" data-lplay="${esc(ch.id)}">${logoHtml(ch)}<span class="uni-name"><b>${esc(ch.name)}</b><small>${metaLine(ch)}</small></span>
    <span class="uni-now">${now?.cur ? `${esc(now.cur.title)}<div class="bar"><i style="width:${(now.progress * 100).toFixed(1)}%"></i></div>` : '<span class="muted">–</span>'}</span>
    <span class="round small" data-linfo="${esc(ch.id)}" title="${_t('Részletek (I)')}" role="button" tabindex="-1">${ICON.info}</span></button>`;
}
function renderUnified(view) {
  const vis = visible();
  const u = uniState();
  const lists = [...(vis.some((c) => c.lists?.includes(MINE)) ? [{ id: MINE, name: _t('Saját csatornák') }] : []), ...activeLists()];
  const catCount = new Map();
  const ccCount = new Map();
  for (const c of vis) {
    for (const k of new Set(c.categories)) catCount.set(k, (catCount.get(k) || 0) + 1);
    if (c.country) ccCount.set(c.country, (ccCount.get(c.country) || 0) + 1);
  }
  const cats = [...catCount].sort((a, b) => b[1] - a[1]).slice(0, 24);
  const ccs = [...ccCount].sort((a, b) => (b[0] === store.settings.homeCountry) - (a[0] === store.settings.homeCountry) || b[1] - a[1]).slice(0, 60);
  const listOn = (id) => !u.lists || u.lists.includes(id);
  view.innerHTML = `<div class="uni">
    <aside class="uni-side">
      <details class="uni-filters" ${matchMedia('(max-width: 700px)').matches ? '' : 'open'}><summary>${_t('Szűrők')}</summary>
      <h4>${_t('Források')}</h4>${lists.map((l) => `<label class="uni-check"><input type="checkbox" data-u-list="${esc(l.id)}" ${listOn(l.id) ? 'checked' : ''} /> <span>${esc(l.name)}</span></label>`).join('')}
      <h4>${_t('Ország')}</h4><select class="input" data-u-country><option value="">${_t('Mind')}</option>${ccs.map(([cc, n]) => `<option value="${esc(cc)}" ${u.country === cc ? 'selected' : ''}>${esc(countryName(cc) || cc)} (${n})</option>`).join('')}</select>
      <h4>${_t('Kategóriák')}</h4><div class="uni-cats">${cats.map(([k, n]) => `<button class="chip ${u.cats.includes(k) ? 'on' : ''}" data-u-cat="${esc(k)}" aria-pressed="${u.cats.includes(k)}">${esc(categoryName(k))} <small>${n}</small></button>`).join('')}</div>
      <h4>${_t('Egyéb')}</h4>
      <label class="uni-check"><input type="checkbox" data-u-flag="working" ${u.working ? 'checked' : ''} /> <span>${_t('Csak a működők')}</span></label>
      <label class="uni-check"><input type="checkbox" data-u-flag="favs" ${u.favs ? 'checked' : ''} /> <span>${_t('Csak a kedvencek')}</span></label>
      <button class="btn small" data-u-reset>${_t('Szűrők törlése')}</button>
      </details>
    </aside>
    <section class="uni-main">
      <div class="uni-bar"><input class="input uni-q" type="search" placeholder="${_t('Keresés a gyűjteményben…')}" aria-label="${_t('Keresés a gyűjteményben')}" value="${esc(u.q)}" />
        <select class="input" data-u-sort aria-label="${_t('Rendezés')}">${[['rec', _t('Ajánlott')], ['name', _t('Név szerint')], ['watched', _t('Legtöbbet nézett')]].map(([v, l]) => `<option value="${v}" ${u.sort === v ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select>
        <div class="seg" role="group" aria-label="${_t('Nézet')}"><button class="btn small ${u.view === 'grid' ? 'on' : ''}" data-u-view="grid" aria-pressed="${u.view === 'grid'}">${_t('Rács')}</button><button class="btn small ${u.view === 'list' ? 'on' : ''}" data-u-view="list" aria-pressed="${u.view === 'list'}">${_t('Lista')}</button></div>
        <span class="muted uni-count"></span></div>
      <div class="uni-results"></div>
    </section>
  </div>`;
  const results = view.querySelector('.uni-results');
  const draw = () => {
    const t = norm(u.q.trim());
    const favSet = new Set(store.profile.favorites);
    const watched = store.profile?.stats?.ch || {};
    let list = vis.filter(
      (c) =>
        (!u.lists || (c.lists || []).some((id) => u.lists.includes(id))) &&
        (!u.country || c.country === u.country) &&
        (!u.cats.length || u.cats.some((k) => c.categories.includes(k))) &&
        (!u.working || channelStatus(c) === 'ok') &&
        (!u.favs || favSet.has(c.id)) &&
        (!t || norm(c.name).includes(t))
    );
    if (u.sort === 'name') list.sort((a, b) => a.name.localeCompare(b.name));
    else if (u.sort === 'watched') list.sort((a, b) => (watched[b.id] || 0) - (watched[a.id] || 0) || homeRank(b) - homeRank(a));
    else list = byAvailability(list.sort((a, b) => homeRank(b) - homeRank(a) || rankScore(b) - rankScore(a)));
    view.querySelector('.uni-count').textContent = _t('{count} csatorna', { count: list.length });
    results.innerHTML = '';
    if (!list.length) return void (results.innerHTML = `<p class="muted">${_t('Nincs a szűrőknek megfelelő csatorna.')}</p>`);
    if (u.view === 'grid') results.append(gridEl(list, { chunk: 90 }));
    else {
      const box = html('<div class="uni-list"></div>');
      results.append(box);
      // (fokozatosan: több ezer sor egyszerre lassú lenne)
      let i = 0;
      const more = () => {
        box.insertAdjacentHTML('beforeend', list.slice(i, i + 120).map(uniRow).join(''));
        i += 120;
        if (i < list.length) io.observe(box.lastElementChild);
      };
      const io = new IntersectionObserver((es) => es.some((x) => x.isIntersecting) && (io.disconnect(), more()), { rootMargin: '600px' });
      more();
    }
  };
  const changed = () => {
    saveUni(u);
    draw();
  };
  view.querySelector('.uni').addEventListener('change', (e) => {
    const el = e.target;
    if (el.dataset.uList !== undefined) {
      const on = [...view.querySelectorAll('[data-u-list]')].filter((x) => x.checked).map((x) => x.dataset.uList);
      u.lists = on.length === lists.length ? null : on;
    } else if (el.dataset.uCountry !== undefined) u.country = el.value;
    else if (el.dataset.uFlag) u[el.dataset.uFlag] = el.checked;
    else if (el.dataset.uSort !== undefined) u.sort = el.value;
    else return;
    changed();
  });
  view.querySelector('.uni').addEventListener('click', (e) => {
    const cat = e.target.closest('[data-u-cat]');
    const vw = e.target.closest('[data-u-view]');
    if (cat) {
      const k = cat.dataset.uCat;
      u.cats = u.cats.includes(k) ? u.cats.filter((x) => x !== k) : [...u.cats, k];
      cat.classList.toggle('on', u.cats.includes(k));
      cat.setAttribute('aria-pressed', u.cats.includes(k));
      changed();
    } else if (vw) {
      u.view = vw.dataset.uView;
      view.querySelectorAll('[data-u-view]').forEach((b) => {
        b.classList.toggle('on', b === vw);
        b.setAttribute('aria-pressed', b === vw);
      });
      changed();
    } else if (e.target.closest('[data-u-reset]')) {
      store.setProfileValue('uni', { view: u.view, sort: u.sort });
      renderUnified(view);
    }
  });
  view.querySelector('.uni-q').addEventListener('input', debounce((e) => {
    u.q = e.target.value;
    draw();
  }, 200));
  draw();
}

export const _layoutTest = { picks, layoutRoute, LAYOUTS };
