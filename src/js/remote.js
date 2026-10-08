// Távirányító telefonról (vagy bármilyen böngészőből a helyi hálózaton): az alkalmazás kis kiszolgálója
// (asztali: lan.js, Android: LanServer) egy vezérlőlapot ad – http://<cím>:47800/adas/remote –, ami PIN-nel
// küld parancsokat (csatornaváltás, hangerő, nyilak, OK / Vissza, számok, kedvencek), és kiírja, mi megy.
import { $, esc, toast, bus, norm } from './util.js';
import { api } from './api.js';
import { store } from './store.js';
import { catalog, getChannels, visible } from './catalog.js';
import { epg } from './epg.js';
import { player } from './player.js';
import { openInfo } from './components.js';
import { toggleStreamInfo } from './streaminfo.js';
import { qrSvg } from './qr.js';

export const canRemote = !!api.rcStart;
const video = $('#video');
let info = null; // { port, addresses }

const newPin = () => String(Math.floor(1000 + Math.random() * 9000));

/** A telefonon megnyíló vezérlőlap (önálló HTML, külső fájlok nélkül; régi telefonos böngészőkhöz is). */
function pageHtml() {
  return `<!doctype html><html lang="hu"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover">
<meta name="theme-color" content="#111"><meta name="apple-mobile-web-app-capable" content="yes"><meta name="mobile-web-app-capable" content="yes"><title>Adás – távirányító</title><style>
*{box-sizing:border-box;-webkit-tap-highlight-color:transparent;-webkit-user-select:none;user-select:none}[hidden]{display:none!important}
:root{--a:#e50914;--bg:#111;--c:#1d1d1d;--c2:#2a2a2a;--t:#eee;--m:#9a9a9a}
html,body{margin:0;background:var(--bg);color:var(--t);font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif}
body{max-width:560px;margin:0 auto;padding:10px 12px calc(76px + env(safe-area-inset-bottom))}
button{font:inherit;color:inherit;border:0;border-radius:14px;background:var(--c2);padding:14px 0;font-size:17px;touch-action:manipulation;cursor:pointer}
button:active,button.on{background:var(--a);color:#fff}
.now{display:flex;gap:10px;align-items:center;background:var(--c);border-radius:14px;padding:10px;margin-bottom:10px;min-height:64px}
.now img{width:56px;height:38px;object-fit:contain;flex:none;background:#000;border-radius:6px}.now .tx{min-width:0;flex:1}
.now b{display:block;font-size:16px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.now small{display:block;color:var(--m);font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.bar{height:4px;border-radius:2px;background:#333;margin-top:6px;overflow:hidden}.bar i{display:block;height:100%;background:var(--a)}
.tabs{position:fixed;left:0;right:0;bottom:0;display:flex;background:#0b0b0b;border-top:1px solid #222;padding:6px 6px calc(6px + env(safe-area-inset-bottom));z-index:5}
.tabs button{flex:1;background:none;border-radius:10px;padding:8px 0;font-size:12px;color:var(--m)}.tabs button span{display:block;font-size:20px;margin-bottom:2px}.tabs button.sel{color:#fff;background:#222}
.pane{display:none}.pane.sel{display:block}
.pad{position:relative;height:min(46vh,300px);border-radius:20px;background:radial-gradient(circle at 50% 50%,#2b2b2b,#1a1a1a);display:grid;place-items:center;color:#666;font-size:13px;text-align:center;touch-action:none;margin-bottom:10px;border:1px solid #2a2a2a}
.pad .hint{pointer-events:none;padding:0 20px}.pad .dot{position:absolute;width:56px;height:56px;border-radius:50%;background:rgba(229,9,20,.35);pointer-events:none;transform:translate(-50%,-50%);display:none}
.row{display:grid;gap:8px;margin-bottom:8px}.r3{grid-template-columns:repeat(3,1fr)}.r4{grid-template-columns:repeat(4,1fr)}.r5{grid-template-columns:repeat(5,1fr)}
.ok{background:var(--a);color:#fff;font-weight:700}.sm{font-size:14px;padding:11px 0}
.dpad{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:8px}.dpad .e{visibility:hidden}
.vol{display:flex;align-items:center;gap:10px;background:var(--c);border-radius:14px;padding:8px 12px;margin-bottom:8px}.vol input{flex:1;accent-color:var(--a);height:28px}
h2{font-size:12px;color:var(--m);margin:14px 2px 8px;text-transform:uppercase;letter-spacing:.06em}
.list{display:grid;grid-template-columns:1fr 1fr;gap:8px}.list button{font-size:14px;padding:10px 8px;text-align:left;display:flex;gap:8px;align-items:center;min-width:0}
.list img{width:34px;height:22px;object-fit:contain;flex:none}.list span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.list small{display:block;color:var(--m);font-size:11px}
input.q{width:100%;font:inherit;font-size:17px;padding:12px 14px;border-radius:14px;border:1px solid #333;background:var(--c);color:#fff;-webkit-user-select:text;user-select:text;margin-bottom:8px}
.pin{display:flex;flex-direction:column;gap:10px;margin-top:30px}.pin input{font-size:30px;text-align:center;letter-spacing:.3em;padding:12px;border-radius:14px;border:1px solid #444;background:var(--c);color:#fff;-webkit-user-select:text;user-select:text}
.err{color:#ff6b6b;min-height:1.2em}.muted{color:var(--m);font-size:13px}.toast{position:fixed;left:50%;bottom:90px;transform:translateX(-50%);background:#333;color:#fff;padding:8px 14px;border-radius:10px;font-size:14px;opacity:0;transition:opacity .2s;pointer-events:none}.toast.show{opacity:1}
.off{color:#ff8a80}
</style></head><body>
<div id="pin" class="pin" hidden><h1 style="color:var(--a);margin:0">ADÁS</h1><p>Írd be a tévén / gépen látható 4 jegyű PIN-t<br><small class="muted">(vagy olvasd be a QR-kódot: Beállítások → Eszközök és szinkron → Távirányító telefonról)</small></p>
<input id="pinIn" inputmode="numeric" maxlength="4" autocomplete="off"><button class="ok" id="pinOk">Csatlakozás</button><div class="err" id="pinErr"></div></div>
<div id="ui" hidden>
<div class="now" id="now"><div class="tx"><small>Csatlakozás…</small></div></div>
<div class="pane sel" id="p-ctl">
 <div class="pad" id="pad"><div class="hint">Húzd az ujjad: <b>mozgás</b> · Koppints: <b>OK</b><br>Hosszan nyomva: <b>Vissza</b></div><div class="dot" id="dot"></div></div>
 <div class="row r3"><button data-c="key" data-a="Escape">↩ Vissza</button><button data-c="nav" data-a="home">⌂ Főoldal</button><button data-c="menu" data-a="info">ⓘ Adatlap</button></div>
 <div class="row r5"><button data-c="seek" data-a="-30" class="sm">−30″</button><button data-c="seek" data-a="-10" class="sm">−10″</button><button data-c="toggle" class="ok">⏯</button><button data-c="seek" data-a="10" class="sm">+10″</button><button data-c="seek" data-a="30" class="sm">+30″</button></div>
 <div class="row r4"><button data-c="chup">CH ▲</button><button data-c="chdown">CH ▼</button><button data-c="recall" class="sm">↺ Előző</button><button data-c="mute" id="muteBtn">🔇</button></div>
 <div class="vol"><span>🔈</span><input type="range" id="vol" min="0" max="1" step="0.02" aria-label="Hangerő"><span>🔊</span></div>
 <div class="row r4"><button data-c="menu" data-a="subs" class="sm">CC Felirat</button><button data-c="menu" data-a="settings" class="sm">⚙ Minőség</button><button data-c="menu" data-a="list" class="sm">☰ Lista</button><button data-c="menu" data-a="full" class="sm">⛶ Teljes</button></div>
 <h2>Nyilak</h2>
 <div class="dpad"><span class="e"></span><button data-c="key" data-a="ArrowUp">▲</button><span class="e"></span><button data-c="key" data-a="ArrowLeft">◀</button><button class="ok" data-c="key" data-a="Enter">OK</button><button data-c="key" data-a="ArrowRight">▶</button><span class="e"></span><button data-c="key" data-a="ArrowDown">▼</button><span class="e"></span></div>
 <h2>Csatornaszám</h2>
 <div class="row r5">${[1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map((n) => `<button data-c="num" data-a="${n}" class="sm">${n}</button>`).join('')}</div>
</div>
<div class="pane" id="p-ch">
 <input class="q" id="q" type="search" placeholder="Csatorna keresése…" autocomplete="off">
 <div class="list" id="results"></div>
 <h2>Kedvencek</h2><div class="list" id="favs"></div>
 <h2>Legutóbb nézett</h2><div class="list" id="recent"></div>
</div>
<div class="pane" id="p-go">
 <h2>Ugrás</h2>
 <div class="row r3"><button data-c="nav" data-a="home" class="sm">⌂ Főoldal</button><button data-c="nav" data-a="tv" class="sm">📺 TV</button><button data-c="nav" data-a="guide" class="sm">☰ Műsorújság</button>
 <button data-c="nav" data-a="favorites" class="sm">★ Kedvencek</button><button data-c="nav" data-a="vod" class="sm">🎬 VOD</button><button data-c="nav" data-a="recordings" class="sm">● Felvételek</button>
 <button data-c="nav" data-a="browse" class="sm">⌕ Böngészés</button><button data-c="nav" data-a="help" class="sm">? Súgó</button><button data-c="menu" data-a="close" class="sm">✕ Lejátszó be</button></div>
 <h2>Szöveg küldése</h2>
 <input class="q" id="txt" type="text" placeholder="Keresés az Adásban / gépelés a kijelölt mezőbe" autocomplete="off">
 <div class="row r3"><button id="sendTxt" class="ok sm">Küldés</button><button id="searchTxt" class="sm">⌕ Keresés</button><button data-c="key" data-a="Backspace" class="sm">⌫ Törlés</button></div>
 <h2>Lejátszó</h2>
 <div class="row r3"><button data-c="menu" data-a="stats" class="sm">📊 Adás adatai</button><button data-c="menu" data-a="multi" class="sm">▦ Több adás</button><button data-c="menu" data-a="sleep" class="sm">☾ Időzítő</button></div>
 <p class="muted">Tipp: a böngésző menüjében „Hozzáadás a kezdőképernyőhöz” – így alkalmazásként indul.</p>
</div>
</div>
<nav class="tabs" id="tabs" hidden><button data-t="ctl" class="sel"><span>🎮</span>Vezérlő</button><button data-t="ch"><span>📺</span>Csatornák</button><button data-t="go"><span>☰</span>Továbbiak</button></nav>
<div class="toast" id="toast"></div>
<script>
var pin='';try{var m=/[#&]pin=(\\d{4})/.exec(location.hash);if(m){pin=m[1];localStorage.setItem('adasPin',pin);history.replaceState(null,'',location.pathname)}else pin=localStorage.getItem('adasPin')||''}catch(e){}
var $=function(i){return document.getElementById(i)};var last={};var busy=false;
function api(p){return fetch('/adas/rc/'+pin+'/'+p,{cache:'no-store'}).then(function(r){if(r.status===403)throw new Error('pin');return r.json()})}
function ask(msg){$('ui').hidden=true;$('tabs').hidden=true;$('pin').hidden=false;$('pinErr').textContent=msg||''}
function esc(s){return String(s||'').replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}
function toast(t){var e=$('toast');e.textContent=t;e.className='toast show';clearTimeout(e._t);e._t=setTimeout(function(){e.className='toast'},1400)}
function chBtns(list,empty){return (list||[]).map(function(f){return '<button data-c="play" data-a="'+esc(f.id)+'">'+(f.logo?'<img src="'+esc(f.logo)+'" alt="" onerror="this.remove()">':'')+'<span>'+esc(f.name)+(f.sub?'<small>'+esc(f.sub)+'</small>':'')+'</span></button>'}).join('')||'<small class="muted">'+empty+'</small>'}
function render(s){last=s;$('pin').hidden=true;$('ui').hidden=false;$('tabs').hidden=false;var n=s.now;
$('now').innerHTML=n?((n.logo?'<img src="'+esc(n.logo)+'" alt="" onerror="this.remove()">':'')+'<div class="tx"><b>'+esc(n.name)+'</b><small>'+esc(n.title||'')+'</small>'+(n.next?'<small>Utána: '+esc(n.next)+'</small>':'')+(n.progress!=null?'<div class="bar"><i style="width:'+Math.round(n.progress*100)+'%"></i></div>':'')+'</div>'):'<div class="tx"><b>'+esc(s.profile||'Adás')+'</b><small>Most nem megy semmi – válassz csatornát a Csatornák fülön, vagy nyomd meg a CH gombot.</small></div>';
if(document.activeElement!==$('vol'))$('vol').value=s.volume==null?1:s.volume;$('muteBtn').className=s.muted?'on':'';
$('favs').innerHTML=chBtns(s.favs,'Nincs kedvenc csatorna.');$('recent').innerHTML=chBtns(s.recent,'Még nincs.');if(s.results)$('results').innerHTML=chBtns(s.results,'Nincs találat.')}
function state(){if(!pin)return ask();api('state').then(render).catch(function(e){if(e.message==='pin'){try{localStorage.removeItem('adasPin')}catch(x){}pin='';ask('Hibás PIN.')}})}
function cmd(c,a){if(navigator.vibrate)navigator.vibrate(12);return api('cmd?c='+encodeURIComponent(c)+'&a='+encodeURIComponent(a==null?'':a)).then(function(){setTimeout(state,350)}).catch(function(){toast('Nincs kapcsolat')})}
document.addEventListener('click',function(e){var t=e.target.closest('[data-t]');if(t){[].forEach.call(document.querySelectorAll('.tabs button'),function(b){b.className=b===t?'sel':''});[].forEach.call(document.querySelectorAll('.pane'),function(p){p.className='pane'+(p.id==='p-'+t.dataset.t?' sel':'')});return}
var b=e.target.closest('button[data-c]');if(!b)return;cmd(b.dataset.c,b.dataset.a)});
$('vol').addEventListener('input',function(){clearTimeout(this._t);var v=this.value;this._t=setTimeout(function(){cmd('vol',v)},120)});
var qt;$('q').addEventListener('input',function(){clearTimeout(qt);var v=this.value.trim();qt=setTimeout(function(){if(v)cmd('find',v);else{$('results').innerHTML=''}},300)});
$('sendTxt').onclick=function(){var v=$('txt').value;if(v){cmd('text',v);$('txt').value='';toast('Elküldve')}};
$('searchTxt').onclick=function(){var v=$('txt').value.trim();if(v){cmd('search',v);toast('Keresés: '+v)}};
// Érintőpad: húzás = nyíl (minden ~40 px után egy lépés), koppintás = OK, hosszú nyomás = Vissza
(function(){var pad=$('pad'),dot=$('dot'),sx=0,sy=0,acc=[0,0],t0=0,moved=false,lp=null;var STEP=40;
function pos(e){var r=pad.getBoundingClientRect(),p=e.touches?e.touches[0]:e;return[p.clientX-r.left,p.clientY-r.top]}
function start(e){e.preventDefault();var p=pos(e);sx=p[0];sy=p[1];acc=[0,0];t0=Date.now();moved=false;dot.style.display='block';dot.style.left=sx+'px';dot.style.top=sy+'px';clearTimeout(lp);lp=setTimeout(function(){if(!moved){cmd('key','Escape');toast('Vissza');moved=true}},650)}
function move(e){if(!t0)return;e.preventDefault();var p=pos(e),dx=p[0]-sx,dy=p[1]-sy;dot.style.left=p[0]+'px';dot.style.top=p[1]+'px';
if(Math.abs(dx)>STEP||Math.abs(dy)>STEP){moved=true;clearTimeout(lp);var k=Math.abs(dx)>Math.abs(dy)?(dx>0?'ArrowRight':'ArrowLeft'):(dy>0?'ArrowDown':'ArrowUp');cmd('key',k);sx=p[0];sy=p[1]}}
function end(e){if(!t0)return;e.preventDefault();clearTimeout(lp);dot.style.display='none';if(!moved&&Date.now()-t0<500)cmd('key','Enter');t0=0}
pad.addEventListener('touchstart',start,{passive:false});pad.addEventListener('touchmove',move,{passive:false});pad.addEventListener('touchend',end,{passive:false});
pad.addEventListener('mousedown',start);window.addEventListener('mousemove',move);window.addEventListener('mouseup',end)})();
$('pinOk').onclick=function(){pin=$('pinIn').value.replace(/\\D/g,'');try{localStorage.setItem('adasPin',pin)}catch(e){}state()};
$('pinIn').addEventListener('keydown',function(e){if(e.key==='Enter')$('pinOk').click()});
state();setInterval(function(){if(document.visibilityState!=='hidden')state()},2500);
</script></body></html>`;
}

