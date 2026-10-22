package hu.adas.tv;

import android.content.ContentResolver;
import android.content.Context;
import android.content.UriPermission;
import android.database.Cursor;
import android.net.Uri;
import android.provider.DocumentsContract;
import android.util.Base64;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.concurrent.ConcurrentHashMap;

/**
 * (F02) Helyi / USB-mappák Androidon (Storage Access Framework): a rendszer mappaválasztójával kiválasztott
 * mappa (tartós olvasási engedéllyel – újraindítás után is megmarad) lejátszólistáinak felderítése, a
 * listák és a mellettük lévő feliratok / képek olvasása. A „content://” cím nem fájlútvonal: csak a
 * felhasználó által kiválasztott (engedélyezett) mappán belüli dokumentum olvasható. Kihúzott USB-meghajtó
 * vagy visszavont engedély hibaüzenetet ad, nem összeomlást.
 */
final class Folders {
  private Folders() {}

  static final int MAX_FILES = 1000;
  static final int MAX_DEPTH = 4;

  // (X02) A dokumentumazonosító a szolgáltató saját, átlátszatlan azonosítója – nem feltétlenül útvonal. A bejáráskor
  // látott szülő–gyermek kapcsolatokat ezért megjegyezzük („szolgáltató|azonosító” → szülő azonosító / megjelenített
  // név), és a jogosultság, valamint a feliratok keresése ezt használja; ismeretlen elemnél a szolgáltatót kérdezzük.
  static final ConcurrentHashMap<String, String> parentOf = new ConcurrentHashMap<>();
  static final ConcurrentHashMap<String, String> nameOf = new ConcurrentHashMap<>();
  static final int MAX_KNOWN = 50000;

  static void remember(String authority, String parent, String id, String name) {
    if (parentOf.size() >= MAX_KNOWN) return;
    parentOf.put(authority + "|" + id, parent);
    if (name != null) nameOf.put(authority + "|" + id, name);
  }

  /** A bejáráskor látott szülőláncon át a mappa része-e (legfeljebb 64 szint). */
  static boolean knownUnder(String authority, String doc, String treeId) {
    String cur = doc;
    for (int i = 0; i < 64 && cur != null; i++) {
      if (cur.equals(treeId)) return true;
      cur = parentOf.get(authority + "|" + cur);
    }
    return false;
  }

  /** Útvonal-alapú azonosító (pl. „primary:Filmek/a.m3u”) a mappán belül van-e. */
  static boolean pathUnder(String doc, String treeId) {
    if (doc.contains("/../") || doc.endsWith("/..")) return false;
    return doc.equals(treeId) || doc.startsWith(treeId.endsWith("/") || treeId.endsWith(":") ? treeId : treeId + "/");
  }

  /** A dokumentum egy engedélyezett mappán belül van-e (a felülettől kapott cím ellenőrzése). */
  static void checkAllowed(Context ctx, Uri uri) throws Exception {
    if (!"content".equals(uri.getScheme())) throw new Exception(L.t(ctx, "A mappa nem olvasható."));
    String treeId;
    try {
      treeId = DocumentsContract.getTreeDocumentId(uri);
    } catch (Exception e) {
      throw new Exception(L.t(ctx, "A mappa nem olvasható."));
    }
    for (UriPermission p : ctx.getContentResolver().getPersistedUriPermissions()) {
      Uri t = p.getUri();
      if (!p.isReadPermission() || t.getAuthority() == null || !t.getAuthority().equals(uri.getAuthority())) continue;
      try {
        if (DocumentsContract.getTreeDocumentId(t).equals(treeId)) {
          // a dokumentum azonosítója is a mappán belül legyen (útvonal-alapú azonosítóknál)
          // (útvonal-alapú azonosító; a bejáráskor látott szülőlánc; vagy a szolgáltató szerint – API 24+)
          if (DocumentsContract.isDocumentUri(ctx, uri)) {
            String doc = DocumentsContract.getDocumentId(uri);
            boolean ok = pathUnder(doc, treeId) || knownUnder(uri.getAuthority(), doc, treeId);
            if (!ok && android.os.Build.VERSION.SDK_INT >= 24) {
              try {
                ok = DocumentsContract.isChildDocument(ctx.getContentResolver(), DocumentsContract.buildDocumentUriUsingTree(t, treeId), uri);
              } catch (Exception ignored) {
              }
            }
            if (!ok) continue;
          }
          return;
        }
      } catch (Exception ignored) {
      }
    }
    throw new Exception(L.t(ctx, "A mappához nincs (már) hozzáférés – válaszd ki újra (pl. kihúzott USB-meghajtó vagy visszavont engedély)."));
  }

