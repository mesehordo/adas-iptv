# Adás – saját téma készítése (téma-fájl leírás, 1. formátum)

Ez a leírás elég ahhoz, hogy bárki – ember vagy mesterséges intelligencia – a nulláról elkészítsen egy működő
Adás-témát. A téma egyetlen **JSON-fájl** (`.adastheme` vagy `.json` kiterjesztéssel), amely a felület
**kinézetét** adja meg: színeket, betűtípusokat, hátteret és tetszőleges díszítő CSS-t.

> **Az elrendezés minden témában ugyanaz.** A téma nem változtathat méretet, térközt, pozíciót vagy
> láthatóságot – ezeket az alkalmazás betöltéskor automatikusan kiszűri (lásd: *Mit szűr ki az alkalmazás*).
> Így egy téma soha nem tudja „szétcsúsztatni” a felületet, tévén és telefonon sem.

---

## 1. Hová kerül a téma-fájl?

| Hogyan | Hol | Megjegyzés |
|---|---|---|
| **Feltöltés** | Beállítások → Megjelenés → *Saját témák* → **Téma-fájl feltöltése…** | Minden változatban (Windows, Mac, Linux, Android, Android TV). A téma a beállításokba kerül, így a mentés és az eszközök közötti szinkron is viszi. |
| **Téma-mappa** | Asztali változat: alapból az adatmappa `themes` almappája (Windows: `%APPDATA%\Adás\themes`, Linux: `~/.config/Adás/themes`, Mac: `~/Library/Application Support/Adás/themes`). Másik mappa: **Másik téma-mappa…** | A bemásolt `.adastheme` / `.json` fájlokat az Adás indításkor és a **Téma-mappa újraolvasása** gombra beolvassa. Szerkesztés közben ez a kényelmes: ments, majd *Újraolvasás*. Azonos `id` esetén a mappában lévő változat az érvényes. |

Választás: Beállítások → Megjelenés → stílusválasztó (a saját témák a lista végén), vagy a *Saját témák*
listában a **Használom** gomb. A stílus profilonként választható.

Kiinduló sablon: **Sablon mentése a mostani stílusból** – a jelenleg használt stílus színeivel kitöltött
téma-fájlt ment, ezt érdemes szerkeszteni.

---

## 2. A fájl szerkezete

```json
{
  "adasTheme": 1,
  "id": "sakura",
  "name": "Sakura",
  "description": "Cseresznyevirág: világos rózsaszín, puha árnyékok.",
  "author": "Név",
  "tone": "light",
  "base": "zen",
  "colors": {
    "bg": "#fbf4f6",
    "bg2": "#ffffff",
    "bg3": "#f1e2e7",
    "bg4": "#e8d3da",
    "line": "#e2c8d1",
    "text": "#4a3b40",
    "textStrong": "#2a1f23",
    "muted": "#8d7880",
    "accent": "#d6457a",
    "accent2": "#ef7aa4"
  },
  "fonts": {
    "body": "'Segoe UI', 'Helvetica Neue', Arial, sans-serif",
    "headings": "Georgia, 'Times New Roman', serif"
  },
  "radius": "14px",
  "background": "radial-gradient(ellipse at 80% 0%, #ffe3ec, transparent 60%), #fbf4f6",
  "preview": ["#fbf4f6", "#d6457a", "#f1e2e7"],
  "css": "& .dcard { border: 1px solid var(--line); box-shadow: 0 10px 30px rgba(214,69,122,.12); }"
}
```

### Mezők

| Mező | Kötelező | Típus | Jelentés |
|---|---|---|---|
| `adasTheme` | **igen** | szám: `1` | A formátum verziója. Mindig `1`. |
| `id` | **igen** | szöveg | Egyedi azonosító: 2–40 karakter, **kisbetű, számjegy, kötőjel** (`^[a-z0-9][a-z0-9-]{1,39}$`). Ugyanazzal az `id`-vel feltöltve a régit lecseréli. |
| `name` | **igen** | szöveg | A stílusválasztóban megjelenő név (legfeljebb 40 karakter). |
| `description` | nem | szöveg | Egy-két mondat a téma hangulatáról (300 karakterig). |
| `author` | nem | szöveg | Készítő. |
| `tone` | nem | `"dark"` / `"light"` | Sötét vagy világos téma. Alap: `"dark"`. Világosnál az alkalmazás a beépített világos-stílus finomításait is használja (menüsáv, csúszkák stb.). |
| `base` | nem | szöveg | Egy **beépített** stílus azonosítója, amelynek a díszítéseire a téma épül (lásd a 3. pontot). Üresen: semleges alap. |
| `colors` | nem | objektum | Színek (bármilyen CSS-szín: `#rrggbb`, `rgb()`, `hsl()`, `rgba()`…). Lásd lent. |
| `fonts.body` | nem | CSS `font-family` | Az alapbetűtípus. Csak a gépen telepített betűtípusok működnek – mindig adj meg tartalék betűtípusokat is. |
| `fonts.headings` | nem | CSS `font-family` | Címsorok, sorcímek, a főoldali egységek címe, a márkanév. |
| `radius` | nem | CSS hossz | Az alapértelmezett lekerekítés (`--radius`), pl. `"0"`, `"8px"`. |
| `background` | nem | CSS `background` | Az oldal háttere (szín, színátmenet, minta). Ha nincs, a `colors.bg`. |
| `preview` | nem | 3 szín tömbje | A stílusválasztó mintájának színei: háttér, kiemelés, kártya. |
| `css` | nem | szöveg | Kiegészítő díszítő CSS (200 000 karakterig) – lásd az 5. pontot. |

