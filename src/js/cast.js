// Kivetítés tévére / hangszóróra: Chromecast és DLNA (UPnP) eszközök a helyi hálózaton.
// Az asztali változat továbbítja az adást (a főfolyamat kis kiszolgálóján át), így a CORS-
// és fejléc-korlátozások (User-Agent, Referer) a kivetítő eszközön sem okoznak gondot.
import { $, html, esc, toast, errText } from './util.js';
import { api } from './api.js';
import { player } from './player.js';
import { openModal, confirmDialog } from './components.js';
import { epg } from './epg.js';

const state = { device: null, status: '', paused: false, devices: [], scanning: false };
const root = $('#player');
const video = $('#video');

const CAST_ICON = '<svg viewBox="0 0 24 24"><path d="M21 3H3a2 2 0 0 0-2 2v3h2V5h18v14h-7v2h7a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2ZM1 18v3h3a3 3 0 0 0-3-3Zm0-4v2a5 5 0 0 1 5 5h2a7 7 0 0 0-7-7Zm0-4v2a9 9 0 0 1 9 9h2A11 11 0 0 0 1 10Z"/></svg>';
const STATE_TEXT = { PLAYING: 'Lejátszás', PAUSED: 'Szüneteltetve', BUFFERING: 'Betöltés…', IDLE: 'Várakozik', LOADING: 'Csatlakozás…' };

function overlay() {
  let el = $('.p-cast', root);
  if (!el) {
    el = html(`<div class="p-cast" hidden><div class="pc-ico">${CAST_ICON}</div><div class="pc-text"></div>
      <div class="dialog-btns"><button class="btn" data-pc="toggle"></button><button class="btn" data-pc="voldown" title="Halkabban">−</button><button class="btn" data-pc="volup" title="Hangosabban">+</button><button class="btn primary" data-pc="stop">Kivetítés leállítása</button></div></div>`);
    root.insertBefore(el, $('.p-top', root));
    el.addEventListener('click', (e) => {
      const a = e.target.closest('[data-pc]')?.dataset.pc;
      if (!a) return;
      e.stopPropagation();
      if (a === 'toggle') hooks.toggle();
      else if (a === 'stop') stopCast(true);
      else if (a === 'volup' || a === 'voldown') {
        state.volume = Math.max(0, Math.min(1, (state.volume ?? 0.5) + (a === 'volup' ? 0.1 : -0.1)));
        api.castControl('volume', state.volume);
      }
    });
  }
  return el;
}

function drawOverlay() {
  const el = overlay();
  if (!state.device) {
    el.hidden = true;
    root.classList.remove('casting');
    return;
  }
  const ch = player.channel;
  const n = ch && !ch.vod ? epg.now(ch.id) : null;
  el.hidden = false;
  root.classList.add('casting');
  el.querySelector('.pc-text').innerHTML = `<div class="muted small">Kivetítve ide</div>
    <h2>${esc(state.device.name)}</h2>
    <div>${esc(ch?.vod?.title || ch?.name || '')}${n?.cur ? ` · ${esc(n.cur.title)}` : ''}</div>
    <div class="muted small">${esc(STATE_TEXT[state.status] || state.status || '')}${state.device.kind === 'dlna' ? ' · DLNA' : ' · Chromecast'}</div>`;
  el.querySelector('[data-pc="toggle"]').textContent = state.paused ? '▶ Folytatás' : '❚❚ Szünet';
}

async function scan(listEl) {
  state.scanning = true;
  listEl.innerHTML = '<p class="muted"><span class="spinner small-spin"></span> Eszközök keresése a hálózaton…</p>';
  try {
    state.devices = await api.castDiscover();
  } catch (err) {
    state.devices = [];
    listEl.innerHTML = `<p class="muted">Hiba a keresésben: ${escerrText(err)}</p>`;
  }
  state.scanning = false;
}

function openMenu() {
  const el = html(`<div class="dialog cast-dialog">
    <h2>Kivetítés</h2>
    <p class="muted small">Chromecast, illetve DLNA-képes tévék és lejátszók ugyanazon a hálózaton. Az adást ez a gép továbbítja, ezért a kivetítés alatt maradjon bekapcsolva.</p>
    <div class="cast-list"></div>
    <div class="dialog-btns"><button class="btn" data-cm="rescan">Újrakeresés</button>${state.device ? '<button class="btn danger" data-cm="stop">Kivetítés leállítása</button>' : ''}</div>
  </div>`);
  const close = openModal(el, { cls: 'small' });
  const list = el.querySelector('.cast-list');
  const draw = () => {
    list.innerHTML = state.devices.length
      ? state.devices
          .map(
            (d) => `<button class="menu-item ${state.device?.id === d.id ? 'sel' : ''}" data-dev="${esc(d.id)}">${CAST_ICON}
              <span><b>${esc(d.name)}</b><small>${esc(d.kind === 'chromecast' ? 'Chromecast' : 'DLNA')}${d.model ? ' · ' + esc(d.model) : ''} · ${esc(d.host)}</small></span></button>`
          )
          .join('')
      : '<p class="muted">Nem található eszköz. Ellenőrizd, hogy a tévé / Chromecast be van-e kapcsolva, és ugyanazon a hálózaton van-e. Első használatkor a Windows tűzfal engedélyt kérhet – engedélyezd a magánhálózaton.</p>';
    list.querySelector('[data-dev]')?.focus();
  };
  const run = async () => {
    await scan(list);
    if (el.isConnected) draw();
  };
  if (state.devices.length && !state.scanning) draw();
  else run();
  el.addEventListener('click', async (e) => {
    const dev = e.target.closest('[data-dev]');
    const a = e.target.closest('[data-cm]')?.dataset.cm;
    if (a === 'rescan') run();
    else if (a === 'stop') {
      close();
      stopCast(true);
    } else if (dev) {
      const d = state.devices.find((x) => x.id === dev.dataset.dev);
      close();
      startCast(d);
    }
  });
}

