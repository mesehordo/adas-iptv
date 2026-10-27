// Beállítások, profilok és profilonkénti adatok (kedvencek, előzmények, emlékeztetők).
import { api } from './api.js';
import { bus, debounce } from './util.js';

import { _t } from './i18n.js';
export const DEFAULT_PLAYLIST = 'https://iptv-org.github.io/iptv/index.m3u';

/** A forrás megjelenített neve: a beépítetteké mindig a felület nyelvén (a mentett név az első indítás nyelvén van). */
export const epgSourceName = (src) => BUILTIN_EPG.find((b) => b.url === src.url)?.name || src.name;

/**
 * Beépített műsorújság-források. A nem magyar források alapból ki vannak kapcsolva. country: melyik ország forrása
 * (az első indításkor a választott régióhoz ez alapján kapcsolódnak be / ki – nem a címből kitalálva).
 */
export const BUILTIN_EPG = [
  { url: 'https://iptv-epg.org/files/epg-hu.xml.gz', name: _t('Magyarország (iptv-epg.org)'), enabled: true, country: 'HU' },
  // (az open-epg.com az epgshare01 előtt: a két forrás címei és időpontjai a legtöbb csatornán percre egyeznek, de az
  // epgshare01 néhány csatornán – Nickelodeon, Nicktoons – a világidőt magyar időként jelöli, így 2 órát csúszik)
  { url: 'https://www.open-epg.com/files/hungary1.xml.gz', name: _t('Magyarország (open-epg.com)'), enabled: true, country: 'HU' },
  { url: 'https://epgshare01.online/epgshare01/epg_ripper_HU1.xml.gz', name: _t('Magyarország (epgshare01)'), enabled: true, country: 'HU' },
  { url: 'https://epgshare01.online/epgshare01/epg_ripper_SK1.xml.gz', name: _t('Szlovákia (epgshare01)'), enabled: false, country: 'SK' },
  { url: 'https://epgshare01.online/epgshare01/epg_ripper_RO1.xml.gz', name: _t('Románia (epgshare01)'), enabled: false, country: 'RO' },
  { url: 'https://iptv-epg.org/files/epg-at.xml.gz', name: 'Ausztria (iptv-epg.org)', enabled: false, country: 'AT' },
  { url: 'https://iptv-epg.org/files/epg-de.xml.gz', name: _t('Németország (iptv-epg.org)'), enabled: false, country: 'DE' },
  { url: 'https://iptv-epg.org/files/epg-gb.xml.gz', name: _t('Egyesült Királyság (iptv-epg.org)'), enabled: false, country: 'GB' },
  { url: 'https://iptv-epg.org/files/epg-us.xml.gz', name: _t('Egyesült Államok (iptv-epg.org)'), enabled: false, country: 'US' },
  { url: 'https://iptv-epg.org/files/epg-fr.xml.gz', name: _t('Franciaország (iptv-epg.org)'), enabled: false, country: 'FR' },
  { url: 'https://iptv-epg.org/files/epg-it.xml.gz', name: _t('Olaszország (iptv-epg.org)'), enabled: false, country: 'IT' },
  { url: 'https://iptv-epg.org/files/epg-es.xml.gz', name: _t('Spanyolország (iptv-epg.org)'), enabled: false, country: 'ES' },
  { url: 'https://i.mjh.nz/PlutoTV/all.xml.gz', name: _t('Pluto TV csatornák (i.mjh.nz)'), enabled: false },
  { url: 'https://i.mjh.nz/SamsungTVPlus/all.xml.gz', name: _t('Samsung TV Plus csatornák (i.mjh.nz)'), enabled: false },
  { url: 'https://i.mjh.nz/Plex/all.xml.gz', name: _t('Plex csatornák (i.mjh.nz)'), enabled: false },
];

/**
 * Beépített, ki-be kapcsolható csatornalisták. Ha több is be van kapcsolva, az azonos csatornák
 * egyetlen csatornává olvadnak össze (a különböző listák adásai tartalék forrásként szolgálnak).
 * stream: true → a cím maga egy adás (nem csatornalista), egyetlen csatornaként jelenik meg.
 * regional: true → az ország csak a regionális változatot jelöli, név szerint országtól függetlenül egyesítünk.
 */
