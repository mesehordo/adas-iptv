// Főoldal (irányítópult): időjárás, a kedvenc csatornák műsora, RSS-hírek, „Ma este a tévében”,
// TV- és VOD-folytatás. Két oszlop × négy sor (telefonon, álló helyzetben egymás alatt).
import { esc, html, hashHue, fmtTime, toast, debounce } from './util.js';
import { api, IS_TV } from './api.js';
import { store } from './store.js';
import { epg } from './epg.js';
import { catalog, visible, getChannels, homeRank, rankScore } from './catalog.js';
import { ICON, logoHtml, openModal, openProgram, emptyState } from './components.js';
import { player, startPreview, stopPreview } from './player.js';
import { minutesLeft as watchLeft } from './watchtime.js';
import { watchList, loadSportEvents, sportEventsCached, sportStale, eventRowHtml } from './sports.js';
import { vod, own, continueItems, playVod, loadVod, vodLists, findItem, displayTitle } from './vod.js';

// ---------------------------------------------------------------------------
// Időjárás (Open-Meteo – ingyenes, kulcs nélkül)
// ---------------------------------------------------------------------------
const WMO = {
  0: ['Derült', '☀️'], 1: ['Többnyire derült', '🌤️'], 2: ['Részben felhős', '⛅'], 3: ['Borult', '☁️'],
  45: ['Köd', '🌫️'], 48: ['Zúzmarás köd', '🌫️'],
  51: ['Gyenge szitálás', '🌦️'], 53: ['Szitálás', '🌦️'], 55: ['Erős szitálás', '🌧️'], 56: ['Ónos szitálás', '🌧️'], 57: ['Ónos szitálás', '🌧️'],
  61: ['Gyenge eső', '🌦️'], 63: ['Eső', '🌧️'], 65: ['Erős eső', '🌧️'], 66: ['Ónos eső', '🌧️'], 67: ['Erős ónos eső', '🌧️'],
  71: ['Gyenge havazás', '🌨️'], 73: ['Havazás', '🌨️'], 75: ['Erős havazás', '❄️'], 77: ['Hószemcse', '🌨️'],
  80: ['Gyenge zápor', '🌦️'], 81: ['Zápor', '🌧️'], 82: ['Heves zápor', '⛈️'], 85: ['Hózápor', '🌨️'], 86: ['Erős hózápor', '❄️'],
  95: ['Zivatar', '⛈️'], 96: ['Zivatar jégesővel', '⛈️'], 99: ['Heves zivatar jégesővel', '⛈️'],
};
const wmo = (c) => WMO[c] || ['', '🌡️'];
const DAYS = ['vasárnap', 'hétfő', 'kedd', 'szerda', 'csütörtök', 'péntek', 'szombat'];
const DAYS_SHORT = ['V', 'H', 'K', 'Sze', 'Cs', 'P', 'Szo'];

/** Város → koordináták (Open-Meteo geokódolás, magyar nevekkel). → [{ name, admin, country, lat, lon }] */
export async function geocode(name) {
  const { text } = await api.fetchText(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(name)}&count=6&language=hu&format=json`, { maxAgeHours: 24 * 30 });
  return (JSON.parse(text).results || []).map((r) => ({ name: r.name, admin: r.admin1 || '', country: r.country || '', lat: r.latitude, lon: r.longitude }));
}

async function weatherLoc() {
  const s = store.settings;
  const city = (s.weatherCity || 'Budapest').trim();
  if (s.weatherLoc && s.weatherLoc.query === city) return s.weatherLoc;
  const [hit] = await geocode(city);
  if (!hit) throw new Error(`Nem található település: ${city}`);
  s.weatherLoc = { ...hit, query: city };
  store.save();
  return s.weatherLoc;
}

async function loadWeather() {
  const loc = await weatherLoc();
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${loc.lat}&longitude=${loc.lon}` +
    '&current=temperature_2m,apparent_temperature,weather_code,wind_speed_10m,relative_humidity_2m,is_day' +
    '&hourly=temperature_2m,weather_code,precipitation_probability,is_day' +
    '&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=auto&forecast_days=7';
  const { text } = await api.fetchText(url, { maxAgeHours: 0.5 });
  return { loc, data: JSON.parse(text) };
}

/** A mai időjárás megjelenése (Beállítások → Megjelenés és főoldal → Főoldal). */
export const WEATHER_STYLES = [
  ['line', 'Vonaldiagram'],
  ['area', 'Terület + csapadék'],
  ['bars', 'Oszlopok'],
  ['tiles', 'Csempék'],
  ['none', 'Nincs órás bontás – csak egy érték'],
];
const weatherStyle = () => (WEATHER_STYLES.some(([k]) => k === store.settings.weatherStyle) ? store.settings.weatherStyle : 'line');
const icoFor = (code, day) => (!day && code <= 1 ? '🌙' : wmo(code)[1]);
const r1 = (v) => Math.round(v * 10) / 10;
/** Hőmérséklet → szín: kék (hideg) → türkiz → sárga → narancs → piros (meleg) */
const TEMP_STOPS = [[-5, [91, 124, 250]], [8, [79, 179, 217]], [17, [242, 193, 78]], [26, [240, 138, 60]], [34, [224, 72, 72]]];
const tempColor = (t) => {
  const i = TEMP_STOPS.findIndex(([v]) => t < v);
  if (i <= 0) return `rgb(${TEMP_STOPS[i === 0 ? 0 : TEMP_STOPS.length - 1][1]})`;
  const [[a, ca], [b, cb]] = [TEMP_STOPS[i - 1], TEMP_STOPS[i]];
  const k = (t - a) / (b - a);
  return `rgb(${ca.map((x, j) => Math.round(x + (cb[j] - x) * k))})`;
};

/** A helyi mai nap órái: [{ h, temp, code, rain, day }] */
function todayHours(data) {
  const h = data.hourly || {};
  const day = data.daily?.time?.[0];
  const out = [];
  (h.time || []).forEach((t, i) => {
    if (day && t.slice(0, 10) === day) out.push({ h: Number(t.slice(11, 13)), temp: h.temperature_2m[i], code: h.weather_code[i], rain: h.precipitation_probability?.[i] ?? 0, day: h.is_day?.[i] !== 0 });
  });
  return out;
}
/** Az aktuális (helyi) óra törtrésszel – a „most” jelölőhöz. */
const nowHour = (data) => {
  const t = data.current?.time;
  return t && t.slice(0, 10) === data.daily?.time?.[0] ? Number(t.slice(11, 13)) + Number(t.slice(14, 16)) / 60 : null;
};
/** Óránként, ha kifér; különben két- (telefonon három-) óránként. */
const pickPts = (hours, W, minW) => {
  const step = W / 24 >= minW ? 1 : W / 12 >= minW * 0.7 ? 2 : 3;
  return hours.filter((p) => p.h % step === 0);
};
const smooth = (P) =>
  P.map((p, i) => {
    if (!i) return `M${r1(p[0])},${r1(p[1])}`;
    const p0 = P[i - 2] || P[i - 1], p1 = P[i - 1], p3 = P[i + 1] || p;
    return `C${r1(p1[0] + (p[0] - p0[0]) / 6)},${r1(p1[1] + (p[1] - p0[1]) / 6)} ${r1(p[0] - (p3[0] - p1[0]) / 6)},${r1(p[1] - (p3[1] - p1[1]) / 6)} ${r1(p[0])},${r1(p[1])}`;
  }).join(' ');
let gradSeq = 0;

/** SVG-diagram (line / area / bars) a megadott pontokból, W×H képpontban. */
function chartSvg(style, pts, nowH, W, H) {
  const n = pts.length;
  if (!n) return '';
  const cw = W / n;
  const step = n > 1 ? pts[1].h - pts[0].h : 1;
  const xs = pts.map((_, i) => (i + 0.5) * cw);
  const temps = pts.map((p) => p.temp);
  let lo = Math.min(...temps), hi = Math.max(...temps);
  if (hi - lo < 4) [lo, hi] = [(hi + lo) / 2 - 2, (hi + lo) / 2 + 2];
  const hourLbl = pts.map((p, i) => `<text class="wc-h" x="${r1(xs[i])}" y="${H - 3}">${cw >= 40 ? `${p.h}:00` : p.h}</text>`).join('');
  const icons = (y) => pts.map((p, i) => `<text class="wc-i" x="${r1(xs[i])}" y="${y}">${icoFor(p.code, p.day)}</text>`).join('');
  const tLbl = (P) => P.map(([x, y], i) => `<text class="wc-t" x="${r1(x)}" y="${r1(y - 7)}">${Math.round(pts[i].temp)}°</text>`).join('');
  let body = '';
  if (style === 'bars') {
    const top = 16, base = H - 38;
    const y = (v) => base - ((v - lo + 1.5) / (hi - lo + 1.5)) * (base - top);
    const bw = Math.min(cw * 0.6, 26);
    body =
      pts.map((p, i) => {
        const yy = y(p.temp);
        return `<rect x="${r1(xs[i] - bw / 2)}" y="${r1(yy)}" width="${r1(bw)}" height="${r1(base - yy)}" rx="4" style="fill:${tempColor(p.temp)}" /><text class="wc-t" x="${r1(xs[i])}" y="${r1(yy - 4)}">${Math.round(p.temp)}°</text>`;
      }).join('') + icons(H - 19);
  } else {
    const area = style === 'area';
    const top = area ? 38 : 20, bot = area ? H - 18 : H - 40;
    const y = (v) => bot - ((v - lo) / (hi - lo)) * (bot - top);
    const P = pts.map((p, i) => [xs[i], y(p.temp)]);
    const d = smooth(P);
    if (area) {
      const id = `wg${++gradSeq}`;
      const rainMax = (bot - top) * 0.55;
      const bw = Math.min(cw * 0.5, 18);
      body =
        `<defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:var(--accent);stop-opacity:.55" /><stop offset="1" style="stop-color:var(--accent);stop-opacity:0" /></linearGradient></defs>` +
        pts.map((p, i) => (p.rain ? `<rect class="wc-rain" x="${r1(xs[i] - bw / 2)}" y="${r1(bot - (p.rain / 100) * rainMax)}" width="${r1(bw)}" height="${r1((p.rain / 100) * rainMax)}" rx="2" />${p.rain >= 30 ? `<text class="wc-r" x="${r1(xs[i])}" y="${r1(bot - 3)}">${p.rain}%</text>` : ''}` : '')).join('') +
        `<path d="${d} L${r1(xs[n - 1])},${bot} L${r1(xs[0])},${bot} Z" style="fill:url(#${id})" /><path class="wc-line" d="${d}" />` +
        tLbl(P) + icons(15);
    } else {
      body = `<path class="wc-line" d="${d}" />` + P.map(([x, yy]) => `<circle class="wc-dot" cx="${r1(x)}" cy="${r1(yy)}" r="3" />`).join('') + tLbl(P) + icons(H - 21);
    }
  }
  let now = '';
  if (nowH != null) {
    const x = r1(Math.max(0, Math.min(W, ((nowH - pts[0].h) / step + 0.5) * cw)));
    now = `<rect class="wc-past" x="0" y="0" width="${x}" height="${H - 15}" /><line class="wc-now" x1="${x}" x2="${x}" y1="0" y2="${H - 15}" />`;
  }
  return `<svg class="wchart" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" aria-hidden="true">${body}${now}${hourLbl}</svg>`;
}

