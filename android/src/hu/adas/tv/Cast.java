package hu.adas.tv;

import android.content.Context;
import android.content.SharedPreferences;
import android.net.wifi.WifiManager;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.DataInputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.DatagramPacket;
import java.net.HttpURLConnection;
import java.net.InetAddress;
import java.net.MulticastSocket;
import java.net.SocketTimeoutException;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.security.cert.X509Certificate;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;

import javax.net.ssl.SSLContext;
import javax.net.ssl.SSLSocket;
import javax.net.ssl.TrustManager;
import javax.net.ssl.X509TrustManager;

/**
 * (F04) Kivetítés Androidról – az asztali változat (lan.js) megfelelője, Google-szolgáltatások nélkül:
 *  - Chromecast: felderítés mDNS-sel (_googlecast._tcp), Cast v2 protokoll TLS-en (4 bájtos hossz + protobuf
 *    CastMessage), az alapértelmezett médiavevő (CC1AD845); a saját aláírású tanúsítvány ujjlenyomatát az első
 *    kapcsolódáskor eszközönként megjegyezzük, később csak ugyanazzal kapcsolódunk (álcázott eszköz ellen);
 *  - DLNA / UPnP: felderítés SSDP-vel (MediaRenderer), vezérlés SOAP-pal (AVTransport, RenderingControl);
 *  - az adás a vevőnek a LanServer munkamenethez kötött közvetítőjén át megy (a saját fejlécek – User-Agent,
 *    Referer – így is érvényesek, és a vevő csak ezt az egy adást érheti el, csak a saját címéről).
 * Az állapot a felületnek: window.__adasCastStatus({ id, state: PLAYING|PAUSED|BUFFERING|IDLE|ENDED, … }).
 */
final class Cast {
  private Cast() {}

  static final String DEFAULT_RECEIVER = "CC1AD845";
  static final String NS_CONN = "urn:x-cast:com.google.cast.tp.connection";
  static final String NS_BEAT = "urn:x-cast:com.google.cast.tp.heartbeat";
  static final String NS_RECV = "urn:x-cast:com.google.cast.receiver";
  static final String NS_MEDIA = "urn:x-cast:com.google.cast.media";
  static final String PINS = "adas-cast-pins";

  static final Map<String, JSONObject> devices = new ConcurrentHashMap<>();
  static volatile Session active;
  static MainActivity act;

  /** (H29) a kivetített tartalom munkamenete (a felülettől): minden állapotüzenet ezzel megy, a régit a felület eldobja */
  static volatile int castGen;
  /** (U11) a kivetítési kérés sorszáma (leállításkor / újabb kérésnél nő) és a még csatlakozó munkamenet */
  static volatile int castOp;
  static volatile Session connecting;

  static void emit(JSONObject o) {
    MainActivity a = act;
    if (a == null) return;
    try {
      o.put("gen", castGen);
    } catch (Exception ignored) {
    }
    final String js = "window.__adasCastStatus&&window.__adasCastStatus(" + o + ")";
    a.runOnUiThread(() -> a.web.evaluateJavascript(js, null));
  }

  /** (H14) UPnP-időformátum: másodperc → „H:MM:SS”, ill. vissza (érvénytelen → -1). */
  static String toHms(double sec) {
    long t = Math.max(0, (long) Math.floor(sec));
    return String.format(java.util.Locale.ROOT, "%d:%02d:%02d", t / 3600, (t / 60) % 60, t % 60);
  }

  static double fromHms(String s) {
    java.util.regex.Matcher m = java.util.regex.Pattern.compile("^(\\d+):(\\d{1,2}):(\\d{1,2})(?:\\.\\d+)?$").matcher(s == null ? "" : s.trim());
    return m.matches() ? Long.parseLong(m.group(1)) * 3600 + Long.parseLong(m.group(2)) * 60 + Long.parseLong(m.group(3)) : -1;
  }

  static void emitState(String id, String state, String reason) {
    try {
      JSONObject o = new JSONObject().put("id", id).put("state", state);
      if (reason != null) o.put("reason", reason);
      emit(o);
    } catch (Exception ignored) {
    }
  }

  // --------------------------------------------------------------------------------- felderítés
  static JSONArray discover(Context ctx, int ms) throws Exception {
    WifiManager wm = (WifiManager) ctx.getApplicationContext().getSystemService(Context.WIFI_SERVICE);
    WifiManager.MulticastLock lock = wm != null ? wm.createMulticastLock("adas-cast") : null;
    if (lock != null) {
      lock.setReferenceCounted(false);
      lock.acquire();
    }
    try {
      final List<JSONObject> cc = new CopyOnWriteArrayList<>();
      final List<JSONObject> dl = new CopyOnWriteArrayList<>();
      Thread a = new Thread(() -> discoverChromecast(ms, cc));
      Thread b = new Thread(() -> discoverDlna(ms, dl));
      a.start();
      b.start();
      a.join(ms + 6000);
      b.join(ms + 6000);
      devices.clear();
      JSONArray out = new JSONArray();
      for (JSONObject d : cc) devices.put(d.getString("id"), d);
      for (JSONObject d : dl) devices.put(d.getString("id"), d);
      for (JSONObject d : devices.values())
        out.put(new JSONObject().put("id", d.getString("id")).put("kind", d.getString("kind")).put("name", d.optString("name")).put("model", d.optString("model")).put("host", d.getString("host")));
      return out;
    } finally {
      if (lock != null) lock.release();
    }
  }

  static boolean privateHost(String ip) {
    return ip.startsWith("192.168.") || ip.startsWith("10.") || ip.matches("^172\\.(1[6-9]|2\\d|3[01])\\..*") || ip.startsWith("169.254.");
  }

  static byte[] dnsQuery() {
    ByteArrayOutputStream b = new ByteArrayOutputStream();
    byte[] head = {0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0};
    b.write(head, 0, head.length);
    for (String l : new String[] {"_googlecast", "_tcp", "local"}) {
      byte[] x = l.getBytes(StandardCharsets.UTF_8);
      b.write(x.length);
      b.write(x, 0, x.length);
    }
    b.write(0);
    b.write(0);
    b.write(12); // PTR
    b.write(0);
    b.write(1); // IN
    return b.toByteArray();
  }

