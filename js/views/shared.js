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
        <p>${esc(opts.sub || 'Cadenza analyses it on your device — key, chords, tempo, time signature, dynamics' + (App.instrument === 'guitar' ? ' and strumming pattern' : '') + '. Nothing is uploaded.')}</p>
        <div class="formats"><span class="tag">MP3</span><span class="tag">WAV</span><span class="tag">M4A</span><span class="tag">OGG</span><span class="tag">FLAC</span><span class="tag">MIDI</span></div>
        <input type="file" accept="audio/*,.mid,.midi,.kar,.mp3,.wav,.m4a,.ogg,.flac,.aac,.webm" hidden>
      </div>
      <div class="row" style="justify-content:center;margin-top:12px">
        <span class="muted small">No file handy?</span>
        <button class="btn sm ghost" data-demo="guitar">${icon('guitar')} Guitar demo</button>
        <button class="btn sm ghost" data-demo="piano">${icon('piano')} Piano demo</button>
      </div>`;
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
      ${a.strum && instrument !== 'piano' ? `<span class="chip">${icon('hand')} <b>${esc(a.strum.patternText.replace(/ /g, ''))}</b></span>` : ''}`;
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

  PM.Shared = { uploader, trackChips, stars, sessionSummary, calibrateLatency };
})(typeof self !== 'undefined' ? self : globalThis);
