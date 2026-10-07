// Adás háttérszolgáltatás LG webOS TV-re (Luna-hívásokkal érhető el az alkalmazásból).
// Szándékosan ES5: a régebbi webOS tévéken (4.x) Node 0.12 fut.
'use strict';

var Service = require('webos-service');
var lib = require('./lib');

var service = new Service('hu.adas.tv.service');
var CHUNK = 256 * 1024; // egy Luna-válaszban átadott karakterek száma
var downloads = {};
var seq = 0;

function cleanup() {
  var now = Date.now();
  Object.keys(downloads).forEach(function (id) {
    if (now - downloads[id].at > 5 * 60 * 1000) delete downloads[id];
  });
}

function fail(message, err) {
  message.respond({ returnValue: false, errorText: String((err && err.message) || err) });
}

// fetch { url, ua?, referrer? } -> { id, length, chunkSize }
service.register('fetch', function (message) {
  var p = message.payload || {};
  if (!/^https?:\/\//.test(p.url || '')) return fail(message, 'Érvénytelen cím');
  lib.download(p.url, { ua: p.ua, referrer: p.referrer }, function (err, text) {
    if (err) return fail(message, err);
    cleanup();
    var id = String(++seq);
    downloads[id] = { text: text, at: Date.now() };
    message.respond({ returnValue: true, id: id, length: text.length, chunkSize: CHUNK });
  });
});

// chunk { id, offset } -> { data }
service.register('chunk', function (message) {
  var p = message.payload || {};
  var d = downloads[p.id];
  if (!d) return fail(message, 'Ismeretlen letöltés');
  var offset = Number(p.offset) || 0;
  var data = d.text.substr(offset, CHUNK);
  if (offset + CHUNK >= d.text.length) delete downloads[p.id];
  message.respond({ returnValue: true, data: data });
});

// request { method, url, headers, body } -> { status, text }  (pl. felirat-API hívásai)
service.register('request', function (message) {
  var p = message.payload || {};
  if (!/^https?:\/\//.test(p.url || '')) return fail(message, 'Érvénytelen cím');
  lib.httpText({ method: p.method || 'GET', url: p.url, headers: p.headers || {}, body: p.body || '' }, function (err, res) {
    if (err) return fail(message, err);
    message.respond({ returnValue: true, status: res.status, text: res.text });
  });
});

// probe { items: [{ url, ua?, referrer? }] } -> { results: { url: bool } }
service.register('probe', function (message) {
  var items = ((message.payload || {}).items || []).filter(function (x) {
    return x && /^https?:\/\//.test(x.url || '');
  });
  lib.probeAll(items, 8, function (results) {
    message.respond({ returnValue: true, results: results });
  });
});
