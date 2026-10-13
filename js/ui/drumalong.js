/* Overture — drum-along trainer. Shows a pattern as a drum grid (one row per kit piece, with
 * counts and sticking), plays it with the real kit, then scores your timing hit by hit —
 * listening through the microphone, or with on-screen / keyboard pads (which also checks
 * that you hit the right drum). Used by the drum Exercise path and the Drum Studio. */
(function (root) {
  'use strict';
  const PM = root.PM;
  const { UI } = PM;
  const { icon, esc, $, $$ } = UI;
  const D = () => PM.DrumCore;

  /** Schedule a pattern on the kit. Returns the absolute end time. */
  function playPattern(p, t0, bpm, loops, dest, opts) {
    opts = opts || {};
    const step = 60 / bpm / p.spb, len = p.bpb * p.spb * p.bars;
    for (let l = 0; l < (loops || 1); l++) {
      for (const h of D().hits(p)) for (const pc of h.pieces) PM.Sound.drum(pc.id, t0 + (l * len + h.step) * step, pc.vel * (opts.gain || 1), dest);
    }
    return t0 + (loops || 1) * len * step;
  }
  function clickTrack(t0, beats, bpm, bpb, dest, vel) {
    for (let i = 0; i < beats; i++) PM.Sound.drum(i % bpb === 0 ? 'woodhi' : 'wood', t0 + i * 60 / bpm, (vel || 0.7) * (i % bpb === 0 ? 1 : 0.8), dest);
  }

  /** Grid HTML for a pattern (results optional: per step 'perfect'|'good'|'early'|'late'|'miss'). */
  function gridHtml(p, results) {
    const n = p.bpb * p.spb * p.bars, cnt = D().COUNT[p.spb] || [''];
    const rows = D().usedPieces(p);
    const cell = (k, inner, cls) => `<span class="dg-c ${k % p.spb === 0 ? 'beat' : ''} ${k % (p.bpb * p.spb) === 0 && k ? 'bar' : ''} ${cls || ''}" data-k="${k}">${inner}</span>`;
    let h = `<div class="dg" style="--n:${n}">`;
    for (const id of rows) {
      const pc = D().PIECE[id], t = p.tracks[id];
      h += `<div class="dg-row"><span class="dg-l" title="${esc(pc.name)}" style="--pc:${pc.color}">${pc.short}</span>${Array.from({ length: n }, (_, k) => { const c = t[k] || '.'; const v = D().velOf(c); return cell(k, v ? `<i class="${c === 'X' ? 'acc' : c === 'o' ? 'ghost' : ''}" style="--pc:${pc.color}"></i>` : '', results && v ? 'r-' + (results[k] || '') : ''); }).join('')}</div>`;
    }
    if (p.sticking) h += `<div class="dg-row dg-stick"><span class="dg-l">✋</span>${Array.from({ length: n }, (_, k) => cell(k, p.sticking[k] && p.sticking[k] !== '.' ? p.sticking[k] : '')).join('')}</div>`;
    h += `<div class="dg-row dg-count"><span class="dg-l"></span>${Array.from({ length: n }, (_, k) => cell(k, k % p.spb === 0 ? String(Math.floor((k % (p.bpb * p.spb)) / p.spb) + 1) : cnt[k % p.spb] || '')).join('')}</div>`;
    return h + '</div>';
  }

  function mount(box, App, ex, opts) {
    opts = opts || {};
    const p = ex.pattern || ex;
    let bpm = ex.bpm || p.bpm || 80, loops = opts.loops || 2, mode = App.settings.drumInput || 'mic', guide = true;
    let running = false, timers = [], raf = 0, unsub = null, keyOff = null, take = null;
    const used = D().usedPieces(p);
    const KEYS = { ' ': 'kick' };
    for (const pc of D().PIECES) if (pc.key && pc.key !== ' ') KEYS[pc.key.toLowerCase()] = pc.id;

    box.innerHTML = `<div class="da">
      <div class="pa-head"><span class="lvl l${ex.level || 1}">Level ${ex.level || 1}</span><span class="chip">${esc(ex.cat || p.style || 'Drums')}</span><b class="pa-title">${esc(ex.title || p.name)}</b></div>
      ${ex.desc ? `<p class="small" style="margin-top:6px">${esc(ex.desc)}</p>` : ''}
      ${ex.tip || p.tip ? `<div class="pa-tip">💡 ${esc(ex.tip || p.tip)}</div>` : ''}
      <div class="pa-controls">
        <label class="field">Tempo <b id="daBpmL">${bpm}</b> BPM<input type="range" id="daBpm" min="40" max="200" value="${bpm}"></label>
        <div class="seg" id="daMode"><button data-m="mic" class="${mode === 'mic' ? 'on' : ''}">${icon('mic')} Microphone</button><button data-m="tap" class="${mode === 'tap' ? 'on' : ''}">👆 Tap pads</button></div>
        <label class="field">Repeats<select id="daLoops">${[1, 2, 4].map((n) => `<option ${n === loops ? 'selected' : ''}>${n}</option>`).join('')}</select></label>
        <label class="switch"><input type="checkbox" id="daGuide" checked><span class="track"></span>Guide kit</label>
      </div>
      <div class="da-grid" id="daGrid">${gridHtml(p)}</div>
      <div class="row" style="justify-content:center;margin-top:10px;gap:10px">
        <button class="btn glass" id="daListen">${icon('headphones')} Listen</button>
        <button class="btn primary" id="daGo">${icon('play')} Start take</button>
      </div>
      <div class="da-pads ${mode === 'tap' ? '' : 'hidden'}" id="daPads">${used.map((id) => { const pc = D().PIECE[id]; return `<button class="da-pad" data-p="${id}" style="--pc:${pc.color}"><b>${esc(pc.name.replace(/ \(.*\)/, ''))}</b><kbd>${pc.key === ' ' ? 'Space' : pc.key}</kbd></button>`; }).join('')}</div>
      <p class="small" id="daMsg" style="text-align:center;margin-top:8px"></p>
      <div id="daResult"></div>
    </div>`;
    const q = (id) => $('#' + id, box);

    const stepDur = () => 60 / bpm / p.spb, nSteps = p.bpb * p.spb * p.bars;
    // playhead
    let headT0 = 0, headEnd = 0, lastK = -1;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      const now = PM.Audio.getCtx().currentTime;
      let k = -1;
      if (now >= headT0 && now < headEnd) k = Math.floor((now - headT0) / stepDur()) % nSteps;
      if (k === lastK) return;
      lastK = k;
      $$('.dg-c.now', box).forEach((c) => c.classList.remove('now'));
      if (k >= 0) $$(`.dg-c[data-k="${k}"]`, box).forEach((c) => c.classList.add('now'));
    };
    raf = requestAnimationFrame(tick);

    q('daBpm').oninput = (e) => { bpm = +e.target.value; q('daBpmL').textContent = bpm; };
    q('daLoops').onchange = (e) => (loops = +e.target.value);
    q('daGuide').onchange = (e) => (guide = e.target.checked);
    $$('#daMode button', box).forEach((b) => (b.onclick = () => { mode = b.dataset.m; App.settings.drumInput = mode; App.saveSettings(); $$('#daMode button', box).forEach((x) => x.classList.toggle('on', x === b)); q('daPads').classList.toggle('hidden', mode !== 'tap'); }));

    const out = () => { const ctx = PM.Audio.getCtx(), g = ctx.createGain(); g.connect(PM.Sound.transient()); return g; };
    UI.playToggle(q('daListen'), () => {
      if (running) return 0;
      const ctx = PM.Audio.getCtx(), t0 = ctx.currentTime + 0.15, g = out();
      clickTrack(t0, p.bpb, bpm, p.bpb, g, 0.6);
      const start = t0 + p.bpb * 60 / bpm;
      headT0 = start; headEnd = playPattern(p, start, bpm, 1, g);
      q('daMsg').textContent = 'One bar count-in, then the pattern.';
      return headEnd - ctx.currentTime;
    }, { onStop: () => { headEnd = 0; q('daMsg').textContent = ''; } });

    // pads (tap mode) — also hear yourself
    const tap = (id) => {
      PM.Sound.drum(id, 0, D().PIECE[id] && id === 'kick' ? 1 : 0.85);
      const pad = box.querySelector(`.da-pad[data-p="${id}"]`); if (pad) UI.bump(pad, 'pulse-once');
      if (take && mode === 'tap') take.played.push({ time: PM.Audio.getCtx().currentTime, piece: id });
    };
    $$('.da-pad', box).forEach((b) => b.addEventListener('pointerdown', (e) => { e.preventDefault(); tap(b.dataset.p); }));
    const onKey = (e) => {
      if (e.target.matches('input, select, textarea') || e.repeat) return;
      const id = KEYS[e.key.toLowerCase()];
      if (id && mode === 'tap') { e.preventDefault(); tap(id); }
    };
    addEventListener('keydown', onKey);
    keyOff = () => removeEventListener('keydown', onKey);

    q('daGo').onclick = async () => {
      if (running) return finish(true);
      const ctx = PM.Audio.getCtx();
      if (mode === 'mic') {
        try { App.live.latency = App.settings.latency; await App.live.start(App.settings.deviceId); }
        catch (e) { q('daMsg').innerHTML = `Microphone unavailable (${esc(e.message || e)}) — switch to <b>Tap pads</b> to play with keys or touch.`; return; }
      }
      running = true;
      q('daGo').innerHTML = `${icon('stop')} Stop`;
      q('daResult').innerHTML = '';
      q('daGrid').innerHTML = gridHtml(p);
      const g = out();
      const t0 = ctx.currentTime + 0.2, start = t0 + p.bpb * 60 / bpm;
      clickTrack(t0, p.bpb + loops * p.bpb * p.bars, bpm, p.bpb, g, guide ? 0.35 : 0.6);
      if (guide) playPattern(p, start, bpm, loops, g, { gain: 0.45 });
      const exp = [];
      for (let l = 0; l < loops; l++) for (const h of D().hits(p)) exp.push({ time: start + (l * nSteps + h.step) * stepDur(), step: h.step, pieces: h.pieces.map((x) => x.id) });
      headT0 = start; headEnd = start + loops * nSteps * stepDur();
      take = { exp, played: [], startedAt: performance.now() };
      q('daMsg').textContent = mode === 'mic' ? 'Count-in… then play along — Overture listens for every hit.' : 'Count-in… then tap the pads (or keys) with the grid.';
      if (mode === 'mic') unsub = App.live.on((f) => { if (f.onset && take && f.time > start - 0.15) take.played.push({ time: f.time }); });
      timers.push(setTimeout(() => finish(false), (headEnd - ctx.currentTime + 0.6) * 1000));
    };

    function finish(aborted) {
      if (!running) return;
      running = false;
      timers.forEach(clearTimeout); timers = [];
      if (unsub) { unsub(); unsub = null; App.live.stop(); }
      q('daGo').innerHTML = `${icon('play')} Start take`;
      headEnd = 0;
      const t = take; take = null;
      if (!t || (aborted && t.played.length < 3)) { q('daMsg').textContent = 'Take stopped — start again when ready.'; return; }
      const s = D().score(t.exp, t.played);
      // colour each step by its result in the last loop it was played
      const res = {};
      t.exp.forEach((e, i) => (res[e.step] = s.perHit[i].result));
      q('daGrid').innerHTML = gridHtml(p, res);
      const stars = D().stars(s);
      const pct = (x) => Math.round(x * 100) + '%';
      const tip = s.accuracy < 0.7 ? 'Slow the tempo down and count out loud — accuracy first, speed later.' : Math.abs(s.avgMs) > 20 ? (s.avgMs < 0 ? `You're rushing by about ${-s.avgMs} ms — relax and let the click come to you.` : `You're dragging by about ${s.avgMs} ms — anticipate the beat a little.`) : s.spreadMs > 30 ? 'Good average timing, but some hits wander — practise with the gap trainer.' : 'Rock-solid! Push the tempo up 4–6 BPM.';
      q('daResult').innerHTML = `<div class="pa-res pop-in"><div class="big-stars">${'★'.repeat(stars)}${'☆'.repeat(3 - stars)}</div>
        <div class="row" style="justify-content:center;gap:8px;flex-wrap:wrap"><span class="chip">Hits <b>${pct(s.accuracy)}</b></span><span class="chip">In time <b>${pct(s.inTime)}</b></span><span class="chip">Average <b>${s.avgMs > 0 ? '+' : ''}${s.avgMs} ms</b></span><span class="chip">Spread <b>±${s.spreadMs} ms</b></span>${s.pieceAccuracy != null ? `<span class="chip">Right drum <b>${pct(s.pieceAccuracy)}</b></span>` : ''}${s.extras ? `<span class="chip">Extra hits <b>${s.extras}</b></span>` : ''}</div>
        <p class="small" style="margin-top:8px">${esc(tip)}</p>
        <div class="dg-legend small"><span class="r-perfect">perfect</span><span class="r-good">good</span><span class="r-early">early</span><span class="r-late">late</span><span class="r-miss">missed</span></div></div>`;
      q('daMsg').textContent = '';
      if (opts.path) {
        const g = App.game.state; g.path = g.path || {};
        const o = g.path[ex.id] || {};
        g.path[ex.id] = { best: Math.max(o.best || 0, Math.round(s.accuracy * 100) / 100), stars: Math.max(o.stars || 0, stars), bpm: Math.max(o.bpm || 0, stars ? bpm : 0), takes: (o.takes || 0) + 1, last: new Date().toISOString() };
        App.game.save();
        opts.onProgress && opts.onProgress(g.path[ex.id]);
      }
      App.game.recordSession({ mode: 'learn', instrument: 'drums', seconds: (performance.now() - t.startedAt) / 1000, title: ex.title || p.name, assignmentId: opts.assignment ? opts.assignment.id : null, summary: { accuracy: s.accuracy, timingAccuracy: s.inTime, onsets: t.played.length, score: Math.round(s.accuracy * 100 + s.inTime * 50), stars, maxCombo: 0, insights: [`${pct(s.accuracy)} of hits, ${pct(s.inTime)} in time at ${bpm} BPM`, `Average ${s.avgMs > 0 ? '+' : ''}${s.avgMs} ms · spread ±${s.spreadMs} ms`] } });
      App.game.progressDaily('rhythmHits', Math.round(s.inTime * t.exp.length));
      if (stars === 3) UI.confetti();
    }

    return { stop() { finish(true); cancelAnimationFrame(raf); if (keyOff) keyOff(); timers.forEach(clearTimeout); } };
  }

  PM.DrumAlong = { mount, gridHtml, playPattern, clickTrack };
})(typeof self !== 'undefined' ? self : globalThis);
