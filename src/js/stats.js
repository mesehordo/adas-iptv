// Nézési statisztika profilonként: mennyit, mikor és mit néztél (csak ezen az eszközön tárolva).
import { $, esc, hashHue, toast, bus } from './util.js';
import { store } from './store.js';
import { catalog, categoryName } from './catalog.js';
import { player } from './player.js';
import { logoHtml, confirmDialog } from './components.js';

import { _t, LOCALE, weekdayNames } from './i18n.js';
const TICK = 15; // másodperc
const video = $('#video');
let lastKey = '';

const dayKey = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

function statsOf(p = store.profile) {
  if (!p.stats) p.stats = { since: Date.now(), days: {}, hours: Array(24).fill(0), ch: {}, vod: {}, cat: {}, plays: 0 };
  return p.stats;
}

function record(ch, sec) {
  const p = store.profile;
  if (!p || p.statsOff) return;
  const s = statsOf(p);
  const now = new Date();
  const dk = dayKey(now);
  s.days[dk] = (s.days[dk] || 0) + sec;
  s.hours[now.getHours()] += sec;
  const key = ch.vod ? 'v:' + ch.vod.item.id : 'c:' + ch.id;
  if (key !== lastKey) {
    lastKey = key;
    s.plays++;
  }
  if (ch.vod) {
    const it = ch.vod.item;
    const v = (s.vod[it.id] ||= { t: 0, title: it.title, type: it.type, poster: it.poster || '' });
    v.t += sec;
    v.last = Date.now();
  } else {
    s.ch[ch.id] = (s.ch[ch.id] || 0) + sec;
    const cats = ch.categories.length ? ch.categories : ['general'];
    for (const c of cats) s.cat[c] = (s.cat[c] || 0) + sec / cats.length;
  }
  // 400 napnál régebbi napok törlése
  const keys = Object.keys(s.days);
  if (keys.length > 400) keys.sort().slice(0, keys.length - 400).forEach((k) => delete s.days[k]);
  store.save();
}

setInterval(() => {
  const ch = player.channel;
  if (!player.active || !ch || document.hidden) return;
  const playing = player.castHooks?.active ? !player.castHooks.paused : player.engine?.started && !video.paused;
  if (playing) record(ch, TICK);
}, TICK * 1000);
bus.on('player-closed', () => (lastKey = ''));

// Hetente egyszer szól, ha kedvenc csatornák nem működtek (részletek: Statisztika)
setTimeout(() => {
  const p = store.profile;
  if (!p || !catalog.ready || Date.now() - (store.settings.brokenNotice || 0) < 7 * 864e5) return;
  const n = (p.favorites || []).map((id) => catalog.byId.get(id)).filter((ch) => ch?.streams.length && ch.streams.every((st) => store.healthOf(st.url)?.ok === false)).length;
  if (!n) return;
  store.settings.brokenNotice = Date.now();
  store.save();
  toast(`${_t('A héten {n} kedvenc csatornád nem működött.', { n })}`, { action: _t('Részletek'), onAction: () => (location.hash = '#/stats'), timeout: 10000 });
}, 90e3);

// ---------------------------------------------------------------------------
// Nézet: #/stats
// ---------------------------------------------------------------------------
function fmtH(sec) {
  const m = Math.round(sec / 60);
  if (m < 60) return `${_t('{m} perc', { m })}`;
  const h = Math.floor(m / 60);
  return `${_t('{h} óra', { h })}${m % 60 ? ` ${_t('{x} perc', { x: m % 60 })}` : ''}`;
}

function sumDays(s, n) {
  let t = 0;
  for (let i = 0; i < n; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    t += s.days[dayKey(d)] || 0;
  }
  return t;
}

const WEEKDAYS = weekdayNames('short');
const WEEKDAY_NAMES = weekdayNames('long');

