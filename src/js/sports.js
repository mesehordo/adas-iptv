// Sportfigyelő: bajnokságok, versenyek, sportesemények több forrásból, egy listában – csatornaajánlással.
//  - ESPN (kulcs nélkül): ~360 bajnokság 17 sportágban – menetrend, élő állás, eredmény (beépített katalógus:
//    src/data/sports-espn.json, frissítés: node tools/build-sports-catalog.mjs);
//  - TheSportsDB (saját kulccsal): szinte minden sportág bajnokságai;
//  - műsorújság: bármilyen sportág / játék / csapat kulcsszóval – rögtön csatornával;
//  - naptár (ICS / iCal): bármilyen szervezet nyilvános eseménynaptára.
// A strukturált eseményekhez a műsorújságból keres csatornát (csapatnév, bajnokság, sportág + időpont).
import { esc, toast, fmtTime, norm, debounce, html } from './util.js';
import { api } from './api.js';
import { store } from './store.js';
import { epg } from './epg.js';
import { visible, homeRank, rankScore, catalog } from './catalog.js';
import { openModal, confirmDialog } from './components.js';

// ---------------------------------------------------------------------------
import { _t, LOCALE, weekdayNames } from './i18n.js';
// Sportágak (és játékok): azonosító, magyar név, ikon, ESPN-ág, kulcsszavak a műsorújsághoz
// ---------------------------------------------------------------------------
export const SPORTS = [
  // (a kulcsszavak a műsorújságban keresnek: magyar mellett angol, német, spanyol és francia szavak is)
  ['soccer', _t('Labdarúgás'), '⚽', 'soccer', 'labdarúg|foci|futball|bajnokok ligája|európa-liga|konferencia-liga|nb i\\b|premier league|bundesliga|la liga|serie a|ligue 1|selejtező|fußball|fussball|(?<!american |australian |aussie rules )\\bfootball\\b(?! am[eé]ricain| australien)|f[uú]tbol|soccer|champions league|liga de campeones|ligue des champions|europa league|\\bfa cup\\b|dfb-pokal|copa del rey|coupe de france'],
  ['basketball', _t('Kosárlabda'), '🏀', 'basketball', 'kosárlabda|\\bnba\\b|euroliga|basketball|baloncesto|basket-?ball|\\bacb\\b'],
  ['handball', _t('Kézilabda'), '🤾', '', 'kézilabda|handball|\\behf\\b|balonmano'],
  ['waterpolo', _t('Vízilabda'), '🤽', 'water-polo', 'vízilabda|water ?polo|wasserball|waterpolo'],
  ['hockey', _t('Jégkorong'), '🏒', 'hockey', 'jégkorong|jéghoki|\\bnhl\\b|erste liga|ice hockey|eishockey|hockey sobre hielo|hockey sur glace'],
  ['tennis', _t('Tenisz'), '🎾', 'tennis', '(?<!asztali)\\btenisz|(?<!table )(?<!tisch)\\btennis\\b(?! de (table|mesa))|\\btenis\\b(?! de mesa)|\\batp\\b|\\bwta\\b|wimbledon|roland garros|australian open|davis.?(kupa|cup)|billie jean'],
  ['tabletennis', _t('Asztalitenisz'), '🏓', '', 'asztalitenisz|ping-?pong|table tennis|tischtennis|\\bttbl\\b|tenis de mesa|tennis de table'],
  ['badminton', _t('Tollaslabda'), '🏸', '', 'tollaslabda|badminton|b[aá]dminton'],
  ['volleyball', _t('Röplabda'), '🏐', 'volleyball', 'röplabda|volleyball|voleibol|volley-?ball'],
  ['americanfootball', _t('Amerikai futball'), '🏈', 'football', 'amerikai futball|\\bnfl\\b|super bowl|american football|football am[eé]ricain|f[uú]tbol americano'],
  ['baseball', _t('Baseball'), '⚾', 'baseball', 'baseball|\\bmlb\\b|b[eé]isbol'],
  ['cricket', _t('Krikett'), '🏏', 'cricket', 'krikett|cricket|cr[ií]quet'],
  ['rugby', _t('Rögbi'), '🏉', 'rugby', 'rögbi|rugby|six nations|tournoi des six'],
  ['golf', _t('Golf'), '⛳', 'golf', '\\bgolf|\\bpga\\b|ryder'],
  ['discgolf', _t('Disc golf'), '🥏', '', 'disc ?golf|frizbigolf|\\bpdga\\b|\\bdgpt\\b'],
  ['ultimate', _t('Ultimate frizbi'), '🥏', '', 'ultimate|frizbi'],
  ['f1', _t('Forma–1'), '🏎️', 'racing', 'forma[- ]?1|formula ?1|\\bf1\\b|nagydíj|grand prix|gran premio|großer preis'],
  ['motorsport', _t('Motorsport'), '🏍️', 'racing', 'motogp|motorsport|\\brali|\\bwrc\\b|nascar|indycar|superbike|le mans|dakar|motocross|gyorsasági|rallye|\\brally\\b|motociclismo|sports? m[eé]caniques?'],
  ['cycling', _t('Kerékpár'), '🚴', '', 'kerékpár|tour de france|giro d|vuelta|cycling|országúti|radsport|ciclismo|cyclisme'],
  ['athletics', _t('Atlétika'), '🏃', '', 'atlétika|athletics|maraton|gyémánt liga|diamond league|leichtathletik|atletismo|athl[eé]tisme|marathon'],
  ['swimming', _t('Úszás, műugrás'), '🏊', '', 'úszás|swimming|műugrás|szinkronúszás|schwimmen|nataci[oó]n|natation|wasserspringen|plongeon'],
  ['gymnastics', _t('Torna'), '🤸', '', 'torna|gimnasztika|gymnastics|turnen|gimnasia|gymnastique'],
  ['combat', _t('Küzdősportok'), '🥋', 'mma', 'cselgáncs|judo|birkózás|ökölvívás|\\bboksz|boxing|karate|taekwondo|\\bmma\\b|\\bufc\\b|kick-?box|thai ?box|boxen|\\bboxe\\b|\\bboxeo\\b|ringen|lucha|\\blutte\\b'],
  ['fencing', _t('Vívás'), '🤺', '', 'vívás|fencing|fechten|esgrima|escrime'],
  ['canoe', _t('Kajak-kenu, evezés'), '🛶', '', 'kajak|kenu|evezés|rowing|sárkányhajó|kanu|rudern|pirag[uü]ismo|\\bremo\\b|aviron|cano[eë]'],
  ['winter', _t('Téli sportok'), '⛷️', '', '\\bsí\\b|alpesi|sífutás|síugrás|biatlon|snowboard|korcsolya|curling|\\bbob\\b|szánkó|\\bski(?:ing|sprung|weltcup|alpin)?\\b|biathlon|skispringen|eiskunstlauf|esqu[ií]|patinaje|patinage|skating'],
  ['chess', _t('Sakk'), '♟️', '', '\\bsakk|chess|schach|ajedrez|[eé]checs'],
  ['darts', _t('Darts'), '🎯', '', 'darts|\\bpdc\\b|fl[eé]chettes|\\bdardos\\b'],
  ['snooker', _t('Snooker, biliárd'), '🎱', '', 'snooker|biliárd|billiard|\\bpool\\b|billard|billar'],
  ['esports', _t('E-sport'), '🎮', '', 'e-?sport|league of legends|counter-strike|\\bcs2\\b|dota|valorant'],
  ['chasetag', _t('World Chase Tag (fogócska)'), '🏃‍♂️', '', 'world chase tag|chase tag|fogócska'],
  ['equestrian', _t('Lovassport, lóverseny'), '🏇', '', 'lovas|díjugratás|lóverseny|galopp|ügető|equestrian|horse racing|pferdesport|pferderennen|h[ií]pica|[eé]quitation|hippique'],
  ['shooting', _t('Lövészet, íjászat'), '🏹', '', 'sportlövészet|íjászat|archery|shooting|bogenschießen|tiro con arco|tir à l.arc'],
  ['weightlifting', _t('Súlyemelés, erősport'), '🏋️', '', 'súlyemelés|erőemelés|strongman|crossfit|weightlifting|gewichtheben|halterofilia|halt[eé]rophilie'],
  ['triathlon', _t('Triatlon, öttusa'), '🚵', '', 'triatlon|duatlon|ironman|öttusa|triathlon|pentathlon|pentatl[oó]n'],
  ['sailing', _t('Vitorlázás, vízi sportok'), '⛵', '', 'vitorlá|szörf|\\bsurf|kite|wakeboard|kékszalag|sailing|segeln|\\bvela\\b|\\bvoile\\b|america.s cup'],
  ['extreme', _t('Extrém sportok'), '🛹', '', 'gördeszka|skateboard|\\bbmx|sportmászás|climbing|x games|parkour|klettern|escalada|escalade'],
  ['floorball', _t('Floorball, futsal, gyeplabda'), '🏑', 'field-hockey', 'floorball|futsal|teremlabdarúgás|gyeplabda|field hockey|feldhockey|hockey sobre hierba|hockey sur gazon'],
  ['bowling', _t('Teke, bowling'), '🎳', '', '\\bteke|bowling|kegeln|\\bbolos\\b'],
  ['racket', 'Squash, padel, pickleball', '🏸', '', 'squash|padel|pickleball'],
  ['aussie', _t('Ausztrál futball, lacrosse'), '🏉', 'australian-football', 'ausztrál futball|\\bafl\\b|lacrosse|australian football|aussie rules'],
  ['olympics', _t('Olimpia, világjátékok'), '🏅', '', 'olimpi|paralimpi|világjátékok|universiade|európa játékok|olympi|ol[ií]mpic|world games'],
  ['other', _t('Egyéb / saját'), '🏆', '', ''],
];
const SPORT = Object.fromEntries(SPORTS.map(([id, name, ico, espn, kw]) => [id, { id, name, ico, espn, kw }]));
const ESPN_TO = { 'australian-football': 'aussie', baseball: 'baseball', basketball: 'basketball', cricket: 'cricket', 'field-hockey': 'floorball', football: 'americanfootball', golf: 'golf', hockey: 'hockey', lacrosse: 'aussie', mma: 'combat', racing: 'motorsport', rugby: 'rugby', 'rugby-league': 'rugby', soccer: 'soccer', tennis: 'tennis', volleyball: 'volleyball', 'water-polo': 'waterpolo' };
const sportOf = (id) => SPORT[id] || SPORT.other;
const userKw = (s) =>
  String(s || '')
    .slice(0, 200)
    .split('|')
    .map((x) => x.trim())
    .filter(Boolean)
    .map((x) => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('|');
const kwRx = (s) => {
  try {
    return s ? new RegExp(s, 'i') : null;
  } catch {
    return new RegExp(s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
  }
};

// ---------------------------------------------------------------------------
// Követett tételek: { id, kind: 'espn'|'tsdb'|'epg'|'ics', sport, name, ref, team, teamName, kw, url, on }
// ---------------------------------------------------------------------------
const DEFAULT_ESPN = ['uefa.champions', 'uefa.europa', 'eng.1', 'ger.1', 'esp.1', 'ita.1'];
export function watchList() {
  const s = store.settings;
  if (!Array.isArray(s.sportWatch)) {
    const old = s.sportLeagues || DEFAULT_ESPN;
    s.sportWatch = old.map((c) => ({ id: 'espn:soccer/' + c, kind: 'espn', sport: 'soccer', ref: 'soccer/' + c, name: c, on: true }));
  }
  // 1.21 előtti tesztváltozat azonosítója (espn:soccer:kód) → egységes (espn:sportág/kód)
  for (const w of s.sportWatch) if (w.kind === 'espn' && !w.team && w.id === 'espn:' + w.ref.replace('/', ':')) w.id = 'espn:' + w.ref;
  // A régi beállításból átvett tételeknél a név még a kód (pl. uefa.europa) – a katalógusból pótoljuk
  if (s.sportWatch.some((w) => w.kind === 'espn' && w.name && w.ref?.endsWith('/' + w.name)))
    loadCatalog().then((cat) => {
      let ch = false;
      for (const w of s.sportWatch) {
        const l = w.kind === 'espn' && w.ref?.endsWith('/' + w.name) && cat.find((c) => `${c.s}/${c.c}` === w.ref);
        if (l) (w.name = l.n), (ch = true);
      }
      if (ch) store.save();
    });
  return s.sportWatch;
}
const saveWatch = () => {
  store.save();
  invalidate();
};
const watchId = (w) => w.id || `${w.kind}:${w.ref || w.kw || w.url}${w.team ? ':' + w.team : ''}`;
function addWatch(w) {
  const list = watchList();
  w.id = watchId(w);
  if (list.some((x) => x.id === w.id)) return false;
  list.push({ ...w, on: true });
  saveWatch();
  return true;
}
function removeWatch(id) {
  store.settings.sportWatch = watchList().filter((x) => x.id !== id);
  saveWatch();
}
const isWatched = (id) => watchList().some((x) => x.id === id);

// ---------------------------------------------------------------------------
// Katalógus (ESPN) – beépített adatfájl
// ---------------------------------------------------------------------------
let catalogP = null;
function loadCatalog() {
  return (catalogP ||= new Promise((resolve) => {
    const x = new XMLHttpRequest();
    x.open('GET', new URL('data/sports-espn.json', location.href).href);
    x.onload = () => {
      try {
        resolve(JSON.parse(x.responseText).leagues || []);
      } catch {
        resolve([]);
      }
    };
    x.onerror = () => resolve([]);
    x.send();
  }));
}

// ---------------------------------------------------------------------------
// Források → egységes esemény: { id, sport, league, title, home, away, hs, as, state, start, detail, logoH, logoA, kw, src, channel }
// ---------------------------------------------------------------------------
const json = async (url, hours) => JSON.parse((await api.fetchText(url, { maxAgeHours: hours })).text);
const ym = (t) => new Date(t).toISOString().slice(0, 7).replace('-', '');
const cfg = () => ({ back: store.settings.sportBack ?? 2, ahead: store.settings.sportAhead ?? 7 });

async function loadEspn(w) {
  const { back, ahead } = cfg();
  const now = Date.now();
  const base = `https://site.api.espn.com/apis/site/v2/sports/${w.ref}/scoreboard`;
  const urls = [base, ...new Set([ym(now - back * 864e5), ym(now), ym(now + ahead * 864e5)])].map((m, i) => (i === 0 ? m : `${base}?dates=${m}&limit=400`));
  const parts = await Promise.all(urls.map((u) => json(u, 0.15).catch(() => ({ events: [] }))));
  const seen = new Set();
  const lg = parts.find((p) => p.leagues?.[0])?.leagues?.[0];
  const out = [];
  for (const ev of parts.flatMap((p) => p.events || [])) {
    if (seen.has(ev.id)) continue;
    seen.add(ev.id);
    const c = ev.competitions?.[0] || {};
    const st = ev.status?.type || c.status?.type || {};
    const cs = c.competitors || [];
    const side = (h) => cs.find((x) => x.homeAway === h) || {};
    const nm = (x) => x.team?.shortDisplayName || x.team?.displayName || x.athlete?.displayName || '';
    const two = cs.length === 2 && (cs[0].team || cs[0].athlete);
    const H = two ? side('home').team || side('home').athlete ? side('home') : cs[0] : null;
    const A = two ? side('away').team || side('away').athlete ? side('away') : cs[1] : null;
    if (w.team && !cs.some((x) => String(x.team?.id || x.id) === String(w.team))) continue;
    out.push({
      id: 'espn:' + ev.id,
      sport: w.sport,
      league: lg?.abbreviation || w.name,
      leagueName: lg?.name || w.name,
      title: two ? '' : ev.name || ev.shortName || '',
      home: two ? nm(H) : '',
      away: two ? nm(A) : '',
      hs: two ? H.score : undefined,
      as: two ? A.score : undefined,
      logoH: two ? H.team?.logo || '' : '',
      logoA: two ? A.team?.logo || '' : '',
      state: st.state || 'pre',
      start: Date.parse(ev.date),
      detail: st.shortDetail || st.detail || '',
      kw: [nm(H || {}), nm(A || {}), H?.team?.displayName, A?.team?.displayName, lg?.name].filter(Boolean),
      src: 'ESPN',
    });
  }
  return out;
}

async function loadTsdb(w) {
  const key = (store.settings.tsdbKey || '').trim();
  if (!key) throw new Error(_t('TheSportsDB-kulcs kell (Sportfigyelő → Beállítások).'));
  const B = `https://www.thesportsdb.com/api/v1/json/${encodeURIComponent(key)}/`;
  const [n, p] = await Promise.all([json(`${B}eventsnextleague.php?id=${w.ref}`, 0.5).catch(() => ({})), json(`${B}eventspastleague.php?id=${w.ref}`, 0.5).catch(() => ({}))]);
  return [...(n.events || []), ...(p.events || [])].map((e) => {
    const start = Date.parse(e.strTimestamp ? e.strTimestamp + (/[zZ+]/.test(e.strTimestamp) ? '' : 'Z') : `${e.dateEvent}T${e.strTime || '12:00:00'}Z`);
    const done = e.intHomeScore != null && e.intHomeScore !== '';
    return {
      id: 'tsdb:' + e.idEvent,
      sport: w.sport,
      league: w.name,
      leagueName: w.name,
      title: e.strHomeTeam ? '' : e.strEvent,
      home: e.strHomeTeam || '',
      away: e.strAwayTeam || '',
      hs: done ? e.intHomeScore : undefined,
      as: done ? e.intAwayScore : undefined,
      logoH: e.strHomeTeamBadge || '',
      logoA: e.strAwayTeamBadge || '',
      state: done ? 'post' : /live|progress|1h|2h|ht/i.test(e.strStatus || '') ? 'in' : 'pre',
      start,
      detail: e.strStatus && !/not started|ns/i.test(e.strStatus) ? e.strStatus : '',
      kw: [e.strHomeTeam, e.strAwayTeam, w.name].filter(Boolean),
      src: 'TheSportsDB',
    };
  });
}

/** ICS (iCalendar) – a VEVENT-ek kezdete és címe. */
function parseIcs(text, w) {
  const unfold = text.replace(/\r?\n[ \t]/g, '');
  const out = [];
  for (const block of unfold.split('BEGIN:VEVENT').slice(1)) {
    const get = (k) => (new RegExp(`^${k}(?:;[^:\\n]*)?:(.*)$`, 'mi').exec(block) || [])[1]?.trim() || '';
    const raw = get('DTSTART');
    const m = /^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})?(Z)?)?/.exec(raw);
    if (!m) continue;
    const start = m[4] ? (m[7] ? Date.UTC(+m[1], m[2] - 1, +m[3], +m[4], +m[5], +(m[6] || 0)) : new Date(+m[1], m[2] - 1, +m[3], +m[4], +m[5]).getTime()) : new Date(+m[1], m[2] - 1, +m[3], 9).getTime();
    const title = get('SUMMARY').replace(/\\,/g, ',').replace(/\\n/g, ' ');
    out.push({ id: 'ics:' + w.id + ':' + start + ':' + title.slice(0, 30), sport: w.sport, league: w.name, leagueName: w.name, title, home: '', away: '', state: start > Date.now() ? 'pre' : 'post', start, allDay: !m[4], detail: get('LOCATION').replace(/\\,/g, ','), kw: [title, w.name], src: _t('Naptár') });
  }
  return out;
}
async function loadIcs(w) {
  const { text } = await api.fetchText(w.url, { maxAgeHours: 3 });
  return parseIcs(text, w);
}

