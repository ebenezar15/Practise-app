/* Cadenza — real-time input engines.
 *  LiveEngine: microphone / audio interface (line-in) analysis at display rate.
 *  MidiInputEngine: Web MIDI keyboards & guitar controllers.
 * Both emit identical "frames": {time, active, db, pitch, chord, chroma, notes, onset}. */
(function (root) {
  'use strict';
  const PM = (root.PM = root.PM || {});
  const { DSP, Theory } = PM;

  class Emitter {
    constructor() { this.listeners = new Set(); }
    on(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); }
    emit(f) { this.listeners.forEach((fn) => { try { fn(f); } catch (e) { console.error(e); } }); }
  }

  async function listInputs() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) return [];
    const devs = await navigator.mediaDevices.enumerateDevices();
    return devs.filter((d) => d.kind === 'audioinput').map((d, i) => ({ id: d.deviceId, label: d.label || `Input ${i + 1}` }));
  }

  class LiveEngine extends Emitter {
    constructor() {
      super();
      this.running = false;
      this.instrument = 'guitar';
      this.latency = 0.03; // seconds of input latency compensation (user adjustable)
      this.inputGain = 1;
      this.monitor = false;
    }

    async start(deviceId) {
      const ctx = PM.Audio.getCtx();
      this.stop();
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error(root.isSecureContext === false ? 'The microphone only works when Cadenza is opened over https:// (or installed as an app).' : 'This browser cannot access a microphone.');
      }
      const constraints = { audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } };
      if (deviceId) constraints.audio.deviceId = { exact: deviceId };
      PM.Audio.setSessionType('play-and-record');
      try { this.stream = await navigator.mediaDevices.getUserMedia(constraints); }
      catch (e) {
        // a remembered input that's no longer plugged in: fall back to the default input
        if (deviceId && (e.name === 'OverconstrainedError' || e.name === 'NotFoundError')) {
          delete constraints.audio.deviceId;
          try { this.stream = await navigator.mediaDevices.getUserMedia(constraints); }
          catch (e2) { PM.Audio.setSessionType('playback'); throw e2; }
        } else { PM.Audio.setSessionType('playback'); throw e; }
      }
      this.src = ctx.createMediaStreamSource(this.stream);
      this.gain = ctx.createGain();
      this.gain.gain.value = this.inputGain;
      this.analyser = ctx.createAnalyser();
      this.analyser.fftSize = 4096;
      this.analyser.smoothingTimeConstant = 0;
      this.fast = ctx.createAnalyser();
      this.fast.fftSize = 1024;
      this.fast.smoothingTimeConstant = 0;
      this.src.connect(this.gain);
      this.gain.connect(this.analyser);
      this.gain.connect(this.fast);
      this.monitorGain = ctx.createGain();
      this.monitorGain.gain.value = this.monitor ? 1 : 0;
      this.gain.connect(this.monitorGain).connect(ctx.destination);
      this.sr = ctx.sampleRate;
      this.time = new Float32Array(this.analyser.fftSize);
      this.freqDb = new Float32Array(this.analyser.frequencyBinCount);
      this.mags = new Float32Array(this.analyser.frequencyBinCount);
      this.fastDb = new Float32Array(this.fast.frequencyBinCount);
      this.prevFast = new Float32Array(this.fast.frequencyBinCount);
      this.chromaEma = new Float32Array(12);
      this.noiseFloor = -70;
      this.fluxMean = 0; this.fluxVar = 1;
      this.lastOnset = 0;
      this.stableChord = null; this.candChord = null; this.candCount = 0;
      this.running = true;
      const track = this.stream.getAudioTracks()[0];
      this.deviceLabel = track ? track.label : 'Microphone';
      const loop = () => { if (!this.running) return; this.process(); this.raf = requestAnimationFrame(loop); };
      this.raf = requestAnimationFrame(loop);
      return this.deviceLabel;
    }

    stop() {
      this.running = false;
      if (this.raf) cancelAnimationFrame(this.raf);
      if (this.stream) { this.stream.getTracks().forEach((t) => t.stop()); PM.Audio.setSessionType('playback'); }
      try { this.src && this.src.disconnect(); this.gain && this.gain.disconnect(); this.monitorGain && this.monitorGain.disconnect(); } catch (e) { /* ignore */ }
      this.stream = null;
    }

    setMonitor(on) { this.monitor = on; if (this.monitorGain) this.monitorGain.gain.value = on ? 1 : 0; }
    setInputGain(g) { this.inputGain = g; if (this.gain) this.gain.gain.value = g; }

    process() {
      const ctx = PM.Audio.getCtx();
      const now = ctx.currentTime;
      this.analyser.getFloatTimeDomainData(this.time);
      const rms = DSP.rms(this.time, 2048, 4096);
      const db = DSP.toDb(rms);
      // adaptive noise floor: falls instantly, rises slowly
      this.noiseFloor = db < this.noiseFloor ? db : this.noiseFloor + 0.015;
      const active = db > Math.max(-62, this.noiseFloor + 10);

      // onset (fast analyser, log spectral flux)
      this.fast.getFloatFrequencyData(this.fastDb);
      let flux = 0;
      const binHz = this.sr / this.fast.fftSize;
      const kMax = Math.min(this.fastDb.length, Math.floor(6000 / binHz));
      for (let k = 2; k < kMax; k++) {
        const v = Math.max(-100, this.fastDb[k]);
        const d = v - this.prevFast[k];
        if (d > 0) flux += d;
        this.prevFast[k] = v;
      }
      flux /= kMax;
      const thr = this.fluxMean + 2.5 * Math.sqrt(this.fluxVar) + 0.6;
      let onset = false;
      if (active && flux > thr && now - this.lastOnset > 0.09) { onset = true; this.lastOnset = now; }
      const a = 0.05;
      this.fluxMean += a * (flux - this.fluxMean);
      this.fluxVar += a * ((flux - this.fluxMean) ** 2 - this.fluxVar);

      let pitch = null, chord = null, notes = [], chroma = null;
      if (active) {
        this.analyser.getFloatFrequencyData(this.freqDb);
        for (let k = 0; k < this.mags.length; k++) this.mags[k] = Math.pow(10, this.freqDb[k] / 20);
        const peaks = DSP.spectralPeaks(this.mags, this.sr, this.analyser.fftSize, { minFreq: 60, maxFreq: 4500, maxPeaks: 30, relFloor: 0.03 });
        const c = DSP.chromaFromPeaks(peaks);
        DSP.normalize(c);
        for (let i = 0; i < 12; i++) this.chromaEma[i] = this.chromaEma[i] * 0.6 + c[i] * 0.4;
        chroma = Float32Array.from(this.chromaEma);
        const I = PM.Instruments.get(this.instrument);
        if (I.mono) {
          // single-line instruments: decimate so YIN reaches low bass notes (E1 = 41 Hz)
          const p = DSP.yin(DSP.decimate2(this.time), this.sr / 2, { minFreq: I.minFreq, maxFreq: I.maxFreq, threshold: 0.12 });
          if (p && p.confidence > 0.75) pitch = Object.assign(DSP.describeFreq(p.freq), { confidence: p.confidence });
          notes = pitch ? [{ midi: pitch.midi, salience: 1 }] : [];
        } else {
          notes = DSP.polyNotes(peaks, I.id === 'piano' ? { lowMidi: 28, highMidi: 100, maxNotes: 8 } : { lowMidi: 38, highMidi: 90, maxNotes: 6 });
          const p = DSP.yin(this.time.subarray(2048), this.sr, { minFreq: 60, maxFreq: 1400, threshold: 0.12 });
          if (p && p.confidence > 0.75) pitch = Object.assign(DSP.describeFreq(p.freq), { confidence: p.confidence });
        }
        const pcsCount = PM.CoachUtil ? PM.CoachUtil.topPcs(chroma).length : 3;
        const cand = pcsCount >= 2 && PM.Instruments.get(this.instrument).chordal ? Theory.detectChord(chroma) : null;
        const cname = cand && cand.score > 0.62 ? cand.name : null;
        if (cname === (this.candChord && this.candChord.name)) this.candCount++;
        else { this.candChord = cname ? cand : null; this.candCount = 1; }
        if (this.candCount >= 4) this.stableChord = this.candChord;
        chord = this.stableChord;
      } else {
        for (let i = 0; i < 12; i++) this.chromaEma[i] *= 0.85;
        this.candCount = 0;
        if (db < this.noiseFloor + 5) this.stableChord = null;
      }
      this.emit({ time: now - this.latency, active, db, pitch, chord, chroma, notes, onset, rms, source: 'mic' });
    }
  }

  class MidiInputEngine extends Emitter {
    constructor() { super(); this.held = new Map(); this.running = false; this.latency = 0; }
    static supported() { return !!(navigator && navigator.requestMIDIAccess); }
    async start() {
      this.access = await navigator.requestMIDIAccess();
      const bind = () => {
        this.inputs = [];
        this.access.inputs.forEach((inp) => { inp.onmidimessage = (e) => this.onMsg(e); this.inputs.push(inp.name); });
      };
      bind();
      this.access.onstatechange = bind;
      this.running = true;
      this.pendingOnset = false;
      this.lastVel = 0;
      const loop = () => { if (!this.running) return; this.tick(); this.raf = requestAnimationFrame(loop); };
      this.raf = requestAnimationFrame(loop);
      return this.inputs.length ? this.inputs.join(', ') : 'No MIDI device found — connect one and it will appear';
    }
    stop() {
      this.running = false;
      if (this.raf) cancelAnimationFrame(this.raf);
      if (this.access) this.access.inputs.forEach((inp) => (inp.onmidimessage = null));
      this.held.clear();
    }
    onMsg(e) {
      const [st, note, vel] = e.data;
      const type = st & 0xf0;
      if (type === 0x90 && vel > 0) {
        this.held.set(note, vel / 127);
        this.pendingOnset = true;
        this.lastVel = vel / 127;
        this.onsetTime = PM.Audio.getCtx().currentTime;
      } else if (type === 0x80 || (type === 0x90 && vel === 0)) this.held.delete(note);
    }
    tick() {
      const now = PM.Audio.getCtx().currentTime;
      const midis = [...this.held.keys()].sort((a, b) => a - b);
      const active = midis.length > 0;
      const chroma = new Float32Array(12);
      midis.forEach((m) => (chroma[m % 12] = 1));
      const chord = midis.length >= 2 ? Theory.chordFromNotes(midis) : null;
      const top = midis.length ? midis[midis.length - 1] : null;
      const pitch = top != null ? Object.assign(DSP.describeFreq(DSP.midiToFreq(top)), { confidence: 1 }) : null;
      const vel = midis.length ? Math.max(...this.held.values()) : 0;
      const onset = this.pendingOnset;
      this.pendingOnset = false;
      this.emit({
        time: onset ? this.onsetTime : now, active, db: active ? -45 + vel * 35 : -90, pitch, chord: chord && chord.score > 0.6 ? chord : null,
        chroma: active ? chroma : null, notes: midis.map((m) => ({ midi: m, salience: 1 })), onset, source: 'midi',
      });
    }
  }

  PM.Live = { LiveEngine, MidiInputEngine, listInputs };
})(typeof self !== 'undefined' ? self : globalThis);
