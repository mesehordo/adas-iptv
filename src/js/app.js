// Alkalmazás: indítás, útvonalak, fejléc, keresés, profilmenü, emlékeztetők, billentyű- és távirányítós navigáció.
import { $, $$, esc, html, fmtTime, debounce, toast, bus, dayLabel, dayStart } from './util.js';
import { api, IS_TV } from './api.js';
import { store } from './store.js';
import { catalog, loadCatalog } from './catalog.js';
import { epg } from './epg.js';
import { player } from './player.js';
import { ICON, closeTopModal, modalOpen, topModalEl, openProgram, openInfo, confirmDialog, avatarHtml } from './components.js';
import { applyTheme } from './themes.js';
import { refreshAll, refreshing } from './refresh.js';
import { channelDialog } from './lists.js';
import { renderHelp, helpTopicForRoute } from './help.js';
import { renderVod, renderOwn, loadVod, loadOwn, vodLists, vod } from './vod.js';
import { syncPackFolder } from './packs.js';
import './subtitles.js'; // a lejátszó felirat-kezelője
import { unlockProfile, requireAdult, adultGuardNeeded, markUnlocked, hasPin } from './pin.js';
import './cast.js'; // kivetítés (Chromecast / DLNA)
import { openMultiview, multiKey, multiOpen } from './multiview.js';
import { renderStats } from './stats.js';
import { renderSport, sportMenuOn } from './sportpage.js';
import { autoCheckUpdate } from './update.js';
import { checkReminders, toggleSeries, syncSeries, scheduleNative } from './reminders.js';
import {
  renderTv, leaveHome, renderBrowse, renderCountries, renderFavorites, renderSearch, renderGuide, renderSettings, renderProfiles,
} from './views.js';
import { renderDashboard } from './dashboard.js';
import { renderRecordingsPage } from './recorder.js'; // felvétel (asztali) és a felvételek oldala
import './remote.js'; // távirányító telefonról
import { applySubStyle } from './backup.js'; // automatikus mentés, feliratstílus
import './watchtime.js';
import { loadCustomThemes } from './customthemes.js'; // saját témák (feltöltött + téma-mappa) // gyerekprofilok napi nézési ideje és korhatár
import { _t, lang, savedLang, setLanguage, translateDom } from './i18n.js';
import { needsOnboarding, runOnboarding } from './onboarding.js';

// a lap nyelve és a statikus (index.html) szövegek fordítása – a felület felépítése előtt
document.documentElement.lang = lang;
translateDom();
// nyelvváltáskor (Beállítások, varázsló) a választás a beállításokba és a főfolyamatnak is
window.addEventListener('adas-lang', (e) => {
  store.settings.lang = e.detail;
  if (store.profiles.length && !store.firstRun) store.flush();
  api.setLang?.(e.detail);
});

const view = $('#view');
const nav = $('#nav');
const splash = $('#splash');
const profilesEl = $('#profiles');
const searchInput = $('#search-input');
let started = false;
let currentRoute = '';
let settingsGrant = 0; // a felnőtt jóváhagyás eddig érvényes (gyerekprofilban)

// ---------------------------------------------------------------------------
// Útvonalak
// ---------------------------------------------------------------------------
/** A címből jövő név → oldal (rögzített választás; ismeretlen névre a főoldal). */
function routeFn(name) {
  switch (name) {
    case 'tv': return renderTv;
    case 'browse': return renderBrowse;
    case 'countries': return renderCountries;
    case 'favorites': return renderFavorites;
    case 'search': return renderSearch;
    case 'guide': return renderGuide;
    case 'settings': return renderSettings;
    case 'help': return renderHelp;
    case 'vod': return renderVod;
    case 'own': return renderOwn;
    case 'recordings': return renderRecordingsPage;
    case 'stats': return renderStats;
    case 'sport': return renderSport;
    default: return renderDashboard;
  }
}

