# Adás – funkciók és változások

[← Vissza a főoldalra](../README.md) · Fejlesztőknek: [FEJLESZTES.md](FEJLESZTES.md) · A program súgója: <kbd>F1</kbd>

## Felületstílusok

Profilonként választható a **Beállítások → Megjelenés** alatt, és már a profil létrehozásakor (első indítás, Profilok kezelése). A legtöbb stílusnak az eredeti mellett **három színváltozata** is van (pl. Kék, Zöld, Lila): a változat a stílus színes elemeit a választott színcsaládra fordítja (OKLCH-árnyalat, a világosság és az olvashatóság marad; a szürke árnyalatok és az állapotszínek nem változnak). A fekete-fehér kiemelésű stílusok (Manga, Mu) színes kiemelőt kapnak, a Kontraszt akadálymentességi okból változat nélküli.

A stílusok:

| Stílus | Jellemzői |
|---|---|
| Kurenai | Az esti mozi hangulata – fekete háttér, vörös kiemelés, rámutatásra kinagyuló kártyák. |
| Mahō | Mesés, csillagos mélykék színátmenet, fénylő keretes, lekerekített kártyák. |
| Murasaki | Sötét alap lila–rózsaszín színátmenetekkel és fénylő kiemeléssel. |
| Akane | Fekete alap, vörös jelölések, nagybetűs sorcímek – mozivászon-hangulat. |
| Shinkai | Sötét éjkék háttér, tengerkék kiemelés. |
| Garasu | Mélyfekete háttér, áttetsző, elmosott üvegfelületek, lebegő árnyékok, letisztult betűk. |
| Zen *(világos)* | Világos rizspapír-háttér, mohazöld kiemelés, sok levegő és csendes, lassú mozgások. |
| Wabi-sabi *(világos)* | Meleg, földszínű papírtextúra, kissé szabálytalan, kézműves kártyák, arany kintsugi-repedés. |
| Asobiba *(világos)* | Világos, csíkos háttér, fehér keretes buborékkártyák, ruganyos mozgás – játékbolt-hangulat. |
| Futago | Kézikonzol-menü – sötétszürke alap, piros–kék kontrollerpár, szögletes csempék türkiz kerettel. |
| Hiroba *(világos)* | A „csatornás” konzolmenü – fehér, finoman csíkos háttér, fényes, szürke keretes csempék. |
| Neon City | Éjszakai neonváros – neonsárga, cián és bíbor, levágott sarkú kártyák, pásztázó sorok, „glitch”. |
| Neo-Tokyo | Az AKIRA világa – éjszakai romváros sziluettje, Kaneda-vörös, száguldó motorfény-csíkok, fehér kapszula-jelvény, döntött tömbös címbetűk. |
| Manga *(világos)* | Fekete tus fehér papíron – rasztertónus, vastag panelkeretek, beszédbuborék-gombok, dőlt tömör címek. |
| Pow! *(világos)* | Amerikai képregény – Ben-Day pöttyök, vörös–sárga–kék, vastag fekete kontúr eltolt árnyékkal, sárga szövegdobozok, „POW!” csillagrobbanás. |
| 16-Bit *(világos)* | A 90-es évek szürke konzolja – lila gombok, színes A–B–X–Y pöttyök, pixeles keretek és képernyő-pásztázás, kockás betűk. |
| Kikagaku *(világos)* | Plakátművészet – törtfehér papír, vörös–kék–sárga–fekete, vastag keretek kemény árnyékkal. |
| Kyokkō | Lassan hullámzó színes háttér, matt üveg kártyák és lágy fénylés. |
| Rakugaki *(világos)* | Vonalas füzetlap kézírással – a csatornák beragasztott polaroid fotók, ceruzás keretek. |
| Phosphor | Régi zöld foszforos monitor – fix szélességű betűk, parancssori feliratok, inverz kijelölés. |
| Kontraszt | Nagy kontraszt: fekete alap, fehér és sárga szöveg, vastag sárga fókuszkeret – gyengénlátóknak, messziről nézve. |
| Nagybetűs *(világos)* | Világos alap, nagyobb betűk, kevés díszítés, mozgás nélkül – idősebb nézőknek. |
| Shiro *(világos)* | (fehér) Sima, semleges világos: fehér–szürke alap, egyetlen kék kiemelés. |
| Yoru | (éjszaka) Éjszakai mozi: szinte fekete, tompa, meleg borostyán kiemelés, alacsony fényerő – sötét szobába. |
| Mori | (erdő) Mély fenyőzöld alap, moha- és kéregszínek, levél a sorcímek előtt. |
| Natsu *(világos)* | (nyár) Napfényes tengerpart: homokszín alap, türkiz és korall, kerek kártyák, hullámos díszítés. |
| Fuyu *(világos)* | (tél) Havas fehér és jégkék, finoman hulló hópelyhek, kristálytiszta keretek. |
| Deco | A régi mozipaloták art deco világa: fekete és arany, geometrikus keretek, elegáns betűk. |
| Shōwa | A 70-es évek: narancs, barna és mustár, lekerekített „tévéképernyő” kártyák, csíkos díszítés. |
| Mu *(világos)* | (üresség) Szinte üres felület: csak a tartalom, sok tér, keretek, árnyékok és díszek nélkül. |
| Holo | Sci-fi irányítópult: sötét kékes rácsos alap, cián hologramfény, vékony keretek, levágott sarkú gombok. |
| Yume *(világos)* | (álom) Pasztell kawaii: rózsaszín, levendula és menta, pöttyös háttér, kerek buborékkártyák, szívecskék és csillámok. |
| Yami | Keserédes gótikus lolita: fekete–levendula alap, élénk rózsaszín, krémszín csipkefodrok, masnik, kameés keretek, fekete-fehér sakktábla, masnis kis koponyák és denevérek, kézírásos címek. |
| Csillagidő | Egy csillaghajó parancsnoki hídjának kezelőfelülete: fekete alap, lekerekített végű narancs, levendula és barack sávok, keskeny nagybetűk. |

Ugyanitt profilonként **sorrendbe állíthatók és elrejthetők a főoldal sorai** (húzással vagy a nyilakkal,
távirányítóval is), például: Legutóbb nézett, Kedvenceid, Most a TV-ben, hazai csatornák, kategóriák, országok.

## Funkciók verziónként

A legújabb változások elöl, a kiadások csökkenő verziószám szerint.