async function startCast(dev) {
  if (!player.channel) return;
  const prev = state.device;
  state.device = dev;
  state.status = 'LOADING';
  state.paused = false;
  // A film onnan folytatódik a tévén, ahol itt tartott.
  if (player.channel.vod && !prev && player.engine.started && isFinite(video.duration)) player.resumeAt = video.currentTime;
  drawOverlay();
  player.renderControls();
  player.tried = new Set();
  await player.tryStream(player.stream || player.channel.streams[0]);
}

/** Kivetítés vége; resume: a gépen folytatódjon-e a lejátszás. */
function stopCast(resume, reason = '') {
  if (!state.device) return;
  const name = state.device.name;
  state.device = null;
  api.castControl('disconnect');
  drawOverlay();
  if (reason) toast(`Kivetítés vége (${name}): ${reason}`);
  if (resume && player.active && player.channel) {
    if (player.channel.vod && state.time) player.resumeAt = state.time;
    player.tried = new Set();
    player.tryStream(player.stream || player.channel.streams[0]);
  }
  player.renderControls();
}

const hooks = {
  get available() {
    return !!api.caps?.cast;
  },
  get active() {
    return !!state.device;
  },
  get paused() {
    return state.paused;
  },
  get deviceName() {
    return state.device?.name || '';
  },
  menu: openMenu,
  async load(ch, stream, at = 0) {
    const n = !ch.vod ? epg.now(ch.id) : null;
    state.status = 'LOADING';
    drawOverlay();
    const opts = {
      deviceId: state.device.id,
      url: stream.url,
      type: '',
      live: !ch.vod,
      title: ch.vod ? ch.vod.title : ch.name,
      subtitle: ch.vod ? ch.vod.subtitle || '' : n?.cur?.title || '',
      image: ch.vod?.item?.poster || ch.logo || '',
    };
    try {
      await api.castPlay(opts);
    } catch (err) {
      // A Chromecast tanúsítványa más, mint amit első kapcsolódáskor megjegyeztünk: csak a felhasználó
      // jóváhagyásával fogadjuk el az újat (pl. gyári visszaállítás után) – különben egy álcázott eszköz lehet.
      if (/CERT_CHANGED/.test(errText(err)) && api.castForget) {
        const ok = await confirmDialog(`A(z) „${state.device.name}” eszköz azonosító tanúsítványa megváltozott az előző kapcsolódás óta. Ez gyári visszaállítás után normális, de jelentheti azt is, hogy egy másik eszköz adja ki magát érte. Megbízol benne, és kivetíted rá?`, { ok: 'Megbízom benne', danger: true });
        if (!ok) throw new Error('Kivetítés: az eszköz tanúsítványa megváltozott – megszakítva.');
        await api.castForget(state.device.id);
        try {
          await api.castPlay(opts);
        } catch (err2) {
          throw new Error('Kivetítés: ' + errText(err2));
        }
      } else throw new Error('Kivetítés: ' + errText(err));
    }
    if (at > 30) setTimeout(() => api.castControl('seek', at), 1500);
    state.paused = false;
    drawOverlay();
    toast(`Kivetítve: ${state.device.name}`);
  },
  toggle() {
    if (!state.device) return;
    state.paused = !state.paused;
    api.castControl(state.paused ? 'pause' : 'play');
    drawOverlay();
    player.renderControls();
  },
  seekBy(sec) {
    if (!state.device) return;
    state.time = Math.max(0, (state.time || 0) + sec);
    api.castControl('seek', state.time);
    player.showOsd(player.channel, `${sec > 0 ? '+' : ''}${sec} mp`);
  },
  onClose() {
    // A lejátszó bezárásakor a kivetítés is leáll.
    if (state.device) stopCast(false);
  },
};
player.castHooks = hooks;

if (api.onCastStatus) {
  api.onCastStatus((s) => {
    if (!state.device || s.id !== state.device.id) return;
    if (s.state === 'ENDED') return stopCast(player.active, s.reason || '');
    state.status = s.state;
    if (s.state === 'PAUSED') state.paused = true;
    if (s.state === 'PLAYING') state.paused = false;
    if (typeof s.time === 'number') state.time = s.time;
    if (typeof s.volume === 'number') state.volume = s.volume;
    if (s.state === 'IDLE' && s.idle === 'ERROR') toast('A kivetítő eszköz nem tudta lejátszani ezt az adást.');
    if (s.state === 'IDLE' && s.idle === 'FINISHED' && player.channel?.vod) {
      const next = player.vodHooks?.next(player.channel, 1);
      if (next && player.vodHooks.autoNext()) player.playVod(next);
    }
    drawOverlay();
    player.renderControls();
  });
}