### Színek (`colors`) → CSS-változók

| Kulcs | Változó | Mire hat |
|---|---|---|
| `bg` | `--bg` | Oldalháttér |
| `bg2` | `--bg-2` | Kártyák, panelek, főoldali egységek háttere |
| `bg3` | `--bg-3` | Kiemelt / harmadlagos felületek (gombok, mezők) |
| `bg4` | `--bg-4` | Negyedleges felületek |
| `line` | `--line` | Vonalak, keretek |
| `text` | `--text` | Szöveg |
| `textStrong` | `--text-strong` | Hangsúlyos szöveg (címek) |
| `muted` | `--muted` | Halvány, másodlagos szöveg |
| `accent` | `--accent` | Kiemelő szín (aktív menü, gombok, csíkok, jelölők) |
| `accent2` | `--accent-2` | Második kiemelő szín |

A saját CSS-ben ezek `var(--accent)` formában használhatók; saját változót is bevezethetsz
(`& { --sakura-pink: #f6c1d3; }`).

---

## 3. A beépített stílusok azonosítói (`base`)

| `base` | Név | Jelleg |
|---|---|---|
| `netflix` | Kurenai | fekete–vörös mozi |
| `disney` | Mahō | mélykék, fénylő keretek |
| `skyshowtime` | Murasaki | lila–rózsaszín színátmenet |
| `rakuten` | Akane | fekete–vörös, nagybetűs |
| `prime` | Shinkai | éjkék |
| `apple` | Garasu | üveg, elmosás |
| `zen` | Zen | világos, rizspapír, mohazöld |
| `wabisabi` | Wabi-sabi | világos, földszínek, papírtextúra |
| `nintendo` | Asobiba | világos, buborékkártyák |
| `switch` | Futago | sötétszürke, türkiz kijelölés |
| `wii` | Hiroba | világos, fényes csempék |
| `cyberpunk` | Neon City | neon, levágott sarkok |
| `neotokyo` | Neo-Tokyo | AKIRA-hangulat: romváros, motorfény-csíkok, Kaneda-vörös |
| `manga` | Manga | fekete tus, rasztertónus, panelkeretek (világos) |
| `comic` | Pow! | amerikai képregény, Ben-Day pöttyök, vastag kontúr (világos) |
| `snes` | 16-Bit | szürke konzol, pixeles keretek |
| `bauhaus` | Kikagaku | geometria, kemény árnyék |
| `aurora` | Kyokkō | sarki fény, matt üveg |
| `sketch` | Rakugaki | füzetlap, kézírás |
| `terminal` | Phosphor | zöld monitor |

A `base` megadásával a téma átveszi az adott stílus összes díszítését (keretek, árnyékok, minták,
animációk), és a saját `colors` / `css` ezek **fölé** kerül. Így egy beépített stílus „átszínezése” is egy
rövid fájl.

---

## 4. Mit szűr ki az alkalmazás? (az elrendezés védelme)

A `css`-ben a **sima elemekre** (nem `::before` / `::after`) írt alábbi tulajdonságokat az Adás betöltéskor
**elhagyja** – nem hiba, csak nem érvényesülnek:

`width`, `height`, `min-/max-width`, `min-/max-height`, `margin*`, `padding*`, `top`, `right`, `bottom`,
`left`, `inset*`, `gap`, `row-gap`, `column-gap`, `display`, `flex*`, `grid*`, `order`, `aspect-ratio`,
`font-size`, `line-height`, `columns`, `float`, `zoom`, `white-space`, `-webkit-line-clamp`, `align-*`,
`justify-*`, `place-*`, `visibility`, `scroll-*`, `overflow*`, `box-sizing`, `contain`,
`content-visibility`, a `position` (kivéve a `relative`), valamint a `--card-w`, `--gutter`, `--rail` változók.

