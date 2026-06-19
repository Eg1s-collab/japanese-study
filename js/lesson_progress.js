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

  /* ความก้าวหน้าของ "โจทย์รวมทั้งหัวข้อใหญ่" (แผนผัง) — เก็บในคลังเดียวกัน
   * โดยใช้คีย์ namespace "topic::<key>" จึงได้ cloud-sync (per-key LWW) ฟรี
   * เก็บคะแนนดีที่สุด + ครั้งล่าสุด เพื่อโชว์บนปุ่มและวัดพัฒนาการ */
  function topicKey(key) { return "topic::" + key; }
  function getTopicRecord(key) {
    if (!key) return null;
    return load().records[topicKey(key)] || null;
  }
  function recordTopicResult(key, correct, total) {
    if (!key || !total) return;
    const state = load();
    const k = topicKey(key);
    const prev = state.records[k] || {};
    const pct = Math.round((correct / total) * 100);
    const prevBest = prev.bestPct || 0;
    const isBest = pct >= prevBest;
    state.records[k] = {
      ts: Date.now(),
      attempts: (prev.attempts || 0) + 1,
      lastCorrect: correct,
      lastTotal: total,
      bestPct: Math.max(prevBest, pct),
      bestCorrect: isBest ? correct : (prev.bestCorrect != null ? prev.bestCorrect : correct),
      bestTotal: isBest ? total : (prev.bestTotal != null ? prev.bestTotal : total)
    };
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
    getTopicRecord, recordTopicResult,
    getForCloud, setFromCloud, mergeForCloud
  };
})();
