/* Cadenza — widgets shared by several views. */
(function (root) {
  'use strict';
  const PM = root.PM;
  const { UI } = PM;
  const { icon, el, esc } = UI;

  /** Drag-and-drop uploader with analysis progress. onDone(entry) */
  function uploader(container, onDone, opts) {
    opts = opts || {};
    const App = PM.App;
    container.innerHTML = `
      <div class="dropzone" tabindex="0" role="button" aria-label="Upload a song, audio or MIDI clip">
        <div class="dz-icon">${icon('upload')}</div>
        <h3>${esc(opts.title || 'Drop a song, audio clip or MIDI file')}</h3>
        <p>${esc(opts.sub || 'Cadenza analyses it on your device — key, chords, tempo, time signature, dynamics' + (PM.Instruments.get(App.instrument).strum ? ' and strumming pattern' : '') + '. Nothing is uploaded.')}</p>
        <div class="formats"><span class="tag">MP3</span><span class="tag">WAV</span><span class="tag">M4A</span><span class="tag">OGG</span><span class="tag">FLAC</span><span class="tag">MIDI</span></div>
        <input type="file" accept="audio/*,.mid,.midi,.kar,.mp3,.wav,.m4a,.ogg,.flac,.aac,.webm" hidden>
      </div>
      <div class="row" style="justify-content:center;margin-top:12px">
        <span class="muted small">No file handy?</span>
        ${(() => { const I = PM.Instruments.get(App.instrument); return `<button class="btn sm ghost" data-demo="${I.id}">${icon(I.icon)} ${esc(I.short)} demo</button>`; })()}
      </div>`;
    // pick up where you left off (Safari on iPad may reload a background tab)
    PM.Audio.Library.list().then((items) => {
      const last = items.find((x) => x.analysis && x.analysis.beats);
      if (!last || !container.querySelector('.dropzone')) return;
      const row = document.createElement('div');
      row.className = 'row';
      row.style.cssText = 'justify-content:center;margin-top:8px';
      row.innerHTML = `<button class="btn sm" data-continue>${icon('play')} Continue with “${esc(last.name)}”</button>`;
      container.appendChild(row);
      row.querySelector('[data-continue]').onclick = () => run(async (p) => { p(0.3, 'Opening…'); await App.openFromLibrary(last); return last; });
    }).catch(() => {});
    const dz = container.querySelector('.dropzone');
    const input = dz.querySelector('input');
    const run = async (fn) => {
      container.innerHTML = `<div class="analyzing"><div class="orbit"></div><h3 class="an-label">Preparing…</h3><div class="progress"><i style="width:2%"></i></div><p class="small">All listening happens locally — works with no internet.</p></div>`;
      const bar = container.querySelector('.progress i'), label = container.querySelector('.an-label');
      try {
        const entry = await fn((p, l) => { bar.style.width = Math.round(p * 100) + '%'; if (l) label.textContent = l; });
        UI.toast(`Analysed “${entry.name}”`, { icon: '🔬' });
        onDone && onDone(entry);
      } catch (e) {
        console.error(e);
        UI.toast('Could not analyse that file: ' + (e.message || e), { icon: '⚠️', duration: 5000 });
        uploader(container, onDone, opts);
      }
    };
    const handle = (file) => file && run((p) => App.loadFile(file, p));
    dz.addEventListener('click', () => input.click());
    dz.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); input.click(); } });
    input.addEventListener('change', () => handle(input.files[0]));
    dz.addEventListener('dragover', (e) => { e.preventDefault(); dz.classList.add('over'); });
    dz.addEventListener('dragleave', () => dz.classList.remove('over'));
    dz.addEventListener('drop', (e) => { e.preventDefault(); dz.classList.remove('over'); handle(e.dataTransfer.files[0]); });
    container.querySelectorAll('[data-demo]').forEach((b) => b.addEventListener('click', () => {
      const kind = b.dataset.demo;
      run(() => App.loadDemo(kind));
    }));
  }

  function trackChips(a, instrument) {
    const key = a.key ? a.key.name : '—';
    const meter = a.meter ? a.meter.label : '—';
    return `
      <span class="chip">${icon('key')} Key <b>${esc(key)}</b></span>
      <span class="chip">${icon('metronome')} <b>${Math.round(a.tempo.bpm)}</b> BPM</span>
      <span class="chip">${icon('bolt')} <b>${esc(meter)}</b></span>
      <span class="chip">${icon('music')} <b>${a.chordSummary.unique.length}</b> chords</span>
      ${a.strum && PM.Instruments.get(instrument).strum ? `<span class="chip">${icon('hand')} <b>${esc(a.strum.patternText.replace(/ /g, ''))}</b></span>` : ''}`;
  }

  function stars(n) { return '★'.repeat(n) + '☆'.repeat(3 - n); }

  /** End-of-session summary modal + gamification hand-off. */
  function sessionSummary(summary, meta) {
    const App = PM.App;
    const res = App.game.recordSession(Object.assign({ summary }, meta));
    const acc = summary.accuracy == null ? '—' : Math.round(summary.accuracy * 100) + '%';
    const st = [0, 1, 2].map((i) => `<span class="${i < summary.stars ? '' : 'off'}">⭐</span>`).join('');
    UI.modal(`
      <div class="modal-top">
        <div class="now-label">Session complete</div>
        <div class="big-stars" style="margin:10px 0">${st}</div>
        <h1 style="color:#fff">${summary.stars >= 3 ? 'Outstanding!' : summary.stars === 2 ? 'Great session!' : summary.stars === 1 ? 'Nice work!' : 'Every minute counts!'}</h1>
        <div class="hero-stats" style="justify-content:center">
          <div class="hero-stat"><b>${acc}</b><span>Accuracy</span></div>
          <div class="hero-stat"><b>${summary.score || 0}</b><span>Score</span></div>
          <div class="hero-stat"><b>${summary.maxCombo || 0}×</b><span>Best combo</span></div>
          <div class="hero-stat"><b>+${res.xp}</b><span>XP earned</span></div>
        </div>
      </div>
      <div class="modal-body">
        ${summary.insights && summary.insights.length ? `<h3>What the coach heard</h3><ul style="color:var(--ink-2);line-height:1.7;margin:8px 0 14px;padding-left:20px">${summary.insights.map((i) => `<li>${esc(i)}</li>`).join('')}</ul>` : ''}
        <div class="notice">${icon('sparkle')}<div><b>Focus for next time</b><br>${esc(summary.focus || 'Keep going!')}</div></div>
        ${res.badges.length ? `<div class="row" style="margin-top:14px">${res.badges.map((b) => `<span class="chip">${b.icon} ${esc(b.name)}</span>`).join('')}</div>` : ''}
        <div class="row" style="justify-content:flex-end;margin-top:18px"><button class="btn primary" data-close>Done</button></div>
      </div>`);
    if (summary.stars >= 2) UI.confetti();
    return res;
  }

  /**
   * Loopback latency calibration: the metronome clicks through the speakers while the mic
   * listens; the median delay between scheduled clicks and detected onsets is the round-trip
   * input latency. Resolves to seconds (or null if too few clicks were heard).
   */
  async function calibrateLatency(onStatus) {
    const App = PM.App, m = App.metronome, live = App.live;
    const prev = { bpm: m.bpm, bpb: m.beatsPerBar, sub: m.subdivision, vol: m.volume, sound: m.sound, lat: live.latency };
    live.latency = 0;
    await live.start(App.settings.deviceId);
    m.stop(); m.bpm = 100; m.beatsPerBar = 4; m.subdivision = 1; m.sound = 'click'; m.setVolume(1);
    const offsets = [];
    const off = live.on((f) => {
      if (!f.onset || !m.running) return;
      const a = m.anchor;
      const k = Math.floor((f.time - a.time) / a.interval + 0.15);
      const d = f.time - (a.time + k * a.interval);
      if (k >= 0 && d >= -0.02 && d < 0.35) offsets.push(d);
    });
    m.start();
    for (let i = 6; i > 0; i--) { onStatus && onStatus(`Listening to clicks… ${i}`); await new Promise((r) => setTimeout(r, 1000)); }
    m.stop(); off(); live.stop();
    m.bpm = prev.bpm; m.beatsPerBar = prev.bpb; m.subdivision = prev.sub; m.sound = prev.sound; m.setVolume(prev.vol); live.latency = prev.lat;
    if (offsets.length < 4) return null;
    offsets.sort((x, y) => x - y);
    return Math.max(0, Math.min(0.3, offsets[Math.floor(offsets.length / 2)]));
  }

  /** Backing-track generator form (any key, progression, style, tempo). */
  function backingForm(container, onDone) {
    const App = PM.App, I = PM.Instruments.get(App.instrument);
    const keys = PM.Theory.FLATS.map((n, i) => `<option value="${i}" ${i === 7 ? 'selected' : ''}>${n}</option>`).join('');
    container.innerHTML = `
      <div class="dropzone" style="cursor:default;text-align:left">
        <div class="row" style="gap:12px;margin-bottom:12px"><div class="dz-icon" style="margin:0;width:48px;height:48px">${icon('layers')}</div>
        <div><h3>Generate a backing track</h3><p style="margin-top:2px">Drums, bass & chords — <b>without your ${esc(I.short.toLowerCase())}</b>. Perfect for improvising.</p></div></div>
        <div class="grid g2" style="gap:10px">
          <label class="field">Key<select data-k="tonic">${keys}</select></label>
          <label class="field">Progression<select data-k="progression">${Object.entries(PM.Backing.PROGRESSIONS).map(([k, v]) => `<option value="${k}">${esc(v.name)}</option>`).join('')}</select></label>
          <label class="field">Style<select data-k="style">${Object.entries(PM.Backing.STYLES).map(([k, v]) => `<option value="${k}">${esc(v)}</option>`).join('')}</select></label>
          <label class="field">Tempo (BPM)<input type="number" data-k="bpm" value="96" min="40" max="220"></label>
        </div>
        <button class="btn primary" style="margin-top:14px;width:100%">${icon('sparkle')} Create backing track</button>
      </div>`;
    container.querySelector('[data-k="progression"]').onchange = (e) => {
      const st = container.querySelector('[data-k="style"]');
      st.value = { blues: 'swing', jazz: 'swing', funk: 'funk', ballad: 'ballad' }[e.target.value] || 'rock';
    };
    container.querySelector('button').onclick = async (e) => {
      const opts = {};
      container.querySelectorAll('[data-k]').forEach((x) => (opts[x.dataset.k] = x.dataset.k === 'progression' || x.dataset.k === 'style' ? x.value : +x.value));
      opts.choruses = Math.max(2, Math.ceil(48 / PM.Backing.PROGRESSIONS[opts.progression].bars.length));
      e.currentTarget.disabled = true;
      try {
        const entry = await App.loadBacking(opts);
        UI.toast('Backing track ready: ' + entry.name.replace('Backing — ', ''), { icon: '🥁' });
        if (App.settings.studioMode !== 'improv') { App.settings.studioMode = 'improv'; App.saveSettings(); }
        onDone && onDone(entry);
      } catch (err) { console.error(err); UI.toast('Could not create the backing track: ' + err.message, { icon: '⚠️' }); }
    };
  }

  /** Per-stem gains for a named practice-mix preset (null if not possible for this track). */
  function presetGains(t, pid) {
    const stems = t.sep ? t.sep.stems : [], part = t.partStem;
    if (pid === 'full') return {};
    if (pid === 'backing') return part ? { [part]: 0 } : null;
    if (pid === 'part') return part ? Object.fromEntries(stems.map((s) => [s.id, s.id === part ? 1 : 0])) : null;
    if (pid === 'rhythm') return Object.fromEntries(stems.map((s) => [s.id, PM.Separation.DRUM_IDS.includes(s.id) || s.id === 'bass' ? 1 : 0]));
    if (pid === 'novocals') return Object.fromEntries(stems.map((s) => [s.id, s.id === 'vocals' ? 0 : 1]));
    return {};
  }

  /** Stem mixer: separate (audio) or list (MIDI) instruments, presets, mute/solo/volume. */
  function mixer(container, App) {
    const t = App.track, I = PM.Instruments.get(App.instrument);
    if (!container || !t) return;
    const head = `<div class="card-head"><h3>${icon('layers')} Instruments & practice mix</h3><span class="muted small">${t.kind === 'midi' ? 'Exact separation from MIDI' : 'On-device separation (approximate)'}</span></div>`;
    if (!t.stemsReady) {
      container.innerHTML = `${head}
        <div class="row"><p style="flex:1;min-width:240px">Split this song into <b>vocals, guitars & piano, pads & strings, bass, kick, snare and cymbals</b> (MIDI files: every instrument family exactly). Then play along with the full song, a <b>backing track without your ${esc(I.short.toLowerCase())}</b>, or your part on its own.</p>
        <button class="btn primary" id="sepBtn">${icon('layers')} Separate instruments</button></div>
        <div id="sepProg" class="hidden" style="margin-top:12px"><div class="row"><span class="small an-label">Preparing…</span></div><div class="progress" style="margin-top:6px"><i style="width:0"></i></div></div>`;
      container.querySelector('#sepBtn').onclick = async (e) => {
        e.currentTarget.disabled = true;
        const prog = container.querySelector('#sepProg');
        prog.classList.remove('hidden');
        try {
          await App.separateStems((p, l) => { prog.querySelector('i').style.width = Math.round(p * 100) + '%'; if (l) prog.querySelector('.an-label').textContent = l; });
          UI.toast('Instruments separated', { icon: '🎚️' });
          mixer(container, App);
        } catch (err) { console.error(err); UI.toast('Separation failed: ' + err.message, { icon: '⚠️' }); e.currentTarget.disabled = false; }
      };
      return;
    }
    const stems = t.sep.stems, part = t.partStem;
    const gains = Object.assign({}, t.gains || {});
    const presets = ['full', 'backing', 'part', 'rhythm'].concat(stems.some((s) => s.id === 'vocals') && part !== 'vocals' ? ['novocals'] : []).map((pid) => ({ id: pid, label: { full: 'Full song', backing: `Backing track (no ${I.short.toLowerCase()})`, part: `My ${I.short.toLowerCase()} part only`, rhythm: 'Drums & bass only', novocals: 'Karaoke (no vocals)' }[pid], g: presetGains(t, pid) }));
    const drumIds = stems.filter((s) => s.group === 'drums').map((s) => s.id);
    container.innerHTML = `${head}
      <div class="presets">${presets.map((p) => `<button class="btn sm ${t.mixPreset === p.id ? 'primary' : 'ghost'}" data-p="${p.id}" ${p.g ? '' : 'disabled title="Your instrument is not in this song"'}>${esc(p.label)}</button>`).join('')}</div>
      ${part ? '' : `<p class="small" style="margin-top:8px">No separate ${esc(I.short.toLowerCase())} part was found in this track — use the full song or improvise over it.</p>`}
      ${drumIds.length > 1 ? `<div class="row" style="margin-top:10px"><button class="mini-btn" id="drumGrp">${drumIds.every((id) => gains[id] === 0) ? 'Unmute' : 'Mute'} all drums</button><span class="muted small">${stems.length} stems</span></div>` : ''}
      <div class="mixer">${stems.map((s) => `
        <div class="stem-row ${s.id === part ? 'part' : ''} ${gains[s.id] === 0 ? 'muted' : ''}" data-id="${s.id}">
          <span class="s-ic">${s.icon}</span><div><b>${esc(s.name)}</b>${s.id === part ? '<span class="tag">your part</span>' : ''}</div>
          <button class="mini-btn mute ${gains[s.id] === 0 ? 'on' : ''}" title="Mute">M</button>
          <button class="mini-btn solo" title="Solo">S</button>
          <input type="range" min="0" max="1.5" step="0.05" value="${gains[s.id] == null ? 1 : gains[s.id]}">
        </div>`).join('')}</div>`;
    const apply = (g, presetId) => {
      t.mixPreset = presetId || null;
      App.applyMix(g);
      mixer(container, App);
    };
    container.querySelectorAll('[data-p]').forEach((b) => (b.onclick = () => { const p = presets.find((x) => x.id === b.dataset.p); apply(p.g, p.id); }));
    const dg = container.querySelector('#drumGrp');
    if (dg) dg.onclick = () => { const mute = !drumIds.every((id) => gains[id] === 0); drumIds.forEach((id) => (gains[id] = mute ? 0 : 1)); apply(gains); };
    container.querySelectorAll('.stem-row').forEach((row) => {
      const id = row.dataset.id;
      row.querySelector('.mute').onclick = () => { gains[id] = gains[id] === 0 ? 1 : 0; apply(gains); };
      row.querySelector('.solo').onclick = () => apply(Object.fromEntries(stems.map((s) => [s.id, s.id === id ? 1 : 0])));
      row.querySelector('input').onchange = (e) => { gains[id] = +e.target.value; apply(gains); };
    });
  }

  /** "Listen" buttons on submission cards: fetch the recording (signed in) and play it inline. */
  function wireRecordingPlayers(container, subs) {
    container.querySelectorAll('[data-listen]').forEach((b) => (b.onclick = async () => {
      const s = subs.find((x) => x.id === b.dataset.listen);
      if (!s || !s.recording) return;
      const box = b.closest('.rec-player') || b.parentElement;
      const a = await PM.DocView.audioPlayer(box, s.recording);
      if (a) a.play().catch(() => {});
    }));
  }

  PM.Shared = { uploader, trackChips, stars, sessionSummary, calibrateLatency, backingForm, mixer, presetGains, wireRecordingPlayers };
})(typeof self !== 'undefined' ? self : globalThis);
