// A felület egyfájlos, régebbi böngészőmotorokon is futó csomagja (a tévés és az androidos változathoz):
// - a modern JS-t egy fájlba csomagolja és Chromium 53-ra alakítja (esbuild),
// - a CSS-t a régebbi motorokhoz igazítja (:focus-visible, inset, min/max/clamp, :focus-within),
// - a hls.js / mpegts.js / dash.js könyvtárakat és a profilképeket bemásolja.
import { build } from 'esbuild';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TARGET = 'chrome53';

export const r = (...p) => path.join(root, ...p);
export const copy = (from, to) => {
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.copyFileSync(from, to);
};

/** Az első szintű min()/max()/clamp() hívásokat egy egyszerű tartalékértékre cseréli. */
function cssFallbackValue(value) {
  let outStr = '';
  let i = 0;
  while (i < value.length) {
    const m = /^(min|max|clamp)\(/.exec(value.slice(i));
    const prev = value[i - 1];
    if (m && !(prev && /[\w-]/.test(prev))) {
      // a zárójelpár vége
      let depth = 0;
      let j = i + m[1].length;
      for (; j < value.length; j++) {
        if (value[j] === '(') depth++;
        else if (value[j] === ')' && --depth === 0) break;
      }
      const args = splitArgs(value.slice(i + m[1].length + 1, j));
      const pick = m[1] === 'clamp' ? args[1] : args[0];
      outStr += cssFallbackValue(pick.trim());
      i = j + 1;
    } else {
      outStr += value[i++];
    }
  }
  return outStr;
}
function splitArgs(s) {
  const parts = [];
  let depth = 0;
  let cur = '';
  for (const ch of s) {
    if (ch === '(') depth++;
    if (ch === ')') depth--;
    if (ch === ',' && depth === 0) {
      parts.push(cur);
      cur = '';
    } else cur += ch;
  }
  parts.push(cur);
  return parts;
}

export function legacyCss(css) {
  css = css.replace(/\/\*[\s\S]*?\*\//g, '');
  css = css.replace(/:focus-visible/g, ':focus');
  // inset: a b c d → top/right/bottom/left
  css = css.replace(/(^|[;{\s])inset:\s*([^;}]+)/g, (all, pre, v) => {
    const p = v.trim().split(/\s+/);
    const [t, rr = t, b = t, l = rr] = p;
    return `${pre}top:${t};right:${rr};bottom:${b};left:${l}`;
  });
  // min()/max()/clamp() elé tartalékérték
  css = css.replace(/([\w-]+)\s*:\s*([^;{}]*\b(?:min|max|clamp)\([^;{}]*)(;|})/g, (all, prop, val, end) => {
    if (prop.startsWith('--')) return all;
    const fb = cssFallbackValue(val);
    return fb === val ? all : `${prop}:${fb};${prop}:${val}${end}`;
  });
  // A :focus-within-t nem ismerő motor az egész szabályt eldobná: a többi szelektort külön szabályba tesszük.
  css = css.replace(/([^{}@]+)\{([^{}]*)\}/g, (all, sel, body) => {
    if (!sel.includes(':focus-within')) return all;
    const keep = sel.split(',').filter((s) => !s.includes(':focus-within'));
    return (keep.length ? `${keep.join(',')}{${body}}` : '') + all;
  });
  return css;
}

/**
 * A felület összeállítása az appDir mappába.
 * flagScript: az app.js előtt futó szkript (pl. „window.ADAS_WEBOS = true;”).
 */
export async function buildWebBundle(appDir, { flagScript }) {
  fs.mkdirSync(appDir, { recursive: true });
  const common = {
    bundle: true,
    format: 'iife',
    target: TARGET,
    minify: true,
    legalComments: 'none',
    logLevel: 'warning',
    logOverride: { 'empty-import-meta': 'silent' },
  };
  await build({ ...common, entryPoints: [r('webos/entry.js')], outfile: path.join(appDir, 'js/app.js') });
  await build({ ...common, entryPoints: [r('webos/worker-entry.js')], outfile: path.join(appDir, 'js/epg-worker.js') });

  copy(r('node_modules/hls.js/dist/hls.min.js'), path.join(appDir, 'lib/hls.min.js'));
  copy(r('node_modules/mpegts.js/dist/mpegts.js'), path.join(appDir, 'lib/mpegts.js'));
  copy(r('node_modules/dashjs/dist/dash.all.min.js'), path.join(appDir, 'lib/dash.all.min.js'));

  const css = [r('src/style.css'), r('src/themes.css'), r('webos/tv-fallback.css')].map((f) => fs.readFileSync(f, 'utf8')).join('\n');
  fs.writeFileSync(path.join(appDir, 'style.css'), legacyCss(css));

  let htmlSrc = fs.readFileSync(r('src/index.html'), 'utf8');
  htmlSrc = htmlSrc
    .replace(/\s*<link rel="stylesheet" href="themes.css" \/>/, '')
    .replace(/\.\.\/node_modules\/hls\.js\/dist\//, 'lib/')
    .replace(/\.\.\/node_modules\/mpegts\.js\/dist\//, 'lib/')
    .replace(/\.\.\/node_modules\/dashjs\/dist\//, 'lib/')
    .replace('<script type="module" src="js/app.js"></script>', `<script>${flagScript}</script>\n  <script src="js/app.js"></script>`);
  fs.writeFileSync(path.join(appDir, 'index.html'), htmlSrc);

  for (const f of fs.readdirSync(r('src/avatars'))) copy(r('src/avatars', f), path.join(appDir, 'avatars', f));
  // Beépített (a programmal szállított) VOD-listák
  if (fs.existsSync(r('src/lists'))) for (const f of fs.readdirSync(r('src/lists'))) copy(r('src/lists', f), path.join(appDir, 'lists', f));
  if (fs.existsSync(r('src/data'))) for (const f of fs.readdirSync(r('src/data'))) copy(r('src/data', f), path.join(appDir, 'data', f));
}
