/* Cadenza — Metronome with speed trainer, gap trainer and live timing check. */
(function (root) {
  'use strict';
  const PM = root.PM;
  const { UI } = PM;
  const { icon, esc, $, $$ } = UI;

  const SIGS = ['2/4', '3/4', '4/4', '5/4', '6/8', '7/8', '9/8', '12/8'];
  const TEMPO_NAMES = [[40, 'Grave'], [60, 'Largo'], [66, 'Adagio'], [76, 'Andante'], [108, 'Moderato'], [120, 'Allegretto'], [156, 'Allegro'], [176, 'Vivace'], [200, 'Presto'], [999, 'Prestissimo']];
  const tempoName = (b) => TEMPO_NAMES.find(([x]) => b < x)[1];

  PM.App.register({
    id: 'metronome', title: 'Metronome', icon: 'metronome',
    render(host, App) {
      const m = App.metronome;
      const tab = App.metroTab || 'click';
      const tabs = `<div class="seg big-tabs" id="mTabs" style="margin-bottom:18px">${[['click', 'metronome', 'Click'], ['styles', 'music', 'Styles (40+ rhythms)'], ['pattern', 'grid', 'Click patterns'], ['beats', 'sliders', 'Beat maker']].map(([k, ic, l]) => `<button data-t="${k}" class="${tab === k ? 'on' : ''}">${icon(ic)} ${l}</button>`).join('')}</div>`;
      const wireTabs = () => $$('#mTabs button', host).forEach((b) => (b.onclick = () => { if (b.dataset.t === tab) return; App.metroTab = b.dataset.t; App.keepSequencer = true; App.rerender(); }));
      const seqCleanup = () => { if (App.keepSequencer) { App.keepSequencer = false; return; } if (App.sequencer && App.sequencer.running) App.sequencer.stop(); };
      if (tab === 'pattern') {
        if (m.running) m.stop();
        if (App.sequencer && App.sequencer.running) App.sequencer.stop();
        const c = PM.ClickPatternView.render(host, App, tabs);
        wireTabs();
        return () => { c && c(); App.keepSequencer = false; };
      }
      if (App.clickLoop && App.clickLoop.running) App.clickLoop.stop();
      if (tab !== 'click') {
        if (m.running) m.stop();
        const c = PM.RhythmView.render(host, App, tab, tabs);
        wireTabs();
        return () => { c && c(); seqCleanup(); };
      }
      if (App.sequencer && App.sequencer.running) App.sequencer.stop();
      host.innerHTML = `
        <div class="page-head"><div><div class="eyebrow">Metronome</div><h1>Lock in your time</h1><p>Accents, subdivisions and odd meters — plus a speed trainer and a live timing check that scores how tight you play against the click. For grooves, open <b>Styles</b> or build your own in the <b>Beat maker</b>.</p></div></div>
        ${tabs}
        <div class="metro-stage">
          <section class="card stage">
            <div class="metro-circle" id="circle"><div class="metro-flash" id="flash"></div>
              <div class="bpm"><span>BPM</span><b id="bpm">${m.bpm}</b><em id="tname">${tempoName(m.bpm)}</em></div>
            </div>
            <div class="bpm-controls">
              <button class="btn glass icon" id="minus">${icon('minus')}</button>
              <input type="range" id="bpmSlider" min="30" max="260" value="${m.bpm}" style="max-width:280px">
              <button class="btn glass icon" id="plus">${icon('plus')}</button>
            </div>
            <div class="row" style="justify-content:center;margin-top:18px">
              <button class="btn white" id="startBtn" style="min-width:150px">${icon(m.running ? 'stop' : 'play')} ${m.running ? 'Stop' : 'Start'}</button>
              <button class="btn glass" id="tap">${icon('hand')} Tap tempo</button>
            </div>
            <p class="small" style="text-align:center;margin-top:10px">Shortcuts: Space start/stop · ↑/↓ ±1 BPM · T tap</p>
          </section>
          <section class="card">
            <div class="card-head"><h3>${icon('sliders')} Settings</h3></div>
            <div class="grid g2">
              <label class="field">Time signature<select id="sig">${SIGS.map((s) => `<option ${s === m.beatsPerBar + '/' + m.beatUnit ? 'selected' : ''}>${s}</option>`).join('')}</select></label>
              <label class="field">Sound<select id="sound"><option value="click">Click</option><option value="wood">Woodblock</option><option value="beep">Beep</option></select></label>
            </div>
            <label class="field" style="margin-top:14px">Subdivision</label>
            <div class="seg" id="subSeg" style="margin-top:6px">${[[1, '♩'], [2, '♫ 8ths'], [3, '3 triplets'], [4, '𝅘𝅥𝅯 16ths']].map(([v, l]) => `<button data-v="${v}" class="${m.subdivision === v ? 'on' : ''}">${l}</button>`).join('')}</div>
            <div class="row" style="margin-top:16px;gap:20px">
              <label class="switch"><input type="checkbox" id="accent" ${m.accentFirst ? 'checked' : ''}><span class="track"></span>Accent beat 1</label>
              <label class="switch" title="Every other bar is silent — keep the pulse yourself"><input type="checkbox" id="gap" ${m.mutedBars ? 'checked' : ''}><span class="track"></span>Gap trainer</label>
            </div>
            <label class="field" style="margin-top:14px">Volume<input type="range" id="vol" min="0" max="1" step="0.05" value="${m.volume}"></label>
            <hr style="border:0;border-top:1px solid var(--line);margin:18px 0">
            <div class="card-head" style="margin-bottom:8px"><h3>${icon('bolt')} Speed trainer</h3><span class="tag" id="trainerTag">off</span></div>
            <div class="grid g3">
              <label class="field">Target BPM<input type="number" id="tTarget" value="${Math.min(260, m.bpm + 30)}" min="40" max="260"></label>
              <label class="field">+ BPM<input type="number" id="tStep" value="4" min="1" max="20"></label>
              <label class="field">Every N bars<input type="number" id="tBars" value="4" min="1" max="32"></label>
            </div>
            <button class="btn primary" id="trainerBtn" style="margin-top:12px">${icon('bolt')} Start speed trainer</button>
          </section>
        </div>
        <section class="card stage" style="margin-top:18px">
          <div class="card-head"><h3>${icon('target')} Timing check</h3><button class="btn primary sm" id="checkBtn">${icon('mic')} Start timing check</button></div>
          <div class="grid g4">
            <div><div class="now-label">Last hit</div><div class="meter-val" id="tcLast">—</div></div>
            <div><div class="now-label">Average</div><div class="meter-val" id="tcAvg">—</div></div>
            <div><div class="now-label">On-beat hits</div><div class="meter-val" id="tcHits">0</div></div>
            <div><div class="now-label">Tightness</div><div class="meter-val" id="tcTight">—</div></div>
          </div>
          <div id="tcGauge" style="margin-top:6px">${UI.gaugeHtml(['early', '−50 ms', 'on the beat', '+50 ms', 'late'])}</div>
          <p class="small" style="margin-top:6px" id="tcMsg">Start the metronome, then play single notes or strums on each click. Cadenza measures how far each hit lands from the beat.</p>
        </section>`;

      const bpmEl = $('#bpm', host), slider = $('#bpmSlider', host);
      const syncBpm = () => { bpmEl.textContent = Math.round(m.bpm); slider.value = m.bpm; $('#tname', host).textContent = tempoName(m.bpm); };
      const startBtn = $('#startBtn', host);
      const syncStart = () => { startBtn.innerHTML = `${icon(m.running ? 'stop' : 'play')} ${m.running ? 'Stop' : 'Start'}`; };
      $('#sound', host).value = m.sound;

      // beat dots
      const circle = $('#circle', host);
      const drawDots = () => {
        $$('.metro-dot', circle).forEach((d) => d.remove());
        const n = m.beatsPerBar;
        for (let i = 0; i < n; i++) {
          const ang = (i / n) * Math.PI * 2 - Math.PI / 2;
          const d = document.createElement('div');
          d.className = 'metro-dot' + (i === 0 ? ' accent' : '');
          d.style.left = 50 + Math.cos(ang) * 44 + '%';
          d.style.top = 50 + Math.sin(ang) * 44 + '%';
          d.dataset.i = i;
          circle.appendChild(d);
        }
      };
      drawDots();

      startBtn.onclick = () => { m.running ? m.stop() : m.start(); syncStart(); };
      $('#minus', host).onclick = () => { m.setBpm(m.bpm - 1); syncBpm(); };
      $('#plus', host).onclick = () => { m.setBpm(m.bpm + 1); syncBpm(); };
      slider.oninput = () => { m.setBpm(+slider.value); syncBpm(); };
      $('#tap', host).onclick = () => { m.tap(); syncBpm(); };
      $('#sig', host).onchange = (e) => { const [n, d] = e.target.value.split('/').map(Number); m.beatsPerBar = n; m.beatUnit = d; drawDots(); };
      $('#sound', host).onchange = (e) => (m.sound = e.target.value);
      $$('#subSeg button', host).forEach((b) => (b.onclick = () => { m.subdivision = +b.dataset.v; $$('#subSeg button', host).forEach((x) => x.classList.toggle('on', x === b)); }));
      $('#accent', host).onchange = (e) => (m.accentFirst = e.target.checked);
      $('#gap', host).onchange = (e) => (m.mutedBars = e.target.checked ? 1 : 0);
      $('#vol', host).oninput = (e) => m.setVolume(+e.target.value);

      let trainerStartBpm = 0;
      $('#trainerBtn', host).onclick = () => {
        if (m.trainer) { m.trainer = null; $('#trainerTag', host).textContent = 'off'; $('#trainerBtn', host).innerHTML = `${icon('bolt')} Start speed trainer`; return; }
        const target = +$('#tTarget', host).value, step = +$('#tStep', host).value, every = +$('#tBars', host).value;
        if (target <= m.bpm) { UI.toast('Target must be faster than the current tempo.', { icon: '⚠️' }); return; }
        m.trainer = { target, step, everyBars: every };
        trainerStartBpm = m.bpm;
        $('#trainerTag', host).textContent = `${m.bpm} → ${target}`;
        $('#trainerBtn', host).innerHTML = `${icon('stop')} Stop trainer`;
        if (!m.running) { m.start(); syncStart(); }
      };
      const offM = m.on((e) => {
        if (e.type === 'bpm') syncBpm();
        if (e.type === 'trainer') {
          $('#trainerTag', host).textContent = `${e.bpm} BPM`;
          if (e.done) {
            UI.toast(`Speed trainer complete: ${e.bpm} BPM! 🚀`, { icon: '🏁', kind: 'xp' });
            App.game.recordSession({ mode: 'speed-trainer', instrument: App.instrument, seconds: 0, trainerBpm: e.bpm, title: `Speed trainer ${trainerStartBpm}→${e.bpm}`, summary: { score: (e.bpm - trainerStartBpm) * 10 } });
            m.trainer = null;
            $('#trainerBtn', host).innerHTML = `${icon('bolt')} Start speed trainer`;
          }
        }
      });

      // timing check
      let unsub = null, offsets = [], hits = 0, checkStart = 0;
      const checkBtn = $('#checkBtn', host);
      const stopCheck = (record) => {
        if (!unsub) return;
        unsub(); unsub = null; App.live.stop();
        checkBtn.className = 'btn primary sm';
        checkBtn.innerHTML = `${icon('mic')} Start timing check`;
        const secs = (performance.now() - checkStart) / 1000;
        if (record && offsets.length >= 8) {
          const mean = offsets.reduce((x, y) => x + y, 0) / offsets.length;
          const sd = Math.sqrt(offsets.reduce((x, y) => x + (y - mean) ** 2, 0) / offsets.length);
          const acc = hits / offsets.length;
          const summary = {
            accuracy: acc, timingAccuracy: acc, onsets: offsets.length, score: hits * 15, maxCombo: 0, stars: acc >= 0.9 ? 3 : acc >= 0.7 ? 2 : acc >= 0.45 ? 1 : 0,
            insights: [`${offsets.length} hits measured at ${Math.round(m.bpm)} BPM`, `Average ${mean >= 0 ? '+' : ''}${Math.round(mean)} ms (${mean < -12 ? 'rushing' : mean > 12 ? 'dragging' : 'centred'})`, `Spread ±${Math.round(sd)} ms`],
            focus: sd > 40 ? 'Your hits vary a lot — try the gap trainer to build an internal clock.' : Math.abs(mean) > 20 ? (mean < 0 ? 'You tend to rush: relax and let the click come to you.' : 'You tend to drag: anticipate the click slightly.') : 'Very consistent! Push the tempo up 5–10 BPM.',
          };
          PM.Shared.sessionSummary(summary, { mode: 'timing-check', instrument: App.instrument, seconds: secs, title: `Timing check @ ${Math.round(m.bpm)} BPM` });
          App.game.progressDaily('rhythmHits', hits);
        }
      };
      checkBtn.onclick = async () => {
        if (unsub) { stopCheck(true); return; }
        try { App.live.latency = App.settings.latency; await App.live.start(App.settings.deviceId); }
        catch (e) { UI.toast('Microphone unavailable: ' + (e.message || e), { icon: '🎤' }); return; }
        if (!m.running) { m.start(); syncStart(); }
        offsets = []; hits = 0; checkStart = performance.now();
        checkBtn.className = 'btn live sm';
        checkBtn.innerHTML = `${icon('stop')} Stop & score`;
        const grid = m.grid(1);
        unsub = App.live.on((f) => {
          if (!f.onset) return;
          const near = grid.nearest(f.time);
          if (!near || Math.abs(near.offset) > near.interval * 0.35) return;
          const ms = near.offset * 1000;
          offsets.push(ms);
          if (Math.abs(ms) < 35) hits++;
          const mean = offsets.reduce((x, y) => x + y, 0) / offsets.length;
          const sd = Math.sqrt(offsets.reduce((x, y) => x + (y - mean) ** 2, 0) / offsets.length);
          $('#tcLast', host).textContent = (ms > 0 ? '+' : '') + Math.round(ms) + ' ms';
          $('#tcAvg', host).textContent = (mean > 0 ? '+' : '') + Math.round(mean) + ' ms';
          $('#tcHits', host).textContent = `${hits}/${offsets.length}`;
          $('#tcTight', host).textContent = '±' + Math.round(sd) + ' ms';
          UI.setGauge($('#tcGauge .gauge', host), ms, 100);
          $('#tcMsg', host).textContent = Math.abs(ms) < 20 ? '🎯 Perfect!' : Math.abs(ms) < 35 ? 'Great — on the beat.' : ms < 0 ? 'Early — you are rushing.' : 'Late — you are dragging.';
        });
      };

      // animation
      let raf = 0, lastKey = '';
      const tick = () => {
        raf = requestAnimationFrame(tick);
        const cur = m.running ? m.current() : null;
        const key = cur ? cur.bar + ':' + cur.beat + ':' + cur.sub : '';
        if (key === lastKey) return;
        lastKey = key;
        $$('.metro-dot', circle).forEach((d) => d.classList.toggle('on', !!cur && +d.dataset.i === cur.beat && !cur.silent));
        const flash = $('#flash', host);
        if (cur && cur.sub === 0 && !cur.silent) { flash.classList.add('on'); setTimeout(() => flash.classList.remove('on'), 90); }
      };
      raf = requestAnimationFrame(tick);
      const onKey = (e) => {
        if (e.target.matches('input, select')) return;
        if (e.code === 'Space') { e.preventDefault(); startBtn.click(); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); m.setBpm(m.bpm + 1); syncBpm(); }
        else if (e.key === 'ArrowDown') { e.preventDefault(); m.setBpm(m.bpm - 1); syncBpm(); }
        else if (e.key === 't' || e.key === 'T') { m.tap(); syncBpm(); }
      };
      addEventListener('keydown', onKey);
      wireTabs();
      return () => { cancelAnimationFrame(raf); offM(); removeEventListener('keydown', onKey); stopCheck(false); App.keepSequencer = false; };
    },
  });
})(typeof self !== 'undefined' ? self : globalThis);
