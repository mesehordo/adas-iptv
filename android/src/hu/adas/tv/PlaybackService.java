package hu.adas.tv;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.os.Build;
import android.os.IBinder;

/**
 * Háttérlejátszás: amíg az Adás a háttérben szól (másik alkalmazásra váltáskor, ha a Beállításokban
 * be van kapcsolva), egy állandó értesítés jelzi, és a rendszer nem állítja le a folyamatot.
 * Az értesítésre koppintva az Adás visszajön, a „Leállítás” gomb megállítja a lejátszást.
 */
public class PlaybackService extends Service {
  static final String CHANNEL = "adas-playback";
  static final String STOP = "hu.adas.tv.STOP_PLAYBACK";
  static final int ID = 4242;

  static void start(Context ctx, String title) {
    Intent i = new Intent(ctx, PlaybackService.class).putExtra("title", title);
    try {
      if (Build.VERSION.SDK_INT >= 26) ctx.startForegroundService(i);
      else ctx.startService(i);
    } catch (Exception ignored) {
      // pl. háttérből indítás tiltva – ilyenkor értesítés nélkül szól tovább
    }
  }

  static void stop(Context ctx) {
    ctx.stopService(new Intent(ctx, PlaybackService.class));
  }

  @Override
  public int onStartCommand(Intent intent, int flags, int startId) {
    if (intent != null && STOP.equals(intent.getAction())) {
      MainActivity a = MainActivity.instance;
      if (a != null) a.stopFromNotification();
      stopSelf();
      return START_NOT_STICKY;
    }
    String title = intent != null ? intent.getStringExtra("title") : null;
    NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
    if (Build.VERSION.SDK_INT >= 26 && nm.getNotificationChannel(CHANNEL) == null) {
      NotificationChannel ch = new NotificationChannel(CHANNEL, "Lejátszás a háttérben", NotificationManager.IMPORTANCE_LOW);
      ch.setDescription("Amíg az Adás a háttérben szól");
      nm.createNotificationChannel(ch);
    }
    Intent open = new Intent(this, MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_REORDER_TO_FRONT);
    PendingIntent tap = PendingIntent.getActivity(this, 4243, open, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    PendingIntent stop = PendingIntent.getService(this, 4244, new Intent(this, PlaybackService.class).setAction(STOP), PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    Notification.Builder b = Build.VERSION.SDK_INT >= 26 ? new Notification.Builder(this, CHANNEL) : new Notification.Builder(this);
    b.setSmallIcon(R.drawable.ic_stat_tv)
        .setContentTitle(title != null && !title.isEmpty() ? title : "Adás")
        .setContentText("Lejátszás a háttérben")
        .setContentIntent(tap)
        .setOngoing(true)
        .setCategory(Notification.CATEGORY_TRANSPORT)
        .addAction(new Notification.Action.Builder(null, "Leállítás", stop).build());
    Notification n = b.build();
    try {
      if (Build.VERSION.SDK_INT >= 29) startForeground(ID, n, ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK);
      else startForeground(ID, n);
    } catch (Exception e) {
      stopSelf();
    }
    return START_NOT_STICKY;
  }

  @Override
  public IBinder onBind(Intent intent) {
    return null;
  }
}
