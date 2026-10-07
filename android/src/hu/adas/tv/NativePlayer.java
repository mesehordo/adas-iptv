package hu.adas.tv;

import android.graphics.Color;
import android.net.Uri;
import android.os.Handler;
import android.os.Looper;
import android.view.Gravity;
import android.view.SurfaceView;
import android.view.View;
import android.widget.FrameLayout;
import androidx.media3.common.AudioAttributes;
import androidx.media3.common.C;
import androidx.media3.common.Format;
import androidx.media3.common.MediaItem;
import androidx.media3.common.PlaybackException;
import androidx.media3.common.Player;
import androidx.media3.common.TrackSelectionOverride;
import androidx.media3.common.TrackSelectionParameters;
import androidx.media3.common.Tracks;
import androidx.media3.common.VideoSize;
import androidx.media3.common.text.Cue;
import androidx.media3.common.text.CueGroup;
import androidx.media3.datasource.DefaultDataSource;
import androidx.media3.datasource.DefaultHttpDataSource;
import androidx.media3.exoplayer.DefaultRenderersFactory;
import androidx.media3.exoplayer.ExoPlayer;
import androidx.media3.exoplayer.source.DefaultMediaSourceFactory;
import androidx.media3.extractor.DefaultExtractorsFactory;
import java.util.HashMap;
import java.util.Map;
import org.json.JSONArray;
import org.json.JSONObject;

/**
 * Natív lejátszó filmekhez és sorozatokhoz (ExoPlayer / Media3) – a WebView beépített lejátszója nem
 * kezeli az AC3 / DTS hangot és a fájlba ágyazott (MKV: ASS / SRT) feliratot. A kép a WebView alatti
 * SurfaceView-n jelenik meg (a lap ilyenkor átlátszó), a vezérlők és a felirat a webes felületen maradnak:
 * az állapotot, a sávokat és a felirat szövegét eseményként kapja meg (window.__adasExo).
 * Az AC3 / E-AC3 / DTS / TrueHD hangot – ha az eszköz maga nem tudja – az FFmpeg-dekóder (Jellyfin) bontja ki.
 */
class NativePlayer implements Player.Listener {
  final MainActivity act;
  final FrameLayout root;
  SurfaceView surface;
  ExoPlayer player;
  Tracks lastTracks = Tracks.EMPTY;
  final Handler handler = new Handler(Looper.getMainLooper());
  boolean active;
  int videoW, videoH;
  float pixelRatio = 1f;

  final Runnable tick =
      new Runnable() {
        @Override
        public void run() {
          if (player == null || !active) return;
          sendTime();
          handler.postDelayed(this, 250);
        }
      };

  NativePlayer(MainActivity act, FrameLayout root) {
    this.act = act;
    this.root = root;
  }

  // ------------------------------------------------------------------------------- vezérlés
  void play(JSONObject o) {
    release();
    String url = o.optString("url");
    String ua = o.optString("ua");
    String ref = o.optString("referrer");
    long startMs = (long) (o.optDouble("start", 0) * 1000);

    Map<String, String> props = new HashMap<>();
    if (!ref.isEmpty()) props.put("Referer", ref);
    DefaultHttpDataSource.Factory http =
        new DefaultHttpDataSource.Factory()
            .setUserAgent(ua.isEmpty() ? MainActivity.CHROME_UA : ua)
            .setAllowCrossProtocolRedirects(true)
            .setConnectTimeoutMs(15000)
            .setReadTimeoutMs(20000)
            .setDefaultRequestProperties(props);
    DefaultDataSource.Factory data = new DefaultDataSource.Factory(act, http);
    DefaultExtractorsFactory extractors = new DefaultExtractorsFactory().setConstantBitrateSeekingEnabled(true);
    DefaultRenderersFactory renderers =
        new DefaultRenderersFactory(act)
            // Az eszköz saját dekódere az első; amit az nem tud (AC3, DTS…), azt az FFmpeg
            .setExtensionRendererMode(DefaultRenderersFactory.EXTENSION_RENDERER_MODE_ON)
            .setEnableDecoderFallback(true);
    player = new ExoPlayer.Builder(act, renderers).setMediaSourceFactory(new DefaultMediaSourceFactory(data, extractors)).build();
    player.setAudioAttributes(new AudioAttributes.Builder().setUsage(C.USAGE_MEDIA).setContentType(C.AUDIO_CONTENT_TYPE_MOVIE).build(), true);
    player.addListener(this);

    // Kedvenc hang- és feliratnyelv (a profil beállítása)
    TrackSelectionParameters.Builder p = player.getTrackSelectionParameters().buildUpon();
    String audio = o.optString("prefAudio");
    String text = o.optString("prefText", "auto");
    if (!audio.isEmpty()) p.setPreferredAudioLanguage(audio);
    if ("off".equals(text)) p.setTrackTypeDisabled(C.TRACK_TYPE_TEXT, true);
    else if ("hu".equals(text) || "en".equals(text)) p.setPreferredTextLanguage(text);
    else p.setPreferredTextLanguage("hu"); // 'auto': a jelölt (alapértelmezett) felirat, ill. a magyar
    player.setTrackSelectionParameters(p.build());

    ensureSurface();
    player.setVideoSurfaceView(surface);
    surface.setVisibility(View.VISIBLE);
    act.web.setBackgroundColor(Color.TRANSPARENT);
    active = true;
    player.setMediaItem(MediaItem.fromUri(Uri.parse(url)), startMs);
    player.prepare();
    player.setPlayWhenReady(true);
    handler.removeCallbacks(tick);
    handler.post(tick);
  }

