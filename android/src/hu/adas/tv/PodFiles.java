package hu.adas.tv;

import android.content.Context;
import android.net.Uri;
import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;
import org.json.JSONObject;

/**
 * Podcast-letöltés Androidon: az alkalmazás saját tárhelyére (külső „files/podcasts”, ennek híján a belső), a
 * HttpOpen útvonalán – a cím és minden átirányítása a helyi hálózati szabály szerint. Legfeljebb 2 GB / epizód, és
 * mindig marad 500 MB szabad hely: a várható méretet a letöltés lefoglalja (a párhuzamosak se fogyasszák el a
 * tartalékot), írás közben 50 MB-onként újra ellenőriz. Törölni és lejátszani csak ezekből a mappákból lehet.
 */
final class PodFiles {
  private PodFiles() {}

  static final long MAX = 2L * 1024 * 1024 * 1024;
  static final long RESERVE = 500_000_000L;
  static final long STEP = 50_000_000L;
  private static long reserved = 0; // (a folyamatban lévő letöltések még le nem írt, várható mérete)
  private static final Set<String> active = new HashSet<>(); // (a folyamatban lévő letöltések .part fájljai)

  /** A letöltések mappája (a külső tárhely, ha van; különben a belső). */
  static File dir(Context c) {
    File base = c.getExternalFilesDir(null);
    if (base == null) base = c.getFilesDir();
    File d = new File(base, "podcasts");
    if (!d.isDirectory()) d.mkdirs();
    return d;
  }

  /**
   * A fájl a podcast-mappák egyikében van-e (a külsőben vagy a belsőben – egy korábban belsőre mentett letöltés akkor
   * is, ha azóta van külső tárhely), a valódi útvonal szerint: „..” és hivatkozás sem vezethet ki.
   */
  static boolean inDir(Context c, File f) {
    try {
      String p = f.getCanonicalPath();
      File ext = c.getExternalFilesDir(null);
      for (File base : new File[] {ext, c.getFilesDir()}) {
        if (base == null) continue;
        String d = new File(base, "podcasts").getCanonicalPath() + File.separator;
        if (p.startsWith(d)) return true;
      }
    } catch (IOException ignored) {
    }
    return false;
  }

  private static synchronized boolean reserve(File d, long need) {
    if (d.getUsableSpace() - reserved - need < RESERVE) return false;
    reserved += need;
    return true;
  }

  private static synchronized void release(long n) {
    reserved -= n;
  }

  /** Írás közben: elég-e a hely a következő szakaszhoz – a többi letöltés foglalását levonva (a sajátot nem). */
  private static synchronized boolean roomFor(File d, long own) {
    return d.getUsableSpace() - (reserved - own) - STEP >= RESERVE;
  }

  /** A félbemaradt (pl. az alkalmazás leállásakor megszakadt) letöltések maradéka – a most futókét nem bántja. */
  private static synchronized void cleanStale(File d) {
    File[] list = d.listFiles();
    if (list == null) return;
    for (File f : list) if (f.getName().endsWith(".part") && !active.contains(f.getName())) f.delete();
  }

  private static String clean(String s, int max, String fallback) {
    String t = String.valueOf(s == null ? "" : s).replaceAll("[\\\\/:*?\"<>|\\x00-\\x1f]+", " ").replaceAll("\\s+", " ").trim();
    if (t.length() > max) t = t.substring(0, max).trim();
    return t.isEmpty() ? fallback : t;
  }

  /** A Content-Length (2 GB fölött is – a getContentLengthLong csak Android 7-től van); -1: ismeretlen. */
  private static long contentLength(HttpURLConnection c) {
    try {
      String v = c.getHeaderField("Content-Length");
      return v == null ? -1 : Long.parseLong(v.trim());
    } catch (NumberFormatException e) {
      return -1;
    }
  }

