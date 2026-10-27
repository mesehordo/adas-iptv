// A TV, a VOD és a Rádió oldal igazítása a felület elrendezéséhez. Az oldal a szokásos módon rajzolódik ki (sorok
// kártyákkal), utána a sorok kártyái az elrendezés módján rendeződnek át. A kártyák ugyanazok az elemek maradnak
// (a dokumentumban, esetleg rejtve), így a lejátszás, a kedvencek, az adatlap és a frissítésük a megszokott úton megy.
import { esc, html, debounce, hashHue } from './util.js';
import { catalog } from './catalog.js';
import { epg } from './epg.js';
import { ICON } from './components.js';
import { currentLayout } from './layoutdefs.js';
import { _t } from './i18n.js';

const CARD = '.card, .vcard, .rcard, .tile';
const PAGES = new Set(['tv', 'vod', 'own', 'radio', 'podcast']);
let heroTimer = null;

/** Egy sor adatai: cím, „összes” hivatkozás, kártyák. */
function sections(box) {
  return [...box.querySelectorAll(':scope > .row, :scope > .row-group > .row')]
    .map((el, i) => {
      const t = el.querySelector('.row-title');
      // (a cím a hivatkozás saját szövege – a darabszám és a nyíl külön elemben van)
      const title = (t?.querySelector('.rt-text')?.textContent || '').trim() || [...((t?.querySelector('a') || t)?.childNodes || [])].filter((n) => n.nodeType === 3).map((n) => n.textContent).join(' ').replace(/\s+/g, ' ').trim();
      const cards = [...el.querySelectorAll(`.row-track > :is(${CARD})`)];
      cards.forEach((c) => (c.dataset.adaptRow = i));
      return { el, i, title, href: t?.querySelector('a')?.getAttribute('href') || '', cards };
    })
    .filter((s) => s.cards.length && s.title);
}

/** Egy kártya adatai (csatorna, film, rádióadó vagy csempe) – a kártyából olvasva. */
function info(card) {
  const ch = card.dataset.id ? catalog.byId.get(card.dataset.id) : null;
  const now = ch ? epg.now(ch.id) : null;
  const img = card.querySelector('img')?.getAttribute('src') || '';
  return {
    name: (card.querySelector('.name, b')?.textContent || '').trim(),
    sub: (card.querySelector('.sub, small')?.textContent || '').trim(),
    line: (card.querySelector('.pop-line')?.textContent || '').trim(),
    now: now?.cur ? `${now.cur.title}` : (card.querySelector('.pop-now')?.textContent || '').trim(),
    next: (card.querySelector('.pop-next')?.textContent || '').trim(),
    img,
    poster: card.classList.contains('vcard'),
    hue: card.querySelector('.thumb')?.style.getPropertyValue('--h') || card.style.getPropertyValue('--h') || hashHue(card.textContent || ''),
    progress: now?.cur ? now.progress : null,
  };
}
/** A kártya lejátszása / adatlapja – a kártya saját gombjával (a megszokott kezelők futnak). */
const playCard = (card) => (card.querySelector('[data-act="play"], [data-vact="play"], [data-ract="play"], [data-pact="play"], [data-pact="open"]') || card).click();
const infoCard = (card) => {
  const b = card.querySelector('[data-act="info"], [data-vact="info"], [data-ract="info"], [data-pact="info"], [data-pact="open"]');
  if (b) b.click();
  else card.click();
};
const thumbHtml = (x) => (x.img ? `<img class="${x.poster ? 'apost' : 'logo'}" src="${esc(x.img)}" alt="" loading="lazy" referrerpolicy="no-referrer" />` : `<span class="initials">${esc(x.name.slice(0, 2))}</span>`);
const btnsHtml = () => `<div class="hero-btns"><button class="btn white" data-ad="play">${ICON.play} ${_t('Lejátszás')}</button><button class="btn gray" data-ad="info">${ICON.info} ${_t('Részletek')}</button></div>`;
/** A rejtett tárolóba kerülő eredeti sorok (a kártyák a dokumentumban maradnak). */
function stash(box, secs) {
  const store = html('<div class="adapt-store" hidden></div>');
  box.append(store);
  for (const s of secs) store.append(s.el);
}

