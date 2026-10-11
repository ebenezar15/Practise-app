# Cadenza — AI practice coach for piano, guitar, electric guitar, bass & trumpet

Cadenza **listens while you play** and coaches you in real time: chords, notes, timing, strumming,
intonation, bends, tone steadiness and dynamics. Load a song (audio or MIDI), **separate the
instruments**, and play along with the full mix, a **backing track without your instrument**, or
your part on its own — or **improvise** over any track or a generated backing band.
All listening and analysis run **on your device, offline**. An optional **classroom server** adds
teacher/student accounts, assignments and sync.

## Downloads

Get the latest version from the repository's **Releases** page:

| Your computer | File |
| --- | --- |
| **Windows** | `Cadenza-<version>-windows-setup.exe` (installer) or `Cadenza-<version>-windows-portable.exe` (no install) |
| **Mac** (Apple Silicon M1–M4 *and* Intel) | `Cadenza-<version>-mac-universal.dmg` |
| **Linux** | `Cadenza-<version>-linux-x86_64.AppImage` (`chmod +x`, run) or `.deb` |
| **Any computer, no install** | `Cadenza-web-<version>.zip` — open `index.html` in Chrome/Edge |

**First launch on a Mac:** drag Cadenza into Applications and open it. Because Cadenza isn't registered with
Apple yet, macOS says it can't verify the developer — click *Done*, then go to **System Settings → Privacy &
Security** and click **Open Anyway** (only needed once; on older macOS: right-click → Open). If macOS ever says
the app is "damaged", run `xattr -dr com.apple.quarantine /Applications/Cadenza.app` in Terminal. To remove the
prompt entirely, add an Apple Developer ID certificate as repository secrets (see `.github/workflows/desktop.yml`)
and the build signs and notarizes automatically.

**iPad & iPhone:** there's no App Store app; Cadenza installs from your classroom server's
`https://` address in Safari → **Share → Add to Home Screen**. It then runs full-screen, offline,
stays signed in and syncs. The app shows these steps itself. See **[docs/HOSTING.md](docs/HOSTING.md)**
to put your server online (Render.com, your own server with Docker, or your computer + Cloudflare Tunnel).
USB MIDI keyboards aren't supported on iPad/iPhone (use the microphone).

**First launch on Windows:** if SmartScreen appears, click **More info → Run anyway**.

Builds come from the *Build desktop apps* GitHub Action, which launches every packaged app on its own OS before
publishing. Push a tag like `v2.0.1` to publish a release, or run the workflow manually from the Actions tab.
Local builds: `cd desktop && npm install && npm run dist:mac` (or `dist:win`, `dist:linux`).

## Features

| Area | What it does |
| --- | --- |
| **5 instruments** | Piano, acoustic guitar, electric guitar, bass guitar (4-string, down to low E 41 Hz) and B♭ trumpet (written pitch, valve fingerings). Each has its own fretboard/keyboard/valve view, tuner strings, tips and coaching focus. |
| **Live Studio** | Real-time coaching via mic, audio interface (line-in) or MIDI device: chord/note matching, next-chord countdown with fingering, harmony radar, timing (rushing/dragging in ms), intonation in cents, dynamics vs. the song, score/combo/accuracy, coach feed. Slow-down without pitch change, loops, count-in. |
| **Instrument separation** | Split an audio song into **drums, bass, vocals/lead and guitars/keys** on-device (STFT soft-mask HPSS + stereo-centre + bass-band; stems always sum back to the original). MIDI files separate **exactly** by instrument. Presets: *Full song · Backing track (no my instrument) · My part only · Drums & bass*, plus per-stem mute/solo/volume. |
| **Part following** | For bass and trumpet the coach follows your isolated part (exact from MIDI, transcribed from audio stems) — or the chord roots/chord tones when no part exists. |
| **Improvise mode** | Chord-scale suggestions for every chord (pentatonic, modes, blues…), chord tones & scale tones mapped on the fretboard/keyboard, live note classification (chord / scale / blue / outside), praise for targeting 3rds & 7ths on changes, clash warnings with resolution hints, range/rhythm/phrasing feedback and creative prompts. |
| **Backing-track generator** | Any key; pop, ballad, 12-bar blues, jazz ii–V–I, minor, funk and Dorian progressions; rock, swing, ballad and funk grooves; any tempo. Generated **without your instrument**. |
| **Song Insights** | Key, tempo, time signature, chord progression with roman numerals, chord shapes (guitars), bass roots & positions, trumpet written-key chart, strumming pattern, dynamics chart and a practice plan. |
| **Electric guitar** | Power chords, bend measurement (half/whole-step accuracy in cents), muting tips. |
| **Trumpet** | Written-pitch display with valves, transposed instructions, tone-steadiness (wobble) detection, Long Tones challenge. |
| **Metronome & tuner** | Accents, subdivisions, odd meters, speed & gap trainers, timing check; chromatic tuner with per-instrument strings and B♭ transposition. |
| **Challenges** | Chord Quest, Rhythm Hero, Note Hunter (per-instrument ranges), Long Tones, Ear Trainer. |
| **Gamification** | XP, levels, streaks, daily challenges, 21 badges (incl. Improviser & Homework Hero), stars, history. |
| **Classroom** | Master teacher, teachers & students; invite codes; assignments with songs or backing tracks, practice mode, mix preset, speed, targets and due dates; results with coach insights; teacher feedback; synced progress. |

