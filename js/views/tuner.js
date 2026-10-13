/* Cadenza — chromatic tuner with guitar string targets and reference tones. */
(function (root) {
  'use strict';
  const PM = root.PM;
  const { UI, DSP } = PM;
  const { icon, esc, $, $$ } = UI;


  function dial(cents) {
    const W = 520, H = 280, cx = W / 2, cy = H - 20, R = 220;
    let ticks = '';
    for (let c = -50; c <= 50; c += 5) {
      const ang = (c / 50) * (Math.PI / 2.4) - Math.PI / 2;
      const r0 = c % 25 === 0 ? R - 28 : c % 10 === 0 ? R - 20 : R - 12;
      ticks += `<line x1="${cx + Math.cos(ang) * r0}" y1="${cy + Math.sin(ang) * r0}" x2="${cx + Math.cos(ang) * R}" y2="${cy + Math.sin(ang) * R}" stroke="${Math.abs(c) <= 5 ? '#34d399' : 'rgba(196,181,253,0.55)'}" stroke-width="${c % 25 === 0 ? 3 : 1.6}" stroke-linecap="round"/>`;
      if (c % 25 === 0) ticks += `<text x="${cx + Math.cos(ang) * (R - 44)}" y="${cy + Math.sin(ang) * (R - 44) + 4}" text-anchor="middle" font-size="12" fill="#a78bfa" font-weight="700">${c > 0 ? '+' + c : c}</text>`;
    }
    const a0 = -Math.PI / 2 - Math.PI / 2.4, a1 = -Math.PI / 2 + Math.PI / 2.4;
    const arc = (r) => `M ${cx + Math.cos(a0) * r} ${cy + Math.sin(a0) * r} A ${r} ${r} 0 0 1 ${cx + Math.cos(a1) * r} ${cy + Math.sin(a1) * r}`;
    return `<svg viewBox="0 0 ${W} ${H}" style="width:100%;display:block">
      <defs><linearGradient id="tg" x1="0" x2="1"><stop offset="0" stop-color="#f43f5e"/><stop offset=".42" stop-color="#a855f7"/><stop offset=".5" stop-color="#34d399"/><stop offset=".58" stop-color="#a855f7"/><stop offset="1" stop-color="#f43f5e"/></linearGradient>
      <filter id="glow" filterUnits="userSpaceOnUse" x="0" y="0" width="${W}" height="${H}"><feGaussianBlur stdDeviation="4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
      <path d="${arc(R + 14)}" fill="none" stroke="url(#tg)" stroke-width="6" stroke-linecap="round" opacity=".85"/>
      ${ticks}
      <g id="needle" style="transform-origin:${cx}px ${cy}px;transition:transform .12s ease-out;transform:rotate(${(Math.max(-50, Math.min(50, cents || 0)) / 50) * 75}deg)">
        <line x1="${cx}" y1="${cy}" x2="${cx}" y2="${cy - R + 6}" stroke="#fff" stroke-width="4" stroke-linecap="round" filter="url(#glow)"/>
      </g>
      <circle cx="${cx}" cy="${cy}" r="12" fill="#d946ef" filter="url(#glow)"/>
    </svg>`;
  }

  PM.App.register({
    id: 'tuner', title: 'Tuner', icon: 'tuner',
    render(host, App) {
      const inst = App.instrument;
      const I = PM.Instruments.get(inst);
      const fretted = !!I.strings;
      const STRINGS = fretted ? I.strings.map((m, i) => ({ n: I.stringNames[i], m })) : [];
      const tr = I.transpose || 0;
      let a4 = 440, target = null;
      host.innerHTML = `
        <div class="page-head"><div><div class="eyebrow">Tuner</div><h1>${fretted ? 'Tune your ' + esc(I.label.toLowerCase()) : I.family === 'brass' ? 'Trumpet tuner' : I.family === 'voice' ? 'Sing in tune' : 'Check your pitch'}</h1><p>A precise chromatic tuner running on-device. ${fretted ? 'Pluck one string at a time — Cadenza finds the nearest string automatically, or pick one.' : I.family === 'brass' ? 'Notes are shown at <b>written pitch</b> for B♭ trumpet (concert pitch underneath). Tune on written C (concert B♭), then adjust the main slide.' : I.family === 'voice' ? 'Play a reference tone, then sing it on "ah" and hold it — try to keep the needle in the green for 3 seconds. Great for pitch-matching practice.' : 'Digital pianos are always in tune — use this to check an acoustic piano, your voice, or another instrument.'}</p></div></div>
        <div class="tuner">
          <section class="card stage">
            <div class="tuner-dial" id="dial">${dial(0)}</div>
            <div class="tuner-note" id="note"><b id="nName">—</b><sub id="nOct"></sub><div class="cents" id="nCents">play a note</div></div>
            <div class="row" style="justify-content:center;margin-top:18px">
              <button class="btn white" id="tunerBtn">${icon('mic')} Start tuner</button>
              <span class="muted small" id="freq"></span>
            </div>
          </section>
          <section class="card">
            ${fretted ? `<div class="card-head"><h3>${icon(I.icon)} Standard tuning</h3><span class="tag" id="mode">auto</span></div>
            <div class="strings" style="grid-template-columns:repeat(${STRINGS.length},1fr)">${STRINGS.map((s, i) => `<button class="string-btn" data-i="${i}">${s.n}<small>${DSP.midiName(s.m)}</small></button>`).join('')}</div>
            <p class="small" style="margin-top:10px">Tap a string to lock the target, tap again for auto. Strings turn green once they're in tune.</p>` : ''}
            <div class="card-head" style="margin-top:${fretted ? 20 : 0}px"><h3>${icon('sliders')} Reference</h3></div>
            <label class="field"><span>Concert pitch A4 = <b id="a4v">440</b> Hz</span><input type="range" id="a4" min="430" max="450" step="1" value="440"></label>
            <div class="row" style="margin-top:14px">
              <select id="refNote">${Array.from({ length: 49 }, (_, i) => 28 + i).map((m) => `<option value="${m}" ${m === (I.family === 'brass' ? 58 : fretted ? I.strings[1] : I.family === 'voice' ? PM.Learn.RANGE.voice.start + 5 : 57) ? 'selected' : ''}>${DSP.midiName(m)}${tr ? ' (written ' + DSP.midiName(m + tr) + ')' : ''}</option>`).join('')}</select>
              <button class="btn" id="refBtn">${icon('play')} Play reference tone</button>
            </div>
            <div class="notice" style="margin-top:18px">${icon('info')}<div>${I.family === 'voice' ? 'Hear the note in your head before you sing it. If you are flat, lift the energy (not the chin); if sharp, relax the jaw and sing a little softer. Hum first if the note feels hard to find.' : I.family === 'brass' ? 'Warm up for a few minutes first — a cold horn plays flat. Pull the main slide out if you are sharp, push it in if flat.' : 'Tune <b>up</b> to the note: if you are sharp, drop below and come back up — strings hold their tuning better that way.'}</div></div>
          </section>
        </div>`;

      const tuned = new Set();
      $$('.string-btn', host).forEach((b) => (b.onclick = () => {
        const i = +b.dataset.i;
        target = target === i ? null : i;
        $$('.string-btn', host).forEach((x) => x.classList.toggle('on', +x.dataset.i === target));
        $('#mode', host).textContent = target == null ? 'auto' : 'locked ' + STRINGS[i].n;
      }));
      $('#a4', host).oninput = (e) => { a4 = +e.target.value; $('#a4v', host).textContent = a4; };
      $('#refBtn', host).onclick = () => {
        const ctx = PM.Audio.getCtx();
        const f = a4 * Math.pow(2, (+$('#refNote', host).value - 69) / 12);
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.type = 'triangle'; o.frequency.value = f;
        g.gain.setValueAtTime(0, ctx.currentTime); g.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.03); g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 2.2);
        o.connect(g).connect(ctx.destination); o.start(); o.stop(ctx.currentTime + 2.3);
      };

      const hist = [];
      let unsub = null, inTuneSince = 0;
      const btn = $('#tunerBtn', host);
      const stop = () => { if (unsub) { unsub(); unsub = null; App.live.stop(); } btn.innerHTML = `${icon('mic')} Start tuner`; };
      btn.onclick = async () => {
        if (unsub) return stop();
        App.live.instrument = inst;
        try { await App.live.start(App.settings.deviceId); } catch (e) { UI.toast('Microphone unavailable: ' + (e.message || e), { icon: '🎤' }); return; }
        btn.innerHTML = `${icon('stop')} Stop tuner`;
        unsub = App.live.on((f) => {
          if (!f.active || !f.pitch || f.pitch.confidence < 0.85) return;
          hist.push(f.pitch.freq);
          if (hist.length > 5) hist.shift();
          const freq = [...hist].sort((x, y) => x - y)[Math.floor(hist.length / 2)];
          const midiF = 69 + 12 * Math.log2(freq / a4);
          let ref = Math.round(midiF);
          let strIdx = null;
          if (fretted) {
            strIdx = target != null ? target : STRINGS.reduce((best, s, i) => (Math.abs(s.m - midiF) < Math.abs(STRINGS[best].m - midiF) ? i : best), 0);
            if (target != null || Math.abs(STRINGS[strIdx].m - midiF) < 1.5) ref = STRINGS[strIdx].m;
          }
          const cents = Math.round((midiF - ref) * 100);
          const shown = Math.max(-50, Math.min(50, cents));
          $('#needle', host).style.transform = `rotate(${(shown / 50) * 75}deg)`;
          $('#nName', host).textContent = DSP.pcName(ref + tr);
          $('#nOct', host).textContent = (Math.floor((ref + tr) / 12) - 1) + (tr ? `  (concert ${DSP.midiName(ref)})` : '');
          $('#nCents', host).textContent = Math.abs(cents) <= 4 ? 'in tune ✓' : `${cents > 0 ? '+' : ''}${cents}¢ · ${cents > 0 ? 'tune down' : 'tune up'}`;
          $('#freq', host).textContent = freq.toFixed(2) + ' Hz';
          const ok = Math.abs(cents) <= 4;
          $('#note', host).classList.toggle('in-tune', ok);
          if (fretted) {
            $$('.string-btn', host).forEach((x) => x.classList.toggle('on', +x.dataset.i === strIdx));
            if (ok && ref === STRINGS[strIdx].m) {
              if (!inTuneSince) inTuneSince = performance.now();
              if (performance.now() - inTuneSince > 700 && !tuned.has(strIdx)) {
                tuned.add(strIdx);
                $(`.string-btn[data-i="${strIdx}"]`, host).classList.add('tuned');
                UI.toast(`${STRINGS[strIdx].n} string in tune`, { icon: '✅', duration: 1500 });
                if (tuned.size === STRINGS.length) { UI.confetti(); App.game.addXp(20, 'tuned'); }
              }
            } else inTuneSince = 0;
          }
        });
      };
      return stop;
    },
  });
})(typeof self !== 'undefined' ? self : globalThis);