/** Az oldal igazítása (az útvonal kirajzolása után). */
export function adaptPage(view, name) {
  const id = currentLayout();
  if (id === 'classic' || !PAGES.has(name)) return;
  // (a Részletes / Gyűjtemény TV oldala eleve saját nézet)
  if (name === 'tv' && (id === 'detail' || id === 'unified')) return;
  const box = view.querySelector('.rows');
  if (!box) return;
  const secs = sections(box);
  if (!secs.length) return;
  // (a VOD és a Rádió böngészése néhány elrendezésben „áruházként”: a minta saját áruházának szerkezetével)
  const store = name !== 'tv' && { detail: storeFeatured, focus: storeSide, wall: storeCollections, desk: storeDesk }[id];
  box.classList.add('adapt', store ? 'adapt-store-' + id : 'adapt-' + id);
  if (store) return void store(view, box, secs);
  const fn = { cinema, showcase, shelf, library: null, tiles, detail, unified, wall: null, squares, ribbon, focus, desk: null }[id];
  fn?.(view, box, secs);
}

// ---------------------------------------------------------------------------
// Kiemelt borító (Mozi, Kirakat, Csempék): a sorok első kártyáiból
// ---------------------------------------------------------------------------
function heroOf(cards) {
  const multi = cards.length > 1;
  const el = html(`<section class="hero lay-hero adapt-hero ${multi ? 'carousel' : ''}">
    <div class="hero-slides">${cards
      .map((c, i) => {
        const x = info(c);
        return `<div class="hero-slide ${i ? '' : 'active'}" style="--h:${esc(x.hue)}" ${i ? 'aria-hidden="true"' : ''}>
          <div class="hero-bg ${x.poster ? 'is-poster' : ''}">${x.img ? `<img src="${esc(x.img)}" alt="" referrerpolicy="no-referrer" />` : ''}</div><div class="hero-shade"></div>
          <div class="hero-content"><h1>${esc(x.name)}</h1>${x.sub ? `<div class="hero-meta">${esc(x.sub)}</div>` : ''}
            ${x.now && x.now !== x.sub ? `<div class="hero-now"><span class="now-label">${_t('MOST')}</span> <b>${esc(x.now)}</b></div>` : x.line ? `<p class="hero-desc">${esc(x.line)}</p>` : ''}
            ${btnsHtml()}</div></div>`;
      })
      .join('')}</div>
    ${multi ? `<div class="hero-dots">${cards.map((_, i) => `<button class="dot ${i ? '' : 'active'}" data-dot="${i}" aria-label="${_t('{n}. kiemelt', { n: i + 1 })}" tabindex="-1"></button>`).join('')}</div>` : ''}
  </section>`);
  let cur = 0;
  const slides = [...el.querySelectorAll('.hero-slide')];
  const show = (i) => {
    cur = (i + cards.length) % cards.length;
    slides.forEach((s, n) => {
      s.classList.toggle('active', n === cur);
      if (n === cur) s.removeAttribute('aria-hidden');
      else s.setAttribute('aria-hidden', 'true');
    });
    el.querySelectorAll('.dot').forEach((d, n) => d.classList.toggle('active', n === cur));
  };
  el.addEventListener('click', (e) => {
    const a = e.target.closest('[data-ad]')?.dataset.ad;
    const dot = e.target.closest('[data-dot]');
    if (a === 'play') playCard(cards[cur]);
    else if (a === 'info') infoCard(cards[cur]);
    else if (dot) show(Number(dot.dataset.dot));
  });
  clearInterval(heroTimer);
  if (multi)
    heroTimer = setInterval(() => {
      if (!el.isConnected) return clearInterval(heroTimer);
      if (!el.matches(':hover') && !el.contains(document.activeElement)) show(cur + 1);
    }, 10000);
  return el;
}
const firstCards = (secs, n) => secs.map((s) => s.cards[0]).filter(Boolean).slice(0, n);
/** A kiemelt / átrendezett rész a fejléc (a sorok előtti fülsor, gombok) alá kerül. */
function putTop(box, el) {
  const first = box.querySelector(':scope > .row, :scope > .row-group, :scope > .adapt-store');
  if (first) first.before(el);
  else box.append(el);
}

