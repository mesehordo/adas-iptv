// Felületi építőelemek: csatornakártya, sor, rács, modális ablakok, csatorna-adatlap, műsor-adatlap.
import { esc, html, hashHue, initials, fmtTime, fmtDay, dayStart, dayLabel, fmtDuration, toast, bus, $ } from './util.js';
import { isKidsChannel, setKidsMark } from './kids.js';
import { store, avatarUrl } from './store.js';
import { epg } from './epg.js';
import { health } from './health.js';
import { api } from './api.js';
import {
  catalog, countryName, countryFlag, categoryName, languageName, channelStatus, qualityBadge, orderedStreams, offlineLabel, geoState,
} from './catalog.js';
import { player } from './player.js';
import { channelInfo, infoBoxHtml } from './meta.js';
import { hasSeries, toggleSeries } from './reminders.js';

export const ICON = {
  play: '<svg viewBox="0 0 24 24"><path d="M7 4v16l13-8z"/></svg>',
  plus: '<svg viewBox="0 0 24 24"><path d="M11 5h2v6h6v2h-6v6h-2v-6H5v-2h6z"/></svg>',
  check: '<svg viewBox="0 0 24 24"><path d="M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4z"/></svg>',
  info: '<svg viewBox="0 0 24 24"><path d="M11 10h2v7h-2zm0-3h2v2h-2zm1-5a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm0 18a8 8 0 1 1 0-16 8 8 0 0 1 0 16Z"/></svg>',
  chevron: '<svg viewBox="0 0 24 24"><path d="M7.4 8.6 12 13.2l4.6-4.6L18 10l-6 6-6-6z"/></svg>',
  up: '<svg viewBox="0 0 24 24"><path d="M7.4 15.4 12 10.8l4.6 4.6L18 14l-6-6-6 6z"/></svg>',
  refresh: '<svg viewBox="0 0 24 24"><path d="M17.7 6.3A8 8 0 1 0 19.7 14h-2.1a6 6 0 1 1-1.4-6.2L13 11h7V4l-2.3 2.3Z"/></svg>',
  help: '<svg viewBox="0 0 24 24"><path d="M11 18h2v-2h-2v2Zm1-16a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm0 18a8 8 0 1 1 0-16 8 8 0 0 1 0 16Zm0-14a4 4 0 0 0-4 4h2a2 2 0 1 1 4 0c0 2-3 1.8-3 5h2c0-2.3 3-2.5 3-5a4 4 0 0 0-4-4Z"/></svg>',
  tv: '<svg viewBox="0 0 24 24"><path d="M21 3H3a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h5v2h8v-2h5a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2Zm0 14H3V5h18v12Z"/></svg>',
  bell: '<svg viewBox="0 0 24 24"><path d="M12 22a2.5 2.5 0 0 0 2.5-2.5h-5A2.5 2.5 0 0 0 12 22Zm7-6V11a7 7 0 0 0-5.5-6.8V3a1.5 1.5 0 0 0-3 0v1.2A7 7 0 0 0 5 11v5l-2 2v1h18v-1l-2-2Z"/></svg>',
  close: '<svg viewBox="0 0 24 24"><path d="M19 6.4 17.6 5 12 10.6 6.4 5 5 6.4 10.6 12 5 17.6 6.4 19 12 13.4 17.6 19 19 17.6 13.4 12z"/></svg>',
  left: '<svg viewBox="0 0 24 24"><path d="M15.4 7.4 14 6l-6 6 6 6 1.4-1.4L10.8 12z"/></svg>',
  right: '<svg viewBox="0 0 24 24"><path d="M8.6 16.6 10 18l6-6-6-6-1.4 1.4 4.6 4.6z"/></svg>',
  external: '<svg viewBox="0 0 24 24"><path d="M14 3v2h3.6l-9.8 9.8 1.4 1.4L19 6.4V10h2V3h-7ZM5 5h6V3H5a2 2 0 0 0-2 2v14c0 1.1.9 2 2 2h14a2 2 0 0 0 2-2v-6h-2v6H5V5Z"/></svg>',
  globe: '<svg viewBox="0 0 24 24"><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm6.9 6h-3a15.7 15.7 0 0 0-1.4-3.6A8 8 0 0 1 18.9 8ZM12 4c.8 1.2 1.5 2.5 1.9 4h-3.8c.4-1.5 1.1-2.8 1.9-4ZM4.3 14a8.2 8.2 0 0 1 0-4h3.4a16.5 16.5 0 0 0 0 4H4.3Zm.8 2h3a15.7 15.7 0 0 0 1.4 3.6A8 8 0 0 1 5.1 16ZM8 8H5.1a8 8 0 0 1 4.3-3.6C8.9 5.5 8.4 6.7 8 8Zm4 12c-.8-1.2-1.5-2.5-1.9-4h3.8c-.4 1.5-1.1 2.8-1.9 4Zm2.3-6H9.7a14.7 14.7 0 0 1 0-4h4.6a14.7 14.7 0 0 1 0 4Zm.3 5.6c.6-1.1 1.1-2.3 1.4-3.6h3a8 8 0 0 1-4.4 3.6Zm1.7-5.6a16.5 16.5 0 0 0 0-4h3.4a8.2 8.2 0 0 1 0 4h-3.4Z"/></svg>',
};

