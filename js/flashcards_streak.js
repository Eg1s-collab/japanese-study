/**
 * Flashcards streak — daily study counts + heatmap (flashcards tab only).
 *
 * Counts a "card studied" when the user either:
 *   • swipes a Cards-mode card to the "known" pile (markCardSeen)
 *   • answers a Learn-mode question correctly (recordLearnAttempt isCorrect)
 *
 * Day boundary uses Thailand local date (Asia/Bangkok, UTC+7) so a study
 * session that crosses midnight UTC still counts toward the user's day.
 *
 * Shape:
 *   {
 *     goal: 50,                          // daily target (cards)
 *     days: { "YYYY-MM-DD": count },     // per-day count (Thailand date)
 *     updatedAt: number
 *   }
 *
 * Cross-device merge: per-day max wins (combining cards studied on two
 * devices in one day) and `goal` follows whichever side has the newer
 * `updatedAt`.
 */
window.FlashcardsStreak = (function () {
  const KEY = "jp_flashcards_streak_v1";
  const DEFAULT_GOAL = 50;
  const MIN_GOAL = 1;
  const MAX_GOAL = 500;

  function thailandDate(d) {
    const base = d instanceof Date ? d : new Date();
    try {
      return base.toLocaleDateString("en-CA", { timeZone: "Asia/Bangkok" });
    } catch (e) {
      const utcMs = base.getTime() + base.getTimezoneOffset() * 60000;
      return new Date(utcMs + 7 * 3600 * 1000).toISOString().slice(0, 10);
    }
  }

  function clampGoal(n) {
    const v = Math.floor(Number(n));
    if (!Number.isFinite(v)) return DEFAULT_GOAL;
    return Math.min(MAX_GOAL, Math.max(MIN_GOAL, v));
  }

  function emptyState() {
    return { goal: DEFAULT_GOAL, days: {}, updatedAt: 0 };
  }

  function load() {
    try {
      const raw = JSON.parse(localStorage.getItem(KEY));
      if (!raw || typeof raw !== "object") return emptyState();
      return {
        goal: clampGoal(raw.goal),
        days: raw.days && typeof raw.days === "object" ? raw.days : {},
        updatedAt: raw.updatedAt || 0
      };
    } catch (e) {
      return emptyState();
    }
  }

  function save(state, opts) {
    state.updatedAt = Date.now();
    localStorage.setItem(KEY, JSON.stringify(state));
    if (!opts || !opts.skipCloud) {
      if (window.CloudSync) window.CloudSync.notifyChange();
    }
    notify();
  }

  /* ---------- subscribers ---------- */
  const listeners = new Set();
  function subscribe(fn) {
    if (typeof fn !== "function") return () => {};
    listeners.add(fn);
    return () => listeners.delete(fn);
  }
  function notify() {
    listeners.forEach((fn) => { try { fn(); } catch (e) { /* ignore */ } });
  }

  /* ---------- writes ---------- */
  function addCards(n) {
    const inc = Math.max(0, Math.floor(Number(n) || 0));
    if (!inc) return;
    const s = load();
    const today = thailandDate();
    s.days[today] = (s.days[today] || 0) + inc;
    save(s);
  }

  function setGoal(n) {
    const s = load();
    s.goal = clampGoal(n);
    save(s);
    return s.goal;
  }

  /* ---------- reads ---------- */
  function getGoal() { return clampGoal(load().goal); }
  function getToday() { return load().days[thailandDate()] || 0; }
  function getCount(dateStr) { return load().days[String(dateStr || "")] || 0; }

  // Length of the current streak ending today (or yesterday if today still 0).
  // A "streak day" = met goal that day. If today not yet met but yesterday
  // was, streak still alive (= count up to yesterday).
  function getStreak() {
    const s = load();
    const goal = clampGoal(s.goal);
    let streak = 0;
    const now = new Date();
    let i = 0;
    // If today's already met, start counting from today; otherwise check
    // backward from yesterday so streak doesn't drop to 0 mid-day.
    const todayKey = thailandDate(now);
    const todayMet = (s.days[todayKey] || 0) >= goal;
    if (!todayMet) i = 1;
    for (; i < 366; i++) {
      const d = new Date(now.getTime() - i * 86400000);
      const key = thailandDate(d);
      if ((s.days[key] || 0) >= goal) streak++;
      else break;
    }
    return streak;
  }

  // Returns array of {date, count, met} for the last `nDays` days,
  // oldest first. Used by the heatmap grid.
  function getDays(nDays) {
    const s = load();
    const goal = clampGoal(s.goal);
    const out = [];
    const now = new Date();
    const days = Math.max(1, Math.floor(nDays) || 91);
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 86400000);
      const key = thailandDate(d);
      const count = s.days[key] || 0;
      out.push({ date: key, count, met: count >= goal });
    }
    return out;
  }

  /* ---------- cloud hooks ---------- */
  function getForCloud() { return load(); }
  function setFromCloud(state) {
    if (!state || typeof state !== "object") return;
    localStorage.setItem(KEY, JSON.stringify(state));
    notify();
  }
  function mergeForCloud(localState, cloudState) {
    const a = localState || emptyState();
    const b = cloudState || emptyState();
    const merged = emptyState();
    const keys = new Set([...Object.keys(a.days || {}), ...Object.keys(b.days || {})]);
    keys.forEach((k) => {
      merged.days[k] = Math.max(a.days[k] || 0, b.days[k] || 0);
    });
    if ((a.updatedAt || 0) >= (b.updatedAt || 0)) merged.goal = clampGoal(a.goal);
    else merged.goal = clampGoal(b.goal);
    merged.updatedAt = Math.max(a.updatedAt || 0, b.updatedAt || 0);
    return merged;
  }

  return {
    thailandDate,
    addCards, setGoal,
    getGoal, getToday, getCount, getStreak, getDays,
    subscribe,
    getForCloud, setFromCloud, mergeForCloud
  };
})();
