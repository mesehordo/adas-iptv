package hu.adas.tv;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.Inet4Address;
import java.net.InetAddress;
import java.net.NetworkInterface;
import java.net.ServerSocket;
import java.net.Socket;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.Iterator;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ArrayBlockingQueue;
import java.util.concurrent.RejectedExecutionException;
import java.util.concurrent.ThreadPoolExecutor;
import java.util.concurrent.TimeUnit;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;

/**
 * Kis HTTP-kiszolgáló a helyi hálózaton (47800–47803), az asztali változat lan.js-ének megfelelője:
 *  - beállítások átadása kóddal: GET /adas/share/<azonosító> (a kódból számolt azonosító; a válasz
 *    titkosított – a kulcs csak a képernyőn látható kódban van);
 *  - távirányító telefonról: GET /adas/remote (a vezérlőlap), /adas/rc/hello (alkalmi szám), és
 *    /adas/rc/<számláló>.<k|p>.<aláírás>/state | cmd?c=…&a=… – HMAC-SHA256-tal aláírt kérések (a QR-kódból
 *    kapott kulcs vagy a PIN nem utazik a hálózaton; a számláló egyszer használható).
 * Csak akkor fut, ha az átadás vagy a távirányító be van kapcsolva.
 */
class LanServer {
  interface Listener {
    void onRemote(String c, String a);
    void onShareUsed(String from);
  }

  static final long RC_WINDOW = 10 * 60_000L;

  final Listener listener;
  ServerSocket socket;
  int port;
  // korlátos szálkészlet és várósor: sok (lassú) kapcsolat se foglalhassa le korlátlanul a szálakat. 8 alapszál
  // (a böngészők üresen nyitva tartott tartalék kapcsolatai ne akasszák meg a telefon kéréseit), üresjáratban megszűnnek.
  final ThreadPoolExecutor pool = newPool();

  static ThreadPoolExecutor newPool() {
    ThreadPoolExecutor p = new ThreadPoolExecutor(8, 8, 30, TimeUnit.SECONDS, new ArrayBlockingQueue<>(32));
    p.allowCoreThreadTimeOut(true);
    return p;
  }
  final SecureRandom rnd = new SecureRandom();

  // átadás
  volatile String shareSecret;
  volatile String shareData;
  volatile long shareExpires;
  volatile int shareFails;
  // távirányító
  volatile String rcPin;
  volatile String rcKey = "";
  volatile String rcHtml;
  volatile String rcState = "{}";
  volatile String rcNonce = "";
  final LinkedHashSet<Long> rcSeen = new LinkedHashSet<>();
  long rcFloor;
  int rcPinFails;
  final Map<String, long[]> ipFails = new HashMap<>(); // cím → { hibák, első hiba, tiltás vége }
  // (F04) kivetítés: munkamenethez kötött közvetítő – csak a kivetítő eszköz címéről, csak ennek az adásnak
  volatile String castToken;
  volatile String castRoot = "", castUa = "", castRef = "", castDevice = "";

  LanServer(Listener l) {
    listener = l;
  }

  synchronized int ensure() throws IOException {
    if (socket != null && !socket.isClosed()) return port;
    IOException last = null;
    for (int p = 47800; p < 47804; p++) {
      try {
        ServerSocket s = new ServerSocket();
        s.setReuseAddress(true);
        s.bind(new java.net.InetSocketAddress(p));
        socket = s;
        port = p;
        Thread t = new Thread(this::loop, "adas-lan");
        t.setDaemon(true);
        t.start();
        return port;
      } catch (IOException e) {
        last = e;
      }
    }
    throw last != null ? last : new IOException("Nincs szabad port");
  }

  synchronized void stopIfIdle() {
    boolean share = shareSecret != null && System.currentTimeMillis() < shareExpires;
    if (share || rcPin != null || castToken != null || socket == null) return;
    try {
      socket.close();
    } catch (IOException ignored) {
    }
    socket = null;
  }