**Kontroller, feliratkeresés csak felirat nélküli fájlnál (következő kiadás)**
- **Kontroller (játékvezérlő)**: asztali gépen (HTPC, Batocera-gép, kézikonzol) kontrollerrel is kezelhető – bal kar / D-pad = nyilak, A = OK, B = vissza, X = adatok, Y = keresés, LB / RB = csatornaváltás, LT / RT = tekerés, Start = lejátszás / szünet, Select = kedvencek, L3 = kedvenc, R3 = hang és felirat; a gombok a gombkiosztásban át is taníthatók, a Beállításokban kikapcsolható. (Androidon a rendszer kezeli a kontrollert.)
- **Feliratkeresés**: ha a fájl maga tartalmaz megjeleníthető feliratot (beágyazott MKV / MP4 felirat, HLS / DASH feliratsáv), az Adás nem keres feliratot – se a videó mellett, se online –, hanem a beágyazottat használja; kézzel ilyenkor is lehet keresni, és a filmhez korábban választott felirat is visszatöltődik.
**Reklámok kivágása, saját gombkiosztás, két kawaii stílus, új színváltozatok, Linux-javítás (1.30.0)**
- **Két kawaii stílus**: *Yume* (világos, pasztell rózsaszín–levendula–menta, pöttyös háttér, buborékkártyák, szívecskék és csillámok) és *Yami* (keserédes gótikus lolita: fekete–levendula alap, élénk rózsaszín, csipkefodrok, masnik, sakktábla, masnis kis koponyák és denevérek, kézírásos címek) – mindkettő három színváltozattal (Barack, Szóda, Dinnye; Bordó csipke, Levendula, Menta macaron).
- **Reklámok kivágása**: a felvétel vágójában akárhány reklám megjelölhető (eleje–vége, `[` / `]` billentyűvel is); mentéskor mind kimarad, a többi egybefűzve, újrakódolás nélkül. Az előnézet átugorja a kijelölt reklámokat; a megjelölések újravágáskor is megmaradnak.
- **Reklámhatárok keresése**: a reklámok közti rövid csendet és fekete képet keresi (a hangot végig, a képet csak a csendek körül elemezve – gyors), a sűrű határokból reklámblokkot javasol. Csak javaslat, a felhasználó dönti el.
- **Gombkiosztás**: a távirányító (vagy billentyűzet) bármely gombja betanítható egy művelethez (nyilak, OK, vissza, lejátszás, tekerés, CH+ / CH−, színes gombok, hang és felirat) – főleg olcsó Android TV dobozokhoz. Már a profil létrehozásakor elérhető (első indítás, profilszerkesztő), és a Beállítások → Távirányító és billentyűk alatt. Androidon a keret a nyers gombkóddal fordít (a WebView számára ismeretlen gomb is betanítható); a kiosztás eszközönként él.
- **Színváltozatok, újragondolva**: minden stílus három, a hangulatához válogatott palettát kap saját névvel (pl. Neon City: Szintihullám, Savas zöld, Vörös neon; Phosphor: Borostyán, Cián, Plazma; Deco: Rózsaarany, Smaragd, Ezüst) – a több színű stílusoknál minden szín külön célszínt kap. (Az 1.29.1-ben választott változat helyett az eredeti színek jelennek meg – egy kattintással újra választható.)
- **Linux: felvétel, vágás, lejátszási híd**: a Linux-csomag FFmpeg-je minden MPEG-TS olvasásakor összeomlott (felvétel, vágás, AC3 / DTS hangú adások) – helyette egy működő, ellenőrzött build kerül a csomagba.
- **Javítások** (külső hibajegyzék alapján): rádiónevek a műsorújságban részleges hibánál; Android-mappák egyes szolgáltatóknál; régi kódolású és behúzott feliratok ékezetei; rossz filmre kerülő behúzott felirat; Androidon a rendszer által megállított rádió; nem magyar első beállításnál bekapcsolva maradó magyar műsorújság; a telefonos távirányító gyerekprofilban tiltott csatornákat mutathatott; bezárt lejátszó késői újraindulása; csomagfrissítés a régi mentési pontokban; megszakíthatatlan teljes ellenőrzés; csak csomagokból álló csatornalista kikapcsolása; sportnaptár-ismétlődések (RDATE, régi sorozat, hétkezdés); egy hibás NAS-forrás a többit is megakasztotta; pontosabb nézési statisztika; DASH kézi minőség kijelzése; 12 jegyű átadási kód a leírásokban; azonos szerver két adásának fejlécei; a weboldal iPad-ajánlása és adatvédelmi szövege.
**Színváltozatok, gyorsabb működés, Android háttérlejátszás (1.29.1)**
- **Színváltozatok**: a legtöbb felületstílusnak az eredeti mellett három színváltozata is van (pl. Kék, Zöld, Lila) – a Beállítások → Megjelenés alatt, a minták alatti *Színváltozat* sorban; a stílus és a változat már a profil létrehozásakor is választható (első indítás, Profilok kezelése).
- **Gyorsabb**: a csatornalista gyorsítótárból jóval gyorsabban töltődik be; a Sport oldal kb. háromszor gyorsabban nyílik; rádiós keresés és böngészés után a műsorújság nem dolgozódik fel fölöslegesen újra; a TV oldal görgetése kevesebb munkával jár; a gyorsítótár magától takarít (eddig korlátlanul nőtt).
- **Android háttérlejátszás**: a háttérben szóló adás nem szakad meg, és visszatéréskor az Adás nem indul újra elölről; a kis ablak bezárása leállítja a lejátszást; lezárt képernyőnél sem alszik el a Wi-Fi.
- **DASH-adások**: dash.js 5 (a minőségválasztás és a hangsávok is működnek).
- **Javítások**: régi LG tévéken (webOS 4) betöltési hiba; feliratok ZIP-ből LG-n; ismétlődő naptáresemények a Sportfigyelőben; elalvási időzítő kivetítéskor; statisztika háttérlejátszásnál; NAS-listák frissítése; a súgó számos pontosítása.
**12 új felületstílus, Android fektetve, műsorújság (1.29.0)**
- **Új stílusok**: Kontraszt (nagy kontrasztú, gyengénlátóknak), Nagybetűs (idősebb nézőknek), Shiro, Yoru (éjszakai mozi), Mori (erdő), Natsu (nyár), Fuyu (tél), Deco (art deco), Shōwa (70-es évek), Mu (szinte üres), Holo (sci-fi irányítópult), Csillagidő (egy csillaghajó hídjának kezelőfelülete).
- **Android, fektetett telefon**: a főoldal csempéi nem préselődnek a képernyő magasságába (levágott címek, kicsúszó tartalom helyett két oszlop, görgethető); a rádió mini-lejátszója nem takarja el az alsó menüsávot; a menüpontok mellett nincs sárga fókuszcsík.
- **Műsorújság**: a Nickelodeon és a Nicktoons műsora 2 órával elcsúszott (a forrás időzóna-hibája) – az open-epg.com lett az elsődleges forrás, a meglévő beállításokban is.
**Hibajavítások egy újabb kódellenőrzés alapján (1.28.9)**
- **Kivetítés**: a csatlakozás közben leállított kivetítés nem indul el; gyors Chromecast-filmváltásnál régi állapot nem írja az új film pozícióját; DLNA-n a késő válasz nem ugraszt vissza; kivetítéskor a hangerő és a némítás a tévét állítja.
- **Műsorújság**: a fő forrás műsorai közötti réseket a többi forrás kitölti; a háttérbe szorított forrás adata is tartalék.
- **Mentés, import**: csomag és saját VOD-lista törlése után a régi mentési pontok is visszaállíthatók; a hibás beállítás-import nem okoz összeomlást.
- **Egyéb**: védett rádió felvétele lejátszás nélkül is; listaváltás és sportkövetés-váltás közbeni gyorsítótár-hibák; miniablak több monitornál; Android 6-on összeomlás átirányításnál; párhuzamos lejátszás-indítás.
**Műsorújság-javítás (1.28.8)**
- **Műsorújság**: az adat nélküli helyőrző („No Data”) sorok kimaradnak – eddig eltakarták a többi forrás valódi műsorát (pl. RTL, TV2, Nickelodeon, Nicktoons: „No Data” vagy az előző nap műsora látszott).
- **Új forrás**: harmadik magyar műsorforrás (open-epg.com), alapból bekapcsolva – ha egy forrás kiesik vagy csak helyőrzőt ad, a többi pótolja (pl. M4 Sport).
**Hibajavítások, teljes tesztcsomag, súgó: adattárolás (1.28.7)**
- **Kivetítés**: DLNA-tévén is működik a tekerés és a folytatás, a tévé valódi pozíciója és a film hossza visszajön; a film végén megnézettnek jelöl (Chromecastnál ismeretlen hossznál is); filmváltáskor az előző film késői állapota nem írja felül az újat.
- **Rádió**: a védett lejátszólisták a lista fejléceivel töltődnek le; az ismételten megszakadó cím helyett a következővel csatlakozik újra.
- **Felvétel**: a leállítás akkor sem akad el, ha az FFmpeg összeomlott; újrapróbálás közbeni leállításnál egyetlen értesítés.
- **Indulás és mentés**: a borítótár hibája nem akadályozza meg az ablak megnyitását; mentési pont visszaállításakor a régi mentési pontok listái megmaradnak.
- **Súgó**: új téma – *Hol tárolja az Adás az adatokat?* (asztali gép, Android, böngésző / webOS; felvételek, profilok, gyorsítótár).
- **Tesztek**: `npm test` – fordítások, főfolyamat és a felület a valódi alkalmazásablakban (lejátszás, műsorújság, távirányító, mentések…), minden PR-nál automatikusan.
**Hibajavítások egy külső kódellenőrzés alapján (1.28.6)**
- **Feliratok**: a már egyszer letöltött felirat nem töltődik le újra (filmenként tárolva – az OpenSubtitles napi kerete nem fogy el ugyanarra); régi keresés / letöltés nem írja felül az újat; a videó melletti felirat pontos névpárosítással.
- **Felvétel**: írási hiba (betelt lemez, eltűnt meghajtó) nem dönti le az alkalmazást; egyszerre induló felvételek külön fájlt kapnak; dupla indítás ellen védett; ütemezett felvétel összeomlás után is folytatódik; a vágás hibája után a felvétel nem tűnik el.
- **Biztonság és profilok**: gyerekprofilban nincs élő főoldali előnézet (a szülői korlátok nem kerülhetők meg); a hibás mentésből betöltött profil nem okoz futási hibát; a profilimport csak sikeres mentés után jelez sikert.
- **Rádió**: megszakadt adásnál újracsatlakozás; gyors adóváltás, elalvás-időzítő, lista-fejlécek és offline mentett listák javítva.
- **Műsorújság és egyéb**: elavult forrás jelölése, a források pontos összefésülése; kivetítés: pozíció mentése és folytatása, médiagombok; Android: emlékeztetők, frissítés letöltése; statisztika, letöltési korlát és több kisebb javítás.
**Android: lejátszás zárolt képernyőnél, értesítés (1.28.5)**
- **Lezárt képernyő**: a rádió mindig tovább szól (másik alkalmazásra váltáskor is), a TV és a VOD hangja a képernyő lezárásakor is; másik alkalmazásra váltáskor a videónál továbbra is a Háttérlejátszás beállítás dönt.
- **Értesítés lejátszás közben**: amíg van betöltött adás (szünetelve is), az értesítési sávon és a zárolt képernyőn látszik, mi szól (TV: csatorna és a most futó műsor, rádió: adó és szám), lejátszás / szünet és leállítás gombbal. Android 13-tól az első lejátszáskor engedélyt kér.
**macOS-javítás, műsorújság, Újrakezdés (1.28.4)**
- **macOS**: a Mac-kiadások eddig el sem indultak (aláíratlan alkalmazás – „sérült, nem nyitható meg”); most ad-hoc aláírást kapnak. Az első indításkor egyszeri jóváhagyás kell (jobb klikk → Megnyitás, ill. macOS 15-től Adatvédelem és biztonság → Megnyitás mindenképp).
- **Műsorújság**: a források kiegészítik egymást – ahol a magasabb prioritású forrás műsora véget ér (pl. csak a tegnapi napot adja), a következő pótolja. Javítva a „Nincs műsoradat” több magyar csatornán (Nick Jr., Minimax, Spektrum Home, TV2…).
- **Újrakezdés**: Beállítások → Profilok és mentés → *Újrakezdés…* – minden adat törlődik, és az Adás úgy indul, mintha most telepítetted volna (a felvett videók megmaradnak). Minden változatban: asztali gépen újraindul, Androidon / Android TV-n a rendszer törli az alkalmazás adatait.
- **Főoldal**: a rádió mini-lejátszója a főoldalon is teljesen látszik, nem takarja a csempéket.
- **Súgó**: ha a telefon nem kapcsolódik a távirányítóhoz – hálózat, cím, tűzfal, és a port megnyitása Linuxon disztribúciónként.
**Hibajavítások, rádiós csempék a főoldalon (1.28.3)**
- **Kereső**: a találatok sorrendje TV-csatornák, műsorok, VOD, rádió; fülekkel egy fajtára szűrhető (darabszámmal), a rádióadók is a találatok között vannak, a VOD-lista kereséskor betöltődik.
- **Főoldal – rádiós egységek**: *Rádió – most szól*, *Kedvenc rádiók*, *Most a rádióban* (műsorújság), *Népszerű hazai rádiók*, és a *Rádiózás* kész elrendezés.
- **Rádió Androidon**: natív lejátszó (ExoPlayer) – a „Csatlakozás…”-on ragadó vagy el nem induló adások javítva; a lejátszólistának látszó címek feloldása időkorláttal (minden platformon).
- **Menü**: a kikapcsolt Sport (és Rádió) menüpont telefonos elrendezésben is eltűnik.
- **Távirányító**: a virtuális egér (karika) a rádió teljes képernyős nézetén is látszik; Linuxon a QR-kódba nem kerül virtuális vagy VPN-hálózati kártya címe, több cím közül választható, tűzfal-tipp.

