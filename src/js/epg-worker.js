// XMLTV feldolgozás háttérszálon. Bemenet: { id, text, from, to }.
// Kimenet: { id, channels: { epgId: [megjelenített nevek] }, programs: { epgId: [[start, stop, cím, leírás, kategória, alcím, epizód]] } }

// A feldolgozás indexOf-alapú, lineáris idejű: a [\s\S]*? mintás reguláris kifejezések egy hibás (záróelem
// nélküli) műsorújságon újra és újra végigolvasták a dokumentum maradékát (négyzetes idő).

const ENT = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };
/** <![CDATA[…]]> → a tartalma (záratlan CDATA-nál a maradék változatlan) */
function uncdata(s) {
  let out = '';
  let i = 0;
  for (;;) {
    const a = s.indexOf('<![CDATA[', i);
    if (a < 0) return out + s.slice(i);
    const b = s.indexOf(']]>', a + 9);
    if (b < 0) return out + s.slice(i);
    out += s.slice(i, a) + s.slice(a + 9, b);
    i = b + 3;
  }
}
function decode(s) {
  if (!s) return '';
  s = uncdata(s);
  return s
    .replace(/&(#x?[0-9a-f]+|\w+);/gi, (m, e) => {
      if (e[0] === '#') {
        const n = e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
        return Number.isFinite(n) ? String.fromCodePoint(n) : m;
      }
      return ENT[e.toLowerCase()] ?? m;
    })
    .trim();
}

function parseTime(s) {
  // 20261001060000 +0200
  // Az időzóna elhagyható (ilyenkor UTC), a másodperc is.
  const m = /^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})?\s*(?:([+-]\d{2}):?(\d{2})?)?/.exec(s || '');
  if (!m) return NaN;
  const utc = Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +(m[6] || 0));
  if (!m[7]) return utc;
  const sign = m[7][0] === '-' ? -1 : 1;
  const off = sign * (Math.abs(parseInt(m[7], 10)) * 60 + parseInt(m[8] || '0', 10));
  return utc - off * 60000;
}

const attr = (s, name) => {
  // pontos név: az attribútum a szöveg elején vagy szóköz után áll (a provider-id ne adja az id-t)
  const m = new RegExp('(?:^|\\s)' + name + '="([^"]*)"').exec(s);
  return m ? decode(m[1]) : '';
};
/**
 * Elem keresése `from`-tól: → { attrs, body, end } (önzáró elemnél body: ''), vagy null. Ha az elemnek nincs
 * záróeleme, null – a hívó ilyenkor abbahagyja (a dokumentum hátralévő része hibás).
 */
function element(s, name, from = 0) {
  const open = '<' + name;
  const close = '</' + name + '>';
  for (let p = s.indexOf(open, from); p >= 0; p = s.indexOf(open, p + 1)) {
    const c = s[p + open.length];
    if (c !== '>' && c !== '/' && c !== ' ' && c !== '\t' && c !== '\n' && c !== '\r') continue; // pl. <titles
    const gt = s.indexOf('>', p);
    if (gt < 0) return null;
    const attrs = s.slice(p + open.length, s[gt - 1] === '/' ? gt - 1 : gt);
    if (s[gt - 1] === '/') return { attrs, body: '', end: gt + 1 };
    const e = s.indexOf(close, gt + 1);
    if (e < 0) return null;
    return { attrs, body: s.slice(gt + 1, e), end: e + close.length };
  }
  return null;
}
const tag = (s, name) => {
  const el = element(s, name);
  return el ? decode(el.body) : '';
};

