// Podcastok – a felület: a Podcast oldal (áttekintés, új epizódok, lejátszási sor, feliratkozások, letöltések,
// előzmények, kedvencek, felfedezés, statisztika, beállítások), a műsor oldala, az epizód adatlapja, a kis
// lejátszósáv és a teljes képernyős „Most szól” nézet. Az adatok a podcast.js-ben, a lejátszás a podplayer.js-ben.
import { menuOn } from './menus.js';
import { esc, html, bus, debounce, toast, hashHue, norm as normText } from './util.js';
import { api } from './api.js';
import { store } from './store.js';
import { ICON, openModal, confirmDialog, emptyState } from './components.js';
import {
  pod, podCfg, savePod, feeds, cachedFeed, refreshFeed, refreshAll, initPodcasts, subscribe, unsubscribe, isSubscribed, subOf, setSubOpt,
  epState, isPlayed, progressOf, markPlayed, toggleFav, enqueue, dequeue, moveInQueue, inQueue, clearInbox, searchPodcasts, topPodcasts,
  importOpml, toOpml, canDownload, downloadEp, deleteDownload, isDownloading, downloadedList, downloadedSize, findEp, POD_GENRES, POD_COUNTRIES,
} from './podcast.js';
import { countryName, countryFlag } from './catalog.js';
import { podPlayer, RATES } from './podplayer.js';
import { radioPlayer, audioFxAvailable } from './radioplayer.js';
import { player } from './player.js';
import { _t, LOCALE } from './i18n.js';

export const podMenuOn = () => menuOn('podcast');

