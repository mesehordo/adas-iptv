'use strict';
// Fordítás a főfolyamatban (tálcamenü, értesítések, a felületre jutó hibaüzenetek). Ugyanazokat a
// szótárakat használja, mint a felület (src/i18n/<nyelv>.js – „export default { … }”, JSON-formában),
// a kulcs itt is a magyar szöveg; hiányzó fordításnál az angol, ha az sincs, a magyar szöveg marad.
// A nyelvet a felület adja meg (set-lang), és a beállításokból induláskor is beolvassuk.
const fs = require('fs');
const path = require('path');

let lang = 'hu';
let dicts = [];

function readDict(l) {
  try {
    const txt = fs.readFileSync(path.join(__dirname, 'src', 'i18n', `${l}.js`), 'utf8');
    return JSON.parse(txt.slice(txt.indexOf('{'), txt.lastIndexOf('}') + 1));
  } catch {
    return null;
  }
}

function setLang(l) {
  if (!/^[a-z]{2}$/.test(String(l || ''))) return;
  lang = l;
  dicts = l === 'hu' ? [] : [readDict(l), l === 'en' ? null : readDict('en')].filter(Boolean);
}

/** Fordítás; vars: { név: érték } a {név} helyőrzőkhöz. */
function _t(s, vars) {
  const d = dicts.find((x) => Object.prototype.hasOwnProperty.call(x, s) && x[s]);
  let r = d ? d[s] : s;
  if (vars) r = r.replace(/\{(\w+)\}/g, (m, k) => (Object.prototype.hasOwnProperty.call(vars, k) ? String(vars[k]) : m));
  return r;
}

module.exports = { _t, setLang, getLang: () => lang };
