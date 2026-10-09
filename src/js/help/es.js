// Adás – ayuda integrada (español). Misma estructura que help-content.js (mismos id y cat); la carga help.js.
// Los textos son fragmentos HTML de confianza que se distribuyen con el programa.

export const HELP_CATEGORIES = [
  { id: 'start', title: 'Primeros pasos' },
  { id: 'watch', title: 'Ver y reproducir' },
  { id: 'vod', title: 'VOD (películas y series)' },
  { id: 'find', title: 'Buscar y explorar' },
  { id: 'guide', title: 'Guía de TV y recordatorios' },
  { id: 'personal', title: 'Personalización' },
  { id: 'lists', title: 'Listas de canales' },
  { id: 'tv', title: 'En la TV y en Android' },
  { id: 'trouble', title: 'Solución de problemas' },
  { id: 'about', title: 'Otros' },
];

const go = (href, label) => `<a class="btn small" href="${href}">${label}</a>`;
const t = (id, label) => `<a href="#/help?topic=${id}">${label}</a>`;

export const ARTICLES = [
  // ===================================================================== Primeros pasos
  {
    id: 'welcome',
    cat: 'start',
    title: 'Te damos la bienvenida a Adás',
    keywords: 'introducción qué es esto resumen empezar',
    body: `
<p class="lead">Adás reproduce canales de TV en directo de todo el mundo, con una interfaz parecida a la de los servicios de streaming. Descarga la lista de canales de la colección pública y comunitaria <b>iptv-org</b>: más de diez mil emisiones gratuitas.</p>
<h2>Partes de la interfaz</h2>
<table class="help-table">
<tr><td><b>Inicio</b></td><td>Resumen: el tiempo, lo que dan en tus canales favoritos, noticias, la programación de esta noche, continuar TV y VOD. ${t('dashboard', 'Detalles')}</td></tr>
<tr><td><b>TV</b></td><td>Cuatro pestañas: Canales, Guía de TV, Explorar y (en el ordenador) Grabaciones. En la pestaña Canales: vistos recientemente, favoritos, lo que se emite ahora y filas por categoría. ${t('home', 'Detalles')}</td></tr>
<tr><td><b>Guía de TV</b> (en TV)</td><td>Una cuadrícula con línea de tiempo: qué hay ahora y después en cada canal. ${t('guide-grid', 'Detalles')}</td></tr>
<tr><td><b>Explorar</b> (en TV)</td><td>Todos los canales de TV, filtrados por categoría, país, idioma y calidad. ${t('browse', 'Detalles')}</td></tr>
<tr><td><b>VOD</b></td><td>Películas y series: listas online y tu mediateca propia, en filas ordenadas por géneros unificados. ${t('vod-lists', 'Detalles')}</td></tr>
<tr><td><b>Favoritos</b></td><td>Tus canales marcados – su orden da los números de canal – y debajo tus películas y series favoritas (ficha → ☆ Favorito). ${t('favorites', 'Detalles')}</td></tr>
<tr><td><b>Buscar</b> (lupa)</td><td>Buscar canales y programas. ${t('search', 'Detalles')}</td></tr>
<tr><td><b>Campana</b></td><td>Tus recordatorios de programas. ${t('reminders', 'Detalles')}</td></tr>
<tr><td><b>Imagen de perfil</b></td><td>Cambiar de perfil, actualizar la lista de canales, añadir un canal, ayuda, ajustes.</td></tr>
</table>
<h2>Inicio rápido en cinco pasos</h2>
<ol>
<li>Elige un perfil (en la pantalla «¿Quién está viendo?») o crea el tuyo. ${t('profiles', 'Perfiles')}</li>
<li>Haz clic en un canal del inicio: empieza enseguida. ${t('playing', 'Reproducción')}</li>
<li>Marca tus favoritos con el botón <b>+</b> de la tarjeta. ${t('favorites', 'Favoritos')}</li>
<li>Elige un estilo de interfaz en Ajustes → Apariencia. ${t('themes', 'Estilos')}</li>
<li>Si falta un canal, añádelo como canal propio o como lista propia. ${t('custom-channels', 'Canales propios')}</li>
</ol>
<div class="tip"><b>Consejo:</b> la ayuda se abre desde cualquier sitio con la tecla <kbd>F1</kbd> o <kbd>?</kbd>, o con el icono de interrogación de la cabecera; siempre se abre en el tema de la pantalla que estás usando.</div>`,
  },
  {
    id: 'first-steps',
    cat: 'start',
    title: 'El primer inicio',
    keywords: 'inicio carga lento primera vez perfil país idioma',
    body: `
<p>En el primer inicio, un breve asistente te pide el <b>idioma de la interfaz</b>, después crea tu <b>perfil</b> (nombre e imagen de perfil) y, si quieres, un <b>perfil infantil</b> (se puede omitir). Luego el programa descarga la lista de canales y sus datos (países, idiomas, logotipos, categorías: unos 25 MB en total). Según tu conexión puede tardar medio minuto; después la lista procesada se guarda, así que los siguientes inicios solo tardan unos segundos.</p>
<h2>¿Qué pasa en segundo plano?</h2>
<ol>
<li><b>Lista de canales</b>: descarga y procesamiento (se actualiza sola cada 6 horas).</li>
<li><b>Guía de TV</b>: descarga de las fuentes activadas (por defecto, las de tu país de origen); se ejecuta en segundo plano cuando ya aparece la interfaz. ${t('epg-sources', 'Fuentes')}</li>
<li><b>Comprobación de disponibilidad</b>: las versiones de escritorio y de TV prueban discretamente las emisiones de los canales que se muestran. ${t('health', 'Detalles')}</li>
</ol>
<h2>Primeros ajustes recomendados</h2>
<ul>
<li><b>País de origen</b> (Ajustes → Contenido e infantil → Contenido): sus canales van primero y reciben los números de canal. Se fija según el idioma elegido en el primer inicio.</li>
<li><b>Estilo de la interfaz</b>: elige entre dieciséis aspectos, por perfil. ${t('themes', 'Estilos')}</li>
<li><b>Perfil infantil</b>: si también lo usa un niño, créale un perfil aparte. ${t('kids', 'Detalles')}</li>
</ul>
${go('#/settings', 'Abrir Ajustes')}`,
  },
  {
    id: 'navigation',
    cat: 'start',
    title: 'Uso con ratón, teclado o mando',
    keywords: 'navegación flechas foco ratón teclado mando enter atrás',
    body: `
<p>Adás se puede manejar por completo con ratón, teclado y mando de TV.</p>
<h2>Con el ratón</h2>
<ul>
<li>Clic en una tarjeta: reproducir. Al pasar por encima (según el estilo) aparecen botones: reproducir, favorito, detalles.</li>
<li>Clic derecho en una tarjeta: la ficha del canal.</li>
<li>Pasa las filas con las flechas de sus extremos o desplázate en horizontal.</li>
</ul>
<h2>Con teclado / mando</h2>
<ul>
<li><kbd>←</kbd> <kbd>→</kbd> <kbd>↑</kbd> <kbd>↓</kbd>: mover la selección (marco blanco) por la pantalla. El programa elige el elemento más cercano en esa dirección.</li>
<li><kbd>Intro</kbd> / OK: reproducir o pulsar el botón seleccionado.</li>
<li><kbd>I</kbd>: la ficha del canal seleccionado. <kbd>F</kbd>: favorito sí/no.</li>
<li><kbd>Esc</kbd> / <kbd>Retroceso</kbd> / Atrás: cerrar o volver a la pantalla anterior.</li>
</ul>
<p>Todas las teclas: ${t('shortcuts', 'Atajos de teclado')} · En la TV: ${t('tv-remote', 'Botones del mando')}</p>`,
  },
  {
    id: 'shortcuts',
    cat: 'start',
    title: 'Atajos de teclado',
    keywords: 'atajo tecla kbd comando acceso rápido',
    body: `
<h2>General</h2>
<table class="help-table keys">
<tr><td><kbd>←</kbd> <kbd>→</kbd> <kbd>↑</kbd> <kbd>↓</kbd></td><td>Moverse por la interfaz</td></tr>
<tr><td><kbd>Intro</kbd></td><td>Reproducir / seleccionar</td></tr>
<tr><td><kbd>I</kbd></td><td>Ficha del canal seleccionado</td></tr>
<tr><td><kbd>F</kbd></td><td>Favorito sí/no (sobre una tarjeta)</td></tr>
<tr><td><kbd>Ctrl</kbd>+<kbd>F</kbd> o <kbd>/</kbd></td><td>Buscar</td></tr>
<tr><td><kbd>F1</kbd> o <kbd>?</kbd></td><td>Ayuda de la pantalla actual</td></tr>
<tr><td><kbd>Esc</kbd> / <kbd>Retroceso</kbd></td><td>Atrás, cerrar ventana</td></tr>
</table>
<h2>Durante la reproducción</h2>
<table class="help-table keys">
<tr><td><kbd>↑</kbd> / <kbd>↓</kbd>, <kbd>RePág</kbd> / <kbd>AvPág</kbd></td><td>Canal anterior / siguiente</td></tr>
<tr><td><kbd>←</kbd> / <kbd>→</kbd></td><td>Bajar / subir volumen</td></tr>
<tr><td><kbd>0</kbd>–<kbd>9</kbd></td><td>Escribir un número de canal (cambia tras 1,3 s)</td></tr>
<tr><td><kbd>Espacio</kbd> / <kbd>K</kbd></td><td>Pausa / continuar</td></tr>
<tr><td><kbd>Intro</kbd> / <kbd>L</kbd></td><td>Panel de lista de canales</td></tr>
<tr><td><kbd>M</kbd></td><td>Silenciar</td></tr>
<tr><td><kbd>F</kbd></td><td>Pantalla completa</td></tr>
<tr><td><kbd>N</kbd></td><td>Minirreproductor (versión de escritorio)</td></tr>
<tr><td><kbd>S</kbd></td><td>Favorito sí/no</td></tr>
<tr><td><kbd>I</kbd></td><td>Ficha del canal</td></tr>
<tr><td><kbd>Esc</kbd></td><td>Cerrar panel → salir del modo mini → salir de pantalla completa → cerrar reproductor</td></tr>
</table>`,
  },

  // ===================================================================== Ver
  {
    id: 'playing',
    cat: 'watch',
    title: 'Iniciar la reproducción',
    keywords: 'ver iniciar reproducir fuente reserva conectar',
    body: `
<p>Puedes iniciar un canal de varias formas:</p>
<ul>
<li>haz clic en su tarjeta (o selecciónala y pulsa <kbd>Intro</kbd>),</li>
<li>con el botón <b>Reproducir</b> de su ficha, o el botón ▶ de una fuente de emisión concreta,</li>
<li>en la guía de TV, haciendo clic en el nombre del canal o con el botón <b>Ver ahora</b> de un programa en emisión,</li>
<li>en el reproductor, desde la lista de canales, con los botones arriba/abajo o escribiendo el número de canal.</li>
</ul>
<h2>¿Qué pasa al iniciar?</h2>
<p>Un canal puede tener varias <b>fuentes de emisión</b> (distinta calidad, región o servidor). El programa empieza por la que considera mejor: prefiere una que ya funcionó y la de mejor calidad, y relega las que tienen restricción geográfica o no emiten 24/7.</p>
<p>Si la fuente no arranca en 20 segundos o se atasca durante la reproducción, el programa prueba sola la siguiente («Probando otra fuente 2/3…»). Si queda alguna fuente sin probar, ante una emisión atascada cambia ya a los 10 segundos (si no, espera 30). Se puede desactivar: Ajustes → Reproducción → <i>Fuente de reserva automática</i>.</p>
<h2>Canal anterior, volumen por canal, estilo de subtítulos</h2>
<p>La tecla <kbd>R</kbd> (o el botón ↺ de la barra de control, o el botón <i>Anterior</i> del mando del móvil) vuelve al canal que veías antes. En Ajustes → Reproducción puedes activar <b>Volumen por canal</b>: cada canal recuerda su propio volumen. Ahí también se ajustan el tamaño, el color (blanco, amarillo, azul claro) y el fondo (banda oscura, sombra, ninguno) de los subtítulos.</p>
<p>Si no funciona ninguna fuente, aparece la ventana <b>«Esta emisión no está disponible ahora»</b>, desde la que puedes reintentar, pasar al siguiente canal o volver. ${t('trouble-playback', '¿Qué puedo hacer?')}</p>`,
  },
  {
    id: 'player-controls',
    cat: 'watch',
    title: 'Los controles del reproductor',
    keywords: 'reproductor botones controles volumen pantalla completa directo',
    body: `
<p>Los controles aparecen al mover el ratón o pulsar cualquier botón, y desaparecen tras 3,5 segundos de inactividad.</p>
<h2>Arriba</h2>
<ul>
<li><b>← Atrás</b>: cerrar el reproductor.</li>
<li>El logotipo, el <b>número de canal</b>, el nombre y el país del canal y, si lo iniciaste desde una fila, el nombre de la fila.</li>
<li>La marca <b>EN DIRECTO</b>.</li>
</ul>
<h2>Abajo</h2>
<ul>
<li><b>AHORA</b>: título, hora y barra de progreso del programa en emisión; debajo, el siguiente (si hay guía de TV).</li>
<li>▶/❚❚ <b>Pausa</b>: en una emisión en directo continúa desde donde llegue el búfer.</li>
<li>⌃ ⌄ <b>Canal anterior / siguiente</b>. ${t('channel-switching', '¿Cómo se decide el orden?')}</li>
<li>🔊 <b>Volumen</b> y silencio (el volumen se mantiene para el próximo inicio).</li>
<li>＋/✓ <b>Favorito</b>, ⓘ <b>Ficha</b>.</li>
<li>☾ <b>Temporizador de apagado</b>. ${t('sleep', 'Detalles')}</li>
<li><b>CC</b> – <b>Audio y subtítulos</b>: elegir pista de audio y subtítulos (<kbd>C</kbd>). ${t('audio-subs', 'Detalles')}</li>
<li>⚙ <b>Calidad y fuente</b>. ${t('quality', 'Detalles')} Aquí está también el panel <b>📊 Datos de la emisión</b> (<kbd>D</kbd>): resolución, tasa de bits, velocidad de descarga, búfer. ${t('stream-info', 'Detalles')}</li>
<li>☰ <b>Panel de lista de canales</b> a la derecha, con filtro.</li>
<li>↺30 / ↻30 <b>Retroceder y avanzar</b> en la emisión en directo, <b>Ir al directo</b>. ${t('timeshift', 'Detalles')}</li>
<li>▦ <b>Varias emisiones a la vez</b>. ${t('multiview', 'Detalles')}</li>
<li><b>Enviar</b> a Chromecast o a una TV DLNA (versión de escritorio). ${t('cast', 'Detalles')}</li>
<li><b>Minirreproductor</b>, <b>Pantalla completa</b>; los botones adicionales se pueden ocultar uno a uno. ${t('pip-mini', 'Detalles')}</li>
</ul>
<div class="tip">Doble clic en la imagen: pantalla completa (en modo mini: vuelta al tamaño normal). Un clic en la imagen: pausa / continuar.</div>`,
  },
  {
    id: 'channel-switching',
    cat: 'watch',
    title: 'Cambio de canal y números de canal',
    keywords: 'número de canal número cambiar arriba abajo orden lineup panel',
    body: `
<h2>Cambiar arriba / abajo</h2>
<p><kbd>↑</kbd>/<kbd>↓</kbd> (o CH+/CH−) avanza por la lista desde la que iniciaste el canal. Si empezaste, por ejemplo, desde la fila «Deportes», cambias entre canales deportivos; si fue desde los favoritos, entre tus favoritos. Si lo iniciaste desde la búsqueda o una ficha, el orden lo dan tus favoritos (o, si no tienes, los canales del país de origen).</p>
<h2>Números de canal</h2>
<p>Los números funcionan como en la tele: <b>el orden de tus favoritos da los primeros números</b> (1, 2, 3…), y después vienen los canales del país de origen. Cambia el orden en la página Favoritos arrastrando. ${go('#/favorites', 'Favoritos')}</p>
<p>Durante la reproducción escribe el número (<kbd>0</kbd>–<kbd>9</kbd>, hasta 4 cifras): aparece arriba a la derecha y cambia al cabo de 1,3 segundos.</p>
<h2>Panel de lista de canales</h2>
<p>Durante la reproducción, <kbd>Intro</kbd> o <kbd>L</kbd> (en la TV, el botón azul) abre a la derecha los canales de la lista con lo que se emite ahora. Arriba puedes filtrar por nombre.</p>`,
  },
  {
    id: 'quality',
    cat: 'watch',
    title: 'Calidad y fuente de emisión',
    keywords: 'calidad resolución 1080p 720p fuente tasa de bits automática',
    body: `
<p>El botón ⚙ del reproductor (en la TV, el botón amarillo) abre un menú:</p>
<ul>
<li><b>Calidad</b>: con <i>Automática</i>, el reproductor ajusta la resolución al ancho de banda y al tamaño de la ventana (en una ventana pequeña o en el minirreproductor no carga Full HD). Puedes fijar a mano la mejor calidad o una menor (p. ej. con datos móviles lentos). Muchas emisiones solo tienen una calidad; el menú lo indica.</li>
<li><b>Calidad máxima</b> (Ajustes → Reproducción): un tope fijo para todas las emisiones: 1080p, 720p, 480p o 360p (ahorro de datos). Menos cortes y menos datos con una conexión lenta o móvil. Si lo cambias durante la reproducción, se aplica al instante.</li>
<li><b>Fuente</b>: todas las fuentes de emisión del canal con un punto de estado (verde = funcionó, rojo = no, gris = sin comprobar). Si una se atasca, prueba otra.</li>
</ul>
<p>La pista de audio y los subtítulos se eligen en el menú del botón <b>CC</b>. ${t('audio-subs', 'Audio y subtítulos')}</p>
<div class="note">La elección de calidad funciona con los reproductores hls.js y dash.js. El reproductor integrado de una TV decide la calidad por sí mismo. ${t('engines', 'Motores de reproducción')}</div>`,
  },
  {
    id: 'audio-subs',
    cat: 'watch',
    title: 'Pista de audio y subtítulos, en todas partes',
    keywords: 'pista de audio sonido idioma doblaje original subtítulos cc incrustados teletexto subtitle idioma favorito',
    body: `
<p>El botón <b>CC</b> del reproductor (o la tecla <kbd>C</kbd>, o el botón <i>Subtitle</i> del mando en la TV) abre el menú <b>Audio y subtítulos</b>, <b>tanto en emisiones en directo como en películas, series y tus propios vídeos</b>.</p>
<h2>Pista de audio</h2>
<p>Si la emisión o el archivo tiene varias pistas de audio (p. ej. doblaje e idioma original, o audiodescripción), elige aquí. El programa muestra los nombres de las pistas en el idioma de la interfaz (<i>Español</i>, <i>Inglés</i>, <i>Húngaro</i>…). Si solo hay una pista, el menú lo indica.</p>
<h2>Subtítulos</h2>
<ul>
<li><b>Subtítulos incrustados</b>: los que contiene la propia emisión o el archivo de vídeo (pista de subtítulos HLS / DASH, MP4 / MKV). En las emisiones en directo solo hay estos.</li>
<li><b>Subtítulos externos</b> (películas, series, vídeos propios): un archivo .srt junto al vídeo, un resultado de Feliratok.eu u OpenSubtitles, o un archivo tuyo. ${t('subtitles', 'Subtítulos')}</li>
<li>Se ve un solo subtítulo a la vez: si eliges uno externo, el incrustado se desactiva, y al revés.</li>
<li>El <b>tamaño</b> se ajusta en todas partes; el <b>desfase</b> se aplica a los subtítulos externos.</li>
</ul>
<h2>Idiomas favoritos por perfil</h2>
<p>Al final de Ajustes → Subtítulos e información → <b>Información y subtítulos en español</b> puedes indicar <b>qué pista de audio</b> (la predeterminada de la emisión / español / inglés) y <b>qué subtítulos incrustados</b> (desactivados / español / inglés) prefiere tu perfil. El reproductor los elige automáticamente en cada emisión y vídeo nuevos, si están disponibles.</p>
<div class="note">La versión de escritorio también puede cambiar la pista de audio con el reproductor integrado (MP4, MKV). En la TV, el cambio de pista en el reproductor integrado depende del aparato; en las emisiones HLS el reproductor hls.js funciona en todas partes.</div>
${go('#/settings?section=huinfo', 'Elegir idiomas favoritos')}`,
  },
  {
    id: 'pip-mini',
    cat: 'watch',
    title: 'Minirreproductor y botones del reproductor',
    keywords: 'mini ventana flotante siempre encima botones barra de control ocultar cc grabación',
    body: `
<h2>Minirreproductor (<kbd>N</kbd>, solo versión de escritorio)</h2>
<p>Toda la ventana de Adás se reduce a 480×270 píxeles, pasa a la esquina inferior derecha de la pantalla y queda <b>siempre encima</b>. Entonces solo se ven la imagen y algunos botones básicos. Doble clic o <kbd>Esc</kbd>: vuelta al tamaño normal. No está disponible en la TV.</p>
<h2>Los botones del reproductor</h2>
<p>Los botones adicionales de la barra de control (grabar, 30 s atrás / adelante, canal anterior, favorito, ficha, audio y subtítulos (CC), temporizador de apagado, lista de canales, vista múltiple, enviar, minirreproductor, pantalla completa) se pueden ocultar uno a uno: Ajustes → Reproducción → <b>Botones del reproductor</b>. Las teclas funcionan aunque el botón esté oculto; pausa, volumen y el menú ⚙ siempre se ven.</p>`,
  },
  {
    id: 'sleep',
    cat: 'watch',
    title: 'Temporizador de apagado',
    keywords: 'temporizador dormir apagar noche final del programa',
    body: `
<p>Se ajusta con el botón ☾ del reproductor: 15, 30, 45, 60, 90, 120 minutos o <b>«Al final del programa»</b> (toma el final del programa en emisión según la guía de TV; solo se puede elegir si el canal tiene datos de programación).</p>
<p>El número pequeño del botón indica los minutos restantes. En los últimos 15 segundos el sonido baja suavemente, luego la reproducción se detiene y el reproductor se cierra. Para desactivarlo: <i>Desactivado</i> en el mismo menú.</p>`,
  },
  {
    id: 'engines',
    cat: 'watch',
    title: 'Motores de reproducción',
    keywords: 'hls.js nativo reproductor integrado mpegts dash motor formato m3u8 ts mpd',
    body: `
<p>Las emisiones llegan en distintos formatos, así que el programa usa varios motores de reproducción:</p>
<table class="help-table">
<tr><td><b>hls.js</b></td><td>Emisiones HLS (<code>.m3u8</code>): el predeterminado en la versión de escritorio; permite elegir calidad y pista de audio.</td></tr>
<tr><td><b>Reproductor integrado</b></td><td>El reproductor propio del sistema / la TV. En la TV es el predeterminado para HLS, porque allí hls.js no llegaría a muchas emisiones por las restricciones CORS.</td></tr>
<tr><td><b>mpegts.js</b></td><td>Emisiones MPEG-TS (<code>.ts</code>) y FLV.</td></tr>
<tr><td><b>dash.js</b></td><td>Emisiones DASH (<code>.mpd</code>).</td></tr>
</table>
<p>Ajustes → Reproducción → <b>Motor de reproducción</b>: <i>Automático</i> (recomendado), <i>Reproductor integrado</i> o <i>hls.js</i>. Si una emisión HLS no arranca con uno, prueba el otro. En la TV el programa lo hace solo: si el reproductor integrado no puede, prueba la misma fuente también con hls.js.</p>`,
  },

  // ===================================================================== VOD
  {
    id: 'vod',
    cat: 'vod',
    title: 'VOD: películas y series',
    keywords: 'película serie vod cine episodio temporada continuar dominio público mediateca propia nas listas online canal clasificación',
    body: `
<p>Además de canales de TV en directo, Adás reproduce <b>películas y series</b> (VOD, vídeo bajo demanda). No son canales, sino vídeos independientes: se pueden iniciar en cualquier momento, avanzar y retomar donde los dejaste. En el menú, <b>VOD</b> aparece aparte, después de las partes de TV (Inicio, Guía de TV, Explorar, Favoritos).</p>
<h2>Dos partes: listas online y mediateca propia</h2>
<p>Arriba en la página VOD hay dos pestañas: <b>Listas online</b> (las listas de películas / series integradas y añadidas) y <b>Mediateca propia</b> (las listas de reproducción encontradas en las carpetas de tu NAS / ordenador).</p>
<h2>¿Canal o VOD?</h2>
<p>Entre los canales solo hay emisiones en directo, y en VOD solo películas y series. Si una lista de canales (p. ej. de un proveedor de IPTV) contiene también películas o episodios —marca de duración (<code>#EXTINF:5400</code>), dirección con <code>/movie/</code> o <code>/series/</code>, o un archivo de vídeo con año / número de episodio—, pasan solos al VOD (con el nombre de la lista). Al revés: si una lista VOD contiene una emisión en directo (dirección HLS / TS sin duración, con grupo «Live / TV» o tvg-id), pasa a los canales. En Ajustes, junto a las listas, se ve cuánto se ha movido.</p>
<h2>La página de listas online</h2>
<ul>
<li><b>Continuar</b>: las películas y series empezadas (la barra de progreso muestra por dónde vas).</li>
<li><b>Series</b>, <b>Películas recomendadas</b>, luego los <b>géneros unificados</b> (los más populares primero; por defecto los 12 más populares tienen fila, los demás se activan en Ajustes → VOD y mediateca → Listas VOD → <i>Filas de la página VOD</i>, y siempre se pueden elegir en el filtro) y, por último, una fila por lista. Los nombres de género siguen la <b>lista de géneros de AnimeAddicts</b> (Acción, Drama, Fantasía, Aventura, Policíaco, Misterio, Romántico, Ciencia ficción, Suspense, Comedia…), completada con <i>Documental</i> y <i>Película de culto</i>. Los grupos propios de las listas —en cualquier idioma, p. ej. «Horror all night», «Comedy», «Comedia»— el programa los asigna a estos, para que cada género aparezca una sola vez. Las simples características (p. ej. <i>No apto para niños</i>, <i>Episodio(s) corto(s)</i>, <i>CGI</i>) se pueden elegir en el filtro, pero no tienen fila propia. Un título puede aparecer en <b>varios géneros</b>: recibe el género de cada una de sus listas, archivos y grupos (p. ej. si está tanto en <code>accion.m3u8</code> como en <code>comedia.m3u8</code> de tu paquete de géneros). En la mediateca propia, las listas que no se asocian a un género (p. ej. «Navidad») quedan como filas aparte con su nombre.</li>
<li>Con los botones <b>Todas las películas</b>, <b>Todas las series</b> y <b>Buscar y filtrar</b> obtienes una vista de cuadrícula filtrable por tipo, grupo y año.</li>
</ul>
<p>El buscador de la cabecera también encuentra películas y series (bajo su propio título «VOD: películas y series»).</p>
<h2>Ficha</h2>
<p>Al hacer clic en una carátula se abre la ficha:</p>
<ul>
<li><b>Película</b>: título, año, duración, grupos, fuente; <i>Reproducir</i> o <i>Reanudar desde xx:xx</i>, <i>Desde el principio</i>, <i>Marcar como visto</i>.</li>
<li><b>Serie</b>: temporadas en pestañas (en cada una: episodios vistos / totales), la lista de episodios (los vistos atenuados, los empezados con barra de progreso), progreso total; el botón principal inicia el siguiente episodio por ver. El botón <i>Marcar temporada como vista</i> marca (o desmarca) todos los episodios de la temporada a la vez.</li>
<li><b>+ Pendientes</b>: añade la película / serie a tu lista propia; aparece en la fila <i>Pendientes</i> de la página VOD (la fila se puede activar/desactivar y mover).</li>
<li><b>✎ Título y carátula</b>: una ventana con el título mostrado (p. ej. si no se encuentra el título en español) y la carátula. También puedes <b>buscar carátulas con tu propio término</b> (p. ej. con el título original o japonés). Fuentes sin clave: AniList, Kitsu, MyAnimeList (anime), TVmaze (series), Wikipedia en español e inglés, Wikidata; con clave propia, TMDB y OMDb (datos de IMDb). También puedes indicar tu propia dirección o archivo de imagen y restaurar la carátula original. El cambio se aplica con <i>Guardar</i>.</li>
</ul>
<h2>Título en español, carátula</h2>
<p>Las tarjetas y la parte superior de la ficha muestran el <b>título en español</b> de la película / serie si se conoce (Wikidata; con clave de TMDB, TMDB). En la ficha, debajo, aparece el título original / en inglés; en la tarjeta, al pasar por encima. La búsqueda también encuentra el elemento por el título en español. Para los elementos sin carátula, el programa busca una por sí mismo; si no la encuentra, la tarjeta muestra el título sobre un fondo de color, y puedes poner una cuando quieras con el botón <b>Título y carátula</b> de la ficha. El título y la carátula puestos a mano valen para todos los perfiles.</p>
<p>El estado de visionado se guarda <b>por perfil</b>. En un perfil infantil solo aparece contenido familiar, infantil y de animación.</p>
${go('#/vod', 'Abrir el VOD')}`,
  },
  {
    id: 'vod-player',
    cat: 'vod',
    title: 'Ver películas: avanzar, reanudar, siguiente episodio',
    keywords: 'avanzar saltar adelante atrás 10 segundos línea de tiempo siguiente episodio reanudar automático reproductor externo vlc mpv iina ac3 dts mkv sin sonido subtítulos incrustados',
    body: `
<p>Al reproducir películas y episodios, abajo en el reproductor aparece una <b>línea de tiempo</b> (tiempo transcurrido / restante) en lugar del programa en directo. Haz clic o arrastra para saltar a cualquier punto.</p>
<table class="help-table keys">
<tr><td><kbd>←</kbd> / <kbd>→</kbd></td><td>10 s atrás / adelante (con <kbd>Mayús</kbd>, 60 s)</td></tr>
<tr><td><kbd>↑</kbd> / <kbd>↓</kbd></td><td>Volumen</td></tr>
<tr><td><kbd>0</kbd>–<kbd>9</kbd></td><td>Saltar al 0–90 % del vídeo</td></tr>
<tr><td><kbd>Espacio</kbd> / <kbd>Intro</kbd></td><td>Pausa / continuar</td></tr>
<tr><td><kbd>RePág</kbd> / <kbd>AvPág</kbd> (CH+/CH−)</td><td>Episodio anterior / siguiente</td></tr>
<tr><td><kbd>I</kbd></td><td>Ficha</td></tr>
<tr><td>⏪ ⏩ en el mando</td><td>30 s atrás / adelante</td></tr>
</table>
<h2>Reanudar</h2>
<p>El programa guarda por dónde vas cada 5 segundos y al salir. La próxima vez, el botón <i>Continuar</i> empieza desde ahí; el botón <i>Desde el principio</i>, desde el inicio. Si has visto el 94 % del vídeo, cuenta como visto.</p>
<h2>Siguiente episodio</h2>
<p>En las series, al final de un episodio aparece el aviso <b>Siguiente episodio</b> con una cuenta atrás de 8 segundos: <i>Reproducir</i> lo inicia al momento, <i>Cancelar</i> lo detiene. Se puede desactivar: Ajustes → VOD y mediateca → Listas VOD → <i>Iniciar el siguiente episodio automáticamente</i>.</p>
<p>Aquí, la opción «Al final del programa» del temporizador de apagado significa el final del vídeo.</p>
<h2>Pistas de audio y subtítulos incrustados (puente de reproducción)</h2>
<p>El reproductor integrado (el motor de Chromium) no puede reproducir por sí solo audio <b>AC3 / E-AC3 / DTS / TrueHD</b> (ni siquiera ve esas pistas), no muestra en absoluto los <b>subtítulos incrustados</b> en el archivo (MKV: ASS / SRT, MP4: mov_text) y tampoco la imagen de algunos formatos de vídeo antiguos (XviD, WMV, H.264 de 10 bits).</p>
<p>Por eso la <b>versión de escritorio</b>, cada vez que empieza una película / episodio, revisa en un instante las pistas del archivo (<b>FFmpeg</b> integrado) y, si hace falta, lo reproduce a través del <b>puente de reproducción</b>: la imagen no cambia, el audio se convierte a AAC sobre la marcha y los subtítulos incrustados pasan al menú <b>CC</b>. Así se puede elegir cualquier pista de audio, se puede avanzar (el puente vuelve a empezar desde el punto elegido) y también se aplican los idiomas favoritos de audio y subtítulos del perfil. Para los subtítulos, el ajuste predeterminado es <i>La predeterminada del archivo</i>: se muestran los subtítulos marcados como predeterminados en el archivo y, sin marca —si el audio no está en tu idioma—, los subtítulos en tu idioma.</p>
<p>El estilo de los subtítulos (fuente ASS, colores, posición) se convierte en texto simple. Para desactivarlo: Ajustes → Reproducción → <i>Puente de reproducción (FFmpeg)</i>. El puente solo descarga la parte que se reproduce (unos 90 segundos por delante), no el archivo entero.</p>
<h2>Android y Android TV: reproductor nativo</h2>
<p>En Android, las películas y episodios (MKV, MP4, AVI…) se reproducen con el <b>reproductor nativo</b> integrado (ExoPlayer): la imagen aparece bajo la interfaz y los controles son los mismos. Maneja audio <b>AC3 / E-AC3 / DTS / TrueHD</b> (con el decodificador FFmpeg incluido si el dispositivo no puede), subtítulos <b>ASS / SRT</b> incrustados en el archivo (como texto simple), y todas las pistas de audio se pueden elegir en el menú <b>CC</b>. En una TV con barra de sonido / amplificador, el audio AC3 también puede pasar sin cambios. Si el reproductor nativo no puede con un archivo, el programa prueba automáticamente con el reproductor propio de WebView. Para desactivarlo: Ajustes → Reproducción → <i>Reproductor nativo (ExoPlayer)</i>.</p>
<h2>En un reproductor externo</h2>
<p>Si el puente / el reproductor nativo está desactivado o no está disponible, el reproductor detecta cuando el audio o la imagen de un archivo no funcionan y ofrece el botón <b>Reproductor externo</b>; en la ficha también está siempre el botón <b>En un reproductor externo</b>.</p>
<ul>
<li><b>Windows / Mac / Linux</b>: el programa pasa al sistema una lista de reproducción (en una serie, desde el episodio elegido junto con los demás), que abre el reproductor asociado. Recomendados: <b>VLC</b> (en todos los sistemas), <b>mpv</b>, en macOS <b>IINA</b>. Si no se abre nada, instala uno y asócialo a los archivos <code>.m3u</code>.</li>
<li><b>Android</b>: el sistema ofrece los reproductores de vídeo instalados (VLC, MX Player, Kodi…).</li>
<li>En la <b>TV</b> (LG) no existe esta opción; el reproductor de la TV suele manejar el audio AC3.</li>
</ul>
<p>En un reproductor externo, Adás no puede seguir por dónde vas, pero sí recuerda el episodio actual de una serie.</p>`,
  },
  {
    id: 'vod-lists',
    cat: 'vod',
    title: 'Listas de películas y series',
    keywords: 'lista de películas lista de series añadir github repositorio m3u m3u8 zip varios archivos género dominio público orphaned paquete adicional adaspack',
    body: `
<p>Las películas y series se cargan desde <b>listas aparte</b>, como los canales de TV: Ajustes → VOD y mediateca → <b>Listas VOD</b>.</p>
<h2>Listas integradas</h2>
<table class="help-table">
<tr><td><b>Orphaned Films</b></td><td>Más de 1300 películas de dominio público agrupadas por temas, con carátulas.</td></tr>
<tr><td><b>Películas de dominio público (OnlineM3U)</b></td><td>Películas clásicas seleccionadas por géneros.</td></tr>
</table>
<p>Ambas contienen películas alojadas en archive.org cuyos derechos de autor han expirado. Cada una se puede activar y desactivar.</p>
<h2>Paquetes adicionales</h2>
<p>Un archivo <code>.adaspack</code> trae una lista con nombre y descripción, y aparece entre las <b>Listas integradas</b>, pero no viene con el programa: solo estará en el dispositivo donde lo cargues:</p>
<ul>
<li>el botón <b>Cargar paquete adicional</b> (Listas VOD), o</li>
<li>en la versión de escritorio, la <b>Carpeta de paquetes</b> (la subcarpeta <code>packs</code> de la carpeta de datos del usuario): lo que haya ahí se carga solo al iniciar y se actualiza si el archivo cambia;</li>
<li>la <b>copia de seguridad</b> y la <b>transferencia entre dispositivos</b> también llevan los paquetes (p. ej. del ordenador al móvil).</li>
</ul>
<p>Un paquete de películas se llama <code>…_vod.adaspack</code>, uno de TV <code>…_tv.adaspack</code> (este va a las listas de canales). <b>Quitar</b> solo lo borra de este dispositivo. ${t('adaspack', 'Formato y creación (también con IA)')}</p>
<h2>Añadir una lista propia</h2>
<ul>
<li><b>Desde una dirección</b>: la dirección de una lista M3U / M3U8, un solo vídeo (p. ej. <code>…/pelicula.m3u8</code> o <code>.mp4</code>), o un <b>repositorio completo de GitHub</b> (p. ej. <code>https://github.com/autor/repositorio</code>); en ese caso el programa carga todas las listas del repositorio (hasta 300 archivos). También funciona un enlace de GitHub a una carpeta o archivo dentro de un repositorio.</li>
<li><b>Desde archivo</b> (versiones de escritorio y Android): uno o <b>varios</b> archivos <code>.m3u</code> / <code>.m3u8</code>, o un paquete <b>ZIP</b>. Varios archivos forman una sola lista:
  <ul>
  <li><b>Paquete de géneros</b>: si contiene un archivo llamado <code>all</code>, o los mismos títulos aparecen en varios archivos (p. ej. <code>all.m3u8</code> + <code>accion.m3u8</code> + <code>drama.m3u8</code>): cada película / episodio aparece una vez, y los nombres de archivo se convierten en <b>géneros</b> (filas aparte en la página de películas, y filtrables).</li>
  <li><b>Listas independientes</b>: se unen; el nombre del archivo ayuda a reconocer las series.</li>
  </ul>
  El texto de las listas grandes se guarda aparte y de forma permanente (borrar la caché no lo elimina), y también entra en la copia de seguridad y en el paquete de <i>Sincronización entre dispositivos</i>.</li>
<li><b>Pegada</b> como texto.</li>
</ul>
<p>Cada lista propia se puede <b>activar y desactivar</b>, renombrar y eliminar. Si hay varias listas activadas, la página de películas tiene también una fila por lista, y en la vista de cuadrícula puedes filtrar por lista.</p>
<p>Los elementos de géneros para adultos (p. ej. <i>hentai</i>, <i>erótico</i>) solo aparecen con el ajuste <i>Mostrar contenido para adultos</i>; nunca en un perfil infantil.</p>
<p>Las listas se actualizan cada 6 horas; al momento: <i>Actualizar las listas ahora</i>. Junto a cada lista se ve cuántas entradas dio, o el mensaje de error si no se puede descargar.</p>
<div class="warn">Añade solo listas cuyo contenido puedas ver legalmente. Los vídeos de las listas gratuitas no oficiales suelen dejar de estar disponibles enseguida (p. ej. enlaces de alojamiento caducados).</div>
${go('#/settings?section=vodlists', 'Gestionar listas')}`,
  },
  {
    id: 'own',
    cat: 'vod',
    title: 'Mediateca propia (NAS)',
    keywords: 'propia nas carpeta compartida unidad de red smb http servidor web lista de reproducción m3u m3u8 automático',
    body: `
<p>En la pestaña <b>Mediateca propia</b> del VOD aparecen tus propias películas y series, por ejemplo desde listas <code>.m3u</code> / <code>.m3u8</code> que se generan automáticamente en una carpeta de tu NAS. Funciona igual que las listas VOD online: carátulas, ficha, reanudar, siguiente episodio, información y subtítulos en español.</p>
<h2>Indicar una fuente</h2>
<p>Ajustes → VOD y mediateca → <b>Mediateca propia (NAS)</b>:</p>
<table class="help-table">
<tr><td><b>Elegir carpeta…</b> / <b>Introducir ruta de carpeta</b><br><small>(versión de escritorio)</small></td><td>La carpeta compartida del NAS, p. ej. <code>\\\\NAS\\Media\\Listas</code>, una unidad de red (<code>Z:\\Listas</code>) o una carpeta montada en Linux / macOS (<code>/mnt/nas/listas</code>, <code>/Volumes/Media</code>). El programa también revisa las subcarpetas (hasta 4 niveles).</td></tr>
<tr><td><b>Dirección de red (http)</b><br><small>(en todos los dispositivos, también en la TV)</small></td><td>Si el NAS también ofrece la carpeta mediante un servidor web (p. ej. Synology Web Station, QNAP, un listado de directorios nginx / Apache): <code>http://192.168.1.10/listas/</code>. El programa revisa los enlaces .m3u / .m3u8 y las subcarpetas (2 niveles) de la página. También se puede indicar la dirección de una sola lista.</td></tr>
</table>
<h2>Activar y desactivar listas</h2>
<ul>
<li>Bajo la fuente, <b>cada lista encontrada aparece en su propia fila</b> con su interruptor (y el número de entradas). También hay botones <i>Activar todas</i> / <i>Desactivar todas</i>.</li>
<li>Las listas nuevas llegan <b>activadas</b> por defecto (se puede cambiar: <i>Activar automáticamente las listas nuevas</i>).</li>
<li>La fuente entera también se puede desactivar o quitar (en el NAS no se borra nada).</li>
</ul>
<h2>Actualización automática</h2>
<p>El programa revisa las fuentes cada 10 minutos y al abrir la página Propia, así que las listas que el NAS genera o modifica aparecen solas. Al momento: el botón <i>Volver a leer</i> en la página Propia o en los ajustes.</p>
<h2>Rutas en las listas</h2>
<ul>
<li>Direcciones completas (<code>http://…</code>, <code>file://…</code>) sin cambios,</li>
<li>rutas de Windows y UNC (<code>D:\\Peliculas\\…</code>, <code>\\\\NAS\\…</code>) y rutas Unix (<code>/volume1/…</code>) como archivos locales,</li>
<li><b>rutas relativas</b> (<code>Peliculas/Pelicula.mkv</code>, <code>../Series/…</code>) respecto a la ubicación de la lista.</li>
</ul>
<div class="note">Solo la versión de escritorio puede reproducir archivos locales / compartidos (file://); en la TV, el NAS debe servir los vídeos por http (p. ej. con una dirección DLNA / de servidor web). La reproducción depende de los formatos que admita el motor del navegador: MP4 (H.264/AAC) y HLS funcionan seguro, MKV en parte, y algunos códecs (p. ej. audio DTS) no.</div>
<h2>Títulos y subtítulos</h2>
<p>De los nombres de archivo (p. ej. <code>Titulo.De.La.Pelicula.2019.1080p.BluRay.x264</code>) el programa extrae el título y el año, así que también funcionan la información en español y la búsqueda en OpenSubtitles. Un archivo de subtítulos con el mismo nombre junto al vídeo (<code>Pelicula.srt</code>, <code>Pelicula.es.srt</code>) se <b>carga automáticamente</b> (con preferencia por el español), y puedes elegirlo en el menú de subtítulos bajo «Junto al vídeo». ${t('subtitles', 'Subtítulos')}</p>
${go('#/settings?section=ownlists', 'Configurar la mediateca propia')}`,
  },
  {
    id: 'subtitles',
    cat: 'vod',
    title: 'Subtítulos (Feliratok.eu, OpenSubtitles, SubDL)',
    keywords: 'subtítulos subtitle feliratok.eu opensubtitles subdl srt vtt español inglés desfase tamaño api clave paquete de temporada',
    body: `
<p>Para películas y series puedes cargar <b>subtítulos en español o en inglés</b> de las colecciones de <b>OpenSubtitles</b> y <b>SubDL</b>, de <b>Feliratok.eu</b> (una web húngara con subtítulos en húngaro e inglés) o de un archivo <code>.srt</code> / <code>.vtt</code> propio.</p>
<h2>Feliratok.eu: sin configuración</h2><p>Activado por defecto: sin cuenta, sin clave y sin límite diario. En las series también extrae los subtítulos del episodio de un paquete de temporada (ZIP); los caracteres especiales de los subtítulos antiguos que no están en UTF-8 también salen bien. Ofrece subtítulos en húngaro e inglés. Se puede desactivar: Ajustes → Subtítulos e información → Información y subtítulos en español.</p><h2>SubDL (opcional)</h2><p>Más resultados con una clave gratuita: regístrate en <b>subdl.com</b>, copia la clave API de tu perfil e introdúcela en Ajustes → Subtítulos e información → <i>Clave API de SubDL</i>. No hace falta contraseña.</p><h2>OpenSubtitles (opcional, se configura una vez)</h2>
<ol>
<li>Regístrate gratis en <b>opensubtitles.com</b>.</li>
<li>Con la sesión iniciada, busca en tu perfil la sección <b>API consumers</b> y crea una clave nueva (vale cualquier nombre, p. ej. «Adás»).</li>
<li>En Adás: Ajustes → Subtítulos e información → <b>Información y subtítulos en español</b> → introduce la <b>clave API</b>, tu <b>usuario</b> y tu <b>contraseña</b>, y pulsa <i>Probar inicio de sesión</i>.</li>
</ol>
<p>Para buscar basta con la clave API; <b>para descargar también hace falta iniciar sesión</b>. Con una cuenta gratuita se puede descargar un número limitado de subtítulos al día (el programa indica cuántos quedan tras cada descarga); los subtítulos ya descargados se recuerdan y no vuelven a gastar cupo.</p>
<h2>Uso durante la reproducción</h2>
<ul>
<li>El botón <b>CC</b> del reproductor o la tecla <kbd>C</kbd> abre el menú <b>Audio y subtítulos</b> (pista de audio, subtítulos incrustados y externos). ${t('audio-subs', 'Detalles')}</li>
<li><b>Buscar subtítulos</b> (debajo, en letra pequeña, las bases de datos activas): un solo botón busca en todas las fuentes activadas, en español y en inglés, con los resultados en el idioma elegido primero. Primero van los resultados de Feliratok.eu (los que coinciden en año y título arriba del todo), luego OpenSubtitles (por número de descargas, las traducciones automáticas al final) y SubDL; cada resultado muestra el idioma y la fuente. Haz clic en el que quieras: se descarga y aparece al momento.</li>

<li><b>Desfase</b>: si los subtítulos van desincronizados, ajústalos en pasos de ±0,5 segundos.</li>
<li><b>Tamaño</b>: pequeño, mediano, grande, enorme.</li>
<li><i>Cargar subtítulos desde archivo</i> (versión de escritorio): tu propio archivo .srt o .vtt.</li>
<li><i>Desactivado</i>: ocultar los subtítulos.</li>
</ul>
<p>Los subtítulos elegidos <b>se quedan con esa película / episodio</b> y se cargan solos la próxima vez. Con el ajuste <i>Buscar subtítulos automáticamente</i>, cada vez que empieza una película / episodio se cargan automáticamente los mejores subtítulos (en español o en inglés).</p>
<div class="note">Los datos de OpenSubtitles (clave, usuario, contraseña) solo se guardan en este dispositivo y solo se envían a opensubtitles.com. La coincidencia se basa en el título y el año de la película; puede que las películas antiguas o poco conocidas no tengan subtítulos en español.</div>
${go('#/settings?section=huinfo', 'Ajustes de subtítulos')}`,
  },
  {
    id: 'hu-info',
    cat: 'vod',
    title: 'Información en español sobre películas y canales',
    keywords: 'información descripción título en inglés carátula imagen póster wikipedia wikidata tmdb anilist tvmaze anime género reparto dirección valoración',
    body: `
<p>El programa busca <b>información en español</b> sobre películas, series y canales de TV, y la muestra en la ficha.</p>
<h2>VOD (películas y series)</h2>
<ul>
<li><b>Título en español</b> (si difiere del original, también aparece en cursiva bajo el título),</li>
<li><b>descripción</b> en español si la hay (Wikipedia en español, TMDB); si no, <b>en inglés</b>, y el programa lo indica,</li>
<li><b>carátula</b>: la imagen propia de la lista o, si no hay, la de las fuentes (el póster del artículo de Wikipedia, AniList, TVmaze, TMDB); en la <b>mediateca propia</b>, la imagen junto al vídeo (<code>Pelicula.jpg</code>, <code>poster.jpg</code>, <code>folder.jpg</code>, <code>cover.jpg</code>) o la carátula incrustada en el archivo (adjunto MKV, MP4), esta última en la versión de escritorio,</li>
<li><b>género, dirección, estudio, reparto, país, año</b>, valoración (AniList, TVmaze, TMDB).</li>
</ul>
<h2>Canales de TV</h2>
<p>En la ficha de un canal, la sección <b>«Sobre el canal»</b>: un resumen de Wikipedia en español (o en inglés), propietario, año de inicio, desde Wikidata o, si no, desde el buscador de Wikipedia en español y luego en inglés. El programa solo muestra una descripción si el nombre del canal (y, en Wikidata, su país) coinciden, para que no aparezcan descripciones erróneas.</p>
<h2>Fuentes</h2>
<table class="help-table">
<tr><td><b>Wikidata + Wikipedia</b></td><td>Predeterminado, gratis, sin clave; artículo en español o en inglés.</td></tr>
<tr><td><b>AniList</b></td><td>Para anime (el programa lo reconoce por la lista, el alojamiento o los géneros): carátula, descripción en inglés, géneros, puntuación, estudio. Sin clave.</td></tr>
<tr><td><b>TVmaze</b></td><td>Para series: imagen, resumen en inglés, género, valoración. Sin clave.</td></tr>
<tr><td><b>TMDB</b> (The Movie Database)</td><td>Si introduces tu propia clave API gratuita (themoviedb.org → Ajustes → API), los datos de películas y series también vendrán de aquí: descripciones en español más completas y valoraciones.</td></tr>
</table>
<p>Si un proveedor pide ir más despacio (demasiadas solicitudes), el programa deja de preguntarle un rato y continúa después. Las reseñas de <b>AnimeAddicts</b> solo se ven con sesión iniciada, así que el programa no las lee.</p>
<p>Los datos se guardan en la caché (30 días), así que la segunda vez aparecen al instante. Para desactivarlo: Ajustes → Subtítulos e información → Información y subtítulos en español → <i>Descargar información y carátulas</i>.</p>
${go('#/settings?section=huinfo', 'Ajustes')}`,
  },
  {
    id: 'vod-detect',
    cat: 'vod',
    title: '¿Cómo distingue películas de series?',
    keywords: 'detección película serie episodio S01E02 temporada episodio nombre formato',
    body: `
<p>Las listas M3U no indican aparte qué es película y qué es serie, así que el programa lo decide por el <b>título</b>. Si el título tiene una marca de episodio, lo trata como <b>episodio de serie</b>; si no, como <b>película</b>.</p>
<h2>Marcas de episodio reconocidas</h2>
<table class="help-table">
<tr><td><code>S01E02</code>, <code>S1 E2</code>, <code>S04.E23</code></td><td>temporada + episodio</td></tr>
<tr><td><code>1x02</code></td><td>temporada + episodio</td></tr>
<tr><td><code>Season 2 Episode 5</code>, <code>Staffel 2 Folge 5</code>, <code>Saison 2 Épisode 5</code></td><td>temporada + episodio</td></tr>
<tr><td><code>2. évad 5. rész</code></td><td>temporada + episodio (húngaro)</td></tr>
<tr><td><code>Episode 5</code>, <code>Ep. 5</code>, <code>Folge 5</code>, <code>Part 5</code>, <code>5. rész</code></td><td>episodio (temporada 1)</td></tr>
<tr><td><code>第5集</code>, <code>第5話</code></td><td>episodio (chino / japonés)</td></tr>
</table>
<h2>El nombre de la serie</h2>
<p>El texto <b>anterior</b> a la marca es el nombre de la serie (p. ej. «The Goldbergs S04 E23» → <i>The Goldbergs</i>, temporada 4, episodio 23), y lo que sigue es el título del episodio. Si no hay texto antes de la marca, el nombre de la serie lo da el campo <code>group-title</code> y, en último caso, el nombre de archivo de la lista. Los episodios con el mismo nombre se agrupan en una serie, ordenados por temporadas y episodios.</p>
<h2>Películas</h2>
<p>Un año entre paréntesis al final del título (p. ej. «Night of the Living Dead (1968)») se toma como año de la película. El campo <code>group-title</code> da el grupo / género, <code>tvg-logo</code> la carátula y el número tras <code>#EXTINF</code> la duración. Las películas con el mismo título y año de varias listas se funden en una, y sus versiones sirven de fuentes de reserva.</p>
<div class="tip">Al crear tu propia lista, nombra las entradas así: <code>#EXTINF:-1 tvg-logo="caratula.jpg" group-title="Comedia",Título de la película (1999)</code>, y para una serie <code>…,Título de la serie S01E01 Título del primer episodio</code>.</div>`,
  },

  // ===================================================================== Buscar y explorar
  {
    id: 'dashboard',
    cat: 'find',
    title: 'La página de inicio',
    keywords: 'inicio panel tiempo noticias rss guía de tv favoritos esta noche continuar localidad personalizar diseño bloque mosaico tamaño',
    body: `
<p>La página de inicio es un resumen formado por bloques (tarjetas) que en el ordenador y en la TV siempre <b>cabe en una pantalla</b>. En el móvil (y en Android en vertical) los bloques van uno debajo de otro y se desplaza.</p>
<h2>Personalizar</h2>
<p>Con el botón <b>Personalizar</b> arriba a la derecha del inicio (o Ajustes → Inicio → <i>Personalizar el inicio</i>):</p>
<ul>
<li>el número de <b>columnas</b> (1–5) y <b>filas</b> (1–4) de la cuadrícula,</li>
<li>por bloque: <b>orden</b> (‹ ›, también arrastrando con el ratón), <b>ancho</b> (↔) y <b>alto</b> (↕) en celdas, <b>ocultar</b> (×),</li>
<li>recuperar los bloques ocultos (<b>Añadir</b>), y el diseño <b>Predeterminado</b>.</li>
</ul>
<p>Los bloques siempre van al primer hueco libre. Si tras un cambio algo no cupiera, el programa no lo permite: primero reduce u oculta otro bloque, o amplía la cuadrícula. El diseño se guarda por separado para cada perfil. Con el mando, los botones se alcanzan con las flechas.</p>
<div class="tip"><b>El tamaño importa:</b> cada bloque ajusta a su tamaño qué y cuánto muestra; por ejemplo, el número de noticias y programas, la imagen y la entradilla de las noticias, los días de la previsión semanal, la densidad del desglose por horas, el tamaño y el número de carteles VOD o la franja horaria de la guía de TV.</div>
<h2>Los bloques</h2>
<table class="help-table">
<tr><td><b>El tiempo</b></td><td>Arriba el tiempo de hoy con el nombre de la localidad, debajo el día de hoy por horas (cada dos o tres horas en una tarjeta estrecha) y abajo la previsión semanal. En una tarjeta pequeña desaparece la parte semanal y, más pequeña aún, también el gráfico. La parte de hoy puede ser: gráfico de líneas, área + precipitación, barras, mosaicos o un único valor. Localidad y aspecto: Ajustes → <b>Inicio</b>. Fuente: Open-Meteo.</td></tr>
<tr><td><b>Ahora en la TV</b></td><td>La programación de tus canales favoritos, parecida a la cuadrícula de la guía de TV (una franja de 1–5 horas según el ancho). Lo que no cabe se indica con una línea «+N más».</td></tr>
<tr><td><b>Noticias</b></td><td>Las últimas noticias de las fuentes RSS / Atom activadas, tantas como quepan (con entradilla en una tarjeta ancha). Al hacer clic se abre el resumen de la noticia. Fuentes: Ajustes → <b>Inicio</b> → <i>Fuentes de noticias</i>. Las fuentes predeterminadas dependen del idioma de la interfaz. No disponible en un perfil infantil.</td></tr>
<tr><td><b>Esta noche en la TV</b></td><td>Un programa de la noche (después de las 19 h) por cada canal favorito. Con el botón de la campana pides un recordatorio.</td></tr>
<tr><td><b>Último canal visto</b></td><td>El último canal visto con el programa actual y el siguiente (con la descripción en una tarjeta mayor); se retoma con una sola pulsación.</td></tr>
<tr><td><b>VOD: continuar</b></td><td>Las 5 últimas películas / episodios vistos, con cartel y progreso (en lista en una tarjeta pequeña); continúa donde lo dejaste.</td></tr>
<tr><td><b>Canales favoritos</b> (oculto por defecto)</td><td>Los logotipos de tus canales favoritos en una cuadrícula, que se inician con un clic; en un mosaico mayor, con lo que se emite ahora.</td></tr>
<tr><td><b>Recordatorios</b> (oculto por defecto)</td><td>Tus próximos recordatorios de programas; uno que ya se emite lleva la marca «AHORA» y se inicia con un clic.</td></tr>
<tr><td><b>Reloj y onomástica</b></td><td>Un reloj grande con la fecha y, si está disponible para tu idioma, la onomástica de hoy (en una tarjeta mayor, también la de mañana).</td></tr>
<tr><td><b>Tipos de cambio</b></td><td>Las principales divisas frente a tu moneda local, con la variación respecto al día anterior (tipos de referencia del BCE, actualizados en días laborables).</td></tr>
<tr><td><b>Deportes</b></td><td>Eventos en directo, recientes y próximos de las ligas, equipos, deportes y calendarios que sigues en el Seguimiento deportivo, de cualquier deporte (tenis, balonmano, disc golf, World Chase Tag…). Cuando se puede, un botón <b>📺</b> sugiere el canal donde verlo. ${t('sportwatch', 'Seguimiento deportivo')}</td></tr>
<tr><td><b>Recomendado para ti</b></td><td>Programas en emisión en canales de tus categorías más vistas que aún no son tus favoritos.</td></tr>
<tr><td><b>Pendientes</b></td><td>Los carteles de tu lista de Pendientes (ficha VOD → <i>+ Pendientes</i>).</td></tr>
<tr><td><b>Nuevos episodios</b></td><td>Series que ves con episodios sin ver después del último que viste («3 episodios nuevos»).</td></tr>
<tr><td><b>Empieza pronto</b></td><td>Programas que empiezan en la próxima hora larga en tus canales favoritos (y en los principales de tu país), con la marca «en x min» y una campana de recordatorio.</td></tr>
<tr><td><b>Películas de esta noche</b></td><td>Películas que empiezan esta noche (desde las 18 h) en tus canales favoritos y de tu país, según la categoría de la guía de TV.</td></tr>
<tr><td><b>Tiempo de visionado</b></td><td>El tiempo de hoy y de la semana, con los días como barras; en un perfil infantil, el tiempo que queda hoy.</td></tr>
<tr><td><b>Descubre</b></td><td>Un canal (no favorito) elegido al azar que está emitiendo ahora; con <i>Otro</i> pides uno nuevo.</td></tr>
<tr><td><b>Sol y aire</b></td><td>Salida y puesta del sol, duración del día, índice UV y calidad del aire en la localidad del tiempo (Open-Meteo).</td></tr>
<tr><td><b>Nota</b></td><td>Tu propia nota (por perfil), se guarda sola.</td></tr>
</table>
<p>Algunos bloques no están en el inicio por defecto: Personalizar → <b>Añadir</b>.</p>
<h2>Diseños predefinidos, según la hora</h2>
<p>Con los botones de <b>Diseño predefinido</b> de la barra de Personalizar cargas con un clic: Predeterminado, Mañana (tiempo, noticias, reloj, tipos de cambio), Tele por la noche (programación, esta noche, continuar), Deportes, Noticias y bolsa, Sencillo. Con el interruptor <b>Cambiar según la hora del día</b>, entre las 5 y las 10 aparece el diseño Mañana, desde las 18 h Tele por la noche, y durante el día el tuyo.</p>
<p>En la tarjeta <b>Último canal visto</b>, a los pocos segundos empieza la imagen en directo del canal sin sonido (en el ordenador y en Android, si la vista previa en directo está activada).</p>
<p>Las filas de canales están en la página <b>TV</b> (después de Inicio en el menú). ${t('home', 'La página de TV')}</p>
${go('#/settings?section=dashboard', 'Ajustes del inicio')}`,
  },
  {
    id: 'home',
    cat: 'find',
    title: 'La página de TV (canales)',
    keywords: 'página de tv canales grabaciones pestaña filas',
    body: `
<h2>Pestañas</h2>
<p>La página <b>TV</b> (después de Inicio en el menú) es la de los canales. Arriba hay cuatro pestañas: <b>Canales</b>, <b>Guía de TV</b>, <b>Explorar</b> (solo TV en directo, con filtros) y, en la versión de escritorio, <b>Grabaciones</b> (tus grabaciones de TV). ${t('recording', 'Sobre las grabaciones')}</p>
<h2>Filas</h2>
<p>La pestaña Canales tiene filas con desplazamiento horizontal: Vistos recientemente, Tus favoritos, Ahora en la TV, los canales de tu país de origen, tus listas propias, las categorías (Noticias, Deportes, Películas…) y los mosaicos de países. El <b>orden y la visibilidad de las filas se configuran por perfil</b>. ${t('home-rows', '¿Cómo?')}</p>
<h2>Todos los elementos de una fila en una página</h2>
<p>Junto al título de cada fila hay una <b>flecha redonda ›</b>: al hacer clic (o tocarla) se abren <b>todos</b> los elementos de la fila en una página. Con mando o teclado, al llegar al final de la fila hace lo mismo un mosaico <b>«Todo»</b> (OK / Intro). Funciona igual en las filas VOD, la fila <i>Continuar</i> y los mosaicos de países.</p>
<h2>Primero tu país de origen</h2>
<p>En cada lista y categoría van primero los canales de tu <b>país de origen</b>, después los canales <b>en su idioma</b> (p. ej. de países vecinos) y, dentro de estos, las emisiones que funcionan, con logotipo y mejor calidad; el orden cambia un poco cada día para que siempre descubras algo nuevo. En la búsqueda, una coincidencia exacta de nombre queda arriba del todo. El país de origen se cambia en Ajustes → Contenido e infantil → Contenido. ${t('card-badges', 'Marcas de las tarjetas')}</p>`,
  },
  {
    id: 'card-badges',
    cat: 'find',
    title: '¿Qué significan las marcas de las tarjetas?',
    keywords: 'punto verde rojo barra FHD HD 4K estrella marca icono',
    body: `
<table class="help-table">
<tr><td><span class="st st-ok"></span> punto verde</td><td>La emisión funcionó la última vez.</td></tr>
<tr><td><span class="st st-bad"></span> punto rojo</td><td>En la comprobación no respondió ninguna fuente. ${t('health', 'Comprobación')}</td></tr>
<tr><td>rótulo <b>SIN CONEXIÓN</b>, imagen gris</td><td>El canal no está disponible ahora; bajo su nombre: «Sin conexión: no disponible ahora».</td></tr>
<tr><td>rótulo <b>FUERA DE EMISIÓN</b></td><td>Un canal que solo emite a ciertas horas (no 24/7) y no está emitiendo ahora; bajo su nombre: «Fuera de emisión: ahora no emite».</td></tr>
<tr><td>sin punto</td><td>El programa aún no lo ha comprobado.</td></tr>
<tr><td><b>HD / FHD / 4K</b></td><td>La mejor calidad disponible (720p / 1080p / 2160p).</td></tr>
<tr><td>barra roja abajo</td><td>El progreso del programa en emisión (si hay guía de TV).</td></tr>
<tr><td>★</td><td>El canal está entre tus favoritos.</td></tr>
<tr><td>rótulo «Ahora: …»</td><td>El título del programa en emisión; sin guía de TV, el país y la categoría.</td></tr>
</table>
<p>Más marcas en la ficha: <b>Restricción geográfica</b> (puede que solo se vea desde ese país), <b>No 24/7</b> (solo emite a ciertas horas), <b>N fuentes</b> (varias fuentes de emisión).</p>`,
  },
  {
    id: 'search',
    cat: 'find',
    title: 'Búsqueda',
    keywords: 'búsqueda buscador resultado programa título acento',
    body: `
<p>Haz clic en la lupa de la cabecera, o pulsa <kbd>/</kbd> o <kbd>Ctrl</kbd>+<kbd>F</kbd> (en la TV, el botón amarillo), y empieza a escribir: los resultados aparecen al instante.</p>
<h2>¿Qué busca?</h2>
<ul>
<li>el nombre del canal y sus otros nombres (p. ej. «La 1» también encuentra «La 1 HD»),</li>
<li>el país (<i>español</i>, <i>España</i> o <i>ES</i>), la categoría (<i>deportes</i>, <i>noticias</i>), la red (<i>Pluto TV</i>), el nombre de tu lista propia,</li>
<li><b>títulos de programas</b> de las próximas 48 horas (si hay guía de TV): aparecen aparte, bajo el título «Programas»; los que se emiten ahora llevan la marca AHORA.</li>
</ul>
<h2>Consejos</h2>
<ul>
<li>Los acentos y las mayúsculas / minúsculas no importan: «telediario» = «Telediario», «espana» = «España».</li>
<li>Con varias palabras, todas deben coincidir: «deportes español» solo da canales deportivos en español.</li>
<li>Desde el campo de búsqueda pasas a los resultados con <kbd>↓</kbd> o <kbd>Intro</kbd>.</li>
<li>Al hacer clic en un programa encontrado se abre su ficha, donde puedes verlo al momento o pedir un recordatorio.</li>
</ul>`,
  },
  {
    id: 'browse',
    cat: 'find',
    title: 'Explorar y filtros',
    keywords: 'explorar filtro categoría país idioma calidad estado orden',
    body: `
<p>La página <b>Explorar</b> muestra todos los canales (visibles para tu perfil). Sin filtros, arriba te ayudan los mosaicos de categorías y países.</p>
<table class="help-table">
<tr><td><b>Buscar</b></td><td>Texto en el nombre, otro nombre, país o categoría del canal; se aplica <b>junto con</b> los demás filtros (p. ej. «hogar» + España + español). Desde la página de resultados del buscador de la cabecera, el botón <i>Filtrar por país, idioma, categoría</i> te trae aquí con el texto buscado.</td></tr>
<tr><td><b>Categoría</b></td><td>Noticias, Deportes, Películas, Infantil, Música… (entre paréntesis, el número de canales).</td></tr>
<tr><td><b>País</b></td><td>El país del canal.</td></tr>
<tr><td><b>Idioma</b></td><td>El idioma de la emisión (cuando se conoce).</td></tr>
<tr><td><b>Calidad</b></td><td>HD (720p) o Full HD (1080p) y superior.</td></tr>
<tr><td><b>Estado</b></td><td>Funciona / sin comprobar / no disponible. ${t('health', 'Comprobación')}</td></tr>
<tr><td><b>Orden</b></td><td>Orden recomendado, por nombre o por país.</td></tr>
</table>
<p>Los filtros se pueden combinar (p. ej. Deportes + Alemania + HD). El botón <b>Quitar filtros</b> los restablece todos. La lista se va cargando al desplazarte.</p>`,
  },
  {
    id: 'channel-info',
    cat: 'find',
    title: 'La ficha del canal',
    keywords: 'ficha información detalles país idioma propietario web fuente',
    body: `
<p>Para abrirla: el botón ⌄ de la tarjeta, clic derecho, la tecla <kbd>I</kbd> o, durante la reproducción, el botón ⓘ.</p>
<h2>¿Qué contiene?</h2>
<ul>
<li><b>Cabecera</b>: logotipo, nombre, estado, calidad, número de fuentes, restricciones, el programa en emisión con descripción y progreso; botones Reproducir y Favorito.</li>
<li><b>Programación</b>: de ayer a pasado mañana, por días; el programa en emisión resaltado. Para un programa futuro, pide un recordatorio con el botón 🔔. ${t('reminders', 'Recordatorios')}</li>
<li><b>Datos</b>: país, categoría, idioma, red, propietario, año de inicio, cierre, otros nombres, zona horaria, nombre de la lista propia, web (se abre en el navegador del sistema).</li>
<li><b>Fuentes de emisión</b>: todas las fuentes con estado, calidad y restricciones; cada una se puede iniciar por separado ▶. El botón <b>Comprobar fuentes</b> las prueba todas al momento.</li>
</ul>`,
  },

  // ===================================================================== Guía de TV
  {
    id: 'guide-grid',
    cat: 'guide',
    title: 'La cuadrícula de la guía de TV',
    keywords: 'guía de tv epg cuadrícula línea de tiempo ahora día mañana',
    body: `
<p>La página <b>Guía de TV</b> muestra la programación de los canales en una línea de tiempo: un canal por fila y el tiempo en horizontal (con marcas cada media hora). La línea vertical roja es el <b>momento actual</b>.</p>
<h2>Filtros</h2>
<ul>
<li><b>Favoritos</b>: tus canales favoritos en su propio orden,</li>
<li><b>[País de origen]</b>: los canales de tu país,</li>
<li><b>Todos los canales</b>: todos los canales con datos de programación.</li>
</ul>
<p>Selector de día: de ayer a 3 días después. El botón <b>Ir a ahora</b> te devuelve al presente.</p>
<p><b>Categoría</b> (Película, Serie, Deportes, Noticias, Infantil, Divulgación, Entretenimiento, Música): solo quedan los canales que ese día tienen un programa así; los demás programas se ven atenuados. El reconocimiento se basa en la categoría de la guía de TV y en el título del programa.</p>
<p><b>Línea de tiempo / En emisión</b>: en la vista <i>En emisión</i>, una tarjeta grande por canal muestra el programa actual (con progreso) y el siguiente; para un vistazo rápido, cómodo también con el mando.</p>
<p>En la ficha de un programa, el botón <b>Al calendario</b> guarda un archivo de calendario (.ics) que Google Calendar, Outlook o el calendario del móvil pueden importar (con recordatorio 5 minutos antes); en el ordenador, el botón <b>● Grabar</b> programa la grabación del programa (${t('recording', 'Grabación')}).</p>
<h2>Uso</h2>
<ul>
<li>Haz clic en un <b>programa</b>: se abre su ficha (descripción, duración, categoría), con <i>Ver ahora</i> si se está emitiendo y con el botón <i>Recordatorio</i> si es futuro.</li>
<li>Haz clic en el <b>nombre del canal</b> a la izquierda: empieza al momento; el cambio arriba/abajo recorre entonces los canales de la cuadrícula.</li>
<li>Los programas en emisión tienen fondo rojo oscuro, los pasados se ven atenuados y los que tienen recordatorio llevan 🔔.</li>
</ul>
<p>Solo aparecen los canales con datos de programación. ${t('trouble-epg', '¿Por qué no todos los canales?')}</p>`,
  },
  {
    id: 'reminders',
    cat: 'guide',
    title: 'Recordatorios',
    keywords: 'recordatorio aviso campana alerta empieza',
    body: `
<p>Puedes pedir un recordatorio para un programa futuro en la guía de TV (haz clic en el programa → <b>🔔 Recordatorio</b>), en la ficha del canal (la 🔔 junto al programa) o desde los resultados de búsqueda.</p>
<ul>
<li><b>Todas las emisiones</b>: en la ficha del programa, el botón <b>↻ Todas las emisiones</b> pide un recordatorio para cada emisión del programa en ese canal (para series, informativos, programas habituales). Se ignoran terminaciones como «– Episodio 312», y las emisiones de los próximos 7 días se añaden solas.</li>
<li><b>¿Cuándo avisa?</b> Ajustes → Notificaciones → Recordatorios: al empezar o de 1 a 30 minutos antes.</li>
<li><b>Cambio automático</b>: activado, al empezar el programa (tras una cuenta atrás de 8 segundos que el botón <i>Me quedo</i> detiene) cambia al canal, si Adás está abierto.</li>
<li>El icono 🔔 de la cabecera muestra tus recordatorios y las reglas de «todas las emisiones»; ahí también puedes borrarlos.</li>
<li>Los recordatorios se guardan <b>por perfil</b> y se mudan con el perfil.</li>
</ul>
<h2>¿Dónde y cómo avisa?</h2>
<table class="help-table">
<tr><td><b>Windows / Mac / Linux</b></td><td>Dentro del programa y en el centro de notificaciones del sistema; al hacer clic se inicia el canal. Con el ajuste <i>Ejecutar en segundo plano</i> avisa incluso tras cerrar la ventana (Adás se queda en la bandeja), e <i>Iniciar con el sistema</i> lo arranca en la bandeja al iniciar sesión (en Mac en la barra de menús; en Linux se añade a los programas de inicio automático). En Linux, el icono de la bandeja necesita soporte de AppIndicator (en GNOME, la extensión <i>AppIndicator</i>); sin él, la ventana oculta vuelve al iniciar de nuevo el programa.</td></tr>
<tr><td><b>Android, Android TV</b></td><td>Avisa el sistema, aunque Adás esté cerrado y también tras reiniciar el móvil. La primera vez hay que permitir las notificaciones. Al pulsar se inicia el canal.</td></tr>
<tr><td><b>TV LG</b></td><td>Avisa si Adás está en marcha; como mensaje emergente sobre otras aplicaciones de la TV.</td></tr>
<tr><td><b>Navegador</b></td><td>Solo mientras la página está abierta.</td></tr>
</table>
<div class="note">En la versión portátil (sin instalación) de Windows, Windows no siempre muestra la notificación del sistema; el aviso dentro del programa aparece igualmente. La versión instalada no tiene esta limitación.</div>
${go('#/settings?section=reminders', 'Ajustes de recordatorios')}`,
  },
  {
    id: 'epg-sources',
    cat: 'guide',
    title: 'Fuentes de la guía de TV',
    keywords: 'epg xmltv fuente emparejamiento actualización guía de tv propia',
    body: `
<p>Los datos de programación vienen de fuentes en formato <b>XMLTV</b>. En Ajustes → Guía de TV ves cada una: a cuántos canales se ha emparejado, cuántos programas contiene y, si falla, cuál es el error.</p>
<h2>Fuentes integradas</h2>
<ul>
<li>Activadas por defecto: la(s) fuente(s) de tu país de origen (fijado en el primer inicio) y la fuente propia de la lista de reproducción.</li>
<li>Se pueden activar: Hungría, Eslovaquia, Rumanía, Alemania, Reino Unido, EE. UU., Francia, Italia, España, además de las guías de los canales de Pluto TV, Samsung TV Plus y Plex. Cuantas más fuentes haya activadas, más tarda la carga.</li>
</ul>
<h2>Fuente propia</h2>
<p><b>Añadir fuente XMLTV</b>: se puede indicar cualquier dirección <code>.xml</code> o <code>.xml.gz</code> (p. ej. la guía de tu proveedor o de una web comunitaria). La fuente recién añadida va al principio de la lista y tiene prioridad.</p>
<h2>¿Cómo empareja?</h2>
<p>El programa compara el identificador y el nombre de canal de la fuente con la lista de canales: primero identificador exacto, luego identificador + país, nombre + país y, por último, un nombre inequívoco. Si varias fuentes tienen datos de un canal, gana la que está más arriba en la lista.</p>
<p><b>Actualización</b>: automática con la frecuencia indicada (cada 3–48 horas), o al momento con <i>Actualizar la guía de TV ahora</i> o con la opción <i>Actualizar la lista de canales</i> del menú del perfil.</p>`,
  },

  // ===================================================================== Personalización
  {
    id: 'profiles',
    cat: 'personal',
    title: 'Perfiles',
    keywords: 'perfil usuario quién está viendo cambiar color crear eliminar',
    body: `
<p>Cada miembro de la familia puede usar su propio perfil. Al iniciar (si hay varios perfiles) te recibe la pantalla <b>«¿Quién está viendo?»</b>; después puedes cambiar haciendo clic en la imagen de perfil de la cabecera.</p>
<h2>Gestión</h2>
<p>Menú del perfil → <b>Gestionar perfiles</b> → haz clic en un perfil para editarlo (nombre, imagen de perfil, color, perfil infantil, eliminar), o en el botón <b>Añadir perfil</b>.</p>
<h2>Imagen de perfil</h2>
<p>En el editor puedes elegir entre 11 imágenes de perfil dibujadas (zorro, conejito, robot, personajes, jarrones zen…), o la versión con <b>letra</b>: la inicial del nombre sobre un fondo del color elegido. La imagen de perfil aparece en la pantalla «¿Quién está viendo?», en la cabecera y en el menú del perfil.</p>
<p><b>Imagen propia</b>: con el botón <i>Subir imagen propia…</i> puedes elegir cualquier imagen PNG (o JPG, WebP). El programa la recorta en cuadrado (desde el centro) y la reduce a 256×256 píxeles; la imagen se guarda con el perfil, así que pasa a otros dispositivos junto con él. En la TV no hay selector de archivos: allí aparece la imagen de un perfil importado desde el ordenador.</p>
<h2>¿Qué pertenece al perfil y qué es común?</h2>
<table class="help-table">
<tr><th>Separado por perfil</th><th>Común a todos los perfiles</th></tr>
<tr><td>Favoritos y su orden (números de canal)<br>Canales vistos recientemente<br>Recordatorios<br>Estilo de la interfaz<br>Orden de las filas del inicio<br>Ajuste de perfil infantil</td>
<td>Listas de canales y canales propios<br>Fuentes de la guía de TV<br>País de origen, ajustes de reproducción<br>Resultados de la comprobación de disponibilidad<br>Volumen</td></tr>
</table>
${go('#/profiles', 'Gestionar perfiles')}`,
  },
  {
    id: 'kids',
    cat: 'personal',
    title: 'Perfil infantil y contenido para adultos',
    keywords: 'niños infantil perfil infantil adultos filtro 18 nsfw control parental',
    body: `
<h2>Perfil infantil</h2>
<p>Al editar un perfil, activa <b>Perfil infantil</b>. Entonces, por defecto, solo aparece <b>contenido infantil</b>: en el inicio, en las páginas de TV y VOD, al explorar, en la búsqueda y en la guía de TV. En un perfil infantil tampoco se ve la tarjeta de noticias.</p>
<h2>¿Qué cuenta como contenido infantil?</h2>
<p>Por defecto, los canales de las categorías <b>Infantil, Animación, Familia y Educación</b>, y las películas y series de grupos / géneros infantiles, familiares y de animación (nunca los géneros para adultos). Esta marca es <b>común a todos los perfiles</b> y se puede poner a mano: en la <b>ficha</b> del canal o de la película / serie con el botón <b>Contenido infantil</b> (en un perfil adulto), o en la lista Ajustes → Contenido e infantil → <b>Perfiles infantiles: ¿qué pueden ver?</b>.</p>
<h2>¿Qué puede ver el perfil infantil?</h2>
<p>Ajustes → Contenido e infantil → <b>Perfiles infantiles: ¿qué pueden ver?</b>: en la pestaña <b>Canales de TV</b> o <b>VOD</b>, cada fila tiene el interruptor común <i>Contenido infantil</i> y, a su lado, <b>un interruptor para cada perfil infantil</b> (con el nombre del perfil): así, por ejemplo, el niño mayor puede ver algo que el pequeño no. Con el filtro ves qué es contenido infantil, todo, o lo que un perfil infantil concreto puede / no puede ver; con la búsqueda acotas, y puedes permitir / bloquear a la vez los resultados visibles para un perfil infantil. Desde un perfil infantil, los ajustes solo se abren con PIN.</p>
<h2>Tiempo diario y límite de edad</h2>
<p>En el mismo sitio, para cada perfil infantil, puedes fijar el <b>tiempo diario</b> (de 30 minutos a 4 horas, o ilimitado) y el <b>límite de edad</b> (6, 12, 16, 18 años). Avisa 5 y 1 minutos antes del final; cuando se agota, la reproducción se detiene y solo puede seguir con el PIN de un perfil adulto (+30 minutos). Si, según la guía de TV, la calificación de edad de un programa en directo es mayor que la fijada, la emisión no empieza (o se detiene al empezar el programa); se puede desbloquear para ese programa con el PIN parental. (No todas las guías de TV indican la calificación; donde no hay datos, no hay restricción.)</p>
<div class="tip">Para las restricciones, pon un PIN a un perfil adulto (Gestionar perfiles); sin PIN, cualquiera puede desbloquearlas.</div>
<p>Un canal para adultos (18+) nunca aparece en un perfil infantil, aunque lo permitas a mano.</p>
<h2>Contenido para adultos</h2>
<p>Los canales para adultos (18+) están ocultos por defecto. Para mostrarlos: Ajustes → Contenido e infantil → Contenido → <b>Mostrar contenido para adultos</b> (pide confirmación). El filtrado se basa en la clasificación y la lista de bloqueo de iptv-org.</p>
<div class="warn">El filtrado se apoya en las marcas de la base de datos pública, así que no es perfecto. Con niños pequeños conviene supervisar el uso; el cambio de perfil desde un perfil infantil solo está protegido si un perfil adulto tiene PIN.</div>`,
  },
  {
    id: 'favorites',
    cat: 'personal',
    title: 'Favoritos e historial',
    keywords: 'favorito estrella orden arrastrar historial vistos recientemente borrar',
    body: `
<h2>Marcar un favorito</h2>
<ul>
<li>el botón <b>+</b> de la tarjeta (al pasar por encima), o la tecla <kbd>F</kbd> con la tarjeta seleccionada (en la TV, el botón rojo),</li>
<li>el botón + de la ficha; durante la reproducción, el botón + o la tecla <kbd>S</kbd>.</li>
</ul>
<h2>Orden</h2>
<p>En la página <b>Favoritos</b> ordenas las tarjetas arrastrándolas con el ratón. El número de la esquina superior izquierda de una tarjeta es el <b>número de canal</b>; escríbelo durante la reproducción para cambiar a él. ${t('channel-switching', 'Números de canal')}</p>
<h2>Historial</h2>
<p>Los últimos 30 canales vistos aparecen en la primera fila del inicio y al final de la página Favoritos. Para borrar: Favoritos → <b>Borrar historial</b>. Ajustes → Reproducción → <i>Reanudar el último canal al iniciar</i>: al abrir, empieza automáticamente el último canal visto.</p>`,
  },
  {
    id: 'themes',
    cat: 'personal',
    title: 'Estilos de la interfaz',
    keywords: 'tema estilo aspecto zen wabi sabi claro oscuro neón manga cómic consola',
    body: `
<p>El aspecto de la interfaz se elige por perfil: <b>Ajustes → Apariencia → Estilo de la interfaz</b> (menú desplegable, o haz clic en las muestras). El cambio se aplica al instante.</p>
<p>El <b>diseño es el mismo en todos los estilos</b> (barra de menú superior, mismos tamaños de tarjeta, filas y tarjetas en el inicio); el estilo solo da el aspecto: colores, tipografía, bordes, sombras, fondos, animaciones.</p>
<table class="help-table">
<tr><th colspan="2">Estilos oscuros</th></tr>
<tr><td><b>Kurenai</b></td><td>(carmesí) Cine nocturno: fondo negro, detalles rojos, tarjetas que se agrandan al pasar por encima.</td></tr>
<tr><td><b>Mahō</b></td><td>(magia) Un degradado azul profundo de cuento, tarjetas redondeadas con bordes luminosos.</td></tr>
<tr><td><b>Murasaki</b></td><td>(púrpura) Degradados morado-rosa, detalles luminosos.</td></tr>
<tr><td><b>Akane</b></td><td>(rojo intenso) Base negra, marcas rojas, títulos de fila en mayúsculas.</td></tr>
<tr><td><b>Shinkai</b></td><td>(mar profundo) Fondo azul noche, detalles azul mar.</td></tr>
<tr><td><b>Garasu</b></td><td>(cristal) Fondo negro profundo, superficies translúcidas y difuminadas, sombras flotantes.</td></tr>
<tr><td><b>Futago</b></td><td>(gemelos) Menú de consola portátil: base gris oscuro, pareja de mandos rojo-azul, mosaicos cuadrados con borde turquesa que palpita.</td></tr>
<tr><td><b>Neon City</b></td><td>Ciudad de neón nocturna: amarillo neón, cian y magenta, tarjetas con esquinas cortadas, líneas de barrido, «glitch» al seleccionar.</td></tr>
<tr><td><b>Neo-Tokyo</b></td><td>El mundo de AKIRA: silueta de una ciudad en ruinas de noche al pie de la ventana, estelas de luz roja de motos a toda velocidad, logotipo en bloque rojo Kaneda con insignia de cápsula blanca, títulos inclinados, selección con brillo rojo.</td></tr>
<tr><td><b>Kyokkō</b></td><td>(aurora) Fondo de colores que ondula lentamente, tarjetas de cristal esmerilado, selección luminosa. (En la TV el fondo no se mueve.)</td></tr>
<tr><td><b>Phosphor</b></td><td>Monitor de fósforo verde: letra de ancho fijo, títulos de fila tipo <code>$ ls</code>, selección invertida.</td></tr>
<tr><th colspan="2">Estilos claros</th></tr>
<tr><td><b>Zen</b></td><td>Fondo blanco papel de arroz, detalles verde musgo, mucho aire, movimientos tranquilos y lentos, un círculo ensō en el logotipo.</td></tr>
<tr><td><b>Wabi-sabi</b></td><td>Textura de papel cálida en tonos tierra, tarjetas algo irregulares, óxido e índigo, una grieta dorada de kintsugi al pasar por encima.</td></tr>
<tr><td><b>Asobiba</b></td><td>(parque infantil) Fondo a rayas, tarjetas «burbuja» con borde blanco, movimiento elástico, selección turquesa que palpita.</td></tr>
<tr><td><b>Hiroba</b></td><td>(plaza) El menú de consola de «canales»: fondo blanco con rayas finas, mosaicos brillantes con borde gris, selección azul.</td></tr>
<tr><td><b>16-Bit</b></td><td>La consola gris de los años 90: botones morados, puntos A-B-X-Y de colores junto al logotipo, bordes pixelados, títulos con letras cuadradas.</td></tr>
<tr><td><b>Manga</b></td><td>Tinta negra sobre papel blanco: tramas (sombreado de puntos), marcos de viñeta gruesos, imágenes en escala de grises (en color al seleccionarlas), botones de bocadillo.</td></tr>
<tr><td><b>Pow!</b></td><td>Cómic americano: puntos Ben-Day, rojo-amarillo-azul, contornos negros gruesos con sombra desplazada, títulos de fila en cartelas amarillas, estallido «POW!» en las ventanas.</td></tr>
<tr><td><b>Kikagaku</b></td><td>(geometría) Arte de cartel: rojo-azul-amarillo-negro, tarjetas con borde negro grueso y sombras duras, filas numeradas.</td></tr>
<tr><td><b>Rakugaki</b></td><td>(garabato) Página de cuaderno de rayas escrita a mano: los canales son polaroids pegadas y los botones están dibujados a lápiz.</td></tr>
</table>
<p>Los bloques (mosaicos) del inicio también reciben un aspecto acorde con el estilo (borde, sombra, fondo, títulos). El reproductor sigue siendo oscuro en todos los estilos, para que la imagen luzca al máximo.</p>
<p><b>Tema propio</b>: subiendo un archivo de tema o (en el ordenador) copiándolo en la carpeta de temas: Ajustes → Apariencia → <i>Mis temas</i>. ${t('custom-theme', 'Crear un tema propio')}</p>
${go('#/settings', 'Ajustes de apariencia')}`,
  },
  {
    id: 'custom-theme',
    cat: 'personal',
    title: 'Crear un tema propio',
    keywords: 'tema propio crear archivo de tema adastheme json css colores tipografía carpeta subir plantilla',
    body: `
<p>Un tema es un único <b>archivo JSON</b> (<code>.adastheme</code> o <code>.json</code>) que define el <b>aspecto</b> de la interfaz: colores, tipografías, fondo y CSS decorativo. <b>No puede cambiar el diseño</b>: Adás filtra automáticamente el CSS que modifica tamaños, espacios, posiciones o visibilidad, así que un tema nunca descoloca la interfaz. La descripción completa (con un ejemplo) está en el código fuente: <code>docs/TEMA-KESZITES.md</code> (en húngaro).</p>
<h2>Cargar</h2>
<ul>
<li><b>Subir</b> (en cualquier dispositivo): Ajustes → Apariencia → <i>Mis temas</i> → <b>Subir archivo de tema…</b> El tema pasa a los ajustes (la copia de seguridad y la sincronización también lo llevan).</li>
<li><b>Carpeta de temas</b> (escritorio): la subcarpeta <code>themes</code> de la carpeta de datos (<b>Abrir carpeta de temas</b>), o una carpeta propia (<b>Otra carpeta de temas…</b>). Los archivos copiados se leen al iniciar y con el botón <b>Volver a leer la carpeta de temas</b>; es lo más cómodo para editar.</li>
<li><b>Guardar una plantilla del estilo actual</b>: un archivo de tema con los colores del estilo en uso; un buen punto de partida.</li>
</ul>
<h2>Los campos del archivo</h2>
<table class="help-table">
<tr><td><code>adasTheme</code></td><td><b>Obligatorio</b>, su valor es <code>1</code>.</td></tr>
<tr><td><code>id</code></td><td><b>Obligatorio</b>: 2–40 caracteres, minúsculas, números, guion (p. ej. <code>sakura</code>). El mismo <code>id</code> sustituye al anterior.</td></tr>
<tr><td><code>name</code></td><td><b>Obligatorio</b>: el nombre que aparece en el selector de estilo.</td></tr>
<tr><td><code>description</code>, <code>author</code></td><td>Descripción, autor.</td></tr>
<tr><td><code>tone</code></td><td><code>"dark"</code> (predeterminado) o <code>"light"</code>.</td></tr>
<tr><td><code>base</code></td><td>Un estilo integrado en cuyas decoraciones se basa: <code>netflix</code> (Kurenai), <code>disney</code> (Mahō), <code>skyshowtime</code> (Murasaki), <code>rakuten</code> (Akane), <code>prime</code> (Shinkai), <code>apple</code> (Garasu), <code>zen</code>, <code>wabisabi</code>, <code>nintendo</code> (Asobiba), <code>switch</code> (Futago), <code>wii</code> (Hiroba), <code>cyberpunk</code> (Neon City), <code>neotokyo</code>, <code>manga</code>, <code>comic</code> (Pow!), <code>snes</code> (16-Bit), <code>bauhaus</code> (Kikagaku), <code>aurora</code> (Kyokkō), <code>sketch</code> (Rakugaki), <code>terminal</code> (Phosphor). Vacío: base neutra.</td></tr>
<tr><td><code>colors</code></td><td><code>bg</code> (fondo), <code>bg2</code> (tarjetas, paneles), <code>bg3</code>, <code>bg4</code> (otras superficies), <code>line</code> (líneas), <code>text</code>, <code>textStrong</code> (títulos), <code>muted</code> (texto atenuado), <code>accent</code>, <code>accent2</code> (resalte). En el CSS están disponibles como <code>var(--bg)</code>, <code>var(--bg-2)</code>, <code>var(--accent)</code>…</td></tr>
<tr><td><code>fonts</code></td><td><code>body</code> y <code>headings</code>: <code>font-family</code> de CSS; solo tipografías instaladas, siempre con alternativa.</td></tr>
<tr><td><code>radius</code></td><td>Redondeo base, p. ej. <code>"8px"</code>.</td></tr>
<tr><td><code>background</code></td><td>El fondo de la página (color, degradado, patrón).</td></tr>
<tr><td><code>preview</code></td><td>Los tres colores de la muestra del selector: fondo, resalte, tarjeta.</td></tr>
<tr><td><code>css</code></td><td>CSS decorativo. Cada regla se limita al tema; <code>&amp;</code> = el propio tema (el <code>body</code>).</td></tr>
</table>
<h2>¿Qué puede hacer el CSS y qué no?</h2>
<p><b>Permitido</b>: colores, fondos, bordes, <code>border-radius</code>, <code>box-shadow</code>, <code>text-shadow</code>, <code>filter</code>, <code>backdrop-filter</code>, <code>transform</code>, <code>transition</code>, <code>animation</code>, <code>@keyframes</code>, <code>@media</code>, familia / grosor de letra, <code>letter-spacing</code>, <code>text-transform</code>, <code>clip-path</code>, imágenes como <code>url(https://…)</code> o <code>url(data:…)</code>.</p>
<p><b>Filtrado</b> (en elementos normales): <code>width</code>, <code>height</code>, <code>margin</code>, <code>padding</code>, <code>top</code>/<code>left</code>/…, <code>gap</code>, <code>display</code>, <code>flex</code>, <code>grid</code>, <code>font-size</code>, <code>line-height</code>, <code>overflow</code>, <code>visibility</code>, <code>position</code> (salvo <code>relative</code>) y similares. En los pseudoelementos decorativos <code>::before</code> / <code>::after</code> también se pueden usar (ponles <code>pointer-events: none</code>). Siempre prohibido: <code>@import</code>, <code>javascript:</code>.</p>
<h2>Elementos decorables</h2>
<p><code>#nav</code> (barra de menú), <code>.brand</code> (logotipo), <code>.links a.active</code>, <code>.btn</code> / <code>.btn.primary</code>, <code>.row-title</code>, <code>.card</code> / <code>.thumb</code> / <code>.card .name</code> (tarjeta de canal), <code>.tile</code>, <code>.vposter</code> (cartel VOD), <code>.dcard</code> / <code>.dc-title</code> (bloque del inicio), <code>.d-row</code>, <code>.modal</code>, <code>.tab.active</code>, <code>.switch:checked</code>, <code>.input</code>, <code>.now-label</code>, <code>.bar i</code>, <code>.profile .avatar</code>, <code>:focus-visible</code> (selección; lo más importante en la TV). En la TV, con el prefijo <code>&amp;.tv</code> desactiva los efectos que ralentizan (desenfoque, animación infinita).</p>
<h2>Ejemplo completo</h2>
<pre class="code">{
  "adasTheme": 1,
  "id": "sakura",
  "name": "Sakura",
  "description": "Flor de cerezo: rosa claro, sombras suaves.",
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
<div class="tip"><b>Con inteligencia artificial</b>: pégale esta página de ayuda (o <code>docs/TEMA-KESZITES.md</code>) y describe el ambiente del tema que quieres; con los campos de arriba te dará un archivo de tema listo para subir.</div>
<div class="note">Si el archivo tiene errores, un mensaje amarillo bajo la lista <i>Mis temas</i> indica el problema (p. ej. JSON no válido, <code>id</code> incorrecto). Las propiedades CSS filtradas no causan error; simplemente no se aplican.</div>
${go('#/settings', 'Ajustes de apariencia')}`,
  },
  {
    id: 'home-rows',
    cat: 'personal',
    title: 'Orden de las filas de las páginas de TV y VOD',
    keywords: 'orden filas categorías ordenar ocultar página de tv vod género arrastrar',
    body: `
<p>Ajustes → Apariencia → <b>Filas de la página de TV</b>, y Ajustes → VOD y mediateca → Listas VOD → <b>Filas de la página VOD</b>. La lista muestra las filas en el orden en que aparecen. El ajuste se aplica <b>solo al perfil actual</b>. En VOD, las filas son: Continuar, Pendientes, Series, Películas recomendadas, los géneros unificados (con al menos 6 títulos), una fila por lista, Otras películas.</p>
<ul>
<li><b>Mover</b>: agarra la fila por el asa ⋮⋮ y arrástrala a su sitio, o usa los botones ⌃ / ⌄ (también con el mando: quédate en el botón y púlsalo varias veces).</li>
<li><b>Ocultar</b>: el interruptor junto a la fila. Una fila oculta se ve atenuada en la lista, pero no aparece en la página.</li>
<li><b>Orden predeterminado</b>: lo restablece todo.</li>
</ul>
<p>Filas disponibles: Vistos recientemente, Tus favoritos, Ahora en la TV, canales de tu país, Listas propias (cada lista propia y tus canales propios en filas aparte), todas las categorías, Descubre países, y la fila de mosaicos de Categorías, oculta por defecto.</p>
<div class="tip">Una fila de categoría solo aparece si tiene al menos 3 canales; en un perfil infantil solo se ven las categorías aptas para niños.</div>`,
  },
  {
    id: 'settings-overview',
    cat: 'personal',
    title: 'Resumen de los ajustes',
    keywords: 'ajustes opciones preferencias',
    body: `
<p>Los ajustes están organizados en grupos. A la derecha de la cabecera puedes elegir entre dos diseños (la elección se conserva):</p>
<ul>
<li><b>▦ Mosaicos</b>: mosaicos grandes en la página principal (icono + breve descripción); al hacer clic en uno se abre el grupo, y con <i>‹ Todos los ajustes</i> (o Atrás) vuelves. Cómodo en la TV, con el mando.</li>
<li><b>☰ Pestañas</b>: las pestañas de los grupos arriba (con desplazamiento horizontal en el móvil) y el grupo elegido debajo.</li>
</ul>
<p>Arriba de cada grupo, una o dos frases explican qué hay en él. El <b>campo de búsqueda</b> busca en todos los ajustes en ambas vistas (p. ej. <i>subtítulos</i>, <i>tema</i>, <i>sincronización</i>): se muestran las secciones con coincidencias y se resaltan las filas correspondientes.</p>
<table class="help-table">
<tr><td><b>🎨 Apariencia</b></td><td>Idioma y estilo de la interfaz, temas propios, orden de las filas de la página de TV. ${t('themes', 'Estilos')}</td></tr>
<tr><td><b>🏠 Inicio</b></td><td>Mosaicos del inicio, tiempo, fuentes de noticias, vista previa en directo. ${t('dashboard', 'Inicio')}</td></tr>
<tr><td><b>▶️ Reproducción</b></td><td>Fuente de reserva, calidad máxima, volumen, motor de reproducción y puente de reproducción, botones del reproductor. ${t('engines', 'Motores')}</td></tr>
<tr><td><b>💬 Subtítulos e información</b></td><td>Fuentes de subtítulos (Feliratok.eu, OpenSubtitles, SubDL), aspecto de los subtítulos, pista de audio favorita, descripciones y carátulas en español. ${t('subtitles', 'Subtítulos')}</td></tr>
<tr><td><b>⏺ Grabaciones</b></td><td>Carpeta de grabaciones, márgenes antes / después del programa, últimas grabaciones (versión de escritorio). ${t('recording', 'Grabación')}</td></tr>
<tr><td><b>📺 Listas de canales</b></td><td>Listas integradas y propias, canales propios, comprobación de disponibilidad. ${t('lists', 'Listas')}</td></tr>
<tr><td><b>🎬 VOD y mediateca</b></td><td>Listas de películas y series, paquetes adicionales, mediateca propia (NAS), filas de la página VOD. ${t('vod-lists', 'Listas VOD')}</td></tr>
<tr><td><b>🗓️ Guía de TV</b></td><td>Fuentes y actualización de la guía de TV. ${t('epg-sources', 'Guía de TV')}</td></tr>
<tr><td><b>👪 Contenido e infantil</b></td><td>País de origen, contenido oculto y para adultos, qué pueden ver los perfiles infantiles. ${t('kids', 'Detalles')}</td></tr>
<tr><td><b>🔔 Notificaciones</b></td><td>Recordatorios, cambio automático, ejecución en segundo plano. ${t('reminders', 'Detalles')}</td></tr>
<tr><td><b>📱 Mando y teclas</b></td><td>El móvil como mando (con código QR), atajos de teclado, botones del mando de la TV. ${t('remote', 'Mando')}</td></tr>
<tr><td><b>🔄 Sincronización entre dispositivos</b></td><td>Pasar ajustes, perfiles y listas a otro dispositivo con un código.</td></tr>
<tr><td><b>💾 Perfiles y copia de seguridad</b></td><td>Perfiles, copia y restauración, copias automáticas, caché. ${t('backup', 'Detalles')}</td></tr>
<tr><td><b>⬆️ Actualizaciones</b></td><td>Buscar e instalar una versión nueva desde GitHub; la búsqueda al iniciar se puede desactivar. ${t('update', 'Actualizaciones')}</td></tr>
<tr><td><b>ℹ️ Acerca de</b></td><td>Versión, ubicación de la carpeta de datos, fuentes de datos.</td></tr>
</table>
${go('#/settings', 'Abrir Ajustes')}`,
  },
  {
    id: 'backup',
    cat: 'personal',
    title: 'Copia de seguridad, restauración, caché',
    keywords: 'copia de seguridad restaurar exportar importar caché borrar mudanza',
    body: `
<h2>Guardar en archivo</h2>
<p>Ajustes → Perfiles y copia de seguridad → <b>Guardar en archivo</b>: escribe en un archivo <code>.json</code> los ajustes, todos los perfiles con favoritos, historial, recordatorios, estilo y orden, además de tus listas y canales propios. Así puedes llevártelo todo a otro ordenador.</p>
<h2>Restaurar</h2>
<p><b>Restaurar desde archivo</b>: el archivo guardado sobrescribe los ajustes y perfiles actuales (pide confirmación) y luego el programa se reinicia.</p>
<p><b>Añadir perfiles desde archivo</b>: solo importa los perfiles de la copia (con favoritos, historial, recordatorios, imagen de perfil, PIN); los ajustes, listas y demás perfiles actuales se mantienen, y un perfil igual se actualiza. Lo mismo funciona por red con el interruptor <b>Solo perfiles</b> en <i>Sincronización entre dispositivos</i>.</p>
<h2>¿El archivo de perfiles es igual en todas partes?</h2>
<p>Sí: todas las versiones (Windows, Mac, Linux, TV LG, Android, navegador) usan el mismo formato, así que una copia se puede cargar en cualquier dispositivo. Donde no hay selector de archivos (TV), por red (<i>Sincronización entre dispositivos</i>) o desde una dirección web.</p>
<table class="help-table">
<tr><th>Versión</th><th>¿Dónde están los datos?</th></tr>
<tr><td>Windows</td><td><code>%APPDATA%\\Adás\\store.json</code> (tanto la versión instalada como la portátil guardan aquí)</td></tr>
<tr><td>macOS / Linux</td><td><code>~/Library/Application Support/Adás/store.json</code> / <code>~/.config/Adás/store.json</code></td></tr>
<tr><td>Android, Android TV</td><td>En el almacenamiento propio y protegido de la aplicación (no accesible desde fuera; se pierde al desinstalar la aplicación: haz antes una copia)</td></tr>
<tr><td>TV LG</td><td>En el almacenamiento propio de la aplicación (se pierde al desinstalarla)</td></tr>
<tr><td>Navegador</td><td>En el almacenamiento local del navegador, por separado para cada dirección</td></tr>
</table>
<h2>Borrar caché</h2>
<p>Borra las listas descargadas, la guía de TV y el catálogo procesado; en el próximo inicio todo se descarga de nuevo. Útil si algo se ha quedado «atascado». No afecta a tus ajustes ni perfiles.</p>
<div class="note">En la TV no se puede guardar en archivo; allí funciona la <i>Sincronización entre dispositivos</i>. En Android, la copia se guarda con el selector de archivos del sistema (p. ej. en la carpeta Descargas o en Google Drive).</div>`,
  },

  // ===================================================================== Listas de canales
  {
    id: 'lists',
    cat: 'lists',
    title: 'Listas de canales y su actualización',
    keywords: 'lista actualización actualizar lista de canales m3u iptv-org automática descarga canales nuevos',
    body: `
<p>Los canales del programa vienen de las <b>listas integradas</b>, de <b>tus listas de reproducción</b> y de <b>tus canales propios</b> añadidos uno a uno.</p>
<h2>Listas integradas</h2>
<p>Ajustes → Listas de canales → <b>Listas integradas</b>: cada una se activa y desactiva con su propio interruptor. A su lado se ve cuántos canales aportan.</p>
<table class="help-table">
<tr><td><b>iptv-org</b></td><td>La mayor colección comunitaria (unos 10 000 canales), con datos detallados (país, idioma, propietario, web…). Su dirección se puede cambiar con el botón <i>Dirección</i> (p. ej. la lista de un solo país).</td></tr>
<tr><td><b>iptv-org: Animación</b></td><td>Los canales de animación de iptv-org como lista aparte; con iptv-org activado se combinan con ella, y por sí sola es útil si iptv-org está desactivado.</td></tr>
<tr><td><b>Free-TV</b></td><td>Canales gratuitos seleccionados a mano por país.</td></tr>
<tr><td><b>Pluto TV</b>, <b>Samsung TV Plus</b>, <b>Plex</b></td><td>Canales de streaming gratuitos con publicidad de varios países, con su propia guía de TV.</td></tr>
<tr><td><b>FreeCast Hub</b></td><td>Una pequeña selección (noticias, música, deporte).</td></tr>
<tr><td><b>DragonHall TV</b></td><td>Una sola emisión húngara por internet.</td></tr>
</table>
<h2>Sin duplicados</h2>
<p>Si hay varias listas activadas, el mismo canal suele estar en varias. El programa <b>las combina en un solo canal</b>: el canal aparece una vez, y sus emisiones de las distintas listas pasan a ser <b>fuentes de reserva</b> (si una no funciona, el reproductor cambia sola a la siguiente). En la ficha, la línea <i>Listas de canales</i> indica en qué listas está, y en <i>Fuentes de emisión</i> se ve de dónde viene cada fuente.</p>
<p>Así se combinan: primero por el identificador del canal (<code>tvg-id</code>), luego por nombre y país y, por último, si es inequívoco, solo por nombre. Las versiones por país de Pluto TV, Samsung TV Plus y Plex (p. ej. «48 Hours» EE. UU. / Canadá / Reino Unido) se funden en un canal. Los canales con el mismo nombre pero de distinto país que en realidad son diferentes (p. ej. «ABC News» Australia y EE. UU.) quedan separados.</p>
<h2>Actualización</h2>
<ul>
<li><b>Automática</b>: la lista principal cada 6 horas, los datos de los canales a diario; al iniciar, el programa arranca al momento con la lista guardada y, si es antigua, la actualiza en segundo plano.</li>
<li><b>Al momento</b>: menú del perfil (la imagen de perfil de la cabecera) → <b>Actualizar la lista de canales</b>; debajo se ve cuándo fue la última descarga. O bien: Ajustes → Listas de canales → <b>Actualizar todas las listas ahora</b>. Ambos recargan todo sin caché, junto con la guía de TV, y al final indican cuántos canales hay (y cuántos nuevos).</li>
</ul>
<h2>La dirección de la lista iptv-org</h2>
<p>Ajustes → Listas de canales → iptv-org → <b>Dirección</b>: se puede indicar otra dirección M3U (p. ej. solo un país: <code>https://iptv-org.github.io/iptv/countries/es.m3u</code>). Si la dejas vacía, vuelve a la lista completa.</p>
<p>Ver también: ${t('custom-playlists', 'Añadir tu propia lista')} · ${t('custom-channels', 'Añadir tu propio canal')}</p>
${go('#/settings?section=lists', 'Gestionar listas de canales')}`,
  },
  {
    id: 'custom-playlists',
    cat: 'lists',
    title: 'Añadir tu propia lista de reproducción',
    keywords: 'lista propia añadir m3u m3u8 url archivo pegar recomendada proveedor iptv',
    body: `
<p>Puedes añadir cualquier lista M3U / M3U8: por ejemplo la de tu proveedor, una colección comunitaria o una recopilación propia. Ajustes → Listas de canales → Mis listas de reproducción:</p>
<table class="help-table">
<tr><td><b>Añadir lista desde una dirección</b></td><td>Introduce la dirección <code>http(s)://</code> de la lista. El programa la descarga al momento, indica cuántas emisiones contiene y luego pide un nombre (con una sugerencia).</td></tr>
<tr><td><b>Desde archivo</b></td><td>Uno o varios archivos <code>.m3u</code> / <code>.m3u8</code>, o un paquete <b>ZIP</b> (versiones de escritorio y Android). Cada archivo se convierte en una lista independiente que se puede activar y desactivar.</td></tr>
<tr><td><b>Pegar lista como texto</b></td><td>Pega el contenido de la lista, o simplemente direcciones de emisiones, una por línea, con las que el programa crea una lista.</td></tr>
</table>
<h2>Gestión</h2>
<ul>
<li><b>Interruptor</b>: la lista se puede desactivar temporalmente sin borrarla.</li>
<li><b>Renombrar</b>, cambiar la <b>Dirección</b>, <b>Eliminar</b>.</li>
<li>Junto a la fila se ve el número de canales o, si falla la descarga, el mensaje de error.</li>
</ul>
<p>Los canales de tus listas propias aparecen en el inicio en una fila propia con el nombre de la lista (en lugar de <i>Listas propias</i>), y también al explorar y en la búsqueda. Según el campo <code>group-title</code> (o <code>#EXTGRP</code>) de la lista se asignan a categorías —también nombres de grupo en otros idiomas, p. ej. <i>Nachrichten, Deportes, Films, Kids, Música, Documental…</i>— y según <code>tvg-id</code>, a la guía de TV. El país sale de <code>tvg-country</code>, de un grupo con nombre de país (p. ej. «España»), de la terminación de <code>tvg-id</code> (<code>.es</code>) o de un prefijo en el nombre (<code>ES:</code>, <code>|ES|</code>, <code>[ESP]</code>); el idioma, de <code>tvg-language</code>. Así, los canales de tu país también van primero en tus listas. También funcionan las cabeceras al estilo Kodi tras la dirección (<code>…/index.m3u8|User-Agent=…&amp;Referer=…</code>). ${t('m3u-format', 'El formato M3U')}</p>
<div class="warn">Usa solo listas cuyo contenido puedas ver legalmente.</div>`,
  },
  {
    id: 'custom-channels',
    cat: 'lists',
    title: 'Añadir tu propio canal',
    keywords: 'canal añadir propio emisión url personalizada probar user-agent referer cabecera',
    body: `
<p>También puedes añadir una sola emisión, sin lista: menú del perfil → <b>Añadir canal</b>, o Ajustes → Listas de canales → <b>Añadir canal</b>.</p>
<h2>Campos</h2>
<table class="help-table">
<tr><td><b>Nombre</b> *</td><td>Como aparecerá en la interfaz.</td></tr>
<tr><td><b>Dirección de la emisión</b> *</td><td>La dirección <b>directa</b> de la emisión: HLS (<code>.m3u8</code>), MPEG-TS (<code>.ts</code>), FLV, DASH (<code>.mpd</code>) o MP4. La dirección de una página web (donde está el reproductor) no funciona.</td></tr>
<tr><td><b>Dirección del logotipo</b></td><td>La dirección de una imagen (PNG, JPG, SVG). Si está vacía, aparecen las iniciales del nombre.</td></tr>
<tr><td><b>Categoría</b>, <b>País</b></td><td>Según estos, va a las filas y filtros correspondientes.</td></tr>
<tr><td><b>Avanzado: User-Agent, Referer</b></td><td>Algunos servidores solo dan imagen con un identificador de navegador o una página de referencia concretos. Si ves algo así en la fuente (p. ej. <code>#EXTVLCOPT:http-referrer=…</code>), introdúcelo aquí.</td></tr>
</table>
<p>El botón <b>Probar</b> inicia la emisión sin guardarla, para comprobar antes si funciona. Tras <b>Guardar</b>, el canal aparece en la fila <i>Mis canales</i> del inicio, al explorar y en la búsqueda; se puede marcar como favorito y recibir un número de canal.</p>
<p>Editar, reproducir, eliminar: Ajustes → Listas de canales → Mis canales.</p>
<div class="note">En la TV, el reproductor integrado no siempre respeta las cabeceras User-Agent / Referer.</div>
${go('#/settings?section=lists', 'Gestionar mis canales')}`,
  },
  {
    id: 'm3u-format',
    cat: 'lists',
    title: 'El formato de lista M3U',
    keywords: 'm3u formato extinf tvg-id tvg-logo group-title extvlcopt estructura ejemplo',
    body: `
<p>M3U es un archivo de texto sencillo: cada emisión se describe con una línea <code>#EXTINF</code> seguida de la línea con la dirección.</p>
<pre class="code">#EXTM3U x-tvg-url="https://ejemplo.es/guia.xml.gz"
#EXTINF:-1 tvg-id="La1.es" tvg-logo="https://…/la1.png" group-title="News",La 1 (1080p)
https://…/la1/index.m3u8
#EXTINF:-1 tvg-logo="https://…/logo.png" group-title="Sports",Mi canal de deportes [Geo-blocked]
#EXTVLCOPT:http-referrer=https://ejemplo.es/
#EXTVLCOPT:http-user-agent=Mozilla/5.0 …
https://…/deporte/playlist.m3u8</pre>
<table class="help-table">
<tr><td><code>x-tvg-url</code></td><td>(cabecera) la guía de TV propia de la lista; el programa también la carga.</td></tr>
<tr><td><code>tvg-id</code></td><td>El identificador del canal; por él se emparejan los datos del canal y la guía de TV.</td></tr>
<tr><td><code>tvg-logo</code></td><td>La dirección del logotipo.</td></tr>
<tr><td><code>group-title</code></td><td>Categoría (News, Sports, Movies, Kids, Music…; varias separadas por punto y coma).</td></tr>
<tr><td>El texto tras la coma</td><td>El nombre del canal; <code>(1080p)</code> se interpreta como calidad, y <code>[Geo-blocked]</code> y <code>[Not 24/7]</code> como marcas.</td></tr>
<tr><td><code>#EXTVLCOPT</code>, <code>http-referrer</code>, <code>http-user-agent</code></td><td>Cabeceras HTTP necesarias para la emisión.</td></tr>
</table>
<p>Las líneas con el mismo <code>tvg-id</code> aparecen como varias fuentes de un mismo canal.</p>`,
  },
  {
    id: 'health',
    cat: 'lists',
    title: 'Comprobación de disponibilidad',
    keywords: 'comprobación funciona punto disponible enlace caído no disponible ocultar completa',
    body: `
<p>Parte de las emisiones de las listas gratuitas deja de funcionar a ratos o para siempre. Por eso Adás comprueba cuáles funcionan:</p>
<ul>
<li><b>Automáticamente</b>: prueba en segundo plano las fuentes de los canales que aparecen en pantalla (como mucho cuatro por canal), y de nuevo cada 12 horas. Se puede desactivar: Ajustes → Listas de canales → Comprobación de disponibilidad.</li>
<li><b>Tal como lo ve el reproductor</b>: no basta con que el servidor responda; el programa descarga también, a través de la lista, el comienzo de un segmento de vídeo real. Así las emisiones con restricción geográfica, caducadas o vacías en ese momento (sin emitir) también reciben la marca <b>Sin conexión</b> / <b>Fuera de emisión</b>.</li>
<li><b>Al reproducir</b>: lo que arranca se marca como que funciona, y lo que no, como averiado. La comprobación en segundo plano no puede convertir una reproducción fallida en «funciona» durante 12 horas.</li>
<li><b>Cambio rápido</b>: si una fuente no responde en 6 segundos, el reproductor pasa a la siguiente; con varias fuentes prueba las demás en paralelo y, a los 3 segundos, cambia a una que seguro funciona.</li>
<li><b>Comprobación completa</b>: Ajustes → Listas de canales → Comprobación de disponibilidad → <b>Comprobar todas las emisiones</b>; prueba todas las fuentes (más de diez mil) en unos minutos, con indicador de progreso, y se puede detener.</li>
<li><b>En la ficha</b>: <i>Comprobar fuentes</i>, todas las fuentes de ese canal al momento.</li>
</ul>
<p>Con <b>Ocultar canales no disponibles</b> (Ajustes → Contenido e infantil → Contenido) activado, los canales averiados desaparecen de las listas. <b>Borrar resultados</b> devuelve todo a «sin comprobar».</p>
<div class="note">Rara vez, una emisión «que funciona» no arranca (p. ej. el ordenador no puede decodificar el formato de vídeo); se marca tras la primera reproducción fallida. Una emisión «averiada» puede volver a estar disponible más tarde. En el navegador la comprobación no está disponible.</div>`,
  },

  // ===================================================================== TV
  {
    id: 'android',
    cat: 'tv',
    title: 'Android: móvil, tableta, Android TV',
    keywords: 'android móvil teléfono tableta android tv google tv shield box apk instalación',
    body: `
<p>La versión para Android es un único archivo <code>.apk</code> (<code>dist-android/Adas-…apk</code>) que funciona en móviles, tabletas y <b>Android TV / Google TV</b> (Android 6.0 o posterior). En una TV se abre la interfaz de TV para mando.</p>
<h2>Instalación</h2>
<ul>
<li><b>En móvil / tableta</b>: copia el APK y ábrelo. La primera vez hay que permitir que el gestor de archivos (o el navegador) instale aplicaciones («orígenes desconocidos»).</li>
<li><b>En Android TV</b>: lo más fácil es la aplicación <i>Send files to TV</i> (lo envías desde el móvil), o un USB + gestor de archivos. En la TV también hay que permitir la instalación de orígenes desconocidos (Ajustes → Sistema / Seguridad).</li>
</ul>
<h2>Uso</h2>
<ul>
<li>En el móvil, abajo hay una barra de menú con iconos; al reproducir, la imagen va a pantalla completa y, al girarlo, se puede ver en horizontal. El primer toque muestra los controles.</li>
<li>En la TV: <b>OK</b> = reproducir, <b>OK mantenido</b> sobre un canal = ficha (favorito, recordatorio, fuentes), <b>Atrás</b> = atrás (en el inicio, salir). Si el mando tiene botones de colores, CH+/CH− o ◀◀ / ▶▶, funcionan igual que en la versión de LG.</li>
</ul>
<h2>Reproducción en segundo plano</h2>
<ul>
<li><b>Reproducción en segundo plano (solo audio)</b>: Ajustes → Reproducción → <i>Reproducción en segundo plano</i>. Activada, el audio de la emisión sigue sonando al cambiar a otra aplicación; una notificación lo indica, y desde ella puedes volver o detenerlo. Desactivada (por defecto), la reproducción se detiene al salir.</li>
</ul>
<div class="note">En Android no hay envío a la TV, audio nocturno ni comprobación de actualizaciones. Los ajustes se pueden sincronizar con un código con el ordenador y otros dispositivos Android, en ambos sentidos (${t('transfer', 'Sincronización entre dispositivos')}), y el móvil se puede usar como mando (${t('remote', 'Mando desde el móvil')}). Las versiones nuevas se obtienen instalando el APK nuevo; los ajustes se conservan.</div>`,
  },
  {
    id: 'tv-install',
    cat: 'tv',
    title: 'Instalación en una TV LG webOS',
    keywords: 'lg webos tv instalación ipk modo desarrollador developer mode ares',
    body: `
<p>La versión para TV es un paquete <code>.ipk</code> (<code>dist-webos/hu.adas.tv_…_all.ipk</code>) que funciona en las TV LG fabricadas desde 2018 (webOS 4.0 o posterior). Como no está en la tienda, se instala en <b>modo desarrollador</b>:</p>
<ol>
<li>Registra una cuenta gratuita en <b>developer.lge.com</b>.</li>
<li>En la TV: LG Content Store → instala la aplicación <b>Developer Mode</b>, inicia sesión, activa <i>Dev Mode Status</i> y <i>Key Server</i> y reinicia la TV. La aplicación muestra la dirección IP y la contraseña de la TV.</li>
<li>En el ordenador (hace falta Node.js), en la carpeta del proyecto:
<pre class="code">npx ares-setup-device        (añade la TV: nombre «tv», dirección IP, puerto 9922)
npx ares-novacom --device tv --getkey   (la contraseña la muestra la aplicación Developer Mode)
npm run webos:install -- --device tv
npm run webos:launch -- --device tv</pre></li>
</ol>
<p>Opción gráfica: el programa de escritorio <b>webOS Dev Manager</b> → <i>Install from file</i> → el archivo <code>.ipk</code>.</p>
<div class="warn">El modo desarrollador caduca cada 50 horas; se amplía con una pulsación en la aplicación Developer Mode. Al caducar, la aplicación instalada desaparece y hay que reinstalarla.</div>`,
  },
  {
    id: 'tv-remote',
    cat: 'tv',
    title: 'Botones del mando',
    keywords: 'mando botones de colores rojo verde amarillo azul atrás ok magic remote',
    body: `
<table class="help-table keys">
<tr><td>Flechas, <b>OK</b></td><td>Mover, seleccionar, reproducir</td></tr>
<tr><td><b>Atrás</b></td><td>Atrás / cerrar; en el inicio pregunta si quieres salir</td></tr>
<tr><td><span class="key red">●</span> Rojo</td><td>Favorito sí/no del canal seleccionado (al reproducir, el que estás viendo)</td></tr>
<tr><td><span class="key green">●</span> Verde</td><td>Sobre un canal seleccionado: ficha; en otro sitio: guía de TV (al reproducir: ficha)</td></tr>
<tr><td><span class="key yellow">●</span> Amarillo</td><td>Buscar (al reproducir: calidad y fuente)</td></tr>
<tr><td><span class="key blue">●</span> Azul</td><td>Favoritos (al reproducir: panel de lista de canales)</td></tr>
<tr><td><b>CH+ / CH−</b>, ↑ / ↓</td><td>Cambiar de canal durante la reproducción</td></tr>
<tr><td><b>0–9</b></td><td>Número de canal</td></tr>
<tr><td>▶ ❚❚ ■</td><td>Continuar / pausa / detener la reproducción</td></tr>
</table>
<p>Con el puntero del <b>Magic Remote</b> también se puede manejar todo como con un ratón.</p>`,
  },
  {
    id: 'tv-limits',
    cat: 'tv',
    title: '¿En qué se diferencia la versión de TV?',
    keywords: 'tv diferencia limitación webos cors servicio',
    body: `
<ul>
<li><b>Reproducción</b>: por defecto, el reproductor integrado de la TV reproduce las emisiones HLS; si no puede, vuelve a intentarlo con hls.js.</li>
<li><b>Descargas</b>: el motor del navegador de la TV no permite descargas directas de otros servidores (por las restricciones CORS), así que un pequeño <b>servicio en segundo plano</b> del paquete descarga la guía de TV y las listas que no lo permiten, y también comprueba las emisiones.</li>
<li><b>No disponible</b>: minirreproductor, botón de pantalla completa (ya es pantalla completa), guardar en / cargar desde archivo, abrir páginas web externas, vista previa en directo en el inicio.</li>
<li>Las emisiones que necesitan una cabecera User-Agent / Referer propia no siempre arrancan con el reproductor integrado.</li>
<li>El primer inicio puede ser más lento (el procesador de la TV es más débil); después la lista procesada se guarda.</li>
</ul>`,
  },

  // ===================================================================== Solución de problemas
  {
    id: 'trouble-playback',
    cat: 'trouble',
    title: 'La emisión no arranca',
    keywords: 'no arranca no funciona error pantalla negra no disponible tiempo agotado geo',
    body: `
<p>En las listas comunitarias gratuitas es habitual que una emisión no esté disponible en ese momento. Prueba por orden:</p>
<ol>
<li>El botón <b>Reintentar</b>: a veces el servidor solo iba lento.</li>
<li>Otra <b>fuente</b>: al reproducir, ⚙ → Fuente, u otro ▶ en la ficha. ${t('quality', 'Detalles')}</li>
<li>Otro <b>motor de reproducción</b>: Ajustes → Reproducción → Motor de reproducción (Integrado ↔ hls.js). ${t('engines', 'Detalles')}</li>
<li><b>Restricción geográfica</b> (🌐): algunas emisiones solo se pueden ver desde ciertos países. ${t('geo', 'Detalles')}</li>
<li>Marca <b>«No 24/7»</b>: el canal solo emite a ciertas horas.</li>
<li>Actualiza la lista de canales (menú del perfil → Actualizar la lista de canales); puede que iptv-org haya encontrado una dirección nueva.</li>
<li>Activa <b>Ocultar canales no disponibles</b> para que los canales caídos no molesten.</li>
</ol>
<p>Si una emisión no funciona durante mucho tiempo, es un fallo de la fuente; el canal se puede notificar en la página de GitHub de iptv-org.</p>`,
  },
  {
    id: 'geo',
    cat: 'trouble',
    title: 'Restricción geográfica (🌐)',
    keywords: 'restricción geográfica geo-bloqueo geo-blocked país vpn 403 451 no se puede ver',
    body: `
<p>Muchos canales solo se pueden ver desde su propio país, por los derechos. Adás lo indica de dos formas:</p>
<table class="help-table">
<tr><td><b>🌐 BLOQUEO GEOGRÁFICO</b> (etiqueta naranja en la tarjeta, «Restricción geográfica: no se puede ver desde aquí»)</td><td>Seguro: la emisora <b>rechazó</b> la solicitud desde aquí (HTTP 403 o 451). Lo detectó la comprobación de disponibilidad en segundo plano o un intento de reproducción.</td></tr>
<tr><td><b>🌐</b> (marca pequeña en la esquina de la tarjeta, «Puede tener restricción geográfica»)</td><td>Según la lista, todas las fuentes del canal están restringidas, pero aún no se ha probado desde aquí. Muchas de estas emisiones funcionan igualmente; en cuanto una arranca, la marca desaparece.</td></tr>
</table>
<p>Si inicias una emisión restringida, el reproductor lo indica expresamente (no solo «no disponible»). Puede funcionar desde otro país o con una VPN de allí.</p>
<p><b>Filtrar:</b> en la página Explorar, con el selector <i>Restricción geográfica</i> puedes ocultar los canales restringidos o mostrar solo esos.</p>
<div class="note">A veces la respuesta 403 no se debe al país sino a otra cosa (p. ej. un acceso caducado); también entonces aparece «restricción geográfica», porque desde fuera no se pueden distinguir.</div>
${go('#/browse?geo=hide', 'Canales sin restricción geográfica')}`,
  },
  {
    id: 'stream-info',
    cat: 'watch',
    title: 'Datos de la emisión (calidad, velocidad)',
    keywords: 'datos de la emisión estadísticas tasa de bits velocidad ancho de banda resolución calidad búfer retraso fotogramas perdidos códec red tecla d',
    body: `
<p>Durante la reproducción, la opción <b>⚙ Calidad y fuente → 📊 Datos de la emisión</b> (o la tecla <kbd>D</kbd>) abre un panel transparente que se actualiza cada segundo:</p>
<table class="help-table">
<tr><td><b>Reproductor</b>, <b>Servidor</b></td><td>Qué motor de reproducción está reproduciendo (hls.js, integrado, puente de reproducción…) y de qué servidor llega la emisión (🔒: conexión cifrada).</td></tr>
<tr><td><b>Resolución</b>, <b>Códecs</b>, <b>Tasa de bits</b></td><td>El tamaño de la imagen (SD / HD / Full HD / 4K) y su frecuencia de fotogramas; la cantidad de datos por segundo de la emisión. Si la lista no la indica, se mide a partir de los segmentos descargados («medida»).</td></tr>
<tr><td><b>Velocidad de descarga medida</b></td><td>La velocidad a la que el servidor envía realmente, y cuántas veces la tasa de bits supone. Por debajo de 1,3× (naranja), la conexión o el servidor apenas dan abasto: de ahí vienen los cortes.</td></tr>
<tr><td><b>Búfer</b>, <b>Retraso respecto al directo</b></td><td>Cuántos segundos de emisión hay ya descargados por delante (naranja por debajo de 3 s) y cuánto va por detrás del directo.</td></tr>
<tr><td><b>Fotogramas perdidos</b></td><td>Si son muchos (más del 5 %), el dispositivo no da abasto con la decodificación; una calidad menor ayuda.</td></tr>
<tr><td><b>Cortes</b></td><td>Cuántas veces y durante cuánto tiempo se ha detenido la imagen desde que se abrió el panel.</td></tr>
<tr><td><b>Red</b></td><td>La estimación del sistema sobre la conexión (tipo, velocidad, tiempo de respuesta), cuando la facilita.</td></tr>
</table>
<p>Si algo parece sospechoso, una línea ⚠ al pie del panel también da un consejo (p. ej. bajar la calidad u otra fuente).</p>`,
  },
  {
    id: 'trouble-buffering',
    cat: 'trouble',
    title: 'La imagen se corta o se queda cargando',
    keywords: 'cortes búfer lento tirones carga calidad internet',
    body: `
<p>El panel <b>Datos de la emisión</b> muestra cuál es el problema (<kbd>D</kbd> durante la reproducción): si la velocidad de descarga medida apenas supera la tasa de bits, el servidor o la conexión son lentos. ${t('stream-info', 'Detalles')}</p>
<ul>
<li>Elige una <b>calidad menor</b> (⚙ → Calidad), sobre todo con datos móviles o una wifi débil.</li>
<li>Prueba <b>otra fuente</b>: otro servidor puede ser más rápido.</li>
<li>Si la emisión se detiene, el programa pasa sola a la siguiente fuente (si la fuente de reserva está activada): a los <b>10 segundos</b> si queda una fuente sin probar; si no, espera 30 segundos por si la emisión sigue sola.</li>
<li>Los servidores de países lejanos pueden ser más lentos; no es un fallo del programa.</li>
<li>La comprobación automática de disponibilidad en segundo plano se pausa sola durante la reproducción. En cambio, <i>Comprobar todas las emisiones</i> iniciada a mano sigue en marcha: conviene detenerla mientras ves algo.</li>
</ul>
<p>El reproductor inicia las emisiones en directo unos 4 segmentos (normalmente 20–30 s) por detrás del directo: así hay margen si el servidor se ralentiza un momento, ya que muchos servidores envían despacio el segmento más reciente, todavía en preparación.</p>`,
  },
  {
    id: 'trouble-epg',
    cat: 'trouble',
    title: 'No hay datos de programación para un canal',
    keywords: 'sin programa guía de tv vacía epg falta emparejamiento',
    body: `
<p>Las fuentes públicas de guía de TV solo cubren parte de los canales, sobre todo los de los países con fuente integrada y los grandes canales internacionales. Qué puedes hacer:</p>
<ul>
<li>Activa la fuente del país del canal: Ajustes → Guía de TV (p. ej. España, Reino Unido, Pluto TV). ${t('epg-sources', 'Fuentes')}</li>
<li>Añade una fuente XMLTV propia, si conoces alguna que incluya el canal.</li>
<li>Mira en la fila de la fuente cuántos canales ha emparejado y si muestra algún error.</li>
<li>Actualiza la guía de TV (<i>Actualizar la guía de TV ahora</i>).</li>
</ul>
<p>El emparejamiento se hace por el identificador y el nombre del canal; si una fuente registra el canal con un nombre muy distinto, no puede relacionarlos.</p>`,
  },
  {
    id: 'trouble-list',
    cat: 'trouble',
    title: 'La lista de canales no carga / inicio lento',
    keywords: 'no carga carga error inicio lento internet reintentar descarga',
    body: `
<ul>
<li>Comprueba la conexión a internet y pulsa <b>Reintentar</b>.</li>
<li>Si la descarga falla, el programa usa la lista descargada antes (más antigua), si existe.</li>
<li>El primer inicio puede tardar 20–40 segundos; los siguientes son rápidos gracias a la lista guardada.</li>
<li>Si cambiaste la lista principal y no funciona: Ajustes → Listas de canales → <i>Predeterminado (iptv-org)</i>.</li>
<li>Si algo se queda en un estado extraño, «atascado»: Ajustes → Perfiles y copia de seguridad → <b>Borrar caché</b>, y reinicia el programa.</li>
</ul>`,
  },
  {
    id: 'trouble-browser',
    cat: 'trouble',
    title: 'No funciona al abrirlo en un navegador',
    keywords: 'navegador chrome firefox cors index.html web',
    body: `
<p>La interfaz de Adás (<code>src/index.html</code>) también se puede abrir en un navegador normal, pero ahí, por las normas de seguridad del navegador (CORS), no se pueden cargar la mayoría de las emisiones ni la guía de TV, y la comprobación de disponibilidad tampoco funciona. Este modo solo sirve para el desarrollo.</p>
<p>Para todas las funciones usa la <b>aplicación de escritorio</b> (Windows <code>.exe</code>, macOS <code>.dmg</code>, Linux <code>AppImage</code> / <code>.deb</code>) o la <b>versión de TV</b>.</p>`,
  },
  {
    id: 'faq',
    cat: 'trouble',
    title: 'Preguntas frecuentes',
    keywords: 'faq pregunta legal gratis de pago por qué duplicado desaparecido canal',
    body: `
<h3>¿Es gratis? ¿Hace falta suscripción?</h3>
<p>Sí, es gratis. El programa reúne emisiones disponibles de forma pública y gratuita; no hace falta cuenta ni suscripción.</p>
<h3>¿Es legal?</h3>
<p>iptv-org solo recopila emisiones públicas y gratuitas, y retira canales ante reclamaciones de derechos de autor. Al añadir tu propia lista, te corresponde asegurarte de que puedes ver legalmente su contenido.</p>
<h3>¿Por qué ha desaparecido un canal?</h3>
<p>Puede que lo hayan quitado de la lista comunitaria (cerró, cambió de dirección o por motivos legales). Si conoces su dirección, puedes añadirlo como canal propio. ${t('custom-channels', '¿Cómo?')}</p>
<h3>¿Por qué aparece un canal dos veces?</h3>
<p>Si una de tus listas contiene el mismo canal que la lista principal, aparecen los dos (el nombre de tu lista se ve en la ficha).</p>
<h3>¿Por qué un canal no tiene número?</h3>
<p>Reciben número de canal los favoritos y los canales del país de origen. Márcalo como favorito y colócalo donde quieras en la página Favoritos.</p>
<h3>¿Puedo grabar programas?</h3>
<p>Sí, en la versión de escritorio. ${t('recording', 'Grabación')}</p>
<h3>¿Dónde están mis datos?</h3>
<p>${t('privacy', 'Datos y privacidad')}</p>`,
  },

  // ===================================================================== Extras
  {
    id: 'timeshift',
    cat: 'watch',
    title: 'Pausar y rebobinar la TV en directo',
    keywords: 'diferido timeshift pausa rebobinar directo búfer ir al directo dvr',
    body: `
<p>En las emisiones en directo, el reproductor <b>conserva lo ya descargado</b> (hasta unos 30 minutos, según la memoria), así que:</p>
<ul>
<li><b>Pausa</b>: la emisión sigue descargándose y, al continuar, la ves desde donde la pausaste.</li>
<li><b>Rebobinar</b>: con los botones <b>30</b> de la barra de control, con <kbd>Mayús</kbd>+<kbd>←</kbd>/<kbd>→</kbd>, con los botones ◀◀ / ▶▶ del mando en saltos de 30 segundos, o arrastrando en la <b>línea de tiempo</b>.</li>
<li><b>Ir al directo</b>: si vas con retraso, a la izquierda de la línea de tiempo aparecen el botón <i>Ir al directo</i> y el retraso (p. ej. −2:15); la marca <b>EN DIRECTO</b> de arriba a la derecha se ve gris. Con teclado: <kbd>Fin</kbd>.</li>
</ul>
<p>Solo se puede rebobinar hasta donde el reproductor ya ha descargado: al cambiar a un canal el búfer está vacío y crece minuto a minuto.</p>
<div class="note">El reproductor integrado de una TV (webOS) decide por sí mismo cuánto guarda; ahí el rebobinado puede ser más corto o no existir, según la emisora.</div>`,
  },
  {
    id: 'sportwatch',
    cat: 'watch',
    title: 'Seguimiento deportivo',
    keywords: 'deporte seguimiento deportivo liga equipo partido resultado fútbol tenis balonmano waterpolo fórmula 1 disc golf world chase tag ajedrez dardos esports calendario ics thesportsdb espn canal',
    body: `
<p>El Seguimiento deportivo sirve para seguir cualquier deporte, liga, equipo o competición; el bloque <b>Deportes</b> del inicio muestra sus eventos en directo, recientes y próximos. Para abrirlo: <i>Seguimiento deportivo ›</i> en la cabecera del bloque Deportes, o Ajustes → Inicio → <i>Abrir seguimiento deportivo</i>.</p>
<p>Las pestañas de la ventana:</p>
<table class="help-table">
<tr><td><b>Seguidos</b></td><td>Todo lo que sigues, agrupado por deporte. Cada elemento se puede activar/desactivar o eliminar.</td></tr>
<tr><td><b>Ligas</b></td><td>Más de 350 ligas y torneos de 17 deportes (fútbol, baloncesto, hockey sobre hielo, tenis, golf, Fórmula 1, MMA, rugby, críquet, voleibol…), con buscador y filtro por deporte. Puedes seguir la liga entera o, con el botón <i>Equipo…</i>, solo los partidos de un equipo. Fuente: ESPN (sin clave, con resultados).</td></tr>
<tr><td><b>Deportes en la TV</b></td><td><b>Cualquier</b> deporte o juego según la guía de TV: balonmano, waterpolo, disc golf, World Chase Tag, ajedrez, dardos, snooker, esports, hípica… Un clic en el mosaico del deporte, o una palabra clave propia (p. ej. <i>Real Betis</i>, <i>Vuelta</i>, <i>Wimbledon</i>). Buscan en la programación de los canales visibles, así que siempre dan una emisión que se puede ver.</td></tr>
<tr><td><b>Calendario</b></td><td>Cualquier calendario de competiciones o de partidos (dirección .ics / webcal) que publique una federación, un club o una web; p. ej. torneos de disc golf, ligas locales.</td></tr>
<tr><td><b>Ajustes</b></td><td>Cuántos días atrás y adelante mostrar eventos; sugerencia de canal sí/no; clave opcional de TheSportsDB (más ligas).</td></tr>
</table>
<h2>Sugerencia de canal</h2>
<p>Para cada evento, el programa busca en la guía de TV en qué canal se emite (según los nombres de los equipos, la liga y el deporte, ajustado a la hora), y en la fila aparece un botón <b>📺 canal</b>; al pulsarlo empieza la emisión. Las coincidencias dudosas se ven más tenues. Solo se tienen en cuenta canales no ocultos con guía de TV; los favoritos y los canales deportivos tienen preferencia.</p>
<div class="note">Los resultados se actualizan cada 5 minutos aproximadamente. Si una liga no se puede cargar, se indica al pie del bloque Deportes.</div>`,
  },
  {
    id: 'multiview',
    cat: 'watch',
    title: 'Varias emisiones a la vez',
    keywords: 'varias emisiones vista múltiple pantalla dividida 2 4 ventanas deporte noticias a la vez',
    body: `
<p>Puedes ver dos o cuatro canales a la vez, por ejemplo varias retransmisiones deportivas o informativos. Para abrirlo: el botón <b>▦</b> del reproductor (o <kbd>V</kbd>), o la opción <i>Varias emisiones a la vez</i> del menú del perfil.</p>
<ul>
<li>La ventana <b>seleccionada</b> (con marco de color) tiene sonido; las demás van silenciadas. Para cambiar: flechas, <kbd>1</kbd>–<kbd>4</kbd> o clic.</li>
<li><kbd>OK</kbd> / ⇄: otro canal en la ventana (con buscador), ✕: vaciar la ventana.</li>
<li><kbd>F</kbd>, doble clic o ⤢: el canal seleccionado a pantalla completa; desde ahí, arriba/abajo cambia entre los canales de la vista múltiple.</li>
<li>Los canales iniciales: desde el que la abriste y luego tus favoritos.</li>
</ul>
<div class="note">Cuatro emisiones a la vez requieren bastante ancho de banda y procesador. En la TV hay como máximo dos ventanas.</div>`,
  },
  {
    id: 'cast',
    cat: 'watch',
    title: 'Enviar a la TV (Chromecast, DLNA)',
    keywords: 'enviar cast chromecast dlna upnp tv smart tv google tv reproducir en otro dispositivo',
    body: `
<p>Desde la versión de escritorio puedes enviar la emisión o la película a un <b>Chromecast</b>, Google TV, o a una smart TV o reproductor multimedia <b>compatible con DLNA</b>. Haz clic en el icono de enviar de la barra de control del reproductor y el programa buscará dispositivos en la red local.</p>
<ul>
<li>Mientras envías, los controles siguen en el ordenador: pausa / continuar, cambio de canal (arriba/abajo), volumen, detener. Una película sigue en la TV donde iba aquí.</li>
<li>Tras <b>Dejar de enviar</b>, la reproducción continúa en el ordenador.</li>
<li>Este ordenador retransmite la emisión a la TV (así funcionan también las que necesitan cabeceras especiales o CORS); por eso debe seguir encendido durante el envío y en la misma red.</li>
</ul>
<h2>Si no encuentra ningún dispositivo</h2>
<ul>
<li>La primera vez, el <b>Firewall de Windows</b> pide permiso: permítelo en la <i>red privada</i>.</li>
<li>El ordenador y la TV deben estar en la misma wifi / router (las redes de invitados suelen estar aisladas).</li>
<li>Para DLNA, en la TV tiene que estar activado el uso compartido de medios / «renderizador DLNA» (LG: <i>Ajustes → General → Dispositivos → Compartir pantalla / DLNA</i>).</li>
</ul>
<div class="note">No todos los dispositivos reproducen todos los formatos: Chromecast maneja bien HLS y MP4, pero muchas TV DLNA solo MP4 o MPEG-TS. Si el dispositivo da error, prueba otra fuente (⚙ → Fuente).</div>`,
  },
  {
    id: 'night-audio',
    cat: 'watch',
    title: 'Audio nocturno',
    keywords: 'audio nocturno bajo compresor diálogo voz inteligibilidad anuncios altos dinámica',
    body: `
<p>El <b>audio nocturno</b> suaviza las partes fuertes (música, explosiones, anuncios) y realza los diálogos bajos, para que se entienda a poco volumen y no se despierte nadie.</p>
<ul>
<li>Para activarlo durante la reproducción: botón <b>CC</b> → <i>Audio y subtítulos</i> → <i>Audio nocturno</i>.</li>
<li>Puedes hacerlo predeterminado por perfil: Ajustes → Subtítulos e información → Información y subtítulos en español → <i>Audio nocturno</i>.</li>
</ul>
<div class="note">Disponible en la versión de escritorio.</div>`,
  },
  {
    id: 'parental',
    cat: 'personal',
    title: 'Control parental y bloqueo de perfil (PIN)',
    keywords: 'pin bloqueo de perfil control parental niños bloqueo contraseña código perfil infantil salir',
    body: `
<p>Puedes poner un <b>PIN de 4 dígitos</b> a cualquier perfil: Gestionar perfiles → editar el perfil → <i>Bloqueo de perfil (PIN)</i>. Un perfil bloqueado muestra 🔒 en la pantalla «¿Quién está viendo?» y solo se abre con el PIN.</p>
<h2>Perfil infantil</h2>
<p>Si al menos un <b>perfil adulto tiene PIN</b>, desde el perfil infantil:</p>
<ul>
<li>solo se puede cambiar a otro perfil con el PIN,</li>
<li><b>Ajustes</b> y <b>Gestionar perfiles</b> solo se abren con el PIN de un adulto (la aprobación dura 10 minutos),</li>
<li>el contenido para adultos y los canales no aptos para niños siguen sin aparecer.</li>
</ul>
<p>El PIN se puede escribir con los botones numéricos del mando o con el teclado numérico en pantalla. Tras cinco intentos fallidos hay que esperar medio minuto.</p>
<h2>PIN olvidado</h2>
<p>El PIN de cualquier perfil se puede borrar desde otro perfil adulto (Gestionar perfiles). Si no hay ninguno, al borrar los datos de la aplicación todo vuelve al estado inicial. ${t('privacy', '¿Dónde están los datos?')}</p>
<div class="note">El PIN protege frente a los niños en este dispositivo; no es cifrado.</div>`,
  },
  {
    id: 'continue',
    cat: 'vod',
    title: 'Continuar (VOD)',
    keywords: 'continuar película a medias episodio serie inicio fila seguir viendo',
    body: `
<p>La fila <b>Continuar</b> de la página VOD reúne en un sitio las películas y episodios que dejaste a medias, tanto de las listas de películas y series integradas y propias como de tu mediateca propia. (En el inicio de TV no hay una fila así: allí solo hay canales.) Lo último que viste va primero.</p>
<p>En una serie, la tarjeta te lleva al episodio por el que vas (o al siguiente, si terminaste el anterior). </p>`,
  },
  {
    id: 'stats',
    cat: 'personal',
    title: 'Estadísticas de visualización',
    keywords: 'estadísticas tiempo de visionado cuánta tele canal favorito gráfico hora día',
    body: `
<p>La opción <i>Estadísticas de visualización</i> del menú del perfil muestra cuánto y cuándo ves la tele: hoy, la última semana y el último mes, por días y por franjas horarias; los canales, categorías, películas y series más vistos.</p>
<ul>
<li>Se cuenta por separado para cada perfil, solo el tiempo realmente reproducido (sin pausas).</li>
<li>Los datos solo se guardan en este dispositivo. En la página de estadísticas se puede desactivar la recogida y borrar los datos.</li>
</ul>
${go('#/stats', 'Abrir estadísticas')}`,
  },
  {
    id: 'transfer',
    cat: 'personal',
    title: 'Sincronización entre dispositivos (con código)',
    keywords: 'transferencia pasar a la tv ajustes copiar código dirección sincronizar exportar importar tv android móvil escritorio',
    body: `
<p>Entre el ordenador, Android TV y el móvil Android puedes pasar los ajustes (listas, perfiles, favoritos, historial, recordatorios, inicio) con un código en la red local, en cualquier sentido:</p>
<ol>
<li>En el dispositivo <b>cuyos ajustes quieres importar</b>: Ajustes → <i>Sincronización entre dispositivos</i> → <b>Pedir código</b>. Aparece un código de 12 dígitos (p. ej. <code>123 456 789 012</code>). Si lo pides, también se pasan las claves y contraseñas.</li>
<li>En el <b>otro dispositivo</b>: en el mismo sitio, escribe el código en el campo <i>Sincronizar con código</i> y pulsa <b>Sincronizar</b>. El dispositivo encuentra solo en la red al que da el código e importa sus ajustes (tras confirmarlo).</li>
</ol>
<p>Los ajustes viajan cifrados: el código (y por tanto la clave) nunca viaja por la red, solo un identificador derivado de él. El código vale 15 minutos; tras 10 intentos fallidos se detiene, y entonces hay que pedir otro. Los dos dispositivos deben estar en la misma red (doméstica); la primera vez, el Firewall de Windows puede pedir permiso: permítelo en la red privada.</p>
<p><b>Solo perfiles</b>: los ajustes y listas actuales se mantienen, y los perfiles que llegan se añaden (los que ya existen se actualizan).</p>
<p>En <i>Avanzado</i> puedes indicar también la dirección del otro dispositivo (si está en otra subred), o cargar los ajustes desde una dirección web (p. ej. una copia subida a tu NAS); en ese caso escribe la dirección completa, sin código.</p>
${go('#/settings?section=transfer', 'Sincronización entre dispositivos')}`,
  },
  {
    id: 'remote',
    cat: 'personal',
    title: 'Mando desde el móvil',
    keywords: 'mando móvil teléfono navegador control pin código qr red cambio de canal volumen panel táctil búsqueda',
    body: `
<p>La aplicación de escritorio y la versión para Android (TV) también se pueden controlar desde tu móvil, o desde el navegador de cualquier dispositivo, en la misma red (doméstica):</p>
<ol>
<li>Lo más rápido: el botón <b>Mando a distancia</b> arriba en el <b>Inicio</b> (junto a Personalizar); lo activa y muestra el código QR en una ventanita. O bien: Ajustes → Mando y teclas → <b>Mando desde el móvil</b> → actívalo. Aparecen un <b>código QR</b>, una dirección (p. ej. <code>http://192.168.1.20:47800/adas/remote</code>) y un PIN de 4 dígitos.</li>
<li>Escanea el código QR con la cámara del móvil: se abre el control y recibe además una clave secreta. Es lo más seguro, porque la clave nunca viaja por la red; el móvil firma cada orden con ella. (O abre la dirección en el navegador y escribe el PIN; el móvil lo recuerda.) Consejo: añade la página a la pantalla de inicio para que se abra como una aplicación.</li>
</ol>
<p>Arriba siempre ves lo que se está emitiendo (con logotipo, el progreso del programa y el siguiente). El control tiene tres pestañas:</p>
<table class="help-table">
<tr><td><b>🎮 Control</b></td><td>Un <b>panel táctil</b> con dos modos (se cambia encima, el móvil lo recuerda): <b>🖱 Ratón</b>: al deslizar mueves un cursor por la pantalla del ordenador / la TV (movimiento lento = preciso, rápido = saltos grandes), tocar = clic, <b>deslizar con dos dedos para desplazar</b> (también en horizontal, en la fila bajo el cursor), y el elemento bajo el cursor queda seleccionado; <b>✥ Flechas</b>: al deslizar se mueve la selección (como las flechas), tocar = OK. En ambos: pulsación larga = Atrás. Al usar el mando, el marco de selección siempre se ve. Debajo: Atrás, Inicio, Ficha; avanzar (±10 / ±30 s; diferido en las emisiones en directo); pausa; CH ▲ / ▼, canal anterior, silenciar, <b>control deslizante de volumen</b>; Subtítulos, Calidad, Lista de canales, Pantalla completa; flechas y número de canal.</td></tr>
<tr><td><b>📺 Canales</b></td><td>Un <b>buscador</b> entre todos los canales (filtra mientras escribes y muestra también lo que se emite ahora), tus favoritos y los vistos recientemente; se inician con un toque.</td></tr>
<tr><td><b>☰ Más</b></td><td>Ir a cualquier página (TV, Guía de TV, Favoritos, VOD, Grabaciones, Explorar, Ayuda); <b>enviar texto</b> (escribe con el teclado del móvil en el campo seleccionado o inicia una búsqueda); Datos de la emisión, Varias emisiones a la vez, temporizador de apagado.</td></tr>
</table>
<div class="note">El PIN y la clave del código QR se pueden regenerar en cualquier momento (Nuevo PIN); el móvil antiguo tendrá que volver a escanear el código QR (o escribir el nuevo PIN). Con un PIN incorrecto el control no funciona; tras muchos intentos fallidos desde un dispositivo, ese dispositivo queda bloqueado 10 minutos (los demás móviles siguen funcionando).</div>
${go('#/settings?section=remote', 'Mando desde el móvil')}`,
  },
  {
    id: 'recording',
    cat: 'watch',
    title: 'Grabación',
    keywords: 'grabación grabar guardar programar vídeo ts recortar margen inicio final',
    body: `
<p>En la versión de escritorio (Windows, Mac, Linux) se puede grabar la TV en directo, sin recodificar, con la calidad original, en un archivo <code>.ts</code> en la carpeta <b>Vídeos / Grabaciones de Adás</b>.</p>
<ul>
<li><b>Al momento</b>: durante la reproducción, con el botón rojo <b>●</b> de la barra de control; al pulsarlo otra vez se detiene. Mientras graba, el botón parpadea.</li>
<li><b>Programada</b>: en la guía de TV, <b>● Grabar</b> en la ficha de un programa. La grabación empieza y termina con <b>margen</b>: por defecto 3 minutos antes y 10 minutos después del programa, porque la tele suele retrasarse (Ajustes → Grabaciones). Adás debe estar abierto entonces (oculto en la bandeja vale: Ajustes → Notificaciones → Ejecutar en segundo plano); el inicio desde la bandeja también es puntual.</li>
<li>Si la emisión <b>se corta</b> durante la grabación (p. ej. por un servidor que se atasca), la grabación continúa sola en el mismo archivo a los pocos segundos; al final, el mensaje «Grabación terminada» indica cuántas veces se interrumpió.</li>
</ul>
<h2>Recortar</h2>
<p>El botón <b>✂</b> de la tarjeta de una grabación abre el editor de recorte: vista previa, línea de tiempo (marcas amarillas: inicio y final del programa según la guía de TV), pasos (±1 s / ±10 s / ±1 min), <b>⇤ Inicio aquí</b> y <b>Final aquí ⇥</b> (o las teclas <kbd>I</kbd> / <kbd>O</kbd>), y las horas también se pueden escribir; el botón <b>Seleccionar según la guía de TV</b> las fija de una vez. Tras <b>✂ Recortar y guardar</b>, la versión recortada ocupa el lugar de la grabación: es la que reproduce Adás y la que abre también el reproductor externo.</p>
<p>El <b>original se conserva</b> (no aparece como una grabación aparte): al volver a abrir el editor puedes recortar de nuevo desde el original (con la selección anterior), o recuperar la grabación completa con <b>Restaurar original</b>. La tarjeta de una grabación recortada muestra una marca junto al ✂. Al eliminarla, ambas van a la papelera.</p>
<p>Las grabaciones están en la pestaña <b>TV → Grabaciones</b> (con logotipo del canal, fecha y tamaño; las empezadas con barra de progreso). <b>▶ Reproducir</b> abre la grabación en el reproductor propio de Adás, con avance, y una grabación a medias continúa donde la dejaste. El botón <b>⧉</b> la abre en el reproductor de vídeo del ordenador (p. ej. VLC), y <b>✕</b> la manda a la papelera. Aquí también ves las grabaciones en curso y las programadas; las últimas aparecen además en Ajustes → Grabaciones.</p>
<div class="note">Solo para tu uso doméstico: los derechos de los programas grabados son de los canales. Algunas emisiones (cifradas o protegidas con DRM) no se pueden grabar.</div>
${go('#/recordings', 'Grabaciones')}`,
  },
  {
    id: 'adaspack',
    cat: 'lists',
    title: 'Paquetes adicionales (.adaspack)',
    keywords: 'paquete adicional adaspack adaspak tv vod lista integrada ia crear carpeta de paquetes',
    body: `
<p>Un paquete adicional es <b>una lista de reproducción empaquetada en un archivo</b>, con nombre y descripción. Aparece <b>entre las listas integradas</b> (se puede activar y desactivar), pero no viene con el programa: solo estará en el dispositivo donde lo cargues.</p>
<table class="help-table">
<tr><td><code>algo_tv.adaspack</code></td><td><b>Canales de TV</b>: Ajustes → Listas de canales → Listas integradas.</td></tr>
<tr><td><code>algo_vod.adaspack</code></td><td><b>Películas, series</b>: Ajustes → VOD y mediateca → Listas VOD → Listas integradas.</td></tr>
</table>
<h2>Cargar</h2>
<ul>
<li>El botón <b>Cargar paquete adicional</b> (Listas de canales o Listas VOD): el propio paquete decide adónde va. Acepta las extensiones <code>.adaspack</code> y <code>.adaspak</code>, <b>en todas las versiones</b> (escritorio, móvil y TV Android, navegador, LG webOS).</li>
<li><b>Cargar desde una dirección web</b>: p. ej. desde GitHub (también vale una dirección de página <code>github.com/…/blob/…</code>) o desde tu NAS. En la TV, donde no hay selector de archivos, es lo más sencillo.</li>
<li>Versión de escritorio: el contenido de la <b>Carpeta de paquetes</b> (la subcarpeta <code>packs</code> de la carpeta de datos del usuario) se carga solo al iniciar y se actualiza si un archivo cambia.</li>
<li>La copia de seguridad y la transferencia entre dispositivos también llevan los paquetes (p. ej. del ordenador al móvil).</li>
<li>Volver a cargar un paquete con el mismo identificador actualiza el anterior; <b>Quitar</b> solo lo borra de este dispositivo.</li>
</ul>
<h2>Estructura</h2>
<p>JSON en UTF-8: <code>{ "adasPack": 1, "kind": "tv" | "vod", "id": "ejemplo", "name": "Ejemplo", "desc": "…", "off": false, "text": "#EXTM3U\\n…" }</code>; <code>text</code> es la lista M3U completa. Para TV se recomienda <code>tvg-id</code> (identificador de iptv-org: logotipo, país, guía de TV); para VOD, el título de película <code>Título (Año)</code>, el título de episodio <code>Serie S01E02</code> y la lista de géneros <code>adas-tags</code> (los nombres de género del programa, que están en húngaro, p. ej. <i>Akció;Dráma</i>).</p>
<h2>Crear uno</h2>
<p>A partir de una lista M3U: <code>node tools/make-pack.mjs lista.m3u8 --kind tv|vod --id ejemplo --name "Ejemplo"</code>. Un asistente de IA también puede crearlo a partir de una página web, una hoja de cálculo o una lista de archivos: la descripción exacta del formato y unas instrucciones para la IA listas para pegar están en el código fuente (<code>docs/ADASPACK.md</code>).</p>
<button class="btn" data-ext="https://github.com/mesehordo/adas-iptv/blob/main/docs/ADASPACK.md">Abrir la descripción completa y las instrucciones para la IA</button>
<div class="note">Añade solo contenido que puedas ver legalmente.</div>`,
  },
  {
    id: 'update',
    cat: 'about',
    title: 'Actualizaciones',
    keywords: 'actualización nueva versión update descargar instalar github versión',
    body: `
<p>La versión de escritorio (Windows, macOS, Linux) se actualiza sola desde <b>GitHub</b>, a partir de las versiones oficiales (<code>github.com/mesehordo/adas-iptv</code>). Ajustes → <b>Actualizaciones</b>:</p>
<ul>
<li><b>Buscar actualizaciones al iniciar</b> (activado por defecto): en cada inicio comprueba si hay una versión nueva; si la hay, recibes un aviso y puedes instalarla al momento con el botón <i>Actualizar</i>. Si no lo quieres, desactívalo: entonces solo busca cuando se lo pidas.</li>
<li><b>Buscar actualizaciones ahora</b>: búsqueda inmediata; si hay una versión nueva, aparecen las notas de la versión y el botón <b>Descargar e instalar</b>.</li>
<li>La instalación se adapta a cómo se instaló: con el instalador (Setup) se inicia el instalador nuevo; con MSI, el MSI nuevo; en la versión <b>portátil</b>, el archivo descargado está en la carpeta que se abre (ejecútalo en lugar del antiguo); en Linux, el AppImage se sustituye a sí mismo.</li>
<li><b>Fuente de actualizaciones</b>: vacía significa las versiones oficiales. Se puede indicar un repositorio propio de GitHub (<code>propietario/repositorio</code>) o la dirección de un archivo JSON: <code>{ "version": "1.25.0", "url": "https://…/Adas-Setup-1.25.0.exe", "notes": "…" }</code>.</li>
</ul>
<div class="note">La versión para Android se actualiza instalando el nuevo <code>.apk</code> descargado de la página de la versión en GitHub (tus ajustes se conservan).</div>
${go('#/settings?section=update', 'Actualizaciones')}`,
  },

  // ===================================================================== Otros
  {
    id: 'privacy',
    cat: 'about',
    title: 'Datos y privacidad',
    keywords: 'privacidad datos almacenamiento dónde seguimiento cuenta carpeta',
    body: `
<ul>
<li>Sin cuenta, sin registro, sin seguimiento, y el programa no envía a ningún sitio datos sobre tu uso.</li>
<li>Todos los ajustes, perfiles y listas descargadas se guardan <b>localmente</b>:
  <ul>
  <li>Windows: <code>%APPDATA%\\Adás</code></li>
  <li>macOS: <code>~/Library/Application Support/Adás</code></li>
  <li>Linux: <code>~/.config/Adás</code></li>
  <li>En la TV y en Android: en el almacenamiento propio de la aplicación.</li>
  </ul> ${t('backup', 'Copia de seguridad y mudanza')}</li>
<li>El programa se conecta a estos servidores: iptv-org (lista de canales y datos), las fuentes de guía de TV activadas, las direcciones de tus listas, los servidores que alojan los logotipos de los canales y, al reproducir, los propios servidores de las emisiones. Como cualquier web, pueden ver tu dirección IP.</li>
<li>Al enviar a la TV y al pasar los ajustes, la versión de escritorio inicia un pequeño servidor en la <b>red local</b> (en torno al puerto 47800). La retransmisión solo funciona con una clave aleatoria, nueva en cada inicio; los ajustes solo se pueden descargar con el código, válido durante 15 minutos.</li>
<li>Las estadísticas de visualización, los PIN y los ajustes no se envían a ningún sitio.</li>
</ul>`,
  },
  {
    id: 'about',
    cat: 'about',
    title: 'Acerca de y fuentes',
    keywords: 'acerca de versión fuente licencia iptv-org hls.js electron agradecimientos',
    body: `
<p><b>Adás</b>: un reproductor de TV en directo con una interfaz al estilo de los servicios de streaming, para Windows, macOS, Linux, Android y TV LG webOS. Licencia MIT.</p>
<h2>Fuentes de datos</h2>
<ul>
<li><b>iptv-org/iptv</b> e <b>iptv-org/api</b>: lista de canales, datos de los canales, logotipos (comunitarios, públicos).</li>
<li>Guía de TV: <b>iptv-epg.org</b>, <b>epgshare01.online</b>, <b>i.mjh.nz</b>, y la fuente propia de la lista de reproducción.</li>
<li>Listas integradas: <b>Free-TV/IPTV</b>, <b>BuddyChewChew/app-m3u-generator</b> (Pluto TV, Samsung TV Plus, Plex), <b>freecasthub/public-iptv</b>, <b>DragonHall TV</b>.</li>
</ul>
<h2>Bibliotecas utilizadas</h2>
<ul>
<li><b>Electron</b>: aplicación de escritorio,</li>
<li><b>hls.js</b>, <b>mpegts.js</b>, <b>dash.js</b>: reproducción,</li>
<li><b>esbuild</b>, <b>@webos-tools/cli</b>: creación del paquete de TV.</li>
</ul>
<p>Los estilos de la interfaz solo se inspiran en el aspecto de servicios y sistemas conocidos; el programa no tiene relación con ellos ni usa sus logotipos.</p>`,
  },
];
