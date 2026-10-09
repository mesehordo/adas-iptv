// Lejátszási híd – felületi oldal (asztali változat). A főfolyamat FFmpeg-gel alakítja át a fájlt
// töredékes MP4-re (a kép többnyire érintetlen, a hang AAC), ezt itt MediaSource-szal játsszuk le,
// a beágyazott feliratokat pedig saját feliratsávokba tesszük. Tekeréskor a híd az új helyről indul.
import { api } from './api.js';
import { store } from './store.js';

import { _t, lang as uiLang } from './i18n.js';
import { langMatcher } from './langs.js';
const AUDIO_OK = new Set(['aac', 'mp3', 'opus', 'vorbis', 'flac']);
const AHEAD_SEC = 90; // ennyit töltünk előre (a többit az FFmpeg a hálózat terhelése nélkül kivárja)
const BEHIND_SEC = 60; // ennyi marad meg a lejátszott részből (gyors visszatekeréshez)

// a felület nyelvének felismerője (az „auto” felirat ehhez igazodik: idegen hangnál ezen a nyelven)
const isUi = langMatcher(uiLang);

const mse = (type) => {
  try {
    return window.MediaSource?.isTypeSupported(type);
  } catch {
    return false;
  }
};

/** Videókodek → MSE-típus (kódolás nélkül átvehető?) */
function videoPlan(v) {
  if (!v) return { vcopy: true, mime: '' };
  const c = v.codec;
  if (c === 'h264') {
    const prof = /high/i.test(v.profile) ? '640029' : /main/i.test(v.profile) ? '4d401f' : '42e01e';
    // 10 bites H.264 („High 10”) a böngészőben nem játszható – átalakítjuk.
    if (!/10/.test(v.profile) && !/10le|p010/.test(v.pix)) return { vcopy: true, mime: `avc1.${prof}` };
  }
  if (c === 'hevc' && mse('video/mp4; codecs="hvc1.1.6.L120.90"')) return { vcopy: true, hevc: true, mime: 'hvc1.1.6.L120.90' };
  if (c === 'vp9' && mse('video/mp4; codecs="vp09.00.40.08"')) return { vcopy: true, mime: 'vp09.00.40.08' };
  if (c === 'av1' && mse('video/mp4; codecs="av01.0.08M.08"')) return { vcopy: true, mime: 'av01.0.08M.08' };
  return { vcopy: false, mime: 'avc1.640029' };
}

/**
 * Kell-e a híd ehhez a fájlhoz? (az FFmpeg elemzése alapján) → az ok szövege, vagy '' (natív lejátszás).
 */
export function bridgeReason(info, url) {
  if (!info || info.error || !api.mediaStart) return '';
  const v = info.video[0];
  if (v && !videoPlan(v).vcopy) return `${_t('videó: {codec}', { codec: v.codec })}`;
  const badAudio = info.audio.find((a) => !AUDIO_OK.has(a.codec));
  if (badAudio) return `${_t('hang: {codec}', { codec: badAudio.codec })}`;
  if (info.subs.some((s) => s.text)) return _t('beágyazott felirat');
  // MKV-ben több hangsáv: a böngésző nem mindig váltja őket
  if (info.audio.length > 1 && /\.mkv(\?|$)/i.test(url)) return _t('több hangsáv');
  // A böngésző az MKV-ből csak H.264 / VP8 / VP9 / AV1 képet tud; MPEG-TS (pl. a saját felvételek) tárolót egyáltalán nem
  if (/\.(avi|wmv|flv|mov|ts|m2ts|mts|vob|rmvb?|3gp)(\?|$)/i.test(url)) return _t('tároló');
  return '';
}

// A főfolyamat feliratrészletei a folyam azonosítója szerint
const byId = new Map();
api.onMediaSubs?.(({ id, k, text }) => byId.get(id)?.onSubs(k, text));
api.onMediaEnd?.(({ id, error }) => byId.get(id)?.onEnd(id, error));
// A folyam nullpontja (az első kocka eredeti ideje) – előbb érkezhet, mint ahogy a felület bejegyzi a folyamot
const t0s = new Map();
api.onMediaT0?.(({ id, t0 }) => {
  t0s.set(id, t0);
  byId.get(id)?.t0Wait?.();
});

