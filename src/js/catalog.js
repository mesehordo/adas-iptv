// Csatornakatalógus: M3U feldolgozás, iptv-org adatok összefésülése, magyar nevek, keresés.
import { api } from './api.js';
import { store, BUILTIN_PLAYLISTS, refreshHoursOf, DEFAULT_REFRESH_HOURS } from './store.js';
import { packsOf } from './packs.js';
import { norm, key, bus, errText } from './util.js';
import { kidsAllowed } from './kids.js';

import { _t, lang as uiLang, LOCALE } from './i18n.js';
const API = 'https://iptv-org.github.io/api/';

export const CATEGORY_HU = {
  animation: _t('Animáció'),
  auto: _t('Autó-motor'),
  business: _t('Gazdaság'),
  classic: _t('Klasszikus'),
  comedy: _t('Vígjáték'),
  cooking: _t('Gasztronómia'),
  culture: _t('Kultúra'),
  documentary: _t('Dokumentum'),
  education: _t('Oktatás'),
  entertainment: _t('Szórakoztató'),
  family: _t('Családi'),
  general: _t('Általános'),
  interactive: _t('Interaktív'),
  kids: _t('Gyerek'),
  legislative: _t('Közélet, parlament'),
  lifestyle: _t('Életmód'),
  movies: _t('Filmek'),
  music: _t('Zene'),
  news: _t('Hírek'),
  outdoor: _t('Szabadidő, természet'),
  public: _t('Közszolgálati'),
  relax: _t('Relaxáció'),
  religious: _t('Vallás'),
  science: _t('Tudomány'),
  series: _t('Sorozatok'),
  shop: _t('Vásárlás'),
  sports: _t('Sport'),
  travel: _t('Utazás'),
  weather: _t('Időjárás'),
  xxx: _t('Felnőtt'),
  other: _t('Egyéb'),
};

export const KIDS_CATEGORIES = new Set(['kids', 'animation', 'family', 'education']);

// ISO 639-3 → 639-1 a gyakori nyelvekre, hogy az Intl magyar nevet adjon.
const LANG3TO1 = {
  hun: 'hu', eng: 'en', deu: 'de', ger: 'de', fra: 'fr', fre: 'fr', spa: 'es', ita: 'it', por: 'pt',
  rus: 'ru', ukr: 'uk', pol: 'pl', ces: 'cs', cze: 'cs', slk: 'sk', slo: 'sk', ron: 'ro', rum: 'ro',
  hrv: 'hr', srp: 'sr', slv: 'sl', bul: 'bg', ell: 'el', gre: 'el', tur: 'tr', ara: 'ar', heb: 'he',
  fas: 'fa', per: 'fa', hin: 'hi', urd: 'ur', ben: 'bn', zho: 'zh', chi: 'zh', jpn: 'ja', kor: 'ko',
  vie: 'vi', tha: 'th', ind: 'id', msa: 'ms', may: 'ms', nld: 'nl', dut: 'nl', swe: 'sv', nor: 'no',
  dan: 'da', fin: 'fi', est: 'et', lav: 'lv', lit: 'lt', kat: 'ka', geo: 'ka', hye: 'hy', arm: 'hy',
  aze: 'az', kaz: 'kk', uzb: 'uz', sqi: 'sq', alb: 'sq', mkd: 'mk', mac: 'mk', bos: 'bs', cat: 'ca',
  eus: 'eu', baq: 'eu', glg: 'gl', tam: 'ta', tel: 'te', mal: 'ml', kan: 'kn', mar: 'mr', guj: 'gu',
  pan: 'pa', amh: 'am', swa: 'sw', som: 'so', hau: 'ha', yor: 'yo', fil: 'fil', tgl: 'tl', mon: 'mn',
  pus: 'ps', kur: 'ku', bel: 'be', isl: 'is', ice: 'is', gle: 'ga', cym: 'cy', wel: 'cy', mlt: 'mt',
};

let regionNames = null;
let languageNames = null;
try {
  regionNames = new Intl.DisplayNames([LOCALE], { type: 'region' });
  languageNames = new Intl.DisplayNames([LOCALE], { type: 'language' });
} catch {}

/** Az egyenként hozzáadott saját csatornák „listájának” azonosítója. */
export const MINE = 'mine';

export const catalog = {
  tvVod: [], // a csatornalistákban talált filmek / sorozatrészek listánként (a VOD veszi át)
  playlistCounts: {}, // saját lista azonosító -> csatornák száma
  playlistErrors: {}, // saját lista azonosító -> hibaüzenet
  channels: [],
  byId: new Map(),
  countries: new Map(), // code -> { code, name, flag, count }
  languages: new Map(), // code -> { code, name, count }
  categories: new Map(), // id -> { id, name, count }
  tvgUrls: [], // a listák saját műsorújság-címei
  loadedAt: 0,
  ready: false,
};

export function countryName(code) {
  if (!code) return '';
  const c = catalog.countries.get(code);
  if (c?.name) return c.name;
  return regionLabel(code);
}

function regionLabel(code) {
  const iso = code === 'UK' ? 'GB' : code;
  try {
    const n = regionNames?.of(iso);
    if (n && n !== iso) return n;
  } catch {}
  return code;
}

// Windowson nincsenek zászló-emojik (csak betűpár jelenik meg), ott inkább elhagyjuk őket.
const FLAGS_OK = (() => {
  try {
    const c = document.createElement('canvas');
    c.width = c.height = 24;
    const x = c.getContext('2d', { willReadFrequently: true });
    x.font = '20px sans-serif';
    x.fillText('\u{1F1ED}\u{1F1FA}', 0, 20);
    const d = x.getImageData(0, 0, 24, 24).data;
    for (let i = 0; i < d.length; i += 4) if (d[i + 3] && (d[i] !== d[i + 1] || d[i + 1] !== d[i + 2])) return true;
  } catch {}
  return false;
})();

export function countryFlag(code) {
  return FLAGS_OK ? catalog.countries.get(code)?.flag || '' : '';
}

export function languageName(code, fallback) {
  const two = LANG3TO1[code] || (code.length === 2 ? code : null);
  try {
    const n = languageNames?.of(two || code);
    if (n && n !== code && n !== two) return n;
  } catch {}
  return fallback || code;
}