  /** A kiválasztott mappa tartós engedélye. → { uri, name } */
  static JSONObject keep(Context ctx, Uri tree) throws Exception {
    ctx.getContentResolver().takePersistableUriPermission(tree, android.content.Intent.FLAG_GRANT_READ_URI_PERMISSION);
    JSONObject o = new JSONObject();
    o.put("uri", tree.toString());
    String id = DocumentsContract.getTreeDocumentId(tree);
    String name = id.contains("/") ? id.substring(id.lastIndexOf('/') + 1) : id.contains(":") ? id.substring(id.indexOf(':') + 1) : id;
    o.put("name", name.isEmpty() ? id : name);
    return o;
  }

  /** A mappa (és almappái, legfeljebb 4 szint, 1000 fájl) .m3u / .m3u8 lejátszólistái. */
  static JSONArray scan(Context ctx, String treeUri) throws Exception {
    Uri tree = Uri.parse(treeUri);
    checkAllowed(ctx, tree);
    JSONArray out = new JSONArray();
    String rootId = DocumentsContract.getTreeDocumentId(tree);
    walk(ctx, tree, rootId, "", 0, out);
    return out;
  }

  private static void walk(Context ctx, Uri tree, String docId, String rel, int depth, JSONArray out) throws Exception {
    if (depth > MAX_DEPTH || out.length() >= MAX_FILES) return;
    Uri children = DocumentsContract.buildChildDocumentsUriUsingTree(tree, docId);
    ContentResolver cr = ctx.getContentResolver();
    String[] cols = {DocumentsContract.Document.COLUMN_DOCUMENT_ID, DocumentsContract.Document.COLUMN_DISPLAY_NAME, DocumentsContract.Document.COLUMN_MIME_TYPE, DocumentsContract.Document.COLUMN_SIZE, DocumentsContract.Document.COLUMN_LAST_MODIFIED};
    List<String[]> dirs = new ArrayList<>();
    try (Cursor c = cr.query(children, cols, null, null, null)) {
      if (c == null) {
        if (depth == 0) throw new Exception(L.t(ctx, "A mappa nem olvasható."));
        return;
      }
      while (c.moveToNext() && out.length() < MAX_FILES) {
        String id = c.getString(0);
        String name = c.getString(1);
        String mime = c.getString(2);
        remember(tree.getAuthority(), docId, id, name);
        if (name == null || name.startsWith(".") || name.startsWith("@") || name.equals("#recycle")) continue;
        if (DocumentsContract.Document.MIME_TYPE_DIR.equals(mime)) dirs.add(new String[] {id, name});
        else if (name.toLowerCase(Locale.ROOT).matches(".*\\.m3u8?$")) {
          JSONObject f = new JSONObject();
          f.put("name", name);
          f.put("path", DocumentsContract.buildDocumentUriUsingTree(tree, id).toString());
          f.put("rel", rel.isEmpty() ? name : rel + "/" + name);
          f.put("size", c.isNull(3) ? 0 : c.getLong(3));
          f.put("mtime", c.isNull(4) ? 0 : c.getLong(4));
          out.put(f);
        }
      }
    }
    for (String[] d : dirs) walk(ctx, tree, d[0], rel.isEmpty() ? d[1] : rel + "/" + d[1], depth + 1, out);
  }

  /** Kis szöveges dokumentum (lejátszólista, felirat) – legfeljebb max bájt. */
  static String readText(Context ctx, String docUri, int max) throws Exception {
    Uri u = Uri.parse(docUri);
    checkAllowed(ctx, u);
    byte[] b = readBytes(ctx, u, max);
    if (b == null) throw new Exception(L.t(ctx, "A fájl túl nagy."));
    return decode(b);
  }

  static byte[] readBytes(Context ctx, Uri u, int max) throws Exception {
    try (InputStream in = ctx.getContentResolver().openInputStream(u)) {
      if (in == null) throw new Exception(L.t(ctx, "A fájl nem olvasható."));
      ByteArrayOutputStream bo = new ByteArrayOutputStream();
      byte[] buf = new byte[64 * 1024];
      for (int n; (n = in.read(buf)) > 0; ) {
        bo.write(buf, 0, n);
        if (bo.size() > max) return null;
      }
      return bo.toByteArray();
    }
  }

