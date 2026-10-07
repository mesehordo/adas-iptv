// Pótlások a régebbi webOS böngészőmotorokhoz (webOS 4.x = Chromium 53, 5.x = Chromium 68).
// A szintaxist az esbuild alakítja át; itt csak a hiányzó beépített függvényeket pótoljuk.
/* eslint-disable no-extend-native */

function define(obj, name, value) {
  if (obj && !obj[name]) Object.defineProperty(obj, name, { value, configurable: true, writable: true });
}

define(Object, 'entries', (o) => Object.keys(o).map((k) => [k, o[k]]));
define(Object, 'values', (o) => Object.keys(o).map((k) => o[k]));
define(Object, 'fromEntries', (it) => {
  const o = {};
  for (const [k, v] of it) o[k] = v;
  return o;
});

define(Array.prototype, 'flat', function (depth = 1) {
  return depth > 0
    ? this.reduce((acc, v) => acc.concat(Array.isArray(v) ? v.flat(depth - 1) : v), [])
    : this.slice();
});
define(Array.prototype, 'flatMap', function (fn, thisArg) {
  return this.map(fn, thisArg).flat(1);
});

define(String.prototype, 'matchAll', function (re) {
  const flags = re.flags !== undefined ? re.flags : (re.global ? 'g' : '') + (re.ignoreCase ? 'i' : '') + (re.multiline ? 'm' : '');
  const rx = new RegExp(re.source, flags.indexOf('g') >= 0 ? flags : flags + 'g');
  const str = String(this);
  const out = [];
  let m;
  while ((m = rx.exec(str)) !== null) {
    out.push(m);
    if (m[0] === '') rx.lastIndex++;
  }
  return out[Symbol.iterator]();
});
define(String.prototype, 'padStart', function (len, fill = ' ') {
  let s = String(this);
  while (s.length < len) s = fill + s;
  return s.slice(-len);
});

define(Promise.prototype, 'finally', function (fn) {
  return this.then(
    (v) => Promise.resolve(fn()).then(() => v),
    (e) =>
      Promise.resolve(fn()).then(() => {
        throw e;
      })
  );
});

// DOM (a háttérszálon nincs)
if (typeof Element !== 'undefined') {
  const nodes = (args) =>
    args.map((n) => (typeof n === 'string' ? document.createTextNode(n) : n));
  const protos = [Element.prototype, Document.prototype, DocumentFragment.prototype];
  for (const p of protos) {
    define(p, 'append', function (...args) {
      for (const n of nodes(args)) this.appendChild(n);
    });
    define(p, 'prepend', function (...args) {
      const first = this.firstChild;
      for (const n of nodes(args)) this.insertBefore(n, first);
    });
  }
  for (const p of [Element.prototype, CharacterData.prototype]) {
    define(p, 'replaceWith', function (...args) {
      const parent = this.parentNode;
      if (!parent) return;
      const frag = document.createDocumentFragment();
      for (const n of nodes(args)) frag.appendChild(n);
      parent.replaceChild(frag, this);
    });
    define(p, 'remove', function () {
      if (this.parentNode) this.parentNode.removeChild(this);
    });
  }
  define(Element.prototype, 'scrollBy', function (a, b) {
    if (typeof a === 'object') {
      this.scrollLeft += a.left || 0;
      this.scrollTop += a.top || 0;
    } else {
      this.scrollLeft += a || 0;
      this.scrollTop += b || 0;
    }
  });
  define(Element.prototype, 'toggleAttribute', function (name, force) {
    const on = force === undefined ? !this.hasAttribute(name) : force;
    if (on) this.setAttribute(name, '');
    else this.removeAttribute(name);
    return on;
  });
  if (!window.CSS) window.CSS = {};
  define(window.CSS, 'escape', (s) => String(s).replace(/[^a-zA-Z0-9_ -￿-]/g, (c) => '\\' + c));
}
