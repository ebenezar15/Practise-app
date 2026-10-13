/* Overture — Fingering guide panel: a piano roll plus the instrument view (fretboard,
 * keyboard or valves) showing which finger / string / fret / valves to use for each note,
 * with alternative fingerings to choose from and "other places to play this note".
 * Used in Practice (exercise play-along) and the Play-Along studio. */
(function (root) {
  'use strict';
  const PM = root.PM;
  const { UI, Theory, DSP } = PM;
  const { esc, $, $$ } = UI;
  const FCOL = ['#94a3b8', '#f43f5e', '#f59e0b', '#10b981', '#3b82f6', '#a855f7']; // 0 open … 5 pinky
  const FNAME = ['open', 'index', 'middle', 'ring', 'pinky', 'pinky'];
  const PIANO_NAME = ['', 'thumb', 'index', 'middle', 'ring', 'little'];

  /**
   * opts: {inst, notes:[midi] (concert), beats?:[len], starts?:[sec], durs?:[sec], window?:n, title?}
   * returns {setCurrent(i), current(), el, destroy()}
   */
  function mount(box, opts) {
    const inst = opts.inst, I = PM.Instruments.get(inst);
    const notes = opts.notes || [];
    const kind = I.strings ? 'fret' : I.family === 'keys' ? 'piano' : I.family === 'brass' ? 'valves' : 'none';
    if (kind === 'none' || !notes.length) { box.innerHTML = ''; return { setCurrent() {}, current: () => 0, el: box, destroy() {} }; }
    const tr = I.transpose || 0;
    // timeline in "units": beats or seconds
    let starts = opts.starts, durs = opts.durs;
    if (!starts) { let b = 0; starts = []; durs = []; (opts.beats || notes.map(() => 1)).forEach((d) => { starts.push(b); durs.push(d); b += d; }); }
    const WIN = opts.window || 12;
    const st = { hand: opts.hand === 'L' ? 'L' : 'R', opt: 0, view: 'both', cur: 0 };
    let fing = compute();
    let fb = null;
    if (!fing.length) {
      const low = I.strings && Math.min(...notes) < I.strings[0];
      box.innerHTML = `<div class="notice">🎸<div>${low && I.id === 'bass' ? 'Some of these notes are below your lowest string. Choose a <b>5-string bass</b> (low B) to see the fingering.' : 'These notes are outside your instrument’s range.'}</div>${low && I.id === 'bass' ? '<button class="btn sm primary" data-bs5>Use a 5-string bass</button>' : ''}</div>`;
      const b5 = box.querySelector('[data-bs5]');
      if (b5) b5.onclick = () => { PM.App.settings.bassStrings = 5; PM.App.saveSettings(); PM.Instruments.setBassStrings(5); PM.App.rerender(); };
      return { setCurrent() {}, current: () => 0, el: box, destroy() { box.innerHTML = ''; } };
    }

    function compute() {
      if (kind === 'piano') return PM.Fingering.piano(notes, st.hand);
      if (kind === 'fret') return PM.Fingering.fretted(notes, I);
      return [{ id: 'best', label: 'Standard', per: notes.map((m) => PM.Fingering.trumpet(m)) }];
    }
    const chosen = () => fing[Math.min(st.opt, fing.length - 1)] || fing[0];
    const nm = (m) => Theory.spell(m + tr) + (Math.floor((m + tr) / 12) - 1);
    const strName = (s) => (I.stringNames[s] === 'e' ? 'high e' : I.stringNames[s]) + ' string';

    function labelOf(i) {
      const c = chosen();
      if (!c) return '';
      if (kind === 'piano') return String(c.fingers[i]);
      if (kind === 'fret') { const p = c.path[i]; return p.fret === 0 ? '0' : String(p.finger); }
      const v = c.per[i][0]; return v ? (v.valves === '0' ? 'o' : v.valves.replace(/ /g, '')) : '–';
    }
    function colorOf(i) {
      const c = chosen();
      if (kind === 'piano') return FCOL[c.fingers[i]];
      if (kind === 'fret') return FCOL[c.path[i].finger];
      return PM.UI.col('v-500');
    }

    box.innerHTML = `<div class="fp">
      <div class="fp-head">${opts.title === false ? '<span></span>' : `<b class="fp-title">🖐️ ${esc(opts.title || 'Fingering guide')}</b>`}
        ${kind === 'piano' ? `<div class="seg fp-hand">${[['R', 'Right hand'], ['L', 'Left hand']].map(([k, l]) => `<button data-h="${k}" class="${st.hand === k ? 'on' : ''}">${l}</button>`).join('')}</div>` : ''}
        <div class="seg fp-view">${[['both', 'Both'], ['roll', 'Piano roll'], ['inst', kind === 'fret' ? 'Fretboard' : kind === 'piano' ? 'Keyboard' : 'Valves']].map(([k, l]) => `<button data-v="${k}" class="${st.view === k ? 'on' : ''}">${l}</button>`).join('')}</div>
      </div>
      <div class="fp-opts" role="radiogroup" aria-label="Fingering options"></div>
      <div class="fp-vis"><div class="fp-rollbox"></div><div class="fp-instbox"></div></div>
      <div class="fp-step">
        <button class="btn sm glass icon" data-step="-1" aria-label="Previous note">‹</button>
        <div class="fp-now" aria-live="polite"></div>
        <button class="btn sm glass icon" data-step="1" aria-label="Next note">›</button>
      </div>
      <div class="fp-alt"></div>
      ${kind !== 'valves' ? `<div class="fp-legend small">${(kind === 'piano' ? [1, 2, 3, 4, 5] : [0, 1, 2, 3, 4]).map((f) => `<span><i style="background:${FCOL[f]}"></i>${kind === 'piano' ? f + ' ' + PIANO_NAME[f] : f ? f + ' ' + FNAME[f] : '0 open'}</span>`).join('')}</div>` : ''}
    </div>`;
    const el = $('.fp', box), rollBox = $('.fp-rollbox', el), vis = $('.fp-instbox', el);

    function drawOpts() {
      $('.fp-opts', el).innerHTML = fing.length > 1 ? fing.map((o, i) => `<button class="chip ${i === st.opt ? 'on' : ''}" role="radio" aria-checked="${i === st.opt}" data-o="${i}">${i === 0 ? '⭐ ' : ''}${esc(o.label)}</button>`).join('') : `<span class="small muted">${kind === 'valves' ? 'Standard valves — tap a note to see alternates' : 'One sensible fingering for this line'}</span>`;
      $$('.fp-opts [data-o]', el).forEach((b) => (b.onclick = () => { st.opt = +b.dataset.o; drawOpts(); draw(); }));
    }

    // ---------- piano roll (SVG, windowed around the current note)
    function windowRange() {
      let a = Math.max(0, st.cur - Math.floor(WIN / 3)), b = Math.min(notes.length, a + WIN);
      a = Math.max(0, b - WIN);
      return [a, b];
    }
    function drawRoll() {
      const [a, b] = windowRange();
      const seg = notes.slice(a, b);
      const lo = Math.min(...seg) - 2, hi = Math.max(...seg) + 2;
      const W = 640, H = Math.max(150, Math.min(240, (hi - lo + 1) * 10)), left = 34;
      const t0 = starts[a], t1 = Math.max(starts[b - 1] + durs[b - 1], t0 + 0.001);
      const xOf = (t) => left + 6 + ((t - t0) / (t1 - t0)) * (W - left - 14);
      const rh = (H - 10) / (hi - lo + 1), yOf = (m) => 5 + (hi - m) * rh;
      let s = `<svg class="fp-roll" viewBox="0 0 ${W} ${H}" role="img" aria-label="Piano roll">`;
      for (let m = lo; m <= hi; m++) {
        const y = yOf(m), blk = PM.Fingering.isBlack(m + tr);
        s += `<rect x="0" y="${y}" width="${left}" height="${rh}" fill="${blk ? PM.UI.col('v-850') : PM.UI.col('v-50')}" stroke="${PM.UI.col('v-300')}" stroke-width=".4"/>`;
        s += `<rect x="${left}" y="${y}" width="${W - left}" height="${rh}" fill="${blk ? 'rgba(255,255,255,.03)' : 'rgba(255,255,255,.07)'}"/>`;
        if ((m + tr) % 12 === 0 || m === lo + 2) s += `<text x="${left - 3}" y="${y + rh - 2}" font-size="${Math.min(9, rh)}" text-anchor="end" fill="${blk ? '#fff' : '#5b21b6'}" font-weight="700">${nm(m)}</text>`;
      }
      for (let i = a; i < b; i++) {
        const x = xOf(starts[i]), w = Math.max(16, xOf(starts[i] + durs[i]) - x - 3), y = yOf(notes[i]);
        const on = i === st.cur, col = colorOf(i), lab = labelOf(i);
        s += `<g class="fp-n${on ? ' on' : ''}" data-i="${i}" tabindex="0" role="button" aria-label="${esc(nm(notes[i]))} ${kind === 'piano' ? 'finger ' + lab : kind === 'fret' ? describe(i) : 'valves ' + lab}">
          <rect x="${x}" y="${y - 1}" width="${w}" height="${rh + 2}" rx="${Math.min(6, rh / 2 + 1)}" fill="${on ? PM.UI.col('pink') : PM.UI.rgba('soft', .85)}" ${on ? 'stroke="#fff" stroke-width="2"' : ''}/>
          <circle cx="${x + 9}" cy="${y + rh / 2}" r="${Math.max(7, Math.min(9, rh / 2 + 3))}" fill="${col}"/>
          <text x="${x + 9}" y="${y + rh / 2 + 3.5}" font-size="10" text-anchor="middle" fill="#fff" font-weight="800">${esc(lab)}</text>
          ${w > 44 ? `<text x="${x + 21}" y="${y + rh / 2 + 3.5}" font-size="9.5" fill="#2a0f5c" font-weight="700">${esc(kind === 'fret' ? stringFret(i) : Theory.spell(notes[i] + tr))}</text>` : ''}</g>`;
      }
      s += '</svg>';
      rollBox.innerHTML = s;
      $$('.fp-n', rollBox).forEach((g) => { g.onclick = () => select(+g.dataset.i, true); g.onkeydown = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); select(+g.dataset.i, true); } }; });
    }
    const stringFret = (i) => { const p = chosen().path[i]; return `${I.stringNames[p.string]}${p.fret}`; };
    const describe = (i) => { const p = chosen().path[i]; return p.fret === 0 ? `open ${strName(p.string)}` : `${strName(p.string)}, fret ${p.fret}, finger ${p.finger}`; };

    // ---------- fretboard view
    function drawFret() {
      const [a, b] = windowRange();
      if (!fb) { vis.innerHTML = '<div class="fret-wrap fp-fret"></div>'; fb = new UI.Fretboard($('.fp-fret', vis), { strings: I.strings, names: I.stringNames, frets: I.frets || 15 }); }
      const c = chosen();
      let html = '';
      const seen = new Map();
      for (let i = a; i < b; i++) { const p = c.path[i], k = p.string + ':' + p.fret; if (!seen.has(k) || i === st.cur) seen.set(k, i); }
      // alternatives for the current note
      const cp = c.path[st.cur];
      for (const p of PM.Fingering.positions(notes[st.cur], I.strings, I.frets || 15)) {
        if (p.string === cp.string && p.fret === cp.fret) continue;
        const x = fb.xOf(p.fret), y = fb.yOf(p.string);
        html += `<circle cx="${x}" cy="${y}" r="11" fill="${PM.UI.rgba('accent2', .12)}" stroke="${PM.UI.col('pink')}" stroke-width="2" stroke-dasharray="4 3"/><text x="${x}" y="${y + 3.5}" text-anchor="middle" font-size="9" font-weight="800" fill="${PM.UI.col('pink')}">alt</text>`;
      }
      for (const [k, i] of seen) {
        const p = c.path[i], x = fb.xOf(p.fret), y = fb.yOf(p.string), on = i === st.cur;
        const col = FCOL[p.finger];
        html += `<g class="fp-dot" data-i="${i}" style="cursor:pointer"><circle cx="${x}" cy="${y}" r="${on ? 14 : 10}" fill="${p.fret === 0 ? 'none' : col}" stroke="${on ? '#fff' : col}" stroke-width="${p.fret === 0 ? 3 : on ? 3 : 0}" ${on ? 'style="filter:drop-shadow(0 0 10px var(--pink))"' : `opacity="${0.75}"`}/>
          <text x="${x}" y="${y + 4}" text-anchor="middle" font-size="${on ? 12 : 10}" font-weight="800" fill="#fff">${p.fret === 0 ? 'O' : p.finger}</text></g>`;
        void k;
      }
      fb.key = ''; fb.dotLayer.innerHTML = html;
      $$('.fp-dot', vis).forEach((g) => (g.onclick = () => select(+g.dataset.i, true)));
    }

    // ---------- keyboard view (piano)
    function drawKeys() {
      const [a, b] = windowRange();
      const seg = notes.slice(a, b), c = chosen();
      let lo = Math.min(...seg) - 3, hi = Math.max(...seg) + 3;
      while (PM.Fingering.isBlack(lo)) lo--;
      while (PM.Fingering.isBlack(hi)) hi++;
      if (hi - lo < 14) hi = lo + 16 + (PM.Fingering.isBlack(lo + 16) ? 1 : 0);
      const whites = []; for (let m = lo; m <= hi; m++) if (!PM.Fingering.isBlack(m)) whites.push(m);
      const KW = 30, KH = 130, BW = 19, BH = 82, W = whites.length * KW;
      const used = new Map(); for (let i = a; i < b; i++) if (!used.has(notes[i]) || i === st.cur) used.set(notes[i], i);
      const xw = {}; whites.forEach((m, i) => (xw[m] = i * KW));
      const mark = (m, x, y, isB) => {
        if (!used.has(m)) return '';
        const i = used.get(m), on = notes[st.cur] === m, f = c.fingers[on ? st.cur : i];
        return `<circle cx="${x}" cy="${y}" r="${on ? 12 : 9}" fill="${FCOL[f]}" ${on ? 'stroke="#fff" stroke-width="3" style="filter:drop-shadow(0 0 8px var(--fuchsia))"' : `opacity="${isB ? 0.9 : 0.75}"`}/><text x="${x}" y="${y + 4}" text-anchor="middle" font-size="${on ? 13 : 11}" font-weight="800" fill="#fff">${f}</text>`;
      };
      let s = `<svg class="fp-keys" viewBox="0 0 ${W} ${KH + 4}" role="img" aria-label="Keyboard with finger numbers">`;
      whites.forEach((m) => { const on = notes[st.cur] === m; s += `<rect x="${xw[m] + 0.5}" y="0.5" width="${KW - 1}" height="${KH}" rx="4" fill="${on ? PM.UI.col('v-100') : '#fff'}" stroke="${PM.UI.col('v-300')}"/>`; if ((m + tr) % 12 === 0) s += `<text x="${xw[m] + KW / 2}" y="${KH - 6}" font-size="9" text-anchor="middle" fill="#8a7fa8" font-weight="700">C${(m + tr) / 12 - 1}</text>`; });
      for (let m = lo; m <= hi; m++) if (PM.Fingering.isBlack(m)) { const x = xw[m - 1] + KW - BW / 2; const on = notes[st.cur] === m; s += `<rect x="${x}" y="0" width="${BW}" height="${BH}" rx="3" fill="${on ? '#a21caf' : '#1f0b44'}"/>`; }
      whites.forEach((m) => (s += mark(m, xw[m] + KW / 2, KH - 30, false)));
      for (let m = lo; m <= hi; m++) if (PM.Fingering.isBlack(m)) s += mark(m, xw[m - 1] + KW, BH - 18, true);
      s += '</svg>';
      vis.innerHTML = `<div class="fp-hand-tag small">${st.hand === 'R' ? '🫱 Right hand' : '🫲 Left hand'} · 1 = thumb</div>${s}`;
    }

    // ---------- valves view (trumpet)
    function drawValves() {
      const per = chosen().per[st.cur] || [];
      const main = per[0];
      const valve = (v, down) => `<div class="fp-valve ${down ? 'down' : ''}"><i></i><span>${v}</span></div>`;
      const set = (vv) => { const d = vv && vv !== '0' ? vv.split(' ').map(Number) : []; return [1, 2, 3].map((v) => valve(v, d.includes(v))).join(''); };
      vis.innerHTML = main ? `<div class="fp-valves"><div class="fp-vmain"><div class="now-label">Written ${esc(DSP.midiName(main.written))} · concert ${esc(DSP.midiName(notes[st.cur]))}</div><div class="fp-vrow">${set(main.valves)}</div><b>${main.valves === '0' ? 'Open (no valves)' : 'Valves ' + main.valves.replace(/ /g, '-')}</b></div>
        ${per.length > 1 ? `<div class="fp-valts">${per.slice(1).map((o) => `<div class="fp-valt"><div class="fp-vrow sm">${set(o.valves)}</div><div><b>Alternate: ${o.valves === '0' ? 'open' : o.valves.replace(/ /g, '-')}</b><div class="small">${esc(o.why)}</div></div></div>`).join('')}</div>` : '<div class="small muted">No common alternate for this note.</div>'}</div>` : '<p class="small muted">This note is outside the trumpet’s normal range.</p>';
    }

    function drawNow() {
      const i = st.cur, c = chosen();
      let txt = `<b>${i + 1}/${notes.length}</b> · <b>${esc(nm(notes[i]))}</b>${tr ? ' <span class="small">(written)</span>' : ''} · `;
      let alt = '';
      if (kind === 'piano') {
        txt += `finger <b style="color:${FCOL[c.fingers[i]]}">${c.fingers[i]}</b> (${PIANO_NAME[c.fingers[i]]})${c.hints[i] ? ' · <i>' + esc(c.hints[i]) + '</i>' : ''}`;
        const others = fing.map((o, k) => (k !== st.opt ? o.fingers[i] : null)).filter((f, k, arr) => f != null && f !== c.fingers[i] && arr.indexOf(f) === k);
        alt = others.length ? `Alternative finger${others.length > 1 ? 's' : ''} here: ${others.map((f) => `<span class="chip">${f} · ${PIANO_NAME[f]}</span>`).join(' ')}` : '';
      } else if (kind === 'fret') {
        const p = c.path[i];
        txt += p.fret === 0 ? `<b>open ${esc(strName(p.string))}</b>` : `${esc(strName(p.string))}, fret <b>${p.fret}</b>, finger <b style="color:${FCOL[p.finger]}">${p.finger}</b> (${FNAME[p.finger]})`;
        if (c.hints[i] && c.hints[i] !== 'open string') txt += ` · <i>${esc(c.hints[i])}</i>`;
        const ps = PM.Fingering.positions(notes[i], I.strings, I.frets || 15).filter((q) => !(q.string === p.string && q.fret === p.fret));
        alt = ps.length ? `Same note elsewhere: ${ps.map((q) => `<span class="chip">${esc(I.stringNames[q.string])} string · ${q.fret ? 'fret ' + q.fret : 'open'}</span>`).join(' ')}` : 'Only one place to play this note.';
      } else {
        const per = c.per[i] || [];
        txt += per[0] ? (per[0].valves === '0' ? '<b>open</b>' : `valves <b>${per[0].valves.replace(/ /g, '-')}</b>`) : 'out of range';
        alt = per.length > 1 ? `Alternate: ${per.slice(1).map((o) => `<span class="chip">${o.valves.replace(/ /g, '-')}</span>`).join(' ')}` : '';
      }
      $('.fp-now', el).innerHTML = txt;
      $('.fp-alt', el).innerHTML = alt ? `<span class="small">${alt}</span>` : '';
    }

    function draw() {
      rollBox.hidden = st.view === 'inst';
      vis.hidden = st.view === 'roll';
      if (st.view !== 'inst') drawRoll();
      if (st.view !== 'roll') { if (kind === 'fret') drawFret(); else if (kind === 'piano') drawKeys(); else drawValves(); }
      drawNow();
    }
    function select(i, hear) {
      st.cur = Math.max(0, Math.min(notes.length - 1, i));
      draw();
      if (hear && PM.LearnView && PM.LearnView.playNotes) { try { PM.LearnView.playNotes([{ midi: notes[st.cur], start: 0, dur: 0.6 }], { voice: I.synth }); } catch (e) { /* audio blocked */ } }
    }

    $$('.fp-hand [data-h]', el).forEach((b) => (b.onclick = () => { st.hand = b.dataset.h; st.opt = 0; fing = compute(); $$('.fp-hand [data-h]', el).forEach((x) => x.classList.toggle('on', x === b)); drawOpts(); draw(); }));
    $$('.fp-view [data-v]', el).forEach((b) => (b.onclick = () => { st.view = b.dataset.v; $$('.fp-view [data-v]', el).forEach((x) => x.classList.toggle('on', x === b)); draw(); }));
    $$('[data-step]', el).forEach((b) => (b.onclick = () => select(st.cur + +b.dataset.step, true)));
    drawOpts(); draw();

    return {
      el,
      current: () => st.cur,
      setCurrent(i) { if (i == null || i < 0 || i === st.cur || i >= notes.length) return; st.cur = i; draw(); },
      destroy() { box.innerHTML = ''; },
    };
  }

  /** Index of the note sounding at time t (seconds) in sorted starts. */
  function indexAt(starts, t) {
    let lo = 0, hi = starts.length - 1, ans = -1;
    while (lo <= hi) { const mid = (lo + hi) >> 1; if (starts[mid] <= t + 0.03) { ans = mid; lo = mid + 1; } else hi = mid - 1; }
    return ans;
  }

  PM.FingerPanel = { mount, indexAt, FCOL };
})(typeof self !== 'undefined' ? self : globalThis);