function tilesHtml(pts, nowH) {
  const step = pts.length > 1 ? pts[1].h - pts[0].h : 1;
  return `<ul class="w-tiles" style="grid-template-columns:repeat(${pts.length}, minmax(0, 1fr))">${pts
    .map((p) => {
      const cls = nowH == null ? '' : nowH >= p.h + step ? 'past' : nowH >= p.h ? 'now' : '';
      return `<li class="${cls}"><span class="wt-h">${p.h}:00</span><span class="wd-ico">${icoFor(p.code, p.day)}</span><b>${Math.round(p.temp)}°</b><span class="wd-p">${p.rain ? p.rain + '%' : ''}</span></li>`;
    })
    .join('')}</ul>`;
}

/** o: { facts, chart, week, days, big } – a kártya méretétől függ (weatherUnit). */
function weatherHtml({ loc, data }, o = {}) {
  const { facts = true, chart = true, week = true, days: nDays = 7, big = false } = o;
  const c = data.current || {};
  const [desc, ico] = wmo(c.weather_code);
  const d = data.daily || {};
  const style = weatherStyle();
  const days = (d.time || []).slice(0, nDays).map((t, i) => {
    const date = new Date(t + 'T12:00:00');
    const [dd, di] = wmo(d.weather_code[i]);
    return `<li title="${esc(dd)}"><span class="wd-day">${i === 0 ? 'Ma' : DAYS_SHORT[date.getDay()]}</span><span class="wd-ico">${di}</span>
      <span class="wd-t"><b>${Math.round(d.temperature_2m_max[i])}°</b> ${Math.round(d.temperature_2m_min[i])}°</span>
      ${d.precipitation_probability_max?.[i] ? `<span class="wd-p">${d.precipitation_probability_max[i]}%</span>` : '<span class="wd-p"></span>'}</li>`;
  });
  const mm = d.time?.length ? `<span class="w-mm">↑ ${Math.round(d.temperature_2m_max[0])}°  ↓ ${Math.round(d.temperature_2m_min[0])}°${d.precipitation_probability_max?.[0] ? ` · 💧 ${d.precipitation_probability_max[0]}%` : ''}</span>` : '';
  return `<div class="w-now ${big ? 'big' : ''}">
      <span class="w-ico">${c.is_day === 0 && c.weather_code <= 1 ? '🌙' : ico}</span>
      <div class="w-temp">${Math.round(c.temperature_2m)}°</div>
      <div class="w-mid"><b class="w-city">${esc(loc.name)}</b><span class="w-desc">${esc(desc)}</span>${mm}</div>
      ${facts ? `<dl class="w-facts"><dt>Hőérzet</dt><dd>${Math.round(c.apparent_temperature)}°</dd><dt>Szél</dt><dd>${Math.round(c.wind_speed_10m)} km/h</dd><dt>Pára</dt><dd>${c.relative_humidity_2m}%</dd></dl>` : ''}
    </div>
    ${chart && style !== 'none' ? `<div class="w-today ${style === 'tiles' ? 'tiles' : ''}"></div>` : ''}
    ${week ? `<ul class="w-days" style="grid-template-columns:repeat(${days.length}, minmax(0, 1fr))">${days.join('')}</ul>` : ''}`;
}

/** A mai órás bontás kirajzolása – a kártya tényleges méretéhez igazítva. */
function drawToday(root) {
  const el = root.querySelector('.w-today');
  if (!el || !weatherCache) return;
  const hours = todayHours(weatherCache.data);
  const W = el.clientWidth;
  if (!W || !hours.length) return (el.innerHTML = '');
  const style = weatherStyle();
  const nh = nowHour(weatherCache.data);
  if (style === 'tiles') el.innerHTML = tilesHtml(pickPts(hours, W, 46), nh);
  else el.innerHTML = chartSvg(style, pickPts(hours, W, 34), nh, W, Math.max(70, Math.min(220, el.clientHeight || 120)));
}

// Minta a beállítások előnézetéhez
const SAMPLE = Array.from({ length: 12 }, (_, i) => {
  const h = i * 2;
  return { h, temp: r1(12 + 7 * Math.sin(((h - 9) / 24) * 2 * Math.PI)), code: [0, 0, 0, 1, 2, 2, 3, 61, 80, 2, 1, 0][i], rain: [0, 0, 0, 5, 10, 20, 40, 70, 55, 20, 5, 0][i], day: h >= 7 && h <= 18 };
});
function stylePreview(k) {
  if (k === 'none') return `<span class="ws-none"><span class="w-ico">⛅</span><b>18°</b></span>`;
  if (k === 'tiles') return tilesHtml(SAMPLE.filter((p) => p.h % 4 === 0), 13);
  return chartSvg(k, SAMPLE.filter((p) => p.h % 4 === 0), 13, 220, 104);
}

// ---------------------------------------------------------------------------
// RSS / Atom hírek
// ---------------------------------------------------------------------------
export const DEFAULT_FEEDS = [
  { name: 'Telex', url: 'https://telex.hu/rss' },
  { name: 'HVG', url: 'https://hvg.hu/rss' },
  { name: '444', url: 'https://444.hu/feed' },
];
const feeds = () => (store.settings.rssFeeds ?? DEFAULT_FEEDS).filter((f) => f.enabled !== false);
const stripHtml = (s) => {
  const d = document.createElement('div');
  d.innerHTML = String(s || '');
  return (d.textContent || '').replace(/\s+/g, ' ').trim();
};

function parseFeed(text, feed) {
  const doc = new DOMParser().parseFromString(text, 'text/xml');
  const nodes = [...doc.querySelectorAll('item'), ...doc.querySelectorAll('entry')];
  const name = feed.name || doc.querySelector('channel > title, feed > title')?.textContent?.trim() || new URL(feed.url).hostname;
  return nodes.map((n) => {
    const get = (sel) => n.querySelector(sel)?.textContent?.trim() || '';
    const linkEl = n.querySelector('link[href]');
    const link = linkEl ? linkEl.getAttribute('href') : get('link');
    const date = Date.parse(get('pubDate') || get('published') || get('updated') || get('date')) || 0;
    const img =
      n.querySelector('enclosure[type^="image"]')?.getAttribute('url') ||
      [...n.getElementsByTagNameNS('*', 'content')].find((e) => /image/.test(e.getAttribute('type') || '') || e.getAttribute('medium') === 'image')?.getAttribute('url') ||
      [...n.getElementsByTagNameNS('*', 'thumbnail')][0]?.getAttribute('url') ||
      '';
    return { title: stripHtml(get('title')), link, date, desc: stripHtml(get('description') || get('summary') || get('content')), img, source: name };
  });
}

async function loadNews() {
  const all = await Promise.all(
    feeds().map(async (f) => {
      try {
        const { text } = await api.fetchText(f.url, { maxAgeHours: 0.25 });
        return parseFeed(text, f);
      } catch (err) {
        console.warn('RSS', f.url, err);
        return [];
      }
    })
  );
  return all
    .flat()
    .filter((x) => x.title)
    .sort((a, b) => b.date - a.date)
    .slice(0, 15);
}

const ago = (t) => {
  if (!t) return '';
  const m = Math.round((Date.now() - t) / 60000);
  if (m < 1) return 'most';
  if (m < 60) return `${m} perce`;
  if (m < 24 * 60) return `${Math.round(m / 60)} órája`;
  return new Date(t).toLocaleDateString('hu-HU', { month: 'short', day: 'numeric' });
};

function openNews(n) {
  const el = html(`<div class="news-detail">
    ${n.img ? `<img class="nd-img" src="${esc(n.img)}" alt="" referrerpolicy="no-referrer" onerror="this.remove()" />` : ''}
    <div class="muted small">${esc(n.source)} · ${n.date ? new Date(n.date).toLocaleString('hu-HU', { dateStyle: 'medium', timeStyle: 'short' }) : ''}</div>
    <h2>${esc(n.title)}</h2>
    ${n.desc ? `<p>${esc(n.desc.slice(0, 1200))}${n.desc.length > 1200 ? '…' : ''}</p>` : ''}
    <div class="dialog-btns">${api.caps.external && n.link ? `<button class="btn primary" data-n="open" autofocus>${ICON.external || ''} Megnyitás a böngészőben</button>` : ''}<button class="btn" data-n="close" ${api.caps.external && n.link ? '' : 'autofocus'}>Bezárás</button></div>
  </div>`);
  const close = openModal(el, { cls: 'medium' });
  el.addEventListener('click', (e) => {
    const a = e.target.closest('[data-n]')?.dataset.n;
    if (a === 'open') api.openExternal(n.link);
    if (a) close();
  });
}

// ---------------------------------------------------------------------------
// Csatornák: kedvencek műsora, ma este, utoljára nézett, emlékeztetők
// ---------------------------------------------------------------------------
/** A profil (látható) kedvenc csatornái, a kedvencek sorrendjében. */
function favChannels() {
  const vis = new Set(visible());
  return getChannels(store.profile.favorites).filter((c) => vis.has(c));
}
const NO_FAVS = 'Még nincs kedvenc csatornád. A csatornák kártyáján a <b>+</b> gombbal jelölheted meg őket.';
const note = (t) => `<p class="muted small d-note">${t}</p>`;
const fit = (avail, item, min = 1) => Math.max(min, Math.floor(avail / item));