// ---------------------------------------------------------------------------
// Párosítás a csatornalistával (itt, a háttérszálon – a felületre csak a párosított műsorok mennek
// vissza). Sorrend: pontos tvg-id → azonosító-kulcs országgal → név országgal → név.
// ---------------------------------------------------------------------------
let index = null;
/** Összevetési kulcs: ékezet nélkül, kisbetűvel, csak betű és szám. */
const key = (s) =>
  String(s || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
/** A minőségjelölő végződés (HD, FHD, 4K...) levágása. */
const stripSuffix = (k) => k.replace(/(uhd|fhd|hd|sd|4k)$/, '') || k;
/** XMLTV-azonosító -> { k: névkulcs, cc: országkód } (pl. M1.hu -> m1, hu). */
function idKey(id) {
  const base = id.split('@')[0];
  const m = base.match(/^(.*)\.([a-z]{2,3})$/i);
  return { k: stripSuffix(key(m ? m[1] : base)), cc: m ? m[2].toLowerCase() : '' };
}
/** Egy XMLTV-csatorna párosítása a csatornalistával (a fenti sorrendben). -> csatorna-id vagy null */
function resolve(epgId, names, idx) {
  const lower = epgId.toLowerCase();
  if (idx.exact.has(lower)) return idx.exact.get(lower);
  const base = lower.split('@')[0];
  if (idx.exact.has(base)) return idx.exact.get(base);
  const { k, cc } = idKey(epgId);
  const ccs = cc === 'uk' ? ['gb', 'uk'] : [cc];
  for (const c of ccs) {
    const hit = idx.withCc.get(k + '.' + c);
    if (hit) return hit;
  }
  for (const n of names) {
    const nk = stripSuffix(key(n));
    for (const c of ccs) {
      const hit = idx.nameCc.get(nk + '.' + c);
      if (hit) return hit;
    }
  }
  for (const n of [k, ...names.map((x) => stripSuffix(key(x)))]) {
    const hit = idx.nameOnly.get(n);
    if (hit) return hit;
  }
  return null;
}

self.onmessage = (e) => {
  if (e.data.type === 'index') {
    index = e.data.index;
    return;
  }
  const { id, from, to } = e.data;
  try {
    const text = e.data.text ?? new TextDecoder('utf-8').decode(e.data.bytes);
    // Map: a fájlból jövő azonosító (pl. „__proto__”) ne írhasson felül semmit
    const channels = new Map();
    for (let el, i = 0; (el = element(text, 'channel', i)); i = el.end) {
      const id = attr(el.attrs, 'id');
      if (!id) continue;
      const names = [];
      for (let d, j = 0; (d = element(el.body, 'display-name', j)); j = d.end) names.push(decode(d.body));
      channels.set(id, names);
    }
    const programs = new Map();
    let count = 0;
    for (let el, i = 0; (el = element(text, 'programme', i)); i = el.end) {
      const a = el.attrs;
      const start = parseTime(attr(a, 'start'));
      let stop = parseTime(attr(a, 'stop'));
      if (!Number.isFinite(start)) continue;
      if (!Number.isFinite(stop)) stop = 0; // a „stop” elhagyható: a következő műsor kezdete lesz
      if (stop && !(stop > from && start < to)) continue;
      const ch = attr(a, 'channel');
      const body = el.body;
      // korhatár: <rating><value>12</value></rating> („16+”, „PG-13” is) → szám
      const rating = element(body, 'rating');
      const rv = rating ? tag(rating.body, 'value') : '';
      const age = rv ? Number((/(\d{1,2})/.exec(rv) || [])[1]) || 0 : 0;
      const row = [start, stop, tag(body, 'title'), tag(body, 'desc'), tag(body, 'category'), tag(body, 'sub-title'), tag(body, 'episode-num'), age];
      if (!programs.has(ch)) programs.set(ch, []);
      programs.get(ch).push(row);
      count++;
    }
    for (const [k, all] of programs) {
      const list = all.sort((x, y) => x[0] - y[0]);
      // Hiányzó vég: a következő műsor kezdete (az utolsónál 1 óra); ismétlődő kezdés kiszűrése.
      for (let i = 0; i < list.length; i++) if (!list[i][1]) list[i][1] = list[i + 1] ? list[i + 1][0] : list[i][0] + 3600e3;
      programs.set(k, list.filter((p, i) => p[1] > from && p[0] < to && (i === 0 || p[0] !== list[i - 1][0])));
    }
    // Párosítás: csak a csatornalistában megtalált csatornák műsorai mennek vissza [[csatorna-id, műsorok], …]
    const matched = [];
    if (index) {
      const seen = new Set();
      for (const epgId of new Set([...channels.keys(), ...programs.keys()])) {
        const progs = programs.get(epgId);
        if (!progs || !progs.length) continue;
        const chId = resolve(epgId, channels.get(epgId) || [], index);
        if (!chId || seen.has(chId)) continue;
        seen.add(chId);
        matched.push([chId, progs]);
      }
    }
    // Részletekben küldjük vissza (kb. 15 000 műsoronként): egyetlen nagy üzenet kicsomagolása a felület
    // szálát akár egy másodpercre is megakasztotta.
    let part = [];
    let size = 0;
    for (const m of matched) {
      part.push(m);
      size += m[1].length;
      if (size >= 15000) {
        self.postMessage({ id, chunk: part });
        part = [];
        size = 0;
      }
    }
    self.postMessage({ id, chunk: part, done: true, nChannels: channels.size, count });
  } catch (err) {
    self.postMessage({ id, error: String(err) });
  }
};
