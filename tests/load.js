// Loads the browser modules (which attach to globalThis.PM) into Node.
for (const m of ['dsp', 'voices', 'theory', 'instruments', 'rhythm', 'midi', 'analyzer', 'separation', 'coach', 'game', 'improv', 'backing', 'songs', 'learn', 'curriculum', 'styles', 'agent', 'worship', 'kids', 'harmony', 'academy', 'courses', 'challenges', 'clickpat', 'fingering', '../ui/pitchtrail']) {
  try { require('../js/core/' + m + '.js'); } catch (e) { if (e.code !== 'MODULE_NOT_FOUND') throw e; }
}
const PM = globalThis.PM;

/** Build a strummed guitar progression as MIDI-like notes. */
function strummedSong({ bpm = 96, bars = 8, progression = ['G', 'C', 'D', 'G'], pattern = 'D-DU-UDU', spread = 0.012 }) {
  const voicings = {
    G: [43, 47, 50, 55, 59, 67], C: [48, 52, 55, 60, 64], D: [50, 57, 62, 66], Em: [40, 47, 52, 55, 59, 64], Am: [45, 52, 57, 60, 64],
  };
  const beat = 60 / bpm, slot = beat / 2;
  const notes = [];
  const start = beat * 4;
  for (let bar = 0; bar < bars; bar++) {
    const chord = voicings[progression[bar % progression.length]];
    for (let s = 0; s < 8; s++) {
      const c = pattern[s];
      if (c === '-') continue;
      const t = start + (bar * 8 + s) * slot;
      const order = c === 'D' ? chord : [...chord].reverse().slice(0, 4);
      const vel = s % 2 === 0 ? 0.9 : 0.6;
      order.forEach((m, i) => notes.push({ midi: m, start: t + i * spread, end: t + slot * 2, velocity: vel, channel: 0 }));
    }
  }
  return notes;
}

module.exports = { PM, strummedSong };
