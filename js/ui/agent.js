/* Cadenza — Cadi, the on-screen practice coach: a floating chat panel that comments live
 * while you practise (PM.App.emit('practice', event)), reviews takes, plans practice and
 * answers questions. Optional spoken tips (speech synthesis). Works offline. */
(function (root) {
  'use strict';
  const PM = root.PM;
  const { UI } = PM;
  const { icon, esc, $ } = UI;
  const PREF = 'cadenza.agent.v1', LOG = 'cadenza.agentLog.v1';
  const load = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) || d; } catch (e) { return d; } };
  const save = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* ignore */ } };
  const md = (s) => esc(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/\*(.+?)\*/g, '<i>$1</i>');
  const plain = (s) => String(s).replace(/\*\*|\*/g, '').replace(/[🌟👍📈🎯🎉💡]/gu, '');

  const Coach = {
    prefs: Object.assign({ voice: false, level: 'normal', open: false }, load(PREF, {})),
    log: load(LOG, []).slice(-40),
    state: {},
    unread: 0,
    lastSaid: 0,

    init(App) {
      this.App = App;
      const el = document.createElement('div');
      el.id = 'cadi';
      el.innerHTML = `
        <button class="cadi-fab" id="cadiFab" aria-label="Open Cadi, your practice coach"><span class="cadi-face">🎵</span><i class="cadi-badge hidden" id="cadiBadge"></i></button>
        <div class="cadi-bubble hidden" id="cadiBubble"></div>
        <section class="cadi-panel hidden" id="cadiPanel" role="dialog" aria-label="Cadi practice coach">
          <header><div class="cadi-face sm">🎵</div><div style="flex:1;min-width:0"><b>Cadi</b><span>your practice coach · on-device</span></div>
            <button class="mini-btn" id="cadiSet" title="Settings">${icon('sliders')}</button><button class="mini-btn" id="cadiClose" aria-label="Close">✕</button></header>
          <div class="cadi-settings hidden" id="cadiSettings">
            <label class="switch"><input type="checkbox" id="cadiVoice" ${this.prefs.voice ? 'checked' : ''}><span class="track"></span>Speak my tips</label>
            <label class="field" style="margin-top:8px">How chatty?<select id="cadiLevel"><option value="quiet">Quiet — only take reviews</option><option value="normal">Normal</option><option value="chatty">Chatty — lots of tips</option></select></label>
            <button class="mini-btn" id="cadiClear" style="margin-top:8px">Clear conversation</button>
          </div>
          <div class="cadi-log" id="cadiLog"></div>
          <div class="cadi-chips" id="cadiChips">${['What should I practise?', 'Give me a tip', 'How am I doing?', 'How do I improve my timing?', 'Explain 6/8'].map((q) => `<button data-q="${esc(q)}">${esc(q)}</button>`).join('')}</div>
          <form class="cadi-input" id="cadiForm"><input id="cadiQ" placeholder="Ask about chords, scales, rhythm, practice…" autocomplete="off"><button class="btn primary sm" type="submit">${icon('play')}</button></form>
        </section>`;
      document.body.appendChild(el);
      $('#cadiLevel', el).value = this.prefs.level;
      $('#cadiFab', el).onclick = () => this.toggle();
      $('#cadiClose', el).onclick = () => this.toggle(false);
      $('#cadiBubble', el).onclick = () => this.toggle(true);
      $('#cadiSet', el).onclick = () => $('#cadiSettings', el).classList.toggle('hidden');
      $('#cadiVoice', el).onchange = (e) => { this.prefs.voice = e.target.checked; this.savePrefs(); if (e.target.checked) this.speak('Okay, I will read my tips out loud.'); };
      $('#cadiLevel', el).onchange = (e) => { this.prefs.level = e.target.value; this.savePrefs(); };
      $('#cadiClear', el).onclick = () => { this.log = []; save(LOG, []); this.render(); };
      el.querySelectorAll('[data-q]').forEach((b) => (b.onclick = () => this.ask(b.dataset.q)));
      $('#cadiForm', el).onsubmit = (e) => { e.preventDefault(); const q = $('#cadiQ', el).value.trim(); if (q) { $('#cadiQ', el).value = ''; this.ask(q); } };
      App.on((type, data) => { if (type === 'practice') this.onPractice(data); });
      this.render();
      if (this.prefs.open) this.toggle(true);
      // a friendly hello once a day
      const today = new Date().toISOString().slice(0, 10);
      if (this.prefs.greeted !== today) setTimeout(() => { this.prefs.greeted = today; this.savePrefs(); this.greet(); }, 3500);
    },
    savePrefs() { save(PREF, this.prefs); },
    toggle(open) {
      const p = $('#cadiPanel');
      const show = open == null ? p.classList.contains('hidden') : open;
      p.classList.toggle('hidden', !show);
      $('#cadiBubble').classList.add('hidden');
      this.prefs.open = show; this.savePrefs();
      if (show) { this.unread = 0; this.badge(); this.render(); setTimeout(() => { const q = $('#cadiQ'); if (q && matchMedia('(pointer:fine)').matches) q.focus(); }, 50); }
    },
    badge() { const b = $('#cadiBadge'); if (b) { b.textContent = this.unread || ''; b.classList.toggle('hidden', !this.unread); } },
    context() {
      const App = this.App, g = App.game.state;
      const today = new Date().toISOString().slice(0, 10);
      const path = PM.Curriculum ? PM.Curriculum.forInstrument(App.instrument) : [];
      const done = g.path || {};
      const next = path.find((e) => !(done[e.id] && done[e.id].stars >= 1)) || null;
      const cats = {};
      for (const e of path) { const r = done[e.id]; if (r) { (cats[e.cat] = cats[e.cat] || []).push(r.best || 0); } }
      const weak = Object.entries(cats).filter(([, v]) => v.length).map(([k, v]) => [k, v.reduce((a, b) => a + b, 0) / v.length]).sort((a, b) => a[1] - b[1])[0];
      return { instrument: App.instrument, name: PM.Sync && PM.Sync.connected ? PM.Sync.account.user.name.split(' ')[0] : '', game: Object.assign({}, g, { todaySeconds: (g.days || {})[today] || 0 }), next, weakest: weak && weak[1] < 0.85 ? weak[0] : null, pathTotal: path.length, lastCompare: this.lastCompare };
    },
    greet() {
      const c = this.context();
      const parts = [`${c.name ? 'Hi ' + c.name + '!' : 'Hi!'} I'm **Cadi**, your practice coach.`];
      if (c.game.streak > 1) parts.push(`You're on a **${c.game.streak}-day streak** 🔥.`);
      if (c.next) parts.push(`Today's suggestion: **#${c.next.n} ${c.next.title}** in Learn → Exercise path.`);
      parts.push('Tap me any time to ask a question.');
      this.say(parts.join(' '), 'info', { quietOk: true, action: c.next ? { kind: 'open-exercise', id: c.next.id, label: 'Start it' } : null });
    },
    ask(q) {
      this.push({ who: 'me', text: q });
      const r = PM.Agent.respond(q, this.context());
      setTimeout(() => this.say(r.text, 'info', { force: true, action: r.action }), 250);
    },
    onPractice(ev) {
      if (!ev) return;
      const r = PM.Agent.react(ev, this.state);
      if (!r) return;
      if (ev.type === 'end' && ev.prev) this.lastCompare = r.text;
      const lvl = this.prefs.level;
      if (lvl === 'quiet' && ev.type !== 'end') return;
      if (lvl === 'normal' && ev.type === 'note' && r.mood === 'good' && Math.random() < 0.5) return;
      this.say(r.text, r.mood, { live: ev.type === 'note' });
    },
    say(text, mood, opts) {
      opts = opts || {};
      const now = Date.now();
      if (opts.live && now - this.lastSaid < 2500) return; // don't flood during a take
      this.lastSaid = now;
      this.push({ who: 'cadi', text, mood: mood || 'info', action: opts.action || null });
      if (this.prefs.voice && root.speechSynthesis && (!opts.live || this.prefs.level === 'chatty')) this.speak(text);
      const panelOpen = !$('#cadiPanel').classList.contains('hidden');
      if (!panelOpen) {
        this.unread++; this.badge();
        const b = $('#cadiBubble');
        b.innerHTML = md(text.length > 160 ? text.slice(0, 157) + '…' : text);
        b.className = 'cadi-bubble ' + (mood || 'info');
        clearTimeout(this.bubbleT);
        this.bubbleT = setTimeout(() => b.classList.add('hidden'), opts.live ? 3500 : 7000);
      }
    },
    speak(text) {
      try {
        const u = new SpeechSynthesisUtterance(plain(text));
        u.rate = 1.03; u.pitch = 1.05;
        speechSynthesis.cancel();
        speechSynthesis.speak(u);
      } catch (e) { /* speech not available */ }
    },
    push(m) {
      m.t = Date.now();
      this.log.push(m);
      this.log = this.log.slice(-60);
      save(LOG, this.log.map((x) => Object.assign({}, x, { action: x.action || null })));
      this.render();
    },
    render() {
      const box = $('#cadiLog');
      if (!box) return;
      box.innerHTML = this.log.length ? this.log.map((m, i) => `<div class="cadi-msg ${m.who} ${m.mood || ''}">${md(m.text)}${m.action ? `<button class="mini-btn" data-act="${i}">${esc(m.action.label)}</button>` : ''}</div>`).join('') : '<div class="cadi-msg cadi">Ask me anything — or just start practising and I\'ll chime in.</div>';
      box.querySelectorAll('[data-act]').forEach((b) => (b.onclick = () => this.act(this.log[+b.dataset.act].action)));
      box.scrollTop = box.scrollHeight;
    },
    act(a) {
      if (!a) return;
      if (a.kind === 'open-exercise') { this.App.pendingExercise = a.id; if (this.App.currentView === 'learn') this.App.rerender(); else this.App.go('learn'); if (matchMedia('(max-width: 760px)').matches) this.toggle(false); }
    },
  };

  PM.Cadi = Coach;
})(typeof self !== 'undefined' ? self : globalThis);
