/**
 * Progress tracking for the 四字熟語 arrange exercise. An idiom counts as
 * "learned" once the user has assembled it correctly at least once. Keyed by
 * the kanji string itself (stable across reshuffles / chapter re-slicing).
 *
 * Shape on localStorage / Firestore:
 *   { records: { "<kanji>": { ts } }, updatedAt }
 *
 * Cloud merge is per-key last-write-wins on `ts` (same model as
 * LessonProgress), so learning an idiom on any device sticks.
 */
window.YojijukugoProgress = (function () {
  const KEY = "jp_yoji_progress_v1";

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

  function isDone(k) {
    if (!k) return false;
    return !!load().records[k];
  }
  function markDone(k) {
    if (!k) return;
    const state = load();
    if (state.records[k]) return; // already learned — keep original ts
    state.records[k] = { ts: Date.now() };
    save(state);
  }
  // How many of the given kanji keys are already learned.
  function countDone(keys) {
    const recs = load().records;
    let n = 0;
    (keys || []).forEach((k) => { if (recs[k]) n++; });
    return n;
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
    load, save, isDone, markDone, countDone,
    getForCloud, setFromCloud, mergeForCloud
  };
})();
