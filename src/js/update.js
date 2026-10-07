// Frissítések az asztali változathoz: ellenőrzés a megadott forrásban (GitHub-kiadás vagy
// JSON-cím), letöltés folyamatjelzővel, majd a telepítő indítása.
import { esc, toast, errText } from './util.js';
import { api } from './api.js';
import { store } from './store.js';
import { confirmDialog } from './components.js';

export const updateAvailable = () => !!api.caps?.update;
let progressCb = null;
if (api.onUpdateProgress) api.onUpdateProgress((p) => progressCb?.(p));

async function downloadAndInstall(info, out) {
  if (!info.asset) {
    if (info.page) api.openExternal(info.page);
    return;
  }
  const bar = out?.querySelector('.progress i');
  progressCb = (p) => bar && (bar.style.width = (p * 100).toFixed(1) + '%');
  try {
    toast(`Az új verzió (${info.latest}) letöltése…`);
    const file = await api.updateDownload(info.asset);
    const msg = info.portable
      ? 'A letöltés kész. A hordozható változatnál az új fájlt a megnyíló mappában találod – azt indítsd el a régi helyett.'
      : 'A letöltés kész. Elindítod most a telepítőt? Az Adás bezárul, és a telepítés után újraindítható.';
    if (await confirmDialog(msg, { ok: info.portable ? 'Mappa megnyitása' : 'Telepítés most', cancel: 'Később' })) await api.updateInstall(file);
  } catch (err) {
    toast('A letöltés nem sikerült: ' + errText(err));
  } finally {
    progressCb = null;
  }
}

function resultHtml(info) {
  if (!info.newer) return `<p>Ez a legfrissebb verzió (${esc(info.current)}).</p>`;
  return `<p><b>Új verzió érhető el: ${esc(info.latest)}</b> <span class="muted">(most: ${esc(info.current)})</span></p>
    ${info.notes ? `<pre class="upd-notes">${esc(info.notes.slice(0, 1500))}</pre>` : ''}
    ${info.asset ? `<div class="progress"><i style="width:0%"></i></div>` : ''}
    <div class="inline"><button class="btn primary" data-up="install">${info.asset ? (info.portable ? 'Letöltés' : 'Letöltés és telepítés') : 'Letöltési oldal megnyitása'}</button>
    ${info.page ? '<button class="btn" data-up="page">Kiadási megjegyzések</button>' : ''}</div>`;
}

export function renderUpdate(box) {
  if (!updateAvailable()) {
    box.hidden = true;
    return;
  }
  const s = store.settings;
  let info = null;
  box.innerHTML = `<h2>Frissítések <button class="help-link" data-help="update" title="Súgó">?</button></h2>
    <label class="setting col"><span><b>Frissítési forrás</b><small>GitHub-tároló („tulajdonos/tároló”, a legutóbbi kiadás), vagy egy JSON-fájl címe ({ "version", "url", "notes" }).</small></span>
      <input class="input" data-up-src value="${esc(s.updateSource || '')}" placeholder="pl. felhasznalo/adas" autocomplete="off" /></label>
    <label class="setting"><span><b>Ellenőrzés indításkor</b><small>Naponta legfeljebb egyszer; új verziónál értesítést kapsz.</small></span>
      <input type="checkbox" class="switch" data-up-auto ${s.updateAuto !== false ? 'checked' : ''} /></label>
    <div class="inline"><button class="btn" data-up="check">Ellenőrzés most</button><span class="muted small up-status"></span></div>
    <div class="up-result"></div>`;
  const out = box.querySelector('.up-result');
  box.onchange = (e) => {
    e.stopPropagation();
    if (e.target.matches('[data-up-src]')) store.set('updateSource', e.target.value.trim());
    if (e.target.matches('[data-up-auto]')) store.set('updateAuto', e.target.checked);
  };
  box.onclick = async (e) => {
    const a = e.target.closest('[data-up]')?.dataset.up;
    if (!a) return;
    e.stopPropagation();
    if (a === 'check') {
      store.set('updateSource', box.querySelector('[data-up-src]').value.trim());
      const st = box.querySelector('.up-status');
      st.textContent = 'Ellenőrzés…';
      out.innerHTML = '';
      try {
        info = await api.updateCheck(store.settings.updateSource);
        store.set('lastUpdateCheck', Date.now());
        st.textContent = '';
        out.innerHTML = resultHtml(info);
      } catch (err) {
        st.textContent = 'Hiba: ' + errText(err);
      }
    } else if (a === 'install' && info) downloadAndInstall(info, out);
    else if (a === 'page' && info?.page) api.openExternal(info.page);
  };
}

/** Indításkor: naponta egyszer, ha be van állítva forrás. */
export async function autoCheckUpdate() {
  const s = store.settings;
  if (!updateAvailable() || !s.updateSource || s.updateAuto === false) return;
  if (Date.now() - (s.lastUpdateCheck || 0) < 20 * 3600e3) return;
  try {
    const info = await api.updateCheck(s.updateSource);
    store.set('lastUpdateCheck', Date.now());
    if (info.newer) {
      toast(`Új Adás-verzió érhető el: ${info.latest}`, { action: 'Frissítés', onAction: () => downloadAndInstall(info, null), timeout: 20000 });
    }
  } catch {}
}
