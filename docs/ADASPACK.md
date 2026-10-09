# Adás kiegészítő csomag (`.adaspack`) – formátum és készítés

A kiegészítő csomag egy **lejátszólista egy fájlba csomagolva, névvel és leírással**. Az Adás a
**beépített listák között** mutatja (ki-be kapcsolható), de a programmal nem érkezik: csak azon az
eszközön lesz meg, ahová betöltöd. Így olyan listát is használhatsz, amely nem kerülhet a nyilvános
programba, és nem kell hozzá külön programváltozat.

Két fajtája van:

| Fajta | Fájlnév | Hol jelenik meg |
|---|---|---|
| **Tévécsatornák** | `<azonosító>_tv.adaspack` | Beállítások → Csatornalisták → Beépített listák; a csatornák a TV oldalon, a Böngészésben, a műsorújságban |
| **Filmek, sorozatok** | `<azonosító>_vod.adaspack` | Beállítások → VOD és médiatár → VOD-listák → Beépített listák; a tételek a VOD oldalon |

(A program az elírt `.adaspak` kiterjesztést is elfogadja.)

**Minden változat kezeli** (Windows / macOS / Linux, Android telefon és Android TV, böngésző, LG webOS):
fájlból (*Kiegészítő csomag betöltése*), **webcímről** (*Betöltés webcímről* – GitHub `blob` oldalcím is jó;
a tévén, ahol nincs fájlválasztó, ez az egyszerű út), vagy egy másik eszközről szinkronnal / mentésből. Az
asztali változat a *Csomagok mappája* tartalmát indításkor magától is betölti.

---

## 1. A fájl felépítése

A fájl **UTF-8 kódolású JSON-objektum** (BOM nélkül vagy BOM-mal):

```json
{
  "adasPack": 1,
  "kind": "tv",
  "id": "pelda-csatornak",
  "name": "Példa csatornák",
  "desc": "Rövid leírás: mit tartalmaz a lista (egy-két mondat).",
  "off": false,
  "text": "#EXTM3U\n#EXTINF:-1 tvg-id=\"M1.hu\" tvg-logo=\"https://…/m1.png\" group-title=\"Hírek\",M1\nhttps://…/m1/index.m3u8\n"
}
```

| Mező | Kötelező | Típus | Jelentése |
|---|---|---|---|
| `adasPack` | igen | szám | Mindig `1` (a formátum verziója). |
| `kind` | ajánlott | `"tv"` vagy `"vod"` | A csomag fajtája. Ha hiányzik, a fájlnév vége dönt (`_tv` / `_vod`), ennek híján `vod`. |
| `id` | igen | szöveg | Egyedi azonosító: angol betű, szám, `-`, `_`; legfeljebb 40 karakter. Azonos `id`-jű csomag betöltése a régit **frissíti** (a kapcsoló állása és a nézési előzmények megmaradnak). Beépített lista azonosítója (pl. `iptvorg`, `orphaned`) nem használható. |
| `name` | ajánlott | szöveg | A megjelenő név (legfeljebb 80 karakter). Hiányában az `id`. |
| `desc` | nem | szöveg | Leírás a beállításokban (legfeljebb 600 karakter). |
| `off` | nem | igaz/hamis | `true`: betöltés után kikapcsolva jelenik meg (a felhasználó kapcsolja be). Alapból `false`. |
| `text` | igen | szöveg | A teljes **M3U / M3U8 lejátszólista** szövege, egyetlen JSON-szövegként (a sortörések `\n`, az idézőjelek `\"`). Legfeljebb 60 MB. Forráscímes csomagnál (`url`) ez a tartalék: akkor látszik, ha a forrás nem érhető el. |
| `url` | nem | szöveg | **Forráscím** (http/https): a program a listát innen tölti le, és a beállított gyakorisággal **frissíti** (lásd `refresh`). Lejáró címeket tartalmazó, rendszeresen újragenerált listákhoz (pl. GitHubon óránként frissülő M3U). |
| `epg` | nem | szöveg | A lista **műsorújságának** (XMLTV, `.xml` / `.xml.gz`) címe – ha a lista fejléce nem tartalmazza (`url-tvg`). Tévés csomagnál a Beállítások → Műsorújság *lejátszólisták műsorújsága* kapcsolójával töltődik be. |
| `refresh` | nem | szám | Javasolt frissítési gyakoriság órában: `1`, `2`, `3`, `6`, `12`, `24` vagy `48`. A felhasználó a lista sorában átállíthatja; hiányában 6 óra. Csak `url`-lel van hatása. |

