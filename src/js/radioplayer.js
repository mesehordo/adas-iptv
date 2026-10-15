// Rádió – lejátszómotor: két audioelem (átúsztatás adóváltáskor), hangzás (hangszínszabályzó, hangerő-
// kiegyenlítés, térhatás, retro szűrő), spektrum-elemző a vizualizációhoz, tartalék címek, „most szól”
// (ICY-metaadat: asztali változat és Android) borítóval és előzményekkel, elalvás-időzítő, a rendszer
// médiavezérlői. A videólejátszó indulásakor elhallgat.
//
// A hangfeldolgozás (Web Audio) csak ott működik, ahol a böngészőmotor hozzáfér az adás hangjához: asztali
// gépen (a CORS-ellenőrzés ki van kapcsolva) és Androidon (a proxy CORS-fejlécet ad); LG webOS-en és a sima
// böngészőben nem – ott a rádió effektek és vizualizáció nélkül szól.
import { api, IS_ANDROID } from './api.js';
import { store } from './store.js';
import { bus } from './util.js';
import { _t } from './i18n.js';
import { pushRadioRecent, reportClick } from './radio.js';

export const FX_DEFAULTS = { eq: 'flat', level: true, widen: false, retro: false, xfade: 2, vis: 'spectrum', volume: 0.9 };
export const fx = () => {
  const f = { ...FX_DEFAULTS, ...(store.settings.radioFx || {}) };
  if (!VIS_MODES.some(([id]) => id === f.vis)) f.vis = 'spectrum'; // (a megszűnt kör / VU-mérő helyett)
  return f;
};
export function setFx(patch) {
  store.settings.radioFx = { ...fx(), ...patch };
  store.save();
  radioPlayer.applyFx();
  bus.emit('radio-fx');
}

export const EQ_BANDS = [31, 62, 125, 250, 500, 1000, 2000, 4000, 8000, 16000];
// [azonosító, név, sávok erősítése dB-ben]
export const EQ_PRESETS = [
  ['flat', _t('Kikapcsolva'), [0, 0, 0, 0, 0, 0, 0, 0, 0, 0]],
  ['pop', _t('Pop'), [-1, 1, 3, 4, 2, 0, -1, -1, 1, 2]],
  ['rock', _t('Rock'), [4, 3, 1, -1, -1, 1, 3, 4, 4, 4]],
  ['speech', _t('Beszéd, hírek'), [-6, -4, -1, 2, 4, 4, 3, 1, -2, -4]],
  ['classical', _t('Klasszikus'), [3, 2, 1, 0, 0, 0, -1, 1, 2, 3]],
  ['bass', _t('Mélykiemelés'), [7, 6, 4, 2, 0, 0, 0, 0, 0, 0]],
  ['night', _t('Éjszakai (halk, tiszta)'), [-3, -2, 0, 1, 2, 2, 1, 0, -1, -3]],
];
export const VIS_MODES = [
  ['spectrum', _t('Spektrum')],
  ['wave', _t('Hullám')],
  ['mirror', _t('Tükör')],
  ['soft', _t('Hullámhegyek')],
];

const AC = window.AudioContext || window.webkitAudioContext;
/** Működik-e itt a hangfeldolgozás (effektek, vizualizáció)? */
export const audioFxAvailable = !!AC && (!!window.api || IS_ANDROID);
const PLAYLIST_RX = /\.(pls|m3u|asx|xspf)(\?|$)/i;
const START_TIMEOUT = 15000;