const toSec = (s) => {
  const p = s.trim().split(':').map(Number);
  return p.length === 3 ? p[0] * 3600 + p[1] * 60 + p[2] : p[0] * 60 + p[1];
};

export class MediaBridge {
  /** info: a media-probe eredménye; opts: { onFail, onTracks, startAt } */
  constructor(video, url, info, opts = {}) {
    this.video = video;
    this.url = url;
    this.info = info;
    this.opts = opts;
    this.gen = 0;
    this.sid = null;
    this.vp = videoPlan(info.video[0]);
    this.audio = info.audio;
    this.subs = info.subs.filter((s) => s.text);
    this.audioRel = this.pickAudio();
    this.tracks = []; // <track> elemek a beágyazott feliratokhoz
    this.subBuf = [];
    this.seen = [];
    this.ended = false;
    this.onSeeking = () => this.seeked();
    video.addEventListener('seeking', this.onSeeking);
  }

  /** Kezdő hangsáv: a profil kedvenc nyelve, különben a fájl alapértelmezése. */
  pickAudio() {
    if (!this.audio.length) return -1;
    const m = langMatcher(store.profile.prefAudio);
    const a = (m && this.audio.find((x) => m(x.lang) || m(x.title))) || this.audio.find((x) => x.default) || this.audio[0];
    return a.rel;
  }

  get mime() {
    const codecs = [this.vp.mime, this.audio.length ? 'mp4a.40.2' : ''].filter(Boolean).join(',');
    return `video/mp4; codecs="${codecs}"`;
  }

  /** Indulás: MediaSource felépítése, feliratsávok, majd az első folyam. */
  async open() {
    if (!mse(this.mime)) throw new Error(`${_t('A böngésző nem támogatja:')} ` + this.mime);
    const ms = new MediaSource();
    this.ms = ms;
    this.objUrl = URL.createObjectURL(ms);
    this.video.src = this.objUrl;
    await new Promise((r) => ms.addEventListener('sourceopen', r, { once: true }));
    if (this.info.duration > 0) ms.duration = this.info.duration;
    this.sb = ms.addSourceBuffer(this.mime);
    this.sb.mode = 'segments';
    // Beágyazott feliratok: saját sávok (a lejátszó feliratmenüje a videó sávjait listázza)
    this.subs.forEach((s, k) => {
      const el = document.createElement('track');
      el.kind = 'subtitles';
      el.label = s.title || '';
      el.srclang = s.lang || '';
      el.dataset.bridge = '1';
      this.video.append(el);
      el.track.mode = 'hidden';
      el.track.__adasDefault = s.default;
      el.track.__adasForced = s.forced;
      this.tracks[k] = el;
      this.subBuf[k] = '';
      this.seen[k] = new Set();
    });
    // Kezdő felirat a profil beállítása szerint ('auto': a fájl kényszerített / alapértelmezett felirata)
    const pref = store.profile.prefSubs || 'auto';
    const m = langMatcher(pref);
    const forced = this.subs.findIndex((s) => s.forced);
    // ('auto' és nincs jelölés: ha a hang nem a felület nyelvén szól, a felület nyelvű felirat – pl. rajongói feliratos kiadás)
    const curAudio = this.audio.find((a) => a.rel === this.audioRel);
    const uiSub = isUi(curAudio?.lang) || isUi(curAudio?.title) ? -1 : this.subs.findIndex((s) => isUi(s.lang) || isUi(s.title));
    const auto = forced >= 0 ? forced : this.subs.findIndex((s) => s.default) >= 0 ? this.subs.findIndex((s) => s.default) : uiSub;
    const pick = m ? this.subs.findIndex((s) => m(s.lang) || m(s.title)) : pref === 'auto' ? auto : -1;
    if (pick >= 0) this.tracks[pick].track.mode = 'showing';
    this.run(this.opts.startAt || 0);
  }

  bufferedAhead() {
    const v = this.video;
    const b = this.sb?.buffered;
    if (!b) return 0;
    for (let i = 0; i < b.length; i++) if (b.start(i) <= v.currentTime + 0.5 && b.end(i) >= v.currentTime) return b.end(i) - v.currentTime;
    return 0;
  }

  inBuffer(t) {
    const b = this.sb?.buffered;
    if (!b) return false;
    for (let i = 0; i < b.length; i++) if (b.start(i) <= t + 0.3 && b.end(i) > t + 1) return true;
    return false;
  }

