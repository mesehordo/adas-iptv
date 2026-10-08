// Letöltés és adás-ellenőrzés Node.js-ben, CORS-korlátozás nélkül.
// Szándékosan ES5: a régebbi webOS tévéken (4.x) Node 0.12 fut.
'use strict';

var http = require('http');
var https = require('https');
var zlib = require('zlib');
var urlm = require('url');

var DEFAULT_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36';

// Méretkorlátok (kicsomagolva is): egy kicsi, de erősen tömörített válasz se foglalhasson sokszoros memóriát.
var MAX_DOC = 256 * 1024 * 1024; // lista, műsorújság
var MAX_API = 32 * 1024 * 1024; // API-válasz, mentés

/** gzip kicsomagolása folyamként, a kimenet méretének korlátjával (a régi Node-ban nincs maxOutputLength). */
function gunzipLimited(buf, max, cb) {
  var g = zlib.createGunzip();
  var out = [];
  var size = 0;
  var ended = false;
  function fin(err, b) {
    if (ended) return;
    ended = true;
    cb(err, b);
  }
  g.on('data', function (c) {
    if (ended) return;
    size += c.length;
    if (size > max) {
      g.removeAllListeners('data');
      g.on('error', function () {});
      if (g.close) g.close();
      return fin(new Error('A kicsomagolt adat túl nagy'));
    }
    out.push(c);
  });
  g.on('end', function () {
    fin(null, Buffer.concat(out));
  });
  g.on('error', function (e) {
    fin(e);
  });
  g.end(buf);
}

/** A válasz törzse legfeljebb `max` bájtig; afölött a kérés megszakad. cb(err, buf) */
function collect(res, req, max, cb) {
  var chunks = [];
  var size = 0;
  var ended = false;
  function fin(err, b) {
    if (ended) return;
    ended = true;
    cb(err, b);
  }
  res.on('data', function (c) {
    size += c.length;
    if (size > max) {
      if (req) req.abort();
      return fin(new Error('Túl nagy válasz'));
    }
    chunks.push(c);
  });
  res.on('error', fin);
  res.on('end', function () {
    fin(null, Buffer.concat(chunks));
  });
}

var TLS_ERR = /CERT|SSL|TLS|SELF_SIGNED|UNABLE_TO|DEPTH_ZERO/i;

function request(url, opts, cb, redirects) {
  redirects = redirects || 0;
  var u = urlm.parse(url);
  var mod = u.protocol === 'https:' ? https : http;
  var headers = { 'User-Agent': opts.ua || DEFAULT_UA, 'Accept-Encoding': 'gzip', Accept: '*/*' };
  if (opts.referrer) headers.Referer = opts.referrer;
  var extra = opts.headers || {};
  Object.keys(extra).forEach(function (k) {
    headers[k] = extra[k];
  });
  var body = opts.body ? String(opts.body) : '';
  if (body) headers['Content-Length'] = Buffer.byteLength(body);
  var req = mod.request(
    {
      protocol: u.protocol,
      hostname: u.hostname,
      port: u.port,
      path: u.path,
      method: opts.method || 'GET',
      headers: headers,
      // Alapból ellenőrzött tanúsítvány. Csak a nyilvános listák / műsorújság letöltése próbálja újra
      // ellenőrzés nélkül, ha a régi tévé tanúsítványtára elavult (download: insecure).
      rejectUnauthorized: !opts.insecure,
    },
    function (res) {
      var loc = res.headers.location;
      if (res.statusCode >= 300 && res.statusCode < 400 && loc && redirects < 5) {
        res.resume();
        request(urlm.resolve(url, loc), opts, cb, redirects + 1);
        return;
      }
      cb(null, res, req, url); // a 4. paraméter a végső (átirányítás utáni) cím
    }
  );
  req.setTimeout(opts.timeout || 60000, function () {
    req.abort();
    cb(new Error('Időtúllépés'));
  });
  req.on('error', function (err) {
    cb(err);
  });
  req.end(body || undefined);
}

/** Általános kérés (pl. API-hívás POST-tal); a választ hibakódtól függetlenül szövegként adja vissza. */
function httpText(opts, cb) {
  var finished = false;
  function done(err, res) {
    if (finished) return;
    finished = true;
    cb(err, res);
  }
  // (API-hívás, mentés: mindig ellenőrzött tanúsítvánnyal)
  request(opts.url, { method: opts.method, headers: opts.headers, body: opts.body, timeout: 30000 }, function (err, res, req) {
    if (err) return done(err);
    collect(res, req, MAX_API, function (e, buf) {
      if (e) return done(e);
      var fin = function (b) {
        done(null, { status: res.statusCode, text: b.toString('utf8') });
      };
      if (buf.length > 2 && buf[0] === 0x1f && buf[1] === 0x8b) {
        gunzipLimited(buf, MAX_API, function (e2, out) {
          if (e2) return done(e2);
          fin(out);
        });
      } else fin(buf);
    });
  });
}

