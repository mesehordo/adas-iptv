'use strict';
// A főfolyamat moduljainak tesztjei (node:test). Futtatás: npm test (tools/run-tests.mjs)
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const { spawnSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const tmpDirs = [];
const tmp = (p) => {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), `adas-${p}-`));
  tmpDirs.push(d);
  return d;
};
process.on('exit', () => tmpDirs.forEach((d) => fs.rmSync(d, { recursive: true, force: true, maxRetries: 5 })));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ------------------------------------------------------------------ fordítás
test('i18n-main: helyőrzők, angol tartalék, ismeretlen kulcs', () => {
  const i18n = require(path.join(ROOT, 'i18n-main'));
  i18n.setLang('hu');
  assert.equal(i18n._t('Szia {n}!', { n: 'Teszt' }), 'Szia Teszt!');
  i18n.setLang('en');
  assert.equal(i18n._t('Adás felvételek'), 'Adás recordings');
  assert.equal(i18n._t('nincs ilyen kulcs {x}', { x: 1 }), 'nincs ilyen kulcs 1');
  i18n.setLang('../../etc'); // érvénytelen nyelvkód: marad az előző
  assert.equal(i18n.getLang(), 'en');
  i18n.setLang('hu');
});

test('a fordítási szótárak érvényes JSON-objektumok, a helyőrzők egyeznek', () => {
  const ph = (s) => [...String(s).matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(',');
  for (const l of ['en', 'de', 'es', 'fr']) {
    const txt = fs.readFileSync(path.join(ROOT, 'src', 'i18n', `${l}.js`), 'utf8');
    const d = JSON.parse(txt.slice(txt.indexOf('{'), txt.lastIndexOf('}') + 1));
    for (const [k, v] of Object.entries(d)) if (v) assert.equal(ph(v), ph(k), `${l}: eltérő helyőrzők: ${k}`);
  }
});

// ------------------------------------------------------------------ hálózati szabályok
const lan = require(path.join(ROOT, 'lan'));

test('lan.isPrivateHost: helyi és nyilvános címek', () => {
  for (const h of ['localhost', 'a.localhost', 'nas.local', '127.0.0.1', '10.1.2.3', '192.168.0.10', '172.16.5.5', '169.254.1.1', '0.0.0.0', '[::1]', '::', '::ffff:192.168.1.1', 'fe80::1', 'fd00::1', '64:ff9b::a00:1']) assert.equal(lan.isPrivateHost(h), true, h);
  for (const h of ['example.com', '8.8.8.8', '172.32.0.1', '2001:4860:4860::8888', '::ffff:8.8.8.8']) assert.equal(lan.isPrivateHost(h), false, h);
});

test('lan.redirectStep: titkos fejléc más szerverre nem megy, https → http tiltott, 303 → GET', () => {
  const first = new URL('https://api.example.com/a');
  const r = lan.redirectStep(first, first.href, 302, 'https://cdn.other.com/b', { method: 'GET', headers: { 'Api-Key': 'k', Accept: 'x' } }, true);
  assert.equal(r.url, 'https://cdn.other.com/b');
  assert.equal(r.opts.headers['Api-Key'], undefined);
  assert.equal(r.opts.headers.Accept, 'x');
  assert.throws(() => lan.redirectStep(first, first.href, 302, 'http://api.example.com/b', { method: 'GET', headers: {} }, true));
  const s = lan.redirectStep(first, first.href, 303, '/c', { method: 'POST', headers: {}, body: 'x' }, false);
  assert.equal(s.opts.method, 'GET');
  assert.equal(s.opts.body, undefined);
  assert.throws(() => lan.redirectStep(first, first.href, 302, 'file:///etc/passwd', { method: 'GET', headers: {} }, false));
});

test('lan.fetchPolicy: internetes forrás nem hivatkozhat helyi címre', async () => {
  await assert.rejects(lan.fetchPolicy('http://127.0.0.1:1/x', {}, 'https://example.com/list.m3u'));
  await assert.rejects(lan.fetchPolicy('ftp://example.com/x', {}, 'ftp://example.com/x'));
});

test('lan.hasSecretHeader', () => {
  assert.equal(lan.hasSecretHeader({ 'Api-Key': 'x' }), true);
  assert.equal(lan.hasSecretHeader({ Authorization: 'Bearer x' }), true);
  assert.equal(lan.hasSecretHeader({ Accept: '*/*' }), false);
});

// ------------------------------------------------------------------ DLNA (H14 / H29)
test('DLNA: időformátum oda-vissza', () => {
  const { toHms, fromHms } = lan._test;
  assert.equal(toHms(3661.8), '1:01:01');
  assert.equal(toHms(-5), '0:00:00');
  assert.equal(fromHms('1:01:01'), 3661);
  assert.equal(fromHms('0:00:09.500'), 9);
  assert.ok(Number.isNaN(fromHms('NOT_IMPLEMENTED')));
  assert.ok(Number.isNaN(fromHms('')));
});

test('DLNA: tekerés REL_TIME-mal, pozíció / hossz, FINISHED, munkamenet-sorszám', { timeout: 30000 }, async (t) => {
  const calls = [];
  let state = 'PLAYING';
  let rel = '0:01:30';
  const srv = http.createServer((req, res) => {
    let b = '';
    req.on('data', (d) => (b += d));
    req.on('end', () => {
      const action = /#(\w+)"/.exec(req.headers.soapaction || '')?.[1];
      calls.push({ action, body: b });
      let x = '';
      if (action === 'GetTransportInfo') x = `<CurrentTransportState>${state}</CurrentTransportState>`;
      if (action === 'GetPositionInfo') x = `<RelTime>${rel}</RelTime><TrackDuration>1:00:00</TrackDuration>`;
      res.end(`<s:Envelope><s:Body>${x}</s:Body></s:Envelope>`);
    });
  });
  await new Promise((r) => srv.listen(0, '127.0.0.1', r));
  const events = [];
  lan.init({ emit: (ch, d) => ch === 'cast-status' && events.push(d) });
  const dev = { id: 'dlna-test', kind: 'dlna', name: 'Teszt TV', host: '127.0.0.1', av: { control: `http://127.0.0.1:${srv.address().port}/ctl`, type: 'urn:schemas-upnp-org:service:AVTransport:1' } };
  lan._test.devices.set(dev.id, dev);
  t.after(() => {
    lan.castControl('disconnect');
    srv.close();
  });
  await lan.castPlay({ deviceId: dev.id, url: 'http://example.com/film.mp4', title: 'Film', live: false, gen: 7 });
  assert.ok(calls.some((c) => c.action === 'SetAVTransportURI'));
  assert.equal(events.at(-1).state, 'BUFFERING');
  assert.equal(events.at(-1).gen, 7);
  await lan.castControl('seek', 3661);
  const seek = calls.find((c) => c.action === 'Seek');
  assert.match(seek.body, /<Unit>REL_TIME<\/Unit>/);
  assert.match(seek.body, /<Target>1:01:01<\/Target>/);
  // a lekérdezés (3 mp-enként): pozíció és hossz
  for (let i = 0; i < 60 && !events.some((e) => e.state === 'PLAYING'); i++) await sleep(100);
  const p = events.find((e) => e.state === 'PLAYING');
  assert.equal(p.time, 90);
  assert.equal(p.duration, 3600);
  assert.equal(p.gen, 7);
  // a film vége: STOPPED a vég közelében → FINISHED
  rel = '0:59:55';
  for (let i = 0; i < 60 && !events.some((e) => e.time === 3595); i++) await sleep(100);
  state = 'STOPPED';
  for (let i = 0; i < 60 && !events.some((e) => e.idle === 'FINISHED'); i++) await sleep(100);
  assert.ok(events.some((e) => e.state === 'IDLE' && e.idle === 'FINISHED'));
});

// ------------------------------------------------------------------ borítótár (H37)
test('covers: a tár helyén lévő fájl nem akasztja meg az indulást (H37)', async () => {
  const covers = require(path.join(ROOT, 'covers'));
  const dir = tmp('cov');
  fs.writeFileSync(path.join(dir, 'covers'), 'nem mappa');
  let handler = null;
  assert.doesNotThrow(() => covers.install({ handle: (_s, h) => (handler = h) }, { fetch: async () => new Response('', { status: 404 }) }, dir));
  assert.equal(typeof handler, 'function');
  assert.equal((await covers.stats()).files, 0);
  await covers.clear();
  const r = await handler({ url: `${covers.SCHEME}://img/${Buffer.from('https://example.com/a.jpg').toString('base64url')}` });
  assert.equal(r.status, 404);
});

// ------------------------------------------------------------------ felvétel (H32 / H38)
// (az FFmpeg-folyamatok eseményei – hibánál a napló megmutatja, mi történt)
const procLog = [];
{
  const cp = require('child_process');
  const orig = cp.spawn;
  cp.spawn = (...a) => {
    const p = orig(...a);
    const t0 = Date.now();
    const tag = String(a[1]?.find?.((x) => /(\.ts|\/src\/[0-9a-f]+)$/.test(x)) || '').slice(-30);
    p.on('exit', (code, sig) => procLog.push(`+${Date.now() - t0}ms exit ${code} ${sig || ''} ${tag}`));
    p.on('close', (code) => procLog.push(`+${Date.now() - t0}ms close ${code} ${tag}`));
    p.stderr?.on('data', (b) => procLog.push('stderr: ' + String(b).slice(0, 200)));
    return p;
  };
}
const media = require(path.join(ROOT, 'media'));
const ffmpeg = (() => {
  try {
    return require('ffmpeg-static');
  } catch {
    return null;
  }
})();

test('felvétel: retry közbeni leállítás pontosan egy rec-ended (H38); egyidejű felvételek külön fájlba (H32)', { skip: !media.available() || !ffmpeg ? 'nincs FFmpeg' : false, timeout: 90000 }, async () => {
  const dir = tmp('rec');
  const src = path.join(dir, 'src.ts');
  const g = spawnSync(ffmpeg, ['-hide_banner', '-loglevel', 'error', '-f', 'lavfi', '-i', 'testsrc=duration=1:size=160x120:rate=10', '-f', 'lavfi', '-i', 'sine=duration=1', '-c:v', 'mpeg2video', '-c:a', 'mp2', '-shortest', '-f', 'mpegts', src]);
  assert.equal(g.status, 0, String(g.stderr));
  const ended = [];
  media.init({ emit: (ch, d) => ch === 'rec-ended' && ended.push(d) });
  const url = require('url').pathToFileURL(src).href;
  const out = path.join(dir, 'out');
  const [a, b] = await Promise.all([media.recStart({ url, dir: out, name: 'Teszt' }), media.recStart({ url, dir: out, name: 'Teszt' })]);
  assert.notEqual(a.file, b.file);
  // a rövid forrás véget ér → az FFmpeg kilép, a felvétel újrapróbálásra vár; ekkor állítjuk le
  await sleep(1500);
  assert.equal(media.recStop(a.id), true);
  assert.equal(media.recStop(b.id), true);
  // (a lezárás a futó FFmpeg leállása után jön – lassabb gépen akár a 4 mp-es kényszerleállításig; utána még várunk,
  // hogy egy esetleges második értesítés is kiderüljön)
  for (let i = 0; i < 150 && !(ended.some((e) => e.id === a.id) && ended.some((e) => e.id === b.id)); i++) await sleep(100);
  await sleep(4500);
  if (ended.length !== 2) console.log(`FFmpeg-napló:\n  ${procLog.join('\n  ')}\nrec-ended: ${JSON.stringify(ended)}`);
  assert.equal(ended.filter((e) => e.id === a.id).length, 1);
  assert.equal(ended.filter((e) => e.id === b.id).length, 1);
  // (ha az FFmpeg a környezetben összeomlik – egyes CI-gépeken SIGSEGV –, a fájl üres lehet; a lezárás akkor is egyszeri)
  if (!procLog.some((l) => /SIG(SEGV|ABRT|ILL|BUS)/.test(l))) assert.ok(ended.find((e) => e.id === a.id).size > 0);
  assert.equal(media.recStop(a.id), false);
});

// ------------------------------------------------------------------ távirányító és beállítás-átadás (helyi kiszolgáló)
test('távirányító: aláírt parancs (PIN és QR-kulcs), visszajátszás és hibás PIN elutasítva, korlátozás', async (t) => {
  const crypto = require('crypto');
  const cmds = [];
  lan.init({ emit: (ch, d) => ch === 'remote-cmd' && cmds.push(d) });
  const key = crypto.randomBytes(16).toString('hex');
  const { port } = await lan.rcStart('<html>vezérlő</html>', '1234', key);
  t.after(() => lan.rcStop());
  const base = `http://127.0.0.1:${port}`;
  const get = async (p) => {
    const r = await fetch(base + p);
    return { status: r.status, text: await r.text() };
  };
  assert.match((await get('/adas/remote')).text, /vezérlő/);
  const { n } = JSON.parse((await get('/adas/rchello')).text);
  assert.match(n, /^[0-9a-f]{24}$/);
  const sign = (secret, kind, ctr, tail) => `${ctr}.${kind}.${crypto.createHmac('sha256', secret).update(`${n}|${ctr}|${tail}`).digest('hex').slice(0, 32)}`;
  const tail = 'cmd?c=play&a=1';
  assert.equal((await get(`/adas/rc/${sign('1234', 'p', 1, tail)}/${tail}`)).status, 200);
  assert.deepEqual(cmds, [{ c: 'play', a: '1' }]);
  assert.equal((await get(`/adas/rc/${sign('1234', 'p', 1, tail)}/${tail}`)).status, 403, 'visszajátszott számláló');
  assert.equal((await get(`/adas/rc/${sign('0000', 'p', 2, tail)}/${tail}`)).status, 403, 'hibás PIN');
  assert.equal((await get(`/adas/rc/${sign(key, 'k', 3, 'state')}/state`)).status, 200, 'QR-kulcs');
  // más útvonalra szóló aláírás nem használható
  assert.equal((await get(`/adas/rc/${sign('1234', 'p', 4, 'state')}/${tail}`)).status, 403);
  assert.equal(cmds.length, 1);
  // 20 hibás próbálkozás után ez a cím ki van zárva (a helyes aláírás is)
  for (let i = 0; i < 20; i++) await get(`/adas/rc/${sign('9999', 'p', 100 + i, tail)}/${tail}`);
  assert.equal((await get(`/adas/rc/${sign('1234', 'p', 200, tail)}/${tail}`)).status, 429);
  lan.rcStop();
  assert.equal((await get('/adas/rchello')).status, 403);
});

test('beállítás-átadás: helyes kóddal kiadja, 10 hibás kód után leáll; ismeretlen útvonal 404', async () => {
  const locked = [];
  lan.init({ emit: (ch, d) => ch === 'share-locked' && locked.push(d) });
  const id = require('crypto').randomBytes(16).toString('hex');
  const { port } = await lan.shareStart({ titkos: 'adat' }, 15, id);
  const base = `http://127.0.0.1:${port}`;
  assert.deepEqual(await (await fetch(`${base}/adas/share/${id}`)).json(), { titkos: 'adat' });
  for (let i = 0; i < 10; i++) assert.equal((await fetch(`${base}/adas/share/rossz${i}`)).status, 404);
  assert.equal(locked.length, 1);
  assert.equal((await fetch(`${base}/adas/share/${id}`)).status, 404, 'a lezárt átadás már nem ad ki semmit');
  assert.equal((await fetch(`${base}/p/hibas-token?u=http://example.com/`)).status, 404);
  assert.equal((await fetch(`${base}/semmi`)).status, 404);
});
