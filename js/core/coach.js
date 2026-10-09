/* Cadenza — the on-device AI practice coach. Compares the live performance against
 * the reference analysis (or the metronome in free play) and produces scores,
 * corrections, instructions and encouragement in real time. */
(function (root) {
  'use strict';
  const PM = (root.PM = root.PM || {});
  const { Theory, Analyzer } = PM;

  const TIPS = {
    guitar: [
      'Keep your strumming hand moving like a pendulum — down on the beat, up on the "&", even when you skip a strum.',
      'Press just behind the fret, not on top of it: cleaner tone with less pressure.',
      'Relax your thumb behind the neck. Tension slows chord changes.',
      'Anticipate the change: lift your fingers on the last "&" of the bar so the next chord lands on beat 1.',
      'Let common fingers stay anchored between chords — pivot instead of lifting everything.',
      'Accent beats 2 and 4 slightly to lock into a groove.',
      'If a string buzzes, arch your fingers more so they don’t touch neighbouring strings.',
      'Practise slow and perfect. Speed is a by-product of accuracy.',
    ],
    piano: [
      'Keep your wrists level and fingers curved, as if holding a small ball.',
      'Play from the arm weight, not finger force, for a fuller tone.',
      'Look one chord ahead — your eyes should lead your hands.',
      'Use the sustain pedal lightly: change it right after each new chord.',
      'Voice the melody louder than the accompaniment by leaning into the top note.',
      'Practise hands separately at half tempo before combining.',
      'Find common tones between chords and keep them held through the change.',
      'Count out loud for a few bars to anchor your internal pulse.',
    ],
  };

  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

  /** Reference beat grid at a chosen subdivision. */
  function beatGrid(beats, subdiv) {
    subdiv = subdiv || 1;
    return {
      nearest(t) {
        const pos = PM.Rhythm.beatPosition(t, beats);
        if (!pos) return null;
        const i = pos.index;
        const ib = (beats[i + 1] || beats[i] + 0.5) - beats[i];
        const step = ib / subdiv;
        const k = Math.round((t - beats[i]) / step);
        return { offset: t - (beats[i] + k * step), interval: step, beatIndex: i + k / subdiv };
      },
    };
  }

  function topPcs(chroma, rel) {
    let mx = 0;
    for (let i = 0; i < 12; i++) if (chroma[i] > mx) mx = chroma[i];
    const out = [];
    if (!mx) return out;
    const order = Array.from({ length: 12 }, (_, i) => i).sort((a, b) => chroma[b] - chroma[a]);
    for (const pc of order) if (chroma[pc] >= mx * (rel || 0.45) && out.length < 5) out.push(pc);
    return out;
  }

  function compareChord(expected, live, chroma) {
    const E = expected.pcs;
    if (live && live.root === expected.root && (live.type === expected.type || [live.type, expected.type].every((t) => ['', '5', '7', 'maj7', 'sus2', 'sus4'].includes(t)) && live.type !== 'm' && expected.type !== 'm')) {
      return { result: 'hit', missing: [], extra: [] };
    }
    const P = chroma ? topPcs(chroma) : live ? live.pcs : [];
    const inter = E.filter((p) => P.includes(p));
    const missing = E.filter((p) => !P.includes(p));
    const extra = P.filter((p) => !E.includes(p));
    const overlap = inter.length / E.length;
    if (overlap >= 0.99 && extra.length <= 1) return { result: 'hit', missing, extra };
    if (overlap >= 0.6) return { result: 'close', missing, extra };
    return { result: 'miss', missing, extra };
  }

  class Coach {
    constructor(opts) {
      opts = opts || {};
      this.instrument = opts.instrument || 'guitar';
      this.onMessage = opts.onMessage || (() => {});
      this.reference = null;
      this.reset();
      if (opts.reference) this.setReference(opts.reference);
    }

    setReference(analysis) {
      this.reference = analysis;
      this.refGrid = analysis && analysis.beats && analysis.beats.length > 3
        ? beatGrid(analysis.beats, this.instrument === 'guitar' ? (analysis.strum ? analysis.strum.grid : 2) : 2)
        : null;
      this.reset();
    }

    reset() {
      this.stats = {
        chordSamples: 0, chordHits: 0, chordClose: 0,
        noteSamples: 0, noteHits: 0,
        onsets: 0, onTime: 0, good: 0, offsets: [],
        intonationSamples: 0, inTune: 0,
        dynSamples: 0, dynMatch: 0,
        score: 0, combo: 0, maxCombo: 0, activeTime: 0, chordsNailed: 0,
      };
      this.cool = {};
      this.lastEval = 0;
      this.lastTip = 0;
      this.segResults = new Map();
      this.announced = new Set();
      this.pitchRun = { cents: [], since: 0 };
      this.liveChroma = new Float32Array(12);
      this.levelRange = { lo: -60, hi: -20 };
      this.recentOffsets = [];
      this.lastFrameTime = null;
      this.state = {};
    }

    say(cat, type, text, cooldown) {
      const now = this.now || 0;
      if (this.cool[cat] && now - this.cool[cat] < (cooldown || 5)) return false;
      this.cool[cat] = now;
      this.onMessage({ type, text, cat, time: now });
      return true;
    }

    award(points) {
      const mult = 1 + Math.min(3, Math.floor(this.stats.combo / 10) * 0.5);
      this.stats.score += Math.round(points * mult);
      return mult;
    }

    bumpCombo(ok) {
      if (ok) {
        this.stats.combo++;
        if (this.stats.combo > this.stats.maxCombo) this.stats.maxCombo = this.stats.combo;
        if ([10, 25, 50, 100].includes(this.stats.combo)) this.say('combo', 'praise', `🔥 ${this.stats.combo}× combo! You're in the zone.`, 2);
      } else {
        if (this.stats.combo >= 10) this.say('combo-lost', 'info', `Combo of ${this.stats.combo} ended — shake it off and lock back in.`, 4);
        this.stats.combo = 0;
      }
    }

    /**
     * frame: {time, refTime?, active, db, pitch, chord, chroma, notes, onset}
     * grid: optional external timing grid (metronome) with nearest(t)
     */
    update(frame, grid) {
      const s = this.stats;
      this.now = frame.time;
      const dt = this.lastFrameTime == null ? 0 : Math.min(0.1, frame.time - this.lastFrameTime);
      this.lastFrameTime = frame.time;
      const ref = this.reference;
      const refTime = frame.refTime;
      const st = (this.state = { expected: null, chordResult: null, timing: null, intonation: null, dynamics: null });

      // level calibration (rolling)
      if (frame.active) {
        s.activeTime += dt;
        this.levelRange.hi = Math.max(frame.db, this.levelRange.hi - dt * 0.5);
        this.levelRange.lo = Math.min(frame.db - 6, this.levelRange.lo + dt * 0.5);
      }
      const liveLevel = Math.max(0, Math.min(1, (frame.db - this.levelRange.lo) / Math.max(6, this.levelRange.hi - this.levelRange.lo)));
      st.liveLevel = liveLevel;

      // --- expectations from the reference
      let expected = null, seg = null;
      if (ref && refTime != null) {
        const at = Analyzer.chordAt(ref, refTime);
        if (at && at.chord.name !== 'N') { expected = at.chord; seg = at; }
        st.expected = at ? { chord: at.chord, next: at.next, nextIn: at.next ? at.next.start - refTime : null } : null;
        st.expectedNotes = Analyzer.notesAt(ref, refTime, 0.03).map((n) => n.midi);
        if (at && at.next && at.next.name !== 'N' && at.next.start - refTime < 1.6 && !this.announced.has(at.index + 1)) {
          this.announced.add(at.index + 1);
          this.onMessage({ type: 'instruction', cat: 'next', time: this.now, text: this.describeUpcoming(at.next, at.next.start - refTime) });
        }
      }

      // --- chord accuracy (sampled every 150 ms while playing)
      if (frame.active && expected && frame.time - this.lastEval > 0.15) {
        this.lastEval = frame.time;
        const cmp = compareChord(expected, frame.chord, frame.chroma);
        st.chordResult = cmp;
        s.chordSamples++;
        if (cmp.result === 'hit') { s.chordHits++; this.award(10); this.bumpCombo(true); }
        else if (cmp.result === 'close') { s.chordClose++; this.award(4); }
        else this.bumpCombo(false);
        const key = seg.index;
        const r = this.segResults.get(key) || { hit: 0, close: 0, miss: 0, missing: new Map(), extra: new Map(), chord: expected, played: new Map() };
        r[cmp.result]++;
        cmp.missing.forEach((p) => r.missing.set(p, (r.missing.get(p) || 0) + 1));
        cmp.extra.forEach((p) => r.extra.set(p, (r.extra.get(p) || 0) + 1));
        if (frame.chord) r.played.set(frame.chord.name, (r.played.get(frame.chord.name) || 0) + 1);
        this.segResults.set(key, r);
      }
      // segment finished → feedback
      for (const [k, r] of this.segResults) {
        if (!seg || k < seg.index) { this.segmentFeedback(r); this.segResults.delete(k); }
      }

      // --- note accuracy for piano melodies (when reference has notes but no clear chord)
      if (frame.active && st.expectedNotes && st.expectedNotes.length && !expected && frame.notes && frame.time - this.lastEval > 0.15) {
        this.lastEval = frame.time;
        const livePcs = new Set(frame.notes.map((n) => n.midi % 12));
        const exp = st.expectedNotes;
        const hits = exp.filter((m) => livePcs.has(m % 12)).length;
        s.noteSamples++;
        if (hits / exp.length >= 0.5) { s.noteHits++; this.award(8); this.bumpCombo(true); }
        else {
          this.bumpCombo(false);
          const missed = exp.filter((m) => !livePcs.has(m % 12)).map((m) => PM.DSP.midiName(m));
          this.say('notes', 'fix', `Listen for ${missed.slice(0, 3).join(', ')} — those notes are missing right now.`, 6);
        }
      }

      // --- timing
      const g = grid || (ref && refTime != null ? this.refGridAt(refTime) : null);
      if (frame.onset && g) {
        const t = grid ? frame.time : refTime;
        const near = g.nearest(t);
        if (near && Math.abs(near.offset) < near.interval * 0.4) {
          // reference offsets are in track time; convert to real time when the track is slowed down
          const ms = (near.offset * 1000) / (grid ? 1 : frame.rate || 1);
          s.onsets++;
          s.offsets.push(ms);
          this.recentOffsets.push(ms);
          if (this.recentOffsets.length > 12) this.recentOffsets.shift();
          const abs = Math.abs(ms);
          let label;
          if (abs < 30) { s.onTime++; label = 'perfect'; this.award(15); this.bumpCombo(true); }
          else if (abs < 65) { s.good++; label = ms < 0 ? 'early' : 'late'; this.award(6); }
          else { label = ms < 0 ? 'early' : 'late'; this.bumpCombo(false); }
          st.timing = { offsetMs: ms, label };
          this.timingFeedback();
        }
      }

      // --- intonation (guitar strings / single notes)
      if (frame.active && frame.pitch && frame.pitch.confidence > 0.88 && this.instrument === 'guitar' && (!frame.notes || frame.notes.length <= 1)) {
        const c = frame.pitch.cents;
        st.intonation = { cents: c, note: frame.pitch.name };
        s.intonationSamples++;
        if (Math.abs(c) <= 12) s.inTune++;
        const run = this.pitchRun;
        if (run.note !== frame.pitch.name) { run.note = frame.pitch.name; run.cents = []; run.since = frame.time; }
        run.cents.push(c);
        if (frame.time - run.since > 0.45 && run.cents.length > 8) {
          const avg = run.cents.reduce((a, b) => a + b, 0) / run.cents.length;
          if (Math.abs(avg) > 15) {
            const dir = avg > 0 ? 'sharp' : 'flat';
            const hint = avg > 0 ? 'ease off the finger pressure or check your tuning' : 'press a little firmer or tune up slightly';
            this.say('intonation', 'fix', `Your ${run.note} is ${Math.abs(Math.round(avg))}¢ ${dir} — ${hint}.`, 7);
          }
          run.since = frame.time; run.cents = [];
        }
      }

      // --- dynamics vs reference
      if (frame.active && ref && refTime != null && ref.dynamics) {
        const target = Analyzer.dynLevelAt(ref.dynamics, refTime);
        const mark = Analyzer.dynMarkAt(ref.dynamics, refTime);
        const delta = liveLevel - target;
        st.dynamics = { target, live: liveLevel, mark, delta };
        s.dynSamples++;
        if (Math.abs(delta) < 0.25) s.dynMatch++;
        if (s.activeTime > 4) {
          if (delta < -0.35) this.say('dyn', 'fix', `This passage is ${mark} — dig in and play with more energy.`, 9);
          else if (delta > 0.35) this.say('dyn', 'fix', `Ease off — the music is ${mark} here. Lighter touch.`, 9);
        }
      } else if (frame.active) {
        st.dynamics = { live: liveLevel, mark: Analyzer.markFor((liveLevel - 1) * 30).mark };
      }

      // --- free-play key awareness
      if (frame.active && frame.chroma) {
        for (let i = 0; i < 12; i++) this.liveChroma[i] = this.liveChroma[i] * 0.995 + frame.chroma[i] * 0.05;
        if (!ref && s.activeTime > 12) {
          const k = Theory.detectKey(this.liveChroma);
          if (k && k.confidence > 0.7) {
            st.liveKey = k;
            if (this.lastKeyName !== k.name) {
              this.lastKeyName = k.name;
              this.say('key', 'info', `Sounds like ${k.name}. Its scale: ${k.scaleNames.join(' ')}. Try the chords ${k.diatonic.slice(0, 6).map((c) => c.name).join(', ')}.`, 25);
            }
          }
        }
      }

      // --- periodic coaching tip
      if (frame.active && frame.time - this.lastTip > 28 && s.activeTime > 10) {
        this.lastTip = frame.time;
        this.say('tip', 'tip', pick(TIPS[this.instrument] || TIPS.guitar), 20);
      }

      st.score = s.score;
      st.combo = s.combo;
      st.multiplier = 1 + Math.min(3, Math.floor(s.combo / 10) * 0.5);
      st.accuracy = this.accuracy();
      return st;
    }

    refGridAt() { return this.refGrid; }

    describeUpcoming(chord, inSec) {
      const when = inSec < 0.6 ? 'now' : `in ${inSec.toFixed(1)}s`;
      if (this.instrument === 'guitar') {
        const shape = Theory.guitarShape(chord.root, chord.type);
        const tab = shape ? shape.frets.map((f) => (f < 0 ? 'x' : f)).join('') : chord.pcs.map((p) => Theory.spell(p)).join(' ');
        return `Next up: ${chord.name} ${when} — shape ${tab}${shape && shape.barre ? ` (barre at fret ${shape.barre})` : ''}.`;
      }
      return `Next up: ${chord.name} ${when} — notes ${chord.pcs.map((p) => Theory.spell(p)).join(' · ')}.`;
    }

    segmentFeedback(r) {
      const total = r.hit + r.close + r.miss;
      if (total < 2) return;
      const name = r.chord.name;
      const ratio = (r.hit + 0.5 * r.close) / total;
      if (ratio >= 0.75) {
        this.stats.chordsNailed++;
        this.say('chord-good', 'praise', pick([`Clean ${name}! ✨`, `${name} nailed.`, `Beautiful ${name} — right on.`, `Great change into ${name}!`]), 3);
        return;
      }
      const topPlayed = [...r.played.entries()].sort((a, b) => b[1] - a[1])[0];
      const miss = [...r.missing.entries()].sort((a, b) => b[1] - a[1]).filter(([, c]) => c >= total * 0.4).map(([p]) => Theory.spell(p));
      const extra = [...r.extra.entries()].sort((a, b) => b[1] - a[1]).filter(([, c]) => c >= total * 0.4).map(([p]) => Theory.spell(p));
      let msg = '';
      if (topPlayed && topPlayed[0] !== name && ratio < 0.4) msg = `That sounded like ${topPlayed[0]}, but the song wants ${name}.`;
      else msg = `${name} wasn't quite clean.`;
      if (miss.length) msg += ` Missing ${miss.join(' & ')}`;
      if (extra.length) msg += `${miss.length ? ';' : ''} extra ${extra.join(' & ')}`;
      if (miss.length || extra.length) msg += '.';
      if (this.instrument === 'guitar' && miss.length) msg += ' Check every string rings — a muted string often drops a chord tone.';
      if (this.instrument === 'piano' && extra.length) msg += ' Watch for neighbouring keys.';
      this.say('chord-fix', 'fix', msg, 3.5);
    }

    timingFeedback() {
      const r = this.recentOffsets;
      if (r.length < 6) return;
      const mean = r.reduce((a, b) => a + b, 0) / r.length;
      const sd = Math.sqrt(r.reduce((a, b) => a + (b - mean) * (b - mean), 0) / r.length);
      if (mean < -28) this.say('timing', 'fix', `You're rushing — about ${Math.round(-mean)} ms ahead of the beat. Breathe and sit back into the groove.`, 8);
      else if (mean > 28) this.say('timing', 'fix', `You're dragging ~${Math.round(mean)} ms behind. Anticipate the beat a little.`, 8);
      else if (sd > 45) this.say('timing', 'fix', 'Your timing is uneven. Tap your foot on every beat and let your hand follow it.', 8);
      else if (sd < 22 && Math.abs(mean) < 15) this.say('timing-good', 'praise', 'Rock-solid timing! 🎯', 15);
    }

    accuracy() {
      const s = this.stats;
      const parts = [];
      if (s.chordSamples) parts.push([(s.chordHits + 0.5 * s.chordClose) / s.chordSamples, 2]);
      if (s.noteSamples) parts.push([s.noteHits / s.noteSamples, 2]);
      if (s.onsets) parts.push([(s.onTime + 0.6 * s.good) / s.onsets, 1.5]);
      if (s.intonationSamples > 20) parts.push([s.inTune / s.intonationSamples, 0.5]);
      if (s.dynSamples > 20) parts.push([s.dynMatch / s.dynSamples, 0.5]);
      if (!parts.length) return null;
      const w = parts.reduce((a, p) => a + p[1], 0);
      return parts.reduce((a, p) => a + p[0] * p[1], 0) / w;
    }

    summary() {
      const s = this.stats;
      const acc = this.accuracy();
      const offsets = s.offsets;
      const mean = offsets.length ? offsets.reduce((a, b) => a + b, 0) / offsets.length : 0;
      const sd = offsets.length ? Math.sqrt(offsets.reduce((a, b) => a + (b - mean) * (b - mean), 0) / offsets.length) : 0;
      const stars = acc == null ? 0 : acc >= 0.9 ? 3 : acc >= 0.7 ? 2 : acc >= 0.45 ? 1 : 0;
      const insights = [];
      if (s.chordSamples) insights.push(`Chord accuracy ${Math.round(((s.chordHits + 0.5 * s.chordClose) / s.chordSamples) * 100)}%`);
      if (offsets.length > 5) insights.push(`Timing: average ${mean >= 0 ? '+' : ''}${Math.round(mean)} ms (${mean < -15 ? 'ahead' : mean > 15 ? 'behind' : 'centred'}), spread ±${Math.round(sd)} ms`);
      if (s.intonationSamples > 20) insights.push(`In tune ${Math.round((s.inTune / s.intonationSamples) * 100)}% of the time`);
      if (s.dynSamples > 20) insights.push(`Dynamics matched ${Math.round((s.dynMatch / s.dynSamples) * 100)}%`);
      let focus = 'Keep a steady daily routine — consistency beats intensity.';
      const chordAcc = s.chordSamples ? (s.chordHits + 0.5 * s.chordClose) / s.chordSamples : 1;
      const timingAcc = s.onsets ? (s.onTime + 0.6 * s.good) / s.onsets : 1;
      if (chordAcc < 0.6) focus = 'Next session: isolate the chord changes. Loop two chords back and forth for 2 minutes each.';
      else if (timingAcc < 0.6) focus = 'Next session: play along with the metronome at 70% speed until your timing settles.';
      else if (acc != null && acc > 0.85) focus = 'Excellent work — try raising the tempo by 5 BPM next time.';
      return {
        accuracy: acc, stars, score: s.score, maxCombo: s.maxCombo, activeTime: s.activeTime,
        chordAccuracy: s.chordSamples ? chordAcc : null, timingAccuracy: s.onsets ? timingAcc : null,
        meanOffsetMs: mean, spreadMs: sd, chordsNailed: s.chordsNailed, onsets: s.onsets, insights, focus,
      };
    }
  }

  PM.Coach = Coach;
  PM.CoachUtil = { compareChord, beatGrid, topPcs, TIPS };
  if (typeof module !== 'undefined' && module.exports) module.exports = { Coach, compareChord, beatGrid, topPcs };
})(typeof self !== 'undefined' ? self : globalThis);
