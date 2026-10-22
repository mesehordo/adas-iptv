// XMLTV feldolgozás háttérszálon. Bemenet: { id, text, from, to }.
// Kimenet: { id, channels: { epgId: [megjelenített nevek] }, programs: { epgId: [[start, stop, cím, leírás, kategória, alcím, epizód]] } }

// A feldolgozás indexOf-alapú, lineáris idejű: a [\s\S]*? mintás reguláris kifejezések egy hibás (záróelem
// nélküli) műsorújságon újra és újra végigolvasták a dokumentum maradékát (négyzetes idő).

const ENT = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };
/** Az XML-ben megengedett karakter-e (XML 1.0 Char) – a hibás hivatkozás (pl. &#x110000;) nem dob kivételt (B17). */
const xmlChar = (n) => n === 0x9 || n === 0xa || n === 0xd || (n >= 0x20 && n <= 0xd7ff) || (n >= 0xe000 && n <= 0xfffd) || (n >= 0x10000 && n <= 0x10ffff);
/** Entitások feloldása normál (nem CDATA) szövegben. A tiltott / tartományon kívüli kódpont helyére U+FFFD kerül. */
const entities = (s) =>
  s.replace(/&(#x[0-9a-f]+|#[0-9]+|[a-z]\w*);/gi, (m, e) => {
    if (e[0] !== '#') return ENT[e.toLowerCase()] ?? m;
    const n = e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
    return Number.isFinite(n) && xmlChar(n) ? String.fromCodePoint(n) : '\uFFFD';
  });
/**
 * Szövegtartalom dekódolása: a CDATA-szakaszok tartalma szó szerinti (B19 – benne nincs entitásfeloldás), a
 * többi rész entitásai feloldódnak. Záratlan CDATA-nál a maradék normál szövegként. Lineáris, egy menetben.
 */
function decode(s) {
  if (!s) return '';
  let out = '';
  let i = 0;
  for (;;) {
    const a = s.indexOf('<![CDATA[', i);
    const b = a < 0 ? -1 : s.indexOf(']]>', a + 9);
    if (a < 0 || b < 0) {
      out += entities(s.slice(i));
      break;
    }
    out += entities(s.slice(i, a)) + s.slice(a + 9, b);
    i = b + 3;
  }
  return out.trim();
}

// Helyőrző „műsor” (adat nélküli forrás óránkénti kitöltése, pl. „No Data”): nem műsor – kimarad, így a csatornán
// a többi forrás valódi műsora látszik (különben a magasabb prioritású forrás helyőrzői eltakarnák)
const PLACEHOLDER_RX = /^\s*(no data|no (epg|programme|program) (data|information|info)|no information|nincs (műsor)?adat|nincs műsorinformáció|keine daten|sin datos|pas de données|to be announced|tba)\s*\.?\s*$/i;

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

// Attribútum (B07): idézőjeles vagy aposztrófos érték, szóköz az egyenlőségjel körül is lehet. Pontos név: a
// szöveg elején vagy szóköz után áll (a provider-id ne adja az id-t). A minták attribútumnevenként egyszer készülnek.
const ATTR_RX = new Map();
const attr = (s, name) => {
  let rx = ATTR_RX.get(name);
  if (!rx) ATTR_RX.set(name, (rx = new RegExp('(?:^|\\s)' + name.replace(/[^\w-]/g, '') + '\\s*=\\s*(?:"([^"]*)"|\'([^\']*)\')')));
  const m = rx.exec(s);
  return m ? decode(m[1] ?? m[2]) : '';
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
      const title = tag(body, 'title');
      // (U04) a helyőrző időhatárként még számít (a stop nélküli előző műsor vége), csak a végén esik ki
      const ph = PLACEHOLDER_RX.test(title);
      const row = [start, stop, title, tag(body, 'desc'), tag(body, 'category'), tag(body, 'sub-title'), tag(body, 'episode-num'), age];
      if (ph) row.ph = true;
      else count++;
      if (!programs.has(ch)) programs.set(ch, []);
      programs.get(ch).push(row);
    }
    for (const [k, all] of programs) {
      const list = all.sort((x, y) => x[0] - y[0]);
      // (B18) Előbb az azonos kezdetű bejegyzések összevonása: a használható vég és a hiányzó metaadatok is
      // megmaradnak; csak utána a hiányzó vég pótlása a következő ELTÉRŐ kezdésből (az utolsónál 1 óra), végül
      // a stop > start feltétel – így nem marad nulla hosszúságú (soha nem aktuális) műsor.
      const merged = [];
      for (const p of list) {
        const last = merged[merged.length - 1];
        // (azonos kezdésnél a valódi műsor elsőbbséget kap a helyőrzővel szemben)
        if (last && last[0] === p[0] && last.ph && !p.ph) {
          const keepStop = !(p[1] > p[0]) && last[1] > last[0] ? last[1] : p[1];
          merged[merged.length - 1] = p.slice();
          merged[merged.length - 1][1] = keepStop;
          continue;
        }
        if (last && last[0] === p[0] && !last.ph && p.ph) {
          if (!(last[1] > last[0]) && p[1] > p[0]) last[1] = p[1];
          continue;
        }
        if (last && last[0] === p[0]) {
          // (érvénytelen – nem a kezdés utáni – vég hiányzónak számít: egy későbbi érvényes vég felülírja)
          if (!(last[1] > last[0]) && p[1] > p[0]) last[1] = p[1];
          for (let j = 2; j < p.length; j++) if (!last[j] && p[j]) last[j] = p[j];
          continue;
        }
        const c = p.slice();
        if (p.ph) c.ph = true;
        merged.push(c);
      }
      for (let i = 0; i < merged.length; i++) if (!merged[i][1]) merged[i][1] = merged[i + 1] ? merged[i + 1][0] : merged[i][0] + 3600e3;
      programs.set(k, merged.filter((p) => !p.ph && p[1] > p[0] && p[1] > from && p[0] < to));
    }
    // Párosítás: csak a csatornalistában megtalált csatornák műsorai mennek vissza [[csatorna-id, műsorok], …]
    const matched = [];
    // a tévécsatornához nem párosított műsorújság-csatornák névkulcsai: a felület ezekből tudja, hogy egy újonnan
    // betöltött rádióadó egyáltalán párosítható-e (ha nem, nem kell a teljes műsorújságot újra feldolgozni)
    const radioKeys = new Set();
    if (index) {
      const seen = new Set();
      for (const epgId of new Set([...channels.keys(), ...programs.keys()])) {
        const progs = programs.get(epgId);
        if (!progs || !progs.length) continue;
        const names = channels.get(epgId) || [];
        const chId = resolve(epgId, names, index);
        if ((!chId || chId.startsWith('r:')) && radioKeys.size < 20000) {
          radioKeys.add(idKey(epgId).k);
          for (const n of names) radioKeys.add(stripSuffix(key(n)));
        }
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
    self.postMessage({ id, chunk: part, done: true, nChannels: channels.size, count, radioKeys: [...radioKeys] });
  } catch (err) {
    self.postMessage({ id, error: String(err) });
  }
};
