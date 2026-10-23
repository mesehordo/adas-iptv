// Saját gombkiosztás: a távirányító (vagy billentyűzet) bármely gombja betanítható egy művelethez (fel, le, OK,
// vissza, lejátszás, csatornaváltás, színes gombok…). Főleg olcsó Android TV dobozokhoz, amelyek távirányítója
// eltérő gombkódokat küld. A kiosztás az eszközön, helyben él (localStorage – nem kerül a mentésbe és a szinkronba,
// így másik eszközre sem jut át), mert a távirányítóhoz tartozik.
//  - Asztalon, böngészőben és LG tévén a felület fordítja át a lenyomást a művelet szabványos billentyűjére.
//  - Androidon a keret (MainActivity) teszi ugyanezt a nyers gombkóddal, még a WebView előtt – így az olyan
//    gomb is betanítható, amelyet a WebView nem ismer (a felületen „Unidentified” lenne).
import { IS_ANDROID, IS_WEBOS } from './api.js';
import { esc, toast } from './util.js';
import { _t } from './i18n.js';

// művelet → a felület szabványos billentyűje és az Android-gombkód (KeyEvent.KEYCODE_*)
export const KEY_ACTIONS = [
  { id: 'up', key: 'ArrowUp', android: 19, label: () => _t('Fel') },
  { id: 'down', key: 'ArrowDown', android: 20, label: () => _t('Le') },
  { id: 'left', key: 'ArrowLeft', android: 21, label: () => _t('Balra') },
  { id: 'right', key: 'ArrowRight', android: 22, label: () => _t('Jobbra') },
  { id: 'ok', key: 'Enter', android: 23, label: () => _t('OK / kiválasztás') },
  { id: 'back', key: 'Escape', android: 4, label: () => _t('Vissza') },
  { id: 'playpause', key: 'MediaPlayPause', android: 85, label: () => _t('Lejátszás / szünet') },
  { id: 'stop', key: 'MediaStop', android: 86, label: () => _t('Leállítás') },
  { id: 'rew', key: 'MediaRewind', android: 89, label: () => _t('Visszatekerés ◀◀') },
  { id: 'ff', key: 'MediaFastForward', android: 90, label: () => _t('Előretekerés ▶▶') },
  { id: 'chup', key: 'ChannelUp', android: 166, label: () => _t('Következő csatorna (CH+)') },
  { id: 'chdown', key: 'ChannelDown', android: 167, label: () => _t('Előző csatorna (CH−)') },
  { id: 'red', key: 'ColorF0Red', android: 183, label: () => _t('Piros (kedvenc)') },
  { id: 'green', key: 'ColorF1Green', android: 184, label: () => _t('Zöld (adatok)') },
  { id: 'yellow', key: 'ColorF2Yellow', android: 185, label: () => _t('Sárga (keresés)') },
  { id: 'blue', key: 'ColorF3Blue', android: 186, label: () => _t('Kék (kedvencek)') },
  { id: 'subs', key: 'Subtitle', android: 175, label: () => _t('Hang és felirat') },
];
const ACTION = Object.fromEntries(KEY_ACTIONS.map((a) => [a.id, a]));

/** Ezen a felületen melyik kiosztás érvényes (a máshol – pl. asztalon – betanított gombok itt nem számítanak). */
export const KEY_PLATFORM = IS_ANDROID ? 'android' : IS_WEBOS ? 'webos' : window.api ? 'desktop' : 'web';

/**
 * A kiosztás tisztítva: [{ action, plat, code?, keyCode?, key?, android?, pad?, name }] – csak ismert művelet, gombonként
 * egy. plat: 'pad' – kontrollergomb (gamepad.js; minden felületen, ahol a kontrollert a felület kezeli).
 */