// ---------------------------------------------------------------------------
// Logó
// ---------------------------------------------------------------------------
export function logoHtml(ch, cls = 'logo') {
  const fallback = `<span class="initials">${esc(initials(ch.name))}</span>`;
  if (!ch.logo) return fallback;
  return `<img class="${cls}" src="${esc(ch.logo)}" alt="" loading="lazy" referrerpolicy="no-referrer" />`;
}

// Hibás logó helyett monogram.
document.addEventListener(
  'error',
  (e) => {
    const img = e.target;
    if (img.tagName === 'IMG' && (img.classList.contains('logo') || img.classList.contains('logo-sm'))) {
      const ch = catalog.byId.get(img.closest('[data-id]')?.dataset.id);
      img.replaceWith(html(`<span class="initials">${esc(initials(ch?.name || '?'))}</span>`));
    }
  },
  true
);

// ---------------------------------------------------------------------------
// Profilkép (kép, vagy ha nincs, színes betű)
// ---------------------------------------------------------------------------
export function avatarHtml(p, cls = '', inner = '') {
  const img = p.avatar === 'custom' && p.avatarData ? p.avatarData : Number.isInteger(p.avatar) ? avatarUrl(p.avatar) : '';
  return `<span class="avatar ${cls} ${img ? 'img' : ''}" style="background-color:${esc(p.color)};${img ? `background-image:url('${img}')` : ''}">${img ? '' : esc((p.name || '?').slice(0, 1).toUpperCase())}${inner}</span>`;
}

// ---------------------------------------------------------------------------
// Kártya
// ---------------------------------------------------------------------------
/** Csatornakártya (állapot, minőség, földrajzi korlát, most futó műsor, felugró gombok). */
export function cardHtml(ch, { context = '' } = {}) {
  const now = epg.now(ch.id);
  const st = channelStatus(ch);
  const q = qualityBadge(ch);
  const fav = store.isFavorite(ch.id);
  const flag = countryFlag(ch.country);
  const off = offlineLabel(ch);
  // földrajzi korlát: ellenőrizve (innen elutasította), vagy a lista szerint minden forrása korlátozott
  const geo = geoState(ch);
  const OFF_TEXT = { Adásszünet: 'Adásszünet – most nem sugároz', 'Földrajzi korlát': 'Földrajzi korlát – innen nem nézhető' };
  const sub = off
    ? `<span class="off-text">${OFF_TEXT[off] || 'Offline – jelenleg nem elérhető'}</span>`
    : now?.cur
      ? esc(now.cur.title)
      : esc([countryName(ch.country), categoryName(ch.categories[0])].filter(Boolean).join(' · '));
  return `<div class="card ${off ? 'is-off' : ''}" tabindex="0" data-id="${esc(ch.id)}" data-ctx="${esc(context)}">
    <div class="thumb" style="--h:${hashHue(ch.name)}">
      ${logoHtml(ch)}
      ${off ? `<span class="off-badge ${geo === 'sure' ? 'geo' : ''}">${{ Adásszünet: 'ADÁSSZÜNET', 'Földrajzi korlát': '🌐 GEO-KORLÁT' }[off] || 'OFFLINE'}</span>` : ''}
      ${!off && geo === 'maybe' ? '<span class="geo-mark" title="Földrajzilag korlátozott lehet – csak bizonyos országokból nézhető">🌐</span>' : ''}
      ${q ? `<span class="q">${q}</span>` : ''}
      <span class="st st-${st}" title="${st === 'ok' ? 'Működik' : st === 'bad' ? 'Nem elérhető' : 'Nem ellenőrzött'}"></span>
      ${fav ? '<span class="fav-mark">★</span>' : ''}
      ${now?.cur ? `<div class="bar"><i style="width:${(now.progress * 100).toFixed(1)}%"></i></div>` : ''}
    </div>
    <div class="meta"><div class="name">${esc(ch.name)}</div><div class="sub">${sub}</div></div>
    <div class="pop">
      <div class="pop-btns">
        <button class="round white" data-act="play" title="Lejátszás" tabindex="-1">${ICON.play}</button>
        <button class="round" data-act="fav" title="${fav ? 'Eltávolítás a kedvencekből' : 'Kedvencekhez'}" tabindex="-1">${fav ? ICON.check : ICON.plus}</button>
        <span class="grow"></span>
        <button class="round" data-act="info" title="Részletek (I)" tabindex="-1">${ICON.chevron}</button>
      </div>
      <div class="pop-line">${flag} ${esc(countryName(ch.country))}${ch.categories[0] ? ' · ' + esc(categoryName(ch.categories[0])) : ''}${q ? ` <span class="pill">${q}</span>` : ''}</div>
      ${now?.cur ? `<div class="pop-now"><b>${fmtTime(now.cur.start)}</b> ${esc(now.cur.title)}</div>` : ''}
      ${now?.next ? `<div class="pop-next">Utána: ${fmtTime(now.next.start)} ${esc(now.next.title)}</div>` : ''}
    </div>
  </div>`;
}

