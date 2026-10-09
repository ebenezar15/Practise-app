/* Cadenza — improvisation coach: judges note choices against the current chord & key,
 * suggests chord-scales, rewards targeting chord tones on changes, and tracks
 * range, rhythmic variety and phrasing (use of space). */
(function (root) {
  'use strict';
  const PM = (root.PM = root.PM || {});
  const { Theory } = PM;
  const mod12 = (x) => ((x % 12) + 12) % 12;

  const CHORD_SCALES = {
    '': [{ name: 'major pentatonic', iv: [0, 2, 4, 7, 9] }, { name: 'Ionian (major)', iv: [0, 2, 4, 5, 7, 9, 11] }],
    maj7: [{ name: 'Lydian', iv: [0, 2, 4, 6, 7, 9, 11] }, { name: 'major pentatonic', iv: [0, 2, 4, 7, 9] }],
    '7': [{ name: 'Mixolydian', iv: [0, 2, 4, 5, 7, 9, 10] }, { name: 'blues', iv: [0, 3, 5, 6, 7, 10] }],
    m: [{ name: 'minor pentatonic', iv: [0, 3, 5, 7, 10] }, { name: 'Dorian', iv: [0, 2, 3, 5, 7, 9, 10] }],
    m7: [{ name: 'Dorian', iv: [0, 2, 3, 5, 7, 9, 10] }, { name: 'minor pentatonic', iv: [0, 3, 5, 7, 10] }],
    dim: [{ name: 'diminished (half-whole)', iv: [0, 1, 3, 4, 6, 7, 9, 10] }],
    aug: [{ name: 'whole tone', iv: [0, 2, 4, 6, 8, 10] }],
    sus2: [{ name: 'Mixolydian', iv: [0, 2, 4, 5, 7, 9, 10] }],
    sus4: [{ name: 'Mixolydian', iv: [0, 2, 4, 5, 7, 9, 10] }],
    '5': [{ name: 'minor pentatonic', iv: [0, 3, 5, 7, 10] }, { name: 'major pentatonic', iv: [0, 2, 4, 7, 9] }],
  };

  const PROMPTS = [
    'Challenge: use only three notes for the next 8 bars — make them sing with rhythm.',
    'Target the 3rd of each chord on beat 1. It outlines the harmony instantly.',
    'Leave space: play a short phrase, then rest for the same length. Call and response!',
    'Repeat a 4-note motif and change just one note each time.',
    'Climb slowly: start low and end your solo on your highest note.',
    'Play only on the off-beats ("&"s) for a few bars.',
    'Bend or slide into a chord tone instead of playing it directly.',
    'Try a long held note over a chord change and hear the colour shift.',
  ];

  /** Chord tones, colour tones and a recommended scale for a chord in a key. */
  function suggestions(chord, key) {
    if (!chord || chord.root == null) {
      if (!key) return null;
      return { chordPcs: [key.tonic], scalePcs: key.scale, scaleName: key.name.replace(/ (major|minor)$/, '') + (key.mode === 'major' ? ' major scale' : ' natural minor'), targetPcs: [key.tonic] };
    }
    const pcs = Theory.chordPcs(chord.root, chord.type);
    const opts = CHORD_SCALES[chord.type] || CHORD_SCALES[''];
    // prefer the scale that fits the key best
    let best = opts[0];
    if (key) {
      let bestFit = -1;
      for (const o of opts) {
        const sc = o.iv.map((i) => mod12(chord.root + i));
        const fit = sc.filter((p) => key.scale.includes(p)).length / sc.length + (o.iv.length === 5 ? 0.05 : 0);
        if (fit > bestFit) { bestFit = fit; best = o; }
      }
    }
    const scalePcs = best.iv.map((i) => mod12(chord.root + i));
    const third = pcs[1];
    const seventh = pcs[3] != null ? pcs[3] : null;
    return {
      chordPcs: pcs, scalePcs,
      scaleName: `${Theory.spell(chord.root, key && key.preferFlat)} ${best.name}`,
      targetPcs: [third, seventh].filter((x) => x != null),
    };
  }

  class ImprovCoach {
    constructor(opts) {
      opts = opts || {};
      this.instrument = opts.instrument || 'guitar';
      this.onMessage = opts.onMessage || (() => {});
      this.reference = opts.reference || null;
      this.reset();
    }
    reset() {
      this.s = { chord: 0, scale: 0, blue: 0, outside: 0, notes: 0, targetHits: 0, changes: 0, low: 999, high: -1, pcs: new Set(), iois: [], active: 0, total: 0, phrases: 0, score: 0, combo: 0, maxCombo: 0 };
      this.cool = {};
      this.lastNote = null; this.lastOnset = null; this.lastSample = 0; this.outsideSince = 0; this.silentSince = null;
      this.lastPrompt = 0; this.lastChordIndex = -1; this.changeTime = -1;
      this.now = 0;
    }
    say(cat, type, text, cd) {
      if (this.cool[cat] && this.now - this.cool[cat] < (cd || 6)) return;
      this.cool[cat] = this.now;
      this.onMessage({ type, text, cat, time: this.now });
    }

    /** frame: live frame; refTime: position in the backing track (or null) */
    update(frame, refTime) {
      const s = this.s;
      const dt = this.prevTime == null ? 0 : Math.min(0.1, frame.time - this.prevTime);
      this.prevTime = frame.time;
      this.now = frame.time;
      const ref = this.reference;
      let chord = null, key = ref ? ref.key : null, at = null;
      if (ref && refTime != null) {
        at = PM.Analyzer.chordAt(ref, refTime);
        if (at && at.chord.name !== 'N') chord = at.chord;
        if (at && at.index !== this.lastChordIndex) { this.lastChordIndex = at.index; this.changeTime = frame.time; s.changes++; }
      }
      const sug = suggestions(chord, key);
      const st = { suggestion: sug, chord, cls: null, score: s.score, combo: s.combo };
      s.total += dt;

      // the note being played: single pitch for mono instruments, top note otherwise
      let midi = null;
      if (frame.active) {
        if (frame.pitch && frame.pitch.confidence > 0.8 && (!frame.notes || frame.notes.length <= 2)) midi = frame.pitch.midi;
        else if (frame.notes && frame.notes.length) midi = frame.notes[frame.notes.length - 1].midi;
      }
      if (frame.active) {
        s.active += dt;
        if (this.silentSince != null && frame.time - this.silentSince > 0.6) s.phrases++;
        this.silentSince = null;
      } else if (this.silentSince == null) this.silentSince = frame.time;

      if (frame.onset) {
        if (this.lastOnset != null) { const ioi = frame.time - this.lastOnset; if (ioi < 2) s.iois.push(ioi); if (s.iois.length > 200) s.iois.shift(); }
        this.lastOnset = frame.time;
      }

      if (midi != null && sug && frame.time - this.lastSample > 0.1) {
        this.lastSample = frame.time;
        const pc = mod12(midi);
        s.notes++;
        s.pcs.add(pc);
        s.low = Math.min(s.low, midi); s.high = Math.max(s.high, midi);
        let cls;
        const tonic = key ? key.tonic : chord ? chord.root : 0;
        const blues = [3, 6, 10].map((i) => mod12(tonic + i));
        if (sug.chordPcs.includes(pc)) cls = 'chord';
        else if (sug.scalePcs.includes(pc) || (key && key.scale.includes(pc))) cls = 'scale';
        else if (blues.includes(pc)) cls = 'blue';
        else cls = 'outside';
        s[cls]++;
        st.cls = cls;
        const pts = { chord: 12, scale: 8, blue: 8, outside: 0 }[cls];
        if (pts) { s.combo++; s.maxCombo = Math.max(s.maxCombo, s.combo); s.score += Math.round(pts * (1 + Math.min(2, Math.floor(s.combo / 15) * 0.25))); }
        else s.combo = 0;
        // targeting: a 3rd/7th right after a chord change
        if (frame.onset && chord && frame.time - this.changeTime < 0.5 && sug.targetPcs.includes(pc)) {
          s.targetHits++; s.score += 30;
          this.say('target', 'praise', `Great targeting — you hit the ${pc === sug.targetPcs[0] ? '3rd' : '7th'} (${Theory.spell(pc, key && key.preferFlat)}) of ${chord.name} right on the change! 🎯`, 6);
        }
        if (cls === 'outside') {
          if (!this.outsideSince) this.outsideSince = frame.time;
          if (frame.time - this.outsideSince > 0.45) {
            const near = sug.chordPcs.concat(sug.scalePcs).map((p) => ({ p, d: Math.min(mod12(p - pc), mod12(pc - p)) })).sort((a, b) => a.d - b.d)[0];
            this.say('outside', 'fix', `${Theory.spell(pc, key && key.preferFlat)} clashes${chord ? ' over ' + chord.name : ''} — resolve it a half step to ${Theory.spell(near.p, key && key.preferFlat)}. Tension is fine if you resolve it!`, 7);
          }
        } else this.outsideSince = 0;
      }

      // periodic shaping feedback
      if (s.active > 15 && frame.time - (this.cool.shape || 0) > 22) {
        this.cool.shape = frame.time;
        const space = 1 - s.active / Math.max(1, s.total);
        const range = s.high - s.low;
        if (space < 0.12) this.say('space', 'tip', 'You are playing non-stop. Leave some space between phrases — rests make solos breathe.', 20);
        else if (range >= 0 && range < 7 && s.notes > 40) this.say('range', 'tip', `You're staying within ${range} semitones. Try moving up an octave for the climax of your next phrase.`, 25);
        else if (this.rhythmVariety() < 0.35 && s.iois.length > 20) this.say('rhythm', 'tip', 'Your rhythm is very even. Mix long notes with quick bursts for more interest.', 25);
        else if (s.notes > 30 && this.fit() > 0.85) this.say('fit', 'praise', 'Your note choices fit the harmony beautifully. Now try adding a little tension and release!', 25);
      }
      if (frame.time - this.lastPrompt > 35 && s.total > 8) {
        this.lastPrompt = frame.time;
        this.say('prompt', 'instruction', PROMPTS[Math.floor(Math.random() * PROMPTS.length)], 30);
      }
      st.score = s.score; st.combo = s.combo;
      st.fit = this.fit();
      return st;
    }

    fit() {
      const s = this.s;
      const n = s.chord + s.scale + s.blue + s.outside;
      return n ? (s.chord + 0.85 * s.scale + 0.8 * s.blue) / n : null;
    }
    rhythmVariety() {
      const io = this.s.iois;
      if (io.length < 4) return 0;
      const bins = new Array(8).fill(0);
      for (const x of io) bins[Math.max(0, Math.min(7, Math.floor(Math.log2(x / 0.06) * 2)))]++;
      let h = 0;
      for (const b of bins) if (b) { const p = b / io.length; h -= p * Math.log2(p); }
      return h / 3;
    }

    summary() {
      const s = this.s;
      const fit = this.fit();
      const space = s.total ? 1 - s.active / s.total : 0;
      const range = s.high >= 0 ? s.high - s.low : 0;
      const variety = this.rhythmVariety();
      const parts = [fit == null ? 0 : fit, Math.min(1, range / 14), Math.min(1, s.pcs.size / 7), Math.min(1, variety / 0.7), space > 0.15 && space < 0.6 ? 1 : 0.5];
      const acc = parts.reduce((a, b) => a + b, 0) / parts.length;
      const insights = [
        `Harmony fit ${fit == null ? '—' : Math.round(fit * 100) + '%'} (chord tones ${s.chord}, scale ${s.scale}, blue ${s.blue}, outside ${s.outside})`,
        `Range used: ${range} semitones · ${s.pcs.size} different notes`,
        `Targeted chord changes: ${s.targetHits}/${s.changes}`,
        `Space between phrases: ${Math.round(space * 100)}% · ${s.phrases} phrases`,
      ];
      let focus = 'Next time: aim for the 3rd of every chord on beat 1.';
      if (fit != null && fit < 0.6) focus = 'Next time: stay inside the suggested scale for a whole chorus, then add outside notes deliberately.';
      else if (space < 0.12) focus = 'Next time: play in 2-bar phrases with 2 bars of rest — question and answer.';
      else if (range < 7) focus = 'Next time: use at least an octave and a half of range.';
      return { accuracy: acc, stars: acc >= 0.8 ? 3 : acc >= 0.6 ? 2 : acc >= 0.4 ? 1 : 0, score: s.score, maxCombo: s.maxCombo, activeTime: s.active, insights, focus, chordsNailed: 0, improv: true };
    }
  }

  PM.Improv = { ImprovCoach, suggestions, CHORD_SCALES, PROMPTS };
  if (typeof module !== 'undefined' && module.exports) module.exports = PM.Improv;
})(typeof self !== 'undefined' ? self : globalThis);