  void loop() {
    ServerSocket s = socket;
    while (s != null && !s.isClosed()) {
      try {
        final Socket c = s.accept();
        try {
          pool.execute(() -> serve(c));
        } catch (RejectedExecutionException e) {
          try {
            c.close(); // túl sok egyidejű kapcsolat
          } catch (IOException ignored) {
          }
        }
      } catch (IOException e) {
        break;
      }
    }
  }

  static String hex(byte[] b) {
    StringBuilder sb = new StringBuilder();
    for (byte x : b) sb.append(String.format(java.util.Locale.ROOT, "%02x", x));
    return sb.toString();
  }

  // ------------------------------------------------------------------ átadás
  /**
   * A felület a titkosított adatot és a kódjából számolt azonosítót adja (id, 32 hexa jegy); ilyenkor a
   * visszaadott kód csak a cím utolsó száma. → { code, port, addresses, expires }
   */
  JSONObject shareStart(String data, int minutes, String id) throws Exception {
    int p = ensure();
    List<String> ips = localIps();
    String ip = ips.isEmpty() ? "0.0.0.0" : ips.get(0);
    String last = String.format(java.util.Locale.ROOT, "%03d", Integer.parseInt(ip.substring(ip.lastIndexOf('.') + 1)));
    boolean strong = id != null && id.matches("^[0-9a-f]{32}$");
    shareSecret = strong ? id : String.format(java.util.Locale.ROOT, "%03d", rnd.nextInt(1000));
    shareData = data;
    shareFails = 0;
    shareExpires = System.currentTimeMillis() + minutes * 60000L;
    String code = strong ? last : last + shareSecret;
    return new JSONObject().put("code", code).put("port", p).put("addresses", new JSONArray(ips)).put("expires", shareExpires);
  }

  void shareStop() {
    shareSecret = null;
    shareData = null;
    stopIfIdle();
  }

  // ------------------------------------------------------------------ távirányító
  JSONObject rcStart(String html, String pin, String key) throws Exception {
    byte[] n = new byte[12];
    rnd.nextBytes(n);
    synchronized (this) {
      rcHtml = html;
      rcPin = pin;
      rcKey = key != null && key.matches("^[0-9a-f]{32}$") ? key : "";
      rcNonce = hex(n);
      rcSeen.clear();
      rcFloor = 0;
      rcPinFails = 0;
      ipFails.clear();
    }
    int p = ensure();
    return new JSONObject().put("port", p).put("addresses", new JSONArray(localIps()));
  }

  void rcStop() {
    rcPin = null;
    rcHtml = null;
    stopIfIdle();
  }

  /** → 200 (rendben), 403 (hibás aláírás) vagy 429 (erről a címről túl sok hibás próbálkozás) */
  synchronized int rcAuth(String ip, String auth, String tail) {
    long now = System.currentTimeMillis();
    long[] f = ipFails.get(ip);
    if (f != null && now - f[1] > RC_WINDOW && f[2] < now) {
      ipFails.remove(ip);
      f = null;
    }
    if (f != null && f[2] > now) return 429;
    java.util.regex.Matcher m = java.util.regex.Pattern.compile("^(\\d{1,16})\\.([kp])\\.([0-9a-f]{32})$").matcher(auth == null ? "" : auth);
    boolean ok = false;
    boolean pinMode = false;
    if (m.matches()) {
      pinMode = m.group(2).equals("p");
      // PIN-nel (4 jegy) csak korlátozott számú hibáig; a QR-kulcsos telefonokat ez nem érinti
      String secret = !pinMode ? rcKey : rcPinFails < 200 ? rcPin : "";
      if (secret != null && !secret.isEmpty()) {
        try {
          Mac mac = Mac.getInstance("HmacSHA256");
          mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
          String want = hex(mac.doFinal((rcNonce + "|" + m.group(1) + "|" + tail).getBytes(StandardCharsets.UTF_8))).substring(0, 32);
          ok = MessageDigest.isEqual(want.getBytes(StandardCharsets.US_ASCII), m.group(3).getBytes(StandardCharsets.US_ASCII));
        } catch (Exception e) {
          ok = false;
        }
      }
      long ctr = Long.parseLong(m.group(1));
      if (ok && (ctr <= rcFloor || rcSeen.contains(ctr))) ok = false; // már felhasznált számláló
      if (ok) {
        rcSeen.add(ctr);
        if (rcSeen.size() > 2000) {
          Iterator<Long> it = rcSeen.iterator();
          long old = it.next();
          it.remove();
          rcFloor = Math.max(rcFloor, old);
        }
      }
    }
    if (ok) return 200;
    if (pinMode) rcPinFails++;
    if (f == null) {
      if (ipFails.size() > 500) ipFails.clear();
      f = new long[] {0, now, 0};
      ipFails.put(ip, f);
    }
    if (++f[0] >= 20) f[2] = now + RC_WINDOW;
    return 403;
  }

