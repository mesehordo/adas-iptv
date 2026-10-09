// Feliratok filmekhez és sorozatokhoz: Feliratok.eu és OpenSubtitles (magyar és angol), helyi .srt / .vtt fájl,
// időeltolás, betűméret. A kiválasztott felirat profilonként megmarad az adott filmhez / részhez.
import { api } from './api.js';
import { store } from './store.js';
import { esc, toast, bus } from './util.js';
import { player } from './player.js';
import { isHuLang, isEnLang, langMatcher } from './engine.js';
import { nightAvailable, nightOn, setNight } from './audiofx.js';
import { isZip, unzip, bytesToText } from './unzip.js';

// Éjszakai hang: a profil beállítása minden adás indulásakor érvényesül.
import { _t, LOCALE, lang as uiLang, languageName } from './i18n.js';
player.audioHooks = {
  onStart(video) {
    const want = !!store.profile.nightAudio;
    if (nightAvailable() && want !== nightOn()) setNight(video, want);
  },
};

const OS_BASE = 'https://api.opensubtitles.com/api/v1';
const UA = 'Adas v1.25';
// Feliratnyelvek: magyar felületen magyar és angol; más nyelvű felületen a saját nyelv és az angol.
export const SUB_LANGS = uiLang === 'hu' ? ['hu', 'en'] : [...new Set([uiLang, 'en'])];
const LANG_FILE_RX = { hu: 'hu|hun|magyar|hungarian', en: 'en|eng|english', de: 'de|ger|deu|german|deutsch', fr: 'fr|fre|fra|french|francais', es: 'es|spa|spanish|espanol' };
/** A videó melletti feliratfájl ezen a nyelven van-e (a fájlnév nyelvjelölése alapján). */
// (a minta csak a fenti, rögzített listából jön – a beállításból érkező szöveg nem lehet minta;
// ismeretlen nyelvhez nincs jelölt fájl)
const fileIsLang = (code) => {
  const alt = Object.prototype.hasOwnProperty.call(LANG_FILE_RX, code) ? LANG_FILE_RX[code] : null;
  if (!alt) return () => false;
  const rx = new RegExp(`[._ -](${alt})\\b`, 'i');
  return (n) => rx.test(n);
};
const subsLangPref = () => (SUB_LANGS.includes(store.settings.subsLang) ? store.settings.subsLang : SUB_LANGS[0]);

const state = {
  track: null, // a <video> saját feliratsávja
  cues: [], // az aktuális felirat eredeti időzítéssel
  offset: 0, // mp
  label: '', // pl. „Magyar – Movie.Name.2019.srt”
  key: '', // a film / rész kulcsa
  results: null,
  busy: false,
};

// ---------------------------------------------------------------------------
// Feliratfájl feldolgozása (SRT és WebVTT)
// ---------------------------------------------------------------------------
function toSec(t) {
  const m = /(?:(\d{1,2}):)?(\d{1,2}):(\d{2})[,.](\d{1,3})/.exec(t);
  if (!m) return NaN;
  return (parseInt(m[1] || '0', 10) * 3600) + parseInt(m[2], 10) * 60 + parseInt(m[3], 10) + parseInt(m[4].padEnd(3, '0'), 10) / 1000;
}

/**
 * Csak az <i>, <b>, <u> marad. Egyetlen, lineáris menet: minden más jelölő kimarad, és a magányos „<” is –
 * így egymásba ágyazott jelölőkből sem állhat össze új (és nem kell ismételve, négyzetes időben futtatni).
 */
const BASIC_TAGS = ['<i>', '</i>', '<b>', '</b>', '<u>', '</u>'];
function keepBasicTags(s) {
  let out = '';
  let i = 0;
  while (i < s.length) {
    const lt = s.indexOf('<', i);
    if (lt < 0) return out + s.slice(i);
    out += s.slice(i, lt);
    const tag = BASIC_TAGS.find((t) => s.startsWith(t, lt));
    if (tag) {
      out += tag;
      i = lt + tag.length;
      continue;
    }
    // a jelölő vége: az első „>” – ha előbb új „<” jön (vagy semmi), csak ez a „<” marad ki
    let j = lt + 1;
    while (j < s.length && s[j] !== '>' && s[j] !== '<') j++;
    i = s[j] === '>' ? j + 1 : lt + 1;
  }
  return out;
}

export function parseSubs(text) {
  const cues = [];
  const blocks = String(text).replace(/^﻿/, '').replace(/\r/g, '').split(/\n{2,}/);
  for (const b of blocks) {
    const lines = b.split('\n');
    const i = lines.findIndex((l) => l.includes('-->'));
    if (i < 0) continue;
    const [a, z] = lines[i].split('-->');
    const start = toSec(a);
    const end = toSec(z);
    if (!(end > start)) continue;
    let body = lines
      .slice(i + 1)
      .join('\n')
      .replace(/\{\\[^}]*\}/g, ''); // ASS-stílusjelölők (pl. {\an8})
    body = keepBasicTags(body).trim();
    if (body) cues.push({ start, end, text: body });
  }
  return cues;
}

// ---------------------------------------------------------------------------
// Megjelenítés a videón
// ---------------------------------------------------------------------------
function ensureTrack(video) {
  if (!state.track) {
    // a címke belső jelölő (az engine.js erről ismeri fel a saját sávot), a felületen nem jelenik meg – nem fordítjuk
    state.track = video.addTextTrack('subtitles', 'Felirat', LOCALE);
  }
  return state.track;
}

function clearCues() {
  const t = state.track;
  if (!t) return;
  while (t.cues && t.cues.length) t.removeCue(t.cues[0]);
}

function render(video) {
  const t = ensureTrack(video);
  clearCues();
  const Cue = window.VTTCue || window.TextTrackCue;
  for (const c of state.cues) {
    try {
      t.addCue(new Cue(Math.max(0, c.start + state.offset), Math.max(0, c.end + state.offset), c.text));
    } catch {}
  }
  t.mode = state.cues.length ? 'showing' : 'disabled';
}

function apply(video, cues, label) {
  state.cues = cues;
  state.label = label;
  state.offset = 0;
  player.engine?.setTextTrack(''); // a beágyazott felirat ilyenkor kikapcsol
  render(video);
  toast(`${_t('Felirat: {label}', { label })}`);
}