  idle() {
    return new Promise((r) => {
      if (!this.sb?.updating) return r();
      this.sb.addEventListener('updateend', () => r(), { once: true });
    });
  }

  async append(buf, gen) {
    for (let attempt = 0; attempt < 3; attempt++) {
      await this.idle();
      if (gen !== this.gen) return;
      try {
        this.sb.appendBuffer(buf);
        await this.idle();
        return;
      } catch (err) {
        if (err.name !== 'QuotaExceededError') throw err;
        // Megtelt a puffer: a már lejátszott részt eldobjuk
        const cut = this.video.currentTime - 10;
        if (cut > 0) {
          this.sb.remove(0, cut);
          await this.idle();
        } else await new Promise((r) => setTimeout(r, 1000));
      }
    }
  }

  /** Egy folyam letöltése a megadott időponttól. */
  async run(t) {
    const gen = ++this.gen;
    this.stopStream();
    this.ended = false;
    let s;
    try {
      s = await api.mediaStart({
        url: this.url,
        ss: t,
        video: 0,
        audio: this.audioRel,
        vcopy: this.vp.vcopy,
        hevc: !!this.vp.hevc,
        // MPEG-TS-ben (pl. a saját felvételek) az AAC ADTS-formájú: átvéve a töredékes MP4 hangfejléce
        // üres maradna, és a böngésző elutasítaná – ott a hangot újrakódoljuk (gyors, a kép érintetlen).
        acopy: this.audio.find((a) => a.rel === this.audioRel)?.codec === 'aac' && !/\.(ts|m2ts|mts)(\?|$)/i.test(this.url),
        subs: this.subs.map((x) => x.rel),
        hasVideo: !!this.info.video.length,
      });
    } catch (err) {
      return this.opts.onFail?.(err);
    }
    if (gen !== this.gen) return api.mediaStop(s.id);
    this.sid = s.id;
    byId.set(s.id, this);
    const ac = new AbortController();
    this.ac = ac;
    try {
      const res = await fetch(s.url, { signal: ac.signal });
      const reader = res.body.getReader();
      // Az MP4 nulláról indul: az új adatot a folyam nullpontjával toljuk a film idejébe.
      const t0 = await new Promise((resolve) => {
        if (t0s.has(s.id)) return resolve(t0s.get(s.id));
        const timer = setTimeout(() => resolve(t), 6000);
        this.t0Wait = () => {
          clearTimeout(timer);
          resolve(t0s.get(s.id));
        };
      });
      this.t0Wait = null;
      t0s.delete(s.id);
      if (gen !== this.gen) return;
      await this.idle();
      this.sb.timestampOffset = t0;
      let pending = [];
      let size = 0;
      let first = true;
      const flush = async () => {
        if (!pending.length) return;
        const buf = pending.length === 1 ? pending[0] : new Uint8Array(size);
        if (pending.length > 1) {
          let o = 0;
          for (const p of pending) buf.set(p, o), (o += p.length);
        }
        pending = [];
        size = 0;
        await this.append(buf, gen);
        // Ha a fájl ideje nem nulláról indul (MPEG-TS, pl. a saját felvételek: ~1,4 mp), az első adat
        // előtti rést átugorjuk – különben a lejátszó a semmire várna.
        if (first && gen === this.gen && this.sb.buffered.length) {
          first = false;
          const st = this.sb.buffered.start(0);
          const ct = this.video.currentTime;
          if (ct < st && st - ct < 20) this.video.currentTime = st + 0.01;
        }
      };
      for (;;) {
        // Elég van előre: várunk (az FFmpeg a csővezeték miatt addig nem olvas tovább a hálózatról)
        while (gen === this.gen && this.bufferedAhead() > AHEAD_SEC) {
          await flush();
          this.trimBehind();
          await new Promise((r) => setTimeout(r, 700));
        }
        if (gen !== this.gen) return;
        const { done, value } = await reader.read();
        if (gen !== this.gen) return;
        if (done) break;
        pending.push(value);
        size += value.length;
        if (size > 256 * 1024 || !this.sb.updating) await flush();
      }
      await flush();
      if (gen !== this.gen) return;
      this.ended = true;
      await this.idle();
      if (gen === this.gen && this.ms.readyState === 'open') {
        try {
          this.ms.endOfStream();
        } catch {}
      }
    } catch (err) {
      if (gen !== this.gen || err.name === 'AbortError') return;
      this.opts.onFail?.(err);
    }
  }