A program betöltéskor ellenőrzi: érvényes JSON, `adasPack: 1`, ismert `kind`, szabályos `id`, nem üres
`text`, és **legalább egy lejátszható bejegyzés** a listában. Hibás fájlnál megmondja, mi a gond.

---

## 2. A lejátszólista (`text`) – közös szabályok

```
#EXTM3U
#EXTINF:<hossz> <tulajdonság>="<érték>" …,<cím>
<cím-URL>
```

- Az első sor `#EXTM3U` (a `url-tvg="…"` vagy `x-tvg-url="…"` tulajdonságában XMLTV-műsorújság címe is megadható – tévés csomagnál a program ezt is betölti, ha a Beállítások → Műsorújság alatt engedélyezett a lejátszólisták műsorújsága).
- Minden tételhez egy `#EXTINF` sor, utána a következő nem üres, nem `#`-tal kezdődő sorban a **cím** (`http://`, `https://`, helyi gépen `file://`).
- `<hossz>`: másodpercben; élő adásnál `-1`. (Pozitív hossz = film / rész – tévés csomagban az ilyen tételek a VOD-ba kerülnek.)
- Tulajdonságok (mind elhagyható):

| Tulajdonság | Jelentése |
|---|---|
| `tvg-id` | Csatornaazonosító az [iptv-org](https://github.com/iptv-org/iptv) rendszerében (pl. `M1.hu`, `RTLKlub.hu`). Ha egyezik, a program onnan veszi a logót, országot, kategóriát, és ehhez párosítja a műsorújságot. **Tévénél erősen ajánlott.** |
| `tvg-name` | A csatorna neve (ha eltér a sor végi címtől). |
| `tvg-logo` | Logó (tévé) vagy borítókép (VOD) címe. |
| `tvg-country` | Ország kétbetűs kódja (`HU`, `RO`, `UK`…). A cím elején álló előtagot is felismeri: `HU: M1`, `[HUN] TV2`. |
| `tvg-language` | Nyelv (pl. `Hungarian`). |
| `group-title` | Csoport. Tévénél kategória (`Hírek`, `Sport`, `Gyerek`, `Film`, `Zene`…, magyarul vagy angolul); VOD-nál műfaj vagy a sorozat neve (lásd lent). Több érték `;` jellel. |
| `http-user-agent`, `http-referrer` | Ha az adás csak ezzel a fejléccel indul. (Ugyanez a Kodi-formában is jó: `https://…/a.m3u8\|User-Agent=…&Referer=…`, vagy `#EXTVLCOPT:http-user-agent=…` sorban.) |
| `adas-tags` | **VOD-műfajok** `;`-vel elválasztva (lásd 4. pont). |

- A cím szögletes zárójeles részei címkék: `[Geo-blocked]` = földrajzilag korlátozott, `[Not 24/7]` = nem folyamatos; `(1080p)` = minőség.
- Azonos csatorna több sorban (több forrással) = **tartalék források**; a program összevonja őket, ugyanígy a beépített listák azonos csatornáival.

---

## 3. Tévés csomag (`_tv.adaspack`)

Csak **élő adások** (HLS `.m3u8`, MPEG-TS, DASH `.mpd`, vagy közvetlen adásfolyam).

```
#EXTM3U url-tvg="https://example.org/epg.xml.gz"
#EXTINF:-1 tvg-id="M1.hu" tvg-logo="https://example.org/logo/m1.png" tvg-country="HU" group-title="Hírek",M1
https://example.org/live/m1/index.m3u8
#EXTINF:-1 tvg-id="Duna.hu" tvg-country="HU" group-title="Általános",Duna
https://example.org/live/duna/index.m3u8
#EXTINF:-1 tvg-country="HU" group-title="Sport" http-user-agent="Mozilla/5.0",Helyi Sport TV
https://example.org/live/sport/playlist.m3u8
```

---

## 4. VOD-csomag (`_vod.adaspack`)

Filmek és sorozatrészek, közvetlen videó- (`.mp4`, `.mkv`, `.webm`…) vagy HLS-címekkel.

**Film** – a cím végén zárójelben az évszám:
```
#EXTINF:5400 tvg-logo="https://…/poster.jpg" adas-tags="Dráma;Romantikus",Casablanca (1942)
https://…/casablanca.mp4
```

**Sorozatrész** – a címben felismerhető évad és rész. Elfogadott formák: `S01E02`, `1x02`,
`2. évad 5. rész`, `Season 2 Episode 5`, `Episode 5`, `5. rész`, `Cím - 05`. Az azonos sorozatnevű
részek egy sorozattá állnak össze; a `group-title` legyen a sorozat neve:
```
#EXTINF:1440 group-title="Példa sorozat" tvg-logo="https://…/poster.jpg" adas-tags="Vígjáték;Családi",Példa sorozat S01E01 – A kezdet
https://…/s01e01.mkv
#EXTINF:1440 group-title="Példa sorozat" adas-tags="Vígjáték;Családi",Példa sorozat S01E02 – Második rész
https://…/s01e02.mkv
```

**Műfajok (`adas-tags`)** – a program műfajnevei (az AnimeAddicts műfajlistája szerint); ezek közül
válassz, pontosan így írva (`;` elválasztóval). A VOD oldal sorai, a műfajszűrő és a gyerekprofilok
szűrése is ezekből dolgozik:

> Akció · Antológia · Autós · Bábanimáció · Cgi · Családi · Doujinshi · Dráma · Ecchi · Egyéb ·
> Életrajzi · Erotikus · Fantasy · Fekete-fehér · Flash animáció · Független · Ga-nime · Guro ·
> Gyerekeknek · Gyurma animáció · Háborús · Harcművészet · Hentai · Horror · Ifjúsági · Iskolai ·
> Játék · Josei · Kaland · Katonai · Klasszikus · Krimi · Lélektani · Mágia · Magical girl · Mecha ·
> Misztikus · Mitológiai · Musical · Művészfilm · Nem gyerekeknek · Némafilm · Oktató · Őrültség ·
> Paródia · Reklám · Romantikus · Rövid rész(ek) · Rövid történet(ek) · Rövidfilm · Sci-fi · Seinen ·
> Shoujo · Shoujo ai · Shounen · Shounen ai · Slice of life · Sport · Szamurájos · Szatíra ·
> Szupererő · Természetfeletti · Thriller · Történelmi · Tragédia · Vígjáték · Western · Yuri · Zenés ·
> **Dokumentum** · **Kultfilm**

`adas-tags` nélkül a `group-title` számít műfajnak – angol nevek is jók (`Comedy`, `Horror`,
`Science fiction`…), a program lefordítja őket. A felnőtt műfajú tételek (`Hentai`, `Erotikus`…) csak a
*Felnőtt tartalom* beállítással jelennek meg, gyerekprofilban soha. Magyar tartalomnál a
`group-title`-ben vagy a címben a „magyar” / „szinkron” / „feliratos” szó előre sorolja a tételt.

---

## 5. Betöltés, frissítés, eltávolítás

- **Fájlból:** Beállítások → Csatornalisták (tévé) vagy VOD és médiatár (VOD) → *Kiegészítő csomag
  betöltése*. Bármelyik gombbal bármelyik fajta betölthető – a csomag maga dönti el, hová kerül.
- **Mappából (asztali változat):** a *Csomagok mappája* gomb megnyitja a felhasználói adatmappa
  `packs` almappáját. Ami ide kerül, azt az Adás **indításkor magától betölti**, és ha a fájl változik,
  frissíti.
- **Másik eszközre:** a mentés és az eszközök közti átvitel a betöltött csomagokat is viszi (pl. a
  gépről a telefonra / tévére).
- **Frissítés:** ugyanazzal az `id`-vel újra betöltve felülíródik. Forráscímes csomag (`url`) a beállított
  gyakorisággal magától is frissül (a lista sorában: *Frissítés: N óránként*).
- **Eltávolítás:** a csomag sorában az *Eltávolítás* gomb (csak erről az eszközről törli; ha a
  `packs` mappában is ott van, a következő indításkor visszakerül).

---

## 6. Készítés eszközzel

Kész M3U-listából a `tools/make-pack.mjs` készít csomagot (ellenőrzi is a listát):

```
node tools/make-pack.mjs csatornak.m3u8 --kind tv --id pelda-csatornak --name "Példa csatornák" --desc "…"
node tools/make-pack.mjs filmek.m3u8 --kind vod --id pelda-filmek --name "Példa filmek" --off
```

Az eredmény a lista mellé kerül: `pelda-csatornak_tv.adaspack`, `pelda-filmek_vod.adaspack`.

**Frissülő (forráscímes) csomag** – a lista webcímét adva a csomag forráscíme is ez lesz (`url`), és a
program a megadott gyakorisággal innen frissíti; a műsorújság címe külön is megadható:

```
node tools/make-pack.mjs https://raw.githubusercontent.com/…/pluto-live-GB.m3u --kind tv --id pluto-gb --name "Pluto TV (GB)" --refresh 6 --epg https://i.mjh.nz/PlutoTV/gb.xml.gz
```

A frissítés gyakorisága a programban **minden webcímről töltött listánál** (beépített, saját, forráscímes
csomag; csatorna- és VOD-lista egyaránt) a lista sorában állítható: 1–48 óra. Lejátszás közben nem frissít.

---

## 7. Készítés mesterséges intelligenciával (AI)

Egy AI-asszisztens (pl. Claude) jól tud ilyen csomagot készíteni egy weboldal, táblázat vagy
fájllista alapján. A legbiztosabb út két lépés: **az AI M3U-listát ír**, és azt a 6. pont eszköze
csomagolja (így nem kell kézzel JSON-szöveggé alakítani a sortöréseket és idézőjeleket). Ha nincs
Node a gépen, az AI közvetlenül a JSON-t is megírhatja – ekkor a `text` mezőben minden sortörés `\n`,
minden idézőjel `\"` legyen.

**Beilleszthető utasítás az AI-nak** (a `<…>` részeket töltsd ki):

```
Készíts egy Adás kiegészítő csomagot (.adaspack) a lenti forrásból.
A formátum leírása: https://github.com/mesehordo/adas-iptv/blob/main/docs/ADASPACK.md – ezt kövesd pontosan.

- Fajta: <tv | vod>
- Azonosító (id): <pl. sajat-filmek> – csak a-z, 0-9, -, _ ; legfeljebb 40 karakter
- Név: <a beállításokban megjelenő név>
- Leírás: <egy-két mondat>
- Fájlnév: <id>_<tv|vod>.adaspack
- Forrás: <weboldal / táblázat / fájllista / M3U, amit csatolok>

Szabályok:
1. A kimenet egyetlen érvényes, UTF-8 JSON-objektum: adasPack=1, kind, id, name, desc, off=false, text.
   A "text" egy #EXTM3U-val kezdődő M3U-lista egy JSON-szövegben (sortörés: \n, idézőjel: \").
2. Minden tétel: egy #EXTINF sor, utána a következő sorban a teljes http(s) cím. Csak olyan címet
   írj, amely a forrásban ténylegesen szerepel – címet ne találj ki, ne egészíts ki.
3. Tévénél: hossz -1; tvg-id az iptv-org szerinti azonosító, ha biztosan tudod (különben hagyd el);
   tvg-logo, tvg-country (kétbetűs kód), group-title (kategória, pl. Hírek, Sport, Gyerek).
4. VOD-nál: filmnél a cím „Cím (Év)”; sorozatnál „Sorozat neve S01E02 – Rész címe”, és
   group-title = a sorozat neve; hossz másodpercben, ha ismert (különben 0);
   tvg-logo = borítókép, ha van; adas-tags = műfajok kizárólag a leírás 4. pontjában felsorolt
   nevekből, ;-vel elválasztva.
5. Ne legyen ismétlődő tétel; az ékezetes betűket hagyd meg (UTF-8).
6. Csak jogszerűen elérhető (nyilvános, ingyenes, vagy saját) tartalomra mutató címeket vegyél fel.
A végén írd ki: hány tétel van benne, és melyik tételnél hiányzott adat.
```

**Ellenőrző lista a kész fájlhoz:** érvényes JSON (pl. egy JSON-ellenőrzővel), az első sor
`#EXTM3U`, minden `#EXTINF` után van cím, a fájlnév vége `_tv.adaspack` / `_vod.adaspack`, és a
program betöltéskor nem jelez hibát. Ha a program hibát jelez, a hibaüzenetet add vissza az AI-nak.

---

## 8. Jogi megjegyzés

A csomag csak hivatkozásokat tartalmaz; a tartalomért a lista készítője és felhasználója felel.
Csak olyan tartalmat vegyél fel, amelyet jogszerűen nézhetsz.