// Külső hivatkozások bárhonnan (súgó, beállítások, adatlap): <a|button data-ext="https://…"> – a rendszer böngészőjében
document.addEventListener('click', (e) => {
  const x = e.target.closest('[data-ext]');
  if (!x || !/^https?:\/\//i.test(x.dataset.ext || '')) return;
  e.preventDefault();
  e.stopPropagation();
  api.openExternal?.(x.dataset.ext);
}, true);

// Súgóhivatkozások bárhonnan: <button data-help="téma">
document.addEventListener('click', (e) => {
  const h = e.target.closest('[data-help]');
  if (!h) return;
  e.preventDefault();
  e.stopPropagation();
  closeTopModal();
  location.hash = '#/help?topic=' + encodeURIComponent(h.dataset.help);
}, true);

function openHelp() {
  if (player.active) player.close();
  while (closeTopModal());
  const { name } = parseHash();
  if (name !== 'help') location.hash = '#/help?topic=' + helpTopicForRoute(name);
}

function parseHash() {
  const [path, qs] = location.hash.replace(/^#\/?/, '').split('?');
  return { name: path || 'home', params: new URLSearchParams(qs || '') };
}

function route({ keepScroll = false } = {}) {
  if (!started) return;
  const { name, params } = parseHash();
  if (name === 'profiles') {
    if (adultGuardNeeded()) {
      requireAdult(_t('A profilok kezeléséhez')).then((ok) => (ok ? showProfiles(true) : history.back()));
      return;
    }
    showProfiles(true);
    return;
  }
  // Gyerekprofilból a beállítások csak felnőtt PIN-jével nyithatók meg.
  if (name === 'settings' && adultGuardNeeded() && Date.now() > settingsGrant) {
    requireAdult(_t('A beállítások megnyitásához')).then((ok) => {
      if (ok) {
        settingsGrant = Date.now() + 10 * 60e3;
        route();
      } else location.replace('#/home');
    });
    return;
  }
  // kikapcsolt (vagy gyerekprofilban rejtett) Sport menüpontnál a főoldal
  if (name === 'sport' && !sportMenuOn()) return void location.replace('#/home');
  const fn = routeFn(name);
  if (name !== 'tv') leaveHome();
  const full = location.hash;
  const sameRoute = full === currentRoute;
  const y = window.scrollY;
  currentRoute = full;
  // A „Saját” médiatár a VOD része; az országok oldala a Böngészésé
  const navRoute = { own: 'vod', recordings: 'tv', guide: 'tv', browse: 'tv', countries: 'tv' }[name] || name;
  $$('.links a', nav).forEach((a) => a.classList.toggle('active', a.dataset.route === navRoute));
  document.body.dataset.route = name;
  if (name !== 'search' && document.activeElement !== searchInput) {
    searchInput.value = '';
    $('#search-box').classList.remove('open');
  }
  fn(view, params);
  window.scrollTo(0, keepScroll || sameRoute ? y : 0);
}

window.addEventListener('hashchange', () => route());

const rerender = debounce(() => {
  if (!started || player.active) return;
  const { name } = parseHash();
  if (['home', 'tv', 'guide', 'search', 'favorites', 'browse', 'sport'].includes(name)) route({ keepScroll: true });
}, 300);
bus.on('epg', rerender);
bus.on('vod', () => ['vod', 'search', 'home', 'favorites'].includes(parseHash().name) && !player.active && route({ keepScroll: true }));
// kedvenc film / sorozat jelölése (pl. a Kedvencek oldalról nyitott adatlapon): a Kedvencek oldal frissül
bus.on('vod-favs', () => parseHash().name === 'favorites' && !player.active && route({ keepScroll: true }));
bus.on('own', () => ['own', 'search', 'home'].includes(parseHash().name) && !player.active && route({ keepScroll: true }));
bus.on('catalog', rerender);
bus.on('profile', () => {
  applyTheme();
  applySubStyle();
  updateProfileButton();
  updateReminders();
  rerender();
});
bus.on('favorites', () => parseHash().name === 'favorites' && rerender());
// Sport menüpont: Beállítások → Sport (gyerekprofilban nem látszik)
const applySportMenu = () => {
  const a = $('.links a[data-route="sport"]', nav);
  if (a) a.hidden = !sportMenuOn();
};
bus.on('settings', (k) => k === 'sportMenu' && applySportMenu());
bus.on('profile', applySportMenu);
bus.on('profile-theme', () => leaveHome());
bus.on('settings', (k) => ['hideOffline', 'showAdult', 'homeCountry'].includes(k) && parseHash().name !== 'settings' && rerender());
bus.on('player-closed', () => {
  // Visszatéréskor a sorok frissüljenek (előzmények), a görgetés maradjon.
  if (['home', 'tv'].includes(parseHash().name)) route({ keepScroll: true });
});

// ---------------------------------------------------------------------------
// Fejléc
// ---------------------------------------------------------------------------
window.addEventListener('scroll', () => nav.classList.toggle('solid', window.scrollY > 30), { passive: true });

$('#help-btn').onclick = openHelp;

$('#search-toggle').onclick = () => {
  const box = $('#search-box');
  box.classList.add('open');
  searchInput.focus();
};
searchInput.addEventListener('blur', () => {
  if (!searchInput.value) $('#search-box').classList.remove('open');
});
searchInput.addEventListener(
  'input',
  debounce(() => {
    const q = searchInput.value.trim();
    const target = q ? '#/search?q=' + encodeURIComponent(q) : '#/home';
    if (parseHash().name === 'search') location.replace(target);
    else location.hash = target;
  }, 250)
);
searchInput.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    searchInput.value = '';
    searchInput.blur();
    $('#search-box').classList.remove('open');
  } else if (e.key === 'Enter' || e.key === 'ArrowDown') {
    e.preventDefault();
    const first = $('#view .card, #view .prog-hit');
    first?.focus();
  }
});

