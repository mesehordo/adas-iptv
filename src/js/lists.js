// Csatornalisták kezelése: frissítés, fő lista, saját listák (URL / fájl / ajánlott),
// egyenként hozzáadott saját csatornák (hozzáadás, kipróbálás, szerkesztés, törlés).
import { esc, html, toast, bus, fmtDay, fmtTime, hashHue } from './util.js';
import { api } from './api.js';
import { store, DEFAULT_PLAYLIST, PLAYLIST_PRESETS, BUILTIN_PLAYLISTS, setRefreshHours } from './store.js';
import { catalog, parseM3U, categoryName, countryName, MINE, CATEGORY_HU } from './catalog.js';
import { ICON, openModal, confirmDialog, promptDialog, refreshSelectHtml } from './components.js';
import { player } from './player.js';
import { refreshAll, refreshing } from './refresh.js';
import { readPickedFiles } from './vod.js';
import { packsOf, pickAndImportPacks, promptImportPackUrl, removePack } from './packs.js';

import { _t, LOCALE } from './i18n.js';
const newId = () => Math.random().toString(36).slice(2, 10);
const isUrl = (u) => /^https?:\/\/\S+$/i.test(u || '');

export function renderLists(box) {
  const s = store.settings;
  const counts = catalog.playlistCounts || {};
  // A listában talált filmek / sorozatrészek a VOD-ba kerültek
  const movedTxt = (id) => {
    const n = (catalog.tvVod || []).find((t) => t.id === 'tv:' + id)?.entries.length;
    return n ? ` ${_t('· {n} film / rész a VOD-ban', { n })}` : '';
  };
  const errors = catalog.playlistErrors || {};
  const busy = refreshing();

  box.innerHTML = `<h2>${_t('Csatornalisták és saját csatornák')} <button class="help-link" data-help="lists" title="${_t('Súgó')}">?</button></h2>
    <div class="refresh-bar">
      <button class="btn primary" data-l="refresh" ${busy ? 'disabled' : ''}>${ICON.refresh} ${busy ? _t('Frissítés folyamatban…') : _t('Minden lista frissítése most')}</button>
      <span class="muted">${_t('{length} csatorna · utolsó letöltés: {when}', { length: catalog.channels.length, when: catalog.loadedAt ? fmtDay(catalog.loadedAt) + ' ' + fmtTime(catalog.loadedAt) : '–' })}</span>
    </div>
    <p class="muted small">${_t('A webcímről töltött listák automatikusan is frissülnek – listánként beállítható, hány óránként (alapból 6); lejátszás közben nem. A gomb azonnal, a gyorsítótár megkerülésével tölt le mindent, a műsorújsággal együtt. A profilmenüből is elérhető.')}</p>

    <h3>${_t('Beépített listák')}</h3>
    <p class="muted small">${_t('Ha több lista is be van kapcsolva, a program az azonos csatornákat összevonja: egy csatorna csak egyszer jelenik meg, a különböző listákból származó adásai pedig egymás tartalék forrásai lesznek.')}</p>
    <ul class="src-list builtin">${[...BUILTIN_PLAYLISTS, ...packsOf('tv')].map((b) => {
      const on = b.pack ? (s.builtinLists?.[b.id] ?? !b.off) : s.builtinLists?.[b.id] !== false;
      const info = !on
        ? _t('kikapcsolva')
        : errors[b.id]
          ? `<span class="warn">${_t('hiba: {esc}', { esc: esc(errors[b.id]) })}</span>`
          : `${_t('{x} csatorna{movedTxt}', { x: counts[b.id] || 0, movedTxt: movedTxt(b.id) })}`;
      return `<li data-builtin="${esc(b.id)}"><input type="checkbox" class="switch" data-l-builtin ${on ? 'checked' : ''} aria-label="${_t('{esc} bekapcsolva', { esc: esc(b.name) })}" />
        <span><b>${esc(b.name)}</b>${b.pack ? ` <span class="pill">${_t('kiegészítő csomag')}</span>` : ''}<small>${esc(b.desc || '')} · ${info}</small></span>
        ${b.url && !b.stream ? refreshSelectHtml('tv', b) : ''}
        ${b.id === 'iptvorg' ? `<button class="btn small" data-l="main-edit">${_t('Cím')}</button>` : ''}
        ${b.pack ? `<button class="btn small danger" data-l="pack-del">${_t('Eltávolítás')}</button>` : ''}</li>`;
    }).join('')}</ul>
    <div class="inline">
      ${api.caps.files ? `<button class="btn small" data-l="pack-add">${_t('{plus} Kiegészítő csomag betöltése (…_tv.adaspack)', { plus: ICON.plus })}</button>` : ''}
      <button class="btn small" data-l="pack-url">${api.caps.files ? '' : ICON.plus + ` ${_t('Kiegészítő csomag')} `}${_t('Betöltés webcímről')}</button>
      ${api.packsDir ? `<button class="btn small" data-l="pack-dir">${_t('Csomagok mappája')}</button>` : ''}
      <button class="btn small" data-help="adaspack">${_t('Mi ez, és hogyan készíthetek ilyet?')}</button>
    </div>

    <h3>${_t('Saját lejátszólisták')} <span class="muted small">${_t('(M3U / M3U8)')}</span></h3>
    <ul class="src-list">${s.customPlaylists
        .map((pl) => {
          const info = errors[pl.id]
            ? `<span class="warn">${_t('hiba: {esc}', { esc: esc(errors[pl.id]) })}</span>`
            : pl.enabled
              ? `${_t('{x} csatorna{movedTxt}', { x: counts[pl.id] || 0, movedTxt: movedTxt(pl.id) })}`
              : _t('kikapcsolva');
          return `<li data-pl="${esc(pl.id)}"><input type="checkbox" class="switch" data-l-toggle ${pl.enabled ? 'checked' : ''} aria-label="${_t('Bekapcsolva')}" />
            <span><b>${esc(pl.name)}</b><small>${esc(pl.url || _t('helyi fájlból'))} · ${info}</small></span>
            ${pl.url && !pl.stream ? refreshSelectHtml('tv', pl) : ''}
            <button class="btn small" data-l="pl-rename">${_t('Átnevezés')}</button>
            ${pl.url ? `<button class="btn small" data-l="pl-url-edit">${_t('Cím')}</button>` : ''}
            <button class="btn small danger" data-l="pl-del">${_t('Törlés')}</button></li>`;
        })
        .join('') || `<li class="muted">${_t('Még nincs saját lista.')}</li>`}</ul>
    <div class="inline">
      <button class="btn small" data-l="pl-add-url">${_t('{plus} Lista hozzáadása címről', { plus: ICON.plus })}</button>
      ${api.caps.files ? `<button class="btn small" data-l="pl-add-file">${_t('{plus} Fájlból (M3U, ZIP)', { plus: ICON.plus })}</button>` : ''}
      <button class="btn small" data-l="pl-add-text">${_t('{plus} Lista beillesztése szövegként', { plus: ICON.plus })}</button>
    </div>
    ${PLAYLIST_PRESETS.length
        ? `<div class="presets">${_t('<b>Ajánlott listák:</b>')}${PLAYLIST_PRESETS.map((p, i) => {
            const added = s.customPlaylists.some((x) => x.url === p.url);
            return `<div class="preset"><span><b>${esc(p.name)}</b><small>${esc(p.desc)}</small></span>
              <button class="btn small" data-l="preset" data-i="${i}" ${added ? 'disabled' : ''}>${added ? _t('Hozzáadva') : _t('Hozzáadás')}</button></div>`;
          }).join('')}</div>`
        : ''}

    <h3>${_t('Saját csatornák')} <span class="muted small">${_t('(egyenként felvett adások)')}</span></h3>
    <ul class="src-list mine">${s.customChannels
        .map(
          (c) => `<li data-ch="${esc(c.id)}">
            <span class="mine-logo" style="--h:${hashHue(c.name)}">${c.logo ? `<img class="logo-sm" src="${esc(c.logo)}" alt="" referrerpolicy="no-referrer" />` : esc(c.name.slice(0, 2).toUpperCase())}</span>
            <span><b>${esc(c.name)}</b><small>${esc([c.category && categoryName(c.category), c.country && countryName(c.country)].filter(Boolean).join(' · '))}${c.category || c.country ? ' · ' : ''}${esc(c.url)}</small></span>
            <button class="btn small" data-l="ch-play" title="${_t('Lejátszás')}">${ICON.play}</button>
            <button class="btn small" data-l="ch-edit">${_t('Szerkesztés')}</button>
            <button class="btn small danger" data-l="ch-del">${_t('Törlés')}</button></li>`
        )
        .join('') || `<li class="muted">${_t('Még nincs saját csatorna. Ide bármilyen HLS (.m3u8), MPEG-TS, DASH vagy MP4 adás címét felveheted.')}</li>`}</ul>
    <div class="inline"><button class="btn small" data-l="ch-add">${_t('{plus} Csatorna hozzáadása', { plus: ICON.plus })}</button></div>`;

  if (box.dataset.bound) return;
  box.dataset.bound = '1';
  box.addEventListener('change', (e) => {
    e.stopPropagation();
    if (e.target.matches('[data-refresh]')) {
      const key = e.target.dataset.refresh;
      const i = key.indexOf(':');
      setRefreshHours(key.slice(0, i), key.slice(i + 1), Number(e.target.value));
      return toast(_t('Mentve: a lista {h} óránként frissül.', { h: e.target.value }));
    }
    const bi = e.target.closest('[data-builtin]');
    if (bi && e.target.matches('[data-l-builtin]')) {
      const id = bi.dataset.builtin;
      const enabledCount = BUILTIN_PLAYLISTS.filter((b) => s.builtinLists[b.id] !== false).length + s.customPlaylists.filter((p) => p.enabled).length;
      if (!e.target.checked && enabledCount <= 1 && !s.customChannels.length) {
        e.target.checked = true;
        return toast(_t('Legalább egy csatornalistának bekapcsolva kell maradnia.'));
      }
      s.builtinLists = { ...s.builtinLists, [id]: e.target.checked };
      store.save();
      reload(box);
      return;
    }
    const li = e.target.closest('[data-pl]');
    if (li && e.target.matches('[data-l-toggle]')) {
      const pl = s.customPlaylists.find((x) => x.id === li.dataset.pl);
      pl.enabled = e.target.checked;
      store.save();
      reload(box);
    }
  });
  box.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-l]');
    if (!b) return;
    e.stopPropagation();
    const act = b.dataset.l;
    const plId = b.closest('[data-pl]')?.dataset.pl;
    const chId = b.closest('[data-ch]')?.dataset.ch;
    const pl = plId && s.customPlaylists.find((x) => x.id === plId);
    const ch = chId && s.customChannels.find((x) => x.id === chId);

    switch (act) {
      case 'refresh':
        refreshAll({ force: true }).then(() => renderLists(box));
        renderLists(box);
        break;
      case 'pack-add':
        // a betöltés után a katalógus magától újraépül (bus 'packs'), utána frissül ez a rész is
        if ((await pickAndImportPacks())?.ok.length) setTimeout(() => box.isConnected && renderLists(box), 300);
        break;
      case 'pack-url':
        if ((await promptImportPackUrl())?.ok.length) setTimeout(() => box.isConnected && renderLists(box), 300);
        break;
      case 'pack-dir':
        api.packsDir();
        break;
      case 'pack-del': {
        const id = b.closest('[data-builtin]').dataset.builtin;
        const pk = packsOf('tv').find((x) => x.id === id);
        if (!pk || !(await confirmDialog(`${_t('Eltávolítod a(z) „{name}” kiegészítő csomagot erről az eszközről?', { name: pk.name })}`, { ok: _t('Eltávolítás') }))) return;
        await removePack('tv', id);
        toast(_t('A csomag eltávolítva. (Ha a Csomagok mappájában is ott van, a következő indításkor visszakerül.)'), { timeout: 7000 });
        renderLists(box);
        break;
      }
      case 'main-edit': {
        const url = await promptDialog(
          _t('Az iptv-org lista címe (pl. csak egy ország: https://iptv-org.github.io/iptv/countries/hu.m3u). Üresen hagyva visszaáll a teljes listára.'),
          s.playlistUrl
        );
        if (url === null) return;
        const next = url.trim() || DEFAULT_PLAYLIST;
        if (!isUrl(next)) return toast(_t('Adj meg egy érvényes http(s) címet.'));
        store.set('playlistUrl', next);
        reload(box, true);
        break;
      }
      case 'pl-add-url': {
        const url = await promptDialog(_t('A lejátszólista (M3U / M3U8) címe:'), 'https://');
        if (!url) return;
        if (!isUrl(url)) return toast(_t('Ez nem érvényes http(s) cím.'));
        const n = await testPlaylist(url);
        if (n === null) return;
        const name = (await promptDialog(`${_t('A lista neve ({n} adás található benne):', { n })}`, guessName(url))) || _t('Saját lista');
        s.customPlaylists.push({ id: newId(), name, url, enabled: true });
        store.save();
        reload(box);
        break;
      }
      case 'pl-add-file': {
        // Egy vagy több .m3u / .m3u8 fájl, vagy ZIP: minden lejátszólista külön, ki-be kapcsolható lista lesz.
        const filters = [{ name: _t('M3U lejátszólista vagy ZIP'), extensions: ['m3u', 'm3u8', 'txt', 'zip'] }];
        const picked = api.openFiles ? await api.openFiles(filters) : [await api.openFile(filters)].filter(Boolean);
        if (!picked?.length) return;
        let files;
        try {
          files = await readPickedFiles(picked);
        } catch (err) {
          return toast(String(err.message || err));
        }
        let total = 0;
        let added = 0;
        for (const f of files) {
          const n = parseM3U(f.text).entries.length;
          if (!n) continue;
          s.customPlaylists.push({ id: newId(), name: f.name.replace(/\.(m3u8?|txt)$/i, ''), text: f.text, enabled: true });
          total += n;
          added++;
        }
        if (!added) return toast(_t('A kiválasztott fájlokban nincs adás.'));
        store.save();
        toast(added > 1 ? `${_t('{added} lista, összesen {total} adás beolvasva', { added, total })}` : `${_t('{total} adás beolvasva', { total })}`);
        reload(box);
        break;
      }
      case 'pl-add-text':
        pasteDialog((name, text) => {
          s.customPlaylists.push({ id: newId(), name, text, enabled: true });
          store.save();
          reload(box);
        });
        break;
      case 'preset': {
        const p = PLAYLIST_PRESETS[Number(b.dataset.i)];
        s.customPlaylists.push({ id: newId(), name: p.name, url: p.url, enabled: true });
        store.save();
        reload(box);
        break;
      }
      case 'pl-rename': {
        const name = await promptDialog(_t('A lista új neve:'), pl.name);
        if (!name) return;
        pl.name = name;
        store.save();
        reload(box);
        break;
      }
      case 'pl-url-edit': {
        const url = await promptDialog(_t('A lista címe:'), pl.url);
        if (!url || url === pl.url) return;
        if (!isUrl(url)) return toast(_t('Ez nem érvényes http(s) cím.'));
        pl.url = url;
        store.save();
        reload(box);
        break;
      }
      case 'pl-del':
        if (!(await confirmDialog(`${_t('Törlöd a(z) „{name}” listát?', { name: pl.name })}`, { ok: _t('Törlés'), danger: true }))) return;
        s.customPlaylists = s.customPlaylists.filter((x) => x !== pl);
        store.save();
        reload(box);
        break;
      case 'ch-add':
        channelDialog(null, () => reload(box));
        break;
      case 'ch-edit':
        channelDialog(ch, () => reload(box));
        break;
      case 'ch-play': {
        const c = catalog.byId.get(`c:${MINE}:${ch.id}`);
        if (c) player.play(c);
        else player.play(tempChannel(ch));
        break;
      }
      case 'ch-del':
        if (!(await confirmDialog(`${_t('Törlöd a(z) „{name}” csatornát?', { name: ch.name })}`, { ok: _t('Törlés'), danger: true }))) return;
        s.customChannels = s.customChannels.filter((x) => x !== ch);
        store.save();
        reload(box);
        break;
    }
  });
}

