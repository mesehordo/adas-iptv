// Nézetek: főoldal, böngészés, kedvencek, keresés, műsorújság, beállítások, profilok.
import { $, $$, esc, html, norm, hashHue, fmtTime, fmtDay, dayStart, dayLabel, toast, bus, seededShuffle, debounce } from './util.js';
import { api, IS_TV, IS_ANDROID } from './api.js';
import { store, BUILTIN_EPG, epgSourceName, PROFILE_COLORS, DEFAULT_PLAYLIST, BUILTIN_PLAYLISTS, AVATAR_COUNT, avatarUrl } from './store.js';
import { epg } from './epg.js';
import { health } from './health.js';
import {
  catalog, visible, getChannels, search, countryName, countryFlag, categoryName, rankScore, loadCatalog,
  KIDS_CATEGORIES, channelStatus, bestQuality, MINE, activeLists, homeRank, homeFirst, COUNTRY_LANG, geoState,
} from './catalog.js';
import {
  ICON, rowEl, gridEl, cardHtml, registerContext, openProgram, openModal, confirmDialog, promptDialog,
  logoHtml, emptyState, avatarHtml, rowTitleHtml, seeAllHtml, rowOrderEditor, tvTabs, safeImgData,
} from './components.js';
import { player, stopPreview, PLAYER_BUTTONS } from './player.js';
import { THEMES, currentTheme, applyTheme, profileRows, defaultRows, rowLabel } from './themes.js';
import { renderLists } from './lists.js';
import { renderVodLists, renderOwnLists, searchVod, vcardHtml, vod, vodFavItems, loadVod } from './vod.js';
import { renderHuSettings } from './subtitles.js';
import { exoAvailable } from './exo.js';
import { renderKidsSettings } from './kidsui.js';
import { renderDashSettings } from './dashboard.js';
import { requireAdult, hasPin, choosePin, setPin } from './pin.js';
import { renderTransfer, importData, attachDocs, restoreDocs } from './transfer.js';
import { renderRecordings } from './recorder.js';
import { renderRemoteSettings } from './remote.js';
import { renderBackups } from './backup.js';
import { renderThemeTools } from './customthemes.js';
import { renderUpdate } from './update.js';

import { _t, LOCALE, LANGS, lang as uiLang, setLanguage } from './i18n.js';
const daySeed = () => Math.floor(Date.now() / 86400e3);

/** Sorrend: hazai, majd hazai nyelvű csatornák elöl, azon belül működő / logós / HD, napi változatossággal. */
function popular(list) {
  const jitter = new Map(seededShuffle(list.map((c) => c.id), daySeed()).map((id, i) => [id, (i % 17) / 17]));
  return list
    .map((c) => [c, homeRank(c) * 1000 + rankScore(c) + jitter.get(c.id) * 25])
    .sort((a, b) => b[1] - a[1])
    .map((x) => x[0]);
}

/** Világos-e egy #rgb / #rrggbb szín (a saját témák előnézetén ehhez igazodik a felirat színe). */
function isLightColor(c) {
  const m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(String(c || '').trim());
  if (!m) return false;
  const h = m[1].length === 3 ? m[1].replace(/./g, '$&$&') : m[1];
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
  return 0.299 * r + 0.587 * g + 0.114 * b > 160;
}

/**
 * Elérhetőség szerinti fokozat: 3 – működik; 2 – még nem ellenőrzött; 1 – nem ellenőrzött, de lehet,
 * hogy innen nem nézhető vagy épp nem sugároz (csak korlátozott / időszakos forrásai vannak);
 * 0 – nem elérhető (offline, adásszünet, földrajzi korlát).
 */
function availability(c) {
  const st = channelStatus(c);
  if (st === 'ok') return 3;
  if (st === 'bad') return 0;
  return geoState(c) || c.streams.every((s) => s.notAlways) ? 1 : 2;
}

/**
 * Stabil rendezés elérhetőség szerint (a nem elérhetők a végére); egy fokozaton belül a sorrend marad.
 * top: a legmagasabb figyelembe vett fokozat (1: csak a nem elérhetők kerülnek hátra, a többi sorrendje marad).
 */
function byAvailability(list, top = 3) {
  return list
    .map((c, i) => [c, Math.min(top, availability(c)), i])
    .sort((a, b) => b[1] - a[1] || a[2] - b[2])
    .map((x) => x[0]);
}

/** A böngészés ajánlott sorrendje: elsőként az elérhetőség, azon belül a szokásos (hazai, népszerű) sorrend. */
const popularAvailable = (list) => byAvailability(popular(list));

function lazyRows(container, factories, initial = 4) {
  let i = 0;
  const sentinel = html('<div class="rows-sentinel"></div>');
  const more = (n) => {
    while (n-- > 0 && i < factories.length) {
      const el = factories[i++]();
      if (el) container.insertBefore(el, sentinel);
      else n++;
    }
    if (i >= factories.length) io.disconnect();
  };
  const io = new IntersectionObserver((e) => e.some((x) => x.isIntersecting) && more(3), { rootMargin: '600px' });
  container.append(sentinel);
  more(initial);
  io.observe(sentinel);
}

// ===========================================================================
// Főoldal
// ===========================================================================
/** A TV oldal: a csatornák sorai (a korábbi főoldal). */
export function renderTv(view) {
  const s = store.settings;
  const p = store.profile;
  const vis = visible();
  const visSet = new Set(vis);
  if (!vis.length) {
    view.innerHTML = emptyState(_t('Nincs megjeleníthető csatorna'), _t('Ellenőrizd a beállításokat vagy a profil szűrőit.'), `<a class="btn primary" href="#/settings">${_t('Beállítások')}</a>`);
    return;
  }

  const favs = getChannels(p.favorites).filter((c) => visSet.has(c));
  const recent = getChannels(p.recent).filter((c) => visSet.has(c));
  const home = vis.filter((c) => c.country === s.homeCountry);

  // --- fülek (Csatornák / Felvételek), alattuk a sorok a profil beállított sorrendjében
  view.innerHTML = '';
  const rows = html(`<div class="rows tv-rows"><div class="tv-head">${tvTabs('tv')}</div></div>`);
  view.append(rows);
  const onAir = vis.filter((c) => epg.now(c.id)?.cur);
  const favSet = new Set(p.favorites);
  onAir.sort((a, b) => (favSet.has(b.id) - favSet.has(a.id)) || (homeRank(b) - homeRank(a)) || rankScore(b) - rankScore(a));

  const builders = {
    recent: () => recent.length && rowEl(_t('Legutóbb nézett'), recent, { href: '#/favorites' }),
    favorites: () =>
      favs.length
        ? rowEl(_t('Kedvenceid'), favs, { href: '#/favorites' })
        : html(`<section class="row tip"><p>${_t('Tipp:')} ${IS_TV
              ? `${_t('egy csatornán állva a távirányító <b>piros</b> gombjával')}`
              : `${_t('a csatornák kártyáján a <b>+</b> gombbal vagy az <b>F</b> billentyűvel')}`} ${_t('kedvencet jelölhetsz. A kedvencek sorrendje adja a csatornaszámokat is.')}</p></section>`),
    onair: () => onAir.length && rowEl(_t('Most a tévében'), onAir, { href: '#/guide' }),
    home: () => home.length && !p.kids && rowEl(rowLabel('home'), popular(home), { href: `#/browse?country=${s.homeCountry}` }),
    custom: () => {
      const group = html('<div class="row-group"></div>');
      const mine = vis.filter((c) => c.lists?.includes(MINE));
      if (mine.length) group.append(rowEl(_t('Saját csatornák'), mine, { href: `#/browse?pl=${MINE}` }));
      // Az iptv-org-on kívüli listák (beépített és saját) külön sorban
      for (const pl of activeLists().filter((x) => x.id !== 'iptvorg')) {
        const list = vis.filter((c) => c.lists?.includes(pl.id));
        if (list.length) group.append(rowEl(pl.name, popular(list), { href: `#/browse?pl=${pl.id}` }));
      }
      return group.children.length ? group : null;
    },
    countries: () => !p.kids && countryTiles(),
    cattiles: () => categoryTiles(vis),
  };
  const factories = profileRows()
    .filter((r) => r.on)
    .map((r) => {
      if (r.key.startsWith('cat:')) {
        const cat = r.key.slice(4);
        if (p.kids && !KIDS_CATEGORIES.has(cat)) return null;
        return () => {
          const list = vis.filter((c) => c.categories.includes(cat));
          return list.length >= 3 ? rowEl(categoryName(cat), popular(list), { href: `#/browse?cat=${cat}` }) : null;
        };
      }
      const b = builders[r.key];
      return b ? () => b() || null : null;
    })
    .filter(Boolean);
  lazyRows(rows, factories, 4);
}

/** Országlista: a beállított ország legelöl, a többi sorrendje marad. */
const homeCountryFirst = (list) => list.slice().sort((a, b) => (b.code === store.settings.homeCountry) - (a.code === store.settings.homeCountry));

function countryTiles() {
  const list = homeCountryFirst([...catalog.countries.values()].filter((c) => c.count > 0).sort((a, b) => b.count - a.count)).slice(0, 40);
  const total = [...catalog.countries.values()].filter((c) => c.count > 0).length;
  const el = html(`<section class="row">${rowTitleHtml(_t('Fedezz fel országokat'), '#/countries', total)}
    <div class="row-wrap"><div class="row-track tiles">${list
      .map((c) => `<a class="tile" href="#/browse?country=${esc(c.code)}" style="--h:${hashHue(c.code)}"><span class="flag">${countryFlag(c.code) || `<span class="cc">${esc(c.code)}</span>`}</span><b>${esc(c.name)}</b><small>${_t('{count} csatorna', { count: c.count })}</small></a>`)
      .join('')}${seeAllHtml('#/countries', total)}</div></div></section>`);
  return el;
}

function categoryTiles(vis) {
  const cats = [...catalog.categories.values()]
    .filter((c) => vis.some((ch) => ch.categories.includes(c.id)))
    .sort((a, b) => b.count - a.count);
  return html(`<section class="row">${rowTitleHtml(_t('Kategóriák'), '#/browse', 0)}
    <div class="row-wrap"><div class="row-track tiles">${cats
      .map((c) => `<a class="tile cat" href="#/browse?cat=${esc(c.id)}" style="--h:${hashHue(c.id + 'x')}"><b>${esc(c.name)}</b><small>${_t('{count} csatorna', { count: c.count })}</small></a>`)
      .join('')}${seeAllHtml('#/browse', 0)}</div></div></section>`);
}

/** Az összes ország egy oldalon (a hazai legelöl, utána csatornaszám szerint). */
export function renderCountries(view) {
  const vis = visible();
  const count = new Map();
  for (const c of vis) count.set(c.country, (count.get(c.country) || 0) + 1);
  const list = homeCountryFirst([...catalog.countries.values()].filter((c) => count.get(c.code)).sort((a, b) => count.get(b.code) - count.get(a.code)));
  view.innerHTML = `<div class="page">${tvTabs('browse')}
    <div class="page-head"><h1>${_t('Országok')}</h1><span class="muted">${_t('{length} ország', { length: list.length })}</span></div>
    <div class="tile-grid">${list
      .map((c) => `<a class="tile" href="#/browse?country=${esc(c.code)}" style="--h:${hashHue(c.code)}"><span class="flag">${countryFlag(c.code) || `<span class="cc">${esc(c.code)}</span>`}</span><b>${esc(c.name)}</b><small>${_t('{get} csatorna', { get: count.get(c.code) })}</small></a>`)
      .join('')}</div>
  </div>`;
}

export function leaveHome() {
  stopPreview();
}

