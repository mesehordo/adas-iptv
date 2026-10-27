// A felület logikájának tesztjei (a valódi alkalmazásablakban futnak – tools/run-tests.mjs)
import { test, assert, sleep } from './harness.js';
import { cmpVersion, isPrerelease } from '../../src/js/semver.js';
import { qrMatrix } from '../../src/js/qr.js';
import { parseM3U, nameKey } from '../../src/js/catalog.js';
import { parseSubs } from '../../src/js/subtitles.js';
import { bytesToText } from '../../src/js/unzip.js';
import { validateImport, sanitizeSettings, cleanProfile } from '../../src/js/store.js';
import { referencedDocKeys, dropUnreferenced } from '../../src/js/snapshot.js';
import { parsePack } from '../../src/js/packs.js';
import { esc } from '../../src/js/util.js';
import { api } from '../../src/js/api.js';
import { resolveStream, radioPlayer } from '../../src/js/radioplayer.js';
import { HELP_CATEGORIES, ARTICLES } from '../../src/js/help-content.js';
import { LAYOUTS, currentLayout, layoutPickerHtml, pickLayoutIn } from '../../src/js/layoutdefs.js';

// ------------------------------------------------------------------ alapfüggvények
test('semver: sorrend, előzetes kiadás', () => {
  assert.ok(cmpVersion('1.28.6', '1.28.5') > 0);
  assert.ok(cmpVersion('1.28.10', '1.28.9') > 0);
  assert.ok(cmpVersion('1.29.0-beta.1', '1.29.0') < 0);
  assert.ok(cmpVersion('1.29.0-beta.2', '1.29.0-beta.10') < 0);
  assert.equal(cmpVersion('v1.2.3', '1.2.3'), 0);
  assert.ok(isPrerelease('2.0.0-rc.1'));
  assert.ok(!isPrerelease('2.0.0'));
});

test('qr: négyzetes, determinisztikus mátrix; túl hosszú szöveg hibát ad', () => {
  const m = qrMatrix('http://192.168.1.10:47800/r/abcdef');
  assert.ok(m.size >= 21 && m.modules.length === m.size && m.modules.every((row) => row.length === m.size));
  assert.deepEqual(qrMatrix('http://192.168.1.10:47800/r/abcdef'), m);
  assert.throws(() => qrMatrix('x'.repeat(400)));
});

test('util.esc: HTML-escape', () => {
  assert.equal(esc('<a href="x">&\'</a>'), '&lt;a href=&quot;x&quot;&gt;&amp;&#39;&lt;/a&gt;');
});

// ------------------------------------------------------------------ listák
test('parseM3U: attribútumok, fejlécek (EXTVLCOPT és Kodi |), országelőtag, minőség', () => {
  const r = parseM3U(`#EXTM3U x-tvg-url="https://epg.example/a.xml"
#EXTINF:-1 tvg-id="M1.hu" tvg-logo="https://l/m1.png" group-title="Hírek",HU: M1 (1080p)
#EXTVLCOPT:http-user-agent=TesztUA
#EXTVLCOPT:http-referrer=https://ref.example/
https://s.example/m1.m3u8
#EXTINF:-1,Duna
https://s.example/duna.m3u8|User-Agent=Kodi%2F20&Referer=https%3A%2F%2Fr.example%2F
`);
  assert.equal(r.isStream, false);
  assert.equal(r.tvgUrl, 'https://epg.example/a.xml');
  assert.equal(r.entries.length, 2);
  const [m1, duna] = r.entries;
  assert.equal(m1.tvgId, 'M1.hu');
  assert.equal(m1.country, 'HU');
  assert.equal(m1.name, 'M1');
  assert.equal(m1.quality, '1080p');
  assert.equal(m1.group, 'Hírek');
  assert.equal(m1.ua, 'TesztUA');
  assert.equal(m1.referrer, 'https://ref.example/');
  assert.equal(duna.url, 'https://s.example/duna.m3u8');
  assert.equal(duna.ua, 'Kodi/20');
  assert.equal(duna.referrer, 'https://r.example/');
});

test('parseM3U: egy HLS-adás nem csatornalista', () => {
  assert.equal(parseM3U('#EXTM3U\n#EXT-X-VERSION:3\n#EXT-X-STREAM-INF:BANDWIDTH=1\na.m3u8').isStream, true);
});

test('nameKey: minőség- és zárójeles jelölések nélkül', () => {
  assert.equal(nameKey('RTL HD'), nameKey('RTL'));
  assert.equal(nameKey('TV2 (1080p) [Geo-blocked]'), nameKey('tv2'));
});