  // ------------------------------------------------------------------ HTTP
  /** Egy sor a kérésből, korlátos hosszal; az egész fejlécnek is van határideje (lassan csepegtetett kérés ellen). */
  static String readLine(InputStream in, long deadline) throws IOException {
    ByteArrayOutputStream b = new ByteArrayOutputStream();
    for (;;) {
      if (System.currentTimeMillis() > deadline) throw new IOException("Időtúllépés");
      int c = in.read();
      if (c < 0) return b.size() == 0 ? null : b.toString("UTF-8");
      if (c == '\n') break;
      if (c != '\r') b.write(c);
      if (b.size() > 8192) throw new IOException("Túl hosszú sor");
    }
    return b.toString("UTF-8");
  }

  void serve(Socket c) {
    try (Socket sock = c) {
      sock.setSoTimeout(5000);
      InputStream in = new java.io.BufferedInputStream(sock.getInputStream());
      long deadline = System.currentTimeMillis() + 10000;
      String line = readLine(in, deadline);
      if (line == null) return;
      String[] req = line.split(" ");
      String range = null;
      for (int n = 0; (line = readLine(in, deadline)) != null && !line.isEmpty(); n++) {
        if (n > 100) return; // fejlécek – csak a Range kell (kivetítés), de korlátlanul se jöhetnek
        if (line.regionMatches(true, 0, "range:", 0, 6)) range = line.substring(6).trim();
      }
      String target = req.length > 1 ? req[1] : "/";
      String path = target, query = "";
      int q = target.indexOf('?');
      if (q >= 0) {
        path = target.substring(0, q);
        query = target.substring(q + 1);
      }
      String[] parts = path.replaceAll("^/+", "").split("/");
      OutputStream out = sock.getOutputStream();
      if ("OPTIONS".equals(req[0])) {
        send(out, 204, "text/plain", "");
        return;
      }
      if (parts.length >= 2 && parts[0].equals("adas") && parts[1].equals("ping")) {
        send(out, 200, "application/json", new JSONObject().put("app", "adas").put("share", shareSecret != null && System.currentTimeMillis() < shareExpires).toString());
        return;
      }
      // távirányító: a kiszolgáló alkalmi száma (hitelesítés nélkül – ebből és a kulcsból írja alá a telefon a kéréseit)
      if (parts.length == 2 && parts[0].equals("adas") && parts[1].equals("rchello")) {
        String n = rcPin != null ? rcNonce : "";
        send(out, n.isEmpty() ? 403 : 200, "application/json", new JSONObject().put("n", n).toString());
        return;
      }
      if (parts.length >= 3 && parts[0].equals("adas") && parts[1].equals("share")) {
        String sec = shareSecret;
        if (sec == null || System.currentTimeMillis() > shareExpires || !MessageDigest.isEqual(parts[2].getBytes(StandardCharsets.UTF_8), sec.getBytes(StandardCharsets.UTF_8))) {
          // találgatás ellen: 10 hibás kód után az átadás leáll
          if (sec != null && ++shareFails >= 10) shareStop();
          send(out, 404, "application/json", "{\"error\":\"Hibás vagy lejárt kód\"}");
          return;
        }
        send(out, 200, "application/json; charset=utf-8", shareData);
        listener.onShareUsed(sock.getInetAddress().getHostAddress());
        return;
      }
      if (parts.length >= 3 && parts[0].equals("adas") && parts[1].equals("cast")) {
        castServe(sock, out, req[0], parts[2], query, range);
        return;
      }
      if (parts.length >= 2 && parts[0].equals("adas") && parts[1].equals("remote")) {
        String h = rcHtml;
        if (h == null) send(out, 404, "text/plain; charset=utf-8", "A távirányító ki van kapcsolva.");
        else send(out, 200, "text/html; charset=utf-8", h);
        return;
      }
      if (parts.length >= 3 && parts[0].equals("adas") && parts[1].equals("rc")) {
        if (rcPin == null) {
          send(out, 403, "application/json", "{\"error\":\"A távirányító ki van kapcsolva\"}");
          return;
        }
        // minden /adas/rc/… kérés aláírását ellenőrizzük – a védett műveletek csak ezután jönnek
        // (az aláírt rész: az útvonal hitelesítő utáni része, ahogy a kérésben áll – kódolva, lekérdezéssel)
        String prefix = "/adas/rc/" + parts[2] + "/";
        String tail = target.startsWith(prefix) ? target.substring(prefix.length()) : "";
        int st = rcAuth(sock.getInetAddress().getHostAddress(), parts[2], tail);
        if (st != 200) {
          send(out, st, "application/json", st == 429 ? "{\"error\":\"Túl sok hibás próbálkozás\"}" : "{\"error\":\"Hibás PIN\"}");
          return;
        }
        if (parts.length < 4) {
          send(out, 404, "text/plain", "Nem található");
        } else if (parts[3].equals("state")) {
          send(out, 200, "application/json; charset=utf-8", rcState);
        } else if (parts[3].equals("cmd")) {
          String cmd = "", arg = "";
          for (String kv : query.split("&")) {
            int e = kv.indexOf('=');
            if (e < 0) continue;
            String k = kv.substring(0, e), v = URLDecoder.decode(kv.substring(e + 1), "UTF-8");
            if (k.equals("c")) cmd = v;
            else if (k.equals("a")) arg = v;
          }
          listener.onRemote(cmd, arg);
          send(out, 200, "application/json", "{\"ok\":true}");
        } else send(out, 404, "text/plain", "Nem található");
        return;
      }
      send(out, 404, "text/plain", "Nem található");
    } catch (Exception ignored) {
    }
  }

