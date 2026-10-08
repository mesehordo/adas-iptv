// Adás adatai: élő panel a lejátszó fölött – felbontás, képkocka, kodekek, bitráta, mért sávszélesség,
// puffer, késés az élőtől, eldobott képkockák, akadások, lejátszómotor, kiszolgáló és a hálózati kapcsolat.
// A lejátszó „Minőség és forrás” menüjéből vagy a D billentyűvel kapcsolható.
import { esc } from './util.js';

const ENGINE = { hls: 'hls.js (HLS)', native: 'Beépített lejátszó', mpegts: 'mpegts.js (MPEG-TS / FLV)', dash: 'dash.js (DASH)', bridge: 'Lejátszási híd (FFmpeg)', exo: 'Natív lejátszó (ExoPlayer)' };
const mbit = (bps) => (bps > 0 ? (bps >= 1e6 ? `${(bps / 1e6).toFixed(1)} Mbit/s` : `${Math.round(bps / 1e3)} kbit/s`) : '–');
const sec = (s) => (Number.isFinite(s) ? `${s.toFixed(1)} mp` : '–');

let timer = null;
let box = null;
let stalls = { n: 0, ms: 0, since: 0 };
let bound = null;

/** A panel be- / kikapcsolása. player: a lejátszó objektum, root: a lejátszó gyökéreleme, video: a videóelem */
export function toggleStreamInfo(player, root, video, force) {
  const on = force ?? !box;
  if (!on) return stopStreamInfo(video);
  if (box) return;
  box = document.createElement('div');
  box.className = 'p-stats';
  box.setAttribute('aria-label', 'Adás adatai');
  // (a másodpercenként frissülő mérőlista nem élő régió; csak a figyelmeztetés az, és csak ha változik)
  box.innerHTML = '<div class="ps-head"><b>Adás adatai</b><button class="ps-close" aria-label="Bezárás" title="Bezárás (D)">✕</button></div><dl></dl><p class="ps-hint" role="status" aria-live="polite"></p>';
  box.querySelector('.ps-close').onclick = () => stopStreamInfo(video);
  root.append(box);
  stalls = { n: 0, ms: 0, since: 0 };
  bound = {
    waiting: () => {
      if (!stalls.since) (stalls.n++, (stalls.since = performance.now()));
    },
    playing: () => {
      if (stalls.since) (stalls.ms += performance.now() - stalls.since), (stalls.since = 0);
    },
  };
  video.addEventListener('waiting', bound.waiting);
  video.addEventListener('playing', bound.playing);
  const draw = () => render(player, video);
  draw();
  timer = setInterval(draw, 1000);
}

/** A panel bezárása és a figyelők leválasztása. */
export function stopStreamInfo(video) {
  clearInterval(timer);
  timer = null;
  box?.remove();
  box = null;
  if (bound && video) {
    video.removeEventListener('waiting', bound.waiting);
    video.removeEventListener('playing', bound.playing);
  }
  bound = null;
}

/** Nyitva van-e a panel. */
export const streamInfoOpen = () => !!box;