let results = null; // a telefonról indított csatornakeresés találatai (a következő állapottal mennek ki)
const httpLogo = (c) => (/^https?:/.test(c?.logo || '') ? c.logo : '');
const chItem = (c) => ({ id: c.id, name: c.name, logo: httpLogo(c), sub: epg.now(c.id, Date.now())?.cur?.title || '' });

/** A telefonra küldött állapot: mi megy (haladással, következő műsorral), hangerő, kedvencek, előzmények, találatok. */
function stateJson() {
  const ch = player.active ? player.channel : null;
  let now = null;
  if (ch?.vod) {
    const d = video.duration;
    now = { name: ch.vod.title || ch.name, title: ch.vod.subtitle || '', logo: httpLogo(ch), vod: true, progress: Number.isFinite(d) && d > 0 ? video.currentTime / d : null };
  } else if (ch) {
    const n = epg.now(ch.id, Date.now());
    now = { name: ch.name, title: n?.cur?.title || '', next: n?.next ? `${new Date(n.next.start).toTimeString().slice(0, 5)} ${n.next.title}` : '', logo: httpLogo(ch), progress: n?.cur ? n.progress : null };
  }
  const favs = getChannels(store.profile?.favorites || []).slice(0, 40).map(chItem);
  const recent = getChannels(store.profile?.recent || []).slice(0, 12).map(chItem);
  return JSON.stringify({ now, favs, recent, results, volume: video.muted ? 0 : video.volume, muted: video.muted, paused: video.paused, profile: store.profile?.name || '' });
}
const pushState = () => info && api.rcState(stateJson());

