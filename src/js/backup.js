// Automatikus mentés: naponta egy mentési pont a beállításokról, profilokról, kedvencekről, előzményekről
// (az utolsó 7 marad meg), ezen az eszközön tárolva – egy kattintással visszaállítható.
import { toast, bus, esc } from './util.js';
import { api } from './api.js';
import { store, validateImport } from './store.js';
import { confirmDialog } from './components.js';
import { attachDocs, stageDocs, dropDocs, dropUnreferenced, referencedDocKeys } from './snapshot.js';

import { _t, LOCALE } from './i18n.js';
const KEY = 'backups';
const KEEP = 7;
const DAY = 24 * 3600e3;

/**
 * A mentési pontok. A valóban üres (még nem létező) tár üres lista; az olvashatatlan vagy sérült tár hibát ad
 * (B30), hogy a következő mentés ne írja felül a régi pontokat.
 */
async function list() {
  let v;
  try {
    v = await api.docGet?.(KEY, { strict: true });
  } catch (err) {
    // (az asztali híd előtagja nélkül: „A dokumentum nem olvasható (EPERM)”)
    throw new Error(String(err?.message || err).replace(/^Error invoking remote method '[^']+':\s*(Error:\s*)?/, ''));
  }
  if (v === undefined || v === null) return [];
  if (!Array.isArray(v.items)) throw Object.assign(new Error(_t('a mentéstár sérült')), { corrupt: true });
  return v.items;
}

/**
 * A régi (v1) mentési pontok által a közös tárból olvasott dokumentumkulcsok – egy import utáni takarítás ezeket
 * nem törölheti. Olvashatatlan mentéstárnál hibát ad (akkor a takarítás elmarad).
 */
export async function v1BackupDocKeys() {
  const items = await list();
  return items.filter((it) => !it.docs && it.data?.settings).flatMap((it) => referencedDocKeys(it.data.settings).map((r) => r.key));
}

// (B05) A mentési pont a beállítások mellett a külön tárolt listadokumentumok tartalmát is megőrzi (fájlból
// felvett VOD-listák, kiegészítő csomagok). A tartalom tartalom szerinti kulccsal, egyszer tárolódik
// („bkdoc:<ujjlenyomat>”) – a 7 napi pont nem hétszer tárolja ugyanazt a nagy listát –, a pont csak hivatkozik
// rá; a kiszoruló pontok már nem hivatkozott tartalma törlődik. Formátum: v: 2 (a régi, v1 pont is olvasható).
const FORMAT = 2;
const DOC_PREFIX = 'bkdoc:';
/** Tartalom-ujjlenyomat (két független FNV-1a + hossz; nem biztonsági célú, csak az azonos tartalom felismerésére). */
function fingerprint(text) {
  let a = 0x811c9dc5;
  let b = 0x01000193 ^ 0x5bd1e995;
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i);
    a = Math.imul(a ^ c, 0x01000193);
    b = Math.imul(b ^ c, 0x01000193) ^ (b >>> 15);
  }
  return (a >>> 0).toString(36) + (b >>> 0).toString(36) + text.length.toString(36);
}
const refsOf = (items) => new Set(items.flatMap((it) => Object.values(it.docs || {})));

// a mentéstár olvasás–módosítás–írás műveletei egymás után (két egyidejű mentés ne veszítsen pontot)
let chain = Promise.resolve();
export function backupNow(reason = 'auto') {
  const run = chain.then(async () => {
    if (!api.docSet) return false;
    const data = await attachDocs(JSON.parse(JSON.stringify(store.serialize())));
    delete data.health;
    data.app = 'adas';
    const old = await list(); // (hibánál nem írunk: a régi mentési pontok érintetlenek maradnak)
    // a dokumentumok tartalma külön, tartalom szerinti kulccsal (ami már megvan, nem íródik újra)
    const docs = {};
    const oldRefs = refsOf(old);
    const created = []; // (ebben a körben írt, még sehol nem hivatkozott tartalmak – hiba esetén törlődnek)
    let items;
    try {
      for (const [k, v] of Object.entries(data.docs || {})) {
        const h = fingerprint(v.text);
        docs[k] = h;
        const have = await api.docGet?.(DOC_PREFIX + h).catch(() => null);
        if (typeof have?.text !== 'string' || have.text !== v.text) {
          if (!oldRefs.has(h)) created.push(h);
          await api.docSet(DOC_PREFIX + h, { text: v.text });
        }
      }
      delete data.docs;
      items = [{ v: FORMAT, at: Date.now(), reason, profiles: (data.profiles || []).length, data, docs }, ...old].slice(0, KEEP);
      await api.docSet(KEY, { items });
    } catch (err) {
      await Promise.all(created.map((h) => Promise.resolve(api.docSet(DOC_PREFIX + h, null)).catch(() => {})));
      throw err;
    }
    // a kiszorult pontok már nem hivatkozott tartalma törlődik (a hivatkozott marad)
    const keep = refsOf(items);
    for (const h of refsOf(old)) if (!keep.has(h)) await Promise.resolve(api.docSet(DOC_PREFIX + h, null)).catch(() => {});
    store.settings.lastBackup = Date.now();
    store.save();
    return true;
  });
  chain = run.catch(() => {});
  return run;
}

