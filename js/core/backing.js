/* Overture — backing-track generator for improvisation & play-along practice.
 * Produces multi-instrument MIDI notes (drums, bass, comping) in any key, style and tempo.
 * The student's own instrument is left out so they get an "empty" track to play over. */
(function (root) {
  'use strict';
  const PM = (root.PM = root.PM || {});
  const { Theory } = PM;
  const mod12 = (x) => ((x % 12) + 12) % 12;

  // degrees: [semitones from tonic, chord type]
  const PROGRESSIONS = {
    pop: { name: 'Pop I–V–vi–IV', mode: 'major', bars: [[0, ''], [7, ''], [9, 'm'], [5, '']] },
    ballad: { name: 'Ballad I–vi–IV–V', mode: 'major', bars: [[0, ''], [9, 'm'], [5, ''], [7, '']] },
    blues: { name: '12-bar blues', mode: 'major', bars: [[0, '7'], [5, '7'], [0, '7'], [0, '7'], [5, '7'], [5, '7'], [0, '7'], [0, '7'], [7, '7'], [5, '7'], [0, '7'], [7, '7']] },
    jazz: { name: 'Jazz ii–V–I', mode: 'major', bars: [[2, 'm7'], [7, '7'], [0, 'maj7'], [0, 'maj7']] },
    minor: { name: 'Minor i–VII–VI–VII', mode: 'minor', bars: [[0, 'm'], [10, ''], [8, ''], [10, '']] },
    funk: { name: 'Funk vamp i7–IV7', mode: 'minor', bars: [[0, 'm7'], [0, 'm7'], [5, '7'], [0, 'm7']] },
    modal: { name: 'Dorian vamp i–IV', mode: 'minor', bars: [[0, 'm7'], [5, ''], [0, 'm7'], [5, '']] },
  };
  const STYLES = { rock: 'Rock / pop', swing: 'Swing', ballad: 'Ballad', funk: 'Funk' };

  /**
   * opts: {tonic (0-11), progression, style, bpm, choruses, exclude: instrument id}
   * Returns {notes, bpm, key:{sf,minor}, name}
   */
  function generate(opts) {
    const prog = PROGRESSIONS[opts.progression] || PROGRESSIONS.pop;
    const style = opts.style || 'rock';
    const bpm = opts.bpm || 100;
    const tonic = mod12(opts.tonic || 0);
    const beat = 60 / bpm;
    const choruses = opts.choruses || Math.max(2, Math.ceil(32 / prog.bars.length));
    const exclude = opts.exclude || '';
    const swing = style === 'swing';
    const sw = (t, k) => (swing && k % 2 === 1 ? t + beat * 0.16 : t); // delay off-beat 8ths
    const notes = [];
    const lead = 4 * beat; // one-bar count-in of hi-hat
    const add = (n) => notes.push(n);
    for (let i = 0; i < 4; i++) add({ midi: 42, start: i * beat, end: i * beat + 0.05, velocity: 0.7, channel: 9, voice: 'drums' });

    const compVoice = exclude === 'piano' ? 'guitar' : exclude === 'guitar' || exclude === 'electric' ? 'piano' : 'piano';
    const playBass = exclude !== 'bass';
    const playComp = exclude !== 'piano' || compVoice === 'guitar';
    const allBars = [];
    for (let c = 0; c < choruses; c++) for (const b of prog.bars) allBars.push(b);
    allBars.forEach(([deg, type], bi) => {
      const t0 = lead + bi * 4 * beat;
      const root = mod12(tonic + deg);
      const pcs = Theory.chordPcs(root, type);
      const nextRoot = mod12(tonic + allBars[(bi + 1) % allBars.length][0]);
      const bassRoot = 36 + root - (root > 7 ? 12 : 0); // E1..G2 region
      // ---- drums
      for (let k = 0; k < 8; k++) {
        const t = sw(t0 + (k * beat) / 2, k);
        if (style === 'swing') {
          if (k % 2 === 0 || k === 3 || k === 7) add({ midi: 51, start: t, end: t + 0.1, velocity: k % 2 ? 0.45 : 0.6, channel: 9, voice: 'drums' });
          if (k === 2 || k === 6) add({ midi: 42, start: t, end: t + 0.05, velocity: 0.5, channel: 9, voice: 'drums' });
        } else if (style === 'funk') {
          for (const sub of [0, 1]) add({ midi: 42, start: t + (sub * beat) / 4, end: t + (sub * beat) / 4 + 0.03, velocity: sub ? 0.35 : 0.6, channel: 9, voice: 'drums' });
        } else if (style === 'ballad') {
          if (k % 2 === 0) add({ midi: 42, start: t, end: t + 0.05, velocity: 0.35, channel: 9, voice: 'drums' });
        } else add({ midi: 42, start: t, end: t + 0.05, velocity: k % 2 ? 0.4 : 0.6, channel: 9, voice: 'drums' });
      }
      const kicks = style === 'funk' ? [0, 1.5, 2.75] : style === 'ballad' ? [0, 2.5] : style === 'swing' ? [0, 2] : [0, 2, 2.5];
      const snares = style === 'ballad' ? [2] : [1, 3];
      kicks.forEach((b) => add({ midi: 36, start: t0 + b * beat, end: t0 + b * beat + 0.1, velocity: style === 'swing' ? 0.45 : 0.9, channel: 9, voice: 'drums' }));
      snares.forEach((b) => add({ midi: style === 'swing' ? 37 : 38, start: t0 + b * beat, end: t0 + b * beat + 0.1, velocity: style === 'swing' ? 0.35 : 0.8, channel: 9, voice: 'drums' }));
      if (bi % 4 === 0) add({ midi: 49, start: t0, end: t0 + 1, velocity: 0.5, channel: 9, voice: 'drums' });

      // ---- bass
      if (playBass) {
        const B = (m, b, d, v) => add({ midi: m, start: t0 + b * beat, end: t0 + (b + d) * beat, velocity: v || 0.85, channel: 1, voice: 'bass' });
        if (style === 'swing') {
          const fifth = bassRoot + 7, third = bassRoot + (pcs[1] - root + 12) % 12;
          const approach = 36 + nextRoot - (nextRoot > 7 ? 12 : 0) - 1;
          [bassRoot, third, fifth, approach].forEach((m, k) => B(m, k, 0.9, 0.8));
        } else if (style === 'ballad') { B(bassRoot, 0, 1.9); B(bassRoot + 7, 2, 1.9, 0.7); }
        else if (style === 'funk') { B(bassRoot, 0, 0.4); B(bassRoot + 12, 0.75, 0.2, 0.6); B(bassRoot, 1.5, 0.4); B(bassRoot + 10, 2.5, 0.4, 0.7); B(bassRoot + 7, 3, 0.4); B(bassRoot, 3.5, 0.3, 0.6); }
        else for (let k = 0; k < 8; k++) B(bassRoot + (k === 7 ? 7 : 0), k / 2, 0.45, k % 2 ? 0.65 : 0.85);
      }

      // ---- comping
      if (playComp) {
        let r = 60 + root;
        if (r > 66) r -= 12;
        const voicing = Theory.TYPE_BY_ID[type].iv.map((iv) => r + iv);
        if (compVoice === 'guitar') {
          const strum = (b, v, up) => (up ? [...voicing].reverse() : voicing).forEach((m, i) => add({ midi: m - 12, start: t0 + b * beat + i * 0.012, end: t0 + (b + 0.9) * beat, velocity: v, channel: 2, voice: 'guitar' }));
          [[0, 0.8], [1, 0.6], [1.5, 0.45, true], [2.5, 0.5, true], [3, 0.6], [3.5, 0.45, true]].forEach(([b, v, up]) => strum(b, v, up));
        } else {
          const C = (b, d, v) => voicing.forEach((m) => add({ midi: m, start: t0 + b * beat, end: t0 + (b + d) * beat, velocity: v, channel: 0, voice: 'piano' }));
          if (style === 'swing') { C(0, 1.5, 0.5); C(1.66, 0.8, 0.42); C(2.66, 1.3, 0.45); }
          else if (style === 'ballad') voicing.forEach((m, i) => add({ midi: m, start: t0 + i * beat, end: t0 + 4 * beat, velocity: 0.45, channel: 0, voice: 'piano' }));
          else if (style === 'funk') [0, 0.75, 2.25, 3].forEach((b) => C(b, 0.2, 0.55));
          else [0, 1, 2, 3].forEach((b) => C(b, 0.85, b % 2 ? 0.45 : 0.55));
        }
      }
    });
    notes.sort((a, b) => a.start - b.start);
    const minor = prog.mode === 'minor';
    const sf = ((([0, 7, 2, 9, 4, 11, 6, 1, 8, 3, 10, 5].indexOf(minor ? mod12(tonic + 3) : tonic)) + 6) % 12) - 6;
    const keyName = Theory.spell(tonic, [5, 10, 3, 8, 1].includes(tonic)) + (minor ? ' minor' : '');
    return { notes, bpm, key: { sf, minor }, name: `${prog.name} in ${keyName} · ${STYLES[style]} · ${bpm} BPM` };
  }

  /**
   * Backing track for a song chart (any meter, chords can change inside a bar).
   * opts: {bars: [[{root, type, beats}...]...], beatsPerBar, style, bpm, repeats, exclude, title}
   * Returns {notes, bpm, key, name} like generate().
   */
  function generateChart(opts) {
    const bpb = Math.max(2, Math.min(12, opts.beatsPerBar || 4));
    const style = opts.style || (bpb === 3 ? 'ballad' : 'rock');
    const bpm = opts.bpm || 90;
    const beat = 60 / bpm;
    const exclude = opts.exclude || '';
    const repeats = Math.max(1, opts.repeats || 1);
    const notes = [];
    const add = (n) => notes.push(n);
    const lead = bpb * beat;
    for (let i = 0; i < bpb; i++) add({ midi: 42, start: i * beat, end: i * beat + 0.05, velocity: i ? 0.55 : 0.75, channel: 9, voice: 'drums' });
    const bars = [];
    for (let r = 0; r < repeats; r++) for (const b of opts.bars) bars.push(b);
    const compVoice = exclude === 'piano' ? 'guitar' : 'piano';
    const playBass = exclude !== 'bass';
    bars.forEach((bar, bi) => {
      const t0 = lead + bi * bpb * beat;
      // drums: waltz (3/4, 6/8 feel) or backbeat
      for (let k = 0; k < bpb; k++) {
        const t = t0 + k * beat;
        if (style !== 'none') add({ midi: 42, start: t, end: t + 0.05, velocity: k ? 0.35 : 0.5, channel: 9, voice: 'drums' });
        if (bpb % 3 === 0) { if (k % 3 === 0) add({ midi: 36, start: t, end: t + 0.1, velocity: k ? 0.6 : 0.8, channel: 9, voice: 'drums' }); else if (style !== 'ballad') add({ midi: 37, start: t, end: t + 0.08, velocity: 0.3, channel: 9, voice: 'drums' }); }
        else if (k % 2 === 0) add({ midi: 36, start: t, end: t + 0.1, velocity: 0.8, channel: 9, voice: 'drums' });
        else add({ midi: style === 'ballad' ? 37 : 38, start: t, end: t + 0.1, velocity: style === 'ballad' ? 0.35 : 0.7, channel: 9, voice: 'drums' });
      }
      if (bi % 4 === 0) add({ midi: 49, start: t0, end: t0 + 1, velocity: 0.4, channel: 9, voice: 'drums' });
      // harmony: each chord fills its beats (a bar with no chord list repeats the previous chord)
      let beatPos = 0;
      const chords = bar.length ? bar : [{ root: 0, type: '', beats: bpb, rest: true }];
      const each = bpb / chords.length;
      chords.forEach((c) => {
        const beats = c.beats || each;
        const cs = t0 + beatPos * beat;
        beatPos += beats;
        if (c.rest || !Theory.TYPE_BY_ID[c.type]) return;
        const root = mod12(c.root);
        const bassRoot = 36 + root - (root > 7 ? 12 : 0);
        if (playBass) {
          for (let k = 0; k < beats; k++) {
            const m = bpb % 3 === 0 ? (k % 3 === 0 ? bassRoot : null) : (k === 0 ? bassRoot : k === 2 ? bassRoot + 7 : null);
            if (m != null) add({ midi: m, start: cs + k * beat, end: cs + (k + (bpb % 3 === 0 ? 2.8 : 1.8)) * beat, velocity: 0.8, channel: 1, voice: 'bass' });
          }
          if (beats < 2) add({ midi: bassRoot, start: cs, end: cs + beats * beat * 0.95, velocity: 0.8, channel: 1, voice: 'bass' });
        }
        let r = 60 + root;
        if (r > 66) r -= 12;
        const voicing = Theory.TYPE_BY_ID[c.type].iv.map((iv) => r + iv);
        for (let k = 0; k < beats; k++) {
          const t = cs + k * beat;
          const strong = (beatPos - beats + k) % bpb === 0;
          if (compVoice === 'guitar') voicing.forEach((m, i) => add({ midi: m - 12, start: t + i * 0.012, end: t + 0.95 * beat, velocity: strong ? 0.7 : 0.5, channel: 2, voice: 'guitar' }));
          else if (bpb % 3 === 0 && k % 3 === 0) add({ midi: voicing[0] - 12, start: t, end: t + 0.95 * beat, velocity: 0.5, channel: 0, voice: 'piano' });
          else voicing.forEach((m) => add({ midi: m, start: t, end: t + 0.9 * beat, velocity: strong ? 0.5 : 0.4, channel: 0, voice: 'piano' }));
        }
      });
    });
    notes.sort((a, b) => a.start - b.start);
    const tonic = mod12(opts.tonic || 0), minor = !!opts.minor;
    const sf = ((([0, 7, 2, 9, 4, 11, 6, 1, 8, 3, 10, 5].indexOf(minor ? mod12(tonic + 3) : tonic)) + 6) % 12) - 6;
    return { notes, bpm, key: { sf, minor }, beatsPerBar: bpb, name: `${opts.title || 'Song'} · ${bpm} BPM` };
  }

  PM.Backing = { generate, generateChart, PROGRESSIONS, STYLES };
  if (typeof module !== 'undefined' && module.exports) module.exports = PM.Backing;
})(typeof self !== 'undefined' ? self : globalThis);
