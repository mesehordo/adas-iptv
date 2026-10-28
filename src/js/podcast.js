// Podcastok – az adatok: feliratkozások (profilonként), a műsorok RSS-folyamai, az epizódok állapota (hol tartasz,
// meghallgatva, kedvenc, letöltve), a lejátszási sor, az új epizódok, az előzmények; keresés, toplista, OPML.
// A lejátszás a podplayer.js-ben, a felület a podcastpage.js-ben.
import { store } from './store.js';
import { api } from './api.js';
import { bus, debounce } from './util.js';
import { _t } from './i18n.js';

/** A profil podcast-adatai (első használatkor jönnek létre). */
export function pod(p = store.profile) {
  const d = (p.pod ||= {});
  d.subs ||= []; // [{ url, title, author, image, added, set: { speed, skipIntro, skipOutro, notify, autoDl, keep } }]
  d.eps ||= {}; // epizódkulcs → { pos, dur, played, fav, dl: { path, url, size } }
  d.queue ||= []; // epizód-pillanatképek (a sor sorrendjében)
  d.inbox ||= []; // új epizódok (pillanatképek)
  d.hist ||= []; // meghallgatott / elkezdett epizódok (legújabb elöl)
  d.favs ||= []; // kedvenc epizódok (pillanatképek)
  d.seen ||= {}; // (régi tárolás: folyam címe → idő; most a feliratkozás „seen” mezője)
  d.stats ||= {}; // folyam címe → hallgatott másodperc
  d.cfg ||= {};
  return d;
}
/** Beállítások (profilonként) az alapértékekkel. */
export const podCfg = () => ({ refreshHours: 6, skipBack: 10, skipFwd: 30, speed: 1, continuous: true, autoDelete: true, markAt: 0.95, keepPlayed: true, ...pod().cfg });
export const savePod = debounce(() => store.save(), 800);

// ---------------------------------------------------------------------------
// Kulcsok, pillanatképek
// ---------------------------------------------------------------------------
function hash(s) {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}
export const epKey = (feedUrl, guid, url) => hash(feedUrl) + '.' + hash(guid || url || '');
/** Pillanatkép: ennyi kell a sorhoz / előzményekhez akkor is, ha a folyam még nem töltődött be. */
export const snap = (ep) => ({ key: ep.key, feed: ep.feed, feedTitle: ep.feedTitle || '', title: ep.title, url: ep.url, type: ep.type || '', image: ep.image || '', dur: ep.dur || 0, pub: ep.pub || 0 });
export const epState = (key) => pod().eps[key] || null;
// (a kulcsok külső adatból – folyamcím, epizód-azonosító – jönnek: az objektum beépített tulajdonságai nem írhatók felül)
const BAD_KEY = new Set(['__proto__', 'constructor', 'prototype']);
export const safeKey = (k) => typeof k === 'string' && k && !BAD_KEY.has(k);
function setState(key, patch, prof = store.profile) {
  if (!safeKey(key)) return;
  const d = pod(prof);
  const s = { ...(d.eps[key] || {}), ...patch };
  for (const k of Object.keys(s)) if (s[k] === undefined || s[k] === null || s[k] === false || s[k] === 0) delete s[k];
  if (Object.keys(s).length) d.eps[key] = s;
  else delete d.eps[key];
  // (legfeljebb 3000 állapot: a legrégebbi meghallgatottak kiesnek)
  const keys = Object.keys(d.eps);
  if (keys.length > 3000) {
    keys
      .filter((k) => d.eps[k].played && !d.eps[k].fav && !d.eps[k].dl)
      .sort((a, b) => d.eps[a].played - d.eps[b].played)
      .slice(0, keys.length - 3000)
      .forEach((k) => delete d.eps[k]);
  }
  savePod();
  bus.emit('pod-state', key);
}
export const isPlayed = (key) => !!epState(key)?.played;
export const progressOf = (key) => {
  const s = epState(key);
  return s?.pos && s?.dur ? Math.min(1, s.pos / s.dur) : 0;
};
/** prof: a lejátszást indító profil (profilváltáskor a záró pozíció is az övé). */
export function savePos(ep, pos, dur, prof = store.profile) {
  setState(ep.key, { pos: Math.floor(pos), dur: Math.floor(dur || ep.dur || 0) }, prof);
}
export function markPlayed(ep, played = true) {
  setState(ep.key, { played: played ? Date.now() : undefined, pos: played ? undefined : epState(ep.key)?.pos });
  if (played) {
    const d = pod();
    d.inbox = d.inbox.filter((x) => x.key !== ep.key);
    d.queue = d.queue.filter((x) => x.key !== ep.key);
    bus.emit('pod-queue');
  }
}
export function toggleFav(ep) {
  const d = pod();
  const on = !epState(ep.key)?.fav;
  setState(ep.key, { fav: on || undefined });
  d.favs = on ? [snap(ep), ...d.favs.filter((x) => x.key !== ep.key)] : d.favs.filter((x) => x.key !== ep.key);
  return on;
}
export function pushHistory(ep) {
  const d = pod();
  d.hist = [{ ...snap(ep), at: Date.now() }, ...d.hist.filter((x) => x.key !== ep.key)].slice(0, 200);
  savePod();
}
export function addListen(feedUrl, sec, prof = store.profile) {
  if (!safeKey(feedUrl) || !prof) return;
  const d = pod(prof);
  d.stats[feedUrl] = (d.stats[feedUrl] || 0) + sec;
}

