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
import android.os.PowerManager;
import android.app.KeyguardManager;
import android.os.Build;
import android.os.Bundle;
import android.view.KeyEvent;
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
  static final int REQ_TREE = 3; // (F02) mappaválasztó
  int folderId = -1;

  WebView web;
  // (a rendszer leállította a lap folyamatát – a WebView ezután nem használható, a felület újraindul)
  boolean rendererGone = false;
  NativePlayer nativePlayer;
  RadioNative radioNative; // a rádió natív lejátszója
  PodNative podNative; // a podcastok natív lejátszója
  boolean tv;
  /** Előtérben van-e (az emlékeztető ilyenkor az alkalmazáson belül szól, nem a rendszer). */
  static volatile boolean foreground;
  /** Értesítésről indítva: ezt a csatornát kell megnyitni. */
  volatile String launchChannel;
  final Map<String, String[]> hostHeaders = new ConcurrentHashMap<>();
  /**
   * A lap kérései elérhetik-e a helyi hálózatot (NAS, helyi szerver): csak ha a felhasználó maga adott meg helyi
   * forrást (lista, médiatár, csatorna) – különben egy internetes lista sem irányíthatja a kéréseket a helyi
   * eszközökre (router, nyomtató, okoseszközök). A felület állítja (lanpolicy.js).
   */
  volatile boolean lanAllowed = false;
  final ExecutorService pool = Executors.newFixedThreadPool(8);
  Covers covers; // tartós képtár (borítók, logók) – files/covers
  ValueCallback<Uri[]> fileCallback;
  int saveId;
  String saveText;

  @Override
  protected void onCreate(Bundle state) {
    super.onCreate(state);
    instance = this;
    covers = new Covers(new java.io.File(getFilesDir(), "covers"), (url, h) -> HttpOpen.open(url, "GET", streamHeaders(url, h), null, 30000, !lanAllowed));
    UiModeManager ui = (UiModeManager) getSystemService(Context.UI_MODE_SERVICE);
    // (F07) a buildcél dönt (mobile / tv); univerzális csomagnál a rendszer jelzése
    String target = buildTarget();
    tv = "tv".equals(target) || (!"mobile".equals(target)
        && ((ui != null && ui.getCurrentModeType() == Configuration.UI_MODE_TYPE_TELEVISION)
            || getPackageManager().hasSystemFeature(PackageManager.FEATURE_LEANBACK)));
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
    radioNative = new RadioNative(this);
    podNative = new PodNative(this);
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
    rendererPriority();
    web.setFocusable(true);
    web.setFocusableInTouchMode(true);
    launchChannel = getIntent().getStringExtra("channel");
    // (a leállított lap utáni újraindításnál – recreate() – az állapotban nincs WebView-állapot: a restoreState
    // ilyenkor null-t ad, és üres, fekete képernyő maradt; akkor a felület elölről töltődik be)
    if (state == null || web.restoreState(state) == null) web.loadUrl("https://" + HOST + "/index.html");
    web.requestFocus();
  }

  /** (F07) A buildcél (mobile / tv / universal) – a csomag metaadata. */
  String buildTarget() {
    try {
      android.os.Bundle m = getPackageManager().getApplicationInfo(getPackageName(), PackageManager.GET_META_DATA).metaData;
      String t = m != null ? m.getString("hu.adas.target") : null;
      return t == null ? "universal" : t;
    } catch (Exception e) {
      return "universal";
    }
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
    if (!rendererGone) web.saveState(out);
  }

  /**
   * A lap folyamatának fontossága: lejátszás közben (szünetelve is) a háttérben is fontos marad – a rendszer
   * memóriahiánykor ne ezt lője ki elsőként (különben a háttérben szóló adás megszakad, és visszatéréskor az
   * Adás elölről töltődik be); lejátszás nélkül a háttérben a szokásos (alacsony) fontosság.
   */
  void rendererPriority() {
    if (Build.VERSION.SDK_INT < 26 || rendererGone) return;
    try {
      web.setRendererPriorityPolicy(WebView.RENDERER_PRIORITY_IMPORTANT, !mediaActive);
    } catch (Exception ignored) {
    }
  }

  // -------------------------------------------------------------------------------------------
  // Saját gombkiosztás (keymap.js): a betanított nyers gombkód a művelet gombkódjaként megy tovább – még a WebView
  // előtt, így a WebView számára ismeretlen gomb is használható. A KEYCODE_UNKNOWN (0) gombokat sok olcsó távirányító
  // küldi, ezeket a hardveres kódjuk (scan code) különbözteti meg: azonosítójuk 100000 + scan code.
  // -------------------------------------------------------------------------------------------
  final java.util.concurrent.ConcurrentHashMap<Integer, Integer> keyMap = new java.util.concurrent.ConcurrentHashMap<>();
  volatile boolean learnKey = false;
  private int swallowUp = Integer.MIN_VALUE; // a betanított gomb felengedése sem megy tovább

  static int keyIdOf(KeyEvent ev) {
    int code = ev.getKeyCode();
    return code == KeyEvent.KEYCODE_UNKNOWN ? 100000 + ev.getScanCode() : code;
  }

  // (a rendszer gombjai nem taníthatók be: kezdőképernyő, be-/kikapcsolás, hangerő, alkalmazásváltó)
  static boolean systemKey(int code) {
    return code == KeyEvent.KEYCODE_HOME || code == KeyEvent.KEYCODE_POWER || code == KeyEvent.KEYCODE_VOLUME_UP || code == KeyEvent.KEYCODE_VOLUME_DOWN
        || code == KeyEvent.KEYCODE_VOLUME_MUTE || code == KeyEvent.KEYCODE_APP_SWITCH;
  }

  @Override
  public boolean dispatchKeyEvent(KeyEvent ev) {
    int id = keyIdOf(ev);
    if (learnKey && ev.getAction() == KeyEvent.ACTION_DOWN && ev.getRepeatCount() == 0 && !systemKey(ev.getKeyCode())) {
      learnKey = false;
      swallowUp = id;
      String name = ev.getKeyCode() == KeyEvent.KEYCODE_UNKNOWN ? "SCAN " + ev.getScanCode() : KeyEvent.keyCodeToString(ev.getKeyCode()).replaceFirst("^KEYCODE_", "");
      web.evaluateJavascript("window.__adasKeyLearned&&window.__adasKeyLearned(" + id + "," + JSONObject.quote(name) + ")", null);
      return true;
    }
    // (nyomva tartva az Android ismételt ACTION_DOWN-okat küld – a felengedésig mind elnyeljük)
    if (id == swallowUp) {
      if (ev.getAction() == KeyEvent.ACTION_UP) swallowUp = Integer.MIN_VALUE;
      return true;
    }
    Integer to = keyMap.get(id);
    if (to != null && to != ev.getKeyCode()) {
      return super.dispatchKeyEvent(new KeyEvent(ev.getDownTime(), ev.getEventTime(), ev.getAction(), to, ev.getRepeatCount(), ev.getMetaState(),
          ev.getDeviceId(), ev.getScanCode(), ev.getFlags(), ev.getSource()));
    }
    return super.dispatchKeyEvent(ev);
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
    wasPip = inPip(); // (a kis ablakból teljes nézetbe visszatérve már nem a kis ablak bezárása)
    if (!rendererGone) web.onResume();
    // (lejátszás közben az értesítés előtérben is marad – az onStart indította; a leállítása itt versenyt okozott:
    // a még el sem indult előtérszolgáltatás leállítása a rendszer szerint hiba, és az Adás összeomolhatott)
    if (!mediaActive) PlaybackService.stop(this);
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
  // van-e betöltött adás (csatorna, film, rádióadó – szünetelve is): addig látszik a lejátszás értesítése
  volatile boolean mediaActive = false;

  /** Android 13+: az értesítéshez engedély kell – az első lejátszáskor egyszer rákérdez. */
  void askNotifyOnce() {
    if (Build.VERSION.SDK_INT < 33 || checkSelfPermission("android.permission.POST_NOTIFICATIONS") == PackageManager.PERMISSION_GRANTED) return;
    android.content.SharedPreferences sp = getSharedPreferences("adas", MODE_PRIVATE);
    if (sp.getBoolean("askedNotify", false)) return;
    sp.edit().putBoolean("askedNotify", true).apply();
    requestPermissions(new String[] {"android.permission.POST_NOTIFICATIONS"}, 3);
  }
  // (a JavaScript-híd más szálon írja, a UI-szál olvassa – volatile)
  volatile boolean bgAudio = false; // kilépve a háttérben szól tovább
  volatile boolean autoPip = false; // (B38) videó közben kilépve kis ablakban (más alkalmazások fölött) látszik tovább
  volatile boolean videoActive = false; // a videólejátszó nyitva (a rádióhoz nincs kis ablak)
  String nowPlaying = "";

  // -------------------------------------------------------------------------------------------
  // (B38 / F06) Mini lejátszó más alkalmazások fölött: a rendszer kép a képben módja (Android 8+, ha az eszköz
  // támogatja – több Android TV-n is). A kis ablakban csak a videó látszik (body.pip), a lap tovább fut; a
  // bezárásakor (X) a lejátszás megáll, kivéve, ha a háttérlejátszás be van kapcsolva.
  // -------------------------------------------------------------------------------------------
  boolean canPip() {
    return Build.VERSION.SDK_INT >= 26 && getPackageManager().hasSystemFeature(PackageManager.FEATURE_PICTURE_IN_PICTURE);
  }

  boolean enterPip() {
    if (!canPip()) return false;
    try {
      return enterPictureInPictureMode(new android.app.PictureInPictureParams.Builder().setAspectRatio(new android.util.Rational(16, 9)).build());
    } catch (Exception e) {
      return false;
    }
  }

  boolean inPip() {
    return Build.VERSION.SDK_INT >= 24 && isInPictureInPictureMode();
  }

  /** Home gomb / másik alkalmazás videó közben: kis ablakba vált (ha a Beállításokban be van kapcsolva). */
  @Override
  protected void onUserLeaveHint() {
    super.onUserLeaveHint();
    if (videoActive && playing && autoPip && !tv) enterPip();
  }

  // (V03) kis ablakban volt-e – a bezárásakor (X) az onStop már nem kis ablakban fut: a lejátszás megáll
  boolean wasPip = false;

  @Override
  public void onPictureInPictureModeChanged(boolean pip, Configuration cfg) {
    super.onPictureInPictureModeChanged(pip, cfg);
    // (a Home útvonalon az onPause a kis ablak előtt fut, és elindíthatta a háttér-értesítést – kis ablakban nem kell)
    if (pip) PlaybackService.stop(this);
    if (pip) wasPip = true;
    web.evaluateJavascript("window.__adasPip&&window.__adasPip(" + pip + ")", null);
  }

  /** A háttérlejátszás értesítésének „Leállítás” gombja (videó és rádió). */
  void stopFromNotification() {
    runOnUiThread(() -> {
      web.evaluateJavascript("window.__adasStopPlayback&&window.__adasStopPlayback()", null);
      if (nativePlayer != null) nativePlayer.pause();
    });
  }

  /** Médiaparancs az értesítésről / a médiamunkamenetből: play, pause, next, prev (a felület hajtja végre). */
  void mediaCommand(final String cmd) {
    runOnUiThread(() -> web.evaluateJavascript("window.__adasMedia&&window.__adasMedia(" + JSONObject.quote(cmd) + ")", null));
  }

  /** Háttérbe menet a szolgáltatás indítása – még előtérben (B37: Android 12-től az onStop-ból tiltott). */
  void startBackgroundPlayback() {
    if (mediaActive && !isFinishing() && !PlaybackService.running()) PlaybackService.start(this, nowPlaying);
  }

  /** Ki van-e kapcsolva / zárolva a képernyő (a lezárás is onPause → onStop, mint a másik alkalmazásra váltás). */
  boolean screenOff() {
    try {
      PowerManager pm = (PowerManager) getSystemService(POWER_SERVICE);
      KeyguardManager km = (KeyguardManager) getSystemService(KEYGUARD_SERVICE);
      return (pm != null && !pm.isInteractive()) || (km != null && km.isKeyguardLocked());
    } catch (Exception e) {
      return false;
    }
  }

  /**
   * Szóljon-e tovább a lejátszás, amikor az Adás nem látszik: a rádió mindig (mint egy zenelejátszó); a videó
   * (TV, VOD) a képernyő lezárásakor mindig, másik alkalmazásra váltáskor a „Háttérlejátszás” beállítás szerint.
   */
  boolean keepPlaying() {
    return mediaActive && !isFinishing() && (!videoActive || bgAudio || screenOff());
  }

  @Override
  protected void onStart() {
    super.onStart();
    // (a lejátszás közbeni értesítés előtérben is megmarad – csak akkor áll le, ha semmi sem szól)
    if (!mediaActive) PlaybackService.stop(this);
    else PlaybackService.start(this, nowPlaying); // (pl. szüneteltetett videó: az értesítés visszajön)
  }

  @Override
  protected void onStop() {
    super.onStop();
    if (rendererGone) return;
    // (V03) a kis ablak bezárása: leállítás a háttérlejátszás beállításától függetlenül (képernyőzárnál nem)
    boolean pipClosed = wasPip && !inPip() && !screenOff();
    wasPip = false;
    // a beállítások és a film pozíciójának azonnali mentése (a WebView nem mindig jelez a lapnak)
    web.evaluateJavascript("window.__adasFlush&&window.__adasFlush()", null);
    // Szól tovább (rádió; képernyőzár; bekapcsolt háttérlejátszás) – értesítéssel, a szolgáltatás már fut;
    // egyébként megáll.
    if (keepPlaying() && !pipClosed) {
      startBackgroundPlayback(); // (ha valamiért nem indult el – régebbi Androidon ez még megengedett)
      return;
    }
    PlaybackService.stop(this);
    // (a kis ablak bezárása is ide fut: a lejátszás megáll – nincs kettős vagy láthatatlan hang)
    web.evaluateJavascript("document.querySelectorAll('video').forEach(function(v){try{v.pause()}catch(e){}});window.__adasRadioPause&&window.__adasRadioPause()", null);
    if (nativePlayer != null) nativePlayer.pause();
  }

  @Override
  protected void onPause() {
    super.onPause();
    foreground = false;
    // háttérlejátszásnál a lap tovább fut, és a szolgáltatás (értesítés, médiavezérlők) most indul – az
    // alkalmazás ekkor még előtérben van; visszatéréskor (onResume) leáll
    if (inPip() || rendererGone) return; // kis ablakban a lap tovább fut (látható), értesítés sem kell
    if (keepPlaying()) startBackgroundPlayback();
    else web.onPause();
  }

  @Override
  protected void onDestroy() {
    PlaybackService.stop(this);
    Updater.unregister(this);
    if (instance == this) instance = null;
    if (nativePlayer != null) nativePlayer.release();
    if (radioNative != null) radioNative.release();
    if (podNative != null) podNative.release();
    if (lanServer != null) {
      lanServer.shareStop();
      lanServer.rcStop();
    }
    pool.shutdownNow();
    if (!rendererGone) web.destroy();
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

  volatile boolean playing;

  // -------------------------------------------------------------------------------------------
  // JavaScript-híd
  // -------------------------------------------------------------------------------------------
  void reply(final int id, final boolean ok, final String payloadJs) {
    runOnUiThread(() -> web.evaluateJavascript("window.__adasNative(" + id + "," + ok + "," + payloadJs + ")", null));
  }

  class Bridge {
    /** A saját gombkiosztás: {"nyers azonosító": cél gombkód} (keymap.js). */
    @JavascriptInterface
    public void setKeyMap(String json) {
      try {
        JSONObject o = new JSONObject(json);
        java.util.HashMap<Integer, Integer> m = new java.util.HashMap<>();
        java.util.Iterator<String> it = o.keys();
        while (it.hasNext()) {
          String k = it.next();
          m.put(Integer.parseInt(k), o.getInt(k));
        }
        keyMap.clear();
        keyMap.putAll(m);
      } catch (Exception ignored) {
      }
    }

    /** (lanpolicy.js) van-e a felhasználónak helyi hálózati forrása – akkor a lap elérheti a helyi hálózatot. */
    @JavascriptInterface
    public void setLanAllowed(boolean on) {
      lanAllowed = on;
    }

    /** Betanítás: a következő gomb lenyomása a felülethez megy (window.__adasKeyLearned), nem a szokásos helyére. */
    @JavascriptInterface
    public void learnKey(boolean on) {
      learnKey = on;
    }

    /** A felület nyelve (a keret értesítéseihez és üzeneteihez). */
    @JavascriptInterface
    public void setLang(String l) {
      L.setLang(MainActivity.this, l);
    }

    @JavascriptInterface
    public boolean isTv() {
      return tv;
    }

    @JavascriptInterface
    public String buildTarget() {
      return MainActivity.this.buildTarget();
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
        runOnUiThread(() -> Toast.makeText(MainActivity.this, L.t(MainActivity.this, "Nincs böngésző ehhez a címhez."), Toast.LENGTH_SHORT).show());
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

    /** (F05) Éjszakai hang a natív lejátszóhoz (Android 9+). */
    /** Újrakezdés: az alkalmazás minden adata törlődik (a rendszer bezárja az alkalmazást). → elindult-e */
    @JavascriptInterface
    public boolean factoryReset() {
      try {
        PlaybackService.stop(MainActivity.this);
        android.app.ActivityManager am = (android.app.ActivityManager) getSystemService(ACTIVITY_SERVICE);
        return am != null && am.clearApplicationUserData();
      } catch (Exception e) {
        return false;
      }
    }

    @JavascriptInterface
    public boolean nightAvailable() {
      return NightAudio.available();
    }

    @JavascriptInterface
    public boolean exoNight(final boolean on) {
      if (!NightAudio.available()) return false;
      // (a hangeffekt a UI-szálon jön létre: az eredményét megvárjuk – sikertelenségnél ne mutasson „bekapcsolva”)
      java.util.concurrent.FutureTask<Boolean> t = new java.util.concurrent.FutureTask<>(() -> nativePlayer.setNight(on));
      runOnUiThread(t);
      try {
        return t.get(3, java.util.concurrent.TimeUnit.SECONDS);
      } catch (Exception e) {
        t.cancel(false); // (ha még nem futott le, később sem)
        return false;
      }
    }

    @JavascriptInterface
    public void exoVolume(final double v) {
      runOnUiThread(() -> nativePlayer.volume((float) v));
    }

    @JavascriptInterface
    public void exoMaxHeight(final int h) {
      runOnUiThread(() -> nativePlayer.maxHeight(h));
    }

    @JavascriptInterface
    public void exoSelect(final String kind, final int group, final int index) {
      runOnUiThread(() -> nativePlayer.select(kind, group, index));
    }

    @JavascriptInterface
    public void exoStop() {
      runOnUiThread(() -> nativePlayer.stop());
    }

    // --- rádió: natív lejátszás (RadioNative)
    @JavascriptInterface
    public void radioPlay(final String json) {
      runOnUiThread(() -> {
        try {
          radioNative.play(new JSONObject(json));
        } catch (Exception e) {
          radioNative.send("st", "error");
        }
      });
    }

    @JavascriptInterface
    public void radioStop() {
      runOnUiThread(() -> radioNative.stop());
    }

    // --- podcast: natív lejátszás (PodNative) – tekerés, sebesség, háttérben is
    @JavascriptInterface
    public void podPlay(final String json) {
      runOnUiThread(() -> {
        try {
          podNative.play(new JSONObject(json));
        } catch (Exception e) {
          podNative.send("error", -1, -1);
        }
      });
    }

    @JavascriptInterface
    public void podPause() {
      runOnUiThread(() -> podNative.pause());
    }

    @JavascriptInterface
    public void podResume() {
      runOnUiThread(() -> podNative.resume());
    }

    @JavascriptInterface
    public void podSeek(final double sec) {
      runOnUiThread(() -> podNative.seek(sec));
    }

    @JavascriptInterface
    public void podRate(final double r) {
      runOnUiThread(() -> podNative.rate(r));
    }

    @JavascriptInterface
    public void podStop() {
      runOnUiThread(() -> podNative.stop());
    }

    @JavascriptInterface
    public void radioVolume(final double v) {
      runOnUiThread(() -> radioNative.volume(v));
    }

    @JavascriptInterface
    public String radioInfo() {
      // (az ExoPlayer csak a saját – fő – szálán kérdezhető: az eredményt megvárjuk)
      java.util.concurrent.FutureTask<String> t = new java.util.concurrent.FutureTask<>(() -> radioNative.info());
      runOnUiThread(t);
      try {
        return t.get(2, java.util.concurrent.TimeUnit.SECONDS);
      } catch (Exception e) {
        t.cancel(false);
        return "{}";
      }
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
        startActivity(Intent.createChooser(i, L.t(MainActivity.this, "Megnyitás ezzel")));
      } catch (ActivityNotFoundException e) {
        runOnUiThread(() -> Toast.makeText(MainActivity.this, L.t(MainActivity.this, "Nincs videólejátszó telepítve (pl. VLC)."), Toast.LENGTH_LONG).show());
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
        // (az első lejátszáskor az értesítési engedély – Android 13+; maga az értesítés a setMediaActive szerint)
        if (on) askNotifyOnce();
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

    /** (H20) A rendszer által (a háttérben) már kézbesített emlékeztetők: ["csatorna|kezdés", …] (egyszer adja vissza). */
    @JavascriptInterface
    public String takeDeliveredReminders() {
      return ReminderReceiver.takeDelivered(MainActivity.this);
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
      autoPip = pip;
      bgAudio = audio;
    }

    /** (B38) Mini lejátszó most (rendszer kép a képben). → elindulhat-e ezen az eszközön */
    @JavascriptInterface
    public boolean enterPip() {
      if (!canPip()) return false;
      // (a tényleges belépés a UI-szálon dől el: ha nem sikerül, a felület visszajelzést kap)
      runOnUiThread(() -> {
        if (!MainActivity.this.enterPip()) web.evaluateJavascript("window.__adasPipFailed&&window.__adasPipFailed()", null);
      });
      return true;
    }

    @JavascriptInterface
    public boolean pipAvailable() {
      return canPip();
    }

    /** A videólejátszó nyitva van-e (a kilépéskori kis ablakhoz). */
    @JavascriptInterface
    public void setVideoActive(boolean on) {
      videoActive = on;
    }

    @JavascriptInterface
    public void setNowPlaying(String title) {
      nowPlaying = title == null ? "" : title;
      PlaybackService.setState(nowPlaying, null);
    }

    /** Van-e betöltött adás (szünetelve is): amíg igen, ott az értesítés (mi szól, szünet / folytatás, leállítás). */
    @JavascriptInterface
    public void setMediaActive(final boolean on) {
      // (az állapot azonnal látszik – egy épp zajló onPause / onStop már az újat olvassa; a szolgáltatás a UI-szálon)
      mediaActive = on;
      runOnUiThread(() -> {
        rendererPriority();
        // (előtérszolgáltatás csak előtérből indítható – a háttérből érkező jelzést az onPause / onStop kezeli)
        if (on) {
          if (foreground) PlaybackService.start(MainActivity.this, nowPlaying);
        } else PlaybackService.stop(MainActivity.this);
      });
    }

    /** A lejátszás szünetel-e (a háttér-értesítés és a médiamunkamenet állapota). */
    @JavascriptInterface
    public void setMediaState(boolean paused) {
      PlaybackService.setState(null, paused);
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
      if ("pickFolder".equals(method)) {
        runOnUiThread(() -> startPickFolder(id));
        return;
      }
      pool.submit(() -> {
        try {
          JSONObject a = new JSONObject(json);
          String out;
          if ("request".equals(method)) out = request(a).toString();
          else if ("probe".equals(method)) out = probeAll(a.getJSONArray("items")).toString();
          // (F03) beépített frissítés: letöltés + ellenőrzés, majd telepítés a rendszer telepítőjével
          // (F04) kivetítés (Chromecast, DLNA) – Google-szolgáltatások nélkül, mint az asztali változat
          else if ("castDiscover".equals(method)) {
            Cast.act = MainActivity.this;
            out = Cast.discover(MainActivity.this, a.optInt("ms", 3500)).toString();
          } else if ("castPlay".equals(method)) out = Cast.play(MainActivity.this, a).toString();
          else if ("castControl".equals(method)) {
            Cast.control(MainActivity.this, a.getString("action"), a.optDouble("value", 0));
            out = "true";
          } else if ("castForget".equals(method)) {
            Cast.forget(MainActivity.this, a.getString("id"));
            out = "true";
          }
          // (F02) helyi / USB-mappák (a kiválasztott, engedélyezett mappán belül)
          else if ("scanFolder".equals(method)) out = Folders.scan(MainActivity.this, a.getString("uri")).toString();
          else if ("readDoc".equals(method)) out = JSONObject.quote(Folders.readText(MainActivity.this, a.getString("uri"), 20 * 1024 * 1024));
          else if ("sidecarSubs".equals(method)) out = Folders.sidecars(MainActivity.this, a.getString("uri"), false).toString();
          else if ("sidecarImage".equals(method)) out = JSONObject.quote((String) Folders.sidecars(MainActivity.this, a.getString("uri"), true));
          else if ("updateDownload".equals(method)) out = Updater.download(MainActivity.this, a).toString();
          else if ("updateInstall".equals(method)) out = JSONObject.quote(Updater.install(MainActivity.this, a.getString("file")));
          else if ("lanGet".equals(method)) out = lanGet(a.getJSONArray("urls"), a.optInt("timeout", 2500)).toString();
          else if ("lanIps".equals(method)) out = new JSONArray(LanServer.localIps()).toString();
          else if ("coverStats".equals(method)) out = covers.stats().toString();
          else if ("icyTitle".equals(method)) out = JSONObject.quote(icyTitle(a.getString("url")));
          else if ("coverClear".equals(method)) {
            covers.clear();
            out = "true";
          }
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
  /** Kapcsolat átirányítások követésével, a hitelesítő fejlécek védelmével (HttpOpen). */
  HttpURLConnection open(String url, String method, Map<String, String> headers, byte[] body, int timeoutMs) throws IOException {
    return HttpOpen.open(url, method, headers, body, timeoutMs, !lanAllowed);
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
   * Rádió – a most szóló szám címe az adás ICY-metaadatából (StreamTitle): `Icy-MetaData: 1` fejléccel
   * az első metaadat-blokkig olvasunk ('' ha az adó nem küld ilyet).
   */
  String icyTitle(String url) {
    if (!url.startsWith("http://") && !url.startsWith("https://")) return "";
    HttpURLConnection c = null;
    try {
      Map<String, String> h = new HashMap<>();
      h.put("Icy-MetaData", "1");
      h.put("Accept-Encoding", "identity");
      c = open(url, "GET", h, null, 8000);
      int metaint = 0;
      try {
        metaint = Integer.parseInt(String.valueOf(c.getHeaderField("icy-metaint")).trim());
      } catch (NumberFormatException e) {
        return "";
      }
      if (c.getResponseCode() >= 400 || metaint <= 0 || metaint > 256 * 1024) return "";
      InputStream in = new BufferedInputStream(c.getInputStream());
      long skip = metaint;
      while (skip > 0) {
        long n = in.skip(skip);
        if (n <= 0) {
          if (in.read() < 0) return "";
          n = 1;
        }
        skip -= n;
      }
      int len = in.read() * 16;
      if (len <= 0) return "";
      byte[] meta = new byte[len];
      int off = 0;
      while (off < len) {
        int n = in.read(meta, off, len - off);
        if (n < 0) break;
        off += n;
      }
      String t = new String(meta, 0, off, StandardCharsets.UTF_8);
      int a = t.indexOf("StreamTitle='");
      if (a < 0) return "";
      int b = t.indexOf("';", a + 13);
      String title = (b < 0 ? t.substring(a + 13) : t.substring(a + 13, b)).replace(String.valueOf((char) 0), "").trim();
      return title.length() > 300 ? title.substring(0, 300) : title;
    } catch (Exception e) {
      return "";
    } finally {
      if (c != null) c.disconnect();
    }
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
    /**
     * A rendszer (pl. memóriahiány miatt) leállította a lap folyamatát: kezelés nélkül ilyenkor az egész alkalmazás
     * összeomlik – így csak a felület indul újra (a lejátszás megáll, de az Adás fut tovább).
     */
    @Override
    public boolean onRenderProcessGone(WebView view, android.webkit.RenderProcessGoneDetail detail) {
      if (view != web || rendererGone) return true;
      rendererGone = true;
      if (nativePlayer != null) nativePlayer.pause();
      if (radioNative != null) radioNative.release();
      if (podNative != null) podNative.release();
      PlaybackService.stop(MainActivity.this);
      // (az elhalt WebView nem használható újra: kikerül a nézetből és megszűnik; a késői hívások üres művelet)
      if (view.getParent() instanceof android.view.ViewGroup) ((android.view.ViewGroup) view.getParent()).removeView(view);
      view.destroy();
      recreate();
      return true;
    }

    @Override
    public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest req) {
      Uri u = req.getUrl();
      String scheme = String.valueOf(u.getScheme()).toLowerCase(Locale.ROOT);
      if (!scheme.equals("http") && !scheme.equals("https")) return null;
      String method = req.getMethod();
      if (HOST.equals(u.getHost())) return asset(u.getPath());
      if ("OPTIONS".equals(method)) return simple(204, "No Content", "text/plain", new byte[0]);
      if (!"GET".equals(method) && !"HEAD".equals(method)) return null; // a POST a hídon megy
      // képek (borítók, logók): a tartós képtárból – a WebView a proxyn átadott választ nem tárolná
      if ("GET".equals(method) && covers != null && Covers.isImage(req.getRequestHeaders())) {
        WebResourceResponse r = covers.get(u.toString(), req.getRequestHeaders());
        if (r != null) return r;
      }
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
        HttpURLConnection c = HttpOpen.open(url, method, streamHeaders(url, pageHeaders), null, 30000, !lanAllowed);
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
        startActivityForResult(Intent.createChooser(i, L.t(MainActivity.this, "Fájl kiválasztása")), REQ_FILE);
      } catch (ActivityNotFoundException e) {
        fileCallback = null;
        Toast.makeText(MainActivity.this, L.t(MainActivity.this, "Ezen az eszközön nincs fájlkezelő."), Toast.LENGTH_LONG).show();
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

  /** (F02) A rendszer mappaválasztója (helyi tár, USB-meghajtó). Ahol nincs (több tévén), hibaüzenet. */
  void startPickFolder(int id) {
    if (folderId >= 0) {
      reply(id, false, JSONObject.quote(L.t(MainActivity.this, "Már nyitva van egy mappaválasztó.")));
      return;
    }
    try {
      folderId = id;
      Intent i = new Intent(Intent.ACTION_OPEN_DOCUMENT_TREE).addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_GRANT_PERSISTABLE_URI_PERMISSION);
      startActivityForResult(i, REQ_TREE);
    } catch (Exception e) {
      folderId = -1;
      reply(id, false, JSONObject.quote(L.t(MainActivity.this, "Ezen az eszközön nincs mappaválasztó – a lejátszólistákat hálózati címről (pl. a NAS webszerveréről) add meg.")));
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
      reply(id, false, JSONObject.quote(L.t(MainActivity.this, "A mentés itt nem érhető el.")));
    }
  }

  @Override
  protected void onActivityResult(int req, int result, Intent data) {
    super.onActivityResult(req, result, data);
    if (req == REQ_FILE && fileCallback != null) {
      fileCallback.onReceiveValue(WebChromeClient.FileChooserParams.parseResult(result, data));
      fileCallback = null;
    } else if (req == REQ_TREE) {
      final int id = folderId;
      folderId = -1;
      if (id < 0) return;
      if (result != RESULT_OK || data == null || data.getData() == null) {
        reply(id, true, "null");
        return;
      }
      try {
        reply(id, true, Folders.keep(this, data.getData()).toString());
      } catch (Exception e) {
        reply(id, false, JSONObject.quote(String.valueOf(e.getMessage())));
      }
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
