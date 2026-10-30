// Bejegyzés a Mastodonra (angolul). Kiadásnál a Flathub-adatok (flatpak/…metainfo.xml) adott verziójú <release>
// pontjaiból: „Adás X.Y.Z is out!”, a pontok, a kiadás oldala és címkék. Egyedi bejegyzés: egy szövegfájl a
// docs/mastodon/ mappából. A Mastodon munkafolyamat (mastodon.yml) futtatja.
//
//   node tools/mastodon-post.mjs 1.35.0                   – csak kiírja a posztot (próba)
//   node tools/mastodon-post.mjs docs/mastodon/intro.txt  – egyedi bejegyzés, próba
//   MASTODON_URL=https://… MASTODON_TOKEN=… node tools/mastodon-post.mjs <verzió | fájl> --post
//
// A hozzáférési kulcs csak „write:statuses” jogú legyen (a tároló titkai között: MASTODON_TOKEN).
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const REPO = 'mesehordo/adas-iptv';
const METAINFO = path.join(root, 'flatpak', 'io.github.mesehordo.adas-iptv.metainfo.xml');
const LIMIT = 500; // (a Mastodon alapértelmezett korlátja; a hivatkozás 23 karakternek számít)
const URL_LEN = 23;
// (CamelCase címkék – a képernyőolvasók így szavanként olvassák fel; kevés, de kereshető)
export const TAGS = '#Adás #IPTV #OpenSource #FOSS #Linux';

/** Egy pont sima szövegként: a jelölések nélkül (karakterenként, a < … > közti rész kimarad), a karakterhivatkozások
 *  feloldva, kacsacsőr nélkül (a poszt sima szöveg – a Mastodon maga escape-el). */
const unxml = (s) => {
  let t = '';
  let inTag = false;
  for (const ch of s) {
    if (ch === '<') inTag = true;
    else if (ch === '>') inTag = false;
    else if (!inTag) t += ch;
  }
  const ent = { lt: '', gt: '', quot: '"', apos: "'", amp: '&' };
  return t.replace(/&(lt|gt|quot|apos|amp);/g, (_, k) => ent[k]).replace(/\s+/g, ' ').trim();
};

/** A kiadás angol pontjai a metainfo.xml-ből (a fordítások – xml:lang – nélkül); null, ha nincs ilyen kiadás. */
export function releaseNotes(xml, version) {
  // (a kiadások sorra – a verzió egyszerű szöveg-összehasonlítással, nem reguláris kifejezésként)
  const rel = [...xml.matchAll(/<release\s+([^>]*)>([\s\S]*?)<\/release>/g)].find((m) => m[1].match(/\bversion="([^"]*)"/)?.[1] === version);
  if (!rel) return null;
  return [...rel[2].matchAll(/<li>([\s\S]*?)<\/li>/g)].map((x) => unxml(x[1])).filter(Boolean);
}

/** A hossz úgy, ahogy a Mastodon számolja: kódpontonként (egy emoji egy), a hivatkozás 23 karakter. */
export const lenOf = (s) => [...s.replace(/https?:\/\/\S+/g, 'x'.repeat(URL_LEN))].length;

/** A kiadási poszt (legfeljebb LIMIT karakter: a pontok a végéről maradnak el). */
export function compose(version, notes) {
  const url = `https://github.com/${REPO}/releases/tag/v${version}`;
  const head = `Adás ${version} is out!`;
  const tail = `\n\nDownload for Windows, macOS, Linux and Android: ${url}\n\n${TAGS}`;
  let items = notes.slice(0, 6);
  const text = () => head + (items.length ? '\n\n' + items.map((l) => `• ${l}`).join('\n') : '') + tail;
  while (items.length && lenOf(text()) > LIMIT) items = items.slice(0, -1);
  return text();
}

/** A poszt és a küldés kulcsa (Idempotency-Key: a Mastodon egy órán belül nem fogad el kétszer ugyanazzal a kulccsal). */
export function build(arg) {
  if (/^\d+\.\d+\.\d+$/.test(arg)) {
    const notes = releaseNotes(fs.readFileSync(METAINFO, 'utf8'), arg);
    if (!notes) throw new Error(`A Flathub-adatokban (metainfo.xml) nincs ${arg} kiadás.`);
    if (!notes.length) throw new Error(`A Flathub-adatokban a ${arg} kiadásnak nincs angol pontja (<li> xml:lang nélkül).`);
    return { status: compose(arg, notes), key: `adas-release-${arg}` };
  }
  // (egyedi bejegyzés: csak a docs/mastodon/ mappából)
  const file = path.resolve(root, arg);
  if (path.dirname(file) !== path.join(root, 'docs', 'mastodon') || !file.endsWith('.txt')) throw new Error('Egyedi bejegyzés csak a docs/mastodon/*.txt fájlokból lehet.');
  const status = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n').trim();
  if (!status) throw new Error('Üres a bejegyzés.');
  return { status, key: `adas-post-${crypto.createHash('sha256').update(status).digest('hex').slice(0, 24)}` };
}

async function main() {
  const [arg, flag, ...rest] = process.argv.slice(2);
  if (!arg || (flag !== undefined && flag !== '--post') || rest.length) {
    console.error('Használat: node tools/mastodon-post.mjs <verzió | docs/mastodon/….txt> [--post]');
    process.exit(2);
  }
  let post;
  try {
    post = build(arg);
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
  console.log(post.status);
  const n = lenOf(post.status);
  console.log(`\n(${n} / ${LIMIT} karakter)`);
  if (n > LIMIT) {
    console.error('Túl hosszú a bejegyzés.');
    process.exit(1);
  }
  if (flag !== '--post') return;
  const base = String(process.env.MASTODON_URL || '').replace(/\/+$/, '');
  const token = process.env.MASTODON_TOKEN || '';
  if (!/^https:\/\/[\w.-]+(:\d+)?$/.test(base) || !token) {
    console.error('A posztoláshoz MASTODON_URL (https://példány) és MASTODON_TOKEN kell.');
    process.exit(1);
  }
  const r = await fetch(`${base}/api/v1/statuses`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'Idempotency-Key': post.key },
    body: JSON.stringify({ status: post.status, visibility: 'public', language: 'en' }),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) {
    console.error(`A Mastodon hibát adott: HTTP ${r.status} ${j.error || ''}`);
    process.exit(1);
  }
  console.log('Elküldve:', j.url || j.uri || '(nincs cím)');
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
