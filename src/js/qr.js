// QR-kód készítése (külső könyvtár nélkül): bájt mód, „M” (közepes, ~15%) hibajavítás, 1–10-es verzió
// (legfeljebb 213 bájt – egy helyi hálózati címhez és PIN-hez bőven elég). A szabvány (ISO/IEC 18004)
// lépései: adatfolyam → Reed–Solomon hibajavító kódok → blokkok összefésülése → elhelyezés a mátrixban
// → a legjobb maszk kiválasztása → formátum- és verzióinformáció.

// GF(256) aritmetika (primitív polinom: x^8 + x^4 + x^3 + x^2 + 1)
const EXP = new Uint8Array(512);
const LOG = new Uint8Array(256);
for (let i = 0, x = 1; i < 255; i++) {
  EXP[i] = x;
  LOG[x] = i;
  x <<= 1;
  if (x & 0x100) x ^= 0x11d;
}
for (let i = 255; i < 512; i++) EXP[i] = EXP[i - 255];
const mul = (a, b) => (a && b ? EXP[LOG[a] + LOG[b]] : 0);

/** Reed–Solomon generátorpolinom n hibajavító kódszóhoz (legmagasabb fokú tag elöl). */
function rsGenerator(n) {
  let g = [1];
  for (let i = 0; i < n; i++) {
    const next = new Array(g.length + 1).fill(0);
    for (let j = 0; j < g.length; j++) {
      next[j] ^= g[j];
      next[j + 1] ^= mul(g[j], EXP[i]);
    }
    g = next;
  }
  return g;
}
/** A hibajavító kódszavak (a data * x^n maradéka a generátorral osztva). */
function rsRemainder(data, n) {
  const g = rsGenerator(n);
  const rem = new Array(n).fill(0);
  for (const d of data) {
    const f = d ^ rem.shift();
    rem.push(0);
    for (let i = 0; i < n; i++) rem[i] ^= mul(g[i + 1], f);
  }
  return rem;
}

// „M” szint: verziónként a blokkok [darab, összes kódszó, adat-kódszó]
const BLOCKS = {
  1: [[1, 26, 16]], 2: [[1, 44, 28]], 3: [[1, 70, 44]], 4: [[2, 50, 32]], 5: [[2, 67, 43]],
  6: [[4, 43, 27]], 7: [[4, 49, 31]], 8: [[2, 60, 38], [2, 61, 39]], 9: [[3, 58, 36], [2, 59, 37]], 10: [[4, 69, 43], [1, 70, 44]],
};
// az igazítójelek középpontjai
const ALIGN = { 2: [6, 18], 3: [6, 22], 4: [6, 26], 5: [6, 30], 6: [6, 34], 7: [6, 22, 38], 8: [6, 24, 42], 9: [6, 26, 46], 10: [6, 28, 50] };
const dataCapacity = (v) => BLOCKS[v].reduce((s, [n, , d]) => s + n * d, 0);

/** Adatkódszavak: módjelző (bájt), hossz, adat, lezáró, kitöltés. */
function encodeData(bytes, v) {
  const bits = [];
  const put = (val, len) => {
    for (let i = len - 1; i >= 0; i--) bits.push((val >>> i) & 1);
  };
  put(0b0100, 4);
  put(bytes.length, v < 10 ? 8 : 16);
  for (const b of bytes) put(b, 8);
  const cap = dataCapacity(v) * 8;
  put(0, Math.min(4, cap - bits.length));
  while (bits.length % 8) bits.push(0);
  const out = [];
  for (let i = 0; i < bits.length; i += 8) out.push(bits.slice(i, i + 8).reduce((a, b) => (a << 1) | b, 0));
  for (let pad = 0xec; out.length < dataCapacity(v); pad ^= 0xec ^ 0x11) out.push(pad);
  return out;
}

