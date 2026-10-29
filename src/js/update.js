// Frissítések az asztali változathoz: ellenőrzés a megadott forrásban (GitHub-kiadás vagy
// JSON-cím), letöltés folyamatjelzővel, majd a telepítő indítása.
import { esc, toast, errText } from './util.js';
import { api } from './api.js';
import { store } from './store.js';
import { confirmDialog } from './components.js';

import { _t } from './i18n.js';
export const updateAvailable = () => !!api.caps?.update;
let progressCb = null;
if (api.onUpdateProgress) api.onUpdateProgress((p) => progressCb?.(p));
// (F03) Android: a rendszertelepítő visszajelzése (jóváhagyás után az alkalmazás magától újraindul)
if (api.onUpdateStatus)
  api.onUpdateStatus((s) => {
    if (s.state === 'aborted') toast(_t('A frissítés telepítése megszakítva – az Adás a mostani verzióval fut tovább.'));
    else if (s.state === 'error') toast(`${_t('A frissítés telepítése nem sikerült:')} ${s.message || ''}`, { timeout: 10000 });
  });

// (H13) a már letöltött és ellenőrzött csomag: egy engedélykérés utáni újabb „Telepítés” nem tölti le újra
let readyFile = null; // { asset, file }
const assetKey = (a) => (typeof a === 'string' ? a : JSON.stringify(a));

async function downloadAndInstall(info, out) {
  if (!info.asset) {
    if (info.page) api.openExternal(info.page);
    return;
  }
  const bar = out?.querySelector('.progress i');
  progressCb = (p) => bar && (bar.style.width = (p * 100).toFixed(1) + '%');
  try {
    let file = readyFile?.asset === assetKey(info.asset) ? readyFile.file : null;
    if (!file) {
      toast(`${_t('Az új verzió ({latest}) letöltése…', { latest: info.latest })}`);
      file = await api.updateDownload(info.asset);
      readyFile = { asset: assetKey(info.asset), file };
    }
    if (info.android) {
      // Android: a rendszer telepítője kér jóváhagyást; a profilok, listák és beállítások megmaradnak
      if (!(await confirmDialog(_t('A letöltés kész és ellenőrizve. Telepíted most? Az Android rákérdez a telepítésre; a profilok, a listák és a beállítások megmaradnak.'), { ok: _t('Telepítés most'), cancel: _t('Később') }))) return;
      let r;
      try {
        r = await api.updateInstall(file);
      } catch (err) {
        readyFile = null; // (pl. a fájl közben eltűnt: a következő próba újra letölti)
        throw err;
      }
      if (r === 'permission') toast(_t('Engedélyezd az Adásnak az alkalmazások telepítését a megnyíló beállításban, majd nyomd meg újra a Telepítés gombot.'), { timeout: 12000 });
      return;
    }
    const silent = await silentPref();
    const msg = info.portable
      ? _t('A letöltés kész. A hordozható változatnál az új fájlt a megnyíló mappában találod – azt indítsd el a régi helyett.')
      : silent
        ? _t('A letöltés kész. Telepíted most? Az Adás bezárul, a frissítés kérdések nélkül települ, majd az Adás újraindul.')
        : _t('A letöltés kész. Elindítod most a telepítőt? Az Adás bezárul, és a telepítés után újraindítható.');
    if (await confirmDialog(msg, { ok: info.portable ? _t('Mappa megnyitása') : _t('Telepítés most'), cancel: _t('Később') })) await api.updateInstall(file, silent);
  } catch (err) {
    toast(`${_t('A letöltés nem sikerült:')} ` + errText(err));
  } finally {
    progressCb = null;
  }
}

function resultHtml(info) {
  if (!info.newer) return `<p>${_t('Ez a legfrissebb verzió ({esc}).', { esc: esc(info.current) })}</p>`;
  return `<p>${_t('<b>Új verzió érhető el: {esc}</b>', { esc: esc(info.latest) })} <span class="muted">${_t('(most: {esc})', { esc: esc(info.current) })}</span></p>
    ${info.notes ? `<pre class="upd-notes">${esc(info.notes.slice(0, 1500))}</pre>` : ''}
    ${info.asset ? `<div class="progress"><i style="width:0%"></i></div>` : ''}
    <div class="inline"><button class="btn primary" data-up="install">${info.asset ? (info.portable ? _t('Letöltés') : _t('Letöltés és telepítés')) : _t('Letöltési oldal megnyitása')}</button>
    ${info.page ? `<button class="btn" data-up="page">${_t('Kiadási megjegyzések')}</button>` : ''}</div>`;
}

/**
 * Kérdések nélküli telepítés (Windows: Setup és MSI). A beállítás (updateSilent) dönt; amíg nincs megadva, a telepítés
 * módjához tartozó alapérték (MSI: be – vagy amit az MSI telepítőjében választottak –, Setup: ki). Ha az MSI telepítőjében
 * közben újra választottak (más a telepítés ideje), az az érvényes. → true / false / null (itt nem választható)
 */
