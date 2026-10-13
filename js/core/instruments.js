/* Overture — instrument registry: ranges, tunings, transposition, synth voice,
 * which separated stem is "your part", coaching focus and tips. */
(function (root) {
  'use strict';
  const PM = (root.PM = root.PM || {});

  const GUITAR_STRINGS = [40, 45, 50, 55, 59, 64];

  const INSTRUMENTS = {
    piano: {
      id: 'piano', label: 'Piano', short: 'Piano', emoji: '🎹', icon: 'piano', family: 'keys',
      chordal: true, mono: false, range: [21, 108], viewRange: [36, 96], transpose: 0, synth: 'piano', part: 'keys',
      tips: [
        'Keep your wrists level and fingers curved, as if holding a small ball.',
        'Play from the arm weight, not finger force, for a fuller tone.',
        'Look one chord ahead — your eyes should lead your hands.',
        'Use the sustain pedal lightly: change it right after each new chord.',
        'Voice the melody louder than the accompaniment by leaning into the top note.',
        'Practise hands separately at half tempo before combining.',
        'Find common tones between chords and keep them held through the change.',
        'Count out loud for a few bars to anchor your internal pulse.',
      ],
    },
    guitar: {
      id: 'guitar', label: 'Acoustic guitar', short: 'Acoustic', emoji: '🎸', icon: 'guitar', family: 'fretted',
      chordal: true, mono: false, range: [40, 88], strings: GUITAR_STRINGS, stringNames: ['E', 'A', 'D', 'G', 'B', 'e'], frets: 15,
      transpose: 0, synth: 'guitar', part: 'guitar', strum: true,
      tips: [
        'Keep your strumming hand moving like a pendulum — down on the beat, up on the "&", even when you skip a strum.',
        'Press just behind the fret, not on top of it: cleaner tone with less pressure.',
        'Relax your thumb behind the neck. Tension slows chord changes.',
        'Anticipate the change: lift your fingers on the last "&" of the bar so the next chord lands on beat 1.',
        'Let common fingers stay anchored between chords — pivot instead of lifting everything.',
        'Accent beats 2 and 4 slightly to lock into a groove.',
        'If a string buzzes, arch your fingers more so they don’t touch neighbouring strings.',
        'Practise slow and perfect. Speed is a by-product of accuracy.',
      ],
    },
    electric: {
      id: 'electric', label: 'Electric guitar', short: 'Electric', emoji: '⚡', icon: 'electric', family: 'fretted',
      chordal: true, mono: false, range: [40, 90], strings: GUITAR_STRINGS, stringNames: ['E', 'A', 'D', 'G', 'B', 'e'], frets: 17,
      transpose: 0, synth: 'electric', part: 'guitar', strum: true, bends: true,
      tips: [
        'Mute unused strings with the side of your picking hand and the pads of your fretting fingers — distortion amplifies every stray string.',
        'For bends, push with three fingers together and listen for the target pitch; Overture shows how far you bent in cents.',
        'Palm-mute by resting the edge of your picking hand right where the strings meet the bridge saddles.',
        'Use alternate picking (down-up) for fast passages; keep the pick motion small.',
        'Power chords: keep the 5th locked with your ring finger and move the shape as one unit.',
        'Add vibrato only after the note has settled in tune.',
        'Less gain = more clarity. Practise with a cleaner tone to hear your mistakes.',
        'Target chord tones on strong beats when soloing — the 3rd makes it sing.',
      ],
    },
    bass: {
      id: 'bass', label: 'Bass guitar', short: 'Bass', emoji: '🎸', icon: 'bass', family: 'fretted',
      chordal: false, mono: true, range: [28, 67], strings: [28, 33, 38, 43], stringNames: ['E', 'A', 'D', 'G'], frets: 17,
      transpose: 0, synth: 'bass', part: 'bass', minFreq: 35, maxFreq: 450,
      tips: [
        'Lock in with the kick drum — the bass and kick are one instrument.',
        'Land on the root of each chord on beat 1; decorate with the 5th and octave.',
        'Use the one-finger-per-fret rule in the lower positions.',
        'Let notes ring for their full value — note length is part of the groove.',
        'Alternate index and middle fingers when plucking; never use the same finger twice in a row.',
        'Approach the next root by a half step from below for a smooth walking line.',
        'Mute the strings you are not playing with your plucking thumb.',
        'Play slightly behind the beat for a laid-back feel, on top for drive — but be consistent.',
      ],
    },
    trumpet: {
      id: 'trumpet', label: 'Trumpet (B♭)', short: 'Trumpet', emoji: '🎺', icon: 'trumpet', family: 'brass',
      chordal: false, mono: true, range: [52, 84], viewRange: [52, 86], transpose: 2, synth: 'trumpet', part: 'lead', minFreq: 150, maxFreq: 1200,
      tips: [
        'Breathe low and deep before every phrase — the air does the work, not the lips.',
        'Long tones every day: hold a note steady for 8 counts. Overture scores how stable your pitch is.',
        'Keep the mouthpiece pressure light; let the air speed change the partials.',
        'Tongue with "tah" on the attack; for softer entries try "dah".',
        'Lip slurs between partials (same fingering) build flexibility and range.',
        'Check the 1-2 and 1-3 valve combinations — they tend to run sharp; use the slides.',
        'Play phrases, not notes: aim each line towards its peak.',
        'Rest as much as you play — a tired embouchure learns bad habits.',
      ],
    },
    voice: {
      id: 'voice', label: 'Voice (singing)', short: 'Voice', emoji: '🎤', icon: 'mic', family: 'voice',
      chordal: false, mono: true, range: [40, 84], viewRange: [40, 84], transpose: 0, synth: 'voice', part: 'vocals', minFreq: 70, maxFreq: 1100,
      tips: [
        'Breathe low: let your belly expand on the in-breath and keep your shoulders still.',
        'Support the sound with a steady stream of air — imagine slowly blowing out a candle without making it flicker.',
        'Relax your jaw, tongue and neck. Tension is the enemy of a free, in-tune voice.',
        'Hear the note in your head before you sing it — pitch starts in the ear.',
        'Open vowels ("ah", "oh") carry pitch best; shape consonants quickly and return to the vowel.',
        'Warm up with lip trills and gentle sirens before singing songs.',
        'Sing high notes with less push, not more — let the voice get lighter as it rises.',
        'Drink water through the day and rest your voice if it feels tired or scratchy.',
        'Stand tall: feet hip-width apart, knees soft, chest open, chin level.',
        'Record yourself and listen back — the voice sounds different inside your head.',
      ],
    },
    drums: {
      id: 'drums', label: 'Drums', short: 'Drums', emoji: '🥁', icon: 'drum', family: 'drums',
      chordal: false, mono: false, rhythmOnly: true, range: [35, 81], viewRange: [35, 81], transpose: 0, synth: 'drums', part: 'drums', minFreq: 40, maxFreq: 1600,
      tips: [
        'Hold the sticks loosely between thumb and first two fingers — let them bounce back off the drum.',
        'Count out loud: "1 & 2 &" — your voice is the best metronome you own.',
        'Play the hi-hat a little softer than the snare backbeat so the groove breathes.',
        'Keep the kick and the bass player together — that is the foundation of the band.',
        'Practise slowly with a click; speed is just accuracy repeated faster.',
        'Strokes start from the wrist; let the arm follow only for big accents.',
        'Sit at a height where your thighs slope slightly down to the knees.',
        'End fills on the next beat 1 with a crash and kick — and never drop the tempo.',
        'Ghost notes should be barely heard: play them 1–2 inches above the head.',
        'Protect your ears: use earplugs when playing an acoustic kit.',
      ],
    },
  };

  /** Comfortable ranges (MIDI) for each voice type. */
  const VOICE_TYPES = {
    soprano: { label: 'Soprano', range: [60, 84], start: 60 },
    mezzo: { label: 'Mezzo-soprano', range: [57, 81], start: 57 },
    alto: { label: 'Alto', range: [53, 77], start: 55 },
    tenor: { label: 'Tenor', range: [48, 72], start: 50 },
    baritone: { label: 'Baritone', range: [43, 67], start: 45 },
    bass: { label: 'Bass', range: [40, 64], start: 43 },
  };

  /** 4-string (E A D G) or 5-string (B E A D G) bass: updates strings, range and lowest pitch. */
  function setBassStrings(n) {
    const B = INSTRUMENTS.bass;
    if (n === 5) Object.assign(B, { strings: [23, 28, 33, 38, 43], stringNames: ['B', 'E', 'A', 'D', 'G'], range: [23, 67], minFreq: 28, stringCount: 5 });
    else Object.assign(B, { strings: [28, 33, 38, 43], stringNames: ['E', 'A', 'D', 'G'], range: [28, 67], minFreq: 35, stringCount: 4 });
    if (PM.Learn && PM.Learn.RANGE) PM.Learn.RANGE.bass = n === 5 ? { low: 23, high: 63, start: 31, strings: 5 } : { low: 28, high: 63, start: 31, strings: 4 };
    return B;
  }
  INSTRUMENTS.bass.stringCount = 4;

  const list = () => Object.values(INSTRUMENTS);
  const get = (id) => INSTRUMENTS[id] || INSTRUMENTS.guitar;
  const isGuitarLike = (id) => get(id).family === 'fretted' && get(id).chordal;

  // Standard B♭ trumpet valve combinations by WRITTEN pitch
  const TRUMPET_FINGERING = {
    54: '1 2 3', 55: '1 3', 56: '2 3', 57: '1 2', 58: '1', 59: '2', 60: '0', 61: '1 2 3', 62: '1 3', 63: '2 3', 64: '1 2', 65: '1', 66: '2',
    67: '0', 68: '2 3', 69: '1 2', 70: '1', 71: '2', 72: '0', 73: '1 2', 74: '1', 75: '2', 76: '0', 77: '1', 78: '2', 79: '0', 80: '2 3', 81: '1 2',
    82: '1', 83: '2', 84: '0',
  };
  /** Written pitch & valves for a concert pitch. */
  function trumpetInfo(concertMidi) {
    const written = concertMidi + 2;
    return { written, valves: TRUMPET_FINGERING[written] || null };
  }

  /** Lowest-position fret for a midi note on a fretted instrument. */
  function fretPosition(inst, midi) {
    const I = get(inst);
    if (!I.strings) return null;
    let best = null;
    I.strings.forEach((open, s) => {
      const f = midi - open;
      if (f >= 0 && f <= (I.frets || 15) && (!best || f < best.fret)) best = { string: s, fret: f };
    });
    return best;
  }

  PM.Instruments = { INSTRUMENTS, VOICE_TYPES, setBassStrings, list, get, isGuitarLike, trumpetInfo, fretPosition, TRUMPET_FINGERING };
  if (typeof module !== 'undefined' && module.exports) module.exports = PM.Instruments;
})(typeof self !== 'undefined' ? self : globalThis);