function updateProfileButton() {
  const p = store.profile;
  $('#profile-btn').innerHTML = `${avatarHtml(p, 'small')}${ICON.chevron}`;
  $('#profile-panel').innerHTML = `${store.profiles
    .filter((x) => x.id !== p.id)
    .map((x) => `<button class="menu-item" data-switch="${esc(x.id)}">${avatarHtml(x, 'tiny')}${esc(x.name)}</button>`)
    .join('')}
    <div class="menu-sep"></div>
    <button class="menu-item" data-menu="refresh">${ICON.refresh}<span>${_t('Csatornalista frissítése')}<small>${catalog.loadedAt ? `${_t('utoljára:')} ` + dayLabel(Math.round((dayStart(catalog.loadedAt) - dayStart()) / 86400e3)).toLowerCase() + ' ' + fmtTime(catalog.loadedAt) : ''}</small></span></button>
    <button class="menu-item" data-menu="add-channel">${ICON.plus}<span>${_t('Csatorna hozzáadása')}</span></button>
    <a class="menu-item" href="#/settings?section=lists">${ICON.tv}<span>${_t('Listák kezelése')}</span></a>
    ${api.caps.multiview ? `<button class="menu-item" data-menu="multi"><span class="mi-ico">▦</span><span>${_t('Több adás egyszerre')}</span></button>` : ''}
    <a class="menu-item" href="#/stats"><span class="mi-ico">▮▯</span><span>${_t('Nézési statisztika')}</span></a>
    <div class="menu-sep"></div>
    <a class="menu-item" href="#/help">${ICON.help}<span>${_t('Súgó')}</span></a>
    <a class="menu-item" href="#/profiles">${_t('Profilok kezelése')}</a>
    <a class="menu-item" href="#/settings">${_t('Beállítások')}</a>`;
}
bus.on('catalog', updateProfileButton);

$('#profile-panel').addEventListener('click', (e) => {
  const b = e.target.closest('[data-switch]');
  const m = e.target.closest('[data-menu]')?.dataset.menu;
  closeDropdowns();
  if (m === 'refresh') refreshAll({ force: true });
  else if (m === 'add-channel') channelDialog(null, () => refreshAll({ force: false }));
  else if (m === 'multi') openMultiview([]);
  if (b) {
    const target = store.profiles.find((p) => p.id === b.dataset.switch);
    unlockProfile(target).then((ok) => {
      if (!ok) return;
      settingsGrant = 0;
      store.switchProfile(target.id);
      toast(`${_t('Profil: {name}', { name: store.profile.name })}`);
      location.hash = '#/home';
    });
  }
});

function closeDropdowns() {
  $$('.dropdown.open').forEach((d) => d.classList.remove('open'));
}
$$('.dropdown > button').forEach((b) =>
  b.addEventListener('click', (e) => {
    e.stopPropagation();
    const d = b.parentElement;
    const was = d.classList.contains('open');
    closeDropdowns();
    if (!was) {
      d.classList.add('open');
      d.querySelector('.dropdown-panel .menu-item, .dropdown-panel button')?.focus();
    }
  })
);
document.addEventListener('click', (e) => {
  if (!e.target.closest('.dropdown')) closeDropdowns();
});

// ---------------------------------------------------------------------------
// Profilválasztó
// ---------------------------------------------------------------------------
function showProfiles(manage = false) {
  profilesEl.hidden = false;
  document.body.classList.add('picking');
  return new Promise((resolve) => {
    renderProfiles(profilesEl, {
      manage,
      onPick: async (p) => {
        if (!(await unlockProfile(p))) return;
        settingsGrant = 0;
        store.switchProfile(p.id);
        profilesEl.hidden = true;
        document.body.classList.remove('picking');
        if (location.hash.startsWith('#/profiles')) location.hash = '#/home';
        resolve(p);
      },
    });
  });
}

