package hu.adas.tv;

import android.app.Activity;
import android.app.UiModeManager;
import android.content.ActivityNotFoundException;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ActivityInfo;
import android.content.pm.PackageManager;
import android.content.res.Configuration;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.view.Window;
import android.view.WindowManager;
import android.webkit.ConsoleMessage;
import android.webkit.JavascriptInterface;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;
import android.widget.Toast;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.BufferedInputStream;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.zip.GZIPInputStream;

/**
 * Adás – Android-keret (telefon, tablet, Android TV).
 *
 * A felület ugyanaz az egyfájlos webes csomag, amely a tévén is fut (assets/web). Az oldal a
 * https://appassets.androidplatform.net/ címről töltődik be; minden más kérést (csatornalisták,
 * műsorújság, adások, szegmensek) ez a keret tölt le, CORS-fejlécet tesz rá, és az adások
 * User-Agent / Referer fejlécét is beállítja. A POST-kérések, az elérhetőség-ellenőrzés és a
 * fájlmentés az AdasAndroid JavaScript-hídon keresztül megy.
 */
public class MainActivity extends Activity {
  static final String HOST = "appassets.androidplatform.net";
  static final long MAX_GUNZIP = 256L * 1024 * 1024;

  /** Bemenet, amely `max` bájt után hibával leáll. */
  static final class Limited extends java.io.FilterInputStream {
    long left;

    Limited(InputStream in, long max) {
      super(in);
      left = max;
    }

    @Override
    public int read() throws java.io.IOException {
      if (left <= 0) throw new java.io.IOException("Túl nagy kicsomagolt adat");
      int r = super.read();
      if (r >= 0) left--;
      return r;
    }

    @Override
    public int read(byte[] b, int off, int len) throws java.io.IOException {
      if (left <= 0) throw new java.io.IOException("Túl nagy kicsomagolt adat");
      int r = super.read(b, off, (int) Math.min(len, left));
      if (r > 0) left -= r;
      return r;
    }
  }
  static final String CHROME_UA =
      "Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36";
  static final int REQ_FILE = 1;
  static final int REQ_SAVE = 2;

  WebView web;
  NativePlayer nativePlayer;
  boolean tv;
  /** Előtérben van-e (az emlékeztető ilyenkor az alkalmazáson belül szól, nem a rendszer). */
  static volatile boolean foreground;
  /** Értesítésről indítva: ezt a csatornát kell megnyitni. */
  volatile String launchChannel;
  final Map<String, String[]> hostHeaders = new ConcurrentHashMap<>();
  final ExecutorService pool = Executors.newFixedThreadPool(8);
  ValueCallback<Uri[]> fileCallback;
  int saveId;
  String saveText;

