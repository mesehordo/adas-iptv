// Szinkronizálás eszközök között (asztali, Android TV, Android telefon), a helyi hálózaton:
//  - bármelyik eszköz 6 jegyű kódot ad (a címe utolsó száma + titok), és elérhetővé teszi a beállításait;
//  - a másik eszközön csak a kódot beírva megkeresi és egy lépésben átveszi:
//    listák, profilok, kedvencek, előzmények, emlékeztetők, (kérésre) kulcsok és jelszavak;
//  - webcímről (pl. NAS-ra vagy GitHubra tett mentésből) is betölthető.
import { esc, toast, errText, bus } from './util.js';
import { api } from './api.js';
import { store } from './store.js';
import { confirmDialog } from './components.js';
import { packDocs } from './packs.js';

const SECRET_KEYS = ['osApiKey', 'osUser', 'osPass', 'osToken', 'tmdbKey', 'omdbKey', 'tsdbKey'];
let shareTimer = null;

/** A fájlból felvett nagy listák szövege külön tárban van – a mentésbe ezeket is beletesszük. */
export async function attachDocs(data) {
  const docs = {};
  for (const p of data.settings?.vodCustom || []) {
    if (!p.textKey) continue;
    const v = await api.docGet?.(p.textKey).catch(() => null);
    if (v) docs[p.textKey] = v;
  }
  // a kiegészítő csomagok (tévé és VOD) is mennek – így a másik eszközön is megjelennek
  Object.assign(docs, await packDocs(data.settings));
  if (Object.keys(docs).length) data.docs = docs;
  return data;
}

/** A mentésben érkezett listaszövegek visszaírása. */
export async function restoreDocs(data) {
  for (const [k, v] of Object.entries(data.docs || {})) if (/^(vodtext|vodpack|tvpack):[\w-]+$/.test(k) && v && typeof v.text === 'string') await api.docSet?.(k, v);
  delete data.docs;
}

async function payload({ secrets, profiles }) {
  const data = JSON.parse(JSON.stringify(store.serialize()));
  delete data.health;
  if (!secrets) SECRET_KEYS.forEach((k) => delete data.settings[k]);
  if (!profiles) delete data.profiles;
  data.exportedAt = Date.now();
  data.app = 'adas';
  return attachDocs(data);
}

async function applyData(data, source, { profilesOnly = false } = {}) {
  if (!data || data.app !== 'adas' || !data.settings) throw new Error('A válasz nem Adás-beállítás.');
  if (profilesOnly) return mergeProfiles(data, source);
  const what = [
    'a beállításokat és a listákat',
    data.profiles ? `${data.profiles.length} profilt (kedvencekkel, előzményekkel)` : '',
    SECRET_KEYS.some((k) => data.settings[k]) ? 'a kulcsokat és jelszavakat' : '',
  ].filter(Boolean);
  const ok = await confirmDialog(`Átveszed ${what.join(', ')} innen: ${source}? A jelenlegi beállítások felülíródnak.`, {
    ok: 'Átvétel',
    danger: true,
  });
  if (!ok) return false;
  const cur = store.serialize();
  const settings = { ...data.settings };
  // A titkos adatok, ha nem jöttek át, maradnak a régiek.
  SECRET_KEYS.forEach((k) => {
    if (!(k in settings) && cur.settings[k]) settings[k] = cur.settings[k];
  });
  await restoreDocs(data);
  await store.replaceAll({
    version: data.version || 1,
    settings,
    profiles: data.profiles || cur.profiles,
    activeProfileId: data.profiles ? data.activeProfileId : cur.activeProfileId,
    health: store.health,
  });
  toast('Beállítások átvéve – újraindítás…');
  setTimeout(() => location.reload(), 800);
  return true;
}

/**
 * Csak a profilok átvétele: a mostani beállítások, listák és profilok megmaradnak; a beérkező
 * profilok hozzáadódnak, az azonos (ugyanonnan származó) profil frissül – kedvencekkel, előzményekkel,
 * emlékeztetőkkel, profilképpel és PIN-nel együtt.
 */
