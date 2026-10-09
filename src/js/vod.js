// Filmek és sorozatok (VOD): M3U / M3U8 listákból (akár egész GitHub-tárhelyből) betöltött
// filmek és sorozatok felismerése, böngészése, adatlapja, lejátszása folytatással.
import { $, $$, esc, html, norm, hashHue, toast, bus, debounce, seededShuffle, errText } from './util.js';
import { api } from './api.js';
import { store, VOD_BUILTIN, refreshHoursOf, DEFAULT_REFRESH_HOURS, setRefreshHours } from './store.js';
import { parseM3U, catalog, isLiveEntry, setVodLive } from './catalog.js';
import { ICON, openModal, confirmDialog, promptDialog, emptyState, rowTitleHtml, seeAllHtml, rowOrderEditor, progressiveTrack, refreshSelectHtml } from './components.js';
import { player } from './player.js';
import { filmInfo, infoBoxHtml, metaPaused, posters, titleInfo, posterCandidates } from './meta.js';
import { isZip, unzip, bytesToText } from './unzip.js';
import { packsOf, pickAndImportPacks, promptImportPackUrl, removePack } from './packs.js';
import { kidsAllowed, isKidsVod, setKidsMark } from './kids.js';
import { allowOutsidePlayback } from './watchtime.js';

// A felismerés változásakor növelni kell, hogy a régi feldolgozott mentés ne töltődjön be.
import { _t, lang, LOCALE } from './i18n.js';
const VOD_CACHE_VERSION = 8;
const newId = () => Math.random().toString(36).slice(2, 10);
const isUrl = (u) => /^https?:\/\/\S+$/i.test(u || '');

/**
 * Médiatár: a „Filmek és sorozatok” (vod) és a „Saját” (own, pl. NAS) részleg ugyanígy működik,
 * csak más listákból tölt és külön adatkészlete van.
 */
function makeLib(id, opts) {
  return {
    id,
    movies: [],
    series: [],
    byId: new Map(),
    groups: [], // [{ name, count }]
    counts: {}, // lista azonosító -> elemszám
    errors: {}, // lista azonosító -> hibaüzenet
    loadedAt: 0,
    ready: false,
    loading: null,
    ...opts,
  };
}

export const vod = makeLib('vod', {
  route: '#/vod',
  title: 'VOD',
  settingsSection: 'vodlists',
  idPrefix: '',
  maxAgeHours: 6,
});

export const own = makeLib('own', {
  route: '#/own',
  title: _t('Saját médiatár'),
  settingsSection: 'ownlists',
  idPrefix: 'o', // az azonosítók (és a megtekintési állapot) ne keveredjenek a másik részleggel
  maxAgeHours: 0.25, // a NAS-on gyakran változik
  files: [], // a forrásokban talált lejátszólisták: { key, src, name, rel, loc, base, kind }
  scanErrors: {}, // forrás azonosító -> hibaüzenet
});

const LIBS = [vod, own];
export const findItem = (id) => vod.byId.get(id) || own.byId.get(id);

// ---------------------------------------------------------------------------
// Film vagy sorozat? – epizódjelölők a címben
// ---------------------------------------------------------------------------
const EPISODE_PATTERNS = [
  // S01E02, S1 E2, S04.E23, s1-e2
  { re: /\bS(\d{1,2})\s*[.\-_ ]?\s*E[Pp]?\s*(\d{1,4})\b/i, s: 1, e: 2 },
  // 1x02
  { re: /\b(\d{1,2})x(\d{1,3})\b/, s: 1, e: 2 },
  // Season 2 Episode 5 / 2. évad 5. rész / Staffel 2 Folge 5 / Saison 2 Épisode 5
  { re: /(?:Season|Staffel|Saison|Temporada|Stagione)\s*(\d{1,2})\D{0,12}?(?:Episode|Ep\.?|Folge|[ÉE]pisode|Episodio|Cap[ií]tulo)\s*(\d{1,4})/i, s: 1, e: 2 },
  { re: /(\d{1,2})\.\s*évad\D{0,6}?(\d{1,4})\.\s*rész/i, s: 1, e: 2 },
  // Episode 5 / Ep. 5 / Folge 5 / 5. rész / 第5集 / 第5話
  // (a „Part 2 - 01” formánál a Part az évadfél jele, a rész száma a kötőjel utáni)
  { re: /\b(?:Episode|Ep\.?|Folge|[ÉE]pisode|Episodio|Cap[ií]tulo|Part)\s*#?(\d{1,4})\b(?!\s*[-–:]\s*\d)/i, e: 1 },
  { re: /(\d{1,4})\.\s*rész\b/i, e: 1 },
  { re: /第\s*(\d{1,4})\s*[集話话回]/, e: 1 },
  // „Cím - 01 [CRC]” (gyakori anime-fájlnév): a cím végén, kötőjel után álló sorszám – utolsóként,
  // hogy pl. a „3. rész - 1812” alcím évszáma ne legyen részszám
  { re: /\s[-–]\s(\d{1,4})(?:v\d)?(?=\s*(?:\[[^\]]*\]\s*|\([^)]*\)\s*)*$)/, e: 1 },
];

/** Epizód felismerése: { season, episode, series, epTitle } vagy null (film). */
export function parseEpisode(title) {
  for (const p of EPISODE_PATTERNS) {
    const m = p.re.exec(title);
    if (!m) continue;
    const season = p.s ? parseInt(m[p.s], 10) : 1;
    const episode = parseInt(m[p.e], 10);
    const before = title.slice(0, m.index);
    const after = title.slice(m.index + m[0].length);
    return {
      season,
      seasonGiven: !!p.s,
      episode,
      series: cleanName(before),
      epTitle: cleanName(after).replace(/^[-–:|,.\s]+/, ''),
    };
  }
  return null;
}

const GENERIC_FILE = /^(index|playlist|master|video|stream|chunklist|prog_index|mono|main|media)(_\w+)?\.(m3u8?|mp4|ts|mkv)$/i;
const SEASON_RX = /(?:season|staffel|saison|temporada|évad)\s*(\d{1,2})|\bS(\d{1,2})(?!\d|E\d)\b|(\d{1,2})\.\s*évad/i;
const NON_VIDEO = /\.(srt|sub|ass|ssa|vtt|idx|txt|nfo|jpe?g|png|gif|webp|bmp|pdf|docx?|xml|json|md5|sfv|url|lnk|db|ini)$/i;
const words = (s) => norm(s).split(/[^a-z0-9]+/).filter((w) => w.length >= 3);
const accents = (s) => (String(s).match(/[áéíóöőúüűÁÉÍÓÖŐÚÜŰ]/g) || []).length;
/**
 * A lista (#EXTINF) címe vagy a fájlnév? Saját / NAS-listákban az #EXTINF cím néha értelmetlen (pl. „No1”,
 * a videó belső címkéje) vagy ékezet nélküli. Ha a fájlnév értelmes cím (szóközös, nem kiadási név), és
 * a lista címe egyetlen szavában sem egyezik vele, vagy ugyanaz, csak ékezetek nélkül, a fájlnév nyer.
 */
function betterTitle(given, file) {
  const f = cleanRelease(file);
  if (!given || !f || !/\s/.test(f) && f.length < 4) return given;
  if (/^\d+$/.test(f) || /^[\da-f]{8,}$/i.test(f)) return given; // számozott / kódolt fájlnév – nem cím
  const gw = words(cleanRelease(given));
  const fw = words(f);
  if (!fw.length) return given;
  const shared = gw.filter((w) => fw.includes(w)).length;
  if (gw.length && shared === 0) return f; // a lista címe nem erről a fájlról szól
  // csonka lista-cím („Háború és béke I.”), a fájlnévben a rész is ott van („… 1. rész - Andrej …”)
  if (gw.every((w) => fw.includes(w)) && parseEpisode(f) && !parseEpisode(cleanRelease(given))) return f;
  if (fw.every((w) => gw.includes(w)) && accents(f) > accents(given)) return f; // ugyanaz, ékezetekkel
  return given;
}
const safeDecode = (s) => {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
};

// A listából jövő címek feldolgozása lineáris időben (a hosszú elválasztó-sorozatokon és a záratlan
// zárójeleken a reguláris kifejezések négyzetesen futottak volna), és legfeljebb ennyi karakterig:
const MAX_TITLE = 400;

/** A nyitó–záró pár közötti részek cseréje szóközre; záratlan nyitónál megáll (egyetlen menet). */
function dropBracketed(s, open, close) {
  let out = '';
  let i = 0;
  for (;;) {
    const a = s.indexOf(open, i);
    if (a < 0) return out + s.slice(i);
    const b = s.indexOf(close, a + open.length);
    if (b < 0) return out + s.slice(i);
    out += s.slice(i, a) + ' ';
    i = b + close.length;
  }
}
/** A végéről a megadott karakterek levágása (egyetlen menet hátulról). */
function trimEndChars(s, chars) {
  let e = s.length;
  while (e > 0 && chars.includes(s[e - 1])) e--;
  return s.slice(0, e);
}
const TRAIL = '-–:|,._ \t\n\r ';

function cleanName(s) {
  let t = String(s || '').slice(0, MAX_TITLE);
  t = dropBracketed(t, '【', '】').replace(/[《》「」『』]/g, ' ');
  t = dropBracketed(t, '[', ']');
  return trimEndChars(t, TRAIL).replace(/\s+/g, ' ').trim();
}

function splitYear(title) {
  const t = String(title || '').slice(0, MAX_TITLE).trim();
  // a végén évszám (esetleg zárójelben), előtte legalább egy elválasztó: szóköz, pont, ( vagy [
  const m = /((?:19|20)\d{2})[)\]]?$/.exec(t);
  if (m) {
    let p = m.index;
    while (p > 0 && ' \t.([ '.includes(t[p - 1])) p--;
    if (p < m.index && t.slice(0, p).trim()) return { title: cleanName(t.slice(0, p)), year: parseInt(m[1], 10) };
  }
  return { title: cleanName(t), year: 0 };
}

const KIDS_RX = /family|kids?|child|cartoon|anim|anime|gyerek|mese|csal[aá]di|matinee|disney|junior/i;
// Felnőtt műfajok: csak a „Felnőtt tartalom” beállítással, gyerekprofilban soha.
const ADULT_RX = /\b(hentai|erotikus|erotic|xxx|adult|felnőtt|porn\w*)\b/i;
const NOT_KIDS_RX = /nem gyerekeknek|ecchi|guro|horror|thriller|seinen|háborús|őrültség|doujinshi/i;

// ---------------------------------------------------------------------------
// Listák
// ---------------------------------------------------------------------------
/** Beépített lista bekapcsolva? (a felhasználó választása, különben a lista alapértéke) */
export const builtinOn = (b) => store.settings.vodBuiltin?.[b.id] ?? !b.off;

/** A betöltött VOD-kiegészítő csomagok (packs.js), listaként. */
const vodPacks = () => packsOf('vod');

export function vodLists() {
  const s = store.settings;
  const out = [];
  for (const b of [...VOD_BUILTIN, ...vodPacks()]) if (builtinOn(b)) out.push({ ...b, builtin: true });
  for (const p of s.vodCustom || []) if (p.enabled) out.push({ ...p, builtin: false });
  // A csatornalistákban talált filmek / sorozatrészek (a csatornák közül ide kerültek)
  for (const t of catalog.tvVod || []) out.push({ id: t.id, name: t.name, entries: t.entries, at: t.at, fromTv: true, builtin: false });
  return out;
}

