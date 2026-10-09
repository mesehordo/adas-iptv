// A felület nyelvei, a választóban mutatott sorrendben. Minden nyelv egyetlen fájl (src/i18n/<kód>.js):
// az elején a nyelv adatai ("@lang"), utána a fordítások (kulcs: a magyar szöveg). Ami egy nyelvből
// hiányzik, az angolul jelenik meg (az angolból hiányzó magyarul).
//
// Új nyelv felvétele:
//   1. az en.js másolata <kód>.js néven, a "@lang" adatok és a fordítások átírása (bármennyi elhagyható);
//   2. egy import és egy bejegyzés lent;
//   3. (nem kötelező) súgó: src/js/help/<kód>.js + egy sor a help.js LOADERS-ébe – nélküle angol a súgó.
// A tools/i18n-check.mjs megmutatja, mi hiányzik még belőle.
import hu from './hu.js';
import en from './en.js';
import de from './de.js';
import es from './es.js';
import fr from './fr.js';

export default { hu, en, de, es, fr };
