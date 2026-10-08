// Magyar információk filmekről, sorozatokról és tévécsatornákról.
// Alapból Wikidata + Wikipédia (kulcs nélkül, ingyenes); ha van TMDB-kulcs, a TMDB magyar adatai.
import { api } from './api.js';
import { store } from './store.js';
import { esc, norm } from './util.js';

const WD = 'https://www.wikidata.org/w/api.php';
const TTL_HOURS = 24 * 30; // a nyers válaszok gyorsítótárban tartása
const memo = new Map();
// A keresési logika változásakor növelni kell, hogy a régi (pl. üres) eredmények ne maradjanak meg.
const META_V = 'meta:7:';

// Túl sok kérés (HTTP 429) után az adott szolgáltatónál egy ideig szünetel a lekérdezés, hogy ne tiltson ki.
const pauseUntil = new Map(); // gazdagép -> időpont
const hostOf = (url) => {
  try {
    return new URL(url).host;
  } catch {
    return '';
  }
};
/** Szünetel-e a lekérdezés (az adott címnél, vagy – cím nélkül – a Wikidatánál). */
export const metaPaused = (url = WD) => Date.now() < (pauseUntil.get(hostOf(url)) || 0);

async function getJSON(url, headers, { method, body } = {}) {
  if (metaPaused(url)) throw new Error('szünetel (túl sok kérés)');
  try {
    if (headers || method) {
      const r = await api.request({ method: method || 'GET', url, headers: headers || {}, body });
      if (r.status >= 400) throw new Error('HTTP ' + r.status);
      return JSON.parse(r.text);
    }
    const { text } = await api.fetchText(url, { maxAgeHours: TTL_HOURS });
    return JSON.parse(text);
  } catch (err) {
    if (/\b429\b/.test(String(err.message || err))) pauseUntil.set(hostOf(url), Date.now() + 90e3);
    throw err;
  }
}

/** Címkék eltávolítása, amíg van mit (egymásba ágyazott „<<b>x>” ellen is). */
const stripTags = (s) => {
  for (let p = null; p !== s; ) (p = s), (s = s.replace(/<[^<>]*>/g, ''));
  return s;
};
const stripHtml = (s) =>
  stripTags(String(s || '').replace(/<br\s*\/?>/gi, '\n'))
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&') // utoljára: így a „&amp;lt;” szövegként „&lt;” marad
    .replace(/\(Source:[^)]*\)|\[Written by[^\]]*\]/gi, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
