// Podcast-lejátszó: epizódok lejátszása tekeréssel, sebességgel, ugrásokkal, folytatással, fejezetekkel,
// alvásidőzítővel, lejátszási sorral. Asztali gépen (és a webes változatban) a böngésző audioeleme, Androidon a natív
// lejátszó (háttérben, kikapcsolt képernyőnél is szól) – a felület ugyanaz (podcastpage.js).
import { bus } from './util.js';
import { store } from './store.js';
import { api, IS_ANDROID } from './api.js';
import { pod, podCfg, subOf, savePos, markPlayed, pushHistory, addListen, playUrl, epState, deleteDownload, forgetDownload, findEp } from './podcast.js';
import { radioPlayer, audioFxAvailable } from './radioplayer.js';
import { player } from './player.js';
import { _t } from './i18n.js';

const NATIVE = IS_ANDROID && typeof window.AdasAndroid?.podPlay === 'function';
export const RATES = [0.75, 0.9, 1, 1.1, 1.25, 1.5, 1.75, 2, 2.5, 3];

class PodPlayer {
  constructor() {
    this.ep = null;
    this.state = 'idle'; // idle | loading | playing | paused | error
    this.pos = 0;
    this.dur = 0;
    this.rate = 1;
    this.sleepAt = 0; // időpont (ms), vagy -1: az epizód végén
    this.chapters = [];
    this.boost = 1;
    this.skipSilence = false;
    this.lastSave = 0;
    this.lastStat = 0;
    this.wantPause = false; // (a felhasználó szüneteltetett – betöltés / újrapróbálás közben is érvényes)
    this.gen = 0; // (Androidon a natív indítás sorszáma: a korábbi indítás késve érkező eseménye nem számít)
    this.el = null;
    this.fx = null;
  }
  get active() {
    return !!this.ep;
  }
  get playing() {
    return this.state === 'playing';
  }
  emit(kind) {
    bus.emit('pod-player', kind);
  }