export function keyMapEntries(list = loadMap()) {
  const out = [];
  const seen = new Set();
  for (const e of Array.isArray(list) ? list : []) {
    if (!e || typeof e !== 'object' || !ACTION[e.action] || typeof e.plat !== 'string') continue;
    const k = keyId(e);
    if (!k || seen.has(e.plat + k)) continue;
    seen.add(e.plat + k);
    out.push({
      action: e.action,
      plat: e.plat,
      ...(Number.isInteger(e.android) ? { android: e.android } : {}),
      ...(Number.isInteger(e.pad) && e.pad >= 0 && e.pad < 64 ? { pad: e.pad } : {}),
      ...(Number.isInteger(e.keyCode) ? { keyCode: e.keyCode } : {}),
      ...(typeof e.code === 'string' ? { code: e.code } : {}),
      ...(typeof e.key === 'string' ? { key: e.key } : {}),
      name: typeof e.name === 'string' ? e.name.slice(0, 40) : '',
    });
  }
  return out;
}
// egy gomb azonosítója (Androidon a nyers kód; máshol a fizikai gomb kódja, a gombkód vagy a billentyű neve)
function keyId(e) {
  if (Number.isInteger(e.pad)) return 'p' + e.pad;
  if (Number.isInteger(e.android)) return 'a' + e.android;
  if (e.code) return 'c' + e.code;
  if (e.keyCode > 0) return 'k' + e.keyCode;
  if (e.key && e.key !== 'Unidentified') return 'n' + e.key;
  return '';
}
// (ezen a felületen érvényes: a felület saját billentyűi és a kontroller gombjai)
const isMine = (e) => e.plat === KEY_PLATFORM || e.plat === 'pad';
const mine = () => keyMapEntries().filter(isMine);

const LS_KEY = 'adas-keymap';
function loadMap() {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) || '[]');
  } catch {
    return [];
  }
}
/** → sikerült-e (letiltott vagy megtelt tárolónál nem: ilyenkor a felhasználó hibaüzenetet kap). */
function save(list) {
  let ok = true;
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(keyMapEntries(list)));
  } catch {
    ok = false;
    toast(_t('A gombkiosztás nem menthető: a böngésző tárolója nem érhető el vagy megtelt.'), { timeout: 8000 });
  }
  syncNative();
  return ok;
}

/** Androidon a keret kapja meg a kiosztást (nyers kód → a művelet gombkódja). */
function syncNative() {
  if (!IS_ANDROID) return;
  const map = {};
  for (const e of mine()) if (Number.isInteger(e.android)) map[e.android] = ACTION[e.action].android;
  try {
    window.AdasAndroid.setKeyMap?.(JSON.stringify(map));
  } catch {}
}

// ---------------------------------------------------------------------------
// Átfordítás (asztal, böngésző, LG): elfogó figyelő az ablakon – minden más kezelő előtt fut
// ---------------------------------------------------------------------------
let learning = null; // betanítás közben: (lenyomás) => void
let installed = false;
export function installKeyMap() {
  if (installed) return;
  installed = true;
  syncNative();
  let learnedUp = null; // a betanított gomb felengedése sem megy tovább
  const handle = (e) => {
    if (!e.isTrusted || IS_ANDROID) return; // (a saját, átfordított eseményünk; Androidon a keret fordít és tanul)
    const sig = `${e.keyCode}|${e.code}|${e.key}`;
    if (learning || (e.type === 'keyup' && learnedUp === sig)) {
      e.preventDefault();
      e.stopImmediatePropagation();
      if (e.type === 'keyup') learnedUp = null;
      else if (!e.repeat) {
        learnedUp = sig;
        learning({ keyCode: e.keyCode || 0, code: e.code || '', key: e.key || '' });
      }
      return;
    }
    // (módosítóbillentyűvel – Ctrl+F, Ctrl+C, Alt+… – az eredeti parancs marad, nem fordítunk)
    if (e.ctrlKey || e.altKey || e.metaKey) return;
    const t = e.target;
    // (gépelés közben a betűk és számok maradnak, amik)
    if (e.key?.length === 1 && t?.matches?.('input:not([type=checkbox]):not([type=range]), textarea, [contenteditable]')) return;
    const hit = mine().find((m) => (m.code ? m.code === e.code && (!m.keyCode || m.keyCode === e.keyCode) : m.keyCode > 0 ? m.keyCode === e.keyCode : m.key === e.key));
    if (!hit) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    fire(ACTION[hit.action], t, e.type, e.repeat);
  };
  // (a felengedés is kell: pl. a rádiókártyán az OK felengedése indítja a lejátszást, a hosszú lenyomás mást csinál)
  window.addEventListener('keydown', handle, true);
  window.addEventListener('keyup', handle, true);
  // Androidon a keret küldi a betanított gombot
  window.__adasKeyLearned = (code, name) => learning?.({ android: Number(code), name: String(name || '') });
  // a [data-keymap] gombok (első indítás, profilszerkesztő, Beállítások) mind ezt nyitják
  document.addEventListener('click', (e) => {
    if (!e.target.closest?.('[data-keymap]')) return;
    e.preventDefault();
    openKeymapDialog();
  });
}

