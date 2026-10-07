// Több adás egyszerre: 2 vagy 4 csatorna egy képernyőn (pl. sporthoz, hírekhez).
// A kijelölt ablak szól, a többi némítva fut. Távirányítóval: nyilak = kijelölés,
// OK = csatornacsere / üres ablakba csatorna, Lejátszás gomb vagy F = teljes nézet, Vissza = kilépés.
import { $, html, esc, hashHue, toast } from './util.js';
import { api } from './api.js';
import { store } from './store.js';
import { epg } from './epg.js';
import { orderedStreams, visible, getChannels, search, offlineLabel } from './catalog.js';
import { Engine } from './engine.js';
import { player } from './player.js';
import { logoHtml, openModal } from './components.js';

const state = { el: null, tiles: [], sel: 0, layout: 4 };

const maxTiles = () => api.caps?.multiview || 0;
export const multiOpen = () => !!state.el;

function tileHtml(i) {
  return `<div class="mv-tile empty" data-i="${i}" tabindex="0">
    <video playsinline muted></video>
    <div class="mv-empty"><span class="mv-plus">+</span><span>Csatorna választása</span></div>
    <div class="mv-label"></div>
    <div class="mv-state"></div>
    <div class="mv-tools">
      <button class="round small" data-mv="swap" title="Másik csatorna (OK)">⇄</button>
      <button class="round small" data-mv="full" title="Teljes nézet (F)">⤢</button>
      <button class="round small" data-mv="remove" title="Ablak ürítése (Del)">✕</button>
    </div>
  </div>`;
}

export function openMultiview(initial = []) {
  if (!maxTiles()) return toast('Ezen az eszközön a többképes nézet nem érhető el.');
  if (player.active) player.close();
  if (state.el) closeMultiview();
  state.layout = Math.min(store.profile.multiLayout || maxTiles(), maxTiles());
  const el = html(`<section id="multiview" class="layout-${state.layout}">
    <div class="mv-head">
      <b>Több adás egyszerre</b>
      <span class="muted small">Nyilak: ablak kijelölése · OK: csatorna · F: teljes nézet · M: némítás · Vissza: kilépés</span>
      <span class="grow"></span>
      ${maxTiles() >= 4 ? `<button class="btn small" data-mvl="2">2 ablak</button><button class="btn small" data-mvl="4">4 ablak</button>` : ''}
      <button class="btn small" data-mv-close>Bezárás</button>
    </div>
    <div class="mv-grid">${Array.from({ length: 4 }, (_, i) => tileHtml(i)).join('')}</div>
  </section>`);
  document.body.append(el);
  document.body.classList.add('playing');
  state.el = el;
  state.tiles = [...el.querySelectorAll('.mv-tile')].map((t) => {
    const v = t.querySelector('video');
    const tile = { el: t, video: v, ch: null, eng: null };
    tile.eng = new Engine(v, {
      onFail: () => setTileState(tile, 'Az adás megszakadt'),
      onStall: (on) => setTileState(tile, on ? 'Pufferelés…' : ''),
    });
    return tile;
  });
  api.setPlaying(true);
  // Kezdő csatornák: a megadottak, majd a kedvencek.
  const vis = new Set(visible());
  const favs = getChannels(store.profile.favorites).filter((c) => vis.has(c) && !offlineLabel(c));
  const home = visible().filter((c) => c.country === store.settings.homeCountry && c.logo && !offlineLabel(c));
  // Ugyanaz az adás két néven (két listából) ne kerüljön kétszer a képernyőre.
  const seen = new Set();
  const start = [...new Set([...initial.filter(Boolean), ...favs, ...home])]
    .filter((c) => {
      const u = orderedStreams(c)[0]?.url;
      if (!u || seen.has(u)) return false;
      seen.add(u);
      return true;
    })
    .slice(0, state.layout);
  start.forEach((ch, i) => assign(i, ch));
  select(0);
  applyLayout();

  el.addEventListener('click', (e) => {
    const layoutBtn = e.target.closest('[data-mvl]');
    if (layoutBtn) return setLayout(Number(layoutBtn.dataset.mvl));
    if (e.target.closest('[data-mv-close]')) return closeMultiview();
    const t = e.target.closest('.mv-tile');
    if (!t) return;
    const i = Number(t.dataset.i);
    const a = e.target.closest('[data-mv]')?.dataset.mv;
    if (a === 'swap') return pick(i);
    if (a === 'full') return fullView(i);
    if (a === 'remove') return assign(i, null);
    if (!state.tiles[i].ch) return pick(i);
    select(i);
  });
  el.addEventListener('dblclick', (e) => {
    const t = e.target.closest('.mv-tile');
    if (t && state.tiles[Number(t.dataset.i)].ch) fullView(Number(t.dataset.i));
  });
}

export function closeMultiview() {
  if (!state.el) return;
  state.tiles.forEach((t) => t.eng.stop());
  state.el.remove();
  state.el = null;
  state.tiles = [];
  if (!player.active) {
    document.body.classList.remove('playing');
    api.setPlaying(false);
  }
}

function applyLayout() {
  state.el.className = `layout-${state.layout}`;
  state.tiles.forEach((t, i) => {
    const on = i < state.layout;
    t.el.hidden = !on;
    if (!on && t.ch) assign(i, null);
  });
  state.el.querySelectorAll('[data-mvl]').forEach((b) => b.classList.toggle('primary', Number(b.dataset.mvl) === state.layout));
  if (state.sel >= state.layout) select(0);
}