// ---------------------------------------------------------------------------
// Emlékeztetők
// ---------------------------------------------------------------------------
function updateReminders() {
  const p = store.profile;
  const now = Date.now();
  p.reminders = p.reminders.filter((r) => r.stop > now - 3600e3);
  const upcoming = p.reminders.filter((r) => r.stop > now);
  const rules = p.seriesReminders || [];
  const count = $('#reminder-count');
  count.hidden = !upcoming.length;
  count.textContent = upcoming.length;
  $('#reminder-panel').innerHTML = `${upcoming.length
      ? `<h4>${_t('Emlékeztetők')}</h4>${upcoming
          .slice(0, 30)
          .map((r, i) => {
            const ch = catalog.byId.get(r.channelId);
            const d = Math.round((dayStart(r.start) - dayStart()) / 86400e3);
            return `<div class="rem-item"><button class="menu-item" data-open="${i}"><b>${r.series ? '↻ ' : ''}${esc(r.title)}</b>
            <small>${esc(ch?.name || '')} · ${dayLabel(d)} ${fmtTime(r.start)}</small></button>
            <button class="round small" data-del="${i}" title="${_t('Törlés')}">${ICON.close}</button></div>`;
          })
          .join('')}`
      : `<p class="muted pad">${_t('Nincs beállított emlékeztető. A műsorújságban vagy a csatorna adatlapján a csengő ikonnal adhatsz hozzá.')}</p>`}${rules.length
      ? `<h4>${_t('Minden adására')}</h4>${rules
          .map((s, i) => `<div class="rem-item"><span class="menu-item"><span><b>↻ ${esc(s.title)}</b><small>${esc(catalog.byId.get(s.channelId)?.name || '')}</small></span></span>
            <button class="round small" data-rule-del="${i}" title="${_t('Szabály törlése')}">${ICON.close}</button></div>`)
          .join('')}`
      : ''}<a class="menu-item" href="#/settings?section=reminders"><small>${_t('Értesítés beállításai…')}</small></a>`;
  $('#reminder-panel').onclick = (e) => {
    const del = e.target.closest('[data-del]');
    const op = e.target.closest('[data-open]');
    const ruleDel = e.target.closest('[data-rule-del]');
    if (ruleDel) {
      e.stopPropagation();
      const s = rules[Number(ruleDel.dataset.ruleDel)];
      toggleSeries(s.channelId, s.title);
    } else if (del) {
      e.stopPropagation();
      const r = upcoming[Number(del.dataset.del)];
      store.toggleReminder(r.channelId, r);
    } else if (op) {
      closeDropdowns();
      const r = upcoming[Number(op.dataset.open)];
      const ch = catalog.byId.get(r.channelId);
      const prog = epg.list(r.channelId).find((x) => x.start === r.start) || r;
      if (ch) openProgram(ch, prog);
    }
  };
}
bus.on('reminders', updateReminders);

// ---------------------------------------------------------------------------
// Térbeli (nyilas / távirányítós) navigáció
// ---------------------------------------------------------------------------
const FOCUSABLE = 'a[href], button:not([disabled]), input:not([type=hidden]), select, [tabindex="0"]';

function scopeEl() {
  if (modalOpen()) return topModalEl();
  if (!profilesEl.hidden) return profilesEl;
  if (player.active) return $('#player');
  const dd = $('.dropdown.open .dropdown-panel');
  if (dd) return dd;
  return document.body;
}

function candidates(scope) {
  return $$(FOCUSABLE, scope).filter((el) => {
    if (el.getAttribute('tabindex') === '-1') return false;
    // A sorcímek („Összes”) egérrel elérhetők, a nyilas lépkedést csak lassítanák.
    if (el.closest('.row-title') || el.closest('[aria-hidden="true"]')) return false;
    if (el.closest('[hidden], #player[hidden], .dropdown:not(.open) .dropdown-panel')) return false;
    if (scope === document.body && el.closest('#player, #modal-root, #profiles, #splash')) return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  });
}

// Háttérbe kerüléskor (telefonon alkalmazásváltás, tévén kikapcsolás) azonnal mentünk:
// a késleltetett mentés ilyenkor már nem biztos, hogy lefut.
const flushNow = () => {
  if (!started) return;
  player.saveVodProgress();
  store.flush();
};
document.addEventListener('visibilitychange', () => document.hidden && flushNow());
window.addEventListener('pagehide', flushNow);
window.__adasFlush = flushNow; // az Android-keret hívja, amikor az alkalmazás a háttérbe kerül
// Android: a háttérlejátszás értesítésének „Leállítás” gombja
window.__adasStopPlayback = () => player.active && player.close();
// Háttér-beállítás átadása a keretnek (háttérlejátszás; a kép a képben mód megszűnt)
const sendBgPrefs = () => api.setBackgroundPrefs?.(false, !!store.settings.bgAudio);
bus.on('settings', (k) => k === 'bgAudio' && sendBgPrefs());
setTimeout(sendBgPrefs, 1000);

// Szövegbevitel közben (telefonon a képernyő-billentyűzet nyitva) az alsó menüsáv elrejthető.
const isTypingField = (el) => el?.matches?.('input:not([type=checkbox]):not([type=range]):not([type=radio]), textarea');
document.addEventListener('focusin', (e) => document.body.classList.toggle('typing', isTypingField(e.target)));
document.addEventListener('focusout', () => setTimeout(() => document.body.classList.toggle('typing', isTypingField(document.activeElement)), 0));

let lastContentFocus = null;
document.addEventListener('focusin', (e) => {
  if (e.target.closest && !e.target.closest('#nav, #modal-root, #player')) lastContentFocus = e.target;
});