/** Kártyalisták lejátszási környezete (csatornaváltáshoz a lejátszóban). */
const contexts = new Map();
let ctxSeq = 0;
export function registerContext(title, channels) {
  const id = 'x' + ++ctxSeq;
  contexts.set(id, { title, ids: channels.map((c) => c.id) });
  if (contexts.size > 200) contexts.delete(contexts.keys().next().value);
  return id;
}
export function getContext(id) {
  return contexts.get(id);
}

// Kártyák eseménykezelése (delegálva).
document.addEventListener('click', (e) => {
  const card = e.target.closest('.card');
  if (!card) return;
  const ch = catalog.byId.get(card.dataset.id);
  if (!ch) return;
  const act = e.target.closest('[data-act]')?.dataset.act || 'play';
  e.preventDefault();
  if (act === 'fav') {
    const added = store.toggleFavorite(ch.id);
    toast(added ? `${ch.name} hozzáadva a kedvencekhez` : `${ch.name} eltávolítva a kedvencek közül`);
  } else if (act === 'info') openInfo(ch);
  else player.play(ch, { context: getContext(card.dataset.ctx) });
});
document.addEventListener('contextmenu', (e) => {
  const card = e.target.closest('.card');
  if (!card) return;
  e.preventDefault();
  const ch = catalog.byId.get(card.dataset.id);
  if (ch) openInfo(ch);
});
document.addEventListener('keydown', (e) => {
  const card = document.activeElement?.closest?.('.card');
  if (!card || e.target.matches?.('input, select, textarea')) return;
  const ch = catalog.byId.get(card.dataset.id);
  if (!ch) return;
  if (e.key === 'Enter') {
    // Rövid OK = lejátszás, hosszan nyomva = adatlap (a színes gombok nélküli távirányítókhoz, pl. Android TV).
    e.preventDefault();
    if (e.repeat) return;
    clearTimeout(okTimer);
    okCard = card;
    okTimer = setTimeout(() => {
      okCard = null;
      openInfo(ch);
    }, 550);
  } else if (e.key === 'i' || e.key === 'I' || e.key === 'ContextMenu') {
    e.preventDefault();
    openInfo(ch);
  } else if (e.key === 'f' || e.key === 'F') {
    e.preventDefault();
    const added = store.toggleFavorite(ch.id);
    toast(added ? `${ch.name} hozzáadva a kedvencekhez` : `${ch.name} eltávolítva a kedvencek közül`);
  }
});

// A kártyán állva (fókusz vagy egér) előre felépítjük a kapcsolatot az adás szerveréhez
// (DNS + TLS), így a lejátszás indulásakor ennyivel kevesebbet kell várni.
let warmTimer = null;
let warmed = '';
const warm = (e) => {
  const card = e.target.closest?.('.card');
  if (!card || !api.preconnect || card.dataset.id === warmed) return;
  clearTimeout(warmTimer);
  warmTimer = setTimeout(() => {
    const ch = catalog.byId.get(card.dataset.id);
    const s = ch && orderedStreams(ch)[0];
    if (!s) return;
    warmed = card.dataset.id;
    api.preconnect(s.url);
  }, 250);
};
document.addEventListener('focusin', warm);
document.addEventListener('mouseover', warm);

let okTimer = null;
let okCard = null;
document.addEventListener('keyup', (e) => {
  if (e.key !== 'Enter' || !okCard) return;
  clearTimeout(okTimer);
  const card = okCard;
  okCard = null;
  const ch = catalog.byId.get(card.dataset.id);
  if (ch) player.play(ch, { context: getContext(card.dataset.ctx) });
});

// Ellenőrzés után az elérhetőségük szerint megváltozott kártyák frissítése (Offline / Adásszünet felirat).
let healthTimer = null;
bus.on('health', () => {
  clearTimeout(healthTimer);
  healthTimer = setTimeout(() => {
    document.querySelectorAll('.card[data-id]').forEach((card) => {
      const ch = catalog.byId.get(card.dataset.id);
      if (!ch || card.matches(':hover, :focus')) return;
      if (!!offlineLabel(ch) !== card.classList.contains('is-off')) replaceCard(card, ch);
    });
  }, 800);
});

// A kártyák kedvenc-jelölésének frissítése újrarajzolás nélkül.
bus.on('favorites', (id) => {
  const ch = catalog.byId.get(id);
  if (!ch) return;
  document.querySelectorAll(`.card[data-id="${CSS.escape(id)}"]`).forEach((card) => replaceCard(card, ch));
});

/** Kártya újrarajzolása a helyén: a kedvencek oldal sorszáma / húzhatósága és a fókusz megmarad. */
function replaceCard(card, ch) {
  const focused = card === document.activeElement;
  const num = card.dataset.num;
  const fresh = html(cardHtml(ch, { context: card.dataset.ctx }));
  if (num) {
    fresh.dataset.num = num;
    fresh.draggable = true;
  }
  card.replaceWith(fresh);
  if (focused) fresh.focus({ preventScroll: true });
}

// ---------------------------------------------------------------------------
// Vízszintes sor
// ---------------------------------------------------------------------------
/**
 * Sorcím: ha a sornak van „összes” oldala, mellette mindig látható nyíl ikon (egérrel, érintéssel),
 * a sor végén pedig egy „Összes” csempe (távirányítóval jobbra lépkedve elérhető).
 */
