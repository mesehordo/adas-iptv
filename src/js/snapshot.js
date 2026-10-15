// Állapot-pillanatkép: a beállítások mellett a külön tárban lévő nagy dokumentumok (fájlból felvett VOD-listák,
// kiegészítő csomagok szövege). A teljes mentés (fájlba), az átvitel másik eszközre és a napi mentési pont is
// ezt használja (B05). Felület nélküli modul – a mentés így körkörös UI-import nélkül éri el.
import { api } from './api.js';
import { packDocs, packDocKey, PACK_KINDS } from './packs.js';

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

/**
 * A mentésben érkezett listaszövegek előkészítése (B31): mindegyik ÚJ kulcsra íródik, és a beállítások
 * hivatkozásai (saját VOD-lista textKey, csomag doc) erre mutatnak át. A régi dokumentumok érintetlenek, így
 * ha bármelyik írás – vagy utána a beállítások cseréje – nem sikerül, a régi állapot teljes egészében megmarad
 * (dropDocs törli a már megírt új példányokat). → { written: [új kulcsok] }
 */
const DOC_KEY = /^(vodtext|vodpack|tvpack|radiopack):[\w-]+$/;
export async function stageDocs(data) {
  const docs = data.docs || {};
  delete data.docs;
  const stamp = Date.now().toString(36);
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
  return { written };
}
/** A stageDocs által megírt új példányok törlése (sikertelen csere után). */
export const dropDocs = (keys) => Promise.all((keys || []).map((k) => Promise.resolve(api.docSet?.(k, null)).catch(() => {})));

/**
 * Sikeres csere után a régi beállítások által hivatkozott, de az újakban már nem szereplő dokumentumok törlése
 * (a stageDocs új kulcsokra írt – a régi példányok különben örökre a tárban maradnának).
 */
export function dropUnreferenced(oldSettings, newSettings) {
  const keep = new Set(referencedDocKeys(newSettings).map((r) => r.key));
  return dropDocs(referencedDocKeys(oldSettings).map((r) => r.key).filter((k) => !keep.has(k)));
}

/** A beállítások által hivatkozott dokumentumkulcsok: saját VOD-listák szövege és a csomagok. → [{ key, name }] */
export function referencedDocKeys(settings) {
  const out = [];
  for (const p of settings?.vodCustom || []) if (typeof p?.textKey === 'string' && /^vodtext:[\w-]+$/.test(p.textKey)) out.push({ key: p.textKey, name: p.name || p.textKey });
  for (const [kind, k] of Object.entries(PACK_KINDS)) for (const p of settings?.[k.setting] || []) if (p?.id) out.push({ key: packDocKey(kind, p), name: p.name || p.id });
  return out;
}