/** Heti összesítő: az elmúlt 7 nap az előző 7-hez képest, a legaktívabb nap, a hét filmjei / sorozatai. */
function weeklyHtml(s) {
  const week = sumDays(s, 7);
  const prev = sumDays(s, 14) - week;
  const change = prev > 300 ? Math.round(((week - prev) / prev) * 100) : null;
  let best = null;
  for (let i = 0; i < 7; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const t = s.days[dayKey(d)] || 0;
    if (!best || t > best.t) best = { d, t };
  }
  const vodWeek = Object.values(s.vod).filter((v) => v.last && Date.now() - v.last < 7 * 864e5).sort((a, b) => b.last - a.last);
  return `<section class="stat-sec week-sum"><h2>${_t('Heti összesítő')}</h2>
    <p>${_t('<b>{fmtH}</b> az elmúlt 7 napban', { fmtH: fmtH(week) })}${change !== null ? ` – <span class="${change > 0 ? 'up' : 'down'}">${change > 0 ? '+' : ''}${change}%</span> ${_t('az előző héthez képest')}` : ''}.
    ${best?.t ? ` ${_t('A legtöbbet {x} néztél ({fmtH}).', { x: WEEKDAY_NAMES[best.d.getDay()], fmtH: fmtH(best.t) })}` : ''}
    ${vodWeek.length ? ` ${_t('Filmek, sorozatok a héten:')} ${vodWeek.slice(0, 5).map((v) => esc(v.title)).join(', ')}${vodWeek.length > 5 ? ` ${_t('és még {x}', { x: vodWeek.length - 5 })}` : ''}.` : ''}</p>
  </section>`;
}

/** Nem működő kedvenc és nemrég nézett csatornák (minden forrásuk hibás volt az elmúlt héten). */
function brokenHtml(p) {
  const ids = [...new Set([...(p.favorites || []), ...(p.recent || []).slice(0, 20)])];
  const week = Date.now() - 7 * 864e5;
  const bad = ids
    .map((id) => catalog.byId.get(id))
    .filter((ch) => ch && ch.streams.length && ch.streams.every((st) => {
      const h = store.healthOf(st.url);
      return h && !h.ok && h.t > week;
    }));
  if (!bad.length) return '';
  return `<section class="stat-sec broken"><h2>${_t('Nem működő csatornák a héten')}</h2>
    <p class="muted small">${_t('Kedvenc vagy nemrég nézett csatornák, amelyeknek az elmúlt héten egyik forrása sem működött. Érdemes megnézni, nincs-e másik listában ugyanez a csatorna.')}</p>
    <ul class="top-list">${bad
      .map((ch) => `<li><span class="side-logo" style="--h:${hashHue(ch.name)}">${logoHtml(ch, 'logo-sm')}</span><span class="tl-name">${esc(ch.name)}</span>
        <a class="btn small" href="#/search?q=${encodeURIComponent(ch.name)}">${_t('Másik forrás keresése')}</a><button class="btn small" data-play="${esc(ch.id)}">${_t('Újra próbálom')}</button></li>`)
      .join('')}</ul></section>`;
}