  /** UTF-8 (BOM nélkül); ha nem érvényes UTF-8, Windows-1250 (a régi magyar feliratok). */
  static String decode(byte[] b) {
    int off = b.length >= 3 && (b[0] & 0xff) == 0xef && (b[1] & 0xff) == 0xbb && (b[2] & 0xff) == 0xbf ? 3 : 0;
    try {
      return StandardCharsets.UTF_8.newDecoder().decode(java.nio.ByteBuffer.wrap(b, off, b.length - off)).toString();
    } catch (Exception e) {
      return new String(b, off, b.length - off, java.nio.charset.Charset.forName("windows-1250"));
    }
  }

  /** A videó melletti (azonos nevű) feliratok: [{ name, text }] – és ha kép=true, a borítókép data:-címe. */
  static Object sidecars(Context ctx, String docUri, boolean image) throws Exception {
    Uri u = Uri.parse(docUri);
    checkAllowed(ctx, u);
    String doc = DocumentsContract.getDocumentId(u);
    Uri tree = DocumentsContract.buildTreeDocumentUri(u.getAuthority(), DocumentsContract.getTreeDocumentId(u));
    // (X02) a szülő és a fájlnév: a bejáráskor látott adatból, a szolgáltatótól, végül az útvonalszerű azonosítóból
    String key = u.getAuthority() + "|" + doc;
    String parent = parentOf.get(key);
    String file = nameOf.get(key);
    if (parent == null && android.os.Build.VERSION.SDK_INT >= 26) {
      try {
        DocumentsContract.Path p = DocumentsContract.findDocumentPath(ctx.getContentResolver(), u);
        List<String> ids = p == null ? null : p.getPath();
        if (ids != null && ids.size() >= 2) parent = ids.get(ids.size() - 2);
      } catch (Exception ignored) {
      }
    }
    if (file == null) {
      try (Cursor c = ctx.getContentResolver().query(u, new String[] {DocumentsContract.Document.COLUMN_DISPLAY_NAME}, null, null, null)) {
        if (c != null && c.moveToFirst()) file = c.getString(0);
      } catch (Exception ignored) {
      }
    }
    if (parent == null || file == null) {
      int slash = doc.lastIndexOf('/');
      int colon = doc.indexOf(':');
      if (slash < 0 && colon < 0) return image ? "" : new JSONArray();
      if (parent == null) parent = slash >= 0 ? doc.substring(0, slash) : doc.substring(0, colon + 1);
      if (file == null) file = doc.substring((slash >= 0 ? slash : colon) + 1);
    }
    String base = file.contains(".") ? file.substring(0, file.lastIndexOf('.')) : file;
    Uri children = DocumentsContract.buildChildDocumentsUriUsingTree(tree, parent);
    String[] cols = {DocumentsContract.Document.COLUMN_DOCUMENT_ID, DocumentsContract.Document.COLUMN_DISPLAY_NAME};
    JSONArray subs = new JSONArray();
    String cover = "";
    try (Cursor c = ctx.getContentResolver().query(children, cols, null, null, null)) {
      if (c == null) return image ? "" : subs;
      String lowBase = base.toLowerCase(Locale.ROOT);
      while (c.moveToNext()) {
        String name = c.getString(1);
        if (name == null) continue;
        String low = name.toLowerCase(Locale.ROOT);
        Uri du = DocumentsContract.buildDocumentUriUsingTree(tree, c.getString(0));
        // (H16) csak a pontos alapnév vagy az utána ponttal kezdődő jelölők (Film.hu.srt – a „Film 2.hu.srt” egy másik
        // videóé); (H17) csak a feldolgozható formátumok: SRT és VTT (az ASS / SSA / SUB-ot a közös feldolgozó nem érti)
        boolean mine = low.startsWith(lowBase) && (low.length() == lowBase.length() + 4 || (low.length() > lowBase.length() && low.charAt(lowBase.length()) == '.'));
        if (!image && mine && low.matches(".*\\.(srt|vtt)$") && subs.length() < 12) {
          byte[] b = readBytes(ctx, du, 2 * 1024 * 1024);
          if (b == null) continue;
          JSONObject s = new JSONObject();
          s.put("name", name);
          s.put("text", decode(b));
          subs.put(s);
        } else if (image && cover.isEmpty() && (low.startsWith(lowBase + ".") || low.matches("^(poster|cover|folder)\\.(jpe?g|png|webp)$")) && low.matches(".*\\.(jpe?g|png|webp)$")) {
          byte[] b = readBytes(ctx, du, 3 * 1024 * 1024);
          if (b == null) continue;
          String mime = low.endsWith(".png") ? "image/png" : low.endsWith(".webp") ? "image/webp" : "image/jpeg";
          cover = "data:" + mime + ";base64," + Base64.encodeToString(b, Base64.NO_WRAP);
        }
      }
    }
    return image ? cover : subs;
  }
}
