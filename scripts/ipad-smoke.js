#!/usr/bin/env node
/* End-to-end check of Cadenza on an emulated iPad (WebKit = Safari's engine) or iPhone.
 *   node scripts/ipad-smoke.js [webkit|chromium] [outDir]
 * Starts the classroom server (which also serves the app), then walks every screen, plays a
 * demo with a count-in, runs a game, uses the classroom, and reloads the app while offline.
 * Exits 1 on any page error or failed step. Screenshots go to outDir. */
'use strict';
const path = require('path');
const fs = require('fs');
const os = require('os');
const pw = require('playwright');
const { createServer } = require('../server/server.js');

const engine = process.argv[2] || 'webkit';

/** A one-page PDF chord sheet for the upload test. */
function tinyPdf() {
  const content = 'BT /F1 18 Tf 50 750 Td (D        G        D) Tj 0 -26 Td (Chord sheet test) Tj ET';
  const objs = ['<< /Type /Catalog /Pages 2 0 R >>', '<< /Type /Pages /Kids [3 0 R] /Count 1 >>', '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>', `<< /Length ${content.length} >>\nstream\n${content}\nendstream`, '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>'];
  let out = '%PDF-1.4\n'; const offs = [];
  objs.forEach((o, i) => { offs.push(out.length); out += `${i + 1} 0 obj\n${o}\nendobj\n`; });
  const x = out.length;
  out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n` + offs.map((o) => String(o).padStart(10, '0') + ' 00000 n \n').join('') + `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${x}\n%%EOF\n`;
  return out;
}
const outDir = process.argv[3] || path.join(os.tmpdir(), 'cadenza-ipad');
fs.mkdirSync(outDir, { recursive: true });

(async () => {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cadenza-data-'));
  const server = createServer({ dataDir });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const base = `http://localhost:${server.address().port}`;
  const browser = await pw[engine].launch();
  const results = [];
  const errors = [];
  let failed = false;
  let lastState = '';
  const step = async (name, fn) => {
    try { const info = await fn(); results.push({ step: name, ok: true, info: info || '' }); console.log(`✓ ${name}${info ? ' — ' + info : ''}`); }
    catch (e) { failed = true; results.push({ step: name, ok: false, info: e.message }); console.log(`✗ ${name} — ${process.env.SMOKE_VERBOSE ? e.message : e.message.split("\n")[0]}`); }
    // trace page reloads and the loaded track between steps (diagnoses a lost track on WebKit)
    try {
      const st = await pageRef.evaluate(() => `page ${window.__boot || (window.__boot = Math.random().toString(36).slice(2, 6))} · track ${PM.App.track ? '"' + PM.App.track.name + '"' : 'none'}`);
      if (st !== lastState) { console.log(`    ↳ ${st}`); lastState = st; }
    } catch (e) { /* page closed */ }
  };
  let pageRef = null;

  for (const deviceName of ['iPad Pro 11', 'iPad Pro 11 landscape', 'iPhone 13']) {
    const device = pw.devices[deviceName];
    const ctx = await browser.newContext(Object.assign({}, device, engine === 'chromium' ? { defaultBrowserType: undefined } : {}));
    const page = await ctx.newPage();
    pageRef = page;
    const tag = deviceName.replace(/\s+/g, '-');
    page.on('pageerror', (e) => errors.push(`[${deviceName}] ${e.message}`));
    page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource|getUserMedia|NotAllowed|NotFound|NotSupported|Overconstrained/i.test(m.text())) errors.push(`[${deviceName}] console: ${m.text()}`); });
    const shot = (n) => page.screenshot({ path: path.join(outDir, `${tag}-${n}.png`), fullPage: true });
    const tap = (sel) => page.locator(sel).first().tap({ timeout: 10000 });
    const closeModals = () => page.evaluate(() => document.querySelectorAll('.modal-back').forEach((m) => m.remove()));

    await step(`${deviceName}: home loads`, async () => {
      await page.goto(base + '/');
      await page.waitForSelector('.hero', { timeout: 15000 });
      const nav = await page.locator('.nav a').count();
      await shot('home');
      return `${nav} nav items`;
    });
    await step(`${deviceName}: install guide offered`, async () => {
      await page.waitForSelector('#installHint:not(.hidden) [data-guide]', { timeout: 5000 });
      await tap('#installHint [data-guide]');
      await page.waitForSelector('.install-steps li', { timeout: 5000 });
      const text = await page.textContent('.install-steps');
      if (!/Add to Home Screen/.test(text)) throw new Error('guide text missing');
      await shot('install-guide');
      await closeModals();
    });
    await step(`${deviceName}: no horizontal scrolling`, async () => {
      for (const v of ['home', 'studio', 'songs', 'songs?id=pd-amazing-grace', 'learn', 'insights', 'games', 'metronome', 'tuner', 'progress', 'classroom']) {
        await page.goto(base + '/#/' + v);
        await page.waitForTimeout(250);
        const over = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
        if (over > 2) throw new Error(`${v} overflows by ${over}px`);
        await shot(v.replace(/\W+/g, '-'));
      }
    });
    if (deviceName === 'iPhone 13') {
      await step('iPhone 13: "More" opens every page', async () => {
        await page.waitForSelector('#navMore', { timeout: 5000 });
        await page.evaluate(() => document.querySelector('#navMore').click()); // fixed bottom bar
        await page.waitForSelector('.more-item', { timeout: 3000 });
        const n = await page.locator('.more-item').count();
        await page.locator('.more-item[href="#/toolkit"]').click();
        await page.waitForSelector('#tkTabs', { timeout: 5000 });
        if (n < 6) throw new Error('only ' + n + ' extra pages');
        return n + ' more pages';
      });
    }
    if (deviceName !== 'iPad Pro 11') { await ctx.close(); continue; }

    await step('studio: guitar demo loads & analyses', async () => {
      await page.goto(base + '/#/studio');
      await tap('.mobile-inst [data-inst="guitar"]');
      await page.waitForTimeout(300);
      await tap('[data-demo]');
      await page.waitForSelector('#tl', { timeout: 30000 });
      return (await page.textContent('.chips')).replace(/\s+/g, ' ').trim();
    });
    await step('studio: count-in then song plays (iOS gesture rules)', async () => {
      await tap('#playBtn');
      await page.waitForTimeout(4500);
      const t = await page.evaluate(() => PM.App.player.time);
      const playing = await page.evaluate(() => PM.App.player.playing);
      await shot('studio-playing');
      if (!(t > 0.3) || !playing) throw new Error(`player time ${t}, playing ${playing}`);
      await tap('#playBtn');
      return `t=${t.toFixed(2)}s`;
    });
    await step('studio: backing-track mix (no guitar)', async () => {
      await tap('.presets [data-p="rhythm"]');
      await page.waitForTimeout(1200);
      const preset = await page.evaluate(() => PM.App.track.mixPreset);
      if (preset !== 'rhythm') throw new Error('preset ' + preset);
    });
    await step('studio: listening without a mic fails gracefully', async () => {
      await tap('#listenBtn');
      await page.waitForTimeout(1500);
      const state = await page.textContent('#coachState');
      if (state === 'listening') await tap('#listenBtn');
      await closeModals();
      return 'coach: ' + state;
    });
    await step('improvise mode with generated backing track', async () => {
      await tap('#modeSeg [data-mode="improv"]');
      await page.waitForTimeout(300);
      await tap('#changeTrack');
      await page.waitForSelector('#backingBox button.primary', { timeout: 10000 });
      await tap('#backingBox button.primary');
      await page.waitForSelector('#tl', { timeout: 30000 });
      await closeModals();
      await shot('improv');
      await tap('#modeSeg [data-mode="part"]');
    });
    await step('songs: hymn chart, transpose, backing band follows the words', async () => {
      await page.goto(base + '/#/songs?id=pd-amazing-grace');
      await page.waitForSelector('.cp-line', { timeout: 10000 });
      await tap('[data-t="1"]');
      const key = await page.textContent('#kChip');
      await tap('#bandBtn');
      await page.waitForSelector('#bPlay', { timeout: 30000 });
      await tap('#bPlay');
      await page.waitForTimeout(4500);
      const t = await page.evaluate(() => PM.App.player.time);
      const now = await page.$('.cp-line.now');
      await shot('song-playing');
      await tap('#bpToggle');
      if (!(t > 0.5)) throw new Error('band did not play: ' + t + ' ' + JSON.stringify(await page.evaluate(() => { const e = PM.App.player.el; return { rs: e.readyState, paused: e.paused, err: e.error && e.error.code, dur: e.duration, ns: e.networkState }; })));
      if (!now) throw new Error('lyrics did not follow the band');
      return key + `, t=${t.toFixed(1)}s`;
    });
    await step('record panel without a mic fails gracefully', async () => {
      await tap('#recBtn');
      await page.waitForSelector('#rBtn', { timeout: 5000 });
      await tap('#rBtn');
      await page.waitForTimeout(1500);
      const msg = await page.textContent('#rMsg');
      await shot('recorder');
      await closeModals();
      return msg || 'recording started';
    });
    await step('learn: note-names quiz and scale trainer', async () => {
      await page.goto(base + '/#/learn');
      await tap('[data-a="notes"]');
      for (let i = 0; i < 3; i++) { await tap('[data-l="E"]'); await page.waitForTimeout(1200); }
      const r = await page.textContent('#nR');
      await tap('[data-a="scales"]');
      await page.waitForSelector('#paLane', { timeout: 5000 });
      await shot('learn-scales');
      await tap('[data-a="sight"]');
      await page.waitForSelector('.staff', { timeout: 5000 });
      await shot('learn-sight');
      return 'round ' + r;
    });
    await step('exercise path: open an exercise, listen to the reference', async () => {
      await page.goto(base + '/#/learn');
      await tap('[data-a="path"]');
      await page.waitForSelector('.path-item', { timeout: 5000 });
      const n = await page.locator('.path-item').count();
      await tap('.path-item');
      await page.waitForSelector('#paGo', { timeout: 5000 });
      await tap('#paListen');
      await page.waitForTimeout(800);
      await shot('exercise-path');
      if (n < 50) throw new Error('only ' + n + ' exercises');
      return n + ' exercises';
    });
    await step('styles: groove plays with Main B and accompaniment', async () => {
      await page.goto(base + '/#/metronome');
      await tap('#mTabs [data-t="styles"]');
      await page.waitForSelector('.style-item', { timeout: 5000 });
      await tap('[data-st="gospel-praise"]');
      await tap('#rPlay');
      await page.waitForTimeout(1200);
      await tap('[data-sec="B"]');
      await page.waitForTimeout(2500);
      const q = await page.evaluate(() => PM.App.sequencer.running && PM.App.sequencer.queue.length);
      await shot('styles');
      await tap('#rPlay');
      if (!q) throw new Error('sequencer not running');
      return q + ' steps scheduled';
    });
    await step('beat maker grid', async () => {
      await tap('#mTabs [data-t="beats"]');
      await page.waitForSelector('.sq-cell', { timeout: 5000 });
      await tap('.sq-row[data-v="clap"] .sq-cell');
      await shot('beat-maker');
    });
    await step('Cadi answers a question', async () => {
      await page.evaluate(() => document.querySelectorAll('.cadi-bubble').forEach((b) => b.classList.add('hidden')));
      await tap('#cadiFab');
      await page.fill('#cadiQ', 'notes in G major');
      await page.press('#cadiQ', 'Enter');
      await page.waitForTimeout(700);
      const t = await page.locator('.cadi-msg.cadi').last().textContent();
      await tap('#cadiClose');
      if (!/F#/.test(t)) throw new Error('unexpected answer: ' + t);
    });
    await step('insights render', async () => {
      await page.evaluate(() => { window.__smokeMark = 1; });
      const pre = await page.evaluate(() => (PM.App.track ? 'track "' + PM.App.track.name + '"' : 'no track') + ' at ' + location.hash);
      await page.goto(base + '/#/insights');
      try { await page.waitForSelector('#dyn', { timeout: 10000 }); }
      catch (e) {
        const post = await page.evaluate(() => `${window.__smokeMark ? 'same page' : 'PAGE RELOADED'}, ${PM.App.track ? 'track "' + PM.App.track.name + '" analysis ' + !!PM.App.track.analysis : 'no track'}, view ${PM.App.currentView}`);
        throw new Error(`no #dyn — before: ${pre}; after: ${post}`);
      }
      await shot('insights');
    });
    await step('studio: navigate the song (sections, next chord, track switcher, mini transport)', async () => {
      await page.goto(base + '/#/studio');
      await page.waitForSelector('#tl', { timeout: 10000 });
      const before = await page.evaluate(() => PM.App.player.time);
      await tap('#nextChord');
      await page.waitForTimeout(300);
      const after = await page.evaluate(() => PM.App.player.time);
      const tracks = await page.locator('#trackSw option').count();
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(500);
      const mini = await page.evaluate(() => { const m = document.querySelector('.mini-transport'); return m && !m.classList.contains('hidden'); });
      await shot('studio-mini-transport');
      await page.evaluate(() => window.scrollTo(0, 0));
      if (!(after > before)) throw new Error(`next chord did not move (${before} → ${after})`);
      if (tracks < 2) throw new Error('track switcher empty');
      if (!mini) throw new Error('mini transport not shown when scrolled');
      // switch back to the first saved track through the switcher
      const id = await page.evaluate(() => [...document.querySelectorAll('#trackSw option')].find((o) => o.value && !o.disabled).value);
      await page.selectOption('#trackSw', id);
      await page.waitForFunction((x) => PM.App.track && PM.App.track.id === x, id, { timeout: 30000 });
      return `${tracks - 1} saved tracks, chord step ${before.toFixed(2)}→${after.toFixed(2)}s`;
    });
    await step('a reload reopens the song you had open (iOS tab reloads)', async () => {
      const before = await page.evaluate(() => PM.App.track && PM.App.track.name);
      await page.goto(base + '/#/insights');
      await page.reload();
      await page.waitForFunction((n) => PM.App.track && PM.App.track.name === n, before, { timeout: 20000 });
      await page.waitForSelector('#dyn', { timeout: 10000 });
      return 'reopened “' + before + '”';
    });
    await step('voice: sing-along demo with vocal stem, pitch trail and karaoke mix', async () => {
      await page.goto(base + '/#/studio');
      await tap('.mobile-inst [data-inst="voice"]');
      await page.waitForTimeout(300);
      if (await page.locator('#changeTrack').count()) { await tap('#changeTrack'); await page.waitForTimeout(300); }
      await tap('[data-demo]');
      await page.waitForFunction(() => PM.App.track && PM.App.track.stemsReady && document.querySelector('#tl'), null, { timeout: 30000 });
      await page.waitForSelector('#karaoke', { timeout: 10000 });
      await closeModals(); // level-up celebration after the analysis XP
      const part = await page.evaluate(() => PM.App.track.partStem);
      const targets = await page.evaluate(() => (PM.App.track.analysis.part ? PM.App.track.analysis.part.notes.length : 0));
      await tap('#karaoke');
      await page.waitForTimeout(1200);
      const g = await page.evaluate(() => PM.App.track.gains.vocals);
      await page.evaluate(() => window.scrollTo(0, 0));
      await tap('#playBtn');
      await page.waitForTimeout(4200);
      await shot('voice-studio');
      await tap('#playBtn');
      if (part !== 'vocals' || !targets) throw new Error(`part ${part}, ${targets} target notes`);
      if (g !== 0) throw new Error('vocals not muted: ' + g);
      return `${targets} melody notes to sing`;
    });
    await step('voice: vocal exercise path and voice types', async () => {
      await page.goto(base + '/#/learn');
      await closeModals();
      await tap('#vType [data-v="tenor"]');
      await page.waitForTimeout(300);
      await tap('[data-a="path"]');
      await page.waitForSelector('.path-item', { timeout: 5000 });
      const n = await page.locator('.path-item').count();
      const titles = await page.locator('.path-item b').allTextContents();
      await tap('.path-item');
      await page.waitForSelector('#paGo', { timeout: 5000 });
      await shot('voice-path');
      if (n < 50) throw new Error('only ' + n + ' vocal exercises');
      if (!titles.some((t) => /Lip trill/.test(t))) throw new Error('no lip trills');
      const range = await page.evaluate(() => PM.Learn.RANGE.voice.type);
      if (range !== 'tenor') throw new Error('voice type not applied');
      return n + ' vocal exercises (tenor)';
    });
    await step('voice: insights show melody, voice fit and song map', async () => {
      await page.goto(base + '/#/insights');
      await page.waitForSelector('#dyn', { timeout: 10000 });
      const txt = await page.textContent('#body');
      await shot('voice-insights');
      if (!/For your voice/.test(txt)) throw new Error('no voice section');
      if (!/Melody, voicings/.test(txt)) throw new Error('no melody section');
    });
    await step('worship library: Bethel chart, guitar & piano tutorial, groove hand-off', async () => {
      await page.goto(base + '/#/songs');
      await page.waitForSelector('#sgCol', { timeout: 5000 });
      await tap('#sgCol [data-c="Bethel Music"]');
      const n = await page.locator('.song-card').count();
      await page.goto(base + '/#/songs?id=wl-goodness-of-god');
      await page.waitForSelector('.cp-bar', { timeout: 5000 });
      await page.waitForSelector('.tutorial', { timeout: 5000 });
      await tap('#tutSeg [data-v="piano"]');
      await page.waitForSelector('.tut-voicing', { timeout: 3000 });
      await shot('worship-tutorial');
      await tap('#tutSeg [data-v="guitar"]');
      const steps = await page.locator('.tut-steps li').count();
      await tap('#tutGroove');
      await page.waitForSelector('.style-item', { timeout: 5000 });
      const style = await page.evaluate(() => PM.App.sequencer && PM.App.sequencer.style && PM.App.sequencer.style.id);
      if (n < 4) throw new Error('only ' + n + ' Bethel songs');
      if (steps < 6) throw new Error('tutorial steps ' + steps);
      return `${n} Bethel songs · ${steps} tutorial steps · groove ${style}`;
    });
    await step('Tamil worship patterns render', async () => {
      await page.goto(base + '/#/songs?id=ta-keharwa-praise');
      await page.waitForSelector('.cp-bar', { timeout: 5000 });
      const h = await page.textContent('.cp-section');
      if (!/பல்லவி/.test(h)) throw new Error('section label ' + h);
    });
    await step('kids: plan, tap-the-colours lesson, stars and sticker book', async () => {
      await page.goto(base + '/#/kids');
      await page.waitForSelector('.plan-card', { timeout: 5000 });
      await closeModals();
      await tap('#kTrack [data-t="piano"]');
      const before = await page.evaluate(() => PM.App.game.state.kids.stars);
      await tap('.kid-tile[data-l="p3"]');
      await page.waitForSelector('#kOk', { timeout: 5000 });
      await shot('kids-step');
      await tap('#kOk');
      for (const m of [60, 62, 64, 62, 60]) { await tap(`.ck[data-m="${m}"]`); await page.waitForTimeout(120); }
      await page.waitForSelector('.kp-done', { timeout: 5000 });
      await shot('kids-done');
      await page.evaluate(() => document.querySelectorAll('.modal-back').forEach((m) => m.remove()));
      const after = await page.evaluate(() => PM.App.game.state.kids.stars);
      if (!(after > before)) throw new Error('no stars');
      return `${after - before} stars`;
    });
    await step('kids: tap-along beat and breathing break', async () => {
      await page.goto(base + '/#/kids');
      await tap('#kTrack [data-t="rhythm"]');
      await tap('.kid-tile[data-l="r1"]');
      await tap('#kOk');
      await tap('#kStart');
      const beat = 60 / 70;
      await page.waitForTimeout(300 + 4 * beat * 1000);
      for (let i = 0; i < 8; i++) { await page.locator('#kPad').dispatchEvent('pointerdown'); await page.waitForTimeout(beat * 1000); }
      await page.waitForSelector('#kNext', { timeout: 6000 });
      const res = await page.textContent('.kp-say h2');
      await tap('#kNext');
      await page.waitForSelector('.kp-done', { timeout: 5000 });
      await page.evaluate(() => document.querySelectorAll('.modal-back').forEach((m) => m.remove()));
      await tap('#kBreathe');
      await page.waitForSelector('.bubble', { timeout: 3000 });
      await page.waitForTimeout(2500);
      await shot('kids-breathe');
      await page.evaluate(() => document.querySelectorAll('.modal-back').forEach((m) => m.remove()));
      return res;
    });
    await step('appearance: ocean theme, dark mode, readable font', async () => {
      await page.goto(base + '/#/progress');
      await page.waitForSelector('#appearance .theme-sw', { timeout: 5000 });
      await page.locator('[data-theme-id="ocean"]').evaluate((e) => e.scrollIntoView({ block: 'center' }));
      await tap('[data-theme-id="ocean"]');
      await tap('#apMode [data-v="dark"]');
      await tap('[data-font-id="readable"]');
      const d = await page.evaluate(() => ({ ...document.documentElement.dataset, bg: getComputedStyle(document.body).backgroundColor, family: getComputedStyle(document.body).fontFamily }));
      await page.goto(base + '/#/kids');
      await page.waitForSelector('.plan-card', { timeout: 5000 });
      await shot('dark-ocean-kids');
      await page.goto(base + '/#/songs?id=wl-goodness-of-god');
      await page.waitForSelector('.tutorial', { timeout: 5000 });
      await shot('dark-ocean-song');
      await page.reload();
      await page.waitForSelector('.tutorial', { timeout: 10000 });
      const kept = await page.evaluate(() => document.documentElement.dataset.theme + '/' + document.documentElement.dataset.mode);
      // back to the defaults for the remaining steps
      await page.evaluate(() => { PM.App.settings.appearance = {}; PM.App.saveSettings(); PM.Theme.apply(PM.App.settings); });
      if (d.theme !== 'ocean' || d.mode !== 'dark' || d.font !== 'readable') throw new Error(JSON.stringify(d));
      if (kept !== 'ocean/dark') throw new Error('not kept after reload: ' + kept);
      return `${d.bg} · ${d.family.split(',')[0]}`;
    });
    await step('harmony: path quiz, hymn parts trainer and part switching', async () => {
      await page.goto(base + '/#/learn');
      await page.waitForSelector('[data-a="harmony"]', { timeout: 5000 });
      await tap('[data-a="harmony"]');
      await page.waitForSelector('#hRoll', { timeout: 5000 });
      await tap('[data-l="what"]');
      await tap('#hQ');
      await page.waitForSelector('[data-a="yes"]', { timeout: 3000 });
      await tap('[data-a="yes"]');
      await page.waitForTimeout(800);
      await tap('#hTrainer [data-piece="amazing-grace"]');
      await tap('#hPart [data-p="T"]');
      await tap('[data-mode="listen"]');
      await page.waitForTimeout(6500);
      const chord = await page.textContent('#hChord');
      await shot('harmony-trainer');
      await tap('#hStopT');
      const parts = await page.locator('#hPart [data-p]').count();
      if (parts !== 4) throw new Error('parts ' + parts);
      if (!/[A-G]/.test(chord)) throw new Error('no chord shown: ' + chord);
      return chord.replace(/\s+/g, ' ').trim().slice(0, 60);
    });
    await step('hymn page links to the parts trainer', async () => {
      await page.goto(base + '/#/songs?id=pd-amazing-grace');
      await page.waitForSelector('.h-cta', { timeout: 5000 });
      await tap('.h-cta');
      await page.waitForSelector('#hRoll', { timeout: 5000 });
      const on = await page.textContent('.h-piece.on b');
      if (!/Amazing/.test(on)) throw new Error('opened ' + on);
    });
    await step('back & forward: pages, scroll position, dialogs and the page bar', async () => {
      await page.goto(base + '/#/home');
      await page.waitForFunction(() => PM.App.currentView === 'home', null, { timeout: 5000 }).catch(async () => { throw new Error('home did not render: ' + await page.evaluate(() => location.hash + ' / ' + PM.App.currentView)); });
      await closeModals();
      await page.waitForTimeout(450); // let the page transition finish
      const hit = await page.evaluate(() => { const a = document.querySelector('.nav a[data-id="songs"]'); const r = a.getBoundingClientRect(); const e = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2); const sb = document.querySelector('.sidebar'); const cs = getComputedStyle(sb); return { ok: a.contains(e), hit: e && (e.tagName + '.' + e.className), r: [Math.round(r.y), innerHeight], sb: [cs.position, cs.zIndex, cs.display, cs.transform, cs.opacity], app: getComputedStyle(document.querySelector('#app')).zoom, html: document.documentElement.dataset }; });
      if (!hit.ok) throw new Error('nav covered: ' + JSON.stringify(hit));
      await page.evaluate(() => document.querySelector('.nav a[data-id="songs"]').click()); // the bar is fixed: no scroll-into-view
      await page.waitForSelector('.song-card', { timeout: 5000 });
      await page.evaluate(() => window.scrollTo(0, 900));
      await page.waitForTimeout(150);
      const y0 = await page.evaluate(() => Math.round(window.scrollY));
      await page.evaluate(() => document.querySelector('.song-card[href*="wl-way-maker"]').click()); // leave from exactly this scroll position
      await page.waitForSelector('.tutorial', { timeout: 5000 });
      const atTop = await page.evaluate(() => window.scrollY);
      await page.evaluate(() => PM.Theme.openModal(PM.App));
      await page.waitForSelector('.modal-back', { timeout: 2000 });
      await page.goBack(); // browser / system Back while a dialog is open
      await page.waitForSelector('.song-card', { timeout: 5000 });
      await page.waitForTimeout(400);
      const y1 = await page.evaluate(() => Math.round(window.scrollY));
      const modals = await page.locator('.modal-back:not(.closing)').count();
      const view1 = await page.evaluate(() => PM.App.currentView + location.hash);
      await page.click('#pbFwd'); // the in-app forward button
      await page.waitForSelector('.tutorial', { timeout: 5000 });
      const view2 = await page.evaluate(() => location.hash);
      await page.goBack(); await page.goBack();
      await page.waitForTimeout(300);
      const view3 = await page.evaluate(() => PM.App.currentView);
      for (let i = 0; i < 4; i++) { await page.goForward(); await page.goBack(); }
      await page.waitForTimeout(500);
      const view4 = await page.evaluate(() => PM.App.currentView + ' ' + document.querySelectorAll('#view > *').length);
      await shot('nav-back');
      const actives = await page.locator('.nav a.active').count();
      if (actives !== 1) throw new Error(actives + ' nav items highlighted');
      if (atTop > 5) throw new Error('new page did not start at the top: ' + atTop);
      if (Math.abs(y1 - y0) > 40) throw new Error(`scroll not restored: ${y0} → ${y1}`);
      if (modals) throw new Error('dialog left open after Back');
      if (!/songs#\/songs$/.test(view1)) throw new Error('back went to ' + view1);
      if (!/wl-way-maker/.test(view2)) throw new Error('forward went to ' + view2);
      if (view3 !== 'home') throw new Error('back×2 went to ' + view3);
      return `scroll ${y0}→${y1}, rapid back/forward ended on ${view4}`;
    });
    await step('academy: subjects, a lesson with examples, practice quiz and stars', async () => {
      await page.goto(base + '/#/academy');
      await page.waitForSelector('.ak-subject', { timeout: 5000 });
      const subjects = await page.locator('.ak-subject').count();
      await page.evaluate(() => document.querySelector('.ak-subject[href*="s=chords"]').click());
      await page.waitForSelector('.ak-row', { timeout: 5000 });
      await page.evaluate(() => document.querySelector('.ak-row[href*="l=c1"]').click());
      await page.waitForSelector('.ak-lesson', { timeout: 5000 });
      await tap('[data-ex]');
      let answered = 0;
      for (let i = 0; i < 12 && !(await page.$('.ak-result')); i++) {
        const right = await page.evaluate(() => { const q = document.querySelector('.ak-prompt'); return q ? q.textContent : ''; });
        // answer by trying options until one is accepted (the quiz never punishes retries)
        for (let k = 0; k < 4; k++) {
          const opt = page.locator('.ak-opt:not([disabled])').first();
          if (!(await opt.count())) break;
          await opt.click();
          await page.waitForTimeout(120);
          if (await page.$('.ak-opt.ok')) break;
        }
        answered++; void right;
        await page.waitForTimeout(900);
      }
      await page.waitForSelector('.ak-result', { timeout: 5000 });
      await shot('academy-lesson');
      const best = await page.evaluate(() => PM.App.game.state.academy.best.c1);
      if (subjects < 12) throw new Error('subjects ' + subjects);
      if (best == null) throw new Error('score not saved');
      return `${subjects} subjects · ${answered} questions · best ${Math.round(best * 100)}%`;
    });
    await step('academy: placement quiz recommends a level', async () => {
      await page.goto(base + '/#/academy?placement=1');
      await page.waitForSelector('.ak-opt', { timeout: 5000 });
      for (let i = 0; i < 8; i++) { await page.waitForSelector('#plSkip', { timeout: 3000 }); await tap('#plSkip'); }
      await page.waitForSelector('.ak-result', { timeout: 3000 });
      const t = await page.textContent('.ak-result h2');
      if (!/Beginner/.test(t)) throw new Error(t);
      return t;
    });
    await step('toolkit: chord dictionary, scale finder, circle of fifths, transposer, glossary', async () => {
      await page.goto(base + '/#/toolkit');
      await page.waitForSelector('#tkR', { timeout: 5000 });
      await page.selectOption('#tkR', '7');
      await page.selectOption('#tkT', 'm7');
      const chord = await page.textContent('.tk-chord h2');
      await tap('#tkTabs [data-t="scales"]');
      await page.waitForSelector('#tkSS', { timeout: 3000 });
      await page.selectOption('#tkSS', 'minpent');
      await tap('#tkTabs [data-t="circle"]');
      await page.waitForSelector('.tk-node', { timeout: 3000 });
      await page.locator('.tk-node[data-pc="2"]').click();
      const key = await page.textContent('.tk-circle-wrap h2');
      await shot('toolkit-circle');
      await tap('#tkTabs [data-t="transpose"]');
      await page.fill('#tkTx', 'G D/F# Em C');
      await tap('#tkUp'); await tap('#tkUp');
      const out = await page.textContent('#tkOut');
      await tap('#tkTabs [data-t="glossary"]');
      await page.fill('#tkG', 'capo');
      const gl = await page.locator('.tk-gloss dt').count();
      if (!/Gm7/.test(chord)) throw new Error('chord ' + chord);
      if (!/D major/.test(key)) throw new Error('key ' + key);
      if (!/A E\/G# F#m D/.test(out.trim())) throw new Error('transpose ' + out);
      if (gl < 1) throw new Error('glossary');
      return `${chord.trim()} · ${key.trim()} · ${out.trim()}`;
    });
    await step('planner: routine for the chosen time and focus, guided timer', async () => {
      await page.goto(base + '/#/planner');
      await page.waitForSelector('.pl-block', { timeout: 5000 });
      await tap('#plMin [data-m="30"]');
      await tap('#plFocus [data-f="theory"]');
      const mins = await page.evaluate(() => [...document.querySelectorAll('.pl-min')].reduce((a, e) => a + parseInt(e.textContent, 10), 0));
      await tap('#plGo');
      await page.waitForSelector('.pl-run .vt-svg', { timeout: 3000 });
      await tap('#plNext');
      await page.waitForTimeout(250);
      const second = await page.textContent('.modal-back:not(.closing) .pl-run h2');
      await shot('planner');
      await closeModals();
      if (mins !== 30) throw new Error('minutes ' + mins);
      return `30-minute plan · second block: ${second.trim()}`;
    });
    await step('ear trainer game', async () => {
      await page.goto(base + '/#/games');
      await tap('[data-g="ear-trainer"]');
      for (let i = 0; i < 2; i++) { await page.waitForSelector('[data-t]:not([disabled])', { timeout: 8000 }); await tap('[data-t]:not([disabled])'); await page.waitForTimeout(1500); }
      await tap('#gQuit');
      await closeModals();
    });
    await step('metronome starts and ticks', async () => {
      await page.goto(base + '/#/metronome');
      await tap('#mTabs [data-t="click"]');
      await tap('#startBtn');
      await page.waitForTimeout(1500);
      const ticks = await page.evaluate(() => PM.App.metronome.queue.length);
      await tap('#startBtn');
      if (!ticks) throw new Error('no ticks scheduled');
      return ticks + ' ticks';
    });
    await step('classroom: master setup, add student, sign-in remembered', async () => {
      await page.goto(base + '/#/classroom');
      await page.waitForSelector('#joinSeg [data-t="setup"]:not(.hidden)', { timeout: 10000 });
      await page.fill('#jSchool', 'iPad Studio'); await page.fill('#jName', 'Teacher'); await page.fill('#jUser', 'teach'); await page.fill('#jPass', 'supersecret');
      await tap('#jGo');
      await page.waitForSelector('#tTabs', { timeout: 10000 });
      await page.reload();
      await page.waitForSelector('#tTabs', { timeout: 10000 });
      await shot('classroom');
      return 'still signed in after reload';
    });
    await step('teacher adds a song with a chord PDF; PDF renders (pdf.js on Safari)', async () => {
      const pdf = path.join(outDir, 'chords.pdf');
      fs.writeFileSync(pdf, tinyPdf());
      await page.goto(base + '/#/songs');
      await tap('#sgAdd');
      await page.fill('#eTitle', 'இயேசு நல்லவர்');
      await page.selectOption('#eLang', 'Tamil');
      await page.fill('#eChart', '[D]இயேசு நல்லவர் [G]இயேசு [D]வல்லவர்');
      await page.setInputFiles('#eFiles', pdf);
      await tap('#eSave');
      await page.waitForSelector('#atts [data-att]', { timeout: 15000 });
      await tap('#atts [data-att]');
      await page.waitForSelector('canvas.pdf-page', { timeout: 20000 });
      await shot('pdf-viewer');
      await closeModals();
    });
    await step('service worker installed', async () => {
      const ok = await page.evaluate(() => Promise.race([navigator.serviceWorker.ready.then(() => true), new Promise((r) => setTimeout(() => r(false), 15000))]));
      if (!ok) throw new Error('service worker not ready');
      await page.reload();
      await page.waitForTimeout(500);
      return 'controlled: ' + (await page.evaluate(() => !!navigator.serviceWorker.controller));
    });
    await step('works offline (reload with network off)', async () => {
      await ctx.setOffline(true);
      await page.goto(base + '/#/home');
      await page.waitForSelector('.hero', { timeout: 15000 });
      await page.goto(base + '/#/studio');
      await page.waitForSelector('#listenBtn', { timeout: 10000 });
      await ctx.setOffline(false);
    });
    await ctx.close();
  }

  await browser.close();
  server.close();
  if (errors.length) { failed = true; console.log('Page errors:\n' + errors.join('\n')); }
  fs.writeFileSync(path.join(outDir, 'results.json'), JSON.stringify({ engine, results, errors }, null, 2));
  console.log(failed ? `FAILED (${engine})` : `ALL PASSED (${engine})`);
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