/** Billentyű küldése a kijelölt elemnek – ugyanúgy, mintha a távirányítón nyomták volna meg. */
function key(k) {
  const t = document.activeElement || document.body;
  const ev = new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true });
  t.dispatchEvent(ev);
  if (k === 'Enter' && !ev.defaultPrevented && t !== document.body && t.click) t.click();
}

/** Szöveg a kijelölt beviteli mezőbe; ha nincs ilyen, keresés az Adásban. */
function typeText(text) {
  const el = document.activeElement;
  if (el?.matches?.('input:not([type=checkbox]):not([type=range]):not([type=radio]), textarea')) {
    el.value = (el.value || '') + text;
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  } else search(text);
}
function search(q) {
  if (player.active) player.close();
  location.hash = '#/search?q=' + encodeURIComponent(q);
}

/** Csatornakeresés a telefonról: név (más név) szerint, a látható csatornák között, a hazaiak elöl. */
function findChannels(q) {
  const t = norm(q).split(/\s+/).filter(Boolean);
  if (!t.length) return (results = null);
  results = visible()
    .filter((c) => t.every((w) => c.search.includes(w)))
    .slice(0, 30)
    .map(chItem);
}

const NAV = /^(home|tv|guide|vod|favorites|browse|recordings|help|search)$/;

