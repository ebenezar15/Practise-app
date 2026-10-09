/* Cadenza — gamification: XP, levels, streaks, badges and daily challenges.
 * Persists to localStorage (or any injected storage with getItem/setItem). */
(function (root) {
  'use strict';
  const PM = (root.PM = root.PM || {});
  const KEY = 'cadenza.progress.v1';

  const TITLES = ['Beginner', 'Novice', 'Apprentice', 'Rising Star', 'Performer', 'Skilled Player', 'Adept', 'Expert', 'Maestro', 'Virtuoso', 'Legend'];
  const xpForLevel = (lvl) => Math.round(150 * Math.pow(lvl, 1.45)); // XP needed to go from lvl → lvl+1

  const BADGES = [
    { id: 'first-note', icon: '🎵', name: 'First Note', desc: 'Complete your first practice session', check: (s) => s.sessions >= 1 },
    { id: 'streak-3', icon: '🔥', name: 'On Fire', desc: 'Practise 3 days in a row', check: (s) => s.bestStreak >= 3 },
    { id: 'streak-7', icon: '🌟', name: 'Week Warrior', desc: 'Practise 7 days in a row', check: (s) => s.bestStreak >= 7 },
    { id: 'streak-30', icon: '👑', name: 'Unstoppable', desc: '30-day practice streak', check: (s) => s.bestStreak >= 30 },
    { id: 'hour', icon: '⏱️', name: 'Hour of Power', desc: 'Practise 60 minutes in total', check: (s) => s.totalSeconds >= 3600 },
    { id: 'ten-hours', icon: '🏔️', name: 'Dedicated', desc: 'Practise 10 hours in total', check: (s) => s.totalSeconds >= 36000 },
    { id: 'analyst', icon: '🔬', name: 'Song Detective', desc: 'Analyse your first song', check: (s) => s.songsAnalyzed >= 1 },
    { id: 'library', icon: '📚', name: 'Collector', desc: 'Analyse 10 songs', check: (s) => s.songsAnalyzed >= 10 },
    { id: 'chord-50', icon: '🎸', name: 'Chord Crafter', desc: 'Nail 50 chords', check: (s) => s.chordsNailed >= 50 },
    { id: 'chord-500', icon: '💎', name: 'Harmony Master', desc: 'Nail 500 chords', check: (s) => s.chordsNailed >= 500 },
    { id: 'combo-25', icon: '⚡', name: 'Combo Breaker', desc: 'Reach a 25× combo', check: (s) => s.bestCombo >= 25 },
    { id: 'combo-100', icon: '🌈', name: 'Flow State', desc: 'Reach a 100× combo', check: (s) => s.bestCombo >= 100 },
    { id: 'perfect', icon: '🏆', name: 'Three Stars', desc: 'Earn 3 stars in a session', check: (s) => s.threeStars >= 1 },
    { id: 'timing', icon: '🎯', name: 'Human Metronome', desc: '90%+ timing accuracy in a session', check: (s, x) => x && x.timingAccuracy != null && x.timingAccuracy >= 0.9 && x.onsets >= 20 },
    { id: 'both', icon: '🎹', name: 'Multi-Instrumentalist', desc: 'Practise two or more instruments', check: (s) => Object.values(s.instruments).filter((x) => x > 0).length >= 2 },
    { id: 'improviser', icon: '🎷', name: 'Improviser', desc: 'Complete an improvisation session', check: (s) => s.improvSessions >= 1 },
    { id: 'homework', icon: '📝', name: 'Homework Hero', desc: 'Complete 5 assignments from your teacher', check: (s) => s.assignmentsDone >= 5 },
    { id: 'speed', icon: '🚀', name: 'Speed Demon', desc: 'Complete a Speed Trainer run to 140 BPM', check: (s) => s.maxTrainerBpm >= 140 },
    { id: 'challenger', icon: '🎮', name: 'Challenger', desc: 'Complete 10 challenges', check: (s) => s.challengesDone >= 10 },
    { id: 'night', icon: '🦉', name: 'Night Owl', desc: 'Practise after 10 pm', check: (s, x) => x && x.hour >= 22 },
    { id: 'early', icon: '🌅', name: 'Early Bird', desc: 'Practise before 7 am', check: (s, x) => x && x.hour < 7 },
  ];

  const DAILY = [
    { id: 'minutes', text: 'Practise for {n} minutes', metric: 'minutes', n: [10, 15, 20] },
    { id: 'chords', text: 'Nail {n} chords in the Studio or Chord Quest', metric: 'chords', n: [15, 25, 40] },
    { id: 'combo', text: 'Reach a {n}× combo', metric: 'combo', n: [10, 15, 25] },
    { id: 'rhythm', text: 'Score {n} on-beat hits in Rhythm Hero', metric: 'rhythmHits', n: [30, 50, 80] },
    { id: 'notes', text: 'Find {n} notes in Note Hunter', metric: 'notes', n: [10, 20, 30] },
    { id: 'analyze', text: 'Analyse a new song or MIDI file', metric: 'analyze', n: [1, 1, 1] },
  ];

  function dateKey(d) {
    d = d || new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  function daysBetween(a, b) {
    const pa = a.split('-').map(Number), pb = b.split('-').map(Number);
    return Math.round((Date.UTC(pb[0], pb[1] - 1, pb[2]) - Date.UTC(pa[0], pa[1] - 1, pa[2])) / 86400000);
  }
  function hash(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }

  function fresh() {
    return {
      xp: 0, level: 1, sessions: 0, totalSeconds: 0, streak: 0, bestStreak: 0, lastDay: null,
      songsAnalyzed: 0, chordsNailed: 0, bestCombo: 0, threeStars: 0, challengesDone: 0, maxTrainerBpm: 0,
      instruments: { piano: 0, guitar: 0 }, improvSessions: 0, assignmentsDone: 0, badges: {}, days: {}, history: [], daily: null,
      dailyGoalMinutes: 15, highScores: {}, name: '',
    };
  }

  class Game {
    constructor(storage) {
      this.storage = storage || (typeof localStorage !== 'undefined' ? localStorage : null);
      this.listeners = new Set();
      this.state = fresh();
      try {
        const raw = this.storage && this.storage.getItem(KEY);
        if (raw) this.state = Object.assign(fresh(), JSON.parse(raw));
      } catch (e) { /* corrupted storage → start fresh */ }
      this.ensureDaily();
    }

    on(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); }
    emit(ev) { for (const fn of this.listeners) try { fn(ev); } catch (e) { console.error(e); } }
    save() {
      try { this.storage && this.storage.setItem(KEY, JSON.stringify(this.state)); } catch (e) { /* quota/private mode */ }
      this.emit({ type: 'change' });
    }

    get title() { return TITLES[Math.min(TITLES.length - 1, Math.floor((this.state.level - 1) / 3))]; }
    levelProgress() {
      const need = xpForLevel(this.state.level);
      return { level: this.state.level, xp: this.state.xp, need, pct: Math.min(1, this.state.xp / need) };
    }

    addXp(amount, reason) {
      amount = Math.max(0, Math.round(amount));
      const s = this.state;
      s.xp += amount;
      let leveled = false;
      while (s.xp >= xpForLevel(s.level)) { s.xp -= xpForLevel(s.level); s.level++; leveled = true; }
      this.emit({ type: 'xp', amount, reason });
      if (leveled) this.emit({ type: 'level', level: s.level, title: this.title });
      this.save();
      return leveled;
    }

    touchDay(now) {
      const s = this.state, today = dateKey(now);
      if (s.lastDay !== today) {
        if (s.lastDay && daysBetween(s.lastDay, today) === 1) s.streak++;
        else s.streak = 1;
        s.lastDay = today;
        s.bestStreak = Math.max(s.bestStreak, s.streak);
      }
    }

    /** Record a finished session. session: {mode, instrument, seconds, summary} */
    recordSession(session, now) {
      now = now || new Date();
      const s = this.state;
      const sum = session.summary || {};
      const secs = Math.max(0, Math.round(session.seconds || 0));
      this.touchDay(now);
      s.sessions++;
      s.totalSeconds += secs;
      const day = dateKey(now);
      s.days[day] = (s.days[day] || 0) + secs;
      if (session.instrument) s.instruments[session.instrument] = (s.instruments[session.instrument] || 0) + secs;
      s.chordsNailed += sum.chordsNailed || 0;
      s.bestCombo = Math.max(s.bestCombo, sum.maxCombo || 0);
      if (sum.stars === 3) s.threeStars++;
      if (session.challenge) s.challengesDone++;
      if (session.mode === 'improv') s.improvSessions = (s.improvSessions || 0) + 1;
      if (session.assignmentId) s.assignmentsDone = (s.assignmentsDone || 0) + 1;
      if (session.trainerBpm) s.maxTrainerBpm = Math.max(s.maxTrainerBpm, session.trainerBpm);
      if (session.challenge && session.score != null) {
        const k = session.challenge;
        s.highScores[k] = Math.max(s.highScores[k] || 0, session.score);
      }
      s.history.unshift({ id: 'h' + now.getTime().toString(36) + Math.random().toString(36).slice(2, 6), date: now.toISOString(), mode: session.mode, assignmentId: session.assignmentId || null, mixPreset: session.mixPreset || null, instrument: session.instrument, seconds: secs, accuracy: sum.accuracy, score: sum.score || session.score || 0, stars: sum.stars || 0, title: session.title || '' });
      s.history = s.history.slice(0, 100);
      const xp = Math.round(secs / 6 + (sum.score || session.score || 0) / 25 + (sum.stars || 0) * 25 + (sum.accuracy || 0) * 40);
      this.progressDaily('minutes', secs / 60);
      if (sum.chordsNailed) this.progressDaily('chords', sum.chordsNailed);
      if (sum.maxCombo) this.progressDaily('combo', sum.maxCombo, true);
      const leveled = this.addXp(xp, 'session');
      const badges = this.checkBadges(Object.assign({ hour: now.getHours() }, sum));
      return { xp, leveled, badges };
    }

    noteAnalysis() {
      this.state.songsAnalyzed++;
      this.progressDaily('analyze', 1);
      this.addXp(30, 'analysis');
      return this.checkBadges();
    }

    checkBadges(sessionCtx) {
      const got = [];
      for (const b of BADGES) {
        if (this.state.badges[b.id]) continue;
        let ok = false;
        try { ok = b.check(this.state, sessionCtx); } catch (e) { ok = false; }
        if (ok) {
          this.state.badges[b.id] = new Date().toISOString();
          got.push(b);
          this.emit({ type: 'badge', badge: b });
        }
      }
      if (got.length) { this.addXp(got.length * 50, 'badge'); }
      return got;
    }

    ensureDaily(now) {
      const today = dateKey(now);
      const d = this.state.daily;
      if (d && d.day === today) return d;
      const h = hash(today);
      const tpl = DAILY[h % DAILY.length];
      const n = tpl.n[(h >>> 8) % tpl.n.length];
      this.state.daily = { day: today, id: tpl.id, metric: tpl.metric, goal: n, progress: 0, done: false, text: tpl.text.replace('{n}', n) };
      return this.state.daily;
    }

    progressDaily(metric, amount, isMax) {
      const d = this.ensureDaily();
      if (d.done || d.metric !== metric) return;
      d.progress = isMax ? Math.max(d.progress, amount) : d.progress + amount;
      if (d.progress >= d.goal) {
        d.done = true;
        d.progress = d.goal;
        this.emit({ type: 'daily', daily: d });
        this.addXp(100, 'daily');
      } else this.save();
    }

    todaySeconds(now) { return this.state.days[dateKey(now)] || 0; }

    lastDays(n, now) {
      now = now || new Date();
      const out = [];
      for (let i = n - 1; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
        out.push({ day: dateKey(d), label: d.toLocaleDateString(undefined, { weekday: 'short' }), seconds: this.state.days[dateKey(d)] || 0 });
      }
      return out;
    }

    reset() { this.state = fresh(); this.ensureDaily(); this.save(); }
  }

  PM.Game = Game;
  PM.GameData = { BADGES, TITLES, DAILY, xpForLevel, dateKey, daysBetween };
  if (typeof module !== 'undefined' && module.exports) module.exports = { Game, BADGES, xpForLevel, dateKey };
})(typeof self !== 'undefined' ? self : globalThis);
