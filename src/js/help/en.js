// Adás built-in help (English). Same structure as help-content.js (identical ids and cats); loaded by help.js.
// The texts are trusted HTML fragments shipped with the program.

export const HELP_CATEGORIES = [
  { id: 'start', title: 'Getting started' },
  { id: 'watch', title: 'Watching and playback' },
  { id: 'vod', title: 'VOD (films and series)' },
  { id: 'find', title: 'Search and browsing' },
  { id: 'guide', title: 'TV guide and reminders' },
  { id: 'personal', title: 'Personalisation' },
  { id: 'lists', title: 'Channel lists' },
  { id: 'tv', title: 'On TV and Android' },
  { id: 'trouble', title: 'Troubleshooting' },
  { id: 'about', title: 'Other' },
];

const go = (href, label) => `<a class="btn small" href="${href}">${label}</a>`;
const t = (id, label) => `<a href="#/help?topic=${id}">${label}</a>`;

export const ARTICLES = [
  // ===================================================================== Getting started
  {
    id: 'welcome',
    cat: 'start',
    title: 'Welcome to Adás',
    keywords: 'introduction what is this overview start',
    body: `
<p class="lead">Adás plays live TV channels from all over the world, in an interface similar to streaming services. It downloads the channel list from <b>iptv-org</b>’s public, community-run collection – more than ten thousand free-to-air streams.</p>
<h2>Parts of the interface</h2>
<table class="help-table">
<tr><td><b>Home</b></td><td>Overview: weather, what’s on your favourite channels, news, tonight’s programmes, TV and VOD continue. ${t('dashboard', 'Details')}</td></tr>
<tr><td><b>TV</b></td><td>Four tabs: Channels, TV guide, Browse and (on desktop) Recordings. The Channels tab has recently watched, favourites, what’s on now and rows by category. ${t('home', 'Details')}</td></tr>
<tr><td><b>TV guide</b> (under TV)</td><td>A timeline grid: what’s on now and later on each channel. ${t('guide-grid', 'Details')}</td></tr>
<tr><td><b>Browse</b> (under TV)</td><td>All TV channels, filtered by category, country, language and quality. ${t('browse', 'Details')}</td></tr>
<tr><td><b>VOD</b></td><td>Films and series: online lists and your own media library, in rows sorted by unified genres. ${t('vod-lists', 'Details')}</td></tr>
<tr><td><b>Favourites</b></td><td>Your marked channels – their order gives the channel numbers – and below them your favourite films and series (details page → ☆ Favourite). ${t('favorites', 'Details')}</td></tr>
<tr><td><b>Search</b> (magnifier)</td><td>Search channels and programmes. ${t('search', 'Details')}</td></tr>
<tr><td><b>Bell</b></td><td>Your programme reminders. ${t('reminders', 'Details')}</td></tr>
<tr><td><b>Profile picture</b></td><td>Switch profile, refresh the channel list, add a channel, help, settings.</td></tr>
</table>
<h2>Quick start in five steps</h2>
<ol>
<li>Choose a profile (on the “Who’s watching?” screen), or create your own. ${t('profiles', 'Profiles')}</li>
<li>Click a channel on the home page – it starts right away. ${t('playing', 'Playback')}</li>
<li>Mark your favourites with the <b>+</b> button on the card. ${t('favorites', 'Favourites')}</li>
<li>Choose an interface style under Settings → Appearance. ${t('themes', 'Styles')}</li>
<li>If a channel is missing, add it as your own channel or your own list. ${t('custom-channels', 'Own channels')}</li>
</ol>
<div class="tip"><b>Tip:</b> help can be opened from anywhere with the <kbd>F1</kbd> or <kbd>?</kbd> key, or with the question-mark icon in the header – it always opens on the topic for the screen you’re using.</div>`,
  },
  {
    id: 'first-steps',
    cat: 'start',
    title: 'The first start',
    keywords: 'start loading slow first time profile country language',
    body: `
<p>At the first start, a short wizard asks for the <b>interface language</b>, then creates your <b>profile</b> (name and profile picture) and, if you like, a <b>kids profile</b> (this can be skipped). Then the program downloads the channel list and the channel data (countries, languages, logos, categories – about 25 MB in total). Depending on your connection this can take half a minute; afterwards the processed list is saved, so later starts take only a few seconds.</p>
<h2>What happens in the background?</h2>
<ol>
<li><b>Channel list</b>: download and processing (refreshes itself every 6 hours).</li>
<li><b>TV guide</b>: downloading the switched-on sources (by default those of your home country) – this runs in the background after the interface appears. ${t('epg-sources', 'Sources')}</li>
<li><b>Availability check</b>: the desktop and TV versions quietly try the streams of the channels being shown. ${t('health', 'Details')}</li>
</ol>
<h2>Recommended first settings</h2>
<ul>
<li><b>Home country</b> (Settings → Content and kids → Content): its channels come first and get the channel numbers. It is set from the language chosen at the first start.</li>
<li><b>Interface style</b>: choose from sixteen looks, per profile. ${t('themes', 'Styles')}</li>
<li><b>Kids profile</b>: if a child uses the app too, give them a separate profile. ${t('kids', 'Details')}</li>
</ul>
${go('#/settings', 'Open Settings')}`,
  },
  {
    id: 'navigation',
    cat: 'start',
    title: 'Using a mouse, keyboard or remote',
    keywords: 'navigation arrows focus mouse keyboard remote enter back',
    body: `
<p>Adás can be fully controlled with a mouse, a keyboard and a TV remote.</p>
<h2>With a mouse</h2>
<ul>
<li>Click a card: play. On hover (depending on the style) buttons appear: play, favourite, details.</li>
<li>Right-click a card: the channel’s details page.</li>
<li>Page through rows with the arrows at their ends, or scroll horizontally.</li>
</ul>
<h2>With a keyboard / remote</h2>
<ul>
<li><kbd>←</kbd> <kbd>→</kbd> <kbd>↑</kbd> <kbd>↓</kbd>: move the selection (white frame) around the screen. The program picks the nearest item in that direction.</li>
<li><kbd>Enter</kbd> / OK: play, or press the selected button.</li>
<li><kbd>I</kbd>: the selected channel’s details page. <kbd>F</kbd>: favourite on/off.</li>
<li><kbd>Esc</kbd> / <kbd>Backspace</kbd> / Back: close, or go back to the previous screen.</li>
</ul>
<p>All keys: ${t('shortcuts', 'Keyboard shortcuts')} · On TV: ${t('tv-remote', 'Remote control buttons')}</p>`,
  },
  {
    id: 'shortcuts',
    cat: 'start',
    title: 'Keyboard shortcuts',
    keywords: 'hotkey key kbd shortcut command',
    body: `
<h2>General</h2>
<table class="help-table keys">
<tr><td><kbd>←</kbd> <kbd>→</kbd> <kbd>↑</kbd> <kbd>↓</kbd></td><td>Move around the interface</td></tr>
<tr><td><kbd>Enter</kbd></td><td>Play / select</td></tr>
<tr><td><kbd>I</kbd></td><td>The selected channel’s details page</td></tr>
<tr><td><kbd>F</kbd></td><td>Favourite on/off (on a card)</td></tr>
<tr><td><kbd>Ctrl</kbd>+<kbd>F</kbd> or <kbd>/</kbd></td><td>Search</td></tr>
<tr><td><kbd>F1</kbd> or <kbd>?</kbd></td><td>Help for the current screen</td></tr>
<tr><td><kbd>Esc</kbd> / <kbd>Backspace</kbd></td><td>Back, close window</td></tr>
</table>
<h2>During playback</h2>
<table class="help-table keys">
<tr><td><kbd>↑</kbd> / <kbd>↓</kbd>, <kbd>PageUp</kbd> / <kbd>PageDown</kbd></td><td>Previous / next channel</td></tr>
<tr><td><kbd>←</kbd> / <kbd>→</kbd></td><td>Volume down / up</td></tr>
<tr><td><kbd>0</kbd>–<kbd>9</kbd></td><td>Type a channel number (switches after 1.3 s)</td></tr>
<tr><td><kbd>Space</kbd> / <kbd>K</kbd></td><td>Pause / resume</td></tr>
<tr><td><kbd>Enter</kbd> / <kbd>L</kbd></td><td>Channel list panel</td></tr>
<tr><td><kbd>M</kbd></td><td>Mute</td></tr>
<tr><td><kbd>F</kbd></td><td>Full screen</td></tr>
<tr><td><kbd>N</kbd></td><td>Mini player (desktop version)</td></tr>
<tr><td><kbd>S</kbd></td><td>Favourite on/off</td></tr>
<tr><td><kbd>I</kbd></td><td>The channel’s details page</td></tr>
<tr><td><kbd>Esc</kbd></td><td>Close panel → leave mini mode → leave full screen → close player</td></tr>
</table>`,
  },

  // ===================================================================== Watching
  {
    id: 'playing',
    cat: 'watch',
    title: 'Starting playback',
    keywords: 'watch start play source backup connect',
    body: `
<p>You can start a channel in several ways:</p>
<ul>
<li>click its card (or select it and press <kbd>Enter</kbd>),</li>
<li>with the <b>Play</b> button on its details page, or the ▶ button of a specific stream source,</li>
<li>in the TV guide by clicking the channel name, or with the <b>Watch now</b> button on a programme that’s on,</li>
<li>in the player from the channel list, with the up/down buttons, or by typing the channel number.</li>
</ul>
<h2>What happens at start?</h2>
<p>A channel can have several <b>stream sources</b> (different quality, region or server). The program starts with the one it judges best: it prefers one that worked before and better quality, and ranks geo-restricted or not 24/7 sources lower.</p>
<p>If the source doesn’t start within 20 seconds, or stalls during playback, the program tries the next source by itself (“Trying another source 2/3…”). If there is still an untried source, it switches after 10 seconds on a stalled stream (otherwise it waits 30 seconds). This can be switched off: Settings → Playback → <i>Automatic backup source</i>.</p>
<h2>Previous channel, volume per channel, subtitle style</h2>
<p>The <kbd>R</kbd> key (or the ↺ button on the control bar, or the <i>Previous</i> button of the phone remote) switches back to the channel you watched before. Under Settings → Playback you can switch on <b>Volume per channel</b>: every channel remembers its own volume. The same place sets the subtitle size, colour (white, yellow, light blue) and background (dark band, shadow, none).</p>
<p>If none of the sources work, the <b>“This stream isn’t available right now”</b> window appears, where you can retry, move on to the next channel, or go back. ${t('trouble-playback', 'What can I do then?')}</p>`,
  },
  {
    id: 'player-controls',
    cat: 'watch',
    title: 'The player controls',
    keywords: 'player buttons controls volume full screen live',
    body: `
<p>The controls appear when you move the mouse or press any button, and disappear after 3.5 seconds of inactivity.</p>
<h2>At the top</h2>
<ul>
<li><b>← Back</b>: close the player.</li>
<li>The channel’s logo, <b>channel number</b>, name, country and – if you started it from a row – the row’s name.</li>
<li>The <b>LIVE</b> badge.</li>
</ul>
<h2>At the bottom</h2>
<ul>
<li><b>NOW</b>: the title, time and progress bar of the programme that’s on; below it the next programme (if there is a TV guide).</li>
<li>▶/❚❚ <b>Pause</b> – on a live stream it resumes from where the buffer is.</li>
<li>⌃ ⌄ <b>Previous / next channel</b>. ${t('channel-switching', 'How is the order decided?')}</li>
<li>🔊 <b>Volume</b> and mute (the volume is kept for the next start).</li>
<li>＋/✓ <b>Favourite</b>, ⓘ <b>Details</b>.</li>
<li>☾ <b>Sleep timer</b>. ${t('sleep', 'Details')}</li>
<li><b>CC</b> – <b>Audio and subtitles</b>: choose the audio track and subtitles (<kbd>C</kbd>). ${t('audio-subs', 'Details')}</li>
<li>⚙ <b>Quality and source</b>. ${t('quality', 'Details')} The <b>📊 Stream info</b> panel is here too (<kbd>D</kbd>): resolution, bitrate, download speed, buffer. ${t('stream-info', 'Details')}</li>
<li>☰ <b>Channel list panel</b> on the right, with a filter.</li>
<li>↺30 / ↻30 <b>Rewind and fast-forward</b> in a live stream, <b>Jump to live</b>. ${t('timeshift', 'Details')}</li>
<li>▦ <b>Several streams at once</b>. ${t('multiview', 'Details')}</li>
<li><b>Cast</b> to Chromecast or a DLNA TV (desktop version). ${t('cast', 'Details')}</li>
<li><b>Mini player</b>, <b>Full screen</b>; the extra buttons can be hidden one by one. ${t('pip-mini', 'Details')}</li>
</ul>
<div class="tip">Double-click the picture: full screen (in mini mode: back to normal size). A single click on the picture: pause / resume.</div>`,
  },
  {
    id: 'channel-switching',
    cat: 'watch',
    title: 'Switching channels and channel numbers',
    keywords: 'channel number number switch up down order lineup panel',
    body: `
<h2>Up / down switching</h2>
<p><kbd>↑</kbd>/<kbd>↓</kbd> (or CH+/CH−) steps through the list you started the channel from. If you started from the “Sport” row, for example, you switch between sports channels; if from your favourites, between your favourites. If you started from search or a details page, your favourites (or, if you have none, the home country’s channels) give the order.</p>
<h2>Channel numbers</h2>
<p>The numbers work just like on a TV: <b>the order of your favourites gives the first numbers</b> (1, 2, 3…), followed by the home country’s channels. You can change the order on the Favourites page by dragging. ${go('#/favorites', 'Favourites')}</p>
<p>During playback, type the number (<kbd>0</kbd>–<kbd>9</kbd>, up to 4 digits) – it shows in the top-right corner, and switches after 1.3 seconds.</p>
<h2>Channel list panel</h2>
<p>During playback, <kbd>Enter</kbd> or <kbd>L</kbd> (the blue button on TV) opens the list’s channels on the right, with what’s on now. You can filter by name at the top.</p>`,
  },
  {
    id: 'quality',
    cat: 'watch',
    title: 'Quality and stream source',
    keywords: 'quality resolution 1080p 720p source bitrate automatic',
    body: `
<p>The player’s ⚙ button (the yellow button on TV) opens a menu:</p>
<ul>
<li><b>Quality</b>: with <i>Automatic</i>, the player adapts the resolution to the bandwidth and the window size (in a small window or the mini player it doesn’t load Full HD). You can fix the best or a lower quality by hand (e.g. on slow mobile data). Many streams are only available in a single quality – the menu says so then.</li>
<li><b>Maximum quality</b> (Settings → Playback): a permanent ceiling for every stream – 1080p, 720p, 480p or 360p (data saver). Less stalling and less data on a slow or mobile connection. Changing it during playback takes effect immediately.</li>
<li><b>Source</b>: all the channel’s stream sources with a status dot (green = worked, red = didn’t, grey = not checked). If one stalls, try another.</li>
</ul>
<p>Choose the audio track and subtitles in the <b>CC</b> button’s menu. ${t('audio-subs', 'Audio and subtitles')}</p>
<div class="note">Quality selection works with the hls.js and dash.js players. A TV’s built-in player decides the quality itself. ${t('engines', 'Playback engines')}</div>`,
  },
  {
    id: 'audio-subs',
    cat: 'watch',
    title: 'Audio track and subtitles – everywhere',
    keywords: 'audio track sound language dub original subtitles cc embedded teletext subtitle favourite language',
    body: `
<p>The player’s <b>CC</b> button (or the <kbd>C</kbd> key, or the remote’s <i>Subtitle</i> button on TV) opens the <b>Audio and subtitles</b> menu – <b>for live streams, films, series and your own videos alike</b>.</p>
<h2>Audio track</h2>
<p>If the stream or file contains several audio tracks (e.g. a dub and the original language, or narration), choose here. The program shows the track names in the interface language (<i>English</i>, <i>German</i>, <i>Hungarian</i>…). If there is only one track, the menu says so.</p>
<h2>Subtitles</h2>
<ul>
<li><b>Embedded subtitles</b>: those contained in the stream or video file itself (HLS / DASH subtitle track, MP4 / MKV subtitle track). Only these are available for live streams.</li>
<li><b>External subtitles</b> (films, series, own videos): an .srt file next to the video, a Feliratok.eu or OpenSubtitles result, or your own file. ${t('subtitles', 'Subtitles')}</li>
<li>One subtitle shows at a time: if you choose an external one, the embedded one switches off, and vice versa.</li>
<li>The <b>size</b> can be set everywhere; the <b>time offset</b> applies to external subtitles.</li>
</ul>
<h2>Favourite languages per profile</h2>
<p>At the bottom of Settings → Subtitles and information → <b>Info and subtitles in your language</b> you can set <b>which audio track</b> (the stream’s default / your language / English) and <b>which embedded subtitles</b> (off / your language / English) your profile asks for. The player picks these automatically for every new stream and video, when available.</p>
<div class="note">The desktop version can also switch audio tracks with the built-in player (MP4, MKV). On TV, audio track switching in the built-in player depends on the device; for HLS streams the hls.js player works everywhere.</div>
${go('#/settings?section=huinfo', 'Set favourite languages')}`,
  },
  {
    id: 'pip-mini',
    cat: 'watch',
    title: 'Mini player and the player buttons',
    keywords: 'mini floating window always on top buttons control bar hide cc record',
    body: `
<h2>Mini player (<kbd>N</kbd>, desktop version only)</h2>
<p>The whole Adás window shrinks to 480×270 pixels, moves to the bottom-right corner of the screen and stays <b>always on top</b>. Only the picture and a few basic buttons show then. Double-click or <kbd>Esc</kbd>: back to normal size. Not available on TV.</p>
<h2>The player buttons</h2>
<p>The extra buttons on the control bar (record, 30 s back / forward, previous channel, favourite, details, audio and subtitles (CC), sleep timer, channel list, multi-view, cast, mini player, full screen) can be hidden one by one: Settings → Playback → <b>Player buttons</b>. The keys work even when the button is hidden; pause, volume and the ⚙ menu are always shown.</p>`,
  },
  {
    id: 'sleep',
    cat: 'watch',
    title: 'Sleep timer',
    keywords: 'timer sleep switch off night end of programme',
    body: `
<p>Set it with the player’s ☾ button: 15, 30, 45, 60, 90, 120 minutes or <b>“At the end of the programme”</b> (this takes the end of the current programme from the TV guide – only available if the channel has programme data).</p>
<p>The small number on the button shows the minutes left. In the last 15 seconds the sound fades out gently, then playback stops and the player closes. To switch it off: <i>Off</i> in the same menu.</p>`,
  },
  {
    id: 'engines',
    cat: 'watch',
    title: 'Playback engines',
    keywords: 'hls.js native built-in player mpegts dash engine format m3u8 ts mpd',
    body: `
<p>Streams come in different formats, so the program uses several playback engines:</p>
<table class="help-table">
<tr><td><b>hls.js</b></td><td>HLS streams (<code>.m3u8</code>) – the desktop version’s default; supports quality and audio track selection.</td></tr>
<tr><td><b>Built-in player</b></td><td>The system’s / TV’s own player. On TV this is the default for HLS, because there hls.js couldn’t reach many streams due to CORS restrictions.</td></tr>
<tr><td><b>mpegts.js</b></td><td>MPEG-TS (<code>.ts</code>) and FLV streams.</td></tr>
<tr><td><b>dash.js</b></td><td>DASH (<code>.mpd</code>) streams.</td></tr>
</table>
<p>Settings → Playback → <b>Playback engine</b>: <i>Automatic</i> (recommended), <i>Built-in player</i> or <i>hls.js</i>. If an HLS stream doesn’t start with one, try the other. On TV the program does this by itself: if the built-in player can’t cope, it tries the same source with hls.js too.</p>`,
  },

  // ===================================================================== VOD
  {
    id: 'vod',
    cat: 'vod',
    title: 'VOD – films and series',
    keywords: 'film movie series vod cinema episode season continue public domain own media library nas online lists channel sorting',
    body: `
<p>Besides live TV channels, Adás also plays <b>films and series</b> (VOD – video on demand). These aren’t channels but standalone videos – they can be started at any time, seeked, and resumed where you left off. In the menu, <b>VOD</b> stands separately, after the TV parts (Home, TV guide, Browse, Favourites).</p>
<h2>Two parts: online lists and own media library</h2>
<p>At the top of the VOD page there are two tabs: <b>Online lists</b> (the built-in and added film / series lists) and <b>Own media library</b> (playlists found in the folders of your NAS / computer).</p>
<h2>Channel or VOD?</h2>
<p>Only live streams are among the channels, and only films and series in VOD. If a channel list (e.g. one from an IPTV provider) also contains films or series episodes – a duration marker (<code>#EXTINF:5400</code>), a <code>/movie/</code> or <code>/series/</code> address, or a video file with a year / episode number – they go to VOD by themselves (with the list’s name). The other way round: if a VOD list contains a live stream (an HLS / TS address without duration, with a “Live / TV” group or a tvg-id), it goes among the channels. In Settings, next to the lists, you can see how many were moved.</p>
<h2>The Online lists page</h2>
<ul>
<li><b>Continue</b>: the films and series you’ve started (the progress bar shows where you are).</li>
<li><b>Series</b>, <b>Recommended films</b>, then the <b>unified genres</b> (the most popular first; by default the 12 most popular get a row, the rest can be switched on under Settings → VOD and media library → VOD lists → <i>VOD page rows</i>, and they can always be chosen in the filter), and finally one row per list. The genre names follow <b>AnimeAddicts’ genre list</b> (Action, Drama, Fantasy, Adventure, Crime, Mystery, Romance, Sci-fi, Thriller, Comedy…), extended with the <i>Documentary</i> and <i>Cult film</i> genres. The lists’ own groups – in any language, e.g. “Horror all night”, “Comedy”, “Vígjáték” – are mapped to these, so a genre appears only once. Mere characteristics (e.g. <i>Not for kids</i>, <i>Short episode(s)</i>, <i>CGI</i>) can be chosen in the filter but don’t get their own row. A title can appear in <b>several genres</b>: it gets the genre of each of its lists, files and groups (e.g. if it’s in both <code>action.m3u8</code> and <code>comedy.m3u8</code> of your own genre pack). In your own media library, playlists that can’t be tied to a genre (e.g. “Christmas”) stay as separate rows under their own name.</li>
<li>With the <b>All films</b>, <b>All series</b> and <b>Search and filter</b> buttons you get a grid view filtered by type, group and year.</li>
</ul>
<p>The header search finds films and series too (under a separate “VOD – films and series” heading).</p>
<h2>Details page</h2>
<p>Clicking a cover opens the details page:</p>
<ul>
<li><b>Film</b>: title, year, length, groups, source; <i>Play</i> or <i>Resume from xx:xx</i>, <i>From the start</i>, <i>Mark as watched</i>.</li>
<li><b>Series</b>: seasons in tabs (each showing watched / all episodes), the list of episodes (watched ones faded, started ones with a progress bar), overall progress; the main button starts the next episode to watch. The <i>Mark season as watched</i> button marks (or clears) all episodes of the season at once.</li>
<li><b>+ Watchlist</b>: puts the film / series on your own list – it shows in the <i>Watchlist</i> row of the VOD page (the row can be switched on/off and moved).</li>
<li><b>✎ Title and cover</b>: a window with the displayed title (e.g. if no title in your language is found) and the cover image. You can <b>search cover images with your own search term</b> too (e.g. the original or Japanese title) – sources without a key: AniList, Kitsu, MyAnimeList (anime), TVmaze (series), Wikipedia in your language and English, Wikidata; with your own key TMDB and OMDb (IMDb data). You can also enter your own image address or image file, and restore the original cover. The change takes effect with the <i>Save</i> button.</li>
</ul>
<h2>Title in your language, cover image</h2>
<p>The cards and the top of the details page show the film / series <b>title in your language</b> if known (Wikidata, TMDB with a TMDB key) – on the details page the original / English title is shown below it, on the card on hover. Search finds the item by the translated title too. For items without a cover, the program looks for one by itself; if it finds none, the card shows the title on a coloured background, and you can set one any time with the <b>Title and cover</b> button on the details page. A title and cover entered by hand apply in every profile.</p>
<p>The watched state is stored <b>per profile</b>. In a kids profile only family, kids and animation content shows.</p>
${go('#/vod', 'Open VOD')}`,
  },
  {
    id: 'vod-player',
    cat: 'vod',
    title: 'Watching films: seeking, resuming, next episode',
    keywords: 'seek jump forward back 10 seconds timeline next episode resume automatic external player vlc mpv iina ac3 dts mkv no sound embedded subtitles',
    body: `
<p>When playing films and series episodes, a <b>timeline</b> (elapsed / remaining time) shows at the bottom of the player instead of the live programme. Click or drag it to jump anywhere.</p>
<table class="help-table keys">
<tr><td><kbd>←</kbd> / <kbd>→</kbd></td><td>10 s back / forward (60 s with <kbd>Shift</kbd>)</td></tr>
<tr><td><kbd>↑</kbd> / <kbd>↓</kbd></td><td>Volume</td></tr>
<tr><td><kbd>0</kbd>–<kbd>9</kbd></td><td>Jump to 0–90% of the video</td></tr>
<tr><td><kbd>Space</kbd> / <kbd>Enter</kbd></td><td>Pause / resume</td></tr>
<tr><td><kbd>PageUp</kbd> / <kbd>PageDown</kbd> (CH+/CH−)</td><td>Previous / next episode</td></tr>
<tr><td><kbd>I</kbd></td><td>Details page</td></tr>
<tr><td>⏪ ⏩ on the remote</td><td>30 s back / forward</td></tr>
</table>
<h2>Resuming</h2>
<p>The program saves where you are every 5 seconds and on exit. Next time the <i>Continue</i> button starts from there; the <i>From the start</i> button from the beginning. Once you’ve watched 94% of the video, it counts as watched.</p>
<h2>Next episode</h2>
<p>For series, a <b>Next episode</b> prompt with an 8-second countdown appears at the end of an episode – <i>Play</i> starts it immediately, <i>Cancel</i> stops it. It can be switched off: Settings → VOD and media library → VOD lists → <i>Start the next episode automatically</i>.</p>
<p>Here the sleep timer’s “At the end of the programme” setting means the end of the video.</p>
<h2>Audio tracks and embedded subtitles (playback bridge)</h2>
<p>On its own, the built-in player (the Chromium engine) can’t play <b>AC3 / E-AC3 / DTS / TrueHD</b> audio (it doesn’t even see these tracks), doesn’t show <b>subtitles embedded</b> in the file at all (MKV: ASS / SRT, MP4: mov_text), and can’t show the picture of some old video formats (XviD, WMV, 10-bit H.264) either.</p>
<p>So the <b>desktop version</b> takes a quick look at the file’s tracks whenever a film / episode starts (built-in <b>FFmpeg</b>) and, if needed, plays it through the <b>playback bridge</b>: the picture stays unchanged, the audio is converted to AAC on the fly, and the embedded subtitles are put into the <b>CC</b> menu. That way every audio track can be chosen, seeking works (the bridge restarts from the chosen point), and the profile’s favourite audio and subtitle languages apply too. For subtitles the default is <i>The file’s default</i>: the subtitles marked as default in the file are shown, and without a mark – if the audio isn’t in your language – the subtitles in your language.</p>
<p>The subtitle styling (ASS font, colours, positioning) becomes plain text. To switch it off: Settings → Playback → <i>Playback bridge (FFmpeg)</i>. The bridge only downloads the part being played (about 90 seconds ahead), not the whole file.</p>
<h2>Android and Android TV: native player</h2>
<p>On Android, films and series episodes (MKV, MP4, AVI…) play with the built-in <b>native player</b> (ExoPlayer): the picture appears under the interface, the controls are the same. It handles <b>AC3 / E-AC3 / DTS / TrueHD</b> audio (with the FFmpeg decoder shipped with the program if the device can’t), subtitles embedded in the file (<b>ASS / SRT</b>, as plain text), and every audio track can be chosen in the <b>CC</b> menu. On a TV with a soundbar / amplifier the AC3 audio can also be passed through unchanged. If the native player can’t cope with a file, the program automatically tries the WebView’s own player. To switch it off: Settings → Playback → <i>Native player (ExoPlayer)</i>.</p>
<h2>In an external player</h2>
<p>If the bridge / native player is switched off or not available, the player notices when a file’s audio or picture doesn’t work and offers the <b>External player</b> button; the details page always has the <b>In an external player</b> button too.</p>
<ul>
<li><b>Windows / Mac / Linux</b>: the program hands a playlist to the system (for a series, from the chosen episode together with the rest), which opens it with the associated player. Recommended: <b>VLC</b> (on every system), <b>mpv</b>, on macOS <b>IINA</b>. If nothing opens, install one and associate it with <code>.m3u</code> files.</li>
<li><b>Android</b>: the system offers the installed video players (VLC, MX Player, Kodi…).</li>
<li>On the <b>TV</b> (LG) there is no such option; the TV’s own player often handles AC3 audio.</li>
</ul>
<p>In an external player Adás can’t follow where you are – but the current episode of a series is remembered.</p>`,
  },
  {
    id: 'vod-lists',
    cat: 'vod',
    title: 'Film and series lists',
    keywords: 'film list series list add github repository m3u m3u8 zip several files genre public domain orphaned add-on pack adaspack',
    body: `
<p>Films and series load from <b>separate lists</b>, like TV channels: Settings → VOD and media library → <b>VOD lists</b>.</p>
<h2>Built-in lists</h2>
<table class="help-table">
<tr><td><b>Orphaned Films</b></td><td>More than 1,300 public domain films grouped by theme, with cover images.</td></tr>
<tr><td><b>Public domain films (OnlineM3U)</b></td><td>Selected classic films by genre.</td></tr>
</table>
<p>Both contain films stored on archive.org that are out of copyright. Each can be switched on and off.</p>
<h2>Add-on packs</h2>
<p>An <code>.adaspack</code> file brings a list with a name and description, and appears among the <b>Built-in lists</b> – but it doesn’t ship with the program; it only exists on the device you load it onto:</p>
<ul>
<li>the <b>Load add-on pack</b> button (VOD lists), or</li>
<li>in the desktop version the <b>Packs folder</b> (the <code>packs</code> subfolder of the user data folder): whatever is there is loaded automatically at startup, and refreshed if the file changes;</li>
<li>the <b>backup</b> and the <b>transfer between devices</b> carry the packs too (e.g. from the computer to the phone).</li>
</ul>
<p>A film pack is named <code>…_vod.adaspack</code>, a TV pack <code>…_tv.adaspack</code> (the latter goes among the Channel lists). <b>Remove</b> only deletes it from this device. ${t('adaspack', 'Format and making one (with AI too)')}</p>
<h2>Adding your own list</h2>
<ul>
<li><b>From an address</b>: the address of an M3U / M3U8 list, a single video (e.g. <code>…/film.m3u8</code> or <code>.mp4</code>), or a <b>whole GitHub repository</b> (e.g. <code>https://github.com/author/repo</code>) – then the program loads all the repository’s playlists (up to 300 files). A GitHub link pointing to a folder or file inside a repository works too.</li>
<li><b>From a file</b> (desktop and Android versions): one or <b>several</b> <code>.m3u</code> / <code>.m3u8</code> files, or a <b>ZIP</b> package. Several files become one list:
  <ul>
  <li><b>Genre pack</b> – if it contains a file named <code>all</code>, or the same titles appear in several files (e.g. <code>all.m3u8</code> + <code>action.m3u8</code> + <code>drama.m3u8</code>): every film / episode appears once, and the file names become <b>genres</b> (separate rows on the Films page, and filterable).</li>
  <li><b>Separate lists</b>: joined together; the file name helps recognise series.</li>
  </ul>
  The text of large lists is stored separately and permanently (clearing the cache doesn’t delete it), and goes into the backup and the <i>Sync between devices</i> package too.</li>
<li><b>Pasted</b> as text.</li>
</ul>
<p>Every own list can be <b>switched on and off</b>, renamed and deleted. If several lists are on, the Films page also has one row per list, and in the grid view you can filter by list.</p>
<p>Items in adult genres (e.g. <i>hentai</i>, <i>erotic</i>) only show with the <i>Show adult content</i> setting; never in a kids profile.</p>
<p>The lists refresh every 6 hours; immediately: <i>Refresh lists now</i>. Next to each list you can see how many entries it gave, or the error message if it can’t be downloaded.</p>
<div class="warn">Only add lists whose content you can legally watch. The videos of free, unofficial lists often become unavailable quickly (e.g. expired hosting links).</div>
${go('#/settings?section=vodlists', 'Manage lists')}`,
  },
  {
    id: 'own',
    cat: 'vod',
    title: 'Own media library (NAS)',
    keywords: 'own nas folder share network drive smb http web server playlist m3u m3u8 automatic',
    body: `
<p>The VOD <b>Own media library</b> tab shows your own films and series – for example from <code>.m3u</code> / <code>.m3u8</code> playlists generated automatically in a folder on your NAS. It works just like the online VOD lists: covers, details page, resume, next episode, information and subtitles in your language.</p>
<h2>Adding a source</h2>
<p>Settings → VOD and media library → <b>Own media library (NAS)</b>:</p>
<table class="help-table">
<tr><td><b>Choose folder…</b> / <b>Enter folder path</b><br><small>(desktop version)</small></td><td>The NAS’s shared folder, e.g. <code>\\\\NAS\\Media\\Lists</code>, a network drive (<code>Z:\\Lists</code>) or a mounted folder on Linux / macOS (<code>/mnt/nas/lists</code>, <code>/Volumes/Media</code>). The program also looks through subfolders (up to 4 levels deep).</td></tr>
<tr><td><b>Network address (http)</b><br><small>(on every device, TV too)</small></td><td>If the NAS also makes the folder available via a web server (e.g. Synology Web Station, QNAP, an nginx / Apache directory listing): <code>http://192.168.1.10/lists/</code>. The program looks through the .m3u / .m3u8 links and subfolders (2 levels) found on the page. The address of a single list can be given too.</td></tr>
</table>
<h2>Switching playlists on and off</h2>
<ul>
<li>Under the source, <b>every playlist found appears in its own row</b> with its own switch (and the number of entries). There are <i>All on</i> / <i>All off</i> buttons too.</li>
<li>Newly appearing lists arrive <b>switched on</b> by default (can be changed: <i>New playlists switched on automatically</i>).</li>
<li>The whole source can be switched off or removed too (nothing is deleted on the NAS).</li>
</ul>
<h2>Automatic refresh</h2>
<p>The program checks the sources every 10 minutes and when the Own page is opened, so lists newly generated or changed by the NAS appear by themselves. Immediately: the <i>Rescan</i> button on the Own page or in Settings.</p>
<h2>Paths in the lists</h2>
<ul>
<li>Full addresses (<code>http://…</code>, <code>file://…</code>) unchanged,</li>
<li>Windows and UNC paths (<code>D:\\Films\\…</code>, <code>\\\\NAS\\…</code>) and Unix paths (<code>/volume1/…</code>) as local files,</li>
<li><b>relative paths</b> (<code>Films/Film.mkv</code>, <code>../Series/…</code>) relative to the playlist’s location.</li>
</ul>
<div class="note">Only the desktop version can play local / shared files (file://); on TV the NAS must serve the videos over http (e.g. with a DLNA / web server address). Playback depends on the browser engine’s format support: MP4 (H.264/AAC) and HLS work for sure, MKV partly, some codecs (e.g. DTS audio) don’t.</div>
<h2>Titles and subtitles</h2>
<p>From the file names (e.g. <code>Film.Title.2019.1080p.BluRay.x264</code>) the program extracts the title and the year, so information in your language and the OpenSubtitles search work too. A subtitle file with the same name next to the video (<code>Film.srt</code>, <code>Film.en.srt</code>) is <b>loaded automatically</b> (preferring your language), and you can choose it in the Subtitles menu under “Next to the video”. ${t('subtitles', 'Subtitles')}</p>
${go('#/settings?section=ownlists', 'Set up own media library')}`,
  },
  {
    id: 'subtitles',
    cat: 'vod',
    title: 'Subtitles (Feliratok.eu, OpenSubtitles, SubDL)',
    keywords: 'subtitle subtitles feliratok.eu opensubtitles subdl srt vtt language english time offset size api key season pack',
    body: `
<p>For films and series you can load <b>subtitles in your language or in English</b> from the <b>OpenSubtitles</b> and <b>SubDL</b> collections, from <b>Feliratok.eu</b> (a Hungarian subtitle site with Hungarian and English subtitles), or from your own <code>.srt</code> / <code>.vtt</code> file.</p>
<h2>Feliratok.eu – no setup needed</h2><p>Switched on by default: no account, no key, and no daily limit. For series it also extracts the episode’s subtitles from a season pack (ZIP); accents in old, non-UTF-8 subtitles are correct too. It offers Hungarian and English subtitles. Can be switched off: Settings → Subtitles and information → Info and subtitles in your language.</p><h2>SubDL (optional)</h2><p>More results with a free key: register on <b>subdl.com</b>, copy the API key from your profile, and enter it: Settings → Subtitles and information → <i>SubDL API key</i>. No password needed.</p><h2>OpenSubtitles (optional, set up once)</h2>
<ol>
<li>Register for free on <b>opensubtitles.com</b>.</li>
<li>Logged in, find the <b>API consumers</b> section in your profile and create a new key (any name will do, e.g. “Adás”).</li>
<li>In Adás: Settings → Subtitles and information → <b>Info and subtitles in your language</b> → enter the <b>API key</b>, your <b>username</b> and your <b>password</b>, then press <i>Test login</i>.</li>
</ol>
<p>The API key is enough for searching; <b>downloading also needs login</b>. With a free account a limited number of subtitles can be downloaded per day (the program shows how many are left after each download); subtitles downloaded once are remembered and don’t use up the quota again.</p>
<h2>Use during playback</h2>
<ul>
<li>The player’s <b>CC</b> button or the <kbd>C</kbd> key opens the <b>Audio and subtitles</b> menu (audio track, embedded and external subtitles). ${t('audio-subs', 'Details')}</li>
<li><b>Search subtitles</b> (below it, in smaller type, the currently active databases): one button searches every switched-on source, in your language and in English – results in the set language first. Feliratok.eu results come first (those matching year and title at the very top), then OpenSubtitles (by number of downloads, machine translations last) and SubDL; each result shows the language and the source. Click the one you want – it downloads and shows immediately.</li>

<li><b>Time offset</b>: if the subtitles are out of sync, adjust them in steps of ±0.5 seconds.</li>
<li><b>Size</b>: small, medium, large, huge.</li>
<li><i>Load subtitles from file</i> (desktop version): your own .srt or .vtt file.</li>
<li><i>Off</i>: hide the subtitles.</li>
</ul>
<p>The chosen subtitles <b>stay with that film / episode</b> and load by themselves next time. With the <i>Search subtitles automatically</i> setting, the best subtitles (in your language or English) load automatically whenever a film / episode starts.</p>
<div class="note">OpenSubtitles data (key, username, password) is stored only on this device and is only ever sent to opensubtitles.com. Matching is based on the film’s title and year; old or rare films may have no subtitles in your language.</div>
${go('#/settings?section=huinfo', 'Subtitle settings')}`,
  },
  {
    id: 'hu-info',
    cat: 'vod',
    title: 'Information about films and channels in your language',
    keywords: 'information description english title cover cover image poster picture wikipedia wikidata tmdb anilist tvmaze anime genre cast director rating',
    body: `
<p>The program looks for <b>information in your language</b> about films, series and TV channels, and shows it on the details page.</p>
<h2>VOD (films and series)</h2>
<ul>
<li><b>Title in your language</b> (if it differs from the original, it is also shown in italics below the title),</li>
<li><b>description</b> in your language if there is one (Wikipedia in your language, TMDB); if not, <b>in English</b> – the program says so,</li>
<li><b>cover image</b>: the list’s own image, otherwise from the sources (the Wikipedia article’s poster, AniList, TVmaze, TMDB); in the <b>own media library</b> the image next to the video (<code>Film.jpg</code>, <code>poster.jpg</code>, <code>folder.jpg</code>, <code>cover.jpg</code>) or the cover embedded in the file (MKV attachment, MP4) – the latter in the desktop version,</li>
<li><b>genre, director, studio, cast, country, year</b>, rating (AniList, TVmaze, TMDB).</li>
</ul>
<h2>TV channels</h2>
<p>On a channel’s details page, the <b>“About the channel”</b> section: a Wikipedia summary in your language (or English), owner, launch year – from Wikidata, otherwise from Wikipedia’s search in your language, then in English. The program only shows a description if the channel’s name (and, for Wikidata, its country) matches, so wrong descriptions don’t appear.</p>
<h2>Sources</h2>
<table class="help-table">
<tr><td><b>Wikidata + Wikipedia</b></td><td>Default, free, no key; article in your language or English.</td></tr>
<tr><td><b>AniList</b></td><td>For anime (the program recognises them from the list, the host or the genres): cover, English description, genres, score, studio. No key.</td></tr>
<tr><td><b>TVmaze</b></td><td>For series: image, English summary, genre, rating. No key.</td></tr>
<tr><td><b>TMDB</b> (The Movie Database)</td><td>If you enter your own free API key (themoviedb.org → Settings → API), film and series data comes from here too: richer descriptions in your language and ratings.</td></tr>
</table>
<p>If a provider asks to slow down (too many requests), the program stops asking for a while and continues later. <b>AnimeAddicts</b> reviews are only available when logged in, so the program doesn’t read them.</p>
<p>The data goes into the cache (for 30 days), so it appears instantly the second time. To switch it off: Settings → Subtitles and information → Info and subtitles in your language → <i>Download information and cover images</i>.</p>
${go('#/settings?section=huinfo', 'Settings')}`,
  },
  {
    id: 'vod-detect',
    cat: 'vod',
    title: 'How does it tell films from series?',
    keywords: 'detection film series episode S01E02 season episode name format',
    body: `
<p>M3U lists don’t mark separately what is a film and what is a series, so the program decides from the <b>title</b>. If the title has an episode marker, it treats it as a <b>series episode</b>, otherwise as a <b>film</b>.</p>
<h2>Recognised episode markers</h2>
<table class="help-table">
<tr><td><code>S01E02</code>, <code>S1 E2</code>, <code>S04.E23</code></td><td>season + episode</td></tr>
<tr><td><code>1x02</code></td><td>season + episode</td></tr>
<tr><td><code>Season 2 Episode 5</code>, <code>Staffel 2 Folge 5</code>, <code>Saison 2 Épisode 5</code></td><td>season + episode</td></tr>
<tr><td><code>2. évad 5. rész</code></td><td>season + episode (Hungarian)</td></tr>
<tr><td><code>Episode 5</code>, <code>Ep. 5</code>, <code>Folge 5</code>, <code>Part 5</code>, <code>5. rész</code></td><td>episode (season 1)</td></tr>
<tr><td><code>第5集</code>, <code>第5話</code></td><td>episode (Chinese / Japanese)</td></tr>
</table>
<h2>The series name</h2>
<p>The text <b>before</b> the marker is the series name (e.g. “The Goldbergs S04 E23” → <i>The Goldbergs</i>, season 4, episode 23), what follows is the episode title. If there is no text before the marker, the <code>group-title</code> field, and finally the playlist’s file name, gives the series name. Episodes with the same name are grouped into one series, sorted by seasons and episodes.</p>
<h2>Films</h2>
<p>A year in brackets at the end of the title (e.g. “Night of the Living Dead (1968)”) is taken as the film’s year. The <code>group-title</code> field becomes the group / genre, <code>tvg-logo</code> the cover image, and the number after <code>#EXTINF</code> the length. Films with the same title and year from several lists merge into one film, and their versions serve as backup sources.</p>
<div class="tip">When making your own list, name the entries like this: <code>#EXTINF:-1 tvg-logo="cover.jpg" group-title="Comedy",Film title (1999)</code>, and for a series <code>…,Series title S01E01 Title of the first episode</code>.</div>`,
  },

  // ===================================================================== Search and browsing
  {
    id: 'dashboard',
    cat: 'find',
    title: 'The home page',
    keywords: 'home dashboard weather news rss tv guide favourites tonight continue place customise layout unit tile size',
    body: `
<p>The home page is an overview made of units (cards) that always <b>fits on one screen</b> on a desktop and on TV. On a phone (and on Android in portrait) the units are stacked and the page scrolls.</p>
<h2>Customising</h2>
<p>With the <b>Customise</b> button at the top right of the home page (or Settings → Home → <i>Customise home page</i>):</p>
<ul>
<li>the number of <b>columns</b> (1–5) and <b>rows</b> (1–4) of the grid,</li>
<li>per unit: <b>order</b> (‹ ›, or drag with the mouse), <b>width</b> (↔) and <b>height</b> (↕) in cells, <b>hide</b> (×),</li>
<li>bring back hidden units (<b>Add</b>), and the <b>Default</b> layout.</li>
</ul>
<p>Units always go to the first free place. If after a change something wouldn’t fit, the program won’t allow it – first shrink or hide another unit, or enlarge the grid. The layout is stored separately per profile. With a remote, the buttons can be reached with the arrows.</p>
<div class="tip"><b>Size matters:</b> every unit adapts what and how much it shows to its size – for example the number of news items and programmes, the news image and lead, the number of days in the weekly forecast, the density of the hourly breakdown, the size and number of VOD posters, or the TV guide’s time window.</div>
<h2>The units</h2>
<table class="help-table">
<tr><td><b>Weather</b></td><td>At the top today’s weather with the place name, below it today hour by hour (every two to three hours on a narrow card), at the bottom the weekly forecast. On a small card the weekly part, and even smaller the chart too, is dropped. Today’s part can look like: line chart, area + precipitation, bars, tiles or a single value. Place and look: Settings → <b>Home</b>. Source: Open-Meteo.</td></tr>
<tr><td><b>On TV now</b></td><td>Your favourite channels’ programmes, similar to the TV guide’s timeline grid (a 1–5 hour time window depending on the width). What doesn’t fit is indicated by a “+N more” line.</td></tr>
<tr><td><b>News</b></td><td>The latest news from the switched-on RSS / Atom sources – as many as fit (with a lead on a wide card). Clicking opens the news summary. Sources: Settings → <b>Home</b> → <i>News sources</i>. The default sources depend on the interface language. Not available in a kids profile.</td></tr>
<tr><td><b>Tonight on TV</b></td><td>One evening (after 7 pm) programme per favourite channel. Ask for a reminder with the bell button.</td></tr>
<tr><td><b>Last watched channel</b></td><td>The last watched channel with the current and next programme (with the programme description on a larger card), resumed with one press.</td></tr>
<tr><td><b>VOD – continue</b></td><td>The last 5 films / episodes watched, with poster and progress (as a list on a small card) – continues where you left off.</td></tr>
<tr><td><b>Favourite channels</b> (hidden by default)</td><td>The logos of your favourite channels in a grid, started with one click; with what’s on now on a larger tile.</td></tr>
<tr><td><b>Reminders</b> (hidden by default)</td><td>Your upcoming programme reminders; a programme already on gets a “NOW” badge and starts on click.</td></tr>
<tr><td><b>Clock and name day</b></td><td>A big clock with the date and – where available for your language – today’s (on a larger card also tomorrow’s) name day.</td></tr>
<tr><td><b>Exchange rates</b></td><td>The main currencies against your local currency, with the change from the previous day (ECB reference rates, updated on working days).</td></tr>
<tr><td><b>Sport</b></td><td>Live, recent and upcoming events from the leagues, teams, sports and calendars followed in the Sports tracker – any sport (tennis, handball, disc golf, World Chase Tag…). Where possible, a <b>📺</b> button suggests the channel to watch it on. ${t('sportwatch', 'Sports tracker')}</td></tr>
<tr><td><b>Recommended for you</b></td><td>Programmes on now on channels that fall into your most-watched categories but aren’t your favourites yet.</td></tr>
<tr><td><b>Watchlist</b></td><td>The posters of your own Watchlist (VOD details page → <i>+ Watchlist</i>).</td></tr>
<tr><td><b>New episodes</b></td><td>Series you watch that still have unwatched episodes after the last one you watched (“3 new episodes”).</td></tr>
<tr><td><b>Starting soon</b></td><td>Programmes starting in the next hour or so on your favourite (and the larger home) channels, with an “in x min” badge and a reminder bell.</td></tr>
<tr><td><b>Tonight’s films</b></td><td>Films starting tonight (from 6 pm) on your favourite and home channels, based on the TV guide category.</td></tr>
<tr><td><b>Viewing time</b></td><td>Today’s and this week’s viewing time, the days of the week as bars; for a kids profile the time left for today.</td></tr>
<tr><td><b>Discover</b></td><td>A randomly chosen (non-favourite) channel that’s on air right now – ask for a new one with <i>Another</i>.</td></tr>
<tr><td><b>Sun and air</b></td><td>Sunrise, sunset, day length, UV index and air quality at the weather’s place (Open-Meteo).</td></tr>
<tr><td><b>Note</b></td><td>Your own note (per profile), saved automatically.</td></tr>
</table>
<p>Some units aren’t on the home page by default: Customise → <b>Add</b>.</p>
<h2>Ready-made layouts, by time of day</h2>
<p>With the <b>Ready-made layout</b> buttons on the Customise toolbar you can load with one click: Default, Morning (weather, news, clock, exchange rates), Evening TV (programmes, tonight, continue), Sport, News and markets, Simple. With the <b>Switch by time of day</b> switch, the Morning layout appears between 5 and 10 am, Evening TV from 6 pm, and your own layout during the day.</p>
<p>On the <b>Last watched channel</b> card, the channel’s muted live picture starts after a few seconds (on desktop and Android, if Live preview is on).</p>
<p>The channel rows moved to the <b>TV</b> page (after Home in the menu). ${t('home', 'The TV page')}</p>
${go('#/settings?section=dashboard', 'Home page settings')}`,
  },
  {
    id: 'home',
    cat: 'find',
    title: 'The TV page (channels)',
    keywords: 'tv page channels recordings tab rows',
    body: `
<h2>Tabs</h2>
<p>The <b>TV</b> page (after Home in the menu) is for the channels. At the top there are four tabs: <b>Channels</b>, <b>TV guide</b>, <b>Browse</b> (live TV streams only, with filters) and – in the desktop version – <b>Recordings</b> (your own TV recordings). ${t('recording', 'About recordings')}</p>
<h2>Rows</h2>
<p>The Channels tab has horizontally scrolling rows: Recently watched, Your favourites, On TV now, your home country’s channels, your own lists, the categories (News, Sport, Films…) and the country tiles. The <b>order and visibility of the rows can be set per profile</b>. ${t('home-rows', 'How?')}</p>
<h2>All items of a row on one page</h2>
<p>Next to every row title there is a <b>round arrow ›</b>: clicking (tapping) it opens <b>all</b> items of the row on one page. With a remote or keyboard, stepping to the end of the row does the same with an <b>“All”</b> tile (OK / Enter). It works the same for VOD rows, the <i>Continue</i> row and the country tiles.</p>
<h2>Home country first</h2>
<p>In every list and category the channels of your <b>home country</b> come first, followed by channels <b>in its language</b> (e.g. from neighbouring countries), and within those the working streams with a logo and better quality; the order changes a little every day so you always discover something new. In search, an exact name match stays at the very top. The home country can be changed under Settings → Content and kids → Content. ${t('card-badges', 'Card badges')}</p>`,
  },
  {
    id: 'card-badges',
    cat: 'find',
    title: 'What do the badges on the cards mean?',
    keywords: 'dot green red bar FHD HD 4K star badge icon',
    body: `
<table class="help-table">
<tr><td><span class="st st-ok"></span> green dot</td><td>The stream worked last time.</td></tr>
<tr><td><span class="st st-bad"></span> red dot</td><td>None of the sources answered during the check. ${t('health', 'Checking')}</td></tr>
<tr><td><b>OFFLINE</b> label, grey picture</td><td>The channel isn’t available right now; under its name: “Offline – currently unavailable”.</td></tr>
<tr><td><b>OFF AIR</b> label</td><td>A channel that only broadcasts at certain times (not 24/7) and isn’t on now; under its name: “Off air – not broadcasting now”.</td></tr>
<tr><td>no dot</td><td>The program hasn’t checked it yet.</td></tr>
<tr><td><b>HD / FHD / 4K</b></td><td>The best available quality (720p / 1080p / 2160p).</td></tr>
<tr><td>red bar at the bottom</td><td>The progress of the programme on now (if there is a TV guide).</td></tr>
<tr><td>★</td><td>The channel is among your favourites.</td></tr>
<tr><td>“Now: …” label</td><td>The title of the programme on now; without a TV guide, the country and category.</td></tr>
</table>
<p>More badges on the details page: <b>Geo-restricted</b> (may only be watchable from that country), <b>Not 24/7</b> (only broadcasts at certain times), <b>N sources</b> (several stream sources).</p>`,
  },
  {
    id: 'search',
    cat: 'find',
    title: 'Search',
    keywords: 'search finder result programme title accent',
    body: `
<p>Click the magnifier in the header, or press <kbd>/</kbd> or <kbd>Ctrl</kbd>+<kbd>F</kbd> (the yellow button on TV), and start typing – results appear instantly.</p>
<h2>What does it search?</h2>
<ul>
<li>the channel’s name and other names (e.g. “BBC” also finds “BBC World News”),</li>
<li>the country (<i>German</i>, <i>Germany</i> or <i>DE</i>), the category (<i>sport</i>, <i>news</i>), the network (<i>Pluto TV</i>), the name of your own list,</li>
<li><b>programme titles</b> in the next 48 hours (if there is a TV guide) – these appear separately, under a “Programmes” heading; programmes on now show a NOW badge.</li>
</ul>
<h2>Tips</h2>
<ul>
<li>Accents and upper/lower case don’t matter: “cafe” = “Café”.</li>
<li>With several words, each must match: “sport german” only gives German sports channels.</li>
<li>Move from the search field to the results with <kbd>↓</kbd> or <kbd>Enter</kbd>.</li>
<li>Clicking a programme result opens its details page, where you can watch it right away or ask for a reminder.</li>
</ul>`,
  },
  {
    id: 'browse',
    cat: 'find',
    title: 'Browsing and filters',
    keywords: 'browse filter category country language quality status sort',
    body: `
<p>The <b>Browse</b> page shows all channels (visible to your profile). Without filters, category and country tiles at the top help you.</p>
<table class="help-table">
<tr><td><b>Search</b></td><td>Text in the channel’s name, other name, country or category – applies <b>together</b> with the other filters (e.g. “home” + United Kingdom + English). From the header search’s results page, the <i>Filter by country, language, category</i> button brings you here with the search text.</td></tr>
<tr><td><b>Category</b></td><td>News, Sport, Films, Kids, Music… (the number of channels in brackets).</td></tr>
<tr><td><b>Country</b></td><td>The channel’s country.</td></tr>
<tr><td><b>Language</b></td><td>The stream’s language (where known).</td></tr>
<tr><td><b>Quality</b></td><td>HD (720p) or Full HD (1080p) and better.</td></tr>
<tr><td><b>Status</b></td><td>Working / not checked / unavailable. ${t('health', 'Checking')}</td></tr>
<tr><td><b>Sort</b></td><td>Recommended order (working channels first, then those not yet checked, and at the end channels that are offline, off air or not watchable from here; within each group, home and popular channels first), by name or by country.</td></tr>
</table>
<p>The filters can be combined (e.g. Sport + Germany + HD). The <b>Clear filters</b> button resets them all. The list loads gradually as you scroll.</p>`,
  },
  {
    id: 'channel-info',
    cat: 'find',
    title: 'The channel details page',
    keywords: 'details information country language owner website source',
    body: `
<p>To open it: the card’s ⌄ button, right-click, the <kbd>I</kbd> key, or the ⓘ button during playback.</p>
<h2>What does it contain?</h2>
<ul>
<li><b>Header</b>: logo, name, status, quality, number of sources, restrictions, the programme on now with description and progress; Play and Favourite buttons.</li>
<li><b>Programmes</b>: from yesterday to the day after tomorrow, by day; the programme on now highlighted. For a future programme, ask for a reminder with the 🔔 button. ${t('reminders', 'Reminders')}</li>
<li><b>Data</b>: country, category, language, network, owner, launch year, closure, other names, time zone, own list name, website (opens in the system browser).</li>
<li><b>Stream sources</b>: all sources with status, quality and restrictions; each can be started separately ▶. The <b>Check sources</b> button tries them all immediately.</li>
</ul>`,
  },

  // ===================================================================== TV guide
  {
    id: 'guide-grid',
    cat: 'guide',
    title: 'The TV guide grid',
    keywords: 'tv guide epg grid timeline now day tomorrow',
    body: `
<p>The <b>TV guide</b> page shows the channels’ programmes on a timeline: one channel per row, time horizontally (with half-hour marks). The red vertical line is the <b>present moment</b>.</p>
<h2>Filters</h2>
<ul>
<li><b>Favourites</b> – your favourite channels in their own order,</li>
<li><b>[Home country]</b> – the home channels,</li>
<li><b>All channels</b> – every channel that has programme data.</li>
</ul>
<p>Day selector: from yesterday to 3 days ahead. The <b>Jump to now</b> button takes you back to the present.</p>
<p><b>Category</b> (Film, Series, Sport, News, Kids, Documentary, Entertainment, Music): only channels with such a programme that day remain, other programmes are shown faded. Recognition is based on the TV guide’s category and the programme title.</p>
<p><b>Timeline / On now</b>: in the <i>On now</i> view, one large card per channel shows the programme on now (with progress) and the next one – for a quick overview, comfortable with a remote too.</p>
<p>On a programme’s details page, the <b>Add to calendar</b> button saves a calendar file (.ics) that Google Calendar, Outlook or your phone’s calendar can import (with a 5-minute reminder); on desktop the <b>● Record</b> button schedules a recording of the programme (${t('recording', 'Recording')}).</p>
<h2>Use</h2>
<ul>
<li>Click a <b>programme</b>: its details page opens (description, duration, category) – with <i>Watch now</i> for a programme that’s on, and a <i>Reminder</i> button for a future one.</li>
<li>Click the <b>channel name</b> on the left: it starts immediately; up/down switching then steps through the grid’s channels.</li>
<li>Programmes on now have a dark red background, past ones are faded, those with a reminder show 🔔.</li>
</ul>
<p>Only channels with programme data appear. ${t('trouble-epg', 'Why not for every channel?')}</p>`,
  },
  {
    id: 'reminders',
    cat: 'guide',
    title: 'Reminders',
    keywords: 'reminder notification bell alert starts',
    body: `
<p>You can ask for a reminder for a future programme in the TV guide (click the programme → <b>🔔 Reminder</b>), on the channel’s details page (the 🔔 next to the programme) or from the search results.</p>
<ul>
<li><b>Every airing</b>: on the programme’s details page, the <b>↻ Every airing</b> button asks for a reminder for every airing of the programme on that channel (for series, news, regular shows). Endings like “– Episode 312” are ignored, and the airings of the next 7 days are added automatically.</li>
<li><b>When does it go off?</b> Settings → Notifications → Reminders: at the start or 1–30 minutes before.</li>
<li><b>Automatic switching</b>: when on, it switches to the channel when the programme starts (after an 8-second countdown that the <i>Stay</i> button stops), if Adás is open.</li>
<li>The 🔔 icon in the header shows your reminders and “every airing” rules; you can delete them there too.</li>
<li>Reminders are stored <b>per profile</b>, and move along with the profile.</li>
</ul>
<h2>Where and how does it notify?</h2>
<table class="help-table">
<tr><td><b>Windows / Mac / Linux</b></td><td>Inside the program and in the system’s notification centre; clicking starts the channel. With the <i>Run in the background</i> setting it goes off even after the window is closed (Adás stays in the tray), and <i>Start with the system</i> starts it in the tray at login (on Mac in the menu bar, on Linux it’s added to the autostart programs). On Linux the tray icon needs AppIndicator support (on GNOME the <i>AppIndicator</i> extension); without it, the hidden window comes back when you start the program again.</td></tr>
<tr><td><b>Android, Android TV</b></td><td>The system notifies you – even if Adás is closed, and after the phone restarts. The first time, notifications must be allowed. Clicking starts the channel.</td></tr>
<tr><td><b>LG TV</b></td><td>It goes off if Adás is running; as a pop-up over other TV apps.</td></tr>
<tr><td><b>Browser</b></td><td>Only while the page is open.</td></tr>
</table>
<div class="note">With the portable (no-install) Windows version, Windows doesn’t always show the system notification – the in-program notification appears even then. The installed version has no such limitation.</div>
${go('#/settings?section=reminders', 'Reminder settings')}`,
  },
  {
    id: 'epg-sources',
    cat: 'guide',
    title: 'TV guide sources',
    keywords: 'epg xmltv source matching refresh own tv guide',
    body: `
<p>Programme data comes from sources in <b>XMLTV</b> format. Under Settings → TV guide you see each of them: how many channels it was matched to, how many programmes it contains, and, if it fails, what the error is.</p>
<h2>Built-in sources</h2>
<ul>
<li>Switched on by default: the source(s) of your home country (set at the first start) and the playlist’s own source.</li>
<li>Can be switched on: Hungary, Slovakia, Romania, Germany, the United Kingdom, the USA, France, Italy, Spain, as well as the Pluto TV, Samsung TV Plus and Plex channel guides. The more sources are on, the longer loading takes.</li>
</ul>
<h2>Your own source</h2>
<p><b>Add XMLTV source</b>: any <code>.xml</code> or <code>.xml.gz</code> address can be entered (e.g. the TV guide of your provider or of a community site). A newly added source goes to the top of the list and takes priority.</p>
<h2>How does matching work?</h2>
<p>The program compares the source’s channel id and display name with the channel list: first exact id, then id + country, name + country, and finally an unambiguous name. If several sources have data for a channel, the one higher in the list wins.</p>
<p><b>Refresh</b>: automatically at the set frequency (every 3–48 hours), or immediately with the <i>Refresh TV guide now</i> button, or the <i>Refresh channel list</i> item in the profile menu.</p>`,
  },

  // ===================================================================== Personalisation
  {
    id: 'profiles',
    cat: 'personal',
    title: 'Profiles',
    keywords: 'profile user who is watching switch colour create delete',
    body: `
<p>Every family member can use their own profile. At start (if there are several profiles) the <b>“Who’s watching?”</b> screen greets you; later you can switch by clicking the profile picture in the header.</p>
<h2>Managing</h2>
<p>Profile menu → <b>Manage profiles</b> → click a profile to edit it (name, profile picture, colour, kids profile, delete), or the <b>Add profile</b> button.</p>
<h2>Profile picture</h2>
<p>In the editor you can choose from 11 drawn profile pictures (fox, bunny, robot, characters, zen vases…), or the <b>letter</b> version: the first letter of the name on a background of the chosen colour. The profile picture shows on the “Who’s watching?” screen, in the header and in the profile menu.</p>
<p><b>Own picture</b>: with the <i>Upload own picture…</i> button you can choose any PNG (or JPG, WebP) image. The program crops it to a square (from the centre) and scales it down to 256×256 pixels; the picture is stored with the profile, so it moves to other devices along with the profile. On TV there’s no file picker: the picture of a profile taken over from the computer appears there.</p>
<h2>What belongs to the profile, and what is shared?</h2>
<table class="help-table">
<tr><th>Separate per profile</th><th>Shared by all profiles</th></tr>
<tr><td>Favourites and their order (channel numbers)<br>Recently watched channels<br>Reminders<br>Interface style<br>Order of the home page rows<br>Kids profile setting</td>
<td>Channel lists and own channels<br>TV guide sources<br>Home country, playback settings<br>Availability check results<br>Volume</td></tr>
</table>
${go('#/profiles', 'Manage profiles')}`,
  },
  {
    id: 'kids',
    cat: 'personal',
    title: 'Kids profile and adult content',
    keywords: 'kids child kids profile adult filter 18 nsfw parental',
    body: `
<h2>Kids profile</h2>
<p>When editing a profile, switch on <b>Kids profile</b>. Then, by default, only <b>kids content</b> shows – on the home page, the TV and VOD pages, in browsing, search and the TV guide. The news card isn’t shown in a kids profile either.</p>
<h2>What counts as kids content?</h2>
<p>By default, channels in the <b>Kids, Animation, Family and Education</b> categories, and films and series in kids, family and animation groups / genres (never adult genres). This mark is <b>shared by all profiles</b>, and can be set by hand: on the channel’s and the film’s / series’ <b>details page</b> with the <b>Kids content</b> button (in an adult profile), or in the Settings → Content and kids → <b>Kids profiles – what can they watch?</b> list.</p>
<h2>What can the kids profile watch?</h2>
<p>Settings → Content and kids → <b>Kids profiles – what can they watch?</b>: on the <b>TV channels</b> or <b>VOD</b> tab every row has the shared <i>Kids content</i> switch, and next to it <b>a separate switch for each kids profile</b> (with the profile’s name): so, for example, an older child can watch something a younger one can’t. With the filter you can see what is kids content, everything, or what a given kids profile can / can’t watch; narrow it down with search, and allow / block the visible results for a kids profile all at once. From a kids profile, settings only open with a PIN.</p>
<h2>Daily viewing time and age limit</h2>
<p>In the same place, per kids profile, you can set the <b>daily viewing time</b> (from 30 minutes to 4 hours, or unlimited) and the <b>age limit</b> (6, 12, 16, 18 years). It warns 5 and 1 minutes before the end; when the time is up, playback stops and can only continue with an adult profile’s PIN (+30 minutes). If, according to the TV guide, a live programme’s age rating is higher than the one set, the stream doesn’t start (or stops when the programme starts) – it can be unlocked for that programme with the parental PIN. (Not every TV guide provides age ratings; where there is no data, there is no restriction.)</p>
<div class="tip">For the restrictions, set a PIN for an adult profile (Manage profiles) – without a PIN, anyone can unlock them.</div>
<p>An adult (18+) channel never appears in a kids profile, even if you allow it by hand.</p>
<h2>Adult content</h2>
<p>Adult (18+) channels are hidden by default. To show them: Settings → Content and kids → Content → <b>Show adult content</b> (asks for confirmation). Filtering is based on iptv-org’s classification and blocklist.</p>
<div class="warn">Filtering relies on the public database’s marks, so it isn’t perfect. With younger children it’s worth supervising use; switching profiles from a kids profile isn’t password-protected unless an adult profile has a PIN.</div>`,
  },
  {
    id: 'favorites',
    cat: 'personal',
    title: 'Favourites and history',
    keywords: 'favourite star order drag history recently watched delete',
    body: `
<h2>Marking a favourite</h2>
<ul>
<li>the <b>+</b> button on the card (on hover), or the <kbd>F</kbd> key when selected (the red button on TV),</li>
<li>the + button on the details page, or during playback the + button or <kbd>S</kbd>.</li>
</ul>
<h2>Order</h2>
<p>On the <b>Favourites</b> page you can arrange the cards by dragging them with the mouse. The number in the top-left corner of a card is the <b>channel number</b>; type it during playback to switch there. ${t('channel-switching', 'Channel numbers')}</p>
<h2>History</h2>
<p>The last 30 channels watched show in the first row of the home page and at the bottom of the Favourites page. To delete: Favourites → <b>Clear history</b>. Settings → Playback → <i>Resume the last channel at startup</i>: the last watched channel starts automatically at launch.</p>`,
  },
  {
    id: 'themes',
    cat: 'personal',
    title: 'Interface styles',
    keywords: 'theme style look zen wabi sabi light dark neon manga comic console',
    body: `
<p>The look of the interface can be chosen per profile: <b>Settings → Appearance → Interface style</b> (drop-down menu, or click the samples). The change takes effect immediately.</p>
<p>The <b>layout is the same in every style</b> (top menu bar, the same card sizes, rows and cards on the home page) – the style only gives the look: colours, font, borders, shadows, background patterns, animations.</p>
<table class="help-table">
<tr><th colspan="2">Dark styles</th></tr>
<tr><td><b>Kurenai</b></td><td>(crimson) Evening cinema: black background, red highlights, cards that grow on hover.</td></tr>
<tr><td><b>Mahō</b></td><td>(magic) A fairy-tale deep-blue gradient, rounded cards with glowing borders.</td></tr>
<tr><td><b>Murasaki</b></td><td>(purple) Purple–pink gradients, glowing highlights.</td></tr>
<tr><td><b>Akane</b></td><td>(deep red) Black base, red markers, uppercase row titles.</td></tr>
<tr><td><b>Shinkai</b></td><td>(deep sea) Midnight-blue background, sea-blue highlights.</td></tr>
<tr><td><b>Garasu</b></td><td>(glass) Deep black background, translucent, blurred surfaces, floating shadows.</td></tr>
<tr><td><b>Futago</b></td><td>(twins) A handheld-console menu: dark grey base, a red–blue controller pair, square tiles with a pulsing turquoise border.</td></tr>
<tr><td><b>Neon City</b></td><td>A neon city at night: neon yellow, cyan and magenta, cut-corner cards, scan lines, “glitch” on selection.</td></tr>
<tr><td><b>Neo-Tokyo</b></td><td>The world of AKIRA: the silhouette of a ruined city at night at the bottom of the window, speeding red motorbike light trails, a Kaneda-red block logo with a white capsule badge, slanted title type, a red-glowing selection.</td></tr>
<tr><td><b>Kyokkō</b></td><td>(aurora) A slowly rippling colourful background, frosted-glass cards, a glowing selection. (On TV the background doesn’t move.)</td></tr>
<tr><td><b>Phosphor</b></td><td>A green phosphor monitor: fixed-width type, <code>$ ls</code> row titles, inverse selection.</td></tr>
<tr><th colspan="2">Light styles</th></tr>
<tr><td><b>Zen</b></td><td>Rice-paper white background, moss-green highlights, lots of space, quiet, slow movements, an ensō circle in the logo.</td></tr>
<tr><td><b>Wabi-sabi</b></td><td>Warm, earth-toned paper texture, slightly irregular cards, rust and indigo, a golden kintsugi crack on hover.</td></tr>
<tr><td><b>Asobiba</b></td><td>(playground) Striped background, white-bordered “bubble” cards, springy motion, a pulsing turquoise selection.</td></tr>
<tr><td><b>Hiroba</b></td><td>(plaza) The “channel” console menu: white, finely striped background, glossy grey-bordered tiles, blue selection.</td></tr>
<tr><td><b>16-Bit</b></td><td>The grey home console of the ’90s: purple buttons, coloured A–B–X–Y dots by the logo, pixel borders, blocky title type.</td></tr>
<tr><td><b>Manga</b></td><td>Black ink on white paper: screentone (dotted shading), thick panel borders, greyscale pictures (in colour when selected), speech-bubble buttons.</td></tr>
<tr><td><b>Pow!</b></td><td>American comics: Ben-Day dots, red–yellow–blue, thick black outlines with offset shadows, yellow caption-box row titles, a “POW!” starburst on windows.</td></tr>
<tr><td><b>Kikagaku</b></td><td>(geometry) Poster art: red–blue–yellow–black, cards with thick black borders and hard shadows, numbered rows.</td></tr>
<tr><td><b>Rakugaki</b></td><td>(doodle) A lined notebook page with handwriting: channels are taped-in polaroid photos, buttons drawn in pencil.</td></tr>
</table>
<p>The home page units (tiles) also get a look matching the style (border, shadow, background, titles). The player stays dark in every style, so the picture looks its best.</p>
<p><b>Custom theme</b>: by uploading a theme file or (on desktop) copying it into the theme folder – Settings → Appearance → <i>Custom themes</i>. ${t('custom-theme', 'Making a custom theme')}</p>
${go('#/settings', 'Appearance settings')}`,
  },
  {
    id: 'custom-theme',
    cat: 'personal',
    title: 'Making a custom theme',
    keywords: 'custom theme make theme file adastheme json css colours font folder upload template',
    body: `
<p>A theme is a single <b>JSON file</b> (<code>.adastheme</code> or <code>.json</code>) that defines the interface’s <b>look</b>: colours, fonts, background and decorative CSS. It <b>can’t change the layout</b> – Adás automatically filters out CSS that changes size, spacing, position or visibility, so a theme never breaks the interface apart. The full description (with a sample) is in the source code: <code>docs/TEMA-KESZITES.md</code> (in Hungarian).</p>
<h2>Loading</h2>
<ul>
<li><b>Upload</b> (on every device): Settings → Appearance → <i>Custom themes</i> → <b>Upload theme file…</b> The theme goes into the settings (backup and sync carry it too).</li>
<li><b>Theme folder</b> (desktop): the <code>themes</code> subfolder of the data folder (<b>Open theme folder</b>), or a folder of your own (<b>Other theme folder…</b>). Copied files are read at startup and with the <b>Rescan theme folder</b> button – handy for editing.</li>
<li><b>Save a template from the current style</b>: a theme file filled in with the colours of the style in use – a good starting point.</li>
</ul>
<h2>The file’s fields</h2>
<table class="help-table">
<tr><td><code>adasTheme</code></td><td><b>Required</b>, its value is <code>1</code>.</td></tr>
<tr><td><code>id</code></td><td><b>Required</b>: 2–40 characters, lowercase letters, digits, hyphen (e.g. <code>sakura</code>). The same <code>id</code> replaces the old one.</td></tr>
<tr><td><code>name</code></td><td><b>Required</b>: the name shown in the style picker.</td></tr>
<tr><td><code>description</code>, <code>author</code></td><td>Description, author.</td></tr>
<tr><td><code>tone</code></td><td><code>"dark"</code> (default) or <code>"light"</code>.</td></tr>
<tr><td><code>base</code></td><td>A built-in style whose decorations it builds on: <code>netflix</code> (Kurenai), <code>disney</code> (Mahō), <code>skyshowtime</code> (Murasaki), <code>rakuten</code> (Akane), <code>prime</code> (Shinkai), <code>apple</code> (Garasu), <code>zen</code>, <code>wabisabi</code>, <code>nintendo</code> (Asobiba), <code>switch</code> (Futago), <code>wii</code> (Hiroba), <code>cyberpunk</code> (Neon City), <code>neotokyo</code>, <code>manga</code>, <code>comic</code> (Pow!), <code>snes</code> (16-Bit), <code>bauhaus</code> (Kikagaku), <code>aurora</code> (Kyokkō), <code>sketch</code> (Rakugaki), <code>terminal</code> (Phosphor). Empty: a neutral base.</td></tr>
<tr><td><code>colors</code></td><td><code>bg</code> (background), <code>bg2</code> (cards, panels), <code>bg3</code>, <code>bg4</code> (further surfaces), <code>line</code> (lines), <code>text</code>, <code>textStrong</code> (headings), <code>muted</code> (faint text), <code>accent</code>, <code>accent2</code> (highlight). In CSS they are available as <code>var(--bg)</code>, <code>var(--bg-2)</code>, <code>var(--accent)</code>…</td></tr>
<tr><td><code>fonts</code></td><td><code>body</code> and <code>headings</code>: CSS <code>font-family</code> – installed fonts only, always with a fallback.</td></tr>
<tr><td><code>radius</code></td><td>Base corner radius, e.g. <code>"8px"</code>.</td></tr>
<tr><td><code>background</code></td><td>The page background (colour, gradient, pattern).</td></tr>
<tr><td><code>preview</code></td><td>The three colours of the picker sample: background, highlight, card.</td></tr>
<tr><td><code>css</code></td><td>Decorative CSS. Every rule is scoped to the theme; <code>&amp;</code> = the theme itself (the <code>body</code>).</td></tr>
</table>
<h2>What can the CSS do, and what not?</h2>
<p><b>Allowed</b>: colours, backgrounds, borders, <code>border-radius</code>, <code>box-shadow</code>, <code>text-shadow</code>, <code>filter</code>, <code>backdrop-filter</code>, <code>transform</code>, <code>transition</code>, <code>animation</code>, <code>@keyframes</code>, <code>@media</code>, font family / weight, <code>letter-spacing</code>, <code>text-transform</code>, <code>clip-path</code>, images as <code>url(https://…)</code> or <code>url(data:…)</code>.</p>
<p><b>Filtered out</b> (on plain elements): <code>width</code>, <code>height</code>, <code>margin</code>, <code>padding</code>, <code>top</code>/<code>left</code>/…, <code>gap</code>, <code>display</code>, <code>flex</code>, <code>grid</code>, <code>font-size</code>, <code>line-height</code>, <code>overflow</code>, <code>visibility</code>, <code>position</code> (except <code>relative</code>) and the like. On the decorative <code>::before</code> / <code>::after</code> pseudo-elements these can be used too (give them <code>pointer-events: none</code>). Always forbidden: <code>@import</code>, <code>javascript:</code>.</p>
<h2>Elements that can be decorated</h2>
<p><code>#nav</code> (menu bar), <code>.brand</code> (logo), <code>.links a.active</code>, <code>.btn</code> / <code>.btn.primary</code>, <code>.row-title</code>, <code>.card</code> / <code>.thumb</code> / <code>.card .name</code> (channel card), <code>.tile</code>, <code>.vposter</code> (VOD poster), <code>.dcard</code> / <code>.dc-title</code> (home page unit), <code>.d-row</code>, <code>.modal</code>, <code>.tab.active</code>, <code>.switch:checked</code>, <code>.input</code>, <code>.now-label</code>, <code>.bar i</code>, <code>.profile .avatar</code>, <code>:focus-visible</code> (selection – the most important on TV). On TV, use the <code>&amp;.tv</code> prefix to switch off slow effects (blur, infinite animation).</p>
<h2>Full example</h2>
<pre class="code">{
  "adasTheme": 1,
  "id": "sakura",
  "name": "Sakura",
  "description": "Cherry blossom: light pink, soft shadows.",
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
<div class="tip"><b>With artificial intelligence</b>: paste this help page (or <code>docs/TEMA-KESZITES.md</code>) into it and describe the mood of the theme you want – with the fields above it gives you a ready theme file you can upload.</div>
<div class="note">For a faulty file, a yellow message below the <i>Custom themes</i> list shows the error (e.g. invalid JSON, wrong <code>id</code>). Filtered-out CSS properties cause no error, they simply don’t apply.</div>
${go('#/settings', 'Appearance settings')}`,
  },
  {
    id: 'home-rows',
    cat: 'personal',
    title: 'Order of the TV and VOD page rows',
    keywords: 'order rows categories sort hide tv page vod genre drag',
    body: `
<p>Settings → Appearance → <b>TV page rows</b>, and Settings → VOD and media library → VOD lists → <b>VOD page rows</b>. The list shows the rows in the order they appear. The setting applies <b>only to the current profile</b>. For VOD the rows are: Continue, Watchlist, Series, Recommended films, the unified genres (with at least 6 titles), one row per list, Other films.</p>
<ul>
<li><b>Move</b>: grab the row by the ⋮⋮ handle and drag it into place, or use the ⌃ / ⌄ buttons (with a remote too: stay on the button and press it several times).</li>
<li><b>Hide</b>: the switch next to the row. A hidden row shows faded in the list but doesn’t appear on the page.</li>
<li><b>Default order</b>: resets everything.</li>
</ul>
<p>Available rows: Recently watched, Your favourites, On TV now, home channels, Own lists (every own list and your own channels in separate rows), all categories, Discover countries, and the – hidden by default – Categories tile row.</p>
<div class="tip">A category row only appears if at least 3 channels belong to it; in a kids profile only the categories suitable for children show.</div>`,
  },
  {
    id: 'settings-overview',
    cat: 'personal',
    title: 'Settings overview',
    keywords: 'settings options preferences',
    body: `
<p>The settings are arranged in groups. You can choose between two layouts on the right of the header (the choice is kept):</p>
<ul>
<li><b>▦ Tiles</b>: large tiles on the start page (icon + short description); clicking a tile opens the group, and the <i>‹ All settings</i> button (or Back) returns. Comfortable on TV, with a remote.</li>
<li><b>☰ Tabs</b>: the groups’ tabs at the top (scrolling horizontally on a phone), the selected group below.</li>
</ul>
<p>At the top of each group a sentence or two says what you’ll find there. The <b>search field</b> searches all settings in both views (e.g. <i>subtitles</i>, <i>theme</i>, <i>sync</i>): the sections containing a match are shown, with the matching rows highlighted.</p>
<table class="help-table">
<tr><td><b>🎨 Appearance</b></td><td>Interface language and style, custom themes, order of the TV page rows. ${t('themes', 'Styles')}</td></tr>
<tr><td><b>🏠 Home</b></td><td>Home page tiles, weather, news sources, live preview. ${t('dashboard', 'Home page')}</td></tr>
<tr><td><b>▶️ Playback</b></td><td>Backup source, maximum quality, volume, playback engine and playback bridge, player buttons. ${t('engines', 'Engines')}</td></tr>
<tr><td><b>💬 Subtitles and information</b></td><td>Subtitle sources (Feliratok.eu, OpenSubtitles, SubDL), subtitle appearance, favourite audio track, descriptions and cover images in your language. ${t('subtitles', 'Subtitles')}</td></tr>
<tr><td><b>⏺ Recordings</b></td><td>Recordings folder, margins before / after the programme, latest recordings (desktop version). ${t('recording', 'Recording')}</td></tr>
<tr><td><b>📺 Channel lists</b></td><td>Built-in and own playlists, own channels, availability check. ${t('lists', 'Lists')}</td></tr>
<tr><td><b>🎬 VOD and media library</b></td><td>Film and series lists, add-on packs, own (NAS) media library, VOD page rows. ${t('vod-lists', 'VOD lists')}</td></tr>
<tr><td><b>🗓️ TV guide</b></td><td>TV guide sources and refreshing. ${t('epg-sources', 'TV guide')}</td></tr>
<tr><td><b>👪 Content and kids</b></td><td>Home country, hidden and adult content, what kids profiles can watch. ${t('kids', 'Details')}</td></tr>
<tr><td><b>🔔 Notifications</b></td><td>Reminders, automatic switching, running in the background. ${t('reminders', 'Details')}</td></tr>
<tr><td><b>📱 Remote control and keys</b></td><td>Phone as a remote (with a QR code), keyboard shortcuts, TV remote buttons. ${t('remote', 'Remote control')}</td></tr>
<tr><td><b>🔄 Sync between devices</b></td><td>Transfer settings, profiles and lists to another device with a code.</td></tr>
<tr><td><b>💾 Profiles and backup</b></td><td>Profiles, backup and restore, automatic backups, cache. ${t('backup', 'Details')}</td></tr>
<tr><td><b>⬆️ Updates</b></td><td>Find and install a new version from GitHub; checking at startup can be switched off. ${t('update', 'Updates')}</td></tr>
<tr><td><b>ℹ️ About</b></td><td>Version, data folder location, data sources.</td></tr>
</table>
${go('#/settings', 'Open Settings')}`,
  },
  {
    id: 'backup',
    cat: 'personal',
    title: 'Backup, restore, cache',
    keywords: 'backup restore copy export import cache clear move',
    body: `
<h2>Save to file</h2>
<p>Settings → Profiles and backup → <b>Save to file</b>: writes the settings, all profiles with favourites, history, reminders, style and order, as well as your own lists and channels, into a <code>.json</code> file. That way you can take everything to another computer.</p>
<h2>Restore</h2>
<p><b>Restore from file</b>: the saved file overwrites the current settings and profiles (asks for confirmation), then the program restarts.</p>
<p><b>Add profiles from file</b>: only takes over the backup’s profiles (with favourites, history, reminders, profile picture, PIN); the current settings, lists and other profiles stay, and an identical profile is updated. The same works over the network with the <b>Profiles only</b> switch under <i>Sync between devices</i>.</p>
<h2>Is the profile file the same everywhere?</h2>
<p>Yes: every version (Windows, Mac, Linux, LG TV, Android, browser) uses the same format, so a backup can be loaded on any device. Where there is no file picker (TV), use the network (<i>Sync between devices</i>) or a web address.</p>
<table class="help-table">
<tr><th>Version</th><th>Where is the data?</th></tr>
<tr><td>Windows</td><td><code>%APPDATA%\\Adás\\store.json</code> (both the installed and the portable version save here)</td></tr>
<tr><td>macOS / Linux</td><td><code>~/Library/Application Support/Adás/store.json</code> / <code>~/.config/Adás/store.json</code></td></tr>
<tr><td>Android, Android TV</td><td>In the app’s own protected storage (not accessible from outside; lost if the app is uninstalled – back it up first)</td></tr>
<tr><td>LG TV</td><td>In the app’s own storage (lost if the app is uninstalled)</td></tr>
<tr><td>Browser</td><td>In the browser’s local storage, separately per address</td></tr>
</table>
<h2>Clear cache</h2>
<p>Deletes the downloaded lists, TV guide and processed catalogue – everything is downloaded fresh at the next start. Useful if something got “stuck”. It doesn’t touch your settings and profiles.</p>
<div class="note">On TV, saving to a file isn’t available – <i>Sync between devices</i> works there. On Android, saving uses the system’s file saver (e.g. to the Downloads folder or Google Drive).</div>`,
  },

  // ===================================================================== Channel lists
  {
    id: 'lists',
    cat: 'lists',
    title: 'Channel lists and refreshing them',
    keywords: 'list refresh update channel list m3u iptv-org automatic download new channels',
    body: `
<p>The program’s channels come from the <b>built-in lists</b>, <b>your own playlists</b> and <b>your own channels</b> added one by one.</p>
<h2>Built-in lists</h2>
<p>Settings → Channel lists → <b>Built-in lists</b>: each can be switched on and off with its own switch. Next to them you can see how many channels they give.</p>
<table class="help-table">
<tr><td><b>iptv-org</b></td><td>The largest community collection (about 10,000 channels), with detailed data (country, language, owner, website…). Its address can be changed with the <i>Address</i> button (e.g. a single country’s list).</td></tr>
<tr><td><b>iptv-org – Animation</b></td><td>iptv-org’s animation channels as a separate list; with iptv-org switched on they merge with it, on their own they’re useful if iptv-org is switched off.</td></tr>
<tr><td><b>Free-TV</b></td><td>Hand-picked free channels by country.</td></tr>
<tr><td><b>Pluto TV</b>, <b>Samsung TV Plus</b>, <b>Plex</b></td><td>Free, ad-supported streaming channels from several countries, with their own TV guide.</td></tr>
<tr><td><b>FreeCast Hub</b></td><td>A small selection (news, music, sport).</td></tr>
<tr><td><b>DragonHall TV</b></td><td>A single Hungarian internet stream.</td></tr>
</table>
<h2>Without duplicates</h2>
<p>If several lists are switched on, the same channel is often in several lists. The program <b>merges them into one channel</b>: the channel appears once, and its streams from the different lists become <b>backup sources</b> (if one doesn’t work, the player switches to the next by itself). On the details page, the <i>Channel lists</i> line shows which lists it’s in, and the <i>Stream sources</i> show where each source comes from.</p>
<p>How merging works: first by the channel id (<code>tvg-id</code>), then by name and country, and finally – if unambiguous – by name alone. The per-country versions of Pluto TV, Samsung TV Plus and Plex (e.g. “48 Hours” USA / Canada / United Kingdom) merge into one channel. Channels with the same name but a different country that are really different (e.g. “ABC News” Australia and USA) stay separate.</p>
<h2>Refreshing</h2>
<ul>
<li><b>Automatically</b>: the main list every 6 hours, the channel data daily; at startup the program starts immediately with the saved list and, if it’s old, refreshes it in the background.</li>
<li><b>Immediately</b>: profile menu (the profile picture in the header) → <b>Refresh channel list</b> – below it you can see when the last download was. Or: Settings → Channel lists → <b>Refresh all lists now</b>. Both reload everything bypassing the cache, together with the TV guide, and at the end show how many channels there are (and how many are new).</li>
</ul>
<h2>The iptv-org list address</h2>
<p>Settings → Channel lists → iptv-org → <b>Address</b>: another M3U address can be given (e.g. a single country’s list: <code>https://iptv-org.github.io/iptv/countries/uk.m3u</code>). Left empty, it goes back to the full list.</p>
<p>See also: ${t('custom-playlists', 'Adding your own playlist')} · ${t('custom-channels', 'Adding your own channel')}</p>
${go('#/settings?section=lists', 'Manage channel lists')}`,
  },
  {
    id: 'custom-playlists',
    cat: 'lists',
    title: 'Adding your own playlist',
    keywords: 'own list add m3u m3u8 url file paste suggested provider iptv',
    body: `
<p>You can add any M3U / M3U8 playlist – for example one from your provider, a community collection or your own compilation. Settings → Channel lists → My playlists:</p>
<table class="help-table">
<tr><td><b>Add list from address</b></td><td>Enter the list’s <code>http(s)://</code> address. The program downloads it immediately, shows how many streams it contains, then asks for a name (with a suggestion).</td></tr>
<tr><td><b>From file</b></td><td>One or more <code>.m3u</code> / <code>.m3u8</code> files, or a <b>ZIP</b> package (desktop and Android versions). Each file becomes a separate list that can be switched on and off.</td></tr>
<tr><td><b>Paste list as text</b></td><td>Paste the content of the list – or simply stream addresses, one per line, from which the program builds a list itself.</td></tr>
</table>
<h2>Managing</h2>
<ul>
<li><b>Switch</b>: the list can be switched off temporarily without deleting it.</li>
<li><b>Rename</b>, change <b>Address</b>, <b>Delete</b>.</li>
<li>Next to the row you see the number of channels, or the error message if the download fails.</li>
</ul>
<p>The channels of your own lists appear on the home page in a separate row with the list’s name (in place of <i>Own lists</i>), and also in Browse and search. Based on the list’s <code>group-title</code> (or <code>#EXTGRP</code>) field they are assigned to categories – group names in other languages too, e.g. <i>Nachrichten, Deportes, Films, Kids, Music, Documentary…</i> –, and based on <code>tvg-id</code> to the TV guide. The country comes from <code>tvg-country</code>, a group named after a country (e.g. “UK”), the ending of <code>tvg-id</code> (<code>.uk</code>) or a name prefix (<code>UK:</code>, <code>|UK|</code>, <code>[GBR]</code>); the language from <code>tvg-language</code>. That way the home country’s channels come first in your own lists too. Kodi-style headers after the address (<code>…/index.m3u8|User-Agent=…&amp;Referer=…</code>) work too. ${t('m3u-format', 'The M3U format')}</p>
<div class="warn">Only use lists whose content you can legally watch.</div>`,
  },
  {
    id: 'custom-channels',
    cat: 'lists',
    title: 'Adding your own channel',
    keywords: 'channel add own stream url custom stream try user-agent referer header',
    body: `
<p>You can also add a single stream, without a list: profile menu → <b>Add channel</b>, or Settings → Channel lists → <b>Add channel</b>.</p>
<h2>Fields</h2>
<table class="help-table">
<tr><td><b>Name</b> *</td><td>As it will appear in the interface.</td></tr>
<tr><td><b>Stream address</b> *</td><td>The <b>direct</b> stream address: HLS (<code>.m3u8</code>), MPEG-TS (<code>.ts</code>), FLV, DASH (<code>.mpd</code>) or MP4. A web page address (where the player is) doesn’t work.</td></tr>
<tr><td><b>Logo address</b></td><td>The address of an image (PNG, JPG, SVG). If empty, the initials of the name appear.</td></tr>
<tr><td><b>Category</b>, <b>Country</b></td><td>These decide which rows and filters it goes into.</td></tr>
<tr><td><b>Advanced: User-Agent, Referer</b></td><td>Some servers only send a picture with a specific browser identifier or referring page. If you see something like that at the source (e.g. <code>#EXTVLCOPT:http-referrer=…</code>), enter it here.</td></tr>
</table>
<p>The <b>Try it</b> button starts the stream without saving – so you can check in advance whether it works. After <b>Save</b>, the channel appears in the <i>Own channels</i> row of the home page, in Browse and in search, can be marked as a favourite, and can get a channel number.</p>
<p>Edit, play, delete: Settings → Channel lists → Own channels.</p>
<div class="note">On TV, the built-in player doesn’t always honour the User-Agent / Referer header.</div>
${go('#/settings?section=lists', 'Manage own channels')}`,
  },
  {
    id: 'm3u-format',
    cat: 'lists',
    title: 'The M3U playlist format',
    keywords: 'm3u format extinf tvg-id tvg-logo group-title extvlcopt structure example',
    body: `
<p>M3U is a simple text file: each stream is described by an <code>#EXTINF</code> line followed by the address line.</p>
<pre class="code">#EXTM3U x-tvg-url="https://example.com/guide.xml.gz"
#EXTINF:-1 tvg-id="BBCOne.uk" tvg-logo="https://…/bbc1.png" group-title="News",BBC One (1080p)
https://…/bbc1/index.m3u8
#EXTINF:-1 tvg-logo="https://…/logo.png" group-title="Sports",My sports channel [Geo-blocked]
#EXTVLCOPT:http-referrer=https://example.com/
#EXTVLCOPT:http-user-agent=Mozilla/5.0 …
https://…/sport/playlist.m3u8</pre>
<table class="help-table">
<tr><td><code>x-tvg-url</code></td><td>(header) the list’s own TV guide – the program loads it too.</td></tr>
<tr><td><code>tvg-id</code></td><td>The channel id; channel data and the TV guide are matched by it.</td></tr>
<tr><td><code>tvg-logo</code></td><td>The logo address.</td></tr>
<tr><td><code>group-title</code></td><td>Category (News, Sports, Movies, Kids, Music…; several separated by semicolons).</td></tr>
<tr><td>The text after the comma</td><td>The channel name; <code>(1080p)</code> is read as the quality, <code>[Geo-blocked]</code> and <code>[Not 24/7]</code> as badges.</td></tr>
<tr><td><code>#EXTVLCOPT</code>, <code>http-referrer</code>, <code>http-user-agent</code></td><td>HTTP headers needed for the stream.</td></tr>
</table>
<p>Lines with the same <code>tvg-id</code> appear as several sources of one channel.</p>`,
  },
  {
    id: 'health',
    cat: 'lists',
    title: 'Availability check',
    keywords: 'check working dot available dead link unavailable hide full',
    body: `
<p>Some of the free lists’ streams stop now and then or for good. So Adás checks which ones work:</p>
<ul>
<li><b>Automatically</b>: it tries the sources of the channels shown on screen (at most four per channel) in the background, again every 12 hours. Can be switched off: Settings → Channel lists → Availability check.</li>
<li><b>The way the player sees it</b>: it’s not enough that the server answers – the program also downloads the start of a real video segment through the playlist. So geo-restricted, expired or currently empty (not broadcasting) streams also get an <b>Offline</b> / <b>Off air</b> badge.</li>
<li><b>During playback</b>: what starts is marked as working, what doesn’t as broken. The background check can’t overwrite a failed playback as “working” for 12 hours.</li>
<li><b>Quick switching</b>: if a source doesn’t answer within 6 seconds, the player moves to the next; with several sources it tries the others in parallel meanwhile, and after 3 seconds switches to one that is surely live.</li>
<li><b>Full check</b>: Settings → Channel lists → Availability check → <b>Check all streams</b> – tries all (more than ten thousand) sources in a few minutes; with a progress bar, can be stopped.</li>
<li><b>On the details page</b>: <i>Check sources</i> – all sources of that channel, immediately.</li>
</ul>
<p>With <b>Hide unavailable channels</b> (Settings → Content and kids → Content) switched on, channels found broken disappear from the lists. <b>Clear results</b> sets everything back to “not checked”.</p>
<div class="note">Rarely, a “working” stream still doesn’t start (e.g. the computer can’t decode the video format) – this gets marked after the first failed playback. A “broken” stream may become available again later. Running in a browser, the check isn’t available.</div>`,
  },

  // ===================================================================== TV
  {
    id: 'android',
    cat: 'tv',
    title: 'Android: phone, tablet, Android TV',
    keywords: 'android phone mobile tablet android tv google tv shield box apk install',
    body: `
<p>The Android version is a single <code>.apk</code> file (<code>dist-android/Adas-…apk</code>) that runs on phones, tablets and <b>Android TV / Google TV</b> (Android 6.0 or newer). On a TV the TV interface for remotes starts.</p>
<h2>Installing</h2>
<ul>
<li><b>On a phone / tablet</b>: copy the APK over and open it. The first time you must allow the file manager (or browser) to install apps (“unknown sources”).</li>
<li><b>On Android TV</b>: the easiest is the <i>Send files to TV</i> app (send it from your phone), or a USB stick + file manager. On the TV, too, installing from unknown sources must be allowed (Settings → System / Security).</li>
</ul>
<h2>Use</h2>
<ul>
<li>On a phone there’s an icon menu bar at the bottom; during playback the picture is full screen, and can be watched in landscape when rotated. The first tap brings up the controls.</li>
<li>On TV: <b>OK</b> = play, <b>long-pressed OK</b> on a channel = details page (favourite, reminder, sources), <b>Back</b> = back (exit on the home page). If the remote has coloured buttons, CH+/CH− or ◀◀ / ▶▶, they work just like in the LG version.</li>
</ul>
<h2>Background playback</h2>
<ul>
<li><b>Background playback (audio only)</b>: Settings → Playback → <i>Background playback</i>. When on, the stream’s audio keeps playing when you switch to another app; a notification shows it, from where you can return or stop it. When off (the default), playback stops when you leave.</li>
</ul>
<div class="note">On Android there’s no casting, night mode audio or update check. Settings can be synced with a code with the computer and other Android devices, in both directions (${t('transfer', 'Sync between devices')}), and the phone can be used as a remote (${t('remote', 'Remote from phone')}). You get a new version by installing the new APK – the settings are kept.</div>`,
  },
  {
    id: 'tv-install',
    cat: 'tv',
    title: 'Installing on an LG webOS TV',
    keywords: 'lg webos tv install ipk developer mode ares',
    body: `
<p>The TV version is an <code>.ipk</code> package (<code>dist-webos/hu.adas.tv_…_all.ipk</code>) that runs on LG TVs made after 2018 (webOS 4.0 or newer). As it isn’t in the store, it can be installed in <b>developer mode</b>:</p>
<ol>
<li>Register a free account at <b>developer.lge.com</b>.</li>
<li>On the TV: LG Content Store → install the <b>Developer Mode</b> app, log in, switch on <i>Dev Mode Status</i> and <i>Key Server</i>, then restart the TV. The app shows the TV’s IP address and passphrase.</li>
<li>On the computer (Node.js needed), in the project folder:
<pre class="code">npx ares-setup-device        (add the TV: name “tv”, IP address, port 9922)
npx ares-novacom --device tv --getkey   (the passphrase is shown by the Developer Mode app)
npm run webos:install -- --device tv
npm run webos:launch -- --device tv</pre></li>
</ol>
<p>A graphical option: the <b>webOS Dev Manager</b> desktop program → <i>Install from file</i> → the <code>.ipk</code> file.</p>
<div class="warn">Developer mode expires every 50 hours; it can be extended with one press in the Developer Mode app. After it expires, the installed app disappears and has to be reinstalled.</div>`,
  },
  {
    id: 'tv-remote',
    cat: 'tv',
    title: 'Remote control buttons',
    keywords: 'remote coloured buttons red green yellow blue back ok magic remote',
    body: `
<table class="help-table keys">
<tr><td>Arrows, <b>OK</b></td><td>Move, select, play</td></tr>
<tr><td><b>Back</b></td><td>Back / close; on the home page asks whether to exit</td></tr>
<tr><td><span class="key red">●</span> Red</td><td>Favourite on/off for the selected channel (during playback, the one being watched)</td></tr>
<tr><td><span class="key green">●</span> Green</td><td>On a selected channel: details page; elsewhere: TV guide (during playback: details page)</td></tr>
<tr><td><span class="key yellow">●</span> Yellow</td><td>Search (during playback: quality and source)</td></tr>
<tr><td><span class="key blue">●</span> Blue</td><td>Favourites (during playback: channel list panel)</td></tr>
<tr><td><b>CH+ / CH−</b>, ↑ / ↓</td><td>Switch channels during playback</td></tr>
<tr><td><b>0–9</b></td><td>Channel number</td></tr>
<tr><td>▶ ❚❚ ■</td><td>Resume / pause / stop playback</td></tr>
</table>
<p>With the <b>Magic Remote</b>’s pointer everything can also be used like a mouse.</p>`,
  },
  {
    id: 'tv-limits',
    cat: 'tv',
    title: 'How is the TV version different?',
    keywords: 'tv difference limits webos cors service',
    body: `
<ul>
<li><b>Playback</b>: by default the TV’s built-in player plays HLS streams; if it can’t cope, it tries again with hls.js.</li>
<li><b>Downloads</b>: the TV’s browser engine doesn’t allow direct downloads from other servers (due to CORS restrictions), so a small <b>background service</b> in the package downloads the TV guide and lists that don’t allow it, and it also checks the streams.</li>
<li><b>Not available</b>: mini player, full screen button (it’s full screen anyway), saving to / loading from a file, opening external web pages, live preview on the home page.</li>
<li>Streams needing a custom User-Agent / Referer header don’t always start with the built-in player.</li>
<li>The first start may be slower (the TV’s processor is weaker); afterwards the processed list is saved.</li>
</ul>`,
  },

  // ===================================================================== Troubleshooting
  {
    id: 'trouble-playback',
    cat: 'trouble',
    title: 'The stream won’t start',
    keywords: 'won’t start not working error black screen unavailable timeout geo',
    body: `
<p>With free, community lists it’s common for a stream to be unavailable at the moment. Try in order:</p>
<ol>
<li>The <b>Retry</b> button – sometimes the server was just slow.</li>
<li>Another <b>source</b>: during playback ⚙ → Source, or another ▶ on the details page. ${t('quality', 'Details')}</li>
<li>Another <b>playback engine</b>: Settings → Playback → Playback engine (Built-in ↔ hls.js). ${t('engines', 'Details')}</li>
<li><b>Geo-restriction</b> (🌐): some streams can only be watched from certain countries. ${t('geo', 'Details')}</li>
<li><b>“Not 24/7”</b> badge: the channel only broadcasts at certain times.</li>
<li>Refresh the channel list (profile menu → Refresh channel list) – iptv-org may have found a new address meanwhile.</li>
<li>Switch on <b>Hide unavailable channels</b> so dead channels don’t get in the way.</li>
</ol>
<p>If a stream doesn’t work for a long time, it’s the source’s fault – the channel can be reported on iptv-org’s GitHub page.</p>`,
  },
  {
    id: 'geo',
    cat: 'trouble',
    title: 'Geo-restriction (🌐)',
    keywords: 'geo restriction geo-block geo-blocked country vpn 403 451 not watchable',
    body: `
<p>Many channels can only be watched from their own country, because of rights. Adás shows this in two ways:</p>
<table class="help-table">
<tr><td><b>🌐 GEO-BLOCKED</b> (orange label on the card, “Geo-restricted – not watchable from here”)</td><td>Certain: the broadcaster <b>rejected</b> the request from here (HTTP 403 or 451). The background availability check or a playback attempt found this out.</td></tr>
<tr><td><b>🌐</b> (small mark in the card’s corner, “May be geo-restricted”)</td><td>According to the list, all of the channel’s sources are restricted, but we haven’t tried from here yet. Many such streams work anyway – once one has started, the mark disappears.</td></tr>
</table>
<p>If you start a restricted stream, the player says so specifically (not just “not available”). It may work from another country, or with a VPN there.</p>
<p><b>Filtering:</b> on the Browse page, the <i>Geo-restriction</i> selector can hide restricted channels, or show only those.</p>
<div class="note">A 403 response is sometimes caused not by the country but by something else (e.g. expired access) – the “geo-restriction” badge appears then too, because from outside the two can’t be told apart.</div>
${go('#/browse?geo=hide', 'Channels without geo-restriction')}`,
  },
  {
    id: 'stream-info',
    cat: 'watch',
    title: 'Stream info (quality, speed)',
    keywords: 'stream info statistics bitrate speed bandwidth resolution quality buffer latency dropped frames codec network d key',
    body: `
<p>During playback, the <b>⚙ Quality and source → 📊 Stream info</b> menu item (or the <kbd>D</kbd> key) opens a transparent panel that updates every second:</p>
<table class="help-table">
<tr><td><b>Player</b>, <b>Server</b></td><td>Which playback engine is playing (hls.js, built-in, playback bridge…), and which server the stream comes from (🔒: encrypted connection).</td></tr>
<tr><td><b>Resolution</b>, <b>Codecs</b>, <b>Bitrate</b></td><td>The picture size (SD / HD / Full HD / 4K) and frame rate; the stream’s amount of data per second. If the list doesn’t give it, we measure it from the downloaded segments (“measured”).</td></tr>
<tr><td><b>Measured download speed</b></td><td>How fast the server actually sends – and how many times the bitrate that is. Below 1.3× (orange) the connection or server only just copes: that’s what causes stalling.</td></tr>
<tr><td><b>Buffer</b>, <b>Delay behind live</b></td><td>How many seconds of the stream are already downloaded ahead (orange below 3 s), and how far it is behind the live stream.</td></tr>
<tr><td><b>Dropped frames</b></td><td>If there are many (above 5%), the device can’t keep up with decoding – a lower quality helps.</td></tr>
<tr><td><b>Stalls</b></td><td>How many times and for how long the picture stopped since the panel was opened.</td></tr>
<tr><td><b>Network</b></td><td>The system’s estimate of the connection (type, speed, response time), where it reveals it.</td></tr>
</table>
<p>If something looks suspicious, a ⚠ line at the bottom of the panel also gives advice (e.g. lower quality or another source).</p>`,
  },
  {
    id: 'trouble-buffering',
    cat: 'trouble',
    title: 'The picture stalls or buffers',
    keywords: 'stall buffering slow stutter loading quality internet',
    body: `
<p>The <b>Stream info</b> panel shows what the problem is (<kbd>D</kbd> during playback): if the measured download speed is barely higher than the bitrate, the server or the connection is slow. ${t('stream-info', 'Details')}</p>
<ul>
<li>Set a <b>lower quality</b> (⚙ → Quality), especially on mobile data or weak Wi-Fi.</li>
<li>Try <b>another source</b> – another server may be faster.</li>
<li>If the stream stops, the program switches to the next source by itself (if the backup source is on): after <b>10 seconds</b> if there’s an untried source – otherwise it waits 30 seconds in case the stream continues by itself.</li>
<li>Servers in distant countries can be slower; that isn’t the program’s fault.</li>
<li>The automatic availability check in the background pauses by itself during playback. A manually started <i>Check all streams</i>, however, keeps running – it’s worth stopping it during playback.</li>
</ul>
<p>The player starts live streams about 4 segments (typically 20–30 s) behind live: that leaves a reserve if the server slows down for a moment – many servers only send the newest segment, still being made, slowly.</p>`,
  },
  {
    id: 'trouble-epg',
    cat: 'trouble',
    title: 'No programme data for a channel',
    keywords: 'no programme tv guide empty epg missing matching',
    body: `
<p>The public TV guide sources only cover some of the channels – mainly those of the countries with a built-in source and the bigger international channels. What you can do:</p>
<ul>
<li>Switch on the source for the channel’s country: Settings → TV guide (e.g. Germany, United Kingdom, Pluto TV). ${t('epg-sources', 'Sources')}</li>
<li>Add your own XMLTV source, if you know one that contains the channel.</li>
<li>Check in the source’s row how many channels it matched, and whether it shows an error.</li>
<li>Refresh the TV guide (<i>Refresh TV guide now</i>).</li>
</ul>
<p>Matching is done by the channel’s id and name; if a source lists the channel under a completely different name, it can’t connect them.</p>`,
  },
  {
    id: 'trouble-list',
    cat: 'trouble',
    title: 'The channel list won’t load / slow start',
    keywords: 'won’t load loading error slow start internet retry download',
    body: `
<ul>
<li>Check your internet connection, then press <b>Retry</b>.</li>
<li>If the download fails, the program uses the previously downloaded (older) list, if there is one.</li>
<li>The first start can take 20–40 seconds; later ones are fast thanks to the saved list.</li>
<li>If you replaced the main list and it doesn’t work: Settings → Channel lists → <i>Default (iptv-org)</i>.</li>
<li>In a strange, “stuck” state: Settings → Profiles and backup → <b>Clear cache</b>, then restart the program.</li>
</ul>`,
  },
  {
    id: 'trouble-browser',
    cat: 'trouble',
    title: 'It doesn’t work when opened in a browser',
    keywords: 'browser chrome firefox cors index.html web',
    body: `
<p>The Adás interface (<code>src/index.html</code>) can also be opened in a plain browser, but there, because of the browser’s security rules (CORS), most streams and the TV guide can’t be loaded, and the availability check doesn’t work either. This mode only helps development.</p>
<p>For full functionality use the <b>desktop app</b> (Windows <code>.exe</code>, macOS <code>.dmg</code>, Linux <code>AppImage</code> / <code>.deb</code>) or the <b>TV version</b>.</p>`,
  },
  {
    id: 'faq',
    cat: 'trouble',
    title: 'Frequently asked questions',
    keywords: 'faq question legal free paid why duplicate disappeared channel',
    body: `
<h3>Is it free? Do I need a subscription?</h3>
<p>Yes, it’s free. The program collects publicly, freely available streams; no account or subscription is needed.</p>
<h3>Is it legal?</h3>
<p>iptv-org only collects publicly available, free streams, and removes channels on copyright complaints. When adding your own list, it’s up to you to make sure you can legally watch the content.</p>
<h3>Why did a channel disappear?</h3>
<p>It may have been removed from the community list (closed down, changed address, or for legal reasons). If you know its address, you can add it as your own channel. ${t('custom-channels', 'How?')}</p>
<h3>Why does a channel appear twice?</h3>
<p>If one of your own lists contains the same channel as the main list, both appear (the own list’s name shows on the details page).</p>
<h3>Why doesn’t a channel have a channel number?</h3>
<p>Channel numbers go to your favourites and the home country’s channels. Mark it as a favourite, and move it to the place you want on the Favourites page.</p>
<h3>Can I record programmes?</h3>
<p>Yes, in the desktop version. ${t('recording', 'Recording')}</p>
<h3>Where is my data?</h3>
<p>${t('privacy', 'Data and privacy')}</p>`,
  },

  // ===================================================================== Extras
  {
    id: 'timeshift',
    cat: 'watch',
    title: 'Pausing and rewinding live TV',
    keywords: 'timeshift pause rewind live buffer jump to live dvr',
    body: `
<p>For live streams the player <b>keeps the already downloaded stream</b> (up to about 30 minutes, depending on memory), so:</p>
<ul>
<li><b>Pause</b>: the stream keeps downloading meanwhile, and when you resume you watch from where you paused.</li>
<li><b>Rewind</b>: with the control bar buttons labelled <b>30</b>, with <kbd>Shift</kbd>+<kbd>←</kbd>/<kbd>→</kbd>, with the remote’s ◀◀ / ▶▶ buttons in 30-second steps, or by dragging the <b>timeline</b>.</li>
<li><b>Jump to live</b>: if you’re behind, the <i>Jump to live</i> button and the delay (e.g. −2:15) appear on the left of the timeline; the <b>LIVE</b> badge at the top right is grey then. On a keyboard: <kbd>End</kbd>.</li>
</ul>
<p>You can only rewind as far as the player has already downloaded – when you switch to a channel the buffer is empty, and it grows minute by minute.</p>
<div class="note">A TV’s built-in player (webOS) decides itself how much to keep; there, rewinding may be shorter or missing, depending on the broadcaster.</div>`,
  },
  {
    id: 'sportwatch',
    cat: 'watch',
    title: 'Sports tracker',
    keywords: 'sport sports tracker league team match result football tennis handball water polo formula 1 disc golf world chase tag chess darts esports calendar ics thesportsdb espn channel',
    body: `
<p>The Sports tracker is for following any sport, league, team or competition; the home page’s <b>Sport</b> unit shows their live, recent and upcoming events. To open it: <i>Sports tracker ›</i> in the Sport unit’s header, or Settings → Home → <i>Open Sports tracker</i>.</p>
<p>The window’s tabs:</p>
<table class="help-table">
<tr><td><b>Followed</b></td><td>Everything you follow, grouped by sport. Each can be switched on/off or deleted.</td></tr>
<tr><td><b>Leagues</b></td><td>More than 350 leagues and tournaments in 17 sports (football, basketball, ice hockey, tennis, golf, Formula 1, MMA, rugby, cricket, volleyball…) – with search and a sport filter. Follow the whole league, or only one team’s matches with the <i>Team…</i> button. Source: ESPN (no key, with results).</td></tr>
<tr><td><b>Sports on TV</b></td><td><b>Any</b> sport or game based on the TV guide: handball, water polo, disc golf, World Chase Tag, chess, darts, snooker, esports, equestrian… One click on the sport’s tile, or your own keyword (e.g. <i>Arsenal</i>, <i>Tour de France</i>, <i>Wimbledon</i>). These search the programmes of the visible channels, so they always give a broadcast you can watch.</td></tr>
<tr><td><b>Calendar</b></td><td>Any competition or fixture calendar (.ics / webcal address) published by a federation, club or website – e.g. disc golf tournaments, local leagues.</td></tr>
<tr><td><b>Settings</b></td><td>How many days back and ahead to show events; channel suggestion on/off; an optional TheSportsDB key (more leagues).</td></tr>
</table>
<h2>Channel suggestion</h2>
<p>For every event the program looks in the TV guide for the channel it’s on (based on team names, league and sport, matched to the time), and a <b>📺 channel</b> button appears in the row – clicking it starts the stream. Uncertain matches are fainter. Only non-hidden channels with a TV guide are considered; favourites and sports channels are preferred.</p>
<div class="note">Results refresh about every 5 minutes. If a league can’t be loaded, the bottom of the Sport unit says so.</div>`,
  },
  {
    id: 'multiview',
    cat: 'watch',
    title: 'Several streams at once',
    keywords: 'several streams multiview split screen 2 4 windows sport news at once',
    body: `
<p>You can watch two or four channels at once – for example several sports broadcasts or news programmes. To open it: the player’s <b>▦</b> button (or <kbd>V</kbd>), or <i>Several streams at once</i> in the profile menu.</p>
<ul>
<li>The <b>selected</b> window (with a coloured frame) has sound, the others play muted. Switch: arrows, <kbd>1</kbd>–<kbd>4</kbd>, or click.</li>
<li><kbd>OK</kbd> / ⇄: another channel in the window (with search), ✕: clear the window.</li>
<li><kbd>F</kbd>, double-click or ⤢: the selected channel full screen; from there up/down switches between the multi-view’s channels.</li>
<li>The starting channels: the one you started it from, then your favourites.</li>
</ul>
<div class="note">Four streams at once need significant bandwidth and processor power. On TV at most two windows are available.</div>`,
  },
  {
    id: 'cast',
    cat: 'watch',
    title: 'Casting to a TV (Chromecast, DLNA)',
    keywords: 'cast chromecast dlna upnp tv smart tv google tv play on another device',
    body: `
<p>From the desktop version you can send the stream or film to a <b>Chromecast</b>, Google TV, or a <b>DLNA-capable</b> smart TV or media player. Click the cast icon on the player’s control bar and the program looks for devices on the local network.</p>
<ul>
<li>While casting, the controls stay on the computer: pause / resume, channel switching (up/down), volume, stop. A film continues on the TV where it was here.</li>
<li>After <b>Stop casting</b>, playback continues on the computer.</li>
<li>This computer relays the stream to the TV (so streams needing special headers or CORS work too) – so keep it switched on during casting, and on the same network.</li>
</ul>
<h2>If it finds no device</h2>
<ul>
<li>On first use, <b>Windows Firewall</b> asks for permission – allow it on the <i>private network</i>.</li>
<li>The computer and the TV must be on the same Wi-Fi / router (guest networks are usually isolated).</li>
<li>For DLNA, media sharing / a “DLNA renderer” must be switched on in the TV (LG: <i>Settings → General → Devices → Screen share / DLNA</i>).</li>
</ul>
<div class="note">Not every device plays every format: Chromecast handles HLS and MP4 well, but many DLNA TVs only MP4 or MPEG-TS. If the device reports an error, try another source (⚙ → Source).</div>`,
  },
  {
    id: 'night-audio',
    cat: 'watch',
    title: 'Night mode audio',
    keywords: 'night audio quiet compressor dialogue speech intelligibility loud ads dynamics',
    body: `
<p><b>Night mode audio</b> softens the loud parts (music, explosions, ads) and boosts quiet dialogue – so it’s understandable at low volume and nobody wakes up.</p>
<ul>
<li>To switch it on during playback: <b>CC</b> button → <i>Audio and subtitles</i> → <i>Night mode audio</i>.</li>
<li>You can make it the default per profile: Settings → Subtitles and information → Info and subtitles in your language → <i>Night mode audio</i>.</li>
</ul>
<div class="note">Available in the desktop version.</div>`,
  },
  {
    id: 'parental',
    cat: 'personal',
    title: 'Parental control and profile lock (PIN)',
    keywords: 'pin profile lock parental control child lock password code kids profile exit',
    body: `
<p>You can set a <b>4-digit PIN</b> for any profile: Manage profiles → edit the profile → <i>Profile lock (PIN)</i>. A locked profile shows 🔒 on the “Who’s watching?” screen, and can only be opened with the PIN.</p>
<h2>Kids profile</h2>
<p>If at least one <b>adult profile has a PIN</b>, then from the kids profile:</p>
<ul>
<li>switching to another profile is only possible with the PIN,</li>
<li><b>Settings</b> and <b>Manage profiles</b> only open with an adult PIN (the approval is valid for 10 minutes),</li>
<li>adult content and channels not meant for children still don’t appear.</li>
</ul>
<p>The PIN can be typed with the remote’s number buttons or the on-screen number pad. After five wrong attempts you have to wait half a minute.</p>
<h2>Forgotten PIN</h2>
<p>Any profile’s PIN can be removed from another adult profile (Manage profiles). If there is no such profile, deleting the app’s data resets everything. ${t('privacy', 'Where is the data?')}</p>
<div class="note">The PIN protects against children on this device; it isn’t encryption.</div>`,
  },
  {
    id: 'continue',
    cat: 'vod',
    title: 'Continue (VOD)',
    keywords: 'continue unfinished film episode series home row keep watching',
    body: `
<p>The VOD page’s <b>Continue</b> row shows your unfinished films and series episodes in one place – from the built-in and your own film and series lists, and your own media library too. (The TV home page has no such row: there are only channels there.) The most recently watched comes first.</p>
<p>For a series, the card takes you to the episode you’re on (or the next one, if you finished the previous). </p>`,
  },
  {
    id: 'stats',
    cat: 'personal',
    title: 'Viewing statistics',
    keywords: 'statistics viewing time how much tv favourite channel chart hour day',
    body: `
<p>The <i>Viewing statistics</i> item in the profile menu shows how much and when you watch TV: today, in the last week and month, by day, by time of day; the most-watched channels, categories, films and series.</p>
<ul>
<li>Counted separately per profile, only the time actually played (without pauses).</li>
<li>The data is stored only on this device. On the statistics page, collection can be switched off and the data deleted.</li>
</ul>
${go('#/stats', 'Open statistics')}`,
  },
  {
    id: 'transfer',
    cat: 'personal',
    title: 'Sync between devices (with a code)',
    keywords: 'transfer hand over to tv settings copy code address sync synchronise export import tv android phone desktop',
    body: `
<p>Between the desktop computer, Android TV and Android phone you can transfer the settings (lists, profiles, favourites, history, reminders, home page) with a code on the local network – in either direction:</p>
<ol>
<li>On the device <b>whose settings you want to take over</b>: Settings → <i>Sync between devices</i> → <b>Request code</b>. A 12-digit code appears (e.g. <code>123 456 789 012</code>). On request, keys and passwords go across too.</li>
<li>On the <b>other device</b>: in the same place, type the code into the <i>Sync with a code</i> field, then <b>Sync</b>. The device finds the device giving the code on the network by itself, and takes over its settings (after confirmation).</li>
</ol>
<p>The settings travel encrypted: the code (and so the key) never travels over the network, only an identifier derived from it. The code is valid for 15 minutes; after 10 wrong attempts it stops, then request a new one. The two devices must be on the same (home) network; Windows Firewall may ask for permission the first time – allow it on the private network.</p>
<p><b>Profiles only</b>: the current settings and lists stay, incoming profiles are added (existing ones are updated).</p>
<p>Under <i>Advanced</i> you can also enter the other device’s address (if it’s on another subnet), or load the settings from a web address (e.g. a backup uploaded to your NAS) – then type the full address, without a code.</p>
${go('#/settings?section=transfer', 'Sync between devices')}`,
  },
  {
    id: 'remote',
    cat: 'personal',
    title: 'Remote control from your phone',
    keywords: 'remote phone mobile browser control pin qr code network channel switch volume touchpad search',
    body: `
<p>The desktop app and the Android (TV) version can also be controlled from your phone – or any device’s browser – on the same (home) network:</p>
<ol>
<li>The quickest: the <b>Remote</b> button at the top of the <b>Home</b> page (next to Customise) – it switches the remote on and shows the QR code in a small window. Or: Settings → Remote control and keys → <b>Remote from phone</b> → switch it on. A <b>QR code</b>, an address (e.g. <code>http://192.168.1.20:47800/adas/remote</code>) and a 4-digit PIN appear.</li>
<li>Scan the QR code with your phone’s camera: the controller opens and also receives a secret key – this is the most secure way, because the key never travels over the network; the phone signs every command with it. (Or open the address in the browser and type the PIN – the phone remembers it.) Tip: add the page to your home screen so it starts like an app.</li>
</ol>
<p>At the top you always see what’s on (with the logo, the programme’s progress and the next programme). The controller has three tabs:</p>
<table class="help-table">
<tr><td><b>🎮 Controller</b></td><td>A <b>touchpad</b> in two modes (switchable above it, the phone remembers): <b>🖱 Mouse</b> – dragging moves a mouse cursor on the computer / TV screen (slow movement = precise, fast = big jumps), tap = click, <b>drag with two fingers to scroll</b> (horizontally too, in the row under the cursor), and the item under the cursor gets selected; <b>✥ Arrows</b> – dragging moves the selection (like the arrow keys), tap = OK. In both: long press = Back. While using a remote the selection frame always shows. Below it: Back, Home, Details; seeking (±10 / ±30 s – timeshift on live streams); pause; CH ▲ / ▼, Previous channel, mute, <b>volume slider</b>; Subtitles, Quality, Channel list, Full screen; arrows and channel number.</td></tr>
<tr><td><b>📺 Channels</b></td><td>A <b>search</b> across all channels (filters as you type, shows what’s on now too), your favourites and recently watched channels – they start with a single tap.</td></tr>
<tr><td><b>☰ More</b></td><td>Jump to any page (TV, TV guide, Favourites, VOD, Recordings, Browse, Help); <b>send text</b> (types into the selected field with the phone’s keyboard, or starts a search); Stream info, Several streams at once, sleep timer.</td></tr>
</table>
<div class="note">The PIN and the QR code’s key can be regenerated at any time (New PIN) – an old phone then has to scan the QR code again (or type the new PIN). With a wrong PIN the controller doesn’t work; after many wrong attempts from one device, that device is locked out for 10 minutes (other phones keep working meanwhile).</div>
${go('#/settings?section=remote', 'Remote from phone')}`,
  },
  {
    id: 'recording',
    cat: 'watch',
    title: 'Recording',
    keywords: 'record recording save schedule video ts trim margin start end',
    body: `
<p>In the desktop version (Windows, Mac, Linux) live TV can be recorded – without re-encoding, in the original quality, into a <code>.ts</code> file, in the <b>Videos / Adás recordings</b> folder.</p>
<ul>
<li><b>Immediately</b>: during playback with the red <b>●</b> button on the control bar; press it again to stop. The button blinks meanwhile.</li>
<li><b>Scheduled</b>: in the TV guide, <b>● Record</b> on a programme’s details page. The recording starts and stops with a <b>margin</b> – by default 3 minutes before and 10 minutes after the programme, because TV often runs late (Settings → Recordings). Adás must be running then (hidden in the tray is fine – Settings → Notifications → Run in the background); starting from the tray is accurate too.</li>
<li>If the stream <b>drops</b> during recording (e.g. a stalling server), the recording continues by itself into the same file after a few seconds – at the end the “Recording finished” message says how many times it was interrupted.</li>
</ul>
<h2>Trimming</h2>
<p>The <b>✂</b> button on a recording’s card opens the trimmer: preview, timeline (yellow marks: the programme’s start and end according to the TV guide), stepping (±1 s / ±10 s / ±1 min), <b>⇤ Start here</b> and <b>End here ⇥</b> (or the <kbd>I</kbd> / <kbd>O</kbd> keys), and the times can be typed in too; the <b>Select according to the TV guide</b> button sets them in one step. After <b>✂ Trim and save</b>, the trimmed version takes the recording’s place – Adás plays this one, and the external player opens this one too.</p>
<p>The <b>original is kept</b> (it doesn’t appear as a separate recording): opening the trimmer again lets you re-trim from the original (with the previous selection), or bring back the full recording with <b>Restore original</b>. A trimmed recording’s card shows a tick next to the ✂. When deleted, both go to the Recycle Bin.</p>
<p>Recordings are on the <b>TV → Recordings</b> tab (with channel logo, date, size; started ones with a progress bar). <b>▶ Play</b> starts the recording in Adás’s own player – seekable, and an unfinished recording continues where you left off. The <b>⧉</b> button opens it in the computer’s video player (e.g. VLC), <b>✕</b> moves it to the Recycle Bin. Here you also see the recordings in progress and the scheduled ones; the latest are also listed under Settings → Recordings.</p>
<div class="note">For your own home viewing only: the rights to recorded programmes belong to the channels. Some (encrypted or DRM-protected) streams can’t be recorded.</div>
${go('#/recordings', 'Recordings')}`,
  },
  {
    id: 'adaspack',
    cat: 'lists',
    title: 'Add-on packs (.adaspack)',
    keywords: 'add-on pack adaspack adaspak tv vod list built-in ai make packs folder',
    body: `
<p>An add-on pack is <b>a playlist packed into one file</b>, with a name and description. It appears <b>among the built-in lists</b> (can be switched on and off), but doesn’t ship with the program – it only exists on the device you load it onto.</p>
<table class="help-table">
<tr><td><code>something_tv.adaspack</code></td><td><b>TV channels</b> – Settings → Channel lists → Built-in lists.</td></tr>
<tr><td><code>something_vod.adaspack</code></td><td><b>Films, series</b> – Settings → VOD and media library → VOD lists → Built-in lists.</td></tr>
</table>
<h2>Loading</h2>
<ul>
<li>The <b>Load add-on pack</b> button (Channel lists or VOD lists) – the pack itself decides where it goes. Both the <code>.adaspack</code> and the <code>.adaspak</code> extension are accepted, <b>in every version</b> (desktop, Android phone and TV, browser, LG webOS).</li>
<li><b>Load from web address</b> – e.g. from GitHub (a <code>github.com/…/blob/…</code> page address is fine too) or from your NAS. On a TV, where there’s no file picker, this is the easiest.</li>
<li>Desktop version: the contents of the <b>Packs folder</b> (the <code>packs</code> subfolder of the user data folder) are loaded automatically at startup, and refreshed if a file changes.</li>
<li>The backup and the transfer between devices carry the packs too (e.g. from the computer to the phone).</li>
<li>Reloading a pack with the same id updates the old one; <b>Remove</b> only deletes it from this device.</li>
</ul>
<h2>Structure</h2>
<p>UTF-8 JSON: <code>{ "adasPack": 1, "kind": "tv" | "vod", "id": "example", "name": "Example", "desc": "…", "off": false, "text": "#EXTM3U\\n…" }</code> – <code>text</code> is the full M3U list. For TV, <code>tvg-id</code> is recommended (iptv-org id: logo, country, TV guide); for VOD, the <code>Title (Year)</code> film title, the <code>Series S01E02</code> episode title and the <code>adas-tags</code> genre list (the program’s genre names, which are Hungarian, e.g. <i>Akció;Dráma</i>).</p>
<h2>Making one</h2>
<p>From a ready M3U list: <code>node tools/make-pack.mjs list.m3u8 --kind tv|vod --id example --name "Example"</code>. An AI assistant can make one too, from a web page, a spreadsheet or a list of files: the exact format description and an AI prompt you can paste are in the source code (<code>docs/ADASPACK.md</code>).</p>
<button class="btn" data-ext="https://github.com/mesehordo/adas-iptv/blob/main/docs/ADASPACK.md">Open the full description and the AI prompt</button>
<div class="note">Only add content you can legally watch.</div>`,
  },
  {
    id: 'update',
    cat: 'about',
    title: 'Updates',
    keywords: 'update new version download install github release',
    body: `
<p>The desktop version (Windows, macOS, Linux) updates itself from <b>GitHub</b>, from the official releases (<code>github.com/mesehordo/adas-iptv</code>). Settings → <b>Updates</b>:</p>
<ul>
<li><b>Check for updates at startup</b> (on by default): at every start it checks whether there’s a new version; if there is, you get a notification and can install it right away with the <i>Update</i> button. If you don’t want this, switch it off – then it only checks on request.</li>
<li><b>Check for updates now</b>: an immediate check; for a new version the release notes and the <b>Download and install</b> button appear.</li>
<li>Installation follows how the app was installed: installed with the installer (Setup), the new installer starts; installed with MSI, the new MSI; for the <b>portable</b> version you’ll find the downloaded file in the folder that opens (start it instead of the old one); on Linux the AppImage replaces itself.</li>
<li><b>Update source</b>: empty means the official releases. You can give your own GitHub repository (<code>owner/repo</code>) or the address of a JSON file: <code>{ "version": "1.25.0", "url": "https://…/Adas-Setup-1.25.0.exe", "notes": "…" }</code>.</li>
</ul>
<div class="note">The Android version is updated by installing the new <code>.apk</code> downloaded from the GitHub release page (your settings are kept).</div>
${go('#/settings?section=update', 'Updates')}`,
  },

  // ===================================================================== Other
  {
    id: 'privacy',
    cat: 'about',
    title: 'Data and privacy',
    keywords: 'privacy data storage where tracking account folder',
    body: `
<ul>
<li>No account, no registration, no tracking, and the program doesn’t send data about your usage anywhere.</li>
<li>All settings, profiles and downloaded lists are stored <b>locally</b>:
  <ul>
  <li>Windows: <code>%APPDATA%\\Adás</code></li>
  <li>macOS: <code>~/Library/Application Support/Adás</code></li>
  <li>Linux: <code>~/.config/Adás</code></li>
  <li>On TV and Android: in the app’s own storage.</li>
  </ul> ${t('backup', 'Backup and moving')}</li>
<li>The program connects to the following servers: iptv-org (channel list and data), the switched-on TV guide sources, the addresses of your own lists, the servers hosting the channel logos, and during playback the streams’ own servers. Like any website, these may see your IP address.</li>
<li>When casting and handing over settings, the desktop version starts a small server on the <b>local network</b> (around port 47800). The relay can only be used with a random key that’s new at every start; the settings can only be downloaded with the code, which is valid for 15 minutes.</li>
<li>Viewing statistics, PINs and settings are never sent anywhere.</li>
</ul>`,
  },
  {
    id: 'about',
    cat: 'about',
    title: 'About and sources',
    keywords: 'about version source licence iptv-org hls.js electron thanks',
    body: `
<p><b>Adás</b> – a live TV player with a streaming-service style interface, for Windows, macOS, Linux, Android and LG webOS TVs. MIT licence.</p>
<h2>Data sources</h2>
<ul>
<li><b>iptv-org/iptv</b> and <b>iptv-org/api</b> – channel list, channel data, logos (community, public).</li>
<li>TV guide: <b>iptv-epg.org</b>, <b>epgshare01.online</b>, <b>i.mjh.nz</b>, and the playlist’s own source.</li>
<li>Built-in lists: <b>Free-TV/IPTV</b>, <b>BuddyChewChew/app-m3u-generator</b> (Pluto TV, Samsung TV Plus, Plex), <b>freecasthub/public-iptv</b>, <b>DragonHall TV</b>.</li>
</ul>
<h2>Libraries used</h2>
<ul>
<li><b>Electron</b> – desktop app,</li>
<li><b>hls.js</b>, <b>mpegts.js</b>, <b>dash.js</b> – playback,</li>
<li><b>esbuild</b>, <b>@webos-tools/cli</b> – building the TV package.</li>
</ul>
<p>The interface styles only draw inspiration from the look of well-known services and systems; the program isn’t affiliated with them and doesn’t use their logos.</p>`,
  },
];
