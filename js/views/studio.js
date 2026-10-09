/* Cadenza — Live Studio: play over a track (or freely) with real-time AI coaching. */
(function (root) {
  'use strict';
  const PM = root.PM;
  const { UI, Theory, Analyzer, Rhythm, DSP } = PM;
  const { icon, esc, $, $$ } = UI;

  const MSG_ICON = { praise: '✅', fix: '🛠️', instruction: '👉', tip: '💡', info: '🎼' };

  PM.App.register({
    id: 'studio', title: 'Live Studio', nav: 'Studio', icon: 'mic',
    render(host, App) {
      const inst = App.instrument;
      const track = App.track;
      const a = track && track.analysis;
      const player = App.player;
      const engineName = App.settings.source === 'midi' ? 'midi' : 'mic';

      host.innerHTML = `
        <div class="page-head">
          <div><div class="eyebrow">Live Studio · ${inst === 'guitar' ? 'Guitar' : 'Piano'}</div><h1>Play along & get coached</h1>
          <p>${a ? 'Hit play, start listening and play over the track. The coach compares every chord, strum and note to the song.' : 'Load a track to play along with — or just start listening for free-play chord tracking, tuning and timing feedback with the metronome.'}</p></div>
          <div class="row mobile-inst"><div class="seg"><button data-inst="guitar" class="${inst === 'guitar' ? 'on' : ''}">🎸 Guitar</button><button data-inst="piano" class="${inst === 'piano' ? 'on' : ''}">🎹 Piano</button></div></div>
        </div>

        <section class="card" id="trackCard"></section>

        <section class="card stage" style="margin-top:18px">
          <div class="input-bar">
            <div class="seg" id="srcSeg">
              <button data-src="mic" class="${engineName === 'mic' ? 'on' : ''}">${icon('mic')} Mic / Line-in</button>
              <button data-src="midi" class="${engineName === 'midi' ? 'on' : ''}">${icon('midi')} MIDI device</button>
            </div>
            <select id="devSel" title="Audio input" class="${engineName === 'midi' ? 'hidden' : ''}"><option value="">Default input</option></select>
            <div class="row small" style="gap:8px"><span class="muted">Level</span><div class="level-meter"><i id="lvl" style="width:0"></i></div></div>
            <label class="switch small" title="Hear your input through the speakers/headphones"><input type="checkbox" id="monitor"><span class="track"></span>Monitor</label>
            ${a ? '' : `<label class="switch small"><input type="checkbox" id="metroAlong"><span class="track"></span>Metronome <span class="muted" id="metroBpm">${App.metronome.bpm}</span></label>`}
            <div class="spacer"></div>
            <span class="muted small" id="devLabel"></span>
            <button class="btn primary" id="listenBtn">${icon('mic')} Start listening</button>
          </div>
        </section>

        <div class="live-grid">
          <section class="card stage now-card">
            ${a ? `
            <div class="chord-pair">
              <div class="chord-box" id="expBox"><div class="now-label">Song chord</div><div class="cb-name" id="expName">—</div><div class="cb-sub" id="expSub"></div></div>
              <div class="chord-box" id="youBox"><div class="now-label">You're playing</div><div class="cb-name" id="youName">—</div><div class="cb-sub" id="youSub">Start listening</div></div>
            </div>
            <div class="next-row"><span class="now-label">Next</span><b id="nextName" style="font-size:20px;min-width:60px">—</b><div class="countdown"><i id="nextBar" style="width:0"></i></div><span class="muted small" id="nextIn"></span></div>` : `
            <div><div class="now-label">You're playing</div><div class="big-chord" id="youName">—</div><div class="muted" id="youSub" style="margin-top:6px">Start listening and play a chord</div></div>
            <div><div class="now-label" style="margin-bottom:8px">Chord history</div><div class="chord-history" id="history"><span class="muted small">Your chords appear here</span></div></div>
            <div class="next-row"><span class="now-label">Key</span><b id="liveKey" style="font-size:16px">listening…</b></div>`}
            <div class="score-row">
              <div class="score-cell"><b id="score">0</b><span>Score</span></div>
              <div class="score-cell" id="comboCell"><b id="combo">0×</b><span>Combo</span></div>
              <div class="score-cell"><b id="acc">—</b><span>Accuracy</span></div>
            </div>
          </section>
          <section class="card stage">
            <div class="card-head"><h3>${icon('sparkle')} Harmony radar</h3><span class="muted small" id="notesHeard"></span></div>
            <canvas class="ring-vis" id="ring"></canvas>
          </section>
          <section class="card stage">
            <div class="card-head"><h3>${icon('bolt')} AI coach</h3><span class="tag" id="coachState">idle</span></div>
            <div class="coach-feed" id="feed">
              <div class="msg info"><span class="m-ic">🎼</span><div>Hi! I listen locally and coach you on chords, timing${inst === 'guitar' ? ', strumming, tuning' : ', notes'} and dynamics. Press <b>Start listening</b>, then play.</div></div>
              ${a ? `<div class="msg tip"><span class="m-ic">🎧</span><div>Wear headphones so I hear only your ${inst}, not the backing track.</div></div>` : ''}
            </div>
          </section>
        </div>

        <div class="meters">
          <section class="card"><div class="card-head"><h3>${icon('target')} Timing</h3><span class="tag" id="timingTag">—</span></div>
            <div class="meter-val" id="timingVal">— ms</div><div class="meter-sub" id="timingSub">${a ? 'vs. the song’s beat grid' : 'Turn on the metronome to check timing'}</div>${UI.gaugeHtml(['early', '−50', '0', '+50', 'late'])}</section>
          <section class="card"><div class="card-head"><h3>${icon('tuner')} ${inst === 'guitar' ? 'Intonation' : 'Pitch'}</h3><span class="tag" id="tuneTag">—</span></div>
            <div class="meter-val" id="tuneVal">—</div><div class="meter-sub" id="tuneSub">Single notes are measured in cents</div>${UI.gaugeHtml(['♭', '−25', '0', '+25', '♯'])}</section>
          <section class="card"><div class="card-head"><h3>${icon('wave')} Dynamics</h3><span class="tag" id="dynTag">—</span></div>
            <div class="dyn-bars">
              ${a ? '<div class="dyn-col"><div class="bar target"><i id="dynTarget" style="height:0"></i></div><span>Song</span></div>' : ''}
              <div class="dyn-col"><div class="bar"><i id="dynLive" style="height:0"></i></div><span>You</span></div>
            </div>
            <div class="meter-sub" id="dynSub" style="margin-top:8px">${a ? 'Match the song’s loudness: pp → ff' : 'Your playing level'}</div></section>
        </div>

        <section class="card instrument-panel">
          <div class="card-head"><h3>${icon(inst)} ${inst === 'guitar' ? 'Fretboard' : 'Keyboard'}</h3>
            <div class="legend">${inst === 'guitar' ? '<span><i style="background:#a855f7"></i>Chord shape</span><span><i style="background:#10b981"></i>Heard</span><span><i style="background:#f43f5e"></i>Missing</span>' : '<span><i style="background:#ede9fe;border:1px solid #c4b5fd"></i>Expected</span><span><i style="background:#d946ef"></i>You played</span><span><i style="background:#10b981"></i>Correct</span>'}</div></div>
          ${inst === 'guitar' ? `
            <div class="inst-row"><div class="fret-wrap" id="fret"></div><div id="diagram" style="min-width:110px;display:grid;place-items:center"></div></div>
            ${a && a.strum ? `<div class="card-head" style="margin:16px 0 6px"><h3>${icon('hand')} Strumming pattern <span class="muted small" style="font-weight:600">· ${esc(a.strum.gridLabel)} · ${Math.round(a.strum.consistency * 100)}% of bars</span></h3></div><div id="strum">${UI.strumLaneHtml(a.strum)}</div>` : ''}` :
            '<div class="keyboard-wrap" id="kbd"></div>'}
        </section>`;

      // ---------- Track card ----------
      const trackCard = $('#trackCard', host);
      let timeline = null;
      if (!a) {
        PM.Shared.uploader(trackCard, () => App.rerender());
      } else {
        trackCard.innerHTML = `
          <div class="track-head">
            <div class="track-art">${icon(track.kind === 'midi' ? 'midi' : 'music')}</div>
            <div class="track-title"><h2>${esc(track.name)}</h2><div class="chips">${PM.Shared.trackChips(a, inst)}</div></div>
            <a class="btn ghost sm" href="#/insights">${icon('insights')} Insights</a>
            <button class="btn ghost sm" id="changeTrack">${icon('upload')} Change</button>
          </div>
          <div class="timeline-wrap"><canvas class="timeline" id="tl"></canvas></div>
          <div class="transport">
            <button class="btn primary round" id="playBtn" aria-label="Play">${icon('play')}</button>
            <button class="btn ghost icon" id="rewBtn" title="Back 5 s">${icon('back')}</button>
            <span class="time" id="timeLbl">0:00 / ${UI.fmtTime(a.duration)}</span>
            <label class="switch small"><input type="checkbox" id="countIn" checked><span class="track"></span>Count-in</label>
            <button class="btn ghost sm" id="loopBtn">${icon('loop')} Loop 2 bars</button>
            <div class="spacer"></div>
            <div class="speed">Speed <input type="range" id="speed" min="0.5" max="1.25" step="0.05" value="${player.rate || 1}"><b id="speedLbl">${Math.round((player.rate || 1) * 100)}%</b></div>
          </div>
          <p class="muted small" style="margin-top:8px">Tip: click the timeline to seek · Shift-drag to loop a section · Space to play/pause · slow it down — pitch stays the same.</p>`;
        timeline = new UI.Timeline($('#tl', host), a, {
          onSeek: (t) => { player.time = t; timeline.setTime(t); },
          onLoop: (loop) => { player.setLoop(loop && loop.a, loop && loop.b); $('#loopBtn', host).classList.toggle('primary', !!loop); },
        });
        if (player.loop) timeline.loop = player.loop;
        $('#changeTrack', host).onclick = () => { player.pause(); App.setTrack(null); App.rerender(); };
        const playBtn = $('#playBtn', host);
        const setPlayIcon = () => { playBtn.innerHTML = icon(player.playing ? 'pause' : 'play'); };
        let countingIn = false;
        const togglePlay = async () => {
          if (countingIn) return;
          if (player.playing) { player.pause(); return; }
          if ($('#countIn', host).checked) {
            countingIn = true;
            const m = App.metronome;
            const prev = { bpm: m.bpm, bpb: m.beatsPerBar, sub: m.subdivision };
            const pulses = a.meter.compound ? a.meter.pulsesPerBar : a.meter.beatsPerBar;
            const beatSec = (a.beats.length > 2 ? (a.beats[a.beats.length - 1] - a.beats[0]) / (a.beats.length - 1) : 60 / a.tempo.bpm) / player.rate;
            m.stop(); m.bpm = 60 / beatSec; m.beatsPerBar = pulses; m.beatUnit = 4; m.subdivision = 1;
            m.start();
            playBtn.innerHTML = `<b style="font-size:18px">${pulses}</b>`;
            let left = pulses;
            const iv = setInterval(() => { left--; if (left > 0) playBtn.innerHTML = `<b style="font-size:18px">${left}</b>`; }, beatSec * 1000);
            await new Promise((r) => setTimeout(r, beatSec * pulses * 1000 - 30));
            clearInterval(iv);
            m.stop(); m.bpm = prev.bpm; m.beatsPerBar = prev.bpb; m.subdivision = prev.sub;
            countingIn = false;
          }
          await player.play();
          setPlayIcon();
        };
        playBtn.onclick = togglePlay;
        const offPlayer = player.on(() => setPlayIcon());
        $('#rewBtn', host).onclick = () => { player.time = player.time - 5; };
        const speed = $('#speed', host);
        speed.oninput = () => { player.rate = +speed.value; $('#speedLbl', host).textContent = Math.round(speed.value * 100) + '%'; };
        $('#loopBtn', host).onclick = () => {
          if (player.loop) { player.setLoop(null); timeline.loop = null; $('#loopBtn', host).classList.remove('primary'); return; }
          const t = player.time;
          const downs = a.downbeats.length ? a.downbeats : a.beats;
          let i = downs.findIndex((d) => d > t) - 1;
          if (i < 0) i = 0;
          const A = downs[i], B = downs[Math.min(downs.length - 1, i + 2)] || a.duration;
          player.setLoop(A, B); timeline.loop = { a: A, b: B };
          $('#loopBtn', host).classList.add('primary');
          UI.toast(`Looping ${UI.fmtTime(A)} – ${UI.fmtTime(B)}`, { icon: '🔁' });
        };
        var keyHandler = (e) => {
          if (e.target.matches('input, select, textarea')) return;
          if (e.code === 'Space') { e.preventDefault(); togglePlay(); }
          if (e.key === 'l' || e.key === 'L') listenBtn.click();
        };
        addEventListener('keydown', keyHandler);
        var cleanupTrack = () => { offPlayer(); removeEventListener('keydown', keyHandler); };
      }

      $$('.mobile-inst [data-inst]', host).forEach((b) => (b.onclick = () => App.setInstrument(b.dataset.inst)));

      // ---------- Instrument visuals ----------
      const kbd = inst === 'piano' ? new UI.PianoKeyboard($('#kbd', host), 36, 96) : null;
      const fret = inst === 'guitar' ? new UI.Fretboard($('#fret', host), 15) : null;
      const ring = new UI.ChromaRing($('#ring', host));
      const strumSlots = $$('#strum .strum-slot', host);

      // ---------- Input source & devices ----------
      const devSel = $('#devSel', host);
      const fillDevices = async () => {
        const list = await PM.Live.listInputs();
        devSel.innerHTML = '<option value="">Default input</option>' + list.map((d) => `<option value="${esc(d.id)}" ${d.id === App.settings.deviceId ? 'selected' : ''}>${esc(d.label)}</option>`).join('');
      };
      fillDevices();
      devSel.onchange = () => { App.settings.deviceId = devSel.value; App.saveSettings(); if (listening) { stopListening(false); startListening(); } };
      $$('#srcSeg button', host).forEach((b) => (b.onclick = () => {
        if (b.dataset.src === 'midi' && !PM.Live.MidiInputEngine.supported()) { UI.toast('Web MIDI is not supported in this browser (try Chrome or Edge).', { icon: '⚠️' }); return; }
        App.settings.source = b.dataset.src; App.saveSettings();
        $$('#srcSeg button', host).forEach((x) => x.classList.toggle('on', x === b));
        devSel.classList.toggle('hidden', b.dataset.src === 'midi');
        if (listening) { stopListening(false); startListening(); }
      }));
      const monitor = $('#monitor', host);
      monitor.checked = App.live.monitor;
      monitor.onchange = () => App.live.setMonitor(monitor.checked);
      const metroAlong = $('#metroAlong', host);
      if (metroAlong) {
        metroAlong.checked = App.metronome.running;
        metroAlong.onchange = () => (metroAlong.checked ? App.metronome.start() : App.metronome.stop());
      }

      // ---------- Listening & coaching ----------
      let listening = false, unsub = null, coach = null, sessionStart = 0, latest = null, lastState = {};
      const history = [];
      const feed = $('#feed', host);
      const pushMsg = (m) => {
        const div = document.createElement('div');
        div.className = 'msg ' + m.type;
        div.innerHTML = `<span class="m-ic">${MSG_ICON[m.type] || '🎵'}</span><div>${esc(m.text)}<time>${a && player.playing ? UI.fmtTime(player.time) : new Date().toLocaleTimeString([], { minute: '2-digit', second: '2-digit' })}</time></div>`;
        feed.prepend(div);
        while (feed.children.length > 40) feed.lastChild.remove();
      };
      const listenBtn = $('#listenBtn', host);

      async function startListening() {
        const engine = App.settings.source === 'midi' ? App.midiIn : App.live;
        try {
          App.live.latency = App.settings.latency;
          const label = engine === App.live ? await App.live.start(App.settings.deviceId) : await App.midiIn.start();
          $('#devLabel', host).textContent = label || '';
          if (engine === App.live) fillDevices();
        } catch (e) {
          console.error(e);
          UI.toast(e.name === 'NotAllowedError' ? 'Microphone permission was denied. Allow mic access in your browser settings.' : 'Could not open the input: ' + (e.message || e), { icon: '🎤', duration: 5000 });
          return;
        }
        coach = new PM.Coach({ instrument: inst, reference: a, onMessage: pushMsg });
        listening = true;
        sessionStart = performance.now();
        listenBtn.className = 'btn live';
        listenBtn.innerHTML = `${icon('stop')} Stop & review`;
        $('#coachState', host).textContent = 'listening';
        $('#coachState', host).className = 'tag ok';
        unsub = engine.on(onFrame);
      }

      function stopListening(showSummary) {
        if (!listening) return;
        listening = false;
        latest = null;
        if (unsub) unsub();
        App.live.stop(); App.midiIn.stop();
        listenBtn.className = 'btn primary';
        listenBtn.innerHTML = `${icon('mic')} Start listening`;
        const cs = $('#coachState', host);
        if (cs) { cs.textContent = 'idle'; cs.className = 'tag'; }
        const summary = coach.summary();
        const wall = (performance.now() - sessionStart) / 1000;
        const meta = { mode: 'studio', instrument: inst, seconds: Math.min(wall, summary.activeTime + 20), title: a ? track.name : 'Free play' };
        if (summary.activeTime > 8) {
          if (showSummary) PM.Shared.sessionSummary(summary, meta);
          else App.game.recordSession(Object.assign({ summary }, meta));
        }
      }
      listenBtn.onclick = () => (listening ? stopListening(true) : startListening());

      function onFrame(frame) {
        frame.refTime = a && player.playing ? player.time - (frame.source === 'mic' ? App.settings.latency : 0) * player.rate : null;
        frame.rate = player.rate;
        const grid = !(a && player.playing) && App.metronome.running ? App.metronome.grid(inst === 'guitar' ? 2 : 1) : null;
        const st = coach.update(frame, grid);
        latest = frame;
        lastState = st;
        // level meter
        $('#lvl', host).style.width = Math.max(0, Math.min(100, (frame.db + 70) * 1.6)) + '%';
        // live chord
        const youName = $('#youName', host), youSub = $('#youSub', host);
        if (frame.active && frame.chord) {
          youName.textContent = frame.chord.name;
          youSub.textContent = frame.chord.quality + (frame.chord.bass != null ? ' · inversion' : '');
          if (!a) {
            if (!history.length || history[history.length - 1] !== frame.chord.name) {
              history.push(frame.chord.name);
              if (history.length > 16) history.shift();
              $('#history', host).innerHTML = history.map((c) => `<span class="ch">${esc(c)}</span>`).join('');
              $('#history', host).scrollLeft = 1e6;
            }
          }
        } else if (frame.active && frame.pitch) {
          youName.textContent = frame.pitch.name;
          youSub.textContent = 'single note';
        } else if (!frame.active) {
          youSub.textContent = 'listening…';
        }
        const youBox = $('#youBox', host);
        if (youBox) {
          youBox.classList.remove('hit', 'close', 'miss');
          if (st.chordResult && frame.active) youBox.classList.add(st.chordResult.result);
          else if (lastResult && frame.active && performance.now() - lastResultAt < 400) youBox.classList.add(lastResult);
          if (st.chordResult) { lastResult = st.chordResult.result; lastResultAt = performance.now(); }
        }
        $('#notesHeard', host).textContent = frame.active && frame.notes.length ? frame.notes.slice(0, 6).map((n) => DSP.midiName(n.midi)).join(' ') : '';
        // score
        $('#score', host).textContent = st.score;
        $('#combo', host).textContent = st.combo + '×';
        $('#comboCell', host).classList.toggle('combo-hot', st.combo >= 10);
        $('#acc', host).textContent = st.accuracy == null ? '—' : Math.round(st.accuracy * 100) + '%';
        if (st.liveKey) $('#liveKey', host) && ($('#liveKey', host).textContent = st.liveKey.name);
        // timing
        if (st.timing) {
          const ms = Math.round(st.timing.offsetMs);
          $('#timingVal', host).textContent = (ms > 0 ? '+' : '') + ms + ' ms';
          const tag = $('#timingTag', host);
          tag.textContent = st.timing.label;
          tag.className = 'tag ' + (st.timing.label === 'perfect' ? 'ok' : Math.abs(ms) < 65 ? 'warn' : 'bad');
          UI.setGauge($$('.gauge', host)[0], ms, 100);
          $('#timingSub', host).textContent = st.timing.label === 'perfect' ? 'Right on the beat!' : ms < 0 ? 'Ahead of the beat (rushing)' : 'Behind the beat (dragging)';
        }
        // tuning
        if (frame.active && frame.pitch && frame.pitch.confidence > 0.85 && (!frame.notes || frame.notes.length <= 2)) {
          const c = frame.pitch.cents;
          $('#tuneVal', host).textContent = `${frame.pitch.name} ${c > 0 ? '+' : ''}${c}¢`;
          const tag = $('#tuneTag', host);
          tag.textContent = Math.abs(c) <= 8 ? 'in tune' : c > 0 ? 'sharp' : 'flat';
          tag.className = 'tag ' + (Math.abs(c) <= 8 ? 'ok' : Math.abs(c) <= 20 ? 'warn' : 'bad');
          UI.setGauge($$('.gauge', host)[1], c, 50);
          $('#tuneSub', host).textContent = `${frame.pitch.freq.toFixed(1)} Hz`;
        }
        // dynamics
        if (st.dynamics) {
          $('#dynLive', host).style.height = Math.round((st.dynamics.live || 0) * 100) + '%';
          if (st.dynamics.target != null) $('#dynTarget', host).style.height = Math.round(st.dynamics.target * 100) + '%';
          const tag = $('#dynTag', host);
          tag.textContent = st.dynamics.mark;
          if (st.dynamics.delta != null) {
            tag.className = 'tag ' + (Math.abs(st.dynamics.delta) < 0.25 ? 'ok' : 'warn');
            $('#dynSub', host).textContent = Math.abs(st.dynamics.delta) < 0.25 ? 'Matching the song’s dynamics' : st.dynamics.delta < 0 ? `Song is ${st.dynamics.mark} — play louder` : `Song is ${st.dynamics.mark} — play softer`;
          }
        }
      }
      let lastResult = null, lastResultAt = 0;

      // ---------- Visual loop (playback + ring) ----------
      let raf = 0;
      let lastStrumSlot = -1;
      const tick = () => {
        raf = requestAnimationFrame(tick);
        const t = player.time;
        if (timeline) {
          timeline.setTime(t);
          $('#timeLbl', host).textContent = `${UI.fmtTime(t)} / ${UI.fmtTime(a.duration)}`;
        }
        let expected = null;
        if (a) {
          const at = Analyzer.chordAt(a, t);
          expected = at && at.chord.name !== 'N' ? at.chord : null;
          $('#expName', host).textContent = expected ? expected.name : '—';
          $('#expSub', host).textContent = expected ? `${expected.roman || ''} ${expected.fn ? '· ' + expected.fn : ''}` : player.playing ? 'no chord' : 'press play';
          const nxt = at && at.next && at.next.name !== 'N' ? at.next : at && at.next ? (a.chords[at.index + 2] || null) : null;
          $('#nextName', host).textContent = nxt ? nxt.name : '—';
          if (nxt && at) {
            const span = Math.max(0.01, nxt.start - at.chord.start), left = nxt.start - t;
            $('#nextBar', host).style.width = Math.max(0, Math.min(100, (1 - left / span) * 100)) + '%';
            $('#nextIn', host).textContent = left > 0 ? left.toFixed(1) + 's' : '';
          }
          // strum lane
          if (strumSlots.length && a.strum) {
            const pos = Rhythm.beatPosition(t, a.beats);
            let slot = -1;
            if (pos && player.playing) {
              const bpb = a.strum.beatsPerBar, phase = a.meter.downbeatPhase || 0;
              const beatInBar = (((pos.index - phase) % bpb) + bpb) % bpb;
              slot = beatInBar * a.strum.grid + Math.min(a.strum.grid - 1, Math.floor(pos.frac * a.strum.grid));
            }
            if (slot !== lastStrumSlot) {
              if (strumSlots[lastStrumSlot]) strumSlots[lastStrumSlot].classList.remove('now');
              if (strumSlots[slot]) strumSlots[slot].classList.add('now');
              lastStrumSlot = slot;
            }
          }
        }
        const f = latest && latest.active ? latest : null;
        const shownChord = expected || (f && f.chord) || null;
        ring.draw(f ? f.chroma : null, expected ? expected.pcs : f && f.chord ? f.chord.pcs : [], f && f.chord ? f.chord.name : f && f.pitch ? f.pitch.name : '', expected ? 'target ' + expected.name : listening ? 'listening' : 'idle', f ? Math.max(0, (f.db + 60) / 50) : 0);
        const livePcs = f && f.chroma ? new Set(PM.CoachUtil.topPcs(f.chroma)) : null;
        if (fret) {
          const shape = shownChord && shownChord.root != null ? Theory.guitarShape(shownChord.root, shownChord.type) : null;
          fret.set(shape, livePcs, f && f.pitch && (!f.notes || f.notes.length <= 1) ? f.pitch.midi : null);
          const dname = shownChord ? Theory.chordName(shownChord.root, shownChord.type, a && a.key && a.key.preferFlat) : null;
          const d = $('#diagram', host);
          if (d && d.dataset.name !== dname) { d.dataset.name = dname || ''; d.innerHTML = dname ? UI.chordDiagram(dname) : '<span class="muted small">No chord</span>'; }
        }
        if (kbd) {
          let exp = [];
          if (a && player.playing) {
            exp = a.source === 'midi' ? Analyzer.notesAt(a, t, 0.02).map((n) => n.midi) : expected ? Theory.pianoVoicing(expected.root, expected.type) : [];
          } else if (expected) exp = Theory.pianoVoicing(expected.root, expected.type);
          kbd.set(exp, f ? f.notes.map((n) => n.midi) : []);
        }
      };
      raf = requestAnimationFrame(tick);

      return () => {
        cancelAnimationFrame(raf);
        stopListening(false);
        if (typeof cleanupTrack === 'function') cleanupTrack();
      };
    },
  });
})(typeof self !== 'undefined' ? self : globalThis);
