// A Gyűjtemény elrendezés Rádió, VOD (Filmek, Saját médiatár) és Podcast oldala: a teljes gyűjtemény egy rácsban, oldalt
// pipálható szűrőkkel (facets.js) – mint a TV oldalon (layouts.js: renderUnified). A szűrések profilonként
// megmaradnak (profile.uniPages).
import { esc, html, norm, debounce, bus } from './util.js';
import { store } from './store.js';
import { epg } from './epg.js';
import { countryName, countryFlag } from './catalog.js';
import { facetPanel } from './facets.js';
import { radio, genreName, radioAvailability, radioGeo, radioPopular, queueRadioChecks, isRadioFav } from './radio.js';
import { stationCardHtml, registerList } from './radiopage.js';
import { vod, own, visibleVod, vcardHtml, fillPosters, catsOf, genreLabel, displayTitle, isVodFav, isWatchlisted } from './vod.js';
import { isKidsVod } from './kids.js';
import { pod, feeds, epState, isPlayed, inQueue } from './podcast.js';
import { epCardHtml } from './podcastpage.js';
import { _t, lang } from './i18n.js';

const flagName = (cc) => `${countryFlag(cc)} ${countryName(cc) || cc}`.trim();
const RADIO_SOURCES = { rb: 'Radio Browser', verified: 'Verified Radio Streams', iprd: 'IPRD', saved: _t('mentett adó') };

function radioCollection() {
  const AV = { ok: _t('Szól'), bad: _t('Most nem szól'), unknown: _t('Még nem ellenőrzött'), geo: _t('Földrajzi korlát – innen nem hallgatható'), geomaybe: _t('Földrajzi korlát lehet') };
  const Q = { hi: _t('Kiváló (256 kbps vagy több)'), mid: _t('Jó (128–255 kbps)'), low: _t('Gyengébb (128 kbps alatt)'), unk: _t('Ismeretlen') };
  const MORE = { fav: _t('Kedvenc'), epg: _t('Van műsorújság') };
  const avOf = (st) => {
    const a = radioAvailability(st);
    return a >= 2 ? 'ok' : a === 0 ? 'bad' : 'unknown';
  };
  return {
    noun: (n) => _t('{count} adó', { count: n }),
    empty: _t('Nincs a szűrőknek megfelelő adó.'),
    search: _t('Keresés az adók között…'),
    items: () => radioPopular([...radio.byId.values()]),
    text: (st) => st.search || norm(st.name),
    card: (list) => {
      const ctx = registerList(list);
      return (st) => stationCardHtml(st, ctx);
    },
    shown: (part) => queueRadioChecks(part),
    gridClass: 'rgrid',
    refreshOn: ['health', 'radio-favs', 'epg'],
    facets: () => [
      { id: 'genre', title: _t('Téma'), keys: (st) => st.genres, label: genreName, open: true },
      { id: 'cc', title: _t('Ország'), keys: (st) => [st.country], label: flagName, first: [(store.settings.homeCountry || 'HU').toUpperCase()], open: true },
      { id: 'av', title: _t('Elérhetőség'), order: Object.keys(AV), label: (k) => AV[k], open: true, keys: (st) => [avOf(st), { sure: 'geo', maybe: 'geomaybe' }[radioGeo(st)]] },
      { id: 'tag', title: _t('Címkék'), keys: (st) => st.tags, label: (k) => k },
      { id: 'q', title: _t('Hangminőség'), order: Object.keys(Q), label: (k) => Q[k], keys: (st) => [st.bitrate >= 256 ? 'hi' : st.bitrate >= 128 ? 'mid' : st.bitrate > 0 ? 'low' : 'unk'] },
      { id: 'codec', title: _t('Formátum'), keys: (st) => [st.codec], label: (k) => k },
      { id: 'src', title: _t('Források'), keys: (st) => st.sources, label: (k) => RADIO_SOURCES[k] || (String(k).startsWith('list:') ? _t('saját lista / csomag') : k) },
      { id: 'more', title: _t('Egyéb'), all: true, order: Object.keys(MORE), label: (k) => MORE[k], keys: (st) => [isRadioFav(st.id) && 'fav', epg.has(st.id) && 'epg'].filter(Boolean) },
    ],
  };
}

