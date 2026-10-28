// Távirányító telefonról (vagy bármilyen böngészőből a helyi hálózaton): az alkalmazás kis kiszolgálója
// (asztali: lan.js, Android: LanServer) egy vezérlőlapot ad – http://<cím>:47800/adas/remote –, ami PIN-nel
// küld parancsokat (csatornaváltás, hangerő, nyilak, OK / Vissza, számok, kedvencek), és kiírja, mi megy.
import { $, esc, toast, bus, norm } from './util.js';
import { api } from './api.js';
import { store } from './store.js';
import { catalog, getChannels, visible, byAvailability, contentAllowed } from './catalog.js';
import { epg } from './epg.js';
import { player } from './player.js';
import { openInfo, openModal } from './components.js';
import { toggleStreamInfo } from './streaminfo.js';
import { qrSvg } from './qr.js';
import { radio, radioFavs, radioRecent, isRadioFav, toggleRadioFav, radioSearch, searchRadioOnline, stationFrom } from './radio.js';
import { radioPlayer, fx, setFx, VIS_MODES, audioFxAvailable } from './radioplayer.js';
import { radioFullOpen, closeRadioFull } from './radioui.js';
import { radioMenuOn } from './radiopage.js';
import { menuOn } from './menus.js';
import { podPlayer } from './podplayer.js';
import { podCfg } from './podcast.js';
import { canRecord, recordingOf, toggleRadioRecording } from './recorder.js';

import { _t, lang as uiLang } from './i18n.js';
export const canRemote = !!api.rcStart;
const video = $('#video');
let info = null; // { port, addresses }

/** Egyenletes véletlen egész 0…n-1 (visszautasításos mintavétel – a maradékos osztás torzítana). */
function randInt(n) {
  const lim = Math.floor(0x100000000 / n) * n;
  for (;;) {
    const v = crypto.getRandomValues(new Uint32Array(1))[0];
    if (v < lim) return v % n;
  }
}
const newPin = () => String(1000 + randInt(9000));
/** A QR-kódban átadott, 128 bites kulcs – ezzel írja alá a telefon a kéréseit (a hálózaton nem utazik). */
const newKey = () => [...crypto.getRandomValues(new Uint8Array(16))].map((b) => b.toString(16).padStart(2, '0')).join('');