export function clearSubs(video) {
  state.cues = [];
  state.label = '';
  state.offset = 0;
  if (state.track) {
    clearCues();
    state.track.mode = 'disabled';
  }
}

function applySize() {
  const root = document.getElementById('player');
  root.classList.remove('subs-small', 'subs-large', 'subs-huge');
  const s = store.settings.subsSize || 'normal';
  if (s !== 'normal') root.classList.add('subs-' + s);
}
bus.on('settings', (k) => k === 'subsSize' && applySize());

// ---------------------------------------------------------------------------
// OpenSubtitles
// ---------------------------------------------------------------------------
function osHeaders(auth) {
  const h = {
    'Api-Key': (store.settings.osApiKey || '').trim(),
    'User-Agent': UA,
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };
  if (auth && store.settings.osToken) h.Authorization = `Bearer ${store.settings.osToken}`;
  return h;
}

async function osReq(method, path, body, { auth = false, retry = true } = {}) {
  if (!(store.settings.osApiKey || '').trim()) {
    throw new Error(_t('Nincs megadva OpenSubtitles API-kulcs (Beállítások → Feliratok és információk → Magyar információk és feliratok).'));
  }
  // a bejelentkezéskor kapott kiszolgáló csak az OpenSubtitles saját címe lehet (egy importált beállítás se
  // irányíthassa máshová a kulccsal és a tokennel együtt)
  const host = String(store.settings.osBaseUrl || '').toLowerCase();
  const base = auth && /^([a-z0-9-]+\.)*opensubtitles\.(com|org)$/.test(host) ? `https://${host}/api/v1` : OS_BASE;
  const r = await api.request({ method, url: base + path, headers: osHeaders(auth), body: body ? JSON.stringify(body) : undefined });
  let j = {};
  try {
    j = JSON.parse(r.text);
  } catch {}
  if (r.status === 401 && auth && retry) {
    await osLogin();
    return osReq(method, path, body, { auth, retry: false });
  }
  if (r.status >= 400) throw new Error(huError(j.message || (j.errors || []).join(', '), r.status));
  return j;
}

/** Az OpenSubtitles gyakori hibaüzenetei magyarul. */
function huError(msg, status) {
  const m = String(msg || '');
  if (/cannot consume|invalid api key|api key/i.test(m) || status === 403) return _t('Érvénytelen OpenSubtitles API-kulcs. Ellenőrizd a Beállításokban.');
  if (/invalid username|password|unauthorized/i.test(m) || status === 401) return _t('Hibás OpenSubtitles felhasználónév vagy jelszó.');
  if (/download count|quota|limit/i.test(m) || status === 406) return _t('Elfogyott a mai letöltési keret (OpenSubtitles). Holnap újra lehet tölteni.');
  if (status === 429) return _t('Túl sok kérés rövid időn belül – várj néhány másodpercet, és próbáld újra.');
  return m || `HTTP ${status}`;
}

/** Bejelentkezés (a letöltéshez szükséges). Visszaadja a napi letöltési keretet. */
export async function osLogin() {
  const s = store.settings;
  if (!s.osUser || !s.osPass) {
    throw new Error(_t('A felirat letöltéséhez OpenSubtitles-fiók kell: add meg a felhasználóneved és jelszavad a Beállításokban.'));
  }
  const j = await osReq('POST', '/login', { username: s.osUser, password: s.osPass }, { retry: false });
  s.osToken = j.token || '';
  s.osBaseUrl = j.base_url || '';
  store.save();
  return j.user || {};
}

// ---------------------------------------------------------------------------
// Feliratok.eu – magyar feliratoldal, fiók és kulcs nélkül (magyar és angol feliratok)
// Filmek: a keresőoldal találati táblája; sorozatrészek: a sorozat azonosítója (automatikus
// kiegészítés), majd a Kodi-kiegészítőknek szóló JSON-felület (évad, rész). Az évadcsomagok ZIP-ek.
// ---------------------------------------------------------------------------
const FE = 'https://feliratok.eu/index.php';
// (protokollértékek: a kérés `nyelv` paramétere és a válasz `language` mezője – nem fordítjuk)
const FE_LANG = { hu: 'Magyar', en: 'Angol' };
const feOn = () => store.settings.subsFeliratok !== false;
// HTML-részlet → sima szöveg (a böngésző saját feldolgozójával: a címkék és a jelölések egy lépésben,
// szkript nem fut le). A kapott szöveget megjelenítéskor mindig escape-eljük.
const unHtml = (s) => (new DOMParser().parseFromString(String(s || ''), 'text/html').body.textContent || '').replace(/\s+/g, ' ').trim();
const foldT = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

async function feGet(url) {
  const r = await api.request({ url, headers: { 'User-Agent': UA } });
  if (r.status >= 400) throw new Error(`${_t('Feliratok.eu: HTTP {status}', { status: r.status })}`);
  return r.text;
}