/** Rövid összegzés a Beállításokhoz: hány gomb van betanítva. */
export function keyMapSummary() {
  const n = mine().length;
  return n ? esc(_t('{n} betanított gomb ezen az eszközön.', { n })) : esc(_t('Nincs betanított gomb – csak a beépítettek működnek.'));
}

// ---------------------------------------------------------------------------
// Kontroller (gamepad.js): a művelet elküldése, a betanított kontrollergombok, betanítás
// ---------------------------------------------------------------------------
/** A szabványos kontroller-kiosztás gombjainak neve. */
export const PAD_BUTTONS = ['A', 'B', 'X', 'Y', 'LB', 'RB', 'LT', 'RT', 'Select', 'Start', 'L3', 'R3', '↑', '↓', '←', '→', 'Guide'];
/** Egy művelet elküldése (mintha a távirányító gombját nyomták volna meg / engedték volna fel). */
export function fireAction(id, type = 'keydown', repeat = false) {
  if (ACTION[id]) fire(ACTION[id], null, type, repeat);
}
/** A kontroller i. gombjához betanított művelet (vagy null). */
export const padOverride = (i) => mine().find((m) => m.pad === i)?.action || null;
/** Betanítás alatt a kontroller lenyomott gombja a betanítóhoz megy. → átvette-e */
export function padLearning(i) {
  if (!learning) return false;
  learning({ pad: i, name: `🎮 ${PAD_BUTTONS[i] || _t('{n}. gomb', { n: i + 1 })}` });
  return true;
}

/** A művelet szabványos billentyűjének elküldése (OK lenyomásakor a gomb, link megnyomása is, mint igazi Enternél). */
function fire(a, target, type = 'keydown', repeat = false) {
  const t = target || document.activeElement || document.body;
  const ev = new KeyboardEvent(type, { key: a.key, bubbles: true, cancelable: true, repeat });
  t.dispatchEvent(ev);
  if (type === 'keydown' && a.id === 'ok' && !ev.defaultPrevented && t.matches?.('button, a[href], [role=button], summary, input[type=checkbox], input[type=radio], select, [tabindex]:not(input):not(textarea)')) t.click?.();
}

/** Egy gomb betanítása: a következő lenyomás (legfeljebb ms ideig). → { keyCode, code, key } / { android, name } / null */
export function learnKey(ms = 10000) {
  return new Promise((resolve) => {
    const done = (v) => {
      clearTimeout(timer);
      learning = null;
      try {
        window.AdasAndroid?.learnKey?.(false);
      } catch {}
      resolve(v);
    };
    const timer = setTimeout(() => done(null), ms);
    learning = done;
    learnKey.cancel = () => learning === done && done(null);
    try {
      if (IS_ANDROID) window.AdasAndroid.learnKey?.(true);
    } catch {}
  });
}

/** A gomb neve emberi alakban. */
export function keyName(e) {
  if (Number.isInteger(e.pad)) return e.name || `🎮 ${PAD_BUTTONS[e.pad] || e.pad + 1}`;
  if (Number.isInteger(e.android)) return e.name || _t('{n}. gomb', { n: e.android });
  if (e.key && e.key !== 'Unidentified' && e.key !== ' ') return e.key.length === 1 ? e.key.toUpperCase() : e.key;
  if (e.key === ' ') return _t('Szóköz');
  return e.code || (e.keyCode ? _t('{n}. gomb', { n: e.keyCode }) : '?');
}

