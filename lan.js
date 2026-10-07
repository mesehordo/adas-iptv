'use strict';
// Helyi hálózati szolgáltatások az asztali változathoz:
//  - kis HTTP-kiszolgáló: adástovábbító (a kivetített adásokhoz CORS- és fejléc-gondok nélkül)
//    és a beállítások átadása másik eszköznek (pl. a tévének) egy rövid kóddal;
//  - kivetítés: Chromecast (mDNS-felderítés + Cast v2 protokoll) és DLNA / UPnP médialejátszók.

const http = require('http');
const os = require('os');
const dgram = require('dgram');
const tls = require('tls');
const crypto = require('crypto');
const { Readable } = require('stream');

const CHROME_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36';

let headersFor = () => null; // (url) => { ua, referrer } – a főfolyamat adja meg
let emit = () => {}; // (csatorna, adat) → a felületnek

function init(opts) {
  headersFor = opts.headersFor || headersFor;
  emit = opts.emit || emit;
}

// ---------------------------------------------------------------------------
// Hálózati címek
// ---------------------------------------------------------------------------
const VIRTUAL_NIC = /virtualbox|vmware|vethernet|hyper-v|docker|wsl|vboxnet|virbr|tailscale|zerotier|loopback/i;

function localIPv4s() {
  const real = [];
  const virtual = [];
  for (const [name, list] of Object.entries(os.networkInterfaces())) {
    for (const a of list || []) {
      if ((a.family === 'IPv4' || a.family === 4) && !a.internal && !a.address.startsWith('169.254.')) {
        // 192.168.56.x: a VirtualBox gazdagép-hálózatának alapértelmezett címe (a kártya neve gyakran csak „Ethernet 2”).
        (VIRTUAL_NIC.test(name) || a.address.startsWith('192.168.56.') ? virtual : real).push(a.address);
      }
    }
  }
  // A virtuális hálózati kártyák (VirtualBox, WSL…) címe a tévé felől nem érhető el.
  return real.length ? real : virtual;
}

/** Az a saját cím, amelyik ugyanabban az alhálózatban van, mint a megadott eszköz. */
function addressFor(host) {
  const ips = localIPv4s();
  const pre = (ip, n) => ip.split('.').slice(0, n).join('.');
  return ips.find((ip) => pre(ip, 3) === pre(host || '', 3)) || ips.find((ip) => pre(ip, 2) === pre(host || '', 2)) || ips[0] || '127.0.0.1';
}

// ---------------------------------------------------------------------------
// HTTP-kiszolgáló (igény szerint indul)
// ---------------------------------------------------------------------------
const TOKEN = crypto.randomBytes(9).toString('base64url'); // a továbbító csak ezzel a kulccsal használható
let server = null;
let serverPort = 0;
let share = null; // { code, data, expires }

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  res.setHeader('Access-Control-Expose-Headers', 'Content-Length, Content-Range');
}

async function ensureServer() {
  if (server) return serverPort;
  const srv = http.createServer((req, res) => handle(req, res).catch((err) => {
    if (!res.headersSent) {
      res.statusCode = 502;
      res.end(String(err.message || err));
    } else res.destroy();
  }));
  for (let port = 47800; port < 47830; port++) {
    try {
      await new Promise((resolve, reject) => {
        srv.once('error', reject);
        srv.listen(port, '0.0.0.0', () => {
          srv.removeListener('error', reject);
          resolve();
        });
      });
      server = srv;
      serverPort = port;
      return port;
    } catch {}
  }
  throw new Error('Nem sikerült helyi portot nyitni (47800–47829).');
}

