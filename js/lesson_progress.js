/**
 * Per-unit mastery tracking. A unit is "dismissed" once the user has
 * answered ≥80% on its exercises and explicitly opted to hide it from
 * the lesson list — so the rest of the list focuses on units the user
 * still hasn't mastered.
 *
 * Shape on localStorage / Firestore:
 *   {
 *     records: {
 *       "<level>::<unitId>": {
 *         dismissed: boolean,
 *         ts: number,            // last toggle time (for cloud LWW)
 *         lastScore?: number,    // most recent quiz score (optional)
 *         lastTotal?: number
 *       }
 *     },
 *     updatedAt: number
 *   }
 *
 * Cloud merge is per-key last-write-wins on `ts`, so un-dismissing on
 * one device beats a stale dismissed: true from another.
 */
window.LessonProgress = (function () {
  const KEY = "jp_lesson_progress_v1";

  function emptyState() { return { records: {}, updatedAt: 0 }; }

  function load() {
    try {
      const raw = JSON.parse(localStorage.getItem(KEY));
      if (!raw || typeof raw !== "object") return emptyState();
      if (!raw.records || typeof raw.records !== "object") raw.records = {};
      raw.updatedAt = raw.updatedAt || 0;
      return raw;
    } catch (e) { return emptyState(); }
  }
  function save(state) {
    state.updatedAt = Date.now();
    localStorage.setItem(KEY, JSON.stringify(state));
    if (window.CloudSync) window.CloudSync.notifyChange();
  }

  function makeKey(level, unitId) { return `${level}::${unitId}`; }

  function isDismissed(level, unitId) {
    const r = load().records[makeKey(level, unitId)];
    return !!(r && r.dismissed);
  }
  function getRecord(level, unitId) {
    return load().records[makeKey(level, unitId)] || null;
  }
  function setDismissed(level, unitId, dismissed, score, total) {
    const state = load();
    const rec = { dismissed: !!dismissed, ts: Date.now() };
    if (typeof score === "number") rec.lastScore = score;
    if (typeof total === "number") rec.lastTotal = total;
    state.records[makeKey(level, unitId)] = rec;
    save(state);
  }

  function getForCloud() { return load(); }
  function setFromCloud(state) {
    if (!state || typeof state !== "object") return;
    localStorage.setItem(KEY, JSON.stringify(state));
  }
  function mergeForCloud(a, b) {
    const A = a || emptyState();
    const B = b || emptyState();
    const merged = emptyState();
    merged.updatedAt = Math.max(A.updatedAt || 0, B.updatedAt || 0);
    const keys = new Set([
      ...Object.keys(A.records || {}),
      ...Object.keys(B.records || {})
    ]);
    keys.forEach((k) => {
      const ra = (A.records || {})[k];
      const rb = (B.records || {})[k];
      if (!ra) merged.records[k] = rb;
      else if (!rb) merged.records[k] = ra;
      else merged.records[k] = ((rb.ts || 0) > (ra.ts || 0)) ? rb : ra;
    });
    return merged;
  }

  return {
    isDismissed, getRecord, setDismissed, load, save,
    getForCloud, setFromCloud, mergeForCloud
  };
})();
