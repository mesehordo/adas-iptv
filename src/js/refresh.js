// A csatornalista és a műsorújság frissítése (profilmenüből, beállításokból, távirányítóról).
import { catalog, loadCatalog } from './catalog.js';
import { epg } from './epg.js';
import { toast, bus } from './util.js';

let running = null;

export const refreshing = () => !!running;

/**
 * Frissítés.
 * force: true → minden letöltés újra (a gyorsítótár megkerülésével);
 * false → csak az új / megváltozott listák töltődnek le (pl. lista vagy csatorna hozzáadása után).
 */
export function refreshAll({ force = true, epgToo = true, quiet = false } = {}) {
  if (running) return running;
  if (!quiet) toast(force ? 'Csatornalista frissítése…' : 'Csatornalista újratöltése…');
  bus.emit('refresh', true);
  running = (async () => {
    const before = catalog.channels.length;
    try {
      await loadCatalog({ force });
      const diff = catalog.channels.length - before;
      if (!quiet) {
        toast(
          `Kész: ${catalog.channels.length} csatorna` +
            (diff > 0 ? ` (${diff} új)` : diff < 0 ? ` (${-diff} eltűnt)` : '')
        );
      }
      if (epgToo) epg.load({ force });
      return true;
    } catch (err) {
      toast('Nem sikerült frissíteni: ' + (err.message || err), { timeout: 8000 });
      return false;
    } finally {
      running = null;
      bus.emit('refresh', false);
    }
  })();
  return running;
}