**Rádió, androidos funkciók, javítások (1.28)**
- **Rádió**: felvétel és műsorújság a tévés felülettel, kedvencek fül, a *Most szól* nézet fekvő képernyőn egy képernyőre fér (borító | adatok | hangkép, alul kezelősáv, a beállítások rövid menügombokból: Hangkép, Hangzás, Hangszín, Elalvás, Előtte szólt, Adás adatai – D), a háttér a téma háttere; **OFFLINE** / **🌐 GEO-KORLÁT** jelölés és háttérellenőrzés, mint a tévénél; **Adás adatai** (formátum, megadott és mért bitráta, puffer, akadás); a Japán (és más ország) szűrés teljes listát ad.
- **Magyar TV adók**: új beépített lista a szabadon fogható magyar adásokkal.
- **A „több adás egyszerre” nézet megszűnt** minden platformon.
- **Android**: háttérlejátszás médiavezérlőkkel (értesítés, fülhallgató, Bluetooth, zárolt képernyő), mini lejátszó más alkalmazások fölött (kép a képben), natív lejátszó (ExoPlayer) élő tévéhez és HLS / DASH-hez is választható, helyi / USB-mappák a saját médiatárhoz, beépített frissítés (ellenőrzött aláírással, a rendszer telepítőjével), kivetítés telefonról (Chromecast, DLNA – Google-szolgáltatások nélkül), éjszakai hang (Android 9-től), külön mobil és tévés kiadás (`…-android-mobile.apk` / `…-android-tv.apk`).
- **Telefonos távirányító**: új Rádió fül (adóváltás, kedvenc, felvétel, hangerő, elalvás, hangkép, keresés), új gombok (kedvenc, felvétel, mini, kivetítés), ugrás a Rádióra, a rádió-műsorújságra és a Sportra.
- **Windows-telepítő**: tiszta telepítés és az adatok törlése (Setup: kérdéssel; MSI: jelölőnégyzettel, ablakos magyar telepítővel); az MSI a végén nem indítja el az Adást (az első profil névmezője így nem maradt írhatatlan).
- **Javítások** a javítási feladatlistából (B01–B38): első profil (Enter, visszalépés), kereső fókusza, távirányítós navigáció, mentési pontok a listatartalommal, gyerekprofil nézési ideje kivetítéskor, legnagyobb minőség minden motorra, beállításmentés, EPG-feldolgozás és -frissítés, feliratok, frissítő, sportnaptár időzónái, kivetítés, emlékeztetők és több más.

**Tartós borítótár, elérhetők elöl mindenhol (1.27)**
- **Borítóképek tára**: asztali gépen a VOD-borítók a felhasználói adatmappa `covers` mappájába kerülnek (`adasimg://` – `covers.js`), Androidon minden kép (borító, csatornalogó) a `files/covers` mappába (`Covers.java`; eddig a WebView a proxyn átadott képeket nem tárolta, mindent újra letöltött). Legközelebb onnan jönnek, hálózat nélkül is; korlát: asztalon 1 GB, Androidon 512 MB (fölötte a legrégebben látottak törlődnek). Méret és ürítés: Beállítások → VOD és médiatár.
- **Az elérhető csatornák elöl mindenhol**, ahol a program dönti el a sorrendet: keresés (és a telefonos távirányító keresése), a TV oldal sorai, műsorújság, böngészés (név / ország szerinti rendezésben is), több adás egyszerre. A saját sorrend marad (Kedvencek, Legutóbb nézett, csatornaszámok).
- Új magyar alap-hírforrás: **Kávéház Magazin** (a már testreszabott hírlistákba is egyszer bekerül).

**Listák frissítése listánként, frissülő kiegészítő csomagok (1.27)**
- Minden webcímről töltött csatorna- és VOD-listánál (beépített, saját, kiegészítő csomag) a lista sorában beállítható, **hány óránként** töltse le újra: óránként … 48 óránként (alapból 6). A program futás közben is figyeli, lejátszás közben nem frissít.
- **Forráscímes kiegészítő csomag**: a `.adaspack` nem kötelező `url` mezőjéből a lista a beállított gyakorisággal frissül (lejáró címeket tartalmazó, rendszeresen újragenerált listákhoz); ha a forrás nem érhető el, a csomagban mentett lista látszik. Új mezők még: `epg` (műsorújság), `refresh` (javasolt gyakoriság). A `tools/make-pack.mjs` webcímről is készít ilyet (`--url`, `--epg`, `--refresh`).

