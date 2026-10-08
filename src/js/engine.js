// Lejátszómotor: HLS (hls.js), MPEG-TS/FLV (mpegts.js), DASH (dash.js), natív videó, vagy (asztali
// változatban) az FFmpeg-híd az AC3/DTS hangú, beágyazott feliratú, régi formátumú fájlokhoz.
import { api } from './api.js';
import { store } from './store.js';
import { MediaBridge } from './bridge.js';
import { ExoEngine } from './exo.js';
import { NetWatch } from './netwatch.js';

const START_TIMEOUT = 20000;
const TIMESHIFT_SEC = 30 * 60; // élő adás: legfeljebb ennyi tekerhető vissza (ha a memória engedi)
const MEM_BUDGET = 110e6; // bájt: a böngésző videópufferének (kb. 150 MB) biztonságos része
const HEAD_TIMEOUT = 6000; // élő adás: ennyi idő alatt meg kell érkeznie a listának / metaadatoknak
const HEAD_TIMEOUT_VOD = 15000; // film: a lassabb tárhelyeknél (pl. archive.org) több idő kell
const HEAD_TIMEOUT_NATIVE = 12000; // a beépített lejátszó (tévé) csak az első szegmens után ad metaadatot

/**
 * A beállított legnagyobb minőség (Beállítások → Lejátszás): az ennél nagyobb felbontású szinteket a
 * hls.js nem választja (adatkímélés, lassú kapcsolat). 'auto': csak az ablakméret korlátoz.
 */
export function applyQualityCap(hls) {
  if (!hls?.levels?.length) return;
  const max = Number(store.settings.maxQuality) || 0;
  if (!max) return void (hls.autoLevelCapping = -1);
  let cap = -1;
  hls.levels.forEach((l, i) => {
    if (l.height > 0 && l.height <= max) cap = Math.max(cap, i); // ismeretlen magasságú szint nem számít bele
  });
  // ha minden szint nagyobb (vagy ismeretlen a magasság), a legkisebbet engedjük
  hls.autoLevelCapping = cap >= 0 ? cap : 0;
}