/** A telefonon megnyíló vezérlőlap (önálló HTML, külső fájlok nélkül; régi telefonos böngészőkhöz is). */
function pageHtml(pinOn = false) {
  return `<!doctype html><html lang="${uiLang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover">
<meta name="theme-color" content="#111"><meta name="apple-mobile-web-app-capable" content="yes"><meta name="mobile-web-app-capable" content="yes"><title>${_t('Adás – távirányító')}</title><style>
*{box-sizing:border-box;-webkit-tap-highlight-color:transparent;-webkit-user-select:none;user-select:none}[hidden]{display:none!important}
:root{--a:#e50914;--oa:#fff;--bg:#111;--c:#1d1d1d;--c2:#2a2a2a;--t:#eee;--m:#9a9a9a;--ln:#2a2a2a;--r:14px}
html,body{margin:0;background:var(--bg);color:var(--t);font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif}
body{max-width:560px;margin:0 auto;padding:10px 12px calc(76px + env(safe-area-inset-bottom))}
button{font:inherit;color:inherit;border:0;border-radius:14px;background:var(--c2);padding:14px 0;font-size:17px;touch-action:manipulation;cursor:pointer}
button{border-radius:var(--r)}button:active,button.on{background:var(--a);color:var(--oa)}
.now{display:flex;gap:10px;align-items:center;background:var(--c);border-radius:14px;padding:10px;margin-bottom:10px;min-height:64px}
.now img{width:56px;height:38px;object-fit:contain;flex:none;background:#000;border-radius:6px}.now .tx{min-width:0;flex:1}
.now b{display:block;font-size:16px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.now small{display:block;color:var(--m);font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.bar{height:4px;border-radius:2px;background:var(--ln);margin-top:6px;overflow:hidden}.bar i{display:block;height:100%;background:var(--a)}
.tabs{position:fixed;left:0;right:0;bottom:0;display:flex;background:var(--bg);border-top:1px solid var(--ln);padding:6px 6px calc(6px + env(safe-area-inset-bottom));z-index:5}
.tabs button{flex:1;background:none;border-radius:10px;padding:8px 0;font-size:12px;color:var(--m)}.tabs button span{display:block;font-size:20px;margin-bottom:2px}.tabs button.sel{color:#fff;background:#222}
.pane{display:none}.pane.sel{display:block}
.pad{position:relative;height:min(46vh,300px);border-radius:20px;background:radial-gradient(circle at 50% 50%,#2b2b2b,#1a1a1a);display:grid;place-items:center;color:#666;font-size:13px;text-align:center;touch-action:none;margin-bottom:10px;border:1px solid #2a2a2a}
.seg{display:flex;gap:6px;margin-bottom:8px}.seg button{flex:1;font-size:14px;padding:9px 0}.seg button.sel{background:var(--a);color:var(--oa);font-weight:700}
.pad .hint{pointer-events:none;padding:0 20px}.pad .dot{position:absolute;width:56px;height:56px;border-radius:50%;background:rgba(229,9,20,.35);pointer-events:none;transform:translate(-50%,-50%);display:none}
.row{display:grid;gap:8px;margin-bottom:8px}.r3{grid-template-columns:repeat(3,1fr)}.r4{grid-template-columns:repeat(4,1fr)}.r5{grid-template-columns:repeat(5,1fr)}
.ok{background:var(--a);color:var(--oa);font-weight:700}.sm{font-size:14px;padding:11px 0}
.dpad{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:8px}.dpad .e{visibility:hidden}
.vol{display:flex;align-items:center;gap:10px;background:var(--c);border-radius:14px;padding:8px 12px;margin-bottom:8px}.vol input{flex:1;accent-color:var(--a);height:28px}
h2{font-size:12px;color:var(--m);margin:14px 2px 8px;text-transform:uppercase;letter-spacing:.06em}
.list{display:grid;grid-template-columns:1fr 1fr;gap:8px}.list button{font-size:14px;padding:10px 8px;text-align:left;display:flex;gap:8px;align-items:center;min-width:0}
.list img{width:34px;height:22px;object-fit:contain;flex:none}.list span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.list small{display:block;color:var(--m);font-size:11px}
input.q{width:100%;font:inherit;font-size:17px;padding:12px 14px;border-radius:var(--r);border:1px solid var(--ln);background:var(--c);color:var(--t);-webkit-user-select:text;user-select:text;margin-bottom:8px}
.pin{display:flex;flex-direction:column;gap:10px;margin-top:30px}.pin input{font-size:30px;text-align:center;letter-spacing:.3em;padding:12px;border-radius:14px;border:1px solid #444;background:var(--c);color:#fff;-webkit-user-select:text;user-select:text}
.err{color:#ff6b6b;min-height:1.2em}.muted{color:var(--m);font-size:13px}.toast{position:fixed;left:50%;bottom:90px;transform:translateX(-50%);background:#333;color:#fff;padding:8px 14px;border-radius:10px;font-size:14px;opacity:0;transition:opacity .2s;pointer-events:none}.toast.show{opacity:1}
.off{color:#ff8a80}
</style></head><body>
<div id="pin" class="pin" hidden><h1 style="color:var(--a);margin:0">${_t('ADÁS')}</h1><p>${pinOn ? `${_t('Írd be a tévén / gépen látható 4 jegyű PIN-t<br>')}<small class="muted">${_t('(vagy olvasd be a QR-kódot: Beállítások → Távirányító és billentyűk → Távirányító telefonról)')}</small>` : _t('Olvasd be a QR-kódot a telefon kamerájával (Beállítások → Távirányító és billentyűk → Távirányító telefonról).')}</p>
${pinOn ? '' : `<p class="muted">${_t('A PIN-es belépés ki van kapcsolva (a QR-kódos a biztonságosabb). Bekapcsolható a tévén / gépen: Beállítások → Távirányító és billentyűk → Távirányító telefonról.')}</p>`}
<input id="pinIn" inputmode="numeric" maxlength="4" autocomplete="off"${pinOn ? '' : ' hidden'}><button class="ok" id="pinOk"${pinOn ? '' : ' hidden'}>${_t('Csatlakozás')}</button><div class="err" id="pinErr"></div></div>
<div id="ui" hidden>
<div class="now" id="now"><div class="tx"><small>${_t('Csatlakozás…')}</small></div></div>
<div class="pane sel" id="p-ctl">
 <div class="seg" id="padMode"><button data-pm="mouse">${_t('🖱 Egér')}</button><button data-pm="arrows">${_t('✥ Nyilak')}</button></div>
 <div class="pad" id="pad"><div class="hint" id="padHint"></div><div class="dot" id="dot"></div></div>
 <div class="row r3"><button data-c="key" data-a="Escape">${_t('↩ Vissza')}</button><button data-c="nav" data-a="home">${_t('⌂ Főoldal')}</button><button data-c="menu" data-a="info">${_t('ⓘ Adatlap')}</button></div>
 <div class="row r4"><button data-c="nav" data-a="tv" class="sm">${_t('📺 TV')}</button><button data-c="nav" data-a="guide" class="sm">${_t('🗓 Műsorújság')}</button><button data-c="nav" data-a="browse" class="sm">${_t('⌕ Böngészés')}</button><button data-c="nav" data-a="vod" class="sm">${_t('🎬 VOD')}</button></div>
 <div class="row r5"><button data-c="seek" data-a="-30" class="sm">−30″</button><button data-c="seek" data-a="-10" class="sm">−10″</button><button data-c="toggle" class="ok">⏯</button><button data-c="seek" data-a="10" class="sm">+10″</button><button data-c="seek" data-a="30" class="sm">+30″</button></div>
 <div class="row r4"><button data-c="chup">CH ▲</button><button data-c="chdown">CH ▼</button><button data-c="recall" class="sm">${_t('↺ Előző')}</button><button data-c="mute" id="muteBtn">🔇</button></div>
 <div class="vol"><span>🔈</span><input type="range" id="vol" min="0" max="1" step="0.02" aria-label="${_t('Hangerő')}"><span>🔊</span></div>
 <div class="row r4"><button data-c="menu" data-a="subs" class="sm">${_t('CC Felirat')}</button><button data-c="menu" data-a="settings" class="sm">${_t('⚙ Minőség')}</button><button data-c="menu" data-a="list" class="sm">${_t('☰ Lista')}</button><button data-c="menu" data-a="full" class="sm">${_t('⛶ Teljes')}</button></div>
 <div class="row r4"><button data-c="pfav" id="pfavBtn" class="sm">${_t('★ Kedvenc')}</button><button data-c="prec" id="precBtn" class="sm">${_t('● Felvétel')}</button><button data-c="menu" data-a="mini" id="miniBtn" class="sm">${_t('▣ Mini')}</button><button data-c="menu" data-a="cast" id="castBtn" class="sm">${_t('⇪ Kivetítés')}</button></div>
 <h2>${_t('Nyilak')}</h2>
 <div class="dpad"><span class="e"></span><button data-c="key" data-a="ArrowUp">▲</button><span class="e"></span><button data-c="key" data-a="ArrowLeft">◀</button><button class="ok" data-c="key" data-a="Enter">OK</button><button data-c="key" data-a="ArrowRight">▶</button><span class="e"></span><button data-c="key" data-a="ArrowDown">▼</button><span class="e"></span></div>
 <h2>${_t('Csatornaszám')}</h2>
 <div class="row r5">${[1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map((n) => `<button data-c="num" data-a="${n}" class="sm">${n}</button>`).join('')}</div>
</div>
<div class="pane" id="p-ch">
 <input class="q" id="q" type="search" placeholder="${_t('Csatorna keresése…')}" autocomplete="off">
 <div class="list" id="results"></div>
 <h2>${_t('Kedvencek')}</h2><div class="list" id="favs"></div>
 <h2>${_t('Legutóbb nézett')}</h2><div class="list" id="recent"></div>
</div>
<div class="pane" id="p-radio">
 <div class="now" id="rnow"><div class="tx"><small>${_t('Most nem szól rádió.')}</small></div></div>
 <div class="row r5"><button data-c="rprev">⏮</button><button data-c="rtoggle" class="ok">⏯</button><button data-c="rnext">⏭</button><button data-c="rfav" id="rfavBtn">★</button><button data-c="rrec" id="rrecBtn">●</button></div>
 <div class="vol"><span>🔈</span><input type="range" id="rvol" min="0" max="1" step="0.02" aria-label="${_t('Hangerő')}"><span>🔊</span></div>
 <div class="row r4"><button data-c="rfull" id="rfullBtn" class="sm">${_t('♪ Most szól')}</button><button data-c="rvis" id="rvisBtn" class="sm">${_t('〰 Hangkép')}</button><button data-c="rsleep" id="rsleepBtn" class="sm">${_t('☾ Elalvás')}</button><button data-c="rstop" class="sm">${_t('✕ Kikapcsolás')}</button></div>
 <div id="podBox" hidden><h2>${_t('Podcast')}</h2>
 <div class="now" id="pnow"><div class="tx"><small>${_t('Most nem szól podcast.')}</small></div></div>
 <div class="row r4"><button data-c="pback" class="sm">⏪</button><button data-c="ptoggle" class="ok">⏯</button><button data-c="pfwd" class="sm">⏩</button><button data-c="pnext" class="sm">⏭</button></div></div>
 <input class="q" id="rq" type="search" placeholder="${_t('Rádióadó keresése…')}" autocomplete="off">
 <div class="list" id="rresults"></div>
 <h2>${_t('Kedvenc rádiók')}</h2><div class="list" id="rfavs"></div>
 <h2>${_t('Legutóbb hallgatott')}</h2><div class="list" id="rrecent"></div>
</div>
<div class="pane" id="p-go">
 <h2>${_t('Ugrás')}</h2>
 <div class="row r3"><button data-c="nav" data-a="home" class="sm">${_t('⌂ Főoldal')}</button><button data-c="nav" data-a="tv" class="sm">${_t('📺 TV')}</button><button data-c="nav" data-a="guide" class="sm">${_t('☰ Műsorújság')}</button>
 <button data-c="nav" data-a="favorites" class="sm">${_t('★ Kedvencek')}</button><button data-c="nav" data-a="vod" class="sm">${_t('🎬 VOD')}</button><button data-c="nav" data-a="recordings" class="sm">${_t('● Felvételek')}</button>
 <button data-c="nav" data-a="browse" class="sm">${_t('⌕ Böngészés')}</button><button data-c="nav" data-a="radio" class="sm rnav">${_t('📻 Rádió')}</button><button data-c="nav" data-a="radio-guide" class="sm rnav">${_t('📻 Rádió-műsor')}</button>
 <button data-c="nav" data-a="sport" class="sm">${_t('⚽ Sport')}</button><button data-c="nav" data-a="podcast" class="sm">${_t('🎙 Podcast')}</button><button data-c="nav" data-a="help" class="sm">${_t('? Súgó')}</button><button data-c="menu" data-a="close" class="sm">${_t('✕ Lejátszó bezárása')}</button></div>
 <h2>${_t('Szöveg küldése')}</h2>
 <input class="q" id="txt" type="text" placeholder="${_t('Keresés az Adásban / gépelés a kijelölt mezőbe')}" autocomplete="off">
 <div class="row r3"><button id="sendTxt" class="ok sm">${_t('Küldés')}</button><button id="searchTxt" class="sm">${_t('⌕ Keresés')}</button><button data-c="key" data-a="Backspace" class="sm">${_t('⌫ Törlés')}</button></div>
 <h2>${_t('Lejátszó')}</h2>
 <div class="row r3"><button data-c="menu" data-a="stats" class="sm">${_t('📊 Adás adatai')}</button><button data-c="menu" data-a="sleep" class="sm">${_t('☾ Időzítő')}</button></div>
 <p class="muted">${_t('Tipp: a böngésző menüjében „Hozzáadás a kezdőképernyőhöz” – így alkalmazásként indul.')}</p>
</div>
</div>
<nav class="tabs" id="tabs" hidden><button data-t="ctl" class="sel"><span>🎮</span>${_t('Vezérlő')}</button><button data-t="ch"><span>📺</span>${_t('Csatornák')}</button><button data-t="radio" id="radioTab"><span>📻</span>${_t('Rádió')}</button><button data-t="go"><span>☰</span>${_t('Továbbiak')}</button></nav>
<div class="toast" id="toast"></div>
<script>
// Hitelesítés: a QR-kódból kapott kulcs (vagy a beírt PIN) soha nem megy át a hálózaton – minden kérést
// HMAC-SHA256 aláírás véd (a kiszolgáló alkalmi számával és egy növekvő számlálóval, így vissza sem játszható).
var key='',pin='',nonce='',ctr=0;
try{var mk=/[#&]k=([0-9a-f]{32})/.exec(location.hash),mp=/[#&]pin=(\\d{4})/.exec(location.hash);
if(mk){key=mk[1];localStorage.setItem('adasKey',key);localStorage.removeItem('adasPin')}else key=localStorage.getItem('adasKey')||'';
if(mp&&!key){pin=mp[1];localStorage.setItem('adasPin',pin)}else if(!key)pin=localStorage.getItem('adasPin')||'';
if(mk||mp)history.replaceState(null,'',location.pathname)}catch(e){}
var SK=[0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2];
function sha256(b){var H=[0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19],m=b.slice(),w=[],i,j,t,bl=b.length*8;
function r(x,n){return(x>>>n)|(x<<(32-n))}
m.push(128);while(m.length%64!==56)m.push(0);m.push(0,0,0,0,(bl>>>24)&255,(bl>>>16)&255,(bl>>>8)&255,bl&255);
for(j=0;j<m.length;j+=64){for(t=0;t<16;t++)w[t]=(m[j+4*t]<<24)|(m[j+4*t+1]<<16)|(m[j+4*t+2]<<8)|m[j+4*t+3];
for(t=16;t<64;t++){var x=w[t-15],y=w[t-2];w[t]=(w[t-16]+(r(x,7)^r(x,18)^(x>>>3))+w[t-7]+(r(y,17)^r(y,19)^(y>>>10)))|0}
var A=H[0],B=H[1],C=H[2],D=H[3],E=H[4],F=H[5],G=H[6],I=H[7];
for(t=0;t<64;t++){var t1=(I+(r(E,6)^r(E,11)^r(E,25))+((E&F)^(~E&G))+SK[t]+w[t])|0,t2=((r(A,2)^r(A,13)^r(A,22))+((A&B)^(A&C)^(B&C)))|0;I=G;G=F;F=E;E=(D+t1)|0;D=C;C=B;B=A;A=(t1+t2)|0}
H[0]=(H[0]+A)|0;H[1]=(H[1]+B)|0;H[2]=(H[2]+C)|0;H[3]=(H[3]+D)|0;H[4]=(H[4]+E)|0;H[5]=(H[5]+F)|0;H[6]=(H[6]+G)|0;H[7]=(H[7]+I)|0}
var o=[];for(i=0;i<8;i++)o.push((H[i]>>>24)&255,(H[i]>>>16)&255,(H[i]>>>8)&255,H[i]&255);return o}
function u8(s){s=unescape(encodeURIComponent(s));var o=[];for(var i=0;i<s.length;i++)o.push(s.charCodeAt(i));return o}
function hmac(k,msg){k=u8(k);if(k.length>64)k=sha256(k);var ip=[],op=[];for(var i=0;i<64;i++){var c=k[i]||0;ip.push(c^54);op.push(c^92)}return sha256(op.concat(sha256(ip.concat(u8(msg))))).map(function(x){return(x<16?'0':'')+x.toString(16)}).join('')}
var $=function(i){return document.getElementById(i)};var last={};var busy=false;
function hello(){return fetch('/adas/rchello',{cache:'no-store'}).then(function(r){return r.json()}).then(function(j){nonce=j.n||''})}
function signed(p){ctr=Math.max(Date.now(),ctr+1);return '/adas/rc/'+ctr+'.'+(key?'k':'p')+'.'+hmac(key||pin,nonce+'|'+ctr+'|'+p).slice(0,32)+'/'+p}
// (időkorláttal: egy elakadt kérés ne tartsa fel a parancsok sorát)
function api(p,again){if(!nonce){if(again)return Promise.reject(new Error('pin'));return hello().then(function(){return api(p,true)})}var c=window.AbortController?new AbortController():null,t=setTimeout(function(){if(c)c.abort()},6000);return fetch(signed(p),{cache:'no-store',signal:c?c.signal:undefined}).then(function(r){clearTimeout(t);if(r.status===403){if(!again){nonce='';return hello().then(function(){return api(p,true)})}throw new Error('pin')}if(r.status===429)throw new Error('wait');return r.json()},function(e){clearTimeout(t);throw e})}
function ask(msg){$('ui').hidden=true;$('tabs').hidden=true;$('pin').hidden=false;$('pinErr').textContent=msg||''}
function esc(s){return String(s||'').replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}
function toast(t){var e=$('toast');e.textContent=t;e.className='toast show';clearTimeout(e._t);e._t=setTimeout(function(){e.className='toast'},1400)}
function chBtns(list,empty){return (list||[]).map(function(f){return '<button data-c="play" data-a="'+esc(f.id)+'">'+(f.logo?'<img src="'+esc(f.logo)+'" alt="" onerror="this.remove()">':'')+'<span>'+esc(f.name)+(f.sub?'<small>'+esc(f.sub)+'</small>':'')+'</span></button>'}).join('')||'<small class="muted">'+empty+'</small>'}
function stBtns(list,empty){return (list||[]).map(function(f){return '<button data-c="rplay" data-a="'+esc(f.id)+'">'+(f.logo?'<img src="'+esc(f.logo)+'" alt="" onerror="this.remove()">':'')+'<span>'+esc(f.name)+(f.sub?'<small>'+esc(f.sub)+'</small>':'')+'</span></button>'}).join('')||'<small class="muted">'+empty+'</small>'}
function renderRadio(s){var r=s.radio,on=!!s.radioOn;$('radioTab').hidden=!on;[].forEach.call(document.querySelectorAll('.rnav'),function(b){b.hidden=!on});if(!on)return;
$('rnow').innerHTML=r?((r.logo?'<img src="'+esc(r.logo)+'" alt="" onerror="this.remove()">':'')+'<div class="tx"><b>'+esc(r.name)+'</b><small>'+esc(r.title||'')+'</small>'+(r.sleep?'<small>☾ '+r.sleep+' '+${JSON.stringify(_t('perc'))}+'</small>':'')+'</div>'):'<div class="tx"><small>'+${JSON.stringify(_t('Most nem szól rádió.'))}+'</small></div>';
$('rfavBtn').className=r&&r.fav?'on':'';$('rrecBtn').className=r&&r.rec?'on':'';$('rrecBtn').hidden=!s.canRecord;$('rfullBtn').className=r&&r.full?'on':'';$('rvisBtn').hidden=!s.radioVis;$('rsleepBtn').className=r&&r.sleep?'on':'';
if(document.activeElement!==$('rvol'))$('rvol').value=r?r.volume:1;
$('rfavs').innerHTML=stBtns(s.rfavs,${JSON.stringify(_t('Nincs kedvenc rádió.'))});$('rrecent').innerHTML=stBtns(s.rrecent,${JSON.stringify(_t('Még nincs.'))});var rr=s.rresults,rq=$('rq').value.trim();$('rresults').innerHTML=rr&&rr.q===rq&&rq?stBtns(rr.items,${JSON.stringify(_t('Nincs találat.'))}):''}
function applyTheme(t){if(!t)return;var r=document.documentElement.style;for(var k in t)if(Object.prototype.hasOwnProperty.call(t,k)&&k!=='light')r.setProperty('--'+k,t[k]);var m=document.querySelector('meta[name=theme-color]');if(m)m.setAttribute('content',t.bg)}
var MG={tv:'tv',guide:'tv',browse:'tv',recordings:'tv',radio:'radio','radio-guide':'radio',vod:'vod',sport:'sport',podcast:'podcast'};
function applyMenus(mn){if(!mn)return;[].forEach.call(document.querySelectorAll('[data-c=nav]'),function(b){var g=MG[b.dataset.a];b.hidden=!!(g&&mn[g]===false)})}
function renderPod(p){$('podBox').hidden=!p;if(!p)return;$('pnow').innerHTML='<div class="tx"><b></b><small></small></div>';$('pnow').querySelector('b').textContent=(p.playing?'▶ ':'❚❚ ')+p.title;$('pnow').querySelector('small').textContent=p.show||''}
function render(s){last=s;applyTheme(s.theme);applyMenus(s.menus);renderPod(s.pod);renderRadio(s);$('pfavBtn').className=s.fav?'on':'';$('precBtn').className=s.rec?'on':'';$('precBtn').hidden=!s.canRecord;$('miniBtn').hidden=!s.caps||!s.caps.mini;$('castBtn').hidden=!s.caps||!s.caps.cast;$('pin').hidden=true;$('ui').hidden=false;$('tabs').hidden=false;var n=s.now||(s.radio?{name:'📻 '+s.radio.name,title:s.radio.title,logo:s.radio.logo}:null);
$('now').innerHTML=n?((n.logo?'<img src="'+esc(n.logo)+'" alt="" onerror="this.remove()">':'')+'<div class="tx"><b>'+esc(n.name)+'</b><small>'+esc(n.title||'')+'</small>'+(n.next?'<small>'+${JSON.stringify(_t('Utána:'))}+' '+esc(n.next)+'</small>':'')+(n.progress!=null?'<div class="bar"><i style="width:'+Math.round(n.progress*100)+'%"></i></div>':'')+'</div>'):'<div class="tx"><b>'+esc(s.profile||'Adás')+'</b><small>'+${JSON.stringify(_t('Most nem megy semmi – válassz csatornát a Csatornák fülön, vagy nyomd meg a CH gombot.'))}+'</small></div>';
if(document.activeElement!==$('vol'))$('vol').value=!s.now&&s.radio?s.radio.volume:s.volume==null?1:s.volume;$('muteBtn').className=s.muted?'on':'';
$('favs').innerHTML=chBtns(s.favs,${JSON.stringify(_t('Nincs kedvenc csatorna.'))});$('recent').innerHTML=chBtns(s.recent,${JSON.stringify(_t('Még nincs.'))});var r=s.results,cq=$('q').value.trim();$('results').innerHTML=r&&r.q===cq&&cq?chBtns(r.items,${JSON.stringify(_t('Nincs találat.'))}):''}
function state(){if(!pin&&!key)return ask();api('state').then(render).catch(function(e){if(e.message==='wait')return ask(${JSON.stringify(_t('Túl sok hibás próbálkozás – várj néhány percet.'))});if(e.message==='pin'){try{localStorage.removeItem('adasPin');localStorage.removeItem('adasKey')}catch(x){}pin='';key='';ask(${JSON.stringify(_t('Hibás PIN, vagy a tévén / gépen új PIN készült. Olvasd be újra a QR-kódot, vagy írd be a PIN-t.'))})}})}
// A parancsok sorban mennek ki (egymás után, nem párhuzamosan) – így gyors mozdulatnál sem keverednek össze
var q0=Promise.resolve(),stT=0;
function send(c,a){q0=q0.then(function(){return api('cmd?c='+encodeURIComponent(c)+'&a='+encodeURIComponent(a==null?'':a))}).then(function(){clearTimeout(stT);stT=setTimeout(state,350)}).catch(function(){toast(${JSON.stringify(_t('Nincs kapcsolat'))})});return q0}
function cmd(c,a){if(navigator.vibrate)navigator.vibrate(12);return send(c,a)}
document.addEventListener('click',function(e){var t=e.target.closest('[data-t]');if(t){[].forEach.call(document.querySelectorAll('.tabs button'),function(b){b.className=b===t?'sel':''});[].forEach.call(document.querySelectorAll('.pane'),function(p){p.className='pane'+(p.id==='p-'+t.dataset.t?' sel':'')});return}
var b=e.target.closest('button[data-c]');if(!b)return;cmd(b.dataset.c,b.dataset.a)});
$('vol').addEventListener('input',function(){clearTimeout(this._t);var v=this.value;this._t=setTimeout(function(){cmd('vol',v)},120)});
$('rvol').addEventListener('input',function(){clearTimeout(this._t);var v=this.value;this._t=setTimeout(function(){cmd('rvol',v)},120)});
var rqt;$('rq').addEventListener('input',function(){clearTimeout(rqt);var v=this.value.trim();rqt=setTimeout(function(){if(!v)$('rresults').innerHTML='';cmd('rfind',v)},350)});
var qt;$('q').addEventListener('input',function(){clearTimeout(qt);var v=this.value.trim();qt=setTimeout(function(){if(!v)$('results').innerHTML='';cmd('find',v)},300)});
$('sendTxt').onclick=function(){var v=$('txt').value;if(v){cmd('text',v);$('txt').value='';toast(${JSON.stringify(_t('Elküldve'))})}};
$('searchTxt').onclick=function(){var v=$('txt').value.trim();if(v){cmd('search',v);toast(${JSON.stringify(_t('Keresés:'))}+' '+v)}};
// Érintőpad – két mód:
//  Egér: húzás = kurzor mozgatása a képernyőn, koppintás = kattintás, két ujjal húzás = görgetés
//  Nyilak: húzás = nyíl (minden ~40 px után egy lépés), koppintás = OK
//  Mindkettőben: hosszú nyomás = Vissza
(function(){var pad=$('pad'),dot=$('dot'),sx=0,sy=0,t0=0,moved=false,lp=null,two=false,STEP=40;
var mode='mouse';try{mode=localStorage.getItem('adasPad')||'mouse'}catch(e){}
var HINT={mouse:${JSON.stringify(_t('Húzd az ujjad: <b>kurzor</b> · Koppints: <b>kattintás</b><br>Két ujjal húzva: <b>görgetés</b> · Hosszan nyomva: <b>Vissza</b>'))},arrows:${JSON.stringify(_t('Húzd az ujjad: <b>mozgás</b> · Koppints: <b>OK</b><br>Hosszan nyomva: <b>Vissza</b>'))}};
function setMode(m){mode=m;try{localStorage.setItem('adasPad',m)}catch(e){};$('padHint').innerHTML=HINT[m];[].forEach.call(document.querySelectorAll('[data-pm]'),function(b){b.className=b.dataset.pm===m?'sel':''})}
setMode(mode);$('padMode').addEventListener('click',function(e){var b=e.target.closest('[data-pm]');if(b){setMode(b.dataset.pm);if(mode==='mouse')send('mouse','0,0')}});
// a mozgás összegyűjtve, egyszerre legfeljebb egy kérés úton (a sorrend és a sebesség így egyenletes)
var acc=[0,0],sacc=[0,0],inflight=false;
function flush(){if(inflight)return;if(acc[0]||acc[1]){var a=acc;acc=[0,0];inflight=true;send('mouse',Math.round(a[0])+','+Math.round(a[1])).then(function(){inflight=false;flush()});return}
if(sacc[0]||sacc[1]){var s=sacc;sacc=[0,0];inflight=true;send('scroll',Math.round(s[0])+','+Math.round(s[1])).then(function(){inflight=false;flush()})}}
function pos(e){var r=pad.getBoundingClientRect(),p=e.touches?e.touches[0]:e;return[p.clientX-r.left,p.clientY-r.top]}
function start(e){e.preventDefault();two=!!(e.touches&&e.touches.length>1);var p=pos(e);sx=p[0];sy=p[1];t0=Date.now();moved=false;dot.style.display='block';dot.style.left=sx+'px';dot.style.top=sy+'px';clearTimeout(lp);lp=setTimeout(function(){if(!moved){cmd('key','Escape');toast(${JSON.stringify(_t('Vissza'))});moved=true}},650)}
function move(e){if(!t0)return;e.preventDefault();if(e.touches&&e.touches.length>1)two=true;var p=pos(e),dx=p[0]-sx,dy=p[1]-sy;dot.style.left=p[0]+'px';dot.style.top=p[1]+'px';
if(mode==='mouse'){if(Math.abs(dx)+Math.abs(dy)>2){moved=true;clearTimeout(lp)}
// gyorsítás: lassú mozdulat = pontos, gyors = nagy ugrás
var sp=Math.sqrt(dx*dx+dy*dy),k=1.6+Math.min(3,sp/12);if(two){sacc[0]+=dx*3;sacc[1]+=dy*3}else{acc[0]+=dx*k;acc[1]+=dy*k}sx=p[0];sy=p[1];flush();return}
if(Math.abs(dx)>STEP||Math.abs(dy)>STEP){moved=true;clearTimeout(lp);var key=Math.abs(dx)>Math.abs(dy)?(dx>0?'ArrowRight':'ArrowLeft'):(dy>0?'ArrowDown':'ArrowUp');cmd('key',key);sx=p[0];sy=p[1]}}
// a még el nem küldött mozgás a sorba (a sor sorrendje garantálja, hogy a kattintás utána jön)
function drain(){if(acc[0]||acc[1]){var a=acc;acc=[0,0];send('mouse',Math.round(a[0])+','+Math.round(a[1]))}}
function end(e){if(!t0)return;e.preventDefault();if(e.touches&&e.touches.length)return;clearTimeout(lp);dot.style.display='none';if(!moved&&!two&&Date.now()-t0<500){if(mode==='mouse'){drain();cmd('click','')}else cmd('key','Enter')}t0=0}
pad.addEventListener('touchstart',start,{passive:false});pad.addEventListener('touchmove',move,{passive:false});pad.addEventListener('touchend',end,{passive:false});
pad.addEventListener('mousedown',start);window.addEventListener('mousemove',move);window.addEventListener('mouseup',end)})();
$('pinOk').onclick=function(){pin=$('pinIn').value.replace(/\\D/g,'');key='';try{localStorage.setItem('adasPin',pin);localStorage.removeItem('adasKey')}catch(e){}state()};
$('pinIn').addEventListener('keydown',function(e){if(e.key==='Enter')$('pinOk').click()});
state();setInterval(function(){if(document.visibilityState!=='hidden')state()},2500);
</script></body></html>`;
}

