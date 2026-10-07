// Szülői felügyelet: profilonkénti PIN-kód (profilzár), és a gyerekprofilból csak felnőtt
// PIN-jével lehet kilépni, a beállításokat és a profilokat módosítani.
import { html, esc } from './util.js';
import { store } from './store.js';
import { openModal } from './components.js';

/** Egyszerű, sózott ujjlenyomat (nem titkosítás – a PIN csak helyben, ezen az eszközön véd). */
export function hashPin(pin, salt) {
  let h = 0x811c9dc5;
  const s = `adas:${salt}:${pin}`;
  for (let round = 0; round < 500; round++) {
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 0x01000193) >>> 0;
    }
    h ^= round;
  }
  return h.toString(16).padStart(8, '0');
}

export const hasPin = (p) => !!p?.pinHash;
const checkPin = (p, pin) => hashPin(pin, p.id) === p.pinHash;

export function setPin(p, pin) {
  p.pinHash = pin ? hashPin(pin, p.id) : null;
  store.save();
}

// Ebben a munkamenetben feloldott profilok (a profilválasztóban PIN-nel vagy PIN nélkül megnyitva).
const unlocked = new Set();
export const markUnlocked = (p) => {
  if (!p) return;
  // Gyerekprofilra váltáskor minden zár visszaáll: onnan csak PIN-nel lehet kilépni.
  if (p.kids) unlocked.clear();
  unlocked.add(p.id);
};

const adultPins = () => store.profiles.filter((p) => !p.kids && hasPin(p));

/** Kell-e felnőtt jóváhagyás (beállítások, profilkezelés)? */
export function adultGuardNeeded() {
  if (!adultPins().length) return false;
  const cur = store.profile;
  return !(cur && !cur.kids && unlocked.has(cur.id));
}

let failCount = 0;
let lockedUntil = 0;

/**
 * PIN bekérése számbillentyűzettel (távirányítóval is kezelhető).
 * accept: a profilok, amelyek PIN-je elfogadható. → Promise<boolean>
 */
export function askPin({ title, text, accept }) {
  return new Promise((resolve) => {
    let pin = '';
    let done = false;
    const el = html(`<div class="dialog pin-dialog">
      <h2>${esc(title)}</h2>
      <p class="muted">${esc(text)}</p>
      <div class="pin-dots" aria-live="polite">${'<i></i>'.repeat(4)}</div>
      <p class="pin-msg"></p>
      <div class="pin-pad">${[1, 2, 3, 4, 5, 6, 7, 8, 9]
        .map((n) => `<button class="btn" data-k="${n}">${n}</button>`)
        .join('')}<button class="btn" data-k="del" aria-label="Törlés">⌫</button><button class="btn" data-k="0">0</button><button class="btn" data-k="cancel">Mégse</button></div>
      <details class="pin-forgot"><summary>Elfelejtettem a PIN-t</summary>
        <p class="muted small">A profil PIN-jét egy másik felnőtt profilból lehet törölni (Profilok kezelése → a profil szerkesztése). Ha nincs ilyen profil, az alkalmazás adatainak törlésével (az asztali változatban az adatmappa <code>store.json</code> fájljával) minden beállítás visszaáll.</p></details>
    </div>`);
    const finish = (ok) => {
      if (done) return;
      done = true;
      close();
      resolve(ok);
    };
    const close = openModal(el, { cls: 'small', onClose: () => finish(false) });
    const dots = el.querySelectorAll('.pin-dots i');
    const msg = el.querySelector('.pin-msg');
    const draw = () => dots.forEach((d, i) => d.classList.toggle('on', i < pin.length));
    const press = (k) => {
      if (Date.now() < lockedUntil) {
        msg.textContent = `Túl sok hibás próbálkozás – várj ${Math.ceil((lockedUntil - Date.now()) / 1000)} másodpercet.`;
        return;
      }
      if (k === 'cancel') return finish(false);
      if (k === 'del') pin = pin.slice(0, -1);
      else if (/^\d$/.test(k) && pin.length < 4) pin += k;
      draw();
      if (pin.length === 4) {
        if (accept.some((p) => checkPin(p, pin))) {
          failCount = 0;
          return finish(true);
        }
        failCount++;
        if (failCount >= 5) {
          lockedUntil = Date.now() + 30000;
          failCount = 0;
        }
        msg.textContent = 'Hibás PIN-kód.';
        el.classList.remove('shake');
        void el.offsetWidth;
        el.classList.add('shake');
        pin = '';
        setTimeout(draw, 250);
      }
    };
    el.addEventListener('click', (e) => {
      const b = e.target.closest('[data-k]');
      if (b) press(b.dataset.k);
    });
    el.addEventListener('keydown', (e) => {
      if (/^\d$/.test(e.key)) {
        e.preventDefault();
        e.stopPropagation();
        press(e.key);
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        e.stopPropagation();
        press('del');
      }
    });
    requestAnimationFrame(() => el.querySelector('[data-k="5"]').focus());
  });
}