// ---------------------------------------------------------------------------
// Műsorújság: kulcsszó / sportág szerinti műsorok, és csatornaajánlás a strukturált eseményekhez
// ---------------------------------------------------------------------------
let epgIdx = null;
let epgIdxAt = 0;
let epgIdxKey = '';
const dataKey = () => `${epg.loadedAt || 0}:${epg.byChannel?.size || 0}:${visible().length}`;
function epgIndex() {
  // Újraépítés, ha közben betöltődött a műsorújság vagy a csatornalista (induláskor még üresek lehetnek)
  const key = dataKey();
  if (epgIdx && key === epgIdxKey && Date.now() - epgIdxAt < 5 * 60e3) return epgIdx;
  epgIdxKey = key;
  const from = Date.now() - 3 * 3600e3;
  const to = Date.now() + 8 * 864e5;
  const favs = new Set(store.profile?.favorites || []);
  epgIdx = [];
  for (const ch of visible()) {
    if (!epg.has(ch.id)) continue;
    const bonus = (favs.has(ch.id) ? 3 : 0) + homeRank(ch) + (ch.categories?.includes('sports') ? 1 : 0);
    // A rész címe (subtitle) csak sportműsornál számít – különben pl. egy rajzfilm „Bowling” c. része is találat lenne.
    const sportsCh = !!ch.categories?.includes('sports');
    for (const p of epg.range(ch.id, from, to)) epgIdx.push({ ch, p, bonus, sporty: sportsCh || /sport/i.test(p.category || ''), text:norm(`${p.title} ${p.category || ''} ${/sport/i.test(p.category || '') ? p.subtitle || '' : ''}`) });
  }
  epgIdxAt = Date.now();
  return epgIdx;
}