export const BUILTIN_PLAYLISTS = [
  {
    id: 'iptvorg',
    name: 'iptv-org',
    url: DEFAULT_PLAYLIST,
    desc: _t('A világ legnagyobb nyilvános, közösségi csatornagyűjteménye (kb. 10 000 csatorna), részletes csatornaadatokkal.'),
  },
  {
    id: 'freetv',
    name: 'Free-TV',
    url: 'https://raw.githubusercontent.com/Free-TV/IPTV/master/playlist.m3u8',
    desc: _t('Kézzel válogatott, ingyenesen fogható csatornák országonként (kb. 2000 adás).'),
  },
  {
    id: 'plutotv',
    regional: true, // ugyanaz a csatorna több ország változatával
    name: 'Pluto TV',
    url: 'https://raw.githubusercontent.com/BuddyChewChew/app-m3u-generator/main/playlists/plutotv_all.m3u',
    desc: _t('A Pluto TV ingyenes, reklámmal támogatott csatornái több országból, műsorújsággal.'),
  },
  {
    id: 'samsungtvplus',
    regional: true, // ugyanaz a csatorna több ország változatával
    name: 'Samsung TV Plus',
    url: 'https://raw.githubusercontent.com/BuddyChewChew/app-m3u-generator/main/playlists/samsungtvplus_all.m3u',
    desc: _t('A Samsung TV Plus ingyenes csatornái több országból, műsorújsággal.'),
  },
  {
    id: 'plex',
    regional: true, // ugyanaz a csatorna több ország változatával
    name: 'Plex',
    url: 'https://raw.githubusercontent.com/BuddyChewChew/app-m3u-generator/main/playlists/plex_all.m3u',
    desc: _t('A Plex ingyenes élő csatornái több országból, műsorújsággal.'),
  },
  {
    id: 'freecast',
    name: 'FreeCast Hub',
    url: 'https://raw.githubusercontent.com/freecasthub/public-iptv/main/playlist.m3u',
    desc: _t('Kis, válogatott nyilvános lista (hírek, zene, sport; kb. 100 adás).'),
  },
  {
    id: 'dragonhall',
    name: 'DragonHall TV',
    url: 'https://tv.dragonhall.hu/live/dragonhall.m3u8',
    desc: _t('Magyar internetes adás (egyetlen csatorna).'),
    stream: true,
    country: 'HU',
    logo: '',
  },
];

/**
 * Beépített VOD-listák (filmek, sorozatok). asset: a programmal együtt szállított lista (src/lists);
 * off: alapból kikapcsolva (a Beállítások → VOD alatt kapcsolható be).
 * A nem nyilvános listák nem ide kerülnek, hanem kiegészítő csomagként (.adaspack, lásd vod.js).
 */
export const VOD_BUILTIN = [
  {
    id: 'orphaned',
    name: 'Orphaned Films',
    url: 'https://www.orphanedfilms.com/api/tv/playlist.m3u',
    desc: _t('Több mint 1300 film témák szerint csoportosítva, borítóképekkel; többségük közkincs (public domain), az archive.org-ról.'),
  },
  {
    id: 'pdmovies',
    name: _t('Közkincs filmek (OnlineM3U)'),
    url: 'https://raw.githubusercontent.com/OnlineM3U/publicdomainm3u/main/movies.m3u',
    desc: _t('Válogatott klasszikus, szerzői jogi védelem alól kikerült filmek műfajok szerint (archive.org).'),
  },
];

/** Ajánlott kiegészítő lejátszólisták (a beépítetteken felül). */
export const PLAYLIST_PRESETS = [];

/**
 * Választható profilképek: src/avatars/0.png … 28.png (256×256) – 0–19 szereplők (állatok, emberek,
 * robotok), 20–28 arc nélküli tárgyak (bájital, kontroller, fejhallgató, ecset…). A betűs változattal
 * együtt pontosan 30 választási lehetőség.
 */
export const AVATAR_COUNT = 29;
export const avatarUrl = (n) => `avatars/${n}.png`;
// új profilok alapértelmezett képei, változatosan (róka, kisfiú, ezüsthajú, béka, elf, robot…)
const DEFAULT_AVATARS = [3, 16, 4, 11, 18, 8, 1, 19, 9, 0];

export const PROFILE_COLORS =['#e50914', '#2f80ed', '#27ae60', '#f2994a', '#9b51e0', '#eb5757', '#00b8a9', '#f2c94c'];

