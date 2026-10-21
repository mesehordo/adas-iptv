package hu.adas.tv;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.media.MediaMetadata;
import android.media.session.MediaSession;
import android.media.session.PlaybackState;
import android.os.Build;
import android.net.wifi.WifiManager;
import android.os.IBinder;
import android.os.PowerManager;

/**
 * Lejátszás közben (előtérben is) egy állandó médiaértesítés jelzi, mi szól; a háttérben (képernyőzárnál, a rádió
 * mindig, a videó másik alkalmazásra váltáskor a beállítás szerint) a rendszer így nem állítja le a folyamatot. Az értesítésről (és a médiamunkamenet révén a fülhallgató, a Bluetooth-eszköz, a
 * zárolt képernyő vagy a tévé médiagombjairól) szüneteltethető, folytatható, leállítható; koppintásra az
 * Adás visszajön.
 *
 * (B37) Az előtérszolgáltatás a háttérbe kerülés előtt indul (MainActivity.onPause – ekkor az alkalmazás
 * még előtérben van): Android 12-től a háttérből (onStop) indított előtérszolgáltatást a rendszer elutasítja,
 * és eddig ilyenkor értesítés és védelem nélkül állt le a lejátszás.
 */
public class PlaybackService extends Service {
  static final String CHANNEL = "adas-playback";
  static final String STOP = "hu.adas.tv.STOP_PLAYBACK";
  static final String TOGGLE = "hu.adas.tv.TOGGLE_PLAYBACK";
  static final int ID = 4242;

  static volatile PlaybackService instance;
  static volatile String title = "";
  static volatile boolean paused = false;
  MediaSession session;
  boolean foreground; // ez a példány sikeresen előtérbe került-e
  // lejátszás közben (nem szünetelve): a processzor és a Wi-Fi ébren marad – lezárt képernyőnél a Wi-Fi
  // energiatakarékos módja nem szakítja meg az adást
  PowerManager.WakeLock cpu;
  WifiManager.WifiLock wifi;

  static void start(Context ctx, String t) {
    if (t != null) title = t;
    Intent i = new Intent(ctx, PlaybackService.class);
    try {
      if (Build.VERSION.SDK_INT >= 26) ctx.startForegroundService(i);
      else ctx.startService(i);
    } catch (Exception ignored) {
      // pl. háttérből indítás tiltva – az onPause-ból indítva ez nem fordul elő
    }
  }

  static void stop(Context ctx) {
    ctx.stopService(new Intent(ctx, PlaybackService.class));
  }

  static boolean running() {
    return instance != null;
  }

  /** A felület jelzi a lejátszás állapotát / címét: a futó értesítés és a munkamenet frissül. */
  static void setState(String t, Boolean p) {
    if (t != null) title = t;
    if (p != null) paused = p;
    PlaybackService s = instance;
    if (s != null) s.refresh();
  }

  @Override
  public void onCreate() {
    super.onCreate();
    instance = this;
    session = new MediaSession(this, "Adas");
    session.setCallback(
        new MediaSession.Callback() {
          @Override
          public void onPlay() {
            command("play");
          }

          @Override
          public void onPause() {
            command("pause");
          }

          @Override
          public void onStop() {
            stopPlayback();
          }

          @Override
          public void onSkipToNext() {
            command("next");
          }

          @Override
          public void onSkipToPrevious() {
            command("prev");
          }
        });
    session.setActive(true);
    // (az előtérbe lépés már itt: ha a szolgáltatás az onStartCommand előtt leállna – pl. gyors visszalépésnél –,
    // a rendszer nem tekinti hibának, és az Adás nem omlik össze; betöltött adás nélkül – pl. egy késve érkező
    // értesítésgomb – nincs értesítés, az onStartCommand leállítja)
    if (mediaActive()) goForeground();
  }

  static boolean mediaActive() {
    MainActivity a = MainActivity.instance;
    return a != null && a.mediaActive;
  }

  void goForeground() {
    try {
      Notification n = build();
      if (Build.VERSION.SDK_INT >= 29) startForeground(ID, n, ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK);
      else startForeground(ID, n);
      foreground = true;
    } catch (Exception e) {
      // (pl. háttérből indítva – Android 12+)
    }
    locks();
  }

