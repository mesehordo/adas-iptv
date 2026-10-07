// Lejátszó felület: teljes ablakos videó, vezérlők, csatornaváltás, csatornalista-panel,
// minőség/hangsáv/forrás választás, kép a képben, mini lejátszó, elalvási időzítő.
import { $, esc, html, fmtTime, toast, bus, hashHue } from './util.js';
import { api, IS_WEBOS } from './api.js';
import { store } from './store.js';
import { epg } from './epg.js';
import { catalog, orderedStreams, visible, getChannels, countryName, countryFlag, offlineLabel, geoLimited } from './catalog.js';
import { Engine } from './engine.js';
import { probeMedia, bridgeReason } from './bridge.js';
import { exoAvailable } from './exo.js';
import { toggleStreamInfo, stopStreamInfo, streamInfoOpen } from './streaminfo.js';
import { ICON, logoHtml, openInfo, modalOpen } from './components.js';

const P = {
  pause: '<svg viewBox="0 0 24 24"><path d="M6 4h4v16H6zm8 0h4v16h-4z"/></svg>',
  vol: '<svg viewBox="0 0 24 24"><path d="M3 9v6h4l5 5V4L7 9H3Zm13.5 3A4.5 4.5 0 0 0 14 8v8a4.5 4.5 0 0 0 2.5-4ZM14 3.2v2.1a7 7 0 0 1 0 13.4v2.1a9 9 0 0 0 0-17.6Z"/></svg>',
  mute: '<svg viewBox="0 0 24 24"><path d="M16.5 12A4.5 4.5 0 0 0 14 8v2.2l2.5 2.5V12Zm2.5 0c0 .9-.2 1.8-.5 2.6l1.5 1.5A9 9 0 0 0 14 3.2v2.1a7 7 0 0 1 5 6.7ZM4.3 3 3 4.3 7.7 9H3v6h4l5 5v-6.7l4.3 4.3c-.7.5-1.4.9-2.3 1.1v2.1a9 9 0 0 0 3.7-1.8l2 2 1.3-1.3-9-9L4.3 3ZM12 4 9.9 6.1 12 8.2V4Z"/></svg>',
  up: '<svg viewBox="0 0 24 24"><path d="M7.4 15.4 12 10.8l4.6 4.6L18 14l-6-6-6 6z"/></svg>',
  down: '<svg viewBox="0 0 24 24"><path d="M7.4 8.6 12 13.2l4.6-4.6L18 10l-6 6-6-6z"/></svg>',
  list: '<svg viewBox="0 0 24 24"><path d="M3 5h2v2H3zm4 0h14v2H7zm-4 6h2v2H3zm4 0h14v2H7zm-4 6h2v2H3zm4 0h14v2H7z"/></svg>',
  gear: '<svg viewBox="0 0 24 24"><path d="M19.4 13a7.5 7.5 0 0 0 0-2l2.1-1.6-2-3.5-2.5 1a7.4 7.4 0 0 0-1.7-1L15 3h-4l-.4 2.7a7.4 7.4 0 0 0-1.7 1l-2.5-1-2 3.5L6.6 11a7.5 7.5 0 0 0 0 2l-2.1 1.6 2 3.5 2.5-1c.5.4 1.1.7 1.7 1L11 21h4l.4-2.7c.6-.3 1.2-.6 1.7-1l2.5 1 2-3.5-2.2-1.8ZM13 15.5a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7Z"/></svg>',
  pip: '<svg viewBox="0 0 24 24"><path d="M19 11h-8v6h8v-6Zm4 8V5a2 2 0 0 0-2-2H3a2 2 0 0 0-2 2v14c0 1.1.9 2 2 2h18a2 2 0 0 0 2-2Zm-2 0H3V5h18v14Z"/></svg>',
  mini: '<svg viewBox="0 0 24 24"><path d="M21 3H3a2 2 0 0 0-2 2v14c0 1.1.9 2 2 2h18a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2Zm0 16H3V5h18v14Zm-2-8h-6v6h6v-6Z"/></svg>',
  full: '<svg viewBox="0 0 24 24"><path d="M7 14H5v5h5v-2H7v-3Zm-2-4h2V7h3V5H5v5Zm12 7h-3v2h5v-5h-2v3ZM14 5v2h3v3h2V5h-5Z"/></svg>',
  exitFull: '<svg viewBox="0 0 24 24"><path d="M5 16h3v3h2v-5H5v2Zm3-8H5v2h5V5H8v3Zm6 11h2v-3h3v-2h-5v5Zm2-11V5h-2v5h5V8h-3Z"/></svg>',
  recall: '<svg viewBox="0 0 24 24"><path d="M12 5V1L7 6l5 5V7a6 6 0 1 1-6 6H4a8 8 0 1 0 8-8Z"/></svg>',
  rec: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="7"/></svg>',
  moon: '<svg viewBox="0 0 24 24"><path d="M12.3 2a10 10 0 1 0 9.7 12.6A8 8 0 0 1 12.3 2Z"/></svg>',
  retry: '<svg viewBox="0 0 24 24"><path d="M17.7 6.3A8 8 0 1 0 19.7 14h-2.1a6 6 0 1 1-1.4-6.2L13 11h7V4l-2.3 2.3Z"/></svg>',
};

P.back10 = '<svg viewBox="0 0 24 24"><path d="M12 5V1L7 6l5 5V7a6 6 0 1 1-6 6H4a8 8 0 1 0 8-8Z"/><text x="12" y="16.3" font-size="6.5" text-anchor="middle" font-weight="700" font-family="sans-serif">10</text></svg>';
P.fwd10 = '<svg viewBox="0 0 24 24"><path d="M12 5V1l5 5-5 5V7a6 6 0 1 0 6 6h2a8 8 0 1 1-8-8Z"/><text x="12" y="16.3" font-size="6.5" text-anchor="middle" font-weight="700" font-family="sans-serif">10</text></svg>';
P.cc = '<svg viewBox="0 0 24 24"><path d="M19 4H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2Zm0 14H5V6h14v12ZM7 15h3a1 1 0 0 0 1-1v-1H9.5v.5h-2v-3h2v.5H11v-1a1 1 0 0 0-1-1H7a1 1 0 0 0-1 1v4a1 1 0 0 0 1 1Zm7 0h3a1 1 0 0 0 1-1v-1h-1.5v.5h-2v-3h2v.5H18v-1a1 1 0 0 0-1-1h-3a1 1 0 0 0-1 1v4a1 1 0 0 0 1 1Z"/></svg>';
P.nextEp ='<svg viewBox="0 0 24 24"><path d="M6 18l8.5-6L6 6v12Zm10-12v12h2V6h-2Z"/></svg>';
P.back30 = P.back10.replace('>10<', '>30<');
P.fwd30 = P.fwd10.replace('>10<', '>30<');
P.cast = '<svg viewBox="0 0 24 24"><path d="M21 3H3a2 2 0 0 0-2 2v3h2V5h18v14h-7v2h7a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2ZM1 18v3h3a3 3 0 0 0-3-3Zm0-4v2a5 5 0 0 1 5 5h2a7 7 0 0 0-7-7Zm0-4v2a9 9 0 0 1 9 9h2A11 11 0 0 0 1 10Z"/></svg>';
P.multi = '<svg viewBox="0 0 24 24"><path d="M3 3h8v8H3V3Zm2 2v4h4V5H5Zm8-2h8v8h-8V3Zm2 2v4h4V5h-4ZM3 13h8v8H3v-8Zm2 2v4h4v-4H5Zm8-2h8v8h-8v-8Zm2 2v4h4v-4h-4Z"/></svg>';

/** Idő mm:ss vagy ó:mm:ss alakban. */
function fmtClock(sec) {
  sec = Math.max(0, Math.round(sec || 0));
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return (h ? h + ':' + String(m).padStart(2, '0') : m) + ':' + String(s).padStart(2, '0');
}

const RACE_DELAY = 3000; // ennyi után vált a lejátszó egy biztosan élő tartalék forrásra

