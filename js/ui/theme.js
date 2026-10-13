/* Overture — appearance: colour themes, light/dark mode, fonts (Avenir Next by default), text
 * size, letter spacing and calm mode. Settings live in App.settings and are applied as
 * data-* attributes on <html>; index.html applies them before first paint to avoid a flash. */
(function (root) {
  'use strict';
  const PM = (root.PM = root.PM || {});

  const THEMES = [
    { id: 'violet', name: 'Violet', sw: 'linear-gradient(135deg,#7c3aed,#a855f7,#d946ef)' },
    { id: 'ocean', name: 'Ocean', sw: 'linear-gradient(135deg,#0284c7,#0ea5e9,#06b6d4)' },
    { id: 'forest', name: 'Forest', sw: 'linear-gradient(135deg,#059669,#10b981,#14b8a6)' },
    { id: 'sunset', name: 'Sunset', sw: 'linear-gradient(135deg,#ea580c,#f97316,#f43f5e)' },
    { id: 'rose', name: 'Rose', sw: 'linear-gradient(135deg,#e11d48,#f43f5e,#ec4899)' },
    { id: 'sunshine', name: 'Sunshine', sw: 'linear-gradient(135deg,#d97706,#f59e0b,#f97316)' },
    { id: 'slate', name: 'Slate', sw: 'linear-gradient(135deg,#334155,#4f46e5,#6366f1)' },
    { id: 'contrast', name: 'High contrast', sw: 'linear-gradient(135deg,#000,#0047ab)' },
  ];
  const FONTS = [
    { id: 'avenir', name: 'Avenir Next', sample: 'Clean & modern', family: '"Avenir Next","Avenir","Nunito Sans",sans-serif' },
    { id: 'rounded', name: 'Nunito Sans', sample: 'Soft & friendly', family: '"Nunito Sans",sans-serif' },
    { id: 'readable', name: 'Atkinson Hyperlegible', sample: 'Easiest letters to tell apart', family: '"Atkinson Hyperlegible",sans-serif' },
    { id: 'lexend', name: 'Lexend', sample: 'Made for reading fluency', family: '"Lexend",sans-serif' },
    { id: 'system', name: 'System (Inter)', sample: 'Your device font', family: '"Inter",system-ui,sans-serif' },
  ];
  const MODES = [{ id: 'light', name: '☀️ Light' }, { id: 'dark', name: '🌙 Dark' }, { id: 'auto', name: '🌗 Auto' }];
  const TEXT = [{ id: 'md', name: 'A' }, { id: 'lg', name: 'A+' }, { id: 'xl', name: 'A++' }];

  const DEFAULTS = { theme: 'violet', mode: 'light', font: 'avenir', text: 'md', spacing: 'normal', calm: false };
  const get = (s) => Object.assign({}, DEFAULTS, (s && s.appearance) || {});

  const darkQuery = root.matchMedia ? root.matchMedia('(prefers-color-scheme: dark)') : null;
  /** Apply appearance settings to the document. */
  function apply(settings) {
    if (typeof document === 'undefined') return;
    const a = get(settings), el = document.documentElement;
    el.dataset.theme = a.theme;
    el.dataset.mode = a.mode === 'auto' ? (darkQuery && darkQuery.matches ? 'dark' : 'light') : a.mode;
    el.dataset.font = a.font;
    el.dataset.text = a.text;
    el.dataset.spacing = a.spacing;
    el.dataset.calm = a.calm ? '1' : '0';
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', getComputedStyle(el).getPropertyValue('--v-900').trim() || '#1f0b44');
  }
  if (darkQuery && darkQuery.addEventListener) darkQuery.addEventListener('change', () => PM.App && apply(PM.App.settings));

  const calm = () => typeof document !== 'undefined' && document.documentElement.dataset.calm === '1';

  /** The Appearance settings card. */
  function panel(container, App, opts) {
    opts = opts || {};
    const { esc } = PM.UI;
    const a = get(App.settings);
    const set = (k, v) => {
      App.settings.appearance = Object.assign(get(App.settings), { [k]: v });
      App.saveSettings();
      apply(App.settings);
      panel(container, App, opts);
      if (opts.onChange) opts.onChange();
    };
    container.innerHTML = `
      <div class="card-head"><h3>🎨 Appearance</h3><span class="muted small">Colours, fonts and comfort settings · saved on this device</span></div>
      <div class="small muted" style="margin:4px 0 8px">Colour theme</div>
      <div class="theme-grid">${THEMES.map((t) => `<button class="theme-sw ${a.theme === t.id ? 'on' : ''}" data-theme-id="${t.id}"><i style="background:${t.sw}"></i>${esc(t.name)}</button>`).join('')}</div>
      <div class="row" style="margin-top:14px;gap:18px;flex-wrap:wrap">
        <div><div class="small muted" style="margin-bottom:6px">Mode</div><div class="seg" id="apMode">${MODES.map((m) => `<button data-v="${m.id}" class="${a.mode === m.id ? 'on' : ''}">${m.name}</button>`).join('')}</div></div>
        <div><div class="small muted" style="margin-bottom:6px">Text size</div><div class="seg" id="apText">${TEXT.map((m) => `<button data-v="${m.id}" class="${a.text === m.id ? 'on' : ''}">${m.name}</button>`).join('')}</div></div>
      </div>
      <div class="small muted" style="margin:14px 0 8px">Font</div>
      <div class="theme-grid" style="grid-template-columns:repeat(auto-fill,minmax(170px,1fr))">${FONTS.map((f) => `<button class="font-opt ${a.font === f.id ? 'on' : ''}" data-font-id="${f.id}" style="font-family:${f.family}"><b>${esc(f.name)}</b><span class="small">${esc(f.sample)}</span></button>`).join('')}</div>
      <div class="appearance-row" style="margin-top:14px">
        <label class="switch"><input type="checkbox" id="apCalm" ${a.calm ? 'checked' : ''}><span class="track"></span>Calm mode — no animations or confetti</label>
        <label class="switch"><input type="checkbox" id="apSpace" ${a.spacing === 'wide' ? 'checked' : ''}><span class="track"></span>Wider letter spacing</label>
      </div>
      <p class="small muted" style="margin-top:10px">Avenir Next is built into Apple devices; on Windows, Android and Linux the closest open font (Nunito Sans) is used. Atkinson Hyperlegible and Lexend help many readers with dyslexia or ADHD.</p>`;
    container.querySelectorAll('[data-theme-id]').forEach((b) => (b.onclick = () => set('theme', b.dataset.themeId)));
    container.querySelectorAll('[data-font-id]').forEach((b) => (b.onclick = () => set('font', b.dataset.fontId)));
    container.querySelectorAll('#apMode [data-v]').forEach((b) => (b.onclick = () => set('mode', b.dataset.v)));
    container.querySelectorAll('#apText [data-v]').forEach((b) => (b.onclick = () => set('text', b.dataset.v)));
    container.querySelector('#apCalm').onchange = (e) => set('calm', e.target.checked);
    container.querySelector('#apSpace').onchange = (e) => set('spacing', e.target.checked ? 'wide' : 'normal');
  }

  /** Appearance in a modal (from the sidebar palette button). */
  function openModal(App) {
    const m = PM.UI.modal('<div class="modal-body" id="apBox"></div><div class="modal-body" style="padding-top:0;text-align:right"><button class="btn primary" data-close>Done</button></div>');
    const box = m.el.querySelector('#apBox');
    if (box) panel(box, App);
  }

  PM.Theme = { THEMES, FONTS, MODES, DEFAULTS, get, apply, panel, openModal, calm };
  if (typeof module !== 'undefined' && module.exports) module.exports = PM.Theme;
})(typeof self !== 'undefined' ? self : globalThis);
