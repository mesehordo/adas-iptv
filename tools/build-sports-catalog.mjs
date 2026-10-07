// Az ESPN nyilvános (kulcs nélküli) API-jának sportágai és bajnokságai → src/data/sports-espn.json
// (beépített katalógus a Sportfigyelő böngészőjéhez; frissítés: node tools/build-sports-catalog.mjs)
import fs from 'node:fs';
import path from 'node:path';

const OUT = path.join(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1')), '..', 'src', 'data', 'sports-espn.json');
const get = async (u) => {
  for (let i = 0; i < 3; i++) {
    try {
      const r = await fetch(u.replace(/^http:/, 'https:'));
      if (r.ok) return r.json();
    } catch {}
    await new Promise((r) => setTimeout(r, 800));
  }
  return null;
};

const sports = await get('https://sports.core.api.espn.com/v2/sports?limit=100');
const out = [];
for (const it of sports.items) {
  const s = await get(it.$ref);
  if (!s) continue;
  const list = await get(`https://sports.core.api.espn.com/v2/sports/${s.slug}/leagues?limit=1000`);
  const refs = list?.items || [];
  let n = 0;
  for (let i = 0; i < refs.length; i += 12) {
    const part = await Promise.all(refs.slice(i, i + 12).map((r) => get(r.$ref)));
    for (const l of part) {
      if (!l?.slug) continue;
      out.push({ s: s.slug, c: l.slug, n: l.name || l.displayName, a: l.abbreviation || l.shortName || '', t: l.isTournament ? 1 : 0, g: l.gender === 'FEMALE' ? 'f' : l.gender === 'MALE' ? 'm' : '' });
      n++;
    }
  }
  console.log(`${s.slug}: ${n} bajnokság`);
}
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify({ at: new Date().toISOString().slice(0, 10), leagues: out }));
console.log(`Kész: ${OUT} (${out.length} bajnokság)`);