**Sport oldal (1.26.5)**
- Új menüpont a TV és a VOD mellett: irányítópult a Sportfigyelőben követett tételekhez
  - **Élő most**: a zajló események állással, egy gombnyomásra indítható csatornával
  - **Sport a tévében most**: a látható csatornákon éppen futó sportműsorok (követés nélkül is), a nem elérhetők a végén
  - **Következik** napokra bontva (🔔 emlékeztetővel), **Eredmények**, **Tabella** (ESPN: foci, kosárlabda, jégkorong…; a követett csapat kiemelve, továbbjutási / kiesési zónák)
  - sportág-szűrő; élő esemény közben percenként, egyébként 5 percenként frissül
- Beállítások → **Sport**: a menüpont kikapcsolható (gyerekprofilban nem látszik), innen nyílik a Sportfigyelő is
- Felvétel vágása: a videó arányosan látszik (eddig egy kinagyított csík), a pozíció-csúszka a kijelölés sávján van, a műsorújság-jel minden témában látszik

**Többnyelvű felület, első indítási varázsló (1.26)**
- **Nyelvek:** magyar, angol, német, spanyol, francia – a felület, az üzenetek, a tálca / értesítések, a telefonos távirányító és a teljes súgó is (Beállítások → Megjelenés → *Nyelv / Language*; váltáskor újraindul)
- **Első indítás:** nyelvválasztás → saját profil (név, profilkép) → gyerekprofil (átugorható); nem magyar nyelvnél a hazai ország, a műsorújság-forrás, a hírforrások és az időjárás városa is a nyelvhez igazodik
- A dátumok, napok, pénznemek, a Wikipédia / TMDB-leírások és a feliratkeresés is a felület nyelvét követik; a sportfigyelő és a műsorkategóriák a német, angol, spanyol és francia műsorújságot is felismerik
- Fordítás: a kulcs a magyar szöveg (`_t('…')`); minden nyelv egyetlen fájl, `src/i18n/<nyelv>.js` (az elején a nyelv adatai: név, formázás, ország, alapértelmezett város, hírforrások, műsorújság), a súgó `src/js/help/<nyelv>.js`. A magyar és az angol teljes; a többi nyelvből hiányzó szöveg és súgótéma **angolul** jelenik meg
- **Új nyelv:** az `src/i18n/en.js` másolata `<kód>.js` néven (adatok + fordítások, bármennyi elhagyható), egy sor az `src/i18n/index.js`-be; súgó nem kötelező (`src/js/help/<kód>.js` + egy sor a `help.js` LOADERS-ébe). Az Android-keret szövegei is ezekből a fájlokból készülnek. `npm run i18n:check` – az angol hiányait hibának jelzi, a többi nyelvnél kiírja, mennyi jelenik meg angolul (`npm run i18n:check -- de` – a hiányzó kulcsok listája)

**Böngészés elérhetőség szerint (1.26)**
- A böngészés ajánlott sorrendje az elérhetőség: elöl a működő, utána a még nem ellenőrzött, a végén az offline, épp nem sugárzó vagy innen nem nézhető csatornák; azon belül a hazai és a népszerű csatornák elöl. A kereső találatai a találati sorrendben maradnak, de a nem elérhetők ott is a végére kerülnek
- Indításkor a profilválasztó (és az első indítási varázsló) mindig csak az indítóanimáció után jelenik meg

**Felületi javítások (1.26)**
- Kedvencek: újra látszik a csatornaszám, és újra működik a húzásos átrendezés; telefonon / tableten is (hosszan nyomva húzd a kártyát a helyére)
- Profilszerkesztő: a profilképek rácsa nem lóg ki az ablakból, a Gyerekprofil kapcsoló a sor jobb szélén
- Telefonon: a böngészés keresőmezője a teljes sor; a műsorújság napjai nagy kezdőbetűvel
- Csatorna-adatlap: megnyitáskor a csatorna neve a helyén marad (csak a műsorlista görgetődik a mostani műsorhoz); a kedvenc gomb felirattal (☆ Kedvenc), mint a filmeknél
- Műsorújság: a műsor nélküli csatornák sorában „Nincs műsoradat”; „Ugrás a mostani időre” gomb
- Felvételek: a gombok felirattal (Vágás, Megnyitás, Törlés) – tévén nincs súgóbuborék
- Profilok kezelése: látszik a szerkesztés ceruzája a képes profilképeken is
- Témaválasztó: a világos témák neve is olvasható
- Egységes szóhasználat (pl. „Most a tévében”, „Összes”, „Újrapróbálás”); a tizedes számok, a napok és a dátumok a felület nyelvének formájában; „Szép napot!” név nélkül, ha a profil neve az alapértelmezett „Én”

**Kiadás a GitHubról, egérkurzor a távirányítón, új feliratforrás, egységes műfajok (1.25)**
- **Kiadások:** a `v*` címke pusholásakor a GitHub Actions minden platformra lefordít, és GitHub Release-be tölti a fájlokat (Windows: telepítő, hordozható, MSI · Linux: AppImage, deb · macOS: dmg, zip · Android: APK), SHA256SUMS.txt-vel; az asztali változat innen frissül (induláskor keres, kikapcsolható)
- **Windows-telepítő (Setup):** ha a gépen már vannak Adás-adatok, felajánlja a *tiszta telepítést* (a beállítások, profilok, listák törlése); eltávolításkor megkérdezi, törlődjenek-e az adatok is (csendes / automatikus frissítésnél nem kérdez, nem töröl). Az **MSI** ablakos (magyar nyelvű) telepítő: a „Kész a telepítésre” lépés előtt az *Adatok* oldalon jelölőnégyzettel kérhető a tiszta telepítés; az MSI újbóli indításával választott Eltávolításnál ugyanez az oldal jön, a Windows Beállítások felőli eltávolításnál Igen / Nem kérdés (frissítésnél, csendes futásnál nem kérdez, nem töröl; parancssorból: `msiexec /i Adas-<verzió>.msi CLEANDATA=1`). A telepítés végén nem indítja el az Adást (a Start menüből indul) – az msiexec-ből indított ablak nem mindig kapta meg a billentyűzetfókuszt.
- **Kiegészítő csomagok** (`.adaspack`): nem nyilvános listák a programmal nem szállítva, beépítettként megjelenve – betöltés fájlból vagy az asztali „packs” mappából; a mentés és az átvitel is viszi. Készítés: `tools/make-pack.mjs`
- **Távirányító:** egér mód (kurzor a képernyőn, koppintás = kattintás, két ujjal görgetés), a parancsok sorban mennek (nem ugrál), a kijelölés mindig látszik; gyorsgombok: TV, Műsorújság, Böngészés, VOD; a Főoldalon *Távirányító* gomb – egy kis ablakban QR-kóddal csatlakoztat
- **Feliratok.eu:** magyar és angol feliratok fiók és napi korlát nélkül, sorozatnál évadcsomagból is; a régi (Windows-1250) magyar feliratok ékezetei is helyesek; **SubDL** ingyenes kulccsal; a CC-menüben egyetlen *Felirat keresése* gomb (alatta az aktív adatbázisok), magyarul és angolul is keres
- **VOD:** egységes műfajok az AnimeAddicts műfajlistája szerint (a magyar és angol, témacsatorna-szerű csoportok ezekre fordítva), egy cím több műfajban is; alapból a 12 legnépszerűbb műfaj kap sort
- **Hálózatfigyelő:** a letöltés sebessége, a forrás válaszideje és a valós idejűség mérése; ismételt akadásnál másik forrás, kisebb minőség vagy nagyobb tartalék; megszakadt internetnél magától folytatja
- **Menü:** Főoldal · TV · VOD · Kedvencek (a kedvenc filmek és sorozatok is); a TV alatt fülek: Csatornák, Műsorújság, Böngészés, Felvételek
- **Keresés:** fekvő, széles képernyőn a tévé- és a VOD-találatok két hasábban egymás mellett; Androidon egymás alatt, elöl a csatornákkal
- **Beállítások:** 15 kisebb csoport, mindegyik egy-két mondatos leírással; Androidon csak csempék
- **Lejátszó:** a kiegészítő gombok egyenként elrejthetők; a kép a képben mód megszűnt
- **Erőforrások:** a sorok fokozatosan töltődnek (fele annyi elem és kép induláskor), a Főoldal élő előnézete egy perc után megáll, kis puffer a többképes nézetben és az előnézetben
- **Új profilképek:** 29 új avatár (a betűs változattal 30 lehetőség); a szerkesztőben 2 sornyi, véletlenszerűen válogatva, a többi a *Több…* gombbal nyílik le
- **VOD-kártyák** a csatornakártyák mintájára (keret, jelvények, felugró panel Lejátszás / Kedvenc / Részletek gombbal) – álló borítóval
- **Indítóképernyő:** a logó pulzál, balra úszik, közben előtűnik az ADÁS felirat; a jobb alsó sarokban minden indításkor más vicces, tévés hangulatú sorok
- **Biztonság:** titkosított szinkron eszközök között (12 jegyű kód, a kulcs nem utazik a hálózaton); a telefonos távirányító QR-kulccsal aláírt kéréseket küld (a PIN nem megy át a hálózaton, címenkénti hibakorlát); a frissítés csak https-ről és SHA-256-egyezéssel települ; gyerekprofil: a külső lejátszó, a távirányító és a kivetítés is a szülői szabályok szerint; méretkorlátok és lineáris feldolgozás a listákhoz, műsorújsághoz, ZIP-hez, feliratokhoz; a mentésből importált profilok ellenőrzése
- Electron 44 (biztonsági javítások)

