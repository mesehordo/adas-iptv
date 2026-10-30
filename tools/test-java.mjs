// Az Android-kód JDK-val tesztelhető részei (android/test, Android-függőség nélkül): node tools/test-java.mjs
//
// A JDK helye: ADAS_JDK, JAVA_HOME, a .android-tools/jdk-17* mappa, végül a PATH (javac, java).
// JDK nélkül kimarad (0-s kilépési kóddal) – kivéve a CI-ban, ahol hiba.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const win = process.platform === 'win32';
const bin = (home, name) => path.join(home, 'bin', name + (win ? '.exe' : ''));
const tools = path.join(ROOT, '.android-tools');
const jdk17 = fs.existsSync(tools) ? fs.readdirSync(tools).find((n) => /^jdk-17/.test(n)) : null;
const homes = [process.env.ADAS_JDK, process.env.JAVA_HOME, jdk17 && path.join(tools, jdk17)].filter(Boolean);
const home = homes.find((h) => fs.existsSync(bin(h, 'javac')));
const javac = home ? bin(home, 'javac') : 'javac';
const java = home ? bin(home, 'java') : 'java';
if (spawnSync(javac, ['-version'], { stdio: 'ignore' }).status !== 0) {
  console.log('  (nincs JDK – a Java-tesztek kimaradnak; ADAS_JDK vagy JAVA_HOME)');
  process.exit(process.env.CI ? 1 : 0);
}

const src = (...p) => path.join(ROOT, 'android', ...p);
const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : e.name.endsWith('.java') ? [path.join(d, e.name)] : []));
const tests = walk(src('test'));
// (csak az Android-függőség nélküli osztályok – a tesztek nevéből: FooTest.java → src/…/Foo.java)
const subjects = tests.map((t) => src('src', path.relative(src('test'), t).replace(/Test\.java$/, '.java')));

const out = fs.mkdtempSync(path.join(os.tmpdir(), 'adas-java-'));
let status = 1;
try {
  const c = spawnSync(javac, ['-encoding', 'UTF-8', '-source', '1.8', '-target', '1.8', '-Xlint:-options', '-d', out, ...subjects, ...tests], { stdio: 'inherit' });
  if (c.status === 0) {
    // sni.test → 127.0.0.1: a rendszer feloldása eltér a HttpOpen.net-étől (DNS-újrakötés a tesztben)
    const hosts = path.join(out, 'hosts');
    fs.writeFileSync(hosts, '127.0.0.1 sni.test\n');
    status = 0;
    for (const t of tests) {
      const cls = path.relative(src('test'), t).replace(/\.java$/, '').split(path.sep).join('.');
      console.log(`  ${cls}`);
      const r = spawnSync(java, ['-Dfile.encoding=UTF-8', `-Djdk.net.hosts.file=${hosts}`, '-Dsun.net.http.allowRestrictedHeaders=true', '-cp', out, cls], { stdio: 'inherit' });
      if (r.status !== 0) status = 1;
    }
  }
} finally {
  fs.rmSync(out, { recursive: true, force: true });
}
process.exit(status);
