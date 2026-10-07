// Android-csomag (APK) készítése Gradle nélkül: node tools/build-android.mjs
//
// Kell hozzá: JDK 17 és Android SDK (platforms;android-34, build-tools;34.0.0). Alapból a
// .android-tools mappában keresi (lásd README), vagy a JAVA_HOME / ANDROID_HOME változókban.
//
// Lépések: webes csomag (webbundle.mjs) → aapt2 compile/link → javac → d8 → dex az APK-ba
// → zipalign → apksigner. A kulcs (android/keystore) első futáskor készül el; őrizd meg,
// mert csak ugyanazzal a kulccsal aláírt új verzió telepíthető a régi fölé.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { root, r, buildWebBundle } from './webbundle.mjs';

const tools = r('.android-tools');
const firstDir = (dir, re) => (fs.existsSync(dir) ? fs.readdirSync(dir).find((n) => re.test(n)) : null);
const JAVA_HOME = process.env.JAVA_HOME || path.join(tools, firstDir(tools, /^jdk-17/) || 'jdk');
const SDK = process.env.ANDROID_HOME || path.join(tools, 'sdk');
const API = 34;
const BT = path.join(SDK, 'build-tools', firstDir(path.join(SDK, 'build-tools'), /^34\./) || '34.0.0');
const ANDROID_JAR = path.join(SDK, 'platforms', `android-${API}`, 'android.jar');
const MIN_SDK = 23; // Android 6.0
const win = process.platform === 'win32';
const exe = (dir, name) => path.join(dir, name + (win ? (/^(d8|apksigner)$/.test(name) ? '.bat' : '.exe') : ''));
const jbin = (name) => path.join(JAVA_HOME, 'bin', name + (win ? '.exe' : ''));

for (const [what, p] of [['JDK', jbin('javac')], ['android.jar', ANDROID_JAR], ['build-tools', exe(BT, 'aapt2')]]) {
  if (!fs.existsSync(p)) {
    console.error(`Hiányzik: ${what} (${p}). Lásd a README Android részét.`);
    process.exit(1);
  }
}

const env = { ...process.env, JAVA_HOME, PATH: path.join(JAVA_HOME, 'bin') + path.delimiter + process.env.PATH };
const run = (cmd, args, opts = {}) => execFileSync(cmd, args, { stdio: 'inherit', env, shell: win && cmd.endsWith('.bat'), ...opts });

const pkg = JSON.parse(fs.readFileSync(r('package.json'), 'utf8'));
const [ma, mi, pa] = pkg.version.split('.').map(Number);
const versionCode = ma * 10000 + mi * 100 + pa; // 1.8.1 → 10801

const build = r('android', 'build');
const out = r('dist-android');
fs.rmSync(build, { recursive: true, force: true });
fs.mkdirSync(build, { recursive: true });
fs.mkdirSync(out, { recursive: true });

// ---------------------------------------------------------------- felület
console.log('» Webes csomag…');
await buildWebBundle(path.join(build, 'assets', 'web'), { flagScript: 'window.ADAS_ANDROID = true;' });

// ---------------------------------------------------------------- erőforrások
console.log('» Erőforrások (aapt2)…');
run(exe(BT, 'aapt2'), ['compile', '--dir', r('android', 'res'), '-o', path.join(build, 'res.zip')]);
fs.mkdirSync(path.join(build, 'gen'), { recursive: true });
const unsigned = path.join(build, 'unsigned.apk');
run(exe(BT, 'aapt2'), [
  'link', '-I', ANDROID_JAR,
  '--manifest', r('android', 'AndroidManifest.xml'),
  '--min-sdk-version', String(MIN_SDK), '--target-sdk-version', String(API),
  '--version-code', String(versionCode), '--version-name', pkg.version,
  '--java', path.join(build, 'gen'),
  '-0', 'png', // a képek már tömörek
  '-o', unsigned,
  path.join(build, 'res.zip'),
]);