function cinema(view, box, secs) {
  putTop(box, heroOf(firstCards(secs, 1)));
}
function showcase(view, box, secs) {
  const tiles = html(`<section class="app-row adapt-sections">${secs
    .slice(0, 12)
    .map((s) => `<button class="app-tile" data-go="${s.i}" style="--h:${hashHue(s.title + 'sec')}"><b>${esc(s.title)}</b><small>${_t('{n} elem', { n: s.cards.length })}</small></button>`)
    .join('')}</section>`);
  tiles.addEventListener('click', (e) => {
    const b = e.target.closest('[data-go]');
    if (b) secs.find((s) => s.i === Number(b.dataset.go))?.el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });
  putTop(box, tiles);
  tiles.before(heroOf(firstCards(secs, 6)));
}
function tiles(view, box, secs) {
  const t = html(`<section class="coll-tiles adapt-sections">${secs
    .slice(0, 12)
    .map((s) => `<button class="coll-tile" data-go="${s.i}" style="--h:${hashHue(s.title + 'coll')}"><b>${esc(s.title)}</b><small>${_t('{n} elem', { n: s.cards.length })}</small></button>`)
    .join('')}</section>`);
  t.addEventListener('click', (e) => {
    const b = e.target.closest('[data-go]');
    if (b) secs.find((s) => s.i === Number(b.dataset.go))?.el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });
  putTop(box, t);
  t.before(heroOf(firstCards(secs, 1)));
}

// ---------------------------------------------------------------------------
// Polc: a kijelölt kártya tölti ki a hátteret, felül az adatai
// ---------------------------------------------------------------------------
function shelf(view, box, secs) {
  const bg = html('<div class="adapt-shelf-bg" aria-hidden="true"><div class="asb-img"></div><div class="asb-shade"></div></div>');
  const infoEl = html('<section class="adapt-shelf-info" aria-live="polite"></section>');
  view.prepend(bg);
  putTop(box, infoEl);
  const sel = (card) => {
    const x = info(card);
    bg.style.setProperty('--h', x.hue);
    bg.querySelector('.asb-img').innerHTML = x.img ? `<img class="${x.poster ? 'apost' : ''}" src="${esc(x.img)}" alt="" referrerpolicy="no-referrer" />` : '';
    infoEl.innerHTML = `<h1>${esc(x.name)}</h1>${x.sub ? `<div class="hero-meta">${esc(x.sub)}</div>` : ''}${x.now && x.now !== x.sub ? `<div class="shelf-now"><b>${esc(x.now)}</b>${x.progress != null ? `<div class="bar"><i style="width:${(x.progress * 100).toFixed(1)}%"></i></div>` : ''}</div>` : ''}${x.next ? `<div class="muted">${esc(x.next)}</div>` : ''}`;
  };
  const pick = debounce((c) => c.isConnected && sel(c), 120);
  box.addEventListener('focusin', (e) => {
    const c = e.target.closest?.(CARD);
    if (c) pick(c);
  });
  box.addEventListener('mouseover', (e) => {
    const c = e.target.closest(CARD);
    if (c) pick(c);
  });
  sel(secs[0].cards[0]);
}