async function mergeProfiles(data, source) {
  const incoming = Array.isArray(data.profiles) ? data.profiles.filter((p) => p && p.id && p.name) : [];
  if (!incoming.length) throw new Error('A mentésben nincs profil.');
  const known = new Set(store.profiles.map((p) => p.id));
  const updated = incoming.filter((p) => known.has(p.id)).length;
  const ok = await confirmDialog(
    `Átveszed ezeket a profilokat innen: ${source}? ${incoming.map((p) => p.name).join(', ')}.` +
      (updated ? ` Közülük ${updated} már megvan ezen az eszközön – az frissül.` : '') +
      ' A többi profil és a beállítások nem változnak.',
    { ok: 'Átvétel' }
  );
  if (!ok) return false;
  for (const p of incoming) {
    const i = store.profiles.findIndex((x) => x.id === p.id);
    if (i >= 0) store.profiles[i] = { ...store.profiles[i], ...p };
    else store.profiles.push(p);
  }
  store.flush();
  bus.emit('profile');
  toast(`${incoming.length} profil átvéve`);
  return true;
}

/** Fájlból vagy más forrásból érkező mentés feldolgozása (a beállítások oldal is ezt használja). */
export const importData = (data, source, opts) => applyData(data, source, opts);

async function getJson(url) {
  const r = await api.request({ url, headers: { Accept: 'application/json' } });
  if (r.status === 404) throw new Error('Hibás vagy lejárt kód.');
  if (r.status !== 200) throw new Error(`HTTP ${r.status}`);
  return JSON.parse(r.text);
}

const PORTS = [47800, 47801, 47802, 47803];
const fmtCode = (c) => `${c.slice(0, 3)} ${c.slice(3)}`;

/**
 * Csak kóddal: a 6 jegyű kód első 3 jegye a megosztó eszköz címének utolsó száma. A saját címünk első
 * három részével együtt ez megadja a címét; ha ott nem válaszol, a teljes helyi alhálózatot végignézzük.
 */
async function fetchByCode(code, onStatus) {
  const oct = Number(code.slice(0, 3));
  const secret = code.slice(3);
  if (!(oct >= 1 && oct <= 254)) throw new Error('Hibás kód.');
  const ips = (await api.lanIps()) || [];
  const prefixes = [...new Set(ips.map((ip) => ip.split('.').slice(0, 3).join('.')))];
  if (!prefixes.length) throw new Error('Ez az eszköz nincs helyi hálózaton.');
  const path = `/adas/share/${secret}`;
  const tryUrls = async (urls, timeout) => {
    const r = await api.lanGet(urls, timeout);
    if (r?.status === 200) return { data: JSON.parse(r.text), from: new URL(r.url).hostname };
    if (r?.status === 404) throw new Error('Hibás vagy lejárt kód.');
    return null;
  };
  onStatus('Az eszköz keresése…');
  let got = await tryUrls(prefixes.flatMap((pre) => PORTS.map((p) => `http://${pre}.${oct}:${p}${path}`)), 3000);
  if (got) return got;
  // más címen (pl. több hálózati kártya): a teljes alhálózat a szokásos porton
  onStatus('Keresés a helyi hálózaton…');
  for (const pre of prefixes) {
    got = await tryUrls(Array.from({ length: 254 }, (_, i) => `http://${pre}.${i + 1}:${PORTS[0]}${path}`), 1500);
    if (got) return got;
  }
  throw new Error('Nem található az eszköz. Ugyanazon a hálózaton van, fut rajta az Adás, és még érvényes a kód?');
}

/** Cím + kód → a megosztó gép beállításai. A port nélküli címnél a szokásos portokat próbálja. */
async function fetchShared(addr, code) {
  addr = addr.trim().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
  const ports = /:\d+$/.test(addr) ? [''] : [':47800', ':47801', ':47802', ':47803'];
  let last;
  for (const p of ports) {
    try {
      return await getJson(`http://${addr}${p}/adas/share/${encodeURIComponent(code.length === 6 ? code.slice(3) : code)}`);
    } catch (err) {
      last = err;
      if (/kód/.test(err.message)) throw err;
    }
  }
  throw new Error(`A gép nem érhető el (${last?.message || 'nincs válasz'}). Fut rajta az Adás, és el van indítva az átadás?`);
}

