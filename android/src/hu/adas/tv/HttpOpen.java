package hu.adas.tv;

import java.io.IOException;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.InetAddress;
import java.net.Proxy;
import java.net.ProxySelector;
import java.net.Socket;
import java.net.URL;
import java.net.UnknownHostException;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import javax.net.ssl.HttpsURLConnection;
import javax.net.ssl.SSLSocketFactory;

/**
 * HTTP-kapcsolat átirányítások kézi követésével (a HttpURLConnection a http↔https váltást magától nem
 * követi). Minden lépésnél:
 *  - más eredetre (protokoll, szerver, tényleges port) a hitelesítő fejlécek (API-kulcs, Bearer token,
 *    süti) nem mennek tovább;
 *  - hitelesített HTTPS-kérés nem léphet vissza HTTP-re;
 *  - a kérés törzse (307 / 308) nem küldhető más eredetre;
 *  - 303 után GET; 301 / 302 után csak a POST lesz GET, törzs nélkül (mint a böngészőkben).
 * Android-függőség nélkül, hogy a JDK-val is tesztelhető legyen (android/test, tools/test-java.mjs).
 */
final class HttpOpen {
  private HttpOpen() {}

  static final int MAX_HOPS = 6;

  static boolean sensitiveHeader(String name) {
    String k = name.toLowerCase(Locale.ROOT);
    return k.equals("authorization") || k.equals("proxy-authorization") || k.equals("cookie") || k.equals("api-key") || k.equals("x-api-key") || k.equals("x-auth-token");
  }

  /** Eredet: protokoll + szerver + tényleges port (a hiányzó port a protokoll alapértéke). */
  static String originOf(URL u) {
    int port = u.getPort() < 0 ? u.getDefaultPort() : u.getPort();
    return u.getProtocol().toLowerCase(Locale.ROOT) + "://" + u.getHost().toLowerCase(Locale.ROOT) + ":" + port;
  }

  /** Névfeloldás és címszabály – a tesztek cserélik (valódi DNS és nyilvános szerver nélkül is ellenőrizhető). */
  interface Net {
    InetAddress[] resolve(String host) throws UnknownHostException;

    boolean blocked(InetAddress a);
  }

  static final Net SYSTEM = new Net() {
    @Override
    public InetAddress[] resolve(String host) throws UnknownHostException {
      return InetAddress.getAllByName(host);
    }

    @Override
    public boolean blocked(InetAddress a) {
      return privateAddr(a);
    }
  };

  static volatile Net net = SYSTEM;

  /** Helyi, belső vagy fenntartott cím (loopback, magán-, link-local, CGNAT, multicast, ULA, 0.0.0.0/8). */
  static boolean privateAddr(InetAddress a) {
    if (a.isLoopbackAddress() || a.isSiteLocalAddress() || a.isLinkLocalAddress() || a.isAnyLocalAddress() || a.isMulticastAddress()) return true;
    byte[] b = a.getAddress();
    if (b.length == 4 && (b[0] & 0xff) == 100 && (b[1] & 0xc0) == 64) return true; // CGNAT 100.64.0.0/10
    if (b.length == 4 && (b[0] & 0xff) == 0) return true;
    return b.length == 16 && (b[0] & 0xfe) == 0xfc; // ULA fc00::/7
  }

  /** A szerver neve szögletes zárójelek nélkül, kisbetűvel. */
  private static String bare(String host) {
    return host.toLowerCase(Locale.ROOT).replaceAll("^\\[|\\]$", "");
  }

  /** Helyi név (localhost, .local, .internal) – feloldás nélkül. */
  private static boolean privateName(String h) {
    return h.isEmpty() || h.equals("localhost") || h.endsWith(".localhost") || h.endsWith(".local") || h.endsWith(".internal");
  }

  /**
   * Helyi, belső vagy fenntartott cím-e (localhost-nevek, magán-, link-local, CGNAT, multicast, ULA) – a név
   * feloldott címei közül bármelyik. Feloldási hibánál nem (a kapcsolódás úgyis elbukik).
   */
  static boolean privateHost(String host) {
    if (host == null) return true;
    String h = bare(host);
    if (privateName(h)) return true;
    try {
      for (InetAddress a : net.resolve(h)) if (net.blocked(a)) return true;
    } catch (Exception ignored) {
    }
    return false;
  }

  private static IOException blockedError() {
    return new IOException("Nem engedélyezett cím (helyi hálózat)");
  }

  /** Közvetlen kapcsolat-e (nincs proxy a címhez – proxyn át a nevet a proxy oldja fel). */
  static boolean direct(URL u) {
    try {
      ProxySelector ps = ProxySelector.getDefault();
      if (ps == null) return true;
      List<Proxy> l = ps.select(u.toURI());
      return l == null || l.isEmpty() || l.get(0).type() == Proxy.Type.DIRECT;
    } catch (Exception e) {
      return true;
    }
  }

