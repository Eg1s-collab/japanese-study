/**
 * Daily exercise — แบบฝึกหัดประจำวันแยกตามระดับ (N5/N4/N3).
 *
 * เลือกข้อตามลำดับความสำคัญ:
 *   1) ข้อที่เคยตอบผิด  (ใน level นั้น)
 *   2) ข้อจากบทที่กดซ่อน (LessonProgress.isDismissed)
 *   3) ข้อที่เหลือ (สุ่ม) — เติมจนถึงจำนวนที่ผู้ใช้กำหนด
 *
 * Session "ของวัน" คำนวณจากวันที่เวลาประเทศไทย (Asia/Bangkok, UTC+7)
 * เมื่อข้ามเที่ยงคืน 00:00 ตามเวลาไทย session ของวันเก่าจะถูกแทนที่
 * ด้วย session ใหม่อัตโนมัติ (ไม่ลบเลย จนกว่าผู้ใช้จะเริ่มทำของวันใหม่)
 *
 * Shape ใน localStorage / Firestore:
 *   {
 *     wrong:    { [level]: { "<unitId>::<qIndex>": ts } },
 *     settings: { maxCount: number },
 *     sessions: {
 *       [level]: {
 *         date: "YYYY-MM-DD",          // วันที่ไทย
 *         questions: [{unitId, qIndex, priority}],
 *         answers: [{correct, picked, value} | null, ...],
 *         i: number,                    // ตำแหน่งถัดไป
 *         completed: boolean,
 *         startedAt: number
 *       }
 *     },
 *     updatedAt: number
 *   }
 */
