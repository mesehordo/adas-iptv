# Adás – fejlesztés, build, felépítés

[← Vissza a főoldalra](../README.md) · Funkciók és változások: [FUNKCIOK.md](FUNKCIOK.md)

## Futtatás forrásból

Szükséges: **Node.js 18+** és npm.

```bash
npm install
```

```bash
npm start
```

Ha Linuxon (pl. Ubuntu 24.04) sandbox-hibával áll le:

```bash
npm run start:nosandbox
```

## Telepítő készítése

Az adott rendszeren futtatva:

```bash
npm run dist:win
```

```bash
npm run dist:mac
```

```bash
npm run dist:linux
```

A `dist/` mappában jön létre a telepítő (Windows: NSIS telepítő és hordozható `.exe`; macOS: `.dmg` és `.zip`;
Linux: `AppImage` és `.deb`).

A lejátszási hídhoz az FFmpeg minden asztali platformra a `vendor/ffmpeg` mappába kerül (egyszer kell
letölteni; a telepítők ezt csomagolják be). Az FFmpeg GPL licencű, a licence a bináris mellett van.

```bash
npm run ffmpeg
```

### Linux- és Mac-csomag más rendszeren (pl. Windowson)

Az electron-builder Windowson nem készít működő Linux-csomagot (az AppImage-hez symlink-jog, a `.deb`-hez
Linux-eszközök kellenének), Mac-csomagot pedig csak macOS-en készít. Ezért két saját csomagoló van. Az
AppImage-hez egyszer le kell tölteni a `tar2sqfs`-t (squashfs-tools-ng) és az AppImage hivatalos futtatórészét:

```bash
npm run linux-tools
```

Utána:

```bash
npm run dist:linux:any
```

```bash
npm run dist:mac:any
```

- Linux: `dist/adas_<verzió>_amd64.deb` (telepítés: `sudo apt install ./adas_….deb`; a menüben megjelenik,
  parancs: `adas`) és `dist/Adas-<verzió>-x86_64.AppImage` (egyetlen fájl: `chmod +x`, majd dupla kattintás;
  FUSE nélküli rendszeren `./Adas-….AppImage --appimage-extract-and-run`).
- macOS: `dist/Adás-<verzió>-mac-arm64.zip` (Apple Silicon) és `…-mac-x64.zip` (Intel). Nincs Apple-tanúsítvánnyal
  aláírva, ezért kicsomagolás és az Alkalmazások mappába húzás után első indítás előtt a Terminálban:

```bash
xattr -cr /Applications/Adás.app && codesign --force --deep --sign - /Applications/Adás.app
```

## LG webOS TV (szünetel)

A webOS-változat fejlesztése és csomagolása 1.14-től szünetel (a `webos/` mappa és a `tools/build-webos.mjs`
megmaradt, de az új funkciókat ott már nem teszteljük, és a buildből kimaradt). Tévére az Android TV-s változat ajánlott.

## Android (telefon, tablet, Android TV)

Első alkalommal a natív lejátszó (ExoPlayer) könyvtárait kell letölteni (`.android-tools/deps`):

```bash
npm run android-deps
```

```
npm run android
```

Elkészíti a `dist-android/Adas-<verzió>.apk` (univerzális) csomagot: fut telefonon, tableten és
Android TV-n / Google TV-n is (Android 6.0 vagy újabb); tévén a Leanback indítóban jelenik meg,
és a távirányítós (tévés) felület indul.

Külön buildcél (a kiadás ezt a kettőt készíti, ugyanabból a commitból és verzióból):

```
npm run android:mobile   # dist-android/Adas-<verzió>-android-mobile.apk – telefon / tablet, érintéses indító
npm run android:tv       # dist-android/Adas-<verzió>-android-tv.apk – Android TV, tévés indító, távirányítós alapmód
```

