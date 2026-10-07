// Natív lejátszó (Android: ExoPlayer) a webes felület mögött. A kép a WebView alatt jelenik meg, a lap
// ilyenkor átlátszó; a <video> elem tulajdonságait (currentTime, duration, paused, play()…) erre az
// objektumra irányítjuk, és a szokásos eseményeket (playing, timeupdate, ended…) a videóelemen váltjuk ki
// – így a lejátszó vezérlői, az idősáv, a folytatás és a következő rész változatlanul működnek.
// A felirat (a fájlba ágyazott ASS / SRT is) saját rétegben jelenik meg.
import { store } from './store.js';

const A = () => window.AdasAndroid;
export const exoAvailable = () => {
  try {
    return !!A()?.exoAvailable?.();
  } catch {
    return false;
  }
};

let current = null;
window.__adasExo = (ev) => current?.onEvent(ev);

const PROPS = ['currentTime', 'duration', 'paused', 'ended', 'readyState', 'buffered', 'seekable', 'videoWidth', 'videoHeight', 'volume', 'muted', 'play', 'pause', 'seeking', 'webkitAudioDecodedByteCount', 'webkitVideoDecodedByteCount', 'error'];
const ranges = (end) => ({ length: end > 0 ? 1 : 0, start: () => 0, end: () => end });
const LANG_HU = /^(hu|hun|magyar|hungarian)/i;
const LANG_EN = /^(en|eng|english)/i;

export class ExoEngine {
  constructor(video, stream, { onFail, onTracks, startAt = 0 } = {}) {
    this.video = video;
    this.stream = stream;
    this.opts = { onFail, onTracks, startAt };
    this.st = { pos: startAt, dur: NaN, buf: 0, playing: false, pwr: true, state: 'idle', w: 0, h: 0, vol: 1, muted: false, ended: false, seekingTo: null };
    this.audio = [];
    this.text = [];
    this.metaSent = false;
    this.cueText = '';
  }

  start() {
    current = this;
    const v = this.video;
    const st = this.st;
    const self = this;
    const def = (k, get, set) => Object.defineProperty(v, k, { configurable: true, get, set });
    def('currentTime', () => (st.seekingTo != null ? st.seekingTo : st.pos), (t) => self.seek(t));
    def('duration', () => (st.dur > 0 ? st.dur : NaN));
    def('paused', () => !st.pwr);
    def('ended', () => st.ended);
    def('seeking', () => st.seekingTo != null);
    def('readyState', () => (st.state === 'ready' ? 4 : st.state === 'buffering' ? 2 : 0));
    def('buffered', () => ranges(st.buf));
    def('seekable', () => ranges(st.dur > 0 ? st.dur : 0));
    def('videoWidth', () => st.w);
    def('videoHeight', () => st.h);
    def('volume', () => st.vol, (x) => ((st.vol = x), self.applyVolume()));
    def('muted', () => st.muted, (x) => ((st.muted = !!x), self.applyVolume()));
    def('webkitAudioDecodedByteCount', () => 1e6);
    def('webkitVideoDecodedByteCount', () => 1e6);
    def('error', () => null);
    Object.defineProperty(v, 'play', { configurable: true, value: () => (self.resume(), Promise.resolve()) });
    Object.defineProperty(v, 'pause', { configurable: true, value: () => self.pause() });
    document.documentElement.classList.add('native-video');
    this.subsEl = document.createElement('div');
    this.subsEl.className = 'exo-subs';
    v.parentElement?.appendChild(this.subsEl);

    const p = store.profile;
    A().exoPlay(
      JSON.stringify({
        url: this.stream.url,
        ua: this.stream.ua || '',
        referrer: this.stream.referrer || '',
        start: this.opts.startAt || 0,
        prefAudio: p.prefAudio === 'hu' || p.prefAudio === 'en' ? p.prefAudio : '',
        prefText: p.prefSubs || 'auto',
      })
    );
  }

  emit(type) {
    this.video.dispatchEvent(new Event(type));
  }

  onEvent(ev) {
    const st = this.st;
    if (ev.type === 'time') {
      const wasPlaying = st.playing;
      const wasPwr = st.pwr;
      const durBefore = st.dur;
      st.pos = ev.pos;
      st.buf = ev.buf;
      if (ev.dur > 0) st.dur = ev.dur;
      st.playing = ev.playing;
      st.pwr = ev.pwr;
      if (st.seekingTo != null && Math.abs(ev.pos - st.seekingTo) < 1.5) {
        st.seekingTo = null;
        this.emit('seeked');
      }
      if (st.dur !== durBefore) this.emit('durationchange');
      if (st.playing && !wasPlaying) {
        st.ended = false;
        this.emit('playing');
      }
      if (!st.pwr && wasPwr) this.emit('pause');
      if (st.pwr && !wasPwr) this.emit('play');
      this.emit('timeupdate');
      this.renderJsCues();
    } else if (ev.type === 'state') {
      st.state = ev.state;
      if (ev.state === 'ready' && !this.metaSent) {
        this.metaSent = true;
        this.emit('loadedmetadata');
        this.emit('canplay');
      }
      if (ev.state === 'buffering') this.emit('waiting');
      if (ev.state === 'ended') {
        st.ended = true;
        st.pwr = false;
        this.emit('pause');
        this.emit('ended');
      }
    } else if (ev.type === 'size') {
      st.w = ev.w;
      st.h = ev.h;
      this.emit('resize');
    } else if (ev.type === 'tracks') {
      this.audio = (ev.audio || []).filter((t) => t.ok !== false);
      this.text = ev.text || [];
      this.opts.onTracks?.();
    } else if (ev.type === 'cues') {
      this.cueText = ev.text || '';
      this.renderCues();
    } else if (ev.type === 'error') {
      this.opts.onFail?.(new Error('Natív lejátszó: ' + (ev.message || 'hiba')));
    }
  }