/** „Most a tévében”: a Műsorújság idővonalas rácsa kicsiben. */
function miniGuideHtml(list, more, span, chW, rowH) {
  const t = Date.now();
  const from = Math.floor((t - 20 * 60e3) / 1800e3) * 1800e3;
  const to = from + span;
  const pct = (v) => `${(((v - from) / span) * 100).toFixed(3)}%`;
  const tick = span > 3 * 3600e3 ? 3600e3 : 1800e3;
  const ticks = [];
  for (let x = from; x < to; x += tick) ticks.push(x);
  const rows = list.map((ch) => {
    const progs = epg.range(ch.id, from, to);
    return `<div class="g-row"><button class="g-ch" data-play="${esc(ch.id)}" title="${esc(ch.name)} lejátszása"><span class="g-logo" style="--h:${hashHue(ch.name)}">${logoHtml(ch, 'logo-sm')}</span><span class="g-name">${esc(ch.name)}</span></button><div class="g-progs">${
      progs.length
        ? progs
            .map((pr) => {
              const a = Math.max(pr.start, from), b = Math.min(pr.stop, to);
              const live = pr.start <= t && pr.stop > t;
              const rem = store.hasReminder(ch.id, pr.start);
              return `<button class="g-prog ${live ? 'live' : ''} ${pr.stop <= t ? 'past' : ''} ${rem ? 'rem' : ''}" style="left:${pct(a)};width:calc(${(((b - a) / span) * 100).toFixed(3)}% - 2px)" data-prog="${esc(ch.id)}|${pr.start}" title="${esc(pr.title)} (${fmtTime(pr.start)}–${fmtTime(pr.stop)})"><b>${esc(pr.title)}</b><small>${fmtTime(pr.start)}–${fmtTime(pr.stop)}</small></button>`;
            })
            .join('')
        : '<span class="g-none muted small">Nincs műsoradat</span>'
    }</div></div>`;
  });
  return `<div class="mini-guide ${chW < 90 ? 'logo-only' : ''}" style="--mg-ch:${chW}px;--mg-row:${rowH}px">
    <div class="g-head"><div class="g-corner"></div><div class="g-times">${ticks.map((x) => `<span style="left:${pct(x)}">${fmtTime(x)}</span>`).join('')}</div></div>
    ${rows.join('')}
    ${more ? `<a class="mg-more" href="#/guide">+ ${more} további kedvenc csatorna – Műsorújság ›</a>` : ''}
    <div class="g-nowline" style="left:calc(var(--mg-ch) + (100% - var(--mg-ch)) * ${((t - from) / span).toFixed(4)})"></div>
  </div>`;
}

/** Ma este: a kedvenc csatornák esti műsorai (19:00 – éjfél, a már elkezdettek nélkül). */
function tonight(n) {
  const now = Date.now();
  const d = new Date();
  const from = Math.max(now, new Date(d.getFullYear(), d.getMonth(), d.getDate(), 19, 0).getTime());
  const to = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59).getTime();
  const chans = favChannels();
  const prime = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 20, 0).getTime();
  // Csatornánként a legjobb esti műsor: a hosszabb (film, sorozat, show), főműsoridőhöz (20:00) közeli
  const best = new Map();
  for (const ch of chans) {
    for (const p of epg.range(ch.id, from, to)) {
      const len = p.stop - p.start;
      if (p.start < from || len < 25 * 60e3) continue;
      const score = Math.min(len, 120 * 60e3) / 60e3 + (/film|movie|mozi/i.test(p.category || '') ? 40 : 0) - Math.abs(p.start - prime) / 60e3 / 3;
      if (!best.has(ch.id) || score > best.get(ch.id).score) best.set(ch.id, { ch, p, score });
    }
  }
  // a kedvencek sorrendje (előrébb = fontosabb) és a műsor pontszáma alapján, majd időrendben
  const order = new Map(chans.map((c, i) => [c.id, i]));
  return [...best.values()]
    .sort((a, b) => b.score - order.get(b.ch.id) * 3 - (a.score - order.get(a.ch.id) * 3))
    .slice(0, n)
    .sort((a, b) => a.p.start - b.p.start);
}

// Az XMLTV kategóriák gyakran gépi azonosítók („szabadidos-musor”) – olvasható alak
const CAT_FIX = { musor: 'műsor', szabadidos: 'szabadidős', vallasi: 'vallási', hirmusor: 'hírműsor', hirek: 'hírek', gyermek: 'gyermek', ismeretterjeszto: 'ismeretterjesztő', sorozat: 'sorozat', jatek: 'játék', vetelkedo: 'vetélkedő', tarsalgo: 'társalgó', kozeleti: 'közéleti' };
const prettyCat = (c) => (/-/.test(c || '') ? c.split('-').map((w) => CAT_FIX[w] || w).join(' ') : c || '');

const remBtn = (id, start) => {
  const on = store.hasReminder(id, start);
  return `<button class="round small ${on ? 'on' : ''}" data-rem="${esc(id)}|${start}" title="${on ? 'Emlékeztető törlése' : 'Emlékeztető'}">${ICON.bell}</button>`;
};
const dayTime = (t) => {
  const d = new Date(t);
  const today = new Date();
  const diff = Math.round((new Date(d.getFullYear(), d.getMonth(), d.getDate()) - new Date(today.getFullYear(), today.getMonth(), today.getDate())) / 864e5);
  return (diff === 0 ? '' : diff === 1 ? 'holnap ' : `${DAYS[d.getDay()]} `) + fmtTime(t);
};
const posterHtml = (x) => (x.poster ? `<img src="${esc(x.poster)}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.remove()" />` : `<span>${esc(x.title)}</span>`);
/**
 * VOD-plakátok rácsa a kártya méretéhez igazítva: a legtöbb, legalább 60 px széles plakát, ami kifér
 * (több sorban is); ha egy sem, lista. items: [{ x, ratio?, sub? }]
 */
function posterGrid(items, w, h) {
  const bar = (r) => (r ? `<span class="bar"><i style="width:${(Math.min(1, r || 0) * 100).toFixed(1)}%"></i></span>` : '');
  const gap = 8, cap = 22;
  let best = null;
  for (let cols = 1; cols <= items.length; cols++)
    for (let rows = 1; rows <= 3 && (rows - 1) * cols < items.length; rows++) {
      const ph = Math.min(((w - gap * (cols - 1)) / cols) * 1.5, (h - gap * (rows - 1)) / rows - cap);
      const tw = ph / 1.5;
      if (tw < 60 || ph < 90) continue;
      const count = Math.min(items.length, cols * rows);
      if (!best || count > best.count || (count === best.count && tw > best.tw)) best = { cols, tw, ph, count };
    }
  if (!best) {
    return `<ul class="d-vod d-trim">${items
      .slice(0, fit(h, 58))
      .map(({ x, ratio, sub }) => `<li><button class="d-row" data-vod="${esc(x.id)}"><span class="d-poster" style="--h:${hashHue(x.title)}">${x.poster ? posterHtml(x) : ''}</span>
        <span class="d-txt"><b>${esc(displayTitle(x))}</b><small class="muted">${esc(sub || (x.type === 'series' ? 'Sorozat' : 'Film') + (x.year ? ' · ' + x.year : ''))}</small>${bar(ratio)}</span></button></li>`)
      .join('')}</ul>`;
  }
  return `<ul class="d-posters" style="grid-template-columns:repeat(${best.cols}, ${Math.floor(best.tw)}px)">${items
    .slice(0, best.count)
    .map(({ x, ratio, sub }) => `<li><button class="d-tile" data-vod="${esc(x.id)}" title="${esc(displayTitle(x))}${sub ? ' – ' + esc(sub) : ''}"><span class="d-vposter" style="--h:${hashHue(x.title)};height:${Math.floor(best.ph)}px">${posterHtml(x)}${bar(ratio)}${sub ? `<span class="d-vbadge">${esc(sub)}</span>` : ''}</span><small>${esc(displayTitle(x))}</small></button></li>`)
    .join('')}</ul>`;
}
let previewTimer = 0;
const previewOn = () => !!api.caps.preview && store.settings.heroPreview !== false;
const vodItems = () => [...(vod.ready ? continueItems(vod) : []), ...(own.ready ? continueItems(own) : [])].sort((a, b) => b.t - a.t);

// ---------------------------------------------------------------------------
// Egységek: mindegyik a saját (aktuális) méretéhez igazítja, mit és mennyit mutat
// ---------------------------------------------------------------------------
let weatherCache = null;
let weatherErr = null;
let newsCache = null;