export function rowTitleHtml(title, href, count) {
  if (!href) return `<h2 class="row-title">${esc(title)}</h2>`;
  return `<h2 class="row-title"><a href="${esc(href)}" title="${esc(title)} – az összes egy oldalon">
    <span class="rt-text">${esc(title)}</span><span class="row-all" aria-hidden="true">${ICON.right}</span><span class="more">Összes${count ? ` (${count})` : ''}</span></a></h2>`;
}

export function seeAllHtml(href, count, { poster = false } = {}) {
  if (!href) return '';
  return `<a class="see-all ${poster ? 'sa-poster' : ''}" href="${esc(href)}" aria-label="Összes megjelenítése${count ? ` (${count})` : ''}">
    <span class="sa-ico">${ICON.right}</span><b>Összes</b>${count ? `<small>${count} db</small>` : ''}</a>`;
}

export function rowEl(title, channels, { href = '', limit = 40, extraClass = '' } = {}) {
  const ctx = registerContext(title, channels);
  const shown = channels.slice(0, limit);
  const el = html(`<section class="row ${extraClass}">
    ${rowTitleHtml(title, href, channels.length)}
    <div class="row-wrap">
      <button class="row-arrow left" aria-label="Balra" tabindex="-1">${ICON.left}</button>
      <div class="row-track">${shown.map((c) => cardHtml(c, { context: ctx })).join('')}${seeAllHtml(href, channels.length)}</div>
      <button class="row-arrow right" aria-label="Jobbra" tabindex="-1">${ICON.right}</button>
    </div>
  </section>`);
  const track = el.querySelector('.row-track');
  const update = () => {
    el.classList.toggle('can-left', track.scrollLeft > 5);
    el.classList.toggle('can-right', track.scrollLeft + track.clientWidth < track.scrollWidth - 5);
  };
  el.querySelector('.left').onclick = () => track.scrollBy({ left: -track.clientWidth * 0.9, behavior: 'smooth' });
  el.querySelector('.right').onclick = () => track.scrollBy({ left: track.clientWidth * 0.9, behavior: 'smooth' });
  track.addEventListener('scroll', update, { passive: true });
  requestAnimationFrame(update);
  health.queueChannels(shown.slice(0, 12));
  return el;
}

// ---------------------------------------------------------------------------
// Sorok sorrendje és láthatósága (TV oldal, VOD): húzással, nyilakkal, kapcsolóval
// ---------------------------------------------------------------------------
/** opts: { rows: [{ key, on }], label(key), defaults() → rows, onSave(rows), resetMsg } */
export function rowOrderEditor(box, opts) {
  let rows = opts.rows.map((r) => ({ ...r }));
  const listHtml = () =>
    rows
      .map(
        (r, i) => `<li class="${r.on ? '' : 'off'}" draggable="true" data-i="${i}">
        <span class="grip" aria-hidden="true">⋮⋮</span>
        <span class="r-num">${i + 1}.</span>
        <span class="r-label">${esc(opts.label(r.key))}</span>
        <input type="checkbox" class="switch" data-row-on="${i}" ${r.on ? 'checked' : ''} aria-label="Megjelenik" />
        <button class="round small" data-row-move="-1" data-i="${i}" title="Feljebb" ${i === 0 ? 'disabled' : ''}>${ICON.up}</button>
        <button class="round small" data-row-move="1" data-i="${i}" title="Lejjebb" ${i === rows.length - 1 ? 'disabled' : ''}>${ICON.chevron}</button>
      </li>`
      )
      .join('');
  box.innerHTML = `<ol class="row-order">${listHtml()}</ol>
    <div class="inline"><button class="btn small" data-rows-reset>Alapértelmezett sorrend</button></div>`;
  const list = box.querySelector('.row-order');
  const save = () => opts.onSave(rows.map((r) => ({ key: r.key, on: r.on })));
  const redraw = (focusSel) => {
    list.innerHTML = listHtml();
    if (focusSel) list.querySelector(focusSel)?.focus();
  };
  box.addEventListener('change', (e) => {
    const t = e.target;
    if (t.dataset.rowOn === undefined) return;
    e.stopPropagation();
    rows[Number(t.dataset.rowOn)].on = t.checked;
    t.closest('li').classList.toggle('off', !t.checked);
    save();
  });
  box.addEventListener('click', (e) => {
    const mv = e.target.closest('[data-row-move]');
    if (mv) {
      e.stopPropagation();
      const i = Number(mv.dataset.i);
      const d = Number(mv.dataset.rowMove);
      const j = i + d;
      if (j < 0 || j >= rows.length) return;
      [rows[i], rows[j]] = [rows[j], rows[i]];
      save();
      // A fókusz a mozgatott sor ugyanazon gombján marad (távirányítóval egymás után nyomható).
      redraw(`[data-row-move="${d}"][data-i="${j}"]:not([disabled])`);
      if (!list.contains(document.activeElement)) list.querySelector(`li[data-i="${j}"] [data-row-move]:not([disabled])`)?.focus();
    } else if (e.target.closest('[data-rows-reset]')) {
      e.stopPropagation();
      rows = opts.defaults();
      save();
      redraw();
      toast(opts.resetMsg || 'A sorok visszaálltak az alapértelmezettre');
    }
  });
  let dragFrom = null;
  list.addEventListener('dragstart', (e) => {
    const li = e.target.closest('li');
    dragFrom = li ? Number(li.dataset.i) : null;
    li?.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
  });
  list.addEventListener('dragover', (e) => {
    e.preventDefault();
    const li = e.target.closest('li');
    list.querySelectorAll('.drop').forEach((x) => x.classList.remove('drop'));
    li?.classList.add('drop');
  });
  list.addEventListener('dragend', () => list.querySelectorAll('.dragging, .drop').forEach((x) => x.classList.remove('dragging', 'drop')));
  list.addEventListener('drop', (e) => {
    e.preventDefault();
    const li = e.target.closest('li');
    if (dragFrom === null || !li) return;
    const to = Number(li.dataset.i);
    const [item] = rows.splice(dragFrom, 1);
    rows.splice(to, 0, item);
    dragFrom = null;
    save();
    redraw();
  });
}