async function handle(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.end();
  const u = new URL(req.url, 'http://x');
  const parts = u.pathname.split('/').filter(Boolean);

  // Beállítások átadása: /adas/share/<titok> (a kód = a gép címének utolsó száma + a titok)
  if (parts[0] === 'adas' && parts[1] === 'share') {
    if (!share || Date.now() > share.expires || parts[2] !== share.secret) {
      // találgatás ellen: 10 hibás kód után az átadás leáll
      if (share && ++share.fails >= 10) {
        share = null;
        emit('share-locked', {});
      }
      res.statusCode = 404;
      return res.end(JSON.stringify({ error: 'Hibás vagy lejárt kód' }));
    }
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    emit('share-used', { at: Date.now(), from: req.socket.remoteAddress });
    return res.end(share.json);
  }
  if (parts[0] === 'adas' && parts[1] === 'ping') {
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify({ app: 'adas', share: !!share && Date.now() < share.expires }));
  }
  // Távirányító telefonról: a vezérlőlap, az állapot és a parancsok (PIN-nel)
  if (parts[0] === 'adas' && parts[1] === 'remote') {
    res.setHeader('Content-Type', rc ? 'text/html; charset=utf-8' : 'text/plain; charset=utf-8');
    if (!rc) res.statusCode = 404;
    return res.end(rc ? rc.html : 'A távirányító ki van kapcsolva.');
  }
  if (parts[0] === 'adas' && parts[1] === 'rc') {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    if (!rc || rc.fails >= 30 || parts[2] !== rc.pin) {
      if (rc) rc.fails++;
      res.statusCode = 403;
      return res.end(JSON.stringify({ error: 'Hibás PIN' }));
    }
    rc.fails = 0;
    if (parts[3] === 'state') return res.end(rc.state);
    if (parts[3] === 'cmd') {
      emit('remote-cmd', { c: u.searchParams.get('c') || '', a: u.searchParams.get('a') || '' });
      return res.end('{"ok":true}');
    }
  }

  // Adástovábbító: /p/<kulcs>?u=<eredeti cím>
  if (parts[0] === 'p' && parts[1] === TOKEN) return proxy(req, res, u.searchParams.get('u'));
  res.statusCode = 404;
  res.end('Nem található');
}

// A továbbító csak olyan kiszolgálót kérdez le, amelyet maga az alkalmazás adott át kivetítésre (proxyUrl),
// vagy amelyre egy onnan kapott lejátszólista hivatkozik – így a kulccsal sem érhető el tetszőleges
// (pl. helyi hálózati) cím.
const allowedOrigins = new Set();
const allowOrigin = (url) => {
  try {
    const o = new URL(url).origin;
    if (allowedOrigins.size > 500) allowedOrigins.clear();
    allowedOrigins.add(o);
  } catch {}
};
const isAllowed = (url) => {
  try {
    return allowedOrigins.has(new URL(url).origin);
  } catch {
    return false;
  }
};
const proxied = (abs) => {
  allowOrigin(abs);
  return `/p/${TOKEN}?u=${encodeURIComponent(abs)}`;
};

function rewritePlaylist(text, base) {
  const abs = (x) => {
    try {
      return new URL(x, base).href;
    } catch {
      return x;
    }
  };
  return text
    .split(/\r?\n/)
    .map((line) => {
      const l = line.trim();
      if (!l) return line;
      if (l.startsWith('#')) return line.replace(/URI="([^"]+)"/g, (_m, x) => `URI="${proxied(abs(x))}"`);
      return proxied(abs(l));
    })
    .join('\n');
}

async function proxy(req, res, target) {
  if (!/^https?:\/\//i.test(target || '') || !isAllowed(target)) {
    res.statusCode = 403;
    return res.end('Nem engedélyezett cím');
  }
  const h = headersFor(target) || {};
  const headers = { 'User-Agent': h.ua || CHROME_UA };
  if (h.referrer) headers.Referer = h.referrer;
  if (req.headers.range) headers.Range = req.headers.range;
  const ctrl = new AbortController();
  req.on('close', () => ctrl.abort());
  const up = await fetch(target, { headers, redirect: 'follow', signal: ctrl.signal });
  const type = (up.headers.get('content-type') || '').toLowerCase();
  const looksList = /mpegurl/.test(type) || /\.m3u8?(\?|$)/i.test(new URL(up.url).pathname);
  if (looksList && up.ok) {
    const text = await up.text();
    if (text.trimStart().startsWith('#EXTM3U')) {
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
      res.setHeader('Cache-Control', 'no-cache');
      return res.end(rewritePlaylist(text, up.url));
    }
    res.statusCode = up.status;
    return res.end(text);
  }
  res.statusCode = up.status;
  for (const k of ['content-type', 'content-length', 'content-range', 'accept-ranges', 'last-modified', 'etag']) {
    const v = up.headers.get(k);
    if (v) res.setHeader(k, v);
  }
  if (req.method === 'HEAD' || !up.body) return res.end();
  Readable.fromWeb(up.body).on('error', () => res.destroy()).pipe(res);
}

