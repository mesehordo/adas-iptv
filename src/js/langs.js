// Hang- és feliratsávok nyelvének felismerése (a lejátszó, a lejátszási híd és a feliratkezelő közös része).
import { languageName } from './i18n.js';

/** Magyar nyelvjelölés (hu, hun, hu-HU, magyar, hungarian). */
export const isHuLang = (s) => /^(hu|hun|hu-[a-z]+|magyar|hungarian)\b/i.test(String(s || '').trim());
export const isEnLang = (s) => /^(en|eng|en-[a-z]+|english|angol)\b/i.test(String(s || '').trim());

// a sávokban gyakori háromjegyű (ISO 639-2) kódok → kétjegyű
const LANG3 = { hun: 'hu', eng: 'en', ger: 'de', deu: 'de', fre: 'fr', fra: 'fr', spa: 'es', ita: 'it', rus: 'ru', pol: 'pl', ron: 'ro', rum: 'ro', slk: 'sk', slo: 'sk', cze: 'cs', ces: 'cs', jpn: 'ja', chi: 'zh', zho: 'zh', kor: 'ko', ara: 'ar', por: 'pt', dut: 'nl', nld: 'nl', tur: 'tr', ukr: 'uk', hrv: 'hr', srp: 'sr', slv: 'sl', swe: 'sv', nor: 'no', dan: 'da', fin: 'fi', gre: 'el', ell: 'el', bul: 'bg', heb: 'he', hin: 'hi' };
// a nyelvek saját és angol neve (a sávcímkékben gyakran ez szerepel)
const LANG_WORDS = { de: 'german|deutsch', fr: 'french|francais|français', es: 'spanish|espanol|español', it: 'italian|italiano' };

/**
 * Nyelvfelismerő egy kétjegyű kódhoz (sáv nyelve vagy címkéje alapján): hu, en, és bármely más kód a
 * háromjegyű megfelelőjével együtt. Nem nyelv ('auto', 'off', 'orig', üres) → null.
 */
export function langMatcher(code) {
  if (!code || ['auto', 'off', 'orig'].includes(code)) return null;
  if (code === 'hu') return isHuLang;
  if (code === 'en') return isEnLang;
  const alt = Object.keys(LANG3).filter((k) => LANG3[k] === code);
  const rx = new RegExp(`^(${[code, ...alt, LANG_WORDS[code]].filter(Boolean).join('|')}|${code}-[a-z]+)\\b`, 'i');
  return (s) => rx.test(String(s || '').trim());
}

/** Nyelvkód → a nyelv neve a felület nyelvén (menükhöz). */
export function langName(code, fallback = '') {
  const c = String(code || '').toLowerCase();
  if (isHuLang(c)) return languageName('hu');
  if (isEnLang(c)) return languageName('en');
  const base = c.split('-')[0];
  const two = LANG3[base] || (/^[a-z]{2}$/.test(base) ? base : '');
  return (two && languageName(two)) || fallback || c;
}
