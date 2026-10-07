// Éjszakai hang: a hangos részek (zene, robbanások, reklámok) letompítása, a halk párbeszéd
// kiemelése – dinamikakompresszor és egy enyhe beszédsáv-kiemelés a WebAudio-val.
//
// Csak az asztali változatban: a böngészőben és a tévén a más címről érkező (nem MSE-s) videó
// hangja a WebAudio-n át elnémulna, és az egyszer átirányított hang nem vihető vissza.
import { api } from './api.js';

let ctx = null;
let src = null;
let comp = null;
let eq = null;
let gain = null;
let on = false;

export const nightAvailable = () => !!api.caps?.nightAudio && !!(window.AudioContext || window.webkitAudioContext);

// A más címről érkező (nem MSE-s, pl. MP4) videó hangja a WebAudio-ban csak akkor nem némul el,
// ha CORS-módban töltődik. Az asztali változatban a CORS-ellenőrzés ki van kapcsolva, így ez
// minden szervernél működik.
if (nightAvailable()) document.getElementById('video')?.setAttribute('crossorigin', 'anonymous');
export const nightOn = () => on;

function build(video) {
  const AC = window.AudioContext || window.webkitAudioContext;
  ctx = new AC();
  src = ctx.createMediaElementSource(video);
  comp = ctx.createDynamicsCompressor();
  eq = ctx.createBiquadFilter();
  eq.type = 'peaking';
  eq.frequency.value = 2400; // a beszéd érthetősége
  eq.Q.value = 0.9;
  gain = ctx.createGain();
  src.connect(comp);
  comp.connect(eq);
  eq.connect(gain);
  gain.connect(ctx.destination);
}

/** Be- / kikapcsolás. Kikapcsolva a lánc semleges (a hang változatlan). */
export function setNight(video, enable) {
  if (!nightAvailable()) return false;
  if (!ctx) {
    if (!enable) return false;
    build(video);
  }
  on = !!enable;
  const t = ctx.currentTime;
  if (on) {
    comp.threshold.setValueAtTime(-42, t);
    comp.knee.setValueAtTime(24, t);
    comp.ratio.setValueAtTime(10, t);
    comp.attack.setValueAtTime(0.004, t);
    comp.release.setValueAtTime(0.3, t);
    eq.gain.setValueAtTime(4, t);
    gain.gain.setValueAtTime(1.9, t); // a tömörítés utáni hangerő-kiegyenlítés
  } else {
    comp.threshold.setValueAtTime(0, t);
    comp.knee.setValueAtTime(0, t);
    comp.ratio.setValueAtTime(1, t);
    eq.gain.setValueAtTime(0, t);
    gain.gain.setValueAtTime(1, t);
  }
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  return true;
}

/** Hangszintmérő a lánc végére (ellenőrzéshez): () => 0–1 */
export function meter() {
  if (!ctx) return null;
  const an = ctx.createAnalyser();
  const sink = ctx.createGain();
  sink.gain.value = 0; // a mérő ága is a kimenetre fut, különben nem dolgozik
  gain.connect(an);
  an.connect(sink);
  sink.connect(ctx.destination);
  const data = new Float32Array(an.fftSize);
  return () => {
    an.getFloatTimeDomainData(data);
    return Math.sqrt(data.reduce((s, x) => s + x * x, 0) / data.length);
  };
}
