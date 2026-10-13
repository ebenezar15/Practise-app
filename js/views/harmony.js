/* Overture — Harmony & parts: learn to sing harmony step by step, then sing your part
 * (soprano, alto, tenor or bass) of famous hymns while Overture plays the other three.
 * A scrolling four-lane score shows every part in its colour, the chord and which chord
 * tone each voice sings, the words, and your live pitch line against your part. */
(function (root) {
  'use strict';
  const PM = root.PM;
  const { UI, Harmony, DSP } = PM;
  const { icon, esc, $, $$ } = UI;
  const PART = Object.fromEntries(Harmony.PARTS.map((p) => [p.id, p]));
  const queryParam = (k) => { const m = new RegExp('[?&]' + k + '=([^&]+)').exec(location.hash); return m ? decodeURIComponent(m[1]) : null; };

  // ------------------------------------------------------------------ audio
  const TIMBRE = { S: ['ah', 0.85, 0.22], A: ['oo', 0.95, 0.07], T: ['ah', 0.85, -0.07], B: ['oo', 1, -0.22] }; // vowel, level, pan
  class PartPlayer {
    constructor(piece, opts) {
      this.piece = piece; this.opts = opts || {};
      this.rate = this.opts.rate || 1;
      this.beat = 60 / (piece.bpm * this.rate);
      this.gains = {};
      this.t0 = 0; this.running = false;
    }
    start(levels) {
      const c = PM.Audio.getCtx();
      const bpb = this.piece.bpb;
      // render every voice before scheduling so the first chord is on time
      for (const [id, notes] of Object.entries(this.piece.parts)) for (const n of notes) PM.Sound.prepare('voice', n.midi, 0.7, TIMBRE[id][0]);
      this.t0 = c.currentTime + 0.3 + bpb * this.beat;
      this.out = c.createGain(); this.out.gain.value = 0.9; this.out.connect(PM.Sound.master());
      // count-in clicks
      for (let i = 0; i < bpb; i++) {
        const t = this.t0 - (bpb - i) * this.beat;
        PM.Sound.drum(i === 0 ? 'woodhi' : 'wood', t, i === 0 ? 0.9 : 0.65, this.out);
      }
      for (const [id, notes] of Object.entries(this.piece.parts)) {
        const [type, vol, pan] = TIMBRE[id];
        const g = c.createGain(); g.gain.value = levels[id] == null ? 1 : levels[id];
        let node = g;
        if (c.createStereoPanner) { const p = c.createStereoPanner(); p.pan.value = pan; g.connect(p); node = p; }
        node.connect(this.out);
        this.gains[id] = g;
        for (const n of notes) {
          const st = this.t0 + n.start * this.beat, dur = n.dur * this.beat;
          PM.Sound.note('voice', n.midi, st, Math.max(0.1, dur - 0.05), { vel: 0.7, vowel: type, gain: vol * 0.8, dest: g });
        }
      }
      this.running = true;
    }
    setLevel(id, v) { if (this.gains[id]) this.gains[id].gain.setTargetAtTime(v, PM.Audio.getCtx().currentTime, 0.03); }
    pos() { return (PM.Audio.getCtx().currentTime - this.t0) / this.beat; } // in beats (negative during count-in)
    stop() { this.running = false; if (this.out) { try { this.out.gain.setTargetAtTime(0, PM.Audio.getCtx().currentTime, 0.02); setTimeout(() => this.out.disconnect(), 120); } catch (e) { /* */ } } }
  }

  /** Note of a part sounding at beat b. */
  const noteAt = (notes, b) => notes.find((n) => b >= n.start && b < n.start + n.dur) || null;

  // ------------------------------------------------------------------ the scrolling score
  function drawRoll(canvas, piece, mine, b, sung) {
    const { g, w, h } = UI.setupCanvas(canvas);
    g.clearRect(0, 0, w, h);
    const all = Object.values(piece.parts).flat();
    const lo = Math.min(...all.map((n) => n.midi)) - 2, hi = Math.max(...all.map((n) => n.midi)) + 2;
    const past = 2, ahead = 7, b0 = b - past, b1 = b + ahead;
    const X = (x) => ((x - b0) / (b1 - b0)) * w;
    const lyricH = 22;
    const Y = (m) => (h - lyricH) - 6 - ((m - lo) / Math.max(1, hi - lo)) * (h - lyricH - 12);
    const font = getComputedStyle(document.body).fontFamily;
    // bar lines
    g.strokeStyle = 'rgba(124,58,237,0.12)'; g.lineWidth = 1;
    for (let k = Math.ceil(b0); k <= b1; k++) { if (k % piece.bpb) continue; g.beginPath(); g.moveTo(X(k), 0); g.lineTo(X(k), h - lyricH); g.stroke(); }
    const order = Object.keys(piece.parts).filter((id) => id !== mine).concat([mine]);
    for (const id of order) {
      const isMine = id === mine, col = PART[id].color;
      for (const n of piece.parts[id]) {
        if (n.start + n.dur < b0 || n.start > b1) continue;
        const x0 = X(n.start), x1 = X(n.start + n.dur) - 2, y = Y(n.midi), bh = isMine ? 12 : 7;
        g.globalAlpha = isMine ? 1 : 0.42;
        g.fillStyle = col;
        UI.roundRect(g, x0, y - bh / 2, Math.max(3, x1 - x0), bh, bh / 2); g.fill();
        if (isMine && x1 - x0 > 22) { g.globalAlpha = 1; g.fillStyle = '#fff'; g.font = '800 9px ' + font; g.textBaseline = 'middle'; g.fillText(DSP.pcName(n.midi), x0 + 5, y); }
      }
    }
    g.globalAlpha = 1;
    // words under the score (my part, else soprano)
    const lyr = (piece.parts[mine] || []).some((n) => n.syl) ? piece.parts[mine] : piece.parts.S;
    g.font = '700 12px ' + font; g.textBaseline = 'middle'; g.fillStyle = 'rgba(76,29,149,0.85)';
    for (const n of lyr || []) if (n.syl && n.start + n.dur >= b0 && n.start <= b1) g.fillText(n.syl, X(n.start) + 2, h - lyricH / 2);
    // sung pitch line
    const COL = { good: '#10b981', close: '#f59e0b', off: '#f43f5e' };
    g.lineWidth = 3.5; g.lineCap = 'round';
    let prev = null;
    for (const s of sung) {
      if (s.b < b0 || s.m == null) { prev = null; continue; }
      const x = X(s.b), y = Math.max(4, Math.min(h - lyricH - 4, Y(s.m)));
      if (prev && s.b - prev.b < 0.6) { g.strokeStyle = COL[s.grade] || '#d946ef'; g.beginPath(); g.moveTo(prev.x, prev.y); g.lineTo(x, y); g.stroke(); }
      prev = { x, y, b: s.b };
    }
    // playhead
    g.fillStyle = 'rgba(217,70,239,0.85)'; g.fillRect(X(b) - 1, 0, 2, h - lyricH);
    if (b < 0) { g.fillStyle = 'rgba(76,29,149,0.8)'; g.font = '800 26px ' + font; g.textAlign = 'center'; g.fillText(String(Math.ceil(-b)), w / 2, (h - lyricH) / 2); g.textAlign = 'left'; }
  }

  // ------------------------------------------------------------------ view
  PM.App.register({
    id: 'harmony', title: 'Harmony & parts', hidden: true, parent: 'learn', icon: 'users',
    render(host, App) {
      let voiceType = App.settings.voiceType || 'alto';
      let mine = App.harmonyPart || Harmony.partForVoice(voiceType);
      let pieceId = queryParam('hymn') || App.harmonyPiece || 'doxology';
      let cleanup = [];
      const pieces = () => Harmony.HYMNS.map((h) => Harmony.buildPiece(h)).concat([Harmony.round(Harmony.FRERE, 8, 2, 'Are You Sleeping (round in 2 parts)'), Harmony.round(Harmony.FRERE, 8, 4, 'Are You Sleeping (round in 4 parts)')]);
      const all = pieces();
      const prog = () => (App.game.state.harmony = App.game.state.harmony || { lessons: {}, best: {} });
      host.innerHTML = `
        <div class="page-head"><div><a href="#/learn" class="eyebrow" style="text-decoration:none">${icon('back')} Learn</a><h1>Harmony & part singing</h1>
          <p>Learn to hold your own line, then sing soprano, alto, tenor or bass in famous hymns while Overture sings the other parts.</p></div></div>
        <section class="card"><div class="card-head"><h3>🪜 Harmony path</h3><span class="muted small">Six short steps — from "what is harmony?" to four-part hymns</span></div>
          <div class="h-path" id="hPath"></div><div id="hLesson" class="h-lesson hidden"></div></section>
        <section class="card" style="margin-top:18px" id="hTrainer"></section>`;
      const LESSONS = [
        { id: 'what', n: 1, em: '👂', title: 'What is harmony?', desc: 'Hear a melody alone, then with harmony. Can you tell them apart?' },
        { id: 'drone', n: 2, em: '🎯', title: 'Hold a drone', desc: 'Keep one note steady while the melody moves around you.' },
        { id: 'thirds', n: 3, em: '🎶', title: 'Sing in thirds', desc: 'The sweetest harmony: a third above the tune.' },
        { id: 'round', n: 4, em: '🔁', title: 'Sing a round', desc: 'Same tune, different start — your first part-singing.' },
        { id: 'part', n: 5, em: '🧭', title: 'Find your part', desc: 'Soprano, alto, tenor or bass? Hear each range.' },
        { id: 'hymn', n: 6, em: '⛪', title: 'Four-part hymn', desc: 'Sing your part of a hymn with the other three.' },
      ];
      const drawPath = () => {
        const p = prog();
        $('#hPath', host).innerHTML = LESSONS.map((l) => `<button class="h-step ${p.lessons[l.id] ? 'done' : ''}" data-l="${l.id}"><span class="hs-n">${p.lessons[l.id] ? '✓' : l.n}</span><span class="hs-em">${l.em}</span><b>${esc(l.title)}</b><span class="small">${esc(l.desc)}</span></button>`).join('');
        $$('#hPath [data-l]', host).forEach((b) => (b.onclick = () => openLesson(b.dataset.l)));
      };
      const markDone = (id) => { prog().lessons[id] = true; App.game.save(); drawPath(); };

      // ---- lessons
      const openLesson = (id) => {
        cleanup.forEach((f) => f()); cleanup = [];
        const box = $('#hLesson', host);
        box.classList.remove('hidden');
        $$('#hPath [data-l]', host).forEach((b) => b.classList.toggle('on', b.dataset.l === id));
        const piece = all.find((p) => p.id === 'doxology');
        if (id === 'what') {
          let round = 0, right = 0, answer = null, player = null;
          box.innerHTML = `<h3>👂 What is harmony?</h3><p>Harmony is two or more notes sung together. Listen to each, then take the quiz.</p>
            <div class="row" style="gap:8px;flex-wrap:wrap"><button class="btn" data-play="S">🎵 Melody alone</button><button class="btn" data-play="SA">🎶 Melody + alto</button><button class="btn" data-play="SATB">⛪ All four parts</button><button class="btn ghost" id="hStop">${icon('stop')}</button></div>
            <div class="h-quiz" id="hQuiz"><button class="btn primary" id="hQ">▶ Start the quiz</button></div>`;
          const play = (parts) => { if (player) player.stop(); player = new PartPlayer(Object.assign({}, piece, { bpb: 1, parts: Object.fromEntries(Object.entries(piece.parts).filter(([k]) => parts.includes(k)).map(([k, v]) => [k, v.filter((n) => n.start < 8)])) }), { rate: 1.1 }); player.start({}); };
          $$('[data-play]', box).forEach((b) => (b.onclick = () => play(b.dataset.play)));
          $('#hStop', box).onclick = () => player && player.stop();
          const ask = () => {
            if (round >= 4) { $('#hQuiz', box).innerHTML = `<div class="h-result pop-in"><b>${right} / 4</b> — ${right >= 3 ? 'great ears! 🎉' : 'listen again and try once more.'}</div>`; if (right >= 3) markDone('what'); return; }
            answer = Math.random() < 0.5 ? 'S' : Math.random() < 0.5 ? 'SA' : 'SATB';
            play(answer);
            $('#hQuiz', box).innerHTML = `<p>Round ${round + 1} of 4: did you hear harmony?</p><div class="row" style="gap:10px"><button class="btn big-btn" data-a="no">🎵 Melody alone</button><button class="btn big-btn" data-a="yes">🎶 Harmony</button><button class="btn ghost" id="hAgain">🔁</button></div>`;
            $('#hAgain', box).onclick = () => play(answer);
            $$('[data-a]', box).forEach((b) => (b.onclick = () => { const ok = (b.dataset.a === 'yes') === (answer !== 'S'); if (ok) right++; b.classList.add(ok ? 'ok' : 'wobble'); round++; setTimeout(ask, 650); }));
          };
          $('#hQ', box).onclick = () => { round = 0; right = 0; ask(); };
          cleanup.push(() => player && player.stop());
        } else if (id === 'drone') {
          const tonic = piece.parts.S[0].midi - 12 * (['tenor', 'baritone', 'bass'].includes(voiceType) ? 1 : 0);
          trainer(Object.assign({}, piece, { id: 'drone', title: 'Drone under the Doxology', parts: { S: piece.parts.S, A: [{ midi: tonic, start: 0, dur: piece.length, syl: 'oo' }] } }), 'A', 'Hold one steady "oo" on the home note (the low line) while the melody moves. Keep the line green!', () => markDone('drone'));
          box.innerHTML = '<h3>🎯 Hold a drone</h3><p>Sing the long note in the trainer below. Breathe whenever you need to, and come back in on the same note.</p>';
        } else if (id === 'thirds') {
          const low = ['tenor', 'baritone', 'bass'].includes(voiceType);
          const tp = Harmony.thirdsPiece(low ? 48 : 60);
          trainer(tp, 'S', 'Overture sings the scale (do-re-mi…). You sing the higher line, a third above. Hear the sweet sound when you lock in.', () => markDone('thirds'));
          box.innerHTML = '<h3>🎶 Sing in thirds</h3><p>Thirds are the most common harmony in hymns and worship songs. First listen with both parts, then sing the top line.</p>';
        } else if (id === 'round') {
          trainer(all.find((p) => p.id.startsWith('round-') && p.parts.B == null), 'A', 'You come in second: start when the first voice reaches "Brother John". Don\'t let the other part pull you off!', () => markDone('round'));
          box.innerHTML = '<h3>🔁 Sing a round</h3><p>A round is the same tune started at different times. Your part (orange) starts two bars after the first voice.</p>';
        } else if (id === 'part') {
          const VT = PM.Instruments.VOICE_TYPES;
          box.innerHTML = `<h3>🧭 Find your part</h3><p>Choose your voice type — Overture suggests the part that suits your range. Tap a part to hear its range.</p>
            <div class="seg voice-types" id="hVt">${Object.entries(VT).map(([k, v]) => `<button data-v="${k}" class="${voiceType === k ? 'on' : ''}">${esc(v.label)}</button>`).join('')}</div>
            <div class="h-parts">${Harmony.PARTS.map((p) => `<button class="h-part ${Harmony.partForVoice(voiceType) === p.id ? 'rec' : ''}" data-p="${p.id}" style="--pc:${p.color}"><b>${p.name}</b><span>${DSP.midiName(p.range[0])}–${DSP.midiName(p.range[1])}</span>${Harmony.partForVoice(voiceType) === p.id ? '<i>suggested for you</i>' : ''}</button>`).join('')}</div>`;
          $$('#hVt [data-v]', box).forEach((b) => (b.onclick = () => {
            voiceType = b.dataset.v; App.settings.voiceType = voiceType; App.saveSettings(); PM.Learn.setVoiceType(voiceType);
            mine = App.harmonyPart = Harmony.partForVoice(voiceType);
            markDone('part'); openLesson('part');
            trainer(all.find((p) => p.id === pieceId) || all[0], mine, '', () => markDone('hymn'));
          }));
          $$('[data-p]', box).forEach((b) => (b.onclick = () => { const p = PART[b.dataset.p]; PM.Sound.playNotes([p.range[0], p.range[0] + 4, p.range[0] + 7, p.range[1] - 5, p.range[1]].map((m, i) => ({ midi: m, start: i * 0.42, dur: 0.38 })), { voice: 'voice' }); mine = b.dataset.p; App.harmonyPart = mine; }));
        } else if (id === 'hymn') {
          box.innerHTML = '<h3>⛪ Four-part hymn</h3><p>Pick a hymn and your part in the trainer below. Start with <b>Listen</b>, then <b>My part alone</b>, then <b>Sing with the others</b>.</p>';
          trainer(all.find((p) => p.id === pieceId) || all[0], mine, '', () => markDone('hymn'));
          { const t = $('#hTrainer', host); if (t) t.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
        }
      };

      // ---- the part trainer
      let trainerStop = null;
      function trainer(piece, part, hint, onPass) {
        if (trainerStop) trainerStop();
        const box = $('#hTrainer', host);
        if (!piece.parts[part]) part = Object.keys(piece.parts)[Object.keys(piece.parts).length > 1 ? 1 : 0];
        const isHymn = Harmony.HYMNS.some((h) => h.id === piece.id) || piece.id.startsWith('round-');
        let rate = App.harmonyRate || 0.85, player = null, raf = 0, sung = [], unsub = null, hits = 0, total = 0;
        const levels = { listen: {}, solo: {}, sing: {} };
        const ids = Object.keys(piece.parts);
        box.innerHTML = `
          <div class="card-head"><h3>🎼 Part trainer</h3><span class="muted small">${esc(piece.title)}</span></div>
          ${isHymn ? `<div class="h-pieces">${all.map((p) => `<button class="h-piece ${p.id === piece.id ? 'on' : ''}" data-piece="${p.id}"><b>${esc(p.title)}</b><span class="small">${p.round ? 'Round' : 'SATB'} · ${p.bpm} BPM${p.lyrics ? ' · words' : ''}</span></button>`).join('')}</div>` : ''}
          ${hint ? `<div class="notice" style="margin:10px 0">💡<div>${esc(hint)}</div></div>` : ''}
          <div class="row" style="gap:10px;flex-wrap:wrap;margin:10px 0">
            <div class="seg" id="hPart">${ids.map((id) => `<button data-p="${id}" class="${id === part ? 'on' : ''}" style="--pc:${PART[id].color}"><i class="pdot"></i>${PART[id].name}</button>`).join('')}</div>
            <label class="field" style="flex-direction:row;align-items:center;gap:8px">Speed <input type="range" id="hRate" min="0.5" max="1.2" step="0.05" value="${rate}"><b id="hRateL">${Math.round(rate * 100)}%</b></label>
          </div>
          <div class="h-chord" id="hChord"></div>
          <canvas class="h-roll" id="hRoll"></canvas>
          <div class="h-mix" id="hMix">${ids.map((id) => `<label class="h-mixer" style="--pc:${PART[id].color}"><i class="pdot"></i>${PART[id].short}<input type="range" min="0" max="1.2" step="0.05" value="1" data-mix="${id}"></label>`).join('')}</div>
          <div class="row" style="gap:10px;flex-wrap:wrap;justify-content:center;margin-top:12px">
            <button class="btn big-btn" data-mode="listen">👂 Listen (all parts)</button>
            <button class="btn big-btn" data-mode="solo">🎵 My part alone</button>
            <button class="btn primary big-btn" data-mode="sing">🎤 Sing with the others</button>
            <button class="btn ghost big-btn hidden" id="hStopT">${icon('stop')} Stop</button>
          </div>
          <label class="switch" style="justify-content:center;margin-top:8px"><input type="checkbox" id="hGuide"><span class="track"></span>Quiet guide on my part while I sing</label>
          <div id="hRes" style="margin-top:12px"></div>`;
        const canvas = $('#hRoll', box);
        const draw = (b) => drawRoll(canvas, piece, part, b, sung);
        draw(-1);
        const chordBox = $('#hChord', box);
        const showChord = (b) => {
          const c = piece.chords.filter((x) => x.start <= b + 1e-6).pop();
          const notes = ids.map((id) => ({ id, n: noteAt(piece.parts[id], b) }));
          chordBox.innerHTML = `${c ? `<span class="h-cname">${esc(c.name)}<small>${esc(c.roman)}</small></span>` : '<span class="h-cname">♪</span>'}${notes.map(({ id, n }) => `<span class="h-voice ${id === part ? 'mine' : ''}" style="--pc:${PART[id].color}"><b>${PART[id].short}</b>${n ? DSP.midiName(n.midi) : '—'}${n && c ? `<small>${Harmony.chordRole(piece, b, n.midi)}</small>` : ''}</span>`).join('')}`;
        };
        showChord(0);
        $$('[data-piece]', box).forEach((b) => (b.onclick = () => { pieceId = b.dataset.piece; App.harmonyPiece = pieceId; trainer(all.find((p) => p.id === pieceId), part, hint, onPass); }));
        $$('#hPart [data-p]', box).forEach((b) => (b.onclick = () => { App.harmonyPart = b.dataset.p; mine = b.dataset.p; trainer(piece, b.dataset.p, hint, onPass); }));
        $('#hRate', box).oninput = (e) => { rate = +e.target.value; App.harmonyRate = rate; $('#hRateL', box).textContent = Math.round(rate * 100) + '%'; };
        $$('[data-mix]', box).forEach((r) => (r.oninput = () => player && player.setLevel(r.dataset.mix, +r.value)));
        const stop = (show) => {
          cancelAnimationFrame(raf);
          if (player) player.stop();
          player = null;
          if (unsub) { unsub(); unsub = null; App.live.stop(); App.midiIn.stop(); }
          $$('[data-mode]', box).forEach((b) => b.classList.remove('hidden'));
          $('#hStopT', box).classList.add('hidden');
          if (show && total > 15) {
            const acc = hits / total;
            const msg = acc >= 0.8 ? 'Beautiful — you held your part! 🎉' : acc >= 0.55 ? 'Good! Try it once more at this speed.' : 'Keep going — try "My part alone" first, then sing at a slower speed.';
            $('#hRes', box).innerHTML = `<div class="h-result pop-in"><b>${Math.round(acc * 100)}%</b> in tune on the ${PART[part].name.toLowerCase()} part · ${msg}</div>`;
            App.game.recordSession({ mode: 'harmony', instrument: 'voice', seconds: piece.length * 60 / (piece.bpm * rate), title: `Harmony · ${piece.title} (${PART[part].name})`, summary: { accuracy: acc, stars: acc >= 0.85 ? 3 : acc >= 0.65 ? 2 : acc >= 0.4 ? 1 : 0, score: Math.round(acc * 100) } });
            const pr = prog(); pr.best[piece.id + ':' + part] = Math.max(pr.best[piece.id + ':' + part] || 0, acc); App.game.save();
            if (acc >= 0.7 && onPass) onPass();
            if (acc >= 0.85) UI.confetti();
          }
        };
        trainerStop = () => stop(false);
        cleanup.push(() => stop(false));
        $('#hStopT', box).onclick = () => stop(true);
        $$('[data-mode]', box).forEach((b) => (b.onclick = async () => {
          stop(false);
          const mode = b.dataset.mode;
          sung = []; hits = 0; total = 0; $('#hRes', box).innerHTML = '';
          const lv = {};
          for (const id of ids) lv[id] = mode === 'solo' ? (id === part ? 1 : 0) : mode === 'sing' ? (id === part ? ($('#hGuide', box).checked ? 0.25 : 0) : 1) : 1;
          $$('[data-mix]', box).forEach((r) => (r.value = lv[r.dataset.mix]));
          if (mode === 'sing') {
            try {
              const engine = App.settings.source === 'midi' ? App.midiIn : App.live;
              if (engine === App.live) { App.live.latency = App.settings.latency; await App.live.start(App.settings.deviceId); } else await App.midiIn.start();
              unsub = engine.on((f) => {
                if (!player) return;
                const bt = player.pos() - (App.settings.latency || 0) / player.beat;
                const p = f.active && f.pitch && f.pitch.confidence > 0.7 ? f.pitch.midi + (f.pitch.cents || 0) / 100 : null;
                const tgt = noteAt(piece.parts[part], bt);
                let grade = null;
                if (p != null && tgt) { const j = PM.PitchTrail.judge(p, tgt.midi, true); grade = j.grade; total++; if (j.grade === 'good') hits++; }
                const shown = p != null && tgt ? p - Math.round((p - tgt.midi) / 12) * 12 : p;
                sung.push({ b: bt, m: shown, grade });
                if (sung.length > 2000) sung.shift();
              });
            } catch (e) { UI.toast('No microphone — you can still sing along; the score needs the mic.', { icon: '🎤' }); }
          }
          player = new PartPlayer(piece, { rate });
          player.start(lv);
          $$('[data-mode]', box).forEach((x) => x.classList.add('hidden'));
          $('#hStopT', box).classList.remove('hidden');
          let lastChord = -1;
          const loop = () => {
            if (!player) return;
            const bt = player.pos();
            draw(bt);
            const ci = piece.chords.filter((x) => x.start <= bt + 1e-6).length;
            if (ci !== lastChord || Math.floor(bt * 2) !== Math.floor((bt - 0.016) * 2)) { showChord(Math.max(0, bt)); if (ci !== lastChord) { chordBox.classList.remove('pulse-once'); void chordBox.offsetWidth; chordBox.classList.add('pulse-once'); lastChord = ci; } }
            if (bt > piece.length + 0.5) { stop(mode === 'sing'); draw(piece.length); return; }
            raf = requestAnimationFrame(loop);
          };
          raf = requestAnimationFrame(loop);
        }));
      }

      drawPath();
      trainer(all.find((p) => p.id === pieceId) || all[0], mine, '', () => { prog().lessons.hymn = true; App.game.save(); drawPath(); });
      if (queryParam('hymn')) setTimeout(() => { const t = $('#hTrainer', host); if (t && t.isConnected) t.scrollIntoView({ block: 'start' }); }, 50);
      return () => { cleanup.forEach((f) => f()); if (trainerStop) trainerStop(); };
    },
  });

  PM.HarmonyView = { PartPlayer, drawRoll };
})(typeof self !== 'undefined' ? self : globalThis);
