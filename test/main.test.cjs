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
// (Linuxos CI-n a vendor/ffmpeg buildje – ADAS_FFMPEG –: az ffmpeg-static ottani buildje az MPEG-TS-t nem tudja olvasni)
const ffmpeg = (() => {
  if (process.env.ADAS_FFMPEG) return path.resolve(process.env.ADAS_FFMPEG);
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

test('továbbító (U08): a munkamenet a saját, induláskori fejléceivel megy – egy közben átállított fejléc nem keveredik bele', async (t) => {
  const seen = [];
  const srv = http.createServer((req, res) => {
    seen.push(req.headers['user-agent']);
    res.end('ok');
  });
  await new Promise((r) => srv.listen(0, '127.0.0.1', r));
  t.after(() => srv.close());
  const target = `http://127.0.0.1:${srv.address().port}/adas.ts`;
  let current = { ua: 'A-ügynök' };
  media.init({ headersFor: () => current });
  await media._test.ensureServer();
  const a = media._test.inputOf(target);
  current = { ua: 'B-ügynök' };
  const b = media._test.inputOf(target);
  assert.notEqual(a, b);
  for (const u of [a, b, a]) await (await fetch(u)).text();
  assert.deepEqual(seen, ['A-ügynök', 'B-ügynök', 'A-ügynök']);
});

test('vágás: megtartandó szakaszok a kivágások nélkül (rendezve, összevonva, a határokra vágva)', () => {
  const { keepRanges } = media;
  assert.deepEqual(keepRanges(0, 100, []).keep, [[0, 100]]);
  assert.deepEqual(keepRanges(0, 100, [{ start: 60, end: 70 }, { start: 20, end: 30 }]).keep, [[0, 20], [30, 60], [70, 100]]);
  // átfedők egybe; a tartományon kívüli rész levágva; a túl rövid (< 0,2 mp) kivágás és maradék elhagyva
  assert.deepEqual(keepRanges(10, 100, [{ start: 20, end: 40 }, { start: 35, end: 50 }, { start: 0, end: 12 }, { start: 80, end: 80.1 }]).keep, [[12, 20], [50, 100]]);
  assert.deepEqual(keepRanges(0, 100, [{ start: 0, end: 100 }]).keep, []);
  assert.deepEqual(keepRanges(0, 100, [{ start: 'x' }, null]).keep, [[0, 100]]);
});

test('reklámkivágás: határok keresése (csend + fekete kép) és több rész kivágása újrakódolás nélkül', { skip: !media.available() || !ffmpeg ? 'nincs FFmpeg' : false, timeout: 90000 }, async (t) => {
  const dir = tmp('adcut');
  const file = path.join(dir, 'Műsor.ts');
  // 12 mp: 4–4,5 és 7–7,5 mp között fekete kép és csend (a „reklám” 4 és 7,5 között)
  const win = "between(t,4,4.5)+between(t,7,7.5)";
  const g = spawnSync(ffmpeg, ['-hide_banner', '-loglevel', 'error', '-f', 'lavfi', '-i', 'testsrc=duration=12:size=160x120:rate=10', '-f', 'lavfi', '-i', 'sine=duration=12',
    '-vf', `drawbox=c=black:t=fill:enable='${win}'`, '-af', `volume=enable='${win}':volume=0`, '-c:v', 'mpeg2video', '-g', '10', '-c:a', 'mp2', '-f', 'mpegts', file]);
  assert.equal(g.status, 0, String(g.stderr));
  const rd = spawnSync(ffmpeg, ['-hide_banner', '-loglevel', 'error', '-i', file, '-f', 'null', '-']);
  // (a johnvansickle-féle statikus Linux-build – így az ffmpeg-static is – a CI-gépen minden MPEG-TS olvasásakor
  // SIGSEGV-vel leáll, H.264 / AAC-nál is; ott nincs mit mérni)
  if (rd.signal === 'SIGSEGV' && process.platform === 'linux') return t.skip(`az FFmpeg ezen a gépen összeomlik a fájl olvasásakor (${rd.signal})`);
  assert.equal(rd.signal, null, 'az FFmpeg váratlanul leállt'); // (más jel – pl. SIGKILL – hiba, nem kihagyás)
  const d = await media.recDetect(file);
  assert.equal(d.video, true);
  assert.equal(d.silences.length, 2, JSON.stringify(d));
  assert.ok(Math.abs(d.silences[0][0] - 4) < 0.3 && Math.abs(d.silences[1][1] - 7.5) < 0.3, JSON.stringify(d.silences));
  assert.equal(d.blacks.length, 2, JSON.stringify(d.blacks));
  const r = await media.recTrim(file, 0, 12, [{ start: 4, end: 7.5 }]);
  assert.ok(r.ok && Math.abs(r.length - 8.5) < 1.1, JSON.stringify(r));
  // az eredeti félretéve, ideiglenes fájl nem marad; a vágott változat rövidebb
  assert.ok(fs.existsSync(media.originalOf(file)));
  assert.deepEqual(fs.readdirSync(path.dirname(media.originalOf(file))), ['Műsor.ts']);
  assert.deepEqual(fs.readdirSync(dir).sort(), ['.eredeti', 'Műsor.ts']);
  const info = media.parseInfo(String(spawnSync(ffmpeg, ['-hide_banner', '-i', file]).stderr));
  assert.ok(info.duration > 7.5 && info.duration < 10, String(info.duration));
  // minden kivágva → hiba, a felvétel érintetlen
  await assert.rejects(media.recTrim(file, 0, 12, [{ start: 0, end: 12 }]));
  assert.ok(fs.existsSync(file));
  // a keresés leállítható
  const p = media.recDetect(file);
  media.recDetectStop(file);
  await assert.rejects(p);
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

// ------------------------------------------------------------------ kivetítés: megszakítás csatlakozás közben (U11), egy lekérdezés egyszerre (U13)
test('kivetítés (U11): a csatlakozás közben leállított kérés nem indít médiát', async (t) => {
  const calls = [];
  const srv = http.createServer((req, res) => {
    req.resume();
    req.on('end', () => {
      calls.push(/#(\w+)"/.exec(req.headers.soapaction || '')?.[1]);
      res.end('<s:Envelope><s:Body><CurrentTransportState>STOPPED</CurrentTransportState></s:Body></s:Envelope>');
    });
  });
  await new Promise((r) => srv.listen(0, '127.0.0.1', r));
  t.after(() => srv.close());
  lan.init({ emit: () => {} });
  const dev = { id: 'dlna-u11', kind: 'dlna', name: 'TV', host: '127.0.0.1', av: { control: `http://127.0.0.1:${srv.address().port}/ctl`, type: 'urn:schemas-upnp-org:service:AVTransport:1' } };
  lan._test.devices.set(dev.id, dev);
  const p = lan.castPlay({ deviceId: dev.id, url: 'http://example.com/a.mp4', title: 'A', gen: 1 });
  lan.castControl('disconnect');
  const r = await p;
  assert.equal(r.superseded, true);
  await sleep(300);
  assert.ok(!calls.includes('SetAVTransportURI'), 'nem tölthetett be médiát: ' + calls.join(','));
});

test('DLNA (U13): egyszerre csak egy állapotlekérdezés fut – a lassú régi válasz nem írja vissza a pozíciót', async (t) => {
  let n = 0;
  const srv = http.createServer((req, res) => {
    let b = '';
    req.on('data', (d) => (b += d));
    req.on('end', async () => {
      const action = /#(\w+)"/.exec(req.headers.soapaction || '')?.[1];
      if (action === 'GetTransportInfo') return res.end('<CurrentTransportState>PLAYING</CurrentTransportState>');
      const i = ++n;
      if (i === 1) await sleep(400); // az első (régebbi) válasz késik
      res.end(`<RelTime>0:00:${i === 1 ? '10' : '20'}</RelTime><TrackDuration>1:00:00</TrackDuration>`);
    });
  });
  await new Promise((r) => srv.listen(0, '127.0.0.1', r));
  t.after(() => srv.close());
  const ev = [];
  lan.init({ emit: (ch, d) => ch === 'cast-status' && ev.push(d) });
  const s = new lan._test.DlnaSession({ id: 'dlna-u13', av: { control: `http://127.0.0.1:${srv.address().port}/ctl`, type: 'urn:x' } });
  await Promise.all([s.status(), s.status()]);
  assert.equal(n, 1, 'a második lekérdezés nem indulhatott el, amíg az első fut');
  await s.status();
  assert.deepEqual(ev.map((e) => e.time), [10, 20], 'a pozíció csak előre lépett: ' + JSON.stringify(ev));
});

test('webOS-szolgáltatás (V08): bájtos letöltés – a ZIP változatlan, az átviteli gzip kibontva, a hibakód hiba', async (t) => {
  const zlib = require('zlib');
  const lib = require(path.join(ROOT, 'webos/service/lib.js'));
  const zip = Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x1f, 0x8b, 0x00, 0xff, 0x10]);
  const srv = http.createServer((req, res) => {
    if (req.url === '/a.zip') return res.end(zip);
    if (req.url === '/gz.zip') {
      res.setHeader('Content-Encoding', 'gzip');
      return res.end(zlib.gzipSync(zip));
    }
    res.statusCode = 404;
    res.end('x');
  });
  await new Promise((r) => srv.listen(0, '127.0.0.1', r));
  t.after(() => srv.close());
  const base = `http://127.0.0.1:${srv.address().port}`;
  const get = (u) => new Promise((res, rej) => lib.downloadBytes(base + u, {}, (e, b) => (e ? rej(e) : res(b))));
  assert.deepEqual(await get('/a.zip'), zip);
  assert.deepEqual(await get('/gz.zip'), zip);
  await assert.rejects(get('/nincs'), /HTTP 404/);
});

// ------------------------------------------------------------------ frissítés: aláírt ellenőrző összegek
test('updater.sigOk: csak a kiadási kulccsal aláírt SHA256SUMS fogadható el', () => {
  const crypto = require('crypto');
  const { _test } = require(path.join(ROOT, 'updater'));
  const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');
  const other = crypto.generateKeyPairSync('ed25519');
  const sums = 'a'.repeat(64) + '  Adas-Setup-9.9.9.exe\n';
  const sig = crypto.sign(null, Buffer.from(sums), privateKey).toString('base64');
  _test.setPubKey(publicKey.export({ type: 'spki', format: 'pem' }));
  assert.equal(_test.sigOk(sums, sig), true);
  assert.equal(_test.sigOk(sums.replace('9.9.9', '6.6.6'), sig), false); // módosított lista
  assert.equal(_test.sigOk(sums, crypto.sign(null, Buffer.from(sums), other.privateKey).toString('base64')), false); // más kulcs
  assert.equal(_test.sigOk(sums, 'nem-alairas'), false);
  _test.setPubKey('');
});

// ------------------------------------------------------------------ lejátszási híd: a továbbító kulcsai korlátosak
test('media.inputOf: a továbbító kulcstáblája legfeljebb 4000, a használt kulcs megmarad', () => {
  const media = require(path.join(ROOT, 'media'));
  const { inputOf, srcCount } = media._test;
  const keep = inputOf('https://pelda.hu/lista.m3u8');
  for (let i = 0; i < 5000; i++) {
    inputOf(`https://pelda.hu/szegmens${i}.ts`);
    if (i % 500 === 0) assert.equal(inputOf('https://pelda.hu/lista.m3u8'), keep); // (a lista újratöltése: friss marad)
  }
  assert.ok(srcCount() <= 4000, `túl sok kulcs: ${srcCount()}`);
  assert.equal(inputOf('https://pelda.hu/lista.m3u8'), keep);
  assert.notEqual(inputOf('https://pelda.hu/szegmens0.ts').split('/').pop(), ''); // (a kiesett régi szegmens új kulcsot kap)
});

test('media.freeBytes: a szabad hely szám (lekérdezhetetlen helyen végtelen)', () => {
  const { freeBytes } = require(path.join(ROOT, 'media'))._test;
  assert.ok(freeBytes(os.tmpdir()) > 0);
  assert.equal(freeBytes(path.join(os.tmpdir(), 'nincs-ilyen-mappa-' + Date.now())), Infinity);
});

test('Mastodon-bejegyzés: angolul, a Flathub-adatok kiadási pontjaiból, legfeljebb 500 karakter; egyedi bejegyzés csak a docs/mastodon mappából', async () => {
  const { releaseNotes, compose, build, lenOf } = await import('../tools/mastodon-post.mjs');
  const xml = `<releases><release version="2.0.0" date="2026-01-01"><description><ul><li>One &amp; two</li>
    <li xml:lang="hu">Egy</li><li>Three</li></ul></description></release><release version="1.9.0"><description><ul><li>Old</li></ul></description></release></releases>`;
  assert.deepEqual(releaseNotes(xml, '2.0.0'), ['One & two', 'Three']);
  assert.equal(releaseNotes(xml, '2.0.1'), null);
  const t = compose('2.0.0', releaseNotes(xml, '2.0.0'));
  assert.match(t, /^Adás 2\.0\.0 is out!\n\n• One & two\n• Three\n/);
  assert.match(t, /releases\/tag\/v2\.0\.0/);
  assert.match(t, /#OpenSource/);
  // (túl hosszú pontok: a végéről maradnak el, a poszt belefér)
  const long = compose('2.0.0', Array.from({ length: 6 }, (_, i) => `${i} ` + 'x'.repeat(90)));
  assert.ok(lenOf(long) <= 500);
  assert.match(long, /• 0 /);
  assert.doesNotMatch(long, /• 5 /);
  // (a valódi adatok: az 1.34.0 kiadás és a bemutatkozó bejegyzés belefér; más mappából nem posztol)
  assert.ok(lenOf(build('1.34.0').status) <= 500);
  const intro = build('docs/mastodon/intro.txt');
  assert.ok(intro.status.startsWith('Meet Adás') && lenOf(intro.status) <= 500);
  assert.throws(() => build('README.md'), /docs\/mastodon/);
  assert.throws(() => build('docs/mastodon/../../README.md'), /docs\/mastodon/);
});