async function reload(box, force = false) {
  renderLists(box);
  await refreshAll({ force, epgToo: force, quiet: false });
  if (document.body.contains(box)) renderLists(box);
}

async function testPlaylist(url) {
  toast(_t('Lista ellenőrzése…'));
  try {
    const { text } = await api.fetchText(url, { maxAgeHours: 6, force: true });
    const n = parseM3U(text).entries.length;
    if (!n) {
      toast(_t('A címen nem található M3U lista vagy üres.'), { timeout: 6000 });
      return null;
    }
    return n;
  } catch (err) {
    const ok = await confirmDialog(
      `${_t('A lista most nem tölthető le ({x}). Ennek ellenére felveszed? Később a frissítéskor újra megpróbálja.', { x: err.message || err })}`,
      { ok: _t('Felveszem') }
    );
    return ok ? 0 : null;
  }
}

function guessName(url) {
  try {
    const u = new URL(url);
    const file = u.pathname.split('/').pop().replace(/\.(m3u8?|txt)$/i, '');
    return file && file !== 'playlist' && file !== 'index' ? file : u.hostname.replace(/^www\./, '');
  } catch {
    return _t('Saját lista');
  }
}

function pasteDialog(done) {
  const el = html(`<form class="dialog">
    <h2>${_t('Lista beillesztése')}</h2>
    <p class="muted">${_t('Másold ide egy M3U lista tartalmát (az <code>#EXTM3U</code> sorral kezdődő szöveget), vagy egyszerűen adáscímeket soronként.')}</p>
    <label>${_t('A lista neve')}<input class="input" name="name" value="${esc(_t('Beillesztett lista'))}" /></label>
    <label>${_t('Tartalom')}<textarea class="input" name="text" rows="10" spellcheck="false" placeholder="${_t('#EXTM3U&#10;#EXTINF:-1 tvg-logo=&quot;…&quot; group-title=&quot;News&quot;,Csatorna neve&#10;https://…/index.m3u8')}"></textarea></label>
    <div class="dialog-btns"><button class="btn primary" type="submit">${_t('Hozzáadás')}</button><button class="btn" type="button" data-cancel>${_t('Mégse')}</button></div>
  </form>`);
  const close = openModal(el, { cls: 'medium' });
  el.querySelector('[data-cancel]').onclick = close;
  el.onsubmit = (e) => {
    e.preventDefault();
    let text = el.elements.namedItem('text').value.trim();
    // Csak címek esetén M3U-vá alakítjuk.
    if (text && !text.includes('#EXTINF')) {
      const urls = text.split(/\s+/).filter(isUrl);
      text = '#EXTM3U\n' + urls.map((u, i) => `#EXTINF:-1,${guessName(u) || `${_t('Adás')} ` + (i + 1)}\n${u}`).join('\n');
    }
    const n = parseM3U(text).entries.length;
    if (!n) return toast(_t('Nem található benne adás.'));
    close();
    toast(`${_t('{n} adás beolvasva', { n })}`);
    done(el.elements.namedItem('name').value.trim() || _t('Beillesztett lista'), text);
  };
}

