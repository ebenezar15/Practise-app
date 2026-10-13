/* Overture — groove trainer UI: strumming patterns (guitar), comping (piano), bass grooves and
 * articulation / long tones (trumpet, voice) in every time signature. Plays a metronome and a
 * guide part on a chord progression with a dynamics plan (p, f, crescendo…), then listens:
 * live feedback on every strum or note (timing, strum direction, loudness against the target)
 * and a coached summary at the end. Tap mode (keys / pads) works without a microphone. */
(function (root) {
  'use strict';
  const PM = root.PM;
  const { UI } = PM;
  const { icon, esc, $, $$ } = UI;
  const G = () => PM.Groove;

  const SYM = {
    strum: { D: '↓', U: '↑', X: '✕', '-': '·', '.': '' },
    comp: { W: '■', B: 'L', C: 'R', '-': '' },
    bass: { 1: 'R', 3: '3', 5: '5', 8: '8', A: '↗', x: '✕', '-': '' },
    line: { 1: '1', 3: '3', 5: '5', 8: '8', '~': '', '-': '' },
  };
  const LEGEND = {
    strum: '↓ down · ↑ up · ✕ muted chuck · · hand keeps moving (miss the strings) · › accent',
    comp: '■ both hands · L left-hand bass · R right-hand chord · › accent',
    bass: 'R root · 3 third · 5 fifth · 8 octave · ↗ approach note · ✕ dead note · › accent',
    line: '1 3 5 8 = chord tones · bar = keep holding · › accent',
  };

  function gridHtml(p, results, now) {
    const n = p.seq.length, cnt = G().countLabels(p), sym = SYM[p.kind];
    const M = G().METERS[p.meter], mul = p.res === 16 ? 2 : 1, starts = new Set();
    let pos = 0; for (const g of M.groups) { starts.add(pos * mul); pos += g; }
    const cell = (k, inner, cls) => `<span class="gv-c ${starts.has(k) ? 'beat' : ''} ${cls || ''}" data-k="${k}">${inner}</span>`;
    let h = `<div class="gv-grid" style="--n:${n}">`;
    h += `<div class="gv-row gv-acc">${[...p.seq].map((_, k) => cell(k, p.acc && p.acc[k] === '>' ? '›' : '')).join('')}</div>`;
    h += `<div class="gv-row gv-main">${[...p.seq].map((c, k) => {
      const hold = c === '~';
      const r = results && results[k] ? 'r-' + results[k] : '';
      return cell(k, hold ? '<i class="gv-hold"></i>' : `<b class="gv-s ${c === 'U' ? 'up' : ''} ${c === 'X' || c === 'x' ? 'mute' : ''} ${c === '-' || c === '.' ? 'rest' : ''}">${esc(sym[c] != null ? sym[c] : c)}</b>`, `${r} ${k === now ? 'now' : ''}`);
    }).join('')}</div>`;
    h += `<div class="gv-row gv-cnt">${cnt.map((c, k) => cell(k, esc(c))).join('')}</div>`;
    return h + '</div>';
  }

  function mount(box, App, opts) {
    opts = opts || {};
    const inst = App.instrument, kind = opts.kind || G().kindFor(inst) || 'strum';
    const K = G().KINDS[kind];
    const st = (App.game.state.groove = App.game.state.groove || {});
    const pref = (App.settings.groove = App.settings.groove || {});
    const all = G().forKind(kind);
    let meter = pref['meter-' + kind] || 'all';
    let pat = G().PATTERN[pref['pat-' + kind]] || all[0];
    let bpm = (st[pat.id] && st[pat.id].nextBpm) || pat.bpm;
    let prog = pref.prog || 'pop', dyn = pat.dyn || pref.dyn || 'natural', bars = pref.bars || 4;
    let click = pref.click !== false, guide = pref.guide !== false, mode = App.settings.grooveInput || 'mic';
    let running = false, timers = [], raf = 0, unsub = null, take = null, an = null, keyOff = null;

    const lo = () => (inst === 'voice' ? (PM.Instruments.VOICE_TYPES[App.settings.voiceType || 'alto'] || { range: [53, 77] }).range[0] + 4 : inst === 'trumpet' ? 58 : 28);
    const voice = () => (kind === 'strum' ? PM.Sound.voiceFor(inst === 'electric' ? 'electric' : 'guitar') : kind === 'comp' ? 'piano' : PM.Sound.voiceFor(inst));
    const chords = () => (G().PROGRESSIONS.find((x) => x.id === prog) || G().PROGRESSIONS[0]).chords;
    const save = () => { Object.assign(pref, { ['meter-' + kind]: meter, ['pat-' + kind]: pat.id, prog, dyn, bars, click, guide }); App.saveSettings(); };

    box.innerHTML = `<div class="gv">
      <div class="gv-meters seg" id="gvMeters"></div>
      <div class="gv-pats" id="gvPats"></div>
      <div class="gv-now" id="gvNow"></div>
      <div class="pa-controls">
        <label class="field"><span>Tempo <b id="gvBpmL">${bpm}</b> BPM</span><input type="range" id="gvBpm" min="40" max="200" value="${bpm}"></label>
        <label class="field">Chords<select id="gvProg">${G().PROGRESSIONS.map((x) => `<option value="${x.id}" ${x.id === prog ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}</select></label>
        <label class="field">Dynamics<select id="gvDyn">${G().DYNAMICS.map((d) => `<option value="${d.id}" ${d.id === dyn ? 'selected' : ''}>${esc(d.name)} (${esc(d.short)})</option>`).join('')}</select></label>
        <label class="field">Bars<select id="gvBars">${[2, 4, 8].map((n) => `<option ${n === bars ? 'selected' : ''}>${n}</option>`).join('')}</select></label>
        <label class="switch"><input type="checkbox" id="gvClick" ${click ? 'checked' : ''}><span class="track"></span>Metronome</label>
        <label class="switch"><input type="checkbox" id="gvGuide" ${guide ? 'checked' : ''}><span class="track"></span>Guide ${kind === 'strum' ? 'guitar' : kind === 'comp' ? 'piano' : 'part'}</label>
        <div class="seg" id="gvMode"><button data-m="mic" class="${mode === 'mic' ? 'on' : ''}">${icon('mic')} Microphone</button><button data-m="tap" class="${mode === 'tap' ? 'on' : ''}">👆 Tap</button></div>
      </div>
      <div class="gv-bars" id="gvBarsRow"></div>
      <div class="gv-wrap" id="gvGrid"></div>
      <p class="small gv-legend">${esc(LEGEND[kind])}</p>
      <div class="gv-live">
        <div class="gv-fb" id="gvFb"><b>Ready</b><span class="small">Press Start: one bar of count-in, then play along.</span></div>
        <div class="gv-meter" title="Your level against the target"><span class="gv-band" id="gvBand"></span><i id="gvLevel"></i><em id="gvMark">mf</em></div>
      </div>
      <div class="gv-pads ${mode === 'tap' ? '' : 'hidden'}" id="gvPads">${kind === 'strum' ? `<button data-t="D">↓ Down <kbd>J / ↓</kbd></button><button data-t="U">↑ Up <kbd>K / ↑</kbd></button><button data-t="X">✕ Chuck <kbd>L</kbd></button>` : `<button data-t="H">Play <kbd>Space / J</kbd></button>`}</div>
      <div class="row" style="justify-content:center;margin-top:10px;gap:10px">
        <button class="btn glass" id="gvListen">${icon('headphones')} Listen</button>
        <button class="btn primary" id="gvGo">${icon('play')} Start take</button>
      </div>
      <p class="small" id="gvMsg" style="text-align:center;margin-top:8px"></p>
      <div id="gvResult"></div>
    </div>`;
    const q = (id) => $('#' + id, box);

    function drawPats() {
      const ms = G().meters(kind);
      q('gvMeters').innerHTML = `<button data-m="all" class="${meter === 'all' ? 'on' : ''}">All</button>` + ms.map((m) => `<button data-m="${m}" class="${meter === m ? 'on' : ''}">${m}</button>`).join('') + (all.some((p) => p.swing) ? `<button data-m="swing" class="${meter === 'swing' ? 'on' : ''}">Swing</button>` : '');
      $$('#gvMeters button', box).forEach((b) => (b.onclick = () => { meter = b.dataset.m; save(); drawPats(); }));
      const list = all.filter((p) => meter === 'all' || (meter === 'swing' ? p.swing : G().meterName(p.meter) === meter));
      q('gvPats').innerHTML = [1, 2, 3].map((lv) => { const ps = list.filter((p) => p.level === lv); return ps.length ? `<div class="gv-lv"><span class="lvl l${lv}">${['', 'Beginner', 'Intermediate', 'Advanced'][lv]}</span>${ps.map((p) => { const s = (st[p.id] || {}).stars || 0; return `<button class="gv-pat ${p.id === pat.id ? 'on' : ''}" data-p="${p.id}"><b>${esc(p.name)}</b><span>${esc(G().meterName(p.meter))}${p.swing ? ' swing' : ''} · ${esc(p.style || '')}</span><i>${'★'.repeat(s)}${'☆'.repeat(3 - s)}</i></button>`; }).join('')}</div>` : ''; }).join('');
      $$('.gv-pat', box).forEach((b) => (b.onclick = () => { if (running) return; pat = G().PATTERN[b.dataset.p]; bpm = (st[pat.id] && st[pat.id].nextBpm) || pat.bpm; if (pat.dyn) dyn = pat.dyn; q('gvDyn').value = dyn; q('gvBpm').value = bpm; q('gvBpmL').textContent = bpm; save(); drawPats(); drawNow(); }));
    }
    function drawNow(results) {
      q('gvNow').innerHTML = `<div class="pa-head"><span class="lvl l${pat.level}">Level ${pat.level}</span><span class="chip">${esc(G().METERS[pat.meter].label)}${pat.swing ? ' · swing' : ''}${pat.res === 16 ? ' · 16ths' : ''}</span><b class="pa-title">${esc(pat.name)}</b></div><div class="pa-tip">💡 ${esc(pat.tip)} <span class="muted">Count: ${esc(G().countLine(pat))}</span></div>`;
      q('gvGrid').innerHTML = gridHtml(pat, results);
      drawBars(-1);
    }
    function drawBars(cur) {
      const cs = chords(), D = G().DYN[dyn];
      q('gvBarsRow').innerHTML = Array.from({ length: bars }, (_, b) => `<span class="gv-bar ${b === cur ? 'now' : ''}"><b>${esc(cs[b % cs.length])}</b><em>${G().dynMark(D.level(b, bars))}</em></span>`).join('');
    }
    drawPats(); drawNow();

    q('gvBpm').oninput = (e) => { bpm = +e.target.value; q('gvBpmL').textContent = bpm; };
    q('gvProg').onchange = (e) => { prog = e.target.value; save(); drawBars(-1); };
    q('gvDyn').onchange = (e) => { dyn = e.target.value; save(); drawBars(-1); };
    q('gvBars').onchange = (e) => { bars = +e.target.value; save(); drawBars(-1); };
    q('gvClick').onchange = (e) => { click = e.target.checked; save(); };
    q('gvGuide').onchange = (e) => { guide = e.target.checked; save(); };
    $$('#gvMode button', box).forEach((b) => (b.onclick = () => { mode = b.dataset.m; App.settings.grooveInput = mode; App.saveSettings(); $$('#gvMode button', box).forEach((x) => x.classList.toggle('on', x === b)); q('gvPads').classList.toggle('hidden', mode !== 'tap'); }));

    const out = () => { const g = PM.Audio.getCtx().createGain(); g.connect(PM.Sound.master()); return g; };
    /** Schedule metronome + guide for `nb` bars from t0 (plus a count-in bar before it). Returns the plan. */
    function schedule(t0, nb, gain, withGuide, dest) {
      const plan = G().events(pat, { bpm, bars: nb, chords: chords(), dynamics: dyn, lo: lo() });
      const v = voice(), ck = G().clicks(pat, bpm);
      const start = t0 + plan.barDur;
      if (click || !withGuide) for (let b = -1; b < nb; b++) for (const c of ck) PM.Sound.drum(c.down ? 'woodhi' : 'wood', start + b * plan.barDur + c.time, (c.down ? 0.75 : 0.55) * (b < 0 ? 1 : click ? 0.8 : 0), dest);
      if (withGuide) for (const e of plan.events) {
        const vel = G().velocity(e) * gain;
        const ns = kind === 'strum' && e.dir < 0 ? e.notes.slice(-4).reverse() : e.notes;
        ns.forEach((m, i) => PM.Sound.note(v, m, start + e.time + (kind === 'strum' ? i * (e.mute ? 0.004 : 0.011) : 0), e.mute ? 0.05 : Math.max(0.08, e.dur * (kind === 'line' ? 0.96 : 0.92)), { vel: Math.max(0.12, vel * (kind === 'strum' && i ? 0.92 : 1)), dest }));
      }
      return Object.assign(plan, { start });
    }
    function warmUp() {
      const plan = G().events(pat, { bpm, bars, chords: chords(), dynamics: dyn, lo: lo() }), v = voice();
      const seen = new Set();
      for (const e of plan.events) for (const m of e.notes) { const vel = Math.round(G().velocity(e) * 4) / 4, key = m + ':' + vel; if (!seen.has(key)) { seen.add(key); PM.Sound.prepare(v, m, vel); } }
    }

    // playhead + live meter
    let headStart = 0, headEnd = 0, headPlan = null, lastK = -2, lastBar = -2;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      const now = PM.Audio.getCtx().currentTime;
      let k = -1, b = -1;
      if (headPlan && now >= headStart && now < headEnd) {
        const rel = now - headStart; b = Math.floor(rel / headPlan.barDur);
        const inBar = rel - b * headPlan.barDur, at = G().stepTime(pat, bpm).at;
        for (let i = pat.seq.length - 1; i >= 0; i--) if (at(i) <= inBar) { k = i; break; }
      }
      if (k !== lastK) { lastK = k; $$('.gv-c.now', box).forEach((c) => c.classList.remove('now')); if (k >= 0) $$(`.gv-c[data-k="${k}"]`, box).forEach((c) => c.classList.add('now')); }
      if (b !== lastBar) {
        lastBar = b; drawBars(b);
        if (take && b >= 0) { take.bar = b; $$('.gv-main .gv-c', box).forEach((c) => c.classList.remove('r-perfect', 'r-good', 'r-early', 'r-late', 'r-miss')); }
        if (b >= 0) { const lv = G().DYN[dyn].level(b, bars); q('gvMark').textContent = G().dynMark(lv); setBand(lv); }
      }
    };
    raf = requestAnimationFrame(tick);
    const ref = () => (take && take.dbs.length >= 3 ? take.dbs.slice().sort((a, b) => a - b)[take.dbs.length >> 1] : null);
    const pctOf = (db) => Math.max(0, Math.min(100, ((db + 60) / 50) * 100)); // -60..-10 dB
    function setBand(lv) {
      const r = ref(), band = q('gvBand');
      if (r == null || mode !== 'mic') { band.style.display = 'none'; return; }
      const mid = r + lv * 4; band.style.display = ''; band.style.left = pctOf(mid - 2.5) + '%'; band.style.width = (pctOf(mid + 2.5) - pctOf(mid - 2.5)) + '%';
    }

    q('gvListen').onclick = () => {
      if (running) return;
      warmUp();
      const ctx = PM.Audio.getCtx(), g = out(), t0 = ctx.currentTime + 0.25;
      const plan = schedule(t0, Math.min(bars, 2), 1, true, g);
      headPlan = plan; headStart = plan.start; headEnd = plan.start + plan.total;
      q('gvMsg').textContent = 'One bar of clicks, then the pattern.';
      timers.push(setTimeout(() => (q('gvMsg').textContent = ''), (headEnd - ctx.currentTime) * 1000));
    };

    // ---- feedback for a played attack
    function feedback(pl) {
      if (!take) return;
      const ev = take.exp;
      let best = null, bd = 1e9;
      for (const e of ev) { const d = Math.abs(pl.time - e.time); if (d < bd) { bd = d; best = e; } }
      const fb = q('gvFb');
      if (!best || bd > take.win) { fb.innerHTML = `<b class="bad">${kind === 'strum' ? 'Extra strum' : 'Extra note'}</b><span class="small">That landed on a gap${kind === 'strum' ? ' — keep the hand moving, but miss the strings' : ''}.</span>`; return; }
      const j = G().judge(best, pl);
      const cellEl = box.querySelector(`.gv-main .gv-c[data-k="${best.step}"]`);
      if (cellEl) { cellEl.classList.remove('r-perfect', 'r-good', 'r-early', 'r-late'); cellEl.classList.add('r-' + j.result); }
      const parts = [];
      parts.push(j.result === 'perfect' ? 'Right on time' : j.result === 'good' ? `${j.ms > 0 ? '+' : ''}${j.ms} ms` : `${j.result === 'early' ? 'Early' : 'Late'} ${Math.abs(j.ms)} ms`);
      if (j.dirOk === false) parts.push(best.dir > 0 ? 'that should be a ↓ downstroke' : 'that should be an ↑ upstroke');
      const r = ref();
      if (pl.db != null && r != null) {
        const target = r + best.level * 4 + (best.accent ? 3 : 0), diff = pl.db - target;
        if (diff < -3.5) parts.push(best.accent ? 'accent it more' : 'louder'); else if (diff > 3.5) parts.push('softer');
      }
      fb.innerHTML = `<b class="${j.result === 'perfect' || j.result === 'good' ? 'ok' : 'warn'}">${j.result === 'perfect' ? 'Perfect' : j.result === 'good' ? 'Good' : j.result === 'early' ? 'Early' : 'Late'}${j.dirOk === true ? ' ' + (best.dir > 0 ? '↓' : '↑') : ''}</b><span class="small">${esc(parts.join(' · '))}</span>`;
    }

    // ---- tap input
    const tap = (t) => {
      if (!take || mode !== 'tap') return;
      const dir = t === 'U' ? -1 : t === 'D' || t === 'X' ? 1 : 0;
      const ctx = PM.Audio.getCtx();
      const pl = { time: ctx.currentTime - (ctx.outputLatency || ctx.baseLatency || 0), dir: kind === 'strum' ? dir : 0 };
      take.played.push(pl); feedback(pl);
      const b = box.querySelector(`.gv-pads [data-t="${t}"]`); if (b) UI.bump(b, 'pulse-once');
    };
    $$('.gv-pads button', box).forEach((b) => b.addEventListener('pointerdown', (e) => { e.preventDefault(); tap(b.dataset.t); }));
    const onKey = (e) => {
      if (e.target.matches('input, select, textarea') || e.repeat || mode !== 'tap' || !take) return;
      const k = e.key.toLowerCase();
      const t = kind === 'strum' ? ({ arrowdown: 'D', j: 'D', arrowup: 'U', k: 'U', l: 'X' })[k] : (k === ' ' || k === 'j' ? 'H' : null);
      if (t) { e.preventDefault(); tap(t); }
    };
    addEventListener('keydown', onKey);
    keyOff = () => removeEventListener('keydown', onKey);

    // ---- strum direction from a short capture around the onset
    function captureDirection(pl, onsetCtx) {
      if (!an || kind !== 'strum') return;
      timers.push(setTimeout(() => {
        if (!take || !an) return;
        const ctx = PM.Audio.getCtx(), buf = new Float32Array(an.fftSize), sr = ctx.sampleRate;
        an.getFloatTimeDomainData(buf);
        const capT = ctx.currentTime, guess = buf.length - Math.round((capT - onsetCtx) * sr);
        // refine: biggest energy jump (128-sample blocks) within ±40 ms of the guess
        const B = 128, lo2 = Math.max(B * 2, guess - Math.round(0.04 * sr)), hi2 = Math.min(buf.length - B, guess + Math.round(0.04 * sr));
        let bestI = -1, bestR = 2;
        const e = (i) => { let s = 1e-9; for (let k = i; k < i + B; k++) s += buf[k] * buf[k]; return s; };
        for (let i = lo2; i < hi2; i += B / 2) { const r = e(i) / (e(i - B * 2) + e(i - B)); if (r > bestR) { bestR = r; bestI = i; } }
        if (bestI < 0) { feedback(pl); return; }
        const latency = App.live.latency || 0;
        pl.time = capT - (buf.length - bestI) / sr - latency; // sample-accurate onset
        const d = PM.Rhythm.strumDirection(buf, sr, bestI / sr);
        if (Math.abs(d) > 0.4) pl.dir = d; // only when the sweep is clear
        feedback(pl);
      }, 110));
    }

    q('gvGo').onclick = async () => {
      if (running) return finish(true);
      const ctx = PM.Audio.getCtx();
      if (mode === 'mic') {
        try { App.live.instrument = inst; App.live.latency = App.settings.latency; await App.live.start(App.settings.deviceId); }
        catch (e) { q('gvMsg').innerHTML = `Microphone unavailable (${esc(e.message || e)}) — switch to <b>Tap</b> to play with keys or touch.`; return; }
        try { an = ctx.createAnalyser(); an.fftSize = 8192; an.smoothingTimeConstant = 0; App.live.gain.connect(an); } catch (e) { an = null; }
      }
      warmUp();
      running = true;
      q('gvGo').innerHTML = `${icon('stop')} Stop`;
      q('gvResult').innerHTML = '';
      drawNow();
      const g = out(), t0 = ctx.currentTime + 0.3;
      const plan = schedule(t0, bars, guide ? 0.55 : 0, guide, g);
      const exp = plan.events.map((e) => Object.assign({}, e, { time: plan.start + e.time }));
      const gaps = exp.slice(1).map((e, i) => e.time - exp[i].time).filter((x) => x > 0);
      headPlan = plan; headStart = plan.start; headEnd = plan.start + plan.total;
      take = { exp, played: [], frames: [], dbs: [], startedAt: performance.now(), win: Math.min(0.13, Math.max(0.05, (gaps.length ? Math.min(...gaps) : 0.3) * 0.55)) };
      q('gvMsg').textContent = mode === 'mic' ? 'Count-in… then play. Overture listens to every ' + (kind === 'strum' ? 'strum' : 'note') + '.' : 'Count-in… then tap with the pattern.';
      if (mode === 'mic') {
        let pending = null;
        unsub = App.live.on((f) => {
          if (!take) return;
          if (f.time > plan.start - 0.2) take.frames.push({ time: f.time, active: f.active, db: f.db });
          q('gvLevel').style.width = pctOf(f.active ? f.db : -90) + '%';
          if (pending && f.time - pending.time < 0.09) pending.db = Math.max(pending.db, f.db);
          else if (pending) { take.dbs.push(pending.db); if (kind !== 'strum' || !an) feedback(pending); pending = null; }
          if (f.onset && f.time > plan.start - 0.15) {
            pending = { time: f.time, db: f.db, dir: 0 };
            take.played.push(pending);
            captureDirection(pending, f.time + (App.live.latency || 0));
          }
        });
      }
      timers.push(setTimeout(() => finish(false), (headEnd - ctx.currentTime + 0.5) * 1000));
    };

    function finish(aborted) {
      if (!running) return;
      running = false;
      timers.forEach(clearTimeout); timers = [];
      if (unsub) { unsub(); unsub = null; }
      if (an) { try { App.live.gain.disconnect(an); } catch (e) { /* ignore */ } an = null; }
      if (mode === 'mic') App.live.stop();
      q('gvGo').innerHTML = `${icon('play')} Start take`;
      headEnd = 0;
      const t = take; take = null;
      if (!t || (aborted && t.played.length < 3)) { q('gvMsg').textContent = 'Take stopped — start again when ready.'; return; }
      const s = G().score(t.exp, t.played, { dynamics: dyn, frames: mode === 'mic' ? t.frames : null, window: t.win });
      const res = {};
      t.exp.forEach((e, i) => (res[e.step] = s.perHit[i].result));
      drawNow(res);
      const stars = G().stars(s), c = G().coach(s, pat, { bpm, dynamics: dyn });
      const pct = (x) => Math.round(x * 100) + '%';
      const D = s.dynamics;
      const chips = [`<span class="chip">Played <b>${pct(s.accuracy)}</b></span>`, `<span class="chip">In time <b>${pct(s.inTime)}</b></span>`, `<span class="chip">Average <b>${s.avgMs > 0 ? '+' : ''}${s.avgMs} ms</b></span>`, `<span class="chip">Spread <b>±${s.spreadMs} ms</b></span>`];
      if (s.direction != null) chips.push(`<span class="chip">Strum direction <b>${pct(s.direction)}</b></span>`);
      if (D && D.score != null) chips.push(`<span class="chip">Dynamics <b>${pct(D.score)}</b></span>`);
      if (D && D.accentDb != null && pat.acc) chips.push(`<span class="chip">Accents <b>+${Math.max(0, D.accentDb)} dB</b></span>`);
      if (D && D.contrastDb != null) chips.push(`<span class="chip">p → f <b>${D.contrastDb > 0 ? '+' : ''}${D.contrastDb} dB</b></span>`);
      if (s.sustain != null) chips.push(`<span class="chip">Sustain <b>${pct(s.sustain)}</b></span>`);
      if (s.extras) chips.push(`<span class="chip">Extra <b>${s.extras}</b></span>`);
      q('gvResult').innerHTML = `<div class="gv-res pop-in"><div class="big-stars">${'★'.repeat(stars)}${'☆'.repeat(3 - stars)}</div>
        <div class="row" style="justify-content:center;gap:8px;flex-wrap:wrap">${chips.join('')}</div>
        <div class="gv-coach"><b>🤖 Coach</b><ul>${c.tips.slice(0, 4).map((x) => `<li>${esc(x.text)}</li>`).join('')}</ul><p class="small">${esc(c.next.text)}</p>
        ${mode === 'tap' ? '<p class="small muted">Dynamics, strum direction and sustain are measured with the microphone.</p>' : ''}
        <div class="row" style="gap:8px;justify-content:center">${c.next.bpm !== bpm ? `<button class="btn sm primary" id="gvNext">Set ${c.next.bpm} BPM</button>` : ''}<button class="btn sm glass" id="gvAgain">${icon('play')} Again</button></div></div>
        <div class="dg-legend small"><span class="r-perfect">perfect</span><span class="r-good">good</span><span class="r-early">early</span><span class="r-late">late</span><span class="r-miss">missed</span></div></div>`;
      const nx = q('gvNext'); if (nx) nx.onclick = () => { bpm = c.next.bpm; q('gvBpm').value = bpm; q('gvBpmL').textContent = bpm; nx.remove(); };
      q('gvAgain').onclick = () => q('gvGo').click();
      q('gvMsg').textContent = '';
      q('gvFb').innerHTML = `<b>${stars === 3 ? 'Brilliant!' : stars === 2 ? 'Nice!' : stars === 1 ? 'Keep going' : 'Try it slower'}</b><span class="small">${esc(c.tips[0].text)}</span>`;
      const o = st[pat.id] || {};
      st[pat.id] = { stars: Math.max(o.stars || 0, stars), bpm: Math.max(o.bpm || 0, stars ? bpm : 0), takes: (o.takes || 0) + 1, nextBpm: c.next.bpm, last: new Date().toISOString() };
      App.game.save();
      drawPats();
      App.game.recordSession({ mode: 'learn', instrument: inst, seconds: (performance.now() - t.startedAt) / 1000, title: `${K.short} · ${pat.name}`, assignmentId: opts.assignment ? opts.assignment.id : null,
        summary: { accuracy: s.accuracy, timingAccuracy: s.inTime, onsets: t.played.length, score: Math.round(s.accuracy * 100 + s.inTime * 50 + (D && D.score ? D.score * 30 : 0)), stars, maxCombo: 0,
          insights: [`${pct(s.inTime)} in time at ${bpm} BPM (${G().meterName(pat.meter)})`, `Average ${s.avgMs > 0 ? '+' : ''}${s.avgMs} ms · spread ±${s.spreadMs} ms`].concat(c.tips.slice(0, 2).map((x) => x.text)), focus: c.tips[0].text } });
      App.game.progressDaily('rhythmHits', Math.round(s.inTime * t.exp.length));
      if (stars === 3) UI.confetti();
      opts.onDone && opts.onDone(s, stars);
    }

    return { stop() { finish(true); cancelAnimationFrame(raf); if (keyOff) keyOff(); timers.forEach(clearTimeout); } };
  }

  PM.GrooveAlong = { mount, gridHtml };
})(typeof self !== 'undefined' ? self : globalThis);