// ---------------------------------------------------------------------------
// Részletes: balra az összes elem soronként, jobbra a kiválasztott adatai
// ---------------------------------------------------------------------------
function detail(view, box, secs) {
  const all = secs.flatMap((s) => s.cards);
  const md = html(`<div class="md adapt-md">
    <aside class="md-list"><input class="input md-q" type="search" placeholder="${_t('Szűrés…')}" aria-label="${_t('Szűrés')}" /><div class="md-groups">${secs
      .map((s) => `<h4>${esc(s.title)}</h4>${s.cards.map((c) => {
        const x = info(c);
        return `<button class="md-item" data-ci="${all.indexOf(c)}">${thumbHtml(x)}<span><b>${esc(x.name)}</b><small>${esc(x.now || x.sub)}</small></span></button>`;
      }).join('')}`)
      .join('')}</div></aside>
    <section class="md-detail" aria-live="polite"></section></div>`);
  putTop(box, md);
  stash(box, secs);
  const detailEl = md.querySelector('.md-detail');
  let cur = -1;
  const show = (i, focus = false) => {
    const c = all[i];
    if (!c) return;
    cur = i;
    const x = info(c);
    md.querySelectorAll('.md-item').forEach((b) => b.classList.toggle('sel', Number(b.dataset.ci) === i));
    detailEl.innerHTML = `<button class="btn small md-back" data-md-back>${ICON.left} ${_t('Vissza a listához')}</button>
      <div class="md-head" style="--h:${esc(x.hue)}"><div class="md-bg ${x.poster ? 'is-poster' : ''}">${x.img ? `<img src="${esc(x.img)}" alt="" referrerpolicy="no-referrer" />` : ''}</div>
        <div class="md-title"><div><h1>${esc(x.name)}</h1>${x.sub ? `<div class="hero-meta">${esc(x.sub)}</div>` : ''}</div></div></div>
      ${btnsHtml()}
      <div class="md-facts">${x.now ? `<div><small>${_t('Most')}</small><b>${esc(x.now)}</b>${x.progress != null ? `<div class="bar"><i style="width:${(x.progress * 100).toFixed(1)}%"></i></div>` : ''}</div>` : ''}
        ${x.next ? `<div><small>${_t('Utána')}</small><b>${esc(x.next.replace(/^[^:]*:\s*/, ''))}</b></div>` : ''}
        ${x.line ? `<div><small>${_t('Adatok')}</small><b>${esc(x.line)}</b></div>` : ''}</div>`;
    if (focus) {
      md.classList.add('show-detail');
      detailEl.querySelector('[data-ad="play"]')?.focus({ preventScroll: true });
    }
  };
  const narrow = () => matchMedia('(max-width: 700px)').matches;
  md.querySelector('.md-groups').addEventListener('click', (e) => {
    const b = e.target.closest('.md-item');
    if (!b) return;
    const i = Number(b.dataset.ci);
    if (i === cur && !narrow()) return playCard(all[i]);
    show(i, narrow());
  });
  const pickFocus = debounce((i) => i !== cur && show(i), 180);
  md.querySelector('.md-groups').addEventListener('focusin', (e) => e.target.dataset?.ci && pickFocus(Number(e.target.dataset.ci)));
  detailEl.addEventListener('click', (e) => {
    const a = e.target.closest('[data-ad]')?.dataset.ad;
    if (a === 'play') playCard(all[cur]);
    else if (a === 'info') infoCard(all[cur]);
    else if (e.target.closest('[data-md-back]')) md.classList.remove('show-detail');
  });
  md.querySelector('.md-q').addEventListener('input', debounce((e) => {
    const q = e.target.value.trim().toLowerCase();
    md.querySelectorAll('.md-item').forEach((b) => (b.hidden = !!q && !b.textContent.toLowerCase().includes(q)));
  }, 150));
  show(0);
}

