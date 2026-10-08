// Beállítások, profilok és profilonkénti adatok (kedvencek, előzmények, emlékeztetők).
import { api } from './api.js';
import { bus, debounce } from './util.js';

export const DEFAULT_PLAYLIST = 'https://iptv-org.github.io/iptv/index.m3u';

/** Beépített műsorújság-források. A nem magyar források alapból ki vannak kapcsolva. */
export const BUILTIN_EPG = [
  { url: 'https://iptv-epg.org/files/epg-hu.xml.gz', name: 'Magyarország (iptv-epg.org)', enabled: true },
  { url: 'https://epgshare01.online/epgshare01/epg_ripper_HU1.xml.gz', name: 'Magyarország (epgshare01)', enabled: true },
  { url: 'https://epgshare01.online/epgshare01/epg_ripper_SK1.xml.gz', name: 'Szlovákia (epgshare01)', enabled: false },
  { url: 'https://epgshare01.online/epgshare01/epg_ripper_RO1.xml.gz', name: 'Románia (epgshare01)', enabled: false },
  { url: 'https://iptv-epg.org/files/epg-at.xml.gz', name: 'Ausztria (iptv-epg.org)', enabled: false },
  { url: 'https://iptv-epg.org/files/epg-de.xml.gz', name: 'Németország (iptv-epg.org)', enabled: false },
  { url: 'https://iptv-epg.org/files/epg-gb.xml.gz', name: 'Egyesült Királyság (iptv-epg.org)', enabled: false },
  { url: 'https://iptv-epg.org/files/epg-us.xml.gz', name: 'Egyesült Államok (iptv-epg.org)', enabled: false },
  { url: 'https://iptv-epg.org/files/epg-fr.xml.gz', name: 'Franciaország (iptv-epg.org)', enabled: false },
  { url: 'https://iptv-epg.org/files/epg-it.xml.gz', name: 'Olaszország (iptv-epg.org)', enabled: false },
  { url: 'https://iptv-epg.org/files/epg-es.xml.gz', name: 'Spanyolország (iptv-epg.org)', enabled: false },
  { url: 'https://i.mjh.nz/PlutoTV/all.xml.gz', name: 'Pluto TV csatornák (i.mjh.nz)', enabled: false },
  { url: 'https://i.mjh.nz/SamsungTVPlus/all.xml.gz', name: 'Samsung TV Plus csatornák (i.mjh.nz)', enabled: false },
  { url: 'https://i.mjh.nz/Plex/all.xml.gz', name: 'Plex csatornák (i.mjh.nz)', enabled: false },
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
    desc: 'A világ legnagyobb nyilvános, közösségi csatornagyűjteménye (kb. 10 000 csatorna), részletes csatornaadatokkal.',
  },
  {
    id: 'iptvanim',
    name: 'iptv-org – Animáció',
    url: 'https://iptv-org.github.io/iptv/categories/animation.m3u',
    desc: 'Az iptv-org animációs csatornái külön listaként (bekapcsolt iptv-org mellett ezek összevonódnak vele, új csatornát csak akkor adnak, ha az iptv-org ki van kapcsolva).',
  },
  {
    id: 'freetv',
    name: 'Free-TV',
    url: 'https://raw.githubusercontent.com/Free-TV/IPTV/master/playlist.m3u8',
    desc: 'Kézzel válogatott, ingyenesen fogható csatornák országonként (kb. 2000 adás).',
  },
  {
    id: 'plutotv',
    regional: true, // ugyanaz a csatorna több ország változatával
    name: 'Pluto TV',
    url: 'https://raw.githubusercontent.com/BuddyChewChew/app-m3u-generator/main/playlists/plutotv_all.m3u',
    desc: 'A Pluto TV ingyenes, reklámmal támogatott csatornái több országból, műsorújsággal.',
  },
  {
    id: 'samsungtvplus',
    regional: true, // ugyanaz a csatorna több ország változatával
    name: 'Samsung TV Plus',
    url: 'https://raw.githubusercontent.com/BuddyChewChew/app-m3u-generator/main/playlists/samsungtvplus_all.m3u',
    desc: 'A Samsung TV Plus ingyenes csatornái több országból, műsorújsággal.',
  },
  {
    id: 'plex',
    regional: true, // ugyanaz a csatorna több ország változatával
    name: 'Plex',
    url: 'https://raw.githubusercontent.com/BuddyChewChew/app-m3u-generator/main/playlists/plex_all.m3u',
    desc: 'A Plex ingyenes élő csatornái több országból, műsorújsággal.',
  },
  {
    id: 'freecast',
    name: 'FreeCast Hub',
    url: 'https://raw.githubusercontent.com/freecasthub/public-iptv/main/playlist.m3u',
    desc: 'Kis, válogatott nyilvános lista (hírek, zene, sport; kb. 100 adás).',
  },
  {
    id: 'dragonhall',
    name: 'DragonHall TV',
    url: 'https://tv.dragonhall.hu/live/dragonhall.m3u8',
    desc: 'Magyar internetes adás (egyetlen csatorna).',
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
    desc: 'Több mint 1300 film témák szerint csoportosítva, borítóképekkel; többségük közkincs (public domain), az archive.org-ról.',
  },
  {
    id: 'pdmovies',
    name: 'Közkincs filmek (OnlineM3U)',
    url: 'https://raw.githubusercontent.com/OnlineM3U/publicdomainm3u/main/movies.m3u',
    desc: 'Válogatott klasszikus, szerzői jogi védelem alól kikerült filmek műfajok szerint (archive.org).',
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
  epgSources: BUILTIN_EPG,
  useEmbeddedEpg: true, // a lejátszólista x-tvg-url forrása
  epgRefreshHours: 12,
  homeCountry: 'HU',
  autoFallback: true,
  playbackEngine: 'auto', // 'auto' | 'native' | 'hlsjs' – auto: TV-n a beépített lejátszó, máshol hls.js
  hideOffline: false,
  autoCheck: true,
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

function newProfile(name, color, kids = false) {
  return {
    id: Math.random().toString(36).slice(2, 10),
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

export const store = {
  settings: defaults(),
  profiles: [],
  activeProfileId: null,
  health: {}, // url -> [ok (0|1), időbélyeg]

  get profile() {
    return this.profiles.find((p) => p.id === this.activeProfileId) || this.profiles[0];
  },

  async load() {
    const data = (await api.storeLoad()) || {};
    this.settings = { ...defaults(), ...(data.settings || {}) };
    // Új beépített források felvétele, ha a mentett lista régebbi.
    const known = new Set(this.settings.epgSources.map((s) => s.url));
    for (const s of BUILTIN_EPG) if (!known.has(s.url)) this.settings.epgSources.push({ ...s });
    // Új beépített listák alapból bekapcsolva; a beépítettel azonos saját lista fölösleges.
    this.settings.builtinLists = { ...DEFAULT_SETTINGS.builtinLists, ...(this.settings.builtinLists || {}) };
    this.settings.vodBuiltin = { ...DEFAULT_SETTINGS.vodBuiltin, ...(this.settings.vodBuiltin || {}) };
    const builtinUrls = new Set(BUILTIN_PLAYLISTS.map((p) => p.url));
    this.settings.customPlaylists = this.settings.customPlaylists.filter((p) => !p.url || !builtinUrls.has(p.url));
    this.profiles = (data.profiles || []).map((p) => ({ ...newProfile(p.name, p.color), ...p }));
    if (!this.profiles.length) {
      this.profiles = [newProfile('Én', PROFILE_COLORS[0]), newProfile('Gyerekek', PROFILE_COLORS[3], true)];
    }
    // Profilkép a még képpel nem rendelkező (régebbi) profiloknak; null = betűs avatar.
    this.profiles.forEach((p, i) => {
      if (p.avatar === undefined) p.avatar = p.kids ? 6 : DEFAULT_AVATARS[i % DEFAULT_AVATARS.length];
    });
    this.activeProfileId = data.activeProfileId || this.profiles[0].id;
    this.health = data.health || {};
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
    if (!store.frozen) api.storeSave(store.serialize());
  }, 600),

  /** Azonnali mentés (pl. háttérbe kerüléskor, amikor a késleltetett mentés már nem futna le). */
  flush() {
    if (this.profiles.length && !this.frozen) api.storeSave(this.serialize());
  },

  /**
   * Az egész tár cseréje (átvétel másik eszközről, visszaállítás) – utána újratöltés jön. A memóriában lévő
   * régi állapot ezután már nem mentődik (a késleltetett mentés és a bezáráskori mentés felülírná).
   */
  async replaceAll(data) {
    this.frozen = true;
    await api.storeSave(data);
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
