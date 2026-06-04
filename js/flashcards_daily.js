/**
 * Daily Words — a curated mini-set of N words for the day.
 *
 * Composition: up to 80% pulled from words that are currently "still
 * unknown" (most recently swiped "ยังไม่ได้" without a follow-up pass),
 * the remaining 20% from any other studied word (in seenIds or
 * completedIds). All daily picks must have been studied at least once
 * in Flash Cards or Learn mode.
 *
 * Each item moves through states as the user progresses:
 *   pending     → ยังไม่ได้ทำการ์ดวันนี้
 *   cardsKnown  → กด "ผ่าน" ในรอบ Flash Card วันนี้
 *   cardsUnknown→ กด "ยังไม่ได้" ในรอบ Flash Card วันนี้ — เข้าไปทำ Learn ต่อ
 *   learnDone   → ตอบ Learn ถูก ต่อมาในวันนี้
 *
 * Pool is rebuilt automatically when the Thailand date changes. A
 * "regenerate" call also rebuilds in-place, e.g. when the user changes
 * the daily count or finishes the current pool early.
 *
 * Shape:
 *   {
 *     goalCount: 100,
 *     date: "YYYY-MM-DD",
 *     items: [{ deckId, wordId, state }],
 *     deckIds: [deckId, ...],   // [] = ทุกชุดคำ; else เฉพาะ ids ที่ระบุ
 *     updatedAt
 *   }
 */
window.FlashcardsDaily = (function () {
  const KEY = "jp_flashcards_daily_v1";
  const DEFAULT_COUNT = 100;
  const MIN_COUNT = 10;
  const MAX_COUNT = 500;
  const UNKNOWN_RATIO = 0.8;

  function thailandDate() {
    return window.FlashcardsStreak
      ? window.FlashcardsStreak.thailandDate()
      : new Date().toISOString().slice(0, 10);
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
  // Settings (goalCount + deckIds) and the daily pool (date + items) carry
  // independent timestamps so they can be cloud-merged separately. Legacy
  // docs only had `updatedAt` — backfill both clocks from it so an old
  // settings change isn't silently lost on the first field-level merge.
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
  // `touch` selects which clock(s) to bump: "settings", "pool", or "both".
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

  // Pull all words across all decks and bucket by candidate status.
  // unknown: currently in stillUnknownIds (sticky tag, see storage)
  // passed:  studied at least once (seenIds or completedIds) and NOT
  //          currently in stillUnknownIds.
  // If `allowDeckIds` is a non-empty Set, only decks whose id is in it
  // contribute candidates.
  function gatherCandidates(allowDeckIds) {
    const FS = window.FlashcardsStorage;
    if (!FS) return { unknown: [], passed: [] };
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
    // Mix the two so the user doesn't see all unknowns in a block first.
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
      cardsRemaining: pending,                           // not yet touched in flash-card phase
      learnRemaining: cardsUnknown,                      // unknowns waiting on learn phase
      cardsDone: s.items.length - pending,
      allDone: pending === 0 && cardsUnknown === 0
    };
  }

  /* ---------- writes ---------- */
  function setGoalCount(n) {
    const s = load();
    s.goalCount = clampCount(n);
    // Regenerate today's pool to the new size (best UX = honor latest goal).
    s.date = thailandDate();
    s.items = buildPool(s.goalCount, s.deckIds);
    save(s, "both");
    return s.goalCount;
  }
  function setDeckIds(ids) {
    const s = load();
    s.deckIds = cleanDeckIds(ids);
    // Selection drives which words can appear — regenerate today's pool
    // so the user sees the new filter take effect immediately.
    s.date = thailandDate();
    s.items = buildPool(s.goalCount, s.deckIds);
    save(s, "both");
    return s.deckIds.slice();
  }
  function regenerate() {
    const s = ensureToday({ force: true });
    return s;
  }
  // Note: doesn't call ensureToday — a mid-session midnight crossing
  // shouldn't wipe the active pool. Home panel reads (via counts /
  // getState) handle the date-based rebuild on next visit.
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
  // Field-level last-write-wins: settings (goalCount + deckIds) and the
  // daily pool (date + items) are merged on their own clocks. This keeps a
  // count/deck-set change on one device from being clobbered by unrelated
  // progress writes — or by another device's nightly pool rebuild.
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
    getGoalCount, setGoalCount,
    getDeckIds, setDeckIds,
    getState, getItems, counts,
    regenerate, setItemState,
    subscribe,
    getForCloud, setFromCloud, mergeForCloud
  };
})();
