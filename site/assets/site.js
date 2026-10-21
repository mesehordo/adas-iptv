// Adás weboldal: képernyőkép-fülek, a saját rendszer kiemelése, a legfrissebb kiadás letöltési címei
(() => {
  const REPO = 'mesehordo/adas-iptv';
  const lang = document.documentElement.lang === 'hu' ? 'hu' : 'en';

  // ---------------------------------------------------------------- képernyőkép-túra (fülek, nyilakkal is)
  const tabs = [...document.querySelectorAll('.tab')];
  const img = document.querySelector('#tour-img');
  const select = (t, focus = false) => {
    tabs.forEach((x) => {
      const on = x === t;
      x.setAttribute('aria-selected', String(on));
      x.tabIndex = on ? 0 : -1;
    });
    img.src = t.dataset.src;
    img.alt = t.dataset.alt;
    if (focus) t.focus();
  };
  tabs.forEach((t, i) => {
    t.addEventListener('click', () => select(t));
    t.addEventListener('keydown', (e) => {
      const d = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[e.key];
      if (!d) return;
      e.preventDefault();
      select(tabs[(i + d + tabs.length) % tabs.length], true);
    });
  });
  // (a képek előtöltése – a fülváltás azonnali)
  window.addEventListener('load', () => tabs.forEach((t) => (new Image().src = t.dataset.src)));

  // ---------------------------------------------------------------- megjelenés görgetéskor
  const els = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((list) => list.forEach((e) => e.isIntersecting && (e.target.classList.add('in'), io.unobserve(e.target))), { rootMargin: '0px 0px -8% 0px' });
    els.forEach((el) => io.observe(el));
  } else els.forEach((el) => el.classList.add('in'));

  // ---------------------------------------------------------------- a látogató rendszere
  const ua = navigator.userAgent;
  const os = /Android/i.test(ua) ? (/TV|AFT|BRAVIA|SMART-TV/i.test(ua) ? 'androidtv' : 'android') : /Windows/i.test(ua) ? 'win' : /Mac OS X|Macintosh/i.test(ua) ? 'mac' : /Linux|X11/i.test(ua) ? 'linux' : '';
  const mine = os && document.querySelector(`.dl[data-os~="${os}"]`);
  if (mine) {
    mine.classList.add('mine');
    const tag = document.createElement('span');
    tag.className = 'tag';
    tag.textContent = lang === 'hu' ? 'Ezen az eszközön' : 'Your device';
    mine.querySelector('header').append(tag);
  }

  // ---------------------------------------------------------------- legfrissebb kiadás (közvetlen letöltés)
  const size = (b) => (b >= 1e6 ? `${(b / 1048576).toFixed(0)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);
  fetch(`https://api.github.com/repos/${REPO}/releases/latest`, { headers: { Accept: 'application/vnd.github+json' } })
    .then((r) => (r.ok ? r.json() : Promise.reject(new Error(r.status))))
    .then((rel) => {
      const v = String(rel.tag_name || '').replace(/^v/, '');
      const date = rel.published_at ? new Date(rel.published_at).toLocaleDateString(lang === 'hu' ? 'hu-HU' : 'en-GB', { year: 'numeric', month: 'long', day: 'numeric' }) : '';
      document.querySelectorAll('[data-version]').forEach((el) => (el.textContent = v));
      document.querySelectorAll('[data-release-date]').forEach((el) => (el.textContent = date));
      document.querySelectorAll('.ver').forEach((el) => (el.hidden = !v));
      for (const a of document.querySelectorAll('a[data-asset]')) {
        const rx = new RegExp(a.dataset.asset, 'i');
        const asset = (rel.assets || []).find((x) => rx.test(x.name));
        if (!asset) continue;
        a.href = asset.browser_download_url;
        const s = a.querySelector('span');
        if (s) s.textContent = size(asset.size);
      }
    })
    .catch(() => {}); // (a gombok ilyenkor a kiadások oldalára mutatnak)
})();
