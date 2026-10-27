// Felület-elrendezések megjelenítése (a definíciók és a body-jelölés a layoutdefs.js-ben).
// A Főoldal (és a Részletes / Gyűjtemény elrendezésben a TV oldal) elrendezésenként más; a többi oldal közös.
import { esc, html, hashHue, fmtTime, bus, debounce, seededShuffle, norm } from './util.js';
import { api } from './api.js';
import { store } from './store.js';
import { epg } from './epg.js';
import { catalog, visible, getChannels, countryName, countryFlag, categoryName, channelStatus, homeRank, rankScore, byAvailability, activeLists, MINE, KIDS_CATEGORIES } from './catalog.js';
import { ICON, logoHtml, openInfo, openProgram, gridEl, rowEl, emptyState, avatarHtml } from './components.js';
import { player, startPreview, stopPreview } from './player.js';
import { renderDashboard, unitCardHtml, activateUnits, homeNews, openNews, tonightPrograms } from './dashboard.js';
import { radioMenuOn } from './radiopage.js';
import { radioFavs } from './radio.js';
import { radioPlayer } from './radioplayer.js';
import { sportMenuOn } from './sportpage.js';
import { LAYOUTS, currentLayout } from './layoutdefs.js';
import { _t, LOCALE } from './i18n.js';

const previewOn = () => !!api.caps.preview && store.settings.heroPreview !== false;