/** GitHub-tárhely (github.com/szerző/tár) → a benne lévő .m3u / .m3u8 fájlok nyers címei. */
/** hours: a fájlfa gyorsítótárának kora (a lista frissítési gyakorisága – hogy az új fájlok is látsszanak) */
async function expandGitHub(url, hours = 6) {
  const m = /^https?:\/\/github\.com\/([^/]+)\/([^/#?]+)(?:\/(?:tree|blob)\/([^/]+)(\/[^?#]*)?)?/i.exec(url);
  if (!m) return null;
  const [, owner, repoRaw, branchIn, pathIn] = m;
  const repo = repoRaw.replace(/\.git$/, '');
  // Egyetlen fájlra mutató „blob” hivatkozás
  if (branchIn && pathIn && /\.m3u8?$/i.test(pathIn)) {
    return [{ name: decodeURIComponent(pathIn.split('/').pop()), url: `https://raw.githubusercontent.com/${owner}/${repo}/${branchIn}${pathIn}` }];
  }
  const info = JSON.parse((await api.fetchText(`https://api.github.com/repos/${owner}/${repo}`, { maxAgeHours: 24 })).text);
  const branch = branchIn || info.default_branch || 'main';
  const tree = JSON.parse(
    (await api.fetchText(`https://api.github.com/repos/${owner}/${repo}/git/trees/${encodeURIComponent(branch)}?recursive=1`, { maxAgeHours: hours })).text
  );
  const prefix = pathIn ? pathIn.replace(/^\//, '') : '';
  return (tree.tree || [])
    .filter((t) => t.type === 'blob' && /\.m3u8?$/i.test(t.path) && t.path.startsWith(prefix))
    .slice(0, 300)
    .map((t) => ({
      name: t.path.split('/').pop(),
      url: `https://raw.githubusercontent.com/${owner}/${repo}/${encodeURIComponent(branch)}/${t.path.split('/').map(encodeURIComponent).join('/')}`,
    }));
}

// ---------------------------------------------------------------------------
// Több fájlból / ZIP-ből álló lista
// ---------------------------------------------------------------------------
const PLAYLIST_RX = /\.(m3u8?|txt)$/i;
// Az „összes tétel” fájl neve műfaji bontású csomagokban (pl. all.m3u8 + akció.m3u8 + dráma.m3u8…)
const ALL_FILE_RX = /^(all|összes|osszes|minden|mind|index|full|teljes)$/i;
const baseName = (n) => decodeURIComponent(n.split('/').pop()).replace(PLAYLIST_RX, '');
const tagName = (n) => {
  const t = cleanName(baseName(n).replace(/[_]+/g, ' '));
  return t.charAt(0).toLocaleUpperCase(LOCALE) + t.slice(1);
};
const attr = (v) => String(v || '').replace(/"/g, "'");

/**
 * Lejátszólista-fájlok egyesítése egyetlen M3U szöveggé.
 * - Műfaji csomag (van „all” fájl, vagy a címek több fájlban is szerepelnek): minden tétel egyszer
 *   kerül bele, a fájlnevek (akció, dráma…) műfajcímkék lesznek (adas-tags).
 * - Különálló listák: összefűzve, a fájlnév marad a sorozat-felismerés kulcsa (adas-file).
 * Visszaad: { text, entries, files, mode }
 */
export function combinePlaylists(files) {
  const parsed = files
    .filter((f) => PLAYLIST_RX.test(f.name))
    .map((f) => ({ name: f.name, entries: parseM3U(f.text).entries.filter((e) => e.url) }))
    .filter((f) => f.entries.length);
  if (!parsed.length) return { text: '', entries: 0, files: 0 };
  if (parsed.length === 1) return { text: files.find((f) => f.name === parsed[0].name).text, entries: parsed[0].entries.length, files: 1, mode: 'single' };
  const seen = new Map(); // url -> fájlok száma
  for (const f of parsed) for (const u of new Set(f.entries.map((e) => e.url))) seen.set(u, (seen.get(u) || 0) + 1);
  const total = parsed.reduce((n, f) => n + f.entries.length, 0);
  const hasAll = parsed.some((f) => ALL_FILE_RX.test(baseName(f.name)));
  const genreMode = hasAll || total > seen.size * 1.3;
  const out = ['#EXTM3U'];
  const line = (e, extra) => {
    let a = '';
    if (e.tvgId) a += ` tvg-id="${attr(e.tvgId)}"`;
    if (e.logo) a += ` tvg-logo="${attr(e.logo)}"`;
    if (e.group) a += ` group-title="${attr(e.group)}"`;
    if (e.ua) a += ` http-user-agent="${attr(e.ua)}"`;
    if (e.referrer) a += ` http-referrer="${attr(e.referrer)}"`;
    out.push(`#EXTINF:${e.duration || -1}${a}${extra},${e.title || e.name}`, e.url);
  };
  if (genreMode) {
    const tags = new Map(); // url -> Set(műfaj)
    const order = new Map(); // url -> bejegyzés (az „all” fájl sorrendjében)
    const sorted = [...parsed].sort((a, b) => ALL_FILE_RX.test(baseName(b.name)) - ALL_FILE_RX.test(baseName(a.name)));
    for (const f of sorted) {
      const isAll = ALL_FILE_RX.test(baseName(f.name));
      const tag = isAll ? '' : tagName(f.name);
      for (const e of f.entries) {
        if (!order.has(e.url)) order.set(e.url, e);
        if (tag) {
          if (!tags.has(e.url)) tags.set(e.url, new Set());
          tags.get(e.url).add(tag);
        }
      }
    }
    for (const [u, e] of order) {
      const t = tags.get(u);
      line(e, t ? ` adas-tags="${attr([...t].join(';'))}"` : '');
    }
    return { text: out.join('\n'), entries: order.size, files: parsed.length, mode: 'genres', genres: new Set([...tags.values()].flatMap((s) => [...s])).size };
  }
  for (const f of parsed) for (const e of f.entries) line(e, ` adas-file="${attr(baseName(f.name))}"`);
  return { text: out.join('\n'), entries: total, files: parsed.length, mode: 'concat' };
}

/** Kiválasztott fájlok (m3u/m3u8/txt/zip) → [{ name, text }] */
export async function readPickedFiles(picked) {
  const out = [];
  for (const f of picked) {
    const bytes = f.bytes || new TextEncoder().encode(f.text || '');
    if (isZip(bytes)) {
      for (const z of await unzip(bytes, (p) => PLAYLIST_RX.test(p) && !/(^|\/)(__MACOSX|\.)/.test(p))) out.push({ name: z.name, text: bytesToText(z.bytes) });
    } else out.push({ name: f.name, text: bytesToText(bytes) });
  }
  return out;
}

/** Nagy listák szövege nem a beállításokban, hanem külön tartós tárban (docs) van. */
const BIG_TEXT = 150e3;
async function listText(pl) {
  if (pl.textKey) {
    const v = await api.docGet?.(pl.textKey).catch(() => null);
    if (!v || typeof v.text !== 'string') throw new Error(_t('A lista tartalma nem található ezen az eszközön – add hozzá újra.'));
    return v.text;
  }
  return pl.text || '';
}

/** A programmal szállított lista (src/lists) – XHR-rel, mert a fetch a file:// címet nem tölti. */
function assetText(rel) {
  return new Promise((resolve, reject) => {
    const x = new XMLHttpRequest();
    x.open('GET', new URL(rel, location.href).href);
    x.responseType = 'text';
    x.onload = () => (x.status === 0 || (x.status >= 200 && x.status < 300) ? resolve(x.responseText) : reject(new Error('HTTP ' + x.status)));
    x.onerror = () => reject(new Error(`${_t('A beépített lista nem olvasható:')} ` + rel));
    x.send();
  });
}

/** Saját lista felvétele szövegből: a nagy szöveg a tartós tárba kerül. */
export async function addCustomVodText(name, text, extra = {}) {
  const s = store.settings;
  const id = newId();
  const p = { id, name, enabled: true, ...extra };
  if (text.length > BIG_TEXT && api.docSet) {
    p.textKey = 'vodtext:' + id;
    p.size = text.length;
    await api.docSet(p.textKey, { text });
  } else p.text = text;
  s.vodCustom = [...(s.vodCustom || []), p];
  store.save();
  return p;
}

/** Egy lista bejegyzései: [{ ...m3u bejegyzés, fileHint }] */
async function loadList(pl, force) {
  // (a lista saját frissítési gyakoriságával – Beállítások → VOD és médiatár, a lista sorában)
  const opts = { maxAgeHours: refreshHoursOf('vod', pl), force };
  const parseText = (text, fileName, url) => {
    const parsed = parseM3U(text);
    // Ha maga a cím egy videó (HLS adás), egyetlen filmként kezeljük.
    if (parsed.isStream) return [{ title: fileName || pl.name, name: fileName || pl.name, url, logo: '', group: '', duration: 0, fileHint: '' }];
    const hint = fileName ? cleanName(decodeURIComponent(fileName).replace(/\.m3u8?$/i, '').replace(/[_]+/g, ' ')) : '';
    return parsed.entries.map((e) => ({ ...e, fileHint: e.file ? cleanName(e.file.replace(/[_]+/g, ' ')) : hint }));
  };
  if (pl.entries) return pl.entries.map((e) => ({ ...e, fileHint: '' })); // csatornalistából átvett tételek
  if (pl.asset) return parseText(await assetText(pl.asset), '', '');
  if (!pl.url) return parseText(await listText(pl), '', '');
  // Hálózati hibánál az asztali letöltő a legutóbbi példányt adja (stale): ezt jelezzük, és ha a csomag
  // mentett listája frissebb, az látszik (a külső catch-ben)
  const staleNote = (r) => {
    if (!r.stale) return;
    if (pl.textKey && (pl.at || 0) > (r.cachedAt || 0)) throw new Error(_t('hálózati hiba'));
    vod.errors[pl.id] = _t('a forrás most nem érhető el – a legutóbb letöltött példány látszik');
  };
  const fromUrl = async () => {
    const files = await expandGitHub(pl.url, opts.maxAgeHours);
    if (!files) {
      const r = await api.fetchText(pl.url, opts);
      staleNote(r);
      return parseText(r.text, '', pl.url);
    }
    // Tárhely: a fájlokat kis párhuzamossággal töltjük le (egy-egy fájl hibája nem állítja meg a többit).
    const out = [];
    let i = 0;
    let ok = 0;
    let stale = 0;
    const worker = async () => {
      while (i < files.length) {
        const f = files[i++];
        try {
          const r = await api.fetchText(f.url, opts);
          if (r.stale) stale++;
          out.push(...parseText(r.text, f.name, f.url));
          ok++;
        } catch (err) {
          console.warn('VOD fájl hiba', f.url, err);
        }
      }
    };
    await Promise.all([worker(), worker(), worker(), worker(), worker(), worker()]);
    // (ha egyetlen fájl sem jött le, az forráshiba – a csomag mentett listája léphet életbe)
    if (files.length && !ok) throw new Error(_t('a tárhely egyik listája sem tölthető le'));
    if (stale) staleNote({ stale: true, cachedAt: Infinity });
    return out;
  };
  try {
    return await fromUrl();
  } catch (err) {
    // forráscímes csomag: ha a forrás (vagy a GitHub-tárhely listázása) nem érhető el, a csomagban
    // mentett lista látszik – a listák között jelezve
    if (!pl.textKey) throw err;
    vod.errors[pl.id] = _t('a forrás nem érhető el ({err}) – a csomagban mentett lista látszik', { err: errText(err) });
    return parseText(await listText(pl), '', '');
  }
}

// ---------------------------------------------------------------------------
// Feldolgozás
// ---------------------------------------------------------------------------
/** Összevetési kulcs, amely a nem latin írásokat (kínai, japán, cirill…) is megtartja. */
function titleKey(t) {
  return norm(t).replace(/[\s.,:;!?'"`’()[\]{}《》【】「」『』<>\-–—_/\\|~*+&#@%^=]+/g, '');
}

function commonPrefix(strs) {
  let p = strs[0] || '';
  for (const s of strs) while (p && !s.startsWith(p)) p = p.slice(0, -1);
  return p;
}

/**
 * Második menet: ha egy fájlban / csoportban legalább 3 „film” azonos címmel kezdődik és csak
 * egy sorszámban tér el (pl. „Anime layer 01”, „Anime layer 02”), akkor azok egy sorozat részei.
 */
function detectLooseSeries(bucket) {
  if (bucket.length < 3) return null;
  // A címek a jelölések (pl. „【完结】” = befejezve, „[HD]”) nélkül
  const T = new Map(bucket.map((x) => [x, x.raw.replace(/【[^】]*】|\[[^\]]*\]/g, '').trim()]));
  const titles = [...T.values()];
  // Közös előtag (a sorozat neve). Ha egy-egy eltérő tétel (pl. „Trailer”) miatt nincs mindegyikre
  // illő, azt az előtagot választjuk, amely a címek legalább 70%-ára illik (a leghosszabbat).
  let prefix = commonPrefix(titles).replace(/\d+$/, '');
  if (cleanName(prefix).length < 2) {
    let best = '';
    for (let i = 0; i < Math.min(titles.length - 1, 40); i++) {
      const cand = commonPrefix([titles[i], titles[i + 1]]).replace(/\d+$/, '');
      if (cleanName(cand).length < 2 || cand.length <= best.length) continue;
      if (titles.filter((t) => t.startsWith(cand)).length >= titles.length * 0.7) best = cand;
    }
    prefix = best;
  }
  if (cleanName(prefix).length < 2) return null;
  // Sorszám az előtag utáni részben; ahol nincs (előzetes, „PV”), az extra lesz.
  const nums = new Map();
  for (const x of bucket) {
    const t = T.get(x);
    const m = t.startsWith(prefix) ? /(\d{1,4})/.exec(t.slice(prefix.length)) : null;
    if (m) nums.set(x, parseInt(m[1], 10));
  }
  if (nums.size < 3 || nums.size < bucket.length * 0.7) return null;
  // Évszámnak látszó 
  if (new Set(nums.values()).size < nums.size * 0.8) return null;
  const series = cleanName(prefix.replace(/\b(?:layer|vol|no|#)\s*$/i, ''));
  let extra = 0;
  return bucket.map((x) => {
    const n = nums.get(x);
    // Sorszám nélküli tétel (előzetes, különkiadás) → „Extrák” (0. évad)
    if (n === undefined) return { ...x, ep: { season: 0, episode: ++extra, series, epTitle: cleanName(x.raw.replace(prefix.trim(), '')) || x.raw } };
    return { ...x, ep: { season: 1, episode: n, series, epTitle: cleanName(T.get(x).slice(prefix.length).replace(/^\s*\d{1,4}/, '')) } };
  });
}

/**
 * Kiadási fájlnév megtisztítása (pl. „Film.Cime.2019.1080p.BluRay.x264-CSOPORT” → „Film Cime 2019”,
 * „Sorozat.S01E02.720p.WEB” → „Sorozat S01E02”), hogy a felismerés és a keresés pontosabb legyen.
 */
export function cleanRelease(raw) {
  let t = String(raw || '').slice(0, MAX_TITLE).trim();
  if (!t) return t;
  t = t.replace(/\.(mkv|mp4|avi|m4v|ts|mov|wmv|webm|m3u8?)$/i, '');
  if (!/\s/.test(t) && /[._]/.test(t)) t = t.replace(/[._]+/g, ' ');
  // az első kiadási jelölőtől (előtte egy elválasztó) a végéig levágjuk, az előtte álló elválasztókkal együtt –
  // egyetlen elválasztóval kezdődő minta: nem pörgeti újra a hosszú szóköz-sorozatokat (lineáris)
  const m = /[\s.([-](?:2160p|1080[pi]|720p|576p|480p|4k|uhd|x26[45]|h\.?26[45]|hevc|avc|blu-?ray|brrip|bdrip|web-?dl|web-?rip|hdtv|dvdrip|dvd|xvid|aac|ac3|eac3|dts|hdr10?|dv|remux|proper|repack|extended|unrated|hun|eng|multi|dual|subbed|hunsub)\b/i.exec(t);
  if (m) t = trimEndChars(t.slice(0, m.index), ' \t.([-');
  return t.trim() || String(raw).slice(0, MAX_TITLE).trim();
}

function build(lib, loaded) {
  const movies = new Map();
  const series = new Map();
  const counts = {};
  // 1. menet: epizódjelölők; a többi bejegyzés fájlonként / csoportonként gyűjtve
  const items = [];
  const live = [];
  for (const item of loaded) {
    const { pl } = item;
    let { entries } = item;
    // A VOD-listák élő adásai (tévécsatornák) a csatornák közé kerülnek, itt nem jelennek meg.
    if (!pl.fromTv) {
      const liveEntries = entries.filter(isLiveEntry);
      if (liveEntries.length) {
        entries = entries.filter((e) => !liveEntries.includes(e));
        live.push({ id: 'vodlive:' + lib.id + ':' + pl.id, name: pl.name, entries: liveEntries.map(({ fileHint, ...e }) => e) });
      }
    }
    counts[pl.id] = entries.length;
    // Műfajcímkés lista: a kategóriák a címkék, a group-title csak a sorozat neve.
    const tagged = entries.some((e) => e.tags);
    const buckets = new Map();
    const seriesOfBucket = new Map(); // fájl / csoport -> a benne felismert sorozat neve
    for (const e of entries) {
      if (!e.url) continue;
      // Cím: az #EXTINF neve, ennek híján a fájlnév; a kiadási címkék nélkül.
      const segs = safeDecode(String(e.url).split(/[?#]/)[0]).split(/[\\/]/).filter(Boolean);
      let fromUrl = segs.pop() || '';
      // általános fájlnév (index.m3u8, playlist.m3u8…): a mappa neve a cím
      if (GENERIC_FILE.test(fromUrl) && segs.length) fromUrl = segs[segs.length - 1];
      // nem videó (felirat, szöveg, kép) a listában: nem film
      if (NON_VIDEO.test(fromUrl)) continue;
      // a cím híján a listafeldolgozó a fájlnevet adja – ha az általános (index, playlist…), a mappa neve kell
      let given = String(e.title || e.name || '').trim();
      if (GENERIC_FILE.test(given + '.m3u8')) given = '';
      given = betterTitle(given, fromUrl);
      const raw = cleanRelease(given || fromUrl);
      const ep = parseEpisode(raw);
      // évad nélküli részszám: az évad a csoportból vagy a mappaútból („Season 2”, „S02”, „2. évad”)
      if (ep && !ep.seasonGiven) {
        const sm = SEASON_RX.exec(`${e.group || ''} / ${segs.slice(-3).join(' / ')}`);
        if (sm) ep.season = parseInt(sm[1] || sm[2] || sm[3], 10) || ep.season;
      }
      const it = { pl, e, raw, ep, tagged };
      const bk = e.fileHint || e.group || '';
      if (ep && bk && !seriesOfBucket.has(bk)) seriesOfBucket.set(bk, ep.series || cleanName(e.group) || e.fileHint);
      if (ep || /(?:\((?:19|20)\d{2}\)|\s(?:19|20)\d{2})\s*$/.test(raw)) items.push(it);
      else {
        if (!buckets.has(bk)) buckets.set(bk, []);
        buckets.get(bk).push(it);
      }
    }
    // 2. menet: sorszámozott címek csoportjai sorozatként; a felismert sorozat fájljában maradt
    // egyéb tételek (előzetes, különkiadás) a sorozat extrái lesznek.
    for (const [bk, bucket] of buckets) {
      const loose = bk && detectLooseSeries(bucket);
      if (loose) items.push(...loose);
      else if (bk && seriesOfBucket.has(bk)) {
        // Csak az a tétel lesz a sorozat extrája, amelynek a címe a sorozat nevét tartalmazza –
        // egy vegyes (filmes) listában egyetlen sorozatrész miatt a többi film ne tűnjön el.
        const series = seriesOfBucket.get(bk);
        const sk = titleKey(series);
        let extra = 0;
        for (const it of bucket) {
          if (sk && titleKey(it.raw).includes(sk)) items.push({ ...it, ep: { season: 0, episode: ++extra, series, epTitle: cleanName(it.raw.replace(series, '')) || it.raw } });
          else items.push(it);
        }
      } else items.push(...bucket);
    }
  }
  for (const { pl, e, raw, ep, tagged } of items) {
    {
      const group = cleanName(e.group || '');
      const addGroups = (x, title) => {
        if (tagged) for (const t of e.tags || []) x.groups.add(t);
        else if (group && titleKey(group) !== titleKey(title)) x.groups.add(group);
      };
      if (ep) {
        const sTitle = ep.series || group || e.fileHint || _t('Ismeretlen sorozat');
        const key = lib.idPrefix + 's:' + (titleKey(sTitle) || newId());
        let s = series.get(key);
        if (!s) {
          s = { id: key, type: 'series', title: sTitle, poster: '', groups: new Set(), lists: new Set(), eps: new Map() };
          series.set(key, s);
        }
        if (!s.poster && e.logo) s.poster = e.logo;
        addGroups(s, sTitle);
        s.lists.add(pl.name);
        const ek = `${ep.season}x${ep.episode}`;
        const prev = s.eps.get(ek);
        if (prev) {
          if (!prev.urls.includes(e.url)) prev.urls.push(e.url);
        } else {
          s.eps.set(ek, {
            key: `${key}#${ek}`,
            season: ep.season,
            episode: ep.episode,
            title: ep.epTitle,
            still: e.logo || '',
            duration: e.duration || 0,
            urls: [e.url],
            ua: e.ua || '',
            referrer: e.referrer || '',
          });
        }
      } else {
        const { title, year } = splitYear(raw.replace(/\(\d{3,4}p\)/g, ''));
        if (!title) continue;
        let key = lib.idPrefix + 'm:' + titleKey(title) + (year || '');
        // azonos cím, de jelentősen eltérő hossz → másik film (pl. évszám nélküli feldolgozás)
        const same = movies.get(key);
        if (same && same.duration > 0 && e.duration > 0 && Math.abs(same.duration - e.duration) > Math.max(same.duration, e.duration) * 0.1) key += ':' + Math.round(e.duration / 60);
        let m = movies.get(key);
        if (!m) {
          m = { id: key, type: 'movie', title, year, poster: '', duration: 0, groups: new Set(), lists: new Set(), urls: [], ua: e.ua || '', referrer: e.referrer || '' };
          movies.set(key, m);
        }
        else if (accents(title) > accents(m.title)) m.title = title; // ugyanaz a film: az ékezetes cím a jobb
        if (!m.poster && e.logo) m.poster = e.logo;
        if (!m.duration && e.duration) m.duration = e.duration;
        addGroups(m, title);
        m.lists.add(pl.name);
        if (!m.urls.includes(e.url)) m.urls.push(e.url);
      }
    }
  }
  const fin = (x) => ({ ...x, listPoster: x.poster, lib: lib.id, groups: [...x.groups], lists: [...x.lists] });
  lib.movies = [...movies.values()].map(fin).sort((a, b) => a.title.localeCompare(b.title, LOCALE));
  lib.series = [...series.values()]
    .map((s) => {
      // Az extrák (0. évad) a végére kerülnek.
      const so = (x) => (x.season === 0 ? 1e6 : x.season);
      const eps = [...s.eps.values()].sort((a, b) => so(a) - so(b) || a.episode - b.episode);
      return { ...fin(s), eps: undefined, episodes: eps, seasons: [...new Set(eps.map((x) => x.season))] };
    })
    .sort((a, b) => a.title.localeCompare(b.title, LOCALE));
  lib.counts = counts;
  index(lib);
  // Az élő adások átadása a csatornáknak (ha változott, a csatornalista újra összefésülődik)
  if (setVodLive(lib.id, live)) bus.emit('vod-live');
}

// Magyar tartalom felismerése: kifejezett jelölés (csoport, lista, cím), magyar tárhely (.hu) vagy ő/ű a címben.
const HU_MARK_RX = /\bmagyar|\bhungar|\bhun\b|\bhunsub\b|szinkron|feliratos|magyarul/i;
const isHuHost = (u) => /^https?:\/\/[^/?#]+\.hu(?::\d+)?(?:[/?#]|$)/i.test(u || '');
function huScore(x) {
  if (HU_MARK_RX.test([...x.groups, ...x.lists, x.title].join(' '))) return 2;
  const url = x.urls?.[0] || x.episodes?.[0]?.urls?.[0];
  return isHuHost(url) || /[őűŐŰ]/.test(x.title) ? 1 : 0;
}

/** Stabil rendezés: a magyar tételek előre, egyébként a sorrend marad. */
// (a magyar jelölésű tételek előresorolása csak magyar felületen)
export const huFirst = (list) => lang !== 'hu' ? list : list.map((x, i) => [x, i]).sort((a, b) => (b[0].hu || 0) - (a[0].hu || 0) || a[1] - b[1]).map((p) => p[0]);

/**
 * Egységes műfajok – az AnimeAddicts műfajlistája (magyar nevek), két kiegészítéssel (Dokumentum,
 * Kultfilm), ahol ott nincs megfelelő. A listák vegyes csoportjait (magyar és angol műfajnevek,
 * témacsatornák, mint „Horror all night”) ezekre képezzük le: pontos névegyezés, különben a minta
 * (ékezet nélküli, kisbetűs szövegen). Egy csoport több műfajba is eshet.
 * [név, minta | null, rejtett] – a rejtett címkék (jellemzők, felnőtt címkék) szűrhetők, de nem kapnak sort.
 */
export const GENRES = [
  ['Akció', /\b(action|akcio|full throttle|thrills|fists|stunts|80s action)\b/],
  ['Antológia', /\b(antholog\w*|antologia)\b/],
  ['Autós', /\b(cars?|racing|autos|motorsport)\b/],
  ['Bábanimáció', /\b(puppets?|babanimacio|stop-?motion)\b/],
  ['Cgi', null, true],
  ['Családi', /\b(family|csaladi)\b/],
  ['Doujinshi', null, true],
  ['Dráma', /\b(drama|melodrama)\b/],
  ['Ecchi', null],
  ['Egyéb', null, true],
  ['Életrajzi', /\b(biograph\w*|biopic|eletrajzi)\b/],
  ['Erotikus', /\b(erotic|erotikus)\b/, true],
  ['Fantasy', /\b(fantasy|sorcery|once upon a time|fair(y|ies)|tunder\w*)\b/],
  ['Fekete-fehér', /\b(black and white|fekete-feher)\b/],
  ['Flash animáció', null, true],
  ['Független', /\b(indie|independent|fuggetlen)\b/],
  ['Ga-nime', null, true],
  ['Guro', null],
  ['Gyerekeknek', /\b(kids|children|gyerekeknek|cartoons?|rajzfilm)\b/],
  ['Gyurma animáció', /\b(claymation|gyurma\w*)\b/],
  ['Háborús', /\b(war|haborus)\b/],
  ['Harcművészet', /\b(martial arts?|kung ?fu|harcmuveszet|way of the sword)\b/],
  ['Hentai', null, true],
  ['Horror', /\b(horror|monsters?|creatures?|halloween|covens?|gothic|zombi(e|k)?|vampire?|slasher)\b/],
  ['Ifjúsági', /\b(teen\w*|youth|ifjusagi|coming of age)\b/],
  ['Iskolai', /\b(school|iskolai)\b/],
  ['Játék', /\b(games?|jatek)\b/],
  ['Josei', null],
  ['Kaland', /\b(adventures?|kaland|swashbuckl\w*)\b/],
  ['Katonai', /\b(military|katonai)\b/],
  ['Klasszikus', /\b(classics?|klasszikus|golden age|19[1-5]0s|before the code|pre-code|universal years)\b/],
  ['Krimi', /\b(crime|krimi|noir|detective|capers|heist|gangsters?)\b/],
  ['Lélektani', /\b(psycholog\w*|lelektani|hitchcock)\b/],
  ['Mágia', /\b(magic|magia)\b/],
  ['Magical girl', null],
  ['Mecha', null],
  ['Misztikus', /\b(myster(y|ies)|misztikus|rejtely\w*)\b/],
  ['Mitológiai', /\b(myth\w*|mitologiai|swords and sandals)\b/],
  ['Musical', /\b(musicals?|song and dance)\b/],
  ['Művészfilm', /\b(art ?house|muveszfilm)\b/],
  ['Nem gyerekeknek', null, true],
  ['Némafilm', /\b(silent|nemafilm|chaplin)\b/],
  ['Oktató', /\b(educational|oktato)\b/],
  ['Őrültség', /\b(madness|absurd\w*|orultseg)\b/],
  ['Paródia', /\b(parod(y|ies)|parodia|spoofs?)\b/],
  ['Reklám', null, true],
  ['Romantikus', /\b(romance|romantic|romantikus|love)\b/],
  ['Rövid rész(ek)', null, true],
  ['Rövid történet(ek)', null, true],
  ['Rövidfilm', /\b(shorts?|short films?|rovidfilm|two reels)\b/],
  ['Sci-fi', /\b(sci-?fi|science fiction|space|atomic age|futures?|cyberpunk)\b/],
  ['Seinen', null],
  ['Shoujo', /\b(shoujo|shojo)\b/],
  ['Shoujo ai', null, true],
  ['Shounen', /\b(shounen|shonen)\b/],
  ['Shounen ai', null, true],
  ['Slice of life', null],
  ['Sport', /\b(sports?)\b/],
  ['Szamurájos', /\b(samurai|szamurajos)\b/],
  ['Szatíra', /\b(satire|satirical|szatira)\b/],
  ['Szupererő', /\b(superheroe?s?|super ?powers?|szuperero)\b/],
  ['Természetfeletti', /\b(supernatural|termeszetfeletti|ghosts?|paranormal)\b/],
  ['Thriller', /\b(thrillers?|suspense|spies|spy)\b/],
  ['Történelmi', /\b(histor(y|ical)|tortenelmi|epics?)\b/],
  ['Tragédia', /\b(tragedy|tragedia)\b/],
  ['Vígjáték', /\b(comed(y|ies)|vigjatek|humou?r)\b/],
  ['Western', /\b(westerns?|back forty|cowboys?)\b/],
  ['Yuri', null, true],
  ['Zenés', /\b(music|zenes|dance)\b/],
  // kiegészítések (az AnimeAddicts listájában nincs megfelelőjük)
  ['Dokumentum', /\b(documentar(y|ies)|dokumentum\w*|ismeretterjeszto)\b/],
  ['Kultfilm', /\b(cult|kult\w*|hidden gems|late fees|after dark|vhs|drive-in|grindhouse|b-movie|exploitation|seventies heat|after hours|projection booth|rental)\b/],
];
const GENRE_EXACT = new Map(GENRES.map(([n]) => [norm(n), n]));
const GENRE_HIDDEN = new Set(GENRES.filter((g) => g[2]).map(([n]) => n));
const genreCache = new Map();
/** Egy nyers csoport → egységes műfajok. */
function genresOfOne(g) {
  let m = genreCache.get(g);
  if (m) return m;
  const f = norm(g).trim();
  const exact = GENRE_EXACT.get(f);
  m = exact ? [exact] : GENRES.filter(([, rx]) => rx && rx.test(f)).map(([n]) => n);
  genreCache.set(g, m);
  return m;
}
/** A nyers csoportok → egységes műfajok (egy cím több műfajba is tartozhat). */
export function genresOf(groups) {
  const hit = new Set();
  for (const g of groups) for (const n of genresOfOne(g)) hit.add(n);
  return [...hit];
}
/** Kap-e saját sort a műfaj (a jellemzők és a felnőtt címkék nem). */
export const genreRow = (name) => !GENRE_HIDDEN.has(name);
/**
 * A sorok és a szűrő kategóriái: az egységes műfajok (egy cím több műfajban is lehet – a listák,
 * fájlok és csoportok összes műfaja). A saját médiatárban a műfajhoz nem köthető lejátszólisták
 * („Karácsony”, „Gyerekeknek mentett”…) saját nevükkel külön kategóriák maradnak.
 */
export const catsOf = (x) => (x.lib === 'own' ? x.cats || x.groups : x.genres || []);
/** Műfaj / csoport neve kiíráshoz: az egységes műfajok belső (magyar) neve a felület nyelvén. */
export const genreLabel = (n) => _t(n);
const ownCats = (x) => [...x.genres, ...x.groups.filter((g) => !genresOfOne(g).length)];

function index(lib) {
  lib.byId = new Map([...lib.movies, ...lib.series].map((x) => [x.id, x]));
  const g = new Map();
  for (const x of [...lib.movies, ...lib.series]) {
    x.genres = genresOf(x.groups);
    if (x.lib === 'own') x.cats = ownCats(x);
    for (const n of catsOf(x)) g.set(n, (g.get(n) || 0) + 1);
  }
  // A sorrend: a sort kapó kategóriák elöl, tételszám szerint csökkenő sorrendben (a népszerűbb műfaj
  // feljebb); a saját médiatárban a magyar jelölésűek elöl; a rejtett címkék a végén.
  lib.groups = [...g.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => genreRow(b.name) - genreRow(a.name) || HU_MARK_RX.test(b.name) - HU_MARK_RX.test(a.name) || b.count - a.count);
  for (const x of [...lib.movies, ...lib.series]) {
    applyOverride(x);
    x.search = norm([x.title, x.userTitle || '', x.huTitle || '', x.year || '', ...x.groups, ...x.lists].join(' '));
    x.hu = huScore(x);
  }
}

/** Kézi beállítás (minden profilban közös): borítókép és cím – Beállítások nélkül, az adatlapról. */
function applyOverride(x) {
  const ov = store.settings.vodMeta?.[x.id];
  if (!ov) return;
  if (ov.poster) x.poster = ov.poster;
  if (ov.title) x.userTitle = ov.title;
}
export function setVodOverride(x, patch) {
  const all = (store.settings.vodMeta ||= {});
  const ov = { ...(all[x.id] || {}), ...patch };
  for (const k of Object.keys(ov)) if (!ov[k]) delete ov[k];
  if (Object.keys(ov).length) all[x.id] = ov;
  else delete all[x.id];
  store.save();
  if (patch.poster !== undefined) x.poster = patch.poster || x.listPoster || '';
  if (patch.title !== undefined) x.userTitle = patch.title || '';
  x.search = norm([x.title, x.userTitle || '', x.huTitle || '', x.year || '', ...x.groups, ...x.lists].join(' '));
}
/** A megjelenített cím: kézzel megadott → magyar (Wikidata / TMDB) → a listában szereplő. */
export const displayTitle = (x) => x.userTitle || x.huTitle || x.title;

function libLists(lib) {
  return lib === own ? ownLists() : vodLists();
}

function cacheKey(lib) {
  return `${lib.id}:${VOD_CACHE_VERSION}:${lang}:` + libLists(lib).map((p) => p.id + (p.url || p.loc || p.asset || (p.entries ? 'e' + p.entries.length : '') || (p.text || '').length) + (p.mtime || '') + (p.at || '')).join(',');
}

/**
 * A feldolgozott VOD legfeljebb ennyi órás lehet: az online VOD-nál a webcímről töltött listák közül a
 * leggyakrabban frissítendő gyakorisága (listánként beállítható), a Saját médiatárnál a rögzített érték.
 */
function libMaxAge(lib) {
  if (lib !== vod) return lib.maxAgeHours;
  const hs = vodLists().filter((p) => p.url).map((p) => refreshHoursOf('vod', p));
  return hs.length ? Math.min(...hs) : DEFAULT_REFRESH_HOURS;
}

/** Esedékes-e az online VOD-listák frissítése (az ütemező hívja – app.js)? */
export const vodRefreshDue = () => vod.ready && !vod.loading && Date.now() - (vod.loadedAt || 0) > libMaxAge(vod) * 3600e3;

/** Betöltés (gyorsítótárból, ha friss). Többszöri hívásnál ugyanazt az ígéretet adja vissza. */
function loadLib(lib, { force = false } = {}) {
  // Kényszerített frissítés futó betöltés közben: megvárjuk, majd újratöltünk.
  if (lib.loading && force) return lib.loading.then(() => loadLib(lib, { force }));
  if (lib.loading) return lib.loading;
  lib.loading = (async () => {
    try {
      // A Saját részlegnél előbb a forrásmappák átnézése (új / eltűnt lejátszólisták).
      if (lib === own) await scanOwnSources({ force });
      // Az online VOD a csatornalistákban talált filmeket is tartalmazza: megvárjuk a csatornalistát.
      if (lib === vod && !catalog.ready) {
        await new Promise((r) => {
          const off = bus.on('tv-vod', () => (off?.(), r()));
          setTimeout(r, 30000);
        });
      }
      lib.tvSig = (catalog.tvVod || []).map((t) => t.id + t.entries.length + ':' + (t.at || 0)).join(',');
      if (!force && api.kvGet) {
        const snap = await api.kvGet(cacheKey(lib)).catch(() => null);
        if (snap && Date.now() - snap.at < libMaxAge(lib) * 3600e3) {
          Object.assign(lib, { movies: snap.movies, series: snap.series, counts: snap.counts, errors: snap.errors, loadedAt: snap.at });
          index(lib);
          lib.ready = true;
          bus.emit(lib.id === 'vod' ? 'vod' : 'own');
          return;
        }
      }
      const lists = libLists(lib);
      lib.errors = {};
      const loaded = await Promise.all(
        lists.map(async (pl) => {
          try {
            return { pl, entries: await (lib === own ? loadOwnList(pl) : loadList(pl, force)) };
          } catch (err) {
            lib.errors[pl.id] = String(err.message || err);
            return { pl, entries: [] };
          }
        })
      );
      build(lib, loaded);
      lib.loadedAt = Date.now();
      lib.ready = true;
      api.kvSet?.(cacheKey(lib), { at: lib.loadedAt, movies: lib.movies, series: lib.series, counts: lib.counts, errors: lib.errors })?.catch?.(() => {});
      bus.emit(lib.id === 'vod' ? 'vod' : 'own');
    } finally {
      lib.loading = null;
    }
  })();
  return lib.loading;
}

export const loadVod = (opts) => loadLib(vod, opts);
// Ha a csatornalista frissülése után más filmek kerültek át a VOD-ba, újratöltjük.
bus.on('tv-vod', () => {
  const sig = (catalog.tvVod || []).map((t) => t.id + t.entries.length + ':' + (t.at || 0)).join(',');
  if (vod.ready && sig !== vod.tvSig) loadVod();
});
export const loadOwn = (opts) => loadLib(own, opts);

export function visibleVod(lib = vod) {
  const kids = store.profile.kids;
  const adult = !kids && store.settings.showAdult;
  const ok = (x) => {
    const g = x.groups.join(' ');
    if (!adult && ADULT_RX.test(g) && !kids) return false;
    // gyerekprofil: a jelölés / a profil engedélye szerint (Beállítások → Tartalom és gyerekek → Gyerekprofilok)
    return !kids || kidsAllowed(store.profile, 'vod', x);
  };
  return { movies: huFirst(lib.movies.filter(ok)), series: huFirst(lib.series.filter(ok)) };
}

/** Keresés mindkét részlegben (a Saját elöl). */
export function searchVod(q) {
  const tokens = norm(q).split(/\s+/).filter(Boolean);
  if (!tokens.length) return [];
  const out = [];
  for (const lib of [own, vod]) {
    const { movies, series } = visibleVod(lib);
    out.push(...[...series, ...movies].filter((x) => tokens.every((t) => x.search.includes(t))));
  }
  return huFirst(out).slice(0, 160);
}

// ---------------------------------------------------------------------------
// Megtekintési állapot (profilonként)
// ---------------------------------------------------------------------------
const progressOf = (key) => store.profile.vodProgress?.[key] || null;
const doneCount = (eps) => eps.filter((e) => progressOf(e.key)?.done).length;
export const isWatchlisted = (x) => (store.profile.watchlist || []).includes(x.id);
export function toggleWatchlist(x) {
  const p = store.profile;
  p.watchlist ||= [];
  const i = p.watchlist.indexOf(x.id);
  if (i >= 0) p.watchlist.splice(i, 1);
  else p.watchlist.unshift(x.id);
  store.save();
}
// Kedvenc filmek és sorozatok (profilonként; a Kedvencek oldalon a csatornák alatt jelennek meg)
export const isVodFav = (x) => (store.profile.vodFavs || []).includes(x.id);
export function toggleVodFav(x) {
  const p = store.profile;
  p.vodFavs ||= [];
  const i = p.vodFavs.indexOf(x.id);
  if (i >= 0) p.vodFavs.splice(i, 1);
  else p.vodFavs.unshift(x.id);
  store.save();
  bus.emit('vod-favs');
}
/** A kedvenc filmek / sorozatok a betöltött médiatárakból (online és saját), a jelölés sorrendjében. */
export function vodFavItems() {
  const ids = store.profile.vodFavs || [];
  return ids.map((id) => vod.byId?.get(id) || own.byId?.get(id)).filter(Boolean);
}
const inWatchlist = (items) => {
  const ids = store.profile.watchlist || [];
  const by = new Map(items.map((x) => [x.id, x]));
  return ids.map((id) => by.get(id)).filter(Boolean);
};

function saveProgress(key, pos, dur, extra = {}) {
  const p = store.profile;
  p.vodProgress ||= {};
  const done = dur > 0 && pos >= dur * 0.94;
  p.vodProgress[key] = { p: Math.round(pos), d: Math.round(dur || 0), t: Date.now(), done, ...extra };
  store.save();
}

/** Sorozat: melyik részt kell indítani (a félbehagyottat, vagy az utolsó megnézett utánit). */
function nextEpisodeOf(s) {
  const last = progressOf(s.id)?.last;
  const i = s.episodes.findIndex((e) => e.key === last);
  if (i < 0) return { ep: s.episodes[0], resume: false };
  const cur = s.episodes[i];
  const pr = progressOf(cur.key);
  if (pr && !pr.done) return { ep: cur, resume: true };
  return { ep: s.episodes[i + 1] || cur, resume: false };
}

export function continueItems(lib = vod) {
  const { movies, series } = visibleVod(lib);
  const items = [];
  for (const m of movies) {
    const pr = progressOf(m.id);
    if (pr && !pr.done && pr.p > 30) items.push({ x: m, t: pr.t, ratio: pr.d ? pr.p / pr.d : 0 });
  }
  for (const s of series) {
    const pr = progressOf(s.id);
    if (!pr?.last) continue;
    const { ep } = nextEpisodeOf(s);
    const epr = progressOf(ep.key);
    if (epr?.done && ep.key === pr.last) continue; // a sorozat végére ért
    items.push({ x: s, t: pr.t, ratio: epr?.d ? epr.p / epr.d : 0 });
  }
  return items.sort((a, b) => b.t - a.t);
}

// ---------------------------------------------------------------------------
// Lejátszás
// ---------------------------------------------------------------------------
const fmtDur = (sec) => {
  if (!sec) return '';
  const m = Math.round(sec / 60);
  return m >= 60 ? `${_t('{floor} ó {x} p', { floor: Math.floor(m / 60), x: m % 60 })}` : `${_t('{m} perc', { m })}`;
};
const epLabel = (e) => (e.season === 0 ? `${_t('Extra {episode}', { episode: e.episode })}` : `${_t('{season}. évad {episode}. rész', { season: e.season, episode: e.episode })}`);
const seasonLabel = (s) => (s === 0 ? _t('Extrák') : `${_t('{s}. évad', { s })}`);

function pseudoChannel(item, ep) {
  const urls = ep ? ep.urls : item.urls;
  const title = item.title;
  const sub = ep ? `${epLabel(ep)}${ep.title ? ' – ' + ep.title : ''}` : [item.year || '', fmtDur(item.duration)].filter(Boolean).join(' · ');
  return {
    id: ep ? ep.key : item.id,
    name: title,
    logo: item.poster || '',
    country: '',
    categories: [],
    streams: urls.map((u, i) => ({
      url: u,
      title,
      quality: '',
      labels: [],
      ua: (ep || item).ua || '',
      referrer: (ep || item).referrer || '',
      feedName: urls.length > 1 ? `${_t('Forrás {x}', { x: i + 1 })}` : '',
    })),
    vod: { item, ep, title, subtitle: sub, key: ep ? ep.key : item.id },
  };
}

export function playVod(item, ep = null, { fromStart = false } = {}) {
  if (item.type === 'series' && !ep) {
    const n = nextEpisodeOf(item);
    ep = n.ep;
    if (!n.resume) fromStart = true;
  }
  const key = ep ? ep.key : item.id;
  const pr = progressOf(key);
  const resumeAt = !fromStart && pr && !pr.done && pr.p > 30 ? pr.p : 0;
  if (ep) saveProgress(item.id, 0, 0, { last: ep.key });
  player.playVod(pseudoChannel(item, ep), { resumeAt });
}

// A lejátszó visszahívásai (a körkörös importálás elkerülésére így kapcsolódunk).
player.vodHooks = {
  progress(ch, pos, dur) {
    saveProgress(ch.vod.key, pos, dur);
    if (ch.vod.ep) saveProgress(ch.vod.item.id, 0, 0, { last: ch.vod.ep.key });
  },
  next(ch, dir = 1) {
    const { item, ep } = ch.vod;
    if (!ep) return null;
    const i = item.episodes.findIndex((e) => e.key === ep.key);
    const n = item.episodes[i + dir];
    return n ? pseudoChannel(item, n) : null;
  },
  start(ch) {
    if (ch.vod.ep) saveProgress(ch.vod.item.id, 0, 0, { last: ch.vod.ep.key });
  },
  info(ch) {
    if (ch.vod.item.rec) return toast(ch.vod.item.title); // saját felvétel: nincs adatlapja
    openVodDetail(ch.vod.item);
  },
  external(ch) {
    return openInExternalPlayer(ch.vod.item, ch.vod.ep);
  },
  autoNext: () => store.settings.vodAutoNext !== false,
};

/**
 * Megnyitás külső lejátszóban (VLC, mpv, IINA, MX Player…): olyan fájlokhoz, amelyeknek a hangját
 * (pl. AC3 / DTS) vagy beágyazott feliratát (ASS az MKV-ben) a beépített lejátszó nem tudja.
 * Sorozatnál a kiválasztott résztől a többi is a listába kerül (asztali változat).
 */
export async function openInExternalPlayer(item, ep = null) {
  if (!api.openInPlayer) return toast(_t('Ezen az eszközön nem nyitható meg külső lejátszóban.'));
  // gyerekprofil: a tartalmi szabály, és mivel a külső lejátszóban a napi keret nem követhető, felnőtt jóváhagyás
  if (store.profile.kids && !kidsAllowed(store.profile, 'vod', item)) return toast(_t('Ez a tartalom ebben a profilban nem nézhető.'));
  if (!(await allowOutsidePlayback())) return;
  let items;
  if (item.type === 'series') {
    ep ||= nextEpisodeOf(item).ep;
    const i = Math.max(0, item.episodes.findIndex((e) => e.key === ep.key));
    items = item.episodes.slice(i, i + 60).map((e) => ({ url: e.urls[0], title: `${item.title} – ${epLabel(e)}${e.title ? ' – ' + e.title : ''}` }));
    saveProgress(item.id, 0, 0, { last: ep.key });
  } else items = [{ url: item.urls[0], title: item.title + (item.year ? ` (${item.year})` : '') }];
  player.active && player.close();
  const err = await api.openInPlayer(items, item.title);
  if (err) toast(`${_t('Nem sikerült megnyitni: {err}. Telepíts egy videólejátszót (pl. VLC), és társítsd az .m3u fájlokhoz.', { err })}`, { timeout: 9000 });
  else toast(_t('Megnyitás a külső lejátszóban…'));
}

// ---------------------------------------------------------------------------
// Megjelenítés
// ---------------------------------------------------------------------------
function posterHtml(x) {
  return `<div class="poster" style="--h:${hashHue(x.title)}">
    ${x.poster ? `<img src="${esc(x.poster)}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.remove()" />` : ''}
    <span class="ptitle">${esc(displayTitle(x))}</span>
  </div>`;
}

export function vcardHtml(x) {
  const pr = x.type === 'series' ? progressOf(nextEpisodeOf(x).ep?.key) : progressOf(x.id);
  const ratio = pr?.d ? Math.min(1, pr.p / pr.d) : 0;
  const sub =
    x.type === 'series'
      ? `${x.seasons.length > 1 ? x.seasons.length + ` ${_t('évad ·')} ` : ''}${_t('{length} rész', { length: x.episodes.length })}`
      : [x.year || '', fmtDur(x.duration), genreLabel(catsOf(x)[0] || '')].filter(Boolean).join(' · ');
  // Ugyanaz a felépítés, mint a tévécsatornák kártyájáé (keret, név, alcím, jelvények, felugró panel) –
  // így minden felületstílus egyformán díszíti; a borítókép álló marad.
  const fav = isVodFav(x);
  const nextEp = x.type === 'series' ? nextEpisodeOf(x) : null;
  const line = (x.type === 'series' ? [`${x.seasons.length > 1 ? x.seasons.length + ` ${_t('évad ·')} ` : ''}${_t('{length} rész', { length: x.episodes.length })}`] : [x.year || '', fmtDur(x.duration)]).concat(catsOf(x).slice(0, 2).map(genreLabel)).filter(Boolean).join(' · ');
  return `<div class="vcard" tabindex="0" data-vid="${esc(x.id)}">
    <div class="thumb vthumb" style="--h:${hashHue(x.title)}">${posterHtml(x)}
      <span class="q">${x.type === 'series' ? _t('SOROZAT') : _t('FILM')}</span>
      ${pr?.done && x.type === 'movie' ? `<span class="vdone" title="${_t('Megnézve')}">${ICON.check}</span>` : ''}
      ${fav ? `<span class="fav-mark" title="${_t('Kedvenc')}">★</span>` : ''}
      ${ratio > 0.01 && !(pr?.done && x.type === 'movie') ? `<div class="bar"><i style="width:${(ratio * 100).toFixed(1)}%"></i></div>` : ''}
    </div>
    <div class="meta"><div class="name" title="${esc(displayTitle(x) !== x.title ? x.title : '')}">${esc(displayTitle(x))}</div><div class="sub">${esc(sub)}</div></div>
    <div class="pop">
      <div class="pop-btns">
        <button class="round white" data-vact="play" title="${_t('Lejátszás (P)')}" tabindex="-1">${ICON.play}</button>
        <button class="round" data-vact="fav" title="${fav ? _t('Eltávolítás a kedvencekből (F)') : _t('Kedvencekhez (F)')}" tabindex="-1">${fav ? ICON.check : ICON.plus}</button>
        <span class="grow"></span>
        <button class="round" data-vact="info" title="${_t('Részletek (I)')}" tabindex="-1">${ICON.chevron}</button>
      </div>
      <div class="pop-line">${esc(line)}</div>
      ${nextEp?.ep ? `<div class="pop-now">${nextEp.resume ? _t('Folytatás') : _t('Következő')}: ${esc(epLabel(nextEp.ep))}</div>` : ''}
    </div>
  </div>`;
}

function vrowEl(title, items, href = '') {
  if (!items.length) return null;
  const el = html(`<section class="row vrow">
    ${rowTitleHtml(title, href, items.length)}
    <div class="row-wrap"><div class="row-track">${items.slice(0, 14).map(vcardHtml).join('')}${seeAllHtml(href, items.length, { poster: true })}</div></div>
  </section>`);
  // a többi kártya görgetéskor / a sor végére lépve töltődik (kevesebb induló elem és kép)
  progressiveTrack(el.querySelector('.row-track'), items, vcardHtml, 40, (track) => fillPosters(track));
  return el;
}

// A kártyán állva előre felépítjük a kapcsolatot a tárhelyhez (DNS + TLS) – gyorsabb indulás.
let warmTimer = null;
const warmVod = (e) => {
  const card = e.target.closest?.('.vcard');
  if (!card || !api.preconnect) return;
  clearTimeout(warmTimer);
  warmTimer = setTimeout(() => {
    const x = findItem(card.dataset.vid);
    const url = x?.urls?.[0] || x?.episodes?.[0]?.urls?.[0];
    if (url) api.preconnect(url);
  }, 250);
};
document.addEventListener('focusin', warmVod);
document.addEventListener('mouseover', warmVod);

// Kártyák (delegált események). A felugró panel gombjai (mint a csatornakártyán): lejátszás, kedvenc,
// részletek – egérrel / érintéssel; billentyűzettel és távirányítóval a kártyán állva: Enter / I = részletek,
// P (vagy a lejátszás gomb) = lejátszás, F = kedvenc. (A gombok a csatornakártyához hasonlóan nincsenek a
// Tab-sorrendben, hogy a nyilas navigáció kártyáról kártyára lépjen.)
function vcardAction(card, act) {
  const x = findItem(card.dataset.vid);
  if (!x) return;
  if (act === 'play') return playVod(x);
  if (act === 'fav') {
    toggleVodFav(x);
    toast(isVodFav(x) ? _t('Hozzáadva a kedvencekhez') : _t('Eltávolítva a kedvencek közül'));
    const focused = card.contains(document.activeElement);
    // az új kártya pontosan a régi helyére kerül (ugyanaz a tétel más sorban is lehet), és ott kap fókuszt
    const tpl = document.createElement('template');
    tpl.innerHTML = vcardHtml(x).trim();
    const fresh = tpl.content.firstElementChild;
    card.replaceWith(fresh);
    if (focused) fresh.focus({ preventScroll: true });
    return;
  }
  openVodDetail(x);
}
document.addEventListener('click', (e) => {
  const card = e.target.closest('.vcard');
  if (card) vcardAction(card, e.target.closest('[data-vact]')?.dataset.vact || 'info');
});
const VCARD_KEYS = { Enter: 'info', i: 'info', I: 'info', ContextMenu: 'info', p: 'play', P: 'play', MediaPlay: 'play', MediaPlayPause: 'play', f: 'fav', F: 'fav' };
document.addEventListener('keydown', (e) => {
  const card = document.activeElement?.closest?.('.vcard');
  const act = card && !e.ctrlKey && !e.metaKey && !e.altKey && VCARD_KEYS[e.key];
  if (!act) return;
  e.preventDefault();
  vcardAction(card, act);
});

export const renderOwn = (view, params) => renderVod(view, params, own);

/**
 * A főoldal „Folytatás” sora: a félbehagyott filmek és sorozatrészek a beépített / saját
 * listákból és a saját médiatárból együtt. Ha a listák még töltődnek, a sor később jelenik meg.
 */
export function homeContinueRow() {
  const anyProgress = Object.values(store.profile.vodProgress || {}).some((p) => p && (p.last || (!p.done && p.p > 30)));
  if (!anyProgress) return null;
  const items = () =>
    [...(vod.ready ? continueItems(vod) : []), ...(own.ready ? continueItems(own) : [])]
      .sort((a, b) => b.t - a.t)
      .map((c) => c.x);
  const build = () => {
    const el = vrowEl(_t('Folytatás'), items(), '#/vod?continue=1');
    if (el) {
      el.classList.add('home-continue');
      fillPosters(el);
    }
    return el;
  };
  const el = build();
  const pendingLibs = (vodLists().length && !vod.ready) || ((store.settings.ownSources || []).some((s) => s.enabled) && !own.ready);
  if (el && !pendingLibs) return el;
  // Helyőrző: a listák betöltése után kitöltjük.
  const slot = el || html('<section class="row vrow home-continue" hidden></section>');
  const offs = [];
  const refill = () => {
    if (!slot.isConnected && slot.dataset.used) return offs.forEach((f) => f());
    slot.dataset.used = '1';
    const fresh = build();
    if (!fresh) return;
    fresh.dataset.used = '1';
    if (slot.isConnected) slot.replaceWith(fresh);
    offs.forEach((f) => f());
  };
  offs.push(bus.on('vod', refill), bus.on('own', refill));
  return slot;
}

/**
 * Borító nélküli kártyák kiegészítése a magyar információk forrásából (Wikidata-plakát vagy TMDB),
 * egyesével a háttérben – a saját (NAS) listákban jellemzően nincs borítókép.
 */
function fillPosters(root) {
  if (store.settings.huInfo === false) return;
  fillTitles(root);
  const ids = [...new Set([...root.querySelectorAll('.vcard')].map((c) => c.dataset.vid))]
    .filter((id) => {
      const x = findItem(id);
      return x && !x.poster && !x.posterTried;
    })
    .slice(0, 80);
  const show = (x, url) => {
    if (!url) return;
    x.poster = url;
    document.querySelectorAll(`.vcard[data-vid="${CSS.escape(x.id)}"] .poster`).forEach((p) => (p.outerHTML = posterHtml(x)));
  };
  (async () => {
    const items = ids.map(findItem).filter((x) => x && !x.poster && !x.posterTried);
    // 1. Saját médiatár: a fájlba ágyazott borító (MKV-melléklet / MP4 covr) vagy a mellette lévő kép
    const local = items.filter((x) => x.lib === 'own');
    for (const x of local) {
      const url = await localPoster(x).catch(() => '');
      if (url) {
        x.posterTried = true;
        show(x, url);
      }
    }
    // 2. Online források (anime: AniList kötegben; egyébként Wikipédia / TVmaze / TMDB)
    const rest = items.filter((x) => !x.poster);
    for (let i = 0; i < rest.length; i += 8) {
      if (metaPaused()) break; // a szolgáltató lassításra kért: most nem kérdezünk tovább
      const part = rest.slice(i, i + 8);
      const res = await posters(part).catch(() => new Map());
      for (const x of part) {
        if (!res.has(x.id)) continue; // (szünetelt – később újra)
        x.posterTried = true;
        show(x, res.get(x.id));
      }
    }
  })();
}

/**
 * A látható kártyák magyar címe (Wikidata, gyorsítótárazva) – a kártyán a magyar cím, a súgóban (title)
 * az eredeti. Egyesével, a háttérben; ha a szolgáltató lassításra kér, abbahagyja.
 */
function fillTitles(root) {
  const items = [...new Set([...root.querySelectorAll('.vcard')].map((c) => c.dataset.vid))]
    .map(findItem)
    .filter((x) => x && !x.huTried)
    .slice(0, 60);
  (async () => {
    for (const x of items) {
      if (metaPaused()) break;
      const m = await titleInfo(x).catch(() => null);
      if (!m) continue;
      x.huTried = true;
      let changed = false;
      if (m.huTitle && !x.huTitle) {
        x.huTitle = m.huTitle;
        x.search += ' ' + norm(m.huTitle);
        changed = true;
      }
      if (m.poster && !x.poster) {
        x.poster = m.poster;
        changed = true;
      }
      if (changed)
        document.querySelectorAll(`.vcard[data-vid="${CSS.escape(x.id)}"]`).forEach((card) => {
          card.querySelector('.poster').outerHTML = posterHtml(x);
          const n = card.querySelector('.meta .name');
          if (n) {
            n.textContent = displayTitle(x);
            n.title = displayTitle(x) !== x.title ? x.title : '';
          }
        });
    }
  })();
}

// ---------------------------------------------------------------------------
// Saját médiatár borítóképe: a videó mellett lévő kép (Kodi / Plex szokás szerint), vagy a fájlba
// ágyazott borító (asztali változat, FFmpeg). Mappánként / fájlonként gyorsítótárazva.
// ---------------------------------------------------------------------------
const POSTER_NAMES = ['poster', 'folder', 'cover', 'movie', 'show', 'fanart'];
const IMG_EXT = ['jpg', 'png', 'jpeg', 'webp'];
const imgOk = (src) =>
  new Promise((res) => {
    const im = new Image();
    const t = setTimeout(() => res(false), 4000);
    im.onload = () => (clearTimeout(t), res(im.naturalWidth > 40));
    im.onerror = () => (clearTimeout(t), res(false));
    im.referrerPolicy = 'no-referrer';
    im.src = src;
  });

async function localPoster(x) {
  const url = x.urls?.[0] || x.episodes?.[0]?.urls?.[0];
  if (!url) return '';
  const key = 'lposter:' + url;
  const hit = await api.kvGet?.(key).catch(() => null);
  if (hit && Date.now() - hit.at < (hit.url ? 30 : 3) * 86400e3) return hit.url;
  let found = '';
  if (url.startsWith('file:') && api.sidecarImage) {
    found = await api.sidecarImage(urlToPath(url)).catch(() => '');
  } else if (/^https?:/i.test(url)) {
    // Hálózati megosztás (HTTP-könyvtár): a fájl nevével egyező, majd a mappa közös képe
    const dir = url.slice(0, url.lastIndexOf('/') + 1);
    const base = url.slice(dir.length).replace(/\.[^.]+$/, '');
    const cands = [...IMG_EXT.slice(0, 2).map((e) => `${dir}${base}.${e}`), ...IMG_EXT.slice(0, 2).map((e) => `${dir}${base}-poster.${e}`), ...POSTER_NAMES.slice(0, 3).map((n) => `${dir}${n}.jpg`)];
    for (const c of cands) if (await imgOk(c)) {
      found = c;
      break;
    }
  }
  if (!found && api.mediaCover) found = await api.mediaCover(url).catch(() => '');
  api.kvSet?.(key, { at: Date.now(), url: found })?.catch?.(() => {});
  return found;
}

// ---------------------------------------------------------------------------
// A VOD oldal sorai (profilonként rendezhető, kapcsolható – mint a TV oldalé)
// ---------------------------------------------------------------------------
const VOD_FIXED = ['continue', 'watchlist', 'series', 'movies'];
export function vodRowLabel(key) {
  if (key.startsWith('group:')) return `${_t('Műfaj: {name}', { name: genreLabel(key.slice(6)) })}`;
  return { continue: _t('Folytatás'), watchlist: _t('Megnézendő (saját lista)'), series: _t('Sorozatok'), movies: _t('Ajánlott filmek'), lists: _t('Listánként egy sor'), nogroup: _t('Egyéb filmek') }[key] || key;
}
/** Alapból ennyi műfaj kap sort (a legnépszerűbbek); a többi a sorok beállításában kapcsolható be. */
const GENRE_ROWS_ON = 12;
const genreKeys = (groups) => groups.filter((g) => genreRow(g.name)).slice(0, 80).map((g) => 'group:' + g.name);
/** A lehetséges sorok (a csoportok / műfajok a betöltött listákból) a profil mentett sorrendjében. */
export function vodRows(groups = vod.groups, profile = store.profile) {
  const avail = [...VOD_FIXED, ...genreKeys(groups), 'lists', 'nogroup'];
  const defOn = new Set(vodDefaultRows(groups).filter((r) => r.on).map((r) => r.key));
  const saved = Array.isArray(profile.vodRows) ? profile.vodRows.filter((r) => avail.includes(r.key)) : [];
  const known = new Set(saved.map((r) => r.key));
  // az újonnan megjelent sorok (pl. új műfaj) az „Egyéb filmek” elé kerülnek, ha az már a mentett sorrendben van
  const fresh = avail.filter((k) => !known.has(k)).map((key) => ({ key, on: defOn.has(key) }));
  const at = saved.findIndex((r) => r.key === 'nogroup');
  return at < 0 ? [...saved, ...fresh] : [...saved.slice(0, at), ...fresh, ...saved.slice(at)];
}
export const vodDefaultRows = (groups = vod.groups) =>
  [...VOD_FIXED, ...genreKeys(groups), 'lists', 'nogroup'].map((key, i, arr) => ({
    key,
    on: !key.startsWith('group:') || arr.indexOf(key) - VOD_FIXED.length < GENRE_ROWS_ON,
  }));

const VGRID_CHUNK = 120;
function progressiveGrid(grid, list) {
  if (!grid || list.length <= VGRID_CHUNK) return;
  let shown = VGRID_CHUNK;
  const sentinel = html('<div class="grid-sentinel" aria-hidden="true"></div>');
  grid.after(sentinel);
  const io = new IntersectionObserver(
    (e) => {
      if (!e.some((x) => x.isIntersecting)) return;
      if (!grid.isConnected) return io.disconnect();
      const next = list.slice(shown, shown + VGRID_CHUNK);
      shown += next.length;
      grid.insertAdjacentHTML('beforeend', next.map(vcardHtml).join(''));
      fillPosters(grid);
      if (shown >= list.length) {
        io.disconnect();
        sentinel.remove();
      }
    },
    { rootMargin: '800px' }
  );
  io.observe(sentinel);
}

/** A VOD két része: az online listák és a saját (NAS) médiatár – fülekkel váltható. */
export function vodTabs(lib) {
  const tab = (l, href, label) => `<a class="tab ${lib === l ? 'active' : ''}" href="${href}">${label}</a>`;
  return `<div class="tabs vod-tabs">${tab(vod, '#/vod', _t('Online listák'))}${tab(own, '#/own', _t('Saját médiatár'))}</div>`;
}

export function renderVod(view, params, lib = vod) {
  renderVodPage(view, params, lib);
  const target = view.querySelector('.vod-quick') || view.querySelector('.page');
  target?.insertAdjacentHTML('afterbegin', vodTabs(lib));
}

function renderVodPage(view, params, lib) {
  const q = params.get('q') || '';
  const group = params.get('group') || '';
  const listName = params.get('list') || '';
  const type = params.get('type') || '';
  const sort = params.get('sort') || 'title';
  const R = lib.route;
  const listsLink = `<a class="btn primary" href="#/settings?section=${lib.settingsSection}">${_t('Listák kezelése')}</a>`;
  const isOwn = lib === own;

  if (!lib.ready) {
    const has = isOwn ? (store.settings.ownSources || []).some((s) => s.enabled) : vodLists().length;
    view.innerHTML = `<div class="page">${
      has
        ? `<div class="empty-state"><div class="spinner"></div><p>${isOwn ? _t('A saját médiatár beolvasása…') : _t('A VOD-listák betöltése…')}</p></div>`
        : isOwn
          ? emptyState(
              _t('Még nincs saját médiatár'),
              _t('Adj hozzá egy mappát (pl. a NAS megosztott mappáját) vagy hálózati címet, ahol a filmjeid és sorozataid .m3u / .m3u8 lejátszólistái vannak. Minden talált lejátszólista külön, ki-be kapcsolható lista lesz.'),
              `<a class="btn primary" href="#/settings?section=ownlists">${_t('Mappa vagy cím hozzáadása')}</a> <a class="btn" href="#/help?topic=own">${_t('Súgó')}</a>`
            )
          : emptyState(_t('Nincs bekapcsolt film- vagy sorozatlista'), _t('A Beállításokban kapcsolhatsz be beépített listát, vagy adhatsz hozzá sajátot.'), listsLink)
    }</div>`;
    if (has) loadLib(lib);
    return;
  }

  const { movies, series } = visibleVod(lib);
  const all = huFirst([...series, ...movies]);
  // Csak a látható tételekben előforduló csoportok (pl. a felnőtt műfajok kapcsoló nélkül nem)
  const groupCount = new Map();
  for (const x of all) for (const n of catsOf(x)) groupCount.set(n, (groupCount.get(n) || 0) + 1);
  const groups = lib.groups.filter((g) => groupCount.has(g.name)).map((g) => ({ name: g.name, count: groupCount.get(g.name) }));
  const listNames = [...new Set(all.flatMap((x) => x.lists))];
  if (!all.length) {
    const err = Object.values(isOwn ? { ...own.scanErrors, ...own.errors } : lib.errors)[0];
    view.innerHTML = `<div class="page">${emptyState(
      isOwn ? _t('A saját médiatárban nincs film vagy sorozat') : _t('Nincs megjeleníthető film vagy sorozat'),
      err ? `${_t('Hiba: {err}', { err })}` : isOwn ? _t('Nem található bekapcsolt lejátszólista, vagy a listák üresek. Nézd meg a Beállítások → VOD és médiatár → Saját médiatár részt.') : _t('Kapcsolj be listát a Beállítások → VOD és médiatár → VOD-listák alatt.'),
      listsLink
    )}</div>`;
    return;
  }

  // Rács (szűrt) nézet
  const contMode = params.get('continue') === '1';
  const wlMode = params.get('watchlist') === '1';
  if (q || group || type || listName || contMode || wlMode) {
    let list = type === 'movie' ? movies : type === 'series' ? series : all;
    // Folytatás: a félbehagyott tételek mindkét médiatárból, a legutóbbi elöl
    if (contMode) list = [...continueItems(vod), ...(own.ready ? continueItems(own) : [])].sort((a, b) => b.t - a.t).map((c) => c.x);
    if (wlMode) list = inWatchlist([...all, ...(isOwn ? [] : own.ready ? [...own.movies, ...own.series] : [])]);
    if (group) list = list.filter((x) => catsOf(x).includes(group) || x.groups.includes(group));
    if (listName) list = list.filter((x) => x.lists.includes(listName));
    if (q) {
      const tokens = norm(q).split(/\s+/).filter(Boolean);
      list = list.filter((x) => tokens.every((t) => x.search.includes(t)));
    }
    // A választott rendezésen belül is a magyar tételek vannak elöl.
    if ((contMode || wlMode) && !params.get('sort')) {
      // a legutóbb nézett elöl marad
    } else if (sort === 'year') list = huFirst(list.slice().sort((a, b) => (b.year || 0) - (a.year || 0)));
    else if (sort === 'title') list = huFirst(list.slice().sort((a, b) => a.title.localeCompare(b.title, LOCALE)));
    const opt = (v, l, cur) => `<option value="${esc(v)}" ${v === cur ? 'selected' : ''}>${esc(l)}</option>`;
    const heading = [contMode && _t('Folytatás'), wlMode && _t('Megnézendő'), listName, group].filter(Boolean).join(' · ') || (type === 'series' ? _t('Sorozatok') : type === 'movie' ? _t('Filmek') : q ? `${_t('Keresés: „{q}”', { q })}` : lib.title);
    view.innerHTML = `<div class="page">
      <div class="page-head"><h1>${esc(heading)}</h1>
        <span class="muted">${_t('{length} cím', { length: list.length })}</span></div>
      <form class="filters vod-filters">
        <input class="input" name="q" type="search" placeholder="${_t('Keresés…')}" value="${esc(q)}" />
        ${contMode ? '<input type="hidden" name="continue" value="1" />' : ''}${wlMode ? '<input type="hidden" name="watchlist" value="1" />' : ''}
        <select name="type">${opt('', _t('Filmek és sorozatok'), type)}${opt('movie', _t('Csak filmek'), type)}${opt('series', _t('Csak sorozatok'), type)}</select>
        ${listNames.length > 1 || listName ? `<select name="list">${opt('', _t('Minden lista'), listName)}${listNames.map((n) => opt(n, n, listName)).join('')}</select>` : ''}
        <select name="group">${opt('', isOwn ? _t('Minden lejátszólista / csoport') : _t('Minden műfaj'), group)}${groups.map((g) => opt(g.name, `${genreLabel(g.name)} (${g.count})`, group)).join('')}</select>
        <select name="sort">${opt('title', _t('Cím szerint'), sort)}${opt('year', _t('Legújabb elöl'), sort)}</select>
        <a class="btn small" href="${R}">${_t('Vissza a kezdőlapra')}</a>
      </form>
      <div class="vgrid">${list.slice(0, VGRID_CHUNK).map(vcardHtml).join('') || `<p class="empty">${_t('Nincs találat.')}</p>`}</div>
    </div>`;
    // Az összes tétel egy oldalon: a többi görgetés közben töltődik be.
    progressiveGrid($('.vgrid', view), list);
    const form = $('.vod-filters', view);
    const apply = () => {
      const p = new URLSearchParams();
      for (const [k, v] of new FormData(form)) if (v && !(k === 'sort' && v === 'title')) p.set(k, v);
      if (![...p.keys()].some((k) => k !== 'sort')) p.set('type', 'all');
      location.replace(R + '?' + p);
    };
    form.onchange = apply;
    form.q.addEventListener('input', debounce(apply, 400));
    form.onsubmit = (e) => (e.preventDefault(), apply());
    if (q) requestAnimationFrame(() => {
      form.q.focus();
      form.q.setSelectionRange(q.length, q.length);
    });
    fillPosters(view);
    return;
  }

  // Kezdőlap
  // (a felső kiemelt sáv kikerült: az oldal rögtön a fülekkel és a sorokkal kezdődik)
  const withPoster = movies.filter((m) => m.poster);
  view.innerHTML = '';
  const rows = html(`<div class="rows vrows">
    <div class="vod-quick">
      ${movies.length ? `<a class="btn small" href="${R}?type=movie">${_t('Összes film ({length})', { length: movies.length })}</a>` : ''}
      ${series.length ? `<a class="btn small" href="${R}?type=series">${_t('Összes sorozat ({length})', { length: series.length })}</a>` : ''}
      <a class="btn small" href="${R}?type=all">${_t('Keresés és szűrés')}</a>
      <a class="btn small" href="#/settings?section=${lib.settingsSection}">${_t('Listák kezelése')}</a>
      ${isOwn ? `<button class="btn small" data-rescan>${_t('{refresh} Újraolvasás', { refresh: ICON.refresh })}</button>` : ''}
    </div></div>`);
  rows.querySelector('[data-rescan]')?.addEventListener('click', async (e) => {
    e.target.disabled = true;
    toast(_t('A saját médiatár újraolvasása…'));
    await loadOwn({ force: true });
    toast(`${_t('Kész: {length} film, {length2} sorozat', { length: own.movies.length, length2: own.series.length })}`);
  });
  view.append(rows);
  const cont = continueItems(lib).map((c) => c.x);
  const add = (el) => el && rows.append(el);
  // A sorok a profil beállított sorrendjében (Beállítások → VOD és médiatár → VOD-listák → A VOD oldal sorai)
  const seed = Math.floor(Date.now() / 86400e3);
  const build = {
    // Az online részen a félbehagyott tételek a saját médiatárból is (a tévés főoldalon már nincs ilyen sor)
    continue: () => add(isOwn ? vrowEl(_t('Folytatás'), cont, `${R}?continue=1`) : homeContinueRow()),
    watchlist: () => add(vrowEl(_t('Megnézendő'), inWatchlist(all), `${R}?watchlist=1`)),
    series: () => add(vrowEl(_t('Sorozatok'), series, `${R}?type=series`)),
    movies: () =>
      add(isOwn ? vrowEl(_t('Filmek'), movies, `${R}?type=movie`) : vrowEl(_t('Ajánlott filmek'), huFirst(seededShuffle(withPoster, seed)).slice(0, 30), `${R}?type=movie`)),
    // Több lista esetén listánként is egy sor (pl. „AnimeAddicts”)
    lists: () => {
      if (isOwn || listNames.length < 2) return;
      for (const n of listNames) add(vrowEl(n, all.filter((x) => x.lists.includes(n)), `${R}?list=${encodeURIComponent(n)}`));
    },
    nogroup: () => !isOwn && add(vrowEl(_t('Egyéb filmek'), movies.filter((m) => !catsOf(m).length), `${R}?type=movie`)),
  };
  for (const r of vodRows(groups)) {
    if (!r.on) continue;
    if (r.key.startsWith('group:')) {
      const name = r.key.slice(6);
      const items = all.filter((x) => catsOf(x).includes(name));
      if (items.length >= (isOwn ? 3 : 6)) add(vrowEl(genreLabel(name), items, `${R}?group=${encodeURIComponent(name)}`));
    } else build[r.key]?.();
  }
  fillPosters(view);
}

// ---------------------------------------------------------------------------
// Adatlap
// ---------------------------------------------------------------------------
// MKV-ben gyakori az AC3 hang és a beágyazott (ASS) felirat – ezeket a külső lejátszó kezeli.
// Gyerektartalom-jelölés (minden profilban közös; gyerekprofilban nem látszik)
const kidsBtn = (x) =>
  store.profile.kids
    ? ''
    : `<button class="btn ${isKidsVod(x) ? 'on' : ''}" data-v="kids" title="${_t('Minden profilban: a gyerekprofilok alapból a gyerektartalmat nézhetik')}">${isKidsVod(x) ? ICON.check + ' ' : ''}${_t('Gyerektartalom')}</button>`;
// Megnézendő lista (profilonként)
const wlBtn = (x) =>
  `<button class="btn ${isVodFav(x) ? 'on' : ''}" data-v="fav" title="${_t('A Kedvencek oldalon is megjelenik')}">${isVodFav(x) ? '★' : '☆'} ${_t('Kedvenc')}</button>` +
  `<button class="btn ${isWatchlisted(x) ? 'on' : ''}" data-v="wl">${isWatchlisted(x) ? ICON.check : ICON.plus} ${_t('Megnézendő')}</button>`;
// Borítókép és cím szerkesztése egy helyen (minden profilban közös)
const editBtns = () => `<button class="btn" data-v="edit" title="${_t('Cím és borítókép – keresés az adatbázisokban, saját kép')}">${_t('✎ Cím és borító')}</button>`;
const externalBtn = () =>
  api.openInPlayer ? `<button class="btn" data-v="external" title="${_t('VLC, mpv, IINA, MX Player… – AC3 hanghoz és beágyazott felirathoz')}">${_t('{external} Külső lejátszóban', { external: ICON.external })}</button>` : '';

export function openVodDetail(x) {
  const el = html(`<div class="vdetail"></div>`);
  let season = null;
  // Magyar információk (Wikidata / Wikipédia / TMDB) – a háttérben töltődnek be.
  let huHtml = store.settings.huInfo !== false ? `<div class="hu-info loading"><p class="muted small">${_t('Információk betöltése…')}</p></div>` : '';
  let huTitle = '';
  const render = () => {
    if (x.type === 'movie') {
      const pr = progressOf(x.id);
      const resume = pr && !pr.done && pr.p > 30;
      el.innerHTML = `<div class="vd-top">
        <div class="vd-poster">${posterHtml(x)}</div>
        <div class="vd-info">
          <div class="vhero-kicker">${_t('FILM')}</div>
          <h1>${esc(displayTitle(x))}</h1>
          ${displayTitle(x) !== x.title ? `<div class="hu-sub">${_t('Eredeti / angol cím: {esc}', { esc: esc(x.title) })}</div>` : ''}
          <div class="muted">${esc([x.year || '', fmtDur(x.duration)].filter(Boolean).join(' · '))}</div>
          ${catsOf(x).length ? `<div class="vd-tags">${catsOf(x).map((g) => `<a class="pill" href="${x.lib === 'own' ? '#/own' : '#/vod'}?group=${encodeURIComponent(g)}">${esc(genreLabel(g))}</a>`).join('')}</div>` : ''}
          ${pr ? `<div class="vd-progress">${pr.done ? _t('Megnézve') : `${_t('Megnézve: {round}% ({fmtClock})', { round: Math.round((pr.p / (pr.d || pr.p || 1)) * 100), fmtClock: fmtClock(pr.p) })}`}</div>` : ''}
          <div class="info-btns">
            <button class="btn primary big" data-v="play" autofocus>${ICON.play} ${resume ? `${_t('Folytatás {fmtClock}-tól', { fmtClock: fmtClock(pr.p) })}` : _t('Lejátszás')}</button>
            ${resume ? `<button class="btn" data-v="restart">${_t('Előről')}</button>` : ''}
            <button class="btn" data-v="watched">${pr?.done ? _t('Nem megnézettnek jelölés') : _t('Megnézettnek jelölés')}</button>
            ${wlBtn(x)}${externalBtn()}${kidsBtn(x)}${editBtns()}
          </div>
          <p class="muted small">${_t('Forrás: {esc}', { esc: esc(x.lists.join(', ')) })}${x.urls.length > 1 ? ` ${_t('· {length} változat (ha az egyik nem működik, a lejátszó a következőt próbálja)', { length: x.urls.length })}` : ''}</p>
        </div></div>
        <div class="vd-hu">${huHtml}</div>`;
    } else {
      const { ep: nextEp, resume } = nextEpisodeOf(x);
      if (season === null) season = nextEp?.season ?? x.seasons[0];
      const eps = x.episodes.filter((e) => e.season === season);
      el.innerHTML = `<div class="vd-top">
        <div class="vd-poster">${posterHtml(x)}</div>
        <div class="vd-info">
          <div class="vhero-kicker">${_t('SOROZAT')}</div>
          <h1>${esc(displayTitle(x))}</h1>
          ${displayTitle(x) !== x.title ? `<div class="hu-sub">${_t('Eredeti / angol cím: {esc}', { esc: esc(x.title) })}</div>` : ''}
          <div class="muted">${_t('{length} évad · {length2} rész · {doneCount} megnézve', { length: x.seasons.length, length2: x.episodes.length, doneCount: doneCount(x.episodes) })}</div>
          <div class="bar wide vd-sprog"><i style="width:${((doneCount(x.episodes) / Math.max(1, x.episodes.length)) * 100).toFixed(1)}%"></i></div>
          ${catsOf(x).length ? `<div class="vd-tags">${catsOf(x).map((g) => `<a class="pill" href="${x.lib === 'own' ? '#/own' : '#/vod'}?group=${encodeURIComponent(g)}">${esc(genreLabel(g))}</a>`).join('')}</div>` : ''}
          <div class="info-btns">
            <button class="btn primary big" data-v="play" autofocus>${ICON.play} ${resume ? _t('Folytatás') : progressOf(x.id)?.last ? _t('Következő rész') : _t('Lejátszás')}: ${esc(epLabel(nextEp))}</button>
            <button class="btn" data-v="season-done">${eps.every((e) => progressOf(e.key)?.done) ? _t('Évad: nem megnézett') : _t('Évad megnézettnek jelölése')}</button>
            ${wlBtn(x)}${externalBtn()}${kidsBtn(x)}${editBtns()}
          </div>
          <p class="muted small">${_t('Forrás: {esc}', { esc: esc(x.lists.join(', ')) })}</p>
        </div></div>
        <div class="vd-hu">${huHtml}</div>
        ${x.seasons.length > 1 ? `<div class="tabs vd-seasons">${x.seasons.map((s) => { const se = x.episodes.filter((e) => e.season === s); return `<button class="tab ${s === season ? 'active' : ''}" data-season="${s}">${seasonLabel(s)} <small>${doneCount(se)}/${se.length}</small></button>`; }).join('')}</div>` : ''}
        <ol class="episodes">${eps
          .map((e) => {
            const pr = progressOf(e.key);
            const ratio = pr?.d ? Math.min(1, pr.p / pr.d) : 0;
            return `<li tabindex="0" data-ep="${esc(e.key)}" class="${pr?.done ? 'done' : ''}">
              <span class="ep-num">${e.episode}</span>
              <span class="ep-text"><b>${esc(e.title || `${_t('{episode}. rész', { episode: e.episode })}`)}</b><small>${esc(epLabel(e))}${e.duration ? ' · ' + fmtDur(e.duration) : ''}${pr?.done ? ` ${_t('· megnézve')}` : ''}</small>
                ${ratio > 0.01 && !pr?.done ? `<span class="bar"><i style="width:${(ratio * 100).toFixed(1)}%"></i></span>` : ''}</span>
              <span class="ep-play">${ICON.play}</span>
            </li>`;
          })
          .join('')}</ol>`;
    }
  };
  render();
  const close = openModal(el, { cls: 'wide vod-modal' });
  if (huHtml) {
    filmInfo(x).then((m) => {
      huHtml = infoBoxHtml(m);
      if (!x.poster && m?.poster) {
        x.poster = m.poster;
        x.posterTried = true;
      }
      huTitle = m?.huTitle && norm(m.huTitle) !== norm(x.title) ? m.huTitle : '';
      if (huTitle && !x.huTitle) x.huTitle = huTitle;
      if (!document.body.contains(el)) return;
      // Újrarajzolás után a kijelölés ne vesszen el (távirányítós használat).
      const focusSel = document.activeElement?.dataset?.ep ? `[data-ep="${CSS.escape(document.activeElement.dataset.ep)}"]` : '[data-v="play"]';
      const hadFocus = el.contains(document.activeElement);
      render();
      if (hadFocus) el.querySelector(focusSel)?.focus({ preventScroll: true });
    });
  }
  el.addEventListener('click', async (e) => {
    const ext = e.target.closest('[data-ext]');
    if (ext) {
      e.preventDefault();
      return api.openExternal(ext.dataset.ext);
    }
    const a = e.target.closest('[data-v]')?.dataset.v;
    const s = e.target.closest('[data-season]');
    const ep = e.target.closest('[data-ep]');
    if (a === 'play') {
      close();
      playVod(x);
    } else if (a === 'kids') {
      setKidsMark('vod', x, !isKidsVod(x));
      toast(isKidsVod(x) ? `${_t('„{title}”: gyerektartalomként jelölve', { title: x.title })}` : `${_t('„{title}”: nem gyerektartalom', { title: x.title })}`);
      render();
    } else if (a === 'external') {
      close();
      openInExternalPlayer(x);
    } else if (a === 'restart') {
      close();
      playVod(x, null, { fromStart: true });
    } else if (a === 'edit') {
      if (await editVodMeta(x)) render();
    } else if (a === 'wl') {
      toggleWatchlist(x);
      toast(isWatchlisted(x) ? _t('Felkerült a Megnézendő listára') : _t('Lekerült a Megnézendő listáról'));
      render();
    } else if (a === 'fav') {
      toggleVodFav(x);
      toast(isVodFav(x) ? _t('Hozzáadva a kedvencekhez') : _t('Eltávolítva a kedvencek közül'));
      render();
    } else if (a === 'season-done') {
      const eps = x.episodes.filter((y) => y.season === season);
      const all = eps.every((y) => progressOf(y.key)?.done);
      for (const y of eps) {
        if (all) delete store.profile.vodProgress?.[y.key];
        else saveProgress(y.key, y.duration || 1, y.duration || 1);
      }
      store.save();
      toast(all ? _t('Az évad megnézése törölve') : _t('Az évad megnézettnek jelölve'));
      render();
    } else if (a === 'watched') {
      const pr = progressOf(x.id);
      if (pr?.done) delete store.profile.vodProgress[x.id];
      else saveProgress(x.id, x.duration || 1, x.duration || 1);
      store.save();
      render();
    } else if (s) {
      season = Number(s.dataset.season);
      render();
      el.querySelector(`[data-season="${season}"]`)?.focus();
    } else if (ep) {
      close();
      playVod(x, x.episodes.find((y) => y.key === ep.dataset.ep));
    } else if (e.target.closest('a[href^="#/"]')) close();
  });
  el.addEventListener('keydown', (e) => {
    const ep = e.target.closest('[data-ep]');
    if (ep && e.key === 'Enter') {
      e.preventDefault();
      close();
      playVod(x, x.episodes.find((y) => y.key === ep.dataset.ep));
    }
  });
}

/** A tétel összes kártyájának frissítése (borító, cím) – adatlapról módosítás után. */
function refreshCards(x) {
  document.querySelectorAll(`.vcard[data-vid="${CSS.escape(x.id)}"]`).forEach((card) => {
    card.querySelector('.poster').outerHTML = posterHtml(x);
    const n = card.querySelector('.meta .name');
    if (n) n.textContent = displayTitle(x);
  });
}

/** Kép (fájl) → kicsinyített JPEG adat-URL a borítóhoz (a beállításokban tárolva). */
const fileToPoster = (file) =>
  new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onerror = () => reject(new Error(_t('A fájl nem olvasható')));
    r.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error(_t('Ez nem kép')));
      img.onload = () => {
        const w = Math.min(342, img.naturalWidth);
        const c = document.createElement('canvas');
        c.width = w;
        c.height = Math.round((img.naturalHeight / img.naturalWidth) * w);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        resolve(c.toDataURL('image/jpeg', 0.82));
      };
      img.src = r.result;
    };
    r.readAsDataURL(file);
  });

/**
 * Cím és borítókép szerkesztése egy ablakban: megjelenített cím, borító keresése az adatbázisokban
 * (saját keresőszóval is), saját képcím vagy képfájl, visszaállítás. → változott-e
 */
function editVodMeta(x) {
  return new Promise((resolve) => {
    let changed = false;
    let poster; // undefined: marad; '': eredeti; egyébként az új kép
    let list = [];
    let seq = 0;
    const keys = [(store.settings.tmdbKey || '').trim() && 'TMDB', (store.settings.omdbKey || '').trim() && 'OMDb'].filter(Boolean);
    const hasOwnPoster = !!store.settings.vodMeta?.[x.id]?.poster;
    const el = html(`<div class="dialog vod-edit">
      <h2>${_t('Cím és borító')}</h2>
      <div class="ve-top">
        <div class="ve-prev"></div>
        <div class="ve-fields">
          <label class="setting col"><span>${_t('<b>Megjelenített cím</b>')}<small>${_t('Üresen hagyva: {esc}', { esc: esc(x.huTitle || x.title) })}</small></span>
            <input class="input" data-ve="title" value="${esc(x.userTitle || '')}" placeholder="${esc(x.huTitle || x.title)}" /></label>
          <p class="muted small">${_t('Eredeti cím (a listában): <b>{esc}</b>', { esc: esc(x.title) })}${x.huTitle ? `${_t('<br>Magyar cím (adatbázisból): <b>{esc}</b>', { esc: esc(x.huTitle) })}` : ''}${x.year ? ` · ${esc(String(x.year))}` : ''}</p>
          <div class="inline">
            <label class="btn small pp-file">${_t('Képfájl…')}<input type="file" accept="image/*" hidden /></label>
            ${hasOwnPoster ? `<button class="btn small" data-ve="reset">${_t('Eredeti borító')}</button>` : ''}
          </div>
        </div>
      </div>
      <div class="ve-search inline"><input class="input" data-ve="q" value="${esc(x.title)}" placeholder="${_t('Keresés a borítóképek között…')}" /><button class="btn" data-ve="search">${_t('Keresés')}</button></div>
      <p class="muted small ve-src">${_t('Források: AniList, Kitsu, MyAnimeList, TVmaze, Wikipédia, Wikidata')}${keys.length ? ', ' + keys.join(', ') : ` ${_t('· TMDB / OMDb (IMDb) saját kulccsal: Beállítások → Feliratok és információk → Magyar információk és feliratok')}`}</p>
      <div class="pp-grid"></div>
      <div class="ve-url">${_t('<b>Saját kép címe</b>')}<div class="inline"><input class="input" data-ve="url" placeholder="${_t('https://…/plakat.jpg')}" /><button class="btn small" data-ve="useurl">${_t('Kiválasztás')}</button></div></div>
      <div class="inline ve-foot"><button class="btn" data-ve="cancel">${_t('Mégse')}</button><button class="btn primary" data-ve="save">${_t('Mentés')}</button></div>
    </div>`);
    const close = openModal(el, { cls: 'medium', onClose: () => resolve(changed) });
    const $ = (k) => el.querySelector(`[data-ve="${k}"]`);
    const grid = el.querySelector('.pp-grid');
    const prev = () => {
      const url = poster === undefined ? x.poster : poster || x.listPoster || '';
      el.querySelector('.ve-prev').innerHTML = url ? `<img src="${esc(url)}" alt="" referrerpolicy="no-referrer" />` : `<div class="ve-none">${_t('Nincs borító')}</div>`;
      grid.querySelectorAll('.pp-item').forEach((b) => b.classList.toggle('on', list[Number(b.dataset.ppI)]?.url === url));
    };
    // A találatok forrásonként, beérkezés szerint jelennek meg (a már kirajzoltak a helyükön maradnak)
    const item = (c, i) => `<button class="pp-item" data-pp-i="${i}" title="${esc(c.source)}${c.title ? ' – ' + esc(c.title) : ''}"><img src="${esc(c.url)}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.parentElement.remove()" /><small><b>${esc(c.source)}</b>${c.title ? esc(c.title) : ''}${c.year ? ` (${esc(String(c.year))})` : ''}</small></button>`;
    const search = (q) => {
      const my = ++seq;
      list = [];
      grid.innerHTML = '<div class="spinner small pp-wait"></div>';
      const show = (r, done) => {
        if (my !== seq || !grid.isConnected) return;
        grid.querySelector('.pp-wait')?.remove();
        for (let i = list.length; i < r.length; i++) grid.insertAdjacentHTML('beforeend', item(r[i], i));
        list = r;
        if (!done) grid.insertAdjacentHTML('beforeend', '<div class="spinner small pp-wait"></div>');
        else if (!list.length) grid.innerHTML = `<p class="muted small">${_t('Nincs találat. Próbálj más keresőszót (pl. az eredeti címet), adj meg képcímet, vagy válassz képfájlt.')}</p>`;
        prev();
      };
      posterCandidates(x, q === x.title ? '' : q, (r) => show(r, false)).then((r) => show(r, true));
    };
    el.addEventListener('click', (e) => {
      const it = e.target.closest('[data-pp-i]');
      const a = e.target.closest('[data-ve]')?.dataset.ve;
      if (it) {
        poster = list[Number(it.dataset.ppI)].url;
        prev();
      } else if (a === 'search') search($('q').value.trim() || x.title);
      else if (a === 'useurl') {
        const u = $('url').value.trim();
        if (!/^https?:\/\/\S+$/i.test(u)) return toast(_t('Adj meg egy http(s) képcímet.'));
        poster = u;
        prev();
      } else if (a === 'reset') {
        poster = '';
        prev();
      } else if (a === 'cancel') close();
      else if (a === 'save') {
        const t = $('title').value.trim();
        const patch = {};
        if (t !== (x.userTitle || '')) patch.title = t;
        if (poster !== undefined && poster !== x.poster) patch.poster = poster;
        if (Object.keys(patch).length) {
          setVodOverride(x, patch);
          changed = true;
          refreshCards(x);
          toast(_t('Mentve'));
        }
        close();
      }
    });
    $('q').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        search($('q').value.trim() || x.title);
      }
    });
    el.querySelector('input[type=file]').addEventListener('change', async (e) => {
      const f = e.target.files?.[0];
      if (!f) return;
      try {
        poster = await fileToPoster(f);
        prev();
      } catch (err) {
        toast(err.message);
      }
    });
    prev();
    search(x.title);
  });
}

function fmtClock(sec) {
  sec = Math.max(0, Math.round(sec || 0));
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return (h ? h + ':' + String(m).padStart(2, '0') : m) + ':' + String(s).padStart(2, '0');
}
export { fmtClock };

// ---------------------------------------------------------------------------
// Saját médiatár (NAS / helyi mappa / hálózati cím)
// ---------------------------------------------------------------------------
/** Fájlútvonal → file:// cím (Windows-meghajtó, UNC \\NAS\megosztás, Unix). */
export function pathToUrl(p) {
  const s = String(p).replace(/\\/g, '/');
  const enc = (str) => str.split('/').map((seg) => (/^[a-zA-Z]:$/.test(seg) ? seg : encodeURIComponent(seg))).join('/');
  if (s.startsWith('//')) return 'file:' + enc(s); // //NAS/megosztás/...
  if (/^[a-zA-Z]:\//.test(s)) return 'file:///' + enc(s);
  return 'file://' + enc(s);
}

/** file:// cím → fájlútvonal (a feliratok kereséséhez a videó mellett). */
export function urlToPath(u) {
  const x = new URL(u);
  let p = decodeURIComponent(x.pathname);
  if (x.host) return '\\\\' + x.host + p.replace(/\//g, '\\');
  if (/^\/[a-zA-Z]:/.test(p)) p = p.slice(1);
  return p;
}

/** A lejátszólistában álló cím feloldása a lista helyéhez képest. */
function resolveEntry(u, base) {
  const s = String(u || '').trim();
  if (!s) return s;
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(s)) return s; // http://, file://, rtsp:// …
  if (/^[a-zA-Z]:[\\/]/.test(s) || s.startsWith('\\\\')) return pathToUrl(s); // C:\…, \\NAS\…
  if (s.startsWith('/') && base.startsWith('file:')) return pathToUrl(s); // /volume1/… (Unix)
  try {
    return new URL(s.replace(/\\/g, '/'), base).href; // relatív útvonal
  } catch {
    return s;
  }
}

/** Hálózati cím bejárása: lejátszólista, vagy könyvtárlista (pl. NAS webszerver) .m3u / .m3u8 hivatkozásai. */
async function scanUrl(url, force) {
  const found = [];
  const seen = new Set();
  const root = url.endsWith('/') ? url : url.replace(/[^/]*$/, '');
  const relOf = (abs) => decodeURIComponent(abs.slice(root.length)) || decodeURIComponent(abs.split('/').pop());
  const walk = async (u, depth) => {
    if (seen.has(u) || found.length >= 400) return;
    seen.add(u);
    const { text } = await api.fetchText(u, { maxAgeHours: 0.03, force });
    if (/#EXTINF|#EXTM3U/.test(text.slice(0, 5000)) && !/<html/i.test(text.slice(0, 500))) {
      const name = decodeURIComponent(u.split(/[?#]/)[0].split('/').pop() || 'lista');
      found.push({ name, rel: relOf(u) || name, url: u });
      return;
    }
    const dir = u.endsWith('/') ? u : u.replace(/[^/]*$/, '');
    for (const m of text.matchAll(/href\s*=\s*["']([^"'#]+)["']/gi)) {
      let abs;
      try {
        abs = new URL(m[1], dir).href;
      } catch {
        continue;
      }
      if (!abs.startsWith(dir) || abs === dir || abs.includes('?')) continue; // csak lefelé, rendezőlinkek nélkül
      const seg = decodeURIComponent(abs.slice(dir.length)).split('/')[0];
      if (/^[.@]|^#recycle$/i.test(seg)) continue; // rejtett és NAS-rendszermappák (pl. @eaDir)
      if (/\.m3u8?$/i.test(abs)) {
        if (!found.some((f) => f.url === abs)) {
          found.push({ name: decodeURIComponent(abs.split('/').pop()), rel: relOf(abs), url: abs });
        }
      } else if (abs.endsWith('/') && depth < 2) await walk(abs, depth + 1);
    }
  };
  await walk(url, 0);
  return found;
}

/** A forrásokban lévő lejátszólisták felderítése (legfeljebb 2 percenként, ha nem kényszerített). */
async function scanOwnSources({ force = false } = {}) {
  if (!force && own.scannedAt && Date.now() - own.scannedAt < 2 * 60e3) return;
  const s = store.settings;
  own.scanErrors = {};
  const files = [];
  for (const src of (s.ownSources || []).filter((x) => x.enabled)) {
    try {
      if (src.kind === 'folder') {
        if (!api.scanFolder) throw new Error(_t('Mappát csak az asztali alkalmazás tud olvasni (tévén / böngészőben hálózati címet adj meg).'));
        for (const f of await api.scanFolder(src.path)) {
          files.push({ key: `${src.id}|${f.rel}`, src: src.id, name: f.name.replace(/\.m3u8?$/i, ''), rel: f.rel, kind: 'folder', loc: f.path, base: pathToUrl(f.path), mtime: f.mtime });
        }
      } else {
        for (const f of await scanUrl(src.url, force)) {
          files.push({ key: `${src.id}|${f.rel}`, src: src.id, name: f.name.replace(/\.m3u8?$/i, ''), rel: f.rel, kind: 'url', loc: f.url, base: f.url, mtime: 0 });
        }
      }
    } catch (err) {
      own.scanErrors[src.id] = String(err.message || err);
    }
  }
  // Az új lejátszólisták alapértelmezett állapota (a beállítás szerint be- vagy kikapcsolva).
  s.ownFileState ||= {};
  let changed = false;
  for (const f of files) {
    if (!(f.key in s.ownFileState)) {
      s.ownFileState[f.key] = s.ownNewOn !== false;
      changed = true;
    }
  }
  if (changed) store.save();
  own.files = files;
  own.scannedAt = Date.now();
}

export function ownLists() {
  const st = store.settings.ownFileState || {};
  return own.files.filter((f) => st[f.key] !== false).map((f) => ({ id: f.key, name: f.name, loc: f.loc, kind: f.kind, base: f.base, mtime: f.mtime }));
}

async function loadOwnList(pl) {
  const text = pl.kind === 'folder' ? await api.readTextFile(pl.loc) : (await api.fetchText(pl.loc, { maxAgeHours: 0.03 })).text;
  const parsed = parseM3U(text);
  // A lejátszólista maga egy videó (pl. HLS kimenet) → egyetlen film a fájl nevével.
  if (parsed.isStream) return [{ title: pl.name, name: pl.name, url: pl.base, logo: '', group: '', duration: 0, fileHint: '' }];
  const hint = cleanName(pl.name.replace(/[_]+/g, ' '));
  return parsed.entries.map((e) => ({
    ...e,
    url: resolveEntry(e.url, pl.base),
    logo: e.logo ? resolveEntry(e.logo, pl.base) : '',
    group: e.group || pl.name, // csoport nélkül a lejátszólista neve (így soronként jelennek meg)
    fileHint: hint,
  }));
}

// Az automatikusan generált NAS-listák változásainak követése (10 percenként).
setInterval(() => {
  if ((store.settings.ownSources || []).some((s) => s.enabled) && own.ready && !player.active) loadOwn();
}, 10 * 60e3);

// ---------------------------------------------------------------------------
// Beállítások: film/sorozat listák
// ---------------------------------------------------------------------------
export function renderVodLists(box) {
  const s = store.settings;
  const busy = !!vod.loading;
  box.innerHTML = `<h2>${_t('VOD-listák (filmek, sorozatok)')} <button class="help-link" data-help="vod-lists" title="${_t('Súgó')}">?</button></h2>
    <p class="muted small">${_t('Ezek a listák nem élő csatornákat, hanem filmeket és sorozatepizódokat tartalmaznak (M3U / M3U8). A program a címekből ismeri fel, mi film és mi sorozat.')}</p>
    <div class="refresh-bar">
      <button class="btn primary" data-vl="refresh" ${busy ? 'disabled' : ''}>${ICON.refresh} ${busy ? _t('Betöltés…') : _t('Listák frissítése most')}</button>
      <span class="muted">${vod.ready ? `${_t('{length} film · {length2} sorozat', { length: vod.movies.length, length2: vod.series.length })}` : _t('még nincs betöltve')}</span>
    </div>
    ${toggleRow('vodAutoNext', _t('A következő rész automatikus indítása'), _t('Sorozatnál a rész végén néhány másodperc múlva indul a következő.'))}
    <h3>${_t('Beépített listák')}</h3>
    <ul class="src-list">${[...VOD_BUILTIN, ...vodPacks()].map((b) => {
      const on = builtinOn(b);
      const info = !on ? _t('kikapcsolva') : vod.errors[b.id] ? `<span class="warn">${_t('hiba: {esc}', { esc: esc(vod.errors[b.id]) })}</span>` : vod.ready ? `${_t('{x} bejegyzés', { x: vod.counts[b.id] || 0 })}` : '';
      return `<li data-vb="${esc(b.id)}"><input type="checkbox" class="switch" data-vl-builtin ${on ? 'checked' : ''} aria-label="${esc(b.name)}" />
        <span><b>${esc(b.name)}</b>${b.pack ? ` <span class="pill">${_t('kiegészítő csomag')}</span>` : ''}<small>${esc(b.desc || '')}${info ? ' · ' + info : ''}</small></span>
        ${b.url ? refreshSelectHtml('vod', b) : ''}
        ${b.pack ? `<button class="btn small danger" data-vl="pack-del">${_t('Eltávolítás')}</button>` : ''}</li>`;
    }).join('')}</ul>
    <div class="inline">
      ${api.caps.files ? `<button class="btn small" data-vl="pack-add">${_t('{plus} Kiegészítő csomag betöltése (…_vod.adaspack)', { plus: ICON.plus })}</button>` : ''}
      <button class="btn small" data-vl="pack-url">${api.caps.files ? '' : ICON.plus + ` ${_t('Kiegészítő csomag')} `}${_t('Betöltés webcímről')}</button>
      ${api.packsDir ? `<button class="btn small" data-vl="pack-dir">${_t('Csomagok mappája')}</button>` : ''}
      <button class="btn small" data-help="adaspack">${_t('Mi ez, és hogyan készíthetek ilyet?')}</button>
    </div>
    <p class="muted small">${_t('Kiegészítő csomag: egy <code>.adaspack</code> fájlba csomagolt lista, amely beépítettként jelenik meg, de a programmal nem érkezik – csak azon az eszközön lesz meg, ahová betöltöd (a mentés és az eszközök közti átvitel is viszi). Minden változat betölti: fájlból, webcímről (a tévén is), vagy szinkronnal egy másik eszközről; az asztali változat a <i>Csomagok mappája</i> tartalmát indításkor magától is.')}</p>
    <h3>${_t('Saját listák')}</h3>
    <ul class="src-list">${(s.vodCustom || [])
      .map((p) => {
        const info = !p.enabled ? _t('kikapcsolva') : vod.errors[p.id] ? `<span class="warn">${_t('hiba: {esc}', { esc: esc(vod.errors[p.id]) })}</span>` : vod.ready ? `${_t('{x} bejegyzés', { x: vod.counts[p.id] || 0 })}` : '';
        return `<li data-vc="${esc(p.id)}"><input type="checkbox" class="switch" data-vl-toggle ${p.enabled ? 'checked' : ''} aria-label="${_t('Bekapcsolva')}" />
          <span><b>${esc(p.name)}</b><small>${esc(p.url || (p.source ? `${_t('fájlból:')} ` + p.source : _t('beillesztett / fájlból')))}${info ? ' · ' + info : ''}</small></span>
          ${p.url ? refreshSelectHtml('vod', p) : ''}
          <button class="btn small" data-vl="rename">${_t('Átnevezés')}</button>
          <button class="btn small danger" data-vl="del">${_t('Törlés')}</button></li>`;
      })
      .join('') || `<li class="muted">${_t('Még nincs saját film/sorozat lista.')}</li>`}</ul>
    ${(catalog.tvVod || []).length ? `<h3>${_t('A csatornalistákból átkerült filmek és részek')}</h3>
    <p class="muted small">${_t('A csatornák között csak élő adás marad: a csatornalistákban talált filmek és sorozatrészek (hosszjelölés, <code>/movie/</code> / <code>/series/</code> cím, filmfájl évszámmal vagy részszámmal) itt jelennek meg. A csatornalista kikapcsolásával ezek is eltűnnek.')}</p>
    <ul class="src-list">${catalog.tvVod.map((t) => `<li><span><b>${esc(t.name)}</b><small>${_t('{length} bejegyzés a csatornalistából', { length: t.entries.length })}</small></span></li>`).join('')}</ul>` : ''}
    <div class="inline">
      <button class="btn small" data-vl="add-url">${_t('{plus} Lista hozzáadása címről', { plus: ICON.plus })}</button>
      ${api.caps.files ? `<button class="btn small" data-vl="add-file">${_t('{plus} Fájlból (M3U, ZIP)', { plus: ICON.plus })}</button>` : ''}
      <button class="btn small" data-vl="add-text">${_t('{plus} Beillesztés szövegként', { plus: ICON.plus })}</button>
    </div>
    <p class="muted small">${_t('Cím lehet M3U / M3U8 lista, egyetlen videó, vagy egy teljes GitHub-tárhely (pl. <code>https://github.com/szerző/tárhely</code>) – ilyenkor a program a benne lévő összes lejátszólistát betölti. Csak olyan tartalmat adj hozzá, amelyet jogszerűen nézhetsz.')}</p>
    <h3>${_t('A VOD oldal sorai')} <span class="muted small">${_t('· {esc} profil', { esc: esc(store.profile.name) })}</span></h3>
    <p class="muted">${_t('Húzással vagy a nyilakkal rendezheted, a kapcsolóval elrejtheted a sorokat (a műfajok a bekapcsolt listákból jönnek).')}</p>
    <div class="vod-rows">${vod.ready ? '' : `<p class="muted small">${_t('A listák betöltése után itt rendezheted a sorokat.')}</p>`}</div>`;
  if (vod.ready) {
    rowOrderEditor(box.querySelector('.vod-rows'), {
      rows: vodRows(),
      label: vodRowLabel,
      defaults: () => vodDefaultRows(),
      onSave: (rows) => store.setProfileValue('vodRows', rows),
      resetMsg: _t('A VOD oldal sorai visszaálltak az alapértelmezettre'),
    });
  }

  if (box.dataset.bound) return;
  box.dataset.bound = '1';
  const reload = async () => {
    renderVodLists(box);
    await loadVod({ force: false });
    if (document.body.contains(box)) renderVodLists(box);
  };
  box.addEventListener('change', (e) => {
    e.stopPropagation();
    const t = e.target;
    if (t.matches('[data-refresh]')) {
      const key = t.dataset.refresh;
      const i = key.indexOf(':');
      setRefreshHours(key.slice(0, i), key.slice(i + 1), Number(t.value));
      toast(_t('Mentve: a lista {h} óránként frissül.', { h: t.value }));
    } else if (t.matches('[data-vl-builtin]')) {
      s.vodBuiltin = { ...s.vodBuiltin, [t.closest('[data-vb]').dataset.vb]: t.checked };
      store.save();
      reload();
    } else if (t.matches('[data-vl-toggle]')) {
      const p = s.vodCustom.find((x) => x.id === t.closest('[data-vc]').dataset.vc);
      p.enabled = t.checked;
      store.save();
      reload();
    } else if (t.dataset.vset) {
      store.set(t.dataset.vset, t.checked);
    }
  });
  box.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-vl]');
    if (!b) return;
    e.stopPropagation();
    const id = b.closest('[data-vc]')?.dataset.vc;
    const p = id && s.vodCustom.find((x) => x.id === id);
    switch (b.dataset.vl) {
      case 'pack-add':
        if ((await pickAndImportPacks())?.ok.length) reload();
        break;
      case 'pack-url':
        if ((await promptImportPackUrl())?.ok.length) reload();
        break;
      case 'pack-del': {
        const pid = b.closest('[data-vb]').dataset.vb;
        const pk = (s.vodPacks || []).find((x) => x.id === pid);
        if (!pk || !(await confirmDialog(`${_t('Eltávolítod a(z) „{name}” kiegészítő csomagot erről az eszközről?', { name: pk.name })}`, { ok: _t('Eltávolítás') }))) return;
        await removePack('vod', pid);
        toast(_t('A csomag eltávolítva. (Ha a Csomagok mappájában is ott van, a következő indításkor visszakerül.)'), { timeout: 7000 });
        reload();
        break;
      }
      case 'pack-dir':
        api.packsDir();
        break;
      case 'refresh':
        renderVodLists(box);
        toast(_t('Film- és sorozatlisták frissítése…'));
        await loadVod({ force: true });
        toast(`${_t('Kész: {length} film, {length2} sorozat', { length: vod.movies.length, length2: vod.series.length })}`);
        if (document.body.contains(box)) renderVodLists(box);
        break;
      case 'add-url': {
        const url = await promptDialog(_t('A lista címe (M3U / M3U8 lista, videó vagy GitHub-tárhely):'), 'https://');
        if (!url) return;
        if (!isUrl(url)) return toast(_t('Ez nem érvényes http(s) cím.'));
        const name = (await promptDialog(_t('A lista neve:'), guessName(url))) || _t('Saját lista');
        s.vodCustom = [...(s.vodCustom || []), { id: newId(), name, url, enabled: true }];
        store.save();
        reload();
        break;
      }
      case 'add-file': {
        const filters = [{ name: _t('M3U lejátszólista vagy ZIP'), extensions: ['m3u', 'm3u8', 'txt', 'zip'] }];
        const picked = api.openFiles ? await api.openFiles(filters) : [await api.openFile(filters)].filter(Boolean);
        if (!picked?.length) return;
        let files, res;
        toast(_t('Fájlok beolvasása és feldolgozása…'));
        try {
          files = await readPickedFiles(picked);
          res = combinePlaylists(files);
        } catch (err) {
          return toast(String(err.message || err));
        }
        if (!res.entries) return toast(_t('A kiválasztott fájlokban nincs lejátszható bejegyzés.'));
        const zip = picked.length === 1 && /\.zip$/i.test(picked[0].name);
        const guess = picked.length === 1 ? picked[0].name.replace(/\.(m3u8?|txt|zip)$/i, '') : _t('Saját lista');
        const name = (await promptDialog(_t('A lista neve:'), guess)) || guess;
        await addCustomVodText(name, res.text, { source: zip ? picked[0].name : res.files > 1 ? `${_t('{files} fájl', { files: res.files })}` : picked[0].name });
        toast(`${_t('„{name}” hozzáadva: {entries} tétel', { name, entries: res.entries })}${res.genres ? `${_t(', {genres} műfaj', { genres: res.genres })}` : ''}.`);
        reload();
        break;
      }
      case 'add-text': {
        const text = await promptDialog(_t('Illeszd be a lista tartalmát (#EXTINF sorok és címek):'), '');
        if (!text) return;
        if (!parseM3U(text).entries.length) return toast(_t('Nem található benne bejegyzés.'));
        await addCustomVodText(_t('Beillesztett lista'), text);
        reload();
        break;
      }
      case 'rename': {
        const name = await promptDialog(_t('A lista új neve:'), p.name);
        if (!name) return;
        p.name = name;
        store.save();
        renderVodLists(box);
        break;
      }
      case 'del':
        if (!(await confirmDialog(`${_t('Törlöd a(z) „{name}” listát?', { name: p.name })}`, { ok: _t('Törlés'), danger: true }))) return;
        s.vodCustom = s.vodCustom.filter((x) => x !== p);
        if (p.textKey) api.docSet?.(p.textKey, null)?.catch?.(() => {});
        store.save();
        reload();
        break;
    }
  });
}

function toggleRow(key, label, desc) {
  return `<label class="setting"><span><b>${label}</b><small>${desc}</small></span>
    <input type="checkbox" class="switch" data-vset="${key}" ${store.settings[key] !== false ? 'checked' : ''} /></label>`;
}

function guessName(url) {
  const gh = /github\.com\/([^/]+)\/([^/#?]+)/i.exec(url);
  if (gh) return gh[2];
  try {
    const u = new URL(url);
    return u.pathname.split('/').pop().replace(/\.(m3u8?|txt)$/i, '') || u.hostname;
  } catch {
    return _t('Saját lista');
  }
}

// ---------------------------------------------------------------------------
// Beállítások: Saját médiatár (források és a bennük talált lejátszólisták)
// ---------------------------------------------------------------------------
export function renderOwnLists(box) {
  const s = store.settings;
  const st = s.ownFileState || {};
  const sources = s.ownSources || [];
  const busy = !!own.loading;
  box.innerHTML = `<h2>${_t('VOD – saját médiatár (NAS)')} <button class="help-link" data-help="own" title="${_t('Súgó')}">?</button></h2>
    <p class="muted small">${_t('Add meg a mappát (pl. a NAS megosztott mappáját) vagy hálózati címet, ahol a filmjeid és sorozataid .m3u / .m3u8 lejátszólistái keletkeznek. A program az almappákat is átnézi; minden talált lejátszólista külön, ki-be kapcsolható lista. Az új listákat magától észreveszi (10 percenként és a Saját oldal megnyitásakor).')}</p>
    <div class="refresh-bar">
      <button class="btn primary" data-ol="rescan" ${busy ? 'disabled' : ''}>${ICON.refresh} ${busy ? _t('Beolvasás…') : _t('Újraolvasás most')}</button>
      <span class="muted">${own.ready ? `${_t('{length} lejátszólista · {length2} film · {length3} sorozat', { length: own.files.length, length2: own.movies.length, length3: own.series.length })}` : _t('még nincs beolvasva')}</span>
    </div>
    <label class="setting"><span>${_t('<b>Új lejátszólisták automatikusan bekapcsolva</b>')}<small>${_t('Ha kikapcsolod, az újonnan megjelenő listákat neked kell bekapcsolnod.')}</small></span>
      <input type="checkbox" class="switch" data-oset="ownNewOn" ${s.ownNewOn !== false ? 'checked' : ''} /></label>
    <div class="own-sources">${sources
        .map((src) => {
          const files = own.files.filter((f) => f.src === src.id);
          const err = own.scanErrors[src.id];
          return `<div class="own-src" data-src="${esc(src.id)}">
            <div class="own-src-head">
              <input type="checkbox" class="switch" data-ol-src ${src.enabled ? 'checked' : ''} aria-label="${_t('Forrás bekapcsolva')}" />
              <span><b>${esc(src.name)}</b><small>${src.kind === 'folder' ? _t('Mappa') : _t('Hálózati cím')}: ${esc(src.path || src.url)}${err ? ` · <span class="warn">${_t('hiba: {esc}', { esc: esc(err) })}</span>` : src.enabled ? ` ${_t('· {length} lejátszólista', { length: files.length })}` : ' · kikapcsolva'}</small></span>
              ${files.length ? `<button class="btn small" data-ol="all-on">${_t('Mind be')}</button><button class="btn small" data-ol="all-off">${_t('Mind ki')}</button>` : ''}
              <button class="btn small" data-ol="rename">${_t('Átnevezés')}</button>
              <button class="btn small danger" data-ol="del">${_t('Törlés')}</button>
            </div>
            ${src.enabled && files.length
                ? `<ul class="src-list own-files">${files
                    .map((f) => {
                      const on = st[f.key] !== false;
                      const e2 = own.errors[f.key];
                      return `<li data-file="${esc(f.key)}"><input type="checkbox" class="switch" data-ol-file ${on ? 'checked' : ''} aria-label="${esc(f.name)}" />
                        <span><b>${esc(f.name)}</b><small>${esc(f.rel)}${!on ? ' · kikapcsolva' : e2 ? ` · <span class="warn">${_t('hiba: {esc}', { esc: esc(e2) })}</span>` : own.ready ? ` ${_t('· {x} bejegyzés', { x: own.counts[f.key] || 0 })}` : ''}</small></span></li>`;
                    })
                    .join('')}</ul>`
                : ''}
          </div>`;
        })
        .join('') || `<p class="muted">${_t('Még nincs forrás megadva.')}</p>`}</div>
    <div class="inline">
      ${api.caps.folders ? `<button class="btn small" data-ol="pick">${_t('{plus} Mappa kiválasztása…', { plus: ICON.plus })}</button><button class="btn small" data-ol="path">${_t('{plus} Mappa útvonalának megadása', { plus: ICON.plus })}</button>` : ''}
      <button class="btn small" data-ol="url">${_t('{plus} Hálózati cím (http) megadása', { plus: ICON.plus })}</button>
    </div>
    <p class="muted small">${api.caps.folders ? `${_t('Mappa például: <code>\\\\NAS\\Media\\Listak</code>, <code>Z:\\Listak</code> vagy <code>/mnt/nas/listak</code>.')}` : `${_t('Ezen az eszközön mappát nem lehet olvasni; add meg a NAS webes címét (pl. <code>http://192.168.1.10/listak/</code>), ahol a lejátszólisták elérhetők.')}`} ${_t('A listákban lévő relatív útvonalakat (pl. <code>Filmek/Film.mkv</code>) a lista helyéhez képest értelmezi.')}</p>`;

  if (box.dataset.bound) return;
  box.dataset.bound = '1';
  const reload = async (force = true) => {
    renderOwnLists(box);
    await loadOwn({ force });
    if (document.body.contains(box)) renderOwnLists(box);
  };
  box.addEventListener('change', (e) => {
    e.stopPropagation();
    const t = e.target;
    const srcId = t.closest('[data-src]')?.dataset.src;
    if (t.dataset.oset) store.set(t.dataset.oset, t.checked);
    else if (t.matches('[data-ol-src]')) {
      const src = s.ownSources.find((x) => x.id === srcId);
      src.enabled = t.checked;
      store.save();
      reload();
    } else if (t.matches('[data-ol-file]')) {
      s.ownFileState = { ...(s.ownFileState || {}), [t.closest('[data-file]').dataset.file]: t.checked };
      store.save();
      reload(false);
    }
  });
  box.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-ol]');
    if (!b) return;
    e.stopPropagation();
    const srcId = b.closest('[data-src]')?.dataset.src;
    const src = srcId && s.ownSources.find((x) => x.id === srcId);
    const addSource = (x) => {
      s.ownSources = [...(s.ownSources || []), { id: newId(), enabled: true, ...x }];
      store.save();
      reload();
    };
    switch (b.dataset.ol) {
      case 'rescan':
        toast(_t('A saját médiatár újraolvasása…'));
        await reload();
        toast(`${_t('Kész: {length} lejátszólista, {length2} film, {length3} sorozat', { length: own.files.length, length2: own.movies.length, length3: own.series.length })}`);
        break;
      case 'pick': {
        const p = await api.pickFolder();
        if (p) addSource({ kind: 'folder', path: p, name: p.split(/[\\/]/).filter(Boolean).pop() || p });
        break;
      }
      case 'path': {
        const p = await promptDialog(_t('A mappa útvonala (pl. \\\\NAS\\Media\\Listak vagy /mnt/nas/listak):'), '');
        if (p) addSource({ kind: 'folder', path: p.trim(), name: p.trim().split(/[\\/]/).filter(Boolean).pop() || p.trim() });
        break;
      }
      case 'url': {
        const u = await promptDialog(_t('A lejátszólisták címe (mappa a NAS webszerverén, vagy egy .m3u fájl):'), 'http://');
        if (!u) return;
        if (!isUrl(u)) return toast(_t('Ez nem érvényes http(s) cím.'));
        addSource({ kind: 'url', url: u.trim(), name: guessName(u) || 'NAS' });
        break;
      }
      case 'rename': {
        const n = await promptDialog(_t('A forrás új neve:'), src.name);
        if (!n) return;
        src.name = n;
        store.save();
        renderOwnLists(box);
        break;
      }
      case 'del':
        if (!(await confirmDialog(`${_t('Eltávolítod a(z) „{name}” forrást? (A NAS-on lévő fájlok nem törlődnek.)', { name: src.name })}`, { ok: _t('Eltávolítás'), danger: true }))) return;
        s.ownSources = s.ownSources.filter((x) => x !== src);
        store.save();
        reload();
        break;
      case 'all-on':
      case 'all-off': {
        const on = b.dataset.ol === 'all-on';
        const next = { ...(s.ownFileState || {}) };
        for (const f of own.files.filter((x) => x.src === srcId)) next[f.key] = on;
        s.ownFileState = next;
        store.save();
        reload(false);
        break;
      }
    }
  });
}
