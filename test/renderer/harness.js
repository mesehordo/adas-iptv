// Kis tesztkeret a felület (renderer) tesztjeihez: a valódi Electron-ablakban, ugyanazokkal a modulpéldányokkal
// fut, mint az alkalmazás (tools/run-tests.mjs indítja). test(név, fn) – fn lehet async; assert: alapellenőrzések.
const tests = [];
export const test = (name, fn) => tests.push({ name, fn });

const fmt = (v) => {
  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
};
export const assert = {
  ok(v, msg = 'nem igaz') {
    if (!v) throw new Error(msg);
  },
  equal(a, b, msg = '') {
    if (!Object.is(a, b)) throw new Error(`${msg ? msg + ': ' : ''}${fmt(a)} !== ${fmt(b)}`);
  },
  deepEqual(a, b, msg = '') {
    if (fmt(a) !== fmt(b)) throw new Error(`${msg ? msg + ': ' : ''}${fmt(a)} ≠ ${fmt(b)}`);
  },
  match(s, rx, msg = '') {
    if (!rx.test(String(s))) throw new Error(`${msg ? msg + ': ' : ''}${fmt(s)} nem illeszkedik: ${rx}`);
  },
  throws(fn, msg = 'nem dobott hibát') {
    try {
      fn();
    } catch {
      return;
    }
    throw new Error(msg);
  },
  async rejects(p, msg = 'nem utasította el') {
    try {
      await (typeof p === 'function' ? p() : p);
    } catch {
      return;
    }
    throw new Error(msg);
  },
};

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Minden bejegyzett teszt futtatása → [{ name, ok, error, ms }] */
export async function run() {
  const out = [];
  for (const t of tests) {
    console.log('@@T ' + t.name); // (az önteszt-futtató ebből tudja, melyik teszt fut)
    const t0 = performance.now();
    try {
      await t.fn();
      out.push({ name: t.name, ok: true, ms: Math.round(performance.now() - t0) });
    } catch (err) {
      out.push({ name: t.name, ok: false, error: String(err?.stack || err).split('\n').slice(0, 4).join('\n'), ms: Math.round(performance.now() - t0) });
    }
  }
  return out;
}
