// Műsor-emlékeztetők: értesítés a műsor kezdete előtt (beállítható előidővel), automatikus
// átkapcsolás, „minden adására” emlékeztetés (sorozatok, rendszeres műsorok), és a platform
// saját értesítései: asztali gépen rendszerértesítés (tálcán futva is), Androidon az alkalmazás
// bezárása után is (a rendszer ébreszti), a böngészőben a webes értesítés.
import { toast, bus, fmtTime, norm } from './util.js';
import { api } from './api.js';
import { store } from './store.js';
import { catalog } from './catalog.js';
import { epg } from './epg.js';
import { player } from './player.js';

import { _t } from './i18n.js';
const DAY = 86400e3;
export const seriesKey = (title) => norm(String(title || '').replace(/\s*[-–:(]\s*(\d+\.?\s*(rész|évad|epizód)|s\d+e\d+).*$/i, '')).trim();

// ---------------------------------------------------------------------------
// „Minden adására” szabályok (profilonként): { channelId, title, key }
// ---------------------------------------------------------------------------
export function hasSeries(channelId, title) {
  const k = seriesKey(title);
  return (store.profile.seriesReminders || []).some((s) => s.channelId === channelId && s.key === k);
}

export function toggleSeries(channelId, title) {
  const p = store.profile;
  p.seriesReminders ||= [];
  const k = seriesKey(title);
  const i = p.seriesReminders.findIndex((s) => s.channelId === channelId && s.key === k);
  if (i >= 0) {
    p.seriesReminders.splice(i, 1);
    // a szabályból született, még el nem kezdődött emlékeztetők is mennek
    p.reminders = p.reminders.filter((r) => !(r.series && r.channelId === channelId && seriesKey(r.title) === k && r.start > Date.now()));
  } else p.seriesReminders.push({ channelId, title, key: k });
  syncSeries();
  store.save();
  bus.emit('reminders');
  return i < 0;
}

/** A szabályokhoz tartozó műsorokra (a következő 7 napban) emlékeztetőt készít. */
export function syncSeries() {
  const p = store.profile;
  const rules = p?.seriesReminders || [];
  if (!rules.length) return;
  const now = Date.now();
  let added = 0;
  for (const s of rules) {
    for (const prog of epg.list(s.channelId)) {
      if (prog.start < now || prog.start > now + 7 * DAY || seriesKey(prog.title) !== s.key) continue;
      if (p.reminders.some((r) => r.channelId === s.channelId && r.start === prog.start)) continue;
      p.reminders.push({ channelId: s.channelId, title: prog.title, start: prog.start, stop: prog.stop, notified: false, series: true });
      added++;
    }
  }
  if (added) {
    p.reminders.sort((a, b) => a.start - b.start);
    store.save();
    bus.emit('reminders');
  }
}

// ---------------------------------------------------------------------------
// Értesítés és átkapcsolás
// ---------------------------------------------------------------------------
function openChannel(id) {
  const ch = catalog.byId.get(id);
  if (ch) player.play(ch);
}
// Értesítésre kattintva (asztali / Android) a csatorna indul.
window.__adasOpenChannel = openChannel;
api.onOpenChannel?.(openChannel);

const leadMs = () => Math.max(0, Number(store.settings.reminderLead ?? 2)) * 60000;

export function checkReminders() {
  const now = Date.now();
  let changed = false;
  for (const r of store.profile.reminders) {
    const ch = catalog.byId.get(r.channelId);
    if (!ch || r.stop < now) continue;
    // 1) értesítés az előidővel
    if (!r.notified && r.start - now <= leadMs()) {
      r.notified = true;
      changed = true;
      const mins = Math.round((r.start - now) / 60000);
      const when = mins > 0 ? `${_t('{mins} perc múlva kezdődik', { mins })}` : _t('Elkezdődött');
      toast(`${when}: ${r.title} – ${ch.name}`, { action: _t('Nézem'), onAction: () => player.play(ch), timeout: 30000 });
      api.notify?.({ title: `${when}: ${r.title}`, body: `${ch.name} · ${fmtTime(r.start)}`, channelId: ch.id, icon: ch.logo || '' });
    }
    // 2) automatikus átkapcsolás a kezdéskor (ha be van kapcsolva és az alkalmazás előtérben van)
    if (store.settings.reminderAutoSwitch && !r.switched && r.start <= now && now - r.start < 5 * 60000 && !document.hidden) {
      r.switched = true;
      changed = true;
      if (player.channel?.id === ch.id) continue;
      let cancelled = false;
      toast(`${_t('Átkapcsolás 8 mp múlva: {name} – {title}', { name: ch.name, title: r.title })}`, { action: _t('Maradok'), onAction: () => (cancelled = true), timeout: 8000 });
      setTimeout(() => !cancelled && player.play(ch), 8000);
    }
  }
  if (changed) {
    store.save();
    bus.emit('reminders');
  }
}

/** A platform saját ütemezője (Android): a bezárt alkalmazás helyett a rendszer értesít. */
export function scheduleNative() {
  if (!api.scheduleReminders) return;
  const now = Date.now();
  const list = (store.profile?.reminders || [])
    .filter((r) => r.start - leadMs() > now - 60000 && r.stop > now)
    .slice(0, 60)
    .map((r) => {
      const ch = catalog.byId.get(r.channelId);
      return { at: Math.max(now + 5000, r.start - leadMs()), start: r.start, title: r.title, channelId: r.channelId, channel: ch?.name || '' };
    });
  api.scheduleReminders(list);
}

bus.on('reminders', () => {
  scheduleNative();
  // az értesítési engedélyt akkor kérjük, amikor először beállít valaki emlékeztetőt
  if (store.profile?.reminders?.length) api.notifyPermission?.();
});
bus.on('profile', () => {
  syncSeries();
  scheduleNative();
});
bus.on('epg', syncSeries);
bus.on('settings', (k) => k === 'reminderLead' && scheduleNative());