/** Profil megnyitása: ha PIN-nel védett, bekéri. */
export async function unlockProfile(p) {
  if (!hasPin(p) || (unlocked.has(p.id) && !store.profile?.kids)) {
    markUnlocked(p);
    return true;
  }
  const ok = await askPin({ title: `${p.name} profil`, text: 'Ez a profil zárolva van. Add meg a PIN-kódját.', accept: [p] });
  if (ok) markUnlocked(p);
  return ok;
}

/** Felnőtt jóváhagyás kérése (pl. gyerekprofilból a beállításokhoz). */
export async function requireAdult(reason) {
  if (!adultGuardNeeded()) return true;
  return askPin({ title: 'Szülői jóváhagyás', text: `${reason} Add meg egy felnőtt profil PIN-kódját.`, accept: adultPins() });
}

/** Új PIN megadása kétszer. → Promise<string|null> */
export function choosePin(name) {
  return new Promise((resolve) => {
    let first = '';
    let pin = '';
    let done = false;
    const el = html(`<div class="dialog pin-dialog">
      <h2>PIN-kód: ${esc(name)}</h2>
      <p class="muted step">Adj meg egy 4 jegyű PIN-kódot.</p>
      <div class="pin-dots">${'<i></i>'.repeat(4)}</div>
      <p class="pin-msg"></p>
      <div class="pin-pad">${[1, 2, 3, 4, 5, 6, 7, 8, 9]
        .map((n) => `<button class="btn" data-k="${n}">${n}</button>`)
        .join('')}<button class="btn" data-k="del" aria-label="Törlés">⌫</button><button class="btn" data-k="0">0</button><button class="btn" data-k="cancel">Mégse</button></div>
    </div>`);
    const finish = (v) => {
      if (done) return;
      done = true;
      close();
      resolve(v);
    };
    const close = openModal(el, { cls: 'small', onClose: () => finish(null) });
    const dots = el.querySelectorAll('.pin-dots i');
    const draw = () => dots.forEach((d, i) => d.classList.toggle('on', i < pin.length));
    const press = (k) => {
      if (k === 'cancel') return finish(null);
      if (k === 'del') pin = pin.slice(0, -1);
      else if (/^\d$/.test(k) && pin.length < 4) pin += k;
      draw();
      if (pin.length < 4) return;
      if (!first) {
        first = pin;
        pin = '';
        el.querySelector('.step').textContent = 'Írd be még egyszer a megerősítéshez.';
        el.querySelector('.pin-msg').textContent = '';
        setTimeout(draw, 200);
      } else if (pin === first) finish(pin);
      else {
        first = '';
        pin = '';
        el.querySelector('.step').textContent = 'Adj meg egy 4 jegyű PIN-kódot.';
        el.querySelector('.pin-msg').textContent = 'A két PIN nem egyezett, kezdd újra.';
        setTimeout(draw, 200);
      }
    };
    el.addEventListener('click', (e) => {
      const b = e.target.closest('[data-k]');
      if (b) press(b.dataset.k);
    });
    el.addEventListener('keydown', (e) => {
      if (/^\d$/.test(e.key) || e.key === 'Backspace') {
        e.preventDefault();
        e.stopPropagation();
        press(e.key === 'Backspace' ? 'del' : e.key);
      }
    });
    requestAnimationFrame(() => el.querySelector('[data-k="5"]').focus());
  });
}