  /** DNS-név olvasása (tömörítéssel); → { név, a név utáni eltolás } */
  static Object[] readName(byte[] buf, int off) {
    StringBuilder sb = new StringBuilder();
    boolean jumped = false;
    int end = off;
    for (int guard = 0; guard < 64 && off < buf.length; guard++) {
      int len = buf[off] & 0xff;
      if ((len & 0xc0) == 0xc0) {
        if (off + 1 >= buf.length) break;
        if (!jumped) end = off + 2;
        off = ((len & 0x3f) << 8) | (buf[off + 1] & 0xff);
        jumped = true;
        continue;
      }
      if (len == 0) {
        if (!jumped) end = off + 1;
        break;
      }
      if (off + 1 + len > buf.length) break;
      if (sb.length() > 0) sb.append('.');
      sb.append(new String(buf, off + 1, len, StandardCharsets.UTF_8));
      off += 1 + len;
    }
    return new Object[] {sb.toString(), end};
  }

  static int u16(byte[] b, int o) {
    return ((b[o] & 0xff) << 8) | (b[o + 1] & 0xff);
  }

  static void discoverChromecast(int ms, List<JSONObject> found) {
    try (MulticastSocket s = new MulticastSocket()) {
      s.setSoTimeout(300);
      byte[] q = dnsQuery();
      InetAddress grp = InetAddress.getByName("224.0.0.251");
      s.send(new DatagramPacket(q, q.length, grp, 5353));
      long end = System.currentTimeMillis() + ms;
      long resend = System.currentTimeMillis() + 700;
      byte[] buf = new byte[9000];
      Map<String, JSONObject> byId = new LinkedHashMap<>();
      while (System.currentTimeMillis() < end) {
        if (resend > 0 && System.currentTimeMillis() > resend) {
          s.send(new DatagramPacket(q, q.length, grp, 5353));
          resend = 0;
        }
        DatagramPacket p = new DatagramPacket(buf, buf.length);
        try {
          s.receive(p);
        } catch (SocketTimeoutException e) {
          continue;
        }
        String host = p.getAddress().getHostAddress();
        if (!privateHost(host)) continue; // csak helyi hálózati eszköz, a válaszoló saját címén
        try {
          parseAnswer(java.util.Arrays.copyOf(p.getData(), p.getLength()), host, byId);
        } catch (Exception ignored) {
        }
      }
      found.addAll(byId.values());
    } catch (Exception ignored) {
    }
  }

  static void parseAnswer(byte[] b, String host, Map<String, JSONObject> byId) throws Exception {
    if (b.length < 12) return;
    int qd = u16(b, 4);
    int rr = u16(b, 6) + u16(b, 8) + u16(b, 10);
    int off = 12;
    for (int i = 0; i < qd && off < b.length; i++) {
      int next = (int) readName(b, off)[1] + 4;
      if (next <= off || next > b.length) return;
      off = next;
    }
    String fn = null, md = null, id = null;
    int port = 8009;
    boolean cast = false;
    for (int i = 0; i < rr && off + 10 <= b.length; i++) {
      Object[] n = readName(b, off);
      off = (int) n[1];
      if (off + 10 > b.length) break;
      int type = u16(b, off);
      int rdlen = u16(b, off + 8);
      int rd = off + 10;
      if (rd + rdlen > b.length) break;
      String name = (String) n[0];
      if (name.toLowerCase(Locale.ROOT).contains("_googlecast")) cast = true;
      if (type == 33 && rdlen >= 6) port = u16(b, rd + 4);
      else if (type == 16) {
        int p = rd;
        while (p < rd + rdlen) {
          int l = b[p] & 0xff;
          if (p + 1 + l > rd + rdlen) break;
          String kv = new String(b, p + 1, l, StandardCharsets.UTF_8);
          int eq = kv.indexOf('=');
          if (eq > 0) {
            String k = kv.substring(0, eq), v = kv.substring(eq + 1);
            if (k.equals("fn")) fn = v;
            else if (k.equals("md")) md = v;
            else if (k.equals("id")) id = v;
          }
          p += 1 + l;
        }
      }
      off = rd + rdlen;
    }
    if (!cast && fn == null && id == null) return;
    String key = "cc:" + (id != null ? id : host);
    byId.put(key, new JSONObject().put("id", key).put("kind", "chromecast").put("name", fn != null ? fn : "Chromecast").put("model", md != null ? md : "Chromecast").put("host", host).put("port", port));
  }

  static void discoverDlna(int ms, List<JSONObject> found) {
    Map<String, String> locations = new LinkedHashMap<>();
    try (MulticastSocket s = new MulticastSocket()) {
      s.setSoTimeout(300);
      byte[] q = ("M-SEARCH * HTTP/1.1\r\nHOST: 239.255.255.250:1900\r\nMAN: \"ssdp:discover\"\r\nMX: 2\r\nST: urn:schemas-upnp-org:device:MediaRenderer:1\r\n\r\n").getBytes(StandardCharsets.UTF_8);
      InetAddress grp = InetAddress.getByName("239.255.255.250");
      s.send(new DatagramPacket(q, q.length, grp, 1900));
      long end = System.currentTimeMillis() + ms;
      long resend = System.currentTimeMillis() + 800;
      byte[] buf = new byte[4096];
      while (System.currentTimeMillis() < end) {
        if (resend > 0 && System.currentTimeMillis() > resend) {
          s.send(new DatagramPacket(q, q.length, grp, 1900));
          resend = 0;
        }
        DatagramPacket p = new DatagramPacket(buf, buf.length);
        try {
          s.receive(p);
        } catch (SocketTimeoutException e) {
          continue;
        }
        String msg = new String(p.getData(), 0, p.getLength(), StandardCharsets.UTF_8);
        java.util.regex.Matcher m = java.util.regex.Pattern.compile("(?im)^location:[ \\t]*(\\S+)").matcher(msg);
        if (m.find() && locations.size() < 64) locations.put(m.group(1), p.getAddress().getHostAddress());
      }
    } catch (Exception ignored) {
    }
    Map<String, JSONObject> uniq = new LinkedHashMap<>();
    for (Map.Entry<String, String> e : locations.entrySet()) {
      JSONObject d = describeDlna(e.getKey(), e.getValue());
      if (d != null) uniq.put(d.optString("id"), d);
    }
    found.addAll(uniq.values());
  }