/** Blokkokra bontás, hibajavító kódok, összefésülés → a mátrixba kerülő kódszavak. */
function interleave(data, v) {
  const blocks = [];
  let k = 0;
  for (const [n, total, d] of BLOCKS[v]) {
    for (let i = 0; i < n; i++) {
      const part = data.slice(k, k + d);
      k += d;
      blocks.push({ data: part, ec: rsRemainder(part, total - d) });
    }
  }
  const out = [];
  const maxD = Math.max(...blocks.map((b) => b.data.length));
  for (let i = 0; i < maxD; i++) for (const b of blocks) if (i < b.data.length) out.push(b.data[i]);
  for (let i = 0; i < blocks[0].ec.length; i++) for (const b of blocks) out.push(b.ec[i]);
  return out;
}

/** A mátrix: modules[y][x] (true = sötét), fn[y][x] (funkcionális modul – nem maszkoljuk) */
function buildMatrix(v, codewords, mask) {
  const size = 17 + 4 * v;
  const m = Array.from({ length: size }, () => new Array(size).fill(false));
  const fn = Array.from({ length: size }, () => new Array(size).fill(false));
  const set = (x, y, dark) => {
    m[y][x] = dark;
    fn[y][x] = true;
  };
  // időzítő sávok
  for (let i = 0; i < size; i++) {
    set(6, i, i % 2 === 0);
    set(i, 6, i % 2 === 0);
  }
  // keresőjelek (elválasztóval)
  const finder = (cx, cy) => {
    for (let dy = -4; dy <= 4; dy++)
      for (let dx = -4; dx <= 4; dx++) {
        const x = cx + dx;
        const y = cy + dy;
        if (x < 0 || y < 0 || x >= size || y >= size) continue;
        const d = Math.max(Math.abs(dx), Math.abs(dy));
        set(x, y, d !== 2 && d !== 4);
      }
  };
  finder(3, 3);
  finder(size - 4, 3);
  finder(3, size - 4);
  // igazítójelek
  const al = ALIGN[v] || [];
  for (const ay of al)
    for (const ax of al) {
      if ((ax === 6 && ay === 6) || (ax === 6 && ay === al[al.length - 1]) || (ax === al[al.length - 1] && ay === 6)) continue;
      for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) set(ax + dx, ay + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
    }
  // formátum (helyfoglalás – később írjuk), sötét modul
  const formatBits = (mk) => {
    const data = (0 << 3) | mk; // „M” szint: 00
    let rem = data;
    for (let i = 0; i < 10; i++) rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
    return ((data << 10) | rem) ^ 0x5412;
  };
  const drawFormat = (mk) => {
    const bits = formatBits(mk);
    const bit = (i) => ((bits >>> i) & 1) === 1;
    for (let i = 0; i <= 5; i++) set(8, i, bit(i));
    set(8, 7, bit(6));
    set(8, 8, bit(7));
    set(7, 8, bit(8));
    for (let i = 9; i < 15; i++) set(14 - i, 8, bit(i));
    for (let i = 0; i < 8; i++) set(size - 1 - i, 8, bit(i));
    for (let i = 8; i < 15; i++) set(8, size - 15 + i, bit(i));
    set(8, size - 8, true);
  };
  drawFormat(0);
  // verzióinformáció (7-estől)
  if (v >= 7) {
    let rem = v;
    for (let i = 0; i < 12; i++) rem = (rem << 1) ^ ((rem >>> 11) * 0x1f25);
    const bits = (v << 12) | rem;
    for (let i = 0; i < 18; i++) {
      const b = ((bits >>> i) & 1) === 1;
      const a = size - 11 + (i % 3);
      const c = Math.floor(i / 3);
      set(a, c, b);
      set(c, a, b);
    }
  }
  // adatok: cikcakkban, jobbról balra, két oszloponként (a 6. oszlop az időzítő sáv)
  let i = 0;
  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5;
    for (let vert = 0; vert < size; vert++)
      for (let j = 0; j < 2; j++) {
        const x = right - j;
        const upward = ((right + 1) & 2) === 0;
        const y = upward ? size - 1 - vert : vert;
        if (fn[y][x]) continue;
        if (i < codewords.length * 8) m[y][x] = ((codewords[i >>> 3] >>> (7 - (i & 7))) & 1) === 1;
        i++;
      }
  }
  // maszk
  const MASKS = [
    (x, y) => (x + y) % 2 === 0,
    (x, y) => y % 2 === 0,
    (x) => x % 3 === 0,
    (x, y) => (x + y) % 3 === 0,
    (x, y) => (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0,
    (x, y) => ((x * y) % 2) + ((x * y) % 3) === 0,
    (x, y) => (((x * y) % 2) + ((x * y) % 3)) % 2 === 0,
    (x, y) => (((x + y) % 2) + ((x * y) % 3)) % 2 === 0,
  ];
  const fmask = MASKS[mask];
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) if (!fn[y][x] && fmask(x, y)) m[y][x] = !m[y][x];
  drawFormat(mask);
  return m;
}