async function command({ c, a }) {
  const live = player.active;
  switch (c) {
    case 'key':
      if (/^(Arrow(Up|Down|Left|Right)|Enter|Escape|Backspace)$/.test(a)) key(a);
      break;
    case 'chup':
    case 'chdown':
      if (live && !player.channel.vod) player.step(c === 'chup' ? -1 : 1);
      else if (!live) {
        const id = store.profile.lastChannel || store.profile.favorites[0];
        const ch = id && catalog.byId.get(id);
        if (ch) player.play(ch);
      }
      break;
    case 'volup':
    case 'voldown':
      if (live) player.setVolume(video.volume + (c === 'volup' ? 0.08 : -0.08));
      break;
    case 'vol': {
      const v = Number(a);
      if (live && Number.isFinite(v)) {
        video.muted = false;
        player.setVolume(Math.min(1, Math.max(0, v)));
      }
      break;
    }
    case 'mute':
      if (live) {
        video.muted = !video.muted;
        player.renderControls();
      }
      break;
    case 'toggle':
      if (live) player.togglePause();
      break;
    case 'seek': {
      const s = Number(a);
      if (!live || !Number.isFinite(s)) break;
      if (player.channel.vod) video.currentTime = Math.max(0, Math.min((video.duration || Infinity) - 1, video.currentTime + s));
      else player.tsBy(s); // élő adás: időcsúsztatás
      player.poke?.();
      break;
    }
    case 'recall':
      player.recall();
      break;
    case 'num':
      if (/^\d$/.test(a)) live ? player.digit(a) : key(a);
      break;
    case 'play': {
      const ch = catalog.byId.get(a);
      if (ch) player.play(ch);
      break;
    }
    case 'nav':
      if (!NAV.test(a)) break;
      if (live) player.close();
      location.hash = '#/' + a;
      break;
    case 'menu':
      if (a === 'close') {
        if (live) player.close();
      } else if (a === 'info') {
        if (live && player.channel.vod) player.vodHooks?.info(player.channel);
        else if (live) openInfo(player.channel);
        else key('i');
      } else if (!live) break;
      else if (a === 'subs' || a === 'settings' || a === 'sleep') player.openMenu(a);
      else if (a === 'list') player.toggleSide();
      else if (a === 'full') api.setFullscreen?.(!player.fullscreen);
      else if (a === 'stats') toggleStreamInfo(player, $('#player'), video);
      else if (a === 'multi' && api.caps.multiview) player.multiHooks?.open([player.channel]);
      player.poke?.();
      break;
    case 'text':
      typeText(String(a || '').slice(0, 200));
      break;
    case 'search':
      if (a) search(String(a).slice(0, 200));
      break;
    case 'find':
      findChannels(String(a || '').slice(0, 100));
      break;
  }
  setTimeout(pushState, 250);
}