  /** Az XML-elemek tartalma név szerint (névtér-előtaggal is), lineáris kereséssel. */
  static List<String> xmlAll(String xml, String tag, int max) {
    List<String> out = new ArrayList<>();
    String low = xml.toLowerCase(Locale.ROOT);
    String t = tag.toLowerCase(Locale.ROOT);
    int i = 0;
    while (out.size() < max) {
      int[] o = findTag(low, t, i, false);
      if (o == null) break;
      int gt = low.indexOf('>', o[1]);
      if (gt < 0) break;
      if (low.charAt(gt - 1) == '/') {
        out.add("");
        i = gt + 1;
        continue;
      }
      int[] c = findTag(low, t, gt + 1, true);
      if (c == null) break;
      out.add(xml.substring(gt + 1, c[0]));
      int nx = low.indexOf('>', c[1]);
      i = nx < 0 ? xml.length() : nx + 1;
    }
    return out;
  }

  static boolean nameChar(char c) {
    return Character.isLetterOrDigit(c) || c == '_' || c == '.' || c == '-';
  }

  static int[] findTag(String low, String t, int from, boolean close) {
    for (int p = low.indexOf(t, from); p >= 0; p = low.indexOf(t, p + 1)) {
      if (p + t.length() < low.length() && nameChar(low.charAt(p + t.length()))) continue;
      int s = p - 1;
      if (s >= 0 && low.charAt(s) == ':') {
        int k = 0;
        s--;
        while (s >= 0 && k < 32 && nameChar(low.charAt(s))) {
          s--;
          k++;
        }
      }
      if (s < 0) continue;
      if (close ? (s >= 1 && low.charAt(s) == '/' && low.charAt(s - 1) == '<') : low.charAt(s) == '<') return new int[] {close ? s - 1 : s, p + t.length()};
    }
    return null;
  }

  static String xmlTag(String xml, String tag) {
    List<String> l = xmlAll(xml, tag, 1);
    return l.isEmpty() ? "" : l.get(0).trim();
  }

  static String xmlUnescape(String s) {
    return s.replace("&lt;", "<").replace("&gt;", ">").replace("&quot;", "\"").replace("&apos;", "'").replace("&amp;", "&");
  }

  static String xmlEscape(String s) {
    return String.valueOf(s).replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace("\"", "&quot;");
  }

  /** A DLNA-eszköz leírása: csak a válaszoló eszköz saját (helyi) címéről, átirányítás nélkül, korlátos méretben. */
  static JSONObject describeDlna(String location, String from) {
    try {
      URL loc = new URL(location);
      String host = loc.getHost();
      if (!("http".equals(loc.getProtocol()) || "https".equals(loc.getProtocol())) || !host.equals(from) || !privateHost(host)) return null;
      HttpURLConnection c = (HttpURLConnection) loc.openConnection();
      c.setInstanceFollowRedirects(false);
      c.setConnectTimeout(4000);
      c.setReadTimeout(4000);
      if (c.getResponseCode() != 200) return null;
      String xml = readBody(c.getInputStream(), 256 * 1024);
      String base = xmlTag(xml, "URLBase");
      if (base.isEmpty()) base = location;
      JSONObject av = null, rc = null;
      for (String svc : xmlAll(xml, "service", 64)) {
        String type = xmlTag(svc, "serviceType");
        String ctl = xmlTag(svc, "controlURL");
        URL u = new URL(new URL(base), ctl);
        if (!u.getHost().equals(host)) continue; // a vezérlőcím is ugyanarra az eszközre mutasson
        String lt = type.toLowerCase(Locale.ROOT);
        if (lt.contains("service:avtransport:") && av == null) av = new JSONObject().put("type", type).put("control", u.toString());
        else if (lt.contains("service:renderingcontrol:") && rc == null) rc = new JSONObject().put("type", type).put("control", u.toString());
      }
      if (av == null) return null;
      String udn = xmlTag(xml, "UDN");
      String name = xmlUnescape(xmlTag(xml, "friendlyName"));
      String model = (xmlUnescape(xmlTag(xml, "manufacturer")) + " " + xmlUnescape(xmlTag(xml, "modelName"))).trim();
      JSONObject d = new JSONObject().put("id", "dlna:" + (udn.isEmpty() ? location : udn)).put("kind", "dlna").put("name", name.isEmpty() ? host : name).put("model", model).put("host", host).put("av", av);
      if (rc != null) d.put("rc", rc);
      return d;
    } catch (Exception e) {
      return null;
    }
  }

  static String readBody(InputStream in, int max) throws Exception {
    try (InputStream i = in) {
      ByteArrayOutputStream b = new ByteArrayOutputStream();
      byte[] buf = new byte[8192];
      for (int n; (n = i.read(buf)) > 0; ) {
        b.write(buf, 0, n);
        if (b.size() > max) throw new Exception("túl nagy válasz");
      }
      return b.toString("UTF-8");
    }
  }

  // --------------------------------------------------------------------------------- közös felület
  interface Session {
    String id();

    void load(String url, String contentType, boolean live, String title, String subtitle, String image) throws Exception;

    void control(String action, double value);

    void stop();

    void close(String reason);
  }

  static String contentTypeOf(String url, String hint) {
    String p = url.toLowerCase(Locale.ROOT).split("\\?")[0];
    if ("hls".equals(hint) || p.matches(".*\\.m3u8?$")) return "application/x-mpegURL";
    if ("dash".equals(hint) || p.endsWith(".mpd")) return "application/dash+xml";
    if (p.matches(".*\\.(ts|m2ts)$")) return "video/mp2t";
    if (p.endsWith(".webm")) return "video/webm";
    if (p.endsWith(".mkv")) return "video/x-matroska";
    if (p.matches(".*\\.(mp3|aac|m4a)$")) return "audio/mpeg";
    return "video/mp4";
  }