  trimBehind() {
    const cut = this.video.currentTime - BEHIND_SEC;
    if (cut > 1 && this.sb && !this.sb.updating && this.sb.buffered.length && this.sb.buffered.start(0) < cut) {
      try {
        this.sb.remove(0, cut);
      } catch {}
    }
  }

  /** Tekerés: ha a cél nincs a pufferben, onnan új folyam indul. */
  seeked() {
    clearTimeout(this.seekTimer);
    this.seekTimer = setTimeout(async () => {
      const t = this.video.currentTime;
      if (this.inBuffer(t)) return;
      await this.restart(t);
    }, 200);
  }

  async restart(t) {
    const gen = ++this.gen;
    this.stopStream();
    await this.idle();
    if (gen !== this.gen) return;
    try {
      // a félbemaradt töredék eldobása (az új folyam saját fejléccel indul); a már lezárt
      // (endOfStream) forrásnál az abort hibát dobna – ott a remove nyitja újra
      if (this.ms.readyState === 'open') this.sb.abort();
    } catch {}
    try {
      if (this.sb.buffered.length) {
        this.sb.remove(0, Infinity);
        await this.idle();
      }
    } catch {}
    if (gen !== this.gen) return;
    this.gen--; // a run() ugyanezt a sorszámot kapja
    this.run(t);
  }

  stopStream() {
    try {
      this.ac?.abort();
    } catch {}
    if (this.sid) {
      api.mediaStop(this.sid);
      byId.delete(this.sid);
      this.sid = null;
    }
  }

  // --- Feliratok (WebVTT részletek a főfolyamatból) ---------------------------------
  onSubs(k, text) {
    const track = this.tracks[k]?.track;
    if (!track) return;
    this.subBuf[k] += text.replace(/\r/g, '');
    const parts = this.subBuf[k].split(/\n\n+/);
    this.subBuf[k] = parts.pop();
    for (const block of parts) {
      const lines = block.split('\n');
      const i = lines.findIndex((l) => l.includes('-->'));
      if (i < 0) continue;
      const m = /([\d:.]+)\s+-->\s+([\d:.]+)/.exec(lines[i]);
      if (!m) continue;
      const body = lines.slice(i + 1).join('\n').trim();
      if (!body) continue;
      const start = toSec(m[1]);
      const end = toSec(m[2]);
      const key = start.toFixed(2) + '|' + body;
      if (this.seen[k].has(key)) continue; // tekerés után ugyanaz a rész újra jöhet
      this.seen[k].add(key);
      try {
        track.addCue(new VTTCue(start, end, body));
      } catch {}
    }
  }

  onEnd(id, error) {
    if (id !== this.sid || !error) return;
    // Az FFmpeg hibával állt le (pl. a tárhely elutasította): ha még semmit nem játszottunk le, hiba
    if (!this.video.currentTime && !this.sb?.buffered.length) this.opts.onFail?.(new Error(error));
  }

  // --- Hangsávok -------------------------------------------------------------------
  setAudio(rel) {
    if (rel === this.audioRel) return;
    this.audioRel = rel;
    this.restart(this.video.currentTime);
  }

  destroy() {
    this.gen++;
    clearTimeout(this.seekTimer);
    this.stopStream();
    this.video.removeEventListener('seeking', this.onSeeking);
    for (const el of this.tracks) el?.remove();
    this.tracks = [];
    if (this.objUrl) URL.revokeObjectURL(this.objUrl);
  }
}

// --- Fájlelemzés gyorsítótárral ------------------------------------------------------
const probes = new Map();
/** Egy cím elemzésének elfelejtése (pl. a felvétel vágása után más a hossza). */
export const forgetProbe = (url) => probes.delete(url);
export function probeMedia(url) {
  if (!api.mediaProbe) return Promise.resolve(null);
  if (!probes.has(url)) {
    const p = Promise.race([api.mediaProbe(url), new Promise((r) => setTimeout(() => r({ error: _t('időtúllépés') }), 15000))]).catch((e) => ({ error: String(e) }));
    probes.set(url, p);
    // A hibát (pl. átmeneti hálózati gond) nem jegyezzük meg – legközelebb újra megpróbáljuk.
    p.then((r) => r?.error && probes.delete(url));
  }
  return probes.get(url);
}