  // -------------------------------------------------------------------------- indítás
  async play(ep, { from = null } = {}) {
    if (!ep?.url) return;
    // (a videó és a rádió megáll – egyszerre egy hang szól)
    if (player.active) player.close();
    if (radioPlayer.playing) radioPlayer.pause();
    this.saveNow();
    this.flushStat();
    this.wantPause = false;
    this.prof = store.profile; // (a lejátszó profilja: a pozíció és a hallgatási idő ide kerül, profilváltáskor is)
    const full = findEp(ep.key) || ep;
    this.ep = full;
    const cfg = podCfg();
    const set = subOf(full.feed)?.set || {};
    this.rate = Number(set.speed) || cfg.speed || 1;
    this.boost = Number(set.boost) || 1;
    this.skipSilence = !!(set.skipSilence ?? cfg.skipSilence);
    const st = epState(full.key);
    // (meghallgatott epizódnál az elejéről; a bevezető átugrása a műsor beállítása szerint)
    let start = from ?? (st?.played ? 0 : st?.pos || 0);
    if (start < (Number(set.skipIntro) || 0)) start = Number(set.skipIntro) || 0;
    if (st?.dur && start > st.dur - 5) start = 0;
    this.pos = start;
    this.dur = st?.dur || full.dur || 0;
    this.chapters = [];
    this.state = 'loading';
    this.lastStat = 0;
    this.emit('start');
    bus.emit('pod-start');
    pushHistory(full);
    this.loadChapters(full);
    const url = playUrl(full);
    if (NATIVE) {
      this.nativeUrl = url;
      window.AdasAndroid.podPlay(JSON.stringify({ gen: ++this.gen, url, start, rate: this.rate, title: full.title, artist: full.feedTitle || '', art: full.image || '' }));
    } else this.playWeb(url, start);
    this.mediaSession();
  }
  playWeb(url, start, cors = audioFxAvailable && (this.boost > 1 || this.skipSilence), paused = false) {
    this.teardownWeb();
    const a = new Audio();
    this.el = a;
    a.preload = 'auto';
    if (cors) a.crossOrigin = 'anonymous';
    a.src = url;
    a.playbackRate = this.rate;
    a.addEventListener('loadedmetadata', () => {
      if (a !== this.el) return;
      if (isFinite(a.duration)) this.dur = a.duration;
      if (start) a.currentTime = start;
    });
    a.addEventListener('timeupdate', () => a === this.el && this.tick(a.currentTime, a.duration));
    a.addEventListener('playing', () => a === this.el && this.setState('playing'));
    a.addEventListener('pause', () => a === this.el && !a.ended && this.setState('paused'));
    a.addEventListener('waiting', () => a === this.el && this.setState('loading'));
    a.addEventListener('ended', () => a === this.el && this.ended());
    a.addEventListener('error', () => {
      if (a !== this.el) return;
      // (CORS-módban nem indult: hangfeldolgozás nélkül még egyszer; a letöltött fájl hiányzik: az eredeti címről)
      // (a szünet a mostani szándék szerint – nem a régi elem indításakori állapot)
      if (cors) return this.playWeb(url, this.pos || start, false, this.wantPause);
      if (url.startsWith('file:') && this.ep?.url && this.ep.url !== url) return this.playWeb(this.ep.url, this.pos || start, undefined, this.wantPause);
      this.setState('error');
    });
    if (cors) this.attachFx(a);
    if (paused) this.setState('paused');
    else a.play().catch(() => {});
  }
  /** Androidon: a letöltött fájl hiányzik / nem játszható – még egyszer az eredeti címről (true: újrapróbálja). */
  nativeRetry(missing = false) {
    const ep = this.ep;
    if (!NATIVE || !ep?.url || !this.nativeUrl?.startsWith('file:') || this.nativeUrl === ep.url) return false;
    // (csak a ténylegesen hiányzó fájl letöltés-adata törlődik – más lejátszási hibánál a fájl megmarad)
    if (missing) forgetDownload(ep);
    this.nativeUrl = ep.url;
    window.AdasAndroid.podPlay(JSON.stringify({ gen: ++this.gen, url: ep.url, start: this.pos, rate: this.rate, title: ep.title, artist: ep.feedTitle || '', art: ep.image || '' }));
    if (this.wantPause) window.AdasAndroid.podPause();
    return true;
  }
  teardownWeb() {
    if (!this.el) return;
    this.el.pause();
    this.el.removeAttribute('src');
    this.el.load();
    this.el = null;
    clearInterval(this.fx?.timer);
    this.fx?.ctx?.close?.().catch?.(() => {});
    this.fx = null;
  }
  /** Hangerő-erősítés (GainNode) és csend átugrása (a csendes részek gyorsítva) – csak CORS-módban. */
  attachFx(a) {
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      const ctx = new AC();
      const src = ctx.createMediaElementSource(a);
      const gain = ctx.createGain();
      gain.gain.value = this.boost;
      const an = ctx.createAnalyser();
      an.fftSize = 1024;
      src.connect(gain).connect(an).connect(ctx.destination);
      const buf = new Float32Array(an.fftSize);
      let quiet = 0;
      const timer = setInterval(() => {
        if (!this.skipSilence || a.paused) return;
        an.getFloatTimeDomainData(buf);
        let sum = 0;
        for (const v of buf) sum += v * v;
        const rms = Math.sqrt(sum / buf.length);
        quiet = rms < 0.012 ? quiet + 1 : 0;
        // (legalább 0,3 mp csend: gyorsítva, amíg újra hang nem jön)
        a.playbackRate = quiet >= 3 ? Math.min(4, this.rate * 3) : this.rate;
      }, 100);
      this.fx = { ctx, gain, timer };
    } catch {
      this.fx = null;
    }
  }

  // -------------------------------------------------------------------------- állapot
  setState(s) {
    if (this.state === s) return;
    // (a hallgatási idő csak a folyamatos lejátszás szakaszaiból számít – a lezáruló szakasz még az epizódé)
    this.flushStat();
    this.state = s;
    // (új lejátszási szakasz: az elszámolás innen indul; más állapotban nincs)
    this.lastStat = s === 'playing' ? Date.now() : 0;
    if (s === 'paused') this.saveNow();
    if ('mediaSession' in navigator && !NATIVE) navigator.mediaSession.playbackState = s === 'playing' ? 'playing' : 'paused';
    this.emit('state');
  }
  tick(pos, dur) {
    if (!this.ep) return;
    this.pos = pos;
    if (dur && isFinite(dur)) this.dur = dur;
    const now = Date.now();
    if (now - this.lastSave > 5000) {
      this.lastSave = now;
      savePos(this.ep, pos, this.dur, this.prof);
    }
    if (this.playing && now - this.lastStat > 15000) {
      this.flushStat();
      this.lastStat = now;
    }
    // a záró rész átugrása (a műsor beállítása szerint)
    const outro = Number(subOf(this.ep.feed)?.set?.skipOutro) || 0;
    if (outro && this.dur > outro * 2 && pos >= this.dur - outro) return void this.ended();
    if (this.sleepAt > 0 && now >= this.sleepAt) {
      this.sleepAt = 0;
      this.pause();
      this.emit('sleep');
    }
    this.emit('time');
  }
  /** A legutóbbi elszámolás óta hallgatott idő a mostani epizód műsorához. */
  flushStat() {
    const now = Date.now();
    if (this.ep && this.playing && this.lastStat) addListen(this.ep.feed, Math.round((now - this.lastStat) / 1000), this.prof);
    if (this.lastStat) this.lastStat = now;
  }
  saveNow() {
    if (this.ep && this.pos > 1) savePos(this.ep, this.pos, this.dur, this.prof);
  }
  ended() {
    const ep = this.ep;
    if (!ep) return;
    markPlayed(ep, true);
    if (podCfg().autoDelete && epState(ep.key)?.dl) deleteDownload(ep).catch(() => {});
    this.emit('ended');
    const stopHere = this.sleepAt === -1;
    this.sleepAt = 0;
    const next = pod().queue.find((x) => x.key !== ep.key);
    if (!stopHere && podCfg().continuous && next) return void this.play(next);
    this.stop();
  }

  // -------------------------------------------------------------------------- kezelés
  pause() {
    if (!this.ep) return;
    this.wantPause = true;
    if (NATIVE) window.AdasAndroid.podPause();
    else this.el?.pause();
    this.setState('paused');
  }
  resume() {
    if (!this.ep) return;
    this.wantPause = false;
    if (player.active) player.close();
    if (radioPlayer.playing) radioPlayer.pause();
    if (NATIVE) window.AdasAndroid.podResume();
    else if (this.el) this.el.play().catch(() => {});
    else this.play(this.ep);
  }
  toggle() {
    if (this.playing || this.state === 'loading') this.pause();
    else this.resume();
  }
  seek(t) {
    if (!this.ep) return;
    const v = Math.max(0, Math.min(this.dur || t, t));
    this.pos = v;
    if (NATIVE) window.AdasAndroid.podSeek(v);
    else if (this.el) this.el.currentTime = v;
    this.saveNow();
    this.emit('time');
  }
  skip(d) {
    this.seek(this.pos + d);
  }
  setRate(r) {
    this.rate = r;
    if (NATIVE) window.AdasAndroid.podRate(r);
    else if (this.el) this.el.playbackRate = r;
    this.emit('rate');
  }
  setBoost(b) {
    this.boost = b;
    if (this.fx) this.fx.gain.gain.value = b;
    else if (this.ep && b > 1 && !NATIVE && audioFxAvailable) this.playWeb(playUrl(this.ep), this.pos, true, this.wantPause);
    this.emit('rate');
  }
  setSkipSilence(on) {
    this.skipSilence = on;
    if (on && !this.fx && this.ep && !NATIVE && audioFxAvailable) this.playWeb(playUrl(this.ep), this.pos, true, this.wantPause);
    this.emit('rate');
  }
  /** Alvásidőzítő: perc, -1 = az epizód végén, 0 = ki. */
  setSleep(min) {
    this.sleepAt = min === -1 ? -1 : min ? Date.now() + min * 60e3 : 0;
    this.emit('sleep');
  }
  next() {
    const cur = this.ep?.key;
    const n = pod().queue.find((x) => x.key !== cur);
    if (n) this.play(n);
  }
  stop() {
    this.saveNow();
    this.flushStat();
    if (NATIVE) window.AdasAndroid.podStop();
    this.teardownWeb();
    this.ep = null;
    this.state = 'idle';
    this.sleepAt = 0;
    if ('mediaSession' in navigator && !NATIVE) navigator.mediaSession.metadata = null;
    this.emit('stop');
  }

  // -------------------------------------------------------------------------- fejezetek
  async loadChapters(ep) {
    try {
      let list = [];
      if (Array.isArray(ep.chapters)) list = ep.chapters;
      else if (typeof ep.chapters === 'string' && /^https?:/.test(ep.chapters)) {
        const { text } = await api.fetchText(ep.chapters, { maxAgeHours: 24 * 7 });
        list = (JSON.parse(text).chapters || []).filter((c) => c.toc !== false).map((c) => ({ start: Number(c.startTime) || 0, title: c.title || '', url: c.url || '', img: c.img || '' }));
      }
      if (this.ep?.key !== ep.key) return;
      this.chapters = list.sort((a, b) => a.start - b.start);
      this.emit('chapters');
    } catch {}
  }
  chapterAt(t = this.pos) {
    let c = null;
    for (const x of this.chapters) if (x.start <= t + 0.5) c = x;
    return c;
  }
  chapterStep(d) {
    if (!this.chapters.length) return this.skip(d > 0 ? 30 : -10);
    const cur = this.chapterAt();
    const i = cur ? this.chapters.indexOf(cur) : -1;
    const t = d > 0 ? this.chapters[i + 1] : this.pos - (cur?.start || 0) > 3 ? cur : this.chapters[i - 1];
    if (t) this.seek(t.start);
  }

  // -------------------------------------------------------------------------- rendszerkezelők (zárolt képernyő, médiagombok)
  mediaSession() {
    if (NATIVE || !('mediaSession' in navigator) || !this.ep) return;
    try {
      navigator.mediaSession.metadata = new window.MediaMetadata({ title: this.ep.title, artist: this.ep.feedTitle || '', album: _t('Podcast'), artwork: this.ep.image ? [{ src: this.ep.image, sizes: '512x512' }] : [] });
      const cfg = podCfg();
      navigator.mediaSession.setActionHandler('play', () => this.active && this.resume());
      navigator.mediaSession.setActionHandler('pause', () => this.active && this.pause());
      navigator.mediaSession.setActionHandler('seekbackward', () => this.active && this.skip(-cfg.skipBack));
      navigator.mediaSession.setActionHandler('seekforward', () => this.active && this.skip(cfg.skipFwd));
      navigator.mediaSession.setActionHandler('seekto', (d) => this.active && this.seek(d.seekTime));
    } catch {}
  }
}

export const podPlayer = new PodPlayer();

// Android: a natív lejátszó jelzései (állapot, pozíció)
window.__adasPod = (o) => {
  if (!podPlayer.ep || !o) return;
  if (o.gen != null && o.gen !== podPlayer.gen) return;
  if (typeof o.pos === 'number') podPlayer.tick(o.pos, o.dur || podPlayer.dur);
  if (o.st === 'error' && podPlayer.nativeRetry(!!o.missing)) return;
  if (o.st === 'playing' || o.st === 'paused' || o.st === 'loading' || o.st === 'error') podPlayer.setState(o.st);
  if (o.st === 'ended') podPlayer.ended();
};
// egyszerre egy hang: a videó / a rádió indulásakor a podcast megáll
const busy = () => podPlayer.playing || podPlayer.state === 'loading';
bus.on('video-open', () => busy() && podPlayer.pause());
bus.on('radio-start', () => busy() && podPlayer.pause());
// bezáráskor / profilváltáskor a pozíció megmarad
window.addEventListener('beforeunload', () => podPlayer.saveNow());
bus.on('profile', () => podPlayer.active && podPlayer.stop());
