// Állapot-pillanatkép: a beállítások mellett a külön tárban lévő nagy dokumentumok (fájlból felvett VOD-listák,
// kiegészítő csomagok szövege). A teljes mentés (fájlba), az átvitel másik eszközre és a napi mentési pont is
// ezt használja (B05). Felület nélküli modul – a mentés így körkörös UI-import nélkül éri el.
import { api } from './api.js';
import { packDocs, packDocKey, PACK_KINDS } from './packs.js';

// A profilok saját dokumentumai – (L02) a filmekhez kézzel választott feliratok szövege (subtitles.js: a „vodSubs”
// bejegyzés „doc” mezője, vagy régebbi / helyben írt bejegyzésnél a profil és a film szerinti kulcs) és a Főoldal saját
// háttérképe (homebg.js: a profil „homeBgDoc” mezője). → [{ key, set(újKulcs) }]
const SUB_KEY = /^subman:[^\n]{1,600}$/;
const BG_KEY = /^homebg:[^\n]{1,200}$/;
const profileDocRefs = (profiles) => {
  const out = [];
  for (const p of Array.isArray(profiles) ? profiles : []) {
    if (!p || typeof p !== 'object') continue;
    if (p.vodSubs && typeof p.vodSubs === 'object')
      for (const [film, v] of Object.entries(p.vodSubs)) {
        if (!v || typeof v !== 'object' || !v.manual) continue;
        const key = typeof v.doc === 'string' && SUB_KEY.test(v.doc) ? v.doc : `subman:${p.id || ''}:${film}`;
        if (SUB_KEY.test(key)) out.push({ key, set: (k) => (v.doc = k) });
      }
    if (p.homeBg === 'custom') {
      const key = typeof p.homeBgDoc === 'string' && BG_KEY.test(p.homeBgDoc) ? p.homeBgDoc : `homebg:${p.id || ''}`;
      if (BG_KEY.test(key)) out.push({ key, set: (k) => (p.homeBgDoc = k) });
    }
  }
  return out;
};

/** A profilok saját dokumentumainak kulcsai (kézi feliratok, háttérkép). */
export const profileDocKeys = (profiles) => profileDocRefs(profiles).map((r) => r.key);

/** A fájlból felvett nagy listák szövege külön tárban van – a mentésbe ezeket is beletesszük. */
export async function attachDocs(data) {
  const docs = {};
  for (const p of data.settings?.vodCustom || []) {
    // csak a fájlból felvett listák szövege – egy (importált) lista ne hivatkozhasson más tárolt dokumentumra
    if (typeof p?.textKey !== 'string' || !/^vodtext:[\w-]+$/.test(p.textKey)) continue;
    // (olvasási hiba: kivétel – a hiányos pillanatkép ne szorítsa ki az utolsó teljeset; a hiányzó lista null)
    const v = await api.docGet?.(p.textKey, { strict: true });
    if (v && typeof v.text === 'string') docs[p.textKey] = v;
  }
  // a kiegészítő csomagok (tévé és VOD) is mennek – így a másik eszközön is megjelennek
  Object.assign(docs, await packDocs(data.settings));
  // (L02) a kézi feliratok szövege és a saját háttérkép is (a választás a profilban van – nélküle a másik eszközön üres lenne)
  for (const r of profileDocRefs(data.profiles)) {
    // (a hivatkozás a bejegyzésbe kerül: a másik eszközön a profil azonosítója más is lehet)
    if (!docs[r.key]) {
      const v = await api.docGet?.(r.key, { strict: true });
      if (v && typeof v.text === 'string') docs[r.key] = v;
    }
    if (docs[r.key]) r.set(r.key);
  }
  if (Object.keys(docs).length) data.docs = docs;
  return data;
}

