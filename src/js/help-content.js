// A beépített súgó tartalma. A szövegek megbízható, a programmal szállított HTML-részletek.

export const HELP_CATEGORIES = [
  { id: 'start', title: 'Első lépések' },
  { id: 'watch', title: 'Nézés és lejátszás' },
  { id: 'vod', title: 'VOD (filmek és sorozatok)' },
  { id: 'find', title: 'Keresés és böngészés' },
  { id: 'guide', title: 'Műsorújság és emlékeztetők' },
  { id: 'personal', title: 'Személyre szabás' },
  { id: 'lists', title: 'Csatornalisták' },
  { id: 'tv', title: 'Tévén és Androidon' },
  { id: 'trouble', title: 'Hibaelhárítás' },
  { id: 'about', title: 'Egyéb' },
];

const go = (href, label) => `<a class="btn small" href="${href}">${label}</a>`;
const t = (id, label) => `<a href="#/help?topic=${id}">${label}</a>`;

export const ARTICLES = [
  // ===================================================================== Első lépések
  {
    id: 'welcome',
    cat: 'start',
    title: 'Üdvözlünk az Adásban',
    keywords: 'bevezető mi ez áttekintés kezdés',
    body: `
<p class="lead">Az Adás élő tévécsatornákat játszik le a világ minden tájáról, egy streaming-szolgáltatásokhoz hasonló felületen. A csatornalistát az <b>iptv-org</b> nyilvános, közösségi gyűjteményéből tölti le – több mint tízezer ingyenesen fogható adást.</p>
<h2>A felület részei</h2>
<table class="help-table">
<tr><td><b>Főoldal</b></td><td>Áttekintő: időjárás, a kedvenc csatornák műsora, hírek, ma esti műsorok, TV- és VOD-folytatás. ${t('dashboard', 'Részletek')}</td></tr>
<tr><td><b>TV</b></td><td>Négy fül: Csatornák, Műsorújság, Böngészés és (asztali gépen) Felvételek. A Csatornák fülön a legutóbb nézettek, a kedvencek, a most futó műsorok és kategóriánkénti sorok. ${t('home', 'Részletek')}</td></tr>
<tr><td><b>Műsorújság</b> (a TV alatt)</td><td>Idővonalas rács: mi megy most és később az egyes csatornákon. ${t('guide-grid', 'Részletek')}</td></tr>
<tr><td><b>Böngészés</b> (a TV alatt)</td><td>Az összes tévécsatorna kategória, ország, nyelv és minőség szerint szűrve. ${t('browse', 'Részletek')}</td></tr>
<tr><td><b>VOD</b></td><td>Filmek és sorozatok: online listák és a saját médiatár, egységes műfajok szerint rendezett sorokkal. ${t('vod-lists', 'Részletek')}</td></tr>
<tr><td><b>Kedvencek</b></td><td>A megjelölt csatornáid – a sorrendjük adja a csatornaszámokat. ${t('favorites', 'Részletek')}</td></tr>
<tr><td><b>Keresés</b> (nagyító)</td><td>Csatornák és műsorok keresése. ${t('search', 'Részletek')}</td></tr>
<tr><td><b>Csengő</b></td><td>A beállított műsor-emlékeztetők. ${t('reminders', 'Részletek')}</td></tr>
<tr><td><b>Profilkép</b></td><td>Profilváltás, csatornalista frissítése, csatorna hozzáadása, súgó, beállítások.</td></tr>
</table>
<h2>Gyors kezdés öt lépésben</h2>
<ol>
<li>Válassz profilt (a „Ki nézi?” képernyőn), vagy hozz létre sajátot. ${t('profiles', 'Profilok')}</li>
<li>A főoldalon kattints egy csatornára – azonnal elindul. ${t('playing', 'Lejátszás')}</li>
<li>Jelöld meg a kedvenceidet a kártyán lévő <b>+</b> gombbal. ${t('favorites', 'Kedvencek')}</li>
<li>Válassz felületstílust a Beállítások → Megjelenés alatt. ${t('themes', 'Stílusok')}</li>
<li>Ha egy csatorna hiányzik, vedd fel saját csatornaként vagy saját listaként. ${t('custom-channels', 'Saját csatornák')}</li>
</ol>
<div class="tip"><b>Tipp:</b> a súgó bárhonnan megnyitható az <kbd>F1</kbd> vagy a <kbd>?</kbd> billentyűvel, illetve a fejléc kérdőjel ikonjával – mindig az éppen használt képernyőhöz tartozó témával nyílik meg.</div>`,
  },
  {
    id: 'first-steps',
    cat: 'start',
    title: 'Az első indítás',
    keywords: 'indítás betöltés lassú első alkalom profil ország',
    body: `
<p>Az első indításkor a program letölti a csatornalistát és a csatornák adatait (országok, nyelvek, logók, kategóriák – összesen kb. 25 MB). Ez a kapcsolat sebességétől függően fél perc is lehet; utána a feldolgozott lista elmentődik, így a következő indítások már néhány másodpercesek.</p>
<h2>Mi történik a háttérben?</h2>
<ol>
<li><b>Csatornalista</b>: letöltés és feldolgozás (6 óránként magától frissül).</li>
<li><b>Műsorújság</b>: a bekapcsolt források letöltése (alapból a magyar források) – ez a felület megjelenése után, a háttérben fut. ${t('epg-sources', 'Források')}</li>
<li><b>Elérhetőség-ellenőrzés</b>: az asztali és a tévés változat a megjelenő csatornák adását csendben kipróbálja. ${t('health', 'Részletek')}</li>
</ol>
<h2>Ajánlott első beállítások</h2>
<ul>
<li><b>Hazai ország</b> (Beállítások → Tartalom és gyerekek → Tartalom): ennek a csatornái kerülnek előre, ezek kapják a csatornaszámokat. Alapból Magyarország.</li>
<li><b>Felületstílus</b>: tizenhat kinézet közül választhatsz, profilonként. ${t('themes', 'Stílusok')}</li>
<li><b>Gyerekprofil</b>: ha gyerek is használja, állíts be neki külön profilt. ${t('kids', 'Részletek')}</li>
</ul>
${go('#/settings', 'Beállítások megnyitása')}`,
  },
  {
    id: 'navigation',
    cat: 'start',
    title: 'Kezelés egérrel, billentyűzettel, távirányítóval',
    keywords: 'navigáció nyilak fókusz egér billentyűzet távirányító enter vissza',
    body: `
<p>Az Adás teljesen kezelhető egérrel, billentyűzettel és tévé-távirányítóval is.</p>
<h2>Egérrel</h2>
<ul>
<li>Kártyára kattintás: lejátszás. Rámutatva (stílustól függően) megjelennek a gombok: lejátszás, kedvenc, részletek.</li>
<li>Jobb gomb a kártyán: a csatorna adatlapja.</li>
<li>A sorok végén lévő nyilakkal lapozhatsz, vagy görgethetsz vízszintesen.</li>
</ul>
<h2>Billentyűzettel / távirányítóval</h2>
<ul>
<li><kbd>←</kbd> <kbd>→</kbd> <kbd>↑</kbd> <kbd>↓</kbd>: a kijelölés (fehér keret) mozgatása a képernyőn. A program a legközelebbi elemet választja az adott irányban.</li>
<li><kbd>Enter</kbd> / OK: lejátszás vagy a kijelölt gomb megnyomása.</li>
<li><kbd>I</kbd>: a kijelölt csatorna adatlapja. <kbd>F</kbd>: kedvenc be/ki.</li>
<li><kbd>Esc</kbd> / <kbd>Backspace</kbd> / Vissza: bezárás, illetve vissza az előző képernyőre.</li>
</ul>
<p>Az összes billentyű: ${t('shortcuts', 'Billentyűparancsok')} · Tévén: ${t('tv-remote', 'A távirányító gombjai')}</p>`,
  },
  {
    id: 'shortcuts',
    cat: 'start',
    title: 'Billentyűparancsok',
    keywords: 'gyorsbillentyű billentyű kbd parancs',
    body: `
<h2>Általános</h2>
<table class="help-table keys">
<tr><td><kbd>←</kbd> <kbd>→</kbd> <kbd>↑</kbd> <kbd>↓</kbd></td><td>Mozgás a felületen</td></tr>
<tr><td><kbd>Enter</kbd></td><td>Lejátszás / kiválasztás</td></tr>
<tr><td><kbd>I</kbd></td><td>A kijelölt csatorna adatlapja</td></tr>
<tr><td><kbd>F</kbd></td><td>Kedvenc be/ki (kártyán állva)</td></tr>
<tr><td><kbd>Ctrl</kbd>+<kbd>F</kbd> vagy <kbd>/</kbd></td><td>Keresés</td></tr>
<tr><td><kbd>F1</kbd> vagy <kbd>?</kbd></td><td>Súgó az aktuális képernyőhöz</td></tr>
<tr><td><kbd>Esc</kbd> / <kbd>Backspace</kbd></td><td>Vissza, ablak bezárása</td></tr>
</table>
<h2>Lejátszás közben</h2>
<table class="help-table keys">
<tr><td><kbd>↑</kbd> / <kbd>↓</kbd>, <kbd>PageUp</kbd> / <kbd>PageDown</kbd></td><td>Előző / következő csatorna</td></tr>
<tr><td><kbd>←</kbd> / <kbd>→</kbd></td><td>Hangerő le / fel</td></tr>
<tr><td><kbd>0</kbd>–<kbd>9</kbd></td><td>Csatornaszám beírása (1,3 mp után vált)</td></tr>
<tr><td><kbd>Szóköz</kbd> / <kbd>K</kbd></td><td>Szünet / folytatás</td></tr>
<tr><td><kbd>Enter</kbd> / <kbd>L</kbd></td><td>Csatornalista-panel</td></tr>
<tr><td><kbd>M</kbd></td><td>Némítás</td></tr>
<tr><td><kbd>F</kbd></td><td>Teljes képernyő</td></tr>
<tr><td><kbd>N</kbd></td><td>Mini lejátszó (asztali változat)</td></tr>
<tr><td><kbd>S</kbd></td><td>Kedvenc be/ki</td></tr>
<tr><td><kbd>I</kbd></td><td>A csatorna adatlapja</td></tr>
<tr><td><kbd>Esc</kbd></td><td>Panel bezárása → mini módból ki → teljes képernyőből ki → lejátszó bezárása</td></tr>
</table>`,
  },

  // ===================================================================== Nézés
  {
    id: 'playing',
    cat: 'watch',
    title: 'Lejátszás indítása',
    keywords: 'nézés indítás lejátszás forrás tartalék csatlakozás',
    body: `
<p>Egy csatornát többféleképpen indíthatsz:</p>
<ul>
<li>kattints a kártyájára (vagy álls rá és nyomj <kbd>Enter</kbd>-t),</li>
<li>az adatlap <b>Lejátszás</b> gombjával vagy egy konkrét adásforrás ▶ gombjával,</li>
<li>a műsorújságban a csatorna nevére kattintva, vagy egy futó műsoron a <b>Nézem most</b> gombbal,</li>
<li>a lejátszóban a csatornalistából, a fel/le gombokkal vagy a csatornaszám beírásával.</li>
</ul>
<h2>Mi történik indításkor?</h2>
<p>Egy csatornának több <b>adásforrása</b> is lehet (különböző minőség, régió vagy szerver). A program a legjobbnak ítélt forrással kezd: előnyben részesíti a korábban működőt, a jobb minőségűt, és hátrébb sorolja a földrajzilag korlátozottat vagy nem 0–24 órásat.</p>
<p>Ha a forrás 20 másodpercen belül nem indul el, vagy lejátszás közben megakad, a program magától a következő forrással próbálkozik („Másik forrás kipróbálása 2/3…”). Ha van még kipróbálatlan forrás, egy megakadt adásnál már 10 másodperc után vált (különben 30 másodpercig vár). Ez kikapcsolható: Beállítások → Lejátszás → <i>Automatikus tartalék forrás</i>.</p>
<h2>Előző csatorna, csatornánkénti hangerő, feliratstílus</h2>
<p>Az <kbd>R</kbd> billentyű (vagy a vezérlősáv ↺ gombja, a telefonos távirányító <i>Előző</i> gombja) visszavált az előzőleg nézett csatornára. A Beállítások → Lejátszás alatt bekapcsolható a <b>Hangerő csatornánként</b>: minden csatorna megjegyzi a saját hangerejét. Ugyanitt állítható a feliratok mérete, színe (fehér, sárga, világoskék) és háttere (sötét sáv, árnyék, nincs).</p>
<p>Ha egyik forrás sem működik, megjelenik a <b>„Ez az adás most nem érhető el”</b> ablak, ahonnan újrapróbálhatod, továbbléphetsz a következő csatornára, vagy visszaléphetsz. ${t('trouble-playback', 'Mit tehetek ilyenkor?')}</p>`,
  },
  {
    id: 'player-controls',
    cat: 'watch',
    title: 'A lejátszó vezérlői',
    keywords: 'lejátszó gombok vezérlő hangerő teljes képernyő élő',
    body: `
<p>A vezérlők az egér mozgatására vagy bármely gomb megnyomására jelennek meg, és 3,5 másodperc tétlenség után eltűnnek.</p>
<h2>Felül</h2>
<ul>
<li><b>← Vissza</b>: a lejátszó bezárása.</li>
<li>A csatorna logója, <b>csatornaszáma</b>, neve, országa és – ha egy sorból indítottad – a sor neve.</li>
<li><b>ÉLŐ</b> jelzés.</li>
</ul>
<h2>Alul</h2>
<ul>
<li><b>MOST</b>: az éppen futó műsor címe, időpontja és haladásjelzője; alatta a következő műsor (ha van műsorújság).</li>
<li>▶/❚❚ <b>Szünet</b> – élő adásnál a folytatás onnan indul, ahol a puffer tart.</li>
<li>⌃ ⌄ <b>Előző / következő csatorna</b>. ${t('channel-switching', 'Hogyan dől el a sorrend?')}</li>
<li>🔊 <b>Hangerő</b> és némítás (a hangerő megmarad a következő indításra).</li>
<li>＋/✓ <b>Kedvenc</b>, ⓘ <b>Adatlap</b>.</li>
<li>☾ <b>Elalvási időzítő</b>. ${t('sleep', 'Részletek')}</li>
<li><b>CC</b> – <b>Hang és felirat</b>: hangsáv és felirat választása (<kbd>C</kbd>). ${t('audio-subs', 'Részletek')}</li>
<li>⚙ <b>Minőség és forrás</b>. ${t('quality', 'Részletek')} Itt van a <b>📊 Adás adatai</b> panel is (<kbd>D</kbd>): felbontás, bitráta, letöltési sebesség, puffer. ${t('stream-info', 'Részletek')}</li>
<li>☰ <b>Csatornalista-panel</b> a jobb oldalon, szűrővel.</li>
<li>↺30 / ↻30 <b>Vissza- és előretekerés</b> az élő adásban, <b>Ugrás élőbe</b>. ${t('timeshift', 'Részletek')}</li>
<li>▦ <b>Több adás egyszerre</b>. ${t('multiview', 'Részletek')}</li>
<li><b>Kivetítés</b> Chromecastra vagy DLNA-tévére (asztali változat). ${t('cast', 'Részletek')}</li>
<li><b>Mini lejátszó</b>, <b>Teljes képernyő</b>; a kiegészítő gombok egyenként elrejthetők. ${t('pip-mini', 'Részletek')}</li>
</ul>
<div class="tip">Dupla kattintás a képre: teljes képernyő (mini módban: vissza normál méretre). Egy kattintás a képre: szünet / folytatás.</div>`,
  },
  {
    id: 'channel-switching',
    cat: 'watch',
    title: 'Csatornaváltás és csatornaszámok',
    keywords: 'csatornaszám szám váltás fel le sorrend lineup panel',
    body: `
<h2>Fel / le váltás</h2>
<p>A <kbd>↑</kbd>/<kbd>↓</kbd> (vagy CH+/CH−) azon a listán lép tovább, ahonnan a csatornát indítottad. Ha például a „Sport” sorból indítottál, a sport csatornák között váltasz; ha a kedvencek közül, akkor a kedvenceid között. Ha keresésből vagy adatlapról indítottad, a kedvencek (vagy azok hiányában a hazai csatornák) a sorrend.</p>
<h2>Csatornaszámok</h2>
<p>A számok ugyanúgy működnek, mint a tévén: <b>a kedvenceid sorrendje adja az első számokat</b> (1, 2, 3…), utánuk jönnek a hazai ország csatornái. A sorrendet a Kedvencek oldalon húzással módosíthatod. ${go('#/favorites', 'Kedvencek')}</p>
<p>Lejátszás közben írd be a számot (<kbd>0</kbd>–<kbd>9</kbd>, legfeljebb 4 számjegy) – a jobb felső sarokban látszik, és 1,3 másodperc múlva átvált.</p>
<h2>Csatornalista-panel</h2>
<p>Lejátszás közben <kbd>Enter</kbd> vagy <kbd>L</kbd> (tévén a kék gomb) a jobb oldalon megnyitja a lista csatornáit a most futó műsorral együtt. Felül szűrhetsz név szerint.</p>`,
  },
  {
    id: 'quality',
    cat: 'watch',
    title: 'Minőség és adásforrás',
    keywords: 'minőség felbontás 1080p 720p forrás bitráta automatikus',
    body: `
<p>A lejátszó ⚙ gombja (tévén a sárga gomb) egy menüt nyit:</p>
<ul>
<li><b>Minőség</b>: <i>Automatikus</i> esetén a lejátszó a sávszélességhez és az ablak méretéhez igazítja a felbontást (kis ablakban, mini lejátszóban nem tölt Full HD-t). Kézzel rögzítheted a legjobb vagy egy alacsonyabb (pl. lassú mobilnetnél) minőséget. Sok adás csak egyetlen minőségben érhető el – ilyenkor ezt írja ki a menü.</li>
<li><b>Legnagyobb minőség</b> (Beállítások → Lejátszás): állandó plafon minden adásra – 1080p, 720p, 480p vagy 360p (adatkímélő). Lassú vagy mobil kapcsolaton kevesebb akadás, kevesebb adat. Lejátszás közben átállítva azonnal érvényes.</li>
<li><b>Forrás</b>: a csatorna összes adásforrása állapotjelző pöttyel (zöld = működött, piros = nem, szürke = nem ellenőrzött). Ha az egyik akad, próbáld a másikat.</li>
</ul>
<p>A hangsávot és a feliratot a <b>CC</b> gomb menüjében választhatod. ${t('audio-subs', 'Hang és felirat')}</p>
<div class="note">A minőségválasztás a hls.js és a dash.js lejátszóval működik. A tévék beépített lejátszója maga dönt a minőségről. ${t('engines', 'Lejátszómotorok')}</div>`,
  },
  {
    id: 'audio-subs',
    cat: 'watch',
    title: 'Hangsáv és felirat – mindenhol',
    keywords: 'hangsáv hang nyelv audio szinkron eredeti felirat cc beágyazott teletext subtitle kedvenc nyelv',
    body: `
<p>A lejátszó <b>CC</b> gombja (vagy a <kbd>C</kbd> billentyű, tévén a távirányító <i>Subtitle</i> gombja) a <b>Hang és felirat</b> menüt nyitja – <b>élő adásnál, filmeknél, sorozatoknál és a saját videóidnál is</b>.</p>
<h2>Hangsáv</h2>
<p>Ha az adás vagy a fájl több hangsávot tartalmaz (pl. magyar szinkron és eredeti nyelv, vagy narráció), itt választhatsz. A sávok nevét a program magyarul írja ki (<i>Magyar</i>, <i>Angol</i>, <i>Német</i>…). Ha csak egy sáv van, a menü ezt jelzi.</p>
<h2>Felirat</h2>
<ul>
<li><b>Beágyazott felirat</b>: amit maga az adás vagy a videófájl tartalmaz (HLS / DASH feliratsáv, MP4 / MKV feliratsáv). Élő adásoknál csak ez érhető el.</li>
<li><b>Külső felirat</b> (filmek, sorozatok, saját videók): a videó mellett lévő .srt fájl, Feliratok.eu- vagy OpenSubtitles-találat, vagy saját fájl. ${t('subtitles', 'Feliratok')}</li>
<li>Egyszerre egy felirat látszik: ha külsőt választasz, a beágyazott kikapcsol, és fordítva.</li>
<li>A <b>méret</b> mindenhol állítható; az <b>időeltolás</b> a külső feliratokra vonatkozik.</li>
</ul>
<h2>Kedvenc nyelvek profilonként</h2>
<p>Beállítások → Lejátszás → <b>Magyar információk és feliratok</b> alján megadhatod, hogy a profilod <b>melyik hangsávot</b> (az adás alapértelmezése / magyar / angol) és <b>melyik beágyazott feliratot</b> (kikapcsolva / magyar / angol) kérje. A lejátszó minden új adásnál és videónál magától ezt választja, ha elérhető.</p>
<div class="note">Az asztali változat a beépített lejátszóval (MP4, MKV) is tud hangsávot váltani. Tévén a beépített lejátszó hangsávváltása a készüléktől függ; HLS-adásoknál a hls.js lejátszó mindenhol működik.</div>
${go('#/settings?section=huinfo', 'Kedvenc nyelvek beállítása')}`,
  },
  {
    id: 'pip-mini',
    cat: 'watch',
    title: 'Mini lejátszó és a lejátszó gombjai',
    keywords: 'mini lebegő ablak mindig felül gombok vezérlősáv elrejtés cc felvétel',
    body: `
<h2>Mini lejátszó (<kbd>N</kbd>, csak az asztali változatban)</h2>
<p>Az egész Adás ablak 480×270 pontosra zsugorodik, a képernyő jobb alsó sarkába kerül, és <b>mindig felül</b> marad. Ilyenkor csak a kép és néhány alapgomb látszik. Dupla kattintás vagy <kbd>Esc</kbd>: vissza a normál méretre. Tévén nem érhető el.</p>
<h2>A lejátszó gombjai</h2>
<p>A vezérlősáv kiegészítő gombjai (felvétel, 30 mp vissza / előre, előző csatorna, kedvenc, adatlap, hang és felirat (CC), elalvási időzítő, csatornalista, több adás, kivetítés, mini lejátszó, teljes képernyő) egyenként elrejthetők: Beállítások → Lejátszás → <b>A lejátszó gombjai</b>. A billentyűk elrejtett gombnál is működnek; a szünet, a hangerő és a ⚙ menü mindig látszik.</p>`,
  },
  {
    id: 'sleep',
    cat: 'watch',
    title: 'Elalvási időzítő',
    keywords: 'időzítő alvás kikapcsol éjszaka műsor végén',
    body: `
<p>A lejátszó ☾ gombjával állíthatod be: 15, 30, 45, 60, 90, 120 perc vagy <b>„A műsor végén”</b> (ez a műsorújság alapján az éppen futó műsor végét veszi – csak akkor választható, ha a csatornához van műsoradat).</p>
<p>A hátralévő perceket a gombon lévő kis szám mutatja. Az utolsó 15 másodpercben a hang lágyan elhalkul, majd a lejátszás leáll és a lejátszó bezárul. Kikapcsolás: ugyanebben a menüben <i>Kikapcsolva</i>.</p>`,
  },
  {
    id: 'engines',
    cat: 'watch',
    title: 'Lejátszómotorok',
    keywords: 'hls.js natív beépített lejátszó mpegts dash motor formátum m3u8 ts mpd',
    body: `
<p>Az adások különböző formátumokban érkeznek, ezért a program több lejátszómotort használ:</p>
<table class="help-table">
<tr><td><b>hls.js</b></td><td>HLS adások (<code>.m3u8</code>) – az asztali változat alapértelmezése; támogatja a minőség- és hangsávválasztást.</td></tr>
<tr><td><b>Beépített lejátszó</b></td><td>A rendszer / tévé saját lejátszója. Tévén ez az alapértelmezés HLS-hez, mert ott a hls.js a CORS-korlátozás miatt sok adást nem érne el.</td></tr>
<tr><td><b>mpegts.js</b></td><td>MPEG-TS (<code>.ts</code>) és FLV adások.</td></tr>
<tr><td><b>dash.js</b></td><td>DASH (<code>.mpd</code>) adások.</td></tr>
</table>
<p>Beállítások → Lejátszás → <b>Lejátszómotor</b>: <i>Automatikus</i> (ajánlott), <i>Beépített lejátszó</i> vagy <i>hls.js</i>. Ha egy HLS adás az egyikkel nem indul, érdemes a másikat kipróbálni. Tévén a program ezt magától is megteszi: ha a beépített lejátszó nem boldogul, ugyanazt a forrást a hls.js-sel is megpróbálja.</p>`,
  },

  // ===================================================================== VOD
  {
    id: 'vod',
    cat: 'vod',
    title: 'VOD – filmek és sorozatok',
    keywords: 'film sorozat vod mozi epizód rész évad folytatás közkincs saját médiatár nas online listák csatorna szétválogatás',
    body: `
<p>Az élő tévécsatornák mellett az Adás <b>filmeket és sorozatokat</b> (VOD – video on demand) is lejátszik. Ezek nem csatornák, hanem önálló videók – bármikor elindíthatók, tekerhetők, és onnan folytathatók, ahol abbahagytad. A menüben a <b>VOD</b> a tévés részek (Főoldal, Műsorújság, Böngészés, Kedvencek) után, külön áll.</p>
<h2>Két rész: online listák és saját médiatár</h2>
<p>A VOD oldal tetején két fül van: <b>Online listák</b> (a beépített és a felvett film- / sorozatlisták) és <b>Saját médiatár</b> (a NAS / a gép mappáiban talált lejátszólisták).</p>
<h2>Csatorna vagy VOD?</h2>
<p>A csatornák között csak élő adás van, a VOD-ban csak film és sorozat. Ha egy csatornalistában (pl. IPTV-szolgáltatótól kapott listában) filmek vagy sorozatrészek is vannak – hosszjelölés (<code>#EXTINF:5400</code>), <code>/movie/</code> vagy <code>/series/</code> cím, illetve filmfájl évszámmal / részszámmal –, azok magától a VOD-ba kerülnek (a lista nevével). Fordítva: ha egy VOD-listában élő adás van (HLS / TS cím hossz nélkül, „Live / TV / Élő” csoporttal vagy tvg-id-vel), az a csatornák közé kerül. A Beállításoknál a listák mellett látszik, mennyi került át.</p>
<h2>Az Online listák oldal</h2>
<ul>
<li><b>Folytatás</b>: az elkezdett filmek és sorozatok (a haladásjelző csík mutatja, hol tartasz).</li>
<li><b>Sorozatok</b>, <b>Ajánlott filmek</b>, majd az <b>egységes műfajok</b> (a legnépszerűbb elöl; alapból a 12 legnépszerűbb kap sort, a többit a Beállítások → VOD és médiatár → VOD-listák → <i>A VOD oldal sorai</i> alatt kapcsolhatod be, a szűrőben pedig mindig választható), végül listánként egy sor. A műfajnevek az <b>AnimeAddicts műfajlistáját</b> követik (Akció, Dráma, Fantasy, Kaland, Krimi, Misztikus, Romantikus, Sci-fi, Thriller, Vígjáték…), kiegészítve a <i>Dokumentum</i> és a <i>Kultfilm</i> műfajjal. A listák saját csoportjait – magyarul vagy angolul, pl. „Horror all night”, „Comedy”, „Vígjáték” – a program ezekre fordítja le, így egy műfaj csak egyszer szerepel. A puszta jellemzők (pl. <i>Nem gyerekeknek</i>, <i>Rövid rész(ek)</i>, <i>Cgi</i>) a szűrőben választhatók, de nem kapnak külön sort. Egy cím <b>több műfajban</b> is megjelenhet: minden listájának, fájljának és csoportjának műfaját megkapja (pl. ha egy saját műfaji csomagban az <code>akció.m3u8</code>-ban és a <code>vígjáték.m3u8</code>-ban is benne van). A saját médiatárban a műfajhoz nem köthető lejátszólisták (pl. „Karácsony”) saját nevükkel külön sorként maradnak.</li>
<li>Az <b>Összes film</b>, <b>Összes sorozat</b> és <b>Keresés és szűrés</b> gombbal rácsnézetben, típus, csoport és év szerint szűrhetsz.</li>
</ul>
<p>A fejléc keresője is talál filmeket és sorozatokat (külön „VOD – filmek és sorozatok” cím alatt).</p>
<h2>Adatlap</h2>
<p>Egy borítóra kattintva megnyílik az adatlap:</p>
<ul>
<li><b>Film</b>: cím, év, hossz, csoportok, forrás; <i>Lejátszás</i> vagy <i>Folytatás xx:xx-tól</i>, <i>Előről</i>, <i>Megnézettnek jelölés</i>.</li>
<li><b>Sorozat</b>: évadok fülekkel (mindegyiken: megnézett / összes rész), a részek listája (a megnézettek halványan, az elkezdettek haladásjelzővel), összesített haladás; a fő gomb a következő megnézendő részt indítja. Az <i>Évad megnézettnek jelölése</i> gomb egyszerre jelöli (vagy törli) az évad összes részét.</li>
<li><b>+ Megnézendő</b>: a saját listádra teszi a filmet / sorozatot – a VOD oldalon a <i>Megnézendő</i> sorban látszik (a sorok között ki-be kapcsolható, áthelyezhető).</li>
<li><b>✎ Cím és borító</b>: egy ablakban a megjelenített cím (pl. ha a magyar cím nem található) és a borítókép. A borítóképek között <b>saját keresőszóval is kereshetsz</b> (pl. az eredeti vagy a japán címmel) – források kulcs nélkül: AniList, Kitsu, MyAnimeList (anime), TVmaze (sorozat), magyar és angol Wikipédia, Wikidata; saját kulccsal a TMDB és az OMDb (IMDb-adatok). Megadható saját képcím vagy képfájl is, és visszaállítható az eredeti borító. A változás a <i>Mentés</i> gombbal érvényes.</li>
</ul>
<h2>Magyar cím, borítókép</h2>
<p>A kártyákon és az adatlap tetején a film / sorozat <b>magyar címe</b> látszik, ha ismert (Wikidata, TMDB-kulccsal a TMDB) – az adatlapon alatta az eredeti / angol cím, a kártyán rámutatva. A magyar cím a kereséssel is megtalálja a tételt. Borító nélküli tételhez a program magától keres borítót; ha nem talál, a kártyán a cím látszik színes háttéren, és az adatlapon a <b>Cím és borító</b> gombbal bármikor megadható. A kézzel megadott cím és borító minden profilban érvényes.</p>
<p>A megtekintési állapot <b>profilonként</b> tárolódik. Gyerekprofilban csak a családi, gyerek- és animációs tartalmak látszanak.</p>
${go('#/vod', 'A VOD megnyitása')}`,
  },
  {
    id: 'vod-player',
    cat: 'vod',
    title: 'Filmnézés: tekerés, folytatás, következő rész',
    keywords: 'tekerés ugrás előre vissza 10 másodperc idősáv következő rész folytatás automatikus külső lejátszó vlc mpv iina ac3 dts mkv nincs hang beágyazott felirat',
    body: `
<p>Filmek és sorozatrészek lejátszásakor a lejátszó alján az élő műsor helyett egy <b>idősáv</b> látszik (eltelt / hátralévő idő). Rákattintva vagy húzva bárhová ugorhatsz.</p>
<table class="help-table keys">
<tr><td><kbd>←</kbd> / <kbd>→</kbd></td><td>10 mp vissza / előre (<kbd>Shift</kbd>-tel 60 mp)</td></tr>
<tr><td><kbd>↑</kbd> / <kbd>↓</kbd></td><td>Hangerő</td></tr>
<tr><td><kbd>0</kbd>–<kbd>9</kbd></td><td>Ugrás a videó 0–90%-ához</td></tr>
<tr><td><kbd>Szóköz</kbd> / <kbd>Enter</kbd></td><td>Szünet / folytatás</td></tr>
<tr><td><kbd>PageUp</kbd> / <kbd>PageDown</kbd> (CH+/CH−)</td><td>Előző / következő rész</td></tr>
<tr><td><kbd>I</kbd></td><td>Adatlap</td></tr>
<tr><td>⏪ ⏩ a távirányítón</td><td>30 mp vissza / előre</td></tr>
</table>
<h2>Folytatás</h2>
<p>A program 5 másodpercenként és kilépéskor menti, hol tartasz. Legközelebb a <i>Folytatás</i> gomb onnan indítja; az <i>Előről</i> gombbal az elejéről. Ha a videó 94%-át megnézted, megnézettnek számít.</p>
<h2>Következő rész</h2>
<p>Sorozatnál a rész végén megjelenik a <b>Következő rész</b> ajánló 8 másodperces visszaszámlálással – <i>Lejátszás</i> azonnal indítja, <i>Mégse</i> leállítja. Kikapcsolható: Beállítások → VOD és médiatár → VOD-listák → <i>A következő rész automatikus indítása</i>.</p>
<p>Az elalvási időzítő „A műsor végén” beállítása itt a videó végét jelenti.</p>
<h2>Hangsávok és beágyazott feliratok (lejátszási híd)</h2>
<p>A beépített lejátszó (a Chromium motorja) magában nem tudja az <b>AC3 / E-AC3 / DTS / TrueHD</b> hangot (ezeket a sávokat nem is látja), a fájlba <b>ágyazott feliratokat</b> (MKV: ASS / SRT, MP4: mov_text) egyáltalán nem jeleníti meg, és néhány régi videóformátum (XviD, WMV, 10 bites H.264) képét sem.</p>
<p>Az <b>asztali változat</b> ezért minden film / rész indulásakor egy pillanat alatt megnézi a fájl sávjait (beépített <b>FFmpeg</b>), és ha kell, a <b>lejátszási hídon</b> át játssza: a kép változatlan marad, a hangot menet közben AAC-re alakítja, a beágyazott feliratokat pedig a <b>CC</b> menübe teszi. Így minden hangsáv választható, tekerni is lehet (a híd a választott pontról indul újra), és a profil kedvenc hang- és feliratnyelve is érvényesül. Feliratnál az alapbeállítás <i>A fájl alapértelmezése</i>: a fájlban alapértelmezettnek jelölt felirat jelenik meg, jelölés nélkül pedig – ha a hang nem magyar – a magyar felirat.</p>
<p>A feliratok stílusa (ASS betűtípus, színek, elhelyezés) egyszerű szöveggé alakul. Kikapcsolás: Beállítások → Lejátszás → <i>Lejátszási híd (FFmpeg)</i>. A híd csak a lejátszott részt tölti le (kb. 90 másodpercet előre), nem az egész fájlt.</p>
<h2>Android és Android TV: natív lejátszó</h2>
<p>Androidon a filmek és sorozatrészek (MKV, MP4, AVI…) a beépített <b>natív lejátszóval</b> (ExoPlayer) szólnak: a kép a felület alatt jelenik meg, a vezérlők ugyanazok. Kezeli az <b>AC3 / E-AC3 / DTS / TrueHD</b> hangot (ha az eszköz maga nem tudja, a programmal érkező FFmpeg-dekóderrel), a fájlba ágyazott <b>ASS / SRT</b> feliratot (egyszerű szövegként), és minden hangsáv választható a <b>CC</b> menüben. Hangszórós / erősítős tévén az AC3 hang változatlanul is továbbmehet. Ha egy fájllal a natív lejátszó nem boldogul, a program magától a WebView saját lejátszójával próbálja. Kikapcsolás: Beállítások → Lejátszás → <i>Natív lejátszó (ExoPlayer)</i>.</p>
<h2>Külső lejátszóban</h2>
<p>Ha a híd / a natív lejátszó ki van kapcsolva vagy nem érhető el, a lejátszó felismeri, ha egy fájl hangja vagy képe nem szól, és felajánlja a <b>Külső lejátszó</b> gombot; az adatlapon is mindig ott van a <b>Külső lejátszóban</b> gomb.</p>
<ul>
<li><b>Windows / Mac / Linux</b>: a program egy lejátszólistát ad át a rendszernek (sorozatnál a kiválasztott résztől a többivel együtt), azt a hozzá rendelt lejátszó nyitja meg. Ajánlott: <b>VLC</b> (minden rendszeren), <b>mpv</b>, macOS-en <b>IINA</b>. Ha semmi nem nyílik meg, telepíts egyet, és társítsd az <code>.m3u</code> fájlokhoz.</li>
<li><b>Android</b>: a rendszer felkínálja a telepített videólejátszókat (VLC, MX Player, Kodi…).</li>
<li>A <b>tévén</b> (LG) nincs ilyen lehetőség; a tévé saját lejátszója gyakran kezeli az AC3 hangot.</li>
</ul>
<p>Külső lejátszóban az Adás nem tudja követni, hol tartasz – a sorozat aktuális része viszont megjegyződik.</p>`,
  },
  {
    id: 'vod-lists',
    cat: 'vod',
    title: 'Film- és sorozatlisták',
    keywords: 'film lista sorozat lista hozzáadás github tárhely m3u m3u8 zip több fájl műfaj közkincs orphaned kiegészítő csomag adaspack',
    body: `
<p>A filmek és sorozatok <b>külön listákból</b> töltődnek, mint a tévécsatornák: Beállítások → VOD és médiatár → <b>VOD-listák</b>.</p>
<h2>Beépített listák</h2>
<table class="help-table">
<tr><td><b>Orphaned Films</b></td><td>Több mint 1300 közkincs (public domain) film témák szerint csoportosítva, borítóképekkel.</td></tr>
<tr><td><b>Közkincs filmek (OnlineM3U)</b></td><td>Válogatott klasszikus filmek műfajok szerint.</td></tr>
</table>
<p>Mindkettő az archive.org-on tárolt, szerzői jogi védelem alól kikerült filmeket tartalmaz. Mindegyik ki-be kapcsolható.</p>
<h2>Kiegészítő csomagok</h2>
<p>Egy <code>.adaspack</code> fájl egy listát hoz magával névvel és leírással, és a <b>Beépített listák</b> között jelenik meg – de a programmal nem érkezik, csak azon az eszközön lesz meg, ahová betöltöd:</p>
<ul>
<li><b>Kiegészítő csomag betöltése</b> gomb (VOD-listák), vagy</li>
<li>asztali változatban a <b>Csomagok mappája</b> (a felhasználói adatmappa <code>packs</code> almappája): ami ott van, azt indításkor magától betölti, és ha a fájl változik, frissíti;</li>
<li>a <b>mentés</b> és az <b>eszközök közti átvitel</b> a csomagokat is viszi (pl. a gépről a telefonra).</li>
</ul>
<p>A filmes csomag neve <code>…_vod.adaspack</code>, a tévéscsomagé <code>…_tv.adaspack</code> (az utóbbi a Csatornalisták közé kerül). Az <b>Eltávolítás</b> csak erről az eszközről törli. ${t('adaspack', 'Formátum és készítés (AI-val is)')}</p>
<h2>Saját lista hozzáadása</h2>
<ul>
<li><b>Címről</b>: M3U / M3U8 lista címe, egyetlen videó (pl. <code>…/film.m3u8</code> vagy <code>.mp4</code>), vagy egy <b>teljes GitHub-tárhely</b> (pl. <code>https://github.com/szerző/tárhely</code>) – ilyenkor a program a tárhely összes lejátszólistáját betölti (legfeljebb 300 fájlt). Egy tárhelyen belüli mappára vagy fájlra mutató GitHub-hivatkozás is működik.</li>
<li><b>Fájlból</b> (asztali és Android-változat): egy vagy <b>több</b> <code>.m3u</code> / <code>.m3u8</code> fájl, vagy egy <b>ZIP</b>-csomag. Több fájl egy listává áll össze:
  <ul>
  <li><b>Műfaji csomag</b> – ha van benne <code>all</code> / <code>összes</code> nevű fájl, vagy ugyanazok a címek több fájlban is szerepelnek (pl. <code>all.m3u8</code> + <code>akció.m3u8</code> + <code>dráma.m3u8</code>): minden film / epizód egyszer szerepel, a fájlnevek <b>műfajok</b> lesznek (külön sorok a Filmek oldalon, és szűrhetők).</li>
  <li><b>Különálló listák</b>: összefűzve; a fájlnév segít a sorozatok felismerésében.</li>
  </ul>
  A nagy listák szövege külön, tartósan tárolódik (a gyorsítótár ürítése nem törli), a mentésbe és a <i>Szinkronizálás eszközök között</i> csomagba is bekerül.</li>
<li><b>Beillesztve</b> szövegként.</li>
</ul>
<p>Minden saját lista <b>ki-be kapcsolható</b>, átnevezhető, törölhető. Ha több lista is be van kapcsolva, a Filmek oldalon listánként is van egy sor, és a rácsnézetben listára is szűrhetsz.</p>
<p>A felnőtt műfajú tételek (pl. <i>hentai</i>, <i>erotikus</i>) csak a <i>Felnőtt tartalom</i> beállítással jelennek meg; gyerekprofilban soha.</p>
<p>A listák 6 óránként frissülnek; azonnal: <i>Listák frissítése most</i>. A lista mellett látszik, hány bejegyzést adott, illetve a hibaüzenet, ha nem tölthető le.</p>
<div class="warn">Csak olyan listát adj hozzá, amelynek tartalmát jogszerűen nézheted. Az ingyenes, nem hivatalos listák videói gyakran gyorsan elérhetetlenné válnak (pl. lejárt tárhelylinkek).</div>
${go('#/settings?section=vodlists', 'Listák kezelése')}`,
  },
  {
    id: 'own',
    cat: 'vod',
    title: 'Saját médiatár (NAS)',
    keywords: 'saját nas mappa megosztás hálózati meghajtó smb http webszerver lejátszólista m3u m3u8 automatikus',
    body: `
<p>A VOD <b>Saját médiatár</b> fülén a saját filmjeid és sorozataid jelennek meg – például a NAS egy mappájában automatikusan keletkező <code>.m3u</code> / <code>.m3u8</code> lejátszólistákból. Ugyanúgy működik, mint az online VOD-listák: borítók, adatlap, folytatás, következő rész, magyar információk és feliratok.</p>
<h2>Forrás megadása</h2>
<p>Beállítások → VOD és médiatár → <b>Saját médiatár (NAS)</b>:</p>
<table class="help-table">
<tr><td><b>Mappa kiválasztása…</b> / <b>Mappa útvonalának megadása</b><br><small>(asztali változat)</small></td><td>A NAS megosztott mappája, pl. <code>\\\\NAS\\Media\\Listak</code>, egy hálózati meghajtó (<code>Z:\\Listak</code>) vagy Linuxon / macOS-en csatolt mappa (<code>/mnt/nas/listak</code>, <code>/Volumes/Media</code>). A program az almappákat is átnézi (4 szint mélységig).</td></tr>
<tr><td><b>Hálózati cím (http)</b><br><small>(minden eszközön, tévén is)</small></td><td>Ha a NAS webszerveren is elérhetővé teszi a mappát (pl. Synology Web Station, QNAP, nginx / Apache könyvtárlista): <code>http://192.168.1.10/listak/</code>. A program a lapon talált .m3u / .m3u8 hivatkozásokat és az almappákat (2 szint) nézi át. Egyetlen lista címe is megadható.</td></tr>
</table>
<h2>Lejátszólisták ki-be kapcsolása</h2>
<ul>
<li>A forrás alatt <b>minden talált lejátszólista külön sorban</b>, saját kapcsolóval jelenik meg (a bejegyzések számával). <i>Mind be</i> / <i>Mind ki</i> gomb is van.</li>
<li>Az újonnan megjelenő listák alapból <b>bekapcsolva</b> érkeznek (kikapcsolható: <i>Új lejátszólisták automatikusan bekapcsolva</i>).</li>
<li>A forrás egésze is kikapcsolható, vagy eltávolítható (a NAS-on semmi nem törlődik).</li>
</ul>
<h2>Automatikus frissítés</h2>
<p>A program 10 percenként és a Saját oldal megnyitásakor ellenőrzi a forrásokat, így a NAS által újonnan generált vagy módosított listák maguktól megjelennek. Azonnal: <i>Újraolvasás</i> gomb a Saját oldalon vagy a beállításokban.</p>
<h2>Útvonalak a listákban</h2>
<ul>
<li>Teljes címek (<code>http://…</code>, <code>file://…</code>) változatlanul,</li>
<li>Windows- és UNC-útvonalak (<code>D:\\Filmek\\…</code>, <code>\\\\NAS\\…</code>) és Unix-útvonalak (<code>/volume1/…</code>) helyi fájlként,</li>
<li><b>relatív útvonalak</b> (<code>Filmek/Film.mkv</code>, <code>../Sorozatok/…</code>) a lejátszólista helyéhez képest.</li>
</ul>
<div class="note">Helyi / megosztott fájlt (file://) csak az asztali változat tud lejátszani; tévén a NAS-nak http-n (pl. DLNA / webszerver címmel) kell kiszolgálnia a videókat. A lejátszás a böngészőmotor formátumtámogatásától függ: az MP4 (H.264/AAC) és a HLS biztosan megy, az MKV részben, egyes kodekek (pl. DTS hang) nem.</div>
<h2>Címek és feliratok</h2>
<p>A fájlnevekből (pl. <code>Film.Cime.2019.1080p.BluRay.x264</code>) a program kiszedi a címet és az évet, így a magyar információk és az OpenSubtitles-keresés is működik. A videó mellett lévő azonos nevű feliratfájlt (<code>Film.srt</code>, <code>Film.hu.srt</code>) <b>automatikusan betölti</b> (a magyart előnyben részesítve), és a Felirat menüben „A videó mellett” cím alatt választhatod. ${t('subtitles', 'Feliratok')}</p>
${go('#/settings?section=ownlists', 'Saját médiatár beállítása')}`,
  },
  {
    id: 'subtitles',
    cat: 'vod',
    title: 'Feliratok (Feliratok.eu, OpenSubtitles – magyar és angol)',
    keywords: 'felirat subtitle feliratok.eu feliratok eu opensubtitles srt vtt magyar angol időeltolás méret api kulcs évadcsomag',
    body: `
<p>Filmekhez és sorozatokhoz <b>magyar vagy angol feliratot</b> tölthetsz be a <b>Feliratok.eu</b> (magyar feliratoldal) és az <b>OpenSubtitles</b> gyűjteményéből, vagy egy saját <code>.srt</code> / <code>.vtt</code> fájlból.</p>
<h2>Feliratok.eu – beállítás nélkül</h2><p>Alapból be van kapcsolva: nem kell fiók, kulcs, és nincs napi korlát. Sorozatoknál a rész feliratát az évadcsomagból (ZIP) is kiveszi; a régi, nem UTF-8 kódolású magyar feliratok ékezetei is helyesek. Kikapcsolható: Beállítások → Feliratok és információk → Magyar információk és feliratok.</p><h2>OpenSubtitles (nem kötelező, egyszer kell beállítani)</h2>
<ol>
<li>Regisztrálj ingyenesen az <b>opensubtitles.com</b> oldalon.</li>
<li>Bejelentkezve a profilodban keresd meg az <b>API consumers</b> részt, és hozz létre egy új kulcsot (bármilyen név jó, pl. „Adás”).</li>
<li>Az Adásban: Beállítások → Lejátszás → <b>Magyar információk és feliratok</b> → add meg az <b>API-kulcsot</b>, a <b>felhasználóneved</b> és a <b>jelszavad</b>, majd nyomd meg a <i>Bejelentkezés kipróbálása</i> gombot.</li>
</ol>
<p>A kereséshez elég az API-kulcs, a <b>letöltéshez bejelentkezés</b> is kell. Ingyenes fiókkal naponta korlátozott számú felirat tölthető le (a program minden letöltés után kiírja, mennyi maradt); egyszer letöltött feliratot a program megjegyez, az újra nem fogyaszt keretet.</p>
<h2>Használat lejátszás közben</h2>
<ul>
<li>A lejátszó <b>CC</b> gombja vagy a <kbd>C</kbd> billentyű nyitja a <b>Hang és felirat</b> menüt (hangsáv, beágyazott és külső felirat). ${t('audio-subs', 'Részletek')}</li>
<li><i>Magyar felirat keresése</i> / <i>Angol felirat keresése</i>: minden bekapcsolt forrásból – elöl a Feliratok.eu találatai (az évben és címben egyezők legelöl), utána az OpenSubtitles-é a letöltések száma szerint, a gépi fordításúak hátul; minden találatnál látszik a forrás. Kattints a kívántra – letöltődik és azonnal megjelenik.</li>

<li><b>Időeltolás</b>: ha a felirat elcsúszik, ±0,5 másodpercenként igazíthatod.</li>
<li><b>Méret</b>: kicsi, közepes, nagy, óriás.</li>
<li><i>Felirat betöltése fájlból</i> (asztali változat): saját .srt vagy .vtt fájl.</li>
<li><i>Kikapcsolva</i>: a felirat elrejtése.</li>
</ul>
<p>A kiválasztott felirat <b>az adott filmhez / részhez megmarad</b>, legközelebb magától betöltődik. A <i>Felirat automatikus keresése</i> beállítással minden film / rész indításakor a legjobb (magyar vagy angol) felirat automatikusan betöltődik.</p>
<div class="note">Az OpenSubtitles adatai (kulcs, felhasználónév, jelszó) csak ezen az eszközön tárolódnak, és kizárólag az opensubtitles.com felé kerülnek elküldésre. A felirat találata a film címén és évén alapul; régi vagy ritka filmekhez lehet, hogy nincs magyar felirat.</div>
${go('#/settings?section=huinfo', 'Felirat-beállítások')}`,
  },
  {
    id: 'hu-info',
    cat: 'vod',
    title: 'Magyar információk filmekről és csatornákról',
    keywords: 'magyar információ leírás angol cím borító borítókép plakát poster kép wikipédia wikidata tmdb anilist tvmaze anime műfaj szereplők rendező értékelés',
    body: `
<p>A program a filmekhez, sorozatokhoz és tévécsatornákhoz <b>magyar nyelvű információkat</b> keres, és megjeleníti az adatlapon.</p>
<h2>VOD (filmek és sorozatok)</h2>
<ul>
<li><b>Magyar cím</b> (ha eltér az eredetitől, a cím alatt dőlt betűvel is látszik),</li>
<li><b>leírás</b> magyarul, ha van (magyar Wikipédia, TMDB); ha nincs, <b>angolul</b> – ezt a program jelzi,</li>
<li><b>borítókép</b>: a lista saját képe, ennek híján a forrásokból (a Wikipédia-szócikk plakátja, AniList, TVmaze, TMDB); a <b>saját médiatárban</b> a videó melletti kép (<code>Film.jpg</code>, <code>poster.jpg</code>, <code>folder.jpg</code>, <code>cover.jpg</code>) vagy a fájlba ágyazott borító (MKV-melléklet, MP4) – ez utóbbi az asztali változatban,</li>
<li><b>műfaj, rendező, stúdió, szereplők, ország, év</b>, értékelés (AniList, TVmaze, TMDB).</li>
</ul>
<h2>Tévécsatornák</h2>
<p>A csatorna adatlapján <b>„A csatornáról”</b> rész: magyar (vagy angol) Wikipédia-összefoglaló, tulajdonos, indulás éve – a Wikidatából, ennek híján a magyar, majd az angol Wikipédia keresőjéből. A program csak akkor mutat leírást, ha a csatorna neve (és a Wikidatánál az országa) egyezik, így téves leírás nem jelenik meg.</p>
<h2>Források</h2>
<table class="help-table">
<tr><td><b>Wikidata + Wikipédia</b></td><td>Alapértelmezés, ingyenes, kulcs nélkül; magyar, illetve angol szócikk.</td></tr>
<tr><td><b>AniList</b></td><td>Animékhez (a program a lista, a tárhely vagy a műfajok alapján ismeri fel őket): borító, angol leírás, műfajok, pontszám, stúdió. Kulcs nélkül.</td></tr>
<tr><td><b>TVmaze</b></td><td>Sorozatokhoz: kép, angol összefoglaló, műfaj, értékelés. Kulcs nélkül.</td></tr>
<tr><td><b>TMDB</b> (The Movie Database)</td><td>Ha megadod a saját ingyenes API-kulcsodat (themoviedb.org → Beállítások → API), a filmek és sorozatok adatai innen is jönnek: gazdagabb magyar leírások és értékelések.</td></tr>
</table>
<p>Ha egy szolgáltató lassításra kér (túl sok kérés), a program egy ideig nem kérdezi, és később folytatja. Az <b>AnimeAddicts</b> ismertetői csak bejelentkezve érhetők el, ezért azokat a program nem olvassa be.</p>
<p>Az adatok a gyorsítótárba kerülnek (30 napig), így másodszorra azonnal megjelennek. Kikapcsolás: Beállítások → Feliratok és információk → Magyar információk és feliratok → <i>Magyar információk letöltése</i>.</p>
${go('#/settings?section=huinfo', 'Beállítások')}`,
  },
  {
    id: 'vod-detect',
    cat: 'vod',
    title: 'Hogyan ismeri fel, mi film és mi sorozat?',
    keywords: 'felismerés film sorozat epizód S01E02 évad rész név formátum',
    body: `
<p>Az M3U listák nem jelölik külön, mi film és mi sorozat, ezért a program a <b>címből</b> dönt. Ha a címben epizódjelölés van, <b>sorozatepizódnak</b> veszi, különben <b>filmnek</b>.</p>
<h2>Felismert epizódjelölések</h2>
<table class="help-table">
<tr><td><code>S01E02</code>, <code>S1 E2</code>, <code>S04.E23</code></td><td>évad + rész</td></tr>
<tr><td><code>1x02</code></td><td>évad + rész</td></tr>
<tr><td><code>Season 2 Episode 5</code>, <code>Staffel 2 Folge 5</code>, <code>Saison 2 Épisode 5</code></td><td>évad + rész</td></tr>
<tr><td><code>2. évad 5. rész</code></td><td>évad + rész</td></tr>
<tr><td><code>Episode 5</code>, <code>Ep. 5</code>, <code>Folge 5</code>, <code>Part 5</code>, <code>5. rész</code></td><td>rész (1. évad)</td></tr>
<tr><td><code>第5集</code>, <code>第5話</code></td><td>rész (kínai / japán)</td></tr>
</table>
<h2>A sorozat neve</h2>
<p>A jelölés <b>előtti</b> szöveg a sorozat neve (pl. „The Goldbergs S04 E23” → <i>The Goldbergs</i>, 4. évad 23. rész), az utána következő az epizód címe. Ha a jelölés előtt nincs szöveg, a <code>group-title</code> mező, végül a lejátszólista fájlneve adja a sorozat nevét. Az azonos nevű epizódok egy sorozatba, évadok és részek szerint rendeződnek.</p>
<h2>Filmek</h2>
<p>A cím végén zárójelben álló évszámot (pl. „Night of the Living Dead (1968)”) a program a film évének veszi. A <code>group-title</code> mezőből lesz a csoport / műfaj, a <code>tvg-logo</code>-ból a borítókép, az <code>#EXTINF</code> utáni számból a hossz. Az azonos című és évű filmek több listából egy filmmé olvadnak, változatai tartalék forrásként szolgálnak.</p>
<div class="tip">Saját lista készítésekor így nevezd el a bejegyzéseket: <code>#EXTINF:-1 tvg-logo="borító.jpg" group-title="Vígjáték",Film címe (1999)</code>, illetve sorozatnál <code>…,Sorozat címe S01E01 Az első rész címe</code>.</div>`,
  },

  // ===================================================================== Keresés és böngészés
  {
    id: 'dashboard',
    cat: 'find',
    title: 'A főoldal',
    keywords: 'főoldal irányítópult időjárás hírek rss műsorújság kedvencek ma este folytatás település testreszabás elrendezés egység csempe méret',
    body: `
<p>A főoldal egységekből (kártyákból) álló áttekintő, amely asztali gépen és tévén mindig <b>egy képernyőre fér</b>. Telefonon (és álló helyzetű Androidon) az egységek egymás alatt vannak, ott görgethető.</p>
<h2>Testreszabás</h2>
<p>A főoldal jobb felső <b>Testreszabás</b> gombjával (vagy Beállítások → Főoldal → <i>Főoldal testreszabása</i>):</p>
<ul>
<li>a rács <b>oszlopainak</b> (1–5) és <b>sorainak</b> (1–4) száma,</li>
<li>egységenként: <b>sorrend</b> (‹ ›, egérrel áthúzással is), <b>szélesség</b> (↔) és <b>magasság</b> (↕) cellában, <b>elrejtés</b> (×),</li>
<li>a rejtett egységek visszavétele (<b>Hozzáadás</b>), és az <b>Alapértelmezett</b> elrendezés.</li>
</ul>
<p>Az egységek mindig az első szabad helyre kerülnek. Ha egy változtatás után valami nem férne el, a program nem engedi – előbb kisebbíts vagy rejts el egy másik egységet, vagy növeld a rácsot. Az elrendezés profilonként külön tárolódik. Távirányítóval a gombok a nyilakkal érhetők el.</p>
<div class="tip"><b>A méret számít:</b> minden egység a saját méretéhez igazítja, mit és mennyit mutat – például a hírek és a műsorok száma, a hírek képe és bevezetője, a heti előrejelzés napjainak száma, az órás bontás sűrűsége, a VOD-plakátok mérete és száma vagy a műsorújság időablaka.</div>
<h2>Az egységek</h2>
<table class="help-table">
<tr><td><b>Időjárás</b></td><td>Felül a mai idő a település nevével, alatta a mai nap órás bontásban (keskeny kártyán két-három óránként), alul a heti előrejelzés. Kis kártyán a heti rész, még kisebben a diagram is elmarad. A mai rész megjelenése választható: vonaldiagram, terület + csapadék, oszlopok, csempék vagy csak egy érték. A település és a megjelenés: Beállítások → <b>Főoldal</b>. Forrás: Open-Meteo.</td></tr>
<tr><td><b>Most a tévében</b></td><td>A kedvenc csatornáid műsora a Műsorújság idővonalas rácsához hasonlóan (a szélességtől függően 1–5 órás időablak). Ami nem fér ki, arra a „+N további” sor utal.</td></tr>
<tr><td><b>Hírek</b></td><td>A bekapcsolt RSS / Atom forrásokból a legfrissebb hírek – annyi, amennyi kifér (széles kártyán bevezetővel). Kattintásra a hír összefoglalója nyílik meg. Források: Beállítások → <b>Főoldal</b> → <i>Hírforrások</i>. Alapból: Telex, HVG, 444. Gyerekprofilban nem érhető el.</td></tr>
<tr><td><b>Ma este a tévében</b></td><td>A kedvenc csatornáid esti (19 óra utáni) műsoraiból csatornánként egy. A csengő gombbal emlékeztetőt kérhetsz.</td></tr>
<tr><td><b>Utoljára nézett csatorna</b></td><td>Az utoljára nézett csatorna a most futó és a következő műsorral (nagyobb kártyán a műsor leírásával), egy gombnyomással folytatható.</td></tr>
<tr><td><b>VOD – folytatás</b></td><td>Az utoljára nézett 5 film / sorozatrész plakáttal és haladással (kis kártyán listában) – onnan folytatódik, ahol abbahagytad.</td></tr>
<tr><td><b>Kedvenc csatornák</b> (alapból rejtett)</td><td>A kedvenc csatornák logói rácsban, egy kattintással indíthatók; nagyobb csempén a most futó műsorral.</td></tr>
<tr><td><b>Emlékeztetők</b> (alapból rejtett)</td><td>A beállított, még előttünk álló műsor-emlékeztetők; a már futó műsor „MOST” jelzést kap, és kattintásra indul.</td></tr>
<tr><td><b>Óra és névnap</b></td><td>Nagy óra a dátummal, a mai (nagyobb kártyán a holnapi) névnappal.</td></tr>
<tr><td><b>Árfolyamok</b></td><td>Euró, dollár, svájci frank, font, lej, cseh korona, zloty forintban, az előző naphoz képesti változással (EKB referencia-árfolyam, munkanaponként frissül).</td></tr>
<tr><td><b>Sport</b></td><td>Élő, friss és következő események a Sportfigyelőben követett bajnokságokból, csapatokból, sportágakból és naptárakból – bármilyen sportág (tenisz, kézilabda, disc golf, World Chase Tag…). Ahol lehet, egy <b>📺</b> gomb ajánlja a csatornát, ahol nézhető. ${t('sportwatch', 'Sportfigyelő')}</td></tr>
<tr><td><b>Ajánlott neked</b></td><td>Most futó műsorok olyan csatornákon, amelyek a legtöbbet nézett kategóriáidba esnek, de még nem kedvenceid.</td></tr>
<tr><td><b>Megnézendő</b></td><td>A saját Megnézendő listád plakátjai (VOD-adatlap → <i>+ Megnézendő</i>).</td></tr>
<tr><td><b>Új részek</b></td><td>Az általad nézett sorozatok, amelyekben az utoljára nézett rész után van még megnézetlen rész („3 új rész”).</td></tr>
<tr><td><b>Hamarosan kezdődik</b></td><td>A következő bő órában kezdődő műsorok a kedvenc (és a nagyobb hazai) csatornákon, „x perc múlva” jelzéssel és emlékeztető-csengővel.</td></tr>
<tr><td><b>Ma esti filmek</b></td><td>Ma este (18 órától) kezdődő filmek a kedvenc és a hazai csatornákon, a műsorújság kategóriája alapján.</td></tr>
<tr><td><b>Nézési idő</b></td><td>A mai és a heti nézési idő, a hét napjai oszlopokon; gyerekprofilnál a mára még hátralévő idő.</td></tr>
<tr><td><b>Fedezd fel</b></td><td>Egy véletlenszerűen választott, épp műsoron lévő (nem kedvenc) csatorna – <i>Másikat</i> gombbal újat kérhetsz.</td></tr>
<tr><td><b>Nap és levegő</b></td><td>Napkelte, napnyugta, a nappal hossza, UV-index és légminőség az időjárás településén (Open-Meteo).</td></tr>
<tr><td><b>Jegyzet</b></td><td>Saját jegyzet (profilonként), magától mentődik.</td></tr>
</table>
<p>Ezek az egységek alapból nincsenek a főoldalon: Testreszabás → <b>Hozzáadás</b>.</p>
<h2>Kész elrendezések, napszak szerint</h2>
<p>A Testreszabás eszköztárán a <b>Kész elrendezés</b> gombokkal egy kattintással betölthető: Alap, Reggeli (időjárás, hírek, óra, árfolyam), Esti tévézés (műsor, ma este, folytatás), Sport, Hírek és tőzsde, Egyszerű. A <b>Napszak szerint váltson</b> kapcsolóval reggel 5–10 óra között a Reggeli, 18 órától az Esti tévézés elrendezés jelenik meg, napközben a saját.</p>
<p>Az <b>Utoljára nézett csatorna</b> kártyáján néhány másodperc után a csatorna némított élő képe indul (asztali gépen és Androidon, ha az Előnézet be van kapcsolva).</p>
<p>A csatornák sorai a <b>TV</b> oldalra kerültek (a menüben a Főoldal után). ${t('home', 'A TV oldal')}</p>
${go('#/settings?section=dashboard', 'A főoldal beállításai')}`,
  },
  {
    id: 'home',
    cat: 'find',
    title: 'A TV oldal (csatornák)',
    keywords: 'tv oldal csatornák felvételek fül sorok',
    body: `
<h2>Fülek</h2>
<p>A <b>TV</b> oldal (a menüben a Főoldal után) a csatornáké. A tetején négy fül van: <b>Csatornák</b>, <b>Műsorújság</b>, <b>Böngészés</b> (csak élő tévéadások, szűrőkkel) és – az asztali változatban – <b>Felvételek</b> (a saját tévéfelvételeid). ${t('recording', 'A felvételekről')}</p>
<h2>Sorok</h2>
<p>A Csatornák fülön vízszintesen görgethető sorok: Legutóbb nézett, Kedvenceid, Most a TV-ben, a hazai ország csatornái, saját listáid, a kategóriák (Hírek, Sport, Filmek…) és az országok csempéi. A sorok <b>sorrendje és láthatósága profilonként beállítható</b>. ${t('home-rows', 'Hogyan?')}</p>
<h2>A sor összes eleme egy oldalon</h2>
<p>Minden sor címe mellett egy <b>kerek nyíl ›</b> látható: rákattintva (érintve) a sor <b>összes</b> eleme egy oldalon nyílik meg. Távirányítóval vagy billentyűzettel a sor végére lépve ugyanezt egy <b>„Összes”</b> csempe teszi meg (OK / Enter). A VOD sorainál, a <i>Folytatás</i> sornál és az országok csempéinél is így működik.</p>
<h2>Magyar elöl</h2>
<p>Minden listában és kategóriában elöl állnak a <b>magyarországi</b>, utánuk a <b>magyar nyelvű</b> (pl. határon túli) csatornák, azon belül a működő, logós, jobb minőségű adások; a sorrend naponta kicsit változik, hogy mindig mást is felfedezz. A keresésnél a pontos névegyezés marad legelöl. A filmeknél és sorozatoknál a magyar jelölésű (szinkron, felirat, „magyar” csoport) és a magyar tárhelyről (.hu) származó tételek kerülnek előre. A „hazai” ország a Beállítások → Tartalom és gyerekek → Tartalom alatt módosítható. ${t('card-badges', 'A kártyák jelölései')}</p>`,
  },
  {
    id: 'card-badges',
    cat: 'find',
    title: 'Mit jelentenek a jelölések a kártyákon?',
    keywords: 'pötty zöld piros csík FHD HD 4K csillag jelölés ikon',
    body: `
<table class="help-table">
<tr><td><span class="st st-ok"></span> zöld pötty</td><td>Az adás legutóbb működött.</td></tr>
<tr><td><span class="st st-bad"></span> piros pötty</td><td>Az ellenőrzéskor egyik forrás sem válaszolt. ${t('health', 'Ellenőrzés')}</td></tr>
<tr><td><b>OFFLINE</b> felirat, szürke kép</td><td>A csatorna jelenleg nem érhető el; a neve alatt: „Offline – jelenleg nem elérhető”.</td></tr>
<tr><td><b>ADÁSSZÜNET</b> felirat</td><td>Csak időszakosan sugárzó (nem 0–24 órás) csatorna, amely most nem ad; a neve alatt: „Adásszünet – most nem sugároz”.</td></tr>
<tr><td>nincs pötty</td><td>Még nem ellenőrizte a program.</td></tr>
<tr><td><b>HD / FHD / 4K</b></td><td>A legjobb elérhető minőség (720p / 1080p / 2160p).</td></tr>
<tr><td>piros csík alul</td><td>A most futó műsor haladása (ha van műsorújság).</td></tr>
<tr><td>★</td><td>A csatorna a kedvenceid között van.</td></tr>
<tr><td>„Most: …” felirat</td><td>Az éppen futó műsor címe; ha nincs műsorújság, az ország és a kategória.</td></tr>
</table>
<p>Az adatlapon további jelzések: <b>Földrajzilag korlátozott</b> (lehet, hogy csak az adott országból nézhető), <b>Nem 0–24</b> (csak bizonyos időszakokban sugároz), <b>N forrás</b> (több adásforrás).</p>`,
  },
  {
    id: 'search',
    cat: 'find',
    title: 'Keresés',
    keywords: 'keresés kereső találat műsor cím ékezet',
    body: `
<p>Kattints a fejléc nagyítójára, vagy nyomd meg a <kbd>/</kbd> vagy <kbd>Ctrl</kbd>+<kbd>F</kbd> billentyűt (tévén a sárga gombot), és kezdj gépelni – a találatok azonnal megjelennek.</p>
<h2>Mire keres?</h2>
<ul>
<li>a csatorna nevére és más neveire (pl. „Duna” megtalálja a „Duna World”-öt is),</li>
<li>az országra (<i>német</i>, <i>Németország</i> vagy <i>DE</i>), a kategóriára (<i>sport</i>, <i>hírek</i>), a hálózatra (<i>Pluto TV</i>), a saját lista nevére,</li>
<li><b>műsorcímekre</b> a következő 48 órában (ha van műsorújság) – ezek külön, „Műsorok” cím alatt jelennek meg; a futó műsorokat MOST jelzés mutatja.</li>
</ul>
<h2>Tippek</h2>
<ul>
<li>Az ékezetek és a kis-/nagybetűk nem számítanak: „hirado” = „Híradó”.</li>
<li>Több szó esetén mindegyiknek egyeznie kell: „sport magyar” csak a magyar sportcsatornákat adja.</li>
<li>A találatok között <kbd>↓</kbd>-vel vagy <kbd>Enter</kbd>-rel léphetsz át a keresőmezőből.</li>
<li>A műsortalálatra kattintva megnyílik a műsor adatlapja, ahol azonnal nézheted vagy emlékeztetőt kérhetsz.</li>
</ul>`,
  },
  {
    id: 'browse',
    cat: 'find',
    title: 'Böngészés és szűrők',
    keywords: 'böngészés szűrő kategória ország nyelv minőség állapot rendezés',
    body: `
<p>A <b>Böngészés</b> oldal az összes (a profilod számára látható) csatornát mutatja. Szűrők nélkül felül a kategóriák és az országok csempéi segítenek.</p>
<table class="help-table">
<tr><td><b>Keresés</b></td><td>Szöveg a csatorna nevében, más nevében, országában, kategóriájában – a többi szűrővel <b>együtt</b> érvényes (pl. „otthon” + Magyarország + magyar). A fejléc keresőjének találati oldaláról a <i>Szűrés ország, nyelv, kategória szerint</i> gombbal ide jutsz a keresett szöveggel.</td></tr>
<tr><td><b>Kategória</b></td><td>Hírek, Sport, Filmek, Gyerek, Zene… (zárójelben a csatornák száma).</td></tr>
<tr><td><b>Ország</b></td><td>A csatorna országa.</td></tr>
<tr><td><b>Nyelv</b></td><td>Az adás nyelve (ahol ismert).</td></tr>
<tr><td><b>Minőség</b></td><td>HD (720p) vagy Full HD (1080p) és jobb.</td></tr>
<tr><td><b>Állapot</b></td><td>Működő / nem ellenőrzött / nem elérhető. ${t('health', 'Ellenőrzés')}</td></tr>
<tr><td><b>Rendezés</b></td><td>Ajánlott sorrend, név vagy ország szerint.</td></tr>
</table>
<p>A szűrők kombinálhatók (pl. Sport + Németország + HD). A <b>Szűrők törlése</b> gomb mindet visszaállítja. A lista görgetéskor fokozatosan töltődik.</p>`,
  },
  {
    id: 'channel-info',
    cat: 'find',
    title: 'A csatorna adatlapja',
    keywords: 'adatlap információ részletek ország nyelv tulajdonos weboldal forrás',
    body: `
<p>Megnyitás: a kártya ⌄ gombja, jobb kattintás, <kbd>I</kbd> billentyű, vagy lejátszás közben az ⓘ gomb.</p>
<h2>Mit tartalmaz?</h2>
<ul>
<li><b>Fejléc</b>: logó, név, állapot, minőség, források száma, korlátozások, a most futó műsor leírással és haladással; Lejátszás és Kedvenc gomb.</li>
<li><b>Műsor</b>: tegnaptól holnaputánig napokra bontva; a futó műsor kiemelve. Jövőbeli műsornál a 🔔 gombbal emlékeztetőt kérhetsz. ${t('reminders', 'Emlékeztetők')}</li>
<li><b>Adatok</b>: ország, kategória, nyelv, hálózat, tulajdonos, indulás éve, megszűnés, más nevek, időzóna, saját lista neve, weboldal (a rendszer böngészőjében nyílik meg).</li>
<li><b>Adásforrások</b>: az összes forrás állapottal, minőséggel és korlátozással; mindegyik külön is indítható ▶. A <b>Források ellenőrzése</b> gomb azonnal kipróbálja mindegyiket.</li>
</ul>`,
  },

  // ===================================================================== Műsorújság
  {
    id: 'guide-grid',
    cat: 'guide',
    title: 'A műsorújság-rács',
    keywords: 'műsorújság epg rács idővonal most nap holnap',
    body: `
<p>A <b>Műsorújság</b> oldal idővonalon mutatja a csatornák műsorát: soronként egy csatorna, vízszintesen az idő (fél óránkénti jelölésekkel). A piros függőleges vonal a <b>jelen pillanat</b>.</p>
<h2>Szűrők</h2>
<ul>
<li><b>Kedvencek</b> – a kedvenc csatornáid a saját sorrendjükben,</li>
<li><b>[Hazai ország]</b> – a hazai csatornák,</li>
<li><b>Minden csatorna</b> – minden csatorna, amelyhez van műsoradat.</li>
</ul>
<p>Napválasztó: tegnaptól 3 napra előre. Az <b>Ugrás most-ra</b> gomb visszavisz a jelenhez.</p>
<p><b>Kategória</b> (Film, Sorozat, Sport, Hírek, Gyerek, Ismeretterjesztő, Szórakoztató, Zene): csak azok a csatornák maradnak, amelyeken aznap van ilyen műsor, a többi műsor halványan látszik. A felismerés a műsorújság kategóriáján és a műsor címén alapul.</p>
<p><b>Idővonal / Most műsoron</b>: a <i>Most műsoron</i> nézetben csatornánként egy nagy kártya mutatja a most futó műsort (haladással) és a következőt – gyors áttekintéshez, távirányítóval is kényelmes.</p>
<p>A műsor adatlapján a <b>Naptárba</b> gomb naptárfájlt (.ics) ment, amit a Google Naptár, az Outlook vagy a telefon naptára beolvas (5 perces emlékeztetővel); asztali gépen a <b>● Felvétel</b> gombbal a műsor ütemezetten rögzíthető (${t('recording', 'Felvétel')}).</p>
<h2>Használat</h2>
<ul>
<li>Kattints egy <b>műsorra</b>: megnyílik az adatlapja (leírás, időtartam, kategória) – futó műsornál <i>Nézem most</i>, jövőbelinél <i>Emlékeztető</i> gombbal.</li>
<li>Kattints a <b>csatorna nevére</b> bal oldalt: azonnal indul; a fel/le váltás ilyenkor a rács csatornái között lépked.</li>
<li>A futó műsorok sötétpiros alapon, a lejártak halványan, az emlékeztetővel jelöltek 🔔-vel látszanak.</li>
</ul>
<p>Csak azok a csatornák jelennek meg, amelyekhez van műsoradat. ${t('trouble-epg', 'Miért nincs minden csatornához?')}</p>`,
  },
  {
    id: 'reminders',
    cat: 'guide',
    title: 'Emlékeztetők',
    keywords: 'emlékeztető értesítés csengő figyelmeztetés kezdődik',
    body: `
<p>Egy jövőbeli műsorra emlékeztetőt kérhetsz a műsorújságban (kattints a műsorra → <b>🔔 Emlékeztető</b>), a csatorna adatlapján (a műsor melletti 🔔) vagy a keresés találatai közül.</p>
<ul>
<li><b>Minden adására</b>: a műsor adatlapján a <b>↻ Minden adására</b> gombbal a műsor összes adására kérhetsz emlékeztetőt azon a csatornán (sorozatokhoz, híradóhoz, rendszeres műsorokhoz). A „– 312. rész” jellegű végződéseket figyelmen kívül hagyja, és a következő 7 nap adásait magától felveszi.</li>
<li><b>Mikor szól?</b> Beállítások → Értesítések → Emlékeztetők: a kezdéskor vagy 1–30 perccel előtte.</li>
<li><b>Automatikus átkapcsolás</b>: bekapcsolva a műsor kezdetekor (8 mp visszaszámlálás után, <i>Maradok</i> gombbal megállítható) átvált a csatornára, ha az Adás nyitva van.</li>
<li>A fejléc 🔔 ikonja mutatja a beállított emlékeztetőket és a „minden adására” szabályokat; innen törölheted is őket.</li>
<li>Az emlékeztetők <b>profilonként</b> tárolódnak, és a profil költöztetésével együtt mennek.</li>
</ul>
<h2>Hol és hogyan értesít?</h2>
<table class="help-table">
<tr><td><b>Windows / Mac / Linux</b></td><td>A programon belül és a rendszer értesítési központjában; kattintásra a csatorna indul. A <i>Futás a háttérben</i> beállítással az ablak bezárása után is szól (az Adás a tálcán marad), az <i>Indítás a rendszerrel</i> pedig bejelentkezéskor a tálcára indítja (Macen a menüsorba, Linuxon az automatikusan induló programok közé kerül). Linuxon a tálcaikonhoz AppIndicator-támogatás kell (GNOME-on az <i>AppIndicator</i> bővítmény); ha nincs, a rejtett ablak a program újbóli elindításával jön elő.</td></tr>
<tr><td><b>Android, Android TV</b></td><td>A rendszer értesít – akkor is, ha az Adás be van zárva, és a telefon újraindítása után is. Első alkalommal engedélyezni kell az értesítéseket. Kattintásra a csatorna indul.</td></tr>
<tr><td><b>LG tévé</b></td><td>Akkor szól, ha az Adás fut; más tévéalkalmazás közben felugró üzenetként.</td></tr>
<tr><td><b>Böngésző</b></td><td>Csak amíg az oldal nyitva van.</td></tr>
</table>
<div class="note">A hordozható (telepítés nélküli) Windows-változatnál a Windows a rendszerértesítést nem mindig mutatja meg – a programon belüli értesítés ilyenkor is megjelenik. A telepített változatnál nincs ilyen korlátozás.</div>
${go('#/settings?section=reminders', 'Emlékeztetők beállításai')}`,
  },
  {
    id: 'epg-sources',
    cat: 'guide',
    title: 'Műsorújság-források',
    keywords: 'epg xmltv forrás párosítás frissítés saját műsorújság',
    body: `
<p>A műsoradatok <b>XMLTV</b> formátumú forrásokból érkeznek. Beállítások → Műsorújság alatt látod mindegyiket: hány csatornához sikerült párosítani, hány műsort tartalmaz, és ha hibás, mi a hiba.</p>
<h2>Beépített források</h2>
<ul>
<li>Alapból bekapcsolva: két magyar forrás és a lejátszólista saját forrása.</li>
<li>Bekapcsolhatók: Szlovákia, Románia, Ausztria, Németország, Egyesült Királyság, USA, Franciaország, Olaszország, Spanyolország, valamint a Pluto TV, Samsung TV Plus és Plex csatornák műsora. Minél több forrás van bekapcsolva, annál tovább tart a betöltés.</li>
</ul>
<h2>Saját forrás</h2>
<p><b>XMLTV forrás hozzáadása</b>: bármely <code>.xml</code> vagy <code>.xml.gz</code> cím megadható (pl. a szolgáltatód vagy egy közösségi oldal műsorújsága). Az újonnan felvett forrás kerül a lista elejére, és elsőbbséget kap.</p>
<h2>Hogyan párosít?</h2>
<p>A program a forrás csatornaazonosítóját és megjelenített nevét veti össze a csatornalistával: először pontos azonosító, majd azonosító + ország, név + ország, végül egyértelmű név alapján. Ha egy csatornához több forrásban is van adat, a listában előrébb álló forrás nyer.</p>
<p><b>Frissítés</b>: a beállított gyakorisággal (3–48 óránként) magától, vagy azonnal a <i>Műsorújság frissítése most</i> gombbal, illetve a profilmenü <i>Csatornalista frissítése</i> pontjával.</p>`,
  },

  // ===================================================================== Személyre szabás
  {
    id: 'profiles',
    cat: 'personal',
    title: 'Profilok',
    keywords: 'profil felhasználó ki nézi váltás szín létrehozás törlés',
    body: `
<p>Minden családtag saját profilt használhat. Indításkor (ha több profil van) a <b>„Ki nézi?”</b> képernyő fogad; később a fejléc profilképére kattintva válthatsz.</p>
<h2>Kezelés</h2>
<p>Profilmenü → <b>Profilok kezelése</b> → kattints egy profilra a szerkesztéshez (név, profilkép, szín, gyerekprofil, törlés), vagy a <b>Profil hozzáadása</b> gombra.</p>
<h2>Profilkép</h2>
<p>A szerkesztőben 11 rajzolt profilkép közül választhatsz (róka, nyuszi, robot, szereplők, zen vázák…), vagy a <b>betűs</b> változatot: ekkor a név kezdőbetűje jelenik meg a kiválasztott színű háttéren. A profilkép a „Ki nézi?” képernyőn, a fejlécben és a profilmenüben látszik.</p>
<p><b>Saját kép</b>: a <i>Saját kép feltöltése…</i> gombbal bármilyen PNG (vagy JPG, WebP) képet választhatsz. A program négyzetesre vágja (középről) és 256×256 pontra kicsinyíti; a kép a profillal együtt tárolódik, így a profil költöztetésével átkerül a többi eszközre is. Tévén nincs fájlválasztó: ott a számítógépről átvett profil képe jelenik meg.</p>
<h2>Mi tartozik a profilhoz és mi közös?</h2>
<table class="help-table">
<tr><th>Profilonként külön</th><th>Közös minden profilnak</th></tr>
<tr><td>Kedvencek és sorrendjük (csatornaszámok)<br>Legutóbb nézett csatornák<br>Emlékeztetők<br>Felületstílus<br>A főoldal sorainak sorrendje<br>Gyerekprofil beállítás</td>
<td>Csatornalisták és saját csatornák<br>Műsorújság-források<br>Hazai ország, lejátszási beállítások<br>Elérhetőség-ellenőrzés eredményei<br>Hangerő</td></tr>
</table>
${go('#/profiles', 'Profilok kezelése')}`,
  },
  {
    id: 'kids',
    cat: 'personal',
    title: 'Gyerekprofil és felnőtt tartalom',
    keywords: 'gyerek gyerekprofil felnőtt szűrés 18 nsfw szülői',
    body: `
<h2>Gyerekprofil</h2>
<p>A profil szerkesztésekor kapcsold be a <b>Gyerekprofil</b> kapcsolót. Ilyenkor alapból csak a <b>gyerektartalom</b> jelenik meg – a főoldalon, a TV és a VOD oldalon, a böngészésben, a keresésben és a műsorújságban is. A gyerekprofilban a hírek kártyája sem látszik.</p>
<h2>Mi számít gyerektartalomnak?</h2>
<p>Alapból a <b>Gyerek, Animáció, Családi és Oktatás</b> kategóriájú csatornák, illetve a gyerek-, családi és animációs csoportú / műfajú filmek és sorozatok (a felnőtt műfajok soha). Ez <b>minden profilban közös</b> jelölés, és kézzel is állítható: a csatorna és a film / sorozat <b>adatlapján</b> a <b>Gyerektartalom</b> gombbal (felnőtt profilban), vagy a Beállítások → Tartalom és gyerekek → <b>Gyerekprofilok – mit nézhetnek?</b> listában.</p>
<h2>Mit nézhet a gyerekprofil?</h2>
<p>Beállítások → Tartalom és gyerekek → <b>Gyerekprofilok – mit nézhetnek?</b>: a <b>TV-csatornák</b> vagy a <b>VOD</b> fülön minden sorban ott a közös <i>Gyerektartalom</i> kapcsoló, és mellette <b>minden gyerekprofilnak külön kapcsoló</b> (a profil nevével): így például a nagyobb gyerek nézhet olyat, amit a kisebb nem. A szűrővel nézheted, mi a gyerektartalom, mindent, vagy azt, amit egy adott gyerekprofil nézhet / nem nézhet; kereséssel szűkíthetsz, és gyerekprofilonként a látható találatokat egyszerre is engedélyezheted / tilthatod. Gyerekprofilból a beállítások csak PIN-kóddal nyílnak meg.</p>
<h2>Napi nézési idő és korhatár</h2>
<p>Ugyanitt gyerekprofilonként megadható a <b>napi nézési idő</b> (30 perctől 4 óráig, vagy korlátlan) és a <b>korhatár</b> (6, 12, 16, 18 év). 5 és 1 perccel a vége előtt figyelmeztet; ha elfogy, a lejátszás leáll, és csak egy felnőtt profil PIN-jével nézhető tovább (+30 perc). Ha a műsorújság szerint egy élő műsor korhatára magasabb a beállítottnál, az adás nem indul (vagy a műsor kezdetekor leáll) – szülői PIN-nel az adott műsorra feloldható. (A korhatárt nem minden műsorújság közli; ahol nincs adat, ott nincs korlátozás.)</p>
<div class="tip">A korlátozásokhoz állíts be PIN-t egy felnőtt profilnak (Profilok kezelése) – PIN nélkül bárki feloldhatja.</div>
<p>Felnőtt (18+) csatorna gyerekprofilban akkor sem jelenik meg, ha kézzel engedélyezed.</p>
<h2>Felnőtt tartalom</h2>
<p>A felnőtt (18+) csatornák alapból rejtve vannak. Megjelenítésük: Beállítások → Tartalom és gyerekek → Tartalom → <b>Felnőtt tartalom megjelenítése</b> (megerősítést kér). A szűrés az iptv-org besorolásán és tiltólistáján alapul.</p>
<div class="warn">A szűrés a nyilvános adatbázis jelöléseire épül, ezért nem tökéletes. Kisebb gyerekeknél érdemes felügyelni a használatot; a gyerekprofilból a profilváltás nincs jelszóval védve.</div>`,
  },
  {
    id: 'favorites',
    cat: 'personal',
    title: 'Kedvencek és előzmények',
    keywords: 'kedvenc csillag sorrend húzás előzmény legutóbb nézett törlés',
    body: `
<h2>Kedvenc jelölése</h2>
<ul>
<li>a kártyán a <b>+</b> gomb (rámutatáskor), vagy kijelölve az <kbd>F</kbd> billentyű (tévén a piros gomb),</li>
<li>az adatlapon a + gomb, lejátszás közben a + gomb vagy az <kbd>S</kbd>.</li>
</ul>
<h2>Sorrend</h2>
<p>A <b>Kedvencek</b> oldalon a kártyákat egérrel húzva rendezheted. A kártyák bal felső sarkában lévő szám a <b>csatornaszám</b>, amelyet lejátszás közben beírva oda válthatsz. ${t('channel-switching', 'Csatornaszámok')}</p>
<h2>Előzmények</h2>
<p>A legutóbb nézett 30 csatorna a főoldal első sorában és a Kedvencek oldal alján látszik. Törlés: Kedvencek → <b>Előzmények törlése</b>. Beállítások → Lejátszás → <i>Utolsó csatorna folytatása indításkor</i>: induláskor automatikusan a legutóbb nézett csatorna indul.</p>`,
  },
  {
    id: 'themes',
    cat: 'personal',
    title: 'Felületstílusok',
    keywords: 'téma stílus kinézet netflix disney skyshowtime rakuten prime apple zen wabi szabi nintendo wii switch világos sötét',
    body: `
<p>A felület kinézete profilonként választható: <b>Beállítások → Megjelenés → Felület stílusa</b> (legördülő menü, vagy kattints a mintákra). A váltás azonnal érvényes.</p>
<p>Az <b>elrendezés minden stílusban ugyanaz</b> (felső menüsáv, azonos kártyaméretek, sorok és kártyák a főoldalon) – a stílus csak a kinézetet adja: színek, betűtípus, keretek, árnyékok, háttérminták, animációk.</p>
<table class="help-table">
<tr><th colspan="2">Sötét stílusok</th></tr>
<tr><td><b>Kurenai</b></td><td>(bíborvörös) Esti mozi: fekete háttér, vörös kiemelés, rámutatásra kinagyuló kártyák.</td></tr>
<tr><td><b>Mahō</b></td><td>(varázslat) Mesés mélykék színátmenet, fénylő keretes, lekerekített kártyák.</td></tr>
<tr><td><b>Murasaki</b></td><td>(bíbor) Lila–rózsaszín színátmenetek, fénylő kiemelés.</td></tr>
<tr><td><b>Akane</b></td><td>(mélyvörös) Fekete alap, vörös jelölések, nagybetűs sorcímek.</td></tr>
<tr><td><b>Shinkai</b></td><td>(mélytenger) Éjkék háttér, tengerkék kiemelés.</td></tr>
<tr><td><b>Garasu</b></td><td>(üveg) Mélyfekete háttér, áttetsző, elmosott felületek, lebegő árnyékok.</td></tr>
<tr><td><b>Futago</b></td><td>(ikrek) Kézikonzol-menü: sötétszürke alap, piros–kék kontrollerpár, szögletes csempék lüktető türkiz kerettel.</td></tr>
<tr><td><b>Neon City</b></td><td>Éjszakai neonváros: neonsárga, cián és bíbor, levágott sarkú kártyák, pásztázó sorok, „glitch” kijelöléskor.</td></tr>
<tr><td><b>Neo-Tokyo</b></td><td>Az AKIRA világa: éjszakai romváros sziluettje az ablak alján, száguldó vörös motorfény-csíkok, Kaneda-vörös tömbös logó fehér kapszula-jelvénnyel, döntött címbetűk, vörösen izzó kijelölés.</td></tr>
<tr><td><b>Kyokkō</b></td><td>(sarki fény) Lassan hullámzó színes háttér, matt üveg kártyák, fénylő kijelölés. (Tévén a háttér nem mozog.)</td></tr>
<tr><td><b>Phosphor</b></td><td>Zöld foszforos monitor: fix szélességű betűk, <code>$ ls</code> sorcímek, inverz kijelölés.</td></tr>
<tr><th colspan="2">Világos stílusok</th></tr>
<tr><td><b>Zen</b></td><td>Rizspapír-fehér háttér, mohazöld kiemelés, sok levegő, csendes, lassú mozgások, ensō kör a logóban.</td></tr>
<tr><td><b>Wabi-sabi</b></td><td>Meleg, földszínű papírtextúra, kissé szabálytalan kártyák, rozsda- és indigószín, rámutatásra arany kintsugi-repedés.</td></tr>
<tr><td><b>Asobiba</b></td><td>(játszótér) Csíkos háttér, fehér keretes „buborék” kártyák, ruganyos mozgás, lüktető türkiz kijelölés.</td></tr>
<tr><td><b>Hiroba</b></td><td>(tér) A „csatornás” konzolmenü: fehér, finoman csíkos háttér, szürke keretes, fényes csempék, kék kijelölés.</td></tr>
<tr><td><b>16-Bit</b></td><td>A 90-es évek szürke otthoni konzolja: lila gombok, színes A–B–X–Y pöttyök a logónál, pixeles keretek, kockás betűs címek.</td></tr>
<tr><td><b>Manga</b></td><td>Fekete tus fehér papíron: rasztertónus (pöttyös árnyalás), vastag panelkeretek, szürkeárnyalatos képek (kijelöléskor színesek), beszédbuborék-gombok.</td></tr>
<tr><td><b>Pow!</b></td><td>Amerikai képregény: Ben-Day pöttyök, vörös–sárga–kék, vastag fekete kontúr eltolt árnyékkal, sárga szövegdobozos sorcímek, „POW!” csillagrobbanás az ablakokon.</td></tr>
<tr><td><b>Kikagaku</b></td><td>(geometria) Plakátművészet: vörös–kék–sárga–fekete, vastag fekete keretes kártyák kemény árnyékkal, sorszámozott sorok.</td></tr>
<tr><td><b>Rakugaki</b></td><td>(firka) Vonalas füzetlap kézírással: a csatornák beragasztott polaroid fotók, a gombok ceruzával rajzoltak.</td></tr>
</table>
<p>A főoldal egységei (csempéi) is a stílushoz illő kinézetet kapnak (keret, árnyék, háttér, címek). A lejátszó minden stílusban sötét marad, hogy a kép a lehető legjobban érvényesüljön.</p>
<p><b>Saját téma</b>: téma-fájl feltöltésével vagy (asztali gépen) a téma-mappába másolva – Beállítások → Megjelenés → <i>Saját témák</i>. ${t('custom-theme', 'Saját téma készítése')}</p>
${go('#/settings', 'Megjelenés beállítása')}`,
  },
  {
    id: 'custom-theme',
    cat: 'personal',
    title: 'Saját téma készítése',
    keywords: 'saját téma készítés téma-fájl adastheme json css színek betűtípus mappa feltöltés sablon',
    body: `
<p>A téma egyetlen <b>JSON-fájl</b> (<code>.adastheme</code> vagy <code>.json</code>), amely a felület <b>kinézetét</b> adja meg: színeket, betűtípusokat, hátteret és díszítő CSS-t. Az <b>elrendezést nem változtathatja</b> – a méretet, térközt, pozíciót vagy láthatóságot módosító CSS-t az Adás automatikusan kiszűri, így a téma soha nem csúsztatja szét a felületet. A teljes leírás (mintával) a forráskódban: <code>docs/TEMA-KESZITES.md</code>.</p>
<h2>Betöltés</h2>
<ul>
<li><b>Feltöltés</b> (minden eszközön): Beállítások → Megjelenés → <i>Saját témák</i> → <b>Téma-fájl feltöltése…</b> A téma a beállításokba kerül (a mentés és a szinkron is viszi).</li>
<li><b>Téma-mappa</b> (asztali): az adatmappa <code>themes</code> almappája (<b>Téma-mappa megnyitása</b>), vagy saját mappa (<b>Másik téma-mappa…</b>). A bemásolt fájlokat indításkor és a <b>Téma-mappa újraolvasása</b> gombra olvassa be – szerkesztéshez ez a kényelmes.</li>
<li><b>Sablon mentése a mostani stílusból</b>: a használt stílus színeivel kitöltött téma-fájl – ebből érdemes kiindulni.</li>
</ul>
<h2>A fájl mezői</h2>
<table class="help-table">
<tr><td><code>adasTheme</code></td><td><b>Kötelező</b>, értéke <code>1</code>.</td></tr>
<tr><td><code>id</code></td><td><b>Kötelező</b>: 2–40 karakter, kisbetű, számjegy, kötőjel (pl. <code>sakura</code>). Azonos <code>id</code> a régit cseréli.</td></tr>
<tr><td><code>name</code></td><td><b>Kötelező</b>: a stílusválasztóban megjelenő név.</td></tr>
<tr><td><code>description</code>, <code>author</code></td><td>Leírás, készítő.</td></tr>
<tr><td><code>tone</code></td><td><code>"dark"</code> (alap) vagy <code>"light"</code>.</td></tr>
<tr><td><code>base</code></td><td>Beépített stílus, amelynek díszítéseire épül: <code>netflix</code> (Kurenai), <code>disney</code> (Mahō), <code>skyshowtime</code> (Murasaki), <code>rakuten</code> (Akane), <code>prime</code> (Shinkai), <code>apple</code> (Garasu), <code>zen</code>, <code>wabisabi</code>, <code>nintendo</code> (Asobiba), <code>switch</code> (Futago), <code>wii</code> (Hiroba), <code>cyberpunk</code> (Neon City), <code>neotokyo</code>, <code>manga</code>, <code>comic</code> (Pow!), <code>snes</code> (16-Bit), <code>bauhaus</code> (Kikagaku), <code>aurora</code> (Kyokkō), <code>sketch</code> (Rakugaki), <code>terminal</code> (Phosphor). Üresen: semleges alap.</td></tr>
<tr><td><code>colors</code></td><td><code>bg</code> (háttér), <code>bg2</code> (kártyák, panelek), <code>bg3</code>, <code>bg4</code> (további felületek), <code>line</code> (vonalak), <code>text</code>, <code>textStrong</code> (címek), <code>muted</code> (halvány szöveg), <code>accent</code>, <code>accent2</code> (kiemelés). A CSS-ben <code>var(--bg)</code>, <code>var(--bg-2)</code>, <code>var(--accent)</code>… néven érhetők el.</td></tr>
<tr><td><code>fonts</code></td><td><code>body</code> és <code>headings</code>: CSS <code>font-family</code> – csak telepített betűtípus, mindig tartalékkal.</td></tr>
<tr><td><code>radius</code></td><td>Alap-lekerekítés, pl. <code>"8px"</code>.</td></tr>
<tr><td><code>background</code></td><td>Az oldal háttere (szín, színátmenet, minta).</td></tr>
<tr><td><code>preview</code></td><td>A választó mintájának három színe: háttér, kiemelés, kártya.</td></tr>
<tr><td><code>css</code></td><td>Díszítő CSS. Minden szabály a témára szűkül; <code>&amp;</code> = maga a téma (a <code>body</code>).</td></tr>
</table>
<h2>Mit tehet a CSS, és mit nem?</h2>
<p><b>Szabad</b>: színek, hátterek, keretek, <code>border-radius</code>, <code>box-shadow</code>, <code>text-shadow</code>, <code>filter</code>, <code>backdrop-filter</code>, <code>transform</code>, <code>transition</code>, <code>animation</code>, <code>@keyframes</code>, <code>@media</code>, betűcsalád / -vastagság, <code>letter-spacing</code>, <code>text-transform</code>, <code>clip-path</code>, képek <code>url(https://…)</code> vagy <code>url(data:…)</code> formában.</p>
<p><b>Kiszűrve</b> (a sima elemeken): <code>width</code>, <code>height</code>, <code>margin</code>, <code>padding</code>, <code>top</code>/<code>left</code>/…, <code>gap</code>, <code>display</code>, <code>flex</code>, <code>grid</code>, <code>font-size</code>, <code>line-height</code>, <code>overflow</code>, <code>visibility</code>, a <code>position</code> (kivéve <code>relative</code>) és a hasonlók. A <code>::before</code> / <code>::after</code> díszítő álelemeken ezek is használhatók (adj nekik <code>pointer-events: none</code>-t). Mindig tiltott: <code>@import</code>, <code>javascript:</code>.</p>
<h2>Díszíthető elemek</h2>
<p><code>#nav</code> (menüsáv), <code>.brand</code> (logó), <code>.links a.active</code>, <code>.btn</code> / <code>.btn.primary</code>, <code>.row-title</code>, <code>.card</code> / <code>.thumb</code> / <code>.card .name</code> (csatornakártya), <code>.tile</code>, <code>.vposter</code> (VOD-plakát), <code>.dcard</code> / <code>.dc-title</code> (főoldali egység), <code>.d-row</code>, <code>.modal</code>, <code>.tab.active</code>, <code>.switch:checked</code>, <code>.input</code>, <code>.now-label</code>, <code>.bar i</code>, <code>.profile .avatar</code>, <code>:focus-visible</code> (kijelölés – tévén a legfontosabb). Tévén a <code>&amp;.tv</code> előtaggal kapcsold ki a lassító hatásokat (elmosás, végtelen animáció).</p>
<h2>Teljes példa</h2>
<pre class="code">{
  "adasTheme": 1,
  "id": "sakura",
  "name": "Sakura",
  "description": "Cseresznyevirág: világos rózsaszín, puha árnyékok.",
  "tone": "light",
  "base": "zen",
  "colors": { "bg": "#fbf4f6", "bg2": "#ffffff", "bg3": "#f1e2e7", "bg4": "#e8d3da",
              "line": "#e2c8d1", "text": "#4a3b40", "textStrong": "#2a1f23", "muted": "#8d7880",
              "accent": "#d6457a", "accent2": "#ef7aa4" },
  "fonts": { "body": "'Segoe UI', Arial, sans-serif", "headings": "Georgia, serif" },
  "radius": "14px",
  "background": "radial-gradient(ellipse at 85% 0%, #ffe1ec, transparent 55%), #fbf4f6",
  "preview": ["#fbf4f6", "#d6457a", "#f1e2e7"],
  "css": ".dcard { border: 1px solid var(--line); border-radius: 18px; }\n.dc-title { color: var(--accent); }\n.btn.primary { background: var(--accent); color: #fff; }"
}</pre>
<div class="tip"><b>Mesterséges intelligenciával</b>: másold be neki ezt a súgót (vagy a <code>docs/TEMA-KESZITES.md</code>-t), és írd le, milyen hangulatú témát szeretnél – a fenti mezőkkel kész téma-fájlt ad, amit feltölthetsz.</div>
<div class="note">Hibás fájlnál a <i>Saját témák</i> lista alatt sárga üzenet jelzi a hibát (pl. hibás JSON, rossz <code>id</code>). A kiszűrt CSS-tulajdonságok nem okoznak hibát, egyszerűen nem érvényesülnek.</div>
${go('#/settings', 'Megjelenés beállítása')}`,
  },
  {
    id: 'home-rows',
    cat: 'personal',
    title: 'A TV és a VOD oldal sorainak sorrendje',
    keywords: 'sorrend sorok kategóriák rendezés elrejtés tv oldal vod műfaj húzás',
    body: `
<p>Beállítások → Megjelenés → <b>A TV oldal sorai</b>, illetve Beállítások → VOD és médiatár → VOD-listák → <b>A VOD oldal sorai</b>. A lista a sorokat abban a sorrendben mutatja, ahogy megjelennek. A beállítás <b>csak az aktuális profilra</b> vonatkozik. A VOD-nál a sorok: Folytatás, Megnézendő, Sorozatok, Ajánlott filmek, az egységes műfajok (legalább 6 címmel), listánként egy sor, Egyéb filmek.</p>
<ul>
<li><b>Áthelyezés</b>: fogd meg a sort a ⋮⋮ jelnél és húzd a helyére, vagy használd a ⌃ / ⌄ gombokat (távirányítóval is: a gombon maradva többször megnyomható).</li>
<li><b>Elrejtés</b>: a sor melletti kapcsoló. Az elrejtett sor halványan látszik a listában, de a főoldalon nem jelenik meg.</li>
<li><b>Alapértelmezett sorrend</b>: mindent visszaállít.</li>
</ul>
<p>Elérhető sorok: Legutóbb nézett, Kedvenceid, Most a TV-ben, hazai csatornák, Saját listák (minden saját lista és a saját csatornák külön sorban), az összes kategória, Fedezz fel országokat, valamint a – alapból rejtett – Kategóriák csempesor.</p>
<div class="tip">Egy kategóriasor csak akkor jelenik meg, ha legalább 3 csatorna tartozik bele; gyerekprofilban csak a gyerekeknek való kategóriák látszanak.</div>`,
  },
  {
    id: 'settings-overview',
    cat: 'personal',
    title: 'A beállítások áttekintése',
    keywords: 'beállítások opciók lehetőségek',
    body: `
<p>A beállítások nyolc csoportba vannak rendezve. Két elrendezés közül választhatsz a fejléc jobb oldalán (a választás megmarad):</p>
<ul>
<li><b>▦ Csempék</b>: a nyitóoldalon nagy csempék (ikon + rövid leírás); egy csempére kattintva nyílik a csoport, a <i>‹ Minden beállítás</i> gombbal (vagy Vissza) térsz vissza. Tévén, távirányítóval kényelmes.</li>
<li><b>☰ Fülek</b>: a csoportok fülei felül (telefonon vízszintesen görgethetők), alattuk a kiválasztott csoport.</li>
</ul>
<p>Minden csoport tetején egy-két mondat mondja el, mit találsz ott. A <b>keresőmező</b> mindkét nézetben az összes beállítás között keres (pl. <i>felirat</i>, <i>téma</i>, <i>szinkron</i>): a találatot tartalmazó részek látszanak, a megfelelő sorok kiemelve.</p>
<table class="help-table">
<tr><td><b>🎨 Megjelenés</b></td><td>Felületstílus, saját témák, a TV oldal sorainak sorrendje. ${t('themes', 'Stílusok')}</td></tr>
<tr><td><b>🏠 Főoldal</b></td><td>A Főoldal csempéi, időjárás, hírforrások, élő előnézet. ${t('dashboard', 'Főoldal')}</td></tr>
<tr><td><b>▶️ Lejátszás</b></td><td>Tartalék forrás, legnagyobb minőség, hangerő, lejátszómotor és lejátszási híd, a lejátszó gombjai. ${t('engines', 'Motorok')}</td></tr>
<tr><td><b>💬 Feliratok és információk</b></td><td>Feliratforrások (Feliratok.eu, OpenSubtitles), a feliratok kinézete, kedvenc hangsáv, magyar leírások és borítóképek. ${t('subtitles', 'Feliratok')}</td></tr>
<tr><td><b>⏺ Felvételek</b></td><td>A felvételek mappája, ráhagyás a műsor előtt / után, a legutóbbi felvételek (asztali változat). ${t('recording', 'Felvétel')}</td></tr>
<tr><td><b>📺 Csatornalisták</b></td><td>Beépített és saját lejátszólisták, saját csatornák, elérhetőség-ellenőrzés. ${t('lists', 'Listák')}</td></tr>
<tr><td><b>🎬 VOD és médiatár</b></td><td>Film- és sorozatlisták, kiegészítő csomagok, saját (NAS-) médiatár, a VOD oldal sorai. ${t('vod-lists', 'VOD-listák')}</td></tr>
<tr><td><b>🗓️ Műsorújság</b></td><td>A műsorújság forrásai és frissítése. ${t('epg-sources', 'Műsorújság')}</td></tr>
<tr><td><b>👪 Tartalom és gyerekek</b></td><td>Hazai ország, rejtett és felnőtt tartalom, mit nézhetnek a gyerekprofilok. ${t('kids', 'Részletek')}</td></tr>
<tr><td><b>🔔 Értesítések</b></td><td>Emlékeztetők, automatikus átkapcsolás, futás a háttérben. ${t('reminders', 'Részletek')}</td></tr>
<tr><td><b>📱 Távirányító és billentyűk</b></td><td>Telefon távirányítóként (QR-kóddal), billentyűparancsok, a tévé-távirányító gombjai. ${t('remote', 'Távirányító')}</td></tr>
<tr><td><b>🔄 Szinkron eszközök között</b></td><td>Beállítások, profilok, listák átvitele egy másik eszközre hatjegyű kóddal.</td></tr>
<tr><td><b>💾 Profilok és mentés</b></td><td>Profilok, mentés és visszaállítás, automatikus mentések, gyorsítótár. ${t('backup', 'Részletek')}</td></tr>
<tr><td><b>⬆️ Frissítés</b></td><td>Új verzió keresése és telepítése a GitHubról; az induláskori keresés ki is kapcsolható. ${t('update', 'Frissítés')}</td></tr>
<tr><td><b>ℹ️ Névjegy</b></td><td>Verzió, az adatmappa helye, az adatok forrásai.</td></tr>
</table>
${go('#/settings', 'Beállítások megnyitása')}`,
  },
  {
    id: 'backup',
    cat: 'personal',
    title: 'Mentés, visszaállítás, gyorsítótár',
    keywords: 'mentés visszaállítás biztonsági másolat export import gyorsítótár törlés költözés',
    body: `
<h2>Mentés fájlba</h2>
<p>Beállítások → Profilok és mentés → <b>Mentés fájlba</b>: egy <code>.json</code> fájlba írja a beállításokat, az összes profilt a kedvencekkel, előzményekkel, emlékeztetőkkel, stílussal és sorrenddel, valamint a saját listákat és csatornákat. Így másik gépre is átviheted az egészet.</p>
<h2>Visszaállítás</h2>
<p><b>Visszaállítás fájlból</b>: a mentett fájl felülírja a jelenlegi beállításokat és profilokat (megerősítést kér), majd a program újraindul.</p>
<p><b>Profilok hozzáadása fájlból</b>: csak a mentés profiljait veszi át (kedvencekkel, előzményekkel, emlékeztetőkkel, profilképpel, PIN-nel); a mostani beállítások, listák és a többi profil megmaradnak, az azonos profil frissül. Ugyanez a <i>Szinkronizálás eszközök között</i> résznél a <b>Csak a profilok</b> kapcsolóval hálózaton át is működik.</p>
<h2>Egységes a profilfájl?</h2>
<p>Igen: minden változat (Windows, Mac, Linux, LG tévé, Android, böngésző) ugyanazt a formátumot használja, ezért a mentés bármelyik eszközön betölthető. Ahol nincs fájlválasztó (tévé), ott hálózaton át (<i>Szinkronizálás eszközök között</i>) vagy webcímről.</p>
<table class="help-table">
<tr><th>Változat</th><th>Hol vannak az adatok?</th></tr>
<tr><td>Windows</td><td><code>%APPDATA%\\Adás\\store.json</code> (a telepített és a hordozható változat is ide ment)</td></tr>
<tr><td>macOS / Linux</td><td><code>~/Library/Application Support/Adás/store.json</code> / <code>~/.config/Adás/store.json</code></td></tr>
<tr><td>Android, Android TV</td><td>Az alkalmazás saját, védett tárhelyén (kívülről nem elérhető; az alkalmazás törlésével elvész – előtte mentsd ki)</td></tr>
<tr><td>LG tévé</td><td>Az alkalmazás saját tárhelyén (az alkalmazás törlésével elvész)</td></tr>
<tr><td>Böngésző</td><td>A böngésző helyi tárolójában, címenként külön</td></tr>
</table>
<h2>Gyorsítótár törlése</h2>
<p>Törli a letöltött listákat, műsorújságot és a feldolgozott katalógust – a következő indításkor minden frissen letöltődik. Akkor hasznos, ha valami „beragadt”. A beállításaidat és profiljaidat nem érinti.</p>
<div class="note">Tévén a fájlba mentés nem érhető el – ott a <i>Szinkronizálás eszközök között</i> működik. Androidon a mentés a rendszer fájlmentőjével (pl. a Letöltések mappába vagy a Google Drive-ra) történik.</div>`,
  },

  // ===================================================================== Csatornalisták
  {
    id: 'lists',
    cat: 'lists',
    title: 'Csatornalisták és frissítésük',
    keywords: 'lista frissítés frissít csatornalista m3u iptv-org automatikus letöltés új csatornák',
    body: `
<p>A program csatornái a <b>beépített listákból</b>, a <b>saját lejátszólistáidból</b> és az egyenként felvett <b>saját csatornáidból</b> állnak össze.</p>
<h2>Beépített listák</h2>
<p>Beállítások → Csatornalisták → <b>Beépített listák</b>: mindegyik külön kapcsolóval ki-be kapcsolható. Mellettük látszik, hány csatornát adnak.</p>
<table class="help-table">
<tr><td><b>iptv-org</b></td><td>A legnagyobb közösségi gyűjtemény (kb. 10 000 csatorna), részletes adatokkal (ország, nyelv, tulajdonos, weboldal…). A címe a <i>Cím</i> gombbal módosítható (pl. csak egy ország listája).</td></tr>
<tr><td><b>iptv-org – Animáció</b></td><td>Az iptv-org animációs csatornái külön listaként; bekapcsolt iptv-org mellett összevonódnak vele, önállóan akkor hasznos, ha az iptv-org ki van kapcsolva.</td></tr>
<tr><td><b>Free-TV</b></td><td>Kézzel válogatott, ingyenes csatornák országonként.</td></tr>
<tr><td><b>Pluto TV</b>, <b>Samsung TV Plus</b>, <b>Plex</b></td><td>Az ingyenes, reklámmal támogatott streamingcsatornák több országból, saját műsorújsággal.</td></tr>
<tr><td><b>FreeCast Hub</b></td><td>Kis válogatás (hírek, zene, sport).</td></tr>
<tr><td><b>DragonHall TV</b></td><td>Egyetlen magyar internetes adás.</td></tr>
</table>
<h2>Duplikáció nélkül</h2>
<p>Ha több lista is be van kapcsolva, ugyanaz a csatorna gyakran több listában is szerepel. A program ezeket <b>egy csatornává vonja össze</b>: a csatorna egyszer jelenik meg, a különböző listákból származó adásai pedig <b>tartalék forrásai</b> lesznek (ha az egyik nem működik, a lejátszó magától a következőre vált). Az adatlapon a <i>Csatornalisták</i> sor mutatja, mely listákban szerepel, az <i>Adásforrások</i> között pedig látszik, melyik forrás honnan származik.</p>
<p>Az összevonás menete: először a csatorna azonosítója (<code>tvg-id</code>) alapján, majd név és ország, végül – ha egyértelmű – csak név alapján. A Pluto TV, Samsung TV Plus és Plex országonkénti változatai (pl. „48 Hours” USA / Kanada / Egyesült Királyság) egy csatornává olvadnak. Az eltérő országú, azonos nevű, de valójában különböző csatornák (pl. „ABC News” Ausztrália és USA) külön maradnak.</p>
<h2>Frissítés</h2>
<ul>
<li><b>Automatikusan</b>: a fő lista 6 óránként, a csatornaadatok naponta frissülnek; induláskor a program az elmentett listával azonnal elindul, és ha az régi, a háttérben frissíti.</li>
<li><b>Azonnal</b>: profilmenü (a fejléc profilképe) → <b>Csatornalista frissítése</b> – alatta látszik, mikor volt az utolsó letöltés. Vagy: Beállítások → Csatornalisták → <b>Minden lista frissítése most</b>. Mindkettő a gyorsítótár megkerülésével mindent újratölt, a műsorújsággal együtt, és a végén kiírja, hány csatorna lett (és hány új).</li>
</ul>
<h2>Az iptv-org lista címe</h2>
<p>Beállítások → Csatornalisták → iptv-org → <b>Cím</b>: más M3U cím is megadható (pl. csak egy ország listája: <code>https://iptv-org.github.io/iptv/countries/hu.m3u</code>). Üresen hagyva visszaáll a teljes listára.</p>
<p>Lásd még: ${t('custom-playlists', 'Saját lejátszólista hozzáadása')} · ${t('custom-channels', 'Saját csatorna hozzáadása')}</p>
${go('#/settings?section=lists', 'Csatornalisták kezelése')}`,
  },
  {
    id: 'custom-playlists',
    cat: 'lists',
    title: 'Saját lejátszólista hozzáadása',
    keywords: 'saját lista hozzáadás m3u m3u8 url fájl beillesztés ajánlott szolgáltató iptv',
    body: `
<p>Bármely M3U / M3U8 lejátszólistát felvehetsz – például a szolgáltatódtól kapottat, egy közösségi gyűjteményt vagy egy saját összeállítást. Beállítások → Csatornalisták → Saját lejátszólisták:</p>
<table class="help-table">
<tr><td><b>Lista hozzáadása címről</b></td><td>Add meg a lista <code>http(s)://</code> címét. A program azonnal letölti és megmutatja, hány adás van benne, majd nevet kér (javaslatot is ad).</td></tr>
<tr><td><b>Lista hozzáadása fájlból</b></td><td>Egy vagy több <code>.m3u</code> / <code>.m3u8</code> fájl, vagy egy <b>ZIP</b>-csomag (asztali és Android-változat). Minden fájl külön, ki-be kapcsolható lista lesz.</td></tr>
<tr><td><b>Lista beillesztése szövegként</b></td><td>Másold be a lista tartalmát – vagy egyszerűen adáscímeket soronként, ebből a program maga készít listát.</td></tr>
</table>
<h2>Kezelés</h2>
<ul>
<li><b>Kapcsoló</b>: a lista ideiglenesen kikapcsolható törlés nélkül.</li>
<li><b>Átnevezés</b>, <b>Cím</b> módosítása, <b>Törlés</b>.</li>
<li>A sor mellett látszik a csatornák száma, letöltési hiba esetén a hibaüzenet.</li>
</ul>
<p>A saját listák csatornái a főoldalon a lista nevével külön sorban (a <i>Saját listák</i> helyén), a Böngészésben és a keresésben is megjelennek. A lista <code>group-title</code> (vagy <code>#EXTGRP</code>) mezője alapján kategóriába – magyar csoportnevek is: <i>Hírek, Sport, Mese, Film, Zene, Dokumentum…</i> –, a <code>tvg-id</code> alapján műsorújsághoz is rendelődnek. Az országot a <code>tvg-country</code>, az ország nevű csoport (pl. „Magyar”), a <code>tvg-id</code> végződése (<code>.hu</code>) vagy a név előtagja (<code>HU:</code>, <code>|HU|</code>, <code>[HUN]</code>) adja; a nyelvet a <code>tvg-language</code>. Így a magyar csatornák a saját listákban is elöl állnak. A cím utáni Kodi-stílusú fejlécek (<code>…/index.m3u8|User-Agent=…&amp;Referer=…</code>) is működnek. ${t('m3u-format', 'Az M3U formátum')}</p>
<div class="warn">Csak olyan listát használj, amelynek tartalmát jogszerűen nézheted.</div>`,
  },
  {
    id: 'custom-channels',
    cat: 'lists',
    title: 'Saját csatorna hozzáadása',
    keywords: 'csatorna hozzáadás saját adás url egyedi stream kipróbálás user-agent referer fejléc',
    body: `
<p>Egyetlen adást is felvehetsz, lista nélkül: profilmenü → <b>Csatorna hozzáadása</b>, vagy Beállítások → Csatornalisták → <b>Csatorna hozzáadása</b>.</p>
<h2>Mezők</h2>
<table class="help-table">
<tr><td><b>Név</b> *</td><td>Ahogy a felületen látszani fog.</td></tr>
<tr><td><b>Az adás címe</b> *</td><td>A <b>közvetlen</b> adáscím: HLS (<code>.m3u8</code>), MPEG-TS (<code>.ts</code>), FLV, DASH (<code>.mpd</code>) vagy MP4. Egy weboldal címe (ahol a lejátszó van) nem működik.</td></tr>
<tr><td><b>Logó címe</b></td><td>Egy kép címe (PNG, JPG, SVG). Ha üres, a név kezdőbetűi jelennek meg.</td></tr>
<tr><td><b>Kategória</b>, <b>Ország</b></td><td>Ezek alapján kerül a megfelelő sorokba és szűrőkbe.</td></tr>
<tr><td><b>Haladó: User-Agent, Referer</b></td><td>Egyes szerverek csak bizonyos böngészőazonosítóval vagy hivatkozó oldallal adnak képet. Ha a forrásnál ilyet látsz (pl. <code>#EXTVLCOPT:http-referrer=…</code>), itt add meg.</td></tr>
</table>
<p>A <b>Kipróbálás</b> gomb mentés nélkül elindítja az adást – így előre ellenőrizheted, hogy működik-e. A <b>Mentés</b> után a csatorna a főoldal <i>Saját csatornák</i> sorában, a Böngészésben és a keresésben is megjelenik, kedvencnek jelölhető, és csatornaszámot kaphat.</p>
<p>Szerkesztés, lejátszás, törlés: Beállítások → Csatornalisták → Saját csatornák.</p>
<div class="note">Tévén a User-Agent / Referer fejlécet a beépített lejátszó nem mindig veszi figyelembe.</div>
${go('#/settings?section=lists', 'Saját csatornák kezelése')}`,
  },
  {
    id: 'm3u-format',
    cat: 'lists',
    title: 'Az M3U lejátszólista formátum',
    keywords: 'm3u formátum extinf tvg-id tvg-logo group-title extvlcopt szerkezet példa',
    body: `
<p>Az M3U egyszerű szöveges fájl: minden adást egy <code>#EXTINF</code> leíró sor és utána a cím sora ír le.</p>
<pre class="code">#EXTM3U x-tvg-url="https://példa.hu/musor.xml.gz"
#EXTINF:-1 tvg-id="M1.hu" tvg-logo="https://…/m1.png" group-title="News",M1 (1080p)
https://…/m1/index.m3u8
#EXTINF:-1 tvg-logo="https://…/logo.png" group-title="Sports",Saját sportcsatorna [Geo-blocked]
#EXTVLCOPT:http-referrer=https://oldal.hu/
#EXTVLCOPT:http-user-agent=Mozilla/5.0 …
https://…/sport/playlist.m3u8</pre>
<table class="help-table">
<tr><td><code>x-tvg-url</code></td><td>(fejléc) a lista saját műsorújsága – a program ezt is betölti.</td></tr>
<tr><td><code>tvg-id</code></td><td>A csatorna azonosítója; ez alapján párosul a csatornaadatokhoz és a műsorújsághoz.</td></tr>
<tr><td><code>tvg-logo</code></td><td>A logó címe.</td></tr>
<tr><td><code>group-title</code></td><td>Kategória (angolul: News, Sports, Movies, Kids, Music…; pontosvesszővel több is).</td></tr>
<tr><td>A vessző utáni szöveg</td><td>A csatorna neve; a <code>(1080p)</code> minőségként, a <code>[Geo-blocked]</code> és <code>[Not 24/7]</code> jelzésként értelmeződik.</td></tr>
<tr><td><code>#EXTVLCOPT</code>, <code>http-referrer</code>, <code>http-user-agent</code></td><td>Az adáshoz szükséges HTTP-fejlécek.</td></tr>
</table>
<p>Az azonos <code>tvg-id</code>-jű sorok egy csatorna több forrásaként jelennek meg.</p>`,
  },
  {
    id: 'health',
    cat: 'lists',
    title: 'Elérhetőség-ellenőrzés',
    keywords: 'ellenőrzés működik pötty elérhető halott link nem elérhető elrejtés teljes',
    body: `
<p>Az ingyenes listák adásainak egy része időnként vagy véglegesen leáll. Az Adás ezért ellenőrzi, melyik működik:</p>
<ul>
<li><b>Automatikusan</b>: a képernyőn megjelenő csatornák forrásait (csatornánként legfeljebb négyet) a háttérben kipróbálja, 12 óránként újra. Kikapcsolható: Beállítások → Csatornalisták → Elérhetőség-ellenőrzés.</li>
<li><b>Úgy, ahogy a lejátszó látja</b>: nem elég, hogy a szerver válaszol – a program a lejátszólistán át egy valódi videórészlet elejét is letölti. Így a földrajzilag korlátozott, lejárt vagy éppen üres (nem sugárzó) adás is <b>Offline</b> / <b>Adásszünet</b> jelzést kap.</li>
<li><b>Lejátszáskor</b>: ami elindul, működőnek, ami nem, hibásnak jelölődik. Egy sikertelen lejátszást a háttérellenőrzés 12 órán át nem írhat felül „működőre”.</li>
<li><b>Gyors váltás</b>: ha egy forrás 6 másodpercen belül nem válaszol, a lejátszó a következőre lép; több forrásnál a többit közben párhuzamosan kipróbálja, és 3 másodperc után átvált egy biztosan élőre.</li>
<li><b>Teljes ellenőrzés</b>: Beállítások → Csatornalisták → Elérhetőség-ellenőrzés → <b>Minden adás ellenőrzése</b> – az összes (több mint tízezer) forrást végigpróbálja, néhány perc alatt; folyamatjelzővel, leállítható.</li>
<li><b>Az adatlapon</b>: <i>Források ellenőrzése</i> – az adott csatorna összes forrása azonnal.</li>
</ul>
<p>A <b>Nem elérhető csatornák elrejtése</b> (Beállítások → Tartalom és gyerekek → Tartalom) bekapcsolásával a hibásnak talált csatornák eltűnnek a listákból. Az <b>Eredmények törlése</b> mindent „nem ellenőrzöttre” állít.</p>
<div class="note">Ritkán előfordul, hogy egy „működő” adás mégsem indul (pl. a gép nem tudja dekódolni a videó formátumát) – ezt az első sikertelen lejátszás után jelöli. Egy „hibás” adás később újra elérhető lehet. Böngészőben futtatva az ellenőrzés nem érhető el.</div>`,
  },

  // ===================================================================== Tévé
  {
    id: 'android',
    cat: 'tv',
    title: 'Android: telefon, tablet, Android TV',
    keywords: 'android telefon mobil tablet android tv google tv shield xiaomi box apk telepítés',
    body: `
<p>Az androidos változat egyetlen <code>.apk</code> fájl (<code>dist-android/Adas-…apk</code>), amely telefonon, tableten és <b>Android TV-n / Google TV-n</b> is fut (Android 6.0 vagy újabb). Tévén a tévés, távirányítós felület indul.</p>
<h2>Telepítés</h2>
<ul>
<li><b>Telefonon / tableten</b>: másold át az APK-t, és nyisd meg. Első alkalommal engedélyezni kell, hogy a fájlkezelő (vagy böngésző) alkalmazásokat telepíthessen („ismeretlen források”).</li>
<li><b>Android TV-n</b>: a legegyszerűbb a <i>Send files to TV</i> alkalmazás (telefonról küldöd át), vagy pendrive + fájlkezelő. A tévén is engedélyezni kell az ismeretlen forrásból telepítést (Beállítások → Rendszer / Biztonság).</li>
</ul>
<h2>Kezelés</h2>
<ul>
<li>Telefonon alul ikonos menüsáv; lejátszáskor a kép teljes képernyős, elforgatva fekvő módban is nézhető. Az első koppintás a vezérlőket hozza elő.</li>
<li>Tévén: <b>OK</b> = lejátszás, <b>hosszan nyomott OK</b> egy csatornán = adatlap (kedvenc, emlékeztető, források), <b>Vissza</b> = vissza (a főoldalon kilépés). Ha a távirányítón van színes gomb, CH+/CH− vagy ◀◀ / ▶▶, azok ugyanúgy működnek, mint az LG változatban.</li>
</ul>
<h2>Háttérlejátszás</h2>
<ul>
<li><b>Háttérlejátszás (csak hang)</b>: Beállítások → Lejátszás → <i>Háttérlejátszás</i>. Bekapcsolva másik alkalmazásra váltva az adás hangja tovább szól; egy értesítés jelzi, onnan visszatérhetsz vagy leállíthatod. Kikapcsolva (alapból) kilépéskor a lejátszás megáll.</li>
</ul>
<div class="note">Androidon nincs kivetítés, éjszakai hang és frissítés-ellenőrzés. A beállítások kóddal szinkronizálhatók a számítógéppel és a többi Android-eszközzel, mindkét irányba (${t('transfer', 'Szinkronizálás eszközök között')}), és a telefon távirányítóként is használható (${t('remote', 'Távirányító telefonról')}). Új verziót az új APK telepítésével kapsz – a beállítások megmaradnak.</div>`,
  },
  {
    id: 'tv-install',
    cat: 'tv',
    title: 'Telepítés LG webOS tévére',
    keywords: 'lg webos tévé telepítés ipk fejlesztői mód developer mode ares',
    body: `
<p>A tévés változat egy <code>.ipk</code> csomag (<code>dist-webos/hu.adas.tv_…_all.ipk</code>), amely a 2018 után gyártott (webOS 4.0 vagy újabb) LG tévéken fut. Mivel nincs a bolti áruházban, <b>fejlesztői módban</b> telepíthető:</p>
<ol>
<li>Regisztrálj ingyenes fiókot a <b>developer.lge.com</b> oldalon.</li>
<li>A tévén: LG Content Store → telepítsd a <b>Developer Mode</b> alkalmazást, jelentkezz be, kapcsold be a <i>Dev Mode Status</i> és a <i>Key Server</i> kapcsolót, majd indítsd újra a tévét. Az alkalmazás kiírja a tévé IP-címét és jelszavát.</li>
<li>A számítógépen (Node.js szükséges) a projekt mappájában:
<pre class="code">npx ares-setup-device        (add hozzá a tévét: név „tv”, IP-cím, port 9922)
npx ares-novacom --device tv --getkey   (a jelszót a Developer Mode alkalmazás mutatja)
npm run webos:install -- --device tv
npm run webos:launch -- --device tv</pre></li>
</ol>
<p>Grafikus megoldás: a <b>webOS Dev Manager</b> asztali program → <i>Install from file</i> → a <code>.ipk</code> fájl.</p>
<div class="warn">A fejlesztői mód 50 óránként lejár; a Developer Mode alkalmazásban egy gombnyomással meghosszabbítható. Lejárat után a telepített alkalmazás eltűnik, és újra kell telepíteni.</div>`,
  },
  {
    id: 'tv-remote',
    cat: 'tv',
    title: 'A távirányító gombjai',
    keywords: 'távirányító színes gombok piros zöld sárga kék vissza ok magic remote',
    body: `
<table class="help-table keys">
<tr><td>Nyilak, <b>OK</b></td><td>Mozgás, kiválasztás, lejátszás</td></tr>
<tr><td><b>Vissza</b></td><td>Vissza / bezárás; a főoldalon kilépési kérdés</td></tr>
<tr><td><span class="key red">●</span> Piros</td><td>A kijelölt csatorna kedvenc be/ki (lejátszás közben az éppen nézett)</td></tr>
<tr><td><span class="key green">●</span> Zöld</td><td>Kijelölt csatornán: adatlap; máshol: műsorújság (lejátszás közben: adatlap)</td></tr>
<tr><td><span class="key yellow">●</span> Sárga</td><td>Keresés (lejátszás közben: minőség és forrás)</td></tr>
<tr><td><span class="key blue">●</span> Kék</td><td>Kedvencek (lejátszás közben: csatornalista-panel)</td></tr>
<tr><td><b>CH+ / CH−</b>, ↑ / ↓</td><td>Csatornaváltás lejátszás közben</td></tr>
<tr><td><b>0–9</b></td><td>Csatornaszám</td></tr>
<tr><td>▶ ❚❚ ■</td><td>Folytatás / szünet / lejátszás leállítása</td></tr>
</table>
<p>A <b>Magic Remote</b> mutatójával egérként is kezelhető minden.</p>`,
  },
  {
    id: 'tv-limits',
    cat: 'tv',
    title: 'Miben más a tévés változat?',
    keywords: 'tévé különbség korlát webos cors szolgáltatás',
    body: `
<ul>
<li><b>Lejátszás</b>: alapból a tévé beépített lejátszója játssza le a HLS adásokat; ha az nem boldogul, a hls.js-sel próbálja újra.</li>
<li><b>Letöltések</b>: a tévé böngészőmotorja más szerverekről (CORS-korlátozás miatt) nem enged közvetlenül letölteni, ezért a csomagban egy kis <b>háttérszolgáltatás</b> tölti le a műsorújságot és a nem engedélyező listákat, és ez ellenőrzi az adásokat is.</li>
<li><b>Nem érhető el</b>: mini lejátszó, teljes képernyő gomb (eleve teljes képernyő), fájlból / fájlba mentés, külső weboldal megnyitása, élő előnézet a főoldalon.</li>
<li>Az egyedi User-Agent / Referer fejlécet igénylő adások a beépített lejátszóval nem mindig indulnak el.</li>
<li>Az első indítás lassabb lehet (a tévé processzora gyengébb), utána a feldolgozott lista elmentődik.</li>
</ul>`,
  },

  // ===================================================================== Hibaelhárítás
  {
    id: 'trouble-playback',
    cat: 'trouble',
    title: 'Az adás nem indul el',
    keywords: 'nem indul nem működik hiba fekete kép nem érhető el időtúllépés geo',
    body: `
<p>Ingyenes, közösségi listáknál gyakori, hogy egy adás épp nem elérhető. Próbáld sorban:</p>
<ol>
<li><b>Újra</b> gomb – néha csak a szerver volt lassú.</li>
<li>Másik <b>forrás</b>: lejátszás közben ⚙ → Forrás, vagy az adatlapon egy másik ▶. ${t('quality', 'Részletek')}</li>
<li>Más <b>lejátszómotor</b>: Beállítások → Lejátszás → Lejátszómotor (Beépített ↔ hls.js). ${t('engines', 'Részletek')}</li>
<li><b>Földrajzi korlátozás</b> (🌐): egyes adások csak bizonyos országokból nézhetők. ${t('geo', 'Részletek')}</li>
<li><b>„Nem 0–24”</b> jelzés: a csatorna csak bizonyos időszakokban sugároz.</li>
<li>Frissítsd a csatornalistát (profilmenü → Csatornalista frissítése) – lehet, hogy az iptv-org közben új címet talált.</li>
<li>Kapcsold be a <b>Nem elérhető csatornák elrejtése</b> beállítást, hogy a halott csatornák ne zavarjanak.</li>
</ol>
<p>Ha egy adás tartósan nem működik, az a forrás hibája – ilyenkor a csatornát az iptv-org GitHub-oldalán lehet jelezni.</p>`,
  },
  {
    id: 'geo',
    cat: 'trouble',
    title: 'Földrajzi korlátozás (🌐)',
    keywords: 'földrajzi korlát geo geoblokk geo-blocked ország vpn 403 451 nem nézhető',
    body: `
<p>Sok csatorna a jogdíjak miatt csak a saját országából nézhető. Az Adás kétféleképpen jelzi ezt:</p>
<table class="help-table">
<tr><td><b>🌐 GEO-KORLÁT</b> (narancs címke a kártyán, „Földrajzi korlát – innen nem nézhető”)</td><td>Biztos: az adó innen <b>elutasította</b> a kérést (HTTP 403 vagy 451). Ezt a háttérben futó elérhetőség-ellenőrzés vagy egy lejátszási kísérlet derítette ki.</td></tr>
<tr><td><b>🌐</b> (kis jel a kártya sarkában, „Földrajzilag korlátozott lehet”)</td><td>A lista szerint a csatorna minden forrása korlátozott, de innen még nem próbáltuk. Sok ilyen adás mégis működik – ha egyszer elindult, a jel eltűnik.</td></tr>
</table>
<p>Ha egy korlátozott adást indítasz, a lejátszó ezt külön kiírja (nem csak annyit, hogy „nem érhető el”). Más országban, vagy egy ottani VPN-nel működhet.</p>
<p><b>Szűrés:</b> a Böngészés oldalon a <i>Földrajzi korlát</i> választóval elrejtheted a korlátozottakat, vagy csak azokat mutathatod.</p>
<div class="note">A 403-as választ néha nem az ország, hanem más ok (pl. lejárt hozzáférés) váltja ki – ilyenkor is a „földrajzi korlát” jelzés jelenik meg, mert kívülről a kettő nem különböztethető meg.</div>
${go('#/browse?geo=hide', 'Csatornák földrajzi korlát nélkül')}`,
  },
  {
    id: 'stream-info',
    cat: 'watch',
    title: 'Adás adatai (minőség, sebesség)',
    keywords: 'adás adatai statisztika bitráta sebesség sávszélesség felbontás minőség puffer késés eldobott képkocka kodek hálózat d billentyű',
    body: `
<p>Lejátszás közben a <b>⚙ Minőség és forrás → 📊 Adás adatai</b> menüponttal (vagy a <kbd>D</kbd> billentyűvel) egy átlátszó panel nyílik, amely másodpercenként frissül:</p>
<table class="help-table">
<tr><td><b>Lejátszó</b>, <b>Kiszolgáló</b></td><td>Melyik lejátszómotor játssza (hls.js, beépített, lejátszási híd…), és melyik szerverről jön az adás (🔒: titkosított kapcsolat).</td></tr>
<tr><td><b>Felbontás</b>, <b>Kodekek</b>, <b>Bitráta</b></td><td>A kép mérete (SD / HD / Full HD / 4K) és képkockasebessége; az adás adatmennyisége másodpercenként. Ha a lista nem adja meg, a letöltött részekből mérjük („mért”).</td></tr>
<tr><td><b>Mért letöltési sebesség</b></td><td>Amilyen gyorsan a szerver ténylegesen küld – és ez a bitráta hányszorosa. 1,3× alatt (narancs) a kapcsolat vagy a szerver épphogy bírja: ebből lesz az akadás.</td></tr>
<tr><td><b>Puffer</b>, <b>Késés az élőtől</b></td><td>Hány másodpercnyi adás van már letöltve előre (3 mp alatt narancs), és mennyivel jár az élő adás mögött.</td></tr>
<tr><td><b>Eldobott képkockák</b></td><td>Ha sok (5% felett), az eszköz nem bírja a dekódolást – kisebb minőség segít.</td></tr>
<tr><td><b>Akadás</b></td><td>Hányszor és mennyi ideig állt meg a kép, mióta a panel nyitva van.</td></tr>
<tr><td><b>Hálózat</b></td><td>A rendszer becslése a kapcsolatról (típus, sebesség, válaszidő), ahol ezt elárulja.</td></tr>
</table>
<p>Ha valami gyanús, a panel alján egy ⚠ sor tanácsot is ad (pl. kisebb minőség vagy másik forrás).</p>`,
  },
  {
    id: 'trouble-buffering',
    cat: 'trouble',
    title: 'Akadozik, pufferel a kép',
    keywords: 'akadozik pufferel lassú szaggat töltés minőség internet',
    body: `
<p>Hogy mi a gond, azt az <b>Adás adatai</b> panel mutatja meg (lejátszás közben <kbd>D</kbd>): ha a mért letöltési sebesség alig nagyobb a bitrátánál, a szerver vagy a kapcsolat lassú. ${t('stream-info', 'Részletek')}</p>
<ul>
<li>Állíts be <b>alacsonyabb minőséget</b> (⚙ → Minőség), különösen mobilneten vagy gyenge wifin.</li>
<li>Próbálj <b>másik forrást</b> – egy másik szerver gyorsabb lehet.</li>
<li>Ha az adás megáll, a program magától a következő forrásra vált (ha be van kapcsolva a tartalék forrás): <b>10 másodperc</b> után, ha van még ki nem próbált forrás – különben 30 másodpercig vár, hátha az adás magától folytatódik.</li>
<li>Távoli országok szerverei lassabbak lehetnek; ez nem a program hibája.</li>
<li>A háttérben futó automatikus elérhetőség-ellenőrzés lejátszás közben magától szünetel. A kézzel indított <i>Minden adás ellenőrzése</i> viszont fut tovább – azt lejátszás közben érdemes leállítani.</li>
</ul>
<p>Az élő adásokat a lejátszó kb. 4 résznyivel (jellemzően 20–30 mp-cel) az élő adás mögött indítja: így van tartalék, ha a szerver egy pillanatra lelassul – a legfrissebb, még készülő részt sok szerver csak lassan küldi.</p>`,
  },
  {
    id: 'trouble-epg',
    cat: 'trouble',
    title: 'Nincs műsoradat egy csatornánál',
    keywords: 'nincs műsor műsorújság üres epg hiányzik párosítás',
    body: `
<p>A nyilvános műsorújság-források csak a csatornák egy részét fedik le – elsősorban a magyar és a nagyobb nemzetközi csatornákat. Amit tehetsz:</p>
<ul>
<li>Kapcsold be a csatorna országának forrását: Beállítások → Műsorújság (pl. Németország, Egyesült Királyság, Pluto TV). ${t('epg-sources', 'Források')}</li>
<li>Adj hozzá saját XMLTV forrást, ha ismersz olyat, amely tartalmazza a csatornát.</li>
<li>Nézd meg a forrás sorában, hány csatornát párosított, és nem írt-e ki hibát.</li>
<li>Frissítsd a műsorújságot (<i>Műsorújság frissítése most</i>).</li>
</ul>
<p>A párosítás a csatorna azonosítója és neve alapján történik; ha egy forrás egészen más néven tartja nyilván a csatornát, nem tudja összekötni.</p>`,
  },
  {
    id: 'trouble-list',
    cat: 'trouble',
    title: 'Nem töltődik be a csatornalista / lassú az indulás',
    keywords: 'nem töltődik betöltés hiba lassú indulás internet újrapróbálás letöltés',
    body: `
<ul>
<li>Ellenőrizd az internetkapcsolatot, majd nyomd meg az <b>Újrapróbálás</b> gombot.</li>
<li>Ha a letöltés nem sikerül, a program a korábban letöltött (régebbi) listát használja, ha van ilyen.</li>
<li>Az első indítás 20–40 másodperc is lehet; a következők az elmentett lista miatt gyorsak.</li>
<li>Ha a fő listát lecserélted, és nem működik: Beállítások → Csatornalisták → <i>Alapértelmezett (iptv-org)</i>.</li>
<li>Furcsa, „beragadt” állapot esetén: Beállítások → Profilok és mentés → <b>Gyorsítótár törlése</b>, majd indítsd újra a programot.</li>
</ul>`,
  },
  {
    id: 'trouble-browser',
    cat: 'trouble',
    title: 'Böngészőben megnyitva nem működik',
    keywords: 'böngésző chrome firefox cors index.html web',
    body: `
<p>Az Adás felülete (<code>src/index.html</code>) sima böngészőben is megnyitható, de ott a böngésző biztonsági szabályai (CORS) miatt a legtöbb adás és a műsorújság nem tölthető be, és az elérhetőség-ellenőrzés sem működik. Ez a mód csak a fejlesztést segíti.</p>
<p>A teljes funkcionalitáshoz használd az <b>asztali alkalmazást</b> (Windows <code>.exe</code>, macOS <code>.dmg</code>, Linux <code>AppImage</code> / <code>.deb</code>) vagy a <b>tévés változatot</b>.</p>`,
  },
  {
    id: 'faq',
    cat: 'trouble',
    title: 'Gyakori kérdések',
    keywords: 'gyik kérdés legális ingyenes fizetős miért duplikált eltűnt csatorna',
    body: `
<h3>Ingyenes? Kell hozzá előfizetés?</h3>
<p>Igen, ingyenes. A program nyilvánosan, ingyenesen elérhető adásokat gyűjt össze; fiók és előfizetés nem kell.</p>
<h3>Legális?</h3>
<p>Az iptv-org csak nyilvánosan elérhető, ingyenes adásokat gyűjt, a szerzői jogi panaszokra eltávolítja a csatornákat. Saját lista hozzáadásakor neked kell gondoskodnod arról, hogy a tartalmat jogszerűen nézheted.</p>
<h3>Miért tűnt el egy csatorna?</h3>
<p>A közösségi listából eltávolíthatták (megszűnt, megváltozott a címe, vagy jogi okból). Ha a címét ismered, felveheted saját csatornaként. ${t('custom-channels', 'Hogyan?')}</p>
<h3>Miért szerepel egy csatorna kétszer?</h3>
<p>Ha egy saját lista ugyanazt a csatornát tartalmazza, mint a fő lista, mindkettő megjelenik (a saját lista neve az adatlapon látszik).</p>
<h3>Miért nincs csatornaszám egy csatornánál?</h3>
<p>Csatornaszámot a kedvencek és a hazai ország csatornái kapnak. Jelöld kedvencnek, és a Kedvencek oldalon rendezd a kívánt helyre.</p>
<h3>Rögzíteni tudok műsort?</h3>
<p>Nem, a program csak élő adást játszik le.</p>
<h3>Hol vannak az adataim?</h3>
<p>${t('privacy', 'Adatok és adatvédelem')}</p>`,
  },

  // ===================================================================== Extrák
  {
    id: 'timeshift',
    cat: 'watch',
    title: 'Élő adás megállítása és visszatekerése',
    keywords: 'időcsúsztatás timeshift szünet visszatekerés élő puffer ugrás élőbe dvr',
    body: `
<p>Élő adásnál a lejátszó <b>megjegyzi a már letöltött adást</b> (legfeljebb kb. 30 percet, a memória függvényében), így:</p>
<ul>
<li><b>Szünet</b>: az adás közben tovább töltődik, folytatáskor onnan nézed, ahol megállítottad.</li>
<li><b>Visszatekerés</b>: a vezérlősáv <b>30</b> feliratú gombjaival, <kbd>Shift</kbd>+<kbd>←</kbd>/<kbd>→</kbd>-vel, a távirányító ◀◀ / ▶▶ gombjával 30 másodpercenként, vagy az <b>idősávon</b> húzva.</li>
<li><b>Ugrás élőbe</b>: ha lemaradtál, az idősáv bal oldalán megjelenik az <i>Ugrás élőbe</i> gomb és a lemaradás (pl. −2:15); a jobb felső <b>ÉLŐ</b> jelzés ilyenkor szürke. Billentyűzeten: <kbd>End</kbd>.</li>
</ul>
<p>Visszatekerni csak addig lehet, ameddig a lejátszó az adást már letöltötte – a csatornára kapcsoláskor a puffer üres, és percről percre nő.</p>
<div class="note">A tévék beépített lejátszója (webOS) maga dönt arról, mennyit tárol; ott a visszatekerés az adótól függően rövidebb lehet vagy hiányozhat.</div>`,
  },
  {
    id: 'sportwatch',
    cat: 'watch',
    title: 'Sportfigyelő',
    keywords: 'sport sportfigyelő bajnokság csapat meccs eredmény foci tenisz kézilabda vízilabda forma-1 disc golf world chase tag sakk darts esport naptár ics thesportsdb espn csatorna',
    body: `
<p>A Sportfigyelő bármilyen sportág, bajnokság, csapat vagy verseny követésére való; a főoldal <b>Sport</b> egysége ezek élő, friss és következő eseményeit mutatja. Megnyitása: a Sport egység fejlécében a <i>Sportfigyelő ›</i>, vagy Beállítások → Főoldal → <i>Sportfigyelő megnyitása</i>.</p>
<p>Az ablak fülei:</p>
<table class="help-table">
<tr><td><b>Követett</b></td><td>Minden, amit figyelsz, sportáganként csoportosítva. Egyenként ki-be kapcsolható vagy törölhető.</td></tr>
<tr><td><b>Bajnokságok</b></td><td>Több mint 350 bajnokság és torna 17 sportágban (foci, kosárlabda, jégkorong, tenisz, golf, Forma-1, MMA, rögbi, krikett, röplabda…) – keresővel és sportág-szűrővel. Követhető az egész bajnokság, vagy a <i>Csapat…</i> gombbal csak egy csapat meccsei. Forrás: ESPN (kulcs nélkül, eredményekkel).</td></tr>
<tr><td><b>Sportágak a tévében</b></td><td><b>Bármilyen</b> sportág vagy játék a műsorújság alapján: kézilabda, vízilabda, disc golf, World Chase Tag, sakk, darts, snooker, e-sport, lovaglás… Egy kattintás a sportág csempéjére, vagy saját kulcsszó (pl. <i>Fradi</i>, <i>Tour de France</i>, <i>Wimbledon</i>). Ezek a látható csatornák műsorában keresnek, így mindig nézhető közvetítést adnak.</td></tr>
<tr><td><b>Naptár</b></td><td>Bármilyen verseny- vagy sorsolásnaptár (.ics / webcal cím), amit egy szövetség, klub vagy oldal közzétesz – pl. disc golf tornák, helyi bajnokságok.</td></tr>
<tr><td><b>Beállítások</b></td><td>Hány napra visszamenőleg és előre mutassa az eseményeket; csatornaajánlás be/ki; nem kötelező TheSportsDB-kulcs (további bajnokságok, pl. NB I).</td></tr>
</table>
<h2>Csatornaajánlás</h2>
<p>Minden eseménynél a program megkeresi a műsorújságban, melyik csatornán látható (a csapatnevek, a bajnokság és a sportág alapján, az időponthoz igazítva), és a sorban egy <b>📺 csatorna</b> gomb jelenik meg – rákattintva indul az adás. A bizonytalan találat halványabb. Csak műsorújsággal rendelkező, nem rejtett csatornák jöhetnek szóba; a kedvencek és a sportcsatornák előnyt kapnak.</p>
<div class="note">Az eredmények kb. 5 percenként frissülnek. Ha egy bajnokság nem tölthető be, a Sport egység alján jelzi.</div>`,
  },
  {
    id: 'multiview',
    cat: 'watch',
    title: 'Több adás egyszerre',
    keywords: 'több adás multiview osztott képernyő 2 4 ablak sport hírek egyszerre',
    body: `
<p>Két vagy négy csatornát nézhetsz egyszerre – például több sportközvetítést vagy híradót. Megnyitása: a lejátszó <b>▦</b> gombja (vagy <kbd>V</kbd>), illetve a profilmenü <i>Több adás egyszerre</i> pontja.</p>
<ul>
<li>A <b>kijelölt</b> (színes keretes) ablak szól, a többi némítva fut. Váltás: nyilak, <kbd>1</kbd>–<kbd>4</kbd>, vagy kattintás.</li>
<li><kbd>OK</kbd> / ⇄: másik csatorna az ablakba (kereséssel), ✕: ablak ürítése.</li>
<li><kbd>F</kbd>, dupla kattintás vagy ⤢: a kijelölt csatorna teljes képernyőn; onnan fel/le a többképes nézet csatornái között váltasz.</li>
<li>A kezdő csatornák: amelyikből indítottad, majd a kedvenceid.</li>
</ul>
<div class="note">Négy adás egyszerre jelentős sávszélességet és processzort igényel. Tévén legfeljebb két ablak érhető el.</div>`,
  },
  {
    id: 'cast',
    cat: 'watch',
    title: 'Kivetítés tévére (Chromecast, DLNA)',
    keywords: 'kivetítés cast chromecast dlna upnp tévé smart tv google tv lejátszás másik eszközön',
    body: `
<p>Az asztali változatból az adást vagy filmet <b>Chromecastra</b>, Google TV-re, illetve <b>DLNA-képes</b> okostévére vagy médialejátszóra küldheted. A lejátszó vezérlősávján a kivetítés ikonra kattintva a program megkeresi az eszközöket a helyi hálózaton.</p>
<ul>
<li>Kivetítés közben a gépen a vezérlők maradnak: szünet / folytatás, csatornaváltás (fel/le), hangerő, leállítás. A film onnan folytatódik a tévén, ahol itt tartott.</li>
<li>A <b>Kivetítés leállítása</b> után a lejátszás a gépen folytatódik.</li>
<li>Az adást ez a gép továbbítja a tévének (így a különleges fejlécet vagy CORS-t igénylő adások is működnek) – ezért a kivetítés alatt maradjon bekapcsolva, és ugyanazon a hálózaton legyen.</li>
</ul>
<h2>Ha nem talál eszközt</h2>
<ul>
<li>Első használatkor a <b>Windows tűzfal</b> engedélyt kér – engedélyezd a <i>magánhálózaton</i>.</li>
<li>A gép és a tévé ugyanazon a Wi-Fi-n / routeren legyen (a vendéghálózat általában elszigetelt).</li>
<li>DLNA-nál a tévén legyen bekapcsolva a médiamegosztás / „DLNA-renderelő” (LG: <i>Beállítások → Általános → Eszközök → Képernyőtükrözés / DLNA</i>).</li>
</ul>
<div class="note">Nem minden eszköz játszik le minden formátumot: a Chromecast a HLS-t és az MP4-et jól kezeli, sok DLNA-tévé viszont csak MP4-et vagy MPEG-TS-t. Ha az eszköz hibát jelez, próbálj másik forrást (⚙ → Forrás).</div>`,
  },
  {
    id: 'night-audio',
    cat: 'watch',
    title: 'Éjszakai hang',
    keywords: 'éjszakai hang halk kompresszor párbeszéd beszéd érthetőség hangos reklám dinamika',
    body: `
<p>Az <b>éjszakai hang</b> letompítja a hangos részeket (zene, robbanás, reklám), és kiemeli a halk párbeszédet – hogy halkan is érthető legyen, és ne ébredjen fel senki.</p>
<ul>
<li>Bekapcsolás lejátszás közben: <b>CC</b> gomb → <i>Hang és felirat</i> → <i>Éjszakai hang</i>.</li>
<li>Profilonként alapértelmezetté teheted: Beállítások → Feliratok és információk → Magyar információk és feliratok → <i>Éjszakai hang</i>.</li>
</ul>
<div class="note">Az asztali változatban érhető el.</div>`,
  },
  {
    id: 'parental',
    cat: 'personal',
    title: 'Szülői felügyelet és profilzár (PIN)',
    keywords: 'pin profilzár szülői felügyelet gyerek zár jelszó kód gyerekprofil kilépés',
    body: `
<p>Bármelyik profilhoz beállíthatsz egy <b>4 jegyű PIN-kódot</b>: Profilok kezelése → a profil szerkesztése → <i>Profilzár (PIN-kód)</i>. A zárolt profilt a „Ki nézi?” képernyőn 🔒 jelzi, és csak a PIN-nel lehet megnyitni.</p>
<h2>Gyerekprofil</h2>
<p>Ha legalább egy <b>felnőtt profilnak van PIN-je</b>, akkor a gyerekprofilból:</p>
<ul>
<li>csak a PIN megadásával lehet másik profilra váltani,</li>
<li>a <b>Beállítások</b> és a <b>Profilok kezelése</b> csak felnőtt PIN-nel nyílik meg (a jóváhagyás 10 percig érvényes),</li>
<li>a felnőtt tartalom és a nem gyerekeknek való csatornák továbbra sem jelennek meg.</li>
</ul>
<p>A PIN a távirányító számgombjaival vagy a képernyőn megjelenő számbillentyűzettel is beírható. Öt hibás próbálkozás után fél percig várni kell.</p>
<h2>Elfelejtett PIN</h2>
<p>Egy másik felnőtt profilból (Profilok kezelése) bármelyik profil PIN-je törölhető. Ha nincs ilyen profil, az alkalmazás adatainak törlésével minden visszaáll az alapállapotra. ${t('privacy', 'Hol vannak az adatok?')}</p>
<div class="note">A PIN a gyerekek elől véd ezen az eszközön; nem titkosítás.</div>`,
  },
  {
    id: 'continue',
    cat: 'vod',
    title: 'Folytatás (VOD)',
    keywords: 'folytatás félbehagyott film rész sorozat főoldal sor továbbnézés',
    body: `
<p>A VOD oldal <b>Folytatás</b> sora egy helyen mutatja a félbehagyott filmeket és sorozatrészeket – a beépített és saját film- és sorozatlistákból, valamint a saját médiatárból is. (A tévés főoldalon nincs ilyen sor: ott csak csatornák vannak.) A legutóbb nézett van elöl.</p>
<p>Sorozatnál a kártya arra a részre visz, ahol tartasz (vagy a következőre, ha az előzőt befejezted). </p>`,
  },
  {
    id: 'stats',
    cat: 'personal',
    title: 'Nézési statisztika',
    keywords: 'statisztika nézési idő mennyit nézek tévét kedvenc csatorna grafikon óra nap',
    body: `
<p>A profilmenü <i>Nézési statisztika</i> pontja megmutatja, mennyit és mikor nézel tévét: ma, az elmúlt héten és hónapban, napi bontásban, napszakonként; a legtöbbet nézett csatornákat, kategóriákat, filmeket és sorozatokat.</p>
<ul>
<li>Profilonként külön számolódik, csak a ténylegesen lejátszott idő (szünet nélkül).</li>
<li>Az adatok csak ezen az eszközön tárolódnak. A statisztika oldalán a gyűjtés kikapcsolható és törölhető.</li>
</ul>
${go('#/stats', 'Statisztika megnyitása')}`,
  },
  {
    id: 'transfer',
    cat: 'personal',
    title: 'Szinkronizálás eszközök között (kóddal)',
    keywords: 'átvitel átadás tévére beállítások másolás kód cím szinkron szinkronizálás export import tv android telefon asztali',
    body: `
<p>Az asztali gép, az Android TV és az Android telefon között egy kóddal viheted át a beállításokat (listák, profilok, kedvencek, előzmények, emlékeztetők, főoldal) a helyi hálózaton – bármelyik irányba:</p>
<ol>
<li>Azon az eszközön, <b>amelyiknek a beállításait át akarod venni</b>: Beállítások → <i>Szinkron eszközök között</i> → <b>Kód kérése</b>. Megjelenik egy 6 jegyű kód (pl. <code>123 456</code>). Kérésre a kulcsok és jelszavak is átmennek.</li>
<li>A <b>másik eszközön</b>: ugyanitt a <i>Szinkronizálás kóddal</i> mezőbe írd be a kódot, majd <b>Szinkronizálás</b>. Az eszköz magától megkeresi a kódot adó eszközt a hálózaton, és átveszi a beállításait (jóváhagyás után).</li>
</ol>
<p>A kód 15 percig érvényes; 10 hibás próbálkozás után leáll, ilyenkor kérj újat. A két eszköz legyen ugyanazon a (otthoni) hálózaton; a Windows tűzfal első alkalommal engedélyt kérhet – a magánhálózaton engedélyezd.</p>
<p><b>Csak a profilok</b>: a mostani beállítások és listák megmaradnak, a beérkező profilok hozzáadódnak (ami már megvan, frissül).</p>
<p>A <i>Haladó</i> résznél megadhatod a másik eszköz címét is (ha más alhálózaton van), vagy webcímről (pl. a NAS-ra feltöltött mentésből) is betöltheted a beállításokat – ilyenkor a teljes címet írd be, kód nélkül.</p>
${go('#/settings?section=transfer', 'Szinkronizálás eszközök között')}`,
  },
  {
    id: 'remote',
    cat: 'personal',
    title: 'Távirányító telefonról',
    keywords: 'távirányító telefon mobil böngésző vezérlés pin qr kód hálózat csatornaváltás hangerő érintőpad keresés',
    body: `
<p>Az asztali alkalmazás és az Android (TV) változat a telefonodról – vagy bármelyik eszköz böngészőjéből – is vezérelhető ugyanazon a (otthoni) hálózaton:</p>
<ol>
<li>Beállítások → Távirányító és billentyűk → <b>Távirányító telefonról</b> → kapcsold be. Megjelenik egy <b>QR-kód</b>, egy cím (pl. <code>http://192.168.1.20:47800/adas/remote</code>) és egy 4 jegyű PIN.</li>
<li>Olvasd be a QR-kódot a telefon kamerájával: a vezérlő megnyílik, és a PIN-t is megkapja. (Vagy nyisd meg a címet a böngészőben, és írd be a PIN-t – a telefon megjegyzi.) Tipp: tedd ki a lapot a kezdőképernyőre, így alkalmazásként indul.</li>
</ol>
<p>Felül mindig látszik, mi megy éppen (logóval, a műsor haladásával és a következő műsorral). A vezérlő három fülből áll:</p>
<table class="help-table">
<tr><td><b>🎮 Vezérlő</b></td><td><b>Érintőpad</b>, két módban (fölötte váltható, a telefon megjegyzi): <b>🖱 Egér</b> – húzással egy egérkurzort mozgatsz a gép / tévé képernyőjén (lassú mozdulat = pontos, gyors = nagy ugrás), koppintás = kattintás, <b>két ujjal húzva görgetés</b> (a kurzor alatti sorban vízszintesen is), a kurzor alatti elem ki is jelölődik; <b>✥ Nyilak</b> – húzásra a kijelölés lép (mint a nyilak), koppintás = OK. Mindkettőben: hosszan nyomva = Vissza. A kijelölés kerete távirányítós használatkor mindig látszik. Alatta: Vissza, Főoldal, Adatlap; tekerés (±10 / ±30 mp – élő adásnál időcsúsztatás); szünet; CH ▲ / ▼, Előző csatorna, némítás, <b>hangerő-csúszka</b>; Felirat, Minőség, Csatornalista, Teljes képernyő; nyilak és csatornaszám.</td></tr>
<tr><td><b>📺 Csatornák</b></td><td><b>Kereső</b> az összes csatorna között (gépelés közben szűr, a most futó műsort is mutatja), a kedvenceid és a legutóbb nézett csatornák – egy érintéssel indulnak.</td></tr>
<tr><td><b>☰ Továbbiak</b></td><td>Ugrás bármelyik oldalra (TV, Műsorújság, Kedvencek, VOD, Felvételek, Böngészés, Súgó); <b>szöveg küldése</b> (a telefon billentyűzetével a kijelölt mezőbe gépel, vagy keresést indít); Adás adatai, Több adás egyszerre, elalvási időzítő.</td></tr>
</table>
<div class="note">A PIN-t bármikor újra lehet generálni (Új PIN) – a régi telefonnak újra be kell írnia. Rossz PIN-nel a vezérlő nem működik; sok hibás próbálkozás után lezár.</div>
${go('#/settings?section=remote', 'Távirányító telefonról')}`,
  },
  {
    id: 'recording',
    cat: 'watch',
    title: 'Felvétel',
    keywords: 'felvétel rögzítés felvenni mentés ütemezés videó ts vágás ráhagyás eleje vége',
    body: `
<p>Az asztali változatban (Windows, Mac, Linux) az élő adás felvehető – újrakódolás nélkül, eredeti minőségben, <code>.ts</code> fájlba, a <b>Videók / Adás felvételek</b> mappába.</p>
<ul>
<li><b>Azonnal</b>: lejátszás közben a vezérlősáv piros <b>●</b> gombjával; újra megnyomva leáll. Közben a gomb villog.</li>
<li><b>Ütemezve</b>: a műsorújságban egy műsor adatlapján <b>● Felvétel</b>. A felvétel <b>ráhagyással</b> indul és áll le – alapból 3 perccel a műsor előtt és 10 perccel utána, mert a tévé gyakran csúszik (Beállítások → Felvételek). Az Adásnak ekkor futnia kell (a tálcára rejtve is jó – Beállítások → Értesítések → Futás a háttérben); az indítás a tálcán is pontos.</li>
<li>Ha az adás felvétel közben <b>megszakad</b> (pl. akadozó szerver), a felvétel néhány másodperc múlva magától folytatódik ugyanabba a fájlba – a végén a „Felvétel kész” üzenet jelzi, hányszor szakadt meg.</li>
</ul>
<h2>Vágás</h2>
<p>A felvétel kártyáján a <b>✂</b> gomb nyitja a vágót: előnézet, idővonal (sárga jelek: a műsor kezdete és vége a műsorújság szerint), léptetés (±1 mp / ±10 mp / ±1 perc), <b>⇤ Kezdet ide</b> és <b>Vége ide ⇥</b> (vagy az <kbd>I</kbd> / <kbd>O</kbd> billentyű), az időpontok be is írhatók; a <b>Kijelölés a műsorújság szerint</b> gomb egy lépésben beállítja őket. A <b>✂ Vágás és mentés</b> után a felvétel helyén a vágott változat lesz – ezt játssza le az Adás, és ezt nyitja meg a külső lejátszó is.</p>
<p>Az <b>eredeti megmarad</b> (nem jelenik meg külön felvételként): újra megnyitva a vágót az eredetiből vághatsz újra (az előző kijelöléssel), vagy az <b>Eredeti visszaállítása</b> gombbal visszahozhatod a teljes felvételt. A vágott felvétel kártyáján a ✂ mellett pipa látszik. Törléskor mindkettő a Lomtárba kerül.</p>
<p>A felvételek a <b>TV → Felvételek</b> fülön vannak (csatornalogóval, dátummal, mérettel; az elkezdettek haladásjelzővel). A <b>▶ Lejátszás</b> az Adás saját lejátszójában indítja a felvételt – tekerhetően, a félbehagyott felvétel onnan folytatódik, ahol abbahagytad. A <b>⧉</b> gomb a gép videólejátszójában (pl. VLC) nyitja meg, a <b>✕</b> a Lomtárba teszi. Itt látod a most rögzített és az ütemezett felvételeket is; a legutóbbiak a Beállítások → Felvételek alatt is ott vannak.</p>
<div class="note">Csak a saját, otthoni nézésre: a felvett műsorok jogai a csatornáké. Néhány (titkosított vagy DRM-mel védett) adás nem rögzíthető.</div>
${go('#/recordings', 'Felvételek')}`,
  },
  {
    id: 'adaspack',
    cat: 'lists',
    title: 'Kiegészítő csomagok (.adaspack)',
    keywords: 'kiegészítő csomag adaspack adaspak tv vod lista beépített ai készítés packs mappa',
    body: `
<p>A kiegészítő csomag egy <b>lejátszólista egy fájlba csomagolva</b>, névvel és leírással. A <b>beépített listák között</b> jelenik meg (ki-be kapcsolható), de a programmal nem érkezik – csak azon az eszközön lesz meg, ahová betöltöd.</p>
<table class="help-table">
<tr><td><code>valami_tv.adaspack</code></td><td><b>Tévécsatornák</b> – Beállítások → Csatornalisták → Beépített listák.</td></tr>
<tr><td><code>valami_vod.adaspack</code></td><td><b>Filmek, sorozatok</b> – Beállítások → VOD és médiatár → VOD-listák → Beépített listák.</td></tr>
</table>
<h2>Betöltés</h2>
<ul>
<li><b>Kiegészítő csomag betöltése</b> gomb (Csatornalisták vagy VOD-listák) – a csomag maga dönti el, hová kerül.</li>
<li>Asztali változat: a <b>Csomagok mappája</b> (a felhasználói adatmappa <code>packs</code> almappája) tartalmát indításkor magától betölti, és ha a fájl változik, frissíti.</li>
<li>A mentés és az eszközök közti átvitel a csomagokat is viszi (pl. gépről a telefonra).</li>
<li>Azonos azonosítójú csomag újratöltése frissíti a régit; az <b>Eltávolítás</b> csak erről az eszközről törli.</li>
</ul>
<h2>Felépítés</h2>
<p>UTF-8 JSON: <code>{ "adasPack": 1, "kind": "tv" | "vod", "id": "pelda", "name": "Példa", "desc": "…", "off": false, "text": "#EXTM3U\\n…" }</code> – a <code>text</code> a teljes M3U-lista. Tévénél ajánlott a <code>tvg-id</code> (iptv-org azonosító: logó, ország, műsorújság), VOD-nál a <code>Cím (Év)</code> filmcím, a <code>Sorozat S01E02</code> részcím és az <code>adas-tags</code> műfajlista (a program műfajnevei, pl. <i>Akció;Dráma</i>).</p>
<h2>Készítés</h2>
<p>Kész M3U-listából: <code>node tools/make-pack.mjs lista.m3u8 --kind tv|vod --id pelda --name "Példa"</code>. Egy AI-asszisztens is elkészíti egy weboldal, táblázat vagy fájllista alapján: a pontos formátumleírás és egy beilleszthető AI-utasítás a forráskódban van (<code>docs/ADASPACK.md</code>).</p>
<button class="btn" data-ext="https://github.com/mesehordo/adas-iptv/blob/main/docs/ADASPACK.md">A teljes leírás és az AI-utasítás megnyitása</button>
<div class="note">Csak olyan tartalmat vegyél fel, amelyet jogszerűen nézhetsz.</div>`,
  },
  {
    id: 'update',
    cat: 'about',
    title: 'Frissítések',
    keywords: 'frissítés új verzió update letöltés telepítés github kiadás',
    body: `
<p>Az asztali változat (Windows, macOS, Linux) magától frissül a <b>GitHubról</b>, a hivatalos kiadásokból (<code>github.com/mesehordo/adas-iptv</code>). Beállítások → <b>Frissítés</b>:</p>
<ul>
<li><b>Frissítés keresése induláskor</b> (alapból be): minden indításkor megnézi, van-e új verzió; ha van, értesítést kapsz, és a <i>Frissítés</i> gombbal azonnal telepítheted. Ha nem szeretnéd, kapcsold ki – ilyenkor csak kérésre keres.</li>
<li><b>Frissítés keresése most</b>: azonnali keresés; új verziónál megjelennek a kiadási megjegyzések és a <b>Letöltés és telepítés</b> gomb.</li>
<li>A telepítés a telepítés módjához igazodik: telepítővel (Setup) telepítve az új telepítő indul, MSI-vel telepítve az új MSI, a <b>hordozható</b> változatnál a letöltött fájlt a megnyíló mappában találod (azt indítsd a régi helyett), Linuxon az AppImage magát cseréli le.</li>
<li><b>Frissítési forrás</b>: üresen a hivatalos kiadások. Megadható saját GitHub-tároló (<code>tulajdonos/tároló</code>) vagy egy JSON-fájl címe: <code>{ "version": "1.25.0", "url": "https://…/Adas-Setup-1.25.0.exe", "notes": "…" }</code>.</li>
</ul>
<div class="note">Az Android-változatot a GitHub-kiadás oldaláról letöltött új <code>.apk</code> telepítésével lehet frissíteni (a beállításaid megmaradnak).</div>
${go('#/settings?section=update', 'Frissítések')}`,
  },

  // ===================================================================== Egyéb
  {
    id: 'privacy',
    cat: 'about',
    title: 'Adatok és adatvédelem',
    keywords: 'adatvédelem adat tárolás hol követés fiók mappa',
    body: `
<ul>
<li>Nincs fiók, nincs regisztráció, nincs követés, és a program nem küld a használatodról adatot sehová.</li>
<li>Minden beállítás, profil és a letöltött listák <b>helyben</b> tárolódnak:
  <ul>
  <li>Windows: <code>%APPDATA%\\Adás</code></li>
  <li>macOS: <code>~/Library/Application Support/Adás</code></li>
  <li>Linux: <code>~/.config/Adás</code></li>
  <li>Tévén és Androidon: az alkalmazás saját tárhelyén.</li>
  </ul> ${t('backup', 'Mentés és költöztetés')}</li>
<li>A program a következő szerverekhez kapcsolódik: az iptv-org (csatornalista és adatok), a bekapcsolt műsorújság-források, a saját listáid címei, a csatornák logóit tároló szerverek, és lejátszáskor maguk az adások szerverei. Ezek – mint minden weboldal – láthatják az IP-címedet.</li>
<li>Kivetítéskor és a beállítások átadásakor az asztali változat egy kis kiszolgálót indít a <b>helyi hálózaton</b> (47800-as port körül). A továbbító csak egy véletlen, indításonként új kulccsal használható; a beállításokat csak a 15 percig érvényes kóddal lehet letölteni.</li>
<li>A nézési statisztika, a PIN-kódok és a beállítások sehova nem kerülnek elküldésre.</li>
</ul>`,
  },
  {
    id: 'about',
    cat: 'about',
    title: 'Névjegy és források',
    keywords: 'névjegy verzió forrás licenc iptv-org hls.js electron köszönet',
    body: `
<p><b>Adás</b> – élő TV lejátszó streaming-szolgáltatás stílusú felülettel, Windowsra, macOS-re, Linuxra és LG webOS tévére. MIT licenc.</p>
<h2>Adatforrások</h2>
<ul>
<li><b>iptv-org/iptv</b> és <b>iptv-org/api</b> – csatornalista, csatornaadatok, logók (közösségi, nyilvános).</li>
<li>Műsorújság: <b>iptv-epg.org</b>, <b>epgshare01.online</b>, <b>i.mjh.nz</b>, valamint a lejátszólista saját forrása.</li>
<li>Beépített listák: <b>Free-TV/IPTV</b>, <b>BuddyChewChew/app-m3u-generator</b> (Pluto TV, Samsung TV Plus, Plex), <b>freecasthub/public-iptv</b>, <b>DragonHall TV</b>.</li>
</ul>
<h2>Felhasznált programkönyvtárak</h2>
<ul>
<li><b>Electron</b> – asztali alkalmazás,</li>
<li><b>hls.js</b>, <b>mpegts.js</b>, <b>dash.js</b> – lejátszás,</li>
<li><b>esbuild</b>, <b>@webos-tools/cli</b> – a tévés csomag elkészítése.</li>
</ul>
<p>A felületstílusok csak ihletet merítenek ismert szolgáltatások és rendszerek kinézetéből; a program nem kapcsolódik hozzájuk, és nem használja a logóikat.</p>`,
  },
];

/** Melyik téma tartozik az egyes képernyőkhöz (F1 / ? gomb). */
export const ROUTE_TOPICS = {
  home: 'dashboard',
  recordings: 'recording',
  tv: 'home',
  guide: 'guide-grid',
  browse: 'browse',
  favorites: 'favorites',
  search: 'search',
  settings: 'settings-overview',
  vod: 'vod',
  own: 'own',
  stats: 'stats',
};
