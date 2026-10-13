/* Cadenza — Practice Planner: builds a balanced daily routine (warm-up → technique → songs →
 * theory/ear → fun) for your time, focus and level, then runs it with a visual timer per
 * block and links into the right page for each block. */
(function (root) {
  'use strict';
  const PM = root.PM;
  const { UI } = PM;
  const { icon, esc, $, $$ } = UI;

  const FOCUS = [['balanced', '⚖️ Balanced'], ['technique', '💪 Technique'], ['songs', '🎵 Songs'], ['theory', '🎓 Theory & ear'], ['performance', '🎤 Performance']];
  // share of the session per block for each focus
  const MIX = {
    balanced: { warm: 0.15, tech: 0.25, song: 0.3, theory: 0.2, fun: 0.1 },
    technique: { warm: 0.15, tech: 0.45, song: 0.2, theory: 0.1, fun: 0.1 },
    songs: { warm: 0.1, tech: 0.15, song: 0.55, theory: 0.1, fun: 0.1 },
    theory: { warm: 0.1, tech: 0.15, song: 0.2, theory: 0.45, fun: 0.1 },
    performance: { warm: 0.15, tech: 0.15, song: 0.45, theory: 0.05, fun: 0.2 },
  };

  /** Build a routine: [{id, emoji, title, minutes, desc, go, activity?}] (pure). */
  function buildPlan(opts) {
    const total = Math.max(5, opts.minutes || 20), mix = MIX[opts.focus] || MIX.balanced;
    const inst = opts.instrument || 'guitar', voice = inst === 'voice';
    const round = (x) => Math.max(1, Math.round(x));
    const blocks = [
      { id: 'warm', emoji: '🔥', title: voice ? 'Vocal warm-up' : 'Warm-up', desc: voice ? 'Breathing, lip trills and humming 5-4-3-2-1 (Exercise path, Level 1).' : 'Long notes or a slow scale, loose hands, steady tempo.', go: 'learn', activity: voice ? 'path' : 'scales' },
      { id: 'tech', emoji: '💪', title: 'Technique', desc: opts.nextExercise ? `Next on your Exercise path: ${opts.nextExercise}.` : 'Your next Exercise path exercise — play it with the click until you get ★★.', go: 'learn', activity: 'path' },
      { id: 'song', emoji: '🎵', title: 'Song practice', desc: 'One song, section by section with the backing band — slow first (75%), then full speed.', go: 'songs' },
      { id: 'theory', emoji: '🎓', title: opts.focus === 'theory' ? 'Theory & ear training' : 'Theory', desc: opts.nextLesson ? `Academy: ${opts.nextLesson}.` : 'One Academy lesson and its practice questions.', go: 'academy' },
      { id: 'fun', emoji: '🎉', title: opts.focus === 'performance' ? 'Perform & record' : 'Jam / play for fun', desc: opts.focus === 'performance' ? 'Play your song start to finish without stopping and record it for your teacher.' : 'Improvise over a Style or play a challenge game.', go: opts.focus === 'performance' ? 'studio' : 'metronome' },
    ];
    let out = blocks.map((b) => Object.assign(b, { minutes: round(total * mix[b.id]) }));
    if (total <= 10) out = out.filter((b) => b.id !== 'fun' && (b.id !== 'theory' || opts.focus === 'theory'));
    // make the minutes add up exactly
    const diff = total - out.reduce((a, b) => a + b.minutes, 0);
    const big = out.reduce((a, b) => (b.minutes > a.minutes ? b : a), out[0]);
    big.minutes = Math.max(1, big.minutes + diff);
    return out;
  }

  PM.App.register({
    id: 'planner', title: 'Practice Planner', icon: 'target',
    render(host, App) {
      const P = App.settings.planner || (App.settings.planner = { minutes: App.settings.dailyGoal || 20, focus: 'balanced' });
      const path = PM.Curriculum.forInstrument(App.instrument);
      const prog = App.game.state.path || {};
      const nextEx = path.find((e) => !(prog[e.id] && prog[e.id].stars >= 1));
      const ac = App.game.state.academy || { best: {} };
      const nextL = PM.Academy.LESSONS.find((l) => !(ac.best && ac.best[l.id] >= 0.75));
      let timer = null;
      const draw = () => {
        const plan = buildPlan({ minutes: P.minutes, focus: P.focus, instrument: App.instrument, nextExercise: nextEx && nextEx.title, nextLesson: nextL && nextL.title });
        const week = weekDays(App);
        host.innerHTML = `<div class="page-head"><div><div class="eyebrow">Practice Planner</div><h1>Today's routine</h1><p>A balanced plan for your time and focus. Press <b>Start</b> and Cadenza times each block and opens the right page for it.</p></div></div>
          <section class="card"><div class="row" style="gap:16px;flex-wrap:wrap;align-items:flex-end">
            <div><div class="small muted" style="margin-bottom:6px">Time today</div><div class="seg" id="plMin">${[10, 20, 30, 45, 60].map((m) => `<button data-m="${m}" class="${P.minutes === m ? 'on' : ''}">${m} min</button>`).join('')}</div></div>
            <div><div class="small muted" style="margin-bottom:6px">Focus</div><div class="seg seg-wrap" id="plFocus">${FOCUS.map(([k, l]) => `<button data-f="${k}" class="${P.focus === k ? 'on' : ''}">${l}</button>`).join('')}</div></div></div></section>
          <section class="card" style="margin-top:18px"><div class="card-head"><h3>🗓️ ${P.minutes}-minute plan · ${esc(PM.Instruments.get(App.instrument).label)}</h3><button class="btn primary" id="plGo">${icon('play')} Start routine</button></div>
            <div class="pl-blocks">${plan.map((b, i) => `<div class="pl-block" data-i="${i}" style="--w:${b.minutes}"><span class="pl-em">${b.emoji}</span><b>${esc(b.title)}</b><span class="pl-min">${b.minutes} min</span><span class="small">${esc(b.desc)}</span><button class="btn sm ghost" data-open="${i}">Open →</button></div>`).join('')}</div>
            <div class="pl-bar">${plan.map((b) => `<i style="flex:${b.minutes}" title="${esc(b.title)}">${b.emoji}</i>`).join('')}</div></section>
          <section class="card" style="margin-top:18px"><div class="card-head"><h3>📅 This week</h3><span class="muted small">${week.filter((d) => d.min >= P.minutes * 0.8).length} of 7 days on target</span></div>
            <div class="pl-week">${week.map((d) => `<div class="${d.min >= P.minutes * 0.8 ? 'hit' : d.min ? 'some' : ''} ${d.today ? 'today' : ''}"><b>${d.label}</b><span>${d.min ? d.min + 'm' : '—'}</span></div>`).join('')}</div>
            <p class="small muted" style="margin-top:10px">Little and often wins: 5 days a week at your planned time builds skill faster than one long session.</p></section>
          <div id="plRun"></div>`;
        if (App.routine && App.routine.i < plan.length) {
          const r = document.createElement('div');
          r.className = 'notice pop-in';
          r.style.marginTop = '16px';
          r.innerHTML = `▶️<div><b>Routine in progress</b> — block ${App.routine.i + 1} of ${plan.length}: ${esc(plan[App.routine.i].title)}</div><button class="btn primary sm" id="plResume">Resume routine</button>`;
          host.querySelector('.page-head').after(r);
          $('#plResume', host).onclick = () => { const i = App.routine.i; App.routine = null; run(plan, i + 1 <= plan.length ? i : 0); };
        }
        $$('#plMin [data-m]', host).forEach((b) => (b.onclick = () => { P.minutes = +b.dataset.m; App.saveSettings(); draw(); }));
        $$('#plFocus [data-f]', host).forEach((b) => (b.onclick = () => { P.focus = b.dataset.f; App.saveSettings(); draw(); }));
        $$('[data-open]', host).forEach((b) => (b.onclick = () => openBlock(plan[+b.dataset.open])));
        $('#plGo', host).onclick = () => run(plan, 0);
      };
      const openBlock = (b) => { if (b.activity) App.pendingActivity = b.activity; App.go(b.go); };
      const run = (plan, i) => {
        if (timer) timer.stop();
        if (i >= plan.length) {
          App.routine = null;
          UI.confetti();
          const m = UI.modal(`<div class="modal-body" style="text-align:center"><div style="font-size:54px">🏁</div><h2>Routine complete!</h2><p>${P.minutes} focused minutes — great work. See you tomorrow!</p><button class="btn primary" data-close>Done</button></div>`);
          void m; return;
        }
        const b = plan[i];
        const m = UI.modal(`<div class="modal-body pl-run"><div class="small muted">Block ${i + 1} of ${plan.length}</div><h2>${b.emoji} ${esc(b.title)}</h2><p>${esc(b.desc)}</p><div id="plT" class="kid-timer"></div>
          <div class="row" style="justify-content:center;gap:10px"><button class="btn" id="plOpen">Open ${esc(b.title.toLowerCase())} →</button><button class="btn primary" id="plNext">Next block ➜</button></div>
          <p class="small muted" style="margin-top:10px">Tip: open the page to practise — when you come back to the Planner, “Resume routine” picks up at this block.</p></div>`, { onClose: () => timer && timer.stop() });
        const started = Date.now();
        timer = PM.KidsView.visualTimer($('#plT', m.el), b.minutes * 60, () => { try { PM.Sound.playNotes([72, 76, 79, 84].map((m, k) => ({ midi: m, start: k * 0.12, dur: 0.9, vel: 0.6 })), { voice: 'piano' }); } catch (e) { /* audio blocked */ } });
        const next = () => { const secs = (Date.now() - started) / 1000; if (secs > 30) App.game.recordSession({ mode: 'planner', instrument: App.instrument, seconds: secs, title: 'Routine · ' + b.title, summary: { accuracy: null, stars: 0, score: 0 } }); m.close(); run(plan, i + 1); };
        $('#plNext', m.el).onclick = next;
        $('#plOpen', m.el).onclick = () => { App.routine = { plan, i }; openBlock(b); };
      };
      draw();
      return () => { if (timer) timer.stop(); };
    },
  });

  function weekDays(App) {
    const out = [], now = new Date();
    const hist = App.game.state.history || [];
    for (let k = 6; k >= 0; k--) {
      const d = new Date(now); d.setDate(now.getDate() - k);
      const key = d.toDateString();
      const sec = hist.filter((h) => new Date(h.date).toDateString() === key).reduce((a, h) => a + (h.seconds || 0), 0);
      out.push({ label: d.toLocaleDateString(undefined, { weekday: 'short' }), min: Math.round(sec / 60), today: k === 0 });
    }
    return out;
  }

  PM.Planner = { buildPlan, FOCUS, MIX };
})(typeof self !== 'undefined' ? self : globalThis);
