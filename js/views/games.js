/* Cadenza — gamified challenges: Chord Quest, Rhythm Hero, Note Hunter, Ear Trainer. */
(function (root) {
  'use strict';
  const PM = root.PM;
  const { UI, Theory, DSP } = PM;
  const { icon, esc, $, $$ } = UI;

  const GAMES = [
    { id: 'chord-quest', name: 'Chord Quest', art: '🎸', desc: 'A chord appears — play it as fast as you can. Speed + accuracy = points.', needsInput: true },
    { id: 'rhythm-hero', name: 'Rhythm Hero', art: '🥁', desc: 'Gems fly to the line on every beat. Hit them in time for perfect streaks.', needsInput: true },
    { id: 'note-hunter', name: 'Note Hunter', art: '🎯', desc: 'Find the note on your instrument. Learn the fretboard / keyboard by heart.', needsInput: true },
    { id: 'long-tones', name: 'Long Tones', art: '🌬️', desc: 'Hold the note dead-steady for 4 seconds. Builds tone, breath control and intonation.', needsInput: true },
    { id: 'ear-trainer', name: 'Ear Trainer', art: '👂', desc: 'Listen to a chord and name its quality. No instrument needed.', needsInput: false },
  ];

  const LEVELS = {
    guitar: { easy: ['C', 'G', 'D', 'Em', 'Am', 'E', 'A', 'Dm'], medium: ['C', 'G', 'D', 'Em', 'Am', 'E', 'A', 'Dm', 'F', 'Bm', 'G7', 'D7', 'A7', 'E7', 'Cmaj7'], hard: ['F', 'Bm', 'Bb', 'F#m', 'C#m', 'Ab', 'Eb', 'Gm', 'Cm', 'Fmaj7', 'Am7', 'Bm7', 'Dsus4', 'Asus2', 'B7'] },
    piano: { easy: ['C', 'F', 'G', 'Am', 'Dm', 'Em'], medium: ['C', 'F', 'G', 'Am', 'Dm', 'Em', 'D', 'A', 'E', 'Bb', 'G7', 'Cmaj7'], hard: ['Db', 'Eb', 'Ab', 'F#', 'Bbm', 'C#m', 'F#m', 'Gm', 'Cm', 'Ebmaj7', 'Abmaj7', 'Bdim', 'Caug', 'Fm7'] },
  };

  const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; };

  function synthChord(midis, when, dur) {
    const ctx = PM.Audio.getCtx();
    const t0 = when || ctx.currentTime + 0.05;
    const out = ctx.createGain(); out.gain.value = 0.22; out.connect(ctx.destination);
    midis.forEach((m, i) => {
      const f = DSP.midiToFreq(m);
      [1, 2, 3].forEach((h) => {
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.type = h === 1 ? 'triangle' : 'sine'; o.frequency.value = f * h;
        const amp = (h === 1 ? 0.5 : 0.18 / h) / Math.sqrt(midis.length);
        g.gain.setValueAtTime(0, t0 + i * 0.01); g.gain.linearRampToValueAtTime(amp, t0 + i * 0.01 + 0.01);
        g.gain.exponentialRampToValueAtTime(0.0005, t0 + (dur || 1.6));
        o.connect(g).connect(out); o.start(t0 + i * 0.01); o.stop(t0 + (dur || 1.6) + 0.05);
      });
    });
  }

  PM.App.register({
    id: 'games', title: 'Challenges', icon: 'games', hidden: true, // opened from Learn
    render(host, App) {
      const hs = App.game.state.highScores;
      host.innerHTML = `
        <div class="page-head"><div><div class="eyebrow">Challenges</div><h1>Level up with games</h1><p>Short, focused drills that turn practice into play. Every round earns XP, and high scores are saved.</p></div>
        <div class="row"><label class="field">Difficulty<select id="diff"><option value="easy">Easy</option><option value="medium" selected>Medium</option><option value="hard">Hard</option></select></label></div></div>
        <div class="grid" id="cards" style="grid-template-columns:repeat(auto-fill,minmax(230px,1fr))">${GAMES.filter((g) => (g.id !== 'chord-quest' || PM.Instruments.get(App.instrument).chordal) && (g.id !== 'long-tones' || App.instrument !== 'piano')).map((g) => `
          <section class="card game-card">
            <div class="game-art"><span>${g.art}</span></div>
            <h3>${g.name}</h3><p class="small" style="flex:1">${g.desc}</p>
            <div class="row"><span class="muted small">Best: <b>${hs[g.id] || 0}</b></span><div class="spacer"></div><button class="btn primary sm" data-g="${g.id}">${icon('play')} Play</button></div>
          </section>`).join('')}</div>
        <section class="card stage game-stage hidden" id="stage" style="margin-top:18px"></section>`;
      let current = null;
      const stage = $('#stage', host);
      $$('[data-g]', host).forEach((b) => (b.onclick = () => {
        if (current) current.stop(false);
        stage.classList.remove('hidden');
        stage.scrollIntoView({ behavior: 'smooth', block: 'start' });
        const diff = $('#diff', host).value;
        current = startGame(b.dataset.g, stage, App, diff, () => { current = null; });
      }));
      if (App.pendingAssignment && App.pendingAssignment.mode === 'challenge') {
        const btn = $(`[data-g="${App.pendingAssignment.challenge}"]`, host);
        if (btn) setTimeout(() => btn.click(), 50);
      }
      return () => current && current.stop(false);
    },
  });

  function startGame(id, stage, App, diff, onEnd) {
    const inst = App.instrument;
    const game = GAMES.find((g) => g.id === id);
    let score = 0, combo = 0, maxCombo = 0, round = 0, correct = 0, unsub = null, timers = [], raf = 0, stopped = false;
    const ROUNDS = id === 'rhythm-hero' ? 32 : 10;
    const startedAt = performance.now();

    stage.innerHTML = `
      <div class="game-hud"><span class="chip">${game.art} ${game.name}</span><span class="chip">Round <b id="gRound">0</b>/${ROUNDS}</span><span class="chip">Score <b id="gScore">0</b></span><span class="chip">Combo <b id="gCombo">0×</b></span></div>
      <div id="gBody" style="display:flex;flex-direction:column;align-items:center;gap:16px;width:100%"></div>
      <div class="feedback-pop" id="gFb"></div>
      <div class="row"><button class="btn glass" id="gQuit">${icon('stop')} End</button></div>`;
    const body = $('#gBody', stage), fb = $('#gFb', stage);
    const hud = () => { $('#gRound', stage).textContent = round; $('#gScore', stage).textContent = score; $('#gCombo', stage).textContent = combo + '×'; };
    const feedback = (text, cls) => { fb.textContent = text; fb.className = 'feedback-pop ' + cls; };
    const add = (pts, ok) => {
      if (ok) { combo++; maxCombo = Math.max(maxCombo, combo); correct++; score += Math.round(pts * (1 + Math.min(2, Math.floor(combo / 5) * 0.25))); }
      else combo = 0;
      hud();
    };

    const engine = App.settings.source === 'midi' ? App.midiIn : App.live;
    async function openInput() {
      if (!game.needsInput) return true;
      try {
        if (engine === App.live) { App.live.latency = App.settings.latency; await App.live.start(App.settings.deviceId); }
        else await App.midiIn.start();
        return true;
      } catch (e) {
        body.innerHTML = `<p>Couldn't open your ${engine === App.live ? 'microphone' : 'MIDI device'}: ${esc(e.message || e)}</p>`;
        return false;
      }
    }

    function stop(showSummary) {
      if (stopped) return;
      stopped = true;
      timers.forEach(clearTimeout); timers = [];
      cancelAnimationFrame(raf);
      if (unsub) unsub();
      if (game.needsInput) { App.live.stop(); App.midiIn.stop(); }
      if (id === 'rhythm-hero') App.metronome.stop();
      const acc = round ? correct / round : 0;
      const summary = { accuracy: acc, score, maxCombo, stars: acc >= 0.9 ? 3 : acc >= 0.7 ? 2 : acc >= 0.45 ? 1 : 0, chordsNailed: id === 'chord-quest' ? correct : 0, insights: [`${correct}/${round} correct`, `Best combo ${maxCombo}×`], focus: acc < 0.6 ? 'Try the Easy difficulty and slow, deliberate playing.' : 'Bump up the difficulty for more XP!' };
      if (id === 'rhythm-hero') { summary.timingAccuracy = acc; summary.onsets = round; App.game.progressDaily('rhythmHits', correct); }
      if (id === 'note-hunter' || id === 'long-tones') App.game.progressDaily('notes', correct);
      if (id === 'chord-quest') App.game.progressDaily('chords', correct);
      const asg = App.pendingAssignment && App.pendingAssignment.challenge === id ? App.pendingAssignment : null;
      if (asg) App.pendingAssignment = null;
      const meta = { mode: 'challenge', challenge: id, assignmentId: asg ? asg.id : null, score, instrument: inst, seconds: (performance.now() - startedAt) / 1000, title: game.name + ' (' + diff + ')' };
      if (showSummary && round > 0) PM.Shared.sessionSummary(summary, meta);
      stage.classList.add('hidden');
      onEnd();
    }
    $('#gQuit', stage).onclick = () => stop(true);
    const later = (fn, ms) => timers.push(setTimeout(() => !stopped && fn(), ms));

    // ---------------- Chord Quest ----------------
    async function chordQuest() {
      if (!(await openInput())) return;
      const pool = shuffle(LEVELS[PM.Instruments.get(inst).family === 'keys' ? 'piano' : 'guitar'][diff]);
      const limit = diff === 'easy' ? 15 : diff === 'medium' ? 10 : 8;
      let target = null, since = 0, holdStart = 0, done = false;
      const next = () => {
        if (round >= ROUNDS) return stop(true);
        round++; hud();
        target = Theory.parseChordName(pool[(round - 1) % pool.length]);
        target.name = pool[(round - 1) % pool.length];
        target.pcs = Theory.chordPcs(target.root, target.type);
        since = performance.now(); holdStart = 0; done = false;
        body.innerHTML = `<div class="game-target pop">${esc(target.name)}</div>
          ${PM.Instruments.get(inst).strings ? `<div style="background:#fff;border-radius:18px;padding:10px 14px">${UI.chordDiagram(target.name)}</div>` : `<div class="chips">${target.pcs.map((p) => `<span class="chip">${Theory.spell(p)}</span>`).join('')}</div>`}
          <div class="timer-bar"><i id="tb" style="width:100%"></i></div><div class="muted small" id="heard">listening…</div>`;
        feedback('', '');
      };
      unsub = engine.on((f) => {
        if (!target || done) return;
        const el = performance.now() - since;
        const tb = $('#tb', body); if (tb) tb.style.width = Math.max(0, 100 - (el / (limit * 1000)) * 100) + '%';
        if (el > limit * 1000) { done = true; add(0, false); feedback(`⏰ Time! It was ${target.name}`, 'miss'); later(next, 1300); return; }
        if (!f.active || !f.chroma) { holdStart = 0; return; }
        const live = f.chord;
        $('#heard', body).textContent = live ? 'hearing ' + live.name : 'hearing ' + PM.CoachUtil.topPcs(f.chroma).map((p) => Theory.spell(p)).join(' ');
        const cmp = PM.CoachUtil.compareChord(target, live, f.chroma);
        if (cmp.result === 'hit') {
          if (!holdStart) holdStart = performance.now();
          if (performance.now() - holdStart > 350) {
            done = true;
            const secs = el / 1000;
            add(Math.round(100 + Math.max(0, limit - secs) * 20), true);
            feedback(secs < 3 ? `⚡ Lightning! ${secs.toFixed(1)}s` : `✅ Nice! ${secs.toFixed(1)}s`, 'perfect');
            $('.game-target', body).classList.add('good');
            later(next, 900);
          }
        } else holdStart = 0;
      });
      next();
    }

    // ---------------- Rhythm Hero ----------------
    async function rhythmHero() {
      if (!(await openInput())) return;
      const m = App.metronome;
      m.stop();
      m.setBpm(diff === 'easy' ? 72 : diff === 'medium' ? 96 : 124);
      m.beatsPerBar = 4; m.beatUnit = 4; m.subdivision = 1; m.mutedBars = 0; m.trainer = null;
      body.innerHTML = `<div class="game-target" style="font-size:54px">${Math.round(m.bpm)} BPM</div>
        <div class="hit-lane" id="lane"><div class="target-line"></div></div>
        <div class="muted small">Play one note or strum exactly on each beat. 1 bar count-in…</div>`;
      const lane = $('#lane', body);
      const start = PM.Audio.getCtx().currentTime + 0.1;
      m.start(start);
      const beat = 60 / m.bpm;
      const first = start + 4 * beat; // after count-in bar
      const gems = [];
      let ending = false;
      for (let i = 0; i < ROUNDS; i++) {
        const d = document.createElement('div');
        d.className = 'note-gem';
        lane.appendChild(d);
        gems.push({ t: first + i * beat, el: d, judged: false });
      }
      const judge = (g, res, ms) => {
        g.judged = true;
        round++;
        if (res === 'miss') { g.el.classList.add('miss'); add(0, false); feedback('Miss', 'miss'); }
        else { g.el.classList.add('hit'); add(res === 'perfect' ? 30 : 15, true); feedback(res === 'perfect' ? `Perfect! ${ms > 0 ? '+' : ''}${Math.round(ms)}ms` : `Good ${ms > 0 ? '+' : ''}${Math.round(ms)}ms`, res); }
      };
      unsub = engine.on((f) => {
        if (!f.onset) return;
        let best = null;
        for (const g of gems) if (!g.judged && (!best || Math.abs(g.t - f.time) < Math.abs(best.t - f.time))) best = g;
        if (!best) return;
        const ms = (f.time - best.t) * 1000;
        if (Math.abs(ms) <= 45) judge(best, 'perfect', ms);
        else if (Math.abs(ms) <= 110) judge(best, 'good', ms);
      });
      const W = () => lane.clientWidth;
      const tick = () => {
        raf = requestAnimationFrame(tick);
        const now = PM.Audio.getCtx().currentTime;
        for (const g of gems) {
          const x = W() * 0.2 + (g.t - now) * (W() * 0.32 / beat);
          g.el.style.left = x + 'px';
          g.el.style.opacity = x < -30 || x > W() + 30 ? 0 : 1;
          if (!g.judged && now - g.t > 0.13) judge(g, 'miss', 0);
        }
        if (round >= ROUNDS && !ending) { ending = true; later(() => stop(true), 600); }
      };
      raf = requestAnimationFrame(tick);
    }

    // ---------------- Note Hunter ----------------
    async function noteHunter() {
      if (!(await openInput())) return;
      const I = PM.Instruments.get(inst), tr = I.transpose || 0;
      const RANGES = {
        piano: { easy: [60, 72], medium: [48, 76], hard: [36, 88] },
        guitar: { easy: [40, 52], medium: [40, 64], hard: [40, 76] },
        electric: { easy: [40, 52], medium: [40, 67], hard: [40, 79] },
        bass: { easy: [28, 40], medium: [28, 48], hard: [28, 55] },
        trumpet: { easy: [58, 70], medium: [55, 74], hard: [52, 79] },
      };
      const VR = PM.Learn.RANGE.voice;
      RANGES.voice = { easy: [VR.low + 3, VR.low + 12], medium: [VR.low, VR.high - 3], hard: [VR.low, VR.high] };
      const range = (RANGES[inst] || RANGES.piano)[diff];
      const natural = (m) => ![1, 3, 6, 8, 10].includes((m + tr) % 12);
      const pool = [];
      for (let m = range[0]; m <= range[1]; m++) if (diff === 'hard' || natural(m)) pool.push(m);
      let target = null, since = 0, done = false, holdStart = 0;
      const exactOctave = diff !== 'easy';
      const ordinals = I.strings ? I.strings.map((_, i) => ['1st', '2nd', '3rd', '4th', '5th', '6th'][I.strings.length - 1 - i]) : [];
      const where = (m) => {
        if (I.transpose) { const t = PM.Instruments.trumpetInfo(m); return diff === 'hard' ? 'No hints — trust your ears!' : `Valves: ${t.valves === '0' ? 'open' : t.valves || '?'} (concert ${DSP.midiName(m)})`; }
        if (!I.strings) return '';
        const opts = [];
        I.strings.forEach((open, s) => { const f = m - open; if (f >= 0 && f <= 12) opts.push(`${ordinals[s]} string, ${f === 0 ? 'open' : 'fret ' + f}`); });
        return diff === 'easy' ? opts.slice(0, 1).join('') : 'Find it anywhere on the neck';
      };
      const next = () => {
        if (round >= ROUNDS) return stop(true);
        round++; hud();
        target = pool[(Math.random() * pool.length) | 0];
        since = performance.now(); done = false; holdStart = 0;
        body.innerHTML = `<div class="game-target pop">${DSP.pcName(target + tr)}<sub style="font-size:40px;color:var(--v-300)">${exactOctave ? Math.floor((target + tr) / 12) - 1 : ''}</sub></div>
          <div class="muted">${esc(where(target)) || (exactOctave ? 'Play this exact pitch' : 'Any octave')}</div>
          <div class="timer-bar"><i id="tb" style="width:100%"></i></div><div class="muted small" id="heard">listening…</div>`;
        feedback('', '');
      };
      unsub = engine.on((f) => {
        if (!target || done) return;
        const el = performance.now() - since;
        const tb = $('#tb', body); if (tb) tb.style.width = Math.max(0, 100 - el / 100) + '%';
        if (el > 10000) { done = true; add(0, false); feedback(`⏰ It was ${DSP.midiName(target + tr)}`, 'miss'); later(next, 1200); return; }
        if (!f.active || !f.pitch) { holdStart = 0; return; }
        $('#heard', body).textContent = 'hearing ' + DSP.midiName(f.pitch.midi + tr);
        const ok = exactOctave ? f.pitch.midi === target : f.pitch.pc === target % 12;
        if (ok) {
          if (!holdStart) holdStart = performance.now();
          if (performance.now() - holdStart > 250) { done = true; add(Math.round(60 + Math.max(0, 10 - el / 1000) * 10), true); feedback(`🎯 ${DSP.midiName(f.pitch.midi + tr)}!`, 'perfect'); $('.game-target', body).classList.add('good'); later(next, 800); }
        } else holdStart = 0;
      });
      next();
    }

    // ---------------- Long Tones ----------------
    async function longTones() {
      if (!(await openInput())) return;
      const I = PM.Instruments.get(inst), tr = I.transpose || 0;
      const pool = { trumpet: [58, 60, 62, 65, 67, 70], bass: [28, 33, 36, 38, 43], guitar: [52, 55, 57, 59, 64], electric: [52, 55, 57, 59, 64], voice: [0, 2, 4, 5, 7].map((d) => PM.Learn.RANGE.voice.low + 3 + d) }[inst] || [60, 64, 67];
      const tol = diff === 'easy' ? 15 : diff === 'medium' ? 10 : 6;
      let target = null, hold = [], startHold = 0, done = false, since = 0;
      const next = () => {
        if (round >= ROUNDS) return stop(true);
        round++; hud();
        target = pool[(Math.random() * pool.length) | 0];
        hold = []; startHold = 0; done = false; since = performance.now();
        body.innerHTML = `<div class="game-target pop">${DSP.midiName(target + tr)}</div>
          <div class="muted">${tr ? `concert ${DSP.midiName(target)} · ` : ''}hold it within ±${tol}¢ for 4 seconds</div>
          <div class="timer-bar"><i id="tb" style="width:0%"></i></div>
          <div class="meter-val" id="lt" style="color:#fff">—</div>`;
        feedback('', '');
      };
      unsub = engine.on((f) => {
        if (!target || done) return;
        if (performance.now() - since > 15000) { done = true; add(0, false); feedback('⏰ Take a breath and try the next one', 'miss'); later(next, 1200); return; }
        const p = f.pitch;
        if (!f.active || !p || Math.round(p.midi) !== target) { if (startHold) feedback('Keep the note going…', 'good'); startHold = 0; hold = []; $('#tb', body).style.width = '0%'; return; }
        if (!startHold) startHold = performance.now();
        hold.push(p.cents);
        const held = (performance.now() - startHold) / 1000;
        const recent = hold.slice(-30), mean = recent.reduce((x, y) => x + y, 0) / recent.length;
        const sd = Math.sqrt(recent.reduce((x, y) => x + (y - mean) ** 2, 0) / recent.length);
        $('#tb', body).style.width = Math.min(100, (held / 4) * 100) + '%';
        $('#lt', body).textContent = `${mean > 0 ? '+' : ''}${Math.round(mean)}¢ · ±${Math.round(sd)}¢`;
        if (held >= 4) {
          done = true;
          const all = hold.reduce((x, y) => x + y, 0) / hold.length;
          const dev = Math.sqrt(hold.reduce((x, y) => x + (y - all) ** 2, 0) / hold.length);
          const ok = Math.abs(all) <= tol && dev <= tol;
          add(ok ? Math.round(80 + Math.max(0, tol - dev) * 8) : 10, ok);
          feedback(ok ? `🌟 Rock steady: ${Math.round(all)}¢ ±${Math.round(dev)}¢` : `${Math.abs(all) > tol ? (all > 0 ? 'A little sharp' : 'A little flat') : 'Pitch wandered'} (${Math.round(all)}¢ ±${Math.round(dev)}¢)`, ok ? 'perfect' : 'miss');
          later(next, 1400);
        }
      });
      next();
    }

    // ---------------- Ear Trainer ----------------
    function earTrainer() {
      const types = diff === 'easy' ? ['', 'm'] : diff === 'medium' ? ['', 'm', '7', 'dim'] : ['', 'm', '7', 'maj7', 'm7', 'dim', 'aug', 'sus4'];
      let ans = null, notes = [];
      const label = (t) => Theory.TYPE_BY_ID[t].label;
      const next = () => {
        if (round >= ROUNDS) return stop(true);
        round++; hud();
        ans = types[(Math.random() * types.length) | 0];
        const root = 48 + ((Math.random() * 12) | 0);
        notes = Theory.TYPE_BY_ID[ans].iv.map((iv) => root + iv);
        body.innerHTML = `<div class="game-target pop" style="font-size:72px">?</div>
          <button class="btn white" id="replay">${icon('play')} Play again</button>
          <div class="answer-grid">${types.map((t) => `<button class="btn glass" data-t="${t}">${esc(label(t))}</button>`).join('')}</div>`;
        feedback('', '');
        synthChord(notes);
        $('#replay', body).onclick = () => synthChord(notes);
        $$('[data-t]', body).forEach((b) => (b.onclick = () => {
          const ok = b.dataset.t === ans;
          b.classList.add(ok ? 'right' : 'wrong');
          $(`[data-t="${ans}"]`, body).classList.add('right');
          $$('[data-t]', body).forEach((x) => (x.disabled = true));
          add(ok ? 50 : 0, ok);
          $('.game-target', body).textContent = Theory.chordName(notes[0] % 12, ans);
          feedback(ok ? '✅ Correct!' : `It was ${label(ans)}`, ok ? 'perfect' : 'miss');
          later(next, 1300);
        }));
      };
      next();
    }

    ({ 'chord-quest': chordQuest, 'rhythm-hero': rhythmHero, 'note-hunter': noteHunter, 'long-tones': longTones, 'ear-trainer': earTrainer })[id]();
    return { stop };
  }
})(typeof self !== 'undefined' ? self : globalThis);