  /** → { id, name, kind } */
  static JSONObject play(MainActivity a, JSONObject o) throws Exception {
    act = a;
    String deviceId = o.getString("deviceId");
    JSONObject dev = devices.get(deviceId);
    if (dev == null) throw new Exception(L.t(a, "Az eszköz nem található – keresd újra."));
    Session s = active;
    if (s != null && !s.id().equals(deviceId)) {
      s.stop();
      active = null;
      s = null;
    }
    int op;
    synchronized (Cast.class) {
      op = ++castOp;
    }
    JSONObject superseded = new JSONObject().put("id", deviceId).put("name", dev.optString("name")).put("kind", dev.getString("kind")).put("superseded", true);
    if (s == null) {
      s = "chromecast".equals(dev.getString("kind")) ? new CastSession(a, dev) : new DlnaSession(dev);
      connecting = s;
      try {
        if (s instanceof CastSession) ((CastSession) s).connect();
      } catch (Exception e) {
        // (a leállítás szakította meg a csatlakozást – nem hiba, mint az asztali változatban)
        if (op != castOp) return superseded;
        throw e;
      } finally {
        if (connecting == s) connecting = null;
      }
      synchronized (Cast.class) {
        if (op == castOp) active = s;
      }
      if (active != s) {
        s.stop();
        return superseded;
      }
    }
    String url = o.getString("url");
    // a vevő a munkamenethez kötött közvetítőn át éri el az adást (a saját fejlécekkel), csak a saját címéről
    String proxied = a.lan().castProxy(url, o.optString("ua"), o.optString("referrer"), dev.getString("host"));
    synchronized (Cast.class) {
      if (op != castOp || active != s) return superseded;
    }
    if (o.has("gen")) castGen = o.optInt("gen", castGen);
    s.load(proxied, contentTypeOf(url, o.optString("type")), o.optBoolean("live"), o.optString("title"), o.optString("subtitle"), o.optString("image"));
    return new JSONObject().put("id", deviceId).put("name", dev.optString("name")).put("kind", dev.getString("kind"));
  }

  static void control(MainActivity a, String action, double value) {
    if ("disconnect".equals(action)) {
      Session c;
      Session s;
      synchronized (Cast.class) {
        castOp++;
        c = connecting;
        connecting = null;
        s = active;
      }
      if (c != null) c.stop();
      if (s != null) s.stop();
      a.lan().castProxyStop();
      return;
    }
    Session s = active;
    if (s == null) return;
    s.control(action, value);
  }

  static void forget(Context ctx, String id) {
    ctx.getSharedPreferences(PINS, Context.MODE_PRIVATE).edit().remove(id).apply();
  }

  // --------------------------------------------------------------------------------- Chromecast
  static byte[] varint(long n) {
    ByteArrayOutputStream b = new ByteArrayOutputStream();
    while (n > 127) {
      b.write((int) ((n & 127) | 128));
      n >>>= 7;
    }
    b.write((int) n);
    return b.toByteArray();
  }

  static void pbString(ByteArrayOutputStream b, int field, String s) {
    byte[] x = s.getBytes(StandardCharsets.UTF_8);
    b.write((field << 3) | 2);
    byte[] l = varint(x.length);
    b.write(l, 0, l.length);
    b.write(x, 0, x.length);
  }

  static byte[] encodeCast(String src, String dst, String ns, JSONObject payload) {
    ByteArrayOutputStream body = new ByteArrayOutputStream();
    body.write(0x08);
    body.write(0x00); // protocol_version = CASTV2_1_0
    pbString(body, 2, src);
    pbString(body, 3, dst);
    pbString(body, 4, ns);
    body.write(0x28);
    body.write(0x00); // payload_type = STRING
    pbString(body, 6, payload.toString());
    byte[] b = body.toByteArray();
    byte[] out = new byte[4 + b.length];
    out[0] = (byte) (b.length >>> 24);
    out[1] = (byte) (b.length >>> 16);
    out[2] = (byte) (b.length >>> 8);
    out[3] = (byte) b.length;
    System.arraycopy(b, 0, out, 4, b.length);
    return out;
  }

  /** → { source, dest, ns, data } (a payload JSON) */
  static String[] decodeCast(byte[] buf) {
    String[] out = new String[4];
    int[] off = {0};
    while (off[0] < buf.length) {
      long tag = readVar(buf, off);
      int field = (int) (tag >> 3);
      int wire = (int) (tag & 7);
      if (wire == 0) readVar(buf, off);
      else if (wire == 2) {
        int len = (int) readVar(buf, off);
        if (len < 0 || off[0] + len > buf.length) break;
        String v = new String(buf, off[0], len, StandardCharsets.UTF_8);
        off[0] += len;
        if (field == 2) out[0] = v;
        else if (field == 3) out[1] = v;
        else if (field == 4) out[2] = v;
        else if (field == 6) out[3] = v;
      } else break;
    }
    return out;
  }

  static long readVar(byte[] b, int[] off) {
    long r = 0;
    int shift = 0;
    while (off[0] < b.length && shift < 64) {
      int x = b[off[0]++] & 0xff;
      r |= (long) (x & 127) << shift;
      if ((x & 128) == 0) return r;
      shift += 7;
    }
    return r;
  }

  /**
   * A kivetítő tanúsítványának kiolvasása: ez a bizalomkezelő semmit nem fogad el (minden kézfogás elutasul),
   * csak megjegyzi a felkínált tanúsítványt – így az első kapcsolódáskor rögzíthető, és a tényleges kapcsolat már
   * a szabványos ellenőrzéssel, kizárólag ebben a tanúsítványban megbízva épül fel.
   */
  static final class CertGrabber implements X509TrustManager {
    volatile X509Certificate cert;

    public void checkClientTrusted(X509Certificate[] c, String t) throws java.security.cert.CertificateException {
      throw new java.security.cert.CertificateException("nem használt");
    }

    public void checkServerTrusted(X509Certificate[] chain, String t) throws java.security.cert.CertificateException {
      if (chain != null && chain.length > 0) cert = chain[0];
      throw new java.security.cert.CertificateException("csak kiolvasás");
    }

    public X509Certificate[] getAcceptedIssuers() {
      return new X509Certificate[0];
    }
  }

