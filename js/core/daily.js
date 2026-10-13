/* Overture — Tip of the day and "Did you know?" facts. A new tip and fact every day (the same
 * all day, on every device), mixing practice tips with tips for your own instrument. */
(function (root) {
  'use strict';
  const PM = (root.PM = root.PM || {});

  const TIPS = [
    'Practise a little every day — 15 focused minutes beats one long session a week.',
    'Start every session with something easy you love playing. A good mood makes better practice.',
    'Slow it down until it is perfect, then speed up 4–5 BPM at a time.',
    'Loop only the bar that goes wrong. Fix the hard part, not the whole song.',
    'Record yourself once a week and listen back — you will hear things you miss while playing.',
    'Count out loud while you play. Your voice is the best metronome you own.',
    'Practise with a click, then try a few bars without it: can you stay in time?',
    'Learn songs in sections: verse, chorus, bridge. Then join them together.',
    'Stop before you are exhausted. Ending on a good take helps you remember it.',
    'Sleep helps your brain lock in new skills — a hard passage often feels easier the next day.',
    'Take a short break every 20–25 minutes: stretch your hands, shoulders and neck.',
    'Pain is a stop sign. Never practise through pain — rest and check your posture.',
    'Sing the melody before you play it. If you can sing it, you can play it.',
    'Listen to great players of your instrument and copy one small idea each week.',
    'Learn one new chord, scale or rhythm a week — small steps add up fast.',
    'Play along with real songs: it trains timing, listening and confidence at once.',
    'Practise both slowly and softly — control at low volume makes you stronger at high volume.',
    'Mix it up: technique, a song, some theory and something just for fun.',
    'Set a tiny goal for today, like "chorus at 80 BPM with no mistakes".',
    'Keep your practice space ready — instrument out, music stand up, tuner nearby.',
    'Tune before every session. Playing out of tune trains your ear the wrong way.',
    'Mistakes are information, not failure. Notice them, then fix them slowly.',
    'Visualise the passage away from your instrument — mental practice really helps.',
    'Learn the words or the shape of the song — it makes the music easier to remember.',
    'Play for someone else this week. Performing is a skill you can practise too.',
    'When something is hard, change one thing: tempo, rhythm, fingering or how much you play.',
    'Use the Practice Planner to balance warm-up, technique, songs and theory.',
    'Practise rhythm away from the instrument: clap, tap or say the rhythm first.',
    'Breathe! Holding your breath creates tension in your hands and voice.',
    'Learn a song in a new key — it teaches you the music, not just the finger moves.',
    'Try the gap trainer: one bar with the click, one bar silent. Can you land beat 1?',
    'Practise the transitions between chords or sections more than the easy parts.',
    'Watch your posture in a mirror for a minute — small changes make playing easier.',
    'End each session by writing one thing that improved and one to work on tomorrow.',
    'Improvise for five minutes — there are no wrong notes, only new ideas.',
    'Play with others whenever you can. Listening to a band is a skill of its own.',
    'If you are stuck, go back a level. Strong foundations make everything faster.',
    'Celebrate progress: compare a take today with one from last month.',
    'Hum or sing the bass line of a song to understand how the harmony moves.',
    'Use headphones when playing along so the coach hears only you.',
  ];

  const FACTS = [
    'The piano’s full name is “pianoforte” — Italian for “soft–loud” — because it can play both quietly and loudly.',
    'A standard piano has 88 keys: 52 white and 36 black.',
    'A grand piano has around 230 strings — most notes use two or three strings tuned together.',
    'The word “music” comes from the Greek “mousikē”, the art of the Muses.',
    'Some of the oldest known instruments are bone flutes about 40,000 years old, found in caves in southern Germany.',
    'Most orchestras tune to A = 440 Hz. Some tune slightly higher, to 442 or 443 Hz, for a brighter sound.',
    'Middle C vibrates about 261.6 times per second (261.6 Hz).',
    'Going up an octave doubles the frequency: A4 is 440 Hz and A5 is 880 Hz.',
    'In equal temperament each semitone multiplies the frequency by about 1.0595 — the 12th root of 2.',
    'Beethoven kept composing after losing his hearing; he was almost completely deaf when his Ninth Symphony premiered in 1824.',
    'Mozart wrote his first little pieces when he was about five years old.',
    'Johann Sebastian Bach had 20 children, and several of them became composers.',
    'Handel wrote the whole of “Messiah” in about 24 days in 1741.',
    '“Silent Night” was first performed on Christmas Eve 1818 in Oberndorf, Austria — with a guitar, because the church organ was out of action, according to tradition.',
    '“Amazing Grace” was written by John Newton, a former slave-ship captain, and first published in 1779.',
    '“Amazing Grace” is usually sung to a tune called “New Britain”. Hymn tunes have their own names!',
    'The Doxology “Praise God, from whom all blessings flow” is usually sung to the tune “Old Hundredth”.',
    'Do–Re–Mi comes from an 11th-century hymn, “Ut queant laxis”, used by the monk Guido of Arezzo to teach singing.',
    'Guido of Arezzo helped develop the music staff about a thousand years ago — the ancestor of today’s five lines.',
    'The treble clef is a fancy letter G and curls around the G line; the bass clef is a fancy F.',
    'A fermata (𝄐) — sometimes called a “bird’s eye” — means hold the note longer than written.',
    'Tempo words are usually Italian: “andante” means walking, “allegro” means cheerful and lively.',
    'Johann Maelzel patented the metronome in 1815, and Beethoven was one of the first composers to add metronome marks.',
    'Tuning forks were invented by John Shore, a trumpeter, in 1711.',
    'Ancient Greek thinkers, traditionally Pythagoras, found that a string halved in length sounds an octave higher.',
    'The “Amen” at the end of many hymns is a plagal cadence: IV → I.',
    '“A cappella” means “in the style of the chapel” — singing with no instruments.',
    'Humans can hear roughly from 20 Hz (a very deep rumble) to 20,000 Hz (a high whistle); the top end drops with age.',
    'The guitar is tuned in 4ths except between G and B, which is a major 3rd — that is why chord shapes change on the B string.',
    'A bass guitar’s four strings are tuned an octave below the lowest four strings of a guitar.',
    'Leo Fender’s Precision Bass (1951) was the first mass-produced electric bass guitar.',
    'The word “capo” comes from the Italian “capotasto”, meaning “head of the fingerboard”.',
    'A B♭ trumpet sounds a whole step lower than written: its written C is a concert B♭.',
    'With no valves pressed, a trumpet can still play several notes — the harmonic series. Bugle calls use only those notes.',
    'The pipe organ is often called the “king of instruments”.',
    'The drum kit grew up in the early 1900s once the bass-drum pedal let one person play several drums; it was nicknamed the “trap set”, from “contraption”.',
    'The hi-hat developed in the 1920s from a smaller foot-operated cymbal pair called the “low-boy”.',
    'A snare drum buzzes because of metal wires — the snares — stretched under its bottom head.',
    'Cymbals are usually made from bronze — an alloy of copper and tin.',
    'The word “rhythm” comes from the Greek “rhythmos”, meaning measured flow.',
    'The word “orchestra” comes from Greek theatre: it was the space in front of the stage where the chorus danced.',
    'The 12-bar blues uses just three chords — I, IV and V — yet it powers thousands of songs.',
    'A “blue note” is a slightly flattened 3rd, 5th or 7th — the bittersweet sound of the blues.',
    'Gospel music strongly shaped soul, R&B and rock and roll.',
    'Carnatic music, the classical music of South India, organises melody with ragas and rhythm with talas; Adi tala has 8 beats.',
    'Indian music uses the syllables Sa Re Ga Ma Pa Dha Ni — like Do Re Mi.',
    'The thappu (parai) is a traditional Tamil frame drum played with two sticks.',
    'Fanny Mendelssohn composed more than 460 pieces of music.',
    'Clara Schumann was one of the greatest concert pianists of the 19th century.',
    'The circle of fifths contains all 12 major keys — and their relative minors.',
    'Spaced practice — short sessions on different days — helps you remember skills better than cramming.',
    'Research suggests sleep helps the brain consolidate motor skills learned during practice.',
    'Playing music uses many brain areas at once: hearing, movement, memory and emotion.',
    'The violin, viola, cello and double bass are the four members of the string family in an orchestra.',
    'Most pop songs use a time signature of 4/4 — four beats in every bar.',
  ];

  const gcd = (a, b) => (b ? gcd(b, a % b) : a);
  /** A stride that visits every item before repeating (coprime with the list length). */
  const stride = (len) => [7, 11, 13, 17, 19, 23, 29].find((p) => gcd(p, len) === 1) || 1;
  const at = (list, n) => list[(((n * stride(list.length)) % list.length) + list.length) % list.length];
  const dayNumber = (d) => { d = d || new Date(); return Math.floor((d.getTime() - d.getTimezoneOffset() * 60000) / 86400000); };
  /** Tip of the day: alternates between general and instrument tips. */
  function tip(inst, offset, date) {
    const I = PM.Instruments && PM.Instruments.get(inst || 'piano');
    const own = (I && I.tips) || [];
    const n = dayNumber(date) + (offset || 0);
    if (own.length && n % 2 === 0) return { text: own[Math.floor(n / 2) % own.length], about: I.label };
    return { text: at(TIPS, n), about: 'Practice' };
  }
  function fact(offset, date) { return at(FACTS, dayNumber(date) + (offset || 0)); }

  PM.Daily = { TIPS, FACTS, tip, fact, dayNumber };
  if (typeof module !== 'undefined' && module.exports) module.exports = PM.Daily;
})(typeof self !== 'undefined' ? self : globalThis);