/** Ideiglenes csatornaobjektum kipróbáláshoz (mentés nélkül). */
function tempChannel(c) {
  return {
    id: `c:${MINE}:${c.id || 'proba'}`,
    tvgIds: [],
    name: c.name || _t('Próba'),
    altNames: [],
    logo: c.logo || '',
    country: c.country || '',
    categories: [c.category || 'other'],
    languages: [],
    network: '',
    owners: [],
    website: '',
    launched: '',
    closed: '',
    timezones: [],
    broadcastArea: [],
    nsfw: false,
    custom: _t('Saját csatornák'),
    streams: [{ url: c.url, title: c.name, quality: '', labels: [], ua: c.ua || '', referrer: c.referrer || '', feed: '', feedName: '' }],
  };
}

/** Saját csatorna felvétele / szerkesztése. */
export function channelDialog(existing, done) {
  const s = store.settings;
  const c = existing || { id: newId(), name: '', url: '', logo: '', category: '', country: s.homeCountry, ua: '', referrer: '' };
  const countries = [...catalog.countries.values()].filter((x) => x.count).sort((a, b) => a.name.localeCompare(b.name, LOCALE));
  const cats = Object.keys(CATEGORY_HU).filter((k) => k !== 'xxx');
  const el = html(`<form class="dialog channel-form">
    <h2>${existing ? _t('Csatorna szerkesztése') : _t('Saját csatorna hozzáadása')}</h2>
    <label>${_t('Név *')}<input class="input" name="name" value="${esc(c.name)}" required maxlength="80" autofocus /></label>
    <label>${_t('Az adás címe (URL) *')}<input class="input" name="url" value="${esc(c.url)}" required placeholder="${_t('https://példa.hu/live/index.m3u8')}" spellcheck="false" />
      <small class="muted">${_t('HLS (.m3u8), MPEG-TS (.ts), FLV, DASH (.mpd) vagy MP4. Weboldal címe (pl. a csatorna honlapja) nem működik, csak a közvetlen adáscím.')}</small></label>
    <label>${_t('Logó címe (nem kötelező)')}<input class="input" name="logo" value="${esc(c.logo)}" placeholder="https://…/logo.png" spellcheck="false" /></label>
    <div class="form-row">
      <label>${_t('Kategória')}<select name="category"><option value="">${_t('– nincs –')}</option>${cats
        .map((k) => `<option value="${k}" ${k === c.category ? 'selected' : ''}>${esc(CATEGORY_HU[k])}</option>`)
        .join('')}</select></label>
      <label>${_t('Ország')}<select name="country"><option value="">${_t('– nincs –')}</option>${countries
        .map((x) => `<option value="${esc(x.code)}" ${x.code === c.country ? 'selected' : ''}>${esc(x.name)}</option>`)
        .join('')}</select></label>
    </div>
    <details ${c.ua || c.referrer ? 'open' : ''}><summary>${_t('Haladó: HTTP-fejlécek')}</summary>
      <p class="muted small">${_t('Egyes adások csak bizonyos böngészőazonosítóval vagy hivatkozó oldallal indulnak el. Ha az adás forrásánál ilyet írnak (pl. <code>#EXTVLCOPT:http-referrer=…</code>), itt add meg.')}</p>
      <label>User-Agent<input class="input" name="ua" value="${esc(c.ua)}" spellcheck="false" /></label>
      <label>Referer<input class="input" name="referrer" value="${esc(c.referrer)}" spellcheck="false" placeholder="https://…" /></label>
    </details>
    <div class="dialog-btns">
      <button class="btn primary" type="submit">${_t('{check} Mentés', { check: ICON.check })}</button>
      <button class="btn" type="button" data-try>${_t('{play} Kipróbálás', { play: ICON.play })}</button>
      <button class="btn" type="button" data-cancel>${_t('Mégse')}</button>
    </div>
  </form>`);
  const close = openModal(el, { cls: 'medium' });
  const read = () => {
    const f = el.elements;
    return {
      ...c,
      name: f.namedItem('name').value.trim(),
      url: f.namedItem('url').value.trim(),
      logo: f.namedItem('logo').value.trim(),
      category: f.namedItem('category').value,
      country: f.namedItem('country').value,
      ua: f.namedItem('ua').value.trim(),
      referrer: f.namedItem('referrer').value.trim(),
    };
  };
  const valid = (v) => {
    if (!v.name) return toast(_t('Adj nevet a csatornának.')), false;
    if (!isUrl(v.url)) return toast(_t('Az adás címe http:// vagy https:// kezdetű legyen.')), false;
    if (v.logo && !isUrl(v.logo)) return toast(_t('A logó címe http:// vagy https:// kezdetű legyen.')), false;
    return true;
  };
  el.querySelector('[data-cancel]').onclick = close;
  el.querySelector('[data-try]').onclick = () => {
    const v = read();
    if (!valid(v)) return;
    close();
    player.play(tempChannel(v));
    toast(_t('Kipróbálás – a csatorna még nincs elmentve.'), { timeout: 6000 });
  };
  el.onsubmit = (e) => {
    e.preventDefault();
    const v = read();
    if (!valid(v)) return;
    const list = s.customChannels;
    const i = list.findIndex((x) => x.id === v.id);
    if (i >= 0) list[i] = v;
    else list.push(v);
    store.save();
    close();
    toast(existing ? _t('Csatorna mentve') : `${_t('{name} hozzáadva a saját csatornákhoz', { name: v.name })}`);
    bus.emit('custom-channels');
    done?.();
  };
}
