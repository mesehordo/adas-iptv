// Beállítások → Rádió: a menüpont, a források (Radio Browser, Verified Radio Streams, IPRD), saját
// rádiólisták (M3U webcímről, frissítési gyakorisággal), rádiócsomagok (.adaspack), a hangzás alapértékei.
import { esc, toast, bus } from './util.js';
import { api } from './api.js';
import { store, setRefreshHours } from './store.js';
import { refreshSelectHtml, promptDialog, confirmDialog } from './components.js';
import { packsOf, removePack, pickAndImportPacks, promptImportPackUrl } from './packs.js';
import { _t } from './i18n.js';
import { RADIO_SOURCES, sourceOn, radio, loadRadio } from './radio.js';
import { FX_DEFAULTS, setFx, audioFxAvailable } from './radioplayer.js';

const reload = () => loadRadio({ force: true });

export function renderRadioSettings(box) {
  if (!box) return;
  const s = store.settings;
  const draw = () => {
    const own = s.radioLists || [];
    const packs = packsOf('radio');
    const err = (id) => radio.errors['list:' + id];
    box.innerHTML = `<h2>${_t('Rádió')} <button class="help-link" data-help="radio" title="${_t('Súgó')}">?</button></h2>
      <label class="setting"><span><b>${_t('Rádió menüpont')}</b><small>${_t('A menüsoron a TV után: élő rádióadók a világból, mini-lejátszóval, „most szól” nézettel és hangeffektekkel. Gyerekprofilban nem látszik.')}</small></span>
        <input type="checkbox" class="switch" data-set="radioMenu" ${s.radioMenu !== false ? 'checked' : ''} /></label>
      <h3>${_t('Források')}</h3>
      <ul class="src-list">${RADIO_SOURCES.map((x) => `<li><input type="checkbox" class="switch" data-rsrc="${x.id}" ${sourceOn(x.id) ? 'checked' : ''} aria-label="${esc(x.name)}" />
        <span><b>${esc(x.name)}</b><small>${esc(x.desc)}${x.id === 'rb' && radio.errors.rb ? ` · ${esc(_t('hiba: {error}', { error: radio.errors.rb }))}` : ''}</small></span></li>`).join('')}</ul>
      <h3>${_t('Saját rádiólisták')}</h3>
      <p class="muted small">${_t('M3U lista webcímről (pl. egy GitHubon tárolt válogatás). Az adók a Rádió oldalon, a többi forrás mellett jelennek meg.')}</p>
      <ul class="src-list">${own.map((l) => `<li data-rl-id="${esc(l.id)}"><input type="checkbox" class="switch" data-rl-on ${l.enabled !== false ? 'checked' : ''} aria-label="${esc(l.name)}" />
          <span><b>${esc(l.name)}</b><small>${esc(l.url)}${err(l.id) ? ` · ${esc(_t('hiba: {error}', { error: err(l.id) }))}` : ''}</small></span>
          ${refreshSelectHtml('radio', l)}<button class="btn small" data-rl-del>${_t('Törlés')}</button></li>`).join('') || `<li class="muted small">${_t('Még nincs saját rádiólistád.')}</li>`}</ul>
      <div class="inline"><button class="btn small" data-ra="add">${_t('Rádiólista hozzáadása')}</button></div>
      <h3>${_t('Rádiócsomagok')}</h3>
      <ul class="src-list">${packs.map((p) => `<li data-rp-id="${esc(p.id)}"><input type="checkbox" class="switch" data-rp-on ${(s.builtinLists?.[p.id] ?? !p.off) !== false ? 'checked' : ''} aria-label="${esc(p.name)}" />
          <span><b>${esc(p.name)}</b><small>${esc(p.desc || _t('rádiócsomag'))}</small></span><button class="btn small" data-rp-del>${_t('Törlés')}</button></li>`).join('') || `<li class="muted small">${_t('Nincs betöltött rádiócsomag (.adaspack, „radio” fajtájú).')}</li>`}</ul>
      <div class="inline">${api.openFile || api.openFiles ? `<button class="btn small" data-ra="pack">${_t('Csomag betöltése fájlból')}</button>` : ''}<button class="btn small" data-ra="pack-url">${_t('Csomag betöltése webcímről')}</button></div>
      <h3>${_t('Hangzás')}</h3>
      <p class="muted small">${audioFxAvailable ? _t('A hangszínszabályzó, a hangerő-kiegyenlítés, a térhatás, a retro szűrő, az átúsztatás és a vizualizáció a „Most szól” nézetben állítható (a mini-lejátszón a ⌃ gomb); a választás megmarad.') : _t('Ezen az eszközön a hangeffektek és a vizualizáció nem érhetők el (a tévé böngészőmotorja nem fér hozzá az adás hangjához).')}</p>
      <div class="inline">${audioFxAvailable ? `<button class="btn small" data-ra="fx-reset">${_t('Hangzás visszaállítása')}</button>` : ''}<button class="btn small" data-ra="reload">${_t('Rádióadók frissítése most')}</button></div>`;
  };
  draw();
  if (box.dataset.bound) return;
  box.dataset.bound = '1';
  box.addEventListener('change', (e) => {
    const t = e.target;
    if (t.matches('[data-rsrc]')) {
      e.stopPropagation();
      s.radioSources = { ...(s.radioSources || {}), [t.dataset.rsrc]: t.checked };
      store.save();
      reload();
    } else if (t.matches('[data-rl-on]')) {
      e.stopPropagation();
      const l = (s.radioLists || []).find((x) => x.id === t.closest('[data-rl-id]').dataset.rlId);
      if (l) l.enabled = t.checked;
      store.save();
      reload();
    } else if (t.matches('[data-rp-on]')) {
      e.stopPropagation();
      s.builtinLists = { ...(s.builtinLists || {}), [t.closest('[data-rp-id]').dataset.rpId]: t.checked };
      store.save();
      reload();
    } else if (t.matches('[data-refresh]')) {
      e.stopPropagation();
      const key = t.dataset.refresh;
      const i = key.indexOf(':');
      setRefreshHours(key.slice(0, i), key.slice(i + 1), Number(t.value));
      toast(_t('Mentve: a lista {h} óránként frissül.', { h: t.value }));
    }
  });
  box.addEventListener('click', async (e) => {
    const b = e.target.closest('button');
    if (!b || !box.contains(b)) return;
    if (b.matches('[data-rl-del]')) {
      const id = b.closest('[data-rl-id]').dataset.rlId;
      const l = (s.radioLists || []).find((x) => x.id === id);
      if (!l || !(await confirmDialog(_t('Törlöd a(z) „{name}” rádiólistát?', { name: l.name }), { ok: _t('Törlés'), danger: true }))) return;
      s.radioLists = s.radioLists.filter((x) => x.id !== id);
      store.save();
      draw();
      reload();
      return;
    }
    if (b.matches('[data-rp-del]')) {
      const id = b.closest('[data-rp-id]').dataset.rpId;
      if (!(await confirmDialog(_t('Törlöd ezt a rádiócsomagot?'), { ok: _t('Törlés'), danger: true }))) return;
      await removePack('radio', id);
      draw();
      reload();
      return;
    }
    const a = b.dataset.ra;
    if (a === 'add') {
      const url = (await promptDialog(_t('A rádiólista (M3U) webcíme:'), 'https://'))?.trim();
      if (!url || url === 'https://') return;
      if (!/^https?:\/\/\S+$/i.test(url)) return toast(_t('Adj meg egy http(s):// címet.'));
      const name = (await promptDialog(_t('A lista neve:'), decodeURIComponent(new URL(url).pathname.split('/').pop() || '').replace(/\.m3u8?$/i, '') || _t('Rádiólista')))?.trim();
      if (!name) return;
      s.radioLists = [...(s.radioLists || []), { id: 'rl' + Date.now().toString(36), name: name.slice(0, 80), url, enabled: true }];
      store.save();
      draw();
      await reload();
      if (box.isConnected) draw();
    } else if (a === 'pack') {
      if (await pickAndImportPacks()) draw(), reload();
    } else if (a === 'pack-url') {
      if (await promptImportPackUrl()) draw(), reload();
    } else if (a === 'fx-reset') {
      setFx({ ...FX_DEFAULTS, volume: store.settings.radioFx?.volume ?? FX_DEFAULTS.volume });
      toast(_t('A hangzás visszaállt az alapértékekre.'));
    } else if (a === 'reload') {
      toast(_t('A rádióadók frissítése…'));
      await reload();
      if (box.isConnected) draw();
      toast(_t('{n} rádióadó betöltve.', { n: radio.byId.size }));
    }
  });
}
// (betöltés után a hibák, csomagok frissüljenek a beállításokban)
bus.on('packs', (kind) => kind === 'radio' && document.getElementById('radio-settings') && renderRadioSettings(document.getElementById('radio-settings')));
