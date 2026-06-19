/**
 * Dictation Daily — a curated mini-set of N words for the day, dedicated to
 * the อ่านคันจิ (kanji-reading) dictation drill. This is a SEPARATE pool from
 * FlashcardsDaily: its own goal, its own daily selection, its own progress.
 * Sharing only happens at the knowledge layer — candidates are drawn from the
 * same Flash Cards / Learn progress (struggled vs. mastered words) so a word
 * you find hard anywhere can resurface here.
 *
 * Composition mirrors FlashcardsDaily: up to 80% from "still unknown" words,
 * the rest from any other studied word. Only kanji-bearing words that can be
 * quizzed as readings are eligible — the eligibility predicate is registered
 * by the dictation view via setEligibility().
 *
 * Item states:
 *   pending     → ยังไม่ได้ทบทวนวันนี้
 *   cardsUnknown→ ตอบผิดในรอบทบทวน
 *   learnDone   → ตอบถูกในรอบทบทวน
 * (cardsKnown is kept for shape-compatibility but unused in read mode.)
 *
 * Pool rebuilds when the Thailand date changes, or on regenerate().
 *
 * Shape:
 *   {
 *     goalCount, date, items: [{ deckId, wordId, state }], deckIds: [],
 *     settingsAt, poolAt, updatedAt
 *   }
 */