// a telefonról indított csatornakeresés találatai a keresőkifejezéssel (a következő állapottal mennek ki; a
// telefon csak a saját, aktuális kifejezéséhez tartozót rajzolja ki – egy elavult válasz nem hozza vissza)
let results = null; // { q, items } vagy null
let rresults = null; // rádió: { q, items } vagy null
let rfindSeq = 0;
const rfound = new Map(); // id → a találat teljes adóobjektuma (urls-szal)
async function findRadio(q) {
  const my = ++rfindSeq;
  if (!q) {
    rresults = null;
    return;
  }
  const item = (x) => ({ id: x.id, name: x.name, logo: /^https?:/.test(x.logo || '') ? x.logo : '', sub: [x.country, x.genres?.[0]].filter(Boolean).join(' · ') });
  rfound.clear();
  const local = radioSearch(q).slice(0, 20);
  local.forEach((x) => rfound.set(x.id, x));
  rresults = { q, items: local.map(item) };
  pushState();
  // a helyi találatok mellé az online adatbázis (Radio Browser) találatai
  try {
    const online = await searchRadioOnline(q);
    if (my !== rfindSeq) return;
    const seen = new Set(rresults.items.map((x) => x.id));
    const extra = online.filter((x) => !seen.has(x.id)).slice(0, 30 - rresults.items.length);
    extra.forEach((x) => rfound.set(x.id, x));
    rresults = { q, items: [...rresults.items, ...extra.map(item)] };
    pushState();
  } catch {}
}
const httpLogo = (c) => (/^https?:/.test(c?.logo || '') ? c.logo : '');
const chItem = (c) => ({ id: c.id, name: c.name, logo: httpLogo(c), sub: epg.now(c.id, Date.now())?.cur?.title || '' });