  static X509Certificate grabCert(String host, int port) throws Exception {
    CertGrabber g = new CertGrabber();
    SSLContext ctx = SSLContext.getInstance("TLS");
    ctx.init(null, new TrustManager[] {g}, null);
    try (SSLSocket s = (SSLSocket) ctx.getSocketFactory().createSocket()) {
      s.connect(new java.net.InetSocketAddress(host, port), 6000);
      s.setSoTimeout(6000);
      try {
        s.startHandshake();
      } catch (Exception expected) {
        // (a kiolvasó minden tanúsítványt elutasít – ez a várt eset)
      }
    }
    if (g.cert == null) throw new Exception(L.t(act, "Az eszköz nem válaszolt"));
    return g.cert;
  }

  /** Szabványos bizalomkezelők, amelyek kizárólag a megadott (rögzített) tanúsítványban bíznak meg. */
  static TrustManager[] pinnedTrust(X509Certificate cert) throws Exception {
    java.security.KeyStore ks = java.security.KeyStore.getInstance(java.security.KeyStore.getDefaultType());
    ks.load(null, null);
    ks.setCertificateEntry("cast", cert);
    javax.net.ssl.TrustManagerFactory tmf = javax.net.ssl.TrustManagerFactory.getInstance(javax.net.ssl.TrustManagerFactory.getDefaultAlgorithm());
    tmf.init(ks);
    return tmf.getTrustManagers();
  }

  static final class CastSession implements Session {
    final MainActivity a;
    final JSONObject dev;
    final String id;
    SSLSocket sock;
    OutputStream out;
    volatile String transportId, sessionId;
    volatile long mediaSessionId = -1;
    // (H29 / U12) betöltés közben semmilyen állapot nem az új filmé; utána csak a visszaigazolt médiamunkameneté
    volatile boolean loadPending;
    volatile long curMsid = -1;
    int loadSeq;
    volatile double volume = -1;
    volatile boolean closed;
    int reqId = 1;
    final Map<Integer, Object[]> waiters = new ConcurrentHashMap<>(); // requestId → { lock, válasz }
    Thread reader, beat;

    CastSession(MainActivity a, JSONObject dev) throws Exception {
      this.a = a;
      this.dev = dev;
      this.id = dev.getString("id");
    }

    public String id() {
      return id;
    }

    void connect() throws Exception {
      // A Chromecast saját aláírású tanúsítványt használ (nincs hitelesítési lánc): az első kapcsolódáskor a
      // tanúsítványt megjegyezzük (eszközönként), később csak ugyanazzal kapcsolódunk – egy közbeékelődő vagy
      // álcázott eszköz nem kaphatja meg a közvetítő címét. A tényleges kapcsolat szabványos ellenőrzéssel megy,
      // kizárólag a rögzített tanúsítványban megbízva.
      String host = dev.getString("host");
      int port = dev.optInt("port", 8009);
      SharedPreferences pins = a.getSharedPreferences(PINS, Context.MODE_PRIVATE);
      X509Certificate offered = grabCert(host, port);
      String known = pins.getString(id, null);
      java.security.cert.CertificateFactory cf = java.security.cert.CertificateFactory.getInstance("X.509");
      X509Certificate pinned;
      if (known == null) {
        pinned = offered;
      } else {
        pinned = (X509Certificate) cf.generateCertificate(new java.io.ByteArrayInputStream(android.util.Base64.decode(known, android.util.Base64.NO_WRAP)));
        if (!java.util.Arrays.equals(pinned.getEncoded(), offered.getEncoded())) throw new Exception("CERT_CHANGED: az eszköz tanúsítványa megváltozott");
      }
      SSLContext ctx = SSLContext.getInstance("TLS");
      ctx.init(null, pinnedTrust(pinned), null);
      sock = (SSLSocket) ctx.getSocketFactory().createSocket();
      sock.connect(new java.net.InetSocketAddress(host, port), 6000);
      sock.setSoTimeout(8000); // (egy TCP-n válaszoló, de TLS-en néma eszköz ne akassza meg a kivetítést)
      try {
        sock.startHandshake();
        sock.setSoTimeout(0);
        // (U11) a kézfogás alatt leállították: a socket nem maradhat nyitva
        if (closed) {
          try {
            sock.close();
          } catch (Exception ignored) {
          }
          throw new Exception(L.t(a, "a kapcsolat megszakadt"));
        }
      } catch (Exception e) {
        try {
          sock.close();
        } catch (Exception ignored) {
        }
        throw e;
      }
      if (known == null) pins.edit().putString(id, android.util.Base64.encodeToString(pinned.getEncoded(), android.util.Base64.NO_WRAP)).apply();
      out = sock.getOutputStream();
      send(NS_CONN, "receiver-0", new JSONObject().put("type", "CONNECT"));
      reader = new Thread(this::readLoop, "adas-cast");
      reader.setDaemon(true);
      reader.start();
      beat = new Thread(() -> {
        while (!closed) {
          try {
            Thread.sleep(5000);
            send(NS_BEAT, "receiver-0", new JSONObject().put("type", "PING"));
          } catch (Exception e) {
            return;
          }
        }
      }, "adas-cast-beat");
      beat.setDaemon(true);
      beat.start();
    }

    synchronized void send(String ns, String dest, JSONObject payload) throws Exception {
      send(ns, dest, payload, "sender-adas");
    }

    synchronized void send(String ns, String dest, JSONObject payload, String src) throws Exception {
      if (closed || out == null) return;
      out.write(encodeCast(src, dest, ns, payload));
      out.flush();
    }

    JSONObject request(String ns, String dest, JSONObject payload, String[] okTypes, long timeoutMs) throws Exception {
      int rid;
      synchronized (this) {
        rid = reqId++;
      }
      payload.put("requestId", rid);
      Object[] w = {new Object(), null, okTypes};
      waiters.put(rid, w);
      send(ns, dest, payload);
      synchronized (w[0]) {
        long end = System.currentTimeMillis() + timeoutMs;
        while (w[1] == null && !closed) {
          long left = end - System.currentTimeMillis();
          if (left <= 0) break;
          w[0].wait(left);
        }
      }
      waiters.remove(rid);
      if (w[1] == null) throw new Exception(L.t(a, "Az eszköz nem válaszolt"));
      JSONObject d = (JSONObject) w[1];
      String t = d.optString("type");
      if (t.equals("LOAD_FAILED") || t.equals("LAUNCH_ERROR") || t.equals("INVALID_REQUEST") || t.equals("LOAD_CANCELLED")) throw new Exception(d.optString("reason", t));
      return d;
    }

