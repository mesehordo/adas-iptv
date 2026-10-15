package hu.adas.tv;

import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.pm.PackageInfo;
import android.content.pm.PackageInstaller;
import android.content.pm.PackageManager;
import android.content.pm.Signature;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;

import org.json.JSONObject;

import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.security.MessageDigest;
import java.util.HashSet;
import java.util.Locale;
import java.util.Set;

/**
 * (F03) Beépített Android-frissítés: a felület által felkínált APK letöltése (csak https, SHA-256 a kiadás
 * SHA256SUMS.txt-je szerint), ellenőrzése (ugyanaz a csomag, újabb verzió, ugyanaz az aláíró tanúsítvány –
 * az ellenőrző összeg csak az átvitelt igazolja, az aláírást nem), majd telepítése a rendszer telepítőjével,
 * a felhasználó jóváhagyásával (csendes telepítés nincs). A profilok és a listák megmaradnak: a frissítés a
 * meglévő alkalmazást cseréli, az adatai érintetlenek.
 */
final class Updater {
  private Updater() {}

  static final String ACTION = "hu.adas.tv.INSTALL_STATUS";
  private static final java.util.concurrent.atomic.AtomicBoolean busy = new java.util.concurrent.atomic.AtomicBoolean(false);
  // a telepítő visszajelzésének titkos azonosítója: Android 13 alatt a dinamikus fogadó exportált – egy másik
  // alkalmazás küldte hamis „jóváhagyás kell” üzenet (tetszőleges Intenttel) így nem fogadható el
  private static final String NONCE = newNonce();

  private static String newNonce() {
    byte[] b = new byte[16];
    new java.security.SecureRandom().nextBytes(b);
    return hex(b);
  }
  /** A sikeresen letöltött és ellenőrzött fájlok: csak ezek telepíthetők (a felülettől kapott útvonal nem). */
  private static final Set<String> verified = new HashSet<>();
  private static BroadcastReceiver receiver;

  static File dir(Context ctx) {
    File d = new File(ctx.getCacheDir(), "updates");
    //noinspection ResultOfMethodCallIgnored
    d.mkdirs();
    return d;
  }

  /** Letöltés és ellenőrzés. → { file, version } */
  static JSONObject download(MainActivity act, JSONObject a) throws Exception {
    String url = a.optString("url");
    String sha = a.optString("sha256").toLowerCase(Locale.ROOT);
    if (!url.toLowerCase(Locale.ROOT).startsWith("https://")) throw new Exception(L.t(act, "A frissítés csak https:// címről tölthető le."));
    if (!sha.matches("^[0-9a-f]{64}$")) throw new Exception(L.t(act, "Ehhez a kiadáshoz nincs ellenőrző összeg (SHA256SUMS.txt), ezért nem telepíthető automatikusan – töltsd le a kiadás oldaláról."));
    if (!busy.compareAndSet(false, true)) throw new Exception(L.t(act, "Már folyamatban van egy letöltés."));
    // a korábbi letöltések törlése (helyet szabadít fel)
    File[] old = dir(act).listFiles();
    if (old != null) for (File f : old) //noinspection ResultOfMethodCallIgnored
      f.delete();
    File file = new File(dir(act), "adas-update-" + System.currentTimeMillis() + ".apk");
    try {
      java.util.Map<String, String> h = new java.util.HashMap<>();
      h.put("User-Agent", "Adas-Updater");
      HttpURLConnection c = HttpOpen.open(url, "GET", h, null, 30000);
      // (átirányítás után is csak titkosított kapcsolat – pl. a GitHub tárhelyére)
      if (!"https".equalsIgnoreCase(c.getURL().getProtocol())) throw new Exception(L.t(act, "A frissítés csak https:// címről tölthető le."));
      int code = c.getResponseCode();
      if (code / 100 != 2) throw new Exception("HTTP " + code);
      long total = c.getContentLengthLong();
      long free = dir(act).getUsableSpace();
      if (total > 0 && free > 0 && free < total + 20L * 1024 * 1024) throw new Exception(L.t(act, "Nincs elég szabad tárhely a frissítés letöltéséhez."));
      MessageDigest md = MessageDigest.getInstance("SHA-256");
      long got = 0;
      long last = 0;
      try (InputStream in = c.getInputStream(); OutputStream out = new FileOutputStream(file)) {
        byte[] buf = new byte[64 * 1024];
        for (int n; (n = in.read(buf)) > 0; ) {
          out.write(buf, 0, n);
          md.update(buf, 0, n);
          got += n;
          if (total > 0 && System.currentTimeMillis() - last > 250) {
            last = System.currentTimeMillis();
            progress(act, (double) got / total);
          }
        }
      }
      if (!hex(md.digest()).equals(sha)) throw new Exception(L.t(act, "A letöltött fájl ellenőrző összege nem egyezik a kiadáséval – a frissítés megszakítva."));
      String version = verifyApk(act, file);
      verified.add(file.getAbsolutePath());
      progress(act, 1);
      JSONObject o = new JSONObject();
      o.put("file", file.getAbsolutePath());
      o.put("version", version);
      return o;
    } catch (Exception e) {
      //noinspection ResultOfMethodCallIgnored
      file.delete();
      throw e;
    } finally {
      busy.set(false);
    }
  }

