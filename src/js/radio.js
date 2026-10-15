// Rádió – adatréteg: adók több forrásból, egy listában (duplikáció nélkül), műfajokkal és elérhetőséggel.
//  - Radio Browser (radio-browser.info): élő, közösségi adatbázis – keresés, országok, műfajcímkék,
//    népszerűség, logó. A lejátszást jelezzük nekik (/json/url/<azonosító> – a használati feltételük).
//  - Verified Radio Streams (eyalev/verified-radio-streams, CC0): kipróbált adások, a próba dátumával.
//  - IPRD (iprd-org/iprd, MIT): országonkénti M3U-listák, logóval, műfajjal.
//  - Saját rádiólisták (M3U, webcímről) és rádió-kiegészítőcsomagok (…_radio.adaspack).
// Az azonos adó (név + ország) egy tétellé olvad; a különböző forrásokból jött címei egymás tartalékai.
// Egy ország adatai akkor töltődnek, amikor kell (a hazai ország induláskor, a többi megnyitáskor).
import { api } from './api.js';
import { store, refreshHoursOf } from './store.js';
import { bus, norm } from './util.js';
import { parseM3U } from './catalog.js';
import { packsOf } from './packs.js';
import { _t } from './i18n.js';

export const RADIO_SOURCES = [
  { id: 'rb', name: 'Radio Browser', desc: _t('Közösségi rádióadatbázis (radio-browser.info): több tízezer adó, keresés, műfajok, országok, népszerűség.') },
  { id: 'verified', name: 'Verified Radio Streams', desc: _t('Kipróbált adások (eyalev/verified-radio-streams): mindegyik szólt, mielőtt felkerült, a próba dátumával.') },
  { id: 'iprd', name: 'IPRD', desc: _t('International Public Radio Directory (iprd-org/iprd): országonkénti válogatás logókkal és műfajokkal.') },
];
export const sourceOn = (id) => store.settings.radioSources?.[id] !== false;

// Műfajok: azonosító, név, a címkék (Radio Browser „tags”, Verified „genre”, IPRD „group-title”) mintája
export const GENRES = [
  ['pop', _t('Pop'), /\b(pop|top ?40|hits?|chart|contemporary|adult)\b/],
  ['rock', _t('Rock'), /\b(rock|metal|alternative|indie|punk|grunge)\b/],
  ['news', _t('Hírek, beszéd'), /\b(news|talk|hírek|hir|politic|public radio|information|speech|sport)\b/],
  ['classical', _t('Klasszikus'), /\b(classical|klasszikus|opera|baroque|symphon|orchestra)\b/],
  ['jazz', _t('Jazz, blues'), /\b(jazz|blues|swing|soul|funk)\b/],
  ['dance', _t('Dance, elektronikus'), /\b(dance|electronic|house|techno|trance|edm|club|drum|dnb|electro)\b/],
  ['retro', _t('Retro, oldies'), /\b(retro|oldies|60s|70s|80s|90s|classic hits|classic-hits|nostalgi|disco)\b/],
  ['folk', _t('Népzene, világzene'), /\b(folk|népzene|nepzene|world|ethnic|traditional|schlager|nóta|nota)\b/],
  ['hiphop', _t('Hiphop, R&B'), /\b(hip ?hop|rap|r&b|rnb|urban|trap)\b/],
  ['chill', _t('Chill, lounge'), /\b(chill|lounge|ambient|relax|easy listening|smooth|downtempo|lofi|lo-fi)\b/],
  ['kids', _t('Gyerek'), /\b(kids|children|gyerek|mese|child)\b/],
  ['christian', _t('Vallási'), /\b(christian|religio|gospel|catholic|katolikus|church|keresztény|worship)\b/],
];
const GENRE = Object.fromEntries(GENRES.map(([id, name, rx]) => [id, { id, name, rx }]));
export const genreName = (id) => GENRE[id]?.name || id;
/** A tétel műfajai a címkéiből. */
const genresOf = (tags) => {
  const t = norm(tags.join(' ')).replace(/[_-]+/g, ' ');
  return GENRES.filter(([, , rx]) => rx.test(t)).map(([id]) => id);
};

// ---------------------------------------------------------------------------
// Állapot
// ---------------------------------------------------------------------------
export const radio = {
  byId: new Map(), // adó azonosító → adó
  loaded: new Set(), // betöltött országkódok (és 'top', 'custom')
  loading: new Map(), // folyamatban lévő betöltések (kulcs → ígéret)
  errors: {}, // forrás → hibaüzenet
  ready: false,
};

