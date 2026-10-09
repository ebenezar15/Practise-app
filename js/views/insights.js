/* Cadenza — Song Insights: full analysis report + offline song library. */
(function (root) {
  'use strict';
  const PM = root.PM;
  const { UI, Theory } = PM;
  const { icon, esc, $, $$ } = UI;

  function confidenceTag(c) {
    if (c == null) return '';
    return c >= 0.75 ? '<span class="tag ok">high confidence</span>' : c >= 0.45 ? '<span class="tag warn">medium confidence</span>' : '<span class="tag bad">low confidence</span>';
  }

  PM.App.register({
    id: 'insights', title: 'Song Insights', nav: 'Insights', icon: 'insights',
    render(host, App) {
      const track = App.track, a = track && track.analysis, inst = App.instrument;
      host.innerHTML = `
        <div class="page-head">
          <div><div class="eyebrow">Song Insights</div><h1>${a ? esc(track.name) : 'Understand any song'}</h1>
          <p>${a ? 'Everything Cadenza heard in this track — use it to learn the song, then practise it in the Studio.' : 'Upload audio or MIDI and get the key, chord progression, tempo, time signature, dynamics and strumming pattern — computed entirely on your device.'}</p></div>
          ${a ? `<div class="row"><button class="btn ghost" id="newTrack">${icon('upload')} Analyse another</button><a class="btn primary" href="#/studio">${icon('mic')} Practise this</a></div>` : ''}
        </div>
        <div id="body"></div>
        <section class="card" style="margin-top:18px">
          <div class="card-head"><h3>${icon('library')} Your offline library</h3><span class="muted small">Stored on this device</span></div>
          <div id="lib"><div class="empty">Loading…</div></div>
        </section>`;
      const body = $('#body', host);
      if (!a) {
        const c = document.createElement('section');
        c.className = 'card';
        body.appendChild(c);
        PM.Shared.uploader(c, () => App.rerender());
      } else {
        $('#newTrack', host).onclick = () => { App.player.pause(); App.setTrack(null); App.rerender(); };
        renderReport(body, a, inst, App);
      }
      renderLibrary($('#lib', host), App);
    },
  });

  function renderReport(body, a, inst, App) {
    const key = a.key;
    const uniq = a.chordSummary.unique.slice(0, 8);
    const chordsForDiagrams = uniq.map((u) => u.name.split('/')[0]);
    body.innerHTML = `
      <div class="grid g3">
        <section class="card">
          <div class="card-head"><h3>${icon('key')} Key</h3>${key && key.fromFile ? '<span class="tag ok">from file</span>' : confidenceTag(key && key.confidence)}</div>
          <div class="stat-big">${key ? esc(key.name) : '—'}</div>
          ${key ? `<p class="small" style="margin-top:4px">Relative: ${esc(key.relative)}${key.alternatives ? ' · also possible: ' + esc(key.alternatives.join(', ')) : ''}</p>
          <div class="scale-notes">${key.scaleNames.map((n) => `<span>${esc(n)}</span>`).join('')}</div>` : ''}
        </section>
        <section class="card">
          <div class="card-head"><h3>${icon('metronome')} Tempo</h3>${a.tempo.fromFile ? '<span class="tag ok">from file</span>' : confidenceTag(Math.min(1, a.tempo.confidence * 2))}</div>
          <div class="stat-big">${Math.round(a.tempo.bpm)}<small>BPM</small></div>
          <p class="small" style="margin-top:4px">${a.tempo.bpm < 76 ? 'Slow (adagio–andante)' : a.tempo.bpm < 110 ? 'Moderate (andante–moderato)' : a.tempo.bpm < 140 ? 'Lively (allegro)' : 'Fast (vivace–presto)'} · ${a.beats.length} beats tracked</p>
          <button class="btn sm ghost" style="margin-top:12px" id="toMetro">${icon('metronome')} Send to metronome</button>
        </section>
        <section class="card">
          <div class="card-head"><h3>${icon('bolt')} Time signature</h3>${a.meter.fromFile ? '<span class="tag ok">from file</span>' : confidenceTag(a.meter.confidence)}</div>
          <div class="stat-big">${esc(a.meter.label)}</div>
          <p class="small" style="margin-top:4px">${a.meter.compound ? 'Compound meter — each beat divides into three' : 'Simple meter — each beat divides into two'} · ${a.downbeats.length} bars</p>
        </section>
      </div>

      <section class="card" style="margin-top:18px">
        <div class="card-head"><h3>${icon('music')} Chord progression</h3><span class="muted small">${a.chordSummary.changes} chord changes</span></div>
        <div class="notice" style="margin-bottom:14px">${icon('loop')}<div><b>Main loop:</b> ${esc(a.chordSummary.loop || '—')}${key ? ` &nbsp;·&nbsp; <span class="muted">${esc(loopRoman(a))}</span>` : ''}</div></div>
        <div class="prog">${uniq.map((u) => `<div class="prog-chord"><b>${esc(u.name)}</b><span>${esc(u.roman || '')}</span><div class="share"><i style="width:${Math.round(u.share * 100)}%"></i></div></div>`).join('')}</div>
        ${instrumentSection(a, inst, uniq, chordsForDiagrams, key)}
        <h3 style="margin:20px 0 10px">Chord timeline</h3>
        <div class="chord-strip">${a.chords.filter((c) => c.name !== 'N').map((c) => `<div class="cs ${c.fn}" title="${UI.fmtTime(c.start)}">${esc(c.name)}<i>${UI.fmtTime(c.start)} · ${c.beats}b</i></div>`).join('')}</div>
        <div class="legend" style="margin-top:10px"><span><i style="background:var(--v-600)"></i>Tonic</span><span><i style="background:#60a5fa"></i>Subdominant</span><span><i style="background:var(--fuchsia)"></i>Dominant</span><span><i style="background:var(--v-300)"></i>Chromatic</span></div>
      </section>

      ${a.strum && PM.Instruments.get(inst).strum ? `
      <section class="card" style="margin-top:18px">
        <div class="card-head"><h3>${icon('hand')} Strumming pattern</h3><span class="tag">${esc(a.strum.gridLabel)} · ${a.strum.barCount} bars</span></div>
        <div class="row" style="align-items:flex-end;gap:18px"><div class="stat-big mono" style="font-size:30px">${esc(a.strum.patternText.replace(/-/g, '·'))}</div>
        <p class="small">${Math.round(a.strum.consistency * 100)}% of bars follow this pattern.</p></div>
        ${UI.strumLaneHtml(a.strum)}
        <p class="small" style="margin-top:10px">↓ down-strum · ↑ up-strum · ✕ muted “chuck” · highlighted = accented. Keep your hand moving down on beats and up on the “&”s, even where you skip a strum.</p>
        ${a.strum.variations.length > 1 ? `<h3 style="margin:16px 0 8px">Variations</h3><div class="stack">${a.strum.variations.slice(1).map((v) => `<div class="row"><span class="mono" style="font-weight:700">${esc(v.pattern.join(' ').replace(/-/g, '·'))}</span><span class="muted small">${v.bars} bar${v.bars > 1 ? 's' : ''}</span></div>`).join('')}</div>` : ''}
      </section>` : ''}

      <section class="card" style="margin-top:18px">
        <div class="card-head"><h3>${icon('wave')} Dynamics</h3><span class="tag">overall ${esc(a.dynamics.overall)} · range ${Math.round(a.dynamics.rangeDb)} dB</span></div>
        <canvas class="dyn-chart" id="dyn"></canvas>
        <div class="row" style="margin-top:10px">${a.dynamics.sections.slice(0, 14).map((s) => `<span class="chip"><b>${esc(s.mark)}</b> ${UI.fmtTime(s.start)}</span>`).join('')}</div>
        ${a.dynamics.events.length ? `<p class="small" style="margin-top:10px">${a.dynamics.events.slice(0, 6).map((e) => `${e.type === 'crescendo' ? '⬈ Crescendo' : '⬊ Decrescendo'} at ${UI.fmtTime(e.start)} (${e.change > 0 ? '+' : ''}${Math.round(e.change)} dB)`).join(' · ')}</p>` : ''}
      </section>

      <section class="card" style="margin-top:18px">
        <div class="card-head"><h3>${icon('sparkle')} Practice plan from your coach</h3></div>
        <ol style="color:var(--ink-2);line-height:1.8;margin:0;padding-left:20px">${practicePlan(a, inst).map((s) => `<li>${s}</li>`).join('')}</ol>
      </section>`;
    UI.dynamicsChart($('#dyn', body), a.dynamics, a.duration);
    $('#toMetro', body).onclick = () => {
      const m = App.metronome;
      m.setBpm(a.meter.compound ? a.tempo.bpm * 3 : a.tempo.bpm);
      m.beatsPerBar = a.meter.beatsPerBar; m.beatUnit = a.meter.beatUnit;
      UI.toast(`Metronome set to ${Math.round(m.bpm)} BPM, ${a.meter.label}`, { icon: '⏱️' });
      App.go('metronome');
    };
  }

  function writtenKey(key) {
    if (!key) return '';
    const k = Theory.keyInfo(Theory.mod12(key.tonic + 2), key.mode);
    return k.name;
  }

  function instrumentSection(a, inst, uniq, chordsForDiagrams, key) {
    const I = PM.Instruments.get(inst);
    const pf = key && key.preferFlat;
    if (I.chordal && I.strings) return `<h3 style="margin:20px 0 10px">Chord shapes</h3><div class="diagrams">${chordsForDiagrams.map((n) => UI.chordDiagram(n)).join('')}</div>`;
    if (I.id === 'piano') return `<h3 style="margin:20px 0 10px">Voicings</h3><div class="diagrams">${uniq.map((u) => `<div class="prog-chord"><b style="font-size:16px">${esc(u.name)}</b><span>${Theory.chordPcs(u.root, u.type).map((p) => Theory.spell(p, pf)).join(' · ')}</span></div>`).join('')}</div>`;
    if (I.id === 'bass') {
      return `<h3 style="margin:20px 0 10px">Bass roots & positions</h3><div class="diagrams">${uniq.map((u) => {
        const r = u.root;
        const pos = PM.Instruments.fretPosition('bass', 28 + Theory.mod12(r - 4));
        const fifth = Theory.spell(r + 7, pf);
        return `<div class="prog-chord"><b style="font-size:16px">${esc(u.name)}</b><span>root ${Theory.spell(r, pf)} · ${pos ? I.stringNames[pos.string] + ' string ' + (pos.fret ? 'fret ' + pos.fret : 'open') : ''}</span><div class="muted small">5th ${fifth}</div></div>`;
      }).join('')}</div>${a.part && a.part.notes ? `<p class="small" style="margin-top:10px">Bass line: ${a.part.notes.slice(0, 24).map((n) => PM.DSP.midiName(n.midi)).join(' ')}${a.part.notes.length > 24 ? ' …' : ''}</p>` : ''}`;
    }
    // trumpet: written pitches
    return `<h3 style="margin:20px 0 10px">For B♭ trumpet (written pitch)</h3>
      <div class="notice" style="margin-bottom:10px">${icon('info')}<div>Concert key <b>${esc(key ? key.name : '—')}</b> → written key <b>${esc(writtenKey(key))}</b>. Every note is written a whole step higher than it sounds.</div></div>
      <div class="diagrams">${uniq.map((u) => `<div class="prog-chord"><b style="font-size:16px">${esc(Theory.chordName(Theory.mod12(u.root + 2), u.type, false))}</b><span>${Theory.chordPcs(u.root, u.type).map((p) => Theory.spell(p + 2)).join(' · ')}</span><div class="muted small">concert ${esc(u.name)}</div></div>`).join('')}</div>
      ${a.part && a.part.notes ? `<p class="small" style="margin-top:10px">Melody (written): ${a.part.notes.slice(0, 24).map((n) => { const t = PM.Instruments.trumpetInfo(n.midi); return PM.DSP.midiName(t.written) + (t.valves ? '<sub>' + (t.valves === '0' ? 'o' : t.valves.replace(/ /g, '')) + '</sub>' : ''); }).join(' ')}</p>` : ''}`;
  }

  function loopRoman(a) {
    const names = (a.chordSummary.loop || '').split(' → ');
    return names.map((n) => { const c = a.chords.find((x) => x.name === n); return c ? c.roman : '?'; }).join(' – ');
  }

  function practicePlan(a, inst) {
    const steps = [];
    const uniq = a.chordSummary.unique.map((u) => u.name);
    const slow = Math.max(50, Math.round(a.tempo.bpm * 0.7));
    steps.push(`Warm up with the <b>${esc(a.key ? a.key.name : '')}</b> scale${a.key ? ` (${esc(a.key.scaleNames.join(' '))})` : ''} for 2 minutes.`);
    if (uniq.length) steps.push(`Learn the ${uniq.length} chord${uniq.length > 1 ? 's' : ''}: <b>${esc(uniq.slice(0, 6).join(', '))}</b>. ${PM.Instruments.get(inst).chordal ? (PM.Instruments.get(inst).strings ? 'Check each string rings clearly.' : 'Play each one hands together, then in inversions.') : PM.Instruments.get(inst).id === 'bass' ? 'Find each root on the E and A strings.' : 'Learn the arpeggio (root, 3rd, 5th) of each one.'}`);
    if (a.chordSummary.loop) steps.push(`Drill the main loop <b>${esc(a.chordSummary.loop)}</b> with the metronome at <b>${slow} BPM</b> (70%).`);
    if (inst === 'bass') steps.push('Play roots on beat 1 of every bar with the drums only (Studio → Drums & bass only), then add the 5th and octave.');
    if (inst === 'trumpet') steps.push(`Remember: the song is in concert ${esc(a.key ? a.key.name : '')} — on B♭ trumpet you read it in <b>${esc(writtenKey(a.key))}</b>. Do 5 minutes of long tones first.`);
    steps.push('Try <b>Improvise</b> mode in the Studio with the backing track (no ' + esc(PM.Instruments.get(inst).short.toLowerCase()) + ') to create your own solo.');
    if (a.strum && PM.Instruments.get(inst).strum) steps.push(`Mute the strings and practise the strumming pattern <b class="mono">${esc(a.strum.patternText)}</b> until it feels automatic, then add the chords.`);
    if (a.meter.beatsPerBar === 3 || a.meter.compound) steps.push(`It's in <b>${esc(a.meter.label)}</b> — count the bar out loud to feel the ${a.meter.compound ? 'lilting triple subdivision' : 'waltz pulse'}.`);
    const ev = a.dynamics.events;
    if (ev.length) steps.push(`Shape your volume with the song: ${ev.length === 1 ? `there's a ${ev[0].type} at ${UI.fmtTime(ev[0].start)}` : `it has ${ev.length} crescendos/decrescendos`} — follow the dynamics chart above.`);
    steps.push('Play along in the Studio at 75% speed, then 90%, then full tempo. Aim for 3 stars!');
    return steps;
  }

  async function renderLibrary(container, App) {
    const items = await PM.Audio.Library.list();
    if (!items.length) { container.innerHTML = '<div class="empty">Songs you analyse are saved here so you can practise them offline anytime.</div>'; return; }
    container.innerHTML = `<div class="list">${items.map((it) => `
      <div class="list-item" data-id="${esc(it.id)}">
        <div class="li-ic">${icon(it.kind === 'midi' ? 'midi' : 'music')}</div>
        <div class="li-main"><b>${esc(it.name)}</b><span>${it.analysis.key ? esc(it.analysis.key.name) + ' · ' : ''}${Math.round(it.analysis.tempo.bpm)} BPM · ${esc(it.analysis.meter.label)} · ${UI.fmtTime(it.analysis.duration)} · ${PM.Instruments.get(it.instrument).emoji}</span></div>
        <button class="btn sm" data-open>${icon('play')} Open</button>
        <button class="btn sm ghost icon" data-del title="Delete">${icon('trash')}</button>
      </div>`).join('')}</div>`;
    $$('[data-open]', container).forEach((b) => b.addEventListener('click', async () => {
      const it = items.find((x) => x.id === b.closest('[data-id]').dataset.id);
      b.disabled = true;
      await App.openFromLibrary(it);
      UI.toast(`Loaded “${it.name}”`, { icon: '📂' });
      App.rerender();
    }));
    $$('[data-del]', container).forEach((b) => b.addEventListener('click', async () => {
      const id = b.closest('[data-id]').dataset.id;
      await PM.Audio.Library.remove(id);
      if (App.track && App.track.id === id) App.setTrack(null);
      renderLibrary(container, App);
    }));
  }
})(typeof self !== 'undefined' ? self : globalThis);