  static void progress(MainActivity act, double p) {
    final String js = "window.__adasUpdateProgress&&window.__adasUpdateProgress(" + p + ")";
    act.runOnUiThread(() -> act.web.evaluateJavascript(js, null));
  }

  /** Ugyanaz a csomag, újabb verzió, ugyanaz az aláíró – különben nem lehet a saját frissítés. → versionName */
  @SuppressWarnings("deprecation")
  static String verifyApk(Context ctx, File file) throws Exception {
    PackageManager pm = ctx.getPackageManager();
    int flags = Build.VERSION.SDK_INT >= 28 ? PackageManager.GET_SIGNING_CERTIFICATES : PackageManager.GET_SIGNATURES;
    PackageInfo apk = pm.getPackageArchiveInfo(file.getAbsolutePath(), flags);
    if (apk == null) throw new Exception(L.t(ctx, "A letöltött fájl nem érvényes Android-csomag."));
    if (!ctx.getPackageName().equals(apk.packageName)) throw new Exception(L.t(ctx, "A letöltött csomag nem az Adás frissítése."));
    PackageInfo cur = pm.getPackageInfo(ctx.getPackageName(), flags);
    long vNew = Build.VERSION.SDK_INT >= 28 ? apk.getLongVersionCode() : apk.versionCode;
    long vCur = Build.VERSION.SDK_INT >= 28 ? cur.getLongVersionCode() : cur.versionCode;
    if (vNew <= vCur) throw new Exception(L.t(ctx, "A letöltött csomag nem újabb a telepítettnél."));
    Signature[] a = signers(apk);
    Signature[] b = signers(cur);
    // (régebbi Androidon a letöltött csomag aláírása nem mindig olvasható ki – ott a rendszer telepítője
    // ellenőrzi: más aláírású csomaggal a meglévő alkalmazás nem frissíthető)
    if (a != null && b != null && !sameSigners(a, b)) throw new Exception(L.t(ctx, "A letöltött csomag aláírása eltér a telepítettétől – a frissítés megszakítva."));
    if (a == null && Build.VERSION.SDK_INT >= 28) throw new Exception(L.t(ctx, "A letöltött csomag aláírása nem ellenőrizhető."));
    return apk.versionName == null ? "" : apk.versionName;
  }

  @SuppressWarnings("deprecation")
  static Signature[] signers(PackageInfo p) {
    if (Build.VERSION.SDK_INT >= 28) {
      if (p.signingInfo == null) return null;
      return p.signingInfo.hasMultipleSigners() ? p.signingInfo.getApkContentsSigners() : p.signingInfo.getSigningCertificateHistory();
    }
    return p.signatures;
  }

  static boolean sameSigners(Signature[] a, Signature[] b) throws Exception {
    Set<String> x = new HashSet<>();
    Set<String> y = new HashSet<>();
    MessageDigest md = MessageDigest.getInstance("SHA-256");
    for (Signature s : a) x.add(hex(md.digest(s.toByteArray())));
    for (Signature s : b) y.add(hex(md.digest(s.toByteArray())));
    // (kulcsforgatásnál a régi tanúsítvány a történetben van: elég, ha van közös)
    for (String s : x) if (y.contains(s)) return true;
    return false;
  }

  static String hex(byte[] d) {
    StringBuilder sb = new StringBuilder();
    for (byte v : d) sb.append(String.format(Locale.ROOT, "%02x", v));
    return sb.toString();
  }