A két csomag csomagazonosítója és aláírása közös, így egymásra (és a régi univerzálisra) telepítve
megmaradnak a profilok, a listák és a beállítások; a beépített frissítés a telepített célnak megfelelő
csomagot tölti le. A buildcél a natív rétegtől jut el a felülethez (`AdasAndroid.buildTarget()`).

- **Felépítés**: kis natív keret (`android/`, Java, egyetlen WebView), benne ugyanaz az egyfájlos
  felület, mint a tévés változatban. A keret minden hálózati kérést maga tölt le, CORS-fejlécet
  tesz rá, és az adások User-Agent / Referer fejlécét is beállítja – ezért ugyanazok az adások
  mennek, mint az asztali változatban. A POST-kérések (OpenSubtitles), az ellenőrzés és a fájlmentés
  a `window.AdasAndroid` hídon keresztül megy.
- **Eszközök**: a build Gradle nélkül, közvetlenül az SDK eszközeivel készül (aapt2, javac, d8,
  zipalign, apksigner). Kell hozzá JDK 17 és Android SDK (`platforms;android-34`,
  `build-tools;34.0.0`); a szkript a `.android-tools/` mappában (vagy a `JAVA_HOME` /
  `ANDROID_HOME` változókban) keresi őket.
- **Tesztek**: az Android-függőség nélküli osztályok (pl. `HttpOpen`) tesztjei az `android/test`
  mappában vannak, sima JDK-val futnak (`npm test` része, vagy külön: `node tools/test-java.mjs`;
  a JDK helye `ADAS_JDK` / `JAVA_HOME`, JDK nélkül helyben kimaradnak, a CI-ban hiba).
- **Aláírás**: az első build létrehozza az `android/keystore/adas.jks` kulcsot és a jelszavát
  (`password.txt`). **Őrizd meg**: frissítést csak ugyanazzal a kulccsal aláírt APK-val lehet a
  régi fölé telepíteni.
- **Telepítés**: telefonon nyisd meg az APK-t (engedélyezni kell az „ismeretlen forrásból”
  telepítést); Android TV-re pl. a *Send files to TV* alkalmazással vagy `adb install`-lal.
- **Távirányító**: OK = lejátszás, **hosszan nyomott OK** = csatorna-adatlap (kedvenc, emlékeztető),
  Vissza = vissza / kilépés. Színes gombok, CH+/CH−, ◀◀ / ▶▶ ugyanúgy, mint a webOS-en, ha a távirányítón van.
- **Androidon is**: kivetítés telefonról / tabletről (Chromecast, DLNA), éjszakai hang (a natív lejátszóval,
  Android 9-től), beépített frissítés (a buildcélnak megfelelő APK), helyi / USB-mappa a saját médiatárhoz.
- **Nincs benne**: a beállítások *átadása* (az átvétel megy).

## Tesztek

```bash
npm test
```

Négy lépés fut egymás után (`tools/run-tests.mjs`):

| Lépés | Mit ellenőriz |
|---|---|
| Fordításkulcsok | `tools/i18n-check.mjs`: minden `_t()` szöveg megvan magyarul és angolul |
| Főfolyamat | `test/*.test.cjs` (node:test, az Electron saját Node-jával): hálózati szabályok, DLNA-vezérlés, távirányító és beállítás-átadás (aláírás, visszajátszás, korlátozás), borítótár, felvétel valódi FFmpeggel |
| Felület | `test/renderer/*.test.js`: a valódi alkalmazásablakban, ideiglenes adatmappával (`ADAS_DATA_DIR`) és kész tesztprofillal – listafeldolgozás, műsorújság (XMLTV), felirat, beállítás-ellenőrzés, gyerektartalom, mentési pontok, rádió, súgó, valódi lejátszás (MP4 és MPEG-TS az FFmpeg-hídon át), valamint minden oldal és beállításfejezet megnyitása hiba nélkül |
| Android (JDK) | `android/test/**/*Test.java` (`tools/test-java.mjs`): az Android-függőség nélküli osztályok sima JDK-val – pl. `HttpOpen` helyi hálózati szabálya DNS-újrakötés ellen. JDK nélkül helyben kimarad, a CI-ban hiba |