// ===========================================================================
// Böngészés
// ===========================================================================
export function renderBrowse(view, params) {
  const f = {
    cat: params.get('cat') || '',
    country: params.get('country') || '',
    lang: params.get('lang') || '',
    status: params.get('status') || '',
    quality: params.get('quality') || '',
    geo: params.get('geo') || '',
    sort: params.get('sort') || 'popular',
    pl: params.get('pl') || '',
    q: params.get('q') || '',
  };
  const qTokens = norm(f.q).split(/\s+/).filter(Boolean);
  const opts = (items, sel, all) =>
    `<option value="">${all}</option>` + items.map(([v, l]) => `<option value="${esc(v)}" ${v === sel ? 'selected' : ''}>${esc(l)}</option>`).join('');

  const vis = visible();
  const countries = homeCountryFirst([...catalog.countries.values()].filter((c) => c.count).sort((a, b) => a.name.localeCompare(b.name, LOCALE)));
  const cats = [...catalog.categories.values()].sort((a, b) => a.name.localeCompare(b.name, LOCALE));
  const homeLang = COUNTRY_LANG[store.settings.homeCountry];
  const langs = [...catalog.languages.values()]
    .filter((l) => l.count >= 3)
    .sort((a, b) => (b.code === homeLang) - (a.code === homeLang) || a.name.localeCompare(b.name, LOCALE));

  let list = vis.filter(
    (c) =>
      (!f.cat || c.categories.includes(f.cat)) &&
      (!f.country || c.country === f.country) &&
      (!f.lang || c.languages.includes(f.lang)) &&
      (!f.pl || c.lists?.includes(f.pl)) &&
      (!f.status || channelStatus(c) === f.status) &&
      (!f.quality || bestQuality(c) >= Number(f.quality)) &&
      // földrajzi korlát: ellenőrizve innen elutasított, vagy a lista szerint minden forrása korlátozott
      (!f.geo || (f.geo === 'only') === !!geoState(c)) &&
      // a kereső szövege minden szűrővel együtt érvényes (név, más név, ország, kategória)
      (!qTokens.length || qTokens.every((t) => c.search.includes(t)))
  );
  if (f.sort === 'popular') list = popularAvailable(list);
  else if (f.sort === 'country')
    list = homeFirst(list.slice().sort((a, b) => countryName(a.country).localeCompare(countryName(b.country), LOCALE) || a.name.localeCompare(b.name, LOCALE)));
  // 'name': a látható lista már így rendezett: hazaiak elöl, azon belül név szerint

  const titleParts = [f.cat && categoryName(f.cat), f.country && countryName(f.country), f.lang && catalog.languages.get(f.lang)?.name].filter(Boolean);
  const plName = f.pl && (f.pl === MINE ? _t('Saját csatornák') : [...BUILTIN_PLAYLISTS, ...store.settings.customPlaylists].find((x) => x.id === f.pl)?.name);
  const title = [plName || titleParts.join(' · '), f.q ? `„${f.q}”` : ''].filter(Boolean).join(' · ') || _t('Minden csatorna');

  view.innerHTML = `<div class="page">${tvTabs('browse')}
    <div class="page-head"><h1>${esc(title)}</h1><span class="muted">${_t('{length} csatorna', { length: list.length })}</span></div>
    <form class="filters">
      <input class="input" name="q" type="search" placeholder="${_t('Keresés a csatornák között…')}" value="${esc(f.q)}" aria-label="${_t('Keresés')}" />
      <select name="cat" aria-label="${_t('Kategória')}">${opts(cats.map((c) => [c.id, `${c.name} (${c.count})`]), f.cat, _t('Minden kategória'))}</select>
      <select name="country" aria-label="${_t('Ország')}">${opts(countries.map((c) => [c.code, `${countryFlag(c.code)} ${c.name} (${c.count})`.trim()]), f.country, _t('Minden ország'))}</select>
      <select name="lang" aria-label="${_t('Nyelv')}">${opts(langs.map((l) => [l.code, `${l.name} (${l.count})`]), f.lang, _t('Minden nyelv'))}</select>
      <select name="quality" aria-label="${_t('Minőség')}">${opts([['720', _t('HD vagy jobb')], ['1080', _t('Full HD vagy jobb')]], f.quality, _t('Bármilyen minőség'))}</select>
          <select name="geo" aria-label="${_t('Földrajzi korlát')}">${opts([['hide', _t('Földrajzi korlát nélkül')], ['only', _t('Csak a földrajzilag korlátozottak')]], f.geo, _t('Földrajzi korláttól függetlenül'))}</select>
      ${health.available || Object.keys(store.health).length ? `<select name="status" aria-label="${_t('Állapot')}">${opts([['ok', _t('Működő')], ['unknown', _t('Nem ellenőrzött')], ['bad', _t('Nem elérhető')]], f.status, _t('Bármilyen állapot'))}</select>` : ''}
      <select name="sort" aria-label="${_t('Rendezés')}">
        <option value="popular" ${f.sort === 'popular' ? 'selected' : ''}>${_t('Ajánlott sorrend')}</option>
        <option value="name" ${f.sort === 'name' ? 'selected' : ''}>${_t('Név szerint')}</option>
        <option value="country" ${f.sort === 'country' ? 'selected' : ''}>${_t('Ország szerint')}</option>
      </select>
      ${Object.entries(f).some(([k, v]) => v && k !== 'sort') ? `<a class="btn small" href="#/browse">${_t('Szűrők törlése')}</a>` : ''}
      ${f.pl ? `<input type="hidden" name="pl" value="${esc(f.pl)}" />` : ''}
    </form>
    <div class="browse-extra"></div>
  </div>`;
  const form = $('.filters', view);
  const apply = (replace) => {
    const q = new URLSearchParams();
    for (const [k, v] of new FormData(form)) if (String(v).trim() && !(k === 'sort' && v === 'popular')) q.set(k, String(v).trim());
    const h = '#/browse' + (q.toString() ? '?' + q : '');
    if (replace) location.replace(h);
    else location.hash = h;
  };
  form.onchange = (e) => e.target.name !== 'q' && apply(false);
  form.onsubmit = (e) => (e.preventDefault(), apply(false));
  form.q.addEventListener('input', debounce(() => apply(true), 500));
  if (f.q && document.activeElement === document.body) {
    requestAnimationFrame(() => {
      if (IS_TV) return; // tévén a kereső ne nyissa fel a képernyő-billentyűzetet magától
      form.q.focus();
      form.q.setSelectionRange(f.q.length, f.q.length);
    });
  }
  const page = $('.page', view);
  if (!titleParts.length && !f.pl && !f.status && !f.quality && !f.q) {
    const catTiles = html(`<section class="row"><h2 class="row-title">${_t('Kategóriák')}</h2><div class="row-wrap"><div class="row-track tiles">${cats
      .filter((c) => vis.some((ch) => ch.categories.includes(c.id)))
      .map((c) => `<a class="tile cat" href="#/browse?cat=${esc(c.id)}" style="--h:${hashHue(c.id + 'x')}"><b>${esc(c.name)}</b><small>${_t('{count} csatorna', { count: c.count })}</small></a>`)
      .join('')}</div></div></section>`);
    $('.browse-extra', view).append(catTiles, countryTiles());
  }
  page.append(gridEl(list, { title, empty: _t('Nincs a szűrőknek megfelelő csatorna.') }));
}

