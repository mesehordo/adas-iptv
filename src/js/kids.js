// Gyerektartalom: csatornák és VOD-tételek jelölése (minden profilban közös), és gyerekprofilonként, hogy
// mit nézhet. Alapból gyerektartalom az, amiről tudjuk: a csatornák Gyerek / Animáció / Családi / Oktatás
// kategóriája, a VOD-nál a gyerek- és családi csoportok, műfajok (a felnőtt műfajok soha).
//
// VOD (B22): pozitív bizonyíték csak a lista strukturált csoportja / műfaja lehet, teljes szóra illesztve –
// a cím önmagában nem (pl. „Kids” egy korhatáros film, az „Animal documentary” nem az „anim” miatt
// gyerektartalom). A kizáró jelek a csoportban ÉS a címben is számítanak, és mindig elsőbbséget élveznek.
// Ami nem bizonyítottan gyerektartalom, azt a szülő kézzel engedélyezheti (Beállítások → Gyerekprofilok).
import { store } from './store.js';

export const KIDS_CH_CATS = new Set(['kids', 'animation', 'family', 'education']);
// (betűhatár: a magyar ékezetes betűket is betűnek veszi – a \b az ékezetnél határt látna)
const W = (body) => new RegExp(`(?:^|[^\\p{L}\\p{N}])(?:${body})(?=$|[^\\p{L}\\p{N}])`, 'iu');
const KIDS_VOD_RX = W('family|families|kids?|child|children|cartoons?|animation|animated|animáció|animációs|rajzfilm\\p{L}*|gyerek\\p{L}*|mesék?|mesefilm\\p{L}*|csal[aá]di|matinee|disney|junior|pixar|ghibli');
const NOT_KIDS_RX = W('nem gyerekeknek|ecchi\\p{L}*|guro\\p{L}*|horror\\p{L}*|thriller\\p{L}*|seinen\\p{L}*|háború\\p{L}*|őrült\\p{L}*|doujin\\p{L}*|erotik\\p{L}*|hentai\\p{L}*|xxx|adult\\p{L}*|felnőtt\\p{L}*|18\\+|porn\\p{L}*|sex\\p{L}*|szex\\p{L}*');

const marks = () => (store.settings.kidsMarks ||= { ch: {}, vod: {} });

/** A jelölés (true / false), vagy undefined, ha nincs kézzel beállítva. */
export const kidsMark = (kind, id) => marks()[kind]?.[id];

/** Az alapértelmezett felismerés (kézi jelölés nélkül). */
export function defaultKids(kind, item) {
  if (kind === 'ch') return !item.nsfw && item.categories.some((c) => KIDS_CH_CATS.has(c));
  const g = (item.groups || []).join(' | ');
  if (NOT_KIDS_RX.test(g + ' | ' + (item.title || ''))) return false;
  return KIDS_VOD_RX.test(g);
}
/** Gyerektartalom-e? (kézi jelölés, ennek híján az alapértelmezett felismerés) */
export const isKidsChannel = (ch) => kidsMark('ch', ch.id) ?? defaultKids('ch', ch);
export const isKidsVod = (x) => kidsMark('vod', x.id) ?? defaultKids('vod', x);

/** Jelölés beállítása; null = vissza az alapértelmezettre. */
export function setKidsMark(kind, item, value) {
  const m = marks();
  m[kind] ||= {};
  if (value === null || value === defaultKids(kind, item)) delete m[kind][item.id];
  else m[kind][item.id] = !!value;
  store.save();
}

/**
 * Nézheti-e a (gyerek)profil? Felnőtt profilnál mindig igen. Gyerekprofilnál a profil saját beállítása
 * (Beállítások → Tartalom és gyerekek → Gyerekprofilok), ennek híján az, hogy gyerektartalom-e.
 */
export function kidsAllowed(profile, kind, item) {
  if (!profile?.kids) return true;
  const a = profile.kidsAllow?.[kind]?.[item.id];
  return a ?? (kind === 'ch' ? isKidsChannel(item) : isKidsVod(item));
}

export function setKidsAllowed(profile, kind, item, value) {
  profile.kidsAllow ||= { ch: {}, vod: {} };
  profile.kidsAllow[kind] ||= {};
  const def = kind === 'ch' ? isKidsChannel(item) : isKidsVod(item);
  if (value === null || value === def) delete profile.kidsAllow[kind][item.id];
  else profile.kidsAllow[kind][item.id] = !!value;
  store.save();
}
