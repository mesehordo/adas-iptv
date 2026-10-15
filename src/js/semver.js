// Verziók értelmezése és összevetése (SemVer) – a felületi frissítő (Android) használja; az asztali
// frissítő (updater.js) ugyanezt a szabályt követi.

/** „v” előtag nélkül MAJOR[.MINOR[.PATCH]][-előzetes][+build]. → { core, pre } vagy null, ha nem szabályos. */
export function parseVersion(v) {
  // (a számok vezető nulla nélkül, az azonosítók nem üresek – az „01.2.4”, „1.2.4-rc..1” érvénytelen)
  const N = '(0|[1-9]\\d*)';
  const ID = '(?:0|[1-9]\\d*|\\d*[A-Za-z-][0-9A-Za-z-]*)';
  const rx = new RegExp(`^v?${N}(?:\\.${N})?(?:\\.${N})?(?:-(${ID}(?:\\.${ID})*))?(?:\\+[0-9A-Za-z-]+(?:\\.[0-9A-Za-z-]+)*)?$`);
  const m = rx.exec(String(v || '').trim());
  if (!m) return null;
  return { core: [m[1], m[2] || '0', m[3] || '0'].map(Number), pre: m[4] ? m[4].split('.') : [] };
}
export const isPrerelease = (v) => !!parseVersion(v)?.pre.length;

/** > 0, ha a újabb; nem szabályos verziónál 0 („nem újabb” – egy hibás címke ne vezessen frissítéshez). */
export function cmpVersion(a, b) {
  const pa = parseVersion(a);
  const pb = parseVersion(b);
  if (!pa || !pb) return 0;
  for (let i = 0; i < 3; i++) if (pa.core[i] !== pb.core[i]) return pa.core[i] - pb.core[i];
  if (!pa.pre.length || !pb.pre.length) return (pa.pre.length ? -1 : 0) - (pb.pre.length ? -1 : 0);
  for (let i = 0; i < Math.max(pa.pre.length, pb.pre.length); i++) {
    const x = pa.pre[i];
    const y = pb.pre[i];
    if (x === undefined) return -1;
    if (y === undefined) return 1;
    const nx = /^\d+$/.test(x);
    const ny = /^\d+$/.test(y);
    if (nx && ny && Number(x) !== Number(y)) return Number(x) - Number(y);
    if (nx !== ny) return nx ? -1 : 1;
    if (!nx && x !== y) return x < y ? -1 : 1;
  }
  return 0;
}
