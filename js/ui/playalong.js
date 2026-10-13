/* Overture — play-along trainer with live feedback and playback revisions.
 * Count-in + click, a scrolling note lane, every note judged for pitch and timing
 * (hit / early / late / wrong / missed), each take recorded so the student can play it
 * back, hear it against the reference, compare takes and send the best one to the teacher.
 * Cadi (the coach) comments through App.emit('practice', …). */
(function (root) {
  'use strict';
  const PM = root.PM;
  const { UI, Theory, DSP } = PM;
  const { icon, esc, $, $$ } = UI;
  const META_KEY = 'cadenza.takes.v1';
  const loadMeta = () => { try { return JSON.parse(localStorage.getItem(META_KEY)) || {}; } catch (e) { return {}; } };
  const saveMeta = (m) => { try { localStorage.setItem(META_KEY, JSON.stringify(m)); } catch (e) { /* ignore */ } };
  const COLORS = { hit: '#10b981', early: '#f59e0b', late: '#f59e0b', wrong: '#f43f5e', miss: '#9ca3af' };

  function nameOf(m, inst) { const w = m + (inst === 'trumpet' ? 2 : 0); return Theory.spell(w, false) + (Math.floor(w / 12) - 1); }
  const pcName = (m, inst) => Theory.spell(m + (inst === 'trumpet' ? 2 : 0));

  /** Schedule instrument notes at absolute AudioContext times. Returns a stop function. */
  function synth(notes, voice, gainVal) {
    const v = PM.Sound.voiceFor(voice), gain = (gainVal || 0.25) / 0.25, strum = v === 'guitar' || v === 'electric' ? 0.014 : 0;
    const ctx = PM.Audio.getCtx(), out = ctx.createGain(); out.gain.value = gain; out.connect(PM.Sound.transient());
    const stops = [];
    for (const n of notes) {
      const dur = Math.max(0.08, n.dur * 0.92);
      if (n.chord) [n.midi].concat(n.chord).forEach((m, k) => stops.push(PM.Sound.note(v, m, n.time + k * strum, dur, { vel: k ? 0.6 : 0.68, dest: out })));
      else stops.push(PM.Sound.note(v, n.midi, n.time, dur, { vel: 0.78, dest: out }));
    }
    return () => { stops.forEach((f) => f()); setTimeout(() => { try { out.disconnect(); } catch (e) { /* ignore */ } }, 600); };
  }
  function clicks(times, accents) {
    const ctx = PM.Audio.getCtx();
    const out = ctx.createGain(); out.gain.value = 0.9; out.connect(ctx.destination);
    times.forEach((t, i) => PM.Sound.drum(accents[i] ? 'woodhi' : 'wood', t, accents[i] ? 0.95 : 0.7, out));
    return () => { try { out.disconnect(); } catch (e) { /* ignore */ } };
  }

  /**
   * Mount the trainer into `box`.
   * ex: {id, title, desc, tip, level, cat, kind: 'notes'|'chords', notes, beats, bpm, chords, beatsPer, octaveFree}
   * opts: {onSession(summary, seconds), path: true when part of the Exercise path, assignment}
   */
  function mount(box, App, ex, opts) {
    opts = opts || {};
    const inst = App.instrument, I = PM.Instruments.get(inst);
    let bpm = ex.bpm || 72, running = false, stopFns = [], unsub = null, raf = 0, rec = null, wait = null;
    let targets = [], take = null;
    const meta = loadMeta();
    const takes = (meta[ex.id] || []).slice(-6);
    const chordsKind = ex.kind === 'chords';
    const beatsOf = () => (chordsKind ? ex.chords.map(() => ex.beatsPer || 4) : ex.beats);
    const totalBeats = () => beatsOf().reduce((a, b) => a + b, 0);

    box.innerHTML = `
      <div class="pa">
        <div class="pa-head"><span class="lvl l${ex.level || 1}">Level ${ex.level || 1}</span><span class="chip">${esc(ex.cat || '')}</span><b class="pa-title">${esc(ex.title)}</b></div>
        ${ex.desc ? `<p class="small" style="margin-top:6px">${esc(ex.desc)}</p>` : ''}
        ${ex.syllable ? `<p class="small" style="margin-top:4px">🎤 Sing on: <b>${esc(ex.syllable)}</b></p>` : ''}
        ${ex.tip ? `<div class="pa-tip">💡 ${esc(ex.tip)}</div>` : ''}
        <div class="pa-controls">
          <label class="field">Tempo <b id="paBpmL">${bpm}</b> BPM<input type="range" id="paBpm" min="40" max="220" value="${bpm}"></label>
          <div class="seg" id="paMode"><button data-m="along" class="on">${icon('metronome')} Play along</button><button data-m="wait">${icon('hand')} Wait for me</button></div>
          <label class="switch"><input type="checkbox" id="paGuide"><span class="track"></span>Guide ${chordsKind ? 'chords' : 'melody'}</label>
          ${chordsKind ? '' : `<label class="switch"><input type="checkbox" id="paOct" ${ex.octaveFree ? 'checked' : ''}><span class="track"></span>Any octave</label>`}
          <label class="switch"><input type="checkbox" id="paRec" checked><span class="track"></span>Record takes</label>
        </div>
        <div id="paAlong">
          ${chordsKind ? `<div class="pa-chords" id="paChords">${ex.chords.map((c, i) => `<div class="pa-chord" data-i="${i}">${I.strings ? UI.chordDiagram(c) : `<b>${esc(c)}</b><span class="small">${chordNotes(c)}</span>`}</div>`).join('')}</div>` : '<canvas class="pa-lane" id="paLane" height="170"></canvas>'}
          ${chordsKind || !PM.FingerPanel ? '' : '<details class="pa-fing" id="paFingD" open><summary>🖐️ Fingering guide — piano roll & ' + (I.strings ? 'fretboard' : I.family === 'keys' ? 'keyboard' : I.family === 'brass' ? 'valves' : 'notes') + '</summary><div id="paFing"></div></details>'}
          <div class="row" style="justify-content:center;margin-top:10px">
            <button class="btn glass" id="paListen">${icon('headphones')} Listen</button>
            <button class="btn primary" id="paGo">${icon('mic')} Start take</button>
          </div>
          <div class="row pa-live" style="justify-content:center"><span class="chip">${chordsKind ? 'Chord' : 'Note'} <b id="paI">0</b>/${chordsKind ? ex.chords.length : ex.notes.length}</span><span class="chip">Hearing <b id="paHeard">—</b></span><span class="chip">Timing <b id="paTiming">—</b></span></div>
          <p class="small" id="paMsg" style="text-align:center;color:#fecaca"></p>
          <div id="paResult"></div>
        </div>
        <div id="paWait" class="hidden"></div>
        <div class="pa-takes"><div class="card-head" style="margin:14px 0 8px"><h3 style="color:#fff">${icon('loop')} Your takes</h3><span class="small" style="color:rgba(255,255,255,.7)">play back, compare, send the best</span></div><div id="paTakes"></div></div>
      </div>`;
    const q = (id) => $('#' + id, box);

    function chordNotes(name) { const p = Theory.parseChordName(name); return p ? Theory.chordPcs(p.root, p.type).map((x) => Theory.spell(x + (inst === 'trumpet' ? 2 : 0))).join(' ') : ''; }

    // ---------------- fingering guide (piano roll + fretboard / keyboard / valves)
    const fpanel = !chordsKind && q('paFing') && I.family !== 'voice' ? PM.FingerPanel.mount(q('paFing'), { inst, notes: ex.notes, beats: ex.beats, title: false }) : null;
    if (!fpanel && q('paFingD')) q('paFingD').remove();

    // ---------------- note lane
    const lane = q('paLane');
    let laneW = 0;
    function drawLane(now) {
      if (!lane) return;
      const dpr = Math.min(2, root.devicePixelRatio || 1);
      const w = lane.clientWidth || 600, h = 170;
      if (laneW !== w) { lane.width = w * dpr; lane.height = h * dpr; laneW = w; }
      const g = lane.getContext('2d');
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      g.clearRect(0, 0, w, h);
      const beat = 60 / bpm;
      const notes = ex.notes, beats = ex.beats;
      const lo = Math.min(...notes) - 1, hi = Math.max(...notes) + 1;
      const yOf = (m) => 14 + (h - 40) * (1 - (m - lo) / Math.max(1, hi - lo));
      const pxPerBeat = Math.max(36, Math.min(90, w / 9));
      const t0 = targets.length ? targets[0].time : null;
      const curBeat = running && t0 != null ? (now - t0) / beat : -1;
      const x0 = w * 0.22 - Math.max(0, curBeat) * pxPerBeat;
      g.fillStyle = 'rgba(255,255,255,0.06)';
      let b = 0;
      for (let i = 0; i <= Math.ceil(totalBeats()); i++) { const x = x0 + i * pxPerBeat; if (x > -2 && x < w + 2) g.fillRect(x, 0, 1, h - 22); }
      notes.forEach((m, i) => {
        const x = x0 + b * pxPerBeat, wd = Math.max(10, beats[i] * pxPerBeat - 4), y = yOf(m);
        b += beats[i];
        if (x + wd < -10 || x > w + 10) return;
        const r = targets[i] && targets[i].result;
        g.fillStyle = r ? COLORS[r] : i === (take ? take.cursor : -1) ? PM.UI.col('pink') : PM.UI.rgba('soft', 0.85);
        UI.roundRect(g, x, y - 9, wd, 18, 9); g.fill();
        g.fillStyle = r ? '#fff' : '#2a0f5c';
        g.font = '700 11px system-ui, sans-serif';
        g.fillText(pcName(m, inst), x + 6, y + 4);
        if (r === 'wrong' && targets[i].playedName) { g.fillStyle = '#fecaca'; g.fillText('✕ ' + targets[i].playedName.replace(/-?\d+$/, ''), x + 6, y + 22); }
      });
      // live pitch line (singers & single-note instruments): green in tune, amber close, red off
      if (take && take.sung && take.sung.length && t0 != null) {
        g.lineWidth = 3; g.lineCap = 'round';
        let prev = null;
        for (const s of take.sung) {
          if (s.m == null) { prev = null; continue; }
          const x = x0 + ((s.t - t0) / beat) * pxPerBeat;
          if (x < -4 || x > w * 0.22 + 4) { prev = null; continue; }
          const tg = targets.find((tt) => s.t >= tt.time - 0.05 && s.t < tt.time + tt.dur);
          const oct = q('paOct') && q('paOct').checked;
          const j = tg && PM.PitchTrail ? PM.PitchTrail.judge(s.m, tg.midi, oct) : null;
          let m = s.m;
          if (tg && oct) m -= Math.round((s.m - tg.midi) / 12) * 12;
          const y = Math.max(4, Math.min(h - 26, yOf(m)));
          if (prev) { g.strokeStyle = j ? { good: '#34d399', close: '#fbbf24', off: '#fb7185' }[j.grade] : PM.UI.rgba('accent2', 0.8); g.beginPath(); g.moveTo(prev.x, prev.y); g.lineTo(x, y); g.stroke(); }
          prev = { x, y };
        }
      }
      g.fillStyle = PM.UI.col('pink');
      g.fillRect(w * 0.22, 0, 2, h - 22);
      g.fillStyle = 'rgba(255,255,255,0.6)'; g.font = '11px system-ui'; g.fillText(running ? (curBeat < 0 ? 'count-in…' : 'play!') : 'ready', 8, h - 6);
    }
    drawLane(0);

    // ---------------- reference playback
    UI.playToggle(q('paListen'), () => {
      const ctx = PM.Audio.getCtx(), beat = 60 / bpm, start = ctx.currentTime + 0.15;
      stopFns.forEach((f) => f()); stopFns = [];
      const list = refNotes(start, beat);
      stopFns.push(synth(list, I.synth));
      return list.reduce((m, n) => Math.max(m, n.time + n.dur), 0) - ctx.currentTime;
    });
    function refNotes(start, beat) {
      let b = 0;
      if (chordsKind) return ex.chords.map((c) => { const p = Theory.parseChordName(c) || { root: 0, type: '' }; let r = 48 + p.root; if (r > 55) r -= 12; const t = start + b * beat; b += ex.beatsPer || 4; return { midi: r, time: t, dur: (ex.beatsPer || 4) * beat, chord: Theory.TYPE_BY_ID[p.type].iv.map((iv) => r + 12 + iv) }; });
      return ex.notes.map((m, i) => { const t = start + b * beat; b += ex.beats[i]; return { midi: m, time: t, dur: ex.beats[i] * beat }; });
    }

    q('paBpm').oninput = (e) => { bpm = +e.target.value; q('paBpmL').textContent = bpm; drawLane(0); };
    $$('#paMode button', box).forEach((bt) => (bt.onclick = () => {
      $$('#paMode button', box).forEach((x) => x.classList.toggle('on', x === bt));
      const along = bt.dataset.m === 'along';
      stop();
      q('paAlong').classList.toggle('hidden', !along);
      q('paWait').classList.toggle('hidden', along);
      if (!along) {
        if (chordsKind) { q('paWait').innerHTML = '<p class="small" style="color:#fff">“Wait for me” works with single notes — use Play along for chord changes.</p>'; return; }
        wait = PM.LearnView.sequenceTrainer(q('paWait'), App, { notes: ex.notes, octaveFree: q('paOct') && q('paOct').checked, title: ex.title, onDone: (summary, secs) => { opts.onSession && opts.onSession(summary, secs, { mode: 'wait' }); savePath(summary.accuracy, summary.accuracy, null); } });
      } else if (wait) { wait.stop(); wait = null; }
    }));

    // ---------------- a take
    q('paGo').onclick = () => (running ? finish(true) : start());
    async function start() {
      q('paMsg').textContent = '';
      const ctx = PM.Audio.getCtx();
      const engine = App.settings.source === 'midi' ? App.midiIn : App.live;
      try {
        if (engine === App.live) { App.live.latency = App.settings.latency; await App.live.start(App.settings.deviceId); }
        else await App.midiIn.start();
      } catch (e) { q('paMsg').textContent = 'Could not open the ' + (engine === App.live ? 'microphone' : 'MIDI input') + ': ' + (e.message || e); return; }
      rec = null;
      if (q('paRec').checked && engine === App.live && PM.Recorder.supported()) {
        try { rec = new PM.Recorder(); await rec.start({ deviceId: App.settings.deviceId }); } catch (e) { rec = null; }
      }
      const beat = 60 / bpm, bpb = chordsKind ? (ex.beatsPer || 4) : 4;
      const recStart = ctx.currentTime;
      const t0 = ctx.currentTime + 0.25 + bpb * beat;
      // targets
      targets = [];
      let b = 0;
      if (chordsKind) ex.chords.forEach((c) => { const p = Theory.parseChordName(c); targets.push({ chord: Object.assign({ name: c, pcs: Theory.chordPcs(p.root, p.type) }, p), time: t0 + b * beat, dur: (ex.beatsPer || 4) * beat }); b += ex.beatsPer || 4; });
      else ex.notes.forEach((m, i) => { targets.push({ midi: m, time: t0 + b * beat, dur: ex.beats[i] * beat }); b += ex.beats[i]; });
      const endTime = t0 + totalBeats() * beat;
      // click: count-in + every beat
      const ticks = [], acc = [];
      for (let i = -bpb; i < Math.ceil(totalBeats()); i++) { ticks.push(t0 + i * beat); acc.push(((i % bpb) + bpb) % bpb === 0); }
      stopFns.forEach((f) => f()); stopFns = [clicks(ticks, acc)];
      if (q('paGuide').checked) stopFns.push(synth(refNotes(t0, beat), I.synth, 0.12));
      take = { t0, recStart, beat, cursor: 0, startedAt: performance.now(), no: takes.length + 1, sung: [] };
      running = true;
      q('paGo').innerHTML = `${icon('stop')} Stop`;
      q('paResult').innerHTML = '';
      App.emit('practice', { type: 'start', title: ex.title, bpm, tip: take.no === 1 ? ex.tip : '', takeNo: take.no });
      // ---- judging
      const tol = Math.max(0.06, Math.min(0.12, beat * 0.14));
      const win = Math.min(0.45, beat * 0.5);
      let lastMidi = null, stable = 0;
      take.cand = null;
      unsub = engine.on((f) => {
        const now = ctx.currentTime;
        if (chordsKind) return judgeChord(f, now, tol);
        const p = f.active ? f.pitch : null;
        if (I.mono) take.sung.push({ t: now, m: p && p.confidence > 0.6 ? p.midi + (p.cents || 0) / 100 : null });
        if (p) {
          q('paHeard').textContent = nameOf(p.midi, inst) + (I.family === 'voice' && p.cents != null ? ` ${p.cents > 0 ? '+' : ''}${p.cents}¢` : '');
          stable = p.midi === lastMidi ? stable + 1 : 0;
          if ((f.onset || stable === 2) && !take.cand) take.cand = { time: f.onset ? f.time : f.time - 0.04, frames: [] };
          lastMidi = p.midi;
        } else { lastMidi = null; stable = 0; }
        if (take.cand) {
          if (p) take.cand.frames.push(p.midi);
          if (now - take.cand.time > 0.13 || take.cand.frames.length >= 6) { decide(take.cand, win, tol); take.cand = null; }
        }
      });
      const loop = () => {
        if (!running) return;
        const now = ctx.currentTime;
        if (take.cand && now - take.cand.time > 0.14) { decide(take.cand, win, tol); take.cand = null; }
        for (const t of targets) if (!t.result && now > t.time + (chordsKind ? t.dur * 0.8 : win + 0.18) && now > t0) { t.result = 'miss'; emitNote(t); }
        if (lane) drawLane(now); else highlightChord(now);
        if (fpanel && targets.length) { let i = -1; for (let k = 0; k < targets.length; k++) if (targets[k].time <= now + 0.05) i = k; else break; if (i >= 0) fpanel.setCurrent(i); }
        if (now > endTime + 0.5) return finish(false);
        raf = requestAnimationFrame(loop);
      };
      raf = requestAnimationFrame(loop);
    }

    function decide(cand, win, tol) {
      if (!cand.frames.length) return;
      // most frequent detected pitch in the first ~130 ms after the attack
      const counts = {};
      cand.frames.forEach((m) => (counts[m] = (counts[m] || 0) + 1));
      const played = +Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
      let best = null;
      for (const t of targets) { if (t.result) continue; const d = cand.time - t.time; if (Math.abs(d) <= win && (!best || Math.abs(d) < Math.abs(best.d))) best = { t, d }; }
      if (!best) return; // extra note between targets — ignore
      const octFree = q('paOct') && q('paOct').checked;
      const ok = octFree ? (played - best.t.midi) % 12 === 0 : played === best.t.midi || (I.family === 'fretted' && Math.abs(played - best.t.midi) === 12);
      const t = best.t;
      t.offsetMs = Math.round(best.d * 1000);
      if (ok) t.result = Math.abs(best.d) <= tol ? 'hit' : best.d < 0 ? 'early' : 'late';
      else { t.result = 'wrong'; t.playedName = nameOf(played, inst); }
      emitNote(t);
    }
    function judgeChord(f, now, tol) {
      if (!f.active || !f.chroma) return;
      q('paHeard').textContent = f.chord ? f.chord.name : '…';
      for (const t of targets) {
        if (t.result || now < t.time - 0.3 || now > t.time + t.dur * 0.8) continue;
        const cmp = PM.CoachUtil.compareChord(t.chord, f.chord, f.chroma);
        if (cmp.result === 'hit') {
          t.hold = t.hold || now;
          if (now - t.hold > 0.2) { const d = t.hold - t.time; t.offsetMs = Math.round(d * 1000); t.result = Math.abs(d) <= Math.max(tol, 0.18) ? 'hit' : d < 0 ? 'early' : 'late'; emitNote(t); }
        } else t.hold = 0;
        break;
      }
    }
    function emitNote(t) {
      const i = targets.indexOf(t);
      if (take) take.cursor = Math.max(take.cursor, i + 1);
      q('paI').textContent = targets.filter((x) => x.result).length;
      if (t.offsetMs != null && t.result !== 'wrong') q('paTiming').textContent = (t.offsetMs > 0 ? '+' : '') + t.offsetMs + ' ms';
      App.emit('practice', { type: 'note', result: t.result, offsetMs: t.offsetMs, expectedName: t.midi != null ? nameOf(t.midi, inst).replace(/-?\d+$/, '') : t.chord.name, playedName: t.playedName ? t.playedName.replace(/-?\d+$/, '') : null });
    }
    function highlightChord(now) {
      targets.forEach((t, i) => {
        const el = $(`.pa-chord[data-i="${i}"]`, box);
        if (!el) return;
        el.classList.toggle('now', now >= t.time && now < t.time + t.dur);
        el.dataset.r = t.result || '';
      });
    }

    async function finish(aborted) {
      if (!running) return;
      running = false;
      cancelAnimationFrame(raf);
      if (unsub) { unsub(); unsub = null; }
      stopFns.forEach((f) => f()); stopFns = [];
      let recording = null;
      if (rec) { try { recording = await rec.stop(); } catch (e) { recording = null; } rec = null; }
      App.live.stop(); App.midiIn.stop();
      q('paGo').innerHTML = `${icon('mic')} Start take`;
      const judged = targets.filter((t) => t.result);
      if (aborted && judged.length < Math.max(3, targets.length * 0.3)) { q('paMsg').textContent = 'Take stopped — start again when ready.'; targets.forEach((t) => delete t.result); drawLane(0); return; }
      targets.forEach((t) => { if (!t.result) t.result = 'miss'; });
      const stats = PM.Agent.takeStats(targets.map((t) => ({ result: t.result, offsetMs: t.offsetMs, playedName: t.playedName ? t.playedName.replace(/-?\d+$/, '') : null, expectedName: t.midi != null ? pcName(t.midi, inst) : t.chord.name })), bpm);
      const prev = takes.length ? takes[takes.length - 1].stats : null;
      const secs = (performance.now() - take.startedAt) / 1000;
      const entry = { id: 't' + Date.now().toString(36), no: take.no, date: new Date().toISOString(), bpm, stats, lead: take.t0 - take.recStart, hasAudio: !!(recording && recording.blob && recording.blob.size), mime: recording && recording.mime, ext: recording && recording.ext, seconds: recording ? recording.seconds : secs, results: targets.map((t) => t.result[0]) };
      if (entry.hasAudio) await PM.Sync.Blobs.put('take-' + entry.id, recording.blob, { kind: 'take' }).catch(() => { entry.hasAudio = false; });
      takes.push(entry);
      while (takes.length > 6) { const old = takes.shift(); PM.Sync.Blobs.del('take-' + old.id); }
      const m = loadMeta(); m[ex.id] = takes; saveMeta(m);
      if (I.mono && take.sung.length) {
        const oct = q('paOct') && q('paOct').checked;
        const devs = [];
        for (const s of take.sung) {
          if (s.m == null) continue;
          const tg = targets.find((tt) => s.t >= tt.time + 0.08 && s.t < tt.time + tt.dur - 0.03);
          if (!tg) continue;
          const j = PM.PitchTrail.judge(s.m, tg.midi, oct);
          if (Math.abs(j.cents) < 150) devs.push(j.cents);
        }
        if (devs.length > 8) {
          const mean = devs.reduce((x, y) => x + y, 0) / devs.length;
          stats.pitch = { avgCents: Math.round(devs.reduce((x, y) => x + Math.abs(y), 0) / devs.length), bias: Math.round(mean), inTune: devs.filter((c) => Math.abs(c) <= 35).length / devs.length };
        }
      }
      showResult(stats, prev);
      drawTakes();
      if (lane) drawLane(0);
      App.emit('practice', { type: 'end', stats, prev, exercise: ex });
      savePath(stats.accuracy, stats.inTime, bpm);
      // XP & history (no pop-up: results are shown inline)
      const stars = starsFor(stats);
      App.game.recordSession({ mode: 'learn', instrument: inst, seconds: secs, title: ex.title, assignmentId: opts.assignment ? opts.assignment.id : null, summary: { accuracy: stats.accuracy, score: Math.round(stats.accuracy * 100 + stats.inTime * 50), stars, maxCombo: 0, insights: [`${Math.round(stats.accuracy * 100)}% notes, ${Math.round(stats.inTime * 100)}% in time at ${bpm} BPM`] } });
      if (stars === 3) UI.confetti();
      opts.onTake && opts.onTake(entry);
    }
    const starsFor = (s) => (s.accuracy >= 0.95 && s.inTime >= 0.8 ? 3 : s.accuracy >= 0.85 ? 2 : s.accuracy >= 0.7 ? 1 : 0);
    function savePath(acc, inTime, tempo) {
      if (!opts.path) return;
      const g = App.game.state;
      g.path = g.path || {};
      const o = g.path[ex.id] || {};
      const stars = starsFor({ accuracy: acc, inTime: inTime == null ? acc : inTime });
      g.path[ex.id] = { best: Math.max(o.best || 0, Math.round(acc * 100) / 100), stars: Math.max(o.stars || 0, stars), bpm: Math.max(o.bpm || 0, tempo && stars ? tempo : 0), takes: (o.takes || 0) + 1, last: new Date().toISOString() };
      App.game.save();
      opts.onProgress && opts.onProgress(g.path[ex.id]);
    }
    function showResult(s, prev) {
      const pct = (x) => Math.round(x * 100) + '%';
      const d = (a, b) => (b == null ? '' : `<em class="${a >= b ? 'up' : 'down'}">${a >= b ? '▲' : '▼'} ${Math.abs(Math.round((a - b) * 100))}</em>`);
      q('paResult').innerHTML = `<div class="pa-res">
        <div><b>${pct(s.accuracy)}</b><span>right notes ${prev ? d(s.accuracy, prev.accuracy) : ''}</span></div>
        <div><b>${pct(s.inTime)}</b><span>in time ${prev ? d(s.inTime, prev.inTime) : ''}</span></div>
        <div><b>${s.avgOffset == null ? '—' : (s.avgOffset > 0 ? '+' : '') + Math.round(s.avgOffset) + ' ms'}</b><span>${s.avgOffset == null ? 'timing' : s.avgOffset < -15 ? 'rushing' : s.avgOffset > 15 ? 'dragging' : 'centred'}</span></div>
        ${s.pitch ? `<div><b>${Math.round(s.pitch.inTune * 100)}%</b><span>in tune · ±${s.pitch.avgCents}¢${Math.abs(s.pitch.bias) >= 12 ? (s.pitch.bias > 0 ? ' · a bit sharp' : ' · a bit flat') : ''}</span></div>` : ''}
        <div><b class="stars">${'★'.repeat(starsFor(s))}${'☆'.repeat(3 - starsFor(s))}</b><span>${s.missed} missed</span></div></div>`;
    }

    // ---------------- takes: playback revisions
    let playing = null;
    function stopPlayback() { if (playing) { playing.forEach((f) => f()); playing = null; } }
    function drawTakes() {
      const el = q('paTakes');
      if (!takes.length) { el.innerHTML = '<p class="small" style="color:rgba(255,255,255,.7)">Your recorded takes appear here — play them back, hear them against the reference and watch your progress.</p>'; return; }
      const best = Math.max(...takes.map((t) => t.stats.accuracy + t.stats.inTime));
      el.innerHTML = takes.slice().reverse().map((t) => `<div class="take ${t.stats.accuracy + t.stats.inTime === best ? 'best' : ''}" data-id="${t.id}">
          <div class="take-main"><b>Take ${t.no}</b>${t.stats.accuracy + t.stats.inTime === best ? '<span class="tag ok">best</span>' : ''}<span class="small">${new Date(t.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · ${t.bpm} BPM</span>
            <span class="take-score">${Math.round(t.stats.accuracy * 100)}% notes · ${Math.round(t.stats.inTime * 100)}% in time</span>
            <span class="take-dots">${(t.results || []).map((r) => `<i class="r-${r}"></i>`).join('')}</span></div>
          <div class="take-btns">${t.hasAudio ? `<button class="mini-btn" data-p="me">${icon('play')} Me</button><button class="mini-btn" data-p="both">${icon('layers')} Me + reference</button>` : '<span class="small">no audio</span>'}<button class="mini-btn" data-p="ref">${icon('headphones')} Reference</button>${t.hasAudio && PM.Sync.connected ? `<button class="mini-btn" data-p="send">${icon('upload')} Send</button>` : ''}<button class="mini-btn" data-p="del">✕</button></div></div>`).join('');
      $$('.take [data-p]', el).forEach((b) => (b.onclick = () => takeAction(b.dataset.p, takes.find((t) => t.id === b.closest('.take').dataset.id), b)));
    }
    async function takeAction(kind, t, btn) {
      if (!t) return;
      stopPlayback();
      const ctx = PM.Audio.getCtx();
      if (kind === 'del') { PM.Sync.Blobs.del('take-' + t.id); takes.splice(takes.indexOf(t), 1); const m = loadMeta(); m[ex.id] = takes; saveMeta(m); drawTakes(); return; }
      if (kind === 'ref') { playing = [synth(refNotes(ctx.currentTime + 0.1, 60 / t.bpm), I.synth)]; return; }
      const rec = await PM.Sync.Blobs.get('take-' + t.id);
      if (!rec || !rec.blob) { UI.toast('This take\'s audio is no longer on this device', { icon: '⚠️' }); return; }
      if (kind === 'send') {
        btn.disabled = true;
        await PM.Sync.sendRecording({ blob: rec.blob, mime: t.mime, ext: t.ext, seconds: t.seconds }, { title: `${ex.title} — take ${t.no} (${Math.round(t.stats.accuracy * 100)}%, ${t.bpm} BPM)`, mode: 'learn', assignmentId: opts.assignment ? opts.assignment.id : null, accuracy: t.stats.accuracy, insights: [`${Math.round(t.stats.accuracy * 100)}% right notes, ${Math.round(t.stats.inTime * 100)}% in time`] });
        UI.toast('Take sent to your teacher', { icon: '📨' });
        return;
      }
      const url = URL.createObjectURL(rec.blob);
      const a = new Audio(url);
      const stops = [() => { a.pause(); URL.revokeObjectURL(url); }];
      a.onended = () => stopPlayback();
      a.oncanplay = null;
      await a.play().catch(() => {});
      if (kind === 'both') stops.push(synth(refNotes(ctx.currentTime + Math.max(0, t.lead - a.currentTime), 60 / t.bpm), I.synth, 0.18));
      playing = stops;
    }
    drawTakes();

    function stop() { if (running) finish(true); if (wait) { wait.stop(); wait = null; } stopPlayback(); stopFns.forEach((f) => f()); stopFns = []; }
    const onResize = () => { laneW = 0; drawLane(0); };
    addEventListener('resize', onResize);
    return { stop() { stop(); removeEventListener('resize', onResize); } };
  }

  PM.PlayAlong = { mount, synth };
})(typeof self !== 'undefined' ? self : globalThis);
