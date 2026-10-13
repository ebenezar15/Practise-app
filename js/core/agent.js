/* Overture — "Cadi", the built-in practice coach. Runs fully offline: it reacts to what the
 * student is doing (notes, timing, takes, grooves), compares takes, plans practice from the
 * student's history, and answers music questions from a built-in knowledge base (chords,
 * scales, intervals, tempo terms, time signatures, technique and app help).
 * Pure functions (no DOM) — unit-tested in Node. */
(function (root) {
  'use strict';
  const PM = (root.PM = root.PM || {});
  const mod12 = (x) => ((x % 12) + 12) % 12;
  const pick = (arr, seed) => arr[(seed == null ? Math.floor(Math.random() * arr.length) : seed) % arr.length];
  const SHARPS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const FLATS = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

  const PRAISE = ['Lovely!', 'Nice one!', 'That\'s it!', 'Great control!', 'Clean!', 'Beautiful!', 'Well played!'];
  const ENCOURAGE = ['Keep going — every take teaches your hands something.', 'Mistakes are information. Slow it down a notch and try again.', 'You\'re building it brick by brick. One more take?', 'Breathe, relax your shoulders, and go again.'];

  // ------------------------------------------------------------------ knowledge base
  const TEMPO_TERMS = {
    grave: 'very slow and solemn (about 25–45 BPM)', largo: 'broad and slow (40–60 BPM)', lento: 'slow (45–60 BPM)', adagio: 'slow and expressive (66–76 BPM)',
    andante: 'at a walking pace (76–108 BPM)', moderato: 'moderate (108–120 BPM)', allegretto: 'moderately fast (112–120 BPM)', allegro: 'fast and bright (120–156 BPM)',
    vivace: 'lively and fast (156–176 BPM)', presto: 'very fast (168–200 BPM)', prestissimo: 'as fast as possible (over 200 BPM)', ritardando: 'gradually slowing down', 'rit.': 'gradually slowing down',
    accelerando: 'gradually getting faster', rubato: 'flexible, expressive tempo — speeding up and slowing down for feeling', 'a tempo': 'back to the original tempo', fermata: 'hold the note longer than written',
  };
  const DYNAMICS = { pp: 'pianissimo — very soft', p: 'piano — soft', mp: 'mezzo-piano — moderately soft', mf: 'mezzo-forte — moderately loud', f: 'forte — loud', ff: 'fortissimo — very loud', crescendo: 'gradually louder', decrescendo: 'gradually softer', diminuendo: 'gradually softer', sforzando: 'a sudden strong accent' };
  const METERS = {
    '4/4': '4/4 ("common time"): four quarter-note beats per bar. Count "1 2 3 4"; beats 2 and 4 are the backbeat in pop and rock.',
    '3/4': '3/4: three quarter-note beats per bar — waltzes and many hymns. Count "1 2 3" with the weight on 1.',
    '2/4': '2/4: two beats per bar — marches and polkas. Count "1 2".',
    '6/8': '6/8: six eighth notes grouped 3 + 3, so it feels like 2 big beats. Count "1-2-3 4-5-6" with accents on 1 and 4.',
    '12/8': '12/8: four big beats, each split into three eighths — slow blues, gospel and doo-wop ballads. Count "1-and-a 2-and-a 3-and-a 4-and-a".',
    '9/8': '9/8: three big beats of three eighths each (3 + 3 + 3).',
    '5/4': '5/4: five beats per bar, usually felt as 3 + 2 or 2 + 3 (e.g. "Take Five").',
    '7/8': '7/8: seven eighths, usually grouped 2 + 2 + 3 or 3 + 2 + 2. Count the groups, not single eighths.',
  };
  const INTERVALS = [[0, 'unison'], [1, 'minor second'], [2, 'major second'], [3, 'minor third'], [4, 'major third'], [5, 'perfect fourth'], [6, 'tritone'], [7, 'perfect fifth'], [8, 'minor sixth'], [9, 'major sixth'], [10, 'minor seventh'], [11, 'major seventh'], [12, 'octave']];
  const INTERVAL_SONGS = { 'minor second': 'Jaws', 'major second': 'Happy Birthday', 'minor third': 'Greensleeves', 'major third': 'When the Saints', 'perfect fourth': 'Amazing Grace', tritone: 'The Simpsons theme', 'perfect fifth': 'Twinkle Twinkle', 'minor sixth': 'The Entertainer', 'major sixth': 'My Bonnie', 'minor seventh': 'Somewhere (West Side Story)', 'major seventh': 'Take On Me', octave: 'Somewhere Over the Rainbow' };
  const SCALE_WORDS = [['harmonic minor', 'harmonic'], ['melodic minor', 'melodic'], ['natural minor', 'minor'], ['minor pentatonic', 'minpent'], ['major pentatonic', 'majpent'], ['pentatonic', 'majpent'], ['blues', 'blues'], ['dorian', 'dorian'], ['mixolydian', 'mixolydian'], ['chromatic', 'chromatic'], ['minor', 'minor'], ['major', 'major']];

  const TOPICS = [
    // singing topics first — they win whenever the question is about the voice
    { voice: true, keys: /\b(breath support|breath|breathe|breathing|diaphragm|run out of air|out of breath)\b/i, all: ['Breathe low: hand on your belly, breathe in through the nose for 4 and feel the belly and lower ribs expand — shoulders stay still.', 'Sing on the "hiss" first: breathe in, then hiss "sss" steadily for 20 seconds. That steady, slow release is exactly the support a long phrase needs.', 'Don\'t take a huge gasp — take a comfortable, low breath and *keep the ribs open* while you sing.'] },
    { voice: true, keys: /\b(head voice|chest voice|mix|mixed voice|falsetto|break|crack|cracking|passaggio|register)\b/i, all: ['The "break" is where chest voice hands over to head voice. Sirens on "oo" and "goo" (Exercise path → Registers) teach the two to blend.', 'Approach high notes lighter, not louder: let the voice thin out as it rises instead of dragging chest voice up.', 'Bratty "nay" on 1-3-5-3-1 is the quickest route to a mixed voice — it keeps the sound forward and the larynx easy.'] },
    { voice: true, keys: /\b(high notes?|range|low notes?|reach|belt|belting)\b/i, all: ['Range grows slowly: warm up first, sing high notes with less volume, and stop before it strains.', 'For high notes keep the jaw relaxed and the mouth a bit taller ("ah" toward "aw"). Never lift the chin.', 'Belting is a bright, speech-like sound with strong breath support — learn it with a teacher and keep sessions short.'] },
    { voice: true, keys: /\b(pitch|in tune|out of tune|flat|sharp|tone deaf|off key)\b/i, all: ['Hear the note in your head *before* you sing it. Use Learn → Ear training and the sing-along pitch trail to see where you drift.', 'Singing flat usually means low energy: keep the breath moving and think "up" on every note.', 'Singing sharp usually means tension: relax the jaw and neck and sing a little softer.'] },
    { voice: true, keys: /\b(vibrato|wobble)\b/i, all: ['Vibrato appears on its own when the voice is free: sing long tones relaxed, never force a wobble.', 'Practise straight tone first, then let the note "bloom" into vibrato at the end of a long note.'] },
    { voice: true, keys: /\b(hoarse|sore throat|throat|vocal health|tired voice|strain|straining|lose my voice|lost my voice|scratchy)\b/i, all: ['If your voice is hoarse or hurts, rest it — no whispering either. See a doctor if it lasts more than two weeks.', 'Hydrate all day (water, steam), avoid shouting, and always warm up for 5–10 minutes before singing.', 'Strain means stop: lower the key (Songs → Transpose) or sing that passage an octave down for now.'] },
    { voice: true, keys: /\b(warm ?up|warmup|exercise)\b/i, all: ['A 10-minute vocal warm-up: 1 min breathing, 2 min lip trills, 2 min humming 5-4-3-2-1, 2 min sirens on "oo", 3 min 5-note scales on "ma" rising by semitones.', 'Start every session with Exercise path Level 1 (breath, lip trills, humming) — then sing your song.'] },
    { voice: true, keys: /\b(diction|lyrics|words|consonant|vowel)\b/i, all: ['Sustain the vowel and make consonants quick and crisp at the end of the note.', 'Speak the lyrics in rhythm first, then sing them.', 'Keep vowels pure and tall: "ee" with a bit of "ih", "ah" with a bit of "aw".'] },
    { voice: true, keys: /\b(harmony|harmoni[sz]e|sing a third|alto line|tenor line)\b/i, all: ['Start harmony a 3rd above the melody — the Exercise path has harmony lines you can sing against the band.', 'Learn the harmony alone first, then sing it while the melody plays quietly in the Studio mixer.'] },
    { keys: /\b(timing|rhythm|in time|rush|rushing|drag|dragging|steady|pulse|tempo)\b/i, all: ['Practise with the metronome on beats 2 and 4 only — it forces you to feel the pulse yourself.', 'Record a take and listen back: your ears catch rushing better while you are not playing.', 'Count out loud while you play. Saying "1 & 2 &" ties your hands to the beat.', 'Use the Gap trainer in the Metronome: every other bar is silent and you keep the time.', 'Slow down until you can play it perfectly in time, then add 4 BPM at a time.'] },
    { keys: /\b(speed|faster|fast|quick|velocity)\b/i, all: ['Speed comes from accuracy: play it perfectly slow, then raise the tempo 4–5 BPM at a time.', 'Use the speed trainer in the Metronome (it raises the BPM automatically every few bars).', 'Stay relaxed — tension is the biggest speed killer. Check your shoulders and jaw.', 'Practise in short bursts: play 4 notes fast, stop, relax, then the next 4.'] },
    { keys: /\b(mistake|wrong note|accuracy|accurate|clean|slip)\b/i, all: ['Find the exact spot where it goes wrong and loop only those 2–4 notes.', 'Say each note name before you play it — it slows the brain down enough to be accurate.', 'Practise the difficult move 5 times correctly in a row before playing the whole passage again.'] },
    { keys: /\b(tone|sound|beautiful|quality)\b/i, all: ['Listen to the very start of each note — a clean attack makes a clean tone.', 'Long notes are the best tone practice. Hold each one and listen to it until the end.', 'Record yourself and compare the sound with a recording you love.'] },
    { keys: /\b(posture|sit|stand|hand position|wrist|thumb|tension|pain|hurt)\b/i, all: ['Keep your wrists straight and relaxed; shake out your hands between exercises.', 'If anything hurts, stop. Practice should never be painful — check your posture and take a break.', 'Sit (or stand) tall with relaxed shoulders. Your instrument should come to you, not the other way round.'] },
    { keys: /\b(nervous|stage fright|perform|concert|recital|audience)\b/i, all: ['Perform for friends and family (or record yourself) often — it makes performing feel normal.', 'Before you play, breathe in for 4 counts and out for 6. It calms your heart rate.', 'Know your first few bars perfectly — a confident start carries you into the piece.'] },
    { keys: /\b(motivat|bored|boring|give up|lazy|routine|habit)\b/i, all: ['Set a tiny goal: 10 minutes today. Starting is the hardest part, and the streak does the rest.', 'Mix it up: 5 minutes of scales, 10 minutes on a song you love, then a fun groove in the Beat maker.', 'Pick one song you really want to play and learn it a little bit every day.'] },
    { keys: /\b(warm ?up|warmup|start my practice)\b/i, all: ['A good warm-up: 2 minutes of long notes or slow scales, 2 minutes of finger exercises, 1 minute of chords — then your real work.', 'Begin with Level 1–2 exercises from the Exercise path at a slow tempo, then speed up.'] },
    { keys: /\b(how long|how much|minutes|hours|practice plan|schedule|routine)\b/i, all: ['Short and daily beats long and rare: 20–30 focused minutes every day is excellent.', 'A balanced session: warm-up (5 min), technique (10 min), repertoire/songs (10 min), something fun (5 min).'] },
    { keys: /\b(memori[sz]e|memory|remember)\b/i, all: ['Memorise in small chunks: two bars at a time, then join them.', 'Learn the chord progression or the "shape" of the melody first — the notes stick to the structure.', 'Play it from memory away from the instrument, in your head, before sleep.'] },
    { keys: /\b(sight[- ]?read|reading music|read notes|staff)\b/i, all: ['Sight-read something easy every day — the Sight-reading mode in Learn gives you fresh melodies.', 'Look ahead: your eyes should be at least one note ahead of your fingers.', 'Learn the lines (E G B D F) and spaces (F A C E) of the treble staff; for bass clef: G B D F A and A C E G.'] },
    { keys: /\b(improvi[sz]|solo|jam|ad lib)\b/i, all: ['Start with three notes from the pentatonic scale and make rhythms with them.', 'Target chord tones (especially the 3rd) when the chord changes.', 'Leave space! Short phrases with rests sound more musical than non-stop notes.', 'Use the Beat maker or a style with auto-accompaniment, and jam over its chords.'] },
    { keys: /\b(ear|by ear|listen|transcribe)\b/i, all: ['Sing what you hear before you look for it on your instrument.', 'Practise intervals in the Ear training mode — link each one to a song you know.', 'Try the Call & response mode: Overture plays a phrase, you echo it back.'] },
    { keys: /\b(strum|strumming)\b/i, all: ['Keep your strumming hand moving down-up constantly, like a pendulum, and only hit the strings where the pattern says.', 'Down-strums on the beats, up-strums on the "&".', 'Mute the strings with your fretting hand and practise just the rhythm first.'] },
    { keys: /\b(barre|bar chord|f chord)\b/i, all: ['Roll your index finger slightly onto its bony side and keep it close to the fret.', 'Pull back gently with your arm instead of squeezing with your thumb.', 'Practise a partial barre first (just the top 2–3 strings), then the full shape.'] },
    { keys: /\b(sore|fingertip|calluses|callus)\b/i, all: ['Sore fingertips are normal in the first weeks — practise in several short sessions and they will toughen up.', 'Press just enough to get a clean note; pressing harder only hurts more.'] },
    { keys: /\b(breath|breathing|air|embouchure|lip|endurance|high notes|range)\b/i, all: ['Breathe low (belly, not shoulders) and use fast air for high notes, not more mouthpiece pressure.', 'Long tones and lip slurs every day build range and endurance.', 'Rest as much as you play — brass muscles need recovery.'] },
    { keys: /\b(hands together|left hand|independence|coordination)\b/i, all: ['Practise each hand alone until it is automatic, then put them together very slowly.', 'Simplify the left hand first (just roots) and add the full pattern later.'] },
    { keys: /\b(pedal|sustain pedal)\b/i, all: ['Change the pedal just after each new chord: play the chord, lift, press again ("legato pedalling").', 'Too much pedal makes it muddy — listen and clear it on each chord change.'] },
    { keys: /\b(groove|bass line|lock in|kick drum)\b/i, all: ['Lock your notes with the kick drum — bass and kick are one instrument.', 'Root on beat 1, then decorate with the 5th and octave.', 'Use the Beat maker with only the kick and snare to practise locking in.'] },
  ];

  const APP_HELP = [
    { keys: /\b(record|send|teacher|submit|review)\b/i, text: 'To send your playing to your teacher, press **Record & send** (on an assignment, a song page, the Studio or after an exercise). You can listen back, re-record and add a note before sending. If you are offline it uploads later.' },
    { keys: /\b(beat ?maker|step|sequencer|pattern|drum machine)\b/i, text: 'Open **Metronome → Beat maker**. Tap the grid to add drum hits (tap again for an accent, again for a ghost note), choose 16ths or triplets, add swing and save your pattern. Press play and practise along.' },
    { keys: /\b(style|styles|rhythm|ballad|disco|rock|bossa|waltz|genre|accompaniment)\b/i, text: 'Open **Metronome → Styles** for 40+ rhythms (ballads, disco, rock, Latin, jazz, gospel, world). Use **Main A / Main B**, **Fill** and **Ending** like on a keyboard, and type chords (e.g. "C | Am | F | G") to get bass and chord accompaniment.' },
    { keys: /\b(exercise|path|lesson|level|curriculum)\b/i, text: 'Open **Learn → Exercise path**: 50+ exercises for your instrument from Level 1 (beginner) to Level 5 (advanced). Play along with the click, get live feedback on every note, and compare your takes.' },
    { keys: /\b(song|hymn|gospel|tamil|chord chart|pdf)\b/i, text: 'Open **Songs** for hymns and your teacher\'s songs (English, Tamil and more). You can transpose, use a capo, play with a backing band and record yourself.' },
    { keys: /\b(tune|tuner|tuning|out of tune)\b/i, text: 'Open the **Tuner**, play one string/note at a time and adjust until the needle is centred and green.' },
    { keys: /\b(classroom|sign in|login|assignment|server)\b/i, text: 'Open **Classroom** and sign in with the server address and details your teacher gave you. Your assignments appear there and your results sync automatically.' },
  ];

  // ------------------------------------------------------------------ helpers
  function parseChord(text) {
    const m = /\b([A-G])([#b♯♭]?)(maj7|M7|m7|min7|m|min|7|dim|°|aug|\+|sus2|sus4|sus|5)?\b(?!\w)/.exec(text);
    if (!m) return null;
    let root = SHARPS.indexOf(m[1]);
    if (m[2] === '#' || m[2] === '♯') root++;
    if (m[2] === 'b' || m[2] === '♭') root--;
    const map = { M7: 'maj7', maj7: 'maj7', m7: 'm7', min7: 'm7', m: 'm', min: 'm', 7: '7', dim: 'dim', '°': 'dim', aug: 'aug', '+': 'aug', sus2: 'sus2', sus4: 'sus4', sus: 'sus4', 5: '5' };
    return { root: mod12(root), type: map[m[3]] || '', name: m[1] + (m[2] || '') + (m[3] || '') };
  }
  const flatsFor = (pc, minor) => [5, 10, 3, 8, 1, 6].includes(minor ? mod12(pc + 3) : pc) && !(pc === 6 && !minor);

  function chordAnswer(c, inst) {
    const T = PM.Theory;
    const t = T.TYPE_BY_ID[c.type];
    if (!t) return null;
    const flats = c.name.includes('b') || flatsFor(c.root, c.type === 'm');
    const notes = t.iv.map((iv) => (flats ? FLATS : SHARPS)[mod12(c.root + iv)]);
    let s = `**${c.name}** (${t.label}) = ${notes.join(' – ')}.`;
    const I = PM.Instruments.get(inst);
    if (I.strings && I.chordal) {
      const sh = T.guitarShape(c.root, c.type);
      if (sh) s += ` Guitar shape (low E → high e): **${sh.frets.map((f) => (f < 0 ? 'x' : f)).join(' ')}**${sh.barre ? ` (barre at fret ${sh.barre})` : ''}.`;
    } else if (inst === 'piano') s += ` On piano: play ${notes.join(', ')} together with fingers ${t.iv.length === 3 ? '1-3-5' : '1-2-3-5'} (right hand), and ${notes[0]} in the left hand.`;
    else if (inst === 'bass') s += ` On bass, play the root **${notes[0]}** on beat 1 and use ${notes.slice(1).join(' / ')} to walk or decorate.`;
    else if (inst === 'voice') s += ` To sing it, arpeggiate it: ${notes.join(' – ')} – ${notes[0]} (do-mi-so-do), then hold the 3rd — that note decides major or minor.`;
    else if (inst === 'trumpet') { const w = t.iv.map((iv) => SHARPS[mod12(c.root + iv + 2)]); s += ` For B♭ trumpet the written arpeggio is ${w.join(' – ')} (concert ${notes.join('–')}).`; }
    return s;
  }

  function scaleAnswer(pc, scId, label, inst) {
    const L = PM.Learn;
    const sc = L.SCALES[scId];
    const minorish = /minor|dorian|minpent|blues|harmonic|melodic/.test(scId + label);
    const flats = flatsFor(pc, minorish);
    const names = sc.iv.map((iv) => (flats ? FLATS : SHARPS)[mod12(pc + iv)]);
    const steps = sc.iv.slice(1).concat(12).map((v, i) => v - sc.iv[i]).map((d) => (d === 1 ? 'H' : d === 2 ? 'W' : d === 3 ? 'W+H' : d + ' st')).join(' ');
    let s = `**${(flats ? FLATS : SHARPS)[pc]} ${sc.name}**: ${names.join(' – ')} (steps: ${steps}).`;
    if (inst === 'voice') s += ' Sing it on solfege (do-re-mi…) or "la", slowly against a drone, and check each note on the pitch trail.';
    if (inst === 'trumpet') s += ` Written for B♭ trumpet: ${sc.iv.map((iv) => SHARPS[mod12(pc + iv + 2)]).join(' – ')}.`;
    s += ' Practise it in **Learn → Scales**.';
    return s;
  }

  // ------------------------------------------------------------------ answering questions
  /** ctx: {instrument, game, next: {title, level}, weakest} */
  function respond(question, ctx) {
    ctx = ctx || {};
    const q = String(question || '').trim();
    const ql = q.toLowerCase();
    const named = /\b(sing|singing|singer|vocal|vocals|voice)\b/i.test(q) ? 'voice' : /\b(piano|keyboard|keys)\b/i.test(q) ? 'piano' : /\bbass\b/i.test(q) ? 'bass' : /\btrumpet\b/i.test(q) ? 'trumpet' : /\belectric\b/i.test(q) ? 'electric' : /\bguitar\b/i.test(q) ? 'guitar' : null;
    const inst = named || ctx.instrument || 'guitar';
    const I = PM.Instruments.get(inst);
    if (!q) return { text: 'Ask me anything about practising, chords, scales, rhythm or how to use Overture!' };
    if (/^(hi|hello|hey|vanakkam|good (morning|evening|afternoon))\b/i.test(q)) return { text: `Hi${ctx.name ? ' ' + ctx.name : ''}! I'm Cadi, your practice buddy. I listen while you practise, give tips, compare your takes, and answer questions. Try: *"What should I practise?"*, *"How do I play Bm?"* or *"Notes in D major"*.` };
    if (/\b(what can you do|help me|who are you|what are you)\b/i.test(q)) return { text: 'I can: give live feedback while you play exercises; compare your takes ("Did I improve?"); plan your practice ("What should I practise?"); explain chords, scales, intervals, time signatures and tempo words; and help with the app (recording, beat maker, styles, songs). I run fully on your device.' };
    if (/\b(what should i (practi[cs]e|do|play)|what next|next exercise|practice plan|plan my)\b/i.test(q)) return planAnswer(ctx);
    if (/\b(how am i doing|my progress|my stats|did i improve|improv(e|ing|ement))\b/i.test(q) && ctx.game) return progressAnswer(ctx);
    // scales
    const sm = /\b([A-G])([#b♯♭]?)\s*(natural minor|harmonic minor|melodic minor|minor pentatonic|major pentatonic|pentatonic|blues|dorian|mixolydian|chromatic|major|minor)?\s*(scale|pentatonic|mode)\b/i.exec(q) || /\bnotes? (in|of) ([A-G])([#b♯♭]?)\s*(harmonic minor|melodic minor|minor pentatonic|major pentatonic|blues|pentatonic|major|minor)?(?!\w)(?! *(chord|7|m7|maj7))/i.exec(q);
    if (sm) {
      const letter = sm[1].length === 1 && /[A-G]/i.test(sm[1]) ? sm[1] : sm[2];
      const acc = sm[1].length === 1 && /[A-G]/i.test(sm[1]) ? sm[2] : sm[3];
      let kind = ((sm[1].length === 1 && /[A-G]/i.test(sm[1]) ? sm[3] : sm[4]) || 'major').toLowerCase();
      if (/pentatonic/i.test(sm[0]) && !kind.includes('pentatonic')) kind = (kind === 'minor' ? 'minor' : 'major') + ' pentatonic';
      let pc = SHARPS.indexOf(letter.toUpperCase());
      if (acc === '#' || acc === '♯') pc++;
      if (acc === 'b' || acc === '♭') pc--;
      const scId = (SCALE_WORDS.find(([w]) => kind.includes(w)) || [null, 'major'])[1];
      return { text: scaleAnswer(mod12(pc), scId, kind, inst) };
    }
    // chords
    if (/\bchord\b|\bhow (do i|to) play\b|\bnotes (in|of)\b|\bfinger/i.test(q)) {
      const c = parseChord(q.replace(/\b(how|do|i|play|the|chord|a|an|on|guitar|piano)\b/gi, ' '));
      if (c) { const a = chordAnswer(c, inst); if (a) return { text: a + ' Tip: practise switching to it in **Learn → Chord library & changes**.' }; }
    }
    // intervals
    const iv = INTERVALS.find(([, n]) => ql.includes(n));
    if (iv && /\b(what|interval|how|sound)\b/i.test(q)) return { text: `A **${iv[1]}** is ${iv[0]} semitone${iv[0] === 1 ? '' : 's'}${iv[0] ? ` (e.g. C → ${SHARPS[iv[0] % 12]})` : ''}. Song to remember it: *${INTERVAL_SONGS[iv[1]] || '—'}*. Train it in **Learn → Interval ear training**.` };
    // time signatures
    const ts = /\b(\d{1,2})\s*\/\s*(\d)\b/.exec(q);
    if (ts && METERS[ts[1] + '/' + ts[2]]) return { text: METERS[ts[1] + '/' + ts[2]] };
    // tempo & dynamics words
    for (const [w, d] of Object.entries(TEMPO_TERMS)) if (new RegExp('\\b' + w.replace('.', '\\.') + '\\b', 'i').test(q)) return { text: `**${w[0].toUpperCase() + w.slice(1)}** means ${d}.` };
    for (const [w, d] of Object.entries(DYNAMICS)) if (new RegExp('\\b' + w + '\\b', w.length <= 2 ? '' : 'i').test(q) && /\b(mean|what|is)\b/i.test(q)) return { text: `**${w}** = ${d}.` };
    if (/\b(transpose|capo)\b/i.test(q)) return { text: 'A **capo** raises every string: with a capo on fret 2, a G shape sounds as A. In **Songs**, set the capo and Overture shows the shapes to play. **Transpose** moves a whole song up or down to suit your voice.' };
    if (/\b(key signature|which key|what key)\b/i.test(q)) return { text: 'The key is the "home" note and scale of a song. Look at the key signature (sharps/flats) and the last chord — songs usually end on the home chord. Overture\'s **Insights** detects the key of any song you load.' };
    // app help
    for (const h of APP_HELP) if (h.keys.test(q) && /\b(how|where|what|can|use|open|find)\b/i.test(q)) return { text: h.text };
    // practice topics
    const topic = TOPICS.find((t) => (!t.voice || inst === 'voice') && t.keys.test(q));
    if (topic) return { text: pick(topic.all) + (I.tips ? '' : '') };
    if (/\btip\b|\badvice\b|\bhelp\b/i.test(q)) return { text: `${pick(I.tips)}` };
    return { text: `I'm not sure about that one yet. I can explain chords ("How do I play F#m?"), scales ("notes in Bb major"), intervals ("what is a perfect fifth?"), time signatures ("what is 6/8?"), tempo words ("what does andante mean?"), give practice advice (timing, speed, tone, memorising…) or plan your practice ("What should I practise?").` };
  }

  function planAnswer(ctx) {
    const g = ctx.game || {};
    const parts = [];
    if (ctx.next) parts.push(`Next on your Exercise path: **#${ctx.next.n} ${ctx.next.title}** (Level ${ctx.next.level}).`);
    if (ctx.weakest) parts.push(`Your weakest area lately is **${ctx.weakest}** — spend 5 minutes there.`);
    const mins = Math.round((g.todaySeconds || 0) / 60);
    if (g.dailyGoalMinutes) parts.push(mins >= g.dailyGoalMinutes ? `You've already hit today's ${g.dailyGoalMinutes}-minute goal — anything more is a bonus! 🎉` : `You've practised ${mins} of your ${g.dailyGoalMinutes} minutes today.`);
    parts.push('A balanced plan: 5 min warm-up (long notes / slow scale) → 10 min Exercise path → 10 min a song → 5 min jamming over a Style.');
    return { text: parts.join(' '), action: ctx.next ? { kind: 'open-exercise', id: ctx.next.id, label: 'Open next exercise' } : null };
  }

  function progressAnswer(ctx) {
    const g = ctx.game;
    const s = [];
    s.push(`Level **${g.level}**, ${g.streak || 0}-day streak, ${Math.round((g.totalSeconds || 0) / 60)} minutes in total.`);
    const done = Object.values(g.path || {}).filter((p) => (p.stars || 0) >= 1).length;
    if (ctx.pathTotal) s.push(`Exercise path: **${done}/${ctx.pathTotal}** exercises passed.`);
    if (ctx.lastCompare) s.push(ctx.lastCompare);
    return { text: s.join(' ') };
  }

  // ------------------------------------------------------------------ reacting to practice
  /**
   * React to a practice event; returns {text, mood} or null. state holds running counters
   * between events (the UI keeps it per session).
   */
  function react(ev, state) {
    state.counts = state.counts || { hit: 0, early: 0, late: 0, wrong: 0, miss: 0, streak: 0, best: 0 };
    const c = state.counts;
    switch (ev.type) {
      case 'start':
        Object.assign(state, { counts: { hit: 0, early: 0, late: 0, wrong: 0, miss: 0, streak: 0, best: 0 }, wrongNotes: {}, title: ev.title });
        return { mood: 'info', text: ev.takeNo > 1 ? `Take ${ev.takeNo} — ${pick(['let\'s beat the last one!', 'focus on what we noticed last time.', 'nice and relaxed.'])}` : `Let's go: **${ev.title}**${ev.bpm ? ` at ${ev.bpm} BPM` : ''}. ${ev.tip || ''}` };
      case 'note': {
        const r = ev.result;
        c[r === 'hit' ? 'hit' : r] = (c[r === 'hit' ? 'hit' : r] || 0) + 1;
        if (r === 'hit' || r === 'early' || r === 'late') c.streak++; else c.streak = 0;
        c.best = Math.max(c.best, c.streak);
        if (r === 'wrong' && ev.expectedName && ev.playedName) {
          const k = ev.playedName + '→' + ev.expectedName;
          state.wrongNotes[k] = (state.wrongNotes[k] || 0) + 1;
          if (state.wrongNotes[k] === 2) return { mood: 'warn', text: `You played **${ev.playedName}** instead of **${ev.expectedName}** twice — ${/[#b]/.test(ev.expectedName) ? 'remember the sharp/flat in this key' : 'check that finger'}.` };
        }
        if (c.streak === 8 || c.streak === 16 || c.streak === 32) return { mood: 'good', text: `${pick(PRAISE)} ${c.streak} notes in a row!` };
        if (c.early >= 3 && c.early > c.late * 2 && !state.toldRush) { state.toldRush = true; return { mood: 'warn', text: 'You\'re rushing a little — wait for the click and land *on* it.' }; }
        if (c.late >= 3 && c.late > c.early * 2 && !state.toldDrag) { state.toldDrag = true; return { mood: 'warn', text: 'You\'re a bit behind the beat — look one note ahead so your fingers are ready.' }; }
        return null;
      }
      case 'end': return { mood: ev.stats.accuracy >= 0.85 ? 'good' : ev.stats.accuracy >= 0.6 ? 'info' : 'warn', text: takeReview(ev.stats, ev.prev, ev.exercise) };
      case 'groove': return { mood: 'info', text: ev.style ? `${ev.style.name} at ${ev.bpm} BPM. ${ev.style.tip || ''}` : `Groove running at ${ev.bpm} BPM — lock in with the kick and snare.` };
      case 'idle': return { mood: 'info', text: pick(['Still there? Try the next exercise or ask me for a tip.', 'Take a short break if you need one — then a slow, perfect take.', 'Want a challenge? Ask me "What should I practise?"']) };
      default: return null;
    }
  }

  /** Review of a finished take, compared with the previous one. */
  function takeReview(s, prev, ex) {
    const pct = (x) => Math.round(x * 100) + '%';
    const lines = [];
    lines.push(`${s.accuracy >= 0.95 ? '🌟 Excellent take!' : s.accuracy >= 0.8 ? '👍 Good take.' : s.accuracy >= 0.6 ? 'Getting there.' : 'Tricky one!'} Notes: **${pct(s.accuracy)}**, in time: **${pct(s.inTime)}**.`);
    if (s.avgOffset != null && Math.abs(s.avgOffset) >= 25) lines.push(`On average you were **${Math.abs(Math.round(s.avgOffset))} ms ${s.avgOffset < 0 ? 'early (rushing)' : 'late (dragging)'}**.`);
    else if (s.avgOffset != null) lines.push('Your timing was centred on the beat. 🎯');
    if (s.spread != null && s.spread > 60) lines.push(`Your timing varied by about ±${Math.round(s.spread)} ms — aim for evenness before speed.`);
    if (prev) {
      const da = s.accuracy - prev.accuracy, dt = s.inTime - prev.inTime;
      if (da > 0.04 || dt > 0.04) lines.push(`Improvement since your last take: ${da > 0.04 ? `notes +${Math.round(da * 100)}%` : ''}${da > 0.04 && dt > 0.04 ? ', ' : ''}${dt > 0.04 ? `timing +${Math.round(dt * 100)}%` : ''}. 📈`);
      else if (da < -0.06 || dt < -0.06) lines.push('A bit less steady than your last take — try a slightly slower tempo.');
      else lines.push('About the same as your last take — consistency is good!');
    }
    if (s.slips && s.slips.length) lines.push(`Watch: ${s.slips.slice(0, 3).join(', ')}.`);
    if (s.pitch) {
      const p = s.pitch;
      if (p.inTune >= 0.8) lines.push(`Pitch: **${pct(p.inTune)} in tune** (±${p.avgCents}¢) — lovely, steady singing. 🎤`);
      else lines.push(`Pitch: **${pct(p.inTune)} in tune**, about ±${p.avgCents}¢ off on average.`);
      if (p.bias <= -12) lines.push('You tend to sit **flat** — keep the breath moving and think "up" into each note; don\'t let energy drop at the end of phrases.');
      else if (p.bias >= 12) lines.push('You tend to sit **sharp** — relax the jaw and neck and sing a touch softer; don\'t push.');
      else if (p.inTune < 0.7) lines.push('Your average is centred, so the issue is *steadiness*: hold each note on a long "ah" with the guide melody on, and watch the line stay green.');
    }
    if (s.accuracy >= 0.9 && s.inTime >= 0.85 && ex) lines.push(`Ready for more: try **${Math.round(s.bpm * 1.06)} BPM**, or move on to the next exercise.`);
    else if (s.accuracy < 0.6 && s.bpm > 50) lines.push(`Try **${Math.max(40, Math.round(s.bpm * 0.85))} BPM** and use "Wait for me" mode for the hard spots.`);
    lines.push('Play the take back and listen — your ears will hear things your hands missed.');
    return lines.join(' ');
  }

  /** Statistics from judged notes. */
  function takeStats(results, bpm) {
    const judged = results.filter((r) => r.result);
    const n = judged.length || 1;
    const correct = judged.filter((r) => ['hit', 'early', 'late'].includes(r.result));
    const offs = correct.map((r) => r.offsetMs).filter((x) => x != null);
    const avg = offs.length ? offs.reduce((a, b) => a + b, 0) / offs.length : null;
    const spread = offs.length > 1 ? Math.sqrt(offs.reduce((a, b) => a + (b - avg) ** 2, 0) / offs.length) : null;
    const slips = judged.filter((r) => r.result === 'wrong' && r.playedName).map((r) => `${r.playedName} for ${r.expectedName}`);
    return { accuracy: correct.length / n, inTime: judged.filter((r) => r.result === 'hit').length / n, avgOffset: avg, spread, slips, missed: judged.filter((r) => r.result === 'miss').length, bpm, notes: n };
  }

  PM.Agent = { respond, react, takeReview, takeStats, parseChord, chordAnswer, scaleAnswer, TOPICS, NAME: 'Cadi' };
  if (typeof module !== 'undefined' && module.exports) module.exports = PM.Agent;
})(typeof self !== 'undefined' ? self : globalThis);