function moveFocus(dir) {
  const scope = scopeEl();
  const cur = document.activeElement;
  const list = candidates(scope);
  if (!list.length) return;
  if (!cur || cur === document.body || !scope.contains(cur)) {
    // kijelölés nélkül: a tartalom első (kiemelt) eleme – nem a fejléc logója
    const inView = list.filter((el) => !el.closest('#nav'));
    const first = list.find((el) => el.matches('.card, .btn.white, .profile')) || inView.find((el) => el.matches('.btn, .tab, button, a.card')) || inView[0] || list[0];
    first.focus();
    return;
  }
  // Előbb a saját területen (menü vagy tartalom) keresünk, csak ha ott nincs, lépünk át a másikba.
  const inNav = (el) => !!el.closest('#nav');
  const curNav = inNav(cur);
  if (!curNav) lastContentFocus = cur;
  const rail = document.body.dataset.layout === 'rail' && window.innerWidth >= 900 && window.innerHeight >= 560;
  const content = list.filter((el) => !inNav(el));
  let best;
  if (rail && curNav && dir === 'right') {
    // Az oldalsó sávból jobbra vissza oda, ahonnan a felhasználó jött (a sáv fókuszban kiszélesedik).
    // (Ha közben újrarajzolódott a nézet, ugyanazt a csatornát keressük meg.)
    const lastId = lastContentFocus?.dataset?.id;
    best =
      (lastContentFocus && content.includes(lastContentFocus) && lastContentFocus) ||
      (lastId && content.find((el) => el.dataset.id === lastId)) ||
      content.find((el) => el.matches('.card, .btn.white')) ||
      content[0];
  } else if (rail && !curNav && dir === 'left' && !pickDirection(cur, content, dir)) {
    best = $('#nav .links a.active') || $('#nav .links a');
  } else if (rail && !curNav && (dir === 'up' || dir === 'down')) {
    best = pickDirection(cur, content, dir);
  } else {
    // saját területen (tartalom / fejléc) bárhol; átlépni a másikba csak azonos sávban lehet
    best = pickDirection(cur, list.filter((el) => inNav(el) === curNav), dir) || pickDirectionIn(cur, list, dir, true);
  }
  // a tartalomból a beállítások oldalsávjára lépve az aktív (kiválasztott) fülre érkezünk
  if (best?.closest?.('.set-tabs') && !cur.closest('.set-tabs')) best = best.closest('.set-tabs').querySelector('.tab.active') || best;
  if (best) {
    best.focus({ preventScroll: true });
    best.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
  }
}

/**
 * A legközelebbi elem a megadott irányban. Vízszintesen előbb az azonos sávban (függőlegesen átfedő)
 * keresünk; ha ott nincs (pl. oldalsávról a tartalomra), bármilyen magasságban a legközelebbit.
 */
function pickDirection(cur, list, dir) {
  return pickDirectionIn(cur, list, dir, true) || ((dir === 'left' || dir === 'right') && pickDirectionIn(cur, list, dir, false)) || null;
}
function pickDirectionIn(cur, list, dir, sameBand) {
  const r = cur.getBoundingClientRect();
  const cx = r.left + r.width / 2;
  const cy = r.top + r.height / 2;
  let best = null;
  let bestScore = Infinity;
  for (const el of list) {
    if (el === cur || el.contains(cur) || cur.contains(el)) continue;
    const c = el.getBoundingClientRect();
    const x = c.left + c.width / 2;
    const y = c.top + c.height / 2;
    let primary;
    let secondary;
    // Vízszintesen csak az azonos „sávban” (függőlegesen átfedő) elemek jöhetnek szóba.
    if (sameBand && (dir === 'left' || dir === 'right') && (c.bottom <= r.top + 4 || c.top >= r.bottom - 4)) continue;
    if (dir === 'right') {
      if (c.left < r.right - 8 && x <= cx + 4) continue;
      primary = x - cx;
      secondary = Math.max(0, Math.abs(y - cy) - (r.height + c.height) / 4);
    } else if (dir === 'left') {
      if (c.right > r.left + 8 && x >= cx - 4) continue;
      primary = cx - x;
      secondary = Math.max(0, Math.abs(y - cy) - (r.height + c.height) / 4);
    } else if (dir === 'down') {
      if (c.top < r.bottom - 8) continue;
      primary = y - cy;
      secondary = Math.abs(x - cx);
    } else {
      if (c.bottom > r.top + 8) continue;
      primary = cy - y;
      secondary = Math.abs(x - cx);
    }
    if (primary <= 0) continue;
    const score = dir === 'left' || dir === 'right' ? primary + secondary * 6 : primary * 2 + secondary;
    if (score < bestScore) {
      bestScore = score;
      best = el;
    }
  }
  return best;
}

const ARROWS = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down' };

