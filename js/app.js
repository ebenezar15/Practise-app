/* Cadenza — application shell: shared state, router, track loading, game events. */
(function (root) {
  'use strict';
  const PM = root.PM;
  const { UI } = PM;
  const { icon, el, $, $$, esc } = UI;

  const SETTINGS_KEY = 'cadenza.settings.v1';
  const loadSettings = () => {
    try { return Object.assign({ instrument: 'guitar', latency: 0.03, deviceId: '', source: 'mic', dailyGoal: 15 }, JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}')); }
    catch (e) { return { instrument: 'guitar', latency: 0.03, deviceId: '', source: 'mic', dailyGoal: 15 }; }
  };

  const App = {
    views: {},
    order: [],
    settings: loadSettings(),
    track: null,
    listeners: new Set(),
    player: new PM.Audio.Player(),
    live: new PM.Live.LiveEngine(),
    midiIn: new PM.Live.MidiInputEngine(),
    metronome: new PM.Metronome(),
    game: new PM.Game(),

    get instrument() { return this.settings.instrument; },
    on(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); },
    emit(type, data) { this.listeners.forEach((fn) => fn(type, data)); },
    saveSettings() { try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(this.settings)); } catch (e) { /* ignore */ } },

    setInstrument(inst) {
      if (inst === this.settings.instrument) return;
      this.settings.instrument = inst;
      this.live.instrument = inst;
      this.saveSettings();
      $$('.inst-switch button').forEach((b) => b.classList.toggle('on', b.dataset.inst === inst));
      this.emit('instrument', inst);
      this.rerender();
    },

    register(view) { this.views[view.id] = view; if (!view.hidden) this.order.push(view.id); },

    go(id) { location.hash = '#/' + id; },

    route() {
      const id = (location.hash.replace(/^#\/?/, '').split('?')[0]) || 'home';
      const view = this.views[id] || this.views.home;
      if (this.cleanup) { try { this.cleanup(); } catch (e) { console.error(e); } }
      this.cleanup = null;
      const host = $('#view');
      host.innerHTML = '';
      $$('.nav a').forEach((a) => a.classList.toggle('active', a.dataset.id === view.id));
      this.currentView = view.id;
      document.title = view.title + ' · Cadenza';
      this.cleanup = view.render(host, this) || null;
      host.scrollTop = 0;
      window.scrollTo(0, 0);
    },
    rerender() { this.route(); },

    /** Analyse & load a user file (audio or MIDI). onProgress(fraction, label) */
    async loadFile(file, onProgress) {
      onProgress = onProgress || (() => {});
      const inst = this.instrument;
      let analysis, playBlob = file, kind;
      if (PM.Audio.isMidiFile(file)) {
        kind = 'midi';
        onProgress(0.1, 'Reading MIDI…');
        const midi = PM.Midi.parseMidi(await file.arrayBuffer());
        if (!midi.notes.length) throw new Error('This MIDI file has no notes.');
        onProgress(0.4, 'Rendering & analysing…');
        await new Promise((r) => setTimeout(r, 20));
        analysis = await PM.Analyzer.analyzeMidi(midi, { instrument: inst });
        playBlob = new Blob([PM.Midi.encodeWav(analysis.rendered.data, analysis.rendered.sampleRate)], { type: 'audio/wav' });
      } else {
        kind = 'audio';
        onProgress(0.02, 'Decoding audio…');
        const dec = await PM.Audio.decodeAudioFile(file);
        if (dec.duration > 15 * 60) throw new Error('Please use a clip shorter than 15 minutes.');
        analysis = await PM.Analyzer.analyzeAudio(dec.channels, dec.sampleRate, { instrument: inst, onProgress });
      }
      const entry = { id: 's' + Date.now().toString(36), name: file.name.replace(/\.[^.]+$/, ''), kind, instrument: inst, blob: file, analysis, createdAt: Date.now() };
      this.setTrack(entry, playBlob);
      PM.Audio.Library.save(entry).catch((e) => console.warn('Library save failed', e));
      this.game.noteAnalysis();
      return entry;
    },

    async openFromLibrary(entry) {
      let playBlob = entry.blob;
      if (entry.kind === 'midi') {
        const midi = PM.Midi.parseMidi(await entry.blob.arrayBuffer());
        entry.analysis = await PM.Analyzer.analyzeMidi(midi, { instrument: entry.instrument });
        playBlob = new Blob([PM.Midi.encodeWav(entry.analysis.rendered.data, entry.analysis.rendered.sampleRate)], { type: 'audio/wav' });
      }
      this.setTrack(entry, playBlob);
    },

    setTrack(entry, playBlob) {
      this.player.unload();
      this.track = entry;
      if (entry) this.player.load(playBlob || entry.blob);
      this.emit('track', entry);
    },

    /** Built-in demo: a strummed G–Em–C–D progression rendered offline. */
    async loadDemo(kind) {
      const bpm = kind === 'piano' ? 84 : 92, beat = 60 / bpm, notes = [];
      if (kind === 'piano') {
        const prog = [[48, 60, 64, 67], [45, 57, 60, 64], [41, 57, 60, 65], [43, 55, 59, 62]];
        const mel = [72, 74, 76, 79, 76, 74, 72, 69, 72, 69, 67, 65, 67, 69, 71, 74];
        for (let bar = 0; bar < 16; bar++) {
          const c = prog[bar % 4], t = beat * 4 + bar * 4 * beat;
          const vel = bar >= 8 ? 0.95 : 0.55;
          notes.push({ midi: c[0], start: t, end: t + 4 * beat, velocity: vel, channel: 0 });
          for (const b of [0, 1, 2, 3]) for (const m of c.slice(1)) notes.push({ midi: m, start: t + b * beat, end: t + (b + 0.9) * beat, velocity: vel * 0.6, channel: 0 });
          for (let k = 0; k < 4; k++) notes.push({ midi: mel[(bar * 4 + k) % mel.length], start: t + k * beat, end: t + (k + 0.95) * beat, velocity: vel, channel: 0 });
        }
      } else {
        const V = { G: [43, 47, 50, 55, 59, 67], Em: [40, 47, 52, 55, 59, 64], C: [48, 52, 55, 60, 64], D: [50, 57, 62, 66] };
        const prog = ['G', 'Em', 'C', 'D'], pat = 'D-DU-UDU';
        for (let bar = 0; bar < 16; bar++) {
          const ch = V[prog[bar % 4]];
          for (let s = 0; s < 8; s++) {
            if (pat[s] === '-') continue;
            const t = beat * 4 + (bar * 8 + s) * beat / 2;
            const order = pat[s] === 'D' ? ch : [...ch].reverse().slice(0, 4);
            order.forEach((m, i) => notes.push({ midi: m, start: t + i * 0.011, end: t + beat, velocity: (s % 2 ? 0.6 : 0.9) * (bar >= 8 ? 1 : 0.7), channel: 0 }));
          }
        }
      }
      const buf = PM.Midi.writeMidi(notes, { bpm });
      const file = new File([buf], kind === 'piano' ? 'Demo — Moonlit Waltz in C (piano).mid' : 'Demo — Campfire Strum in G (guitar).mid', { type: 'audio/midi' });
      if (kind !== this.instrument) this.setInstrument(kind);
      return this.loadFile(file);
    },
  };
  PM.App = App;

  // ---------- Game event → celebrations ----------
  App.game.on((ev) => {
    if (ev.type === 'level') {
      UI.confetti();
      UI.modal(`<div class="modal-top"><div style="font-size:54px">🎉</div><h1 style="color:#fff;margin-top:6px">Level ${ev.level}!</h1><p style="margin-top:6px">You're now a <b style="color:#fff">${esc(ev.title)}</b>. Keep that momentum going.</p></div>
        <div class="modal-body" style="text-align:center"><button class="btn primary" data-close>Let's go</button></div>`);
    } else if (ev.type === 'badge') {
      UI.toast(`Badge unlocked: ${ev.badge.name}`, { icon: ev.badge.icon, kind: 'xp', duration: 4500 });
    } else if (ev.type === 'daily') {
      UI.toast('Daily challenge complete! +100 XP', { icon: '🏅', kind: 'xp', duration: 4500 });
      UI.confetti();
    } else if (ev.type === 'xp' && ev.amount >= 10 && ev.reason !== 'badge') {
      UI.toast(`+${ev.amount} XP`, { icon: '✨', duration: 2200 });
    }
    if (ev.type === 'change' || ev.type === 'xp') updateMiniLevel();
  });

  function updateMiniLevel() {
    const lp = App.game.levelProgress();
    const m = $('.mini-level');
    if (m) m.innerHTML = `<b>Lv ${lp.level}</b><div class="bar"><i style="width:${lp.pct * 100}%"></i></div><span>${App.game.state.streak}🔥</span>`;
  }

  // ---------- Shell ----------
  function buildShell() {
    const nav = App.order.map((id) => {
      const v = App.views[id];
      return `<a href="#/${id}" data-id="${id}">${icon(v.icon)}<span>${esc(v.nav || v.title)}</span></a>`;
    }).join('');
    $('#app').innerHTML = `
      <aside class="sidebar">
        <div class="brand">
          <div class="brand-logo">${icon('music')}</div>
          <div><div class="brand-name">Cadenza</div><div class="brand-sub">AI Practice Coach</div></div>
        </div>
        <nav class="nav">${nav}</nav>
        <div class="sidebar-foot">
          <div class="inst-switch" role="group" aria-label="Instrument">
            <button data-inst="guitar">${icon('guitar')} Guitar</button>
            <button data-inst="piano">${icon('piano')} Piano</button>
          </div>
          <div class="mini-level"></div>
          <div class="offline-pill"><i></i> Works offline · on-device AI</div>
        </div>
      </aside>
      <main id="view"></main>`;
    $$('.inst-switch button').forEach((b) => {
      b.classList.toggle('on', b.dataset.inst === App.instrument);
      b.addEventListener('click', () => App.setInstrument(b.dataset.inst));
    });
    updateMiniLevel();
  }

  App.start = function () {
    App.live.instrument = App.instrument;
    App.live.latency = App.settings.latency;
    buildShell();
    addEventListener('hashchange', () => App.route());
    App.route();
    if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
      navigator.serviceWorker.register('sw.js').catch((e) => console.warn('SW registration failed', e));
    }
  };
})(typeof self !== 'undefined' ? self : globalThis);
