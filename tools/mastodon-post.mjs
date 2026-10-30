// Kiadási bejegyzés a Mastodonra: a változáslista (docs/FUNKCIOK.md) adott verziójú szakaszából egy rövid poszt
// (cím, a pontok kiemelt eleje, a kiadás oldala). A kiadási munkafolyamat (mastodon.yml) futtatja.
//
//   node tools/mastodon-post.mjs <verzió>            – csak kiírja a posztot (próba)
//   MASTODON_URL=https://… MASTODON_TOKEN=… node tools/mastodon-post.mjs <verzió> --post
//
// A hozzáférési kulcs csak „write:statuses” jogú legyen (a tároló titkai között: MASTODON_TOKEN).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const REPO = 'mesehordo/adas-iptv';
const LIMIT = 500; // (a Mastodon alapértelmezett korlátja; a hivatkozás 23 karakternek számít)
const URL_LEN = 23;

/** A változáslista szakasza: { title, leads: string[] } – a „**Cím (1.2.3)**” sor és alatta a „- **…**” pontok. */
export function section(md, version) {
  const lines = md.split(/\r?\n/);
  const at = lines.findIndex((l) => new RegExp(`^\\*\\*(.+) \\(${version.replace(/\./g, '\\.')}\\)\\*\\*\\s*$`).test(l));
  if (at < 0) return null;
  const title = lines[at].replace(/^\*\*(.+) \([^)]+\)\*\*\s*$/, '$1');
  const leads = [];
  for (const l of lines.slice(at + 1)) {
    if (!l.startsWith('- ')) {
      if (l.trim()) break;
      continue;
    }
    // (a pont kiemelt eleje; ha nincs, az első tagmondat)
    const b = l.match(/^- \*\*(.+?)\*\*/);
    const t = (b ? b[1] : l.slice(2).split(/ – |: |\. /)[0]).replace(/[*`_]/g, '').trim();
    if (t) leads.push(t);
  }
  return { title, leads };
}

const lenOf = (s) => s.replace(/https?:\/\/\S+/g, 'x'.repeat(URL_LEN)).length;

/** A poszt szövege (legfeljebb LIMIT karakter: a pontok a végéről maradnak el). */
export function compose(version, sec) {
  const url = `https://github.com/${REPO}/releases/tag/v${version}`;
  const head = `Megjelent az Adás ${version}!\n\n${sec.title}`;
  const tail = `\n\nLetöltés (Windows, macOS, Linux, Android): ${url}\n\n#Adás #IPTV #NyíltForrás`;
  let leads = sec.leads.slice(0, 6);
  const text = () => head + (leads.length ? '\n\n' + leads.map((l) => `• ${l}`).join('\n') : '') + tail;
  while (leads.length && lenOf(text()) > LIMIT) leads = leads.slice(0, -1);
  return text();
}

async function main() {
  const [version, flag] = process.argv.slice(2);
  if (!/^\d+\.\d+\.\d+$/.test(version || '')) {
    console.error('Használat: node tools/mastodon-post.mjs <verzió> [--post]');
    process.exit(2);
  }
  const sec = section(fs.readFileSync(path.join(root, 'docs', 'FUNKCIOK.md'), 'utf8'), version);
  if (!sec) {
    console.error(`A változáslistában nincs ${version} szakasz.`);
    process.exit(1);
  }
  const status = compose(version, sec);
  console.log(status);
  console.log(`\n(${lenOf(status)} / ${LIMIT} karakter)`);
  if (flag !== '--post') return;
  const base = String(process.env.MASTODON_URL || '').replace(/\/+$/, '');
  const token = process.env.MASTODON_TOKEN || '';
  if (!/^https:\/\/[\w.-]+(:\d+)?$/.test(base) || !token) {
    console.error('A posztoláshoz MASTODON_URL (https://példány) és MASTODON_TOKEN kell.');
    process.exit(1);
  }
  const r = await fetch(`${base}/api/v1/statuses`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      // (ugyanarra a kiadásra csak egy poszt – az újrafuttatás nem duplikál)
      'Idempotency-Key': `adas-release-${version}`,
    },
    body: JSON.stringify({ status, visibility: 'public', language: 'hu' }),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) {
    console.error(`A Mastodon hibát adott: HTTP ${r.status} ${j.error || ''}`);
    process.exit(1);
  }
  console.log('Elküldve:', j.url || j.uri || '(nincs cím)');
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
