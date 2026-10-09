# Cadenza — offline AI practice coach for piano & guitar

Cadenza is a music practice app that **listens while you play** and coaches you in real time:
chords, timing, strumming, intonation and dynamics. Load a song (audio or MIDI), play over it
through your mic or audio interface, and the on-device coach tells you what to fix.
**Everything runs locally — no internet, no uploads, no accounts.**

![purple & white UI](icons/icon.svg)

## Features

| Area | What it does |
| --- | --- |
| **Live Studio** | Play along with any track via mic, line-in (audio interface) or a **MIDI keyboard**. Real-time chord recognition, a "song chord vs. you" match, next-chord countdown with fingering, harmony radar, timing gauge (rushing/dragging in ms), intonation in cents, dynamics vs. the song (pp–ff), score, combo and accuracy. A coach feed gives corrections ("Missing B; extra C", "You're dragging ~40 ms"), instructions ("Next up: C — shape x32010") and tips. Slow down without pitch change, loop 2 bars or any section, count-in. |
| **Song Insights** | Key (with relative/alternatives), tempo, time signature (2/4, 3/4, 4/4, 6/8, 9/8, 12/8…), chord progression with roman numerals & harmonic function, main loop, chord shapes (guitar) / voicings (piano), chord timeline, dynamics chart with crescendo/decrescendo detection, and a generated practice plan. |
| **Guitar strumming transcription** | From audio or MIDI: onsets are quantised to the beat grid (8ths, 16ths or triplets), down/up strokes inferred from the pitch sweep of each strum and hand-motion rules, accents and muted "chucks" marked, and the most common bar pattern reported (e.g. `D - D U - U D U`) with variations. |
| **Metronome** | Sample-accurate scheduler, any time signature, subdivisions, accents, tap tempo, **speed trainer** (+N BPM every N bars), **gap trainer** (silent bars), and a **live timing check** that scores how tight you play against the click. |
| **Tuner** | Chromatic YIN tuner (±1 cent), auto string detection for guitar, adjustable A4, reference tones. |
| **Challenges** | Chord Quest, Rhythm Hero, Note Hunter and Ear Trainer, with difficulty levels and high scores. |
| **Gamification** | XP & levels (Beginner → Legend), daily streaks, daily challenges, 19 badges, session stars, practice history and a 14-day chart. |
| **Offline library** | Every analysed song is stored in IndexedDB so you can practise it again offline. |

## Running it

No build step and no dependencies.

```bash
npm start            # = node serve.js → http://localhost:5173
```

Open the page once and the service worker caches the whole app; after that it works with no
connection, and Chrome/Edge offer **Install app** so it launches like a native app. You can also
just open `index.html` directly from disk in Chrome/Edge (everything except the install prompt works).

**Tips**
- Wear headphones while playing along so the coach hears only you, not the backing track.
- Using an audio interface? Select it as the input in the Studio. MIDI keyboards work through Web MIDI (Chrome/Edge).
- Run **Progress → Settings → Auto-calibrate latency** once per device (Bluetooth audio adds ~150–200 ms).

## How the "AI" works (all on-device)

- **Pitch:** YIN with parabolic interpolation.
- **Chords:** peak-picked, harmonically weighted chroma → template matching over 10 chord qualities × 12 roots with bass-note (inversion) detection, then **Viterbi smoothing** across beats.
- **Key:** Krumhansl–Kessler profile correlation, refined with chord evidence (tonic-chord share, first/last chord) to separate relative major/minor.
- **Tempo & beats:** log spectral-flux novelty → autocorrelation with a tempo prior → dynamic-programming beat tracker.
- **Time signature:** accent periodicity of onsets, bass onsets and harmonic change at 2/3/4-beat groupings, plus duple-vs-triple subdivision analysis for compound meters.
- **Strumming:** onset quantisation to a chosen grid + per-strum low-to-high pitch-sweep direction measurement combined with down-on-the-beat / up-on-the-"&" motion priors.
- **Dynamics:** smoothed RMS → relative pp–ff markings, sections and crescendo/decrescendo events.
- **MIDI files:** exact notes, tempo map, time & key signatures; strum direction from note order; rendered to audio with a built-in additive piano / Karplus–Strong guitar synth.

## Project layout

```
index.html, css/styles.css, sw.js, manifest.webmanifest, serve.js
js/core/     dsp · theory · rhythm · midi · analyzer · coach · game   (pure JS, unit-tested in Node)
js/audio/    AudioContext + player + IndexedDB library · live mic/MIDI engines · metronome
js/ui/       components (keyboard, fretboard, chord diagrams, timeline, radar, charts)
js/views/    home · studio · insights · games · metronome · tuner · progress
tests/       node --test suites with synthetic songs
```

## Tests

```bash
npm test
```

The suites synthesise songs (strummed guitar progressions, a piano waltz, click tracks) and check
pitch, chords, inversions, keys, roman numerals, guitar shapes, tempo, meter, strumming patterns,
MIDI round-trips, the coach's corrections and the gamification rules.