  void pause() {
    if (player != null) player.setPlayWhenReady(false);
  }

  void resume() {
    if (player == null) return;
    if (player.getPlaybackState() == Player.STATE_ENDED) player.seekTo(0);
    player.setPlayWhenReady(true);
  }

  void seek(double sec) {
    if (player != null) player.seekTo((long) (sec * 1000));
  }

  void volume(float v) {
    if (player != null) player.setVolume(Math.max(0f, Math.min(1f, v)));
  }

  /** Hang- vagy feliratsáv választása (a sávlista csoport- és sorszáma); text esetén g &lt; 0 = kikapcsolás. */
  void select(String kind, int g, int i) {
    if (player == null) return;
    int type = "text".equals(kind) ? C.TRACK_TYPE_TEXT : C.TRACK_TYPE_AUDIO;
    TrackSelectionParameters.Builder b = player.getTrackSelectionParameters().buildUpon();
    if (g < 0) {
      b.clearOverridesOfType(type).setTrackTypeDisabled(type, true);
    } else if (g < lastTracks.getGroups().size()) {
      Tracks.Group group = lastTracks.getGroups().get(g);
      b.setTrackTypeDisabled(type, false).setOverrideForType(new TrackSelectionOverride(group.getMediaTrackGroup(), i));
    }
    player.setTrackSelectionParameters(b.build());
  }

  void stop() {
    release();
  }

  void release() {
    handler.removeCallbacks(tick);
    active = false;
    if (player != null) {
      player.removeListener(this);
      player.release();
      player = null;
    }
    lastTracks = Tracks.EMPTY;
    if (surface != null) surface.setVisibility(View.GONE);
    act.web.setBackgroundColor(Color.BLACK);
  }

  void ensureSurface() {
    if (surface != null) return;
    surface = new SurfaceView(act);
    surface.setVisibility(View.GONE);
    // a távirányító / billentyűzet a WebView-hoz menjen (a vezérlők ott vannak)
    surface.setFocusable(false);
    surface.setFocusableInTouchMode(false);
    root.addView(surface, 0, new FrameLayout.LayoutParams(FrameLayout.LayoutParams.MATCH_PARENT, FrameLayout.LayoutParams.MATCH_PARENT, Gravity.CENTER));
    root.addOnLayoutChangeListener((v, l, t, r, b, ol, ot, or, ob) -> fitSurface());
  }

  /** A kép arányának megtartása (fekete sávokkal), középre igazítva. */
  void fitSurface() {
    if (surface == null || videoW <= 0 || videoH <= 0) return;
    int W = root.getWidth();
    int H = root.getHeight();
    if (W <= 0 || H <= 0) return;
    float aspect = videoW * pixelRatio / videoH;
    int w = W;
    int h = Math.round(W / aspect);
    if (h > H) {
      h = H;
      w = Math.round(H * aspect);
    }
    FrameLayout.LayoutParams lp = (FrameLayout.LayoutParams) surface.getLayoutParams();
    if (lp.width == w && lp.height == h) return;
    lp.width = w;
    lp.height = h;
    lp.gravity = Gravity.CENTER;
    surface.setLayoutParams(lp);
  }