// ---------------------------------------------------------------------------
// Gyűjtemény: szűrők (melyik sorok, keresés) + egy közös rács vagy lista
// ---------------------------------------------------------------------------
function unified(view, box, secs) {
  const ui = html(`<div class="uni adapt-uni">
    <aside class="uni-side"><details class="uni-filters" ${matchMedia('(max-width: 700px)').matches ? '' : 'open'}><summary>${_t('Szűrők')}</summary>
      <h4>${_t('Csoportok')}</h4>${secs.map((s) => `<label class="uni-check"><input type="checkbox" data-u-sec="${s.i}" checked /> <span>${esc(s.title)} <small class="muted">${s.cards.length}</small></span></label>`).join('')}
    </details></aside>
    <section class="uni-main"><div class="uni-bar"><input class="input uni-q" type="search" placeholder="${_t('Keresés…')}" aria-label="${_t('Keresés')}" />
      <div class="seg" role="group" aria-label="${_t('Nézet')}"><button class="btn small on" data-u-view="grid">${_t('Rács')}</button><button class="btn small" data-u-view="list">${_t('Lista')}</button></div>
      <span class="muted uni-count"></span></div><div class="grid adapt-grid"></div></section></div>`);
  const grid = ui.querySelector('.adapt-grid');
  // (az azonos elem több sorban is szerepelhet: egyszer jelenik meg, az első sorával)
  const seen = new Set();
  for (const s of secs)
    for (const c of s.cards) {
      const k = c.dataset.id || c.dataset.vid || c.dataset.rid || c.getAttribute('href') || c.textContent;
      if (seen.has(k)) continue;
      seen.add(k);
      grid.append(c);
    }
  putTop(box, ui);
  stash(box, secs);
  const on = new Set(secs.map((s) => String(s.i)));
  const draw = () => {
    const q = ui.querySelector('.uni-q').value.trim().toLowerCase();
    let n = 0;
    for (const c of grid.children) {
      const show = on.has(c.dataset.adaptRow) && (!q || c.textContent.toLowerCase().includes(q));
      c.hidden = !show;
      n += show;
    }
    ui.querySelector('.uni-count').textContent = _t('{n} elem', { n });
  };
  ui.addEventListener('change', (e) => {
    const s = e.target.dataset.uSec;
    if (s === undefined) return;
    if (e.target.checked) on.add(s);
    else on.delete(s);
    draw();
  });
  ui.addEventListener('click', (e) => {
    const v = e.target.closest('[data-u-view]');
    if (!v) return;
    ui.querySelectorAll('[data-u-view]').forEach((b) => b.classList.toggle('on', b === v));
    grid.classList.toggle('adapt-list', v.dataset.uView === 'list');
  });
  ui.querySelector('.uni-q').addEventListener('input', debounce(draw, 150));
  draw();
}

// ---------------------------------------------------------------------------
// Négyzetek: egyszerre egy sor nagy négyzetekben, alul kerek gombokkal a sorok között
// ---------------------------------------------------------------------------
function squares(view, box, secs) {
  const btns = html(`<nav class="sq-btns adapt-sq-btns" aria-label="${_t('Csoportok')}">${secs
    .map((s, n) => `<button class="sq-btn ${n ? '' : 'on'}" data-sq="${n}" style="--h:${hashHue(s.title + 'sq')}"><span><b>${esc(s.title.slice(0, 1))}</b></span><small>${esc(s.title)}</small></button>`)
    .join('')}</nav>`);
  box.append(btns);
  const sel = (n) => {
    secs.forEach((s, i) => s.el.classList.toggle('adapt-on', i === n));
    btns.querySelectorAll('.sq-btn').forEach((b, i) => b.classList.toggle('on', i === n));
  };
  btns.addEventListener('click', (e) => {
    const b = e.target.closest('[data-sq]');
    if (b) sel(Number(b.dataset.sq));
  });
  sel(0);
}