window.DailyStorage = (function () {
  const KEY = "jp_daily_v1";
  const DEFAULT_MAX = 10;
  const MIN_MAX = 1;
  const MAX_MAX = 100;

  function thailandDate() {
    try {
      // en-CA ให้รูปแบบ YYYY-MM-DD โดยตรง
      return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Bangkok" });
    } catch (e) {
      const now = new Date();
      const utcMs = now.getTime() + now.getTimezoneOffset() * 60000;
      const th = new Date(utcMs + 7 * 3600 * 1000);
      return th.toISOString().slice(0, 10);
    }
  }

  function emptyState() {
    return {
      wrong: {},
      settings: { maxCount: DEFAULT_MAX },
      sessions: {},
      updatedAt: 0
    };
  }

  function load() {
    try {
      const raw = JSON.parse(localStorage.getItem(KEY));
      if (!raw || typeof raw !== "object") return emptyState();
      const def = emptyState();
      return {
        wrong: raw.wrong && typeof raw.wrong === "object" ? raw.wrong : def.wrong,
        settings: Object.assign({}, def.settings, raw.settings || {}),
        sessions: raw.sessions && typeof raw.sessions === "object" ? raw.sessions : def.sessions,
        updatedAt: raw.updatedAt || 0
      };
    } catch (e) {
      return emptyState();
    }
  }

  function save(state) {
    state.updatedAt = Date.now();
    localStorage.setItem(KEY, JSON.stringify(state));
    if (window.CloudSync) window.CloudSync.notifyChange();
  }

  function markWrong(level, unitId, qIndex) {
    const s = load();
    s.wrong[level] = s.wrong[level] || {};
    s.wrong[level][`${unitId}::${qIndex}`] = Date.now();
    save(s);
  }

  function clearWrong(level, unitId, qIndex) {
    const s = load();
    if (s.wrong[level] && s.wrong[level][`${unitId}::${qIndex}`]) {
      delete s.wrong[level][`${unitId}::${qIndex}`];
      save(s);
    }
  }

  function getWrongCount(level) {
    return Object.keys(load().wrong[level] || {}).length;
  }

  function getMaxCount() {
    const n = load().settings.maxCount;
    return clampMax(n);
  }

  function setMaxCount(n) {
    const s = load();
    s.settings.maxCount = clampMax(n);
    save(s);
    return s.settings.maxCount;
  }

  function clampMax(n) {
    const v = Math.floor(Number(n));
    if (!Number.isFinite(v) || v < MIN_MAX) return DEFAULT_MAX;
    return Math.min(MAX_MAX, Math.max(MIN_MAX, v));
  }

  function peekSession(level) {
    const s = load();
    const existing = s.sessions[level];
    if (existing && existing.date === thailandDate()) return existing;
    return null;
  }

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function generatePool(level) {
    const lv = window.LEVELS && window.LEVELS[level];
    if (!lv) return { wrong: [], dismissed: [], rest: [] };
    const s = load();
    const wrongMap = s.wrong[level] || {};
    const LP = window.LessonProgress;

    const wrong = [];
    const dismissed = [];
    const rest = [];

    (lv.units || []).forEach((u) => {
      const isDismissed = LP && LP.isDismissed(level, u.id);
      (u.quiz || []).forEach((_, qi) => {
        const key = `${u.id}::${qi}`;
        if (wrongMap[key]) {
          wrong.push({ unitId: u.id, qIndex: qi, priority: 0 });
        } else if (isDismissed) {
          dismissed.push({ unitId: u.id, qIndex: qi, priority: 1 });
        } else {
          rest.push({ unitId: u.id, qIndex: qi, priority: 2 });
        }
      });
    });

    return { wrong, dismissed, rest };
  }

  function generateSession(level) {
    const s = load();
    const max = clampMax(s.settings.maxCount);
    const pool = generatePool(level);

    const ordered = [
      ...shuffle(pool.wrong),
      ...shuffle(pool.dismissed),
      ...shuffle(pool.rest)
    ].slice(0, max);

    const session = {
      date: thailandDate(),
      questions: ordered,
      answers: new Array(ordered.length).fill(null),
      i: 0,
      completed: ordered.length === 0,
      startedAt: Date.now()
    };
    s.sessions[level] = session;
    save(s);
    return session;
  }

  function getOrGenerateSession(level) {
    return peekSession(level) || generateSession(level);
  }

  function updateSession(level, mutator) {
    const s = load();
    if (!s.sessions[level] || s.sessions[level].date !== thailandDate()) return null;
    mutator(s.sessions[level]);
    save(s);
    return s.sessions[level];
  }

  function resetSession(level) {
    const s = load();
    if (s.sessions[level]) {
      delete s.sessions[level];
      save(s);
    }
  }

  function answeredCount(session) {
    if (!session || !Array.isArray(session.answers)) return 0;
    return session.answers.filter((a) => a && typeof a === "object").length;
  }

  function correctCount(session) {
    if (!session || !Array.isArray(session.answers)) return 0;
    return session.answers.filter((a) => a && a.correct).length;
  }

  /* ---------- cloud merge helpers ---------- */
  function getForCloud() { return load(); }
  function setFromCloud(state) {
    if (!state || typeof state !== "object") return;
    localStorage.setItem(KEY, JSON.stringify(state));
  }
  function mergeForCloud(a, b) {
    const A = a || emptyState();
    const B = b || emptyState();
    const merged = emptyState();

    // wrong: union per level/key, ts ใหญ่กว่าชนะ
    const levels = new Set([...Object.keys(A.wrong || {}), ...Object.keys(B.wrong || {})]);
    levels.forEach((lv) => {
      const aw = (A.wrong || {})[lv] || {};
      const bw = (B.wrong || {})[lv] || {};
      const keys = new Set([...Object.keys(aw), ...Object.keys(bw)]);
      merged.wrong[lv] = {};
      keys.forEach((k) => {
        merged.wrong[lv][k] = Math.max(aw[k] || 0, bw[k] || 0);
      });
    });

    // settings: ฝั่งที่ updatedAt ใหม่กว่าชนะ
    if ((A.updatedAt || 0) >= (B.updatedAt || 0)) {
      merged.settings = Object.assign({}, merged.settings, A.settings || {});
    } else {
      merged.settings = Object.assign({}, merged.settings, B.settings || {});
    }
    merged.settings.maxCount = clampMax(merged.settings.maxCount);

    // sessions: ต่อ level — date ใหม่กว่าชนะ; date เท่ากัน → answered มากกว่าชนะ
    const sl = new Set([...Object.keys(A.sessions || {}), ...Object.keys(B.sessions || {})]);
    sl.forEach((lv) => {
      const as = (A.sessions || {})[lv];
      const bs = (B.sessions || {})[lv];
      if (!as) merged.sessions[lv] = bs;
      else if (!bs) merged.sessions[lv] = as;
      else if (as.date !== bs.date) {
        merged.sessions[lv] = as.date > bs.date ? as : bs;
      } else {
        merged.sessions[lv] = answeredCount(as) >= answeredCount(bs) ? as : bs;
      }
    });

    merged.updatedAt = Math.max(A.updatedAt || 0, B.updatedAt || 0);
    return merged;
  }

  return {
    thailandDate, load, save,
    markWrong, clearWrong, getWrongCount,
    getMaxCount, setMaxCount,
    peekSession, generateSession, getOrGenerateSession,
    updateSession, resetSession,
    answeredCount, correctCount,
    getForCloud, setFromCloud, mergeForCloud
  };
})();