// ---------------------------------------------------------------------------
// Rács fokozatos betöltéssel
// ---------------------------------------------------------------------------
export function gridEl(channels, { title = '', chunk = 90, empty = 'Nincs találat.' } = {}) {
  const ctx = registerContext(title, channels);
  const el = html(`<div class="grid-wrap"><div class="grid"></div><div class="grid-sentinel"></div></div>`);
  const grid = el.firstElementChild;
  if (!channels.length) {
    el.innerHTML = `<p class="empty">${esc(empty)}</p>`;
    return el;
  }
  let n = 0;
  const more = () => {
    const part = channels.slice(n, n + chunk);
    grid.insertAdjacentHTML('beforeend', part.map((c) => cardHtml(c, { context: ctx })).join(''));
    health.queueChannels(part);
    n += part.length;
    if (n >= channels.length) io.disconnect();
  };
  const io = new IntersectionObserver((ents) => ents.some((x) => x.isIntersecting) && more(), { rootMargin: '800px' });
  more();
  io.observe(el.lastElementChild);
  return el;
}

// ---------------------------------------------------------------------------
// Modális ablak
// ---------------------------------------------------------------------------
const modalStack = [];
export function openModal(content, { cls = '', onClose } = {}) {
  const root = document.getElementById('modal-root');
  const prevFocus = document.activeElement;
  const wrap = html(`<div class="modal-backdrop"><div class="modal ${cls}" role="dialog" aria-modal="true">
    <button class="modal-close round" aria-label="Bezárás">${ICON.close}</button></div></div>`);
  const modal = wrap.firstElementChild;
  modal.append(content);
  const close = () => {
    const i = modalStack.indexOf(close);
    if (i >= 0) modalStack.splice(i, 1);
    wrap.classList.remove('show');
    setTimeout(() => wrap.remove(), 200);
    prevFocus?.focus?.({ preventScroll: true });
    onClose?.();
  };
  close.el = wrap;
  wrap.addEventListener('mousedown', (e) => {
    if (e.target === wrap) close();
  });
  modal.querySelector('.modal-close').onclick = close;
  root.append(wrap);
  modalStack.push(close);
  requestAnimationFrame(() => {
    wrap.classList.add('show');
    (modal.querySelector('[autofocus]') || modal.querySelector('.btn, button'))?.focus({ preventScroll: true });
  });
  return close;
}
export function closeTopModal() {
  const c = modalStack[modalStack.length - 1];
  if (c) {
    c();
    return true;
  }
  return false;
}
export const modalOpen = () => modalStack.length > 0;
export const topModalEl = () => modalStack[modalStack.length - 1]?.el;

export function confirmDialog(message, { ok = 'Rendben', cancel = 'Mégse', danger = false } = {}) {
  return new Promise((resolve) => {
    const el = html(`<div class="dialog"><p>${esc(message)}</p><div class="dialog-btns">
      <button class="btn ${danger ? 'danger' : 'primary'}" data-v="1" autofocus>${esc(ok)}</button>
      <button class="btn" data-v="0">${esc(cancel)}</button></div></div>`);
    let result = false;
    const close = openModal(el, { cls: 'small' });
    el.querySelectorAll('[data-v]').forEach((b) => {
      b.onclick = () => {
        result = b.dataset.v === '1';
        close();
        resolve(result);
      };
    });
  });
}

export function promptDialog(message, value = '') {
  return new Promise((resolve) => {
    const el = html(`<form class="dialog"><label>${esc(message)}<input class="input" value="${esc(value)}" autofocus /></label>
      <div class="dialog-btns"><button class="btn primary" type="submit">Mentés</button><button class="btn" type="button" data-cancel>Mégse</button></div></form>`);
    const close = openModal(el, { cls: 'small' });
    el.onsubmit = (e) => {
      e.preventDefault();
      close();
      resolve(el.querySelector('input').value.trim());
    };
    el.querySelector('[data-cancel]').onclick = () => {
      close();
      resolve(null);
    };
  });
}