// (a lista neve, a csoportok és a cím alapján: „szinkron”, „felirat” – a forrás jelölése szerint)
const DUB_RX = /szinkron|magyarul|\bhun(?:dub)?\b(?!\s*sub)/i;
const SUB_RX = /felirat|hunsub|\bsubs?\b|subtitle/i;
const decadeLabel = (d) => (lang === 'hu' ? `${d}-${/(?:20|30|60|80)$/.test(d) ? 'as' : 'es'} ${_t('évek')}` : `${d}s`);
function vodCollection(lib) {
  const progress = (k) => store.profile.vodProgress?.[k] || null;
  const stateOf = (x) => {
    if (x.type === 'series') {
      const eps = x.episodes || [];
      const done = eps.filter((e) => progress(e.key)?.done).length;
      return done && done === eps.length ? 'done' : done || eps.some((e) => progress(e.key)?.p > 0) ? 'started' : 'new';
    }
    const p = progress(x.id);
    return p?.done ? 'done' : p?.p > 0 ? 'started' : 'new';
  };
  const TYPE = { movie: _t('Film'), series: _t('Sorozat') };
  const HU = { dub: _t('Magyar szinkron'), sub: _t('Feliratos'), hu: _t('Magyar (a forrás jelölése szerint)'), likely: _t('Valószínűleg magyar'), none: _t('Nincs jelölés') };
  const STATE = { new: _t('Még nem néztem'), started: _t('Elkezdtem'), done: _t('Megnéztem') };
  const MORE = { fav: _t('Kedvenc'), watch: _t('Megnézendő'), kids: _t('Gyerekeknek') };
  const huOf = (x) => {
    const t = [...x.groups, ...x.lists, x.title].join(' ');
    const k = [DUB_RX.test(t) && 'dub', SUB_RX.test(t) && 'sub'].filter(Boolean);
    return k.length ? k : [x.hu === 2 ? 'hu' : x.hu === 1 ? 'likely' : 'none'];
  };
  return {
    noun: (n) => _t('{n} cím', { n }),
    empty: _t('Nincs a szűrőknek megfelelő cím.'),
    search: _t('Keresés a címek között…'),
    items: () => {
      const { movies, series } = visibleVod(lib);
      return [...movies, ...series];
    },
    text: (x) => x.search || norm(displayTitle(x)),
    card: () => vcardHtml,
    shown: (part, grid) => fillPosters(grid),
    gridClass: 'vgrid',
    refreshOn: [],
    facets: () => [
      { id: 'type', title: _t('Típus'), order: Object.keys(TYPE), label: (k) => TYPE[k], keys: (x) => [x.type], open: true },
      { id: 'genre', title: _t('Műfaj'), keys: catsOf, label: genreLabel, open: true },
      { id: 'hu', title: _t('Nyelv és felirat'), order: Object.keys(HU), label: (k) => HU[k], keys: huOf, open: true },
      { id: 'dec', title: _t('Évtized'), keys: (x) => [x.year ? String(Math.floor(Number(x.year) / 10) * 10) : ''], label: decadeLabel },
      { id: 'list', title: _t('Listák'), keys: (x) => x.lists, label: (k) => k },
      { id: 'state', title: _t('Állapot'), order: Object.keys(STATE), label: (k) => STATE[k], keys: (x) => [stateOf(x)] },
      { id: 'more', title: _t('Egyéb'), all: true, order: Object.keys(MORE), label: (k) => MORE[k], keys: (x) => [isVodFav(x) && 'fav', isWatchlisted(x) && 'watch', isKidsVod(x) && 'kids'].filter(Boolean) },
    ],
  };
}

// Podcast: a feliratkozott műsorok epizódjai
const podEps = () => pod().subs.flatMap((s) => feeds.get(s.url)?.eps || []).sort((a, b) => (b.pub || 0) - (a.pub || 0));
function podCollection() {
  const STATE = { new: _t('Még nem hallgattam'), started: _t('Elkezdtem'), done: _t('Meghallgattam') };
  const DATE = { day: _t('Az elmúlt napon'), week: _t('Az elmúlt héten'), month: _t('Az elmúlt hónapban'), year: _t('Az elmúlt évben'), old: _t('Régebbi') };
  const LEN = { s: _t('15 perc alatt'), m: _t('15–30 perc'), l: _t('30–60 perc'), xl: _t('Egy óránál hosszabb'), unk: _t('Ismeretlen') };
  const MORE = { fav: _t('Kedvenc'), queue: _t('A lejátszási sorban'), dl: _t('Letöltve'), inbox: _t('Új epizód') };
  const show = new Map(pod().subs.map((s) => [s.url, s.title || feeds.get(s.url)?.title || s.url]));
  const stateOf = (ep) => (isPlayed(ep.key) ? 'done' : epState(ep.key)?.pos ? 'started' : 'new');
  const dateOf = (ep) => {
    const age = Date.now() - (ep.pub || 0);
    if (!ep.pub) return '';
    return age < 86400e3 ? 'day' : age < 7 * 86400e3 ? 'week' : age < 31 * 86400e3 ? 'month' : age < 366 * 86400e3 ? 'year' : 'old';
  };
  const lenOf = (ep) => {
    const m = (ep.dur || 0) / 60;
    return !m ? 'unk' : m < 15 ? 's' : m < 30 ? 'm' : m < 60 ? 'l' : 'xl';
  };
  return {
    noun: (n) => _t('{n} epizód', { n }),
    empty: _t('Nincs a szűrőknek megfelelő epizód.'),
    search: _t('Keresés az epizódok között…'),
    items: podEps,
    text: (ep) => norm([ep.title, ep.feedTitle].join(' ')),
    card: () => epCardHtml,
    shown: () => {},
    gridClass: 'pod-grid',
    refreshOn: ['pod-state', 'pod-queue', 'pod-dl', 'pod-subs', 'pod-refreshed'],
    facets: () => [
      { id: 'show', title: _t('Műsor'), keys: (ep) => [ep.feed], label: (k) => show.get(k) || k, open: true },
      { id: 'state', title: _t('Állapot'), order: Object.keys(STATE), label: (k) => STATE[k], keys: (ep) => [stateOf(ep)], open: true },
      { id: 'date', title: _t('Megjelenés'), order: Object.keys(DATE), label: (k) => DATE[k], keys: (ep) => [dateOf(ep)], open: true },
      { id: 'len', title: _t('Hossz'), order: Object.keys(LEN), label: (k) => LEN[k], keys: (ep) => [lenOf(ep)] },
      { id: 'more', title: _t('Egyéb'), all: true, order: Object.keys(MORE), label: (k) => MORE[k],
        keys: (ep) => [epState(ep.key)?.fav && 'fav', inQueue(ep.key) && 'queue', epState(ep.key)?.dl && 'dl', pod().inbox.some((x) => x.key === ep.key) && 'inbox'].filter(Boolean) },
    ],
  };
}