**Felvételek a TV alatt, ajánlósáv nélkül (1.24.1)**
- A **Felvételek** a TV oldal fülére költözött (TV → Csatornák / Felvételek); a VOD-ban csak az Online listák és a Saját médiatár maradt
- A TV és a VOD oldal tetejéről kikerült a nagy kiemelt (ajánló) sáv: az oldal rögtön a sorokkal kezdődik

**Felvétel vágása, megbízható felvétel, új távirányító QR-kóddal, levegős Beállítások (1.24)**
- **Felvétel vágása** (TV → Felvételek → ✂): előnézet, idővonal a műsorújság szerinti kezdet / vég jelével, léptetés, „Kezdet ide” / „Vége ide” (I / O), beírható időpontok; vágás újrakódolás nélkül. A vágott változatot játssza le az Adás, az eredeti megmarad (újravágható, visszaállítható, külön nem jelenik meg)
- **Ütemezett felvétel:** beállítható ráhagyás (alapból 3 perc előtte, 10 perc utána); az indítást a főfolyamat időzítője adja (a tálcán is pontos); ha az adás megszakad, a felvétel magától folytatódik ugyanabba a fájlba (folytonos időbélyegekkel)
- **Távirányító telefonról:** QR-kóddal csatlakozik (a PIN-t is átadja); érintőpad (húzás = nyilak, koppintás = OK, hosszan = Vissza), tekerés, hangerő-csúszka, felirat / minőség / lista / teljes képernyő, csatornakereső, kedvencek és előzmények, szöveg küldése, ugrás bármelyik oldalra; a lap nem kerül gyorsítótárba
- **Beállítások:** a részek kártyákon; széles képernyőn két oszlop, füles módban bal oldali csoportlista; egységes „Beállítások → csoport → rész” hivatkozások a súgóban és a felületen
- **Legnagyobb minőség** beállítás (1080p / 720p / 480p / 360p, vagy az ablakmérethez igazodó automatikus)
- Nyilas / távirányítós kezelés: a kijelölés a tartalommal kezd, oldalsávról jobbra a tartalomra lép, fülváltás után nem vész el

**Földrajzi korlát jelzése, adás adatai, nincs befagyás, kevesebb akadás (1.23)**
- **🌐 Földrajzi korlát:** a kártyákon, az adatlapon és a lejátszó hibaüzenetében; a háttér-ellenőrzés és a lejátszás a 403 / 451 választ felismeri („innen nem nézhető”), a lista `[Geo-blocked]` címkéje „korlátozott lehet” jelzés, amely eltűnik, ha az adás innen mégis működik; szűrő a Böngészésben
- **Adás adatai** panel (⚙ → 📊, vagy `D`): lejátszómotor, kiszolgáló, felbontás, kodekek, bitráta (mért is), letöltési sebesség és annak aránya a bitrátához, puffer, késés az élőtől, eldobott képkockák, akadások, hálózat – tanáccsal, ha akadhat
- **Műsorújság frissítése / ki-be kapcsolása:** a felület nem fagy be (eddig akár 4–5 mp-re): a letöltés, kicsomagolás és fájlkezelés aszinkron, a feldolgozás és a csatornapárosítás a háttérszálon, az adatok bájtként és részletekben érkeznek, a műsorok csak használatkor jönnek létre; a frissítés kb. kétszer gyorsabb
- **Kevesebb akadás:** az élő adás 4 résznyivel a széle mögött indul (a még készülő részt sok szerver csak valós időben küldi), a kis időbélyeg-réseken a lejátszó átlép, óvatosabb minőségváltás; a háttér-ellenőrzés lejátszás közben szünetel
- Beállítások, gyorsítótár és listák mentése aszinkron (kilépéskor megvárja)
- Biztonság (1.22.1-ből): LAN-továbbító engedélylistával és kapcsolódáskori IP-ellenőrzéssel, korlátos fájlolvasás, HTML-tisztítás, Android allowBackup=false

**Felvételek az alkalmazásban, új Beállítások, minden ablakméret (1.22)**
- **VOD → Felvételek** fül (asztali): a saját tévéfelvételek csatornalogóval, dátummal, mérettel; lejátszás az Adás saját lejátszójában (tekerhetően, folytatással), külső lejátszó, törlés; a most rögzített és az ütemezett felvételek is itt
- A lejátszási híd az MPEG-TS fájlokat (.ts) is lejátssza (AAC / MP2 hang, nem nulláról induló időbélyegek)
- **Beállítások:** nyolc csoport (Megjelenés és főoldal · Lejátszás · Listák és források · Tartalom és gyerekek · Értesítések · Eszközök és szinkron · Profilok és mentés · Frissítés), **csempés** vagy **füles** elrendezés választható, kereső az összes beállítás között; új Névjegy (verzió, platform, adatok helye, adatforrások)
- A felugró ablakok minden képernyőméretben elférnek (a tartalmuk belül görget); telefonos javítások: listák gombjai, választómezők, sorok nyilai, statisztika, keresés

**Sportfigyelő, VOD cím- és borítószerkesztő (1.21)**
- **Sportfigyelő** ablak (a főoldal Sport egységéből vagy Beállítások → Főoldal): bármilyen sportág, bajnokság, csapat vagy verseny követése
  - **Bajnokságok:** 357 bajnokság / torna 17 sportágban az ESPN nyilvános adataiból (kulcs nélkül, élő állással, eredménnyel); csapat szerinti követés
  - **Sportágak a tévében:** kb. 40 sportág és játék (kézilabda, vízilabda, disc golf, World Chase Tag, sakk, darts, e-sport…) és saját kulcsszó (pl. Fradi) a műsorújság alapján
  - **Naptár:** bármilyen .ics / webcal versenynaptár; nem kötelező TheSportsDB-kulcs további bajnokságokhoz
  - **Csatornaajánlás:** minden eseménynél 📺 gomb arra a csatornára, ahol a műsorújság szerint látható
- VOD: az „Előzetes” gomb megszűnt; a cím és a borító egy ablakban szerkeszthető, a borítóképek között **saját keresőszóval** is kereshetsz (AniList, Kitsu, MyAnimeList, TVmaze, magyar és angol Wikipédia, Wikidata; saját kulccsal TMDB és OMDb / IMDb)

**Saját listák javítása, AKIRA-, manga- és képregény-téma (1.20.1)**
- ANSI (Windows-1250) kódolású listák ékezetei helyesek (UTF-8 / UTF-16 / ANSI felismerés a fájlokban és a letöltött listákban)
- Saját médiatár: egy vegyes filmlistában egyetlen sorozatrész miatt a többi film nem kerül a sorozat extrái közé (eddig emiatt tűnhettek el tételek); értelmetlen #EXTINF-cím (pl. „No1”) helyett a fájlnév, ékezetes változat előnyben; feliratok / szövegfájlok nem jelennek meg filmként
- Neo-Tokyo átdolgozva AKIRA-stílusúra; új stílus: **Manga** és **Pow!** (amerikai képregény)

