// A Főoldal háttérképe a konzolos elrendezésekben (Négyzetek, Menüszalag, Fókusz, Kontroller): beépített képek
// (src/bg) vagy egy saját kép. Profilonként: profile.homeBg = '' | <beépített azonosító> | 'custom'; a saját kép
// (kicsinyítve, JPEG) a dokumentumtárban – a profil „homeBgDoc” mezője hivatkozik rá (a mentésbe is bekerül).
import { store } from './store.js';
import { api } from './api.js';
import { esc, toast } from './util.js';
import { currentLayout } from './layoutdefs.js';
import { _t } from './i18n.js';

export const HOME_BGS = [
  ['hullam', _t('Hullámok')],
  ['aurora', _t('Sarki fény')],
  ['csillagos', _t('Csillagos ég')],
  ['racs', _t('Retró rács')],
  ['melykek', _t('Mélykék')],
  ['pasztell', _t('Pasztell')],
];
/** Az elrendezések, ahol a Főoldalnak lehet háttérképe (a többiben a borító vagy a sorok töltik ki a képernyőt). */
export const BG_LAYOUTS = new Set(['squares', 'ribbon', 'focus', 'console']);
export const homeBgOn = (p = store.profile) => !!p && BG_LAYOUTS.has(currentLayout(p));
const docKey = (p) => (typeof p.homeBgDoc === 'string' && p.homeBgDoc.startsWith('homebg:') ? p.homeBgDoc : `homebg:${p.id || ''}`);

let seq = 0;
// (profilonként a háttérválasztások sorszáma: a lassú feltöltés csak akkor állít „custom”-ot, ha közben nem választottak)
const picks = new WeakMap();
// (profilonként a saját kép feltöltéseinek sorszáma: a később befejeződő régebbi feltöltés nem írja felül az újabbat)
const uploads = new WeakMap();
/** A háttér érvényesítése (body[data-hbg], --hbg) – profil-, elrendezés- és beállításváltáskor. */
export async function applyHomeBg() {
  const my = ++seq;
  const p = store.profile;
  const b = document.body;
  const v = homeBgOn(p) ? p.homeBg || '' : '';
  let url = '';
  if (v === 'custom') url = (await Promise.resolve(api.docGet?.(docKey(p))).catch(() => null))?.text || '';
  else if (HOME_BGS.some(([id]) => id === v)) url = `bg/${v}.svg`;
  if (my !== seq) return;
  const ok = /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/]+=*$/.test(url) || (v !== 'custom' && url === `bg/${v}.svg`);
  if (!url || !ok) {
    delete b.dataset.hbg;
    b.style.removeProperty('--hbg');
    return;
  }
  b.dataset.hbg = v;
  b.style.setProperty('--hbg', `url("${url}")`);
  // (külön elem – a témák a body ::before / ::after rétegét saját mintához használják)
  if (!document.getElementById('home-bg')) b.prepend(Object.assign(document.createElement('div'), { id: 'home-bg' }));
}
document.addEventListener('adas-layout', () => applyHomeBg());

/** Saját kép: legfeljebb 1920 × 1080-ra kicsinyítve, JPEG-ként. */
async function shrink(file) {
  const img = await createImageBitmap(file);
  const k = Math.min(1, 1920 / img.width, 1080 / img.height);
  const c = document.createElement('canvas');
  c.width = Math.round(img.width * k);
  c.height = Math.round(img.height * k);
  c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
  return c.toDataURL('image/jpeg', 0.82);
}

/** A Megjelenés beállításai között: választó (csak a konzolos elrendezésekben látszik). */
export function renderHomeBg(box) {
  const p = store.profile;
  box.hidden = !homeBgOn(p) || !p;
  if (box.hidden) return;
  const cur = p.homeBg || '';
  const sw = (id, label, style) => `<button class="hbg-sw ${cur === id ? 'on' : ''}" data-hbg="${id}" title="${esc(label)}" aria-pressed="${cur === id}" style="${style}"><span>${esc(label)}</span></button>`;
  box.innerHTML = `<h3>${_t('A Főoldal háttérképe')}</h3>
    <p class="muted small">${_t('A konzolos elrendezésekben (Négyzetek, Menüszalag, Fókusz, Kontroller) a Főoldal mögött. Saját képet is választhatsz – kicsinyítve, ezen a profilon tárolódik.')}</p>
    <div class="hbg-grid">${sw('', _t('Nincs'), '')}${HOME_BGS.map(([id, l]) => sw(id, l, `background-image:url('bg/${id}.svg')`)).join('')}${sw('custom', _t('Saját kép…'), '')}</div>
    <input type="file" accept="image/jpeg,image/png,image/webp" hidden data-hbg-file />`;
  const file = box.querySelector('[data-hbg-file]');
  box.onclick = (e) => {
    const b = e.target.closest('[data-hbg]');
    if (!b) return;
    e.stopPropagation();
    if (b.dataset.hbg === 'custom') return file.click();
    picks.set(store.profile, (picks.get(store.profile) || 0) + 1);
    store.setProfileValue('homeBg', b.dataset.hbg || undefined);
    applyHomeBg();
    renderHomeBg(box);
  };
  file.onchange = async (e) => {
    e.stopPropagation();
    const f = file.files[0];
    if (!f || !api.docSet) return;
    const pick = picks.get(p) || 0;
    const up = (uploads.get(p) || 0) + 1;
    uploads.set(p, up);
    try {
      const data = await shrink(f);
      const key = `homebg:${p.id}`;
      // (közben újabb képet választottak: a régebbi nem írja felül)
      if (uploads.get(p) !== up) return;
      await api.docSet(key, { text: data });
      p.homeBgDoc = key;
      // (közben másik hátteret választottak: a kép eltárolva, de a választás marad)
      if ((picks.get(p) || 0) !== pick) store.save();
      // (közben profilt válthattak: a választás a feltöltést indító profilé)
      else if (store.profile === p) store.setProfileValue('homeBg', 'custom');
      else {
        p.homeBg = 'custom';
        store.save();
      }
      applyHomeBg();
      renderHomeBg(box);
    } catch {
      toast(_t('A kép nem olvasható be.'));
    }
  };
}