export const UNITS = {
  weather: {
    title: 'Időjárás',
    link: ['#/settings?section=dashboard', 'Beállítás ›'],
    mobile: 380,
    render(b, { w, h }) {
      if (!weatherCache) return weatherErr ? note(`Az időjárás nem érhető el: ${esc(weatherErr)}`) : '<div class="spinner small"></div>';
      const style = weatherStyle();
      const nowH = w < 300 ? 52 : 62;
      const weekH = 78;
      const chart = style !== 'none' && h >= nowH + 80;
      const week = h >= nowH + (chart ? 80 : 0) + weekH;
      const days = w / 7 >= 44 ? 7 : w / 5 >= 44 ? 5 : 3;
      return weatherHtml(weatherCache, { facts: w >= 340, chart, week, days, big: !chart && h >= 170 });
    },
    after: (b) => drawToday(b),
  },
  epg: {
    title: 'Most a tévében',
    link: ['#/guide', 'Műsorújság ›'],
    mobile: 420,
    render(b, { w, h }) {
      const list = favChannels();
      if (!list.length) return note(NO_FAVS);
      if (!epg.byChannel?.size) return note('A műsorújság betöltése…');
      const chW = w < 380 ? 64 : w < 560 ? 116 : 170;
      const head = 30;
      const avail = h - head - 2;
      // ha nem fér ki mind, sűrűbb sorok és egy „+N további” sor
      const shown = list.length * 46 <= avail ? list : list.slice(0, fit(avail - 30, 40));
      const rowH = Math.min(72, Math.floor((h - head - 2 - (shown.length < list.length ? 30 : 0)) / shown.length));
      const mins = Math.max(60, Math.min(300, Math.floor((w - chW) / 4 / 30) * 30));
      return miniGuideHtml(shown, list.length - shown.length, mins * 60e3, chW, Math.max(40, rowH));
    },
  },
  rss: {
    title: 'Hírek',
    link: ['#/settings?section=dashboard', 'Források ›'],
    kids: false,
    mobile: 460,
    render(b, { w, h }) {
      if (!newsCache) return '<div class="spinner small"></div>';
      if (!feeds().length) return note('Nincs bekapcsolt hírforrás. A Beállítások → Megjelenés és főoldal → Főoldal alatt adhatsz hozzá RSS-címet.');
      if (!newsCache.length) return note('A hírek most nem érhetők el.');
      const thumbs = w >= 300;
      const desc = w >= 560;
      const n = Math.min(newsCache.length, fit(h, 40));
      return `<ul class="d-news d-trim ${desc ? 'with-desc' : ''}">${newsCache
        .slice(0, n)
        .map((x, i) => `<li><button class="d-row" data-news="${i}">
          ${thumbs && x.img ? `<span class="d-thumb"><img src="${esc(x.img)}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.parentElement.remove()" /></span>` : ''}
          <span class="d-txt"><b>${esc(x.title)}</b>${desc && x.desc ? `<span class="d-desc">${esc(x.desc.slice(0, 220))}</span>` : ''}<small class="muted">${esc(x.source)} · ${esc(ago(x.date))}</small></span>
        </button></li>`)
        .join('')}</ul>`;
    },
  },
  tonight: {
    title: 'Ma este a tévében',
    link: ['#/guide', 'Műsorújság ›'],
    mobile: 320,
    render(b, { w, h }) {
      const items = tonight(fit(h, 40));
      if (!items.length) return note(!favChannels().length ? NO_FAVS : epg.byChannel?.size ? 'Ma estére nincs több műsoradat a kedvenc csatornáidon.' : 'A műsorújság betöltése…');
      const cat = w >= 300;
      return `<ul class="d-tonight d-trim">${items
        .map(({ ch, p }) => `<li><button class="d-row" data-prog="${esc(ch.id)}|${p.start}">
          <span class="d-time">${fmtTime(p.start)}</span>
          <span class="d-txt"><b>${esc(p.title)}</b><small class="muted">${esc(ch.name)}${cat && p.category ? ' · ' + esc(prettyCat(p.category)) : ''}</small></span>
        </button>${remBtn(ch.id, p.start)}</li>`)
        .join('')}</ul>`;
    },
  },
  tv: {
    title: 'Utoljára nézett csatorna',
    link: ['#/tv', 'TV ›'],
    mobile: 250,
    // asztali gépen és Androidon néhány másodperc után a csatorna némított élő képe (Beállítások → Lejátszás → Előnézet a főoldalon)
    after(b) {
      clearTimeout(previewTimer);
      const logo = b.querySelector('.d-last-logo');
      const id = logo?.dataset.play;
      if (!logo || !previewOn() || editing) return;
      previewTimer = setTimeout(() => {
        const ch = catalog.byId.get(id);
        if (logo.isConnected && ch && !player.active && !document.hidden) startPreview(logo, ch);
      }, 2500);
    },
    render(b, { w, h }) {
      const vis = new Set(visible());
      const ch = getChannels(store.profile.recent).find((c) => vis.has(c));
      if (!ch) return note('Még nem néztél csatornát.');
      const t = Date.now();
      const now = epg.now(ch.id, t);
      const cur = now?.cur;
      const wide = w >= 300 && w / h > 1.25;
      // álló elrendezésben a logó a szöveg (és a gomb) után maradó helyet kapja
      const btn = h >= (wide ? 130 : 200);
      const textH = (cur ? 78 : 40) + (btn ? 40 : 0);
      const logoH = wide ? h : Math.min((w * 9) / 16, h - textH - 10);
      const descLines = Math.max(0, Math.floor((h - (wide ? textH : textH + Math.max(0, logoH) + 10)) / 18) - (wide ? 0 : 1));
      return `<div class="d-last ${wide ? 'wide' : ''}">
        ${logoH >= 44 ? `<button class="d-last-logo" data-play="${esc(ch.id)}" title="${esc(ch.name)} lejátszása" style="--h:${hashHue(ch.name)};${wide ? '' : `height:${Math.floor(logoH)}px`}">${logoHtml(ch, 'logo-sm')}<span class="d-last-play">${ICON.play}</span></button>` : ''}
        <div class="d-last-txt">
          <b class="d-last-name">${esc(ch.name)}</b>
          ${cur ? `<span class="d-now"><span class="now-label">MOST</span> ${esc(cur.title)}</span><span class="bar"><i style="width:${(now.progress * 100).toFixed(1)}%"></i></span><small class="muted">${fmtTime(cur.start)}–${fmtTime(cur.stop)}${now.next ? ` · utána: ${fmtTime(now.next.start)} ${esc(now.next.title)}` : ''}</small>` : '<small class="muted">Nincs műsoradat</small>'}
          ${descLines && cur?.desc ? `<p class="d-last-desc" style="-webkit-line-clamp:${descLines}">${esc(cur.desc)}</p>` : ''}
          ${btn ? `<button class="btn primary small" data-play="${esc(ch.id)}">${ICON.play} Folytatás</button>` : ''}
        </div>
      </div>`;
    },
  },
  vod: {
    title: 'VOD – folytatás',
    link: ['#/vod?continue=1', 'Összes ›'],
    mobile: 300,
    render(b, { w, h }) {
      const items = vodItems().slice(0, 5);
      if (!items.length) return note(vod.ready || !vodLists().length ? 'Nincs félbehagyott film vagy sorozat.' : 'A VOD-listák betöltése…');
      return posterGrid(items, w, h);
    },
  },
  reminders: {
    title: 'Emlékeztetők',
    link: null,
    mobile: 260,
    render(b, { w, h }) {
      const t = Date.now();
      const list = store.profile.reminders.filter((r) => r.stop > t);
      if (!list.length) return note('Nincs beállított emlékeztető. A műsorok mellett a csengő gombbal kérhetsz.');
      return `<ul class="d-tonight d-trim">${list
        .slice(0, fit(h, 40))
        .map((r) => {
          const ch = catalog.byId.get(r.channelId);
          const live = r.start <= t;
          return `<li><button class="d-row" ${live ? `data-play="${esc(r.channelId)}"` : `data-prog="${esc(r.channelId)}|${r.start}"`}>
            <span class="d-time ${live ? 'live' : ''}">${live ? 'MOST' : dayTime(r.start)}</span>
            <span class="d-txt"><b>${esc(r.title)}</b><small class="muted">${esc(ch?.name || '')}</small></span>
          </button>${remBtn(r.channelId, r.start)}</li>`;
        })
        .join('')}</ul>`;
    },
  },
  favs: {
    title: 'Kedvenc csatornák',
    link: ['#/favorites', 'Kedvencek ›'],
    mobile: 300,
    render(b, { w, h }) {
      const list = favChannels();
      if (!list.length) return note(NO_FAVS);
      const gap = 8;
      const cols = Math.max(1, Math.floor((w + gap) / (118 + gap)));
      const rows = Math.max(1, Math.floor((h + gap) / (78 + gap)));
      const cap = cols * rows;
      const shown = list.length > cap ? list.slice(0, cap - 1) : list;
      const th = Math.min(130, Math.floor((h - gap * (rows - 1)) / rows));
      const t = Date.now();
      return `<ul class="d-favs" style="grid-template-columns:repeat(${cols}, minmax(0, 1fr));grid-auto-rows:${th}px">${shown
        .map((ch) => {
          const cur = th >= 96 ? epg.now(ch.id, t)?.cur : null;
          return `<li><button class="d-fav" data-play="${esc(ch.id)}" title="${esc(ch.name)}" style="--h:${hashHue(ch.name)}"><span class="d-fav-logo">${logoHtml(ch, 'logo-sm')}</span><small>${esc(cur ? cur.title : ch.name)}</small></button></li>`;
        })
        .join('')}${list.length > shown.length ? `<li><a class="d-fav more" href="#/favorites">+${list.length - shown.length}</a></li>` : ''}</ul>`;
    },
  },
};

// ---------------------------------------------------------------------------
// További egységek: óra + névnap, árfolyamok, sporteredmények, ajánlott műsorok
// ---------------------------------------------------------------------------
const cacheJson = async (url, hours) => JSON.parse((await api.fetchText(url, { maxAgeHours: hours })).text);
const loaders = {}; // egyszerre csak egy letöltés egységenként
function lazy(key, fn, done, ttl = 6e5) {
  const L = loaders[key];
  if (L?.data !== undefined && (L.busy || Date.now() - L.at < (L.data?.error ? 120e3 : ttl))) return L.data;
  if (!loaders[key]?.busy) {
    loaders[key] = { ...(loaders[key] || {}), busy: true };
    fn()
      .then((data) => (loaders[key] = { data, at: Date.now() }))
      .catch((err) => (loaders[key] = { data: { error: err.message || String(err) }, at: Date.now() }))
      .finally(() => done());
  }
  return loaders[key]?.data;
}
const rerenderUnit = (id) => () => {
  const box = document.querySelector('#view .dash');
  if (box) renderAll(box, [id]);
};

async function loadNamedays() {
  const d = new Date();
  const t = new Date(d.getTime() + 864e5);
  const get = async (x) => (await cacheJson(`https://nameday.abalin.net/api/V2/date?day=${x.getDate()}&month=${x.getMonth() + 1}`, 24)).data?.hu || '';
  return { today: await get(d), tomorrow: await get(t).catch(() => '') };
}

const FX = [['EUR', 'euró', '€'], ['USD', 'dollár', '$'], ['CHF', 'svájci frank', 'CHF'], ['GBP', 'font', '£'], ['RON', 'lej', 'RON'], ['CZK', 'cseh korona', 'CZK'], ['PLN', 'zloty', 'PLN']];
async function loadFx() {
  const codes = FX.map((x) => x[0]).join(',');
  const now = await cacheJson(`https://api.frankfurter.app/latest?from=HUF&to=${codes}`, 3);
  const d = new Date(now.date + 'T12:00:00');
  d.setDate(d.getDate() - (d.getDay() === 1 ? 3 : 1));
  const prev = await cacheJson(`https://api.frankfurter.app/${d.toISOString().slice(0, 10)}?from=HUF&to=${codes}`, 24).catch(() => null);
  return { date: now.date, rows: FX.map(([c, n, sym]) => ({ c, n, sym, v: 1 / now.rates[c], p: prev?.rates?.[c] ? 1 / prev.rates[c] : 0 })).filter((r) => isFinite(r.v)) };
}

