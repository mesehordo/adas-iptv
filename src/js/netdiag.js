// Hálózati ellenőrzés (asztali változat): kijutnak-e a kapcsolatok a nem szabványos portokon (sok helyi tévé a
// 1935-ös, 1344-es, 8080-as porton sugároz). Ha a 80 / 443 megy, de ezek nem, a gép, a router, a vírusirtó webszűrője,
// a VPN vagy a szolgáltató szűri őket – ilyenkor ezek az adások nem a forrás hibája miatt nem indulnak.
import { api } from './api.js';
import { esc } from './util.js';
import { _t } from './i18n.js';

export const canNetDiag = !!api.netDiag;
let last = null; // { at, res } – a legutóbbi eredmény (10 percig érvényes)

/** → { ok: kijut-e a 80/443, blocked: [nem szabványos, elzárt portok], text } vagy null (nem ellenőrizhető) */
export async function netDiag({ force = false } = {}) {
  if (!canNetDiag) return null;
  if (!force && last && Date.now() - last.at < 10 * 60e3) return last.res;
  const r = await api.netDiag();
  const std = r[80] || r[443];
  const alt = Object.keys(r).filter((p) => p !== '80' && p !== '443');
  const blocked = alt.filter((p) => !r[p]);
  const text = !std
    ? _t('A hálózati ellenőrző szerver nem érhető el (nincs internet, vagy minden kimenő kapcsolat szűrve van).')
    : blocked.length === alt.length
      ? _t('A nem szabványos portok (pl. {ports}) el vannak zárva ezen a gépen vagy hálózaton – az ezeken sugárzó helyi tévék itt nem indulhatnak el. Ellenőrizd a tűzfalat, a vírusirtó webszűrőjét, a VPN-t vagy a router beállításait.', { ports: alt.join(', ') })
      : blocked.length
        ? _t('Néhány nem szabványos port el van zárva ({ports}) – az ezeken sugárzó adások itt nem indulhatnak el.', { ports: blocked.join(', ') })
        : _t('Rendben: a nem szabványos portok is elérhetők.');
  const res = { ok: std, blocked, text };
  last = { at: Date.now(), res };
  return res;
}

/** Nem szabványos porton megy-e az adás (a cím alapján). */
export function altPort(url) {
  try {
    const u = new URL(url);
    return u.port && u.port !== '80' && u.port !== '443' ? u.port : '';
  } catch {
    return '';
  }
}

/** Beállítások → Lejátszás: az ellenőrzés sora. */
export const netDiagHtml = () =>
  canNetDiag
    ? `<div class="setting"><span>${_t('<b>Hálózat ellenőrzése</b>')}<small>${_t('Sok helyi tévé nem szabványos porton (pl. 1935, 1344, 8080) sugároz. Ha ezek nálad sorra nem indulnak, itt kiderül, szűri-e őket a gép vagy a hálózat.')}</small><small class="net-diag-out" aria-live="polite"></small></span>
      <button type="button" class="btn small" data-netdiag>${_t('Ellenőrzés')}</button></div>`
    : '';

document.addEventListener('click', async (e) => {
  const b = e.target.closest?.('[data-netdiag]');
  if (!b) return;
  e.stopPropagation();
  const out = b.closest('.setting')?.querySelector('.net-diag-out');
  b.disabled = true;
  if (out) out.textContent = _t('Ellenőrzés…');
  try {
    const r = await netDiag({ force: true });
    if (out) out.innerHTML = `${r.ok && !r.blocked.length ? '✅' : '⚠'} ${esc(r.text)}`;
  } catch (err) {
    if (out) out.textContent = String(err?.message || err);
  } finally {
    b.disabled = false;
  }
});