const DEFAULT_SETTINGS = {
  playlistUrl: DEFAULT_PLAYLIST, // az iptv-org lista címe (módosítható)
  builtinLists: Object.fromEntries(BUILTIN_PLAYLISTS.map((p) => [p.id, true])), // beépített listák be/ki
  customPlaylists: [], // { id, name, url?, text?, enabled }
  customChannels: [], // { id, name, url, logo, category, country, ua, referrer }
  vodBuiltin: Object.fromEntries(VOD_BUILTIN.map((p) => [p.id, true])), // beépített film/sorozat listák be/ki
  vodCustom: [], // saját film/sorozat listák: { id, name, url?, text?, enabled }
  vodAutoNext: true, // sorozatnál a következő rész automatikus indítása
  ownSources: [], // Saját médiatár forrásai: { id, name, kind: 'folder' | 'url', path?, url?, enabled }
  ownFileState: {}, // a forrásokban talált lejátszólisták be/ki állapota: { 'forrás|relatív út': true/false }
  ownNewOn: true, // az újonnan megjelenő lejátszólisták alapból bekapcsolva
  settingsView: 'tabs', // a Beállítások elrendezése: 'tabs' (fülek) vagy 'tiles' (csempés kezdőlap)
  recMeta: {}, // felvételek: fájl → { chId, title, at }
  gamepad: true, // kontroller (játékvezérlő) kezelése (gamepad.js; Androidon a rendszer kezeli)
  huInfo: true, // magyar információk (Wikidata / Wikipédia / TMDB)
  tmdbKey: '', // opcionális TMDB API-kulcs vagy olvasási token
  omdbKey: '', // opcionális OMDb API-kulcs (borítókép-kereső)
  osApiKey: '', // OpenSubtitles API-kulcs
  osUser: '', // OpenSubtitles felhasználónév (a letöltéshez)
  osPass: '', // OpenSubtitles jelszó (csak helyben tárolva)
  osToken: '', // bejelentkezési token
  osBaseUrl: '',
  subsAuto: false, // felirat automatikus keresése film / rész indításakor
  subsLang: 'hu', // 'hu' | 'en'
  subsSize: 'normal', // 'small' | 'normal' | 'large' | 'huge'
  playerButtons: {}, // a vezérlősáv kiegészítő gombjai: { kulcs: false } = elrejtve (player.js PLAYER_BUTTONS)
  bgAudio: false, // Android: háttérlejátszás (csak hang)
  autoPip: false, // Android: videó közben kilépve kis ablakban (kép a képben) látszik tovább
  epgSources: BUILTIN_EPG,
  useEmbeddedEpg: true, // a lejátszólista x-tvg-url forrása
  epgRefreshHours: 12,
  homeCountry: 'HU',
  autoFallback: true,
  playbackEngine: 'auto', // 'auto' | 'native' | 'hlsjs' | 'exo' (Android: natív lejátszó élő tévéhez is) – auto: TV-n a beépített lejátszó, máshol hls.js
  hideOffline: false,
  autoCheck: true,
  sportMenu: true, // Sport menüpont (a TV, VOD mellett) – Beállítások → Sport
  radioMenu: true, // Rádió menüpont – Beállítások → Rádió
  radioSources: { rb: true, verified: true, iprd: true }, // rádióforrások be/ki
  radioLists: [], // saját rádiólisták: { id, name, url, enabled }
  // rádió-hangzás: hangszínszabályzó, hangerő-kiegyenlítés, térhatás, retro szűrő, átúsztatás (mp), vizualizáció
  radioFx: { eq: 'flat', level: true, widen: false, retro: false, xfade: 2, vis: 'spectrum', volume: 0.9 },
  heroPreview: true,  resumeLast: false,
  showAdult: false,
  mediaBridge: true, // asztali: FFmpeg-híd az AC3/DTS hanghoz, beágyazott feliratokhoz, régi formátumokhoz
  volume: 0.8,
  reminderLead: 2, // emlékeztető: ennyi perccel a műsor kezdete előtt
  reminderAutoSwitch: false, // a műsor kezdetekor automatikus átkapcsolás (ha az alkalmazás nyitva van)
  runInBackground: false, // asztali gép: bezáráskor a tálcán fut tovább (emlékeztetőkhöz)
  startWithSystem: false, // asztali gép: indítás a rendszerrel, a tálcára
  updateSource: '', // frissítési forrás: GitHub „tulajdonos/tároló” vagy JSON-cím
  updateAuto: true,
  lastUpdateCheck: 0,
};

/** A gyári beállítások mély másolata – a tömbök / objektumok ne legyenek közösek a mentett adatokkal. */
const defaults = () => JSON.parse(JSON.stringify(DEFAULT_SETTINGS));