export function renderStats(view) {
  const p = store.profile;
  const s = statsOf(p);
  const total = Object.values(s.days).reduce((a, b) => a + b, 0);
  const days14 = Array.from({ length: 14 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (13 - i));
    return { d, t: s.days[dayKey(d)] || 0 };
  });
  const max14 = Math.max(60, ...days14.map((x) => x.t));
  const maxH = Math.max(60, ...s.hours);
  const topCh = Object.entries(s.ch)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([id, t]) => ({ ch: catalog.byId.get(id), id, t }));
  const topCat = Object.entries(s.cat).sort((a, b) => b[1] - a[1]).slice(0, 8);
  const catMax = Math.max(1, ...topCat.map((x) => x[1]));
  const topVod = Object.values(s.vod).sort((a, b) => b.t - a.t).slice(0, 10);
  const peak = s.hours.indexOf(Math.max(...s.hours));
  const active30 = Object.keys(s.days).filter((k) => new Date(k) > Date.now() - 30 * 86400e3 && s.days[k] > 60).length;

  view.innerHTML = `<div class="page stats">
    <div class="page-head"><h1>${_t('Nézési statisztika')}</h1><span class="muted">${_t('{name} profil · {date} óta', { name: esc(p.name), date: new Date(s.since).toLocaleDateString(LOCALE) })}</span></div>
    ${p.statsOff ? `<p class="note">${_t('A statisztika gyűjtése ki van kapcsolva ennél a profilnál.')}</p>` : ''}
    <div class="stat-cards">
      <div class="stat-card"><small>${_t('Ma')}</small><b>${fmtH(sumDays(s, 1))}</b></div>
      <div class="stat-card"><small>${_t('Az elmúlt 7 napban')}</small><b>${fmtH(sumDays(s, 7))}</b></div>
      <div class="stat-card"><small>${_t('Az elmúlt 30 napban')}</small><b>${fmtH(sumDays(s, 30))}</b><small>${_t('{active30} napon néztél tévét', { active30 })}</small></div>
      <div class="stat-card"><small>${_t('Összesen')}</small><b>${fmtH(total)}</b><small>${_t('{max} indítás', { max: Math.max(0, Math.round(Number(s.plays) || 0)) })}</small></div>
      <div class="stat-card"><small>${_t('Napi átlag (30 nap)')}</small><b>${fmtH(sumDays(s, 30) / 30)}</b></div>
      <div class="stat-card"><small>${_t('Kedvenc időszak')}</small><b>${total ? `${peak}:00–${(peak + 1) % 24}:00` : '–'}</b></div>
    </div>

    ${weeklyHtml(s)}
    ${brokenHtml(p)}

    <section class="stat-sec"><h2>${_t('Az elmúlt két hét')}</h2>
      <div class="bars days">${days14
        .map(({ d, t }) => `<div class="bar-col" title="${d.toLocaleDateString(LOCALE)}: ${fmtH(t)}"><i style="height:${((t / max14) * 100).toFixed(1)}%"></i><span>${WEEKDAYS[d.getDay()]}<br>${d.getDate()}.</span></div>`)
        .join('')}</div>
    </section>

    <section class="stat-sec"><h2>${_t('Mikor nézel tévét?')}</h2>
      <div class="bars hours">${s.hours
        .map((t, h) => `<div class="bar-col" title="${h}:00–${h + 1}:00: ${fmtH(t)}"><i style="height:${((t / maxH) * 100).toFixed(1)}%"></i><span>${h % 3 === 0 ? h : ''}</span></div>`)
        .join('')}</div>
    </section>

    <div class="stat-two">
      <section class="stat-sec"><h2>${_t('Legtöbbet nézett csatornák')}</h2>
        ${topCh.length
            ? `<ol class="top-list">${topCh
                .map(({ ch, id, t }) => `<li ${ch ? `data-play="${esc(id)}" tabindex="0"` : ''}><span class="side-logo" style="--h:${hashHue(ch?.name || id)}">${ch ? logoHtml(ch, 'logo-sm') : ''}</span>
                  <span class="tl-name">${esc(ch?.name || id)}</span><span class="tl-time">${fmtH(t)}</span>
                  <span class="tl-bar"><i style="width:${((t / topCh[0].t) * 100).toFixed(1)}%"></i></span></li>`)
                .join('')}</ol>`
            : `<p class="muted">${_t('Még nincs adat – nézz egy kis tévét!')}</p>`}
      </section>
      <section class="stat-sec"><h2>${_t('Kategóriák')}</h2>
        ${topCat.length
            ? `<ol class="top-list">${topCat
                .map(([c, t]) => `<li><span class="tl-name">${esc(categoryName(c))}</span><span class="tl-time">${fmtH(t)}</span>
                  <span class="tl-bar"><i style="width:${((t / catMax) * 100).toFixed(1)}%"></i></span></li>`)
                .join('')}</ol>`
            : `<p class="muted">${_t('Még nincs adat.')}</p>`}
        <h2>${_t('VOD (filmek és sorozatok)')}</h2>
        ${topVod.length
            ? `<ol class="top-list">${topVod
                .map((v) => `<li><span class="tl-name">${esc(v.title)} <small class="muted">${v.type === 'series' ? _t('sorozat') : _t('film')}</small></span><span class="tl-time">${fmtH(v.t)}</span></li>`)
                .join('')}</ol>`
            : `<p class="muted">${_t('Még nem néztél filmet vagy sorozatot.')}</p>`}
      </section>
    </div>

    <section class="stat-sec">
      <label class="setting"><span>${_t('<b>Statisztika gyűjtése ennél a profilnál</b>')}<small>${_t('Az adatok csak ezen az eszközön tárolódnak, sehova nem kerülnek elküldésre.')}</small></span>
        <input type="checkbox" class="switch" data-stat-on ${p.statsOff ? '' : 'checked'} /></label>
      <button class="btn small" data-stat-reset>${_t('Statisztika törlése')}</button>
    </section>
  </div>`;

  view.onclick = async (e) => {
    const li = e.target.closest('[data-play]');
    if (li) return player.play(catalog.byId.get(li.dataset.play));
    if (e.target.closest('[data-stat-reset]')) {
      if (!(await confirmDialog(_t('Törlöd a profil nézési statisztikáját?'), { ok: _t('Törlés'), danger: true }))) return;
      p.stats = null;
      store.save();
      toast(_t('A statisztika törölve'));
      renderStats(view);
    }
  };
  view.onkeydown = (e) => {
    const li = e.target.closest?.('[data-play]');
    if (li && e.key === 'Enter') player.play(catalog.byId.get(li.dataset.play));
  };
  view.onchange = (e) => {
    if (e.target.matches('[data-stat-on]')) {
      p.statsOff = !e.target.checked;
      store.save();
      renderStats(view);
    }
  };
}