/**
 * A mentésben érkezett listaszövegek előkészítése (B31): mindegyik ÚJ kulcsra íródik, és a beállítások
 * hivatkozásai (saját VOD-lista textKey, csomag doc) erre mutatnak át. A régi dokumentumok érintetlenek, így
 * ha bármelyik írás – vagy utána a beállítások cseréje – nem sikerül, a régi állapot teljes egészében megmarad
 * (dropDocs törli a már megírt új példányokat). → { written: [új kulcsok] }
 */
const DOC_KEY = /^(?:(vodtext|vodpack|tvpack|radiopack):[\w-]+|subman:[^\n]{1,600}|homebg:[^\n]{1,200})$/;
let stageSerial = 0;
export async function stageDocs(data) {
  const docs = data.docs || {};
  delete data.docs;
  // (műveletenként egyedi: két gyors, akár egyidejű hívás sem kaphatja ugyanazt a kulcsot – különben az egyik
  // sikertelen cseréje utáni takarítás a másik még hivatkozott dokumentumát törölné)
  const stamp = `${Date.now().toString(36)}${(stageSerial++).toString(36)}${Math.random().toString(36).slice(2, 8)}`;
  const map = {};
  const written = [];
  try {
    for (const [k, v] of Object.entries(docs)) {
      if (!DOC_KEY.test(k) || !v || typeof v.text !== 'string') continue;
      // (saját, egyedi jelölő: „--v<időbélyeg>” – egy korábbi ilyen utótag nem halmozódik, és egy valódi
      // azonosító-végződés, pl. „-radio”, nem tévesztődik vele össze; azonos új kulcs nem jöhet létre kétszer)
      let nk = `${k.replace(/--v[0-9a-z]+(?:-\d+)?$/, '')}--v${stamp}`;
      for (let n = 2; Object.values(map).includes(nk); n++) nk = `${k.replace(/--v[0-9a-z]+(?:-\d+)?$/, '')}--v${stamp}-${n}`;
      await api.docSet?.(nk, v);
      written.push(nk);
      map[k] = nk;
    }
  } catch (err) {
    await dropDocs(written);
    throw err;
  }
  for (const p of data.settings?.vodCustom || []) if (p && map[p.textKey]) p.textKey = map[p.textKey];
  for (const [kind, k] of Object.entries(PACK_KINDS)) for (const p of data.settings?.[k.setting] || []) if (p && map[packDocKey(kind, p)]) p.doc = map[packDocKey(kind, p)];
  // (a profilok saját dokumentumai is az új példányra mutatnak – a profil azonosítójától függetlenül)
  for (const r of profileDocRefs(data.profiles)) if (map[r.key]) r.set(map[r.key]);
  return { written };
}
/** A stageDocs által megírt új példányok törlése (sikertelen csere után). */
export const dropDocs = (keys) => Promise.all((keys || []).map((k) => Promise.resolve(api.docSet?.(k, null)).catch(() => {})));

/**
 * Sikeres csere után a régi beállítások által hivatkozott, de az újakban már nem szereplő dokumentumok törlése
 * (a stageDocs új kulcsokra írt – a régi példányok különben örökre a tárban maradnának).
 */
export function dropUnreferenced(oldSettings, newSettings, alsoKeep = []) {
  const keep = new Set([...referencedDocKeys(newSettings).map((r) => r.key), ...alsoKeep]);
  return dropDocs(referencedDocKeys(oldSettings).map((r) => r.key).filter((k) => !keep.has(k)));
}

/** A beállítások által hivatkozott dokumentumkulcsok: saját VOD-listák szövege és a csomagok. → [{ key, name }] */
export function referencedDocKeys(settings) {
  const out = [];
  for (const p of settings?.vodCustom || []) if (typeof p?.textKey === 'string' && /^vodtext:[\w-]+$/.test(p.textKey)) out.push({ key: p.textKey, name: p.name || p.textKey });
  for (const [kind, k] of Object.entries(PACK_KINDS)) for (const p of settings?.[k.setting] || []) if (p?.id) out.push({ key: packDocKey(kind, p), name: p.name || p.id });
  return out;
}
