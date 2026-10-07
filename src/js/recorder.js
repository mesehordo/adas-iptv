// Felvétel (asztali változat): az élő adás változatlan mentése a Videók / Adás felvételek mappába.
//  - azonnal, a lejátszó ● gombjával (újra megnyomva leáll);
//  - ütemezve a műsor-adatlapról: a műsor előtt 1 perccel indul, utána 2 perccel áll le
//    (a program futása kell hozzá – a tálcára rejtve is működik).
import { esc, toast, fmtTime, fmtDay, bus, hashHue } from './util.js';
import { api } from './api.js';
import { store } from './store.js';
import { catalog, orderedStreams } from './catalog.js';
import { epg } from './epg.js';
import { player } from './player.js';
import { programExtras, confirmDialog, ICON, emptyState } from './components.js';
import { playVod, pathToUrl, vodTabs } from './vod.js';

export const canRecord = !!api.recStart;
const active = new Map(); // felvétel-azonosító → { chId, title, file, sched }
const schedule = () => (store.settings.recSchedule ||= []);
const fmtSize = (b) => (b > 1e9 ? `${(b / 1e9).toFixed(2)} GB` : `${Math.max(0.1, b / 1e6).toFixed(1)} MB`);

export const recordingOf = (chId) => [...active.entries()].find(([, r]) => r.chId === chId)?.[0];

async function startRec(ch, { title, until = 0, sched = null } = {}) {
  const stream = player.channel?.id === ch.id && player.stream ? player.stream : orderedStreams(ch)[0];
  if (!stream) throw new Error('A csatornának nincs forrása.');
  await api.setStreamHeaders?.(stream.url, { ua: stream.ua, referrer: stream.referrer });
  const d = new Date();
  const name = `${ch.name} – ${title || 'felvétel'} – ${d.toISOString().slice(0, 10)} ${String(d.getHours()).padStart(2, '0')}.${String(d.getMinutes()).padStart(2, '0')}`;
  const r = await api.recStart({ url: stream.url, name, until });
  active.set(r.id, { chId: ch.id, title: title || ch.name, file: r.file, sched });
  // A felvételek oldalához: melyik csatornáról, melyik műsor (a fájlnév alapján is kitalálható, de így pontos)
  if (r.file) {
    const meta = (store.settings.recMeta ||= {});
    meta[r.file] = { chId: ch.id, title: title || ch.name, at: Date.now() };
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
      await startRec(ch, { title: epg.now(ch.id, Date.now())?.cur?.title || 'élő adás' });
      toast(`Felvétel: ${ch.name} – a Beállítások → Felvételek alatt találod`);
    } catch (err) {
      toast('A felvétel nem indult el: ' + (err.message || err));
    }
  }
  player.renderControls();
}

/** Ütemezett felvételek indítása (20 mp-enként ellenőrizve). */
function tick() {
  if (!canRecord) return;
  const now = Date.now();
  const list = schedule();
  const keep = list.filter((s) => s.stop + 3 * 60e3 > now);
  if (keep.length !== list.length) {
    store.settings.recSchedule = keep;
    store.save();
  }
  for (const s of keep) {
    if (s.startedId || now < s.start - 60e3) continue;
    const ch = catalog.byId.get(s.chId);
    if (!ch) continue;
    s.startedId = 'pending';
    startRec(ch, { title: s.title, until: s.stop + 2 * 60e3, sched: s.id })
      .then((id) => {
        s.startedId = id;
        toast(`Ütemezett felvétel elindult: ${s.title} (${ch.name})`);
      })
      .catch((err) => {
        s.startedId = null;
        toast(`Az ütemezett felvétel nem indult el (${s.title}): ${err.message || err}`);
      });
  }
}

export function scheduleRec(ch, p) {
  const list = schedule();
  const i = list.findIndex((s) => s.chId === ch.id && s.start === p.start);
  if (i >= 0) {
    list.splice(i, 1);
    store.save();
    toast('Ütemezett felvétel törölve');
    return false;
  }
  list.push({ id: `${ch.id}|${p.start}`, chId: ch.id, title: p.title, start: p.start, stop: p.stop });
  list.sort((a, b) => a.start - b.start);
  store.save();
  toast(`Felvétel ütemezve: ${p.title} (${fmtDay(p.start)} ${fmtTime(p.start)}) – a program fusson ekkor (a tálcán is jó)`);
  tick();
  return true;
}
const isScheduled = (chId, start) => schedule().some((s) => s.chId === chId && s.start === start);

if (canRecord) {
  setInterval(tick, 20000);
  setTimeout(tick, 3000);
  api.onRecEnded?.((x) => {
    const r = active.get(x.id);
    active.delete(x.id);
    if (r?.sched) {
      store.settings.recSchedule = schedule().filter((s) => s.id !== r.sched);
      store.save();
    }
    if (x.error) toast(`A felvétel megszakadt (${r?.title || ''}): ${x.error}`, { timeout: 9000 });
    else toast(`Felvétel kész: ${r?.title || ''} (${fmtSize(x.size || 0)})`);
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
// VOD → Felvételek oldal
// ---------------------------------------------------------------------------
export async function renderRecordingsPage(view) {
  if (!canRecord) {
    view.innerHTML = `<div class="page">${vodTabs('rec')}<p class="muted">Felvenni és a felvételeket lejátszani az asztali alkalmazásban lehet.</p></div>`;
    return;
  }
  view.innerHTML = `<div class="page recs">${vodTabs('rec')}<div class="empty-state"><div class="spinner"></div></div></div>`;
  const draw = async () => {
    const { dir, files } = await api.recList();
    if (!view.isConnected || document.body.dataset.route !== 'recordings') return;
    const sch = schedule().filter((s) => !s.startedId);
    const prog = store.profile.vodProgress || {};
    const done = files.filter((f) => !f.active);
    view.innerHTML = `<div class="page recs">${vodTabs('rec')}
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
      <div class="inline"><a class="btn small" href="#/recordings">Összes felvétel (VOD → Felvételek) ›</a><button class="btn small" data-r-folder>Mappa megnyitása</button></div>`;
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
