/* Cadenza — Click patterns tab (Rhythm & Metronome): a step-sequencer editor for custom
 * click loops. Tap steps to cycle rest → click → accent → soft, pick beats, steps per beat
 * and bars, load presets (clave, 6/8, gap trainers…), save your own, and loop them with
 * an optional tempo ramp and "silent loop" trainer. */
(function (root) {
  'use strict';
  const PM = root.PM;
  const { UI } = PM;
  const { icon, esc, $, $$ } = UI;
  const CP = () => PM.ClickPat;

  const COUNT = { 1: [''], 2: ['', '&'], 3: ['', 'trip', 'let'], 4: ['', 'e', '&', 'a'], 6: ['', 'la', 'li', '&', 'la', 'li'] };
  const BRUSHES = [['cycle', '🔁 Tap to cycle'], [3, '● Accent'], [2, '• Click'], [1, '∘ Soft'], [0, '× Rest']];

  function render(host, App, tabsHtml) {
    const S = App.settings;
    const loop = App.clickLoop || (App.clickLoop = new (CP().ClickLoop)());
    if (!loop._init) {
      loop._init = true;
      loop.setPattern(S.clickPattern && S.clickPattern.steps ? S.clickPattern : CP().preset('four'));
      loop.setBpm(App.metronome.bpm || 90);
    }
    let p = loop.pattern, brush = 'cycle', ramp = null, startedAt = 0;
    const save = () => { S.clickPattern = p; App.saveSettings(); };
    const mine = () => S.clickPatterns || (S.clickPatterns = []);

    const groups = [...new Set(CP().PRESETS.map((x) => x.group))];
    host.innerHTML = `<div class="page-head"><div><div class="eyebrow">Metronome & rhythm</div><h1>Click patterns</h1><p>Design your own click loop on a step grid — accents, soft ghost clicks and rests — then loop it while you practise. Great for clave, odd meters, off-beat and “disappearing click” training.</p></div></div>
      ${tabsHtml}
      <section class="card stage ck-stage">
        <div class="ck-top">
          <div class="bpm-controls">
            <button class="btn glass icon" id="cpMinus" aria-label="Slower">${icon('minus')}</button>
            <div class="ck-bpm"><b id="cpBpm">${loop.bpm}</b><span>BPM</span></div>
            <button class="btn glass icon" id="cpPlus" aria-label="Faster">${icon('plus')}</button>
          </div>
          <input type="range" id="cpSlider" min="30" max="260" value="${loop.bpm}" aria-label="Tempo">
          <div class="row" style="justify-content:center;gap:10px">
            <button class="btn white" id="cpGo" style="min-width:140px">${icon(loop.running ? 'stop' : 'play')} ${loop.running ? 'Stop' : 'Play loop'}</button>
            <select id="cpPreset" aria-label="Presets"><option value="">Presets…</option>${groups.map((g) => `<optgroup label="${esc(g)}">${CP().PRESETS.filter((x) => x.group === g).map((x) => `<option value="${x.id}">${esc(x.name)}</option>`).join('')}</optgroup>`).join('')}</select>
          </div>
          <div class="ck-status small" id="cpStatus"></div>
        </div>
        <div id="cpGrid" class="ck-grid" role="grid" aria-label="Click pattern steps"></div>
        <div class="seg seg-wrap ck-brush" id="cpBrush">${BRUSHES.map(([k, l]) => `<button data-b="${k}" class="${brush === k ? 'on' : ''}">${l}</button>`).join('')}</div>
        <p class="small muted" id="cpTip" style="margin-top:8px"></p>
      </section>
      <div class="grid g2" style="margin-top:18px">
        <section class="card">
          <div class="card-head"><h3>${icon('sliders')} Grid</h3><span class="tag" id="cpLen"></span></div>
          <div class="grid g3">
            <label class="field">Beats per bar<select id="cpBeats">${Array.from({ length: 12 }, (_, i) => i + 1).map((n) => `<option ${n === p.beats ? 'selected' : ''}>${n}</option>`).join('')}</select></label>
            <label class="field">Bars in loop<select id="cpBars">${[1, 2, 3, 4, 6, 8].map((n) => `<option ${n === p.bars ? 'selected' : ''}>${n}</option>`).join('')}</select></label>
            <label class="field">Sound<select id="cpSound">${[['click', 'Click'], ['wood', 'Woodblock'], ['sticks', 'Drum sticks'], ['cow', 'Cowbell'], ['kit', 'Drum kit (kick · snare · hat)'], ['beep', 'Beep']].map(([k, l]) => `<option value="${k}" ${loop.sound === k ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
          </div>
          <label class="field" style="margin-top:12px">Steps per beat</label>
          <div class="seg" id="cpSub" style="margin-top:6px">${[[1, '♩ 1'], [2, '♫ 2'], [3, '3 triplets'], [4, '𝅘𝅥𝅯 4'], [6, '6']].map(([v, l]) => `<button data-v="${v}" class="${p.sub === v ? 'on' : ''}">${l}</button>`).join('')}</div>
          <label class="field" style="margin-top:12px">Swing <b id="cpSwV">${Math.round((p.swing || 0) * 100)}%</b><input type="range" id="cpSwing" min="0" max="1" step="0.05" value="${p.swing || 0}"></label>
          <label class="field">Volume<input type="range" id="cpVol" min="0" max="1" step="0.05" value="${loop.volume}"></label>
          <div class="row" style="gap:8px;flex-wrap:wrap;margin-top:12px">
            <button class="btn sm" id="cpClear">${icon('trash')} Clear</button>
            <button class="btn sm" id="cpBeatsOnly">Beats only</button>
            <button class="btn sm" id="cpCopy">Copy bar 1 → all</button>
            <button class="btn sm" id="cpShiftL" aria-label="Shift left">⟵ Shift</button>
            <button class="btn sm" id="cpShiftR" aria-label="Shift right">Shift ⟶</button>
            <button class="btn sm" id="cpInvert">Swap hits & rests</button>
          </div>
        </section>
        <section class="card">
          <div class="card-head"><h3>${icon('bolt')} Practice tools</h3></div>
          <label class="field">Silent loops (gap trainer)<select id="cpMute"><option value="0">Off — click every loop</option><option value="1">Play 1 loop, silent 1 loop</option><option value="2">Play 2 loops, silent 2 loops</option></select></label>
          <div class="grid g3" style="margin-top:12px">
            <label class="field">Ramp + BPM<input type="number" id="cpRStep" value="4" min="1" max="20"></label>
            <label class="field">Every N loops<input type="number" id="cpREvery" value="2" min="1" max="16"></label>
            <label class="field">Up to BPM<input type="number" id="cpRTarget" value="${Math.min(240, loop.bpm + 30)}" min="40" max="260"></label>
          </div>
          <button class="btn primary sm" id="cpRamp" style="margin-top:10px">${icon('bolt')} Start tempo ramp</button>
          <div class="card-head" style="margin-top:18px"><h3>🎲 Surprise me</h3></div>
          <div class="seg" id="cpRand">${['Easy', 'Medium', 'Hard'].map((l, i) => `<button data-r="${i}">${l}</button>`).join('')}</div>
          <p class="small muted" style="margin-top:8px">A new random pattern every time — clap it, then play it on your instrument.</p>
        </section>
      </div>
      <section class="card" style="margin-top:18px">
        <div class="card-head"><h3>💾 My patterns</h3><div class="row" style="gap:8px"><button class="btn sm primary" id="cpSave">${icon('check')} Save</button><button class="btn sm" id="cpShare">Copy code</button><button class="btn sm" id="cpImport">Paste code</button></div></div>
        <div id="cpMine" class="ck-mine"></div>
      </section>`;

    const grid = $('#cpGrid', host);
    const drawGrid = () => {
      const per = p.beats * p.sub, cnt = COUNT[p.sub] || [''];
      let html = '';
      for (let b = 0; b < p.bars; b++) {
        html += `<div class="ck-bar" style="--n:${per}"><span class="ck-barno">${b + 1}</span>`;
        for (let i = 0; i < per; i++) {
          const k = b * per + i, v = p.steps[k] || 0, beat = Math.floor(i / p.sub), sub = i % p.sub;
          html += `<button class="ck-step l${v} ${sub === 0 ? 'beat' : ''} ${sub === 0 && i ? 'gap' : ''}" data-k="${k}" aria-label="Bar ${b + 1} beat ${beat + 1}${sub ? ' ' + cnt[sub] : ''}: ${CP().LEVELS[v].name}"><i></i><em>${sub === 0 ? beat + 1 : cnt[sub]}</em></button>`;
        }
        html += '</div>';
      }
      grid.innerHTML = html;
      $('#cpLen', host).textContent = `${p.beats} beats × ${p.sub} · ${p.steps.length} steps`;
      $('#cpTip', host).textContent = p.tip || 'Tap a step to change it. Tip: count out loud with the syllables under the steps.';
      const d = CP().difficulty(p);
      $('#cpStatus', host).innerHTML = `<b>${esc(p.name || 'My pattern')}</b> · difficulty ${'●'.repeat(1 + Math.round(d * 4))}${'○'.repeat(4 - Math.round(d * 4))}`;
    };
    const apply = (np) => {
      p = np; loop.setPattern(p); save(); drawGrid();
      $('#cpBeats', host).value = p.beats; $('#cpBars', host).value = p.bars;
      $$('#cpSub button', host).forEach((x) => x.classList.toggle('on', +x.dataset.v === p.sub));
      $('#cpSwing', host).value = p.swing || 0; $('#cpSwV', host).textContent = Math.round((p.swing || 0) * 100) + '%';
    };
    const edit = (fn) => { const np = Object.assign({}, p, { steps: p.steps.slice() }); delete np.preset; delete np.tip; fn(np); apply(np); };

    // painting: tap to set; drag to paint with the same level
    let painting = null;
    const setStep = (k, v) => { if (p.steps[k] === v) return; p.steps[k] = v; loop.setPattern(p); const el = grid.querySelector(`[data-k="${k}"]`); if (el) { el.className = el.className.replace(/\bl\d\b/, 'l' + v); UI.bump(el, 'pop-in'); } };
    grid.onpointerdown = (e) => {
      const el = e.target.closest('.ck-step'); if (!el) return;
      e.preventDefault();
      const k = +el.dataset.k, v = brush === 'cycle' ? CP().cycle(p.steps[k] || 0) : +brush;
      painting = v; setStep(k, v);
      if (!loop.running && v) previewClick(v);
    };
    grid.onpointerover = (e) => { if (painting == null) return; const el = e.target.closest('.ck-step'); if (el) setStep(+el.dataset.k, painting); };
    const endPaint = () => { if (painting != null) { painting = null; delete p.preset; delete p.tip; save(); drawGrid(); } };
    addEventListener('pointerup', endPaint);
    grid.onkeydown = (e) => { const el = e.target.closest('.ck-step'); if (el && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); setStep(+el.dataset.k, CP().cycle(p.steps[+el.dataset.k] || 0)); save(); } };
    const previewClick = (v) => { try { const ctx = PM.Audio.getCtx(); if (!loop.out) { loop.out = ctx.createGain(); loop.out.connect(ctx.destination); } loop.out.gain.value = loop.volume; loop.click(ctx.currentTime + 0.01, v); } catch (err) { /* audio blocked */ } };

    const syncBpm = () => { $('#cpBpm', host).textContent = loop.bpm; $('#cpSlider', host).value = loop.bpm; };
    const syncGo = () => { $('#cpGo', host).innerHTML = `${icon(loop.running ? 'stop' : 'play')} ${loop.running ? 'Stop' : 'Play loop'}`; };
    $('#cpGo', host).onclick = () => {
      if (loop.running) { stopLoop(true); } else { if (App.metronome.running) App.metronome.stop(); if (App.sequencer && App.sequencer.running) App.sequencer.stop(); loop.start(); startedAt = performance.now(); }
      syncGo();
    };
    const stopLoop = (record) => {
      loop.stop(); ramp = null; $('#cpRamp', host) && ($('#cpRamp', host).innerHTML = `${icon('bolt')} Start tempo ramp`);
      const secs = (performance.now() - startedAt) / 1000;
      if (record && startedAt && secs > 30) App.game.recordSession({ mode: 'click-pattern', instrument: App.instrument, seconds: secs, title: `Click pattern · ${p.name || 'custom'} @ ${loop.bpm}`, summary: { accuracy: null, stars: 0, score: Math.round(secs) } });
      startedAt = 0;
    };
    $('#cpMinus', host).onclick = () => { loop.setBpm(loop.bpm - 1); syncBpm(); };
    $('#cpPlus', host).onclick = () => { loop.setBpm(loop.bpm + 1); syncBpm(); };
    $('#cpSlider', host).oninput = (e) => { loop.setBpm(+e.target.value); syncBpm(); };
    $('#cpPreset', host).onchange = (e) => { if (!e.target.value) return; const np = CP().preset(e.target.value); apply(np); e.target.value = ''; UI.toast(np.name, { icon: '🥁' }); };
    $$('#cpBrush button', host).forEach((b) => (b.onclick = () => { brush = b.dataset.b === 'cycle' ? 'cycle' : +b.dataset.b; $$('#cpBrush button', host).forEach((x) => x.classList.toggle('on', x === b)); }));
    $('#cpBeats', host).onchange = (e) => apply(CP().resize(p, +e.target.value, p.sub, p.bars));
    $('#cpBars', host).onchange = (e) => {
      const n = CP().resize(p, p.beats, p.sub, +e.target.value), per = p.beats * p.sub;
      // new bars start as copies of bar 1 so the loop keeps sounding
      for (let b = p.bars; b < n.bars; b++) for (let i = 0; i < per; i++) n.steps[b * per + i] = p.steps[i];
      apply(n);
    };
    $$('#cpSub button', host).forEach((b) => (b.onclick = () => apply(CP().resize(p, p.beats, +b.dataset.v, p.bars), true)));
    $('#cpSwing', host).oninput = (e) => { p.swing = +e.target.value; $('#cpSwV', host).textContent = Math.round(p.swing * 100) + '%'; loop.setPattern(p); save(); };
    $('#cpVol', host).oninput = (e) => loop.setVolume(+e.target.value);
    $('#cpSound', host).onchange = (e) => { loop.sound = e.target.value; previewClick(3); };
    $('#cpMute', host).value = String(loop.muteEvery || 0);
    $('#cpMute', host).onchange = (e) => (loop.muteEvery = +e.target.value);
    const per = () => p.beats * p.sub;
    $('#cpClear', host).onclick = () => edit((n) => { n.steps.fill(0); });
    $('#cpBeatsOnly', host).onclick = () => edit((n) => { n.steps = n.steps.map((_, k) => (k % per() === 0 ? 3 : k % n.sub === 0 ? 2 : 0)); });
    $('#cpCopy', host).onclick = () => edit((n) => { for (let k = per(); k < n.steps.length; k++) n.steps[k] = n.steps[k % per()]; });
    $('#cpShiftL', host).onclick = () => edit((n) => { n.steps.push(n.steps.shift()); });
    $('#cpShiftR', host).onclick = () => edit((n) => { n.steps.unshift(n.steps.pop()); });
    $('#cpInvert', host).onclick = () => edit((n) => { n.steps = n.steps.map((v) => (v ? 0 : 2)); });
    $$('#cpRand button', host).forEach((b) => (b.onclick = () => { apply(CP().random(+b.dataset.r)); UI.bump(grid, 'pulse-once'); }));
    $('#cpRamp', host).onclick = () => {
      if (ramp) { ramp = null; $('#cpRamp', host).innerHTML = `${icon('bolt')} Start tempo ramp`; return; }
      const target = +$('#cpRTarget', host).value;
      if (target <= loop.bpm) { UI.toast('Set “Up to BPM” faster than the current tempo.', { icon: '⚠️' }); return; }
      ramp = { step: +$('#cpRStep', host).value || 4, every: +$('#cpREvery', host).value || 2, target, from: loop.bpm };
      $('#cpRamp', host).innerHTML = `${icon('stop')} Stop ramp`;
      if (!loop.running) $('#cpGo', host).click();
    };
    const offLoop = loop.on((e) => {
      if (e.type !== 'loop' || !ramp) return;
      if (e.n % ramp.every === 0 && loop.bpm < ramp.target) {
        loop.setBpm(Math.min(ramp.target, loop.bpm + ramp.step)); syncBpm();
        if (loop.bpm >= ramp.target) { UI.toast(`Ramp complete: ${ramp.from} → ${loop.bpm} BPM! 🚀`, { icon: '🏁', kind: 'xp' }); ramp = null; $('#cpRamp', host).innerHTML = `${icon('bolt')} Start tempo ramp`; }
      }
    });

    // saved patterns
    const drawMine = () => {
      const list = mine();
      $('#cpMine', host).innerHTML = list.length ? list.map((x, i) => `<div class="ck-saved"><button class="ck-load" data-i="${i}"><b>${esc(x.name)}</b><code>${esc(CP().encode(x))}</code><span class="small muted">${x.beats} beats · ${x.sub}/beat · ${x.bars} bar${x.bars > 1 ? 's' : ''}${x.bpm ? ' · ' + x.bpm + ' BPM' : ''}</span></button><button class="btn sm ghost icon" data-del="${i}" aria-label="Delete">${icon('trash')}</button></div>`).join('') : '<p class="small muted">Nothing saved yet. Build a pattern and press <b>Save</b> — it stays on this device and syncs with your progress.</p>';
      $$('.ck-load', host).forEach((b) => (b.onclick = () => { const x = mine()[+b.dataset.i]; apply(Object.assign({}, x, { steps: x.steps.slice() })); if (x.bpm) { loop.setBpm(x.bpm); syncBpm(); } }));
      $$('[data-del]', host).forEach((b) => (b.onclick = () => { mine().splice(+b.dataset.del, 1); App.saveSettings(); drawMine(); }));
    };
    $('#cpSave', host).onclick = () => {
      const name = (prompt('Name this pattern', p.preset ? p.name + ' (mine)' : p.name || 'My pattern') || '').trim();
      if (!name) return;
      const list = mine(), entry = { name, beats: p.beats, sub: p.sub, bars: p.bars, swing: p.swing || 0, steps: p.steps.slice(), bpm: loop.bpm };
      const at = list.findIndex((x) => x.name === name);
      if (at >= 0) list[at] = entry; else list.unshift(entry);
      if (list.length > 40) list.length = 40;
      p.name = name; save(); App.saveSettings(); drawMine(); drawGrid();
      UI.toast('Pattern saved', { icon: '💾' });
    };
    const code = () => `cadenza-click:${p.beats}/${p.sub}/${loop.bpm}/${Math.round((p.swing || 0) * 100)}:${CP().encode(p)}`;
    $('#cpShare', host).onclick = async () => { try { await navigator.clipboard.writeText(code()); UI.toast('Pattern code copied — paste it to a friend or student', { icon: '📋' }); } catch (e) { prompt('Copy this code', code()); } };
    $('#cpImport', host).onclick = () => {
      const s = (prompt('Paste a Cadenza click code') || '').trim();
      const m = /^cadenza-click:(\d+)\/(\d+)\/(\d+)\/(\d+):([.sxX|]+)$/.exec(s);
      if (!m) { if (s) UI.toast('That code doesn’t look right.', { icon: '⚠️' }); return; }
      const np = CP().parse(m[5], { sub: +m[2] });
      if (np.beats !== +m[1] || !Number.isInteger(np.beats)) { UI.toast('That code doesn’t look right.', { icon: '⚠️' }); return; }
      np.swing = +m[4] / 100; np.name = 'Imported pattern';
      apply(np); loop.setBpm(+m[3]); syncBpm();
    };

    // playhead
    let raf = 0, last = -1;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      const cur = loop.current(), k = cur ? cur.k : -1;
      if (k === last) return;
      const prev = grid.querySelector('.ck-step.now'); if (prev) prev.classList.remove('now');
      last = k;
      if (k < 0) return;
      const el = grid.querySelector(`[data-k="${k}"]`); if (el) { el.classList.add('now'); el.classList.toggle('muted', !!cur.muted); }
      $('#cpStatus', host).classList.toggle('silent', !!cur.muted);
    };
    raf = requestAnimationFrame(tick);
    const onKey = (e) => {
      if (e.target.matches('input, select, textarea')) return;
      if (e.code === 'Space' && !e.target.closest('.ck-step')) { e.preventDefault(); $('#cpGo', host).click(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); loop.setBpm(loop.bpm + 1); syncBpm(); }
      else if (e.key === 'ArrowDown') { e.preventDefault(); loop.setBpm(loop.bpm - 1); syncBpm(); }
    };
    addEventListener('keydown', onKey);
    drawGrid(); drawMine();
    return () => { cancelAnimationFrame(raf); offLoop(); removeEventListener('keydown', onKey); removeEventListener('pointerup', endPaint); stopLoop(true); };
  }

  PM.ClickPatternView = { render, COUNT };
})(typeof self !== 'undefined' ? self : globalThis);