  @Override
  protected void onCreate(Bundle state) {
    super.onCreate(state);
    instance = this;
    UiModeManager ui = (UiModeManager) getSystemService(Context.UI_MODE_SERVICE);
    tv = (ui != null && ui.getCurrentModeType() == Configuration.UI_MODE_TYPE_TELEVISION)
        || getPackageManager().hasSystemFeature(PackageManager.FEATURE_LEANBACK);
    Window w = getWindow();
    w.setStatusBarColor(Color.BLACK);
    w.setNavigationBarColor(Color.BLACK);
    if (tv) immersive(true);

    web = new WebView(this);
    web.setBackgroundColor(Color.BLACK);
    // A WebView alatt a natív lejátszó (ExoPlayer) képe – filmeknél a lap ott átlátszó.
    FrameLayout root = new FrameLayout(this);
    root.setBackgroundColor(Color.BLACK);
    root.addView(web, new FrameLayout.LayoutParams(FrameLayout.LayoutParams.MATCH_PARENT, FrameLayout.LayoutParams.MATCH_PARENT));
    setContentView(root);
    nativePlayer = new NativePlayer(this, root);
    WebSettings s = web.getSettings();
    s.setJavaScriptEnabled(true);
    s.setDomStorageEnabled(true);
    s.setDatabaseEnabled(true);
    s.setMediaPlaybackRequiresUserGesture(false);
    s.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);
    s.setAllowFileAccess(false);
    s.setAllowContentAccess(true);
    s.setTextZoom(100); // a rendszer betűméret-nagyítása ne törje szét a felületet
    s.setUserAgentString(s.getUserAgentString() + " AdasAndroid/" + version());
    web.addJavascriptInterface(new Bridge(), "AdasAndroid");
    web.setWebViewClient(new Client());
    web.setWebChromeClient(new Chrome());
    web.setFocusable(true);
    web.setFocusableInTouchMode(true);
    launchChannel = getIntent().getStringExtra("channel");
    if (state != null) web.restoreState(state);
    else web.loadUrl("https://" + HOST + "/index.html");
    web.requestFocus();
  }

  String version() {
    try {
      return getPackageManager().getPackageInfo(getPackageName(), 0).versionName;
    } catch (Exception e) {
      return "?";
    }
  }

  @Override
  protected void onSaveInstanceState(Bundle out) {
    super.onSaveInstanceState(out);
    web.saveState(out);
  }

  /** Vissza gomb: az oldal kezeli (menük, lejátszó, előző oldal; a főoldalon kilépés). */
  @Override
  @SuppressWarnings("deprecation")
  public void onBackPressed() {
    web.evaluateJavascript(
        "(document.activeElement||document.body).dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true,cancelable:true}))",
        null);
  }

  @Override
  protected void onResume() {
    super.onResume();
    foreground = true;
    web.onResume();
  }

  /** Értesítésre kattintva, futó alkalmazásnál: a csatorna indul. */
  @Override
  protected void onNewIntent(Intent intent) {
    super.onNewIntent(intent);
    String ch = intent.getStringExtra("channel");
    if (ch != null && !ch.isEmpty()) web.evaluateJavascript("window.__adasOpenChannel&&window.__adasOpenChannel(" + JSONObject.quote(ch) + ")", null);
  }

  // -------------------------------------------------------------------------------------------
  // Háttérlejátszás (a kép a képben mód megszűnt)
  // -------------------------------------------------------------------------------------------
  static MainActivity instance;
  boolean bgAudio = false; // kilépve a háttérben szól tovább
  String nowPlaying = "";

  /** A háttérlejátszás értesítésének „Leállítás” gombja. */
  void stopFromNotification() {
    runOnUiThread(() -> {
      web.evaluateJavascript("window.__adasStopPlayback&&window.__adasStopPlayback()", null);
      if (nativePlayer != null) nativePlayer.pause();
    });
  }

  @Override
  protected void onStart() {
    super.onStart();
    PlaybackService.stop(this);
  }

  @Override
  protected void onStop() {
    super.onStop();
    // a beállítások és a film pozíciójának azonnali mentése (a WebView nem mindig jelez a lapnak)
    web.evaluateJavascript("window.__adasFlush&&window.__adasFlush()", null);
    // Háttérlejátszás bekapcsolva: szól tovább (értesítéssel); egyébként megáll.
    if (bgAudio && playing && !isFinishing()) {
      PlaybackService.start(this, nowPlaying);
      return;
    }
    web.evaluateJavascript("document.querySelectorAll('video').forEach(function(v){try{v.pause()}catch(e){}})", null);
    if (nativePlayer != null) nativePlayer.pause();
  }

  @Override
  protected void onPause() {
    super.onPause();
    foreground = false;
    // háttérlejátszásnál a lap tovább fut
    if (!(bgAudio && playing)) web.onPause();
  }

  @Override
  protected void onDestroy() {
    PlaybackService.stop(this);
    if (instance == this) instance = null;
    if (nativePlayer != null) nativePlayer.release();
    if (lanServer != null) {
      lanServer.shareStop();
      lanServer.rcStop();
    }
    pool.shutdownNow();
    web.destroy();
    super.onDestroy();
  }

  @SuppressWarnings("deprecation")
  void immersive(boolean on) {
    View d = getWindow().getDecorView();
    if (on) {
      d.setSystemUiVisibility(View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY | View.SYSTEM_UI_FLAG_FULLSCREEN
          | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION | View.SYSTEM_UI_FLAG_LAYOUT_STABLE
          | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN);
    } else {
      d.setSystemUiVisibility(View.SYSTEM_UI_FLAG_LAYOUT_STABLE);
    }
  }

  @Override
  public void onWindowFocusChanged(boolean hasFocus) {
    super.onWindowFocusChanged(hasFocus);
    if (hasFocus && (tv || playing)) immersive(true);
  }

  boolean playing;

  // -------------------------------------------------------------------------------------------
  // JavaScript-híd
  // -------------------------------------------------------------------------------------------
  void reply(final int id, final boolean ok, final String payloadJs) {
    runOnUiThread(() -> web.evaluateJavascript("window.__adasNative(" + id + "," + ok + "," + payloadJs + ")", null));
  }

  class Bridge {
    @JavascriptInterface
    public boolean isTv() {
      return tv;
    }

    @JavascriptInterface
    public String version() {
      return MainActivity.this.version();
    }

    @JavascriptInterface
    public void setStreamHeaders(String url, String ua, String referrer) {
      try {
        String host = new URL(url).getHost();
        if ((ua == null || ua.isEmpty()) && (referrer == null || referrer.isEmpty())) hostHeaders.remove(host);
        else hostHeaders.put(host, new String[] {ua, referrer});
      } catch (Exception ignored) {
      }
    }

    @JavascriptInterface
    public void openExternal(String url) {
      try {
        startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(url)));
      } catch (ActivityNotFoundException e) {
        runOnUiThread(() -> Toast.makeText(MainActivity.this, "Nincs böngésző ehhez a címhez.", Toast.LENGTH_SHORT).show());
      }
    }

    // ---- Natív lejátszó (ExoPlayer): filmek AC3 / DTS hanggal, beágyazott felirattal --------------
    @JavascriptInterface
    public boolean exoAvailable() {
      return true;
    }

    @JavascriptInterface
    public void exoPlay(final String json) {
      runOnUiThread(() -> {
        try {
          nativePlayer.play(new JSONObject(json));
        } catch (Exception e) {
          web.evaluateJavascript("window.__adasExo&&window.__adasExo({type:'error',message:" + JSONObject.quote(String.valueOf(e)) + "})", null);
        }
      });
    }

    @JavascriptInterface
    public void exoPause() {
      runOnUiThread(() -> nativePlayer.pause());
    }

    @JavascriptInterface
    public void exoResume() {
      runOnUiThread(() -> nativePlayer.resume());
    }

    @JavascriptInterface
    public void exoSeek(final double sec) {
      runOnUiThread(() -> nativePlayer.seek(sec));
    }

    @JavascriptInterface
    public void exoVolume(final double v) {
      runOnUiThread(() -> nativePlayer.volume((float) v));
    }

    @JavascriptInterface
    public void exoSelect(final String kind, final int group, final int index) {
      runOnUiThread(() -> nativePlayer.select(kind, group, index));
    }

    @JavascriptInterface
    public void exoStop() {
      runOnUiThread(() -> nativePlayer.stop());
    }

    /** Videó megnyitása külső lejátszóban (pl. VLC, MX Player, Kodi) – AC3 hanghoz, beágyazott felirathoz. */
    @JavascriptInterface
    public void openVideo(String url, String title) {
      try {
        Intent i = new Intent(Intent.ACTION_VIEW);
        i.setDataAndType(Uri.parse(url), "video/*");
        if (title != null && !title.isEmpty()) {
          i.putExtra("title", title); // VLC, MX Player
          i.putExtra(Intent.EXTRA_TITLE, title);
        }
        startActivity(Intent.createChooser(i, "Megnyitás ezzel"));
      } catch (ActivityNotFoundException e) {
        runOnUiThread(() -> Toast.makeText(MainActivity.this, "Nincs videólejátszó telepítve (pl. VLC).", Toast.LENGTH_LONG).show());
      }
    }

    @JavascriptInterface
    public void setFullscreen(final boolean on) {
      runOnUiThread(() -> {
        immersive(on || tv);
        setRequestedOrientation(on && !tv ? ActivityInfo.SCREEN_ORIENTATION_SENSOR_LANDSCAPE : ActivityInfo.SCREEN_ORIENTATION_UNSPECIFIED);
      });
    }

    @JavascriptInterface
    public void setPlaying(final boolean on) {
      runOnUiThread(() -> {
        playing = on;
        if (on) getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        else getWindow().clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        immersive(on || tv);
        if (!on && !tv) setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_UNSPECIFIED);
      });
    }

    /** Emlékeztetők átadása a rendszer ütemezőjének: [{ at, start, title, channelId, channel }] */
    @JavascriptInterface
    public void scheduleReminders(String json) {
      ReminderReceiver.schedule(MainActivity.this, json);
    }

    /** Értesítési engedély kérése (Android 13+). */
    @JavascriptInterface
    public void requestNotifyPermission() {
      if (Build.VERSION.SDK_INT >= 33
          && checkSelfPermission("android.permission.POST_NOTIFICATIONS") != PackageManager.PERMISSION_GRANTED) {
        runOnUiThread(() -> requestPermissions(new String[] {"android.permission.POST_NOTIFICATIONS"}, 3));
      }
    }

    /** Az értesítésről indított alkalmazás csatornája (egyszer adja vissza). */
    @JavascriptInterface
    public String takeLaunchChannel() {
      String ch = launchChannel;
      launchChannel = null;
      return ch == null ? "" : ch;
    }

    /** Beállítás: háttérlejátszás (az első paraméter a megszűnt kép a képben módé, nem használjuk). */
    @JavascriptInterface
    public void setBackgroundPrefs(boolean pip, boolean audio) {
      bgAudio = audio;
    }

    @JavascriptInterface
    public void setNowPlaying(String title) {
      nowPlaying = title == null ? "" : title;
    }

    /** A távirányító-lap állapota (most nézett adás, kedvencek) – a telefon ezt kéri le. */
    @JavascriptInterface
    public void rcState(String json) {
      lan().rcState = json;
    }

    @JavascriptInterface
    public void exit() {
      runOnUiThread(MainActivity.this::finish);
    }

    /** Aszinkron hívás: az eredmény a window.__adasNative(id, ok, eredmény) függvénybe érkezik. */
    @JavascriptInterface
    public void call(final int id, final String method, final String json) {
      if ("saveFile".equals(method)) {
        runOnUiThread(() -> startSave(id, json));
        return;
      }
      pool.submit(() -> {
        try {
          JSONObject a = new JSONObject(json);
          String out;
          if ("request".equals(method)) out = request(a).toString();
          else if ("probe".equals(method)) out = probeAll(a.getJSONArray("items")).toString();
          else if ("lanGet".equals(method)) out = lanGet(a.getJSONArray("urls"), a.optInt("timeout", 2500)).toString();
          else if ("lanIps".equals(method)) out = new JSONArray(LanServer.localIps()).toString();
          else if ("shareStart".equals(method)) out = lan().shareStart(a.getString("data"), a.optInt("minutes", 15), a.optString("id", "")).toString();
          else if ("shareStop".equals(method)) {
            lan().shareStop();
            out = "true";
          } else if ("rcStart".equals(method)) out = lan().rcStart(a.getString("html"), a.getString("pin"), a.optString("key", "")).toString();
          else if ("rcStop".equals(method)) {
            lan().rcStop();
            out = "true";
          }
          else throw new IllegalArgumentException("Ismeretlen hívás: " + method);
          reply(id, true, out);
        } catch (Throwable e) {
          reply(id, false, JSONObject.quote(String.valueOf(e.getMessage() != null ? e.getMessage() : e)));
        }
      });
    }
  }

  // -------------------------------------------------------------------------------------------
  // Helyi hálózat: beállítások átadása kóddal, távirányító
  // -------------------------------------------------------------------------------------------
  LanServer lanServer;

  synchronized LanServer lan() {
    if (lanServer == null) {
      lanServer = new LanServer(new LanServer.Listener() {
        @Override
        public void onRemote(String c, String a) {
          String js = "window.__adasRemote&&window.__adasRemote(" + JSONObject.quote(c) + "," + JSONObject.quote(a) + ")";
          runOnUiThread(() -> web.evaluateJavascript(js, null));
        }

        @Override
        public void onShareUsed(String from) {
          runOnUiThread(() -> web.evaluateJavascript("window.__adasShareUsed&&window.__adasShareUsed(" + JSONObject.quote(from) + ")", null));
        }
      });
    }
    return lanServer;
  }

  /**
   * Több helyi cím párhuzamos lekérése (rövid időkorláttal): az első 200-as válasz nyer. Ha egyik sem,
   * de egy Adás válaszolt (404 – hibás kód), azt adja vissza. → { status, text, url }
   */
  JSONObject lanGet(JSONArray urls, final int timeout) throws Exception {
    ExecutorService ex = Executors.newFixedThreadPool(Math.min(48, Math.max(1, urls.length())));
    java.util.concurrent.ExecutorCompletionService<JSONObject> cs = new java.util.concurrent.ExecutorCompletionService<>(ex);
    for (int i = 0; i < urls.length(); i++) {
      final String u = urls.getString(i);
      cs.submit(() -> {
        HttpURLConnection c = null;
        try {
          c = (HttpURLConnection) new URL(u).openConnection();
          c.setConnectTimeout(timeout);
          c.setReadTimeout(Math.max(timeout, 20000));
          int code = c.getResponseCode();
          InputStream in = code >= 400 ? c.getErrorStream() : c.getInputStream();
          String text = in == null ? "" : new String(readAll(in, 60 * 1024 * 1024), StandardCharsets.UTF_8);
          return new JSONObject().put("status", code).put("text", text).put("url", u);
        } catch (Exception e) {
          return null;
        } finally {
          if (c != null) c.disconnect();
        }
      });
    }
    JSONObject miss = null;
    try {
      for (int i = 0; i < urls.length(); i++) {
        JSONObject r = cs.take().get();
        if (r == null) continue;
        if (r.getInt("status") == 200) return r;
        if (miss == null && r.optString("text").contains("kód")) miss = r;
      }
    } finally {
      ex.shutdownNow();
    }
    return miss != null ? miss : new JSONObject().put("status", 0).put("text", "").put("url", "");
  }

  // -------------------------------------------------------------------------------------------
  // Hálózat
  // -------------------------------------------------------------------------------------------
  /** Kapcsolat átirányítások követésével (a HttpURLConnection a http↔https váltást magától nem követi). */
  HttpURLConnection open(String url, String method, Map<String, String> headers, byte[] body, int timeoutMs) throws IOException {
    for (int hop = 0; hop < 6; hop++) {
      HttpURLConnection c = (HttpURLConnection) new URL(url).openConnection();
      c.setInstanceFollowRedirects(false);
      c.setConnectTimeout(15000);
      c.setReadTimeout(timeoutMs);
      c.setRequestMethod(method);
      for (Map.Entry<String, String> h : headers.entrySet()) c.setRequestProperty(h.getKey(), h.getValue());
      if (body != null && body.length > 0) {
        c.setDoOutput(true);
        try (OutputStream o = c.getOutputStream()) {
          o.write(body);
        }
      }
      int code = c.getResponseCode();
      if (code >= 300 && code < 400 && c.getHeaderField("Location") != null) {
        url = new URL(new URL(url), c.getHeaderField("Location")).toString();
        c.disconnect();
        if (code == 303) {
          method = "GET";
          body = null;
        }
        continue;
      }
      return c;
    }
    throw new IOException("Túl sok átirányítás");
  }

  Map<String, String> streamHeaders(String url, Map<String, String> fromPage) {
    Map<String, String> h = new HashMap<>();
    if (fromPage != null) {
      for (Map.Entry<String, String> e : fromPage.entrySet()) {
        String k = e.getKey().toLowerCase(Locale.ROOT);
        // Az oldal saját eredete (appassets…) sok szervert megzavar; a tömörítést a kapcsolat maga kezeli.
        if (k.equals("origin") || k.equals("referer") || k.equals("accept-encoding") || k.equals("user-agent")) continue;
        // Feltételes kérésre a szerver 304-et adna, azt a WebResourceResponse nem fogadja el.
        if (k.equals("if-none-match") || k.equals("if-modified-since") || k.equals("if-range")) continue;
        h.put(e.getKey(), e.getValue());
      }
    }
    String[] custom = null;
    try {
      custom = hostHeaders.get(new URL(url).getHost());
    } catch (Exception ignored) {
    }
    h.put("User-Agent", custom != null && custom[0] != null && !custom[0].isEmpty() ? custom[0] : CHROME_UA);
    if (custom != null && custom[1] != null && !custom[1].isEmpty()) {
      h.put("Referer", custom[1]);
      try {
        URL r = new URL(custom[1]);
        h.put("Origin", r.getProtocol() + "://" + r.getAuthority());
      } catch (Exception ignored) {
      }
    }
    return h;
  }

  static byte[] readAll(InputStream in, int max) throws IOException {
    ByteArrayOutputStream b = new ByteArrayOutputStream();
    byte[] buf = new byte[16384];
    int n;
    while ((n = in.read(buf)) > 0) {
      b.write(buf, 0, n);
      if (b.size() > max) throw new IOException("A válasz túl nagy");
    }
    return b.toByteArray();
  }

  /** Általános HTTP-kérés (pl. OpenSubtitles): { method, url, headers, body } → { status, text } */
  JSONObject request(JSONObject a) throws Exception {
    String url = a.getString("url");
    if (!url.matches("(?i)^https?://.*")) throw new IllegalArgumentException("Érvénytelen cím");
    Map<String, String> h = new HashMap<>();
    h.put("User-Agent", CHROME_UA);
    JSONObject hs = a.optJSONObject("headers");
    if (hs != null) {
      JSONArray names = hs.names();
      for (int i = 0; names != null && i < names.length(); i++) h.put(names.getString(i), hs.getString(names.getString(i)));
    }
    String body = a.optString("body", "");
    HttpURLConnection c = open(url, a.optString("method", "GET"), h, body.isEmpty() ? null : body.getBytes(StandardCharsets.UTF_8), 30000);
    int code = c.getResponseCode();
    InputStream in = code >= 400 ? c.getErrorStream() : c.getInputStream();
    String text = in == null ? "" : new String(readAll(in, 40 * 1024 * 1024), StandardCharsets.UTF_8);
    c.disconnect();
    return new JSONObject().put("status", code).put("text", text);
  }

  /**
   * Él-e az adás – úgy, ahogy a lejátszó látja: HLS-nél a változatlistán és a médialistán át
   * egy valódi videószegmens elejét is letölti (földrajzi korlát, üres adás kiszűrése).
   */
  boolean probe(String url, String ua, String referrer) {
    return probe(url, ua, referrer, 0);
  }

  boolean probe(String url, String ua, String referrer, int depth) {
    HttpURLConnection c = null;
    try {
      Map<String, String> h = new HashMap<>();
      h.put("User-Agent", ua != null && !ua.isEmpty() ? ua : CHROME_UA);
      if (referrer != null && !referrer.isEmpty()) h.put("Referer", referrer);
      c = open(url, "GET", h, null, 8000);
      int code = c.getResponseCode();
      if (code >= 400) return false;
      String type = String.valueOf(c.getContentType()).toLowerCase(Locale.ROOT);
      if (type.matches(".*(video|mp2t|octet-stream|dash|audio).*") && !type.contains("mpegurl")) return true;
      String text = new String(readAll(c.getInputStream(), 262144), StandardCharsets.ISO_8859_1);
      String base = c.getURL().toString();
      if (text.contains("<MPD")) return true;
      if (!text.contains("#EXTM3U")) return false;
      String[] lines = text.split("\\r?\\n");
      if (text.contains("#EXT-X-STREAM-INF")) {
        if (depth > 1) return false;
        boolean after = false;
        for (String l : lines) {
          l = l.trim();
          if (l.startsWith("#EXT-X-STREAM-INF")) after = true;
          else if (after && !l.isEmpty() && !l.startsWith("#")) return probe(new URL(new URL(base), l).toString(), ua, referrer, depth + 1);
        }
        return false;
      }
      String last = null;
      for (String l : lines) {
        l = l.trim();
        if (!l.isEmpty() && !l.startsWith("#")) last = l;
      }
      if (last == null) return false; // üres lista: most nem sugároz
      return probeSegment(new URL(new URL(base), last).toString(), h);
    } catch (Exception e) {
      return false;
    } finally {
      if (c != null) c.disconnect();
    }
  }

  boolean probeSegment(String url, Map<String, String> h) {
    HttpURLConnection c = null;
    try {
      Map<String, String> hh = new HashMap<>(h);
      hh.put("Range", "bytes=0-4095");
      c = open(url, "GET", hh, null, 8000);
      int code = c.getResponseCode();
      if (code != 200 && code != 206) return false;
      // A tartalom számít, nem a típusa (egyes adók .htm álcával küldik a videót); hibás csak a HTML / XML oldal.
      byte[] buf = new byte[64];
      int n = c.getInputStream().read(buf);
      if (n <= 0) return false;
      return !new String(buf, 0, n, StandardCharsets.ISO_8859_1).trim().startsWith("<");
    } catch (Exception e) {
      return false;
    } finally {
      if (c != null) c.disconnect();
    }
  }

  JSONObject probeAll(JSONArray items) throws Exception {
    Map<String, Future<Boolean>> jobs = new HashMap<>();
    ExecutorService p = Executors.newFixedThreadPool(8);
    try {
      for (int i = 0; i < items.length(); i++) {
        final JSONObject it = items.getJSONObject(i);
        jobs.put(it.getString("url"), p.submit(() -> probe(it.getString("url"), it.optString("ua"), it.optString("referrer"))));
      }
      JSONObject out = new JSONObject();
      for (Map.Entry<String, Future<Boolean>> j : jobs.entrySet()) {
        boolean ok;
        try {
          ok = j.getValue().get();
        } catch (Exception e) {
          ok = false;
        }
        out.put(j.getKey(), ok);
      }
      return out;
    } finally {
      p.shutdownNow();
    }
  }

  static WebResourceResponse simple(int code, String reason, String mime, byte[] body) {
    Map<String, String> h = new HashMap<>();
    h.put("Access-Control-Allow-Origin", "*");
    h.put("Access-Control-Allow-Headers", "*");
    h.put("Access-Control-Allow-Methods", "GET, HEAD, POST, OPTIONS");
    return new WebResourceResponse(mime, "utf-8", code, reason, h, new ByteArrayInputStream(body));
  }

  static String mimeOf(String path) {
    String p = path.toLowerCase(Locale.ROOT);
    if (p.endsWith(".html")) return "text/html";
    if (p.endsWith(".js")) return "application/javascript";
    if (p.endsWith(".css")) return "text/css";
    if (p.endsWith(".png")) return "image/png";
    if (p.endsWith(".svg")) return "image/svg+xml";
    if (p.endsWith(".json")) return "application/json";
    if (p.endsWith(".jpg") || p.endsWith(".jpeg")) return "image/jpeg";
    return "application/octet-stream";
  }

  class Client extends WebViewClient {
    @Override
    public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest req) {
      Uri u = req.getUrl();
      String scheme = String.valueOf(u.getScheme()).toLowerCase(Locale.ROOT);
      if (!scheme.equals("http") && !scheme.equals("https")) return null;
      String method = req.getMethod();
      if (HOST.equals(u.getHost())) return asset(u.getPath());
      if ("OPTIONS".equals(method)) return simple(204, "No Content", "text/plain", new byte[0]);
      if (!"GET".equals(method) && !"HEAD".equals(method)) return null; // a POST a hídon megy
      return proxy(u.toString(), method, req.getRequestHeaders());
    }

    WebResourceResponse asset(String path) {
      if (path == null || path.equals("/") || path.isEmpty()) path = "/index.html";
      try {
        InputStream in = getAssets().open("web" + path);
        String mime = mimeOf(path);
        Map<String, String> h = new HashMap<>();
        h.put("Access-Control-Allow-Origin", "*");
        h.put("Cache-Control", "no-cache");
        return new WebResourceResponse(mime, mime.startsWith("text/") || mime.contains("javascript") ? "utf-8" : null, 200, "OK", h, in);
      } catch (IOException e) {
        return simple(404, "Not Found", "text/plain", "Nem található".getBytes(StandardCharsets.UTF_8));
      }
    }

    WebResourceResponse proxy(String url, String method, Map<String, String> pageHeaders) {
      try {
        HttpURLConnection c = open(url, method, streamHeaders(url, pageHeaders), null, 30000);
        int code = c.getResponseCode();
        InputStream in = code >= 400 ? c.getErrorStream() : c.getInputStream();
        if (in == null) in = new ByteArrayInputStream(new byte[0]);
        String type = c.getContentType();
        String mime = "application/octet-stream";
        String charset = null;
        if (type != null) {
          String[] parts = type.split(";");
          mime = parts[0].trim();
          for (String p : parts) {
            String t = p.trim().toLowerCase(Locale.ROOT);
            if (t.startsWith("charset=")) charset = t.substring(8).replace("\"", "");
          }
        }
        // A .gz műsorújságot kibontva adjuk át (a régi WebView-kban nincs DecompressionStream).
        String path = Uri.parse(url).getPath();
        if (path != null && path.toLowerCase(Locale.ROOT).endsWith(".gz")) {
          BufferedInputStream b = new BufferedInputStream(in);
          b.mark(4);
          int b1 = b.read();
          int b2 = b.read();
          b.reset();
          // kicsomagolva is korlátos méret (egy kicsi, de erősen tömörített fájl se fújódhasson fel)
          in = (b1 == 0x1f && b2 == 0x8b) ? new Limited(new GZIPInputStream(b), MAX_GUNZIP) : b;
          if (b1 == 0x1f && b2 == 0x8b) {
            mime = "text/xml";
            charset = "utf-8";
          }
        }
        Map<String, String> h = new HashMap<>();
        h.put("Access-Control-Allow-Origin", "*");
        h.put("Access-Control-Expose-Headers", "*");
        for (String k : new String[] {"Content-Range", "Accept-Ranges", "Last-Modified", "ETag", "Cache-Control"}) {
          String v = c.getHeaderField(k);
          if (v != null) h.put(k, v);
        }
        String len = c.getHeaderField("Content-Length");
        if (len != null && (path == null || !path.toLowerCase(Locale.ROOT).endsWith(".gz"))) h.put("Content-Length", len);
        String reason = c.getResponseMessage();
        if (reason == null || reason.trim().isEmpty()) reason = code < 400 ? "OK" : "Error";
        // A WebResourceResponse csak 100–299 és 400–599 közötti kódot fogad el.
        if (code < 100 || code > 599 || (code >= 300 && code < 400)) {
          code = 502;
          reason = "Bad Gateway";
        }
        return new WebResourceResponse(mime, charset, code, reason, h, in);
      } catch (Exception e) {
        return simple(502, "Bad Gateway", "text/plain", String.valueOf(e.getMessage()).getBytes(StandardCharsets.UTF_8));
      }
    }

    @Override
    public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest req) {
      // Az oldal nem navigálhat el; a külső hivatkozások a böngészőben nyílnak meg.
      if (HOST.equals(req.getUrl().getHost())) return false;
      try {
        startActivity(new Intent(Intent.ACTION_VIEW, req.getUrl()));
      } catch (Exception ignored) {
      }
      return true;
    }
  }

  // -------------------------------------------------------------------------------------------
  // Fájlok: megnyitás (<input type=file>) és mentés (rendszer fájlmentő)
  // -------------------------------------------------------------------------------------------
  class Chrome extends WebChromeClient {
    @Override
    public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> cb, FileChooserParams params) {
      if (fileCallback != null) fileCallback.onReceiveValue(null);
      fileCallback = cb;
      Intent i = new Intent(Intent.ACTION_GET_CONTENT).addCategory(Intent.CATEGORY_OPENABLE).setType("*/*");
      try {
        startActivityForResult(Intent.createChooser(i, "Fájl kiválasztása"), REQ_FILE);
      } catch (ActivityNotFoundException e) {
        fileCallback = null;
        Toast.makeText(MainActivity.this, "Ezen az eszközön nincs fájlkezelő.", Toast.LENGTH_LONG).show();
        return false;
      }
      return true;
    }

    @Override
    public boolean onConsoleMessage(ConsoleMessage m) {
      android.util.Log.d("Adas", m.message() + " (" + m.sourceId() + ":" + m.lineNumber() + ")");
      return true;
    }
  }

  void startSave(int id, String json) {
    try {
      JSONObject a = new JSONObject(json);
      saveId = id;
      saveText = a.optString("text", "");
      Intent i = new Intent(Intent.ACTION_CREATE_DOCUMENT).addCategory(Intent.CATEGORY_OPENABLE).setType("application/json")
          .putExtra(Intent.EXTRA_TITLE, a.optString("name", "adas.json"));
      startActivityForResult(i, REQ_SAVE);
    } catch (Exception e) {
      reply(id, false, JSONObject.quote("A mentés itt nem érhető el."));
    }
  }

  @Override
  protected void onActivityResult(int req, int result, Intent data) {
    super.onActivityResult(req, result, data);
    if (req == REQ_FILE && fileCallback != null) {
      fileCallback.onReceiveValue(WebChromeClient.FileChooserParams.parseResult(result, data));
      fileCallback = null;
    } else if (req == REQ_SAVE) {
      final int id = saveId;
      final String text = saveText;
      saveText = null;
      if (result != RESULT_OK || data == null || data.getData() == null) {
        reply(id, true, "false");
        return;
      }
      final Uri uri = data.getData();
      pool.submit(() -> {
        try (OutputStream o = getContentResolver().openOutputStream(uri)) {
          o.write(text.getBytes(StandardCharsets.UTF_8));
          reply(id, true, "true");
        } catch (Exception e) {
          reply(id, false, JSONObject.quote(String.valueOf(e.getMessage())));
        }
      });
    }
  }
}