/** Az oldal teljes gyűjteménye – csak az oldalak fő nézetén (a műfaj-, ország-, böngészőoldalak maradnak). */
export function collectionOf(name) {
  if (location.hash.includes('?')) return null;
  if (name === 'radio') return radio.byId.size ? radioCollection() : null;
  if (name === 'vod') return vod.ready ? vodCollection(vod) : null;
  if (name === 'own') return own.ready ? vodCollection(own) : null;
  // (feliratkozás nélkül, vagy amíg az epizódok nem töltődtek be, a podcast-sorok maradnak)
  if (name === 'podcast') return store.profile && podEps().length ? podCollection() : null;
  return null;
}

/** A gyűjtemény kirajzolása a sorok helyére (box: az oldal .rows doboza). */
export function renderCollection(box, name, col) {
  const all = (store.profile.uniPages ||= {});
  const st = { sel: {}, open: {}, q: '', ...(all[name] || {}) };
  const save = () => store.setProfileValue('uniPages', { ...(store.profile.uniPages || {}), [name]: { sel: st.sel, open: st.open } });
  const ui = html(`<div class="uni adapt-uni uni-col">
    <aside class="uni-side"><details class="uni-filters" ${matchMedia('(max-width: 700px)').matches ? '' : 'open'}><summary>${_t('Szűrők')}</summary></details></aside>
    <section class="uni-main"><div class="uni-bar"><input class="input uni-q" type="search" placeholder="${esc(col.search)}" aria-label="${esc(col.search)}" />
      <span class="muted uni-count"></span></div><div class="uni-results"></div></section></div>`);
  const results = ui.querySelector('.uni-results');
  let items = col.items();
  const panel = facetPanel({ facets: col.facets(), items, state: st, onChange: () => (save(), draw()), onOpen: save });
  ui.querySelector('.uni-filters').append(panel.el);
  ui.querySelector('.uni-bar').after(panel.chips);
  let io = null;
  let shown = '';
  // (a sorrend nem számít: az ellenőrzés közben átrendeződő lista ne rajzolja újra a rácsot)
  const sig = (list) => list.map((x) => x.id || x.key).sort().join('\n');
  const current = () => {
    const t = norm(ui.querySelector('.uni-q').value.trim());
    return panel.filter().filter((x) => !t || col.text(x).includes(t));
  };
  function draw() {
    const list = current();
    shown = sig(list);
    ui.querySelector('.uni-count').textContent = col.noun(list.length);
    io?.disconnect();
    results.innerHTML = '';
    if (!list.length) return void (results.innerHTML = `<p class="muted">${esc(col.empty)}</p>`);
    const grid = html(`<div class="grid ${col.gridClass}"></div>`);
    const sentinel = html('<div class="grid-sentinel"></div>');
    results.append(grid, sentinel);
    const card = col.card(list);
    // (fokozatosan: több ezer kártya egyszerre lassú lenne)
    let n = 0;
    const more = () => {
      const part = list.slice(n, n + 90);
      grid.insertAdjacentHTML('beforeend', part.map(card).join(''));
      n += part.length;
      col.shown(part, grid);
      if (n >= list.length) io.disconnect();
    };
    io = new IntersectionObserver((es) => es.some((x) => x.isIntersecting) && more(), { rootMargin: '800px' });
    more();
    io.observe(sentinel);
  }
  ui.querySelector('.uni-q').addEventListener('input', debounce(draw, 200));
  // (ellenőrzés, kedvenc, műsorújság után a darabszámok frissülnek – a rács nem ugrik el)
  const offs = col.refreshOn.map((ev) =>
    bus.on(ev, debounce(() => {
      if (!ui.isConnected) return offs.forEach((off) => off?.());
      items = col.items();
      panel.setItems(items);
      // (a rács csak akkor rajzolódik újra, ha a szűrt találatok köre megváltozott)
      if (sig(current()) !== shown) draw();
    }, 1500))
  );
  // (az oldal fülei – ha a sorok dobozában vannak – fölötte maradnak)
  const tabs = [...box.children].filter((c) => c.matches('.tv-head, .tabs, .vod-tabs, .radio-tabs, .vod-quick')).pop();
  if (tabs) tabs.after(ui);
  else box.prepend(ui);
  draw();
}