// TV-távirányítók gombkódjai (LG webOS; a 10009 a Samsung Tizen Vissza gombja) szabványos
// billentyűnevekre fordítva, hogy a többi kezelő ugyanúgy működjön.
const TV_KEYS = {
  461: 'Escape',
  10009: 'Escape',
  460: 'Subtitle', // LG távirányító felirat (CC) gombja
  415: 'MediaPlay',
  19: 'MediaPause',
  413: 'MediaStop',
  412: 'MediaRewind',
  417: 'MediaFastForward',
  403: 'ColorF0Red',
  404: 'ColorF1Green',
  405: 'ColorF2Yellow',
  406: 'ColorF3Blue',
  427: 'ChannelUp',
  428: 'ChannelDown',
};
document.addEventListener(
  'keydown',
  (e) => {
    const mapped = TV_KEYS[e.keyCode];
    if (!mapped || e.key === mapped) return;
    e.stopImmediatePropagation();
    e.preventDefault();
    (e.target || document).dispatchEvent(new KeyboardEvent('keydown', { key: mapped, bubbles: true, cancelable: true }));
  },
  true
);

function openSearch() {
  if (player.active) player.close();
  $('#search-box').classList.add('open');
  searchInput.focus();
  searchInput.select();
}

document.addEventListener('keydown', (e) => {
  // Amit egy kártya / párbeszéd már lekezelt (pl. Enter a kártyán = lejátszás), az itt nem fut le
  // még egyszer – különben az OK gomb a lejátszó indulása után rögtön a csatornalistát is megnyitná.
  if (e.defaultPrevented) return;
  const t = e.target;
  const typing = t.matches?.('input:not([type=checkbox]):not([type=range]), textarea');

  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
    e.preventDefault();
    if (player.active) player.close();
    $('#search-box').classList.add('open');
    searchInput.focus();
    searchInput.select();
    return;
  }
  if (e.key === 'F1' || (e.key === '?' && !typing)) {
    e.preventDefault();
    openHelp();
    return;
  }
  if (e.key === '/' && !typing && !player.active && !modalOpen()) {
    e.preventDefault();
    $('#search-box').classList.add('open');
    searchInput.focus();
    return;
  }

  if (multiOpen() && !modalOpen()) {
    if (multiKey(e)) e.preventDefault();
    return;
  }
  if (player.handleKey(e)) {
    e.preventDefault();
    return;
  }

  if (e.key === 'Escape' || ((e.key === 'Backspace' || e.key === 'BrowserBack') && !typing)) {
    if (typing && e.key === 'Escape') return t.blur();
    if (closeTopModal()) return e.preventDefault();
    if ($('.dropdown.open')) {
      closeDropdowns();
      return e.preventDefault();
    }
    if (!profilesEl.hidden && started && parseHash().name === 'profiles') {
      e.preventDefault();
      profilesEl.hidden = true;
      document.body.classList.remove('picking');
      return history.back();
    }
    if (started && parseHash().name !== 'home') {
      e.preventDefault();
      if (history.length > 1) history.back();
      else location.hash = '#/home';
    } else if (started && api.caps.exit) {
      e.preventDefault();
      confirmDialog(_t('Kilépsz az alkalmazásból?'), { ok: _t('Kilépés'), cancel: _t('Maradok') }).then((ok) => ok && api.exit());
    }
    return;
  }

  // Színes gombok a távirányítón
  if (started && !modalOpen() && e.key.startsWith('Color')) {
    e.preventDefault();
    const cardId = document.activeElement?.closest?.('.card')?.dataset.id;
    const ch = cardId && catalog.byId.get(cardId);
    if (e.key === 'ColorF0Red' && ch) {
      const added = store.toggleFavorite(ch.id);
      toast(added ? `${_t('{name} hozzáadva a kedvencekhez', { name: ch.name })}` : `${_t('{name} eltávolítva a kedvencek közül', { name: ch.name })}`);
    } else if (e.key === 'ColorF1Green') {
      if (ch) openInfo(ch);
      else location.hash = '#/guide';
    } else if (e.key === 'ColorF2Yellow') openSearch();
    else if (e.key === 'ColorF3Blue') location.hash = '#/favorites';
    return;
  }

  const dir = ARROWS[e.key];
  if (!dir) return;
  if (typing && (dir === 'left' || dir === 'right')) return;
  if (t.matches?.('select') || (t.matches?.('input[type=range]') && (dir === 'left' || dir === 'right'))) return;
  e.preventDefault();
  moveFocus(dir);
});

// A „Most” csíkok frissítése percenként.
setInterval(() => {
  $$('.card .bar i').forEach((i) => {
    const n = epg.now(i.closest('.card').dataset.id);
    if (n?.cur) i.style.width = (n.progress * 100).toFixed(1) + '%';
  });
  checkReminders();
}, 30000);

