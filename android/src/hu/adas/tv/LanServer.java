package hu.adas.tv;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.Inet4Address;
import java.net.InetAddress;
import java.net.NetworkInterface;
import java.net.ServerSocket;
import java.net.Socket;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * Kis HTTP-kiszolgáló a helyi hálózaton (47800–47803), az asztali változat lan.js-ének megfelelője:
 *  - beállítások átadása kóddal: GET /adas/share/<titok> (a kód = a cím utolsó száma + a titok);
 *  - távirányító telefonról: GET /adas/remote (a vezérlőlap), /adas/rc/<pin>/state, /adas/rc/<pin>/cmd?c=…&a=…
 * Csak akkor fut, ha az átadás vagy a távirányító be van kapcsolva.
 */
class LanServer {
  interface Listener {
    void onRemote(String c, String a);
    void onShareUsed(String from);
  }

  final Listener listener;
  ServerSocket socket;
  int port;
  final ExecutorService pool = Executors.newCachedThreadPool();
  final SecureRandom rnd = new SecureRandom();

  // átadás
  volatile String shareSecret;
  volatile String shareData;
  volatile long shareExpires;
  volatile int shareFails;
  // távirányító
  volatile String rcPin;
  volatile String rcHtml;
  volatile String rcState = "{}";
  volatile int rcFails;

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
    if (share || rcPin != null || socket == null) return;
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
        pool.submit(() -> serve(c));
      } catch (IOException e) {
        break;
      }
    }
  }

  // ------------------------------------------------------------------ átadás
  /** → { code, port, addresses, expires } */
  JSONObject shareStart(String data, int minutes) throws Exception {
    int p = ensure();
    List<String> ips = localIps();
    String ip = ips.isEmpty() ? "0.0.0.0" : ips.get(0);
    String last = ip.substring(ip.lastIndexOf('.') + 1);
    shareSecret = String.format(java.util.Locale.ROOT, "%03d", rnd.nextInt(1000));
    shareData = data;
    shareFails = 0;
    shareExpires = System.currentTimeMillis() + minutes * 60000L;
    String code = String.format(java.util.Locale.ROOT, "%03d", Integer.parseInt(last)) + shareSecret;
    return new JSONObject().put("code", code).put("port", p).put("addresses", new JSONArray(ips)).put("expires", shareExpires);
  }

  void shareStop() {
    shareSecret = null;
    shareData = null;
    stopIfIdle();
  }

  // ------------------------------------------------------------------ távirányító
  JSONObject rcStart(String html, String pin) throws Exception {
    rcHtml = html;
    rcPin = pin;
    rcFails = 0;
    int p = ensure();
    return new JSONObject().put("port", p).put("addresses", new JSONArray(localIps()));
  }

  void rcStop() {
    rcPin = null;
    rcHtml = null;
    stopIfIdle();
  }

  // ------------------------------------------------------------------ HTTP
  void serve(Socket c) {
    try (Socket sock = c) {
      sock.setSoTimeout(8000);
      BufferedReader in = new BufferedReader(new InputStreamReader(sock.getInputStream(), StandardCharsets.UTF_8));
      String line = in.readLine();
      if (line == null) return;
      String[] req = line.split(" ");
      while ((line = in.readLine()) != null && !line.isEmpty()) {
        // fejlécek – nincs rájuk szükség
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
      if (parts.length >= 3 && parts[0].equals("adas") && parts[1].equals("share")) {
        String sec = shareSecret;
        if (sec == null || System.currentTimeMillis() > shareExpires || !parts[2].equals(sec)) {
          // találgatás ellen: 10 hibás kód után az átadás leáll
          if (sec != null && ++shareFails >= 10) shareStop();
          send(out, 404, "application/json", "{\"error\":\"Hibás vagy lejárt kód\"}");
          return;
        }
        send(out, 200, "application/json; charset=utf-8", shareData);
        listener.onShareUsed(sock.getInetAddress().getHostAddress());
        return;
      }
      if (parts.length >= 2 && parts[0].equals("adas") && parts[1].equals("remote")) {
        String h = rcHtml;
        if (h == null) send(out, 404, "text/plain; charset=utf-8", "A távirányító ki van kapcsolva.");
        else send(out, 200, "text/html; charset=utf-8", h);
        return;
      }
      if (parts.length >= 4 && parts[0].equals("adas") && parts[1].equals("rc")) {
        String pin = rcPin;
        if (pin == null || rcFails >= 30 || !pin.equals(parts[2])) {
          if (pin != null) rcFails++;
          send(out, 403, "application/json", "{\"error\":\"Hibás PIN\"}");
          return;
        }
        rcFails = 0;
        if (parts[3].equals("state")) {
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

  static void send(OutputStream out, int code, String type, String body) throws IOException {
    byte[] b = (body == null ? "" : body).getBytes(StandardCharsets.UTF_8);
    String status = code == 200 ? "OK" : code == 204 ? "No Content" : code == 403 ? "Forbidden" : "Not Found";
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