/**
 * (X09) A régi (v1) pontok a közös dokumentumtárból olvasnak. Egy kulcs felülírása (pl. csomagfrissítés) előtt a rá
 * hivatkozó v1 pontok a mostani tartalommal tartalom szerinti (v2-es) hivatkozást kapnak – így a régi pontból a régi
 * tartalom áll vissza, nem a frissített. Hibánál (olvashatatlan tár, írási hiba) hibát ad: a hívó ilyenkor nem írhat
 * felül, a mentéstár és a dokumentumok a korábbi állapotban maradnak.
 */
export function preserveForV1(docKey) {
  const run = chain.then(async () => {
    if (!api.docSet) return;
    let items;
    try {
      items = await list();
    } catch (err) {
      // (sérült mentéstár: a pontjai úgysem állíthatók vissza – nincs mit megőrizni; olvasási hibánál viszont igen)
      if (err.corrupt) return;
      throw err;
    }
    const affected = items.filter((it) => !it.docs && it.data?.settings && referencedDocKeys(it.data.settings).some((r) => r.key === docKey));
    if (!affected.length) return;
    const oldRefs = refsOf(items);
    const created = [];
    try {
      const cur = new Map();
      for (const it of affected) {
        const docs = {};
        for (const r of referencedDocKeys(it.data.settings)) {
          // (szigorú olvasás: a hiba nem „hiányzó dokumentum” – a hívó ekkor nem írhat felül)
          if (!cur.has(r.key)) cur.set(r.key, await api.docGet?.(r.key, { strict: true }));
          const v = cur.get(r.key);
          if (typeof v?.text !== 'string') continue; // (ami most sincs meg, az a v2-es pontban is hiányzóként marad)
          const h = fingerprint(v.text);
          const have = await api.docGet?.(DOC_PREFIX + h).catch(() => null);
          if (typeof have?.text !== 'string' || have.text !== v.text) {
            await api.docSet(DOC_PREFIX + h, { text: v.text });
            if (!oldRefs.has(h)) created.push(h);
          }
          docs[r.key] = h;
        }
        it.docs = docs;
      }
      await api.docSet(KEY, { items });
    } catch (err) {
      await Promise.all(created.map((h) => Promise.resolve(api.docSet(DOC_PREFIX + h, null)).catch(() => {})));
      throw err;
    }
  });
  chain = run.catch(() => {});
  return run;
}

/**
 * A mentési pont adatai a dokumentumokkal együtt. → { data (data.docs-szal), missing: [hiányzó listák neve] }
 * A régi (v1) pontnál a hivatkozott dokumentumokat a mostani tárban keressük: ami nincs meg, az hiányzó.
 */
