// Kivetítés tévére / hangszóróra: Chromecast és DLNA (UPnP) eszközök a helyi hálózaton.
// Az asztali változat továbbítja az adást (a főfolyamat kis kiszolgálóján át), így a CORS-
// és fejléc-korlátozások (User-Agent, Referer) a kivetítő eszközön sem okoznak gondot.
import { $, html, esc, toast, errText, bus } from './util.js';
import { api } from './api.js';
import { player } from './player.js';
import { openModal, confirmDialog } from './components.js';
import { epg } from './epg.js';

import { _t } from './i18n.js';
// gen: a kivetített tartalom munkamenete (minden új tartalom újat kezd – H15 / H29); dur / durKey: a film helyben ismert
// hossza (a vevők nem küldik) a folytatási pont mentéséhez (H28)
const state = { device: null, status: '', paused: false, devices: [], scanning: false, gen: 0, seekTimer: 0, time: 0, dur: 0, durKey: '', savedAt: 0 };
/** (H28) A kivetített film pozíciója a profil folytatási adataiba (kivetítés közben is, nem csak a helyi lejátszásnál). */
function saveCastProgress(force = false) {
  const ch = state.castCh; // (a kivetített tartalom – váltáskor a player.channel már az új)
  if (!ch?.vod || !(state.time > 0) || ch.vod.key !== state.durKey) return;
  if (!force && Date.now() - state.savedAt < 15e3) return;
  state.savedAt = Date.now();
  player.vodHooks?.progress(ch, state.time, state.dur);
}
const root = $('#player');
const video = $('#video');

const CAST_ICON = '<svg viewBox="0 0 24 24"><path d="M21 3H3a2 2 0 0 0-2 2v3h2V5h18v14h-7v2h7a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2ZM1 18v3h3a3 3 0 0 0-3-3Zm0-4v2a5 5 0 0 1 5 5h2a7 7 0 0 0-7-7Zm0-4v2a9 9 0 0 1 9 9h2A11 11 0 0 0 1 10Z"/></svg>';
const STATE_TEXT = { PLAYING: _t('Lejátszás@@állapot'), PAUSED: _t('Szüneteltetve'), BUFFERING: _t('Betöltés…'), IDLE: _t('Várakozik'), LOADING: _t('Csatlakozás…') };