  /** Host-fejléc az eredeti névvel (nem alapértelmezett portnál a porttal együtt). */
  static String hostHeader(URL u) {
    String h = u.getHost();
    if (h.indexOf(':') >= 0 && !h.startsWith("[")) h = "[" + h + "]";
    return u.getPort() < 0 || u.getPort() == u.getDefaultPort() ? h : h + ":" + u.getPort();
  }

  /** Cím URL-be írható alakban (IPv6 szögletes zárójelben, zónaazonosító nélkül). */
  private static String literal(InetAddress a) {
    String s = a.getHostAddress();
    int pct = s.indexOf('%');
    if (pct >= 0) s = s.substring(0, pct);
    return s.indexOf(':') >= 0 ? "[" + s + "]" : s;
  }

  private static HttpURLConnection configure(HttpURLConnection c, String method, Map<String, String> hdrs, boolean output, int timeoutMs) throws IOException {
    c.setInstanceFollowRedirects(false);
    c.setConnectTimeout(15000);
    c.setReadTimeout(timeoutMs);
    c.setRequestMethod(method);
    for (Map.Entry<String, String> h : hdrs.entrySet()) c.setRequestProperty(h.getKey(), h.getValue());
    if (output) c.setDoOutput(true);
    return c;
  }

  /**
   * DNS-újrakötés ellen (a név az ellenőrzéskor nyilvános, a kapcsolódáskor helyi címre oldódna fel): a nevet
   * egyszer oldjuk fel, és ha bármelyik címe helyi, elutasítjuk. Ezután
   *  - HTTP: közvetlenül az ellenőrzött címre kapcsolódunk, az eredeti Host-fejléccel;
   *  - HTTPS: a név marad (SNI és tanúsítvány-ellenőrzés változatlan), de a TLS-réteg csak akkor épül fel, ha a
   *    ténylegesen létrejött kapcsolat túloldala nem helyi cím (PeerCheck).
   * Proxyn át csak a feloldott címeket ellenőrizzük (a nevet a proxy oldja fel, a kapcsolat a proxyhoz megy).
   */
  static HttpURLConnection guarded(URL u, String method, Map<String, String> hdrs, boolean output, int timeoutMs) throws IOException {
    String host = bare(u.getHost());
    if (privateName(host)) throw blockedError();
    boolean https = "https".equalsIgnoreCase(u.getProtocol());
    boolean direct = direct(u);
    InetAddress[] addrs;
    try {
      addrs = net.resolve(host);
    } catch (UnknownHostException e) {
      if (direct) throw e;
      addrs = new InetAddress[0]; // (proxyn át a nevet a proxy oldja fel – helyben nem kell ismerni)
    }
    for (InetAddress a : addrs) if (net.blocked(a)) throw blockedError();
    if (https || !direct) {
      HttpURLConnection c = configure((HttpURLConnection) u.openConnection(), method, hdrs, output, timeoutMs);
      if (https && direct && c instanceof HttpsURLConnection) {
        HttpsURLConnection s = (HttpsURLConnection) c;
        s.setSSLSocketFactory(peerCheck(s.getSSLSocketFactory()));
      }
      return c;
    }
    int port = u.getPort() < 0 ? u.getDefaultPort() : u.getPort();
    IOException last = null;
    // (mint a rendszer: ha az első cím nem érhető el, a következő – legfeljebb háromig)
    for (int i = 0; i < addrs.length && i < 3; i++) {
      URL pinned = new URL(u.getProtocol(), literal(addrs[i]), port, u.getFile());
      HttpURLConnection c = configure((HttpURLConnection) pinned.openConnection(Proxy.NO_PROXY), method, hdrs, output, timeoutMs);
      c.setRequestProperty("Host", hostHeader(u));
      try {
        c.connect();
        return c;
      } catch (IOException e) {
        last = e;
        c.disconnect();
      }
    }
    throw last != null ? last : new UnknownHostException(host);
  }

  private static PeerCheck peerCheck;

  /** (egy példány alapgyáranként – az Android kapcsolatkészlete gyáranként osztja meg a kapcsolatokat) */
  static synchronized SSLSocketFactory peerCheck(SSLSocketFactory d) {
    if (d instanceof PeerCheck) return d;
    if (peerCheck == null || peerCheck.d != d) peerCheck = new PeerCheck(d);
    return peerCheck;
  }