// Cím-egyezés (ékezet, írásjel, kis-nagybetű nélkül; a „: alcím” / évad-szám lehet eltérő)
// (Unicode-tulajdonság – \p{L} – nélkül: a régi tévés böngészőmotor nem ismeri)
const tkey = (s) => norm(s).replace(/[\s.,:;!?'"`’‘“”()[\]{}《》【】「」『』<>\-–—_/\\|~*+&#@%^=…·]+/g, '');
const sameTitle = (a, b) => {
  const x = tkey(a);
  const y = tkey(b);
  return !!x && !!y && (x === y || (x.length > 4 && y.startsWith(x)) || (y.length > 4 && x.startsWith(y)));
};

/** Anime-e? (lista / tárhely / műfaj alapján) – ezeknél az AniList adja a legjobb adatokat. */
const ANIME_GENRES = /\b(shounen|shonen|seinen|shoujo|shojo|josei|mecha|isekai|ecchi|magical girl|slice of life|harem|yuri|yaoi|anime)\b/i;
export function isAnime(x) {
  if (x.anime !== undefined) return x.anime;
  const urls = x.urls || x.episodes?.slice(0, 1).flatMap((e) => e.urls) || [];
  return (x.anime = /anime/i.test(x.lists?.join(' ') || '') || urls.some((u) => /animeaddicts\.hu|\/anime\//i.test(u)) || ANIME_GENRES.test(x.groups?.join(' ') || ''));
}

const q = (params) => Object.entries(params).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&');
const claimIds = (ent, p) => (ent?.claims?.[p] || []).map((c) => c.mainsnak?.datavalue?.value?.id).filter(Boolean);
const claimYear = (ent, p = 'P577') => {
  const t = ent?.claims?.[p]?.[0]?.mainsnak?.datavalue?.value?.time;
  return t ? parseInt(t.slice(1, 5), 10) : 0;
};
const label = (ent) => ent?.labels?.hu?.value || ent?.labels?.en?.value || '';

async function wdEntities(ids, props = 'labels|claims|sitelinks|descriptions', allLangs = false) {
  if (!ids.length) return {};
  const out = {};
  for (let i = 0; i < ids.length; i += 45) {
    const r = await getJSON(`${WD}?${q({ action: 'wbgetentities', ids: ids.slice(i, i + 45).join('|'), props, ...(allLangs ? {} : { languages: 'hu|en' }), format: 'json', origin: '*' })}`);
    Object.assign(out, r.entities || {});
  }
  return out;
}

async function wdSearch(text, types, limit = 6) {
  const filter = types ? ' haswbstatement:' + types.map((t) => `P31=${t}`).join('|') : '';
  const r = await getJSON(`${WD}?${q({ action: 'query', list: 'search', srsearch: text + filter, srlimit: limit, format: 'json', origin: '*' })}`);
  return (r.query?.search || []).map((s) => s.title);
}

async function wikiSummary(lang, title) {
  try {
    const r = await getJSON(`https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title.replace(/ /g, '_'))}`);
    // Az infobox képe (filmeknél többnyire a plakát) – a Wikipédia ezt akkor is adja, ha nem szabad licencű.
    return r.extract ? { text: r.extract, url: r.content_urls?.desktop?.page || '', image: r.thumbnail?.source || '', title: r.title || '', desc: r.description || '' } : null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// AniList (anime: borító, angol leírás, műfajok, pontszám) – kulcs nélkül
// ---------------------------------------------------------------------------
const AL = 'https://graphql.anilist.co';
const AL_FIELDS = 'id title{romaji english native} synonyms description(asHtml:false) coverImage{large} genres averageScore popularity seasonYear startDate{year} format episodes studios(isMain:true){nodes{name}} siteUrl';
// Az AniList 404-et ad, ha egy keresett cím nincs meg – ilyenkor is a válasz többi része érvényes.
async function alPost(query, variables) {
  if (metaPaused(AL)) throw new Error('szünetel (túl sok kérés)');
  const r = await api.request({ method: 'POST', url: AL, headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify({ query, variables }) });
  if (r.status === 429) {
    pauseUntil.set(hostOf(AL), Date.now() + 90e3);
    throw new Error('HTTP 429');
  }
  if (r.status >= 400 && r.status !== 404) throw new Error('HTTP ' + r.status);
  return JSON.parse(r.text || '{}');
}

function fromAniList(m, x) {
  if (!m) return null;
  const titles = [m.title?.english, m.title?.romaji, m.title?.native, ...(m.synonyms || [])].filter(Boolean);
  // Évad-jelölés nélkül is egyezzen („… 2nd Season” / „… 2” / „Season 2”)
  const noSeason = (s) => String(s).replace(/[\s:-]*(?:\b(?:season|évad)\s*\d+|\d+(?:st|nd|rd|th)\s+season|\b\d{1,2}|\bII+)\s*$/i, '');
  if (x && !titles.some((t) => sameTitle(t, x.title) || sameTitle(noSeason(t), noSeason(x.title)))) return null; // téves találat
  return {
    source: 'anilist',
    huTitle: '',
    altTitle: m.title?.english && !sameTitle(m.title.english, x?.title || '') ? m.title.english : m.title?.romaji && !sameTitle(m.title.romaji, x?.title || '') ? m.title.romaji : '',
    description: stripHtml(m.description),
    descLang: m.description ? 'en' : '',
    genres: (m.genres || []).slice(0, 6),
    directors: [],
    cast: [],
    studios: (m.studios?.nodes || []).map((s) => s.name).slice(0, 2),
    countries: [],
    year: m.seasonYear || m.startDate?.year || 0,
    rating: m.averageScore ? Math.round(m.averageScore) / 10 : 0,
    votes: 0,
    episodes: m.episodes || 0,
    poster: m.coverImage?.large || '',
    url: m.siteUrl || `https://anilist.co/anime/${m.id}`,
  };
}

async function anilistInfo(x) {
  const r = await alPost(`query($s:String){Media(search:$s,type:ANIME){${AL_FIELDS}}}`, { s: x.title });
  return fromAniList(r?.data?.Media, x);
}

/** Több cím borítója egy kérésben (a főoldali sorokhoz) → Map(id -> adat | null) */
async function anilistBatch(items) {
  // (A „Page” forma: a nem talált cím üres listát ad, nem rontja el a többi választ.)
  const parts = items.map((x, i) => `a${i}:Page(perPage:1){media(search:$s${i},type:ANIME){${AL_FIELDS}}}`);
  const vars = Object.fromEntries(items.map((x, i) => [`s${i}`, x.title]));
  const q = `query(${items.map((_, i) => `$s${i}:String`).join(',')}){${parts.join(' ')}}`;
  const r = await alPost(q, vars);
  if (!r?.data) throw new Error('AniList: üres válasz');
  return new Map(items.map((x, i) => [x.id, fromAniList(r.data[`a${i}`]?.media?.[0], x)]));
}

// ---------------------------------------------------------------------------
// TVmaze (sorozatok: kép, angol összefoglaló) – kulcs nélkül
// ---------------------------------------------------------------------------
async function tvmazeInfo(x) {
  let s;
  try {
    s = await getJSON(`https://api.tvmaze.com/singlesearch/shows?q=${encodeURIComponent(x.title)}`);
  } catch (err) {
    if (/404/.test(err.message)) return null;
    throw err;
  }
  if (!s || !sameTitle(s.name, x.title)) return null;
  return {
    source: 'tvmaze',
    huTitle: '',
    description: stripHtml(s.summary),
    descLang: s.summary ? 'en' : '',
    genres: s.genres || [],
    directors: [],
    cast: [],
    countries: [s.network?.country?.name || s.webChannel?.country?.name].filter(Boolean),
    year: parseInt((s.premiered || '').slice(0, 4), 10) || 0,
    rating: s.rating?.average || 0,
    votes: 0,
    poster: s.image?.medium || '',
    url: s.url || '',
  };
}

// ---------------------------------------------------------------------------
// Angol Wikipédia (filmek: összefoglaló + az infobox plakátja), ha a Wikidata nem talál
// ---------------------------------------------------------------------------
async function enwikiFilm(x) {
  const q = `${x.title}${x.year ? ' ' + x.year : ''} ${x.type === 'series' ? 'series' : 'film'}`;
  const r = await getJSON(`https://en.wikipedia.org/w/api.php?${new URLSearchParams({ action: 'query', list: 'search', srsearch: q, srlimit: '5', format: 'json', origin: '*' })}`);
  for (const hit of r.query?.search || []) {
    const base = hit.title.replace(/\s*\([^)]*\)\s*$/, '');
    if (!sameTitle(base, x.title)) continue;
    const sum = await wikiSummary('en', hit.title);
    if (!sum) continue;
    const kind = `${sum.desc} ${sum.text.slice(0, 300)}`;
    if (!/film|movie|series|anime|animated|television|cartoon|documentary/i.test(kind)) continue;
    if (x.year && !new RegExp(`\\b(${x.year - 1}|${x.year}|${x.year + 1})\\b`).test(kind + hit.title)) continue;
    return { source: 'enwiki', huTitle: '', description: sum.text, descLang: 'en', genres: [], directors: [], cast: [], countries: [], year: x.year || 0, poster: sum.image, url: sum.url };
  }
  return null;
}

/** Plakát (P3383) vagy kép (P18) a Wikimedia Commonsból, kis méretben. */
function commonsImage(ent) {
  const f = ent?.claims?.P3383?.[0]?.mainsnak?.datavalue?.value || ent?.claims?.P18?.[0]?.mainsnak?.datavalue?.value;
  return f ? `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(f)}?width=342` : '';
}

/** Egy Wikidata-elem részletei magyarul (címkék, összefoglaló). */
async function describe(ent, { people = true } = {}) {
  const genres = claimIds(ent, 'P136').slice(0, 5);
  const directors = people ? claimIds(ent, 'P57').slice(0, 3) : [];
  const cast = people ? claimIds(ent, 'P161').slice(0, 6) : [];
  const countries = claimIds(ent, 'P495').concat(claimIds(ent, 'P17')).slice(0, 3);
  const labels = await wdEntities([...new Set([...genres, ...directors, ...cast, ...countries])], 'labels');
  const names = (ids) => ids.map((id) => label(labels[id])).filter(Boolean);
  // A címkéből az egyértelműsítő zárójeles rész (pl. „(film, 1968)”) elhagyva.
  const huTitle = (ent.labels?.hu?.value || '').replace(/\s*\((?:[^)]*\b(?:film|sorozat|televíziós|tévé|műsor)\b[^)]*|\d{4})\)\s*$/i, '');
  let summary = null;
  let lang = 'hu';
  if (ent.sitelinks?.huwiki) summary = await wikiSummary('hu', ent.sitelinks.huwiki.title);
  if (!summary && ent.sitelinks?.enwiki) {
    summary = await wikiSummary('en', ent.sitelinks.enwiki.title);
    lang = 'en';
  }
  return {
    source: 'wikidata',
    huTitle,
    description: summary?.text || ent.descriptions?.hu?.value || ent.descriptions?.en?.value || '',
    descLang: summary ? lang : ent.descriptions?.hu ? 'hu' : ent.descriptions?.en ? 'en' : '',
    shortDesc: ent.descriptions?.hu?.value || '',
    genres: names(genres),
    directors: names(directors),
    cast: names(cast),
    countries: names(countries),
    year: claimYear(ent),
    // Szabad licencű kép a Commonsból, ennek híján a Wikipédia-cikk infobox-képe (filmnél a plakát)
    poster: commonsImage(ent) || summary?.image || '',
    url: summary?.url || `https://www.wikidata.org/wiki/${ent.id}`,
  };
}

/** Több forrás egyesítése: a magyar leírás és cím elöl, különben angol; a borító az első meglévő. */
function merge(list) {
  const xs = list.filter(Boolean);
  if (!xs.length) return null;
  // Leírás: a magyar, ha érdemi (nem csak egy „japán animesorozat” jellegű címke), különben a leghosszabb
  const len = (m) => (m.description || '').length;
  const hu = xs.find((m) => m.descLang === 'hu' && len(m) >= 80);
  const any = hu || xs.filter((m) => m.description).sort((a, b) => len(b) - len(a))[0];
  const pick = (k) => xs.map((m) => m[k]).find((v) => (Array.isArray(v) ? v.length : v)) || (Array.isArray(xs[0][k]) ? [] : xs[0][k]);
  const main = any || xs[0];
  return {
    ...main,
    huTitle: pick('huTitle'),
    altTitle: pick('altTitle'),
    description: main.description || '',
    descLang: main.description ? main.descLang : '',
    genres: pick('genres'),
    directors: pick('directors'),
    cast: pick('cast'),
    studios: pick('studios'),
    countries: pick('countries'),
    year: pick('year'),
    rating: pick('rating'),
    votes: xs.find((m) => m.rating)?.votes || 0,
    poster: pick('poster'),
    sources: xs.map((m) => ({ source: m.source, url: m.url })),
  };
}

// ---------------------------------------------------------------------------
// TMDB (opcionális, saját kulccsal)
// ---------------------------------------------------------------------------
async function tmdb(path, params = {}) {
  const key = (store.settings.tmdbKey || '').trim();
  const isToken = key.length > 40;
  const url = `https://api.themoviedb.org/3${path}?${q({ ...(isToken ? {} : { api_key: key }), language: 'hu-HU', ...params })}`;
  return getJSON(url, isToken ? { Authorization: `Bearer ${key}`, Accept: 'application/json' } : null);
}

async function tmdbInfo(x) {
  const isTv = x.type === 'series';
  const s = await tmdb(isTv ? '/search/tv' : '/search/movie', { query: x.title, ...(x.year ? { [isTv ? 'first_air_date_year' : 'year']: x.year } : {}) });
  const hit = s.results?.[0];
  if (!hit) return null;
  const d = await tmdb(`/${isTv ? 'tv' : 'movie'}/${hit.id}`, { append_to_response: 'credits' });
  let overview = d.overview;
  let descLang = 'hu';
  if (!overview) {
    const en = await tmdb(`/${isTv ? 'tv' : 'movie'}/${hit.id}`, { language: 'en-US' });
    overview = en.overview;
    descLang = overview ? 'en' : '';
  }
  return {
    source: 'tmdb',
    huTitle: d.title || d.name || '',
    description: overview || '',
    descLang,
    genres: (d.genres || []).map((g) => g.name),
    directors: (d.credits?.crew || []).filter((c) => c.job === 'Director').slice(0, 3).map((c) => c.name),
    cast: (d.credits?.cast || []).slice(0, 6).map((c) => c.name),
    countries: (d.production_countries || d.origin_country || []).map((c) => c.name || c).slice(0, 3),
    year: parseInt((d.release_date || d.first_air_date || '').slice(0, 4), 10) || 0,
    rating: d.vote_average ? Math.round(d.vote_average * 10) / 10 : 0,
    votes: d.vote_count || 0,
    poster: d.poster_path ? `https://image.tmdb.org/t/p/w342${d.poster_path}` : '',
    url: `https://www.themoviedb.org/${isTv ? 'tv' : 'movie'}/${hit.id}?language=hu-HU`,
  };
}

// ---------------------------------------------------------------------------
// Nyilvános függvények
// ---------------------------------------------------------------------------
const FILM_TYPES = ['Q11424', 'Q202866', 'Q24862', 'Q506240', 'Q226730', 'Q93204'];
const SERIES_TYPES = ['Q5398426', 'Q63952888', 'Q581714', 'Q1259759', 'Q117467246'];
const CHANNEL_TYPES = ['Q2001305', 'Q1616075', 'Q1254874', 'Q15265344', 'Q60672183'];

async function cached(key, fn) {
  if (memo.has(key)) return memo.get(key);
  const p = (async () => {
    const hit = await api.kvGet?.(META_V + key).catch(() => null);
    if (hit && Date.now() - hit.at < (hit.data ? 30 : 7) * 86400e3) return hit.data;
    let data = null;
    try {
      data = await fn();
    } catch (err) {
      if (!metaPaused()) console.warn('Magyar információ hiba', key, err);
      memo.delete(key); // hálózati hiba: később újra megpróbáljuk
      return null;
    }
    api.kvSet?.(META_V + key, { at: Date.now(), data })?.catch?.(() => {});
    return data;
  })();
  memo.set(key, p);
  return p;
}

/**
 * Film vagy sorozat adatai (null, ha semmi nem található): magyarul, ha van (TMDB, Wikipédia),
 * különben angolul (AniList – anime, TVmaze – sorozat, angol Wikipédia – film). A borító az első
 * forrásból, amelyben van.
 */
export function filmInfo(x) {
  if (store.settings.huInfo === false) return Promise.resolve(null);
  const useTmdb = !!(store.settings.tmdbKey || '').trim();
  return cached(`${useTmdb ? 'tmdb' : 'wd'}:${x.id}`, async () => {
    const got = [];
    const safe = (p) => p.catch((err) => (metaPaused(AL) || /429|szünetel/.test(err.message) ? Promise.reject(err) : null));
    const anime = isAnime(x);
    if (useTmdb) got.push(await safe(tmdbInfo(x)));
    if (!got[0] || got[0].descLang !== 'hu') {
      let wd = await safe(wikidataFilm(x));
      // Animénél az azonos nevű élőszereplős feldolgozás / manga nem jó találat
      if (anime && wd && !/anim|manga|rajzfilm|cartoon|OVA\b/i.test(`${wd.shortDesc} ${wd.description.slice(0, 200)} ${wd.genres.join(' ')}`)) wd = null;
      got.push(wd);
    }
    const huOk = got.some((m) => m?.descLang === 'hu' && (m.description || '').length >= 80);
    const hasPoster = got.some((m) => m?.poster);
    if (!huOk || !hasPoster || anime) {
      // Animénél az AniList műfajai / éve pontosabbak: előre tesszük
      if (anime) got.unshift(await safe(anilistInfo(x)));
      else if (x.type === 'series') got.push(await safe(tvmazeInfo(x)));
      if (!got.some((m) => (m?.description || '').length >= 80) || !got.some((m) => m?.poster)) got.push(await safe(enwikiFilm(x)));
    }
    return merge(got);
  });
}

/**
 * Csak borítókép (a főoldali sorokhoz, sok címre): a legolcsóbb forrás – animéknél az AniList
 * egyetlen kérésben 8 címre is. → Map(id -> kép URL | '')
 */
export async function posters(items) {
  const out = new Map();
  if (store.settings.huInfo === false) return out;
  const anime = items.filter(isAnime);
  for (let i = 0; i < anime.length && !metaPaused(AL); i += 8) {
    const part = anime.slice(i, i + 8);
    const todo = [];
    for (const x of part) {
      const hit = await api.kvGet?.(META_V + 'poster:' + x.id).catch(() => null);
      if (hit && Date.now() - hit.at < (hit.url ? 60 : 7) * 86400e3) out.set(x.id, hit.url);
      else todo.push(x);
    }
    if (!todo.length) continue;
    try {
      const res = await anilistBatch(todo);
      for (const x of todo) {
        const url = res.get(x.id)?.poster || '';
        out.set(x.id, url);
        api.kvSet?.(META_V + 'poster:' + x.id, { at: Date.now(), url })?.catch?.(() => {});
      }
    } catch (err) {
      if (!metaPaused(AL)) console.warn('AniList', err);
    }
  }
  // A többi: a teljes adatlap-lekérdezés (gyorsítótárazva) – egyesével
  for (const x of items) {
    if (out.has(x.id) || metaPaused()) continue;
    const m = await filmInfo(x).catch(() => null);
    out.set(x.id, m?.poster || '');
  }
  return out;
}

/**
 * Magyar cím (és plakát) sok címre, olcsón: Wikidata-keresés + címkék, összefoglaló nélkül.
 * A VOD-kártyák a magyar címet mutatják, ha van. → { huTitle, poster } | null
 */
export function titleInfo(x) {
  if (store.settings.huInfo === false) return Promise.resolve(null);
  return cached(`hut:${x.id}`, async () => {
    const types = x.type === 'series' ? SERIES_TYPES : [...FILM_TYPES, 'Q20650540'];
    const ids = await wdSearch(x.title, types, 4);
    if (!ids.length) return { huTitle: '', poster: '' };
    const ents = await wdEntities(ids, 'labels|claims', true);
    const list = ids.map((id) => ents[id]).filter(Boolean);
    const ent = x.year ? list.find((e) => Math.abs(claimYear(e) - x.year) <= 1 && Object.values(e.labels || {}).some((l) => sameTitle(l.value, x.title))) || list.find((e) => Math.abs(claimYear(e) - x.year) <= 1) : list.find((e) => Object.values(e.labels || {}).some((l) => sameTitle(l.value, x.title)));
    if (!ent) return { huTitle: '', poster: '' };
    const hu = (ent.labels?.hu?.value || '').replace(/\s*\((?:[^)]*\b(?:film|sorozat|televíziós|tévé|műsor|anime)\b[^)]*|\d{4})\)\s*$/i, '');
    return { huTitle: hu && !sameTitle(hu, x.title) ? hu : '', poster: commonsImage(ent) };
  });
}

/**
 * Borítókép-jelöltek a választóhoz, több adatbázisból; `query`: saját keresőszó (alapból a cím).
 * Kulcs nélkül: AniList, Kitsu, Jikan (MyAnimeList) – anime; TVmaze – sorozat; Wikipédia (hu, en) –
 * bármi; Wikidata. Saját kulccsal: TMDB, OMDb (IMDb-adatok). → [{ url, source, title, year }]
 */
export async function posterCandidates(x, query = '', onUpdate = null) {
  const q = (query || x.title).trim();
  const own = !query;
  const out = [];
  const add = (url, source, title = '', year = '') => url && !out.some((c) => c.url === url) && out.push({ url, source, title, year });
  const anime = isAnime(x);
  const tasks = [];
  // Forrásonként legfeljebb 8 mp; minden beérkezett forrás után frissül a választó (onUpdate)
  const t = (p) => tasks.push(Promise.race([p, new Promise((r) => setTimeout(r, 8000))]).catch(() => {}).then(() => onUpdate?.(out.slice())));
  if (anime || x.type === 'series' || query) {
    t(alPost(`query($s:String){Page(perPage:8){media(search:$s,type:ANIME){title{romaji english} coverImage{large} seasonYear}}}`, { s: q }).then((r) => (r?.data?.Page?.media || []).forEach((m) => add(m.coverImage?.large, 'AniList', m.title?.english || m.title?.romaji, m.seasonYear))));
  }
  if (anime || query) {
    t(getJSON(`https://kitsu.io/api/edge/anime?filter%5Btext%5D=${encodeURIComponent(q)}&page%5Blimit%5D=8`).then((r) => (r?.data || []).forEach((a) => add(a.attributes?.posterImage?.medium || a.attributes?.posterImage?.original, 'Kitsu', a.attributes?.canonicalTitle, (a.attributes?.startDate || '').slice(0, 4)))));
    t(getJSON(`https://api.jikan.moe/v4/anime?q=${encodeURIComponent(q)}&limit=8`).then((r) => (r?.data || []).forEach((a) => add(a.images?.jpg?.large_image_url, 'MyAnimeList', a.title, a.year))));
  }
  if (x.type === 'series' || query) {
    t(getJSON(`https://api.tvmaze.com/search/shows?q=${encodeURIComponent(q)}`).then((r) => (r || []).slice(0, 8).forEach((h) => add(h.show?.image?.medium, 'TVmaze', h.show?.name, (h.show?.premiered || '').slice(0, 4)))));
  }
  // Wikipédia: a keresés találatainak képe (filmeknél többnyire a plakát) – magyarul és angolul
  for (const lang of ['hu', 'en']) {
    const kind = lang === 'hu' ? (x.type === 'series' ? ' sorozat' : ' film') : x.type === 'series' ? ' series' : ' film';
    t(
      getJSON(`https://${lang}.wikipedia.org/w/api.php?${new URLSearchParams({ action: 'query', generator: 'search', gsrsearch: q + kind, gsrlimit: '8', prop: 'pageimages', piprop: 'thumbnail', pithumbsize: '400', format: 'json', origin: '*' })}`).then((r) =>
        Object.values(r?.query?.pages || {})
          .sort((a, b) => a.index - b.index)
          .forEach((p) => add(p.thumbnail?.source, `Wikipédia (${lang})`, p.title))
      )
    );
  }
  if ((store.settings.tmdbKey || '').trim()) {
    t(tmdb(x.type === 'series' ? '/search/tv' : '/search/movie', { query: q }).then((r) => (r.results || []).slice(0, 10).forEach((h) => h.poster_path && add(`https://image.tmdb.org/t/p/w342${h.poster_path}`, 'TMDB', h.title || h.name, (h.release_date || h.first_air_date || '').slice(0, 4)))));
  }
  if ((store.settings.omdbKey || '').trim()) {
    t(getJSON(`https://www.omdbapi.com/?${new URLSearchParams({ apikey: store.settings.omdbKey.trim(), s: q, type: x.type === 'series' ? 'series' : 'movie' })}`).then((r) => (r?.Search || []).forEach((h) => h.Poster && h.Poster !== 'N/A' && add(h.Poster, 'OMDb (IMDb)', h.Title, h.Year))));
  }
  if (own) {
    t(filmInfo(x).then((m) => add(m?.poster, 'Wikidata / Wikipédia', m?.huTitle || '')));
    t(titleInfo(x).then((m) => add(m?.poster, 'Wikimedia Commons')));
  }
  await Promise.all(tasks);
  return out;
}

async function wikidataFilm(x) {
  {
    const types = x.type === 'series' ? SERIES_TYPES : FILM_TYPES;
    const ids = await wdSearch(x.title, types);
    if (!ids.length) return null;
    // A jelölteknél minden nyelvű címke kell (pl. japán / kínai címek egyeztetéséhez).
    const ents = await wdEntities(ids, 'labels|claims|sitelinks|descriptions', true);
    const list = ids.map((id) => ents[id]).filter(Boolean);
    let ent;
    if (x.year) {
      // Évszámmal: csak az egyező (±1 év) találatot fogadjuk el.
      ent = list.find((e) => Math.abs(claimYear(e) - x.year) <= 1);
    } else {
      // Évszám nélkül: elsősorban a pontosan egyező címűt (bármely nyelven).
      // (Csak egyező címmel – a „legelső találat” gyakran egészen más mű volt.)
      ent = list.find((e) => Object.values(e.labels || {}).some((l) => sameTitle(l.value, x.title)));
    }
    return ent ? describe(ent) : null;
  }
}

/** Tévécsatorna magyar adatai (Wikidata / Wikipédia). */
export function channelInfo(ch) {
  if (store.settings.huInfo === false || !ch?.name) return Promise.resolve(null);
  return cached(`ch:${ch.id}`, async () => {
    const want = (ch.country === 'UK' ? 'GB' : ch.country || '').toUpperCase();
    // A név nyelvi / minőségi utótag nélkül (pl. „Euronews English” → „euronews”).
    const base = (s) => norm(s).replace(/\s+(english|deutsch|francais|french|espanol|spanish|arabic|russian|hd|fhd|uhd|4k)$/, '').replace(/[\s\-.]+/g, '');
    const want1 = base(ch.name);
    const TV_RX = /televí|tévé|csatorna|műsorszóró|television|tv channel|tv station|broadcast|news channel|cable network|channel/i;

    const pick = async (ids, typed) => {
      if (!ids.length) return null;
      const ents = await wdEntities(ids, 'labels|claims|sitelinks|descriptions', true);
      // Ország egyeztetése: a jelöltek országainak ISO-kódja (P297).
      const countryIds = [...new Set(ids.flatMap((id) => claimIds(ents[id], 'P17')))];
      const cents = await wdEntities(countryIds, 'claims');
      const iso = (cid) => cents[cid]?.claims?.P297?.[0]?.mainsnak?.datavalue?.value || '';
      const nameOk = (e) => Object.values(e.labels || {}).some((l) => base(l.value) === want1);
      const isTv = (e) => typed || TV_RX.test([e.descriptions?.hu?.value, e.descriptions?.en?.value].join(' '));
      const cands = ids.map((id) => ents[id]).filter((e) => e && isTv(e) && nameOk(e));
      return (
        cands.find((e) => !want || claimIds(e, 'P17').some((c) => iso(c) === want)) ||
        cands.find((e) => !claimIds(e, 'P17').length) || // ország nélküli (nemzetközi) csatorna
        null
      );
    };
    // Előbb típusszűrővel (tévécsatorna / -állomás / -hálózat), ha az nem ad elfogadható találatot,
    // anélkül – ilyenkor a leírásnak kell tévére utalnia.
    const ent = (await pick(await wdSearch(ch.name, CHANNEL_TYPES, 8), true)) || (await pick(await wdSearch(ch.name, null, 10), false));
    if (!ent) return enwikiChannel(ch, want1, base, TV_RX);
    const d = await describe(ent, { people: false });
    const owners = claimIds(ent, 'P127').slice(0, 2);
    const lab = await wdEntities(owners, 'labels');
    d.owners = owners.map((id) => label(lab[id])).filter(Boolean);
    d.launched = claimYear(ent, 'P571');
    return d;
  });
}

/** Csatorna az angol (illetve előbb a magyar) Wikipédiában, ha a Wikidatában nincs meg. */
async function enwikiChannel(ch, want1, base, TV_RX) {
  for (const lang of ['hu', 'en']) {
    const r = await getJSON(`https://${lang}.wikipedia.org/w/api.php?${new URLSearchParams({ action: 'query', list: 'search', srsearch: `${ch.name} ${lang === 'hu' ? 'televízió' : 'TV channel'}`, srlimit: '5', format: 'json', origin: '*' })}`);
    for (const hit of r.query?.search || []) {
      if (base(hit.title.replace(/\s*\([^)]*\)\s*$/, '')) !== want1) continue;
      const sum = await wikiSummary(lang, hit.title);
      if (!sum || !TV_RX.test(`${sum.desc} ${sum.text.slice(0, 400)}`)) continue;
      return { source: 'wikipedia', huTitle: '', description: sum.text, descLang: lang, genres: [], directors: [], cast: [], countries: [], owners: [], year: 0, poster: sum.image, url: sum.url };
    }
  }
  return null;
}