A `::before` / `::after` álelemeknél (díszítő minták, jelvények, csíkok) ezek **megengedettek**, így
díszítést szabadon pozicionálhatsz (`position: absolute; inset: 0; …`). Az álelemek alapból nem
kattinthatók, ha `pointer-events: none`-t adsz nekik – erősen ajánlott.

Mindig elhagyja (biztonság): `@import`, `javascript:` címek, `expression(…)`, `behavior`, `-moz-binding`.

Ami **szabadon használható**: színek, hátterek (színátmenet, `url(https://…)` vagy `url(data:…)` kép),
`border*` (keret – vastagsága a dobozon belül marad, legfeljebb pár képpontot mozdít), `border-radius`,
`box-shadow`, `text-shadow`, `outline*`, `opacity`, `filter`, `backdrop-filter`, `transform` (forgatás,
nagyítás – nem tolja el a többi elemet), `transition`, `animation`, `font-family`, `font-weight`,
`font-style`, `letter-spacing`, `text-transform`, `text-decoration*`, `clip-path`, `mix-blend-mode`,
`cursor`, `content` (álelemeknél), CSS-változók.

---

## 5. A `css` mező: díszítő CSS

- Minden szabály automatikusan a témára szűkül (`body[data-custom="<id>"] …` elé kerül). Ezért **csak a
  belső szelektort** kell írni: `.dcard { … }` → a téma kártyái.
- `&` = maga a téma gyökere (a `body`). Példák: `& { --my: red; }`, `&::before { … }` (az egész oldal
  fölötti minta), `&[data-tone="light"] .btn { … }`.
- `html` / `body` elején álló szelektor is a téma gyökerére vonatkozik.
- `@media` és `@supports` blokk használható (a benne lévő szabályok is szűkülnek).
- `@keyframes` és `@font-face` változatlanul átkerül – a nevük legyen egyedi (pl. `sakura-hull`).
- Megjegyzés (`/* … */`) bárhol lehet; a JSON-ban a sortörés `\n`, az idézőjel `\"`.

### A díszíthető elemek (stabil osztálynevek)

| Szelektor | Elem |
|---|---|
| `#nav`, `#nav.solid` | Felső menüsáv (görgetéskor `.solid`) |
| `.brand` | „ADÁS” márkanév (a profilválasztón `.brand.big`) |
| `.links a`, `.links a.active` | Menüpontok, az aktív menüpont |
| `.hero`, `.hero-slide`, `.hero-shade`, `.hero h1`, `.hero-desc` | Kiemelt sáv (TV oldal), a kép, az átmenet, a cím, a leírás |
| `.hero-dots .dot`, `.hero-dots .dot.active` | A lapozó pöttyei |
| `.btn`, `.btn.primary`, `.btn.white`, `.btn.gray`, `.btn.danger` | Gombok |
| `.row-title`, `.row-title a` | Sorcímek (TV, VOD) |
| `.card`, `.card:hover`, `.card:focus-visible`, `.thumb`, `.card .name`, `.card .meta` | Csatornakártya, a kép doboza, a név |
| `.tile` | Ország- / kategóriacsempe |
| `.vcard`, `.vposter`, `.vmeta .name` | VOD-kártya, plakát, cím |
| `.dcard`, `.dc-title`, `.dc-link`, `.dc-body` | Főoldali egység (csempe), a címe, a jobb felső hivatkozás, a tartalma |
| `.d-row`, `.d-time`, `.d-logo`, `.w-days li`, `.wchart` | A főoldali egységek sorai, időpontok, logók, heti időjárás, diagram |
| `.mini-guide .g-prog`, `.g-prog.live` | A „Most a tévében” egység műsorai |
| `.modal` | Felugró ablakok (adatlap, párbeszéd) |
| `.tab`, `.tab.active` | Fülek |
| `.switch`, `.switch:checked` | Kapcsolók |
| `.input`, `select` | Beviteli mezők |
| `.now-label`, `.live-badge`, `.bar`, `.bar i` | „MOST” / „ÉLŐ” jelvény, haladásjelző |
| `.profile .avatar` | Profilkép a profilválasztón |
| `.set-section`, `.setting` | A beállítások részei |
| `:focus-visible` | Kijelölt elem (távirányító!) – mindig legyen jól látható |

A lejátszó (`#player`) minden stílusban sötét marad; ott csak a kiemelő szín (`--accent`) érvényesül.

Állapotok: `[data-tone="light"]` (világos téma), `body.tv` (tévén fut – itt kerüld az elmosást és a
folyamatos animációt), `body.playing` (lejátszás közben).

