/* Cadenza — Learn: guided practice modes that listen to you. Scales, arpeggios, technique
 * exercises, sight-reading, note names, chord library & one-minute changes, interval ear
 * training, call & response, and a progression builder for creative jamming. */
(function (root) {
  'use strict';
  const PM = root.PM;
  const { UI, Theory, DSP, Learn, Instruments } = PM;
  const { icon, esc, $, $$ } = UI;

  const ACTIVITIES = [
    { id: 'path', art: '🧭', name: 'Exercise path (50+)', desc: 'Step-by-step exercises from your first notes to advanced technique. Play along with the click, get live feedback on every note and compare your takes.', input: true },
    { id: 'scales', art: '🪜', name: 'Scales', desc: 'Major, minor, pentatonic, blues and modes in every key. Cadenza listens and moves on with you.', input: true },
    { id: 'arpeggios', art: '🌈', name: 'Arpeggios', desc: 'Chord tones one at a time — the bridge between scales and chords.', input: true },
    { id: 'technique', art: '💪', name: 'Technique exercises', desc: 'Warm-ups made for your instrument: finger patterns, chromatic drills, lip slurs, root–fifth grooves.', input: true },
    { id: 'sight', art: '👀', name: 'Sight-reading', desc: 'Read a fresh melody on the staff and play it. New music every time.', input: true },
    { id: 'notes', art: '🔤', name: 'Note names', desc: 'Name notes on the treble and bass staff as fast as you can. No instrument needed.', input: false },
    { id: 'chords', art: '🎼', name: 'Chord library & changes', desc: 'Every chord in a key with shapes for your instrument, plus the one-minute chord-change drill.', input: true },
    { id: 'intervals', art: '👂', name: 'Interval ear training', desc: 'Hear two notes and name the distance — with a famous song to remember each one.', input: false },
    { id: 'callresp', art: '🗣️', name: 'Call & response', desc: 'Echo short phrases by ear, then invent your own answers. Creative ear training.', input: true },
    { id: 'harmony', art: '🎶', name: 'Harmony & part singing', desc: 'Sing soprano, alto, tenor or bass in famous hymns while Cadenza sings the other parts. Rounds, thirds and drones too.', input: true, link: 'harmony' },
    { id: 'builder', art: '🧱', name: 'Progression builder', desc: 'Build your own chord progression, hear it with a band and improvise over it. Save it as a song.', input: false },
  ];
  const ART = Object.fromEntries(ACTIVITIES.map((a) => [a.id, a]));
  const KEYS = Theory.FLATS.map((n, i) => ({ pc: i, name: [1, 3, 6, 8, 10].includes(i) ? (i === 6 ? 'F#' : n) : n }));
  const keySel = (id, sel) => `<select id="${id}">${KEYS.map((k) => `<option value="${k.pc}" ${k.pc === sel ? 'selected' : ''}>${k.name}</option>`).join('')}</select>`;
  const flatsFor = (pc) => [5, 10, 3, 8, 1].includes(((pc % 12) + 12) % 12);
  const writtenOffset = (inst) => (inst === 'trumpet' ? 2 : inst === 'guitar' || inst === 'electric' || inst === 'bass' ? 12 : 0);
  const nameOf = (m, inst, flats) => { const w = m + (inst === 'trumpet' ? 2 : 0); return Theory.spell(w, flats) + (Math.floor(w / 12) - 1); };

  // ------------------------------------------------------------------ sound
  function playNotes(midis, opts) {
    opts = opts || {};
    const ctx = PM.Audio.getCtx();
    const beat = 60 / (opts.bpm || 90);
    const t0 = ctx.currentTime + 0.08;
    const out = ctx.createGain(); out.gain.value = 0.28; out.connect(ctx.destination);
    const voice = opts.voice || PM.Instruments.get(PM.App.instrument).synth;
    const list = midis.map((m, i) => (typeof m === 'number' ? { midi: m, start: i * beat, dur: beat * 0.92 } : m));
    list.forEach((n) => {
      const f = DSP.midiToFreq(n.midi), st = t0 + n.start, dur = n.dur || beat * 0.9;
      const parts = voice === 'trumpet' ? [[1, 'sawtooth', 0.22]] : voice === 'bass' ? [[1, 'triangle', 0.55], [2, 'sine', 0.15]] : [[1, 'triangle', 0.45], [2, 'sine', 0.12], [3, 'sine', 0.05]];
      parts.forEach(([h, type, amp]) => {
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.type = type; o.frequency.value = f * h;
        g.gain.setValueAtTime(0, st); g.gain.linearRampToValueAtTime(amp, st + 0.012);
        g.gain.setTargetAtTime(amp * (voice === 'trumpet' ? 0.8 : 0.35), st + 0.05, 0.15);
        g.gain.setTargetAtTime(0, st + dur, 0.05);
        if (voice === 'trumpet') { const lp = ctx.createBiquadFilter(); lp.frequency.value = 2400; o.connect(lp).connect(g); } else o.connect(g);
        g.connect(out); o.start(st); o.stop(st + dur + 0.4);
      });
    });
    const end = list.reduce((mx, n) => Math.max(mx, n.start + (n.dur || beat)), 0);
    return { duration: end, stop: () => { try { out.disconnect(); } catch (e) { /* ignore */ } } };
  }

  // ------------------------------------------------------------------ staff
  const LETTER_IDX = { C: 0, D: 1, E: 2, F: 3, G: 4, A: 5, B: 6 };
  function staffSvg(written, opts) {
    opts = opts || {};
    const flats = !!opts.flats;
    const clef = opts.clef || (written.reduce((a, b) => a + b, 0) / Math.max(1, written.length) < 57 ? 'bass' : 'treble');
    const gap = 12, top = 46, W = Math.max(300, 70 + written.length * 46);
    const bottomStep = clef === 'treble' ? 30 : 18; // E4 / G2
    const yOf = (step) => top + 4 * gap - (step - bottomStep) * (gap / 2);
    let s = `<svg class="staff" viewBox="0 0 ${W} ${top * 2 + 4 * gap}" role="img" aria-label="Music staff">`;
    for (let i = 0; i < 5; i++) s += `<line x1="8" x2="${W - 8}" y1="${top + i * gap}" y2="${top + i * gap}" stroke="#8a7fa8" stroke-width="1.2"/>`;
    s += `<text x="12" y="${clef === 'treble' ? top + 3.4 * gap : top + 2.1 * gap}" font-size="${clef === 'treble' ? 52 : 36}" fill="#3b1479">${clef === 'treble' ? '𝄞' : '𝄢'}</text>`;
    written.forEach((m, i) => {
      const name = Theory.spell(m, flats);
      const oct = Math.floor(m / 12) - 1;
      const step = oct * 7 + LETTER_IDX[name[0]];
      const x = 74 + i * 46, y = yOf(step);
      const cls = i === opts.highlight ? 'now' : i < (opts.highlight || 0) ? 'done' : '';
      for (let st = bottomStep - 2; st >= step; st -= 2) s += `<line x1="${x - 12}" x2="${x + 12}" y1="${yOf(st)}" y2="${yOf(st)}" stroke="#8a7fa8" stroke-width="1.2"/>`;
      for (let st = bottomStep + 10; st <= step; st += 2) s += `<line x1="${x - 12}" x2="${x + 12}" y1="${yOf(st)}" y2="${yOf(st)}" stroke="#8a7fa8" stroke-width="1.2"/>`;
      if (name.length > 1) s += `<text x="${x - 22}" y="${y + 5}" font-size="17" class="acc ${cls}">${name[1] === '#' ? '♯' : '♭'}</text>`;
      const up = step < bottomStep + 4;
      s += `<g class="sn ${cls}"><ellipse cx="${x}" cy="${y}" rx="7.2" ry="5.4" transform="rotate(-20 ${x} ${y})"/><line x1="${up ? x + 6.6 : x - 6.6}" x2="${up ? x + 6.6 : x - 6.6}" y1="${y}" y2="${up ? y - 34 : y + 34}" stroke-width="1.6"/></g>`;
    });
    return s + '</svg>';
  }

  // ------------------------------------------------------------------ view
  PM.App.register({
    id: 'learn', title: 'Learn', nav: 'Learn', icon: 'sparkle',
    render(host, App) {
      const I = Instruments.get(App.instrument);
      host.innerHTML = `
        <div class="page-head"><div><div class="eyebrow">Learn · ${esc(I.emoji + ' ' + I.label)}</div><h1>Learn & practise</h1>
          <p>Guided practice that listens to you: scales, chords, reading, ear training and creative exercises. Every session earns XP and counts toward your goals.</p></div>
          <div class="row"><a class="btn ghost" href="#/games">${icon('games')} Challenges</a></div></div>
        ${I.id === 'bass' ? `<section class="card" style="margin-bottom:16px"><div class="card-head"><h3>🎸 Your bass</h3><span class="muted small">Exercises, fretboard and tuner follow your choice</span></div>${PM.Shared.bassStrings(App)}</section>` : ''}
        ${I.family === 'voice' ? `<section class="card" style="margin-bottom:16px"><div class="card-head"><h3>🎤 Your voice type</h3><span class="muted small">Exercises, scales and sing-alongs are pitched for it</span></div>
          <div class="seg voice-types" id="vType">${Object.entries(Instruments.VOICE_TYPES).map(([id, v]) => `<button data-v="${id}" class="${(App.settings.voiceType || 'alto') === id ? 'on' : ''}">${esc(v.label)} <span class="muted small">${PM.DSP.midiName(v.range[0])}–${PM.DSP.midiName(v.range[1])}</span></button>`).join('')}</div>
          <p class="small muted" style="margin-top:8px">Not sure? Most women sing alto or mezzo, most men baritone or tenor. If high notes strain, pick the lower type.</p></section>` : ''}
        <div class="learn-grid" id="lGrid">${ACTIVITIES.map((a) => `<button class="card learn-tile" data-a="${a.id}"><span class="lt-art">${a.art}</span><b>${a.name}</b><span class="small">${a.desc}</span>${a.input ? '' : '<span class="tag" style="align-self:flex-start">no instrument needed</span>'}</button>`).join('')}</div>
        <section class="card stage hidden" id="lStage" style="margin-top:18px"></section>`;
      const stage = $('#lStage', host);
      let current = null;
      const open = (id, params) => {
        if (ART[id] && ART[id].link) { App.go(ART[id].link); return; }
        if (current && current.stop) current.stop();
        stage.classList.remove('hidden');
        $$('.learn-tile', host).forEach((t) => t.classList.toggle('on', t.dataset.a === id));
        current = ACT[id](stage, App, params || {}) || null;
        setTimeout(() => { if (stage.isConnected) stage.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 30);
      };
      $$('[data-a]', host).forEach((b) => (b.onclick = () => open(b.dataset.a)));
      PM.Shared.wireBassStrings(host, App);
      $$('#vType [data-v]', host).forEach((b) => (b.onclick = () => { App.settings.voiceType = b.dataset.v; App.saveSettings(); PM.Learn.setVoiceType(b.dataset.v); App.rerender(); }));
      if (App.pendingActivity && ACT[App.pendingActivity]) { const a = App.pendingActivity; App.pendingActivity = null; open(a); }
      else if (App.pendingExercise) { const id = App.pendingExercise; App.pendingExercise = null; open('path', { exercise: id }); }
      else if (App.pendingLearn && App.pendingLearn.learn && ACT[App.pendingLearn.learn.activity]) open(App.pendingLearn.learn.activity, Object.assign({ assignment: App.pendingLearn }, App.pendingLearn.learn));
      return () => { if (current && current.stop) current.stop(); };
    },
  });

  function head(stage, id, extra) {
    const a = ART[id];
    return `<div class="card-head"><h3 style="color:#fff">${a.art} ${a.name}</h3><div class="row">${extra || ''}<button class="btn glass sm" data-close-stage>${icon('stop')} Close</button></div></div>`;
  }
  function wireClose(stage, ctl) { const c = $('[data-close-stage]', stage); if (c) c.onclick = () => { ctl.stop && ctl.stop(); stage.classList.add('hidden'); $$('.learn-tile').forEach((t) => t.classList.remove('on')); }; }
  function asgNote(p) { return p.assignment ? `<div class="notice" style="margin-bottom:12px">${icon('clipboard')}<div><b>Assignment: ${esc(p.assignment.title)}</b>${p.assignment.instructions ? '<br>' + esc(p.assignment.instructions) : ''}</div></div>` : ''; }

  /** Finish a session: XP, summary, assignment result (+ optional recording request). */
  function finish(App, summary, meta, p) {
    const asg = p && p.assignment;
    if (asg && App.pendingLearn === asg) App.pendingLearn = null;
    PM.Shared.sessionSummary(summary, Object.assign({ mode: 'learn', instrument: App.instrument, assignmentId: asg ? asg.id : null }, meta));
    if (asg && asg.requireRecording) setTimeout(() => PM.RecordPanel.open({ title: asg.title, assignmentId: asg.id, mode: 'learn', context: 'Your teacher asked for a recording of this exercise.' }), 400);
  }

  async function openEngine(App) {
    const engine = App.settings.source === 'midi' ? App.midiIn : App.live;
    if (engine === App.live) { App.live.latency = App.settings.latency; await App.live.start(App.settings.deviceId); }
    else await App.midiIn.start();
    return engine;
  }
  function closeEngines(App) { App.live.stop(); App.midiIn.stop(); }

  // ------------------------------------------------------------------ sequence trainer
  /**
   * Play a list of target notes in order; the coach waits for each one.
   * opts: {title, notes, octaveFree, staff (show staff), flats, onDone(summary, seconds), hint(m)}
   */
  function sequenceTrainer(box, App, opts) {
    const inst = App.instrument, I = Instruments.get(inst);
    const notes = opts.notes;
    let idx = 0, mistakes = 0, started = 0, stopped = false, unsub = null, hold = 0, armed = true, wrongCand = null, wrongSince = 0, lastWrong = null;
    const slips = [];
    const written = notes.map((m) => m + writtenOffset(inst));
    box.innerHTML = `
      <div class="seq-wrap">
        ${opts.staff ? `<div class="staff-box" id="sqStaff"></div>` : ''}
        <div class="seq-notes" id="sqNotes">${notes.map((m, i) => `<span class="sq" data-i="${i}">${esc(nameOf(m, inst, opts.flats).replace(/-?\d+$/, ''))}</span>`).join('')}</div>
        <div class="seq-now"><div class="seq-target" id="sqTarget">—</div><div class="muted small" id="sqHint"></div></div>
        <div class="row" style="justify-content:center;gap:14px"><span class="chip">Note <b id="sqI">0</b>/${notes.length}</span><span class="chip">Slips <b id="sqM">0</b></span><span class="chip">Hearing <b id="sqHeard">—</b></span></div>
        <div class="row" style="justify-content:center"><button class="btn primary" id="sqGo">${icon('mic')} Start listening</button><button class="btn glass" id="sqHear">${icon('headphones')} Hear it</button><label class="switch" style="color:#fff"><input type="checkbox" id="sqOct" ${opts.octaveFree ? 'checked' : ''}><span class="track"></span>Any octave</label></div>
        <p class="small" id="sqMsg" style="text-align:center;color:#fecaca"></p>
      </div>`;
    const draw = () => {
      $$('.sq', box).forEach((e, i) => { e.classList.toggle('done', i < idx); e.classList.toggle('now', i === idx); });
      $('#sqI', box).textContent = idx;
      $('#sqM', box).textContent = mistakes;
      const t = notes[idx];
      $('#sqTarget', box).textContent = t != null ? nameOf(t, inst, opts.flats) : '✓';
      $('#sqHint', box).textContent = t != null ? (opts.hint ? opts.hint(t) : hintFor(I, t)) : '';
      if (opts.staff) $('#sqStaff', box).innerHTML = staffSvg(written, { highlight: idx, flats: opts.flats, clef: inst === 'bass' ? 'bass' : undefined });
      const cur = $('.sq.now', box);
      if (cur && cur.scrollIntoView && started) cur.scrollIntoView({ block: 'nearest', inline: 'center' });
    };
    draw();
    let player = null;
    $('#sqHear', box).onclick = () => { if (player) player.stop(); player = playNotes(notes, { bpm: 100 }); };
    const done = () => {
      const secs = (performance.now() - started) / 1000;
      const acc = notes.length / (notes.length + mistakes);
      const npm = Math.round(notes.length / (secs / 60));
      const summary = {
        accuracy: acc, score: Math.round(notes.length * 10 * acc + Math.max(0, 120 - secs)), stars: acc >= 0.95 ? 3 : acc >= 0.8 ? 2 : acc >= 0.6 ? 1 : 0, maxCombo: 0,
        insights: [`${notes.length} notes in ${Math.round(secs)} s (${npm} notes per minute)`, mistakes ? `${mistakes} slip${mistakes > 1 ? 's' : ''}${slips.length ? ': ' + slips.slice(0, 4).join(', ') : ''}` : 'No slips — clean run!'],
        focus: mistakes > 2 ? 'Slow down and say each note name before you play it. Accuracy first, speed later.' : npm < 40 ? 'Clean! Next time aim for a steadier, faster flow — try it with the metronome.' : 'Excellent — try it in another key or add an octave.',
      };
      stop();
      opts.onDone && opts.onDone(summary, secs);
    };
    const stop = () => {
      if (stopped) return;
      stopped = true;
      if (unsub) unsub();
      closeEngines(App);
      if (player) player.stop();
    };
    $('#sqGo', box).onclick = async (e) => {
      const btn = e.currentTarget;
      if (unsub) { stop(); btn.innerHTML = `${icon('mic')} Start listening`; stopped = false; unsub = null; return; }
      try {
        const engine = await openEngine(App);
        stopped = false;
        started = performance.now();
        btn.innerHTML = `${icon('stop')} Stop`;
        $('#sqMsg', box).textContent = '';
        draw();
        unsub = engine.on((f) => {
          if (idx >= notes.length) return;
          const target = notes[idx];
          const p = f.pitch;
          if (f.onset) { armed = true; wrongCand = null; }
          if (!f.active || !p) { hold = 0; armed = true; wrongCand = null; return; }
          $('#sqHeard', box).textContent = nameOf(p.midi, inst, opts.flats);
          const octFree = $('#sqOct', box).checked;
          const ok = octFree ? (p.midi - target) % 12 === 0 : p.midi === target || (I.family === 'fretted' && Math.abs(p.midi - target) === 12 && p.confidence < 0.9);
          if (ok && armed) {
            if (!hold) hold = performance.now();
            if (performance.now() - hold > (I.mono ? 110 : 80)) {
              idx++; hold = 0; wrongCand = null;
              armed = notes[idx] == null || (notes[idx] - target) % 12 !== 0; // repeated note: wait for a new attack
              draw();
              if (idx >= notes.length) setTimeout(done, 300);
            }
            return;
          }
          hold = 0;
          // a wrong note held for a moment (not the ringing previous note) counts as one slip
          const prev = notes[idx - 1];
          if (!ok && p.midi !== prev && (prev == null || (p.midi - prev) % 12 !== 0)) {
            if (wrongCand !== p.midi) { wrongCand = p.midi; wrongSince = performance.now(); }
            else if (performance.now() - wrongSince > 280 && lastWrong !== idx + ':' + p.midi) {
              lastWrong = idx + ':' + p.midi; mistakes++;
              slips.push(`${nameOf(p.midi, inst, opts.flats)} for ${nameOf(target, inst, opts.flats)}`);
              $('#sqM', box).textContent = mistakes;
            }
          }
        });
      } catch (err) { $('#sqMsg', box).textContent = 'Could not open the input: ' + (err.message || err); }
    };
    return { stop };
  }

  function hintFor(I, m) {
    if (I.transpose) { const t = Instruments.trumpetInfo(m); return `valves ${t.valves === '0' ? 'open' : t.valves || '?'} · sounds ${DSP.midiName(m)}`; }
    if (I.strings) {
      const pos = Instruments.fretPosition(I.id, m);
      if (pos) return `${I.stringNames[pos.string]} string, ${pos.fret === 0 ? 'open' : 'fret ' + pos.fret}`;
    }
    return '';
  }

  // ------------------------------------------------------------------ activities
  const ACT = {};
  const SCALE_OPTS = (sel) => Object.entries(Learn.SCALES).map(([k, v]) => `<option value="${k}" ${k === sel ? 'selected' : ''}>${v.name}</option>`).join('');

  function noteDrill(id, stage, App, p, build, formHtml) {
    const ctl = { stop() { if (ctl.tr) ctl.tr.stop(); } };
    stage.innerHTML = head(stage, id) + asgNote(p) + `<div class="learn-form">${formHtml}<button class="btn primary sm" id="lBuild">${icon('play')} Set up</button></div><div id="lBox" style="margin-top:14px"></div>`;
    wireClose(stage, ctl);
    const go = () => {
      if (ctl.tr) ctl.tr.stop();
      const spec = build();
      const box = $('#lBox', stage);
      box.innerHTML = (spec.staff ? `<div class="staff-box" style="margin-bottom:12px">${staffSvg(spec.notes.map((m) => m + writtenOffset(App.instrument)), { flats: spec.flats, clef: App.instrument === 'bass' ? 'bass' : undefined })}</div>` : '') + '<div id="lPa"></div>';
      ctl.tr = PM.PlayAlong.mount($('#lPa', box), App, { id: 'drill-' + id + '-' + spec.title.replace(/\W+/g, '-').toLowerCase(), title: spec.title, notes: spec.notes, beats: spec.notes.map(() => spec.each || 1), bpm: spec.bpm || 72, level: spec.level || 2, cat: ART[id].name, tip: spec.tip || '', octaveFree: spec.octaveFree },
        { assignment: p.assignment, onSession: (summary, secs) => finish(App, summary, { seconds: secs, title: spec.title }, p), onTake: (t) => { if (p.assignment && App.pendingLearn === p.assignment && t.stats.accuracy >= 0.7) App.pendingLearn = null; } });
    };
    $('#lBuild', stage).onclick = go;
    go();
    return ctl;
  }

  ACT.path = (stage, App, p) => {
    const inst = App.instrument, I = Instruments.get(inst);
    const list = PM.Curriculum.forInstrument(inst);
    const ctl = { stop() { if (ctl.tr) ctl.tr.stop(); } };
    let level = 0;
    const prog = () => App.game.state.path || {};
    const nextEx = () => list.find((e) => !(prog()[e.id] && prog()[e.id].stars >= 1)) || list[list.length - 1];
    const draw = (openId) => {
      const pr = prog();
      const passed = list.filter((e) => pr[e.id] && pr[e.id].stars >= 1).length;
      const shown = level ? list.filter((e) => e.level === level) : list;
      stage.innerHTML = head(stage, 'path', `<span class="chip">${passed}/${list.length} passed</span>`) + asgNote(p) + `
        <p class="small" style="color:rgba(255,255,255,.8)">${list.length} exercises for ${esc(I.label.toLowerCase())}, from Level 1 to Level 5. Pass an exercise with ★ (70%+ right notes) to unlock your progress; aim for ★★★.</p>
        <div class="path-bar"><i style="width:${Math.round((passed / list.length) * 100)}%"></i></div>
        <div class="seg" id="pLvl" style="margin:12px 0">${['All', ...PM.Curriculum.LEVELS.slice(1)].map((n, i) => `<button data-l="${i}" class="${i === level ? 'on' : ''}">${i ? i + ' · ' + n : n}</button>`).join('')}</div>
        <div class="path-list">${shown.map((e) => { const r = pr[e.id]; const st = r ? r.stars : 0; return `<button class="path-item ${openId === e.id ? 'on' : ''} ${st ? 'done' : ''} ${nextEx() === e ? 'next' : ''}" data-e="${e.id}">
          <span class="pn">${e.n}</span><span class="pi"><b>${esc(e.title)}</b><span class="small">L${e.level} · ${esc(e.cat)}${e.kind === 'chords' ? ' · chords' : ` · ${e.notes.length} notes`} · ${e.bpm} BPM</span></span>
          <span class="ps">${st ? '★'.repeat(st) + '☆'.repeat(3 - st) : nextEx() === e ? 'next' : ''}</span></button>`; }).join('')}</div>
        <div id="pBox" style="margin-top:16px"></div>`;
      wireClose(stage, ctl);
      $$('#pLvl button', stage).forEach((b) => (b.onclick = () => { level = +b.dataset.l; draw(openId); }));
      $$('[data-e]', stage).forEach((b) => (b.onclick = () => draw(b.dataset.e)));
      if (openId) {
        const ex = list.find((e) => e.id === openId);
        if (ctl.tr) ctl.tr.stop();
        const box = $('#pBox', stage);
        box.innerHTML = '<div id="pPa"></div><div class="row" style="justify-content:space-between;margin-top:12px"><button class="btn glass sm" id="pPrev">← Previous</button><button class="btn glass sm" id="pNext">Next exercise →</button></div>';
        ctl.tr = PM.PlayAlong.mount($('#pPa', box), App, ex, { path: true, assignment: p.assignment, onSession: (summary, secs) => finish(App, summary, { seconds: secs, title: ex.title }, p), onProgress: () => { const el = $(`[data-e="${ex.id}"] .ps`, stage); const r = prog()[ex.id]; if (el && r && r.stars) el.textContent = '★'.repeat(r.stars) + '☆'.repeat(3 - r.stars); } });
        const idx = list.indexOf(ex);
        $('#pPrev', box).disabled = idx <= 0;
        $('#pNext', box).disabled = idx >= list.length - 1;
        $('#pPrev', box).onclick = () => draw(list[idx - 1].id);
        $('#pNext', box).onclick = () => draw(list[idx + 1].id);
        setTimeout(() => { if (box && box.isConnected) box.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 60);
      }
    };
    draw(p.exercise || null);
    return ctl;
  };

  ACT.scales = (stage, App, p) => noteDrill('scales', stage, App, p, () => {
    const tonic = +$('#lKey', stage).value, sc = $('#lScale', stage).value, oct = +$('#lOct', stage).value, dir = $('#lDir', stage).value;
    const notes = Learn.scale({ tonic, scale: sc, octaves: oct, direction: dir, instrument: App.instrument });
    return { notes, flats: flatsFor(tonic) || /minor|harmonic|melodic|dorian|minpent|blues/.test(sc) && flatsFor(tonic + 3), octaveFree: false, title: `${KEYS[tonic].name} ${Learn.SCALES[sc].name} scale` };
  }, `<label class="field">Key${keySel('lKey', p.tonic != null ? +p.tonic : 0)}</label><label class="field">Scale<select id="lScale">${SCALE_OPTS(p.scale || 'major')}</select></label>
     <label class="field">Octaves<select id="lOct"><option value="1">1</option><option value="2" ${p.octaves == 2 ? 'selected' : ''}>2</option></select></label>
     <label class="field">Direction<select id="lDir"><option value="updown">Up & down</option><option value="up">Up only</option></select></label>`);

  ACT.arpeggios = (stage, App, p) => noteDrill('arpeggios', stage, App, p, () => {
    const tonic = +$('#lKey', stage).value, type = $('#lType', stage).value, oct = +$('#lOct', stage).value;
    const notes = Learn.arpeggio({ tonic, type, octaves: oct, instrument: App.instrument });
    return { notes, flats: flatsFor(tonic), title: `${KEYS[tonic].name}${type} arpeggio` };
  }, `<label class="field">Root${keySel('lKey', p.tonic != null ? +p.tonic : 0)}</label><label class="field">Chord<select id="lType">${[['', 'Major'], ['m', 'Minor'], ['7', 'Dominant 7th'], ['maj7', 'Major 7th'], ['m7', 'Minor 7th'], ['dim', 'Diminished'], ['aug', 'Augmented'], ['sus4', 'Sus 4']].map(([k, v]) => `<option value="${k}" ${k === (p.type || '') ? 'selected' : ''}>${v}</option>`).join('')}</select></label>
     <label class="field">Octaves<select id="lOct"><option value="1">1</option><option value="2" ${p.octaves == 2 ? 'selected' : ''}>2</option></select></label>`);

  ACT.technique = (stage, App, p) => {
    const ctl = { stop() { if (ctl.tr) ctl.tr.stop(); } };
    const draw = (tonic, exId) => {
      const list = Learn.exercises(App.instrument, tonic);
      stage.innerHTML = head(stage, 'technique') + asgNote(p) + `<div class="learn-form"><label class="field">Key${keySel('lKey', tonic)}</label></div>
        <div class="ex-list">${list.map((e) => `<button class="ex-item ${e.id === exId ? 'on' : ''}" data-ex="${e.id}"><b>${esc(e.name)}</b><span class="small">${esc(e.desc)}</span></button>`).join('')}</div><div id="lBox" style="margin-top:14px"></div>`;
      wireClose(stage, ctl);
      $('#lKey', stage).onchange = (ev) => draw(+ev.target.value, exId);
      $$('[data-ex]', stage).forEach((b) => (b.onclick = () => draw(tonic, b.dataset.ex)));
      const ex = list.find((e) => e.id === exId) || list[0];
      $$('[data-ex]', stage).forEach((b) => b.classList.toggle('on', b.dataset.ex === ex.id));
      if (ctl.tr) ctl.tr.stop();
      ctl.tr = PM.PlayAlong.mount($('#lBox', stage), App, { id: 'tech-' + App.instrument + '-' + ex.id + '-' + tonic, title: ex.name + ' · ' + KEYS[tonic].name, notes: ex.notes, beats: ex.notes.map(() => 1), bpm: 72, level: 2, cat: 'Technique', tip: ex.desc },
        { assignment: p.assignment, onSession: (summary, secs) => finish(App, summary, { seconds: secs, title: ex.name + ' · ' + KEYS[tonic].name }, p) });
    };
    draw(p.tonic != null ? +p.tonic : 0, p.exercise);
    return ctl;
  };

  ACT.sight = (stage, App, p) => noteDrill('sight', stage, App, p, () => {
    const level = +$('#lLevel', stage).value;
    const tonic = +$('#lKey', stage).value;
    const notes = Learn.sightReading({ tonic, scale: 'major', instrument: App.instrument, level, length: level === 1 ? 6 : 8 });
    return { notes, staff: true, flats: flatsFor(tonic), title: `Sight-reading level ${level} in ${KEYS[tonic].name}` };
  }, `<label class="field">Level<select id="lLevel"><option value="1">1 · steps</option><option value="2" ${p.level == 2 ? 'selected' : ''}>2 · skips</option><option value="3" ${p.level == 3 ? 'selected' : ''}>3 · leaps & accidentals</option></select></label>
     <label class="field">Key${keySel('lKey', p.tonic != null ? +p.tonic : 0)}</label><span class="muted small" style="align-self:center">“Set up” writes a new melody</span>`);

  ACT.notes = (stage, App, p) => {
    const inst = App.instrument;
    let clefMode = inst === 'bass' ? 'bass' : inst === 'piano' ? 'both' : 'treble';
    let round = 0, correct = 0, target = null, t0 = performance.now(), stopped = false, combo = 0, best = 0;
    const ROUNDS = 15;
    const ctl = { stop() { stopped = true; } };
    stage.innerHTML = head(stage, 'notes') + asgNote(p) + `<div class="learn-form"><label class="field">Staff<select id="lClef"><option value="treble">Treble clef</option><option value="bass">Bass clef</option><option value="both">Both</option></select></label></div>
      <div class="staff-box big" id="nStaff"></div><div class="letter-row" id="nBtns">${Learn.LETTERS.map((l) => `<button class="btn glass" data-l="${l}">${l}</button>`).join('')}</div>
      <div class="row" style="justify-content:center"><span class="chip">Round <b id="nR">0</b>/${ROUNDS}</span><span class="chip">Correct <b id="nC">0</b></span></div><div class="feedback-pop" id="nFb"></div>`;
    wireClose(stage, ctl);
    $('#lClef', stage).value = clefMode;
    $('#lClef', stage).onchange = (e) => { clefMode = e.target.value; next(); };
    const next = () => {
      if (round >= ROUNDS) {
        const acc = correct / ROUNDS;
        stopped = true;
        finish(App, { accuracy: acc, score: correct * 20 + best * 5, stars: acc >= 0.93 ? 3 : acc >= 0.8 ? 2 : acc >= 0.6 ? 1 : 0, maxCombo: best, insights: [`${correct}/${ROUNDS} note names right`, `Best streak ${best}`], focus: acc < 0.8 ? 'Learn the lines (E G B D F / G B D F A) and spaces (F A C E / A C E G) by heart.' : 'Great reading — try the other clef!' }, { seconds: (performance.now() - t0) / 1000, title: 'Note names' }, p);
        return;
      }
      round++;
      const clef = clefMode === 'both' ? (Math.random() < 0.5 ? 'treble' : 'bass') : clefMode;
      const pool = [];
      for (let m = clef === 'treble' ? 57 : 36; m <= (clef === 'treble' ? 84 : 62); m++) if (![1, 3, 6, 8, 10].includes(m % 12)) pool.push(m);
      target = { m: pool[(Math.random() * pool.length) | 0], clef };
      $('#nStaff', stage).innerHTML = staffSvg([target.m], { clef, highlight: 0 });
      $('#nR', stage).textContent = round;
    };
    $$('[data-l]', stage).forEach((b) => (b.onclick = () => {
      if (stopped || !target) return;
      const right = Theory.spell(target.m)[0];
      const ok = b.dataset.l === right;
      if (ok) { correct++; combo++; best = Math.max(best, combo); } else combo = 0;
      $('#nC', stage).textContent = correct;
      const fb = $('#nFb', stage);
      fb.textContent = ok ? `✓ ${right}${Math.floor(target.m / 12) - 1}` : `✗ It was ${right}${Math.floor(target.m / 12) - 1}`;
      fb.className = 'feedback-pop ' + (ok ? 'perfect' : 'miss');
      setTimeout(() => !stopped && next(), ok ? 450 : 1100);
    }));
    next();
    return ctl;
  };

  ACT.intervals = (stage, App, p) => {
    let level = p.level || 1, round = 0, correct = 0, target = null, base = 60, stopped = false, mode = 'melodic';
    const ROUNDS = 12, t0 = performance.now();
    const ctl = { stop() { stopped = true; } };
    const pool = () => Learn.INTERVALS.filter((i) => (level === 1 ? [2, 4, 5, 7, 12].includes(i.st) : level === 2 ? i.st <= 12 && i.st !== 6 : true));
    const draw = () => {
      stage.innerHTML = head(stage, 'intervals') + asgNote(p) + `<div class="learn-form"><label class="field">Level<select id="iLvl"><option value="1">Easy: 2nds, 3rds, 4th, 5th, octave</option><option value="2">All intervals</option><option value="3">All + tritone</option></select></label>
        <label class="field">Play as<select id="iMode"><option value="melodic">One after another</option><option value="harmonic">Together</option><option value="down">Descending</option></select></label></div>
        <div class="seq-now"><div class="seq-target" id="iQ">?</div><div class="muted small" id="iSong">Listen and pick the interval</div></div>
        <div class="row" style="justify-content:center"><button class="btn primary" id="iPlay">${icon('headphones')} Play again</button><span class="chip">Round <b id="iR">0</b>/${ROUNDS}</span><span class="chip">Correct <b id="iC">0</b></span></div>
        <div class="letter-row wide" id="iBtns">${pool().map((i) => `<button class="btn glass" data-st="${i.st}">${i.name}</button>`).join('')}</div><div class="feedback-pop" id="iFb"></div>`;
      wireClose(stage, ctl);
      $('#iLvl', stage).value = level; $('#iMode', stage).value = mode;
      $('#iLvl', stage).onchange = (e) => { level = +e.target.value; draw(); next(true); };
      $('#iMode', stage).onchange = (e) => { mode = e.target.value; play(); };
      $('#iPlay', stage).onclick = play;
      $$('[data-st]', stage).forEach((b) => (b.onclick = () => answer(+b.dataset.st)));
    };
    const play = () => {
      if (!target) return;
      const a = base, b = mode === 'down' ? base - target.st : base + target.st;
      if (mode === 'harmonic') playNotes([{ midi: a, start: 0, dur: 1.4 }, { midi: b, start: 0, dur: 1.4 }], { voice: 'piano' });
      else playNotes([a, b], { bpm: 80, voice: 'piano' });
    };
    const next = (same) => {
      if (!same && round >= ROUNDS) {
        stopped = true;
        const acc = correct / ROUNDS;
        finish(App, { accuracy: acc, score: correct * 25, stars: acc >= 0.9 ? 3 : acc >= 0.75 ? 2 : acc >= 0.5 ? 1 : 0, maxCombo: 0, insights: [`${correct}/${ROUNDS} intervals recognised`], focus: acc < 0.75 ? 'Sing the interval back before you answer — and use the song reminders.' : 'Strong ears! Try the next level or “together” mode.' }, { seconds: (performance.now() - t0) / 1000, title: 'Interval ear training' }, p);
        return;
      }
      if (!same) round++;
      const list = pool();
      target = list[(Math.random() * list.length) | 0];
      base = 55 + ((Math.random() * 12) | 0);
      $('#iR', stage).textContent = round;
      $('#iQ', stage).textContent = '?';
      $('#iSong', stage).textContent = 'Listen and pick the interval';
      play();
    };
    const answer = (st) => {
      if (stopped || !target) return;
      const ok = st === target.st;
      if (ok) correct++;
      $('#iC', stage).textContent = correct;
      $('#iQ', stage).textContent = target.name;
      $('#iSong', stage).textContent = `Think of: ${target.song}`;
      const fb = $('#iFb', stage);
      fb.textContent = ok ? '✓ Correct!' : `✗ It was a ${target.name}`;
      fb.className = 'feedback-pop ' + (ok ? 'perfect' : 'miss');
      const t = target; target = null;
      setTimeout(() => { if (!stopped) { target = t; next(); } }, ok ? 900 : 1800);
    };
    draw();
    next();
    return ctl;
  };

  ACT.chords = (stage, App, p) => {
    const inst = App.instrument, I = Instruments.get(inst);
    let tonic = p.tonic != null ? +p.tonic : 7, minor = false, sel = [];
    const ctl = { stop() { if (ctl.run) ctl.run(); if (ctl.tr) ctl.tr.stop(); closeEngines(App); } };
    const draw = () => {
      const pal = Learn.palette(tonic, minor);
      stage.innerHTML = head(stage, 'chords') + asgNote(p) + `<div class="learn-form"><label class="field">Key${keySel('cKey', tonic)}</label><label class="field">Mode<select id="cMode"><option value="0">Major</option><option value="1" ${minor ? 'selected' : ''}>Minor</option></select></label></div>
        <p class="small" style="color:rgba(255,255,255,.75)">Tap two chords for the ${I.chordal ? 'one-minute changes drill' : 'chord-tones drill'}. Tap a chord to hear it.</p>
        <div class="chord-pal">${pal.map((c, i) => `<button class="pal ${sel.includes(i) ? 'on' : ''}" data-c="${i}"><span class="roman">${c.roman}</span>${I.strings && I.chordal ? UI.chordDiagram(c.name) : `<b>${c.name}</b><span class="small">${Theory.chordPcs(c.root, c.type).map((x) => Theory.spell(x + (inst === 'trumpet' ? 2 : 0), flatsFor(tonic))).join(' ')}</span>`}</button>`).join('')}</div>
        <div class="row" style="justify-content:center;margin-top:12px"><button class="btn primary" id="cGo" ${sel.length === 2 ? '' : 'disabled'}>${icon('play')} ${I.chordal ? 'Start one-minute changes' : 'Start chord-tones drill'}</button></div>
        <div id="cBox" style="margin-top:14px"></div>`;
      wireClose(stage, ctl);
      $('#cKey', stage).onchange = (e) => { tonic = +e.target.value; sel = []; draw(); };
      $('#cMode', stage).onchange = (e) => { minor = e.target.value === '1'; sel = []; draw(); };
      $$('[data-c]', stage).forEach((b) => (b.onclick = () => {
        const i = +b.dataset.c, c = pal[i];
        let r = 48 + c.root; if (r > 55) r -= 12;
        playNotes(Theory.TYPE_BY_ID[c.type].iv.map((iv) => ({ midi: r + 12 + iv, start: 0, dur: 1.2 })).concat([{ midi: r, start: 0, dur: 1.2 }]), { voice: 'piano' });
        sel = sel.includes(i) ? sel.filter((x) => x !== i) : sel.concat(i).slice(-2);
        $$('[data-c]', stage).forEach((x) => x.classList.toggle('on', sel.includes(+x.dataset.c)));
        $('#cGo', stage).disabled = sel.length !== 2;
      }));
      $('#cGo', stage).onclick = () => (I.chordal ? changes(pal[sel[0]], pal[sel[1]]) : chordTones(pal[sel[0]], pal[sel[1]]));
    };
    const changes = async (A, B) => {
      const box = $('#cBox', stage);
      const targets = [A, B].map((c) => Object.assign({}, Theory.parseChordName(c.name), { name: c.name, pcs: Theory.chordPcs(c.root, c.type) }));
      let count = 0, cur = 0, holdStart = 0, left = 60, timer = 0, unsub = null;
      box.innerHTML = `<div class="changes"><div class="chg ${'on'}" id="chA">${esc(A.name)}</div><div class="chg-arrow">⇄</div><div class="chg" id="chB">${esc(B.name)}</div></div>
        <div class="row" style="justify-content:center"><span class="chip">Changes <b id="chN">0</b></span><span class="chip">Time <b id="chT">60</b>s</span><span class="chip">Hearing <b id="chH">—</b></span><span class="chip">Best <b>${App.game.state.highScores['changes:' + A.name + '-' + B.name] || 0}</b></span></div>
        <p class="small" style="text-align:center;color:rgba(255,255,255,.75)">Switch between the two chords as many times as you can in one minute. Each clean chord counts.</p>`;
      try {
        const engine = await openEngine(App);
        timer = setInterval(() => {
          left--; $('#chT', box).textContent = left;
          if (left <= 0) end();
        }, 1000);
        const end = () => {
          clearInterval(timer); if (unsub) unsub(); closeEngines(App); ctl.run = null;
          const k = 'changes:' + A.name + '-' + B.name;
          App.game.state.highScores[k] = Math.max(App.game.state.highScores[k] || 0, count);
          finish(App, { accuracy: null, score: count * 10, stars: count >= 40 ? 3 : count >= 25 ? 2 : count >= 12 ? 1 : 0, maxCombo: count, chordsNailed: count, insights: [`${count} clean changes between ${A.name} and ${B.name} in one minute`], focus: count < 25 ? 'Keep shared fingers anchored and look ahead to the next shape. Aim for +5 next time.' : 'Fast hands! Pick a harder pair, or play the changes in time with the metronome.' }, { seconds: 60, title: `One-minute changes ${A.name}–${B.name}` }, p);
        };
        ctl.run = () => { clearInterval(timer); if (unsub) unsub(); };
        unsub = engine.on((f) => {
          if (!f.active || !f.chroma) { holdStart = 0; return; }
          $('#chH', box).textContent = f.chord ? f.chord.name : '…';
          const cmp = PM.CoachUtil.compareChord(targets[cur], f.chord, f.chroma);
          if (cmp.result === 'hit') {
            if (!holdStart) holdStart = performance.now();
            if (performance.now() - holdStart > 250) {
              count++; cur = 1 - cur; holdStart = 0;
              $('#chN', box).textContent = count;
              $('#chA', box).classList.toggle('on', cur === 0); $('#chB', box).classList.toggle('on', cur === 1);
            }
          } else holdStart = 0;
        });
      } catch (e) { box.innerHTML = `<p>Couldn't open the input: ${esc(e.message || e)}</p>`; }
    };
    const chordTones = (A, B) => {
      const mk = (c) => Learn.arpeggio({ tonic: c.root, type: c.type, instrument: inst, direction: 'up' }).slice(0, Theory.TYPE_BY_ID[c.type].iv.length);
      const notes = [...mk(A), ...mk(B), ...mk(A), ...mk(B)];
      if (ctl.tr) ctl.tr.stop();
      ctl.tr = sequenceTrainer($('#cBox', stage), App, { notes, flats: flatsFor(tonic), title: `Chord tones ${A.name} → ${B.name}`, onDone: (summary, secs) => finish(App, summary, { seconds: secs, title: `Chord tones ${A.name}–${B.name}` }, p) });
    };
    draw();
    return ctl;
  };

  ACT.callresp = (stage, App, p) => {
    const inst = App.instrument;
    let tonic = p.tonic != null ? +p.tonic : 0, mode = p.mode || 'echo', unsub = null, rounds = 0, score = 0, total = 0, t0 = performance.now();
    const ROUNDS = 6;
    const ctl = { stop() { if (unsub) unsub(); unsub = null; closeEngines(App); } };
    const draw = () => {
      stage.innerHTML = head(stage, 'callresp') + asgNote(p) + `<div class="learn-form"><label class="field">Key${keySel('rKey', tonic)}</label><label class="field">Mode<select id="rMode"><option value="echo">Echo — copy the phrase</option><option value="answer">Answer — make up a reply</option></select></label></div>
        <div class="seq-now"><div class="seq-target" id="rBig">Ready?</div><div class="muted small" id="rTxt">${mode === 'echo' ? 'Cadenza plays a short phrase in the pentatonic scale — play it back.' : 'Cadenza plays a question — answer with your own phrase and end on the home note.'}</div></div>
        <div class="seq-notes" id="rNotes"></div>
        <div class="row" style="justify-content:center"><button class="btn primary" id="rGo">${icon('play')} ${rounds ? 'Next phrase' : 'Start'}</button><button class="btn glass" id="rAgain">${icon('headphones')} Hear again</button><span class="chip">Round <b>${rounds}</b>/${ROUNDS}</span></div>
        <p class="small" id="rPrompt" style="text-align:center;color:rgba(255,255,255,.75)"></p>`;
      wireClose(stage, ctl);
      $('#rKey', stage).onchange = (e) => { tonic = +e.target.value; };
      $('#rMode', stage).value = mode;
      $('#rMode', stage).onchange = (e) => { mode = e.target.value; draw(); };
      $('#rGo', stage).onclick = round;
      $('#rAgain', stage).onclick = () => phrase && playPhrase();
    };
    let phrase = null;
    const playPhrase = () => {
      let t = 0;
      const list = phrase.map((n) => { const o = { midi: n.midi, start: t * 0.6, dur: n.beats * 0.6 * 0.9 }; t += n.beats; return o; });
      return playNotes(list, {}).duration;
    };
    const round = async () => {
      if (unsub) { unsub(); unsub = null; }
      rounds++;
      phrase = Learn.motif({ tonic, scale: mode === 'echo' ? 'majpent' : 'majpent', instrument: inst, length: mode === 'echo' ? 4 : 4 });
      draw();
      $('#rPrompt', stage).textContent = mode === 'answer' ? '💡 ' + Learn.PROMPTS[(Math.random() * Learn.PROMPTS.length) | 0] : '';
      $('#rBig', stage).textContent = '🔊 Listen…';
      const dur = playPhrase();
      let engine;
      try { engine = await openEngine(App); } catch (e) { $('#rTxt', stage).textContent = 'Could not open the input: ' + (e.message || e); return; }
      await new Promise((r) => setTimeout(r, dur * 1000 + 300));
      $('#rBig', stage).textContent = mode === 'echo' ? '🎵 Your turn — echo it' : '🎵 Your turn — answer';
      const played = [];
      let last = null, quietSince = performance.now(), heardAny = false, holdM = null, holdT = 0;
      const notesEl = $('#rNotes', stage);
      const target = phrase.map((n) => n.midi);
      const endRound = () => {
        if (unsub) { unsub(); unsub = null; }
        closeEngines(App);
        let pts;
        if (mode === 'echo') {
          let hit = 0;
          target.forEach((m, i) => { if (played[i] != null && (played[i] - m) % 12 === 0) hit++; });
          pts = Math.round((hit / target.length) * 100);
          $('#rTxt', stage).innerHTML = `You played ${played.map((m) => nameOf(m, inst, flatsFor(tonic))).join(' ') || 'nothing'} — the phrase was <b>${target.map((m) => nameOf(m, inst, flatsFor(tonic))).join(' ')}</b>. ${pts === 100 ? 'Perfect echo! 🎯' : pts >= 50 ? 'Close — listen again and try the next one.' : 'Tip: sing it first, then find the first note.'}`;
        } else {
          const g = Learn.gradeAnswer(played, tonic, 'majpent');
          pts = g.score;
          $('#rTxt', stage).textContent = `${g.notes} notes, ${g.inScale} in the scale${g.endsHome ? ', ended on the home note 🏠' : ' — try ending on ' + Theory.spell(tonic + (inst === 'trumpet' ? 2 : 0))}. ${g.variety >= 4 ? 'Nice variety!' : 'Try using more different notes.'}`;
        }
        score += pts; total += 100;
        $('#rBig', stage).textContent = pts + ' pts';
        if (rounds >= ROUNDS) {
          const acc = total ? score / total : 0;
          finish(App, { accuracy: acc, score, stars: acc >= 0.85 ? 3 : acc >= 0.65 ? 2 : acc >= 0.4 ? 1 : 0, maxCombo: 0, insights: [`${ROUNDS} ${mode === 'echo' ? 'phrases echoed' : 'answers improvised'} — average ${Math.round(acc * 100)}%`], focus: mode === 'echo' ? 'Hum each phrase before playing it back — your ears lead your fingers.' : 'Repeat a rhythm from the question in your answer, then change the ending.' }, { seconds: (performance.now() - t0) / 1000, title: mode === 'echo' ? 'Call & response: echo' : 'Call & response: answers' }, p);
          rounds = 0; score = 0; total = 0;
        }
      };
      unsub = engine.on((f) => {
        const now = performance.now();
        if (f.active && f.pitch) {
          quietSince = now;
          if (holdM !== f.pitch.midi) { holdM = f.pitch.midi; holdT = now; }
          if (now - holdT > 90 && (f.pitch.midi !== last || f.onset)) {
            played.push(f.pitch.midi); last = f.pitch.midi; heardAny = true;
            notesEl.innerHTML = played.map((m) => `<span class="sq done">${nameOf(m, inst, flatsFor(tonic)).replace(/-?\d+$/, '')}</span>`).join('');
            if (mode === 'echo' && played.length >= target.length) setTimeout(endRound, 250);
          }
        } else { last = null; holdM = null; }
        if (heardAny && now - quietSince > 1800) endRound();
        if (!heardAny && now - quietSince > 9000) endRound();
        if (mode === 'answer' && played.length >= 10) endRound();
      });
    };
    draw();
    return ctl;
  };

  ACT.builder = (stage, App, p) => {
    let tonic = p.tonic != null ? +p.tonic : 7, minor = false, bars = [], bpm = 90, meter = 4;
    const ctl = { stop() {} };
    const draw = () => {
      const pal = Learn.palette(tonic, minor);
      stage.innerHTML = head(stage, 'builder') + asgNote(p) + `<div class="learn-form"><label class="field">Key${keySel('bKey', tonic)}</label><label class="field">Mode<select id="bMode"><option value="0">Major</option><option value="1" ${minor ? 'selected' : ''}>Minor</option></select></label>
        <label class="field">Meter<select id="bMeter"><option value="4">4/4</option><option value="3" ${meter === 3 ? 'selected' : ''}>3/4 (waltz)</option></select></label><label class="field">BPM<input type="number" id="bBpm" min="50" max="180" value="${bpm}" style="width:80px"></label></div>
        <p class="small" style="color:rgba(255,255,255,.75)">Tap chords to add bars (up to 16). Classic shapes to try: I–V–vi–IV, I–IV–V–IV, vi–IV–I–V, ii–V–I.</p>
        <div class="chord-pal small-pal">${pal.map((c, i) => `<button class="pal" data-c="${i}"><span class="roman">${c.roman}</span><b>${c.name}</b></button>`).join('')}</div>
        <div class="bars-row" id="bBars">${bars.length ? bars.map((c, i) => `<span class="bar-cell"><small>${i + 1}</small>${esc(c.name)}</span>`).join('') : '<span class="muted small">Your progression appears here</span>'}</div>
        <div class="row" style="justify-content:center;margin-top:10px"><button class="btn glass sm" id="bUndo">${icon('back')} Undo</button><button class="btn glass sm" id="bClear">Clear</button><button class="btn glass sm" id="bIdea">${icon('sparkle')} Surprise me</button>
          <button class="btn primary" id="bJam" ${bars.length ? '' : 'disabled'}>${icon('improv')} Jam over it in the Studio</button><button class="btn glass sm" id="bSave" ${bars.length ? '' : 'disabled'}>${icon('library')} Save as song</button></div>
        <p class="small" id="bMsg" style="text-align:center;color:rgba(255,255,255,.8);margin-top:8px"></p>`;
      wireClose(stage, ctl);
      $('#bKey', stage).onchange = (e) => { const d = +e.target.value - tonic; tonic = +e.target.value; bars = bars.map((c) => Object.assign({}, c, { root: (c.root + d + 12) % 12, name: Theory.spell(c.root + d, flatsFor(tonic)) + c.type })); draw(); };
      $('#bMode', stage).onchange = (e) => { minor = e.target.value === '1'; draw(); };
      $('#bMeter', stage).onchange = (e) => { meter = +e.target.value; };
      $('#bBpm', stage).onchange = (e) => { bpm = Math.max(50, Math.min(180, +e.target.value || 90)); };
      $$('[data-c]', stage).forEach((b) => (b.onclick = () => {
        const c = pal[+b.dataset.c];
        let r = 48 + c.root; if (r > 55) r -= 12;
        playNotes(Theory.TYPE_BY_ID[c.type].iv.map((iv) => ({ midi: r + 12 + iv, start: 0, dur: 0.9 })), { voice: 'piano' });
        if (bars.length < 16) bars.push(c);
        draw();
      }));
      $('#bUndo', stage).onclick = () => { bars.pop(); draw(); };
      $('#bClear', stage).onclick = () => { bars = []; draw(); };
      $('#bIdea', stage).onclick = () => {
        const ideas = minor ? [[0, 6, 5, 6], [0, 3, 4, 0], [0, 5, 2, 4]] : [[0, 4, 5, 3], [0, 3, 4, 3], [5, 3, 0, 4], [1, 4, 0, 0], [0, 5, 3, 4]];
        bars = ideas[(Math.random() * ideas.length) | 0].map((i) => pal[i]);
        draw();
        $('#bMsg', stage).textContent = '💡 ' + Learn.PROMPTS[(Math.random() * Learn.PROMPTS.length) | 0];
      };
      $('#bJam', stage).onclick = async () => {
        $('#bMsg', stage).textContent = 'Creating your band…';
        try {
          const g = PM.Backing.generateChart({ bars: bars.map((c) => [{ root: c.root, type: c.type, beats: meter }]), beatsPerBar: meter, bpm, exclude: App.instrument, repeats: Math.max(2, Math.ceil(32 / bars.length)), tonic, minor, title: 'My progression' });
          const buf = PM.Midi.writeMidi(g.notes, { bpm, key: g.key, num: meter });
          App.settings.studioMode = 'improv'; App.saveSettings();
          await App.loadFile(new File([buf], `My progression — ${bars.map((c) => c.name).join(' ')}.mid`, { type: 'audio/midi' }), null, { backing: true });
          App.game.addXp(15, 'creative');
          App.go('studio');
        } catch (e) { $('#bMsg', stage).textContent = e.message; }
      };
      $('#bSave', stage).onclick = () => {
        const list = (() => { try { return JSON.parse(localStorage.getItem('cadenza.localSongs.v1')) || []; } catch (e) { return []; } })();
        const id = 'my-' + Date.now().toString(36);
        const chart = `{start_of_verse: My progression}\n${bars.map((c) => `[${c.name}]`).reduce((rows, c, i) => { const r = Math.floor(i / 4); rows[r] = (rows[r] || '') + c + ' '; return rows; }, []).join('\n')}\n{end_of_verse}`;
        list.push({ id, createdAt: Date.now(), title: 'My progression in ' + Theory.spell(tonic, flatsFor(tonic)) + (minor ? 'm' : ''), author: 'Me', language: 'English', key: Theory.spell(tonic, flatsFor(tonic)) + (minor ? 'm' : ''), timeSig: meter === 3 ? '3/4' : '4/4', bpm, chart, bars: bars.map((c) => c.name).join(' | '), notes: 'Made with the progression builder. Add your own melody or lyrics!', tags: ['my progression'], attachments: [] });
        try { localStorage.setItem('cadenza.localSongs.v1', JSON.stringify(list)); } catch (e) { /* ignore */ }
        UI.toast('Saved to My songs', { icon: '🎵' });
        App.go('songs?id=' + id);
      };
    };
    draw();
    return ctl;
  };

  PM.LearnView = { ACTIVITIES, playNotes, staffSvg, sequenceTrainer, ACT };
})(typeof self !== 'undefined' ? self : globalThis);
