/* Overture — Drum Studio: a playable kit (touch, mouse or keyboard) with a loop recorder,
 * a groove library, rudiments, fills (plus a fresh-fill generator and groove remixes), and
 * "learn to read" rhythm lessons — every pattern can be heard and practised with the
 * drum-along trainer, which scores your timing. */
(function (root) {
  'use strict';
  const PM = root.PM;
  const { UI } = PM;
  const { icon, esc, $, $$ } = UI;
  const D = () => PM.DrumCore;

  const TABS = [['kit', '🥁 Play the kit'], ['grooves', '🎶 Grooves'], ['rudiments', '✋ Rudiments'], ['fills', '🎲 Fills & remix'], ['learn', '📖 Learn to read']];
  // pads on a top-down kit (viewBox 600×380)
  const LAYOUT = {
    kick: { cx: 318, cy: 300, rx: 74, ry: 58 }, crash: { cx: 98, cy: 64, rx: 64, ry: 25, cym: 1 }, ride: { cx: 505, cy: 76, rx: 70, ry: 28, cym: 1 },
    hho: { cx: 70, cy: 150, rx: 48, ry: 18, cym: 1 }, hhc: { cx: 82, cy: 214, rx: 48, ry: 18, cym: 1 }, hhp: { cx: 58, cy: 322, rx: 30, ry: 22 },
    tomh: { cx: 244, cy: 120, rx: 44, ry: 40 }, tomm: { cx: 356, cy: 120, rx: 48, ry: 43 }, snare: { cx: 196, cy: 240, rx: 56, ry: 50 },
    toml: { cx: 452, cy: 238, rx: 64, ry: 58 }, rim: { cx: 150, cy: 322, rx: 30, ry: 22 }, cowbell: { cx: 400, cy: 40, rx: 26, ry: 16 },
  };
  const DRAW_ORDER = ['kick', 'toml', 'snare', 'tomh', 'tomm', 'hhp', 'rim', 'hhc', 'hho', 'crash', 'ride', 'cowbell'];

  PM.App.register({
    id: 'drums', title: 'Drum Studio', icon: 'drum',
    render(host, App) {
      const tab = App.drumTab || 'kit';
      host.innerHTML = `<div class="page-head"><div><div class="eyebrow">Drum Studio</div><h1>Learn rhythm on the drums</h1>
        <p>Play a real-sounding kit with your fingers or keyboard, learn grooves, rudiments and fills, and get scored on your timing — with a microphone on a real kit or with the on-screen pads.</p></div>
        ${App.instrument !== 'drums' ? '<button class="btn primary" id="drSwitch">🥁 Make drums my instrument</button>' : ''}</div>
        <div class="seg big-tabs seg-wrap" id="drTabs" style="margin-bottom:18px">${TABS.map(([k, l]) => `<button data-t="${k}" class="${k === tab ? 'on' : ''}">${l}</button>`).join('')}</div>
        <div id="drBody"></div>`;
      $$('#drTabs button', host).forEach((b) => (b.onclick = () => { App.drumTab = b.dataset.t; App.rerender(); }));
      const sw = $('#drSwitch', host); if (sw) sw.onclick = () => App.setInstrument('drums');
      PM.Sound.warm('drums', [36, 38, 42, 46, 49, 51, 48, 45, 43, 37, 44, 56]);
      const body = $('#drBody', host);
      const c = { kit, grooves: () => library(body, App, D().GROOVES, 'Grooves'), rudiments: () => library(body, App, D().RUDIMENTS, 'Rudiments'), fills, learn }[tab](body, App);
      return () => c && c();
    },
  });

  // ------------------------------------------------------------------ kit + looper
  function kitSvg() {
    let s = '<svg class="dr-kit" viewBox="0 0 600 380" role="group" aria-label="Drum kit">';
    for (const id of DRAW_ORDER) {
      const L = LAYOUT[id], pc = D().PIECE[id];
      s += `<g class="dr-pad ${L.cym ? 'cym' : 'drum'}" data-p="${id}" tabindex="0" role="button" aria-label="${esc(pc.name)}" style="--pc:${pc.color}">
        <ellipse cx="${L.cx}" cy="${L.cy}" rx="${L.rx}" ry="${L.ry}"/>${L.cym ? `<ellipse class="ring" cx="${L.cx}" cy="${L.cy}" rx="${L.rx * 0.18}" ry="${L.ry * 0.3}"/>` : `<ellipse class="ring" cx="${L.cx}" cy="${L.cy}" rx="${L.rx * 0.82}" ry="${L.ry * 0.82}"/>`}
        <text x="${L.cx}" y="${L.cy + 4}">${pc.short}</text><text class="key" x="${L.cx}" y="${L.cy + 18}">${pc.key === ' ' ? 'space' : pc.key}</text></g>`;
    }
    return s + '</svg>';
  }

  function kit(body, App) {
    const st = App.looper || (App.looper = { bpm: 90, bars: 2, events: [], quant: 4 });
    body.innerHTML = `<div class="grid g2 dr-top">
      <section class="card stage"><div class="card-head"><h3 style="color:#fff">🥁 Your kit</h3><span class="small" style="color:rgba(255,255,255,.7)">tap, click or use the keys shown</span></div>
        ${kitSvg()}<p class="small" style="color:rgba(255,255,255,.75);text-align:center">Keys: Space kick · J snare · F hi-hat · D open hat · S hat foot · G/H toms · K floor tom · R crash · U ride · L side-stick · C cowbell</p></section>
      <section class="card"><div class="card-head"><h3 id="drInfoT">Meet the kit</h3></div><p id="drInfo">Tap any drum or cymbal to hear it and learn what it does. A drum kit has <b>drums</b> (kick, snare, toms) that thud and crack, and <b>cymbals</b> (hi-hat, ride, crash) that shimmer and keep time.</p>
        <div class="card-head" style="margin-top:16px"><h3>🔁 Loop recorder</h3><span class="tag" id="lpTag">ready</span></div>
        <div class="grid g3"><label class="field">Tempo<input type="number" id="lpBpm" min="50" max="180" value="${st.bpm}"></label>
          <label class="field">Bars<select id="lpBars">${[1, 2, 4].map((n) => `<option ${n === st.bars ? 'selected' : ''}>${n}</option>`).join('')}</select></label>
          <label class="field">Snap to<select id="lpQ"><option value="0">Off (free)</option><option value="2">8th notes</option><option value="4">16th notes</option><option value="3">Triplets</option></select></label></div>
        <div class="row" style="gap:8px;flex-wrap:wrap;margin-top:10px"><button class="btn primary" id="lpRec">⏺ Record</button><button class="btn" id="lpPlay">${icon('play')} Play loop</button><button class="btn ghost" id="lpClear">${icon('trash')} Clear</button><label class="switch"><input type="checkbox" id="lpClick" checked><span class="track"></span>Click</label></div>
        <div id="lpGrid" class="da-grid" style="margin-top:12px"></div>
        <p class="small muted">Record a beat, then keep playing over it to add more (overdub). Make your own grooves!</p></section></div>`;
    $('#lpQ', body).value = String(st.quant);
    const svg = $('.dr-kit', body);
    const hit = (id, vel) => {
      PM.Sound.drum(id, 0, vel || 0.85);
      const g = svg.querySelector(`[data-p="${id}"]`); if (g) { g.classList.remove('hit'); void g.getBBox(); g.classList.add('hit'); setTimeout(() => g.classList.remove('hit'), 140); }
      const pc = D().PIECE[id]; $('#drInfoT', body).textContent = pc.name; $('#drInfo', body).textContent = pc.role;
      if (loop.recording || loop.playing) loop.add(id, vel || 0.85);
    };
    svg.addEventListener('pointerdown', (e) => { const g = e.target.closest('[data-p]'); if (!g) return; e.preventDefault(); const L = LAYOUT[g.dataset.p]; const r = svg.getBoundingClientRect(); const x = ((e.clientX - r.left) / r.width) * 600, y = ((e.clientY - r.top) / r.height) * 380; const dist = Math.min(1, Math.hypot((x - L.cx) / L.rx, (y - L.cy) / L.ry)); hit(g.dataset.p, 0.55 + 0.45 * (1 - dist * 0.6)); });
    const KEYS = {}; for (const pc of D().PIECES) KEYS[pc.key === ' ' ? ' ' : pc.key.toLowerCase()] = pc.id;
    const onKey = (e) => { if (e.target.matches('input, select, textarea') || e.repeat || e.metaKey || e.ctrlKey) return; const id = KEYS[e.key === ' ' ? ' ' : e.key.toLowerCase()]; if (id) { e.preventDefault(); hit(id, e.shiftKey ? 1 : 0.8); } };
    addEventListener('keydown', onKey);

    // ---- loop recorder
    const loop = {
      recording: false, playing: false, timer: 0, t0: 0, k: 0,
      len: () => st.bars * 4 * 60 / st.bpm,
      add(id, vel) {
        const ctx = PM.Audio.getCtx(), L = this.len();
        let pos = ((ctx.currentTime - this.t0) % L + L) % L;
        if (st.quant) { const step = 60 / st.bpm / st.quant; pos = (Math.round(pos / step) * step) % L; }
        st.events.push({ t: pos / L, id, vel });
        drawGrid();
      },
      start(record) {
        const ctx = PM.Audio.getCtx();
        this.stop();
        this.t0 = ctx.currentTime + (record && !st.events.length ? 4 * 60 / st.bpm : 0.1);
        if (record && !st.events.length) PM.DrumAlong.clickTrack(ctx.currentTime + 0.05, 4, st.bpm, 4, null, 0.8);
        this.recording = !!record; this.playing = true; this.k = 0;
        const L = this.len(); let n = 0;
        this.timer = setInterval(() => {
          const now = ctx.currentTime;
          while (this.t0 + n * L < now + 0.15) {
            const base = this.t0 + n * L;
            if ($('#lpClick', body) && $('#lpClick', body).checked) PM.DrumAlong.clickTrack(base, st.bars * 4, st.bpm, 4, null, 0.4);
            for (const e of st.events) { const t = base + e.t * L; if (t >= now - 0.01) PM.Sound.drum(e.id, t, e.vel * 0.9); }
            n++;
          }
        }, 40);
        $('#lpTag', body).textContent = record ? (st.events.length ? 'overdubbing — play!' : 'count-in… then play!') : 'looping';
        $('#lpRec', body).innerHTML = record ? '⏹ Stop' : '⏺ Record';
        $('#lpPlay', body).innerHTML = `${icon('stop')} Stop`;
      },
      stop() { clearInterval(this.timer); this.recording = false; this.playing = false; const t = $('#lpTag', body); if (t) { t.textContent = st.events.length ? st.events.length + ' hits recorded' : 'ready'; $('#lpRec', body).innerHTML = '⏺ Record'; $('#lpPlay', body).innerHTML = `${icon('play')} Play loop`; } },
    };
    const drawGrid = () => {
      const q = st.quant || 4, n = st.bars * 4 * q;
      const tracks = {};
      for (const e of st.events) { const k = Math.round(e.t * n) % n; tracks[e.id] = tracks[e.id] || '.'.repeat(n).split(''); tracks[e.id][k] = e.vel > 0.9 ? 'X' : 'x'; }
      for (const id in tracks) tracks[id] = tracks[id].join('');
      $('#lpGrid', body).innerHTML = st.events.length ? PM.DrumAlong.gridHtml({ bpb: 4, spb: q, bars: st.bars, tracks }) : '';
    };
    $('#lpBpm', body).onchange = (e) => { st.bpm = Math.max(50, Math.min(180, +e.target.value || 90)); if (loop.playing) loop.start(loop.recording); };
    $('#lpBars', body).onchange = (e) => { st.bars = +e.target.value; st.events = []; loop.stop(); drawGrid(); };
    $('#lpQ', body).onchange = (e) => { st.quant = +e.target.value; drawGrid(); };
    $('#lpRec', body).onclick = () => (loop.recording ? loop.stop() : loop.start(true));
    $('#lpPlay', body).onclick = () => (loop.playing ? loop.stop() : st.events.length ? loop.start(false) : UI.toast('Record something first 🙂', { icon: '🥁' }));
    $('#lpClear', body).onclick = () => { st.events = []; drawGrid(); if (!loop.playing) loop.stop(); };
    drawGrid();
    return () => { removeEventListener('keydown', onKey); loop.stop(); };
  }

  // ------------------------------------------------------------------ libraries (grooves / rudiments)
  function library(body, App, list, kind) {
    let sel = App['drumSel' + kind] || list[0].id, ctl = null;
    const draw = () => {
      const p = list.find((x) => x.id === sel) || list[0];
      body.innerHTML = `<div class="dr-lib">${[1, 2, 3, 4, 5].map((lv) => { const xs = list.filter((x) => x.level === lv); return xs.length ? `<div class="dr-lv"><span class="lvl l${lv}">Level ${lv}</span>${xs.map((x) => `<button class="chip ${x.id === sel ? 'on' : ''}" data-s="${x.id}">${esc(x.name)}${x.style ? ` <span class="small muted">· ${esc(x.style)}</span>` : ''}</button>`).join('')}</div>` : ''; }).join('')}</div>
        <section class="card stage" style="margin-top:14px"><div id="drPa"></div></section>`;
      $$('[data-s]', body).forEach((b) => (b.onclick = () => { sel = App['drumSel' + kind] = b.dataset.s; if (ctl) ctl.stop(); draw(); }));
      ctl = PM.DrumAlong.mount($('#drPa', body), App, { id: 'drum-' + p.id, title: p.name, level: p.level, cat: p.style || kind, tip: p.tip, pattern: p, bpm: p.bpm });
    };
    draw();
    return () => ctl && ctl.stop();
  }

  // ------------------------------------------------------------------ fills & remix
  function fills(body, App) {
    let ctl = null, level = App.fillLevel || 2, current = D().FILLS[0];
    const draw = () => {
      body.innerHTML = `<div class="grid g2">
        <section class="card"><div class="card-head"><h3>🎲 Fresh fill generator</h3></div><p class="small">A brand-new fill every time — learn to hear and play fills of any shape.</p>
          <div class="seg" id="fLvl">${[1, 2, 3, 4].map((l) => `<button data-l="${l}" class="${l === level ? 'on' : ''}">Level ${l}</button>`).join('')}</div>
          <button class="btn primary" id="fNew" style="margin-top:10px">🎲 Make me a fill</button>
          <div class="card-head" style="margin-top:16px"><h3>📚 Classic fills</h3></div>
          <div class="row" style="gap:6px;flex-wrap:wrap">${D().FILLS.map((f) => `<button class="chip" data-f="${f.id}">${esc(f.name)}</button>`).join('')}</div></section>
        <section class="card"><div class="card-head"><h3>🎛️ Groove remix</h3></div><p class="small">Pick a groove and remix it — moved kicks, open hats, ghost notes, ride instead of hats. Creative variations to steal!</p>
          <select id="rmSel">${D().GROOVES.map((g) => `<option value="${g.id}">${esc(g.name)} · ${esc(g.style)}</option>`).join('')}</select>
          <button class="btn" id="rmGo" style="margin-top:10px">🔀 Remix it</button>
          <p class="small muted" style="margin-top:12px">Want to build from scratch? Use the <a href="#/metronome" id="toBeat">Beat maker</a> or record in <b>Play the kit</b>.</p></section></div>
        <section class="card stage" style="margin-top:14px"><div id="drPa"></div></section>`;
      $$('#fLvl button', body).forEach((b) => (b.onclick = () => { level = App.fillLevel = +b.dataset.l; $$('#fLvl button', body).forEach((x) => x.classList.toggle('on', x === b)); }));
      $('#fNew', body).onclick = () => show(D().randomFill(level));
      $$('[data-f]', body).forEach((b) => (b.onclick = () => show(D().FILLS.find((f) => f.id === b.dataset.f))));
      $('#rmGo', body).onclick = () => show(D().remix(D().GROOVES.find((g) => g.id === $('#rmSel', body).value)));
      $('#toBeat', body).onclick = (e) => { e.preventDefault(); App.metroTab = 'beats'; App.go('metronome'); };
      show(current);
    };
    const show = (p) => { current = p; if (ctl) ctl.stop(); ctl = PM.DrumAlong.mount($('#drPa', body), App, { id: 'drum-' + p.id, title: p.name, level: p.level, cat: p.remix ? 'Remix' : 'Fill', tip: p.tip, pattern: p, bpm: p.bpm || 84 }); };
    draw();
    return () => ctl && ctl.stop();
  }

  // ------------------------------------------------------------------ learn to read
  function learn(body, App) {
    const exs = D().exercises().filter((e) => e.cat === 'Note lengths');
    let ctl = null, sel = App.drumReadSel || exs[0].id;
    const draw = () => {
      body.innerHTML = `<section class="card"><div class="card-head"><h3>📖 How to read a drum grid</h3></div>
        <div class="grid g2"><div><ul class="ak-ul"><li>Each <b>row</b> is one part of the kit — cymbals at the top, kick at the bottom (just like drum music on a staff).</li><li>Each <b>column</b> is a slice of time. The numbers underneath are the beats; <b>e & a</b> are the 16ths in between.</li><li>A <b>big dot</b> is an accent (louder), a <b>small faint dot</b> is a ghost note (very soft), an empty box is a rest.</li><li>The ✋ row shows <b>sticking</b>: R = right hand, L = left hand.</li></ul></div>
        <div>${PM.DrumAlong.gridHtml(D().GROOVES[0])}<p class="small muted" style="margin-top:6px">Rock 8ths: hi-hat on every 8th, kick on 1 and 3, snare on 2 and 4.</p></div></div></section>
        <section class="card" style="margin-top:14px"><div class="card-head"><h3>⏱️ Note lengths on the drums</h3><a class="btn sm ghost" href="#/academy?s=drums-course">Drum course in the Academy →</a></div>
          <div class="row" style="gap:6px;flex-wrap:wrap">${exs.map((e) => `<button class="chip ${e.id === sel ? 'on' : ''}" data-e="${e.id}">L${e.level} · ${esc(e.title)}</button>`).join('')}</div></section>
        <section class="card stage" style="margin-top:14px"><div id="drPa"></div></section>`;
      $$('[data-e]', body).forEach((b) => (b.onclick = () => { sel = App.drumReadSel = b.dataset.e; if (ctl) ctl.stop(); draw(); }));
      const ex = exs.find((e) => e.id === sel) || exs[0];
      ctl = PM.DrumAlong.mount($('#drPa', body), App, ex, { path: true });
    };
    draw();
    return () => ctl && ctl.stop();
  }

  PM.DrumsView = { kitSvg, LAYOUT };
})(typeof self !== 'undefined' ? self : globalThis);