/**
 * Egységes adó: { id, name, logo, url (első cím), urls [], country, tags [], genres [], codec, bitrate,
 * homepage, rbId (Radio Browser azonosító), votes (népszerűség), verified (dátum), rbOk (a Radio Browser
 * szerint él), sources [], search }
 */
// (a magyar közszolgálati adók „MR1 Kossuth”, „MR2 Petőfi” néven is szerepelnek: ugyanaz az adó)
const keyOf = (name, cc) => {
  const c = (cc || 'xx').toLowerCase();
  const k = norm(String(name || '')).replace(/\b(radio|rádió|fm|am|online|live|hd)\b/g, ' ').replace(/[^a-z0-9]+/g, '');
  return `${c}:${c === 'hu' ? k.replace(/^mr\d(?=[a-z]{4})/, '') : k}`;
};
const httpUrl = (u) => (/^https?:\/\/\S+$/i.test(String(u || '').trim()) ? String(u).trim() : '');

// Betöltési kör: a kényszerített újratöltés (forrás ki / be, saját lista) újat kezd – a korábbi kör késve
// érkező eredménye már nem írhat az állapotba (adók, betöltött / folyamatban lévő tételek, hibák, esemény)
let gen = 0;
const live = (g) => g === gen;

function add(raw, g = gen) {
  if (!live(g)) return null;
  const url = httpUrl(raw.url);
  if (!url || !raw.name) return null;
  const k = keyOf(raw.name, raw.country);
  const id = 'r:' + k;
  let st = radio.byId.get(id);
  if (!st) {
    st = { id, name: String(raw.name).trim().slice(0, 120), logo: '', url, urls: [], country: String(raw.country || '').toUpperCase().slice(0, 2), tags: [], genres: [], codec: '', bitrate: 0, homepage: '', rbId: '', votes: 0, verified: '', rbOk: null, sources: [], search: '' };
    radio.byId.set(id, st);
  }
  if (!st.urls.includes(url)) st.urls.push(url);
  if (!st.logo && httpUrl(raw.logo)) st.logo = httpUrl(raw.logo);
  if (!st.homepage && httpUrl(raw.homepage)) st.homepage = httpUrl(raw.homepage);
  for (const t of raw.tags || []) {
    const v = String(t).trim().toLowerCase().slice(0, 40);
    if (v && !st.tags.includes(v) && st.tags.length < 12) st.tags.push(v);
  }
  if (!st.codec && raw.codec) st.codec = String(raw.codec).toUpperCase().slice(0, 10);
  if (!st.bitrate && raw.bitrate > 0) st.bitrate = Math.round(raw.bitrate);
  if (raw.rbId && !st.rbId) st.rbId = String(raw.rbId);
  if (raw.votes > st.votes) st.votes = raw.votes;
  if (raw.verified && raw.verified > st.verified) st.verified = String(raw.verified).slice(0, 10);
  if (raw.rbOk != null) st.rbOk = st.rbOk || !!raw.rbOk;
  if (!st.sources.includes(raw.src)) st.sources.push(raw.src);
  st.genres = genresOf(st.tags);
  st.search = norm([st.name, ...st.tags, st.country].join(' '));
  return st;
}

// ---------------------------------------------------------------------------
// Források
// ---------------------------------------------------------------------------
const RB_HOSTS = ['https://de1.api.radio-browser.info', 'https://de2.api.radio-browser.info', 'https://fi1.api.radio-browser.info'];
let rbHost = 0;
/** Radio Browser kérés (tükörszerverek között váltva, ha egy nem válaszol). */
async function rb(path, hours = 24) {
  let err;
  for (let i = 0; i < RB_HOSTS.length; i++) {
    const h = RB_HOSTS[(rbHost + i) % RB_HOSTS.length];
    try {
      const { text } = await api.fetchText(h + path, { maxAgeHours: hours });
      rbHost = (rbHost + i) % RB_HOSTS.length;
      return JSON.parse(text);
    } catch (e) {
      err = e;
    }
  }
  throw err;
}
const fromRb = (s, g = gen) =>
  add({
    src: 'rb', name: s.name, url: s.url_resolved || s.url, logo: s.favicon, homepage: s.homepage, country: s.countrycode,
    tags: String(s.tags || '').split(',').filter(Boolean), codec: s.codec, bitrate: s.bitrate, rbId: s.stationuuid, votes: (s.clickcount || 0) + (s.votes || 0), rbOk: s.lastcheckok === 1,
  }, g);

