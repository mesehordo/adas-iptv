// Felvétel (asztali változat): az élő adás változatlan mentése a Videók / Adás felvételek mappába.
//  - azonnal, a lejátszó ● gombjával (újra megnyomva leáll);
//  - ütemezve a műsor-adatlapról: a műsor előtt / után beállítható ráhagyással (alapból 3, ill. 10 perc –
//    a műsorújság ideje gyakran csúszik; a fölösleg utólag levágható). Az indítás idejét a főfolyamat
//    időzítője adja (a tálcára rejtett ablakban is pontos). Ha az adás közben megszakad, a felvétel
//    magától folytatódik ugyanabba a fájlba.
import { esc, toast, fmtTime, fmtDay, bus, hashHue } from './util.js';
import { api } from './api.js';
import { store } from './store.js';
import { catalog, orderedStreams } from './catalog.js';
import { epg } from './epg.js';
import { player } from './player.js';
import { programExtras, confirmDialog, ICON, emptyState, tvTabs } from './components.js';
import { playVod, pathToUrl } from './vod.js';

export const canRecord = !!api.recStart;
const active = new Map(); // felvétel-azonosító → { chId, title, file, sched }
const schedule = () => (store.settings.recSchedule ||= []);
const fmtSize = (b) => (b > 1e9 ? `${(b / 1e9).toFixed(2)} GB` : `${Math.max(0.1, b / 1e6).toFixed(1)} MB`);
/** Ráhagyás percben a műsor előtt / után (Beállítások → Felvételek) */
export const recPre = () => Math.max(0, Number(store.settings.recPre ?? 3));
export const recPost = () => Math.max(0, Number(store.settings.recPost ?? 10));

export const recordingOf = (chId) => [...active.entries()].find(([, r]) => r.chId === chId)?.[0];

async function startRec(ch, { title, until = 0, sched = null, progStart = 0, progStop = 0 } = {}) {
  const stream = player.channel?.id === ch.id && player.stream ? player.stream : orderedStreams(ch)[0];
  if (!stream) throw new Error('A csatornának nincs forrása.');
  await api.setStreamHeaders?.(stream.url, { ua: stream.ua, referrer: stream.referrer });
  const d = new Date();
  const name = `${ch.name} – ${title || 'felvétel'} – ${d.toISOString().slice(0, 10)} ${String(d.getHours()).padStart(2, '0')}.${String(d.getMinutes()).padStart(2, '0')}`;
  const r = await api.recStart({ url: stream.url, name, until });
  active.set(r.id, { chId: ch.id, title: title || ch.name, file: r.file, sched });
  // A felvételek oldalához és a vágóhoz: csatorna, műsor, a felvétel kezdete és a műsor tervezett ideje
  if (r.file) {
    const meta = (store.settings.recMeta ||= {});
    meta[r.file] = { chId: ch.id, title: title || ch.name, at: Date.now(), progStart: progStart || 0, progStop: progStop || 0 };
    const keys = Object.keys(meta);
    if (keys.length > 500) for (const k of keys.slice(0, keys.length - 500)) delete meta[k];
    store.save();
  }
  bus.emit('rec');
  return r.id;
}

/** A lejátszó ● gombja: az éppen nézett csatorna felvétele be / ki. */
export async function toggleRecording() {
  const ch = player.channel;
  if (!ch || ch.vod || !canRecord) return;
  const id = recordingOf(ch.id);
  if (id) {
    await api.recStop(id);
    toast('Felvétel leállítva');
  } else {
    try {
      const cur = epg.now(ch.id, Date.now())?.cur;
      await startRec(ch, { title: cur?.title || 'élő adás', progStart: cur?.start, progStop: cur?.stop });
      toast(`Felvétel: ${ch.name} – a TV → Felvételek alatt találod`);
    } catch (err) {
      toast('A felvétel nem indult el: ' + (err.message || err));
    }
  }
  player.renderControls();
}

/** Egy ütemezett felvétel indítása (ha még nem indult). */
function startScheduled(s) {
  if (s.startedId) return;
  const ch = catalog.byId.get(s.chId);
  if (!ch) return;
  s.startedId = 'pending';
  startRec(ch, { title: s.title, until: s.stop + recPost() * 60e3, sched: s.id, progStart: s.start, progStop: s.stop })
    .then((id) => {
      s.startedId = id;
      toast(`Ütemezett felvétel elindult: ${s.title} (${ch.name})`);
    })
    .catch((err) => {
      s.startedId = null;
      toast(`Az ütemezett felvétel nem indult el (${s.title}): ${err.message || err}`);
    });
}