    void readLoop() {
      try {
        DataInputStream in = new DataInputStream(sock.getInputStream());
        while (!closed) {
          int len = in.readInt();
          if (len < 0 || len > 65536) throw new Exception("hibás üzenet az eszköztől");
          byte[] msg = new byte[len];
          in.readFully(msg);
          try {
            onMessage(decodeCast(msg));
          } catch (Exception ignored) {
          }
        }
      } catch (Exception e) {
        close(closed ? "" : L.t(a, "a kapcsolat megszakadt"));
      }
    }

    void onMessage(String[] m) throws Exception {
      if (m[3] == null) return;
      JSONObject d = new JSONObject(m[3]);
      String type = d.optString("type");
      if (NS_BEAT.equals(m[2]) && "PING".equals(type)) {
        send(NS_BEAT, m[0], new JSONObject().put("type", "PONG"), m[1]);
        return;
      }
      if (NS_CONN.equals(m[2]) && "CLOSE".equals(type) && m[0] != null && m[0].equals(transportId)) {
        close(L.t(a, "a vevőalkalmazás bezárult"));
        return;
      }
      if ("RECEIVER_STATUS".equals(type)) {
        JSONObject st = d.optJSONObject("status");
        JSONArray apps = st != null ? st.optJSONArray("applications") : null;
        boolean has = false;
        if (apps != null) for (int i = 0; i < apps.length(); i++) if (DEFAULT_RECEIVER.equals(apps.getJSONObject(i).optString("appId"))) has = true;
        if (transportId != null && !has) close(L.t(a, "a kivetítés véget ért az eszközön"));
        if (st != null && st.optJSONObject("volume") != null) volume = st.getJSONObject("volume").optDouble("level", volume);
      }
      if ("MEDIA_STATUS".equals(type)) {
        JSONArray arr = d.optJSONArray("status");
        if (arr != null && arr.length() > 0) {
          JSONObject st = arr.getJSONObject(0);
          // (H29 / U12) betöltés közben és a régi médiamunkamenetnél nincs állapot-kiküldés – a LOAD válaszának
          // illesztése (lent, a várakozók között) ettől még lefut
          boolean stale = loadPending || (curMsid >= 0 && st.optLong("mediaSessionId", -2) != curMsid);
          if (!stale) {
          mediaSessionId = st.optLong("mediaSessionId", mediaSessionId);
          JSONObject ev = new JSONObject().put("id", id).put("state", st.optString("playerState")).put("idle", st.optString("idleReason", "")).put("time", st.optDouble("currentTime", 0));
          // (H28) a film hossza a vevőtől (ha helyben nem volt ismert)
          JSONObject md = st.optJSONObject("media");
          double mdur = md != null ? md.optDouble("duration", -1) : -1;
          if (mdur > 0 && !Double.isInfinite(mdur)) ev.put("duration", mdur);
          if (volume >= 0) ev.put("volume", volume);
          emit(ev);
          }
        }
      }
      int rid = d.optInt("requestId", -1);
      for (Map.Entry<Integer, Object[]> e : waiters.entrySet()) {
        Object[] w = e.getValue();
        String[] ok = (String[]) w[2];
        boolean match = false;
        if (ok == null) match = false;
        else if (ok.length > 0 && "LAUNCH".equals(ok[0])) {
          // a LAUNCH válasza: RECEIVER_STATUS a vevőalkalmazással (a requestId nem mindig egyezik)
          if ("LAUNCH_ERROR".equals(type)) match = true;
          else if ("RECEIVER_STATUS".equals(type)) {
            JSONObject st = d.optJSONObject("status");
            JSONArray apps = st != null ? st.optJSONArray("applications") : null;
            if (apps != null) for (int i = 0; i < apps.length(); i++) if (DEFAULT_RECEIVER.equals(apps.getJSONObject(i).optString("appId"))) match = true;
          }
        } else if (rid == e.getKey()) for (String t : ok) if (t.equals(type)) match = true;
        if (match) {
          synchronized (w[0]) {
            w[1] = d;
            w[0].notifyAll();
          }
        }
      }
    }

    void launch() throws Exception {
      JSONObject st = request(NS_RECV, "receiver-0", new JSONObject().put("type", "LAUNCH").put("appId", DEFAULT_RECEIVER), new String[] {"LAUNCH"}, 15000);
      JSONArray apps = st.getJSONObject("status").getJSONArray("applications");
      for (int i = 0; i < apps.length(); i++) {
        JSONObject app = apps.getJSONObject(i);
        if (DEFAULT_RECEIVER.equals(app.optString("appId"))) {
          transportId = app.getString("transportId");
          sessionId = app.getString("sessionId");
        }
      }
      if (transportId == null) throw new Exception("LAUNCH_ERROR");
      send(NS_CONN, transportId, new JSONObject().put("type", "CONNECT"));
    }

    public void load(String url, String contentType, boolean live, String title, String subtitle, String image) throws Exception {
      if (transportId == null) launch();
      JSONObject meta = new JSONObject().put("metadataType", 0).put("title", title).put("subtitle", subtitle);
      JSONArray imgs = new JSONArray();
      if (image != null && !image.isEmpty()) imgs.put(new JSONObject().put("url", image));
      meta.put("images", imgs);
      JSONObject media = new JSONObject().put("contentId", url).put("contentType", contentType).put("streamType", live ? "LIVE" : "BUFFERED").put("metadata", meta);
      int seq;
      synchronized (this) {
        seq = ++loadSeq;
      }
      loadPending = true;
      JSONObject res;
      try {
        res = request(NS_MEDIA, transportId, new JSONObject().put("type", "LOAD").put("sessionId", sessionId).put("autoplay", true).put("currentTime", 0).put("media", media),
            new String[] {"MEDIA_STATUS", "LOAD_FAILED", "LOAD_CANCELLED", "INVALID_REQUEST"}, 20000);
      } finally {
        synchronized (this) {
          if (seq == loadSeq) loadPending = false;
        }
      }
      synchronized (this) {
        if (seq != loadSeq) return;
      }
      JSONArray arr = res.optJSONArray("status");
      long msid = arr != null && arr.length() > 0 ? arr.getJSONObject(0).optLong("mediaSessionId", -1) : -1;
      curMsid = msid;
      if (msid >= 0) mediaSessionId = msid;
    }

