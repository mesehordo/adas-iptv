package hu.adas.tv;

import java.io.IOException;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.HashMap;
import java.util.Locale;
import java.util.Map;

/**
 * HTTP-kapcsolat átirányítások kézi követésével (a HttpURLConnection a http↔https váltást magától nem
 * követi). Minden lépésnél:
 *  - más eredetre (protokoll, szerver, tényleges port) a hitelesítő fejlécek (API-kulcs, Bearer token,
 *    süti) nem mennek tovább;
 *  - hitelesített HTTPS-kérés nem léphet vissza HTTP-re;
 *  - a kérés törzse (307 / 308) nem küldhető más eredetre;
 *  - 303 után GET; 301 / 302 után csak a POST lesz GET, törzs nélkül (mint a böngészőkben).
 * Android-függőség nélkül, hogy a JDK-val is tesztelhető legyen.
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

  static HttpURLConnection open(String url, String method, Map<String, String> headers, byte[] body, int timeoutMs) throws IOException {
    final URL first = new URL(url);
    final String origin = originOf(first);
    boolean hasSecret = false;
    for (String k : headers.keySet()) if (sensitiveHeader(k)) hasSecret = true;
    Map<String, String> hdrs = new HashMap<>(headers);
    for (int hop = 0; hop < MAX_HOPS; hop++) {
      URL u = new URL(url);
      HttpURLConnection c = (HttpURLConnection) u.openConnection();
      c.setInstanceFollowRedirects(false);
      c.setConnectTimeout(15000);
      c.setReadTimeout(timeoutMs);
      c.setRequestMethod(method);
      for (Map.Entry<String, String> h : hdrs.entrySet()) c.setRequestProperty(h.getKey(), h.getValue());
      if (body != null && body.length > 0) {
        c.setDoOutput(true);
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
        if (foreign) hdrs.keySet().removeIf(HttpOpen::sensitiveHeader);
        url = next.toString();
        continue;
      }
      return c;
    }
    throw new IOException("Túl sok átirányítás");
  }
}
