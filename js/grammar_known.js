/**
 * ติ๊ก "จำได้แล้ว" ของแต่ละหัวข้อไวยากรณ์ในแผนผัง (mind-map)
 *
 * รูปบน localStorage / Firestore:
 *   {
 *     records: {
 *       "<unitId>#<index>": {        // uid เดียวกับที่ใช้ในแผนผัง (globally unique)
 *         known: boolean,
 *         ts: number                 // เวลาที่กดล่าสุด (สำหรับ cloud LWW)
 *       }
 *     },
 *     updatedAt: number
 *   }
 *
 * Cloud merge เป็น per-key last-write-wins บน `ts` — ติ๊กออกที่เครื่องหนึ่ง
 * จึงชนะค่า known: true ที่ค้างอยู่จากอีกเครื่อง
 */
window.GrammarKnown = (function () {
  const KEY = "jp_grammar_known_v1";

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

  function isKnown(uid) {
    const r = load().records[uid];
    return !!(r && r.known);
  }
  function set(uid, known) {
    const state = load();
    state.records[uid] = { known: !!known, ts: Date.now() };
    save(state);
    return !!known;
  }
  function toggle(uid) { return set(uid, !isKnown(uid)); }
  function knownSet() {
    const recs = load().records;
    const s = {};
    Object.keys(recs).forEach((k) => { if (recs[k] && recs[k].known) s[k] = true; });
    return s;
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
    isKnown, set, toggle, knownSet, load, save,
    getForCloud, setFromCloud, mergeForCloud
  };
})();