function loadEpgWatch(w) {
  // a saját kulcsszó (beírt vagy mentésből jött) nem lehet tetszőleges reguláris kifejezés (katasztrofális
  // visszalépés): csak „|”-lal elválasztott szavak, a többi karakter szó szerint számít
  const rx = kwRx(w.kw ? userKw(w.kw) : sportOf(w.sport).kw);
  if (!rx) return [];
  const nrx = kwRx(w.kw ? userKw(norm(w.kw)) : norm(sportOf(w.sport).kw));
  const head = new RegExp('^(?:' + rx.source + ')', 'i'); // a cím a sportággal kezdődik (pl. „Tenisz: ATP 500”)
  const now = Date.now();
  // Egy műsor csak egyszer (a legközelebbi adás, a jobb csatornán), csatornánként legfeljebb 2, összesen 12 –
  // egy sportcsatorna egész napos kínálata ne nyomja el a többit. A csatorna nevével azonos cím (töltelék) kimarad.
  const per = new Map();
  const titles = new Set();
  const hits = epgIndex()
    // Sportág-követésnél csak sportcsatorna vagy sport kategóriájú műsor számít (egy sorozat „Au tennis” c. része ne);
    // a saját kulcsszó (csapat, sportoló) bárhol kereshető.
    .filter((x) => x.p.stop > now && (w.kw || x.sporty || head.test(x.p.title)) && (rx.test(`${x.p.title} ${x.p.category || ''}`) || nrx?.test(x.text)) && norm(x.p.title) !== norm(x.ch.name))
    .sort((a, b) => a.p.start - b.p.start || b.bonus - a.bonus)
    .filter((x) => {
      const t = norm(x.p.title).replace(/\b(elo|live|ismetles|replay)\b/g, '').trim();
      const n = (per.get(x.ch.id) || 0) + 1;
      if (titles.has(t) || n > 2) return false;
      titles.add(t);
      per.set(x.ch.id, n);
      return true;
    });
  return hits.slice(0, 12).map(({ ch, p }) => ({
    id: `epg:${ch.id}:${p.start}`,
    sport: w.sport,
    league: w.kw ? w.name : 'TV',
    leagueName: w.name,
    title: p.title,
    home: '',
    away: '',
    state: p.start <= now ? 'in' : 'pre',
    start: p.start,
    stop: p.stop,
    detail: p.subtitle || '',
    channel: { id: ch.id, name: ch.name, start: p.start, title: p.title },
    kw: [],
    src: _t('Műsorújság'),
  }));
}