async function loadRbCountry(cc, g) {
  const list = await rb(`/json/stations/bycountrycodeexact/${encodeURIComponent(cc)}?hidebroken=true&order=clickcount&reverse=true&limit=1500`);
  return list.map((s) => fromRb(s, g)).filter(Boolean).length;
}
async function loadRbTop(g) {
  const list = await rb('/json/stations/topclick/400?hidebroken=true', 12);
  return list.map((s) => fromRb(s, g)).filter(Boolean).length;
}
async function loadVerified(cc, g) {
  const { text } = await api.fetchText(`https://raw.githubusercontent.com/eyalev/verified-radio-streams/main/stations/${encodeURIComponent(cc.toUpperCase())}.json`, { maxAgeHours: 24 });
  const j = JSON.parse(text);
  return (j.stations || [])
    .map((s) => add({ src: 'verified', name: s.name, url: s.stream, homepage: s.url, country: cc, tags: [...(s.genre || []), s.format === 'talk' ? 'talk' : ''].filter(Boolean), codec: s.codec, bitrate: s.bitrate, votes: s.votes || 0, verified: s.verified }, g))
    .filter(Boolean).length;
}
/** IPRD: az ország mappájának M3U-listái (a GitHub tartalomjegyzékéből – naponta legfeljebb egyszer). */
async function loadIprd(cc, g) {
  const c = cc.toLowerCase();
  const { text } = await api.fetchText(`https://api.github.com/repos/iprd-org/iprd/contents/streams/${encodeURIComponent(c)}`, { maxAgeHours: 24 });
  const files = JSON.parse(text).filter((f) => f.type === 'file' && /\.m3u8?$/i.test(f.name) && httpUrl(f.download_url)).slice(0, 12);
  let n = 0;
  for (const f of files) {
    try {
      const { text: m3u } = await api.fetchText(f.download_url, { maxAgeHours: 24 });
      for (const e of parseM3U(m3u).entries) if (add({ src: 'iprd', name: e.name || e.title, url: e.url, logo: e.logo, country: cc, tags: String(e.group || '').split(/[;,]/) }, g)) n++;
    } catch {}
  }
  return n;
}
/** Saját rádiólisták (M3U) és rádiócsomagok: [{ id, name, url?, textKey?, text? }] */
export const radioLists = () => [...(store.settings.radioLists || []).filter((l) => l.enabled !== false), ...packsOf('radio').filter((p) => (store.settings.builtinLists?.[p.id] ?? !p.off) !== false)];
async function loadCustom(g) {
  let n = 0;
  for (const l of radioLists()) {
    if (!live(g)) return n;
    try {
      const text = l.url ? (await api.fetchText(l.url, { maxAgeHours: refreshHoursOf('radio', l) })).text : l.textKey ? (await api.docGet?.(l.textKey))?.text || '' : l.text || '';
      for (const e of parseM3U(text).entries)
        if (add({ src: 'list:' + l.id, name: e.name || e.title, url: e.url, logo: e.logo, country: (e.country || '').slice(0, 2), tags: String(e.group || '').split(/[;,]/) }, g)) n++;
      if (live(g)) delete radio.errors['list:' + l.id];
    } catch (err) {
      if (live(g)) radio.errors['list:' + l.id] = String(err.message || err);
    }
  }
  return n;
}

/** Egy ország adói (mindegyik bekapcsolt forrásból; egyszer, utána a gyorsítótárból). */
export function loadRadioCountry(cc) {
  cc = String(cc || '').toUpperCase();
  if (!/^[A-Z]{2}$/.test(cc) || radio.loaded.has(cc)) return Promise.resolve();
  if (radio.loading.has(cc)) return radio.loading.get(cc);
  const g = gen;
  const p = (async () => {
    const jobs = [];
    if (sourceOn('rb')) jobs.push(loadRbCountry(cc, g).catch((e) => live(g) && (radio.errors.rb = String(e.message || e))));
    if (sourceOn('verified')) jobs.push(loadVerified(cc, g).catch(() => 0)); // (nem minden országhoz van fájl)
    if (sourceOn('iprd')) jobs.push(loadIprd(cc, g).catch(() => 0));
    await Promise.all(jobs);
    if (!live(g)) return;
    radio.loaded.add(cc);
    radio.loading.delete(cc);
    bus.emit('radio');
  })();
  radio.loading.set(cc, p);
  return p;
}

