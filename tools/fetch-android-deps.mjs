// Az Androidos natív lejátszó (ExoPlayer / Media3 + FFmpeg hangdekóder) könyvtárainak letöltése
// Gradle nélkül: a Maven POM-okból feloldja a függőségeket, és a .android-tools/deps mappába
// teszi a classes.jar-okat, illetve a natív (.so) könyvtárakat.
//   node tools/fetch-android-deps.mjs
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(root, '.android-tools', 'deps');
const MEDIA3 = '1.6.1';
const ROOTS = [
  `androidx.media3:media3-exoplayer:${MEDIA3}`,
  `org.jellyfin.media3:media3-ffmpeg-decoder:${MEDIA3}+2`, // AC3 / E-AC3 / DTS / TrueHD szoftveres dekódolás
];
const REPOS = ['https://dl.google.com/dl/android/maven2', 'https://repo1.maven.org/maven2'];
// Csak fordítási idejű megjegyzések / üres helyettesítők – futáskor nem kellenek
const SKIP = /^(org\.jetbrains\.kotlin|org\.jetbrains:annotations|com\.google\.code\.findbugs|org\.checkerframework|com\.google\.errorprone|com\.google\.j2objc|org\.jspecify|com\.google\.guava:listenablefuture|androidx\.annotation:annotation-experimental)/;

const cache = path.join(out, 'cache');
fs.mkdirSync(cache, { recursive: true });

async function get(rel) {
  const f = path.join(cache, rel.replace(/[/:]/g, '_'));
  if (fs.existsSync(f)) return fs.readFileSync(f);
  for (const repo of REPOS) {
    const res = await fetch(`${repo}/${rel}`);
    if (res.ok) {
      const b = Buffer.from(await res.arrayBuffer());
      fs.writeFileSync(f, b);
      return b;
    }
  }
  return null;
}

const coordPath = (g, a, v) => `${g.replace(/\./g, '/')}/${a}/${encodeURIComponent(v).replace(/%2B/g, '+')}/${a}-${v}`;
const tag = (xml, t) => (new RegExp(`<${t}>\\s*([^<]*?)\\s*</${t}>`).exec(xml) || [])[1];

async function pom(g, a, v) {
  const b = await get(coordPath(g, a, v) + '.pom');
  return b ? b.toString('utf8') : '';
}

const resolved = new Map(); // g:a -> { g, a, v, packaging }
async function resolve(coord) {
  let [g, a, v] = coord.split(':');
  v = v.replace(/^\[|\]$/g, '').split(',')[0];
  const key = `${g}:${a}`;
  if (SKIP.test(key) || SKIP.test(coord)) return;
  if (resolved.has(key)) return;
  const xml = await pom(g, a, v);
  if (!xml) throw new Error('Nincs POM: ' + coord);
  // a <parent> és <dependencyManagement> nélküli egyszerű feloldás (a Media3 / Guava POM-ok ilyenek)
  const packaging = tag(xml.replace(/<parent>[\s\S]*?<\/parent>/, ''), 'packaging') || 'jar';
  resolved.set(key, { g, a, v, packaging });
  const deps = (xml.replace(/<dependencyManagement>[\s\S]*?<\/dependencyManagement>/, '').match(/<dependency>[\s\S]*?<\/dependency>/g) || [])
    .map((d) => ({ g: tag(d, 'groupId'), a: tag(d, 'artifactId'), v: tag(d, 'version'), scope: tag(d, 'scope') || 'compile', optional: tag(d, 'optional') === 'true' }))
    .filter((d) => d.v && !d.optional && /^(compile|runtime)$/.test(d.scope));
  for (const d of deps) await resolve(`${d.g}:${d.a}:${d.v}`);
}

for (const c of ROOTS) await resolve(c);

// ZIP-ből (AAR) egy tétel kibontása
function unzipEntry(buf, want) {
  let e = buf.length - 22;
  while (e > 0 && buf.readUInt32LE(e) !== 0x06054b50) e--;
  let n = buf.readUInt16LE(e + 10);
  let p = buf.readUInt32LE(e + 16);
  const outFiles = [];
  for (let i = 0; i < n; i++) {
    const method = buf.readUInt16LE(p + 10);
    const csize = buf.readUInt32LE(p + 20);
    const nl = buf.readUInt16LE(p + 28);
    const xl = buf.readUInt16LE(p + 30);
    const cl = buf.readUInt16LE(p + 32);
    const local = buf.readUInt32LE(p + 42);
    const name = buf.subarray(p + 46, p + 46 + nl).toString();
    p += 46 + nl + xl + cl;
    if (!want(name)) continue;
    const ln = buf.readUInt16LE(local + 26);
    const lx = buf.readUInt16LE(local + 28);
    const data = buf.subarray(local + 30 + ln + lx, local + 30 + ln + lx + csize);
    outFiles.push({ name, data: method === 8 ? zlib.inflateRawSync(data) : Buffer.from(data) });
  }
  return outFiles;
}

const jarsDir = path.join(out, 'jars');
const libDir = path.join(out, 'lib');
fs.rmSync(jarsDir, { recursive: true, force: true });
fs.rmSync(libDir, { recursive: true, force: true });
fs.mkdirSync(jarsDir, { recursive: true });
const list = [];
for (const { g, a, v, packaging } of resolved.values()) {
  const isAar = packaging === 'aar';
  const b = await get(coordPath(g, a, v) + (isAar ? '.aar' : '.jar'));
  if (!b) throw new Error(`Nem tölthető le: ${g}:${a}:${v}`);
  const base = `${g}.${a}-${v}`.replace(/[+:]/g, '_');
  if (isAar) {
    for (const f of unzipEntry(b, (n) => n === 'classes.jar' || /^jni\/[^/]+\/[^/]+\.so$/.test(n) || n === 'res/values/values.xml')) {
      if (f.name === 'classes.jar') fs.writeFileSync(path.join(jarsDir, base + '.jar'), f.data);
      else if (f.name.endsWith('.so')) {
        const dst = path.join(libDir, f.name.slice(4));
        fs.mkdirSync(path.dirname(dst), { recursive: true });
        fs.writeFileSync(dst, f.data);
      } else console.warn(`  Figyelem: ${a} saját erőforrást is tartalmaz (res) – ezt a build nem csatolja.`);
    }
  } else fs.writeFileSync(path.join(jarsDir, base + '.jar'), b);
  list.push(`${g}:${a}:${v} (${packaging})`);
}
console.log(list.join('\n'));
// Újabb d8 (az R8 része): a Build Tools 34 d8-ja a Media3 1.6 osztályain összeomlik
const R8 = '8.13.25';
const r8 = await get(`com/android/tools/r8/${R8}/r8-${R8}.jar`);
if (!r8) throw new Error('Az R8 nem tölthető le');
fs.writeFileSync(path.join(out, 'r8.jar'), r8);
console.log(`R8 / d8: ${R8}`);
const so = fs.existsSync(libDir) ? fs.readdirSync(libDir).map((abi) => `${abi}: ${fs.readdirSync(path.join(libDir, abi)).join(', ')}`) : [];
console.log('Natív könyvtárak:\n  ' + so.join('\n  '));