// (X07) a keresési találatok is minden küldéskor a profil szűrésén át – egy közben tiltott csatorna (pl. a gyerekprofil
// engedélyeinek változása után) a korábbi találati listából sem jut a telefonra
const shownResults = () => results && { ...results, items: results.items.filter((x) => { const c = catalog.byId.get(x.id); return c && contentAllowed(c); }) };

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
  // (X07) a kedvencek és az előzmények is a profil szűrésén át (gyerekprofil, felnőtt tartalom) – egy korábbi
  // felnőtt kedvenc vagy utólag tiltott csatorna neve és logója sem jut a telefonra
  const favs = getChannels(store.profile?.favorites || []).filter((c) => contentAllowed(c)).slice(0, 40).map(chItem);
  // rádió (a gyerekprofilban rejtett)
  const radioOn = radioMenuOn();
  const r = radioPlayer;
  const st = radioOn && r.active ? r.station : null;
  const radioNow = st
    ? {
        name: st.name,
        title: r.state === 'playing' ? r.now?.text || '' : r.state === 'paused' ? _t('Szünetel') : r.state === 'loading' ? _t('Csatlakozás…') : r.error || '',
        logo: /^https?:/.test(st.logo || '') ? st.logo : '',
        playing: r.state === 'playing',
        fav: isRadioFav(st.id),
        rec: !!recordingOf(st.id),
        full: radioFullOpen(),
        volume: fx().volume,
        sleep: r.sleepAt ? Math.max(1, Math.round((r.sleepAt - Date.now()) / 60e3)) : 0,
      }
    : null;
  const stItem = (x) => ({ id: x.id, name: x.name, logo: /^https?:/.test(x.logo || '') ? x.logo : '', sub: [x.country, x.genres?.[0]].filter(Boolean).join(' · ') });
  const ch0 = player.active ? player.channel : null;
  const recent = getChannels(store.profile?.recent || []).filter((c) => contentAllowed(c)).slice(0, 12).map(chItem);
  return JSON.stringify({
    now, favs, recent, results: shownResults(), volume: player.shownVolume(), muted: player.shownVolume() === 0, paused: video.paused, profile: store.profile?.name || '',
    fav: !!(ch0 && !ch0.vod && store.profile?.favorites?.includes(ch0.id)),
    rec: !!(ch0 && player.recHooks?.isRec?.(ch0.id)),
    canRecord,
    caps: { mini: !!api.caps?.mini, cast: !!player.castHooks?.available },
    radioOn, radioVis: audioFxAvailable, radio: radioNow,
    rfavs: radioOn ? radioFavs().slice(0, 40).map(stItem) : [],
    rrecent: radioOn ? radioRecent().slice(0, 12).map(stItem) : [],
    rresults: radioOn ? rresults : null,
    theme: themeVars(),
    menus: Object.fromEntries(['tv', 'radio', 'podcast', 'vod', 'sport'].map((id) => [id, menuOn(id)])),
    pod: podPlayer.active && podPlayer.ep ? { title: podPlayer.ep.title || '', show: podPlayer.ep.feedTitle || '', playing: podPlayer.playing || podPlayer.state === 'loading' } : null,
  });
}
/** Az aktív téma színei a távirányító lapjának (a téma és a színváltozat szerint, a kiemelőhöz illő felirattal). */
function themeVars() {
  const cs = getComputedStyle(document.body);
  const v = (n, d) => cs.getPropertyValue(n).trim() || d;
  return { a: v('--accent', '#e50914'), oa: v('--on-accent', '#fff'), bg: v('--bg', '#111'), c: v('--bg-2', '#1d1d1d'), c2: v('--bg-3', '#2a2a2a'), t: v('--text', '#eee'), m: v('--muted', '#9a9a9a'), ln: v('--line', '#2a2a2a'), r: Math.min(18, parseFloat(v('--radius', '14')) || 14) + 'px' };
}
const pushState = () => info && api.rcState(stateJson());

