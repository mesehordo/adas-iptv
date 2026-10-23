// Kontroller (játékvezérlő) támogatás: a csatlakoztatott kontroller gombjai és bal karja a felület műveleteit
// küldik – mint a távirányító: nyilak, OK, vissza, csatornaváltás, tekerés, színes gombok. HTPC-n, Batocera-gépen,
// kézikonzolon így egér és billentyűzet nélkül is kezelhető. (A Gamepad API-t a felület körönként lekérdezi.)
// Androidon a rendszer maga fordítja a kontroller gombjait billentyűkké (A = OK, B = vissza, D-pad = nyilak) – ott
// ez a modul nem fut, a gombkiosztás betanítása ott a keret nyers gombkódjaival működik.
// A gombkiosztásban (keymap.js) a kontroller gombjai is betaníthatók: a betanított gomb a beépített hozzárendelést
// felülírja.
import { store } from './store.js';
import { bus, esc, toast } from './util.js';
import { _t } from './i18n.js';
import { IS_ANDROID } from './api.js';
import { fireAction, padLearning, padOverride } from './keymap.js';

// a szabványos (W3C „standard”) kiosztás gombjai → művelet (a gombok neve: keymap.js, PAD_BUTTONS)
const DEFAULTS = {
  0: 'ok', // A
  1: 'back', // B
  2: 'green', // X – a csatorna adatai / műsorújság
  3: 'yellow', // Y – keresés (lejátszás közben: minőség, forrás)
  4: 'chdown', // LB
  5: 'chup', // RB
  6: 'rew', // LT
  7: 'ff', // RT
  8: 'blue', // Select / Back – kedvencek (lejátszás közben: csatornalista)
  9: 'playpause', // Start
  10: 'red', // L3 – kedvenc be / ki
  11: 'subs', // R3 – hang és felirat
  12: 'up',
  13: 'down',
  14: 'left',
  15: 'right',
};
const REPEATS = new Set(['up', 'down', 'left', 'right']); // nyomva tartva ismétlődik
const FIRST = 380; // ms – az első ismétlésig
const EVERY = 110; // ms – utána ennyi időnként
const DEAD = 0.55; // a kar holtjátéka

const enabled = () => !IS_ANDROID && store.settings.gamepad !== false && typeof navigator.getGamepads === 'function';
const held = new Map(); // "kontroller:gomb" → { action, next }
let raf = 0;

/** A gombhoz tartozó művelet: a betanított, különben a beépített (csak szabványos kiosztásnál). */
const actionOf = (gp, i) => padOverride(i) || (gp.mapping === 'standard' || i < 12 ? DEFAULTS[i] : null);

function press(key, action, now) {
  held.set(key, { action, next: now + FIRST });
  fireAction(action, 'keydown');
}
function release(key) {
  const h = held.get(key);
  if (!h) return;
  held.delete(key);
  fireAction(h.action, 'keyup');
}

function poll() {
  raf = 0;
  if (!enabled()) return releaseAll();
  const pads = [...navigator.getGamepads()].filter(Boolean);
  if (!pads.length) return releaseAll();
  const now = performance.now();
  // (az ablak nincs előtérben – pl. másik alkalmazás –: nem küldünk semmit)
  const active = document.hasFocus();
  for (const gp of pads) {
    const down = new Set();
    gp.buttons.forEach((b, i) => (b.pressed || b.value > 0.5) && down.add('b' + i));
    // bal kar → nyilak
    const [x = 0, y = 0] = gp.axes;
    if (Math.abs(x) > DEAD || Math.abs(y) > DEAD) down.add(Math.abs(x) > Math.abs(y) ? (x > 0 ? 'right' : 'left') : y > 0 ? 'down' : 'up');
    for (const id of down) {
      const key = gp.index + ':' + id;
      const isBtn = id[0] === 'b';
      const action = isBtn ? actionOf(gp, Number(id.slice(1))) : id;
      if (!held.has(key)) {
        // betanítás közben a lenyomott kontrollergomb a betanítóhoz megy, nem a felülethez
        if (isBtn && padLearning(Number(id.slice(1)), gp)) {
          held.set(key, { action: null, next: Infinity });
          continue;
        }
        if (action && active) press(key, action, now);
        else held.set(key, { action: null, next: Infinity });
      } else {
        const h = held.get(key);
        if (h.action && REPEATS.has(h.action) && now >= h.next) {
          h.next = now + EVERY;
          fireAction(h.action, 'keydown', true);
        }
      }
    }
    for (const key of [...held.keys()]) {
      if (!key.startsWith(gp.index + ':')) continue;
      if (!down.has(key.slice(key.indexOf(':') + 1))) release(key);
    }
  }
  raf = requestAnimationFrame(poll);
}
function releaseAll() {
  for (const key of [...held.keys()]) release(key);
}
const start = () => {
  if (enabled() && !raf) raf = requestAnimationFrame(poll);
};

