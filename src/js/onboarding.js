// Első indítás varázslója: nyelv → saját profil (név, profilkép) → gyerekprofil (átugorható).
// A nyelvválasztás újratöltéssel jár (a felület minden szövege az új nyelven épül fel); a folytatás
// helyét a localStorage őrzi, így a varázsló a következő lépéssel folytatódik.
import { esc, html } from './util.js';
import { store, PROFILE_COLORS, AVATAR_COUNT } from './store.js';
import { avatarPicker } from './views.js';
import { _t, LANGS, lang, savedLang, suggestedLang, setLanguage } from './i18n.js';

const STEP_KEY = 'adas-onboard';
const getStep = () => {
  try {
    return localStorage.getItem(STEP_KEY) || '';
  } catch {
    return '';
  }
};
/** → sikerült-e menteni (nem írható tárolónál false). */
const setStep = (s) => {
  try {
    if (s) localStorage.setItem(STEP_KEY, s);
    else localStorage.removeItem(STEP_KEY);
    return true;
  } catch {
    return false;
  }
};

/** Kell-e a varázsló (még nincs mentett profil, vagy egy félbehagyott varázsló folytatódik)? */
export const needsOnboarding = () => store.firstRun || !!getStep();

// A választott nyelvhez illő „hazai ország” (a csatornák sorrendjéhez és a csatornaszámokhoz):
// a rendszer területi beállítása, ha ugyanaz a nyelv (pl. en-US → US), különben a nyelv alapértelmezése.
function homeCountryFor(l) {
  const nav = String(navigator.language || '');
  const m = /^([a-z]{2})-([A-Z]{2})$/.exec(nav);
  if (m && m[1] === l) return m[2] === 'GB' ? 'UK' : m[2];
  const c = LANGS.find((x) => x.id === l)?.country || 'HU';
  return c === 'GB' ? 'UK' : c;
}

// Ország → a beépített iptv-epg.org műsorújság országkódja (a közeli, azonos nyelvű országok is)
const EPG_CC = { UK: 'gb', GB: 'gb', IE: 'gb', AU: 'gb', NZ: 'gb', US: 'us', CA: 'us', DE: 'de', AT: 'de', CH: 'de', FR: 'fr', BE: 'fr', LU: 'fr', ES: 'es', MX: 'es', AR: 'es', IT: 'it' };

const dots = (i) => `<div class="ob-dots" aria-hidden="true">${[0, 1, 2].map((k) => `<i class="${k === i ? 'on' : ''}"></i>`).join('')}</div>`;

/**
 * A varázsló futtatása a megadott (teljes képernyős) elemben. → Promise, amely a profilok
 * létrehozásakor teljesül (a nyelvváltás újratöltéssel jár, ilyenkor nem tér vissza).
 */
