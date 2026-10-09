// Szinkronizálás eszközök között (asztali, Android TV, Android telefon), a helyi hálózaton:
//  - bármelyik eszköz 12 jegyű kódot ad (a címe utolsó száma + 9 jegyű titok), és elérhetővé teszi a
//    beállításait – titkosítva: a titok nem megy át a hálózaton, csak a belőle származtatott azonosító;
//  - a másik eszközön csak a kódot beírva megkeresi és egy lépésben átveszi:
//    listák, profilok, kedvencek, előzmények, emlékeztetők, (kérésre) kulcsok és jelszavak;
//  - webcímről (pl. NAS-ra vagy GitHubra tett mentésből) is betölthető.
import { esc, toast, errText, bus } from './util.js';
import { api } from './api.js';
import { store, cleanProfile } from './store.js';
import { confirmDialog } from './components.js';
import { packDocs } from './packs.js';

import { _t } from './i18n.js';
const SECRET_KEYS = ['osApiKey', 'osUser', 'osPass', 'osToken', 'subdlKey', 'tmdbKey', 'omdbKey', 'tsdbKey', 'remoteKey'];
let shareTimer = null;

/** A fájlból felvett nagy listák szövege külön tárban van – a mentésbe ezeket is beletesszük. */
export async function attachDocs(data) {
  const docs = {};
  for (const p of data.settings?.vodCustom || []) {
    // csak a fájlból felvett listák szövege – egy (importált) lista ne hivatkozhasson más tárolt dokumentumra
    if (typeof p?.textKey !== 'string' || !/^vodtext:[\w-]+$/.test(p.textKey)) continue;
    const v = await api.docGet?.(p.textKey).catch(() => null);
    if (v && typeof v.text === 'string') docs[p.textKey] = v;
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
  if (!data || data.app !== 'adas' || !data.settings) throw new Error(_t('A válasz nem Adás-beállítás.'));
  if (profilesOnly) return mergeProfiles(data, source);
  const what = [
    _t('a beállításokat és a listákat'),
    data.profiles ? `${_t('{length} profilt (kedvencekkel, előzményekkel)', { length: data.profiles.length })}` : '',
    SECRET_KEYS.some((k) => data.settings[k]) ? _t('a kulcsokat és jelszavakat') : '',
  ].filter(Boolean);
  const ok = await confirmDialog(`${_t('Átveszed {join} innen: {source}? A jelenlegi beállítások felülíródnak.', { join: what.join(', '), source })}`, {
    ok: _t('Átvétel'),
    danger: true,
  });
  if (!ok) return false;
  const cur = store.serialize();
  const settings = { ...data.settings };
  // A titkos adatok, ha nem jöttek át, maradnak a régiek – a hozzájuk tartozó kiszolgálócím is (egy importált
  // cím ne kaphassa meg a helyben megmaradt kulcsot és tokent).
  SECRET_KEYS.forEach((k) => {
    if (!(k in settings) && cur.settings[k]) settings[k] = cur.settings[k];
  });
  if (!('osToken' in data.settings)) settings.osBaseUrl = cur.settings.osBaseUrl || '';
  await restoreDocs(data);
  await store.replaceAll({
    version: data.version || 1,
    settings,
    profiles: data.profiles || cur.profiles,
    activeProfileId: data.profiles ? data.activeProfileId : cur.activeProfileId,
    health: store.health,
  });
  toast(_t('Beállítások átvéve – újraindítás…'));
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
  if (!incoming.length) throw new Error(_t('A mentésben nincs profil.'));
  const known = new Set(store.profiles.map((p) => p.id));
  const updated = incoming.filter((p) => known.has(p.id)).length;
  const ok = await confirmDialog(
    `${_t('Átveszed ezeket a profilokat innen: {source}?', { source })} ${incoming.map((p) => p.name).join(', ')}.` +
      (updated ? ` ${_t('Közülük {updated} már megvan ezen az eszközön – az frissül.', { updated })}` : '') +
      ` ${_t('A többi profil és a beállítások nem változnak.')}`,
    { ok: _t('Átvétel') }
  );
  if (!ok) return false;
  for (const p of incoming) {
    const i = store.profiles.findIndex((x) => x.id === p.id);
    // a beérkező profil mezői típus szerint rendbe téve (a HTML-sablonokba ne kerülhessen jelölőkód)
    if (i >= 0) store.profiles[i] = cleanProfile({ ...store.profiles[i], ...p });
    else store.profiles.push(cleanProfile({ ...p }));
  }
  store.flush();
  bus.emit('profile');
  toast(`${_t('{length} profil átvéve', { length: incoming.length })}`);
  return true;
}

/** Fájlból vagy más forrásból érkező mentés feldolgozása (a beállítások oldal is ezt használja). */
export const importData = (data, source, opts) => applyData(data, source, opts);

// ---------------------------------------------------------------------------
// Titkosított átadás. A titokból (9 számjegy) PBKDF2-vel származik a kérés azonosítója és az AES-GCM kulcs:
// a hálózaton csak az azonosító és a titkosított adat látszik, a kód (és így a kulcs) nem.
// ---------------------------------------------------------------------------
const SHARE_ENC = 'adas-share-v2';
const SHARE_ITER = 310000;
const te = new TextEncoder();
const toB64 = (u8) => {
  let s = '';
  for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000));
  return btoa(s);
};
const fromB64 = (s) => Uint8Array.from(atob(String(s || '')), (c) => c.charCodeAt(0));

