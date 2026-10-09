package hu.adas.tv;

import android.webkit.WebResourceResponse;

import org.json.JSONObject;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * Tartós képtár (borítóképek, logók): a WebView a kéréseket a MainActivity proxyján keresztül kapja,
 * és az így átadott válaszokat NEM tárolja a saját gyorsítótárában – ezért minden kép minden
 * megjelenítéskor újra letöltődne. Az &lt;img&gt; kérései (Accept: image/…) itt a files/covers mappába
 * kerülnek, és legközelebb onnan jönnek. Csak valódi kép kerül a tárba (a tartalom első bájtjai
 * alapján), legfeljebb MAX_IMAGE méretig; ha a tár a MAX_BYTES-ot meghaladja, a legrégebben használt
 * képek törlődnek.
 */
final class Covers {
  interface Opener {
    HttpURLConnection open(String url, Map<String, String> pageHeaders) throws IOException;
  }

  static final long MAX_BYTES = 512L * 1024 * 1024;
  static final int MAX_IMAGE = 8 * 1024 * 1024;
  static final long TOUCH_AFTER = 24L * 3600 * 1000;

  private final File dir;
  private final Opener opener;
  private long added;
  private volatile int gen; // ürítéskor nő: a közben futó letöltések már nem mentenek

  Covers(File dir, Opener opener) {
    this.dir = dir;
    this.opener = opener;
    //noinspection ResultOfMethodCallIgnored
    dir.mkdirs();
    // indulás után a háttérben: a korlát betartása
    new Thread(this::trim, "covers-trim").start();
  }

  /** Kép kérése-e (az &lt;img&gt; Accept fejléce image/…-val kezdődik)? */
  static boolean isImage(Map<String, String> headers) {
    if (headers == null) return false;
    for (Map.Entry<String, String> e : headers.entrySet()) {
      if ("accept".equalsIgnoreCase(e.getKey())) return e.getValue() != null && e.getValue().trim().toLowerCase(Locale.ROOT).startsWith("image/");
    }
    return false;
  }

  /** A kép a tárból, vagy letöltve (és elmentve). null: a hívó a szokásos úton töltse le. */
  WebResourceResponse get(String url, Map<String, String> pageHeaders) {
    File f = new File(dir, hashName(url));
    if (f.isFile()) {
      try {
        byte[] b = readAll(new FileInputStream(f), MAX_IMAGE + 1);
        String mime = sniff(b);
        if (mime != null) {
          if (System.currentTimeMillis() - f.lastModified() > TOUCH_AFTER) //noinspection ResultOfMethodCallIgnored
            f.setLastModified(System.currentTimeMillis());
          return respond(mime, b);
        }
      } catch (IOException ignored) {
      }
    }
    int g = gen;
    HttpURLConnection c = null;
    try {
      c = opener.open(url, pageHeaders);
      if (c.getResponseCode() != 200) {
        // (a hibaválasz adatfolyamát is lezárjuk – a hívó a szokásos úton próbálja)
        InputStream err = c.getErrorStream();
        if (err != null) err.close();
        return null;
      }
      byte[] b = readAll(c.getInputStream(), MAX_IMAGE + 1);
      if (b.length > MAX_IMAGE) return null; // (túl nagy: a szokásos úton, tárolás nélkül)
      String mime = sniff(b);
      if (mime != null && g == gen) save(f, b);
      String type = c.getContentType();
      return respond(mime != null ? mime : type != null ? type.split(";")[0].trim() : "application/octet-stream", b);
    } catch (Exception e) {
      return null;
    } finally {
      if (c != null) c.disconnect();
    }
  }

  private static WebResourceResponse respond(String mime, byte[] b) {
    Map<String, String> h = new HashMap<>();
    h.put("Access-Control-Allow-Origin", "*");
    h.put("Cache-Control", "max-age=31536000");
    return new WebResourceResponse(mime, null, 200, "OK", h, new ByteArrayInputStream(b));
  }