// ---------------------------------------------------------------------------
// Sémaellenőrzés (B32): betöltéskor és minden import előtt ugyanaz. A hibás típusú beállítás (pl. tömb helyett
// null, szöveg vagy objektum) az alapértékre áll, a tömbök hibás elemei kimaradnak – így egy formailag
// elfogadott, de hibás mentés sem okozhat tartós indítási hibát.
// ---------------------------------------------------------------------------
const kindOf = (v) => (Array.isArray(v) ? 'array' : v === null ? 'null' : typeof v);
// az alapértékek között nem szereplő, de ismert szerkezetű beállítások
const EXTRA_KINDS = { sportWatch: 'array', customThemes: 'array', rssFeeds: 'array', recSchedule: 'array', kidsMarks: 'object', listRefresh: 'object', tvPacks: 'array', vodPacks: 'array', weatherLoc: 'object', rssDefaultsSeen: 'array', radioPacks: 'array' };
// objektumelemekből álló tömbök (a nem objektum elem kimarad)
const OBJECT_LISTS = ['sportWatch', 'customThemes', 'customPlaylists', 'customChannels', 'vodCustom', 'ownSources', 'epgSources', 'rssFeeds', 'recSchedule', 'tvPacks', 'vodPacks', 'radioLists', 'radioPacks'];
/** → { settings: javított másolat, fixed: [a javított kulcsok] } */
export function sanitizeSettings(raw) {
  const fixed = [];
  if (kindOf(raw) !== 'object') {
    fixed.push('settings');
    raw = {};
  }
  const out = { ...raw };
  for (const [k, dv] of Object.entries(DEFAULT_SETTINGS)) {
    if (!(k in out)) continue;
    const want = kindOf(dv);
    if (want === 'null' || want === 'undefined') continue;
    if (kindOf(out[k]) !== want) {
      out[k] = JSON.parse(JSON.stringify(dv));
      fixed.push(k);
    }
  }
  for (const [k, want] of Object.entries(EXTRA_KINDS)) {
    if (k in out && out[k] != null && kindOf(out[k]) !== want) {
      delete out[k];
      fixed.push(k);
    }
  }
  for (const k of OBJECT_LISTS) {
    if (!Array.isArray(out[k])) continue;
    const n = out[k].length;
    out[k] = out[k].filter((x) => kindOf(x) === 'object' && (k !== 'epgSources' || typeof x.url === 'string') && (k !== 'sportWatch' || (typeof x.id === 'string' && typeof x.kind === 'string')) && (k !== 'customThemes' || typeof x.text === 'string'));
    if (out[k].length !== n) fixed.push(k + '[]');
  }
  // (U02) a hangerő 0 és 1 között
  if (typeof out.volume === 'number' && !(out.volume >= 0 && out.volume <= 1)) {
    out.volume = Number.isFinite(out.volume) ? Math.min(1, Math.max(0, out.volume)) : DEFAULT_SETTINGS.volume;
    fixed.push('volume');
  }
  return { settings: out, fixed };
}

/**
 * Teljes import (fájl, átvétel, mentési pont) ellenőrzése a store cseréje előtt. Hibás szerkezetnél hibát dob
 * (a működő állapot érintetlen); egyébként a javított másolatot adja. needProfiles: a profilok is kellenek.
 */
export function validateImport(data, { needProfiles = true } = {}) {
  if (kindOf(data) !== 'object' || kindOf(data.settings) !== 'object') throw new Error(_t('hibás formátum'));
  if (data.profiles !== undefined || needProfiles) {
    // (a megadott, de üres profillista mindig hiba – különben a meglévő profilok elveszhetnének)
    if (!Array.isArray(data.profiles) || !data.profiles.length) throw new Error(_t('hibás formátum: nincs benne profil'));
    if (!data.profiles.every((p) => kindOf(p) === 'object' && typeof p.id === 'string' && p.id && typeof (p.name ?? '') === 'string')) throw new Error(_t('hibás formátum: sérült profiladat'));
  }
  if (data.activeProfileId !== undefined && typeof data.activeProfileId !== 'string') throw new Error(_t('hibás formátum'));
  return { ...data, settings: sanitizeSettings(data.settings).settings };
}

/** Véletlen azonosító (8 karakter, a-z0-9) kriptográfiai forrásból. */
const randomId = () => Array.from(crypto.getRandomValues(new Uint8Array(8)), (b) => (b % 36).toString(36)).join('');

function newProfile(name, color, kids = false) {
  return {
    id: randomId(),
    name,
    color,
    kids,
    avatar: undefined, // profilkép sorszáma (avatarUrl), null = színes betű
    theme: 'netflix', // felületstílus (themes.js)
    rows: null, // főoldali sorok sorrendje: [{ key, on }], null = alapértelmezett
    favorites: [],
    recent: [],
    reminders: [], // { channelId, title, start, stop, notified }
    vodProgress: {}, // film / epizód kulcs -> { p: pozíció mp, d: hossz mp, t: időbélyeg, done }
    lastChannel: null,
  };
}

const num = (v, d = 0) => (Number.isFinite(Number(v)) && v !== null && v !== '' ? Number(v) : d);
const str = (v, max = 200) => (typeof v === 'string' ? v.slice(0, max) : v == null ? '' : String(v).slice(0, max));
const numMap = (o) => {
  const out = {};
  if (o && typeof o === 'object') for (const [k, v] of Object.entries(o)) if (Number.isFinite(Number(v))) out[k] = Number(v);
  return out;
};