// ===========================================================================
// Kedvencek
// ===========================================================================
export function renderFavorites(view) {
  const p = store.profile;
  const vis = new Set(visible());
  const favs = getChannels(p.favorites).filter((c) => vis.has(c));
  const recent = getChannels(p.recent).filter((c) => vis.has(c));
  const ctx = registerContext(_t('Kedvencek'), favs);
  const vodFavs = vodFavItems();
  // érintőképernyő: saját, hosszan nyomásos húzás (lent) – a böngésző beépített húzása ott ne induljon el
  const coarse = !IS_TV && !!window.matchMedia?.('(pointer: coarse)').matches;
  // (a kedvenc filmekhez a filmlisták kellenek: ha még nem töltődtek be, most – a „vod” esemény újrarajzol)
  if ((p.vodFavs || []).length && !vod.ready) loadVod();
  view.innerHTML = `<div class="page">
    <div class="page-head"><h1>${_t('Kedvencek')}</h1><span class="muted">${IS_TV ? _t('{length} csatorna · a sorrend adja a csatornaszámokat; áthelyezés: húzással vagy a CH+ / CH− gombbal', { length: favs.length }) : coarse ? _t('{length} csatorna · a sorrend adja a csatornaszámokat; áthelyezés: hosszan nyomva húzd a kártyát a helyére', { length: favs.length }) : /Mac/.test(navigator.platform) ? _t('{length} csatorna · a sorrend adja a csatornaszámokat; áthelyezés: húzással vagy a ⌘← / ⌘→ billentyűvel', { length: favs.length }) : _t('{length} csatorna · a sorrend adja a csatornaszámokat; áthelyezés: húzással vagy a Ctrl+← / Ctrl+→ billentyűvel', { length: favs.length })}</span></div>
    ${favs.length
        ? `<div class="grid fav-grid">${favs
            .map((c, i) => cardHtml(c, { context: ctx }).replace(/^\s*<div class="card\b/, `<div ${coarse ? '' : 'draggable="true"'} data-num="${i + 1}" class="card`))
            .join('')}</div>`
        : emptyState(_t('Még nincsenek kedvenc csatornáid'), _t('A csatornák kártyáján a + gombbal, vagy kijelölve az F billentyűvel jelölhetsz kedvencet.'), `<a class="btn primary" href="#/browse">${_t('Csatornák böngészése')}</a>`)}
    <div class="page-head sub"><h2>${_t('Filmek és sorozatok')}</h2>${vodFavs.length ? `<span class="muted">${_t('{length} cím', { length: vodFavs.length })}</span>` : ''}</div>
    ${vodFavs.length
        ? `<div class="vgrid fav-vod">${vodFavs.map(vcardHtml).join('')}</div>`
        : `<p class="muted">${(store.profile.vodFavs || []).length && !vod.ready ? _t('A filmlisták betöltése…') : `${_t('Egy film vagy sorozat adatlapján a <b>☆ Kedvenc</b> gombbal teheted ide.')}`}</p>`}
    ${recent.length ? `<div class="page-head sub"><h2>${_t('Legutóbb nézett')}</h2><button class="btn small" id="clear-recent">${_t('Előzmények törlése')}</button></div>` : ''}
  </div>`;
  const page = $('.page', view);
  if (recent.length) {
    page.append(gridEl(recent, { title: _t('Legutóbb nézett') }));
    $('#clear-recent', view).onclick = () => {
      store.clearRecent();
      renderFavorites(view);
    };
  }
  // Húzással átrendezés
  const grid = $('.fav-grid', view);
  if (!grid) return;
  let dragId = null;
  grid.addEventListener('dragstart', (e) => {
    // (érintéses húzás közben – pl. érintőképernyős laptopon – a beépített húzás nem indul el)
    if (touch) return void e.preventDefault();
    const card = e.target.closest('.card');
    dragId = card?.dataset.id;
    card?.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
  });
  grid.addEventListener('dragend', () => $$('.dragging', grid).forEach((c) => c.classList.remove('dragging')));
  grid.addEventListener('dragover', (e) => {
    e.preventDefault();
  });
  grid.addEventListener('drop', (e) => {
    e.preventDefault();
    const target = e.target.closest('.card');
    if (!dragId || !target || target.dataset.id === dragId) return;
    store.moveFavorite(dragId, p.favorites.indexOf(target.dataset.id));
    renderFavorites(view);
  });
  // Érintőképernyő (a HTML-es húzás ott nem indul el): hosszan nyomva a kártya megfogható és áthúzható.
  // A hosszú nyomás itt nem nyitja meg az adatlapot (az ⓘ gombbal érhető el).
  let touch = null;
  let touchDone = 0;
  // (a húzást indító ujj; ha egy második ujj is a képernyőre kerül, a húzás megszakad)
  const ownTouch = (list) => [...list].find((t) => t.identifier === touch?.id);
  // (a második ujj a rácson kívül is érintheti a képernyőt: amíg tart a húzás, az egész lapon figyeljük)
  const otherTouch = (e) => touch && [...e.changedTouches].some((t) => t.identifier !== touch.id) && cancelTouch();
  /** Húzás megszakítása áthelyezés nélkül. */
  const cancelTouch = () => {
    if (!touch) return;
    clearTimeout(touch.timer);
    if (touch.on) touchDone = Date.now();
    touch.card.classList.remove('dragging');
    touch.over?.classList.remove('drop-target');
    touch = null;
    document.removeEventListener('touchstart', otherTouch, true);
  };
  grid.addEventListener('touchstart', (e) => {
    if (touch) return; // (a második ujjat az otherTouch kezeli)
    const card = e.target.closest('.card');
    if (!card || e.touches.length !== 1) return;
    const t = e.changedTouches[0];
    touch = { card, id: t.identifier, x: t.clientX, y: t.clientY, on: false, over: null };
    document.addEventListener('touchstart', otherTouch, true);
    touch.timer = setTimeout(() => {
      if (!touch) return;
      touch.on = true;
      card.classList.add('dragging');
      navigator.vibrate?.(15);
    }, 350);
  }, { passive: true });
  grid.addEventListener('touchmove', (e) => {
    if (!touch) return;
    if (e.touches.length > 1) return cancelTouch();
    const t = ownTouch(e.touches);
    if (!t) return;
    if (!touch.on) {
      // (a hosszú nyomás előtti elmozdulás görgetés)
      if (Math.hypot(t.clientX - touch.x, t.clientY - touch.y) > 10) cancelTouch();
      return;
    }
    e.preventDefault();
    // (ha a lista közben újrarajzolódott, a jelölés az új kártyára kerül)
    if (!touch.card.isConnected) {
      const now = document.querySelector(`.fav-grid .card[data-id="${CSS.escape(touch.card.dataset.id)}"]`);
      if (now) (touch.card = now).classList.add('dragging');
    }
    const hit = document.elementFromPoint(t.clientX, t.clientY)?.closest('.fav-grid .card');
    const over = hit && hit !== touch.card ? hit : null;
    if (over !== touch.over) {
      touch.over?.classList.remove('drop-target');
      over?.classList.add('drop-target');
      touch.over = over;
    }
  }, { passive: false });
  const endTouch = (e) => {
    // (csak a húzást indító ujj felengedése, és csak ha más ujj nincs a képernyőn)
    if (!touch || !ownTouch(e.changedTouches)) return;
    if (e.touches.length) return cancelTouch();
    clearTimeout(touch.timer);
    const { on, card, over } = touch;
    touch = null;
    document.removeEventListener('touchstart', otherTouch, true);
    if (!on) return;
    if (e.cancelable) e.preventDefault(); // (ne legyen belőle kattintás = lejátszás)
    touchDone = Date.now();
    card.classList.remove('dragging');
    over?.classList.remove('drop-target');
    if (!over) return;
    const id = card.dataset.id;
    const j = p.favorites.indexOf(over.dataset.id);
    store.moveFavorite(id, j);
    renderFavorites(view);
    toast(`${_t('{x}: {x2}. hely', { x: catalog.byId.get(id)?.name || '', x2: j + 1 })}`);
  };
  grid.addEventListener('touchend', endTouch);
  grid.addEventListener('touchcancel', cancelTouch); // (a rendszer szakította meg: nincs áthelyezés)
  grid.addEventListener('contextmenu', (e) => {
    if (touch?.on || Date.now() - touchDone < 800) (e.preventDefault(), e.stopPropagation());
  }, true);
  // Áthelyezés billentyűzettel / távirányítóval: Ctrl+← / Ctrl+→, illetve CH+ / CH−.
  grid.addEventListener('keydown', (e) => {
    const card = e.target.closest?.('.card');
    if (!card) return;
    // macOS-en a Ctrl+nyíl az asztalváltás, ott a Cmd+nyíl is működik
    const mod = e.ctrlKey || e.metaKey;
    const back = (mod && e.key === 'ArrowLeft') || e.key === 'ChannelUp' || e.key === 'PageUp';
    const fwd = (mod && e.key === 'ArrowRight') || e.key === 'ChannelDown' || e.key === 'PageDown';
    if (!back && !fwd) return;
    e.preventDefault();
    e.stopPropagation();
    const id = card.dataset.id;
    const i = p.favorites.indexOf(id);
    const j = i + (back ? -1 : 1);
    if (i < 0 || j < 0 || j >= p.favorites.length) return;
    store.moveFavorite(id, j);
    renderFavorites(view);
    $(`.fav-grid .card[data-id="${CSS.escape(id)}"]`, view)?.focus();
    toast(`${_t('{x}: {x2}. hely', { x: catalog.byId.get(id)?.name || '', x2: j + 1 })}`);
  });
}

// ===========================================================================
// Keresés
// ===========================================================================
export function renderSearch(view, params) {
  const q = params.get('q') || '';
  const tokens = norm(q).split(/\s+/).filter(Boolean);
  if (!tokens.length) {
    view.innerHTML = `<div class="page">${emptyState(_t('Keresés'), _t('Írd be egy csatorna, ország, kategória vagy műsor nevét.'))}</div>`;
    return;
  }
  // (a találati sorrendben, de a nem elérhetők – offline, adásszünet, földrajzi korlát – a végén)
  const chans = byAvailability(search(q), 1);
  const vis = new Set(visible().map((c) => c.id));
  const progs = homeFirst(
    epg.searchPrograms(tokens).filter((x) => vis.has(x.channelId)),
    (x) => homeRank(catalog.byId.get(x.channelId))
  );
  const vodHits = searchVod(q);
  const tvAny = chans.length || progs.length;
  // Két hasáb: tévé (csatornák, alattuk a műsorok) és VOD. Fekvő, széles képernyőn egymás mellett;
  // Androidon mindig egymás alatt, elöl a tévécsatornákkal.
  view.innerHTML = `<div class="page search-page">
    <div class="page-head"><h1>${_t('Találatok: „{esc}”', { esc: esc(q) })}</h1><span class="muted">${_t('{length} csatorna', { length: chans.length })}${progs.length ? `${_t(', {length} műsor', { length: progs.length })}` : ''}${vodHits.length ? `${_t(', {length} film / sorozat', { length: vodHits.length })}` : ''}</span></div>
    <div class="search-cols ${IS_ANDROID ? 'stack' : ''} ${tvAny && vodHits.length ? '' : 'one'}">
      ${tvAny
          ? `<section class="sc-tv">
        ${chans.length ? `<h2 class="section-title">${_t('Csatornák')} <a class="btn small" href="#/browse?q=${encodeURIComponent(q)}">${_t('Szűrés ország, nyelv, kategória szerint ›')}</a></h2><div class="sc-chans"></div>` : ''}
        ${progs.length ? `<h2 class="section-title">${_t('Műsorok')}</h2><div class="prog-results"></div>` : ''}
      </section>`
          : ''}
      ${vodHits.length ? `<section class="sc-vod"><h2 class="section-title">${_t('VOD – filmek és sorozatok')} <a class="btn small" href="#/vod?type=all&amp;q=${encodeURIComponent(q)}">${_t('Összes ({length})', { length: vodHits.length })}</a></h2><div class="vgrid vod-search">${vodHits.slice(0, 18).map(vcardHtml).join('')}</div></section>` : ''}
    </div>
  </div>`;
  const page = $('.page', view);
  if (progs.length) {
    const t = Date.now();
    const box = $('.prog-results', view);
    box.innerHTML = progs
      .map(({ channelId, prog }, i) => {
        const ch = catalog.byId.get(channelId);
        const live = prog.start <= t && prog.stop > t;
        return `<button class="prog-hit ${live ? 'live' : ''}" data-i="${i}" data-id="${esc(ch.id)}">
          <span class="ph-logo" style="--h:${hashHue(ch.name)}">${logoHtml(ch, 'logo-sm')}</span>
          <span class="ph-text"><b>${esc(prog.title)}</b><small>${esc(ch.name)} · ${live ? `<span class="now-label">${_t('MOST')}</span>` : `${dayLabel(Math.round((dayStart(prog.start) - dayStart()) / 86400e3))} ${fmtTime(prog.start)}`}</small></span>
        </button>`;
      })
      .join('');
    box.onclick = (e) => {
      const b = e.target.closest('[data-i]');
      if (!b) return;
      const { channelId, prog } = progs[Number(b.dataset.i)];
      openProgram(catalog.byId.get(channelId), prog);
    };
  }
  if (chans.length) $('.sc-chans', view).append(gridEl(chans, { title: `${_t('Keresés: {q}', { q })}` }));
  else if (!progs.length && !vodHits.length) page.append(html(`<div>${emptyState(_t('Nincs találat'), _t('Próbálj rövidebb vagy más kifejezést.'))}</div>`));
}

// ===========================================================================
// Műsorújság (idővonalas rács)
// ===========================================================================
const PX_PER_MIN = 4;
const guideState = { filter: 'fav', day: 0, cat: '', mode: 'grid' };
// Műsorkategóriák (az XMLTV kategória és a cím alapján)
const PROG_CATS = [
  // (magyar mellett angol, német, spanyol és francia kategórianevek is)
  ['film', _t('Film'), /film|movie|mozi|pel[ií]cula|cin[eé]ma|spielfilm/i],
  ['series', _t('Sorozat'), /sorozat|series|szappan|telenovel|serie|s[eé]rie|soap/i],
  ['sport', _t('Sport'), /sport|foci|labdar|futball|tenisz|forma[- ]?1|k[eé]zilabda|kos[aá]rlabda|meccs|olimpi|bajnoks|deporte|f[uú]tbol|fu(ß|ss)ball|football|tennis|olympi/i],
  ['news', _t('Hírek, közélet'), /h[ií]r|news|h[ií]rad[oó]|k[oö]z[eé]let|politik|magazin|nachrichten|noticias|informati|actualit|journal|telediario|current affairs/i],
  ['kids', _t('Gyerek'), /gyer(e|m)ek|mese|rajzfilm|anim|kids|child|cartoon|kinder|infantil|jeunesse|enfant|dessin/i],
  ['doc', _t('Ismeretterjesztő'), /dokument|ismeretterj|term[eé]szet|t[oö]rt[eé]nelem|tudom[aá]ny|documentary|nature|documental|documentaire|wissen|natur|historia|histoire|science|ciencia/i],
  ['show', _t('Szórakoztató'), /show|sz[oó]rakoz|vet[eé]lked|reality|talk|kv[ií]z|quiz|entertainment|unterhaltung|entretenimiento|concurso|divertissement|\bjeux?\b/i],
  ['music', _t('Zene'), /zene|music|koncert|klip|musik|m[uú]sica|musique|concert|konzert|concierto/i],
];
const progMatch = (pr, cat) => {
  const rx = PROG_CATS.find((x) => x[0] === cat)?.[2];
  return !rx || rx.test(`(${pr.category || ''}) ${pr.title}`);
};

/** „Most műsoron” nézet: csatornánként nagy kártya a most futó és a következő műsorral. */
function nowGridHtml(list) {
  const t = Date.now();
  return `<div class="now-grid">${list
    .map((ch) => {
      const n = epg.now(ch.id, t);
      const cur = n?.cur;
      return `<div class="now-card ${guideState.cat && cur && !progMatch(cur, guideState.cat) ? 'dim' : ''}">
        <button class="nc-ch" data-play="${esc(ch.id)}" title="${_t('{esc} lejátszása', { esc: esc(ch.name) })}"><span class="g-logo" style="--h:${hashHue(ch.name)}">${logoHtml(ch, 'logo-sm')}</span><b>${esc(ch.name)}</b>${ICON.play}</button>
        ${cur
            ? `<button class="nc-prog" data-prog="${esc(ch.id)}|${cur.start}"><span class="now-label">${_t('MOST')}</span> <b>${esc(cur.title)}</b>
              <span class="bar"><i style="width:${(n.progress * 100).toFixed(1)}%"></i></span>
              <small class="muted">${fmtTime(cur.start)}–${fmtTime(cur.stop)}${cur.category ? ' · ' + esc(cur.category) : ''}</small></button>`
            : `<p class="muted small">${_t('Nincs műsoradat')}</p>`}
        ${n?.next ? `<button class="nc-next" data-prog="${esc(ch.id)}|${n.next.start}"><small class="muted">${fmtTime(n.next.start)}</small> ${esc(n.next.title)}</button>` : ''}
      </div>`;
    })
    .join('')}</div>`;
}

export function renderGuide(view) {
  const s = store.settings;
  const p = store.profile;
  const visList = visible().filter((c) => epg.has(c.id));
  const favSet = new Set(p.favorites);
  if (guideState.filter === 'fav' && !visList.some((c) => favSet.has(c.id))) guideState.filter = 'home';
  if (guideState.filter === 'home' && !visList.some((c) => c.country === s.homeCountry)) guideState.filter = 'all';

  let list = visList;
  if (guideState.filter === 'fav') list = getChannels(p.favorites).filter((c) => epg.has(c.id) && visList.includes(c));
  else if (guideState.filter === 'home') list = popular(visList.filter((c) => c.country === s.homeCountry));
  else list = [...getChannels(p.favorites).filter((c) => visList.includes(c)), ...popular(visList.filter((c) => !favSet.has(c.id)))];

  const from = dayStart(Date.now(), guideState.day);
  const to = from + 24 * 3600e3;
  const width = 24 * 60 * PX_PER_MIN;
  // kategória: csak azok a csatornák, amelyeken aznap van ilyen műsor (Most nézetben: épp most)
  const nowT = Date.now();
  if (guideState.cat) list = list.filter((c) => (guideState.mode === 'now' ? [epg.now(c.id, nowT)?.cur].filter(Boolean) : epg.range(c.id, from, to)).some((pr) => progMatch(pr, guideState.cat)));

  view.innerHTML = `<div class="page guide-page">${tvTabs('guide')}
    <div class="page-head"><h1>${_t('Műsorújság')}</h1><span class="muted">${fmtDay(from)}</span></div>
    <div class="guide-bar">
      <div class="tabs">
        <button class="tab ${guideState.filter === 'fav' ? 'active' : ''}" data-f="fav">${_t('Kedvencek')}</button>
        <button class="tab ${guideState.filter === 'home' ? 'active' : ''}" data-f="home">${esc(countryName(s.homeCountry))}</button>
        <button class="tab ${guideState.filter === 'all' ? 'active' : ''}" data-f="all">${_t('Minden csatorna')}</button>
      </div>
      <div class="tabs">${[-1, 0, 1, 2, 3]
        .map((d) => `<button class="tab ${d === guideState.day ? 'active' : ''}" data-d="${d}">${dayLabel(d)}</button>`)
        .join('')}</div>
      <button class="btn small" data-now>${_t('Ugrás a mostani időre')}</button>
      <select data-gcat aria-label="${_t('Műsorkategória')}"><option value="">${_t('Minden műsor')}</option>${PROG_CATS.map(([k, l]) => `<option value="${k}" ${guideState.cat === k ? 'selected' : ''}>${l}</option>`).join('')}</select>
      <div class="tabs"><button class="tab ${guideState.mode === 'grid' ? 'active' : ''}" data-gmode="grid">${_t('Idővonal')}</button><button class="tab ${guideState.mode === 'now' ? 'active' : ''}" data-gmode="now">${_t('Most műsoron')}</button></div>
    </div>
    ${epg.loading && !epg.byChannel.size
        ? `<div class="empty-state"><div class="spinner"></div><p>${_t('A műsorújság betöltése folyamatban…')}</p></div>`
        : !list.length
          ? emptyState(_t('Nincs műsoradat'), epg.byChannel.size ? (guideState.cat ? _t('Ebben a nézetben nincs ilyen kategóriájú műsor.') : _t('Ebben a nézetben nincs olyan csatorna, amelyhez műsorújság tartozik.')) : _t('A műsorújság még nem töltődött be, vagy egyik forrás sem érhető el. A beállításokban további forrásokat adhatsz meg.'), `<a class="btn" href="#/settings">${_t('Beállítások')}</a>`)
          : guideState.mode === 'now'
            ? nowGridHtml(list.slice(0, 120))
            : `<div class="guide-scroll"><div class="guide-inner" style="width:${width + 220}px">
          <div class="g-head"><div class="g-corner"></div><div class="g-times" style="width:${width}px">${Array.from({ length: 48 }, (_, i) => `<span style="left:${i * 30 * PX_PER_MIN}px">${fmtTime(from + i * 1800e3)}</span>`).join('')}</div></div>
          <div class="g-rows"></div>
          <div class="g-more" style="height:1px"></div>
          <div class="g-nowline" hidden></div>
        </div></div>`}
  </div>`;

  // Szűrő / nap váltása után a fókusz a megnyomott fülön marad.
  $$('[data-f]', view).forEach((b) => (b.onclick = () => {
    guideState.filter = b.dataset.f;
    renderGuide(view);
    $(`[data-f="${b.dataset.f}"]`, view)?.focus();
  }));
  $$('[data-d]', view).forEach((b) => (b.onclick = () => {
    guideState.day = Number(b.dataset.d);
    renderGuide(view);
    $(`[data-d="${b.dataset.d}"]`, view)?.focus();
  }));
  $('[data-gcat]', view).onchange = (e) => {
    guideState.cat = e.target.value;
    renderGuide(view);
    $('[data-gcat]', view)?.focus();
  };
  $$('[data-gmode]', view).forEach((b) => (b.onclick = () => {
    guideState.mode = b.dataset.gmode;
    if (guideState.mode === 'now') guideState.day = 0;
    renderGuide(view);
    $(`[data-gmode="${b.dataset.gmode}"]`, view)?.focus();
  }));
  const nowGrid = $('.now-grid', view);
  if (nowGrid) {
    nowGrid.onclick = (e) => {
      const b = e.target.closest('[data-play], [data-prog]');
      if (!b) return;
      const ch = catalog.byId.get(b.dataset.play || b.dataset.prog.split('|')[0]);
      if (b.dataset.play) return player.play(ch, { context: registerCtxOnce(list) });
      const pr = epg.list(ch.id).find((x) => x.start === Number(b.dataset.prog.split('|')[1]));
      if (pr) openProgram(ch, pr);
    };
    return;
  }
  const scroll = $('.guide-scroll', view);
  if (!scroll) return;
  const t = Date.now();

  const fillRow = (row) => {
    const ch = catalog.byId.get(row.dataset.id);
    const progs = epg.range(ch.id, from, to);
    row.querySelector('.g-progs').innerHTML = progs
      .map((pr) => {
        const l = (Math.max(pr.start, from) - from) / 60000 * PX_PER_MIN;
        const w = (Math.min(pr.stop, to) - Math.max(pr.start, from)) / 60000 * PX_PER_MIN;
        const live = pr.start <= t && pr.stop > t;
        const past = pr.stop <= t;
        const rem = store.hasReminder(ch.id, pr.start);
        return `<button class="g-prog ${live ? 'live' : ''} ${past ? 'past' : ''} ${rem ? 'rem' : ''} ${guideState.cat && !progMatch(pr, guideState.cat) ? 'dim' : ''}" style="left:${l}px;width:${Math.max(w - 2, 2)}px" data-start="${pr.start}" title="${esc(pr.title)}">
          <b>${esc(pr.title)}</b><small>${fmtTime(pr.start)}–${fmtTime(pr.stop)}</small></button>`;
      })
      .join('') ||
      // (a felirat a látható sávban marad görgetéskor is – a csatornaoszlop mellett)
      `<span class="g-empty muted small" style="left:${(scroll.querySelector('.g-ch')?.offsetWidth || 220) + 12}px">${_t('Nincs műsoradat')}</span>`;
  };
  const io = new IntersectionObserver(
    (ents) => ents.forEach((e) => {
      if (e.isIntersecting && !e.target.dataset.filled) {
        e.target.dataset.filled = '1';
        fillRow(e.target);
      }
    }),
    { root: scroll, rootMargin: '400px 0px' }
  );
  // A sorok részletekben készülnek (a „Minden csatorna” több ezer sor is lehet – tévén ez másodpercekig tartana).
  const rowsBox = $('.g-rows', view);
  let shown = 0;
  const addRows = (n) => {
    const part = list.slice(shown, shown + n);
    shown += part.length;
    rowsBox.insertAdjacentHTML(
      'beforeend',
      part
        .map((c) => `<div class="g-row" data-id="${esc(c.id)}"><button class="g-ch" data-play="${esc(c.id)}" title="${_t('{esc} lejátszása', { esc: esc(c.name) })}"><span class="g-logo" style="--h:${hashHue(c.name)}">${logoHtml(c, 'logo-sm')}</span><span class="g-name">${esc(c.name)}</span></button><div class="g-progs" style="width:${width}px"></div></div>`)
        .join('')
    );
    [...rowsBox.children].slice(-part.length).forEach((r) => io.observe(r));
    if (shown >= list.length) moreIo.disconnect();
  };
  const moreIo = new IntersectionObserver((ents) => ents.some((x) => x.isIntersecting) && addRows(100), { root: scroll, rootMargin: '600px 0px' });
  addRows(100);
  moreIo.observe($('.g-more', view));

  const nowLine = $('.g-nowline', view);
  const placeNow = () => {
    const n = Date.now();
    if (n < from || n > to) return (nowLine.hidden = true);
    nowLine.hidden = false;
    // a csatornaoszlop szélessége kis képernyőn kisebb
    const chW = scroll.querySelector('.g-ch')?.offsetWidth || 220;
    nowLine.style.left = chW + ((n - from) / 60000) * PX_PER_MIN + 'px';
  };
  placeNow();
  clearInterval(guideState.timer);
  guideState.timer = setInterval(() => (document.body.contains(nowLine) ? placeNow() : clearInterval(guideState.timer)), 30000);
  const jumpNow = () => {
    scroll.scrollLeft = guideState.day === 0 ? ((Date.now() - from) / 60000) * PX_PER_MIN - 120 : 18 * 60 * PX_PER_MIN;
  };
  jumpNow();
  $('[data-now]', view).onclick = () => {
    if (guideState.day !== 0) {
      guideState.day = 0;
      renderGuide(view);
    } else jumpNow();
  };

  scroll.addEventListener('click', (e) => {
    const pl = e.target.closest('[data-play]');
    if (pl) return player.play(catalog.byId.get(pl.dataset.play), { context: registerCtxOnce(list) });
    const b = e.target.closest('.g-prog');
    if (!b) return;
    const ch = catalog.byId.get(b.closest('.g-row').dataset.id);
    const pr = epg.list(ch.id).find((x) => x.start === Number(b.dataset.start));
    if (pr) openProgram(ch, pr);
  });
}

function registerCtxOnce(list) {
  return { title: _t('Műsorújság'), ids: list.map((c) => c.id) };
}

// ===========================================================================
// Beállítások
// ===========================================================================
export function renderSettings(view) {
  const s = store.settings;
  const countries = [...catalog.countries.values()].filter((c) => c.count).sort((a, b) => a.name.localeCompare(b.name, LOCALE));
  const toggle = (key, label, desc = '') => `<label class="setting"><span><b>${label}</b>${desc ? `<small>${desc}</small>` : ''}</span>
    <input type="checkbox" class="switch" data-set="${key}" ${s[key] ? 'checked' : ''} /></label>`;
  const scan = health.scanning;
  const healthCount = Object.values(store.health);
  const okCount = healthCount.filter((h) => h[0]).length;

  view.innerHTML = `<div class="page settings">
    <div class="page-head set-head"><h1>${_t('Beállítások')}</h1></div>
    <div class="set-nav"></div>

    <section class="set-section" id="language" data-g="look"><h2>${_t('Nyelv')} <span class="muted small">/ Language</span></h2>
      <label class="setting"><span><b>${_t('A felület nyelve')}</b><small>${_t('Menük, üzenetek és súgó. Váltáskor az alkalmazás újraindul.')}</small></span>
        <select data-lang>${LANGS.map((l) => `<option value="${l.id}" ${l.id === uiLang ? 'selected' : ''}>${esc(l.name)}</option>`).join('')}</select></label></section>
    <section class="set-section appearance" id="appearance" data-g="look"></section>
    <section class="set-section" id="dashboard" data-g="home"></section>

    <section class="set-section" id="playback" data-g="play"><h2>${_t('Lejátszás@@beállítás')} <button class="help-link" data-help="engines" title="${_t('Súgó')}">?</button></h2>
      ${toggle('autoFallback', _t('Automatikus tartalék forrás'), _t('Ha egy adás nem indul el, vagy a forrása túl lassú, a csatorna következő forrását próbálja.'))}
      ${toggle('resumeLast', _t('Utolsó csatorna folytatása indításkor'))}
      ${toggle('perChannelVolume', _t('Hangerő csatornánként'), _t('Minden csatorna megjegyzi a saját hangerejét (a halkabb és hangosabb adók miatt).'))}
      ${api.setBackgroundPrefs ? toggle('bgAudio', _t('Háttérlejátszás (csak hang)'), _t('Másik alkalmazásra váltva az adás hangja tovább szól (értesítéssel, onnan leállítható).')) : ''}
      <label class="setting"><span>${_t('<b>Legnagyobb minőség</b>')}<small>${_t('A több minőségben elérhető adásoknál: lassú vagy mobil kapcsolaton kisebb felbontással kevesebbet akad, és kevesebb adatot használ. Automatikusan az ablak méretéhez igazodik. (Az egyetlen minőségű adásokon nem változtat.)')}</small></span>
        <select data-set="maxQuality">${[['', _t('Automatikus (az ablakmérethez)')], ['1080', _t('Legfeljebb 1080p (Full HD)')], ['720', _t('Legfeljebb 720p (HD)')], ['480', _t('Legfeljebb 480p (SD)')], ['360', _t('Legfeljebb 360p (adatkímélő)')]]
          .map(([v, l]) => `<option value="${v}" ${String(s.maxQuality || '') === v ? 'selected' : ''}>${l}</option>`)
          .join('')}</select></label>
    </section>

    <section class="set-section" id="engine" data-g="play"><h2>${_t('Lejátszómotor')} <button class="help-link" data-help="engines" title="${_t('Súgó')}">?</button></h2>
      <label class="setting"><span>${_t('<b>Lejátszómotor</b>')}<small>${_t('Automatikus: tévén a beépített lejátszó, máshol a hls.js. Ha egy adás nem indul, érdemes átváltani.')}</small></span>
        <select data-set="playbackEngine">${[['auto', _t('Automatikus')], ['native', _t('Beépített lejátszó')], ['hlsjs', 'hls.js']]
          .map(([v, l]) => `<option value="${v}" ${s.playbackEngine === v ? 'selected' : ''}>${l}</option>`)
          .join('')}</select></label>
      ${api.mediaProbe ? toggle('mediaBridge', _t('Lejátszási híd (FFmpeg) filmekhez'), _t('AC3 / DTS hang, a fájlba ágyazott feliratok (MKV, MP4), több hangsáv és régi videóformátumok lejátszása. Kikapcsolva a beépített lejátszó próbálja (néma lehet, felirat nélkül).')) + `<p class="muted small media-status">${_t('FFmpeg ellenőrzése…')}</p>` : ''}
      ${exoAvailable() ? toggle('mediaBridge', _t('Natív lejátszó (ExoPlayer) filmekhez'), _t('MKV / MP4 / AVI fájlok AC3 / DTS hanggal és beágyazott (ASS / SRT) felirattal, minden hangsáv választható. Kikapcsolva a WebView saját lejátszója próbálja (néma lehet, felirat nélkül).')) : ''}
    </section>

    <section class="set-section" id="playerbuttons" data-g="play"><h2>${_t('A lejátszó gombjai')} <button class="help-link" data-help="pip-mini" title="${_t('Súgó')}">?</button></h2>
      <p class="muted small">${_t('Melyik kiegészítő gomb látsszon a vezérlősávon. A billentyűk (pl. C, I, L) kikapcsolt gombnál is működnek; a szünet, a hangerő és a ⚙ menü mindig látszik.')}</p>
      <div class="pb-grid">${PLAYER_BUTTONS.filter(([k]) => (k !== 'mini' || api.caps.mini) && (k !== 'full' || api.caps.fullscreen) && (k !== 'multi' || api.caps.multiview) && (k !== 'cast' || api.caps.cast) && (k !== 'rec' || api.recStart))
        .map(([k, l]) => `<label class="pb-item"><input type="checkbox" data-pb="${k}" ${s.playerButtons?.[k] !== false ? 'checked' : ''} /> ${esc(l)}</label>`)
        .join('')}</div>
    </section>

    <section class="set-section" id="subsstyle" data-g="subs"><h2>${_t('A feliratok kinézete')} <button class="help-link" data-help="subtitles" title="${_t('Súgó')}">?</button></h2>
      <label class="setting"><span>${_t('<b>Feliratok mérete</b>')}</span><select data-set="subsSize">${[['small', _t('Kicsi')], ['normal', _t('Közepes')], ['large', _t('Nagy')], ['huge', _t('Óriás')]].map(([v, l]) => `<option value="${v}" ${(s.subsSize || 'normal') === v ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
      <label class="setting stack"><span>${_t('<b>Feliratok színe és háttere</b>')}<small>${_t('Filmeknél, sorozatoknál és az élő adások feliratainál.')}</small></span><div class="inline sub-style"><select data-set="subColor" aria-label="${_t('Szín')}">${[['white', _t('Fehér')], ['yellow', _t('Sárga')], ['cyan', _t('Világoskék')]].map(([v, l]) => `<option value="${v}" ${(s.subColor || 'white') === v ? 'selected' : ''}>${l}</option>`).join('')}</select><select data-set="subBg" aria-label="${_t('Háttér')}">${[['box', _t('Sötét sáv')], ['shadow', _t('Árnyék')], ['none', _t('Nincs')]].map(([v, l]) => `<option value="${v}" ${(s.subBg || 'box') === v ? 'selected' : ''}>${l}</option>`).join('')}</select></div></label>
    </section>

    ${api.caps.preview ? `<section class="set-section" id="homepreview" data-g="home"><h2>${_t('Élő előnézet')}</h2>
      ${toggle('heroPreview', _t('Élő előnézet a Főoldalon'), _t('Az utoljára nézett csatorna csempéjén néhány másodperc után a csatorna némított élő képe. Egy perc után megáll (kíméli a gépet); rámutatva újraindul.'))}
    </section>` : ''}

    <section class="set-section" id="content" data-g="kids"><h2>${_t('Tartalom')} <button class="help-link" data-help="kids" title="${_t('Súgó')}">?</button></h2>
      <label class="setting"><span>${_t('<b>Hazai ország</b>')}<small>${_t('Ennek a csatornái kerülnek előre, és ezek kapják a csatornaszámokat a kedvencek után.')}</small></span>
        <select data-set="homeCountry">${countries.map((c) => `<option value="${esc(c.code)}" ${c.code === s.homeCountry ? 'selected' : ''}>${countryFlag(c.code)} ${esc(c.name)}</option>`).join('')}</select></label>
      ${toggle('hideOffline', _t('Nem elérhető csatornák elrejtése'), _t('Az ellenőrzés során hibásnak talált csatornák nem jelennek meg.'))}
      ${toggle('showAdult', _t('Felnőtt tartalom megjelenítése'), _t('Gyerekprofilban soha nem jelenik meg.'))}
    </section>

    <section class="set-section" id="kidsallow" data-g="kids"></section>

    <section class="set-section" id="health" data-g="tvlists"><h2>${_t('Elérhetőség-ellenőrzés')} <button class="help-link" data-help="health" title="${_t('Súgó')}">?</button></h2>
      ${health.available ? toggle('autoCheck', _t('Automatikus ellenőrzés a háttérben'), _t('A megjelenő csatornák adását időnként ellenőrzi.')) : `<p class="muted">${_t('Az ellenőrzés csak az asztali alkalmazásban érhető el.')}</p>`}
      <p class="muted">${_t('Ellenőrzött adások: {length} · működik: {okCount} · hibás: {x}', { length: healthCount.length, okCount, x: healthCount.length - okCount })}</p>
      ${health.available ? `<div class="scan">${
        scan
          ? `<div class="progress"><i style="width:${((scan.done / scan.total) * 100).toFixed(1)}%"></i></div><span>${scan.done} / ${scan.total}</span> <button class="btn small" data-act="scan-cancel">${_t('Leállítás')}</button>`
          : `<button class="btn" data-act="scan">${_t('Minden adás ellenőrzése')}</button> <small class="muted">${_t('Kb. {n} adás, néhány percig tart.', { n: catalog.channels.reduce((n, c) => n + c.streams.length, 0) })}</small>`
      }</div>` : ''}
      <button class="btn small" data-act="health-clear">${_t('Eredmények törlése')}</button>
    </section>

    <section class="set-section lists" id="lists" data-g="tvlists"></section>

    <section class="set-section lists" id="vodlists" data-g="vod"></section>

    <section class="set-section lists" id="ownlists" data-g="vod"></section>

    <section class="set-section" id="huinfo" data-g="subs"></section>

    <section class="set-section" id="reminders" data-g="notify"><h2>${_t('Emlékeztetők és értesítések')} <button class="help-link" data-help="reminders" title="${_t('Súgó')}">?</button></h2>
      <p class="muted">${_t('A műsorújságban vagy a csatorna adatlapján a csengővel jelölhetsz meg műsort; a műsor adatlapján <i>Minden adására</i> is kérhetsz emlékeztetőt (sorozatokhoz, rendszeres műsorokhoz).')}</p>
      <label class="setting"><span>${_t('<b>Értesítés a kezdés előtt</b>')}</span>
        <select data-set-num="reminderLead">${[0, 1, 2, 5, 10, 15, 30]
          .map((m) => `<option value="${m}" ${Number(s.reminderLead ?? 2) === m ? 'selected' : ''}>${m ? _t('{m} perccel előtte', { m }) : _t('a kezdéskor')}</option>`)
          .join('')}</select></label>
      ${toggle('reminderAutoSwitch', _t('Automatikus átkapcsolás a kezdéskor'), _t('Ha az Adás nyitva van, a műsor kezdetekor (8 másodperces visszaszámlálás után) átkapcsol a csatornára.'))}
      ${api.caps.background
          ? `${toggle('runInBackground', _t('Futás a háttérben (tálcán)'), _t('Az ablak bezárásakor az Adás a tálcán fut tovább, így az emlékeztetők akkor is megszólalnak. Kilépés: a tálca ikonjának menüjéből.'))}
      ${toggle('startWithSystem', _t('Indítás a rendszerrel'), _t('Bejelentkezéskor a tálcára (Macen a menüsorba) indul – csak a háttérben futással együtt.'))}
      <p class="muted small">${_t('Az értesítések a Windows értesítési központjában jelennek meg; kattintásra a csatorna indul.')}</p>`
          : IS_ANDROID
            ? `<p class="muted small">${_t('Androidon a rendszer értesít – akkor is, ha az Adás be van zárva. Kattintásra a csatorna indul.')}</p>
      <div class="inline"><button class="btn small" data-act="notify-perm">${_t('Értesítések engedélyezése')}</button></div>`
            : IS_TV
              ? `<p class="muted small">${_t('Tévén az értesítés akkor jelenik meg, ha az Adás fut (más alkalmazás közben is felugró üzenetként).')}</p>`
              : `<p class="muted small">${_t('Böngészőben az értesítés csak akkor jelenik meg, ha az oldal nyitva van.')}</p>`}
    </section>

    ${api.recStart ? '<section class="set-section" id="recordings" data-g="rec"></section>' : ''}

    <section class="set-section" id="transfer" data-g="sync"></section>

    ${api.rcStart ? '<section class="set-section" id="remote" data-g="remote"></section>' : ''}

    <section class="set-section" id="update" data-g="update"></section>

    <section class="set-section" id="epg" data-g="epg"><h2>${_t('Műsorújság')} <button class="help-link" data-help="epg-sources" title="${_t('Súgó')}">?</button></h2>
      <p class="muted">${_t('{size} csatornához van műsoradat.', { size: epg.byChannel.size })} ${epg.loading ? _t('Betöltés folyamatban…') : ''}</p>
      <ul class="src-list">${[...s.epgSources.map((src, i) => ({ ...src, name: epgSourceName(src), i })), ...(s.useEmbeddedEpg ? (catalog.tvgUrls || []).map((url) => ({ url, name: `${_t('Lejátszólista műsorújsága:')} ` + url.replace(/^https?:\/\/(www\.)?/, '').slice(0, 50), embedded: true, enabled: true })) : [])]
        .map((src) => {
          const st = epg.status[src.url];
          const info = !src.enabled ? _t('kikapcsolva') : !st ? _t('nincs betöltve') : st.ok ? `${_t('{x} csatorna párosítva / {channels} · {programs} műsor', { x: st.matched ?? 0, channels: st.channels, programs: st.programs })}` : `${_t('hiba: {error}', { error: st.error })}`;
          return `<li><input type="checkbox" class="switch" ${src.embedded ? 'data-set="useEmbeddedEpg" checked' : `data-epg-toggle="${src.i}" ${src.enabled ? 'checked' : ''}`} />
            <span><b>${esc(src.name)}</b><small>${esc(info)}</small></span>
            ${!src.embedded && !BUILTIN_EPG.some((b) => b.url === src.url) ? `<button class="btn small" data-epg-del="${src.i}">${_t('Törlés')}</button>` : ''}</li>`;
        })
        .join('')}</ul>
      <div class="inline"><button class="btn small" data-act="epg-add">${_t('XMLTV forrás hozzáadása')}</button><button class="btn small" data-act="epg-reload">${_t('Műsorújság frissítése most')}</button></div>
      <label class="setting"><span>${_t('<b>Frissítés gyakorisága</b>')}</span><select data-set-num="epgRefreshHours">${[3, 6, 12, 24, 48]
        .map((h) => `<option value="${h}" ${h === s.epgRefreshHours ? 'selected' : ''}>${_t('{h} óránként', { h })}</option>`)
        .join('')}</select></label>
    </section>

    <section class="set-section" id="data" data-g="data"><h2>${_t('Profilok és mentés')} <button class="help-link" data-help="backup" title="${_t('Súgó')}">?</button></h2>
      <div class="inline"><a class="btn" href="#/profiles">${_t('Profilok kezelése')}</a>
      ${api.caps.files ? `<button class="btn" data-act="export">${_t('Mentés fájlba')}</button>
      <button class="btn" data-act="import">${_t('Visszaállítás fájlból')}</button>
      <button class="btn" data-act="import-profiles">${_t('Profilok hozzáadása fájlból')}</button>` : ''}
      <button class="btn" data-act="clear-cache">${_t('Gyorsítótár törlése')}</button></div>
      <p class="muted">${_t('A mentés tartalmazza a beállításokat, a profilokat, a kedvenceket, az előzményeket és az emlékeztetőket.')}</p>
      <div id="autobackup"></div>
    </section>

    ${IS_TV
        ? `<section class="set-section" id="tvkeys" data-g="remote"><h2>${_t('Távirányító')}</h2>
      <table class="keys">
        <tr><td>${_t('Nyilak, OK')}</td><td>${_t('Mozgás, kiválasztás / lejátszás')}</td></tr>
        <tr><td>${_t('Vissza')}</td><td>${_t('Vissza (a főoldalon: kilépés)')}</td></tr>
        <tr><td>${_t('Piros')}</td><td>${_t('Kedvenc be/ki')}</td></tr>
        <tr><td>${_t('Zöld')}</td><td>${_t('Csatorna adatai / műsorújság')}</td></tr>
        <tr><td>${_t('Sárga')}</td><td>${_t('Keresés (lejátszás közben: minőség, forrás)')}</td></tr>
        <tr><td>${_t('Kék')}</td><td>${_t('Kedvencek (lejátszás közben: csatornalista)')}</td></tr>
        <tr><td>${_t('CH+ / CH−, ↑ / ↓')}</td><td>${_t('Csatornaváltás lejátszás közben')}</td></tr>
        <tr><td>0–9</td><td>${_t('Csatornaszám')}</td></tr>
        <tr><td>◀◀ / ▶▶</td><td>${_t('Élő adás: 30 mp vissza / előre (film: tekerés)')}</td></tr>
        <tr><td>${_t('Felirat (CC)')}</td><td>${_t('Hang és felirat')}</td></tr>
      </table></section>`
        : ''}
    <section class="set-section" id="keys" data-g="remote" ${IS_TV ? 'data-off' : ''}><h2>${_t('Billentyűparancsok')}</h2>
      <table class="keys">
        <tr><td>${_t('Nyilak')}</td><td>${_t('Mozgás a felületen (távirányítóval is)')}</td></tr>
        <tr><td>${_t('Enter')}</td><td>${_t('Lejátszás / kiválasztás')}</td></tr>
        <tr><td>I</td><td>${_t('Csatorna adatai')}</td></tr>
        <tr><td>${_t('F (kártyán)')}</td><td>${_t('Kedvenc be/ki')}</td></tr>
        <tr><td>${_t('Esc / Backspace')}</td><td>${_t('Vissza')}</td></tr>
        <tr><td>${_t('Ctrl+F vagy /')}</td><td>${_t('Keresés')}</td></tr>
        <tr><td colspan="2">${_t('<b>Lejátszás közben</b>')}</td></tr>
        <tr><td>${_t('↑ / ↓, PageUp / PageDown')}</td><td>${_t('Előző / következő csatorna')}</td></tr>
        <tr><td>← / →</td><td>${_t('Hangerő')}</td></tr>
        <tr><td>0–9</td><td>${_t('Csatornaszám beírása')}</td></tr>
        <tr><td>${_t('Szóköz')}</td><td>${_t('Szünet / lejátszás')}</td></tr>
        <tr><td>${_t('Enter / L')}</td><td>${_t('Csatornalista')}</td></tr>
        <tr><td>${_t('M / F / N / S')}</td><td>${_t('Némítás / teljes képernyő / mini lejátszó / kedvenc')}</td></tr>
        <tr><td>${_t('Shift+← / Shift+→, End')}</td><td>${_t('Élő adás: 30 mp vissza / előre, ugrás élőbe')}</td></tr>
        <tr><td>${_t('C / V')}</td><td>${_t('Hang és felirat / több adás egyszerre')}</td></tr>
        <tr><td>D</td><td>${_t('Adás adatai (minőség, sebesség, puffer)')}</td></tr>
        <tr><td>R</td><td>${_t('Vissza az előző csatornára')}</td></tr>
      </table>
    </section>

    <section class="set-section about-sec" id="about" data-g="about"><h2>${_t('Névjegy')}</h2>
      <div class="about-head"><b class="about-name">${_t('Adás</b>')}<span class="muted about"></span></div>
      <p>${_t('Élő tévé, műsorújság, filmek és sorozatok (online listák és saját médiatár), felvétel, sportfigyelő és testreszabható főoldal – egy alkalmazásban, Windowson, macOS-en, Linuxon, Androidon és Android TV-n.')}</p>
      <dl class="about-list">
        <dt>${_t('Tévécsatornák')}</dt><dd><a href="#" data-ext="https://github.com/iptv-org/iptv">iptv-org</a> ${_t('(nyilvános, közösségi gyűjtemény), Free-TV, Pluto TV, Samsung TV Plus, Plex, FreeCast – és a saját listáid')}</dd>
        <dt>${_t('Műsorújság')}</dt><dd>${_t('iptv-epg.org, epgshare01, a lejátszólisták saját XMLTV-forrásai és a saját forrásaid')}</dd>
        <dt>${_t('Film- és sorozatadatok')}</dt><dd>${_t('Wikipédia, Wikidata, AniList, Kitsu, MyAnimeList, TVmaze; saját kulccsal TMDB és OMDb')}</dd>
        <dt>${_t('Feliratok')}</dt><dd>${_t('OpenSubtitles (saját fiókkal)')}</dd>
        <dt>${_t('Főoldal')}</dt><dd>${_t('Open-Meteo (időjárás, levegőminőség), ESPN és TheSportsDB (sport), Frankfurter (árfolyam), névnapok, a választott hírforrások RSS-e')}</dd>
        <dt>${_t('Lejátszás@@beállítás')}</dt><dd>${_t('Electron, hls.js, dash.js, FFmpeg (lejátszási híd, felvétel); Androidon Media3 ExoPlayer FFmpeg-dekóderrel')}</dd>
      </dl>
      <p class="muted small">${_t('Az Adás nem tárol és nem szolgáltat műsort: az adásokat és a fájlokat a csatornák, a listák készítői, illetve a saját géped / NAS-od szolgáltatják, elérhetőségük változhat. Csak olyan tartalmat nézz és rögzíts, amihez jogod van.')}</p>
      <div class="inline"><a class="btn small" href="#/help">${_t('Súgó')}</a><a class="btn small" href="#/stats">${_t('Statisztika')}</a></div>
    </section>
  </div>`;

  const PLATFORM = { win32: _t('Windows'), darwin: 'macOS', linux: _t('Linux'), android: 'Android', web: _t('böngésző') };
  api.appInfo().then((i) => {
    const el = $('.about', view);
    if (el) el.innerHTML = `${esc(i.version)} · ${esc(PLATFORM[i.platform] || i.platform)}${IS_TV ? ` ${_t('(tévé)')}` : ''}<br><small>${_t('Adatok helye: <code>{esc}</code>', { esc: esc(i.dataDir) })}</small>`;
  });
  renderAppearance($('.appearance', view));
  renderLists($('#lists', view));
  renderVodLists($('#vodlists', view));
  renderOwnLists($('#ownlists', view));
  renderHuSettings($('#huinfo', view));
  renderTransfer($('#transfer', view));
  renderUpdate($('#update', view));
  renderKidsSettings($('#kidsallow', view));
  renderDashSettings($('#dashboard', view));
  renderRecordings($('#recordings', view));
  renderRemoteSettings($('#remote', view));
  renderBackups($('#autobackup', view));
  // A lejátszási híd állapota (megvan-e és elindul-e a beépített FFmpeg)
  api.mediaStatus?.().then((st) => {
    const el = $('.media-status', view);
    if (!el) return;
    el.innerHTML = st.ok ? `${_t('FFmpeg {esc} – rendben', { esc: esc(st.version) })}` : `<span class="warn">${_t('A lejátszási híd nem használható:')} ${esc(st.error || _t('ismeretlen hiba'))}</span>`;
  });
  settingsNav(view);

  view.onchange = async (e) => {
    const t = e.target;
    if ('lang' in t.dataset) {
      // a nyelv a lap egész élettartamára rögzített: mentés, majd újratöltés
      setLanguage(t.value);
      return;
    }
    if (t.dataset.set) {
      if (t.dataset.set === 'showAdult' && t.checked) {
        const ok = await confirmDialog(_t('Biztosan megjeleníted a felnőtt tartalmú csatornákat? Csak 18 éven felülieknek.'), { ok: _t('Igen, 18 éves elmúltam') });
        if (!ok) return (t.checked = false);
      }
      store.set(t.dataset.set, t.type === 'checkbox' ? t.checked : t.value);
      if (t.dataset.set === 'useEmbeddedEpg') epg.load();
      return;
    }
    if (t.dataset.pb) return store.set('playerButtons', { ...store.settings.playerButtons, [t.dataset.pb]: t.checked });
    if (t.dataset.setNum) return store.set(t.dataset.setNum, Number(t.value));
    if (t.dataset.setText) {
      store.set(t.dataset.setText, t.value.trim());
      return;
    }
    if (t.dataset.epgToggle !== undefined) {
      s.epgSources[Number(t.dataset.epgToggle)].enabled = t.checked;
      store.save();
      // A teljes oldalt csak a betöltés végén rajzoljuk újra (közben a kapcsoló már mutatja az állapotot)
      const info = t.closest('li')?.querySelector('small');
      if (info) info.textContent = t.checked ? _t('betöltés…') : _t('kikapcsolva');
      epg.load().then(() => location.hash.startsWith('#/settings') && renderSettings(view));
    }
  };

  view.onclick = async (e) => {
    const ext = e.target.closest('[data-ext]');
    if (ext) {
      e.preventDefault();
      return api.openExternal(ext.dataset.ext);
    }
    const b = e.target.closest('button');
    if (!b) return;
    const act = b.dataset.act;
    if (act === 'scan') {
      health.scanAll(catalog.channels).then((r) => {
        if (r) toast(r.cancelled ? _t('Ellenőrzés leállítva') : `${_t('Ellenőrzés kész: {checked} adás', { checked: r.checked })}`);
        if (location.hash.startsWith('#/settings')) renderSettings(view);
      });
      renderSettings(view);
    } else if (act === 'scan-cancel') health.cancelScan();
    else if (act === 'health-clear') {
      health.clear();
      renderSettings(view);
    } else if (act === 'epg-add') {
      const url = await promptDialog(_t('Az XMLTV műsorújság címe (.xml vagy .xml.gz):'));
      if (!url) return;
      s.epgSources.unshift({ url, name: url.replace(/^https?:\/\//, '').slice(0, 60), enabled: true });
      store.save();
      renderSettings(view);
      epg.load().then(() => location.hash.startsWith('#/settings') && renderSettings(view));
    } else if (b.dataset.epgDel !== undefined) {
      s.epgSources.splice(Number(b.dataset.epgDel), 1);
      store.save();
      renderSettings(view);
      epg.load();
    } else if (act === 'epg-reload') {
      b.disabled = true;
      b.textContent = _t('Frissítés…');
      await epg.load({ force: true });
      if (location.hash.startsWith('#/settings')) renderSettings(view);
    } else if (act === 'export') {
      const data = await attachDocs(JSON.parse(JSON.stringify(store.serialize())));
      delete data.health;
      const ok = await api.saveFile(`adas-mentes-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(data, null, 2));
      if (ok) toast(_t('Mentés elkészült'));
    } else if (act === 'import') {
      const f = await api.openFile([{ name: _t('Adás mentés'), extensions: ['json'] }]);
      if (!f) return;
      try {
        const data = JSON.parse(f.text);
        if (!data.settings || !Array.isArray(data.profiles)) throw new Error(_t('hibás formátum'));
        if (!(await confirmDialog(_t('A visszaállítás felülírja a jelenlegi beállításokat és profilokat. Folytatod?'), { ok: _t('Visszaállítás'), danger: true }))) return;
        await restoreDocs(data);
        await store.replaceAll({ ...data, health: store.health });
        location.reload();
      } catch (err) {
        toast(`${_t('Nem sikerült beolvasni a mentést:')} ` + err.message);
      }
    } else if (act === 'notify-perm') {
      api.notifyPermission?.();
    } else if (act === 'import-profiles') {
      const f = await api.openFile([{ name: _t('Adás mentés'), extensions: ['json'] }]);
      if (!f) return;
      try {
        const data = JSON.parse(f.text);
        data.app ||= 'adas';
        await importData(data, f.name, { profilesOnly: true });
      } catch (err) {
        toast(`${_t('Nem sikerült beolvasni a mentést:')} ` + err.message);
      }
    } else if (act === 'clear-cache') {
      await api.clearCache();
      toast(_t('A gyorsítótár törölve. A következő indításkor minden friss adat letöltődik.'));
    }
  };
}

// ---------------------------------------------------------------------------
// A beállítások csoportjai: csempés kezdőlap vagy fülek (settings.settingsView), keresővel.
// A részek mind kirajzolódnak (így minden kezelőjük működik), a csoportváltás csak elrejti a többit.
// ---------------------------------------------------------------------------
// [azonosító, ikon, név, rövid (legfeljebb kétmondatos) leírás: mit talál itt a felhasználó]
const SET_GROUPS = [
  ['look', '🎨', _t('Megjelenés'), _t('A felület stílusa, a saját témák és a TV oldal sorainak sorrendje. Itt adhatod meg azt is, mennyire legyenek kiemelve az elemek.')],
  ['home', '🏠', _t('Főoldal'), _t('A Főoldal csempéi: melyik látsszon, mekkora legyen, és mit mutasson. Itt állíthatod be az időjárás városát és a hírforrásokat is.')],
  ['play', '▶️', _t('Lejátszás@@beállítás'), _t('Hogyan induljanak és szóljanak az adások: tartalék forrás, minőség, lejátszómotor, hangerő. Itt választhatod ki azt is, mely gombok látszanak a lejátszóban.')],
  ['subs', '💬', _t('Feliratok és információk'), _t('Feliratforrások (Feliratok.eu, OpenSubtitles, SubDL), a felirat nyelve és kinézete, a kedvenc hangsáv. A filmek és sorozatok magyar leírásai és borítóképei is innen jönnek.')],
  ['rec', '⏺', _t('Felvételek'), _t('Hová kerüljenek a felvételek, és mennyivel előbb kezdődjenek, illetve később érjenek véget a műsornál. Itt látod a legutóbbi felvételeidet is.')],
  ['tvlists', '📺', _t('Csatornalisták'), _t('A tévécsatornák forrásai: beépített és saját lejátszólisták, saját csatornák. Itt ellenőrizheted azt is, mely adások élnek.')],
  ['vod', '🎬', _t('VOD és médiatár'), _t('Film- és sorozatlisták, kiegészítő csomagok és a saját (NAS-) médiatár mappái. Itt rendezheted a VOD oldal sorait is.')],
  ['epg', '🗓️', _t('Műsorújság'), _t('A műsorújság forrásai és a frissítésük gyakorisága. Itt látod azt is, melyik forrás hány csatornát fed le.')],
  ['kids', '👪', _t('Tartalom és gyerekek'), _t('A hazai ország, a felnőtt tartalom és a nyelvek. Itt állíthatod be, mit nézhetnek a gyerekprofilok.')],
  ['notify', '🔔', _t('Értesítések'), _t('Emlékeztetők a kedvenc műsoraidra, automatikus átkapcsolás. Itt dől el az is, hogy az Adás a háttérben fusson-e.')],
  ['remote', '📱', _t('Távirányító és billentyűk'), _t('A telefon távirányítóként (QR-kóddal csatlakozik). Itt találod a billentyűzet és a tévé-távirányító gombjait is.')],
  ['sync', '🔄', _t('Szinkron eszközök között'), _t('Beállítások, profilok és listák átvitele egy másik eszközre a helyi hálózaton, egy hatjegyű kóddal.')],
  ['data', '💾', _t('Profilok és mentés'), _t('A profilok kezelése, mentés fájlba és visszaállítás. Itt vannak az automatikus napi mentések is.')],
  ['update', '⬆️', _t('Frissítés'), _t('Új verzió keresése és telepítése a GitHubról. Itt kapcsolhatod ki azt is, hogy induláskor keressen frissítést.')],
  ['about', 'ℹ️', _t('Névjegy'), _t('A verzió, az adatmappa helye és az adatforrások.')],
];
let refocusSetTab = false;
/** A beállítások csoportnavigációja (csempék / fülek), kereső, kártyás elrendezés. */
function settingsNav(view) {
  const nav = $('.set-nav', view);
  const params = new URLSearchParams(location.hash.split('?')[1] || '');
  // Androidon csak csempék: a fülsor a keskeny képernyőn kilógott, görgetni kellett
  const mode = IS_ANDROID || store.settings.settingsView === 'tiles' ? 'tiles' : 'tabs';
  const sections = [...view.querySelectorAll('.set-section[data-g]')].filter((s) => !s.hasAttribute('data-off'));
  const groups = SET_GROUPS.filter(([id]) => sections.some((s) => s.dataset.g === id));
  const label = Object.fromEntries(groups.map(([id, ico, name]) => [id, `${ico} ${name}`]));
  for (const s of sections) s.dataset.glabel = label[s.dataset.g] || '';
  view.querySelectorAll('.set-section[data-off]').forEach((s) => (s.hidden = true));
  // #/settings?section=lists → a rész csoportja, és odagörgetünk
  const sec = params.get('section');
  const secEl = sec && $(`#${CSS.escape(sec)}`, view);
  let g = params.get('g') || secEl?.dataset.g || '';
  if (!groups.some(([id]) => id === g)) g = mode === 'tabs' ? groups[0]?.[0] : '';
  const hub = mode === 'tiles' && !g;
  const go = (id, replace) => {
    const h = '#/settings' + (id ? '?g=' + id : '');
    replace ? location.replace(h) : (location.hash = h);
  };
  // Nézetváltó a fejlécben (Androidon nincs)
  if (!IS_ANDROID) $('.set-head', view).insertAdjacentHTML(
    'beforeend',
    `<div class="seg set-view" role="group" aria-label="${_t('Elrendezés')}"><button class="tab ${mode === 'tiles' ? 'active' : ''}" data-sv="tiles" title="${_t('Csempés kezdőlap')}">${_t('▦ Csempék')}</button><button class="tab ${mode === 'tabs' ? 'active' : ''}" data-sv="tabs" title="${_t('Fülek')}">${_t('☰ Fülek')}</button></div>`
  );
  nav.innerHTML = `<input class="input set-search" type="search" placeholder="${_t('Keresés a beállításokban…')}" title="${_t('pl. felirat, téma, szinkron')}" aria-label="${_t('Keresés a beállítások között')}" />
    ${hub
        ? `<div class="set-tiles">${groups
            .map(([id, ico, name, desc]) => `<a class="set-tile" href="#/settings?g=${id}"><span class="st-ico">${ico}</span><b>${esc(name)}</b><small>${esc(desc)}</small></a>`)
            .join('')}</div>`
        : mode === 'tabs'
          ? `<div class="tabs set-tabs" role="tablist">${groups.map(([id, ico, name]) => `<button class="tab ${id === g ? 'active' : ''}" role="tab" aria-selected="${id === g}" data-sg="${id}">${ico} ${esc(name)}</button>`).join('')}</div>`
          : `<div class="set-crumb"><a class="btn small" href="#/settings">${_t('‹ Minden beállítás')}</a><h2>${label[g] || ''}</h2></div>`}
    <p class="muted set-noresult" hidden>${_t('Nincs ilyen beállítás. Próbálj más szót, vagy nézd meg a')} <a href="#/help">${_t('Súgót')}</a>.</p>`;
  const show = () => {
    for (const s of sections) s.hidden = hub || s.dataset.g !== g;
  };
  show();
  // a kiválasztott fül látszódjon a vízszintesen görgethető sorban (telefonon)
  const at = nav.querySelector('.set-tabs .active');
  if (at && refocusSetTab) {
    refocusSetTab = false;
    at.focus({ preventScroll: true });
  }
  if (at) at.parentElement.scrollLeft = at.offsetLeft - (at.parentElement.clientWidth - at.offsetWidth) / 2;
  const page = $('.page.settings', view);
  page.classList.toggle('set-hub', hub);
  page.classList.add(mode === 'tabs' ? 'set-mode-tabs' : 'set-mode-tiles');
  // A részek egy közös tárolóba kerülnek: széles képernyőn kártyákként, két oszlopban rendeződnek
  // (a DOM-ban áthelyezve – az eseménykezelők megmaradnak)
  const body = document.createElement('div');
  body.className = 'set-body';
  nav.after(body);
  for (const s of view.querySelectorAll('.page.settings > .set-section')) body.append(s);
  // a csoport rövid leírása a részek fölött: mit talál itt a felhasználó
  const gdesc = !hub && g && groups.find(([id]) => id === g)?.[3];
  if (gdesc) body.insertAdjacentHTML('afterbegin', `<p class="set-gdesc">${esc(gdesc)}</p>`);
  if (secEl && !hub) requestAnimationFrame(() => secEl.scrollIntoView({ block: 'start' }));
  const search = nav.querySelector('.set-search');
  const parts = [...nav.children].filter((el) => !el.matches('.set-search, .set-noresult'));
  search.addEventListener(
    'input',
    debounce(() => {
      const q = norm(search.value.trim());
      page.classList.toggle('set-searching', !!q);
      parts.forEach((el) => (el.hidden = !!q));
      view.querySelectorAll('.setting.hit, .src-list li.hit').forEach((el) => el.classList.remove('hit'));
      if (!q) {
        show();
        nav.querySelector('.set-noresult').hidden = true;
        return;
      }
      const words = q.split(/\s+/);
      let n = 0;
      for (const s of sections) {
        const ok = words.every((w) => norm(s.textContent + ' ' + s.dataset.glabel).includes(w));
        s.hidden = !ok;
        if (!ok) continue;
        n++;
        s.querySelectorAll('.setting, .src-list li').forEach((el) => words.every((w) => norm(el.textContent).includes(w)) && el.classList.add('hit'));
      }
      nav.querySelector('.set-noresult').hidden = n > 0;
    }, 150)
  );
  nav.addEventListener('click', (e) => {
    const t = e.target.closest('[data-sg]');
    if (t) {
      refocusSetTab = true; // az újrarajzolás után a kijelölés az új aktív fülre áll vissza
      go(t.dataset.sg, true);
    }
  });
  $('.set-view', view)?.addEventListener('click', (e) => {
    const b = e.target.closest('[data-sv]');
    if (!b || b.dataset.sv === mode) return;
    store.set('settingsView', b.dataset.sv);
    renderSettings(view);
  });
}

// ---------------------------------------------------------------------------
// Megjelenés: felületstílus és a főoldali sorok sorrendje (az aktív profilhoz kötve)
// ---------------------------------------------------------------------------
function renderAppearance(box) {
  const p = store.profile;
  const theme = currentTheme();

  box.innerHTML = `<h2>${_t('Megjelenés')} <span class="muted small">${_t('· {esc} profil', { esc: esc(p.name) })}</span> <button class="help-link" data-help="themes" title="${_t('Súgó')}">?</button></h2>
    <p class="muted">${_t('Ezek a beállítások csak az aktuális profilra vonatkoznak.')}</p>
    <label class="setting"><span>${_t('<b>Felület stílusa</b>')}<small class="theme-desc">${esc(THEMES[theme].desc)}</small></span>
      <select data-theme-select>${Object.entries(THEMES)
        .map(([id, t]) => `<option value="${id}" ${id === theme ? 'selected' : ''}>${esc(t.label)}</option>`)
        .join('')}</select></label>
    <div class="theme-swatches">${Object.keys(THEMES)
      .map((id) => { const cp = THEMES[id].custom?.preview || []; return `<button class="theme-swatch ${id === theme ? 'sel' : ''} ${isLightColor(cp[0]) ? 'light' : ''}" data-theme-pick="${esc(id)}" data-preview="${esc(id)}" title="${esc(THEMES[id].label)}" ${cp[0] ? `style="background:${esc(cp[0])}"` : ''}><i ${cp[1] ? `style="background:${esc(cp[1])}"` : ''}></i><i ${cp[2] ? `style="background:${esc(cp[2])}"` : ''}></i><i></i><span>${esc(THEMES[id].label)}</span></button>`; })
      .join('')}</div>
    <div class="ct-box"></div>
    <h3>${_t('A TV oldal sorai')}</h3>
    <p class="muted">${_t('Húzással vagy a nyilakkal rendezheted, a kapcsolóval elrejtheted a sorokat.')}</p>
    <div class="tv-rows"></div>`;
  renderThemeTools(box.querySelector('.ct-box'), () => renderAppearance(box));

  rowOrderEditor(box.querySelector('.tv-rows'), {
    rows: profileRows(),
    label: rowLabel,
    defaults: defaultRows,
    onSave: (rows) => store.setProfileValue('rows', rows),
    resetMsg: _t('A TV oldal sorai visszaálltak az alapértelmezettre'),
  });

  const setTheme = (id) => {
    store.setProfileValue('theme', id);
    applyTheme();
    box.querySelector('[data-theme-select]').value = id;
    box.querySelector('.theme-desc').textContent = THEMES[id].desc;
    box.querySelectorAll('.theme-swatch').forEach((b) => b.classList.toggle('sel', b.dataset.themePick === id));
  };
  box.addEventListener('change', (e) => {
    if (e.target.matches('[data-theme-select]')) {
      e.stopPropagation();
      setTheme(e.target.value);
    }
  });
  box.addEventListener('click', (e) => {
    const pick = e.target.closest('[data-theme-pick]');
    if (pick) {
      e.stopPropagation();
      setTheme(pick.dataset.themePick);
    }
  });
}


bus.on('scan-progress', () => {
  if (location.hash.startsWith('#/settings')) {
    const v = document.getElementById('view');
    const sc = health.scanning;
    const bar = v.querySelector('.scan .progress i');
    if (sc && bar) {
      bar.style.width = ((sc.done / sc.total) * 100).toFixed(1) + '%';
      bar.parentElement.nextElementSibling.textContent = `${sc.done} / ${sc.total}`;
    }
  }
});

// ===========================================================================
// Profilok
// ===========================================================================
export function renderProfiles(root, { manage = false, onPick } = {}) {
  root.innerHTML = `<div class="profiles-inner">
    <div class="brand big">${_t('ADÁS')}</div>
    <h1>${manage ? _t('Profilok kezelése') : _t('Ki nézi?')}</h1>
    <div class="profile-list">
      ${store.profiles
        .map((p) => `<button class="profile" data-p="${esc(p.id)}">${avatarHtml(p, '', manage ? '<span class="edit">✎</span>' : hasPin(p) ? `<span class="lock" title="${_t('PIN-nel védett')}">🔒</span>` : '')}
          <span class="p-label">${esc(p.name)}${p.kids ? ` <span class="pill small">${_t('Gyerek')}</span>` : ''}</span></button>`)
        .join('')}
      ${manage ? `<button class="profile add" data-add><span class="avatar plus">${ICON.plus}</span><span class="p-label">${_t('Profil hozzáadása')}</span></button>` : ''}
    </div>
    <button class="btn outline" data-manage>${manage ? _t('Kész') : _t('Profilok kezelése')}</button>
  </div>`;
  root.querySelector('.profile')?.focus();
  root.onclick = async (e) => {
    const pb = e.target.closest('[data-p]');
    if (e.target.closest('[data-manage]')) {
      if (!manage && !(await requireAdult(_t('A profilok kezeléséhez')))) return;
      return renderProfiles(root, { manage: !manage, onPick });
    }
    if (e.target.closest('[data-add]')) return editProfile(null, () => renderProfiles(root, { manage, onPick }));
    if (!pb) return;
    const prof = store.profiles.find((p) => p.id === pb.dataset.p);
    if (manage) editProfile(prof, () => renderProfiles(root, { manage, onPick }));
    else onPick?.(prof);
  };
}

/**
 * Saját profilkép kiválasztása: a képet négyzetesre vágjuk (középről) és 256×256 pontra kicsinyítjük,
 * PNG-ként a profilban tároljuk (így a profil költöztetésével a kép is átkerül).
 */
function pickAvatarImage() {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp';
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return resolve(null);
      avatarFromFile(file).then(resolve, reject);
    };
    input.click();
  });
}

/** Képfájl → 256×256-os, középre vágott PNG (data: URL). */
export function avatarFromFile(file) {
  return new Promise((resolve, reject) => {
    if (file.size > 15 * 1024 * 1024) return reject(new Error(_t('a fájl túl nagy (legfeljebb 15 MB)')));
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const S = 256;
      const side = Math.min(img.naturalWidth, img.naturalHeight);
      const c = document.createElement('canvas');
      c.width = c.height = S;
      const g = c.getContext('2d');
      g.imageSmoothingQuality = 'high';
      g.drawImage(img, (img.naturalWidth - side) / 2, (img.naturalHeight - side) / 2, side, side, 0, 0, S, S);
      URL.revokeObjectURL(url);
      let data = c.toDataURL('image/png');
      // Nagyon részletes fotónál a PNG túl nagy lenne a tévék szűkös tárhelyéhez: ilyenkor JPEG.
      if (data.length > 220000) data = c.toDataURL('image/jpeg', 0.88);
      resolve(data);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error(_t('nem kép, vagy nem támogatott formátum')));
    };
    img.src = url;
  });
}

/** Az avatárok sorrendje a szerkesztőben: a kiválasztott elöl, a többi véletlenszerűen (minden megnyitáskor más). */
function avatarOrder(selected) {
  const rest = Array.from({ length: AVATAR_COUNT }, (_, i) => i).filter((i) => i !== selected);
  for (let i = rest.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [rest[i], rest[j]] = [rest[j], rest[i]];
  }
  return Number.isInteger(selected) ? [selected, ...rest] : rest;
}

/**
 * Profilkép-választó (a profilszerkesztő és az első indítás varázslója közös része): két sornyi
 * véletlen sorrendű avatár („Több…” gombbal a többi), betűs változat, saját kép feltöltése.
 * → { el, value() → { avatar, avatarData }, setColor(c), setName(n) }
 */
export function avatarPicker({ avatar = null, avatarData = '', color = PROFILE_COLORS[0], name = '' } = {}) {
  avatarData = safeImgData(avatarData);
  const el = html(`<div class="avatar-picker">
    <div class="avatar-grid">
      <button type="button" class="avatar-opt custom ${avatar === 'custom' ? 'sel' : ''}" data-av="custom" ${avatarData ? `style="background-image:url('${esc(avatarData)}')"` : 'hidden'} aria-label="${_t('Saját kép')}"></button>
      <button type="button" class="avatar-opt letter ${avatar === null ? 'sel' : ''}" data-av="" style="background-color:${esc(color)}" aria-label="${_t('Betű, kép nélkül')}">${esc((name || 'A').slice(0, 1).toUpperCase())}</button>
      ${avatarOrder(avatar).map((i) => `<button type="button" class="avatar-opt ${i === avatar ? 'sel' : ''}" data-av="${i}" style="background-image:url('${avatarUrl(i)}')" aria-label="${_t('{x}. profilkép', { x: i + 1 })}"></button>`).join('')}</div>
    <button type="button" class="btn small avatar-more" hidden></button>
    ${api.caps.files ? `<div class="inline"><button type="button" class="btn small" data-upload>${_t('Saját kép feltöltése…')}</button><span class="muted small">${_t('PNG (vagy JPG, WebP) – négyzetesre vágjuk, 256×256 pontra kicsinyítjük.')}</span></div>` : ''}
  </div>`);
  // Alapból csak két sornyi avatár látszik (a többi a „Több…” gombbal nyílik le)
  const grid = el.querySelector('.avatar-grid');
  const more = el.querySelector('.avatar-more');
  const fold = () => {
    if (!grid.isConnected) return requestAnimationFrame(fold); // a méret csak a lapra kerülés után ismert
    const cols = getComputedStyle(grid).gridTemplateColumns.split(' ').filter(Boolean).length || 6;
    const tiles = [...grid.querySelectorAll('.avatar-opt')].filter((b) => !b.hidden);
    tiles.forEach((b, i) => b.classList.toggle('extra', i >= cols * 2));
    const rest = tiles.length - cols * 2;
    more.hidden = rest <= 0;
    more.textContent = `${_t('Több… (még {rest})', { rest })}`;
  };
  requestAnimationFrame(fold);
  more.onclick = () => {
    grid.classList.add('open');
    more.hidden = true;
  };
  const pick = (b) => {
    const v = b.dataset.av;
    avatar = v === '' ? null : v === 'custom' ? 'custom' : Number(v);
    el.querySelectorAll('.avatar-opt').forEach((x) => x.classList.toggle('sel', x === b));
  };
  grid.onclick = (e) => {
    const b = e.target.closest('[data-av]');
    if (b) pick(b);
  };
  el.querySelector('[data-upload]')?.addEventListener('click', async () => {
    try {
      const data = await pickAvatarImage();
      if (!data) return;
      avatarData = data;
      const tile = el.querySelector('.avatar-opt.custom');
      tile.hidden = false;
      tile.style.backgroundImage = `url('${data}')`;
      pick(tile);
      if (!grid.classList.contains('open')) fold(); // a saját kép is a két sorba kerül
    } catch (err) {
      toast(`${_t('A kép nem olvasható be:')} ` + (err.message || err));
    }
  });
  return {
    el,
    value: () => ({ avatar, avatarData: avatar === 'custom' ? avatarData : '' }),
    setColor: (c) => (el.querySelector('.avatar-opt.letter').style.backgroundColor = c),
    setName: (n) => (el.querySelector('.avatar-opt.letter').textContent = (String(n || '').trim() || 'A').slice(0, 1).toUpperCase()),
  };
}

function editProfile(prof, done) {
  const isNew = !prof;
  let color = prof?.color || PROFILE_COLORS[store.profiles.length % PROFILE_COLORS.length];
  const picker = avatarPicker({
    avatar: prof ? (Number.isInteger(prof.avatar) || prof.avatar === 'custom' ? prof.avatar : null) : store.profiles.length % AVATAR_COUNT,
    avatarData: prof?.avatarData,
    color,
    name: prof?.name || '',
  });
  const el = html(`<form class="dialog profile-edit">
    <h2>${isNew ? _t('Új profil') : _t('Profil szerkesztése')}</h2>
    <label>${_t('Név')}<input class="input" name="name" value="${esc(prof?.name || '')}" maxlength="20" required autofocus /></label>
    <div>${_t('<b>Profilkép</b>')}</div>
    <div class="avatar-slot"></div>
    <div>${_t('<b>Szín</b>')} <small class="muted">${_t('(a betűs profilképhez és a kiemelésekhez)')}</small></div>
    <div class="swatches">${PROFILE_COLORS.map((c) => `<button type="button" class="swatch ${c === color ? 'sel' : ''}" data-c="${c}" style="background:${c}" aria-label="${_t('Szín')}"></button>`).join('')}</div>
    <label class="setting"><span>${_t('<b>Gyerekprofil</b>')}<small>${_t('Csak gyerek-, családi, animációs és oktatási csatornák.')}</small></span>
      <input type="checkbox" class="switch" name="kids" ${prof?.kids ? 'checked' : ''} /></label>
    <div class="setting"><span>${_t('<b>Profilzár (PIN-kód)</b>')}<small class="pin-state"></small></span>
      <span class="inline"><button type="button" class="btn small" data-pin="set"></button><button type="button" class="btn small" data-pin="clear">${_t('PIN törlése')}</button></span></div>
    <p class="muted small">${_t('Ha egy felnőtt profilnak van PIN-kódja, a gyerekprofilból csak azzal lehet másik profilra váltani, a beállításokat és a profilokat módosítani.')}</p>
    <div class="dialog-btns"><button class="btn primary" type="submit">${_t('Mentés')}</button>
      ${!isNew && store.profiles.length > 1 ? `<button class="btn danger" type="button" data-del>${_t('Profil törlése')}</button>` : ''}</div>
  </form>`);
  el.querySelector('.avatar-slot').replaceWith(picker.el);
  const close = openModal(el, { cls: 'medium' });
  // PIN: mentéskor érvényesül. undefined = nem változik, null = törlés, '1234' = új
  let newPin;
  const pinState = () => {
    const on = newPin === undefined ? hasPin(prof) : !!newPin;
    el.querySelector('.pin-state').textContent = on
      ? _t('Be van állítva: a profil megnyitásához meg kell adni.')
      : _t('Nincs beállítva: a profil PIN nélkül megnyitható.');
    el.querySelector('[data-pin="set"]').textContent = on ? _t('PIN módosítása') : _t('PIN beállítása');
    el.querySelector('[data-pin="clear"]').hidden = !on;
  };
  pinState();
  el.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-pin]');
    if (!b) return;
    if (b.dataset.pin === 'clear') newPin = null;
    else {
      const pin = await choosePin(el.elements.namedItem('name').value.trim() || prof?.name || _t('Új profil'));
      if (!pin) return;
      newPin = pin;
    }
    pinState();
  });
  el.querySelector('.swatches').onclick = (e) => {
    const sw = e.target.closest('[data-c]');
    if (!sw) return;
    color = sw.dataset.c;
    el.querySelectorAll('.swatch').forEach((x) => x.classList.toggle('sel', x === sw));
    picker.setColor(color);
  };
  el.elements.namedItem('name').addEventListener('input', (e) => picker.setName(e.target.value));
  el.onsubmit = (e) => {
    e.preventDefault();
    const name = el.elements.namedItem('name').value.trim() || _t('Profil');
    const kids = el.elements.namedItem('kids').checked;
    const { avatar, avatarData } = picker.value();
    const target = isNew ? store.addProfile(name, color, kids, avatar) : Object.assign(prof, { name, color, kids, avatar });
    // A saját kép csak akkor marad meg, ha az van kiválasztva (ne foglaljon fölöslegesen helyet).
    target.avatarData = avatarData;
    if (newPin !== undefined) setPin(target, newPin);
    store.save();
    bus.emit('profile');
    close();
    done();
  };
  el.querySelector('[data-del]')?.addEventListener('click', async () => {
    if (!(await confirmDialog(`${_t('Törlöd a(z) „{name}” profilt a kedvenceivel együtt?', { name: prof.name })}`, { ok: _t('Törlés'), danger: true }))) return;
    store.removeProfile(prof.id);
    bus.emit('profile');
    close();
    done();
  });
}