**Új stílusnevek, saját témák, magyar VOD-címek, kép a képben Androidon (1.20)**
- A stílusok új, márkanév nélküli nevei: Kurenai, Mahō, Murasaki, Akane, Shinkai, Garasu, Zen, Wabi-sabi, Asobiba, Futago, Hiroba, Neon City, Kikagaku, Kyokkō, Rakugaki, Phosphor; új stílus: **Neo-Tokyo** (80-as évekbeli anime-romváros) és **16-Bit** (90-es évekbeli szürke konzol)
- A főoldal egységei (csempék) minden stílusban a stílushoz illő kinézetet kapnak
- Saját témák: téma-fájl (`.adastheme` / `.json`) feltöltése, vagy asztali gépen téma-mappa; az elrendezést módosító CSS-t az alkalmazás kiszűri. Teljes leírás és minta: [docs/TEMA-KESZITES.md](TEMA-KESZITES.md)
- Új, hozzáadható főoldali egységek: Megnézendő, Új részek, Hamarosan kezdődik, Ma esti filmek, Nézési idő, Fedezd fel, Nap és levegő, Jegyzet
- VOD: magyar cím a kártyákon és az adatlapon (alatta az eredeti), kézi cím; borítókép-választó több forrásból, saját képcímmel vagy képfájllal
- Lista-feldolgozás: „Cím - 01 [CRC]” és „Part 2 - 01” részek, évadmappák („Season 2/…”), általános fájlnevek (index.m3u8), azonos című, eltérő hosszú filmek helyes kezelése (eddig ezek összevonódhattak)
- Android: kép a képben (lebegő kis ablak, kilépéskor magától is), háttérlejátszás értesítéssel (beállítható)

**Egységes elrendezés minden stílusban (1.19.1)**
- Minden felületstílus ugyanazzal az elrendezéssel: felső menüsáv (az oldalsó menüsáv megszűnt), hat csatornás lapozó kiemelt sáv, azonos kártyaméretek, térközök és magasságok; a stílus csak a kinézetet adja (színek, betűk, keretek, árnyékok, minták, animációk)
- Rögzített sormagasság, így a stílus betűtípusa sem tolja el az elemeket

**Szinkron kóddal, távirányító, felvétel és sok új funkció (1.19)**
- Szinkronizálás eszközök között (asztali ↔ Android TV ↔ Android telefon, bármelyik irányba): az egyik eszköz 12 jegyű kódot ad (az 1.25-től titkosított), a másikon csak a kódot kell beírni – magától megtalálja a helyi hálózaton (Android: új LanServer)
- Távirányító telefonról: böngészős vezérlőlap PIN-nel (csatorna, hangerő, nyilak, OK / Vissza, számok, kedvencek)
- Felvétel (asztali): azonnal a lejátszóból vagy ütemezve a műsor-adatlapról, újrakódolás nélkül (.ts)
- Gyerekprofilok: „Nézheti” kapcsoló gyerekprofilonként külön; napi nézési idő és korhatár (a műsorújság korhatár-adatai alapján), szülői PIN-nel feloldható
- Főoldal: új egységek (óra + névnap, árfolyamok, sporteredmények, ajánlott neked), kész elrendezések, napszak szerinti váltás, élő előnézet az utoljára nézett csatornán
- Műsorújság: kategória-szűrő, „Most műsoron” nézet, naptárba mentés (.ics)
- VOD: Megnézendő lista, évadonkénti haladás és „évad megnézve”, előzetes (YouTube)
- Lejátszás: előző csatorna (R), csatornánkénti hangerő, feliratszín / -háttér, gyorsabb tartalékforrás-váltás akadásnál
- Statisztika: heti összesítő, nem működő kedvenc csatornák (heti értesítéssel); napi automatikus mentési pont, visszaállítással
- Javítva: átvétel / visszaállítás után a régi állapot visszaíródhatott (a bezáráskori mentés felülírta)

**Testreszabható főoldal (1.18)**
- A főoldal egységei (időjárás, most a tévében, hírek, ma este, utoljára nézett csatorna, VOD-folytatás, kedvenc csatornák, emlékeztetők) átrendezhetők (gombokkal vagy áthúzással), átméretezhetők, elrejthetők; a rács oszlopai (1–5) és sorai (1–4) állíthatók – profilonként, és mindig egy képernyőre fér
- Minden egység a saját méretéhez igazítja, mit és mennyit mutat (hírek / műsorok száma, kép, bevezető, napok, órás bontás, plakátméret, időablak)
- A TV- és a VOD-folytatás külön egység lett

**Főoldal 3 × 2 (1.17)**
- A főoldal alapból 3 oszlop × 2 sor és kitölti a képernyőt: időjárás | „Most a tévében” (2 egység) / hírek | ma este | folytatás (TV + VOD egy kártyán). A korábbi kétoszlopos, görgethető elrendezés választható.
- Időjárás: felül a mai nap a település nevével és órás (keskeny kártyán 2–3 órás) bontással – vonaldiagram, terület + csapadék, oszlopok, csempék vagy csak egy érték; alul a heti előrejelzés
- „Most a tévében” és „Ma este”: csak a kedvenc csatornák; az előbbi a Műsorújság idővonalas rácsa kicsiben

**Új főoldal, gyerektartalom, VOD-sorok (1.16)**
- Új Főoldal (irányítópult): időjárás (mai + heti, Open-Meteo; a település a Beállítások → Főoldal alatt), a kedvenc csatornák műsorújsága, RSS-hírek (utolsó 7, a hírforrások hozzáadhatók / kikapcsolhatók), „Ma este a tévében” ajánló emlékeztetővel, legutóbb nézett 5 csatorna és 5 VOD. Telefonon álló módban egymás alatt.
- A korábbi főoldal (csatornasorok) a TV menüpont alá került; a menü sorrendje: Főoldal, TV, Műsorújság, Böngészés, Kedvencek, VOD
- Gyerektartalom-jelölés (minden profilban közös), az ismert gyerekcsatornák és -VOD-ok alapból megjelölve; gyerekprofilnál a Beállításokban csatornánként / VOD-onként megadható, mit nézhet
- A VOD oldal sorai is átrendezhetők és ki-be kapcsolhatók
- Böngészés: szöveges keresés + ország / nyelv / kategória szűrők együtt

**Android natív lejátszó (1.15)**
- Android / Android TV: a filmek és sorozatrészek (MKV, MP4, AVI…) a beépített ExoPlayerrel (Media3) szólnak – AC3 / E-AC3 / DTS / TrueHD hang (a Jellyfin FFmpeg-dekóderével, ha az eszköz maga nem tudja), a fájlba ágyazott ASS / SRT felirat, választható hangsávok; a kép a WebView alatt, a vezérlők és a felirat a megszokott felületen. Hiba esetén magától a WebView lejátszójára vált.
- A lejátszó könyvtárai Gradle nélkül: `npm run android-deps` (Maven POM-feloldás, újabb d8 / R8)

**Javítások (1.14.1)**
- **Linux: MKV / MP4 hang és felirat a beépített lejátszóban.** A Linuxos FFmpeg teljesen statikus, és az ilyen bináris sok rendszeren nem tud domainnevet feloldani, ezért ott a híd el sem érte a fájlt. Mostantól az FFmpeg minden platformon az app helyi továbbítóján (127.0.0.1) át olvas; a névfeloldást, HTTPS-t, átirányítást és fejléceket az Electron végzi. A Beállítások → Lejátszás alatt látszik a híd állapota (FFmpeg-verzió), és ha egy fájl nem elemezhető, a lejátszó kiírja az okát
- Lejátszási híd: a NAS / helyi fájlok (`file://`, szóközös, ékezetes útvonal) is működnek; kilépéskor minden FFmpeg leáll; a film vége után is lehet tekerni; az átmeneti elemzési hiba nem ragad meg
- MP4 / WebM azonnal indul a beépített lejátszóval, az elemzés a háttérben fut (AC3 hang / beágyazott felirat esetén ugyanonnan átvált a hídra); MKV / AVI elemzése legfeljebb 10 mp-ig várat
- A VOD-listákból átadott élő adások a két médiatár között nem írják felül egymást
- Telefonon nem lóg ki semmi: a beállítások gombjai és a névjegy útvonala, a súgó lapozója, kódblokkjai és táblázatai, az adatlap gombjai tördelődnek
- Film vége után a lejátszó nem zár be, ha közben visszatekertél

