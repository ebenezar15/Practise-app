/* Cadenza — conflict-free merge of practice progress between devices and the classroom
 * server. Used by the browser/desktop app and by server/server.js. Merging is commutative
 * and idempotent: counters take the max, badges/history/days are unions. */
(function (root) {
  'use strict';
  const PM = (root.PM = root.PM || {});

  const xpForLevel = (lvl) => Math.round(150 * Math.pow(lvl, 1.45));
  function totalXp(s) {
    let t = s.xp || 0;
    for (let l = 1; l < (s.level || 1); l++) t += xpForLevel(l);
    return t;
  }

  function mergeProgress(a, b) {
    if (!a) return b ? JSON.parse(JSON.stringify(b)) : null;
    if (!b) return JSON.parse(JSON.stringify(a));
    const out = Object.assign({}, a, b);
    const hi = totalXp(a) >= totalXp(b) ? a : b;
    out.xp = hi.xp; out.level = hi.level;
    for (const k of ['sessions', 'totalSeconds', 'bestStreak', 'songsAnalyzed', 'chordsNailed', 'bestCombo', 'threeStars', 'challengesDone', 'maxTrainerBpm', 'improvSessions', 'assignmentsDone']) {
      out[k] = Math.max(a[k] || 0, b[k] || 0);
    }
    // streak follows whichever device practised most recently
    const la = a.lastDay || '', lb = b.lastDay || '';
    const recent = la >= lb ? a : b;
    out.lastDay = recent.lastDay || null;
    out.streak = la === lb ? Math.max(a.streak || 0, b.streak || 0) : recent.streak || 0;
    out.instruments = {};
    for (const k of new Set([...Object.keys(a.instruments || {}), ...Object.keys(b.instruments || {})])) out.instruments[k] = Math.max((a.instruments || {})[k] || 0, (b.instruments || {})[k] || 0);
    out.badges = Object.assign({}, a.badges);
    for (const [k, v] of Object.entries(b.badges || {})) if (!out.badges[k] || v < out.badges[k]) out.badges[k] = v;
    out.days = Object.assign({}, a.days);
    for (const [k, v] of Object.entries(b.days || {})) out.days[k] = Math.max(out.days[k] || 0, v);
    out.highScores = Object.assign({}, a.highScores);
    for (const [k, v] of Object.entries(b.highScores || {})) out.highScores[k] = Math.max(out.highScores[k] || 0, v);
    const seen = new Map();
    for (const h of [...(a.history || []), ...(b.history || [])]) {
      const id = h.id || h.date + '|' + h.mode + '|' + h.seconds;
      if (!seen.has(id)) seen.set(id, h);
    }
    out.history = [...seen.values()].sort((x, y) => (x.date < y.date ? 1 : -1)).slice(0, 200);
    const da = a.daily, db = b.daily;
    out.daily = !da ? db : !db ? da : da.day !== db.day ? (da.day > db.day ? da : db) : Object.assign({}, da, { progress: Math.max(da.progress || 0, db.progress || 0), done: !!(da.done || db.done) });
    // exercise-path results: keep the best of each exercise
    out.path = Object.assign({}, a.path);
    for (const [k, v] of Object.entries(b.path || {})) {
      const o = out.path[k];
      out.path[k] = !o ? v : { best: Math.max(o.best || 0, v.best || 0), stars: Math.max(o.stars || 0, v.stars || 0), bpm: Math.max(o.bpm || 0, v.bpm || 0), takes: Math.max(o.takes || 0, v.takes || 0), last: (o.last || '') > (v.last || '') ? o.last : v.last };
    }
    out.name = b.name || a.name || '';
    out.dailyGoalMinutes = b.dailyGoalMinutes || a.dailyGoalMinutes;
    return out;
  }

  PM.SyncMerge = { mergeProgress, totalXp };
  if (typeof module !== 'undefined' && module.exports) module.exports = PM.SyncMerge;
})(typeof self !== 'undefined' ? self : globalThis);