/**
 * Importált / visszaállított profil típusainak rendbetétele: a számként használt mezők (statisztika, emlékeztetők
 * időpontjai, főoldali elrendezés) csak véges számok lehetnek, a szövegek szövegek – a HTML-sablonokba így nem
 * kerülhet a mentésből jelölőkód.
 */
export function cleanProfile(p) {
  p.id = str(p.id, 40) || randomId();
  p.name = str(p.name, 40) || '?';
  p.color = str(p.color, 40);
  p.kids = !!p.kids;
  if (!(p.avatar === undefined || p.avatar === null || p.avatar === 'custom' || Number.isInteger(p.avatar))) p.avatar = null;
  if (p.avatarData != null && !/^data:image\/(png|jpeg|jpg|webp|gif);base64,[A-Za-z0-9+/]+=*$/.test(String(p.avatarData))) p.avatarData = '';
  if (p.avatar === 'custom' && !p.avatarData) p.avatar = null;
  for (const k of ['favorites', 'recent']) p[k] = Array.isArray(p[k]) ? p[k].filter((x) => typeof x === 'string') : [];
  // kedvenc / legutóbb hallgatott rádiók: az adó adataival (csak szöveg, a címek csak http(s))
  const web = (u) => (typeof u === 'string' && /^https?:\/\/\S+$/i.test(u) ? u.slice(0, 2000) : '');
  for (const k of ['radioFavs', 'radioRecent'])
    p[k] = (Array.isArray(p[k]) ? p[k] : [])
      .filter((x) => x && typeof x === 'object' && typeof x.id === 'string' && web(x.url))
      .slice(0, 300)
      .map((x) => ({
        id: str(x.id, 200), name: str(x.name, 120), logo: web(x.logo), url: web(x.url), urls: (Array.isArray(x.urls) ? x.urls : []).map(web).filter(Boolean).slice(0, 6),
        country: str(x.country, 2), tags: (Array.isArray(x.tags) ? x.tags : []).map((t) => str(t, 40)).slice(0, 8), codec: str(x.codec, 10), bitrate: num(x.bitrate), homepage: web(x.homepage), rbId: str(x.rbId, 60),
        // (H11) címenkénti HTTP-fejlécek (csak a megtartott címekhez, szövegként)
        ...(x.headers && typeof x.headers === 'object'
          ? { headers: Object.fromEntries(Object.entries(x.headers).filter(([u, h]) => web(u) && h && typeof h === 'object').slice(0, 6).map(([u, h]) => [web(u), { ua: str(h.ua, 300), referrer: web(h.referrer) }])) }
          : {}),
      }));
  p.reminders = (Array.isArray(p.reminders) ? p.reminders : [])
    .filter((r) => r && typeof r === 'object' && Number.isFinite(Number(r.start)))
    .map((r) => ({ ...r, channelId: str(r.channelId), title: str(r.title, 300), start: num(r.start), stop: num(r.stop, num(r.start)), notified: !!r.notified }));
  if (p.stats && typeof p.stats === 'object') {
    const s = p.stats;
    const hours = Array.isArray(s.hours) ? s.hours.slice(0, 24).map((h) => num(h)) : [];
    while (hours.length < 24) hours.push(0);
    const vod = {};
    if (s.vod && typeof s.vod === 'object')
      for (const [k, v] of Object.entries(s.vod))
        if (v && typeof v === 'object') vod[k] = { t: num(v.t), title: str(v.title, 300), type: str(v.type, 20), poster: str(v.poster, 2000), last: num(v.last) };
    p.stats = { since: num(s.since, Date.now()), days: numMap(s.days), hours, ch: numMap(s.ch), vod, cat: numMap(s.cat), plays: Math.max(0, Math.round(num(s.plays))) };
  } else if (p.stats != null) p.stats = null; // nem használható érték: a statisztika újrakezdődik
  // (H02) a többi használt mező is: rossz alakú érték helyett biztonságos alapérték (különben az elfogadott import
  // után futási hiba jönne – pl. vodProgress: "x" → a pozíciómentés, watchlist: {} → a lista, rows: [null] → a TV oldal)
  const obj = (v) => v && typeof v === 'object' && !Array.isArray(v);
  const ids = (v, max = 2000) => (Array.isArray(v) ? v.filter((x) => typeof x === 'string').map((x) => x.slice(0, 500)).slice(0, max) : []);
  const objMap = (v, fn, max = 5000) => {
    const out = {};
    if (!obj(v)) return out;
    let n = 0;
    for (const [k, x] of Object.entries(v)) {
      if (n >= max) break;
      const y = fn(x);
      if (y !== null && y !== undefined) (out[k.slice(0, 500)] = y), n++;
    }
    return out;
  };
  for (const k of ['watchlist', 'vodFavs']) if (p[k] != null) p[k] = ids(p[k]);
  if (p.vodProgress != null)
    p.vodProgress = objMap(p.vodProgress, (x) => (obj(x) ? { ...x, p: num(x.p), d: num(x.d), t: num(x.t), done: !!x.done, ...(x.last != null ? { last: str(x.last, 500) } : {}) } : null));
  if (p.vodSubs != null) p.vodSubs = objMap(p.vodSubs, (x) => (obj(x) ? x : null));
  if (p.seriesReminders != null)
    p.seriesReminders = (Array.isArray(p.seriesReminders) ? p.seriesReminders : []).filter((x) => obj(x) && typeof x.channelId === 'string' && typeof x.key === 'string').slice(0, 500);
  for (const k of ['rows', 'vodRows'])
    if (p[k] != null) p[k] = (Array.isArray(p[k]) ? p[k] : []).filter((r) => obj(r) && typeof r.key === 'string').map((r) => ({ ...r, key: r.key.slice(0, 100), on: r.on !== false }));
  if (p.kidsAllow != null) {
    const ka = obj(p.kidsAllow) ? p.kidsAllow : {};
    // (a kifejezett tiltás – false – is megmarad; nem logikai érték – pl. a "false" szöveg – nem engedély)
    const bool = (x) => (typeof x === 'boolean' ? x : null);
    p.kidsAllow = { ch: objMap(ka.ch, bool), vod: objMap(ka.vod, bool) };
  }
  if (p.usage != null) p.usage = obj(p.usage) && typeof p.usage.day === 'string' ? { day: p.usage.day.slice(0, 20), sec: Math.max(0, num(p.usage.sec)), extra: Math.max(0, num(p.usage.extra)) } : null;
  for (const k of ['dailyLimit', 'maxAge']) if (p[k] != null) p[k] = Math.max(0, Math.min(k === 'maxAge' ? 18 : 24 * 60, Math.round(num(p[k]))));
  for (const k of ['statsOff', 'nightAudio', 'dashAuto']) if (p[k] != null) p[k] = !!p[k];
  for (const [k, max] of [['prefAudio', 20], ['prefSubs', 20], ['lastChannel', 500], ['theme', 100], ['dashNote', 5000]]) if (p[k] != null) p[k] = str(p[k], max);
  // témánként a választott színváltozat (themes.js): { téma: változat }
  if (p.themeVariants != null) p.themeVariants = objMap(p.themeVariants, (x) => (typeof x === 'string' && /^[a-z]{2,12}$/.test(x) ? x : null), 200);
  if (p.dash != null) {
    const d = p.dash;
    p.dash = d && typeof d === 'object' && Array.isArray(d.units)
      ? { cols: num(d.cols, 3), rows: num(d.rows, 2), units: d.units.filter((u) => u && typeof u.id === 'string').map((u) => ({ id: u.id, w: num(u.w, 1), h: num(u.h, 1) })) }
      : null;
  }
  return p;
}