  // ------------------------------------------------------------------------------- események
  void send(JSONObject o) {
    act.web.evaluateJavascript("window.__adasExo&&window.__adasExo(" + o.toString() + ")", null);
  }

  void sendTime() {
    try {
      long dur = player.getDuration();
      JSONObject o = new JSONObject();
      o.put("type", "time");
      o.put("pos", player.getCurrentPosition() / 1000.0);
      o.put("dur", dur == C.TIME_UNSET ? -1 : dur / 1000.0);
      o.put("buf", player.getBufferedPosition() / 1000.0);
      o.put("playing", player.isPlaying());
      o.put("pwr", player.getPlayWhenReady());
      send(o);
    } catch (Exception ignored) {
    }
  }

  @Override
  public void onPlaybackStateChanged(int state) {
    try {
      JSONObject o = new JSONObject();
      o.put("type", "state");
      o.put("state", state == Player.STATE_BUFFERING ? "buffering" : state == Player.STATE_READY ? "ready" : state == Player.STATE_ENDED ? "ended" : "idle");
      send(o);
      if (player != null) sendTime();
    } catch (Exception ignored) {
    }
  }

  @Override
  public void onIsPlayingChanged(boolean playing) {
    if (player != null) sendTime();
  }

  @Override
  public void onPlayerError(PlaybackException e) {
    try {
      JSONObject o = new JSONObject();
      o.put("type", "error");
      Throwable c = e.getCause();
      o.put("message", e.getErrorCodeName() + (c != null && c.getMessage() != null ? ": " + c.getMessage() : ""));
      send(o);
    } catch (Exception ignored) {
    }
  }

  @Override
  public void onVideoSizeChanged(VideoSize size) {
    videoW = size.width;
    videoH = size.height;
    pixelRatio = size.pixelWidthHeightRatio > 0 ? size.pixelWidthHeightRatio : 1f;
    fitSurface();
    try {
      JSONObject o = new JSONObject();
      o.put("type", "size");
      o.put("w", size.width);
      o.put("h", size.height);
      send(o);
    } catch (Exception ignored) {
    }
  }

  @Override
  public void onTracksChanged(Tracks tracks) {
    lastTracks = tracks;
    try {
      JSONArray audio = new JSONArray();
      JSONArray text = new JSONArray();
      for (int g = 0; g < tracks.getGroups().size(); g++) {
        Tracks.Group group = tracks.getGroups().get(g);
        int type = group.getType();
        if (type != C.TRACK_TYPE_AUDIO && type != C.TRACK_TYPE_TEXT) continue;
        for (int i = 0; i < group.length; i++) {
          Format f = group.getTrackFormat(i);
          JSONObject t = new JSONObject();
          t.put("g", g);
          t.put("i", i);
          t.put("lang", f.language == null ? "" : f.language);
          t.put("label", f.label == null ? "" : f.label);
          t.put("mime", f.sampleMimeType == null ? "" : f.sampleMimeType);
          t.put("ch", f.channelCount == Format.NO_VALUE ? 0 : f.channelCount);
          t.put("sel", group.isTrackSelected(i));
          t.put("ok", group.isTrackSupported(i));
          t.put("def", (f.selectionFlags & C.SELECTION_FLAG_DEFAULT) != 0);
          t.put("forced", (f.selectionFlags & C.SELECTION_FLAG_FORCED) != 0);
          (type == C.TRACK_TYPE_AUDIO ? audio : text).put(t);
        }
      }
      JSONObject o = new JSONObject();
      o.put("type", "tracks");
      o.put("audio", audio);
      o.put("text", text);
      send(o);
    } catch (Exception ignored) {
    }
  }

  @Override
  public void onCues(CueGroup cues) {
    try {
      StringBuilder sb = new StringBuilder();
      for (Cue c : cues.cues) {
        if (c.text == null) continue;
        if (sb.length() > 0) sb.append('\n');
        sb.append(c.text.toString());
      }
      JSONObject o = new JSONObject();
      o.put("type", "cues");
      o.put("text", sb.toString());
      send(o);
    } catch (Exception ignored) {
    }
  }
}