/** Teljes letöltés szövegként; a gzip-et (fájl vagy átviteli tömörítés) kibontja. */
function download(url, opts, cb) {
  var finished = false;
  function done(err, text) {
    if (finished) return;
    finished = true;
    cb(err, text);
  }
  opts = opts || {};
  request(url, opts, function (err, res, req) {
    if (err) {
      // elavult tanúsítványtár (régi tévé): a nyilvános letöltés még egyszer, ellenőrzés nélkül
      if (!opts.insecure && TLS_ERR.test(String(err.code || err.message))) {
        var o2 = {};
        Object.keys(opts).forEach(function (k) {
          o2[k] = opts[k];
        });
        o2.insecure = true;
        finished = true;
        return download(url, o2, cb);
      }
      return done(err);
    }
    if (res.statusCode >= 400) {
      res.resume();
      return done(new Error('HTTP ' + res.statusCode));
    }
    collect(res, req, MAX_DOC, function (e, buf) {
      if (e) return done(e);
      if (buf.length > 2 && buf[0] === 0x1f && buf[1] === 0x8b) {
        gunzipLimited(buf, MAX_DOC, function (e2, out) {
          if (e2) return done(e2);
          done(null, out.toString('utf8'));
        });
      } else {
        done(null, buf.toString('utf8'));
      }
    });
  });
}

/**
 * Él-e az adás – úgy, ahogy a lejátszó látja: HLS-nél a változatlistán és a médialistán át
 * egy valódi videószegmens elejét is letölti (földrajzi korlát, üres adás kiszűrése).
 */
function probe(item, cb, depth) {
  depth = depth || 0;
  var finished = false;
  function done(ok) {
    if (finished) return;
    finished = true;
    cb(ok);
  }
  // (az elérhetőség-próba csak azt nézi, jön-e adat – a régi tévék elavult tanúsítványtára miatt ellenőrzés nélkül)
  request(item.url, { ua: item.ua, referrer: item.referrer, timeout: 8000, insecure: true }, function (err, res, req, finalUrl) {
    if (err || !res) return done(false);
    var base = finalUrl || item.url;
    if (res.statusCode >= 400) {
      res.resume();
      return done(false);
    }
    var type = String(res.headers['content-type'] || '').toLowerCase();
    if (/video|mp2t|octet-stream|dash|audio/.test(type) && !/mpegurl/.test(type)) {
      req.abort();
      return done(true);
    }
    var stream = res;
    if (/gzip/.test(String(res.headers['content-encoding'] || ''))) stream = res.pipe(zlib.createGunzip());
    var got = '';
    var checked = false; // a lista feldolgozása (és a további kérés) csak egyszer indulhat el
    stream.on('data', function (c) {
      if (checked) return;
      got += c.toString('latin1');
      if (got.length >= 262144) {
        got = got.slice(0, 262144);
        req.abort();
        check();
      }
    });
    stream.on('end', check);
    stream.on('error', function () {
      done(false);
    });
    function check() {
      if (finished || checked) return;
      checked = true;
      // a megszakított kérés kicsomagolójában maradt adat se érkezzen már ide
      stream.removeAllListeners('data');
      stream.on('error', function () {});
      if (got.indexOf('<MPD') >= 0) return done(true);
      if (got.indexOf('#EXTM3U') < 0) return done(false);
      var lines = got.split(/\r?\n/).map(function (l) {
        return l.trim();
      });
      var uri = function (start) {
        for (var i = start; i < lines.length; i++) if (lines[i] && lines[i].charAt(0) !== '#') return lines[i];
        return null;
      };
      if (got.indexOf('#EXT-X-STREAM-INF') >= 0) {
        if (depth > 1) return done(false);
        var at = 0;
        for (; at < lines.length; at++) if (lines[at].indexOf('#EXT-X-STREAM-INF') === 0) break;
        var variant = uri(at + 1);
        if (!variant) return done(false);
        return probe({ url: urlm.resolve(base, variant), ua: item.ua, referrer: item.referrer }, done, depth + 1);
      }
      var segs = lines.filter(function (l) {
        return l && l.charAt(0) !== '#';
      });
      if (!segs.length) return done(false); // üres lista: most nem sugároz
      probeSegment(urlm.resolve(base, segs[segs.length - 1]), item, done);
    }
  });
}

/** Egy szegmens első bájtjai megérkeznek-e. */
function probeSegment(url, item, cb) {
  var finished = false;
  function done(ok) {
    if (finished) return;
    finished = true;
    cb(ok);
  }
  request(url, { ua: item.ua, referrer: item.referrer, timeout: 8000, insecure: true, headers: { Range: 'bytes=0-4095' } }, function (err, res, req) {
    if (err || !res) return done(false);
    if (res.statusCode !== 200 && res.statusCode !== 206) {
      res.resume();
      return done(false);
    }
    // A tartalom számít, nem a típusa (egyes adók .htm álcával küldik a videót); hibás csak a HTML / XML oldal.
    res.once('data', function (c) {
      req.abort();
      done(c.length > 0 && c.toString('latin1', 0, 64).replace(/^\s+/, '').charAt(0) !== '<');
    });
    res.on('end', function () {
      done(false);
    });
    res.on('error', function () {
      done(false);
    });
  });
}

function probeAll(items, concurrency, cb) {
  var results = {};
  var index = 0;
  var active = 0;
  if (!items.length) return cb(results);
  function next() {
    while (active < concurrency && index < items.length) {
      (function (item) {
        active++;
        probe(item, function (ok) {
          results[item.url] = ok;
          active--;
          if (index >= items.length && active === 0) cb(results);
          else next();
        });
      })(items[index++]);
    }
  }
  next();
}

module.exports = { download: download, probe: probe, probeAll: probeAll, httpText: httpText };
