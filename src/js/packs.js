// Kiegészítő csomagok (.adaspack): a programmal NEM szállított, helyben betöltött listák, amelyek
// beépítettként jelennek meg – tévécsatornák (Csatornalisták) vagy filmek / sorozatok (VOD-listák).
// Így egyetlen build van; a tartalom csak ott létezik, ahová a csomagot betöltötték (fájlból, az asztali
// „packs” mappából, vagy mentéssel / átvitellel egy másik eszközről).
//
// Formátum (UTF-8 JSON), a teljes leírás: docs/ADASPACK.md
//   { "adasPack": 1, "kind": "tv" | "vod", "id": "pelda", "name": "Példa", "desc": "…", "off": false,
//     "text": "#EXTM3U\n…" }
// Fájlnév: <azonosító>_tv.adaspack vagy <azonosító>_vod.adaspack (a „kind” hiányában a fájlnév vége dönt).
import { api } from './api.js';
import { store, VOD_BUILTIN, BUILTIN_PLAYLISTS } from './store.js';
import { parseM3U } from './catalog.js';
import { bus, toast } from './util.js';

export const PACK_KINDS = {
  tv: { setting: 'tvPacks', doc: 'tvpack:', label: 'tévécsatorna-csomag' },
  vod: { setting: 'vodPacks', doc: 'vodpack:', label: 'VOD-csomag' },
};
export const PACK_EXT = /\.adaspa(c)?k$/i; // (.adaspack, elírva .adaspak is)
const MAX_TEXT = 60e6;

/** A betöltött csomagok egy fajtából, listaként (a szövegük a tartós tárban van). */
export const packsOf = (kind) => (store.settings[PACK_KINDS[kind].setting] || []).map((p) => ({ ...p, kind, textKey: PACK_KINDS[kind].doc + p.id, pack: true }));

/** A fajta a fájlnévből: …_tv.adaspack / …_vod.adaspack */
const kindFromName = (name) => (/_tv\.adaspa(c)?k$/i.test(name || '') ? 'tv' : /_vod\.adaspa(c)?k$/i.test(name || '') ? 'vod' : '');

/**
 * Csomagfájl ellenőrzése → { kind, id, name, desc, off, text } vagy { error }.
 * A hiba szövege a felhasználónak szól (mi a gond a fájllal).
 */
export function parsePack(text, fileName = '') {
  let j;
  try {
    j = JSON.parse(String(text || '').replace(/^﻿/, ''));
  } catch {
    return { error: 'nem érvényes JSON' };
  }
  if (j?.adasPack !== 1) return { error: 'hiányzik az "adasPack": 1 jelölés' };
  const kind = j.kind || kindFromName(fileName) || 'vod';
  if (!PACK_KINDS[kind]) return { error: `ismeretlen fajta: "${kind}" (tv vagy vod lehet)` };
  if (!/^[a-z0-9_-]{1,40}$/i.test(j.id || '')) return { error: 'az "id" csak betűt, számot, - és _ jelet tartalmazhat (legfeljebb 40)' };
  if (typeof j.text !== 'string' || !j.text.trim()) return { error: 'hiányzik a "text" (a lejátszólista szövege)' };
  if (j.text.length > MAX_TEXT) return { error: 'túl nagy (legfeljebb 60 MB)' };
  // beépített listát nem írhat felül
  if ((kind === 'vod' ? VOD_BUILTIN : BUILTIN_PLAYLISTS).some((b) => b.id === j.id)) return { error: `az "${j.id}" azonosító foglalt (beépített lista)` };
  if (!parseM3U(j.text).entries.length) return { error: 'a lejátszólistában nincs lejátszható bejegyzés' };
  return { kind, id: j.id, name: String(j.name || j.id).slice(0, 80), desc: String(j.desc || '').slice(0, 600), off: !!j.off, text: j.text };
}