// ------------------------------------------------------------------ felirat
test('parseSubs: SRT és VTT időbélyegek, többsoros szöveg, BOM', () => {
  const srt = parseSubs('﻿1\r\n00:00:01,500 --> 00:00:03,000\r\nElső\r\nsor\r\n\r\n2\r\n01:02:03,004 --> 01:02:04,000\r\nMásodik\r\n');
  assert.equal(srt.length, 2);
  assert.equal(srt[0].start, 1.5);
  assert.equal(srt[0].end, 3);
  assert.match(srt[0].text, /Első\nsor/);
  assert.equal(srt[1].start, 3723.004);
  const vtt = parseSubs('WEBVTT\n\n00:05.000 --> 00:06.250 align:start\nHello');
  assert.equal(vtt.length, 1);
  assert.equal(vtt[0].start, 5);
  assert.equal(vtt[0].end, 6.25);
});

test('bytesToText: UTF-8 és Windows-1250 (ékezetek)', () => {
  assert.equal(bytesToText(new TextEncoder().encode('árvíztűrő')), 'árvíztűrő');
  // „őű” Windows-1250-ben: 0xF5 0xFB
  assert.equal(bytesToText(new Uint8Array([0xf5, 0xfb])), 'őű');
});

// ------------------------------------------------------------------ beállítások, profilok
test('validateImport: üres / sérült profillista hiba; profil nélküli beállítás-import kérésre engedett', () => {
  assert.throws(() => validateImport({ settings: {}, profiles: [] }));
  assert.throws(() => validateImport({ settings: {}, profiles: [{ name: 'x' }] }));
  assert.throws(() => validateImport({ profiles: [{ id: 'a' }] }));
  validateImport({ settings: {} }, { needProfiles: false });
  validateImport({ settings: {}, profiles: [{ id: 'a', name: 'A' }] });
});

test('sanitizeSettings: hibás típusok javítása', () => {
  const { settings: s, fixed } = sanitizeSettings({ customPlaylists: 'x', recSchedule: {}, kidsMarks: [], epgSources: [{ url: 'https://e/x.xml' }, { name: 'url nélkül' }, null] });
  assert.ok(Array.isArray(s.customPlaylists));
  assert.ok(!('recSchedule' in s) && !('kidsMarks' in s));
  assert.equal(s.epgSources.length, 1);
  assert.ok(fixed.includes('customPlaylists') && fixed.includes('epgSources[]'));
  assert.deepEqual(sanitizeSettings('nem objektum').settings, {});
});

test('cleanProfile: hibás profilkép-adat és avatar eldobva, név levágva', () => {
  const p = cleanProfile({ id: 'a', name: 'x'.repeat(100), avatar: 'gonosz', avatarData: 'javascript:alert(1)', kids: 'igen' });
  assert.equal(p.name.length, 40);
  assert.equal(p.avatar, null);
  assert.equal(p.avatarData, '');
  assert.equal(p.kids, true);
});

// ------------------------------------------------------------------ mentési pontok (H24 / H39)
test('dropUnreferenced: a megtartandó (v1 mentési pont) dokumentum megmarad, a többi törlődik', async () => {
  if (!api.docSet) return;
  const oldS = { vodCustom: [{ name: 'Régi', textKey: 'vodtext:tesztregi' }, { name: 'Védett', textKey: 'vodtext:tesztvedett' }] };
  const newS = { vodCustom: [] };
  assert.deepEqual(referencedDocKeys(oldS).map((r) => r.key), ['vodtext:tesztregi', 'vodtext:tesztvedett']);
  await api.docSet('vodtext:tesztregi', 'a');
  await api.docSet('vodtext:tesztvedett', 'b');
  await dropUnreferenced(oldS, newS, ['vodtext:tesztvedett']);
  assert.equal((await api.docGet('vodtext:tesztregi')) ?? null, null);
  assert.equal(await api.docGet('vodtext:tesztvedett'), 'b');
  await api.docSet('vodtext:tesztvedett', null);
});

test('parsePack: hibás JSON → hibaüzenet', () => {
  assert.ok(parsePack('{nem json').error);
});

// ------------------------------------------------------------------ rádió (H11 / H12)
test('resolveStream: a védett lejátszólista a lista fejléceivel kérődik le (H11)', async () => {
  const seen = [];
  const io = {
    request: async (o) => (seen.push(o), { status: 200, text: '[playlist]\nFile1=https://stream.example/live.mp3\n' }),
    fetchText: async () => {
      throw new Error('fejléc nélkül 403');
    },
  };
  const url = await resolveStream('https://radio.example/listen.pls', { ua: 'RadioUA', referrer: 'https://radio.example/' }, io);
  assert.equal(url, 'https://stream.example/live.mp3');
  assert.equal(seen[0].headers['User-Agent'], 'RadioUA');
  assert.equal(seen[0].headers.Referer, 'https://radio.example/');
  // fejlécek nélkül a gyorsítótáras lekérés; hibánál az eredeti cím marad
  assert.equal(await resolveStream('https://radio.example/listen.pls', null, io), 'https://radio.example/listen.pls');
  // a fejlécekkel elutasító lekérés után a sima lekérés is próba; ha az sem megy, az eredeti cím marad
  assert.equal(await resolveStream('https://radio.example/listen.pls', { ua: 'x' }, { request: async () => ({ status: 403, text: '' }), fetchText: async () => ({ text: 'File1=https://c.example/x.aac' }) }), 'https://c.example/x.aac');
  assert.equal(await resolveStream('https://radio.example/listen.pls', { ua: 'x' }, { request: async () => ({ status: 403, text: '' }), fetchText: io.fetchText }), 'https://radio.example/listen.pls');
  // nem lejátszólista: változatlan
  assert.equal(await resolveStream('https://radio.example/live.mp3', null, io), 'https://radio.example/live.mp3');
});

