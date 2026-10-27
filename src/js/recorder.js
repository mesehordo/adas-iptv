// Felvétel (asztali változat): az élő adás változatlan mentése a Videók / Adás felvételek mappába.
//  - azonnal, a lejátszó ● gombjával (újra megnyomva leáll);
//  - ütemezve a műsor-adatlapról: a műsor előtt / után beállítható ráhagyással (alapból 3, ill. 10 perc –
//    a műsorújság ideje gyakran csúszik; a fölösleg utólag levágható). Az indítás idejét a főfolyamat
//    időzítője adja (a tálcára rejtett ablakban is pontos). Ha az adás közben megszakad, a felvétel
//    magától folytatódik ugyanabba a fájlba.
import { esc, toast, fmtTime, fmtDay, bus, hashHue, fmtNum } from './util.js';
import { api } from './api.js';
import { store } from './store.js';
import { catalog, orderedStreams } from './catalog.js';
import { epg } from './epg.js';
import { player } from './player.js';
import { programExtras, confirmDialog, ICON, emptyState, tvTabs as tvTabsOf, radioTabs } from './components.js';
import { playVod, pathToUrl } from './vod.js';
import { allowOutsidePlayback } from './watchtime.js';
import { radioSnapshot, stationFrom } from './radio.js';
import { radioPlayer, resolveStream } from './radioplayer.js';

import { _t, LOCALE } from './i18n.js';
export const canRecord = !!api.recStart;
const active = new Map(); // felvétel-azonosító → { chId, chName, title, file, sched }
const schedule = () => (store.settings.recSchedule ||= []);
const fmtSize = (b) => (b > 1e9 ? `${fmtNum(b / 1e9, 2)} GB` : `${fmtNum(Math.max(0.1, b / 1e6), 1)} MB`);
/** A felvétel fájlnevének időbélyege helyi idő szerint: „2026-10-27 01.30” (a toISOString dátuma világidő volt –
 * éjfél után a helyi óra mellé az előző nap került). */
