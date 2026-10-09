// Adás – integrierte Hilfe (Deutsch). Gleicher Aufbau wie help-content.js (gleiche ids und cats); lädt help.js.
// Die Texte sind vertrauenswürdige, mit dem Programm ausgelieferte HTML-Fragmente.

export const HELP_CATEGORIES = [
  { id: 'start', title: 'Erste Schritte' },
  { id: 'watch', title: 'Ansehen und Wiedergabe' },
  { id: 'vod', title: 'VOD (Filme und Serien)' },
  { id: 'find', title: 'Suchen und Durchsuchen' },
  { id: 'guide', title: 'TV-Programm und Erinnerungen' },
  { id: 'personal', title: 'Personalisierung' },
  { id: 'lists', title: 'Senderlisten' },
  { id: 'tv', title: 'Auf dem Fernseher und unter Android' },
  { id: 'trouble', title: 'Fehlerbehebung' },
  { id: 'about', title: 'Sonstiges' },
];

const go = (href, label) => `<a class="btn small" href="${href}">${label}</a>`;
const t = (id, label) => `<a href="#/help?topic=${id}">${label}</a>`;

export const ARTICLES = [
  // ===================================================================== Erste Schritte
  {
    id: 'welcome',
    cat: 'start',
    title: 'Willkommen bei Adás',
    keywords: 'einführung was ist das überblick start',
    body: `
<p class="lead">Adás spielt Live-TV-Sender aus aller Welt ab, in einer Oberfläche wie bei Streamingdiensten. Die Senderliste stammt aus der öffentlichen, gemeinschaftlich gepflegten Sammlung <b>iptv-org</b> – über zehntausend frei empfangbare Streams.</p>
<h2>Teile der Oberfläche</h2>
<table class="help-table">
<tr><td><b>Startseite</b></td><td>Überblick: Wetter, was auf deinen Lieblingssendern läuft, Nachrichten, das heutige Abendprogramm, Weiterschauen für TV und VOD. ${t('dashboard', 'Details')}</td></tr>
<tr><td><b>TV</b></td><td>Vier Tabs: Sender, TV-Programm, Durchsuchen und (am Computer) Aufnahmen. Im Tab Sender: zuletzt gesehen, Favoriten, was gerade läuft, und Zeilen nach Kategorie. ${t('home', 'Details')}</td></tr>
<tr><td><b>TV-Programm</b> (unter TV)</td><td>Ein Zeitleisten-Raster: was jetzt und später auf den einzelnen Sendern läuft. ${t('guide-grid', 'Details')}</td></tr>
<tr><td><b>Durchsuchen</b> (unter TV)</td><td>Alle TV-Sender, gefiltert nach Kategorie, Land, Sprache und Qualität. ${t('browse', 'Details')}</td></tr>
<tr><td><b>VOD</b></td><td>Filme und Serien: Online-Listen und deine eigene Mediathek, in Zeilen nach einheitlichen Genres. ${t('vod-lists', 'Details')}</td></tr>
<tr><td><b>Favoriten</b></td><td>Deine markierten Sender – ihre Reihenfolge ergibt die Sendernummern – und darunter deine Lieblingsfilme und -serien (Detailseite → ☆ Favorit). ${t('favorites', 'Details')}</td></tr>
<tr><td><b>Suche</b> (Lupe)</td><td>Sender und Sendungen suchen. ${t('search', 'Details')}</td></tr>
<tr><td><b>Glocke</b></td><td>Deine Sendungserinnerungen. ${t('reminders', 'Details')}</td></tr>
<tr><td><b>Profilbild</b></td><td>Profil wechseln, Senderliste aktualisieren, Sender hinzufügen, Hilfe, Einstellungen.</td></tr>
</table>
<h2>Schnellstart in fünf Schritten</h2>
<ol>
<li>Wähle ein Profil (auf dem Bildschirm „Wer schaut?“) oder lege ein eigenes an. ${t('profiles', 'Profile')}</li>
<li>Klicke auf der Startseite auf einen Sender – er startet sofort. ${t('playing', 'Wiedergabe')}</li>
<li>Markiere deine Favoriten mit der <b>+</b>-Taste auf der Karte. ${t('favorites', 'Favoriten')}</li>
<li>Wähle unter Einstellungen → Darstellung einen Stil für die Oberfläche. ${t('themes', 'Stile')}</li>
<li>Fehlt ein Sender, füge ihn als eigenen Sender oder als eigene Liste hinzu. ${t('custom-channels', 'Eigene Sender')}</li>
</ol>
<div class="tip"><b>Tipp:</b> Die Hilfe lässt sich überall mit <kbd>F1</kbd> oder <kbd>?</kbd> öffnen, oder mit dem Fragezeichen-Symbol in der Kopfzeile – sie öffnet sich immer beim Thema des gerade verwendeten Bildschirms.</div>`,
  },
  {
    id: 'first-steps',
    cat: 'start',
    title: 'Der erste Start',
    keywords: 'start laden langsam erstes mal profil land sprache',
    body: `
<p>Beim ersten Start fragt ein kurzer Assistent nach der <b>Sprache der Oberfläche</b>, legt dann dein <b>Profil</b> an (Name und Profilbild) und auf Wunsch ein <b>Kinderprofil</b> (kann übersprungen werden). Danach lädt das Programm die Senderliste und die Senderdaten herunter (Länder, Sprachen, Logos, Kategorien – insgesamt ca. 25 MB). Je nach Verbindung kann das eine halbe Minute dauern; danach wird die verarbeitete Liste gespeichert, sodass spätere Starts nur wenige Sekunden brauchen.</p>
<h2>Was passiert im Hintergrund?</h2>
<ol>
<li><b>Senderliste</b>: Download und Verarbeitung (aktualisiert sich alle 6 Stunden selbst).</li>
<li><b>TV-Programm</b>: Download der eingeschalteten Quellen (standardmäßig die deines Heimatlandes) – läuft im Hintergrund, nachdem die Oberfläche erschienen ist. ${t('epg-sources', 'Quellen')}</li>
<li><b>Verfügbarkeitsprüfung</b>: Die Desktop- und die TV-Version probieren die Streams der angezeigten Sender leise aus. ${t('health', 'Details')}</li>
</ol>
<h2>Empfohlene erste Einstellungen</h2>
<ul>
<li><b>Heimatland</b> (Einstellungen → Inhalte und Kinder → Inhalt): Seine Sender kommen nach vorn und erhalten die Sendernummern. Es wird anhand der beim ersten Start gewählten Sprache festgelegt.</li>
<li><b>Stil der Oberfläche</b>: Wähle aus sechzehn Looks, pro Profil. ${t('themes', 'Stile')}</li>
<li><b>Kinderprofil</b>: Nutzt auch ein Kind die App, richte ihm ein eigenes Profil ein. ${t('kids', 'Details')}</li>
</ul>
${go('#/settings', 'Einstellungen öffnen')}`,
  },
  {
    id: 'navigation',
    cat: 'start',
    title: 'Bedienung mit Maus, Tastatur oder Fernbedienung',
    keywords: 'navigation pfeile fokus maus tastatur fernbedienung enter zurück',
    body: `
<p>Adás lässt sich vollständig mit Maus, Tastatur und TV-Fernbedienung bedienen.</p>
<h2>Mit der Maus</h2>
<ul>
<li>Klick auf eine Karte: abspielen. Beim Darüberfahren erscheinen (je nach Stil) Tasten: abspielen, Favorit, Details.</li>
<li>Rechtsklick auf eine Karte: die Detailseite des Senders.</li>
<li>Mit den Pfeilen am Zeilenende blättern oder horizontal scrollen.</li>
</ul>
<h2>Mit Tastatur / Fernbedienung</h2>
<ul>
<li><kbd>←</kbd> <kbd>→</kbd> <kbd>↑</kbd> <kbd>↓</kbd>: die Auswahl (weißer Rahmen) über den Bildschirm bewegen. Das Programm wählt das nächstliegende Element in dieser Richtung.</li>
<li><kbd>Enter</kbd> / OK: abspielen oder die ausgewählte Taste drücken.</li>
<li><kbd>I</kbd>: Detailseite des ausgewählten Senders. <kbd>F</kbd>: Favorit an/aus.</li>
<li><kbd>Esc</kbd> / <kbd>Backspace</kbd> / Zurück: schließen bzw. zurück zum vorherigen Bildschirm.</li>
</ul>
<p>Alle Tasten: ${t('shortcuts', 'Tastenkürzel')} · Auf dem Fernseher: ${t('tv-remote', 'Tasten der Fernbedienung')}</p>`,
  },
  {
    id: 'shortcuts',
    cat: 'start',
    title: 'Tastenkürzel',
    keywords: 'tastenkürzel taste kbd befehl shortcut',
    body: `
<h2>Allgemein</h2>
<table class="help-table keys">
<tr><td><kbd>←</kbd> <kbd>→</kbd> <kbd>↑</kbd> <kbd>↓</kbd></td><td>Bewegen in der Oberfläche</td></tr>
<tr><td><kbd>Enter</kbd></td><td>Abspielen / auswählen</td></tr>
<tr><td><kbd>I</kbd></td><td>Detailseite des ausgewählten Senders</td></tr>
<tr><td><kbd>F</kbd></td><td>Favorit an/aus (auf einer Karte)</td></tr>
<tr><td><kbd>Strg</kbd>+<kbd>F</kbd> oder <kbd>/</kbd></td><td>Suche</td></tr>
<tr><td><kbd>F1</kbd> oder <kbd>?</kbd></td><td>Hilfe zum aktuellen Bildschirm</td></tr>
<tr><td><kbd>Esc</kbd> / <kbd>Backspace</kbd></td><td>Zurück, Fenster schließen</td></tr>
</table>
<h2>Während der Wiedergabe</h2>
<table class="help-table keys">
<tr><td><kbd>↑</kbd> / <kbd>↓</kbd>, <kbd>Bild auf</kbd> / <kbd>Bild ab</kbd></td><td>Vorheriger / nächster Sender</td></tr>
<tr><td><kbd>←</kbd> / <kbd>→</kbd></td><td>Lautstärke leiser / lauter</td></tr>
<tr><td><kbd>0</kbd>–<kbd>9</kbd></td><td>Sendernummer eingeben (wechselt nach 1,3 s)</td></tr>
<tr><td><kbd>Leertaste</kbd> / <kbd>K</kbd></td><td>Pause / weiter</td></tr>
<tr><td><kbd>Enter</kbd> / <kbd>L</kbd></td><td>Senderliste</td></tr>
<tr><td><kbd>M</kbd></td><td>Stumm</td></tr>
<tr><td><kbd>F</kbd></td><td>Vollbild</td></tr>
<tr><td><kbd>N</kbd></td><td>Mini-Player (Desktop-Version)</td></tr>
<tr><td><kbd>S</kbd></td><td>Favorit an/aus</td></tr>
<tr><td><kbd>I</kbd></td><td>Detailseite des Senders</td></tr>
<tr><td><kbd>Esc</kbd></td><td>Panel schließen → Mini-Modus verlassen → Vollbild verlassen → Player schließen</td></tr>
</table>`,
  },

  // ===================================================================== Ansehen
  {
    id: 'playing',
    cat: 'watch',
    title: 'Wiedergabe starten',
    keywords: 'ansehen starten abspielen quelle ersatz verbinden',
    body: `
<p>Einen Sender kannst du auf mehrere Arten starten:</p>
<ul>
<li>klicke auf seine Karte (oder wähle sie aus und drücke <kbd>Enter</kbd>),</li>
<li>mit der Taste <b>Abspielen</b> auf der Detailseite oder der ▶-Taste einer bestimmten Stream-Quelle,</li>
<li>im TV-Programm per Klick auf den Sendernamen oder mit der Taste <b>Jetzt ansehen</b> bei einer laufenden Sendung,</li>
<li>im Player aus der Senderliste, mit den Auf-/Ab-Tasten oder durch Eingabe der Sendernummer.</li>
</ul>
<h2>Was passiert beim Start?</h2>
<p>Ein Sender kann mehrere <b>Stream-Quellen</b> haben (unterschiedliche Qualität, Region oder Server). Das Programm beginnt mit der, die es für die beste hält: Es bevorzugt eine, die schon funktioniert hat, und bessere Qualität, und stuft geogesperrte oder nicht rund um die Uhr sendende Quellen herab.</p>
<p>Startet die Quelle nicht innerhalb von 20 Sekunden oder stockt sie bei der Wiedergabe, versucht das Programm von selbst die nächste Quelle („Andere Quelle wird versucht 2/3…“). Gibt es noch eine unversuchte Quelle, wechselt es bei einem hängenden Stream schon nach 10 Sekunden (sonst wartet es 30 Sekunden). Abschaltbar: Einstellungen → Wiedergabe → <i>Automatische Ersatzquelle</i>.</p>
<h2>Vorheriger Sender, Lautstärke pro Sender, Untertitelstil</h2>
<p>Die Taste <kbd>R</kbd> (oder die ↺-Taste der Steuerleiste, die Taste <i>Vorheriger</i> der Handy-Fernbedienung) schaltet zurück zum zuvor gesehenen Sender. Unter Einstellungen → Wiedergabe lässt sich <b>Lautstärke pro Sender</b> einschalten: Jeder Sender merkt sich seine eigene Lautstärke. Dort stellst du auch Größe, Farbe (weiß, gelb, hellblau) und Hintergrund (dunkler Balken, Schatten, keiner) der Untertitel ein.</p>
<p>Funktioniert keine Quelle, erscheint das Fenster <b>„Dieser Stream ist gerade nicht verfügbar“</b>, in dem du es erneut versuchen, zum nächsten Sender wechseln oder zurückgehen kannst. ${t('trouble-playback', 'Was kann ich dann tun?')}</p>`,
  },
  {
    id: 'player-controls',
    cat: 'watch',
    title: 'Die Bedienelemente des Players',
    keywords: 'player tasten steuerung lautstärke vollbild live',
    body: `
<p>Die Bedienelemente erscheinen, wenn du die Maus bewegst oder eine Taste drückst, und verschwinden nach 3,5 Sekunden Inaktivität.</p>
<h2>Oben</h2>
<ul>
<li><b>← Zurück</b>: den Player schließen.</li>
<li>Logo, <b>Sendernummer</b>, Name und Land des Senders und – wenn du ihn aus einer Zeile gestartet hast – der Name der Zeile.</li>
<li>Die Kennzeichnung <b>LIVE</b>.</li>
</ul>
<h2>Unten</h2>
<ul>
<li><b>JETZT</b>: Titel, Uhrzeit und Fortschrittsbalken der laufenden Sendung; darunter die nächste Sendung (falls ein TV-Programm vorhanden ist).</li>
<li>▶/❚❚ <b>Pause</b> – bei einem Livestream geht es dort weiter, wo der Puffer steht.</li>
<li>⌃ ⌄ <b>Vorheriger / nächster Sender</b>. ${t('channel-switching', 'Wie wird die Reihenfolge bestimmt?')}</li>
<li>🔊 <b>Lautstärke</b> und Stummschaltung (die Lautstärke bleibt für den nächsten Start erhalten).</li>
<li>＋/✓ <b>Favorit</b>, ⓘ <b>Details</b>.</li>
<li>☾ <b>Sleep-Timer</b>. ${t('sleep', 'Details')}</li>
<li><b>CC</b> – <b>Ton und Untertitel</b>: Tonspur und Untertitel wählen (<kbd>C</kbd>). ${t('audio-subs', 'Details')}</li>
<li>⚙ <b>Qualität und Quelle</b>. ${t('quality', 'Details')} Hier ist auch das Panel <b>📊 Stream-Infos</b> (<kbd>D</kbd>): Auflösung, Bitrate, Download-Geschwindigkeit, Puffer. ${t('stream-info', 'Details')}</li>
<li>☰ <b>Senderliste</b> rechts, mit Filter.</li>
<li>↺30 / ↻30 <b>Zurück- und Vorspulen</b> im Livestream, <b>Zu live springen</b>. ${t('timeshift', 'Details')}</li>
<li>▦ <b>Mehrere Streams gleichzeitig</b>. ${t('multiview', 'Details')}</li>
<li><b>Übertragen</b> auf Chromecast oder einen DLNA-Fernseher (Desktop-Version). ${t('cast', 'Details')}</li>
<li><b>Mini-Player</b>, <b>Vollbild</b>; die Zusatztasten lassen sich einzeln ausblenden. ${t('pip-mini', 'Details')}</li>
</ul>
<div class="tip">Doppelklick auf das Bild: Vollbild (im Mini-Modus: zurück zur normalen Größe). Ein Klick auf das Bild: Pause / weiter.</div>`,
  },
  {
    id: 'channel-switching',
    cat: 'watch',
    title: 'Senderwechsel und Sendernummern',
    keywords: 'sendernummer nummer wechsel auf ab reihenfolge lineup panel',
    body: `
<h2>Auf / ab wechseln</h2>
<p><kbd>↑</kbd>/<kbd>↓</kbd> (oder CH+/CH−) geht in der Liste weiter, aus der du den Sender gestartet hast. Hast du z. B. aus der Zeile „Sport“ gestartet, wechselst du zwischen Sportsendern; aus den Favoriten, zwischen deinen Favoriten. Hast du aus der Suche oder einer Detailseite gestartet, bestimmen deine Favoriten (oder, wenn keine vorhanden sind, die Sender des Heimatlandes) die Reihenfolge.</p>
<h2>Sendernummern</h2>
<p>Die Nummern funktionieren wie beim Fernseher: <b>Die Reihenfolge deiner Favoriten ergibt die ersten Nummern</b> (1, 2, 3…), danach folgen die Sender des Heimatlandes. Die Reihenfolge änderst du auf der Seite Favoriten per Ziehen. ${go('#/favorites', 'Favoriten')}</p>
<p>Gib während der Wiedergabe die Nummer ein (<kbd>0</kbd>–<kbd>9</kbd>, bis zu 4 Ziffern) – sie erscheint oben rechts, und nach 1,3 Sekunden wird umgeschaltet.</p>
<h2>Senderliste</h2>
<p>Während der Wiedergabe öffnet <kbd>Enter</kbd> oder <kbd>L</kbd> (auf dem Fernseher die blaue Taste) rechts die Sender der Liste mit der laufenden Sendung. Oben kannst du nach Namen filtern.</p>`,
  },
  {
    id: 'quality',
    cat: 'watch',
    title: 'Qualität und Stream-Quelle',
    keywords: 'qualität auflösung 1080p 720p quelle bitrate automatisch',
    body: `
<p>Die ⚙-Taste des Players (auf dem Fernseher die gelbe Taste) öffnet ein Menü:</p>
<ul>
<li><b>Qualität</b>: Bei <i>Automatisch</i> passt der Player die Auflösung an Bandbreite und Fenstergröße an (in einem kleinen Fenster oder im Mini-Player lädt er kein Full HD). Du kannst von Hand die beste oder eine niedrigere Qualität festlegen (z. B. bei langsamem mobilem Internet). Viele Streams gibt es nur in einer Qualität – das zeigt das Menü dann an.</li>
<li><b>Höchste Qualität</b> (Einstellungen → Wiedergabe): eine feste Obergrenze für alle Streams – 1080p, 720p, 480p oder 360p (Datensparmodus). Weniger Stocken und weniger Datenverbrauch bei langsamer oder mobiler Verbindung. Während der Wiedergabe geändert, gilt es sofort.</li>
<li><b>Quelle</b>: alle Stream-Quellen des Senders mit Statuspunkt (grün = hat funktioniert, rot = nicht, grau = nicht geprüft). Stockt eine, probiere eine andere.</li>
</ul>
<p>Tonspur und Untertitel wählst du im Menü der <b>CC</b>-Taste. ${t('audio-subs', 'Ton und Untertitel')}</p>
<div class="note">Die Qualitätswahl funktioniert mit den Playern hls.js und dash.js. Der integrierte Player eines Fernsehers entscheidet selbst über die Qualität. ${t('engines', 'Wiedergabe-Engines')}</div>`,
  },
  {
    id: 'audio-subs',
    cat: 'watch',
    title: 'Tonspur und Untertitel – überall',
    keywords: 'tonspur ton sprache audio synchronfassung original untertitel cc eingebettet videotext subtitle lieblingssprache',
    body: `
<p>Die <b>CC</b>-Taste des Players (oder die Taste <kbd>C</kbd>, auf dem Fernseher die Taste <i>Subtitle</i> der Fernbedienung) öffnet das Menü <b>Ton und Untertitel</b> – <b>bei Livestreams, Filmen, Serien und deinen eigenen Videos gleichermaßen</b>.</p>
<h2>Tonspur</h2>
<p>Enthält der Stream oder die Datei mehrere Tonspuren (z. B. Synchronfassung und Originalsprache oder Audiodeskription), wählst du hier. Die Namen der Spuren zeigt das Programm in der Sprache der Oberfläche (<i>Deutsch</i>, <i>Englisch</i>, <i>Ungarisch</i>…). Gibt es nur eine Spur, zeigt das Menü das an.</p>
<h2>Untertitel</h2>
<ul>
<li><b>Eingebettete Untertitel</b>: die im Stream oder in der Videodatei selbst enthaltenen (HLS-/DASH-Untertitelspur, MP4-/MKV-Untertitelspur). Bei Livestreams gibt es nur diese.</li>
<li><b>Externe Untertitel</b> (Filme, Serien, eigene Videos): eine .srt-Datei neben dem Video, ein Treffer von Feliratok.eu oder OpenSubtitles oder eine eigene Datei. ${t('subtitles', 'Untertitel')}</li>
<li>Es ist immer nur ein Untertitel zu sehen: Wählst du einen externen, schaltet sich der eingebettete aus und umgekehrt.</li>
<li>Die <b>Größe</b> lässt sich überall einstellen; der <b>Zeitversatz</b> gilt für externe Untertitel.</li>
</ul>
<h2>Lieblingssprachen pro Profil</h2>
<p>Unten in Einstellungen → Untertitel und Informationen → <b>Infos und Untertitel auf Deutsch</b> legst du fest, <b>welche Tonspur</b> (Standard des Streams / Deutsch / Englisch) und <b>welche eingebetteten Untertitel</b> (aus / Deutsch / Englisch) dein Profil bevorzugt. Der Player wählt diese bei jedem neuen Stream und Video automatisch, wenn verfügbar.</p>
<div class="note">Die Desktop-Version kann auch mit dem integrierten Player (MP4, MKV) die Tonspur wechseln. Auf dem Fernseher hängt der Tonspurwechsel im integrierten Player vom Gerät ab; bei HLS-Streams funktioniert der Player hls.js überall.</div>
${go('#/settings?section=huinfo', 'Lieblingssprachen festlegen')}`,
  },
  {
    id: 'pip-mini',
    cat: 'watch',
    title: 'Mini-Player und die Player-Tasten',
    keywords: 'mini schwebendes fenster immer im vordergrund tasten steuerleiste ausblenden cc aufnahme',
    body: `
<h2>Mini-Player (<kbd>N</kbd>, nur Desktop-Version)</h2>
<p>Das ganze Adás-Fenster schrumpft auf 480×270 Pixel, wandert in die untere rechte Bildschirmecke und bleibt <b>immer im Vordergrund</b>. Dann sind nur das Bild und einige Grundtasten zu sehen. Doppelklick oder <kbd>Esc</kbd>: zurück zur normalen Größe. Auf dem Fernseher nicht verfügbar.</p>
<h2>Die Player-Tasten</h2>
<p>Die Zusatztasten der Steuerleiste (Aufnahme, 30 s zurück / vor, vorheriger Sender, Favorit, Details, Ton und Untertitel (CC), Sleep-Timer, Senderliste, Mehrfachansicht, Übertragen, Mini-Player, Vollbild) lassen sich einzeln ausblenden: Einstellungen → Wiedergabe → <b>Player-Tasten</b>. Die Tastenkürzel funktionieren auch bei ausgeblendeter Taste; Pause, Lautstärke und das ⚙-Menü sind immer sichtbar.</p>`,
  },
  {
    id: 'sleep',
    cat: 'watch',
    title: 'Sleep-Timer',
    keywords: 'timer schlafen ausschalten nacht ende der sendung',
    body: `
<p>Stelle ihn mit der ☾-Taste des Players ein: 15, 30, 45, 60, 90, 120 Minuten oder <b>„Am Ende der Sendung“</b> (nimmt das Ende der laufenden Sendung aus dem TV-Programm – nur wählbar, wenn es für den Sender Programmdaten gibt).</p>
<p>Die kleine Zahl auf der Taste zeigt die verbleibenden Minuten. In den letzten 15 Sekunden wird der Ton sanft leiser, dann stoppt die Wiedergabe und der Player schließt sich. Ausschalten: im selben Menü <i>Aus</i>.</p>`,
  },
  {
    id: 'engines',
    cat: 'watch',
    title: 'Wiedergabe-Engines',
    keywords: 'hls.js nativ integrierter player mpegts dash engine format m3u8 ts mpd',
    body: `
<p>Streams kommen in verschiedenen Formaten, deshalb nutzt das Programm mehrere Wiedergabe-Engines:</p>
<table class="help-table">
<tr><td><b>hls.js</b></td><td>HLS-Streams (<code>.m3u8</code>) – Standard der Desktop-Version; unterstützt die Wahl von Qualität und Tonspur.</td></tr>
<tr><td><b>Integrierter Player</b></td><td>Der eigene Player des Systems / Fernsehers. Auf dem Fernseher ist er der Standard für HLS, weil hls.js dort wegen CORS-Beschränkungen viele Streams nicht erreichen würde.</td></tr>
<tr><td><b>mpegts.js</b></td><td>MPEG-TS- (<code>.ts</code>) und FLV-Streams.</td></tr>
<tr><td><b>dash.js</b></td><td>DASH-Streams (<code>.mpd</code>).</td></tr>
</table>
<p>Einstellungen → Wiedergabe → <b>Wiedergabe-Engine</b>: <i>Automatisch</i> (empfohlen), <i>Integrierter Player</i> oder <i>hls.js</i>. Startet ein HLS-Stream mit der einen nicht, probiere die andere. Auf dem Fernseher macht das Programm das selbst: Kommt der integrierte Player nicht zurecht, versucht es dieselbe Quelle auch mit hls.js.</p>`,
  },

  // ===================================================================== VOD
  {
    id: 'vod',
    cat: 'vod',
    title: 'VOD – Filme und Serien',
    keywords: 'film serie vod kino folge staffel weiterschauen gemeinfrei eigene mediathek nas online-listen sender sortierung',
    body: `
<p>Neben Live-TV-Sendern spielt Adás auch <b>Filme und Serien</b> ab (VOD – Video on Demand). Das sind keine Sender, sondern eigenständige Videos – jederzeit startbar, spulbar und dort fortsetzbar, wo du aufgehört hast. Im Menü steht <b>VOD</b> separat, nach den TV-Teilen (Startseite, TV-Programm, Durchsuchen, Favoriten).</p>
<h2>Zwei Bereiche: Online-Listen und eigene Mediathek</h2>
<p>Oben auf der VOD-Seite gibt es zwei Tabs: <b>Online-Listen</b> (die integrierten und hinzugefügten Film-/Serienlisten) und <b>Eigene Mediathek</b> (die in den Ordnern deines NAS / Computers gefundenen Wiedergabelisten).</p>
<h2>Sender oder VOD?</h2>
<p>Bei den Sendern gibt es nur Livestreams, im VOD nur Filme und Serien. Enthält eine Senderliste (z. B. von einem IPTV-Anbieter) auch Filme oder Serienfolgen – Längenangabe (<code>#EXTINF:5400</code>), Adresse mit <code>/movie/</code> oder <code>/series/</code> oder eine Videodatei mit Jahr / Folgennummer –, wandern diese von selbst ins VOD (mit dem Namen der Liste). Umgekehrt: Enthält eine VOD-Liste einen Livestream (HLS-/TS-Adresse ohne Länge, mit Gruppe „Live / TV“ oder tvg-id), kommt er zu den Sendern. In den Einstellungen siehst du neben den Listen, wie viel verschoben wurde.</p>
<h2>Die Seite Online-Listen</h2>
<ul>
<li><b>Weiterschauen</b>: begonnene Filme und Serien (der Fortschrittsbalken zeigt, wo du bist).</li>
<li><b>Serien</b>, <b>Empfohlene Filme</b>, dann die <b>einheitlichen Genres</b> (die beliebtesten zuerst; standardmäßig bekommen die 12 beliebtesten eine Zeile, die übrigen schaltest du unter Einstellungen → VOD und Mediathek → VOD-Listen → <i>Zeilen der VOD-Seite</i> ein, und im Filter sind sie immer wählbar), schließlich eine Zeile pro Liste. Die Genrenamen folgen der <b>Genreliste von AnimeAddicts</b> (Action, Drama, Fantasy, Abenteuer, Krimi, Mystery, Romantik, Science-Fiction, Thriller, Komödie…), ergänzt um <i>Dokumentation</i> und <i>Kultfilm</i>. Die eigenen Gruppen der Listen – in jeder Sprache, z. B. „Horror all night“, „Comedy“, „Komödie“ – ordnet das Programm diesen zu, sodass ein Genre nur einmal vorkommt. Reine Merkmale (z. B. <i>Nicht für Kinder</i>, <i>Kurze Folge(n)</i>, <i>CGI</i>) sind im Filter wählbar, bekommen aber keine eigene Zeile. Ein Titel kann in <b>mehreren Genres</b> erscheinen: Er erhält das Genre jeder seiner Listen, Dateien und Gruppen (z. B. wenn er in deinem Genrepaket sowohl in <code>action.m3u8</code> als auch in <code>komoedie.m3u8</code> steht). In der eigenen Mediathek bleiben Wiedergabelisten ohne Genrebezug (z. B. „Weihnachten“) als eigene Zeilen unter ihrem Namen.</li>
<li>Mit den Tasten <b>Alle Filme</b>, <b>Alle Serien</b> und <b>Suchen und filtern</b> bekommst du eine Rasteransicht mit Filter nach Typ, Gruppe und Jahr.</li>
</ul>
<p>Auch die Suche in der Kopfzeile findet Filme und Serien (unter der eigenen Überschrift „VOD – Filme und Serien“).</p>
<h2>Detailseite</h2>
<p>Ein Klick auf ein Cover öffnet die Detailseite:</p>
<ul>
<li><b>Film</b>: Titel, Jahr, Länge, Gruppen, Quelle; <i>Abspielen</i> oder <i>Fortsetzen ab xx:xx</i>, <i>Von vorn</i>, <i>Als angesehen markieren</i>.</li>
<li><b>Serie</b>: Staffeln in Tabs (jeweils angesehene / alle Folgen), die Liste der Folgen (angesehene blass, begonnene mit Fortschrittsbalken), Gesamtfortschritt; die Haupttaste startet die nächste anzusehende Folge. Die Taste <i>Staffel als angesehen markieren</i> markiert (oder löscht) alle Folgen der Staffel auf einmal.</li>
<li><b>+ Merkliste</b>: setzt den Film / die Serie auf deine eigene Liste – auf der VOD-Seite in der Zeile <i>Merkliste</i> (die Zeile lässt sich ein-/ausschalten und verschieben).</li>
<li><b>✎ Titel und Cover</b>: ein Fenster mit dem angezeigten Titel (z. B. wenn kein deutscher Titel gefunden wird) und dem Coverbild. Du kannst <b>Coverbilder auch mit eigenem Suchbegriff suchen</b> (z. B. mit dem Original- oder japanischen Titel) – Quellen ohne Schlüssel: AniList, Kitsu, MyAnimeList (Anime), TVmaze (Serien), deutsche und englische Wikipedia, Wikidata; mit eigenem Schlüssel TMDB und OMDb (IMDb-Daten). Auch eine eigene Bildadresse oder Bilddatei ist möglich, und das Originalcover lässt sich wiederherstellen. Die Änderung gilt mit <i>Speichern</i>.</li>
</ul>
<h2>Deutscher Titel, Coverbild</h2>
<p>Die Karten und der Kopf der Detailseite zeigen den <b>deutschen Titel</b> des Films / der Serie, falls bekannt (Wikidata, mit TMDB-Schlüssel TMDB) – auf der Detailseite darunter den Original- / englischen Titel, auf der Karte beim Darüberfahren. Die Suche findet den Eintrag auch über den deutschen Titel. Für Einträge ohne Cover sucht das Programm selbst eines; findet es keins, zeigt die Karte den Titel auf farbigem Hintergrund, und auf der Detailseite kannst du jederzeit mit <b>Titel und Cover</b> eines festlegen. Von Hand festgelegte Titel und Cover gelten in allen Profilen.</p>
<p>Der Angesehen-Status wird <b>pro Profil</b> gespeichert. In einem Kinderprofil erscheinen nur Familien-, Kinder- und Animationsinhalte.</p>
${go('#/vod', 'VOD öffnen')}`,
  },
  {
    id: 'vod-player',
    cat: 'vod',
    title: 'Filme ansehen: Spulen, Fortsetzen, nächste Folge',
    keywords: 'spulen springen vor zurück 10 sekunden zeitleiste nächste folge fortsetzen automatisch externer player vlc mpv iina ac3 dts mkv kein ton eingebettete untertitel',
    body: `
<p>Bei Filmen und Serienfolgen erscheint unten im Player statt der Live-Sendung eine <b>Zeitleiste</b> (vergangene / verbleibende Zeit). Durch Klicken oder Ziehen springst du an jede Stelle.</p>
<table class="help-table keys">
<tr><td><kbd>←</kbd> / <kbd>→</kbd></td><td>10 s zurück / vor (mit <kbd>Umschalt</kbd> 60 s)</td></tr>
<tr><td><kbd>↑</kbd> / <kbd>↓</kbd></td><td>Lautstärke</td></tr>
<tr><td><kbd>0</kbd>–<kbd>9</kbd></td><td>Sprung zu 0–90 % des Videos</td></tr>
<tr><td><kbd>Leertaste</kbd> / <kbd>Enter</kbd></td><td>Pause / weiter</td></tr>
<tr><td><kbd>Bild auf</kbd> / <kbd>Bild ab</kbd> (CH+/CH−)</td><td>Vorherige / nächste Folge</td></tr>
<tr><td><kbd>I</kbd></td><td>Detailseite</td></tr>
<tr><td>⏪ ⏩ auf der Fernbedienung</td><td>30 s zurück / vor</td></tr>
</table>
<h2>Fortsetzen</h2>
<p>Das Programm speichert alle 5 Sekunden und beim Beenden, wo du bist. Beim nächsten Mal startet die Taste <i>Weiterschauen</i> dort; <i>Von vorn</i> am Anfang. Hast du 94 % des Videos gesehen, gilt es als angesehen.</p>
<h2>Nächste Folge</h2>
<p>Bei Serien erscheint am Ende einer Folge der Hinweis <b>Nächste Folge</b> mit 8 Sekunden Countdown – <i>Abspielen</i> startet sofort, <i>Abbrechen</i> hält an. Abschaltbar: Einstellungen → VOD und Mediathek → VOD-Listen → <i>Nächste Folge automatisch starten</i>.</p>
<p>Die Einstellung „Am Ende der Sendung“ des Sleep-Timers bedeutet hier das Ende des Videos.</p>
<h2>Tonspuren und eingebettete Untertitel (Wiedergabebrücke)</h2>
<p>Der integrierte Player (die Chromium-Engine) kann allein keinen <b>AC3- / E-AC3- / DTS- / TrueHD</b>-Ton abspielen (er sieht diese Spuren nicht einmal), zeigt in die Datei <b>eingebettete Untertitel</b> (MKV: ASS / SRT, MP4: mov_text) gar nicht an und auch nicht das Bild mancher alten Videoformate (XviD, WMV, 10-Bit-H.264).</p>
<p>Die <b>Desktop-Version</b> schaut deshalb bei jedem Start eines Films / einer Folge kurz in die Spuren der Datei (integriertes <b>FFmpeg</b>) und spielt sie bei Bedarf über die <b>Wiedergabebrücke</b> ab: Das Bild bleibt unverändert, der Ton wird unterwegs in AAC umgewandelt, und die eingebetteten Untertitel kommen ins <b>CC</b>-Menü. So ist jede Tonspur wählbar, Spulen funktioniert (die Brücke startet an der gewählten Stelle neu), und auch die Lieblingssprachen für Ton und Untertitel des Profils greifen. Bei Untertiteln ist die Grundeinstellung <i>Standard der Datei</i>: Die in der Datei als Standard markierten Untertitel erscheinen, ohne Markierung – wenn der Ton nicht in deiner Sprache ist – die Untertitel in deiner Sprache.</p>
<p>Die Gestaltung der Untertitel (ASS-Schrift, Farben, Position) wird zu einfachem Text. Ausschalten: Einstellungen → Wiedergabe → <i>Wiedergabebrücke (FFmpeg)</i>. Die Brücke lädt nur den abgespielten Teil (ca. 90 Sekunden voraus), nicht die ganze Datei.</p>
<h2>Android und Android TV: nativer Player</h2>
<p>Unter Android laufen Filme und Serienfolgen (MKV, MP4, AVI…) im integrierten <b>nativen Player</b> (ExoPlayer): Das Bild erscheint unter der Oberfläche, die Bedienelemente sind dieselben. Er verarbeitet <b>AC3- / E-AC3- / DTS- / TrueHD</b>-Ton (kann das Gerät es nicht selbst, mit dem mitgelieferten FFmpeg-Decoder), in die Datei eingebettete <b>ASS- / SRT</b>-Untertitel (als einfacher Text), und jede Tonspur ist im <b>CC</b>-Menü wählbar. An einem Fernseher mit Soundbar / Verstärker kann der AC3-Ton auch unverändert durchgereicht werden. Kommt der native Player mit einer Datei nicht zurecht, versucht es das Programm automatisch mit dem eigenen Player der WebView. Ausschalten: Einstellungen → Wiedergabe → <i>Nativer Player (ExoPlayer)</i>.</p>
<h2>In einem externen Player</h2>
<p>Ist die Brücke / der native Player ausgeschaltet oder nicht verfügbar, erkennt der Player, wenn Ton oder Bild einer Datei nicht funktionieren, und bietet die Taste <b>Externer Player</b> an; auf der Detailseite gibt es außerdem immer die Taste <b>In einem externen Player</b>.</p>
<ul>
<li><b>Windows / Mac / Linux</b>: Das Programm übergibt dem System eine Wiedergabeliste (bei einer Serie ab der gewählten Folge mit den übrigen), die der zugeordnete Player öffnet. Empfohlen: <b>VLC</b> (auf allen Systemen), <b>mpv</b>, unter macOS <b>IINA</b>. Öffnet sich nichts, installiere einen und verknüpfe ihn mit <code>.m3u</code>-Dateien.</li>
<li><b>Android</b>: Das System bietet die installierten Videoplayer an (VLC, MX Player, Kodi…).</li>
<li>Auf dem <b>Fernseher</b> (LG) gibt es diese Möglichkeit nicht; der Player des Fernsehers verarbeitet AC3-Ton oft selbst.</li>
</ul>
<p>In einem externen Player kann Adás nicht verfolgen, wo du bist – die aktuelle Folge einer Serie wird aber gemerkt.</p>`,
  },
  {
    id: 'vod-lists',
    cat: 'vod',
    title: 'Film- und Serienlisten',
    keywords: 'filmliste serienliste hinzufügen github repository m3u m3u8 zip mehrere dateien genre gemeinfrei orphaned zusatzpaket adaspack',
    body: `
<p>Filme und Serien werden wie TV-Sender aus <b>eigenen Listen</b> geladen: Einstellungen → VOD und Mediathek → <b>VOD-Listen</b>.</p>
<h2>Integrierte Listen</h2>
<table class="help-table">
<tr><td><b>Orphaned Films</b></td><td>Über 1.300 gemeinfreie (Public-Domain-)Filme nach Themen gruppiert, mit Coverbildern.</td></tr>
<tr><td><b>Gemeinfreie Filme (OnlineM3U)</b></td><td>Ausgewählte klassische Filme nach Genres.</td></tr>
</table>
<p>Beide enthalten auf archive.org gespeicherte Filme, deren Urheberrechtsschutz abgelaufen ist. Jede lässt sich ein- und ausschalten.</p>
<h2>Zusatzpakete</h2>
<p>Eine <code>.adaspack</code>-Datei bringt eine Liste mit Namen und Beschreibung mit und erscheint bei den <b>Integrierten Listen</b> – sie kommt aber nicht mit dem Programm, sondern ist nur auf dem Gerät vorhanden, auf das du sie lädst:</p>
<ul>
<li>Taste <b>Zusatzpaket laden</b> (VOD-Listen), oder</li>
<li>in der Desktop-Version der <b>Paketordner</b> (der Unterordner <code>packs</code> des Benutzerdatenordners): Was dort liegt, wird beim Start automatisch geladen und bei Änderungen aktualisiert;</li>
<li>die <b>Sicherung</b> und die <b>Übertragung zwischen Geräten</b> nehmen die Pakete mit (z. B. vom Computer aufs Handy).</li>
</ul>
<p>Ein Filmpaket heißt <code>…_vod.adaspack</code>, ein TV-Paket <code>…_tv.adaspack</code> (letzteres kommt zu den Senderlisten). <b>Entfernen</b> löscht es nur von diesem Gerät. ${t('adaspack', 'Format und Erstellung (auch mit KI)')}</p>
<h2>Eigene Liste hinzufügen</h2>
<ul>
<li><b>Per Adresse</b>: die Adresse einer M3U-/M3U8-Liste, ein einzelnes Video (z. B. <code>…/film.m3u8</code> oder <code>.mp4</code>) oder ein <b>ganzes GitHub-Repository</b> (z. B. <code>https://github.com/autor/repo</code>) – dann lädt das Programm alle Wiedergabelisten des Repositorys (bis zu 300 Dateien). Auch ein GitHub-Link auf einen Ordner oder eine Datei im Repository funktioniert.</li>
<li><b>Aus Datei</b> (Desktop- und Android-Version): eine oder <b>mehrere</b> <code>.m3u</code>-/<code>.m3u8</code>-Dateien oder ein <b>ZIP</b>-Paket. Mehrere Dateien werden zu einer Liste:
  <ul>
  <li><b>Genrepaket</b> – enthält es eine Datei namens <code>all</code> oder stehen dieselben Titel in mehreren Dateien (z. B. <code>all.m3u8</code> + <code>action.m3u8</code> + <code>drama.m3u8</code>): Jeder Film / jede Folge erscheint einmal, die Dateinamen werden zu <b>Genres</b> (eigene Zeilen auf der Filmseite und filterbar).</li>
  <li><b>Einzelne Listen</b>: aneinandergehängt; der Dateiname hilft beim Erkennen von Serien.</li>
  </ul>
  Der Text großer Listen wird separat und dauerhaft gespeichert (Cache leeren löscht ihn nicht) und kommt auch in die Sicherung und das Paket der <i>Synchronisierung zwischen Geräten</i>.</li>
<li><b>Eingefügt</b> als Text.</li>
</ul>
<p>Jede eigene Liste lässt sich <b>ein- und ausschalten</b>, umbenennen und löschen. Sind mehrere Listen eingeschaltet, gibt es auf der Filmseite auch eine Zeile pro Liste, und in der Rasteransicht kannst du nach Liste filtern.</p>
<p>Einträge mit Erwachsenen-Genres (z. B. <i>Hentai</i>, <i>Erotik</i>) erscheinen nur mit der Einstellung <i>Erwachseneninhalte anzeigen</i>; in einem Kinderprofil nie.</p>
<p>Die Listen werden alle 6 Stunden aktualisiert; sofort: <i>Listen jetzt aktualisieren</i>. Neben jeder Liste siehst du, wie viele Einträge sie geliefert hat, oder die Fehlermeldung, wenn sie sich nicht laden lässt.</p>
<div class="warn">Füge nur Listen hinzu, deren Inhalt du legal ansehen darfst. Die Videos kostenloser, inoffizieller Listen sind oft schnell nicht mehr erreichbar (z. B. abgelaufene Hosting-Links).</div>
${go('#/settings?section=vodlists', 'Listen verwalten')}`,
  },
  {
    id: 'own',
    cat: 'vod',
    title: 'Eigene Mediathek (NAS)',
    keywords: 'eigene nas ordner freigabe netzlaufwerk smb http webserver wiedergabeliste m3u m3u8 automatisch',
    body: `
<p>Im VOD-Tab <b>Eigene Mediathek</b> erscheinen deine eigenen Filme und Serien – zum Beispiel aus <code>.m3u</code>-/<code>.m3u8</code>-Wiedergabelisten, die in einem Ordner deines NAS automatisch entstehen. Sie funktioniert wie die Online-VOD-Listen: Cover, Detailseite, Fortsetzen, nächste Folge, Infos und Untertitel auf Deutsch.</p>
<h2>Quelle angeben</h2>
<p>Einstellungen → VOD und Mediathek → <b>Eigene Mediathek (NAS)</b>:</p>
<table class="help-table">
<tr><td><b>Ordner wählen…</b> / <b>Ordnerpfad eingeben</b><br><small>(Desktop-Version)</small></td><td>Der freigegebene Ordner des NAS, z. B. <code>\\\\NAS\\Medien\\Listen</code>, ein Netzlaufwerk (<code>Z:\\Listen</code>) oder unter Linux / macOS ein eingehängter Ordner (<code>/mnt/nas/listen</code>, <code>/Volumes/Media</code>). Das Programm durchsucht auch Unterordner (bis zu 4 Ebenen tief).</td></tr>
<tr><td><b>Netzwerkadresse (http)</b><br><small>(auf jedem Gerät, auch auf dem Fernseher)</small></td><td>Wenn das NAS den Ordner auch über einen Webserver bereitstellt (z. B. Synology Web Station, QNAP, nginx-/Apache-Verzeichnisliste): <code>http://192.168.1.10/listen/</code>. Das Programm durchsucht die auf der Seite gefundenen .m3u-/.m3u8-Links und Unterordner (2 Ebenen). Auch die Adresse einer einzelnen Liste ist möglich.</td></tr>
</table>
<h2>Wiedergabelisten ein- und ausschalten</h2>
<ul>
<li>Unter der Quelle erscheint <b>jede gefundene Wiedergabeliste in einer eigenen Zeile</b> mit eigenem Schalter (und der Zahl der Einträge). Es gibt auch die Tasten <i>Alle an</i> / <i>Alle aus</i>.</li>
<li>Neu auftauchende Listen kommen standardmäßig <b>eingeschaltet</b> (änderbar: <i>Neue Wiedergabelisten automatisch einschalten</i>).</li>
<li>Die ganze Quelle lässt sich ausschalten oder entfernen (auf dem NAS wird nichts gelöscht).</li>
</ul>
<h2>Automatische Aktualisierung</h2>
<p>Das Programm prüft die Quellen alle 10 Minuten und beim Öffnen der Seite Eigene, sodass vom NAS neu erzeugte oder geänderte Listen von selbst erscheinen. Sofort: Taste <i>Neu einlesen</i> auf der Seite Eigene oder in den Einstellungen.</p>
<h2>Pfade in den Listen</h2>
<ul>
<li>Vollständige Adressen (<code>http://…</code>, <code>file://…</code>) unverändert,</li>
<li>Windows- und UNC-Pfade (<code>D:\\Filme\\…</code>, <code>\\\\NAS\\…</code>) sowie Unix-Pfade (<code>/volume1/…</code>) als lokale Dateien,</li>
<li><b>relative Pfade</b> (<code>Filme/Film.mkv</code>, <code>../Serien/…</code>) relativ zum Ort der Wiedergabeliste.</li>
</ul>
<div class="note">Lokale / freigegebene Dateien (file://) kann nur die Desktop-Version abspielen; für den Fernseher muss das NAS die Videos per http bereitstellen (z. B. mit einer DLNA-/Webserver-Adresse). Die Wiedergabe hängt von der Formatunterstützung der Browser-Engine ab: MP4 (H.264/AAC) und HLS laufen sicher, MKV teilweise, manche Codecs (z. B. DTS-Ton) nicht.</div>
<h2>Titel und Untertitel</h2>
<p>Aus den Dateinamen (z. B. <code>Film.Titel.2019.1080p.BluRay.x264</code>) liest das Programm Titel und Jahr, sodass auch die deutschen Infos und die OpenSubtitles-Suche funktionieren. Eine gleichnamige Untertiteldatei neben dem Video (<code>Film.srt</code>, <code>Film.de.srt</code>) wird <b>automatisch geladen</b> (die deutsche bevorzugt) und ist im Untertitelmenü unter „Neben dem Video“ wählbar. ${t('subtitles', 'Untertitel')}</p>
${go('#/settings?section=ownlists', 'Eigene Mediathek einrichten')}`,
  },
  {
    id: 'subtitles',
    cat: 'vod',
    title: 'Untertitel (Feliratok.eu, OpenSubtitles, SubDL)',
    keywords: 'untertitel subtitle feliratok.eu opensubtitles subdl srt vtt deutsch englisch zeitversatz größe api schlüssel staffelpaket',
    body: `
<p>Für Filme und Serien kannst du <b>deutsche oder englische Untertitel</b> aus den Sammlungen von <b>OpenSubtitles</b> und <b>SubDL</b>, von <b>Feliratok.eu</b> (eine ungarische Untertitelseite mit ungarischen und englischen Untertiteln) oder aus einer eigenen <code>.srt</code>-/<code>.vtt</code>-Datei laden.</p>
<h2>Feliratok.eu – ohne Einrichtung</h2><p>Standardmäßig eingeschaltet: kein Konto, kein Schlüssel und kein Tageslimit. Bei Serien holt es die Untertitel der Folge auch aus einem Staffelpaket (ZIP); Sonderzeichen in alten, nicht UTF-8-kodierten Untertiteln stimmen ebenfalls. Es bietet ungarische und englische Untertitel. Abschaltbar: Einstellungen → Untertitel und Informationen → Infos und Untertitel auf Deutsch.</p><h2>SubDL (optional)</h2><p>Weitere Treffer mit einem kostenlosen Schlüssel: Registriere dich auf <b>subdl.com</b>, kopiere den API-Schlüssel aus deinem Profil und trage ihn ein: Einstellungen → Untertitel und Informationen → <i>SubDL-API-Schlüssel</i>. Kein Passwort nötig.</p><h2>OpenSubtitles (optional, einmalig einzurichten)</h2>
<ol>
<li>Registriere dich kostenlos auf <b>opensubtitles.com</b>.</li>
<li>Angemeldet suchst du in deinem Profil den Bereich <b>API consumers</b> und legst einen neuen Schlüssel an (jeder Name ist recht, z. B. „Adás“).</li>
<li>In Adás: Einstellungen → Untertitel und Informationen → <b>Infos und Untertitel auf Deutsch</b> → gib den <b>API-Schlüssel</b>, deinen <b>Benutzernamen</b> und dein <b>Passwort</b> ein und drücke <i>Anmeldung testen</i>.</li>
</ol>
<p>Für die Suche genügt der API-Schlüssel, <b>zum Herunterladen ist auch die Anmeldung</b> nötig. Mit einem kostenlosen Konto ist die Zahl der Downloads pro Tag begrenzt (das Programm zeigt nach jedem Download, wie viele übrig sind); einmal heruntergeladene Untertitel merkt sich das Programm, sie verbrauchen das Kontingent nicht erneut.</p>
<h2>Verwendung während der Wiedergabe</h2>
<ul>
<li>Die <b>CC</b>-Taste des Players oder die Taste <kbd>C</kbd> öffnet das Menü <b>Ton und Untertitel</b> (Tonspur, eingebettete und externe Untertitel). ${t('audio-subs', 'Details')}</li>
<li><b>Untertitel suchen</b> (darunter klein die derzeit aktiven Datenbanken): Ein Tastendruck sucht in allen eingeschalteten Quellen, auf Deutsch und Englisch – Treffer in der eingestellten Sprache zuerst. Vorn die Treffer von Feliratok.eu (Übereinstimmung bei Jahr und Titel ganz oben), dann OpenSubtitles (nach Downloads, maschinelle Übersetzungen hinten) und SubDL; bei jedem Treffer stehen Sprache und Quelle. Klicke auf den gewünschten – er wird geladen und sofort angezeigt.</li>

<li><b>Zeitversatz</b>: Sind die Untertitel verschoben, korrigierst du sie in Schritten von ±0,5 Sekunden.</li>
<li><b>Größe</b>: klein, mittel, groß, riesig.</li>
<li><i>Untertitel aus Datei laden</i> (Desktop-Version): eigene .srt- oder .vtt-Datei.</li>
<li><i>Aus</i>: Untertitel ausblenden.</li>
</ul>
<p>Die gewählten Untertitel <b>bleiben bei diesem Film / dieser Folge</b> und werden beim nächsten Mal automatisch geladen. Mit der Einstellung <i>Untertitel automatisch suchen</i> werden bei jedem Film-/Folgenstart automatisch die besten (deutschen oder englischen) Untertitel geladen.</p>
<div class="note">Die OpenSubtitles-Daten (Schlüssel, Benutzername, Passwort) werden nur auf diesem Gerät gespeichert und ausschließlich an opensubtitles.com gesendet. Die Treffer beruhen auf Titel und Jahr des Films; zu alten oder seltenen Filmen gibt es eventuell keine deutschen Untertitel.</div>
${go('#/settings?section=huinfo', 'Untertitel-Einstellungen')}`,
  },
  {
    id: 'hu-info',
    cat: 'vod',
    title: 'Deutsche Infos zu Filmen und Sendern',
    keywords: 'information beschreibung englischer titel cover coverbild poster bild wikipedia wikidata tmdb anilist tvmaze anime genre besetzung regie bewertung',
    body: `
<p>Das Programm sucht zu Filmen, Serien und TV-Sendern <b>Infos auf Deutsch</b> und zeigt sie auf der Detailseite.</p>
<h2>VOD (Filme und Serien)</h2>
<ul>
<li><b>Deutscher Titel</b> (weicht er vom Original ab, steht er auch kursiv unter dem Titel),</li>
<li><b>Beschreibung</b> auf Deutsch, falls vorhanden (deutsche Wikipedia, TMDB); sonst <b>auf Englisch</b> – das Programm weist darauf hin,</li>
<li><b>Coverbild</b>: das eigene Bild der Liste, sonst aus den Quellen (Poster des Wikipedia-Artikels, AniList, TVmaze, TMDB); in der <b>eigenen Mediathek</b> das Bild neben dem Video (<code>Film.jpg</code>, <code>poster.jpg</code>, <code>folder.jpg</code>, <code>cover.jpg</code>) oder das in die Datei eingebettete Cover (MKV-Anhang, MP4) – letzteres in der Desktop-Version,</li>
<li><b>Genre, Regie, Studio, Besetzung, Land, Jahr</b>, Bewertung (AniList, TVmaze, TMDB).</li>
</ul>
<h2>TV-Sender</h2>
<p>Auf der Detailseite eines Senders der Abschnitt <b>„Über den Sender“</b>: eine Wikipedia-Zusammenfassung auf Deutsch (oder Englisch), Eigentümer, Startjahr – aus Wikidata, sonst aus der Suche der deutschen, dann der englischen Wikipedia. Das Programm zeigt eine Beschreibung nur, wenn Name (und bei Wikidata das Land) des Senders übereinstimmen, damit keine falschen Beschreibungen erscheinen.</p>
<h2>Quellen</h2>
<table class="help-table">
<tr><td><b>Wikidata + Wikipedia</b></td><td>Standard, kostenlos, ohne Schlüssel; deutscher bzw. englischer Artikel.</td></tr>
<tr><td><b>AniList</b></td><td>Für Anime (das Programm erkennt sie an Liste, Hoster oder Genres): Cover, englische Beschreibung, Genres, Punktzahl, Studio. Ohne Schlüssel.</td></tr>
<tr><td><b>TVmaze</b></td><td>Für Serien: Bild, englische Zusammenfassung, Genre, Bewertung. Ohne Schlüssel.</td></tr>
<tr><td><b>TMDB</b> (The Movie Database)</td><td>Wenn du deinen eigenen kostenlosen API-Schlüssel angibst (themoviedb.org → Einstellungen → API), kommen Film- und Seriendaten auch von hier: ausführlichere deutsche Beschreibungen und Bewertungen.</td></tr>
</table>
<p>Bittet ein Anbieter ums Bremsen (zu viele Anfragen), fragt das Programm eine Weile nicht und macht später weiter. Die Rezensionen von <b>AnimeAddicts</b> sind nur angemeldet zugänglich, daher liest das Programm sie nicht.</p>
<p>Die Daten kommen in den Cache (für 30 Tage), sodass sie beim zweiten Mal sofort erscheinen. Ausschalten: Einstellungen → Untertitel und Informationen → Infos und Untertitel auf Deutsch → <i>Informationen und Coverbilder herunterladen</i>.</p>
${go('#/settings?section=huinfo', 'Einstellungen')}`,
  },
  {
    id: 'vod-detect',
    cat: 'vod',
    title: 'Wie erkennt es Filme und Serien?',
    keywords: 'erkennung film serie folge S01E02 staffel folge name format',
    body: `
<p>M3U-Listen kennzeichnen nicht eigens, was Film und was Serie ist, deshalb entscheidet das Programm anhand des <b>Titels</b>. Enthält der Titel eine Folgenangabe, gilt er als <b>Serienfolge</b>, sonst als <b>Film</b>.</p>
<h2>Erkannte Folgenangaben</h2>
<table class="help-table">
<tr><td><code>S01E02</code>, <code>S1 E2</code>, <code>S04.E23</code></td><td>Staffel + Folge</td></tr>
<tr><td><code>1x02</code></td><td>Staffel + Folge</td></tr>
<tr><td><code>Season 2 Episode 5</code>, <code>Staffel 2 Folge 5</code>, <code>Saison 2 Épisode 5</code></td><td>Staffel + Folge</td></tr>
<tr><td><code>2. évad 5. rész</code></td><td>Staffel + Folge (ungarisch)</td></tr>
<tr><td><code>Episode 5</code>, <code>Ep. 5</code>, <code>Folge 5</code>, <code>Part 5</code>, <code>5. rész</code></td><td>Folge (Staffel 1)</td></tr>
<tr><td><code>第5集</code>, <code>第5話</code></td><td>Folge (chinesisch / japanisch)</td></tr>
</table>
<h2>Der Serienname</h2>
<p>Der Text <b>vor</b> der Angabe ist der Serienname (z. B. „The Goldbergs S04 E23“ → <i>The Goldbergs</i>, Staffel 4, Folge 23), der Text danach der Folgentitel. Steht vor der Angabe kein Text, liefern das Feld <code>group-title</code> und zuletzt der Dateiname der Wiedergabeliste den Seriennamen. Gleichnamige Folgen werden zu einer Serie zusammengefasst, nach Staffeln und Folgen sortiert.</p>
<h2>Filme</h2>
<p>Eine Jahreszahl in Klammern am Ende des Titels (z. B. „Night of the Living Dead (1968)“) gilt als Erscheinungsjahr. Aus <code>group-title</code> wird die Gruppe / das Genre, aus <code>tvg-logo</code> das Coverbild, aus der Zahl nach <code>#EXTINF</code> die Länge. Filme mit gleichem Titel und Jahr aus mehreren Listen verschmelzen zu einem Film, ihre Versionen dienen als Ersatzquellen.</p>
<div class="tip">Benenne die Einträge einer eigenen Liste so: <code>#EXTINF:-1 tvg-logo="cover.jpg" group-title="Komödie",Filmtitel (1999)</code>, bei Serien <code>…,Serientitel S01E01 Titel der ersten Folge</code>.</div>`,
  },

  // ===================================================================== Suchen und Durchsuchen
  {
    id: 'dashboard',
    cat: 'find',
    title: 'Die Startseite',
    keywords: 'startseite dashboard wetter nachrichten rss tv-programm favoriten heute abend weiterschauen ort anpassen layout element kachel größe',
    body: `
<p>Die Startseite ist ein Überblick aus Elementen (Karten), der am Computer und auf dem Fernseher immer <b>auf einen Bildschirm passt</b>. Auf dem Handy (und unter Android im Hochformat) stehen die Elemente untereinander, dort wird gescrollt.</p>
<h2>Anpassen</h2>
<p>Mit der Taste <b>Anpassen</b> oben rechts auf der Startseite (oder Einstellungen → Startseite → <i>Startseite anpassen</i>):</p>
<ul>
<li>die Zahl der <b>Spalten</b> (1–5) und <b>Zeilen</b> (1–4) des Rasters,</li>
<li>pro Element: <b>Reihenfolge</b> (‹ ›, auch per Ziehen mit der Maus), <b>Breite</b> (↔) und <b>Höhe</b> (↕) in Zellen, <b>ausblenden</b> (×),</li>
<li>ausgeblendete Elemente zurückholen (<b>Hinzufügen</b>) und das <b>Standard</b>-Layout.</li>
</ul>
<p>Elemente landen immer am ersten freien Platz. Würde nach einer Änderung etwas nicht passen, lässt das Programm es nicht zu – verkleinere oder verstecke zuerst ein anderes Element oder vergrößere das Raster. Das Layout wird pro Profil gespeichert. Mit der Fernbedienung erreichst du die Tasten mit den Pfeilen.</p>
<div class="tip"><b>Die Größe zählt:</b> Jedes Element passt an seine Größe an, was und wie viel es zeigt – zum Beispiel die Zahl der Nachrichten und Sendungen, Bild und Vorspann der Nachrichten, die Zahl der Tage der Wochenvorschau, die Dichte der Stundenaufteilung, Größe und Zahl der VOD-Poster oder das Zeitfenster des TV-Programms.</div>
<h2>Die Elemente</h2>
<table class="help-table">
<tr><td><b>Wetter</b></td><td>Oben das heutige Wetter mit dem Ortsnamen, darunter der heutige Tag stündlich (auf einer schmalen Karte alle zwei bis drei Stunden), unten die Wochenvorschau. Auf einer kleinen Karte entfällt der Wochenteil, noch kleiner auch das Diagramm. Der heutige Teil kann so aussehen: Liniendiagramm, Fläche + Niederschlag, Balken, Kacheln oder ein einzelner Wert. Ort und Darstellung: Einstellungen → <b>Startseite</b>. Quelle: Open-Meteo.</td></tr>
<tr><td><b>Jetzt im TV</b></td><td>Das Programm deiner Lieblingssender, ähnlich dem Zeitleisten-Raster des TV-Programms (je nach Breite ein Zeitfenster von 1–5 Stunden). Was nicht passt, deutet eine Zeile „+N weitere“ an.</td></tr>
<tr><td><b>Nachrichten</b></td><td>Die neuesten Meldungen aus den eingeschalteten RSS-/Atom-Quellen – so viele, wie passen (auf einer breiten Karte mit Vorspann). Ein Klick öffnet die Zusammenfassung. Quellen: Einstellungen → <b>Startseite</b> → <i>Nachrichtenquellen</i>. Die Standardquellen hängen von der Sprache der Oberfläche ab. Im Kinderprofil nicht verfügbar.</td></tr>
<tr><td><b>Heute Abend im TV</b></td><td>Pro Lieblingssender eine Abendsendung (nach 19 Uhr). Mit der Glocke forderst du eine Erinnerung an.</td></tr>
<tr><td><b>Zuletzt gesehener Sender</b></td><td>Der zuletzt gesehene Sender mit laufender und nächster Sendung (auf einer größeren Karte mit Beschreibung), mit einem Druck fortsetzbar.</td></tr>
<tr><td><b>VOD – Weiterschauen</b></td><td>Die letzten 5 gesehenen Filme / Folgen mit Poster und Fortschritt (auf einer kleinen Karte als Liste) – geht dort weiter, wo du aufgehört hast.</td></tr>
<tr><td><b>Lieblingssender</b> (standardmäßig ausgeblendet)</td><td>Die Logos deiner Lieblingssender im Raster, per Klick startbar; auf einer größeren Kachel mit der laufenden Sendung.</td></tr>
<tr><td><b>Erinnerungen</b> (standardmäßig ausgeblendet)</td><td>Deine anstehenden Sendungserinnerungen; eine bereits laufende Sendung bekommt „JETZT“ und startet per Klick.</td></tr>
<tr><td><b>Uhr und Namenstag</b></td><td>Große Uhr mit Datum und – sofern für deine Sprache verfügbar – dem heutigen (auf einer größeren Karte auch dem morgigen) Namenstag.</td></tr>
<tr><td><b>Wechselkurse</b></td><td>Die wichtigsten Währungen gegenüber deiner Landeswährung, mit der Veränderung zum Vortag (EZB-Referenzkurse, werktags aktualisiert).</td></tr>
<tr><td><b>Sport</b></td><td>Live-, aktuelle und kommende Ereignisse aus den im Sport-Tracker gefolgten Ligen, Teams, Sportarten und Kalendern – jede Sportart (Tennis, Handball, Discgolf, World Chase Tag…). Wo möglich, schlägt eine <b>📺</b>-Taste den Sender vor, auf dem es zu sehen ist. ${t('sportwatch', 'Sport-Tracker')}</td></tr>
<tr><td><b>Für dich empfohlen</b></td><td>Laufende Sendungen auf Sendern aus deinen meistgesehenen Kategorien, die noch nicht deine Favoriten sind.</td></tr>
<tr><td><b>Merkliste</b></td><td>Die Poster deiner eigenen Merkliste (VOD-Detailseite → <i>+ Merkliste</i>).</td></tr>
<tr><td><b>Neue Folgen</b></td><td>Serien, die du schaust, mit noch ungesehenen Folgen nach der zuletzt gesehenen („3 neue Folgen“).</td></tr>
<tr><td><b>Gleich geht’s los</b></td><td>Sendungen, die in der nächsten guten Stunde auf deinen Lieblingssendern (und den größeren Sendern des Heimatlandes) beginnen, mit „in x Min.“ und Erinnerungsglocke.</td></tr>
<tr><td><b>Filme heute Abend</b></td><td>Heute Abend (ab 18 Uhr) beginnende Filme auf Lieblings- und Heimatsendern, anhand der Kategorie im TV-Programm.</td></tr>
<tr><td><b>Sehzeit</b></td><td>Die heutige und wöchentliche Sehzeit, die Wochentage als Balken; im Kinderprofil die heute verbleibende Zeit.</td></tr>
<tr><td><b>Entdecken</b></td><td>Ein zufällig gewählter, gerade sendender (Nicht-Favoriten-)Sender – mit <i>Einen anderen</i> holst du einen neuen.</td></tr>
<tr><td><b>Sonne und Luft</b></td><td>Sonnenauf- und -untergang, Tageslänge, UV-Index und Luftqualität am Wetterort (Open-Meteo).</td></tr>
<tr><td><b>Notiz</b></td><td>Deine eigene Notiz (pro Profil), wird automatisch gespeichert.</td></tr>
</table>
<p>Manche Elemente sind standardmäßig nicht auf der Startseite: Anpassen → <b>Hinzufügen</b>.</p>
<h2>Fertige Layouts, nach Tageszeit</h2>
<p>Mit den Tasten <b>Fertiges Layout</b> in der Anpassen-Leiste lädst du mit einem Klick: Standard, Morgens (Wetter, Nachrichten, Uhr, Wechselkurse), Fernsehabend (Programm, heute Abend, Weiterschauen), Sport, Nachrichten und Börse, Einfach. Mit dem Schalter <b>Nach Tageszeit wechseln</b> erscheint morgens von 5 bis 10 Uhr das Layout Morgens, ab 18 Uhr Fernsehabend, tagsüber dein eigenes.</p>
<p>Auf der Karte <b>Zuletzt gesehener Sender</b> startet nach einigen Sekunden das stumme Livebild des Senders (am Computer und unter Android, wenn die Live-Vorschau eingeschaltet ist).</p>
<p>Die Senderzeilen befinden sich auf der Seite <b>TV</b> (im Menü nach der Startseite). ${t('home', 'Die TV-Seite')}</p>
${go('#/settings?section=dashboard', 'Einstellungen der Startseite')}`,
  },
  {
    id: 'home',
    cat: 'find',
    title: 'Die TV-Seite (Sender)',
    keywords: 'tv-seite sender aufnahmen tab zeilen',
    body: `
<h2>Tabs</h2>
<p>Die Seite <b>TV</b> (im Menü nach der Startseite) gehört den Sendern. Oben gibt es vier Tabs: <b>Sender</b>, <b>TV-Programm</b>, <b>Durchsuchen</b> (nur Live-TV, mit Filtern) und – in der Desktop-Version – <b>Aufnahmen</b> (deine eigenen TV-Aufnahmen). ${t('recording', 'Über Aufnahmen')}</p>
<h2>Zeilen</h2>
<p>Im Tab Sender gibt es horizontal scrollende Zeilen: Zuletzt gesehen, Deine Favoriten, Jetzt im TV, die Sender deines Heimatlandes, deine eigenen Listen, die Kategorien (Nachrichten, Sport, Filme…) und die Länderkacheln. <b>Reihenfolge und Sichtbarkeit der Zeilen sind pro Profil einstellbar</b>. ${t('home-rows', 'Wie?')}</p>
<h2>Alle Elemente einer Zeile auf einer Seite</h2>
<p>Neben jedem Zeilentitel steht ein <b>runder Pfeil ›</b>: Ein Klick (Tippen) öffnet <b>alle</b> Elemente der Zeile auf einer Seite. Mit Fernbedienung oder Tastatur macht das am Zeilenende eine Kachel <b>„Alle“</b> (OK / Enter). Bei den VOD-Zeilen, der Zeile <i>Weiterschauen</i> und den Länderkacheln funktioniert es genauso.</p>
<h2>Heimatland zuerst</h2>
<p>In jeder Liste und Kategorie stehen die Sender deines <b>Heimatlandes</b> vorn, danach Sender <b>in seiner Sprache</b> (z. B. aus Nachbarländern), und darin funktionierende Streams mit Logo und besserer Qualität; die Reihenfolge ändert sich täglich ein wenig, damit du immer auch Neues entdeckst. Bei der Suche bleibt eine exakte Namensübereinstimmung ganz oben. Das Heimatland änderst du unter Einstellungen → Inhalte und Kinder → Inhalt. ${t('card-badges', 'Kennzeichnungen der Karten')}</p>`,
  },
  {
    id: 'card-badges',
    cat: 'find',
    title: 'Was bedeuten die Kennzeichnungen auf den Karten?',
    keywords: 'punkt grün rot balken FHD HD 4K stern kennzeichnung symbol',
    body: `
<table class="help-table">
<tr><td><span class="st st-ok"></span> grüner Punkt</td><td>Der Stream hat zuletzt funktioniert.</td></tr>
<tr><td><span class="st st-bad"></span> roter Punkt</td><td>Bei der Prüfung hat keine Quelle geantwortet. ${t('health', 'Prüfung')}</td></tr>
<tr><td>Aufschrift <b>OFFLINE</b>, graues Bild</td><td>Der Sender ist derzeit nicht erreichbar; unter dem Namen: „Offline – derzeit nicht verfügbar“.</td></tr>
<tr><td>Aufschrift <b>SENDEPAUSE</b></td><td>Ein nur zeitweise sendender (nicht rund um die Uhr) Sender, der gerade nicht sendet; unter dem Namen: „Sendepause – sendet gerade nicht“.</td></tr>
<tr><td>kein Punkt</td><td>Das Programm hat ihn noch nicht geprüft.</td></tr>
<tr><td><b>HD / FHD / 4K</b></td><td>Die beste verfügbare Qualität (720p / 1080p / 2160p).</td></tr>
<tr><td>roter Balken unten</td><td>Der Fortschritt der laufenden Sendung (falls ein TV-Programm vorhanden ist).</td></tr>
<tr><td>★</td><td>Der Sender ist unter deinen Favoriten.</td></tr>
<tr><td>Aufschrift „Jetzt: …“</td><td>Der Titel der laufenden Sendung; ohne TV-Programm Land und Kategorie.</td></tr>
</table>
<p>Weitere Kennzeichnungen auf der Detailseite: <b>Geogesperrt</b> (eventuell nur aus dem betreffenden Land zu sehen), <b>Nicht rund um die Uhr</b> (sendet nur zu bestimmten Zeiten), <b>N Quellen</b> (mehrere Stream-Quellen).</p>`,
  },
  {
    id: 'search',
    cat: 'find',
    title: 'Suche',
    keywords: 'suche suchen treffer sendung titel akzent',
    body: `
<p>Klicke auf die Lupe in der Kopfzeile oder drücke <kbd>/</kbd> oder <kbd>Strg</kbd>+<kbd>F</kbd> (auf dem Fernseher die gelbe Taste) und fang an zu tippen – die Treffer erscheinen sofort.</p>
<h2>Wonach sucht sie?</h2>
<ul>
<li>nach dem Namen des Senders und weiteren Namen (z. B. findet „ZDF“ auch „ZDFneo“),</li>
<li>nach dem Land (<i>deutsch</i>, <i>Deutschland</i> oder <i>DE</i>), der Kategorie (<i>Sport</i>, <i>Nachrichten</i>), dem Netzwerk (<i>Pluto TV</i>), dem Namen der eigenen Liste,</li>
<li>nach <b>Sendungstiteln</b> in den nächsten 48 Stunden (falls ein TV-Programm vorhanden ist) – diese erscheinen separat unter „Sendungen“; laufende Sendungen tragen die Kennzeichnung JETZT.</li>
</ul>
<h2>Tipps</h2>
<ul>
<li>Akzente, Umlaute und Groß-/Kleinschreibung spielen keine Rolle: „cafe“ = „Café“, „muenchen“ nicht, aber „munchen“ = „München“.</li>
<li>Bei mehreren Wörtern muss jedes passen: „sport deutsch“ liefert nur deutsche Sportsender.</li>
<li>Vom Suchfeld kommst du mit <kbd>↓</kbd> oder <kbd>Enter</kbd> zu den Treffern.</li>
<li>Ein Klick auf einen Sendungstreffer öffnet ihre Detailseite, wo du sofort schauen oder eine Erinnerung anfordern kannst.</li>
</ul>`,
  },
  {
    id: 'browse',
    cat: 'find',
    title: 'Durchsuchen und Filter',
    keywords: 'durchsuchen filter kategorie land sprache qualität status sortierung',
    body: `
<p>Die Seite <b>Durchsuchen</b> zeigt alle (für dein Profil sichtbaren) Sender. Ohne Filter helfen oben Kategorie- und Länderkacheln.</p>
<table class="help-table">
<tr><td><b>Suche</b></td><td>Text in Name, anderem Namen, Land oder Kategorie des Senders – gilt <b>zusammen</b> mit den übrigen Filtern (z. B. „heim“ + Deutschland + Deutsch). Von der Trefferseite der Kopfzeilensuche bringt dich die Taste <i>Nach Land, Sprache, Kategorie filtern</i> mit dem Suchtext hierher.</td></tr>
<tr><td><b>Kategorie</b></td><td>Nachrichten, Sport, Filme, Kinder, Musik… (in Klammern die Zahl der Sender).</td></tr>
<tr><td><b>Land</b></td><td>Das Land des Senders.</td></tr>
<tr><td><b>Sprache</b></td><td>Die Sprache des Streams (sofern bekannt).</td></tr>
<tr><td><b>Qualität</b></td><td>HD (720p) oder Full HD (1080p) und besser.</td></tr>
<tr><td><b>Status</b></td><td>Funktioniert / nicht geprüft / nicht verfügbar. ${t('health', 'Prüfung')}</td></tr>
<tr><td><b>Sortierung</b></td><td>Empfohlene Reihenfolge, nach Name oder nach Land.</td></tr>
</table>
<p>Die Filter lassen sich kombinieren (z. B. Sport + Deutschland + HD). <b>Filter zurücksetzen</b> setzt alle zurück. Die Liste lädt beim Scrollen nach und nach.</p>`,
  },
  {
    id: 'channel-info',
    cat: 'find',
    title: 'Die Detailseite des Senders',
    keywords: 'details information land sprache eigentümer webseite quelle',
    body: `
<p>Öffnen: die ⌄-Taste der Karte, Rechtsklick, die Taste <kbd>I</kbd> oder während der Wiedergabe die ⓘ-Taste.</p>
<h2>Was steht darauf?</h2>
<ul>
<li><b>Kopf</b>: Logo, Name, Status, Qualität, Zahl der Quellen, Einschränkungen, die laufende Sendung mit Beschreibung und Fortschritt; Tasten Abspielen und Favorit.</li>
<li><b>Programm</b>: von gestern bis übermorgen, nach Tagen; die laufende Sendung hervorgehoben. Für eine künftige Sendung forderst du mit 🔔 eine Erinnerung an. ${t('reminders', 'Erinnerungen')}</li>
<li><b>Daten</b>: Land, Kategorie, Sprache, Netzwerk, Eigentümer, Startjahr, Einstellung, weitere Namen, Zeitzone, Name der eigenen Liste, Webseite (öffnet sich im Browser des Systems).</li>
<li><b>Stream-Quellen</b>: alle Quellen mit Status, Qualität und Einschränkungen; jede einzeln startbar ▶. Die Taste <b>Quellen prüfen</b> probiert alle sofort aus.</li>
</ul>`,
  },

  // ===================================================================== TV-Programm
  {
    id: 'guide-grid',
    cat: 'guide',
    title: 'Das TV-Programm-Raster',
    keywords: 'tv-programm epg raster zeitleiste jetzt tag morgen',
    body: `
<p>Die Seite <b>TV-Programm</b> zeigt das Programm der Sender auf einer Zeitleiste: ein Sender pro Zeile, waagerecht die Zeit (mit Halbstundenmarken). Die rote senkrechte Linie ist der <b>gegenwärtige Moment</b>.</p>
<h2>Filter</h2>
<ul>
<li><b>Favoriten</b> – deine Lieblingssender in ihrer eigenen Reihenfolge,</li>
<li><b>[Heimatland]</b> – die Sender des Heimatlandes,</li>
<li><b>Alle Sender</b> – jeder Sender mit Programmdaten.</li>
</ul>
<p>Tagesauswahl: von gestern bis 3 Tage voraus. Die Taste <b>Zu jetzt springen</b> bringt dich zur Gegenwart zurück.</p>
<p><b>Kategorie</b> (Film, Serie, Sport, Nachrichten, Kinder, Dokumentation, Unterhaltung, Musik): Es bleiben nur Sender mit einer solchen Sendung an dem Tag, die übrigen Sendungen erscheinen blass. Die Erkennung beruht auf der Kategorie im TV-Programm und dem Titel der Sendung.</p>
<p><b>Zeitleiste / Läuft jetzt</b>: In der Ansicht <i>Läuft jetzt</i> zeigt pro Sender eine große Karte die laufende Sendung (mit Fortschritt) und die nächste – für einen schnellen Überblick, auch mit der Fernbedienung bequem.</p>
<p>Auf der Detailseite einer Sendung speichert die Taste <b>In den Kalender</b> eine Kalenderdatei (.ics), die Google Kalender, Outlook oder der Kalender deines Handys einliest (mit 5-Minuten-Erinnerung); am Computer plant die Taste <b>● Aufnehmen</b> eine Aufnahme der Sendung (${t('recording', 'Aufnahme')}).</p>
<h2>Bedienung</h2>
<ul>
<li>Klicke auf eine <b>Sendung</b>: Ihre Detailseite öffnet sich (Beschreibung, Dauer, Kategorie) – bei einer laufenden mit <i>Jetzt ansehen</i>, bei einer künftigen mit der Taste <i>Erinnerung</i>.</li>
<li>Klicke links auf den <b>Sendernamen</b>: Er startet sofort; der Auf-/Ab-Wechsel geht dann durch die Sender des Rasters.</li>
<li>Laufende Sendungen haben einen dunkelroten Hintergrund, vergangene sind blass, solche mit Erinnerung tragen 🔔.</li>
</ul>
<p>Es erscheinen nur Sender mit Programmdaten. ${t('trouble-epg', 'Warum nicht für jeden Sender?')}</p>`,
  },
  {
    id: 'reminders',
    cat: 'guide',
    title: 'Erinnerungen',
    keywords: 'erinnerung benachrichtigung glocke hinweis beginnt',
    body: `
<p>Eine Erinnerung an eine künftige Sendung forderst du im TV-Programm an (Klick auf die Sendung → <b>🔔 Erinnerung</b>), auf der Detailseite des Senders (die 🔔 neben der Sendung) oder aus den Suchtreffern.</p>
<ul>
<li><b>Jede Ausstrahlung</b>: Auf der Detailseite der Sendung fordert die Taste <b>↻ Jede Ausstrahlung</b> eine Erinnerung für jede Ausstrahlung der Sendung auf diesem Sender an (für Serien, Nachrichten, regelmäßige Sendungen). Endungen wie „– Folge 312“ werden ignoriert, und die Ausstrahlungen der nächsten 7 Tage kommen automatisch hinzu.</li>
<li><b>Wann meldet sie sich?</b> Einstellungen → Benachrichtigungen → Erinnerungen: bei Beginn oder 1–30 Minuten vorher.</li>
<li><b>Automatisch umschalten</b>: Eingeschaltet wechselt es bei Sendungsbeginn auf den Sender (nach 8 Sekunden Countdown, den die Taste <i>Bleiben</i> stoppt), wenn Adás geöffnet ist.</li>
<li>Das 🔔-Symbol in der Kopfzeile zeigt deine Erinnerungen und „Jede Ausstrahlung“-Regeln; dort kannst du sie auch löschen.</li>
<li>Erinnerungen werden <b>pro Profil</b> gespeichert und ziehen mit dem Profil um.</li>
</ul>
<h2>Wo und wie benachrichtigt sie?</h2>
<table class="help-table">
<tr><td><b>Windows / Mac / Linux</b></td><td>Im Programm und im Benachrichtigungscenter des Systems; ein Klick startet den Sender. Mit der Einstellung <i>Im Hintergrund laufen</i> meldet sie sich auch nach dem Schließen des Fensters (Adás bleibt im Infobereich), und <i>Mit dem System starten</i> startet es bei der Anmeldung im Infobereich (auf dem Mac in der Menüleiste, unter Linux kommt es zu den Autostart-Programmen). Unter Linux braucht das Infobereich-Symbol AppIndicator-Unterstützung (unter GNOME die Erweiterung <i>AppIndicator</i>); ohne sie kommt das versteckte Fenster beim erneuten Start des Programms zum Vorschein.</td></tr>
<tr><td><b>Android, Android TV</b></td><td>Das System benachrichtigt – auch wenn Adás geschlossen ist, und auch nach einem Neustart des Handys. Beim ersten Mal müssen Benachrichtigungen erlaubt werden. Ein Klick startet den Sender.</td></tr>
<tr><td><b>LG-Fernseher</b></td><td>Meldet sich, wenn Adás läuft; über anderen TV-Apps als Einblendung.</td></tr>
<tr><td><b>Browser</b></td><td>Nur solange die Seite geöffnet ist.</td></tr>
</table>
<div class="note">Bei der portablen (installationsfreien) Windows-Version zeigt Windows die Systembenachrichtigung nicht immer an – die Benachrichtigung im Programm erscheint trotzdem. Die installierte Version hat diese Einschränkung nicht.</div>
${go('#/settings?section=reminders', 'Einstellungen der Erinnerungen')}`,
  },
  {
    id: 'epg-sources',
    cat: 'guide',
    title: 'Quellen des TV-Programms',
    keywords: 'epg xmltv quelle zuordnung aktualisierung eigenes tv-programm',
    body: `
<p>Die Programmdaten kommen aus Quellen im <b>XMLTV</b>-Format. Unter Einstellungen → TV-Programm siehst du jede: wie vielen Sendern sie zugeordnet werden konnte, wie viele Sendungen sie enthält und, falls sie fehlschlägt, welchen Fehler.</p>
<h2>Integrierte Quellen</h2>
<ul>
<li>Standardmäßig eingeschaltet: die Quelle(n) deines Heimatlandes (beim ersten Start festgelegt) und die eigene Quelle der Wiedergabeliste.</li>
<li>Einschaltbar: Ungarn, Slowakei, Rumänien, Deutschland, Vereinigtes Königreich, USA, Frankreich, Italien, Spanien sowie die Programme der Sender von Pluto TV, Samsung TV Plus und Plex. Je mehr Quellen eingeschaltet sind, desto länger dauert das Laden.</li>
</ul>
<h2>Eigene Quelle</h2>
<p><b>XMLTV-Quelle hinzufügen</b>: Jede <code>.xml</code>- oder <code>.xml.gz</code>-Adresse ist möglich (z. B. das TV-Programm deines Anbieters oder einer Community-Seite). Eine neu hinzugefügte Quelle kommt an den Anfang der Liste und hat Vorrang.</p>
<h2>Wie wird zugeordnet?</h2>
<p>Das Programm vergleicht Sender-ID und Anzeigenamen der Quelle mit der Senderliste: zuerst exakte ID, dann ID + Land, Name + Land und zuletzt ein eindeutiger Name. Haben mehrere Quellen Daten für einen Sender, gewinnt die weiter oben in der Liste.</p>
<p><b>Aktualisierung</b>: automatisch im eingestellten Intervall (alle 3–48 Stunden) oder sofort mit <i>TV-Programm jetzt aktualisieren</i> bzw. dem Punkt <i>Senderliste aktualisieren</i> im Profilmenü.</p>`,
  },

  // ===================================================================== Personalisierung
  {
    id: 'profiles',
    cat: 'personal',
    title: 'Profile',
    keywords: 'profil benutzer wer schaut wechsel farbe anlegen löschen',
    body: `
<p>Jedes Familienmitglied kann ein eigenes Profil nutzen. Beim Start (bei mehreren Profilen) begrüßt dich der Bildschirm <b>„Wer schaut?“</b>; später wechselst du per Klick auf das Profilbild in der Kopfzeile.</p>
<h2>Verwalten</h2>
<p>Profilmenü → <b>Profile verwalten</b> → klicke auf ein Profil, um es zu bearbeiten (Name, Profilbild, Farbe, Kinderprofil, löschen), oder auf <b>Profil hinzufügen</b>.</p>
<h2>Profilbild</h2>
<p>Im Editor wählst du aus 11 gezeichneten Profilbildern (Fuchs, Häschen, Roboter, Figuren, Zen-Vasen…) oder die <b>Buchstaben</b>-Variante: der Anfangsbuchstabe des Namens auf einem Hintergrund in der gewählten Farbe. Das Profilbild erscheint auf dem Bildschirm „Wer schaut?“, in der Kopfzeile und im Profilmenü.</p>
<p><b>Eigenes Bild</b>: Mit <i>Eigenes Bild hochladen…</i> wählst du ein beliebiges PNG- (oder JPG-, WebP-)Bild. Das Programm schneidet es quadratisch zu (von der Mitte aus) und verkleinert es auf 256×256 Pixel; das Bild wird mit dem Profil gespeichert und zieht so mit dem Profil auf andere Geräte um. Auf dem Fernseher gibt es keine Dateiauswahl: Dort erscheint das Bild eines vom Computer übernommenen Profils.</p>
<h2>Was gehört zum Profil, was ist gemeinsam?</h2>
<table class="help-table">
<tr><th>Getrennt pro Profil</th><th>Gemeinsam für alle Profile</th></tr>
<tr><td>Favoriten und ihre Reihenfolge (Sendernummern)<br>Zuletzt gesehene Sender<br>Erinnerungen<br>Stil der Oberfläche<br>Reihenfolge der Zeilen der Startseite<br>Einstellung Kinderprofil</td>
<td>Senderlisten und eigene Sender<br>Quellen des TV-Programms<br>Heimatland, Wiedergabe-Einstellungen<br>Ergebnisse der Verfügbarkeitsprüfung<br>Lautstärke</td></tr>
</table>
${go('#/profiles', 'Profile verwalten')}`,
  },
  {
    id: 'kids',
    cat: 'personal',
    title: 'Kinderprofil und Erwachseneninhalte',
    keywords: 'kinder kind kinderprofil erwachsene filter 18 nsfw eltern',
    body: `
<h2>Kinderprofil</h2>
<p>Schalte beim Bearbeiten eines Profils <b>Kinderprofil</b> ein. Dann erscheinen standardmäßig nur <b>Kinderinhalte</b> – auf der Startseite, der TV- und VOD-Seite, beim Durchsuchen, in der Suche und im TV-Programm. Auch die Nachrichtenkarte ist im Kinderprofil nicht zu sehen.</p>
<h2>Was gilt als Kinderinhalt?</h2>
<p>Standardmäßig Sender der Kategorien <b>Kinder, Animation, Familie und Bildung</b> sowie Filme und Serien in Kinder-, Familien- und Animationsgruppen / -genres (nie Erwachsenen-Genres). Diese Markierung ist <b>allen Profilen gemeinsam</b> und lässt sich von Hand setzen: auf der <b>Detailseite</b> des Senders bzw. des Films / der Serie mit der Taste <b>Kinderinhalt</b> (in einem Erwachsenenprofil) oder in der Liste Einstellungen → Inhalte und Kinder → <b>Kinderprofile – was dürfen sie sehen?</b>.</p>
<h2>Was darf das Kinderprofil sehen?</h2>
<p>Einstellungen → Inhalte und Kinder → <b>Kinderprofile – was dürfen sie sehen?</b>: Im Tab <b>TV-Sender</b> oder <b>VOD</b> hat jede Zeile den gemeinsamen Schalter <i>Kinderinhalt</i> und daneben <b>für jedes Kinderprofil einen eigenen Schalter</b> (mit dem Profilnamen): So darf z. B. das ältere Kind etwas sehen, was das jüngere nicht darf. Mit dem Filter siehst du, was Kinderinhalt ist, alles, oder was ein bestimmtes Kinderprofil sehen darf / nicht darf; mit der Suche grenzt du ein und erlaubst / sperrst die sichtbaren Treffer für ein Kinderprofil auf einmal. Aus einem Kinderprofil öffnen sich die Einstellungen nur mit PIN.</p>
<h2>Tägliche Sehzeit und Altersgrenze</h2>
<p>Am selben Ort legst du pro Kinderprofil die <b>tägliche Sehzeit</b> (von 30 Minuten bis 4 Stunden oder unbegrenzt) und die <b>Altersgrenze</b> (6, 12, 16, 18 Jahre) fest. 5 und 1 Minute vor Ende kommt eine Warnung; ist die Zeit abgelaufen, stoppt die Wiedergabe und geht nur mit der PIN eines Erwachsenenprofils weiter (+30 Minuten). Liegt laut TV-Programm die Altersfreigabe einer Live-Sendung über der eingestellten, startet der Stream nicht (oder stoppt bei Sendungsbeginn) – mit der Eltern-PIN lässt er sich für diese Sendung freigeben. (Nicht jedes TV-Programm liefert Altersfreigaben; ohne Daten gibt es keine Einschränkung.)</p>
<div class="tip">Lege für die Einschränkungen eine PIN für ein Erwachsenenprofil fest (Profile verwalten) – ohne PIN kann jeder sie aufheben.</div>
<p>Ein Erwachsenensender (18+) erscheint in einem Kinderprofil nie, auch wenn du ihn von Hand erlaubst.</p>
<h2>Erwachseneninhalte</h2>
<p>Erwachsenensender (18+) sind standardmäßig ausgeblendet. Anzeigen: Einstellungen → Inhalte und Kinder → Inhalt → <b>Erwachseneninhalte anzeigen</b> (mit Bestätigung). Die Filterung beruht auf der Einstufung und Sperrliste von iptv-org.</p>
<div class="warn">Die Filterung stützt sich auf die Markierungen der öffentlichen Datenbank und ist daher nicht perfekt. Bei jüngeren Kindern lohnt sich Aufsicht; der Profilwechsel aus einem Kinderprofil ist nur geschützt, wenn ein Erwachsenenprofil eine PIN hat.</div>`,
  },
  {
    id: 'favorites',
    cat: 'personal',
    title: 'Favoriten und Verlauf',
    keywords: 'favorit stern reihenfolge ziehen verlauf zuletzt gesehen löschen',
    body: `
<h2>Favorit markieren</h2>
<ul>
<li>die <b>+</b>-Taste auf der Karte (beim Darüberfahren) oder ausgewählt die Taste <kbd>F</kbd> (auf dem Fernseher die rote Taste),</li>
<li>die +-Taste auf der Detailseite, während der Wiedergabe die +-Taste oder <kbd>S</kbd>.</li>
</ul>
<h2>Reihenfolge</h2>
<p>Auf der Seite <b>Favoriten</b> ordnest du die Karten per Ziehen mit der Maus. Die Zahl oben links auf einer Karte ist die <b>Sendernummer</b>; gibst du sie während der Wiedergabe ein, wechselst du dorthin. ${t('channel-switching', 'Sendernummern')}</p>
<h2>Verlauf</h2>
<p>Die zuletzt gesehenen 30 Sender stehen in der ersten Zeile der Startseite und unten auf der Seite Favoriten. Löschen: Favoriten → <b>Verlauf löschen</b>. Einstellungen → Wiedergabe → <i>Letzten Sender beim Start fortsetzen</i>: Beim Start läuft automatisch der zuletzt gesehene Sender.</p>`,
  },
  {
    id: 'themes',
    cat: 'personal',
    title: 'Stile der Oberfläche',
    keywords: 'design thema stil aussehen zen wabi sabi hell dunkel neon manga comic konsole',
    body: `
<p>Das Aussehen der Oberfläche ist pro Profil wählbar: <b>Einstellungen → Darstellung → Stil der Oberfläche</b> (Auswahlmenü oder Klick auf die Muster). Die Änderung gilt sofort.</p>
<p>Das <b>Layout ist in jedem Stil gleich</b> (Menüleiste oben, gleiche Kartengrößen, Zeilen und Karten auf der Startseite) – der Stil bestimmt nur das Aussehen: Farben, Schrift, Rahmen, Schatten, Hintergrundmuster, Animationen.</p>
<table class="help-table">
<tr><th colspan="2">Dunkle Stile</th></tr>
<tr><td><b>Kurenai</b></td><td>(Karmesin) Abendkino: schwarzer Hintergrund, rote Akzente, Karten, die beim Darüberfahren wachsen.</td></tr>
<tr><td><b>Mahō</b></td><td>(Magie) Märchenhafter tiefblauer Verlauf, abgerundete Karten mit leuchtendem Rahmen.</td></tr>
<tr><td><b>Murasaki</b></td><td>(Purpur) Lila-Rosa-Verläufe, leuchtende Akzente.</td></tr>
<tr><td><b>Akane</b></td><td>(Tiefrot) Schwarze Basis, rote Markierungen, Zeilentitel in Großbuchstaben.</td></tr>
<tr><td><b>Shinkai</b></td><td>(Tiefsee) Nachtblauer Hintergrund, meerblaue Akzente.</td></tr>
<tr><td><b>Garasu</b></td><td>(Glas) Tiefschwarzer Hintergrund, durchscheinende, verschwommene Flächen, schwebende Schatten.</td></tr>
<tr><td><b>Futago</b></td><td>(Zwillinge) Handheld-Konsolenmenü: dunkelgraue Basis, rot-blaues Controller-Paar, eckige Kacheln mit pulsierendem türkisem Rahmen.</td></tr>
<tr><td><b>Neon City</b></td><td>Nächtliche Neonstadt: Neongelb, Cyan und Magenta, Karten mit abgeschnittenen Ecken, Scanlines, „Glitch“ bei der Auswahl.</td></tr>
<tr><td><b>Neo-Tokyo</b></td><td>Die Welt von AKIRA: Silhouette einer nächtlichen Ruinenstadt am unteren Fensterrand, rasende rote Motorrad-Lichtspuren, Kaneda-rotes Blocklogo mit weißem Kapsel-Abzeichen, schräge Titelschrift, rot glühende Auswahl.</td></tr>
<tr><td><b>Kyokkō</b></td><td>(Polarlicht) Langsam wogender bunter Hintergrund, Milchglaskarten, leuchtende Auswahl. (Auf dem Fernseher bewegt sich der Hintergrund nicht.)</td></tr>
<tr><td><b>Phosphor</b></td><td>Grüner Phosphormonitor: Festbreitenschrift, Zeilentitel wie <code>$ ls</code>, invertierte Auswahl.</td></tr>
<tr><th colspan="2">Helle Stile</th></tr>
<tr><td><b>Zen</b></td><td>Reispapierweißer Hintergrund, moosgrüne Akzente, viel Luft, ruhige, langsame Bewegungen, ein Ensō-Kreis im Logo.</td></tr>
<tr><td><b>Wabi-Sabi</b></td><td>Warme, erdfarbene Papierstruktur, leicht unregelmäßige Karten, Rost- und Indigotöne, beim Darüberfahren ein goldener Kintsugi-Riss.</td></tr>
<tr><td><b>Asobiba</b></td><td>(Spielplatz) Gestreifter Hintergrund, weiß umrandete „Blasen“-Karten, federnde Bewegung, pulsierende türkise Auswahl.</td></tr>
<tr><td><b>Hiroba</b></td><td>(Platz) Das „Kanal“-Konsolenmenü: weißer, fein gestreifter Hintergrund, glänzende, grau umrandete Kacheln, blaue Auswahl.</td></tr>
<tr><td><b>16-Bit</b></td><td>Die graue Heimkonsole der 90er: lila Tasten, bunte A-B-X-Y-Punkte am Logo, Pixelrahmen, klotzige Titelschrift.</td></tr>
<tr><td><b>Manga</b></td><td>Schwarze Tusche auf weißem Papier: Rasterfolie (gepunktete Schattierung), dicke Panelrahmen, Graustufenbilder (bei Auswahl farbig), Sprechblasen-Tasten.</td></tr>
<tr><td><b>Pow!</b></td><td>Amerikanischer Comic: Ben-Day-Punkte, Rot-Gelb-Blau, dicke schwarze Konturen mit versetztem Schatten, gelbe Textkästen als Zeilentitel, „POW!“-Sternexplosion an Fenstern.</td></tr>
<tr><td><b>Kikagaku</b></td><td>(Geometrie) Plakatkunst: Rot-Blau-Gelb-Schwarz, Karten mit dickem schwarzem Rahmen und harten Schatten, nummerierte Zeilen.</td></tr>
<tr><td><b>Rakugaki</b></td><td>(Kritzelei) Linierte Heftseite mit Handschrift: Die Sender sind eingeklebte Polaroidfotos, die Tasten mit Bleistift gezeichnet.</td></tr>
</table>
<p>Auch die Elemente (Kacheln) der Startseite erhalten ein zum Stil passendes Aussehen (Rahmen, Schatten, Hintergrund, Titel). Der Player bleibt in jedem Stil dunkel, damit das Bild optimal wirkt.</p>
<p><b>Eigenes Design</b>: durch Hochladen einer Designdatei oder (am Computer) Kopieren in den Designordner – Einstellungen → Darstellung → <i>Eigene Designs</i>. ${t('custom-theme', 'Eigenes Design erstellen')}</p>
${go('#/settings', 'Darstellung einstellen')}`,
  },
  {
    id: 'custom-theme',
    cat: 'personal',
    title: 'Eigenes Design erstellen',
    keywords: 'eigenes design erstellen designdatei adastheme json css farben schrift ordner hochladen vorlage',
    body: `
<p>Ein Design ist eine einzelne <b>JSON-Datei</b> (<code>.adastheme</code> oder <code>.json</code>), die das <b>Aussehen</b> der Oberfläche festlegt: Farben, Schriften, Hintergrund und dekoratives CSS. Das <b>Layout kann es nicht ändern</b> – CSS, das Größe, Abstände, Position oder Sichtbarkeit ändert, filtert Adás automatisch heraus, sodass ein Design die Oberfläche nie auseinanderreißt. Die vollständige Beschreibung (mit Beispiel) steht im Quellcode: <code>docs/TEMA-KESZITES.md</code> (auf Ungarisch).</p>
<h2>Laden</h2>
<ul>
<li><b>Hochladen</b> (auf jedem Gerät): Einstellungen → Darstellung → <i>Eigene Designs</i> → <b>Designdatei hochladen…</b> Das Design kommt in die Einstellungen (Sicherung und Synchronisierung nehmen es mit).</li>
<li><b>Designordner</b> (Desktop): der Unterordner <code>themes</code> des Datenordners (<b>Designordner öffnen</b>) oder ein eigener Ordner (<b>Anderer Designordner…</b>). Kopierte Dateien werden beim Start und mit der Taste <b>Designordner neu einlesen</b> gelesen – praktisch zum Bearbeiten.</li>
<li><b>Vorlage aus dem aktuellen Stil speichern</b>: eine mit den Farben des verwendeten Stils ausgefüllte Designdatei – ein guter Ausgangspunkt.</li>
</ul>
<h2>Die Felder der Datei</h2>
<table class="help-table">
<tr><td><code>adasTheme</code></td><td><b>Pflicht</b>, Wert <code>1</code>.</td></tr>
<tr><td><code>id</code></td><td><b>Pflicht</b>: 2–40 Zeichen, Kleinbuchstaben, Ziffern, Bindestrich (z. B. <code>sakura</code>). Dieselbe <code>id</code> ersetzt die alte.</td></tr>
<tr><td><code>name</code></td><td><b>Pflicht</b>: der in der Stilauswahl angezeigte Name.</td></tr>
<tr><td><code>description</code>, <code>author</code></td><td>Beschreibung, Autor.</td></tr>
<tr><td><code>tone</code></td><td><code>"dark"</code> (Standard) oder <code>"light"</code>.</td></tr>
<tr><td><code>base</code></td><td>Ein integrierter Stil, auf dessen Verzierungen es aufbaut: <code>netflix</code> (Kurenai), <code>disney</code> (Mahō), <code>skyshowtime</code> (Murasaki), <code>rakuten</code> (Akane), <code>prime</code> (Shinkai), <code>apple</code> (Garasu), <code>zen</code>, <code>wabisabi</code>, <code>nintendo</code> (Asobiba), <code>switch</code> (Futago), <code>wii</code> (Hiroba), <code>cyberpunk</code> (Neon City), <code>neotokyo</code>, <code>manga</code>, <code>comic</code> (Pow!), <code>snes</code> (16-Bit), <code>bauhaus</code> (Kikagaku), <code>aurora</code> (Kyokkō), <code>sketch</code> (Rakugaki), <code>terminal</code> (Phosphor). Leer: neutrale Basis.</td></tr>
<tr><td><code>colors</code></td><td><code>bg</code> (Hintergrund), <code>bg2</code> (Karten, Panels), <code>bg3</code>, <code>bg4</code> (weitere Flächen), <code>line</code> (Linien), <code>text</code>, <code>textStrong</code> (Überschriften), <code>muted</code> (blasser Text), <code>accent</code>, <code>accent2</code> (Hervorhebung). Im CSS als <code>var(--bg)</code>, <code>var(--bg-2)</code>, <code>var(--accent)</code>… verfügbar.</td></tr>
<tr><td><code>fonts</code></td><td><code>body</code> und <code>headings</code>: CSS-<code>font-family</code> – nur installierte Schriften, immer mit Ausweichschrift.</td></tr>
<tr><td><code>radius</code></td><td>Grundrundung, z. B. <code>"8px"</code>.</td></tr>
<tr><td><code>background</code></td><td>Der Seitenhintergrund (Farbe, Verlauf, Muster).</td></tr>
<tr><td><code>preview</code></td><td>Die drei Farben des Musters in der Auswahl: Hintergrund, Hervorhebung, Karte.</td></tr>
<tr><td><code>css</code></td><td>Dekoratives CSS. Jede Regel wird auf das Design beschränkt; <code>&amp;</code> = das Design selbst (der <code>body</code>).</td></tr>
</table>
<h2>Was darf das CSS, was nicht?</h2>
<p><b>Erlaubt</b>: Farben, Hintergründe, Rahmen, <code>border-radius</code>, <code>box-shadow</code>, <code>text-shadow</code>, <code>filter</code>, <code>backdrop-filter</code>, <code>transform</code>, <code>transition</code>, <code>animation</code>, <code>@keyframes</code>, <code>@media</code>, Schriftfamilie / -stärke, <code>letter-spacing</code>, <code>text-transform</code>, <code>clip-path</code>, Bilder als <code>url(https://…)</code> oder <code>url(data:…)</code>.</p>
<p><b>Herausgefiltert</b> (bei normalen Elementen): <code>width</code>, <code>height</code>, <code>margin</code>, <code>padding</code>, <code>top</code>/<code>left</code>/…, <code>gap</code>, <code>display</code>, <code>flex</code>, <code>grid</code>, <code>font-size</code>, <code>line-height</code>, <code>overflow</code>, <code>visibility</code>, <code>position</code> (außer <code>relative</code>) und Ähnliches. Bei den dekorativen Pseudoelementen <code>::before</code> / <code>::after</code> sind auch diese erlaubt (gib ihnen <code>pointer-events: none</code>). Immer verboten: <code>@import</code>, <code>javascript:</code>.</p>
<h2>Gestaltbare Elemente</h2>
<p><code>#nav</code> (Menüleiste), <code>.brand</code> (Logo), <code>.links a.active</code>, <code>.btn</code> / <code>.btn.primary</code>, <code>.row-title</code>, <code>.card</code> / <code>.thumb</code> / <code>.card .name</code> (Senderkarte), <code>.tile</code>, <code>.vposter</code> (VOD-Poster), <code>.dcard</code> / <code>.dc-title</code> (Element der Startseite), <code>.d-row</code>, <code>.modal</code>, <code>.tab.active</code>, <code>.switch:checked</code>, <code>.input</code>, <code>.now-label</code>, <code>.bar i</code>, <code>.profile .avatar</code>, <code>:focus-visible</code> (Auswahl – auf dem Fernseher am wichtigsten). Auf dem Fernseher schaltest du mit dem Präfix <code>&amp;.tv</code> bremsende Effekte ab (Unschärfe, Endlosanimation).</p>
<h2>Vollständiges Beispiel</h2>
<pre class="code">{
  "adasTheme": 1,
  "id": "sakura",
  "name": "Sakura",
  "description": "Kirschblüte: helles Rosa, weiche Schatten.",
  "tone": "light",
  "base": "zen",
  "colors": { "bg": "#fbf4f6", "bg2": "#ffffff", "bg3": "#f1e2e7", "bg4": "#e8d3da",
              "line": "#e2c8d1", "text": "#4a3b40", "textStrong": "#2a1f23", "muted": "#8d7880",
              "accent": "#d6457a", "accent2": "#ef7aa4" },
  "fonts": { "body": "'Segoe UI', Arial, sans-serif", "headings": "Georgia, serif" },
  "radius": "14px",
  "background": "radial-gradient(ellipse at 85% 0%, #ffe1ec, transparent 55%), #fbf4f6",
  "preview": ["#fbf4f6", "#d6457a", "#f1e2e7"],
  "css": ".dcard { border: 1px solid var(--line); border-radius: 18px; }\\n.dc-title { color: var(--accent); }\\n.btn.primary { background: var(--accent); color: #fff; }"
}</pre>
<div class="tip"><b>Mit künstlicher Intelligenz</b>: Kopiere ihr diese Hilfeseite (oder <code>docs/TEMA-KESZITES.md</code>) hinein und beschreibe die Stimmung des gewünschten Designs – mit den obigen Feldern liefert sie eine fertige Designdatei zum Hochladen.</div>
<div class="note">Bei einer fehlerhaften Datei zeigt eine gelbe Meldung unter der Liste <i>Eigene Designs</i> den Fehler (z. B. ungültiges JSON, falsche <code>id</code>). Herausgefilterte CSS-Eigenschaften verursachen keinen Fehler, sie wirken einfach nicht.</div>
${go('#/settings', 'Darstellung einstellen')}`,
  },
  {
    id: 'home-rows',
    cat: 'personal',
    title: 'Reihenfolge der Zeilen von TV- und VOD-Seite',
    keywords: 'reihenfolge zeilen kategorien sortieren ausblenden tv-seite vod genre ziehen',
    body: `
<p>Einstellungen → Darstellung → <b>Zeilen der TV-Seite</b> bzw. Einstellungen → VOD und Mediathek → VOD-Listen → <b>Zeilen der VOD-Seite</b>. Die Liste zeigt die Zeilen in der Reihenfolge, in der sie erscheinen. Die Einstellung gilt <b>nur für das aktuelle Profil</b>. Beim VOD sind die Zeilen: Weiterschauen, Merkliste, Serien, Empfohlene Filme, die einheitlichen Genres (mit mindestens 6 Titeln), eine Zeile pro Liste, Weitere Filme.</p>
<ul>
<li><b>Verschieben</b>: Fasse die Zeile am Griff ⋮⋮ und ziehe sie an ihren Platz, oder nutze die Tasten ⌃ / ⌄ (auch mit der Fernbedienung: auf der Taste bleiben und mehrmals drücken).</li>
<li><b>Ausblenden</b>: der Schalter neben der Zeile. Eine ausgeblendete Zeile steht blass in der Liste, erscheint aber nicht auf der Seite.</li>
<li><b>Standardreihenfolge</b>: setzt alles zurück.</li>
</ul>
<p>Verfügbare Zeilen: Zuletzt gesehen, Deine Favoriten, Jetzt im TV, Heimatsender, Eigene Listen (jede eigene Liste und die eigenen Sender in eigenen Zeilen), alle Kategorien, Länder entdecken sowie die – standardmäßig ausgeblendete – Kachelzeile Kategorien.</p>
<div class="tip">Eine Kategoriezeile erscheint nur, wenn mindestens 3 Sender dazugehören; im Kinderprofil sind nur kindgerechte Kategorien zu sehen.</div>`,
  },
  {
    id: 'settings-overview',
    cat: 'personal',
    title: 'Überblick über die Einstellungen',
    keywords: 'einstellungen optionen möglichkeiten',
    body: `
<p>Die Einstellungen sind in Gruppen geordnet. Rechts in der Kopfzeile wählst du zwischen zwei Layouts (die Wahl bleibt erhalten):</p>
<ul>
<li><b>▦ Kacheln</b>: große Kacheln auf der Startseite (Symbol + kurze Beschreibung); ein Klick auf eine Kachel öffnet die Gruppe, mit <i>‹ Alle Einstellungen</i> (oder Zurück) kommst du zurück. Bequem auf dem Fernseher mit Fernbedienung.</li>
<li><b>☰ Tabs</b>: die Tabs der Gruppen oben (auf dem Handy horizontal scrollbar), darunter die gewählte Gruppe.</li>
</ul>
<p>Oben in jeder Gruppe sagen ein, zwei Sätze, was du dort findest. Das <b>Suchfeld</b> durchsucht in beiden Ansichten alle Einstellungen (z. B. <i>Untertitel</i>, <i>Design</i>, <i>Sync</i>): Die Bereiche mit Treffern werden angezeigt, die passenden Zeilen hervorgehoben.</p>
<table class="help-table">
<tr><td><b>🎨 Darstellung</b></td><td>Sprache und Stil der Oberfläche, eigene Designs, Reihenfolge der Zeilen der TV-Seite. ${t('themes', 'Stile')}</td></tr>
<tr><td><b>🏠 Startseite</b></td><td>Kacheln der Startseite, Wetter, Nachrichtenquellen, Live-Vorschau. ${t('dashboard', 'Startseite')}</td></tr>
<tr><td><b>▶️ Wiedergabe</b></td><td>Ersatzquelle, höchste Qualität, Lautstärke, Wiedergabe-Engine und Wiedergabebrücke, Player-Tasten. ${t('engines', 'Engines')}</td></tr>
<tr><td><b>💬 Untertitel und Informationen</b></td><td>Untertitelquellen (Feliratok.eu, OpenSubtitles, SubDL), Aussehen der Untertitel, bevorzugte Tonspur, deutsche Beschreibungen und Coverbilder. ${t('subtitles', 'Untertitel')}</td></tr>
<tr><td><b>⏺ Aufnahmen</b></td><td>Aufnahmeordner, Puffer vor / nach der Sendung, letzte Aufnahmen (Desktop-Version). ${t('recording', 'Aufnahme')}</td></tr>
<tr><td><b>📺 Senderlisten</b></td><td>Integrierte und eigene Wiedergabelisten, eigene Sender, Verfügbarkeitsprüfung. ${t('lists', 'Listen')}</td></tr>
<tr><td><b>🎬 VOD und Mediathek</b></td><td>Film- und Serienlisten, Zusatzpakete, eigene (NAS-)Mediathek, Zeilen der VOD-Seite. ${t('vod-lists', 'VOD-Listen')}</td></tr>
<tr><td><b>🗓️ TV-Programm</b></td><td>Quellen und Aktualisierung des TV-Programms. ${t('epg-sources', 'TV-Programm')}</td></tr>
<tr><td><b>👪 Inhalte und Kinder</b></td><td>Heimatland, ausgeblendete und Erwachseneninhalte, was Kinderprofile sehen dürfen. ${t('kids', 'Details')}</td></tr>
<tr><td><b>🔔 Benachrichtigungen</b></td><td>Erinnerungen, automatisches Umschalten, Hintergrundbetrieb. ${t('reminders', 'Details')}</td></tr>
<tr><td><b>📱 Fernbedienung und Tasten</b></td><td>Handy als Fernbedienung (per QR-Code), Tastenkürzel, Tasten der TV-Fernbedienung. ${t('remote', 'Fernbedienung')}</td></tr>
<tr><td><b>🔄 Synchronisierung zwischen Geräten</b></td><td>Einstellungen, Profile und Listen per Code auf ein anderes Gerät übertragen.</td></tr>
<tr><td><b>💾 Profile und Sicherung</b></td><td>Profile, Sicherung und Wiederherstellung, automatische Sicherungen, Cache. ${t('backup', 'Details')}</td></tr>
<tr><td><b>⬆️ Aktualisierungen</b></td><td>Neue Version von GitHub suchen und installieren; die Suche beim Start lässt sich abschalten. ${t('update', 'Aktualisierungen')}</td></tr>
<tr><td><b>ℹ️ Über</b></td><td>Version, Speicherort des Datenordners, Datenquellen.</td></tr>
</table>
${go('#/settings', 'Einstellungen öffnen')}`,
  },
  {
    id: 'backup',
    cat: 'personal',
    title: 'Sicherung, Wiederherstellung, Cache',
    keywords: 'sicherung wiederherstellung kopie export import cache leeren umzug',
    body: `
<h2>In Datei speichern</h2>
<p>Einstellungen → Profile und Sicherung → <b>In Datei speichern</b>: schreibt die Einstellungen, alle Profile mit Favoriten, Verlauf, Erinnerungen, Stil und Reihenfolge sowie deine eigenen Listen und Sender in eine <code>.json</code>-Datei. So nimmst du alles auf einen anderen Computer mit.</p>
<h2>Wiederherstellen</h2>
<p><b>Aus Datei wiederherstellen</b>: Die gespeicherte Datei überschreibt die aktuellen Einstellungen und Profile (mit Bestätigung), danach startet das Programm neu.</p>
<p><b>Profile aus Datei hinzufügen</b>: übernimmt nur die Profile der Sicherung (mit Favoriten, Verlauf, Erinnerungen, Profilbild, PIN); die aktuellen Einstellungen, Listen und übrigen Profile bleiben, ein gleiches Profil wird aktualisiert. Dasselbe funktioniert übers Netzwerk mit dem Schalter <b>Nur Profile</b> bei der <i>Synchronisierung zwischen Geräten</i>.</p>
<h2>Ist die Profildatei überall gleich?</h2>
<p>Ja: Alle Versionen (Windows, Mac, Linux, LG-Fernseher, Android, Browser) nutzen dasselbe Format, daher lässt sich eine Sicherung auf jedem Gerät laden. Wo es keine Dateiauswahl gibt (Fernseher), übers Netzwerk (<i>Synchronisierung zwischen Geräten</i>) oder per Webadresse.</p>
<table class="help-table">
<tr><th>Version</th><th>Wo liegen die Daten?</th></tr>
<tr><td>Windows</td><td><code>%APPDATA%\\Adás\\store.json</code> (sowohl die installierte als auch die portable Version speichern hier)</td></tr>
<tr><td>macOS / Linux</td><td><code>~/Library/Application Support/Adás/store.json</code> / <code>~/.config/Adás/store.json</code></td></tr>
<tr><td>Android, Android TV</td><td>Im eigenen geschützten Speicher der App (von außen nicht zugänglich; geht beim Deinstallieren verloren – vorher sichern)</td></tr>
<tr><td>LG-Fernseher</td><td>Im eigenen Speicher der App (geht beim Deinstallieren verloren)</td></tr>
<tr><td>Browser</td><td>Im lokalen Speicher des Browsers, getrennt pro Adresse</td></tr>
</table>
<h2>Cache leeren</h2>
<p>Löscht die heruntergeladenen Listen, das TV-Programm und den verarbeiteten Katalog – beim nächsten Start wird alles frisch geladen. Hilfreich, wenn etwas „hängt“. Deine Einstellungen und Profile bleiben unberührt.</p>
<div class="note">Auf dem Fernseher ist das Speichern in eine Datei nicht verfügbar – dort funktioniert die <i>Synchronisierung zwischen Geräten</i>. Unter Android speichert der Dateidialog des Systems (z. B. in den Ordner Downloads oder in Google Drive).</div>`,
  },

  // ===================================================================== Senderlisten
  {
    id: 'lists',
    cat: 'lists',
    title: 'Senderlisten und ihre Aktualisierung',
    keywords: 'liste aktualisierung aktualisieren senderliste m3u iptv-org automatisch download neue sender',
    body: `
<p>Die Sender des Programms stammen aus den <b>integrierten Listen</b>, deinen <b>eigenen Wiedergabelisten</b> und deinen einzeln hinzugefügten <b>eigenen Sendern</b>.</p>
<h2>Integrierte Listen</h2>
<p>Einstellungen → Senderlisten → <b>Integrierte Listen</b>: Jede lässt sich mit einem eigenen Schalter ein- und ausschalten. Daneben steht, wie viele Sender sie liefern.</p>
<table class="help-table">
<tr><td><b>iptv-org</b></td><td>Die größte Community-Sammlung (ca. 10.000 Sender) mit ausführlichen Daten (Land, Sprache, Eigentümer, Webseite…). Die Adresse lässt sich mit der Taste <i>Adresse</i> ändern (z. B. die Liste nur eines Landes).</td></tr>
<tr><td><b>iptv-org – Animation</b></td><td>Die Animationssender von iptv-org als eigene Liste; bei eingeschaltetem iptv-org werden sie damit zusammengeführt, allein nützlich, wenn iptv-org ausgeschaltet ist.</td></tr>
<tr><td><b>Free-TV</b></td><td>Handverlesene kostenlose Sender nach Ländern.</td></tr>
<tr><td><b>Pluto TV</b>, <b>Samsung TV Plus</b>, <b>Plex</b></td><td>Kostenlose, werbefinanzierte Streaming-Sender aus mehreren Ländern mit eigenem TV-Programm.</td></tr>
<tr><td><b>FreeCast Hub</b></td><td>Eine kleine Auswahl (Nachrichten, Musik, Sport).</td></tr>
<tr><td><b>DragonHall TV</b></td><td>Ein einzelner ungarischer Internet-Stream.</td></tr>
</table>
<h2>Ohne Doppelungen</h2>
<p>Sind mehrere Listen eingeschaltet, steht derselbe Sender oft in mehreren. Das Programm <b>führt sie zu einem Sender zusammen</b>: Der Sender erscheint einmal, und seine Streams aus den verschiedenen Listen werden zu <b>Ersatzquellen</b> (funktioniert eine nicht, wechselt der Player von selbst zur nächsten). Auf der Detailseite zeigt die Zeile <i>Senderlisten</i>, in welchen Listen er steht, und bei den <i>Stream-Quellen</i> sieht man, woher jede Quelle stammt.</p>
<p>So läuft das Zusammenführen: zuerst anhand der Sender-ID (<code>tvg-id</code>), dann nach Name und Land, zuletzt – falls eindeutig – nur nach Name. Die Länderversionen von Pluto TV, Samsung TV Plus und Plex (z. B. „48 Hours“ USA / Kanada / Vereinigtes Königreich) verschmelzen zu einem Sender. Gleichnamige, aber tatsächlich verschiedene Sender aus verschiedenen Ländern (z. B. „ABC News“ Australien und USA) bleiben getrennt.</p>
<h2>Aktualisierung</h2>
<ul>
<li><b>Automatisch</b>: die Hauptliste alle 6 Stunden, die Senderdaten täglich; beim Start beginnt das Programm sofort mit der gespeicherten Liste und aktualisiert sie im Hintergrund, falls sie alt ist.</li>
<li><b>Sofort</b>: Profilmenü (das Profilbild in der Kopfzeile) → <b>Senderliste aktualisieren</b> – darunter steht, wann zuletzt geladen wurde. Oder: Einstellungen → Senderlisten → <b>Alle Listen jetzt aktualisieren</b>. Beide laden alles unter Umgehung des Caches neu, samt TV-Programm, und zeigen am Ende, wie viele Sender es sind (und wie viele neu).</li>
</ul>
<h2>Die Adresse der iptv-org-Liste</h2>
<p>Einstellungen → Senderlisten → iptv-org → <b>Adresse</b>: Auch eine andere M3U-Adresse ist möglich (z. B. nur ein Land: <code>https://iptv-org.github.io/iptv/countries/de.m3u</code>). Leer gelassen, gilt wieder die vollständige Liste.</p>
<p>Siehe auch: ${t('custom-playlists', 'Eigene Wiedergabeliste hinzufügen')} · ${t('custom-channels', 'Eigenen Sender hinzufügen')}</p>
${go('#/settings?section=lists', 'Senderlisten verwalten')}`,
  },
  {
    id: 'custom-playlists',
    cat: 'lists',
    title: 'Eigene Wiedergabeliste hinzufügen',
    keywords: 'eigene liste hinzufügen m3u m3u8 url datei einfügen empfohlen anbieter iptv',
    body: `
<p>Du kannst jede M3U-/M3U8-Wiedergabeliste hinzufügen – z. B. die deines Anbieters, eine Community-Sammlung oder eine eigene Zusammenstellung. Einstellungen → Senderlisten → Eigene Wiedergabelisten:</p>
<table class="help-table">
<tr><td><b>Liste per Adresse hinzufügen</b></td><td>Gib die <code>http(s)://</code>-Adresse der Liste ein. Das Programm lädt sie sofort, zeigt, wie viele Streams sie enthält, und fragt dann nach einem Namen (mit Vorschlag).</td></tr>
<tr><td><b>Aus Datei</b></td><td>Eine oder mehrere <code>.m3u</code>-/<code>.m3u8</code>-Dateien oder ein <b>ZIP</b>-Paket (Desktop- und Android-Version). Jede Datei wird eine eigene, ein- und ausschaltbare Liste.</td></tr>
<tr><td><b>Liste als Text einfügen</b></td><td>Füge den Inhalt der Liste ein – oder einfach Stream-Adressen, eine pro Zeile, aus denen das Programm selbst eine Liste baut.</td></tr>
</table>
<h2>Verwalten</h2>
<ul>
<li><b>Schalter</b>: Die Liste lässt sich vorübergehend ausschalten, ohne sie zu löschen.</li>
<li><b>Umbenennen</b>, <b>Adresse</b> ändern, <b>Löschen</b>.</li>
<li>Neben der Zeile steht die Zahl der Sender, bei einem Downloadfehler die Fehlermeldung.</li>
</ul>
<p>Die Sender deiner eigenen Listen erscheinen auf der Startseite in einer eigenen Zeile mit dem Namen der Liste (anstelle von <i>Eigene Listen</i>), außerdem beim Durchsuchen und in der Suche. Anhand des Feldes <code>group-title</code> (oder <code>#EXTGRP</code>) werden sie Kategorien zugeordnet – auch Gruppennamen in anderen Sprachen, z. B. <i>Nachrichten, Deportes, Films, Kids, Musik, Dokumentation…</i> –, anhand von <code>tvg-id</code> dem TV-Programm. Das Land ergibt sich aus <code>tvg-country</code>, einer nach einem Land benannten Gruppe (z. B. „Deutschland“), der Endung von <code>tvg-id</code> (<code>.de</code>) oder einem Namenspräfix (<code>DE:</code>, <code>|DE|</code>, <code>[GER]</code>); die Sprache aus <code>tvg-language</code>. So stehen die Sender des Heimatlandes auch in eigenen Listen vorn. Kodi-artige Header nach der Adresse (<code>…/index.m3u8|User-Agent=…&amp;Referer=…</code>) funktionieren ebenfalls. ${t('m3u-format', 'Das M3U-Format')}</p>
<div class="warn">Nutze nur Listen, deren Inhalt du legal ansehen darfst.</div>`,
  },
  {
    id: 'custom-channels',
    cat: 'lists',
    title: 'Eigenen Sender hinzufügen',
    keywords: 'sender hinzufügen eigener stream url individueller stream testen user-agent referer header',
    body: `
<p>Du kannst auch einen einzelnen Stream ohne Liste hinzufügen: Profilmenü → <b>Sender hinzufügen</b> oder Einstellungen → Senderlisten → <b>Sender hinzufügen</b>.</p>
<h2>Felder</h2>
<table class="help-table">
<tr><td><b>Name</b> *</td><td>So erscheint er in der Oberfläche.</td></tr>
<tr><td><b>Stream-Adresse</b> *</td><td>Die <b>direkte</b> Stream-Adresse: HLS (<code>.m3u8</code>), MPEG-TS (<code>.ts</code>), FLV, DASH (<code>.mpd</code>) oder MP4. Die Adresse einer Webseite (auf der der Player ist) funktioniert nicht.</td></tr>
<tr><td><b>Logo-Adresse</b></td><td>Die Adresse eines Bildes (PNG, JPG, SVG). Ist sie leer, erscheinen die Initialen des Namens.</td></tr>
<tr><td><b>Kategorie</b>, <b>Land</b></td><td>Danach landet er in den passenden Zeilen und Filtern.</td></tr>
<tr><td><b>Erweitert: User-Agent, Referer</b></td><td>Manche Server liefern nur mit einer bestimmten Browserkennung oder verweisenden Seite ein Bild. Siehst du so etwas an der Quelle (z. B. <code>#EXTVLCOPT:http-referrer=…</code>), gib es hier ein.</td></tr>
</table>
<p>Die Taste <b>Ausprobieren</b> startet den Stream ohne Speichern – so prüfst du vorab, ob er funktioniert. Nach <b>Speichern</b> erscheint der Sender in der Zeile <i>Eigene Sender</i> der Startseite, beim Durchsuchen und in der Suche, kann als Favorit markiert werden und eine Sendernummer bekommen.</p>
<p>Bearbeiten, abspielen, löschen: Einstellungen → Senderlisten → Eigene Sender.</p>
<div class="note">Auf dem Fernseher beachtet der integrierte Player die Header User-Agent / Referer nicht immer.</div>
${go('#/settings?section=lists', 'Eigene Sender verwalten')}`,
  },
  {
    id: 'm3u-format',
    cat: 'lists',
    title: 'Das M3U-Wiedergabelistenformat',
    keywords: 'm3u format extinf tvg-id tvg-logo group-title extvlcopt aufbau beispiel',
    body: `
<p>M3U ist eine einfache Textdatei: Jeder Stream wird durch eine <code>#EXTINF</code>-Zeile beschrieben, gefolgt von der Adresszeile.</p>
<pre class="code">#EXTM3U x-tvg-url="https://beispiel.de/programm.xml.gz"
#EXTINF:-1 tvg-id="DasErste.de" tvg-logo="https://…/daserste.png" group-title="News",Das Erste (1080p)
https://…/daserste/index.m3u8
#EXTINF:-1 tvg-logo="https://…/logo.png" group-title="Sports",Mein Sportsender [Geo-blocked]
#EXTVLCOPT:http-referrer=https://beispiel.de/
#EXTVLCOPT:http-user-agent=Mozilla/5.0 …
https://…/sport/playlist.m3u8</pre>
<table class="help-table">
<tr><td><code>x-tvg-url</code></td><td>(Kopfzeile) das eigene TV-Programm der Liste – das Programm lädt es ebenfalls.</td></tr>
<tr><td><code>tvg-id</code></td><td>Die Sender-ID; danach werden Senderdaten und TV-Programm zugeordnet.</td></tr>
<tr><td><code>tvg-logo</code></td><td>Die Logo-Adresse.</td></tr>
<tr><td><code>group-title</code></td><td>Kategorie (News, Sports, Movies, Kids, Music…; mehrere durch Semikolon getrennt).</td></tr>
<tr><td>Der Text nach dem Komma</td><td>Der Sendername; <code>(1080p)</code> gilt als Qualität, <code>[Geo-blocked]</code> und <code>[Not 24/7]</code> als Kennzeichnungen.</td></tr>
<tr><td><code>#EXTVLCOPT</code>, <code>http-referrer</code>, <code>http-user-agent</code></td><td>Für den Stream nötige HTTP-Header.</td></tr>
</table>
<p>Zeilen mit derselben <code>tvg-id</code> erscheinen als mehrere Quellen eines Senders.</p>`,
  },
  {
    id: 'health',
    cat: 'lists',
    title: 'Verfügbarkeitsprüfung',
    keywords: 'prüfung funktioniert punkt verfügbar toter link nicht verfügbar ausblenden vollständig',
    body: `
<p>Ein Teil der Streams kostenloser Listen fällt zeitweise oder dauerhaft aus. Deshalb prüft Adás, welche funktionieren:</p>
<ul>
<li><b>Automatisch</b>: Es probiert die Quellen der auf dem Bildschirm angezeigten Sender (höchstens vier pro Sender) im Hintergrund aus, alle 12 Stunden erneut. Abschaltbar: Einstellungen → Senderlisten → Verfügbarkeitsprüfung.</li>
<li><b>So, wie der Player es sieht</b>: Es reicht nicht, dass der Server antwortet – das Programm lädt über die Wiedergabeliste auch den Anfang eines echten Videosegments. So bekommen auch geogesperrte, abgelaufene oder gerade leere (nicht sendende) Streams die Kennzeichnung <b>Offline</b> / <b>Sendepause</b>.</li>
<li><b>Bei der Wiedergabe</b>: Was startet, gilt als funktionierend, was nicht, als fehlerhaft. Eine fehlgeschlagene Wiedergabe kann die Hintergrundprüfung 12 Stunden lang nicht als „funktioniert“ überschreiben.</li>
<li><b>Schneller Wechsel</b>: Antwortet eine Quelle nicht innerhalb von 6 Sekunden, geht der Player zur nächsten; bei mehreren Quellen probiert er die übrigen parallel und wechselt nach 3 Sekunden zu einer sicher laufenden.</li>
<li><b>Vollständige Prüfung</b>: Einstellungen → Senderlisten → Verfügbarkeitsprüfung → <b>Alle Streams prüfen</b> – probiert alle (über zehntausend) Quellen in wenigen Minuten durch; mit Fortschrittsanzeige, abbrechbar.</li>
<li><b>Auf der Detailseite</b>: <i>Quellen prüfen</i> – alle Quellen dieses Senders sofort.</li>
</ul>
<p>Mit <b>Nicht verfügbare Sender ausblenden</b> (Einstellungen → Inhalte und Kinder → Inhalt) verschwinden als fehlerhaft erkannte Sender aus den Listen. <b>Ergebnisse löschen</b> setzt alles auf „nicht geprüft“ zurück.</p>
<div class="note">Selten startet ein „funktionierender“ Stream doch nicht (z. B. kann der Computer das Videoformat nicht dekodieren) – das wird nach der ersten fehlgeschlagenen Wiedergabe markiert. Ein „fehlerhafter“ Stream kann später wieder verfügbar sein. Im Browser ist die Prüfung nicht verfügbar.</div>`,
  },

  // ===================================================================== TV
  {
    id: 'android',
    cat: 'tv',
    title: 'Android: Handy, Tablet, Android TV',
    keywords: 'android handy mobil tablet android tv google tv shield box apk installation',
    body: `
<p>Die Android-Version ist eine einzige <code>.apk</code>-Datei (<code>dist-android/Adas-…apk</code>), die auf Handys, Tablets und <b>Android TV / Google TV</b> läuft (Android 6.0 oder neuer). Auf einem Fernseher startet die TV-Oberfläche für Fernbedienungen.</p>
<h2>Installation</h2>
<ul>
<li><b>Auf Handy / Tablet</b>: Kopiere die APK hinüber und öffne sie. Beim ersten Mal musst du dem Dateimanager (oder Browser) erlauben, Apps zu installieren („unbekannte Quellen“).</li>
<li><b>Auf Android TV</b>: Am einfachsten mit der App <i>Send files to TV</i> (vom Handy schicken) oder per USB-Stick + Dateimanager. Auch auf dem Fernseher muss die Installation aus unbekannten Quellen erlaubt werden (Einstellungen → System / Sicherheit).</li>
</ul>
<h2>Bedienung</h2>
<ul>
<li>Auf dem Handy unten eine Menüleiste mit Symbolen; bei der Wiedergabe ist das Bild im Vollbild und lässt sich gedreht im Querformat ansehen. Das erste Tippen holt die Bedienelemente hervor.</li>
<li>Auf dem Fernseher: <b>OK</b> = abspielen, <b>lang gedrücktes OK</b> auf einem Sender = Detailseite (Favorit, Erinnerung, Quellen), <b>Zurück</b> = zurück (auf der Startseite beenden). Hat die Fernbedienung Farbtasten, CH+/CH− oder ◀◀ / ▶▶, funktionieren sie wie in der LG-Version.</li>
</ul>
<h2>Hintergrundwiedergabe</h2>
<ul>
<li><b>Hintergrundwiedergabe (nur Ton)</b>: Einstellungen → Wiedergabe → <i>Hintergrundwiedergabe</i>. Eingeschaltet spielt der Ton weiter, wenn du zu einer anderen App wechselst; eine Benachrichtigung zeigt es an, von dort kehrst du zurück oder beendest es. Ausgeschaltet (Standard) stoppt die Wiedergabe beim Verlassen.</li>
</ul>
<div class="note">Unter Android gibt es kein Übertragen, keinen Nachtmodus-Ton und keine Update-Prüfung. Die Einstellungen lassen sich per Code mit dem Computer und anderen Android-Geräten synchronisieren, in beide Richtungen (${t('transfer', 'Synchronisierung zwischen Geräten')}), und das Handy kann als Fernbedienung dienen (${t('remote', 'Fernbedienung per Handy')}). Eine neue Version bekommst du, indem du die neue APK installierst – die Einstellungen bleiben erhalten.</div>`,
  },
  {
    id: 'tv-install',
    cat: 'tv',
    title: 'Installation auf einem LG-webOS-Fernseher',
    keywords: 'lg webos fernseher installation ipk entwicklermodus developer mode ares',
    body: `
<p>Die TV-Version ist ein <code>.ipk</code>-Paket (<code>dist-webos/hu.adas.tv_…_all.ipk</code>), das auf LG-Fernsehern ab Baujahr 2018 (webOS 4.0 oder neuer) läuft. Da es nicht im Store ist, wird es im <b>Entwicklermodus</b> installiert:</p>
<ol>
<li>Registriere ein kostenloses Konto auf <b>developer.lge.com</b>.</li>
<li>Auf dem Fernseher: LG Content Store → installiere die App <b>Developer Mode</b>, melde dich an, schalte <i>Dev Mode Status</i> und <i>Key Server</i> ein und starte den Fernseher neu. Die App zeigt IP-Adresse und Passphrase des Fernsehers.</li>
<li>Am Computer (Node.js nötig) im Projektordner:
<pre class="code">npx ares-setup-device        (Fernseher hinzufügen: Name „tv“, IP-Adresse, Port 9922)
npx ares-novacom --device tv --getkey   (die Passphrase zeigt die App Developer Mode)
npm run webos:install -- --device tv
npm run webos:launch -- --device tv</pre></li>
</ol>
<p>Grafische Lösung: das Desktop-Programm <b>webOS Dev Manager</b> → <i>Install from file</i> → die <code>.ipk</code>-Datei.</p>
<div class="warn">Der Entwicklermodus läuft alle 50 Stunden ab; in der App Developer Mode lässt er sich mit einem Tastendruck verlängern. Nach Ablauf verschwindet die installierte App und muss neu installiert werden.</div>`,
  },
  {
    id: 'tv-remote',
    cat: 'tv',
    title: 'Tasten der Fernbedienung',
    keywords: 'fernbedienung farbtasten rot grün gelb blau zurück ok magic remote',
    body: `
<table class="help-table keys">
<tr><td>Pfeile, <b>OK</b></td><td>Bewegen, auswählen, abspielen</td></tr>
<tr><td><b>Zurück</b></td><td>Zurück / schließen; auf der Startseite Frage zum Beenden</td></tr>
<tr><td><span class="key red">●</span> Rot</td><td>Favorit an/aus für den ausgewählten Sender (bei der Wiedergabe den gerade gesehenen)</td></tr>
<tr><td><span class="key green">●</span> Grün</td><td>Auf einem ausgewählten Sender: Detailseite; sonst: TV-Programm (bei der Wiedergabe: Detailseite)</td></tr>
<tr><td><span class="key yellow">●</span> Gelb</td><td>Suche (bei der Wiedergabe: Qualität und Quelle)</td></tr>
<tr><td><span class="key blue">●</span> Blau</td><td>Favoriten (bei der Wiedergabe: Senderliste)</td></tr>
<tr><td><b>CH+ / CH−</b>, ↑ / ↓</td><td>Senderwechsel bei der Wiedergabe</td></tr>
<tr><td><b>0–9</b></td><td>Sendernummer</td></tr>
<tr><td>▶ ❚❚ ■</td><td>Weiter / Pause / Wiedergabe stoppen</td></tr>
</table>
<p>Mit dem Zeiger der <b>Magic Remote</b> lässt sich alles auch wie mit einer Maus bedienen.</p>`,
  },
  {
    id: 'tv-limits',
    cat: 'tv',
    title: 'Worin unterscheidet sich die TV-Version?',
    keywords: 'fernseher unterschied einschränkung webos cors dienst',
    body: `
<ul>
<li><b>Wiedergabe</b>: Standardmäßig spielt der integrierte Player des Fernsehers HLS-Streams; kommt er nicht zurecht, versucht es das Programm erneut mit hls.js.</li>
<li><b>Downloads</b>: Die Browser-Engine des Fernsehers erlaubt (wegen CORS-Beschränkungen) keine direkten Downloads von anderen Servern, deshalb lädt ein kleiner <b>Hintergrunddienst</b> im Paket das TV-Programm und nicht freigegebene Listen herunter und prüft auch die Streams.</li>
<li><b>Nicht verfügbar</b>: Mini-Player, Vollbild-Taste (ohnehin Vollbild), Speichern in / Laden aus Dateien, Öffnen externer Webseiten, Live-Vorschau auf der Startseite.</li>
<li>Streams, die einen eigenen User-Agent-/Referer-Header brauchen, starten mit dem integrierten Player nicht immer.</li>
<li>Der erste Start kann langsamer sein (der Prozessor des Fernsehers ist schwächer); danach wird die verarbeitete Liste gespeichert.</li>
</ul>`,
  },

  // ===================================================================== Fehlerbehebung
  {
    id: 'trouble-playback',
    cat: 'trouble',
    title: 'Der Stream startet nicht',
    keywords: 'startet nicht funktioniert nicht fehler schwarzes bild nicht verfügbar zeitüberschreitung geo',
    body: `
<p>Bei kostenlosen Community-Listen kommt es häufig vor, dass ein Stream gerade nicht verfügbar ist. Probiere der Reihe nach:</p>
<ol>
<li>Die Taste <b>Erneut</b> – manchmal war nur der Server langsam.</li>
<li>Eine andere <b>Quelle</b>: bei der Wiedergabe ⚙ → Quelle, oder ein anderes ▶ auf der Detailseite. ${t('quality', 'Details')}</li>
<li>Eine andere <b>Wiedergabe-Engine</b>: Einstellungen → Wiedergabe → Wiedergabe-Engine (Integriert ↔ hls.js). ${t('engines', 'Details')}</li>
<li><b>Geosperre</b> (🌐): Manche Streams sind nur aus bestimmten Ländern zu sehen. ${t('geo', 'Details')}</li>
<li>Kennzeichnung <b>„Nicht rund um die Uhr“</b>: Der Sender sendet nur zu bestimmten Zeiten.</li>
<li>Aktualisiere die Senderliste (Profilmenü → Senderliste aktualisieren) – vielleicht hat iptv-org inzwischen eine neue Adresse gefunden.</li>
<li>Schalte <b>Nicht verfügbare Sender ausblenden</b> ein, damit tote Sender nicht stören.</li>
</ol>
<p>Funktioniert ein Stream dauerhaft nicht, liegt es an der Quelle – den Sender kann man auf der GitHub-Seite von iptv-org melden.</p>`,
  },
  {
    id: 'geo',
    cat: 'trouble',
    title: 'Geosperre (🌐)',
    keywords: 'geosperre geo-block geo-blocked land vpn 403 451 nicht sichtbar',
    body: `
<p>Viele Sender sind wegen der Rechte nur aus ihrem eigenen Land zu sehen. Adás zeigt das auf zwei Arten:</p>
<table class="help-table">
<tr><td><b>🌐 GEOSPERRE</b> (orange Kennzeichnung auf der Karte, „Geosperre – von hier aus nicht verfügbar“)</td><td>Sicher: Der Sender hat die Anfrage von hier <b>abgelehnt</b> (HTTP 403 oder 451). Das hat die Verfügbarkeitsprüfung im Hintergrund oder ein Wiedergabeversuch ergeben.</td></tr>
<tr><td><b>🌐</b> (kleines Zeichen in der Kartenecke, „Möglicherweise geogesperrt“)</td><td>Laut Liste sind alle Quellen des Senders eingeschränkt, aber von hier aus noch nicht probiert. Viele solche Streams funktionieren trotzdem – ist einer einmal gestartet, verschwindet das Zeichen.</td></tr>
</table>
<p>Startest du einen gesperrten Stream, sagt der Player das ausdrücklich (nicht nur „nicht verfügbar“). In einem anderen Land oder mit einem VPN dort kann es funktionieren.</p>
<p><b>Filtern:</b> Auf der Seite Durchsuchen kannst du mit der Auswahl <i>Geosperre</i> gesperrte Sender ausblenden oder nur diese anzeigen.</p>
<div class="note">Eine 403-Antwort hat manchmal nicht das Land, sondern einen anderen Grund (z. B. abgelaufenen Zugang) – auch dann erscheint „Geosperre“, weil sich beides von außen nicht unterscheiden lässt.</div>
${go('#/browse?geo=hide', 'Sender ohne Geosperre')}`,
  },
  {
    id: 'stream-info',
    cat: 'watch',
    title: 'Stream-Infos (Qualität, Geschwindigkeit)',
    keywords: 'stream-infos statistik bitrate geschwindigkeit bandbreite auflösung qualität puffer verzögerung verworfene bilder codec netzwerk taste d',
    body: `
<p>Während der Wiedergabe öffnet der Menüpunkt <b>⚙ Qualität und Quelle → 📊 Stream-Infos</b> (oder die Taste <kbd>D</kbd>) ein transparentes Panel, das sich jede Sekunde aktualisiert:</p>
<table class="help-table">
<tr><td><b>Player</b>, <b>Server</b></td><td>Welche Wiedergabe-Engine spielt (hls.js, integriert, Wiedergabebrücke…) und von welchem Server der Stream kommt (🔒: verschlüsselte Verbindung).</td></tr>
<tr><td><b>Auflösung</b>, <b>Codecs</b>, <b>Bitrate</b></td><td>Bildgröße (SD / HD / Full HD / 4K) und Bildrate; die Datenmenge des Streams pro Sekunde. Gibt die Liste sie nicht an, wird sie aus den geladenen Segmenten gemessen („gemessen“).</td></tr>
<tr><td><b>Gemessene Download-Geschwindigkeit</b></td><td>Wie schnell der Server tatsächlich sendet – und das Wievielfache der Bitrate das ist. Unter 1,3× (orange) schaffen es Verbindung oder Server gerade so: Daraus wird Stocken.</td></tr>
<tr><td><b>Puffer</b>, <b>Verzögerung zum Live-Signal</b></td><td>Wie viele Sekunden des Streams schon im Voraus geladen sind (unter 3 s orange) und wie weit er hinter dem Livesignal liegt.</td></tr>
<tr><td><b>Verworfene Bilder</b></td><td>Sind es viele (über 5 %), schafft das Gerät die Dekodierung nicht – eine niedrigere Qualität hilft.</td></tr>
<tr><td><b>Stocken</b></td><td>Wie oft und wie lange das Bild seit Öffnen des Panels stand.</td></tr>
<tr><td><b>Netzwerk</b></td><td>Die Schätzung des Systems zur Verbindung (Typ, Geschwindigkeit, Antwortzeit), sofern es sie verrät.</td></tr>
</table>
<p>Wirkt etwas verdächtig, gibt eine ⚠-Zeile unten im Panel auch einen Rat (z. B. niedrigere Qualität oder andere Quelle).</p>`,
  },
  {
    id: 'trouble-buffering',
    cat: 'trouble',
    title: 'Das Bild stockt oder puffert',
    keywords: 'stocken puffern langsam ruckeln laden qualität internet',
    body: `
<p>Was das Problem ist, zeigt das Panel <b>Stream-Infos</b> (bei der Wiedergabe <kbd>D</kbd>): Ist die gemessene Download-Geschwindigkeit kaum höher als die Bitrate, sind Server oder Verbindung langsam. ${t('stream-info', 'Details')}</p>
<ul>
<li>Stelle eine <b>niedrigere Qualität</b> ein (⚙ → Qualität), vor allem bei mobilem Internet oder schwachem WLAN.</li>
<li>Probiere eine <b>andere Quelle</b> – ein anderer Server kann schneller sein.</li>
<li>Stoppt der Stream, wechselt das Programm von selbst zur nächsten Quelle (wenn die Ersatzquelle eingeschaltet ist): nach <b>10 Sekunden</b>, wenn es noch eine unversuchte Quelle gibt – sonst wartet es 30 Sekunden, ob der Stream von selbst weiterläuft.</li>
<li>Server in fernen Ländern können langsamer sein; das liegt nicht am Programm.</li>
<li>Die automatische Verfügbarkeitsprüfung im Hintergrund pausiert bei der Wiedergabe von selbst. Ein von Hand gestartetes <i>Alle Streams prüfen</i> läuft dagegen weiter – das solltest du während der Wiedergabe stoppen.</li>
</ul>
<p>Livestreams startet der Player etwa 4 Segmente (typisch 20–30 s) hinter dem Livesignal: So gibt es Reserve, wenn der Server kurz langsamer wird – das neueste, noch entstehende Segment liefern viele Server nur langsam.</p>`,
  },
  {
    id: 'trouble-epg',
    cat: 'trouble',
    title: 'Keine Programmdaten für einen Sender',
    keywords: 'kein programm tv-programm leer epg fehlt zuordnung',
    body: `
<p>Die öffentlichen TV-Programmquellen decken nur einen Teil der Sender ab – vor allem die der Länder mit integrierter Quelle und die größeren internationalen Sender. Was du tun kannst:</p>
<ul>
<li>Schalte die Quelle für das Land des Senders ein: Einstellungen → TV-Programm (z. B. Deutschland, Vereinigtes Königreich, Pluto TV). ${t('epg-sources', 'Quellen')}</li>
<li>Füge eine eigene XMLTV-Quelle hinzu, wenn du eine kennst, die den Sender enthält.</li>
<li>Sieh in der Zeile der Quelle nach, wie viele Sender sie zugeordnet hat und ob sie einen Fehler meldet.</li>
<li>Aktualisiere das TV-Programm (<i>TV-Programm jetzt aktualisieren</i>).</li>
</ul>
<p>Die Zuordnung erfolgt über ID und Namen des Senders; führt eine Quelle den Sender unter einem ganz anderen Namen, kann sie ihn nicht verbinden.</p>`,
  },
  {
    id: 'trouble-list',
    cat: 'trouble',
    title: 'Die Senderliste lädt nicht / langsamer Start',
    keywords: 'lädt nicht laden fehler langsamer start internet erneut versuchen download',
    body: `
<ul>
<li>Prüfe die Internetverbindung und drücke dann <b>Erneut versuchen</b>.</li>
<li>Schlägt der Download fehl, nutzt das Programm die zuvor geladene (ältere) Liste, falls vorhanden.</li>
<li>Der erste Start kann 20–40 Sekunden dauern; spätere sind dank der gespeicherten Liste schnell.</li>
<li>Hast du die Hauptliste ersetzt und sie funktioniert nicht: Einstellungen → Senderlisten → <i>Standard (iptv-org)</i>.</li>
<li>In einem seltsamen, „hängenden“ Zustand: Einstellungen → Profile und Sicherung → <b>Cache leeren</b>, dann das Programm neu starten.</li>
</ul>`,
  },
  {
    id: 'trouble-browser',
    cat: 'trouble',
    title: 'Im Browser geöffnet funktioniert es nicht',
    keywords: 'browser chrome firefox cors index.html web',
    body: `
<p>Die Oberfläche von Adás (<code>src/index.html</code>) lässt sich auch in einem normalen Browser öffnen, aber dort können wegen der Sicherheitsregeln des Browsers (CORS) die meisten Streams und das TV-Programm nicht geladen werden, und auch die Verfügbarkeitsprüfung funktioniert nicht. Dieser Modus dient nur der Entwicklung.</p>
<p>Für den vollen Funktionsumfang nutze die <b>Desktop-App</b> (Windows <code>.exe</code>, macOS <code>.dmg</code>, Linux <code>AppImage</code> / <code>.deb</code>) oder die <b>TV-Version</b>.</p>`,
  },
  {
    id: 'faq',
    cat: 'trouble',
    title: 'Häufige Fragen',
    keywords: 'faq frage legal kostenlos kostenpflichtig warum doppelt verschwunden sender',
    body: `
<h3>Ist es kostenlos? Brauche ich ein Abo?</h3>
<p>Ja, es ist kostenlos. Das Programm sammelt öffentlich und frei verfügbare Streams; Konto und Abo sind nicht nötig.</p>
<h3>Ist es legal?</h3>
<p>iptv-org sammelt nur öffentlich verfügbare, kostenlose Streams und entfernt Sender bei Urheberrechtsbeschwerden. Fügst du eine eigene Liste hinzu, musst du selbst sicherstellen, dass du den Inhalt legal ansehen darfst.</p>
<h3>Warum ist ein Sender verschwunden?</h3>
<p>Er wurde vielleicht aus der Community-Liste entfernt (eingestellt, Adresse geändert oder aus rechtlichen Gründen). Kennst du seine Adresse, kannst du ihn als eigenen Sender hinzufügen. ${t('custom-channels', 'Wie?')}</p>
<h3>Warum erscheint ein Sender doppelt?</h3>
<p>Enthält eine eigene Liste denselben Sender wie die Hauptliste, erscheinen beide (der Name der eigenen Liste steht auf der Detailseite).</p>
<h3>Warum hat ein Sender keine Sendernummer?</h3>
<p>Sendernummern bekommen die Favoriten und die Sender des Heimatlandes. Markiere ihn als Favorit und schiebe ihn auf der Seite Favoriten an die gewünschte Stelle.</p>
<h3>Kann ich Sendungen aufnehmen?</h3>
<p>Ja, in der Desktop-Version. ${t('recording', 'Aufnahme')}</p>
<h3>Wo sind meine Daten?</h3>
<p>${t('privacy', 'Daten und Datenschutz')}</p>`,
  },

  // ===================================================================== Extras
  {
    id: 'timeshift',
    cat: 'watch',
    title: 'Live-TV anhalten und zurückspulen',
    keywords: 'timeshift zeitversetzt pause zurückspulen live puffer zu live springen dvr',
    body: `
<p>Bei Livestreams <b>behält der Player den bereits geladenen Stream</b> (bis zu etwa 30 Minuten, je nach Speicher), daher:</p>
<ul>
<li><b>Pause</b>: Der Stream lädt währenddessen weiter, beim Fortsetzen siehst du ab der Stelle, an der du angehalten hast.</li>
<li><b>Zurückspulen</b>: mit den Tasten <b>30</b> der Steuerleiste, mit <kbd>Umschalt</kbd>+<kbd>←</kbd>/<kbd>→</kbd>, mit den Tasten ◀◀ / ▶▶ der Fernbedienung in 30-Sekunden-Schritten oder durch Ziehen auf der <b>Zeitleiste</b>.</li>
<li><b>Zu live springen</b>: Bist du zurück, erscheinen links auf der Zeitleiste die Taste <i>Zu live springen</i> und der Rückstand (z. B. −2:15); die Kennzeichnung <b>LIVE</b> oben rechts ist dann grau. Auf der Tastatur: <kbd>Ende</kbd>.</li>
</ul>
<p>Zurückspulen geht nur so weit, wie der Player den Stream schon geladen hat – beim Umschalten ist der Puffer leer und wächst Minute für Minute.</p>
<div class="note">Der integrierte Player eines Fernsehers (webOS) entscheidet selbst, wie viel er speichert; dort kann das Zurückspulen je nach Sender kürzer sein oder fehlen.</div>`,
  },
  {
    id: 'sportwatch',
    cat: 'watch',
    title: 'Sport-Tracker',
    keywords: 'sport sport-tracker liga team spiel ergebnis fußball tennis handball wasserball formel 1 discgolf world chase tag schach darts e-sport kalender ics thesportsdb espn sender',
    body: `
<p>Der Sport-Tracker dient dazu, jede Sportart, Liga, jedes Team oder jeden Wettbewerb zu verfolgen; das Element <b>Sport</b> der Startseite zeigt deren Live-, aktuelle und kommende Ereignisse. Öffnen: <i>Sport-Tracker ›</i> im Kopf des Elements Sport oder Einstellungen → Startseite → <i>Sport-Tracker öffnen</i>.</p>
<p>Die Tabs des Fensters:</p>
<table class="help-table">
<tr><td><b>Gefolgt</b></td><td>Alles, was du verfolgst, nach Sportart gruppiert. Einzeln ein-/ausschaltbar oder löschbar.</td></tr>
<tr><td><b>Ligen</b></td><td>Über 350 Ligen und Turniere in 17 Sportarten (Fußball, Basketball, Eishockey, Tennis, Golf, Formel 1, MMA, Rugby, Cricket, Volleyball…) – mit Suche und Sportartfilter. Verfolge die ganze Liga oder mit <i>Team…</i> nur die Spiele eines Teams. Quelle: ESPN (ohne Schlüssel, mit Ergebnissen).</td></tr>
<tr><td><b>Sport im Fernsehen</b></td><td><b>Jede</b> Sportart oder jedes Spiel anhand des TV-Programms: Handball, Wasserball, Discgolf, World Chase Tag, Schach, Darts, Snooker, E-Sport, Reiten… Ein Klick auf die Kachel der Sportart oder ein eigenes Stichwort (z. B. <i>FC Bayern</i>, <i>Tour de France</i>, <i>Wimbledon</i>). Diese suchen im Programm der sichtbaren Sender und liefern so immer eine ansehbare Übertragung.</td></tr>
<tr><td><b>Kalender</b></td><td>Jeder Wettkampf- oder Spielplankalender (.ics-/webcal-Adresse), den ein Verband, Verein oder eine Webseite veröffentlicht – z. B. Discgolf-Turniere, lokale Ligen.</td></tr>
<tr><td><b>Einstellungen</b></td><td>Wie viele Tage zurück und voraus Ereignisse angezeigt werden; Sendervorschlag an/aus; optionaler TheSportsDB-Schlüssel (weitere Ligen).</td></tr>
</table>
<h2>Sendervorschlag</h2>
<p>Für jedes Ereignis sucht das Programm im TV-Programm, auf welchem Sender es läuft (anhand von Teamnamen, Liga und Sportart, auf die Uhrzeit abgestimmt), und in der Zeile erscheint eine Taste <b>📺 Sender</b> – ein Klick startet den Stream. Unsichere Treffer sind blasser. Infrage kommen nur nicht ausgeblendete Sender mit TV-Programm; Favoriten und Sportsender werden bevorzugt.</p>
<div class="note">Die Ergebnisse werden etwa alle 5 Minuten aktualisiert. Lässt sich eine Liga nicht laden, zeigt das Element Sport es unten an.</div>`,
  },
  {
    id: 'multiview',
    cat: 'watch',
    title: 'Mehrere Streams gleichzeitig',
    keywords: 'mehrere streams mehrfachansicht geteilter bildschirm 2 4 fenster sport nachrichten gleichzeitig',
    body: `
<p>Du kannst zwei oder vier Sender gleichzeitig sehen – z. B. mehrere Sportübertragungen oder Nachrichtensendungen. Öffnen: die Taste <b>▦</b> des Players (oder <kbd>V</kbd>) bzw. <i>Mehrere Streams gleichzeitig</i> im Profilmenü.</p>
<ul>
<li>Das <b>ausgewählte</b> Fenster (mit farbigem Rahmen) hat Ton, die übrigen laufen stumm. Wechseln: Pfeile, <kbd>1</kbd>–<kbd>4</kbd> oder Klick.</li>
<li><kbd>OK</kbd> / ⇄: anderer Sender ins Fenster (mit Suche), ✕: Fenster leeren.</li>
<li><kbd>F</kbd>, Doppelklick oder ⤢: der ausgewählte Sender im Vollbild; von dort wechselst du mit auf/ab zwischen den Sendern der Mehrfachansicht.</li>
<li>Die Startsender: der, aus dem du gestartet hast, dann deine Favoriten.</li>
</ul>
<div class="note">Vier Streams gleichzeitig brauchen viel Bandbreite und Rechenleistung. Auf dem Fernseher sind höchstens zwei Fenster verfügbar.</div>`,
  },
  {
    id: 'cast',
    cat: 'watch',
    title: 'Auf den Fernseher übertragen (Chromecast, DLNA)',
    keywords: 'übertragen cast chromecast dlna upnp fernseher smart tv google tv auf anderem gerät abspielen',
    body: `
<p>Aus der Desktop-Version kannst du den Stream oder Film an einen <b>Chromecast</b>, Google TV oder einen <b>DLNA-fähigen</b> Smart-TV bzw. Mediaplayer senden. Klicke in der Steuerleiste des Players auf das Übertragen-Symbol, und das Programm sucht Geräte im lokalen Netzwerk.</p>
<ul>
<li>Beim Übertragen bleiben die Bedienelemente am Computer: Pause / weiter, Senderwechsel (auf/ab), Lautstärke, Stopp. Ein Film läuft auf dem Fernseher dort weiter, wo er hier war.</li>
<li>Nach <b>Übertragung beenden</b> geht die Wiedergabe am Computer weiter.</li>
<li>Dieser Computer leitet den Stream an den Fernseher weiter (so funktionieren auch Streams mit besonderen Headern oder CORS) – er muss daher während der Übertragung eingeschaltet und im selben Netzwerk bleiben.</li>
</ul>
<h2>Wenn kein Gerät gefunden wird</h2>
<ul>
<li>Bei der ersten Nutzung fragt die <b>Windows-Firewall</b> nach einer Erlaubnis – erlaube es im <i>privaten Netzwerk</i>.</li>
<li>Computer und Fernseher müssen im selben WLAN / am selben Router sein (Gastnetze sind meist isoliert).</li>
<li>Für DLNA muss am Fernseher die Medienfreigabe / ein „DLNA-Renderer“ eingeschaltet sein (LG: <i>Einstellungen → Allgemein → Geräte → Bildschirmfreigabe / DLNA</i>).</li>
</ul>
<div class="note">Nicht jedes Gerät spielt jedes Format: Chromecast kommt mit HLS und MP4 gut zurecht, viele DLNA-Fernseher aber nur mit MP4 oder MPEG-TS. Meldet das Gerät einen Fehler, probiere eine andere Quelle (⚙ → Quelle).</div>`,
  },
  {
    id: 'night-audio',
    cat: 'watch',
    title: 'Nachtmodus-Ton',
    keywords: 'nachtmodus ton leise kompressor dialog sprache verständlichkeit laute werbung dynamik',
    body: `
<p>Der <b>Nachtmodus-Ton</b> dämpft laute Stellen (Musik, Explosionen, Werbung) und hebt leise Dialoge hervor – damit es auch leise verständlich ist und niemand aufwacht.</p>
<ul>
<li>Einschalten bei der Wiedergabe: Taste <b>CC</b> → <i>Ton und Untertitel</i> → <i>Nachtmodus-Ton</i>.</li>
<li>Pro Profil als Standard festlegen: Einstellungen → Untertitel und Informationen → Infos und Untertitel auf Deutsch → <i>Nachtmodus-Ton</i>.</li>
</ul>
<div class="note">In der Desktop-Version verfügbar.</div>`,
  },
  {
    id: 'parental',
    cat: 'personal',
    title: 'Jugendschutz und Profilsperre (PIN)',
    keywords: 'pin profilsperre jugendschutz kindersicherung passwort code kinderprofil verlassen',
    body: `
<p>Für jedes Profil kannst du eine <b>4-stellige PIN</b> festlegen: Profile verwalten → Profil bearbeiten → <i>Profilsperre (PIN)</i>. Ein gesperrtes Profil trägt auf dem Bildschirm „Wer schaut?“ ein 🔒 und öffnet sich nur mit der PIN.</p>
<h2>Kinderprofil</h2>
<p>Hat mindestens ein <b>Erwachsenenprofil eine PIN</b>, dann gilt im Kinderprofil:</p>
<ul>
<li>Wechsel zu einem anderen Profil nur mit der PIN,</li>
<li><b>Einstellungen</b> und <b>Profile verwalten</b> öffnen sich nur mit einer Erwachsenen-PIN (die Freigabe gilt 10 Minuten),</li>
<li>Erwachseneninhalte und nicht kindgerechte Sender erscheinen weiterhin nicht.</li>
</ul>
<p>Die PIN lässt sich mit den Zifferntasten der Fernbedienung oder dem Ziffernblock auf dem Bildschirm eingeben. Nach fünf Fehlversuchen musst du eine halbe Minute warten.</p>
<h2>PIN vergessen</h2>
<p>Aus einem anderen Erwachsenenprofil (Profile verwalten) lässt sich die PIN jedes Profils löschen. Gibt es kein solches Profil, setzt das Löschen der App-Daten alles zurück. ${t('privacy', 'Wo sind die Daten?')}</p>
<div class="note">Die PIN schützt auf diesem Gerät vor Kindern; sie ist keine Verschlüsselung.</div>`,
  },
  {
    id: 'continue',
    cat: 'vod',
    title: 'Weiterschauen (VOD)',
    keywords: 'weiterschauen angefangen film folge serie startseite zeile',
    body: `
<p>Die Zeile <b>Weiterschauen</b> der VOD-Seite zeigt deine angefangenen Filme und Serienfolgen an einem Ort – aus den integrierten und eigenen Film- und Serienlisten sowie aus der eigenen Mediathek. (Die TV-Startseite hat keine solche Zeile: Dort gibt es nur Sender.) Das zuletzt Gesehene steht vorn.</p>
<p>Bei einer Serie führt die Karte zur Folge, bei der du bist (oder zur nächsten, wenn du die vorige beendet hast). </p>`,
  },
  {
    id: 'stats',
    cat: 'personal',
    title: 'Sehstatistik',
    keywords: 'statistik sehzeit wie viel fernsehen lieblingssender diagramm stunde tag',
    body: `
<p>Der Punkt <i>Sehstatistik</i> im Profilmenü zeigt, wie viel und wann du fernsiehst: heute, in der letzten Woche und im letzten Monat, nach Tagen, nach Tageszeit; die meistgesehenen Sender, Kategorien, Filme und Serien.</p>
<ul>
<li>Pro Profil getrennt gezählt, nur die tatsächlich abgespielte Zeit (ohne Pausen).</li>
<li>Die Daten werden nur auf diesem Gerät gespeichert. Auf der Statistikseite lässt sich die Erfassung abschalten und löschen.</li>
</ul>
${go('#/stats', 'Statistik öffnen')}`,
  },
  {
    id: 'transfer',
    cat: 'personal',
    title: 'Synchronisierung zwischen Geräten (per Code)',
    keywords: 'übertragung weitergabe an fernseher einstellungen kopieren code adresse sync synchronisieren export import tv android handy desktop',
    body: `
<p>Zwischen Desktop-PC, Android TV und Android-Handy kannst du die Einstellungen (Listen, Profile, Favoriten, Verlauf, Erinnerungen, Startseite) per Code im lokalen Netzwerk übertragen – in jede Richtung:</p>
<ol>
<li>Auf dem Gerät, <b>dessen Einstellungen du übernehmen willst</b>: Einstellungen → <i>Synchronisierung zwischen Geräten</i> → <b>Code anfordern</b>. Ein 12-stelliger Code erscheint (z. B. <code>123 456 789 012</code>). Auf Wunsch gehen auch Schlüssel und Passwörter mit.</li>
<li>Auf dem <b>anderen Gerät</b>: an derselben Stelle den Code ins Feld <i>Mit Code synchronisieren</i> eingeben, dann <b>Synchronisieren</b>. Das Gerät findet das codegebende Gerät im Netzwerk selbst und übernimmt seine Einstellungen (nach Bestätigung).</li>
</ol>
<p>Die Einstellungen werden verschlüsselt übertragen: Der Code (und damit der Schlüssel) wandert nie durchs Netzwerk, nur eine daraus berechnete Kennung. Der Code gilt 15 Minuten; nach 10 Fehlversuchen stoppt er, dann fordere einen neuen an. Beide Geräte müssen im selben (Heim-)Netzwerk sein; die Windows-Firewall fragt beim ersten Mal eventuell nach einer Erlaubnis – erlaube es im privaten Netzwerk.</p>
<p><b>Nur Profile</b>: Die aktuellen Einstellungen und Listen bleiben, eingehende Profile werden hinzugefügt (vorhandene aktualisiert).</p>
<p>Unter <i>Erweitert</i> kannst du auch die Adresse des anderen Geräts angeben (wenn es in einem anderen Subnetz ist) oder die Einstellungen von einer Webadresse laden (z. B. eine auf das NAS hochgeladene Sicherung) – dann gib die vollständige Adresse ohne Code ein.</p>
${go('#/settings?section=transfer', 'Synchronisierung zwischen Geräten')}`,
  },
  {
    id: 'remote',
    cat: 'personal',
    title: 'Fernbedienung per Handy',
    keywords: 'fernbedienung handy mobil browser steuerung pin qr code netzwerk senderwechsel lautstärke touchpad suche',
    body: `
<p>Die Desktop-App und die Android-(TV-)Version lassen sich auch vom Handy aus steuern – oder aus dem Browser jedes Geräts – im selben (Heim-)Netzwerk:</p>
<ol>
<li>Am schnellsten: die Taste <b>Fernbedienung</b> oben auf der <b>Startseite</b> (neben Anpassen) – sie schaltet die Fernbedienung ein und zeigt den QR-Code in einem kleinen Fenster. Oder: Einstellungen → Fernbedienung und Tasten → <b>Fernbedienung per Handy</b> → einschalten. Es erscheinen ein <b>QR-Code</b>, eine Adresse (z. B. <code>http://192.168.1.20:47800/adas/remote</code>) und eine 4-stellige PIN.</li>
<li>Scanne den QR-Code mit der Handykamera: Die Steuerung öffnet sich und erhält auch einen geheimen Schlüssel – das ist am sichersten, weil der Schlüssel nie durchs Netzwerk wandert; das Handy signiert jeden Befehl damit. (Oder öffne die Adresse im Browser und gib die PIN ein – das Handy merkt sie sich.) Tipp: Lege die Seite auf den Startbildschirm, dann startet sie wie eine App.</li>
</ol>
<p>Oben siehst du immer, was gerade läuft (mit Logo, Fortschritt der Sendung und der nächsten Sendung). Die Steuerung hat drei Tabs:</p>
<table class="help-table">
<tr><td><b>🎮 Steuerung</b></td><td>Ein <b>Touchpad</b> in zwei Modi (darüber umschaltbar, das Handy merkt es sich): <b>🖱 Maus</b> – Ziehen bewegt einen Mauszeiger auf dem Bildschirm von Computer / Fernseher (langsame Bewegung = genau, schnelle = große Sprünge), Tippen = Klick, <b>mit zwei Fingern ziehen zum Scrollen</b> (in der Zeile unter dem Zeiger auch waagerecht), und das Element unter dem Zeiger wird ausgewählt; <b>✥ Pfeile</b> – Ziehen bewegt die Auswahl (wie die Pfeiltasten), Tippen = OK. In beiden: lange drücken = Zurück. Bei Fernbedienungsnutzung ist der Auswahlrahmen immer zu sehen. Darunter: Zurück, Start, Details; Spulen (±10 / ±30 s – bei Livestreams zeitversetzt); Pause; CH ▲ / ▼, vorheriger Sender, Stumm, <b>Lautstärkeregler</b>; Untertitel, Qualität, Senderliste, Vollbild; Pfeile und Sendernummer.</td></tr>
<tr><td><b>📺 Sender</b></td><td>Eine <b>Suche</b> über alle Sender (filtert beim Tippen, zeigt auch die laufende Sendung), deine Favoriten und zuletzt gesehenen Sender – sie starten mit einem Tippen.</td></tr>
<tr><td><b>☰ Mehr</b></td><td>Zu jeder Seite springen (TV, TV-Programm, Favoriten, VOD, Aufnahmen, Durchsuchen, Hilfe); <b>Text senden</b> (tippt mit der Handytastatur ins ausgewählte Feld oder startet eine Suche); Stream-Infos, Mehrere Streams gleichzeitig, Sleep-Timer.</td></tr>
</table>
<div class="note">PIN und Schlüssel des QR-Codes lassen sich jederzeit neu erzeugen (Neue PIN) – ein altes Handy muss den QR-Code dann neu scannen (oder die neue PIN eingeben). Mit falscher PIN funktioniert die Steuerung nicht; nach vielen Fehlversuchen von einem Gerät wird dieses Gerät für 10 Minuten gesperrt (andere Handys funktionieren weiter).</div>
${go('#/settings?section=remote', 'Fernbedienung per Handy')}`,
  },
  {
    id: 'recording',
    cat: 'watch',
    title: 'Aufnahme',
    keywords: 'aufnahme aufnehmen speichern planen video ts schneiden puffer anfang ende',
    body: `
<p>In der Desktop-Version (Windows, Mac, Linux) lässt sich Live-TV aufnehmen – ohne Neukodierung, in Originalqualität, in eine <code>.ts</code>-Datei im Ordner <b>Videos / Adás-Aufnahmen</b>.</p>
<ul>
<li><b>Sofort</b>: bei der Wiedergabe mit der roten <b>●</b>-Taste der Steuerleiste; erneut drücken stoppt. Die Taste blinkt währenddessen.</li>
<li><b>Geplant</b>: im TV-Programm auf der Detailseite einer Sendung <b>● Aufnehmen</b>. Die Aufnahme beginnt und endet mit <b>Puffer</b> – standardmäßig 3 Minuten vor und 10 Minuten nach der Sendung, weil sich das Fernsehen oft verschiebt (Einstellungen → Aufnahmen). Adás muss dann laufen (im Infobereich versteckt genügt – Einstellungen → Benachrichtigungen → Im Hintergrund laufen); auch der Start aus dem Infobereich ist pünktlich.</li>
<li><b>Bricht</b> der Stream während der Aufnahme <b>ab</b> (z. B. hakender Server), läuft die Aufnahme nach einigen Sekunden von selbst in dieselbe Datei weiter – am Ende zeigt die Meldung „Aufnahme fertig“, wie oft sie unterbrochen wurde.</li>
</ul>
<h2>Schneiden</h2>
<p>Die Taste <b>✂</b> auf der Karte einer Aufnahme öffnet den Schnitteditor: Vorschau, Zeitleiste (gelbe Marken: Beginn und Ende der Sendung laut TV-Programm), Schritte (±1 s / ±10 s / ±1 Min.), <b>⇤ Anfang hier</b> und <b>Ende hier ⇥</b> (oder die Tasten <kbd>I</kbd> / <kbd>O</kbd>), die Zeiten lassen sich auch eintippen; die Taste <b>Laut TV-Programm markieren</b> setzt sie in einem Schritt. Nach <b>✂ Schneiden und speichern</b> tritt die geschnittene Fassung an die Stelle der Aufnahme – diese spielt Adás ab, und diese öffnet auch der externe Player.</p>
<p>Das <b>Original bleibt erhalten</b> (es erscheint nicht als eigene Aufnahme): Öffnest du den Schnitteditor erneut, schneidest du neu aus dem Original (mit der vorigen Auswahl), oder du holst mit <b>Original wiederherstellen</b> die vollständige Aufnahme zurück. Die Karte einer geschnittenen Aufnahme zeigt neben dem ✂ einen Haken. Beim Löschen kommen beide in den Papierkorb.</p>
<p>Die Aufnahmen sind im Tab <b>TV → Aufnahmen</b> (mit Senderlogo, Datum, Größe; begonnene mit Fortschrittsbalken). <b>▶ Abspielen</b> startet die Aufnahme im eigenen Player von Adás – spulbar, und eine angefangene Aufnahme geht dort weiter, wo du aufgehört hast. Die Taste <b>⧉</b> öffnet sie im Videoplayer des Computers (z. B. VLC), <b>✕</b> verschiebt sie in den Papierkorb. Hier siehst du auch laufende und geplante Aufnahmen; die letzten stehen auch unter Einstellungen → Aufnahmen.</p>
<div class="note">Nur für das eigene Ansehen zu Hause: Die Rechte an aufgenommenen Sendungen liegen bei den Sendern. Manche (verschlüsselte oder DRM-geschützte) Streams lassen sich nicht aufnehmen.</div>
${go('#/recordings', 'Aufnahmen')}`,
  },
  {
    id: 'adaspack',
    cat: 'lists',
    title: 'Zusatzpakete (.adaspack)',
    keywords: 'zusatzpaket adaspack adaspak tv vod liste integriert ki erstellen paketordner',
    body: `
<p>Ein Zusatzpaket ist <b>eine in eine Datei gepackte Wiedergabeliste</b> mit Namen und Beschreibung. Es erscheint <b>bei den integrierten Listen</b> (ein- und ausschaltbar), kommt aber nicht mit dem Programm – es ist nur auf dem Gerät vorhanden, auf das du es lädst.</p>
<table class="help-table">
<tr><td><code>etwas_tv.adaspack</code></td><td><b>TV-Sender</b> – Einstellungen → Senderlisten → Integrierte Listen.</td></tr>
<tr><td><code>etwas_vod.adaspack</code></td><td><b>Filme, Serien</b> – Einstellungen → VOD und Mediathek → VOD-Listen → Integrierte Listen.</td></tr>
</table>
<h2>Laden</h2>
<ul>
<li>Taste <b>Zusatzpaket laden</b> (Senderlisten oder VOD-Listen) – das Paket entscheidet selbst, wohin es kommt. Akzeptiert werden die Endungen <code>.adaspack</code> und <code>.adaspak</code>, <b>in jeder Version</b> (Desktop, Android-Handy und -TV, Browser, LG webOS).</li>
<li><b>Von Webadresse laden</b> – z. B. von GitHub (auch eine Seitenadresse <code>github.com/…/blob/…</code> ist in Ordnung) oder vom NAS. Auf dem Fernseher, wo es keine Dateiauswahl gibt, ist das am einfachsten.</li>
<li>Desktop-Version: Der Inhalt des <b>Paketordners</b> (Unterordner <code>packs</code> des Benutzerdatenordners) wird beim Start automatisch geladen und bei Dateiänderungen aktualisiert.</li>
<li>Sicherung und Übertragung zwischen Geräten nehmen die Pakete mit (z. B. vom Computer aufs Handy).</li>
<li>Erneutes Laden eines Pakets mit derselben ID aktualisiert das alte; <b>Entfernen</b> löscht es nur von diesem Gerät.</li>
</ul>
<h2>Aufbau</h2>
<p>UTF-8-JSON: <code>{ "adasPack": 1, "kind": "tv" | "vod", "id": "beispiel", "name": "Beispiel", "desc": "…", "off": false, "text": "#EXTM3U\\n…" }</code> – <code>text</code> ist die vollständige M3U-Liste. Für TV empfiehlt sich <code>tvg-id</code> (iptv-org-ID: Logo, Land, TV-Programm), für VOD der Filmtitel <code>Titel (Jahr)</code>, der Folgentitel <code>Serie S01E02</code> und die Genreliste <code>adas-tags</code> (die Genrenamen des Programms, die ungarisch sind, z. B. <i>Akció;Dráma</i>).</p>
<h2>Erstellen</h2>
<p>Aus einer fertigen M3U-Liste: <code>node tools/make-pack.mjs liste.m3u8 --kind tv|vod --id beispiel --name "Beispiel"</code>. Auch ein KI-Assistent erstellt eines, anhand einer Webseite, Tabelle oder Dateiliste: Die genaue Formatbeschreibung und eine einfügbare KI-Anweisung stehen im Quellcode (<code>docs/ADASPACK.md</code>).</p>
<button class="btn" data-ext="https://github.com/mesehordo/adas-iptv/blob/main/docs/ADASPACK.md">Vollständige Beschreibung und KI-Anweisung öffnen</button>
<div class="note">Füge nur Inhalte hinzu, die du legal ansehen darfst.</div>`,
  },
  {
    id: 'update',
    cat: 'about',
    title: 'Aktualisierungen',
    keywords: 'aktualisierung update neue version herunterladen installieren github release',
    body: `
<p>Die Desktop-Version (Windows, macOS, Linux) aktualisiert sich selbst von <b>GitHub</b>, aus den offiziellen Versionen (<code>github.com/mesehordo/adas-iptv</code>). Einstellungen → <b>Aktualisierungen</b>:</p>
<ul>
<li><b>Beim Start nach Aktualisierungen suchen</b> (standardmäßig an): Bei jedem Start prüft es, ob es eine neue Version gibt; wenn ja, bekommst du eine Benachrichtigung und kannst sie mit der Taste <i>Aktualisieren</i> sofort installieren. Willst du das nicht, schalte es aus – dann sucht es nur auf Anforderung.</li>
<li><b>Jetzt nach Aktualisierungen suchen</b>: sofortige Suche; bei einer neuen Version erscheinen die Versionshinweise und die Taste <b>Herunterladen und installieren</b>.</li>
<li>Die Installation richtet sich nach der Installationsart: mit dem Installationsprogramm (Setup) installiert, startet das neue Installationsprogramm; per MSI installiert, das neue MSI; bei der <b>portablen</b> Version findest du die heruntergeladene Datei im sich öffnenden Ordner (starte sie statt der alten); unter Linux ersetzt sich das AppImage selbst.</li>
<li><b>Aktualisierungsquelle</b>: leer bedeutet die offiziellen Versionen. Du kannst ein eigenes GitHub-Repository (<code>besitzer/repo</code>) oder die Adresse einer JSON-Datei angeben: <code>{ "version": "1.25.0", "url": "https://…/Adas-Setup-1.25.0.exe", "notes": "…" }</code>.</li>
</ul>
<div class="note">Die Android-Version aktualisierst du, indem du die neue <code>.apk</code> von der GitHub-Versionsseite installierst (deine Einstellungen bleiben erhalten).</div>
${go('#/settings?section=update', 'Aktualisierungen')}`,
  },

  // ===================================================================== Sonstiges
  {
    id: 'privacy',
    cat: 'about',
    title: 'Daten und Datenschutz',
    keywords: 'datenschutz daten speicherung wo tracking konto ordner',
    body: `
<ul>
<li>Kein Konto, keine Registrierung, kein Tracking, und das Programm sendet keine Daten über deine Nutzung irgendwohin.</li>
<li>Alle Einstellungen, Profile und heruntergeladenen Listen werden <b>lokal</b> gespeichert:
  <ul>
  <li>Windows: <code>%APPDATA%\\Adás</code></li>
  <li>macOS: <code>~/Library/Application Support/Adás</code></li>
  <li>Linux: <code>~/.config/Adás</code></li>
  <li>Auf dem Fernseher und unter Android: im eigenen Speicher der App.</li>
  </ul> ${t('backup', 'Sicherung und Umzug')}</li>
<li>Das Programm verbindet sich mit folgenden Servern: iptv-org (Senderliste und Daten), den eingeschalteten TV-Programmquellen, den Adressen deiner eigenen Listen, den Servern der Senderlogos und bei der Wiedergabe den Servern der Streams selbst. Wie jede Webseite können diese deine IP-Adresse sehen.</li>
<li>Beim Übertragen und bei der Weitergabe der Einstellungen startet die Desktop-Version einen kleinen Server im <b>lokalen Netzwerk</b> (um Port 47800). Das Weiterleiten funktioniert nur mit einem zufälligen, bei jedem Start neuen Schlüssel; die Einstellungen lassen sich nur mit dem 15 Minuten gültigen Code laden.</li>
<li>Sehstatistik, PINs und Einstellungen werden nirgendwohin gesendet.</li>
</ul>`,
  },
  {
    id: 'about',
    cat: 'about',
    title: 'Über und Quellen',
    keywords: 'über version quelle lizenz iptv-org hls.js electron dank',
    body: `
<p><b>Adás</b> – ein Live-TV-Player mit einer Oberfläche im Stil von Streamingdiensten, für Windows, macOS, Linux, Android und LG-webOS-Fernseher. MIT-Lizenz.</p>
<h2>Datenquellen</h2>
<ul>
<li><b>iptv-org/iptv</b> und <b>iptv-org/api</b> – Senderliste, Senderdaten, Logos (Community, öffentlich).</li>
<li>TV-Programm: <b>iptv-epg.org</b>, <b>epgshare01.online</b>, <b>i.mjh.nz</b> sowie die eigene Quelle der Wiedergabeliste.</li>
<li>Integrierte Listen: <b>Free-TV/IPTV</b>, <b>BuddyChewChew/app-m3u-generator</b> (Pluto TV, Samsung TV Plus, Plex), <b>freecasthub/public-iptv</b>, <b>DragonHall TV</b>.</li>
</ul>
<h2>Verwendete Bibliotheken</h2>
<ul>
<li><b>Electron</b> – Desktop-App,</li>
<li><b>hls.js</b>, <b>mpegts.js</b>, <b>dash.js</b> – Wiedergabe,</li>
<li><b>esbuild</b>, <b>@webos-tools/cli</b> – Erstellung des TV-Pakets.</li>
</ul>
<p>Die Oberflächenstile lassen sich nur vom Aussehen bekannter Dienste und Systeme inspirieren; das Programm steht in keiner Verbindung zu ihnen und nutzt ihre Logos nicht.</p>`,
  },
];
