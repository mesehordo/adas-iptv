// XMLTV feldolgozás háttérszálon. Bemenet: { id, text, from, to }.
// Kimenet: { id, channels: { epgId: [megjelenített nevek] }, programs: { epgId: [[start, stop, cím, leírás, kategória, alcím, epizód]] } }

const ENT = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };
function decode(s) {
  if (!s) return '';
  s = s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1');
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
  const m = new RegExp('\\b' + name + '="([^"]*)"').exec(s);
  return m ? decode(m[1]) : '';
};
const tag = (s, name) => {
  const m = new RegExp('<' + name + '\\b[^>]*>([\\s\\S]*?)</' + name + '>').exec(s);
  return m ? decode(m[1]) : '';
};

self.onmessage = (e) => {
  const { id, text, from, to } = e.data;
  try {
    // prototípus nélküli objektumok: a fájlból jövő azonosító (pl. „__proto__”) ne írhasson felül semmit
    const channels = Object.create(null);
    for (const m of text.matchAll(/<channel\s+id="([^"]*)"[^>]*>([\s\S]*?)<\/channel>/g)) {
      const names = [...m[2].matchAll(/<display-name[^>]*>([\s\S]*?)<\/display-name>/g)].map((x) => decode(x[1]));
      channels[decode(m[1])] = names;
    }
    const programs = Object.create(null);
    let count = 0;
    for (const m of text.matchAll(/<programme\s([^>]*?)(?:\/>|>([\s\S]*?)<\/programme>)/g)) {
      const a = m[1];
      const start = parseTime(attr(a, 'start'));
      let stop = parseTime(attr(a, 'stop'));
      if (!Number.isFinite(start)) continue;
      if (!Number.isFinite(stop)) stop = 0; // a „stop” elhagyható: a következő műsor kezdete lesz
      if (stop && !(stop > from && start < to)) continue;
      const ch = attr(a, 'channel');
      const body = m[2] || '';
      // korhatár: <rating><value>12</value></rating> („16+”, „PG-13” is) → szám
      const rt = /<rating\b[^>]*>[\s\S]*?<value>\s*([^<]*?)\s*<\/value>/.exec(body);
      const age = rt ? Number((/(\d{1,2})/.exec(rt[1]) || [])[1]) || 0 : 0;
      const row = [start, stop, tag(body, 'title'), tag(body, 'desc'), tag(body, 'category'), tag(body, 'sub-title'), tag(body, 'episode-num'), age];
      (programs[ch] ||= []).push(row);
      count++;
    }
    for (const k in programs) {
      const list = programs[k].sort((x, y) => x[0] - y[0]);
      // Hiányzó vég: a következő műsor kezdete (az utolsónál 1 óra); ismétlődő kezdés kiszűrése.
      for (let i = 0; i < list.length; i++) if (!list[i][1]) list[i][1] = list[i + 1] ? list[i + 1][0] : list[i][0] + 3600e3;
      programs[k] = list.filter((p, i) => p[1] > from && p[0] < to && (i === 0 || p[0] !== list[i - 1][0]));
    }
    self.postMessage({ id, channels, programs, count });
  } catch (err) {
    self.postMessage({ id, error: String(err) });
  }
};
