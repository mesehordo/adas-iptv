package hu.adas.tv;

import android.net.Uri;
import androidx.media3.common.AudioAttributes;
import androidx.media3.common.C;
import androidx.media3.common.Format;
import androidx.media3.common.MediaItem;
import androidx.media3.common.MediaMetadata;
import androidx.media3.common.PlaybackException;
import androidx.media3.common.Player;
import androidx.media3.datasource.DefaultDataSource;
import androidx.media3.datasource.DefaultHttpDataSource;
import androidx.media3.exoplayer.ExoPlayer;
import androidx.media3.exoplayer.source.DefaultMediaSourceFactory;
import org.json.JSONObject;

/**
 * Rádió – natív lejátszás (ExoPlayer / Media3). A WebView audioeleme az adást a lap proxyján át kérné (CORS),
 * ami sok rádiószervernél nem indul el, vagy végtelenül „csatlakozik”; az ExoPlayer közvetlenül kapcsolódik, és
 * kezeli az ICY (Shoutcast / Icecast) adásokat, az átirányításokat (http ↔ https), az AAC / MP3 / Ogg / HLS
 * formátumot és a hangfókuszt (telefonhívás). A most szóló szám címét (ICY StreamTitle) is ő adja.
 * Az állapot eseményként megy a lapnak: window.__adasRadio({ id, st | meta }) – az id a lap indítási sorszáma,
 * így egy korábbi indítás késői eseménye nem keveredik az újéval. Minden metódus a fő szálon fut.
 */
class RadioNative implements Player.Listener {
  final MainActivity act;
  ExoPlayer player;
  int id;
  boolean wasPlaying;

  RadioNative(MainActivity act) {
    this.act = act;
  }

  void play(JSONObject o) {
    release();
    id = o.optInt("id");
    wasPlaying = false;
    // csak internetes (http / https) adás – a híd más sémájú címet (file:, content: …) nem nyit meg
    Uri uri = Uri.parse(o.optString("url"));
    String scheme = uri.getScheme() == null ? "" : uri.getScheme().toLowerCase(java.util.Locale.ROOT);
    if (!scheme.equals("http") && !scheme.equals("https")) {
      send("st", "error");
      return;
    }
    // (H11) a lista által megadott User-Agent / Referer
    String ua = o.optString("ua");
    String ref = o.optString("referrer");
    java.util.Map<String, String> props = new java.util.HashMap<>();
    if (ref.startsWith("http://") || ref.startsWith("https://")) props.put("Referer", ref);
    DefaultHttpDataSource.Factory http =
        new DefaultHttpDataSource.Factory()
            .setUserAgent(ua.isEmpty() ? MainActivity.CHROME_UA : ua)
            .setDefaultRequestProperties(props)
            .setAllowCrossProtocolRedirects(true)
            .setConnectTimeoutMs(12000)
            .setReadTimeoutMs(20000);
    DefaultDataSource.Factory data = new DefaultDataSource.Factory(act, http);
    player = new ExoPlayer.Builder(act).setMediaSourceFactory(new DefaultMediaSourceFactory(data)).build();
    player.setAudioAttributes(new AudioAttributes.Builder().setUsage(C.USAGE_MEDIA).setContentType(C.AUDIO_CONTENT_TYPE_MUSIC).build(), true);
    // (fejhallgató kihúzása / Bluetooth-eszköz lekapcsolódása: szünet – az onIsPlayingChanged jelzi a felületnek)
    player.setHandleAudioBecomingNoisy(true);
    player.setVolume(clamp(o.optDouble("volume", 1)));
    player.addListener(this);
    player.setMediaItem(MediaItem.fromUri(uri));
    player.prepare();
    player.setPlayWhenReady(true);
  }

  void volume(double v) {
    if (player != null) player.setVolume(clamp(v));
  }

  void stop() {
    release();
  }

  void release() {
    if (player == null) return;
    player.removeListener(this);
    player.release();
    player = null;
  }

  /** Az „Adás adatai” panelhez: formátum, bitráta, puffer (JSON). */
  String info() {
    JSONObject o = new JSONObject();
    try {
      if (player == null) return o.toString();
      Format f = player.getAudioFormat();
      if (f != null) {
        o.put("mime", f.sampleMimeType == null ? "" : f.sampleMimeType);
        o.put("codecs", f.codecs == null ? "" : f.codecs);
        o.put("bitrate", f.bitrate == Format.NO_VALUE ? (f.averageBitrate == Format.NO_VALUE ? 0 : f.averageBitrate) : f.bitrate);
        o.put("rate", f.sampleRate == Format.NO_VALUE ? 0 : f.sampleRate);
        o.put("ch", f.channelCount == Format.NO_VALUE ? 0 : f.channelCount);
      }
      o.put("buffer", Math.max(0, player.getTotalBufferedDuration()) / 1000.0);
    } catch (Exception ignored) {
    }
    return o.toString();
  }

  // ------------------------------------------------------------------------------- események
  @Override
  public void onPlaybackStateChanged(int state) {
    if (state == Player.STATE_BUFFERING && wasPlaying) send("st", "buffering");
    else if (state == Player.STATE_ENDED) send("st", "ended");
  }

  @Override
  public void onIsPlayingChanged(boolean playing) {
    if (playing) {
      wasPlaying = true;
      send("st", "playing");
      return;
    }
    // (X05) a megállás is a felülethez jut (a médiavezérlés és az ébren tartás a felület állapotát követi): tartós
    // hangfókuszvesztés vagy lekapcsolódó fejhallgató → szünet; átmeneti elnyomás (pl. telefonhívás) → „elnémítva”,
    // ebből magától folytatódik. A pufferelés és a vég külön eseményt kap (onPlaybackStateChanged).
    if (player == null) return;
    int st = player.getPlaybackState();
    if (st != Player.STATE_READY) return;
    if (!player.getPlayWhenReady()) send("st", "paused");
    else if (player.getPlaybackSuppressionReason() != Player.PLAYBACK_SUPPRESSION_REASON_NONE) send("st", "suppressed");
  }

  /**
   * A rendszer szüneteltetett (tartós hangfókuszvesztés, kihúzott fejhallgató) – pufferelés közben is, amikor az
   * isPlaying már előtte hamis volt, így az onIsPlayingChanged nem jelezne. (A felület saját szüneténél a lejátszó
   * megszűnik – release –, ide nem jut esemény.)
   */
  @Override
  public void onPlayWhenReadyChanged(boolean playWhenReady, int reason) {
    if (!playWhenReady && reason != Player.PLAY_WHEN_READY_CHANGE_REASON_USER_REQUEST) send("st", "paused");
  }

  @Override
  public void onPlayerError(PlaybackException e) {
    send("st", "error");
  }

  @Override
  public void onMediaMetadataChanged(MediaMetadata m) {
    // (az ICY StreamTitle a címben érkezik; üres cím = az adó nem küld számcímet)
    if (m.title != null) send("meta", m.title.toString());
  }

  void send(String key, String value) {
    try {
      JSONObject o = new JSONObject().put("id", id).put(key, value);
      act.web.evaluateJavascript("window.__adasRadio&&window.__adasRadio(" + o + ")", null);
    } catch (Exception ignored) {
    }
  }

  static float clamp(double v) {
    return (float) Math.max(0, Math.min(1, v));
  }
}
