// A csatornalista és a műsorújság frissítése (profilmenüből, beállításokból, távirányítóról).
import { catalog, loadCatalog } from './catalog.js';
import { epg } from './epg.js';
import { toast, bus } from './util.js';

import { _t } from './i18n.js';
let running = null;

export const refreshing = () => !!running;

/**
 * Frissítés.
 * force: true → minden letöltés újra (a gyorsítótár megkerülésével);
 * false → csak az új / megváltozott listák töltődnek le (pl. lista vagy csatorna hozzáadása után).
 */
export function refreshAll({ force = true, epgToo = true, quiet = false } = {}) {
  if (running) return running;
  if (!quiet) toast(force ? _t('Csatornalista frissítése…') : _t('Csatornalista újratöltése…'));
  bus.emit('refresh', true);
  running = (async () => {
    const before = catalog.channels.length;
    try {
      await loadCatalog({ force });
      const diff = catalog.channels.length - before;
      if (!quiet) {
        toast(
          `${_t('Kész: {length} csatorna', { length: catalog.channels.length })}` +
            (diff > 0 ? ` ${_t('({diff} új)', { diff })}` : diff < 0 ? ` ${_t('({x} eltűnt)', { x: -diff })}` : '')
        );
      }
      if (epgToo) epg.load({ force });
      return true;
    } catch (err) {
      toast(`${_t('Nem sikerült frissíteni:')} ` + (err.message || err), { timeout: 8000 });
      return false;
    } finally {
      running = null;
      bus.emit('refresh', false);
    }
  })();
  return running;
}
