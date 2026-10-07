// Egyszerű ZIP-kibontó (tárolt és „deflate” tömörítésű tételek) a böngésző saját
// DecompressionStream-jével. Lejátszólista-csomagok (pl. egy mappányi .m3u8) importjához.

const CP437_HI =
  'ÇüéâäàåçêëèïîìÄÅÉæÆôöòûùÿÖÜ¢£¥₧ƒáíóúñÑªº¿⌐¬½¼¡«»░▒▓│┤╡╢╖╕╣║╗╝╜╛┐└┴┬├─┼╞╟╚╔╩╦╠═╬╧╨╤╥╙╘╒╓╫╪┘┌█▄▌▐▀αßΓπΣσµτΦΘΩδ∞φε∩≡±≥≤⌠⌡÷≈°∙·√ⁿ²■ ';

function decodeName(bytes, utf8Flag) {
  if (utf8Flag) return new TextDecoder('utf-8').decode(bytes);
  try {
    // Sok program jelölés nélkül is UTF-8-at ír.
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    let s = '';
    for (const b of bytes) s += b < 128 ? String.fromCharCode(b) : CP437_HI[b - 128];
    return s;
  }
}

async function inflateRaw(data) {
  if (typeof DecompressionStream === 'undefined') throw new Error('Ezen az eszközön a ZIP nem bontható ki – csomagold ki, és a fájlokat add hozzá.');
  const ds = new DecompressionStream('deflate-raw');
  const out = new Response(new Blob([data]).stream().pipeThrough(ds));
  return new Uint8Array(await out.arrayBuffer());
}

export const isZip = (bytes) => bytes && bytes.length > 4 && bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 3 && bytes[3] === 4;

/** ZIP → [{ name, path, bytes }] (mappák nélkül). A `want(path)` szűrő szerint bont ki. */
export async function unzip(buf, want = () => true) {
  const u8 = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  const dv = new DataView(u8.buffer, u8.byteOffset, u8.byteLength);
  // A központi könyvtár vége (EOCD) a fájl utolsó ~64 kB-jában
  let eocd = -1;
  for (let i = u8.length - 22; i >= Math.max(0, u8.length - 65557); i--) {
    if (dv.getUint32(i, true) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new Error('Hibás vagy nem ZIP fájl.');
  const count = dv.getUint16(eocd + 10, true);
  let p = dv.getUint32(eocd + 16, true);
  const out = [];
  for (let n = 0; n < count; n++) {
    if (dv.getUint32(p, true) !== 0x02014b50) throw new Error('Hibás ZIP-könyvtár.');
    const flags = dv.getUint16(p + 8, true);
    const method = dv.getUint16(p + 10, true);
    const csize = dv.getUint32(p + 20, true);
    const nameLen = dv.getUint16(p + 28, true);
    const extraLen = dv.getUint16(p + 30, true);
    const commentLen = dv.getUint16(p + 32, true);
    const local = dv.getUint32(p + 42, true);
    const path = decodeName(u8.subarray(p + 46, p + 46 + nameLen), flags & 0x800);
    p += 46 + nameLen + extraLen + commentLen;
    if (path.endsWith('/') || !want(path)) continue;
    if (flags & 1) throw new Error('Jelszóval védett ZIP nem támogatott.');
    const lNameLen = dv.getUint16(local + 26, true);
    const lExtraLen = dv.getUint16(local + 28, true);
    const start = local + 30 + lNameLen + lExtraLen;
    const raw = u8.subarray(start, start + csize);
    let bytes;
    if (method === 0) bytes = raw;
    else if (method === 8) bytes = await inflateRaw(raw);
    else throw new Error(`Nem támogatott tömörítés a ZIP-ben (${method}).`);
    out.push({ path, name: path.split('/').pop(), bytes });
  }
  return out;
}

/** Bájtok → szöveg (UTF-8, BOM nélkül; ha nem érvényes UTF-8, Windows-1250 / Latin-2). */
export function bytesToText(bytes) {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes).replace(/^﻿/, '');
  } catch {
    try {
      return new TextDecoder('windows-1250').decode(bytes);
    } catch {
      return new TextDecoder('latin1').decode(bytes);
    }
  }
}
