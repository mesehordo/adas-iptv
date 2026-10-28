package hu.adas.tv;

import android.net.Uri;
import androidx.media3.common.C;
import androidx.media3.common.PlaybackException;
import androidx.media3.datasource.BaseDataSource;
import androidx.media3.datasource.DataSource;
import androidx.media3.datasource.DataSpec;
import androidx.media3.datasource.HttpDataSource;
import java.io.IOException;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.util.HashMap;
import java.util.Map;

/**
 * HTTP-adatforrás a podcast-lejátszónak a HttpOpen útvonalán: minden kérés és minden átirányítás célja ugyanazon a
 * helyi hálózati szabályon megy át (blockPrivate), mint a lap kéréseié – a lejátszó a lejátszás közbeni későbbi
 * (pl. tartomány-) kéréseknél sem érhet el helyi címet. Tekeréshez Range-kérés.
 */
final class LanDataSource extends BaseDataSource {
  private final boolean block;
  private final String ua;
  private HttpURLConnection conn;
  private InputStream in;
  private Uri uri;
  private long left; // (C.LENGTH_UNSET: ismeretlen hossz)
  private boolean opened;

  LanDataSource(boolean block, String ua) {
    super(true);
    this.block = block;
    this.ua = ua;
  }

  static final class Factory implements DataSource.Factory {
    final boolean block;
    final String ua;

    Factory(boolean block, String ua) {
      this.block = block;
      this.ua = ua;
    }

    @Override
    public DataSource createDataSource() {
      return new LanDataSource(block, ua);
    }
  }

  @Override
  public long open(DataSpec spec) throws IOException {
    transferInitializing(spec);
    Map<String, String> h = new HashMap<>();
    h.put("User-Agent", ua);
    h.put("Accept-Encoding", "identity");
    if (spec.position > 0 || spec.length != C.LENGTH_UNSET) h.put("Range", "bytes=" + spec.position + "-" + (spec.length != C.LENGTH_UNSET ? (spec.position + spec.length - 1) : ""));
    try {
      conn = HttpOpen.open(spec.uri.toString(), "GET", h, null, 30000, block);
    } catch (IOException e) {
      throw new HttpDataSource.HttpDataSourceException(e, spec, PlaybackException.ERROR_CODE_IO_NETWORK_CONNECTION_FAILED, HttpDataSource.HttpDataSourceException.TYPE_OPEN);
    }
    int code = conn.getResponseCode();
    if (code < 200 || code > 299) {
      conn.disconnect();
      conn = null;
      throw new HttpDataSource.HttpDataSourceException("HTTP " + code, spec, PlaybackException.ERROR_CODE_IO_NETWORK_CONNECTION_FAILED, HttpDataSource.HttpDataSourceException.TYPE_OPEN);
    }
    uri = Uri.parse(conn.getURL().toString());
    in = conn.getInputStream();
    // (ha a szerver a tartománykérést figyelmen kívül hagyta – 200 a 206 helyett –, a kért pozícióig átugrunk)
    if (code == 200 && spec.position > 0) {
      long skip = spec.position;
      while (skip > 0) {
        long n = in.skip(skip);
        if (n <= 0) {
          if (in.read() < 0) throw new HttpDataSource.HttpDataSourceException("A fájl rövidebb", spec, PlaybackException.ERROR_CODE_IO_NETWORK_CONNECTION_FAILED, HttpDataSource.HttpDataSourceException.TYPE_OPEN);
          n = 1;
        }
        skip -= n;
      }
    }
    long len = conn.getContentLengthLong();
    if (spec.length != C.LENGTH_UNSET) left = spec.length;
    else if (len >= 0) left = code == 200 ? Math.max(0, len - spec.position) : len;
    else left = C.LENGTH_UNSET;
    opened = true;
    transferStarted(spec);
    return left;
  }

  @Override
  public int read(byte[] buf, int off, int len) throws IOException {
    if (len == 0) return 0;
    if (left == 0) return C.RESULT_END_OF_INPUT;
    int want = left == C.LENGTH_UNSET ? len : (int) Math.min(len, left);
    int n = in.read(buf, off, want);
    if (n < 0) return C.RESULT_END_OF_INPUT;
    if (left != C.LENGTH_UNSET) left -= n;
    bytesTransferred(n);
    return n;
  }

  @Override
  public Uri getUri() {
    return uri;
  }

  @Override
  public void close() throws IOException {
    try {
      if (in != null) in.close();
    } catch (IOException ignored) {
    } finally {
      in = null;
      if (conn != null) conn.disconnect();
      conn = null;
      uri = null;
      if (opened) {
        opened = false;
        transferEnded();
      }
    }
  }
}