export function runOnboarding(root) {
  root.hidden = false;
  root.classList.add('onboarding');
  document.body.classList.add('picking');
  return new Promise((resolve) => {
    const state = { name: '', kidsName: _t('Gyerekek'), me: null, kids: null };

    // 1. lépés: nyelv
    const stepLang = () => {
      let sel = savedLang || suggestedLang();
      root.innerHTML = `<div class="ob">
        <div class="brand big">ADÁS</div>
        <h1>Nyelv · Language · Sprache · Idioma · Langue</h1>
        <div class="ob-langs" role="radiogroup">${LANGS.map((l) => `<button class="ob-lang ${l.id === sel ? 'sel' : ''}" data-l="${l.id}" role="radio" aria-checked="${l.id === sel}"><b>${esc(l.name)}</b></button>`).join('')}</div>
        <button class="btn primary big ob-next" data-next>${esc(_t('Tovább'))} →</button>
        ${dots(0)}
      </div>`;
      const choose = (b) => {
        sel = b.dataset.l;
        root.querySelectorAll('.ob-lang').forEach((x) => {
          x.classList.toggle('sel', x === b);
          x.setAttribute('aria-checked', String(x === b));
        });
      };
      root.onclick = (e) => {
        const b = e.target.closest('[data-l]');
        if (b) return choose(b);
        if (!e.target.closest('[data-next]')) return;
        const stepSaved = setStep('profile');
        if (sel !== lang || !savedLang) {
          // a választás mentése; más nyelvnél újratöltés – utána a profil lépés jön. Ha a tároló nem
          // írható, nincs újratöltés (különben körbe-körbe a nyelvválasztóhoz jutna): a varázsló a mostani
          // nyelven megy tovább, a választott nyelv pedig a beállításokba kerül (finish).
          const langSaved = setLanguage(sel, { reload: false });
          if (sel !== lang && stepSaved && langSaved) return void setTimeout(() => location.reload(), 150);
          if (sel !== lang) state.lang = sel;
        }
        stepProfile();
      };
      (root.querySelector('.ob-lang.sel') || root.querySelector('.ob-lang'))?.focus();
    };

    // 2. lépés: saját profil
    const stepProfile = () => {
      const picker = avatarPicker({ avatar: state.me?.avatar ?? Math.floor(Math.random() * AVATAR_COUNT), avatarData: state.me?.avatarData, color: PROFILE_COLORS[0], name: state.name });
      root.innerHTML = `<div class="ob">
        <div class="brand big">ADÁS</div>
        <h1>${esc(_t('Üdv az Adásban!'))}</h1>
        <p class="muted">${esc(_t('Hozd létre a profilodat: add meg a neved, és válassz profilképet.'))}</p>
        <label class="ob-field">${esc(_t('Név'))}<input class="input" name="name" maxlength="20" autocomplete="off" value="${esc(state.name)}" /></label>
        <div class="ob-av"></div>
        <div class="ob-btns"><button class="btn" data-back>${esc(_t('Vissza'))}</button><button class="btn primary big" data-next>${esc(_t('Tovább'))} →</button></div>
        ${dots(1)}
      </div>`;
      root.querySelector('.ob-av').replaceWith(picker.el);
      const input = root.querySelector('input[name="name"]');
      input.oninput = () => picker.setName(input.value);
      const next = () => {
        state.name = input.value.trim();
        if (!state.name) {
          input.focus();
          input.classList.add('shake');
          setTimeout(() => input.classList.remove('shake'), 400);
          return;
        }
        state.me = picker.value();
        setStep('kids');
        stepKids();
      };
      input.onkeydown = (e) => e.key === 'Enter' && (e.preventDefault(), next());
      root.onclick = (e) => {
        if (e.target.closest('[data-back]')) return stepLang();
        if (e.target.closest('[data-next]')) next();
      };
      input.focus();
    };

    // 3. lépés: gyerekprofil (átugorható)
    const stepKids = () => {
      const picker = avatarPicker({ avatar: state.kids?.avatar ?? 6, avatarData: state.kids?.avatarData, color: PROFILE_COLORS[3], name: state.kidsName });
      root.innerHTML = `<div class="ob">
        <div class="brand big">ADÁS</div>
        <h1>${esc(_t('Gyerekprofil'))}</h1>
        <p class="muted">${esc(_t('A gyerekprofilban csak gyerek-, családi, animációs és oktatási tartalom látszik, és napi nézési idő is beállítható. Ha most nem kell, átugorhatod – később a Profilok kezelése alatt is létrehozhatod.'))}</p>
        <label class="ob-field">${esc(_t('Név'))}<input class="input" name="kname" maxlength="20" autocomplete="off" value="${esc(state.kidsName)}" /></label>
        <div class="ob-av"></div>
        <div class="ob-btns"><button class="btn" data-back>${esc(_t('Vissza'))}</button><button class="btn" data-skip>${esc(_t('Kihagyom'))}</button><button class="btn primary big" data-create>${esc(_t('Létrehozom'))}</button></div>
        ${dots(2)}
      </div>`;
      root.querySelector('.ob-av').replaceWith(picker.el);
      const input = root.querySelector('input[name="kname"]');
      input.oninput = () => picker.setName(input.value);
      root.onclick = (e) => {
        if (e.target.closest('[data-back]')) {
          state.kidsName = input.value;
          state.kids = picker.value();
          return stepProfile();
        }
        if (e.target.closest('[data-skip]')) return finish(null);
        if (e.target.closest('[data-create]')) finish({ name: input.value.trim() || _t('Gyerekek'), ...picker.value() });
      };
      root.querySelector('[data-create]').focus();
    };

    const finish = (kids) => {
      store.profiles = [];
      const me = store.addProfile(state.name, PROFILE_COLORS[0], false, state.me.avatar);
      me.avatarData = state.me.avatarData;
      if (kids) {
        const k = store.addProfile(kids.name, PROFILE_COLORS[3], true, kids.avatar);
        k.avatarData = kids.avatarData;
      }
      store.activeProfileId = me.id;
      const s = store.settings;
      // (a választott nyelv – nem írható tárolónál a varázsló a régi nyelven futott végig)
      const l = state.lang || lang;
      s.lang = l;
      if (l !== 'hu' && s.homeCountry === 'HU') {
        s.homeCountry = homeCountryFor(l);
        // műsorújság: a magyar források helyett a hazai ország (ennek híján a nyelv) forrása
        const cc = EPG_CC[s.homeCountry] || { en: 'gb', de: 'de', es: 'es', fr: 'fr' }[l];
        s.epgSources = (s.epgSources || []).map((src) => ({
          ...src,
          enabled: /epg-hu\.|_HU1\./.test(src.url) ? false : cc && src.url.endsWith(`/epg-${cc}.xml.gz`) ? true : src.enabled,
        }));
      }
      store.firstRun = false;
      store.flush();
      setStep('');
      root.onclick = null;
      root.hidden = true;
      root.classList.remove('onboarding');
      document.body.classList.remove('picking');
      resolve(me);
    };

    const step = getStep();
    if (step === 'kids' && state.me) stepKids();
    else if (step === 'profile' || step === 'kids') stepProfile();
    else stepLang();
  });
}
