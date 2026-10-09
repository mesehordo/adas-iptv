'use strict';
// Fordítás a főfolyamatban (tálcamenü, értesítések, a felületre jutó hibaüzenetek). Ugyanazokat a
// szótárakat használja, mint a felület (src/i18n/<nyelv>.js – „export default { … }”, JSON-formában),
// a kulcs itt is a magyar szöveg. A nyelvet a felület adja meg (set-lang), és a beállításokból
// induláskor is beolvassuk.
const fs = require('fs');
const path = require('path');

let lang = 'hu';
let dict = null;

function setLang(l) {
  if (!/^[a-z]{2}$/.test(String(l || ''))) return;
  lang = l;
  dict = null;
  if (l === 'hu') return;
  try {
    const txt = fs.readFileSync(path.join(__dirname, 'src', 'i18n', `${l}.js`), 'utf8');
    dict = JSON.parse(txt.slice(txt.indexOf('{'), txt.lastIndexOf('}') + 1));
  } catch {
    dict = null;
  }
}

/** Fordítás; vars: { név: érték } a {név} helyőrzőkhöz. */
function _t(s, vars) {
  let r = (dict && Object.prototype.hasOwnProperty.call(dict, s) && dict[s]) || s;
  if (vars) r = r.replace(/\{(\w+)\}/g, (m, k) => (Object.prototype.hasOwnProperty.call(vars, k) ? String(vars[k]) : m));
  return r;
}

module.exports = { _t, setLang, getLang: () => lang };
