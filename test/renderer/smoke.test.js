// Füstpróba: minden oldal megnyílik, kivétel / kezeletlen hiba nélkül
import { test, assert, sleep } from './harness.js';

const ROUTES = ['home', 'tv', 'guide', 'browse', 'countries', 'favorites', 'search?q=hír', 'vod', 'own', 'recordings', 'recordings?kind=radio', 'stats', 'sport', 'radio', 'settings', 'help', 'help?topic=data-locations', 'nincs-ilyen-oldal'];

test('minden oldal hiba nélkül megnyílik', async () => {
  const errors = [];
  const onErr = (e) => errors.push(`${location.hash}: ${e.message || e.reason?.message || e.reason}`);
  window.addEventListener('error', onErr);
  window.addEventListener('unhandledrejection', onErr);
  try {
    for (const r of ROUTES) {
      location.hash = '#/' + r;
      await sleep(1200);
      const view = document.querySelector('#view');
      assert.ok(view && view.childElementCount > 0, `üres oldal: ${r}`);
    }
    location.hash = '#/home';
    await sleep(500);
  } finally {
    window.removeEventListener('error', onErr);
    window.removeEventListener('unhandledrejection', onErr);
  }
  assert.deepEqual(errors, [], 'hibák');
});

test('a beállítások minden fejezete megnyílik', async () => {
  location.hash = '#/settings';
  await sleep(1500);
  const tabs = [...document.querySelectorAll('#view [data-sec], #view .settings-nav [data-section], #view .s-nav button, #view .s-nav a')];
  const errors = [];
  const onErr = (e) => errors.push(e.message || String(e.reason));
  window.addEventListener('error', onErr);
  window.addEventListener('unhandledrejection', onErr);
  try {
    for (const t of tabs) {
      t.click();
      await sleep(400);
    }
  } finally {
    window.removeEventListener('error', onErr);
    window.removeEventListener('unhandledrejection', onErr);
  }
  assert.deepEqual(errors, [], 'hibák');
  location.hash = '#/home';
});
