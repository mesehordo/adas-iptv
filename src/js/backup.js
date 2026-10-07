// Automatikus mentés: naponta egy mentési pont a beállításokról, profilokról, kedvencekről, előzményekről
// (az utolsó 7 marad meg), ezen az eszközön tárolva – egy kattintással visszaállítható.
import { toast, bus } from './util.js';
import { api } from './api.js';
import { store } from './store.js';
import { confirmDialog } from './components.js';

const KEY = 'backups';
const KEEP = 7;
const DAY = 24 * 3600e3;

async function list() {
  try {
    const v = await api.docGet?.(KEY);
    return Array.isArray(v?.items) ? v.items : [];
  } catch {
    return [];
  }
}

export async function backupNow(reason = 'auto') {
  if (!api.docSet) return false;
  const data = JSON.parse(JSON.stringify(store.serialize()));
  delete data.health;
  data.app = 'adas';
  const items = [{ at: Date.now(), reason, profiles: (data.profiles || []).length, data }, ...(await list())].slice(0, KEEP);
  await api.docSet(KEY, { items });
  store.settings.lastBackup = Date.now();
  store.save();
  return true;
}

async function tick() {
  const s = store.settings;
  if (s.autoBackup === false || !api.docSet) return;
  if (Date.now() - (s.lastBackup || 0) > DAY) await backupNow().catch((err) => console.warn('Automatikus mentés', err));
}
setTimeout(tick, 60e3);
setInterval(tick, 3 * 3600e3);

export async function renderBackups(box) {
  if (!box) return;
  if (!api.docSet) return box.remove();
  const draw = async () => {
    const items = await list();
    box.innerHTML = `<h3>Automatikus mentés</h3>
      <label class="setting"><span><b>Napi mentési pont ezen az eszközön</b><small>Az utolsó ${KEEP} nap beállításai, profiljai, kedvencei és előzményei – ha valami elromlik vagy véletlenül törölsz, visszaállítható.</small></span>
        <input type="checkbox" class="switch" data-bk="on" ${store.settings.autoBackup === false ? '' : 'checked'} /></label>
      ${
        items.length
          ? `<ul class="src-list">${items
              .map((b, i) => `<li><span><b>${new Date(b.at).toLocaleString('hu-HU', { dateStyle: 'medium', timeStyle: 'short' })}</b><small>${b.reason === 'manual' ? 'kézi mentés' : b.reason === 'before-restore' ? 'visszaállítás előtti állapot' : 'automatikus'} · ${b.profiles} profil</small></span>
                <button class="btn small" data-bk-restore="${i}">Visszaállítás</button></li>`)
              .join('')}</ul>`
          : '<p class="muted small">Még nincs mentési pont.</p>'
      }
      <div class="inline"><button class="btn small" data-bk="now">Mentés most</button></div>`;
    box._items = items;
  };
  box.onchange = (e) => {
    if (e.target.dataset.bk !== 'on') return;
    e.stopPropagation();
    store.settings.autoBackup = e.target.checked;
    store.save();
  };
  box.onclick = async (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.bk === 'now') {
      e.stopPropagation();
      await backupNow('manual');
      toast('Mentési pont elkészült');
      draw();
    } else if (b.dataset.bkRestore !== undefined) {
      e.stopPropagation();
      const it = box._items[Number(b.dataset.bkRestore)];
      if (!it) return;
      const ok = await confirmDialog(`Visszaállítod a ${new Date(it.at).toLocaleString('hu-HU', { dateStyle: 'medium', timeStyle: 'short' })} állapotot? A mostani beállítások felülíródnak (előtte erről is készül mentési pont).`, { ok: 'Visszaállítás', danger: true });
      if (!ok) return;
      await backupNow('before-restore');
      await store.replaceAll({ ...it.data, health: store.health });
      toast('Visszaállítva – újraindítás…');
      setTimeout(() => location.reload(), 700);
    }
  };
  draw();
}

// Feliratok megjelenése (Beállítások → Lejátszás): méret, szín, háttér – a <video> feliratainak (::cue)
// és a natív lejátszó saját feliratrétegének is.
export function applySubStyle() {
  const s = store.settings || {};
  const d = document.documentElement.dataset;
  d.subColor = s.subColor || 'white';
  d.subBg = s.subBg || 'box';
}
bus.on('settings', (k) => /^sub(Color|Bg)$/.test(k) && applySubStyle());
