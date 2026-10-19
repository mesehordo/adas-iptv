// Műsorújság-feldolgozó háttérszál (src/js/epg-worker.js): XMLTV → csatornánkénti műsorlista
import { test, assert } from './harness.js';

function parse(text, index, from = 0, to = Date.UTC(2100, 0, 1)) {
  const w = new Worker(new URL('../../src/js/epg-worker.js', import.meta.url));
  return new Promise((resolve, reject) => {
    const out = [];
    w.onmessage = (e) => {
      if (e.data.error) return reject(new Error(e.data.error));
      out.push(...e.data.chunk);
      if (e.data.done) {
        w.terminate();
        resolve({ map: new Map(out), count: e.data.count, nChannels: e.data.nChannels });
      }
    };
    w.onerror = (e) => reject(new Error(e.message));
    w.postMessage({ type: 'index', index });
    w.postMessage({ id: 1, text, from, to });
  });
}

const INDEX = { exact: new Map([['m1.hu', 'ch-m1']]), withCc: new Map(), nameCc: new Map(), nameOnly: new Map([['duna', 'ch-duna']]) };
const XML = `<?xml version="1.0" encoding="UTF-8"?>
<tv>
  <channel id="M1.hu"><display-name>M1</display-name></channel>
  <channel id='x-duna'><display-name>Duna</display-name></channel>
  <channel id="ismeretlen"><display-name>Senki</display-name></channel>
  <programme start="20261019060000 +0200" stop="20261019070000 +0200" channel="M1.hu">
    <title>Híradó &amp; időjárás</title><desc><![CDATA[<b>szó szerint</b> &amp;]]></desc><category>Hírek</category>
    <rating><value>12+</value></rating>
  </programme>
  <programme start="20261019070000 +0200" channel="M1.hu"><title>Stop nélkül</title></programme>
  <programme start="20261019070000 +0200" stop="20261019080000 +0200" channel="M1.hu"><title></title><sub-title>Alcím a párból</sub-title></programme>
  <programme start="20261019090000 +0200" stop="20261019090000 +0200" channel="M1.hu"><title>Nulla hosszú</title></programme>
  <programme start="20261019060000" stop="20261019063000" channel="x-duna"><title>UTC &#x151;&#9999999;</title></programme>
  <programme start="20261019060000 +0200" stop="20261019070000 +0200" channel="ismeretlen"><title>Nincs párja</title></programme>
  <programme start="20261019100000 +0200" channel="M1.hu"><title>Záratlan
</tv>`;

test('EPG: időzóna, entitások / CDATA, korhatár, hiányzó vég, azonos kezdés összevonása, párosítás', async () => {
  const { map } = await parse(XML, INDEX);
  const m1 = map.get('ch-m1');
  assert.ok(m1, 'M1 párosítva (pontos azonosító)');
  assert.ok(map.get('ch-duna'), 'Duna párosítva (név szerint)');
  assert.equal(map.size, 2, 'a párosítatlan csatorna kimarad');
  const [p0, p1] = m1;
  assert.equal(p0[0], Date.UTC(2026, 9, 19, 4, 0, 0));
  assert.equal(p0[2], 'Híradó & időjárás');
  assert.equal(p0[3], '<b>szó szerint</b> &amp;');
  assert.equal(p0[7], 12);
  // a két 07:00-s bejegyzés egy műsor: az érvényes vég és a hiányzó metaadatok is megmaradnak
  assert.equal(p1[2], 'Stop nélkül');
  assert.equal(p1[1], Date.UTC(2026, 9, 19, 6, 0, 0));
  assert.equal(p1[5], 'Alcím a párból');
  assert.ok(!m1.some((p) => p[2] === 'Nulla hosszú'), 'a nulla hosszú műsor kimarad');
  assert.equal(map.get('ch-duna')[0][0], Date.UTC(2026, 9, 19, 6, 0, 0), 'időzóna nélkül UTC');
  assert.equal(map.get('ch-duna')[0][2], 'UTC ő�', 'érvénytelen karakterhivatkozás helyén U+FFFD');
});

test('EPG: a helyőrző („No Data”) sorok kimaradnak – a csak helyőrzős csatorna nem kerül a listába', async () => {
  const xml = `<tv>
  <programme start="20261019130000 +0000" stop="20261019140000 +0000" channel="M1.hu"><title>No Data</title><desc>https://iptv-epg.org/help</desc></programme>
  <programme start="20261019140000 +0000" stop="20261019150000 +0000" channel="M1.hu"><title>Híradó</title></programme>
  <programme start="20261019130000 +0000" stop="20261019140000 +0000" channel="x-duna"><title>no data</title></programme>
  <programme start="20261019140000 +0000" stop="20261019150000 +0000" channel="x-duna"><title>Nincs adat</title></programme>
</tv>`;
  const { map, count } = await parse(xml, INDEX);
  assert.deepEqual(map.get('ch-m1').map((p) => p[2]), ['Híradó']);
  assert.ok(!map.has('ch-duna'));
  assert.equal(count, 1);
});

test('EPG: időablak – a tartományon kívüli műsor kimarad', async () => {
  const from = Date.UTC(2026, 9, 19, 4, 30);
  const to = Date.UTC(2026, 9, 19, 5, 30);
  const { map } = await parse(XML, INDEX, from, to);
  const titles = map.get('ch-m1').map((p) => p[2]);
  assert.deepEqual(titles, ['Híradó & időjárás', 'Stop nélkül']);
});

test('EPG: hibás / üres bemenet nem dob, a „__proto__” azonosító nem okoz gondot', async () => {
  const { map, count } = await parse('<tv><programme start="nem idő" channel="__proto__"><title>x</title></programme><programme', INDEX);
  assert.equal(map.size, 0);
  assert.equal(count, 0);
  assert.equal((await parse('', INDEX)).map.size, 0);
});