/** A mért adatok kirajzolása (másodpercenként). */
function render(player, video) {
  if (!box) return;
  const e = player.engine;
  const rows = [];
  const add = (k, v, warn = false) => v !== undefined && v !== null && v !== '' && rows.push(`<dt>${k}</dt><dd${warn ? ' class="warn"' : ''}>${v}</dd>`);
  const url = player.stream?.url || '';
  let host = '';
  try {
    const u = new URL(url);
    host = `${u.protocol === 'https:' ? '🔒 ' : ''}${u.host}`;
  } catch {}
  add('Lejátszó', esc(ENGINE[e?.type] || e?.type || '–'));
  add('Kiszolgáló', esc(host || '–'));
  // Kép
  const w = video.videoWidth;
  const h = video.videoHeight;
  const q = video.getVideoPlaybackQuality?.();
  const hls = e?.hls;
  const lvl = hls && hls.levels?.[hls.currentLevel >= 0 ? hls.currentLevel : hls.loadLevel];
  const fps = lvl?.frameRate || lvl?.attrs?.['FRAME-RATE'];
  add('Felbontás', w ? `${w}×${h}${h >= 2000 ? ' (4K)' : h >= 1000 ? ' (Full HD)' : h >= 700 ? ' (HD)' : ' (SD)'}${fps ? ` · ${Math.round(fps)} kép/mp` : ''}` : '–');
  const codecs = [lvl?.videoCodec, lvl?.audioCodec].filter(Boolean).join(', ');
  add('Kodekek', esc(codecs));
  // Bitráta: a kiválasztott minőségi szint (HLS / DASH), vagy a letöltött adatból becsülve
  let bitrate = lvl?.bitrate || 0;
  if (!bitrate && e?.dash) {
    try {
      const qi = e.dash.getQualityFor?.('video');
      bitrate = e.dash.getBitrateInfoListFor?.('video')?.[qi]?.bitrate || 0;
    } catch {}
  }
  if (!bitrate && e?.fragBitrate) bitrate = e.fragBitrate; // a letöltött szegmensekből mérve
  add('Bitráta', bitrate ? mbit(bitrate) + (lvl?.bitrate ? '' : ' (mért)') : '–');
  if (hls?.levels?.length > 1) add('Minőségi szint', `${(hls.currentLevel >= 0 ? hls.currentLevel : hls.loadLevel) + 1} / ${hls.levels.length}${hls.autoLevelEnabled ? ' (automatikus)' : ''}`);
  // Hálózat
  let bw = hls?.bandwidthEstimate || 0;
  if (!bw && e?.mpegts) bw = (e.mpegts.statisticsInfo?.speed || 0) * 8 * 1024; // kB/s → bit/s
  if (!bw && e?.dash) {
    try {
      bw = (e.dash.getAverageThroughput?.('video') || 0) * 1000;
    } catch {}
  }
  const ratio = bw && bitrate ? bw / bitrate : 0;
  add('Mért letöltési sebesség', bw ? `${mbit(bw)}${ratio ? ` · a bitráta ${ratio.toFixed(1)}×-a` : ''}` : '–', ratio > 0 && ratio < 1.3);
  // A forrás vizsgálata (hálózatfigyelő): válaszidő és hogy a szegmensek valós időnél gyorsabban jönnek-e
  const net = e?.net;
  if (net?.samples) {
    if (net.ttfb) add('A forrás válaszideje', `${Math.round(net.ttfb)} ms`, net.ttfb > 1500);
    if (net.ratio) add('Szegmens letöltése', `a hossza ${Math.round(net.ratio * 100)}%-a alatt${net.ratio > 0.75 ? ' (alig valós idejű)' : ''}`, net.ratio > 0.75);
  }
  // a lejátszási pozíciót tartalmazó pufferelt tartomány (tekerés után a többi tartomány nem számít)
  const b = video.buffered;
  const t = video.currentTime;
  let ahead = 0;
  for (let i = 0; i < b.length; i++) if (b.start(i) <= t + 0.1 && b.end(i) >= t) ahead = b.end(i) - t;
  add('Puffer (előre)', sec(ahead), ahead < 3 && !video.paused);
  if (hls && Number.isFinite(hls.latency) && hls.latency > 0) add('Késés az élő adástól', sec(hls.latency));
  if (q) add('Eldobott képkockák', `${q.droppedVideoFrames} / ${q.totalVideoFrames}${q.totalVideoFrames ? ` (${((q.droppedVideoFrames / q.totalVideoFrames) * 100).toFixed(1)}%)` : ''}`, q.totalVideoFrames > 100 && q.droppedVideoFrames / q.totalVideoFrames > 0.05);
  const stallMs = stalls.ms + (stalls.since ? performance.now() - stalls.since : 0);
  add('Akadás (a panel nyitása óta)', `${stalls.n} alkalom · ${sec(stallMs / 1000)}`, stalls.n > 0);
  // Kapcsolat (amennyit a rendszer elárul)
  // (az effectiveType „4g” csak sebességkategória, nem mobilnet – ezért nem írjuk ki; a downlink-et a
  // böngésző legfeljebb 10 Mbit/s-ig becsüli)
  const c = navigator.connection;
  if (c) {
    const type = { wifi: 'Wi-Fi', ethernet: 'vezetékes', cellular: 'mobilnet', none: 'nincs kapcsolat' }[c.type] || '';
    const dl = c.downlink ? (c.downlink >= 10 ? '10+ Mbit/s' : `~${c.downlink} Mbit/s`) : '';
    add('Hálózat (rendszerbecslés)', [type, dl, Number.isFinite(c.rtt) && c.rtt ? `${c.rtt} ms válaszidő` : ''].filter(Boolean).join(' · ') || '–');
  }
  // Értékelés: miért akadhat?
  let hint = '';
  const diag = net?.diagnose(bitrate);
  if (diag?.kind === 'offline') hint = 'Nincs internetkapcsolat – a lejátszás folytatódik, amint visszatér.';
  else if (diag?.kind === 'slow-net') hint = `${diag.text} Válassz kisebb minőséget (⚙ → Minőség), vagy állíts be legnagyobb minőséget a Beállításokban.`;
  else if (diag?.kind === 'slow-source') hint = `${diag.text} A te kapcsolatod nem tehet róla – próbáld másik forrással (⚙ → Forrás), ha van.`;
  else if (ratio > 0 && ratio < 1.2) hint = 'A letöltés alig gyorsabb a lejátszásnál – a szerver vagy a kapcsolat lassú. Válassz kisebb minőséget vagy másik forrást (Minőség és forrás).';
  else if (q && q.totalVideoFrames > 300 && q.droppedVideoFrames / q.totalVideoFrames > 0.05) hint = 'Sok eldobott képkocka: az eszköz nem bírja a dekódolást – kisebb minőség segíthet.';
  else if (stalls.n >= 3) hint = 'Gyakori akadás: próbáld másik forrással, vagy kisebb minőségben.';
  box.querySelector('dl').innerHTML = rows.join('');
  const hintEl = box.querySelector('p.ps-hint');
  const txt = hint ? '⚠ ' + hint : '';
  if (hintEl.textContent !== txt) hintEl.textContent = txt;
}
