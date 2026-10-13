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
      if (this.track) this.preparePart(this.track, true).catch(() => {});
      this.emit('instrument', inst);
      this.rerender();
    },

    register(view) { this.views[view.id] = view; if (!view.hidden) this.order.push(view.id); },

    go(id) { location.hash = '#/' + id; },

    route(opts) {
      opts = opts || {};
      // re-entrancy guard: a navigation that happens while a page is rendering runs after it
      if (this._routing) { this._again = opts; return; }
      this._routing = true;
      try {
        const nav = this.nav;
        // every history entry gets an index → direction (back / forward) and scroll memory
        let st = history.state, dir = 'none';
        if (!st || st.cadIdx == null) {
          nav.max += 1;
          try { sessionStorage.setItem('cadenza.navmax', String(nav.max)); } catch (e) { /* private mode */ }
          st = Object.assign({}, st, { cadIdx: nav.max });
          history.replaceState(st, '');
          if (this.currentView) dir = 'fwd';
          nav.fwdMax = st.cadIdx;
        } else if (this.currentView && !opts.rerender) dir = st.cadIdx < nav.idx ? 'back' : st.cadIdx > nav.idx ? 'fwd' : 'none';
        if (this.currentView && !opts.rerender) nav.scroll[nav.idx] = window.scrollY;
        nav.idx = st.cadIdx;
        nav.fwdMax = Math.max(nav.fwdMax || 0, nav.idx);

        const id = (location.hash.replace(/^#\/?/, '').split('?')[0]) || 'home';
        const view = this.views[id] || this.views.home;
        // leave the old page cleanly: dialogs, speech, the page's own timers/audio
        UI.closeAllModals();
        try { root.speechSynthesis && root.speechSynthesis.cancel(); } catch (e) { /* no speech */ }
        if (this.cleanup) { try { this.cleanup(); } catch (e) { console.error(e); } }
        this.cleanup = null;
        const host = $('#view');
        host.innerHTML = '';
        $$('.nav a').forEach((a) => a.classList.toggle('active', a.dataset.id === view.id || (view.hidden && a.dataset.id === view.parent)));
        this.currentView = view.id;
        document.title = view.title + ' · Cadenza';
        try { this.cleanup = view.render(host, this) || null; }
        catch (e) {
          console.error(e);
          host.innerHTML = `<div class="card empty" style="margin-top:20px"><h3>Something went wrong on this page</h3><p class="small">${esc(e.message || String(e))}</p><a class="btn primary" href="#/home">Go home</a></div>`;
        }
        // page transition (direction-aware), then restore the scroll position for Back / Forward
        host.classList.remove('enter-fwd', 'enter-back', 'enter-none');
        void host.offsetWidth;
        host.classList.add(dir === 'back' ? 'enter-back' : dir === 'fwd' ? 'enter-fwd' : 'enter-none');
        const y = dir === 'back' || (dir === 'fwd' && nav.scroll[nav.idx] != null && st.cadIdx < nav.fwdMax) ? nav.scroll[nav.idx] || 0 : 0;
        const restore = () => window.scrollTo(0, y);
        if (opts.keepScroll) { /* stay */ } else { restore(); if (y) { requestAnimationFrame(restore); setTimeout(restore, 180); } }
        host.scrollTop = 0;
        this.updatePageBar(view);
      } finally {
        this._routing = false;
        if (this._again) { const o = this._again; this._again = null; this.route(o); }
      }
    },
    rerender() { this.route({ rerender: true }); },
    nav: { idx: 0, max: (() => { try { return +sessionStorage.getItem('cadenza.navmax') || 0; } catch (e) { return 0; } })(), scroll: {}, fwdMax: 0 },
    updatePageBar(view) {
      const bar = $('#pagebar');
      if (!bar) return;
      const nav = this.nav;
      const st = history.state || {};
      $('#pbBack', bar).disabled = view.id === 'home' && !(st.cadIdx > 1);
      $('#pbFwd', bar).disabled = !(nav.idx < nav.fwdMax);
      $('#pbTitle', bar).textContent = view.title;
    },

    /** Analyse & load a user file (audio or MIDI). onProgress(fraction, label) */
    async loadFile(file, onProgress, extra) {
      onProgress = onProgress || (() => {});
      const inst = this.instrument;
      const entry = { id: 's' + Date.now().toString(36), name: file.name.replace(/\.[^.]+$/, ''), instrument: inst, blob: file, createdAt: Date.now() };
      Object.assign(entry, extra || {});
      await this.prepare(entry, onProgress);
      PM.Audio.Library.save(entry).catch((e) => console.warn('Library save failed', e));
      this.game.noteAnalysis();
      return entry;
    },

    /** Decode/parse, analyse, build stems (MIDI) and start playback for an entry. */
    async prepare(entry, onProgress) {
      onProgress = onProgress || (() => {});
      const file = entry.blob;
      const inst = entry.instrument || this.instrument;
      if (PM.Audio.isMidiFile(file)) {
        entry.kind = 'midi';
        onProgress(0.1, 'Reading MIDI…');
        const midi = PM.Midi.parseMidi(await file.arrayBuffer());
        if (!midi.notes.length) throw new Error('This MIDI file has no notes.');
        // single-instrument files without a program play in the student's instrument voice
        const melodic = midi.notes.filter((n) => n.channel !== 9);
        if (melodic.every((n) => !n.program) && new Set(melodic.map((n) => n.channel)).size === 1) {
          const prog = PM.Midi.VOICE_PROGRAM[PM.Instruments.get(inst).synth];
          if (prog) melodic.forEach((n) => (n.program = prog));
        }
        onProgress(0.35, 'Rendering instruments…');
        await new Promise((r) => setTimeout(r, 20));
        entry.sep = PM.Midi.renderStems(midi.notes, { sampleRate: 32000 });
        entry.stemsReady = true;
        const full = PM.Separation.mixStems(entry.sep, {});
        onProgress(0.7, 'Analysing…');
        if (!entry.analysis || !entry.analysis.beats) entry.analysis = await PM.Analyzer.analyzeMidi(midi, { instrument: inst, waveformFrom: full[0] });
        this.setTrack(entry, new Blob([PM.Midi.encodeWav(full, 32000)], { type: 'audio/wav' }));
      } else {
        entry.kind = 'audio';
        onProgress(0.02, 'Decoding audio…');
        const dec = await PM.Audio.decodeAudioFile(file);
        if (dec.duration > 15 * 60) throw new Error('Please use a clip shorter than 15 minutes.');
        entry.audio = dec;
        if (!entry.analysis || !entry.analysis.beats) entry.analysis = await PM.Analyzer.analyzeAudio(dec.channels, dec.sampleRate, { instrument: inst, onProgress });
        this.setTrack(entry, file);
      }
      entry.gains = {};
      this.preparePart(entry);
      return entry;
    },

    async openFromLibrary(entry) {
      await this.prepare(entry);
    },

    setTrack(entry, playBlob) {
      this.player.unload();
      this.track = entry;
      if (entry) this.player.load(playBlob || entry.blob);
      this.emit('track', entry);
    },

    /** Separate an audio track into stems (MIDI tracks already have exact stems). */
    async separateStems(onProgress) {
      const t = this.track;
      if (!t || t.stemsReady) return t && t.sep;
      if (!t.audio) t.audio = await PM.Audio.decodeAudioFile(t.blob);
      if (t.audio.duration > 10 * 60) throw new Error('Separation is limited to 10-minute tracks.');
      t.sep = await PM.Separation.separateAudio(t.audio.channels, t.audio.sampleRate, { onProgress, melody: t.analysis && t.analysis.melody });
      t.stemsReady = true;
      await this.preparePart(t, true);
      return t.sep;
    },

    /** Notes of the student's own part (exact for MIDI, transcribed for audio mono parts). */
    async preparePart(entry, transcribe) {
      if (!entry || !entry.sep) return;
      const I = PM.Instruments.get(this.instrument);
      const id = PM.Separation.partStemFor(I.id, entry.sep.stems);
      entry.partStem = id;
      const stem = entry.sep.stems.find((s) => s.id === id);
      if (!stem) { if (entry.analysis) entry.analysis.part = null; return; }
      if (stem.notes) entry.analysis.part = { stem: id, notes: stem.notes.map((n) => ({ midi: n.midi, start: n.start, end: n.end, velocity: n.velocity })) };
      else if (transcribe && I.mono) {
        const d = stem.data, mono = new Float32Array(entry.sep.length);
        for (let i = 0; i < mono.length; i++) mono[i] = (d[0][i] + (d[1] ? d[1][i] : d[0][i])) / 2;
        entry.analysis.part = { stem: id, notes: await PM.Analyzer.transcribeMono(mono, entry.sep.sampleRate, { minFreq: I.minFreq, maxFreq: I.maxFreq }) };
      }
    },

    /** Re-mix stems with per-stem gains and reload the player in place. */
    applyMix(gains) {
      const t = this.track;
      if (!t || !t.sep) return;
      t.gains = Object.assign({}, gains);
      const mix = PM.Separation.mixStems(t.sep, t.gains);
      const p = this.player, time = p.time, playing = p.playing, rate = p.rate || 1;
      const loop = p.loop;
      p.load(new Blob([PM.Midi.encodeWav(mix, t.sep.sampleRate)], { type: 'audio/wav' }));
      p.loop = loop;
      p.el.addEventListener('loadedmetadata', () => { p.time = time; p.rate = rate; if (playing) p.play(); }, { once: true });
    },

    /** Generate a backing track without the student's instrument and load it. */
    async loadBacking(opts, onProgress) {
      const g = PM.Backing.generate(Object.assign({ exclude: this.instrument }, opts));
      const buf = PM.Midi.writeMidi(g.notes, { bpm: g.bpm, key: g.key });
      return this.loadFile(new File([buf], 'Backing — ' + g.name + '.mid', { type: 'audio/midi' }), onProgress, { backing: true });
    },

    /** Built-in demos: full arrangements that include the chosen instrument's part. */
    async loadDemo(kind) {
      if (kind !== this.instrument) this.setInstrument(kind);
      let notes, bpm, name, key;
      if (kind === 'piano' || kind === 'guitar') {
        bpm = kind === 'piano' ? 84 : 92;
        const beat = 60 / bpm;
        notes = [];
        if (kind === 'piano') {
          const prog = [[48, 60, 64, 67], [45, 57, 60, 64], [41, 57, 60, 65], [43, 55, 59, 62]];
          const mel = [72, 74, 76, 79, 76, 74, 72, 69, 72, 69, 67, 65, 67, 69, 71, 74];
          for (let bar = 0; bar < 16; bar++) {
            const c = prog[bar % 4], t = beat * 4 + bar * 4 * beat;
            const vel = bar >= 8 ? 0.95 : 0.55;
            notes.push({ midi: c[0], start: t, end: t + 4 * beat, velocity: vel, channel: 0, voice: 'piano' });
            for (const b of [0, 1, 2, 3]) for (const m of c.slice(1)) notes.push({ midi: m, start: t + b * beat, end: t + (b + 0.9) * beat, velocity: vel * 0.6, channel: 0, voice: 'piano' });
            for (let k = 0; k < 4; k++) notes.push({ midi: mel[(bar * 4 + k) % mel.length], start: t + k * beat, end: t + (k + 0.95) * beat, velocity: vel, channel: 0, voice: 'piano' });
          }
          name = 'Demo — Moonlit Waltz in C (piano)';
        } else {
          const V = { G: [43, 47, 50, 55, 59, 67], Em: [40, 47, 52, 55, 59, 64], C: [48, 52, 55, 60, 64], D: [50, 57, 62, 66] };
          const prog = ['G', 'Em', 'C', 'D'], pat = 'D-DU-UDU';
          for (let bar = 0; bar < 16; bar++) {
            const ch = V[prog[bar % 4]];
            for (let s = 0; s < 8; s++) {
              if (pat[s] === '-') continue;
              const t = beat * 4 + (bar * 8 + s) * beat / 2;
              const order = pat[s] === 'D' ? ch : [...ch].reverse().slice(0, 4);
              order.forEach((m, i) => notes.push({ midi: m, start: t + i * 0.011, end: t + beat, velocity: (s % 2 ? 0.6 : 0.9) * (bar >= 8 ? 1 : 0.7), channel: 0, voice: 'guitar' }));
            }
          }
          name = 'Demo — Campfire Strum in G (guitar)';
        }
      } else {
        // band arrangement with the student's part on its own channel
        const spec = { voice: { tonic: 0, progression: 'ballad', style: 'ballad', bpm: 76 }, bass: { tonic: 7, progression: 'pop', style: 'rock', bpm: 96 }, electric: { tonic: 9, progression: 'minor', style: 'rock', bpm: 110 }, trumpet: { tonic: 5, progression: 'jazz', style: 'swing', bpm: 120 } }[kind];
        const g = PM.Backing.generate(Object.assign({ choruses: kind === 'trumpet' ? 4 : 4, exclude: '' }, spec));
        notes = g.notes; bpm = g.bpm; key = g.key;
        const beat = 60 / bpm;
        const bars = PM.Backing.PROGRESSIONS[spec.progression].bars;
        const total = Math.round((notes[notes.length - 1].end - beat * 4) / (4 * beat));
        for (let b = 0; b < total; b++) {
          const [deg, type] = bars[b % bars.length];
          const root = (spec.tonic + deg) % 12;
          const pcs = PM.Theory.chordPcs(root, type);
          const t0 = beat * 4 + b * 4 * beat;
          if (kind === 'electric') { // power-chord riff: 8ths
            for (let k = 0; k < 8; k++) [40 + ((root - 4 + 12) % 12), 47 + ((root - 4 + 12) % 12)].forEach((m) => notes.push({ midi: m, start: t0 + (k * beat) / 2, end: t0 + ((k + 0.8) * beat) / 2, velocity: k % 2 ? 0.6 : 0.85, channel: 3, voice: 'electric' }));
          } else if (kind === 'voice') { // a singable tune in the chosen voice type's range, on chord tones
            const R = PM.Learn.RANGE.voice, MAJ = [0, 2, 4, 5, 7, 9, 11, 12, 14];
            const base = R.low + (((spec.tonic - R.low) % 12) + 12) % 12; // lowest tonic in range
            const deg = [[0, 2, 4, 4], [5, 4, 2, 0], [5, 3, 0, 3], [4, 6, 4]][b % 4];
            const rh = b % 4 === 3 ? [1, 1, 2] : [1, 1, 1, 1];
            let t = t0;
            rh.forEach((len, k) => { notes.push({ midi: Math.min(R.high, base + MAJ[deg[k]]), start: t, end: t + len * beat * 0.95, velocity: 0.8, channel: 3, voice: 'voice' }); t += len * beat; });
          } else if (kind === 'trumpet') { // simple melody on chord tones
            const mel = [pcs[1], pcs[2], pcs[0], pcs[1]].map((pc) => 60 + pc + (pc < 5 ? 12 : 0));
            mel.forEach((m, k) => notes.push({ midi: m, start: t0 + k * beat, end: t0 + (k + (k === 3 ? 0.95 : 0.85)) * beat, velocity: 0.8, channel: 3, voice: 'trumpet' }));
          }
        }
        name = { voice: 'Demo — Evening Song in C (sing-along)', bass: 'Demo — Groove in G (bass)', electric: 'Demo — Minor Rock in A (electric)', trumpet: 'Demo — Swing ii–V–I in F (trumpet)' }[kind];
      }
      const buf = PM.Midi.writeMidi(notes, { bpm, key });
      return this.loadFile(new File([buf], name + '.mid', { type: 'audio/midi' }));
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
          <div class="inst-grid inst-switch" role="group" aria-label="Instrument">
            ${PM.Instruments.list().map((I) => `<button data-inst="${I.id}" title="${esc(I.label)}">${icon(I.icon)}${esc(I.short)}</button>`).join('')}
          </div>
          <div class="mini-level"></div>
          <button class="theme-btn" id="themeBtn" title="Appearance: colours, fonts, calm mode">🎨 Theme & fonts</button>
          <div class="offline-pill"><i></i> Works offline · on-device AI</div>
          <a class="sync-pill" id="syncSide" href="#/classroom" style="text-decoration:none"><i></i><span>Classroom: not connected</span></a>
        </div>
      </aside>
      <header class="pagebar" id="pagebar"><button class="pb-btn" id="pbBack" aria-label="Back" title="Back">‹</button><button class="pb-btn" id="pbFwd" aria-label="Forward" title="Forward">›</button><b id="pbTitle"></b></header>
      <main id="view"></main>`;
    $$('.inst-switch button').forEach((b) => {
      b.classList.toggle('on', b.dataset.inst === App.instrument);
      b.addEventListener('click', () => App.setInstrument(b.dataset.inst));
    });
    $('#themeBtn').onclick = () => PM.Theme.openModal(App);
    $('#pbBack').onclick = () => { if ((history.state || {}).cadIdx > 1) history.back(); else App.go('home'); };
    $('#pbFwd').onclick = () => history.forward();
    // edge swipes in the installed app (browsers already have their own)
    const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone;
    if (standalone) {
      let sx = 0, sy = 0, edge = 0;
      addEventListener('touchstart', (e) => { const t = e.touches[0]; sx = t.clientX; sy = t.clientY; edge = sx < 24 ? -1 : sx > innerWidth - 24 ? 1 : 0; }, { passive: true });
      addEventListener('touchend', (e) => {
        if (!edge) return;
        const t = e.changedTouches[0], dx = t.clientX - sx, dy = Math.abs(t.clientY - sy);
        if (dy < 70 && edge < 0 && dx > 80) $('#pbBack').click();
        else if (dy < 70 && edge > 0 && dx < -80) history.forward();
        edge = 0;
      }, { passive: true });
    }
    updateMiniLevel();
  }

  App.start = function () {
    PM.Theme.apply(App.settings);
    if (App.settings.voiceType) PM.Learn.setVoiceType(App.settings.voiceType);
    App.live.instrument = App.instrument;
    App.live.latency = App.settings.latency;
    buildShell();
    const pill = () => {
      const el = $('#syncSide');
      if (!el) return;
      const S = PM.Sync;
      el.className = 'sync-pill ' + (S.status === 'online' ? 'on' : S.status === 'pending' || S.status === 'offline' ? 'pending' : '');
      el.querySelector('span').textContent = S.connected ? `${S.account.user.name} · ${{ online: 'synced', offline: 'offline', pending: 'sync pending', error: 'sync issue', local: '' }[S.status]}` : 'Classroom: not connected';
    };
    PM.Sync.on(pill);
    PM.Sync.start();
    pill();
    if (PM.Cadi) PM.Cadi.init(App);
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
    addEventListener('hashchange', () => App.route());
    App.route();
    if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
      navigator.serviceWorker.register('sw.js').catch((e) => console.warn('SW registration failed', e));
    }
  };
})(typeof self !== 'undefined' ? self : globalThis);