/** Az információs doboz HTML-je (a szövegek mind escape-elve). */
export function infoBoxHtml(m, { kind = 'film' } = {}) {
  if (!m) {
    return `<div class="hu-info empty"><p class="muted small">Ehhez ${kind === 'channel' ? 'a csatornához' : 'a címhez'} nem találtunk leírást${kind === 'channel' ? '' : ' (Wikipédia, AniList, TVmaze' + ((store.settings.tmdbKey || '').trim() ? ', TMDB' : '') + ')'}.</p></div>`;
  }
  const row = (k, v) => (v && v.length ? `<dt>${k}</dt><dd>${esc(Array.isArray(v) ? v.join(', ') : v)}</dd>` : '');
  const NAMES = { tmdb: 'TMDB', wikidata: 'Wikidata', wikipedia: 'Wikipédia', enwiki: 'angol Wikipédia', anilist: 'AniList', tvmaze: 'TVmaze', animeaddicts: 'AnimeAddicts' };
  const srcName = (s) => (s.source === 'wikidata' && /wikipedia/.test(s.url) ? (/\/\/hu\./.test(s.url) ? 'Wikipédia' : 'angol Wikipédia') : NAMES[s.source] || s.source);
  const sources = (m.sources || [{ source: m.source, url: m.url }]).filter((s) => s.url);
  // a távoli forrásból jött értékelés csak véges szám lehet (mentett / hamisított válaszból se kerülhessen jelölő a HTML-be)
  const rating = Number.isFinite(Number(m.rating)) ? Math.round(Number(m.rating) * 10) / 10 : 0;
  const votes = Number.isFinite(Number(m.votes)) ? Math.round(Number(m.votes)) : 0;
  return `<div class="hu-info">
    <h3>Információk</h3>
    ${m.huTitle ? `<div class="hu-title">Magyar cím: <b>${esc(m.huTitle)}</b></div>` : ''}
    ${m.altTitle ? `<div class="hu-title muted">Más címen: ${esc(m.altTitle)}</div>` : ''}
    ${m.description ? `<p class="hu-desc">${esc(m.description)}</p>` : ''}
    ${m.descLang === 'en' ? '<p class="muted small">Magyar leírás nem érhető el, ez az angol nyelvű leírás.</p>' : ''}
    <dl class="facts">
      ${rating ? `<dt>Értékelés</dt><dd>★ ${rating} / 10${votes ? ` (${votes} szavazat)` : ''}</dd>` : ''}
      ${row('Műfaj', m.genres)}${row('Rendező', m.directors)}${row('Stúdió', m.studios)}${row('Szereplők', m.cast)}${row('Ország', m.countries)}
      ${m.year ? row('Év', String(m.year)) : ''}${row('Tulajdonos', m.owners)}${m.launched ? row('Indulás', String(m.launched)) : ''}
    </dl>
    <p class="muted small">Forrás: ${sources.map((s) => `<a href="#" data-ext="${esc(s.url)}">${esc(srcName(s))}</a>`).join(', ')}</p>
  </div>`;
}
