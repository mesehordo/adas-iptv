// Távirányító telefonról (vagy bármilyen böngészőből a helyi hálózaton): az alkalmazás kis kiszolgálója
// (asztali: lan.js, Android: LanServer) egy vezérlőlapot ad – http://<cím>:47800/adas/remote –, ami PIN-nel
// küld parancsokat (csatornaváltás, hangerő, nyilak, OK / Vissza, számok, kedvencek), és kiírja, mi megy.
import { $, esc, toast, bus } from './util.js';
import { api } from './api.js';
import { store } from './store.js';
import { catalog, getChannels } from './catalog.js';
import { epg } from './epg.js';
import { player } from './player.js';

export const canRemote = !!api.rcStart;
const video = $('#video');
let info = null; // { port, addresses }

const newPin = () => String(Math.floor(1000 + Math.random() * 9000));

/** A telefonon megnyíló vezérlőlap (önálló HTML, külső fájlok nélkül). */
function pageHtml() {
  return `<!doctype html><html lang="hu"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<meta name="theme-color" content="#111"><title>Adás – távirányító</title><style>
*{box-sizing:border-box;-webkit-tap-highlight-color:transparent}body{margin:0;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;background:#111;color:#eee;padding:14px 14px 30px;max-width:520px;margin:0 auto}
h1{font-size:18px;margin:0 0 10px;color:#e50914;letter-spacing:.06em}.now{background:#1d1d1d;border-radius:12px;padding:12px;margin-bottom:14px;min-height:58px}.now b{display:block;font-size:16px}.now small{color:#aaa}
.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:12px}button{font:inherit;border:0;border-radius:12px;background:#262626;color:#eee;padding:16px 0;font-size:18px;touch-action:manipulation}button:active{background:#e50914}
.ok{background:#e50914;font-weight:700}.wide{grid-column:span 3}.row2{grid-column:span 1}.small{font-size:14px;padding:12px 0}
h2{font-size:14px;color:#aaa;margin:18px 0 8px;text-transform:uppercase;letter-spacing:.05em}.favs{display:grid;grid-template-columns:repeat(2,1fr);gap:8px}.favs button{font-size:14px;padding:12px 8px;text-align:left;display:flex;gap:8px;align-items:center;min-width:0}
.favs img{width:34px;height:22px;object-fit:contain;flex:none}.favs span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.pin{display:flex;flex-direction:column;gap:10px;margin-top:30px}.pin input{font-size:28px;text-align:center;letter-spacing:.3em;padding:12px;border-radius:12px;border:1px solid #444;background:#1d1d1d;color:#fff}.err{color:#ff6b6b;min-height:1.2em}
</style></head><body><h1>ADÁS · távirányító</h1>
<div id="pin" class="pin" hidden><p>Írd be a tévén / gépen látható 4 jegyű PIN-t<br><small style="color:#aaa">(Beállítások → Távirányító telefonról)</small></p><input id="pinIn" inputmode="numeric" maxlength="4" autocomplete="off"><button class="ok" id="pinOk">Csatlakozás</button><div class="err" id="pinErr"></div></div>
<div id="ui" hidden><div class="now" id="now"><small>Csatlakozás…</small></div>
<div class="grid"><button data-c="chup">CH ▲</button><button data-c="key" data-a="ArrowUp">▲</button><button data-c="volup">VOL +</button>
<button data-c="key" data-a="ArrowLeft">◀</button><button class="ok" data-c="key" data-a="Enter">OK</button><button data-c="key" data-a="ArrowRight">▶</button>
<button data-c="chdown">CH ▼</button><button data-c="key" data-a="ArrowDown">▼</button><button data-c="voldown">VOL −</button>
<button data-c="key" data-a="Escape">↩ Vissza</button><button data-c="toggle">⏯</button><button data-c="mute">🔇</button>
<button class="small" data-c="recall">↺ Előző</button><button class="small" data-c="nav" data-a="home">⌂ Főoldal</button><button class="small" data-c="nav" data-a="guide">☰ Műsor</button></div>
<div class="grid">${[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => `<button data-c="num" data-a="${n}">${n}</button>`).join('')}<button class="small" data-c="nav" data-a="tv">TV</button><button data-c="num" data-a="0">0</button><button class="small" data-c="nav" data-a="vod">VOD</button></div>
<h2>Kedvencek</h2><div class="favs" id="favs"></div></div>
<script>
var pin=localStorage.getItem('adasPin')||'';var $=function(i){return document.getElementById(i)};
function api(p){return fetch('/adas/rc/'+pin+'/'+p,{cache:'no-store'}).then(function(r){if(r.status===403){throw new Error('pin')}return r.json()})}
function ask(msg){$('ui').hidden=true;$('pin').hidden=false;$('pinErr').textContent=msg||''}
function esc(s){return String(s||'').replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}
function state(){if(!pin)return ask();api('state').then(function(s){$('pin').hidden=true;$('ui').hidden=false;
$('now').innerHTML=s.now?('<b>'+esc(s.now.name)+'</b><small>'+esc(s.now.title||'')+(s.now.vod?'':'')+'</small>'):'<small>Most nem megy semmi. Válassz egy kedvencet, vagy nyomd meg a CH gombot.</small>';
$('favs').innerHTML=(s.favs||[]).map(function(f){return '<button data-c="play" data-a="'+esc(f.id)+'">'+(f.logo?'<img src="'+esc(f.logo)+'" alt="" onerror="this.remove()">':'')+'<span>'+esc(f.name)+'</span></button>'}).join('')||'<small style="color:#aaa">Nincs kedvenc csatorna.</small>'
}).catch(function(e){if(e.message==='pin'){localStorage.removeItem('adasPin');pin='';ask('Hibás PIN.')}})}
document.addEventListener('click',function(e){var b=e.target.closest('button[data-c]');if(!b)return;if(navigator.vibrate)navigator.vibrate(15);
api('cmd?c='+encodeURIComponent(b.dataset.c)+'&a='+encodeURIComponent(b.dataset.a||'')).then(function(){setTimeout(state,700)}).catch(function(){})});
$('pinOk').onclick=function(){pin=$('pinIn').value.replace(/\\D/g,'');localStorage.setItem('adasPin',pin);state()};
$('pinIn').addEventListener('keydown',function(e){if(e.key==='Enter')$('pinOk').click()});
state();setInterval(state,4000);
</script></body></html>`;
}