  /** Ébren tartás csak szóló adásnál (szünetelve nem meríti az akkumulátort). */
  @SuppressWarnings("deprecation")
  void locks() {
    boolean on = foreground && !paused;
    try {
      if (on) {
        if (cpu == null) {
          PowerManager pm = (PowerManager) getSystemService(Context.POWER_SERVICE);
          cpu = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "adas:playback");
          cpu.setReferenceCounted(false);
        }
        if (wifi == null) {
          WifiManager wm = (WifiManager) getApplicationContext().getSystemService(Context.WIFI_SERVICE);
          if (wm != null) {
            // (a LOW_LATENCY mód csak bekapcsolt képernyőn hat – lezárt képernyőnél a HIGH_PERF)
            wifi = wm.createWifiLock(WifiManager.WIFI_MODE_FULL_HIGH_PERF, "adas:playback");
            wifi.setReferenceCounted(false);
          }
        }
        if (!cpu.isHeld()) cpu.acquire();
        if (wifi != null && !wifi.isHeld()) wifi.acquire();
      } else {
        if (cpu != null && cpu.isHeld()) cpu.release();
        if (wifi != null && wifi.isHeld()) wifi.release();
      }
    } catch (Exception ignored) {
    }
  }

  static void command(String cmd) {
    MainActivity a = MainActivity.instance;
    if (a != null) a.mediaCommand(cmd);
  }

  void stopPlayback() {
    MainActivity a = MainActivity.instance;
    if (a != null) a.stopFromNotification();
    stopSelf();
  }

  @Override
  public int onStartCommand(Intent intent, int flags, int startId) {
    String action = intent != null ? intent.getAction() : null;
    if (STOP.equals(action)) {
      stopPlayback();
      return START_NOT_STICKY;
    }
    if (TOGGLE.equals(action)) {
      // (egy már kiváltott, késve érkező gomb a leállított szolgáltatást nem indíthatja újra előtér nélkül)
      // (a betöltött adás hiánya jelzi a késve érkező gombot)
      if (!foreground || !mediaActive()) {
        stopSelf();
        return START_NOT_STICKY;
      }
      command(paused ? "play" : "pause");
      return START_NOT_STICKY;
    }
    goForeground();
    // (egy már előtérben futó példányt egy sikertelen ismételt indítás nem állít le)
    if (!foreground) stopSelf();
    return START_NOT_STICKY;
  }

  void refresh() {
    locks();
    try {
      NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
      nm.notify(ID, build());
    } catch (Exception ignored) {
    }
  }

  @SuppressWarnings("deprecation")
  Notification build() {
    NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
    if (Build.VERSION.SDK_INT >= 26 && nm.getNotificationChannel(CHANNEL) == null) {
      NotificationChannel ch = new NotificationChannel(CHANNEL, L.t(this, "Lejátszás a háttérben"), NotificationManager.IMPORTANCE_LOW);
      ch.setDescription(L.t(this, "Amíg az Adás a háttérben szól"));
      nm.createNotificationChannel(ch);
    }
    String t = title != null && !title.isEmpty() ? title : "Adás";
    // a médiamunkamenet: a rendszer médiavezérlői (zárolt képernyő, fülhallgató, Bluetooth, tévé)
    session.setMetadata(new MediaMetadata.Builder().putString(MediaMetadata.METADATA_KEY_TITLE, t).putString(MediaMetadata.METADATA_KEY_ARTIST, "Adás").build());
    session.setPlaybackState(
        new PlaybackState.Builder()
            .setActions(PlaybackState.ACTION_PLAY | PlaybackState.ACTION_PAUSE | PlaybackState.ACTION_PLAY_PAUSE | PlaybackState.ACTION_STOP | PlaybackState.ACTION_SKIP_TO_NEXT | PlaybackState.ACTION_SKIP_TO_PREVIOUS)
            .setState(paused ? PlaybackState.STATE_PAUSED : PlaybackState.STATE_PLAYING, PlaybackState.PLAYBACK_POSITION_UNKNOWN, 1f)
            .build());
    Intent open = new Intent(this, MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_REORDER_TO_FRONT);
    PendingIntent tap = PendingIntent.getActivity(this, 4243, open, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    PendingIntent stop = PendingIntent.getService(this, 4244, new Intent(this, PlaybackService.class).setAction(STOP), PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    PendingIntent toggle = PendingIntent.getService(this, 4245, new Intent(this, PlaybackService.class).setAction(TOGGLE), PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    Notification.Builder b = Build.VERSION.SDK_INT >= 26 ? new Notification.Builder(this, CHANNEL) : new Notification.Builder(this);
    b.setSmallIcon(R.drawable.ic_stat_tv)
        .setContentTitle(t)
        .setContentText(L.t(this, paused ? "Szünetel" : "Most szól"))
        .setContentIntent(tap)
        .setOngoing(true)
        .setVisibility(Notification.VISIBILITY_PUBLIC)
        .setCategory(Notification.CATEGORY_TRANSPORT)
        .addAction(new Notification.Action.Builder(paused ? android.R.drawable.ic_media_play : android.R.drawable.ic_media_pause, L.t(this, paused ? "Folytatás" : "Szünet"), toggle).build())
        .addAction(new Notification.Action.Builder(android.R.drawable.ic_menu_close_clear_cancel, L.t(this, "Leállítás"), stop).build())
        .setStyle(new Notification.MediaStyle().setMediaSession(session.getSessionToken()).setShowActionsInCompactView(0, 1));
    return b.build();
  }

  @Override
  public void onDestroy() {
    instance = null;
    foreground = false;
    locks();
    try {
      session.setActive(false);
      session.release();
    } catch (Exception ignored) {
    }
    super.onDestroy();
  }

  @Override
  public IBinder onBind(Intent intent) {
    return null;
  }
}