const padName = (g) => g.id.replace(/\s*\(.*?Vendor.*?\)\s*/i, '').trim() || _t('Kontroller');
/** A csatlakoztatott kontrollerek neve (a Beállításokhoz). */
export function connectedPads() {
  if (typeof navigator.getGamepads !== 'function') return [];
  return [...navigator.getGamepads()].filter(Boolean).map(padName);
}
/** Állapotsor (HTML): a csatlakoztatott kontrollerek, vagy hogyan ismerhető fel. */
export function padStatus() {
  const pads = connectedPads();
  return pads.length ? esc(_t('Csatlakoztatva: {list}', { list: pads.join(', ') })) : esc(_t('Nem látok kontrollert – csatlakoztasd, és nyomd meg bármelyik gombját.'));
}
/**
 * Kontroller-blokk az első indításhoz és a profilszerkesztőhöz: kapcsoló (azonnal érvényes, az eszköz összes
 * profiljára) és élő állapot (a gombkiosztás gombja mellette van). Androidon üres (ott a rendszer kezeli a kontrollert).
 */
export function padSetupHtml() {
  if (IS_ANDROID) return '';
  return `<div class="setting pad-setup"><span><b>${esc(_t('Kontroller (játékvezérlő)'))}</b><small>${esc(_t('Kezelés kontrollerrel: bal kar / D-pad = mozgás, A = OK, B = vissza (ezen az eszközön, minden profilnak).'))}</small>
      <small class="pad-status">${padStatus()}</small></span>
    <input type="checkbox" class="switch" data-pad-toggle aria-label="${esc(_t('Kontroller (játékvezérlő)'))}" ${store.settings.gamepad !== false ? 'checked' : ''} /></div>`;
}

if (!IS_ANDROID) {
  // (a böngészőmotor a kontrollert csak az első gombnyomás után mutatja meg – akkor jelezzük, egyszer)
  const told = new Set();
  window.addEventListener('gamepadconnected', (e) => {
    start();
    bus.emit('gamepads');
    const name = padName(e.gamepad);
    if (told.has(name)) return;
    told.add(name);
    if (enabled()) toast(_t('🎮 Kontroller felismerve: {name} – A = OK, B = vissza', { name }));
    else toast(_t('🎮 Kontroller csatlakoztatva: {name}', { name }), { action: _t('Bekapcsolás'), onAction: () => store.set('gamepad', true), timeout: 8000 });
  });
  document.addEventListener('change', (e) => {
    if (e.target.matches?.('[data-pad-toggle]')) store.set('gamepad', e.target.checked);
  });
  window.addEventListener('gamepaddisconnected', () => bus.emit('gamepads'));
  // (a már csatlakoztatott kontroller csak az első gombnyomásra jelentkezik – akkor indul a lekérdezés)
  window.addEventListener('focus', start);
  bus.on('settings', (k) => k === 'gamepad' && (enabled() ? start() : releaseAll()));
  start();
}