export async function startRemote() {
  if (!canRemote) return null;
  const s = store.settings;
  if (!/^\d{4}$/.test(s.remotePin || '')) {
    s.remotePin = newPin();
    store.save();
  }
  info = await api.rcStart(pageHtml(), s.remotePin);
  pushState();
  return info;
}
export async function stopRemote() {
  info = null;
  if (canRemote) await api.rcStop();
}

if (canRemote) {
  api.onRemoteCmd((x) => command(x));
  for (const ev of ['player-opened', 'player-closed', 'profile', 'favorites']) bus.on(ev, pushState);
  setInterval(pushState, 15000);
  // bekapcsolt távirányító: indításkor elindul (kicsit később, hogy a lista betöltődjön)
  setTimeout(() => store.settings.remoteOn && startRemote().catch(() => {}), 4000);
}

// ---------------------------------------------------------------------------
// Beállítások → Eszközök és szinkron → Távirányító telefonról
// ---------------------------------------------------------------------------
export function renderRemoteSettings(box) {
  if (!canRemote || !box) return box?.remove();
  const s = store.settings;
  const draw = () => {
    const urls = (info?.addresses || []).map((ip) => `http://${ip}${info.port === 80 ? '' : ':' + info.port}/adas/remote`);
    box.innerHTML = `<h2>Távirányító telefonról <button class="help-link" data-help="remote" title="Súgó">?</button></h2>
      <label class="setting"><span><b>Vezérlés telefonról vagy más eszköz böngészőjéből</b><small>Érintőpad és nyilak, OK / Vissza, csatornaváltás, hangerő, tekerés, felirat, csatornakereső, kedvencek, szövegbevitel – ugyanazon a (otthoni) hálózaton.</small></span>
        <input type="checkbox" class="switch" data-rc="on" ${s.remoteOn ? 'checked' : ''} /></label>
      ${
        s.remoteOn
          ? info
            ? `<div class="share-box rc-box">
                <div class="rc-qr" title="Olvasd be a telefon kamerájával">${(() => {
                  try {
                    return qrSvg(`${urls[0]}#pin=${s.remotePin}`, { px: 5 });
                  } catch {
                    return '';
                  }
                })()}</div>
                <div class="rc-text">
                  <div><b>Olvasd be a QR-kódot a telefon kamerájával</b> – a lap megnyílik, és a PIN-t is megkapja, nem kell begépelni.</div>
                  <div class="muted small">Vagy nyisd meg a telefon böngészőjében:</div>${urls.map((u) => `<code class="rc-url">${esc(u)}</code>`).join('')}
                  <div>PIN: <span class="share-code rc-pin">${esc(s.remotePin)}</span></div>
                  <div class="muted small">Tipp: a telefonon tedd ki a lapot a kezdőképernyőre, így alkalmazásként indul. Első alkalommal a Windows tűzfal engedélyt kérhet. Ha több cím látszik, azt válaszd, amelyik a telefonéval egy hálózaton van (a QR-kód az elsőt tartalmazza).</div>
                  <div class="inline"><button class="btn small" data-rc="pin">Új PIN</button></div>
                </div></div>`
            : '<p class="muted small">Indítás…</p>'
          : ''
      }`;
  };
  box.onchange = async (e) => {
    if (e.target.dataset.rc !== 'on') return;
    e.stopPropagation();
    s.remoteOn = e.target.checked;
    store.save();
    try {
      if (s.remoteOn) await startRemote();
      else await stopRemote();
    } catch (err) {
      toast('A távirányító nem indult el: ' + (err.message || err));
      s.remoteOn = false;
      store.save();
    }
    draw();
  };
  box.onclick = async (e) => {
    if (e.target.closest('[data-rc="pin"]')) {
      e.stopPropagation();
      s.remotePin = newPin();
      store.save();
      await startRemote();
      draw();
    }
  };
  draw();
  if (s.remoteOn && !info) startRemote().then(draw, () => {});
}