// ---------------------------------------------------------------------------
// Csatorna-adatlap
// ---------------------------------------------------------------------------
export function openInfo(ch) {
  const el = html(`<div class="info" data-id="${esc(ch.id)}"></div>`);
  let day = 0;
  let huHtml = ''; // a csatorna magyar leírása (Wikipédia / Wikidata), ha található
  const render = () => {
    const now = epg.now(ch.id);
    const fav = store.isFavorite(ch.id);
    const st = channelStatus(ch);
    const langs = ch.languages.map((l) => catalog.languages.get(l)?.name || languageName(l)).join(', ');
    const facts = [
      ['Ország', `${countryFlag(ch.country)} ${esc(countryName(ch.country))}`],
      ['Kategória', ch.categories.map((c) => esc(categoryName(c))).join(', ')],
      ['Nyelv', esc(langs)],
      ['Hálózat', esc(ch.network)],
      ['Tulajdonos', esc(ch.owners.join(', '))],
      ['Indulás', esc(ch.launched)],
      ['Megszűnt', esc(ch.closed)],
      ['Más néven', esc(ch.altNames.filter((n) => n !== ch.name).join(', '))],
      ['Időzóna', esc(ch.timezones.join(', '))],
      ['Csatornalisták', esc(ch.custom)],
      [
        'Weboldal',
        ch.website ? `<a href="#" data-ext="${esc(ch.website)}">${esc(ch.website.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, ''))}</a>` : '',
      ],
    ].filter((f) => f[1] && f[1].trim());

    const from = dayStart(Date.now(), day);
    const progs = epg.range(ch.id, from, from + 24 * 3600e3);
    const t = Date.now();
    const streams = orderedStreams(ch);

    el.innerHTML = `
      <div class="info-hero" style="--h:${hashHue(ch.name)}">
        <div class="info-logo">${logoHtml(ch)}</div>
        <div class="info-head">
          <h1>${esc(ch.name)}</h1>
          <div class="info-tags">
            <span class="st-label st-${st}">${st === 'ok' ? 'Működik' : st === 'bad' ? offlineLabel(ch) + ' – jelenleg nem elérhető' : 'Nem ellenőrzött'}</span>
            ${qualityBadge(ch) ? `<span class="pill">${qualityBadge(ch)}</span>` : ''}
            ${ch.streams.length > 1 ? `<span class="pill">${ch.streams.length} forrás</span>` : ''}
            ${{ sure: '<span class="pill warn" title="Az adó innen elutasította a kérést (403 / 451)">🌐 Földrajzi korlát – innen nem nézhető</span>', maybe: '<span class="pill warn" title="A lista szerint csak bizonyos országokból nézhető">🌐 Földrajzilag korlátozott lehet</span>' }[geoState(ch)] || ''}
            ${ch.streams.every((s) => s.notAlways) ? '<span class="pill warn">Nem 0–24</span>' : ''}
          </div>
          ${now?.cur ? `<div class="info-now"><span class="now-label">MOST</span> <b>${esc(now.cur.title)}</b> <span class="muted">${fmtTime(now.cur.start)}–${fmtTime(now.cur.stop)}</span>
            <div class="bar wide"><i style="width:${(now.progress * 100).toFixed(1)}%"></i></div>
            ${now.cur.desc ? `<p class="desc">${esc(now.cur.desc)}</p>` : ''}</div>` : ''}
          <div class="info-btns">
            <button class="btn primary big" data-a="play" autofocus>${ICON.play} Lejátszás</button>
            <button class="round" data-a="fav" title="${fav ? 'Eltávolítás a kedvencekből' : 'Kedvencekhez'}">${fav ? ICON.check : ICON.plus}</button>
            ${store.profile.kids ? '' : `<button class="btn ${isKidsChannel(ch) ? 'on' : ''}" data-a="kids" title="Minden profilban: a gyerekprofilok alapból a gyerektartalmat nézhetik">${isKidsChannel(ch) ? ICON.check + ' ' : ''}Gyerektartalom</button>`}
          </div>
        </div>
      </div>
      <div class="info-body">
        <div class="info-schedule">
          <div class="sched-head"><h3>Műsor</h3>
            <div class="tabs">${[-1, 0, 1, 2]
              .map((d) => `<button class="tab ${d === day ? 'active' : ''}" data-day="${d}">${dayLabel(d)}</button>`)
              .join('')}</div></div>
          ${
            progs.length
              ? `<ol class="sched">${progs
                  .map((p) => {
                    const live = p.start <= t && p.stop > t;
                    const past = p.stop <= t;
                    const rem = store.hasReminder(ch.id, p.start);
                    return `<li class="${live ? 'live' : ''} ${past ? 'past' : ''}" data-start="${p.start}">
                      <span class="time">${fmtTime(p.start)}</span>
                      <div class="pt"><b>${esc(p.title)}</b>${p.subtitle ? ` <span class="muted">– ${esc(p.subtitle)}</span>` : ''}
                        ${p.category ? `<span class="pill small">${esc(p.category)}</span>` : ''}
                        ${p.desc ? `<p>${esc(p.desc)}</p>` : ''}</div>
                      ${live ? '<span class="now-label">MOST</span>' : ''}
                      ${!past && !live ? `<button class="round small ${rem ? 'on' : ''}" data-rem="${p.start}" title="${rem ? 'Emlékeztető törlése' : 'Emlékeztető'}">${ICON.bell}</button>` : ''}
                    </li>`;
                  })
                  .join('')}</ol>`
              : `<p class="empty">${epg.has(ch.id) ? 'Erre a napra nincs műsoradat.' : 'Ehhez a csatornához nem érhető el műsorújság. A beállításokban további forrásokat adhatsz meg.'}</p>`
          }
        </div>
        <div class="info-side">
          ${huHtml}
          <dl class="facts">${facts.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('')}</dl>
          <h3>Adásforrások</h3>
          <ul class="streams">${streams
            .map((s, i) => {
              const h = store.healthOf(s.url);
              const sst = h ? (h.ok ? 'ok' : 'bad') : 'unknown';
              return `<li><span class="st st-${sst}"></span>
                <span class="s-name">${esc(s.feedName && s.feedName !== 'SD' ? s.feedName : `Forrás ${i + 1}`)}${s.quality ? ` · ${esc(s.quality)}` : ''}
                ${s.geoBlocked ? ' · <span class="warn">korlátozott</span>' : ''}${s.notAlways ? ' · <span class="warn">nem 0–24</span>' : ''}</span>
                <button class="btn small" data-stream="${esc(s.url)}">${ICON.play}</button></li>`;
            })
            .join('')}</ul>
          ${health.available ? '<button class="btn small" data-a="check">Források ellenőrzése</button>' : ''}
        </div>
      </div>`;
  };
  // Újrarajzoláskor a fókusz ugyanarra a gombra kerüljön vissza (távirányítóval fontos).
  const draw = () => {
    const f = el.contains(document.activeElement) ? document.activeElement : null;
    const sel = f && ['a', 'rem', 'day', 'stream'].map((k) => (f.dataset[k] !== undefined ? `[data-${k}="${CSS.escape(f.dataset[k])}"]` : '')).find(Boolean);
    render();
    if (sel) (el.querySelector(sel) || el.querySelector('[data-a="play"]'))?.focus({ preventScroll: true });
  };
  render();
  const close = openModal(el, { cls: 'wide' });
  channelInfo(ch).then((m) => {
    if (!m || !document.body.contains(el)) return;
    huHtml = infoBoxHtml(m, { kind: 'channel' }).replace('<h3>Információk</h3>', '<h3>A csatornáról</h3>');
    draw();
  });

  el.addEventListener('click', async (e) => {
    const a = e.target.closest('[data-a]')?.dataset.a;
    const ext = e.target.closest('[data-ext]')?.dataset.ext;
    const dayBtn = e.target.closest('[data-day]');
    const rem = e.target.closest('[data-rem]');
    const sb = e.target.closest('[data-stream]');
    if (ext) {
      e.preventDefault();
      api.openExternal(ext);
    } else if (a === 'play') {
      close();
      player.play(ch);
    } else if (a === 'fav') {
      store.toggleFavorite(ch.id);
      draw();
    } else if (a === 'kids') {
      // minden profilban közös jelölés (a gyerekprofilok alapból ezt nézhetik)
      setKidsMark('ch', ch, !isKidsChannel(ch));
      toast(isKidsChannel(ch) ? `${ch.name}: gyerektartalomként jelölve` : `${ch.name}: nem gyerektartalom`);
      draw();
    } else if (a === 'check') {
      e.target.disabled = true;
      e.target.textContent = 'Ellenőrzés…';
      try {
        const { results } = await api.checkStreams(ch.streams.map((s) => ({ url: s.url, ua: s.ua, referrer: s.referrer })));
        // ok: true / false, vagy 'geo' (403 / 451) – a szöveg „igaz” lenne, ezért külön adjuk át
      for (const [url, ok] of Object.entries(results)) store.setHealth(url, ok === true, 'probe', ok === 'geo');
        bus.emit('health');
      } catch (err) {
        toast('Az ellenőrzés nem sikerült: ' + (err.message || err));
      }
      draw();
    } else if (dayBtn) {
      day = Number(dayBtn.dataset.day);
      draw();
    } else if (rem) {
      const p = epg.list(ch.id).find((x) => x.start === Number(rem.dataset.rem));
      if (p) {
        const on = store.toggleReminder(ch.id, p);
        toast(on ? `Emlékeztető beállítva: ${p.title} (${fmtTime(p.start)})` : 'Emlékeztető törölve');
        draw();
      }
    } else if (sb) {
      const s = ch.streams.find((x) => x.url === sb.dataset.stream);
      close();
      player.play(ch, { stream: s });
    }
  });
  // Görgetés az éppen futó műsorhoz.
  requestAnimationFrame(() => el.querySelector('.sched .live')?.scrollIntoView({ block: 'center' }));
  return close;
}

