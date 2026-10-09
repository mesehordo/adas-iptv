// Saját témák betöltése: feltöltött téma-fájlok (minden eszközön, a beállításokban tárolva) és a
// téma-mappa (asztali változat): az oda bemásolt .adastheme / .json fájlokat indításkor és kérésre beolvassa.
import { esc, toast } from './util.js';
import { api } from './api.js';
import { store } from './store.js';
import { THEMES, parseThemeFile, registerCustomThemes, applyTheme, currentTheme } from './themes.js';
import { confirmDialog } from './components.js';

import { _t } from './i18n.js';
let folderDefs = [];
let folderInfo = { dir: '', errors: [] };

const uploaded = () => (store.settings.customThemes ||= []);

function allDefs() {
  const out = [];
  const seen = new Set();
  // a mappában lévő azonos azonosítójú téma felülírja a feltöltöttet (a mappát szerkesztik)
  for (const d of [...folderDefs, ...uploaded().map((t) => safeParse(t.text, t.name)).filter(Boolean)]) {
    if (seen.has(d.id)) continue;
    seen.add(d.id);
    out.push(d);
  }
  return out;
}
function safeParse(text, name) {
  try {
    return parseThemeFile(text, name);
  } catch {
    return null;
  }
}

/** A téma-mappa beolvasása (asztali). → { dir, count, errors } */
export async function readThemeFolder() {
  if (!api.themeDirRead) return null;
  const r = await api.themeDirRead(store.settings.themeDir || '');
  const errors = [];
  folderDefs = [];
  for (const f of r.files) {
    try {
      folderDefs.push({ ...parseThemeFile(f.text, f.name), fromFolder: true });
    } catch (err) {
      errors.push(`${f.name}: ${err.message}`);
    }
  }
  folderInfo = { dir: r.dir, errors };
  return { dir: r.dir, count: folderDefs.length, errors };
}

export async function loadCustomThemes() {
  try {
    await readThemeFolder();
  } catch (err) {
    folderInfo = { dir: store.settings.themeDir || '', errors: [err.message] };
  }
  registerCustomThemes(allDefs());
}

/** Téma-fájl feltöltése (a beállításokba kerül – így a szinkron / mentés is viszi). */
async function uploadTheme() {
  let f = null;
  if (api.openFile) f = await api.openFile([{ name: _t('Adás téma'), extensions: ['adastheme', 'json'] }]);
  else {
    f = await new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.adastheme,.json,application/json';
      input.onchange = async () => {
        const file = input.files?.[0];
        resolve(file ? { name: file.name, text: await file.text() } : null);
      };
      input.click();
    });
  }
  if (!f) return null;
  const d = parseThemeFile(f.text, f.name);
  const list = uploaded().filter((t) => safeParse(t.text, t.name)?.id !== d.id);
  list.push({ name: f.name, text: f.text, at: Date.now() });
  store.settings.customThemes = list;
  store.save();
  registerCustomThemes(allDefs());
  return d;
}

/** A jelenlegi (vagy bármelyik beépített) stílus sablonként – ebből érdemes kiindulni. */
export function themeTemplate(baseId = currentTheme()) {
  const cs = getComputedStyle(document.body);
  const v = (name) => cs.getPropertyValue(name).trim();
  const base = THEMES[baseId]?.custom ? THEMES[baseId].custom.base : baseId;
  return JSON.stringify(
    {
      adasTheme: 1,
      id: 'sajat-tema',
      name: _t('Saját téma'),
      description: _t('Rövid leírás: milyen hangulatú, mire hasonlít.'),
      author: store.profile?.name || '',
      tone: document.body.dataset.tone === 'light' ? 'light' : 'dark',
      base: base || '',
      colors: { bg: v('--bg'), bg2: v('--bg-2'), bg3: v('--bg-3'), bg4: v('--bg-4'), line: v('--line'), text: v('--text'), textStrong: v('--text-strong'), muted: v('--muted'), accent: v('--accent'), accent2: v('--accent-2') },
      fonts: { body: v('--font'), headings: '' },
      radius: v('--radius') || '6px',
      background: '',
      preview: [v('--bg'), v('--accent'), v('--bg-3')],
      css: _t('/* Díszítés ide: pl. & .dcard { border: 2px solid var(--accent); } */'),
    },
    null,
    2
  );
}

