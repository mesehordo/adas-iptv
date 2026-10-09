// Adás – aide intégrée (français). Même structure que help-content.js (mêmes id et cat) ; chargée par help.js.
// Les textes sont des fragments HTML de confiance livrés avec le programme.

export const HELP_CATEGORIES = [
  { id: 'start', title: 'Premiers pas' },
  { id: 'watch', title: 'Regarder et lire' },
  { id: 'vod', title: 'VOD (films et séries)' },
  { id: 'find', title: 'Rechercher et parcourir' },
  { id: 'guide', title: 'Guide TV et rappels' },
  { id: 'personal', title: 'Personnalisation' },
  { id: 'lists', title: 'Listes de chaînes' },
  { id: 'tv', title: 'Sur TV et Android' },
  { id: 'trouble', title: 'Dépannage' },
  { id: 'about', title: 'Divers' },
];

const go = (href, label) => `<a class="btn small" href="${href}">${label}</a>`;
const t = (id, label) => `<a href="#/help?topic=${id}">${label}</a>`;

export const ARTICLES = [
  // ===================================================================== Premiers pas
  {
    id: 'welcome',
    cat: 'start',
    title: 'Bienvenue dans Adás',
    keywords: 'introduction qu’est-ce que c’est aperçu démarrer',
    body: `
<p class="lead">Adás lit des chaînes de télévision en direct du monde entier, dans une interface semblable à celle des services de streaming. Il télécharge la liste des chaînes depuis la collection publique et communautaire <b>iptv-org</b> : plus de dix mille flux gratuits.</p>
<h2>Les parties de l’interface</h2>
<table class="help-table">
<tr><td><b>Accueil</b></td><td>Vue d’ensemble : météo, programmes de vos chaînes favorites, actualités, programmes de ce soir, reprise TV et VOD. ${t('dashboard', 'Détails')}</td></tr>
<tr><td><b>TV</b></td><td>Quatre onglets : Chaînes, Guide TV, Parcourir et (sur ordinateur) Enregistrements. L’onglet Chaînes contient les chaînes vues récemment, les favoris, ce qui passe en ce moment et des rangées par catégorie. ${t('home', 'Détails')}</td></tr>
<tr><td><b>Guide TV</b> (sous TV)</td><td>Une grille avec frise : ce qui passe maintenant et plus tard sur chaque chaîne. ${t('guide-grid', 'Détails')}</td></tr>
<tr><td><b>Parcourir</b> (sous TV)</td><td>Toutes les chaînes TV, filtrées par catégorie, pays, langue et qualité. ${t('browse', 'Détails')}</td></tr>
<tr><td><b>VOD</b></td><td>Films et séries : listes en ligne et votre médiathèque personnelle, en rangées triées par genres unifiés. ${t('vod-lists', 'Détails')}</td></tr>
<tr><td><b>Favoris</b></td><td>Vos chaînes marquées – leur ordre donne les numéros de chaîne – et en dessous vos films et séries favoris (fiche → ☆ Favori). ${t('favorites', 'Détails')}</td></tr>
<tr><td><b>Recherche</b> (loupe)</td><td>Rechercher des chaînes et des programmes. ${t('search', 'Détails')}</td></tr>
<tr><td><b>Cloche</b></td><td>Vos rappels de programmes. ${t('reminders', 'Détails')}</td></tr>
<tr><td><b>Photo de profil</b></td><td>Changer de profil, actualiser la liste des chaînes, ajouter une chaîne, aide, paramètres.</td></tr>
</table>
<h2>Démarrage rapide en cinq étapes</h2>
<ol>
<li>Choisissez un profil (sur l’écran « Qui regarde ? ») ou créez le vôtre. ${t('profiles', 'Profils')}</li>
<li>Cliquez sur une chaîne de l’accueil : elle démarre aussitôt. ${t('playing', 'Lecture')}</li>
<li>Marquez vos favoris avec le bouton <b>+</b> de la carte. ${t('favorites', 'Favoris')}</li>
<li>Choisissez un style d’interface dans Paramètres → Apparence. ${t('themes', 'Styles')}</li>
<li>S’il manque une chaîne, ajoutez-la comme chaîne personnelle ou liste personnelle. ${t('custom-channels', 'Chaînes personnelles')}</li>
</ol>
<div class="tip"><b>Astuce :</b> l’aide s’ouvre depuis n’importe où avec la touche <kbd>F1</kbd> ou <kbd>?</kbd>, ou avec l’icône point d’interrogation de l’en-tête – toujours sur la rubrique de l’écran en cours.</div>`,
  },
  {
    id: 'first-steps',
    cat: 'start',
    title: 'Le premier démarrage',
    keywords: 'démarrage chargement lent première fois profil pays langue',
    body: `
<p>Au premier démarrage, un court assistant demande la <b>langue de l’interface</b>, crée ensuite votre <b>profil</b> (nom et photo de profil) puis, si vous le souhaitez, un <b>profil enfant</b> (étape facultative). Le programme télécharge ensuite la liste des chaînes et leurs données (pays, langues, logos, catégories – environ 25 Mo au total). Selon votre connexion, cela peut prendre une demi-minute ; ensuite la liste traitée est enregistrée, et les démarrages suivants ne prennent que quelques secondes.</p>
<h2>Que se passe-t-il en arrière-plan ?</h2>
<ol>
<li><b>Liste des chaînes</b> : téléchargement et traitement (actualisation automatique toutes les 6 heures).</li>
<li><b>Guide TV</b> : téléchargement des sources activées (par défaut celles de votre pays d’origine) – cela se fait en arrière-plan, une fois l’interface affichée. ${t('epg-sources', 'Sources')}</li>
<li><b>Vérification de disponibilité</b> : les versions de bureau et TV testent discrètement les flux des chaînes affichées. ${t('health', 'Détails')}</li>
</ol>
<h2>Premiers réglages conseillés</h2>
<ul>
<li><b>Pays d’origine</b> (Paramètres → Contenu et enfants → Contenu) : ses chaînes passent en premier et reçoivent les numéros de chaîne. Il est défini d’après la langue choisie au premier démarrage.</li>
<li><b>Style de l’interface</b> : choisissez parmi seize apparences, par profil. ${t('themes', 'Styles')}</li>
<li><b>Profil enfant</b> : si un enfant utilise aussi l’application, créez-lui un profil séparé. ${t('kids', 'Détails')}</li>
</ul>
${go('#/settings', 'Ouvrir les Paramètres')}`,
  },
  {
    id: 'navigation',
    cat: 'start',
    title: 'Utilisation à la souris, au clavier ou à la télécommande',
    keywords: 'navigation flèches focus souris clavier télécommande entrée retour',
    body: `
<p>Adás se pilote entièrement à la souris, au clavier et avec une télécommande TV.</p>
<h2>À la souris</h2>
<ul>
<li>Clic sur une carte : lecture. Au survol (selon le style) des boutons apparaissent : lecture, favori, détails.</li>
<li>Clic droit sur une carte : la fiche de la chaîne.</li>
<li>Faites défiler les rangées avec les flèches à leurs extrémités, ou horizontalement.</li>
</ul>
<h2>Au clavier / à la télécommande</h2>
<ul>
<li><kbd>←</kbd> <kbd>→</kbd> <kbd>↑</kbd> <kbd>↓</kbd> : déplacer la sélection (cadre blanc) à l’écran. Le programme choisit l’élément le plus proche dans cette direction.</li>
<li><kbd>Entrée</kbd> / OK : lecture, ou appui sur le bouton sélectionné.</li>
<li><kbd>I</kbd> : la fiche de la chaîne sélectionnée. <kbd>F</kbd> : favori oui/non.</li>
<li><kbd>Échap</kbd> / <kbd>Retour arrière</kbd> / Retour : fermer, ou revenir à l’écran précédent.</li>
</ul>
<p>Toutes les touches : ${t('shortcuts', 'Raccourcis clavier')} · Sur TV : ${t('tv-remote', 'Boutons de la télécommande')}</p>`,
  },
  {
    id: 'shortcuts',
    cat: 'start',
    title: 'Raccourcis clavier',
    keywords: 'raccourci touche kbd commande',
    body: `
<h2>Général</h2>
<table class="help-table keys">
<tr><td><kbd>←</kbd> <kbd>→</kbd> <kbd>↑</kbd> <kbd>↓</kbd></td><td>Se déplacer dans l’interface</td></tr>
<tr><td><kbd>Entrée</kbd></td><td>Lire / sélectionner</td></tr>
<tr><td><kbd>I</kbd></td><td>Fiche de la chaîne sélectionnée</td></tr>
<tr><td><kbd>F</kbd></td><td>Favori oui/non (sur une carte)</td></tr>
<tr><td><kbd>Ctrl</kbd>+<kbd>F</kbd> ou <kbd>/</kbd></td><td>Recherche</td></tr>
<tr><td><kbd>F1</kbd> ou <kbd>?</kbd></td><td>Aide de l’écran en cours</td></tr>
<tr><td><kbd>Échap</kbd> / <kbd>Retour arrière</kbd></td><td>Retour, fermer la fenêtre</td></tr>
</table>
<h2>Pendant la lecture</h2>
<table class="help-table keys">
<tr><td><kbd>↑</kbd> / <kbd>↓</kbd>, <kbd>Page préc.</kbd> / <kbd>Page suiv.</kbd></td><td>Chaîne précédente / suivante</td></tr>
<tr><td><kbd>←</kbd> / <kbd>→</kbd></td><td>Volume moins / plus</td></tr>
<tr><td><kbd>0</kbd>–<kbd>9</kbd></td><td>Saisir un numéro de chaîne (bascule après 1,3 s)</td></tr>
<tr><td><kbd>Espace</kbd> / <kbd>K</kbd></td><td>Pause / reprise</td></tr>
<tr><td><kbd>Entrée</kbd> / <kbd>L</kbd></td><td>Panneau de la liste des chaînes</td></tr>
<tr><td><kbd>M</kbd></td><td>Muet</td></tr>
<tr><td><kbd>F</kbd></td><td>Plein écran</td></tr>
<tr><td><kbd>N</kbd></td><td>Mini-lecteur (version de bureau)</td></tr>
<tr><td><kbd>S</kbd></td><td>Favori oui/non</td></tr>
<tr><td><kbd>I</kbd></td><td>Fiche de la chaîne</td></tr>
<tr><td><kbd>Échap</kbd></td><td>Fermer le panneau → quitter le mode mini → quitter le plein écran → fermer le lecteur</td></tr>
</table>`,
  },

  // ===================================================================== Regarder
  {
    id: 'playing',
    cat: 'watch',
    title: 'Lancer la lecture',
    keywords: 'regarder lancer lire source secours connexion',
    body: `
<p>Vous pouvez lancer une chaîne de plusieurs façons :</p>
<ul>
<li>cliquez sur sa carte (ou sélectionnez-la et appuyez sur <kbd>Entrée</kbd>),</li>
<li>avec le bouton <b>Lire</b> de sa fiche, ou le bouton ▶ d’une source de flux précise,</li>
<li>dans le guide TV en cliquant sur le nom de la chaîne, ou avec le bouton <b>Regarder maintenant</b> d’un programme en cours,</li>
<li>dans le lecteur, depuis la liste des chaînes, avec les boutons haut/bas ou en saisissant le numéro de chaîne.</li>
</ul>
<h2>Que se passe-t-il au lancement ?</h2>
<p>Une chaîne peut avoir plusieurs <b>sources de flux</b> (qualité, région ou serveur différents). Le programme commence par celle qu’il juge la meilleure : il privilégie celle qui a déjà fonctionné et la meilleure qualité, et relègue les sources à restriction géographique ou qui ne diffusent pas 24h/24.</p>
<p>Si la source ne démarre pas en 20 secondes, ou se bloque pendant la lecture, le programme essaie de lui-même la source suivante (« Essai d’une autre source 2/3… »). S’il reste une source non essayée, il bascule dès 10 secondes sur un flux bloqué (sinon il attend 30 secondes). Désactivable : Paramètres → Lecture → <i>Source de secours automatique</i>.</p>
<h2>Chaîne précédente, volume par chaîne, style des sous-titres</h2>
<p>La touche <kbd>R</kbd> (ou le bouton ↺ de la barre de contrôle, le bouton <i>Précédente</i> de la télécommande sur téléphone) revient à la chaîne regardée juste avant. Dans Paramètres → Lecture, vous pouvez activer <b>Volume par chaîne</b> : chaque chaîne mémorise son propre volume. On y règle aussi la taille, la couleur (blanc, jaune, bleu clair) et le fond (bandeau sombre, ombre, aucun) des sous-titres.</p>
<p>Si aucune source ne fonctionne, la fenêtre <b>« Ce flux n’est pas disponible pour le moment »</b> apparaît : vous pouvez réessayer, passer à la chaîne suivante ou revenir en arrière. ${t('trouble-playback', 'Que faire dans ce cas ?')}</p>`,
  },
  {
    id: 'player-controls',
    cat: 'watch',
    title: 'Les commandes du lecteur',
    keywords: 'lecteur boutons commandes volume plein écran direct',
    body: `
<p>Les commandes apparaissent quand vous bougez la souris ou appuyez sur un bouton, et disparaissent après 3,5 secondes d’inactivité.</p>
<h2>En haut</h2>
<ul>
<li><b>← Retour</b> : fermer le lecteur.</li>
<li>Le logo, le <b>numéro de chaîne</b>, le nom et le pays de la chaîne et – si vous l’avez lancée depuis une rangée – le nom de la rangée.</li>
<li>Le badge <b>DIRECT</b>.</li>
</ul>
<h2>En bas</h2>
<ul>
<li><b>MAINTENANT</b> : titre, horaire et barre de progression du programme en cours ; en dessous le programme suivant (s’il y a un guide TV).</li>
<li>▶/❚❚ <b>Pause</b> – sur un direct, la reprise se fait là où en est la mémoire tampon.</li>
<li>⌃ ⌄ <b>Chaîne précédente / suivante</b>. ${t('channel-switching', 'Comment l’ordre est-il décidé ?')}</li>
<li>🔊 <b>Volume</b> et muet (le volume est conservé pour le prochain lancement).</li>
<li>＋/✓ <b>Favori</b>, ⓘ <b>Fiche</b>.</li>
<li>☾ <b>Minuterie de mise en veille</b>. ${t('sleep', 'Détails')}</li>
<li><b>CC</b> – <b>Audio et sous-titres</b> : choix de la piste audio et des sous-titres (<kbd>C</kbd>). ${t('audio-subs', 'Détails')}</li>
<li>⚙ <b>Qualité et source</b>. ${t('quality', 'Détails')} Le panneau <b>📊 Infos du flux</b> s’y trouve aussi (<kbd>D</kbd>) : résolution, débit, vitesse de téléchargement, mémoire tampon. ${t('stream-info', 'Détails')}</li>
<li>☰ <b>Panneau de la liste des chaînes</b> à droite, avec filtre.</li>
<li>↺30 / ↻30 <b>Retour et avance</b> dans le direct, <b>Aller au direct</b>. ${t('timeshift', 'Détails')}</li>
<li>▦ <b>Plusieurs flux à la fois</b>. ${t('multiview', 'Détails')}</li>
<li><b>Caster</b> vers un Chromecast ou une TV DLNA (version de bureau). ${t('cast', 'Détails')}</li>
<li><b>Mini-lecteur</b>, <b>Plein écran</b> ; les boutons supplémentaires peuvent être masqués un par un. ${t('pip-mini', 'Détails')}</li>
</ul>
<div class="tip">Double-clic sur l’image : plein écran (en mode mini : retour à la taille normale). Un clic sur l’image : pause / reprise.</div>`,
  },
  {
    id: 'channel-switching',
    cat: 'watch',
    title: 'Changement de chaîne et numéros de chaîne',
    keywords: 'numéro de chaîne numéro changer haut bas ordre lineup panneau',
    body: `
<h2>Changer vers le haut / le bas</h2>
<p><kbd>↑</kbd>/<kbd>↓</kbd> (ou CH+/CH−) avance dans la liste d’où vous avez lancé la chaîne. Si vous êtes parti de la rangée « Sport » par exemple, vous passez d’une chaîne de sport à l’autre ; depuis les favoris, d’un favori à l’autre. Si vous l’avez lancée depuis la recherche ou une fiche, l’ordre est celui de vos favoris (ou, à défaut, des chaînes du pays d’origine).</p>
<h2>Numéros de chaîne</h2>
<p>Les numéros fonctionnent comme sur un téléviseur : <b>l’ordre de vos favoris donne les premiers numéros</b> (1, 2, 3…), suivis des chaînes du pays d’origine. Modifiez l’ordre sur la page Favoris par glisser-déposer. ${go('#/favorites', 'Favoris')}</p>
<p>Pendant la lecture, saisissez le numéro (<kbd>0</kbd>–<kbd>9</kbd>, jusqu’à 4 chiffres) – il s’affiche en haut à droite, et la chaîne change au bout de 1,3 seconde.</p>
<h2>Panneau de la liste des chaînes</h2>
<p>Pendant la lecture, <kbd>Entrée</kbd> ou <kbd>L</kbd> (le bouton bleu sur TV) ouvre à droite les chaînes de la liste avec le programme en cours. En haut, vous pouvez filtrer par nom.</p>`,
  },
  {
    id: 'quality',
    cat: 'watch',
    title: 'Qualité et source du flux',
    keywords: 'qualité résolution 1080p 720p source débit automatique',
    body: `
<p>Le bouton ⚙ du lecteur (le bouton jaune sur TV) ouvre un menu :</p>
<ul>
<li><b>Qualité</b> : en <i>Automatique</i>, le lecteur adapte la résolution à la bande passante et à la taille de la fenêtre (dans une petite fenêtre ou le mini-lecteur, il ne charge pas le Full HD). Vous pouvez fixer à la main la meilleure qualité ou une qualité inférieure (p. ex. en données mobiles lentes). Beaucoup de flux n’existent qu’en une seule qualité – le menu l’indique alors.</li>
<li><b>Qualité maximale</b> (Paramètres → Lecture) : un plafond permanent pour tous les flux – 1080p, 720p, 480p ou 360p (économie de données). Moins de saccades et moins de données sur une connexion lente ou mobile. Modifié pendant la lecture, il s’applique immédiatement.</li>
<li><b>Source</b> : toutes les sources de flux de la chaîne avec une pastille d’état (vert = a fonctionné, rouge = non, gris = non vérifiée). Si l’une saccade, essayez-en une autre.</li>
</ul>
<p>La piste audio et les sous-titres se choisissent dans le menu du bouton <b>CC</b>. ${t('audio-subs', 'Audio et sous-titres')}</p>
<div class="note">Le choix de la qualité fonctionne avec les lecteurs hls.js et dash.js. Le lecteur intégré d’un téléviseur décide lui-même de la qualité. ${t('engines', 'Moteurs de lecture')}</div>`,
  },
  {
    id: 'audio-subs',
    cat: 'watch',
    title: 'Piste audio et sous-titres – partout',
    keywords: 'piste audio son langue doublage version originale sous-titres cc intégrés télétexte subtitle langue préférée',
    body: `
<p>Le bouton <b>CC</b> du lecteur (ou la touche <kbd>C</kbd>, ou le bouton <i>Subtitle</i> de la télécommande sur TV) ouvre le menu <b>Audio et sous-titres</b> – <b>pour les directs comme pour les films, les séries et vos propres vidéos</b>.</p>
<h2>Piste audio</h2>
<p>Si le flux ou le fichier contient plusieurs pistes audio (p. ex. version doublée et originale, ou audiodescription), choisissez ici. Le programme affiche le nom des pistes dans la langue de l’interface (<i>Français</i>, <i>Anglais</i>, <i>Hongrois</i>…). S’il n’y a qu’une piste, le menu l’indique.</p>
<h2>Sous-titres</h2>
<ul>
<li><b>Sous-titres intégrés</b> : ceux que contient le flux ou le fichier vidéo lui-même (piste de sous-titres HLS / DASH, MP4 / MKV). Pour les directs, seuls ceux-ci sont disponibles.</li>
<li><b>Sous-titres externes</b> (films, séries, vidéos personnelles) : un fichier .srt à côté de la vidéo, un résultat de Feliratok.eu ou OpenSubtitles, ou votre propre fichier. ${t('subtitles', 'Sous-titres')}</li>
<li>Un seul sous-titre s’affiche à la fois : si vous en choisissez un externe, l’intégré se désactive, et inversement.</li>
<li>La <b>taille</b> se règle partout ; le <b>décalage</b> s’applique aux sous-titres externes.</li>
</ul>
<h2>Langues préférées par profil</h2>
<p>En bas de Paramètres → Sous-titres et informations → <b>Infos et sous-titres en français</b>, vous pouvez indiquer <b>quelle piste audio</b> (celle du flux par défaut / français / anglais) et <b>quels sous-titres intégrés</b> (désactivés / français / anglais) votre profil préfère. Le lecteur les choisit automatiquement pour chaque nouveau flux et chaque nouvelle vidéo, s’ils sont disponibles.</p>
<div class="note">La version de bureau peut aussi changer de piste audio avec le lecteur intégré (MP4, MKV). Sur TV, le changement de piste audio dans le lecteur intégré dépend de l’appareil ; pour les flux HLS, le lecteur hls.js fonctionne partout.</div>
${go('#/settings?section=huinfo', 'Définir les langues préférées')}`,
  },
  {
    id: 'pip-mini',
    cat: 'watch',
    title: 'Mini-lecteur et boutons du lecteur',
    keywords: 'mini fenêtre flottante toujours au premier plan boutons barre de contrôle masquer cc enregistrement',
    body: `
<h2>Mini-lecteur (<kbd>N</kbd>, version de bureau uniquement)</h2>
<p>Toute la fenêtre d’Adás se réduit à 480×270 pixels, se place dans le coin inférieur droit de l’écran et reste <b>toujours au premier plan</b>. Seuls l’image et quelques boutons de base sont alors visibles. Double-clic ou <kbd>Échap</kbd> : retour à la taille normale. Non disponible sur TV.</p>
<h2>Les boutons du lecteur</h2>
<p>Les boutons supplémentaires de la barre de contrôle (enregistrer, 30 s arrière / avant, chaîne précédente, favori, fiche, audio et sous-titres (CC), minuterie de mise en veille, liste des chaînes, multi-vue, caster, mini-lecteur, plein écran) peuvent être masqués un par un : Paramètres → Lecture → <b>Boutons du lecteur</b>. Les touches fonctionnent même si le bouton est masqué ; pause, volume et le menu ⚙ restent toujours visibles.</p>`,
  },
  {
    id: 'sleep',
    cat: 'watch',
    title: 'Minuterie de mise en veille',
    keywords: 'minuterie sommeil éteindre nuit fin du programme',
    body: `
<p>Réglez-la avec le bouton ☾ du lecteur : 15, 30, 45, 60, 90, 120 minutes ou <b>« À la fin du programme »</b> (fin du programme en cours d’après le guide TV – disponible seulement si la chaîne a des données de programme).</p>
<p>Le petit nombre sur le bouton indique les minutes restantes. Pendant les 15 dernières secondes, le son baisse doucement, puis la lecture s’arrête et le lecteur se ferme. Pour la désactiver : <i>Désactivé</i> dans le même menu.</p>`,
  },
  {
    id: 'engines',
    cat: 'watch',
    title: 'Moteurs de lecture',
    keywords: 'hls.js natif lecteur intégré mpegts dash moteur format m3u8 ts mpd',
    body: `
<p>Les flux arrivent dans différents formats, le programme utilise donc plusieurs moteurs de lecture :</p>
<table class="help-table">
<tr><td><b>hls.js</b></td><td>Flux HLS (<code>.m3u8</code>) – par défaut dans la version de bureau ; permet de choisir la qualité et la piste audio.</td></tr>
<tr><td><b>Lecteur intégré</b></td><td>Le lecteur propre du système / du téléviseur. Sur TV, c’est le défaut pour le HLS, car hls.js n’y atteindrait pas beaucoup de flux à cause des restrictions CORS.</td></tr>
<tr><td><b>mpegts.js</b></td><td>Flux MPEG-TS (<code>.ts</code>) et FLV.</td></tr>
<tr><td><b>dash.js</b></td><td>Flux DASH (<code>.mpd</code>).</td></tr>
</table>
<p>Paramètres → Lecture → <b>Moteur de lecture</b> : <i>Automatique</i> (recommandé), <i>Lecteur intégré</i> ou <i>hls.js</i>. Si un flux HLS ne démarre pas avec l’un, essayez l’autre. Sur TV, le programme le fait de lui-même : si le lecteur intégré n’y arrive pas, il réessaie la même source avec hls.js.</p>`,
  },

  // ===================================================================== VOD
  {
    id: 'vod',
    cat: 'vod',
    title: 'VOD – films et séries',
    keywords: 'film série vod cinéma épisode saison reprise domaine public médiathèque personnelle nas listes en ligne chaîne tri',
    body: `
<p>En plus des chaînes TV en direct, Adás lit aussi des <b>films et des séries</b> (VOD – vidéo à la demande). Ce ne sont pas des chaînes mais des vidéos indépendantes : on peut les lancer à tout moment, avancer, et reprendre là où on s’est arrêté. Dans le menu, la <b>VOD</b> figure à part, après les parties TV (Accueil, Guide TV, Parcourir, Favoris).</p>
<h2>Deux parties : listes en ligne et médiathèque personnelle</h2>
<p>En haut de la page VOD, deux onglets : <b>Listes en ligne</b> (les listes de films / séries intégrées et ajoutées) et <b>Médiathèque personnelle</b> (les listes de lecture trouvées dans les dossiers de votre NAS / ordinateur).</p>
<h2>Chaîne ou VOD ?</h2>
<p>Les chaînes ne contiennent que des directs, la VOD que des films et des séries. Si une liste de chaînes (p. ex. d’un fournisseur IPTV) contient aussi des films ou des épisodes – durée indiquée (<code>#EXTINF:5400</code>), adresse <code>/movie/</code> ou <code>/series/</code>, ou fichier vidéo avec année / numéro d’épisode –, ils passent d’eux-mêmes dans la VOD (avec le nom de la liste). Inversement, si une liste VOD contient un direct (adresse HLS / TS sans durée, avec un groupe « Live / TV » ou un tvg-id), il rejoint les chaînes. Dans les Paramètres, à côté des listes, on voit combien d’éléments ont été déplacés.</p>
<h2>La page Listes en ligne</h2>
<ul>
<li><b>Reprendre</b> : les films et séries commencés (la barre de progression montre où vous en êtes).</li>
<li><b>Séries</b>, <b>Films recommandés</b>, puis les <b>genres unifiés</b> (les plus populaires d’abord ; par défaut les 12 plus populaires ont une rangée, les autres s’activent dans Paramètres → VOD et médiathèque → Listes VOD → <i>Rangées de la page VOD</i>, et ils restent toujours disponibles dans le filtre), et enfin une rangée par liste. Les noms de genre suivent la <b>liste des genres d’AnimeAddicts</b> (Action, Drame, Fantasy, Aventure, Policier, Mystère, Romance, Science-fiction, Thriller, Comédie…), complétée par <i>Documentaire</i> et <i>Film culte</i>. Les groupes propres aux listes – dans n’importe quelle langue, p. ex. « Horror all night », « Comedy », « Comédie » – sont rattachés à ces genres, si bien qu’un genre n’apparaît qu’une fois. Les simples caractéristiques (p. ex. <i>Déconseillé aux enfants</i>, <i>Épisode(s) court(s)</i>, <i>Images de synthèse</i>) peuvent être choisies dans le filtre mais n’ont pas de rangée. Un titre peut apparaître dans <b>plusieurs genres</b> : il reçoit le genre de chacune de ses listes, fichiers et groupes (p. ex. s’il figure à la fois dans <code>action.m3u8</code> et <code>comedie.m3u8</code> de votre pack de genres). Dans la médiathèque personnelle, les listes non rattachables à un genre (p. ex. « Noël ») restent des rangées séparées, sous leur nom.</li>
<li>Avec les boutons <b>Tous les films</b>, <b>Toutes les séries</b> et <b>Rechercher et filtrer</b>, vous obtenez une grille filtrable par type, groupe et année.</li>
</ul>
<p>La recherche de l’en-tête trouve aussi les films et les séries (sous un titre séparé « VOD – films et séries »).</p>
<h2>Fiche</h2>
<p>Un clic sur une affiche ouvre la fiche :</p>
<ul>
<li><b>Film</b> : titre, année, durée, groupes, source ; <i>Lire</i> ou <i>Reprendre à xx:xx</i>, <i>Depuis le début</i>, <i>Marquer comme vu</i>.</li>
<li><b>Série</b> : les saisons en onglets (chacune avec épisodes vus / total), la liste des épisodes (vus en grisé, commencés avec barre de progression), la progression globale ; le bouton principal lance le prochain épisode à voir. Le bouton <i>Marquer la saison comme vue</i> marque (ou efface) tous les épisodes de la saison d’un coup.</li>
<li><b>+ À regarder</b> : ajoute le film / la série à votre liste personnelle – visible dans la rangée <i>À regarder</i> de la page VOD (rangée activable et déplaçable).</li>
<li><b>✎ Titre et affiche</b> : une fenêtre avec le titre affiché (p. ex. si le titre français est introuvable) et l’affiche. Vous pouvez aussi <b>chercher des affiches avec vos propres mots-clés</b> (p. ex. le titre original ou japonais) – sources sans clé : AniList, Kitsu, MyAnimeList (anime), TVmaze (séries), Wikipédia en français et en anglais, Wikidata ; avec votre propre clé, TMDB et OMDb (données IMDb). Vous pouvez aussi indiquer votre propre adresse ou fichier d’image, et restaurer l’affiche d’origine. La modification s’applique avec <i>Enregistrer</i>.</li>
</ul>
<h2>Titre français, affiche</h2>
<p>Les cartes et le haut de la fiche affichent le <b>titre français</b> du film / de la série s’il est connu (Wikidata ; avec une clé TMDB, TMDB) – sur la fiche, le titre original / anglais figure en dessous, sur la carte au survol. La recherche trouve aussi l’élément par son titre français. Pour un élément sans affiche, le programme en cherche une lui-même ; s’il n’en trouve pas, la carte affiche le titre sur fond coloré, et vous pouvez en définir une à tout moment avec le bouton <b>Titre et affiche</b> de la fiche. Le titre et l’affiche définis à la main valent pour tous les profils.</p>
<p>L’état « vu » est enregistré <b>par profil</b>. Dans un profil enfant, seuls les contenus famille, jeunesse et animation apparaissent.</p>
${go('#/vod', 'Ouvrir la VOD')}`,
  },
  {
    id: 'vod-player',
    cat: 'vod',
    title: 'Regarder des films : avance, reprise, épisode suivant',
    keywords: 'avance saut avant arrière 10 secondes frise épisode suivant reprise automatique lecteur externe vlc mpv iina ac3 dts mkv pas de son sous-titres intégrés',
    body: `
<p>Pour les films et les épisodes, une <b>frise</b> (temps écoulé / restant) remplace en bas du lecteur le programme en direct. Cliquez ou faites glisser pour aller n’importe où.</p>
<table class="help-table keys">
<tr><td><kbd>←</kbd> / <kbd>→</kbd></td><td>10 s en arrière / en avant (60 s avec <kbd>Maj</kbd>)</td></tr>
<tr><td><kbd>↑</kbd> / <kbd>↓</kbd></td><td>Volume</td></tr>
<tr><td><kbd>0</kbd>–<kbd>9</kbd></td><td>Aller à 0–90 % de la vidéo</td></tr>
<tr><td><kbd>Espace</kbd> / <kbd>Entrée</kbd></td><td>Pause / reprise</td></tr>
<tr><td><kbd>Page préc.</kbd> / <kbd>Page suiv.</kbd> (CH+/CH−)</td><td>Épisode précédent / suivant</td></tr>
<tr><td><kbd>I</kbd></td><td>Fiche</td></tr>
<tr><td>⏪ ⏩ sur la télécommande</td><td>30 s en arrière / en avant</td></tr>
</table>
<h2>Reprise</h2>
<p>Le programme enregistre où vous en êtes toutes les 5 secondes et à la fermeture. La fois suivante, le bouton <i>Reprendre</i> repart de là ; le bouton <i>Depuis le début</i>, du début. Une vidéo vue à 94 % est considérée comme vue.</p>
<h2>Épisode suivant</h2>
<p>Pour une série, à la fin d’un épisode apparaît la proposition <b>Épisode suivant</b> avec un compte à rebours de 8 secondes – <i>Lire</i> le lance immédiatement, <i>Annuler</i> l’arrête. Désactivable : Paramètres → VOD et médiathèque → Listes VOD → <i>Lancer automatiquement l’épisode suivant</i>.</p>
<p>Ici, l’option « À la fin du programme » de la minuterie de mise en veille désigne la fin de la vidéo.</p>
<h2>Pistes audio et sous-titres intégrés (pont de lecture)</h2>
<p>Seul, le lecteur intégré (le moteur Chromium) ne sait pas lire le son <b>AC3 / E-AC3 / DTS / TrueHD</b> (il ne voit même pas ces pistes), n’affiche pas du tout les <b>sous-titres intégrés</b> au fichier (MKV : ASS / SRT, MP4 : mov_text), ni l’image de certains anciens formats vidéo (XviD, WMV, H.264 10 bits).</p>
<p>La <b>version de bureau</b> examine donc en un instant les pistes du fichier à chaque lancement d’un film / épisode (<b>FFmpeg</b> intégré) et, si nécessaire, le lit via le <b>pont de lecture</b> : l’image reste inchangée, le son est converti à la volée en AAC, et les sous-titres intégrés passent dans le menu <b>CC</b>. Ainsi toutes les pistes audio sont disponibles, l’avance fonctionne (le pont redémarre au point choisi), et les langues audio et de sous-titres préférées du profil s’appliquent. Pour les sous-titres, le réglage par défaut est <i>Celle du fichier par défaut</i> : les sous-titres marqués par défaut dans le fichier s’affichent, et sans marque – si le son n’est pas dans votre langue – les sous-titres dans votre langue.</p>
<p>La mise en forme des sous-titres (police ASS, couleurs, position) devient du texte simple. Pour le désactiver : Paramètres → Lecture → <i>Pont de lecture (FFmpeg)</i>. Le pont ne télécharge que la partie lue (environ 90 secondes d’avance), pas tout le fichier.</p>
<h2>Android et Android TV : lecteur natif</h2>
<p>Sous Android, les films et épisodes (MKV, MP4, AVI…) sont lus par le <b>lecteur natif</b> intégré (ExoPlayer) : l’image apparaît sous l’interface, les commandes sont les mêmes. Il gère le son <b>AC3 / E-AC3 / DTS / TrueHD</b> (avec le décodeur FFmpeg fourni si l’appareil ne le sait pas), les sous-titres <b>ASS / SRT</b> intégrés au fichier (en texte simple), et toutes les pistes audio sont disponibles dans le menu <b>CC</b>. Sur une TV avec barre de son / amplificateur, le son AC3 peut aussi être transmis tel quel. Si le lecteur natif n’y arrive pas avec un fichier, le programme essaie automatiquement le lecteur propre de la WebView. Pour le désactiver : Paramètres → Lecture → <i>Lecteur natif (ExoPlayer)</i>.</p>
<h2>Dans un lecteur externe</h2>
<p>Si le pont / le lecteur natif est désactivé ou indisponible, le lecteur détecte quand le son ou l’image d’un fichier ne fonctionne pas et propose le bouton <b>Lecteur externe</b> ; la fiche comporte aussi toujours le bouton <b>Dans un lecteur externe</b>.</p>
<ul>
<li><b>Windows / Mac / Linux</b> : le programme transmet au système une liste de lecture (pour une série, à partir de l’épisode choisi avec les suivants), que le lecteur associé ouvre. Recommandés : <b>VLC</b> (sur tous les systèmes), <b>mpv</b>, sur macOS <b>IINA</b>. Si rien ne s’ouvre, installez-en un et associez-le aux fichiers <code>.m3u</code>.</li>
<li><b>Android</b> : le système propose les lecteurs vidéo installés (VLC, MX Player, Kodi…).</li>
<li>Sur le <b>téléviseur</b> (LG), cette option n’existe pas ; le lecteur du téléviseur gère souvent le son AC3.</li>
</ul>
<p>Dans un lecteur externe, Adás ne peut pas suivre où vous en êtes – mais l’épisode en cours d’une série est mémorisé.</p>`,
  },
  {
    id: 'vod-lists',
    cat: 'vod',
    title: 'Listes de films et de séries',
    keywords: 'liste de films liste de séries ajouter github dépôt m3u m3u8 zip plusieurs fichiers genre domaine public orphaned pack complémentaire adaspack',
    body: `
<p>Les films et les séries se chargent depuis <b>des listes séparées</b>, comme les chaînes TV : Paramètres → VOD et médiathèque → <b>Listes VOD</b>.</p>
<h2>Listes intégrées</h2>
<table class="help-table">
<tr><td><b>Orphaned Films</b></td><td>Plus de 1 300 films du domaine public regroupés par thème, avec affiches.</td></tr>
<tr><td><b>Films du domaine public (OnlineM3U)</b></td><td>Films classiques choisis, par genre.</td></tr>
</table>
<p>Toutes deux contiennent des films hébergés sur archive.org et libres de droits. Chacune peut être activée ou désactivée.</p>
<h2>Packs complémentaires</h2>
<p>Un fichier <code>.adaspack</code> apporte une liste avec un nom et une description, et apparaît parmi les <b>Listes intégrées</b> – mais il n’est pas fourni avec le programme : il n’existe que sur l’appareil où vous le chargez :</p>
<ul>
<li>le bouton <b>Charger un pack complémentaire</b> (Listes VOD), ou</li>
<li>dans la version de bureau, le <b>Dossier des packs</b> (le sous-dossier <code>packs</code> du dossier de données utilisateur) : ce qui s’y trouve est chargé automatiquement au démarrage, et actualisé si le fichier change ;</li>
<li>la <b>sauvegarde</b> et le <b>transfert entre appareils</b> emportent aussi les packs (p. ex. de l’ordinateur vers le téléphone).</li>
</ul>
<p>Un pack de films s’appelle <code>…_vod.adaspack</code>, un pack TV <code>…_tv.adaspack</code> (ce dernier rejoint les Listes de chaînes). <b>Retirer</b> ne le supprime que de cet appareil. ${t('adaspack', 'Format et création (aussi avec l’IA)')}</p>
<h2>Ajouter votre propre liste</h2>
<ul>
<li><b>Depuis une adresse</b> : l’adresse d’une liste M3U / M3U8, une seule vidéo (p. ex. <code>…/film.m3u8</code> ou <code>.mp4</code>), ou un <b>dépôt GitHub entier</b> (p. ex. <code>https://github.com/auteur/depot</code>) – le programme charge alors toutes les listes du dépôt (jusqu’à 300 fichiers). Un lien GitHub vers un dossier ou un fichier d’un dépôt fonctionne aussi.</li>
<li><b>Depuis un fichier</b> (versions de bureau et Android) : un ou <b>plusieurs</b> fichiers <code>.m3u</code> / <code>.m3u8</code>, ou un paquet <b>ZIP</b>. Plusieurs fichiers forment une seule liste :
  <ul>
  <li><b>Pack de genres</b> – s’il contient un fichier nommé <code>all</code>, ou si les mêmes titres figurent dans plusieurs fichiers (p. ex. <code>all.m3u8</code> + <code>action.m3u8</code> + <code>drame.m3u8</code>) : chaque film / épisode n’apparaît qu’une fois, et les noms de fichier deviennent des <b>genres</b> (rangées séparées sur la page des films, et filtrables).</li>
  <li><b>Listes indépendantes</b> : mises bout à bout ; le nom de fichier aide à reconnaître les séries.</li>
  </ul>
  Le texte des grandes listes est stocké à part, de façon durable (vider le cache ne l’efface pas), et entre aussi dans la sauvegarde et dans le paquet de la <i>Synchronisation entre appareils</i>.</li>
<li><b>Collée</b> en texte.</li>
</ul>
<p>Chaque liste personnelle peut être <b>activée et désactivée</b>, renommée et supprimée. Si plusieurs listes sont activées, la page des films comporte aussi une rangée par liste, et la grille peut être filtrée par liste.</p>
<p>Les éléments de genres pour adultes (p. ex. <i>hentai</i>, <i>érotique</i>) n’apparaissent qu’avec le réglage <i>Afficher le contenu pour adultes</i> ; jamais dans un profil enfant.</p>
<p>Les listes s’actualisent toutes les 6 heures ; immédiatement : <i>Actualiser les listes maintenant</i>. À côté de chaque liste, on voit combien d’entrées elle a fournies, ou le message d’erreur si elle ne peut pas être téléchargée.</p>
<div class="warn">N’ajoutez que des listes dont vous pouvez regarder le contenu légalement. Les vidéos des listes gratuites non officielles deviennent souvent vite indisponibles (p. ex. liens d’hébergement expirés).</div>
${go('#/settings?section=vodlists', 'Gérer les listes')}`,
  },
  {
    id: 'own',
    cat: 'vod',
    title: 'Médiathèque personnelle (NAS)',
    keywords: 'personnelle nas dossier partage lecteur réseau smb http serveur web liste de lecture m3u m3u8 automatique',
    body: `
<p>L’onglet <b>Médiathèque personnelle</b> de la VOD affiche vos propres films et séries – par exemple à partir de listes <code>.m3u</code> / <code>.m3u8</code> générées automatiquement dans un dossier de votre NAS. Elle fonctionne comme les listes VOD en ligne : affiches, fiche, reprise, épisode suivant, infos et sous-titres en français.</p>
<h2>Indiquer une source</h2>
<p>Paramètres → VOD et médiathèque → <b>Médiathèque personnelle (NAS)</b> :</p>
<table class="help-table">
<tr><td><b>Choisir un dossier…</b> / <b>Saisir le chemin du dossier</b><br><small>(version de bureau)</small></td><td>Le dossier partagé du NAS, p. ex. <code>\\\\NAS\\Media\\Listes</code>, un lecteur réseau (<code>Z:\\Listes</code>) ou un dossier monté sous Linux / macOS (<code>/mnt/nas/listes</code>, <code>/Volumes/Media</code>). Le programme parcourt aussi les sous-dossiers (jusqu’à 4 niveaux).</td></tr>
<tr><td><b>Adresse réseau (http)</b><br><small>(sur tous les appareils, TV comprise)</small></td><td>Si le NAS rend aussi le dossier accessible via un serveur web (p. ex. Synology Web Station, QNAP, une liste de répertoire nginx / Apache) : <code>http://192.168.1.10/listes/</code>. Le programme parcourt les liens .m3u / .m3u8 et les sous-dossiers (2 niveaux) de la page. L’adresse d’une seule liste peut aussi être indiquée.</td></tr>
</table>
<h2>Activer et désactiver les listes</h2>
<ul>
<li>Sous la source, <b>chaque liste trouvée apparaît sur sa propre ligne</b>, avec son interrupteur (et le nombre d’entrées). Des boutons <i>Tout activer</i> / <i>Tout désactiver</i> sont aussi disponibles.</li>
<li>Les nouvelles listes arrivent <b>activées</b> par défaut (modifiable : <i>Activer automatiquement les nouvelles listes</i>).</li>
<li>La source entière peut aussi être désactivée ou retirée (rien n’est supprimé sur le NAS).</li>
</ul>
<h2>Actualisation automatique</h2>
<p>Le programme vérifie les sources toutes les 10 minutes et à l’ouverture de la page Personnelle, si bien que les listes générées ou modifiées par le NAS apparaissent d’elles-mêmes. Immédiatement : le bouton <i>Relire</i> sur la page Personnelle ou dans les paramètres.</p>
<h2>Chemins dans les listes</h2>
<ul>
<li>adresses complètes (<code>http://…</code>, <code>file://…</code>) telles quelles,</li>
<li>chemins Windows et UNC (<code>D:\\Films\\…</code>, <code>\\\\NAS\\…</code>) et chemins Unix (<code>/volume1/…</code>) comme fichiers locaux,</li>
<li><b>chemins relatifs</b> (<code>Films/Film.mkv</code>, <code>../Series/…</code>) par rapport à l’emplacement de la liste.</li>
</ul>
<div class="note">Seule la version de bureau peut lire des fichiers locaux / partagés (file://) ; sur TV, le NAS doit servir les vidéos en http (p. ex. avec une adresse DLNA / de serveur web). La lecture dépend des formats pris en charge par le moteur du navigateur : MP4 (H.264/AAC) et HLS fonctionnent à coup sûr, MKV en partie, certains codecs (p. ex. son DTS) non.</div>
<h2>Titres et sous-titres</h2>
<p>À partir des noms de fichier (p. ex. <code>Titre.Du.Film.2019.1080p.BluRay.x264</code>), le programme extrait le titre et l’année, si bien que les infos en français et la recherche OpenSubtitles fonctionnent aussi. Un fichier de sous-titres du même nom à côté de la vidéo (<code>Film.srt</code>, <code>Film.fr.srt</code>) est <b>chargé automatiquement</b> (en privilégiant le français), et vous pouvez le choisir dans le menu des sous-titres sous « À côté de la vidéo ». ${t('subtitles', 'Sous-titres')}</p>
${go('#/settings?section=ownlists', 'Configurer la médiathèque personnelle')}`,
  },
  {
    id: 'subtitles',
    cat: 'vod',
    title: 'Sous-titres (Feliratok.eu, OpenSubtitles, SubDL)',
    keywords: 'sous-titres subtitle feliratok.eu opensubtitles subdl srt vtt français anglais décalage taille api clé pack de saison',
    body: `
<p>Pour les films et les séries, vous pouvez charger des <b>sous-titres en français ou en anglais</b> depuis les collections d’<b>OpenSubtitles</b> et de <b>SubDL</b>, depuis <b>Feliratok.eu</b> (un site hongrois de sous-titres hongrois et anglais), ou depuis votre propre fichier <code>.srt</code> / <code>.vtt</code>.</p>
<h2>Feliratok.eu – sans configuration</h2><p>Activé par défaut : pas de compte, pas de clé, pas de limite quotidienne. Pour les séries, il extrait aussi les sous-titres de l’épisode d’un pack de saison (ZIP) ; les caractères accentués des anciens sous-titres non UTF-8 sont aussi corrects. Il propose des sous-titres hongrois et anglais. Désactivable : Paramètres → Sous-titres et informations → Infos et sous-titres en français.</p><h2>SubDL (facultatif)</h2><p>Davantage de résultats avec une clé gratuite : inscrivez-vous sur <b>subdl.com</b>, copiez la clé API depuis votre profil et saisissez-la : Paramètres → Sous-titres et informations → <i>Clé API SubDL</i>. Pas de mot de passe nécessaire.</p><h2>OpenSubtitles (facultatif, à configurer une fois)</h2>
<ol>
<li>Inscrivez-vous gratuitement sur <b>opensubtitles.com</b>.</li>
<li>Une fois connecté, cherchez dans votre profil la rubrique <b>API consumers</b> et créez une nouvelle clé (n’importe quel nom convient, p. ex. « Adás »).</li>
<li>Dans Adás : Paramètres → Sous-titres et informations → <b>Infos et sous-titres en français</b> → saisissez la <b>clé API</b>, votre <b>nom d’utilisateur</b> et votre <b>mot de passe</b>, puis appuyez sur <i>Tester la connexion</i>.</li>
</ol>
<p>Pour la recherche, la clé API suffit ; <b>le téléchargement exige aussi la connexion</b>. Avec un compte gratuit, le nombre de sous-titres téléchargeables par jour est limité (le programme indique après chaque téléchargement combien il en reste) ; un sous-titre déjà téléchargé est mémorisé et ne consomme plus le quota.</p>
<h2>Pendant la lecture</h2>
<ul>
<li>Le bouton <b>CC</b> du lecteur ou la touche <kbd>C</kbd> ouvre le menu <b>Audio et sous-titres</b> (piste audio, sous-titres intégrés et externes). ${t('audio-subs', 'Détails')}</li>
<li><b>Rechercher des sous-titres</b> (en dessous, en petits caractères, les bases actuellement actives) : un seul bouton cherche dans toutes les sources activées, en français et en anglais – les résultats dans la langue choisie d’abord. En tête les résultats de Feliratok.eu (ceux qui correspondent à l’année et au titre tout en haut), puis OpenSubtitles (par nombre de téléchargements, les traductions automatiques à la fin) et SubDL ; chaque résultat indique la langue et la source. Cliquez sur celui que vous voulez – il se télécharge et s’affiche aussitôt.</li>

<li><b>Décalage</b> : si les sous-titres sont désynchronisés, ajustez-les par pas de ±0,5 seconde.</li>
<li><b>Taille</b> : petit, moyen, grand, énorme.</li>
<li><i>Charger des sous-titres depuis un fichier</i> (version de bureau) : votre propre fichier .srt ou .vtt.</li>
<li><i>Désactivé</i> : masquer les sous-titres.</li>
</ul>
<p>Les sous-titres choisis <b>restent associés à ce film / cet épisode</b> et se chargent seuls la fois suivante. Avec le réglage <i>Rechercher automatiquement les sous-titres</i>, les meilleurs sous-titres (français ou anglais) se chargent automatiquement à chaque lancement d’un film / épisode.</p>
<div class="note">Les données OpenSubtitles (clé, nom d’utilisateur, mot de passe) sont stockées uniquement sur cet appareil et ne sont envoyées qu’à opensubtitles.com. La correspondance repose sur le titre et l’année du film ; les films anciens ou rares n’ont pas toujours de sous-titres français.</div>
${go('#/settings?section=huinfo', 'Réglages des sous-titres')}`,
  },
  {
    id: 'hu-info',
    cat: 'vod',
    title: 'Infos en français sur les films et les chaînes',
    keywords: 'information description titre anglais affiche image poster wikipédia wikidata tmdb anilist tvmaze anime genre distribution réalisation note',
    body: `
<p>Le programme cherche des <b>informations en français</b> sur les films, les séries et les chaînes TV, et les affiche sur la fiche.</p>
<h2>VOD (films et séries)</h2>
<ul>
<li><b>Titre français</b> (s’il diffère de l’original, il figure aussi en italique sous le titre),</li>
<li><b>description</b> en français s’il y en a une (Wikipédia en français, TMDB) ; sinon <b>en anglais</b> – le programme le signale,</li>
<li><b>affiche</b> : l’image propre à la liste, sinon celle des sources (affiche de l’article Wikipédia, AniList, TVmaze, TMDB) ; dans la <b>médiathèque personnelle</b>, l’image à côté de la vidéo (<code>Film.jpg</code>, <code>poster.jpg</code>, <code>folder.jpg</code>, <code>cover.jpg</code>) ou l’affiche intégrée au fichier (pièce jointe MKV, MP4) – cette dernière dans la version de bureau,</li>
<li><b>genre, réalisation, studio, distribution, pays, année</b>, note (AniList, TVmaze, TMDB).</li>
</ul>
<h2>Chaînes TV</h2>
<p>Sur la fiche d’une chaîne, la rubrique <b>« À propos de la chaîne »</b> : un résumé Wikipédia en français (ou en anglais), propriétaire, année de lancement – depuis Wikidata, sinon via la recherche de Wikipédia en français, puis en anglais. Le programme n’affiche une description que si le nom de la chaîne (et, pour Wikidata, son pays) correspond, pour éviter les descriptions erronées.</p>
<h2>Sources</h2>
<table class="help-table">
<tr><td><b>Wikidata + Wikipédia</b></td><td>Par défaut, gratuit, sans clé ; article en français ou en anglais.</td></tr>
<tr><td><b>AniList</b></td><td>Pour les anime (le programme les reconnaît à la liste, à l’hébergement ou aux genres) : affiche, description anglaise, genres, note, studio. Sans clé.</td></tr>
<tr><td><b>TVmaze</b></td><td>Pour les séries : image, résumé anglais, genre, note. Sans clé.</td></tr>
<tr><td><b>TMDB</b> (The Movie Database)</td><td>Si vous saisissez votre propre clé API gratuite (themoviedb.org → Paramètres → API), les données des films et séries viennent aussi d’ici : descriptions en français plus riches et notes.</td></tr>
</table>
<p>Si un fournisseur demande de ralentir (trop de requêtes), le programme cesse de l’interroger un moment et reprend plus tard. Les critiques d’<b>AnimeAddicts</b> ne sont accessibles qu’une fois connecté, le programme ne les lit donc pas.</p>
<p>Les données sont mises en cache (30 jours), si bien qu’elles s’affichent instantanément la deuxième fois. Pour désactiver : Paramètres → Sous-titres et informations → Infos et sous-titres en français → <i>Télécharger les informations et les affiches</i>.</p>
${go('#/settings?section=huinfo', 'Paramètres')}`,
  },
  {
    id: 'vod-detect',
    cat: 'vod',
    title: 'Comment distingue-t-il films et séries ?',
    keywords: 'détection film série épisode S01E02 saison épisode nom format',
    body: `
<p>Les listes M3U n’indiquent pas séparément ce qui est un film ou une série, le programme décide donc d’après le <b>titre</b>. Si le titre contient une mention d’épisode, il le traite comme un <b>épisode de série</b>, sinon comme un <b>film</b>.</p>
<h2>Mentions d’épisode reconnues</h2>
<table class="help-table">
<tr><td><code>S01E02</code>, <code>S1 E2</code>, <code>S04.E23</code></td><td>saison + épisode</td></tr>
<tr><td><code>1x02</code></td><td>saison + épisode</td></tr>
<tr><td><code>Season 2 Episode 5</code>, <code>Staffel 2 Folge 5</code>, <code>Saison 2 Épisode 5</code></td><td>saison + épisode</td></tr>
<tr><td><code>2. évad 5. rész</code></td><td>saison + épisode (hongrois)</td></tr>
<tr><td><code>Episode 5</code>, <code>Ep. 5</code>, <code>Folge 5</code>, <code>Part 5</code>, <code>5. rész</code></td><td>épisode (saison 1)</td></tr>
<tr><td><code>第5集</code>, <code>第5話</code></td><td>épisode (chinois / japonais)</td></tr>
</table>
<h2>Le nom de la série</h2>
<p>Le texte <b>avant</b> la mention est le nom de la série (p. ex. « The Goldbergs S04 E23 » → <i>The Goldbergs</i>, saison 4, épisode 23), ce qui suit est le titre de l’épisode. S’il n’y a pas de texte avant la mention, c’est le champ <code>group-title</code>, et en dernier recours le nom de fichier de la liste, qui donne le nom de la série. Les épisodes de même nom sont regroupés en une série, triés par saisons et épisodes.</p>
<h2>Films</h2>
<p>Une année entre parenthèses à la fin du titre (p. ex. « Night of the Living Dead (1968) ») est prise comme année du film. Le champ <code>group-title</code> donne le groupe / genre, <code>tvg-logo</code> l’affiche, et le nombre après <code>#EXTINF</code> la durée. Les films de même titre et même année provenant de plusieurs listes fusionnent en un seul film, et leurs versions servent de sources de secours.</p>
<div class="tip">Pour votre propre liste, nommez les entrées ainsi : <code>#EXTINF:-1 tvg-logo="affiche.jpg" group-title="Comédie",Titre du film (1999)</code>, et pour une série <code>…,Titre de la série S01E01 Titre du premier épisode</code>.</div>`,
  },

  // ===================================================================== Rechercher et parcourir
  {
    id: 'dashboard',
    cat: 'find',
    title: 'La page d’accueil',
    keywords: 'accueil tableau de bord météo actualités rss guide tv favoris ce soir reprise lieu personnaliser disposition bloc tuile taille',
    body: `
<p>La page d’accueil est une vue d’ensemble composée de blocs (cartes) qui, sur ordinateur et sur TV, <b>tient toujours sur un écran</b>. Sur téléphone (et sous Android en portrait), les blocs sont empilés et la page défile.</p>
<h2>Personnaliser</h2>
<p>Avec le bouton <b>Personnaliser</b> en haut à droite de l’accueil (ou Paramètres → Accueil → <i>Personnaliser l’accueil</i>) :</p>
<ul>
<li>le nombre de <b>colonnes</b> (1–5) et de <b>lignes</b> (1–4) de la grille,</li>
<li>par bloc : <b>ordre</b> (‹ ›, ou glisser-déposer à la souris), <b>largeur</b> (↔) et <b>hauteur</b> (↕) en cellules, <b>masquer</b> (×),</li>
<li>récupérer les blocs masqués (<b>Ajouter</b>), et la disposition <b>Par défaut</b>.</li>
</ul>
<p>Les blocs vont toujours à la première place libre. Si après une modification quelque chose ne tenait plus, le programme ne l’autorise pas – réduisez ou masquez d’abord un autre bloc, ou agrandissez la grille. La disposition est enregistrée séparément pour chaque profil. À la télécommande, les boutons s’atteignent avec les flèches.</p>
<div class="tip"><b>La taille compte :</b> chaque bloc adapte à sa taille ce qu’il affiche et en quelle quantité – par exemple le nombre d’actualités et de programmes, l’image et le chapeau des actualités, le nombre de jours des prévisions, la densité du détail horaire, la taille et le nombre d’affiches VOD, ou la plage horaire du guide TV.</div>
<h2>Les blocs</h2>
<table class="help-table">
<tr><td><b>Météo</b></td><td>En haut la météo du jour avec le nom du lieu, en dessous la journée heure par heure (toutes les deux ou trois heures sur une carte étroite), en bas les prévisions de la semaine. Sur une petite carte, la partie hebdomadaire disparaît, et plus petit encore le graphique aussi. La partie du jour peut prendre la forme : courbe, aire + précipitations, barres, tuiles ou une seule valeur. Lieu et apparence : Paramètres → <b>Accueil</b>. Source : Open-Meteo.</td></tr>
<tr><td><b>En ce moment à la TV</b></td><td>Les programmes de vos chaînes favorites, comme dans la grille du guide TV (plage de 1 à 5 heures selon la largeur). Ce qui ne tient pas est signalé par une ligne « +N de plus ».</td></tr>
<tr><td><b>Actualités</b></td><td>Les dernières actualités des sources RSS / Atom activées – autant que la place le permet (avec chapeau sur une carte large). Un clic ouvre le résumé. Sources : Paramètres → <b>Accueil</b> → <i>Sources d’actualités</i>. Les sources par défaut dépendent de la langue de l’interface. Indisponible dans un profil enfant.</td></tr>
<tr><td><b>Ce soir à la TV</b></td><td>Un programme du soir (après 19 h) par chaîne favorite. Demandez un rappel avec le bouton cloche.</td></tr>
<tr><td><b>Dernière chaîne regardée</b></td><td>La dernière chaîne regardée avec le programme en cours et le suivant (avec la description sur une carte plus grande), à reprendre d’une pression.</td></tr>
<tr><td><b>VOD – reprendre</b></td><td>Les 5 derniers films / épisodes regardés, avec affiche et progression (en liste sur une petite carte) – reprend là où vous vous êtes arrêté.</td></tr>
<tr><td><b>Chaînes favorites</b> (masqué par défaut)</td><td>Les logos de vos chaînes favorites en grille, à lancer d’un clic ; sur une tuile plus grande, avec le programme en cours.</td></tr>
<tr><td><b>Rappels</b> (masqué par défaut)</td><td>Vos rappels de programmes à venir ; un programme déjà commencé reçoit le badge « MAINTENANT » et se lance d’un clic.</td></tr>
<tr><td><b>Horloge et fête du jour</b></td><td>Une grande horloge avec la date et – si elle est disponible pour votre langue – la fête du jour (sur une carte plus grande, aussi celle du lendemain).</td></tr>
<tr><td><b>Taux de change</b></td><td>Les principales devises face à votre monnaie locale, avec la variation par rapport à la veille (taux de référence de la BCE, mis à jour les jours ouvrables).</td></tr>
<tr><td><b>Sport</b></td><td>Les événements en direct, récents et à venir des championnats, équipes, sports et agendas suivis dans le Suivi sportif – tout sport (tennis, handball, disc golf, World Chase Tag…). Quand c’est possible, un bouton <b>📺</b> suggère la chaîne qui le diffuse. ${t('sportwatch', 'Suivi sportif')}</td></tr>
<tr><td><b>Recommandé pour vous</b></td><td>Programmes en cours sur des chaînes de vos catégories les plus regardées, qui ne sont pas encore vos favorites.</td></tr>
<tr><td><b>À regarder</b></td><td>Les affiches de votre liste À regarder (fiche VOD → <i>+ À regarder</i>).</td></tr>
<tr><td><b>Nouveaux épisodes</b></td><td>Les séries que vous suivez qui ont encore des épisodes non vus après le dernier regardé (« 3 nouveaux épisodes »).</td></tr>
<tr><td><b>Bientôt</b></td><td>Les programmes qui commencent dans l’heure qui vient sur vos chaînes favorites (et les grandes chaînes de votre pays), avec le badge « dans x min » et une cloche de rappel.</td></tr>
<tr><td><b>Films de ce soir</b></td><td>Les films qui commencent ce soir (à partir de 18 h) sur vos chaînes favorites et celles de votre pays, d’après la catégorie du guide TV.</td></tr>
<tr><td><b>Temps de visionnage</b></td><td>Le temps de visionnage du jour et de la semaine, les jours de la semaine en barres ; pour un profil enfant, le temps restant aujourd’hui.</td></tr>
<tr><td><b>Découvrir</b></td><td>Une chaîne (non favorite) choisie au hasard et à l’antenne en ce moment – demandez-en une autre avec <i>Une autre</i>.</td></tr>
<tr><td><b>Soleil et air</b></td><td>Lever et coucher du soleil, durée du jour, indice UV et qualité de l’air au lieu de la météo (Open-Meteo).</td></tr>
<tr><td><b>Note</b></td><td>Votre propre note (par profil), enregistrée automatiquement.</td></tr>
</table>
<p>Certains blocs ne sont pas sur l’accueil par défaut : Personnaliser → <b>Ajouter</b>.</p>
<h2>Dispositions prêtes, selon le moment de la journée</h2>
<p>Avec les boutons <b>Disposition prête</b> de la barre Personnaliser, chargez en un clic : Par défaut, Matin (météo, actualités, horloge, taux de change), Soirée télé (programmes, ce soir, reprise), Sport, Infos et bourse, Simple. Avec l’interrupteur <b>Changer selon le moment de la journée</b>, la disposition Matin s’affiche entre 5 h et 10 h, Soirée télé à partir de 18 h, et la vôtre pendant la journée.</p>
<p>Sur la carte <b>Dernière chaîne regardée</b>, l’image en direct de la chaîne démarre sans le son au bout de quelques secondes (sur ordinateur et Android, si l’aperçu en direct est activé).</p>
<p>Les rangées de chaînes se trouvent sur la page <b>TV</b> (après Accueil dans le menu). ${t('home', 'La page TV')}</p>
${go('#/settings?section=dashboard', 'Paramètres de l’accueil')}`,
  },
  {
    id: 'home',
    cat: 'find',
    title: 'La page TV (chaînes)',
    keywords: 'page tv chaînes enregistrements onglet rangées',
    body: `
<h2>Onglets</h2>
<p>La page <b>TV</b> (après Accueil dans le menu) est celle des chaînes. En haut, quatre onglets : <b>Chaînes</b>, <b>Guide TV</b>, <b>Parcourir</b> (TV en direct uniquement, avec filtres) et – dans la version de bureau – <b>Enregistrements</b> (vos propres enregistrements TV). ${t('recording', 'À propos des enregistrements')}</p>
<h2>Rangées</h2>
<p>L’onglet Chaînes comporte des rangées à défilement horizontal : Vus récemment, Vos favoris, En ce moment à la TV, les chaînes de votre pays d’origine, vos listes personnelles, les catégories (Info, Sport, Films…) et les tuiles des pays. L’<b>ordre et l’affichage des rangées se règlent par profil</b>. ${t('home-rows', 'Comment ?')}</p>
<h2>Tous les éléments d’une rangée sur une page</h2>
<p>À côté du titre de chaque rangée se trouve une <b>flèche ronde ›</b> : un clic (ou une pression) ouvre <b>tous</b> les éléments de la rangée sur une page. À la télécommande ou au clavier, une tuile <b>« Tout »</b> en fin de rangée fait la même chose (OK / Entrée). Cela fonctionne de même pour les rangées VOD, la rangée <i>Reprendre</i> et les tuiles des pays.</p>
<h2>Le pays d’origine d’abord</h2>
<p>Dans chaque liste et catégorie, les chaînes de votre <b>pays d’origine</b> viennent en premier, puis celles <b>dans sa langue</b> (p. ex. de pays voisins), et parmi elles les flux qui fonctionnent, avec logo et meilleure qualité ; l’ordre varie un peu chaque jour pour que vous découvriez toujours autre chose. Dans la recherche, une correspondance exacte du nom reste tout en haut. Le pays d’origine se modifie dans Paramètres → Contenu et enfants → Contenu. ${t('card-badges', 'Badges des cartes')}</p>`,
  },
  {
    id: 'card-badges',
    cat: 'find',
    title: 'Que signifient les badges des cartes ?',
    keywords: 'pastille vert rouge barre FHD HD 4K étoile badge icône',
    body: `
<table class="help-table">
<tr><td><span class="st st-ok"></span> pastille verte</td><td>Le flux a fonctionné la dernière fois.</td></tr>
<tr><td><span class="st st-bad"></span> pastille rouge</td><td>Lors de la vérification, aucune source n’a répondu. ${t('health', 'Vérification')}</td></tr>
<tr><td>mention <b>HORS LIGNE</b>, image grise</td><td>La chaîne n’est pas disponible pour le moment ; sous son nom : « Hors ligne – indisponible actuellement ».</td></tr>
<tr><td>mention <b>HORS ANTENNE</b></td><td>Une chaîne qui ne diffuse qu’à certains moments (pas 24h/24) et qui n’émet pas en ce moment ; sous son nom : « Hors antenne – ne diffuse pas actuellement ».</td></tr>
<tr><td>pas de pastille</td><td>Le programme ne l’a pas encore vérifiée.</td></tr>
<tr><td><b>HD / FHD / 4K</b></td><td>La meilleure qualité disponible (720p / 1080p / 2160p).</td></tr>
<tr><td>barre rouge en bas</td><td>La progression du programme en cours (s’il y a un guide TV).</td></tr>
<tr><td>★</td><td>La chaîne fait partie de vos favoris.</td></tr>
<tr><td>mention « Maintenant : … »</td><td>Le titre du programme en cours ; sans guide TV, le pays et la catégorie.</td></tr>
</table>
<p>Autres badges sur la fiche : <b>Restriction géographique</b> (peut-être visible seulement depuis ce pays), <b>Pas 24h/24</b> (ne diffuse qu’à certains moments), <b>N sources</b> (plusieurs sources de flux).</p>`,
  },
  {
    id: 'search',
    cat: 'find',
    title: 'Recherche',
    keywords: 'recherche chercher résultat programme titre accent',
    body: `
<p>Cliquez sur la loupe de l’en-tête, ou appuyez sur <kbd>/</kbd> ou <kbd>Ctrl</kbd>+<kbd>F</kbd> (le bouton jaune sur TV), et commencez à taper – les résultats s’affichent aussitôt.</p>
<h2>Que recherche-t-elle ?</h2>
<ul>
<li>le nom de la chaîne et ses autres noms (p. ex. « France 2 » trouve aussi « France 2 HD »),</li>
<li>le pays (<i>français</i>, <i>France</i> ou <i>FR</i>), la catégorie (<i>sport</i>, <i>info</i>), le réseau (<i>Pluto TV</i>), le nom de votre liste personnelle,</li>
<li>les <b>titres de programmes</b> des 48 prochaines heures (s’il y a un guide TV) – ils apparaissent à part, sous le titre « Programmes » ; ceux en cours portent le badge MAINTENANT.</li>
</ul>
<h2>Astuces</h2>
<ul>
<li>Les accents et les majuscules / minuscules n’ont pas d’importance : « meteo » = « Météo ».</li>
<li>Avec plusieurs mots, chacun doit correspondre : « sport français » ne donne que les chaînes de sport françaises.</li>
<li>Depuis le champ de recherche, passez aux résultats avec <kbd>↓</kbd> ou <kbd>Entrée</kbd>.</li>
<li>Un clic sur un programme trouvé ouvre sa fiche, d’où vous pouvez le regarder tout de suite ou demander un rappel.</li>
</ul>`,
  },
  {
    id: 'browse',
    cat: 'find',
    title: 'Parcourir et filtres',
    keywords: 'parcourir filtre catégorie pays langue qualité état tri',
    body: `
<p>La page <b>Parcourir</b> affiche toutes les chaînes (visibles pour votre profil). Sans filtre, les tuiles de catégories et de pays en haut vous aident.</p>
<table class="help-table">
<tr><td><b>Recherche</b></td><td>Texte dans le nom, un autre nom, le pays ou la catégorie de la chaîne – s’applique <b>avec</b> les autres filtres (p. ex. « maison » + France + français). Depuis la page de résultats de la recherche de l’en-tête, le bouton <i>Filtrer par pays, langue, catégorie</i> vous amène ici avec le texte recherché.</td></tr>
<tr><td><b>Catégorie</b></td><td>Info, Sport, Films, Jeunesse, Musique… (entre parenthèses, le nombre de chaînes).</td></tr>
<tr><td><b>Pays</b></td><td>Le pays de la chaîne.</td></tr>
<tr><td><b>Langue</b></td><td>La langue du flux (quand elle est connue).</td></tr>
<tr><td><b>Qualité</b></td><td>HD (720p) ou Full HD (1080p) et mieux.</td></tr>
<tr><td><b>État</b></td><td>Fonctionnelle / non vérifiée / indisponible. ${t('health', 'Vérification')}</td></tr>
<tr><td><b>Tri</b></td><td>Ordre recommandé, par nom ou par pays.</td></tr>
</table>
<p>Les filtres se combinent (p. ex. Sport + Allemagne + HD). Le bouton <b>Effacer les filtres</b> les réinitialise tous. La liste se charge progressivement au défilement.</p>`,
  },
  {
    id: 'channel-info',
    cat: 'find',
    title: 'La fiche de la chaîne',
    keywords: 'fiche information détails pays langue propriétaire site source',
    body: `
<p>Pour l’ouvrir : le bouton ⌄ de la carte, un clic droit, la touche <kbd>I</kbd>, ou le bouton ⓘ pendant la lecture.</p>
<h2>Que contient-elle ?</h2>
<ul>
<li><b>En-tête</b> : logo, nom, état, qualité, nombre de sources, restrictions, le programme en cours avec description et progression ; boutons Lire et Favori.</li>
<li><b>Programmes</b> : d’hier à après-demain, par jour ; le programme en cours mis en évidence. Pour un programme à venir, demandez un rappel avec le bouton 🔔. ${t('reminders', 'Rappels')}</li>
<li><b>Données</b> : pays, catégorie, langue, réseau, propriétaire, année de lancement, arrêt, autres noms, fuseau horaire, nom de la liste personnelle, site web (s’ouvre dans le navigateur du système).</li>
<li><b>Sources de flux</b> : toutes les sources avec état, qualité et restrictions ; chacune se lance séparément ▶. Le bouton <b>Vérifier les sources</b> les teste toutes immédiatement.</li>
</ul>`,
  },

  // ===================================================================== Guide TV
  {
    id: 'guide-grid',
    cat: 'guide',
    title: 'La grille du guide TV',
    keywords: 'guide tv epg grille frise maintenant jour demain',
    body: `
<p>La page <b>Guide TV</b> présente les programmes des chaînes sur une frise : une chaîne par ligne, le temps à l’horizontale (avec des repères toutes les demi-heures). La ligne verticale rouge marque <b>l’instant présent</b>.</p>
<h2>Filtres</h2>
<ul>
<li><b>Favoris</b> – vos chaînes favorites dans leur propre ordre,</li>
<li><b>[Pays d’origine]</b> – les chaînes de votre pays,</li>
<li><b>Toutes les chaînes</b> – toutes celles qui ont des données de programme.</li>
</ul>
<p>Sélecteur de jour : d’hier à 3 jours plus tard. Le bouton <b>Aller à maintenant</b> vous ramène au présent.</p>
<p><b>Catégorie</b> (Film, Série, Sport, Info, Jeunesse, Documentaire, Divertissement, Musique) : seules restent les chaînes qui diffusent un tel programme ce jour-là, les autres programmes apparaissent en grisé. La reconnaissance s’appuie sur la catégorie du guide TV et le titre du programme.</p>
<p><b>Frise / En ce moment</b> : dans la vue <i>En ce moment</i>, une grande carte par chaîne montre le programme en cours (avec progression) et le suivant – pour un coup d’œil rapide, confortable aussi à la télécommande.</p>
<p>Sur la fiche d’un programme, le bouton <b>Au calendrier</b> enregistre un fichier d’agenda (.ics) que Google Agenda, Outlook ou l’agenda du téléphone savent importer (avec un rappel 5 minutes avant) ; sur ordinateur, le bouton <b>● Enregistrer</b> programme l’enregistrement du programme (${t('recording', 'Enregistrement')}).</p>
<h2>Utilisation</h2>
<ul>
<li>Cliquez sur un <b>programme</b> : sa fiche s’ouvre (description, durée, catégorie) – avec <i>Regarder maintenant</i> s’il est en cours, et un bouton <i>Rappel</i> s’il est à venir.</li>
<li>Cliquez sur le <b>nom de la chaîne</b> à gauche : elle démarre aussitôt ; le changement haut/bas parcourt alors les chaînes de la grille.</li>
<li>Les programmes en cours ont un fond rouge foncé, les programmes passés sont grisés, ceux avec rappel portent 🔔.</li>
</ul>
<p>Seules les chaînes ayant des données de programme apparaissent. ${t('trouble-epg', 'Pourquoi pas toutes les chaînes ?')}</p>`,
  },
  {
    id: 'reminders',
    cat: 'guide',
    title: 'Rappels',
    keywords: 'rappel notification cloche alerte commence',
    body: `
<p>Vous pouvez demander un rappel pour un programme à venir dans le guide TV (cliquez sur le programme → <b>🔔 Rappel</b>), sur la fiche de la chaîne (la 🔔 à côté du programme) ou depuis les résultats de recherche.</p>
<ul>
<li><b>Chaque diffusion</b> : sur la fiche du programme, le bouton <b>↻ Chaque diffusion</b> demande un rappel pour toutes les diffusions du programme sur cette chaîne (séries, journaux, émissions régulières). Les terminaisons du type « – Épisode 312 » sont ignorées, et les diffusions des 7 prochains jours sont ajoutées automatiquement.</li>
<li><b>Quand sonne-t-il ?</b> Paramètres → Notifications → Rappels : au début ou 1 à 30 minutes avant.</li>
<li><b>Basculement automatique</b> : activé, il bascule sur la chaîne au début du programme (après un compte à rebours de 8 secondes que le bouton <i>Je reste</i> interrompt), si Adás est ouvert.</li>
<li>L’icône 🔔 de l’en-tête affiche vos rappels et règles « chaque diffusion » ; vous pouvez aussi les y supprimer.</li>
<li>Les rappels sont enregistrés <b>par profil</b> et suivent le profil quand il est transféré.</li>
</ul>
<h2>Où et comment notifie-t-il ?</h2>
<table class="help-table">
<tr><td><b>Windows / Mac / Linux</b></td><td>Dans le programme et dans le centre de notifications du système ; un clic lance la chaîne. Avec le réglage <i>Fonctionner en arrière-plan</i>, il sonne même après la fermeture de la fenêtre (Adás reste dans la zone de notification), et <i>Lancer avec le système</i> le démarre dans la zone de notification à l’ouverture de session (sur Mac dans la barre des menus ; sous Linux, il est ajouté aux programmes lancés automatiquement). Sous Linux, l’icône de la zone de notification nécessite la prise en charge d’AppIndicator (sous GNOME, l’extension <i>AppIndicator</i>) ; sans elle, la fenêtre masquée réapparaît quand on relance le programme.</td></tr>
<tr><td><b>Android, Android TV</b></td><td>Le système vous avertit – même si Adás est fermé, et aussi après un redémarrage du téléphone. La première fois, il faut autoriser les notifications. Un clic lance la chaîne.</td></tr>
<tr><td><b>Téléviseur LG</b></td><td>Il sonne si Adás est lancé ; en surimpression par-dessus les autres applications TV.</td></tr>
<tr><td><b>Navigateur</b></td><td>Seulement tant que la page est ouverte.</td></tr>
</table>
<div class="note">Avec la version portable (sans installation) pour Windows, Windows n’affiche pas toujours la notification système – la notification dans le programme apparaît quand même. La version installée n’a pas cette limitation.</div>
${go('#/settings?section=reminders', 'Paramètres des rappels')}`,
  },
  {
    id: 'epg-sources',
    cat: 'guide',
    title: 'Sources du guide TV',
    keywords: 'epg xmltv source association actualisation guide tv personnel',
    body: `
<p>Les données de programmes proviennent de sources au format <b>XMLTV</b>. Dans Paramètres → Guide TV, vous voyez chacune : à combien de chaînes elle a été associée, combien de programmes elle contient et, en cas d’échec, quelle est l’erreur.</p>
<h2>Sources intégrées</h2>
<ul>
<li>Activées par défaut : la ou les sources de votre pays d’origine (défini au premier démarrage) et la source propre de la liste de lecture.</li>
<li>Activables : Hongrie, Slovaquie, Roumanie, Allemagne, Royaume-Uni, États-Unis, France, Italie, Espagne, ainsi que les guides des chaînes Pluto TV, Samsung TV Plus et Plex. Plus il y a de sources activées, plus le chargement est long.</li>
</ul>
<h2>Source personnelle</h2>
<p><b>Ajouter une source XMLTV</b> : n’importe quelle adresse <code>.xml</code> ou <code>.xml.gz</code> peut être indiquée (p. ex. le guide de votre fournisseur ou d’un site communautaire). Une source nouvellement ajoutée se place en tête de liste et a la priorité.</p>
<h2>Comment se fait l’association ?</h2>
<p>Le programme compare l’identifiant et le nom affiché des chaînes de la source avec la liste des chaînes : d’abord l’identifiant exact, puis identifiant + pays, nom + pays, et enfin un nom sans ambiguïté. Si plusieurs sources ont des données pour une chaîne, celle placée le plus haut dans la liste l’emporte.</p>
<p><b>Actualisation</b> : automatique à la fréquence choisie (toutes les 3 à 48 heures), ou immédiate avec <i>Actualiser le guide TV maintenant</i>, ou l’option <i>Actualiser la liste des chaînes</i> du menu du profil.</p>`,
  },

  // ===================================================================== Personnalisation
  {
    id: 'profiles',
    cat: 'personal',
    title: 'Profils',
    keywords: 'profil utilisateur qui regarde changer couleur créer supprimer',
    body: `
<p>Chaque membre de la famille peut utiliser son propre profil. Au démarrage (s’il y a plusieurs profils), l’écran <b>« Qui regarde ? »</b> vous accueille ; ensuite, vous changez de profil en cliquant sur la photo de profil de l’en-tête.</p>
<h2>Gestion</h2>
<p>Menu du profil → <b>Gérer les profils</b> → cliquez sur un profil pour le modifier (nom, photo de profil, couleur, profil enfant, suppression), ou sur le bouton <b>Ajouter un profil</b>.</p>
<h2>Photo de profil</h2>
<p>Dans l’éditeur, choisissez parmi 11 photos de profil dessinées (renard, lapin, robot, personnages, vases zen…), ou la version <b>lettre</b> : l’initiale du nom sur un fond de la couleur choisie. La photo de profil apparaît sur l’écran « Qui regarde ? », dans l’en-tête et dans le menu du profil.</p>
<p><b>Image personnelle</b> : avec le bouton <i>Importer une image personnelle…</i>, choisissez n’importe quelle image PNG (ou JPG, WebP). Le programme la recadre en carré (depuis le centre) et la réduit à 256×256 pixels ; l’image est enregistrée avec le profil et le suit donc sur les autres appareils. Sur TV, il n’y a pas de sélecteur de fichier : l’image d’un profil repris de l’ordinateur y apparaît.</p>
<h2>Qu’est-ce qui appartient au profil, et qu’est-ce qui est commun ?</h2>
<table class="help-table">
<tr><th>Séparé pour chaque profil</th><th>Commun à tous les profils</th></tr>
<tr><td>Favoris et leur ordre (numéros de chaîne)<br>Chaînes vues récemment<br>Rappels<br>Style de l’interface<br>Ordre des rangées de l’accueil<br>Réglage profil enfant</td>
<td>Listes de chaînes et chaînes personnelles<br>Sources du guide TV<br>Pays d’origine, réglages de lecture<br>Résultats de la vérification de disponibilité<br>Volume</td></tr>
</table>
${go('#/profiles', 'Gérer les profils')}`,
  },
  {
    id: 'kids',
    cat: 'personal',
    title: 'Profil enfant et contenu pour adultes',
    keywords: 'enfant jeunesse profil enfant adulte filtre 18 nsfw contrôle parental',
    body: `
<h2>Profil enfant</h2>
<p>En modifiant un profil, activez <b>Profil enfant</b>. Par défaut, seul le <b>contenu jeunesse</b> apparaît alors – sur l’accueil, les pages TV et VOD, dans Parcourir, la recherche et le guide TV. La carte des actualités n’est pas non plus affichée dans un profil enfant.</p>
<h2>Qu’est-ce qui compte comme contenu jeunesse ?</h2>
<p>Par défaut, les chaînes des catégories <b>Jeunesse, Animation, Famille et Éducation</b>, ainsi que les films et séries des groupes / genres jeunesse, famille et animation (jamais les genres pour adultes). Cette marque est <b>commune à tous les profils</b> et peut être modifiée à la main : sur la <b>fiche</b> de la chaîne ou du film / de la série avec le bouton <b>Contenu jeunesse</b> (dans un profil adulte), ou dans la liste Paramètres → Contenu et enfants → <b>Profils enfant – que peuvent-ils regarder ?</b>.</p>
<h2>Que peut regarder le profil enfant ?</h2>
<p>Paramètres → Contenu et enfants → <b>Profils enfant – que peuvent-ils regarder ?</b> : dans l’onglet <b>Chaînes TV</b> ou <b>VOD</b>, chaque ligne comporte l’interrupteur commun <i>Contenu jeunesse</i> et, à côté, <b>un interrupteur pour chaque profil enfant</b> (avec le nom du profil) : ainsi, l’aîné peut regarder ce que le plus jeune ne peut pas. Le filtre montre ce qui est contenu jeunesse, tout, ou ce qu’un profil enfant donné peut / ne peut pas regarder ; la recherche permet d’affiner, et vous pouvez autoriser / bloquer d’un coup les résultats visibles pour un profil enfant. Depuis un profil enfant, les paramètres ne s’ouvrent qu’avec un code PIN.</p>
<h2>Temps quotidien et limite d’âge</h2>
<p>Au même endroit, pour chaque profil enfant, vous pouvez définir le <b>temps de visionnage quotidien</b> (de 30 minutes à 4 heures, ou illimité) et la <b>limite d’âge</b> (6, 12, 16, 18 ans). Un avertissement apparaît 5 et 1 minute avant la fin ; une fois le temps écoulé, la lecture s’arrête et ne peut continuer qu’avec le code PIN d’un profil adulte (+30 minutes). Si, selon le guide TV, la classification d’un programme en direct dépasse celle définie, le flux ne démarre pas (ou s’arrête au début du programme) – il peut être débloqué pour ce programme avec le code PIN parental. (Tous les guides TV n’indiquent pas la classification ; sans données, pas de restriction.)</p>
<div class="tip">Pour les restrictions, définissez un code PIN pour un profil adulte (Gérer les profils) – sans code PIN, n’importe qui peut les lever.</div>
<p>Une chaîne pour adultes (18+) n’apparaît jamais dans un profil enfant, même si vous l’autorisez à la main.</p>
<h2>Contenu pour adultes</h2>
<p>Les chaînes pour adultes (18+) sont masquées par défaut. Pour les afficher : Paramètres → Contenu et enfants → Contenu → <b>Afficher le contenu pour adultes</b> (avec confirmation). Le filtrage s’appuie sur le classement et la liste de blocage d’iptv-org.</p>
<div class="warn">Le filtrage repose sur les marques de la base publique ; il n’est donc pas parfait. Avec de jeunes enfants, mieux vaut surveiller l’utilisation ; le changement de profil depuis un profil enfant n’est protégé que si un profil adulte a un code PIN.</div>`,
  },
  {
    id: 'favorites',
    cat: 'personal',
    title: 'Favoris et historique',
    keywords: 'favori étoile ordre glisser historique vus récemment effacer',
    body: `
<h2>Marquer un favori</h2>
<ul>
<li>le bouton <b>+</b> de la carte (au survol), ou la touche <kbd>F</kbd> sur la carte sélectionnée (le bouton rouge sur TV),</li>
<li>le bouton + de la fiche ; pendant la lecture, le bouton + ou la touche <kbd>S</kbd>.</li>
</ul>
<h2>Ordre</h2>
<p>Sur la page <b>Favoris</b>, réorganisez les cartes en les faisant glisser à la souris. Le nombre en haut à gauche d’une carte est le <b>numéro de chaîne</b> ; saisissez-le pendant la lecture pour y basculer. ${t('channel-switching', 'Numéros de chaîne')}</p>
<h2>Historique</h2>
<p>Les 30 dernières chaînes regardées figurent dans la première rangée de l’accueil et en bas de la page Favoris. Pour effacer : Favoris → <b>Effacer l’historique</b>. Paramètres → Lecture → <i>Reprendre la dernière chaîne au démarrage</i> : la dernière chaîne regardée démarre automatiquement au lancement.</p>`,
  },
  {
    id: 'themes',
    cat: 'personal',
    title: 'Styles de l’interface',
    keywords: 'thème style apparence zen wabi sabi clair sombre néon manga comics console',
    body: `
<p>L’apparence de l’interface se choisit par profil : <b>Paramètres → Apparence → Style de l’interface</b> (menu déroulant, ou cliquez sur les aperçus). Le changement s’applique immédiatement.</p>
<p>La <b>disposition est la même dans tous les styles</b> (barre de menu en haut, mêmes tailles de cartes, rangées et cartes sur l’accueil) – le style ne donne que l’apparence : couleurs, police, bordures, ombres, motifs de fond, animations.</p>
<table class="help-table">
<tr><th colspan="2">Styles sombres</th></tr>
<tr><td><b>Kurenai</b></td><td>(cramoisi) Séance du soir : fond noir, accents rouges, cartes qui s’agrandissent au survol.</td></tr>
<tr><td><b>Mahō</b></td><td>(magie) Un dégradé bleu profond féerique, cartes arrondies aux bords lumineux.</td></tr>
<tr><td><b>Murasaki</b></td><td>(pourpre) Dégradés violet–rose, accents lumineux.</td></tr>
<tr><td><b>Akane</b></td><td>(rouge profond) Base noire, repères rouges, titres de rangées en majuscules.</td></tr>
<tr><td><b>Shinkai</b></td><td>(grands fonds) Fond bleu nuit, accents bleu océan.</td></tr>
<tr><td><b>Garasu</b></td><td>(verre) Fond noir profond, surfaces translucides et floutées, ombres flottantes.</td></tr>
<tr><td><b>Futago</b></td><td>(jumeaux) Un menu de console portable : base gris foncé, paire de manettes rouge–bleu, tuiles carrées à bordure turquoise pulsante.</td></tr>
<tr><td><b>Neon City</b></td><td>Une ville de néons la nuit : jaune néon, cyan et magenta, cartes à coins coupés, lignes de balayage, « glitch » à la sélection.</td></tr>
<tr><td><b>Neo-Tokyo</b></td><td>L’univers d’AKIRA : silhouette d’une ville en ruine la nuit en bas de la fenêtre, traînées lumineuses rouges de motos lancées, logo en capitales rouge Kaneda avec badge capsule blanc, titres penchés, sélection rougeoyante.</td></tr>
<tr><td><b>Kyokkō</b></td><td>(aurore) Fond coloré ondulant lentement, cartes en verre dépoli, sélection lumineuse. (Sur TV, le fond ne bouge pas.)</td></tr>
<tr><td><b>Phosphor</b></td><td>Un moniteur à phosphore vert : police à chasse fixe, titres de rangées façon <code>$ ls</code>, sélection inversée.</td></tr>
<tr><th colspan="2">Styles clairs</th></tr>
<tr><td><b>Zen</b></td><td>Fond blanc papier de riz, accents vert mousse, beaucoup d’espace, mouvements calmes et lents, un cercle ensō dans le logo.</td></tr>
<tr><td><b>Wabi-sabi</b></td><td>Texture de papier chaude aux tons terreux, cartes légèrement irrégulières, rouille et indigo, une fissure dorée de kintsugi au survol.</td></tr>
<tr><td><b>Asobiba</b></td><td>(aire de jeux) Fond rayé, cartes « bulles » bordées de blanc, mouvements élastiques, sélection turquoise pulsante.</td></tr>
<tr><td><b>Hiroba</b></td><td>(place) Le menu de console à « chaînes » : fond blanc finement rayé, tuiles brillantes à bordure grise, sélection bleue.</td></tr>
<tr><td><b>16-Bit</b></td><td>La console de salon grise des années 90 : boutons violets, pastilles A–B–X–Y colorées près du logo, bordures pixelisées, titres en lettres pixelisées.</td></tr>
<tr><td><b>Manga</b></td><td>Encre noire sur papier blanc : trames (ombrage en points), cadres de cases épais, images en niveaux de gris (en couleur à la sélection), boutons en bulles.</td></tr>
<tr><td><b>Pow!</b></td><td>Comics américains : points Ben-Day, rouge–jaune–bleu, contours noirs épais avec ombre décalée, titres de rangées en cartouches jaunes, explosion « POW! » sur les fenêtres.</td></tr>
<tr><td><b>Kikagaku</b></td><td>(géométrie) Art de l’affiche : rouge–bleu–jaune–noir, cartes à épaisse bordure noire et ombres franches, rangées numérotées.</td></tr>
<tr><td><b>Rakugaki</b></td><td>(gribouillage) Une page de cahier lignée écrite à la main : les chaînes sont des polaroïds collés, les boutons dessinés au crayon.</td></tr>
</table>
<p>Les blocs (tuiles) de l’accueil prennent aussi une apparence assortie au style (bordure, ombre, fond, titres). Le lecteur reste sombre dans tous les styles, pour mettre l’image en valeur.</p>
<p><b>Thème personnel</b> : en important un fichier de thème ou (sur ordinateur) en le copiant dans le dossier des thèmes – Paramètres → Apparence → <i>Mes thèmes</i>. ${t('custom-theme', 'Créer un thème personnel')}</p>
${go('#/settings', 'Réglages d’apparence')}`,
  },
  {
    id: 'custom-theme',
    cat: 'personal',
    title: 'Créer un thème personnel',
    keywords: 'thème personnel créer fichier de thème adastheme json css couleurs police dossier importer modèle',
    body: `
<p>Un thème est un unique <b>fichier JSON</b> (<code>.adastheme</code> ou <code>.json</code>) qui définit l’<b>apparence</b> de l’interface : couleurs, polices, fond et CSS décoratif. Il <b>ne peut pas modifier la disposition</b> – Adás filtre automatiquement le CSS qui change taille, espacement, position ou visibilité, si bien qu’un thème ne désorganise jamais l’interface. La description complète (avec un exemple) se trouve dans le code source : <code>docs/TEMA-KESZITES.md</code> (en hongrois).</p>
<h2>Chargement</h2>
<ul>
<li><b>Import</b> (sur tous les appareils) : Paramètres → Apparence → <i>Mes thèmes</i> → <b>Importer un fichier de thème…</b> Le thème rejoint les paramètres (la sauvegarde et la synchronisation l’emportent aussi).</li>
<li><b>Dossier des thèmes</b> (bureau) : le sous-dossier <code>themes</code> du dossier de données (<b>Ouvrir le dossier des thèmes</b>), ou un dossier à vous (<b>Autre dossier de thèmes…</b>). Les fichiers copiés sont lus au démarrage et avec le bouton <b>Relire le dossier des thèmes</b> – pratique pour les modifier.</li>
<li><b>Enregistrer un modèle à partir du style actuel</b> : un fichier de thème rempli avec les couleurs du style utilisé – un bon point de départ.</li>
</ul>
<h2>Les champs du fichier</h2>
<table class="help-table">
<tr><td><code>adasTheme</code></td><td><b>Obligatoire</b>, valeur <code>1</code>.</td></tr>
<tr><td><code>id</code></td><td><b>Obligatoire</b> : 2 à 40 caractères, minuscules, chiffres, tiret (p. ex. <code>sakura</code>). Le même <code>id</code> remplace l’ancien.</td></tr>
<tr><td><code>name</code></td><td><b>Obligatoire</b> : le nom affiché dans le sélecteur de style.</td></tr>
<tr><td><code>description</code>, <code>author</code></td><td>Description, auteur.</td></tr>
<tr><td><code>tone</code></td><td><code>"dark"</code> (par défaut) ou <code>"light"</code>.</td></tr>
<tr><td><code>base</code></td><td>Un style intégré dont il reprend les décorations : <code>netflix</code> (Kurenai), <code>disney</code> (Mahō), <code>skyshowtime</code> (Murasaki), <code>rakuten</code> (Akane), <code>prime</code> (Shinkai), <code>apple</code> (Garasu), <code>zen</code>, <code>wabisabi</code>, <code>nintendo</code> (Asobiba), <code>switch</code> (Futago), <code>wii</code> (Hiroba), <code>cyberpunk</code> (Neon City), <code>neotokyo</code>, <code>manga</code>, <code>comic</code> (Pow!), <code>snes</code> (16-Bit), <code>bauhaus</code> (Kikagaku), <code>aurora</code> (Kyokkō), <code>sketch</code> (Rakugaki), <code>terminal</code> (Phosphor). Vide : base neutre.</td></tr>
<tr><td><code>colors</code></td><td><code>bg</code> (fond), <code>bg2</code> (cartes, panneaux), <code>bg3</code>, <code>bg4</code> (autres surfaces), <code>line</code> (lignes), <code>text</code>, <code>textStrong</code> (titres), <code>muted</code> (texte atténué), <code>accent</code>, <code>accent2</code> (mise en valeur). Dans le CSS, disponibles sous <code>var(--bg)</code>, <code>var(--bg-2)</code>, <code>var(--accent)</code>…</td></tr>
<tr><td><code>fonts</code></td><td><code>body</code> et <code>headings</code> : <code>font-family</code> CSS – polices installées uniquement, toujours avec une police de secours.</td></tr>
<tr><td><code>radius</code></td><td>Arrondi de base, p. ex. <code>"8px"</code>.</td></tr>
<tr><td><code>background</code></td><td>Le fond de la page (couleur, dégradé, motif).</td></tr>
<tr><td><code>preview</code></td><td>Les trois couleurs de l’aperçu du sélecteur : fond, mise en valeur, carte.</td></tr>
<tr><td><code>css</code></td><td>CSS décoratif. Chaque règle est limitée au thème ; <code>&amp;</code> = le thème lui-même (le <code>body</code>).</td></tr>
</table>
<h2>Que peut faire le CSS, et que ne peut-il pas faire ?</h2>
<p><b>Autorisé</b> : couleurs, fonds, bordures, <code>border-radius</code>, <code>box-shadow</code>, <code>text-shadow</code>, <code>filter</code>, <code>backdrop-filter</code>, <code>transform</code>, <code>transition</code>, <code>animation</code>, <code>@keyframes</code>, <code>@media</code>, famille / graisse de police, <code>letter-spacing</code>, <code>text-transform</code>, <code>clip-path</code>, images sous la forme <code>url(https://…)</code> ou <code>url(data:…)</code>.</p>
<p><b>Filtré</b> (sur les éléments ordinaires) : <code>width</code>, <code>height</code>, <code>margin</code>, <code>padding</code>, <code>top</code>/<code>left</code>/…, <code>gap</code>, <code>display</code>, <code>flex</code>, <code>grid</code>, <code>font-size</code>, <code>line-height</code>, <code>overflow</code>, <code>visibility</code>, <code>position</code> (sauf <code>relative</code>) et similaires. Sur les pseudo-éléments décoratifs <code>::before</code> / <code>::after</code>, ils sont aussi utilisables (donnez-leur <code>pointer-events: none</code>). Toujours interdit : <code>@import</code>, <code>javascript:</code>.</p>
<h2>Éléments décorables</h2>
<p><code>#nav</code> (barre de menu), <code>.brand</code> (logo), <code>.links a.active</code>, <code>.btn</code> / <code>.btn.primary</code>, <code>.row-title</code>, <code>.card</code> / <code>.thumb</code> / <code>.card .name</code> (carte de chaîne), <code>.tile</code>, <code>.vposter</code> (affiche VOD), <code>.dcard</code> / <code>.dc-title</code> (bloc de l’accueil), <code>.d-row</code>, <code>.modal</code>, <code>.tab.active</code>, <code>.switch:checked</code>, <code>.input</code>, <code>.now-label</code>, <code>.bar i</code>, <code>.profile .avatar</code>, <code>:focus-visible</code> (sélection – le plus important sur TV). Sur TV, désactivez avec le préfixe <code>&amp;.tv</code> les effets qui ralentissent (flou, animation infinie).</p>
<h2>Exemple complet</h2>
<pre class="code">{
  "adasTheme": 1,
  "id": "sakura",
  "name": "Sakura",
  "description": "Fleur de cerisier : rose clair, ombres douces.",
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
<div class="tip"><b>Avec l’intelligence artificielle</b> : collez-lui cette page d’aide (ou <code>docs/TEMA-KESZITES.md</code>) et décrivez l’ambiance du thème souhaité – avec les champs ci-dessus, elle vous fournit un fichier de thème prêt à importer.</div>
<div class="note">Pour un fichier erroné, un message jaune sous la liste <i>Mes thèmes</i> indique l’erreur (p. ex. JSON non valide, <code>id</code> incorrect). Les propriétés CSS filtrées ne provoquent pas d’erreur ; elles ne s’appliquent simplement pas.</div>
${go('#/settings', 'Réglages d’apparence')}`,
  },
  {
    id: 'home-rows',
    cat: 'personal',
    title: 'Ordre des rangées des pages TV et VOD',
    keywords: 'ordre rangées catégories trier masquer page tv vod genre glisser',
    body: `
<p>Paramètres → Apparence → <b>Rangées de la page TV</b>, et Paramètres → VOD et médiathèque → Listes VOD → <b>Rangées de la page VOD</b>. La liste présente les rangées dans leur ordre d’affichage. Le réglage ne s’applique <b>qu’au profil actuel</b>. Pour la VOD, les rangées sont : Reprendre, À regarder, Séries, Films recommandés, les genres unifiés (avec au moins 6 titres), une rangée par liste, Autres films.</p>
<ul>
<li><b>Déplacer</b> : saisissez la rangée par la poignée ⋮⋮ et faites-la glisser à sa place, ou utilisez les boutons ⌃ / ⌄ (aussi à la télécommande : restez sur le bouton et appuyez plusieurs fois).</li>
<li><b>Masquer</b> : l’interrupteur à côté de la rangée. Une rangée masquée apparaît en grisé dans la liste, mais pas sur la page.</li>
<li><b>Ordre par défaut</b> : réinitialise tout.</li>
</ul>
<p>Rangées disponibles : Vus récemment, Vos favoris, En ce moment à la TV, chaînes du pays, Listes personnelles (chaque liste personnelle et vos chaînes personnelles sur des rangées séparées), toutes les catégories, Découvrez des pays, ainsi que la rangée de tuiles Catégories, masquée par défaut.</p>
<div class="tip">Une rangée de catégorie n’apparaît que si elle compte au moins 3 chaînes ; dans un profil enfant, seules les catégories adaptées aux enfants s’affichent.</div>`,
  },
  {
    id: 'settings-overview',
    cat: 'personal',
    title: 'Aperçu des paramètres',
    keywords: 'paramètres options préférences',
    body: `
<p>Les paramètres sont organisés en groupes. À droite de l’en-tête, vous choisissez entre deux dispositions (le choix est conservé) :</p>
<ul>
<li><b>▦ Tuiles</b> : de grandes tuiles sur la page d’entrée (icône + courte description) ; un clic sur une tuile ouvre le groupe, et le bouton <i>‹ Tous les paramètres</i> (ou Retour) vous ramène. Pratique sur TV, à la télécommande.</li>
<li><b>☰ Onglets</b> : les onglets des groupes en haut (défilement horizontal sur téléphone), le groupe choisi en dessous.</li>
</ul>
<p>En haut de chaque groupe, une ou deux phrases indiquent ce que vous y trouverez. Le <b>champ de recherche</b> cherche dans tous les paramètres, dans les deux vues (p. ex. <i>sous-titres</i>, <i>thème</i>, <i>synchro</i>) : les sections contenant un résultat s’affichent, les lignes correspondantes mises en évidence.</p>
<table class="help-table">
<tr><td><b>🎨 Apparence</b></td><td>Langue et style de l’interface, thèmes personnels, ordre des rangées de la page TV. ${t('themes', 'Styles')}</td></tr>
<tr><td><b>🏠 Accueil</b></td><td>Tuiles de l’accueil, météo, sources d’actualités, aperçu en direct. ${t('dashboard', 'Accueil')}</td></tr>
<tr><td><b>▶️ Lecture</b></td><td>Source de secours, qualité maximale, volume, moteur de lecture et pont de lecture, boutons du lecteur. ${t('engines', 'Moteurs')}</td></tr>
<tr><td><b>💬 Sous-titres et informations</b></td><td>Sources de sous-titres (Feliratok.eu, OpenSubtitles, SubDL), apparence des sous-titres, piste audio préférée, descriptions et affiches en français. ${t('subtitles', 'Sous-titres')}</td></tr>
<tr><td><b>⏺ Enregistrements</b></td><td>Dossier des enregistrements, marges avant / après le programme, derniers enregistrements (version de bureau). ${t('recording', 'Enregistrement')}</td></tr>
<tr><td><b>📺 Listes de chaînes</b></td><td>Listes intégrées et personnelles, chaînes personnelles, vérification de disponibilité. ${t('lists', 'Listes')}</td></tr>
<tr><td><b>🎬 VOD et médiathèque</b></td><td>Listes de films et de séries, packs complémentaires, médiathèque personnelle (NAS), rangées de la page VOD. ${t('vod-lists', 'Listes VOD')}</td></tr>
<tr><td><b>🗓️ Guide TV</b></td><td>Sources et actualisation du guide TV. ${t('epg-sources', 'Guide TV')}</td></tr>
<tr><td><b>👪 Contenu et enfants</b></td><td>Pays d’origine, contenus masqués et pour adultes, ce que peuvent regarder les profils enfant. ${t('kids', 'Détails')}</td></tr>
<tr><td><b>🔔 Notifications</b></td><td>Rappels, basculement automatique, fonctionnement en arrière-plan. ${t('reminders', 'Détails')}</td></tr>
<tr><td><b>📱 Télécommande et touches</b></td><td>Le téléphone comme télécommande (par QR code), raccourcis clavier, boutons de la télécommande TV. ${t('remote', 'Télécommande')}</td></tr>
<tr><td><b>🔄 Synchronisation entre appareils</b></td><td>Transférer paramètres, profils et listes vers un autre appareil avec un code.</td></tr>
<tr><td><b>💾 Profils et sauvegarde</b></td><td>Profils, sauvegarde et restauration, sauvegardes automatiques, cache. ${t('backup', 'Détails')}</td></tr>
<tr><td><b>⬆️ Mises à jour</b></td><td>Rechercher et installer une nouvelle version depuis GitHub ; la recherche au démarrage peut être désactivée. ${t('update', 'Mises à jour')}</td></tr>
<tr><td><b>ℹ️ À propos</b></td><td>Version, emplacement du dossier de données, sources des données.</td></tr>
</table>
${go('#/settings', 'Ouvrir les Paramètres')}`,
  },
  {
    id: 'backup',
    cat: 'personal',
    title: 'Sauvegarde, restauration, cache',
    keywords: 'sauvegarde restauration copie exporter importer cache vider déménagement',
    body: `
<h2>Enregistrer dans un fichier</h2>
<p>Paramètres → Profils et sauvegarde → <b>Enregistrer dans un fichier</b> : écrit dans un fichier <code>.json</code> les paramètres, tous les profils avec favoris, historique, rappels, style et ordre, ainsi que vos listes et chaînes personnelles. Vous pouvez ainsi tout emporter sur un autre ordinateur.</p>
<h2>Restaurer</h2>
<p><b>Restaurer depuis un fichier</b> : le fichier enregistré écrase les paramètres et profils actuels (avec confirmation), puis le programme redémarre.</p>
<p><b>Ajouter des profils depuis un fichier</b> : ne reprend que les profils de la sauvegarde (avec favoris, historique, rappels, photo de profil, code PIN) ; les paramètres, listes et autres profils actuels sont conservés, et un profil identique est mis à jour. La même chose fonctionne par le réseau avec l’interrupteur <b>Profils uniquement</b> de la <i>Synchronisation entre appareils</i>.</p>
<h2>Le fichier de profils est-il le même partout ?</h2>
<p>Oui : toutes les versions (Windows, Mac, Linux, TV LG, Android, navigateur) utilisent le même format, donc une sauvegarde se charge sur n’importe quel appareil. Là où il n’y a pas de sélecteur de fichier (TV), passez par le réseau (<i>Synchronisation entre appareils</i>) ou une adresse web.</p>
<table class="help-table">
<tr><th>Version</th><th>Où sont les données ?</th></tr>
<tr><td>Windows</td><td><code>%APPDATA%\\Adás\\store.json</code> (la version installée comme la version portable enregistrent ici)</td></tr>
<tr><td>macOS / Linux</td><td><code>~/Library/Application Support/Adás/store.json</code> / <code>~/.config/Adás/store.json</code></td></tr>
<tr><td>Android, Android TV</td><td>Dans le stockage propre et protégé de l’application (inaccessible de l’extérieur ; perdu à la désinstallation – sauvegardez avant)</td></tr>
<tr><td>TV LG</td><td>Dans le stockage propre de l’application (perdu à la désinstallation)</td></tr>
<tr><td>Navigateur</td><td>Dans le stockage local du navigateur, séparément pour chaque adresse</td></tr>
</table>
<h2>Vider le cache</h2>
<p>Supprime les listes téléchargées, le guide TV et le catalogue traité – tout est retéléchargé au prochain démarrage. Utile si quelque chose est « bloqué ». Vos paramètres et profils ne sont pas touchés.</p>
<div class="note">Sur TV, l’enregistrement dans un fichier n’est pas disponible – la <i>Synchronisation entre appareils</i> y fonctionne. Sous Android, la sauvegarde passe par le sélecteur de fichiers du système (p. ex. vers le dossier Téléchargements ou Google Drive).</div>`,
  },

  // ===================================================================== Listes de chaînes
  {
    id: 'lists',
    cat: 'lists',
    title: 'Listes de chaînes et leur actualisation',
    keywords: 'liste actualisation actualiser liste des chaînes m3u iptv-org automatique téléchargement nouvelles chaînes',
    body: `
<p>Les chaînes du programme proviennent des <b>listes intégrées</b>, de <b>vos listes de lecture</b> et de <b>vos chaînes personnelles</b> ajoutées une à une.</p>
<h2>Listes intégrées</h2>
<p>Paramètres → Listes de chaînes → <b>Listes intégrées</b> : chacune s’active et se désactive avec son propre interrupteur. À côté, on voit combien de chaînes elles fournissent.</p>
<table class="help-table">
<tr><td><b>iptv-org</b></td><td>La plus grande collection communautaire (environ 10 000 chaînes), avec des données détaillées (pays, langue, propriétaire, site web…). Son adresse se modifie avec le bouton <i>Adresse</i> (p. ex. la liste d’un seul pays).</td></tr>
<tr><td><b>iptv-org – Animation</b></td><td>Les chaînes d’animation d’iptv-org en liste séparée ; avec iptv-org activé, elles fusionnent avec lui, seules elles sont utiles si iptv-org est désactivé.</td></tr>
<tr><td><b>Free-TV</b></td><td>Chaînes gratuites sélectionnées à la main, par pays.</td></tr>
<tr><td><b>Pluto TV</b>, <b>Samsung TV Plus</b>, <b>Plex</b></td><td>Chaînes de streaming gratuites financées par la publicité, de plusieurs pays, avec leur propre guide TV.</td></tr>
<tr><td><b>FreeCast Hub</b></td><td>Une petite sélection (infos, musique, sport).</td></tr>
<tr><td><b>DragonHall TV</b></td><td>Un seul flux Internet hongrois.</td></tr>
</table>
<h2>Sans doublons</h2>
<p>Si plusieurs listes sont activées, la même chaîne figure souvent dans plusieurs d’entre elles. Le programme les <b>fusionne en une seule chaîne</b> : la chaîne apparaît une fois, et ses flux issus des différentes listes deviennent des <b>sources de secours</b> (si l’un ne fonctionne pas, le lecteur passe de lui-même au suivant). Sur la fiche, la ligne <i>Listes de chaînes</i> indique dans quelles listes elle figure, et les <i>Sources de flux</i> montrent d’où vient chaque source.</p>
<p>La fusion se fait d’abord par l’identifiant de la chaîne (<code>tvg-id</code>), puis par nom et pays, et enfin – si c’est sans ambiguïté – par le nom seul. Les versions par pays de Pluto TV, Samsung TV Plus et Plex (p. ex. « 48 Hours » États-Unis / Canada / Royaume-Uni) fusionnent en une seule chaîne. Les chaînes de même nom mais de pays différents, réellement distinctes (p. ex. « ABC News » Australie et États-Unis), restent séparées.</p>
<h2>Actualisation</h2>
<ul>
<li><b>Automatique</b> : la liste principale toutes les 6 heures, les données des chaînes chaque jour ; au démarrage, le programme se lance aussitôt avec la liste enregistrée et, si elle est ancienne, l’actualise en arrière-plan.</li>
<li><b>Immédiate</b> : menu du profil (la photo de profil de l’en-tête) → <b>Actualiser la liste des chaînes</b> – en dessous figure la date du dernier téléchargement. Ou : Paramètres → Listes de chaînes → <b>Actualiser toutes les listes maintenant</b>. Les deux rechargent tout sans le cache, avec le guide TV, et indiquent à la fin combien de chaînes il y a (et combien de nouvelles).</li>
</ul>
<h2>L’adresse de la liste iptv-org</h2>
<p>Paramètres → Listes de chaînes → iptv-org → <b>Adresse</b> : une autre adresse M3U peut être indiquée (p. ex. un seul pays : <code>https://iptv-org.github.io/iptv/countries/fr.m3u</code>). Laissée vide, elle revient à la liste complète.</p>
<p>Voir aussi : ${t('custom-playlists', 'Ajouter votre propre liste')} · ${t('custom-channels', 'Ajouter votre propre chaîne')}</p>
${go('#/settings?section=lists', 'Gérer les listes de chaînes')}`,
  },
  {
    id: 'custom-playlists',
    cat: 'lists',
    title: 'Ajouter votre propre liste de lecture',
    keywords: 'liste personnelle ajouter m3u m3u8 url fichier coller suggérée fournisseur iptv',
    body: `
<p>Vous pouvez ajouter n’importe quelle liste M3U / M3U8 – par exemple celle de votre fournisseur, une collection communautaire ou une compilation personnelle. Paramètres → Listes de chaînes → Mes listes de lecture :</p>
<table class="help-table">
<tr><td><b>Ajouter une liste depuis une adresse</b></td><td>Saisissez l’adresse <code>http(s)://</code> de la liste. Le programme la télécharge aussitôt, indique combien de flux elle contient, puis demande un nom (avec une suggestion).</td></tr>
<tr><td><b>Depuis un fichier</b></td><td>Un ou plusieurs fichiers <code>.m3u</code> / <code>.m3u8</code>, ou un paquet <b>ZIP</b> (versions de bureau et Android). Chaque fichier devient une liste séparée, activable et désactivable.</td></tr>
<tr><td><b>Coller une liste en texte</b></td><td>Collez le contenu de la liste – ou simplement des adresses de flux, une par ligne, à partir desquelles le programme construit une liste.</td></tr>
</table>
<h2>Gestion</h2>
<ul>
<li><b>Interrupteur</b> : la liste peut être désactivée temporairement sans être supprimée.</li>
<li><b>Renommer</b>, modifier l’<b>Adresse</b>, <b>Supprimer</b>.</li>
<li>À côté de la ligne figure le nombre de chaînes, ou le message d’erreur si le téléchargement échoue.</li>
</ul>
<p>Les chaînes de vos listes personnelles apparaissent sur l’accueil dans une rangée portant le nom de la liste (à la place de <i>Listes personnelles</i>), ainsi que dans Parcourir et la recherche. D’après le champ <code>group-title</code> (ou <code>#EXTGRP</code>) de la liste, elles sont rattachées à des catégories – y compris des noms de groupe dans d’autres langues, p. ex. <i>Nachrichten, Deportes, Films, Kids, Musique, Documentaire…</i> –, et d’après <code>tvg-id</code> au guide TV. Le pays vient de <code>tvg-country</code>, d’un groupe portant le nom d’un pays (p. ex. « France »), de la terminaison de <code>tvg-id</code> (<code>.fr</code>) ou d’un préfixe du nom (<code>FR:</code>, <code>|FR|</code>, <code>[FRA]</code>) ; la langue, de <code>tvg-language</code>. Ainsi, les chaînes de votre pays passent aussi en premier dans vos listes. Les en-têtes de style Kodi après l’adresse (<code>…/index.m3u8|User-Agent=…&amp;Referer=…</code>) fonctionnent aussi. ${t('m3u-format', 'Le format M3U')}</p>
<div class="warn">N’utilisez que des listes dont vous pouvez regarder le contenu légalement.</div>`,
  },
  {
    id: 'custom-channels',
    cat: 'lists',
    title: 'Ajouter votre propre chaîne',
    keywords: 'chaîne ajouter personnelle flux url personnalisé essayer user-agent referer en-tête',
    body: `
<p>Vous pouvez aussi ajouter un seul flux, sans liste : menu du profil → <b>Ajouter une chaîne</b>, ou Paramètres → Listes de chaînes → <b>Ajouter une chaîne</b>.</p>
<h2>Champs</h2>
<table class="help-table">
<tr><td><b>Nom</b> *</td><td>Tel qu’il apparaîtra dans l’interface.</td></tr>
<tr><td><b>Adresse du flux</b> *</td><td>L’adresse <b>directe</b> du flux : HLS (<code>.m3u8</code>), MPEG-TS (<code>.ts</code>), FLV, DASH (<code>.mpd</code>) ou MP4. L’adresse d’une page web (où se trouve le lecteur) ne fonctionne pas.</td></tr>
<tr><td><b>Adresse du logo</b></td><td>L’adresse d’une image (PNG, JPG, SVG). Si elle est vide, les initiales du nom apparaissent.</td></tr>
<tr><td><b>Catégorie</b>, <b>Pays</b></td><td>Ils déterminent les rangées et filtres où elle figure.</td></tr>
<tr><td><b>Avancé : User-Agent, Referer</b></td><td>Certains serveurs n’envoient l’image qu’avec un identifiant de navigateur ou une page de référence précis. Si vous voyez cela à la source (p. ex. <code>#EXTVLCOPT:http-referrer=…</code>), saisissez-le ici.</td></tr>
</table>
<p>Le bouton <b>Essayer</b> lance le flux sans l’enregistrer – pour vérifier d’avance qu’il fonctionne. Après <b>Enregistrer</b>, la chaîne apparaît dans la rangée <i>Mes chaînes</i> de l’accueil, dans Parcourir et dans la recherche ; elle peut être marquée comme favorite et recevoir un numéro de chaîne.</p>
<p>Modifier, lire, supprimer : Paramètres → Listes de chaînes → Mes chaînes.</p>
<div class="note">Sur TV, le lecteur intégré ne respecte pas toujours les en-têtes User-Agent / Referer.</div>
${go('#/settings?section=lists', 'Gérer mes chaînes')}`,
  },
  {
    id: 'm3u-format',
    cat: 'lists',
    title: 'Le format de liste M3U',
    keywords: 'm3u format extinf tvg-id tvg-logo group-title extvlcopt structure exemple',
    body: `
<p>Le M3U est un simple fichier texte : chaque flux est décrit par une ligne <code>#EXTINF</code> suivie de la ligne d’adresse.</p>
<pre class="code">#EXTM3U x-tvg-url="https://exemple.fr/guide.xml.gz"
#EXTINF:-1 tvg-id="France2.fr" tvg-logo="https://…/france2.png" group-title="News",France 2 (1080p)
https://…/france2/index.m3u8
#EXTINF:-1 tvg-logo="https://…/logo.png" group-title="Sports",Ma chaîne de sport [Geo-blocked]
#EXTVLCOPT:http-referrer=https://exemple.fr/
#EXTVLCOPT:http-user-agent=Mozilla/5.0 …
https://…/sport/playlist.m3u8</pre>
<table class="help-table">
<tr><td><code>x-tvg-url</code></td><td>(en-tête) le guide TV propre à la liste – le programme le charge aussi.</td></tr>
<tr><td><code>tvg-id</code></td><td>L’identifiant de la chaîne ; les données de la chaîne et le guide TV y sont associés.</td></tr>
<tr><td><code>tvg-logo</code></td><td>L’adresse du logo.</td></tr>
<tr><td><code>group-title</code></td><td>Catégorie (News, Sports, Movies, Kids, Music… ; plusieurs, séparées par des points-virgules).</td></tr>
<tr><td>Le texte après la virgule</td><td>Le nom de la chaîne ; <code>(1080p)</code> est lu comme la qualité, <code>[Geo-blocked]</code> et <code>[Not 24/7]</code> comme des badges.</td></tr>
<tr><td><code>#EXTVLCOPT</code>, <code>http-referrer</code>, <code>http-user-agent</code></td><td>En-têtes HTTP nécessaires au flux.</td></tr>
</table>
<p>Les lignes de même <code>tvg-id</code> apparaissent comme plusieurs sources d’une même chaîne.</p>`,
  },
  {
    id: 'health',
    cat: 'lists',
    title: 'Vérification de disponibilité',
    keywords: 'vérification fonctionne pastille disponible lien mort indisponible masquer complète',
    body: `
<p>Une partie des flux des listes gratuites s’arrête par moments ou définitivement. Adás vérifie donc lesquels fonctionnent :</p>
<ul>
<li><b>Automatiquement</b> : il teste en arrière-plan les sources des chaînes affichées à l’écran (quatre au plus par chaîne), puis à nouveau toutes les 12 heures. Désactivable : Paramètres → Listes de chaînes → Vérification de disponibilité.</li>
<li><b>Comme le lecteur le voit</b> : il ne suffit pas que le serveur réponde – le programme télécharge aussi, via la liste de lecture, le début d’un véritable segment vidéo. Ainsi les flux à restriction géographique, expirés ou momentanément vides (n’émettant pas) reçoivent aussi le badge <b>Hors ligne</b> / <b>Hors antenne</b>.</li>
<li><b>À la lecture</b> : ce qui démarre est marqué fonctionnel, ce qui ne démarre pas, en panne. Pendant 12 heures, la vérification en arrière-plan ne peut pas remplacer une lecture échouée par « fonctionne ».</li>
<li><b>Basculement rapide</b> : si une source ne répond pas en 6 secondes, le lecteur passe à la suivante ; avec plusieurs sources, il teste les autres en parallèle et bascule au bout de 3 secondes sur une source qui fonctionne à coup sûr.</li>
<li><b>Vérification complète</b> : Paramètres → Listes de chaînes → Vérification de disponibilité → <b>Vérifier tous les flux</b> – teste toutes les sources (plus de dix mille) en quelques minutes, avec indicateur de progression, interruptible.</li>
<li><b>Sur la fiche</b> : <i>Vérifier les sources</i> – toutes les sources de cette chaîne, immédiatement.</li>
</ul>
<p>Avec <b>Masquer les chaînes indisponibles</b> (Paramètres → Contenu et enfants → Contenu), les chaînes détectées en panne disparaissent des listes. <b>Effacer les résultats</b> remet tout à « non vérifié ».</p>
<div class="note">Rarement, un flux « fonctionnel » ne démarre quand même pas (p. ex. l’ordinateur ne sait pas décoder le format vidéo) – il est marqué après la première lecture échouée. Un flux « en panne » peut redevenir disponible plus tard. Dans un navigateur, la vérification n’est pas disponible.</div>`,
  },

  // ===================================================================== TV
  {
    id: 'android',
    cat: 'tv',
    title: 'Android : téléphone, tablette, Android TV',
    keywords: 'android téléphone mobile tablette android tv google tv shield box apk installation',
    body: `
<p>La version Android est un unique fichier <code>.apk</code> (<code>dist-android/Adas-…apk</code>) qui fonctionne sur téléphone, tablette et <b>Android TV / Google TV</b> (Android 6.0 ou plus récent). Sur un téléviseur, c’est l’interface TV pour télécommande qui démarre.</p>
<h2>Installation</h2>
<ul>
<li><b>Sur téléphone / tablette</b> : copiez l’APK et ouvrez-le. La première fois, il faut autoriser le gestionnaire de fichiers (ou le navigateur) à installer des applications (« sources inconnues »).</li>
<li><b>Sur Android TV</b> : le plus simple est l’application <i>Send files to TV</i> (envoi depuis le téléphone), ou une clé USB + un gestionnaire de fichiers. Sur le téléviseur aussi, l’installation depuis des sources inconnues doit être autorisée (Paramètres → Système / Sécurité).</li>
</ul>
<h2>Utilisation</h2>
<ul>
<li>Sur téléphone, une barre de menu à icônes en bas ; pendant la lecture, l’image est en plein écran et se regarde en paysage en tournant l’appareil. Le premier toucher fait apparaître les commandes.</li>
<li>Sur TV : <b>OK</b> = lecture, <b>OK maintenu</b> sur une chaîne = fiche (favori, rappel, sources), <b>Retour</b> = retour (sur l’accueil, quitter). Si la télécommande a des boutons de couleur, CH+/CH− ou ◀◀ / ▶▶, ils fonctionnent comme dans la version LG.</li>
</ul>
<h2>Lecture en arrière-plan</h2>
<ul>
<li><b>Lecture en arrière-plan (audio seul)</b> : Paramètres → Lecture → <i>Lecture en arrière-plan</i>. Activée, le son du flux continue quand vous passez à une autre application ; une notification l’indique, d’où vous pouvez revenir ou l’arrêter. Désactivée (par défaut), la lecture s’arrête quand vous quittez l’application.</li>
</ul>
<div class="note">Sous Android, il n’y a ni cast, ni son nocturne, ni vérification des mises à jour. Les paramètres se synchronisent par code avec l’ordinateur et les autres appareils Android, dans les deux sens (${t('transfer', 'Synchronisation entre appareils')}), et le téléphone peut servir de télécommande (${t('remote', 'Télécommande depuis le téléphone')}). Vous obtenez une nouvelle version en installant le nouvel APK – les paramètres sont conservés.</div>`,
  },
  {
    id: 'tv-install',
    cat: 'tv',
    title: 'Installation sur un téléviseur LG webOS',
    keywords: 'lg webos téléviseur installation ipk mode développeur developer mode ares',
    body: `
<p>La version TV est un paquet <code>.ipk</code> (<code>dist-webos/hu.adas.tv_…_all.ipk</code>) qui fonctionne sur les téléviseurs LG fabriqués après 2018 (webOS 4.0 ou plus récent). Comme elle n’est pas dans la boutique, elle s’installe en <b>mode développeur</b> :</p>
<ol>
<li>Créez un compte gratuit sur <b>developer.lge.com</b>.</li>
<li>Sur le téléviseur : LG Content Store → installez l’application <b>Developer Mode</b>, connectez-vous, activez <i>Dev Mode Status</i> et <i>Key Server</i>, puis redémarrez le téléviseur. L’application affiche l’adresse IP et la phrase secrète du téléviseur.</li>
<li>Sur l’ordinateur (Node.js nécessaire), dans le dossier du projet :
<pre class="code">npx ares-setup-device        (ajoutez le téléviseur : nom « tv », adresse IP, port 9922)
npx ares-novacom --device tv --getkey   (la phrase secrète est affichée par l’application Developer Mode)
npm run webos:install -- --device tv
npm run webos:launch -- --device tv</pre></li>
</ol>
<p>Solution graphique : le programme de bureau <b>webOS Dev Manager</b> → <i>Install from file</i> → le fichier <code>.ipk</code>.</p>
<div class="warn">Le mode développeur expire toutes les 50 heures ; il se prolonge d’une pression dans l’application Developer Mode. Après expiration, l’application installée disparaît et doit être réinstallée.</div>`,
  },
  {
    id: 'tv-remote',
    cat: 'tv',
    title: 'Boutons de la télécommande',
    keywords: 'télécommande boutons de couleur rouge vert jaune bleu retour ok magic remote',
    body: `
<table class="help-table keys">
<tr><td>Flèches, <b>OK</b></td><td>Déplacer, sélectionner, lire</td></tr>
<tr><td><b>Retour</b></td><td>Retour / fermer ; sur l’accueil, demande s’il faut quitter</td></tr>
<tr><td><span class="key red">●</span> Rouge</td><td>Favori oui/non pour la chaîne sélectionnée (pendant la lecture, celle regardée)</td></tr>
<tr><td><span class="key green">●</span> Vert</td><td>Sur une chaîne sélectionnée : fiche ; ailleurs : guide TV (pendant la lecture : fiche)</td></tr>
<tr><td><span class="key yellow">●</span> Jaune</td><td>Recherche (pendant la lecture : qualité et source)</td></tr>
<tr><td><span class="key blue">●</span> Bleu</td><td>Favoris (pendant la lecture : panneau de la liste des chaînes)</td></tr>
<tr><td><b>CH+ / CH−</b>, ↑ / ↓</td><td>Changer de chaîne pendant la lecture</td></tr>
<tr><td><b>0–9</b></td><td>Numéro de chaîne</td></tr>
<tr><td>▶ ❚❚ ■</td><td>Reprise / pause / arrêt de la lecture</td></tr>
</table>
<p>Avec le pointeur de la <b>Magic Remote</b>, tout se pilote aussi comme avec une souris.</p>`,
  },
  {
    id: 'tv-limits',
    cat: 'tv',
    title: 'En quoi la version TV est-elle différente ?',
    keywords: 'tv différence limites webos cors service',
    body: `
<ul>
<li><b>Lecture</b> : par défaut, le lecteur intégré du téléviseur lit les flux HLS ; s’il n’y arrive pas, il réessaie avec hls.js.</li>
<li><b>Téléchargements</b> : le moteur du navigateur du téléviseur n’autorise pas les téléchargements directs depuis d’autres serveurs (à cause des restrictions CORS), donc un petit <b>service en arrière-plan</b> du paquet télécharge le guide TV et les listes qui ne l’autorisent pas, et vérifie aussi les flux.</li>
<li><b>Non disponible</b> : mini-lecteur, bouton plein écran (déjà en plein écran), enregistrement dans / chargement depuis un fichier, ouverture de pages web externes, aperçu en direct sur l’accueil.</li>
<li>Les flux qui exigent un en-tête User-Agent / Referer particulier ne démarrent pas toujours avec le lecteur intégré.</li>
<li>Le premier démarrage peut être plus lent (le processeur du téléviseur est moins puissant) ; ensuite la liste traitée est enregistrée.</li>
</ul>`,
  },

  // ===================================================================== Dépannage
  {
    id: 'trouble-playback',
    cat: 'trouble',
    title: 'Le flux ne démarre pas',
    keywords: 'ne démarre pas ne fonctionne pas erreur écran noir indisponible délai dépassé geo',
    body: `
<p>Avec les listes communautaires gratuites, il est courant qu’un flux soit momentanément indisponible. Essayez dans l’ordre :</p>
<ol>
<li>Le bouton <b>Réessayer</b> – parfois le serveur était juste lent.</li>
<li>Une autre <b>source</b> : pendant la lecture ⚙ → Source, ou un autre ▶ sur la fiche. ${t('quality', 'Détails')}</li>
<li>Un autre <b>moteur de lecture</b> : Paramètres → Lecture → Moteur de lecture (Intégré ↔ hls.js). ${t('engines', 'Détails')}</li>
<li><b>Restriction géographique</b> (🌐) : certains flux ne sont visibles que depuis certains pays. ${t('geo', 'Détails')}</li>
<li>Badge <b>« Pas 24h/24 »</b> : la chaîne ne diffuse qu’à certains moments.</li>
<li>Actualisez la liste des chaînes (menu du profil → Actualiser la liste des chaînes) – iptv-org a peut-être trouvé une nouvelle adresse entre-temps.</li>
<li>Activez <b>Masquer les chaînes indisponibles</b> pour ne plus être gêné par les chaînes mortes.</li>
</ol>
<p>Si un flux ne fonctionne pas durablement, c’est un problème de la source – la chaîne peut être signalée sur la page GitHub d’iptv-org.</p>`,
  },
  {
    id: 'geo',
    cat: 'trouble',
    title: 'Restriction géographique (🌐)',
    keywords: 'restriction géographique géoblocage geo-blocked pays vpn 403 451 non visible',
    body: `
<p>Beaucoup de chaînes ne sont visibles que depuis leur propre pays, pour des questions de droits. Adás l’indique de deux façons :</p>
<table class="help-table">
<tr><td><b>🌐 GÉO-BLOQUÉ</b> (étiquette orange sur la carte, « Restriction géographique – non visible d’ici »)</td><td>Certain : la chaîne a <b>refusé</b> la demande venant d’ici (HTTP 403 ou 451). C’est la vérification de disponibilité en arrière-plan ou une tentative de lecture qui l’a détecté.</td></tr>
<tr><td><b>🌐</b> (petit signe dans le coin de la carte, « Peut être géo-restreint »)</td><td>D’après la liste, toutes les sources de la chaîne sont restreintes, mais nous n’avons pas encore essayé d’ici. Beaucoup de ces flux fonctionnent quand même – dès qu’un flux a démarré, le signe disparaît.</td></tr>
</table>
<p>Si vous lancez un flux restreint, le lecteur le dit explicitement (pas seulement « indisponible »). Cela peut fonctionner depuis un autre pays, ou avec un VPN là-bas.</p>
<p><b>Filtrer :</b> sur la page Parcourir, le sélecteur <i>Restriction géographique</i> permet de masquer les chaînes restreintes, ou de n’afficher qu’elles.</p>
<div class="note">Une réponse 403 n’est parfois pas due au pays mais à autre chose (p. ex. un accès expiré) – le badge « restriction géographique » apparaît alors aussi, car de l’extérieur on ne peut pas distinguer les deux.</div>
${go('#/browse?geo=hide', 'Chaînes sans restriction géographique')}`,
  },
  {
    id: 'stream-info',
    cat: 'watch',
    title: 'Infos du flux (qualité, vitesse)',
    keywords: 'infos du flux statistiques débit vitesse bande passante résolution qualité mémoire tampon latence images perdues codec réseau touche d',
    body: `
<p>Pendant la lecture, l’option <b>⚙ Qualité et source → 📊 Infos du flux</b> (ou la touche <kbd>D</kbd>) ouvre un panneau transparent actualisé chaque seconde :</p>
<table class="help-table">
<tr><td><b>Lecteur</b>, <b>Serveur</b></td><td>Quel moteur de lecture joue (hls.js, intégré, pont de lecture…), et de quel serveur vient le flux (🔒 : connexion chiffrée).</td></tr>
<tr><td><b>Résolution</b>, <b>Codecs</b>, <b>Débit</b></td><td>La taille de l’image (SD / HD / Full HD / 4K) et sa fréquence d’images ; la quantité de données par seconde du flux. Si la liste ne l’indique pas, elle est mesurée à partir des segments téléchargés (« mesuré »).</td></tr>
<tr><td><b>Vitesse de téléchargement mesurée</b></td><td>La vitesse à laquelle le serveur envoie réellement – et combien de fois le débit cela représente. Sous 1,3× (orange), la connexion ou le serveur suit tout juste : c’est la cause des saccades.</td></tr>
<tr><td><b>Mémoire tampon</b>, <b>Retard sur le direct</b></td><td>Combien de secondes du flux sont déjà téléchargées d’avance (orange sous 3 s), et de combien il est en retard sur le direct.</td></tr>
<tr><td><b>Images perdues</b></td><td>S’il y en a beaucoup (plus de 5 %), l’appareil n’arrive pas à décoder – une qualité inférieure aide.</td></tr>
<tr><td><b>Saccades</b></td><td>Combien de fois et combien de temps l’image s’est arrêtée depuis l’ouverture du panneau.</td></tr>
<tr><td><b>Réseau</b></td><td>L’estimation du système sur la connexion (type, vitesse, temps de réponse), quand il la fournit.</td></tr>
</table>
<p>Si quelque chose semble suspect, une ligne ⚠ en bas du panneau donne aussi un conseil (p. ex. qualité inférieure ou autre source).</p>`,
  },
  {
    id: 'trouble-buffering',
    cat: 'trouble',
    title: 'L’image saccade ou se met en mémoire tampon',
    keywords: 'saccades mémoire tampon lent coupures chargement qualité internet',
    body: `
<p>Le panneau <b>Infos du flux</b> montre où est le problème (<kbd>D</kbd> pendant la lecture) : si la vitesse de téléchargement mesurée dépasse à peine le débit, le serveur ou la connexion est lent. ${t('stream-info', 'Détails')}</p>
<ul>
<li>Choisissez une <b>qualité inférieure</b> (⚙ → Qualité), surtout en données mobiles ou avec un Wi-Fi faible.</li>
<li>Essayez une <b>autre source</b> – un autre serveur peut être plus rapide.</li>
<li>Si le flux s’arrête, le programme passe de lui-même à la source suivante (si la source de secours est activée) : au bout de <b>10 secondes</b> s’il reste une source non essayée – sinon il attend 30 secondes au cas où le flux repartirait tout seul.</li>
<li>Les serveurs de pays lointains peuvent être plus lents ; ce n’est pas une erreur du programme.</li>
<li>La vérification automatique de disponibilité en arrière-plan se met en pause d’elle-même pendant la lecture. En revanche, <i>Vérifier tous les flux</i> lancé à la main continue – mieux vaut l’arrêter pendant la lecture.</li>
</ul>
<p>Le lecteur démarre les directs environ 4 segments (en général 20 à 30 s) derrière le direct : cela laisse une réserve si le serveur ralentit un instant – beaucoup de serveurs n’envoient que lentement le segment le plus récent, encore en préparation.</p>`,
  },
  {
    id: 'trouble-epg',
    cat: 'trouble',
    title: 'Pas de données de programme pour une chaîne',
    keywords: 'pas de programme guide tv vide epg manquant association',
    body: `
<p>Les sources publiques de guide TV ne couvrent qu’une partie des chaînes – surtout celles des pays dotés d’une source intégrée et les grandes chaînes internationales. Ce que vous pouvez faire :</p>
<ul>
<li>Activez la source du pays de la chaîne : Paramètres → Guide TV (p. ex. France, Royaume-Uni, Pluto TV). ${t('epg-sources', 'Sources')}</li>
<li>Ajoutez une source XMLTV personnelle, si vous en connaissez une qui contient la chaîne.</li>
<li>Regardez sur la ligne de la source combien de chaînes elle a associées, et si elle affiche une erreur.</li>
<li>Actualisez le guide TV (<i>Actualiser le guide TV maintenant</i>).</li>
</ul>
<p>L’association se fait par l’identifiant et le nom de la chaîne ; si une source enregistre la chaîne sous un nom très différent, elle ne peut pas les relier.</p>`,
  },
  {
    id: 'trouble-list',
    cat: 'trouble',
    title: 'La liste des chaînes ne se charge pas / démarrage lent',
    keywords: 'ne se charge pas chargement erreur démarrage lent internet réessayer téléchargement',
    body: `
<ul>
<li>Vérifiez la connexion Internet, puis appuyez sur <b>Réessayer</b>.</li>
<li>Si le téléchargement échoue, le programme utilise la liste téléchargée précédemment (plus ancienne), s’il y en a une.</li>
<li>Le premier démarrage peut prendre 20 à 40 secondes ; les suivants sont rapides grâce à la liste enregistrée.</li>
<li>Si vous avez remplacé la liste principale et qu’elle ne fonctionne pas : Paramètres → Listes de chaînes → <i>Par défaut (iptv-org)</i>.</li>
<li>En cas d’état étrange, « bloqué » : Paramètres → Profils et sauvegarde → <b>Vider le cache</b>, puis redémarrez le programme.</li>
</ul>`,
  },
  {
    id: 'trouble-browser',
    cat: 'trouble',
    title: 'Ouvert dans un navigateur, cela ne fonctionne pas',
    keywords: 'navigateur chrome firefox cors index.html web',
    body: `
<p>L’interface d’Adás (<code>src/index.html</code>) peut aussi s’ouvrir dans un navigateur ordinaire, mais à cause de ses règles de sécurité (CORS), la plupart des flux et le guide TV ne peuvent pas y être chargés, et la vérification de disponibilité ne fonctionne pas non plus. Ce mode ne sert qu’au développement.</p>
<p>Pour toutes les fonctions, utilisez l’<b>application de bureau</b> (Windows <code>.exe</code>, macOS <code>.dmg</code>, Linux <code>AppImage</code> / <code>.deb</code>) ou la <b>version TV</b>.</p>`,
  },
  {
    id: 'faq',
    cat: 'trouble',
    title: 'Questions fréquentes',
    keywords: 'faq question légal gratuit payant pourquoi doublon disparue chaîne',
    body: `
<h3>Est-ce gratuit ? Faut-il un abonnement ?</h3>
<p>Oui, c’est gratuit. Le programme rassemble des flux disponibles publiquement et gratuitement ; aucun compte ni abonnement n’est nécessaire.</p>
<h3>Est-ce légal ?</h3>
<p>iptv-org ne recueille que des flux publics et gratuits, et retire les chaînes en cas de réclamation pour droit d’auteur. Quand vous ajoutez votre propre liste, c’est à vous de vous assurer que vous pouvez regarder son contenu légalement.</p>
<h3>Pourquoi une chaîne a-t-elle disparu ?</h3>
<p>Elle a peut-être été retirée de la liste communautaire (arrêtée, adresse changée, ou pour raisons juridiques). Si vous connaissez son adresse, vous pouvez l’ajouter comme chaîne personnelle. ${t('custom-channels', 'Comment ?')}</p>
<h3>Pourquoi une chaîne apparaît-elle deux fois ?</h3>
<p>Si l’une de vos listes contient la même chaîne que la liste principale, les deux apparaissent (le nom de votre liste figure sur la fiche).</p>
<h3>Pourquoi une chaîne n’a-t-elle pas de numéro ?</h3>
<p>Les numéros de chaîne vont aux favoris et aux chaînes du pays d’origine. Marquez-la comme favorite et placez-la où vous voulez sur la page Favoris.</p>
<h3>Puis-je enregistrer des programmes ?</h3>
<p>Oui, dans la version de bureau. ${t('recording', 'Enregistrement')}</p>
<h3>Où sont mes données ?</h3>
<p>${t('privacy', 'Données et confidentialité')}</p>`,
  },

  // ===================================================================== Extras
  {
    id: 'timeshift',
    cat: 'watch',
    title: 'Mettre en pause et revenir en arrière en direct',
    keywords: 'direct différé timeshift pause retour arrière direct mémoire tampon aller au direct dvr',
    body: `
<p>Pour les directs, le lecteur <b>conserve le flux déjà téléchargé</b> (jusqu’à environ 30 minutes, selon la mémoire), donc :</p>
<ul>
<li><b>Pause</b> : le flux continue de se télécharger, et à la reprise vous regardez à partir de l’endroit où vous avez mis en pause.</li>
<li><b>Retour arrière</b> : avec les boutons <b>30</b> de la barre de contrôle, avec <kbd>Maj</kbd>+<kbd>←</kbd>/<kbd>→</kbd>, avec les boutons ◀◀ / ▶▶ de la télécommande par pas de 30 secondes, ou en faisant glisser la <b>frise</b>.</li>
<li><b>Aller au direct</b> : si vous êtes en retard, le bouton <i>Aller au direct</i> et le retard (p. ex. −2:15) apparaissent à gauche de la frise ; le badge <b>DIRECT</b> en haut à droite est alors gris. Au clavier : <kbd>Fin</kbd>.</li>
</ul>
<p>On ne peut revenir en arrière que jusqu’où le lecteur a déjà téléchargé – en changeant de chaîne, la mémoire tampon est vide et grandit minute après minute.</p>
<div class="note">Le lecteur intégré d’un téléviseur (webOS) décide lui-même de ce qu’il conserve ; le retour arrière peut y être plus court, voire absent, selon la chaîne.</div>`,
  },
  {
    id: 'sportwatch',
    cat: 'watch',
    title: 'Suivi sportif',
    keywords: 'sport suivi sportif championnat équipe match résultat football tennis handball water-polo formule 1 disc golf world chase tag échecs fléchettes e-sport agenda ics thesportsdb espn chaîne',
    body: `
<p>Le Suivi sportif sert à suivre n’importe quel sport, championnat, équipe ou compétition ; le bloc <b>Sport</b> de l’accueil en affiche les événements en direct, récents et à venir. Pour l’ouvrir : <i>Suivi sportif ›</i> dans l’en-tête du bloc Sport, ou Paramètres → Accueil → <i>Ouvrir le suivi sportif</i>.</p>
<p>Les onglets de la fenêtre :</p>
<table class="help-table">
<tr><td><b>Suivis</b></td><td>Tout ce que vous suivez, regroupé par sport. Chaque élément s’active/se désactive ou se supprime.</td></tr>
<tr><td><b>Championnats</b></td><td>Plus de 350 championnats et tournois dans 17 sports (football, basket-ball, hockey sur glace, tennis, golf, Formule 1, MMA, rugby, cricket, volley-ball…) – avec recherche et filtre par sport. Suivez tout le championnat, ou seulement les matchs d’une équipe avec le bouton <i>Équipe…</i>. Source : ESPN (sans clé, avec résultats).</td></tr>
<tr><td><b>Sports à la TV</b></td><td><b>Tout</b> sport ou jeu d’après le guide TV : handball, water-polo, disc golf, World Chase Tag, échecs, fléchettes, snooker, e-sport, équitation… Un clic sur la tuile du sport, ou votre propre mot-clé (p. ex. <i>OM</i>, <i>Tour de France</i>, <i>Roland-Garros</i>). Ils cherchent dans les programmes des chaînes visibles et donnent donc toujours une diffusion regardable.</td></tr>
<tr><td><b>Agenda</b></td><td>Tout calendrier de compétitions ou de rencontres (adresse .ics / webcal) publié par une fédération, un club ou un site – p. ex. tournois de disc golf, championnats locaux.</td></tr>
<tr><td><b>Paramètres</b></td><td>Combien de jours en arrière et en avant afficher ; suggestion de chaîne oui/non ; clé TheSportsDB facultative (davantage de championnats).</td></tr>
</table>
<h2>Suggestion de chaîne</h2>
<p>Pour chaque événement, le programme cherche dans le guide TV sur quelle chaîne il passe (d’après les noms d’équipes, le championnat et le sport, en tenant compte de l’horaire), et un bouton <b>📺 chaîne</b> apparaît sur la ligne – un clic lance le flux. Les correspondances incertaines sont plus pâles. Seules les chaînes non masquées disposant d’un guide TV sont prises en compte ; les favoris et les chaînes de sport sont privilégiés.</p>
<div class="note">Les résultats s’actualisent environ toutes les 5 minutes. Si un championnat ne peut pas être chargé, le bas du bloc Sport le signale.</div>`,
  },
  {
    id: 'multiview',
    cat: 'watch',
    title: 'Plusieurs flux à la fois',
    keywords: 'plusieurs flux multi-vue écran partagé 2 4 fenêtres sport infos en même temps',
    body: `
<p>Vous pouvez regarder deux ou quatre chaînes à la fois – par exemple plusieurs retransmissions sportives ou journaux. Pour l’ouvrir : le bouton <b>▦</b> du lecteur (ou <kbd>V</kbd>), ou <i>Plusieurs flux à la fois</i> dans le menu du profil.</p>
<ul>
<li>La fenêtre <b>sélectionnée</b> (cadre de couleur) a le son, les autres tournent en muet. Pour changer : flèches, <kbd>1</kbd>–<kbd>4</kbd> ou clic.</li>
<li><kbd>OK</kbd> / ⇄ : une autre chaîne dans la fenêtre (avec recherche), ✕ : vider la fenêtre.</li>
<li><kbd>F</kbd>, double-clic ou ⤢ : la chaîne sélectionnée en plein écran ; de là, haut/bas passe d’une chaîne de la multi-vue à l’autre.</li>
<li>Les chaînes de départ : celle depuis laquelle vous l’avez ouverte, puis vos favoris.</li>
</ul>
<div class="note">Quatre flux à la fois demandent beaucoup de bande passante et de puissance. Sur TV, deux fenêtres au maximum sont disponibles.</div>`,
  },
  {
    id: 'cast',
    cat: 'watch',
    title: 'Caster sur la TV (Chromecast, DLNA)',
    keywords: 'caster cast chromecast dlna upnp tv smart tv google tv lire sur un autre appareil',
    body: `
<p>Depuis la version de bureau, vous pouvez envoyer le flux ou le film vers un <b>Chromecast</b>, une Google TV, ou une smart TV ou un lecteur multimédia <b>compatible DLNA</b>. Cliquez sur l’icône de cast de la barre de contrôle du lecteur : le programme cherche les appareils sur le réseau local.</p>
<ul>
<li>Pendant le cast, les commandes restent sur l’ordinateur : pause / reprise, changement de chaîne (haut/bas), volume, arrêt. Un film reprend sur la TV là où il en était ici.</li>
<li>Après <b>Arrêter le cast</b>, la lecture continue sur l’ordinateur.</li>
<li>Cet ordinateur relaie le flux vers la TV (ainsi les flux qui exigent des en-têtes particuliers ou CORS fonctionnent aussi) – il doit donc rester allumé pendant le cast, sur le même réseau.</li>
</ul>
<h2>S’il ne trouve aucun appareil</h2>
<ul>
<li>À la première utilisation, le <b>pare-feu Windows</b> demande une autorisation – autorisez-la sur le <i>réseau privé</i>.</li>
<li>L’ordinateur et la TV doivent être sur le même Wi-Fi / routeur (les réseaux invités sont généralement isolés).</li>
<li>Pour le DLNA, le partage de médias / « moteur de rendu DLNA » doit être activé sur la TV (LG : <i>Paramètres → Général → Appareils → Partage d’écran / DLNA</i>).</li>
</ul>
<div class="note">Tous les appareils ne lisent pas tous les formats : le Chromecast gère bien le HLS et le MP4, mais beaucoup de TV DLNA seulement le MP4 ou le MPEG-TS. Si l’appareil signale une erreur, essayez une autre source (⚙ → Source).</div>`,
  },
  {
    id: 'night-audio',
    cat: 'watch',
    title: 'Son nocturne',
    keywords: 'son nocturne faible compresseur dialogue voix intelligibilité publicités fortes dynamique',
    body: `
<p>Le <b>son nocturne</b> atténue les passages forts (musique, explosions, publicités) et renforce les dialogues faibles – pour comprendre à faible volume sans réveiller personne.</p>
<ul>
<li>Pour l’activer pendant la lecture : bouton <b>CC</b> → <i>Audio et sous-titres</i> → <i>Son nocturne</i>.</li>
<li>Pour en faire le réglage par défaut d’un profil : Paramètres → Sous-titres et informations → Infos et sous-titres en français → <i>Son nocturne</i>.</li>
</ul>
<div class="note">Disponible dans la version de bureau.</div>`,
  },
  {
    id: 'parental',
    cat: 'personal',
    title: 'Contrôle parental et verrouillage de profil (PIN)',
    keywords: 'pin verrouillage de profil contrôle parental enfant verrou mot de passe code profil enfant quitter',
    body: `
<p>Vous pouvez définir un <b>code PIN à 4 chiffres</b> pour n’importe quel profil : Gérer les profils → modifier le profil → <i>Verrouillage du profil (code PIN)</i>. Un profil verrouillé porte un 🔒 sur l’écran « Qui regarde ? » et ne s’ouvre qu’avec le code PIN.</p>
<h2>Profil enfant</h2>
<p>Si au moins un <b>profil adulte a un code PIN</b>, alors depuis le profil enfant :</p>
<ul>
<li>passer à un autre profil n’est possible qu’avec le code PIN,</li>
<li>les <b>Paramètres</b> et <b>Gérer les profils</b> ne s’ouvrent qu’avec le code PIN d’un adulte (l’autorisation vaut 10 minutes),</li>
<li>le contenu pour adultes et les chaînes non adaptées aux enfants n’apparaissent toujours pas.</li>
</ul>
<p>Le code PIN se saisit avec les touches numériques de la télécommande ou le pavé numérique affiché à l’écran. Après cinq essais erronés, il faut attendre une demi-minute.</p>
<h2>Code PIN oublié</h2>
<p>Le code PIN de n’importe quel profil peut être supprimé depuis un autre profil adulte (Gérer les profils). S’il n’y en a pas, supprimer les données de l’application remet tout à zéro. ${t('privacy', 'Où sont les données ?')}</p>
<div class="note">Le code PIN protège des enfants sur cet appareil ; ce n’est pas un chiffrement.</div>`,
  },
  {
    id: 'continue',
    cat: 'vod',
    title: 'Reprendre (VOD)',
    keywords: 'reprendre inachevé film épisode série accueil rangée continuer',
    body: `
<p>La rangée <b>Reprendre</b> de la page VOD rassemble en un seul endroit les films et épisodes que vous n’avez pas terminés – issus des listes de films et de séries intégrées et personnelles, et de votre médiathèque personnelle. (L’accueil TV n’a pas de telle rangée : il n’y a que des chaînes.) Le plus récemment regardé vient en premier.</p>
<p>Pour une série, la carte vous mène à l’épisode où vous en êtes (ou au suivant, si vous avez terminé le précédent). </p>`,
  },
  {
    id: 'stats',
    cat: 'personal',
    title: 'Statistiques de visionnage',
    keywords: 'statistiques temps de visionnage combien de télé chaîne préférée graphique heure jour',
    body: `
<p>L’option <i>Statistiques de visionnage</i> du menu du profil montre combien et quand vous regardez la télé : aujourd’hui, la semaine et le mois écoulés, par jour, par moment de la journée ; les chaînes, catégories, films et séries les plus regardés.</p>
<ul>
<li>Compté séparément pour chaque profil, seulement le temps réellement lu (sans les pauses).</li>
<li>Les données ne sont stockées que sur cet appareil. Sur la page des statistiques, la collecte peut être désactivée et les données supprimées.</li>
</ul>
${go('#/stats', 'Ouvrir les statistiques')}`,
  },
  {
    id: 'transfer',
    cat: 'personal',
    title: 'Synchronisation entre appareils (avec un code)',
    keywords: 'transfert transmettre à la tv paramètres copier code adresse synchro synchroniser exporter importer tv android téléphone bureau',
    body: `
<p>Entre l’ordinateur de bureau, Android TV et le téléphone Android, vous pouvez transférer les paramètres (listes, profils, favoris, historique, rappels, accueil) avec un code sur le réseau local – dans les deux sens :</p>
<ol>
<li>Sur l’appareil <b>dont vous voulez reprendre les paramètres</b> : Paramètres → <i>Synchronisation entre appareils</i> → <b>Demander un code</b>. Un code à 12 chiffres s’affiche (p. ex. <code>123 456 789 012</code>). Sur demande, les clés et mots de passe sont aussi transmis.</li>
<li>Sur l’<b>autre appareil</b> : au même endroit, saisissez le code dans le champ <i>Synchroniser avec un code</i>, puis <b>Synchroniser</b>. L’appareil trouve de lui-même sur le réseau celui qui a fourni le code, et reprend ses paramètres (après confirmation).</li>
</ol>
<p>Les paramètres voyagent chiffrés : le code (et donc la clé) ne circule jamais sur le réseau, seulement un identifiant qui en est dérivé. Le code est valable 15 minutes ; après 10 essais erronés il s’arrête, demandez-en alors un nouveau. Les deux appareils doivent être sur le même réseau (domestique) ; le pare-feu Windows peut demander une autorisation la première fois – autorisez-la sur le réseau privé.</p>
<p><b>Profils uniquement</b> : les paramètres et listes actuels sont conservés, les profils reçus sont ajoutés (ceux qui existent déjà sont mis à jour).</p>
<p>Sous <i>Avancé</i>, vous pouvez aussi indiquer l’adresse de l’autre appareil (s’il est sur un autre sous-réseau), ou charger les paramètres depuis une adresse web (p. ex. une sauvegarde déposée sur votre NAS) – saisissez alors l’adresse complète, sans code.</p>
${go('#/settings?section=transfer', 'Synchronisation entre appareils')}`,
  },
  {
    id: 'remote',
    cat: 'personal',
    title: 'Télécommande depuis le téléphone',
    keywords: 'télécommande téléphone mobile navigateur contrôle pin qr code réseau changement de chaîne volume pavé tactile recherche',
    body: `
<p>L’application de bureau et la version Android (TV) se pilotent aussi depuis votre téléphone – ou depuis le navigateur de n’importe quel appareil – sur le même réseau (domestique) :</p>
<ol>
<li>Le plus rapide : le bouton <b>Télécommande</b> en haut de l’<b>Accueil</b> (à côté de Personnaliser) – il active la télécommande et affiche le QR code dans une petite fenêtre. Ou : Paramètres → Télécommande et touches → <b>Télécommande depuis le téléphone</b> → activez-la. Un <b>QR code</b>, une adresse (p. ex. <code>http://192.168.1.20:47800/adas/remote</code>) et un code PIN à 4 chiffres s’affichent.</li>
<li>Scannez le QR code avec l’appareil photo du téléphone : la télécommande s’ouvre et reçoit aussi une clé secrète – c’est le plus sûr, car la clé ne circule jamais sur le réseau ; le téléphone signe chaque commande avec elle. (Ou ouvrez l’adresse dans le navigateur et saisissez le code PIN – le téléphone le mémorise.) Astuce : ajoutez la page à l’écran d’accueil pour qu’elle se lance comme une application.</li>
</ol>
<p>En haut, vous voyez toujours ce qui passe (avec le logo, la progression du programme et le programme suivant). La télécommande comporte trois onglets :</p>
<table class="help-table">
<tr><td><b>🎮 Contrôle</b></td><td>Un <b>pavé tactile</b> à deux modes (à choisir au-dessus, le téléphone s’en souvient) : <b>🖱 Souris</b> – le glissement déplace un curseur sur l’écran de l’ordinateur / de la TV (mouvement lent = précis, rapide = grands sauts), toucher = clic, <b>glisser à deux doigts pour faire défiler</b> (aussi horizontalement, dans la rangée sous le curseur), et l’élément sous le curseur est sélectionné ; <b>✥ Flèches</b> – le glissement déplace la sélection (comme les flèches), toucher = OK. Dans les deux : appui long = Retour. En utilisation télécommande, le cadre de sélection est toujours visible. En dessous : Retour, Accueil, Fiche ; avance (±10 / ±30 s – en différé sur les directs) ; pause ; CH ▲ / ▼, chaîne précédente, muet, <b>curseur de volume</b> ; Sous-titres, Qualité, Liste des chaînes, Plein écran ; flèches et numéro de chaîne.</td></tr>
<tr><td><b>📺 Chaînes</b></td><td>Une <b>recherche</b> parmi toutes les chaînes (filtre pendant la saisie, montre aussi le programme en cours), vos favoris et les chaînes vues récemment – elles démarrent d’un toucher.</td></tr>
<tr><td><b>☰ Plus</b></td><td>Aller à n’importe quelle page (TV, Guide TV, Favoris, VOD, Enregistrements, Parcourir, Aide) ; <b>envoyer du texte</b> (saisit avec le clavier du téléphone dans le champ sélectionné, ou lance une recherche) ; Infos du flux, Plusieurs flux à la fois, minuterie de mise en veille.</td></tr>
</table>
<div class="note">Le code PIN et la clé du QR code peuvent être régénérés à tout moment (Nouveau code PIN) – l’ancien téléphone doit alors rescanner le QR code (ou saisir le nouveau code PIN). Avec un mauvais code PIN, la télécommande ne fonctionne pas ; après de nombreux essais erronés depuis un appareil, cet appareil est bloqué 10 minutes (les autres téléphones continuent de fonctionner).</div>
${go('#/settings?section=remote', 'Télécommande depuis le téléphone')}`,
  },
  {
    id: 'recording',
    cat: 'watch',
    title: 'Enregistrement',
    keywords: 'enregistrement enregistrer sauvegarder programmer vidéo ts découper marge début fin',
    body: `
<p>Dans la version de bureau (Windows, Mac, Linux), la TV en direct peut être enregistrée – sans réencodage, en qualité d’origine, dans un fichier <code>.ts</code>, dans le dossier <b>Vidéos / Enregistrements Adás</b>.</p>
<ul>
<li><b>Immédiatement</b> : pendant la lecture, avec le bouton rouge <b>●</b> de la barre de contrôle ; un nouvel appui l’arrête. Le bouton clignote pendant l’enregistrement.</li>
<li><b>Programmé</b> : dans le guide TV, <b>● Enregistrer</b> sur la fiche d’un programme. L’enregistrement démarre et s’arrête avec une <b>marge</b> – par défaut 3 minutes avant et 10 minutes après le programme, car la télé prend souvent du retard (Paramètres → Enregistrements). Adás doit alors être lancé (caché dans la zone de notification, cela suffit – Paramètres → Notifications → Fonctionner en arrière-plan) ; le démarrage depuis la zone de notification est lui aussi ponctuel.</li>
<li>Si le flux <b>se coupe</b> pendant l’enregistrement (p. ex. serveur qui saccade), l’enregistrement reprend de lui-même dans le même fichier après quelques secondes – à la fin, le message « Enregistrement terminé » indique combien de fois il a été interrompu.</li>
</ul>
<h2>Découpage</h2>
<p>Le bouton <b>✂</b> de la carte d’un enregistrement ouvre l’éditeur de découpage : aperçu, frise (repères jaunes : début et fin du programme selon le guide TV), pas (±1 s / ±10 s / ±1 min), <b>⇤ Début ici</b> et <b>Fin ici ⇥</b> (ou les touches <kbd>I</kbd> / <kbd>O</kbd>), les horaires peuvent aussi être saisis ; le bouton <b>Sélectionner selon le guide TV</b> les règle en une fois. Après <b>✂ Découper et enregistrer</b>, la version découpée prend la place de l’enregistrement – c’est elle qu’Adás lit, et elle aussi qu’ouvre le lecteur externe.</p>
<p>L’<b>original est conservé</b> (il n’apparaît pas comme un enregistrement séparé) : en rouvrant l’éditeur, vous redécoupez depuis l’original (avec la sélection précédente), ou récupérez l’enregistrement complet avec <b>Restaurer l’original</b>. La carte d’un enregistrement découpé affiche une coche à côté du ✂. À la suppression, les deux vont dans la corbeille.</p>
<p>Les enregistrements se trouvent dans l’onglet <b>TV → Enregistrements</b> (avec logo de la chaîne, date, taille ; ceux commencés avec une barre de progression). <b>▶ Lire</b> lance l’enregistrement dans le lecteur propre d’Adás – avec avance, et un enregistrement commencé reprend là où vous vous étiez arrêté. Le bouton <b>⧉</b> l’ouvre dans le lecteur vidéo de l’ordinateur (p. ex. VLC), <b>✕</b> l’envoie à la corbeille. Vous y voyez aussi les enregistrements en cours et programmés ; les derniers figurent aussi dans Paramètres → Enregistrements.</p>
<div class="note">Pour votre usage privé uniquement : les droits des programmes enregistrés appartiennent aux chaînes. Certains flux (chiffrés ou protégés par DRM) ne peuvent pas être enregistrés.</div>
${go('#/recordings', 'Enregistrements')}`,
  },
  {
    id: 'adaspack',
    cat: 'lists',
    title: 'Packs complémentaires (.adaspack)',
    keywords: 'pack complémentaire adaspack adaspak tv vod liste intégrée ia créer dossier des packs',
    body: `
<p>Un pack complémentaire est <b>une liste de lecture emballée dans un fichier</b>, avec un nom et une description. Il apparaît <b>parmi les listes intégrées</b> (activable et désactivable), mais n’est pas fourni avec le programme – il n’existe que sur l’appareil où vous le chargez.</p>
<table class="help-table">
<tr><td><code>quelquechose_tv.adaspack</code></td><td><b>Chaînes TV</b> – Paramètres → Listes de chaînes → Listes intégrées.</td></tr>
<tr><td><code>quelquechose_vod.adaspack</code></td><td><b>Films, séries</b> – Paramètres → VOD et médiathèque → Listes VOD → Listes intégrées.</td></tr>
</table>
<h2>Chargement</h2>
<ul>
<li>Le bouton <b>Charger un pack complémentaire</b> (Listes de chaînes ou Listes VOD) – le pack décide lui-même où il va. Les extensions <code>.adaspack</code> et <code>.adaspak</code> sont acceptées, <b>dans toutes les versions</b> (bureau, téléphone et TV Android, navigateur, LG webOS).</li>
<li><b>Charger depuis une adresse web</b> – p. ex. depuis GitHub (une adresse de page <code>github.com/…/blob/…</code> convient aussi) ou depuis votre NAS. Sur TV, où il n’y a pas de sélecteur de fichier, c’est le plus simple.</li>
<li>Version de bureau : le contenu du <b>Dossier des packs</b> (le sous-dossier <code>packs</code> du dossier de données utilisateur) est chargé automatiquement au démarrage, et actualisé quand un fichier change.</li>
<li>La sauvegarde et le transfert entre appareils emportent aussi les packs (p. ex. de l’ordinateur vers le téléphone).</li>
<li>Recharger un pack de même identifiant met à jour l’ancien ; <b>Retirer</b> ne le supprime que de cet appareil.</li>
</ul>
<h2>Structure</h2>
<p>JSON en UTF-8 : <code>{ "adasPack": 1, "kind": "tv" | "vod", "id": "exemple", "name": "Exemple", "desc": "…", "off": false, "text": "#EXTM3U\\n…" }</code> – <code>text</code> est la liste M3U complète. Pour la TV, <code>tvg-id</code> est recommandé (identifiant iptv-org : logo, pays, guide TV) ; pour la VOD, le titre de film <code>Titre (Année)</code>, le titre d’épisode <code>Série S01E02</code> et la liste de genres <code>adas-tags</code> (les noms de genre du programme, qui sont en hongrois, p. ex. <i>Akció;Dráma</i>).</p>
<h2>En créer un</h2>
<p>À partir d’une liste M3U prête : <code>node tools/make-pack.mjs liste.m3u8 --kind tv|vod --id exemple --name "Exemple"</code>. Un assistant IA peut aussi en créer un à partir d’une page web, d’un tableur ou d’une liste de fichiers : la description exacte du format et des instructions pour l’IA prêtes à coller se trouvent dans le code source (<code>docs/ADASPACK.md</code>).</p>
<button class="btn" data-ext="https://github.com/mesehordo/adas-iptv/blob/main/docs/ADASPACK.md">Ouvrir la description complète et les instructions pour l’IA</button>
<div class="note">N’ajoutez que des contenus que vous pouvez regarder légalement.</div>`,
  },
  {
    id: 'update',
    cat: 'about',
    title: 'Mises à jour',
    keywords: 'mise à jour nouvelle version update télécharger installer github version',
    body: `
<p>La version de bureau (Windows, macOS, Linux) se met à jour d’elle-même depuis <b>GitHub</b>, à partir des versions officielles (<code>github.com/mesehordo/adas-iptv</code>). Paramètres → <b>Mises à jour</b> :</p>
<ul>
<li><b>Rechercher les mises à jour au démarrage</b> (activé par défaut) : à chaque démarrage, il vérifie s’il existe une nouvelle version ; si oui, vous recevez une notification et pouvez l’installer aussitôt avec le bouton <i>Mettre à jour</i>. Si vous ne le souhaitez pas, désactivez-le – il ne cherchera alors que sur demande.</li>
<li><b>Rechercher les mises à jour maintenant</b> : recherche immédiate ; pour une nouvelle version, les notes de version et le bouton <b>Télécharger et installer</b> apparaissent.</li>
<li>L’installation suit le mode d’installation : installé avec l’installateur (Setup), le nouvel installateur démarre ; installé avec MSI, le nouveau MSI ; pour la version <b>portable</b>, le fichier téléchargé se trouve dans le dossier qui s’ouvre (lancez-le à la place de l’ancien) ; sous Linux, l’AppImage se remplace elle-même.</li>
<li><b>Source des mises à jour</b> : vide pour les versions officielles. Vous pouvez indiquer votre propre dépôt GitHub (<code>propriétaire/dépôt</code>) ou l’adresse d’un fichier JSON : <code>{ "version": "1.25.0", "url": "https://…/Adas-Setup-1.25.0.exe", "notes": "…" }</code>.</li>
</ul>
<div class="note">La version Android se met à jour en installant le nouvel <code>.apk</code> téléchargé depuis la page de la version sur GitHub (vos paramètres sont conservés).</div>
${go('#/settings?section=update', 'Mises à jour')}`,
  },

  // ===================================================================== Divers
  {
    id: 'privacy',
    cat: 'about',
    title: 'Données et confidentialité',
    keywords: 'confidentialité données stockage où suivi compte dossier',
    body: `
<ul>
<li>Pas de compte, pas d’inscription, pas de suivi, et le programme n’envoie nulle part de données sur votre utilisation.</li>
<li>Tous les paramètres, profils et listes téléchargées sont stockés <b>localement</b> :
  <ul>
  <li>Windows : <code>%APPDATA%\\Adás</code></li>
  <li>macOS : <code>~/Library/Application Support/Adás</code></li>
  <li>Linux : <code>~/.config/Adás</code></li>
  <li>Sur TV et Android : dans le stockage propre de l’application.</li>
  </ul> ${t('backup', 'Sauvegarde et déménagement')}</li>
<li>Le programme se connecte aux serveurs suivants : iptv-org (liste des chaînes et données), les sources de guide TV activées, les adresses de vos listes, les serveurs hébergeant les logos des chaînes, et pendant la lecture les serveurs des flux eux-mêmes. Comme tout site web, ils peuvent voir votre adresse IP.</li>
<li>Pour le cast et la transmission des paramètres, la version de bureau lance un petit serveur sur le <b>réseau local</b> (autour du port 47800). Le relais n’est utilisable qu’avec une clé aléatoire, nouvelle à chaque démarrage ; les paramètres ne peuvent être téléchargés qu’avec le code, valable 15 minutes.</li>
<li>Les statistiques de visionnage, les codes PIN et les paramètres ne sont envoyés nulle part.</li>
</ul>`,
  },
  {
    id: 'about',
    cat: 'about',
    title: 'À propos et sources',
    keywords: 'à propos version source licence iptv-org hls.js electron remerciements',
    body: `
<p><b>Adás</b> – un lecteur de TV en direct avec une interface façon service de streaming, pour Windows, macOS, Linux, Android et les téléviseurs LG webOS. Licence MIT.</p>
<h2>Sources des données</h2>
<ul>
<li><b>iptv-org/iptv</b> et <b>iptv-org/api</b> – liste des chaînes, données des chaînes, logos (communautaires, publics).</li>
<li>Guide TV : <b>iptv-epg.org</b>, <b>epgshare01.online</b>, <b>i.mjh.nz</b>, ainsi que la source propre de la liste de lecture.</li>
<li>Listes intégrées : <b>Free-TV/IPTV</b>, <b>BuddyChewChew/app-m3u-generator</b> (Pluto TV, Samsung TV Plus, Plex), <b>freecasthub/public-iptv</b>, <b>DragonHall TV</b>.</li>
</ul>
<h2>Bibliothèques utilisées</h2>
<ul>
<li><b>Electron</b> – application de bureau,</li>
<li><b>hls.js</b>, <b>mpegts.js</b>, <b>dash.js</b> – lecture,</li>
<li><b>esbuild</b>, <b>@webos-tools/cli</b> – création du paquet TV.</li>
</ul>
<p>Les styles de l’interface s’inspirent seulement de l’apparence de services et de systèmes connus ; le programme n’a aucun lien avec eux et n’utilise pas leurs logos.</p>`,
  },
];