export const categoryName = (id) => CATEGORY_HU[id] || id;

// ---------------------------------------------------------------------------
// M3U
// ---------------------------------------------------------------------------
const PREFIX2 = new Set('HU RO SK RS HR SI AT DE UK GB US IT FR ES PL CZ UA NL BE CH PT TR GR BG AL BA MK ME RU SE NO DK FI IE CA AU IN BR MX AR'.split(' '));
const PREFIX3 = { HUN: 'HU', GER: 'DE', DEU: 'DE', ENG: 'UK', GBR: 'UK', USA: 'US', ROU: 'RO', ROM: 'RO', SVK: 'SK', CZE: 'CZ', POL: 'PL', AUT: 'AT', SRB: 'RS', HRV: 'HR', CRO: 'HR', ITA: 'IT', FRA: 'FR', ESP: 'ES', UKR: 'UA', SLO: 'SI', SVN: 'SI' };

// A lista sorainak feldolgozása lineáris időben: a reguláris kifejezések egy hosszú, hibás #EXTINF sornál
// (sok nyitott „[”, határoló nélküli hosszú szó) négyzetesen futottak, és megakasztották a felületet.

/** kulcs="érték" párok (egyetlen menet; a kulcs betű, szám, _ és -) */
function parseAttrs(s, out) {
  let i = 0;
  for (;;) {
    const eq = s.indexOf('="', i);
    if (eq < 0) return out;
    let k = eq;
    while (k > i && /[\w-]/.test(s[k - 1])) k--;
    const end = s.indexOf('"', eq + 2);
    if (end < 0) return out;
    if (k < eq) out[s.slice(k, eq).toLowerCase()] = s.slice(eq + 2, end);
    i = end + 1;
  }
}

/** A [címkék] kigyűjtése és eltávolítása (egyetlen menet; záratlan „[” után nincs több címke). */
function bracketLabels(s) {
  const labels = [];
  let rest = '';
  let i = 0;
  for (;;) {
    const a = s.indexOf('[', i);
    const b = a < 0 ? -1 : s.indexOf(']', a + 1);
    if (b < 0) return { labels, rest: rest + s.slice(i) };
    if (b > a + 1) {
      labels.push(s.slice(a + 1, b));
      rest += s.slice(i, a);
    } else rest += s.slice(i, b + 1); // üres „[]” marad (mint eddig)
    i = b + 1;
  }
}

