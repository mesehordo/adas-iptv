package hu.adas.tv;

import android.content.Context;

import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.util.Locale;

/**
 * A keret (értesítések, háttérlejátszás, rendszerüzenetek) szövegei a felület nyelvén. A nyelvet a
 * felület adja át (AdasAndroid.setLang), és megmarad – így a bezárt alkalmazás értesítése is jó nyelvű.
 * A kulcs a magyar szöveg; {n} helyőrző. A fordítások a felület nyelvi fájljaiból (src/i18n/<nyelv>.js)
 * jönnek: a build-android.mjs az itt használt kulcsokat assets/i18n/<nyelv>.json-ba írja. Hiányzó
 * fordításnál az angol, ha az sincs, a magyar szöveg marad.
 */
final class L {
  private L() {}

  static final String KEY = "lang";
  private static String loaded = null;
  private static JSONObject own = null;
  private static JSONObject en = null;

  static String lang(Context ctx) {
    return ctx.getSharedPreferences(ReminderReceiver.PREFS, Context.MODE_PRIVATE).getString(KEY, "hu");
  }

  static void setLang(Context ctx, String l) {
    if (l != null && l.matches("^[a-z]{2}$")) ctx.getSharedPreferences(ReminderReceiver.PREFS, Context.MODE_PRIVATE).edit().putString(KEY, l).apply();
  }

  /** A felület nyelvének megfelelő formázási területi beállítás (pl. időpontokhoz). */
  static Locale locale(Context ctx) {
    return new Locale(lang(ctx));
  }

  private static JSONObject read(Context ctx, String l) {
    try (InputStream in = ctx.getAssets().open("i18n/" + l + ".json")) {
      ByteArrayOutputStream out = new ByteArrayOutputStream();
      byte[] buf = new byte[8192];
      for (int n; (n = in.read(buf)) > 0; ) out.write(buf, 0, n);
      return new JSONObject(out.toString("UTF-8"));
    } catch (Exception e) {
      return null;
    }
  }

  private static synchronized void load(Context ctx, String l) {
    if (l.equals(loaded)) return;
    loaded = l;
    own = "hu".equals(l) ? null : read(ctx, l);
    en = "hu".equals(l) || "en".equals(l) ? null : read(ctx, "en");
  }

  static String t(Context ctx, String hu) {
    String l = lang(ctx);
    if ("hu".equals(l)) return hu;
    load(ctx, l);
    String r = own != null ? own.optString(hu, "") : "";
    if (r.isEmpty() && en != null) r = en.optString(hu, "");
    return r.isEmpty() ? hu : r;
  }

  static String t(Context ctx, String hu, long n) {
    return t(ctx, hu).replace("{n}", String.valueOf(n));
  }
}