/** A kivetítő eszköz által elérhető cím egy adáshoz. */
async function proxyUrl(target, deviceHost) {
  const port = await ensureServer();
  return `http://${addressFor(deviceHost)}:${port}${proxied(target)}`;
}

// ---------------------------------------------------------------------------
// Beállítások átadása
// ---------------------------------------------------------------------------
const ipRank = (ip) => (ip.startsWith('192.168.') ? 0 : ip.startsWith('10.') ? 1 : /^172\.(1[6-9]|2\d|3[01])\./.test(ip) ? 2 : 3);
const sortedIPs = () => localIPv4s().sort((a, b) => ipRank(a) - ipRank(b));

/**
 * Átadás indítása. A 6 jegyű kód első 3 számjegye a gép címének utolsó száma (a másik eszköz ebből és
 * a saját címéből tudja, hol keresse), a többi a titok. → { code, port, addresses, expires }
 */
async function shareStart(data, minutes = 15) {
  const port = await ensureServer();
  const ips = sortedIPs();
  const last = (ips[0] || '0.0.0.0').split('.').pop();
  const secret = String(crypto.randomInt(0, 1000)).padStart(3, '0');
  share = { secret, json: JSON.stringify(data), fails: 0, expires: Date.now() + minutes * 60e3 };
  return { code: last.padStart(3, '0') + secret, port, addresses: ips, expires: share.expires };
}

function shareStop() {
  share = null;
}

// ---------------------------------------------------------------------------
// Távirányító
// ---------------------------------------------------------------------------
let rc = null; // { pin, html, state, fails }
async function rcStart(html, pin) {
  const port = await ensureServer();
  rc = { pin: String(pin), html: String(html), state: rc?.state || '{}', fails: 0 };
  return { port, addresses: sortedIPs() };
}
function rcStop() {
  rc = null;
}
function rcState(json) {
  if (rc) rc.state = String(json);
}

/**
 * Több helyi cím párhuzamos lekérése rövid időkorláttal: az első 200-as válasz nyer; ha egyik sem, de egy
 * Adás válaszolt (hibás kód), az. → { status, text, url }
 */
async function lanGet(urls, timeout = 2500) {
  let miss = null;
  const one = async (url) => {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeout);
    try {
      const r = await fetch(url, { signal: ctrl.signal });
      clearTimeout(t);
      const text = await r.text();
      if (r.status === 200) return { status: 200, text, url };
      if (!miss && /kód/.test(text)) miss = { status: r.status, text, url };
    } catch {
      clearTimeout(t);
    }
    throw new Error('x');
  };
  try {
    return await Promise.any(urls.map(one));
  } catch {
    return miss || { status: 0, text: '', url: '' };
  }
}

// ---------------------------------------------------------------------------
// Felderítés: mDNS (Chromecast) és SSDP (DLNA / UPnP)
// ---------------------------------------------------------------------------
function dnsName(labels) {
  const parts = [];
  for (const l of labels) {
    const b = Buffer.from(l, 'utf8');
    parts.push(Buffer.from([b.length]), b);
  }
  parts.push(Buffer.from([0]));
  return Buffer.concat(parts);
}