/** Ütemezett felvételek: a lejártak törlése, az esedékesek indítása (tartalék a főfolyamat időzítője mellett). */
function tick() {
  if (!canRecord) return;
  const now = Date.now();
  const list = schedule();
  const keep = list.filter((s) => s.stop + (recPost() + 3) * 60e3 > now);
  if (keep.length !== list.length) {
    store.settings.recSchedule = keep;
    store.save();
  }
  for (const s of keep) if (!s.startedId && now >= s.start - recPre() * 60e3) startScheduled(s);
}

/** Az indítási idők átadása a főfolyamat időzítőjének. */
function syncSchedule() {
  api.recSchedule?.(schedule().filter((s) => !s.startedId).map((s) => ({ id: s.id, at: s.start - recPre() * 60e3 })));
}

export function scheduleRec(ch, p) {
  const list = schedule();
  const i = list.findIndex((s) => s.chId === ch.id && s.start === p.start);
  if (i >= 0) {
    list.splice(i, 1);
    store.save();
    syncSchedule();
    toast('Ütemezett felvétel törölve');
    return false;
  }
  list.push({ id: `${ch.id}|${p.start}`, chId: ch.id, title: p.title, start: p.start, stop: p.stop });
  list.sort((a, b) => a.start - b.start);
  store.save();
  syncSchedule();
  const pre = recPre();
  const post = recPost();
  toast(`Felvétel ütemezve: ${p.title} (${fmtDay(p.start)} ${fmtTime(p.start - pre * 60e3)}–${fmtTime(p.stop + post * 60e3)}, ${pre} / ${post} perc ráhagyással) – az Adás fusson ekkor (a tálcán is jó)`, { timeout: 7000 });
  tick();
  return true;
}
const isScheduled = (chId, start) => schedule().some((s) => s.chId === chId && s.start === start);

