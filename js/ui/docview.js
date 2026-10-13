/* Overture — attachment viewer: chord-chart PDFs (rendered with the bundled pdf.js, so it
 * works offline and on iPad), images and audio. Files come from the classroom server or
 * from this device. */
(function (root) {
  'use strict';
  const PM = root.PM;
  const { UI } = PM;
  const { icon, esc, $ } = UI;

  let pdfReady = null;
  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = src; s.onload = resolve; s.onerror = () => reject(new Error('Could not load ' + src));
      document.head.appendChild(s);
    });
  }
  /** pdf.js runs on the main thread (the worker script is loaded as a normal script), which
   *  also works from file:// in the desktop app and in the downloaded web version. */
  function loadPdfJs() {
    if (!pdfReady) {
      pdfReady = loadScript('vendor/pdfjs/pdf.worker.min.js').then(() => loadScript('vendor/pdfjs/pdf.min.js')).then(() => {
        const lib = root.pdfjsLib;
        if (!lib) throw new Error('PDF viewer unavailable');
        lib.GlobalWorkerOptions.workerSrc = 'vendor/pdfjs/pdf.worker.min.js';
        return lib;
      });
      pdfReady.catch(() => { pdfReady = null; });
    }
    return pdfReady;
  }

  const kindOf = (f) => {
    const t = (f.type || '') + ' ' + (f.name || '');
    if (/pdf/i.test(t)) return 'pdf';
    if (/^image\/|\.(png|jpe?g|gif|webp|heic)\b/i.test(t)) return 'image';
    if (/^audio\/|\.(mp3|m4a|wav|ogg|webm|aac|flac)\b/i.test(t)) return 'audio';
    if (/midi|\.(mid|midi)\b/i.test(t)) return 'midi';
    return 'file';
  };
  const ICON = { pdf: '📄', image: '🖼️', audio: '🎧', midi: '🎹', file: '📎' };

  /** Render a PDF blob page by page into `host`; pinch/zoom buttons scale it. */
  async function renderPdf(host, blob, opts) {
    opts = opts || {};
    host.innerHTML = '<div class="empty">Opening PDF…</div>';
    const lib = await loadPdfJs();
    const data = new Uint8Array(await blob.arrayBuffer());
    const doc = await lib.getDocument({ data, isEvalSupported: false }).promise;
    let zoom = opts.zoom || 1;
    host.innerHTML = `<div class="pdf-bar"><span class="muted small">${doc.numPages} page${doc.numPages === 1 ? '' : 's'}</span><div class="spacer"></div>
      <button class="mini-btn" data-z="-1">${icon('minus')}</button><span class="small" id="zLbl">100%</span><button class="mini-btn" data-z="1">${icon('plus')}</button></div><div class="pdf-pages"></div>`;
    const pages = $('.pdf-pages', host);
    const draw = async () => {
      pages.innerHTML = '';
      $('#zLbl', host).textContent = Math.round(zoom * 100) + '%';
      const width = Math.max(280, pages.clientWidth || host.clientWidth || 700);
      const dpr = Math.min(2, root.devicePixelRatio || 1);
      for (let n = 1; n <= doc.numPages; n++) {
        const page = await doc.getPage(n);
        const base = page.getViewport({ scale: 1 });
        const scale = (width / base.width) * zoom;
        const vp = page.getViewport({ scale: scale * dpr });
        const c = document.createElement('canvas');
        c.width = vp.width; c.height = vp.height;
        c.style.width = Math.round(vp.width / dpr) + 'px';
        c.className = 'pdf-page';
        pages.appendChild(c);
        await page.render({ canvasContext: c.getContext('2d'), viewport: vp }).promise;
      }
    };
    host.querySelectorAll('[data-z]').forEach((b) => (b.onclick = () => { zoom = Math.max(0.5, Math.min(3, zoom + +b.dataset.z * 0.25)); draw(); }));
    await draw();
    return doc;
  }

  /** Open one attachment in a modal. */
  async function open(f, opts) {
    opts = opts || {};
    const kind = kindOf(f);
    const m = UI.modal(`<div class="modal-body doc-modal"><div class="row"><h2 style="flex:1;min-width:0;overflow-wrap:anywhere">${ICON[kind]} ${esc(f.name || 'Attachment')}</h2><button class="btn sm ghost" id="dvSave">${icon('download')} Save</button><button class="btn sm" data-close>Close</button></div><div id="dvBody" style="margin-top:12px"><div class="empty">Loading…</div></div></div>`);
    m.el.querySelector('.modal').classList.add('wide');
    const body = $('#dvBody', m.el);
    let url = null;
    const cleanup = () => { if (url) URL.revokeObjectURL(url); };
    m.el.addEventListener('click', (e) => { if (e.target === m.el || e.target.closest('[data-close]')) cleanup(); });
    try {
      const blob = opts.blob || (await PM.Sync.fileBlob(f));
      url = URL.createObjectURL(blob);
      $('#dvSave', m.el).onclick = () => { const a = document.createElement('a'); a.href = url; a.download = f.name || 'attachment'; document.body.appendChild(a); a.click(); a.remove(); };
      if (kind === 'pdf') await renderPdf(body, blob);
      else if (kind === 'image') body.innerHTML = `<img src="${url}" alt="${esc(f.name)}" style="max-width:100%;border-radius:12px;display:block;margin:auto">`;
      else if (kind === 'audio') body.innerHTML = `<audio controls src="${url}" style="width:100%"></audio>`;
      else if (kind === 'midi') {
        body.innerHTML = `<p>A MIDI file. Open it in the Studio to play along with the coach.</p><button class="btn primary" id="dvStudio">${icon('studio')} Open in Studio</button>`;
        $('#dvStudio', body).onclick = async () => { m.close(); cleanup(); await PM.App.loadFile(new File([blob], f.name || 'song.mid', { type: 'audio/midi' })); PM.App.go('studio'); };
      } else body.innerHTML = `<p>This file can't be previewed here — use <b>Save</b> to open it on your device.</p>`;
    } catch (e) { body.innerHTML = `<div class="empty">${esc(e.message || 'Could not open the file')}</div>`; }
    return m;
  }

  /** A row of attachment chips; clicking opens the viewer. */
  function chips(files) {
    return (files || []).map((f, i) => `<button class="chip attach" data-att="${i}" title="${esc(f.name)}">${ICON[kindOf(f)]} ${esc((f.name || 'file').slice(0, 40))}</button>`).join('');
  }
  function wire(container, files) {
    container.querySelectorAll('[data-att]').forEach((b) => (b.onclick = () => open(files[+b.dataset.att])));
  }

  /** Audio element for a classroom file (recordings): fetches with sign-in, then plays. */
  async function audioPlayer(container, f) {
    container.innerHTML = '<span class="muted small">Loading recording…</span>';
    try {
      const blob = await PM.Sync.fileBlob(f, { cache: false });
      const url = URL.createObjectURL(blob);
      container.innerHTML = `<audio controls preload="metadata" src="${url}" style="width:100%"></audio>`;
      const a = container.querySelector('audio');
      a.onerror = () => { container.innerHTML = `<span class="small">This browser can't play ${esc(f.type || 'this format')}. <a href="${url}" download="${esc(f.name || 'recording')}">Download the recording</a> to listen.</span>`; };
      return a;
    } catch (e) { container.innerHTML = `<span class="small" style="color:var(--bad)">${esc(e.message)}</span>`; return null; }
  }

  PM.DocView = { open, chips, wire, renderPdf, kindOf, audioPlayer, loadPdfJs };
})(typeof self !== 'undefined' ? self : globalThis);