test('rádió-újracsatlakozás: az ismételten megszakadó első cím után a második jön (H12)', async () => {
  const rp = radioPlayer;
  const saved = { start: rp.start, startMeta: rp.startMeta, mediaSession: rp.mediaSession };
  const tried = [];
  rp.start = async (url) => (tried.push(url), true);
  rp.startMeta = () => {};
  rp.mediaSession = () => {};
  const st = { id: 'teszt-adó', name: 'Teszt adó', url: 'https://a.example/bad.mp3', urls: ['https://a.example/bad.mp3', 'https://b.example/good.mp3'], tags: [], country: 'HU' };
  try {
    await rp.play(st);
    assert.equal(rp.rawUrl, st.urls[0]);
    rp.streamLost(); // 1. megszakadás: ugyanaz a cím újra
    await sleep(50);
    assert.equal(tried.at(-1), st.urls[0]);
    rp.streamLost(); // 2. megszakadás ugyanazon a címen: a következő
    await sleep(50);
    assert.equal(tried.at(-1), st.urls[1]);
    assert.equal(rp.rawUrl, st.urls[1]);
    // a második címen történt megszakadás: az újracsatlakozás azzal kezdődik (nem a korábban hibás elsővel)
    rp.streamLost();
    await sleep(50);
    assert.equal(tried.at(-1), st.urls[1]);
    // új választás: saját próbakeret
    await rp.play(st);
    assert.equal(rp.lostAt.length, 0);
  } finally {
    Object.assign(rp, saved);
    rp.stop?.();
  }
});