  /**
   * TLS-gyár, amely a már felépült TCP-kapcsolat túloldalát ellenőrzi, mielőtt ráépítené a TLS-t. A kapcsolat
   * nélküli createSocket() szándékosan nincs megvalósítva: így a JDK is (az Android mindig) előbb sima kapcsolatot
   * nyit, és arra kéri a TLS-réteget – az eredeti névvel, tehát az SNI és a névellenőrzés változatlan.
   */
  static final class PeerCheck extends SSLSocketFactory {
    final SSLSocketFactory d;

    PeerCheck(SSLSocketFactory d) {
      this.d = d;
    }

    private static <T extends Socket> T checked(T s) throws IOException {
      InetAddress a = s.getInetAddress();
      if (a == null || net.blocked(a)) {
        try {
          s.close();
        } catch (IOException ignored) {
        }
        throw blockedError();
      }
      return s;
    }

    @Override
    public Socket createSocket(Socket s, String host, int port, boolean autoClose) throws IOException {
      return d.createSocket(checked(s), host, port, autoClose);
    }

    @Override
    public Socket createSocket(String host, int port) throws IOException {
      return checked(d.createSocket(host, port));
    }

    @Override
    public Socket createSocket(String host, int port, InetAddress localHost, int localPort) throws IOException {
      return checked(d.createSocket(host, port, localHost, localPort));
    }

    @Override
    public Socket createSocket(InetAddress host, int port) throws IOException {
      return checked(d.createSocket(host, port));
    }

    @Override
    public Socket createSocket(InetAddress address, int port, InetAddress localAddress, int localPort) throws IOException {
      return checked(d.createSocket(address, port, localAddress, localPort));
    }

    @Override
    public String[] getDefaultCipherSuites() {
      return d.getDefaultCipherSuites();
    }

    @Override
    public String[] getSupportedCipherSuites() {
      return d.getSupportedCipherSuites();
    }
  }

  static HttpURLConnection open(String url, String method, Map<String, String> headers, byte[] body, int timeoutMs) throws IOException {
    return open(url, method, headers, body, timeoutMs, false);
  }

  /**
   * blockPrivate: a lap (WebView) internetes forrásból jövő kéréseinél helyi hálózati cím nem érhető el – minden
   * lépésnél, az átirányítás célján is (mint az asztali változat hálózati szabálya), és csak az ellenőrzött címre
   * kapcsolódva (guarded – DNS-újrakötés ellen).
   */
  static HttpURLConnection open(String url, String method, Map<String, String> headers, byte[] body, int timeoutMs, boolean blockPrivate) throws IOException {
    final URL first = new URL(url);
    final String origin = originOf(first);
    boolean hasSecret = false;
    for (String k : headers.keySet()) if (sensitiveHeader(k)) hasSecret = true;
    Map<String, String> hdrs = new HashMap<>(headers);
    for (int hop = 0; hop < MAX_HOPS; hop++) {
      URL u = new URL(url);
      boolean output = body != null && body.length > 0;
      HttpURLConnection c = blockPrivate ? guarded(u, method, hdrs, output, timeoutMs) : configure((HttpURLConnection) u.openConnection(), method, hdrs, output, timeoutMs);
      if (output) {
        try (OutputStream o = c.getOutputStream()) {
          o.write(body);
        }
      }
      int code = c.getResponseCode();
      String loc = c.getHeaderField("Location");
      if (code >= 300 && code < 400 && loc != null) {
        URL next = new URL(u, loc);
        c.disconnect();
        String p = next.getProtocol().toLowerCase(Locale.ROOT);
        if (!p.equals("http") && !p.equals("https")) throw new IOException("Nem engedélyezett átirányítás");
        boolean foreign = !originOf(next).equals(origin);
        if (hasSecret && "https".equalsIgnoreCase(first.getProtocol()) && p.equals("http")) throw new IOException("Hitelesített kérés nem irányítható át titkosítatlan címre");
        // (fetch-szabvány: 303 → GET (HEAD marad); 301 / 302 → csak a POST lesz GET; más metódus és törzs marad)
        if ((code == 303 && !"GET".equals(method) && !"HEAD".equals(method)) || ((code == 301 || code == 302) && "POST".equals(method))) {
          method = "GET";
          body = null;
        } else if (code == 303) {
          body = null;
        }
        if (foreign && body != null && body.length > 0) throw new IOException("A kérés törzse nem küldhető másik szerverre");
        // (U17) a Collection.removeIf csak API 24-től van – Android 6-on (API 23) NoSuchMethodError lenne
        if (foreign) for (java.util.Iterator<String> it = hdrs.keySet().iterator(); it.hasNext(); ) if (sensitiveHeader(it.next())) it.remove();
        url = next.toString();
        continue;
      }
      return c;
    }
    throw new IOException("Túl sok átirányítás");
  }
}
