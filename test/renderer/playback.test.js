// Lejátszás: a futtató (tools/run-tests.mjs) által az adatmappába készített tesztvideók a valódi lejátszóval –
// MP4 (H.264, közvetlenül a <video>-ban) és MPEG-TS MPEG-2 videóval (csak az FFmpeg-hídon át játszható).
import { test, assert, sleep } from './harness.js';
import { api } from '../../src/js/api.js';
import { player } from '../../src/js/player.js';

const video = document.querySelector('#video');

async function fixture(name) {
  const dir = (await api.appInfo?.())?.dataDir;
  if (!dir) return null;
  const p = `${dir.replace(/\\/g, '/')}/fixtures/${name}`;
  return (p.startsWith('/') ? 'file://' : 'file:///') + p.split('/').map(encodeURIComponent).join('/').replace(/^([A-Za-z])%3A/, '$1:');
}

async function playsFor(ch, sec, timeout) {
  player.play(ch);
  const t0 = Date.now();
  let last = 0;
  while (Date.now() - t0 < timeout) {
    await sleep(250);
    last = video.currentTime;
    if (last >= sec) break;
  }
  const state = { time: last, paused: video.paused, error: video.error?.message || '' };
  player.close();
  await sleep(500);
  return state;
}

test('lejátszás: MP4 (H.264) elindul és halad', async () => {
  const url = await fixture('test.mp4');
  if (!url) return;
  const r = await playsFor({ id: 'teszt:mp4', name: 'Teszt MP4', streams: [{ url }] }, 1.5, 20000);
  assert.ok(r.time >= 1.5, `nem haladt: ${JSON.stringify(r)}`);
});

test('lejátszás: MPEG-TS (MPEG-2) az FFmpeg-hídon át elindul és halad', async () => {
  if (!(await api.mediaAvailable?.())) return;
  const url = await fixture('test-mpeg2.ts');
  if (!url) return;
  const r = await playsFor({ id: 'teszt:ts', name: 'Teszt TS', streams: [{ url }] }, 1.5, 40000);
  assert.ok(r.time >= 1.5, `nem haladt: ${JSON.stringify(r)}`);
});

test('lejátszás: nem létező forrás → hibaállapot, nem akad el', async () => {
  const errors = [];
  const onErr = (e) => errors.push(e.message || String(e.reason));
  window.addEventListener('unhandledrejection', onErr);
  player.play({ id: 'teszt:bad', name: 'Rossz', streams: [{ url: 'http://127.0.0.1:9/nincs.m3u8' }] });
  await sleep(8000);
  const shown = document.querySelector('#player')?.innerText || '';
  player.close();
  window.removeEventListener('unhandledrejection', onErr);
  assert.ok(!video.currentTime || video.paused, 'nem játszhatott');
  assert.ok(shown.length > 0, 'üres lejátszó');
  assert.deepEqual(errors, [], 'kezeletlen hibák');
});