**VOD és csatornák szétválasztva (1.14)**
- A „Filmek és sorozatok” neve **VOD**; a menüben a tévés részek után áll, a *Saját médiatár* fülként a VOD-on belül van
- A csatornák között csak élő adás: a csatornalistákban talált filmek / sorozatrészek (hosszjelölés, `/movie/` – `/series/` cím, filmfájl évszámmal / részszámmal) a VOD-ba kerülnek, a VOD-listák élő adásai a csatornák közé
- A VOD „Folytatás” sora a VOD oldalon van (a tévés főoldalon már nincs)
- Nagy, nem nyilvános VOD-lista támogatása (műfajcsomagok, sok ezer tétel)
- Linux: **AppImage** (Windowson is készíthető) és `.deb`; a webOS-változat szünetel

**Hangsávok, feliratok, borítók (1.13)**
- Lejátszási híd (asztali, beépített FFmpeg): AC3 / E-AC3 / DTS / TrueHD hang, a fájlba ágyazott feliratok (MKV: ASS / SRT, MP4: mov_text), minden hangsáv választható, régi videóformátumok (XviD, WMV, 10 bites H.264) – a kép átalakítás nélkül, MediaSource-szal, tekerhetően; csak a lejátszott részt tölti le
- Felirat alapból „a fájl alapértelmezése” (jelölés nélkül: nem magyar hangnál a magyar felirat)
- Leírás magyarul, ennek híján angolul; új források kulcs nélkül: AniList (anime), TVmaze (sorozat), angol Wikipédia (film, csatorna) – plakát, műfaj, év, értékelés, stúdió
- Borítók: kötegelt AniList-lekérdezés; saját médiatárban a fájl melletti kép (`poster.jpg`, `folder.jpg`, `Film.jpg`…) vagy a beágyazott borító
- Szolgáltatónkénti lassítás-kezelés (HTTP 429)

**Listák és rendezés (1.12)**
- Magyar elöl mindenhol: a magyarországi, majd a magyar nyelvű csatornák állnak elöl minden sorban, kategóriában, listában, a keresésben és a műsorújságban; a filmeknél a magyar jelölésű / magyar tárhelyű tételek
- Minden főoldali sor mellett kerek nyíl (egér / érintés), a sor végén „Összes” csempe (távirányító): a sor összes eleme egy oldalon, görgetés közben töltődve; új *Országok* oldal
- Film- és sorozatlista felvétele több fájlból vagy ZIP-ből: a műfaji fájlokból (akció, dráma…) műfajok lesznek; listánkénti sor és szűrő a Filmek oldalon; a felnőtt műfajok csak a *Felnőtt tartalom* beállítással
- Saját TV-listák: `#EXTGRP`, Kodi-stílusú `|User-Agent=…` fejlécek, `tvg-language`, országelőtag a névben (`HU:`, `|HU|`, `[HUN]`), magyar csoportnevek kategóriává; több fájl / ZIP egyszerre
- *Külső lejátszóban* (VLC, mpv, IINA; Androidon VLC / MX Player / Kodi): az AC3 / DTS hangú és MKV-be ágyazott feliratú fájlokhoz – a lejátszó magától felajánlja, ha a hang vagy a kép itt nem dekódolható
- Linux: indítás a rendszerrel (`~/.config/autostart`), AppImage helyben frissül, `.deb` / `.tar.gz` Windowson is készíthető; macOS: menüsor (Cmd+C/V/Q), Dock-ikonról előjön az ablak, rejtett indítás bejelentkezéskor, helyi hálózati engedély (kivetítés), `.zip` Windowson is készíthető

**Emlékeztetők és profilok (1.11)**
- Emlékeztető előidővel (a kezdéskor vagy 1–30 perccel előtte), automatikus átkapcsolás, „minden adására” szabály
- Értesítés: Windows/Mac/Linux rendszerértesítés (a tálcán futva bezárt ablaknál is, indítás a rendszerrel), Android rendszerértesítés bezárt alkalmazásnál és újraindítás után is, LG tévén felugró üzenet
- Saját profilkép feltöltése (PNG/JPG/WebP → 256×256), a profillal együtt költözik
- Profilok átvétele a meglévők megtartásával (fájlból vagy hálózaton, „Csak a profilok”)

**Extrák (1.8)**
- Szülői felügyelet: profilonkénti PIN-kód; gyerekprofilból csak felnőtt PIN-nel lehet kilépni, beállítani
- *Folytatás* sor a főoldalon: félbehagyott filmek és részek minden listából és a saját médiatárból
- Élő adás megállítása és visszatekerése a pufferből (kb. 30 percig), *Ugrás élőbe*
- Kivetítés Chromecastra és DLNA-tévére (asztali): a gép továbbítja az adást, így a fejléces / CORS nélküli adások is mennek
- Éjszakai hang: hangos részek tompítása, párbeszéd kiemelése (asztali)
- Nézési statisztika profilonként (napok, napszakok, csatornák, kategóriák, filmek)
- Beállítások átvitele a tévére a helyi hálózaton egy 4 jegyű kóddal, vagy webcímről
- Frissítés-ellenőrzés és telepítés (GitHub-kiadás vagy JSON-cím)