/** Ajánlott: most futó műsorok azokon a csatornákon, amelyek a profil kedvelt kategóriáiba esnek, de még nem kedvencek. */
function recommend(n) {
  const p = store.profile;
  const t = Date.now();
  const cats = Object.entries(p.stats?.cat || {}).sort((a, b) => b[1] - a[1]).slice(0, 4).map((x) => x[0]);
  const skip = new Set([...(p.favorites || []), ...(p.recent || []).slice(0, 3)]);
  const watched = p.stats?.ch || {};
  return visible()
    .filter((c) => !skip.has(c.id) && epg.has(c.id))
    .map((c) => {
      const now = epg.now(c.id, t);
      if (!now?.cur) return null;
      const catHit = c.categories.some((x) => cats.includes(x)) ? 3 : 0;
      const film = /film|movie|mozi|sorozat|series/i.test(now.cur.category || '') ? 1 : 0;
      return { c, now, score: catHit + film + homeRank(c) + rankScore(c) / 100 + (watched[c.id] ? 1 : 0) - (1 - now.progress) * 0 };
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score)
    .slice(0, n);
}

Object.assign(UNITS, {
  clock: {
    title: 'Óra és névnap',
    link: null,
    mobile: 200,
    render(b, { w, h }) {
      const d = new Date();
      const nd = lazy('nameday', loadNamedays, rerenderUnit('clock'), 3 * 3600e3);
      const big = Math.max(28, Math.min(h * 0.42, w * 0.26));
      return `<div class="d-clock">
        <div class="d-clock-time" style="font-size:${Math.round(big)}px">${fmtTime(d.getTime())}</div>
        <div class="d-clock-date">${d.toLocaleDateString('hu-HU', { year: h > 160 ? 'numeric' : undefined, month: 'long', day: 'numeric' })}, ${DAYS[d.getDay()]}</div>
        ${nd?.today ? `<div class="d-clock-nd">Névnap: <b>${esc(nd.today)}</b>${h > 170 && nd.tomorrow ? `<br><small class="muted">Holnap: ${esc(nd.tomorrow)}</small>` : ''}</div>` : ''}
      </div>`;
    },
  },
  fx: {
    title: 'Árfolyamok',
    link: null,
    mobile: 280,
    render(b, { w, h }) {
      const fx = lazy('fx', loadFx, rerenderUnit('fx'), 3 * 3600e3);
      if (!fx) return '<div class="spinner small"></div>';
      if (fx.error) return note(`Az árfolyamok nem érhetők el: ${esc(fx.error)}`);
      const wide = w >= 300;
      return `<ul class="d-fx d-trim">${fx.rows
        .map((r) => {
          const ch = r.p ? ((r.v - r.p) / r.p) * 100 : 0;
          return `<li><span class="fx-c">${r.c}</span>${wide ? `<span class="fx-n muted">${esc(r.n)}</span>` : ''}<b class="fx-v">${r.v.toLocaleString('hu-HU', { maximumFractionDigits: r.v < 50 ? 2 : 2, minimumFractionDigits: 2 })} Ft</b>${r.p ? `<span class="fx-d ${ch > 0.005 ? 'up' : ch < -0.005 ? 'down' : ''}">${ch > 0.005 ? '▲' : ch < -0.005 ? '▼' : '='} ${Math.abs(ch).toFixed(2)}%</span>` : ''}</li>`;
        })
        .join('')}</ul><p class="muted small d-fx-src">EKB referencia-árfolyam · ${esc(fx.date)}</p>`;
    },
  },
  sport: {
    title: 'Sport',
    link: ['#sportwatch', 'Sportfigyelő ›'],
    mobile: 380,
    render(b, { w, h }) {
      const ev = sportEventsCached();
      if (!ev || sportStale()) loadSportEvents().then(rerenderUnit('sport'), () => {});
      if (!ev) return '<div class="spinner small"></div>';
      if (!watchList().some((x) => x.on !== false)) return note('Nem követsz semmit. Bármilyen sportágat, bajnokságot vagy csapatot hozzáadhatsz: <a href="#sportwatch">Sportfigyelő megnyitása</a>');
      if (!ev.length) return note('Ezekben a napokban nincs esemény a követett sportágakban. <a href="#sportwatch">Sportfigyelő</a>');
      return `<ul class="d-sport d-trim">${ev
        .slice(0, 40)
        .map((e) => eventRowHtml(e, { logos: w >= 280, channels: store.settings.sportChannels !== false }))
        .join('')}</ul>`;
    },
  },
  recommend: {
    title: 'Ajánlott neked',
    link: ['#/tv', 'TV ›'],
    mobile: 320,
    render(b, { w, h }) {
      if (!epg.byChannel?.size) return note('A műsorújság betöltése…');
      const list = recommend(fit(h, 46) + 2);
      if (!list.length) return note('Most nincs ajánlat. Nézz egy kis tévét, és a kedvelt kategóriáid alapján ajánlunk.');
      return `<ul class="d-epg d-trim">${list
        .map(({ c, now }) => `<li><button class="d-row" data-play="${esc(c.id)}">
          <span class="d-logo" style="--h:${hashHue(c.name)}">${logoHtml(c, 'logo-sm')}</span>
          <span class="d-txt"><b>${esc(now.cur.title)}</b><small class="muted">${esc(c.name)} · ${fmtTime(now.cur.start)}–${fmtTime(now.cur.stop)}</small>
          <span class="bar"><i style="width:${(now.progress * 100).toFixed(1)}%"></i></span></span></button></li>`)
        .join('')}</ul>`;
    },
  },
});

// ---------------------------------------------------------------------------
// Még több egység (alapból kikapcsolva – Testreszabás → Hozzáadás)
// ---------------------------------------------------------------------------
const soonChannels = () => {
  const favs = favChannels();
  if (favs.length >= 5) return favs;
  const extra = visible().filter((c) => homeRank(c) === 2 && epg.has(c.id) && !favs.includes(c)).sort((a, b) => rankScore(b) - rankScore(a)).slice(0, 30);
  return [...favs, ...extra];
};
const FILM_RX = /film|movie|mozi|thriller|vígjáték|dráma|akció|horror|romantikus/i;
let discoverId = '';
const vp = (k) => store.profile.vodProgress?.[k];

/** Sorozatok, ahol az utoljára nézett rész után van még meg nem nézett rész. */
function newEpisodes() {
  const out = [];
  for (const lib of [vod, own]) {
    if (!lib.ready) continue;
    for (const s of lib.series) {
      const p = vp(s.id);
      if (!p?.last) continue;
      const i = s.episodes.findIndex((e) => e.key === p.last);
      if (i < 0) continue;
      const rest = s.episodes.slice(i + 1).filter((e) => e.season !== 0 && !vp(e.key)?.done);
      if (rest.length) out.push({ x: s, t: p.t || 0, sub: `${rest.length} új rész` });
    }
  }
  return out.sort((a, b) => b.t - a.t);
}

async function loadSun() {
  const loc = await weatherLoc();
  const [f, a] = await Promise.all([
    cacheJson(`https://api.open-meteo.com/v1/forecast?latitude=${loc.lat}&longitude=${loc.lon}&daily=sunrise,sunset,uv_index_max,daylight_duration&timezone=auto&forecast_days=2`, 3),
    cacheJson(`https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${loc.lat}&longitude=${loc.lon}&current=european_aqi,pm10,pm2_5,ozone&timezone=auto`, 1).catch(() => null),
  ]);
  return { loc, d: f.daily || {}, air: a?.current || null };
}
const AQI = [[20, 'kiváló', '#2e9e53'], [40, 'jó', '#6fbf3a'], [60, 'közepes', '#e8c32e'], [80, 'gyenge', '#e8873a'], [100, 'rossz', '#d63b3b'], [1e9, 'nagyon rossz', '#8e2a6e']];
const UVS = [[3, 'alacsony'], [6, 'mérsékelt'], [8, 'magas'], [11, 'nagyon magas'], [99, 'extrém']];
const hm = (iso) => (iso ? iso.slice(11, 16) : '–');

Object.assign(UNITS, {
  watchlist: {
    title: 'Megnézendő',
    link: ['#/vod?watchlist=1', 'Összes ›'],
    mobile: 300,
    render(b, { w, h }) {
      const items = (store.profile.watchlist || []).map((id) => findItem(id)).filter(Boolean).map((x) => ({ x }));
      if (!items.length) return note(vod.ready || !vodLists().length ? 'Még üres. A filmek, sorozatok adatlapján a <b>+ Megnézendő</b> gombbal tehetsz ide.' : 'A VOD-listák betöltése…');
      return posterGrid(items.slice(0, 8), w, h);
    },
  },
  newep: {
    title: 'Új részek',
    link: ['#/vod?continue=1', 'VOD ›'],
    mobile: 300,
    render(b, { w, h }) {
      const items = newEpisodes();
      if (!items.length) return note(vod.ready || !vodLists().length ? 'A nézett sorozataidban nincs még meg nem nézett rész.' : 'A VOD-listák betöltése…');
      return posterGrid(items.slice(0, 8), w, h);
    },
  },
  soon: {
    title: 'Hamarosan kezdődik',
    link: ['#/guide', 'Műsorújság ›'],
    mobile: 320,
    render(b, { w, h }) {
      if (!epg.byChannel?.size) return note('A műsorújság betöltése…');
      const t = Date.now();
      const items = [];
      for (const ch of soonChannels()) for (const p of epg.range(ch.id, t, t + 75 * 60e3)) if (p.start > t && p.start < t + 75 * 60e3) items.push({ ch, p });
      items.sort((a, b) => a.p.start - b.p.start);
      if (!items.length) return note('A következő órában nem kezdődik műsor a kedvenc csatornáidon.');
      return `<ul class="d-tonight d-trim">${items
        .slice(0, fit(h, 40))
        .map(({ ch, p }) => `<li><button class="d-row" data-prog="${esc(ch.id)}|${p.start}">
          <span class="d-time">${fmtTime(p.start)}</span>
          <span class="d-txt"><b>${esc(p.title)}</b><small class="muted">${esc(ch.name)} · ${Math.max(1, Math.round((p.start - t) / 60e3))} perc múlva</small></span>
        </button>${remBtn(ch.id, p.start)}</li>`)
        .join('')}</ul>`;
    },
  },
  movies: {
    title: 'Ma esti filmek',
    link: ['#/guide', 'Műsorújság ›'],
    mobile: 340,
    render(b, { w, h }) {
      if (!epg.byChannel?.size) return note('A műsorújság betöltése…');
      const now = Date.now();
      const d = new Date();
      const from = Math.max(now - 15 * 60e3, new Date(d.getFullYear(), d.getMonth(), d.getDate(), 18, 0).getTime());
      const to = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1, 1, 0).getTime();
      const chans = [...new Set([...favChannels(), ...visible().filter((c) => homeRank(c) >= 1 && epg.has(c.id)).sort((a, b) => rankScore(b) - rankScore(a)).slice(0, 60)])];
      const items = [];
      for (const ch of chans) for (const p of epg.range(ch.id, from, to)) if (p.start >= from && p.stop - p.start >= 70 * 60e3 && /film|movie|mozi/i.test(`${p.category || ''}`)) items.push({ ch, p });
      items.sort((a, b) => a.p.start - b.p.start);
      if (!items.length) return note('Ma estére nincs film a műsorújságban (a kedvenc és a hazai csatornákon).');
      return `<ul class="d-tonight d-trim">${items
        .slice(0, fit(h, 40))
        .map(({ ch, p }) => `<li><button class="d-row" data-prog="${esc(ch.id)}|${p.start}">
          <span class="d-time ${p.start <= now ? 'live' : ''}">${p.start <= now ? 'MOST' : fmtTime(p.start)}</span>
          <span class="d-txt"><b>${esc(p.title)}</b><small class="muted">${esc(ch.name)} · ${Math.round((p.stop - p.start) / 60e3)} perc</small></span>
        </button>${p.start > now ? remBtn(ch.id, p.start) : ''}</li>`)
        .join('')}</ul>`;
    },
  },
  watchtime: {
    title: 'Nézési idő',
    link: ['#/stats', 'Statisztika ›'],
    mobile: 240,
    render(b, { w, h }) {
      const s = store.profile.stats;
      const key = (dd) => `${dd.getFullYear()}-${String(dd.getMonth() + 1).padStart(2, '0')}-${String(dd.getDate()).padStart(2, '0')}`;
      const days = Array.from({ length: 7 }, (_, i) => {
        const dd = new Date();
        dd.setDate(dd.getDate() - (6 - i));
        return { dd, t: (s?.days?.[key(dd)] || 0) / 60 };
      });
      const fmt = (m) => (m >= 60 ? `${Math.floor(m / 60)} ó ${Math.round(m % 60)} p` : `${Math.round(m)} perc`);
      const max = Math.max(30, ...days.map((x) => x.t));
      const left = store.profile.kids && store.profile.dailyLimit ? watchLeft() : null;
      return `<div class="d-wt">
        <div class="d-wt-big"><b>${fmt(days[6].t)}</b><small class="muted">ma${left !== null ? ` · még ${Math.round(left)} perc maradt` : ''}</small></div>
        <div class="muted small">A héten: ${fmt(days.reduce((n, x) => n + x.t, 0))}</div>
        ${h > 130 ? `<div class="d-wt-bars">${days.map((x) => `<span title="${x.dd.toLocaleDateString('hu-HU')}: ${fmt(x.t)}"><i style="height:${Math.max(2, (x.t / max) * 100).toFixed(1)}%"></i><small>${DAYS_SHORT[x.dd.getDay()]}</small></span>`).join('')}</div>` : ''}
      </div>`;
    },
  },
  discover: {
    title: 'Fedezd fel',
    link: null,
    mobile: 260,
    render(b, { w, h }) {
      if (!epg.byChannel?.size) return note('A műsorújság betöltése…');
      const favs = new Set(store.profile.favorites);
      const pool = visible().filter((c) => !favs.has(c.id) && c.logo && epg.now(c.id, Date.now())?.cur && homeRank(c) >= 1);
      const list = pool.length ? pool : visible().filter((c) => epg.now(c.id, Date.now())?.cur);
      if (!list.length) return note('Most nincs ajánlható csatorna.');
      let ch = list.find((c) => c.id === discoverId);
      if (!ch) {
        ch = list[Math.floor(Math.random() * list.length)];
        discoverId = ch.id;
      }
      const n = epg.now(ch.id, Date.now());
      return `<div class="d-disc">
        <button class="d-disc-logo" data-play="${esc(ch.id)}" style="--h:${hashHue(ch.name)}" title="${esc(ch.name)} lejátszása">${logoHtml(ch, 'logo-sm')}</button>
        <div class="d-disc-txt"><b>${esc(ch.name)}</b>
          <span class="d-now"><span class="now-label">MOST</span> ${esc(n.cur.title)}</span>
          <span class="bar"><i style="width:${(n.progress * 100).toFixed(1)}%"></i></span>
          <span class="inline"><button class="btn small primary" data-play="${esc(ch.id)}">${ICON.play} Nézem</button><button class="btn small" data-discover>Másikat</button></span></div>
      </div>`;
    },
  },
  sun: {
    title: 'Nap és levegő',
    link: ['#/settings?section=dashboard', 'Település ›'],
    mobile: 240,
    render(b, { w, h }) {
      const x = lazy('sun', loadSun, rerenderUnit('sun'), 3 * 3600e3);
      if (!x) return '<div class="spinner small"></div>';
      if (x.error) return note(`Nem érhető el: ${esc(x.error)}`);
      const uv = x.d.uv_index_max?.[0];
      const uvTxt = uv != null ? (UVS.find((u) => uv < u[0]) || UVS[UVS.length - 1])[1] : '';
      const aqi = x.air?.european_aqi;
      const aq = aqi != null ? AQI.find((q) => aqi <= q[0]) : null;
      const len = x.d.daylight_duration?.[0];
      return `<ul class="d-sun">
        <li><span class="d-sun-ico">🌅</span><span>Napkelte</span><b>${hm(x.d.sunrise?.[0])}</b></li>
        <li><span class="d-sun-ico">🌇</span><span>Napnyugta</span><b>${hm(x.d.sunset?.[0])}</b></li>
        ${len ? `<li><span class="d-sun-ico">☀️</span><span>Nappal</span><b>${Math.floor(len / 3600)} ó ${Math.round((len % 3600) / 60)} p</b></li>` : ''}
        ${uv != null ? `<li><span class="d-sun-ico">🕶️</span><span>UV-index</span><b>${uv.toFixed(1)} <small class="muted">${uvTxt}</small></b></li>` : ''}
        ${aq ? `<li><span class="d-sun-ico">🍃</span><span>Levegő</span><b style="color:${aq[2]}">${esc(aq[1])} <small class="muted">(${Math.round(aqi)}${x.air.pm2_5 != null ? `, PM2,5: ${Math.round(x.air.pm2_5)}` : ''})</small></b></li>` : ''}
      </ul><p class="muted small d-sun-src">${esc(x.loc.name)} · Open-Meteo</p>`;
    },
  },
  notes: {
    title: 'Jegyzet',
    link: null,
    mobile: 240,
    render() {
      return `<textarea class="d-note-area" placeholder="Ide írhatsz: mit nézz meg, bevásárlólista, emlékeztető…" aria-label="Jegyzet">${esc(store.profile.dashNote || '')}</textarea>`;
    },
  },
});
// a „Fedezd fel” másik csatornája, a jegyzet mentése
document.addEventListener('click', (e) => {
  if (!e.target.closest('[data-discover]')) return;
  discoverId = '__';
  rerenderUnit('discover')();
});
document.addEventListener(
  'input',
  debounce((e) => {
    if (!e.target.matches?.('.d-note-area')) return;
    store.profile.dashNote = e.target.value.slice(0, 5000);
    store.save();
  }, 400)
);