  /**
   * Telepítés a rendszer telepítőjével. → "pending" (a rendszer jóváhagyást kér) vagy "permission" (előbb az
   * ismeretlen forrásból történő telepítést kell engedélyezni – a beállítás megnyílik).
   */
  static String install(MainActivity act, String path) throws Exception {
    if (!verified.contains(path)) throw new Exception(L.t(act, "Ismeretlen frissítési fájl."));
    File file = new File(path);
    if (!file.isFile()) throw new Exception(L.t(act, "A letöltött frissítés már nem található – töltsd le újra."));
    if (Build.VERSION.SDK_INT >= 26 && !act.getPackageManager().canRequestPackageInstalls()) {
      Intent i = new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES, Uri.parse("package:" + act.getPackageName())).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
      try {
        act.startActivity(i);
      } catch (Exception e) {
        throw new Exception(L.t(act, "Az alkalmazások telepítésének engedélyezése ezen az eszközön nem nyitható meg."));
      }
      return "permission";
    }
    verifyApk(act, file); // (a letöltés óta nem cserélődhetett ki)
    register(act);
    PackageInstaller pi = act.getPackageManager().getPackageInstaller();
    PackageInstaller.SessionParams params = new PackageInstaller.SessionParams(PackageInstaller.SessionParams.MODE_FULL_INSTALL);
    params.setAppPackageName(act.getPackageName());
    params.setSize(file.length());
    int id = pi.createSession(params);
    try (PackageInstaller.Session s = pi.openSession(id)) {
      try (InputStream in = new FileInputStream(file); OutputStream out = s.openWrite("adas.apk", 0, file.length())) {
        byte[] buf = new byte[64 * 1024];
        for (int n; (n = in.read(buf)) > 0; ) out.write(buf, 0, n);
        s.fsync(out);
      }
      Intent cb = new Intent(ACTION).setPackage(act.getPackageName()).putExtra("nonce", NONCE);
      int mutable = Build.VERSION.SDK_INT >= 31 ? 0x02000000 /* FLAG_MUTABLE */ : 0;
      PendingIntent sender = PendingIntent.getBroadcast(act, id, cb, PendingIntent.FLAG_UPDATE_CURRENT | mutable);
      s.commit(sender.getIntentSender());
    } catch (Exception e) {
      try {
        pi.abandonSession(id);
      } catch (Exception ignored) {
      }
      throw e;
    }
    return "pending";
  }

  /** A telepítő visszajelzése: jóváhagyás kérése (a rendszer ablaka), siker, hiba / megszakítás. */
  static synchronized void register(final MainActivity act) {
    if (receiver != null) return;
    receiver =
        new BroadcastReceiver() {
          @Override
          public void onReceive(Context ctx, Intent intent) {
            // csak a saját telepítési munkamenet visszajelzése (a titkos azonosítóval) – másét figyelmen kívül hagyjuk
            String n = intent.getStringExtra("nonce");
            if (n == null || !java.security.MessageDigest.isEqual(n.getBytes(java.nio.charset.StandardCharsets.UTF_8), NONCE.getBytes(java.nio.charset.StandardCharsets.UTF_8))) return;
            int status = intent.getIntExtra(PackageInstaller.EXTRA_STATUS, PackageInstaller.STATUS_FAILURE);
            if (status == PackageInstaller.STATUS_PENDING_USER_ACTION) {
              Intent confirm = intent.getParcelableExtra(Intent.EXTRA_INTENT);
              if (confirm != null) {
                confirm.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                try {
                  act.startActivity(confirm);
                } catch (Exception e) {
                  report(act, "error", e.getMessage());
                }
              }
              return;
            }
            if (status == PackageInstaller.STATUS_SUCCESS) report(act, "done", "");
            else if (status == PackageInstaller.STATUS_FAILURE_ABORTED) report(act, "aborted", "");
            else report(act, "error", intent.getStringExtra(PackageInstaller.EXTRA_STATUS_MESSAGE));
          }
        };
    IntentFilter f = new IntentFilter(ACTION);
    if (Build.VERSION.SDK_INT >= 33) act.registerReceiver(receiver, f, 4 /* RECEIVER_NOT_EXPORTED */);
    else act.registerReceiver(receiver, f);
  }

  static void unregister(Context ctx) {
    if (receiver == null) return;
    try {
      ctx.unregisterReceiver(receiver);
    } catch (Exception ignored) {
    }
    receiver = null;
  }

  static void report(MainActivity act, String state, String msg) {
    try {
      JSONObject o = new JSONObject();
      o.put("state", state);
      o.put("message", msg == null ? "" : msg);
      final String js = "window.__adasUpdateStatus&&window.__adasUpdateStatus(" + o + ")";
      act.runOnUiThread(() -> act.web.evaluateJavascript(js, null));
    } catch (Exception ignored) {
    }
  }

}