const SLEEP_OPTIONS = [
  [0, 'Kikapcsolva'],
  [15, '15 perc'],
  [30, '30 perc'],
  [45, '45 perc'],
  [60, '1 óra'],
  [90, '1,5 óra'],
  [120, '2 óra'],
  [-1, 'A műsor végén'],
];

const root = $('#player');
const video = $('#video');

export const player = {
  channel: null,
  stream: null,
  context: null, // { title, ids }
  active: false,
  mini: false,
  fullscreen: false,
  tried: new Set(),
  sleepAt: 0,
  sleepTimer: null,
  hideTimer: null,
  numBuffer: '',
  numTimer: null,
  engine: null,
  epgTimer: null,

  /** Csatornasor a fel/le váltáshoz. */
  lineup() {
    // Egycsatornás sorból (pl. egyetlen előzmény) indítva a kedvencek / hazai csatornák között lépünk.
    if (this.context?.ids?.length > 1) return getChannels(this.context.ids);
    const fav = getChannels(store.profile.favorites);
    if (fav.length) return fav;
    return visible().filter((c) => c.country === store.settings.homeCountry);
  },

  /** Csatornaszámok: a kedvencek sorrendje, utána a hazai csatornák. */
  numbered() {
    const fav = getChannels(store.profile.favorites);
    const home = visible().filter((c) => c.country === store.settings.homeCountry && !fav.includes(c));
    return [...fav, ...home];
  },

  async play(ch, { context = null, stream = null } = {}) {
    if (!ch) return;
    // gyerekprofil: napi nézési idő, korhatár (watchtime.js)
    if (this.guard && !(await this.guard(ch))) return;
    stopPreview();
    this.hideNextUp();
    if (context) this.context = context;
    else if (!this.active || !this.context?.ids?.includes(ch.id)) this.context = null;
    this.saveVodProgress();
    const prev = this.channel || (store.profile.recent || [])[0] && catalog.byId.get(store.profile.recent[0]);
    if (prev && !prev.vod && !ch.vod && prev.id !== ch.id) this.recallId = prev.id;
    this.channel = ch;
    this.tried = new Set();
    root.classList.toggle('vod', !!ch.vod);
    $('.p-menu', root).hidden = true; // az előző adás menüje (sávok, források) már nem érvényes
    $('.p-ts', root).hidden = true;
    root.classList.remove('behind-live');
    if (!ch.vod) this.subsHooks?.clear(video);
    this.open();
    this.applyChannelVolume(ch);
    if (!ch.vod) store.addRecent(ch.id);
    this.renderTop();
    this.renderEpg();
    this.renderControls();
    this.showOsd(ch);
    bus.emit('player-opened', ch);
    api.setNowPlaying?.(ch.vod ? ch.vod.title || ch.name : ch.name);
    const order = ch.vod ? ch.streams : orderedStreams(ch);
    this.startRace(ch);
    await this.tryStream(stream || order[0]);
  },

  /**
   * Több forrású csatornánál a többi forrást párhuzamosan ellenőrizzük. Ha a most próbált forrás
   * RACE_DELAY alatt sem válaszol, de egy másik igen, azonnal arra váltunk (nem várjuk ki a hibát).
   */
  startRace(ch) {
    const raceId = (this.raceId = (this.raceId || 0) + 1);
    if (ch.vod || !api.probe || ch.streams.length < 2) return;
    for (const s of orderedStreams(ch).slice(0, 4)) {
      const h = store.healthOf(s.url);
      if (h && Date.now() - h.t < 10 * 60e3) continue; // nemrég ellenőrzött
      api
        .probe({ url: s.url, ua: s.ua, referrer: s.referrer })
        .then((res) => {
          if (raceId !== this.raceId) return;
          const ok = res === true; // 'geo': a szerver 403 / 451 válasszal elutasította
          store.setHealth(s.url, ok, 'probe', res === 'geo');
          if (!ok || this.channel !== ch || this.engine.started || this.tried.has(s.url)) return;
          const wait = Math.max(0, RACE_DELAY - (Date.now() - (this.streamAt || 0)));
          setTimeout(() => {
            if (raceId !== this.raceId || this.channel !== ch || this.engine.started || this.engine.headReceived) return;
            if (this.tried.has(s.url)) return;
            this.tryStream(s);
          }, wait);
        })
        .catch(() => {});
    }
  },

  /** Film vagy sorozatepizód lejátszása (tekerhető idősávval, folytatással). */
  playVod(ch, { resumeAt = 0 } = {}) {
    this.resumeAt = resumeAt;
    this.vodSavedAt = 0;
    return this.play(ch, { context: { title: ch.vod.title, ids: [] } });
  },

  /** A film / epizód aktuális pozíciójának mentése (a vod.js menti a profilba). */
  saveVodProgress() {
    const ch = this.channel;
    if (!ch?.vod || !this.engine?.started || !video.duration || !isFinite(video.duration)) return;
    this.vodHooks?.progress(ch, video.currentTime, video.duration);
  },

  async tryStream(stream, { forceHlsJs = false, forceBridge = null, noExo = false } = {}) {
    const ch = this.channel;
    if (!stream) return this.showError();
    this.stream = stream;
    this.streamAt = Date.now();
    this.tried.add(stream.url);
    // Ha van még kipróbálatlan forrás, egy megakadt élő adásnál hamarabb (10 mp) váltunk rá.
    this.engine.stallMs = !ch.vod && store.settings.autoFallback && orderedStreams(ch).some((s) => !this.tried.has(s.url)) ? 10000 : 30000;
    this.setLoading(true, this.tried.size > 1 ? `Másik forrás kipróbálása (${this.tried.size}/${ch.streams.length})…` : 'Csatlakozás…');
    $('.p-error', root).hidden = true;
    const mode = store.settings.playbackEngine;
    const preferNative = !forceHlsJs && (mode === 'native' || (mode === 'auto' && IS_WEBOS));
    // Kivetítés közben az adás a kiválasztott eszközön szól, itt csak a vezérlők maradnak.
    if (this.castHooks?.active) {
      const at = ch.vod ? this.resumeAt || 0 : 0;
      this.engine.stop();
      try {
        await this.castHooks.load(ch, stream, at);
        if (this.channel !== ch) return;
        this.resumeAt = 0;
        if (ch.vod) this.vodHooks?.start(ch);
        this.setLoading(false);
        this.renderControls();
      } catch (err) {
        if (this.channel !== ch) return;
        console.warn('Kivetítési hiba', stream.url, err);
        this.fallback(err);
      }
      return;
    }
    try {
      // Ha van még kipróbálatlan forrás, a hibás adónál nem érdemes újrapróbálkozni – gyorsabb a váltás.
      const quick = (ch.vod ? ch.streams : orderedStreams(ch)).some((s) => !this.tried.has(s.url));
      // Film / rész (asztali változat): az FFmpeg megnézi a fájlt; AC3/DTS hang, beágyazott felirat,
      // régi videóformátum esetén a lejátszási hídon át játsszuk (hanggal, felirattal, tekerhetően).
      // MP4 / WebM: a beépített lejátszó azonnal indul, az elemzés a háttérben fut (ha AC3 hang vagy
      // beágyazott felirat van benne, átváltunk a hídra ugyanonnan). Más tárolónál (MKV, AVI…) előbb elemzünk.
      let bridge = forceBridge || null;
      const container = stream.url.split(/[?#]/)[0];
      // Android / Android TV: filmekhez a natív lejátszó (ExoPlayer) – AC3 / DTS hang, beágyazott felirat,
      // MKV; hiba esetén ugyanez a fájl a WebView saját lejátszójával.
      const exo = !!(ch.vod && !noExo && !bridge && exoAvailable() && store.settings.mediaBridge !== false && !/\.(m3u8|mpd)$/i.test(container));
      const canBridge = !exo && ch.vod && api.mediaProbe && !this.castHooks?.active && store.settings.mediaBridge !== false && !/\.(m3u8|mpd)$/i.test(container);
      const probeFirst = canBridge && !bridge && !/\.(mp4|m4v|webm|mp3|m4a|aac|ogg|opus|flac|wav)$/i.test(container);
      if (probeFirst) {
        this.setLoading(true, 'A fájl sávjainak felismerése…');
        await api.setStreamHeaders(stream.url, { ua: stream.ua, referrer: stream.referrer });
        const info = await Promise.race([probeMedia(stream.url), new Promise((r) => setTimeout(() => r(null), 10000))]);
        if (this.channel !== ch) return;
        const why = bridgeReason(info, stream.url);
        if (why) {
          bridge = info;
          console.info('Lejátszási híd:', why, stream.url);
        } else if (!info || info.error) {
          // Ne csendben essünk vissza: így derül ki, ha a híd valamiért nem éri el a fájlt
          console.warn('Lejátszási híd – a fájl nem elemezhető:', info?.error || 'időtúllépés', stream.url);
          toast(`A lejátszási híd nem tudta megnyitni a fájlt (${info?.error || 'időtúllépés'}) – a beépített lejátszóval próbálom.`, { timeout: 7000 });
        }
        this.setLoading(true, 'Csatlakozás…');
      }
      if (exo) await api.setStreamHeaders(stream.url, { ua: stream.ua, referrer: stream.referrer });
      this.bridged = !!bridge || exo;
      await this.engine.load(stream, { preferNative, timeshift: !ch.vod, quick, bridge, exo, startAt: bridge || exo ? this.resumeAt || 0 : 0 });
      if (this.channel !== ch) return;
      if (ch.vod) {
        if (this.resumeAt > 0) {
          try {
            if (!bridge && !exo) video.currentTime = this.resumeAt; // a híd / a natív lejátszó eleve onnan indult
            toast(`Folytatás ${fmtClock(this.resumeAt)}-tól`);
          } catch {}
        }
        this.resumeAt = 0;
        this.vodHooks?.start(ch);
        this.subsHooks?.onStart(ch, video).then(() => this.renderControls());
        this.checkDecodable(ch);
        // Háttérelemzés a natívan indult fájlnál: kell-e mégis a híd (AC3 hang, beágyazott felirat)?
        if (canBridge && !bridge) {
          probeMedia(stream.url).then((info) => {
            const why = bridgeReason(info, stream.url);
            if (!why || this.channel !== ch || this.stream !== stream || this.engine.type === 'bridge') return;
            console.info('Lejátszási híd (utólag):', why, stream.url);
            this.resumeAt = video.currentTime || 0;
            toast(why.startsWith('hang') ? 'A hangsáv átalakítása…' : 'A beágyazott felirat betöltése…', { timeout: 2500 });
            this.tryStream(stream, { forceBridge: info });
          });
        }
      }
      store.setHealth(stream.url, true);
      this.setLoading(false);
      this.renderControls();
      this.audioHooks?.onStart?.(video);
      bus.emit('health');
    } catch (err) {
      if (this.channel !== ch || err.message === 'megszakítva') return;
      console.warn('Lejátszási hiba', stream.url, err);
      // A natív lejátszó (Android) után ugyanez a fájl a WebView lejátszójával.
      if (this.engine.type === 'exo' && !noExo) {
        toast('A natív lejátszó nem indult (' + (err.message || err).replace(/^Natív lejátszó: /, '') + ') – a beépített lejátszóval próbálom.', { timeout: 6000 });
        return this.tryStream(stream, { noExo: true });
      }
      // A beépített lejátszó után ugyanezt a forrást a hls.js-sel is megpróbáljuk.
      if (preferNative && this.engine.type === 'native' && window.Hls?.isSupported()) {
        return this.tryStream(stream, { forceHlsJs: true });
      }
      store.setHealth(stream.url, false, 'play', err.httpStatus === 403 || err.httpStatus === 451);
      this.fallback(err);
    }
  },

  /**
   * Film / rész indulása után: ha néhány másodperc lejátszás után sincs dekódolt hang (pl. AC3 / DTS
   * az MKV-ben) vagy kép (pl. régi XviD), felajánljuk a külső lejátszót. A beágyazott MKV-felirat sem
   * jelenik meg itt – ezt is jelezzük.
   */
  checkDecodable(ch) {
    clearTimeout(this.decodeTimer);
    if (!api.openInPlayer || !this.vodHooks?.external || this.bridged) return;
    let startAt = null;
    let tries = 0;
    const check = () => {
      if (this.channel !== ch || !this.active) return;
      // Megvárjuk, hogy legalább 3 másodpercnyi valódi lejátszás legyen (a pufferelés nem számít).
      if (startAt === null && !video.paused && video.currentTime > 0) startAt = video.currentTime;
      if (startAt === null || video.paused || video.currentTime - startAt < 3) {
        if (++tries < 30) this.decodeTimer = setTimeout(check, 1500);
        return;
      }
      // (MP4 / WebM / HLS esetén a néma kép inkább néma film – ott nem szólunk)
      const container = (this.stream?.url || '').split(/[?#]/)[0];
      const noAudio =
        !/\.(mp4|m4v|webm|m3u8|mpd)$/i.test(container) && typeof video.webkitAudioDecodedByteCount === 'number' && video.webkitAudioDecodedByteCount === 0;
      const noVideo = video.videoWidth === 0 || video.webkitVideoDecodedByteCount === 0;
      if (!noAudio && !noVideo) return;
      const mkv = /\.mkv$/i.test(container);
      const what = noVideo ? 'A videó képe' : 'A videó hangja (pl. AC3 / DTS)';
      toast(`${what} itt nem játszható le${mkv ? ', és az MKV-be ágyazott felirat sem jelenik meg' : ''}. Külső lejátszóban (VLC, mpv…) mindkettő működik.`, {
        action: 'Külső lejátszó',
        onAction: () => this.vodHooks.external(ch),
        timeout: 15000,
      });
    };
    this.decodeTimer = setTimeout(check, 1500);
  },

  fallback(err) {
    const ch = this.channel;
    const next = (ch.vod ? ch.streams : orderedStreams(ch)).find((s) => !this.tried.has(s.url));
    if (next && store.settings.autoFallback) return this.tryStream(next);
    this.showError(err);
  },

  showError(err) {
    this.setLoading(false);
    this.engine.stop();
    const ch = this.channel;
    const box = $('.p-error', root);
    const geo = geoLimited(ch) || err?.httpStatus === 403 || err?.httpStatus === 451;
    const hasNext = ch.vod && this.vodHooks?.next(ch, 1);
    box.innerHTML = ch.vod
      ? `<h2>Ez a videó most nem érhető el</h2>
      <p>A tárhely nem válaszol, vagy a fájlt eltávolították. Ingyenes listáknál ez előfordul.</p>
      ${err ? `<p class="muted small">${esc(err.message || err)}</p>` : ''}
      <div class="dialog-btns"><button class="btn primary" data-e="retry">${P.retry} Újra</button>
      ${hasNext ? `<button class="btn" data-e="next">${P.down} Következő rész</button>` : ''}
      ${api.openInPlayer && this.vodHooks?.external ? '<button class="btn" data-e="external">Külső lejátszóban</button>' : ''}
      <button class="btn" data-e="back">Vissza</button></div>`
      : `<h2>Ez az adás most nem érhető el</h2>
      <p>${
        geo
          ? '🌐 <b>Földrajzi korlátozás:</b> az adó csak bizonyos országokból nézhető, innen elutasította a kérést. (Más országban, vagy egy ottani VPN-nel működhet.)'
          : 'Az adó nem válaszol, vagy megszűnt az adás. Ez az ingyenes listákon gyakori.'
      }</p>
      ${err ? `<p class="muted small">${esc(err.message || err)}</p>` : ''}
      <div class="dialog-btns"><button class="btn primary" data-e="retry">${P.retry} Újra</button>
      <button class="btn" data-e="next">${P.down} Következő csatorna</button>
      <button class="btn" data-e="back">Vissza</button></div>`;
    box.hidden = false;
    box.querySelector('[data-e="retry"]').focus();
    box.onclick = (e) => {
      const a = e.target.closest('[data-e]')?.dataset.e;
      if (a === 'retry') {
        this.tried = new Set();
        this.tryStream((ch.vod ? ch.streams : orderedStreams(ch))[0]);
      } else if (a === 'next') this.step(1);
      else if (a === 'external') this.vodHooks.external(ch);
      else if (a === 'back') this.close();
    };
  },

  setLoading(on, msg = '') {
    const s = $('.p-spinner', root);
    s.hidden = !on;
    $('.p-status', root).textContent = msg;
  },

  open() {
    if (this.active) return;
    // Bezáráskor ide tér vissza a fókusz (távirányítóval ne a lap elejéről kelljen újra navigálni).
    const ae = document.activeElement;
    this.returnFocus = ae && ae !== document.body && !root.contains(ae) ? { el: ae, id: ae.closest?.('[data-id]')?.dataset.id || '', vid: ae.closest?.('[data-vid]')?.dataset.vid || '' } : null;
    this.active = true;
    root.hidden = false;
    document.body.classList.add('playing');
    video.volume = store.settings.volume;
    api.setPlaying(true);
    this.poke();
    clearInterval(this.epgTimer);
    this.epgTimer = setInterval(() => this.renderEpg(), 20000);
    // Szünet alatt is frissüljön, mennyivel vagyunk az élő adás mögött.
    clearInterval(this.tsTimer);
    this.tsTimer = setInterval(() => this.channel && !this.channel.vod && video.paused && this.updateTimeshift(), 1000);
  },

  close() {
    if (!this.active) return;
    stopStreamInfo(video);
    if (this.mini) this.setMini(false);
    if (this.fullscreen) api.setFullscreen(false);
    if (document.pictureInPictureElement) document.exitPictureInPicture().catch(() => {});
    this.saveVodProgress();
    this.hideNextUp();
    clearTimeout(this.numTimer); // a félig beírt csatornaszám ne nyissa újra a lejátszót
    this.numBuffer = '';
    this.engine.stop();
    this.castHooks?.onClose?.();
    this.active = false;
    root.classList.remove('vod');
    $('.p-ts', root).hidden = true;
    this.channel = null;
    root.hidden = true;
    $('.p-side', root).hidden = true;
    $('.p-menu', root).hidden = true;
    document.body.classList.remove('playing');
    api.setPlaying(false);
    clearInterval(this.epgTimer);
    clearInterval(this.tsTimer);
    bus.emit('player-closed');
    const rf = this.returnFocus;
    this.returnFocus = null;
    if (rf) {
      // A nézet közben újrarajzolódhatott: akkor ugyanazt a kártyát keressük meg.
      setTimeout(() => {
        if (this.active || modalOpen()) return;
        const el = (rf.el.isConnected && rf.el) ||
          (rf.id && document.querySelector(`#view .card[data-id="${CSS.escape(rf.id)}"]`)) ||
          (rf.vid && document.querySelector(`#view .vcard[data-vid="${CSS.escape(rf.vid)}"]`));
        if (el) {
          el.focus({ preventScroll: true });
          el.scrollIntoView({ block: 'nearest', inline: 'nearest' });
        }
      }, 80);
    }
  },

  step(dir) {
    if (this.channel?.vod) {
      const n = this.vodHooks?.next(this.channel, dir);
      if (n) this.playVod(n);
      else toast(dir > 0 ? 'Ez az utolsó rész.' : 'Ez az első rész.');
      return;
    }
    const list = this.lineup();
    if (!list.length) return;
    let i = list.findIndex((c) => c.id === this.channel?.id);
    i = (i + dir + list.length) % list.length;
    this.play(list[i], { context: this.context });
  },

  // --- felület -------------------------------------------------------------
  renderTop() {
    const ch = this.channel;
    if (ch.vod) {
      $('.p-title', root).innerHTML = `<div><div class="p-name">${esc(ch.vod.title)}</div>
        <div class="muted small">${esc(ch.vod.subtitle || '')}</div></div>`;
      return;
    }
    const num = this.numbered().indexOf(ch) + 1;
    $('.p-title', root).innerHTML = `<div class="p-logo" style="--h:${hashHue(ch.name)}" data-id="${esc(ch.id)}">${logoHtml(ch, 'logo-sm')}</div>
      <div><div class="p-name">${num ? `<span class="p-num">${num}</span>` : ''}${esc(ch.name)}</div>
      <div class="muted small">${countryFlag(ch.country)} ${esc(countryName(ch.country))}${this.context?.title && this.context.title !== countryName(ch.country) ? ' · ' + esc(this.context.title) : ''}</div></div>`;
  },

  renderEpg() {
    const ch = this.channel;
    if (!ch) return;
    if (ch.vod) {
      // Film módban az EPG helyén a tekerhető idősáv áll.
      const box = $('.p-epg', root);
      if (!box.querySelector('.p-seek')) {
        box.innerHTML = `<div class="p-seek"><span class="t-cur">0:00</span>
          <input type="range" class="seek" min="0" max="1" step="1" value="0" data-c="seek" aria-label="Pozíció" />
          <span class="t-dur">–:–</span></div>`;
      }
      this.updateSeek();
      return;
    }
    const n = epg.now(ch.id);
    const box = $('.p-epg', root);
    if (!n) {
      box.innerHTML = '';
      return;
    }
    box.innerHTML = `${
      n.cur
        ? `<div class="p-now"><span class="now-label">MOST</span> <b>${esc(n.cur.title)}</b>
          <span class="muted">${fmtTime(n.cur.start)}–${fmtTime(n.cur.stop)}</span></div>
          <div class="bar wide"><i style="width:${(n.progress * 100).toFixed(1)}%"></i></div>`
        : ''
    }${n.next ? `<div class="p-next muted">Utána: ${fmtTime(n.next.start)} ${esc(n.next.title)}</div>` : ''}`;
  },

  updateSeek() {
    const box = $('.p-seek', root);
    if (!box) return;
    const dur = isFinite(video.duration) ? video.duration : 0;
    const seek = box.querySelector('.seek');
    if (!this.seeking) {
      seek.max = Math.max(1, Math.floor(dur));
      seek.value = Math.floor(video.currentTime || 0);
    }
    seek.style.setProperty('--pct', dur ? ((seek.value / dur) * 100).toFixed(2) + '%' : '0%');
    box.querySelector('.t-cur').textContent = fmtClock(this.seeking ? Number(seek.value) : video.currentTime);
    box.querySelector('.t-dur').textContent = dur ? '-' + fmtClock(Math.max(0, dur - (this.seeking ? Number(seek.value) : video.currentTime))) : '–:–';
  },

  seekBy(sec) {
    if (this.castHooks?.active) return this.castHooks.seekBy(sec);
    if (!isFinite(video.duration)) return;
    video.currentTime = Math.max(0, Math.min(video.duration - 1, video.currentTime + sec));
    this.updateSeek();
    this.showOsd(this.channel, `${sec > 0 ? '+' : ''}${sec} mp`);
  },

  // --- Élő adás időcsúsztatása (szünet, visszatekerés a pufferből) ------------------
  updateTimeshift() {
    const box = $('.p-ts', root);
    const ch = this.channel;
    const t = ch && !ch.vod && !this.castHooks?.active ? this.engine.timeshiftInfo() : null;
    if (!t) {
      box.hidden = true;
      root.classList.remove('behind-live');
      return;
    }
    if (!box.firstChild) {
      box.innerHTML = `<button class="ts-live" data-c="ts-live"></button>
        <input type="range" class="seek ts-seek" data-c="ts-seek" min="0" max="1" step="1" value="0" aria-label="Időcsúsztatás" />
        <span class="ts-behind"></span>`;
    }
    box.hidden = false;
    const live = t.behind < 12;
    const btn = box.querySelector('.ts-live');
    btn.classList.toggle('on', live);
    btn.textContent = live ? '● ÉLŐ' : 'Ugrás élőbe ▸▸';
    btn.title = live ? 'Élő adás' : 'Vissza az élő adáshoz';
    const seek = box.querySelector('.ts-seek');
    const span = Math.max(1, Math.floor(t.edge - t.start));
    if (!this.tsSeeking) {
      seek.max = span;
      seek.value = Math.floor(t.pos - t.start);
    }
    seek.style.setProperty('--pct', ((Number(seek.value) / span) * 100).toFixed(2) + '%');
    box.querySelector('.ts-behind').textContent = live ? `${fmtClock(span)} visszatekerhető` : `−${fmtClock(this.tsSeeking ? span - Number(seek.value) : t.behind)}`;
    root.classList.toggle('behind-live', !live);
  },

  tsBy(sec) {
    const t = this.engine.timeshiftInfo();
    if (!t) return toast('Ennél az adásnál még nem lehet visszatekerni – a lejátszó most gyűjti a puffert.');
    video.currentTime = Math.max(t.start + 0.5, Math.min(t.edge - 2, t.pos + sec));
    this.updateTimeshift();
    this.showOsd(this.channel, `${sec > 0 ? '+' : '−'}${Math.abs(sec)} mp`);
  },

  togglePause() {
    if (this.castHooks?.active) return this.castHooks.toggle();
    video.paused ? video.play() : video.pause();
  },

  // --- „Következő rész” ajánló a rész végén ------------------------------------
  showNextUp(next) {
    this.hideNextUp();
    const box = html(`<div class="p-nextup"><div class="nu-label">Következő rész</div>
      <div class="nu-title">${esc(next.vod.subtitle)}</div>
      <div class="dialog-btns"><button class="btn primary" data-nu="go">${ICON.play} Lejátszás <span class="nu-count">8</span></button>
      <button class="btn" data-nu="cancel">Mégse</button></div></div>`);
    root.append(box);
    box.querySelector('[data-nu="go"]').focus();
    let n = 8;
    this.nextUpTimer = setInterval(() => {
      n--;
      const c = box.querySelector('.nu-count');
      if (c) c.textContent = n;
      if (n <= 0) {
        this.hideNextUp();
        this.playVod(next);
      }
    }, 1000);
    box.onclick = (e) => {
      const a = e.target.closest('[data-nu]')?.dataset.nu;
      if (a === 'go') {
        this.hideNextUp();
        this.playVod(next);
      } else if (a === 'cancel') this.hideNextUp();
    };
  },

  hideNextUp() {
    clearInterval(this.nextUpTimer);
    root.querySelector('.p-nextup')?.remove();
  },

  renderControls() {
    const ch = this.channel;
    if (!ch) return;
    const fav = store.isFavorite(ch.id);
    const ccOn = !!this.engine?.textTrack || [...video.textTracks].some((t) => t.mode === 'showing');
    const sleepLeft = this.sleepAt ? Math.max(0, Math.round((this.sleepAt - Date.now()) / 60000)) : 0;
    const casting = !!this.castHooks?.active;
    const paused = casting ? this.castHooks.paused : video.paused && this.engine?.started;
    const castBtn = this.castHooks?.available
      ? `<button class="icon-btn ${casting ? 'on' : ''}" data-c="cast" title="${casting ? 'Kivetítve: ' + esc(this.castHooks.deviceName) : 'Kivetítés tévére (Chromecast, DLNA)'}">${P.cast}</button>`
      : '';
    if (ch.vod) {
      const hasNext = !!this.vodHooks?.next(ch, 1);
      $('.p-controls', root).innerHTML = `
      <button class="icon-btn" data-c="toggle" title="Szünet / lejátszás (Szóköz)">${paused ? ICON.play : P.pause}</button>
      <button class="icon-btn" data-c="back10" title="10 mp vissza (←)">${P.back10}</button>
      <button class="icon-btn" data-c="fwd10" title="10 mp előre (→)">${P.fwd10}</button>
      ${hasNext ? `<button class="icon-btn" data-c="next" title="Következő rész (PageDown)">${P.nextEp}</button>` : ''}
      <div class="vol">
        <button class="icon-btn" data-c="mute" title="Némítás (M)">${video.muted || video.volume === 0 ? P.mute : P.vol}</button>
        <input type="range" min="0" max="1" step="0.02" value="${video.muted ? 0 : video.volume}" data-c="volume" aria-label="Hangerő" />
      </div>
      <span class="grow"></span>
      <button class="icon-btn" data-c="info" title="Adatlap (I)">${ICON.info}</button>
      ${castBtn}
      <button class="icon-btn cc-btn ${ccOn ? 'on' : ''}" data-c="subs" title="Hang és felirat (C)">${P.cc}</button>
      <button class="icon-btn ${this.sleepAt ? 'on' : ''}" data-c="sleep" title="Elalvási időzítő">${P.moon}${this.sleepAt ? `<span class="badge">${sleepLeft}′</span>` : ''}</button>
      <button class="icon-btn" data-c="settings" title="Minőség és forrás">${P.gear}</button>
      ${api.caps.pip && (api.enterPip || document.pictureInPictureEnabled) ? `<button class="icon-btn" data-c="pip" title="Kép a képben (P)">${P.pip}</button>` : ''}
      ${api.caps.mini ? `<button class="icon-btn" data-c="mini" title="Mini lejátszó (N)">${P.mini}</button>` : ''}
      ${api.caps.fullscreen ? `<button class="icon-btn" data-c="full" title="Teljes képernyő (F)">${this.fullscreen ? P.exitFull : P.full}</button>` : ''}`;
      return;
    }
    $('.p-controls', root).innerHTML = `
      <button class="icon-btn" data-c="toggle" title="Szünet / lejátszás (Szóköz)">${paused ? ICON.play : P.pause}</button>
      <button class="icon-btn" data-c="prev" title="Előző csatorna (↑)">${P.up}</button>
      <button class="icon-btn" data-c="next" title="Következő csatorna (↓)">${P.down}</button>
      ${this.recallId ? `<button class="icon-btn" data-c="recall" title="Vissza az előző csatornára (R)">${P.recall}</button>` : ''}
      ${this.recHooks && !casting ? `<button class="icon-btn rec-btn ${this.recHooks.isRec(ch.id) ? 'on' : ''}" data-c="rec" title="${this.recHooks.isRec(ch.id) ? 'Felvétel leállítása' : 'Felvétel indítása (az adás mentése)'}">${P.rec}</button>` : ''}
      ${casting ? '' : `<button class="icon-btn" data-c="ts-back" title="30 mp vissza (Shift+←)">${P.back30}</button>
      <button class="icon-btn" data-c="ts-fwd" title="30 mp előre (Shift+→)">${P.fwd30}</button>`}
      <div class="vol">
        <button class="icon-btn" data-c="mute" title="Némítás (M)">${video.muted || video.volume === 0 ? P.mute : P.vol}</button>
        <input type="range" min="0" max="1" step="0.02" value="${video.muted ? 0 : video.volume}" data-c="volume" aria-label="Hangerő" />
      </div>
      <span class="grow"></span>
      <button class="icon-btn ${fav ? 'on' : ''}" data-c="fav" title="Kedvenc (S)">${fav ? ICON.check : ICON.plus}</button>
      <button class="icon-btn" data-c="info" title="Csatorna adatai (I)">${ICON.info}</button>
      <button class="icon-btn cc-btn ${ccOn ? 'on' : ''}" data-c="subs" title="Hang és felirat (C)">${P.cc}</button>
      <button class="icon-btn ${this.sleepAt ? 'on' : ''}" data-c="sleep" title="Elalvási időzítő">${P.moon}${this.sleepAt ? `<span class="badge">${sleepLeft}′</span>` : ''}</button>
      <button class="icon-btn" data-c="settings" title="Minőség és forrás">${P.gear}</button>
      <button class="icon-btn" data-c="list" title="Csatornalista (L)">${P.list}</button>
      ${api.caps.multiview && !casting ? `<button class="icon-btn" data-c="multi" title="Több adás egyszerre (V)">${P.multi}</button>` : ''}
      ${castBtn}
      ${api.caps.pip && (api.enterPip || document.pictureInPictureEnabled) ? `<button class="icon-btn" data-c="pip" title="Kép a képben (P)">${P.pip}</button>` : ''}
      ${api.caps.mini ? `<button class="icon-btn" data-c="mini" title="Mini lejátszó (N)">${P.mini}</button>` : ''}
      ${api.caps.fullscreen ? `<button class="icon-btn" data-c="full" title="Teljes képernyő (F)">${this.fullscreen ? P.exitFull : P.full}</button>` : ''}`;
  },

  showOsd(ch, text) {
    const osd = $('.p-osd', root);
    const num = ch.vod ? 0 : this.numbered().indexOf(ch) + 1;
    osd.innerHTML = text ? `<div class="osd-num">${esc(text)}</div>` : `${num ? `<div class="osd-num">${num}</div>` : ''}<div class="osd-name">${esc(ch.name)}</div>`;
    osd.hidden = false;
    clearTimeout(this.osdTimer);
    this.osdTimer = setTimeout(() => (osd.hidden = true), 2500);
  },

  poke() {
    root.classList.add('ui');
    document.body.style.cursor = '';
    clearTimeout(this.hideTimer);
    this.hideTimer = setTimeout(() => {
      if (!$('.p-side', root).hidden || !$('.p-menu', root).hidden) return;
      if (root.contains(document.activeElement) && document.activeElement.matches('input[type=range]:active')) return;
      root.classList.remove('ui');
    }, 3500);
  },

  // --- csatornalista panel --------------------------------------------------
  toggleSide(force) {
    const side = $('.p-side', root);
    const show = force ?? side.hidden;
    $('.p-menu', root).hidden = true;
    side.hidden = !show;
    if (!show) return;
    const list = this.lineup();
    const title = this.context?.title || (store.profile.favorites.length ? 'Kedvencek' : `${countryName(store.settings.homeCountry)} csatornái`);
    side.innerHTML = `<div class="side-head"><h3>${esc(title)}</h3><input class="input" placeholder="Szűrés…" /></div><ul class="side-list"></ul>`;
    const ul = side.querySelector('ul');
    const fill = (q = '') => {
      const k = q.toLowerCase();
      ul.innerHTML = list
        .filter((c) => !k || c.name.toLowerCase().includes(k))
        .slice(0, 400)
        .map((c, i) => {
          const n = epg.now(c.id);
          return `<li tabindex="0" data-id="${esc(c.id)}" class="${c.id === this.channel?.id ? 'current' : ''}">
            <span class="side-num">${i + 1}</span><span class="side-logo" style="--h:${hashHue(c.name)}">${logoHtml(c, 'logo-sm')}</span>
            <span class="side-text"><b>${esc(c.name)}</b>${offlineLabel(c) ? `<small class="off-text">${offlineLabel(c)}</small>` : n?.cur ? `<small>${esc(n.cur.title)}</small>` : ''}</span></li>`;
        })
        .join('');
    };
    fill();
    const input = side.querySelector('input');
    input.oninput = () => fill(input.value);
    ul.onclick = (e) => {
      const li = e.target.closest('li');
      if (li) this.play(catalog.byId.get(li.dataset.id), { context: this.context });
    };
    ul.onkeydown = (e) => {
      const li = e.target.closest('li');
      if (!li) return;
      if (e.key === 'Enter') this.play(catalog.byId.get(li.dataset.id), { context: this.context });
      if (e.key === 'ArrowDown') (li.nextElementSibling || li).focus();
      if (e.key === 'ArrowUp') (li.previousElementSibling || input).focus();
      if (e.key.startsWith('Arrow') || e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    (ul.querySelector('.current') || ul.firstElementChild)?.focus();
    ul.querySelector('.current')?.scrollIntoView({ block: 'center' });
  },

  // --- menük (minőség / hangsáv / forrás / időzítő) ------------------------------
  openMenu(kind) {
    const menu = $('.p-menu', root);
    $('.p-side', root).hidden = true;
    if (!menu.hidden && menu.dataset.kind === kind) {
      menu.hidden = true;
      return;
    }
    menu.dataset.kind = kind;
    const e = this.engine;
    let body = '';
    if (kind === 'settings') {
      const levels = e.levels();
      const streams = orderedStreams(this.channel);
      body = `${
        levels.length > 1
          ? `<h4>Minőség</h4>${[{ index: -1, label: 'Automatikus' }, ...levels.slice().reverse()]
              .map((l) => `<button class="menu-item ${e.level === l.index ? 'sel' : ''}" data-level="${l.index}">${esc(l.label)}</button>`)
              .join('')}`
          : '<h4>Minőség</h4><p class="muted small">Ez az adás egyetlen minőségben érhető el.</p>'
      }<h4>Forrás</h4>${streams
        .map((s, i) => {
          const h = store.healthOf(s.url);
          return `<button class="menu-item ${s.url === this.stream?.url ? 'sel' : ''}" data-src="${i}">
            <span class="st st-${h ? (h.ok ? 'ok' : 'bad') : 'unknown'}"></span>
            ${esc(s.feedName && s.feedName !== 'SD' ? s.feedName : `Forrás ${i + 1}`)}${s.quality ? ' · ' + esc(s.quality) : ''}</button>`;
        })
        .join('')}<h4>Részletek</h4><button class="menu-item ${streamInfoOpen() ? 'sel' : ''}" data-stats>📊 Adás adatai (D)</button>`;
      menu.innerHTML = body;
      menu.onclick = (ev) => {
        const b = ev.target.closest('button');
        if (!b) return;
        if ('stats' in b.dataset) toggleStreamInfo(this, root, video);
        if (b.dataset.level !== undefined) e.setLevel(Number(b.dataset.level));
        if (b.dataset.src !== undefined) {
          this.tried = new Set();
          this.tryStream(streams[Number(b.dataset.src)]);
        }
        menu.hidden = true;
      };
    } else if (kind === 'sleep') {
      menu.innerHTML = `<h4>Elalvási időzítő</h4>${SLEEP_OPTIONS.map(
        ([m, l]) => `<button class="menu-item" data-sleep="${m}">${esc(l)}</button>`
      ).join('')}`;
      menu.onclick = (ev) => {
        const b = ev.target.closest('[data-sleep]');
        if (!b) return;
        this.setSleep(Number(b.dataset.sleep));
        menu.hidden = true;
      };
    } else if (kind === 'subs') {
      this.subsHooks?.render(menu, this.channel, video);
    }
    menu.hidden = false;
    menu.querySelector('.sel, button')?.focus();
  },

  setSleep(minutes) {
    clearInterval(this.sleepTimer);
    this.sleepAt = 0;
    if (minutes === -1 && this.channel?.vod && isFinite(video.duration)) {
      this.sleepAt = Date.now() + Math.max(0, video.duration - video.currentTime) * 1000;
    } else if (minutes === -1) {
      const n = this.channel && epg.now(this.channel.id);
      if (!n?.cur) {
        toast('Ehhez a csatornához nincs műsoradat – válassz időtartamot.');
        return this.renderControls();
      }
      this.sleepAt = n.cur.stop;
    } else if (minutes > 0) this.sleepAt = Date.now() + minutes * 60000;
    if (this.sleepAt) {
      toast(`A lejátszás leáll ekkor: ${fmtTime(this.sleepAt)}`);
      this.sleepTimer = setInterval(() => this.sleepTick(), 1000);
    } else toast('Elalvási időzítő kikapcsolva');
    this.renderControls();
  },

  sleepTick() {
    const left = this.sleepAt - Date.now();
    if (left <= 0) {
      clearInterval(this.sleepTimer);
      this.sleepAt = 0;
      video.volume = store.settings.volume;
      this.close();
      toast('Az elalvási időzítő leállította a lejátszást. Jó éjszakát!', { timeout: 8000 });
      return;
    }
    // Az utolsó 15 másodpercben lágyan elhalkul.
    if (left < 15000) video.volume = store.settings.volume * (left / 15000);
    if (Math.round(left / 1000) % 60 === 0) this.renderControls();
  },

  async setMini(on) {
    this.mini = on;
    document.body.classList.toggle('mini', on);
    await api.setMini(on);
    this.poke();
  },

  async togglePip() {
    // Android: az egész alkalmazás lebegő kis ablakba kerül (minden más alkalmazás fölött)
    if (api.enterPip) {
      if (!api.enterPip()) toast('A kép a képben mód ezen az eszközön nem érhető el.');
      return;
    }
    try {
      if (document.pictureInPictureElement) await document.exitPictureInPicture();
      else await video.requestPictureInPicture();
    } catch (err) {
      toast('A kép a képben mód most nem érhető el.');
    }
  },

  setVolume(v) {
    v = Math.max(0, Math.min(1, v));
    video.volume = v;
    video.muted = v === 0;
    store.set('volume', v);
    this.rememberVolume(v);
    this.renderControls();
    this.showOsd(this.channel, `Hangerő ${Math.round(v * 100)}%`);
  },

  /** Csatornánkénti hangerő (Beállítások → Lejátszás): a halk / hangos adók szintje megmarad. */
  rememberVolume(v) {
    const ch = this.channel;
    if (!ch || ch.vod || !store.settings.perChannelVolume) return;
    store.settings.chVolume ||= {};
    store.settings.chVolume[ch.id] = Math.round(v * 100) / 100;
    store.save();
  },
  applyChannelVolume(ch) {
    const v = !ch.vod && store.settings.perChannelVolume ? store.settings.chVolume?.[ch.id] : undefined;
    video.volume = v ?? store.settings.volume;
  },

  /** Vissza az előzőleg nézett csatornára (R gomb, távirányító). */
  recall() {
    const ch = this.recallId && catalog.byId.get(this.recallId);
    if (ch) this.play(ch);
    else toast('Még nincs előző csatorna.');
  },

  // --- számbillentyűk ------------------------------------------------------------
  digit(d) {
    this.numBuffer = (this.numBuffer + d).slice(-4);
    const osd = $('.p-osd', root);
    osd.innerHTML = `<div class="osd-num">${esc(this.numBuffer)}_</div>`;
    osd.hidden = false;
    clearTimeout(this.numTimer);
    this.numTimer = setTimeout(() => {
      const n = Number(this.numBuffer);
      this.numBuffer = '';
      const ch = this.numbered()[n - 1];
      if (ch) this.play(ch);
      else {
        osd.innerHTML = `<div class="osd-name">Nincs ${n}. csatorna</div>`;
        setTimeout(() => (osd.hidden = true), 1500);
      }
    }, 1300);
  },

  handleKey(e) {
    if (!this.active) return false;
    if (modalOpen()) return false;
    const inInput = e.target.matches('input:not([type=range]), textarea, select');
    if (inInput && e.key !== 'Escape') return false;
    const sideOpen = !$('.p-side', root).hidden;
    const menuOpen = !$('.p-menu', root).hidden;
    this.poke();
    const k = e.key;
    if (k === 'Escape' || k === 'Backspace' || k === 'BrowserBack') {
      if (sideOpen || menuOpen) {
        $('.p-side', root).hidden = true;
        $('.p-menu', root).hidden = true;
        video.focus?.();
      } else if (this.mini) this.setMini(false);
      else if (this.fullscreen) api.setFullscreen(false);
      else this.close();
      return true;
    }
    if (sideOpen || menuOpen) return false; // a panelek maguk kezelik a nyilakat
    const onButton = e.target.closest?.('#player button');
    if (root.querySelector('.p-nextup') && (k === 'Enter' || k === ' ')) return false;
    // Film módban: ←/→ tekerés, ↑/↓ hangerő, PageUp/PageDown előző/következő rész
    if (this.channel?.vod) {
      const onSeek = e.target.matches?.('.seek');
      switch (k) {
        case 'ArrowLeft':
          if (onButton) return false;
          this.seekBy(e.shiftKey ? -60 : -10);
          return true;
        case 'ArrowRight':
          if (onButton) return false;
          this.seekBy(e.shiftKey ? 60 : 10);
          return true;
        case 'ArrowUp':
          if (onButton || onSeek) return false;
          this.setVolume(video.volume + 0.05);
          return true;
        case 'ArrowDown':
          if (onButton || onSeek) return false;
          this.setVolume(video.volume - 0.05);
          return true;
        case 'MediaFastForward':
          this.seekBy(30);
          return true;
        case 'MediaRewind':
          this.seekBy(-30);
          return true;
        case 'Enter':
          if (onButton) return false;
          this.togglePause();
          return true;
        case 'i':
        case 'I':
        case 'ColorF1Green':
          this.vodHooks?.info(this.channel);
          return true;
        case 'c':
        case 'C':
        case 'Subtitle':
          this.openMenu('subs');
          return true;
        case 'l':
        case 'L':
        case 'ColorF3Blue':
        case 'ColorF0Red':
        case 's':
        case 'S':
          return true;
      }
      if (/^[0-9]$/.test(k)) {
        // 0–9: ugrás a videó 0–90%-ára
        if (isFinite(video.duration)) video.currentTime = (video.duration * Number(k)) / 10;
        return true;
      }
    }
    switch (k) {
      case ' ':
      case 'k':
      case 'K':
      case 'MediaPlayPause':
        if (onButton && k === ' ') return false;
        this.togglePause();
        break;
      case 'ArrowUp':
      case 'PageUp':
      case 'ChannelUp':
        this.step(-1);
        break;
      case 'ArrowDown':
      case 'PageDown':
      case 'ChannelDown':
        this.step(1);
        break;
      case 'ArrowRight':
        if (onButton) return false;
        if (e.shiftKey) this.tsBy(30);
        else this.setVolume(video.volume + 0.05);
        break;
      case 'ArrowLeft':
        if (onButton) return false;
        if (e.shiftKey) this.tsBy(-30);
        else this.setVolume(video.volume - 0.05);
        break;
      case 'MediaRewind':
        this.tsBy(-30);
        break;
      case 'MediaFastForward':
        this.tsBy(30);
        break;
      case 'End':
        this.engine.goLive();
        this.updateTimeshift();
        break;
      case 'v':
      case 'V':
        if (api.caps.multiview) this.multiHooks?.open([this.channel]);
        break;
      case 'd':
      case 'D':
        toggleStreamInfo(this, root, video);
        break;
      case 'Enter':
        if (onButton) return false;
        this.toggleSide(true);
        break;
      case 'm':
      case 'M':
        video.muted = !video.muted;
        this.renderControls();
        break;
      case 'f':
      case 'F':
        api.setFullscreen(!this.fullscreen);
        break;
      case 'l':
      case 'L':
        this.toggleSide();
        break;
      case 'i':
      case 'I':
        openInfo(this.channel);
        break;
      case 'MediaPlay':
        video.play();
        break;
      case 'MediaPause':
        video.pause();
        break;
      case 'MediaStop':
        this.close();
        break;
      case 'ColorF1Green':
        openInfo(this.channel);
        break;
      case 'ColorF3Blue':
        this.toggleSide();
        break;
      case 'ColorF2Yellow':
        this.openMenu('settings');
        break;
      case 'c':
      case 'C':
      case 'Subtitle':
        this.openMenu('subs');
        break;
      case 'ColorF0Red':
      case 's':
      case 'S':
        store.toggleFavorite(this.channel.id);
        toast(store.isFavorite(this.channel.id) ? 'Hozzáadva a kedvencekhez' : 'Eltávolítva a kedvencek közül');
        this.renderControls();
        break;
      case 'p':
      case 'P':
        this.togglePip();
        break;
      case 'r':
      case 'R':
        this.recall();
        break;
      case 'n':
      case 'N':
        if (api.caps.mini) this.setMini(!this.mini);
        break;
      default:
        if (/^[0-9]$/.test(k)) this.digit(k);
        else return false;
    }
    return true;
  },
};

// ---------------------------------------------------------------------------
// Eseménykezelés
// ---------------------------------------------------------------------------
player.engine = new Engine(video, {
  onFail: (err) => {
    if (!player.active) return;
    if (player.stream) store.setHealth(player.stream.url, false);
    player.fallback(err);
  },
  onTracks: () => {
    if (!player.active) return;
    player.subsHooks?.onTracks(player.channel, video);
    const menu = $('.p-menu', root);
    if (!menu.hidden && menu.dataset.kind === 'settings') menu.hidden = true;
    // A nyitott „Hang és felirat” menü frissül az új sávokkal.
    if (!menu.hidden && menu.dataset.kind === 'subs') player.subsHooks?.render(menu, player.channel, video);
    player.renderControls();
  },
  onStall: (on) => {
    if (player.engine.started) player.setLoading(on, on ? 'Pufferelés…' : '');
  },
});

root.addEventListener('mousemove', () => player.poke());
// Érintőképernyőn az első koppintás csak a vezérlőket hozza elő (ne állítsa meg az adást).
let touchShowOnly = false;
root.addEventListener('pointerdown', (e) => {
  touchShowOnly = e.pointerType === 'touch' && !root.classList.contains('ui');
});
root.addEventListener('click', (e) => {
  player.poke();
  if (touchShowOnly && (e.target === video || e.target.classList.contains('p-backdrop'))) {
    touchShowOnly = false;
    return;
  }
  const c = e.target.closest('[data-c]')?.dataset.c;
  if (e.target.closest('.p-back')) return player.close();
  if (!c) {
    // Kattintás a videóra: panelek bezárása, egyébként szünet.
    if (e.target === video || e.target.classList.contains('p-backdrop')) {
      if (!$('.p-side', root).hidden || !$('.p-menu', root).hidden) {
        $('.p-side', root).hidden = true;
        $('.p-menu', root).hidden = true;
      } else if (player.mini) return;
      else player.togglePause();
    }
    return;
  }
  switch (c) {
    case 'toggle':
      player.togglePause();
      break;
    case 'ts-back':
      player.tsBy(-30);
      break;
    case 'ts-fwd':
      player.tsBy(30);
      break;
    case 'ts-live':
      player.engine.goLive();
      player.updateTimeshift();
      break;
    case 'cast':
      player.castHooks?.menu();
      break;
    case 'multi':
      player.multiHooks?.open([player.channel]);
      break;
    case 'prev':
      player.step(-1);
      break;
    case 'next':
      player.step(1);
      break;
    case 'mute':
      video.muted = !video.muted;
      player.renderControls();
      break;
    case 'fav':
      store.toggleFavorite(player.channel.id);
      player.renderControls();
      break;
    case 'info':
      if (player.channel?.vod) player.vodHooks?.info(player.channel);
      else openInfo(player.channel);
      break;
    case 'back10':
      player.seekBy(-10);
      break;
    case 'fwd10':
      player.seekBy(10);
      break;
    case 'sleep':
      player.openMenu('sleep');
      break;
    case 'recall':
      player.recall();
      break;
    case 'rec':
      player.recHooks?.toggle();
      break;
    case 'subs':
      player.openMenu('subs');
      break;
    case 'settings':
      player.openMenu('settings');
      break;
    case 'list':
      player.toggleSide();
      break;
    case 'pip':
      player.togglePip();
      break;
    case 'mini':
      player.setMini(!player.mini);
      break;
    case 'full':
      api.setFullscreen(!player.fullscreen);
      break;
  }
});
root.addEventListener('dblclick', (e) => {
  if (e.target !== video && !e.target.classList.contains('p-backdrop')) return;
  if (player.mini) player.setMini(false);
  else api.setFullscreen(!player.fullscreen);
});
// Tekerés az idősávon: húzás közben csak a kijelzés frissül, elengedéskor ugrik.
root.addEventListener('pointerdown', (e) => {
  if (e.target.dataset?.c === 'seek') player.seeking = true;
  if (e.target.dataset?.c === 'ts-seek') player.tsSeeking = true;
});
root.addEventListener('change', (e) => {
  if (e.target.dataset.c === 'seek') {
    player.seeking = false;
    video.currentTime = Number(e.target.value);
    player.updateSeek();
  } else if (e.target.dataset.c === 'ts-seek') {
    player.tsSeeking = false;
    const t = player.engine.timeshiftInfo();
    if (t) video.currentTime = Math.min(t.edge - 2, t.start + Number(e.target.value));
    player.updateTimeshift();
  }
});
video.addEventListener('timeupdate', () => {
  if (!player.channel?.vod) return player.updateTimeshift();
  player.updateSeek();
  // 5 másodpercenként mentjük, hol tart (folytatáshoz).
  if (Date.now() - (player.vodSavedAt || 0) > 5000) {
    player.vodSavedAt = Date.now();
    player.saveVodProgress();
  }
});
video.addEventListener('durationchange', () => player.channel?.vod && player.updateSeek());
video.addEventListener('ended', () => {
  const ch = player.channel;
  if (!ch?.vod) return;
  player.saveVodProgress();
  const next = player.vodHooks?.next(ch, 1);
  if (next && player.vodHooks.autoNext()) player.showNextUp(next);
  else if (!next) {
    toast(ch.vod.ep ? 'Ez volt az utolsó rész.' : 'Vége a filmnek.');
    // (ha közben visszatekert, nem zárjuk be)
    setTimeout(() => player.channel === ch && video.ended && player.close(), 1500);
  }
});
root.addEventListener('input', (e) => {
  if (e.target.dataset.c === 'ts-seek') {
    player.tsSeeking = true;
    player.updateTimeshift();
    return;
  }
  if (e.target.dataset.c === 'seek') {
    player.seeking = true;
    player.updateSeek();
    return;
  }
  if (e.target.dataset.c === 'volume') {
    const v = Number(e.target.value);
    video.volume = v;
    video.muted = v === 0;
    store.set('volume', v);
  }
});
root.addEventListener('change', (e) => {
  if (e.target.dataset.c === 'volume') player.renderControls();
});
video.addEventListener('play', () => player.renderControls());
video.addEventListener('pause', () => {
  player.renderControls();
  player.updateTimeshift();
});
api.onFullscreenChanged((on) => {
  player.fullscreen = on;
  document.body.classList.toggle('fullscreen', on);
  player.renderControls();
});
bus.on('epg', () => player.active && player.renderEpg());

// Médiabillentyűk / rendszer médiavezérlő
if ('mediaSession' in navigator) {
  navigator.mediaSession.setActionHandler('previoustrack', () => player.active && player.step(-1));
  navigator.mediaSession.setActionHandler('nexttrack', () => player.active && player.step(1));
}
bus.on('player-closed', () => {
  if ('mediaSession' in navigator) navigator.mediaSession.metadata = null;
});
video.addEventListener('playing', () => {
  const ch = player.channel;
  if (ch && 'mediaSession' in navigator && window.MediaMetadata) {
    const n = epg.now(ch.id);
    navigator.mediaSession.metadata = new MediaMetadata({
      title: n?.cur?.title || ch.name,
      artist: ch.name,
      artwork: ch.logo ? [{ src: ch.logo }] : [],
    });
  }
});

// ---------------------------------------------------------------------------
// Előnézet a főoldali kiemelt sávban (némítva)
// ---------------------------------------------------------------------------
let preview = null;
export async function startPreview(container, ch) {
  stopPreview();
  if (!store.settings.heroPreview || player.active) return;
  const v = html('<video class="hero-video" muted playsinline></video>');
  container.append(v);
  const eng = new Engine(v);
  preview = { v, eng };
  const stream = orderedStreams(ch)[0];
  try {
    await eng.load(stream, { muted: true });
    if (preview?.v !== v) return;
    store.setHealth(stream.url, true);
    v.classList.add('show');
    container.classList.add('has-video');
  } catch {
    if (preview?.v === v) stopPreview();
  }
}
export function stopPreview() {
  if (!preview) return;
  const { v, eng } = preview;
  preview = null;
  eng.stop();
  v.parentElement?.classList.remove('has-video');
  v.remove();
}
