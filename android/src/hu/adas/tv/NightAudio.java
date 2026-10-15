package hu.adas.tv;

import android.media.audiofx.DynamicsProcessing;
import android.os.Build;

/**
 * (F05) Éjszakai hang a natív lejátszóhoz: a lejátszó hangmunkamenetére tett rendszer-hangeffekt
 * (DynamicsProcessing, Android 9+) – egysávos kompresszor (a hangos részek – zene, reklám, robbanás –
 * letompítása, a halk párbeszéd felhúzása), enyhe kiemelés a beszéd sávjában, és határoló a végén, hogy a
 * felhúzott hang ne torzuljon. Kikapcsolva az effekt nem fut (a hang változatlan).
 *
 * Korlát: ha a hang kódolt formában (bitstream, pl. AC3 / DTS HDMI-n egy erősítőnek) megy ki, a rendszer
 * nem tud rajta dolgozni – ilyenkor az effekt nem hat; Android 9 alatt nem érhető el (a felület ilyenkor
 * nem mutatja a kapcsolót).
 */
final class NightAudio {
  private DynamicsProcessing dp;
  private int session = 0;
  private boolean on;

  static boolean available() {
    return Build.VERSION.SDK_INT >= 28;
  }

  /** A lejátszó (új) hangmunkamenete – az effekt rá kerül, ha be van kapcsolva. */
  void attach(int audioSessionId) {
    if (audioSessionId == session && dp != null) return;
    release();
    session = audioSessionId;
    if (on) apply();
  }

  /** → sikerült-e (Android 9 alatt, ill. ha a rendszer nem engedi, false) */
  boolean set(boolean enable) {
    on = enable;
    if (!available()) return false;
    if (!on) {
      release();
      return true;
    }
    return apply();
  }

  private boolean apply() {
    if (!available() || session == 0) return available();
    try {
      if (dp == null) {
        DynamicsProcessing.Config cfg =
            new DynamicsProcessing.Config.Builder(DynamicsProcessing.VARIANT_FAVOR_FREQUENCY_RESOLUTION, 2, false, 0, true, 1, true, 3, true).build();
        dp = new DynamicsProcessing(0, session, cfg);
        // kompresszor: a hangos részek tompítása, a halk párbeszéd felhúzása (utóerősítéssel)
        DynamicsProcessing.MbcBand b = new DynamicsProcessing.MbcBand(true, 20000f, 4f, 300f, 6f, -38f, 10f, -90f, 1f, 0f, 12f);
        // beszéd: enyhe kiemelés 1,5–4 kHz között
        DynamicsProcessing.EqBand low = new DynamicsProcessing.EqBand(true, 1500f, 0f);
        DynamicsProcessing.EqBand speech = new DynamicsProcessing.EqBand(true, 4000f, 4f);
        DynamicsProcessing.EqBand high = new DynamicsProcessing.EqBand(true, 20000f, 0f);
        // határoló: a felhúzott hang se torzuljon
        DynamicsProcessing.Limiter lim = new DynamicsProcessing.Limiter(true, true, 0, 1f, 60f, 10f, -3f, 0f);
        for (int ch = 0; ch < 2; ch++) {
          dp.setMbcBandByChannelIndex(ch, 0, b);
          dp.setPostEqBandByChannelIndex(ch, 0, low);
          dp.setPostEqBandByChannelIndex(ch, 1, speech);
          dp.setPostEqBandByChannelIndex(ch, 2, high);
          dp.setLimiterByChannelIndex(ch, lim);
        }
      }
      dp.setEnabled(true);
      return true;
    } catch (Throwable e) {
      release();
      return false;
    }
  }

  void release() {
    if (dp != null) {
      try {
        dp.setEnabled(false);
        dp.release();
      } catch (Throwable ignored) {
      }
      dp = null;
    }
  }
}