/** Az útvonal megjelenítője az aktuális elrendezésben (null: a közös oldal). */
export function layoutRoute(name) {
  const id = currentLayout();
  if (name === 'home') {
    return {
      classic: renderDashboard, cinema: renderCinema, showcase: renderShowcase, shelf: renderShelf, library: renderLibraryHome, tiles: renderTiles,
      detail: (v) => renderDetail(v, null, true), unified: renderUnifiedHome,
      wall: renderWall, squares: renderSquares, ribbon: renderRibbon, focus: renderFocus, desk: renderDesk,
    }[id];
  }
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

/**
 * A Főoldal saját tartalma (az elrendezés kiemelt része alatt): a Főoldal egységei (időjárás, ma este, hírek…) az
 * elrendezés stílusában, és csak a személyes csatornasorok – a TV oldal teljes kínálata (kategóriák, országok) nélkül.
 */
function homeRowsInto(target, { units = ['weather', 'tonight', 'rss'], unitCls = 'strip', title = _t('Ma'), rows = ['recent', 'favs', 'onair'] } = {}) {
  target.innerHTML = '';
  const box = html('<div class="rows tv-rows after-hero home-rows"></div>');
  target.append(box);
  const u = units.length && unitsEl(units, unitCls, title);
  if (u) box.append(u);
  for (const r of rows) {
    const el = homeRow(r);
    if (el) box.append(el);
  }
  activateUnits(box);
  return box;
}
/** A Főoldal egységeinek kártyái egy szakaszban (cls: az elrendezés stílusa – strip, grid, glass…). */
function unitsEl(ids, cls, title) {
  const inner = ids.map((id) => unitCardHtml(id)).join('');
  if (!inner.trim()) return null;
  return html(`<section class="lay-units ${cls}">${title ? `<h2 class="row-title">${esc(title)}</h2>` : ''}<div class="lay-units-in">${inner}</div></section>`);
}
function homeRow(key) {
  const vis = visSet();
  const p = store.profile;
  if (key === 'recent') {
    const l = getChannels(p.recent).filter((c) => vis.has(c));
    return l.length ? rowEl(_t('Folytatás'), l, { href: '#/favorites' }) : null;
  }
  if (key === 'favs') {
    const l = getChannels(p.favorites).filter((c) => vis.has(c));
    return l.length ? rowEl(_t('Kedvenceid'), l, { href: '#/favorites' }) : null;
  }
  if (key === 'onair') {
    const favSet = new Set(p.favorites);
    const l = [...vis].filter((c) => epg.now(c.id)?.cur);
    l.sort((a, b) => favSet.has(b.id) - favSet.has(a.id) || homeRank(b) - homeRank(a) || rankScore(b) - rankScore(a));
    return l.length ? rowEl(_t('Most a tévében'), l.slice(0, 40), { href: '#/guide' }) : null;
  }
  return null;
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
  homeRowsInto(view);
  const h = picks(1);
  if (h.length) view.prepend(heroEl(h));
}

// ---------------------------------------------------------------------------
// 2. Kirakat: lapozó kiemelt sáv + a fő részek nagy gombjai + sorok
// ---------------------------------------------------------------------------
const GUIDE_ICO = '<svg viewBox="0 0 24 24"><path d="M3 4h18v16H3zm2 2v3h4V6zm6 0v3h8V6zM5 11v3h8v-3zm10 0v3h4v-3zM5 16v2h4v-2zm6 0v2h8v-2z"/></svg>';
const REC_ICO = '<svg viewBox="0 0 24 24"><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm0 2a8 8 0 1 1 0 16 8 8 0 0 1 0-16Zm0 3a5 5 0 1 0 0 10 5 5 0 0 0 0-10Z"/></svg>';
function navIcon(route) {
  // (a menü ikonjai a felső menüben rejtettek – nav-ico –, itt saját osztállyal látszanak)
  return (document.querySelector(`#nav .links a[data-route="${route}"] .nav-ico`)?.outerHTML || '').replace('class="nav-ico"', 'class="lay-ico"');
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
  homeRowsInto(view, { units: ['weather', 'epg', 'rss'] });
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
  // a polc alatt a nap (időjárás, ma este, hírek) és a most futó műsorok (a kedvencek már a polcon vannak)
  const rest = html('<div class="shelf-rest"></div>');
  view.append(rest);
  homeRowsInto(rest, { unitCls: 'strip glass', rows: ['onair'] }).classList.add('shelf-rows');
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
  homeRowsInto(view, { units: ['weather', 'tonight', 'rss', 'epg'], unitCls: 'ugrid', title: _t('Neked'), rows: ['onair'] });
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
  homeRowsInto(view, { rows: ['favs', 'onair'] });
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
/** A Részletes elrendezés Főoldala a jobb oldalon: köszöntés, legutóbb nézettek, a nap (időjárás, ma este, hírek). */
function mdHomeHtml() {
  const vis = visSet();
  const p = store.profile;
  const quick = [...new Set([...getChannels(p.recent), ...getChannels(p.favorites)])].filter((c) => vis.has(c)).slice(0, 6);
  return `<div class="md-home"><h1>${esc(greeting())}</h1>
    ${quick.length ? `<h3>${_t('Folytatás')}</h3><div class="qgrid">${quick.map(quickItem).join('')}</div>` : ''}
    <div class="lay-units ugrid"><div class="lay-units-in">${['weather', 'tonight', 'rss', 'epg'].map((id) => unitCardHtml(id)).join('')}</div></div></div>`;
}
function renderDetail(view, params, home = false) {
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
  if (home) detailSel = '';
  else if (!catalog.byId.has(detailSel) || !set.has(catalog.byId.get(detailSel))) detailSel = (favs[0] || recent[0] || all[0]).id;
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
    const top = home && !t ? `<button class="md-item md-home-item ${detailSel ? '' : 'sel'}" data-md-home>${navIcon('home')}<span><b>${_t('Áttekintés')}</b><small>${_t('A nap egy pillantásra')}</small></span></button>` : '';
    groups.innerHTML = top + sec(_t('Kedvencek'), favs, 200) + sec(_t('Legutóbb nézett'), recent, 10) + sec(t ? _t('Találatok') : _t('Összes csatorna'), all, t ? 200 : 300) || `<p class="muted">${_t('Nincs találat.')}</p>`;
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
  const showHome = () => {
    detailSel = '';
    stopPreview();
    clearTimeout(previewTimer);
    groups.querySelectorAll('.md-item').forEach((b) => b.classList.toggle('sel', b.hasAttribute('data-md-home')));
    detail.innerHTML = mdHomeHtml();
    activateUnits(detail);
  };
  drawList();
  if (detailSel) show(detailSel);
  else showHome();
  view.querySelector('.md-q').addEventListener('input', debounce((e) => drawList(e.target.value), 150));
  const pickFocus = debounce((id) => show(id), 180);
  groups.addEventListener('focusin', (e) => e.target.dataset?.mid && e.target.dataset.mid !== detailSel && pickFocus(e.target.dataset.mid));
  groups.addEventListener('click', (e) => {
    const b = e.target.closest('.md-item');
    if (!b) return;
    if (b.hasAttribute('data-md-home')) return showHome();
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

/** A Gyűjtemény Főoldala: legutóbb nézettek, a forrásaid (egy kattintással szűrve a gyűjteményben), témakörök, a nap. */
function renderUnifiedHome(view) {
  const vis = visible();
  if (!vis.length) return noChannels(view);
  const p = store.profile;
  const set = new Set(vis);
  const quick = [...new Set([...getChannels(p.recent), ...getChannels(p.favorites)])].filter((c) => set.has(c)).slice(0, 8);
  const lists = [...(vis.some((c) => c.lists?.includes(MINE)) ? [{ id: MINE, name: _t('Saját csatornák') }] : []), ...activeLists()];
  const per = new Map();
  const cats = new Map();
  for (const c of vis) {
    for (const id of c.lists || []) per.set(id, (per.get(id) || 0) + 1);
    for (const k of new Set(c.categories)) cats.set(k, (cats.get(k) || 0) + 1);
  }
  view.innerHTML = `<div class="page uni-home"><div class="page-head"><h1>${esc(greeting())}</h1><span class="muted">${_t('{count} csatorna a gyűjteményedben', { count: vis.length })}</span>
      <a class="btn small" href="#/tv">${_t('Teljes gyűjtemény')}</a></div>
    ${quick.length ? `<h2 class="row-title">${_t('Folytatás')}</h2><div class="qgrid">${quick.map(quickItem).join('')}</div>` : ''}
    <h2 class="row-title">${_t('Forrásaid')}</h2>
    <div class="uh-sources">${lists
      .filter((l) => per.get(l.id))
      .map((l) => `<button class="uh-src" data-uh-list="${esc(l.id)}" style="--h:${hashHue(l.id + 'src')}"><b>${esc(l.name)}</b><small>${_t('{count} csatorna', { count: per.get(l.id) })}</small></button>`)
      .join('')}</div>
    <h2 class="row-title">${_t('Témakörök')}</h2>
    <div class="uni-cats uh-cats">${[...cats].sort((a, b) => b[1] - a[1]).slice(0, 16).map(([k, n]) => `<button class="chip" data-uh-cat="${esc(k)}">${esc(categoryName(k))} <small>${n}</small></button>`).join('')}</div>
    <div class="lay-units ugrid">${`<h2 class="row-title">${_t('Ma')}</h2>`}<div class="lay-units-in">${['weather', 'tonight', 'rss', 'epg'].map((id) => unitCardHtml(id)).join('')}</div></div>
  </div>`;
  const page = view.querySelector('.uni-home');
  // forrás / témakör: a gyűjtemény (TV oldal) ezzel az egy szűrővel nyílik
  page.addEventListener('click', (e) => {
    const src = e.target.closest('[data-uh-list]');
    const cat = e.target.closest('[data-uh-cat]');
    if (!src && !cat) return;
    const u = uniState();
    store.setProfileValue('uni', { ...u, q: '', lists: src ? [src.dataset.uhList] : null, cats: cat ? [cat.dataset.uhCat] : [], country: '', favs: false });
    location.hash = '#/tv';
  });
  activateUnits(page);
}

// ---------------------------------------------------------------------------
// Közös a konzolos / asztali elrendezésekhez
// ---------------------------------------------------------------------------
const HISTORY_ICO = '<svg viewBox="0 0 24 24"><path d="M13 3a9 9 0 0 0-9 9H1l4 4 4-4H6a7 7 0 1 1 2 4.9l-1.4 1.4A9 9 0 1 0 13 3Zm-1 5v5l4.3 2.5.7-1.2-3.5-2.1V8Z"/></svg>';
const NEWS_ICO = '<svg viewBox="0 0 24 24"><path d="M4 4h13v2H6v12h12V9h2v11H4V4Zm3 4h8v2H7V8Zm0 4h8v2H7v-2Zm0 4h5v2H7v-2Zm12-12h2v4h-2V4Z"/></svg>';
const SEARCH_ICO = '<svg viewBox="0 0 24 24"><path d="M10 3a7 7 0 1 0 4.2 12.6l4.6 4.6 1.4-1.4-4.6-4.6A7 7 0 0 0 10 3Zm0 2a5 5 0 1 1 0 10 5 5 0 0 1 0-10Z"/></svg>';
const noChannels = (view) =>
  (view.innerHTML = emptyState(_t('Nincs megjeleníthető csatorna'), _t('Ellenőrizd a beállításokat vagy a profil szűrőit.'), `<a class="btn primary" href="#/settings">${_t('Beállítások')}</a>`));
/** A fő részek (ikon, cím, cím) – a kikapcsolt Rádió / Sport nélkül. */
function sections() {
  return [
    ['tv', '#/tv', _t('TV'), navIcon('tv')],
    ['guide', '#/guide', _t('Műsorújság'), GUIDE_ICO],
    radioMenuOn() && ['radio', '#/radio', _t('Rádió'), navIcon('radio')],
    ['vod', '#/vod', _t('VOD'), navIcon('vod')],
    sportMenuOn() && ['sport', '#/sport', _t('Sport'), navIcon('sport')],
    ['favorites', '#/favorites', _t('Kedvencek'), navIcon('favorites')],
    ['recordings', '#/recordings', _t('Felvételek'), REC_ICO],
    ['settings', '#/settings', _t('Beállítások'), navIcon('settings')],
  ].filter(Boolean);
}
/** Kijelölés fókuszra / rámutatásra (késleltetve), és az élő előnézet a háttérben. */
function selectable(root, selector, onSelect) {
  const pick = debounce((id) => onSelect(catalog.byId.get(id)), 120);
  root.addEventListener('focusin', (e) => e.target.closest?.(selector) && pick(e.target.closest(selector).dataset.sid));
  root.addEventListener('mouseover', (e) => {
    const b = e.target.closest(selector);
    if (b) pick(b.dataset.sid);
  });
}
function previewLater(box, ch, isCurrent) {
  stopPreview();
  clearTimeout(previewLater.t);
  if (previewOn()) previewLater.t = setTimeout(() => box.isConnected && !player.active && isCurrent() && startPreview(box, ch), 1500);
}
/** Kezdőcsatornák a csempéknek: kedvencek, utoljára nézettek, ajánlottak. */
function homeChannels(n) {
  const vis = visSet();
  const p = store.profile;
  return [...new Set([...getChannels(p.favorites), ...getChannels(p.recent), ...picks(n)].filter((c) => vis.has(c)))].slice(0, n);
}
/** Időzítő, ami magától leáll, ha az elem eltűnt az oldalról. */
function every(el, ms, fn) {
  const t = setInterval(() => (el.isConnected ? fn() : clearInterval(t)), ms);
}
const clockText = () => new Date().toLocaleTimeString(LOCALE, { hour: '2-digit', minute: '2-digit' });

// ---------------------------------------------------------------------------
// Csempefal: „Folytatás” + rögzített kedvencek rácsa, mellette útmutató
// ---------------------------------------------------------------------------
function renderWall(view) {
  const vis = visSet();
  const p = store.profile;
  const cont = getChannels(p.recent).find((c) => vis.has(c) && ok(c)) || picks(1)[0];
  if (!cont) return noChannels(view);
  const pins = homeChannels(14).filter((c) => c !== cont).slice(0, 11);
  const favSet = new Set(p.favorites);
  const guide = [...vis].filter((c) => epg.now(c.id)?.cur);
  guide.sort((a, b) => favSet.has(b.id) - favSet.has(a.id) || homeRank(b) - homeRank(a) || rankScore(b) - rankScore(a));
  const now = epg.now(cont.id);
  view.innerHTML = '';
  const el = html(`<section class="wall">
    <div class="wall-grid">
      <button class="wall-tile big" data-id="${esc(cont.id)}" data-lplay="${esc(cont.id)}" style="--h:${hashHue(cont.name)}"><span class="wall-bg"></span>${logoHtml(cont)}
        <span class="wall-cap"><small>${_t('Folytatás')}</small><b>${esc(cont.name)}</b>${now?.cur ? `<span>${esc(now.cur.title)}</span>` : ''}</span></button>
      ${pins.map((c) => `<button class="wall-tile" data-id="${esc(c.id)}" data-lplay="${esc(c.id)}" style="--h:${hashHue(c.name)}" title="${esc(c.name)}">${logoHtml(c)}<span class="wall-cap"><b>${esc(c.name)}</b></span></button>`).join('')}
    </div>
    <aside class="wall-guide"><h3>${_t('Útmutató')}</h3><p class="muted small">${_t('Most a tévében')}</p>
      ${guide.slice(0, 12).map((c) => {
        const n = epg.now(c.id);
        return `<button class="wg-item" data-id="${esc(c.id)}" data-lplay="${esc(c.id)}">${logoHtml(c)}<span><b>${esc(c.name)}</b><small>${esc(n.cur.title)}</small><span class="bar"><i style="width:${(n.progress * 100).toFixed(1)}%"></i></span></span></button>`;
      }).join('') || `<p class="muted">${_t('Nincs műsoradat.')}</p>`}
      <a class="btn small" href="#/guide">${_t('Teljes műsorújság')}</a></aside>
  </section>`);
  view.append(el);
  const bg = el.querySelector('.wall-bg');
  previewLater(bg, cont, () => true);
  const rest = html('<div class="layout-rest"></div>');
  view.append(rest);
  homeRowsInto(rest, { unitCls: 'wall-units', rows: [] });
}

// ---------------------------------------------------------------------------
// Négyzetek: egy sor nagy négyzet, felette a kijelölt műsora, alul kerek gombok
// ---------------------------------------------------------------------------
function renderSquares(view) {
  const list = homeChannels(16);
  if (!list.length) return noChannels(view);
  const p = store.profile;
  view.innerHTML = '';
  const el = html(`<section class="sq">
    <div class="sq-top">${avatarHtml(p, 'sq-av')}<b>${esc(p.name)}</b><span class="sq-clock">${clockText()}</span></div>
    <div class="sq-info" aria-live="polite"></div>
    <div class="sq-row">${list.map((c) => `<button class="sq-tile" data-id="${esc(c.id)}" data-sid="${esc(c.id)}" data-lplay="${esc(c.id)}" style="--h:${hashHue(c.name)}" title="${esc(c.name)}">${logoHtml(c)}</button>`).join('')}</div>
    <nav class="sq-btns" aria-label="${_t('Fő részek')}">${sections().map(([r, href, label, ico]) => `<a class="sq-btn" href="${href}" title="${esc(label)}" style="--h:${hashHue(r + 'app')}"><span>${ico}</span><small>${esc(label)}</small></a>`).join('')}</nav>
  </section>`);
  view.append(el);
  const info = el.querySelector('.sq-info');
  const select = (ch) => {
    if (!ch) return;
    const now = epg.now(ch.id);
    info.innerHTML = `<b>${esc(ch.name)}</b>${now?.cur ? `<span>${esc(now.cur.title)} <span class="muted">${fmtTime(now.cur.start)}–${fmtTime(now.cur.stop)}</span></span>` : ''}`;
    el.querySelectorAll('.sq-tile').forEach((b) => b.classList.toggle('sel', b.dataset.sid === ch.id));
  };
  selectable(el, '.sq-tile', select);
  select(list[0]);
  every(el, 20e3, () => (el.querySelector('.sq-clock').textContent = clockText()));
}

// ---------------------------------------------------------------------------
// Menüszalag: vízszintesen a részek, függőlegesen a tartalmuk (négy nyíllal minden elérhető)
// ---------------------------------------------------------------------------
const ribbonState = { cat: 'favs', idx: {} };
function ribbonCats() {
  const vis = visSet();
  const p = store.profile;
  const chItem = (c) => ({ kind: 'ch', id: c.id, title: c.name, sub: epg.now(c.id)?.cur?.title || categoryName(c.categories[0]) || '', ch: c });
  const link = (href, title, sub = '', ico = '') => ({ kind: 'link', href, title, sub, ico });
  const favSet = new Set(p.favorites);
  const favs = getChannels(p.favorites).filter((c) => vis.has(c));
  const recent = getChannels(p.recent).filter((c) => vis.has(c));
  const onAir = [...vis].filter((c) => epg.now(c.id)?.cur);
  onAir.sort((a, b) => favSet.has(b.id) - favSet.has(a.id) || homeRank(b) - homeRank(a) || rankScore(b) - rankScore(a));
  const rf = radioMenuOn() ? radioFavs() : [];
  const cats = [
    { id: 'favs', label: _t('Kedvencek'), ico: navIcon('favorites'), items: favs.length ? favs.map(chItem) : [link('#/tv', _t('Csatornák böngészése'), _t('A csatornák kártyáján a + gombbal jelölhetsz kedvencet.'), navIcon('tv'))] },
    { id: 'now', label: _t('Most a tévében'), ico: GUIDE_ICO, items: onAir.slice(0, 80).map(chItem) },
    recent.length && { id: 'recent', label: _t('Legutóbb nézett'), ico: HISTORY_ICO, items: recent.map(chItem) },
    { id: 'tonight', label: _t('Ma este'), ico: GUIDE_ICO, items: tonightPrograms(12).map(({ ch, p: pr }) => ({ kind: 'prog', ch, pr, title: pr.title, sub: `${fmtTime(pr.start)} · ${ch.name}` })) },
    // (a hírek a háttérben töltődnek – renderRibbon)
    { id: 'news', label: _t('Hírek'), ico: NEWS_ICO, items: [] },
    { id: 'tv', label: _t('TV'), ico: navIcon('tv'), items: [link('#/tv', _t('Csatornák'), _t('A csatornák sorai')), link('#/guide', _t('Műsorújság')), link('#/browse', _t('Böngészés')), link('#/countries', _t('Országok')), link('#/recordings', _t('Felvételek'))] },
    radioMenuOn() && { id: 'radio', label: _t('Rádió'), ico: navIcon('radio'), items: [...rf.map((st, i) => ({ kind: 'radio', i, title: st.name, sub: [countryName(st.country), st.codec].filter(Boolean).join(' · '), st })), link('#/radio', _t('Rádiók')), link('#/radio?tab=guide', _t('Rádió-műsorújság')), link('#/radio?tab=browse', _t('Böngészés'))] },
    { id: 'vod', label: _t('Videotár'), ico: navIcon('vod'), items: [link('#/vod', _t('Online listák')), link('#/own', _t('Saját médiatár'))] },
    sportMenuOn() && { id: 'sport', label: _t('Sport'), ico: navIcon('sport'), items: [link('#/sport', _t('Sport'), _t('Élő eredmények, menetrend, tabella'))] },
    { id: 'settings', label: _t('Beállítások'), ico: navIcon('settings'), items: [link('#/settings', _t('Beállítások')), link('#/settings?section=appearance', _t('Megjelenés')), link('#/profiles', _t('Profilok kezelése')), link('#/help', _t('Súgó'))] },
  ].filter((c) => c && (c.items.length || c.id === 'news'));
  return { cats, rf };
}
function renderRibbon(view) {
  const { cats, rf } = ribbonCats();
  let ci = Math.max(0, cats.findIndex((c) => c.id === ribbonState.cat));
  view.innerHTML = `<section class="xmb">
    <div class="xmb-bar" role="tablist" aria-label="${_t('Részek')}">${cats.map((c, i) => `<button class="xmb-cat" role="tab" data-ci="${i}" aria-selected="false">${c.ico}<span>${esc(c.label)}</span></button>`).join('')}</div>
    <div class="xmb-items" role="list"></div>
    <p class="xmb-hint muted small">${_t('← → részek · ↑ ↓ elemek · OK: megnyitás')}</p>
  </section>`;
  const el = view.querySelector('.xmb');
  const bar = el.querySelector('.xmb-bar');
  const box = el.querySelector('.xmb-items');
  const itemHtml = (it, i) => {
    const ico = it.kind === 'ch' || it.kind === 'prog' ? logoHtml(it.ch) : it.kind === 'news' ? (it.n.img ? `<img class="logo cover" src="${esc(it.n.img)}" alt="" loading="lazy" referrerpolicy="no-referrer" />` : NEWS_ICO) : it.kind === 'radio' ? (it.st.logo ? `<img class="logo" src="${esc(it.st.logo)}" alt="" loading="lazy" referrerpolicy="no-referrer" />` : navIcon('radio')) : it.ico || cats[ci].ico;
    return `<button class="xmb-item" role="listitem" data-ii="${i}" ${it.kind === 'ch' ? `data-id="${esc(it.id)}"` : ''}><span class="xmb-ico">${ico}</span><span class="xmb-text"><b>${esc(it.title)}</b>${it.sub ? `<small>${esc(it.sub)}</small>` : ''}</span></button>`;
  };
  const items = () => cats[ci].items;
  const curIdx = () => Math.min(ribbonState.idx[cats[ci].id] || 0, items().length - 1);
  const mark = (ii, focus = false) => {
    ribbonState.idx[cats[ci].id] = ii;
    box.querySelectorAll('.xmb-item').forEach((b, n) => b.classList.toggle('sel', n === ii));
    const b = box.children[ii];
    b?.scrollIntoView({ block: 'nearest' });
    if (focus) b?.focus({ preventScroll: true });
  };
  const drawCat = (focusItem = false) => {
    ribbonState.cat = cats[ci].id;
    el.style.setProperty('--i', ci);
    bar.querySelectorAll('.xmb-cat').forEach((b, n) => {
      b.classList.toggle('sel', n === ci);
      b.setAttribute('aria-selected', n === ci);
    });
    box.innerHTML = items().map(itemHtml).join('');
    box.scrollTop = 0;
    mark(curIdx(), focusItem);
  };
  const open = (ii) => {
    const it = items()[ii];
    if (!it) return;
    if (it.kind === 'ch') player.play(it.ch);
    else if (it.kind === 'prog') openProgram(it.ch, it.pr);
    else if (it.kind === 'news') openNews(it.n);
    else if (it.kind === 'radio') radioPlayer.play(it.st, rf);
    else location.hash = it.href;
  };
  bar.addEventListener('click', (e) => {
    const b = e.target.closest('.xmb-cat');
    if (!b) return;
    ci = Number(b.dataset.ci);
    drawCat();
  });
  box.addEventListener('click', (e) => {
    const b = e.target.closest('.xmb-item');
    if (!b) return;
    mark(Number(b.dataset.ii));
    open(Number(b.dataset.ii));
  });
  el.addEventListener('keydown', (e) => {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    const onItem = e.target.closest?.('.xmb-item');
    const onCat = e.target.closest?.('.xmb-cat');
    if (!onItem && !onCat) return;
    let handled = true;
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      const n = ci + (e.key === 'ArrowLeft' ? -1 : 1);
      if (n < 0 || n >= cats.length) handled = false;
      else {
        ci = n;
        drawCat(!onCat);
        if (onCat) bar.children[ci].focus({ preventScroll: true });
      }
    } else if (e.key === 'ArrowDown') {
      if (onCat) mark(curIdx(), true);
      else mark(Math.min(curIdx() + 1, items().length - 1), true);
    } else if (e.key === 'ArrowUp') {
      if (onCat) handled = false; // (a felső menübe lép tovább)
      else if (curIdx() === 0) bar.children[ci].focus({ preventScroll: true });
      else mark(curIdx() - 1, true);
    } else if (e.key === 'Enter' && onItem) open(Number(onItem.dataset.ii));
    else handled = false;
    if (handled) {
      e.preventDefault();
      e.stopPropagation();
    }
  });
  drawCat();
  // hírek: betöltés után a kategória feltöltése (ha nincs bekapcsolt forrás vagy hiba, a kategória eltűnik)
  const ni = cats.findIndex((c) => c.id === 'news');
  if (ni >= 0) {
    homeNews()
      .catch(() => [])
      .then((list) => {
        if (!el.isConnected) return;
        cats[ni].items = list.map((n) => ({ kind: 'news', n, title: n.title, sub: n.source }));
        if (!cats[ni].items.length) cats[ni].items = [{ kind: 'link', href: '#/settings?section=dashboard', title: _t('Hírforrások beállítása'), sub: _t('A hírek most nem érhetők el.') }];
        if (ci === ni) drawCat(box.contains(document.activeElement));
      });
  }
}

// ---------------------------------------------------------------------------
// Fókusz: felső funkciósáv, egy sor csempe (a kijelölt nagyobb), alatta a műsora és a gombjai
// ---------------------------------------------------------------------------
function renderFocus(view) {
  const list = homeChannels(14);
  if (!list.length) return noChannels(view);
  view.innerHTML = '';
  const fn = [['search', '', _t('Keresés'), SEARCH_ICO], ...sections().filter(([r]) => ['guide', 'favorites', 'radio', 'recordings', 'settings'].includes(r))];
  const el = html(`<section class="fx" style="--h:${hashHue(list[0].name)}">
    <div class="fx-bg"></div><div class="fx-shade"></div>
    <nav class="fx-fn" aria-label="${_t('Funkciók')}">${fn.map(([r, href, label, ico]) => (href ? `<a class="fx-fn-btn" href="${href}" title="${esc(label)}">${ico}<span>${esc(label)}</span></a>` : `<button class="fx-fn-btn" data-fx-search title="${esc(label)}">${ico}<span>${esc(label)}</span></button>`)).join('')}</nav>
    <div class="fx-row">${list.map((c) => `<button class="fx-tile" data-id="${esc(c.id)}" data-sid="${esc(c.id)}" data-lplay="${esc(c.id)}" style="--h:${hashHue(c.name)}" title="${esc(c.name)}">${logoHtml(c)}</button>`).join('')}</div>
    <div class="fx-info" aria-live="polite"></div>
  </section>`);
  view.append(el);
  const bg = el.querySelector('.fx-bg');
  const info = el.querySelector('.fx-info');
  let cur = null;
  const select = (ch) => {
    if (!ch || ch === cur) return;
    cur = ch;
    el.style.setProperty('--h', hashHue(ch.name));
    bg.innerHTML = '';
    bg.classList.remove('has-video');
    const now = epg.now(ch.id);
    info.innerHTML = `<h1>${esc(ch.name)}</h1><div class="hero-meta">${metaLine(ch)}</div>
      ${now?.cur ? `<div class="hero-now"><b>${esc(now.cur.title)}</b> <span class="muted">${fmtTime(now.cur.start)}–${fmtTime(now.cur.stop)}</span></div>` : ''}
      ${now?.cur?.desc ? `<p class="hero-desc">${esc(now.cur.desc.slice(0, 200))}${now.cur.desc.length > 200 ? '…' : ''}</p>` : ''}
      ${now?.next ? `<div class="muted">${_t('Utána: {time} {title}', { time: fmtTime(now.next.start), title: esc(now.next.title) })}</div>` : ''}
      <div class="hero-btns"><button class="btn white" data-lplay="${esc(ch.id)}">${ICON.play} ${_t('Nézem')}</button><button class="btn gray" data-linfo="${esc(ch.id)}">${ICON.info} ${_t('Adatlap')}</button></div>`;
    el.querySelectorAll('.fx-tile').forEach((b) => b.classList.toggle('sel', b.dataset.sid === ch.id));
    previewLater(bg, ch, () => cur === ch);
  };
  selectable(el.querySelector('.fx-row'), '.fx-tile', select);
  el.querySelector('[data-fx-search]')?.addEventListener('click', () => document.getElementById('search-toggle')?.click());
  select(list[0]);
  const rest = html('<div class="layout-rest"></div>');
  view.append(rest);
  homeRowsInto(rest, { unitCls: 'strip glass', rows: [] });
}

// ---------------------------------------------------------------------------
// Asztal: élő csempék (a menü alul tálcaként – CSS)
// ---------------------------------------------------------------------------
/** Esti műsorok: csatornánként az első, ami 20 óra után (ha már elmúlt, most) kezdődik. */
function tonightPick(list) {
  const d = new Date();
  d.setHours(20, 0, 0, 0);
  const t = Math.max(d.getTime(), Date.now());
  return [...new Set(list)]
    .map((c) => ({ c, pr: epg.range(c.id, t, t + 5 * 3600e3).find((pr) => pr.start >= t) }))
    .filter((x) => x.pr)
    .sort((a, b) => a.pr.start - b.pr.start)
    .slice(0, 3);
}
function renderDesk(view) {
  const vis = visSet();
  const p = store.profile;
  const main = getChannels(p.recent).find((c) => vis.has(c) && ok(c)) || picks(1)[0];
  if (!main) return noChannels(view);
  const favSet = new Set(p.favorites);
  const onAir = [...vis].filter((c) => epg.now(c.id)?.cur && c !== main);
  onAir.sort((a, b) => favSet.has(b.id) - favSet.has(a.id) || homeRank(b) - homeRank(a) || rankScore(b) - rankScore(a));
  const flips = onAir.slice(0, 8);
  const tonight = tonightPick([...getChannels(p.favorites).filter((c) => vis.has(c)), ...onAir.slice(0, 20)]);
  const favTiles = getChannels(p.favorites).filter((c) => vis.has(c) && c !== main).slice(0, 4);
  const now = epg.now(main.id);
  const d = new Date();
  view.innerHTML = '';
  const el = html(`<section class="desk">
    <div class="desk-grid">
      <button class="lt lt-2x2" data-id="${esc(main.id)}" data-lplay="${esc(main.id)}" style="--h:${hashHue(main.name)}"><span class="lt-bg"></span>${logoHtml(main)}
        <span class="lt-cap"><small>${_t('Folytatás')}</small><b>${esc(main.name)}</b>${now?.cur ? `<span>${esc(now.cur.title)}</span>` : ''}</span></button>
      <div class="lt lt-2x1 lt-clock" style="--h:220"><b class="lt-time">${clockText()}</b><span>${esc(d.toLocaleDateString(LOCALE, { weekday: 'long', month: 'long', day: 'numeric' }))}</span></div>
      ${flips.length ? `<button class="lt lt-2x1 lt-flip" data-lplay="${esc(flips[0].id)}" style="--h:${hashHue(flips[0].name)}"></button>` : ''}
      ${tonight.length ? `<a class="lt lt-2x1 lt-tonight" href="#/guide" style="--h:265"><small>${_t('Ma este')}</small>${tonight.map((x) => `<span><b>${fmtTime(x.pr.start)}</b> ${esc(x.c.name)} · ${esc(x.pr.title)}</span>`).join('')}</a>` : ''}
      ${sections().filter(([r]) => r !== 'settings').map(([r, href, label, ico]) => `<a class="lt lt-1x1" href="${href}" style="--h:${hashHue(r + 'app')}">${ico}<b>${esc(label)}</b></a>`).join('')}
      ${unitCardHtml('weather', 'lt lt-2x2 lt-unit')}${unitCardHtml('rss', 'lt lt-2x2 lt-unit')}
      ${favTiles.map((c) => `<button class="lt lt-1x1 lt-ch" data-id="${esc(c.id)}" data-lplay="${esc(c.id)}" style="--h:${hashHue(c.name)}" title="${esc(c.name)}">${logoHtml(c)}<b>${esc(c.name)}</b></button>`).join('')}
    </div>
  </section>`);
  view.append(el);
  previewLater(el.querySelector('.lt-bg'), main, () => true);
  // élő csempe: a most futó műsorok váltakoznak
  const flip = el.querySelector('.lt-flip');
  if (flip) {
    let i = 0;
    const show = () => {
      const c = flips[i % flips.length];
      const n = epg.now(c.id);
      flip.dataset.lplay = c.id;
      flip.dataset.id = c.id;
      flip.style.setProperty('--h', hashHue(c.name));
      flip.innerHTML = `<small>${_t('Most a tévében')}</small><span class="lt-flip-in">${logoHtml(c)}<span><b>${esc(c.name)}</b>${n?.cur ? `<span>${esc(n.cur.title)}</span>` : ''}</span></span>`;
      i++;
    };
    show();
    if (flips.length > 1) every(el, 6000, () => !flip.matches(':hover, :focus') && show());
  }
  every(el, 20e3, () => (el.querySelector('.lt-time').textContent = clockText()));
  activateUnits(el);
}

export const _layoutTest = { picks, layoutRoute, LAYOUTS, ribbonCats };