  // ------------------------------------------------------------------------------- (F04) kivetítés
  /** A kivetítő eszköz által elérhető cím az adáshoz (új munkamenet: a korábbi kulcs érvényét veszti). */
  synchronized String castProxy(String url, String ua, String ref, String deviceHost) throws IOException {
    int p = ensure();
    byte[] t = new byte[16];
    rnd.nextBytes(t);
    StringBuilder sb = new StringBuilder();
    for (byte b : t) sb.append(String.format(java.util.Locale.ROOT, "%02x", b));
    castToken = sb.toString();
    castRoot = url;
    castUa = ua == null ? "" : ua;
    castRef = ref == null ? "" : ref;
    castDevice = deviceHost;
    return "http://" + addressFor(deviceHost) + ":" + p + castPath(url);
  }

  synchronized void castProxyStop() {
    castToken = null;
    stopIfIdle();
  }

  /**
   * A közvetítő címe egy adáshoz / szegmenshez: a cél a munkamenet kulcsával aláírva (HMAC) – a vevő csak a
   * közvetítő által kiadott (az adásból származó) címeket kérheti, tetszőlegeset nem.
   */
  String castPath(String target) throws IOException {
    return "/adas/cast/" + castToken + "/s?u=" + java.net.URLEncoder.encode(target, "UTF-8") + "&s=" + castSig(castToken, target);
  }

