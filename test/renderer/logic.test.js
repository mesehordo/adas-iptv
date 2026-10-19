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