  static JSONObject download(Context c, JSONObject a, boolean block) throws Exception {
    String url = a.getString("url");
    String scheme = Uri.parse(url).getScheme();
    if (scheme == null || !(scheme.equalsIgnoreCase("http") || scheme.equalsIgnoreCase("https"))) throw new IOException("Érvénytelen cím");
    File d = dir(c);
    cleanStale(d);
    String ext = "mp3";
    java.util.regex.Matcher m = java.util.regex.Pattern.compile("\\.(mp3|m4a|aac|ogg|opus|mp4|m4v|webm|wav|flac)(?:[?#]|$)", java.util.regex.Pattern.CASE_INSENSITIVE).matcher(url);
    if (m.find()) ext = m.group(1).toLowerCase(java.util.Locale.ROOT);
    // (profilonként külön fájl: egy profil törlése nem viszi el a másik letöltését)
    String tag = (a.optString("profile", "") + "." + a.optString("key", "")).replaceAll("[^\\w.-]", "").replaceAll("^\\.+|\\.+$", "");
    if (tag.isEmpty()) tag = String.valueOf(System.currentTimeMillis());
    File file = new File(d, clean(a.optString("name"), 120, "epizod") + " [" + tag + "]." + ext);
    if (!inDir(c, file)) throw new IOException("Érvénytelen fájlnév");
    if (d.getUsableSpace() - RESERVE <= 0) throw new IOException("Kevés a szabad hely");
    File tmp = new File(d, file.getName() + ".part");
    synchronized (PodFiles.class) {
      if (!active.add(tmp.getName())) throw new IOException("Ez az epizód már töltődik");
    }
    Map<String, String> h = new HashMap<>();
    h.put("User-Agent", MainActivity.CHROME_UA);
    h.put("Accept-Encoding", "identity");
    HttpURLConnection conn = null;
    long size = 0;
    long held = 0; // (a saját foglalás még le nem írt része)
    try {
      conn = HttpOpen.open(url, "GET", h, null, 30000, block);
      int code = conn.getResponseCode();
      if (code < 200 || code > 299) throw new IOException("A letöltés nem sikerült (" + code + ")");
      long len = contentLength(conn);
      if (len > MAX) throw new IOException("Túl nagy fájl");
      long need = len > 0 ? len : 200_000_000L;
      if (!reserve(d, need)) throw new IOException("Kevés a szabad hely");
      held = need;
      long checked = 0;
      try (InputStream in = conn.getInputStream(); FileOutputStream out = new FileOutputStream(tmp)) {
        byte[] buf = new byte[64 * 1024];
        for (int n; (n = in.read(buf)) > 0; ) {
          if (size + n > MAX) throw new IOException("Túl nagy fájl");
          if (size + n - checked > STEP) {
            checked = size;
            if (!roomFor(d, held)) throw new IOException("Kevés a szabad hely");
          }
          out.write(buf, 0, n);
          size += n;
          // (a leírt rész már nem foglalás: a szabad hely ennyivel kisebb)
          long r = Math.min(n, held);
          if (r > 0) {
            release(r);
            held -= r;
          }
        }
        out.getFD().sync();
      }
      if (size == 0) throw new IOException("Üres fájl érkezett");
      if (file.exists() && !file.delete()) throw new IOException("A régi fájl nem írható felül");
      if (!tmp.renameTo(file)) throw new IOException("A fájl nem menthető");
    } catch (Exception e) {
      tmp.delete();
      throw e;
    } finally {
      if (conn != null) conn.disconnect();
      if (held > 0) release(held);
      synchronized (PodFiles.class) {
        active.remove(tmp.getName());
      }
    }
    JSONObject o = new JSONObject();
    o.put("path", file.getAbsolutePath());
    o.put("url", Uri.fromFile(file).toString());
    o.put("size", size);
    return o;
  }

  /** Törlés (csak a podcast-mappákból); true: a fájl nincs meg (törölve, vagy már korábban sem volt). */
  static boolean delete(Context c, String path) {
    if (path == null || path.isEmpty()) return false;
    File f = new File(path);
    if (!inDir(c, f)) return false;
    return !f.exists() || f.delete();
  }
}
