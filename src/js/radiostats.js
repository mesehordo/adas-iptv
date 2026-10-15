// Rádió – Adás adatai: a tévés lejátszó „Adás adatai” paneljének megfelelője a „Most szól” nézetben.
// Lejátszó, kiszolgáló, forrás, formátum, megadott és mért bitráta, puffer, akadások, kimeneti mintavétel és
// késleltetés, metaadat, hálózat – másodpercenként frissítve, amíg a menü nyitva van.
import { esc, fmtNum } from './util.js';
import { _t } from './i18n.js';
import { radioPlayer, audioFxAvailable } from './radioplayer.js';

const kbit = (bps) => (bps > 0 ? `${_t('{round} kbit/s', { round: Math.round(bps / 1e3) })}` : '–');
const sec = (s) => (Number.isFinite(s) ? `${_t('{toFixed} mp', { toFixed: fmtNum(s, 1) })}` : '–');

// Akadások és a dekódolt bájtokból mért bitráta (a panel nyitásától számítva)
let stalls = { n: 0, ms: 0, since: 0 };
let meter = null; // { bytes, t, bps }
const onWaiting = () => {
  if (!stalls.since) (stalls.n++, (stalls.since = performance.now()));
};
const onPlaying = () => {
  if (stalls.since) (stalls.ms += performance.now() - stalls.since), (stalls.since = 0);
};
let bound = false;

/** A mérés indítása (a menü nyitásakor). */
export function startRadioStats() {
  stalls = { n: 0, ms: 0, since: 0 };
  meter = null;
  if (bound) return;
  bound = true;
  for (const el of radioPlayer.els) {
    el.addEventListener('waiting', onWaiting);
    el.addEventListener('playing', onPlaying);
  }
}
/** A mérés leállítása (a menü bezárásakor). */
export function stopRadioStats() {
  if (!bound) return;
  bound = false;
  for (const el of radioPlayer.els) {
    el.removeEventListener('waiting', onWaiting);
    el.removeEventListener('playing', onPlaying);
  }
}

/** A panel tartalma (a menü törzse): `<dl>` sorok és szükség esetén tanács. */
export function radioStatsHtml() {
  const r = radioPlayer;
  const st = r.station;
  if (!st) return '';
  const el = r.el;
  const hls = r.hls?.[r.cur];
  const rows = [];
  const add = (k, v, warn = false) => v !== undefined && v !== null && v !== '' && rows.push(`<dt>${esc(k)}</dt><dd${warn ? ' class="warn"' : ''}>${v}</dd>`);
  // (csak az ennél az adónál sikeresen elindult cím – egy korábbi adóé nem látszhat az újnál)
  const confirmed = r.rawUrl && st.urls.includes(r.rawUrl) ? r.url : '';
  let host = '';
  try {
    const u = new URL(confirmed);
    host = `${u.protocol === 'https:' ? '🔒 ' : ''}${u.host}`;
  } catch {}
  add(_t('Lejátszó'), esc(hls ? 'hls.js (HLS)' : _t('Beépített hanglejátszó')));
  add(_t('Kiszolgáló'), esc(host || '–'));
  const idx = confirmed ? st.urls.indexOf(r.rawUrl) : -1;
  if (confirmed && (st.urls.length > 1 || r.rawUrl !== r.url))
    add(_t('Forrás'), esc([`${idx + 1} / ${st.urls.length}`, r.rawUrl !== r.url ? _t('lejátszólistából feloldva') : ''].filter(Boolean).join(' · ')));
  // formátum: a HLS-szint, ill. az adatbázis szerinti kodek és bitráta
  const lvl = hls?.levels?.[hls.currentLevel >= 0 ? hls.currentLevel : hls.loadLevel];
  const codec = lvl?.audioCodec || st.codec || '';
  add(_t('Formátum'), esc(codec || '–'));
  const declared = lvl?.bitrate || (st.bitrate ? st.bitrate * 1000 : 0);
  add(_t('Bitráta (megadott)'), kbit(declared));
  // mért bitráta: a dekódolt bájtok növekedéséből (Chromium), legalább 3 mp mérés után
  const bytes = el.webkitAudioDecodedByteCount;
  const now = performance.now();
  if (Number.isFinite(bytes) && r.state === 'playing') {
    if (!meter || bytes < meter.bytes) meter = { bytes, t: now, bps: 0 };
    else if (now - meter.t >= 3000) meter = { bytes, t: now, bps: ((bytes - meter.bytes) * 8 * 1000) / (now - meter.t) };
    add(_t('Bitráta (mért)'), meter.bps ? kbit(meter.bps) : _t('mérés…'));
  }
  // puffer: a lejátszási pozíciót tartalmazó tartomány
  const b = el.buffered;
  const t = el.currentTime;
  let ahead = 0;
  for (let i = 0; i < b.length; i++) if (b.start(i) <= t + 0.1 && b.end(i) >= t) ahead = b.end(i) - t;
  add(_t('Puffer (előre)'), sec(ahead), ahead < 1.5 && r.state === 'playing');
  const stallMs = stalls.ms + (stalls.since ? performance.now() - stalls.since : 0);
  add(_t('Akadás (a panel nyitása óta)'), `${_t('{n} alkalom · {sec}', { n: stalls.n, sec: sec(stallMs / 1000) })}`, stalls.n > 0);
  // kimenet: a hangfeldolgozás mintavétele és késleltetése
  if (r.ctx) {
    add(_t('Kimenet'), esc(`${fmtNum(r.ctx.sampleRate / 1000, 1)} kHz`));
    const lat = (r.ctx.baseLatency || 0) + (r.ctx.outputLatency || 0);
    if (lat > 0) add(_t('Hangkimenet késése'), esc(`${Math.round(lat * 1000)} ms`));
  }
  add(_t('Hangfeldolgozás'), audioFxAvailable ? (r.ctx ? _t('bekapcsolva') : _t('nincs elindítva')) : _t('ezen az eszközön nem érhető el'));
  add(_t('Mi szól (metaadat)'), r.now?.text ? _t('az adó küldi') : _t('az adó nem küldi'));
  const c = navigator.connection;
  if (c) {
    const type = { wifi: 'Wi-Fi', ethernet: _t('vezetékes'), cellular: 'mobilnet', none: _t('nincs kapcsolat') }[c.type] || '';
    const dl = c.downlink ? (c.downlink >= 10 ? '10+ Mbit/s' : `${_t('~{downlink} Mbit/s', { downlink: c.downlink })}`) : '';
    add(_t('Hálózat (rendszerbecslés)'), [type, dl, Number.isFinite(c.rtt) && c.rtt ? `${_t('{rtt} ms válaszidő', { rtt: c.rtt })}` : ''].filter(Boolean).join(' · ') || '–');
  }
  let hint = '';
  if (navigator.onLine === false) hint = _t('Nincs internetkapcsolat – a lejátszás folytatódik, amint visszatér.');
  else if (stalls.n >= 3) hint = _t('Gyakori akadás: a szerver vagy a kapcsolat lassú.');
  else if (meter?.bps && declared && meter.bps < declared * 0.8) hint = _t('A mért bitráta jóval kisebb a megadottnál – az adó kisebb minőségben sugároz, vagy a kapcsolat lassú.');
  return `<dl class="rf-stats">${rows.join('')}</dl>${hint ? `<p class="ps-hint">${esc(hint)}</p>` : ''}`;
}