// ---------------------------------------------------------------------------
// Lejátszási sor, új epizódok
// ---------------------------------------------------------------------------
export const inQueue = (key) => pod().queue.some((x) => x.key === key);
export function enqueue(ep, { next = false } = {}) {
  const d = pod();
  d.queue = d.queue.filter((x) => x.key !== ep.key);
  if (next) d.queue.unshift(snap(ep));
  else d.queue.push(snap(ep));
  savePod();
  bus.emit('pod-queue');
}
export function dequeue(key) {
  const d = pod();
  d.queue = d.queue.filter((x) => x.key !== key);
  savePod();
  bus.emit('pod-queue');
}
export function moveInQueue(key, delta) {
  const d = pod();
  const i = d.queue.findIndex((x) => x.key === key);
  const j = i + delta;
  if (i < 0 || j < 0 || j >= d.queue.length) return;
  const [x] = d.queue.splice(i, 1);
  d.queue.splice(j, 0, x);
  savePod();
  bus.emit('pod-queue');
}
export function clearInbox(keys = null) {
  const d = pod();
  d.inbox = keys ? d.inbox.filter((x) => !keys.includes(x.key)) : [];
  savePod();
  bus.emit('pod-queue');
}

// ---------------------------------------------------------------------------
// Feliratkozások
// ---------------------------------------------------------------------------
export const subOf = (url) => pod().subs.find((s) => s.url === url) || null;
export const isSubscribed = (url) => !!subOf(url);
export function subscribe(feed) {
  const d = pod();
  if (isSubscribed(feed.url)) return;
  // (a feliratkozáskor meglévő epizódok nem „újak” – csak a később megjelenők: „seen” = a legutóbb látott legújabb epizód ideje)
  const latest = feeds.get(feed.url)?.eps[0]?.pub || 0;
  d.subs.push({ url: feed.url, title: feed.title || feed.url, author: feed.author || '', image: feed.image || '', added: Date.now(), set: {}, seen: latest });
  savePod();
  bus.emit('pod-subs');
  if (!feeds.has(feed.url)) refreshFeed(feed.url).catch(() => {});
}
export function unsubscribe(url) {
  const d = pod();
  d.subs = d.subs.filter((s) => s.url !== url);
  d.inbox = d.inbox.filter((x) => x.feed !== url);
  savePod();
  bus.emit('pod-subs');
}
const SUB_OPTS = new Set(['speed', 'skipIntro', 'skipOutro', 'boost', 'skipSilence', 'notify', 'autoDl']);
export function setSubOpt(url, key, value) {
  const s = subOf(url);
  if (!s || !SUB_OPTS.has(key)) return;
  s.set = { ...(s.set || {}), [key]: value };
  if (value === '' || value === undefined || value === null) delete s.set[key];
  savePod();
}