// ---------------------------------------------------------------------------
// Menüszalag: vízszintesen a sorok, függőlegesen az elemeik
// ---------------------------------------------------------------------------
function ribbon(view, box, secs) {
  const el = html(`<section class="xmb adapt-xmb"><div class="xmb-bar" role="tablist">${secs
    .map((s, i) => `<button class="xmb-cat" role="tab" data-ci="${i}" aria-selected="false"><span class="xmb-letter">${esc(s.title.slice(0, 1))}</span><span>${esc(s.title)}</span></button>`)
    .join('')}</div><div class="xmb-items" role="list"></div><p class="xmb-hint muted small">${_t('← → részek · ↑ ↓ elemek · OK: megnyitás')}</p></section>`);
  putTop(box, el);
  stash(box, secs);
  const bar = el.querySelector('.xmb-bar');
  const list = el.querySelector('.xmb-items');
  let ci = 0;
  const idx = {};
  const items = () => secs[ci].cards;
  const mark = (ii, focus) => {
    idx[ci] = ii;
    list.querySelectorAll('.xmb-item').forEach((b, n) => b.classList.toggle('sel', n === ii));
    list.children[ii]?.scrollIntoView({ block: 'nearest' });
    if (focus) list.children[ii]?.focus({ preventScroll: true });
  };
  const draw = (focus = false) => {
    el.style.setProperty('--i', ci);
    bar.querySelectorAll('.xmb-cat').forEach((b, n) => {
      b.classList.toggle('sel', n === ci);
      b.setAttribute('aria-selected', n === ci);
    });
    list.innerHTML = items()
      .map((c, i) => {
        const x = info(c);
        return `<button class="xmb-item" role="listitem" data-ii="${i}"><span class="xmb-ico">${thumbHtml(x)}</span><span class="xmb-text"><b>${esc(x.name)}</b>${x.now || x.sub ? `<small>${esc(x.now || x.sub)}</small>` : ''}</span></button>`;
      })
      .join('');
    mark(Math.min(idx[ci] || 0, items().length - 1), focus);
  };
  bar.addEventListener('click', (e) => {
    const b = e.target.closest('.xmb-cat');
    if (!b) return;
    ci = Number(b.dataset.ci);
    draw();
  });
  list.addEventListener('click', (e) => {
    const b = e.target.closest('.xmb-item');
    if (b) playCard(items()[Number(b.dataset.ii)]);
  });
  el.addEventListener('keydown', (e) => {
    const onItem = e.target.closest?.('.xmb-item');
    const onCat = e.target.closest?.('.xmb-cat');
    if ((!onItem && !onCat) || e.altKey || e.ctrlKey || e.metaKey) return;
    let ok = true;
    const cur = idx[ci] || 0;
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      const n = ci + (e.key === 'ArrowLeft' ? -1 : 1);
      if (n < 0 || n >= secs.length) ok = false;
      else {
        ci = n;
        draw(!onCat);
        if (onCat) bar.children[ci].focus({ preventScroll: true });
      }
    } else if (e.key === 'ArrowDown') mark(onCat ? cur : Math.min(cur + 1, items().length - 1), true);
    else if (e.key === 'ArrowUp') {
      if (onCat) ok = false;
      else if (cur === 0) bar.children[ci].focus({ preventScroll: true });
      else mark(cur - 1, true);
    } else if (e.key === 'Enter' && onItem) playCard(items()[Number(onItem.dataset.ii)]);
    else if ((e.key === 'i' || e.key === 'I') && onItem) infoCard(items()[Number(onItem.dataset.ii)]);
    else ok = false;
    if (ok) {
      e.preventDefault();
      e.stopPropagation();
    }
  });
  draw();
}