/** Beállítások → Megjelenés → Saját témák */
export function renderThemeTools(box, onChange) {
  const draw = () => {
    const defs = allDefs();
    box.innerHTML = `<h3>${_t('Saját témák')} <button class="help-link" data-help="custom-theme" title="${_t('Súgó: saját téma készítése')}">?</button></h3>
      <p class="muted small">${_t('Téma-fájl (.adastheme vagy .json) feltöltésével,')} ${api.themeDirRead ? _t('vagy a téma-mappába másolva') : ''} ${_t('saját kinézetet adhatsz az alkalmazásnak. A témák csak a kinézetet változtatják (színek, betűk, keretek, minták), az elrendezést nem. Leírás és minta: a ? gomb.')}</p>
      ${defs.length
          ? `<ul class="src-list">${defs
              .map((d) => `<li><span class="ct-sw" style="${d.preview[0] ? `background:${esc(d.preview[0])}` : ''}"><i style="${d.preview[1] ? `background:${esc(d.preview[1])}` : ''}"></i><i style="${d.preview[2] ? `background:${esc(d.preview[2])}` : ''}"></i></span>
                <span><b>${esc(d.name)}</b><small>${esc(d.description || '')}${d.author ? ' · ' + esc(d.author) : ''} · ${d.fromFolder ? `${_t('téma-mappa:')} ` + esc(d.source) : _t('feltöltve')}</small></span>
                <button class="btn small" data-ct-use="${esc(d.key)}">${_t('Használom')}</button>${d.fromFolder ? '' : `<button class="btn small danger" data-ct-del="${esc(d.id)}">${_t('Törlés')}</button>`}</li>`)
              .join('')}</ul>`
          : `<p class="muted small">${_t('Még nincs saját téma.')}</p>`}
      ${folderInfo.errors.length ? `<div class="warn small">${folderInfo.errors.map(esc).join('<br>')}</div>` : ''}
      <div class="inline">
        <button class="btn small" data-ct="upload">${_t('Téma-fájl feltöltése…')}</button>
        ${api.themeDirRead ? `<button class="btn small" data-ct="reload">${_t('Téma-mappa újraolvasása')}</button><button class="btn small" data-ct="opendir">${_t('Téma-mappa megnyitása')}</button><button class="btn small" data-ct="pickdir">${_t('Másik téma-mappa…')}</button>` : ''}
        ${api.saveFile ? `<button class="btn small" data-ct="template">${_t('Sablon mentése a mostani stílusból')}</button>` : ''}
      </div>
      ${api.themeDirRead ? `<p class="muted small">${_t('Téma-mappa: <code>')}${esc(folderInfo.dir || store.settings.themeDir || _t('az adatmappa „themes” almappája'))}</code></p>` : ''}`;
  };
  box.onclick = async (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    const a = b.dataset.ct;
    if (!a && !b.dataset.ctUse && !b.dataset.ctDel) return;
    e.stopPropagation();
    try {
      if (a === 'upload') {
        const d = await uploadTheme();
        if (d) {
          toast(`${_t('Téma betöltve: {name}', { name: d.name })}`);
          store.setProfileValue('theme', d.key);
          applyTheme();
          onChange?.();
        }
      } else if (a === 'reload') {
        const r = await readThemeFolder();
        registerCustomThemes(allDefs());
        toast(`${_t('{count} téma a mappában', { count: r.count })}${r.errors.length ? `${_t(', {length} hibás', { length: r.errors.length })}` : ''}`);
        applyTheme();
        onChange?.();
      } else if (a === 'opendir') await api.themeDirOpen(store.settings.themeDir || '');
      else if (a === 'pickdir') {
        const dir = await api.pickFolder();
        if (!dir) return;
        store.settings.themeDir = dir;
        store.save();
        await readThemeFolder();
        registerCustomThemes(allDefs());
        onChange?.();
      } else if (a === 'template') {
        const ok = await api.saveFile('sajat-tema.adastheme', themeTemplate());
        if (ok) toast(_t('Sablon elmentve – szerkeszd, majd töltsd fel vagy másold a téma-mappába.'));
      } else if (b.dataset.ctUse) {
        store.setProfileValue('theme', b.dataset.ctUse);
        applyTheme();
        onChange?.();
      } else if (b.dataset.ctDel) {
        if (!(await confirmDialog(_t('Törlöd ezt a saját témát?'), { ok: _t('Törlés'), danger: true }))) return;
        store.settings.customThemes = uploaded().filter((t) => safeParse(t.text, t.name)?.id !== b.dataset.ctDel);
        store.save();
        registerCustomThemes(allDefs());
        if (!THEMES[store.profile.theme]) store.setProfileValue('theme', 'netflix');
        applyTheme();
        onChange?.();
      }
    } catch (err) {
      toast(`${_t('Hiba:')} ` + (err.message || err), { timeout: 8000 });
    }
    draw();
  };
  draw();
}