// ---------------------------------------------------------------------------
// RSS (és Atom) folyamok
// ---------------------------------------------------------------------------
export const feeds = new Map(); // folyam címe → { url, title, author, image, desc, link, eps, at }
const parseDur = (s) => {
  const t = String(s || '').trim();
  if (!t) return 0;
  if (/^\d+(\.\d+)?$/.test(t)) return Math.round(Number(t));
  const p = t.split(':').map(Number);
  if (p.some(isNaN)) return 0;
  return p.reduce((a, b) => a * 60 + b, 0);
};
const text = (el, ...names) => {
  for (const n of names) {
    const x = el.getElementsByTagName(n)[0];
    if (x && x.textContent.trim()) return x.textContent.trim();
  }
  return '';
};
const attr = (el, name, a) => el.getElementsByTagName(name)[0]?.getAttribute(a) || '';
/** Egy RSS 2.0 / iTunes / podcast-névteres (vagy Atom) folyam feldolgozása. */
export function parseFeed(xml, url) {
  const doc = new DOMParser().parseFromString(xml, 'text/xml');
  if (doc.getElementsByTagName('parsererror').length) throw new Error(_t('A podcast-folyam nem olvasható (hibás XML).'));
  const ch = doc.getElementsByTagName('channel')[0] || doc.getElementsByTagName('feed')[0];
  if (!ch) throw new Error(_t('Ez a cím nem podcast-folyam.'));
  const atom = ch.tagName === 'feed';
  // (a csatorna saját adatai – az epizódok elemeit kihagyva)
  const own = (n) => [...ch.children].find((c) => c.tagName === n);
  const title = own('title')?.textContent.trim() || url;
  const image = own('itunes:image')?.getAttribute('href') || own('image')?.getElementsByTagName('url')[0]?.textContent.trim() || own('logo')?.textContent.trim() || '';
  const author = own('itunes:author')?.textContent.trim() || own('author')?.textContent.trim() || own('managingEditor')?.textContent.trim() || '';
  const desc = own('description')?.textContent.trim() || own('itunes:summary')?.textContent.trim() || own('subtitle')?.textContent.trim() || '';
  const link = (atom ? [...ch.children].find((c) => c.tagName === 'link' && c.getAttribute('rel') !== 'self')?.getAttribute('href') : own('link')?.textContent.trim()) || '';
  const funding = own('podcast:funding')?.getAttribute('url') || '';
  const items = [...ch.getElementsByTagName(atom ? 'entry' : 'item')];
  const eps = [];
  for (const it of items) {
    const enc = it.getElementsByTagName('enclosure')[0] || [...it.getElementsByTagName('link')].find((l) => l.getAttribute('rel') === 'enclosure');
    const src = enc?.getAttribute('url') || enc?.getAttribute('href') || '';
    if (!src) continue;
    const guid = text(it, 'guid', 'id') || src;
    const pub = Date.parse(text(it, 'pubDate', 'published', 'updated', 'dc:date')) || 0;
    const chapters = attr(it, 'podcast:chapters', 'url');
    const psc = [...it.getElementsByTagName('psc:chapter')].map((c) => ({ start: parseDur(c.getAttribute('start')), title: c.getAttribute('title') || '', url: c.getAttribute('href') || '' }));
    eps.push({
      key: epKey(url, guid, src),
      feed: url,
      feedTitle: title,
      guid,
      title: text(it, 'title') || _t('Névtelen epizód'),
      desc: text(it, 'content:encoded', 'description', 'itunes:summary', 'summary', 'content').slice(0, 20000),
      pub,
      dur: parseDur(text(it, 'itunes:duration')),
      url: src,
      type: enc.getAttribute('type') || '',
      size: Number(enc.getAttribute('length')) || 0,
      image: attr(it, 'itunes:image', 'href') || image,
      season: Number(text(it, 'itunes:season')) || 0,
      episode: Number(text(it, 'itunes:episode')) || 0,
      link: text(it, 'link') || [...it.getElementsByTagName('link')].find((l) => l.getAttribute('rel') === 'alternate')?.getAttribute('href') || '',
      chapters: chapters || (psc.length ? psc : null),
      transcript: attr(it, 'podcast:transcript', 'url'),
      video: /^video\//.test(enc.getAttribute('type') || ''),
    });
  }
  eps.sort((a, b) => b.pub - a.pub);
  // (a nagyon hosszú archívumokból a legutóbbi 1000 epizód)
  return { url, title, author, image, desc: desc.slice(0, 5000), link, funding, eps: eps.slice(0, 1000), at: Date.now() };
}