function readName(buf, off) {
  const labels = [];
  let jumped = false;
  let end = off;
  for (let guard = 0; guard < 64; guard++) {
    const len = buf[off];
    if (len === undefined) break;
    if ((len & 0xc0) === 0xc0) {
      if (!jumped) end = off + 2;
      off = ((len & 0x3f) << 8) | buf[off + 1];
      jumped = true;
      continue;
    }
    if (len === 0) {
      if (!jumped) end = off + 1;
      break;
    }
    labels.push(buf.slice(off + 1, off + 1 + len).toString('utf8'));
    off += 1 + len;
  }
  return { name: labels.join('.'), end };
}

function parseDns(buf) {
  const qd = buf.readUInt16BE(4);
  const rrCount = buf.readUInt16BE(6) + buf.readUInt16BE(8) + buf.readUInt16BE(10);
  let off = 12;
  for (let i = 0; i < qd; i++) off = readName(buf, off).end + 4;
  const records = [];
  for (let i = 0; i < rrCount && off < buf.length; i++) {
    const n = readName(buf, off);
    off = n.end;
    const type = buf.readUInt16BE(off);
    const rdlen = buf.readUInt16BE(off + 8);
    const rd = off + 10;
    const r = { name: n.name, type };
    if (type === 12) r.ptr = readName(buf, rd).name;
    else if (type === 33) {
      r.port = buf.readUInt16BE(rd + 4);
      r.target = readName(buf, rd + 6).name;
    } else if (type === 16) {
      r.txt = {};
      let p = rd;
      while (p < rd + rdlen) {
        const l = buf[p];
        const s = buf.slice(p + 1, p + 1 + l).toString('utf8');
        const eq = s.indexOf('=');
        if (eq > 0) r.txt[s.slice(0, eq)] = s.slice(eq + 1);
        p += 1 + l;
      }
    } else if (type === 1) r.a = [...buf.slice(rd, rd + 4)].join('.');
    records.push(r);
    off = rd + rdlen;
  }
  return records;
}

function discoverChromecast(ms) {
  return new Promise((resolve) => {
    const found = new Map();
    const sock = dgram.createSocket({ type: 'udp4', reuseAddr: true });
    const finish = () => {
      try {
        sock.close();
      } catch {}
      resolve([...found.values()]);
    };
    sock.on('error', finish);
    sock.on('message', (msg, rinfo) => {
      let recs;
      try {
        recs = parseDns(msg);
      } catch {
        return;
      }
      const txt = recs.find((r) => r.txt && (r.txt.fn || r.txt.id));
      const srv = recs.find((r) => r.type === 33);
      const a = recs.find((r) => r.a);
      if (!txt && !srv) return;
      const host = a?.a || rinfo.address;
      const id = 'cc:' + (txt?.txt.id || host);
      found.set(id, {
        id,
        kind: 'chromecast',
        name: txt?.txt.fn || 'Chromecast',
        model: txt?.txt.md || 'Chromecast',
        host,
        port: srv?.port || 8009,
      });
    });
    sock.bind(0, () => {
      const q = Buffer.concat([
        Buffer.from([0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0]),
        dnsName(['_googlecast', '_tcp', 'local']),
        Buffer.from([0, 12, 0, 1]),
      ]);
      const send = () => {
        for (const ip of localIPv4s()) {
          try {
            sock.setMulticastInterface(ip);
          } catch {}
          sock.send(q, 5353, '224.0.0.251');
        }
        if (!localIPv4s().length) sock.send(q, 5353, '224.0.0.251');
      };
      send();
      setTimeout(send, 700);
      setTimeout(finish, ms);
    });
  });
}

const xmlTag = (xml, tag) => {
  const m = xml.match(new RegExp(`<(?:\\w+:)?${tag}[^>]*>([\\s\\S]*?)</(?:\\w+:)?${tag}>`, 'i'));
  return m ? m[1].trim() : '';
};
const xmlUnescape = (s) => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');