// ------------------------------------------------------------------ súgó
test('súgó: minden belső hivatkozás létező témára mutat; az angol súgó ugyanazokat a témákat tartalmazza', async () => {
  const ids = new Set(ARTICLES.map((a) => a.id));
  const cats = new Set(HELP_CATEGORIES.map((c) => c.id));
  for (const a of ARTICLES) {
    assert.ok(cats.has(a.cat), `ismeretlen kategória: ${a.id}`);
    for (const m of a.body.matchAll(/#\/help\?topic=([\w-]+)/g)) assert.ok(ids.has(m[1]), `${a.id} → ${m[1]}`);
  }
  const en = await import('../../src/js/help/en.js');
  assert.deepEqual(en.ARTICLES.map((a) => a.id).sort(), [...ids].sort(), 'angol témák');
});

// ------------------------------------------------------------------ gyerektartalom
import { defaultKids, kidsAllowed } from '../../src/js/kids.js';

test('gyerektartalom: csatornakategória, nsfw, VOD-csoport (B22), kizáró jelek, profilszabály', () => {
  assert.equal(defaultKids('ch', { id: 'a', categories: ['kids'] }), true);
  assert.equal(defaultKids('ch', { id: 'b', categories: ['animation'], nsfw: true }), false);
  assert.equal(defaultKids('ch', { id: 'c', categories: ['news'] }), false);
  assert.equal(defaultKids('ch', { id: 'd' }), false, 'kategória nélküli (saját) csatorna');
  assert.equal(defaultKids('vod', { id: 'v1', groups: ['Rajzfilmek'], title: 'Valami' }), true);
  assert.equal(defaultKids('vod', { id: 'v2', groups: ['Filmek'], title: 'Kids' }), false, 'a cím önmagában nem bizonyíték');
  assert.equal(defaultKids('vod', { id: 'v3', groups: ['Animal documentary'], title: 'x' }), false);
  assert.equal(defaultKids('vod', { id: 'v4', groups: ['Családi'], title: 'Horror az erdőben' }), false, 'kizáró jel a címben');
  assert.equal(defaultKids('vod', { id: 'v5', groups: ['Anime | Hentai'], title: 'x' }), false);
  const adult = { id: 'f', kids: false };
  const kid = { id: 'g', kids: true, kidsAllow: { ch: { c: true }, vod: { v1: false } } };
  assert.equal(kidsAllowed(adult, 'ch', { id: 'c', categories: ['news'] }), true);
  assert.equal(kidsAllowed(kid, 'ch', { id: 'c', categories: ['news'] }), true, 'szülői engedély');
  assert.equal(kidsAllowed(kid, 'vod', { id: 'v1', groups: ['Rajzfilmek'] }), false, 'szülői tiltás');
  assert.equal(kidsAllowed(kid, 'ch', { id: 'x', categories: ['movies'] }), false);
});

test('sanitizeSettings (U02): hibás sportWatch / customThemes elemek és tartományon kívüli hangerő', () => {
  const { settings: s, fixed } = sanitizeSettings({ sportWatch: [null, { id: 'espn:soccer/x', kind: 'espn' }, { kind: 'espn' }], customThemes: 'broken', volume: 2 });
  assert.deepEqual(s.sportWatch, [{ id: 'espn:soccer/x', kind: 'espn' }]);
  assert.ok(!('customThemes' in s));
  assert.equal(s.volume, 1);
  assert.ok(fixed.includes('sportWatch[]') && fixed.includes('customThemes') && fixed.includes('volume'));
  assert.deepEqual(sanitizeSettings({ customThemes: [{ name: 'x', text: '{}' }, 'szöveg'] }).settings.customThemes, [{ name: 'x', text: '{}' }]);
});

test('műsorforrások sorrendje: az open-epg.com az epgshare01 előtt (a Nick-csatornák időzónája miatt)', async () => {
  const { BUILTIN_EPG } = await import('../../src/js/store.js');
  const urls = BUILTIN_EPG.map((s) => s.url);
  const o = urls.indexOf('https://www.open-epg.com/files/hungary1.xml.gz');
  const e = urls.indexOf('https://epgshare01.online/epgshare01/epg_ripper_HU1.xml.gz');
  assert.ok(o >= 0 && e >= 0 && o < e, `open-epg ${o}, epgshare ${e}`);
  const { store } = await import('../../src/js/store.js');
  const list = store.settings.epgSources.map((s) => s.url);
  assert.ok(list.indexOf(urls[o]) < list.indexOf(urls[e]), 'a betöltött beállításban is');
});

// ------------------------------------------------------------------ 2026-10-21-i jegyzék
import { _kidsFallbackRx } from '../../src/js/kids.js';

test('gyerektartalom (V01): a Unicode-tulajdonság nélküli tartalék minta is teljes szóra illeszt, ékezettel', () => {
  const rx = _kidsFallbackRx('rajzfilm\\p{L}*|gyerek\\p{L}*|csal[aá]di|kids?');
  assert.ok(rx.test('Rajzfilmek'));
  assert.ok(rx.test('Filmek | Gyerekeknek'));
  assert.ok(rx.test('CSALÁDI'));
  assert.ok(!rx.test('Kidsfilm'), 'szó közepén nem');
  assert.ok(!rx.test('ágyerek'), 'ékezetes betű után nem szóhatár');
  assert.ok(!/\\p\{/.test(rx.source));
});

test('sportnaptár (V10): RRULE + EXDATE + DTEND, módosított alkalom, élő állapot', async () => {
  const { _sportsTest: { parseIcs, icsDuration } } = await import('../../src/js/sports.js');
  const now = Date.UTC(2026, 9, 21, 12, 0, 0);
  const ics = [
    'BEGIN:VCALENDAR',
    'BEGIN:VEVENT', 'UID:a', 'SUMMARY:Edzés', 'DTSTART:20261020T110000Z', 'DTEND:20261020T130000Z', 'RRULE:FREQ=DAILY;COUNT=4', 'EXDATE:20261022T110000Z', 'END:VEVENT',
    'BEGIN:VEVENT', 'UID:a', 'RECURRENCE-ID:20261023T110000Z', 'SUMMARY:Edzés (később)', 'DTSTART:20261023T150000Z', 'DURATION:PT1H', 'END:VEVENT',
    'BEGIN:VEVENT', 'UID:b', 'SUMMARY:Futam', 'DTSTART;TZID=Europe/Budapest:20261025T140000', 'RRULE:FREQ=WEEKLY;INTERVAL=1;UNTIL=20261108T235959Z', 'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
  const ev = parseIcs(ics, { id: 'x', name: 'N', sport: 'soccer' }, now);
  const a = ev.filter((e) => e.title.startsWith('Edzés')).map((e) => [new Date(e.start).toISOString().slice(5, 16), e.state]);
  assert.deepEqual(a, [['10-20T11:00', 'post'], ['10-21T11:00', 'in'], ['10-23T15:00', 'pre']]);
  const b = ev.filter((e) => e.title === 'Futam').map((e) => new Date(e.start).toISOString().slice(5, 16));
  // (a nyári időszámítás vége – október 25. – után is helyi 14:00)
  assert.deepEqual(b, ['10-25T13:00', '11-01T13:00', '11-08T13:00']);
  // (RFC 5545: a hét hétfővel kezdődik – kéthetente hétfő és vasárnap: H, V+6, H+14, V+20)
  const wk = parseIcs(['BEGIN:VEVENT', 'UID:c', 'SUMMARY:Kétheti', 'DTSTART:20261019T100000Z', 'RRULE:FREQ=WEEKLY;INTERVAL=2;BYDAY=MO,SU;COUNT=4', 'END:VEVENT'].join('\r\n'), { id: 'x', name: 'N', sport: 'soccer' }, now);
  // (a 10-19-i első alkalom az időablakon – most −2 nap – kívül esik, de a COUNT-ba beleszámít)
  assert.deepEqual(wk.map((e) => new Date(e.start).toISOString().slice(5, 10)), ['10-25', '11-02', '11-08']);
  // (nem értelmezett BY*-rész: csak az első alkalom, nem téves napok)
  const by = parseIcs(['BEGIN:VEVENT', 'UID:d', 'SUMMARY:Első szombat', 'DTSTART:20261003T100000Z', 'RRULE:FREQ=MONTHLY;BYDAY=1SA', 'END:VEVENT'].join('\r\n'), { id: 'x', name: 'N', sport: 'soccer' }, now);
  assert.equal(by.length, 1);
  // (egész napos esemény DTEND-del: a nap végéig élő, másnap reggel már nem)
  const ad = parseIcs(['BEGIN:VEVENT', 'UID:e', 'SUMMARY:Egész nap', 'DTSTART;VALUE=DATE:20261021', 'DTEND;VALUE=DATE:20261022', 'END:VEVENT'].join('\r\n'), { id: 'x', name: 'N', sport: 'soccer' }, now)[0];
  assert.equal(new Date(ad.stop).getDate(), 22);
  assert.equal(new Date(ad.stop).getHours(), 0);
  assert.equal(icsDuration('P1DT2H'), 26 * 3600e3);
  assert.equal(icsDuration('PT90M'), 90 * 60e3);
});

test('sportnaptár (W01): RDATE RRULE nélkül, régen induló napi sorozat, WKST=SU', async () => {
  const { _sportsTest: { parseIcs } } = await import('../../src/js/sports.js');
  const w = { id: 'x', name: 'N', sport: 'soccer' };
  const day = (e) => new Date(e.start).toISOString().slice(5, 16);
  const now = Date.UTC(2026, 9, 21, 12, 0, 0);
  const rd = parseIcs(['BEGIN:VEVENT', 'UID:r', 'SUMMARY:RD', 'DTSTART:20261020T160000Z', 'RDATE:20261021T160000Z,20261022T160000Z', 'END:VEVENT'].join('\r\n'), w, now);
  assert.deepEqual(rd.map(day), ['10-20T16:00', '10-21T16:00', '10-22T16:00']);
  // (2010 óta naponta: az időablak – most −2 nap … +60 nap – minden napja megvan)
  const old = parseIcs(['BEGIN:VEVENT', 'UID:o', 'SUMMARY:Régi', 'DTSTART:20100101T160000Z', 'RRULE:FREQ=DAILY', 'END:VEVENT'].join('\r\n'), w, now);
  assert.equal(day(old[0]), '10-19T16:00');
  assert.ok(old.length >= 61 && old.length <= 63, String(old.length));
  // (vasárnappal kezdődő hét: V 10-18 – az ablakon kívül, de a COUNT-ba számít –, K 10-20, majd két hét múlva V, K)
  const su = parseIcs(['BEGIN:VEVENT', 'UID:s', 'SUMMARY:WKST', 'DTSTART:20261018T160000Z', 'RRULE:FREQ=WEEKLY;INTERVAL=2;BYDAY=SU,TU;WKST=SU;COUNT=4', 'END:VEVENT'].join('\r\n'), w, now);
  assert.deepEqual(su.map((e) => day(e).slice(0, 5)), ['10-20', '11-01', '11-03']);
});

// ------------------------------------------------------------------ témák színváltozatai
import { rotateColor, hueOf, variantsFor } from '../../src/js/themevariants.js';

test('színváltozat: az árnyalat fordul, a szürke / fekete / fehér és az átlátszóság marad', () => {
  assert.equal(rotateColor('#ffffff', 120), '#ffffff');
  assert.equal(rotateColor('#141414', 120), '#141414');
  assert.equal(rotateColor('rgba(128, 128, 128, 0.5)', 90), 'rgba(128, 128, 128, 0.5)');
  const red = '#e50914';
  const blue = rotateColor(red, 228);
  assert.ok(blue !== red);
  assert.ok(Math.abs(((hueOf(blue) - 255 + 540) % 360) - 180) < 12, 'kékbe fordult: ' + blue);
  assert.ok(/rgba\(\d+, \d+, \d+, 0\.3\)/.test(rotateColor('rgba(229, 9, 20, 0.3)', 120)), 'az átlátszóság marad');
});

test('színváltozat: témánként 3 változat, egymástól és az eredetitől távoli színcsaládok; fekete-fehér kiemelésnél színes kiemelő', () => {
  const v = variantsFor(27);
  assert.equal(v.length, 3);
  assert.ok(v.every((x) => Math.abs(x.deg) >= 60 || Math.abs(x.deg) > 300));
  assert.equal(new Set(v.map((x) => x.id)).size, 3);
  const tint = variantsFor(null);
  assert.equal(tint.length, 3);
  assert.ok(tint.every((x) => x.tint));
  assert.deepEqual(variantsFor(27, []), [], 'kézzel kizárva (pl. a Kontraszt)');
});

test('színváltozat: alkalmazás és visszaállítás – a stíluslap az eredeti értékre áll vissza', async () => {
  const { store } = await import('../../src/js/store.js');
  const T = await import('../../src/js/themes.js');
  const before = { theme: store.profile.theme, tv: store.profile.themeVariants };
  try {
    store.profile.theme = 'holo';
    store.profile.themeVariants = {};
    T.applyTheme();
    const acc0 = getComputedStyle(document.body).getPropertyValue('--accent').trim();
    const v = T.themeVariants('holo')[0];
    store.profile.themeVariants = { holo: v.id };
    T.applyTheme();
    assert.equal(document.body.dataset.variant, v.id);
    const acc1 = getComputedStyle(document.body).getPropertyValue('--accent').trim();
    assert.ok(acc1 !== acc0, acc1);
    store.profile.themeVariants = {};
    T.applyTheme();
    assert.equal(getComputedStyle(document.body).getPropertyValue('--accent').trim(), acc0);
    assert.ok(!document.body.dataset.variant);
  } finally {
    store.profile.theme = before.theme;
    store.profile.themeVariants = before.tv;
    T.applyTheme();
  }
});

test('gyorsítótár (kv): JSON-szövegként oda-vissza – nagy, egymásba ágyazott objektum, ékezet, hiányzó kulcs', async () => {
  const big = { v: 1, at: 1, channels: Array.from({ length: 3000 }, (_, i) => ({ id: 'c' + i, name: 'Csatorna ' + i + ' – ő ű', tags: ['a', 'b'], n: i })) };
  await api.kvSet('teszt:kv-nagy', big);
  const back = await api.kvGet('teszt:kv-nagy');
  assert.equal(back.channels.length, 3000);
  assert.equal(back.channels[2999].name, 'Csatorna 2999 – ő ű');
  assert.equal(await api.kvGet('teszt:nincs-ilyen-kulcs'), undefined);
});

import { preserveForV1 } from '../../src/js/backup.js';

test('mentési pontok (X09): felülírás előtt a régi (v1) pont a mostani tartalmat kapja meg, nem a frissítettet', async () => {
  if (!api.docSet) return;
  const saved = await api.docGet('backups');
  try {
    await api.docSet('vodtext:tesztx09', { text: 'RÉGI' });
    const v1 = { v: 1, at: 1, reason: 'teszt', data: { settings: { vodCustom: [{ name: 'X09', textKey: 'vodtext:tesztx09' }] } } };
    const other = { v: 1, at: 2, reason: 'teszt', data: { settings: { vodCustom: [] } } };
    await api.docSet('backups', { items: [v1, other] });
    await preserveForV1('vodtext:tesztx09');
    const items = (await api.docGet('backups')).items;
    const h = items[0].docs?.['vodtext:tesztx09'];
    assert.ok(h, 'a v1 pont tartalom szerinti hivatkozást kapott');
    assert.equal(items[1].docs, undefined, 'a nem hivatkozó pont érintetlen');
    await api.docSet('vodtext:tesztx09', { text: 'ÚJ' });
    assert.equal((await api.docGet('bkdoc:' + h))?.text, 'RÉGI');
    await api.docSet('bkdoc:' + h, null);
  } finally {
    await api.docSet('vodtext:tesztx09', null);
    await api.docSet('backups', saved ?? null);
  }
});

import { THEME_VARIANTS, variantColor } from '../../src/js/themevariants.js';

test('színváltozat: témánként válogatott paletták – 3 változat egyedi azonosítóval és névvel, élénk célszínekkel', async () => {
  const { THEMES } = await import('../../src/js/themes.js');
  for (const id of Object.keys(THEMES).filter((k) => !THEMES[k].custom && k !== 'contrast')) {
    const vs = THEME_VARIANTS[id];
    assert.ok(vs?.length === 3, `${id}: ${vs?.length}`);
    assert.equal(new Set(vs.map((v) => v.id)).size, 3, id);
    assert.ok(vs.every((v) => v.name() && (v.tint != null || v.map?.length)), id);
  }
  assert.deepEqual(THEME_VARIANTS.contrast, []);
  // (Neon City szintihulláma: a neonsárgából élénk rózsaszín lesz, nem fakó pasztell; a szürke marad)
  const pink = variantColor('#fcee0a', THEME_VARIANTS.cyberpunk[0]);
  assert.ok(hueOf(pink) > 320 || hueOf(pink) < 10, pink);
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(pink.slice(i, i + 2), 16));
  assert.ok(Math.max(r, g, b) - Math.min(r, g, b) > 120, `élénk: ${pink}`);
  assert.equal(variantColor('#777777', THEME_VARIANTS.cyberpunk[0]), '#777777');
});

import { adSuggestions, keptLength } from '../../src/js/recorder.js';

test('reklámkivágás: megmaradó hossz, reklámblokk-javaslat a sűrű csend + fekete határokból', () => {
  assert.equal(keptLength(0, 100, []), 100);
  assert.equal(keptLength(10, 100, [{ start: 0, end: 20 }, { start: 50, end: 60 }, { start: 95, end: 120 }]), 65);
  // négy határ 15 mp-enként (három reklám) + egy magányos csend a műsorban → egy blokk, a csendek széléig
  const sil = [[600, 600.6], [615, 615.6], [630, 630.6], [645.2, 645.8], [1200, 1200.5]];
  const blk = sil.slice(0, 4).map(([s, e]) => [s, e]);
  const r = adSuggestions({ silences: sil, blacks: blk, video: true });
  // (jelölt minden csend; a blokkhoz képes felvételnél csak a fekete képpel együtt járó számít)
  assert.equal(r.cands.length, 5);
  assert.equal(r.cands.filter((c) => c.strong).length, 4);
  assert.deepEqual(r.blocks, [{ start: 600, end: 645.8 }]);
  // fekete kép nélkül (pl. rádió) a csendek számítanak; két határ még nem blokk
  assert.equal(adSuggestions({ silences: [[10, 10.5], [40, 40.5]] }).blocks.length, 0);
  assert.equal(adSuggestions({ silences: [[10, 10.5], [40, 40.5], [70, 70.5]] }).blocks.length, 1);
  // a túl rövid csend nem jelölt
  assert.equal(adSuggestions({ silences: [[1, 1.1]] }).cands.length, 0);
});

import { keyMapEntries, keyName, KEY_ACTIONS } from '../../src/js/keymap.js';

test('gombkiosztás: a kiosztás tisztítása (ismeretlen művelet, hibás elem, kettőzött gomb kimarad), gombnevek', () => {
  const list = keyMapEntries([
    { action: 'ok', plat: 'android', android: 100023, name: 'SCAN 23' },
    { action: 'down', plat: 'android', android: 100023, name: 'ismét ugyanaz a gomb' },
    { action: 'nincs-ilyen', plat: 'desktop', keyCode: 74 },
    { action: 'up', plat: 'desktop', keyCode: 74, code: 'KeyJ', key: 'j', name: 'J', extra: 'x' },
    { action: 'up', plat: 'desktop', key: 'Unidentified' },
    null,
    'szöveg',
  ]);
  assert.equal(list.length, 2);
  assert.deepEqual(list[1], { action: 'up', plat: 'desktop', keyCode: 74, code: 'KeyJ', key: 'j', name: 'J' });
  assert.deepEqual(keyMapEntries('nem lista'), []);
  assert.equal(keyName({ android: 100023, name: 'SCAN 23' }), 'SCAN 23');
  assert.equal(keyName({ key: 'j' }), 'J');
  assert.equal(keyName({ key: 'F9' }), 'F9');
  // minden műveletnek van szabványos billentyűje és Android-kódja, az azonosítók egyediek
  assert.ok(KEY_ACTIONS.every((a) => a.key && Number.isInteger(a.android)));
  assert.equal(new Set(KEY_ACTIONS.map((a) => a.id)).size, KEY_ACTIONS.length);
});

// ------------------------------------------------------------------ felvétel: újratöltés utáni átvétel, fájlnév
import { adoptRecordings, recordingOf, _recTest } from '../../src/js/recorder.js';
import { _pinTest, hashPin } from '../../src/js/pin.js';
import { isLocalHost, hasLocalSource } from '../../src/js/lanpolicy.js';

test('felvétel: a futó felvételek átvétele (újratöltés után), az ütemezett nem indul újra', () => {
  const sch = _recTest.schedule();
  sch.push({ id: 'teszt.hu|1', chId: 'teszt.hu', title: 'Műsor', start: Date.now() - 60e3, stop: Date.now() + 3600e3 });
  try {
    const n = adoptRecordings([
      { id: 'T99', file: 'C:/x/a.ts', meta: { chId: 'teszt.hu', title: 'Műsor', sched: 'teszt.hu|1' } },
      { id: 'T98', file: 'C:/x/b.ts', meta: null }, // (adat nélküli: kimarad)
    ]);
    assert.equal(n, 1);
    assert.equal(recordingOf('teszt.hu'), 'T99');
    assert.equal(sch.find((s) => s.id === 'teszt.hu|1').startedId, 'T99');
    assert.equal(adoptRecordings([{ id: 'T99', file: 'C:/x/a.ts', meta: { chId: 'teszt.hu' } }]), 0); // (már átvett)
  } finally {
    _recTest.active.delete('T99');
    sch.splice(sch.findIndex((s) => s.id === 'teszt.hu|1'), 1);
  }
});

test('felvétel: a fájlnév dátuma helyi idő szerint (éjfél után is)', () => {
  assert.equal(_recTest.stamp(new Date(2026, 9, 27, 0, 30)), '2026-10-27 00.30');
  assert.equal(_recTest.stamp(new Date(2026, 0, 5, 23, 7)), '2026-01-05 23.07');
});

test('PIN: erős (PBKDF2) alak, profilonként más; a régi ujjlenyomat változatlan', async () => {
  const a = await _pinTest.strongHash('1234', 'p1');
  assert.match(a, /^p2\$[0-9a-f]{64}$/);
  assert.equal(await _pinTest.strongHash('1234', 'p1'), a);
  assert.ok((await _pinTest.strongHash('1234', 'p2')) !== a);
  assert.ok((await _pinTest.strongHash('1235', 'p1')) !== a);
  assert.equal(hashPin('1234', 'p1'), '71a96fe1'); // (a meglévő PIN-ek ezzel ellenőrződnek: nem változhat)
});

test('lanpolicy: helyi címek és a saját helyi forrás felismerése', () => {
  for (const h of ['192.168.1.5', '10.0.0.2', '172.20.1.1', '127.0.0.1', 'nas.local', 'localhost', '[fd00::1]', '100.70.1.1']) assert.ok(isLocalHost(h), h);
  for (const h of ['8.8.8.8', 'iptv-org.github.io', '172.32.0.1', '[2001:db8::1]', '::ffff:8.8.8.8']) assert.ok(!isLocalHost(h), h);
  for (const h of ['::ffff:192.168.1.5', '::ffff:c0a8:105', '[::ffff:c0a8:105]']) assert.ok(isLocalHost(h), h);
  assert.equal(hasLocalSource({ customPlaylists: [{ url: 'http://[::ffff:192.168.1.5]/tv.m3u', enabled: true }] }), true);
  assert.equal(hasLocalSource({ customPlaylists: [{ url: 'http://192.168.1.20/tv.m3u', enabled: false }] }), false);
  assert.equal(hasLocalSource({ radioLists: [{ url: 'http://192.168.1.20/r.m3u', enabled: false }] }), false);
  assert.equal(hasLocalSource({ vodCustom: [{ url: 'https://exa%mple.com/a.m3u', enabled: true }], customChannels: [{ url: 'nem cím' }] }), false);
  assert.equal(hasLocalSource({ customPlaylists: [{ url: 'https://pelda.hu/a.m3u', enabled: true }] }), false);
  assert.equal(hasLocalSource({ customPlaylists: [{ url: 'http://192.168.1.20/tv.m3u', enabled: true }] }), true);
  assert.equal(hasLocalSource({ ownSources: [{ kind: 'folder', path: 'D:/Filmek', enabled: true }] }), true);
  assert.equal(hasLocalSource({ ownSources: [{ kind: 'folder', path: 'D:/Filmek', enabled: false }] }), false);
});

test('elrendezések: alapérték, ismeretlen név, választó', () => {
  assert.equal(currentLayout({}), 'classic');
  assert.equal(currentLayout({ layout: 'nincs-ilyen' }), 'classic');
  assert.equal(currentLayout({ layout: 'detail' }), 'detail');
  const ids = Object.keys(LAYOUTS);
  assert.equal(ids.length, 13);
  for (const id of ids) assert.ok(LAYOUTS[id].label && LAYOUTS[id].desc, id);
  const box = document.createElement('div');
  box.innerHTML = layoutPickerHtml('shelf');
  assert.equal(box.querySelectorAll('[data-layout-pick]').length, 13);
  assert.equal(box.querySelector('.sel').dataset.layoutPick, 'shelf');
  assert.equal(pickLayoutIn(box, box.querySelector('[data-layout-pick="unified"] b')), 'unified');
  assert.equal(box.querySelector('.sel').dataset.layoutPick, 'unified');
  assert.equal(box.querySelector('[aria-checked="true"]').dataset.layoutPick, 'unified');
  assert.equal(pickLayoutIn(box, box), null);
});