function stateJson() {
  const ch = player.active ? player.channel : null;
  let now = null;
  if (ch) now = ch.vod ? { name: ch.vod.title || ch.name, title: ch.name, vod: true } : { name: ch.name, title: epg.now(ch.id, Date.now())?.cur?.title || '' };
  const favs = getChannels(store.profile?.favorites || [])
    .slice(0, 40)
    .map((c) => ({ id: c.id, name: c.name, logo: /^https?:/.test(c.logo || '') ? c.logo : '' }));
  return JSON.stringify({ now, favs, profile: store.profile?.name || '' });
}
const pushState = () => info && api.rcState(stateJson());

/** Billentyű küldése a kijelölt elemnek – ugyanúgy, mintha a távirányítón nyomták volna meg. */
function key(k) {
  const t = document.activeElement || document.body;
  const ev = new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true });
  t.dispatchEvent(ev);
  if (k === 'Enter' && !ev.defaultPrevented && t !== document.body && t.click) t.click();
}

function command({ c, a }) {
  const live = player.active;
  switch (c) {
    case 'key':
      if (/^(Arrow(Up|Down|Left|Right)|Enter|Escape)$/.test(a)) key(a);
      break;
    case 'chup':
    case 'chdown':
      if (live) player.step(c === 'chup' ? -1 : 1);
      else {
        const id = store.profile.lastChannel || store.profile.favorites[0];
        const ch = id && catalog.byId.get(id);
        if (ch) player.play(ch);
      }
      break;
    case 'volup':
    case 'voldown':
      if (live) player.setVolume(video.volume + (c === 'volup' ? 0.08 : -0.08));
      break;
    case 'mute':
      if (live) {
        video.muted = !video.muted;
        player.renderControls();
      }
      break;
    case 'toggle':
      if (live) player.togglePause();
      break;
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
      if (live) player.close();
      if (/^(home|tv|guide|vod)$/.test(a)) location.hash = '#/' + a;
      break;
  }
  setTimeout(pushState, 400);
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
// Beállítások → Távirányító telefonról
// ---------------------------------------------------------------------------
export function renderRemoteSettings(box) {
  if (!canRemote || !box) return box?.remove();
  const s = store.settings;
  const draw = () => {
    const urls = (info?.addresses || []).map((ip) => `http://${ip}${info.port === 80 ? '' : ':' + info.port}/adas/remote`);
    box.innerHTML = `<h2>Távirányító telefonról <button class="help-link" data-help="remote" title="Súgó">?</button></h2>
      <label class="setting"><span><b>Vezérlés telefonról vagy más eszköz böngészőjéből</b><small>Csatornaváltás, hangerő, nyilak, OK / Vissza, számok és a kedvenceid – ugyanazon a (otthoni) hálózaton.</small></span>
        <input type="checkbox" class="switch" data-rc="on" ${s.remoteOn ? 'checked' : ''} /></label>
      ${
        s.remoteOn
          ? info
            ? `<div class="share-box"><div>Nyisd meg a telefon böngészőjében:</div>${urls.map((u) => `<code class="rc-url">${esc(u)}</code>`).join('')}
            <div>PIN: <span class="share-code rc-pin">${esc(s.remotePin)}</span></div>
            <div class="muted small">Tipp: a telefonon tedd ki a lapot a kezdőképernyőre, így alkalmazásként indul. Első alkalommal a Windows tűzfal engedélyt kérhet.</div>
            <div class="inline"><button class="btn small" data-rc="pin">Új PIN</button></div></div>`
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