async function shareKeys(secret) {
  const base = await crypto.subtle.importKey('raw', te.encode(secret), 'PBKDF2', false, ['deriveBits']);
  const bits = new Uint8Array(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: te.encode(SHARE_ENC), iterations: SHARE_ITER }, base, 384));
  const key = await crypto.subtle.importKey('raw', bits.slice(0, 32), 'AES-GCM', false, ['encrypt', 'decrypt']);
  const id = [...bits.slice(32)].map((b) => b.toString(16).padStart(2, '0')).join('');
  return { key, id };
}

/** → { secret, id, env } – env: a kiszolgálóra kerülő, titkosított csomag */
/** Egyenletes véletlen egész 0…n-1 (visszautasításos mintavétel – a maradékos osztás torzítana). */
function randInt(n) {
  const lim = Math.floor(0x100000000 / n) * n;
  for (;;) {
    const v = crypto.getRandomValues(new Uint32Array(1))[0];
    if (v < lim) return v % n;
  }
}

async function sealShare(data) {
  const secret = String(randInt(1e9)).padStart(9, '0');
  const { key, id } = await shareKeys(secret);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, te.encode(JSON.stringify(data))));
  return { secret, id, env: { app: 'adas', enc: SHARE_ENC, iv: toB64(iv), ct: toB64(ct) } };
}

async function openShare(env, key) {
  if (env?.enc !== SHARE_ENC) throw new Error(_t('A válasz nem titkosított Adás-átadás.'));
  try {
    const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: fromB64(env.iv) }, key, fromB64(env.ct));
    return JSON.parse(new TextDecoder().decode(pt));
  } catch {
    throw codeError(_t('Hibás vagy lejárt kód.'));
  }
}

async function getJson(url) {
  const r = await api.request({ url, headers: { Accept: 'application/json' } });
  if (r.status === 404) throw codeError(_t('Hibás vagy lejárt kód.'));
  if (r.status !== 200) throw new Error(`HTTP ${r.status}`);
  return JSON.parse(r.text);
}

const PORTS = [47800, 47801, 47802, 47803];
const fmtCode = (c) => c.replace(/(\d{3})(?=\d)/g, '$1 ');

/**
 * A beírt kódból a kérés útvonala és (titkosított átadásnál) a kulcs. 12 jegy: cím + titok (titkosított);
 * 6 jegy: régebbi változat (cím + 3 jegyű titok, titkosítás nélkül).
 */
async function codeAuth(code) {
  if (code.length === 12) {
    const { key, id } = await shareKeys(code.slice(3));
    return { path: `/adas/share/${id}`, key };
  }
  return { path: `/adas/share/${encodeURIComponent(code.slice(3))}`, key: null };
}
const unseal = async (data, key) => (key ? openShare(data, key) : data);

/**
 * Csak kóddal: a kód első 3 jegye a megosztó eszköz címének utolsó száma. A saját címünk első három
 * részével együtt ez megadja a címét; ha ott nem válaszol, a teljes helyi alhálózatot végignézzük.
 */
async function fetchByCode(code, onStatus) {
  const oct = Number(code.slice(0, 3));
  if (!(oct >= 1 && oct <= 254)) throw codeError(_t('Hibás kód.'));
  const ips = (await api.lanIps()) || [];
  const prefixes = [...new Set(ips.map((ip) => ip.split('.').slice(0, 3).join('.')))];
  if (!prefixes.length) throw new Error(_t('Ez az eszköz nincs helyi hálózaton.'));
  onStatus(_t('A kód ellenőrzése…'));
  const { path, key } = await codeAuth(code);
  const tryUrls = async (urls, timeout) => {
    const r = await api.lanGet(urls, timeout);
    if (r?.status === 200) return { data: await unseal(JSON.parse(r.text), key), from: new URL(r.url).hostname };
    if (r?.status === 404) throw codeError(_t('Hibás vagy lejárt kód.'));
    return null;
  };
  onStatus(_t('Az eszköz keresése…'));
  let got = await tryUrls(prefixes.flatMap((pre) => PORTS.map((p) => `http://${pre}.${oct}:${p}${path}`)), 3000);
  if (got) return got;
  // más címen (pl. több hálózati kártya): a teljes alhálózat a szokásos porton
  onStatus(_t('Keresés a helyi hálózaton…'));
  for (const pre of prefixes) {
    got = await tryUrls(Array.from({ length: 254 }, (_, i) => `http://${pre}.${i + 1}:${PORTS[0]}${path}`), 1500);
    if (got) return got;
  }
  throw new Error(_t('Nem található az eszköz. Ugyanazon a hálózaton van, fut rajta az Adás, és még érvényes a kód?'));
}