// ---------------------------------------------------------------------------
// Elrendezés: oszlopok × sorok rácsa, az egységek sorrendje és mérete profilonként.
// Az egységek mindig az első szabad helyre kerülnek; ami nem fér el, azt a szerkesztő nem engedi.
// ---------------------------------------------------------------------------
const DEFAULT_DASH = { cols: 4, rows: 2, units: [{ id: 'weather', w: 1, h: 1 }, { id: 'epg', w: 2, h: 1 }, { id: 'rss', w: 1, h: 2 }, { id: 'tonight', w: 1, h: 1 }, { id: 'tv', w: 1, h: 1 }, { id: 'vod', w: 1, h: 1 }] };
const DEFAULT_KIDS = { cols: 3, rows: 2, units: [{ id: 'weather', w: 1, h: 1 }, { id: 'epg', w: 2, h: 1 }, { id: 'tonight', w: 1, h: 1 }, { id: 'tv', w: 1, h: 1 }, { id: 'vod', w: 1, h: 1 }] };
const LIMITS = { cols: [1, 5], rows: [1, 4] };
const allowed = (id) => UNITS[id] && !(store.profile.kids && UNITS[id].kids === false);
const U = (id, w = 1, h = 1) => ({ id, w, h });
/** Kész elrendezések (a testreszabásnál betölthetők; napszak szerinti váltásnál a reggeli és az esti). */
export const PRESETS = {
  alap: { name: 'Alap', cfg: DEFAULT_DASH },
  reggel: { name: 'Reggeli', cfg: { cols: 3, rows: 2, units: [U('weather', 1, 2), U('rss', 1, 2), U('clock'), U('fx')] } },
  este: { name: 'Esti tévézés', cfg: { cols: 3, rows: 2, units: [U('epg', 2), U('tonight', 1, 2), U('tv'), U('vod')] } },
  sport: { name: 'Sport', cfg: { cols: 3, rows: 2, units: [U('sport', 2, 2), U('tonight'), U('rss')] } },
  hirek: { name: 'Hírek és tőzsde', cfg: { cols: 4, rows: 2, units: [U('rss', 2, 2), U('weather'), U('clock'), U('fx'), U('epg')] } },
  egyszeru: { name: 'Egyszerű', cfg: { cols: 2, rows: 1, units: [U('tv'), U('weather')] } },
};
const KIDS_PRESETS = { alap: { name: 'Alap', cfg: DEFAULT_KIDS }, este: PRESETS.este, egyszeru: PRESETS.egyszeru };
const presets = () => (store.profile.kids ? KIDS_PRESETS : PRESETS);
/** Napszak szerinti váltásnál: reggel 5–10 óráig a reggeli, 18 órától az esti elrendezés. */
const dayPart = (h = new Date().getHours()) => (h >= 5 && h < 10 ? 'reggel' : h >= 18 ? 'este' : '');

function dashCfg() {
  const p = store.profile;
  const part = !editing && p.dashAuto && dayPart();
  const c = part && presets()[part] ? presets()[part].cfg : p.dash && Array.isArray(p.dash.units) ? p.dash : p.kids ? DEFAULT_KIDS : DEFAULT_DASH;
  return { cols: c.cols, rows: c.rows, units: c.units.filter((u) => allowed(u.id)).map((u) => ({ ...u })) };
}

/** Első-szabad-hely elhelyezés; a nem férő egységek `fail`-t kapnak. */
export function packDash({ cols, rows, units }) {
  const occ = Array.from({ length: rows }, () => Array(cols).fill(false));
  const free = (r, c, w, h) => {
    for (let y = r; y < r + h; y++) for (let x = c; x < c + w; x++) if (occ[y][x]) return false;
    return true;
  };
  const out = units.map((u) => {
    const w = Math.min(u.w, cols), h = Math.min(u.h, rows);
    for (let r = 0; r + h <= rows; r++)
      for (let c = 0; c + w <= cols; c++)
        if (free(r, c, w, h)) {
          for (let y = r; y < r + h; y++) for (let x = c; x < c + w; x++) occ[y][x] = true;
          return { ...u, w, h, r, c };
        }
    return { ...u, w, h, fail: true };
  });
  const empty = [];
  occ.forEach((row, r) => row.forEach((o, c) => !o && empty.push({ r, c })));
  return { units: out, empty };
}

const STACKED = '(max-width: 760px), (orientation: portrait) and (max-width: 1000px)';
const stacked = () => matchMedia(STACKED).matches;

/** A rács kitölti a képernyő maradékát – minden egység egy oldalon látszik. */
function fitDash(box) {
  if (stacked()) return (box.style.height = '');
  const rows = Number(box.dataset.rows) || 2;
  const top = box.getBoundingClientRect().top + (window.scrollY || 0);
  const min = rows * 130;
  box.style.height = `${Math.max(min, window.innerHeight - top - 4)}px`;
  // az oldal alsó margója se okozzon görgetést
  const over = document.documentElement.scrollHeight - window.innerHeight;
  if (over > 0) box.style.height = `${Math.max(min, box.offsetHeight - over)}px`;
}

/** Egy egység tartalmának (újra)rajzolása a kártya aktuális méretével. */
function renderUnit(card) {
  const u = UNITS[card.dataset.unit];
  const b = card.querySelector('.dc-body');
  if (!u || !b) return;
  const size = { w: b.clientWidth, h: b.clientHeight };
  if (!size.w || !size.h) return;
  b.innerHTML = u.render(b, size);
  u.after?.(b);
  // A listák bővebben készülnek; ami nem fér ki, az a végükről lekerül (a tényleges magasság szerint)
  const list = b.querySelector('.d-trim');
  if (list) for (let n = list.children.length; n > 1 && b.scrollHeight > b.clientHeight + 1; n--) list.lastElementChild.remove();
  b.dataset.size = `${size.w}x${size.h}`;
}
const renderAll = (box, ids) => box.querySelectorAll('.dcard[data-unit]').forEach((c) => (!ids || ids.includes(c.dataset.unit)) && renderUnit(c));

