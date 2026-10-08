// Nézetek: főoldal, böngészés, kedvencek, keresés, műsorújság, beállítások, profilok.
import { $, $$, esc, html, norm, hashHue, fmtTime, fmtDay, dayStart, dayLabel, toast, bus, seededShuffle, debounce } from './util.js';
import { api, IS_TV, IS_ANDROID } from './api.js';
import { store, BUILTIN_EPG, PROFILE_COLORS, DEFAULT_PLAYLIST, BUILTIN_PLAYLISTS, AVATAR_COUNT, avatarUrl } from './store.js';
import { epg } from './epg.js';
import { health } from './health.js';
import {
  catalog, visible, getChannels, search, countryName, countryFlag, categoryName, rankScore, loadCatalog,
  KIDS_CATEGORIES, channelStatus, bestQuality, MINE, activeLists, homeRank, homeFirst, COUNTRY_LANG, geoState,
} from './catalog.js';
import {
  ICON, rowEl, gridEl, cardHtml, registerContext, openInfo, openProgram, openModal, confirmDialog, promptDialog,
  logoHtml, emptyState, avatarHtml, rowTitleHtml, seeAllHtml, rowOrderEditor,
} from './components.js';
import { player, startPreview, stopPreview } from './player.js';
import { THEMES, currentTheme, applyTheme, profileRows, defaultRows, rowLabel } from './themes.js';
import { renderLists } from './lists.js';
import { renderVodLists, renderOwnLists, searchVod, vcardHtml, vod } from './vod.js';
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

const daySeed = () => Math.floor(Date.now() / 86400e3);

/** Sorrend: hazai, majd hazai nyelvű csatornák elöl, azon belül működő / logós / HD, napi változatossággal. */
function popular(list) {
  const jitter = new Map(seededShuffle(list.map((c) => c.id), daySeed()).map((id, i) => [id, (i % 17) / 17]));
  return list
    .map((c) => [c, homeRank(c) * 1000 + rankScore(c) + jitter.get(c.id) * 25])
    .sort((a, b) => b[1] - a[1])
    .map((x) => x[0]);
}

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
let heroTimer = null;