Egy lépés külön: `npm test -- --only=main` (`i18n`, `main`, `renderer`, `java`). Rendszer-Node nélkül: `ELECTRON_RUN_AS_NODE=1 node_modules/electron/dist/electron tools/run-tests.mjs`. A GitHubon minden PR-nál lefut (`.github/workflows/tests.yml`, Linuxon xvfb-vel).

## Felépítés

```
main.js               Electron főfolyamat: ablak, gyorsítótárazott letöltés, adásfejlécek,
                      elérhetőség-ellenőrzés, fájlpárbeszédek, mini lejátszó
preload.js            Biztonságos híd a felület és a főfolyamat között
lan.js                Helyi hálózat: adástovábbító, Chromecast (mDNS + Cast v2), DLNA, beállítások átadása
updater.js            Frissítés-ellenőrzés, letöltés, telepítő indítása
src/index.html        Felület váza
src/style.css         Megjelenés
src/js/app.js         Indítás, útvonalak, fejléc, emlékeztetők, nyilas navigáció
src/js/views.js       Nézetek: főoldal, böngészés, kedvencek, keresés, műsorújság, beállítások, profilok
src/js/components.js  Kártya, sor, rács, adatlapok, párbeszédablakok
src/js/player.js      Lejátszó felület
src/js/engine.js      Lejátszómotor (hls.js / mpegts.js / dash.js)
src/js/catalog.js     M3U feldolgozás, iptv-org adatok összefésülése, keresés
src/js/epg.js         Műsorújság letöltése és párosítása
src/js/epg-worker.js  XMLTV feldolgozás háttérszálon
src/js/health.js      Adások ellenőrzése
src/js/store.js       Beállítások, profilok, mentés
src/js/api.js         Híd: Electron / LG webOS (Luna-szolgáltatás) / böngésző
src/js/themes.js      Felületstílusok, a főoldali sorok sorrendje
src/js/lists.js       Csatornalisták és saját csatornák kezelése
src/js/refresh.js     Csatornalista és műsorújság frissítése
src/js/vod.js         Filmek és sorozatok (listák, felismerés, nézetek)
src/js/meta.js        Magyar információk (Wikidata / Wikipédia / TMDB)
src/js/subtitles.js   Feliratok (OpenSubtitles, helyi fájl)
src/js/help.js        Súgó (megjelenítés, keresés); tartalma: help-content.js
src/js/pin.js         Szülői felügyelet, profilzár
src/js/cast.js        Kivetítés (felület)
src/js/audiofx.js     Éjszakai hang (WebAudio)
src/js/radio.js       Rádió: források (Radio Browser, Verified, IPRD, saját listák), összefésülés, kedvencek
src/js/radioplayer.js Rádió lejátszómotor: átúsztatás, hangeffektek, most szól, borító, elalvás-időzítő, vizualizáció
src/js/radiopage.js   Rádió oldal (sorok, böngészés, műfajok, országok)
src/js/radioui.js     Rádió mini-lejátszó és Most szól nézet
src/js/radiosettings.js Beállítások → Rádió
icy.js                Rádió: a most szóló szám címe (ICY-metaadat) a főfolyamatban
src/js/stats.js       Nézési statisztika
src/js/transfer.js    Beállítások átvitele másik eszközre
src/js/update.js      Frissítések (felület)
src/themes.css        A stílusok megjelenése
webos/                TV-s belépési pontok, pótlások, appinfo.json, ikonok, háttérszolgáltatás (service/)
tools/build-webos.mjs A TV-s csomag összeállítása (.ipk)
```

Az adatok (beállítások, gyorsítótár) az Electron felhasználói adatmappájában vannak
(Windows: `%APPDATA%\Adás`, Linux: `~/.config/Adás`, macOS: `~/Library/Application Support/Adás`).