// ---------------------------------------------------------------------------
// Az oldal
// ---------------------------------------------------------------------------
const greeting = () => {
  const h = new Date().getHours();
  return h < 9 ? 'Jó reggelt' : h < 18 ? 'Szép napot' : 'Jó estét';
};
let editing = false;
let lastPart = '';
let ro = null;

export function renderDashboard(view) {
  const p = store.profile;
  const d = new Date();
  if (/[?&]edit=1/.test(location.hash)) editing = true;
  lastPart = dayPart();
  const cfg = dashCfg();
  const packed = packDash(cfg);
  const placed = packed.units.filter((u) => !u.fail);
  const hidden = Object.keys(UNITS).filter((id) => allowed(id) && !cfg.units.some((u) => u.id === id));
  const ED = (a, t, ico, dis = false) => `<button class="ed-btn" data-ed="${a}" title="${t}" ${dis ? 'disabled' : ''}>${ico}</button>`;

  view.innerHTML = `<div class="page dash-page ${editing ? 'editing' : ''}">
    <div class="dash-head"><h1>${esc(greeting())}, ${esc(p.name)}!</h1><span class="muted">${d.toLocaleDateString('hu-HU', { month: 'long', day: 'numeric' })}, ${DAYS[d.getDay()]}</span>
      <button class="btn small dash-edit-btn" data-ed="toggle">${editing ? `${ICON.check} Kész` : 'Testreszabás'}</button></div>
    ${
      editing
        ? `<div class="dash-tools">
        <span class="dt-group">Oszlopok <button class="ed-btn" data-ed="cols-" ${cfg.cols <= LIMITS.cols[0] ? 'disabled' : ''}>−</button><b>${cfg.cols}</b><button class="ed-btn" data-ed="cols+" ${cfg.cols >= LIMITS.cols[1] ? 'disabled' : ''}>+</button></span>
        <span class="dt-group">Sorok <button class="ed-btn" data-ed="rows-" ${cfg.rows <= LIMITS.rows[0] ? 'disabled' : ''}>−</button><b>${cfg.rows}</b><button class="ed-btn" data-ed="rows+" ${cfg.rows >= LIMITS.rows[1] ? 'disabled' : ''}>+</button></span>
        <span class="dt-group dt-add">${hidden.length ? 'Hozzáadás:' : 'Minden egység látható.'} ${hidden.map((id) => `<button class="btn small" data-add="${id}">${ICON.plus} ${esc(UNITS[id].title)}</button>`).join('')}</span>
        <button class="btn small" data-ed="reset">Alapértelmezett</button>
        <span class="dt-group dt-presets">Kész elrendezés: ${Object.entries(presets())
          .map(([k, v]) => `<button class="btn small" data-preset="${k}">${esc(v.name)}</button>`)
          .join('')}</span>
        <label class="dt-group"><input type="checkbox" class="switch" data-ed-auto ${p.dashAuto ? 'checked' : ''} /> Napszak szerint váltson (reggel 5–10: Reggeli, 18 órától: Esti tévézés, napközben ez)</label>
      </div>
      <p class="muted small dash-hint">Áthúzással is rendezhetsz. Minden egy képernyőre fér – ami nem férne el, azt nem engedi; az egységek a méretükhöz igazítják, mennyit mutatnak.</p>`
        : ''
    }
    <div class="dash" data-cols="${cfg.cols}" data-rows="${cfg.rows}" style="--cols:${cfg.cols};--rows:${cfg.rows}">
      ${placed
        .map((u, i) => {
          const U = UNITS[u.id];
          return `<section class="dcard dc-${u.id}" data-unit="${u.id}" data-i="${i}" ${editing && !IS_TV ? 'draggable="true"' : ''} style="grid-column:${u.c + 1} / span ${u.w};grid-row:${u.r + 1} / span ${u.h};--mob:${U.mobile}px">
          <h2 class="dc-title"><span>${esc(U.title)}</span> ${!editing && U.link ? `<a href="${U.link[0]}" class="dc-link">${U.link[1]}</a>` : ''}</h2>
          <div class="dc-body"></div>
          ${
            editing
              ? `<div class="ed-panel">
              <span class="ed-row" title="Sorrend">${ED('left', 'Előrébb', ICON.left, i === 0)}${ED('right', 'Hátrébb', ICON.right, i === placed.length - 1)}<i></i>${ED('hide', 'Elrejtés', ICON.close)}</span>
              <span class="ed-row" title="Szélesség (oszlop)"><span>↔</span>${ED('w-', 'Keskenyebb', '−', u.w <= 1)}<b>${u.w}</b>${ED('w+', 'Szélesebb', '+', u.w >= cfg.cols)}</span>
              <span class="ed-row" title="Magasság (sor)"><span>↕</span>${ED('h-', 'Alacsonyabb', '−', u.h <= 1)}<b>${u.h}</b>${ED('h+', 'Magasabb', '+', u.h >= cfg.rows)}</span>
            </div>`
              : ''
          }
        </section>`;
        })
        .join('')}
      ${editing ? packed.empty.map((e) => `<div class="dash-empty" style="grid-column:${e.c + 1};grid-row:${e.r + 1}">Üres hely</div>`).join('') : ''}
    </div>
  </div>`;

  const box = view.querySelector('.dash');
  fitDash(box);
  renderAll(box);

  // Méretváltozáskor (ablak, elrendezés) csak az érintett egység rajzolódik újra
  ro?.disconnect();
  if (window.ResizeObserver) {
    ro = new ResizeObserver((ents) =>
      requestAnimationFrame(() =>
        ents.forEach((e) => {
          const b = e.target;
          if (b.isConnected && b.dataset.size !== `${b.clientWidth}x${b.clientHeight}`) renderUnit(b.closest('.dcard'));
        })
      )
    );
    box.querySelectorAll('.dc-body').forEach((b) => ro.observe(b));
  }

  // Időjárás és hírek a háttérben (gyorsítótárból azonnal, ha friss)
  if (placed.some((u) => u.id === 'weather'))
    loadWeather()
      .then((w) => {
        weatherCache = w;
        weatherErr = null;
      })
      .catch((err) => (weatherErr = err.message || String(err)))
      .finally(() => box.isConnected && renderAll(box, ['weather']));
  if (placed.some((u) => u.id === 'rss'))
    loadNews().then((n) => {
      newsCache = n;
      if (box.isConnected) renderAll(box, ['rss']);
    });
  if (!vod.ready && vodLists().length && placed.some((u) => u.id === 'vod')) loadVod().then(() => box.isConnected && renderAll(box, ['vod']));

  const page = view.querySelector('.dash-page');
  page.addEventListener('change', (e) => {
    if (!e.target.matches('[data-ed-auto]')) return;
    p.dashAuto = e.target.checked;
    store.save();
    toast(p.dashAuto ? 'A főoldal napszak szerint vált' : 'A főoldal mindig a saját elrendezésedet mutatja');
  });
  page.addEventListener('click', (e) => {
    const pre = e.target.closest('[data-preset]');
    if (pre) {
      const c = presets()[pre.dataset.preset]?.cfg;
      if (!c) return;
      p.dash = { cols: c.cols, rows: c.rows, units: c.units.filter((u) => allowed(u.id)).map((u) => ({ ...u })) };
      store.save();
      toast(`Elrendezés: ${presets()[pre.dataset.preset].name}`);
      renderDashboard(view);
      view.querySelector(`[data-preset="${pre.dataset.preset}"]`)?.focus();
      return;
    }
    const ed = e.target.closest('[data-ed]');
    const add = e.target.closest('[data-add]');
    if (ed || add) {
      e.preventDefault();
      return editAction(view, ed?.dataset.ed, ed?.closest('.dcard')?.dataset.unit, add?.dataset.add);
    }
    if (editing) {
      // szerkesztés közben a kártyák tartalma nem indít semmit
      if (e.target.closest('.dc-body, .dc-link')) e.preventDefault();
      return;
    }
    const pl = e.target.closest('[data-play]');
    const pr = e.target.closest('[data-prog]');
    const rm = e.target.closest('[data-rem]');
    const vd = e.target.closest('[data-vod]');
    const nw = e.target.closest('[data-news]');
    if (rm) {
      const [id, start] = rm.dataset.rem.split('|');
      const prog = epg.list(id).find((x) => x.start === Number(start)) || store.profile.reminders.find((r) => r.channelId === id && r.start === Number(start));
      if (!prog) return;
      const on = store.toggleReminder(id, prog);
      rm.classList.toggle('on', !!on);
      toast(on ? `Emlékeztető: ${prog.title} (${fmtTime(prog.start)})` : 'Emlékeztető törölve');
    } else if (pl) {
      const ch = catalog.byId.get(pl.dataset.play);
      if (ch) player.play(ch);
    } else if (pr) {
      const [id, start] = pr.dataset.prog.split('|');
      const ch = catalog.byId.get(id);
      const prog = epg.list(id).find((x) => x.start === Number(start));
      if (ch && prog) openProgram(ch, prog);
      else if (ch) player.play(ch);
    } else if (vd) {
      const x = vod.byId.get(vd.dataset.vod) || own.byId.get(vd.dataset.vod);
      if (x) playVod(x);
    } else if (nw && newsCache) {
      const n = newsCache[Number(nw.dataset.news)];
      if (n) openNews(n);
    }
  });

  // Áthúzás (egér): a húzott egység a cél elé kerül
  if (editing && !IS_TV) {
    let dragId = null;
    box.addEventListener('dragstart', (e) => {
      const c = e.target.closest('.dcard');
      dragId = c?.dataset.unit;
      e.dataTransfer?.setData('text/plain', dragId || '');
      c?.classList.add('dragging');
    });
    box.addEventListener('dragend', () => box.querySelectorAll('.dragging, .drop-to').forEach((x) => x.classList.remove('dragging', 'drop-to')));
    box.addEventListener('dragover', (e) => {
      const c = e.target.closest('.dcard');
      if (!dragId || !c || c.dataset.unit === dragId) return;
      e.preventDefault();
      box.querySelectorAll('.drop-to').forEach((x) => x !== c && x.classList.remove('drop-to'));
      c.classList.add('drop-to');
    });
    box.addEventListener('drop', (e) => {
      const c = e.target.closest('.dcard');
      if (!dragId || !c) return;
      e.preventDefault();
      editAction(view, 'move', dragId, null, c.dataset.unit);
      dragId = null;
    });
  }
}