// ---------------------------------------------------------------------------
// Műsor-adatlap (műsorújságból, keresésből)
// ---------------------------------------------------------------------------
/** További gombok a műsor-adatlapra (pl. felvétel): { html(ch, p) → string, run(akció, ch, p) → true, ha kezelte } */
export const programExtras = [];

/** Naptárfájl (.ics) egy műsorhoz – bármelyik naptár (Google, Outlook, telefon) beolvassa. */
export function icsFor(items) {
  const d = (t) => new Date(t).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const tx = (s) => String(s || '').replace(/[\\;,]/g, (m) => '\\' + m).replace(/\r?\n/g, '\\n');
  return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Adas//HU', 'CALSCALE:GREGORIAN',
    ...items.flatMap(({ ch, p }) => ['BEGIN:VEVENT', `UID:${d(p.start)}-${String(ch.id).replace(/[^\w.-]/g, '')}@adas`, `DTSTAMP:${d(Date.now())}`, `DTSTART:${d(p.start)}`, `DTEND:${d(p.stop)}`,
      `SUMMARY:${tx(p.title)}`, `LOCATION:${tx(ch.name)}`, `DESCRIPTION:${tx(p.desc || '')}`, 'BEGIN:VALARM', 'TRIGGER:-PT5M', 'ACTION:DISPLAY', `DESCRIPTION:${tx(p.title)}`, 'END:VALARM', 'END:VEVENT']),
    'END:VCALENDAR'].join('\r\n');
}