**Saját médiatár / NAS (1.6)**
- Külön *Saját* részleg a saját filmeknek és sorozatoknak: a NAS (vagy bármely) mappában – almappákkal
  együtt – automatikusan keletkező .m3u / .m3u8 lejátszólistákból. Forrás lehet megosztott mappa
  (`\\NAS\Media`, `Z:\`, `/mnt/nas`; asztali változat) vagy a NAS webes címe (http könyvtárlista; tévén is).
- Minden talált lejátszólista külön, ki-be kapcsolható lista; az újakat 10 percenként magától észreveszi.
- Relatív és helyi útvonalak feloldása, kiadási fájlnevek tisztítása (cím + év), magyar információk,
  borító a Wikidatából / TMDB-ből, OpenSubtitles-feliratok és a videó melletti .srt automatikus betöltése.

**Magyar információk és feliratok (1.5)**
- Filmek, sorozatok és tévécsatornák magyar címe, leírása, műfaja, rendezője, szereplői, országa a
  Wikidatából / Wikipédiából (kulcs nélkül), vagy saját TMDB-kulccsal a TMDB-ből (értékeléssel).
- Filmekhez és sorozatokhoz magyar és angol felirat az OpenSubtitles-ről (ingyenes fiók + API-kulcs kell),
  helyi .srt / .vtt fájl (ráhúzással is), időeltolás, betűméret, automatikus keresés.

**Filmek és sorozatok (1.4)**
- Külön oldal (fejléc: *Filmek és sorozatok*) M3U / M3U8 listákból betöltött filmekkel és sorozatokkal:
  Folytatás sor, Sorozatok, csoportonkénti / műfajonkénti sorok, rácsnézet szűrővel és kereséssel.
- Film vagy sorozat? A címből ismeri fel (S01E02, 1x02, Season/Episode, „5. rész”, 第5集…; egy fájlban
  sorszámozott címek → sorozat; évszám a cím végén → film). Részletek a súgóban.
- Saját film/sorozat listák külön (Beállítások → Filmek és sorozatok – listák): cím, fájl, beillesztés,
  vagy egy teljes GitHub-tárhely. Beépített: Orphaned Films, Közkincs filmek (OnlineM3U).
- Lejátszás tekerhető idősávval, ±10 mp, folytatás onnan, ahol abbahagytad (profilonként), sorozatnál
  automatikus következő rész.

**Csatornalisták (1.3)**
- Beépített, ki-be kapcsolható listák: iptv-org, Free-TV, **Magyar TV adók** (válogatott, szabadon fogható magyar
  adások – `lists/hu.m3u`, kiadás nélkül is frissíthető), Pluto TV, Samsung TV Plus, Plex, FreeCast Hub,
  DragonHall TV. Több bekapcsolt lista esetén az azonos csatornák egy csatornává olvadnak (tvg-id, majd
  név + ország, majd egyértelmű név alapján); a listák adásai egymás tartalék forrásai lesznek. A listák
  saját műsorújsága is betöltődik.
- A nem elérhető csatornák kártyája szürke, OFFLINE vagy ADÁSSZÜNET jelzéssel, a név alatt felirattal.
- 11 választható rajzolt profilkép (vagy betűs avatar).

**Felület**
- TV oldal Csatornák és Felvételek füllel; vízszintesen görgethető sorok: Legutóbb nézett,
  Kedvenceid, Most a TV-ben, hazai csatornák, kategóriák, országok
- Rámutatásra kinagyuló kártyák: lejátszás, kedvenc, részletek, az éppen futó és a következő műsor
- Böngészés kategória, ország, nyelv, minőség és állapot szerint
- Keresés csatornanévre, országra, kategóriára, hálózatra **és műsorcímre** (Ctrl+F vagy `/`)

**Csatornaadatok és műsorújság**
- Adatlap minden csatornához: ország, nyelv, kategória, hálózat, tulajdonos, indulás, weboldal, időzóna, adásforrások
- Műsorújság XMLTV-forrásokból, a csatornákhoz automatikusan párosítva; napi bontás az adatlapon
- Idővonalas műsorújság-rács (Kedvencek / hazai / minden csatorna, tegnaptól +3 napig)
- Emlékeztető műsorkezdésre (rendszerértesítés + „Nézem” gomb)

**Lejátszás**
- HLS (hls.js), MPEG-TS/FLV (mpegts.js), DASH (dash.js)
- Az adások által kért `User-Agent` / `Referer` fejlécek beállítása (`#EXTVLCOPT`, `http-referrer`)
- Automatikus tartalék forrás, ha egy adás nem indul el vagy megakad
- Csatornaváltás ↑/↓ billentyűvel, csatornaszám beírása (0–9), csatornalista-panel
- Minőség-, hangsáv- és forrásválasztás, mindig felül lévő mini lejátszó, egyenként elrejthető lejátszógombok
- Elalvási időzítő (lágy elhalkulással, akár a műsor végén)
- A képernyő nem alszik el lejátszás közben; médiabillentyűk

**Megbízhatóság**
- Háttérben ellenőrzi a megjelenő csatornák adásait (zöld pötty = működik, piros = nem elérhető)
- Teljes ellenőrzés egy gombnyomásra, a hibás csatornák elrejthetők

**Kényelem**
- Kedvencek (húzással rendezhetők, ez adja a csatornaszámokat), előzmények, utolsó csatorna folytatása
- Saját M3U listák URL-ről vagy fájlból, saját XMLTV műsorújság-források
- Profilok („Ki nézi?”), gyerekprofil csak gyerek-, családi, animációs és oktatási csatornákkal
- Felnőtt tartalom alapból rejtve
- Mentés és visszaállítás fájlba (beállítások, profilok, kedvencek, emlékeztetők)
- Teljes billentyűzetes / távirányítós vezérlés (nyilak, Enter, Esc / Backspace)

**Rádió**
- Új menüpont a TV után: **élő rádióadók a világból**, a TV oldal mintájára sorokban (Legutóbb hallgatott, Kedvenc rádiók, a hazai ország adói, Műfajok, Népszerű a világban, Országok), böngészés kereséssel és szűrőkkel (ország, műfaj, minőség, működés). Mindenhol a működő adók elöl.
- Források (mind kikapcsolható): **Radio Browser** (közösségi adatbázis, a lejátszást jelzi is nekik), **Verified Radio Streams** (kipróbált adások), **IPRD** (országonkénti válogatás). Az ugyanazon adó több forrásból egy kártya, a címei tartalékként egymás után próbálódnak. Saját M3U rádiólista webcímről (listánként beállítható frissítéssel) és `radio` fajtájú `.adaspack` csomag.
- **Mini-lejátszó** alul (adó, most szól, kis spektrum, előző / szünet / következő, kedvenc, hangerő) és **Most szól** nézet: a szám címe és előadója az adás ICY-metaadatából (`icy.js`, Androidon `MainActivity.icyTitle`), borító az iTunes-keresőből, *Előtte szólt* lista, keresés a YouTube-on / Spotify-on, az adó honlapja.
- **Hangzás** (Web Audio, asztalon és Androidon): hangszínszabályzó előbeállítások, hangerő-kiegyenlítés, térhatás, retro rádió (középhullámú készülék), átúsztatás adóváltáskor; **vizualizáció**: spektrum, hullám, tükör, hullámhegyek; **elalvás-időzítő** elhalkulással. LG webOS-en effektek nélkül szól.
- **Műsorújság** a tévés felületével (Kedvencek / hazai / minden adó, napok, idővonal, most műsoron): a rádióadók is részt vesznek a műsorújság párosításában (a magyar közszolgálati adók az epgshare01-forrás „MR1-Kossuth” stb. nevével is); a most futó műsor a kártyán és a Most szól nézetben is.
- **Felvétel** (asztali): azonnal a ● gombbal vagy a műsorújságból ütemezve; a hang változatlanul MP3 / AAC fájlba (más kódolásnál AAC-be alakítva), vágható; a Rádió oldal **Felvételek** fülén. **Kedvencek** fül sorba rendezéssel.
- Kedvenc adók a Kedvencek oldalon is; billentyűk: szóköz / médiagomb, CH+ / CH−. Videó indításakor a rádió elhallgat. Beállítások → **Rádió**: a menüpont kikapcsolható (gyerekprofilban nem látszik).

## Csatornalisták, saját csatornák

- **Frissítés egy kattintással**: profilmenü → *Csatornalista frissítése* (alatta az utolsó frissítés ideje), vagy Beállítások → Csatornalisták → *Minden lista frissítése most*.
- **Saját lejátszólisták**: címről (azonnali ellenőrzéssel), fájlból, szövegként beillesztve vagy az ajánlott listák közül; ki-/bekapcsolható, átnevezhető.
- **Saját csatornák**: egyenként felvett adások névvel, logóval, kategóriával, országgal, szükség esetén User-Agent/Referer fejléccel; mentés előtt kipróbálhatók. A főoldalon *Saját csatornák* sorban jelennek meg.

## Súgó

Beépített, kereshető súgó 70 témakörrel (első lépések, lejátszás, keresés, műsorújság, személyre szabás, listák, tévé, hibaelhárítás, GYIK, adatvédelem). Megnyitás: <kbd>F1</kbd>, <kbd>?</kbd>, a fejléc kérdőjel ikonja vagy a profilmenü – mindig az aktuális képernyőhöz tartozó témával. A beállítások egyes részeinél a ? gomb a vonatkozó témára visz.

## Billentyűparancsok

| Billentyű | Művelet |
|---|---|
| Nyilak | Mozgás a felületen |
| Enter | Lejátszás / kiválasztás |
| I | Csatorna adatai |
| F (kártyán) | Kedvenc be/ki |
| Esc / Backspace | Vissza |
| Ctrl+F vagy / | Keresés |
| ↑ / ↓, PageUp / PageDown | Előző / következő csatorna (lejátszás közben) |
| ← / → | Hangerő (lejátszás közben) |
| 0–9 | Csatornaszám |
| Szóköz | Szünet / lejátszás |
| Enter / L | Csatornalista |
| M / F / N / S | Némítás / teljes képernyő / mini lejátszó / kedvenc |
| Shift+← / Shift+→, End | Élő adás: 30 mp vissza / előre, ugrás élőbe |
| C | Hang és felirat |

## Megjegyzések

- Az iptv-org lista közösségi gyűjtemény; az adásokat a csatornák saját szerverei szolgáltatják,
  sok közülük időnként vagy véglegesen elérhetetlen, egyesek földrajzilag korlátozottak.
- Műsorújság nem minden csatornához érhető el. Alapból a magyar források vannak bekapcsolva; további
  országok a Beállítások → Műsorújság alatt kapcsolhatók be, vagy saját XMLTV cím adható meg.
- A `src/index.html` böngészőben is megnyitható (fejlesztéshez), de ott a CORS-korlátozások miatt a
  legtöbb adás és a műsorújság nem tölthető be – a teljes funkcionalitás az asztali alkalmazásban érhető el.