async function pointData(it) {
  const data = JSON.parse(JSON.stringify(it.data));
  const missing = [];
  const names = Object.fromEntries(referencedDocKeys(data.settings).map((r) => [r.key, r.name]));
  if (it.docs) {
    data.docs = {};
    for (const [k, h] of Object.entries(it.docs)) {
      const v = await api.docGet?.(DOC_PREFIX + h).catch(() => null);
      if (typeof v?.text === 'string' && fingerprint(v.text) === h) data.docs[k] = v;
      else {
        missing.push(names[k] || k);
        data.docs[k] = { text: '' }; // (üresen áll vissza – ne a mostani eszköz azonos kulcsú tartalma látsszon)
      }
    }
    // (a hivatkozott, de már a mentéskor sem meglévő lista is hiányzik – ez is üresen)
    for (const r of referencedDocKeys(data.settings)) {
      if (r.key in it.docs) continue;
      missing.push(r.name);
      data.docs[r.key] = { text: '' };
    }
  } else {
    for (const r of referencedDocKeys(data.settings)) {
      const v = await api.docGet?.(r.key).catch(() => null);
      if (typeof v?.text !== 'string') missing.push(r.name);
    }
  }
  return { data, missing };
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
    let items = [];
    let readErr = '';
    try {
      items = await list();
    } catch (err) {
      readErr = String(err?.message || err);
    }
    box.innerHTML = `<h3>${_t('Automatikus mentés')}</h3>
      <label class="setting"><span>${_t('<b>Napi mentési pont ezen az eszközön</b>')}<small>${_t('Az utolsó {KEEP} nap beállításai, profiljai, kedvencei és előzményei – ha valami elromlik vagy véletlenül törölsz, visszaállítható.', { KEEP })}</small></span>
        <input type="checkbox" class="switch" data-bk="on" ${store.settings.autoBackup === false ? '' : 'checked'} /></label>
      ${items.length
          ? `<ul class="src-list">${items
              .map((b, i) => `<li><span><b>${new Date(b.at).toLocaleString(LOCALE, { dateStyle: 'medium', timeStyle: 'short' })}</b><small>${b.reason === 'manual' ? _t('kézi mentés') : b.reason === 'before-restore' ? _t('visszaállítás előtti állapot') : _t('automatikus')} ${_t('· {profiles} profil', { profiles: b.profiles })}</small></span>
                <button class="btn small" data-bk-restore="${i}">${_t('Visszaállítás')}</button></li>`)
              .join('')}</ul>`
          : readErr
            ? `<p class="small warn-note">${esc(_t('A mentési pontok most nem olvashatók ({x}). Új mentés nem írja felül őket, amíg ez fennáll.', { x: readErr }))}</p>`
            : `<p class="muted small">${_t('Még nincs mentési pont.')}</p>`}
      <div class="inline"><button class="btn small" data-bk="now">${_t('Mentés most')}</button></div>`;
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
      try {
        await backupNow('manual');
        toast(_t('Mentési pont elkészült'));
      } catch (err) {
        toast(_t('A mentési pont nem készült el: {x}', { x: err?.message || err }), { timeout: 9000 });
      }
      draw();
    } else if (b.dataset.bkRestore !== undefined) {
      e.stopPropagation();
      const it = box._items[Number(b.dataset.bkRestore)];
      if (!it) return;
      const when = new Date(it.at).toLocaleString(LOCALE, { dateStyle: 'medium', timeStyle: 'short' });
      const ok = await confirmDialog(_t('Visszaállítod a(z) {when} állapotot? A mostani beállítások felülíródnak (előtte erről is készül mentési pont).', { when }), { ok: _t('Visszaállítás'), danger: true });
      if (!ok) return;
      let staged = null;
      try {
        // (előbb az ellenőrzés: hibás pontnál ne készüljön előzetes mentés, ami a legrégebbi pontot kiszorítaná)
        validateImport(it.data);
        const { data: full, missing } = await pointData(it);
        // hiányzó listatartalom: a felhasználó dönt (a beállítások visszaállnak, a hiányzó listák üresek maradnak)
        if (missing.length && !(await confirmDialog(_t('Ebből a mentési pontból {n} lista tartalma hiányzik ({names}). Ezek a visszaállítás után üresek lesznek. Így is visszaállítod?', { n: missing.length, names: missing.slice(0, 5).join(', ') }), { ok: _t('Visszaállítás'), danger: true }))) return;
        const data = validateImport(full);
        await backupNow('before-restore');
        staged = await stageDocs(data); // (új kulcsokra: hiba esetén a mostani listák érintetlenek – B31)
        const before = JSON.parse(JSON.stringify(store.settings));
        await store.replaceAll({ ...data, health: store.health });
        // (a régiek a „visszaállítás előtti” pontban megvannak; a régi – v1 – pontok dokumentumai maradnak – H39;
        // olvashatatlan mentéstárnál nincs takarítás, és a takarítás hibája már nem vonja vissza a visszaállítást)
        await v1BackupDocKeys()
          .then((keep) => dropUnreferenced(before, data.settings, keep))
          .catch(() => {});
      } catch (err) {
        if (staged) await dropDocs(staged.written);
        // (a mostani állapot használható marad, a további mentések is működnek)
        toast(_t('A visszaállítás nem sikerült: {x}', { x: err?.message || err }), { timeout: 9000 });
        return;
      }
      toast(_t('Visszaállítva – újraindítás…'));
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
