import { _t, LOCALE } from './i18n.js';
// Apró segédfüggvények: HTML-escape, DOM, idő, szöveg-normalizálás, eseménybusz.

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ESC[c]);

/** HTML-sablonból egyetlen elem. Minden behelyettesített külső szöveget esc()-pel kell átadni. */
export function html(str) {
  const t = document.createElement('template');
  t.innerHTML = str.trim();
  return t.content.firstElementChild;
}

/** Ékezetek nélküli, kisbetűs alak kereséshez. */
export function norm(s) {
  return String(s || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
}

/** Csak betűk és számok – azonosítók összevetéséhez. */
export function key(s) {
  return norm(s).replace(/[^a-z0-9]/g, '');
}

export function hashHue(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h) % 360;
}

// A Unicode-tulajdonság szerinti regex régi böngészőmotorokon (pl. webOS 4) szintaktikai hiba lenne.
let NON_WORD;
try {
  NON_WORD = new RegExp('[^\\p{L}\\p{N} ]', 'gu');
} catch {
  NON_WORD = /[^0-9A-Za-zÀ-ɏͰ-ϿЀ-ӿ ]/g;
}

export function initials(name) {
  const words = String(name).replace(NON_WORD, ' ').split(/\s+/).filter(Boolean);
  if (!words.length) return '?';
  if (words.length === 1) return words[0].slice(0, 3).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

export function debounce(fn, ms) {
  let t;
  return (...a) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...a), ms);
  };
}

const timeFmt = new Intl.DateTimeFormat(LOCALE, { hour: '2-digit', minute: '2-digit' });
const dayFmt = new Intl.DateTimeFormat(LOCALE, { weekday: 'long', month: 'long', day: 'numeric' });
export const fmtTime = (t) => timeFmt.format(new Date(t));
export const fmtDay = (t) => dayFmt.format(new Date(t));

export function dayStart(t = Date.now(), offsetDays = 0) {
  const d = new Date(t);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + offsetDays);
  return d.getTime();
}

export function dayLabel(offset) {
  if (offset === 0) return _t('Ma');
  if (offset === 1) return _t('Holnap');
  if (offset === -1) return _t('Tegnap');
  return new Intl.DateTimeFormat(LOCALE, { weekday: 'long' }).format(new Date(dayStart(Date.now(), offset)));
}

export function fmtDuration(ms) {
  const m = Math.round(ms / 60000);
  if (m < 60) return `${_t('{m} perc', { m })}`;
  const h = Math.floor(m / 60);
  return m % 60 ? `${_t('{h} óra {x} perc', { h, x: m % 60 })}` : `${_t('{h} óra', { h })}`;
}

/** Nagyon egyszerű eseménybusz. */
const listeners = new Map();
export const bus = {
  on(ev, fn) {
    if (!listeners.has(ev)) listeners.set(ev, new Set());
    listeners.get(ev).add(fn);
    return () => listeners.get(ev).delete(fn);
  },
  emit(ev, data) {
    (listeners.get(ev) || []).forEach((fn) => fn(data));
  },
};

// ---------------------------------------------------------------------------
// Értesítések (toast)
// ---------------------------------------------------------------------------
export function toast(message, { action, onAction, timeout = 4500 } = {}) {
  const root = document.getElementById('toasts');
  const t = html(`<div class="toast"><span>${esc(message)}</span></div>`);
  if (action) {
    const b = html(`<button class="toast-btn">${esc(action)}</button>`);
    b.onclick = () => {
      onAction?.();
      t.remove();
    };
    t.append(b);
  }
  root.append(t);
  requestAnimationFrame(() => t.classList.add('show'));
  setTimeout(() => {
    t.classList.remove('show');
    setTimeout(() => t.remove(), 400);
  }, timeout);
}

/** Megbízható, napon belül stabil keverés (változatos sorok a főoldalon). */
export function seededShuffle(arr, seed) {
  const a = arr.slice();
  let s = seed >>> 0 || 1;
  for (let i = a.length - 1; i > 0; i--) {
    s = (s * 1664525 + 1013904223) >>> 0;
    const j = s % (i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Hibaüzenet a főfolyamatból érkező „Error invoking remote method …” előtag nélkül. */
export const errText = (e) => String(e?.message || e || '').replace(/^Error invoking remote method '[^']+': (?:\w*Error: )?/, '');