/** Billentyű küldése a kijelölt elemnek – ugyanúgy, mintha a távirányítón nyomták volna meg. */
function key(k) {
  const t = document.activeElement || document.body;
  const ev = new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true });
  t.dispatchEvent(ev);
  // (rövid nyomás: a felengedés is – a keyup-ra induló elemek, pl. a rádiókártya, különben hosszú nyomásnak vennék)
  const up = new KeyboardEvent('keyup', { key: k, bubbles: true, cancelable: true });
  t.dispatchEvent(up);
  if (k === 'Enter' && !ev.defaultPrevented && !up.defaultPrevented && t !== document.body && t.click) t.click();
}

/**
 * Szöveg a kijelölt beviteli mezőbe (B20): a kijelölt rész helyére, illetve a kurzorhoz – mint a gépelés; a
 * hosszkorlát (maxlength) érvényes, csak olvasható / tiltott mezőbe nem ír. Ahol a mező nem támogat
 * kijelölést (pl. e-mail, szám), a végéhez fűz. Ha nincs kijelölt mező: keresés az Adásban.
 */
function typeText(text) {
  const el = document.activeElement;
  if (!el?.matches?.('input:not([type=checkbox]):not([type=range]):not([type=radio]), textarea')) return search(text);
  if (el.readOnly || el.disabled) return;
  const v = el.value || '';
  let a = null;
  let b = null;
  try {
    a = el.selectionStart;
    b = el.selectionEnd;
  } catch {}
  if (a == null || b == null) a = b = v.length;
  const max = Number.isInteger(el.maxLength) && el.maxLength >= 0 ? el.maxLength : Infinity; // (-1: nincs korlát; 0 is korlát)
  const ins = String(text).slice(0, Math.max(0, max - (v.length - (b - a))));
  try {
    el.setRangeText(ins, a, b, 'end');
  } catch {
    el.value = v.slice(0, a) + ins + v.slice(b);
  }
  el.dispatchEvent(new Event('input', { bubbles: true }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
}
function search(q) {
  if (player.active) player.close();
  location.hash = '#/search?q=' + encodeURIComponent(q);
}

/** Csatornakeresés a telefonról: név (más név) szerint, a látható csatornák között, a hazaiak elöl. */
function findChannels(q) {
  const t = norm(q).split(/\s+/).filter(Boolean);
  if (!t.length) return (results = null);
  // (az elérhetők elöl)
  results = {
    q: String(q).trim(),
    items: byAvailability(visible().filter((c) => t.every((w) => c.search.includes(w))))
      .slice(0, 30)
      .map(chItem),
  };
}

const NAV = /^(home|tv|guide|vod|favorites|browse|recordings|help|search|radio|radio-guide|sport|podcast)$/;
const NAV_HASH = { 'radio-guide': 'radio?tab=guide' };

// ---------------------------------------------------------------------------
// Egérkurzor a telefon érintőpadjáról: húzás = mozgatás, koppintás = kattintás, két ujjal = görgetés.
// A kurzor alatti elem kijelölést kap (mint a billentyűs navigációnál) – így a kártyák kiemelése,
// az előnézet és az Enter is ugyanúgy működik, mint egérrel.
// ---------------------------------------------------------------------------
const cur = { el: null, x: 0, y: 0, hideT: 0, over: null };
const CLICKABLE = 'a[href], button, input, select, textarea, label, [tabindex], [data-c], [data-play], .card, .vcard, .tile';
function cursorEl() {
  if (cur.el?.isConnected) return cur.el;
  cur.el = document.createElement('div');
  cur.el.id = 'rc-cursor';
  // a téma színeire épülő kör, lágyan pulzáló belsővel – „itt jár az ujjam” (a közepe a kattintási pont)
  cur.el.innerHTML = '<i></i>';
  document.body.append(cur.el);
  cur.x = innerWidth / 2;
  cur.y = innerHeight / 2;
  return cur.el;
}
function showCursor() {
  const el = cursorEl();
  el.style.transform = `translate(${cur.x}px, ${cur.y}px)`;
  el.classList.add('show');
  document.body.classList.add('rc-nav');
  clearTimeout(cur.hideT);
  cur.hideT = setTimeout(() => el.classList.remove('show'), 6000);
}
/** A kurzor alatti elem (a kurzor maga nem fogja meg a pontot: pointer-events: none). */
const under = () => document.elementFromPoint(Math.round(cur.x), Math.round(cur.y));
function moveCursor(dx, dy) {
  cur.x = Math.min(innerWidth - 2, Math.max(0, cur.x + dx));
  cur.y = Math.min(innerHeight - 2, Math.max(0, cur.y + dy));
  showCursor();
  const t = under();
  // lejátszás közben a mozgás előhozza a vezérlőket
  if (player.active) player.poke?.();
  const target = t?.closest(CLICKABLE);
  if (target && target !== cur.over) {
    cur.over = target;
    if (target.matches('input, select, textarea')) return; // beviteli mezőre csak kattintásra lép (ne nyíljon billentyűzet)
    const f = target.matches('[tabindex], a[href], button') ? target : target.querySelector('a[href], button, [tabindex]') || target;
    f.focus?.({ preventScroll: true });
  } else if (!target) cur.over = null;
}
function clickCursor() {
  showCursor();
  const t = under();
  if (!t) return;
  const target = t.closest(CLICKABLE) || t;
  if (target.matches('input, select, textarea')) return target.focus();
  for (const type of ['pointerdown', 'mousedown', 'pointerup', 'mouseup']) target.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true, clientX: cur.x, clientY: cur.y }));
  target.click();
}
/** Görgetés a kurzor alatti görgethető elemben (pl. egy sor vízszintesen), különben az oldalon. */
function scrollCursor(dx, dy) {
  showCursor();
  let el = under();
  const can = (e) => {
    const s = getComputedStyle(e);
    const y = Math.abs(dy) > Math.abs(dx);
    return y ? /(auto|scroll)/.test(s.overflowY) && e.scrollHeight > e.clientHeight + 2 : /(auto|scroll)/.test(s.overflowX) && e.scrollWidth > e.clientWidth + 2;
  };
  while (el && el !== document.body && !can(el)) el = el.parentElement;
  (el && el !== document.body ? el : document.scrollingElement || document.documentElement).scrollBy({ left: dx, top: dy });
}