const docKey = (url) => 'pod:' + hash(url);
/** A folyam a gyorsítótárból (azonnal), ha volt már letöltve. */
export async function cachedFeed(url) {
  if (feeds.has(url)) return feeds.get(url);
  const c = await api.docGet?.(docKey(url)).catch(() => null);
  if (c?.eps) feeds.set(url, c);
  return feeds.get(url) || null;
}
/** A folyam letöltése (a gyorsítótár korától függően), az új epizódok felismerése. */
export async function refreshFeed(url, { force = false, profile = null } = {}) {
  // (a frissítést indító profil – ha közben profilt váltanak, az eredmény is ahhoz kerül)
  const prof = profile || store.profile;
  const hours = prof ? (pod(prof).cfg.refreshHours ?? 6) : 6;
  const { text: xml } = await api.fetchText(url, { maxAgeHours: force ? 0 : hours, force });
  const f = parseFeed(xml, url);
  feeds.set(url, f);
  api.docSet?.(docKey(url), f).catch?.(() => {});
  const d = prof ? pod(prof) : null;
  const sub = d?.subs.find((s) => s.url === url);
  if (sub) {
    const isPlayed = (key) => !!(Object.prototype.hasOwnProperty.call(d.eps, key) && d.eps[key]?.played);
    // (a feliratkozás adatai frissülnek, ha a műsor nevet / képet váltott)
    if (f.title && sub.title !== f.title) sub.title = f.title;
    if (f.image && sub.image !== f.image) sub.image = f.image;
    const seen = sub.seen || (Object.prototype.hasOwnProperty.call(d.seen, url) ? d.seen[url] : 0) || 0;
    const fresh = seen ? f.eps.filter((e) => e.pub > seen && !isPlayed(e.key)) : [];
    if (f.eps[0]?.pub) sub.seen = Math.max(seen, f.eps[0].pub);
    if (fresh.length) {
      d.inbox = [...fresh.map(snap), ...d.inbox.filter((x) => !fresh.some((e) => e.key === x.key))].slice(0, 300);
      bus.emit('pod-new', { feed: f, eps: fresh, profile: prof });
      // (értesítés csak a most aktív profil műsoráról)
      if (sub.set?.notify !== false && store.profile?.id === prof.id) api.notify?.({ title: f.title, body: fresh.length > 1 ? _t('{n} új epizód: {title}', { n: fresh.length, title: fresh[0].title }) : _t('Új epizód: {title}', { title: fresh[0].title }) });
    }
    savePod();
  }
  bus.emit('pod-feed', url);
  return f;
}
/** Minden feliratkozás frissítése (párhuzamosan, legfeljebb 4 egyszerre). */
const refreshing = new Map(); // profil → a folyamatban lévő frissítés (más profil nem csatlakozik hozzá)
export function refreshAll({ force = false } = {}) {
  const prof = store.profile;
  if (refreshing.has(prof)) return refreshing.get(prof);
  const list = pod().subs.map((s) => s.url);
  const run = (async () => {
    let i = 0;
    const errors = [];
    await Promise.all(
      Array.from({ length: Math.min(4, list.length) }, async () => {
        while (i < list.length) {
          const u = list[i++];
          await refreshFeed(u, { force, profile: prof }).catch((e) => errors.push([u, e.message || String(e)]));
        }
      })
    );
    refreshing.delete(prof);
    bus.emit('pod-refreshed', errors);
    return errors;
  })();
  refreshing.set(prof, run);
  return run;
}
/** Indításkor: a feliratkozások gyorsítótárból, utána a háttérben frissítés; óránként újra (a beállított időközzel). */
export async function initPodcasts() {
  if (!store.profile) return;
  await Promise.all(pod().subs.map((s) => cachedFeed(s.url)));
  bus.emit('pod-subs');
  setTimeout(() => refreshAll().catch(() => {}), 8000);
}
setInterval(() => store.profile && pod().subs.length && refreshAll().catch(() => {}), 60 * 60e3);
bus.on('profile', () => initPodcasts().catch(() => {}));