function detectType(url) {
  const u = url.split(/[?#]/)[0].toLowerCase();
  if (u.endsWith('.mpd')) return 'dash';
  if (u.endsWith('.ts') || u.endsWith('.flv')) return 'mpegts';
  // Videó- és hangfájlok (pl. a NAS-ról): a böngésző saját lejátszója
  if (/\.(mp4|m4v|webm|mkv|mov|ogv|avi|wmv|mp3|aac|m4a|ogg|opus|wav|flac)$/.test(u)) return 'native';
  return 'hls';
}

/** Magyar nyelvjelölés (hu, hun, hu-HU, magyar, hungarian). */
export const isHuLang = (s) => /^(hu|hun|hu-[a-z]+|magyar|hungarian)\b/i.test(String(s || '').trim());
export const isEnLang = (s) => /^(en|eng|en-[a-z]+|english|angol)\b/i.test(String(s || '').trim());

/** Nyelvkód → magyar név a menükhöz. */
export function langName(code, fallback = '') {
  const c = String(code || '').toLowerCase();
  if (isHuLang(c)) return 'magyar';
  if (isEnLang(c)) return 'angol';
  const map = { de: 'német', ger: 'német', deu: 'német', fr: 'francia', fre: 'francia', fra: 'francia', es: 'spanyol', spa: 'spanyol', it: 'olasz', ita: 'olasz', ru: 'orosz', rus: 'orosz', pl: 'lengyel', pol: 'lengyel', ro: 'román', ron: 'román', rum: 'román', sk: 'szlovák', slk: 'szlovák', cs: 'cseh', cze: 'cseh', ces: 'cseh', ja: 'japán', jpn: 'japán', zh: 'kínai', chi: 'kínai', zho: 'kínai', ko: 'koreai', kor: 'koreai', ar: 'arab', ara: 'arab', pt: 'portugál', por: 'portugál', nl: 'holland', dut: 'holland', nld: 'holland', tr: 'török', tur: 'török' };
  return map[c.split('-')[0]] || fallback || c;
}

export class Engine {
  constructor(video, { onFail, onTracks, onStall } = {}) {
    this.video = video;
    this.onFail = onFail || (() => {});
    this.onTracks = onTracks || (() => {});
    this.onStall = onStall || (() => {});
    // Később megjelenő sávok (pl. az adásba ágyazott CC felirat) is frissítsék a menüt.
    let t = 0;
    const later = () => {
      clearTimeout(t);
      t = setTimeout(() => this.onTracks(), 300);
    };
    video.textTracks?.addEventListener?.('addtrack', later);
    video.audioTracks?.addEventListener?.('addtrack', later);
    this.hls = null;
    this.mpegts = null;
    this.dash = null;
    this.token = 0;
    this.stallTimer = null;
    this.type = '';
    this.net = new NetWatch(); // hálózatfigyelő (adásonként újraindul)

    video.addEventListener('waiting', () => {
      clearTimeout(this.stallTimer);
      const tok = this.token;
      this.stallTimer = setTimeout(() => {
        if (tok === this.token && this.started) this.onFail(new Error('Az adás megakadt'));
      }, this.stallMs || 30000);
      if (this.started) this.net.stall();
      this.onStall(true);
    });
    video.addEventListener('playing', () => {
      clearTimeout(this.stallTimer);
      this.onStall(false);
      this.fitBuffer();
    });
    // Szünet alatt az élő adás tovább töltődik (időcsúsztatás), lejátszáskor visszaáll a szokásos puffer.
    video.addEventListener('pause', () => this.fitBuffer());
  }

  /** Betölti és elindítja az adást. Sikeres induláskor teljesül, hiba esetén elutasít. */
  async load(stream, { muted = false, preferNative = false, timeshift = false, quick = false, bridge = null, exo = false, startAt = 0, vod = false, lite = false } = {}) {
    this.stop();
    const token = ++this.token;
    this.net.reset();
    this.started = false;
    const video = this.video;
    video.muted = muted;
    await api.setStreamHeaders(stream.url, { ua: stream.ua, referrer: stream.referrer });
    if (token !== this.token) throw new Error('megszakítva');

    this.type = exo ? 'exo' : bridge ? 'bridge' : detectType(stream.url);
    // A TV-k beépített lejátszója HLS-t is kezel, és nem vonatkozik rá a CORS.
    if (preferNative && this.type === 'hls') this.type = 'native';
    return new Promise((resolve, reject) => {
      let settled = false;
      const ok = () => {
        if (settled || token !== this.token) return;
        settled = true;
        this.started = true;
        clearTimeout(t);
        resolve();
      };
      const fail = (err) => {
        if (token !== this.token) return;
        if (!settled) {
          settled = true;
          clearTimeout(t);
          reject(err);
        } else {
          this.onFail(err);
        }
      };
      const t = setTimeout(() => fail(new Error('Időtúllépés – az adás nem indult el')), START_TIMEOUT);
      video.addEventListener('playing', ok, { once: true });
      // Ha az adó egyáltalán nem válaszol, ne a teljes 20 másodpercet várjuk: a lista (hls.js-nél
      // a manifest, máshol a metaadatok) ennyi idő alatt megérkezik, ha él az adás.
      const headTimer = setTimeout(() => {
        if (!settled && !this.headReceived) fail(new Error('Az adó nem válaszol'));
      }, !timeshift ? HEAD_TIMEOUT_VOD : this.type === 'hls' ? HEAD_TIMEOUT : HEAD_TIMEOUT_NATIVE);
      this.headReceived = false;
      video.addEventListener('loadedmetadata', () => (this.headReceived = true), { once: true });
      const clearHead = () => clearTimeout(headTimer);
      video.addEventListener('playing', clearHead, { once: true });
      video.onerror = () => fail(new Error('A videó nem játszható le'));

      const tryPlay = () => video.play().catch((e) => {
        if (e.name === 'NotAllowedError') {
          video.muted = true;
          video.play().catch(() => {});
        }
      });

      if (this.type === 'exo') {
        // Android: natív lejátszó (ExoPlayer) – az események a videóelemen érkeznek
        const e = new ExoEngine(video, stream, { startAt, onFail: (err) => fail(err), onTracks: () => this.onTracks() });
        this.exo = e;
        e.start();
      } else if (this.type === 'bridge') {
        const b = new MediaBridge(video, stream.url, bridge, {
          startAt,
          onFail: (err) => fail(err),
          onTracks: () => this.onTracks(),
        });
        this.bridge = b;
        video.addEventListener('loadedmetadata', () => this.onTracks(), { once: true });
        b.open()
          .then(() => {
            if (token !== this.token) return;
            if (startAt > 0) video.currentTime = startAt;
            tryPlay();
            this.onTracks();
          })
          .catch(fail);
      } else if (this.type === 'hls' && window.Hls?.isSupported()) {
        const hls = new window.Hls({
          enableWorker: true,
          lowLatencyMode: false,
          // Gyors indulás: a lista csak rövid ideig várhat (ha van tartalék forrás, újrapróbálás nélkül),
          // az első szegmens letöltése a lejátszó csatlakoztatásával párhuzamosan indul.
          manifestLoadingTimeOut: 6000,
          manifestLoadingMaxRetry: quick ? 0 : 1,
          levelLoadingTimeOut: 8000,
          levelLoadingMaxRetry: 2,
          fragLoadingTimeOut: 12000,
          startFragPrefetch: true,
          // Időcsúsztatás: a már letöltött adás megmarad (visszatekerhető). A tárolt mennyiséget a
          // böngésző médiapufferének mérete korlátozza – a felett a lejátszás akadozna –, ezért a
          // minőség (bitráta) szerint számoljuk ki (lásd fitBuffer).
          // könnyű mód (többképes nézet, előnézet): kis puffer – négy csempe se egyen sok memóriát
          backBufferLength: lite ? 0 : timeshift ? 120 : 30,
          // film / sorozat: nagyobb előretöltés (nincs élő szél, ami korlátozná) – kevesebb akadás lassú tárhelyen
          maxBufferLength: lite ? 10 : vod ? 60 : 30,
          maxMaxBufferLength: lite ? 20 : 600,
          maxBufferSize: (lite ? 15 : 60) * 1000 * 1000,
          // Akadás ellen: az élő adás széle előtt 4 szegmensnyivel indulunk (alapból 3) – így nagyobb a
          // tartalék, ha a szerver épp lassabban küld –, és nem gyorsítunk rá a lejátszásra a behozáshoz.
          liveSyncDurationCount: 4,
          maxLiveSyncPlaybackRate: 1,
          // minden akadás után 2 mp-cel nagyobb tartalékot tart az élő adás szélétől
          liveSyncOnStallIncrease: 2,
          // A TS-adások szegmenshatárain gyakori apró időbélyeg-réseket a lejátszó átlépi, nem áll meg rajtuk.
          maxBufferHole: 0.5,
          nudgeMaxRetry: 6,
          // Óvatosabb minőségváltás: felfelé csak bőséges sávszélességnél, lefelé hamarabb.
          abrBandWidthFactor: 0.8,
          abrBandWidthUpFactor: 0.6,
          // Legfeljebb az ablak méretének megfelelő felbontás (kis ablakban, mini lejátszóban nem tölt Full HD-t)
          capLevelToPlayerSize: true,
        });
        this.hls = hls;
        this.timeshift = timeshift;
        let recovered = false;
        hls.on(window.Hls.Events.MANIFEST_LOADED, () => (this.headReceived = true));
        // Az adás tényleges bitrátája a letöltött szegmensekből (az Adás adatai panelhez; sok lista nem adja meg)
        this.fragBitrate = 0;
        hls.on(window.Hls.Events.FRAG_LOADED, (_e, d) => {
          const bytes = d.frag?.stats?.loaded || d.payload?.byteLength || 0;
          const dur = d.frag?.duration || 0;
          if (d.frag?.type !== 'main') return;
          if (bytes && dur > 0.5) this.fragBitrate = this.fragBitrate ? this.fragBitrate * 0.7 + ((bytes * 8) / dur) * 0.3 : (bytes * 8) / dur;
          this.net.frag(d.frag.stats, dur); // hálózatfigyelő: sebesség, válaszidő, valós idejűség
        });
        hls.on(window.Hls.Events.MANIFEST_PARSED, () => {
          applyQualityCap(hls);
          tryPlay();
          this.onTracks();
        });
        hls.on(window.Hls.Events.LEVEL_SWITCHED, () => {
          this.fitBuffer();
          this.onTracks();
        });
        // Megtelt a médiapuffer: kevesebb visszatekerhető adás, de akadás nélkül.
        hls.on(window.Hls.Events.ERROR, (_e, data) => {
          if (data.details === 'bufferFullError') {
            this.memBudget = Math.max(20e6, (this.memBudget || MEM_BUDGET) * 0.6);
            this.fitBuffer();
          }
        });
        hls.on(window.Hls.Events.AUDIO_TRACKS_UPDATED, () => this.onTracks());
        hls.on(window.Hls.Events.SUBTITLE_TRACKS_UPDATED, () => this.onTracks());
        hls.subtitleDisplay = false; // a beágyazott feliratok alapból rejtve (a profil beállítása szerint kapcsoljuk)
        hls.on(window.Hls.Events.ERROR, (_e, data) => {
          if (!data.fatal) return;
          if (data.type === window.Hls.ErrorTypes.MEDIA_ERROR && !recovered) {
            recovered = true;
            hls.recoverMediaError();
            return;
          }
          const err = new Error(data.details || 'HLS hiba');
          err.httpStatus = data.response?.code || data.networkDetails?.status || 0; // 403 / 451: földrajzi korlát
          fail(err);
        });
        hls.loadSource(stream.url);
        hls.attachMedia(video);
      } else if (this.type === 'mpegts' && window.mpegts?.isSupported()) {
        const p = window.mpegts.createPlayer(
          { type: stream.url.toLowerCase().includes('.flv') ? 'flv' : 'mpegts', isLive: true, url: stream.url },
          timeshift
            ? { enableStashBuffer: false, liveBufferLatencyChasing: false, autoCleanupSourceBuffer: true, autoCleanupMaxBackwardDuration: 300, autoCleanupMinBackwardDuration: 240 }
            : { enableStashBuffer: false, liveBufferLatencyChasing: true }
        );
        this.mpegts = p;
        p.on(window.mpegts.Events.ERROR, (type, detail) => fail(new Error(`${type}: ${detail}`)));
        p.on(window.mpegts.Events.MEDIA_INFO, () => (this.headReceived = true));
        p.attachMediaElement(video);
        p.load();
        tryPlay();
      } else if (this.type === 'dash' && window.dashjs) {
        const p = window.dashjs.MediaPlayer().create();
        this.dash = p;
        p.updateSettings({ debug: { logLevel: 0 }, streaming: { lowLatencyEnabled: false, text: { defaultEnabled: false } } });
        p.on('error', (e) => fail(new Error('DASH hiba: ' + (e.error?.message || e.error || ''))));
        p.on('streamInitialized', () => {
          this.headReceived = true;
          this.onTracks();
        });
        p.initialize(video, stream.url, true);
      } else {
        video.src = stream.url;
        // Több hangsávos fájl (pl. MKV): a sávok a metaadatok betöltése után ismertek.
        video.addEventListener('loadedmetadata', () => this.onTracks(), { once: true });
        tryPlay();
      }
    });
  }

  /**
   * Időcsúsztatás: a visszatekerhető (és szünet alatt előre letöltött) rész hossza a bitráta szerint,
   * hogy a médiapufferbe beleférjen (különben a lejátszó folyamatosan ürítene és akadna).
   */
  fitBuffer() {
    const hls = this.hls;
    if (!hls || !this.timeshift) return;
    const lv = hls.levels[hls.currentLevel] || hls.levels[0];
    const bps = Math.max(300e3, lv?.bitrate || 2e6);
    const seconds = Math.floor(((this.memBudget || MEM_BUDGET) * 8) / bps);
    const paused = this.video.paused && this.started;
    // Szünet alatt előre töltünk (ennyit lehet később „bepótolni”), lejátszás közben hátra tartunk meg.
    hls.config.backBufferLength = Math.max(30, Math.min(TIMESHIFT_SEC, paused ? 30 : seconds - 30));
    hls.config.maxBufferLength = paused ? Math.max(30, Math.min(TIMESHIFT_SEC, seconds - 30)) : 30;
    hls.config.maxMaxBufferLength = Math.max(hls.config.maxBufferLength, 60);
    hls.config.maxBufferSize = paused ? (this.memBudget || MEM_BUDGET) : 60e6;
  }

  stop() {
    this.token++;
    this.started = false;
    clearTimeout(this.stallTimer);
    const v = this.video;
    v.onerror = null;
    if (this.exo) {
      this.exo.destroy();
      this.exo = null;
    }
    if (this.bridge) {
      this.bridge.destroy();
      this.bridge = null;
    }
    if (this.hls) {
      this.hls.destroy();
      this.hls = null;
    }
    if (this.mpegts) {
      try {
        this.mpegts.destroy();
      } catch {}
      this.mpegts = null;
    }
    if (this.dash) {
      try {
        this.dash.reset();
      } catch {}
      this.dash = null;
    }
    v.removeAttribute('src');
    try {
      v.load();
    } catch {}
  }

  /**
   * Élő adás időcsúsztatása: a visszatekerhető tartomány.
   * → { start, edge, pos, behind } másodpercben, vagy null, ha nem tekerhető.
   */
  timeshiftInfo() {
    const v = this.video;
    if (!this.started) return null;
    const ranges = v.seekable && v.seekable.length ? v.seekable : v.buffered;
    if (!ranges || !ranges.length) return null;
    let start = ranges.start(0);
    const bufEnd = v.buffered.length ? v.buffered.end(v.buffered.length - 1) : ranges.end(ranges.length - 1);
    // Az „élő” pont: hls.js-nél a szokásos élő késleltetés helye, máshol a puffer vége.
    const edge = this.hls?.liveSyncPosition ? Math.min(this.hls.liveSyncPosition, bufEnd) : bufEnd;
    if (v.buffered.length) start = Math.max(start, v.buffered.start(0));
    if (!isFinite(edge) || edge - start < 20) return null;
    const pos = v.currentTime;
    return { start, edge, pos, behind: Math.max(0, edge - pos) };
  }

  /** Ugrás az élő adáshoz. */
  goLive() {
    const t = this.timeshiftInfo();
    if (!t) return;
    this.video.currentTime = this.hls ? t.edge : Math.max(t.start, t.edge - 4);
    if (this.video.paused) this.video.play().catch(() => {});
  }

  /** Minőségi szintek: [{ index, label }], -1 = automatikus. */
  levels() {
    if (this.hls) {
      return this.hls.levels.map((l, i) => ({
        index: i,
        label: l.height ? `${l.height}p` + (l.bitrate ? ` · ${(l.bitrate / 1e6).toFixed(1)} Mbps` : '') : `${Math.round((l.bitrate || 0) / 1000)} kbps`,
      }));
    }
    if (this.dash) {
      return (this.dash.getBitrateInfoListFor?.('video') || []).map((b, i) => ({ index: i, label: `${b.height}p` }));
    }
    return [];
  }

  get level() {
    if (this.hls) return this.hls.autoLevelEnabled ? -1 : this.hls.currentLevel;
    return -1;
  }

  setLevel(i) {
    if (this.hls) this.hls.currentLevel = i;
    if (this.dash) {
      this.dash.updateSettings({ streaming: { abr: { autoSwitchBitrate: { video: i < 0 } } } });
      if (i >= 0) this.dash.setQualityFor('video', i);
    }
  }

  // --- Hangsávok (hls.js, dash.js, a böngésző saját lejátszója) ----------------------
  /** [{ index, label, lang }] */
  audioTracks() {
    const lab = (lang, name, i) => {
      const ln = langName(lang);
      return name && ln && !name.toLowerCase().includes(ln) ? `${name} (${ln})` : name || ln || `${i + 1}. hangsáv`;
    };
    if (this.exo) return this.exo.audioTracks(lab);
    if (this.bridge) {
      const ch = (c) => (/^(5\.1|7\.1|6\.1)/.test(c) ? ` · ${c.replace(/\(.*\)/, '')}` : '');
      return this.bridge.audio.map((a, i) => ({ index: i, lang: a.lang, label: lab(a.lang, a.title, i) + ` (${a.codec.toUpperCase()}${ch(a.channels)})` }));
    }
    if (this.hls) return this.hls.audioTracks.map((t, i) => ({ index: i, lang: t.lang || '', label: lab(t.lang, t.name, i) }));
    if (this.dash) {
      return (this.dash.getTracksFor?.('audio') || []).map((t, i) => ({ index: i, lang: t.lang || '', label: lab(t.lang, t.labels?.[0]?.text, i) }));
    }
    const at = this.video.audioTracks;
    if (at && at.length) return [...at].map((t, i) => ({ index: i, lang: t.language || '', label: lab(t.language, t.label, i) }));
    return [];
  }

  get audioTrack() {
    if (this.exo) return this.exo.audioIndex;
    if (this.bridge) return this.bridge.audio.findIndex((a) => a.rel === this.bridge.audioRel);
    if (this.hls) return this.hls.audioTrack;
    if (this.dash) {
      const cur = this.dash.getCurrentTrackFor?.('audio');
      return (this.dash.getTracksFor?.('audio') || []).indexOf(cur);
    }
    const at = this.video.audioTracks;
    if (at && at.length) return [...at].findIndex((t) => t.enabled);
    return -1;
  }

  setAudioTrack(i) {
    if (this.exo) this.exo.setAudio(i);
    else if (this.bridge) {
      const a = this.bridge.audio[i];
      if (a) this.bridge.setAudio(a.rel);
    } else if (this.hls) this.hls.audioTrack = i;
    else if (this.dash) {
      const t = (this.dash.getTracksFor?.('audio') || [])[i];
      if (t) this.dash.setCurrentTrack(t);
    } else {
      const at = this.video.audioTracks;
      if (at && at.length) [...at].forEach((t, n) => (t.enabled = n === i));
    }
  }

  // --- Beágyazott feliratok (az adásban / fájlban lévők) --------------------------------
  /** [{ id, label, lang }] – a saját (letöltött / helyi) felirat nem tartozik ide. */
  textTracks() {
    const out = [];
    if (this.exo) return this.exo.textTracks(langName);
    if (this.hls) {
      this.hls.subtitleTracks.forEach((t, i) => out.push({ id: `hls:${i}`, lang: t.lang || '', label: t.name || langName(t.lang) || `${i + 1}. felirat` }));
    } else if (this.dash) {
      (this.dash.getTracksFor?.('text') || []).forEach((t, i) =>
        out.push({ id: `dash:${i}`, lang: t.lang || '', label: t.labels?.[0]?.text || langName(t.lang) || `${i + 1}. felirat` })
      );
    }
    // A videóelem saját sávjai (MP4/MKV beágyazott felirat, TV-s CC-felirat), a mi sávunk nélkül
    [...this.video.textTracks].forEach((t, i) => {
      if (t.label === 'Felirat' || t.kind === 'metadata') return;
      if (this.hls && t.kind === 'subtitles') return; // ezeket a hls.js listája már tartalmazza
      out.push({
        id: `tt:${i}`,
        lang: t.language || '',
        label: (t.label && langName(t.language) && !t.label.toLowerCase().includes(langName(t.language)) ? `${t.label} (${langName(t.language)})` : t.label || langName(t.language) || `${i + 1}. felirat`) +
          (t.kind === 'captions' ? ' (CC)' : '') +
          (t.__adasForced ? ' – kényszerített' : ''),
        default: !!t.__adasDefault,
        forced: !!t.__adasForced,
      });
    });
    return out;
  }

  /** Az aktív beágyazott felirat azonosítója, vagy '' (kikapcsolva). */
  get textTrack() {
    if (this.exo) return this.exo.textId;
    if (this.hls && this.hls.subtitleDisplay && this.hls.subtitleTrack >= 0) return `hls:${this.hls.subtitleTrack}`;
    if (this.dash) {
      const i = this.dash.getCurrentTextTrackIndex?.();
      if (i >= 0) return `dash:${i}`;
    }
    const i = [...this.video.textTracks].findIndex((t) => t.label !== 'Felirat' && t.mode === 'showing');
    return i >= 0 ? `tt:${i}` : '';
  }

  /** Beágyazott felirat kiválasztása (id a textTracks() listából), vagy '' = kikapcsolás. */
  setTextTrack(id) {
    const [kind, n] = String(id || '').split(':');
    const idx = Number(n);
    if (this.exo) return this.exo.setText(id);
    if (this.hls) {
      this.hls.subtitleTrack = kind === 'hls' ? idx : -1;
      this.hls.subtitleDisplay = kind === 'hls';
    }
    if (this.dash) this.dash.setTextTrack?.(kind === 'dash' ? idx : -1);
    [...this.video.textTracks].forEach((t, i) => {
      if (t.label === 'Felirat') return; // a saját sávot a felirat-kezelő kapcsolja
      if (kind === 'tt') t.mode = i === idx ? 'showing' : 'disabled';
      else if (!(this.hls && kind === 'hls' && t.kind === 'subtitles')) t.mode = 'disabled';
    });
  }
}