const tokens = (s) => norm(s).split(/[^a-z0-9]+/).filter((t) => t.length >= 4 && !/^(club|city|united|team|real|sport)$/.test(t));
/** Csatorna egy eseményhez: a műsorújság a kezdés körül, csapatnév / bajnokság / sportág egyezéssel. */
export function channelFor(ev) {
  if (ev.channel) return ev.channel;
  if (!ev.start || !epg.byChannel?.size) return null;
  const teams = [...tokens(ev.home), ...tokens(ev.away), ...tokens(ev.title)];
  const league = tokens(ev.leagueName || '');
  const sp = kwRx(norm(sportOf(ev.sport).kw));
  let best = null;
  for (const x of epgIndex()) {
    const dt = Math.abs(x.p.start - ev.start);
    const running = x.p.start <= ev.start && x.p.stop > ev.start + 20 * 60e3;
    if (dt > 45 * 60e3 && !running) continue;
    const tHit = teams.filter((t) => x.text.includes(t)).length;
    const lHit = league.some((t) => x.text.includes(t)) ? 1 : 0;
    const sHit = sp && sp.test(x.text) ? 1 : 0;
    let score = tHit * 4 + lHit * 2 + sHit;
    if (!tHit && !lHit && !(sHit && dt <= 15 * 60e3)) continue; // csak sportág: pontos kezdéssel
    if (!tHit && !x.sporty) continue; // csapatnév nélkül csak sportcsatorna / sportműsor
    score += x.bonus * 0.3 - dt / 3600e3;
    if (!best || score > best.score) best = { score, ch: x.ch, p: x.p };
  }
  return best ? { id: best.ch.id, name: best.ch.name, start: best.p.start, title: best.p.title, sure: best.score >= 3 } : null;
}