    public void control(String action, double value) {
      try {
        if ("volume".equals(action)) {
          JSONObject p = new JSONObject().put("type", "SET_VOLUME").put("volume", new JSONObject().put("level", value));
          synchronized (this) {
            p.put("requestId", reqId++);
          }
          send(NS_RECV, "receiver-0", p);
          return;
        }
        if (mediaSessionId < 0 || transportId == null) return;
        String t = "play".equals(action) ? "PLAY" : "pause".equals(action) ? "PAUSE" : "stop".equals(action) ? "STOP" : "seek".equals(action) ? "SEEK" : null;
        if (t == null) return;
        JSONObject p = new JSONObject().put("type", t).put("mediaSessionId", mediaSessionId);
        if ("seek".equals(action)) p.put("currentTime", value);
        synchronized (this) {
          p.put("requestId", reqId++);
        }
        send(NS_MEDIA, transportId, p);
      } catch (Exception ignored) {
      }
    }

    public void stop() {
      try {
        if (sessionId != null) {
          JSONObject p = new JSONObject().put("type", "STOP").put("sessionId", sessionId);
          synchronized (this) {
            p.put("requestId", reqId++);
          }
          send(NS_RECV, "receiver-0", p);
        }
      } catch (Exception ignored) {
      }
      new Thread(() -> {
        try {
          Thread.sleep(300);
        } catch (InterruptedException ignored) {
        }
        close("");
      }).start();
    }

    public void close(String reason) {
      if (closed) return;
      closed = true;
      try {
        sock.close();
      } catch (Exception ignored) {
      }
      for (Object[] w : waiters.values()) {
        synchronized (w[0]) {
          w[0].notifyAll();
        }
      }
      if (active == this) {
        active = null;
        emitState(id, "ENDED", reason);
      }
    }
  }

  // --------------------------------------------------------------------------------- DLNA
  static String soap(JSONObject svc, String action, String[][] args) throws Exception {
    StringBuilder b = new StringBuilder("<?xml version=\"1.0\" encoding=\"utf-8\"?><s:Envelope xmlns:s=\"http://schemas.xmlsoap.org/soap/envelope/\" s:encodingStyle=\"http://schemas.xmlsoap.org/soap/encoding/\">");
    String type = svc.getString("type");
    b.append("<s:Body><u:").append(action).append(" xmlns:u=\"").append(type).append("\">");
    for (String[] kv : args) b.append('<').append(kv[0]).append('>').append(xmlEscape(kv[1])).append("</").append(kv[0]).append('>');
    b.append("</u:").append(action).append("></s:Body></s:Envelope>");
    HttpURLConnection c = (HttpURLConnection) new URL(svc.getString("control")).openConnection();
    c.setInstanceFollowRedirects(false); // a vezérlőcím a felderítéskor ellenőrzött (ugyanaz az eszköz)
    c.setConnectTimeout(6000);
    c.setReadTimeout(10000);
    c.setRequestMethod("POST");
    c.setDoOutput(true);
    c.setRequestProperty("Content-Type", "text/xml; charset=\"utf-8\"");
    c.setRequestProperty("SOAPACTION", "\"" + type + "#" + action + "\"");
    try (OutputStream o = c.getOutputStream()) {
      o.write(b.toString().getBytes(StandardCharsets.UTF_8));
    }
    int code = c.getResponseCode();
    String text = readBody(code >= 400 ? c.getErrorStream() != null ? c.getErrorStream() : new java.io.ByteArrayInputStream(new byte[0]) : c.getInputStream(), 256 * 1024);
    if (code < 200 || code >= 300) {
      String err = xmlTag(text, "errorDescription");
      throw new UpnpException(err.isEmpty() ? action + ": HTTP " + code : err, xmlTag(text, "errorCode"));
    }
    return text;
  }

  /** UPnP-hiba a kódjával (pl. 701 = „Transition not available”). */
  static final class UpnpException extends Exception {
    final String code;

    UpnpException(String msg, String code) {
      super(msg);
      this.code = code == null ? "" : code.trim();
    }
  }

  /** (a java.util.function csak API 24-től van – a legkisebb támogatott változat 23) */
  interface Flag {
    boolean get();
  }

  /**
   * Lejátszás indítása a SetAVTransportURI után (mint az asztali lan.js playWhenReady). Több vevő (pl. LG webOS) a cím
   * átvétele után egy ideig TRANSITIONING állapotban van: a túl korai Play 701-es „Transition not available” hibát ad (közben
   * a TV „nem ismerhető fel”-t ír), majd magától mégis elindul. Megvárjuk, amíg a vevő kész; ha közben magától elindult, nem
   * küldünk Play-t; a 701-et legfeljebb 8 mp-ig újrapróbáljuk; ha a vevő ennyi idő után is átmeneti, még egy Play megy (a
   * STOPPED-be kerülő vevő is induljon), és ha ez is hibát ad, hibát dobunk (az állapotlekérdezés ekkor is elindul).
   */
  static void playWhenReady(JSONObject av, Flag closed) throws Exception {
    long end = System.currentTimeMillis() + 8000;
    while (true) {
      String state = "";
      try {
        state = xmlTag(soap(av, "GetTransportInfo", new String[][] {{"InstanceID", "0"}}), "CurrentTransportState").trim();
      } catch (Exception ignored) {
      }
      if ("PLAYING".equals(state) || closed.get()) return;
      if (!"TRANSITIONING".equals(state) || System.currentTimeMillis() >= end) {
        try {
          soap(av, "Play", new String[][] {{"InstanceID", "0"}, {"Speed", "1"}});
          return;
        } catch (Exception e) {
          boolean busy = (e instanceof UpnpException && "701".equals(((UpnpException) e).code)) || String.valueOf(e.getMessage()).toLowerCase(java.util.Locale.ROOT).contains("transition");
          if (!busy || System.currentTimeMillis() >= end) throw e;
        }
      }
      Thread.sleep(500);
    }
  }