if (canRecord) {
  setInterval(tick, 20000);
  setTimeout(() => {
    tick();
    syncSchedule();
  }, 3000);
  api.onRecDue?.((id) => {
    const s = schedule().find((x) => x.id === id);
    if (s) startScheduled(s);
  });
  bus.on('settings', syncSchedule);
  api.onRecEnded?.((x) => {
    const r = active.get(x.id);
    active.delete(x.id);
    if (r?.sched) {
      store.settings.recSchedule = schedule().filter((s) => s.id !== r.sched);
      store.save();
    }
    const gaps = x.restarts ? ` · ${x.restarts}× megszakadt, folytatva` : '';
    if (x.error) toast(`A felvétel megszakadt (${r?.title || ''}): ${x.error}`, { timeout: 9000 });
    else toast(`Felvétel kész: ${r?.title || ''} (${fmtSize(x.size || 0)}${gaps})`, { timeout: 7000 });
    if (player.active && player.channel && !player.channel.vod) player.renderControls();
    bus.emit('rec');
  });
  // A műsor-adatlapon: felvétel ütemezése (jövőbeli vagy most futó műsorra)
  programExtras.push({
    html: (ch, p) => (p.stop > Date.now() ? `<button class="btn ${isScheduled(ch.id, p.start) ? 'on' : ''}" data-a="rec">● ${isScheduled(ch.id, p.start) ? 'Felvétel törlése' : 'Felvétel'}</button>` : ''),
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
  const base = f.name.replace(/\.(ts|mkv|mp4)$/i, '');
  const parts = base.split(' – ');
  const ch = (m?.chId && catalog.byId.get(m.chId)) || (parts.length >= 3 ? catalog.channels.find((c) => c.name === parts[0]) : null);
  return {
    title: m?.title || (parts.length >= 3 ? parts.slice(1, -1).join(' – ') : base),
    chName: ch?.name || (parts.length >= 3 ? parts[0] : ''),
    logo: ch?.logo || '',
    at: m?.at || f.mtime,
  };
}
const recItem = (f, info = recInfo(f)) => ({
  id: 'rec:' + f.path,
  rec: true,
  type: 'movie',
  lib: 'rec',
  title: info.title,
  urls: [pathToUrl(f.path)],
  poster: info.logo,
  groups: [],
  lists: ['Felvételek'],
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
  if (!src) return toast('A felvétel nem található.');
  const url = pathToUrl(src.source);
  const el = document.createElement('div');
  el.className = 'dialog trim-ed';
  el.innerHTML = `<h2>✂ Felvétel vágása</h2>
    <p class="muted small">${esc(info.title)}${info.chName ? ' · ' + esc(info.chName) : ''}${src.trimmed ? ' · már vágva – az eredetiből vágsz újra' : ''}</p>
    <div class="tr-video"><video playsinline></video><div class="tr-wait"><div class="spinner"></div><p class="muted small">A felvétel betöltése…</p></div></div>
    <div class="tr-line">
      <div class="tr-bar"><div class="tr-sel"></div><div class="tr-marks"></div></div>
      <input type="range" class="tr-pos" min="0" max="1" step="0.1" value="0" aria-label="Lejátszási pozíció" />
    </div>
    <div class="tr-row tr-play">
      <span class="tr-now">0:00</span>
      <button class="btn small" data-tr="-60" title="1 perccel vissza">−1′</button>
      <button class="btn small" data-tr="-10" title="10 mp vissza">−10″</button>
      <button class="btn small" data-tr="-1" title="1 mp vissza">−1″</button>
      <button class="btn small primary" data-tr="play" title="Lejátszás / szünet (szóköz)">▶ / ❚❚</button>
      <button class="btn small" data-tr="1" title="1 mp előre">+1″</button>
      <button class="btn small" data-tr="10" title="10 mp előre">+10″</button>
      <button class="btn small" data-tr="60" title="1 perccel előre">+1′</button>
      <span class="tr-dur muted">/ 0:00</span>
    </div>
    <div class="tr-points">
      <div class="tr-pt"><b>Kezdet</b><input class="input tr-in" value="0:00" aria-label="Kezdet (perc:mp)" /><button class="btn small" data-tr="set-in">⇤ Kezdet ide</button><button class="btn small" data-tr="go-in" title="Odaugrás">▶</button></div>
      <div class="tr-pt"><b>Vége</b><input class="input tr-out" value="0:00" aria-label="Vége (perc:mp)" /><button class="btn small" data-tr="set-out">Vége ide ⇥</button><button class="btn small" data-tr="go-out" title="Odaugrás (a vége előtt 5 mp-cel)">▶</button></div>
    </div>
    <p class="muted small tr-len"></p>
    <div class="tr-epg"></div>
    <div class="dialog-btns tr-foot">
      ${src.trimmed ? '<button class="btn" data-tr="restore" title="A vágás elvetése: az eredeti teljes felvétel lesz újra a helyén">Eredeti visszaállítása</button>' : ''}
      <span class="grow"></span>
      <button class="btn" data-tr="cancel">Mégse</button>
      <button class="btn primary" data-tr="save">✂ Vágás és mentés</button>
    </div>`;
  const video = el.querySelector('video');
  let bridge = null;
  let base = 0; // a fájl első képkockájának ideje (a vágás ehhez képest számol)
  let dur = 0;
  let tin = 0;
  let tout = 0;
  const close = openModal(el, {
    cls: 'wide',
    onClose: () => {
      clearInterval(timer);
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
    $('.tr-len').textContent = `A vágott felvétel hossza: ${clock(tout - tin)} (az eredeti: ${clock(dur)}). A kezdet a legközelebbi előző kulcskockára esik – néhány tized másodperc eltérés lehet.`;
  };
  const tick = () => {
    if (!dur) return;
    if (document.activeElement !== pos) pos.value = now();
    $('.tr-now').textContent = clock(now());
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
    $('.tr-dur').textContent = '/ ' + clock(dur);
    const marks = [];
    if (epgIn > 0 && epgIn < dur) marks.push(`<i class="tr-mark" style="left:${(epgIn / dur) * 100}%" title="Műsor kezdete a műsorújság szerint"></i>`);
    if (epgOut > 0 && epgOut < dur) marks.push(`<i class="tr-mark" style="left:${(epgOut / dur) * 100}%" title="Műsor vége a műsorújság szerint"></i>`);
    $('.tr-marks').innerHTML = marks.join('');
    if ((epgIn > 0 && epgIn < dur) || (epgOut > 0 && epgOut < dur))
      $('.tr-epg').innerHTML = `<p class="small">📅 A műsorújság szerint a műsor ${epgIn > 0 && epgIn < dur ? `<b>${clock(epgIn)}</b>-nál kezdődik` : ''}${epgIn > 0 && epgOut > 0 && epgOut < dur ? ' és ' : ''}${epgOut > 0 && epgOut < dur ? `<b>${clock(epgOut)}</b>-nál ér véget` : ''} (a sárga jelek). A tévé gyakran csúszik – nézd meg az előnézetben.
        <button class="btn small" data-tr="epg">Kijelölés a műsorújság szerint</button></p>`;
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
    else if (a === 'go-in') seek(tin);
    else if (a === 'go-out') seek(tout - 5);
    else if (a === 'epg') {
      if (epgIn > 0 && epgIn < dur) tin = epgIn;
      if (epgOut > 0 && epgOut < dur) tout = epgOut;
      draw();
      seek(tin);
    } else if (a === 'cancel') close();
    else if (a === 'restore') {
      if (!(await confirmDialog('Visszaállítod az eredeti, vágatlan felvételt? (A mostani vágott változat törlődik.)', { ok: 'Visszaállítás' }))) return;
      // az előnézet az eredetit olvassa – Windowson nyitott fájl nem nevezhető át
      bridge?.destroy();
      bridge = null;
      let ok = false;
      try {
        ok = await api.recRestore(f.path);
      } catch (err) {
        toast('A visszaállítás nem sikerült: ' + (err.message || err), { timeout: 9000 });
        return close();
      }
      if (!ok) {
        toast('A visszaállítás nem sikerült: nincs meg az eredeti felvétel.', { timeout: 9000 });
        return close();
      }
      forgetProbe(pathToUrl(f.path));
      delete meta.trim;
      store.save();
      toast('Az eredeti felvétel visszaállítva');
      close();
      onDone?.();
    } else if (a === 'save') {
      if (!(tout - tin >= 1)) return toast('Jelölj ki legalább 1 másodpercet.');
      b.disabled = true;
      b.textContent = 'Vágás…';
      try {
        bridge?.destroy();
        bridge = null;
        await api.recTrim({ path: f.path, start: tin, end: tout });
        forgetProbe(pathToUrl(f.path));
        (store.settings.recMeta ||= {})[f.path] = { ...meta, trim: { start: tin, end: tout } };
        if (store.profile.vodProgress) delete store.profile.vodProgress['rec:' + f.path]; // a régi folytatási pont már nem érvényes
        store.save();
        toast(`Kész: a vágott felvétel ${clock(tout - tin)} hosszú. Az eredeti megmaradt – bármikor újravághatod.`, { timeout: 7000 });
        close();
        onDone?.();
      } catch (err) {
        toast('A vágás nem sikerült: ' + (err.message || err), { timeout: 9000 });
        b.disabled = false;
        b.textContent = '✂ Vágás és mentés';
      }
    }
  });
  pos.addEventListener('input', () => seek(Number(pos.value)));
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
  });
  // Előnézet a lejátszási hídon (a .ts-t a böngésző magától nem játssza)
  try {
    const pinfo = await probeMedia(url);
    if (!pinfo || pinfo.error || !(pinfo.duration > 0)) throw new Error(pinfo?.error || 'a fájl hossza nem állapítható meg');
    if (!el.isConnected) return;
    bridge = new MediaBridge(video, url, pinfo, { onFail: (err) => toast('Az előnézet nem indult: ' + (err.message || err)) });
    await bridge.open();
    // az első adat érkezése: ettől számítjuk az időt (a felvétel ideje nem nulláról indul)
    await new Promise((r) => {
      const chk = () => (video.buffered.length ? r() : setTimeout(chk, 100));
      chk();
    });
    base = video.buffered.start(0);
    $('.tr-wait').remove();
    ready(pinfo.duration);
    seek(tin);
  } catch (err) {
    $('.tr-wait').innerHTML = `<p class="warn small">Az előnézet nem tölthető be (${esc(err.message || err)}). Az időpontokat így is megadhatod.</p>`;
    const d = Number((await probeMedia(url))?.duration) || 0;
    if (d) ready(d);
  }
}

// ---------------------------------------------------------------------------
// TV → Felvételek oldal
// ---------------------------------------------------------------------------
export async function renderRecordingsPage(view) {
  if (!canRecord) {
    view.innerHTML = `<div class="page">${tvTabs('rec')}<p class="muted">Felvenni és a felvételeket lejátszani az asztali alkalmazásban lehet.</p></div>`;
    return;
  }
  view.innerHTML = `<div class="page recs">${tvTabs('rec')}<div class="empty-state"><div class="spinner"></div></div></div>`;
  const draw = async () => {
    const { dir, files } = await api.recList();
    if (!view.isConnected || document.body.dataset.route !== 'recordings') return;
    const sch = schedule().filter((s) => !s.startedId);
    const prog = store.profile.vodProgress || {};
    const done = files.filter((f) => !f.active);
    view.innerHTML = `<div class="page recs">${tvTabs('rec')}
      <div class="page-head"><h1>Felvételek</h1><span class="muted">${done.length} felvétel</span>
        <span class="grow"></span><button class="btn small" data-r-folder>Mappa megnyitása</button> <button class="help-link" data-help="recording" title="Súgó">?</button></div>
      <p class="muted small">Az élő adás a lejátszó <b>●</b> gombjával vehető fel, vagy a műsorújságban egy műsor adatlapján a <b>Felvétel</b> gombbal ütemezhető. Hely: <code>${esc(dir)}</code></p>
      ${
        active.size
          ? `<h2 class="section-title">Most rögzít</h2><ul class="src-list">${[...active.entries()]
              .map(([id, r]) => `<li><span class="rec-dot"></span><span><b>${esc(r.title)}</b><small>${esc(catalog.byId.get(r.chId)?.name || '')}</small></span><button class="btn small danger" data-r-stop="${esc(id)}">Leállítás</button></li>`)
              .join('')}</ul>`
          : ''
      }
      ${
        sch.length
          ? `<h2 class="section-title">Ütemezve</h2><ul class="src-list">${sch
              .map((s) => `<li><span><b>${esc(s.title)}</b><small>${esc(catalog.byId.get(s.chId)?.name || s.chId)} · ${esc(fmtDay(s.start))} ${fmtTime(s.start)}–${fmtTime(s.stop)}</small></span><button class="btn small" data-r-cancel="${esc(s.id)}">Törlés</button></li>`)
              .join('')}</ul>`
          : ''
      }
      ${
        done.length
          ? `<div class="rec-grid">${done
              .map((f) => {
                const i = files.indexOf(f);
                const info = recInfo(f);
                const pr = prog['rec:' + f.path];
                const ratio = pr?.d ? Math.min(1, pr.p / pr.d) : 0;
                return `<article class="rec-card ${pr?.done ? 'done' : ''}">
                  <button class="rec-thumb" data-r-play="${i}" style="--h:${hashHue(info.chName || info.title)}" aria-label="Lejátszás: ${esc(info.title)}">
                    ${info.logo ? `<img src="${esc(info.logo)}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.remove()" />` : `<span>${esc((info.chName || info.title).slice(0, 2))}</span>`}
                    <i class="rec-play">${ICON.play}</i>
                    ${ratio > 0.01 && !pr?.done ? `<span class="bar"><i style="width:${(ratio * 100).toFixed(1)}%"></i></span>` : ''}
                  </button>
                  <div class="rec-meta"><b title="${esc(info.title)}">${esc(info.title)}</b>
                    <small>${esc([info.chName, new Date(info.at).toLocaleString('hu-HU', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }), fmtSize(f.size)].filter(Boolean).join(' · '))}${pr?.done ? ' · megnézve' : ''}</small></div>
                  <div class="rec-btns">
                    <button class="btn small primary" data-r-play="${i}">${ICON.play} Lejátszás</button>
                    <button class="btn small" data-r-trim="${i}" title="${f.trimmed ? 'Vágva – újravágás az eredetiből' : 'Vágás: a felvétel elejének / végének levágása'}">✂${f.trimmed ? ' ✓' : ''}</button>
                    <button class="btn small" data-r-open="${i}" title="VLC, mpv… (a rendszer alapértelmezett lejátszója)">${ICON.external}</button>
                    <button class="btn small danger" data-r-del="${i}" title="Törlés (a Lomtárba)">✕</button>
                  </div>
                </article>`;
              })
              .join('')}</div>`
          : emptyState('Még nincs felvétel', 'Lejátszás közben a ● gombbal veheted fel az adást, vagy a műsorújságban ütemezhetsz felvételt.', '<a class="btn primary" href="#/guide">Műsorújság</a>')
      }
    </div>`;
    view._files = files;
  };
  view.onclick = async (e) => {
    const t = e.target.closest('button');
    if (!t) return;
    const files = view._files || [];
    if (t.dataset.rPlay) return playRecording(files[Number(t.dataset.rPlay)]);
    if (t.dataset.rTrim) return openTrimEditor(files[Number(t.dataset.rTrim)], () => setTimeout(draw, 300));
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
    const err = await api.recOpen(files[Number(t.dataset.rOpen)].path);
    if (err) toast(err);
  } else if (t.dataset.rDel) {
    const f = files[Number(t.dataset.rDel)];
    if (!(await confirmDialog(`Törlöd ezt a felvételt? ${f.name} (a Lomtárba kerül)`, { ok: 'Törlés', danger: true }))) return false;
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
    box.innerHTML = `<h2>Felvételek <button class="help-link" data-help="recording" title="Súgó">?</button></h2>
      <p class="muted">Az élő adás a lejátszó <b>●</b> gombjával vehető fel, vagy a műsor-adatlapon (műsorújság) <b>Felvétel</b> gombbal ütemezhető. A felvételek helye: <code>${esc(dir)}</code></p>
      <label class="setting"><span><b>Ráhagyás a műsor előtt</b><small>Az ütemezett felvétel ennyivel korábban indul (a tévé gyakran csúszik). A fölösleg utólag levágható.</small></span>
        <select data-set-num="recPre">${[0, 1, 2, 3, 5, 10, 15].map((m) => `<option value="${m}" ${recPre() === m ? 'selected' : ''}>${m ? m + ' perc' : 'nincs'}</option>`).join('')}</select></label>
      <label class="setting"><span><b>Ráhagyás a műsor után</b><small>Ennyivel később áll le (ha a műsor elhúzódik).</small></span>
        <select data-set-num="recPost">${[0, 2, 5, 10, 15, 20, 30].map((m) => `<option value="${m}" ${recPost() === m ? 'selected' : ''}>${m ? m + ' perc' : 'nincs'}</option>`).join('')}</select></label>
      ${
        active.size
          ? `<h3>Most rögzít</h3><ul class="src-list">${[...active.entries()]
              .map(([id, r]) => `<li><span class="rec-dot"></span><span><b>${esc(r.title)}</b><small>${esc(catalog.byId.get(r.chId)?.name || '')}</small></span><button class="btn small danger" data-r-stop="${esc(id)}">Leállítás</button></li>`)
              .join('')}</ul>`
          : ''
      }
      ${
        sch.length
          ? `<h3>Ütemezve</h3><ul class="src-list">${sch
              .map((s) => `<li><span><b>${esc(s.title)}</b><small>${esc(catalog.byId.get(s.chId)?.name || s.chId)} · ${esc(fmtDay(s.start))} ${fmtTime(s.start)}–${fmtTime(s.stop)}</small></span><button class="btn small" data-r-cancel="${esc(s.id)}">Törlés</button></li>`)
              .join('')}</ul>`
          : ''
      }
      <h3>Legutóbbi felvételek</h3>
      ${
        files.some((f) => !f.active)
          ? `<ul class="src-list">${files
              .filter((f) => !f.active)
              .slice(0, 5)
              .map((f) => `<li><span><b>${esc(recInfo(f).title)}</b><small>${esc(recInfo(f).chName)} · ${new Date(f.mtime).toLocaleString('hu-HU', { dateStyle: 'medium', timeStyle: 'short' })} · ${fmtSize(f.size)}</small></span>
                <button class="btn small primary" data-r-play="${files.indexOf(f)}">${ICON.play} Lejátszás</button></li>`)
              .join('')}</ul>`
          : '<p class="muted small">Még nincs felvétel.</p>'
      }
      <div class="inline"><a class="btn small" href="#/recordings">Összes felvétel (TV → Felvételek) ›</a><button class="btn small" data-r-folder>Mappa megnyitása</button></div>`;
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