/** Lejátszólista-cím (.pls / .m3u / .asx) → az első adás címe. */
export async function resolveStream(url) {
  if (!PLAYLIST_RX.test(url) || /\.m3u8(\?|$)/i.test(url)) return url;
  try {
    const { text } = await api.fetchText(url, { maxAgeHours: 24 });
    const m = /^\s*(?:File\d+=)?(https?:\/\/[^\s"<]+)/im.exec(text) || /<ref[^>]+href="(https?:\/\/[^"]+)"/i.exec(text) || /<location>(https?:\/\/[^<]+)<\/location>/i.exec(text);
    return m ? m[1].trim() : url;
  } catch {
    return url;
  }
}

/** „Előadó – Cím” → { artist, title } (egyéb szövegnél csak cím). */
function splitTitle(t) {
  if (/https?:\/\/|www\./i.test(t)) return { artist: '', title: t }; // (reklám, honlapcím)
  // „Előadó - Cím”; szóközök nélkül csak akkor, ha egyetlen kötőjel van benne (pl. „Punnany Massif-Élvezd”)
  const m = /^(.{1,120}?)\s+[-–—]\s+(.{1,160})$/.exec(t) || /^([^-]{3,120})-([^-]{3,160})$/.exec(t);
  return m ? { artist: m[1].trim(), title: m[2].trim() } : { artist: '', title: t };
}

const coverCache = new Map();
/** Borító a szám alapján (iTunes-kereső; 30 napig a gyorsítótárban). */
async function findCover(artist, title) {
  if (!artist || !title) return '';
  const k = `${artist}|${title}`.toLowerCase();
  if (coverCache.has(k)) return coverCache.get(k);
  let url = '';
  try {
    const { text } = await api.fetchText(`https://itunes.apple.com/search?${new URLSearchParams({ term: `${artist} ${title}`, media: 'music', entity: 'song', limit: '1' })}`, { maxAgeHours: 24 * 30 });
    const r = JSON.parse(text).results?.[0];
    if (r?.artworkUrl100 && /^https:\/\//.test(r.artworkUrl100)) url = r.artworkUrl100.replace(/\/\d+x\d+bb\./, '/600x600bb.');
  } catch {}
  coverCache.set(k, url);
  return url;
}

class RadioPlayer {
  constructor() {
    this.station = null;
    this.list = []; // a lista, amelyből indult (előző / következő adó)
    this.state = 'idle'; // idle | loading | playing | paused | error
    this.error = '';
    this.now = { text: '', artist: '', title: '', cover: '' };
    this.history = []; // [{ t, text, artist, title, cover }]
    this.sleepAt = 0;
    this.els = [new Audio(), new Audio()];
    this.cur = 0;
    for (const a of this.els) {
      a.preload = 'none';
      // CORS-módban töltve a hangfeldolgozás hozzáfér az adáshoz (különben elnémulna)
      if (audioFxAvailable) a.crossOrigin = 'anonymous';
    }
    this.hls = [null, null];
    this.ctx = null;
    this.analyser = null;
    this.seq = 0;
    this.metaTimer = 0;
    this.sleepTimer = 0;
  }

  get el() {
    return this.els[this.cur];
  }
  get active() {
    return !!this.station;
  }
  get playing() {
    return this.state === 'playing' || this.state === 'loading';
  }

  // ------------------------------------------------------------------- hangfeldolgozás
  ensureGraph() {
    if (this.ctx || !audioFxAvailable) return;
    try {
      const c = (this.ctx = new AC());
      this.srcGain = this.els.map((el) => {
        const s = c.createMediaElementSource(el);
        const g = c.createGain();
        g.gain.value = 0;
        s.connect(g);
        return g;
      });
      this.input = c.createGain();
      this.srcGain.forEach((g) => g.connect(this.input));
      this.eq = EQ_BANDS.map((f, i) => {
        const b = c.createBiquadFilter();
        b.type = i === 0 ? 'lowshelf' : i === EQ_BANDS.length - 1 ? 'highshelf' : 'peaking';
        b.frequency.value = f;
        b.Q.value = 1.1;
        return b;
      });
      for (let i = 0; i < this.eq.length - 1; i++) this.eq[i].connect(this.eq[i + 1]);
      // hangerő-kiegyenlítés: kompresszor + utóerősítés (az adók hangereje nagyon eltér)
      this.comp = c.createDynamicsCompressor();
      this.comp.threshold.value = -28;
      this.comp.knee.value = 18;
      this.comp.ratio.value = 6;
      this.comp.attack.value = 0.005;
      this.comp.release.value = 0.3;
      this.makeup = c.createGain();
      this.makeup.gain.value = 1.7;
      this.comp.connect(this.makeup);
      // térhatás: közép / oldal arány (L' = a·L + b·R, R' = b·L + a·R)
      this.split = c.createChannelSplitter(2);
      this.merge = c.createChannelMerger(2);
      this.wide = [0, 1, 2, 3].map(() => c.createGain());
      this.split.connect(this.wide[0], 0);
      this.split.connect(this.wide[1], 1);
      this.split.connect(this.wide[2], 0);
      this.split.connect(this.wide[3], 1);
      this.wide[0].connect(this.merge, 0, 0);
      this.wide[1].connect(this.merge, 0, 0);
      this.wide[2].connect(this.merge, 0, 1);
      this.wide[3].connect(this.merge, 0, 1);
      // retro: középhullámú sávszélesség, enyhe torzítás és halk sercegés
      this.rHp = c.createBiquadFilter();
      this.rHp.type = 'highpass';
      this.rHp.frequency.value = 380;
      this.rLp = c.createBiquadFilter();
      this.rLp.type = 'lowpass';
      this.rLp.frequency.value = 3400;
      this.rShape = c.createWaveShaper();
      const curve = new Float32Array(1024);
      for (let i = 0; i < 1024; i++) {
        const x = (i / 1023) * 2 - 1;
        curve[i] = Math.tanh(2.2 * x) / Math.tanh(2.2);
      }
      this.rShape.curve = curve;
      this.rHp.connect(this.rLp);
      this.rLp.connect(this.rShape);
      const noise = c.createBuffer(1, c.sampleRate * 2, c.sampleRate);
      const d = noise.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (Math.random() < 0.002 ? 1 : 0.25);
      this.noise = c.createBufferSource();
      this.noise.buffer = noise;
      this.noise.loop = true;
      this.noiseGain = c.createGain();
      this.noiseGain.gain.value = 0;
      this.noise.connect(this.noiseGain);
      this.noise.start();
      this.master = c.createGain();
      this.noiseGain.connect(this.master);
      this.analyser = c.createAnalyser();
      this.analyser.fftSize = 2048;
      this.analyser.smoothingTimeConstant = 0.78;
      this.master.connect(this.analyser);
      this.analyser.connect(c.destination);
      this.applyFx();
    } catch (err) {
      console.warn('Rádió: a hangfeldolgozás nem indult', err);
      this.ctx = null;
      this.analyser = null;
    }
  }

  /** A hangzás beállításainak alkalmazása (a lánc újrakötése). */
  applyFx() {
    const f = fx();
    for (const el of this.els) el.volume = audioFxAvailable && this.ctx ? 1 : f.volume;
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.master.gain.setTargetAtTime(f.volume, t, 0.05);
    const gains = (EQ_PRESETS.find(([id]) => id === f.eq) || EQ_PRESETS[0])[2];
    this.eq.forEach((b, i) => b.gain.setTargetAtTime(gains[i], t, 0.05));
    const w = f.widen ? 1.7 : 1;
    const a = 0.5 + 0.5 * w;
    const b = 0.5 - 0.5 * w;
    [a, b, b, a].forEach((v, i) => this.wide[i].gain.setTargetAtTime(v, t, 0.05));
    this.noiseGain.gain.setTargetAtTime(f.retro ? 0.012 : 0, t, 0.05);
    // újrakötés: bemenet → EQ → [kiegyenlítés] → [térhatás] → [retro] → kimenet
    for (const n of [this.input, this.eq[this.eq.length - 1], this.makeup, this.merge, this.rShape]) {
      try {
        n.disconnect();
      } catch {}
    }
    this.input.connect(this.eq[0]);
    let last = this.eq[this.eq.length - 1];
    const link = (from, to, out = to) => (from.connect(to), out);
    if (f.level) last = link(last, this.comp, this.makeup);
    if (f.widen) last = link(last, this.split, this.merge);
    if (f.retro) last = link(last, this.rHp, this.rShape);
    last.connect(this.master);
  }

  // ------------------------------------------------------------------- lejátszás
  /** Adó indítása. list: a lista, amelyből indult (előző / következő). */
  async play(st, list = null) {
    if (!st?.urls?.length) return;
    bus.emit('radio-start'); // (a videólejátszó bezárul – app.js)
    const seq = ++this.seq;
    if (list) this.list = list;
    this.station = st;
    this.state = 'loading';
    this.error = '';
    this.now = { text: '', artist: '', title: '', cover: '' };
    clearInterval(this.metaTimer);
    this.emit();
    this.ensureGraph();
    if (this.ctx?.state === 'suspended') this.ctx.resume().catch(() => {});
    for (const raw of st.urls) {
      if (seq !== this.seq) return;
      const url = await resolveStream(raw);
      if (seq !== this.seq) return;
      const ok = await this.start(url, seq);
      if (seq !== this.seq) return;
      store.setHealth(raw, ok, 'play');
      if (ok) {
        this.url = url;
        this.state = 'playing';
        pushRadioRecent(st);
        reportClick(st);
        api.setPlaying?.(true);
        api.setNowPlaying?.(st.name);
        this.mediaSession();
        this.startMeta();
        this.emit();
        return;
      }
    }
    if (seq !== this.seq) return;
    this.state = 'error';
    this.error = _t('Az adó most nem szól (egyik címe sem indult el).');
    this.emit();
  }

  /** Egy cím indítása a másik audioelemen, átúsztatással. → sikerült-e */
  start(url, seq) {
    return new Promise((resolve) => {
      const next = 1 - this.cur;
      const el = this.els[next];
      const old = this.els[this.cur];
      this.detach(next);
      let done = false;
      const finish = (ok) => {
        if (done) return;
        done = true;
        clearTimeout(timer);
        el.removeEventListener('playing', onOk);
        el.removeEventListener('error', onErr);
        if (!ok || seq !== this.seq) {
          if (seq === this.seq) this.detach(next);
          return resolve(ok && seq === this.seq);
        }
        // átúsztatás: az új felerősödik, a régi elhalkul, majd megáll
        const x = Math.max(0, fx().xfade);
        if (this.ctx) {
          const t = this.ctx.currentTime;
          const gNew = this.srcGain[next].gain;
          const gOld = this.srcGain[this.cur].gain;
          gNew.cancelScheduledValues(t);
          gNew.setValueAtTime(gNew.value, t);
          gNew.linearRampToValueAtTime(1, t + Math.max(0.05, x));
          gOld.cancelScheduledValues(t);
          gOld.setValueAtTime(gOld.value, t);
          gOld.linearRampToValueAtTime(0, t + Math.max(0.05, x));
        }
        const prev = this.cur;
        this.cur = next;
        setTimeout(() => this.cur !== prev && this.detach(prev), x * 1000 + 300);
        if (!this.ctx) this.detach(prev);
        resolve(true);
      };
      const onOk = () => finish(true);
      const onErr = () => finish(false);
      const timer = setTimeout(() => finish(false), START_TIMEOUT);
      el.addEventListener('playing', onOk);
      el.addEventListener('error', onErr);
      if (this.ctx) this.srcGain[next].gain.value = old.paused || !old.src ? 1 : 0;
      if (/\.m3u8(\?|$)/i.test(url) && window.Hls?.isSupported() && !el.canPlayType('application/vnd.apple.mpegurl')) {
        const h = new window.Hls({ lowLatencyMode: false });
        h.on(window.Hls.Events.ERROR, (_e, d) => d.fatal && onErr());
        h.loadSource(url);
        h.attachMedia(el);
        this.hls[next] = h;
      } else el.src = url;
      el.play().catch(() => {});
    });
  }

  detach(i) {
    const el = this.els[i];
    try {
      el.pause();
    } catch {}
    this.hls[i]?.destroy();
    this.hls[i] = null;
    el.removeAttribute('src');
    try {
      el.load();
    } catch {}
    if (this.ctx) this.srcGain[i].gain.value = 0;
  }

  toggle() {
    if (!this.station) return;
    if (this.state === 'playing' || this.state === 'loading') this.pause();
    else this.resume();
  }
  pause() {
    if (!this.station) return;
    ++this.seq; // (a folyamatban lévő indítás érvényét veszti)
    this.detach(0);
    this.detach(1);
    this.state = 'paused';
    clearInterval(this.metaTimer);
    api.setPlaying?.(false);
    this.emit();
  }
  /** Élő adásnál a folytatás = újrakezdés (a szünet alatti rész úgysem hallgatható vissza). */
  resume() {
    if (this.station) this.play(this.station);
  }
  stop() {
    this.pause();
    this.station = null;
    this.state = 'idle';
    this.setSleep(0);
    if ('mediaSession' in navigator) navigator.mediaSession.metadata = null;
    this.emit();
  }
  step(dir) {
    if (!this.station || !this.list.length) return;
    const i = this.list.findIndex((s) => s.id === this.station.id);
    const n = this.list[(i + dir + this.list.length) % this.list.length];
    if (n && n.id !== this.station.id) this.play(n);
  }
  setVolume(v) {
    setFx({ volume: Math.max(0, Math.min(1, v)) });
  }

  /** Elalvás-időzítő: percek múlva (az utolsó 20 mp-ben elhalkulva) megáll; 0 = kikapcsolva. */
  setSleep(min) {
    clearTimeout(this.sleepTimer);
    clearInterval(this.sleepFade);
    this.sleepAt = min > 0 ? Date.now() + min * 60e3 : 0;
    if (!min) return this.emit();
    this.sleepTimer = setTimeout(() => {
      const start = fx().volume;
      let k = 20;
      this.sleepFade = setInterval(() => {
        k--;
        if (this.ctx) this.master.gain.value = (start * k) / 20;
        else this.el.volume = (start * k) / 20;
        if (k <= 0) {
          clearInterval(this.sleepFade);
          this.stop();
          this.applyFx();
        }
      }, 1000);
    }, Math.max(0, min * 60e3 - 20e3));
    this.emit();
  }

  // ------------------------------------------------------------------- most szól
  startMeta() {
    clearInterval(this.metaTimer);
    if (!api.icyTitle) return;
    const seq = this.seq;
    const poll = async () => {
      if (seq !== this.seq || this.state !== 'playing') return;
      let t = '';
      try {
        t = String((await api.icyTitle(this.url, this.station.country)) || '').trim();
      } catch {}
      if (seq !== this.seq || !t || t === this.now.text) return;
      // (a csak az adó nevét vagy szlogenjét ismétlő cím nem szám – nem kerül az előzmények közé)
      const { artist, title } = splitTitle(t);
      const same = t.toLowerCase() === this.station.name.toLowerCase();
      this.now = { text: t, artist, title, cover: '' };
      if (!same && artist) this.history = [{ t: Date.now(), text: t, artist, title, cover: '' }, ...this.history.filter((h) => h.text !== t)].slice(0, 30);
      api.setNowPlaying?.(`${this.station.name} – ${t}`);
      this.mediaSession();
      this.emit('meta');
      const cover = await findCover(artist, title);
      if (seq === this.seq && this.now.text === t && cover) {
        this.now.cover = cover;
        if (this.history[0]?.text === t) this.history[0].cover = cover;
        this.mediaSession();
        this.emit('meta');
      }
    };
    poll();
    this.metaTimer = setInterval(poll, 20000);
  }

  mediaSession() {
    if (!('mediaSession' in navigator) || !window.MediaMetadata || !this.station) return;
    try {
      const art = this.now.cover || this.station.logo;
      navigator.mediaSession.metadata = new MediaMetadata({
        title: this.now.title || this.station.name,
        artist: this.now.artist || this.now.text ? this.now.artist || this.station.name : _t('Rádió'),
        album: this.station.name,
        artwork: art ? [{ src: art, sizes: '512x512' }] : [],
      });
    } catch {}
  }

  emit(kind = 'state') {
    bus.emit('radio-player', kind);
  }
}

export const radioPlayer = new RadioPlayer();

// a videó (élő adás, film) indulásakor a rádió elhallgat
bus.on('video-open', () => radioPlayer.playing && radioPlayer.pause());
// Android: az alkalmazásból kilépve (ha a háttérlejátszás ki van kapcsolva) a rádió is elhallgat
window.__adasRadioPause = () => radioPlayer.playing && radioPlayer.pause();
if ('mediaSession' in navigator) {
  const on = (a, fn) => {
    try {
      navigator.mediaSession.setActionHandler(a, fn);
    } catch {}
  };
  // (a videólejátszó saját kezelőit csak rádiózás közben írjuk felül – a lejátszó bezárásakor visszaállnak)
  bus.on('radio-player', () => {
    if (!radioPlayer.active || document.body.classList.contains('playing')) return;
    on('play', () => radioPlayer.resume());
    on('pause', () => radioPlayer.pause());
    on('previoustrack', () => radioPlayer.step(-1));
    on('nexttrack', () => radioPlayer.step(1));
  });
}

// ---------------------------------------------------------------------------
// Vizualizáció: rajzolás egy vásznon, amíg a vászon a lapon van
// ---------------------------------------------------------------------------
const accent = () => getComputedStyle(document.body).getPropertyValue('--accent').trim() || '#e50914';
/** getMode() → spectrum | wave | mirror | soft | none; mini: kis méret (a mini-lejátszóban) */
export function drawVisualizer(canvas, getMode, { mini = false } = {}) {
  const g = canvas.getContext('2d');
  const freq = new Uint8Array(1024);
  const wave = new Uint8Array(2048);
  let peaks = [];
  let smooth = [];
  let softPeak = 0.25;
  const frame = () => {
    if (!canvas.isConnected) return;
    requestAnimationFrame(frame);
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (!w || !h) return;
    if (canvas.width !== Math.round(w * dpr)) (canvas.width = Math.round(w * dpr)), (canvas.height = Math.round(h * dpr));
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, w, h);
    const an = radioPlayer.analyser;
    const live = an && radioPlayer.state === 'playing';
    if (live) {
      an.getByteFrequencyData(freq);
      an.getByteTimeDomainData(wave);
    } else {
      freq.fill(0);
      wave.fill(128);
    }
    const col = accent();
    g.fillStyle = col;
    g.strokeStyle = col;
    const mode = mini ? 'spectrum' : getMode();
    if (mode === 'none') return;
    if (mode === 'wave') {
      g.lineWidth = 2;
      g.beginPath();
      for (let i = 0; i < w; i++) {
        const v = wave[Math.floor((i / w) * wave.length)] / 128 - 1;
        const y = h / 2 + v * h * 0.45;
        i ? g.lineTo(i, y) : g.moveTo(i, y);
      }
      g.stroke();
      return;
    }
    // a frekvenciasávok értéke (logaritmikus felosztás kb. 11 kHz-ig – sok adó a fölötti részt levágja; 0–1)
    const bands = (n) => {
      const out = new Array(n);
      for (let i = 0; i < n; i++) {
        const lo = Math.floor(Math.pow(i / n, 2) * 520);
        const hi = Math.max(lo + 1, Math.floor(Math.pow((i + 1) / n, 2) * 520));
        let v = 0;
        for (let k = lo; k < hi; k++) v = Math.max(v, freq[k]);
        out[i] = v / 255;
      }
      return out;
    };
    if (mode === 'mirror') {
      // tükör: középről fel és le nyúló, lekerekített sávok – a mélyek középen, a magasak kifelé
      const n = Math.max(24, Math.min(96, Math.floor(w / 9))) & ~1;
      const v = bands(n / 2);
      const gap = 3;
      const bw = (w - gap * (n - 1)) / n;
      const mid = h / 2;
      for (let i = 0; i < n; i++) {
        const k = Math.abs(i - (n / 2 - 0.5)) - 0.5; // (a középtől mért távolság)
        const x = v[Math.min(v.length - 1, Math.round(k))];
        const bh = Math.max(2, x * h * 0.48);
        g.globalAlpha = 0.55 + 0.45 * x;
        const r = Math.min(bw / 2, 4);
        const x0 = i * (bw + gap);
        g.beginPath();
        if (g.roundRect) g.roundRect(x0, mid - bh, bw, bh * 2, r);
        else g.rect(x0, mid - bh, bw, bh * 2);
        g.fill();
      }
      g.globalAlpha = 1;
      return;
    }
    if (mode === 'soft') {
      // hullámhegyek: lágyan ívelt spektrumgörbe színátmenetes kitöltéssel, mögötte egy halványabb visszhang
      const n = 48;
      const v = bands(n);
      smooth = smooth.length === n ? smooth.map((p, i) => p + (v[i] - p) * 0.35) : v;
      // lassan követő erősítés: a görbe a halkabb (magas) sávoknál is kitölti a magasságot
      softPeak = Math.max(0.25, Math.max(...smooth), softPeak * 0.995);
      const ys = (scale) => smooth.map((x) => h - Math.pow(Math.min(1, x / softPeak), 1.1) * h * scale);
      const trace = (y) => {
        g.moveTo(0, y[0]);
        let px = 0;
        let py = y[0];
        for (let i = 1; i < n; i++) {
          const x = (i / (n - 1)) * w;
          g.quadraticCurveTo(px, py, (px + x) / 2, (py + y[i]) / 2);
          px = x;
          py = y[i];
        }
        g.lineTo(w, py);
      };
      const curve = (scale, alpha) => {
        const y = ys(scale);
        g.beginPath();
        trace(y);
        g.lineTo(w, h);
        g.lineTo(0, h);
        g.closePath();
        const grad = g.createLinearGradient(0, 0, 0, h);
        grad.addColorStop(0, col);
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        g.globalAlpha = alpha;
        g.fillStyle = grad;
        g.fill();
        // (csak a görbe kap vonalat – a kitöltés alja és oldala nem)
        g.beginPath();
        trace(y);
        g.globalAlpha = Math.min(1, alpha + 0.3);
        g.lineWidth = 2;
        g.stroke();
      };
      curve(0.6, 0.35);
      curve(0.92, 0.75);
      g.globalAlpha = 1;
      return;
    }
    // spektrum: logaritmikus sávok, csúcsjelzővel
    const n = mini ? 6 : Math.max(16, Math.min(64, Math.floor(w / 12)));
    const gap = mini ? 2 : 3;
    const bw = (w - gap * (n - 1)) / n;
    if (peaks.length !== n) peaks = new Array(n).fill(0);
    for (let i = 0; i < n; i++) {
      const lo = Math.floor(Math.pow(i / n, 1.8) * 700);
      const hi = Math.max(lo + 1, Math.floor(Math.pow((i + 1) / n, 1.8) * 700));
      let v = 0;
      for (let k = lo; k < hi; k++) v = Math.max(v, freq[k]);
      v /= 255;
      const bh = Math.max(mini ? 2 : 3, v * h);
      g.fillRect(i * (bw + gap), h - bh, bw, bh);
      peaks[i] = Math.max(v, peaks[i] - 0.012);
      if (!mini && live) g.fillRect(i * (bw + gap), h - peaks[i] * h - 3, bw, 2);
    }
  };
  requestAnimationFrame(frame);
}