  private synchronized void save(File f, byte[] b) {
    File tmp = new File(dir, f.getName() + ".tmp");
    try (FileOutputStream out = new FileOutputStream(tmp)) {
      out.write(b);
    } catch (IOException e) {
      //noinspection ResultOfMethodCallIgnored
      tmp.delete();
      return;
    }
    if (!tmp.renameTo(f)) {
      //noinspection ResultOfMethodCallIgnored
      tmp.delete();
      return;
    }
    added += b.length;
    if (added > 32L * 1024 * 1024) {
      added = 0;
      new Thread(this::trim, "covers-trim").start();
    }
  }

  /** A legrégebben használt képek törlése, amíg a tár a korlát 90%-a alá nem kerül. */
  synchronized void trim() {
    File[] files = dir.listFiles();
    if (files == null) return;
    List<File> list = new ArrayList<>();
    long total = 0;
    for (File f : files) {
      if (!f.isFile()) continue;
      if (f.getName().endsWith(".tmp")) {
        if (System.currentTimeMillis() - f.lastModified() > 3600 * 1000) //noinspection ResultOfMethodCallIgnored
          f.delete();
        continue;
      }
      list.add(f);
      total += f.length();
    }
    if (total <= MAX_BYTES) return;
    Collections.sort(list, (a, b) -> Long.compare(a.lastModified(), b.lastModified()));
    for (File f : list) {
      if (total <= MAX_BYTES * 9 / 10) break;
      long len = f.length();
      if (f.delete()) total -= len;
    }
  }

  /** A tár mérete: { files, bytes, max } */
  synchronized JSONObject stats() throws Exception {
    long bytes = 0;
    int n = 0;
    File[] files = dir.listFiles();
    if (files != null)
      for (File f : files)
        if (f.isFile() && !f.getName().endsWith(".tmp")) {
          n++;
          bytes += f.length();
        }
    return new JSONObject().put("files", n).put("bytes", bytes).put("max", MAX_BYTES);
  }

  synchronized void clear() {
    gen++;
    File[] files = dir.listFiles();
    if (files != null) for (File f : files) //noinspection ResultOfMethodCallIgnored
      f.delete();
  }

  /** A kép típusa a tartalom első bájtjaiból – nem képnél null. */
  static String sniff(byte[] b) {
    if (b.length < 12) return null;
    if ((b[0] & 0xff) == 0xff && (b[1] & 0xff) == 0xd8 && (b[2] & 0xff) == 0xff) return "image/jpeg";
    if ((b[0] & 0xff) == 0x89 && b[1] == 'P' && b[2] == 'N' && b[3] == 'G') return "image/png";
    if (b[0] == 'G' && b[1] == 'I' && b[2] == 'F' && b[3] == '8') return "image/gif";
    if (b[0] == 'R' && b[1] == 'I' && b[2] == 'F' && b[3] == 'F' && b[8] == 'W' && b[9] == 'E' && b[10] == 'B' && b[11] == 'P') return "image/webp";
    if (b[4] == 'f' && b[5] == 't' && b[6] == 'y' && b[7] == 'p' && b[8] == 'a' && b[9] == 'v' && b[10] == 'i' && (b[11] == 'f' || b[11] == 's')) return "image/avif";
    String head = new String(b, 0, Math.min(b.length, 512), StandardCharsets.UTF_8).trim().toLowerCase(Locale.ROOT);
    if (head.startsWith("<svg") || (head.startsWith("<?xml") && head.contains("<svg"))) return "image/svg+xml";
    return null;
  }

  private static byte[] readAll(InputStream in, int limit) throws IOException {
    try (InputStream s = in) {
      ByteArrayOutputStream out = new ByteArrayOutputStream();
      byte[] buf = new byte[16384];
      for (int n; (n = s.read(buf)) > 0; ) {
        out.write(buf, 0, n);
        if (out.size() >= limit) break;
      }
      return out.toByteArray();
    }
  }

  private static String hashName(String s) {
    try {
      byte[] d = MessageDigest.getInstance("SHA-256").digest(s.getBytes(StandardCharsets.UTF_8));
      StringBuilder sb = new StringBuilder();
      for (byte x : d) sb.append(String.format(Locale.ROOT, "%02x", x));
      return sb.toString();
    } catch (Exception e) {
      return Integer.toHexString(s.hashCode());
    }
  }
}
