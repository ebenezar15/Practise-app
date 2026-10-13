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
  const step = async (name, fn) => {
    try { const info = await fn(); results.push({ step: name, ok: true, info: info || '' }); console.log(`✓ ${name}${info ? ' — ' + info : ''}`); }
    catch (e) { failed = true; results.push({ step: name, ok: false, info: e.message }); console.log(`✗ ${name} — ${e.message.split('\n')[0]}`); }
  };

  for (const deviceName of ['iPad Pro 11', 'iPad Pro 11 landscape', 'iPhone 13']) {
    const device = pw.devices[deviceName];
    const ctx = await browser.newContext(Object.assign({}, device, engine === 'chromium' ? { defaultBrowserType: undefined } : {}));
    const page = await ctx.newPage();
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
      await tap('#bPlay');
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
      await page.goto(base + '/#/insights');
      await page.waitForSelector('#dyn', { timeout: 10000 });
      await shot('insights');
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