function overlay() {
  let el = $('.p-cast', root);
  if (!el) {
    el = html(`<div class="p-cast" hidden><div class="pc-ico">${CAST_ICON}</div><div class="pc-text"></div>
      <div class="dialog-btns"><button class="btn" data-pc="toggle"></button><button class="btn" data-pc="voldown" title="${_t('Halkabban')}">−</button><button class="btn" data-pc="volup" title="${_t('Hangosabban')}">+</button><button class="btn primary" data-pc="stop">${_t('Kivetítés leállítása')}</button></div></div>`);
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
  el.querySelector('.pc-text').innerHTML = `<div class="muted small">${_t('Kivetítve ide')}</div>
    <h2>${esc(state.device.name)}</h2>
    <div>${esc(ch?.vod?.title || ch?.name || '')}${n?.cur ? ` · ${esc(n.cur.title)}` : ''}</div>
    <div class="muted small">${esc(STATE_TEXT[state.status] || state.status || '')}${state.device.kind === 'dlna' ? ' · DLNA' : ' · Chromecast'}</div>`;
  el.querySelector('[data-pc="toggle"]').textContent = state.paused ? _t('▶ Folytatás') : _t('❚❚ Szünet');
}

async function scan(listEl) {
  state.scanning = true;
  listEl.innerHTML = `<p class="muted"><span class="spinner small-spin"></span> ${_t('Eszközök keresése a hálózaton…')}</p>`;
  state.scanError = '';
  try {
    state.devices = await api.castDiscover();
  } catch (err) {
    // (B08) a hiba szövege a meglévő errText segéddel, és a rajzoláskor esc-kel – nem a „nincs eszköz” üzenet
    // írja felül; a keresés jelzője minden esetben leáll, az Újrakeresés működik
    state.devices = [];
    state.scanError = errText(err);
  } finally {
    state.scanning = false;
  }
}

function openMenu() {
  const el = html(`<div class="dialog cast-dialog">
    <h2>${_t('Kivetítés')}</h2>
    <p class="muted small">${_t('Chromecast, illetve DLNA-képes tévék és lejátszók ugyanazon a hálózaton. Az adást ez a gép továbbítja, ezért a kivetítés alatt maradjon bekapcsolva.')}</p>
    <div class="cast-list"></div>
    <div class="dialog-btns"><button class="btn" data-cm="rescan">${_t('Újrakeresés')}</button>${state.device ? `<button class="btn danger" data-cm="stop">${_t('Kivetítés leállítása')}</button>` : ''}</div>
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
      : state.scanError
        ? `<p class="muted">${esc(_t('Hiba a keresésben: {escerrText}', { escerrText: state.scanError }))}</p>`
        : `<p class="muted">${_t('Nem található eszköz. Ellenőrizd, hogy a tévé / Chromecast be van-e kapcsolva, és ugyanazon a hálózaton van-e. Első használatkor a Windows tűzfal engedélyt kérhet – engedélyezd a magánhálózaton.')}</p>`;
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
  // (a film helyben ismert hossza – a vevő nem küldi; a folytatási ponthoz kell)
  state.dur = player.channel.vod && isFinite(video.duration) ? video.duration : 0;
  state.durKey = player.channel.vod?.key || '';
  drawOverlay();
  player.renderControls();
  player.tried = new Set();
  await player.tryStream(player.stream || player.channel.streams[0]);
}

/** Kivetítés vége; resume: a gépen folytatódjon-e a lejátszás. */
function stopCast(resume, reason = '') {
  if (!state.device) return;
  saveCastProgress(true); // (H28) a vevőn elért pozíció a folytatási pont
  clearTimeout(state.seekTimer); // (H15) a függő tekerés nem futhat le egy másik munkamenetben
  state.gen++;
  const name = state.device.name;
  state.device = null;
  api.castControl('disconnect');
  bus.emit('cast-state');
  drawOverlay();
  if (reason) toast(`${_t('Kivetítés vége ({name}): {reason}', { name, reason })}`);
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
  /** A vevőn ténylegesen megy-e az adás (szünet és leállt / üresjárati vevő nem számít). */
  get playing() {
    return !!state.device && !state.paused && state.status === 'PLAYING'; // (betöltés / pufferelés még nem nézés)
  },
  get deviceName() {
    return state.device?.name || '';
  },
  /** (U14) a vevő hangereje (a lejátszó általános hangerő- és némításkezelése kivetítéskor ezt állítja) */
  get volume() {
    return state.volume ?? 0.5;
  },
  setVolume(v) {
    state.volume = Math.max(0, Math.min(1, v));
    api.castControl('volume', state.volume);
  },
  toggleMute() {
    const v = this.volume;
    if (v > 0) (state.muteVol = v), this.setVolume(0);
    else this.setVolume(state.muteVol || 0.5);
  },
  menu: openMenu,
  async load(ch, stream, at = 0) {
    const n = !ch.vod ? epg.now(ch.id) : null;
    // (H15 / H29) új tartalom = új munkamenet: a pozíció a kezdőpont (nem az előző filmé), a régi tekerés érvénytelen
    saveCastProgress(true); // (az előző kivetített film pozíciója – a 15 mp-es mentési köz alatt sem vész el)
    const gen = ++state.gen;
    clearTimeout(state.seekTimer);
    state.castCh = ch;
    state.time = at > 0 ? at : 0;
    state.savedAt = 0;
    if ((ch.vod?.key || '') !== state.durKey) (state.dur = 0), (state.durKey = ch.vod?.key || '');
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
      // (Androidon a közvetítő ezekkel kéri le az adást – a vevő ugyanazt kapja, amit a helyi lejátszó)
      ua: stream.ua || '',
      referrer: stream.referrer || '',
      gen, // (H29) a vevő állapotüzenetei ezzel jönnek vissza – a régi tartalomé nem írja felül az újat
    };
    try {
      await api.castPlay(opts);
    } catch (err) {
      // A Chromecast tanúsítványa más, mint amit első kapcsolódáskor megjegyeztünk: csak a felhasználó
      // jóváhagyásával fogadjuk el az újat (pl. gyári visszaállítás után) – különben egy álcázott eszköz lehet.
      if (/CERT_CHANGED/.test(errText(err)) && api.castForget) {
        const ok = await confirmDialog(`${_t('A(z) „{name}” eszköz azonosító tanúsítványa megváltozott az előző kapcsolódás óta. Ez gyári visszaállítás után normális, de jelentheti azt is, hogy egy másik eszköz adja ki magát érte. Megbízol benne, és kivetíted rá?', { name: state.device.name })}`, { ok: _t('Megbízom benne'), danger: true });
        if (!ok) throw new Error(_t('Kivetítés: az eszköz tanúsítványa megváltozott – megszakítva.'));
        await api.castForget(state.device.id);
        try {
          await api.castPlay(opts);
        } catch (err2) {
          throw new Error(`${_t('Kivetítés:')} ` + errText(err2));
        }
      } else throw new Error(`${_t('Kivetítés:')} ` + errText(err));
    }
    if (gen !== state.gen) return; // (közben új tartalom / leállítás jött)
    const dev = state.device?.id;
    if (at > 30) state.seekTimer = setTimeout(() => gen === state.gen && state.device?.id === dev && api.castControl('seek', at), 1500);
    state.paused = false;
    drawOverlay();
    toast(`${_t('Kivetítve: {name}', { name: state.device.name })}`);
  },
  /** (H34) kifejezett lejátszás / szünet (a rendszer médiagombjaihoz – idempotens, nem váltó) */
  setPaused(paused) {
    // (mindig elküldi a kért parancsot: a helyi állapot a vevőhöz képest késhet – a parancs aszinkron jut el)
    if (!state.device) return;
    state.paused = !!paused;
    api.castControl(state.paused ? 'pause' : 'play');
    bus.emit('cast-state');
    drawOverlay();
    player.renderControls();
  },
  toggle() {
    if (!state.device) return;
    state.paused = !state.paused;
    api.castControl(state.paused ? 'pause' : 'play');
    bus.emit('cast-state');
    drawOverlay();
    player.renderControls();
  },
  seekBy(sec) {
    if (!state.device) return;
    state.time = Math.max(0, (state.time || 0) + sec);
    api.castControl('seek', state.time);
    player.showOsd(player.channel, `${sec > 0 ? '+' : ''}${_t('{sec} mp', { sec })}`);
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
    // (H29) egy korábbi tartalom (A → B váltás előtti munkamenet) késői állapota: nem írja B idejét, haladását
    if (typeof s.gen === 'number' && s.gen !== state.gen) return;
    state.status = s.state;
    if (s.state === 'PAUSED') state.paused = true;
    if (s.state === 'PLAYING') state.paused = false;
    bus.emit('cast-state'); // (a gyerek nézési ideje a vevőn indított szünetnél / folytatásnál is pontos – B09)
    if (typeof s.time === 'number') state.time = s.time;
    // (H14) a DLNA-vevő a film hosszát is megadhatja – ha helyben nem volt ismert, ez kell a folytatási ponthoz
    if (typeof s.duration === 'number' && s.duration > 0 && !(state.dur > 0)) state.dur = s.duration;
    if (s.state === 'PLAYING' || s.state === 'PAUSED') saveCastProgress(); // (H28) időközönként
    if (typeof s.volume === 'number') state.volume = s.volume;
    if (s.state === 'IDLE' && s.idle === 'ERROR') toast(_t('A kivetítő eszköz nem tudta lejátszani ezt az adást.'));
    if (s.state === 'IDLE' && s.idle === 'FINISHED' && player.channel?.vod) {
      // (H28) végignézve: kész jelölés (a pozíció a vége)
      // (ismeretlen hossznál is: a vevő hiteles FINISHED jelzése önmagában elég a kész jelöléshez)
      if (state.castCh?.vod?.key === state.durKey) {
        const end = state.dur > 0 ? state.dur : Math.max(1, state.time);
        player.vodHooks?.progress(state.castCh, end, end);
      }
      const next = player.vodHooks?.next(player.channel, 1);
      if (next && player.vodHooks.autoNext()) player.playVod(next);
    }
    drawOverlay();
    player.renderControls();
  });
}