// ---------------------------------------------------------------------------
// Fókusz: felül a sorok mint funkciógombok, alattuk a választott sor csempéi, a kijelölt adatai
// ---------------------------------------------------------------------------
function focus(view, box, secs) {
  const el = html(`<section class="fx adapt-fx"><div class="fx-bg"></div><div class="fx-shade"></div>
    <nav class="fx-fn">${secs.map((s, i) => `<button class="fx-fn-btn ${i ? '' : 'on'}" data-fs="${i}"><span>${esc(s.title)}</span></button>`).join('')}</nav>
    <div class="fx-row"></div><div class="fx-info" aria-live="polite"></div></section>`);
  putTop(box, el);
  stash(box, secs);
  const row = el.querySelector('.fx-row');
  const infoEl = el.querySelector('.fx-info');
  const bg = el.querySelector('.fx-bg');
  let si = 0;
  let cur = null;
  const sel = (c) => {
    if (!c || c === cur) return;
    cur = c;
    const x = info(c);
    el.style.setProperty('--h', x.hue);
    bg.innerHTML = x.img && x.poster ? `<img src="${esc(x.img)}" alt="" referrerpolicy="no-referrer" />` : '';
    row.querySelectorAll('.fx-tile').forEach((b) => b.classList.toggle('sel', secs[si].cards[Number(b.dataset.ti)] === c));
    infoEl.innerHTML = `<h1>${esc(x.name)}</h1>${x.sub ? `<div class="hero-meta">${esc(x.sub)}</div>` : ''}${x.now && x.now !== x.sub ? `<div class="hero-now"><b>${esc(x.now)}</b></div>` : ''}${x.line ? `<p class="hero-desc">${esc(x.line)}</p>` : ''}${btnsHtml()}`;
  };
  const drawRow = () => {
    el.querySelectorAll('.fx-fn-btn').forEach((b, i) => b.classList.toggle('on', i === si));
    row.innerHTML = secs[si].cards
      .slice(0, 30)
      .map((c, i) => {
        const x = info(c);
        return `<button class="fx-tile ${x.poster ? 'is-poster' : ''}" data-ti="${i}" style="--h:${esc(x.hue)}" title="${esc(x.name)}">${thumbHtml(x)}</button>`;
      })
      .join('');
    cur = null;
    sel(secs[si].cards[0]);
  };
  el.addEventListener('click', (e) => {
    const f = e.target.closest('[data-fs]');
    const t = e.target.closest('.fx-tile');
    const a = e.target.closest('[data-ad]')?.dataset.ad;
    if (f) {
      si = Number(f.dataset.fs);
      drawRow();
    } else if (t) playCard(secs[si].cards[Number(t.dataset.ti)]);
    else if (a === 'play' && cur) playCard(cur);
    else if (a === 'info' && cur) infoCard(cur);
  });
  const pick = debounce((i) => sel(secs[si].cards[i]), 120);
  row.addEventListener('focusin', (e) => e.target.dataset?.ti && pick(Number(e.target.dataset.ti)));
  row.addEventListener('mouseover', (e) => {
    const t = e.target.closest('.fx-tile');
    if (t) pick(Number(t.dataset.ti));
  });
  drawRow();
}