export function renderTransfer(box) {
  const canShare = !!api.shareStart;
  const canCode = !!api.lanGet;
  box.innerHTML = `<h2>Szinkronizálás eszközök között <button class="help-link" data-help="transfer" title="Súgó">?</button></h2>
    <p class="muted">Asztali gép, Android TV és Android telefon között, a helyi hálózaton: az egyik eszköz ad egy kódot, a másikon beírod, és az átveszi annak beállításait (listák, profilok, kedvencek, előzmények, emlékeztetők, főoldal…).</p>
    ${
      canShare
        ? `<h3>1. Kód kérése – ennek az eszköznek a beállításait adom át</h3>
      <label class="setting"><span><b>Profilok, kedvencek, előzmények is</b></span><input type="checkbox" class="switch" data-tr="profiles" checked /></label>
      <label class="setting"><span><b>Kulcsok és jelszavak is</b><small>OpenSubtitles- és TMDB-adatok. Csak a saját, otthoni hálózatodon kapcsold be.</small></span><input type="checkbox" class="switch" data-tr="secrets" /></label>
      <div class="inline"><button class="btn primary" data-tr-act="share">Kód kérése</button><button class="btn" data-tr-act="stop" hidden>Leállítás</button></div>
      <div class="share-box" hidden></div>`
        : ''
    }
    <h3>${canShare ? '2. ' : ''}Szinkronizálás kóddal – a másik eszköz beállításait veszem át</h3>
    ${
      canCode
        ? `<div class="inline sync-row"><input class="input sync-code" data-tr-in="code" inputmode="numeric" maxlength="7" placeholder="123 456" autocomplete="off" aria-label="Kód" /><button class="btn primary" data-tr-act="sync">Szinkronizálás</button></div>
    <label class="setting"><span><b>Csak a profilok</b><small>A mostani beállítások, listák és profilok megmaradnak; a beérkező profilok hozzáadódnak (ami már megvan, frissül).</small></span>
      <input type="checkbox" class="switch" data-tr="onlyProfiles" /></label>
    <p class="muted small tr-status" aria-live="polite"></p>`
        : '<p class="muted">Ezen a felületen a kódos szinkron nem érhető el (csak az asztali és az Android-alkalmazásban).</p>'
    }
    <details class="tr-adv"><summary>Haladó: cím megadása vagy mentés betöltése webcímről</summary>
      <p class="muted small">Ha a két eszköz más alhálózaton van, add meg a másik eszköz címét is (a kódot kérő eszköz kiírja). Webcímről (pl. a NAS-ra tett mentésből) is betöltheted: ilyenkor a teljes címet írd be, kód nélkül.</p>
      <div class="form-row">
        <label class="setting col"><span><b>Cím</b></span><input class="input" data-tr-in="addr" value="${esc(lastAddr())}" placeholder="pl. 192.168.1.20 vagy https://…/adas-mentes.json" autocomplete="off" /></label>
        <label class="setting col"><span><b>Kód</b></span><input class="input" data-tr-in="code2" inputmode="numeric" maxlength="7" placeholder="123 456" autocomplete="off" /></label>
      </div>
      <div class="inline"><button class="btn" data-tr-act="fetch">Átvétel</button><span class="muted small tr-status2"></span></div>
    </details>`;

  const status = box.querySelector('.tr-status');
  const status2 = box.querySelector('.tr-status2');
  const onlyProfiles = () => !!box.querySelector('[data-tr="onlyProfiles"]')?.checked;
  const digits = (s) => String(s || '').replace(/\D/g, '');
  box.onclick = async (e) => {
    const a = e.target.closest('[data-tr-act]')?.dataset.trAct;
    if (!a) return;
    e.stopPropagation();
    if (a === 'share') {
      const opts = { profiles: box.querySelector('[data-tr="profiles"]').checked, secrets: box.querySelector('[data-tr="secrets"]').checked };
      try {
        const r = await api.shareStart(await payload(opts));
        const sb = box.querySelector('.share-box');
        sb.hidden = false;
        box.querySelector('[data-tr-act="stop"]').hidden = false;
        const draw = () => {
          const left = Math.max(0, r.expires - Date.now());
          if (!left || !box.isConnected || sb.hidden) {
            clearInterval(shareTimer);
            if (box.isConnected && !left) {
              sb.innerHTML = '<p class="muted">A kód lejárt.</p>';
              box.querySelector('[data-tr-act="stop"]').hidden = true;
            }
            return;
          }
          sb.innerHTML = `<div class="share-code">${esc(fmtCode(r.code))}</div>
            <div>Írd be ezt a kódot a másik eszközön: Beállítások → Szinkron eszközök között → <i>Szinkronizálás kóddal</i>.</div>
            <div class="muted small">Még ${Math.floor(left / 60000)}:${String(Math.floor((left % 60000) / 1000)).padStart(2, '0')} percig érvényes. Az eszköz címe: ${r.addresses.length ? r.addresses.map((ip) => `<code>${esc(ip)}${r.port === 47800 ? '' : ':' + r.port}</code>`).join(' vagy ') : '<i>nem található hálózati cím</i>'}${api.platform === 'electron' || !api.platform ? ' · Első alkalommal a Windows tűzfal engedélyt kérhet – engedélyezd a magánhálózaton.' : ''}</div>`;
        };
        clearInterval(shareTimer);
        shareTimer = setInterval(draw, 1000);
        draw();
      } catch (err) {
        toast('A kód nem készült el: ' + errText(err));
      }
    } else if (a === 'stop') {
      await api.shareStop();
      clearInterval(shareTimer);
      box.querySelector('.share-box').hidden = true;
      box.querySelector('[data-tr-act="stop"]').hidden = true;
    } else if (a === 'sync') {
      const code = digits(box.querySelector('[data-tr-in="code"]').value);
      if (code.length !== 6) return (status.textContent = 'A kód 6 számjegy (pl. 123 456).');
      const btn = e.target.closest('button');
      btn.disabled = true;
      try {
        const { data, from } = await fetchByCode(code, (t) => (status.textContent = t));
        if (!data.app) data.app = 'adas';
        status.textContent = '';
        await applyData(data, from, { profilesOnly: onlyProfiles() });
      } catch (err) {
        status.textContent = 'Hiba: ' + errText(err);
      } finally {
        btn.disabled = false;
      }
    } else if (a === 'fetch') {
      const addr = box.querySelector('[data-tr-in="addr"]').value.trim();
      const code = digits(box.querySelector('[data-tr-in="code2"]').value);
      if (!addr) return (status2.textContent = 'Add meg a címet.');
      status2.textContent = 'Kapcsolódás…';
      try {
        let data;
        if (/^https?:\/\/.+\.json(\?|$)/i.test(addr) || (/^https?:\/\//i.test(addr) && !code)) data = await getJson(addr);
        else {
          if (!/^(\d{4}|\d{6})$/.test(code)) return (status2.textContent = 'A kód 6 számjegy.');
          data = await fetchShared(addr, code);
        }
        if (!data.app) data.app = 'adas'; // régebbi, fájlba mentett beállítás
        try {
          localStorage.setItem('adas-share-addr', addr);
        } catch {}
        status2.textContent = '';
        await applyData(data, addr, { profilesOnly: onlyProfiles() });
      } catch (err) {
        status2.textContent = 'Hiba: ' + errText(err);
      }
    }
  };
  box.querySelector('[data-tr-in="code"]')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      box.querySelector('[data-tr-act="sync"]').click();
    }
  });
}

function lastAddr() {
  try {
    return localStorage.getItem('adas-share-addr') || '';
  } catch {
    return '';
  }
}

if (api.onShareUsed) api.onShareUsed((s) => toast(`A beállításokat átvette egy eszköz (${String(s.from || '').replace('::ffff:', '')}).`, { timeout: 8000 }));
if (api.onShareLocked) api.onShareLocked(() => toast('Túl sok hibás kód érkezett – az átadás leállt. Kérj új kódot.', { timeout: 8000 }));
