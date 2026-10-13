/* Cadenza — Kids & Focus: short, predictable micro-lessons for children and teens, designed
 * with ADHD and autistic learners in mind — one instruction at a time, 2–5 minute lessons,
 * visual timers, choices, movement & breathing breaks, sensory-friendly feedback (no red
 * crosses, no time pressure unless chosen) and a sticker reward book.
 * Pure data + scoring helpers (unit-tested); the screens are in js/views/kids.js. */
(function (root) {
  'use strict';
  const PM = (root.PM = root.PM || {});

  // Boomwhacker-style colours, one per pitch class — the same colour every time builds memory
  const NOTE_COLORS = ['#e53935', '#ff7043', '#fb8c00', '#ffb300', '#fdd835', '#7cb342', '#26a69a', '#1e88e5', '#3949ab', '#8e24aa', '#d81b60', '#ec407a'];
  const NOTE_NAMES = ['C', 'C♯', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B'];
  const colorOf = (midi) => NOTE_COLORS[((midi % 12) + 12) % 12];

  const BUDDIES = ['🦊', '🐼', '🐯', '🦄', '🐸', '🐙', '🤖', '🐶', '🐱', '🦁'];
  const STICKERS = ['⭐', '🎵', '🎸', '🎹', '🥁', '🎤', '🎺', '🌈', '🚀', '🦋', '🌟', '🍦', '🏆', '🐳', '🌻', '🎈', '🍉', '🦖', '🪐', '💎', '🎨', '🧩', '🏅', '👑', '🌮', '🐝', '🍩', '🛸', '🎉', '🦜'];

  // ------------------------------------------------------------------ lessons
  // step types: say · tap-beat · echo-rhythm · color-keys · high-low · play-note · chord-shape · breathe · move · listen-choose
  const say = (emoji, text, extra) => Object.assign({ type: 'say', emoji, text }, extra || {});
  const C4 = 60;

  const TRACKS = [
    { id: 'rhythm', name: 'Rhythm', emoji: '🥁', color: '#f97316', desc: 'Clap, tap and feel the beat — no instrument needed.' },
    { id: 'piano', name: 'Piano', emoji: '🎹', color: '#7c3aed', desc: 'Colourful keys, first songs and your first chord.' },
    { id: 'guitar', name: 'Guitar', emoji: '🎸', color: '#0ea5e9', desc: 'Hold it, strum it, first chords and a first song.' },
    { id: 'voice', name: 'Singing', emoji: '🎤', color: '#ec4899', desc: 'Breathing, humming and singing in tune.' },
  ];

  const LESSONS = [
    // ---------- Rhythm
    { id: 'r1', track: 'rhythm', title: 'Find the heartbeat', emoji: '💓', minutes: 2, steps: [say('💓', 'Music has a heartbeat called the beat. It stays steady, like walking.'), { type: 'tap-beat', bpm: 70, beats: 8, text: 'Tap the big button with every flash.' }] },
    { id: 'r2', track: 'rhythm', title: 'Slow and fast', emoji: '🐢', minutes: 3, steps: [say('🐢', 'A slow beat is like a turtle walking.'), { type: 'tap-beat', bpm: 60, beats: 8, text: 'Turtle beat — tap slowly.' }, say('🐇', 'A fast beat is like a bunny hopping!'), { type: 'tap-beat', bpm: 110, beats: 8, text: 'Bunny beat — tap quickly.' }] },
    { id: 'r3', track: 'rhythm', title: 'Echo me', emoji: '🦜', minutes: 3, steps: [say('🦜', 'I play a rhythm, then you copy it — like a parrot!'), { type: 'echo-rhythm', bpm: 80, patterns: [[1, 1, 1, 1], [1, 1, 2], [2, 1, 1]] }] },
    { id: 'r4', track: 'rhythm', title: 'Long and short', emoji: '📏', minutes: 3, steps: [say('📏', '"Ta" is one beat long. "Ti-ti" is two quick sounds in one beat.'), { type: 'echo-rhythm', bpm: 76, patterns: [[1, 0.5, 0.5, 1, 1], [0.5, 0.5, 0.5, 0.5, 2], [1, 1, 0.5, 0.5, 1]] }] },
    { id: 'r5', track: 'rhythm', title: 'Shh — the rest', emoji: '🤫', minutes: 3, steps: [say('🤫', 'A rest is a silent beat. Keep counting in your head, but don\'t tap!'), { type: 'echo-rhythm', bpm: 76, patterns: [[1, 1, -1, 1], [1, -1, 1, -1], [-1, 1, 1, 1]] }] },
    { id: 'r6', track: 'rhythm', title: 'Count to four', emoji: '4️⃣', minutes: 3, steps: [say('4️⃣', 'Count 1-2-3-4 out loud. Beat 1 is the strong one.'), { type: 'tap-beat', bpm: 80, beats: 16, bpb: 4, onlyOne: true, text: 'Tap only on beat 1 (the big flash).' }] },
    { id: 'r7', track: 'rhythm', title: 'Waltz 1-2-3', emoji: '💃', minutes: 3, steps: [say('💃', 'A waltz counts in threes: ONE-two-three, ONE-two-three.'), { type: 'tap-beat', bpm: 90, beats: 12, bpb: 3, text: 'Tap every beat — feel the swing of the ONE.' }] },
    { id: 'r8', track: 'rhythm', title: 'Wiggle break', emoji: '🕺', minutes: 1, steps: [{ type: 'move', seconds: 40, moves: ['Stretch up high like a tree 🌳', 'Shake your hands like jelly 🍮', 'March on the spot 🥾', 'Roll your shoulders 🔄'] }] },
    { id: 'r9', track: 'rhythm', title: 'Steady beat challenge', emoji: '🎯', minutes: 3, steps: [say('🎯', 'Can you stay with the beat for 16 taps? Breathe and relax your hand.'), { type: 'tap-beat', bpm: 92, beats: 16, text: 'Stay with the flashes.' }] },
    { id: 'r10', track: 'rhythm', title: 'Sneaky syncopation', emoji: '🕵️', minutes: 4, steps: [say('🕵️', 'Some rhythms sneak in between the beats. Listen carefully!'), { type: 'echo-rhythm', bpm: 72, patterns: [[0.5, 1, 0.5, 2], [1, 0.5, 1, 0.5, 1], [0.5, 0.5, 1, 1, 1]] }] },
    { id: 'r11', track: 'rhythm', title: 'Breathe with the beat', emoji: '🫧', minutes: 2, steps: [{ type: 'breathe', rounds: 4, inhale: 4, exhale: 4 }] },
    { id: 'r12', track: 'rhythm', title: 'Rhythm master', emoji: '🏆', minutes: 4, steps: [{ type: 'echo-rhythm', bpm: 84, patterns: [[1, 0.5, 0.5, 1, 1], [0.5, 0.5, 1, -1, 1], [1, 1, 0.5, 0.5, 0.5, 0.5], [0.5, 1, 0.5, 1, 1]] }] },

    // ---------- Piano
    { id: 'p1', track: 'piano', title: 'Black-key groups', emoji: '🎹', minutes: 2, steps: [say('🎹', 'Black keys come in groups of 2 and 3 — like twins and triplets!'), { type: 'color-keys', task: 'find', targets: [61, 63, 73, 75], text: 'Tap the two black keys in each group of 2.' }] },
    { id: 'p2', track: 'piano', title: 'Find C', emoji: '🔴', minutes: 2, steps: [say('🔴', 'C is the white key just left of the two black keys. C is always red here.'), { type: 'color-keys', task: 'find', targets: [60, 72], text: 'Tap every C.' }] },
    { id: 'p3', track: 'piano', title: 'C-D-E steps', emoji: '🪜', minutes: 2, steps: [say('🪜', 'Thumb on C, then fingers 2 and 3: C-D-E. Up the stairs and down again!'), { type: 'color-keys', task: 'sequence', seq: [60, 62, 64, 62, 60], text: 'Tap the colours in order.' }] },
    { id: 'p4', track: 'piano', title: 'Hot Cross Buns', emoji: '🥯', minutes: 3, steps: [{ type: 'color-keys', task: 'sequence', seq: [64, 62, 60, 64, 62, 60, 60, 60, 60, 60, 62, 62, 62, 62, 64, 62, 60], text: 'Play the song — follow the colours.' }] },
    { id: 'p5', track: 'piano', title: 'Five-finger song', emoji: '🖐️', minutes: 3, steps: [say('🖐️', 'One finger for each key: C D E F G. Keep your fingers curved like holding a ball.'), { type: 'color-keys', task: 'sequence', seq: [60, 62, 64, 65, 67, 65, 64, 62, 60] }] },
    { id: 'p6', track: 'piano', title: 'High or low?', emoji: '⬆️', minutes: 2, steps: [say('⬆️', 'Keys on the right sound high (birds 🐦). Keys on the left sound low (bears 🐻).'), { type: 'high-low', rounds: 6 }] },
    { id: 'p7', track: 'piano', title: 'Mary Had a Little Lamb', emoji: '🐑', minutes: 3, steps: [{ type: 'color-keys', task: 'sequence', seq: [64, 62, 60, 62, 64, 64, 64, 62, 62, 62, 64, 67, 67] }] },
    { id: 'p8', track: 'piano', title: 'Twinkle, Twinkle', emoji: '✨', minutes: 3, steps: [{ type: 'color-keys', task: 'sequence', seq: [60, 60, 67, 67, 69, 69, 67, 65, 65, 64, 64, 62, 62, 60] }] },
    { id: 'p9', track: 'piano', title: 'My first chord: C', emoji: '🌈', minutes: 3, steps: [say('🌈', 'A chord is notes played together. C chord = C + E + G (skip a key each time).'), { type: 'chord-shape', inst: 'piano', chord: 'C', keys: [60, 64, 67], seconds: 20, text: 'Fingers 1-3-5 on C-E-G. Press them together 4 times.' }] },
    { id: 'p10', track: 'piano', title: 'Play it for real', emoji: '🎧', minutes: 3, steps: [say('🎧', 'Now on your real piano! I\'ll listen with the microphone.'), { type: 'play-note', notes: [60, 64, 67], text: 'Play C, then E, then G.' }] },
    { id: 'p11', track: 'piano', title: 'Ode to Joy', emoji: '🎶', minutes: 4, steps: [{ type: 'color-keys', task: 'sequence', seq: [64, 64, 65, 67, 67, 65, 64, 62, 60, 60, 62, 64, 64, 62, 62] }] },
    { id: 'p12', track: 'piano', title: 'Piano star', emoji: '🌟', minutes: 3, steps: [{ type: 'play-note', notes: [60, 62, 64, 65, 67], text: 'Play C-D-E-F-G on your piano.' }] },

    // ---------- Guitar
    { id: 'g1', track: 'guitar', title: 'Hello, guitar', emoji: '👋', minutes: 2, steps: [say('🪑', 'Sit tall. The guitar\'s body rests on your leg, the neck points left (if you\'re right-handed).'), say('🤲', 'Your strumming hand rests over the sound hole. Relax your shoulders.')] },
    { id: 'g2', track: 'guitar', title: 'String names', emoji: '🧠', minutes: 2, steps: [say('🧠', 'From thickest to thinnest: E A D G B E. Remember: "Eddie Ate Dynamite, Good Bye Eddie!"'), { type: 'listen-choose', prompt: 'Which string is the thickest (lowest)?', options: ['Low E', 'B', 'High e'], answer: 0 }, { type: 'listen-choose', prompt: 'Which string comes after D?', options: ['A', 'G', 'E'], answer: 1 }] },
    { id: 'g3', track: 'guitar', title: 'Pluck the strings', emoji: '🤏', minutes: 3, steps: [say('🤏', 'Pluck the thinnest string (high e) with your thumb. I\'ll listen.'), { type: 'play-note', notes: [64], text: 'Pluck the high e string.' }, { type: 'play-note', notes: [40], text: 'Now the thickest string — low E.', octaveFree: true }] },
    { id: 'g4', track: 'guitar', title: 'Down strums', emoji: '⬇️', minutes: 2, steps: [say('⬇️', 'Brush all the strings downward with your thumb or a pick — one strum per beat.'), { type: 'tap-beat', bpm: 70, beats: 8, text: 'Strum (or tap) on every flash.' }] },
    { id: 'g5', track: 'guitar', title: 'E minor — 2 fingers!', emoji: '😎', minutes: 3, steps: [{ type: 'chord-shape', inst: 'guitar', chord: 'Em', seconds: 25, text: 'Fingers 2 and 3 on the 2nd fret of the A and D strings. Strum all 6 strings.' }] },
    { id: 'g6', track: 'guitar', title: 'Strum along in Em', emoji: '🎶', minutes: 2, steps: [{ type: 'tap-beat', bpm: 76, beats: 16, text: 'Hold Em and strum on every flash.' }] },
    { id: 'g7', track: 'guitar', title: 'A minor', emoji: '🌙', minutes: 3, steps: [{ type: 'chord-shape', inst: 'guitar', chord: 'Am', seconds: 25, text: 'Three fingers: like a little staircase. Strum from the A string.' }] },
    { id: 'g8', track: 'guitar', title: 'Switch Em ↔ Am', emoji: '🔁', minutes: 3, steps: [say('🔁', 'Switch between Em and Am. Go slowly — clean is better than fast.'), { type: 'chord-shape', inst: 'guitar', chord: 'Em', then: 'Am', seconds: 45, count: true, text: 'Count how many clean switches you make.' }] },
    { id: 'g9', track: 'guitar', title: 'C chord', emoji: '☀️', minutes: 3, steps: [{ type: 'chord-shape', inst: 'guitar', chord: 'C', seconds: 30, text: 'Ring finger on the 3rd fret of the A string, middle on the 2nd fret of D, index on the 1st fret of B.' }] },
    { id: 'g10', track: 'guitar', title: 'G chord', emoji: '🌳', minutes: 3, steps: [{ type: 'chord-shape', inst: 'guitar', chord: 'G', seconds: 30, text: 'Easy G: ring finger on the 3rd fret of the high e string. Strum the top 4 strings.' }] },
    { id: 'g11', track: 'guitar', title: 'Down-up strums', emoji: '↕️', minutes: 3, steps: [say('↕️', 'Down on the beat, up on the "and". Your hand moves like a pendulum.'), { type: 'echo-rhythm', bpm: 70, patterns: [[1, 0.5, 0.5, 1, 1], [0.5, 0.5, 0.5, 0.5, 1, 1]] }] },
    { id: 'g12', track: 'guitar', title: 'My first song', emoji: '🏅', minutes: 4, steps: [say('🏅', 'Em → C → G → D: the four chords of many worship and pop songs! One bar each.'), { type: 'tap-beat', bpm: 72, beats: 16, bpb: 4, text: 'Strum 4 times on each chord: Em, C, G, D.', chords: ['Em', 'C', 'G', 'D'] }] },

    // ---------- Singing
    { id: 'v1', track: 'voice', title: 'Balloon breathing', emoji: '🎈', minutes: 2, steps: [say('🎈', 'Put a hand on your tummy. Breathe in and make it puff out like a balloon.'), { type: 'breathe', rounds: 4, inhale: 4, exhale: 6 }] },
    { id: 'v2', track: 'voice', title: 'Busy bee hum', emoji: '🐝', minutes: 2, steps: [say('🐝', 'Close your lips and hum "mmm" like a bee. Feel the tickle on your lips!'), { type: 'play-note', notes: [60], octaveFree: true, voice: true, text: 'Hum this note.' }] },
    { id: 'v3', track: 'voice', title: 'Siren slide', emoji: '🚒', minutes: 2, steps: [say('🚒', 'Slide your voice from low to high and back, like a fire engine: "wooo-OOO-ooo".'), say('🎢', 'Now a roller coaster: up, down, up! Keep it gentle — no shouting.')] },
    { id: 'v4', track: 'voice', title: 'High or low?', emoji: '🐦', minutes: 2, steps: [{ type: 'high-low', rounds: 6 }] },
    { id: 'v5', track: 'voice', title: 'Match my note', emoji: '🎯', minutes: 3, steps: [say('🎯', 'Listen to the note, hum it in your head, then sing "la".'), { type: 'play-note', notes: [62, 67], octaveFree: true, voice: true, text: 'Sing the note you hear.' }] },
    { id: 'v6', track: 'voice', title: 'Do-Re-Mi', emoji: '🪜', minutes: 3, steps: [{ type: 'play-note', notes: [60, 62, 64, 65, 67], octaveFree: true, voice: true, text: 'Sing do-re-mi-fa-so.' }] },
    { id: 'v7', track: 'voice', title: 'Loud and soft', emoji: '🔊', minutes: 2, steps: [say('🔊', 'Soft singing is like telling a secret. Loud singing is like calling a friend — but never shouting!'), { type: 'listen-choose', prompt: 'Was that loud or soft?', sound: 'soft', options: ['Loud', 'Soft'], answer: 1 }, { type: 'listen-choose', prompt: 'And this one?', sound: 'loud', options: ['Loud', 'Soft'], answer: 0 }] },
    { id: 'v8', track: 'voice', title: 'Twinkle sing-along', emoji: '⭐', minutes: 3, steps: [{ type: 'play-note', notes: [60, 60, 67, 67, 69, 69, 67], octaveFree: true, voice: true, text: 'Sing "Twinkle, twinkle, little star".' }] },
    { id: 'v9', track: 'voice', title: 'Echo singing', emoji: '🗣️', minutes: 3, steps: [{ type: 'play-note', notes: [67, 64, 60], octaveFree: true, voice: true, echo: true, text: 'Listen to 3 notes, then sing them back: so-mi-do.' }] },
    { id: 'v10', track: 'voice', title: 'Happy voice care', emoji: '💧', minutes: 1, steps: [say('💧', 'Drink water. Rest your voice if it feels scratchy. Never sing through pain.'), say('😌', 'Warm up before singing — just like stretching before sport.')] },
    { id: 'v11', track: 'voice', title: 'Breath and count', emoji: '🔢', minutes: 2, steps: [say('🔢', 'Breathe in, then count out loud on one breath: 1, 2, 3… How far can you go?'), { type: 'breathe', rounds: 3, inhale: 4, exhale: 8 }] },
    { id: 'v12', track: 'voice', title: 'Star singer', emoji: '🌟', minutes: 3, steps: [{ type: 'play-note', notes: [67, 67, 64, 69, 67, 64], octaveFree: true, voice: true, text: 'Sing so-so-mi-la-so-mi (the playground song!).' }] },
  ];

  // ------------------------------------------------------------------ scoring helpers
  /**
   * Gentle timing judge for tapping along: each beat is matched to the nearest unused tap.
   * Returns {hits, total, early, late, offsetsMs}; tolerance defaults to ±180 ms (relaxed).
   */
  function judgeTaps(taps, beats, tol) {
    tol = tol || 0.18;
    const used = new Set();
    let hits = 0, early = 0, late = 0;
    const offs = [];
    for (const b of beats) {
      let best = -1, bd = Infinity;
      taps.forEach((t, i) => { if (!used.has(i) && Math.abs(t - b) < bd) { bd = Math.abs(t - b); best = i; } });
      if (best >= 0 && bd <= tol) {
        used.add(best); hits++;
        const d = taps[best] - b;
        offs.push(Math.round(d * 1000));
        if (d < -0.06) early++; else if (d > 0.06) late++;
      }
    }
    return { hits, total: beats.length, early, late, offsetsMs: offs, extra: taps.length - used.size };
  }

  /** Onset times (beats from 0) of a rhythm pattern; negative values are rests. */
  function rhythmOnsets(pattern) {
    const out = [];
    let t = 0;
    for (const d of pattern) { if (d > 0) out.push(t); t += Math.abs(d); }
    return { onsets: out, length: t };
  }

  /** Stars for a step score (0..1): never zero for trying. */
  const starsFor = (score) => (score >= 0.85 ? 3 : score >= 0.6 ? 2 : 1);

  /** Encouraging words — always positive, specific when possible. */
  function cheer(score, detail) {
    if (score >= 0.85) return ['Amazing! 🌟', 'You nailed it! 🎉', 'Super star! ⭐', 'Wow, perfect! 🏆'][Math.floor(Math.random() * 4)];
    if (score >= 0.6) return detail || ['Great job! Try once more to get 3 stars.', 'Nice! You\'re getting it.', 'Good work — keep going!'][Math.floor(Math.random() * 3)];
    return detail || ['Good try! Let\'s do it again slowly.', 'You\'re learning — every try helps!', 'Nice effort! Want to try again?'][Math.floor(Math.random() * 3)];
  }

  /** Sticker book: a new sticker every 3 stars. */
  function stickersEarned(stars) { return STICKERS.slice(0, Math.min(STICKERS.length, Math.floor(stars / 3))); }

  /** Next lessons for a track (first not yet done), for the visual plan. */
  function nextLessons(track, done, n) {
    const list = LESSONS.filter((l) => l.track === track);
    const todo = list.filter((l) => !(done && done[l.id]));
    return (todo.length ? todo : list).slice(0, n || 1);
  }

  /** A short, predictable plan: warm-up → lesson → fun/break. */
  function todaysPlan(track, done) {
    const warm = track === 'voice' ? LESSONS.find((l) => l.id === 'v1') : track === 'rhythm' ? LESSONS.find((l) => l.id === 'r11') : LESSONS.find((l) => l.id === 'r1');
    const main = nextLessons(track, done, 1)[0];
    const fun = LESSONS.find((l) => l.id === 'r8');
    const out = [];
    for (const l of [warm, main, fun]) if (l && !out.includes(l)) out.push(l);
    return out;
  }

  PM.Kids = { TRACKS, LESSONS, BUDDIES, STICKERS, NOTE_COLORS, NOTE_NAMES, colorOf, judgeTaps, rhythmOnsets, starsFor, cheer, stickersEarned, nextLessons, todaysPlan, C4 };
  if (typeof module !== 'undefined' && module.exports) module.exports = PM.Kids;
})(typeof self !== 'undefined' ? self : globalThis);