// ---------------------------------------------------------------------------
// Indítás
// ---------------------------------------------------------------------------
// Az indítóképernyő jobb alsó sarka: csak vicces, tévés hangulatú sorok – minden indításkor más
// sorrendben (véletlen keverés), egy indításon belül ismétlés nélkül.
const FUN_LINES = [
  _t('Antenna irányba állítása…'),
  _t('Távirányító keresése a kanapé párnái között…'),
  _t('Képcső bemelegítése…'),
  _t('Reklámok óvatos kikerülése…'),
  _t('Csatornák sorba állítása magasság szerint…'),
  _t('Műsorújság kisimítása…'),
  _t('Pattogatott kukorica pattogtatása…'),
  _t('Hangerő egyeztetése a szomszédokkal…'),
  _t('Hangyás kép elhessegetése…'),
  _t('Időjárás-jelentő felébresztése…'),
  _t('Kábelek kibogozása…'),
  _t('Bemondó nyakkendőjének megigazítása…'),
  _t('Spoilerek elrejtése a sorozatokból…'),
  _t('Mesecsatorna lefektetése…'),
  _t('Szinkronhangok bemelegítése…'),
  _t('Végtelen sorozatok megszámolása…'),
  _t('Tesztkép kifényesítése…'),
  _t('Rossz adás jobb belátásra bírása…'),
  _t('Elemcsere a távirányítóban…'),
  _t('Képernyő letörlése (porrongy előkészítve)…'),
  _t('Főcímdalok dúdolása…'),
  _t('A „mindjárt kezdődik” jelentésének kutatása…'),
  _t('Kanapé bemelegítése…'),
  _t('Hűtő bejárása reklámszünetre…'),
  _t('Ismétlések ismétlésének ellenőrzése…'),
  _t('Műholdak udvarias megszólítása…'),
  _t('Felirat-fordítók kávéval ellátása…'),
  _t('Csatornaszámok fejben tartása…'),
  _t('Szappanopera-szereplők családfájának kibogozása…'),
  _t('Sportközvetítő torkának olajozása…'),
  _t('Késő esti filmek ébren tartása…'),
  _t('Pixelek egyenként beállítása…'),
  _t('Az „utolsó rész, és megyek aludni” ígéret előkészítése…'),
  _t('Rajzfilmfigurák sorakoztatása…'),
  _t('Nagymama kedvenc csatornájának megkeresése…'),
  _t('Kvízműsor helyes válaszainak elrejtése…'),
];
const splashState = { lines: [], i: 0, timer: 0 };
function renderSplash() {
  const el = $('#splash-msg');
  if (el) el.textContent = splashState.lines[splashState.i % splashState.lines.length] || '';
}
/** (A betöltés technikai lépései nem jelennek meg – a sarokban csak a vicces sorok váltakoznak.) */
function splashMsg() {}
function startSplashStatus() {
  const l = FUN_LINES.slice();
  for (let i = l.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [l[i], l[j]] = [l[j], l[i]];
  }
  splashState.lines = l;
  splashState.i = 0;
  renderSplash();
  splashState.timer = setInterval(() => {
    splashState.i++;
    renderSplash();
  }, 1800);
}
function stopSplashStatus() {
  clearInterval(splashState.timer);
}

/**
 * Az indítóanimáció vége (a profilválasztó és a varázsló csak utána jelenik meg). Ahol van
 * getAnimations, a tényleges animációkat várjuk; a régi tévés motorokon a CSS-ben megadott hosszt
 * (a lap betöltésétől számítva, egy kis ráhagyással). Rejtett ablakban (pl. tálcára induláskor) az
 * animáció nem halad – ott legfeljebb SPLASH_MAX_MS-ig várunk, hogy az indulás ne akadjon meg.
 */