/** A rádió szól-e (és nincs nyitva videó) – ilyenkor a hangerő, a szünet és a csatornaváltás a rádióé. */
const radioLive = () => radioPlayer.active && !player.active;
const SLEEP_STEPS = [0, 15, 30, 60, 90];
let radioMutedVol = 0;

async function command({ c, a }) {
  const live = player.active;
  // a vezérlő fül közös gombjai rádiózás közben a rádióra hatnak
  if (radioLive() && (c === 'toggle' || c === 'chup' || c === 'chdown' || c === 'vol' || c === 'volup' || c === 'voldown' || c === 'mute')) {
    if (c === 'toggle') radioPlayer.toggle();
    else if (c === 'chup' || c === 'chdown') radioPlayer.step(c === 'chup' ? -1 : 1);
    else if (c === 'vol' && Number.isFinite(Number(a))) radioPlayer.setVolume(Math.min(1, Math.max(0, Number(a))));
    else if (c === 'volup' || c === 'voldown') radioPlayer.setVolume(Math.min(1, Math.max(0, fx().volume + (c === 'volup' ? 0.08 : -0.08))));
    else if (c === 'mute') {
      // (feloldáskor a némítás előtti hangerő jön vissza)
      if (fx().volume > 0) {
        radioMutedVol = fx().volume;
        radioPlayer.setVolume(0);
      } else radioPlayer.setVolume(radioMutedVol || 0.8);
    }
    setTimeout(pushState, 250);
    return;
  }
  if (c.startsWith('r') && /^r(play|toggle|prev|next|stop|fav|rec|vol|full|vis|sleep|find)$/.test(c)) {
    await radioCommand(c, a);
    setTimeout(pushState, 250);
    return;
  }
  switch (c) {
    case 'pfav':
      if (live && !player.channel.vod) {
        const on = store.toggleFavorite(player.channel.id);
        toast(on ? _t('{name} hozzáadva a kedvencekhez', { name: player.channel.name }) : _t('{name} eltávolítva a kedvencek közül', { name: player.channel.name }));
      }
      break;
    case 'prec':
      if (live) player.recHooks?.toggle();
      break;
    case 'key':
      if (/^(Arrow(Up|Down|Left|Right)|Enter|Escape|Backspace)$/.test(a)) {
        document.body.classList.add('rc-nav'); // a kijelölés kerete látsszon (programból küldött billentyűnél a böngésző nem rajzolná)
        key(a);
      }
      break;
    case 'mouse':
    case 'scroll': {
      const [dx, dy] = String(a || '').split(',').map(Number);
      if (!Number.isFinite(dx) || !Number.isFinite(dy)) break;
      const lim = (v) => Math.max(-2000, Math.min(2000, v));
      c === 'mouse' ? moveCursor(lim(dx), lim(dy)) : scrollCursor(lim(dx), lim(dy));
      return; // gyakori, apró parancs: nem küldünk utána állapotot
    }
    case 'click':
      clickCursor();
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
      if (live) player.setVolume(player.curVolume() + (c === 'volup' ? 0.08 : -0.08));
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
      if (live) player.toggleMute();
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
      // csak a profilban látható csatornák (gyerekprofil, felnőtt tartalom) – a lejátszás őre is ellenőrzi
      const ch = catalog.byId.get(a);
      if (ch && visible([ch]).length) player.play(ch);
      break;
    }
    case 'nav':
      if (!NAV.test(a)) break;
      if ((a === 'radio' || a === 'radio-guide') && !radioMenuOn()) break; // (gyerekprofilban nincs rádió)
      // (kikapcsolt menüpont: oda nem ugrik – a gomb sem látszik a távirányítón)
      if (!menuOn({ guide: 'tv', browse: 'tv', recordings: 'tv', 'radio-guide': 'radio' }[a] || a)) break;
      if (live) player.close();
      location.hash = '#/' + (NAV_HASH[a] || a);
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
      else if (a === 'mini' && api.caps?.mini) player.setMini(!player.mini);
      else if (a === 'cast' && player.castHooks?.available) player.castHooks.menu();
     
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

/** A rádió parancsai a telefonról (a gyerekprofilban nincs rádió). */
async function radioCommand(c, a) {
  if (!radioMenuOn()) return;
  const r = radioPlayer;
  const st = r.station;
  switch (c) {
    case 'rplay': {
      // a betöltött adók, a kedvencek / előzmények, ill. a keresés teljes (urls-os) találata
      const x = radio.byId.get(a) || [...radioFavs(), ...radioRecent()].find((y) => y.id === a) || rfound.get(a);
      if (!x) break;
      const s0 = x.urls?.length ? x : stationFrom(x);
      if (s0?.urls?.length) r.play(s0, radioFavs().some((y) => y.id === s0.id) ? radioFavs() : null);
      break;
    }
    case 'ptoggle':
      if (podPlayer.active) podPlayer.toggle();
      break;
    case 'pback':
      if (podPlayer.active) podPlayer.skip(-(podCfg().skipBack || 10));
      break;
    case 'pfwd':
      if (podPlayer.active) podPlayer.skip(podCfg().skipFwd || 30);
      break;
    case 'pnext':
      if (podPlayer.active) podPlayer.next();
      break;
    case 'rtoggle':
      if (r.active) r.toggle();
      else {
        const last = radioRecent()[0] || radioFavs()[0];
        if (last) r.play(last);
      }
      break;
    case 'rprev':
    case 'rnext':
      if (r.active) r.step(c === 'rnext' ? 1 : -1);
      break;
    case 'rstop':
      closeRadioFull();
      if (r.active) r.stop();
      break;
    case 'rfav':
      if (st) {
        const on = toggleRadioFav(st);
        toast(on ? _t('{name} hozzáadva a kedvencekhez', { name: st.name }) : _t('{name} eltávolítva a kedvencek közül', { name: st.name }));
      }
      break;
    case 'rrec':
      if (st && canRecord) await toggleRadioRecording(st).catch(() => {});
      break;
    case 'rvol': {
      const v = Number(a);
      if (Number.isFinite(v)) r.setVolume(Math.min(1, Math.max(0, v)));
      break;
    }
    case 'rfull':
      if (!r.active) break;
      if (radioFullOpen()) closeRadioFull();
      else document.dispatchEvent(new Event('adas-radio-expand'));
      break;
    case 'rvis': {
      if (!audioFxAvailable) break;
      const ids = VIS_MODES.map(([id]) => id);
      const next = ids[(ids.indexOf(fx().vis) + 1) % ids.length];
      setFx({ vis: next });
      toast(`${_t('Hangkép')}: ${VIS_MODES.find(([id]) => id === next)?.[1] || next}`);
      break;
    }
    case 'rsleep': {
      if (!r.active) break;
      const left = r.sleepAt ? Math.round((r.sleepAt - Date.now()) / 60e3) : 0;
      const next = SLEEP_STEPS.find((m) => m > left) || 0;
      r.setSleep(next);
      toast(next ? _t('A rádió {m} perc múlva elhalkul és kikapcsol.', { m: next }) : _t('Elalvás-időzítő kikapcsolva'));
      break;
    }
    case 'rfind':
      findRadio(String(a || '').slice(0, 100));
      break;
  }
}

export async function startRemote() {
  if (!canRemote) return null;
  const s = store.settings;
  if (!/^\d{4}$/.test(s.remotePin || '')) {
    s.remotePin = newPin();
    store.save();
  }
  if (!/^[0-9a-f]{32}$/.test(s.remoteKey || '')) {
    s.remoteKey = newKey();
    store.save();
  }
  // (a PIN-es mód alapból ki van kapcsolva: a titkosítatlan helyi hálózaton egyetlen lehallgatott kérésből a 4 jegyű
  // PIN-nel aláírt kérés kulcsa – a PIN – percek alatt kitalálható; a QR-kódos 128 bites kulcs nem utazik a hálózaton)
  const pinOn = s.remotePinOn === true;
  info = await api.rcStart(pageHtml(pinOn), pinOn ? s.remotePin : '', s.remoteKey);
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
  // (téma / színváltozat / elrendezés: a body jelölése és a változók változnak – egyszerre egyszer)
  let themeT = 0;
  new MutationObserver(() => {
    clearTimeout(themeT);
    themeT = setTimeout(pushState, 250);
  }).observe(document.body, { attributes: true, attributeFilter: ['data-theme', 'data-variant', 'data-tone', 'style'] });
  bus.on('pod-player', (k) => (k === 'state' || k === 'start' || k === 'stop') && pushState());
  bus.on('settings', (k) => /Menu$/.test(k) && pushState());
  // (profil- vagy jogosultságváltáskor a korábbi keresési találatok sem maradnak a telefonon)
  bus.on('profile', () => {
    results = null;
    rresults = null;
    pushState();
  });
  bus.on('settings', (k) => (k === 'showAdult' || k === 'kidsMarks') && ((results = null), pushState()));
  setInterval(pushState, 15000);
  // bekapcsolt távirányító: indításkor elindul (kicsit később, hogy a lista betöltődjön)
  setTimeout(() => store.settings.remoteOn && startRemote().catch(() => {}), 4000);
}

/**
 * Gyorscsatlakozás (Főoldal → 📱 Távirányító): kis ablak a QR-kóddal, címmel és PIN-nel. Ha a
 * távirányító ki volt kapcsolva, bekapcsolja (és bekapcsolva is marad, mint a Beállításokban).
 */
export async function openRemoteDialog() {
  if (!canRemote) return;
  const s = store.settings;
  const box = document.createElement('div');
  box.className = 'rc-dialog';
  box.innerHTML = `<p class="muted">${_t('Indítás…')}</p>`;
  openModal(box, { cls: 'rc-modal' });
  if (!s.remoteOn || !info) {
    s.remoteOn = true;
    store.save();
    try {
      await startRemote();
    } catch (err) {
      s.remoteOn = false;
      store.save();
      box.innerHTML = `<p class="warn">${_t('A távirányító nem indult el: {esc}', { esc: esc(err.message || err) })}</p>`;
      return;
    }
  }
  if (box.isConnected) renderRemoteSettings(box);
}

// ---------------------------------------------------------------------------
// Beállítások → Távirányító és billentyűk → Távirányító telefonról
// ---------------------------------------------------------------------------
let qrPick = 0; // a QR-kódba kerülő cím sorszáma (több hálózati cím esetén választható)
export function renderRemoteSettings(box) {
  if (!canRemote || !box) return box?.remove();
  const s = store.settings;
  const draw = () => {
    const urls = (info?.addresses || []).map((ip) => `http://${ip}${info.port === 80 ? '' : ':' + info.port}/adas/remote`);
    box.innerHTML = `<h2>${_t('Távirányító telefonról')} <button class="help-link" data-help="remote" title="${_t('Súgó')}">?</button></h2>
      <label class="setting"><span>${_t('<b>Vezérlés telefonról vagy más eszköz böngészőjéből</b>')}<small>${_t('Érintőpad és nyilak, OK / Vissza, csatornaváltás, hangerő, tekerés, felirat, csatornakereső, kedvencek, szövegbevitel – ugyanazon a (otthoni) hálózaton.')}</small></span>
        <input type="checkbox" class="switch" data-rc="on" ${s.remoteOn ? 'checked' : ''} /></label>
      ${s.remoteOn
          ? info
            ? `<div class="share-box rc-box">
                <div class="rc-qr" title="${_t('Olvasd be a telefon kamerájával')}">${(() => {
                  if (!urls.length) return ''; // nincs hálózati cím: üres QR-t nem rajzolunk
                  try {
                    return qrSvg(`${urls[Math.min(qrPick, urls.length - 1)]}#k=${s.remoteKey}`, { px: 5 });
                  } catch {
                    return '';
                  }
                })()}</div>
                <div class="rc-text">
                  <div>${_t('<b>Olvasd be a QR-kódot a telefon kamerájával</b> – a lap megnyílik, és egy titkos kulcsot is megkap (ez a legbiztonságosabb, semmit nem kell begépelni).')}</div>
                  ${urls.length ? `<div class="muted small">${_t('Vagy nyisd meg a telefon böngészőjében:')}</div>${urls.map((u, i) => (urls.length > 1 ? `<button class="rc-url ${i === Math.min(qrPick, urls.length - 1) ? 'on' : ''}" data-rcip="${i}" title="${_t('Ez legyen a QR-kódban')}">${esc(u)}</button>` : `<code class="rc-url">${esc(u)}</code>`)).join('')}${urls.length > 1 ? `<div class="muted small">${_t('Ha a telefon nem éri el, válaszd a másik címet – a QR-kód ahhoz készül.')}</div>` : ''}` : `<div class="warn small">${_t('⚠ Nem található hálózati cím – csatlakozz egy (otthoni) hálózathoz, majd kapcsold ki és be a távirányítót.')}</div>`}
                  <label class="setting"><span>${_t('<b>Belépés PIN-kóddal is</b>')}<small>${_t('Kevésbé biztonságos: a helyi hálózatot lehallgató eszköz a PIN-t kitalálhatja. Csak a saját, otthoni hálózatodon kapcsold be, ha a QR-kód nem használható.')}</small></span>
                    <input type="checkbox" class="switch" data-rc="pinon" ${s.remotePinOn === true ? 'checked' : ''} /></label>
                  ${s.remotePinOn === true ? `<div>${_t('PIN:')} <span class="share-code rc-pin">${esc(s.remotePin)}</span></div>` : ''}
                  <div class="muted small">${_t('Tipp: a telefonon tedd ki a lapot a kezdőképernyőre, így alkalmazásként indul. Első alkalommal a Windows tűzfal engedélyt kérhet. Ha több cím látszik, azt válaszd, amelyik a telefonéval egy hálózaton van (a QR-kód az elsőt tartalmazza).')}</div>
                  ${api.platform === 'desktop' && !/Windows/i.test(navigator.userAgent) ? `<div class="muted small">${_t('Ha a telefon böngészője szerint „a kapcsolódás sikertelen”: a gép tűzfala tilthatja – engedélyezd a {port}-as TCP-portot (pl. Linuxon: sudo ufw allow {port}/tcp).', { port: info.port })} <button class="btn small" data-help="remote">${_t('Súgó: kapcsolódás, tűzfal')}</button></div>` : ''}
                  <div class="inline"><button class="btn small" data-rc="pin">${s.remotePinOn === true ? _t('Új PIN') : _t('Új kulcs (a párosított telefonok kiesnek)')}</button></div>
                </div></div>`
            : `<p class="muted small">${_t('Indítás…')}</p>`
          : ''}`;
  };
  box.addEventListener('click', (e) => {
    const b = e.target.closest('[data-rcip]');
    if (!b) return;
    qrPick = Number(b.dataset.rcip) || 0;
    draw();
    box.querySelector(`[data-rcip="${qrPick}"]`)?.focus();
  });
  box.onchange = async (e) => {
    if (e.target.dataset.rc === 'pinon') {
      e.stopPropagation();
      s.remotePinOn = e.target.checked;
      store.save();
      await startRemote().catch(() => {});
      return draw();
    }
    if (e.target.dataset.rc !== 'on') return;
    e.stopPropagation();
    s.remoteOn = e.target.checked;
    store.save();
    try {
      if (s.remoteOn) await startRemote();
      else await stopRemote();
    } catch (err) {
      toast(`${_t('A távirányító nem indult el:')} ` + (err.message || err));
      s.remoteOn = false;
      store.save();
    }
    draw();
  };
  box.onclick = async (e) => {
    if (e.target.closest('[data-rc="pin"]')) {
      e.stopPropagation();
      s.remotePin = newPin();
      s.remoteKey = newKey(); // a régi QR-kóddal párosított telefonok is kiesnek
      store.save();
      await startRemote();
      draw();
    }
  };
  draw();
  if (s.remoteOn && !info) startRemote().then(draw, () => {});
}