// ---------------------------------------------------------------------------
// Formázás
// ---------------------------------------------------------------------------
const fmtSize = (b) => (b >= 1e9 ? `${(b / 1e9).toLocaleString(LOCALE, { maximumFractionDigits: 2 })} GB` : `${Math.max(0.1, b / 1e6).toLocaleString(LOCALE, { maximumFractionDigits: 1 })} MB`);
const fmtDur = (s) => {
  const m = Math.round((s || 0) / 60);
  if (!m) return '';
  return m < 60 ? _t('{m} perc', { m }) : _t('{h} óra {m} perc', { h: Math.floor(m / 60), m: m % 60 });
};
const fmtClock = (s) => {
  s = Math.max(0, Math.floor(s || 0));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = String(s % 60).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`;
};
const fmtDate = (t) => {
  if (!t) return '';
  const d = new Date(t);
  return d.toLocaleDateString(LOCALE, d.getFullYear() === new Date().getFullYear() ? { month: 'short', day: 'numeric' } : { year: 'numeric', month: 'short', day: 'numeric' });
};
/** A műsorjegyzet szövegként (a HTML nem kerül a felületre) és a benne lévő hivatkozások. */
function notesOf(h) {
  const doc = new DOMParser().parseFromString(`<div>${h || ''}</div>`, 'text/html');
  const links = [...doc.querySelectorAll('a[href]')].map((a) => ({ href: a.getAttribute('href'), text: a.textContent.trim() })).filter((l) => /^https?:\/\//i.test(l.href)).slice(0, 30);
  doc.querySelectorAll('br').forEach((b) => b.replaceWith('\n'));
  doc.querySelectorAll('p, li, div, h1, h2, h3, h4').forEach((b) => b.append('\n'));
  return { text: (doc.body.textContent || '').replace(/\n{3,}/g, '\n\n').trim(), links };
}
const cover = (src, cls = 'pimg') => (src ? `<img class="${cls}" src="${esc(src)}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.remove()" />` : '');
const skipIco = (n, back) => `<span class="pskip">${back ? '↺' : '↻'}<small>${n}</small></span>`;

// ---------------------------------------------------------------------------
// Kártyák és epizódsorok
// ---------------------------------------------------------------------------
/** Epizódkártya (sorokban – az elrendezések is ezeket rendezik át). */
export function epCardHtml(ep) {
  const pr = progressOf(ep.key);
  const st = epState(ep.key);
  return `<div class="card pcard" tabindex="0" data-pkey="${esc(ep.key)}">
    <div class="thumb" style="--h:${hashHue(ep.feedTitle || ep.title)}">${cover(ep.image)}
      ${st?.played ? `<span class="q">${_t('MEGHALLGATVA')}</span>` : st?.dl ? `<span class="q">⇩</span>` : ''}
      ${pr > 0.01 && !st?.played ? `<div class="bar"><i style="width:${(pr * 100).toFixed(1)}%"></i></div>` : ''}</div>
    <div class="meta"><div class="name">${esc(ep.title)}</div><div class="sub">${esc([ep.feedTitle, fmtDate(ep.pub), fmtDur(ep.dur)].filter(Boolean).join(' · '))}</div></div>
    <div class="pop"><div class="pop-btns"><button class="round white" data-pact="play" title="${_t('Lejátszás')}" tabindex="-1">${ICON.play}</button>
      <button class="round" data-pact="queue" title="${inQueue(ep.key) ? _t('Kivétel a sorból') : _t('A lejátszási sorba')}" tabindex="-1">${inQueue(ep.key) ? ICON.check : ICON.plus}</button><span class="grow"></span>
      <button class="round" data-pact="info" title="${_t('Részletek (I)')}" tabindex="-1">${ICON.chevron}</button></div>
      <div class="pop-line">${esc(notesOf(ep.desc).text.slice(0, 140))}</div></div>
  </div>`;
}
/** Műsorkártya (feliratkozás, keresési találat, toplista). */
function showCardHtml(s) {
  const sub = isSubscribed(s.url);
  return `<div class="card pcard pshow" tabindex="0" data-pfeed="${esc(s.url)}">
    <div class="thumb psq" style="--h:${hashHue(s.title || s.url)}">${cover(s.image)}${sub ? `<span class="q">✓</span>` : ''}</div>
    <div class="meta"><div class="name">${esc(s.title || s.url)}</div><div class="sub">${esc([s.author, s.genre].filter(Boolean).join(' · '))}</div></div>
    <div class="pop"><div class="pop-btns"><button class="round white" data-pact="open" title="${_t('Megnyitás')}" tabindex="-1">${ICON.chevron}</button>
      <button class="round" data-pact="sub" title="${sub ? _t('Leiratkozás') : _t('Feliratkozás')}" tabindex="-1">${sub ? ICON.check : ICON.plus}</button></div></div>
  </div>`;
}
/** Epizódsor (listák: műsor oldala, új epizódok, sor, előzmények, letöltések). */
function epRowHtml(ep, { queue = false, showFeed = true } = {}) {
  const st = epState(ep.key);
  const pr = progressOf(ep.key);
  const dl = st?.dl;
  const busy = isDownloading(ep.key);
  const info = [showFeed && ep.feedTitle, fmtDate(ep.pub), fmtDur(ep.dur), st?.played ? _t('meghallgatva') : st?.pos ? _t('{t}-nál tartasz', { t: fmtClock(st.pos) }) : ''].filter(Boolean).join(' · ');
  return `<div class="pep ${st?.played ? 'played' : ''} ${podPlayer.ep?.key === ep.key ? 'now' : ''}" data-pkey="${esc(ep.key)}">
    <button class="pep-art" data-pact="play" title="${_t('Lejátszás')}" style="--h:${hashHue(ep.feedTitle || ep.title)}">${cover(ep.image)}<span class="pep-play">${podPlayer.ep?.key === ep.key && podPlayer.playing ? ICON.pause || '❚❚' : ICON.play}</span></button>
    <div class="pep-main" data-pact="info"><b>${esc(ep.title)}</b><small>${esc(info)}</small>${pr > 0.01 && !st?.played ? `<div class="bar"><i style="width:${(pr * 100).toFixed(1)}%"></i></div>` : ''}</div>
    <div class="pep-btns">
      ${queue ? `<button class="round small" data-pact="up" title="${_t('Feljebb')}">▲</button><button class="round small" data-pact="down" title="${_t('Lejjebb')}">▼</button><button class="round small" data-pact="dequeue" title="${_t('Kivétel a sorból')}">${ICON.close}</button>` : `<button class="round small" data-pact="queue" title="${inQueue(ep.key) ? _t('Kivétel a sorból') : _t('A lejátszási sorba')}">${inQueue(ep.key) ? ICON.check : ICON.plus}</button>`}
      ${canDownload() ? (dl ? `<button class="round small" data-pact="dldel" title="${_t('Letöltés törlése')}">${ICON.trash}</button>` : `<button class="round small" data-pact="dl" title="${busy ? _t('Letöltés folyamatban…') : _t('Letöltés')}" ${busy ? 'disabled' : ''}>${busy ? '…' : '⇩'}</button>`) : ''}
      <button class="round small ${st?.fav ? 'on' : ''}" data-pact="fav" title="${st?.fav ? _t('Eltávolítás a kedvencek közül') : _t('Kedvencekhez')}">★</button>
      <button class="round small ${st?.played ? 'on' : ''}" data-pact="played" title="${st?.played ? _t('Meghallgatatlannak jelölés') : _t('Meghallgatottnak jelölés')}">✓</button>
    </div></div>`;
}
const rowHtml = (title, inner, href = '') =>
  `<section class="row prow"><h2 class="row-title">${href ? `<a href="${href}"><span class="rt-text">${esc(title)}</span></a>` : `<span class="rt-text">${esc(title)}</span>`}</h2><div class="row-wrap"><div class="row-track">${inner}</div></div></section>`;

// ---------------------------------------------------------------------------
// Események a kártyákon / sorokon
// ---------------------------------------------------------------------------
function epFrom(el) {
  const key = el.closest('[data-pkey]')?.dataset.pkey;
  return key ? findEp(key) : null;
}
document.addEventListener('click', (e) => {
  const host = e.target.closest('[data-pkey], [data-pfeed]');
  if (!host || e.target.closest('.modal-close')) return;
  const act = e.target.closest('[data-pact]')?.dataset.pact || (host.matches('.pcard') ? (host.dataset.pfeed ? 'open' : 'play') : '');
  if (!act) return;
  e.preventDefault();
  e.stopPropagation();
  if (host.dataset.pfeed) {
    const url = host.dataset.pfeed;
    if (act === 'sub') {
      if (isSubscribed(url)) unsubscribe(url);
      else subscribe(searchCache.get(url) || { url });
      toast(isSubscribed(url) ? _t('Feliratkoztál') : _t('Leiratkoztál'));
      rerender();
    } else location.hash = '#/podcast?feed=' + encodeURIComponent(url);
    return;
  }
  const ep = epFrom(host);
  if (!ep) return;
  if (act === 'play') podPlayer.ep?.key === ep.key ? podPlayer.toggle() : podPlayer.play(ep);
  else if (act === 'info') openEpisode(ep);
  else if (act === 'queue') {
    if (inQueue(ep.key)) dequeue(ep.key);
    else enqueue(ep);
    toast(inQueue(ep.key) ? _t('A lejátszási sorba került') : _t('Kikerült a sorból'));
  } else if (act === 'dequeue') dequeue(ep.key);
  else if (act === 'up' || act === 'down') moveInQueue(ep.key, act === 'up' ? -1 : 1);
  else if (act === 'fav') toast(toggleFav(ep) ? _t('Kedvencekhez adva') : _t('Eltávolítva a kedvencek közül'));
  else if (act === 'played') markPlayed(ep, !isPlayed(ep.key));
  else if (act === 'dldel') deleteDownload(ep).then((ok) => toast(ok ? _t('A letöltött fájl törölve: {title}', { title: ep.title }) : _t('A fájl nem törölhető: {title}', { title: ep.title })));
  else if (act === 'dl' && !epState(ep.key)?.dl)
    downloadEp(ep)
      .then(() => toast(_t('Letöltve: {title}', { title: ep.title })))
      .catch((err) => toast(_t('A letöltés nem sikerült: {e}', { e: err.message || err })));
  refreshRows();
});
document.addEventListener('keydown', (e) => {
  const c = document.activeElement?.closest?.('.pcard');
  if (!c || e.target.matches?.('input, select, textarea')) return;
  if (e.key === 'Enter') {
    e.preventDefault();
    c.click();
  } else if ((e.key === 'i' || e.key === 'I') && c.dataset.pkey) {
    e.preventDefault();
    const ep = epFrom(c);
    if (ep) openEpisode(ep);
  }
});
/** Az oldal újrarajzolása (ha a Podcast oldal látszik). */
const here = () => location.hash.startsWith('#/podcast');
// (a podcast-elemek a Kedvencek oldalon és a Beállításokban is megjelennek)
const hostsPod = (el) => here() || !!el?.closest?.('#podcast-settings, .fav-pod');
let viewEl = null;
let lastParams = null;
const rerender = debounce(() => here() && viewEl?.isConnected && renderPodcast(viewEl, lastParams || new URLSearchParams()), 120);
/** Csak az állapotjelzések frissítése (gombok, haladás) újrarajzolás nélkül – a görgetés és a fókusz marad. */
const refreshRows = debounce(() => {
  if (!here() && !document.querySelector('#view .fav-pod')) return;
  document.querySelectorAll('#view .pep[data-pkey]').forEach((r) => {
    const ep = findEp(r.dataset.pkey);
    if (!ep) return;
    const fresh = html(epRowHtml(ep, { queue: r.closest('.pq-list') != null, showFeed: !r.closest('.pfeed-eps') }));
    if (r.contains(document.activeElement)) return;
    r.replaceWith(fresh);
  });
}, 150);
for (const ev of ['pod-state', 'pod-queue', 'pod-dl']) bus.on(ev, refreshRows);
for (const ev of ['pod-subs', 'pod-refreshed']) bus.on(ev, rerender);
// (a Kedvencek oldalon a feliratkozások része is frissül)
bus.on('pod-subs', debounce(() => {
  const old = document.querySelector('#view .fav-pod');
  if (!old || old.contains(document.activeElement)) return;
  const fresh = podFavsSection();
  if (fresh) old.replaceWith(fresh);
  else old.remove();
}, 120));
bus.on('pod-feed', (url) => here() && (lastParams?.get('feed') === url || !lastParams?.get('feed')) && rerender());
bus.on('pod-player', (k) => (k === 'start' || k === 'stop' || k === 'state') && refreshRows());

// ---------------------------------------------------------------------------
// A Podcast oldal
// ---------------------------------------------------------------------------
const TABS = () => [
  ['home', _t('Áttekintés')],
  ['inbox', _t('Új epizódok')],
  ['queue', _t('Lejátszási sor')],
  ['subs', _t('Feliratkozások')],
  canDownload() && ['downloads', _t('Letöltések')],
  ['hist', _t('Előzmények')],
  ['discover', _t('Felfedezés')],
  ['stats', _t('Statisztika')],
].filter(Boolean);
const tabsHtml = (cur) => {
  const d = pod();
  const n = { inbox: d.inbox.length, queue: d.queue.length };
  return `<div class="tv-head"><div class="tabs pod-tabs">${TABS().map(([id, l]) => `<a class="tab ${cur === id ? 'active' : ''}" href="#/podcast?tab=${id}">${esc(l)}${n[id] ? ` <small>${n[id]}</small>` : ''}</a>`).join('')}</div></div>`;
};
const searchCache = new Map(); // keresési / toplista-találatok (feliratkozáskor a cím, kép)
let renderSeq = 0; // (a késve érkező, már elavult műsoroldal-rajzolás nem írja felül az újabbat)

export function renderPodcast(view, params) {
  viewEl = view;
  lastParams = params;
  const feed = params.get('feed');
  if (feed) return renderFeed(view, feed);
  const tab = params.get('tab') || 'home';
  renderSeq++;
  // (rögzített választás – a címből jövő név nem hívhat tetszőleges függvényt; ismeretlen névre az Áttekintés)
  switch (tab) {
    case 'inbox': return tabInbox(view, params);
    case 'queue': return tabQueue(view, params);
    case 'subs': return tabSubs(view, params);
    case 'downloads': return tabDownloads(view, params);
    case 'hist': return tabHist(view, params);
    // (a kedvenc epizódok a Kedvencek oldalon, a beállítások a fő Beállításokban – a régi címek oda vezetnek)
    case 'favs': return void location.replace('#/favorites');
    case 'settings': return void location.replace('#/settings?g=podcast');
    case 'discover': return tabDiscover(view, params);
    case 'stats': return tabStats(view, params);
    default: return tabHome(view, params);
  }
}

function tabHome(view) {
  const d = pod();
  const started = d.hist.filter((x) => epState(x.key)?.pos && !isPlayed(x.key)).slice(0, 20);
  const subs = d.subs.slice().sort((a, b) => (feeds.get(b.url)?.eps[0]?.pub || 0) - (feeds.get(a.url)?.eps[0]?.pub || 0));
  const latest = subs.flatMap((s) => (feeds.get(s.url)?.eps || []).slice(0, 3)).sort((a, b) => b.pub - a.pub).slice(0, 30);
  view.innerHTML = `<div class="rows pod-rows">${tabsHtml('home')}
    ${!d.subs.length ? `<section class="row pod-empty">${emptyState(_t('Még nincs feliratkozásod'), _t('Keress műsort, nézd meg a toplistát, vagy hozd át a feliratkozásaidat egy másik podcast-alkalmazásból (OPML).'), `<a class="btn primary" href="#/podcast?tab=discover">${_t('Felfedezés')}</a>`)}</section>` : ''}
    ${started.length ? rowHtml(_t('Folytatás'), started.map(epCardHtml).join(''), '#/podcast?tab=hist') : ''}
    ${d.inbox.length ? rowHtml(_t('Új epizódok'), d.inbox.slice(0, 30).map(epCardHtml).join(''), '#/podcast?tab=inbox') : ''}
    ${d.queue.length ? rowHtml(_t('Lejátszási sor'), d.queue.slice(0, 30).map(epCardHtml).join(''), '#/podcast?tab=queue') : ''}
    ${subs.length ? rowHtml(_t('Feliratkozásaid'), subs.map(showCardHtml).join(''), '#/podcast?tab=subs') : ''}
    ${latest.length ? rowHtml(_t('Legújabb epizódok'), latest.map(epCardHtml).join('')) : ''}
    <div class="pod-top-slot"></div></div>`;
  const slot = view.querySelector('.pod-top-slot');
  topPodcasts(30)
    .then((list) => {
      if (!slot.isConnected || !list.length) return;
      list.forEach((s) => searchCache.set(s.url, s));
      slot.replaceWith(html(rowHtml(_t('Toplista'), list.map(showCardHtml).join(''), '#/podcast?tab=discover')));
    })
    .catch(() => {});
  if (d.subs.length && !feeds.size) initPodcasts().catch(() => {});
}

function listPage(view, tab, title, list, { empty, tools = '', queue = false, info = '' } = {}) {
  view.innerHTML = `<div class="page pod-page">${tabsHtml(tab)}
    <div class="page-head"><h1>${esc(title)}</h1><span class="muted">${_t('{n} epizód', { n: list.length })}${info ? ' · ' + esc(info) : ''}</span><span class="pod-tools">${tools}</span></div>
    ${list.length ? `<div class="pep-list ${queue ? 'pq-list' : ''}">${list.slice(0, 300).map((ep) => epRowHtml(ep, { queue })).join('')}</div>` : `<p class="muted">${esc(empty)}</p>`}</div>`;
}
function tabInbox(view) {
  const list = pod().inbox;
  listPage(view, 'inbox', _t('Új epizódok'), list, {
    empty: _t('Nincs új epizód. A feliratkozásaid új részei ide kerülnek.'),
    tools: list.length ? `<button class="btn small" data-pt="inbox-played">${_t('Mind meghallgatva')}</button><button class="btn small" data-pt="inbox-clear">${_t('Lista ürítése')}</button><button class="btn small" data-pt="inbox-queue">${_t('Mind a sorba')}</button>` : `<button class="btn small" data-pt="refresh">${ICON.refresh} ${_t('Frissítés@@újratöltés')}</button>`,
  });
}
function tabQueue(view) {
  const list = pod().queue;
  const total = list.reduce((s, x) => s + Math.max(0, (x.dur || 0) - (epState(x.key)?.pos || 0)), 0);
  listPage(view, 'queue', _t('Lejátszási sor'), list, {
    queue: true,
    empty: _t('A sor üres. Az epizódok + gombjával vehetsz fel; a lejátszás a sor szerint folytatódik.'),
    tools: list.length ? `<span class="muted">${esc(_t('még {t}', { t: fmtDur(total) || '–' }))}</span><button class="btn small primary" data-pt="queue-play">${ICON.play} ${_t('Lejátszás')}</button><button class="btn small" data-pt="queue-clear">${_t('Sor ürítése')}</button>` : '',
  });
}
function tabSubs(view) {
  const d = pod();
  const subs = d.subs.slice().sort((a, b) => (a.title || '').localeCompare(b.title || ''));
  view.innerHTML = `<div class="page pod-page">${tabsHtml('subs')}
    <div class="page-head"><h1>${_t('Feliratkozások')}</h1><span class="muted">${_t('{n} műsor', { n: subs.length })}</span>
      <span class="pod-tools"><button class="btn small" data-pt="refresh">${ICON.refresh} ${_t('Mind frissítése')}</button><button class="btn small" data-pt="opml-export" ${subs.length ? '' : 'disabled'}>${_t('Exportálás (OPML)')}</button></span></div>
    ${subs.length ? `<div class="grid pod-grid">${subs.map((s) => showCardHtml({ ...s, ...(feeds.get(s.url) ? { image: feeds.get(s.url).image || s.image } : null) })).join('')}</div>` : `<p class="muted">${_t('Még nincs feliratkozásod.')} <a href="#/podcast?tab=discover">${_t('Felfedezés')} ›</a></p>`}</div>`;
}
function tabDownloads(view) {
  const list = downloadedList();
  const played = list.filter((ep) => isPlayed(ep.key)).length;
  listPage(view, 'downloads', _t('Letöltések'), list, {
    empty: _t('Nincs letöltött epizód. A ⇩ gombbal tölthetsz le – a letöltött epizód internet nélkül is szól.'),
    info: list.length ? _t('{size} a tárhelyen', { size: fmtSize(downloadedSize()) }) : '',
    tools: `${api.podFolder ? `<button class="btn small" data-pt="dl-folder">${_t('Mappa megnyitása')}</button>` : ''}${played ? `<button class="btn small" data-pt="dl-del-played">${_t('Meghallgatottak törlése ({n})', { n: played })}</button>` : ''}${list.length ? `<button class="btn small" data-pt="dl-del-all">${_t('Összes törlése')}</button>` : ''}`,
  });
}
function tabHist(view) {
  listPage(view, 'hist', _t('Előzmények'), pod().hist, { empty: _t('Még nem hallgattál podcastot.'), tools: pod().hist.length ? `<button class="btn small" data-pt="hist-clear">${_t('Előzmények törlése')}</button>` : '' });
}
/** A Kedvencek oldal podcast-része: a feliratkozott műsorok és a kedvenc epizódok (ha van ilyen). */
export function podFavsSection() {
  if (!store.profile) return null;
  const d = pod();
  const subs = d.subs.slice().sort((a, b) => (a.title || '').localeCompare(b.title || '', LOCALE));
  const list = d.favs;
  if (!subs.length && !list.length) return null;
  return html(`<div class="fav-pod">
    ${subs.length ? `<div class="page-head sub"><h2>${_t('Podcast-feliratkozások')}</h2><span class="muted">${_t('{n} műsor', { n: subs.length })}</span><a class="btn small" href="#/podcast?tab=subs">${_t('Kezelés')}</a></div>
      <div class="grid pod-grid">${subs.map((s) => showCardHtml({ ...s, ...(feeds.get(s.url)?.image ? { image: feeds.get(s.url).image } : null) })).join('')}</div>` : ''}
    ${list.length ? `<div class="page-head sub"><h2>${_t('Kedvenc podcast-epizódok')}</h2><span class="muted">${_t('{n} epizód', { n: list.length })}</span></div>
      <div class="pep-list">${list.slice(0, 300).map((ep) => epRowHtml(ep)).join('')}</div>` : ''}</div>`);
}

// ---------------------------------------------------------------------------
// Keresés (a fő Keresés oldal Podcastok része): a feliratkozások és epizódjaik helyben, a katalógus online
// ---------------------------------------------------------------------------
const podTokens = (q) => normText(q).split(/\s+/).filter(Boolean);
const hit = (tokens, ...parts) => {
  const t = normText(parts.filter(Boolean).join(' '));
  return tokens.every((x) => t.includes(x));
};
/** Helyi találatok: feliratkozott műsorok és az epizódjaik (cím, szerző, műsor neve). */
function podLocalHits(q) {
  const tokens = podTokens(q);
  if (!tokens.length || !store.profile) return { shows: [], eps: [] };
  const d = pod();
  const shows = d.subs.filter((s) => hit(tokens, s.title, s.author));
  const eps = d.subs
    .flatMap((s) => feeds.get(s.url)?.eps || [])
    .filter((ep) => hit(tokens, ep.title, ep.feedTitle))
    .sort((a, b) => (b.pub || 0) - (a.pub || 0));
  return { shows, eps };
}
/** A helyi podcast-találatok száma (a Keresés oldal fülén; az online találatok később jönnek). */
export function podSearchCount(q) {
  if (!podMenuOn()) return 0;
  const { shows, eps } = podLocalHits(q);
  return shows.length + eps.length;
}
/** A Keresés oldal Podcastok része (null, ha a Podcast menüpont ki van kapcsolva). */
export function podSearchSection(q, { limit = 18 } = {}) {
  if (!podMenuOn() || !podTokens(q).length) return null;
  const { shows, eps } = podLocalHits(q);
  const el = html(`<section class="sc-pod"><h2 class="section-title">${_t('Podcastok')} <a class="btn small" href="#/podcast?tab=discover&amp;q=${encodeURIComponent(q)}">${_t('Továbbiak a Felfedezésben ›')}</a></h2>
    ${shows.length ? `<h3 class="row-title">${_t('Feliratkozásaid')}</h3><div class="grid pod-grid">${shows.slice(0, limit).map(showCardHtml).join('')}</div>` : ''}
    ${eps.length ? `<h3 class="row-title">${_t('Epizódok a feliratkozásaidból')}</h3><div class="pep-list">${eps.slice(0, limit).map((ep) => epRowHtml(ep)).join('')}</div>` : ''}
    <div class="sc-pod-online"><div class="spinner small"></div></div></section>`);
  const box = el.querySelector('.sc-pod-online');
  const subbed = new Set(shows.map((s) => s.url));
  searchPodcasts(q)
    .then((list) => {
      if (!box.isConnected) return;
      list = list.filter((s) => !s.direct && !subbed.has(s.url));
      list.forEach((s) => searchCache.set(s.url, s));
      // (a Keresés oldal Podcast fülén az online találatok is számítanak)
      const n = document.querySelector('.search-tabs [data-st="pod"] .muted');
      if (n) n.textContent = String(shows.length + eps.length + list.length);
      box.innerHTML = list.length ? `<h3 class="row-title">${_t('Műsorok a podcast-katalógusból')}</h3><div class="grid pod-grid">${list.slice(0, limit).map(showCardHtml).join('')}</div>` : shows.length || eps.length ? '' : `<p class="muted">${_t('Nincs podcast-találat.')}</p>`;
    })
    .catch(() => box.isConnected && (box.innerHTML = ''));
  return el;
}

// Felfedezés – a TV Felfedezés mintájára: kereső és szűrők (téma, ország), szűrő nélkül téma- és országcsempék,
// alattuk a toplista; témára / országra szűrve annak toplistája, kereséskor a találatok (a téma szerint szűkítve).
const genreName = (id) => POD_GENRES.find(([g]) => g === id)?.[1] || '';
const podCountries = () => {
  const home = (store.settings.homeCountry || 'HU').toUpperCase();
  return [home, ...POD_COUNTRIES.filter((c) => c !== home)];
};
const GENRE_ICO = { 1489: '📰', 1324: '🏛️', 1303: '😄', 1488: '🔎', 1487: '📜', 1533: '🔬', 1318: '💻', 1321: '💼', 1304: '🎓', 1512: '🏃', 1545: '⚽', 1309: '🎬', 1310: '🎵', 1301: '🎨', 1483: '📖', 1502: '🎲', 1305: '🧸', 1314: '🕊️', 1511: '🗳️' };
function tabDiscover(view, params) {
  const home = (store.settings.homeCountry || 'HU').toUpperCase();
  const f = { q: params.get('q') || '', g: params.get('g') || '', c: (params.get('c') || '').toUpperCase() };
  if (f.g && !genreName(f.g)) f.g = '';
  if (f.c && !/^[A-Z]{2}$/.test(f.c)) f.c = '';
  const cc = f.c || home;
  const any = f.q || f.g || f.c;
  const opts = (items, sel, all) => `<option value="">${esc(all)}</option>` + items.map(([v, l]) => `<option value="${esc(v)}" ${v === sel ? 'selected' : ''}>${esc(l)}</option>`).join('');
  const title = [f.g && genreName(f.g), f.c && countryName(f.c), f.q && `„${f.q}”`].filter(Boolean).join(' · ') || _t('Felfedezés');
  view.innerHTML = `<div class="page pod-page pod-discover">${tabsHtml('discover')}
    <div class="page-head"><h1>${esc(title)}</h1><span class="muted pod-disc-n"></span></div>
    <form class="filters pod-filters">
      <input class="input" name="q" type="search" value="${esc(f.q)}" placeholder="${_t('Műsor keresése név szerint, vagy egy RSS-cím…')}" aria-label="${_t('Podcast keresése')}" />
      <select name="g" aria-label="${_t('Téma')}">${opts(POD_GENRES.slice().sort((a, b) => a[1].localeCompare(b[1], LOCALE)), f.g, _t('Minden téma'))}</select>
      <select name="c" aria-label="${_t('Ország')}">${opts(podCountries().map((c) => [c, `${countryFlag(c)} ${countryName(c) || c}`.trim()]), f.c, _t('Ország: {name}', { name: countryName(home) || home }))}</select>
      ${any ? `<a class="btn small" href="#/podcast?tab=discover">${_t('Szűrők törlése')}</a>` : ''}
    </form>
    <div class="pod-disc-extra"></div>
    <div class="pod-results"><div class="spinner small"></div></div>
    <div class="pod-import"><span class="muted">${_t('Feliratkozások áthozása másik alkalmazásból:')}</span> <label class="btn small">${_t('OPML-fájl betöltése…')}<input type="file" accept=".opml,.xml,text/xml,text/x-opml" data-pt-file="opml" hidden /></label></div></div>`;
  const form = view.querySelector('.pod-filters');
  const apply = (replace) => {
    // (RSS-cím: egyenesen a műsor oldala)
    if (/^https?:\/\//i.test(form.q.value.trim())) return void (location.hash = '#/podcast?feed=' + encodeURIComponent(form.q.value.trim()));
    const q = new URLSearchParams({ tab: 'discover' });
    for (const [k, v] of new FormData(form)) if (String(v).trim()) q.set(k, String(v).trim());
    const h = '#/podcast?' + q;
    if (replace) location.replace(h);
    else location.hash = h;
  };
  form.onchange = (e) => e.target.name !== 'q' && apply(false);
  form.onsubmit = (e) => (e.preventDefault(), apply(false));
  if (!any) {
    view.querySelector('.pod-disc-extra').append(
      html(`<section class="row"><h2 class="row-title">${_t('Témák')}</h2><div class="row-wrap"><div class="row-track tiles">${POD_GENRES.map(([id, name]) => `<a class="tile cat" href="#/podcast?tab=discover&amp;g=${id}" style="--h:${hashHue(id + 'pod')}"><span class="flag">${GENRE_ICO[id] || '🎙️'}</span><b>${esc(name)}</b></a>`).join('')}</div></div></section>`),
      html(`<section class="row"><h2 class="row-title">${_t('Országok toplistái')}</h2><div class="row-wrap"><div class="row-track tiles">${podCountries().map((c) => `<a class="tile" href="#/podcast?tab=discover&amp;c=${c}" style="--h:${hashHue(c)}"><span class="flag">${countryFlag(c) || `<span class="cc">${esc(c)}</span>`}</span><b>${esc(countryName(c) || c)}</b></a>`).join('')}</div></div></section>`)
    );
  }
  const res = view.querySelector('.pod-results');
  const show = (list, head) => {
    if (!res.isConnected) return;
    list.forEach((s) => searchCache.set(s.url, s));
    view.querySelector('.pod-disc-n').textContent = _t('{n} műsor', { n: list.length });
    res.innerHTML = list.length ? `<h2 class="row-title">${esc(head)}</h2><div class="grid pod-grid">${list.map(showCardHtml).join('')}</div>` : `<p class="muted">${_t('Nincs találat.')}</p>`;
  };
  const fail = (msg) => res.isConnected && (res.innerHTML = `<p class="warn">${esc(msg)}</p>`);
  if (f.q)
    searchPodcasts(f.q, { cc })
      .then((list) => show(f.g ? list.filter((s) => s.genreId === f.g) : list, _t('Találatok')))
      .catch(() => fail(_t('A keresés most nem érhető el.')));
  else
    topPodcasts(f.g ? 100 : 50, { genre: f.g, cc })
      .then((list) => show(list, f.g ? _t('Toplista – {name}', { name: genreName(f.g) }) : _t('Toplista – {name}', { name: countryName(cc) || cc })))
      .catch(() => fail(_t('A toplista most nem érhető el.')));
}

function tabStats(view) {
  const d = pod();
  const rows = Object.entries(d.stats)
    .map(([url, sec]) => ({ url, sec, title: subOf(url)?.title || feeds.get(url)?.title || url }))
    .sort((a, b) => b.sec - a.sec);
  const total = rows.reduce((s, r) => s + r.sec, 0);
  const played = Object.values(d.eps).filter((s) => s.played).length;
  const max = rows[0]?.sec || 1;
  view.innerHTML = `<div class="page pod-page">${tabsHtml('stats')}
    <div class="page-head"><h1>${_t('Statisztika')}</h1></div>
    <div class="pod-stat-top"><div><small>${_t('Összes hallgatás')}</small><b>${esc(fmtDur(total) || '–')}</b></div><div><small>${_t('Meghallgatott epizód')}</small><b>${played}</b></div><div><small>${_t('Feliratkozás')}</small><b>${d.subs.length}</b></div></div>
    ${rows.length ? `<ol class="pod-stats">${rows.slice(0, 40).map((r) => `<li><a href="#/podcast?feed=${encodeURIComponent(r.url)}">${esc(r.title)}</a><span class="pbar"><i style="width:${((r.sec / max) * 100).toFixed(1)}%"></i></span><span class="muted">${esc(fmtDur(r.sec))}</span></li>`).join('')}</ol>` : `<p class="muted">${_t('Még nincs hallgatási adat.')}</p>`}</div>`;
}

/** A podcast-beállítások – a fő Beállítások „Podcastok” csoportjában (profilonként). */
export function renderPodcastSettings(el) {
  if (!el || !store.profile) return;
  const c = podCfg();
  const sel = (key, opts, label, desc) =>
    `<label class="setting"><span><b>${esc(label)}</b>${desc ? `<small>${esc(desc)}</small>` : ''}</span><select data-pc="${key}">${opts.map(([v, l]) => `<option value="${v}" ${String(c[key]) === String(v) ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select></label>`;
  const chk = (key, label, desc, val = c[key]) => `<label class="setting"><span><b>${esc(label)}</b>${desc ? `<small>${esc(desc)}</small>` : ''}</span><input type="checkbox" class="switch" data-pc="${key}" ${val ? 'checked' : ''} /></label>`;
  el.innerHTML = `<h2>${_t('Podcastok')} <button class="help-link" data-help="podcast" title="${_t('Súgó')}">?</button></h2>
    <p class="muted">${esc(_t('A(z) {name} profil podcast-beállításai.', { name: store.profile.name }))}</p>
    ${sel('refreshHours', [[1, _t('óránként')], [3, _t('3 óránként')], [6, _t('6 óránként')], [12, _t('12 óránként')], [24, _t('naponta')]], _t('Új epizódok keresése'), _t('Ilyen gyakran nézi meg a feliratkozásaid új részeit (értesítéssel).'))}
    ${sel('speed', RATES.map((r) => [r, r + '×']), _t('Alapértelmezett sebesség'), _t('Műsoronként külön is állítható (a műsor oldalán).'))}
    ${sel('skipBack', [[5, '5 mp'], [10, '10 mp'], [15, '15 mp'], [30, '30 mp']], _t('Visszaugrás'))}
    ${sel('skipFwd', [[10, '10 mp'], [15, '15 mp'], [30, '30 mp'], [45, '45 mp'], [60, '60 mp']], _t('Előreugrás'))}
    ${chk('continuous', _t('Folyamatos lejátszás'), _t('Egy epizód végén a lejátszási sor következő eleme indul.'))}
    ${chk('skipSilence', _t('Csend átugrása'), audioFxAvailable ? _t('A csendes részeket gyorsítva játssza le (műsoronként is állítható).') : _t('Ezen az eszközön nem érhető el.'))}
    ${canDownload() ? chk('autoDelete', _t('Letöltés törlése meghallgatás után'), _t('A meghallgatott, letöltött epizód fájlja törlődik.')) : ''}
    ${canDownload() && downloadedList().length ? `<div class="setting"><span><b>${_t('Letöltött epizódok')}</b><small>${esc(_t('{n} epizód, {size}', { n: downloadedList().length, size: fmtSize(downloadedSize()) }))}</small></span><span><a class="btn small" href="#/podcast?tab=downloads">${_t('Megnyitás')}</a> <button class="btn small" data-pt="dl-del-all">${_t('Összes törlése')}</button></span></div>` : ''}
    ${chk('podcastMenu', _t('Podcast a menüben'), _t('Kikapcsolva a feliratkozások sem frissülnek, és nem jön értesítés új epizódról.'), store.settings.podcastMenu !== false)}
    <h3>${_t('Feliratkozások átvitele')}</h3>
      <p class="muted">${_t('Más podcast-alkalmazásba (AntennaPod, Pocket Casts…) vagy onnan: OPML-fájllal. A feliratkozások a beállítások mentésével és a szinkronnal is átkerülnek.')}</p>
      <div class="inline"><button class="btn small" data-pt="opml-export">${_t('Exportálás (OPML)')}</button><label class="btn small">${_t('OPML-fájl betöltése…')}<input type="file" accept=".opml,.xml,text/xml,text/x-opml" data-pt-file="opml" hidden /></label></div>`;
}

// ---------------------------------------------------------------------------
// A műsor oldala
// ---------------------------------------------------------------------------
const feedUi = { filter: 'all', sort: 'new', q: '', limit: 60 };
async function renderFeed(view, url) {
  const seq = ++renderSeq;
  let f = feeds.get(url) || (await cachedFeed(url));
  if (seq !== renderSeq) return;
  if (!f) {
    view.innerHTML = `<div class="page pod-page">${tabsHtml('')}<div class="spinner"></div></div>`;
    try {
      f = await refreshFeed(url);
    } catch (err) {
      if (!here() || seq !== renderSeq) return;
      view.innerHTML = `<div class="page pod-page">${tabsHtml('')}${emptyState(_t('A műsor nem tölthető be'), esc(err.message || String(err)), `<a class="btn" href="#/podcast">${_t('Vissza')}</a>`)}</div>`;
      return;
    }
  } else if (Date.now() - (f.at || 0) > podCfg().refreshHours * 3600e3) refreshFeed(url).catch(() => {});
  if (!here() || seq !== renderSeq) return;
  const sub = subOf(url);
  const set = sub?.set || {};
  const notes = notesOf(f.desc);
  const t = feedUi.q.trim().toLowerCase();
  let eps = f.eps.filter((e) => {
    const s = epState(e.key);
    if (t && !e.title.toLowerCase().includes(t)) return false;
    return feedUi.filter === 'all' || (feedUi.filter === 'unplayed' && !s?.played) || (feedUi.filter === 'started' && s?.pos && !s?.played) || (feedUi.filter === 'dl' && s?.dl) || (feedUi.filter === 'fav' && s?.fav) || (feedUi.filter === 'played' && s?.played);
  });
  if (feedUi.sort === 'old') eps = eps.slice().reverse();
  const filters = [['all', _t('Mind')], ['unplayed', _t('Meghallgatatlan')], ['started', _t('Félbehagyott')], ['played', _t('Meghallgatott')], ['fav', _t('Kedvenc')], canDownload() && ['dl', _t('Letöltött')]].filter(Boolean);
  view.innerHTML = `<div class="page pod-page pfeed">${tabsHtml('')}
    <div class="pfeed-head" style="--h:${hashHue(f.title)}"><div class="pfeed-art">${cover(f.image, 'pimg')}</div>
      <div class="pfeed-info"><h1>${esc(f.title)}</h1>${f.author ? `<div class="muted">${esc(f.author)}</div>` : ''}
        <p class="pfeed-desc">${esc(notes.text.slice(0, 600))}${notes.text.length > 600 ? '…' : ''}</p>
        <div class="hero-btns"><button class="btn ${sub ? '' : 'primary'}" data-pf="sub">${sub ? `${ICON.check} ${_t('Feliratkozva')}` : `${ICON.plus} ${_t('Feliratkozás')}`}</button>
          <button class="btn" data-pf="play-latest">${ICON.play} ${_t('Legújabb rész')}</button>
          <button class="btn" data-pf="refresh">${ICON.refresh} ${_t('Frissítés@@újratöltés')}</button>
          ${f.link ? `<button class="btn" data-ext="${esc(f.link)}">${ICON.external || ''} ${_t('Honlap')}</button>` : ''}
          ${f.funding ? `<button class="btn" data-ext="${esc(f.funding)}">♥ ${_t('Támogatás')}</button>` : ''}</div></div></div>
    ${sub ? `<details class="pfeed-set"><summary>${_t('A műsor beállításai')}</summary><div class="pfeed-set-in">
      <label>${_t('Sebesség')} <select data-ps="speed"><option value="">${_t('alapértelmezett ({r}×)', { r: podCfg().speed })}</option>${RATES.map((r) => `<option value="${r}" ${Number(set.speed) === r ? 'selected' : ''}>${r}×</option>`).join('')}</select></label>
      <label>${_t('Bevezető átugrása (mp)')} <input class="input" type="number" min="0" max="600" step="5" data-ps="skipIntro" value="${esc(set.skipIntro || '')}" /></label>
      <label>${_t('Zárórész átugrása (mp)')} <input class="input" type="number" min="0" max="600" step="5" data-ps="skipOutro" value="${esc(set.skipOutro || '')}" /></label>
      ${audioFxAvailable ? `<label>${_t('Hangerő-erősítés')} <select data-ps="boost"><option value="">${_t('nincs')}</option><option value="1.5" ${Number(set.boost) === 1.5 ? 'selected' : ''}>+50%</option><option value="2" ${Number(set.boost) === 2 ? 'selected' : ''}>+100%</option></select></label>
      <label class="pchk"><input type="checkbox" data-ps="skipSilence" ${(set.skipSilence ?? podCfg().skipSilence) ? 'checked' : ''} /> ${_t('Csend átugrása')}</label>` : ''}
      <label class="pchk"><input type="checkbox" data-ps="notify" ${set.notify !== false ? 'checked' : ''} /> ${_t('Értesítés új epizódról')}</label>
      ${canDownload() ? `<label class="pchk"><input type="checkbox" data-ps="autoDl" ${set.autoDl ? 'checked' : ''} /> ${_t('Új epizódok automatikus letöltése')}</label>` : ''}
    </div></details>` : ''}
    <div class="pfeed-bar"><div class="sp-chips">${filters.map(([id, l]) => `<button class="sw-chip ${feedUi.filter === id ? 'on' : ''}" data-pff="${id}">${esc(l)}</button>`).join('')}</div>
      <input class="input" type="search" data-pfq placeholder="${_t('Keresés az epizódok között…')}" value="${esc(feedUi.q)}" aria-label="${_t('Keresés az epizódok között')}" />
      <select data-pfs aria-label="${_t('Rendezés')}"><option value="new" ${feedUi.sort === 'new' ? 'selected' : ''}>${_t('Legújabb elöl')}</option><option value="old" ${feedUi.sort === 'old' ? 'selected' : ''}>${_t('Legrégebbi elöl')}</option></select>
      <button class="btn small" data-pf="all-played">${_t('Mind meghallgatva')}</button>
      <span class="muted">${_t('{n} epizód', { n: eps.length })}</span></div>
    <div class="pep-list pfeed-eps">${eps.slice(0, feedUi.limit).map((e) => epRowHtml(e, { showFeed: false })).join('') || `<p class="muted">${_t('Nincs a szűrőnek megfelelő epizód.')}</p>`}</div>
    ${eps.length > feedUi.limit ? `<button class="btn" data-pf="more">${_t('Továbbiak ({n})', { n: eps.length - feedUi.limit })}</button>` : ''}</div>`;
  const page = view.querySelector('.pfeed');
  page.addEventListener('click', async (e) => {
    const a = e.target.closest('[data-pf]')?.dataset.pf;
    const fl = e.target.closest('[data-pff]')?.dataset.pff;
    if (fl) {
      feedUi.filter = fl;
      feedUi.limit = 60;
      return renderFeed(view, url);
    }
    if (!a) return;
    if (a === 'sub') {
      if (sub && !(await confirmDialog(_t('Leiratkozol erről a műsorról: {t}?', { t: f.title }), { ok: _t('Leiratkozás') }))) return;
      if (sub) unsubscribe(url);
      else subscribe(f);
      renderFeed(view, url);
    } else if (a === 'play-latest' && f.eps[0]) podPlayer.play(f.eps[0]);
    else if (a === 'refresh') refreshFeed(url, { force: true }).then(() => toast(_t('Frissítve'))).catch((err) => toast(err.message || String(err)));
    else if (a === 'more') {
      feedUi.limit += 100;
      renderFeed(view, url);
    } else if (a === 'all-played' && (await confirmDialog(_t('Minden epizódot meghallgatottnak jelölsz?'), { ok: _t('Igen') }))) {
      f.eps.forEach((x) => !isPlayed(x.key) && markPlayed(x, true));
      renderFeed(view, url);
    }
  });
  page.addEventListener('change', (e) => {
    const k = e.target.dataset.ps;
    if (k) {
      const v = e.target.type === 'checkbox' ? e.target.checked : e.target.value === '' ? '' : Number(e.target.value);
      // (értesítés: alapból be – csak a kikapcsolás tárolódik; csend átugrása: a kikapcsolás is felülírja az általánosat)
      setSubOpt(url, k, k === 'notify' ? (v ? undefined : false) : k === 'skipSilence' ? !!v : v || '');
      if (podPlayer.ep?.feed === url) {
        if (k === 'speed') podPlayer.setRate(Number(v) || podCfg().speed);
        if (k === 'boost') podPlayer.setBoost(Number(v) || 1);
        if (k === 'skipSilence') podPlayer.setSkipSilence(!!v);
      }
    } else if (e.target.matches('[data-pfs]')) {
      feedUi.sort = e.target.value;
      renderFeed(view, url);
    }
  });
  page.querySelector('[data-pfq]').addEventListener('input', debounce((e) => {
    feedUi.q = e.target.value;
    renderFeed(view, url).then(() => {
      const i = view.querySelector('[data-pfq]');
      i?.focus();
      i?.setSelectionRange(i.value.length, i.value.length);
    });
  }, 300));
}

// az oldalak gombjai (eszköztár, keresés, OPML)
document.addEventListener('click', async (e) => {
  const b = e.target.closest('[data-pt]');
  if (!b || !hostsPod(b)) return;
  const inSettings = !!b.closest('#podcast-settings');
  const a = b.dataset.pt;
  const d = pod();
  if (a === 'refresh') {
    toast(_t('A feliratkozások frissítése…'));
    const errs = await refreshAll({ force: true });
    toast(errs.length ? _t('{n} műsor nem frissült', { n: errs.length }) : _t('Frissítve'));
  } else if (a === 'inbox-played') {
    d.inbox.slice().forEach((x) => markPlayed(x, true));
    clearInbox();
  } else if (a === 'inbox-clear') clearInbox();
  else if (a === 'inbox-queue') {
    d.inbox.slice().reverse().forEach((x) => !inQueue(x.key) && enqueue(x));
    toast(_t('A lejátszási sorba került'));
  } else if (a === 'queue-play' && d.queue[0]) podPlayer.play(d.queue[0]);
  else if (a === 'queue-clear' && (await confirmDialog(_t('Kiüríted a lejátszási sort?'), { ok: _t('Ürítés') }))) {
    d.queue = [];
    savePod();
    bus.emit('pod-queue');
  } else if (a === 'hist-clear' && (await confirmDialog(_t('Törlöd az előzményeket? (A hol tartasz-adatok megmaradnak.)'), { ok: _t('Törlés'), danger: true }))) {
    d.hist = [];
    savePod();
  } else if (a === 'opml-export') api.saveFile?.('ADAS-podcastok.opml', toOpml());
  else if (a === 'dl-folder') api.podFolder?.();
  else if (a === 'dl-del-played' || a === 'dl-del-all') {
    const prof = store.profile; // (a jóváhagyott művelet ennek a profilnak a fájljaira szól, profilváltás után is)
    const list = downloadedList().filter((ep) => a === 'dl-del-all' || isPlayed(ep.key));
    const q = a === 'dl-del-all' ? _t('Törlöd mind a(z) {n} letöltött epizódot ({size})? Az epizódok a listákban maradnak, csak a fájl törlődik.', { n: list.length, size: fmtSize(downloadedSize(list)) }) : _t('Törlöd a(z) {n} meghallgatott epizód letöltött fájlját?', { n: list.length });
    if (list.length && (await confirmDialog(q, { ok: _t('Törlés'), danger: true })) && store.profile === prof) {
      let done = 0;
      for (const ep of list) if (await deleteDownload(ep, prof).catch(() => false)) done++;
      toast(done === list.length ? _t('{n} letöltött fájl törölve', { n: done }) : _t('{n} letöltött fájl törölve, {m} nem törölhető', { n: done, m: list.length - done }));
    }
  }
  rerender();
  if (inSettings) renderPodcastSettings(document.getElementById('podcast-settings'));
});
document.addEventListener('submit', (e) => {
  const f = e.target.closest('[data-pt-form="search"]');
  if (!f) return;
  e.preventDefault();
  const q = f.elements.namedItem('q').value.trim();
  if (/^https?:\/\//i.test(q)) location.hash = '#/podcast?feed=' + encodeURIComponent(q);
  else location.hash = '#/podcast?tab=discover&q=' + encodeURIComponent(q);
});
document.addEventListener('change', async (e) => {
  const inp = e.target.closest('[data-pt-file="opml"]');
  const pc = e.target.closest('[data-pc]');
  if (inp?.files?.[0]) {
    try {
      const n = importOpml(await inp.files[0].text());
      toast(n ? _t('{n} műsorra iratkoztál fel', { n }) : _t('Nem volt új műsor a fájlban.'));
    } catch (err) {
      toast(err.message || String(err));
    }
    inp.value = '';
    rerender();
  } else if (pc && hostsPod(pc)) {
    const k = pc.dataset.pc;
    const v = pc.type === 'checkbox' ? pc.checked : Number(pc.value);
    if (k === 'podcastMenu') {
      store.settings.podcastMenu = v;
      store.save();
      bus.emit('settings', 'podcastMenu');
    } else {
      pod().cfg = { ...pod().cfg, [k]: v };
      savePod();
      if (k === 'skipSilence' && podPlayer.active) podPlayer.setSkipSilence(v);
    }
  }
});

// ---------------------------------------------------------------------------
// Az epizód adatlapja
// ---------------------------------------------------------------------------
export function openEpisode(ep) {
  const n = notesOf(ep.desc);
  const st = epState(ep.key);
  const el = html(`<div class="dialog pod-ep" data-pkey="${esc(ep.key)}">
    <div class="pod-ep-head"><div class="pod-ep-art" style="--h:${hashHue(ep.feedTitle || ep.title)}">${cover(ep.image)}</div>
      <div><a class="muted" href="#/podcast?feed=${encodeURIComponent(ep.feed)}" data-close>${esc(ep.feedTitle || '')}</a><h2>${esc(ep.title)}</h2>
      <div class="muted small">${esc([fmtDate(ep.pub), fmtDur(ep.dur), ep.season ? _t('{s}. évad', { s: ep.season }) : '', ep.episode ? _t('{e}. rész', { e: ep.episode }) : '', st?.played ? _t('meghallgatva') : st?.pos ? _t('{t}-nál tartasz', { t: fmtClock(st.pos) }) : ''].filter(Boolean).join(' · '))}</div></div></div>
    <div class="dialog-btns"><button class="btn primary" data-pact="play">${ICON.play} ${st?.pos && !st?.played ? _t('Folytatás') : _t('Lejátszás')}</button>
      <button class="btn" data-pact="queue">${inQueue(ep.key) ? ICON.check : ICON.plus} ${_t('Lejátszási sor')}</button>
      ${canDownload() ? (st?.dl ? `<button class="btn" data-pact="dldel">${ICON.trash} ${_t('Letöltés törlése')}</button>` : `<button class="btn" data-pact="dl">${_t('⇩ Letöltés')}</button>`) : ''}
      <button class="btn" data-pact="fav">★ ${st?.fav ? _t('Kedvenc') : _t('Kedvencekhez')}</button>
      <button class="btn" data-pact="played">✓ ${st?.played ? _t('Meghallgatatlan') : _t('Meghallgatva')}</button>
      ${ep.link ? `<button class="btn" data-ext="${esc(ep.link)}">${ICON.external || ''} ${_t('Weboldal')}</button>` : ''}</div>
    <div class="pod-notes">${esc(n.text).replace(/\n/g, '<br>') || `<span class="muted">${_t('Nincs műsorjegyzet.')}</span>`}</div>
    ${n.links.length ? `<details class="pod-links"><summary>${_t('Hivatkozások ({n})', { n: n.links.length })}</summary>${n.links.map((l) => `<button class="link-btn" data-ext="${esc(l.href)}">${esc(l.text || l.href)}</button>`).join('')}</details>` : ''}
  </div>`);
  const close = openModal(el, { cls: 'medium' });
  el.addEventListener('click', (e) => {
    if (e.target.closest('[data-close]') || e.target.closest('[data-pact="play"]')) setTimeout(close, 0);
  });
}

// ---------------------------------------------------------------------------
// Kis lejátszósáv és teljes képernyős nézet
// ---------------------------------------------------------------------------
let bar = null;
let full = null;
let menu = '';
const ICO_PAUSE = '<svg viewBox="0 0 24 24"><path d="M6 5h4v14H6zm8 0h4v14h-4z"/></svg>';
const playIco = () => (podPlayer.playing || podPlayer.state === 'loading' ? ICO_PAUSE : ICON.play);
function ensureBar() {
  if (bar) return bar;
  bar = html(`<div id="pod-bar" role="region" aria-label="${_t('Podcast')}" hidden>
    <button class="pb-main" data-pb="full" title="${_t('Megnyitás teljes képernyőn')}"><span class="pb-art"></span><span class="pb-text"><b></b><small></small></span></button>
    <button class="round" data-pb="back"></button><button class="round white" data-pb="toggle"></button><button class="round" data-pb="fwd"></button>
    <button class="round" data-pb="close" title="${_t('Leállítás')}">${ICON.close}</button><i class="pb-prog"><i></i></i></div>`);
  document.body.append(bar);
  bar.addEventListener('click', (e) => {
    const a = e.target.closest('[data-pb]')?.dataset.pb;
    if (a === 'full') openFull();
    else if (a === 'toggle') podPlayer.toggle();
    else if (a === 'back') podPlayer.skip(-podCfg().skipBack);
    else if (a === 'fwd') podPlayer.skip(podCfg().skipFwd);
    else if (a === 'close') podPlayer.stop();
  });
  return bar;
}
function drawBar() {
  const ep = podPlayer.ep;
  const show = !!ep && !radioPlayer.playing && !player.active && !full;
  document.body.classList.toggle('pod-on', !!ep && !radioPlayer.playing);
  if (!ep) return bar && (bar.hidden = true);
  ensureBar();
  bar.hidden = !show;
  const c = podCfg();
  bar.querySelector('.pb-art').innerHTML = cover(ep.image);
  bar.querySelector('.pb-text b').textContent = ep.title;
  bar.querySelector('.pb-text small').textContent = [podPlayer.chapterAt()?.title, ep.feedTitle].filter(Boolean).join(' · ');
  bar.querySelector('[data-pb="toggle"]').innerHTML = playIco();
  bar.querySelector('[data-pb="back"]').innerHTML = skipIco(c.skipBack, true);
  bar.querySelector('[data-pb="fwd"]').innerHTML = skipIco(c.skipFwd);
  barTime();
}
function barTime() {
  if (!bar || bar.hidden) return;
  bar.querySelector('.pb-prog i').style.width = `${podPlayer.dur ? ((podPlayer.pos / podPlayer.dur) * 100).toFixed(2) : 0}%`;
}

function openFull() {
  if (!podPlayer.ep) return;
  closeFull(false);
  full = html(`<section id="pod-full" role="dialog" aria-label="${_t('Most szól')}">
    <div class="pf-top pl-head"><button class="round" data-pf2="close" title="${_t('Bezárás (Esc)')}">${ICON.chevron}</button><span class="muted">${_t('Most szól')} · ${_t('Podcast')}</span></div>
    <div class="pf-body"><div class="pf-main"><div class="pf-art"></div>
      <div class="pf-info"><a class="pf-feed muted" href=""></a><h1 class="pf-title"></h1><div class="pf-chap muted"></div></div></div>
    <div class="pf-lists"><section class="pf-chapters" hidden><h3>${_t('Fejezetek')}</h3><ol></ol></section><section class="pf-queue"><h3>${_t('Következik a sorban')}</h3><div class="pep-list pq-list"></div></section></div></div>
    <div class="pl-deck">
        <div class="pf-seek pl-seek"><span class="pf-cur">0:00</span><input type="range" class="seek" min="0" max="1000" value="0" aria-label="${_t('Tekerés')}" /><span class="pf-rem">0:00</span></div>
        <div class="pl-row"><div class="pf-ctrls pl-transport"><button class="round" data-pf2="prevch" title="${_t('Előző fejezet')}"><svg viewBox="0 0 24 24"><path d="M6 6h2v12H6zm3.5 6 8.5 6V6z"/></svg></button><button class="round" data-pf2="back"></button><button class="round white big" data-pf2="toggle"></button><button class="round" data-pf2="fwd"></button><button class="round" data-pf2="next" title="${_t('Következő a sorban')}"><svg viewBox="0 0 24 24"><path d="M16 6h2v12h-2zM6 18l8.5-6L6 6z"/></svg></button></div>
        <div class="pf-opts pl-opts"><button class="btn small" data-pf2="rate"></button><button class="btn small" data-pf2="sleep"></button>
          ${audioFxAvailable ? `<button class="btn small" data-pf2="boost"></button><button class="btn small" data-pf2="silence"></button>` : ''}
          <button class="btn small" data-pf2="notes">${_t('Műsorjegyzet')}</button></div></div>
        <div class="pf-menu" hidden></div></div>
  </section>`);
  document.body.append(full);
  document.body.classList.add('pod-full');
  drawBar();
  drawFull();
  full.addEventListener('click', (e) => {
    const a = e.target.closest('[data-pf2]')?.dataset.pf2;
    const m = e.target.closest('[data-pm]');
    const ch = e.target.closest('[data-chap]');
    const c = podCfg();
    if (m) {
      const [k, v] = m.dataset.pm.split(':');
      if (k === 'rate') podPlayer.setRate(Number(v));
      if (k === 'sleep') podPlayer.setSleep(Number(v));
      menu = '';
      return drawFull();
    }
    if (ch) return podPlayer.seek(Number(ch.dataset.chap));
    if (e.target.closest('.pf-feed')) return closeFull();
    if (a === 'close') closeFull();
    else if (a === 'toggle') podPlayer.toggle();
    else if (a === 'back') podPlayer.skip(-c.skipBack);
    else if (a === 'fwd') podPlayer.skip(c.skipFwd);
    else if (a === 'prevch') podPlayer.chapterStep(-1);
    else if (a === 'next') podPlayer.next();
    else if (a === 'rate' || a === 'sleep') {
      menu = menu === a ? '' : a;
      drawFull();
    } else if (a === 'boost') podPlayer.setBoost(podPlayer.boost > 1 ? 1 : 1.5);
    else if (a === 'silence') podPlayer.setSkipSilence(!podPlayer.skipSilence);
    else if (a === 'notes') openEpisode(podPlayer.ep);
  });
  const seek = full.querySelector('.seek');
  seek.addEventListener('input', () => {
    seek.dataset.drag = '1';
    full.querySelector('.pf-cur').textContent = fmtClock((seek.value / 1000) * podPlayer.dur);
  });
  seek.addEventListener('change', () => {
    delete seek.dataset.drag;
    podPlayer.seek((seek.value / 1000) * podPlayer.dur);
  });
  full.querySelector('[data-pf2="toggle"]').focus({ preventScroll: true });
}
function closeFull(focusBar = true) {
  if (!full) return;
  full.remove();
  full = null;
  menu = '';
  document.body.classList.remove('pod-full');
  drawBar();
  if (focusBar) bar?.querySelector('[data-pb="full"]')?.focus({ preventScroll: true });
}
function drawFull() {
  if (!full) return;
  const ep = podPlayer.ep;
  if (!ep) return closeFull(false);
  const c = podCfg();
  full.style.setProperty('--h', hashHue(ep.feedTitle || ep.title));
  full.querySelector('.pf-art').innerHTML = cover(ep.image) || `<span class="initials">${esc((ep.feedTitle || ep.title).slice(0, 2))}</span>`;
  const fl = full.querySelector('.pf-feed');
  fl.textContent = ep.feedTitle || '';
  fl.href = '#/podcast?feed=' + encodeURIComponent(ep.feed);
  full.querySelector('.pf-title').textContent = ep.title;
  full.querySelector('[data-pf2="toggle"]').innerHTML = playIco();
  full.querySelector('[data-pf2="back"]').innerHTML = skipIco(c.skipBack, true);
  full.querySelector('[data-pf2="fwd"]').innerHTML = skipIco(c.skipFwd);
  full.querySelector('[data-pf2="rate"]').textContent = `${_t('Sebesség')}: ${podPlayer.rate}×`;
  const left = podPlayer.sleepAt > 0 ? Math.ceil((podPlayer.sleepAt - Date.now()) / 60e3) : 0;
  full.querySelector('[data-pf2="sleep"]').textContent = podPlayer.sleepAt === -1 ? _t('Alvás: az epizód végén') : left ? _t('Alvás: {m} perc', { m: left }) : _t('Alvásidőzítő');
  const bo = full.querySelector('[data-pf2="boost"]');
  if (bo) bo.textContent = podPlayer.boost > 1 ? _t('Hangerő: +{p}%', { p: Math.round((podPlayer.boost - 1) * 100) }) : _t('Hangerő-erősítés');
  const si = full.querySelector('[data-pf2="silence"]');
  if (si) {
    si.textContent = _t('Csend átugrása');
    si.classList.toggle('on', podPlayer.skipSilence);
  }
  const mn = full.querySelector('.pf-menu');
  mn.hidden = !menu;
  if (menu === 'rate') mn.innerHTML = RATES.map((r) => `<button class="btn small ${podPlayer.rate === r ? 'on' : ''}" data-pm="rate:${r}">${r}×</button>`).join('');
  if (menu === 'sleep')
    mn.innerHTML = [[0, _t('Ki')], [5, _t('{m} perc', { m: 5 })], [15, _t('{m} perc', { m: 15 })], [30, _t('{m} perc', { m: 30 })], [45, _t('{m} perc', { m: 45 })], [60, _t('{m} perc', { m: 60 })], [-1, _t('Az epizód végén')]]
      .map(([v, l]) => `<button class="btn small" data-pm="sleep:${v}">${esc(l)}</button>`)
      .join('');
  // fejezetek
  const cs = full.querySelector('.pf-chapters');
  cs.hidden = !podPlayer.chapters.length;
  const cur = podPlayer.chapterAt();
  cs.querySelector('ol').innerHTML = podPlayer.chapters.map((x) => `<li><button class="${x === cur ? 'on' : ''}" data-chap="${x.start}"><time>${fmtClock(x.start)}</time> ${esc(x.title)}</button></li>`).join('');
  full.querySelector('.pf-chap').textContent = cur?.title || '';
  // a sor (a mostani nélkül)
  const q = pod().queue.filter((x) => x.key !== ep.key).slice(0, 20);
  full.querySelector('.pf-queue').hidden = !q.length;
  full.querySelector('.pf-queue .pep-list').innerHTML = q.map((x) => epRowHtml(x, { queue: true })).join('');
  fullTime();
}
function fullTime() {
  if (!full) return;
  const seek = full.querySelector('.seek');
  if (seek.dataset.drag) return;
  seek.value = podPlayer.dur ? Math.round((podPlayer.pos / podPlayer.dur) * 1000) : 0;
  seek.style.setProperty('--pct', `${seek.value / 10}%`);
  full.querySelector('.pf-cur').textContent = fmtClock(podPlayer.pos);
  full.querySelector('.pf-rem').textContent = '−' + fmtClock(Math.max(0, podPlayer.dur - podPlayer.pos));
  const cur = podPlayer.chapterAt();
  full.querySelector('.pf-chap').textContent = cur?.title || '';
}
bus.on('pod-player', (kind) => {
  if (kind === 'time') {
    barTime();
    fullTime();
    return;
  }
  if (kind === 'stop') closeFull(false);
  drawBar();
  drawFull();
});
for (const ev of ['radio-player', 'player-opened', 'player-closed', 'pod-queue']) bus.on(ev, () => (drawBar(), drawFull()));
document.addEventListener('keydown', (e) => {
  if (!full || e.target.matches?.('input:not([type=range]), textarea, select')) return;
  const c = podCfg();
  const k = e.key;
  if (k === 'Escape' || k === 'Backspace' || k === 'BrowserBack') closeFull();
  else if (k === ' ' || k === 'MediaPlayPause' || k === 'k') podPlayer.toggle();
  else if (k === 'MediaRewind' || k === 'j') podPlayer.skip(-c.skipBack);
  else if (k === 'MediaFastForward' || k === 'l') podPlayer.skip(c.skipFwd);
  else return;
  e.preventDefault();
  e.stopImmediatePropagation();
}, true);

// indításkor a feliratkozások (gyorsítótárból) és a háttérfrissítés
setTimeout(() => store.profile && initPodcasts().catch(() => {}), 3000);