const SPLASH_ANIM_MS = 2200 + 150;
const SPLASH_MAX_MS = 4000;
function splashAnimDone() {
  if (!splash || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return Promise.resolve();
  const wait = (ms) => new Promise((r) => setTimeout(r, Math.max(0, ms - performance.now())));
  const anims = typeof splash.getAnimations === 'function' ? splash.getAnimations({ subtree: true }).filter((a) => a.effect?.getTiming?.().iterations !== Infinity) : null;
  if (anims && anims.length) return Promise.race([Promise.all(anims.map((a) => a.finished.catch(() => {}))), wait(SPLASH_MAX_MS)]).then(() => {});
  return wait(SPLASH_ANIM_MS);
}

async function loadWithRetry() {
  for (;;) {
    try {
      await loadCatalog({ onProgress: splashMsg });
      return;
    } catch (err) {
      console.error(err);
      splashMsg('');
      const box = html(`<div class="splash-error"><p>${_t('Nem sikerült letölteni a csatornalistát.<br>')}<small>${esc(err.message)}</small></p>
        <button class="btn primary">${_t('Újrapróbálás')}</button></div>`);
      $('#splash').append(box);
      await new Promise((r) => (box.querySelector('button').onclick = r));
      box.remove();
    }
  }
}

async function boot() {
  await store.load();
  if (IS_TV) document.body.classList.add('tv');
  // A nyelv a beállításokban is megvan (pl. szinkron / visszaállítás után): ha a helyi mentés hiányzik
  // vagy eltér, ezt vesszük át (újratöltéssel)
  // (a korábbi, nyelvválasztás előtti telepítések magyarul folytatják)
  if (!savedLang && !needsOnboarding()) {
    const l = store.settings.lang || 'hu';
    // (csak sikeres mentés után töltünk újra – nem írható tárolónál különben újratöltési hurok lenne)
    if (setLanguage(l, { reload: false }) && l !== lang) return void location.reload();
  }
  api.setLang?.(lang);
  await loadCustomThemes().catch((err) => console.warn('Saját témák', err));
  applyTheme();
  applySubStyle();
  // Első indítás: nyelv, saját profil, gyerekprofil (a csatornalista közben nem töltődik – a
  // hazai ország a választott nyelvtől függ)
  const onboarding = needsOnboarding();
  const animDone = splashAnimDone();
  if (onboarding) {
    await animDone;
    splash.classList.add('hide');
    await runOnboarding(profilesEl);
    splash.classList.remove('hide');
    applyTheme();
  }
  updateProfileButton();
  applySportMenu();
  startSplashStatus();
  const loading = loadWithRetry();
  // (a csatornalista közben már töltődik; a profilválasztó az indítóanimáció után jelenik meg)
  if (onboarding) markUnlocked(store.profile);
  else if (store.profiles.length > 1 || hasPin(store.profile)) await animDone.then(() => showProfiles(false)); // (egyetlen, de zárolt profilnál is)
  else markUnlocked(store.profile);
  await Promise.all([loading, animDone]);

  started = true;
  stopSplashStatus();
  splash.classList.add('hide');
  setTimeout(() => {
    splash.remove();
    // frissítéskeresés indításkor, csendben a háttérben – az indítóképernyő után, hogy az esetleges
    // értesítés ne takarásban jelenjen meg
    autoCheckUpdate().catch(() => {});
  }, 600);
  nav.hidden = false;
  updateReminders();
  if (!location.hash || location.hash.startsWith('#/profiles')) location.replace('#/home');
  route();

  epg.load().then(() => {
    syncSeries();
    checkReminders();
  });
  scheduleNative();

  // Asztali gép: háttérben futás a tálcán (az emlékeztetőkhöz), indítás a rendszerrel.
  const applyBackground = () =>
    api.setBackground?.({ enabled: !!store.settings.runInBackground, startWithSystem: !!store.settings.startWithSystem });
  applyBackground();
  bus.on('settings', (k) => (k === 'runInBackground' || k === 'startWithSystem') && applyBackground());
  api.onWentBackground?.(() => player.active && player.close()); // elrejtett ablakban ne szóljon tovább

  // Értesítésről indított alkalmazás: a megjelölt csatorna indul (LG webOS, Android).
  const launchChannel = (id) => id && setTimeout(() => window.__adasOpenChannel?.(id), 300);
  try {
    launchChannel(JSON.parse(window.PalmSystem?.launchParams || '{}').channel);
  } catch {}
  document.addEventListener('webOSRelaunch', (e) => launchChannel(e.detail?.channel));
  try {
    launchChannel(window.AdasAndroid?.takeLaunchChannel?.());
  } catch {}
  // A VOD-listák a háttérben töltődnek be (az első megnyitáskor már készen legyenek).
  // Előtte az asztali „packs” mappa kiegészítő csomagjai (ha közben a VOD már betöltött, újratölt).
  syncPackFolder();
  // betöltött / eltávolított csomag: a csatornalista, illetve a VOD újraépül
  // (ha a csatornalista vagy a VOD épp töltődik, a futó művelet még a régi listákkal dolgozik: utána még egyszer)
  const tvReload = () => refreshAll({ force: false, epgToo: true, quiet: true });
  bus.on('packs', (kind) => {
    if (kind === 'tv') refreshing() ? refreshAll({ quiet: true }).then(tvReload) : tvReload();
    else vod.loading ? vod.loading.then(() => loadVod()) : vod.ready && loadVod();
  });
  setTimeout(() => vodLists().length && loadVod(), 8000);
  // A VOD-listákban talált élő adások a csatornák közé kerülnek: ilyenkor újrafésüljük a csatornalistát.
  bus.on('vod-live', () => refreshAll({ force: false, epgToo: false, quiet: true }));
  setTimeout(() => (store.settings.ownSources || []).some((s) => s.enabled) && loadOwn(), 4000);
  setInterval(() => {
    if (Date.now() - epg.loadedAt > store.settings.epgRefreshHours * 3600e3) epg.load();
  }, 15 * 60e3);

  if (store.settings.resumeLast && store.profile.lastChannel) {
    const ch = catalog.byId.get(store.profile.lastChannel);
    if (ch) player.play(ch);
  }
}

boot();