function setLayout(n) {
  state.layout = n;
  store.profile.multiLayout = n;
  store.save();
  applyLayout();
  // A felszabadult helyekre kedvencek kerülnek.
  const used = new Set(state.tiles.map((t) => t.ch?.id).filter(Boolean));
  const favs = getChannels(store.profile.favorites).filter((c) => !used.has(c.id) && !offlineLabel(c));
  state.tiles.slice(0, n).forEach((t, i) => !t.ch && favs.length && assign(i, favs.shift()));
}

function setTileState(tile, text) {
  tile.el.querySelector('.mv-state').textContent = text;
  tile.el.classList.toggle('has-state', !!text);
}

function label(tile) {
  const ch = tile.ch;
  const n = ch && epg.now(ch.id);
  tile.el.querySelector('.mv-label').innerHTML = ch
    ? `<span class="mv-logo" style="--h:${hashHue(ch.name)}">${logoHtml(ch, 'logo-sm')}</span><span><b>${esc(ch.name)}</b>${n?.cur ? `<small>${esc(n.cur.title)}</small>` : ''}</span>`
    : '';
}

async function assign(i, ch) {
  const tile = state.tiles[i];
  if (!tile) return;
  tile.ch = ch;
  tile.el.classList.toggle('empty', !ch);
  label(tile);
  tile.eng.stop();
  setTileState(tile, '');
  if (!ch) return;
  setTileState(tile, 'Csatlakozás…');
  const streams = orderedStreams(ch);
  for (const s of streams.slice(0, 3)) {
    try {
      await tile.eng.load(s, { muted: i !== state.sel });
      if (tile.ch !== ch) return;
      tile.video.muted = i !== state.sel;
      tile.video.volume = store.settings.volume;
      setTileState(tile, '');
      store.setHealth(s.url, true);
      return;
    } catch (err) {
      if (tile.ch !== ch || err.message === 'megszakítva') return;
      store.setHealth(s.url, false);
    }
  }
  setTileState(tile, 'Ez az adás most nem érhető el');
}

function select(i) {
  state.sel = i;
  state.tiles.forEach((t, n) => {
    t.el.classList.toggle('sel', n === i);
    if (t.eng.started) t.video.muted = n !== i;
  });
  state.tiles[i]?.el.focus({ preventScroll: true });
}

function fullView(i) {
  const ch = state.tiles[i]?.ch;
  if (!ch) return;
  const ids = state.tiles.map((t) => t.ch?.id).filter(Boolean);
  closeMultiview();
  player.play(ch, { context: { title: 'Több adás', ids } });
}

function pick(i) {
  const el = html(`<div class="dialog mv-pick">
    <h2>Csatorna a(z) ${i + 1}. ablakba</h2>
    <input class="input" type="search" placeholder="Keresés…" autofocus />
    <div class="mv-pick-list"></div>
  </div>`);
  const close = openModal(el, { cls: 'medium' });
  const input = el.querySelector('input');
  const list = el.querySelector('.mv-pick-list');
  const fill = () => {
    const q = input.value.trim();
    const favs = getChannels(store.profile.favorites);
    const vis = visible();
    const visSet = new Set(vis);
    const items = q ? search(q) : [...favs.filter((c) => visSet.has(c)), ...vis.filter((c) => c.country === store.settings.homeCountry && !favs.includes(c))];
    list.innerHTML = items
      .slice(0, 80)
      .map((c) => {
        const n = epg.now(c.id);
        return `<button class="menu-item" data-id="${esc(c.id)}"><span class="side-logo" style="--h:${hashHue(c.name)}">${logoHtml(c, 'logo-sm')}</span>
          <span><b>${esc(c.name)}</b><small>${offlineLabel(c) ? esc(offlineLabel(c)) : n?.cur ? esc(n.cur.title) : ''}</small></span></button>`;
      })
      .join('') || '<p class="muted">Nincs találat.</p>';
  };
  fill();
  input.addEventListener('input', fill);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown' || e.key === 'Enter') {
      e.preventDefault();
      list.querySelector('[data-id]')?.focus();
    }
  });
  list.addEventListener('click', (e) => {
    const b = e.target.closest('[data-id]');
    if (!b) return;
    close();
    const ch = visible().find((c) => c.id === b.dataset.id) || getChannels([b.dataset.id])[0];
    assign(i, ch);
    select(i);
  });
}

/** Billentyűk (az app.js hívja, ha a többképes nézet nyitva van). */
export function multiKey(e) {
  if (!state.el) return false;
  const k = e.key;
  const cols = 2;
  const n = state.layout;
  const move = (d) => select((state.sel + d + n) % n);
  switch (k) {
    case 'ArrowLeft':
      move(-1);
      return true;
    case 'ArrowRight':
      move(1);
      return true;
    case 'ArrowUp':
      if (n > 2) move(-cols);
      return true;
    case 'ArrowDown':
      if (n > 2) move(cols);
      return true;
    case 'Enter':
      if (e.target.closest?.('button')) return false;
      pick(state.sel);
      return true;
    case 'f':
    case 'F':
    case 'MediaPlay':
    case 'MediaPlayPause':
      fullView(state.sel);
      return true;
    case 'm':
    case 'M': {
      const t = state.tiles[state.sel];
      if (t) t.video.muted = !t.video.muted;
      return true;
    }
    case 'Delete':
      assign(state.sel, null);
      return true;
    case 'Escape':
    case 'Backspace':
    case 'BrowserBack':
      closeMultiview();
      return true;
  }
  if (/^[1-4]$/.test(k) && Number(k) <= n) {
    select(Number(k) - 1);
    return true;
  }
  return false;
}

player.multiHooks = { open: openMultiview };
