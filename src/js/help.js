// A beépített súgó: témakörök oldalsávval, kereséssel, kapcsolódó témákkal.
import { $, $$, esc, norm, debounce } from './util.js';
import { _t, lang } from './i18n.js';

// A súgó szövege nyelvenként külön modul, csak megnyitáskor töltődik be. (Szó szerinti importok:
// a tévés csomag esbuild-je így be tudja csomagolni őket.)
const LOADERS = {
  hu: () => import('./help-content.js'),
  en: () => import('./help/en.js'),
  de: () => import('./help/de.js'),
  es: () => import('./help/es.js'),
  fr: () => import('./help/fr.js'),
};
let HELP_CATEGORIES = [];
let ARTICLES = [];
let byId = new Map();
let loading = null;
const loadHelp = () =>
  (loading ||= (LOADERS[lang] || LOADERS.hu)().then((m) => {
    HELP_CATEGORIES = m.HELP_CATEGORIES;
    ARTICLES = m.ARTICLES;
    byId = new Map(ARTICLES.map((a) => [a.id, a]));
  }).catch((err) => {
    loading = null; // a következő megnyitás újrapróbálja
    throw err;
  }));
let index = null;

/** Melyik téma tartozik az egyes képernyőkhöz (F1 / ? gomb). */
const ROUTE_TOPICS = {
  home: 'dashboard',
  recordings: 'recording',
  tv: 'home',
  guide: 'guide-grid',
  browse: 'browse',
  favorites: 'favorites',
  search: 'search',
  settings: 'settings-overview',
  vod: 'vod',
  own: 'own',
  stats: 'stats',
};

/** Kereshető szöveg témánként (címkék nélkül, ékezet nélkül). */
function buildIndex() {
  const div = document.createElement('div');
  index = ARTICLES.map((a) => {
    div.innerHTML = a.body.replace(/</g, ' <'); // a cellák, listaelemek szövege ne olvadjon egybe
    const text = div.textContent.replace(/\s+/g, ' ').trim();
    return { a, text, n: norm(text), title: norm(a.title), kw: norm(a.keywords || '') };
  });
}

export function helpTopicForRoute(route) {
  return ROUTE_TOPICS[route] || 'welcome';
}

function searchHelp(q) {
  if (!index) buildIndex();
  const tokens = norm(q).split(/\s+/).filter((x) => x.length > 1);
  if (!tokens.length) return [];
  const hits = [];
  for (const it of index) {
    let score = 0;
    let all = true;
    for (const tk of tokens) {
      const inTitle = it.title.includes(tk);
      const inKw = it.kw.includes(tk);
      const inText = it.n.includes(tk);
      if (!inTitle && !inKw && !inText) {
        all = false;
        break;
      }
      score += (inTitle ? 10 : 0) + (inKw ? 5 : 0) + (inText ? 1 + Math.min(5, it.n.split(tk).length - 1) : 0);
    }
    if (all) hits.push({ ...it, score });
  }
  return hits.sort((x, y) => y.score - x.score);
}

/** Részlet a találat körül, kiemelt kifejezésekkel (biztonságosan escape-elve). */
function snippet(text, n, tokens) {
  const pos = Math.max(0, Math.min(...tokens.map((t) => n.indexOf(t)).filter((i) => i >= 0)));
  const start = Math.max(0, pos - 70);
  let s = (start ? '…' : '') + text.slice(start, start + 220) + (start + 220 < text.length ? '…' : '');
  s = esc(s);
  // Kiemelés: az ékezet nélküli alakban keresünk, az eredeti szövegben jelölünk.
  const ns = norm(s);
  const marks = [];
  for (const t of tokens) {
    let i = ns.indexOf(t);
    while (i >= 0) {
      marks.push([i, i + t.length]);
      i = ns.indexOf(t, i + t.length);
    }
  }
  marks.sort((a, b) => b[0] - a[0]);
  for (const [a, b] of marks) s = s.slice(0, a) + '<mark>' + s.slice(a, b) + '</mark>' + s.slice(b);
  return s;
}

