// Adások elérhetőségének ellenőrzése a háttérben (csak az asztali alkalmazásban).
import { api } from './api.js';
import { store } from './store.js';
import { orderedStreams } from './catalog.js';
import { bus } from './util.js';

const RECHECK_MS = 12 * 3600e3;
const PER_CHANNEL = 4; // csatornánként legfeljebb ennyi forrást ellenőrzünk a háttérben

/** Háttérellenőrzés eredménye – egy friss sikertelen lejátszást nem ír felül „működik”-kel. */
/** ok: true / false, vagy 'geo' (a szerver 403 / 451 válasszal elutasította – földrajzi korlát) */
function applyProbe(url, ok) {
  const prev = store.health[url];
  if (ok === true && prev && !prev[0] && prev[2] === 'p' && Date.now() - prev[1] < RECHECK_MS) return;
  store.health[url] = ok === 'geo' ? [0, Date.now(), 'c', 'g'] : [ok ? 1 : 0, Date.now(), 'c'];
}
const queue = new Map(); // url -> stream
let running = false;
let fullScan = null; // { done, total }
let scanWaiting = false; // a kézi teljes vizsgálat a futó háttérkör végére vár
let timer = null;

api.onCheckProgress(({ done, total, partial }) => {
  for (const [url, ok] of Object.entries(partial)) applyProbe(url, ok);
  if (fullScan) {
    fullScan.done = done;
    fullScan.total = total;
    bus.emit('scan-progress', { ...fullScan });
  }
});

// Lejátszás közben a háttér-ellenőrzés szünetel: a próbák szegmenseket is letöltenek, és ez a nézett
// adás elől vette el a sávszélességet (akadozás). A lejátszó bezárása után folytatódik.
let playing = false;
bus.on('player-opened', () => {
  playing = true;
  if (running && !fullScan) api.cancelCheck?.();
});
// (H21) kikapcsoláskor a sorban álló háttér-ellenőrzések és időzítők törlődnek, a futó kör megszakad (a kézi teljes
// ellenőrzés – scanAll – ettől független)
bus.on('settings', (k) => {
  if (k !== 'autoCheck' || store.settings.autoCheck) return;
  clearTimeout(timer);
  clearTimeout(retryTimer);
  retryTimer = null;
  retries = 0;
  queue.clear();
  // (a futó háttérkör megszakad – akkor is, ha egy kézi teljes vizsgálat éppen rá vár)
  if (running && (!fullScan || scanWaiting)) api.cancelCheck?.();
});
bus.on('player-closed', () => {
  playing = false;
  clearTimeout(timer);
  timer = setTimeout(pump, 5000);
});

// (B33) hibás kör után korlátozott, késleltetett újrapróbálás: 30 s, 60 s, 120 s – utána a következő
// sorbaállítás (pl. új oldal, lejátszó bezárása) indítja újra; sikeres körnél a számláló nullázódik
let retryTimer = null;
let retries = 0;
const MAX_RETRIES = 3;