export function parseM3U(text) {
  const lines = text.split(/\r?\n/);
  const entries = [];
  let tvgUrls = [];
  let cur = null;
  // Ha ez maga egy HLS adás (nem csatornalista), azt jelezzük a hívónak.
  if (/^#EXT-X-(TARGETDURATION|STREAM-INF|MEDIA-SEQUENCE|VERSION)/m.test(text.slice(0, 4000))) {
    return { tvgUrls, tvgUrl: null, entries, isStream: true };
  }
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    if (line.startsWith('#EXTM3U')) {
      const m = line.match(/(?:x-tvg-url|url-tvg)="([^"]+)"/);
      if (m) tvgUrls = m[1].split(',').map((u) => u.trim()).filter((u) => /^https?:\/\//.test(u));
    } else if (line.startsWith('#EXTINF')) {
      cur = { attrs: {}, opts: {} };
      const body = line.slice(line.indexOf(':') + 1);
      cur.duration = parseFloat(body) || 0; // filmeknél a hossz másodpercben (élő adásnál -1)
      parseAttrs(body, cur.attrs);
      const lastQuote = body.lastIndexOf('"');
      const comma = body.indexOf(',', lastQuote >= 0 ? lastQuote : 0);
      cur.title = comma >= 0 ? body.slice(comma + 1).trim() : '';
    } else if (line.startsWith('#EXTVLCOPT')) {
      if (!cur) continue;
      const m = line.match(/^#EXTVLCOPT:([\w-]+)=(.*)$/);
      if (m) cur.opts[m[1].toLowerCase()] = m[2].trim();
    } else if (line.startsWith('#EXTGRP:')) {
      // Régebbi listák külön sorban adják meg a csoportot.
      if (cur && !cur.attrs['group-title']) cur.attrs['group-title'] = line.slice(8).trim();
    } else if (!line.startsWith('#')) {
      if (!cur) {
        // Csak cím, #EXTINF nélkül: a név a fájlnév (kiterjesztés nélkül)
        let t = line.split('|')[0].split(/[?#]/)[0].split('/').pop() || line;
        try {
          t = decodeURIComponent(t);
        } catch {}
        cur = { attrs: {}, opts: {}, title: t.replace(/\.(m3u8?|ts|mp4|mkv|mpd|php)$/i, '') || t };
      }
      // Kodi-stílusú fejlécek a cím után: http://…/a.m3u8|User-Agent=…&Referer=…
      let url = line;
      const pipe = line.indexOf('|');
      if (pipe > 0 && /^[a-z]+:\/\//i.test(line)) {
        url = line.slice(0, pipe);
        for (const kv of line.slice(pipe + 1).split('&')) {
          const [k, ...v] = kv.split('=');
          const val = decodeURIComponent(v.join('=') || '');
          if (/^user-agent$/i.test(k)) cur.opts['http-user-agent'] = val;
          else if (/^refer+er$/i.test(k)) cur.opts['http-referrer'] = val;
        }
      }
      const a = cur.attrs;
      let title = String(cur.title || '').slice(0, 500);
      const { labels } = bracketLabels(title);
      // A Free-TV körbe írt betűkkel jelöl: Ⓖ = földrajzilag korlátozott.
      if (title.includes('Ⓖ')) labels.push('Geo-blocked');
      const q = title.match(/\((\d{3,4}[pi])\)/);
      // Országelőtag a névben (gyakori a saját listákban): „HU: M1”, „|HU| RTL”, „[HUN] TV2”, „HU - Duna”
      let prefixCc = '';
      const pm = /^\s*(?:[|[(]\s*([A-Za-z]{2,3})\s*[|\])]|([A-Z]{2,3})\s*(?::|\||\s[-–]\s))\s*(?=\S)/.exec(title);
      if (pm) {
        const code = (pm[1] || pm[2]).toUpperCase();
        prefixCc = code.length === 2 ? (PREFIX2.has(code) ? (code === 'GB' ? 'UK' : code) : '') : PREFIX3[code] || '';
        if (prefixCc) title = title.slice(pm[0].length);
      }
      title = bracketLabels(title).rest.replace(/\(\d{3,4}[pi]\)/g, '').replace(/[Ⓐ-ⓩ]/g, '').trim();
      entries.push({
        tvgId: a['tvg-id'] || '',
        country: a['tvg-country'] || prefixCc || '',
        language: a['tvg-language'] || '',
        name: (prefixCc ? title : a['tvg-name'] || title).replace(/[Ⓐ-ⓩ]/g, '').trim(),
        title,
        logo: a['tvg-logo'] || '',
        group: a['group-title'] || '',
        url,
        ua: a['http-user-agent'] || cur.opts['http-user-agent'] || '',
        referrer: a['http-referrer'] || a['http-referer'] || cur.opts['http-referrer'] || cur.opts['http-referer'] || '',
        quality: q ? q[1] : '',
        duration: cur.duration > 0 ? cur.duration : 0,
        labels,
        ...(a['adas-tags'] ? { tags: a['adas-tags'].split(';').filter(Boolean) } : null),
        ...(a['adas-file'] ? { file: a['adas-file'] } : null),
      });
      cur = null;
    }
  }
  return { tvgUrls, tvgUrl: tvgUrls[0] || null, entries, isStream: false };
}

const QUALITY_RANK = (q) => parseInt(q, 10) || 0;

// Saját listák gyakori (magyar vagy angol) csoportnevei → kategória
const GROUP_ALIASES = [
  [/h[ií]r|news|info/, 'news'],
  [/sport|foci|football|soccer|f1\b|motor ?sport/, 'sports'],
  [/mese|gyerek|kids|child|junior|rajzfilm|cartoon/, 'kids'],
  [/anim/, 'animation'],
  [/film|movie|mozi|cinema/, 'movies'],
  [/sorozat|series/, 'series'],
  [/zene|music|mtv|hits?\b/, 'music'],
  [/dokument|docu|ismeretterjeszt|natur|term[eé]szet|discovery/, 'documentary'],
  [/tud(o|ó)m[aá]ny|science/, 'science'],
  [/sz[oó]rakoz|entertain|show/, 'entertainment'],
  [/[eé]letm[oó]d|lifestyle|f[oő]z|gasztro|cooking|food/, 'lifestyle'],
  [/csal[aá]d|family/, 'family'],
  [/vall[aá]s|relig|church|egyh[aá]z/, 'religious'],
  [/k[oö]zszolg|public/, 'public'],
  [/[aá]ltal[aá]nos|general/, 'general'],
  [/utaz|travel/, 'travel'],
  [/v[aá]s[aá]rl|shop/, 'shop'],
  [/oktat|educat/, 'education'],
  [/kult[uú]r|culture|\barts?\b/, 'culture'],
  [/gazdas[aá]g|business|t[oő]zsde/, 'business'],
  [/v[ií]gj[aá]t|comedy|humor/, 'comedy'],
  [/felno|felnő|adult|xxx|18\+/, 'xxx'],
];

function groupToCategories(group) {
  return group
    .split(/[;|]/)
    .map((g) => g.trim().toLowerCase())
    .filter((g) => g && g !== 'undefined')
    .map((g) => (CATEGORY_HU[g] ? g : GROUP_ALIASES.find(([rx]) => rx.test(g))?.[1] || 'other'));
}

// ---------------------------------------------------------------------------
// Betöltés
// ---------------------------------------------------------------------------
async function getJSON(name, maxAgeHours = 24, force = false) {
  const { text } = await api.fetchText(API + name + '.json', { maxAgeHours, force });
  return JSON.parse(text);
}

/** A bekapcsolt listák (beépítettek, majd sajátok) a feldolgozás sorrendjében. */
export function activeLists() {
  const s = store.settings;
  const out = [];
  for (const b of BUILTIN_PLAYLISTS) {
    if (s.builtinLists?.[b.id] === false) continue;
    out.push({ ...b, url: b.id === 'iptvorg' ? s.playlistUrl || b.url : b.url, builtin: true });
  }
  // tévés kiegészítő csomagok (packs.js): beépítettként, a beépített listák kapcsolójával
  for (const p of packsOf('tv')) if ((s.builtinLists?.[p.id] ?? !p.off) !== false) out.push({ ...p, builtin: true });
  for (const p of s.customPlaylists) if (p.enabled) out.push({ ...p, builtin: false });
  return out;
}

/** Egyetlen adásból álló „lista” (pl. ha a cím maga egy HLS adás). */
function streamEntry(pl) {
  return {
    tvgId: '', name: pl.name, title: pl.name, logo: pl.logo || '', group: pl.category || '',
    country: pl.country || '', url: pl.url, ua: '', referrer: '', quality: '', labels: [],
  };
}

// ---------------------------------------------------------------------------
// Csatorna vagy VOD? A csatornalistákban lévő filmek / sorozatrészek a VOD-ba kerülnek, a VOD-listák
// élő adásai pedig a csatornák közé – a csatornák között csak tévé legyen, a VOD-ban csak VOD.
// ---------------------------------------------------------------------------
const VOD_EXT = /\.(mp4|mkv|avi|mov|m4v|wmv|webm|mpg|mpeg|divx|3gp|ogv)$/i;
const VOD_GROUP = /\b(vod|movies?|film(?:ek)?|series|sorozat(?:ok)?|mozi|cinema|kino|anime|episodes?|részek)\b/i;
const EP_OR_YEAR = /\bS\d{1,2}\s*[.\-_ ]?\s*E\d{1,3}\b|\b\d{1,2}x\d{2}\b|\(\s*(?:19|20)\d{2}\s*\)|\d+\.\s*(?:rész|évad)\b|\b(?:episode|ep\.?)\s*\d+/i;
const LIVE_GROUP = /\b(live|élő|tv|channels?|csatorn\w*|news|hírek|sport\w*|24\/7)\b/i;
const pathOf = (u) => String(u || '').split(/[?#|]/)[0];

/** Csatornalista tétele: film / sorozatrész (VOD)? */
export function isVodEntry(e) {
  const p = pathOf(e.url);
  if (/\/(movie|movies|series|vod)\//i.test(p) && !/\.m3u8$/i.test(p)) return true; // Xtream-stílusú VOD-cím
  if (e.duration > 0) return true; // hosszjelölés (#EXTINF:5400) – élő adásnál -1
  return VOD_EXT.test(p) && (EP_OR_YEAR.test(e.title || '') || VOD_GROUP.test(e.group || ''));
}

/** VOD-lista tétele: valójában élő adás (tévécsatorna)? */
export function isLiveEntry(e) {
  const p = pathOf(e.url);
  if (e.duration > 0 || VOD_EXT.test(p) || /\/(movie|series)\//i.test(p) || EP_OR_YEAR.test(e.title || '')) return false;
  if (/\.[a-z0-9]{2,4}$/i.test(p) && !/\.(m3u8|ts|mpd|php)$/i.test(p)) return false;
  return LIVE_GROUP.test(e.group || '') || !!e.tvgId;
}

// A VOD-listákban talált élő adások (a vod.js menti; a következő katalógus-összefésülés felveszi)
let vodLive = { sig: '', lists: [] };
export async function loadVodLive() {
  try {
    vodLive = (await api.kvGet?.('vod-live:1')) || vodLive;
  } catch {}
  return vodLive;
}
/**
 * A VOD hívja médiatáranként (vod / own): ha változott, a csatornákat újra kell fésülni.
 * A másik médiatár korábban átadott adásai megmaradnak. → true, ha változott
 */
export function setVodLive(libId, mine) {
  const prefix = `vodlive:${libId}:`;
  const lists = [...(vodLive.lists || []).filter((l) => !l.id.startsWith(prefix)), ...mine];
  const sig = lists.map((l) => l.id + ':' + l.entries.length).join(',');
  if (sig === vodLive.sig) return false;
  vodLive = { sig, lists };
  api.kvSet?.('vod-live:1', vodLive)?.catch?.(() => {});
  return true;
}

async function fetchAndBuild({ force = false, onProgress } = {}) {
  const step = (msg) => onProgress?.(msg);
  step(_t('Csatornalisták letöltése…'));
  const lists = activeLists();
  catalog.playlistErrors = {};

  // kiegészítő csomag: a szövege a tartós tárban
  const packText = async (pl) => ({ text: (await api.docGet?.(pl.textKey))?.text || '', cachedAt: pl.at || Date.now() });
  const loadList = async (pl) => {
    if (pl.stream) return { pl, entries: [streamEntry(pl)], tvgUrls: [], at: Date.now() };
    try {
      let r;
      if (pl.url) {
        try {
          // (a lista saját frissítési gyakoriságával – Beállítások → Csatornalisták, a lista sorában)
          r = await api.fetchText(pl.url, { maxAgeHours: refreshHoursOf('tv', pl), force });
          // Hálózati hibánál az asztali letöltő a legutóbbi példányt adja (stale): ezt jelezzük, és ha a
          // csomag mentett listája frissebb, az látszik
          if (r.stale) {
            if (pl.textKey && (pl.at || 0) > (r.cachedAt || 0)) throw new Error(_t('hálózati hiba'));
            catalog.playlistErrors[pl.id] = _t('a forrás most nem érhető el – a legutóbb letöltött példány látszik');
          }
        } catch (err) {
          // forráscímes csomag: ha a forrás nem érhető el, a csomagban mentett lista látszik
          if (!pl.textKey) throw err;
          r = await packText(pl);
          catalog.playlistErrors[pl.id] = _t('a forrás nem érhető el ({err}) – a csomagban mentett lista látszik', { err: errText(err) });
        }
      } else r = pl.textKey ? await packText(pl) : { text: pl.text || '', cachedAt: Date.now() };
      const parsed = parseM3U(r.text);
      if (parsed.isStream) return { pl, entries: [streamEntry(pl)], tvgUrls: [], at: r.cachedAt };
      // (a csomag saját műsorújság-címe – "epg" – a listáé mellé)
      const tvgUrls = pl.epg && !parsed.tvgUrls.includes(pl.epg) ? [...parsed.tvgUrls, pl.epg] : parsed.tvgUrls;
      return { pl, entries: parsed.entries, tvgUrls, at: r.cachedAt };
    } catch (err) {
      console.warn('Lista hiba', pl.name, err);
      catalog.playlistErrors[pl.id] = String(err.message || err);
      return { pl, entries: [], tvgUrls: [], at: 0 };
    }
  };

  const [loaded, meta] = await Promise.all([
    Promise.all(lists.map(loadList)),
    Promise.all(
      ['channels', 'feeds', 'logos', 'countries', 'categories', 'languages', 'blocklist'].map((n) =>
        getJSON(n, 24, force).catch(() => [])
      )
    ),
  ]);
  step(_t('Csatornák összefésülése…'));
  const [channels, feeds, logos, countries, , languages, blocklist] = meta;
  // Szétválogatás: a filmek / sorozatrészek a VOD-ba mennek (listánként), a VOD-listák élő adásai ide jönnek
  catalog.tvVod = [];
  for (const l of loaded) {
    if (l.pl.stream) continue;
    const vodEntries = l.entries.filter(isVodEntry);
    if (!vodEntries.length) continue;
    l.entries = l.entries.filter((e) => !vodEntries.includes(e));
    // (at: a lista letöltésének ideje – ha a lista frissül, a VOD is újratölt, akkor is, ha a darabszám nem változott)
    catalog.tvVod.push({ id: 'tv:' + l.pl.id, name: l.pl.name, entries: vodEntries, at: l.at || 0 });
  }
  for (const v of vodLive.lists || []) loaded.push({ pl: { id: v.id, name: v.name }, entries: v.entries, tvgUrls: [], at: 0 });

  const mine = store.settings.customChannels.map((c) => ({
    tvgId: '', customId: c.id, name: c.name, title: c.name, logo: c.logo || '', group: c.category || '',
    country: c.country || '', url: c.url, ua: c.ua || '', referrer: c.referrer || '', quality: '', labels: [],
  }));
  if (!loaded.some((l) => l.entries.length) && !mine.length) {
    throw new Error(Object.values(catalog.playlistErrors)[0] || _t('Nincs bekapcsolt csatornalista'));
  }

  build({ loaded, mine, channels, feeds, logos, countries, languages, blocklist });
  // A listák saját műsorújságai (a több tucat forrást felsoroló listákét kihagyjuk).
  catalog.tvgUrls = [...new Set(loaded.filter((l) => l.tvgUrls.length <= 3).flatMap((l) => l.tvgUrls))];
  catalog.loadedAt = Math.max(0, ...loaded.map((l) => l.at || 0)) || Date.now();
  catalog.builtAt = Date.now();
  catalog.ready = true;
  bus.emit('catalog');
  bus.emit('tv-vod');
  saveSnapshot();
}

/** A webcímről töltött listák közül a leggyakrabban frissítendő gyakorisága (óra). */
function minRefreshHours() {
  const hs = activeLists().filter((p) => p.url && !p.stream).map((p) => refreshHoursOf('tv', p));
  return hs.length ? Math.min(...hs) : DEFAULT_REFRESH_HOURS;
}

/** Esedékes-e a csatornalisták frissítése (valamelyik lista beállított gyakorisága szerint)? */
// (legalább naponta: a csatornaadatok – logó, ország, kategória – 24 óránként frissülnek)
export const catalogRefreshDue = () => catalog.ready && Date.now() - (catalog.builtAt || 0) > Math.min(24, minRefreshHours()) * 3600e3;

/**
 * A listák újratöltése a háttérben: csak az elavult listák töltődnek le újra (a többi a gyorsítótárból),
 * utána az összefésülés. (Az ütemező hívja – app.js.)
 */
export const reloadLists = () => fetchAndBuild({});

// ---------------------------------------------------------------------------
// A feldolgozott katalógus gyorsítótára: induláskor azonnal betölthető (a TV-n ez
// a különbség néhány másodperc és fél perc között), elavulás esetén a háttérben frissül.
// ---------------------------------------------------------------------------
// Az összefésülés logikájának változásakor növelni kell, hogy a régi mentés ne töltődjön be.
const SNAPSHOT_VERSION = 6;
const SNAPSHOT_MAX_AGE = 6 * 3600e3;

function snapshotKey() {
  const s = store.settings;
  const lists = activeLists().map((p) => p.id + (p.url || '') + (p.at || '')).join(',');
  // A saját csatornák bármely módosítása új kulcsot ad (így nem a régi állapot töltődik be).
  const mine = JSON.stringify(s.customChannels);
  let h = 0;
  for (let i = 0; i < mine.length; i++) h = (h * 31 + mine.charCodeAt(i)) | 0;
  // (a nyelv is része: a pillanatkép fordított szövegeket – pl. listaneveket – is tárol)
  return `catalog:${SNAPSHOT_VERSION}:${uiLang}:${lists}:${h}:${vodLive.sig}`;
}

/** Listánként a csatornák száma. */
function countPlaylists() {
  const counts = {};
  for (const ch of catalog.channels) for (const l of ch.lists || []) counts[l] = (counts[l] || 0) + 1;
  catalog.playlistCounts = counts;
}

function saveSnapshot() {
  if (!api.kvSet) return;
  api
    .kvSet(snapshotKey(), {
      v: SNAPSHOT_VERSION,
      at: Date.now(),
      loadedAt: catalog.loadedAt,
      tvgUrls: catalog.tvgUrls,
      playlistErrors: catalog.playlistErrors,
      channels: catalog.channels,
      countries: [...catalog.countries.values()],
      languages: [...catalog.languages.values()],
      categories: [...catalog.categories.values()],
      tvVod: catalog.tvVod || [],
    })
    .catch(() => {});
}

function hydrate(snap) {
  catalog.channels = snap.channels;
  catalog.byId = new Map(snap.channels.map((c) => [c.id, c]));
  catalog.countries = new Map(snap.countries.map((c) => [c.code, c]));
  catalog.languages = new Map(snap.languages.map((l) => [l.code, l]));
  catalog.categories = new Map(snap.categories.map((c) => [c.id, c]));
  catalog.tvgUrls = snap.tvgUrls || [];
  catalog.playlistErrors = snap.playlistErrors || {};
  catalog.loadedAt = snap.loadedAt;
  catalog.builtAt = snap.at;
  catalog.tvVod = snap.tvVod || [];
  catalog.ready = true;
  countPlaylists();
}

export async function loadCatalog({ force = false, onProgress } = {}) {
  await loadVodLive();
  if (!force && api.kvGet) {
    let snap = null;
    try {
      snap = await api.kvGet(snapshotKey());
    } catch {}
    if (snap && snap.v === SNAPSHOT_VERSION && snap.channels?.length) {
      hydrate(snap);
      bus.emit('catalog');
      bus.emit('tv-vod');
      // (elavult: a pillanatkép régebbi a legkorábban esedékes lista frissítési gyakoriságánál)
      if (Date.now() - snap.at > Math.min(SNAPSHOT_MAX_AGE, minRefreshHours() * 3600e3)) {
        fetchAndBuild({}).catch((err) => console.warn('Háttérfrissítés sikertelen', err));
      }
      return;
    }
  }
  await fetchAndBuild({ force, onProgress });
}

// ---------------------------------------------------------------------------
// Összefésülés duplikáció nélkül
//
// Az iptv-org csatornái a saját azonosítójukat kapják. A többi lista minden adását
// megpróbáljuk egy már meglévő csatornához kötni:
//   1. iptv-org azonosító (tvg-id) alapján,
//   2. név + ország alapján,
//   3. csak név alapján, ha egyértelmű (és az ország nem mond ellent),
// különben új csatorna jön létre, amelyhez a többi listában lévő azonos nevű adások csatlakoznak.
// Az összevont csatornánál a listák adásai egymás tartalék forrásai; azonos cím csak egyszer szerepel.
// ---------------------------------------------------------------------------
const CIRCLED = /[Ⓐ-ⓩ]/g;

/** Név összevetéshez: ékezet, írásjelek, zárójeles részek és minőségjelzők nélkül. */
export function nameKey(name) {
  const k = norm(String(name || '').replace(CIRCLED, ''))
    .replace(/\([^)]*\)|\[[^\]]*\]/g, ' ')
    .replace(/\b(uhd|fhd|hd|sd|4k|1080p|720p|480p|360p)\b/g, ' ');
  return k.replace(/[^a-z0-9]/g, '');
}

const COUNTRY_ALIASES = {
  usa: 'US', unitedstatesofamerica: 'US', uk: 'UK', greatbritain: 'UK', england: 'UK', korea: 'KR', southkorea: 'KR',
  magyar: 'HU', magyarorszag: 'HU', magyarcsatornak: 'HU', hungarian: 'HU', hun: 'HU', hungarianchannels: 'HU',
};

// Nyelv a tvg-language mezőből (angol vagy magyar név, illetve kód) → ISO 639-3
const LANG_ALIASES = { magyar: 'hun', hungarian: 'hun', hu: 'hun', hun: 'hun', angol: 'eng', english: 'eng', en: 'eng', nemet: 'deu', german: 'deu', de: 'deu' };

function build({ loaded, mine, channels, feeds, logos, countries, languages, blocklist }) {
  const metaById = new Map(channels.map((c) => [c.id, c]));
  const metaIdLower = new Map(channels.map((c) => [c.id.toLowerCase(), c.id]));
  const feedsByChannel = new Map();
  for (const f of feeds) {
    if (!feedsByChannel.has(f.channel)) feedsByChannel.set(f.channel, []);
    feedsByChannel.get(f.channel).push(f);
  }
  const logoByChannel = new Map();
  for (const l of logos) {
    if (l.feed) continue;
    const prev = logoByChannel.get(l.channel);
    const score = (l.in_use ? 1e6 : 0) + (l.format === 'SVG' ? 0 : l.format === 'PNG' ? 2e5 : 1e5) + (l.width || 0);
    if (!prev || score > prev.score) logoByChannel.set(l.channel, { url: l.url, score });
  }
  const nsfwBlock = new Set(blocklist.filter((b) => b.reason === 'nsfw').map((b) => b.channel));
  const langNames = new Map(languages.map((l) => [l.code, l.name]));
  const langByName = new Map(languages.map((l) => [key(l.name), l.code]));
  const langOf = (text) =>
    String(text || '')
      .split(/[;,/]/)
      .map((t) => key(t))
      .filter(Boolean)
      .map((k) => LANG_ALIASES[k] || langByName.get(k) || (langNames.has(k) ? k : ''))
      .filter(Boolean);

  catalog.countries = new Map(
    countries.map((c) => [c.code, { code: c.code, name: regionLabel(c.code), flag: c.flag, count: 0 }])
  );
  catalog.languages = new Map();
  catalog.categories = new Map();

  // Ország felismerése a group-title / tvg-country mezőből (sok lista az ország angol nevét írja ide).
  const countryByName = new Map(countries.map((c) => [key(c.name), c.code]));
  for (const [k, v] of Object.entries(COUNTRY_ALIASES)) countryByName.set(k, v);
  const countryOf = (text) => {
    if (!text) return '';
    const t = String(text).trim();
    if (/^[A-Za-z]{2}$/.test(t)) return t.toUpperCase() === 'GB' ? 'UK' : t.toUpperCase();
    return countryByName.get(key(t)) || '';
  };
  const entryCountry = (e) =>
    countryOf(e.country) || countryOf(e.group) || ((e.tvgId || '').split('@')[0].match(/\.([a-z]{2})$/i)?.[1] || '').toUpperCase();

  const groups = new Map(); // id -> { id, base, entries, lists, cc }
  const nameIdx = new Map(); // nameKey -> Set(groupId)
  const nameCcIdx = new Map(); // nameKey|ország -> groupId
  const index = (g, name) => {
    const nk = nameKey(name);
    if (!nk) return;
    if (!nameIdx.has(nk)) nameIdx.set(nk, new Set());
    nameIdx.get(nk).add(g.id);
    if (g.cc && !nameCcIdx.has(nk + '|' + g.cc)) nameCcIdx.set(nk + '|' + g.cc, g.id);
  };
  const getGroup = (id, base, cc) => {
    let g = groups.get(id);
    if (!g) {
      const meta = metaById.get(base);
      g = { id, base, entries: [], lists: new Set(), urls: new Set(), cc: (meta?.country || cc || '').toUpperCase() };
      groups.set(id, g);
      if (meta) [meta.name, ...(meta.alt_names || [])].forEach((n) => index(g, n));
    }
    return g;
  };

  const resolve = (e, pl) => {
    const [base] = (e.tvgId || '').split('@');
    if (pl.id === 'iptvorg') return { id: base || 'n:' + norm(e.title), base };
    // 1. iptv-org azonosító
    if (base) {
      const mid = metaIdLower.get(base.toLowerCase());
      if (mid) return { id: mid, base: mid };
    }
    const nk = nameKey(e.name || e.title);
    if (!nk) return { id: 'u:' + e.url, base: '' };
    const cc = entryCountry(e);
    // 2. név + ország
    if (cc && nameCcIdx.has(nk + '|' + cc)) return { id: nameCcIdx.get(nk + '|' + cc), base: '' };
    // 3. csak név, ha egyértelmű és az ország nem mond ellent
    //    (a regionális platformlistáknál – Pluto, Samsung, Plex – az ország nem számít)
    const cands = [...(nameIdx.get(nk) || [])].filter((id) => {
      const g = groups.get(id);
      return id.startsWith('x:') || pl.regional || !cc || !g.cc || g.cc === cc;
    });
    if (cands.length === 1) return { id: cands[0], base: '' };
    if (cands.length > 1 && pl.regional) {
      const pick = cands.find((id) => groups.get(id).cc === cc) || cands.find((id) => !id.startsWith('x:')) || cands[0];
      return { id: pick, base: '' };
    }
    // 4. új (listák közötti) csatorna, név szerint
    return { id: 'x:' + nk, base: '' };
  };

  const urlGroup = new Map(); // adás címe -> csoport: ugyanaz a cím = ugyanaz az adás, bármi a neve
  for (const { pl, entries } of loaded) {
    for (const e of entries) {
      let { id, base } = resolve(e, pl);
      // Más listában más néven (pl. „16TV” / „16tv Budapest”) szereplő, de azonos adás: egy csatorna legyen.
      if (pl.id !== 'iptvorg' && urlGroup.has(e.url) && urlGroup.get(e.url) !== id) {
        const g0 = groups.get(urlGroup.get(e.url));
        id = g0.id;
        base = g0.base;
      }
      const cc = entryCountry(e);
      const g = getGroup(id, base, cc);
      if (g.urls.has(e.url)) {
        g.lists.add(pl.id);
        continue; // ugyanaz az adás egy másik listában is szerepel
      }
      g.urls.add(e.url);
      if (!urlGroup.has(e.url)) urlGroup.set(e.url, g.id);
      g.lists.add(pl.id);
      g.entries.push({ ...e, feed: (e.tvgId || '').split('@')[1] || '', listId: pl.id, listName: pl.name, cc });
      index(g, e.title || e.name);
    }
  }
  for (const e of mine) {
    const g = getGroup(`c:${MINE}:${e.customId}`, '', e.country);
    g.lists.add(MINE);
    g.entries.push({ ...e, feed: '', listId: MINE, listName: _t('Saját csatornák'), cc: e.country });
  }

  const listNameById = new Map(loaded.map((l) => [l.pl.id, l.pl.name]));
  listNameById.set(MINE, _t('Saját csatornák'));

  const list = [];
  for (const g of groups.values()) {
    if (!g.entries.length) continue;
    const meta = metaById.get(g.base) || null;
    // Az iptv-org adás (ha van) adja a nevet és a logót.
    const first = g.entries.find((e) => e.listId === 'iptvorg') || g.entries[0];
    const chFeeds = feedsByChannel.get(g.base) || [];
    const mainFeed = chFeeds.find((f) => f.is_main) || chFeeds[0];
    const country = (meta?.country || g.cc || g.entries.find((e) => e.cc)?.cc || '').toUpperCase();

    let categories = meta?.categories?.length ? meta.categories.slice() : [];
    if (!categories.length) {
      const cats = new Set();
      for (const e of g.entries) if (!countryOf(e.group)) groupToCategories(e.group).forEach((c) => cats.add(c));
      if (cats.size > 1) cats.delete('other');
      categories = [...cats];
    }
    if (!categories.length) categories = ['other'];

    const langCodes = new Set();
    for (const f of chFeeds) if (f.is_main || g.entries.some((e) => e.feed === f.id)) f.languages?.forEach((l) => langCodes.add(l));
    // Saját listák: a tvg-language mezőből
    if (!langCodes.size) for (const e of g.entries) langOf(e.language).forEach((l) => langCodes.add(l));

    const streams = g.entries.map((e) => {
      const feed = chFeeds.find((f) => f.id === e.feed);
      const label =
        feed?.name ||
        e.feed ||
        (e.listId !== 'iptvorg' ? [e.listName, e.cc && e.cc !== country ? regionLabel(e.cc) : ''].filter(Boolean).join(' · ') : '');
      return {
        url: e.url,
        title: e.title,
        quality: e.quality || feed?.format || '',
        labels: e.labels,
        ua: e.ua,
        referrer: e.referrer,
        feed: e.feed,
        feedName: label,
        source: e.listName,
        geoBlocked: e.labels.includes('Geo-blocked'),
        notAlways: e.labels.includes('Not 24/7'),
      };
    });

    const lists = [...g.lists];
    const ch = {
      id: g.id,
      tvgIds: [...new Set(g.entries.map((e) => e.tvgId).filter(Boolean))],
      name: meta?.name || cleanTitle(first.title || first.name),
      altNames: meta?.alt_names || [],
      logo: first.logo || logoByChannel.get(g.base)?.url || g.entries.find((e) => e.logo)?.logo || '',
      country,
      categories,
      languages: [...langCodes],
      network: meta?.network || '',
      owners: meta?.owners || [],
      website: meta?.website || '',
      launched: meta?.launched || '',
      closed: meta?.closed || '',
      timezones: mainFeed?.timezones || [],
      broadcastArea: mainFeed?.broadcast_area || [],
      nsfw: !!(meta?.is_nsfw || nsfwBlock.has(g.base) || categories.includes('xxx')),
      lists,
      custom: lists.map((l) => listNameById.get(l) || l).join(', '),
      streams,
    };
    ch.search = norm(
      [ch.name, ...ch.altNames, ch.network, countryName(ch.country), ch.country, ...ch.categories.map(categoryName), ch.custom].join(' ')
    );
    ch.nameKey = norm(ch.name);
    list.push(ch);

    const c = catalog.countries.get(country);
    if (c) c.count++;
    else if (country) catalog.countries.set(country, { code: country, name: regionLabel(country), flag: '', count: 1 });
    for (const cat of categories) {
      const x = catalog.categories.get(cat) || { id: cat, name: categoryName(cat), count: 0 };
      x.count++;
      catalog.categories.set(cat, x);
    }
    for (const l of langCodes) {
      const x = catalog.languages.get(l) || { code: l, name: languageName(l, langNames.get(l)), count: 0 };
      x.count++;
      catalog.languages.set(l, x);
    }
  }
  list.sort((a, b) => a.name.localeCompare(b.name, LOCALE));
  catalog.channels = list;
  catalog.byId = new Map(list.map((c) => [c.id, c]));
  countPlaylists();
}

function cleanTitle(t) {
  return t.replace(/\s*\((?:[A-Z][a-z]+(?: [A-Z][a-z]+)*)\)\s*/g, ' ').replace(/\s+/g, ' ').trim() || t;
}

// ---------------------------------------------------------------------------
// Állapot, szűrés, keresés
// ---------------------------------------------------------------------------
/** 'ok' ha legalább egy adás működött, 'bad' ha mindegyik hibás, különben 'unknown'. */
export function channelStatus(ch) {
  let known = 0;
  for (const s of ch.streams) {
    const h = store.healthOf(s.url);
    if (!h) continue;
    if (h.ok) return 'ok';
    known++;
  }
  // A háttérben csatornánként legfeljebb 4 forrást ellenőrzünk: ha ezek mind hibásak, a csatorna nem elérhető.
  return known >= Math.min(ch.streams.length, 4) ? 'bad' : 'unknown';
}

/**
 * Nem elérhető csatorna felirata: „Adásszünet”, ha a csatorna csak időszakosan sugároz
 * (és most nem megy), különben „Offline”. Elérhető vagy nem ellenőrzött csatornánál null.
 */
export function offlineLabel(ch) {
  if (channelStatus(ch) !== 'bad') return null;
  if (geoLimited(ch)) return _t('Földrajzi korlát');
  return ch.streams.some((s) => s.notAlways) ? _t('Adásszünet') : _t('Offline');
}

/**
 * Mért földrajzi korlát: a csatorna legalább egy forrását a szerver innen 403 / 451 válasszal
 * elutasította, egyik sem működik, és nincs még ki nem próbált forrása. (A lista [Geo-blocked]
 * jelölése önmagában nem elég – az csak „korlátozott lehet”, lásd geoState.)
 */
export function geoLimited(ch) {
  if (!ch?.streams?.length) return false;
  let measured = false;
  for (const s of ch.streams) {
    const h = store.healthOf(s.url);
    if (!h || h.ok) return false; // ki nem próbált vagy működő forrás: lehet, hogy innen nézhető
    if (h.geo) measured = true;
  }
  return measured;
}

/**
 * A felületi jelölés: 'sure' – innen biztosan nem nézhető (403 / 451); 'maybe' – a lista szerint minden
 * forrása korlátozott, és innen még nem láttuk működni; '' – nem korlátozott (vagy innen működik).
 */
export function geoState(ch) {
  if (geoLimited(ch)) return 'sure';
  if (ch?.streams?.length && ch.streams.every((s) => s.geoBlocked) && channelStatus(ch) !== 'ok') return 'maybe';
  return '';
}

/** Adások lejátszási sorrendben: működők elöl, majd jobb minőség, a korlátozottak hátul. */
export function orderedStreams(ch) {
  const score = (s) => {
    const h = store.healthOf(s.url);
    let v = h ? (h.ok ? 1e6 : -1e6) : 0;
    v += QUALITY_RANK(s.quality);
    if (s.geoBlocked) v -= 5000;
    if (s.notAlways) v -= 2000;
    if (/\.mpd(\?|$)/i.test(s.url)) v -= 500;
    return v;
  };
  return ch.streams.slice().sort((a, b) => score(b) - score(a));
}

export function bestQuality(ch) {
  return ch.streams.reduce((m, s) => Math.max(m, QUALITY_RANK(s.quality)), 0);
}

export function qualityBadge(ch) {
  const q = bestQuality(ch);
  if (q >= 2160) return '4K';
  if (q >= 1080) return 'FHD';
  if (q >= 720) return 'HD';
  return '';
}

// ---------------------------------------------------------------------------
// Hazai elöl: a beállított ország (alapból Magyarország) csatornái, majd az ország nyelvén
// sugárzók (pl. a határon túli magyar adók), utána a többi – minden listában és kategóriában.
// ---------------------------------------------------------------------------
export const COUNTRY_LANG = { HU: 'hun', DE: 'deu', AT: 'deu', RO: 'ron', SK: 'slk', CZ: 'ces', PL: 'pol', HR: 'hrv', RS: 'srp', SI: 'slv', UA: 'ukr', IT: 'ita', FR: 'fra', ES: 'spa', GB: 'eng', US: 'eng', NL: 'nld', PT: 'por' };

/** 2 = hazai, 1 = hazai nyelvű, 0 = egyéb */
export function homeRank(ch) {
  const home = store.settings.homeCountry;
  if (ch.country === home) return 2;
  const lang = COUNTRY_LANG[home];
  return lang && ch.languages?.includes(lang) ? 1 : 0;
}

/** Stabil rendezés: a hazai és a hazai nyelvű tételek előre, egyébként a sorrend marad. */
export function homeFirst(list, rank = homeRank) {
  return list
    .map((c, i) => [c, rank(c), i])
    .sort((a, b) => b[1] - a[1] || a[2] - b[2])
    .map((x) => x[0]);
}

let orderedCache = { src: null, home: null, list: [] };
function homeOrdered() {
  const home = store.settings.homeCountry;
  if (orderedCache.src !== catalog.channels || orderedCache.home !== home) {
    orderedCache = { src: catalog.channels, home, list: homeFirst(catalog.channels) };
  }
  return orderedCache.list;
}

/** A jelenlegi profil számára látható csatornák (a hazaiak elöl, azon belül név szerint). */
export function visible(list = homeOrdered()) {
  const p = store.profile;
  const s = store.settings;
  return list.filter((ch) => {
    if (ch.nsfw && (!s.showAdult || p.kids)) return false;
    if (p.kids && !kidsAllowed(p, 'ch', ch)) return false; // gyerekprofil: a jelölés / a profil engedélye szerint
    if (s.hideOffline && channelStatus(ch) === 'bad') return false;
    return true;
  });
}

export function getChannels(ids) {
  return ids.map((id) => catalog.byId.get(id)).filter(Boolean);
}

export function search(query, list = visible()) {
  const tokens = norm(query).split(/\s+/).filter(Boolean);
  if (!tokens.length) return [];
  const hits = [];
  for (const ch of list) {
    if (!tokens.every((t) => ch.search.includes(t))) continue;
    const full = tokens.join(' ');
    let rank = 3;
    if (ch.nameKey === full) rank = 0;
    else if (ch.nameKey.startsWith(full)) rank = 1;
    else if (ch.nameKey.includes(full)) rank = 2;
    hits.push([rank, ch, homeRank(ch)]);
  }
  // A pontos névegyezés marad legelöl, utána a hazai és hazai nyelvű találatok.
  hits.sort((a, b) => (a[0] > 0) - (b[0] > 0) || b[2] - a[2] || a[0] - b[0] || a[1].name.localeCompare(b[1].name, LOCALE));
  return hits.map((h) => h[1]);
}

/** Népszerűség-közelítés: működő, van logója, HD, nem korlátozott. */
export function rankScore(ch) {
  const st = channelStatus(ch);
  let v = st === 'ok' ? 100 : st === 'bad' ? -100 : 0;
  if (ch.logo) v += 20;
  v += Math.min(bestQuality(ch), 1080) / 54;
  if (ch.streams.every((s) => s.geoBlocked)) v -= 30;
  if (ch.streams.every((s) => s.notAlways)) v -= 10;
  return v;
}