const stamp = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}.${String(d.getMinutes()).padStart(2, '0')}`;
/** Ráhagyás percben a műsor előtt / után (Beállítások → Felvételek) */
export const recPre = () => Math.max(0, Number(store.settings.recPre ?? 3));
export const recPost = () => Math.max(0, Number(store.settings.recPost ?? 10));

export const recordingOf = (chId) => [...active.entries()].find(([, r]) => r.chId === chId)?.[0];

/** A felvételek adatai legfeljebb 500 fájlra (a legrégebbiek kerülnek ki). */
function trimRecMeta(meta) {
  const keys = Object.keys(meta);
  if (keys.length > 500) for (const k of keys.slice(0, keys.length - 500)) delete meta[k];
}

// (H31) az indulás alatt álló felvételek (adóazonosító): a futó felvétel csak az aszinkron indulás után kerül az
// active-ba – addig egy második kérés ugyanarra az adóra nem indíthat újabb felvételt
const starting = new Set();
/** Egy felvétel indítása adónként egyszerre egyszer: a második kérés hibát kap, a sikertelen indulás feloldja. */
async function once(chId, fn) {
  if (starting.has(chId) || recordingOf(chId)) throw new Error(_t('A felvétel már indul.'));
  starting.add(chId);
  try {
    return await fn();
  } finally {
    starting.delete(chId);
  }
}
const startRec = (ch, o) => once(ch.id, () => startRecNow(ch, o));
const startRadioRec = (st, o) => once(st.id, () => startRadioRecNow(st, o));

async function startRecNow(ch, { title, until = 0, sched = null, progStart = 0, progStop = 0 } = {}) {
  const stream = player.channel?.id === ch.id && player.stream ? player.stream : orderedStreams(ch)[0];
  if (!stream) throw new Error(_t('A csatornának nincs forrása.'));
  await api.setStreamHeaders?.(stream.url, { ua: stream.ua, referrer: stream.referrer });
  const name = `${ch.name} – ${title || _t('felvétel')} – ${stamp()}`;
  const r = await api.recStart({ url: stream.url, name, until, meta: { chId: ch.id, title: title || ch.name, sched } });
  active.set(r.id, { chId: ch.id, title: title || ch.name, file: r.file, sched });
  // A felvételek oldalához és a vágóhoz: csatorna, műsor, a felvétel kezdete és a műsor tervezett ideje
  if (r.file) {
    const meta = (store.settings.recMeta ||= {});
    meta[r.file] = { chId: ch.id, title: title || ch.name, at: Date.now(), progStart: progStart || 0, progStop: progStop || 0 };
    trimRecMeta(meta);
    store.save();
  }
  bus.emit('rec');
  return r.id;
}

// ---------------------------------------------------------------------------
// Rádió: a hang MP3 / AAC fájlba (az adás kódolása szerint; más kódolásnál AAC-be alakítva)
// ---------------------------------------------------------------------------
const audioOut = (st) => (/mp3|mpeg/i.test(st.codec || '') ? 'mp3' : /aac/i.test(st.codec || '') ? 'aac' : 'enc');
async function startRadioRecNow(st, { title, until = 0, sched = null, progStart = 0, progStop = 0 } = {}) {
  // ami most szól, annak a működő címe; egyébként az első (a lejátszólista-címet feloldva)
  // (U09) a lista által kért fejlécek (User-Agent, Referer) a lejátszólista feloldásához és a felvételhez is
  const playing = radioPlayer.playing && radioPlayer.station?.id === st.id && radioPlayer.url;
  const raw = playing ? radioPlayer.rawUrl || st.urls[0] || '' : st.urls[0] || '';
  const hdr = st.headers?.[raw] || null;
  const url = playing ? radioPlayer.url : await resolveStream(raw, hdr);
  if (!url) throw new Error(_t('A csatornának nincs forrása.'));
  if (hdr && (hdr.ua || hdr.referrer)) await Promise.resolve(api.setStreamHeaders?.(url, { ua: hdr.ua, referrer: hdr.referrer })).catch(() => {});
  const name = `${st.name} – ${title || _t('felvétel')} – ${stamp()}`;
  const r = await api.recStart({ url, name, until, audio: audioOut(st), meta: { chId: st.id, chName: st.name, title: title || st.name, sched } });
  active.set(r.id, { chId: st.id, chName: st.name, title: title || st.name, file: r.file, sched });
  if (r.file) {
    const meta = (store.settings.recMeta ||= {});
    meta[r.file] = { chId: st.id, title: title || st.name, at: Date.now(), progStart: progStart || 0, progStop: progStop || 0, radio: { name: st.name, logo: st.logo || '' } };
    trimRecMeta(meta);
    store.save();
  }
  bus.emit('rec');
  return r.id;
}

/** Rádió ● gomb: az adó felvétele be / ki (a cím a műsorújságból, ennek híján „élő adás”). */
export async function toggleRadioRecording(st) {
  if (!st || !canRecord) return;
  if (starting.has(st.id)) return void toast(_t('A felvétel már indul.'));
  const id = recordingOf(st.id);
  if (id) {
    await api.recStop(id);
    toast(_t('Felvétel leállítva'));
    return;
  }
  try {
    const cur = epg.now(st.id, Date.now())?.cur;
    await startRadioRec(st, { title: cur?.title || _t('élő adás'), progStart: cur?.start, progStop: cur?.stop });
    toast(_t('Felvétel: {name} – a Rádió → Felvételek alatt találod', { name: st.name }));
  } catch (err) {
    toast(`${_t('A felvétel nem indult el:')} ` + (err.message || err));
  }
}

/** Rádióműsor felvételének ütemezése (újra meghívva törli). → be van-e ütemezve */
export function scheduleRadioRec(st, p) {
  const list = schedule();
  const i = list.findIndex((s) => s.chId === st.id && s.start === p.start);
  if (i >= 0) {
    list.splice(i, 1);
    store.save();
    syncSchedule();
    toast(_t('Ütemezett felvétel törölve'));
    return false;
  }
  list.push({ id: `${st.id}|${p.start}`, chId: st.id, title: p.title, start: p.start, stop: p.stop, radio: radioSnapshot(st) });
  list.sort((a, b) => a.start - b.start);
  store.save();
  syncSchedule();
  const pre = recPre();
  const post = recPost();
  toast(`${_t('Felvétel ütemezve: {title} ({fmtDay} {fmtTime}–{fmtTime2}, {pre} / {post} perc ráhagyással) – az Adás fusson ekkor (a tálcán is jó)', { title: p.title, fmtDay: fmtDay(p.start), fmtTime: fmtTime(p.start - pre * 60e3), fmtTime2: fmtTime(p.stop + post * 60e3), pre, post })}`, { timeout: 7000 });
  tick();
  return true;
}
export const isRecScheduled = (chId, start) => schedule().some((s) => s.chId === chId && s.start === start);
/** Az ütemezett tétel forrásának neve (tévécsatorna vagy rádióadó). */
const schedName = (s) => catalog.byId.get(s.chId)?.name || s.radio?.name || s.chId;

/** A lejátszó ● gombja: az éppen nézett csatorna felvétele be / ki. */
export async function toggleRecording() {
  const ch = player.channel;
  if (!ch || ch.vod || !canRecord) return;
  if (starting.has(ch.id)) return void toast(_t('A felvétel már indul.'));
  const id = recordingOf(ch.id);
  if (id) {
    await api.recStop(id);
    toast(_t('Felvétel leállítva'));
  } else {
    try {
      const cur = epg.now(ch.id, Date.now())?.cur;
      await startRec(ch, { title: cur?.title || _t('élő adás'), progStart: cur?.start, progStop: cur?.stop });
      toast(`${_t('Felvétel: {name} – a TV → Felvételek alatt találod', { name: ch.name })}`);
    } catch (err) {
      toast(`${_t('A felvétel nem indult el:')} ` + (err.message || err));
    }
  }
  player.renderControls();
}

/** Egy ütemezett felvétel indítása (ha még nem indult). */
// (H04) a futó felvétel azonosítója a beállításokkal lemezre kerül: egy előző futásból (pl. összeomlás után) maradt
// azonosító nem akadályozhatja a még tartó műsor felvételét – a munkamenet-jelölés alapján elavultnak számít
const SESSION = Math.random().toString(36).slice(2, 10);
const staleStart = (s) => !!s.startedId && s.startedSession !== SESSION;
function clearStale(list) {
  let n = 0;
  for (const s of list) if (staleStart(s)) (s.startedId = null), (s.startedSession = null), n++;
  return n;
}
function startScheduled(s) {
  if (staleStart(s)) (s.startedId = null), (s.startedSession = null);
  if (s.startedId) return;
  const ch = s.radio ? stationFrom(s.radio) : catalog.byId.get(s.chId);
  if (!ch) return;
  s.startedId = 'pending';
  s.startedSession = SESSION;
  const opts = { title: s.title, until: s.stop + recPost() * 60e3, sched: s.id, progStart: s.start, progStop: s.stop };
  (s.radio ? startRadioRec(ch, opts) : startRec(ch, opts))
    .then((id) => {
      s.startedId = id;
      toast(`${_t('Ütemezett felvétel elindult: {title} ({name})', { title: s.title, name: ch.name })}`);
    })
    .catch((err) => {
      s.startedId = null;
      toast(`${_t('Az ütemezett felvétel nem indult el ({title}): {x}', { title: s.title, x: err.message || err })}`);
    });
}

/** Ütemezett felvételek: a lejártak törlése, az esedékesek indítása (tartalék a főfolyamat időzítője mellett). */
function tick() {
  if (!canRecord) return;
  const now = Date.now();
  const list = schedule();
  const keep = list.filter((s) => s.stop + (recPost() + 3) * 60e3 > now);
  if (clearStale(keep) || keep.length !== list.length) {
    store.settings.recSchedule = keep;
    store.save();
  }
  for (const s of keep) if (!s.startedId && now >= s.start - recPre() * 60e3) startScheduled(s);
}

/** Az indítási idők átadása a főfolyamat időzítőjének. */
function syncSchedule() {
  clearStale(schedule());
  api.recSchedule?.(schedule().filter((s) => !s.startedId).map((s) => ({ id: s.id, at: s.start - recPre() * 60e3 })));
}

export function scheduleRec(ch, p) {
  const list = schedule();
  const i = list.findIndex((s) => s.chId === ch.id && s.start === p.start);
  if (i >= 0) {
    list.splice(i, 1);
    store.save();
    syncSchedule();
    toast(_t('Ütemezett felvétel törölve'));
    return false;
  }
  list.push({ id: `${ch.id}|${p.start}`, chId: ch.id, title: p.title, start: p.start, stop: p.stop });
  list.sort((a, b) => a.start - b.start);
  store.save();
  syncSchedule();
  const pre = recPre();
  const post = recPost();
  toast(`${_t('Felvétel ütemezve: {title} ({fmtDay} {fmtTime}–{fmtTime2}, {pre} / {post} perc ráhagyással) – az Adás fusson ekkor (a tálcán is jó)', { title: p.title, fmtDay: fmtDay(p.start), fmtTime: fmtTime(p.start - pre * 60e3), fmtTime2: fmtTime(p.stop + post * 60e3), pre, post })}`, { timeout: 7000 });
  tick();
  return true;
}
const isScheduled = (chId, start) => schedule().some((s) => s.chId === chId && s.start === start);

/**
 * A felület újratöltése (nyelvváltás, visszaállítás, átvétel) után a főfolyamatban tovább futó felvételek
 * visszakerülnek: látszanak és leállíthatók, az ütemezett tételük pedig nem indul el másodszor (eddig a „Most
 * rögzít” listából eltűntek, a kézi felvétel a kilépésig futott, az ütemezett pedig párhuzamosan újraindult).
 */
const adopted = canRecord
  ? Promise.resolve(api.recActive?.())
      .then((list) => {
        let n = 0;
        for (const r of Array.isArray(list) ? list : []) {
          const m = r?.meta;
          if (!m?.chId || active.has(r.id)) continue;
          active.set(r.id, { chId: m.chId, chName: m.chName || '', title: m.title || m.chId, file: r.file, sched: m.sched || null });
          const s = m.sched && schedule().find((x) => x.id === m.sched);
          if (s) (s.startedId = r.id), (s.startedSession = SESSION);
          n++;
        }
        if (n) bus.emit('rec');
      })
      .catch(() => {})
  : Promise.resolve();

if (canRecord) {
  setInterval(tick, 20000);
  setTimeout(() => {
    adopted.then(() => {
      tick();
      syncSchedule();
    });
  }, 3000);
  api.onRecDue?.((id) =>
    adopted.then(() => {
      const s = schedule().find((x) => x.id === id);
      if (s) startScheduled(s);
    })
  );
  bus.on('settings', syncSchedule);
  api.onRecEnded?.((x) => {
    const r = active.get(x.id);
    active.delete(x.id);
    if (r?.sched) {
      store.settings.recSchedule = schedule().filter((s) => s.id !== r.sched);
      store.save();
    }
    const gaps = x.restarts ? ` ${_t('· {restarts}× megszakadt, folytatva', { restarts: x.restarts })}` : '';
    if (x.error) toast(`${_t('A felvétel megszakadt ({x}): {error}', { x: r?.title || '', error: x.error })}`, { timeout: 9000 });
    else toast(`${_t('Felvétel kész: {x} ({fmtSize}{gaps})', { x: r?.title || '', fmtSize: fmtSize(x.size || 0), gaps })}`, { timeout: 7000 });
    if (player.active && player.channel && !player.channel.vod) player.renderControls();
    bus.emit('rec');
  });
  // A műsor-adatlapon: felvétel ütemezése (jövőbeli vagy most futó műsorra)
  programExtras.push({
    html: (ch, p) => (p.stop > Date.now() ? `<button class="btn ${isScheduled(ch.id, p.start) ? 'on' : ''}" data-a="rec">● ${isScheduled(ch.id, p.start) ? _t('Felvétel törlése') : _t('Felvétel')}</button>` : ''),
    run(a, ch, p) {
      if (a !== 'rec') return false;
      scheduleRec(ch, p);
      return true;
    },
  });
  player.recHooks = { toggle: toggleRecording, isRec: (id) => !!recordingOf(id) };
}

// ---------------------------------------------------------------------------
// Lejátszás az alkalmazáson belül (a .ts felvételt a lejátszási híd alakítja át a lejátszónak)
// ---------------------------------------------------------------------------
/** A felvétel adatai: a felvételkor mentett csatorna és cím, ennek híján a fájlnévből („Csatorna – cím – dátum”). */
function recInfo(f) {
  const m = store.settings.recMeta?.[f.path];
  const base = f.name.replace(/\.(ts|mkv|mp4|mp3|aac)$/i, '');
  const parts = base.split(' – ');
  const ch = (m?.chId && catalog.byId.get(m.chId)) || (!m?.radio && parts.length >= 3 ? catalog.channels.find((c) => c.name === parts[0]) : null);
  return {
    title: m?.title || (parts.length >= 3 ? parts.slice(1, -1).join(' – ') : base),
    chName: ch?.name || m?.radio?.name || (parts.length >= 3 ? parts[0] : ''),
    logo: ch?.logo || (/^https?:\/\//i.test(m?.radio?.logo || '') ? m.radio.logo : ''),
    chId: ch?.id || '',
    radio: !!m?.radio || /\.(mp3|aac)$/i.test(f.name),
    at: m?.at || f.mtime,
  };
}
const recItem = (f, info = recInfo(f)) => ({
  id: 'rec:' + f.path,
  rec: true,
  srcChannel: info.chId, // a felvétel forráscsatornája: a gyerekprofil szabálya erre vonatkozik
  type: 'movie',
  lib: 'rec',
  title: info.title,
  urls: [pathToUrl(f.path)],
  poster: info.logo,
  groups: [],
  lists: [_t('Felvételek')],
  episodes: [],
  year: '',
  duration: 0,
  search: '',
});
export function playRecording(f) {
  playVod(recItem(f));
}

// ---------------------------------------------------------------------------
// Vágás: kezdet és vég kijelölése az előnézetben, majd vágás újrakódolás nélkül. A felvétel helyén a
// vágott változat lesz (ezt játsszuk le), az eredeti megmarad, és bármikor újravágható / visszaállítható.
// ---------------------------------------------------------------------------
const clock = (s) => {
  s = Math.max(0, Math.round(s || 0));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return (h ? `${h}:${String(m).padStart(2, '0')}` : m) + ':' + String(s % 60).padStart(2, '0');
};
/** A megmaradó hossz: [tin, tout] a kivágott részek nélkül (a kivágások rendezettek, nem fednek át). */
export function keptLength(tin, tout, cuts = []) {
  let len = Math.max(0, tout - tin);
  for (const c of cuts) len -= Math.max(0, Math.min(tout, c.end) - Math.max(tin, c.start));
  return Math.max(0, len);
}
/**
 * Reklámblokk-javaslatok a reklámhatár-keresés eredményéből. A reklámok közé (és a műsor és a blokk közé) rövid
 * csend – tévén többnyire fekete képpel – kerül: ahol ilyen határok sűrűn, legfeljebb 75 mp-enként követik egymást,
 * és legalább három van belőlük (két reklám), az valószínűleg reklámblokk.
 * → { cands: [{ t, strong }], blocks: [{ start, end }] }
 */
export function adSuggestions({ silences = [], blacks = [], video = false } = {}) {
  const cands = silences
    .filter(([s, e]) => e - s >= 0.25)
    .map(([s, e]) => ({ t: (s + e) / 2, s, e, strong: blacks.some(([bs, be]) => bs <= e + 0.5 && be >= s - 0.5) }));
  // (képes felvételnél, ha van fekete kép, csak a csend + fekete számít: a műsor szünetei így kiesnek)
  const pts = video && cands.some((c) => c.strong) ? cands.filter((c) => c.strong) : cands;
  const blocks = [];
  let g = [];
  const flush = () => {
    const span = g.length ? g[g.length - 1].t - g[0].t : 0;
    // (a blokk az első határ csendjének elejétől az utolsóénak a végéig)
    if (g.length >= 3 && span >= 20 && span <= 15 * 60) blocks.push({ start: g[0].s, end: g[g.length - 1].e });
    g = [];
  };
  for (const c of pts) {
    if (g.length && c.t - g[g.length - 1].t > 75) flush();
    g.push(c);
  }
  flush();
  return { cands, blocks };
}
const parseClock = (txt) => {
  const p = String(txt).trim().split(':').map(Number);
  if (!p.length || p.some((x) => !Number.isFinite(x) || x < 0)) return NaN;
  return p.reduce((a, x) => a * 60 + x, 0);
};

export async function openTrimEditor(f, onDone) {
  const { MediaBridge, probeMedia, forgetProbe } = await import('./bridge.js');
  const { openModal } = await import('./components.js');
  const info = recInfo(f);
  const meta = store.settings.recMeta?.[f.path] || {};
  const src = await api.recOriginal(f.path);
  if (!src) return toast(_t('A felvétel nem található.'));
  const url = pathToUrl(src.source);
  const el = document.createElement('div');
  el.className = 'dialog trim-ed';
  el.innerHTML = `<h2>${_t('✂ Felvétel vágása')}</h2>
    <p class="muted small">${esc(info.title)}${info.chName ? ' · ' + esc(info.chName) : ''}${src.trimmed ? ` ${_t('· már vágva – az eredetiből vágsz újra')}` : ''}</p>
    <div class="tr-video"><video playsinline></video><div class="tr-wait"><div class="spinner"></div><p class="muted small">${_t('A felvétel betöltése…')}</p></div></div>
    <div class="tr-line">
      <div class="tr-bar"><div class="tr-sel"></div><div class="tr-cutmarks"></div><div class="tr-marks"></div></div>
      <input type="range" class="tr-pos" min="0" max="1" step="0.1" value="0" aria-label="${_t('Lejátszási pozíció')}" />
    </div>
    <div class="tr-row tr-play">
      <span class="tr-now">0:00</span>
      <button class="btn small" data-tr="-60" title="${_t('1 perccel vissza')}">−1′</button>
      <button class="btn small" data-tr="-10" title="${_t('10 mp vissza')}">−10″</button>
      <button class="btn small" data-tr="-1" title="${_t('1 mp vissza')}">−1″</button>
      <button class="btn small primary" data-tr="play" title="${_t('Lejátszás / szünet (szóköz)')}">▶ / ❚❚</button>
      <button class="btn small" data-tr="1" title="${_t('1 mp előre')}">+1″</button>
      <button class="btn small" data-tr="10" title="${_t('10 mp előre')}">+10″</button>
      <button class="btn small" data-tr="60" title="${_t('1 perccel előre')}">+1′</button>
      <span class="tr-dur muted">/ 0:00</span>
    </div>
    <div class="tr-points">
      <div class="tr-pt">${_t('<b>Kezdet</b>')}<input class="input tr-in" value="0:00" aria-label="${_t('Kezdet (perc:mp)')}" /><button class="btn small" data-tr="set-in">${_t('⇤ Kezdet ide')}</button><button class="btn small" data-tr="go-in" title="${_t('Odaugrás')}">▶</button></div>
      <div class="tr-pt">${_t('<b>Vége</b>')}<input class="input tr-out" value="0:00" aria-label="${_t('Vége (perc:mp)')}" /><button class="btn small" data-tr="set-out">${_t('Vége ide ⇥')}</button><button class="btn small" data-tr="go-out" title="${_t('Odaugrás (a vége előtt 5 mp-cel)')}">▶</button></div>
    </div>
    <p class="muted small tr-len"></p>
    <div class="tr-epg"></div>
    <div class="tr-ads">
      <div><b>${_t('Reklámok kivágása')}</b> <small class="muted">${_t('Jelöld meg a reklámok elejét és végét – akár többet is; mentéskor mind kimarad.')}</small></div>
      <div class="tr-row tr-ad-btns">
        <button class="btn small" data-tr="ad-in" title="${_t('Billentyű: [')}">${_t('⟦ Reklám eleje ide')}</button>
        <button class="btn small" data-tr="ad-out" title="${_t('Billentyű: ]')}">${_t('Reklám vége ide ⟧')}</button>
        <span class="grow"></span>
        <button class="btn small" data-tr="detect" title="${_t('A reklámok közti rövid csendet és fekete képet keresi – csak javaslat')}">${_t('🔍 Reklámhatárok keresése')}</button>
      </div>
      <p class="muted small tr-ad-hint" aria-live="polite"></p>
      <p class="muted small tr-ad-status" aria-live="polite"></p>
      <ul class="tr-cuts"></ul>
      <div class="tr-sugg"></div>
      <label class="setting tr-skip"><span>${_t('Az előnézetben a kijelölt reklámok átugrása')}</span><input type="checkbox" class="switch" checked /></label>
    </div>
    <div class="dialog-btns tr-foot">
      ${src.trimmed ? `<button class="btn" data-tr="restore" title="${_t('A vágás elvetése: az eredeti teljes felvétel lesz újra a helyén')}">${_t('Eredeti visszaállítása')}</button>` : ''}
      <span class="grow"></span>
      <button class="btn" data-tr="cancel">${_t('Mégse')}</button>
      <button class="btn primary" data-tr="save">${_t('✂ Vágás és mentés')}</button>
    </div>`;
  const video = el.querySelector('video');
  let bridge = null;
  let base = 0; // a fájl első képkockájának ideje (a vágás ehhez képest számol)
  let dur = 0;
  let tin = 0;
  let tout = 0;
  let cuts = []; // kivágandó részek (reklámok): [{ start, end }], rendezve
  let adIn = null; // a megjelölt reklámkezdet (még nincs vége)
  let cands = []; // reklámhatár-jelöltek: [{ t, strong }]
  let detecting = false;
  let offProgress = null;
  const close = openModal(el, {
    cls: 'wide',
    onClose: () => {
      clearInterval(timer);
      offProgress?.();
      if (detecting) api.recDetectStop?.(f.path);
      try {
        video.pause();
      } catch {}
      bridge?.destroy();
      video.removeAttribute('src');
      video.load();
    },
  });
  const $ = (s) => el.querySelector(s);
  const pos = $('.tr-pos');
  const now = () => Math.max(0, video.currentTime - base);
  const seek = (t) => {
    video.currentTime = base + Math.min(Math.max(0, t), Math.max(0, dur - 0.2));
  };
  const draw = () => {
    if (!dur) return;
    $('.tr-sel').style.left = (tin / dur) * 100 + '%';
    $('.tr-sel').style.width = (Math.max(0, tout - tin) / dur) * 100 + '%';
    $('.tr-in').value = clock(tin);
    $('.tr-out').value = clock(tout);
    const keep = keptLength(tin, tout, cuts);
    $('.tr-len').textContent = `${_t('A vágott felvétel hossza: {clock} (az eredeti: {clock2}). A kezdet a legközelebbi előző kulcskockára esik – néhány tized másodperc eltérés lehet.', { clock: clock(keep), clock2: clock(dur) })}`;
    $('.tr-cutmarks').innerHTML =
      cuts.map((c) => `<i class="tr-cut" style="left:${(c.start / dur) * 100}%;width:${((c.end - c.start) / dur) * 100}%"></i>`).join('') +
      (adIn != null ? `<i class="tr-cut open" style="left:${(adIn / dur) * 100}%"></i>` : '') +
      cands.map((c) => `<i class="tr-cand ${c.strong ? 'strong' : ''}" style="left:${(c.t / dur) * 100}%"></i>`).join('');
    $('.tr-cuts').innerHTML = cuts
      .map(
        (c, i) => `<li><span>${_t('{n}. reklám', { n: i + 1 })}</span>
          <input class="input" data-cut-start="${i}" value="${clock(c.start)}" aria-label="${_t('Reklám eleje (perc:mp)')}" /> –
          <input class="input" data-cut-end="${i}" value="${clock(c.end)}" aria-label="${_t('Reklám vége (perc:mp)')}" />
          <small class="muted">(${clock(c.end - c.start)})</small>
          <button class="btn small" data-tr="cut-go" data-i="${i}" title="${_t('Odaugrás (a reklám előtt 3 mp-cel)')}">▶</button>
          <button class="btn small" data-tr="cut-del" data-i="${i}" title="${_t('Ez a reklám mégse maradjon ki')}">✕</button></li>`,
      )
      .join('');
    $('.tr-ad-hint').innerHTML = adIn != null ? _t('Reklám eleje: <b>{clock}</b> – lépj a reklám végére, és nyomd meg: <i>Reklám vége ide</i>.', { clock: clock(adIn) }) : '';
  };
  // a megjelölt reklámok rendezve, összevonva (az átfedők egybe)
  const setCuts = (list) => {
    const out = [];
    for (const c of list.map((x) => ({ start: Math.max(0, Math.min(x.start, x.end)), end: Math.min(dur || Infinity, Math.max(x.start, x.end)) })).filter((x) => x.end - x.start >= 1).sort((a, b) => a.start - b.start)) {
      const last = out[out.length - 1];
      if (last && c.start <= last.end + 0.2) last.end = Math.max(last.end, c.end);
      else out.push(c);
    }
    cuts = out;
    draw();
  };
  let lastNow = 0;
  const tick = () => {
    if (!dur) return;
    const t = now();
    // előnézet: lejátszás közben a kijelölt reklám átugorva (tekeréssel bele lehet nézni)
    if (!video.paused && $('.tr-skip input').checked) {
      const c = cuts.find((c) => lastNow < c.start && t >= c.start && t - lastNow < 1.5);
      if (c) {
        seek(c.end);
        lastNow = c.end;
        return;
      }
    }
    lastNow = t;
    if (document.activeElement !== pos) pos.value = t;
    $('.tr-now').textContent = clock(t);
  };
  const timer = setInterval(tick, 250);
  // A műsorújság szerinti kezdet és vég (ütemezett felvételnél pontos, azonnalinál a futó műsoré)
  const epgIn = meta.progStart && meta.at ? (meta.progStart - meta.at) / 1000 : NaN;
  const epgOut = meta.progStop && meta.at ? (meta.progStop - meta.at) / 1000 : NaN;
  const ready = (d) => {
    dur = d;
    pos.max = String(dur);
    const saved = meta.trim && !src.trimmed ? null : meta.trim;
    tin = saved ? saved.start : 0;
    tout = saved ? Math.min(dur, saved.end) : dur;
    if (Array.isArray(saved?.cuts)) setCuts(saved.cuts.filter((c) => Number.isFinite(c?.start) && Number.isFinite(c?.end)));
    $('.tr-dur').textContent = '/ ' + clock(dur);
    const marks = [];
    if (epgIn > 0 && epgIn < dur) marks.push(`<i class="tr-mark" style="left:${(epgIn / dur) * 100}%" title="${_t('Műsor kezdete a műsorújság szerint')}"></i>`);
    if (epgOut > 0 && epgOut < dur) marks.push(`<i class="tr-mark" style="left:${(epgOut / dur) * 100}%" title="${_t('Műsor vége a műsorújság szerint')}"></i>`);
    $('.tr-marks').innerHTML = marks.join('');
    if ((epgIn > 0 && epgIn < dur) || (epgOut > 0 && epgOut < dur))
      $('.tr-epg').innerHTML = `<p class="small">${epgIn > 0 && epgIn < dur && epgOut > 0 && epgOut < dur ? _t('📅 A műsorújság szerint a műsor <b>{start}</b>-nál kezdődik és <b>{end}</b>-nál ér véget (a sárga jelek). A tévé gyakran csúszik – nézd meg az előnézetben.', { start: clock(epgIn), end: clock(epgOut) }) : epgIn > 0 && epgIn < dur ? _t('📅 A műsorújság szerint a műsor <b>{start}</b>-nál kezdődik (sárga jel). A tévé gyakran csúszik – nézd meg az előnézetben.', { start: clock(epgIn) }) : _t('📅 A műsorújság szerint a műsor <b>{end}</b>-nál ér véget (sárga jel). A tévé gyakran csúszik – nézd meg az előnézetben.', { end: clock(epgOut) })}
        <button class="btn small" data-tr="epg">${_t('Kijelölés a műsorújság szerint')}</button></p>`;
    draw();
  };
  el.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-tr]');
    if (!b) return;
    const a = b.dataset.tr;
    if (/^-?\d+$/.test(a)) return seek(now() + Number(a));
    if (a === 'play') return video.paused ? video.play().catch(() => {}) : video.pause();
    if (a === 'set-in') (tin = Math.min(now(), tout - 1)), draw();
    else if (a === 'set-out') (tout = Math.max(now(), tin + 1)), draw();
    else if (a === 'ad-in') (adIn = now()), draw();
    else if (a === 'ad-out') {
      if (adIn == null) return toast(_t('Előbb a reklám elejét jelöld meg (Reklám eleje ide).'));
      if (Math.abs(now() - adIn) < 1) return toast(_t('A reklám legyen legalább 1 másodperc.'));
      const c = { start: adIn, end: now() };
      adIn = null;
      setCuts([...cuts, c]);
    } else if (a === 'cut-go') seek(cuts[Number(b.dataset.i)].start - 3);
    else if (a === 'cut-del') cuts.splice(Number(b.dataset.i), 1), draw();
    else if (a === 'sugg-add' || a === 'sugg-all') {
      const add = a === 'sugg-all' ? sugg : [sugg[Number(b.dataset.i)]];
      sugg = sugg.filter((s) => !add.includes(s));
      setCuts([...cuts, ...add]);
      drawSugg();
    } else if (a === 'sugg-go') seek(sugg[Number(b.dataset.i)].start - 3);
    else if (a === 'cand-prev' || a === 'cand-next') {
      const t = now();
      const c = a === 'cand-next' ? cands.find((c) => c.t > t + 1.5) : [...cands].reverse().find((c) => c.t < t - 1.5);
      if (c) seek(Math.max(0, c.t - 1));
      else toast(_t('Nincs több jelölt erre.'));
    } else if (a === 'detect') detect(b);
    else if (a === 'go-in') seek(tin);
    else if (a === 'go-out') seek(tout - 5);
    else if (a === 'epg') {
      if (epgIn > 0 && epgIn < dur) tin = epgIn;
      if (epgOut > 0 && epgOut < dur) tout = epgOut;
      draw();
      seek(tin);
    } else if (a === 'cancel') close();
    else if (a === 'restore') {
      if (!(await confirmDialog(_t('Visszaállítod az eredeti, vágatlan felvételt? (A mostani vágott változat törlődik.)'), { ok: _t('Visszaállítás') }))) return;
      // az előnézet az eredetit olvassa – Windowson nyitott fájl nem nevezhető át
      bridge?.destroy();
      bridge = null;
      let ok = false;
      try {
        ok = await api.recRestore(f.path);
      } catch (err) {
        toast(`${_t('A visszaállítás nem sikerült:')} ` + (err.message || err), { timeout: 9000 });
        return close();
      }
      if (!ok) {
        toast(_t('A visszaállítás nem sikerült: nincs meg az eredeti felvétel.'), { timeout: 9000 });
        return close();
      }
      forgetProbe(pathToUrl(f.path));
      delete meta.trim;
      store.save();
      toast(_t('Az eredeti felvétel visszaállítva'));
      close();
      onDone?.();
    } else if (a === 'save') {
      if (!(tout - tin >= 1)) return toast(_t('Jelölj ki legalább 1 másodpercet.'));
      b.disabled = true;
      b.textContent = _t('Vágás…');
      try {
        bridge?.destroy();
        bridge = null;
        const inside = cuts.filter((c) => c.end > tin && c.start < tout);
        const r = await api.recTrim({ path: f.path, start: tin, end: tout, cuts: inside });
        forgetProbe(pathToUrl(f.path));
        (store.settings.recMeta ||= {})[f.path] = { ...meta, trim: { start: tin, end: tout, ...(inside.length ? { cuts: inside.map((c) => ({ start: c.start, end: c.end })) } : {}) } };
        if (store.profile.vodProgress) delete store.profile.vodProgress['rec:' + f.path]; // a régi folytatási pont már nem érvényes
        store.save();
        const len = r?.length > 0 ? r.length : keptLength(tin, tout, inside);
        toast(
          inside.length
            ? _t('Kész: {n} reklám kivágva, a felvétel {clock} hosszú. Az eredeti megmaradt – bármikor újravághatod.', { n: inside.length, clock: clock(len) })
            : _t('Kész: a vágott felvétel {clock} hosszú. Az eredeti megmaradt – bármikor újravághatod.', { clock: clock(len) }),
          { timeout: 7000 },
        );
        close();
        onDone?.();
      } catch (err) {
        toast(`${_t('A vágás nem sikerült:')} ` + (err.message || err), { timeout: 9000 });
        b.disabled = false;
        b.textContent = _t('✂ Vágás és mentés');
      }
    }
  });
  pos.addEventListener('input', () => seek(Number(pos.value)));
  // a reklámok ideje kézzel is átírható
  el.addEventListener('change', (e) => {
    const i = e.target.dataset.cutStart ?? e.target.dataset.cutEnd;
    if (i == null) return;
    const v = parseClock(e.target.value);
    const c = cuts[Number(i)];
    if (c && Number.isFinite(v)) c[e.target.dataset.cutStart != null ? 'start' : 'end'] = Math.min(Math.max(0, v), dur);
    setCuts(cuts);
  });
  // Reklámhatárok keresése (a főfolyamatban, FFmpeg-gel): jelöltek a sávon, a sűrűjükből blokkjavaslat
  let sugg = [];
  const drawSugg = () => {
    const list = sugg
      .map(
        (s, i) => `<li><span>${_t('Javasolt reklámblokk')}</span> <b>${clock(s.start)} – ${clock(s.end)}</b> <small class="muted">(${clock(s.end - s.start)})</small>
          <button class="btn small" data-tr="sugg-go" data-i="${i}" title="${_t('Odaugrás (a blokk előtt 3 mp-cel)')}">▶</button>
          <button class="btn small" data-tr="sugg-add" data-i="${i}">${_t('+ Kivágandó')}</button></li>`,
      )
      .join('');
    $('.tr-sugg').innerHTML = cands.length
      ? `<div class="tr-row tr-cand-nav"><span class="small">${_t('{n} reklámhatár-jelölt (kék jelek)', { n: cands.length })}</span>
          <button class="btn small" data-tr="cand-prev">${_t('◀ Előző jelölt')}</button><button class="btn small" data-tr="cand-next">${_t('Következő jelölt ▶')}</button></div>
        ${list ? `<ul class="tr-cuts sugg">${list}</ul>` : ''}
        ${sugg.length > 1 ? `<button class="btn small" data-tr="sugg-all">${_t('Mind kivágandó ({n})', { n: sugg.length })}</button>` : ''}
        <p class="muted small">${_t('Csak javaslat: a reklámok között szokásos rövid csendet és fekete képet keresi. Mentés előtt nézz bele, és igazítsd a határokat – a műsorban is lehet csend.')}</p>`
      : '';
  };
  const detect = async (b) => {
    if (detecting) {
      api.recDetectStop?.(f.path);
      return;
    }
    if (!api.recDetect) return toast(_t('A reklámhatárok keresése ebben a változatban nem érhető el.'));
    detecting = true;
    b.textContent = _t('■ Keresés leállítása');
    const hint = $('.tr-ad-status');
    hint.textContent = _t('Reklámhatárok keresése…');
    offProgress = api.onRecDetectProgress?.((x) => x.path === f.path && el.isConnected && (hint.textContent = _t('Reklámhatárok keresése… {pct}%', { pct: x.pct })));
    try {
      const res = await api.recDetect(f.path);
      if (!el.isConnected) return;
      const s = adSuggestions(res);
      cands = s.cands;
      // (a már kijelölttel átfedő javaslat nem kell)
      sugg = s.blocks.filter((x) => !cuts.some((c) => c.start < x.end && c.end > x.start));
      hint.textContent = cands.length
        ? sugg.length
          ? _t('{n} valószínű reklámblokk.', { n: sugg.length })
          : _t('Reklámblokkot nem találtam, de a jelöltek között lépkedhetsz.')
        : _t('Nem találtam reklámhatárt (csendet / fekete képet).');
    } catch (err) {
      if (el.isConnected) hint.textContent = _t('A keresés megszakadt: {msg}', { msg: err.message || err });
    } finally {
      detecting = false;
      offProgress?.();
      offProgress = null;
      if (el.isConnected) {
        b.textContent = _t('🔍 Reklámhatárok keresése');
        drawSugg();
        draw();
      }
    }
  };
  for (const [sel, set] of [['.tr-in', (v) => (tin = Math.min(v, tout - 1))], ['.tr-out', (v) => (tout = Math.max(v, tin + 1))]]) {
    $(sel).addEventListener('change', (e) => {
      const v = parseClock(e.target.value);
      if (Number.isFinite(v)) set(Math.min(Math.max(0, v), dur));
      draw();
    });
  }
  el.addEventListener('keydown', (e) => {
    if (e.target.matches('input.input')) return;
    if (e.key === ' ') (e.preventDefault(), video.paused ? video.play().catch(() => {}) : video.pause());
    else if (e.key === 'ArrowLeft' && e.target === pos) (e.preventDefault(), seek(now() - (e.shiftKey ? 60 : 5)));
    else if (e.key === 'ArrowRight' && e.target === pos) (e.preventDefault(), seek(now() + (e.shiftKey ? 60 : 5)));
    else if (e.key === 'i' || e.key === 'I') (tin = Math.min(now(), tout - 1)), draw();
    else if (e.key === 'o' || e.key === 'O') (tout = Math.max(now(), tin + 1)), draw();
    else if (e.key === '[') $('[data-tr="ad-in"]').click();
    else if (e.key === ']') $('[data-tr="ad-out"]').click();
  });
  // Előnézet a lejátszási hídon (a .ts-t a böngésző magától nem játssza)
  try {
    const pinfo = await probeMedia(url);
    if (!pinfo || pinfo.error || !(pinfo.duration > 0)) throw new Error(pinfo?.error || _t('a fájl hossza nem állapítható meg'));
    if (!el.isConnected) return;
    let bridgeErr = null;
    bridge = new MediaBridge(video, url, pinfo, {
      onFail: (err) => {
        bridgeErr = err || new Error(_t('az előnézet nem indult'));
        toast(`${_t('Az előnézet nem indult:')} ` + (err?.message || err));
      },
    });
    await bridge.open();
    // az első adat érkezése: ettől számítjuk az időt (a felvétel ideje nem nulláról indul) – (H30) véges várakozás:
    // a vágó bezárásakor, a híd hibájánál és 20 mp után leáll (nem fut tovább a háttérben)
    await new Promise((resolve, reject) => {
      const t0 = Date.now();
      const chk = () => {
        if (!el.isConnected) return reject(new Error('bezárva'));
        if (bridgeErr) return reject(bridgeErr);
        if (video.buffered.length) return resolve();
        if (Date.now() - t0 > 20e3) return reject(new Error(_t('nem érkezett adat')));
        setTimeout(chk, 100);
      };
      chk();
    });
    base = video.buffered.start(0);
    $('.tr-wait').remove();
    ready(pinfo.duration);
    seek(tin);
  } catch (err) {
    if (!el.isConnected) return; // (bezárt vágó: nincs mit kiírni)
    $('.tr-wait').innerHTML = `<p class="warn small">${_t('Az előnézet nem tölthető be ({esc}). Az időpontokat így is megadhatod.', { esc: esc(err.message || err) })}</p>`;
    const d = Number((await probeMedia(url))?.duration) || 0;
    if (d) ready(d);
  }
}

// ---------------------------------------------------------------------------
// TV → Felvételek oldal
// ---------------------------------------------------------------------------
export async function renderRecordingsPage(view, params) {
  // #/recordings?kind=radio: a Rádió oldal Felvételek füle (csak a rádiófelvételek); egyébként a tévéseké
  const radioKind = params?.get?.('kind') === 'radio';
  const tvTabs = radioKind ? radioTabs : tvTabsOf;
  if (!canRecord) {
    view.innerHTML = `<div class="page">${tvTabs('rec')}<p class="muted">${_t('Felvenni és a felvételeket lejátszani az asztali alkalmazásban lehet.')}</p></div>`;
    return;
  }
  view.innerHTML = `<div class="page recs">${tvTabs('rec')}<div class="empty-state"><div class="spinner"></div></div></div>`;
  const draw = async () => {
    const { dir, files: all } = await api.recList();
    if (!view.isConnected || document.body.dataset.route !== 'recordings') return;
    const files = all.filter((f) => !!recInfo(f).radio === radioKind);
    const sch = schedule().filter((s) => !s.startedId && !!s.radio === radioKind);
    const prog = store.profile.vodProgress || {};
    const done = files.filter((f) => !f.active);
    view.innerHTML = `<div class="page recs">${tvTabs('rec')}
      <div class="page-head"><h1>${_t('Felvételek')}</h1><span class="muted">${_t('{length} felvétel', { length: done.length })}</span>
        <span class="grow"></span><button class="btn small" data-r-folder>${_t('Mappa megnyitása')}</button> <button class="help-link" data-help="recording" title="${_t('Súgó')}">?</button></div>
      <p class="muted small">${_t('Az élő adás a lejátszó <b>●</b> gombjával vehető fel, vagy a műsorújságban egy műsor adatlapján a <b>Felvétel</b> gombbal ütemezhető. Hely: <code>{esc}</code>', { esc: esc(dir) })}</p>
      ${[...active.values()].some((r) => r.chId.startsWith('r:') === radioKind)
          ? `<h2 class="section-title">${_t('Most rögzít')}</h2><ul class="src-list">${[...active.entries()]
              .filter(([, r]) => r.chId.startsWith('r:') === radioKind)
              .map(([id, r]) => `<li><span class="rec-dot"></span><span><b>${esc(r.title)}</b><small>${esc(catalog.byId.get(r.chId)?.name || r.chName || '')}</small></span><button class="btn small danger" data-r-stop="${esc(id)}">${_t('Leállítás')}</button></li>`)
              .join('')}</ul>`
          : ''}
      ${sch.length
          ? `<h2 class="section-title">${_t('Ütemezve')}</h2><ul class="src-list">${sch
              .map((s) => `<li><span><b>${esc(s.title)}</b><small>${esc(schedName(s))} · ${esc(fmtDay(s.start))} ${fmtTime(s.start)}–${fmtTime(s.stop)}</small></span><button class="btn small" data-r-cancel="${esc(s.id)}">${_t('Törlés')}</button></li>`)
              .join('')}</ul>`
          : ''}
      ${done.length
          ? `<div class="rec-grid">${done
              .map((f) => {
                const i = files.indexOf(f);
                const info = recInfo(f);
                const pr = prog['rec:' + f.path];
                const ratio = pr?.d ? Math.min(1, pr.p / pr.d) : 0;
                return `<article class="rec-card ${pr?.done ? 'done' : ''}">
                  <button class="rec-thumb" data-r-play="${i}" style="--h:${hashHue(info.chName || info.title)}" aria-label="${_t('Lejátszás: {esc}', { esc: esc(info.title) })}">
                    ${info.logo ? `<img src="${esc(info.logo)}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.remove()" />` : `<span>${esc((info.chName || info.title).slice(0, 2))}</span>`}
                    <i class="rec-play">${ICON.play}</i>
                    ${ratio > 0.01 && !pr?.done ? `<span class="bar"><i style="width:${(ratio * 100).toFixed(1)}%"></i></span>` : ''}
                  </button>
                  <div class="rec-meta"><b title="${esc(info.title)}">${esc(info.title)}</b>
                    <small>${esc([info.chName, new Date(info.at).toLocaleString(LOCALE, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }), fmtSize(f.size)].filter(Boolean).join(' · '))}${pr?.done ? ` ${_t('· megnézve')}` : ''}</small></div>
                  <div class="rec-btns">
                    <button class="btn small primary" data-r-play="${i}">${_t('{play} Lejátszás', { play: ICON.play })}</button>
                    <button class="btn small" data-r-trim="${i}" title="${f.trimmed ? _t('Vágva – újravágás az eredetiből') : _t('Vágás: a felvétel elejének / végének levágása')}">✂ ${f.trimmed ? _t('Vágva') : _t('Vágás')}</button>
                    <button class="btn small" data-r-open="${i}" title="${_t('VLC, mpv… (a rendszer alapértelmezett lejátszója)')}">${ICON.external} ${_t('Megnyitás')}</button>
                    <button class="btn small danger" data-r-del="${i}" title="${_t('Törlés (a Lomtárba)')}">✕ ${_t('Törlés')}</button>
                  </div>
                </article>`;
              })
              .join('')}</div>`
          : radioKind
            ? emptyState(_t('Még nincs rádiófelvétel'), _t('Rádiózás közben a mini-lejátszó vagy a Most szól nézet ● gombjával veheted fel az adást, vagy a Rádió → Műsorújság fülön ütemezhetsz felvételt.'), `<a class="btn primary" href="#/radio?tab=guide">${_t('Műsorújság@@rádió')}</a>`)
            : emptyState(_t('Még nincs felvétel'), _t('Lejátszás közben a ● gombbal veheted fel az adást, vagy a műsorújságban ütemezhetsz felvételt.'), `<a class="btn primary" href="#/guide">${_t('Műsorújság')}</a>`)}
    </div>`;
    view._files = files;
  };
  view.onclick = async (e) => {
    const t = e.target.closest('button');
    if (!t) return;
    const files = view._files || [];
    if (t.dataset.rPlay) return playRecording(files[Number(t.dataset.rPlay)]);
    // a szerkesztő előnézete külön videóelemben fut (a nézési idő ott nem számolódik)
    if (t.dataset.rTrim) return (await allowOutsidePlayback(_t('A vágószerkesztőben'))) && openTrimEditor(files[Number(t.dataset.rTrim)], () => setTimeout(draw, 300));
    if (!(await recAction(t, files))) return;
    setTimeout(draw, 300);
  };
  pageDraw = draw;
  await draw();
}
let pageDraw = null;
bus.on('rec', () => document.body.dataset.route === 'recordings' && pageDraw?.());

/** A felvétel-gombok közös kezelése (oldal és beállítások). → történt-e valami */
async function recAction(t, files) {
  if (t.dataset.rStop) await api.recStop(t.dataset.rStop);
  else if (t.dataset.rCancel) {
    store.settings.recSchedule = schedule().filter((s) => s.id !== t.dataset.rCancel);
    store.save();
  } else if (t.dataset.rOpen) {
    if (!(await allowOutsidePlayback())) return false;
    const err = await api.recOpen(files[Number(t.dataset.rOpen)].path);
    if (err) toast(err);
  } else if (t.dataset.rDel) {
    const f = files[Number(t.dataset.rDel)];
    if (!(await confirmDialog(`${_t('Törlöd ezt a felvételt? {name} (a Lomtárba kerül)', { name: f.name })}`, { ok: _t('Törlés'), danger: true }))) return false;
    await api.recTrash(f.path);
  } else if ('rFolder' in t.dataset) api.recFolder();
  else return false;
  return true;
}

// ---------------------------------------------------------------------------
// Beállítások → Felvételek
// ---------------------------------------------------------------------------
let recBox = null;
bus.on('rec', () => recBox?.box.isConnected && recBox.draw());

export async function renderRecordings(box) {
  if (!canRecord || !box) {
    box?.remove();
    return;
  }
  const draw = async () => {
    const { dir, files } = await api.recList();
    const sch = schedule().filter((s) => !s.startedId);
    box.innerHTML = `<h2>${_t('Felvételek')} <button class="help-link" data-help="recording" title="${_t('Súgó')}">?</button></h2>
      <p class="muted">${_t('Az élő adás a lejátszó <b>●</b> gombjával vehető fel, vagy a műsor-adatlapon (műsorújság) <b>Felvétel</b> gombbal ütemezhető. A felvételek helye: <code>{esc}</code>', { esc: esc(dir) })}</p>
      <label class="setting"><span>${_t('<b>Ráhagyás a műsor előtt</b>')}<small>${_t('Az ütemezett felvétel ennyivel korábban indul (a tévé gyakran csúszik). A fölösleg utólag levágható.')}</small></span>
        <select data-set-num="recPre">${[0, 1, 2, 3, 5, 10, 15].map((m) => `<option value="${m}" ${recPre() === m ? 'selected' : ''}>${m ? m + ` ${_t('perc')}` : _t('nincs')}</option>`).join('')}</select></label>
      <label class="setting"><span>${_t('<b>Ráhagyás a műsor után</b>')}<small>${_t('Ennyivel később áll le (ha a műsor elhúzódik).')}</small></span>
        <select data-set-num="recPost">${[0, 2, 5, 10, 15, 20, 30].map((m) => `<option value="${m}" ${recPost() === m ? 'selected' : ''}>${m ? m + ` ${_t('perc')}` : _t('nincs')}</option>`).join('')}</select></label>
      ${active.size
          ? `<h3>${_t('Most rögzít')}</h3><ul class="src-list">${[...active.entries()]
              .map(([id, r]) => `<li><span class="rec-dot"></span><span><b>${esc(r.title)}</b><small>${esc(catalog.byId.get(r.chId)?.name || r.chName || '')}</small></span><button class="btn small danger" data-r-stop="${esc(id)}">${_t('Leállítás')}</button></li>`)
              .join('')}</ul>`
          : ''}
      ${sch.length
          ? `<h3>${_t('Ütemezve')}</h3><ul class="src-list">${sch
              .map((s) => `<li><span><b>${esc(s.title)}</b><small>${esc(schedName(s))} · ${esc(fmtDay(s.start))} ${fmtTime(s.start)}–${fmtTime(s.stop)}</small></span><button class="btn small" data-r-cancel="${esc(s.id)}">${_t('Törlés')}</button></li>`)
              .join('')}</ul>`
          : ''}
      <h3>${_t('Legutóbbi felvételek')}</h3>
      ${files.some((f) => !f.active)
          ? `<ul class="src-list">${files
              .filter((f) => !f.active)
              .slice(0, 5)
              .map((f) => `<li><span><b>${esc(recInfo(f).title)}</b><small>${esc(recInfo(f).chName)} · ${new Date(f.mtime).toLocaleString(LOCALE, { dateStyle: 'medium', timeStyle: 'short' })} · ${fmtSize(f.size)}</small></span>
                <button class="btn small primary" data-r-play="${files.indexOf(f)}">${_t('{play} Lejátszás', { play: ICON.play })}</button></li>`)
              .join('')}</ul>`
          : `<p class="muted small">${_t('Még nincs felvétel.')}</p>`}
      <div class="inline"><a class="btn small" href="#/recordings">${_t('Összes felvétel (TV → Felvételek) ›')}</a><button class="btn small" data-r-folder>${_t('Mappa megnyitása')}</button></div>`;
    box._files = files;
  };
  box.onclick = async (e) => {
    const t = e.target.closest('button');
    if (!t) return;
    const files = box._files || [];
    e.stopPropagation();
    if (t.dataset.rPlay) return playRecording(files[Number(t.dataset.rPlay)]);
    if (await recAction(t, files)) setTimeout(draw, 300);
  };
  recBox = { box, draw };
  await draw();
}
