// Az Adás tesztjei egy menetben: fordításkulcsok (tools/i18n-check.mjs), főfolyamat (test/*.test.cjs, node:test) és
// a felület (test/renderer – a valódi alkalmazásablakban, ideiglenes adatmappával; ADAS_SELFTEST, lásd main.js).
// Futtatás: npm test   (rendszer-Node nélkül is: ELECTRON_RUN_AS_NODE=1 electron tools/run-tests.mjs)
// Kapcsoló: --only=i18n|main|renderer
import { spawn, spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const only = (process.argv.find((a) => a.startsWith('--only=')) || '').slice(7);
const want = (k) => !only || only === k;
const electronBin = createRequire(import.meta.url)('electron'); // (Node alól: az Electron futtatható fájljának útja)
const nodeEnv = { ...process.env, ELECTRON_RUN_AS_NODE: '1' };
let failed = 0;

const step = (title) => console.log(`\n━━ ${title}`);

if (want('i18n')) {
  step('Fordításkulcsok');
  const r = spawnSync(process.execPath, [path.join(ROOT, 'tools', 'i18n-check.mjs')], { cwd: ROOT, env: nodeEnv, stdio: 'inherit' });
  if (r.status !== 0) failed++;
}

if (want('main')) {
  step('Főfolyamat (node:test)');
  const files = readdirSync(path.join(ROOT, 'test')).filter((f) => f.endsWith('.test.cjs')).map((f) => path.join(ROOT, 'test', f));
  // (az Electron saját Node-ja: ugyanaz a futtatókörnyezet, mint az alkalmazás főfolyamatáé)
  const r = spawnSync(electronBin, ['--test', '--test-force-exit', '--test-reporter=spec', ...files], { cwd: ROOT, env: nodeEnv, stdio: 'inherit' });
  if (r.status !== 0) failed++;
}

if (want('renderer')) {
  step('Felület (az alkalmazásablakban)');
  failed += await rendererTests();
}

console.log(failed ? `\n✗ ${failed} tesztcsoport hibás` : '\n✓ minden teszt rendben');
process.exit(failed ? 1 : 0);

/** Tesztvideók a lejátszási tesztekhez (az ffmpeg-static csomaggal; ha nincs, a tesztek kimaradnak). */
function makeFixtures(dir) {
  let ff = null;
  try {
    ff = createRequire(import.meta.url)('ffmpeg-static');
  } catch {}
  if (!ff) return;
  mkdirSync(dir, { recursive: true });
  const src = ['-f', 'lavfi', '-i', 'testsrc=duration=6:size=320x180:rate=25', '-f', 'lavfi', '-i', 'sine=frequency=440:duration=6'];
  const run = (out, codec) => spawnSync(ff, ['-hide_banner', '-loglevel', 'error', '-y', ...src, ...codec, path.join(dir, out)], { stdio: 'inherit' });
  run('test.mp4', ['-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-shortest', '-movflags', '+faststart']);
  run('test-mpeg2.ts', ['-c:v', 'mpeg2video', '-c:a', 'mp2', '-shortest', '-f', 'mpegts']);
}

function rendererTests() {
  const data = mkdtempSync(path.join(tmpdir(), 'adas-test-'));
  // kész profil: az első indítás varázslója nélkül indul
  writeFileSync(path.join(data, 'store.json'), JSON.stringify({ version: 1, settings: { lang: 'hu' }, profiles: [{ id: 'teszt', name: 'Teszt', avatar: 1 }], activeProfileId: 'teszt' }));
  makeFixtures(path.join(data, 'fixtures'));
  const env = { ...process.env, ADAS_DATA_DIR: data, ADAS_SELFTEST: 'test/renderer/index.js' };
  delete env.ELECTRON_RUN_AS_NODE;
  const extra = process.platform === 'linux' ? ['--no-sandbox'] : [];
  return new Promise((resolve) => {
    const app = spawn(electronBin, [ROOT, ...extra], { cwd: ROOT, env, stdio: ['ignore', 'pipe', 'pipe'] });
    let log = ''; // (a kettő együtt – hibánál a napló vége)
    let stdout = ''; // (az eredménysor csak a szabványos kimeneten jön – a stderr darabjai nem kerülhetnek bele)
    app.stdout.on('data', (b) => ((stdout += b), (log += b)));
    app.stderr.on('data', (b) => (log += b));
    const timer = setTimeout(() => app.kill(), 5 * 60e3);
    app.on('close', () => {
      clearTimeout(timer);
      try {
        rmSync(data, { recursive: true, force: true, maxRetries: 10, retryDelay: 300 }); // (Windowson a fájlzár után)
      } catch (err) {
        console.log(`  (az ideiglenes mappa nem törölhető: ${data} – ${err.code || err.message})`);
      }
      const line = stdout.split('\n').find((l) => l.startsWith('@@ADAS-SELFTEST@@'));
      if (!line) {
        console.log('  ✗ nincs eredmény (az alkalmazás kilépett vagy elakadt)\n' + log.slice(-3000));
        return resolve(1);
      }
      let out;
      try {
        out = JSON.parse(line.slice(17));
      } catch (err) {
        console.log('  ✗ hibás eredménysor: ' + err.message);
        return resolve(1);
      }
      if (out.error) {
        console.log('  ✗ ' + out.error);
        return resolve(1);
      }
      for (const t of out.results) {
        console.log(`${t.ok ? '  ✓' : '  ✗'} ${t.name} (${t.ms} ms)`);
        if (!t.ok) console.log('    ' + t.error.replace(/\n/g, '\n    '));
      }
      const bad = out.results.filter((t) => !t.ok).length;
      console.log(`  ${out.results.length - bad}/${out.results.length} rendben`);
      resolve(bad || !out.results.length ? 1 : 0);
    });
  });
}
