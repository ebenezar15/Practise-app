/* Cadenza — performance recorder. Records the microphone (optionally mixed with the
 * backing track that is playing) so a student can send their playing to the teacher.
 * Uses MediaRecorder (Opus/WebM on Chrome/Edge/desktop app, AAC/MP4 on Safari/iPad) and
 * falls back to an uncompressed WAV capture where MediaRecorder is missing. */
(function (root) {
  'use strict';
  const PM = root.PM;

  const TYPES = ['audio/webm;codecs=opus', 'audio/mp4;codecs=mp4a.40.2', 'audio/mp4', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/aac'];
  const pickType = () => {
    if (!root.MediaRecorder || !MediaRecorder.isTypeSupported) return '';
    return TYPES.find((t) => { try { return MediaRecorder.isTypeSupported(t); } catch (e) { return false; } }) || '';
  };
  const extFor = (mime) => (/mp4|aac/.test(mime) ? 'm4a' : /ogg/.test(mime) ? 'ogg' : /wav/.test(mime) ? 'wav' : 'webm');

  class Recorder {
    constructor() { this.state = 'idle'; this.listeners = new Set(); }
    static supported() { return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia); }
    on(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); }
    emit(t, d) { this.listeners.forEach((fn) => fn(t, d)); }

    /** opts: {deviceId, includeTrack: mix the playing reference/backing track into the file} */
    async start(opts) {
      opts = opts || {};
      const App = PM.App, ctx = PM.Audio.getCtx();
      if (!Recorder.supported()) throw new Error(root.isSecureContext === false ? 'Recording only works when Cadenza is opened over https:// (or installed as an app).' : 'This browser cannot record audio.');
      // Re-use the coach's microphone if it is already open (iOS allows one capture at a time)
      if (App.live.running && App.live.stream) { this.stream = App.live.stream; this.ownStream = false; }
      else {
        PM.Audio.setSessionType('play-and-record');
        const c = { audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } };
        if (opts.deviceId) c.audio.deviceId = { exact: opts.deviceId };
        try { this.stream = await navigator.mediaDevices.getUserMedia(c); }
        catch (e) {
          if (opts.deviceId && (e.name === 'OverconstrainedError' || e.name === 'NotFoundError')) { delete c.audio.deviceId; this.stream = await navigator.mediaDevices.getUserMedia(c); }
          else { PM.Audio.setSessionType('playback'); throw e; }
        }
        this.ownStream = true;
      }
      this.mic = ctx.createMediaStreamSource(this.stream);
      this.mix = ctx.createGain();
      this.mic.connect(this.mix);
      this.analyser = ctx.createAnalyser();
      this.analyser.fftSize = 1024;
      this.mix.connect(this.analyser);
      if (opts.includeTrack && App.player.loaded) {
        App.player.connect();
        if (App.player.gainNode) { this.trackTap = App.player.gainNode; this.trackTap.connect(this.mix); }
      }
      this.mime = pickType();
      this.chunks = [];
      this.startedAt = performance.now();
      if (this.mime || (root.MediaRecorder && !MediaRecorder.isTypeSupported)) {
        this.dest = ctx.createMediaStreamDestination();
        this.mix.connect(this.dest);
        this.mr = new MediaRecorder(this.dest.stream, Object.assign({ audioBitsPerSecond: 128000 }, this.mime ? { mimeType: this.mime } : {}));
        this.mime = this.mr.mimeType || this.mime || 'audio/webm';
        this.mr.ondataavailable = (e) => { if (e.data && e.data.size) this.chunks.push(e.data); };
        this.mr.start(1000);
      } else {
        // WAV fallback: capture raw samples
        this.mime = 'audio/wav';
        this.pcm = [];
        this.proc = ctx.createScriptProcessor(4096, 1, 1);
        this.proc.onaudioprocess = (e) => { if (this.state === 'recording') this.pcm.push(new Float32Array(e.inputBuffer.getChannelData(0))); };
        this.mix.connect(this.proc);
        this.silent = ctx.createGain(); this.silent.gain.value = 0;
        this.proc.connect(this.silent).connect(ctx.destination);
      }
      this.state = 'recording';
      this.emit('state', this.state);
    }

    get seconds() { return this.state === 'recording' ? (performance.now() - this.startedAt) / 1000 : this.duration || 0; }

    /** Input level 0..1 for a meter. */
    level() {
      if (!this.analyser) return 0;
      const buf = new Float32Array(this.analyser.fftSize);
      this.analyser.getFloatTimeDomainData(buf);
      let peak = 0;
      for (let i = 0; i < buf.length; i++) peak = Math.max(peak, Math.abs(buf[i]));
      return Math.min(1, peak);
    }

    /** Stop and resolve to {blob, mime, seconds, ext}. */
    async stop() {
      if (this.state !== 'recording') return null;
      this.duration = (performance.now() - this.startedAt) / 1000;
      this.state = 'stopping';
      let blob;
      if (this.mr) {
        blob = await new Promise((resolve) => {
          this.mr.onstop = () => resolve(new Blob(this.chunks, { type: this.mime }));
          try { this.mr.requestData(); } catch (e) { /* ignore */ }
          this.mr.stop();
        });
      } else {
        const sr = PM.Audio.getCtx().sampleRate;
        const n = this.pcm.reduce((a, b) => a + b.length, 0);
        const all = new Float32Array(n);
        let o = 0;
        for (const b of this.pcm) { all.set(b, o); o += b.length; }
        blob = new Blob([PM.Midi.encodeWav([all], sr)], { type: 'audio/wav' });
      }
      this.release();
      this.state = 'idle';
      this.emit('state', this.state);
      return { blob, mime: blob.type || this.mime, seconds: this.duration, ext: extFor(blob.type || this.mime) };
    }

    cancel() { if (this.mr && this.mr.state !== 'inactive') try { this.mr.stop(); } catch (e) { /* ignore */ } this.release(); this.state = 'idle'; this.emit('state', this.state); }

    release() {
      try { this.trackTap && this.trackTap.disconnect(this.mix); } catch (e) { /* ignore */ }
      try { this.mic && this.mic.disconnect(); this.mix && this.mix.disconnect(); this.proc && this.proc.disconnect(); } catch (e) { /* ignore */ }
      if (this.ownStream && this.stream) { this.stream.getTracks().forEach((t) => t.stop()); PM.Audio.setSessionType('playback'); }
      this.stream = this.mic = this.mix = this.dest = this.mr = this.proc = this.trackTap = null;
    }
  }

  PM.Recorder = Recorder;
  PM.Recorder.extFor = extFor;
})(typeof self !== 'undefined' ? self : globalThis);
