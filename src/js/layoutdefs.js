// Felület-elrendezések (profilonként): a téma a kinézet (színek, betűk, keretek), az elrendezés a szerkezet
// (hol a menü, mi van a Főoldalon, hogyan böngészhetők a csatornák). Bármelyik téma bármelyik elrendezéssel
// együtt választható. A megjelenítés a layouts.js-ben (ez a modul körkörös import nélkül is behúzható).
import { store } from './store.js';
import { _t } from './i18n.js';

/** side: széles képernyőn oldalsó menüsáv (keskenyen a szokásos felső / alsó menü). */
export const LAYOUTS = {
  classic: {
    label: _t('Klasszikus'),
    desc: _t('Klasszikus: felső menüsáv, a Főoldalon testreszabható kártyák (időjárás, hírek, műsor), a TV oldalon csatornasorok.'),
  },
  cinema: {
    label: _t('Mozi'),
    desc: _t('Mozi: a Főoldal tetején nagy kiemelt borító a kedvenc vagy utoljára nézett csatornával (élő előnézettel), alatta csatornasorok.'),
  },
  showcase: {
    label: _t('Kirakat'),
    desc: _t('Kirakat: lapozó kiemelt sáv, alatta nagy gombok a fő részekhez (TV, Rádió, VOD, Sport…), utána csatornasorok. Távirányítóval a legkényelmesebb.'),
  },
  shelf: {
    label: _t('Polc'),
    desc: _t('Polc: a kijelölt csatorna tölti ki a hátteret (műsor, élő előnézet), alul egy sor nagy kártya. Letisztult, főleg tévére.'),
  },
  library: {
    label: _t('Könyvtár'),
    desc: _t('Könyvtár: oldalsó menü a gyűjteményeiddel és kedvenceiddel, alul állandó lejátszósáv a rádiónak. Asztali gépre és tabletre.'),
    side: true,
  },
  tiles: {
    label: _t('Csempék'),
    desc: _t('Csempék: kiemelt borító, alatta nagy témakör-csempék (hírek, gyerek, sport, film…). Képekből választani – gyerekeknek is egyszerű.'),
  },
  detail: {
    label: _t('Részletes'),
    desc: _t('Részletes: balra a csatornák listája, jobbra a kiválasztott csatorna adatlapja a mai műsorral és a nézési idővel. Egérrel a leggyorsabb.'),
  },
  unified: {
    label: _t('Gyűjtemény'),
    desc: _t('Gyűjtemény: minden forrás (beépített és saját listák) egy helyen, szűrőkkel (forrás, kategória, ország), rács- vagy listanézettel.'),
    side: true,
  },
  wall: {
    label: _t('Csempefal'),
    desc: _t('Csempefal: nagy „Folytatás” csempe és a rögzített kedvencek rácsa, mellette útmutató a most futó műsorokkal.'),
  },
  squares: {
    label: _t('Négyzetek'),
    desc: _t('Négyzetek: egyetlen sor nagy, négyzetes csatornacsempe, felette a kijelölt műsora, alul kerek gombok a fő részekhez. Gyerekeknek és tévére a legegyszerűbb.'),
  },
  ribbon: {
    label: _t('Menüszalag'),
    desc: _t('Menüszalag: vízszintesen a részek (kedvencek, most, rádió, videotár…), függőlegesen a tartalmuk – távirányítóval négy nyíllal minden elérhető.'),
  },
  focus: {
    label: _t('Fókusz'),
    desc: _t('Fókusz: felül funkciósáv, alatta egy sor csempe – a kijelölt nagyobb, alatta a műsora és a gombjai, a háttérben a csatorna.'),
  },
  desk: {
    label: _t('Asztal'),
    desc: _t('Asztal: változó élő csempék (műsor, ma este, óra, részek), a menü alul tálcaként. Asztali gépen otthonos.'),
  },
};

export const currentLayout = (p = store.profile) => (p && LAYOUTS[p.layout] ? p.layout : 'classic');

/**
 * Elrendezés-választó kis vázlatrajzokkal (Beállítások → Megjelenés, profil szerkesztése). A kijelölés a
 * data-layout-pick gombokon; a hívó kezeli a kattintást (pickLayoutIn).
 */
export function layoutPickerHtml(cur) {
  return `<div class="lay-pick" role="radiogroup" aria-label="${_t('Felület elrendezése')}">${Object.entries(LAYOUTS)
    .map(([id, l]) => `<button type="button" class="lay-opt ${id === cur ? 'sel' : ''}" role="radio" aria-checked="${id === cur}" data-layout-pick="${id}" title="${l.desc.replace(/"/g, '&quot;')}">
      <span class="lay-mini lm-${id}" aria-hidden="true"><i></i><i></i><i></i><i></i></span><b>${l.label}</b></button>`)
    .join('')}</div>`;
}
/** A választó kijelölésének frissítése; az új azonosítót adja (vagy null-t, ha nem választóra kattintottak). */
export function pickLayoutIn(box, target) {
  const b = target.closest?.('[data-layout-pick]');
  if (!b || !box.contains(b)) return null;
  box.querySelectorAll('[data-layout-pick]').forEach((x) => {
    x.classList.toggle('sel', x === b);
    x.setAttribute('aria-checked', x === b);
  });
  return b.dataset.layoutPick;
}

/** Az elrendezés jelölése a body-n (a CSS és a menü ebből dolgozik). */
export function applyLayout() {
  const id = currentLayout();
  document.body.dataset.layout = id;
  document.body.classList.toggle('side-nav', !!LAYOUTS[id].side);
}