---

## 6. Jó tanácsok

1. **Olvashatóság**: a szöveg és a háttér kontrasztja legalább 4,5 : 1 legyen (`text` a `bg`-n és a
   `bg2`-n is). A kijelölés (`:focus-visible`) tévén a legfontosabb: legyen vastag, jól látható.
2. **Betűtípus**: csak telepített betűtípus működik; mindig írj tartalékot (`'Saját', 'Segoe UI', sans-serif`).
   Saját betűtípust `@font-face`-szel `url(data:font/woff2;base64,…)` formában ágyazhatsz be (a fájlméret nő).
3. **Teljesítmény**: a `backdrop-filter: blur()` és a végtelen animáció tévén lassíthat – a `body.tv`
   szelektorral kapcsold ki: `body.tv .dcard { backdrop-filter: none; }` → a `css`-ben: `&.tv .dcard { … }`.
4. **Képek**: `url(https://…)` (az eszköznek el kell érnie) vagy kis `data:` kép. Nagy képek lassítanak.
5. **Tesztelés**: asztali gépen a téma-mappában szerkeszd, mentés után **Téma-mappa újraolvasása**. Nézd
   meg a Főoldalt, a TV, a VOD, a Műsorújság és a Beállítások oldalt, telefon- és tévéméretben is.
6. **Hibák**: a hibás fájlt a *Saját témák* lista alatt sárga üzenet jelzi (pl. „Hibás JSON …”, „Az id
   2–40 karakter lehet…”). A kiszűrt tulajdonságok nem okoznak hibaüzenetet.

---

## 7. Teljes példa (sötét, beépített stílusra épülő)

```json
{
  "adasTheme": 1,
  "id": "ejjeli-oceans",
  "name": "Yoru no Umi",
  "description": "Éjjeli óceán: mélykék, türkiz fények, hullámzó háttér.",
  "author": "Adás",
  "tone": "dark",
  "base": "prime",
  "colors": { "bg": "#061420", "bg2": "#0b2133", "bg3": "#123049", "bg4": "#1a3d5c", "line": "#1f4566",
              "text": "#d8ecf7", "textStrong": "#ffffff", "muted": "#86a9bf", "accent": "#2ee6d6", "accent2": "#5fb8ff" },
  "fonts": { "body": "'Segoe UI', Arial, sans-serif", "headings": "'Segoe UI Semibold', 'Segoe UI', Arial, sans-serif" },
  "radius": "10px",
  "background": "radial-gradient(ellipse at 20% 0%, rgba(46,230,214,.15), transparent 50%), radial-gradient(ellipse at 90% 100%, rgba(95,184,255,.12), transparent 50%), #061420",
  "preview": ["#061420", "#2ee6d6", "#123049"],
  "css": "& .dcard { background: linear-gradient(180deg, rgba(18,48,73,.9), rgba(11,33,51,.9)); border: 1px solid var(--line); border-radius: 14px; }\n& .dc-title { color: var(--accent); }\n& .thumb { box-shadow: 0 0 0 1px var(--line); }\n& .card:focus-visible .thumb, & .card:hover .thumb { box-shadow: 0 0 0 3px var(--accent), 0 0 20px rgba(46,230,214,.4); }\n&::before { content: ''; position: fixed; inset: 0; pointer-events: none; z-index: 0; background: repeating-linear-gradient(180deg, rgba(255,255,255,.015) 0 2px, transparent 2px 6px); }\n&.tv::before { display: none; }"
}
```

## 8. Mesterséges intelligenciának szóló utasítás (rövid)

> Készíts egy Adás téma-fájlt (JSON). Kötelező: `"adasTheme": 1`, `"id"` (kisbetű-szám-kötőjel, 2–40),
> `"name"`. Add meg a `tone`-t, a `colors` tíz kulcsát (bg, bg2, bg3, bg4, line, text, textStrong, muted,
> accent, accent2), a `fonts.body`/`fonts.headings`-t telepített betűtípusokkal és tartalékkal, a
> `background`-ot, a `preview` három színét, és a `css` mezőben **csak díszítést** (szín, háttér, keret,
> árnyék, lekerekítés, betűstílus, transform, animáció) a fenti szelektorokra; méretet, térközt, pozíciót,
> megjelenítést ne. Díszítő mintát `::before` / `::after` álelemmel, `pointer-events: none`-nal tegyél.
> A gyökérre `&`-tel hivatkozz. Ügyelj a kontrasztra és a jól látható `:focus-visible` kijelölésre.
> Opcionálisan `base`: egy beépített stílus azonosítója, amire épül.