  static String castSig(String token, String target) {
    try {
      Mac m = Mac.getInstance("HmacSHA256");
      m.init(new SecretKeySpec(token.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
      byte[] d = m.doFinal(target.getBytes(StandardCharsets.UTF_8));
      StringBuilder sb = new StringBuilder();
      for (int i = 0; i < 16; i++) sb.append(String.format(java.util.Locale.ROOT, "%02x", d[i]));
      return sb.toString();
    } catch (Exception e) {
      return "";
    }
  }

  /** A név feloldott címei közt van-e helyi / belső (loopback, any-local, link-local, site-local). */
  static boolean resolvesInternal(String host) {
    try {
      for (InetAddress ad : InetAddress.getAllByName(host)) {
        if (ad.isLoopbackAddress() || ad.isAnyLocalAddress() || ad.isLinkLocalAddress() || ad.isSiteLocalAddress()) return true;
      }
      return false;
    } catch (Exception e) {
      return true; // (fel nem oldható: nem engedjük)
    }
  }

  /** A saját cím, amelyen a vevő elér (az ő hálózatában – azonos alhálózat elöl). */
  static String addressFor(String host) {
    List<String> ips = localIps();
    int dot = host.lastIndexOf('.');
    String net = dot > 0 ? host.substring(0, dot + 1) : "";
    for (String ip : ips) if (!net.isEmpty() && ip.startsWith(net)) return ip;
    return ips.isEmpty() ? "127.0.0.1" : ips.get(0);
  }

  static boolean resolvesLoopback(String host) {
    try {
      for (InetAddress ad : InetAddress.getAllByName(host)) if (ad.isLoopbackAddress() || ad.isAnyLocalAddress()) return true;
      return false;
    } catch (Exception e) {
      return true;
    }
  }

  static boolean localOrPrivate(String host) {
    String h = host.toLowerCase(java.util.Locale.ROOT);
    return h.equals("localhost") || h.startsWith("127.") || h.equals("0.0.0.0") || h.startsWith("::") || h.startsWith("[")
        || h.startsWith("192.168.") || h.startsWith("10.") || h.startsWith("169.254.") || h.matches("^172\\.(1[6-9]|2\\d|3[01])\\..*");
  }

  /**
   * A közvetítő: csak érvényes kulccsal, csak a kivetítő eszköz címéről; a cél http(s), és helyi hálózati címre
   * csak akkor mehet, ha maga az adás is ott van (pl. NAS) – a gép saját címére soha. HLS-listánál a hivatkozott
   * címek is a közvetítőre mutatnak; a Range (tekerés) átmegy.
   */
  void castServe(Socket sock, OutputStream out, String method, String token, String query, String range) throws IOException {
    String tok = castToken;
    if (tok == null || !MessageDigest.isEqual(tok.getBytes(StandardCharsets.UTF_8), token.getBytes(StandardCharsets.UTF_8)) || !sock.getInetAddress().getHostAddress().equals(castDevice)) {
      send(out, 403, "text/plain", "Nem engedélyezett");
      return;
    }
    String target = null, sig = "";
    for (String kv : query.split("&")) {
      if (kv.startsWith("u=")) target = URLDecoder.decode(kv.substring(2), "UTF-8");
      else if (kv.startsWith("s=")) sig = kv.substring(2);
    }
    // csak a közvetítő által kiadott (aláírt) cím
    if (target == null || !MessageDigest.isEqual(castSig(tok, target).getBytes(StandardCharsets.UTF_8), sig.getBytes(StandardCharsets.UTF_8))) {
      send(out, 403, "text/plain", "Nem engedélyezett cím");
      return;
    }
    java.net.URL u;
    try {
      u = new java.net.URL(target);
    } catch (Exception e) {
      send(out, 403, "text/plain", "Nem engedélyezett cím");
      return;
    }
    String rootHost = "";
    try {
      rootHost = new java.net.URL(castRoot).getHost();
    } catch (Exception ignored) {
    }
    boolean proto = "http".equals(u.getProtocol()) || "https".equals(u.getProtocol());
    // a feloldott cím számít (nem a név szövege – pl. „127.0.0.1.nip.io”): belső címre csak akkor, ha maga az
    // adás is ott van (pl. NAS), a gép saját címére soha
    boolean self = u.getHost().equals("localhost") || u.getHost().startsWith("127.") || resolvesLoopback(u.getHost());
    boolean lanOk = !self && (!(localOrPrivate(u.getHost()) || resolvesInternal(u.getHost())) || u.getHost().equals(rootHost));
    if (!proto || !lanOk) {
      send(out, 403, "text/plain", "Nem engedélyezett cím");
      return;
    }
    Map<String, String> h = new HashMap<>();
    h.put("User-Agent", castUa.isEmpty() ? MainActivity.CHROME_UA : castUa);
    if (!castRef.isEmpty()) h.put("Referer", castRef);
    if (range != null) h.put("Range", range);
    java.net.HttpURLConnection c;
    try {
      c = HttpOpen.open(target, "HEAD".equals(method) ? "HEAD" : "GET", h, null, 20000);
    } catch (Exception e) {
      send(out, 502, "text/plain", "A forrás nem érhető el");
      return;
    }
    int code = c.getResponseCode();
    String type = String.valueOf(c.getContentType()).toLowerCase(java.util.Locale.ROOT);
    String finalUrl = c.getURL().toString();
    boolean list = type.contains("mpegurl") || c.getURL().getPath().toLowerCase(java.util.Locale.ROOT).matches(".*\\.m3u8?$");
    if (list && code >= 200 && code < 300) {
      byte[] body;
      try (InputStream in = c.getInputStream()) {
        ByteArrayOutputStream b = new ByteArrayOutputStream();
        byte[] buf = new byte[16384];
        for (int n; (n = in.read(buf)) > 0; ) {
          b.write(buf, 0, n);
          if (b.size() > 4 * 1024 * 1024) {
            send(out, 502, "text/plain", "A lista túl nagy");
            return;
          }
        }
        body = b.toByteArray();
      }
      String text = new String(body, StandardCharsets.UTF_8);
      if (text.trim().startsWith("#EXTM3U")) {
        StringBuilder o = new StringBuilder();
        java.util.regex.Pattern uri = java.util.regex.Pattern.compile("URI=\"([^\"]+)\"");
        for (String line : text.split("\r?\n")) {
          String l = line.trim();
          if (l.isEmpty()) o.append(line);
          else if (l.startsWith("#")) {
            java.util.regex.Matcher m = uri.matcher(line);
            StringBuffer sbuf = new StringBuffer();
            while (m.find()) m.appendReplacement(sbuf, java.util.regex.Matcher.quoteReplacement("URI=\"" + castPath(abs(finalUrl, m.group(1))) + "\""));
            m.appendTail(sbuf);
            o.append(sbuf);
          } else o.append(castPath(abs(finalUrl, l)));
          o.append('\n');
        }
        byte[] ob = o.toString().getBytes(StandardCharsets.UTF_8);
        String head = "HTTP/1.1 200 OK\r\nContent-Type: application/vnd.apple.mpegurl\r\nContent-Length: " + ob.length + "\r\nCache-Control: no-cache\r\nAccess-Control-Allow-Origin: *\r\nConnection: close\r\n\r\n";
        out.write(head.getBytes(StandardCharsets.UTF_8));
        if (!"HEAD".equals(method)) out.write(ob);
        out.flush();
        return;
      }
      String head = "HTTP/1.1 " + code + " OK\r\nContent-Type: application/octet-stream\r\nContent-Length: " + body.length + "\r\nConnection: close\r\n\r\n";
      out.write(head.getBytes(StandardCharsets.UTF_8));
      if (!"HEAD".equals(method)) out.write(body);
      out.flush();
      return;
    }
    StringBuilder head = new StringBuilder("HTTP/1.1 " + code + " " + (code == 206 ? "Partial Content" : code < 300 ? "OK" : "Error") + "\r\n");
    String ct = c.getContentType();
    // aktív dokumentumtípus (HTML, SVG, szkript) nem mehet tovább – a vevőnek csak média kell (a DASH-leíró marad)
    if (ct != null && (ct.matches("(?i).*(html|svg|javascript|ecmascript).*") || (ct.toLowerCase(java.util.Locale.ROOT).contains("xml") && !ct.toLowerCase(java.util.Locale.ROOT).contains("dash+xml")))) ct = "application/octet-stream";
    if (ct != null) head.append("Content-Type: ").append(ct).append("\r\n");
    for (String k : new String[] {"Content-Length", "Content-Range", "Accept-Ranges", "Last-Modified", "ETag"}) {
      String v = c.getHeaderField(k);
      if (v != null) head.append(k).append(": ").append(v).append("\r\n");
    }
    head.append("Access-Control-Allow-Origin: *\r\nConnection: close\r\n\r\n");
    out.write(head.toString().getBytes(StandardCharsets.UTF_8));
    if ("HEAD".equals(method)) {
      out.flush();
      return;
    }
    sock.setSoTimeout(0); // (élő adásnál a kapcsolat sokáig nyitva marad)
    try (InputStream in = code >= 400 ? c.getErrorStream() : c.getInputStream()) {
      if (in == null) return;
      byte[] buf = new byte[64 * 1024];
      for (int n; (n = in.read(buf)) > 0; ) {
        if (castToken == null || !tok.equals(castToken)) break; // a kivetítés véget ért / új munkamenet
        out.write(buf, 0, n);
      }
      out.flush();
    } catch (IOException ignored) {
      // a vevő bontotta a kapcsolatot
    }
  }

  static String abs(String base, String ref) {
    try {
      return new java.net.URL(new java.net.URL(base), ref).toString();
    } catch (Exception e) {
      return ref;
    }
  }

  static void send(OutputStream out, int code, String type, String body) throws IOException {
    byte[] b = (body == null ? "" : body).getBytes(StandardCharsets.UTF_8);
    String status = code == 200 ? "OK" : code == 204 ? "No Content" : code == 403 ? "Forbidden" : code == 429 ? "Too Many Requests" : code == 502 ? "Bad Gateway" : "Not Found";
    String head = "HTTP/1.1 " + code + " " + status + "\r\nContent-Type: " + type + "\r\nContent-Length: " + b.length
        + "\r\nAccess-Control-Allow-Origin: *\r\nAccess-Control-Allow-Headers: *\r\nCache-Control: no-store\r\nConnection: close\r\n\r\n";
    out.write(head.getBytes(StandardCharsets.UTF_8));
    out.write(b);
    out.flush();
  }

  /** A helyi IPv4-címek (a 192.168.x / 10.x / 172.16–31.x elöl). */
  static List<String> localIps() {
    List<String> a = new ArrayList<>();
    try {
      for (NetworkInterface ni : Collections.list(NetworkInterface.getNetworkInterfaces())) {
        if (!ni.isUp() || ni.isLoopback() || ni.isVirtual()) continue;
        for (InetAddress ad : Collections.list(ni.getInetAddresses())) {
          if (ad instanceof Inet4Address && !ad.isLoopbackAddress() && !ad.isLinkLocalAddress()) a.add(ad.getHostAddress());
        }
      }
    } catch (Exception ignored) {
    }
    Collections.sort(a, (x, y) -> rank(x) - rank(y));
    return a;
  }

  static int rank(String ip) {
    if (ip.startsWith("192.168.")) return 0;
    if (ip.startsWith("10.")) return 1;
    if (ip.matches("^172\\.(1[6-9]|2\\d|3[01])\\..*")) return 2;
    return 3;
  }
}
