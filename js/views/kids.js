/* Cadenza — Kids & Focus: micro-lessons for children and teens (ADHD- and autism-friendly).
 * Predictable structure (today's plan: warm-up → lesson → movement), one instruction at a
 * time with progress dots, big touch targets, visual timers, an always-available break
 * button, gentle feedback (never red crosses), optional read-aloud, calm mode, and a
 * sticker book. Most activities work by tapping — no instrument or microphone needed. */
(function (root) {
  'use strict';
  const PM = root.PM;
  const { UI, Kids, DSP } = PM;
  const { icon, esc, $, $$ } = UI;

  // ------------------------------------------------------------------ state
  const stateOf = (App) => {
    const g = App.game.state;
    g.kids = Object.assign({ stars: 0, done: {}, buddy: '🦊', track: 'rhythm', sounds: true, relaxed: true, minutes: 0 }, g.kids || {});
    return g.kids;
  };
  const save = (App) => App.game.save();

  // ------------------------------------------------------------------ sounds
  const ctx = () => PM.Audio.getCtx();
  function tone(midi, when, dur, vol, type) {
    const c = ctx(), t = when || c.currentTime + 0.02;
    const o = c.createOscillator(), g = c.createGain();
    o.type = type || 'triangle'; o.frequency.value = DSP.midiToFreq(midi);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol || 0.3, t + 0.015);
    g.gain.setTargetAtTime(0.0001, t + (dur || 0.5) * 0.8, 0.08);
    o.connect(g).connect(c.destination); o.start(t); o.stop(t + (dur || 0.5) + 0.4);
  }
  function click(when, accent, soft) {
    const c = ctx(), t = when || c.currentTime + 0.01;
    const o = c.createOscillator(), g = c.createGain();
    o.type = 'sine'; o.frequency.value = accent ? 1200 : 800;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(soft ? 0.12 : accent ? 0.45 : 0.28, t + 0.003); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.06);
    o.connect(g).connect(c.destination); o.start(t); o.stop(t + 0.08);
  }
  const chime = (App) => { if (!stateOf(App).sounds) return; const t = ctx().currentTime + 0.02; [72, 76, 79, 84].forEach((m, i) => tone(m, t + i * 0.09, 0.5, 0.12, 'sine')); };
  const speak = (text) => { try { if (!root.speechSynthesis) return; root.speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(text.replace(/[^\p{L}\p{N}\s.,!?'"-]/gu, '')); u.rate = 0.92; u.pitch = 1.1; root.speechSynthesis.speak(u); } catch (e) { /* no speech */ } };

  // ------------------------------------------------------------------ visual timer
  /** A shrinking-pie countdown. Returns {stop, pause}. */
  function visualTimer(box, seconds, onEnd, opts) {
    opts = opts || {};
    const R = 52, C = 2 * Math.PI * R;
    box.innerHTML = `<div class="vt"><svg viewBox="0 0 120 120" class="vt-svg"><circle cx="60" cy="60" r="${R}" class="vt-bg"/><circle cx="60" cy="60" r="${R}" class="vt-fg" stroke-dasharray="${C}" stroke-dashoffset="0" transform="rotate(-90 60 60)"/></svg><b class="vt-txt"></b>${opts.controls === false ? '' : '<button class="btn sm ghost vt-pause">⏸ Pause</button>'}</div>`;
    const fg = box.querySelector('.vt-fg'), txt = box.querySelector('.vt-txt');
    let left = seconds, last = performance.now(), paused = false, raf = 0, ended = false;
    const fmt = (s) => (s >= 60 ? `${Math.floor(s / 60)}:${String(Math.ceil(s % 60) === 60 ? 0 : Math.floor(s % 60)).padStart(2, '0')}` : `${Math.ceil(s)}`);
    const tick = (now) => {
      if (!paused) left -= (now - last) / 1000;
      last = now;
      fg.setAttribute('stroke-dashoffset', String(C * (1 - Math.max(0, left) / seconds)));
      txt.textContent = fmt(Math.max(0, left));
      if (left <= 0 && !ended) { ended = true; onEnd && onEnd(); return; }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    const pb = box.querySelector('.vt-pause');
    if (pb) pb.onclick = () => { paused = !paused; pb.textContent = paused ? '▶ Resume' : '⏸ Pause'; };
    return { stop() { cancelAnimationFrame(raf); ended = true; } };
  }

  // ------------------------------------------------------------------ view
  PM.App.register({
    id: 'kids', title: 'Kids & Focus', nav: 'Kids', icon: 'star',
    render(host, App) {
      const K = stateOf(App);
      let cleanup = [];
      const draw = () => {
        cleanup.forEach((f) => f()); cleanup = [];
        const plan = Kids.todaysPlan(K.track, K.done);
        const lessons = Kids.LESSONS.filter((l) => l.track === K.track);
        const stickers = Kids.stickersEarned(K.stars);
        const toNext = 3 - (K.stars % 3);
        const tr = Kids.TRACKS.find((t) => t.id === K.track);
        host.innerHTML = `
          <div class="page-head"><div><div class="eyebrow">Kids & Focus</div><h1><button class="kid-buddy" id="kBuddy" title="Choose your buddy">${K.buddy}</button> Hi${App.game.state.name ? ', ' + esc(App.game.state.name) : ''}! Let's make music.</h1>
            <p>Short lessons, one step at a time. Take a break whenever you like.</p></div>
            <div class="row"><span class="chip big">⭐ <b>${K.stars}</b> stars</span><span class="chip big">🎁 ${toNext} more ⭐ for a sticker</span></div></div>

          <div class="seg big-tabs kid-tracks" id="kTrack">${Kids.TRACKS.map((t) => `<button data-t="${t.id}" class="${t.id === K.track ? 'on' : ''}">${t.emoji} ${esc(t.name)}</button>`).join('')}</div>

          <section class="card kid-plan">
            <div class="card-head"><h3>🗓️ Today's plan</h3><span class="muted small">First this, then that — about ${plan.reduce((a, l) => a + l.minutes, 0)} minutes</span></div>
            <div class="plan-row">${plan.map((l, i) => `${i ? '<span class="plan-arrow">➜</span>' : ''}<button class="plan-card ${K.done[l.id] ? 'done' : ''}" data-l="${l.id}"><span class="plan-n">${i + 1}</span><span class="plan-em">${l.emoji}</span><b>${esc(l.title)}</b><span class="small">${l.minutes} min ${K.done[l.id] ? '· ✓ done' : ''}</span></button>`).join('')}</div>
            <div class="row" style="justify-content:center;margin-top:14px"><button class="btn primary big-btn" id="kGo">▶ Start my plan</button></div>
          </section>

          <section class="card" style="margin-top:18px">
            <div class="card-head"><h3>${tr.emoji} ${esc(tr.name)} lessons</h3><span class="muted small">${esc(tr.desc)}</span></div>
            <div class="kid-grid">${lessons.map((l, i) => { const d = K.done[l.id]; return `<button class="kid-tile ${d ? 'done' : ''}" data-l="${l.id}"><span class="kt-n">${i + 1}</span><span class="kt-em">${l.emoji}</span><b>${esc(l.title)}</b><span class="small">${l.minutes} min</span><span class="kt-stars">${d ? '⭐'.repeat(d) + '☆'.repeat(3 - d) : '☆☆☆'}</span></button>`; }).join('')}</div>
          </section>

          <div class="grid g3" style="margin-top:18px">
            <section class="card"><div class="card-head"><h3>⏳ Practice timer</h3></div>
              <div id="kTimer" class="kid-timer"></div>
              <div class="seg" id="kTimerSet">${[2, 5, 10, 15].map((m) => `<button data-m="${m}">${m} min</button>`).join('')}</div>
              <p class="small muted" style="margin-top:8px">Pick a time. When the circle is empty, you're done — choose a reward!</p></section>
            <section class="card"><div class="card-head"><h3>🧘 Brain break</h3></div>
              <div class="stack"><button class="btn big-btn" id="kBreathe">🫧 Breathing bubble</button><button class="btn big-btn" id="kMove">🕺 Wiggle break</button><button class="btn big-btn" id="kSqueeze">✊ Squeeze & relax</button></div></section>
            <section class="card"><div class="card-head"><h3>😌 Comfort settings</h3></div>
              <div class="stack">
                <label class="switch"><input type="checkbox" id="kCalm" ${PM.Theme.get(App.settings).calm ? 'checked' : ''}><span class="track"></span>Calm mode (no moving effects)</label>
                <label class="switch"><input type="checkbox" id="kSounds" ${K.sounds ? 'checked' : ''}><span class="track"></span>Reward sounds</label>
                <label class="switch"><input type="checkbox" id="kRelax" ${K.relaxed ? 'checked' : ''}><span class="track"></span>Relaxed timing (easier tapping)</label>
                <label class="switch"><input type="checkbox" id="kRead" ${PM.Theme.get(App.settings).font === 'readable' ? 'checked' : ''}><span class="track"></span>Easy-to-read letters</label>
                <div class="seg" id="kText">${[['md', 'A'], ['lg', 'A+'], ['xl', 'A++']].map(([v, l]) => `<button data-v="${v}" class="${PM.Theme.get(App.settings).text === v ? 'on' : ''}">${l}</button>`).join('')}</div>
                <button class="btn sm ghost" id="kTheme">🎨 Colours & themes</button>
              </div></section>
          </div>

          <section class="card" style="margin-top:18px"><div class="card-head"><h3>📒 My sticker book</h3><span class="muted small">${stickers.length} / ${Kids.STICKERS.length}</span></div>
            <div class="sticker-book">${Kids.STICKERS.map((s, i) => `<span class="sticker ${i < stickers.length ? 'got' : ''}">${i < stickers.length ? s : '?'}</span>`).join('')}</div></section>

          <details class="card" style="margin-top:18px"><summary><b>For parents & teachers</b> — how this page supports ADHD and autistic learners</summary>
            <ul class="small" style="line-height:1.8;color:var(--ink-2)">
              <li><b>Short and predictable:</b> 1–4 minute lessons, always warm-up → lesson → movement, with "step 2 of 4" dots so nothing is a surprise.</li>
              <li><b>One instruction at a time</b> with a big picture; tap 🔊 to hear it read aloud.</li>
              <li><b>Visual timers</b> make time concrete; the practice timer ends with a reward choice (first-then).</li>
              <li><b>Breaks on demand:</b> the "I need a break" button is on every step — breathing, wiggling or squeezing, then back to the same step.</li>
              <li><b>Gentle feedback:</b> no red crosses or buzzers, always at least one star for trying; relaxed timing is on by default.</li>
              <li><b>Sensory control:</b> calm mode removes motion and confetti; reward sounds can be turned off; colour themes, dark mode, larger text and the easy-to-read Atkinson Hyperlegible or Lexend fonts.</li>
              <li><b>Consistent colours:</b> every note always has the same colour (C is red, G is blue…) to build memory without reading.</li>
              <li><b>Choice and control:</b> pick the instrument, the order, a buddy, and the timer length.</li>
            </ul>
            <p class="small muted">Tip: keep sessions short and end on a success. Little and often (5–10 minutes a day) works better than long sessions.</p></details>`;

        $$('#kTrack [data-t]', host).forEach((b) => (b.onclick = () => { K.track = b.dataset.t; save(App); draw(); }));
        $$('[data-l]', host).forEach((b) => (b.onclick = () => playLesson(App, Kids.LESSONS.find((l) => l.id === b.dataset.l), { onClose: draw })));
        $('#kGo', host).onclick = () => { const q = plan.filter((l) => !K.done[l.id]); runQueue(App, q.length ? q : plan, draw); };
        $('#kBuddy', host).onclick = () => {
          const m = UI.modal(`<div class="modal-body" style="text-align:center"><h2>Choose your buddy</h2><div class="buddy-grid">${Kids.BUDDIES.map((b) => `<button data-b="${b}" class="${b === K.buddy ? 'on' : ''}">${b}</button>`).join('')}</div></div>`);
          $$('[data-b]', m.el).forEach((b) => (b.onclick = () => { K.buddy = b.dataset.b; save(App); m.close(); draw(); }));
        };
        let timer = null;
        const timerBox = $('#kTimer', host);
        timerBox.innerHTML = '<div class="vt-idle">⏳</div>';
        $$('#kTimerSet [data-m]', host).forEach((b) => (b.onclick = () => {
          $$('#kTimerSet [data-m]', host).forEach((x) => x.classList.toggle('on', x === b));
          if (timer) timer.stop();
          const started = Date.now();
          timer = visualTimer(timerBox, +b.dataset.m * 60, () => {
            chime(App);
            K.minutes += Math.round((Date.now() - started) / 60000);
            K.stars += 1; save(App);
            App.game.recordSession({ mode: 'kids', instrument: App.instrument, seconds: (Date.now() - started) / 1000, title: 'Kids practice timer', summary: { accuracy: 1, stars: 3, score: 30 } });
            rewardChoice(App, draw);
          });
        }));
        cleanup.push(() => timer && timer.stop());
        $('#kBreathe', host).onclick = () => breakModal(App, 'breathe');
        $('#kMove', host).onclick = () => breakModal(App, 'move');
        $('#kSqueeze', host).onclick = () => breakModal(App, 'squeeze');
        const setAp = (k, v) => { App.settings.appearance = Object.assign(PM.Theme.get(App.settings), { [k]: v }); App.saveSettings(); PM.Theme.apply(App.settings); };
        $('#kCalm', host).onchange = (e) => setAp('calm', e.target.checked);
        $('#kRead', host).onchange = (e) => setAp('font', e.target.checked ? 'readable' : 'avenir');
        $$('#kText [data-v]', host).forEach((b) => (b.onclick = () => { setAp('text', b.dataset.v); $$('#kText [data-v]', host).forEach((x) => x.classList.toggle('on', x === b)); }));
        $('#kSounds', host).onchange = (e) => { K.sounds = e.target.checked; save(App); };
        $('#kRelax', host).onchange = (e) => { K.relaxed = e.target.checked; save(App); };
        $('#kTheme', host).onclick = () => PM.Theme.openModal(App);
      };
      draw();
      return () => { cleanup.forEach((f) => f()); };
    },
  });

  function runQueue(App, list, onDone) {
    const next = (i) => { if (i >= list.length) { onDone && onDone(); return; } playLesson(App, list[i], { onClose: onDone, onNext: () => next(i + 1), queueInfo: `${i + 1} of ${list.length}` }); };
    next(0);
  }

  function rewardChoice(App, after) {
    const m = UI.modal(`<div class="modal-body" style="text-align:center"><div style="font-size:54px">🎉</div><h2>Time's up — great practising!</h2><p>You earned a ⭐. Pick your reward:</p>
      <div class="reward-grid"><button data-r="song">🎵 Play a song for fun</button><button data-r="game">🎮 A music game</button><button data-r="break">🧘 Relax break</button><button data-r="done">✅ I'm done</button></div></div>`);
    $$('[data-r]', m.el).forEach((b) => (b.onclick = () => { m.close(); const r = b.dataset.r; if (r === 'song') App.go('songs'); else if (r === 'game') App.go('games'); else if (r === 'break') breakModal(App, 'breathe'); else after && after(); }));
  }

  // ------------------------------------------------------------------ breaks
  function breakModal(App, kind, onBack) {
    const m = UI.modal(`<div class="modal-body kid-break" style="text-align:center"><div id="brBox"></div><button class="btn primary big-btn" id="brDone" style="margin-top:16px">${onBack ? '↩ Back to my lesson' : '✓ I feel ready'}</button></div>`, { onClose: () => { stopper && stopper(); onBack && onBack(); } });
    let stopper = null;
    const box = $('#brBox', m.el);
    if (kind === 'breathe') stopper = breathe(box, { rounds: 4, inhale: 4, exhale: 5 }, () => {});
    else if (kind === 'move') stopper = moveBreak(box, { seconds: 40, moves: ['Stretch up high like a tree 🌳', 'Shake your hands like jelly 🍮', 'March on the spot 🥾', 'Roll your shoulders 🔄', 'Wiggle your fingers 🐙'] }, () => {});
    else stopper = moveBreak(box, { seconds: 30, moves: ['Squeeze your hands into fists — tight! ✊', 'Now let go… floppy hands 🖐️', 'Squeeze your shoulders up to your ears ⬆️', 'Drop them down… relaxed 😌', 'Scrunch your face… and relax 😊'] }, () => {});
    $('#brDone', m.el).onclick = () => m.close();
  }

  // ------------------------------------------------------------------ lesson player
  function playLesson(App, lesson, opts) {
    opts = opts || {};
    const K = stateOf(App);
    const scores = [];
    const started = performance.now();
    let idx = 0, stopStep = null;
    const m = UI.modal(`<div class="kid-player">
        <div class="kp-head"><span class="kp-em">${lesson.emoji}</span><b>${esc(lesson.title)}</b>${opts.queueInfo ? `<span class="tag">${opts.queueInfo}</span>` : ''}<span class="spacer"></span><button class="btn sm ghost" id="kpBreak">🧘 I need a break</button><button class="btn sm ghost icon" data-close aria-label="Close">✕</button></div>
        <div class="kp-dots" id="kpDots"></div>
        <div class="kp-stage" id="kpStage"></div></div>`, { onClose: () => { if (stopStep) stopStep(); try { root.speechSynthesis && root.speechSynthesis.cancel(); } catch (e) { /* */ } opts.onClose && opts.onClose(); } });
    m.el.querySelector('.modal').classList.add('kid-modal');
    const stage = $('#kpStage', m.el);
    const dots = () => { $('#kpDots', m.el).innerHTML = lesson.steps.map((_, i) => `<i class="${i < idx ? 'done' : i === idx ? 'now' : ''}"></i>`).join('') + `<span class="small muted">Step ${Math.min(idx + 1, lesson.steps.length)} of ${lesson.steps.length}</span>`; };
    $('#kpBreak', m.el).onclick = () => {
      const was = idx;
      if (stopStep) stopStep();
      breakModal(App, 'breathe', () => { idx = was; runStep(); });
    };
    const runStep = () => {
      dots();
      if (idx >= lesson.steps.length) return finish();
      const step = lesson.steps[idx];
      const fn = STEPS[step.type] || STEPS.say;
      stopStep = fn(stage, step, App, (score) => { stopStep = null; scores.push(score == null ? 1 : score); idx++; runStep(); });
    };
    const finish = () => {
      const avg = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 1;
      const stars = Kids.starsFor(avg);
      const before = Kids.stickersEarned(K.stars).length;
      K.done[lesson.id] = Math.max(K.done[lesson.id] || 0, stars);
      K.stars += stars;
      save(App);
      const after = Kids.stickersEarned(K.stars);
      const newSticker = after.length > before ? after[after.length - 1] : null;
      App.game.recordSession({ mode: 'kids', instrument: App.instrument, seconds: (performance.now() - started) / 1000, title: 'Kids · ' + lesson.title, summary: { accuracy: avg, stars, score: Math.round(avg * 100) } });
      chime(App);
      if (stars === 3 || newSticker) UI.confetti();
      stage.innerHTML = `<div class="kp-done"><div class="kp-big">${K.buddy}</div><div class="big-stars">${'⭐'.repeat(stars)}${'☆'.repeat(3 - stars)}</div><h2>${esc(Kids.cheer(avg))}</h2>
        ${newSticker ? `<div class="new-sticker"><span>${newSticker}</span><b>New sticker for your book!</b></div>` : `<p class="muted">${3 - (K.stars % 3)} more ⭐ for your next sticker.</p>`}
        <div class="row" style="justify-content:center;gap:10px;margin-top:16px">${opts.onNext ? '<button class="btn primary big-btn" id="kpNext">Next ➜</button>' : ''}<button class="btn big-btn" id="kpAgain">↻ Again</button><button class="btn ghost big-btn" data-close>Done</button></div></div>`;
      const nx = $('#kpNext', stage);
      if (nx) nx.onclick = () => { const f = opts.onNext; opts.onClose = null; m.close(); f(); };
      $('#kpAgain', stage).onclick = () => { idx = 0; scores.length = 0; runStep(); };
    };
    runStep();
  }

  // ------------------------------------------------------------------ steps
  const readBtn = (text) => `<button class="btn sm ghost kp-read" data-say="${esc(text)}" title="Read aloud">🔊</button>`;
  const wireRead = (box) => $$('[data-say]', box).forEach((b) => (b.onclick = () => speak(b.dataset.say)));

  const STEPS = {
    say(box, s, App, done) {
      box.innerHTML = `<div class="kp-say"><div class="kp-big">${s.emoji || '🎵'}</div><p class="kp-text">${esc(s.text)} ${readBtn(s.text)}</p><button class="btn primary big-btn" id="kOk">✓ Got it</button></div>`;
      wireRead(box);
      $('#kOk', box).onclick = () => done(1);
    },

    'tap-beat'(box, s, App, done) {
      const K = stateOf(App), bpb = s.bpb || 4, beat = 60 / s.bpm, n = s.beats;
      box.innerHTML = `<div class="kp-tap"><p class="kp-text">${esc(s.text || 'Tap with the beat')} ${readBtn(s.text || 'Tap with the beat')}</p>
        ${s.chords ? '<div class="kp-chord" id="kChord">—</div>' : ''}
        <button class="tap-pad" id="kPad"><span id="kPadTxt">Press start</span></button>
        <div class="kp-beats" id="kBeats">${Array.from({ length: n }, (_, i) => `<i class="${i % bpb === 0 ? 'one' : ''}"></i>`).join('')}</div>
        <button class="btn primary big-btn" id="kStart">▶ Start</button><p class="small muted">Tap the pad or press the space bar.</p></div>`;
      const pad = $('#kPad', box), beatsEl = $$('#kBeats i', box);
      let t0 = 0, taps = [], running = false, raf = 0, timeout = 0;
      const onTap = (e) => { if (e) e.preventDefault(); if (!running) return; const t = ctx().currentTime; taps.push(t - t0); pad.classList.remove('hit'); void pad.offsetWidth; pad.classList.add('hit'); if (K.sounds) click(null, false, true); };
      pad.onpointerdown = onTap;
      const key = (e) => { if (e.code === 'Space') onTap(e); };
      addEventListener('keydown', key);
      $('#kStart', box).onclick = () => {
        $('#kStart', box).classList.add('hidden');
        const c = ctx();
        t0 = c.currentTime + 0.3 + bpb * beat;
        for (let i = -bpb; i < n; i++) click(t0 + i * beat, ((i % bpb) + bpb) % bpb === 0, i < 0);
        running = true;
        const loop = () => {
          const t = c.currentTime - t0, bi = Math.floor(t / beat);
          $('#kPadTxt', box).textContent = t < 0 ? `Get ready… ${Math.ceil(-t / beat)}` : bi < n ? (s.onlyOne && bi % bpb !== 0 ? (bi % bpb) + 1 : (bi % bpb) + 1) : '';
          pad.classList.toggle('flash', t >= 0 && bi < n && (t - bi * beat) < 0.12 && (!s.onlyOne || bi % bpb === 0));
          beatsEl.forEach((el, i) => el.classList.toggle('now', i === bi));
          if (s.chords && t >= 0) $('#kChord', box).textContent = s.chords[Math.floor(bi / bpb) % s.chords.length] || '';
          if (t < n * beat + 0.4) raf = requestAnimationFrame(loop);
          else finish();
        };
        raf = requestAnimationFrame(loop);
      };
      const finish = () => {
        running = false;
        const targets = [];
        for (let i = 0; i < n; i++) if (!s.onlyOne || i % bpb === 0) targets.push(i * beat);
        const r = Kids.judgeTaps(taps, targets, K.relaxed ? 0.2 : 0.13);
        const score = r.total ? r.hits / r.total : 0;
        beatsEl.forEach((el) => el.classList.remove('now'));
        const tip = r.early > r.late + 2 ? 'You were a little early — wait for the flash.' : r.late > r.early + 2 ? 'You were a little late — get ready one beat ahead.' : '';
        box.innerHTML = `<div class="kp-say"><div class="kp-big">${score >= 0.85 ? '🎉' : score >= 0.6 ? '👍' : '💪'}</div><h2>${r.hits} of ${r.total} on the beat</h2><p class="kp-text">${esc(Kids.cheer(score, tip))}</p>
          <div class="row" style="justify-content:center;gap:10px"><button class="btn big-btn" id="kRetry">↻ Try again</button><button class="btn primary big-btn" id="kNext">Next ➜</button></div></div>`;
        $('#kRetry', box).onclick = () => STEPS['tap-beat'](box, s, App, done);
        $('#kNext', box).onclick = () => done(Math.max(0.4, score));
      };
      return () => { cancelAnimationFrame(raf); clearTimeout(timeout); removeEventListener('keydown', key); running = false; };
    },

    'echo-rhythm'(box, s, App, done) {
      const K = stateOf(App), beat = 60 / s.bpm;
      let pi = 0, total = 0, raf = 0, stopped = false;
      const key = (e) => { if (e.code === 'Space' && onTap) { e.preventDefault(); onTap(); } };
      let onTap = null;
      addEventListener('keydown', key);
      const round = () => {
        if (stopped) return;
        if (pi >= s.patterns.length) { done(total / s.patterns.length); return; }
        const pat = s.patterns[pi], ro = Kids.rhythmOnsets(pat);
        const dotsHtml = pat.map((d) => `<i class="rd ${d < 0 ? 'rest' : d < 1 ? 'short' : d > 1 ? 'long' : ''}" style="flex:${Math.abs(d)}">${d < 0 ? '𝄽' : d < 1 ? '♪' : '♩'}</i>`).join('');
        box.innerHTML = `<div class="kp-tap"><p class="kp-text">Rhythm ${pi + 1} of ${s.patterns.length}: <b id="kPh">listen…</b></p><div class="rhythm-row" id="kRow">${dotsHtml}</div>
          <button class="tap-pad" id="kPad"><span id="kPadTxt">👂 Listen</span></button><div class="row" style="justify-content:center;gap:8px"><button class="btn sm ghost" id="kAgain">🔁 Hear again</button></div></div>`;
        const pad = $('#kPad', box), c = ctx();
        const play = () => {
          const ts = c.currentTime + 0.3;
          ro.onsets.forEach((o) => tone(76, ts + o * beat, 0.12, 0.35, 'square'));
          return ts + ro.length * beat;
        };
        const listenEnd = play();
        $('#kAgain', box).onclick = () => { if (!onTap) play(); };
        const yourTurn = () => {
          if (stopped) return;
          const t0 = c.currentTime + 0.25 + 4 * beat;
          for (let i = -4; i < 0; i++) click(t0 + i * beat, i === -4, true);
          const taps = [];
          $('#kPh', box).textContent = 'your turn!';
          onTap = () => { const t = c.currentTime - t0; taps.push(t / beat); pad.classList.remove('hit'); void pad.offsetWidth; pad.classList.add('hit'); if (K.sounds) tone(79, null, 0.1, 0.25, 'square'); };
          pad.onpointerdown = (e) => { e.preventDefault(); onTap(); };
          const loop = () => {
            const t = c.currentTime - t0;
            $('#kPadTxt', box).textContent = t < 0 ? `Ready… ${Math.ceil(-t / beat)}` : '👏 Tap!';
            if (t < (ro.length + 0.6) * beat) { raf = requestAnimationFrame(loop); return; }
            onTap = null;
            const r = Kids.judgeTaps(taps, ro.onsets, (K.relaxed ? 0.32 : 0.22));
            const sc = r.total ? Math.max(0, (r.hits - Math.max(0, r.extra - 1) * 0.5) / r.total) : 0;
            total += sc;
            const marks = $$('.rd:not(.rest)', box);
            ro.onsets.forEach((o, i) => { if (marks[i] && taps.some((x) => Math.abs(x - o) <= (K.relaxed ? 0.32 : 0.22))) marks[i].classList.add('ok'); });
            $('#kPh', box).textContent = sc >= 0.85 ? 'perfect! 🎉' : sc >= 0.6 ? 'nice! 👍' : 'good try! 💪';
            setTimeout(() => { pi++; round(); }, 1300);
          };
          raf = requestAnimationFrame(loop);
        };
        const wait = () => { if (stopped) return; if (c.currentTime >= listenEnd + 0.2) yourTurn(); else raf = requestAnimationFrame(wait); };
        raf = requestAnimationFrame(wait);
      };
      round();
      return () => { stopped = true; cancelAnimationFrame(raf); removeEventListener('keydown', key); };
    },

    'color-keys'(box, s, App, done) {
      const lo = 60, hi = 83;
      const whites = [], blacks = [];
      for (let m = lo; m <= hi; m++) ([1, 3, 6, 8, 10].includes(m % 12) ? blacks : whites).push(m);
      const W = 100 / whites.length;
      const xOf = (m) => { const wi = whites.filter((w) => w < m).length; return wi * W - W * 0.3; };
      const keyHtml = `<div class="ckb">${whites.map((m) => `<button class="ck w" data-m="${m}" style="--kc:${Kids.colorOf(m)}"><span>${Kids.NOTE_NAMES[m % 12]}</span></button>`).join('')}${blacks.map((m) => `<button class="ck b" data-m="${m}" style="left:${xOf(m)}%;width:${W * 0.6}%;--kc:${Kids.colorOf(m)}"></button>`).join('')}</div>`;
      let wrong = 0;
      const seq = s.task === 'sequence' ? s.seq : null;
      const found = new Set();
      let pos = 0;
      box.innerHTML = `<div class="kp-keys"><p class="kp-text">${esc(s.text || (seq ? 'Tap the colours in order.' : 'Find the keys.'))} ${readBtn(s.text || 'Tap the colours in order')}</p>
        ${seq ? `<div class="seq-row" id="kSeq">${seq.map((m, i) => `<i style="--kc:${Kids.colorOf(m)}" class="${i === 0 ? 'now' : ''}">${Kids.NOTE_NAMES[m % 12]}</i>`).join('')}</div><button class="btn sm ghost" id="kHear">🔊 Hear the tune</button>` : `<div class="muted">Found <b id="kFound">0</b> of ${s.targets.length}</div>`}
        ${keyHtml}</div>`;
      wireRead(box);
      const hear = $('#kHear', box);
      if (hear) hear.onclick = () => { const t = ctx().currentTime + 0.05; seq.forEach((m, i) => tone(m, t + i * 0.45, 0.4, 0.28)); };
      $$('.ck', box).forEach((k) => (k.onpointerdown = (e) => {
        e.preventDefault();
        const m = +k.dataset.m;
        tone(m, null, 0.45, 0.3);
        k.classList.add('down'); setTimeout(() => k.classList.remove('down'), 180);
        if (seq) {
          if (m === seq[pos]) {
            const items = $$('#kSeq i', box);
            items[pos].classList.remove('now'); items[pos].classList.add('ok');
            pos++;
            if (items[pos]) { items[pos].classList.add('now'); items[pos].scrollIntoView({ block: 'nearest', inline: 'center' }); }
            if (pos >= seq.length) setTimeout(() => done(seq.length / (seq.length + wrong * 0.4)), 500);
          } else { wrong++; k.classList.add('wobble'); setTimeout(() => k.classList.remove('wobble'), 400); }
        } else if (s.targets.includes(m)) {
          found.add(m); k.classList.add('found'); $('#kFound', box).textContent = found.size;
          if (found.size === s.targets.length) setTimeout(() => done(s.targets.length / (s.targets.length + wrong * 0.4)), 500);
        } else { wrong++; k.classList.add('wobble'); setTimeout(() => k.classList.remove('wobble'), 400); }
      }));
    },

    'high-low'(box, s, App, done) {
      let r = 0, right = 0, a = 0, b = 0;
      const next = () => {
        if (r >= s.rounds) { done(right / s.rounds); return; }
        a = 60 + Math.floor(Math.random() * 12);
        const gap = 3 + Math.floor(Math.random() * 7);
        b = Math.random() < 0.5 ? a + gap : a - gap;
        box.innerHTML = `<div class="kp-say"><p class="kp-text">Round ${r + 1} of ${s.rounds}: is the <b>second</b> sound higher or lower?</p>
          <div class="row" style="justify-content:center;gap:12px"><button class="btn big-btn choice" data-c="1">🐦 Higher</button><button class="btn big-btn choice" data-c="-1">🐻 Lower</button></div>
          <button class="btn sm ghost" id="kAgain" style="margin-top:12px">🔁 Hear again</button><p id="kMsg" class="kp-text"></p></div>`;
        const play = () => { const t = ctx().currentTime + 0.05; tone(a, t, 0.6, 0.3); tone(b, t + 0.8, 0.6, 0.3); };
        play();
        $('#kAgain', box).onclick = play;
        let first = true;
        $$('[data-c]', box).forEach((btn) => (btn.onclick = () => {
          const ok = (+btn.dataset.c > 0) === (b > a);
          if (ok) { if (first) right++; r++; btn.classList.add('ok'); $('#kMsg', box).textContent = 'Yes! 🎉'; setTimeout(next, 700); }
          else { first = false; btn.classList.add('wobble'); $('#kMsg', box).textContent = 'Listen once more…'; setTimeout(play, 300); }
        }));
      };
      next();
    },

    'listen-choose'(box, s, App, done) {
      box.innerHTML = `<div class="kp-say">${s.sound ? '<button class="btn big-btn" id="kPlay">🔊 Play the sound</button>' : ''}<p class="kp-text">${esc(s.prompt)} ${readBtn(s.prompt)}</p>
        <div class="row" style="justify-content:center;gap:12px;flex-wrap:wrap">${s.options.map((o, i) => `<button class="btn big-btn choice" data-i="${i}">${esc(o)}</button>`).join('')}</div><p id="kMsg" class="kp-text"></p></div>`;
      wireRead(box);
      const play = () => { const t = ctx().currentTime + 0.05; [60, 64, 67].forEach((m, i) => tone(m, t + i * 0.3, 0.3, s.sound === 'loud' ? 0.5 : 0.06)); };
      if (s.sound) { $('#kPlay', box).onclick = play; play(); }
      let first = true;
      $$('[data-i]', box).forEach((b) => (b.onclick = () => {
        if (+b.dataset.i === s.answer) { b.classList.add('ok'); $('#kMsg', box).textContent = 'That\'s right! 🎉'; setTimeout(() => done(first ? 1 : 0.6), 700); }
        else { first = false; b.classList.add('wobble'); $('#kMsg', box).textContent = 'Not quite — have another go.'; }
      }));
    },

    'play-note'(box, s, App, done) {
      let i = 0, heard = 0, unsub = null, hold = 0, stopped = false, fallbackT = 0;
      const name = (m) => Kids.NOTE_NAMES[m % 12];
      const draw = () => {
        if (i >= s.notes.length) { stop(); done(heard / s.notes.length); return; }
        const m = s.notes[i];
        box.innerHTML = `<div class="kp-say"><p class="kp-text">${esc(s.text || 'Play the note')} ${readBtn(s.text || 'Play the note')}</p>
          <div class="note-ball" style="--kc:${Kids.colorOf(m)}">${name(m)}</div><div class="muted">${i + 1} of ${s.notes.length}</div>
          <div class="row" style="justify-content:center;gap:10px;margin-top:10px"><button class="btn big-btn" id="kHear">🔊 Hear it</button>${unsub ? '' : '<button class="btn primary big-btn" id="kMic">🎤 Start listening</button>'}<button class="btn ghost big-btn hidden" id="kSelf">✓ I did it</button></div>
          <p class="small muted" id="kStat">${unsub ? 'Listening… play or sing now' : 'Turn on the microphone so I can hear you (or tap "I did it").'}</p></div>`;
        wireRead(box);
        $('#kHear', box).onclick = () => { if (s.echo && i === 0) { const t = ctx().currentTime + 0.05; s.notes.forEach((x, k) => tone(x, t + k * 0.6, 0.5, 0.3)); } else tone(m, null, 0.8, 0.3); };
        const mic = $('#kMic', box);
        if (mic) mic.onclick = start;
        clearTimeout(fallbackT);
        fallbackT = setTimeout(() => { const b = $('#kSelf', box); if (b) b.classList.remove('hidden'); }, unsub ? 8000 : 1500);
        $('#kSelf', box).onclick = () => { heard += 0.7; i++; draw(); };
        if (s.echo && i === 0) $('#kHear', box).click();
      };
      async function start() {
        try {
          const engine = App.settings.source === 'midi' ? App.midiIn : App.live;
          if (engine === App.live) { App.live.latency = App.settings.latency; await App.live.start(App.settings.deviceId); } else await App.midiIn.start();
          unsub = engine.on((f) => {
            if (stopped || i >= s.notes.length) return;
            const p = f.active ? f.pitch : null;
            const target = s.notes[i];
            const ok = p && p.confidence > 0.75 && (s.octaveFree ? (((p.midi - target) % 12) + 12) % 12 === 0 : p.midi === target || Math.abs(p.midi - target) === 12);
            if (ok) { hold++; if (hold >= 4) { hold = 0; heard++; i++; if (stateOf(App).sounds) tone(84, null, 0.15, 0.12, 'sine'); draw(); } }
            else hold = Math.max(0, hold - 1);
            const st = $('#kStat', box);
            if (st && p && p.confidence > 0.75) st.textContent = `I hear ${name(p.midi)} ${p.midi % 12 === target % 12 ? '— yes! hold it…' : ''}`;
          });
          draw();
        } catch (e) {
          UI.toast('No microphone — tap "I did it" after you play.', { icon: '🎤' });
          const b = $('#kSelf', box); if (b) b.classList.remove('hidden');
        }
      }
      const stop = () => { stopped = true; clearTimeout(fallbackT); if (unsub) { unsub(); unsub = null; } App.live.stop(); App.midiIn.stop(); };
      draw();
      return stop;
    },

    'chord-shape'(box, s, App, done) {
      const shape = (c) => (s.inst === 'guitar' ? `<div class="kid-diagram">${UI.chordDiagram(c)}</div>` : `<div class="mini-keys">${[60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71, 72].map((m) => `<i class="${[1, 3, 6, 8, 10].includes(m % 12) ? 'b' : 'w'} ${(s.keys || []).includes(m) ? 'on' : ''}" style="--kc:${Kids.colorOf(m)}"></i>`).join('')}</div>`);
      let count = 0, timer = null;
      box.innerHTML = `<div class="kp-say"><p class="kp-text">${esc(s.text || '')} ${readBtn(s.text || '')}</p>
        <div class="row" style="justify-content:center;gap:24px;align-items:center">${shape(s.chord)}${s.then ? `<span style="font-size:30px">⇄</span>${shape(s.then)}` : ''}</div>
        <div class="row" style="justify-content:center;gap:16px;align-items:center;margin-top:10px"><div id="kT" class="kid-timer small-t"></div>
        ${s.count ? '<div><button class="btn big-btn" id="kCount">+1 clean switch</button><div class="kp-text">Switches: <b id="kCn">0</b></div></div>' : ''}</div>
        <div class="row" style="justify-content:center;gap:10px"><button class="btn big-btn" id="kHear">🔊 Hear the chord</button><button class="btn primary big-btn" id="kDone">✓ Done</button></div></div>`;
      wireRead(box);
      const pcs = (n) => { const c = PM.Songs.splitChord(n); return PM.Theory.chordPcs(c.root, PM.Songs.simpleType(c.suffix)).map((p) => 52 + ((p - 4 + 12) % 12)); };
      $('#kHear', box).onclick = () => { const t = ctx().currentTime + 0.05; pcs(s.chord).forEach((m, k) => tone(m + (k > 1 ? 12 : 0), t + k * 0.06, 1.2, 0.18)); };
      timer = visualTimer($('#kT', box), s.seconds || 20, () => { chime(App); }, { controls: false });
      if (s.count) $('#kCount', box).onclick = () => { count++; $('#kCn', box).textContent = count; };
      $('#kDone', box).onclick = () => { timer.stop(); done(s.count ? Math.min(1, 0.5 + count / 12) : 1); };
      return () => timer && timer.stop();
    },

    breathe(box, s, App, done) {
      return breathe(box, s, () => done(1));
    },

    move(box, s, App, done) {
      return moveBreak(box, s, () => done(1));
    },
  };

  /** Breathing bubble: grows on the in-breath, shrinks on the out-breath (JS-driven, calm-safe). */
  function breathe(box, s, onEnd) {
    box.innerHTML = `<div class="kp-say"><div class="bubble-wrap"><div class="bubble" id="kBub"></div></div><h2 id="kBt">Get comfy…</h2><p class="muted" id="kBr"></p><button class="btn ghost" id="kSkip">Skip ➜</button></div>`;
    const bub = $('#kBub', box);
    const total = s.rounds * (s.inhale + s.exhale);
    let start = performance.now() + 1200, raf = 0, ended = false;
    const loop = (now) => {
      const t = (now - start) / 1000;
      if (t < 0) { raf = requestAnimationFrame(loop); return; }
      if (t >= total) { ended = true; $('#kBt', box).textContent = 'Well done 😌'; setTimeout(onEnd, 800); return; }
      const cyc = s.inhale + s.exhale, ph = t % cyc, round = Math.floor(t / cyc) + 1;
      const inn = ph < s.inhale;
      const f = inn ? ph / s.inhale : 1 - (ph - s.inhale) / s.exhale;
      bub.style.transform = `scale(${0.45 + 0.55 * f})`;
      $('#kBt', box).textContent = inn ? `Breathe in… ${Math.ceil(s.inhale - ph)}` : `Breathe out… ${Math.ceil(cyc - ph)}`;
      $('#kBr', box).textContent = `Breath ${round} of ${s.rounds}`;
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    $('#kSkip', box).onclick = () => { cancelAnimationFrame(raf); if (!ended) { ended = true; onEnd(); } };
    return () => { cancelAnimationFrame(raf); ended = true; };
  }

  /** Movement break: one big instruction at a time with a visual timer. */
  function moveBreak(box, s, onEnd) {
    const per = s.seconds / s.moves.length;
    box.innerHTML = `<div class="kp-say"><div class="kp-big" id="kMv"></div><div id="kMt" class="kid-timer small-t"></div><button class="btn ghost" id="kSkip">Skip ➜</button></div>`;
    let k = 0, iv = 0;
    const show = () => { const mv = s.moves[k % s.moves.length]; $('#kMv', box).innerHTML = `<span style="font-size:22px;display:block;line-height:1.4">${esc(mv)}</span>`; speak(mv); };
    show();
    iv = setInterval(() => { k++; if (k < s.moves.length) show(); }, per * 1000);
    const t = visualTimer($('#kMt', box), s.seconds, () => { clearInterval(iv); onEnd(); }, { controls: false });
    $('#kSkip', box).onclick = () => { clearInterval(iv); t.stop(); onEnd(); };
    return () => { clearInterval(iv); t.stop(); try { root.speechSynthesis && root.speechSynthesis.cancel(); } catch (e) { /* */ } };
  }

  PM.KidsView = { visualTimer, playLesson };
})(typeof self !== 'undefined' ? self : globalThis);