export function openProgram(ch, p) {
  const t = Date.now();
  const live = p.start <= t && p.stop > t;
  const future = p.start > t;
  const el = html(`<div class="prog-detail" data-id="${esc(ch.id)}">
    <div class="pd-head"><div class="pd-logo" style="--h:${hashHue(ch.name)}">${logoHtml(ch)}</div>
      <div><div class="muted">${esc(ch.name)} · ${fmtDay(p.start)}</div>
      <h2>${esc(p.title)}</h2>
      <div class="muted">${fmtTime(p.start)}–${fmtTime(p.stop)} · ${fmtDuration(p.stop - p.start)}${p.category ? ' · ' + esc(p.category) : ''}</div></div></div>
    ${p.subtitle ? `<h4>${esc(p.subtitle)}</h4>` : ''}
    ${p.desc ? `<p class="desc">${esc(p.desc)}</p>` : ''}
    ${live ? `<div class="bar wide"><i style="width:${(((t - p.start) / (p.stop - p.start)) * 100).toFixed(1)}%"></i></div>` : ''}
    <div class="dialog-btns">
      ${live || !future ? `<button class="btn primary" data-a="play" autofocus>${ICON.play} ${live ? 'Nézem most' : 'Csatorna lejátszása'}</button>` : ''}
      ${future ? `<button class="btn ${store.hasReminder(ch.id, p.start) ? '' : 'primary'}" data-a="rem" autofocus>${ICON.bell} ${store.hasReminder(ch.id, p.start) ? 'Emlékeztető törlése' : 'Emlékeztető'}</button>` : ''}
      ${future ? `<button class="btn" data-a="play">${ICON.play} Csatorna most</button>` : ''}
      <button class="btn ${hasSeries(ch.id, p.title) ? 'on' : ''}" data-a="series" title="Emlékeztető a műsor minden adására ezen a csatornán">↻ ${hasSeries(ch.id, p.title) ? 'Minden adás: be' : 'Minden adására'}</button>
      ${programExtras.map((x) => x.html(ch, p)).join('')}
      ${future && api.saveFile ? '<button class="btn" data-a="ics" title="Naptárfájl (.ics) – Google, Outlook, telefon">Naptárba</button>' : ''}
      <button class="btn" data-a="info">Csatorna adatai</button>
    </div></div>`);
  const close = openModal(el, { cls: 'medium' });
  el.addEventListener('click', (e) => {
    const a = e.target.closest('[data-a]')?.dataset.a;
    if (a === 'play') {
      close();
      player.play(ch);
    } else if (a === 'rem') {
      const on = store.toggleReminder(ch.id, p);
      toast(on ? `Emlékeztető beállítva: ${p.title} (${fmtTime(p.start)})` : 'Emlékeztető törölve');
      close();
    } else if (a === 'series') {
      const on = toggleSeries(ch.id, p.title);
      toast(on ? `Emlékeztető a(z) „${p.title}” minden adására (${ch.name})` : 'A „minden adására” emlékeztető törölve');
      close();
    } else if (a === 'info') {
      close();
      openInfo(ch);
    } else if (a === 'ics') {
      api.saveFile(`musor-${String(p.title).replace(/[\s\/\\:*?"<>|]+/g, '-').slice(0, 40)}.ics`, icsFor([{ ch, p }])).then((ok) => ok && toast('A naptárfájl elmentve – nyisd meg a naptáradban.'));
    } else if (a) {
      if (programExtras.some((x) => x.run(a, ch, p))) close();
    }
  });
}

/** A TV oldal fülei: csatornák és (asztali változatban) a tévéfelvételek. */
export function tvTabs(cur) {
  if (!api.recStart) return '';
  const tab = (id, href, label) => `<a class="tab ${cur === id ? 'active' : ''}" href="${href}">${label}</a>`;
  return `<div class="tabs vod-tabs tv-tabs">${tab('tv', '#/tv', 'Csatornák')}${tab('rec', '#/recordings', 'Felvételek')}</div>`;
}

export function emptyState(title, text, action) {
  return `<div class="empty-state"><h2>${esc(title)}</h2><p>${esc(text)}</p>${action || ''}</div>`;
}

export { $ };