// ---------------------------------------------------------------------------
// Az összes követett tétel eseményei (gyorsítótárazva)
// ---------------------------------------------------------------------------
let cache = { at: 0, events: null, errors: {} };
let loading = null;
const invalidate = () => (cache = { at: 0, events: null, errors: {} });
export const sportEventsCached = () => cache.events;
export const sportErrors = () => cache.errors;
/** Elavult-e a gyorsítótár (5 perc, vagy azóta betöltődött a műsorújság – a csatornaajánláshoz). */
export const sportStale = () => !cache.events || cache.ek !== dataKey() || Date.now() - cache.at > 5 * 60e3;

export function loadSportEvents(force = false) {
  const ek = dataKey();
  if (!force && cache.events && cache.ek === ek && Date.now() - cache.at < 5 * 60e3) return Promise.resolve(cache.events);
  if (loading) return loading;
  loading = (async () => {
    const errors = {};
    const { back, ahead } = cfg();
    const now = Date.now();
    const all = await Promise.all(
      watchList()
        .filter((w) => w.on !== false)
        .map(async (w) => {
          try {
            const list = w.kind === 'espn' ? await loadEspn(w) : w.kind === 'tsdb' ? await loadTsdb(w) : w.kind === 'ics' ? await loadIcs(w) : loadEpgWatch(w);
            return list.map((e) => ({ ...e, watch: w.id }));
          } catch (err) {
            errors[w.id] = err.message || String(err);
            return [];
          }
        })
    );
    const seen = new Set();
    const inWin = (e) => e.start > now - back * 864e5 && e.start < now + ahead * 864e5;
    // Ha egy követett tételnek nincs eseménye az időablakban (pl. szünet a fordulók között), a következő eseménye akkor is látszik.
    const nextOf = (list) => (list.some(inWin) ? [] : list.filter((e) => e.start > now).sort((a, b) => a.start - b.start).slice(0, 1).map((e) => ({ ...e, far: true })));
    const events = all
      .flatMap((list) => [...list.filter((e) => e.start && inWin(e)), ...nextOf(list.filter((e) => e.start))])
      .filter((e) => !seen.has(e.id) && seen.add(e.id))
      .map((e) => (e.state === 'pre' && e.start < now - 4 * 3600e3 && e.src === _t('Naptár') ? { ...e, state: 'post' } : e));
    // Élő → a követett bajnokságok / csapatok / naptárak közelgő eseményei → a tévében talált műsorok → friss eredmények
    const rank = (e) => (e.state === 'in' ? 0 : e.state === 'pre' ? (e.src === _t('Műsorújság') ? 2 : 1) : 3);
    events.sort((a, b) => rank(a) - rank(b) || (a.state === 'post' ? b.start - a.start : a.start - b.start));
    cache = { at: Date.now(), events, errors, ek };
    loading = null;
    return events;
  })();
  return loading;
}

// ---------------------------------------------------------------------------
// Megjelenítés: egy esemény sora (a főoldali Sport egységben)
// ---------------------------------------------------------------------------
const dayLbl = (t) => {
  const d = new Date(t);
  const t0 = new Date();
  const diff = Math.round((new Date(d.getFullYear(), d.getMonth(), d.getDate()) - new Date(t0.getFullYear(), t0.getMonth(), t0.getDate())) / 864e5);
  const days = weekdayNames('long');
  return diff === 0 ? _t('ma') : diff === 1 ? _t('holnap') : diff === -1 ? _t('tegnap') : diff > 1 && diff < 7 ? days[d.getDay()] : d.toLocaleDateString(LOCALE, { month: 'short', day: 'numeric' });
};
/** Rövid bajnokságjel a keskeny oszlopba: „Premier League” → PL, „UEFA Europa League” → UEL. */
function shortLg(s) {
  s = String(s || '').trim();
  if (s.length <= 6) return s;
  const w = s.split(/[\s\-–,.]+/).filter((x) => x && !/^(of|the|de|a|az)$/i.test(x));
  return w.length > 1 ? w.slice(0, 4).map((x) => (/^\d/.test(x) ? x : x[0].toUpperCase())).join('') : s.slice(0, 5) + '.';
}
export function eventRowHtml(e, { logos = true, channels = true } = {}) {
  const sp = sportOf(e.sport);
  const live = e.state === 'in';
  const when = live ? `<span class="live-badge">${_t('ÉLŐ')}</span> ${esc(e.detail || '')}` : e.state === 'pre' ? `${dayLbl(e.start)} ${e.allDay ? '' : fmtTime(e.start)}` : esc(e.detail || dayLbl(e.start));
  const ch = channels && e.state !== 'post' ? channelFor(e) : null;
  const head = e.home
    ? `<span class="sp-team home">${esc(e.home)}${logos && e.logoH ? `<img src="${esc(e.logoH)}" alt="" loading="lazy" onerror="this.remove()" />` : ''}</span>
       <b class="sp-score">${e.state === 'pre' ? '–' : `${esc(e.hs ?? '')} : ${esc(e.as ?? '')}`}</b>
       <span class="sp-team">${logos && e.logoA ? `<img src="${esc(e.logoA)}" alt="" loading="lazy" onerror="this.remove()" />` : ''}${esc(e.away)}</span>`
    : `<span class="sp-title">${esc(e.title)}</span>`;
  return `<li class="${e.state} ${e.home ? 'vs' : 'ev'}"><span class="sp-lg" title="${esc(sp.name)} · ${esc(e.leagueName || '')}">${sp.ico}<small>${esc(shortLg(e.league))}</small></span>
    ${head}
    <small class="sp-when muted">${when}${ch ? ` <button class="sp-ch ${ch.sure ? '' : 'maybe'}" data-play="${esc(ch.id)}" title="${esc(ch.title)} – ${fmtTime(ch.start)}${ch.sure ? '' : ` ${_t('(valószínű)')}`}">📺 ${esc(ch.name)}</button>` : ''}</small></li>`;
}

