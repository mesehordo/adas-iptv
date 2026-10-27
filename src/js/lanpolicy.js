// Android: a keret a lap minden kérését továbbítja – a helyi hálózat (NAS, helyi szerver) csak akkor érhető el, ha
// a felhasználó maga adott meg helyi forrást (lista, médiatár, csatorna, rádiólista). Így egy internetes lista nem
// irányíthatja a kéréseket a helyi eszközökre (router, nyomtató, okoseszközök) – mint az asztali változat szabálya.
import { store } from './store.js';
import { bus } from './util.js';

/** Helyi / belső cím-e a gazdagép neve (localhost-nevek, magán-, link-local, CGNAT IPv4, ULA / link-local IPv6). */
export function isLocalHost(host) {
  const h = String(host || '').toLowerCase().replace(/^\[|\]$/g, '').replace(/\.+$/, '');
  if (!h || h === 'localhost' || h.endsWith('.localhost') || h.endsWith('.local') || h.endsWith('.internal') || h.endsWith('.lan') || h.endsWith('.home')) return true;
  const m = /^(\d+)\.(\d+)\.\d+\.\d+$/.exec(h);
  if (m) {
    const [a, b] = [+m[1], +m[2]];
    return a === 10 || a === 127 || a === 0 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 169 && b === 254) || (a === 100 && b >= 64 && b <= 127);
  }
  return /^(::1|f[cd][0-9a-f]{2}:|fe80:)/.test(h);
}

const hostOf = (u) => {
  try {
    return new URL(u).hostname;
  } catch {
    return '';
  }
};

/** Van-e a felhasználónak helyi hálózati (vagy helyi mappás) forrása. */
export function hasLocalSource(s = store.settings) {
  const urls = [
    ...(s.customPlaylists || []).map((p) => p.url),
    ...(s.vodCustom || []).map((p) => p.url),
    ...(s.customChannels || []).map((c) => c.url),
    ...(s.radioLists || []).map((p) => p.url),
  ];
  // (a saját médiatár mappái – USB, helyi tár – mellett a listáik hálózati címeket is tartalmazhatnak)
  if ((s.ownSources || []).some((o) => o.enabled !== false && (o.kind === 'folder' || isLocalHost(hostOf(o.url))))) return true;
  return urls.some((u) => u && isLocalHost(hostOf(u)));
}

const bridge = typeof window !== 'undefined' ? window.AdasAndroid : null;
if (bridge?.setLanAllowed) {
  let last = null;
  const send = () => {
    const on = hasLocalSource();
    if (on === last) return;
    last = on;
    try {
      bridge.setLanAllowed(on);
    } catch {}
  };
  send();
  bus.on('settings', send);
  bus.on('store-loaded', send);
  // (a listák egy része közvetlenül, esemény nélkül íródik a beállításokba, és rögtön le is töltődik: minden
  // mentéskor azonnal újraszámoljuk – egy új helyi lista első letöltése is már az új szabállyal megy)
  const save = store.save;
  store.save = function (...a) {
    send();
    return save.apply(this, a);
  };
}