/** Hibás / lejárt kód (nem érdemes más portokon próbálkozni) – jelölve, nem az üzenet szövege alapján. */
const codeError = (msg) => Object.assign(new Error(msg), { badCode: true });

/** Cím + kód → a megosztó gép beállításai. A port nélküli címnél a szokásos portokat próbálja. */
async function fetchShared(addr, code) {
  addr = addr.trim().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
  const ports = /:\d+$/.test(addr) ? [''] : [':47800', ':47801', ':47802', ':47803'];
  // a cím mellé a teljes kód (12 vagy régebbi 6 jegy), vagy csak a titok része (9 jegy; 3 – régi)
  const { path, key } = await codeAuth(code.length === 9 || code.length === 3 ? '000' + code : code);
  let last;
  for (const p of ports) {
    try {
      return await unseal(await getJson(`http://${addr}${p}${path}`), key);
    } catch (err) {
      last = err;
      if (err.badCode) throw err;
    }
  }
  throw new Error(_t('A gép nem érhető el ({error}). Fut rajta az Adás, és el van indítva az átadás?', { error: last?.message || _t('nincs válasz') }));
}

export function renderTransfer(box) {
  const canShare = !!api.shareStart;
  const canCode = !!api.lanGet;
  box.innerHTML = `<h2>${_t('Szinkronizálás eszközök között')} <button class="help-link" data-help="transfer" title="${_t('Súgó')}">?</button></h2>
    <p class="muted">${_t('Asztali gép, Android TV és Android telefon között, a helyi hálózaton: az egyik eszköz ad egy kódot, a másikon beírod, és az átveszi annak beállításait (listák, profilok, kedvencek, előzmények, emlékeztetők, főoldal…).')}</p>
    ${canShare
        ? `<h3>${_t('1. Kód kérése – ennek az eszköznek a beállításait adom át')}</h3>
      <label class="setting"><span>${_t('<b>Profilok, kedvencek, előzmények is</b>')}</span><input type="checkbox" class="switch" data-tr="profiles" checked /></label>
      <label class="setting"><span>${_t('<b>Kulcsok és jelszavak is</b>')}<small>${_t('OpenSubtitles- és TMDB-adatok. Csak a saját, otthoni hálózatodon kapcsold be.')}</small></span><input type="checkbox" class="switch" data-tr="secrets" /></label>
      <div class="inline"><button class="btn primary" data-tr-act="share">${_t('Kód kérése')}</button><button class="btn" data-tr-act="stop" hidden>${_t('Leállítás')}</button></div>
      <div class="share-box" hidden></div>`
        : ''}
    <h3>${canShare ? '2. ' : ''}${_t('Szinkronizálás kóddal – a másik eszköz beállításait veszem át')}</h3>
    ${canCode
        ? `<div class="inline sync-row"><input class="input sync-code" data-tr-in="code" inputmode="numeric" maxlength="15" placeholder="123 456 789 012" autocomplete="off" aria-label="${_t('Kód')}" /><button class="btn primary" data-tr-act="sync">${_t('Szinkronizálás')}</button></div>
    <label class="setting"><span>${_t('<b>Csak a profilok</b>')}<small>${_t('A mostani beállítások, listák és profilok megmaradnak; a beérkező profilok hozzáadódnak (ami már megvan, frissül).')}</small></span>
      <input type="checkbox" class="switch" data-tr="onlyProfiles" /></label>
    <p class="muted small tr-status" aria-live="polite"></p>`
        : `<p class="muted">${_t('Ezen a felületen a kódos szinkron nem érhető el (csak az asztali és az Android-alkalmazásban).')}</p>`}
    <details class="tr-adv"><summary>${_t('Haladó: cím megadása vagy mentés betöltése webcímről')}</summary>
      <p class="muted small">${_t('Ha a két eszköz más alhálózaton van, add meg a másik eszköz címét is (a kódot kérő eszköz kiírja). Webcímről (pl. a NAS-ra tett mentésből) is betöltheted: ilyenkor a teljes címet írd be, kód nélkül.')}</p>
      <div class="form-row">
        <label class="setting col"><span>${_t('<b>Cím</b>')}</span><input class="input" data-tr-in="addr" value="${esc(lastAddr())}" placeholder="${_t('pl. 192.168.1.20 vagy https://…/adas-mentes.json')}" autocomplete="off" /></label>
        <label class="setting col"><span>${_t('<b>Kód</b>')}</span><input class="input" data-tr-in="code2" inputmode="numeric" maxlength="15" placeholder="123 456 789 012" autocomplete="off" /></label>
      </div>
      <div class="inline"><button class="btn" data-tr-act="fetch">${_t('Átvétel')}</button><span class="muted small tr-status2"></span></div>
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
        const sealed = await sealShare(await payload(opts));
        const r = await api.shareStart(sealed.env, sealed.id);
        r.code = r.code.slice(0, 3) + sealed.secret; // a titok csak a képernyőn látszik, a kiszolgáló nem ismeri
        const sb = box.querySelector('.share-box');
        sb.hidden = false;
        box.querySelector('[data-tr-act="stop"]').hidden = false;
        const draw = () => {
          const left = Math.max(0, r.expires - Date.now());
          if (!left || !box.isConnected || sb.hidden) {
            clearInterval(shareTimer);
            if (box.isConnected && !left) {
              sb.innerHTML = `<p class="muted">${_t('A kód lejárt.')}</p>`;
              box.querySelector('[data-tr-act="stop"]').hidden = true;
            }
            return;
          }
          sb.innerHTML = `<div class="share-code">${esc(fmtCode(r.code))}</div>
            <div>${_t('Írd be ezt a kódot a másik eszközön: Beállítások → Szinkron eszközök között → <i>Szinkronizálás kóddal</i>.')}</div>
            <div class="muted small">${_t('Még {floor}:{padStart} percig érvényes. Az eszköz címe:', { floor: Math.floor(left / 60000), padStart: String(Math.floor((left % 60000) / 1000)).padStart(2, '0') })} ${r.addresses.length ? r.addresses.map((ip) => `<code>${esc(ip)}${r.port === 47800 ? '' : ':' + r.port}</code>`).join(' vagy ') : `${_t('<i>nem található hálózati cím</i>')}`}${api.platform === 'electron' || !api.platform ? ` ${_t('· Első alkalommal a Windows tűzfal engedélyt kérhet – engedélyezd a magánhálózaton.')}` : ''}</div>`;
        };
        clearInterval(shareTimer);
        shareTimer = setInterval(draw, 1000);
        draw();
      } catch (err) {
        toast(`${_t('A kód nem készült el:')} ` + errText(err));
      }
    } else if (a === 'stop') {
      await api.shareStop();
      clearInterval(shareTimer);
      box.querySelector('.share-box').hidden = true;
      box.querySelector('[data-tr-act="stop"]').hidden = true;
    } else if (a === 'sync') {
      const code = digits(box.querySelector('[data-tr-in="code"]').value);
      if (code.length !== 12 && code.length !== 6) return (status.textContent = _t('A kód 12 számjegy (pl. 123 456 789 012).'));
      const btn = e.target.closest('button');
      btn.disabled = true;
      try {
        const { data, from } = await fetchByCode(code, (t) => (status.textContent = t));
        if (!data.app) data.app = 'adas';
        status.textContent = '';
        await applyData(data, from, { profilesOnly: onlyProfiles() });
      } catch (err) {
        status.textContent = `${_t('Hiba:')} ` + errText(err);
      } finally {
        btn.disabled = false;
      }
    } else if (a === 'fetch') {
      const addr = box.querySelector('[data-tr-in="addr"]').value.trim();
      const code = digits(box.querySelector('[data-tr-in="code2"]').value);
      if (!addr) return (status2.textContent = _t('Add meg a címet.'));
      status2.textContent = _t('Kapcsolódás…');
      try {
        let data;
        if (/^https?:\/\/.+\.json(\?|$)/i.test(addr) || (/^https?:\/\//i.test(addr) && !code)) data = await getJson(addr);
        else {
          if (!/^(\d{3}|\d{6}|\d{9}|\d{12})$/.test(code)) return (status2.textContent = _t('A kód 12 számjegy.'));
          data = await fetchShared(addr, code);
        }
        if (!data.app) data.app = 'adas'; // régebbi, fájlba mentett beállítás
        try {
          localStorage.setItem('adas-share-addr', addr);
        } catch {}
        status2.textContent = '';
        await applyData(data, addr, { profilesOnly: onlyProfiles() });
      } catch (err) {
        status2.textContent = `${_t('Hiba:')} ` + errText(err);
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

if (api.onShareUsed) api.onShareUsed((s) => toast(`${_t('A beállításokat átvette egy eszköz (')}${String(s.from || '').replace('::ffff:', '')}).`, { timeout: 8000 }));
if (api.onShareLocked) api.onShareLocked(() => toast(_t('Túl sok hibás kód érkezett – az átadás leállt. Kérj új kódot.'), { timeout: 8000 }));