/** A TV oldal: a csatornák sorai (a korábbi főoldal). */
export function renderTv(view) {
  const s = store.settings;
  const p = store.profile;
  const vis = visible();
  const visSet = new Set(vis);
  if (!vis.length) {
    view.innerHTML = emptyState('Nincs megjeleníthető csatorna', 'Ellenőrizd a beállításokat vagy a profil szűrőit.', '<a class="btn primary" href="#/settings">Beállítások</a>');
    return;
  }

  const favs = getChannels(p.favorites).filter((c) => visSet.has(c));
  const recent = getChannels(p.recent).filter((c) => visSet.has(c));
  const home = vis.filter((c) => c.country === s.homeCountry);

  // --- kiemelt sáv (egy csatorna, vagy lapozó több csatornával)
  let pool = [...favs, ...home].filter((c) => c.logo && channelStatus(c) !== 'bad' && epg.now(c.id)?.cur);
  if (pool.length < 6) pool = [...new Set([...pool, ...popular(home.length ? home : vis).filter((c) => c.logo).slice(0, 20)])];
  if (!pool.length) pool = vis.slice(0, 20);
  const heroes = seededShuffle([...new Set(pool)].slice(0, 24), Date.now() & 0xffff).slice(0, 6);

  view.innerHTML = '';
  view.append(heroEl(heroes));

  // --- sorok a profil beállított sorrendjében
  const rows = html('<div class="rows"></div>');
  view.append(rows);
  const onAir = vis.filter((c) => epg.now(c.id)?.cur);
  const favSet = new Set(p.favorites);
  onAir.sort((a, b) => (favSet.has(b.id) - favSet.has(a.id)) || (homeRank(b) - homeRank(a)) || rankScore(b) - rankScore(a));

  const builders = {
    recent: () => recent.length && rowEl('Legutóbb nézett', recent, { href: '#/favorites' }),
    favorites: () =>
      favs.length
        ? rowEl('Kedvenceid', favs, { href: '#/favorites' })
        : html(`<section class="row tip"><p>Tipp: ${
            IS_TV
              ? 'egy csatornán állva a távirányító <b>piros</b> gombjával'
              : 'a csatornák kártyáján a <b>+</b> gombbal vagy az <b>F</b> billentyűvel'
          } kedvencet jelölhetsz. A kedvencek sorrendje adja a csatornaszámokat is.</p></section>`),
    onair: () => onAir.length && rowEl('Most a TV-ben', onAir, { href: '#/guide' }),
    home: () => home.length && !p.kids && rowEl(rowLabel('home'), popular(home), { href: `#/browse?country=${s.homeCountry}` }),
    custom: () => {
      const group = html('<div class="row-group"></div>');
      const mine = vis.filter((c) => c.lists?.includes(MINE));
      if (mine.length) group.append(rowEl('Saját csatornák', mine, { href: `#/browse?pl=${MINE}` }));
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

function heroSlide(ch, i) {
  const now = epg.now(ch.id);
  return `<div class="hero-slide ${i === 0 ? 'active' : ''}" data-i="${i}" data-id="${esc(ch.id)}" style="--h:${hashHue(ch.name)}" ${i ? 'aria-hidden="true"' : ''}>
    <div class="hero-bg">${ch.logo ? `<img src="${esc(ch.logo)}" alt="" referrerpolicy="no-referrer" />` : ''}</div>
    <div class="hero-shade"></div>
    <div class="hero-content">
      <div class="hero-logo">${logoHtml(ch)}</div>
      <h1>${esc(ch.name)}</h1>
      <div class="hero-meta">${countryFlag(ch.country)} ${esc(countryName(ch.country))} · ${ch.categories.map((c) => esc(categoryName(c))).join(', ')}</div>
      ${now?.cur ? `<div class="hero-now"><span class="now-label">MOST</span> <b>${esc(now.cur.title)}</b> <span class="muted">${fmtTime(now.cur.start)}–${fmtTime(now.cur.stop)}</span></div>
        ${now.cur.desc ? `<p class="hero-desc">${esc(now.cur.desc.slice(0, 260))}${now.cur.desc.length > 260 ? '…' : ''}</p>` : ''}` : ''}
      <div class="hero-btns">
        <button class="btn white big" data-h="play">${ICON.play} Lejátszás</button>
        <button class="btn gray big" data-h="info">${ICON.info} További információk</button>
      </div>
    </div>
  </div>`;
}

function heroEl(heroes) {
  const multi = heroes.length > 1;
  const el = html(`<section class="hero ${multi ? 'carousel' : ''}">
    <div class="hero-slides">${heroes.map(heroSlide).join('')}</div>
    ${
      multi
        ? `<button class="hero-arrow left" data-go="-1" aria-label="Előző" tabindex="-1">${ICON.left}</button>
           <button class="hero-arrow right" data-go="1" aria-label="Következő" tabindex="-1">${ICON.right}</button>
           <div class="hero-dots">${heroes.map((_, i) => `<button class="dot ${i ? '' : 'active'}" data-dot="${i}" aria-label="${i + 1}. kiemelt" tabindex="-1"></button>`).join('')}</div>`
        : ''
    }
  </section>`);
  let cur = 0;
  const slides = [...el.querySelectorAll('.hero-slide')];
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
  let previewTimer = null;
  const schedulePreview = () => {
    stopPreview();
    clearTimeout(previewTimer);
    if (!api.caps.preview) return;
    previewTimer = setTimeout(() => {
      if (location.hash.startsWith('#/tv') && document.body.contains(el)) startPreview(slides[cur].querySelector('.hero-bg'), heroes[cur]);
    }, 1500);
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
  // Lapozás a kiemelt sáv gombjain állva balra/jobbra nyíllal (távirányító).
  el.addEventListener('keydown', (e) => {
    if (!multi || !e.target.closest('.hero-btns')) return;
    // Az utolsó gombon jobbra: következő kiemelt; az első gombon balra: előző (az elsőn a menübe lép tovább).
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
      if (!document.body.contains(el)) return clearInterval(heroTimer);
      if (el.matches(':hover') || el.contains(document.activeElement) || player.active) return;
      show(cur + 1);
    }, 12000);
  }
  schedulePreview();
  return el;
}

/** Országlista: a beállított ország legelöl, a többi sorrendje marad. */
const homeCountryFirst = (list) => list.slice().sort((a, b) => (b.code === store.settings.homeCountry) - (a.code === store.settings.homeCountry));

function countryTiles() {
  const list = homeCountryFirst([...catalog.countries.values()].filter((c) => c.count > 0).sort((a, b) => b.count - a.count)).slice(0, 40);
  const total = [...catalog.countries.values()].filter((c) => c.count > 0).length;
  const el = html(`<section class="row">${rowTitleHtml('Fedezz fel országokat', '#/countries', total)}
    <div class="row-wrap"><div class="row-track tiles">${list
      .map((c) => `<a class="tile" href="#/browse?country=${esc(c.code)}" style="--h:${hashHue(c.code)}"><span class="flag">${countryFlag(c.code) || `<span class="cc">${esc(c.code)}</span>`}</span><b>${esc(c.name)}</b><small>${c.count} csatorna</small></a>`)
      .join('')}${seeAllHtml('#/countries', total)}</div></div></section>`);
  return el;
}

function categoryTiles(vis) {
  const cats = [...catalog.categories.values()]
    .filter((c) => vis.some((ch) => ch.categories.includes(c.id)))
    .sort((a, b) => b.count - a.count);
  return html(`<section class="row">${rowTitleHtml('Kategóriák', '#/browse', 0)}
    <div class="row-wrap"><div class="row-track tiles">${cats
      .map((c) => `<a class="tile cat" href="#/browse?cat=${esc(c.id)}" style="--h:${hashHue(c.id + 'x')}"><b>${esc(c.name)}</b><small>${c.count} csatorna</small></a>`)
      .join('')}${seeAllHtml('#/browse', 0)}</div></div></section>`);
}

/** Az összes ország egy oldalon (a hazai legelöl, utána csatornaszám szerint). */
export function renderCountries(view) {
  const vis = visible();
  const count = new Map();
  for (const c of vis) count.set(c.country, (count.get(c.country) || 0) + 1);
  const list = homeCountryFirst([...catalog.countries.values()].filter((c) => count.get(c.code)).sort((a, b) => count.get(b.code) - count.get(a.code)));
  view.innerHTML = `<div class="page">
    <div class="page-head"><h1>Országok</h1><span class="muted">${list.length} ország</span></div>
    <div class="tile-grid">${list
      .map((c) => `<a class="tile" href="#/browse?country=${esc(c.code)}" style="--h:${hashHue(c.code)}"><span class="flag">${countryFlag(c.code) || `<span class="cc">${esc(c.code)}</span>`}</span><b>${esc(c.name)}</b><small>${count.get(c.code)} csatorna</small></a>`)
      .join('')}</div>
  </div>`;
}

export function leaveHome() {
  clearInterval(heroTimer);
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
  const countries = homeCountryFirst([...catalog.countries.values()].filter((c) => c.count).sort((a, b) => a.name.localeCompare(b.name, 'hu')));
  const cats = [...catalog.categories.values()].sort((a, b) => a.name.localeCompare(b.name, 'hu'));
  const homeLang = COUNTRY_LANG[store.settings.homeCountry];
  const langs = [...catalog.languages.values()]
    .filter((l) => l.count >= 3)
    .sort((a, b) => (b.code === homeLang) - (a.code === homeLang) || a.name.localeCompare(b.name, 'hu'));

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
  if (f.sort === 'popular') list = popular(list);
  else if (f.sort === 'country')
    list = homeFirst(list.slice().sort((a, b) => countryName(a.country).localeCompare(countryName(b.country), 'hu') || a.name.localeCompare(b.name, 'hu')));
  // 'name': a látható lista már így rendezett: hazaiak elöl, azon belül név szerint

  const titleParts = [f.cat && categoryName(f.cat), f.country && countryName(f.country), f.lang && catalog.languages.get(f.lang)?.name].filter(Boolean);
  const plName = f.pl && (f.pl === MINE ? 'Saját csatornák' : [...BUILTIN_PLAYLISTS, ...store.settings.customPlaylists].find((x) => x.id === f.pl)?.name);
  const title = [plName || titleParts.join(' · '), f.q ? `„${f.q}”` : ''].filter(Boolean).join(' · ') || 'Minden csatorna';

  view.innerHTML = `<div class="page">
    <div class="page-head"><h1>${esc(title)}</h1><span class="muted">${list.length} csatorna</span></div>
    <form class="filters">
      <input class="input" name="q" type="search" placeholder="Keresés a csatornák között…" value="${esc(f.q)}" aria-label="Keresés" />
      <select name="cat" aria-label="Kategória">${opts(cats.map((c) => [c.id, `${c.name} (${c.count})`]), f.cat, 'Minden kategória')}</select>
      <select name="country" aria-label="Ország">${opts(countries.map((c) => [c.code, `${countryFlag(c.code)} ${c.name} (${c.count})`.trim()]), f.country, 'Minden ország')}</select>
      <select name="lang" aria-label="Nyelv">${opts(langs.map((l) => [l.code, `${l.name} (${l.count})`]), f.lang, 'Minden nyelv')}</select>
      <select name="quality" aria-label="Minőség">${opts([['720', 'HD vagy jobb'], ['1080', 'Full HD vagy jobb']], f.quality, 'Bármilyen minőség')}</select>
          <select name="geo" aria-label="Földrajzi korlát">${opts([['hide', 'Földrajzi korlát nélkül'], ['only', 'Csak a földrajzilag korlátozottak']], f.geo, 'Földrajzi korláttól függetlenül')}</select>
      ${health.available || Object.keys(store.health).length ? `<select name="status" aria-label="Állapot">${opts([['ok', 'Működő'], ['unknown', 'Nem ellenőrzött'], ['bad', 'Nem elérhető']], f.status, 'Bármilyen állapot')}</select>` : ''}
      <select name="sort" aria-label="Rendezés">
        <option value="popular" ${f.sort === 'popular' ? 'selected' : ''}>Ajánlott sorrend</option>
        <option value="name" ${f.sort === 'name' ? 'selected' : ''}>Név szerint</option>
        <option value="country" ${f.sort === 'country' ? 'selected' : ''}>Ország szerint</option>
      </select>
      ${Object.entries(f).some(([k, v]) => v && k !== 'sort') ? '<a class="btn small" href="#/browse">Szűrők törlése</a>' : ''}
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
    const catTiles = html(`<section class="row"><h2 class="row-title">Kategóriák</h2><div class="row-wrap"><div class="row-track tiles">${cats
      .filter((c) => vis.some((ch) => ch.categories.includes(c.id)))
      .map((c) => `<a class="tile cat" href="#/browse?cat=${esc(c.id)}" style="--h:${hashHue(c.id + 'x')}"><b>${esc(c.name)}</b><small>${c.count} csatorna</small></a>`)
      .join('')}</div></div></section>`);
    $('.browse-extra', view).append(catTiles, countryTiles());
  }
  page.append(gridEl(list, { title, empty: 'Nincs a szűrőknek megfelelő csatorna.' }));
}

// ===========================================================================
// Kedvencek
// ===========================================================================
export function renderFavorites(view) {
  const p = store.profile;
  const vis = new Set(visible());
  const favs = getChannels(p.favorites).filter((c) => vis.has(c));
  const recent = getChannels(p.recent).filter((c) => vis.has(c));
  const ctx = registerContext('Kedvencek', favs);
  view.innerHTML = `<div class="page">
    <div class="page-head"><h1>Kedvencek</h1><span class="muted">${favs.length} csatorna · a sorrend adja a csatornaszámokat; áthelyezés: húzással, ${IS_TV ? 'CH+ / CH− gombbal' : /Mac/.test(navigator.platform) ? '⌘← / ⌘→ billentyűvel' : 'Ctrl+← / Ctrl+→ billentyűvel'}</span></div>
    ${
      favs.length
        ? `<div class="grid fav-grid">${favs
            .map((c, i) => cardHtml(c, { context: ctx }).replace('<div class="card"', `<div class="card" draggable="true" data-num="${i + 1}"`))
            .join('')}</div>`
        : emptyState('Még nincsenek kedvenceid', 'A csatornák kártyáján a + gombbal, vagy kijelölve az F billentyűvel jelölhetsz kedvencet.', '<a class="btn primary" href="#/browse">Csatornák böngészése</a>')
    }
    ${recent.length ? `<div class="page-head sub"><h2>Legutóbb nézett</h2><button class="btn small" id="clear-recent">Előzmények törlése</button></div>` : ''}
  </div>`;
  const page = $('.page', view);
  if (recent.length) {
    page.append(gridEl(recent, { title: 'Legutóbb nézett' }));
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
    toast(`${catalog.byId.get(id)?.name || ''}: ${j + 1}. hely`);
  });
}

// ===========================================================================
// Keresés
// ===========================================================================
export function renderSearch(view, params) {
  const q = params.get('q') || '';
  const tokens = norm(q).split(/\s+/).filter(Boolean);
  if (!tokens.length) {
    view.innerHTML = `<div class="page">${emptyState('Keresés', 'Írd be egy csatorna, ország, kategória vagy műsor nevét.')}</div>`;
    return;
  }
  const chans = search(q);
  const vis = new Set(visible().map((c) => c.id));
  const progs = homeFirst(
    epg.searchPrograms(tokens).filter((x) => vis.has(x.channelId)),
    (x) => homeRank(catalog.byId.get(x.channelId))
  );
  const vodHits = searchVod(q);
  view.innerHTML = `<div class="page">
    <div class="page-head"><h1>Találatok: „${esc(q)}”</h1><span class="muted">${chans.length} csatorna${progs.length ? `, ${progs.length} műsor` : ''}</span></div>
    ${progs.length ? `<h2 class="section-title">Műsorok</h2><div class="prog-results"></div>` : ''}
    ${vodHits.length ? `<h2 class="section-title">VOD – filmek és sorozatok <a class="btn small" href="#/vod?type=all&amp;q=${encodeURIComponent(q)}">Mind (${vodHits.length})</a></h2><div class="vgrid vod-search">${vodHits.slice(0, 18).map(vcardHtml).join('')}</div>` : ''}
    ${chans.length ? `<h2 class="section-title">Csatornák <a class="btn small" href="#/browse?q=${encodeURIComponent(q)}">Szűrés ország, nyelv, kategória szerint ›</a></h2>` : ''}
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
          <span class="ph-text"><b>${esc(prog.title)}</b><small>${esc(ch.name)} · ${live ? '<span class="now-label">MOST</span>' : `${dayLabel(Math.round((dayStart(prog.start) - dayStart()) / 86400e3))} ${fmtTime(prog.start)}`}</small></span>
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
  if (chans.length) page.append(gridEl(chans, { title: `Keresés: ${q}` }));
  else if (!progs.length && !vodHits.length) page.append(html(`<div>${emptyState('Nincs találat', 'Próbálj rövidebb vagy más kifejezést.')}</div>`));
}

// ===========================================================================
// Műsorújság (idővonalas rács)
// ===========================================================================
const PX_PER_MIN = 4;
const guideState = { filter: 'fav', day: 0, cat: '', mode: 'grid' };
// Műsorkategóriák (az XMLTV kategória és a cím alapján)
const PROG_CATS = [
  ['film', 'Film', /film|movie|mozi/i],
  ['series', 'Sorozat', /sorozat|series|szappan|telenovella/i],
  ['sport', 'Sport', /sport|foci|labdar|futball|tenisz|forma[- ]?1|k[eé]zilabda|kos[aá]rlabda|meccs|olimpi|bajnoks/i],
  ['news', 'Hírek, közélet', /h[ií]r|news|h[ií]rad[oó]|k[oö]z[eé]let|politik|magazin/i],
  ['kids', 'Gyerek', /gyer(e|m)ek|mese|rajzfilm|anim|kids|child|cartoon/i],
  ['doc', 'Ismeretterjesztő', /dokument|ismeretterj|term[eé]szet|t[oö]rt[eé]nelem|tudom[aá]ny|documentary|nature/i],
  ['show', 'Szórakoztató', /show|sz[oó]rakoz|vet[eé]lked|reality|talk|kv[ií]z/i],
  ['music', 'Zene', /zene|music|koncert|klip/i],
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
        <button class="nc-ch" data-play="${esc(ch.id)}" title="${esc(ch.name)} lejátszása"><span class="g-logo" style="--h:${hashHue(ch.name)}">${logoHtml(ch, 'logo-sm')}</span><b>${esc(ch.name)}</b>${ICON.play}</button>
        ${
          cur
            ? `<button class="nc-prog" data-prog="${esc(ch.id)}|${cur.start}"><span class="now-label">MOST</span> <b>${esc(cur.title)}</b>
              <span class="bar"><i style="width:${(n.progress * 100).toFixed(1)}%"></i></span>
              <small class="muted">${fmtTime(cur.start)}–${fmtTime(cur.stop)}${cur.category ? ' · ' + esc(cur.category) : ''}</small></button>`
            : '<p class="muted small">Nincs műsoradat</p>'
        }
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

  view.innerHTML = `<div class="page guide-page">
    <div class="page-head"><h1>Műsorújság</h1><span class="muted">${fmtDay(from)}</span></div>
    <div class="guide-bar">
      <div class="tabs">
        <button class="tab ${guideState.filter === 'fav' ? 'active' : ''}" data-f="fav">Kedvencek</button>
        <button class="tab ${guideState.filter === 'home' ? 'active' : ''}" data-f="home">${esc(countryName(s.homeCountry))}</button>
        <button class="tab ${guideState.filter === 'all' ? 'active' : ''}" data-f="all">Minden csatorna</button>
      </div>
      <div class="tabs">${[-1, 0, 1, 2, 3]
        .map((d) => `<button class="tab ${d === guideState.day ? 'active' : ''}" data-d="${d}">${dayLabel(d)}</button>`)
        .join('')}</div>
      <button class="btn small" data-now>Ugrás most-ra</button>
      <select data-gcat aria-label="Műsorkategória"><option value="">Minden műsor</option>${PROG_CATS.map(([k, l]) => `<option value="${k}" ${guideState.cat === k ? 'selected' : ''}>${l}</option>`).join('')}</select>
      <div class="tabs"><button class="tab ${guideState.mode === 'grid' ? 'active' : ''}" data-gmode="grid">Idővonal</button><button class="tab ${guideState.mode === 'now' ? 'active' : ''}" data-gmode="now">Most műsoron</button></div>
    </div>
    ${
      epg.loading && !epg.byChannel.size
        ? `<div class="empty-state"><div class="spinner"></div><p>A műsorújság betöltése folyamatban…</p></div>`
        : !list.length
          ? emptyState('Nincs műsoradat', epg.byChannel.size ? (guideState.cat ? 'Ebben a nézetben nincs ilyen kategóriájú műsor.' : 'Ebben a nézetben nincs olyan csatorna, amelyhez műsorújság tartozik.') : 'A műsorújság még nem töltődött be, vagy egyik forrás sem érhető el. A beállításokban további forrásokat adhatsz meg.', '<a class="btn" href="#/settings">Beállítások</a>')
          : guideState.mode === 'now'
            ? nowGridHtml(list.slice(0, 120))
            : `<div class="guide-scroll"><div class="guide-inner" style="width:${width + 220}px">
          <div class="g-head"><div class="g-corner"></div><div class="g-times" style="width:${width}px">${Array.from({ length: 48 }, (_, i) => `<span style="left:${i * 30 * PX_PER_MIN}px">${fmtTime(from + i * 1800e3)}</span>`).join('')}</div></div>
          <div class="g-rows"></div>
          <div class="g-more" style="height:1px"></div>
          <div class="g-nowline" hidden></div>
        </div></div>`
    }
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
      .join('');
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
        .map((c) => `<div class="g-row" data-id="${esc(c.id)}"><button class="g-ch" data-play="${esc(c.id)}" title="${esc(c.name)} lejátszása"><span class="g-logo" style="--h:${hashHue(c.name)}">${logoHtml(c, 'logo-sm')}</span><span class="g-name">${esc(c.name)}</span></button><div class="g-progs" style="width:${width}px"></div></div>`)
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
  return { title: 'Műsorújság', ids: list.map((c) => c.id) };
}

// ===========================================================================
// Beállítások
// ===========================================================================
export function renderSettings(view) {
  const s = store.settings;
  const countries = [...catalog.countries.values()].filter((c) => c.count).sort((a, b) => a.name.localeCompare(b.name, 'hu'));
  const toggle = (key, label, desc = '') => `<label class="setting"><span><b>${label}</b>${desc ? `<small>${desc}</small>` : ''}</span>
    <input type="checkbox" class="switch" data-set="${key}" ${s[key] ? 'checked' : ''} /></label>`;
  const scan = health.scanning;
  const healthCount = Object.values(store.health);
  const okCount = healthCount.filter((h) => h[0]).length;

  view.innerHTML = `<div class="page settings">
    <div class="page-head set-head"><h1>Beállítások</h1></div>
    <div class="set-nav"></div>

    <section class="set-section appearance" id="appearance" data-g="look"></section>

    <section class="set-section" id="dashboard" data-g="look"></section>

    <section class="set-section" id="playback" data-g="play"><h2>Lejátszás <button class="help-link" data-help="engines" title="Súgó">?</button></h2>
      ${toggle('autoFallback', 'Automatikus tartalék forrás', 'Ha egy adás nem indul el, a csatorna következő forrását próbálja.')}
      ${api.mediaProbe ? toggle('mediaBridge', 'Lejátszási híd (FFmpeg) filmekhez', 'AC3 / DTS hang, a fájlba ágyazott feliratok (MKV, MP4), több hangsáv és régi videóformátumok lejátszása. Kikapcsolva a beépített lejátszó próbálja (néma lehet, felirat nélkül).') + '<p class="muted small media-status">FFmpeg ellenőrzése…</p>' : ''}
      ${exoAvailable() ? toggle('mediaBridge', 'Natív lejátszó (ExoPlayer) filmekhez', 'MKV / MP4 / AVI fájlok AC3 / DTS hanggal és beágyazott (ASS / SRT) felirattal, minden hangsáv választható. Kikapcsolva a WebView saját lejátszója próbálja (néma lehet, felirat nélkül).') : ''}
      ${api.caps.preview ? toggle('heroPreview', 'Előnézet a főoldalon', 'A kiemelt csatorna némított élő képe a főoldal tetején.') : ''}
      ${toggle('resumeLast', 'Utolsó csatorna folytatása indításkor')}
      ${api.setBackgroundPrefs && api.caps.pip ? toggle('autoPip', 'Kis ablak kilépéskor (kép a képben)', 'Ha lejátszás közben a Kezdőképernyőre vagy másik alkalmazásba lépsz, az adás egy lebegő kis ablakban szól tovább minden más fölött. Kézzel: a lejátszó kép a képben gombja.') : ''}
      ${api.setBackgroundPrefs ? toggle('bgAudio', 'Háttérlejátszás (csak hang)', 'Másik alkalmazásra váltva az adás hangja tovább szól (értesítéssel, onnan leállítható). Ha a kis ablak is be van kapcsolva, az az elsődleges.') : ''}
      ${toggle('perChannelVolume', 'Hangerő csatornánként', 'Minden csatorna megjegyzi a saját hangerejét (a halkabb és hangosabb adók miatt).')}
      <label class="setting"><span><b>Feliratok mérete</b></span><select data-set="subsSize">${[['small', 'Kicsi'], ['normal', 'Közepes'], ['large', 'Nagy'], ['huge', 'Óriás']].map(([v, l]) => `<option value="${v}" ${(s.subsSize || 'normal') === v ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
      <label class="setting stack"><span><b>Feliratok színe és háttere</b><small>Filmeknél, sorozatoknál és az élő adások feliratainál.</small></span><div class="inline sub-style"><select data-set="subColor" aria-label="Szín">${[['white', 'Fehér'], ['yellow', 'Sárga'], ['cyan', 'Világoskék']].map(([v, l]) => `<option value="${v}" ${(s.subColor || 'white') === v ? 'selected' : ''}>${l}</option>`).join('')}</select><select data-set="subBg" aria-label="Háttér">${[['box', 'Sötét sáv'], ['shadow', 'Árnyék'], ['none', 'Nincs']].map(([v, l]) => `<option value="${v}" ${(s.subBg || 'box') === v ? 'selected' : ''}>${l}</option>`).join('')}</select></div></label>
      <label class="setting"><span><b>Lejátszómotor</b><small>Automatikus: tévén a beépített lejátszó, máshol a hls.js. Ha egy adás nem indul, érdemes átváltani.</small></span>
        <select data-set="playbackEngine">${[['auto', 'Automatikus'], ['native', 'Beépített lejátszó'], ['hlsjs', 'hls.js']]
          .map(([v, l]) => `<option value="${v}" ${s.playbackEngine === v ? 'selected' : ''}>${l}</option>`)
          .join('')}</select></label>
    </section>

    <section class="set-section" id="content" data-g="kids"><h2>Tartalom <button class="help-link" data-help="kids" title="Súgó">?</button></h2>
      <label class="setting"><span><b>Hazai ország</b><small>Ennek a csatornái kerülnek előre, és ezek kapják a csatornaszámokat a kedvencek után.</small></span>
        <select data-set="homeCountry">${countries.map((c) => `<option value="${esc(c.code)}" ${c.code === s.homeCountry ? 'selected' : ''}>${countryFlag(c.code)} ${esc(c.name)}</option>`).join('')}</select></label>
      ${toggle('hideOffline', 'Nem elérhető csatornák elrejtése', 'Az ellenőrzés során hibásnak talált csatornák nem jelennek meg.')}
      ${toggle('showAdult', 'Felnőtt tartalom megjelenítése', 'Gyerekprofilban soha nem jelenik meg.')}
    </section>

    <section class="set-section" id="kidsallow" data-g="kids"></section>

    <section class="set-section" id="health" data-g="lists"><h2>Elérhetőség-ellenőrzés <button class="help-link" data-help="health" title="Súgó">?</button></h2>
      ${health.available ? toggle('autoCheck', 'Automatikus ellenőrzés a háttérben', 'A megjelenő csatornák adását időnként ellenőrzi.') : '<p class="muted">Az ellenőrzés csak az asztali alkalmazásban érhető el.</p>'}
      <p class="muted">Ellenőrzött adások: ${healthCount.length} · működik: ${okCount} · hibás: ${healthCount.length - okCount}</p>
      ${health.available ? `<div class="scan">${
        scan
          ? `<div class="progress"><i style="width:${((scan.done / scan.total) * 100).toFixed(1)}%"></i></div><span>${scan.done} / ${scan.total}</span> <button class="btn small" data-act="scan-cancel">Leállítás</button>`
          : `<button class="btn" data-act="scan">Minden adás ellenőrzése</button> <small class="muted">Kb. ${catalog.channels.reduce((n, c) => n + c.streams.length, 0)} adás, néhány percig tart.</small>`
      }</div>` : ''}
      <button class="btn small" data-act="health-clear">Eredmények törlése</button>
    </section>

    <section class="set-section lists" id="lists" data-g="lists"></section>

    <section class="set-section lists" id="vodlists" data-g="lists"></section>

    <section class="set-section lists" id="ownlists" data-g="lists"></section>

    <section class="set-section" id="huinfo" data-g="play"></section>

    <section class="set-section" id="reminders" data-g="notify"><h2>Emlékeztetők és értesítések <button class="help-link" data-help="reminders" title="Súgó">?</button></h2>
      <p class="muted">A műsorújságban vagy a csatorna adatlapján a csengővel jelölhetsz meg műsort; a műsor adatlapján <i>Minden adására</i> is kérhetsz emlékeztetőt (sorozatokhoz, rendszeres műsorokhoz).</p>
      <label class="setting"><span><b>Értesítés a kezdés előtt</b></span>
        <select data-set-num="reminderLead">${[0, 1, 2, 5, 10, 15, 30]
          .map((m) => `<option value="${m}" ${Number(s.reminderLead ?? 2) === m ? 'selected' : ''}>${m ? m + ' perccel' : 'a kezdéskor'}</option>`)
          .join('')}</select></label>
      ${toggle('reminderAutoSwitch', 'Automatikus átkapcsolás a kezdéskor', 'Ha az Adás nyitva van, a műsor kezdetekor (8 másodperces visszaszámlálás után) átkapcsol a csatornára.')}
      ${
        api.caps.background
          ? `${toggle('runInBackground', 'Futás a háttérben (tálcán)', 'Az ablak bezárásakor az Adás a tálcán fut tovább, így az emlékeztetők akkor is megszólalnak. Kilépés: a tálca ikonjának menüjéből.')}
      ${toggle('startWithSystem', 'Indítás a rendszerrel', 'Bejelentkezéskor a tálcára (Macen a menüsorba) indul – csak a háttérben futással együtt.')}
      <p class="muted small">Az értesítések a Windows értesítési központjában jelennek meg; kattintásra a csatorna indul.</p>`
          : IS_ANDROID
            ? `<p class="muted small">Androidon a rendszer értesít – akkor is, ha az Adás be van zárva. Kattintásra a csatorna indul.</p>
      <div class="inline"><button class="btn small" data-act="notify-perm">Értesítések engedélyezése</button></div>`
            : IS_TV
              ? '<p class="muted small">Tévén az értesítés akkor jelenik meg, ha az Adás fut (más alkalmazás közben is felugró üzenetként).</p>'
              : '<p class="muted small">Böngészőben az értesítés csak akkor jelenik meg, ha az oldal nyitva van.</p>'
      }
    </section>

    ${api.recStart ? '<section class="set-section" id="recordings" data-g="play"></section>' : ''}

    <section class="set-section" id="transfer" data-g="devices"></section>

    ${api.rcStart ? '<section class="set-section" id="remote" data-g="devices"></section>' : ''}

    <section class="set-section" id="update" data-g="about"></section>

    <section class="set-section" id="epg" data-g="lists"><h2>Műsorújság <button class="help-link" data-help="epg-sources" title="Súgó">?</button></h2>
      <p class="muted">${epg.byChannel.size} csatornához van műsoradat. ${epg.loading ? 'Betöltés folyamatban…' : ''}</p>
      <ul class="src-list">${[...s.epgSources.map((src, i) => ({ ...src, i })), ...(s.useEmbeddedEpg ? (catalog.tvgUrls || []).map((url) => ({ url, name: 'Lejátszólista műsorújsága: ' + url.replace(/^https?:\/\/(www\.)?/, '').slice(0, 50), embedded: true, enabled: true })) : [])]
        .map((src) => {
          const st = epg.status[src.url];
          const info = !src.enabled ? 'kikapcsolva' : !st ? 'nincs betöltve' : st.ok ? `${st.matched ?? 0} csatorna párosítva / ${st.channels} · ${st.programs} műsor` : `hiba: ${st.error}`;
          return `<li><input type="checkbox" class="switch" ${src.embedded ? 'data-set="useEmbeddedEpg" checked' : `data-epg-toggle="${src.i}" ${src.enabled ? 'checked' : ''}`} />
            <span><b>${esc(src.name)}</b><small>${esc(info)}</small></span>
            ${!src.embedded && !BUILTIN_EPG.some((b) => b.url === src.url) ? `<button class="btn small" data-epg-del="${src.i}">Törlés</button>` : ''}</li>`;
        })
        .join('')}</ul>
      <div class="inline"><button class="btn small" data-act="epg-add">XMLTV forrás hozzáadása</button><button class="btn small" data-act="epg-reload">Műsorújság frissítése most</button></div>
      <label class="setting"><span><b>Frissítés gyakorisága</b></span><select data-set-num="epgRefreshHours">${[3, 6, 12, 24, 48]
        .map((h) => `<option value="${h}" ${h === s.epgRefreshHours ? 'selected' : ''}>${h} óránként</option>`)
        .join('')}</select></label>
    </section>

    <section class="set-section" id="data" data-g="data"><h2>Profilok és adatok <button class="help-link" data-help="backup" title="Súgó">?</button></h2>
      <div class="inline"><a class="btn" href="#/profiles">Profilok kezelése</a>
      ${api.caps.files ? `<button class="btn" data-act="export">Mentés fájlba</button>
      <button class="btn" data-act="import">Visszaállítás fájlból</button>
      <button class="btn" data-act="import-profiles">Profilok hozzáadása fájlból</button>` : ''}
      <button class="btn" data-act="clear-cache">Gyorsítótár törlése</button></div>
      <p class="muted">A mentés tartalmazza a beállításokat, a profilokat, a kedvenceket, az előzményeket és az emlékeztetőket.</p>
      <div id="autobackup"></div>
    </section>

    ${
      IS_TV
        ? `<section class="set-section" id="tvkeys" data-g="devices"><h2>Távirányító</h2>
      <table class="keys">
        <tr><td>Nyilak, OK</td><td>Mozgás, kiválasztás / lejátszás</td></tr>
        <tr><td>Vissza</td><td>Vissza (a főoldalon: kilépés)</td></tr>
        <tr><td>Piros</td><td>Kedvenc be/ki</td></tr>
        <tr><td>Zöld</td><td>Csatorna adatai / műsorújság</td></tr>
        <tr><td>Sárga</td><td>Keresés (lejátszás közben: minőség, forrás)</td></tr>
        <tr><td>Kék</td><td>Kedvencek (lejátszás közben: csatornalista)</td></tr>
        <tr><td>CH+ / CH−, ↑ / ↓</td><td>Csatornaváltás lejátszás közben</td></tr>
        <tr><td>0–9</td><td>Csatornaszám</td></tr>
        <tr><td>◀◀ / ▶▶</td><td>Élő adás: 30 mp vissza / előre (film: tekerés)</td></tr>
        <tr><td>Felirat (CC)</td><td>Hang és felirat</td></tr>
      </table></section>`
        : ''
    }
    <section class="set-section" id="keys" data-g="devices" ${IS_TV ? 'data-off' : ''}><h2>Billentyűparancsok</h2>
      <table class="keys">
        <tr><td>Nyilak</td><td>Mozgás a felületen (távirányítóval is)</td></tr>
        <tr><td>Enter</td><td>Lejátszás / kiválasztás</td></tr>
        <tr><td>I</td><td>Csatorna adatai</td></tr>
        <tr><td>F (kártyán)</td><td>Kedvenc be/ki</td></tr>
        <tr><td>Esc / Backspace</td><td>Vissza</td></tr>
        <tr><td>Ctrl+F vagy /</td><td>Keresés</td></tr>
        <tr><td colspan="2"><b>Lejátszás közben</b></td></tr>
        <tr><td>↑ / ↓, PageUp / PageDown</td><td>Előző / következő csatorna</td></tr>
        <tr><td>← / →</td><td>Hangerő</td></tr>
        <tr><td>0–9</td><td>Csatornaszám beírása</td></tr>
        <tr><td>Szóköz</td><td>Szünet / lejátszás</td></tr>
        <tr><td>Enter / L</td><td>Csatornalista</td></tr>
        <tr><td>M / F / P / N / S</td><td>Némítás / teljes képernyő / kép a képben / mini lejátszó / kedvenc</td></tr>
        <tr><td>Shift+← / Shift+→, End</td><td>Élő adás: 30 mp vissza / előre, ugrás élőbe</td></tr>
        <tr><td>C / V</td><td>Hang és felirat / több adás egyszerre</td></tr>
        <tr><td>D</td><td>Adás adatai (minőség, sebesség, puffer)</td></tr>
        <tr><td>R</td><td>Vissza az előző csatornára</td></tr>
      </table>
    </section>

    <section class="set-section about-sec" id="about" data-g="about"><h2>Névjegy</h2>
      <div class="about-head"><b class="about-name">Adás</b><span class="muted about"></span></div>
      <p>Élő tévé, műsorújság, filmek és sorozatok (online listák és saját médiatár), felvétel, sportfigyelő és testreszabható főoldal – egy alkalmazásban, Windowson, macOS-en, Linuxon, Androidon és Android TV-n.</p>
      <dl class="about-list">
        <dt>Tévécsatornák</dt><dd><a href="#" data-ext="https://github.com/iptv-org/iptv">iptv-org</a> (nyilvános, közösségi gyűjtemény), Free-TV, Pluto TV, Samsung TV Plus, Plex, FreeCast – és a saját listáid</dd>
        <dt>Műsorújság</dt><dd>iptv-epg.org, epgshare01, a lejátszólisták saját XMLTV-forrásai és a saját forrásaid</dd>
        <dt>Film- és sorozatadatok</dt><dd>Wikipédia, Wikidata, AniList, Kitsu, MyAnimeList, TVmaze; saját kulccsal TMDB és OMDb</dd>
        <dt>Feliratok</dt><dd>OpenSubtitles (saját fiókkal)</dd>
        <dt>Főoldal</dt><dd>Open-Meteo (időjárás, levegőminőség), ESPN és TheSportsDB (sport), Frankfurter (árfolyam), névnapok, a választott hírforrások RSS-e</dd>
        <dt>Lejátszás</dt><dd>Electron, hls.js, dash.js, FFmpeg (lejátszási híd, felvétel); Androidon Media3 ExoPlayer FFmpeg-dekóderrel</dd>
      </dl>
      <p class="muted small">Az Adás nem tárol és nem szolgáltat műsort: az adásokat és a fájlokat a csatornák, a listák készítői, illetve a saját géped / NAS-od szolgáltatják, elérhetőségük változhat. Csak olyan tartalmat nézz és rögzíts, amihez jogod van.</p>
      <div class="inline"><a class="btn small" href="#/help">Súgó</a><a class="btn small" href="#/stats">Statisztika</a></div>
    </section>
  </div>`;

  const PLATFORM = { win32: 'Windows', darwin: 'macOS', linux: 'Linux', android: 'Android', web: 'böngésző' };
  api.appInfo().then((i) => {
    const el = $('.about', view);
    if (el) el.innerHTML = `${esc(i.version)} · ${esc(PLATFORM[i.platform] || i.platform)}${IS_TV ? ' (tévé)' : ''}<br><small>Adatok helye: <code>${esc(i.dataDir)}</code></small>`;
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
    el.innerHTML = st.ok ? `FFmpeg ${esc(st.version)} – rendben` : `<span class="warn">A lejátszási híd nem használható: ${esc(st.error || 'ismeretlen hiba')}</span>`;
  });
  settingsNav(view);

  view.onchange = async (e) => {
    const t = e.target;
    if (t.dataset.set) {
      if (t.dataset.set === 'showAdult' && t.checked) {
        const ok = await confirmDialog('Biztosan megjeleníted a felnőtt tartalmú csatornákat? Csak 18 éven felülieknek.', { ok: 'Igen, 18 éves elmúltam' });
        if (!ok) return (t.checked = false);
      }
      store.set(t.dataset.set, t.type === 'checkbox' ? t.checked : t.value);
      if (t.dataset.set === 'useEmbeddedEpg') epg.load();
      return;
    }
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
      if (info) info.textContent = t.checked ? 'betöltés…' : 'kikapcsolva';
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
        if (r) toast(r.cancelled ? 'Ellenőrzés leállítva' : `Ellenőrzés kész: ${r.checked} adás`);
        if (location.hash.startsWith('#/settings')) renderSettings(view);
      });
      renderSettings(view);
    } else if (act === 'scan-cancel') health.cancelScan();
    else if (act === 'health-clear') {
      health.clear();
      renderSettings(view);
    } else if (act === 'epg-add') {
      const url = await promptDialog('Az XMLTV műsorújság címe (.xml vagy .xml.gz):');
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
      b.textContent = 'Frissítés…';
      await epg.load({ force: true });
      if (location.hash.startsWith('#/settings')) renderSettings(view);
    } else if (act === 'export') {
      const data = await attachDocs(JSON.parse(JSON.stringify(store.serialize())));
      delete data.health;
      const ok = await api.saveFile(`adas-mentes-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(data, null, 2));
      if (ok) toast('Mentés elkészült');
    } else if (act === 'import') {
      const f = await api.openFile([{ name: 'Adás mentés', extensions: ['json'] }]);
      if (!f) return;
      try {
        const data = JSON.parse(f.text);
        if (!data.settings || !Array.isArray(data.profiles)) throw new Error('hibás formátum');
        if (!(await confirmDialog('A visszaállítás felülírja a jelenlegi beállításokat és profilokat. Folytatod?', { ok: 'Visszaállítás', danger: true }))) return;
        await restoreDocs(data);
        await store.replaceAll({ ...data, health: store.health });
        location.reload();
      } catch (err) {
        toast('Nem sikerült beolvasni a mentést: ' + err.message);
      }
    } else if (act === 'notify-perm') {
      api.notifyPermission?.();
    } else if (act === 'import-profiles') {
      const f = await api.openFile([{ name: 'Adás mentés', extensions: ['json'] }]);
      if (!f) return;
      try {
        const data = JSON.parse(f.text);
        data.app ||= 'adas';
        await importData(data, f.name, { profilesOnly: true });
      } catch (err) {
        toast('Nem sikerült beolvasni a mentést: ' + err.message);
      }
    } else if (act === 'clear-cache') {
      await api.clearCache();
      toast('A gyorsítótár törölve. A következő indításkor minden friss adat letöltődik.');
    }
  };
}

// ---------------------------------------------------------------------------
// A beállítások csoportjai: csempés kezdőlap vagy fülek (settings.settingsView), keresővel.
// A részek mind kirajzolódnak (így minden kezelőjük működik), a csoportváltás csak elrejti a többit.
// ---------------------------------------------------------------------------
const SET_GROUPS = [
  ['look', '🎨', 'Megjelenés és főoldal', 'Stílus, saját témák, főoldali csempék, időjárás, hírek'],
  ['play', '▶️', 'Lejátszás', 'Lejátszómotor, feliratok, kép a képben, felvételek, magyar információk'],
  ['lists', '📋', 'Listák és források', 'Tévé- és VOD-listák, saját médiatár, műsorújság, elérhetőség'],
  ['kids', '👪', 'Tartalom és gyerekek', 'Hazai ország, felnőtt tartalom, mit nézhetnek a gyerekprofilok'],
  ['notify', '🔔', 'Értesítések', 'Emlékeztetők, automatikus átkapcsolás, háttérben futás'],
  ['devices', '📡', 'Eszközök és szinkron', 'Szinkron eszközök között, távirányító telefonról, billentyűk'],
  ['data', '💾', 'Profilok és mentés', 'Profilok, mentés és visszaállítás, automatikus mentések'],
  ['about', 'ℹ️', 'Frissítés és névjegy', 'Verzió, frissítések, adatforrások'],
];
function settingsNav(view) {
  const nav = $('.set-nav', view);
  const params = new URLSearchParams(location.hash.split('?')[1] || '');
  const mode = store.settings.settingsView === 'tiles' ? 'tiles' : 'tabs';
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
  // Nézetváltó a fejlécben
  $('.set-head', view).insertAdjacentHTML(
    'beforeend',
    `<div class="seg set-view" role="group" aria-label="Elrendezés"><button class="${mode === 'tiles' ? 'on' : ''}" data-sv="tiles" title="Csempés kezdőlap">▦ Csempék</button><button class="${mode === 'tabs' ? 'on' : ''}" data-sv="tabs" title="Fülek">☰ Fülek</button></div>`
  );
  nav.innerHTML = `<input class="input set-search" type="search" placeholder="Keresés a beállítások között (pl. felirat, téma, szinkron)…" aria-label="Keresés a beállítások között" />
    ${
      hub
        ? `<div class="set-tiles">${groups
            .map(([id, ico, name, desc]) => `<a class="set-tile" href="#/settings?g=${id}"><span class="st-ico">${ico}</span><b>${esc(name)}</b><small>${esc(desc)}</small></a>`)
            .join('')}</div>`
        : mode === 'tabs'
          ? `<div class="tabs set-tabs" role="tablist">${groups.map(([id, ico, name]) => `<button class="tab ${id === g ? 'active' : ''}" role="tab" aria-selected="${id === g}" data-sg="${id}">${ico} ${esc(name)}</button>`).join('')}</div>`
          : `<div class="set-crumb"><a class="btn small" href="#/settings">‹ Minden beállítás</a><h2>${label[g] || ''}</h2></div>`
    }
    <p class="muted set-noresult" hidden>Nincs ilyen beállítás. Próbálj más szót, vagy nézd meg a <a href="#/help">Súgót</a>.</p>`;
  const show = () => {
    for (const s of sections) s.hidden = hub || s.dataset.g !== g;
  };
  show();
  // a kiválasztott fül látszódjon a vízszintesen görgethető sorban (telefonon)
  const at = nav.querySelector('.set-tabs .active');
  if (at) at.parentElement.scrollLeft = at.offsetLeft - (at.parentElement.clientWidth - at.offsetWidth) / 2;
  const page = $('.page.settings', view);
  page.classList.toggle('set-hub', hub);
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
    if (t) go(t.dataset.sg, true);
  });
  $('.set-view', view).addEventListener('click', (e) => {
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

  box.innerHTML = `<h2>Megjelenés <span class="muted small">· ${esc(p.name)} profil</span> <button class="help-link" data-help="themes" title="Súgó">?</button></h2>
    <p class="muted">Ezek a beállítások csak az aktuális profilra vonatkoznak.</p>
    <label class="setting"><span><b>Felület stílusa</b><small class="theme-desc">${esc(THEMES[theme].desc)}</small></span>
      <select data-theme-select>${Object.entries(THEMES)
        .map(([id, t]) => `<option value="${id}" ${id === theme ? 'selected' : ''}>${esc(t.label)}</option>`)
        .join('')}</select></label>
    <div class="theme-swatches">${Object.keys(THEMES)
      .map((id) => { const cp = THEMES[id].custom?.preview || []; return `<button class="theme-swatch ${id === theme ? 'sel' : ''}" data-theme-pick="${esc(id)}" data-preview="${esc(id)}" title="${esc(THEMES[id].label)}" ${cp[0] ? `style="background:${esc(cp[0])}"` : ''}><i ${cp[1] ? `style="background:${esc(cp[1])}"` : ''}></i><i ${cp[2] ? `style="background:${esc(cp[2])}"` : ''}></i><i></i><span>${esc(THEMES[id].label)}</span></button>`; })
      .join('')}</div>
    <div class="ct-box"></div>
    <h3>A TV oldal sorai</h3>
    <p class="muted">Húzással vagy a nyilakkal rendezheted, a kapcsolóval elrejtheted a sorokat.</p>
    <div class="tv-rows"></div>`;
  renderThemeTools(box.querySelector('.ct-box'), () => renderAppearance(box));

  rowOrderEditor(box.querySelector('.tv-rows'), {
    rows: profileRows(),
    label: rowLabel,
    defaults: defaultRows,
    onSave: (rows) => store.setProfileValue('rows', rows),
    resetMsg: 'A TV oldal sorai visszaálltak az alapértelmezettre',
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
    <div class="brand big">ADÁS</div>
    <h1>${manage ? 'Profilok kezelése' : 'Ki nézi?'}</h1>
    <div class="profile-list">
      ${store.profiles
        .map((p) => `<button class="profile" data-p="${esc(p.id)}">${avatarHtml(p, '', manage ? '<span class="edit">✎</span>' : hasPin(p) ? '<span class="lock" title="PIN-nel védett">🔒</span>' : '')}
          <span class="p-label">${esc(p.name)}${p.kids ? ' <span class="pill small">Gyerek</span>' : ''}</span></button>`)
        .join('')}
      ${manage ? `<button class="profile add" data-add><span class="avatar plus">${ICON.plus}</span><span class="p-label">Profil hozzáadása</span></button>` : ''}
    </div>
    <button class="btn outline" data-manage>${manage ? 'Kész' : 'Profilok kezelése'}</button>
  </div>`;
  root.querySelector('.profile')?.focus();
  root.onclick = async (e) => {
    const pb = e.target.closest('[data-p]');
    if (e.target.closest('[data-manage]')) {
      if (!manage && !(await requireAdult('A profilok kezeléséhez'))) return;
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
    if (file.size > 15 * 1024 * 1024) return reject(new Error('a fájl túl nagy (legfeljebb 15 MB)'));
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
      reject(new Error('nem kép, vagy nem támogatott formátum'));
    };
    img.src = url;
  });
}

function editProfile(prof, done) {
  const isNew = !prof;
  let color = prof?.color || PROFILE_COLORS[store.profiles.length % PROFILE_COLORS.length];
  let avatar = prof ? (Number.isInteger(prof.avatar) || prof.avatar === 'custom' ? prof.avatar : null) : store.profiles.length % AVATAR_COUNT;
  let avatarData = prof?.avatarData || ''; // saját (feltöltött) kép, data: URL
  const el = html(`<form class="dialog profile-edit">
    <h2>${isNew ? 'Új profil' : 'Profil szerkesztése'}</h2>
    <label>Név<input class="input" name="name" value="${esc(prof?.name || '')}" maxlength="20" required autofocus /></label>
    <div><b>Profilkép</b></div>
    <div class="avatar-grid">${Array.from({ length: AVATAR_COUNT }, (_, i) => `<button type="button" class="avatar-opt ${i === avatar ? 'sel' : ''}" data-av="${i}" style="background-image:url('${avatarUrl(i)}')" aria-label="${i + 1}. profilkép"></button>`).join('')}
      <button type="button" class="avatar-opt letter ${avatar === null ? 'sel' : ''}" data-av="" style="background-color:${esc(color)}" aria-label="Betű, kép nélkül">${esc((prof?.name || 'A').slice(0, 1).toUpperCase())}</button>
      <button type="button" class="avatar-opt custom ${avatar === 'custom' ? 'sel' : ''}" data-av="custom" ${avatarData ? `style="background-image:url('${avatarData}')"` : 'hidden'} aria-label="Saját kép"></button></div>
    ${api.caps.files ? `<div class="inline"><button type="button" class="btn small" data-upload>Saját kép feltöltése…</button><span class="muted small">PNG (vagy JPG, WebP) – négyzetesre vágjuk, 256×256 pontra kicsinyítjük.</span></div>` : ''}
    <div><b>Szín</b> <small class="muted">(a betűs profilképhez és a kiemelésekhez)</small></div>
    <div class="swatches">${PROFILE_COLORS.map((c) => `<button type="button" class="swatch ${c === color ? 'sel' : ''}" data-c="${c}" style="background:${c}" aria-label="Szín"></button>`).join('')}</div>
    <label class="setting"><span><b>Gyerekprofil</b><small>Csak gyerek-, családi, animációs és oktatási csatornák.</small></span>
      <input type="checkbox" class="switch" name="kids" ${prof?.kids ? 'checked' : ''} /></label>
    <div class="setting"><span><b>Profilzár (PIN-kód)</b><small class="pin-state"></small></span>
      <span class="inline"><button type="button" class="btn small" data-pin="set"></button><button type="button" class="btn small" data-pin="clear">PIN törlése</button></span></div>
    <p class="muted small">Ha egy felnőtt profilnak van PIN-kódja, a gyerekprofilból csak azzal lehet másik profilra váltani, a beállításokat és a profilokat módosítani.</p>
    <div class="dialog-btns"><button class="btn primary" type="submit">Mentés</button>
      ${!isNew && store.profiles.length > 1 ? '<button class="btn danger" type="button" data-del>Profil törlése</button>' : ''}</div>
  </form>`);
  const close = openModal(el, { cls: 'medium' });
  // PIN: mentéskor érvényesül. undefined = nem változik, null = törlés, '1234' = új
  let newPin;
  const pinState = () => {
    const on = newPin === undefined ? hasPin(prof) : !!newPin;
    el.querySelector('.pin-state').textContent = on
      ? 'Be van állítva: a profil megnyitásához meg kell adni.'
      : 'Nincs beállítva: a profil PIN nélkül megnyitható.';
    el.querySelector('[data-pin="set"]').textContent = on ? 'PIN módosítása' : 'PIN beállítása';
    el.querySelector('[data-pin="clear"]').hidden = !on;
  };
  pinState();
  el.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-pin]');
    if (!b) return;
    if (b.dataset.pin === 'clear') newPin = null;
    else {
      const pin = await choosePin(el.elements.namedItem('name').value.trim() || prof?.name || 'Új profil');
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
    el.querySelector('.avatar-opt.letter').style.backgroundColor = color;
  };
  const pick = (b) => {
    const v = b.dataset.av;
    avatar = v === '' ? null : v === 'custom' ? 'custom' : Number(v);
    el.querySelectorAll('.avatar-opt').forEach((x) => x.classList.toggle('sel', x === b));
  };
  el.querySelector('.avatar-grid').onclick = (e) => {
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
    } catch (err) {
      toast('A kép nem olvasható be: ' + (err.message || err));
    }
  });
  el.elements.namedItem('name').addEventListener('input', (e) => {
    el.querySelector('.avatar-opt.letter').textContent = (e.target.value.trim() || 'A').slice(0, 1).toUpperCase();
  });
  el.onsubmit = (e) => {
    e.preventDefault();
    const name = el.elements.namedItem('name').value.trim() || 'Profil';
    const kids = el.elements.namedItem('kids').checked;
    const target = isNew ? store.addProfile(name, color, kids, avatar) : Object.assign(prof, { name, color, kids, avatar });
    // A saját kép csak akkor marad meg, ha az van kiválasztva (ne foglaljon fölöslegesen helyet).
    target.avatarData = avatar === 'custom' ? avatarData : '';
    if (newPin !== undefined) setPin(target, newPin);
    store.save();
    bus.emit('profile');
    close();
    done();
  };
  el.querySelector('[data-del]')?.addEventListener('click', async () => {
    if (!(await confirmDialog(`Törlöd a(z) „${prof.name}” profilt a kedvenceivel együtt?`, { ok: 'Törlés', danger: true }))) return;
    store.removeProfile(prof.id);
    bus.emit('profile');
    close();
    done();
  });
}