package hu.adas.tv;

import android.content.Context;

import java.util.HashMap;
import java.util.Locale;
import java.util.Map;

/**
 * A keret (értesítések, háttérlejátszás, rendszerüzenetek) szövegei a felület nyelvén. A nyelvet a
 * felület adja át (AdasAndroid.setLang), és megmarad – így a bezárt alkalmazás értesítése is jó nyelvű.
 * A kulcs a magyar szöveg; {n} helyőrző.
 */
final class L {
  private L() {}

  static final String KEY = "lang";
  private static final Map<String, String[]> T = new HashMap<>();

  //            magyar (kulcs)                                    en, de, es, fr
  static {
    put("Nincs böngésző ehhez a címhez.", "No browser for this address.", "Kein Browser für diese Adresse.", "No hay navegador para esta dirección.", "Aucun navigateur pour cette adresse.");
    put("Megnyitás ezzel", "Open with", "Öffnen mit", "Abrir con", "Ouvrir avec");
    put("Nincs videólejátszó telepítve (pl. VLC).", "No video player installed (e.g. VLC).", "Kein Videoplayer installiert (z. B. VLC).", "No hay ningún reproductor de vídeo instalado (p. ej. VLC).", "Aucun lecteur vidéo installé (p. ex. VLC).");
    put("Fájl kiválasztása", "Choose a file", "Datei auswählen", "Elegir un archivo", "Choisir un fichier");
    put("Ezen az eszközön nincs fájlkezelő.", "There is no file manager on this device.", "Auf diesem Gerät gibt es keinen Dateimanager.", "Este dispositivo no tiene gestor de archivos.", "Cet appareil n’a pas de gestionnaire de fichiers.");
    put("A mentés itt nem érhető el.", "Saving is not available here.", "Speichern ist hier nicht verfügbar.", "Guardar no está disponible aquí.", "L’enregistrement n’est pas disponible ici.");
    put("Lejátszás a háttérben", "Background playback", "Wiedergabe im Hintergrund", "Reproducción en segundo plano", "Lecture en arrière-plan");
    put("Amíg az Adás a háttérben szól", "While Adás plays in the background", "Während Adás im Hintergrund läuft", "Mientras Adás suena en segundo plano", "Pendant qu’Adás joue en arrière-plan");
    put("Leállítás", "Stop", "Stoppen", "Detener", "Arrêter");
    put("{n} perc múlva kezdődik", "Starts in {n} min", "Beginnt in {n} Min.", "Empieza en {n} min", "Commence dans {n} min");
    put("Elkezdődött", "Has started", "Hat begonnen", "Ha empezado", "A commencé");
    put("Műsor-emlékeztetők", "Programme reminders", "Sendungserinnerungen", "Recordatorios de programas", "Rappels de programmes");
    put("Értesítés a megjelölt műsorok kezdetéről", "Notification when marked programmes start", "Benachrichtigung beim Start markierter Sendungen", "Aviso cuando empiezan los programas marcados", "Notification au début des programmes marqués");
    put("Nézem", "Watch", "Ansehen", "Ver", "Regarder");
  }

  private static void put(String hu, String en, String de, String es, String fr) {
    T.put(hu, new String[] {en, de, es, fr});
  }

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

  static String t(Context ctx, String hu) {
    String l = lang(ctx);
    String[] v = T.get(hu);
    if (v == null || "hu".equals(l)) return hu;
    int i = "en".equals(l) ? 0 : "de".equals(l) ? 1 : "es".equals(l) ? 2 : "fr".equals(l) ? 3 : -1;
    return i < 0 ? hu : v[i];
  }

  static String t(Context ctx, String hu, long n) {
    return t(ctx, hu).replace("{n}", String.valueOf(n));
  }
}