// ---------------------------------------------------------------- Java → dex
console.log('» Fordítás (javac, d8)…');
// A natív lejátszó (ExoPlayer / Media3 + FFmpeg hangdekóder) könyvtárai: node tools/fetch-android-deps.mjs
const depsDir = r('.android-tools', 'deps');
const depJars = fs.existsSync(path.join(depsDir, 'jars')) ? fs.readdirSync(path.join(depsDir, 'jars')).filter((n) => n.endsWith('.jar')).map((n) => path.join(depsDir, 'jars', n)) : [];
if (!depJars.length) {
  console.error('Hiányoznak a lejátszó könyvtárai. Előbb: node tools/fetch-android-deps.mjs');
  process.exit(1);
}
const javaFiles = [];
const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).forEach((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : e.name.endsWith('.java') && javaFiles.push(path.join(d, e.name))));
walk(r('android', 'src'));
walk(path.join(build, 'gen'));
const classes = path.join(build, 'classes');
run(jbin('javac'), [
  '-encoding', 'UTF-8', '-source', '1.8', '-target', '1.8', '-nowarn', '-Xlint:-options', '-bootclasspath', ANDROID_JAR,
  '-classpath', [path.join(BT, 'core-lambda-stubs.jar'), ...depJars].join(path.delimiter), '-d', classes, ...javaFiles,
]);
const classFiles = [];
const walkC = (d) => fs.readdirSync(d, { withFileTypes: true }).forEach((e) => (e.isDirectory() ? walkC(path.join(d, e.name)) : e.name.endsWith('.class') && classFiles.push(path.join(d, e.name))));
walkC(classes);
const dexDir = path.join(build, 'dex');
fs.mkdirSync(dexDir, { recursive: true });
// A saját kód és a könyvtárak együtt; 64 ezer metódus fölött a d8 több dex-fájlra bont (classes2.dex…).
// (A d8 egyetlen hívásban a sok osztályfájlt egy listafájlból kapja – a Windows parancssora rövid.)
const inputs = path.join(build, 'd8-inputs.txt');
fs.writeFileSync(inputs, [...classFiles, ...depJars].join('\n'));
// Az újabb d8 (R8 jar) kell: a Build Tools 34-é a Media3 osztályain összeomlik.
const r8jar = path.join(depsDir, 'r8.jar');
const d8 = fs.existsSync(r8jar) ? [jbin('java'), ['-Xmx2g', '-cp', r8jar, 'com.android.tools.r8.D8']] : [exe(BT, 'd8'), []];
run(d8[0], [...d8[1], '--release', '--min-api', String(MIN_SDK), '--lib', ANDROID_JAR, '--output', dexDir, `@${inputs}`]);
// a dex hozzáadása (az aapt a meglévő elemeket – pl. a tömörítetlen resources.arsc-t – nem írja át)
const dexFiles = fs.readdirSync(dexDir).filter((n) => /^classes\d*\.dex$/.test(n));
run(exe(BT, 'aapt'), ['add', unsigned, ...dexFiles], { cwd: dexDir });
// Natív FFmpeg-hangdekóder (lib/<abi>/libffmpegJNI.so)
const libSrc = path.join(depsDir, 'lib');
const libFiles = [];
if (fs.existsSync(libSrc)) {
  for (const abi of fs.readdirSync(libSrc)) {
    for (const so of fs.readdirSync(path.join(libSrc, abi))) {
      const dst = path.join(build, 'lib', abi, so);
      fs.mkdirSync(path.dirname(dst), { recursive: true });
      fs.copyFileSync(path.join(libSrc, abi, so), dst);
      libFiles.push(`lib/${abi}/${so}`);
    }
  }
}
if (libFiles.length) run(exe(BT, 'aapt'), ['add', unsigned, ...libFiles], { cwd: build, stdio: 'ignore' });
// A webes felület az assets/web alá. (Az aapt2 -A Windowson fordított perjellel írná be az útvonalakat,
// amit az Android nem talál meg – ezért egyenként, „/” elválasztóval adjuk hozzá.)
const assetFiles = [];
const walkA = (d, rel) => fs.readdirSync(d, { withFileTypes: true }).forEach((e) => (e.isDirectory() ? walkA(path.join(d, e.name), rel + e.name + '/') : assetFiles.push(rel + e.name)));
walkA(path.join(build, 'assets'), 'assets/');
run(exe(BT, 'aapt'), ['add', unsigned, ...assetFiles], { cwd: build, stdio: 'ignore' });

// ---------------------------------------------------------------- igazítás, aláírás
console.log('» Igazítás és aláírás…');
const aligned = path.join(build, 'aligned.apk');
run(exe(BT, 'zipalign'), ['-p', '-f', '4', unsigned, aligned]);

const ksDir = r('android', 'keystore');
const ks = path.join(ksDir, 'adas.jks');
const passFile = path.join(ksDir, 'password.txt');
if (!fs.existsSync(ks)) {
  fs.mkdirSync(ksDir, { recursive: true });
  const pass = crypto.randomBytes(18).toString('base64url');
  fs.writeFileSync(passFile, pass);
  run(jbin('keytool'), [
    '-genkeypair', '-keystore', ks, '-storepass', pass, '-keypass', pass, '-alias', 'adas',
    '-keyalg', 'RSA', '-keysize', '3072', '-validity', '10000', '-dname', 'CN=Adás, O=Adás, C=HU',
  ]);
  console.log('  Új aláírókulcs: android/keystore (őrizd meg!)');
}
const pass = fs.readFileSync(passFile, 'utf8').trim();
const apk = path.join(out, `Adas-${pkg.version}.apk`);
run(exe(BT, 'apksigner'), ['sign', '--ks', ks, '--ks-pass', `pass:${pass}`, '--key-pass', `pass:${pass}`, '--ks-key-alias', 'adas', '--out', apk, aligned]);
run(exe(BT, 'apksigner'), ['verify', '--min-sdk-version', String(MIN_SDK), apk]);
fs.rmSync(apk + '.idsig', { force: true });
console.log(`Kész: ${path.relative(root, apk)} (${(fs.statSync(apk).size / 1048576).toFixed(1)} MB)`);
