/* Overture — Fingering engine. Suggests fingerings for a melody, plus alternatives:
 *  • piano: finger numbers 1–5 for right or left hand (dynamic programming over hand
 *    stretch, thumb-under / finger-over crossings and black-key comfort);
 *  • guitar & bass: string, fret and finger (1-finger-per-fret on guitar, 1-2-4 on low
 *    bass positions) minimising shifts — with "open position" and "up the neck" options;
 *  • trumpet: valve combinations with common alternate fingerings.
 * Pure functions (no DOM) so they're unit-tested in Node. */
(function (root) {
  'use strict';
  const PM = (root.PM = root.PM || {});
  const BIG = 1e6;
  const isBlack = (m) => [1, 3, 6, 8, 10].includes(((m % 12) + 12) % 12);

  // ---------------------------------------------------------------- piano
  // comfortable spans (semitones) between finger a (lower) and b (higher) in one hand position
  const SPAN = { '1-2': [1, 4], '1-3': [3, 5], '1-4': [4, 7], '1-5': [6, 9], '2-3': [1, 3], '2-4': [2, 5], '2-5': [4, 7], '3-4': [1, 3], '3-5': [2, 4], '4-5': [1, 3] };

  /** cost of playing n2 with finger f2 straight after n1 with f1 (right-hand coordinates) */
  function pianoStep(n1, f1, n2, f2, black2, black1) {
    const d = n2 - n1;
    let c = 0;
    if (d === 0) return f1 === f2 ? 0 : 1.2;
    if (f1 === f2) return Math.abs(d) >= 7 ? 3 : 7; // same finger on a new note = a jump
    const up = d > 0, higherFinger = f2 > f1;
    if (up === higherFinger) {
      // normal order: check the span
      const a = Math.min(f1, f2), b = Math.max(f1, f2), [lo, hi] = SPAN[a + '-' + b];
      const ad = Math.abs(d);
      if (ad > hi) c += ad - hi > 4 ? 5 : (ad - hi) * 1.2; // stretch or a small jump
      else if (ad < lo) c += (lo - ad) * 0.8; // squashed
      if ((a === 3 && b === 4) || (a === 4 && b === 5)) c += 0.15; // weaker fingers
      if (ad <= 2 && b - a >= 2) c += 0.5; // a step should use neighbouring fingers
    } else {
      // crossing: thumb passes under (going up) or a finger crosses over the thumb (going down)
      const thumbUnder = up && f2 === 1 && f1 >= 2 && f1 <= 4;
      const overThumb = !up && f1 === 1 && f2 >= 2 && f2 <= 4;
      if (!thumbUnder && !overThumb) return 25;
      const other = thumbUnder ? f1 : f2, ad = Math.abs(d);
      c += 1.6 + (other === 4 ? 0.5 : other === 2 ? 0.4 : 0) + (ad > 5 ? (ad - 5) * 1.2 : 0);
      if (black2 && f2 === 1) c += 1.5;
      if (thumbUnder && !black1 && !black2) c -= 0.2;
    }
    if (black2 && f2 === 1) c += 1.2;
    if (black2 && f2 === 5) c += 0.5;
    return c;
  }

  function pianoDP(notes, hand, opt) {
    opt = opt || {};
    const N = notes.length;
    if (!N) return { fingers: [], cost: 0 };
    // the left hand mirrors the right: flip pitches so "up" means away from the thumb
    const xs = hand === 'L' ? notes.map((m) => -m) : notes.slice();
    const startCost = opt.start ? (f) => (f === opt.start ? 0 : BIG) : (f) => [0, 0, 0.1, 0.2, 0.3, 0.4][f];
    const crossW = opt.noCross ? 6 : 1;
    let cost = [0, 1, 2, 3, 4, 5].map((f) => (f ? startCost(f) : BIG));
    const back = [];
    for (let i = 1; i < N; i++) {
      const nc = [BIG, BIG, BIG, BIG, BIG, BIG], bk = [0, 0, 0, 0, 0, 0];
      for (let f2 = 1; f2 <= 5; f2++) {
        for (let f1 = 1; f1 <= 5; f1++) {
          if (cost[f1] >= BIG) continue;
          let s = pianoStep(xs[i - 1], f1, xs[i], f2, isBlack(notes[i]), isBlack(notes[i - 1]));
          const crossing = xs[i] !== xs[i - 1] && (xs[i] > xs[i - 1]) !== (f2 > f1) && f1 !== f2;
          if (crossing) s *= crossW;
          const v = cost[f1] + s;
          if (v < nc[f2]) { nc[f2] = v; bk[f2] = f1; }
        }
      }
      cost = nc; back.push(bk);
    }
    let f = 1;
    for (let k = 2; k <= 5; k++) if (cost[k] < cost[f]) f = k;
    const total = cost[f];
    const fingers = new Array(N);
    fingers[N - 1] = f;
    for (let i = N - 1; i >= 1; i--) { f = back[i - 1][f]; fingers[i - 1] = f; }
    return { fingers, cost: total };
  }

  /** Explain the moves in a piano fingering ("thumb under", "shift"). */
  function pianoNotes(notes, fingers, hand) {
    return notes.map((m, i) => {
      if (!i) return '';
      const d = (hand === 'L' ? -1 : 1) * (m - notes[i - 1]), f1 = fingers[i - 1], f2 = fingers[i];
      if (d > 0 && f2 === 1 && f1 > 1) return 'thumb under';
      if (d < 0 && f1 === 1 && f2 > 1) return f2 + ' over thumb';
      if (f1 === f2 && d) return 'move hand';
      const a = Math.min(f1, f2), b = Math.max(f1, f2), span = SPAN[a + '-' + b];
      if (span && Math.abs(d) > span[1]) return 'stretch / shift';
      return '';
    });
  }

  /** Piano fingerings: [{id, label, hand, fingers[], notes[] (hints), cost}] best first. */
  function piano(notes, hand) {
    hand = hand === 'L' ? 'L' : 'R';
    const out = [];
    const add = (id, label, r) => {
      if (!r.fingers.length || r.cost >= BIG) return;
      if (out.some((o) => o.fingers.join() === r.fingers.join())) return;
      out.push({ id, label, hand, fingers: r.fingers, hints: pianoNotes(notes, r.fingers, hand), cost: Math.round(r.cost * 10) / 10 });
    };
    const best = pianoDP(notes, hand);
    add('best', 'Recommended', best);
    add('position', 'Hand positions (no crossings)', pianoDP(notes, hand, { noCross: true }));
    for (const s of [1, 2, 3]) if (s !== best.fingers[0]) add('start' + s, 'Start on finger ' + s, pianoDP(notes, hand, { start: s }));
    return out.slice(0, 4);
  }

  // ---------------------------------------------------------------- fretted
  /** Every place a note can be played: [{string, fret}] (string 0 = lowest). */
  function positions(midi, strings, frets) {
    const out = [];
    strings.forEach((open, s) => { const f = midi - open; if (f >= 0 && f <= frets) out.push({ string: s, fret: f }); });
    return out;
  }

  /** finger options for a fret given the style: returns [{finger, anchor}] (anchor = fret under finger 1) */
  function fingerOptions(fret, style) {
    if (fret === 0) return [{ finger: 0, anchor: null }];
    if (style === 'simandl' && fret < 7) return [[1, 0], [2, 1], [4, 2]].map(([f, o]) => ({ finger: f, anchor: fret - o })).filter((x) => x.anchor >= 1);
    return [1, 2, 3, 4].map((f) => ({ finger: f, anchor: fret - (f - 1) })).filter((x) => x.anchor >= 1);
  }

  function frettedDP(notes, strings, frets, style, opt) {
    opt = opt || {};
    const N = notes.length;
    const states = notes.map((m) => {
      const st = [];
      for (const p of positions(m, strings, frets)) for (const fo of fingerOptions(p.fret, style)) st.push(Object.assign({}, p, fo));
      return st;
    });
    if (states.some((s) => !s.length)) return null;
    const local = (s) => {
      let c = 0;
      if (s.fret === 0) c += opt.avoidOpen ? 3 : opt.preferOpen ? -0.3 : 0.1;
      if (opt.preferOpen) c += s.fret > 4 ? (s.fret - 4) * 1.5 : 0;
      else if (opt.minFret) c += s.fret && s.fret < opt.minFret ? (opt.minFret - s.fret) * 0.8 : 0;
      else c += s.fret * 0.05;
      if (s.finger === 4 && style !== 'simandl') c += 0.15;
      return c;
    };
    // DP: carry the hand's anchor through open strings
    let cost = states[0].map((s) => local(s));
    let anchor = states[0].map((s) => (s.anchor != null ? s.anchor : null));
    const back = [];
    for (let i = 1; i < N; i++) {
      const nc = [], na = [], bk = [];
      states[i].forEach((s2, j) => {
        let best = BIG, bj = 0, ba = null;
        states[i - 1].forEach((s1, k) => {
          const a1 = anchor[k];
          let c = cost[k] + local(s2) + Math.abs(s2.string - s1.string) * 0.35;
          let a2 = s2.anchor;
          if (s2.fret === 0) a2 = a1; // open string: hand stays put
          else if (a1 != null && a2 !== a1) c += 1.5 + Math.abs(a2 - a1) * 0.6; // position shift
          if (s1.fret && s2.fret && s1.finger === s2.finger && (s1.fret !== s2.fret || s1.string !== s2.string)) c += s1.fret === s2.fret ? 0.6 : 1.2;
          if (s1.fret && s2.fret && s2.string === s1.string && (s2.fret - s1.fret) * (s2.finger - s1.finger) < 0) c += 4; // fingers out of order on one string
          if (c < best) { best = c; bj = k; ba = a2; }
        });
        nc.push(best); na.push(ba); bk.push(bj);
      });
      cost = nc; anchor = na; back.push(bk);
    }
    let j = 0;
    cost.forEach((c, k) => { if (c < cost[j]) j = k; });
    const total = cost[j];
    const path = new Array(N);
    for (let i = N - 1; i >= 0; i--) { path[i] = states[i][j]; if (i) j = back[i - 1][j]; }
    return { path: path.map((s) => ({ string: s.string, fret: s.fret, finger: s.finger })), cost: total };
  }

  function frettedHints(path) {
    let anchor = null;
    return path.map((p, i) => {
      if (!p.fret) return 'open string';
      const a = p.fret - (p.finger - 1);
      const h = anchor != null && a !== anchor ? `shift to fret ${a}` : i === 0 ? `position ${a}` : '';
      anchor = a;
      return h;
    });
  }

  /** Guitar/bass fingerings: [{id, label, path:[{string,fret,finger}], hints, cost}] best first. */
  function fretted(notes, inst) {
    const I = typeof inst === 'string' ? PM.Instruments.get(inst) : inst;
    const strings = I.strings, frets = I.frets || 15;
    const style = I.id === 'bass' ? 'simandl' : 'ofpf';
    const out = [];
    const add = (id, label, r) => {
      if (!r) return;
      const key = r.path.map((p) => p.string + ':' + p.fret + ':' + p.finger).join();
      if (out.some((o) => o.key === key)) return;
      out.push({ id, label, key, path: r.path, hints: frettedHints(r.path), cost: Math.round(r.cost * 10) / 10 });
    };
    add('best', 'Recommended', frettedDP(notes, strings, frets, style));
    add('open', 'Open position', frettedDP(notes, strings, frets, style, { preferOpen: true }));
    add('neck', 'Up the neck (no open strings)', frettedDP(notes, strings, frets, style, { avoidOpen: true, minFret: 5 }));
    if (style === 'simandl') add('ofpf', 'One finger per fret', frettedDP(notes, strings, frets, 'ofpf'));
    return out.map(({ key, ...o }) => o);
  }

  // ---------------------------------------------------------------- trumpet
  // alternates by written pitch: [valves, why]
  const TRUMPET_ALT = {
    61: [['1 2 3', 'kick the 3rd-valve slide out — it is sharp']],
    62: [['1 3', 'push the 1st-valve slide out a little — it is sharp']],
    66: [['1 2 3', 'from the C partial; a little sharp']],
    67: [['1 3', 'same G from the next partial; useful for slurs']],
    69: [['3', 'same as 1-2, slightly flat — handy in fast passages']],
    73: [['3', 'alternate for C♯ — useful for trills']],
    74: [['1 3', 'alternate D; a little flat, good for lip slurs']],
    75: [['2 3', 'alternate E♭ for trills with D']],
    76: [['1 2', 'alternate E — slightly flat, good for E–F trills']],
    78: [['2 3', 'alternate F♯ — slightly sharp']],
    79: [['1 3', 'alternate G — slightly flat, for G–A♭ trills']],
    80: [['1', 'from the B♭ partial; a little sharp']],
    81: [['3', 'alternate A — in tune on most trumpets']],
    82: [['0', 'open B♭ (7th partial) — very flat, avoid except in fast runs']],
    83: [['1 2', 'alternate B — sharp']],
  };
  /** Trumpet fingerings for a concert pitch: [{valves, written, main, why}] */
  function trumpet(concertMidi) {
    const info = PM.Instruments.trumpetInfo(concertMidi);
    if (!info.valves) return [];
    const out = [{ valves: info.valves, written: info.written, main: true, why: 'standard fingering' }];
    for (const [v, why] of TRUMPET_ALT[info.written] || []) if (v !== info.valves) out.push({ valves: v, written: info.written, main: false, why });
    return out;
  }

  /** Fingering for any instrument; returns {kind, options:[…]} */
  function forInstrument(inst, notes, hand) {
    const I = PM.Instruments.get(inst);
    if (I.strings) return { kind: 'fret', options: fretted(notes, I) };
    if (I.family === 'keys') return { kind: 'piano', options: piano(notes, hand) };
    if (I.family === 'brass') return { kind: 'valves', options: [{ id: 'best', label: 'Standard', per: notes.map((m) => trumpet(m)) }] };
    return { kind: 'none', options: [] };
  }

  PM.Fingering = { piano, pianoDP, fretted, frettedDP, positions, trumpet, forInstrument, TRUMPET_ALT, isBlack };
  if (typeof module !== 'undefined' && module.exports) module.exports = PM.Fingering;
})(typeof self !== 'undefined' ? self : globalThis);
