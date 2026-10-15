// A csatornalista és a műsorújság frissítése (profilmenüből, beállításokból, távirányítóról).
import { catalog, loadCatalog } from './catalog.js';
import { epg } from './epg.js';
import { toast, bus } from './util.js';

import { _t } from './i18n.js';
let running = null;
// (B25) a futás közben érkező kérések összevonva (a force / epgToo igény nem gyengül): a futó kör a kezdetekor
// rögzítette a listákat, ezért ezek egy további körben teljesülnek, a friss beállításokkal
let queued = null;
let queuedRun = null;

export const refreshing = () => !!running;

/**
 * Frissítés.
 * force: true → minden letöltés újra (a gyorsítótár megkerülésével);
 * false → csak az új / megváltozott listák töltődnek le (pl. lista vagy csatorna hozzáadása után).
 * → ígéret: annak a körnek a vége, amelyik ezt a kérést teljesíti (futás közbeni kérésnél a következőé).
 */
export function refreshAll({ force = true, epgToo = true, quiet = false } = {}) {
  if (running) {
    queued = queued ? { force: queued.force || force, epgToo: queued.epgToo || epgToo, quiet: queued.quiet && quiet } : { force, epgToo, quiet };
    queuedRun ||= running.then(() => {
      const q = queued;
      queued = null;
      queuedRun = null;
      return runOnce(q);
    });
    return queuedRun;
  }
  return runOnce({ force, epgToo, quiet });
}

function runOnce({ force, epgToo, quiet }) {
  if (!quiet) toast(force ? _t('Csatornalista frissítése…') : _t('Csatornalista újratöltése…'));
  bus.emit('refresh', true);
  running = (async () => {
    const before = catalog.channels.length;
    try {
      await loadCatalog({ force });
      const diff = catalog.channels.length - before;
      if (!quiet) {
        toast(
          diff > 0
            ? _t('Kész: {length} csatorna ({diff} új)', { length: catalog.channels.length, diff })
            : diff < 0
              ? _t('Kész: {length} csatorna ({x} eltűnt)', { length: catalog.channels.length, x: -diff })
              : _t('Kész: {length} csatorna', { length: catalog.channels.length })
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