// ---------------------------------------------------------------------------
// Párbeszédablak: műveletek listája, gombonként betanítás / törlés
// ---------------------------------------------------------------------------
export async function openKeymapDialog() {
  const { openModal, confirmDialog } = await import('./components.js');
  const el = document.createElement('div');
  el.className = 'dialog keymap';
  let busy = null; // a betanítás alatt álló művelet
  const draw = () => {
    const list = mine();
    el.innerHTML = `<h2>${_t('🎮 Gombkiosztás')}</h2>
      <p class="muted small">${_t('Ha a távirányítód vagy a kontrollered valamelyik gombja nem működik, vagy máshová tennéd: válaszd a műveletet, nyomd meg a <b>Betanítás</b> gombot, aztán a távirányító vagy a kontroller gombját. A beépített gombok továbbra is működnek; a kiosztás ehhez az eszközhöz tartozik.')}</p>
      <ul class="km-list">${KEY_ACTIONS.map((a) => {
        const keys = list.filter((m) => m.action === a.id);
        return `<li class="${busy === a.id ? 'busy' : ''}"><span class="km-act">${esc(a.label())}</span>
          <span class="km-keys">${busy === a.id ? `<b class="km-wait">${_t('Nyomd meg a gombot…')}</b>` : keys.length ? keys.map((k) => `<span class="km-key">${esc(keyName(k))}<button class="btn small ghost" data-km-del="${esc(a.id)}|${esc(keyId(k))}" title="${_t('Törlés')}" aria-label="${_t('Törlés')}">✕</button></span>`).join('') : `<span class="muted small">${_t('csak a beépített')}</span>`}</span>
          ${busy === a.id ? `<button class="btn small" data-km-cancel>${_t('Mégse')}</button>` : `<button class="btn small" data-km-learn="${esc(a.id)}">${_t('Betanítás')}</button>`}</li>`;
      }).join('')}</ul>
      <div class="dialog-btns">${list.length ? `<button class="btn" data-km-reset>${_t('Mind törlése')}</button>` : ''}<span class="grow"></span><button class="btn primary" data-km-close>${_t('Kész')}</button></div>`;
  };
  const close = openModal(el, {
    cls: 'medium',
    onClose: () => {
      learnKey.cancel?.();
      document.querySelectorAll('.km-summary').forEach((p) => (p.innerHTML = keyMapSummary()));
    },
  });
  draw();
  el.addEventListener('click', async (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.kmClose != null) return close();
    if (b.dataset.kmCancel != null) return learnKey.cancel?.();
    if (b.dataset.kmReset != null) {
      if (!(await confirmDialog(_t('Törlöd az összes betanított gombot? (A beépített gombok megmaradnak.)'), { ok: _t('Törlés'), danger: true }))) return;
      save(keyMapEntries().filter((m) => !isMine(m)));
      return draw();
    }
    if (b.dataset.kmDel) {
      const [act, id] = b.dataset.kmDel.split('|');
      save(keyMapEntries().filter((m) => !(isMine(m) && m.action === act && keyId(m) === id)));
      draw();
      return el.querySelector(`[data-km-learn="${CSS.escape(act)}"]`)?.focus();
    }
    const act = b.dataset.kmLearn;
    if (!act || busy) return;
    busy = act;
    draw();
    el.querySelector('[data-km-cancel]')?.focus();
    const k = await learnKey();
    busy = null;
    if (!el.isConnected) return;
    if (k && keyId(k)) {
      // (egy gomb egy művelethez tartozik: ha máshoz volt betanítva, onnan átkerül)
      const entry = { ...k, action: act, plat: Number.isInteger(k.pad) ? 'pad' : KEY_PLATFORM, name: k.name || keyName(k) };
      if (save([...keyMapEntries().filter((m) => !(isMine(m) && keyId(m) === keyId(entry))), entry])) toast(_t('{key} → {action}', { key: keyName(entry), action: ACTION[act].label() }));
    } else if (k) toast(_t('Ezt a gombot a rendszer nem adja át az Adásnak – próbálj egy másikat.'));
    draw();
    el.querySelector(`[data-km-learn="${CSS.escape(act)}"]`)?.focus();
  });
  return close;
}