/** Induláskor: a hazai ország, a világ legnépszerűbbjei, a saját listák. */
export function loadRadio({ force = false } = {}) {
  if (force) {
    gen++; // (a folyamatban lévő betöltések eredménye elévül)
    radio.byId.clear();
    radio.loaded.clear();
    radio.loading.clear();
    radio.errors = {};
  }
  if (radio.loading.has('init')) return radio.loading.get('init');
  const g = gen;
  const p = (async () => {
    const home = (store.settings.homeCountry === 'UK' ? 'GB' : store.settings.homeCountry) || 'HU';
    await Promise.all([
      loadRadioCountry(home),
      !radio.loaded.has('top') && sourceOn('rb') ? loadRbTop(g).then(() => live(g) && radio.loaded.add('top')).catch((e) => live(g) && (radio.errors.rb = String(e.message || e))) : null,
      !radio.loaded.has('custom') ? loadCustom(g).then(() => live(g) && radio.loaded.add('custom')) : null,
    ]);
    if (!live(g)) return;
    radio.ready = true;
    radio.loading.delete('init');
    bus.emit('radio');
  })();
  radio.loading.set('init', p);
  return p;
}

/** Keresés a Radio Browserben (név szerint) – a találatok a helyi listához adódnak. */
export async function searchRadioOnline(q) {
  if (!sourceOn('rb') || String(q).trim().length < 2) return [];
  const list = await rb(`/json/stations/search?name=${encodeURIComponent(q)}&hidebroken=true&order=clickcount&reverse=true&limit=80`, 6);
  return list.map((s) => fromRb(s)).filter(Boolean);
}
/** Műfaj a Radio Browserben (címke szerint, a világ legnépszerűbbjei). */
export async function genreOnline(g) {
  const tag = { pop: 'pop', rock: 'rock', news: 'news', classical: 'classical', jazz: 'jazz', dance: 'dance', retro: 'oldies', folk: 'folk', hiphop: 'hiphop', chill: 'chillout', kids: 'kids', christian: 'christian' }[g];
  if (!tag || !sourceOn('rb')) return [];
  const list = await rb(`/json/stations/bytagexact/${encodeURIComponent(tag)}?hidebroken=true&order=clickcount&reverse=true&limit=120`, 24);
  return list.map((s) => fromRb(s)).filter(Boolean);
}
/** Az országok listája (Radio Browser): [{ code, count }] */
export async function radioCountries() {
  if (!sourceOn('rb')) return [];
  const list = await rb('/json/countries?hidebroken=true&order=stationcount&reverse=true', 72);
  return list.filter((c) => /^[A-Z]{2}$/.test(c.iso_3166_1 || '') && c.stationcount > 0).map((c) => ({ code: c.iso_3166_1, count: c.stationcount }));
}

/** A lejátszás jelzése a Radio Browsernek (a használati feltételük; ettől számít egy adó népszerűnek). */
export function reportClick(st) {
  if (!st?.rbId || !sourceOn('rb')) return;
  api.fetchText(`${RB_HOSTS[rbHost]}/json/url/${encodeURIComponent(st.rbId)}`, { maxAgeHours: 0, force: true }).catch(() => {});
}

// ---------------------------------------------------------------------------
// Elérhetőség és sorrend
// ---------------------------------------------------------------------------
/** 3 – nálunk szólt; 2 – a forrás szerint él (Radio Browser ellenőrzés / friss Verified-próba); 1 – nem tudjuk; 0 – nálunk nem szólt. */
export function radioAvailability(st) {
  const h = st.urls.map((u) => store.healthOf(u)).filter(Boolean);
  if (h.some((x) => x.ok)) return 3;
  if (h.length && h.length >= Math.min(st.urls.length, 3)) return 0;
  if (st.rbOk || (st.verified && Date.now() - Date.parse(st.verified) < 60 * 864e5)) return 2;
  return st.rbOk === false ? 0 : 1;
}
/** Ajánlott sorrend: elérhetők elöl, azon belül népszerűség (logósak előnyben). */
export function radioPopular(list) {
  return list
    .map((s, i) => [s, radioAvailability(s), (s.votes || 0) + (s.logo ? 500 : 0), i])
    .sort((a, b) => b[1] - a[1] || b[2] - a[2] || a[3] - b[3])
    .map((x) => x[0]);
}
/** Helyi keresés (név, címke, ország): az elérhetők elöl. */
export function radioSearch(q, list = [...radio.byId.values()]) {
  const t = norm(q).split(/\s+/).filter(Boolean);
  if (!t.length) return [];
  return radioPopular(list.filter((s) => t.every((w) => s.search.includes(w))));
}
export const radioOfCountry = (cc) => [...radio.byId.values()].filter((s) => s.country === cc);
export const radioOfGenre = (g, list = [...radio.byId.values()]) => list.filter((s) => s.genres.includes(g));

