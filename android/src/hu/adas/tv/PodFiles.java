package hu.adas.tv;

import android.content.Context;
import android.net.Uri;
import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.util.HashMap;
import java.util.Map;
import org.json.JSONObject;

/**
 * Podcast-letöltés Androidon: az alkalmazás saját tárhelyére (külső „files/podcasts”, ennek híján a belső), a
 * HttpOpen útvonalán – a cím és minden átirányítása a helyi hálózati szabály szerint (mint az asztali változatban a
 * műsor folyama a szabály gyökere). Legfeljebb 2 GB / epizód, és mindig marad 500 MB szabad hely; ismeretlen
 * méretnél írás közben 50 MB-onként újra ellenőrzi. Törölni csak ebből a mappából lehet.
 */
final class PodFiles {
  private PodFiles() {}

  static final long MAX = 2L * 1024 * 1024 * 1024;
  static final long RESERVE = 500_000_000L;
  private static long reserved = 0; // (a folyamatban lévő letöltések várható mérete)

  static File dir(Context c) {
    File base = c.getExternalFilesDir(null);
    if (base == null) base = c.getFilesDir();
    File d = new File(base, "podcasts");
    if (!d.isDirectory()) d.mkdirs();
    return d;
  }

  /** A fájl ebben a mappában van-e (a valódi útvonal szerint – „..” és hivatkozás sem vezethet ki). */
  static boolean inDir(Context c, File f) {
    try {
      String d = dir(c).getCanonicalPath() + File.separator;
      return f.getCanonicalPath().startsWith(d);
    } catch (IOException e) {
      return false;
    }
  }

  private static synchronized boolean reserve(File d, long need) {
    if (d.getUsableSpace() - reserved - need < RESERVE) return false;
    reserved += need;
    return true;
  }

  private static synchronized void release(long n) {
    reserved -= n;
  }

  private static String clean(String s, int max, String fallback) {
    String t = String.valueOf(s == null ? "" : s).replaceAll("[\\\\/:*?\"<>|\\x00-\\x1f]+", " ").replaceAll("\\s+", " ").trim();
    if (t.length() > max) t = t.substring(0, max).trim();
    return t.isEmpty() ? fallback : t;
  }

  static JSONObject download(Context c, JSONObject a, boolean block) throws Exception {
    String url = a.getString("url");
    String scheme = Uri.parse(url).getScheme();
    if (scheme == null || !(scheme.equalsIgnoreCase("http") || scheme.equalsIgnoreCase("https"))) throw new IOException("Érvénytelen cím");
    File d = dir(c);
    String ext = "mp3";
    java.util.regex.Matcher m = java.util.regex.Pattern.compile("\\.(mp3|m4a|aac|ogg|opus|mp4|m4v|webm|wav|flac)(?:[?#]|$)", java.util.regex.Pattern.CASE_INSENSITIVE).matcher(url);
    if (m.find()) ext = m.group(1).toLowerCase(java.util.Locale.ROOT);
    // (profilonként külön fájl: egy profil törlése nem viszi el a másik letöltését)
    String tag = (a.optString("profile", "") + "." + a.optString("key", "")).replaceAll("[^\\w.-]", "").replaceAll("^\\.+|\\.+$", "");
    if (tag.isEmpty()) tag = String.valueOf(System.currentTimeMillis());
    File file = new File(d, clean(a.optString("name"), 120, "epizod") + " [" + tag + "]." + ext);
    if (!inDir(c, file)) throw new IOException("Érvénytelen fájlnév");
    if (d.getUsableSpace() - RESERVE <= 0) throw new IOException("Kevés a szabad hely");
    Map<String, String> h = new HashMap<>();
    h.put("User-Agent", MainActivity.CHROME_UA);
    h.put("Accept-Encoding", "identity");
    HttpURLConnection conn = HttpOpen.open(url, "GET", h, null, 30000, block);
    File tmp = new File(d, file.getName() + ".part");
    long size = 0;
    long need = 0;
    try {
      int code = conn.getResponseCode();
      if (code < 200 || code > 299) throw new IOException("A letöltés nem sikerült (" + code + ")");
      long len = conn.getContentLengthLong();
      if (len > MAX) throw new IOException("Túl nagy fájl");
      need = len > 0 ? len : 200_000_000L;
      if (!reserve(d, need)) {
        need = 0;
        throw new IOException("Kevés a szabad hely");
      }
      long checked = 0;
      try (InputStream in = conn.getInputStream(); FileOutputStream out = new FileOutputStream(tmp)) {
        byte[] buf = new byte[64 * 1024];
        for (int n; (n = in.read(buf)) > 0; ) {
          size += n;
          if (size > MAX) throw new IOException("Túl nagy fájl");
          // (ismeretlen vagy a vártnál nagyobb méretnél: a két ellenőrzés közti adat is beleszámít)
          if (size - checked > 50_000_000L) {
            checked = size;
            if (d.getUsableSpace() - 50_000_000L < RESERVE) throw new IOException("Kevés a szabad hely");
          }
          out.write(buf, 0, n);
        }
        out.getFD().sync();
      }
      if (file.exists() && !file.delete()) throw new IOException("A régi fájl nem írható felül");
      if (!tmp.renameTo(file)) throw new IOException("A fájl nem menthető");
    } catch (Exception e) {
      tmp.delete();
      throw e;
    } finally {
      conn.disconnect();
      if (need > 0) release(need);
    }
    JSONObject o = new JSONObject();
    o.put("path", file.getAbsolutePath());
    o.put("url", Uri.fromFile(file).toString());
    o.put("size", size);
    return o;
  }

  static boolean delete(Context c, String path) {
    if (path == null || path.isEmpty()) return false;
    File f = new File(path);
    if (!inDir(c, f)) return false;
    return !f.exists() || f.delete();
  }
}
