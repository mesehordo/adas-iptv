// Hálózatfigyelő: lejátszás közben szegmensenként méri a letöltési sebességet, a forrás válaszidejét
// (az első bájtig) és azt, hogy a szegmensek valós időnél gyorsabban érkeznek-e; jegyzi az akadásokat.
// Ebből megállapítja, mi okozza a pufferelést: nincs internet, lassú a saját hálózat, vagy lassú az adó.

const EWMA = 0.3; // az új mérés súlya (a régebbiek fokozatosan elhalványulnak)
const STALL_WINDOW = 90e3; // ennyi időn belüli akadásokat számolunk
const PEAK_TTL = 10 * 60e3;
// A saját hálózat bizonyított teljesítménye: az utóbbi 10 percben (bármelyik adásnál) mért legnagyobb
// szegmens-letöltési sebesség. Ha ez bőven több az adás bitrátájánál, akadáskor nem a hálózat a hibás.
let peak = { bps: 0, at: 0 };
const notePeak = (bps) => {
  if (bps > peak.bps || Date.now() - peak.at > PEAK_TTL) peak = { bps, at: Date.now() };
};
export const networkPeak = () => (Date.now() - peak.at < PEAK_TTL ? peak.bps : 0);

export class NetWatch {
  constructor() {
    this.reset();
  }

  reset() {
    this.tput = 0; // bit/s – a szegmensek letöltési sebessége
    this.ttfb = 0; // ms – a forrás válaszideje (kérés → első bájt)
    this.ratio = 0; // a letöltési idő / a szegmens hossza (1 felett: a forrás lassabban küld, mint ahogy játsszuk)
    this.samples = 0;
    this.stalls = [];
    this.actions = new Set(); // ebben az adásban már megtett beavatkozások
  }

  /** Egy letöltött szegmens adatai (hls.js stats: loading.start / first / end, loaded). */
  frag(stats, duration) {
    const l = stats?.loading;
    if (!l || !stats.loaded || !l.end || !l.start) return;
    const ms = Math.max(1, l.end - l.start);
    const bps = (stats.loaded * 8) / (ms / 1000);
    const first = l.first > l.start ? l.first - l.start : 0;
    const mix = (old, v) => (this.samples ? old * (1 - EWMA) + v * EWMA : v);
    this.tput = mix(this.tput, bps);
    if (stats.loaded > 200e3) notePeak(bps); // (kis szegmensnél a válaszidő torzít)
    if (first) this.ttfb = mix(this.ttfb, first);
    if (duration > 0.5) this.ratio = mix(this.ratio, ms / 1000 / duration);
    this.samples++;
  }

  stall() {
    const now = Date.now();
    this.stalls = this.stalls.filter((t) => now - t < STALL_WINDOW);
    this.stalls.push(now);
  }

  recentStalls() {
    const now = Date.now();
    return this.stalls.filter((t) => now - t < STALL_WINDOW).length;
  }

  /**
   * Diagnózis. bitrate: az adás bitrátája (bit/s).
   * → { kind: 'offline' | 'slow-net' | 'slow-source' | 'ok' | 'unknown', text }
   */
  diagnose(bitrate = 0) {
    if (typeof navigator !== 'undefined' && navigator.onLine === false) return { kind: 'offline', text: 'Nincs internetkapcsolat.' };
    if (this.samples < 3) return { kind: 'unknown', text: '' };
    // ismeretlen bitrátánál: sebesség × (letöltési idő / hossz) = a szegmensek adatmennyisége / hossza
    const rate = bitrate || this.tput * this.ratio;
    const tight = this.ratio > 0.75 || (bitrate && this.tput < bitrate * 1.3);
    if (tight) {
      // A hálózat már bizonyítottan gyorsabb volt (bármelyik adásnál): akkor az adó küld lassan.
      if (networkPeak() > rate * 2) return { kind: 'slow-source', text: 'Az adó szervere lassan küldi az adást.' };
      return { kind: 'slow-net', text: 'Lassú a hálózatod ehhez a minőséghez.' };
    }
    if (this.ttfb > 2500) return { kind: 'slow-source', text: 'Az adó szervere lassan válaszol.' };
    return { kind: 'ok', text: '' };
  }
}