window.DictationDaily = (function () {
  const KEY = "jp_dictation_daily_v1";
  const DEFAULT_COUNT = 50;
  const MIN_COUNT = 10;
  const MAX_COUNT = 500;
  const UNKNOWN_RATIO = 0.8;

  // Registered by the dictation view: (front) => boolean. Only words that pass
  // contribute to the pool. Until it's set, the pool stays empty (and so keeps
  // rebuilding cheaply until the view loads and registers it).
  let eligible = null;
  function setEligibility(fn) { if (typeof fn === "function") eligible = fn; }

  function thailandDate() {
    if (window.FlashcardsStreak) return window.FlashcardsStreak.thailandDate();
    try {
      return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Bangkok" });
    } catch (e) {
      const now = new Date();
      const th = new Date(now.getTime() + now.getTimezoneOffset() * 60000 + 7 * 3600 * 1000);
      return th.toISOString().slice(0, 10);
    }
  }
  function clampCount(n) {
    const v = Math.floor(Number(n));
    if (!Number.isFinite(v)) return DEFAULT_COUNT;
    return Math.min(MAX_COUNT, Math.max(MIN_COUNT, v));
  }
  function cleanDeckIds(arr) {
    if (!Array.isArray(arr)) return [];
    const out = [];
    const seen = new Set();
    for (const id of arr) {
      if (typeof id !== "string" || !id) continue;
      if (seen.has(id)) continue;
      seen.add(id);
      out.push(id);
    }
    return out;
  }
  function emptyState() {
    return { goalCount: DEFAULT_COUNT, date: "", items: [], deckIds: [], settingsAt: 0, poolAt: 0, updatedAt: 0 };
  }
  function normalize(raw) {
    if (!raw || typeof raw !== "object") return emptyState();
    const updatedAt = raw.updatedAt || 0;
    return {
      goalCount: clampCount(raw.goalCount),
      date: raw.date || "",
      items: Array.isArray(raw.items) ? raw.items : [],
      deckIds: cleanDeckIds(raw.deckIds),
      settingsAt: raw.settingsAt || updatedAt,
      poolAt: raw.poolAt || updatedAt,
      updatedAt
    };
  }
  function load() {
    try {
      return normalize(JSON.parse(localStorage.getItem(KEY)));
    } catch (e) { return emptyState(); }
  }
  function save(state, touch, opts) {
    const now = Date.now();
    if (touch === "settings" || touch === "both") state.settingsAt = now;
    if (touch === "pool" || touch === "both") state.poolAt = now;
    state.updatedAt = now;
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

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  // Same bucketing as FlashcardsDaily, but restricted to read-eligible words.
  function gatherCandidates(allowDeckIds) {
    const FS = window.FlashcardsStorage;
    if (!FS || !eligible) return { unknown: [], passed: [] };
    const data = FS.load();
    const filter = (allowDeckIds && allowDeckIds.size) ? allowDeckIds : null;
    const unknown = [];
    const passed = [];
    for (const d of (data.decks || [])) {
      if (filter && !filter.has(d.id)) continue;
      const seen = new Set(d.progress && d.progress.cards ? d.progress.cards.seenIds : []);
      const done = new Set(d.progress && d.progress.learn ? d.progress.learn.completedIds : []);
      const stillU = new Set(d.progress && d.progress.cards ? (d.progress.cards.stillUnknownIds || []) : []);
      for (const w of (d.words || [])) {
        const studied = seen.has(w.id) || done.has(w.id) || stillU.has(w.id);
        if (!studied) continue;
        if (!eligible(w.front)) continue;
        const ref = { deckId: d.id, wordId: w.id };
        if (stillU.has(w.id)) unknown.push(ref);
        else passed.push(ref);
      }
    }
    return { unknown, passed };
  }

  function buildPool(goalCount, deckIds) {
    const allow = new Set(cleanDeckIds(deckIds));
    const { unknown, passed } = gatherCandidates(allow);
    const target = clampCount(goalCount);
    const targetUnknown = Math.floor(target * UNKNOWN_RATIO);
    const pickedUnknown = shuffle(unknown).slice(0, Math.min(targetUnknown, unknown.length));
    const remaining = target - pickedUnknown.length;
    const pickedPassed = shuffle(passed).slice(0, Math.min(remaining, passed.length));
    const merged = shuffle(pickedUnknown.concat(pickedPassed));
    return merged.map((ref) => ({ deckId: ref.deckId, wordId: ref.wordId, state: "pending" }));
  }

  function ensureToday(opts) {
    const today = thailandDate();
    const s = load();
    if (s.date === today && s.items.length && !(opts && opts.force)) return s;
    s.date = today;
    s.items = buildPool(s.goalCount, s.deckIds);
    save(s, "pool", opts);
    return s;
  }

  /* ---------- reads ---------- */
  function getGoalCount() { return clampCount(load().goalCount); }
  function getDeckIds() { return cleanDeckIds(load().deckIds); }
  function getState(opts) { return ensureToday(opts); }
  function getItems() { return ensureToday().items.slice(); }
  function counts() {
    const s = ensureToday();
    let pending = 0, cardsKnown = 0, cardsUnknown = 0, learnDone = 0;
    for (const it of s.items) {
      if (it.state === "cardsKnown") cardsKnown++;
      else if (it.state === "cardsUnknown") cardsUnknown++;
      else if (it.state === "learnDone") learnDone++;
      else pending++;
    }
    return {
      total: s.items.length,
      pending, cardsKnown, cardsUnknown, learnDone,
      cardsRemaining: pending,
      learnRemaining: cardsUnknown,
      cardsDone: s.items.length - pending,
      allDone: pending === 0 && cardsUnknown === 0
    };
  }

  /* ---------- writes ---------- */
  function setGoalCount(n) {
    const s = load();
    s.goalCount = clampCount(n);
    s.date = thailandDate();
    s.items = buildPool(s.goalCount, s.deckIds);
    save(s, "both");
    return s.goalCount;
  }
  function setDeckIds(ids) {
    const s = load();
    s.deckIds = cleanDeckIds(ids);
    s.date = thailandDate();
    s.items = buildPool(s.goalCount, s.deckIds);
    save(s, "both");
    return s.deckIds.slice();
  }
  function regenerate() {
    const s = ensureToday({ force: true });
    return s;
  }
  function setItemState(deckId, wordId, nextState) {
    const s = load();
    const it = (s.items || []).find((x) => x.deckId === deckId && x.wordId === wordId);
    if (!it) return;
    if (it.state === nextState) return;
    it.state = nextState;
    save(s, "pool");
  }

  /* ---------- cloud hooks ---------- */
  function getForCloud() { return load(); }
  function setFromCloud(state) {
    if (!state || typeof state !== "object") return;
    localStorage.setItem(KEY, JSON.stringify(normalize(state)));
    notify();
  }
  function mergeForCloud(localState, cloudState) {
    const a = normalize(localState);
    const b = normalize(cloudState);
    const settings = (b.settingsAt || 0) > (a.settingsAt || 0) ? b : a;
    const pool = (b.poolAt || 0) > (a.poolAt || 0) ? b : a;
    return {
      goalCount: settings.goalCount,
      deckIds: settings.deckIds,
      date: pool.date,
      items: pool.items,
      settingsAt: Math.max(a.settingsAt || 0, b.settingsAt || 0),
      poolAt: Math.max(a.poolAt || 0, b.poolAt || 0),
      updatedAt: Math.max(a.updatedAt || 0, b.updatedAt || 0)
    };
  }

  return {
    DEFAULT_COUNT, MIN_COUNT, MAX_COUNT, UNKNOWN_RATIO,
    setEligibility,
    getGoalCount, setGoalCount,
    getDeckIds, setDeckIds,
    getState, getItems, counts,
    regenerate, setItemState,
    subscribe,
    getForCloud, setFromCloud, mergeForCloud
  };
})();
