/* Cadenza — "Record & send to teacher" panel: record (optionally with the backing track),
 * listen back, re-record, add a note and send. Sending works offline: the recording waits
 * on this device and uploads when the classroom server is reachable. */
(function (root) {
  'use strict';
  const PM = root.PM;
  const { UI } = PM;
  const { icon, esc, $ } = UI;
  const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

  /**
   * opts: {title, assignmentId, songId, mode, note, context (text shown under the title),
   *        includeTrack (default true when a track is loaded), onSent(blobId)}
   */
  function open(opts) {
    opts = opts || {};
    const App = PM.App, S = PM.Sync;
    const rec = new PM.Recorder();
    const hasTrack = App.player.loaded;
    let result = null, url = null, raf = 0, startedTrack = false;
    const m = UI.modal(`
      <div class="modal-top"><div style="font-size:40px">🎙️</div><h2 style="color:#fff;margin-top:4px">${esc(opts.title || 'Record your playing')}</h2>
        <p style="margin-top:6px">${esc(opts.context || (S.connected ? 'Record yourself, listen back, then send it to your teacher for review.' : 'Record yourself and listen back. Sign in to a classroom to send recordings to a teacher.'))}</p></div>
      <div class="modal-body">
        ${hasTrack ? `<label class="switch" style="margin-bottom:12px"><input type="checkbox" id="rTrack" ${opts.includeTrack === false ? '' : 'checked'}><span class="track"></span>Play “${esc((App.track && App.track.name || 'the track').slice(0, 40))}” and include it in the recording</label>` : ''}
        <div class="rec-stage">
          <button class="rec-btn" id="rBtn" aria-label="Record"><i></i></button>
          <div style="flex:1;min-width:0"><div class="rec-time" id="rTime">0:00</div><div class="rec-meter"><i id="rLvl"></i></div><div class="muted small" id="rState">Tap the red button to start. Use headphones if the backing track is loud.</div></div>
        </div>
        <div id="rReview" class="hidden" style="margin-top:14px">
          <audio controls id="rAudio" style="width:100%"></audio>
          <label class="field" style="margin-top:10px">Note for your teacher (optional)<textarea id="rNote" placeholder="e.g. I struggled with the change to D in bar 6">${esc(opts.note || '')}</textarea></label>
        </div>
        <p class="small" id="rMsg" style="margin-top:8px;color:var(--bad)"></p>
        <div class="row" style="justify-content:flex-end;margin-top:14px">
          <button class="btn ghost" id="rCancel" data-close>Close</button>
          <button class="btn ghost hidden" id="rAgain">${icon('loop')} Record again</button>
          <a class="btn ghost hidden" id="rSave" download>${icon('download')} Save to device</a>
          <button class="btn primary hidden" id="rSend">${icon('upload')} ${S.connected ? 'Send to teacher' : 'Sign in to send'}</button>
        </div>
      </div>`, { onClose: () => { cancelAnimationFrame(raf); if (rec.state === 'recording') rec.cancel(); if (startedTrack) App.player.pause(); if (url) URL.revokeObjectURL(url); } });
    const q = (id) => $('#' + id, m.el);
    const meter = () => {
      if (rec.state !== 'recording') return;
      q('rTime').textContent = fmt(rec.seconds);
      q('rLvl').style.width = Math.round(Math.sqrt(rec.level()) * 100) + '%';
      raf = requestAnimationFrame(meter);
    };
    const showReview = () => {
      const has = !!result;
      q('rReview').classList.toggle('hidden', !has);
      ['rAgain', 'rSave', 'rSend'].forEach((id) => q(id).classList.toggle('hidden', !has));
      q('rBtn').classList.toggle('hidden', has);
    };
    q('rBtn').onclick = async () => {
      q('rMsg').textContent = '';
      if (rec.state === 'recording') {
        q('rBtn').disabled = true;
        result = await rec.stop();
        cancelAnimationFrame(raf);
        if (startedTrack) { App.player.pause(); startedTrack = false; }
        q('rBtn').classList.remove('on'); q('rBtn').disabled = false;
        if (!result || !result.blob.size) { q('rMsg').textContent = 'Nothing was recorded — check the microphone.'; result = null; return; }
        url = URL.createObjectURL(result.blob);
        q('rAudio').src = url;
        q('rSave').href = url;
        q('rSave').download = `${(opts.title || 'recording').replace(/[\\/:*?"<>|]+/g, '')}.${result.ext}`;
        q('rState').textContent = `Recorded ${fmt(result.seconds)}. Listen back — happy with it?`;
        showReview();
        return;
      }
      try {
        const withTrack = hasTrack && q('rTrack') && q('rTrack').checked;
        if (withTrack) App.player.prime();
        await rec.start({ deviceId: App.settings.deviceId, includeTrack: withTrack });
        if (withTrack) { App.player.time = App.player.loop ? App.player.loop.a : 0; await App.player.play(); startedTrack = true; }
        q('rBtn').classList.add('on');
        q('rState').textContent = withTrack ? 'Recording with the track… tap again to stop.' : 'Recording… tap again to stop.';
        meter();
      } catch (e) {
        q('rMsg').textContent = e.name === 'NotAllowedError' ? 'Microphone permission was denied — allow it in your browser/system settings.' : e.name === 'NotFoundError' || e.name === 'OverconstrainedError' ? 'No microphone found — connect one (or check your audio input settings) and try again.' : (e.message || String(e));
      }
    };
    q('rAgain').onclick = () => { if (url) URL.revokeObjectURL(url); url = null; result = null; q('rAudio').removeAttribute('src'); q('rTime').textContent = '0:00'; q('rState').textContent = 'Ready when you are.'; showReview(); };
    q('rSend').onclick = async () => {
      if (!S.connected) { m.close(); App.go('classroom'); return; }
      q('rSend').disabled = true;
      try {
        const id = await S.sendRecording(result, { title: opts.title, assignmentId: opts.assignmentId, songId: opts.songId, mode: opts.mode, note: q('rNote').value });
        UI.toast(S.status === 'online' || navigator.onLine ? 'Recording sent to your teacher' : 'Saved — it will upload when you are online', { icon: '📨', duration: 3500 });
        App.game.addXp(25, 'recording');
        opts.onSent && opts.onSent(id);
        m.close();
      } catch (e) { q('rMsg').textContent = 'Could not save the recording: ' + e.message; q('rSend').disabled = false; }
    };
    if (!PM.Recorder.supported()) { q('rBtn').disabled = true; q('rState').textContent = root.isSecureContext === false ? 'Recording needs an https:// address or the installed app.' : 'This browser cannot record audio.'; }
    return m;
  }

  PM.RecordPanel = { open };
})(typeof self !== 'undefined' ? self : globalThis);