// ===========================================================================
// Áruház-nézetek (VOD, Rádió)
// ===========================================================================
/** A sorok kártyáinak képei (kollázshoz, bélyegképekhez). */
const imgsOf = (cards, n) => cards.map((c) => info(c).img).filter(Boolean).slice(0, n);
/** A csoportok (sorok) címkéi: kattintásra a sorhoz görget. */
function tagsEl(secs, title) {
  const el = html(`<section class="st-tags"><h2 class="row-title">${esc(title)}</h2><div class="st-tag-list">${secs
    .map((s) => `<button class="st-tag" data-go="${s.i}">${esc(s.title)} <small>${s.cards.length}</small></button>`)
    .join('')}</div></section>`);
  el.addEventListener('click', (e) => {
    const b = e.target.closest('[data-go]');
    if (b) secs.find((s) => s.i === Number(b.dataset.go))?.el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
  return el;
}

/** Részletes – kiemelt sáv: nagy kép balra, bélyegképek, jobbra az adatok; alatta címkék, a sorok rácsban. */
function storeFeatured(view, box, secs) {
  const feat = [...new Set(secs.flatMap((s) => s.cards.slice(0, 3)))].slice(0, 8);
  const el = html(`<section class="st-feat"><h2 class="row-title">${_t('Kiemelt és ajánlott')}</h2>
    <div class="st-box"><div class="st-main"></div><div class="st-side"></div></div>
    <div class="st-dots">${feat.map((_, i) => `<button class="st-dot ${i ? '' : 'on'}" data-sf="${i}" aria-label="${_t('{n}. kiemelt', { n: i + 1 })}"></button>`).join('')}</div></section>`);
  putTop(box, el);
  el.after(tagsEl(secs, _t('Böngészés csoport szerint')));
  let cur = 0;
  const show = (i) => {
    cur = (i + feat.length) % feat.length;
    const x = info(feat[cur]);
    el.querySelector('.st-main').innerHTML = `<div class="st-img ${x.poster ? 'is-poster' : ''}" style="--h:${esc(x.hue)}">${x.img ? `<img src="${esc(x.img)}" alt="" referrerpolicy="no-referrer" />` : `<span class="initials">${esc(x.name.slice(0, 2))}</span>`}</div>`;
    el.querySelector('.st-side').innerHTML = `<h3>${esc(x.name)}</h3>${x.sub ? `<div class="muted">${esc(x.sub)}</div>` : ''}${x.now && x.now !== x.sub ? `<p><b>${esc(x.now)}</b></p>` : ''}${x.line && x.line !== x.sub ? `<p class="muted small">${esc(x.line)}</p>` : ''}
      <div class="st-thumbs">${imgsOf(feat.slice(0, 4), 4).map((src) => `<img src="${esc(src)}" alt="" loading="lazy" referrerpolicy="no-referrer" />`).join('')}</div>${btnsHtml()}`;
    el.querySelectorAll('.st-dot').forEach((d, n) => d.classList.toggle('on', n === cur));
  };
  el.addEventListener('click', (e) => {
    const a = e.target.closest('[data-ad]')?.dataset.ad;
    const d = e.target.closest('[data-sf]');
    if (a === 'play') playCard(feat[cur]);
    else if (a === 'info') infoCard(feat[cur]);
    else if (d) show(Number(d.dataset.sf));
    else if (e.target.closest('.st-main')) playCard(feat[cur]);
  });
  clearInterval(heroTimer);
  heroTimer = setInterval(() => {
    if (!el.isConnected) return clearInterval(heroTimer);
    if (!el.matches(':hover') && !el.contains(document.activeElement)) show(cur + 1);
  }, 7000);
  show(0);
}

/** Fókusz – bal oldalt a csoportok listája, jobbra a választott csoport nagy rácsban. */
function storeSide(view, box, secs) {
  const nav = html(`<nav class="pst-nav" aria-label="${_t('Csoportok')}">${secs.map((s, n) => `<button class="pst-cat ${n ? '' : 'on'}" data-pc="${n}">${esc(s.title)}<small>${s.cards.length}</small></button>`).join('')}</nav>`);
  const main = html('<div class="pst-main"></div>');
  const wrap = html('<div class="pst"></div>');
  wrap.append(nav, main);
  putTop(box, wrap);
  for (const s of secs) main.append(s.el);
  const sel = (n) => {
    secs.forEach((s, i) => s.el.classList.toggle('adapt-on', i === n));
    nav.querySelectorAll('.pst-cat').forEach((b, i) => b.classList.toggle('on', i === n));
  };
  nav.addEventListener('click', (e) => {
    const b = e.target.closest('[data-pc]');
    if (b) sel(Number(b.dataset.pc));
  });
  nav.addEventListener('focusin', (e) => e.target.dataset?.pc && sel(Number(e.target.dataset.pc)));
  sel(0);
}

/** Csempefal – gyűjtemény-csempék (kollázzsal); kattintásra a gyűjtemény kinyílik rácsként. */
function storeCollections(view, box, secs) {
  const el = html(`<section class="xc-colls"><h2 class="row-title">${_t('Gyűjtemények')}</h2><div class="xc-grid">${secs
    .map((s) => {
      const imgs = imgsOf(s.cards, 4);
      return `<button class="xc-tile" data-xc="${s.i}" style="--h:${hashHue(s.title + 'xc')}"><span class="xc-cover">${[...imgs, '', '', '', ''].slice(0, 4).map((src) => (src ? `<img src="${esc(src)}" alt="" loading="lazy" referrerpolicy="no-referrer" />` : '<i></i>')).join('')}</span><b>${esc(s.title)}</b><small>${_t('{n} elem', { n: s.cards.length })}</small></button>`;
    })
    .join('')}</div></section>`);
  putTop(box, el);
  el.addEventListener('click', (e) => {
    const b = e.target.closest('[data-xc]');
    if (!b) return;
    const s = secs.find((x) => x.i === Number(b.dataset.xc));
    secs.forEach((x) => x.el.classList.toggle('adapt-open', x === s));
    s?.el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
}

/** Asztal – lapozó kiemelt sáv, alatta a csoportok csemperácsként. */
function storeDesk(view, box, secs) {
  putTop(box, heroOf(firstCards(secs, 5)));
  box.classList.add('adapt-desk');
}