## Classroom: users, assignments and sync

### 1. Start a classroom server (teacher)

Pick one:

* **Desktop app** — *Classroom → Host classroom on this computer → Start*. It shows the address students use, e.g. `http://192.168.1.20:8787`.
* **Any computer with Node.js 18+** — `node server/server.js` (or `Start Classroom Server` in the web zip). Data is stored in `server-data/` (`DATA_DIR` to change, `PORT` to change the port).
* **Online (students at home)** — deploy `server/server.js` to any Node host with a persistent disk (a small VPS, Render, Railway, Fly.io…) and put it behind HTTPS (e.g. Caddy: `music.example.com { reverse_proxy localhost:8787 }`, or set `TLS_CERT`/`TLS_KEY`). Students then use `https://music.example.com`.

### 2. Become the master teacher

Open Cadenza → **Classroom**, enter the server address. On a brand-new server you'll see
*Set up as master teacher*: choose your school name, username and password. The master teacher can
add other teachers (and other master teachers); teachers manage students.

### 3. Add students (two ways)

* **Create the account yourself**: *Students → Add a student* (name, username, instrument). Cadenza shows a
  temporary password — give it to the student with the server address. They choose their own password at first sign-in.
* **Invite codes**: *Invite codes → Generate*. Send each student a code; they pick *I have an invite code*,
  enter the server address and code, and choose their own username & password.

You can reset passwords, deactivate or delete accounts, and open any student to see their level,
streak, practice history and assignment results.

### 4. Set assignments

*Assignments → New assignment*: title, instructions, instrument (or any), practice mode
(*play the part · improvise · challenge game · free practice*), mix (*full song · backing track ·
own part only · drums & bass*), speed, targets (accuracy %, minutes, stars), due date, and who it's
for (everyone or chosen students). Attach a **song file**, the **current Studio track**, or a
**generated backing track** (each student gets it without their own instrument).

Students see assignments in **Classroom**, press **Start**, and Cadenza opens the Studio (or the
challenge) with everything set up. When they finish a session the result — accuracy, minutes,
stars and the coach's insights — is sent to the teacher, who can reply with feedback.

### 5. Install on students' computers and stay in sync

Send students the installer (or the web zip). They install it, open **Classroom**, enter the server
address and sign in. Everything works **offline**; results wait in an outbox and upload, and
XP/levels/badges/history merge across devices (conflict-free), whenever the server is reachable.

> **Microphone note:** browsers only allow the microphone on `https://` sites, `localhost` and local
> files. The installed desktop app and the downloaded web app always work. Opening the app *in a
> browser* from another computer's `http://192.168…` address does not allow the mic — use the
> desktop app or serve the classroom over HTTPS.

## Running from source

```bash
npm start        # app at http://localhost:5173 (static server, zero dependencies)
npm run server   # classroom server at http://localhost:8787 (also serves the app)
npm test         # unit + integration tests
npm run package:web   # dist/Cadenza-web-<version>.zip
cd desktop && npm install && npm start   # desktop app in development
```

## How the "AI" works (all on-device)

- **Pitch:** YIN with parabolic interpolation (decimated for bass down to 35 Hz).
- **Chords:** peak-picked chroma → template matching (10 qualities × 12 roots) with bass/inversion detection → Viterbi smoothing over beats → segment-level quality refinement (e.g. A → A7).
- **Key:** Krumhansl–Kessler profiles refined by chord evidence (resolves relative major/minor).
- **Tempo/beats/meter:** spectral-flux novelty, autocorrelation with tempo prior, dynamic-programming beat tracker, accent-periodicity meter with compound-meter detection.
- **Strumming:** grid quantisation + low-to-high pitch-sweep direction + hand-motion priors.
- **Separation:** harmonic/percussive median filtering, stereo-centre and frequency-band soft masks on a packed stereo STFT with perfect-reconstruction overlap-add.
- **Transcription:** monophonic YIN tracking with median smoothing and re-attack detection (bass lines, melodies).
- **Improvisation:** chord-scale selection by key fit, note classification, targeting detection, inter-onset rhythmic entropy, range and space metrics.
- **Synthesis:** additive piano, Karplus–Strong guitar/electric/bass, wavetable brass/strings/organ and a synthesized drum kit.

These are signal-processing methods, not neural networks: separation is approximate on dense
real-world mixes (MIDI is exact), and all results are best treated as a practice guide.

## Project layout

```
index.html, css/, icons/, sw.js, manifest.webmanifest, serve.js
js/core/     dsp · theory · instruments · rhythm · midi · analyzer · separation · improv · backing · coach · game · syncmerge
js/audio/    AudioContext + player + IndexedDB library · live mic/MIDI engines · metronome
js/sync/     classroom account, outbox & progress sync client
js/ui/       components (keyboard, fretboard, valves, chord diagrams, timeline, radar, charts)
js/views/    home · studio · insights · games · metronome · tuner · progress · classroom
server/      zero-dependency classroom server (accounts, invites, assignments, files, results, sync)
desktop/     Electron shell (offline app + "Host classroom"), electron-builder config
scripts/     packaging helpers
tests/       node --test suites (synthetic songs, separation, coaching, server)
```
