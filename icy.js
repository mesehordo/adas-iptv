// Rádió – „most szól”: az adás ICY-metaadatának (StreamTitle) kiolvasása. Egy rövid kérés az
// `Icy-MetaData: 1` fejléccel: a kiszolgáló minden `icy-metaint` bájt hang után egy metaadat-blokkot küld;
// az első blokkig olvasunk, aztán a kapcsolat bezárul. (A böngészőmotor ezt a fejlécet nem küldheti el.)
const lan = require('./lan');

const MAX_METAINT = 256 * 1024; // ennél ritkábban küldött metaadatra nem várunk
const TIMEOUT = 8000;

// a nem UTF-8 címek kódolása: közép-európai adóknál windows-1250 (ő, ű), egyébként windows-1252
const CE = new Set(['HU', 'PL', 'CZ', 'SK', 'SI', 'HR', 'RO', 'RS', 'BA', 'AL']);
function decode(bytes, country) {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    try {
      return new TextDecoder(CE.has(String(country || '').toUpperCase()) ? 'windows-1250' : 'windows-1252').decode(bytes);
    } catch {
      return Buffer.from(bytes).toString('latin1');
    }
  }
}

/** Az adás címe → a most szóló szám címe ('' ha az adó nem küld ilyet). country: a kódolás tippjéhez. */
async function icyTitle(url, country = '') {
  if (typeof url !== 'string' || !/^https?:\/\//i.test(url)) return '';
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), TIMEOUT);
  let reader = null;
  try {
    const { res } = await lan.fetchPolicy(url, { headers: { 'Icy-MetaData': '1', 'User-Agent': 'Adas/1.0' }, signal: ctl.signal });
    const metaint = Number(res.headers.get('icy-metaint'));
    if (!res.ok || !res.body || !(metaint > 0) || metaint > MAX_METAINT) return '';
    reader = res.body.getReader();
    let buf = Buffer.alloc(0);
    while (buf.length < metaint + 1) {
      const { value, done } = await reader.read();
      if (done) return '';
      buf = Buffer.concat([buf, Buffer.from(value)]);
    }
    const len = buf[metaint] * 16;
    if (!len) return '';
    while (buf.length < metaint + 1 + len) {
      const { value, done } = await reader.read();
      if (done) break;
      buf = Buffer.concat([buf, Buffer.from(value)]);
    }
    const meta = decode(buf.subarray(metaint + 1, metaint + 1 + len), country).replace(/\0+$/, '');
    const m = /StreamTitle='(.*?)';/s.exec(meta);
    return m ? m[1].trim().slice(0, 300) : '';
  } catch {
    return '';
  } finally {
    clearTimeout(timer);
    try {
      await reader?.cancel();
    } catch {}
    ctl.abort();
  }
}

module.exports = { icyTitle };
