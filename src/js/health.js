// Adások elérhetőségének ellenőrzése a háttérben (csak az asztali alkalmazásban).
import { api } from './api.js';
import { store } from './store.js';
import { orderedStreams } from './catalog.js';
import { bus } from './util.js';

const RECHECK_MS = 12 * 3600e3;
const PER_CHANNEL = 4; // csatornánként legfeljebb ennyi forrást ellenőrzünk a háttérben

/** Háttérellenőrzés eredménye – egy friss sikertelen lejátszást nem ír felül „működik”-kel. */
function applyProbe(url, ok) {
  const prev = store.health[url];
  if (ok && prev && !prev[0] && prev[2] === 'p' && Date.now() - prev[1] < RECHECK_MS) return;
  store.health[url] = [ok ? 1 : 0, Date.now(), 'c'];
}
const queue = new Map(); // url -> stream
let running = false;
let fullScan = null; // { done, total }
let timer = null;

api.onCheckProgress(({ done, total, partial }) => {
  for (const [url, ok] of Object.entries(partial)) applyProbe(url, ok);
  if (fullScan) {
    fullScan.done = done;
    fullScan.total = total;
    bus.emit('scan-progress', { ...fullScan });
  }
});

async function pump() {
  if (running || !queue.size) return;
  running = true;
  try {
    while (queue.size) {
      const batch = [...queue.values()].slice(0, 60);
      batch.forEach((s) => queue.delete(s.url));
      const { results } = await api.checkStreams(batch.map((s) => ({ url: s.url, ua: s.ua, referrer: s.referrer })));
      for (const [url, ok] of Object.entries(results)) applyProbe(url, ok);
      store.save();
      bus.emit('health');
    }
  } catch (err) {
    console.warn('Elérhetőség-ellenőrzés hiba', err); // a következő körben újra próbálkozik
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
    fullScan = { done: 0, total: list.length };
    bus.emit('scan-progress', { ...fullScan });
    // Ha éppen fut egy háttérellenőrzés, megvárjuk.
    while (running) await new Promise((r) => setTimeout(r, 200));
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
    for (const [url, ok] of Object.entries(results)) applyProbe(url, ok);
    store.save();
    fullScan = null;
    bus.emit('scan-progress', null);
    bus.emit('health');
    return { cancelled, checked: Object.keys(results).length };
  },

  cancelScan() {
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
