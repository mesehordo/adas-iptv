// A menüpontok ki- és bekapcsolása (a Főoldal kivételével mind): Beállítások → Megjelenés → Menüpontok, ill. a
// szolgáltatás saját beállításainál. A kikapcsolt szolgáltatás nem töltődik be és nem frissül a háttérben sem
// (csatornalisták és műsorújság, VOD-listák, rádióadók, podcast-folyamok, sporteredmények) – a gép / a tévé
// erőforrása így a használt részeknek marad. Gyerekprofilban a Rádió, a Podcast és a Sport nem látszik.
import { store } from './store.js';
import { _t } from './i18n.js';

/** [azonosító (útvonal), beállításkulcs, név, mi marad ki kikapcsolva] */
export const MENU_ITEMS = () => [
  ['tv', 'tvMenu', _t('TV'), _t('Kikapcsolva a csatornalisták és a műsorújság sem töltődnek be (a Kedvencek és a Főoldal csatornás részei is üresek).')],
  ['radio', 'radioMenu', _t('Rádió'), _t('Kikapcsolva a rádióadók listái sem töltődnek be.')],
  ['podcast', 'podcastMenu', _t('Podcast'), _t('Kikapcsolva a feliratkozások sem frissülnek, és nem jön értesítés új epizódról.')],
  ['vod', 'vodMenu', _t('VOD'), _t('Kikapcsolva a film- és sorozatlisták sem töltődnek be.')],
  ['sport', 'sportMenu', _t('Sport'), _t('Kikapcsolva az eredmények és a menetrend sem frissülnek.')],
  ['favorites', 'favoritesMenu', _t('Kedvencek'), _t('Kikapcsolva csak a menüpont tűnik el – a kedvencek megmaradnak.')],
];
const KEY = { tv: 'tvMenu', radio: 'radioMenu', podcast: 'podcastMenu', vod: 'vodMenu', sport: 'sportMenu', favorites: 'favoritesMenu' };
const NO_KIDS = new Set(['radio', 'podcast', 'sport']);

/** Látszik-e (és fut-e) a szolgáltatás. */
export function menuOn(id) {
  const k = Object.prototype.hasOwnProperty.call(KEY, id) ? KEY[id] : null;
  if (!k) return true;
  if (store.settings?.[k] === false) return false;
  return !(NO_KIDS.has(id) && store.profile?.kids);
}
/** A beállításkulcs menüponthoz tartozik-e (a változásra a menü és a betöltés igazodik). */
export const isMenuKey = (k) => Object.values(KEY).includes(k);
export const menuOfKey = (k) => Object.keys(KEY).find((id) => KEY[id] === k) || '';