/** Egy műsor összes ismert epizódja (a feliratkozások folyamaiból) a kulcs szerint. */
export function findEp(key) {
  for (const f of feeds.values()) {
    const e = f.eps.find((x) => x.key === key);
    if (e) return e;
  }
  const d = pod();
  return d.queue.find((x) => x.key === key) || d.inbox.find((x) => x.key === key) || d.hist.find((x) => x.key === key) || d.favs.find((x) => x.key === key) || (safeKey(key) && Object.prototype.hasOwnProperty.call(d.eps, key) ? d.eps[key].dl?.ep : null) || null;
}

// ---------------------------------------------------------------------------
// Keresés, toplista
// ---------------------------------------------------------------------------
const country = () => (store.settings.homeCountry || 'HU').toLowerCase();
/** Keresés a podcast-katalógusokban (Apple Podcasts nyilvános keresője, tartalékként fyyd). */
export async function searchPodcasts(q) {
  const term = String(q || '').trim();
  if (!term) return [];
  // RSS-cím közvetlenül
  if (/^https?:\/\//i.test(term)) return [{ title: term, author: '', image: '', url: term, direct: true }];
  try {
    const { text: t } = await api.fetchText(`https://itunes.apple.com/search?media=podcast&limit=40&country=${country()}&term=${encodeURIComponent(term)}`, { maxAgeHours: 6 });
    const j = JSON.parse(t);
    const out = (j.results || []).filter((r) => r.feedUrl).map((r) => ({ title: r.collectionName || r.trackName, author: r.artistName || '', image: r.artworkUrl600 || r.artworkUrl100 || '', url: r.feedUrl, genre: r.primaryGenreName || '', count: r.trackCount || 0 }));
    if (out.length) return out;
  } catch {}
  try {
    const { text: t } = await api.fetchText(`https://api.fyyd.de/0.2/search/podcast?count=40&term=${encodeURIComponent(term)}`, { maxAgeHours: 6 });
    const j = JSON.parse(t);
    return (j.data || []).filter((r) => r.xmlURL).map((r) => ({ title: r.title, author: r.author || '', image: r.imgURL || r.layoutImageURL || '', url: r.xmlURL, genre: '', count: r.episode_count || 0 }));
  } catch {
    return [];
  }
}
/** A beállított ország podcast-toplistája (Apple), a műsorok RSS-címével. */
export async function topPodcasts(n = 50) {
  const cc = country();
  const { text: t } = await api.fetchText(`https://rss.marketingtools.apple.com/api/v2/${cc}/podcasts/top/${n}/podcasts.json`, { maxAgeHours: 24 });
  const res = JSON.parse(t)?.feed?.results || [];
  if (!res.length) return [];
  const { text: l } = await api.fetchText(`https://itunes.apple.com/lookup?country=${cc}&id=${res.map((r) => r.id).join(',')}`, { maxAgeHours: 24 });
  const by = new Map((JSON.parse(l).results || []).map((r) => [String(r.collectionId), r]));
  return res
    .map((r) => {
      const x = by.get(String(r.id));
      return x?.feedUrl ? { title: r.name, author: r.artistName || '', image: (r.artworkUrl100 || '').replace('100x100', '400x400'), url: x.feedUrl, genre: x.primaryGenreName || '' } : null;
    })
    .filter(Boolean);
}

// ---------------------------------------------------------------------------
// OPML (más podcast-alkalmazások feliratkozásai)
// ---------------------------------------------------------------------------
export function parseOpml(xml) {
  const doc = new DOMParser().parseFromString(xml, 'text/xml');
  if (doc.getElementsByTagName('parsererror').length) throw new Error(_t('Az OPML-fájl nem olvasható.'));
  return [...doc.getElementsByTagName('outline')]
    .map((o) => ({ url: o.getAttribute('xmlUrl') || o.getAttribute('xmlurl') || '', title: o.getAttribute('title') || o.getAttribute('text') || '' }))
    .filter((o) => /^https?:\/\//i.test(o.url));
}
const xmlEsc = (s) => String(s || '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[c]);
export function toOpml(subs = pod().subs) {
  return `<?xml version="1.0" encoding="UTF-8"?>\n<opml version="2.0">\n  <head><title>${xmlEsc(_t('Adás – podcast-feliratkozások'))}</title><dateCreated>${new Date().toUTCString()}</dateCreated></head>\n  <body>\n${subs
    .map((s) => `    <outline type="rss" text="${xmlEsc(s.title)}" title="${xmlEsc(s.title)}" xmlUrl="${xmlEsc(s.url)}" />`)
    .join('\n')}\n  </body>\n</opml>\n`;
}
/** OPML-ből feliratkozás (a már meglévők kimaradnak); a feliratkozott műsorok száma. */
export function importOpml(xml) {
  // (a ténylegesen felvett műsorok száma: a meglévők és a fájlon belüli ismétlések kimaradnak)
  const before = pod().subs.length;
  for (const o of parseOpml(xml)) subscribe({ url: o.url, title: o.title });
  return pod().subs.length - before;
}

// ---------------------------------------------------------------------------
// Letöltés (asztali gépen: a programmappa „podcasts” mappájába; Androidon az alkalmazás saját tárhelyére)
// ---------------------------------------------------------------------------
export const canDownload = () => !!api.podDownload;
const downloading = new Map(); // profil + epizódkulcs → ígéret (profilonként külön letöltés)
const dlKey = (prof, key) => (prof?.id || '') + '|' + key;
/** Az aktív profil letölti-e most ezt az epizódot. */
export const isDownloading = (key) => downloading.has(dlKey(store.profile, key));
export function downloadEp(ep, prof = store.profile) {
  const k = dlKey(prof, ep.key);
  if (!canDownload() || !prof || downloading.has(k) || pod(prof).eps[ep.key]?.dl) return downloading.get(k) || Promise.resolve();
  const name = `${(ep.feedTitle || 'podcast').slice(0, 40)} - ${(ep.title || ep.key).slice(0, 80)}`;
  const p = api
    .podDownload({ url: ep.url, feed: ep.feed, name, key: ep.key, profile: prof.id || '' })
    .then((r) => {
      // (a profilt közben törölték: a fájl sem marad meg)
      if (!store.profiles.some((x) => x.id === prof.id)) {
        api.podDelete?.(r.path).catch(() => {});
        return r;
      }
      // (a pillanatkép: a Letöltések akkor is mutatja, ha a folyamból / a sorból már kikerült)
      setState(ep.key, { dl: { path: r.path, url: r.url, size: r.size, ep: snap(ep) } }, prof);
      return r;
    })
    .finally(() => {
      downloading.delete(k);
      bus.emit('pod-dl', ep.key);
    });
  downloading.set(k, p);
  bus.emit('pod-dl', ep.key);
  return p;
}
/** A letöltött fájl törlése; true: törölve (a letöltés adata csak ekkor törlődik), false: nem sikerült. */
export async function deleteDownload(ep) {
  const dl = epState(ep.key)?.dl;
  if (!dl) return true;
  const ok = await Promise.resolve(api.podDelete?.(dl.path)).then((r) => r !== false, () => false);
  if (!ok) return false;
  forgetDownload(ep);
  return true;
}
/** A letöltés adatának elejtése (a fájl már nincs meg – pl. a lejátszó nem találta). */
export function forgetDownload(ep) {
  if (!epState(ep.key)?.dl) return;
  setState(ep.key, { dl: undefined });
  bus.emit('pod-dl', ep.key);
}
/** A lejátszandó cím: a letöltött fájl, ha van, különben az eredeti. */
export const playUrl = (ep) => epState(ep.key)?.dl?.url || ep.url;
export const downloadedList = () => {
  const d = pod();
  return Object.entries(d.eps)
    .filter(([, s]) => s.dl)
    .map(([k]) => findEp(k))
    .filter(Boolean);
};
/** A letöltött fájlok összmérete (bájt) – az aktív profilé, vagy a megadott epizódoké. */
export const downloadedSize = (list = downloadedList()) => list.reduce((s, ep) => s + (epState(ep.key)?.dl?.size || 0), 0);
// új epizód: automatikus letöltés, ha a műsornál be van kapcsolva
bus.on('pod-new', ({ feed, eps, profile }) => {
  const prof = profile || store.profile;
  if (!canDownload() || !prof || !pod(prof).subs.find((s) => s.url === feed.url)?.set?.autoDl) return;
  eps.slice(0, 3).forEach((e) => downloadEp(e, prof).catch(() => {}));
});

export const _podTest = { parseFeed, parseDur, parseOpml, toOpml, epKey };
