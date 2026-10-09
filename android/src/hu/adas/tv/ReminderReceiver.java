package hu.adas.tv;

import android.app.AlarmManager;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;

import org.json.JSONArray;
import org.json.JSONObject;

import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;

/**
 * Műsor-emlékeztetők a rendszer ütemezőjével: az értesítés akkor is megjelenik, ha az Adás be van
 * zárva (vagy a készülék újraindult). Kattintásra az alkalmazás a megjelölt csatornával indul.
 */
public class ReminderReceiver extends BroadcastReceiver {
  static final String ACTION = "hu.adas.tv.REMIND";
  static final String CHANNEL = "reminders";
  static final String PREFS = "adas";

  /** Az ütemezés frissítése: a régiek törlése, az új lista beállítása (a lista a beállításokba is kerül). */
  static void schedule(Context ctx, String json) {
    SharedPreferences prefs = ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    AlarmManager am = (AlarmManager) ctx.getSystemService(Context.ALARM_SERVICE);
    int prev = prefs.getInt("scheduled", 0);
    for (int i = 0; i < prev; i++) {
      PendingIntent old = pending(ctx, i, null, PendingIntent.FLAG_NO_CREATE);
      if (old != null) {
        am.cancel(old);
        old.cancel();
      }
    }
    int count = 0;
    try {
      JSONArray list = new JSONArray(json);
      long now = System.currentTimeMillis();
      for (int i = 0; i < list.length() && count < 60; i++) {
        JSONObject r = list.getJSONObject(i);
        long at = r.getLong("at");
        if (at < now - 60000) continue;
        Intent it = new Intent(ctx, ReminderReceiver.class).setAction(ACTION)
            .putExtra("title", r.optString("title"))
            .putExtra("channel", r.optString("channel"))
            .putExtra("channelId", r.optString("channelId"))
            .putExtra("start", r.optLong("start"))
            .putExtra("n", count);
        PendingIntent pi = pending(ctx, count, it, PendingIntent.FLAG_UPDATE_CURRENT);
        boolean exact = Build.VERSION.SDK_INT < 31 || am.canScheduleExactAlarms();
        if (exact) am.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, pi);
        else am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, pi); // pontos ébresztés engedélye nélkül pár perc csúszhat
        count++;
      }
    } catch (Exception ignored) {
    }
    prefs.edit().putInt("scheduled", count).putString("reminders", json).apply();
  }

  static PendingIntent pending(Context ctx, int n, Intent it, int flags) {
    if (it == null) it = new Intent(ctx, ReminderReceiver.class).setAction(ACTION);
    return PendingIntent.getBroadcast(ctx, 7000 + n, it, flags | PendingIntent.FLAG_IMMUTABLE);
  }

  @Override
  public void onReceive(Context ctx, Intent intent) {
    String action = intent.getAction();
    if (Intent.ACTION_BOOT_COMPLETED.equals(action) || "android.intent.action.MY_PACKAGE_REPLACED".equals(action)) {
      // újraindítás / frissítés után az ütemezés elveszik: újra beállítjuk
      String json = ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString("reminders", "[]");
      schedule(ctx, json);
      return;
    }
    if (!ACTION.equals(action)) return;
    // Ha az Adás éppen előtérben van, az alkalmazáson belüli értesítés szól (ne legyen kettő).
    if (MainActivity.foreground) return;
    String title = intent.getStringExtra("title");
    String channel = intent.getStringExtra("channel");
    String channelId = intent.getStringExtra("channelId");
    long start = intent.getLongExtra("start", 0);
    long mins = Math.round((start - System.currentTimeMillis()) / 60000.0);
    String when = mins > 0 ? L.t(ctx, "{n} perc múlva kezdődik", mins) : L.t(ctx, "Elkezdődött");
    String time = new SimpleDateFormat("HH:mm", L.locale(ctx)).format(new Date(start));

    NotificationManager nm = (NotificationManager) ctx.getSystemService(Context.NOTIFICATION_SERVICE);
    if (Build.VERSION.SDK_INT >= 26 && nm.getNotificationChannel(CHANNEL) == null) {
      NotificationChannel ch = new NotificationChannel(CHANNEL, L.t(ctx, "Műsor-emlékeztetők"), NotificationManager.IMPORTANCE_HIGH);
      ch.setDescription(L.t(ctx, "Értesítés a megjelölt műsorok kezdetéről"));
      nm.createNotificationChannel(ch);
    }
    Intent open = new Intent(ctx, MainActivity.class).putExtra("channel", channelId)
        .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
    int n = intent.getIntExtra("n", 0);
    PendingIntent tap = PendingIntent.getActivity(ctx, 8000 + n, open, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    Notification.Builder b = Build.VERSION.SDK_INT >= 26 ? new Notification.Builder(ctx, CHANNEL) : new Notification.Builder(ctx);
    b.setSmallIcon(R.drawable.ic_stat_tv)
        .setContentTitle(when + ": " + title)
        .setContentText(channel + " · " + time)
        .setContentIntent(tap)
        .setAutoCancel(true)
        .setCategory(Notification.CATEGORY_REMINDER)
        .addAction(new Notification.Action.Builder(null, L.t(ctx, "Nézem"), tap).build());
    if (Build.VERSION.SDK_INT < 26) b.setPriority(Notification.PRIORITY_HIGH).setDefaults(Notification.DEFAULT_ALL);
    try {
      nm.notify(9000 + n, b.build());
    } catch (SecurityException ignored) {
      // nincs értesítési engedély
    }
  }
}