// ---------------------------------------------------------------------------
// A Sportfigyelő ablak
// ---------------------------------------------------------------------------
const KIND_LABEL = { espn: 'ESPN', tsdb: 'TheSportsDB', epg: _t('Műsorújság'), ics: _t('Naptár') };
let tab = 'watch';
let bSport = '';
let bQuery = '';

export function openSportWatch(onChange) {
  const el = html(`<div class="dialog sport-watch">
    <h2>${_t('Sportfigyelő')}</h2>
    <p class="muted small">${_t('Bármilyen sportág, bajnokság, verseny vagy csapat – négy forrásból, egy listában. A főoldal <i>Sport</i> csempéje ezeket mutatja, és ahol a műsorújság szerint nézhető, ott csatornát is ajánl (📺).')}</p>
    <div class="tabs sw-tabs">
      <button class="tab" data-swt="watch">${_t('Követett')}</button>
      <button class="tab" data-swt="leagues">${_t('Bajnokságok')}</button>
      <button class="tab" data-swt="epg">${_t('Sportágak a tévében')}</button>
      <button class="tab" data-swt="ics">${_t('Naptár')}</button>
      <button class="tab" data-swt="opts">${_t('Beállítások')}</button>
    </div>
    <div class="sw-body"></div>
    <div class="dialog-btns"><button class="btn primary" data-sw="close">${_t('Kész')}</button></div>
  </div>`);
  const body = el.querySelector('.sw-body');
  let changed = false;
  const close = openModal(el, { cls: 'wide', onClose: () => changed && onChange?.() });
  const mark = () => (changed = true);

  const drawWatch = () => {
    const list = watchList();
    if (!list.length) return (body.innerHTML = `<p class="muted">${_t('Még nem követsz semmit. Válassz a <b>Bajnokságok</b> vagy a <b>Sportágak a tévében</b> fülön.')}</p>`);
    const groups = {};
    for (const w of list) (groups[w.sport] ||= []).push(w);
    body.innerHTML = Object.entries(groups)
      .sort((a, b) => sportOf(a[0]).name.localeCompare(sportOf(b[0]).name, LOCALE))
      .map(([s, ws]) => `<h3 class="sw-sport">${sportOf(s).ico} ${esc(sportOf(s).name)}</h3><ul class="src-list">${ws
        .map((w) => `<li data-w="${esc(w.id)}"><input type="checkbox" class="switch" data-sw-on ${w.on !== false ? 'checked' : ''} aria-label="${_t('Bekapcsolva')}" />
          <span><b>${esc(w.teamName ? `${w.teamName} (${w.name})` : w.name)}</b><small>${KIND_LABEL[w.kind]}${w.kind === 'epg' ? ` ${_t('· kulcsszó:')} ${esc(w.kw || _t('a sportág szavai'))}` : w.kind === 'ics' ? ' · ' + esc(w.url) : ''}${cache.errors[w.id] ? ` · <span class="warn">${esc(cache.errors[w.id])}</span>` : ''}</small></span>
          <button class="btn small danger" data-sw="del">${_t('Törlés')}</button></li>`)
        .join('')}</ul>`)
      .join('');
  };

  const drawLeagues = async () => {
    body.innerHTML = '<div class="spinner small"></div>';
    const cat = await loadCatalog();
    const sports = [...new Set(cat.map((l) => l.s))];
    const q = norm(bQuery);
    const list = cat.filter((l) => (!bSport || l.s === bSport) && (!q || norm(`${l.n} ${l.a} ${l.c}`).includes(q)));
    const tsdb = !!(store.settings.tsdbKey || '').trim();
    body.innerHTML = `<div class="filters sw-filters"><input class="input" type="search" data-sw-q placeholder="${_t('Keresés: pl. NB I, NBA, Wimbledon, UFC, Bundesliga…')}" value="${esc(bQuery)}" />
        <select data-sw-sport><option value="">${_t('Minden sportág (ESPN)')}</option>${sports.map((s) => `<option value="${s}" ${bSport === s ? 'selected' : ''}>${sportOf(ESPN_TO[s]).ico} ${esc(sportOf(ESPN_TO[s]).name)} – ${esc(s)}</option>`).join('')}</select></div>
      <p class="muted small">${_t('{length} bajnokság az ESPN-katalógusban (menetrend, élő állás, eredmény).', { length: list.length })}${tsdb ? '' : ` ${_t('További sportágakhoz (darts, snooker, kézilabda, e-sport…) add meg a TheSportsDB-kulcsot a Beállítások fülön, vagy kövesd a sportágat a műsorújságban.')}`}</p>
      <ul class="src-list sw-leagues">${list
        .slice(0, 120)
        .map((l) => {
          const id = `espn:${l.s}/${l.c}`;
          const on = isWatched(id);
          return `<li data-lg="${esc(l.s + '/' + l.c)}"><span class="sw-ico">${sportOf(ESPN_TO[l.s]).ico}</span><span><b>${esc(l.n)}</b><small>${esc(l.a)} · ${esc(l.s)}${l.g === 'f' ? ` ${_t('· női')}` : ''}</small></span>
            <button class="btn small" data-sw="teams">${_t('Csapat…')}</button><button class="btn small ${on ? 'on' : 'primary'}" data-sw="follow">${on ? _t('✓ Követve') : _t('+ Követés')}</button></li>`;
        })
        .join('')}</ul>${list.length > 120 ? `<p class="muted small">${_t('Szűkíts kereséssel – az első 120 látszik.')}</p>` : ''}
      ${tsdb ? `<h3>TheSportsDB</h3><div class="inline"><input class="input" data-sw-tq placeholder="${_t('Sportág angolul (pl. Darts, Snooker, Handball, Esports, Cycling)')}" /><button class="btn small" data-sw="tsearch">${_t('Bajnokságok keresése')}</button></div><ul class="src-list sw-tsdb"></ul>` : ''}`;
  };

  const drawEpg = () => {
    body.innerHTML = `<p class="muted small">${_t('Bármilyen sportág vagy játék, amit a tévé közvetít: a program a műsorújságban keresi (cím, kategória), és azonnal csatornát is ad. Kattints a sportágra a követéshez.')}</p>
      <div class="sw-chips">${SPORTS.filter(([id]) => id !== 'other')
        .map(([id, name, ico]) => {
          const on = isWatched(`epg:${id}`);
          return `<button class="sw-chip ${on ? 'on' : ''}" data-sw-epg="${id}">${ico} ${esc(name)}${on ? ' ✓' : ''}</button>`;
        })
        .join('')}</div>
      <h3>${_t('Saját kulcsszó')}</h3>
      <p class="muted small">${_t('Bármi más: csapat, sportoló, verseny vagy játék (pl. <i>Fradi</i>, <i>Szoboszlai</i>, <i>sakkolimpia</i>, <i>World Chase Tag</i>, <i>Tour de Hongrie</i>). Több szó: függőleges vonallal (<code>|</code>) elválasztva.')}</p>
      <div class="inline"><input class="input" data-sw-kw placeholder="${_t('pl. Ferencváros|Fradi')}" /><select data-sw-kws>${SPORTS.map(([id, name, ico]) => `<option value="${id}">${ico} ${esc(name)}</option>`).join('')}</select><button class="btn small primary" data-sw="addkw">${_t('+ Követés')}</button></div>`;
  };

  const drawIcs = () => {
    body.innerHTML = `<p class="muted small">${_t('Szinte minden sportszervezet, csapat és versenysorozat ad nyilvános naptárat (iCal / ICS / Google-naptár „nyilvános cím iCal formátumban”). A címet ide másolva az eseményei a listába kerülnek – így bármilyen sport követhető (pl. disc golf túrák, World Chase Tag, sakkversenyek, helyi bajnokság).')}</p>
      <div class="sw-ics-form"><input class="input" data-sw-icsurl placeholder="${_t('https://…/naptar.ics vagy webcal://…')}" />
        <input class="input" data-sw-icsname placeholder="${_t('Név (pl. Disc Golf Pro Tour)')}" />
        <select data-sw-icssport>${SPORTS.map(([id, name, ico]) => `<option value="${id}">${ico} ${esc(name)}</option>`).join('')}</select>
        <button class="btn small primary" data-sw="addics">${_t('+ Naptár hozzáadása')}</button></div>`;
  };

  const drawOpts = () => {
    const s = store.settings;
    body.innerHTML = `<label class="setting stack"><span>${_t('<b>TheSportsDB API-kulcs</b>')}<small>${_t('A thesportsdb.com támogatói kulcsával szinte minden sportág bajnokságai elérhetők (darts, snooker, kézilabda, kerékpár, e-sport…). Kulcs nélkül ez a forrás nem működik.')}</small></span>
        <div class="inline"><input class="input" data-sw-key placeholder="${_t('kulcs')}" autocomplete="off" /><button class="btn small" data-sw="savekey">${_t('Mentés')}</button></div></label>
      <label class="setting"><span>${_t('<b>Eredmények ennyi napra visszamenőleg</b>')}</span><select data-sw-back>${[1, 2, 3, 5, 7].map((d) => `<option value="${d}" ${(s.sportBack ?? 2) === d ? 'selected' : ''}>${_t('{d} nap', { d })}</option>`).join('')}</select></label>
      <label class="setting"><span>${_t('<b>Közelgő események ennyi napra előre</b>')}</span><select data-sw-ahead>${[1, 3, 7, 14].map((d) => `<option value="${d}" ${(s.sportAhead ?? 7) === d ? 'selected' : ''}>${_t('{d} nap', { d })}</option>`).join('')}</select></label>
      <label class="setting"><span>${_t('<b>Csatornaajánlás</b>')}<small>${_t('Az eseményekhez a műsorújságból keres csatornát (csapatnév, bajnokság, sportág és időpont alapján). A bizonytalan találat halványan látszik.')}</small></span><input type="checkbox" class="switch" data-sw-chan ${s.sportChannels === false ? '' : 'checked'} /></label>`;
    body.querySelector('[data-sw-key]').value = s.tsdbKey || ''; // tulajdonságként, nem attribútumként
  };

  const draw = () => {
    el.querySelectorAll('[data-swt]').forEach((b) => b.classList.toggle('active', b.dataset.swt === tab));
    const t = el.querySelector('[data-swt="watch"]');
    t.textContent = `${_t('Követett ({length})', { length: watchList().length })}`;
    ({ watch: drawWatch, leagues: drawLeagues, epg: drawEpg, ics: drawIcs, opts: drawOpts })[tab]();
  };

  el.addEventListener('click', async (e) => {
    const t = e.target.closest('[data-swt]');
    if (t) {
      tab = t.dataset.swt;
      return draw();
    }
    const b = e.target.closest('[data-sw], [data-sw-epg]');
    if (!b) return;
    const a = b.dataset.sw;
    const li = b.closest('li');
    if (a === 'close') return close();
    if (a === 'del') {
      removeWatch(li.dataset.w);
      mark();
      return draw();
    }
    if (b.dataset.swEpg) {
      const id = `epg:${b.dataset.swEpg}`;
      if (isWatched(id)) removeWatch(id);
      else addWatch({ id, kind: 'epg', sport: b.dataset.swEpg, name: sportOf(b.dataset.swEpg).name + ` ${_t('a tévében')}` });
      mark();
      return draw();
    }
    if (a === 'follow') {
      const ref = li.dataset.lg;
      const id = `espn:${ref}`;
      if (isWatched(id)) removeWatch(id);
      else {
        const [s, c] = ref.split('/');
        const l = (await loadCatalog()).find((x) => x.s === s && x.c === c);
        addWatch({ id, kind: 'espn', sport: ESPN_TO[s] || 'other', ref, name: l?.n || c });
      }
      mark();
      return draw();
    }
    if (a === 'teams') {
      const ref = li.dataset.lg;
      b.disabled = true;
      try {
        const j = await json(`https://site.api.espn.com/apis/site/v2/sports/${ref}/teams`, 24);
        const teams = j.sports?.[0]?.leagues?.[0]?.teams?.map((t) => t.team) || [];
        if (!teams.length) return toast(_t('Ehhez a bajnoksághoz nincs csapatlista (pl. egyéni sportág).'));
        const [s, c] = ref.split('/');
        const l = (await loadCatalog()).find((x) => x.s === s && x.c === c);
        const box = html(`<ul class="sw-teams">${teams
          .map((t) => `<li><button class="btn small ${isWatched(`espn:${ref}:${t.id}`) ? 'on' : ''}" data-team="${esc(t.id)}" data-tname="${esc(t.displayName)}">${t.logos?.[0]?.href ? `<img src="${esc(t.logos[0].href)}" alt="" loading="lazy" />` : ''}${esc(t.displayName)}</button></li>`)
          .join('')}</ul>`);
        li.after(box);
        box.onclick = (ev) => {
          const tb = ev.target.closest('[data-team]');
          if (!tb) return;
          const id = `espn:${ref}:${tb.dataset.team}`;
          if (isWatched(id)) removeWatch(id);
          else addWatch({ id, kind: 'espn', sport: ESPN_TO[s] || 'other', ref, team: tb.dataset.team, teamName: tb.dataset.tname, name: l?.n || c });
          tb.classList.toggle('on', isWatched(id));
          mark();
        };
      } catch (err) {
        toast(`${_t('A csapatlista nem érhető el:')} ` + err.message);
      }
      return;
    }
    if (a === 'tsearch') {
      const q = el.querySelector('[data-sw-tq]').value.trim();
      if (!q) return;
      const out = el.querySelector('.sw-tsdb');
      out.innerHTML = '<li><div class="spinner small"></div></li>';
      try {
        const key = encodeURIComponent(store.settings.tsdbKey.trim());
        const j = await json(`https://www.thesportsdb.com/api/v1/json/${key}/search_all_leagues.php?s=${encodeURIComponent(q)}`, 24);
        const ls = j.countries || j.countrys || [];
        const sp = SPORTS.find(([, , , , kw]) => kw && kwRx(kw).test(q))?.[0] || 'other';
        out.innerHTML = ls.length
          ? ls.map((l) => `<li data-tl="${esc(l.idLeague)}" data-tn="${esc(l.strLeague)}" data-ts="${sp}"><span><b>${esc(l.strLeague)}</b><small>${esc(l.strSport)} · ${esc(l.strCountry || '')}</small></span><button class="btn small ${isWatched('tsdb:' + l.idLeague) ? 'on' : 'primary'}" data-sw="tfollow">${isWatched('tsdb:' + l.idLeague) ? _t('✓ Követve') : _t('+ Követés')}</button></li>`).join('')
          : `<li class="muted">${_t('Nincs találat (a sportág nevét angolul add meg).')}</li>`;
      } catch (err) {
        out.innerHTML = `<li class="warn">${esc(err.message)}</li>`;
      }
      return;
    }
    if (a === 'tfollow') {
      const id = 'tsdb:' + li.dataset.tl;
      if (isWatched(id)) removeWatch(id);
      else addWatch({ id, kind: 'tsdb', sport: li.dataset.ts, ref: li.dataset.tl, name: li.dataset.tn });
      b.classList.toggle('on', isWatched(id));
      b.classList.toggle('primary', !isWatched(id));
      b.textContent = isWatched(id) ? _t('✓ Követve') : _t('+ Követés');
      mark();
      return;
    }
    if (a === 'addkw') {
      const kw = el.querySelector('[data-sw-kw]').value.trim();
      if (!kw) return toast(_t('Írj be egy kulcsszót.'));
      const sport = el.querySelector('[data-sw-kws]').value;
      if (addWatch({ id: `epg:kw:${norm(kw)}`, kind: 'epg', sport, kw, name: kw.split('|')[0] })) toast(`${_t('Követve a műsorújságban: {kw}', { kw })}`);
      mark();
      tab = 'watch';
      return draw();
    }
    if (a === 'addics') {
      let url = el.querySelector('[data-sw-icsurl]').value.trim().replace(/^webcal:/i, 'https:');
      const name = el.querySelector('[data-sw-icsname]').value.trim() || _t('Naptár');
      const sport = el.querySelector('[data-sw-icssport]').value;
      if (!/^https?:\/\/\S+$/i.test(url)) return toast(_t('Adj meg egy http(s) vagy webcal naptárcímet.'));
      try {
        const { text } = await api.fetchText(url, { maxAgeHours: 0, force: true });
        const n = parseIcs(text, { id: 'x', name, sport }).length;
        if (!/BEGIN:VCALENDAR/.test(text)) throw new Error(_t('A cím nem iCal-naptár.'));
        addWatch({ id: `ics:${url}`, kind: 'ics', sport, url, name });
        toast(`${_t('Naptár hozzáadva: {name} ({n} esemény)', { name, n })}`);
        mark();
        tab = 'watch';
        draw();
      } catch (err) {
        toast(`${_t('A naptár nem tölthető le:')} ` + (err.message || err));
      }
      return;
    }
    if (a === 'savekey') {
      store.settings.tsdbKey = el.querySelector('[data-sw-key]').value.trim();
      saveWatch();
      mark();
      toast(_t('Kulcs elmentve'));
    }
  });
  el.addEventListener('change', (e) => {
    const t = e.target;
    if (t.matches('[data-sw-on]')) {
      const w = watchList().find((x) => x.id === t.closest('li').dataset.w);
      if (w) w.on = t.checked;
      saveWatch();
      mark();
    } else if (t.matches('[data-sw-sport]')) {
      bSport = t.value;
      drawLeagues();
    } else if (t.matches('[data-sw-back]')) {
      store.settings.sportBack = Number(t.value);
      saveWatch();
      mark();
    } else if (t.matches('[data-sw-ahead]')) {
      store.settings.sportAhead = Number(t.value);
      saveWatch();
      mark();
    } else if (t.matches('[data-sw-chan]')) {
      store.settings.sportChannels = t.checked;
      store.save();
      mark();
    }
  });
  el.addEventListener(
    'input',
    debounce((e) => {
      if (!e.target.matches('[data-sw-q]')) return;
      bQuery = e.target.value;
      drawLeagues().then(() => {
        const i = el.querySelector('[data-sw-q]');
        i?.focus();
        i?.setSelectionRange(bQuery.length, bQuery.length);
      });
    }, 300)
  );
  draw();
}

// A főoldal / beállítások hivatkozása (#sportwatch) az ablakot nyitja
document.addEventListener('click', (e) => {
  const a = e.target.closest?.('a[href="#sportwatch"]');
  if (!a) return;
  e.preventDefault();
  openSportWatch(() => document.dispatchEvent(new CustomEvent('adas-sport-changed')));
});
