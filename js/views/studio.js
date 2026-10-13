/* Overture — Live Studio: play the part or improvise over a track (full mix, backing track
 * or your isolated part) with real-time AI coaching for piano, guitars, bass and trumpet. */
(function (root) {
  'use strict';
  const PM = root.PM;
  const { UI, Theory, Analyzer, Rhythm, DSP, Instruments } = PM;
  const { icon, esc, $, $$ } = UI;

  const MSG_ICON = { praise: '✅', fix: '🛠️', instruction: '👉', tip: '💡', info: '🎼' };

  PM.App.register({
    id: 'studio', title: 'Live Studio', nav: 'Studio', icon: 'mic',
    render(host, App) {
      const inst = App.instrument;
      const I = Instruments.get(inst);
      const track = App.track;
      const a = track && track.analysis;
      const player = App.player;
      const engineName = App.settings.source === 'midi' ? 'midi' : 'mic';
      const mode = App.settings.studioMode === 'improv' ? 'improv' : 'part';
      const improv = mode === 'improv';
      const visual = I.family === 'keys' ? 'keys' : I.family === 'brass' ? 'brass' : I.family === 'voice' ? 'voice' : I.family === 'drums' ? 'drums' : 'fret';

      host.innerHTML = `
        <div class="page-head">
          <div><div class="eyebrow">Live Studio · ${esc(I.label)}</div><h1>${improv ? 'Improvise & get coached' : 'Play along & get coached'}</h1>
          <p>${improv ? 'Solo over a backing track. The coach shows which notes fit each chord, praises good targeting and tells you when a note clashes.' : a ? 'Hit play, start listening and play over the track — full mix, a backing track without your part, or your part alone.' : 'Load a song, generate a backing track — or just start listening for free-play coaching.'}</p></div>
          <div class="row">
            <div class="seg" id="modeSeg"><button data-mode="part" class="${!improv ? 'on' : ''}">${icon('music')} Play the part</button><button data-mode="improv" class="${improv ? 'on' : ''}">${icon('improv')} Improvise</button></div>
          </div>
        </div>
        ${inst === 'bass' ? `<div class="row" style="margin-bottom:12px">${PM.Shared.bassStrings(App)}</div>` : ''}
        <div class="row mobile-inst" style="margin-bottom:12px"><div class="seg">${Instruments.list().map((x) => `<button data-inst="${x.id}" class="${x.id === inst ? 'on' : ''}">${x.emoji} ${esc(x.short)}</button>`).join('')}</div></div>

        <section class="card" id="trackCard"></section>
        ${a ? '<section class="card" id="mixCard" style="margin-top:18px"></section>' : ''}

        <section class="card stage" style="margin-top:18px">
          <div class="input-bar">
            <div class="seg" id="srcSeg">
              <button data-src="mic" class="${engineName === 'mic' ? 'on' : ''}">${icon('mic')} Mic / Line-in</button>
              <button data-src="midi" class="${engineName === 'midi' ? 'on' : ''}">${icon('midi')} MIDI device</button>
            </div>
            <select id="devSel" title="Audio input" class="${engineName === 'midi' ? 'hidden' : ''}"><option value="">Default input</option></select>
            <div class="row small" style="gap:8px"><span class="muted">Level</span><div class="level-meter"><i id="lvl" style="width:0"></i></div></div>
            <label class="switch small" title="Hear your input through the speakers/headphones"><input type="checkbox" id="monitor"><span class="track"></span>Monitor</label>
            ${a ? '' : `<label class="switch small"><input type="checkbox" id="metroAlong"><span class="track"></span>Metronome <span class="muted">${App.metronome.bpm}</span></label>`}
            <div class="spacer"></div>
            <span class="muted small" id="devLabel" style="max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap"></span>
            <button class="btn primary" id="listenBtn">${icon('mic')} Start listening</button>
            <button class="btn" id="recSend" title="Record yourself (with the track) and send it to your teacher">${icon('mic')} Record</button>
          </div>
        </section>

        <div class="live-grid">
          <section class="card stage now-card">
            ${improv ? `
            <div class="chord-pair">
              <div class="chord-box"><div class="now-label">Chord now</div><div class="cb-name" id="expName">—</div><div class="cb-sub" id="expSub"></div></div>
              <div class="chord-box" id="youBox"><div class="now-label">Your note</div><div class="cb-name" id="youName">—</div><div class="cb-sub" id="youSub">Start listening</div></div>
            </div>
            <div class="next-row" style="flex-direction:column;align-items:flex-start;gap:6px"><span class="now-label">Try this scale</span><b id="scaleName" style="font-size:17px">—</b><span class="muted small" id="targets"></span></div>
            <div class="improv-bar"><span class="now-label">Harmony fit</span><div class="fit-meter"><i id="fit" style="width:0"></i></div><span class="note-class" id="noteClass">—</span></div>` : a ? `
            <div class="chord-pair">
              <div class="chord-box" id="expBox"><div class="now-label">${I.chordal ? 'Song chord' : 'Song chord · your note'}</div><div class="cb-name" id="expName">—</div><div class="cb-sub" id="expSub"></div></div>
              <div class="chord-box" id="youBox"><div class="now-label">You're playing</div><div class="cb-name" id="youName">—</div><div class="cb-sub" id="youSub">Start listening</div></div>
            </div>
            <div class="next-row"><span class="now-label">Next</span><b id="nextName" style="font-size:20px;min-width:60px">—</b><div class="countdown"><i id="nextBar" style="width:0"></i></div><span class="muted small" id="nextIn"></span></div>` : `
            <div><div class="now-label">You're playing</div><div class="big-chord" id="youName">—</div><div class="muted" id="youSub" style="margin-top:6px">Start listening and play</div></div>
            <div><div class="now-label" style="margin-bottom:8px">${I.chordal ? 'Chord history' : 'Note history'}</div><div class="chord-history" id="history"><span class="muted small">Appears here as you play</span></div></div>
            <div class="next-row"><span class="now-label">Key</span><b id="liveKey" style="font-size:16px">listening…</b></div>`}
            <div class="score-row">
              <div class="score-cell"><b id="score">0</b><span>Score</span></div>
              <div class="score-cell" id="comboCell"><b id="combo">0×</b><span>Combo</span></div>
              <div class="score-cell"><b id="acc">—</b><span>${improv ? 'Fit' : 'Accuracy'}</span></div>
            </div>
          </section>
          <section class="card stage">
            <div class="card-head"><h3>${icon('sparkle')} Harmony radar</h3><span class="muted small" id="notesHeard"></span></div>
            <canvas class="ring-vis" id="ring"></canvas>
          </section>
          <section class="card stage">
            <div class="card-head"><h3>${icon('bolt')} AI coach</h3><span class="tag" id="coachState">idle</span></div>
            <div class="coach-feed" id="feed">
              <div class="msg info"><span class="m-ic">🎼</span><div>Hi! I listen locally and coach your ${esc(I.label.toLowerCase())}: ${improv ? 'note choices, targeting, range, rhythm and phrasing' : I.chordal ? 'chords, timing' + (I.strum ? ', strumming' : '') + (I.bends ? ', bends' : '') + ' and dynamics' : 'the right notes, timing, intonation' + (I.family === 'brass' ? ', tone steadiness' : '') + ' and dynamics'}. Press <b>Start listening</b>, then play.</div></div>
              ${a ? `<div class="msg tip"><span class="m-ic">🎧</span><div>Wear headphones so I hear only your ${esc(I.short.toLowerCase())}, not the track.</div></div>` : ''}
            </div>
          </section>
        </div>

        <div class="meters">
          <section class="card"><div class="card-head"><h3>${icon('target')} Timing</h3><span class="tag" id="timingTag">—</span></div>
            <div class="meter-val" id="timingVal">— ms</div><div class="meter-sub" id="timingSub">${a ? 'vs. the song’s beat grid' : 'Turn on the metronome to check timing'}</div>${UI.gaugeHtml(['early', '−50', '0', '+50', 'late'])}</section>
          <section class="card"><div class="card-head"><h3>${icon('tuner')} ${I.id === 'piano' ? 'Pitch' : 'Intonation'}</h3><span class="tag" id="tuneTag">—</span></div>
            <div class="meter-val" id="tuneVal">—</div><div class="meter-sub" id="tuneSub">${I.family === 'brass' ? 'Cents & steadiness of each note' : I.bends ? 'Cents — bends are measured too' : 'Single notes are measured in cents'}</div>${UI.gaugeHtml(['♭', '−25', '0', '+25', '♯'])}</section>
          <section class="card"><div class="card-head"><h3>${icon('wave')} Dynamics</h3><span class="tag" id="dynTag">—</span></div>
            <div class="dyn-bars">
              ${a ? '<div class="dyn-col"><div class="bar target"><i id="dynTarget" style="height:0"></i></div><span>Song</span></div>' : ''}
              <div class="dyn-col"><div class="bar"><i id="dynLive" style="height:0"></i></div><span>You</span></div>
            </div>
            <div class="meter-sub" id="dynSub" style="margin-top:8px">${a ? 'Match the song’s loudness: pp → ff' : 'Your playing level'}</div></section>
        </div>

        <section class="card instrument-panel">
          <div class="card-head"><h3>${icon(I.icon)} ${visual === 'keys' ? 'Keyboard' : visual === 'brass' ? 'Valves' : visual === 'voice' ? 'Pitch trail' : visual === 'drums' ? 'Drum lane' : 'Fretboard'}</h3>
            <div class="legend">${improv ? '<span><i style="background:var(--v-500)"></i>Chord tones</span><span><i style="background:var(--v-200);border:1px solid var(--v-300)"></i>Scale tones</span><span><i style="background:var(--pink)"></i>You</span>' : visual === 'fret' ? (I.chordal ? '<span><i style="background:var(--v-500)"></i>Chord shape</span><span><i style="background:#10b981"></i>Heard</span><span><i style="background:#f43f5e"></i>Missing</span>' : '<span><i style="background:#10b981"></i>Target note</span><span><i style="background:var(--v-500)"></i>Chord tones</span><span><i style="background:var(--pink)"></i>You</span>') : visual === 'voice' ? '<span><i style="background:var(--v-200)"></i>Melody to sing</span><span><i style="background:#10b981"></i>In tune</span><span><i style="background:#f59e0b"></i>Close</span><span><i style="background:#f43f5e"></i>Off</span>' : visual === 'keys' ? '<span><i style="background:var(--v-100);border:1px solid var(--v-300)"></i>Expected</span><span><i style="background:var(--fuchsia)"></i>You played</span><span><i style="background:#10b981"></i>Correct</span>' : '<span>Written pitch for B♭ trumpet</span>'}</div></div>
          ${visual === 'drums' ? `<canvas class="drum-lane" id="drumLane"></canvas><p class="small muted" style="margin-top:8px">${a && a.part && a.part.notes && a.part.notes.length ? 'The song’s drum part scrolls past the line — your hits flash on the lane (green = in time).' : 'Load a song or backing track: the beat grid scrolls past the line and your hits flash on it.'} <a href="#/drums">Drum Studio →</a></p>` : ''}
          ${visual === 'fret' ? `<div class="inst-row"><div class="fret-wrap" id="fret"></div>${I.chordal ? '<div id="diagram" style="min-width:110px;display:grid;place-items:center"></div>' : ''}</div>
            ${a && a.strum && I.strum && !improv ? `<div class="card-head" style="margin:16px 0 6px"><h3>${icon('hand')} Strumming pattern <span class="muted small" style="font-weight:600">· ${esc(a.strum.gridLabel)} · ${Math.round(a.strum.consistency * 100)}% of bars</span></h3></div><div id="strum">${UI.strumLaneHtml(a.strum)}</div>` : ''}` :
            visual === 'voice' ? `<canvas class="pitch-trail" id="trail"></canvas>
            <div class="row small" style="margin-top:10px;gap:14px;flex-wrap:wrap"><span class="muted" id="trailSrc">${a ? (a.part && a.part.notes && a.part.notes.length ? 'Target: the vocal part' : a.melody && a.melody.length ? 'Target: the melody Overture heard in the song' : 'No melody found — free singing') : 'Free singing — load a song or use the Exercise path for a melody to follow'}</span><span>In tune <b id="trailAcc">—</b></span>${a ? '<button class="btn sm ghost" id="karaoke">🎤 Sing-along mix (mute vocals)</button>' : ''}</div>` :
            visual === 'keys' ? '<div class="keyboard-wrap" id="kbd"></div>' : visual === 'drums' ? '' : `<div id="valves">${UI.valvesHtml()}</div>`}
        </section>
        ${a && visual !== 'voice' && visual !== 'drums' && !improv ? '<section class="card stage fp-card" id="fpCard"></section>' : ''}`;

      $$('#modeSeg button', host).forEach((b) => (b.onclick = () => { App.settings.studioMode = b.dataset.mode; App.saveSettings(); App.rerender(); }));
      $$('.mobile-inst [data-inst]', host).forEach((b) => (b.onclick = () => App.setInstrument(b.dataset.inst)));
      PM.Shared.wireBassStrings(host, App);

      // ---------- Track card ----------
      const trackCard = $('#trackCard', host);
      let timeline = null, cleanupTrack = null;
      const secs = a ? Analyzer.sections(a) : [];
      if (!a) {
        trackCard.innerHTML = `<div class="grid g2"><div id="up"></div><div id="backingBox"></div></div>`;
        PM.Shared.uploader($('#up', trackCard), () => App.rerender());
        PM.Shared.backingForm($('#backingBox', trackCard), () => App.rerender());
      } else {
        trackCard.innerHTML = `
          <div class="track-head">
            <div class="track-art">${icon(track.kind === 'midi' ? 'midi' : 'music')}</div>
            <div class="track-title"><h2>${esc(track.name)}</h2><div class="chips">${PM.Shared.trackChips(a, inst)}</div></div>
            <select id="trackSw" class="track-switch" title="Switch to another saved track" aria-label="Switch track"><option value="">Switch track…</option></select>
            <a class="btn ghost sm" href="#/insights">${icon('insights')} Insights</a>
            <button class="btn ghost sm" id="changeTrack">${icon('upload')} New</button>
          </div>
          <div class="timeline-wrap"><canvas class="timeline" id="tl"></canvas></div>
          <div class="nav-row">
            <button class="btn ghost sm" id="prevChord" title="Previous chord ([)">${icon('back')} Chord</button>
            <button class="btn ghost sm" id="nextChord" title="Next chord (])">Chord ⏭</button>
            <div class="section-chips" id="secChips">${secs.map((x, i) => `<button class="sec-chip" data-i="${i}" title="Bar ${x.bar} · ${UI.fmtTime(x.start)}"><b>${esc(x.letter)}</b>${esc(x.label)}</button>`).join('')}</div>
          </div>
          <div class="transport">
            <button class="btn primary round" id="playBtn" aria-label="Play">${icon('play')}</button>
            <button class="btn ghost icon" id="rewBtn" title="Back 5 s">${icon('back')}</button>
            <span class="time" id="timeLbl">0:00 / ${UI.fmtTime(a.duration)}</span>
            <label class="switch small"><input type="checkbox" id="countIn" checked><span class="track"></span>Count-in</label>
            <button class="btn ghost sm" id="loopBtn">${icon('loop')} Loop 2 bars</button>
            <div class="spacer"></div>
            <div class="speed">Speed <input type="range" id="speed" min="0.5" max="1.25" step="0.05" value="${player.rate || 1}"><b id="speedLbl">${Math.round((player.rate || 1) * 100)}%</b></div>
          </div>
          <p class="muted small" style="margin-top:8px">${matchMedia('(hover: none)').matches ? 'Tap the timeline to jump · use Loop 2 bars to repeat a section · slowing down keeps the pitch.' : 'Click the timeline to seek · Shift-drag to loop · Space play/pause · [ ] previous/next chord · 1–9 jump to a section · L listen · slowing down keeps the pitch.'}</p>`;
        timeline = new UI.Timeline($('#tl', host), a, {
          onSeek: (t) => { player.time = t; timeline.setTime(t); },
          onLoop: (loop) => { player.setLoop(loop && loop.a, loop && loop.b); $('#loopBtn', host).classList.toggle('primary', !!loop); },
        });
        if (player.loop) timeline.loop = player.loop;
        $('#changeTrack', host).onclick = () => { player.pause(); App.setTrack(null); App.rerender(); };
        // ---- quick navigation: saved tracks, sections, chord by chord, floating mini transport
        const fillSwitcher = async (sel) => {
          const items = await PM.Audio.Library.list();
          sel.innerHTML = '<option value="">Switch track…</option>' + items.slice(0, 40).map((it) => `<option value="${esc(it.id)}" ${it.id === track.id ? 'disabled' : ''}>${esc(it.name)}${it.analysis && it.analysis.key ? ' · ' + esc(it.analysis.key.name) : ''}</option>`).join('');
          sel.onchange = async () => {
            const it = items.find((x) => x.id === sel.value);
            if (!it) return;
            sel.disabled = true;
            player.pause();
            UI.toast(`Opening “${it.name}”…`, { icon: '📂' });
            try { await App.openFromLibrary(it); } catch (e) { UI.toast('Could not open: ' + (e.message || e), { icon: '⚠️' }); }
            App.rerender();
          };
        };
        fillSwitcher($('#trackSw', host));
        const seek = (t) => { player.time = Math.max(0, Math.min(a.duration - 0.05, t)); timeline.setTime(player.time); };
        const chordStep = (dir) => {
          const t = player.time, cs = a.chords.filter((c) => c.name !== 'N');
          if (dir > 0) { const n = cs.find((c) => c.start > t + 0.05); if (n) seek(n.start); }
          else {
            let i = -1;
            cs.forEach((c, k) => { if (c.start <= t) i = k; });
            const cur = cs[i];
            if (cur && t - cur.start > 0.6) seek(cur.start); else if (cs[Math.max(0, i - 1)]) seek(cs[Math.max(0, i - 1)].start);
          }
        };
        $('#prevChord', host).onclick = () => chordStep(-1);
        $('#nextChord', host).onclick = () => chordStep(1);
        $$('#secChips .sec-chip', host).forEach((b) => (b.onclick = () => { const x = secs[+b.dataset.i]; seek(x.start); if (!player.playing) togglePlay(); }));
        const mini = document.createElement('div');
        mini.className = 'mini-transport hidden';
        mini.innerHTML = `<button class="btn primary round sm" id="mPlay" aria-label="Play">${icon('play')}</button>
          <div class="mt-main"><b>${esc(track.name)}</b><span class="small" id="mInfo">—</span></div>
          <button class="btn ghost sm icon" id="mPrev" title="Previous chord">${icon('back')}</button>
          <button class="btn ghost sm icon" id="mNext" title="Next chord">⏭</button>
          <select id="mSec" aria-label="Jump to section"><option value="">Sections</option>${secs.map((x, i) => `<option value="${i}">${esc(x.label)}</option>`).join('')}</select>
          <select id="mTrack" class="track-switch" aria-label="Switch track"></select>`;
        document.body.appendChild(mini);
        fillSwitcher($('#mTrack', mini));
        $('#mPlay', mini).onclick = () => togglePlay();
        $('#mPrev', mini).onclick = () => chordStep(-1);
        $('#mNext', mini).onclick = () => chordStep(1);
        $('#mSec', mini).onchange = (e) => { const x = secs[+e.target.value]; if (x) seek(x.start); e.target.value = ''; };
        const io = 'IntersectionObserver' in root ? new IntersectionObserver(([en]) => { mini.classList.toggle('hidden', en.isIntersecting); document.body.classList.toggle('has-mini', !en.isIntersecting); }, { threshold: 0 }) : null;
        if (io) io.observe($('.transport', trackCard));
        const miniTimer = setInterval(() => {
          if (mini.classList.contains('hidden')) return;
          const at = Analyzer.chordAt(a, player.time);
          const sec = secs.find((x) => player.time >= x.start && player.time < x.end);
          $('#mInfo', mini).textContent = `${UI.fmtTime(player.time)} / ${UI.fmtTime(a.duration)}${sec ? ' · ' + sec.label : ''}${at && at.chord.name !== 'N' ? ' · ' + at.chord.name : ''}`;
          $('#mPlay', mini).innerHTML = icon(player.playing ? 'pause' : 'play');
          $$('#secChips .sec-chip', host).forEach((b, i) => b.classList.toggle('on', secs[i] === sec));
        }, 250);
        const secTimer = setInterval(() => { const sec = secs.find((x) => player.time >= x.start && player.time < x.end); $$('#secChips .sec-chip', host).forEach((b, i) => b.classList.toggle('on', secs[i] === sec)); }, 400);
        const cleanMini = () => { clearInterval(miniTimer); clearInterval(secTimer); if (io) io.disconnect(); mini.remove(); document.body.classList.remove('has-mini'); };
        const playBtn = $('#playBtn', host);
        const setPlayIcon = () => { playBtn.innerHTML = icon(player.playing ? 'pause' : 'play'); };
        let countingIn = false;
        const togglePlay = async () => {
          if (countingIn) return;
          if (player.playing) { player.pause(); return; }
          if ($('#countIn', host).checked) {
            countingIn = true;
            player.prime(); // iOS: the song starts after the count-in, outside this tap
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
        const keyHandler = (e) => {
          if (e.target.matches('input, select, textarea')) return;
          if (e.code === 'Space') { e.preventDefault(); togglePlay(); }
          if (e.key === 'l' || e.key === 'L') listenBtn.click();
          if (e.key === ']') chordStep(1);
          if (e.key === '[') chordStep(-1);
          if (/^[1-9]$/.test(e.key) && secs[+e.key - 1] && !e.metaKey && !e.ctrlKey) seek(secs[+e.key - 1].start);
        };
        addEventListener('keydown', keyHandler);
        cleanupTrack = () => { offPlayer(); removeEventListener('keydown', keyHandler); cleanMini(); };
        PM.Shared.mixer($('#mixCard', host), App);
      }

      // ---------- Instrument visuals ----------
      const kbd = visual === 'keys' ? new UI.PianoKeyboard($('#kbd', host), I.viewRange[0], I.viewRange[1]) : null;
      const fret = visual === 'fret' ? new UI.Fretboard($('#fret', host), { strings: I.strings, names: I.stringNames, frets: I.frets }) : null;
      const valves = visual === 'brass' ? $('#valves', host) : null;
      const VR = PM.Learn.RANGE.voice;
      const trail = visual === 'voice' ? new PM.PitchTrail.PitchTrail($('#trail', host), { low: VR.low - 2, high: VR.high + 2 }) : null;
      const melodyTargets = () => (a && a.part && a.part.notes && a.part.notes.length ? a.part.notes : a && a.melody ? a.melody : []);
      if (trail) trail.setTargets(melodyTargets());
      const karaokeBtn = $('#karaoke', host);
      if (karaokeBtn) karaokeBtn.onclick = async () => {
        karaokeBtn.disabled = true;
        try {
          if (!track.stemsReady) { UI.toast('Separating the vocals…', { icon: '🎛️' }); await App.separateStems(); }
          const g = PM.Shared.presetGains(track, 'novocals');
          App.applyMix(g);
          track.mixPreset = track.partStem === 'vocals' ? 'backing' : 'novocals';
          PM.Shared.mixer($('#mixCard', host), App);
          if (trail) trail.setTargets(melodyTargets());
          UI.toast('Sing-along mix on — the vocals are muted', { icon: '🎤' });
        } catch (e) { UI.toast('Could not separate: ' + (e.message || e), { icon: '⚠️' }); }
        karaokeBtn.disabled = false;
      };
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
      let listening = false, unsub = null, coach = null, sessionStart = 0, latest = null;
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
      $('#recSend', host).onclick = () => {
        const t = App.track, a = t && t.assignmentId ? PM.Sync.assignments.find((x) => x.id === t.assignmentId) : null;
        PM.RecordPanel.open({ title: a ? a.title : t ? t.name : 'My playing', assignmentId: a ? a.id : null, songId: t && t.songId, mode: App.settings.studioMode || 'part' });
      };

      async function startListening() {
        const engine = App.settings.source === 'midi' ? App.midiIn : App.live;
        try {
          App.live.latency = App.settings.latency;
          App.live.instrument = inst;
          const label = engine === App.live ? await App.live.start(App.settings.deviceId) : await App.midiIn.start();
          $('#devLabel', host).textContent = label || '';
          if (engine === App.live) fillDevices();
        } catch (e) {
          console.error(e);
          UI.toast(e.name === 'NotAllowedError' ? 'Microphone permission was denied. Allow mic access in your browser settings.' : 'Could not open the input: ' + (e.message || e), { icon: '🎤', duration: 5000 });
          return;
        }
        coach = improv ? new PM.Improv.ImprovCoach({ instrument: inst, reference: a, onMessage: pushMsg }) : new PM.Coach({ instrument: inst, reference: a, onMessage: pushMsg });
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
        const meta = { mode: improv ? 'improv' : 'studio', instrument: inst, seconds: Math.min(wall, summary.activeTime + 20), title: (improv ? 'Improv · ' : '') + (a ? track.name : 'Free play'), assignmentId: (track && track.assignmentId) || (App.activeAssignment && App.activeAssignment.id) || null, mixPreset: track && track.mixPreset };
        if (summary.activeTime > 8) {
          if (showSummary) PM.Shared.sessionSummary(summary, meta);
          else App.game.recordSession(Object.assign({ summary }, meta));
        }
      }
      listenBtn.onclick = () => (listening ? stopListening(true) : startListening());

      let lastResult = null, lastResultAt = 0;
      function onFrame(frame) {
        frame.refTime = a && player.playing ? player.time - (frame.source === 'mic' ? App.settings.latency : 0) * player.rate : null;
        frame.rate = player.rate;
        const grid = !(a && player.playing) && App.metronome.running ? App.metronome.grid(I.strum ? 2 : 1) : null;
        const st = improv ? coach.update(frame, frame.refTime) : coach.update(frame, grid);
        latest = frame;
        latest.state = st;
        if (trail) {
          const tt = a && player.playing ? frame.refTime : performance.now() / 1000;
          const m = frame.active && frame.pitch && frame.pitch.confidence > 0.6 ? frame.pitch.midi + (frame.pitch.cents || 0) / 100 : null;
          trail.push(tt, m);
          const acc = trail.accuracy();
          const ta = $('#trailAcc', host);
          if (ta) ta.textContent = acc == null ? '—' : Math.round(acc * 100) + '%';
        }
        $('#lvl', host).style.width = Math.max(0, Math.min(100, (frame.db + 70) * 1.6)) + '%';
        const youName = $('#youName', host), youSub = $('#youSub', host);
        const single = frame.active && frame.pitch && (!I.chordal || !frame.chord);
        if (frame.active && frame.chord && I.chordal && !improv) {
          youName.textContent = frame.chord.name;
          youSub.textContent = frame.chord.quality + (frame.chord.bass != null ? ' · inversion' : '');
        } else if (single || (improv && frame.active && frame.pitch)) {
          const nm = I.transpose ? DSP.midiName(frame.pitch.midi + I.transpose) : frame.pitch.name;
          youName.textContent = nm;
          youSub.textContent = I.transpose ? `concert ${frame.pitch.name}` : I.strings ? (() => { const p = Instruments.fretPosition(inst, frame.pitch.midi); return p ? `${I.stringNames[p.string]} string · ${p.fret ? 'fret ' + p.fret : 'open'}` : 'single note'; })() : 'single note';
        } else if (!frame.active) youSub.textContent = 'listening…';
        if (!a && frame.active) {
          const label = I.chordal && frame.chord ? frame.chord.name : frame.pitch && frame.pitch.confidence > 0.85 ? (I.transpose ? DSP.midiName(frame.pitch.midi + I.transpose) : frame.pitch.name) : null;
          if (label && (!history.length || history[history.length - 1] !== label)) {
            history.push(label);
            if (history.length > 16) history.shift();
            const h = $('#history', host);
            if (h) { h.innerHTML = history.map((c) => `<span class="ch">${esc(c)}</span>`).join(''); h.scrollLeft = 1e6; }
          }
        }
        const youBox = $('#youBox', host);
        if (youBox) {
          youBox.classList.remove('hit', 'close', 'miss');
          const res = improv ? (st.cls ? { chord: 'hit', scale: 'hit', blue: 'close', outside: 'miss' }[st.cls] : null) : st.chordResult ? st.chordResult.result : st.monoResult ? st.monoResult.result : null;
          if (res && frame.active) { youBox.classList.add(res); lastResult = res; lastResultAt = performance.now(); }
          else if (lastResult && frame.active && performance.now() - lastResultAt < 400) youBox.classList.add(lastResult);
        }
        $('#notesHeard', host).textContent = frame.active && frame.notes.length ? frame.notes.slice(0, 6).map((n) => DSP.midiName(n.midi)).join(' ') : '';
        $('#score', host).textContent = st.score;
        $('#combo', host).textContent = st.combo + '×';
        $('#comboCell', host).classList.toggle('combo-hot', st.combo >= 10);
        const accVal = improv ? st.fit : st.accuracy;
        $('#acc', host).textContent = accVal == null ? '—' : Math.round(accVal * 100) + '%';
        if (st.liveKey && $('#liveKey', host)) $('#liveKey', host).textContent = st.liveKey.name;
        if (improv) {
          if (st.cls) { const nc = $('#noteClass', host); nc.textContent = { chord: 'chord tone', scale: 'scale tone', blue: 'blue note', outside: 'outside' }[st.cls]; nc.className = 'note-class ' + st.cls; }
          if (st.fit != null) $('#fit', host).style.width = Math.round(st.fit * 100) + '%';
        }
        if (st.timing) {
          const ms = Math.round(st.timing.offsetMs);
          $('#timingVal', host).textContent = (ms > 0 ? '+' : '') + ms + ' ms';
          const tag = $('#timingTag', host);
          tag.textContent = st.timing.label;
          tag.className = 'tag ' + (st.timing.label === 'perfect' ? 'ok' : Math.abs(ms) < 65 ? 'warn' : 'bad');
          UI.setGauge($$('.gauge', host)[0], ms, 100);
          $('#timingSub', host).textContent = st.timing.label === 'perfect' ? 'Right on the beat!' : ms < 0 ? 'Ahead of the beat (rushing)' : 'Behind the beat (dragging)';
        }
        if (frame.active && frame.pitch && frame.pitch.confidence > 0.85 && (!frame.notes || frame.notes.length <= 2)) {
          const c = frame.pitch.cents;
          $('#tuneVal', host).textContent = `${I.transpose ? DSP.midiName(frame.pitch.midi + I.transpose) : frame.pitch.name} ${c > 0 ? '+' : ''}${c}¢`;
          const tag = $('#tuneTag', host);
          tag.textContent = Math.abs(c) <= 8 ? 'in tune' : c > 0 ? 'sharp' : 'flat';
          tag.className = 'tag ' + (Math.abs(c) <= 8 ? 'ok' : Math.abs(c) <= 20 ? 'warn' : 'bad');
          UI.setGauge($$('.gauge', host)[1], c, 50);
          $('#tuneSub', host).textContent = st.bend ? `Bend ${Math.round(st.bend.cents)}¢ of ${st.bend.goal}¢` : st.steadiness != null ? `Steadiness ±${Math.round(st.steadiness)}¢` : `${frame.pitch.freq.toFixed(1)} Hz`;
        }
        if (st.dynamics) {
          $('#dynLive', host).style.height = Math.round((st.dynamics.live || 0) * 100) + '%';
          if (st.dynamics.target != null && $('#dynTarget', host)) $('#dynTarget', host).style.height = Math.round(st.dynamics.target * 100) + '%';
          const tag = $('#dynTag', host);
          tag.textContent = st.dynamics.mark;
          if (st.dynamics.delta != null) {
            tag.className = 'tag ' + (Math.abs(st.dynamics.delta) < 0.25 ? 'ok' : 'warn');
            $('#dynSub', host).textContent = Math.abs(st.dynamics.delta) < 0.25 ? 'Matching the song’s dynamics' : st.dynamics.delta < 0 ? `Song is ${st.dynamics.mark} — play louder` : `Song is ${st.dynamics.mark} — play softer`;
          }
        }
      }

      // ---------- Fingering guide for the melody / your part ----------
      let fpanel = null, fpStarts = null;
      if ($('#fpCard', host)) {
        const src = a.part && a.part.notes && a.part.notes.length ? a.part.notes : a.melody || [];
        // keep the line playable: one note at a time, moved by octaves into the instrument's range
        const mono = [];
        for (const n of src) { if (mono.length && n.start < mono[mono.length - 1].start + 0.05) continue; mono.push(n); }
        const lo = I.range[0], hi = I.strings ? Math.min(I.range[1], I.strings[I.strings.length - 1] + (I.frets || 15)) : I.range[1];
        if (mono.length >= 4) {
          const mean = mono.reduce((x, n) => x + n.midi, 0) / mono.length;
          const target = I.strings ? lo + 12 : (lo + hi) / 2;
          const shift = 12 * Math.round((target - mean) / 12);
          const notes = mono.map((n) => { let m = n.midi + shift; while (m < lo) m += 12; while (m > hi) m -= 12; return m; });
          fpStarts = mono.map((n) => n.start);
          $('#fpCard', host).innerHTML = `<div class="card-head"><h3>${icon('hand')} Fingering guide <span class="muted small" style="font-weight:600">· ${a.part && a.part.notes && a.part.notes.length ? 'your part' : 'the melody'}${shift ? ' (moved ' + (shift > 0 ? 'up ' : 'down ') + Math.abs(shift / 12) + ' octave' + (Math.abs(shift) > 12 ? 's' : '') + ' to fit your ' + esc(I.label.toLowerCase()) + ')' : ''}</span></h3></div><div id="fpBox"></div>`;
          fpanel = PM.FingerPanel.mount($('#fpBox', host), { inst, notes, starts: fpStarts, durs: mono.map((n) => Math.max(0.1, (n.end || n.start + 0.4) - n.start)), window: 14, title: false });
        } else $('#fpCard', host).remove();
      }

      // ---------- Drum lane (drums) ----------
      const drumLane = visual === 'drums' ? (() => {
        const cv = $('#drumLane', host), rows = ['crash', 'ride', 'hho', 'hhc', 'tomh', 'tomm', 'snare', 'toml', 'kick'];
        const partNotes = a && a.part && a.part.notes ? a.part.notes : [];
        const beats = a && a.beats ? a.beats : [];
        const hitsLive = [];
        let lastOnset = -1;
        return (t, frame) => {
          if (!cv || !cv.isConnected) return;
          const dpr = Math.min(2, root.devicePixelRatio || 1), w = cv.clientWidth || 600, h = 210;
          if (cv.width !== Math.round(w * dpr)) { cv.width = Math.round(w * dpr); cv.height = h * dpr; }
          const g = cv.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, w, h);
          const now = a && player.playing ? t : performance.now() / 1000;
          if (frame && frame.onset && frame.time !== lastOnset) { lastOnset = frame.time; hitsLive.push({ t: now, ok: !beats.length || beats.some((b) => Math.abs(b - now) < 0.07) || partNotes.some((n) => Math.abs(n.start - now) < 0.07) }); if (hitsLive.length > 40) hitsLive.shift(); }
          const px = w / 4, x0 = w * 0.22, xOf = (tt) => x0 + (tt - now) * px, rh = (h - 20) / rows.length;
          rows.forEach((id, i) => { g.fillStyle = i % 2 ? 'rgba(255,255,255,.03)' : 'rgba(255,255,255,.06)'; g.fillRect(0, i * rh, w, rh); g.fillStyle = PM.UI.rgba('tint', .7); g.font = '700 10px system-ui'; g.fillText(PM.DrumCore.PIECE[id].short, 4, i * rh + rh / 2 + 3); });
          g.fillStyle = 'rgba(255,255,255,.12)';
          for (const b of beats) { const x = xOf(b); if (x > 0 && x < w) g.fillRect(x, 0, 1, h - 20); }
          for (const n of partNotes) {
            const x = xOf(n.start); if (x < -10 || x > w + 10) continue;
            const id = PM.Voices.GM_DRUM[n.midi] || 'snare', r = rows.indexOf(id === 'hhp' ? 'hhc' : id === 'rim' ? 'snare' : id);
            if (r < 0) continue;
            g.fillStyle = PM.DrumCore.PIECE[id] ? PM.DrumCore.PIECE[id].color : PM.UI.col('v-400');
            g.beginPath(); g.arc(x, r * rh + rh / 2, 6, 0, Math.PI * 2); g.fill();
          }
          for (const hl of hitsLive) { const x = xOf(hl.t); if (x < -10) continue; g.fillStyle = hl.ok ? 'rgba(52,211,153,.85)' : 'rgba(251,113,133,.85)'; g.fillRect(x - 2, h - 18, 4, 16); }
          g.fillStyle = PM.UI.col('pink'); g.fillRect(x0, 0, 2, h);
        };
      })() : null;

      // ---------- Visual loop (playback + instrument) ----------
      let raf = 0, lastStrumSlot = -1;
      const tick = () => {
        raf = requestAnimationFrame(tick);
        const t = player.time;
        if (fpanel && player.playing) { const i = PM.FingerPanel.indexAt(fpStarts, t); if (i >= 0) fpanel.setCurrent(i); }
        if (timeline) {
          timeline.setTime(t);
          $('#timeLbl', host).textContent = `${UI.fmtTime(t)} / ${UI.fmtTime(a.duration)}`;
        }
        let expected = null, at = null, partNote = null;
        if (a) {
          at = Analyzer.chordAt(a, t);
          expected = at && at.chord.name !== 'N' ? at.chord : null;
          if (a.part && a.part.notes && player.playing) {
            const ns = Analyzer.notesAt({ notes: a.part.notes }, t, 0.04);
            if (ns.length) partNote = ns[ns.length - 1].midi;
          }
          const expName = $('#expName', host);
          if (expName) {
            const prevName = expName.textContent;
            expName.textContent = expected ? expected.name + (!I.chordal && !improv && partNote != null ? ' · ' + (I.transpose ? DSP.pcName(partNote + I.transpose) : DSP.pcName(partNote)) : '') : '—';
            if (expName.textContent !== prevName && expected) UI.bump(expName.closest('.chord-box'), 'pulse-once');
            $('#expSub', host).textContent = expected ? `${expected.roman || ''} ${expected.fn ? '· ' + expected.fn : ''}` : player.playing ? 'no chord' : 'press play';
          }
          const nextEl = $('#nextName', host);
          if (nextEl) {
            const nxt = at && at.next && at.next.name !== 'N' ? at.next : at && at.next ? (a.chords[at.index + 2] || null) : null;
            nextEl.textContent = nxt ? nxt.name : '—';
            if (nxt && at) {
              const span = Math.max(0.01, nxt.start - at.chord.start), left = nxt.start - t;
              $('#nextBar', host).style.width = Math.max(0, Math.min(100, (1 - left / span) * 100)) + '%';
              $('#nextIn', host).textContent = left > 0 ? left.toFixed(1) + 's' : '';
            }
          }
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
        const sug = improv ? PM.Improv.suggestions(expected, a ? a.key : f && f.state && f.state.liveKey) : null;
        if (improv && sug) {
          $('#scaleName', host).textContent = sug.scaleName;
          const pf = a && a.key && a.key.preferFlat;
          const tr = I.transpose || 0;
          $('#targets', host).textContent = `Chord tones ${sug.chordPcs.map((p) => Theory.spell(p + tr, pf)).join(' ')} · aim for ${sug.targetPcs.map((p) => Theory.spell(p + tr, pf)).join(' / ')} on the change${tr ? ' (written)' : ''}`;
        }
        const shownChord = expected || (f && f.chord) || null;
        ring.draw(f ? f.chroma : null, improv && sug ? sug.chordPcs : expected ? expected.pcs : f && f.chord ? f.chord.pcs : [], f && f.chord && I.chordal ? f.chord.name : f && f.pitch ? f.pitch.name : '', expected ? 'target ' + expected.name : listening ? 'listening' : 'idle', f ? Math.max(0, (f.db + 60) / 50) : 0);
        const livePcs = f && f.chroma ? new Set(PM.CoachUtil.topPcs(f.chroma)) : null;
        const liveNote = f && f.pitch && (!f.notes || f.notes.length <= 1 || !I.chordal) ? f.pitch.midi : null;
        if (fret) {
          if (improv && sug) fret.setMap(sug.chordPcs, sug.scalePcs, liveNote, null);
          else if (I.chordal) {
            const shape = shownChord && shownChord.root != null ? Theory.guitarShape(shownChord.root, shownChord.type) : null;
            fret.set(shape, livePcs, liveNote);
            const dname = shownChord && shownChord.root != null ? Theory.chordName(shownChord.root, shownChord.type, a && a.key && a.key.preferFlat) : null;
            const d = $('#diagram', host);
            if (d && d.dataset.name !== (dname || '')) { d.dataset.name = dname || ''; d.innerHTML = dname ? UI.chordDiagram(dname) : '<span class="muted small">No chord</span>'; }
          } else {
            const target = partNote != null ? partNote : expected ? 28 + ((((expected.bass != null ? expected.bass : expected.root) - 4) % 12) + 12) % 12 : null;
            fret.setMap(expected ? expected.pcs : [], [], liveNote, target);
          }
        }
        if (kbd) {
          if (improv && sug) kbd.setMap(sug.chordPcs, sug.scalePcs, f ? f.notes.map((n) => n.midi) : []);
          else {
            let exp = [];
            if (a && player.playing) exp = track.kind === 'midi' ? (a.part ? Analyzer.notesAt({ notes: a.part.notes }, t, 0.02) : Analyzer.notesAt(a, t, 0.02)).map((n) => n.midi) : expected ? Theory.pianoVoicing(expected.root, expected.type) : [];
            else if (expected) exp = Theory.pianoVoicing(expected.root, expected.type);
            kbd.set(exp, f ? f.notes.map((n) => n.midi) : []);
          }
        }
        if (trail) trail.draw(a && player.playing ? t : performance.now() / 1000);
        if (drumLane) drumLane(t, latest);
        if (valves) {
          let target = partNote;
          if (target == null && expected) target = 60 + expected.pcs[improv && sug ? 1 : 0] + (expected.pcs[0] < 4 ? 12 : 0);
          UI.setValves(valves, target, liveNote);
        }
      };
      raf = requestAnimationFrame(tick);

      return () => {
        cancelAnimationFrame(raf);
        stopListening(false);
        if (cleanupTrack) cleanupTrack();
      };
    },
  });
})(typeof self !== 'undefined' ? self : globalThis);