export async function installPack(pk) {
  if (!api.docSet) throw new Error('Ezen az eszközön nem tárolható kiegészítő csomag.');
  const k = PACK_KINDS[pk.kind];
  await api.docSet(k.doc + pk.id, { text: pk.text });
  const s = store.settings;
  const meta = { id: pk.id, name: pk.name, desc: pk.desc, off: pk.off, size: pk.text.length, at: Date.now() };
  s[k.setting] = [...(s[k.setting] || []).filter((p) => p.id !== pk.id), meta];
  store.save();
  bus.emit('packs', pk.kind);
  return meta;
}

export async function removePack(kind, id) {
  const k = PACK_KINDS[kind];
  const s = store.settings;
  s[k.setting] = (s[k.setting] || []).filter((p) => p.id !== id);
  store.save();
  await api.docSet?.(k.doc + id, null);
  bus.emit('packs', kind);
}

/** Csomagok betöltése a kiválasztott fájlokból → { ok: [{kind,name}], bad: [{file, error}] } */
export async function importPackFiles(files) {
  const ok = [];
  const bad = [];
  for (const f of files) {
    const text = typeof f.text === 'string' ? f.text : new TextDecoder().decode(f.bytes || new Uint8Array());
    const pk = parsePack(text, f.name);
    if (pk.error) {
      bad.push({ file: f.name, error: pk.error });
      continue;
    }
    try {
      await installPack(pk);
      ok.push({ kind: pk.kind, name: pk.name });
    } catch (err) {
      bad.push({ file: f.name, error: String(err.message || err) });
    }
  }
  return { ok, bad };
}

/** Fájlválasztó → betöltés → visszajelzés (bármelyik beállítási részből; a fajtát a csomag dönti el). */
export async function pickAndImportPacks() {
  const filters = [{ name: 'Adás kiegészítő csomag (.adaspack)', extensions: ['adaspack', 'adaspak'] }];
  const picked = api.openFiles ? await api.openFiles(filters) : [await api.openFile(filters)].filter(Boolean);
  if (!picked?.length) return null;
  const res = await importPackFiles(picked);
  for (const b of res.bad) toast(`„${b.file}” nem tölthető be: ${b.error}.`, { timeout: 9000 });
  if (res.ok.length) {
    const where = [...new Set(res.ok.map((x) => (x.kind === 'tv' ? 'Csatornalisták' : 'VOD és médiatár')))].join(' és a ');
    toast(`Betöltve: ${res.ok.map((x) => `„${x.name}”`).join(', ')}. A ${where} beépített listái között kapcsolhatod be / ki.`, { timeout: 8000 });
  }
  return res;
}

/** Asztali változat: a „packs” mappában talált csomagok betöltése (új vagy megváltozott) → { tv, vod } darabszám */
export async function syncPackFolder() {
  const n = { tv: 0, vod: 0 };
  if (!api.packsScan) return n;
  for (const f of await api.packsScan().catch(() => [])) {
    const pk = parsePack(f.text, f.name);
    if (pk.error) {
      console.warn('Kiegészítő csomag', f.name, pk.error);
      continue;
    }
    const cur = (store.settings[PACK_KINDS[pk.kind].setting] || []).find((p) => p.id === pk.id);
    if (cur && cur.size === pk.text.length && cur.name === pk.name && cur.desc === pk.desc) continue;
    try {
      await installPack(pk);
      n[pk.kind]++;
    } catch {
      // hibás csomag: kimarad
    }
  }
  return n;
}

/** A mentéshez / átvitelhez: a csomagok szövegei (dokumentumkulcs → érték). */
export async function packDocs(settings) {
  const docs = {};
  for (const k of Object.values(PACK_KINDS)) {
    for (const p of settings?.[k.setting] || []) {
      const v = await api.docGet?.(k.doc + p.id).catch(() => null);
      if (v) docs[k.doc + p.id] = v;
    }
  }
  return docs;
}