/** A sorban álló források ellenőrzése 60-as adagokban (lejátszás közben szünetel). */
async function pump() {
  // (függő újrapróbálásnál nem: a késleltetés megmarad, a sorbaállítás nem meríti ki idő előtt a keretet)
  // (H21) a háttér-ellenőrzés a kikapcsolása után már nem indul (a sorbaállításkori ellenőrzés nem elég)
  if (running || retryTimer !== null || !queue.size || playing || !store.settings.autoCheck) return;
  running = true;
  let batch = [];
  try {
    while (queue.size && !playing && store.settings.autoCheck) {
      batch = [...queue.values()].slice(0, 60);
      batch.forEach((s) => queue.delete(s.url));
      const { results, cancelled } = await api.checkStreams(batch.map((s) => ({ url: s.url, ua: s.ua, referrer: s.referrer })));
      // (H21) a kör közben kikapcsolták: a törölt sort nem tölti vissza, és az állapotot sem módosítja
      if (!store.settings.autoCheck && !fullScan) {
        batch = [];
        return;
      }
      // a kör ellenőrizetlen tételei visszakerülnek a sorba (megszakításnál, és ha a natív próba csak
      // részben sikerült – az Android / webOS ilyenkor is cancelled: false-szal tér vissza)
      const unchecked = batch.filter((s) => !(s.url in results));
      for (const s of unchecked) queue.set(s.url, s);
      for (const [url, ok] of Object.entries(results)) applyProbe(url, ok);
      batch = [];
      store.save();
      bus.emit('health');
      if (unchecked.length && !cancelled) throw new Error(`részleges ellenőrzés (${unchecked.length} ellenőrizetlen)`);
      retries = 0;
    }
  } catch (err) {
    // az ellenőrizetlen adag visszakerül a sorba (nem veszik el), és később újrapróbáljuk
    for (const s of batch) if (!queue.has(s.url)) queue.set(s.url, s);
    console.warn('Elérhetőség-ellenőrzés hiba', err);
    if (retries < MAX_RETRIES) {
      clearTimeout(retryTimer);
      retryTimer = setTimeout(() => {
        retryTimer = null;
        pump();
      }, 30e3 * 2 ** retries++);
    }
  } finally {
    running = false;
  }
}

export const health = {
  get available() {
    return !!api.caps.health;
  },

  /**
   * A csatornák forrásainak ellenőrzése, ha régen volt (sorba állítva). Minden forrást (legfeljebb
   * PER_CHANNEL-t) nézünk: az „Offline” jelzés csak akkor jelenhet meg, ha mindegyik ismert és hibás.
   */
  queueChannels(channels) {
    if (!api.caps.health || !store.settings.autoCheck || fullScan) return;
    const now = Date.now();
    for (const ch of channels) {
      for (const s of orderedStreams(ch).slice(0, PER_CHANNEL)) {
        const h = store.healthOf(s.url);
        if (h && now - h.t < RECHECK_MS) continue;
        queue.set(s.url, s);
      }
    }
    clearTimeout(timer);
    timer = setTimeout(pump, 400);
  },

  /** Minden adás ellenőrzése. */
  async scanAll(channels) {
    if (!api.caps.health || fullScan) return;
    queue.clear();
    const list = channels.flatMap((ch) => ch.streams).map((s) => ({ url: s.url, ua: s.ua, referrer: s.referrer }));
    const scan = (fullScan = { done: 0, total: list.length });
    bus.emit('scan-progress', { ...fullScan });
    // (X10) saját megszakítási jelzés: a háttérellenőrzésre várakozó teljes vizsgálat is leállítható
    const finish = (cancelled, results = {}) => {
      for (const [url, ok] of Object.entries(results)) applyProbe(url, ok);
      store.save();
      if (fullScan === scan) fullScan = null;
      bus.emit('scan-progress', null);
      bus.emit('health');
      return { cancelled, checked: Object.keys(results).length };
    };
    // Ha éppen fut egy háttérellenőrzés, megvárjuk (közben a kikapcsolás azt is megszakíthatja – scanWaiting).
    scanWaiting = true;
    try {
      while (running && !scan.cancelled) await new Promise((r) => setTimeout(r, 200));
    } finally {
      scanWaiting = false;
    }
    if (scan.cancelled) return finish(true);
    running = true;
    let results = {};
    let cancelled = false;
    try {
      ({ results, cancelled } = await api.checkStreams(list));
    } catch (err) {
      cancelled = true;
      console.warn('Teljes ellenőrzés hiba', err);
    } finally {
      running = false;
    }
    return finish(cancelled || !!scan.cancelled, results);
  },

  cancelScan() {
    if (fullScan) fullScan.cancelled = true;
    api.cancelCheck();
  },

  get scanning() {
    return fullScan ? { ...fullScan } : null;
  },

  clear() {
    store.health = {};
    store.save();
    bus.emit('health');
  },
};