/** Szerkesztő műveletek – minden változás előtt ellenőrzi, hogy minden kifér-e. */
function editAction(view, a, id, addId, targetId) {
  const p = store.profile;
  if (a === 'toggle') {
    editing = !editing;
    if (!editing && /edit=1/.test(location.hash)) history.replaceState(null, '', '#/home');
    renderDashboard(view);
    view.querySelector('.dash-edit-btn')?.focus();
    return;
  }
  const cfg = dashCfg();
  const units = cfg.units;
  const i = units.findIndex((u) => u.id === id);
  const u = units[i];
  let msg = '';
  if (a === 'reset') {
    delete p.dash;
    store.save();
    toast('Alapértelmezett elrendezés');
    return renderDashboard(view);
  }
  if (addId) units.push({ id: addId, w: 1, h: 1 });
  else if (a === 'cols-' || a === 'rows-' || a === 'cols+' || a === 'rows+') {
    const k = a.slice(0, 4);
    cfg[k] = Math.max(LIMITS[k][0], Math.min(LIMITS[k][1], cfg[k] + (a.endsWith('+') ? 1 : -1)));
    units.forEach((x) => {
      x.w = Math.min(x.w, cfg.cols);
      x.h = Math.min(x.h, cfg.rows);
    });
    // a rács kisebbítésekor a nem férő egységek elrejtődnek
    const res = packDash(cfg);
    const out = res.units.filter((x) => x.fail);
    if (out.length) {
      cfg.units = units.filter((x) => !out.some((o) => o.id === x.id));
      msg = `Elrejtve, mert nem fér el: ${out.map((o) => UNITS[o.id].title).join(', ')}`;
    }
  } else if (u) {
    if (a === 'left' && i > 0) [units[i - 1], units[i]] = [units[i], units[i - 1]];
    else if (a === 'right' && i < units.length - 1) [units[i + 1], units[i]] = [units[i], units[i + 1]];
    else if (a === 'move' && targetId) {
      const [m] = units.splice(i, 1);
      units.splice(units.findIndex((x) => x.id === targetId), 0, m);
    } else if (a === 'w-') u.w = Math.max(1, u.w - 1);
    else if (a === 'w+') u.w = Math.min(cfg.cols, u.w + 1);
    else if (a === 'h-') u.h = Math.max(1, u.h - 1);
    else if (a === 'h+') u.h = Math.min(cfg.rows, u.h + 1);
    else if (a === 'hide') units.splice(i, 1);
  }
  if (packDash(cfg).units.some((x) => x.fail)) {
    toast(addId ? 'Nincs elég hely. Előbb kisebbíts vagy rejts el egy egységet, vagy növeld a rácsot.' : 'Így nem férne el minden egy oldalon. Előbb kisebbíts vagy rejts el egy másik egységet.');
    return;
  }
  p.dash = { cols: cfg.cols, rows: cfg.rows, units: cfg.units.map(({ id: uid, w, h }) => ({ id: uid, w, h })) };
  store.save();
  if (msg) toast(msg);
  renderDashboard(view);
  // a kijelölés maradjon ugyanazon a gombon (távirányító)
  const sel = addId ? `[data-unit="${addId}"] [data-ed="hide"]` : id ? `[data-unit="${id}"] [data-ed="${a}"]:not([disabled])` : `[data-ed="${a}"]:not([disabled])`;
  (view.querySelector(sel) || view.querySelector(id ? `[data-unit="${id}"] .ed-btn:not([disabled])` : '.dash-tools .ed-btn:not([disabled])'))?.focus();
}

// ---------------------------------------------------------------------------
// Beállítások → Megjelenés és főoldal → Főoldal: elrendezés, település (időjárás), megjelenés, hírforrások (RSS)
// ---------------------------------------------------------------------------
export function renderDashSettings(box) {
  const s = store.settings;
  const list = () => s.rssFeeds ?? DEFAULT_FEEDS.map((f) => ({ ...f }));
  const draw = () => {
    box.innerHTML = `<h2>Főoldal <button class="help-link" data-help="dashboard" title="Súgó">?</button></h2>
      <div class="setting stack"><span><b>Elrendezés</b><small>Az egységek (időjárás, műsor, hírek, folytatás…) sorrendje, mérete, ki-be kapcsolása és a rács oszlopai, sorai – profilonként.</small></span>
        <span class="inline"><a class="btn small" href="#/home?edit=1">Főoldal testreszabása</a></span></div>
      <label class="setting stack"><span><b>Település az időjáráshoz</b><small>${s.weatherLoc ? esc([s.weatherLoc.name, s.weatherLoc.admin, s.weatherLoc.country].filter(Boolean).join(', ')) : 'Budapest'}</small></span>
        <span class="inline"><input class="input" data-d="city" value="${esc(s.weatherCity || 'Budapest')}" placeholder="pl. Debrecen" /><button class="btn small" data-d="find">Keresés</button></span></label>
      <div class="d-cities"></div>
      <h3>A mai időjárás megjelenése</h3>
      <p class="muted small">Órás bontás, ha kifér a kártyára; keskenyebb helyen két-három óránként. Kis kártyán a heti előrejelzés, még kisebben a diagram is elmarad.</p>
      <div class="w-styles">${WEATHER_STYLES.map(([k, l]) => `<button class="w-style ${weatherStyle() === k ? 'sel' : ''}" data-ws="${k}" aria-pressed="${weatherStyle() === k}"><span class="ws-prev">${stylePreview(k)}</span><span>${esc(l)}</span></button>`).join('')}</div>
      <h3>Sport</h3>
      <p class="muted small">A <i>Sport</i> egység bármilyen sportág, bajnokság, verseny vagy csapat eseményeit mutatja – ESPN, TheSportsDB, műsorújság és naptár (ICS) forrásokból, csatornaajánlással.</p>
      <div class="inline"><a class="btn small" href="#sportwatch">Sportfigyelő megnyitása</a></div>
      <h3>Hírforrások (RSS / Atom)</h3>
      <p class="muted small">A főoldalon a bekapcsolt forrásokból a legfrissebb hírek látszanak – annyi, amennyi kifér.</p>
      <ul class="src-list">${list()
        .map((f, i) => `<li data-f="${i}"><input type="checkbox" class="switch" data-d="toggle" ${f.enabled !== false ? 'checked' : ''} aria-label="Bekapcsolva" />
          <span><b>${esc(f.name || f.url)}</b><small>${esc(f.url)}</small></span>
          <button class="btn small danger" data-d="del">Törlés</button></li>`)
        .join('') || '<li class="muted">Nincs hírforrás.</li>'}</ul>
      <div class="inline"><input class="input" data-d="url" placeholder="https://… RSS-cím" /><input class="input" data-d="name" placeholder="Név (nem kötelező)" />
        <button class="btn small" data-d="add">${ICON.plus} Hozzáadás</button><button class="btn small" data-d="reset">Alapértelmezett források</button></div>`;
  };
  const save = (arr) => {
    s.rssFeeds = arr;
    newsCache = null;
    store.save();
    draw();
  };
  box.addEventListener('change', (e) => {
    if (e.target.dataset.d !== 'toggle') return;
    e.stopPropagation();
    const arr = list();
    arr[Number(e.target.closest('[data-f]').dataset.f)].enabled = e.target.checked;
    save(arr);
  });
  box.addEventListener('click', async (e) => {
    const ws = e.target.closest('[data-ws]')?.dataset.ws;
    if (ws) {
      e.stopPropagation();
      s.weatherStyle = ws;
      store.save();
      draw();
      box.querySelector(`[data-ws="${ws}"]`)?.focus();
      return;
    }
    const a = e.target.closest('[data-d]')?.dataset.d;
    if (!a || a === 'toggle' || a === 'city' || a === 'url' || a === 'name') return;
    e.stopPropagation();
    if (a === 'find') {
      const q = box.querySelector('[data-d="city"]').value.trim();
      if (!q) return;
      const out = box.querySelector('.d-cities');
      out.innerHTML = '<div class="spinner small"></div>';
      try {
        const hits = await geocode(q);
        out.innerHTML = hits.length
          ? hits.map((h, i) => `<button class="btn small" data-city="${i}">${esc([h.name, h.admin, h.country].filter(Boolean).join(', '))}</button>`).join(' ')
          : '<p class="muted small">Nincs ilyen település.</p>';
        out.onclick = (ev) => {
          const b = ev.target.closest('[data-city]');
          if (!b) return;
          const h = hits[Number(b.dataset.city)];
          s.weatherCity = h.name;
          s.weatherLoc = { ...h, query: h.name };
          weatherCache = null;
          store.save();
          toast(`Időjárás: ${h.name}`);
          draw();
        };
      } catch (err) {
        out.innerHTML = `<p class="muted small">Hiba: ${esc(err.message || err)}</p>`;
      }
    } else if (a === 'add') {
      const url = box.querySelector('[data-d="url"]').value.trim();
      const name = box.querySelector('[data-d="name"]').value.trim();
      if (!/^https?:\/\/\S+$/i.test(url)) return toast('Adj meg egy http(s) címet.');
      try {
        const { text } = await api.fetchText(url, { maxAgeHours: 0, force: true });
        const items = parseFeed(text, { url, name });
        if (!items.length) return toast('A címen nem található RSS / Atom hír.');
        save([...list(), { url, name: name || items[0].source, enabled: true }]);
        toast(`Hírforrás hozzáadva (${items.length} hír)`);
      } catch (err) {
        toast('Nem tölthető le: ' + (err.message || err));
      }
    } else if (a === 'del') {
      const arr = list();
      arr.splice(Number(e.target.closest('[data-f]').dataset.f), 1);
      save(arr);
    } else if (a === 'reset') save(DEFAULT_FEEDS.map((f) => ({ ...f })));
  });
  draw();
}

// Percenként frissül a műsorhoz kötött egységek tartalma; a kijelölés (távirányító) ugyanazon az elemen marad.
setInterval(() => {
  const box = document.querySelector('#view .dash');
  if (!box || player.active || editing) return;
  const f = box.contains(document.activeElement) ? document.activeElement : null;
  const key = f && ['play', 'prog', 'rem', 'vod', 'news'].map((k) => (f.dataset[k] !== undefined ? `[data-${k}="${CSS.escape(f.dataset[k])}"]` : '')).find(Boolean);
  if (store.profile.dashAuto && dayPart() !== lastPart) return renderDashboard(document.querySelector('#view'));
  // az élő előnézet közben az utoljára nézett csatorna kártyája marad
  renderAll(box, ['epg', 'tonight', 'reminders', 'favs', 'clock', 'recommend', 'soon', 'movies', 'watchtime', 'sport', ...(box.querySelector('.has-video') ? [] : ['tv'])]);
  if (key) box.querySelector(key)?.focus({ preventScroll: true });
}, 60e3);

// Az oldal elhagyásával a szerkesztés véget ér
window.addEventListener('hashchange', () => {
  if (/^#\/home/.test(location.hash)) return;
  editing = false;
  if (document.querySelector('.dc-tv .has-video')) stopPreview();
});

window.addEventListener(
  'resize',
  debounce(() => {
    const box = document.querySelector('#view .dash');
    if (box) fitDash(box);
  }, 150)
);

// a Sportfigyelő módosítása után (és 5 percenként a percenkénti frissítéssel) az események újratöltése
document.addEventListener('adas-sport-changed', () => loadSportEvents(true).then(rerenderUnit('sport'), () => {}));
setInterval(() => document.querySelector('#view .dc-sport') && loadSportEvents().then(rerenderUnit('sport'), () => {}), 5 * 60e3);
