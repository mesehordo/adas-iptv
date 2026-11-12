// A telepített Flatpak-csomag ellenőrzése (a Flatpak munkafolyamat hívja): a futó Adás felületéhez a Chromium
// távoli hibakereső portján (CDP) csatlakozik, és megnézi, hogy Flatpakban a beépített frissítő ki van-e kapcsolva:
// - api.caps.update hamis,
// - a beállítások Frissítések része rejtve marad (a felület saját renderUpdate-je),
// - a frissítéskeresés a Flathubra utaló hibával áll meg.
// Használat: node tools/flatpak-verify.mjs [port=9222]   (Node 22+, vagy Node 20: --experimental-websocket)
const port = Number(process.argv[2]) || 9222;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

if (typeof WebSocket !== 'function') {
  console.error('Ehhez a Node-hoz kell a beépített WebSocket (Node 22+, vagy --experimental-websocket).');
  process.exit(2);
}

// (az Adás indulása a homokozóban eltart egy darabig – legfeljebb 60 mp-ig várjuk a felületet)
let page = null;
for (let i = 0; i < 60 && !page; i++) {
  try {
    const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
    page = list.find((t) => t.type === 'page' && /index\.html/.test(t.url));
  } catch {}
  if (!page) await sleep(1000);
}
if (!page) {
  console.error('A felület nem érhető el a hibakereső porton.');
  process.exit(1);
}

const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((ok, fail) => {
  ws.addEventListener('open', ok, { once: true });
  ws.addEventListener('error', () => fail(new Error('A hibakereső kapcsolat nem jött létre.')), { once: true });
});
let seq = 0;
// (időkorláttal: egy függőben maradó ígéret – pl. a frissítéskeresés – ne akassza meg a munkafolyamatot)
const call = (method, params, ms = 30000) =>
  new Promise((ok, fail) => {
    const id = ++seq;
    const timer = setTimeout(() => {
      ws.removeEventListener('message', on);
      fail(new Error(`${method}: nincs válasz ${ms / 1000} mp alatt.`));
    }, ms);
    const on = (ev) => {
      const m = JSON.parse(ev.data);
      if (m.id !== id) return;
      clearTimeout(timer);
      ws.removeEventListener('message', on);
      m.error ? fail(new Error(m.error.message)) : ok(m.result);
    };
    ws.addEventListener('message', on);
    ws.send(JSON.stringify({ id, method, params }));
  });

// (a felület modulja betöltődött-e már – az app.js után a dinamikus import ugyanazt a példányt adja)
const expression = `(async () => {
  for (let i = 0; i < 100 && !window.api; i++) await new Promise((r) => setTimeout(r, 100));
  const { renderUpdate } = await import('./js/update.js');
  const box = document.createElement('section');
  renderUpdate(box);
  let error = '';
  try {
    await window.api.updateCheck('mesehordo/adas-iptv');
  } catch (e) {
    error = String(e?.message || e);
  }
  return JSON.stringify({ capsUpdate: window.api?.caps?.update, sectionHidden: box.hidden, sectionEmpty: !box.innerHTML, error });
})()`;
let res;
try {
  res = await call('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
} catch {
  // (a hibaszöveg a csomagtól is jöhet – nem írjuk a naplóba; hibánál a munkafolyamat az Adás naplóját mutatja)
  console.error('Sikertelen: a felület nem válaszolt az ellenőrzésre (időtúllépés vagy hibakereső hiba).');
  ws.close();
  process.exit(1);
}
ws.close();
// (a csomagból jövő szöveget nem írjuk a naplóba – csak a feltételek eredményét; hibánál a munkafolyamat az Adás
// saját naplóját mutatja)
let r = {};
try {
  r = JSON.parse(res.result?.value) || {};
} catch {}
// (csak minden feltétel teljesülésekor sikeres – a felületi hiba vagy a hiányzó eredmény is bukás)
const checks = [
  ['a felület hiba nélkül válaszolt', !res.exceptionDetails],
  ['api.caps.update hamis', r.capsUpdate === false],
  ['a beállítások Frissítések része rejtve', r.sectionHidden === true && r.sectionEmpty === true],
  ['a frissítéskeresés a Flathubra utaló hibával áll meg', /Flathub/.test(String(r.error ?? ''))],
];
for (const [name, ok] of checks) console.log(`${ok ? '✓' : '✗'} ${name}`);
const passed = checks.every(([, ok]) => ok);
console.log(passed ? 'Rendben: Flatpakban a beépített frissítő ki van kapcsolva.' : 'Sikertelen.');
process.exitCode = passed ? 0 : 1;