async function describeDlna(location) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 4000);
  try {
    const xml = await (await fetch(location, { signal: ctrl.signal })).text();
    const base = xmlTag(xml, 'URLBase') || location;
    const services = xml.match(/<service>[\s\S]*?<\/service>/gi) || [];
    const svc = (kind) => {
      const s = services.find((x) => new RegExp(`service:${kind}:`, 'i').test(xmlTag(x, 'serviceType')));
      return s ? { type: xmlTag(s, 'serviceType'), control: new URL(xmlTag(s, 'controlURL'), base).href } : null;
    };
    const av = svc('AVTransport');
    if (!av) return null;
    const host = new URL(location).hostname;
    return {
      id: 'dlna:' + (xmlTag(xml, 'UDN') || location),
      kind: 'dlna',
      name: xmlUnescape(xmlTag(xml, 'friendlyName')) || host,
      model: xmlUnescape([xmlTag(xml, 'manufacturer'), xmlTag(xml, 'modelName')].filter(Boolean).join(' ')),
      host,
      av,
      rc: svc('RenderingControl'),
    };
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

function discoverDlna(ms) {
  return new Promise((resolve) => {
    const locations = new Set();
    const sock = dgram.createSocket({ type: 'udp4', reuseAddr: true });
    const finish = async () => {
      try {
        sock.close();
      } catch {}
      const list = (await Promise.all([...locations].map(describeDlna))).filter(Boolean);
      const uniq = new Map(list.map((d) => [d.id, d]));
      resolve([...uniq.values()]);
    };
    sock.on('error', () => finish());
    sock.on('message', (msg) => {
      const m = msg.toString().match(/^location:\s*(\S+)/im);
      if (m) locations.add(m[1]);
    });
    sock.bind(0, () => {
      const q = Buffer.from(
        'M-SEARCH * HTTP/1.1\r\nHOST: 239.255.255.250:1900\r\nMAN: "ssdp:discover"\r\nMX: 2\r\n' +
          'ST: urn:schemas-upnp-org:device:MediaRenderer:1\r\n\r\n'
      );
      const send = () => {
        for (const ip of localIPv4s()) {
          try {
            sock.setMulticastInterface(ip);
          } catch {}
          sock.send(q, 1900, '239.255.255.250');
        }
      };
      send();
      setTimeout(send, 800);
      setTimeout(finish, ms);
    });
  });
}

let devices = new Map();
async function discover(ms = 3500) {
  const [cc, dl] = await Promise.all([discoverChromecast(ms), discoverDlna(ms)]);
  devices = new Map([...cc, ...dl].map((d) => [d.id, d]));
  return [...devices.values()].map(({ id, kind, name, model, host }) => ({ id, kind, name, model, host }));
}

// ---------------------------------------------------------------------------
// Chromecast: Cast v2 (TLS, 4 bájtos hossz + protobuf CastMessage)
// ---------------------------------------------------------------------------
const NS = {
  conn: 'urn:x-cast:com.google.cast.tp.connection',
  beat: 'urn:x-cast:com.google.cast.tp.heartbeat',
  recv: 'urn:x-cast:com.google.cast.receiver',
  media: 'urn:x-cast:com.google.cast.media',
};
const DEFAULT_RECEIVER = 'CC1AD845';

function varint(n) {
  const out = [];
  while (n > 127) {
    out.push((n & 127) | 128);
    n >>>= 7;
  }
  out.push(n);
  return Buffer.from(out);
}
function pbString(field, s) {
  const b = Buffer.from(s, 'utf8');
  return Buffer.concat([Buffer.from([(field << 3) | 2]), varint(b.length), b]);
}
function encodeCast(src, dst, ns, payload) {
  const body = Buffer.concat([
    Buffer.from([0x08, 0x00]), // protocol_version = CASTV2_1_0
    pbString(2, src),
    pbString(3, dst),
    pbString(4, ns),
    Buffer.from([0x28, 0x00]), // payload_type = STRING
    pbString(6, JSON.stringify(payload)),
  ]);
  const len = Buffer.alloc(4);
  len.writeUInt32BE(body.length);
  return Buffer.concat([len, body]);
}
function decodeCast(buf) {
  const out = {};
  let off = 0;
  const readVar = () => {
    let r = 0;
    let shift = 0;
    for (;;) {
      const b = buf[off++];
      r += (b & 127) * 2 ** shift;
      if (!(b & 128)) return r;
      shift += 7;
    }
  };
  while (off < buf.length) {
    const tag = readVar();
    const field = tag >> 3;
    const wire = tag & 7;
    if (wire === 0) out[field] = readVar();
    else if (wire === 2) {
      const len = readVar();
      out[field] = buf.slice(off, off + len);
      off += len;
    } else break;
  }
  return {
    source: out[2]?.toString(),
    dest: out[3]?.toString(),
    ns: out[4]?.toString(),
    data: out[6] ? JSON.parse(out[6].toString()) : null,
  };
}

class CastSession {
  constructor(dev) {
    this.dev = dev;
    this.reqId = 1;
    this.transportId = null;
    this.sessionId = null;
    this.mediaSessionId = null;
    this.waiters = [];
    this.closed = false;
  }

  connect() {
    return new Promise((resolve, reject) => {
      const sock = tls.connect({ host: this.dev.host, port: this.dev.port, rejectUnauthorized: false }, () => {
        this.send(NS.conn, 'receiver-0', { type: 'CONNECT' });
        this.beat = setInterval(() => this.send(NS.beat, 'receiver-0', { type: 'PING' }), 5000);
        resolve();
      });
      this.sock = sock;
      let buf = Buffer.alloc(0);
      sock.on('data', (chunk) => {
        buf = Buffer.concat([buf, chunk]);
        while (buf.length >= 4) {
          const len = buf.readUInt32BE(0);
          if (buf.length < 4 + len) break;
          const msg = buf.slice(4, 4 + len);
          buf = buf.slice(4 + len);
          try {
            this.onMessage(decodeCast(msg));
          } catch {}
        }
      });
      sock.on('error', (err) => {
        reject(err);
        this.close('hiba: ' + err.message);
      });
      sock.on('close', () => this.close('a kapcsolat megszakadt'));
      sock.setTimeout(8000, () => {
        if (!this.transportId) sock.destroy(new Error('időtúllépés'));
      });
    });
  }

  send(ns, dest, payload, src = 'sender-adas') {
    if (this.sock && !this.sock.destroyed) this.sock.write(encodeCast(src, dest, ns, payload));
  }

  request(ns, dest, payload, match, timeout = 12000) {
    const requestId = this.reqId++;
    this.send(ns, dest, { ...payload, requestId });
    return new Promise((resolve, reject) => {
      const w = { match: (m) => match(m, requestId), resolve, reject };
      this.waiters.push(w);
      setTimeout(() => {
        const i = this.waiters.indexOf(w);
        if (i >= 0) {
          this.waiters.splice(i, 1);
          reject(new Error('Az eszköz nem válaszolt'));
        }
      }, timeout);
    });
  }

  onMessage(m) {
    const d = m.data || {};
    if (m.ns === NS.beat && d.type === 'PING') return this.send(NS.beat, m.source, { type: 'PONG' }, m.dest);
    if (m.ns === NS.conn && d.type === 'CLOSE' && m.source === this.transportId) return this.close('a vevőalkalmazás bezárult');
    if (d.type === 'RECEIVER_STATUS') {
      const app = (d.status?.applications || []).find((a) => a.appId === DEFAULT_RECEIVER);
      if (this.transportId && !app) this.close('a kivetítés véget ért az eszközön');
      if (d.status?.volume) this.volume = d.status.volume.level;
    }
    if (d.type === 'MEDIA_STATUS' && d.status?.[0]) {
      const st = d.status[0];
      this.mediaSessionId = st.mediaSessionId;
      emit('cast-status', {
        id: this.dev.id,
        state: st.playerState, // PLAYING | PAUSED | BUFFERING | IDLE
        idle: st.idleReason || '',
        time: st.currentTime || 0,
        volume: this.volume,
      });
    }
    for (const w of [...this.waiters]) {
      if (w.match(m)) {
        this.waiters.splice(this.waiters.indexOf(w), 1);
        if (d.type === 'LOAD_FAILED' || d.type === 'LAUNCH_ERROR' || d.type === 'INVALID_REQUEST') w.reject(new Error(d.reason || d.type));
        else w.resolve(d);
      }
    }
  }

  async launch() {
    const st = await this.request(NS.recv, 'receiver-0', { type: 'LAUNCH', appId: DEFAULT_RECEIVER }, (m) =>
      m.data?.type === 'RECEIVER_STATUS' && (m.data.status?.applications || []).some((a) => a.appId === DEFAULT_RECEIVER) ||
      m.data?.type === 'LAUNCH_ERROR'
    );
    const app = st.status.applications.find((a) => a.appId === DEFAULT_RECEIVER);
    this.transportId = app.transportId;
    this.sessionId = app.sessionId;
    this.send(NS.conn, this.transportId, { type: 'CONNECT' });
  }

  async load({ url, contentType, live, title, subtitle, image }) {
    if (!this.transportId) await this.launch();
    await this.request(
      NS.media,
      this.transportId,
      {
        type: 'LOAD',
        sessionId: this.sessionId,
        autoplay: true,
        currentTime: 0,
        media: {
          contentId: url,
          contentType,
          streamType: live ? 'LIVE' : 'BUFFERED',
          metadata: { metadataType: 0, title, subtitle, images: image ? [{ url: image }] : [] },
        },
      },
      (m, id) => m.data?.requestId === id && ['MEDIA_STATUS', 'LOAD_FAILED', 'LOAD_CANCELLED', 'INVALID_REQUEST'].includes(m.data.type),
      20000
    );
  }

  control(action, value) {
    if (action === 'volume') return this.send(NS.recv, 'receiver-0', { type: 'SET_VOLUME', volume: { level: value }, requestId: this.reqId++ });
    if (!this.mediaSessionId) return;
    const types = { play: 'PLAY', pause: 'PAUSE', stop: 'STOP', seek: 'SEEK' };
    const p = { type: types[action], mediaSessionId: this.mediaSessionId, requestId: this.reqId++ };
    if (action === 'seek') p.currentTime = value;
    this.send(NS.media, this.transportId, p);
  }

  stop() {
    if (this.sessionId) this.send(NS.recv, 'receiver-0', { type: 'STOP', sessionId: this.sessionId, requestId: this.reqId++ });
    setTimeout(() => this.close(''), 300);
  }

  close(reason) {
    if (this.closed) return;
    this.closed = true;
    clearInterval(this.beat);
    try {
      this.sock?.destroy();
    } catch {}
    this.waiters.forEach((w) => w.reject(new Error(reason || 'lezárva')));
    this.waiters = [];
    if (active === this) {
      active = null;
      emit('cast-status', { id: this.dev.id, state: 'ENDED', reason });
    }
  }
}

// ---------------------------------------------------------------------------
// DLNA / UPnP AVTransport
// ---------------------------------------------------------------------------
const xmlEscape = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

async function soap(svc, action, args) {
  const body =
    '<?xml version="1.0" encoding="utf-8"?><s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/" s:encodingStyle="http://schemas.xmlsoap.org/soap/encoding/">' +
    `<s:Body><u:${action} xmlns:u="${svc.type}">` +
    Object.entries(args).map(([k, v]) => `<${k}>${xmlEscape(v)}</${k}>`).join('') +
    `</u:${action}></s:Body></s:Envelope>`;
  const res = await fetch(svc.control, {
    method: 'POST',
    headers: { 'Content-Type': 'text/xml; charset="utf-8"', SOAPACTION: `"${svc.type}#${action}"` },
    body,
  });
  const text = await res.text();
  if (!res.ok) throw new Error(xmlTag(text, 'errorDescription') || `${action}: HTTP ${res.status}`);
  return text;
}

class DlnaSession {
  constructor(dev) {
    this.dev = dev;
    this.closed = false;
  }
  async connect() {}
  async load({ url, contentType, title }) {
    const didl =
      '<DIDL-Lite xmlns="urn:schemas-upnp-org:metadata-1-0/DIDL-Lite/" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:upnp="urn:schemas-upnp-org:metadata-1-0/upnp/">' +
      `<item id="0" parentID="-1" restricted="1"><dc:title>${xmlEscape(title)}</dc:title><upnp:class>object.item.videoItem</upnp:class>` +
      `<res protocolInfo="http-get:*:${contentType}:*">${xmlEscape(url)}</res></item></DIDL-Lite>`;
    try {
      await soap(this.dev.av, 'Stop', { InstanceID: 0 });
    } catch {}
    await soap(this.dev.av, 'SetAVTransportURI', { InstanceID: 0, CurrentURI: url, CurrentURIMetaData: didl });
    await soap(this.dev.av, 'Play', { InstanceID: 0, Speed: 1 });
    clearInterval(this.poll);
    this.poll = setInterval(() => this.status(), 3000);
    emit('cast-status', { id: this.dev.id, state: 'BUFFERING' });
  }
  async status() {
    try {
      const x = await soap(this.dev.av, 'GetTransportInfo', { InstanceID: 0 });
      const s = xmlTag(x, 'CurrentTransportState');
      const map = { PLAYING: 'PLAYING', PAUSED_PLAYBACK: 'PAUSED', TRANSITIONING: 'BUFFERING', STOPPED: 'IDLE', NO_MEDIA_PRESENT: 'IDLE' };
      emit('cast-status', { id: this.dev.id, state: map[s] || s });
    } catch {}
  }
  control(action, value) {
    const run = {
      play: () => soap(this.dev.av, 'Play', { InstanceID: 0, Speed: 1 }),
      pause: () => soap(this.dev.av, 'Pause', { InstanceID: 0 }),
      stop: () => soap(this.dev.av, 'Stop', { InstanceID: 0 }),
      volume: () => this.dev.rc && soap(this.dev.rc, 'SetVolume', { InstanceID: 0, Channel: 'Master', DesiredVolume: Math.round(value * 100) }),
    }[action];
    return run?.().catch(() => {});
  }
  stop() {
    this.control('stop');
    this.close('');
  }
  close(reason) {
    if (this.closed) return;
    this.closed = true;
    clearInterval(this.poll);
    if (active === this) {
      active = null;
      emit('cast-status', { id: this.dev.id, state: 'ENDED', reason });
    }
  }
}

// ---------------------------------------------------------------------------
// Kivetítés – közös felület
// ---------------------------------------------------------------------------
let active = null;

function contentTypeOf(url, hint) {
  const p = url.toLowerCase().split('?')[0];
  if (hint === 'hls' || /\.m3u8?$/.test(p)) return 'application/x-mpegURL';
  if (hint === 'dash' || p.endsWith('.mpd')) return 'application/dash+xml';
  if (/\.(ts|m2ts)$/.test(p)) return 'video/mp2t';
  if (p.endsWith('.webm')) return 'video/webm';
  if (p.endsWith('.mkv')) return 'video/x-matroska';
  if (/\.(mp3|aac|m4a)$/.test(p)) return 'audio/mpeg';
  return 'video/mp4';
}

async function castPlay({ deviceId, url, type, live, title, subtitle, image }) {
  const dev = devices.get(deviceId);
  if (!dev) throw new Error('Az eszköz nem található – keresd újra.');
  if (active && active.dev.id !== deviceId) {
    active.stop();
    active = null;
  }
  if (!active) {
    const s = dev.kind === 'chromecast' ? new CastSession(dev) : new DlnaSession(dev);
    await s.connect();
    active = s;
  }
  const media = { url: await proxyUrl(url, dev.host), contentType: contentTypeOf(url, type), live, title, subtitle, image };
  await active.load(media);
  return { id: dev.id, name: dev.name, kind: dev.kind };
}

function castControl(action, value) {
  if (!active) return;
  if (action === 'disconnect') return active.stop();
  return active.control(action, value);
}

module.exports = { init, discover, castPlay, castControl, shareStart, shareStop, rcStart, rcStop, rcState, lanGet, sortedIPs, localIPv4s, proxyUrl };