// Mentések sorban, egymás után: egy korábban indult, lassan befejeződő írás nem írhatja felül a későbbit
// (pl. a visszaállított állapotot). A hiba nem néma: a store.saveError és a „save-state” esemény jelzi (B04).
let saveChain = Promise.resolve();
function writeStore(data) {
  const p = saveChain.then(() => api.storeSave(data));
  saveChain = p.then(
    () => {
      if (store.saveError) {
        store.saveError = null;
        bus.emit('save-state', null);
      }
    },
    (err) => {
      store.saveError = err || new Error('?');
      bus.emit('save-state', store.saveError);
    }
  );
  return p;
}

export const store = {
  settings: defaults(),
  profiles: [],
  activeProfileId: null,
  health: {}, // url -> [ok (0|1), időbélyeg]

  get profile() {
    return this.profiles.find((p) => p.id === this.activeProfileId) || this.profiles[0];
  },

  async load() {
    let data = (await api.storeLoad()) || {};
    if (kindOf(data) !== 'object') data = {};
    const { settings: clean, fixed } = sanitizeSettings(data.settings || {});
    // ha javítani kellett: az eredeti példány megmarad a dokumentumtárban (kézzel visszanézhető / helyreállítható)
    if (fixed.length) {
      console.warn('Hibás beállítások javítva:', fixed.join(', '));
      // (a fiókjelszó nélkül – a javítás előtti példány se tárolja szövegként)
      const copy = { ...data, settings: data.settings && typeof data.settings === 'object' ? { ...data.settings, osPass: undefined } : data.settings };
      Promise.resolve(api.docSet?.('store-before-repair', { at: Date.now(), fixed, data: copy })).catch(() => {});
      this.repaired = fixed;
    }
    this.settings = { ...defaults(), ...clean };
    // Új beépített források felvétele, ha a mentett lista régebbi.
    const known = new Set(this.settings.epgSources.map((s) => s.url));
    for (const s of BUILTIN_EPG) if (!known.has(s.url)) this.settings.epgSources.push({ ...s });
    // (egyszeri átrendezés a meglévő listákban is: az open-epg.com az epgshare01 elé – lásd BUILTIN_EPG)
    if (!(this.settings.epgOrder >= 2)) {
      const list = this.settings.epgSources;
      const oi = list.findIndex((x) => x.url === 'https://www.open-epg.com/files/hungary1.xml.gz');
      const ei = list.findIndex((x) => x.url === 'https://epgshare01.online/epgshare01/epg_ripper_HU1.xml.gz');
      if (ei >= 0 && oi > ei) list.splice(ei, 0, ...list.splice(oi, 1));
      this.settings.epgOrder = 2;
    }
    // Új beépített listák alapból bekapcsolva; a beépítettel azonos saját lista fölösleges.
    this.settings.builtinLists = { ...DEFAULT_SETTINGS.builtinLists, ...(this.settings.builtinLists || {}) };
    this.settings.vodBuiltin = { ...DEFAULT_SETTINGS.vodBuiltin, ...(this.settings.vodBuiltin || {}) };
    const builtinUrls = new Set(BUILTIN_PLAYLISTS.map((p) => p.url));
    this.settings.customPlaylists = this.settings.customPlaylists.filter((p) => !p.url || !builtinUrls.has(p.url));
    this.profiles = (Array.isArray(data.profiles) ? data.profiles : [])
      .filter((p) => p && typeof p === 'object')
      .map((p) => cleanProfile({ ...newProfile(p.name, p.color), ...p }));
    // első indítás (még nincs mentett profil): az első indítás varázslója hozza létre a profilokat –
    // addig ideiglenes alapprofilok, hogy a betöltés közben is legyen aktív profil
    this.firstRun = !this.profiles.length;
    if (!this.profiles.length) {
      this.profiles = [newProfile(_t('Én'), PROFILE_COLORS[0]), newProfile(_t('Gyerekek'), PROFILE_COLORS[3], true)];
    }
    // Profilkép a még képpel nem rendelkező (régebbi) profiloknak; null = betűs avatar.
    this.profiles.forEach((p, i) => {
      if (p.avatar === undefined) p.avatar = p.kids ? 6 : DEFAULT_AVATARS[i % DEFAULT_AVATARS.length];
    });
    this.activeProfileId = typeof data.activeProfileId === 'string' && this.profiles.some((p) => p.id === data.activeProfileId) ? data.activeProfileId : this.profiles[0].id;
    this.health = kindOf(data.health) === 'object' ? data.health : {};
    // A 30 napnál régebbi ellenőrzési eredmények elavultak; a tévén a tárhely is szűkös.
    const old = Date.now() - 30 * 86400e3;
    for (const [u, h] of Object.entries(this.health)) if (!h || h[1] < old) delete this.health[u];
  },

  serialize() {
    return {
      version: 1,
      settings: this.settings,
      profiles: this.profiles,
      activeProfileId: this.activeProfileId,
      health: this.health,
    };
  },

  save: debounce(function () {
    if (!store.frozen) writeStore(store.serialize()).catch(() => {}); // (a hibát a writeStore jelzi)
  }, 600),

  /** Azonnali mentés (pl. háttérbe kerüléskor, amikor a késleltetett mentés már nem futna le). → ígéret */
  flush() {
    if (this.profiles.length && !this.frozen) return writeStore(this.serialize()).catch(() => {});
    return Promise.resolve();
  },

  /** (H23) Azonnali mentés, amelynek hibája a hívóhoz jut (pl. import: sikert csak a tartós írás után jelezhet). */
  persist() {
    if (this.frozen) return Promise.reject(new Error(_t('A mentés most nem lehetséges.')));
    return writeStore(this.serialize());
  },

  /** A legutóbbi mentés hibája (null, ha rendben van). */
  saveError: null,

  /**
   * Az egész tár cseréje (átvétel másik eszközről, visszaállítás) – utána újratöltés jön. A memóriában lévő
   * régi állapot ezután már nem mentődik (a késleltetett mentés és a bezáráskori mentés felülírná). Ha az írás
   * nem sikerül, a fagyasztás visszaáll (a további mentések működnek), és a hiba a hívóhoz jut (B15).
   */
  async replaceAll(data) {
    const was = this.frozen;
    this.frozen = true;
    try {
      await writeStore(data);
    } catch (err) {
      this.frozen = was;
      throw err;
    }
  },

  set(key, value) {
    this.settings[key] = value;
    this.save();
    bus.emit('settings', key);
  },

  // --- profilok -----------------------------------------------------------
  addProfile(name, color, kids, avatar = null) {
    const p = newProfile(name, color, kids);
    p.avatar = avatar;
    this.profiles.push(p);
    this.save();
    return p;
  },
  removeProfile(id) {
    if (this.profiles.length <= 1) return;
    this.profiles = this.profiles.filter((p) => p.id !== id);
    if (this.activeProfileId === id) this.activeProfileId = this.profiles[0].id;
    this.save();
  },
  switchProfile(id) {
    this.activeProfileId = id;
    this.save();
    bus.emit('profile');
  },
  setProfileValue(key, value) {
    this.profile[key] = value;
    this.save();
    bus.emit('profile-' + key);
  },

  // --- kedvencek ----------------------------------------------------------
  isFavorite(id) {
    return this.profile.favorites.includes(id);
  },
  toggleFavorite(id) {
    const f = this.profile.favorites;
    const i = f.indexOf(id);
    if (i >= 0) f.splice(i, 1);
    else f.push(id);
    this.save();
    bus.emit('favorites', id);
    return i < 0;
  },
  moveFavorite(id, toIndex) {
    const f = this.profile.favorites;
    const i = f.indexOf(id);
    if (i < 0) return;
    f.splice(i, 1);
    f.splice(Math.max(0, Math.min(toIndex, f.length)), 0, id);
    this.save();
    bus.emit('favorites', id);
  },

  // --- előzmények ---------------------------------------------------------
  addRecent(id) {
    const p = this.profile;
    p.recent = [id, ...p.recent.filter((x) => x !== id)].slice(0, 30);
    p.lastChannel = id;
    this.save();
  },
  clearRecent() {
    this.profile.recent = [];
    this.save();
  },

  // --- emlékeztetők -------------------------------------------------------
  hasReminder(channelId, start) {
    return this.profile.reminders.some((r) => r.channelId === channelId && r.start === start);
  },
  toggleReminder(channelId, prog) {
    const p = this.profile;
    const i = p.reminders.findIndex((r) => r.channelId === channelId && r.start === prog.start);
    if (i >= 0) p.reminders.splice(i, 1);
    else p.reminders.push({ channelId, title: prog.title, start: prog.start, stop: prog.stop, notified: false });
    p.reminders.sort((a, b) => a.start - b.start);
    this.save();
    bus.emit('reminders');
    return i < 0;
  },

  // --- elérhetőség --------------------------------------------------------
  /**
   * Elérhetőség mentése. source: 'play' = valódi lejátszás eredménye, 'probe' = háttérellenőrzés.
   * Egy friss (12 órán belüli) sikertelen lejátszást a háttérellenőrzés „működik” eredménye nem írhat
   * felül – a lejátszás a megbízhatóbb jel (pl. a lista elérhető, de a kép nem jön le).
   */
  /** geo: a szerver 403 / 451 válasszal utasította el (jellemzően földrajzi korlátozás) */
  setHealth(url, ok, source = 'play', geo = false) {
    const prev = this.health[url];
    if (source === 'probe' && ok && prev && !prev[0] && prev[2] === 'p' && Date.now() - prev[1] < 12 * 3600e3) return;
    this.health[url] = ok || !geo ? [ok ? 1 : 0, Date.now(), source === 'play' ? 'p' : 'c'] : [0, Date.now(), source === 'play' ? 'p' : 'c', 'g'];
    this.save();
  },
  /** Egy forrás utolsó ismert állapota: { ok, t (idő), geo (403 / 451) } vagy null. */
  healthOf(url) {
    const h = this.health[url];
    if (!h) return null;
    return { ok: !!h[0], t: h[1], geo: h[3] === 'g' };
  },
};

// ---------------------------------------------------------------------------
// Listák frissítési gyakorisága (a webcímről töltött csatorna- és VOD-listáknál, a forráscímes
// kiegészítő csomagoknál is): listánként választható; a választás hiányában a lista (csomag) javaslata,
// ennek híján 6 óra. Kulcs: 'tv:<lista>' vagy 'vod:<lista>'.
// ---------------------------------------------------------------------------
export const REFRESH_CHOICES = [1, 2, 3, 6, 12, 24, 48];
export const DEFAULT_REFRESH_HOURS = 6;
const validHours = (h) => REFRESH_CHOICES.includes(Number(h));

/** A lista frissítési gyakorisága órában. scope: 'tv' | 'vod' */
export function refreshHoursOf(scope, pl) {
  const own = store.settings.listRefresh?.[`${scope}:${pl.id}`];
  return validHours(own) ? Number(own) : validHours(pl.refresh) ? Number(pl.refresh) : DEFAULT_REFRESH_HOURS;
}

export function setRefreshHours(scope, id, hours) {
  if (!validHours(hours)) return;
  store.settings.listRefresh = { ...(store.settings.listRefresh || {}), [`${scope}:${id}`]: Number(hours) };
  store.save();
  bus.emit('list-refresh', scope);
}
