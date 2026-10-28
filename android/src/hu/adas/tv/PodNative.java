package hu.adas.tv;

import android.net.Uri;
import android.os.Handler;
import android.os.Looper;
import androidx.media3.common.AudioAttributes;
import androidx.media3.common.C;
import androidx.media3.common.MediaItem;
import androidx.media3.common.PlaybackException;
import androidx.media3.common.PlaybackParameters;
import androidx.media3.common.Player;
import androidx.media3.datasource.DataSource;
import androidx.media3.datasource.DefaultDataSource;
import androidx.media3.exoplayer.ExoPlayer;
import androidx.media3.exoplayer.source.DefaultMediaSourceFactory;
import org.json.JSONObject;

/**
 * Podcast – natív lejátszás (ExoPlayer / Media3): tekerés, sebesség, folytatás, háttérben is (a WebView audioeleme
 * háttérbe kerülve elhallgatna). Az állapot és a pozíció eseményként megy a lapnak: window.__adasPod({ st, pos, dur })
 * – a pozíció lejátszás közben másodpercenként. Minden metódus a fő szálon fut.
 */
class PodNative implements Player.Listener {
  final MainActivity act;
  ExoPlayer player;
  final Handler handler = new Handler(Looper.getMainLooper());
  final Runnable ticker = new Runnable() {
    @Override
    public void run() {
      if (player == null) return;
      sendPos();
      handler.postDelayed(this, 1000);
    }
  };

  PodNative(MainActivity act) {
    this.act = act;
  }

  int gen = -1; // (a lap indítási sorszáma: minden esemény viszi, a korábbi indítás késő eseménye így kiszűrhető)
  java.io.File localFile; // (a letöltött fájl, ha abból szól – hibánál: hiányzik-e)

  void play(JSONObject o) {
    release();
    gen = o.optInt("gen", -1);
    localFile = null;
    // internetes (http / https) epizód, vagy a letöltött fájl – de csak a podcast-mappából (PodFiles); más
    // sémájú (content: …) vagy máshová mutató helyi címet a híd nem nyit meg
    Uri uri = Uri.parse(o.optString("url"));
    String scheme = uri.getScheme() == null ? "" : uri.getScheme().toLowerCase(java.util.Locale.ROOT);
    boolean local = scheme.equals("file") && uri.getPath() != null && PodFiles.inDir(act, new java.io.File(uri.getPath()));
    if (local) localFile = new java.io.File(uri.getPath());
    if (!local && !scheme.equals("http") && !scheme.equals("https")) {
      send("error", -1, -1);
      return;
    }
    // A helyi hálózati szabály (mint a lap kéréseinél): a lejátszó minden kérése – a tekeréskor küldött tartomány-
    // kérések és minden átirányítás is – a HttpOpen ellenőrzésén megy át (LanDataSource).
    DataSource.Factory http = new LanDataSource.Factory(!act.lanAllowed, MainActivity.CHROME_UA);
    DefaultDataSource.Factory data = new DefaultDataSource.Factory(act, http);
    player = new ExoPlayer.Builder(act).setMediaSourceFactory(new DefaultMediaSourceFactory(data)).build();
    player.setAudioAttributes(new AudioAttributes.Builder().setUsage(C.USAGE_MEDIA).setContentType(C.AUDIO_CONTENT_TYPE_SPEECH).build(), true);
    // (fejhallgató kihúzása: szünet – mint a rádiónál)
    player.setHandleAudioBecomingNoisy(true);
    player.addListener(this);
    player.setMediaItem(MediaItem.fromUri(uri));
    float rate = (float) Math.max(0.5, Math.min(3.0, o.optDouble("rate", 1)));
    player.setPlaybackParameters(new PlaybackParameters(rate));
    long start = Math.max(0, (long) (o.optDouble("start", 0) * 1000));
    player.prepare();
    if (start > 0) player.seekTo(start);
    player.setPlayWhenReady(true);
    handler.removeCallbacks(ticker);
    handler.post(ticker);
  }

  void pause() {
    if (player != null) player.setPlayWhenReady(false);
  }

  void resume() {
    if (player != null) player.setPlayWhenReady(true);
  }

  void seek(double sec) {
    if (player != null) player.seekTo(Math.max(0, (long) (sec * 1000)));
  }

  void rate(double r) {
    if (player != null) player.setPlaybackParameters(new PlaybackParameters((float) Math.max(0.5, Math.min(3.0, r))));
  }

  void stop() {
    release();
  }

  void release() {
    handler.removeCallbacks(ticker);
    if (player == null) return;
    player.removeListener(this);
    player.release();
    player = null;
  }

  // ------------------------------------------------------------------------------- események
  @Override
  public void onPlaybackStateChanged(int state) {
    if (state == Player.STATE_BUFFERING) send("loading", pos(), dur());
    else if (state == Player.STATE_ENDED) send("ended", pos(), dur());
  }

  @Override
  public void onIsPlayingChanged(boolean playing) {
    if (playing) send("playing", pos(), dur());
    else if (player != null && player.getPlaybackState() == Player.STATE_READY && !player.getPlayWhenReady()) send("paused", pos(), dur());
  }

  @Override
  public void onPlayWhenReadyChanged(boolean playWhenReady, int reason) {
    if (!playWhenReady && reason != Player.PLAY_WHEN_READY_CHANGE_REASON_USER_REQUEST) send("paused", pos(), dur());
  }

  @Override
  public void onPlayerError(PlaybackException e) {
    // (a letöltött fájl hiányzik: a lap ilyenkor a letöltés adatát is elejti; más hibánál a fájl marad)
    send("error", pos(), dur(), localFile != null && !localFile.exists());
  }

  double pos() {
    return player == null ? 0 : Math.max(0, player.getCurrentPosition()) / 1000.0;
  }

  double dur() {
    if (player == null) return 0;
    long d = player.getDuration();
    return d == C.TIME_UNSET || d < 0 ? 0 : d / 1000.0;
  }

  void sendPos() {
    if (player != null && player.isPlaying()) send(null, pos(), dur());
  }

  void send(String st, double pos, double dur) {
    send(st, pos, dur, false);
  }

  void send(String st, double pos, double dur, boolean missing) {
    try {
      JSONObject o = new JSONObject();
      if (gen >= 0) o.put("gen", gen);
      if (missing) o.put("missing", true);
      if (st != null) o.put("st", st);
      if (pos >= 0) o.put("pos", pos);
      if (dur > 0) o.put("dur", dur);
      act.web.evaluateJavascript("window.__adasPod&&window.__adasPod(" + o + ")", null);
    } catch (Exception ignored) {
    }
  }
}