  static final class DlnaSession implements Session {
    final JSONObject dev;
    final String id;
    volatile boolean closed;
    Thread poll;

    DlnaSession(JSONObject dev) throws Exception {
      this.dev = dev;
      this.id = dev.getString("id");
    }

    // (H14) a lejátszott film utolsó pozíciója / hossza (a FINISHED felismeréséhez)
    // (gen: a load előtt indult lekérdezés válasza ne írja vissza a régi film állapotát)
    boolean wasPlaying;
    double pos, dur;
    int gen;

    synchronized void resetTrack() {
      gen++;
      wasPlaying = false;
      pos = 0;
      dur = 0;
    }

    public String id() {
      return id;
    }

    public void load(String url, String contentType, boolean live, String title, String subtitle, String image) throws Exception {
      JSONObject av = dev.getJSONObject("av");
      String didl = "<DIDL-Lite xmlns=\"urn:schemas-upnp-org:metadata-1-0/DIDL-Lite/\" xmlns:dc=\"http://purl.org/dc/elements/1.1/\" xmlns:upnp=\"urn:schemas-upnp-org:metadata-1-0/upnp/\">"
          + "<item id=\"0\" parentID=\"-1\" restricted=\"1\"><dc:title>" + xmlEscape(title) + "</dc:title><upnp:class>object.item.videoItem</upnp:class>"
          + "<res protocolInfo=\"http-get:*:" + contentType + ":*\">" + xmlEscape(url) + "</res></item></DIDL-Lite>";
      resetTrack(); // (a Stop miatti STOPPED a régi film adataival ne legyen FINISHED)
      try {
        soap(av, "Stop", new String[][] {{"InstanceID", "0"}});
      } catch (Exception ignored) {
      }
      soap(av, "SetAVTransportURI", new String[][] {{"InstanceID", "0"}, {"CurrentURI", url}, {"CurrentURIMetaData", didl}});
      try {
        playWhenReady(av, () -> closed);
      } finally {
        // (sikertelen indításnál is: a vevő később magától elindulhat; a közben lezárt munkamenet nem kap lekérdezést)
        resetTrack();
        if (!closed) startPoll(av);
      }
      emitState(id, "BUFFERING", null);
    }

    void startPoll(JSONObject av) {
      if (poll == null) {
        poll = new Thread(() -> {
          while (!closed) {
            try {
              Thread.sleep(3000);
              int g;
              synchronized (DlnaSession.this) {
                g = gen;
              }
              String x = soap(av, "GetTransportInfo", new String[][] {{"InstanceID", "0"}});
              String s = xmlTag(x, "CurrentTransportState");
              String st = "PLAYING".equals(s) ? "PLAYING" : "PAUSED_PLAYBACK".equals(s) ? "PAUSED" : "TRANSITIONING".equals(s) ? "BUFFERING" : "STOPPED".equals(s) || "NO_MEDIA_PRESENT".equals(s) ? "IDLE" : s;
              JSONObject ev = new JSONObject().put("id", id).put("state", st);
              // (H14) a vevő valódi pozíciója és a film hossza; a film végén (STOPPED a vég közelében) FINISHED
              boolean on = "PLAYING".equals(s) || "PAUSED_PLAYBACK".equals(s);
              double t = -1, d = -1;
              if (on) {
                try {
                  String p = soap(av, "GetPositionInfo", new String[][] {{"InstanceID", "0"}});
                  t = fromHms(xmlTag(p, "RelTime"));
                  d = fromHms(xmlTag(p, "TrackDuration"));
                } catch (Exception ignored) {
                }
              }
              synchronized (DlnaSession.this) {
                // (a válaszok alatt új film indult / a munkamenet lezárult → ez a lekérdezés elavult)
                if (g != gen || closed) continue;
                if (on) {
                  if (t >= 0) ev.put("time", pos = t);
                  if (d > 0) ev.put("duration", dur = d);
                  if ("PLAYING".equals(s)) wasPlaying = true;
                } else if ("STOPPED".equals(s) && wasPlaying && dur > 0 && pos >= dur - 15) {
                  wasPlaying = false;
                  ev.put("idle", "FINISHED");
                }
              }
              emit(ev);
            } catch (InterruptedException e) {
              return;
            } catch (Exception ignored) {
            }
          }
        }, "adas-dlna");
        poll.setDaemon(true);
        poll.start();
      }
    }

    public void control(String action, double value) {
      new Thread(() -> {
        try {
          JSONObject av = dev.getJSONObject("av");
          if ("play".equals(action)) soap(av, "Play", new String[][] {{"InstanceID", "0"}, {"Speed", "1"}});
          else if ("pause".equals(action)) soap(av, "Pause", new String[][] {{"InstanceID", "0"}});
          else if ("stop".equals(action)) soap(av, "Stop", new String[][] {{"InstanceID", "0"}});
          // (H14) tekerés / folytatási pozíció (nem tekerhető forrásnál a vevő hibát ad – elnyeljük)
          else if ("seek".equals(action)) soap(av, "Seek", new String[][] {{"InstanceID", "0"}, {"Unit", "REL_TIME"}, {"Target", toHms(value)}});
          else if ("volume".equals(action) && dev.optJSONObject("rc") != null) soap(dev.getJSONObject("rc"), "SetVolume", new String[][] {{"InstanceID", "0"}, {"Channel", "Master"}, {"DesiredVolume", String.valueOf(Math.round(value * 100))}});
        } catch (Exception ignored) {
        }
      }).start();
    }

    public void stop() {
      control("stop", 0);
      close("");
    }

    public void close(String reason) {
      if (closed) return;
      closed = true;
      if (poll != null) poll.interrupt();
      if (active == this) {
        active = null;
        emitState(id, "ENDED", reason);
      }
    }
  }
}