  seek(t) {
    const x = Math.max(0, Number(t) || 0);
    this.st.seekingTo = x;
    this.st.ended = false;
    this.emit('seeking');
    A().exoSeek(x);
  }
  pause() {
    this.st.pwr = false;
    A().exoPause();
    this.emit('pause');
  }
  resume() {
    this.st.pwr = true;
    this.st.ended = false;
    A().exoResume();
    this.emit('play');
  }
  applyVolume() {
    A().exoVolume(this.st.muted ? 0 : this.st.vol);
  }

  // --- feliratok --------------------------------------------------------------------
  /** A fájlba ágyazott felirat (a natív lejátszótól) és a letöltött / saját felirat (a videó sávjairól). */
  renderCues() {
    const js = this.jsCueText || '';
    const text = [this.cueText, js].filter(Boolean).join('\n');
    if (this.subsEl.dataset.t === text) return;
    this.subsEl.dataset.t = text;
    // (replaceChildren nélkül – a régebbi Android TV-k WebView-ja nem ismeri)
    this.subsEl.textContent = '';
    for (const line of text.split('\n').filter(Boolean)) {
      const s = document.createElement('span');
      s.textContent = line.replace(/<[^>]+>/g, '');
      this.subsEl.appendChild(s);
    }
  }
  /** A saját (letöltött) feliratsáv kockái: a videóelem nem játszik, ezért mi számoljuk ki az aktuálisat. */
  renderJsCues() {
    const t = this.st.pos;
    let out = '';
    for (const tr of this.video.textTracks) {
      if (tr.mode !== 'showing' || !tr.cues) continue;
      for (const c of tr.cues) if (c.startTime <= t && c.endTime > t) out += (out ? '\n' : '') + c.text;
    }
    if (out !== (this.jsCueText || '')) {
      this.jsCueText = out;
      this.renderCues();
    }
  }

  // --- sávok (a motor menüjéhez) --------------------------------------------------------
  audioTracks(lab) {
    return this.audio.map((a, i) => ({ index: i, lang: a.lang, label: lab(a.lang, a.label, i) + codecNote(a) }));
  }
  get audioIndex() {
    return this.audio.findIndex((a) => a.sel);
  }
  setAudio(i) {
    const a = this.audio[i];
    if (!a) return;
    this.audio.forEach((x) => (x.sel = x === a));
    A().exoSelect('audio', a.g, a.i);
  }
  textTracks(langName) {
    return this.text.map((t, i) => ({
      id: `exo:${i}`,
      lang: t.lang,
      label: (t.label || langName(t.lang) || `${i + 1}. felirat`) + (t.forced ? ' – kényszerített' : ''),
      default: t.def,
      forced: t.forced,
    }));
  }
  get textId() {
    const i = this.text.findIndex((t) => t.sel);
    return i >= 0 ? `exo:${i}` : '';
  }
  setText(id) {
    const [kind, n] = String(id || '').split(':');
    if (kind !== 'exo') {
      this.text.forEach((t) => (t.sel = false));
      A().exoSelect('text', -1, -1);
      this.cueText = '';
      this.renderCues();
      return;
    }
    const t = this.text[Number(n)];
    if (!t) return;
    this.text.forEach((x) => (x.sel = x === t));
    A().exoSelect('text', t.g, t.i);
  }

  destroy() {
    if (current === this) current = null;
    try {
      A().exoStop();
    } catch {}
    for (const k of PROPS) delete this.video[k];
    this.subsEl?.remove();
    document.documentElement.classList.remove('native-video');
  }
}

function codecNote(a) {
  const m = String(a.mime || '').replace(/^audio\//, '').replace(/^vnd\.dts.*/, 'dts').replace(/^mp4a-latm/, 'aac').replace(/^eac3/, 'e-ac3');
  const ch = a.ch >= 6 ? ` · ${a.ch === 6 ? '5.1' : a.ch === 8 ? '7.1' : a.ch + ' csat.'}` : '';
  return m ? ` (${m.toUpperCase()}${ch})` : '';
}

export const isHuTrack = (t) => LANG_HU.test(t.lang || '') || LANG_HU.test(t.label || '');
export const isEnTrack = (t) => LANG_EN.test(t.lang || '') || LANG_EN.test(t.label || '');
