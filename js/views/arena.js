/* Overture — Challenge Arena UI: level tabs, challenge cards with best stars, and a play
 * engine for every question type (choices, ordering puzzles, keyboard taps, fretboard taps
 * and tap-back rhythms) with three modes: rounds, beat-the-clock and three lives.
 * Questions come fresh from PM.Challenges every time. */
(function (root) {
  'use strict';
  const PM = root.PM;
  const { UI, DSP } = PM;
  const { esc, $, $$ } = UI;
  const X = () => PM.Challenges;
  const AV = () => PM.AcademyView;

  // ------------------------------------------------------------------ sound
  const earVoice = () => { const v = PM.Sound.voiceFor(PM.App.instrument); return v === 'drums' ? 'piano' : v; };
  function tone(ctx, out, midi, t, dur, vol, type) { PM.Sound.note(type === 'square' ? 'drums' : earVoice(), type === 'square' ? 37 : midi, t, dur, { vel: Math.min(1, 0.35 + vol * 1.6), dest: out }); }
  function click(ctx, out, t, accent) { PM.Sound.drum(accent ? 'woodhi' : 'wood', t, accent ? 0.95 : 0.7, out); }
  /** Play a challenge sound spec; returns its length in seconds. */
  function play(spec) {
    if (!spec) return 0;
    const ctx = PM.Audio.getCtx(), out = ctx.createGain(); out.gain.value = 1; out.connect(PM.Sound.master());
    let t = ctx.currentTime + 0.08;
    const t0 = t;
    if (spec.notes) spec.notes.forEach((m, i) => { tone(ctx, out, m, t, 0.5, spec.vols ? spec.vols[i] : 0.35); t += 0.6; });
    else if (spec.chord) { spec.chord.forEach((m, k) => tone(ctx, out, m, t + k * 0.012, 1.4, 0.3)); t += 1.5; }
    else if (spec.seq) spec.seq.forEach((ch) => { ch.forEach((m, k) => tone(ctx, out, m, t + k * 0.01, 0.9, 0.27)); t += 1.0; });
    else if (spec.clicks) {
      const run = (c) => { const iv = 60 / c.bpm; for (let i = 0; i < c.n; i++) { const pos = c.bar ? i % c.bar : i; const acc = c.pattern ? c.pattern.includes(pos) : c.accents ? i % c.accents === 0 : false; click(ctx, out, t, acc); t += iv; } };
      run(spec.clicks);
      if (spec.clicks.then) { t += 0.5; run(spec.clicks.then); }
    } else if (spec.rhythm) { const beat = 60 / spec.bpm; spec.rhythm.forEach((d) => { tone(ctx, out, 76, t, 0.12, 0.35, 'square'); t += d * beat; }); }
    return t - t0;
  }

  // ------------------------------------------------------------------ list
  function mount(box, App) {
    const st = App.game.state;
    const best = () => (st.arena = st.arena || {});
    let level = App.arenaLevel || 1;
    const draw = () => {
      const cs = X().CHALLENGES.filter((c) => c.level === level);
      const done = (lv) => X().CHALLENGES.filter((c) => c.level === lv && (best()[c.id] || {}).stars).length;
      box.innerHTML = `<div class="ar-head"><div><h2 style="margin:0">🏟️ Challenge Arena</h2><p class="small muted" style="margin:4px 0 0">${X().CHALLENGES.length} challenges · new questions every time you play</p></div>
        <div class="seg" id="arLvl">${[1, 2, 3].map((lv) => `<button data-l="${lv}" class="${lv === level ? 'on' : ''}">${['', '🌱 Easy', '🔥 Medium', '🏆 Hard'][lv]} <span class="small">${done(lv)}/${X().CHALLENGES.filter((c) => c.level === lv).length}</span></button>`).join('')}</div></div>
        <div class="ar-grid">${cs.map((c, i) => { const b = best()[c.id] || {}; return `<button class="ar-card pop-in" data-c="${c.id}" style="animation-delay:${Math.min(i, 12) * 25}ms"><span class="ar-em">${c.emoji}</span><b>${esc(c.name)}</b><span class="small">${esc(c.blurb)}</span><span class="ar-meta"><span class="ar-mode">${c.mode === 'timed' ? '⏱ ' + c.seconds + 's' : c.mode === 'lives' ? '❤️ 3 lives' : '🎯 ' + c.rounds + ' rounds'}</span><span class="ar-stars">${'★'.repeat(b.stars || 0)}${'☆'.repeat(3 - (b.stars || 0))}</span></span></button>`; }).join('')}</div>`;
      $$('#arLvl [data-l]', box).forEach((b) => (b.onclick = () => { level = App.arenaLevel = +b.dataset.l; draw(); }));
      $$('[data-c]', box).forEach((b) => (b.onclick = () => start(X().get(b.dataset.c), App, draw)));
    };
    draw();
  }

  // ------------------------------------------------------------------ play
  function start(c, App, onDone) {
    const r = X().rng((Date.now() ^ (Math.random() * 1e9)) >>> 0);
    const recent = [];
    const S = { i: 0, right: 0, asked: 0, lives: 3, score: 0, streak: 0, best: 0, over: false, t0: performance.now(), left: c.seconds || 0 };
    const total = c.mode === 'rounds' ? c.rounds : null;
    let timer = 0, cleanup = null;
    const m = UI.modal(`<div class="modal-body stage ar-play"><div class="ar-hud"><span class="chip">${c.emoji} ${esc(c.name)}</span><span class="chip" id="arProg"></span><span class="chip">Score <b id="arScore">0</b></span><span class="chip" id="arStreak">🔥 0</span><button class="btn sm glass" data-close>✕</button></div>
      <div id="arQ" class="ar-q"></div><div class="ar-fb" id="arFb" aria-live="polite"></div></div>`, { onClose: () => { S.over = true; clearInterval(timer); if (cleanup) cleanup(); onDone(); } });
    const el = m.el;
    const hud = () => {
      $('#arProg', el).innerHTML = c.mode === 'timed' ? `⏱ <b>${Math.max(0, Math.ceil(S.left))}</b>s` : c.mode === 'lives' ? '❤️'.repeat(S.lives) + '🖤'.repeat(3 - S.lives) + ` · ${S.right}` : `Q <b>${Math.min(S.i + 1, total)}</b>/${total}`;
      $('#arScore', el).textContent = S.score; $('#arStreak', el).textContent = '🔥 ' + S.streak;
    };
    if (c.mode === 'timed') timer = setInterval(() => { S.left -= 0.25; hud(); if (S.left <= 0) finish(); }, 250);
    const fb = (txt, cls) => { const f = $('#arFb', el); f.className = 'ar-fb ' + (cls || ''); f.innerHTML = txt; if (cls) UI.bump(f, 'pop-in'); };

    function answered(ok, reveal, partial) {
      if (S.over) return;
      S.asked++;
      if (ok) { S.right++; S.streak++; S.best = Math.max(S.best, S.streak); S.score += Math.round((10 + Math.min(20, S.streak * 2)) * (partial || 1)); fb(['Correct! ✨', 'Yes! 🎉', 'Nailed it! 🎯', 'Brilliant! 🌟'][S.asked % 4], 'ok'); if (c.mode === 'timed') S.left += 1; }
      else { S.streak = 0; if (c.mode === 'lives') S.lives--; fb(`Not quite${reveal ? ' — answer: <b>' + esc(reveal) + '</b>' : ''}`, 'no'); }
      hud();
      const wait = ok ? 650 : 1500;
      setTimeout(() => { if (S.over) return; S.i++; if ((total && S.i >= total) || (c.mode === 'lives' && S.lives <= 0)) finish(); else next(); }, wait);
    }

    function next() {
      if (cleanup) { cleanup(); cleanup = null; }
      const q = X().question(c, r, recent);
      fb('');
      const box = $('#arQ', el);
      const playBtn = q.play ? `<button class="btn glass sm" id="arPlay">🔊 ${q.ear ? 'Play again' : 'Hear it'}</button>` : '';
      const show = q.show ? `${q.show.keys ? AV().keysSvg(q.show.keys) : ''}${q.show.staff ? `<div class="staff-box">${PM.LearnView.staffSvg(q.show.staff, { clef: q.show.clef })}</div>` : ''}${q.show.fret ? AV().fretSvg(q.show.fret) : ''}${q.show.diagram ? UI.chordDiagram(q.show.diagram) : ''}${q.show.valves ? AV().valveIcons(q.show.valves) : ''}${q.show.drumgrid ? PM.DrumAlong.gridHtml(q.show.drumgrid) : ''}` : '';
      box.innerHTML = `<p class="ar-prompt pop-in">${esc(q.prompt)}</p>${q.big ? `<div class="ar-big">${esc(q.big)}</div>` : ''}${show ? `<div class="ar-show">${show}</div>` : ''}${playBtn}<div id="arA"></div>`;
      const pb = $('#arPlay', box); if (pb) pb.onclick = () => play(q.play);
      if (q.ear && q.play && q.type !== 'tap') setTimeout(() => !S.over && play(q.play), 200);
      const A = $('#arA', box);
      if (q.type === 'mc') {
        A.innerHTML = `<div class="ar-opts ${q.options.length === 2 ? 'two' : ''}">${q.options.map((o, i) => `<button class="ar-opt" data-o="${i}">${esc(o)}</button>`).join('')}</div>`;
        $$('.ar-opt', A).forEach((b) => (b.onclick = () => { const ok = q.options[+b.dataset.o] === q.answer; $$('.ar-opt', A).forEach((x) => { x.disabled = true; if (q.options[+x.dataset.o] === q.answer) x.classList.add('ok'); }); if (!ok) b.classList.add('no'); answered(ok, q.answer); }));
      } else if (q.type === 'order') {
        const picked = [];
        const drawO = () => {
          A.innerHTML = `<div class="ar-slots">${q.answer.map((_, i) => `<span class="ar-slot ${picked[i] != null ? 'full' : ''}">${picked[i] != null ? esc(q.items[picked[i]]) : i + 1}</span>`).join('')}</div>
            <div class="ar-opts">${q.items.map((it, i) => `<button class="ar-opt" data-i="${i}" ${picked.includes(i) ? 'disabled' : ''}>${esc(it)}</button>`).join('')}</div><button class="btn sm ghost" id="arUndo" ${picked.length ? '' : 'disabled'}>↶ Undo</button>`;
          $$('.ar-opt', A).forEach((b) => (b.onclick = () => { picked.push(+b.dataset.i); if (picked.length === q.answer.length) { const got = picked.map((k) => q.items[k]); drawO(); $$('button', A).forEach((x) => (x.disabled = true)); answered(got.every((x, k) => x === q.answer[k]), q.answer.join(' → ')); } else drawO(); }));
          $('#arUndo', A).onclick = () => { picked.pop(); drawO(); };
        };
        drawO();
      } else if (q.type === 'keys') {
        const tapped = [];
        A.innerHTML = `<div class="ar-keys">${AV().playKeys([], q.lo, q.hi)}</div><div class="ar-taps small" id="arTaps">${q.mode === 'seq' ? `Tap ${q.answer.length} notes in order` : 'Tap the keys, then Check'}</div>${q.mode === 'set' ? '<div class="row" style="justify-content:center;gap:8px"><button class="btn sm ghost" id="arClr">Clear</button><button class="btn sm primary" id="arChk">Check</button></div>' : ''}`;
        const K = $('.ar-keys', A);
        const nm = (x) => DSP.midiName(x).replace(/-?\d+$/, '');
        const sync = () => { $$('rect[data-m]', K).forEach((rct) => rct.classList.toggle('hit', q.mode === 'set' && tapped.includes(+rct.dataset.m))); $('#arTaps', A).textContent = tapped.length ? tapped.map(nm).join(' · ') : q.mode === 'seq' ? `Tap ${q.answer.length} notes in order` : 'Tap the keys, then Check'; };
        K.addEventListener('click', (e) => {
          const rct = e.target.closest('[data-m]'); if (!rct || S.over) return;
          const mm = +rct.dataset.m;
          play({ notes: [mm] });
          if (q.mode === 'set') { const k = tapped.indexOf(mm); if (k >= 0) tapped.splice(k, 1); else tapped.push(mm); sync(); return; }
          tapped.push(mm); rct.classList.add('hit'); setTimeout(() => rct.classList.remove('hit'), 220); sync();
          if (tapped.length === q.answer.length) answered(X().checkKeys(q, tapped), q.answer.map(nm).join(' '));
        });
        if (q.mode === 'set') { $('#arClr', A).onclick = () => { tapped.length = 0; sync(); }; $('#arChk', A).onclick = () => { $('#arChk', A).disabled = true; answered(X().checkKeys(q, tapped), q.answer.map(nm).join(' ')); }; }
      } else if (q.type === 'fret') {
        const I = PM.Instruments.get(q.inst);
        A.innerHTML = '<div class="fret-wrap ar-fret"></div>';
        const fbd = new UI.Fretboard($('.ar-fret', A), { strings: I.strings, names: I.stringNames, frets: 12 });
        fbd.dotLayer.innerHTML = q.string != null ? `<line x1="${fbd.fx(0)}" y1="${fbd.yOf(q.string)}" x2="${fbd.geo.W - 10}" y2="${fbd.yOf(q.string)}" stroke="#f0abfc" stroke-width="4" opacity=".6"/>` : '';
        const svg = $('.ar-fret svg', A); svg.style.cursor = 'pointer';
        let done = false;
        svg.addEventListener('click', (e) => {
          if (done || S.over) return;
          const pt = svg.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY;
          const loc = pt.matrixTransform(svg.getScreenCTM().inverse());
          let s = 0, bd = 1e9; for (let i = 0; i < I.strings.length; i++) { const d = Math.abs(fbd.yOf(i) - loc.y); if (d < bd) { bd = d; s = i; } }
          let f = 0; if (loc.x > fbd.fx(0)) { f = 12; for (let i = 1; i <= 12; i++) if (loc.x < fbd.fx(i)) { f = i; break; } }
          if (q.string != null && s !== q.string) { fb('Use the highlighted string 👆'); return; }
          done = true;
          play({ notes: [I.strings[s] + f] });
          const ok = q.answer.some((a) => a.string === s && a.fret === f);
          const a0 = q.answer[0];
          fbd.dotLayer.innerHTML += `<circle cx="${fbd.xOf(f)}" cy="${fbd.yOf(s)}" r="12" fill="${ok ? '#10b981' : '#f43f5e'}"/>` + (ok ? '' : `<circle cx="${fbd.xOf(a0.fret)}" cy="${fbd.yOf(a0.string)}" r="12" fill="none" stroke="#10b981" stroke-width="3"/>`);
          answered(ok, 'fret ' + a0.fret);
        });
      } else if (q.type === 'tap') {
        const taps = [];
        let armed = !q.echo, endT = 0;
        A.innerHTML = `<div class="ar-rhythm">${q.rhythm.map((d) => `<i style="flex:${d}"></i>`).join('')}</div>
          <button class="ar-pad" id="arPad" ${q.echo ? 'disabled' : ''}>${q.echo ? '🔊 Listen first…' : 'TAP'}</button>
          <div class="row" style="justify-content:center;gap:8px;margin-top:8px"><button class="btn sm glass" id="arListen">🔊 ${q.echo ? 'Play the rhythm' : 'Start the click'}</button></div>`;
        const pad = $('#arPad', A);
        const finishTap = () => { if (S.over || !taps.length) return; pad.disabled = true; const sc = X().scoreTaps(taps, q.rhythm, q.bpm); answered(sc >= 0.6, sc < 0.6 ? Math.round(sc * 100) + '% in time' : '', 0.5 + sc / 2); };
        let idle = 0;
        const hit = () => { if (!armed || S.over) return; const now = performance.now() / 1000; taps.push(now); UI.bump(pad, 'pulse-once'); clearTimeout(idle); if (taps.length >= q.rhythm.length) { setTimeout(finishTap, 150); return; } idle = setTimeout(finishTap, 2600); };
        pad.addEventListener('pointerdown', (e) => { e.preventDefault(); hit(); });
        const onKey = (e) => { if (e.code === 'Space' || e.key === 'Enter') { e.preventDefault(); hit(); } };
        addEventListener('keydown', onKey);
        cleanup = () => { removeEventListener('keydown', onKey); clearTimeout(idle); clearTimeout(endT); };
        $('#arListen', A).onclick = () => {
          if (q.echo) { const len = play({ rhythm: q.rhythm, bpm: q.bpm }); pad.disabled = true; pad.textContent = '👂 Listen…'; endT = setTimeout(() => { if (S.over) return; armed = true; pad.disabled = false; pad.textContent = 'TAP IT BACK'; }, len * 1000 + 150); }
          else { play({ clicks: { n: 4 + q.rhythm.length, bpm: q.bpm, accents: 4 } }); pad.textContent = 'Count-in 4… then TAP'; }
        };
        if (q.echo) setTimeout(() => !S.over && $('#arListen', A) && $('#arListen', A).click(), 300);
      }
    }

    function finish() {
      if (S.over) return;
      S.over = true; clearInterval(timer); if (cleanup) cleanup();
      const acc = S.asked ? S.right / S.asked : 0;
      const stars = c.mode === 'timed' ? (S.right >= 14 ? 3 : S.right >= 9 ? 2 : S.right >= 4 ? 1 : 0) : c.mode === 'lives' ? (S.right >= 12 ? 3 : S.right >= 7 ? 2 : S.right >= 3 ? 1 : 0) : X().stars(acc);
      const B = (App.game.state.arena = App.game.state.arena || {});
      const prev = B[c.id] || {};
      const isBest = S.score > (prev.score || 0);
      B[c.id] = { stars: Math.max(prev.stars || 0, stars), score: Math.max(prev.score || 0, S.score), plays: (prev.plays || 0) + 1 };
      App.game.save();
      App.game.recordSession({ mode: 'challenge', challenge: 'arena-' + c.id, score: S.score, instrument: App.instrument, seconds: (performance.now() - S.t0) / 1000, title: `Arena · ${c.name} (${X().LEVEL_NAMES[c.level]})`, summary: { accuracy: acc, stars, score: S.score, maxCombo: S.best } });
      if (stars === 3) UI.confetti();
      $('#arQ', el).innerHTML = `<div class="ar-result pop-in"><div class="big-stars">${'★'.repeat(stars)}${'☆'.repeat(3 - stars)}</div>
        <h2>${S.right} correct${c.mode === 'rounds' ? ' of ' + S.asked : ''}</h2><p>Score <b>${S.score}</b>${isBest ? ' — new best! 🏅' : ` · best ${prev.score || 0}`} · best streak ${S.best}🔥</p>
        <p class="small">${stars === 3 ? 'Superstar! Try a harder level next.' : stars ? 'Great work — play again for brand-new questions.' : 'Keep going — every round has new questions.'}</p>
        <div class="row" style="justify-content:center;gap:10px"><button class="btn white" id="arAgain">↻ Play again</button><button class="btn glass" data-close>Done</button></div></div>`;
      fb('');
      $('#arAgain', el).onclick = () => { m.close(); setTimeout(() => start(c, App, onDone), 200); };
    }

    hud();
    next();
  }

  PM.Arena = { mount, play, start };
})(typeof self !== 'undefined' ? self : globalThis);
