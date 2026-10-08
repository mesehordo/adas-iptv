// Gyerekprofilok: napi nézési idő és korhatár.
//  - napi keret (perc): ha elfogy, a lejátszás leáll, és csak szülői PIN-nel nézhető tovább (+30 perc);
//    5 perccel előtte figyelmeztet;
//  - korhatár: ha a műsorújság szerint a most futó műsor korhatára magasabb (pl. 16), az adás nem indul /
//    leáll – szülői PIN-nel az adott műsorra feloldható. (Csak ahol a műsorújság közöl korhatárt.)
import { $, esc, toast, fmtTime } from './util.js';
import { store } from './store.js';
import { epg } from './epg.js';
import { player } from './player.js';
import { requireAdult } from './pin.js';
import { kidsAllowed } from './kids.js';

const TICK = 15;
const video = $('#video');
const today = () => new Date().toDateString();
export const LIMITS = [0, 30, 45, 60, 90, 120, 180, 240];
export const AGES = [0, 6, 12, 16, 18];
const unlockedProgs = new Set(); // `${csatorna}|${kezdés}` – szülő feloldotta

function usage(p) {
  if (!p.usage || p.usage.day !== today()) p.usage = { day: today(), sec: 0, extra: 0 };
  return p.usage;
}
/** Hátralévő perc (Infinity, ha nincs korlát). */
export function minutesLeft(p = store.profile) {
  if (!p?.kids || !p.dailyLimit) return Infinity;
  const u = usage(p);
  return Math.max(0, p.dailyLimit + (u.extra || 0) - u.sec / 60);
}
export const usedToday = (p) => Math.round(usage(p).sec / 60);

async function askMore(p) {
  const ok = await requireAdult(`${p.name} mára elérte a napi nézési időt (${p.dailyLimit} perc). További 30 perchez`);
  if (ok) {
    usage(p).extra = (usage(p).extra || 0) + 30;
    store.save();
    toast('+30 perc nézési idő');
  }
  return ok;
}

function overAge(p, ch) {
  if (!p?.kids || !p.maxAge || ch.vod) return null;
  const cur = epg.now(ch.id, Date.now())?.cur;
  if (!cur?.age || cur.age <= p.maxAge || unlockedProgs.has(`${ch.id}|${cur.start}`)) return null;
  return cur;
}

async function askAge(p, ch, cur) {
  const ok = await requireAdult(`A most futó műsor (${cur.title}, ${fmtTime(cur.start)}–${fmtTime(cur.stop)}) ${cur.age} éven felülieknek szól. Megnézéséhez`);
  if (ok) unlockedProgs.add(`${ch.id}|${cur.start}`);
  return ok;
}

/** A profil tartalmi szabálya (felnőtt tartalom, gyerekprofil engedélyei) – minden indítási útvonalon. */
function contentAllowed(p, ch) {
  if (ch.vod) return !ch.vod.item || kidsAllowed(p, 'vod', ch.vod.item);
  if (ch.nsfw && (!store.settings.showAdult || p?.kids)) return false;
  return kidsAllowed(p, 'ch', ch);
}

/**
 * Az alkalmazáson kívüli lejátszás (külső lejátszó, a felvételszerkesztő előnézete): ott a napi keret és a
 * korhatár nem követhető, ezért gyerekprofilból csak felnőtt jóváhagyásával indul.
 */
export async function allowOutsidePlayback(what = 'Külső lejátszóban') {
  const p = store.profile;
  if (!p?.kids) return true;
  return requireAdult(`${what} a gyerekprofil nézési ideje és korhatára nem követhető. A megnyitásához`);
}

// A lejátszás indítása előtt
player.guard = async (ch) => {
  const p = store.profile;
  if (!contentAllowed(p, ch)) {
    toast('Ez a tartalom ebben a profilban nem nézhető.');
    return false;
  }
  if (!p?.kids) return true;
  if (minutesLeft(p) <= 0 && !(await askMore(p))) return false;
  const cur = overAge(p, ch);
  if (cur && !(await askAge(p, ch, cur))) return false;
  return true;
};

// Nézés közben: idő számlálása, figyelmeztetés, leállítás; műsorváltáskor a korhatár újra
let warned = '';
setInterval(async () => {
  const p = store.profile;
  if (!p?.kids || !player.active || document.hidden) return;
  // kivetítéskor a helyi lejátszó áll, de a vevőn megy az adás – az is nézésnek számít
  const playing = player.castHooks?.active ? !player.castHooks.paused : player.engine?.started && !video.paused;
  if (!playing) return;
  if (p.dailyLimit) {
    usage(p).sec += TICK;
    store.save();
    const left = minutesLeft(p);
    if (left <= 5 && left > 0 && warned !== today() + Math.ceil(left)) {
      warned = today() + Math.ceil(left);
      if (Math.ceil(left) === 5 || Math.ceil(left) === 1) toast(`Még ${Math.ceil(left)} perc nézési idő van mára.`, { timeout: 6000 });
    }
    if (left <= 0) {
      const ch = player.channel;
      player.close();
      toast(`${p.name}: mára elfogyott a nézési idő.`, { timeout: 8000 });
      if (await askMore(p)) player.play(ch);
      return;
    }
  }
  const ch = player.channel;
  const cur = ch && overAge(p, ch);
  if (cur) {
    player.close();
    if (await askAge(p, ch, cur)) player.play(ch);
  }
}, TICK * 1000);

/** Beállítások → Tartalom és gyerekek → Gyerekprofilok: napi keret és korhatár profilonként. */
export function limitsHtml(profs) {
  return `<div class="kids-limits">${profs
    .map((p) => {
      const left = minutesLeft(p);
      return `<div class="setting" data-kl-prof="${esc(p.id)}"><span><b>${esc(p.name)}</b><small>Ma eddig: ${usedToday(p)} perc${Number.isFinite(left) ? ` · még ${Math.round(left)} perc` : ''}</small></span>
        <div class="inline">
          <label class="kl-lab">Napi idő <select data-kl="dailyLimit">${LIMITS.map((m) => `<option value="${m}" ${(p.dailyLimit || 0) === m ? 'selected' : ''}>${m ? m + ' perc' : 'korlátlan'}</option>`).join('')}</select></label>
          <label class="kl-lab">Korhatár <select data-kl="maxAge">${AGES.map((a) => `<option value="${a}" ${(p.maxAge || 0) === a ? 'selected' : ''}>${a ? a + ' év' : 'nincs'}</option>`).join('')}</select></label>
        </div></div>`;
    })
    .join('')}<p class="muted small">A napi idő elfogyása után, és ha egy élő műsor korhatára magasabb a beállítottnál (ahol a műsorújság közli), csak felnőtt profil PIN-jével nézhető tovább. A PIN-t a Profilok kezelése alatt állíthatod be.</p></div>`;
}
export function bindLimits(box) {
  box.addEventListener('change', (e) => {
    const sel = e.target.closest('[data-kl]');
    if (!sel) return;
    e.stopPropagation();
    const p = store.profiles.find((x) => x.id === sel.closest('[data-kl-prof]').dataset.klProf);
    if (!p) return;
    p[sel.dataset.kl] = Number(sel.value);
    store.save();
    toast(`${p.name}: ${sel.dataset.kl === 'dailyLimit' ? (p.dailyLimit ? `napi ${p.dailyLimit} perc` : 'korlátlan nézési idő') : p.maxAge ? `korhatár ${p.maxAge} év` : 'nincs korhatár'}`);
  });
}