let prefsCache = null;
async function updatePrefs() {
  prefsCache ||= Promise.resolve(api.updatePrefs?.()).catch(() => null);
  return prefsCache;
}
async function silentPref() {
  const p = await updatePrefs();
  if (!p?.silentOk) return null;
  const s = store.settings;
  if (p.stamp && p.stamp !== s.updateSilentStamp) {
    store.set('updateSilentStamp', p.stamp);
    store.set('updateSilent', p.silent);
  }
  return typeof s.updateSilent === 'boolean' ? s.updateSilent : !!p.silent;
}

/** A hivatalos kiadások (GitHub Releases) – ha a mező üres, innen frissül. */
const DEFAULT_SOURCE = 'mesehordo/adas-iptv';
const source = () => store.settings.updateSource || DEFAULT_SOURCE;

export function renderUpdate(box) {
  if (!updateAvailable()) {
    box.hidden = true;
    return;
  }
  const s = store.settings;
  let info = null;
  box.innerHTML = `<h2>${_t('Frissítések')} <button class="help-link" data-help="update" title="${_t('Súgó')}">?</button></h2>
    <label class="setting col"><span>${_t('<b>Frissítési forrás</b>')}<small>${_t('Üresen a hivatalos kiadások (github.com/{DEFAULT_SOURCE}). Saját forrás: GitHub-tároló („tulajdonos/tároló”, a legutóbbi kiadás), vagy egy JSON-fájl címe ({ "version", "url", "notes" }).', { DEFAULT_SOURCE })}</small></span>
      <input class="input" data-up-src value="${esc(s.updateSource || '')}" placeholder="${DEFAULT_SOURCE}" autocomplete="off" /></label>
    <label class="setting"><span>${_t('<b>Frissítés keresése induláskor</b>')}<small>${_t('Minden indításkor megnézi a GitHubon, van-e új verzió; ha van, értesítést kapsz, és egy kattintással telepítheted. Kikapcsolva csak a lenti gombbal keres.')}</small></span>
      <input type="checkbox" class="switch" data-up-auto ${s.updateAuto !== false ? 'checked' : ''} /></label>
    <label class="setting" data-up-silent-row hidden><span>${_t('<b>Telepítés kérdések nélkül</b>')}<small>${_t('A frissítés a telepítő ablakai és kérdései nélkül települ (csak egy folyamatjelző látszik; gépre telepítésnél a Windows engedélyt kérhet), utána az Adás újraindul. Kikapcsolva a szokásos telepítő indul.')}</small></span>
      <input type="checkbox" class="switch" data-up-silent /></label>
    <div class="inline"><button class="btn primary" data-up="check">${_t('Frissítés keresése most')}</button><span class="muted small up-status"></span></div>
    <div class="up-result"></div>`;
  const out = box.querySelector('.up-result');
  silentPref().then((v) => {
    const row = box.querySelector('[data-up-silent-row]');
    if (!row || v === null) return;
    row.hidden = false;
    row.querySelector('[data-up-silent]').checked = v;
  });
  box.onchange = (e) => {
    e.stopPropagation();
    if (e.target.matches('[data-up-src]')) store.set('updateSource', e.target.value.trim());
    if (e.target.matches('[data-up-auto]')) store.set('updateAuto', e.target.checked);
    if (e.target.matches('[data-up-silent]')) store.set('updateSilent', e.target.checked);
  };
  box.onclick = async (e) => {
    const a = e.target.closest('[data-up]')?.dataset.up;
    if (!a) return;
    e.stopPropagation();
    if (a === 'check') {
      store.set('updateSource', box.querySelector('[data-up-src]').value.trim());
      const st = box.querySelector('.up-status');
      st.textContent = _t('Ellenőrzés…');
      out.innerHTML = '';
      try {
        info = await api.updateCheck(source());
        store.set('lastUpdateCheck', Date.now());
        st.textContent = '';
        out.innerHTML = resultHtml(info);
      } catch (err) {
        st.textContent = `${_t('Hiba:')} ` + errText(err);
      }
    } else if (a === 'install' && info) downloadAndInstall(info, out);
    else if (a === 'page' && info?.page) api.openExternal(info.page);
  };
}

/** Indításkor: naponta egyszer (a beállított vagy a hivatalos forrásból). */
export async function autoCheckUpdate() {
  const s = store.settings;
  if (!updateAvailable() || s.updateAuto === false) return;
  try {
    const info = await api.updateCheck(source());
    store.set('lastUpdateCheck', Date.now());
    if (info.newer) {
      toast(`${_t('Új Adás-verzió érhető el: {latest}', { latest: info.latest })}`, { action: _t('Frissítés'), onAction: () => downloadAndInstall(info, null), timeout: 20000 });
    }
  } catch {}
}