/** Büntetőpontok (a szabvány 4 szabálya) – a legkisebb pontszámú maszk a legjobban olvasható. */
function penalty(m) {
  const size = m.length;
  let p = 0;
  const lines = [];
  for (let y = 0; y < size; y++) lines.push(m[y]);
  for (let x = 0; x < size; x++) lines.push(m.map((r) => r[x]));
  for (const line of lines) {
    // 1. azonos színű sorozatok (5 vagy több)
    let run = 1;
    for (let i = 1; i <= size; i++) {
      if (i < size && line[i] === line[i - 1]) run++;
      else {
        if (run >= 5) p += 3 + (run - 5);
        run = 1;
      }
    }
    // 3. keresőjelhez hasonló minta
    const s = line.map((b) => (b ? '1' : '0')).join('');
    for (const pat of ['10111010000', '00001011101']) for (let i = s.indexOf(pat); i >= 0; i = s.indexOf(pat, i + 1)) p += 40;
  }
  // 2. 2×2-es egyszínű négyzetek
  for (let y = 0; y < size - 1; y++) for (let x = 0; x < size - 1; x++) if (m[y][x] === m[y][x + 1] && m[y][x] === m[y + 1][x] && m[y][x] === m[y + 1][x + 1]) p += 3;
  // 4. a sötét modulok aránya
  let dark = 0;
  for (const r of m) for (const b of r) if (b) dark++;
  const total = size * size;
  p += (Math.ceil(Math.abs(dark * 20 - total * 10) / total) - 1) * 10;
  return p;
}

/** QR-mátrix egy szövegből → { size, modules: boolean[][] } */
export function qrMatrix(text) {
  const bytes = [...new TextEncoder().encode(String(text))];
  let v = 1;
  while (v <= 10 && dataCapacity(v) < bytes.length + (v < 10 ? 2 : 3)) v++;
  if (v > 10) throw new Error('Túl hosszú szöveg a QR-kódhoz');
  const codewords = interleave(encodeData(bytes, v), v);
  let best = null;
  for (let mask = 0; mask < 8; mask++) {
    const m = buildMatrix(v, codewords, mask);
    const pen = penalty(m);
    if (!best || pen < best.pen) best = { m, pen };
  }
  return { size: best.m.length, modules: best.m };
}

/** QR-kód SVG-ként (4 modulnyi csendes zónával) – sötét modul: currentColor, háttér: fehér. */
export function qrSvg(text, { px = 6, dark = '#000', light = '#fff' } = {}) {
  const { size, modules } = qrMatrix(text);
  const q = 4;
  const n = size + 2 * q;
  let d = '';
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) if (modules[y][x]) d += `M${x + q} ${y + q}h1v1h-1z`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${n} ${n}" width="${n * px}" height="${n * px}" shape-rendering="crispEdges" role="img"><rect width="${n}" height="${n}" fill="${light}"/><path d="${d}" fill="${dark}"/></svg>`;
}