// ---------------------------------------------------------------------------
// Kedvencek, előzmények (profilonként; az adó adataival együtt, hogy betöltés nélkül is indítható legyen)
// ---------------------------------------------------------------------------
/** Az adó tárolható adatai (kedvencek, előzmények, ütemezett felvétel). */
export const radioSnapshot = (st) => snap(st);
const snap = (st) => ({ id: st.id, name: st.name, logo: st.logo, url: st.url, urls: st.urls.slice(0, 6), country: st.country, tags: st.tags.slice(0, 8), codec: st.codec, bitrate: st.bitrate, homepage: st.homepage, rbId: st.rbId, genres: (st.genres || []).slice(0, 4) });
/** A tárolt (profil) tételből teljes adó: a betöltött adatokkal, ha van ilyen. */
export function stationFrom(x) {
  const live = radio.byId.get(x.id);
  if (live) return live;
  const st = { genres: [], sources: ['saved'], votes: 0, verified: '', rbOk: null, ...x, urls: (x.urls || [x.url]).filter(httpUrl) };
  st.genres = genresOf(st.tags || []);
  st.search = norm([st.name, ...(st.tags || []), st.country].join(' '));
  return st;
}
// ---------------------------------------------------------------------------
// Műsorújság: a rádióadók is részt vesznek a párosításban (a tévés XMLTV-forrásokban is vannak rádiók)
// ---------------------------------------------------------------------------
// a forrásokban más néven szereplő adók (pl. epgshare01: „MR1-Kossuth”)
const EPG_ALIASES = {
  'r:hu:kossuth': ['MR1-Kossuth', 'MR1 Kossuth', 'Kossuth Rádió'],
  'r:hu:petofi': ['MR2-Petőfi', 'MR2 Petőfi', 'Petőfi Rádió'],
  'r:hu:bartok': ['MR3-Bartók', 'MR3 Bartók', 'Bartók Rádió'],
  'r:hu:nemzetisegi': ['MR4-Nemzetiségi', 'Nemzetiségi Adások'],
  'r:hu:parlamenti': ['MR5-Parlamenti', 'Parlamenti Rádió'],
  'r:hu:danko': ['MR7-Dankó', 'Dankó Rádió'],
};
/** A párosítandó adók: a hazai ország adói, a kedvencek és az előzmények → [{ id, cc, names }] */
export function radioEpgEntries() {
  const home = (store.settings.homeCountry === 'UK' ? 'GB' : store.settings.homeCountry) || 'HU';
  const list = new Map();
  for (const st of radio.byId.values()) if (st.country === home) list.set(st.id, st);
  for (const st of [...radioFavs(), ...radioRecent()]) list.set(st.id, st);
  return [...list.values()].map((st) => ({ id: st.id, cc: (st.country || '').toLowerCase(), names: [st.name, ...(EPG_ALIASES[st.id] || [])] }));
}
/** Változott-e a párosítandó adók köre (a műsorújság-index újraépítéséhez). */
// (a párosítandó adók azonosítói alapján: egy kedvenc cseréje másikra is új indexet kér)
export function radioEpgSig() {
  const ids = radioEpgEntries().map((e) => e.id).sort();
  let h = 0;
  for (const id of ids) for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return `${radio.ready ? 1 : 0}:${ids.length}:${h}`;
}

export const radioFavs = () => (store.profile.radioFavs || []).map(stationFrom);
export const radioRecent = () => (store.profile.radioRecent || []).map(stationFrom);
export const isRadioFav = (id) => (store.profile.radioFavs || []).some((x) => x.id === id);
export function toggleRadioFav(st) {
  const p = store.profile;
  const list = p.radioFavs || [];
  const on = !list.some((x) => x.id === st.id);
  p.radioFavs = on ? [...list, snap(st)] : list.filter((x) => x.id !== st.id);
  store.save();
  bus.emit('radio-favs');
  return on;
}
/** Kedvenc adó áthelyezése (a sorrend adja a CH+ / CH− léptetés sorrendjét a Kedvencek fülön). */
export function moveRadioFav(id, to) {
  const list = [...(store.profile.radioFavs || [])];
  const from = list.findIndex((x) => x.id === id);
  if (from < 0) return;
  const [x] = list.splice(from, 1);
  list.splice(Math.max(0, Math.min(list.length, to)), 0, x);
  store.profile.radioFavs = list;
  store.save();
  bus.emit('radio-favs');
}
export function pushRadioRecent(st) {
  const p = store.profile;
  p.radioRecent = [snap(st), ...(p.radioRecent || []).filter((x) => x.id !== st.id)].slice(0, 30);
  store.save();
}