/** Film: a keresőoldal találatai. */
async function feSearchMovie(item, lang) {
  const html = await feGet(`${FE}?search=${encodeURIComponent(item.title)}&nyelv=${FE_LANG[lang]}`);
  const out = [];
  for (const block of html.split(/<tr id="vilagit"/).slice(1)) {
    const link = /action=letolt&fnev=([^"&]*)&felirat=(\d+)/.exec(block);
    if (!link) continue;
    const l = unHtml(/class="lang"[^>]*>([\s\S]*?)<\/td>/.exec(block)?.[1]);
    if (l && l !== FE_LANG[lang]) continue;
    const eredeti = unHtml(/class="eredeti">([\s\S]*?)<\/div>/.exec(block)?.[1]);
    const magyar = unHtml(/class="magyar">([\s\S]*?)<\/div>/.exec(block)?.[1]);
    const year = Number(/\((19|20)\d{2}\)/.exec(eredeti)?.[0].slice(1, 5)) || 0;
    // csak a címben egyező találatok (a kereső szótöredékre is talál)
    if (!foldT(eredeti + ' ' + magyar).includes(foldT(item.title))) continue;
    out.push({ src: 'fe', fe: { fnev: link[1], id: link[2] }, lang, release: eredeti || magyar, title: magyar, year, downloads: 0 });
  }
  // az évben és a pontos címben egyezők elöl (pl. a „… – The Making of” hátrébb)
  const exact = (x) => foldT(x.release.replace(/\s*\(.*$/, '')) === foldT(item.title);
  const score = (x) => (item.year && x.year === item.year ? 2 : 0) + (exact(x) ? 1 : 0);
  return out.sort((a, b) => score(b) - score(a));
}

/** Sorozatrész: sorozat-azonosító, majd a rész (vagy évadcsomag) feliratai. */
async function feSearchEpisode(item, ep, lang) {
  const shows = JSON.parse((await feGet(`${FE}?action=autoname&nyelv=0&term=${encodeURIComponent(item.title)}`)) || '[]');
  const want = foldT(item.title);
  const show = shows.find((s) => foldT(s.name.replace(/\(\d{4}\)\s*$/, '')) === want) || shows.find((s) => foldT(s.name).startsWith(want));
  if (!show) return [];
  const list = JSON.parse((await feGet(`${FE}?action=xbmc&sid=${encodeURIComponent(show.ID)}&ev=${ep.season || 1}&rtol=${ep.episode}`)) || '[]');
  return (Array.isArray(list) ? list : [])
    .filter((x) => x.language === FE_LANG[lang] && x.felirat)
    .map((x) => ({
      src: 'fe',
      fe: { fnev: x.fnev, id: String(x.felirat), pack: x.evadpakk === '1', season: ep.season || 1, episode: ep.episode },
      lang,
      release: x.nev + (x.evadpakk === '1' ? ` ${_t('· évadcsomag')}` : ''),
      downloads: Number(x.pontos_talalat) || 0,
    }));
}

/** Letöltés: SRT közvetlenül, vagy ZIP-ből (évadcsomagnál a kért rész fájlja); a kódolást felismerjük. */
async function feDownload(res) {
  const key = 'sub:fe:' + res.fe.id + (res.fe.pack ? `:${res.fe.season}x${res.fe.episode}` : '');
  const cached = await api.kvGet?.(key).catch(() => null);
  if (cached?.text) return cached.text;
  const url = `${FE}?action=letolt&fnev=${res.fe.fnev}&felirat=${encodeURIComponent(res.fe.id)}`;
  const r = await api.requestBytes(url, { 'User-Agent': UA });
  if (r.status >= 400) throw new Error(`${_t('A felirat nem tölthető le (HTTP {status}).', { status: r.status })}`);
  const text = bytesToText(await pickFromZip(new Uint8Array(r.bytes), res.fe));
  api.kvSet?.(key, { text, at: Date.now() })?.catch?.(() => {});
  return text;
}

/**
 * Ha a letöltés ZIP: a benne lévő .srt / .vtt közül a kért részé (évadcsomagnál kötelezően), különben
 * az első. Nem ZIP: maga a felirat. → bájtok
 */
const NUM_WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen', 'twenty'];
/**
 * A rész felismerése egy csomagbeli fájlnévben, a legbiztosabbtól a lazábbig: S01E02 / 1x02, majd
 * E02 / Ep 2 / Episode 2 / Part 2, „Episode.Two”, végül a név végi „- 02”.
 */
function episodeMatchers(season, episode) {
  const n = `0*${episode}(?!\\d)`;
  const out = [new RegExp(`(?:s0*${season}[ ._-]?e${n}|\\b${season}x${n})`, 'i'), new RegExp(`(?:^|[^a-z])(?:e|ep|episode|part|rész)[ ._-]*${n}`, 'i')];
  out.push(new RegExp(`(?:^|\\D)0*${episode}\\.\\s*rész`, 'i')); // „2. rész”
  if (NUM_WORDS[episode]) out.push(new RegExp(`(?:episode|ep|part)[ ._-]*${NUM_WORDS[episode]}(?![a-z])`, 'i'));
  out.push(new RegExp(`[ ._-]-?[ ._-]*${n}[ ._-]*(?:\\[[^\\]]*\\])?\\.(srt|vtt)$`, 'i'));
  return out;
}

async function pickFromZip(bytes, { season = 0, episode = 0, pack = false } = {}) {
  if (!isZip(bytes)) return bytes;
  const files = (await unzip(bytes, (p) => /\.(srt|vtt|sub|txt)$/i.test(p))).filter((f) => /\.(srt|vtt)$/i.test(f.name));
  if (!files.length) throw new Error(_t('A letöltött csomagban nincs .srt felirat.'));
  let hit = null;
  if (episode) {
    const want = season || 1;
    // a fájlnév évadjelölése (S02E…, 2x…, Season 2, 2. évad) – ha van
    const seasonOf = (name) => {
      // (S02E02 · önálló S2 · 2x02 · Season 2 · 2. évad)
      const m = /s0*(\d{1,2})[ ._-]?e\d|\bs0*(\d{1,2})\b|\b(\d{1,2})x\d{1,3}\b|season[ ._-]*0*(\d{1,2})|(\d{1,2})\.\s*évad/i.exec(name);
      return m ? Number(m[1] || m[2] || m[3] || m[4] || m[5]) : 0;
    };
    // a lazább (csak részszámos) mintáknál a más évadot jelölő fájl nem jöhet szóba
    const sameSeason = files.filter((f) => [0, want].includes(seasonOf(f.name)));
    episodeMatchers(want, episode).some((rx, i) => (hit = (i === 0 ? files : sameSeason).find((f) => rx.test(f.name))));
  }
  hit ||= pack ? null : files[0];
  if (!hit) throw new Error(`${_t('Az évadcsomagban nincs felirat a(z) {season}. évad {episode}. részéhez.', { season, episode })}`);
  return hit.bytes;
}

// ---------------------------------------------------------------------------
// SubDL (subdl.com) – ingyenes API-kulccsal; sok nyelv, magyar is. A feliratok ZIP-ben jönnek.
// ---------------------------------------------------------------------------
const SDL = 'https://api.subdl.com/api/v1/subtitles';
const SDL_LANG = (l) => String(l).toUpperCase();
const sdlKey = () => (store.settings.subdlKey || '').trim();

async function sdlSearch(ch, lang) {
  const { item, ep } = ch.vod;
  const p = new URLSearchParams({ api_key: sdlKey(), film_name: item.title, languages: SDL_LANG(lang), subs_per_page: '30' });
  if (ep) {
    p.set('type', 'tv');
    p.set('season_number', String(ep.season || 1));
    p.set('episode_number', String(ep.episode));
  } else {
    p.set('type', 'movie');
    if (item.year) p.set('year', String(item.year));
  }
  const r = await api.request({ url: `${SDL}?${p}`, headers: { 'User-Agent': UA } });
  let j = {};
  try {
    j = JSON.parse(r.text);
  } catch {}
  if (r.status === 403 || r.status === 401) throw new Error(_t('Érvénytelen SubDL API-kulcs. Ellenőrizd a Beállításokban.'));
  if (r.status === 429) throw new Error(_t('SubDL: túl sok kérés – várj egy kicsit.'));
  if (r.status >= 400) throw new Error(`SubDL: ${j.error || j.message || 'HTTP ' + r.status}`);
  if (j.status === false) {
    // „nincs ilyen cím / nincs felirat” = üres találat; minden más valódi hiba (a felület kiírja)
    if (!j.error || /not found|can.?t find|no (subtitle|result|movie|show)|nincs/i.test(j.error)) return [];
    throw new Error(`${_t('SubDL: {error}', { error: j.error })}`);
  }
  return (j.subtitles || [])
    .filter((x) => x.url)
    .map((x) => ({
      src: 'sdl',
      sdl: { url: x.url, season: ep?.season || 0, episode: ep?.episode || 0, pack: !!x.full_season },
      lang,
      release: x.release_name || x.name || _t('Felirat'),
      hi: !!x.hi,
      downloads: 0,
    }));
}

async function sdlDownload(res) {
  const key = 'sub:sdl:' + res.sdl.url + (res.sdl.episode ? `:${res.sdl.season}x${res.sdl.episode}` : '');
  const cached = await api.kvGet?.(key).catch(() => null);
  if (cached?.text) return cached.text;
  // a letöltési cím a SubDL saját tárhelyére mutat (relatív útvonal)
  if (!/^\/subtitle\/[\w.-]+$/.test(res.sdl.url)) throw new Error(_t('Érvénytelen SubDL-letöltési cím.'));
  const r = await api.requestBytes('https://dl.subdl.com' + res.sdl.url, { 'User-Agent': UA });
  if (r.status >= 400) throw new Error(`${_t('A felirat nem tölthető le (HTTP {status}).', { status: r.status })}`);
  const text = bytesToText(await pickFromZip(new Uint8Array(r.bytes), res.sdl));
  api.kvSet?.(key, { text, at: Date.now() })?.catch?.(() => {});
  return text;
}

/** A bekapcsolt feliratforrások neve (a CC-menü megjegyzéséhez). */
const SOURCE_NAME = { fe: 'Feliratok.eu', os: 'OpenSubtitles', sdl: 'SubDL' };
const activeSources = () => [feOn() && SOURCE_NAME.fe, (store.settings.osApiKey || '').trim() && SOURCE_NAME.os, sdlKey() && SOURCE_NAME.sdl].filter(Boolean);

/** Feliratok keresése az aktuális filmhez / részhez – minden bekapcsolt forrásból. */
export async function searchSubs(ch, lang) {
  const tasks = [];
  // (a Feliratok.eu csak magyar és angol feliratot ad)
  if (feOn() && (lang === 'hu' || lang === 'en')) {
    const { item, ep } = ch.vod;
    // (a hibát nem nyeljük el: ha ez az egyetlen forrás, a felhasználó a valódi okot látja, ne „nincs felirat”-ot)
    tasks.push(
      (ep ? feSearchEpisode(item, ep, lang) : feSearchMovie(item, lang)).catch((err) => {
        console.warn('Feliratok.eu', err);
        throw err;
      })
    );
  }
  if ((store.settings.osApiKey || '').trim()) tasks.push(osSearch(ch, lang));
  if (sdlKey()) tasks.push(sdlSearch(ch, lang));
  if (!tasks.length) throw new Error(_t('Nincs bekapcsolt feliratforrás (Beállítások → Feliratok és információk → Magyar információk és feliratok).'));
  const parts = await Promise.allSettled(tasks);
  const ok = parts.filter((p) => p.status === 'fulfilled').flatMap((p) => p.value);
  if (!ok.length && parts.some((p) => p.status === 'rejected')) throw parts.find((p) => p.status === 'rejected').reason;
  // a Feliratok.eu találatai elöl (napi keret nélkül tölthetők le), utána az OpenSubtitles és a SubDL
  return ok.slice(0, 40);
}

/** OpenSubtitles-keresés. */
async function osSearch(ch, lang) {
  const { item, ep } = ch.vod;
  const p = { languages: lang, query: item.title };
  if (ep) {
    p.type = 'episode';
    if (ep.season) p.season_number = ep.season;
    p.episode_number = ep.episode;
  } else {
    p.type = 'movie';
    if (item.year) p.year = item.year;
  }
  // Az API ajánlása: ábécérendbe rendezett, kisbetűs paraméterek (különben átirányít).
  const qs = Object.keys(p)
    .sort()
    .map((k) => `${k}=${encodeURIComponent(String(p[k]).toLowerCase())}`)
    .join('&');
  const j = await osReq('GET', '/subtitles?' + qs);
  const list = (j.data || [])
    .map((d) => {
      const a = d.attributes || {};
      return {
        src: 'os',
        fileId: a.files?.[0]?.file_id,
        fileName: a.files?.[0]?.file_name || a.release || '',
        lang: a.language,
        release: a.release || a.files?.[0]?.file_name || _t('Felirat'),
        downloads: a.download_count || 0,
        hi: !!a.hearing_impaired,
        ai: !!(a.ai_translated || a.machine_translated),
        year: a.feature_details?.year || 0,
        title: a.feature_details?.title || '',
      };
    })
    .filter((x) => x.fileId);
  // Az évben egyező, nem gépi fordítású, sokat letöltött feliratok elöl.
  const score = (x) => (item.year && x.year === item.year ? 1e7 : 0) + (x.ai ? 0 : 1e6) + x.downloads;
  return list.sort((a, b) => score(b) - score(a)).slice(0, 25);
}

async function downloadText(fileId) {
  const cached = await api.kvGet?.('sub:' + fileId).catch(() => null);
  if (cached?.text) return cached.text;
  if (!store.settings.osToken) await osLogin();
  const j = await osReq('POST', '/download', { file_id: fileId }, { auth: true });
  if (!j.link) throw new Error(j.message || _t('A letöltési hivatkozás nem érkezett meg.'));
  const r = await api.request({ url: j.link, headers: { 'User-Agent': UA } });
  if (r.status >= 400) throw new Error(`${_t('A feliratfájl nem tölthető le (HTTP')} ` + r.status + ').');
  api.kvSet?.('sub:' + fileId, { text: r.text, at: Date.now() })?.catch?.(() => {});
  if (typeof j.remaining === 'number') toast(`${_t('Felirat letöltve – ma még {remaining} letöltésed van.', { remaining: j.remaining })}`, { timeout: 5000 });
  return r.text;
}

async function useResult(video, ch, res) {
  const text = res.src === 'fe' ? await feDownload(res) : res.src === 'sdl' ? await sdlDownload(res) : await downloadText(res.fileId);
  // a letöltés közben másik videóra válthattak: a régi felirat ne kerüljön az újra
  if (player.channel !== ch) return;
  const cues = parseSubs(text);
  if (!cues.length) throw new Error(_t('A feliratfájl üres vagy nem értelmezhető.'));
  const label = `${languageName(res.lang)} – ${res.release}`;
  apply(video, cues, label);
  // Megjegyezzük ehhez a filmhez / részhez.
  const p = store.profile;
  p.vodSubs ||= {};
  p.vodSubs[ch.vod.key] = { src: res.src || 'os', fileId: res.fileId, fe: res.fe, sdl: res.sdl, lang: res.lang, release: res.release };
  store.save();
}

/** Felirat betöltése szövegből (helyi fájl, behúzott fájl). */
export function applyText(video, text, label) {
  const cues = parseSubs(text);
  if (!cues.length) {
    toast(_t('A fájl nem tartalmaz feliratot.'));
    return false;
  }
  apply(video, cues, label);
  return true;
}

// .srt / .vtt fájl ráhúzása a lejátszóra
{
  const root = document.getElementById('player');
  root.addEventListener('dragover', (e) => {
    if (player.channel?.vod && [...(e.dataTransfer?.items || [])].some((i) => i.kind === 'file')) e.preventDefault();
  });
  root.addEventListener('drop', async (e) => {
    const f = e.dataTransfer?.files?.[0];
    if (!f || !player.channel?.vod) return;
    e.preventDefault();
    if (!/\.(srt|vtt|txt)$/i.test(f.name)) return toast(_t('Csak .srt vagy .vtt feliratfájl húzható ide.'));
    applyText(document.getElementById('video'), await f.text(), f.name);
  });
}

// ---------------------------------------------------------------------------
// Feliratfájlok a videó mellett (pl. Film.mkv mellett Film.hu.srt) – a saját médiatárhoz
// ---------------------------------------------------------------------------
const isHu = (n) => /[._ -](hu|hun|hungarian|magyar)\b/i.test(n);

function urlToPath(u) {
  const x = new URL(u);
  let p = decodeURIComponent(x.pathname);
  if (x.host) return '\\\\' + x.host + p.replace(/\//g, '\\');
  if (/^\/[a-zA-Z]:/.test(p)) p = p.slice(1);
  return p;
}

async function findSidecars(url) {
  try {
    if (url.startsWith('file:')) {
      return api.sidecarSubs ? await api.sidecarSubs(urlToPath(url)) : [];
    }
    if (/^https?:/.test(url) && !/\.m3u8(\?|$)/i.test(url)) {
      // Hálózati cím: a leggyakoribb elnevezések kipróbálása (nem létező fájl esetén csendben kihagyja).
      const base = url.split(/[?#]/)[0].replace(/\.[^./]+$/, '');
      // a felület feliratnyelvei (a gyakori 2 és 3 betűs jelöléssel), plusz a jelöletlen fájl
      const SUFFIX = { hu: ['hu', 'hun'], en: ['en', 'eng'], de: ['de', 'ger', 'deu'], fr: ['fr', 'fre', 'fra'], es: ['es', 'spa'] };
      const tags = [...new Set(SUB_LANGS.flatMap((l) => SUFFIX[l] || [l]))];
      const names = [...tags.slice(0, 2).map((x) => `.${x}.srt`), '.srt', ...tags.slice(2).map((x) => `.${x}.srt`)];
      const res = await Promise.all(
        names.map(async (ext) => {
          try {
            const r = await api.request({ url: base + ext });
            return r.status < 300 && r.text.includes('-->') ? { name: decodeURIComponent(base.split('/').pop()) + ext, text: r.text } : null;
          } catch {
            return null;
          }
        })
      );
      return res.filter(Boolean);
    }
  } catch {}
  return [];
}

// ---------------------------------------------------------------------------
// Kapcsolódás a lejátszóhoz
// ---------------------------------------------------------------------------
player.subsHooks = {
  /** Új film / rész indulásakor: korábban választott felirat, vagy automatikus keresés. */
  async onStart(ch, video) {
    clearSubs(video);
    applySize();
    if (!ch?.vod) return;
    state.key = ch.vod.key;
    state.results = null;
    state.sidecars = [];
    const saved = store.profile.vodSubs?.[ch.vod.key];
    try {
      // A videó melletti feliratfájlok (a menüben is megjelennek).
      // (csak a saját médiatárnál, ill. helyi fájlnál – a nyilvános listák szervereit nem terheljük)
      const url0 = ch.streams[0]?.url || '';
      if (ch.vod.item?.lib === 'own' || url0.startsWith('file:')) state.sidecars = await findSidecars(url0);
      if (player.channel !== ch) return;
      if (saved?.sidecar) {
        const sc = state.sidecars.find((x) => x.name === saved.sidecar);
        if (sc) return void applyText(video, sc.text, sc.name);
      } else if (saved) {
        await useResult(video, ch, saved);
        return;
      }
      if (state.sidecars.length) {
        // a beállított nyelv, utána a többi feliratnyelv, végül az első fájl
        const sc = [subsLangPref(), ...SUB_LANGS].map((l) => state.sidecars.find((x) => fileIsLang(l)(x.name))).find(Boolean) || state.sidecars[0];
        applyText(video, sc.text, sc.name);
        return;
      }
      const s = store.settings;
      if (s.subsAuto && (feOn() || sdlKey() || (s.osApiKey && s.osUser))) {
        const list = await searchSubs(ch, subsLangPref());
        const best = list.find((x) => !x.ai) || list[0];
        if (best && player.channel === ch) await useResult(video, ch, best);
        else if (!best) toast(_t('Nem található {lang} felirat ehhez a címhez.', { lang: languageName(subsLangPref()) }));
      }
    } catch (err) {
      console.warn('Felirat', err);
      if (saved || store.settings.subsAuto) toast(`${_t('Felirat:')} ` + (err.message || err), { timeout: 6000 });
    }
  },

  clear(video) {
    clearSubs(video);
  },

  /**
   * Új adás / fájl sávjai ismertté váltak: a profil kedvenc hangsávjának és beágyazott feliratának
   * automatikus kiválasztása (élő adásnál és filmnél is). Adásonként csak egyszer.
   */
  onTracks(ch, video) {
    const eng = player.engine;
    if (!ch) return;
    // A hang- és a feliratsávok külön eseménnyel is megérkezhetnek, ezért külön jegyezzük.
    const key = (ch.id || '') + '|' + (player.stream?.url || '');
    const audio = eng.audioTracks();
    const texts = eng.textTracks();
    const p = store.profile;
    const match = langMatcher;
    // Hangsáv
    if (audio.length && state.autoAudio !== key) {
      state.autoAudio = key;
      const am = match(p.prefAudio);
      const t = am && audio.length > 1 && audio.find((x) => am(x.lang) || am(x.label));
      if (t && t.index !== eng.audioTrack) eng.setAudioTrack(t.index);
    }
    // Beágyazott felirat (csak ha nincs már saját / letöltött felirat bekapcsolva)
    if (texts.length && state.autoText !== key) {
      state.autoText = key;
      // 'auto' (alapértelmezés): a fájlban alapértelmezettnek / kényszerítettnek jelölt felirat –
      // pl. a magyar feliratos kiadásoknál; 'hu' / 'en': az adott nyelvű, ha van.
      const pref = p.prefSubs || 'auto';
      const sm = match(pref);
      const t =
        !state.cues.length &&
        (sm ? texts.find((x) => sm(x.lang) || sm(x.label)) : pref === 'auto' ? texts.find((x) => x.forced) || texts.find((x) => x.default) : null);
      // (a lejátszási híd a saját kezdő feliratát már bekapcsolta – azt nem írjuk felül)
      if (t && !(eng.bridge && eng.textTrack)) eng.setTextTrack(t.id);
    }
  },

  /** A lejátszó „Hang és felirat” menüje – élő adásnál és filmnél / sorozatnál is. */
  render(menu, ch, video) {
    const eng = player.engine;
    const isVod = !!ch?.vod;
    const draw = () => {
      const s = store.settings;
      const res = state.results;
      const audio = eng.audioTracks();
      const curA = eng.audioTrack;
      const texts = eng.textTracks();
      const curT = eng.textTrack;
      const anySub = state.cues.length || curT;
      menu.innerHTML = `
        <h4>${_t('Hangsáv')}</h4>
        ${audio.length > 1
            ? audio.map((t) => `<button class="menu-item ${t.index === curA ? 'sel' : ''}" data-s="audio" data-i="${t.index}">${esc(t.label)}</button>`).join('')
            : `<p class="muted small">${audio.length === 1 ? esc(audio[0].label) + ' – ' : ''}${isVod ? _t('Ebben a videóban csak egy hangsáv van.') : _t('Ebben az adásban csak egy hangsáv van.')}</p>`}
        ${nightAvailable() ? `<button class="menu-item ${nightOn() ? 'sel' : ''}" data-s="night"><span>${_t('Éjszakai hang')}<small>${_t('halk párbeszéd kiemelése, a hangos részek tompítása')}</small></span></button>` : ''}
        <h4>${_t('Felirat')}</h4>
        <button class="menu-item ${anySub ? '' : 'sel'}" data-s="off">${_t('Kikapcsolva')}</button>
        ${state.cues.length ? `<button class="menu-item sel" data-s="noop">${esc(state.label)}</button>` : ''}
        ${texts.length ? `${texts.map((t) => `<button class="menu-item ${t.id === curT ? 'sel' : ''}" data-s="embedded" data-id="${esc(t.id)}">${esc(t.label)} <small class="muted">(${isVod ? _t('a fájlban') : _t('az adásban')})</small></button>`).join('')}` : ''}
        ${!texts.length && !isVod ? `<p class="muted small">${_t('Ez az adás nem küld feliratot.')}</p>` : ''}
        ${isVod && state.sidecars?.length
            ? `<h4>${_t('A videó mellett')}</h4>${state.sidecars
                .map((x, i) => `<button class="menu-item" data-s="side" data-i="${i}">${esc(x.name)}</button>`)
                .join('')}`
            : ''}
        ${isVod
            ? `${
          activeSources().length
            ? `<button class="menu-item sub-search" data-s="search"><span>${_t('Felirat keresése')}<small>${_t('Jelenleg aktív adatbázisok: {esc}', { esc: esc(activeSources().join(", ")) })}</small></span></button>`
            : `<p class="muted small">${_t('Nincs bekapcsolt feliratforrás – Beállítások → Feliratok és információk.')}</p>`
        }
        ${state.busy ? `<p class="muted small">${_t('Keresés…')}</p>` : ''}
        ${
          res
            ? res.list.length
              ? res.list
                  .map(
                    (x, i) => `<button class="menu-item sub-hit" data-s="pick" data-i="${i}">
                      <span><b>${esc(x.release)}</b><small>${esc(languageName(x.lang))} · ${esc(SOURCE_NAME[x.src] || x.src)}${x.src === 'os' ? ` · ${esc((Number(x.downloads) || 0).toLocaleString(LOCALE))} ${_t('letöltés')}` : ''}${x.hi ? ` ${_t('· hallássérülteknek')}` : ''}${x.ai ? ` ${_t('· gépi fordítás')}` : ''}</small></span></button>`
                  )
                  .join('')
              : `<p class="muted small">${_t('Nem található felirat ehhez a címhez ({langs}).', { langs: SUB_LANGS.map(languageName).join(', ') })}</p>`
            : ''
        }`
            : ''}
        <h4>${_t('Beállítások')}</h4>
        ${isVod && api.caps.files ? `<button class="menu-item" data-s="file">${_t('Felirat betöltése fájlból (.srt, .vtt)')}</button>` : ''}
        ${state.cues.length
            ? `<div class="sub-adjust">
          <span>${_t('Időeltolás')}</span>
          <button class="btn small" data-s="off-" title="${_t('Korábban')}">${_t('−0,5 mp')}</button>
          <b class="sub-offset">${(state.offset >= 0 ? '+' : '') + state.offset.toFixed(1).replace('.', ',')} ${_t('mp</b>')}
          <button class="btn small" data-s="off+" title="${_t('Később')}">${_t('+0,5 mp')}</button>
        </div>`
            : ''}
        <div class="sub-adjust">
          <span>${_t('Méret')}</span>
          ${['small', 'normal', 'large', 'huge']
            .map((z, i) => `<button class="btn small ${((s.subsSize || 'normal') === z) ? 'primary' : ''}" data-s="size" data-z="${z}">${[_t('Kicsi'), _t('Közepes'), _t('Nagy'), _t('Óriás')][i]}</button>`)
            .join('')}
        </div>`;
    };
    draw();
    menu.onclick = async (e) => {
      const b = e.target.closest('[data-s]');
      if (!b) return;
      e.stopPropagation();
      const a = b.dataset.s;
      try {
        if (a === 'night') {
          setNight(video, !nightOn());
          store.profile.nightAudio = nightOn();
          store.save();
          toast(nightOn() ? _t('Éjszakai hang bekapcsolva') : _t('Éjszakai hang kikapcsolva'));
          draw();
        } else if (a === 'audio') {
          eng.setAudioTrack(Number(b.dataset.i));
          toast(`${_t('Hangsáv:')} ` + b.textContent.trim());
          draw();
        } else if (a === 'off') {
          clearSubs(video);
          eng.setTextTrack('');
          if (isVod && store.profile.vodSubs) delete store.profile.vodSubs[ch.vod.key];
          store.save();
          draw();
        } else if (a === 'embedded') {
          // Beágyazott felirat: a saját / letöltött felirat ilyenkor kikapcsol.
          clearSubs(video);
          eng.setTextTrack(b.dataset.id);
          draw();
        } else if (a === 'search') {
          state.busy = true;
          state.results = null;
          draw();
          // egy gomb: a beállított nyelv találatai elöl, utána a másik nyelvéi
          const pref = subsLangPref();
          const parts = await Promise.allSettled([pref, ...SUB_LANGS.filter((l) => l !== pref)].map((l) => searchSubs(ch, l)));
          if (parts.every((p) => p.status === 'rejected')) throw parts[0].reason;
          const list = parts.flatMap((p) => (p.status === 'fulfilled' ? p.value : []));
          state.results = { lang: pref, list };
          state.busy = false;
          draw();
          menu.querySelector('.sub-hit')?.focus();
        } else if (a === 'side') {
          const sc = state.sidecars[Number(b.dataset.i)];
          eng.setTextTrack('');
          applyText(video, sc.text, sc.name);
          const p = store.profile;
          p.vodSubs ||= {};
          p.vodSubs[ch.vod.key] = { sidecar: sc.name };
          store.save();
          menu.hidden = true;
        } else if (a === 'pick') {
          const x = state.results.list[Number(b.dataset.i)];
          b.disabled = true;
          b.querySelector('small').textContent = _t('Letöltés…');
          eng.setTextTrack('');
          await useResult(video, ch, x);
          menu.hidden = true;
        } else if (a === 'file') {
          const f = await api.openFile([{ name: _t('Felirat'), extensions: ['srt', 'vtt', 'txt'] }]);
          if (!f) return;
          const cues = parseSubs(f.text);
          if (!cues.length) return toast(_t('A fájl nem tartalmaz feliratot.'));
          eng.setTextTrack('');
          apply(video, cues, f.name);
          menu.hidden = true;
        } else if (a === 'off-' || a === 'off+') {
          state.offset += a === 'off+' ? 0.5 : -0.5;
          render(video);
          draw();
        } else if (a === 'size') {
          store.set('subsSize', b.dataset.z);
          applySize();
          draw();
        }
        player.renderControls();
      } catch (err) {
        state.busy = false;
        draw();
        toast(`${_t('Felirat:')} ` + (err.message || err), { timeout: 7000 });
      }
    };
  },
};

// ---------------------------------------------------------------------------
// Beállítások
// ---------------------------------------------------------------------------
export function renderHuSettings(box) {
  const s = store.settings;
  box.innerHTML = `<h2>${_t('Magyar információk és feliratok')} <button class="help-link" data-help="hu-info" title="${_t('Súgó')}">?</button></h2>
    <label class="setting"><span>${_t('<b>Információk és borítóképek letöltése</b>')}<small>${_t('Filmek, sorozatok és csatornák címe, leírása (magyarul, ennek híján angolul), borítóképe, műfaja, szereplői – Wikipédia / Wikidata, AniList (anime), TVmaze (sorozat) kulcs nélkül, vagy a TMDB-ből.')}</small></span>
      <input type="checkbox" class="switch" data-hs="huInfo" ${s.huInfo !== false ? 'checked' : ''} /></label>
    <label class="setting col"><span>${_t('<b>TMDB API-kulcs</b>')} <small>${_t('(nem kötelező) – gazdagabb magyar leírás és értékelés. Ingyenes: themoviedb.org → Beállítások → API.')}</small></span>
      <input class="input" type="password" autocomplete="off" data-ht="tmdbKey" placeholder="${_t('API-kulcs (v3) vagy olvasási token (v4)')}" /></label>
    <label class="setting col"><span>${_t('<b>OMDb API-kulcs</b>')} <small>${_t('(nem kötelező) – IMDb-adatokon alapuló borítóképek a „Cím és borító” keresőben. Ingyenes kulcs (napi 1000 kérés): omdbapi.com → API Key.')}</small></span>
      <input class="input" type="password" autocomplete="off" data-ht="omdbKey" placeholder="${_t('API-kulcs')}" /></label>
    <h3>Feliratok.eu</h3>
    <label class="setting"><span>${_t('<b>Feliratok.eu feliratok</b>')}<small>${_t('Magyar feliratoldal: magyar és angol feliratok filmekhez és sorozatokhoz, fiók, kulcs és napi korlát nélkül. A sorozatoknál évadcsomagból is kiveszi a kért részt. A kereséskor csak a film / sorozat címe és a rész száma megy el a feliratok.eu-nak.')}</small></span>
      <input type="checkbox" class="switch" data-hs="subsFeliratok" ${s.subsFeliratok !== false ? 'checked' : ''} /></label>
    <h3>SubDL <small class="muted">${_t('(nem kötelező)')}</small></h3>
    <p class="muted small">${_t('További magyar és angol feliratok (filmek, sorozatok). Ingyenes kulcs: regisztrálj a')} <a href="#" data-ext="https://subdl.com/">subdl.com</a> ${_t('oldalon, majd a profilodban (<i>API</i>) másold ki a kulcsot. Fiók-jelszó nem kell, a kulcs csak ezen az eszközön tárolódik, és csak a subdl.com felé megy.')}</p>
    <label class="setting col"><span>${_t('<b>SubDL API-kulcs</b>')}</span><input class="input" type="password" autocomplete="off" data-ht="subdlKey" /></label>
    <h3>${_t('OpenSubtitles feliratok')} <small class="muted">${_t('(nem kötelező)')}</small></h3>
    <p class="muted small">${_t('Filmekhez és sorozatokhoz magyar és angol felirat – a Feliratok.eu mellett további találatok. Ingyenes fiók és API-kulcs kell: regisztrálj az')} <a href="#" data-ext="https://www.opensubtitles.com/">opensubtitles.com</a> ${_t('oldalon, majd a profilodban az <i>API consumers</i> résznél hozz létre egy kulcsot. A keresés a kulccsal, a letöltés bejelentkezéssel működik (ingyenes fiókkal napi korláttal).')}</p>
    <label class="setting col"><span>${_t('<b>API-kulcs</b>')}</span><input class="input" type="password" autocomplete="off" data-ht="osApiKey" /></label>
    <div class="form-row">
      <label class="setting col"><span>${_t('<b>Felhasználónév</b>')}</span><input class="input" autocomplete="off" data-ht="osUser" /></label>
      <label class="setting col"><span>${_t('<b>Jelszó</b>')}</span><input class="input" type="password" autocomplete="off" data-ht="osPass" /></label>
    </div>
    <p class="muted small">${_t('Az adatok csak ezen az eszközön tárolódnak, és csak az opensubtitles.com felé kerülnek elküldésre.')}</p>
    <div class="inline"><button class="btn small" data-hb="test">${_t('Bejelentkezés kipróbálása')}</button><span class="muted small os-status"></span></div>
    <label class="setting"><span>${_t('<b>Felirat automatikus keresése</b>')}<small>${_t('Film / rész indításakor a legjobb felirat automatikusan betöltődik (elsőként a Feliratok.eu-ról; az OpenSubtitles a letöltési keretet használja).')}</small></span>
      <input type="checkbox" class="switch" data-hs="subsAuto" ${s.subsAuto ? 'checked' : ''} /></label>
    <label class="setting"><span>${_t('<b>Felirat nyelve automatikus kereséskor</b>')}</span>
      <select data-hsel="subsLang">${SUB_LANGS.map((l) => `<option value="${l}" ${subsLangPref() === l ? 'selected' : ''}>${esc(languageName(l))}</option>`).join('')}</select></label>
    <h3>${_t('Hangsáv és felirat – a(z) {esc} profil kedvencei', { esc: esc(store.profile.name) })}</h3>
    <p class="muted small">${_t('Ha egy adásban, filmben vagy saját videóban több hangsáv vagy beágyazott felirat van, a lejátszó magától ezt választja. Lejátszás közben a <b>CC</b> gombbal vagy a <b>C</b> billentyűvel bármikor válthatsz.')}</p>
    <label class="setting"><span>${_t('<b>Előnyben részesített hangsáv</b>')}</span>
      <select data-hp="prefAudio">${[['orig', _t('Az adás alapértelmezése')], ...SUB_LANGS.map((l) => [l, esc(languageName(l))])]
        .map(([v, l]) => `<option value="${v}" ${(store.profile.prefAudio || 'orig') === v ? 'selected' : ''}>${l}</option>`)
        .join('')}</select></label>
    <label class="setting"><span>${_t('<b>Beágyazott felirat automatikusan</b>')}</span>
      <select data-hp="prefSubs">${[['auto', _t('A fájl alapértelmezése (pl. feliratos kiadásnál)')], ['off', _t('Kikapcsolva')], ...SUB_LANGS.map((l) => [l, _t('{lang}, ha van', { lang: esc(languageName(l)) })])]
        .map(([v, l]) => `<option value="${v}" ${(store.profile.prefSubs || 'auto') === v ? 'selected' : ''}>${l}</option>`)
        .join('')}</select></label>
    ${nightAvailable()
        ? `<label class="setting"><span>${_t('<b>Éjszakai hang</b>')}<small>${_t('A hangos részek (zene, reklám, robbanás) tompítása, a halk párbeszéd kiemelése – ha a többiek már alszanak.')}</small></span>
      <input type="checkbox" class="switch" data-hpb="nightAudio" ${store.profile.nightAudio ? 'checked' : ''} /></label>`
        : ''}`;
  // a kulcsok és jelszavak csak tulajdonságként kerülnek a mezőkbe (nem HTML-attribútumként, amit egy téma CSS-e vizsgálhatna)
  box.querySelectorAll('[data-ht]').forEach((i) => (i.value = s[i.dataset.ht] || ''));
  if (box.dataset.bound) return;
  box.dataset.bound = '1';
  box.addEventListener('change', (e) => {
    e.stopPropagation();
    const t = e.target;
    if (t.dataset.hs) store.set(t.dataset.hs, t.checked);
    else if (t.dataset.hsel) store.set(t.dataset.hsel, t.value);
    else if (t.dataset.hp) {
      store.profile[t.dataset.hp] = t.value;
      store.save();
    } else if (t.dataset.hpb) {
      store.profile[t.dataset.hpb] = t.checked;
      store.save();
    } else if (t.dataset.ht) {
      store.set(t.dataset.ht, t.value.trim());
      if (t.dataset.ht.startsWith('os')) store.set('osToken', '');
    }
  });
  box.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-hb]');
    if (!b) return;
    e.stopPropagation();
    const out = box.querySelector('.os-status');
    // a még el nem mentett mezők mentése
    box.querySelectorAll('[data-ht]').forEach((i) => store.set(i.dataset.ht, i.value.trim()));
    out.textContent = _t('Bejelentkezés…');
    try {
      const u = await osLogin();
      out.textContent = `${_t('Sikeres bejelentkezés')}${u.allowed_downloads ? ` ${_t('– napi {allowed_downloads} letöltés', { allowed_downloads: u.allowed_downloads })}` : ''}${u.level ? ` (${u.level})` : ''}.`;
    } catch (err) {
      out.textContent = `${_t('Hiba:')} ` + (err.message || err);
    }
  });
}
