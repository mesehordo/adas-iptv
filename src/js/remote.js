// Távirányító telefonról (vagy bármilyen böngészőből a helyi hálózaton): az alkalmazás kis kiszolgálója
// (asztali: lan.js, Android: LanServer) egy vezérlőlapot ad – http://<cím>:47800/adas/remote –, ami PIN-nel
// küld parancsokat (csatornaváltás, hangerő, nyilak, OK / Vissza, számok, kedvencek), és kiírja, mi megy.
import { $, esc, toast, bus, norm } from './util.js';
import { api } from './api.js';
import { store } from './store.js';
import { catalog, getChannels, visible } from './catalog.js';
import { epg } from './epg.js';
import { player } from './player.js';
import { openInfo, openModal } from './components.js';
import { toggleStreamInfo } from './streaminfo.js';
import { qrSvg } from './qr.js';

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
function pageHtml() {
  return `<!doctype html><html lang="${uiLang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover">
<meta name="theme-color" content="#111"><meta name="apple-mobile-web-app-capable" content="yes"><meta name="mobile-web-app-capable" content="yes"><title>${_t('Adás – távirányító')}</title><style>
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
.seg{display:flex;gap:6px;margin-bottom:8px}.seg button{flex:1;font-size:14px;padding:9px 0}.seg button.sel{background:var(--a);color:#fff;font-weight:700}
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
<div id="pin" class="pin" hidden><h1 style="color:var(--a);margin:0">${_t('ADÁS')}</h1><p>${_t('Írd be a tévén / gépen látható 4 jegyű PIN-t<br>')}<small class="muted">${_t('(vagy olvasd be a QR-kódot: Beállítások → Távirányító és billentyűk → Távirányító telefonról)')}</small></p>
<input id="pinIn" inputmode="numeric" maxlength="4" autocomplete="off"><button class="ok" id="pinOk">${_t('Csatlakozás')}</button><div class="err" id="pinErr"></div></div>
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
<div class="pane" id="p-go">
 <h2>${_t('Ugrás')}</h2>
 <div class="row r3"><button data-c="nav" data-a="home" class="sm">${_t('⌂ Főoldal')}</button><button data-c="nav" data-a="tv" class="sm">${_t('📺 TV')}</button><button data-c="nav" data-a="guide" class="sm">${_t('☰ Műsorújság')}</button>
 <button data-c="nav" data-a="favorites" class="sm">${_t('★ Kedvencek')}</button><button data-c="nav" data-a="vod" class="sm">${_t('🎬 VOD')}</button><button data-c="nav" data-a="recordings" class="sm">${_t('● Felvételek')}</button>
 <button data-c="nav" data-a="browse" class="sm">${_t('⌕ Böngészés')}</button><button data-c="nav" data-a="help" class="sm">${_t('? Súgó')}</button><button data-c="menu" data-a="close" class="sm">${_t('✕ Lejátszó bezárása')}</button></div>
 <h2>${_t('Szöveg küldése')}</h2>
 <input class="q" id="txt" type="text" placeholder="${_t('Keresés az Adásban / gépelés a kijelölt mezőbe')}" autocomplete="off">
 <div class="row r3"><button id="sendTxt" class="ok sm">${_t('Küldés')}</button><button id="searchTxt" class="sm">${_t('⌕ Keresés')}</button><button data-c="key" data-a="Backspace" class="sm">${_t('⌫ Törlés')}</button></div>
 <h2>${_t('Lejátszó')}</h2>
 <div class="row r3"><button data-c="menu" data-a="stats" class="sm">${_t('📊 Adás adatai')}</button><button data-c="menu" data-a="multi" class="sm">${_t('▦ Több adás')}</button><button data-c="menu" data-a="sleep" class="sm">${_t('☾ Időzítő')}</button></div>
 <p class="muted">${_t('Tipp: a böngésző menüjében „Hozzáadás a kezdőképernyőhöz” – így alkalmazásként indul.')}</p>
</div>
</div>
<nav class="tabs" id="tabs" hidden><button data-t="ctl" class="sel"><span>🎮</span>${_t('Vezérlő')}</button><button data-t="ch"><span>📺</span>${_t('Csatornák')}</button><button data-t="go"><span>☰</span>${_t('Továbbiak')}</button></nav>
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
function render(s){last=s;$('pin').hidden=true;$('ui').hidden=false;$('tabs').hidden=false;var n=s.now;
$('now').innerHTML=n?((n.logo?'<img src="'+esc(n.logo)+'" alt="" onerror="this.remove()">':'')+'<div class="tx"><b>'+esc(n.name)+'</b><small>'+esc(n.title||'')+'</small>'+(n.next?'<small>'+${JSON.stringify(_t('Utána:'))}+' '+esc(n.next)+'</small>':'')+(n.progress!=null?'<div class="bar"><i style="width:'+Math.round(n.progress*100)+'%"></i></div>':'')+'</div>'):'<div class="tx"><b>'+esc(s.profile||'Adás')+'</b><small>'+${JSON.stringify(_t('Most nem megy semmi – válassz csatornát a Csatornák fülön, vagy nyomd meg a CH gombot.'))}+'</small></div>';
if(document.activeElement!==$('vol'))$('vol').value=s.volume==null?1:s.volume;$('muteBtn').className=s.muted?'on':'';
$('favs').innerHTML=chBtns(s.favs,${JSON.stringify(_t('Nincs kedvenc csatorna.'))});$('recent').innerHTML=chBtns(s.recent,${JSON.stringify(_t('Még nincs.'))});if(s.results)$('results').innerHTML=chBtns(s.results,${JSON.stringify(_t('Nincs találat.'))})}
function state(){if(!pin&&!key)return ask();api('state').then(render).catch(function(e){if(e.message==='wait')return ask(${JSON.stringify(_t('Túl sok hibás próbálkozás – várj néhány percet.'))});if(e.message==='pin'){try{localStorage.removeItem('adasPin');localStorage.removeItem('adasKey')}catch(x){}pin='';key='';ask(${JSON.stringify(_t('Hibás PIN, vagy a tévén / gépen új PIN készült. Olvasd be újra a QR-kódot, vagy írd be a PIN-t.'))})}})}
// A parancsok sorban mennek ki (egymás után, nem párhuzamosan) – így gyors mozdulatnál sem keverednek össze
var q0=Promise.resolve(),stT=0;
function send(c,a){q0=q0.then(function(){return api('cmd?c='+encodeURIComponent(c)+'&a='+encodeURIComponent(a==null?'':a))}).then(function(){clearTimeout(stT);stT=setTimeout(state,350)}).catch(function(){toast(${JSON.stringify(_t('Nincs kapcsolat'))})});return q0}
function cmd(c,a){if(navigator.vibrate)navigator.vibrate(12);return send(c,a)}
document.addEventListener('click',function(e){var t=e.target.closest('[data-t]');if(t){[].forEach.call(document.querySelectorAll('.tabs button'),function(b){b.className=b===t?'sel':''});[].forEach.call(document.querySelectorAll('.pane'),function(p){p.className='pane'+(p.id==='p-'+t.dataset.t?' sel':'')});return}
var b=e.target.closest('button[data-c]');if(!b)return;cmd(b.dataset.c,b.dataset.a)});
$('vol').addEventListener('input',function(){clearTimeout(this._t);var v=this.value;this._t=setTimeout(function(){cmd('vol',v)},120)});
var qt;$('q').addEventListener('input',function(){clearTimeout(qt);var v=this.value.trim();qt=setTimeout(function(){if(v)cmd('find',v);else{$('results').innerHTML=''}},300)});
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

async function command({ c, a }) {
  const live = player.active;
  switch (c) {
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
      // csak a profilban látható csatornák (gyerekprofil, felnőtt tartalom) – a lejátszás őre is ellenőrzi
      const ch = catalog.byId.get(a);
      if (ch && visible([ch]).length) player.play(ch);
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
  if (!/^[0-9a-f]{32}$/.test(s.remoteKey || '')) {
    s.remoteKey = newKey();
    store.save();
  }
  info = await api.rcStart(pageHtml(), s.remotePin, s.remoteKey);
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
                    return qrSvg(`${urls[0]}#k=${s.remoteKey}`, { px: 5 });
                  } catch {
                    return '';
                  }
                })()}</div>
                <div class="rc-text">
                  <div>${_t('<b>Olvasd be a QR-kódot a telefon kamerájával</b> – a lap megnyílik, és egy titkos kulcsot is megkap (ez a legbiztonságosabb, semmit nem kell begépelni).')}</div>
                  ${urls.length ? `<div class="muted small">${_t('Vagy nyisd meg a telefon böngészőjében:')}</div>${urls.map((u) => `<code class="rc-url">${esc(u)}</code>`).join('')}` : `<div class="warn small">${_t('⚠ Nem található hálózati cím – csatlakozz egy (otthoni) hálózathoz, majd kapcsold ki és be a távirányítót.')}</div>`}
                  <div>${_t('PIN:')} <span class="share-code rc-pin">${esc(s.remotePin)}</span></div>
                  <div class="muted small">${_t('Tipp: a telefonon tedd ki a lapot a kezdőképernyőre, így alkalmazásként indul. Első alkalommal a Windows tűzfal engedélyt kérhet. Ha több cím látszik, azt válaszd, amelyik a telefonéval egy hálózaton van (a QR-kód az elsőt tartalmazza).')}</div>
                  <div class="inline"><button class="btn small" data-rc="pin">${_t('Új PIN')}</button></div>
                </div></div>`
            : `<p class="muted small">${_t('Indítás…')}</p>`
          : ''}`;
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