export async function renderHelp(view, params) {
  if (!ARTICLES.length) {
    view.innerHTML = `<div class="page help"><div class="page-head"><h1>${_t('Súgó')}</h1></div></div>`;
    try {
      await loadHelp();
    } catch {
      if (view.isConnected) view.querySelector('.page-head')?.insertAdjacentHTML('afterend', `<p class="muted">${_t('A súgó nem tölthető be. Próbáld újra.')}</p>`);
      return;
    }
    if (!view.isConnected || !location.hash.startsWith('#/help')) return; // közben máshová lépett
  }
  const q = params.get('q') || '';
  const topic = byId.has(params.get('topic')) ? params.get('topic') : 'welcome';

  view.innerHTML = `<div class="page help">
    <div class="page-head"><h1>${_t('Súgó')}</h1><span class="muted">${_t('{length} témakör · <kbd>F1</kbd> vagy <kbd>?</kbd> bárhonnan', { length: ARTICLES.length })}</span></div>
    <div class="help-layout">
      <aside class="help-nav">
        <input class="input help-search" type="search" placeholder="${_t('Keresés a súgóban…')}" value="${esc(q)}" aria-label="${_t('Keresés a súgóban')}" />
        <nav>${HELP_CATEGORIES.map(
          (c) => `<div class="help-cat"><h4>${esc(c.title)}</h4>${ARTICLES.filter((a) => a.cat === c.id)
            .map((a) => `<a href="#/help?topic=${a.id}" class="${!q && a.id === topic ? 'active' : ''}">${esc(a.title)}</a>`)
            .join('')}</div>`
        ).join('')}</nav>
      </aside>
      <article class="help-article"></article>
    </div>
  </div>`;

  const article = $('.help-article', view);
  if (q) renderResults(article, q);
  else renderArticle(article, byId.get(topic));

  const input = $('.help-search', view);
  input.addEventListener(
    'input',
    debounce(() => {
      const v = input.value.trim();
      // A címet frissítjük (vissza gombbal is működjön), de a mezőből nem vesszük el a fókuszt.
      history.replaceState(null, '', v ? '#/help?q=' + encodeURIComponent(v) : '#/help?topic=' + topic);
      $$('.help-nav a', view).forEach((a) => a.classList.remove('active'));
      if (v) renderResults(article, v);
      else renderArticle(article, byId.get(topic));
    }, 200)
  );
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === 'ArrowDown') {
      e.preventDefault();
      article.querySelector('a, button')?.focus();
    }
  });
  if (q) input.focus();
}

function renderArticle(box, a) {
  const cat = HELP_CATEGORIES.find((c) => c.id === a.cat);
  const i = ARTICLES.indexOf(a);
  const prev = ARTICLES[i - 1];
  const next = ARTICLES[i + 1];
  const related = ARTICLES.filter((x) => x.cat === a.cat && x !== a);
  box.innerHTML = `
    <div class="help-crumbs">${esc(cat?.title || '')}</div>
    <h1>${esc(a.title)}</h1>
    <div class="help-body">${a.body}</div>
    ${
      related.length
        ? `<div class="help-related"><h4>${_t('Ebben a témakörben még')}</h4>${related
            .map((r) => `<a href="#/help?topic=${r.id}">${esc(r.title)}</a>`)
            .join('')}</div>`
        : ''
    }
    <div class="help-pager">
      ${prev ? `<a class="btn" href="#/help?topic=${prev.id}">‹ ${esc(prev.title)}</a>` : '<span></span>'}
      ${next ? `<a class="btn" href="#/help?topic=${next.id}">${esc(next.title)} ›</a>` : ''}
    </div>`;
  box.scrollTop = 0;
}

function renderResults(box, q) {
  const tokens = norm(q).split(/\s+/).filter((x) => x.length > 1);
  const hits = searchHelp(q);
  box.innerHTML = `<div class="help-crumbs">${_t('Keresés')}</div>
    <h1>${_t('Találatok: „{esc}”', { esc: esc(q) })}</h1>
    ${hits.length
        ? `<ol class="help-results">${hits
            .map(
              (h) => `<li><a href="#/help?topic=${h.a.id}"><b>${esc(h.a.title)}</b>
                <small>${esc(HELP_CATEGORIES.find((c) => c.id === h.a.cat)?.title || '')}</small></a>
                <p>${snippet(h.text, h.n, tokens)}</p></li>`
            )
            .join('')}</ol>`
        : `<p class="muted">${_t('Nincs találat. Próbálj más kifejezést (pl. „kedvenc”, „frissítés”, „távirányító”, „nem indul”).')}</p>`}`;
}
