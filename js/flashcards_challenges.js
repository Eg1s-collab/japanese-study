/**
 * Challenge ประจำเดือนของบัตรคำ (แบบ league challenge ใน POE)
 *
 * ทุกเดือน (ตามวันที่เวลาไทย) มีภารกิจชุดเดิม 12 ข้อ ความคืบหน้าคำนวณสดจาก
 *   - FlashcardsStreak.days   → วันที่เรียน, จำนวนการ์ด, วันที่ถึงเป้า
 *   - FlashcardsMastery.log   → XP, คำที่ขึ้น Rare/Unique, ครั้งที่ผ่าน Learn/ฟังเขียน
 * ข้อที่ทำครบแล้วบันทึกถาวรของเดือนนั้น (ไม่หายแม้กด undo ทีหลัง)
 * ทำครบ 4 / 8 / 12 ข้อในเดือนเดียว → ปลดล็อกธีมรางวัล (ถาวร)
 *
 * Shape:
 *   {
 *     months:  { "YYYY-MM": { [challengeId]: ts } },
 *     unlocks: { [themeKey]: ts },
 *     updatedAt
 *   }
 *
 * Cross-device merge: union ของทุก key (เก็บ ts ที่เก่ากว่า)
 */
window.FlashcardsChallenges = (function () {
  const KEY = "jp_flashcards_challenges_v1";

  // value(ctx) → current progress this month.
  const CHALLENGES = [
    { id: "days10",  icon: "📅", label: "เรียนบัตรคำ 10 วัน",            target: 10,   value: (c) => c.studyDays },
    { id: "days20",  icon: "📅", label: "เรียนบัตรคำ 20 วัน",            target: 20,   value: (c) => c.studyDays },
    { id: "goal7",   icon: "🔥", label: "ถึงเป้ารายวันติดกัน 7 วัน",      target: 7,    value: (c) => c.bestGoalRun },
    { id: "cards500",  icon: "📇", label: "เรียนการ์ด 500 ใบ",          target: 500,  value: (c) => c.cards },
    { id: "cards1500", icon: "📇", label: "เรียนการ์ด 1,500 ใบ",        target: 1500, value: (c) => c.cards },
    { id: "xp500",   icon: "✦", label: "ได้ 500 XP",                    target: 500,  value: (c) => c.xp },
    { id: "xp2000",  icon: "✦", label: "ได้ 2,000 XP",                  target: 2000, value: (c) => c.xp },
    { id: "learn200", icon: "🎯", label: "ตอบความหมายถูก 200 ครั้ง",     target: 200,  value: (c) => c.m },
    { id: "dict100", icon: "🎧", label: "ฟังเขียนถูก 100 ครั้ง",          target: 100,  value: (c) => c.w },
    { id: "rare20",  icon: "🟨", label: "ขึ้น Rare 20 คำ",               target: 20,   value: (c) => c.rare },
    { id: "rare60",  icon: "🟨", label: "ขึ้น Rare 60 คำ",               target: 60,   value: (c) => c.rare },
    { id: "unique5", icon: "🟧", label: "ขึ้น Unique 5 คำ",              target: 5,    value: (c) => c.unique }
  ];

  // Completed-in-one-month thresholds → reward theme (keys in theme.js).
  const REWARDS = [
    { need: 4,  theme: "magic",  label: "Magic" },
    { need: 8,  theme: "rare",   label: "Rare" },
    { need: 12, theme: "unique", label: "Unique" }
  ];

  function emptyState() { return { months: {}, unlocks: {}, updatedAt: 0 }; }
  function load() {
    try {
      const raw = JSON.parse(localStorage.getItem(KEY));
      if (!raw || typeof raw !== "object") return emptyState();
      if (!raw.months || typeof raw.months !== "object") raw.months = {};
      if (!raw.unlocks || typeof raw.unlocks !== "object") raw.unlocks = {};
      raw.updatedAt = raw.updatedAt || 0;
      return raw;
    } catch (e) { return emptyState(); }
  }
  function save(state) {
    state.updatedAt = Date.now();
    localStorage.setItem(KEY, JSON.stringify(state));
    if (window.CloudSync) window.CloudSync.notifyChange();
  }

  function thailandDate() {
    if (window.FlashcardsStreak) return window.FlashcardsStreak.thailandDate();
    try {
      return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Bangkok" });
    } catch (e) {
      return new Date(Date.now() + 7 * 3600 * 1000).toISOString().slice(0, 10);
    }
  }
  function monthKey() { return thailandDate().slice(0, 7); }

  // Per-month totals from the streak counts and the mastery day log.
  function monthContext() {
    const todayStr = thailandDate();
    const [y, m, d] = todayStr.split("-").map(Number);
    const FS = window.FlashcardsStreak;
    const M = window.FlashcardsMastery;
    const log = M ? M.getLog() : {};
    const goal = FS ? FS.getGoal() : 0;
    const ctx = { studyDays: 0, bestGoalRun: 0, cards: 0, xp: 0, rare: 0, unique: 0, m: 0, w: 0 };
    let run = 0;
    for (let day = 1; day <= d; day++) {
      const ds = `${y}-${String(m).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      const cards = FS ? FS.getCount(ds) : 0;
      if (cards > 0) ctx.studyDays++;
      ctx.cards += cards;
      run = goal && cards >= goal ? run + 1 : 0;
      if (run > ctx.bestGoalRun) ctx.bestGoalRun = run;
      const e = M ? log[M.dayNum(ds)] : null;
      if (e) {
        ctx.xp += Math.max(0, e.xp || 0);
        ctx.rare += e.rare || 0;
        ctx.unique += e.unique || 0;
        ctx.m += Math.max(0, e.m || 0);
        ctx.w += Math.max(0, e.w || 0);
      }
    }
    ctx.daysLeft = new Date(Date.UTC(y, m, 0)).getUTCDate() - d;
    return ctx;
  }

  /**
   * Records newly finished challenges and newly earned theme unlocks.
   * Returns { newlyDone: [challenge], newlyUnlocked: [reward] }.
   */
  function check() {
    const state = load();
    const month = monthKey();
    const done = state.months[month] || (state.months[month] = {});
    const ctx = monthContext();
    const now = Date.now();
    const newlyDone = [];
    const newlyUnlocked = [];
    CHALLENGES.forEach((c) => {
      if (!done[c.id] && c.value(ctx) >= c.target) {
        done[c.id] = now;
        newlyDone.push(c);
      }
    });
    const count = Object.keys(done).length;
    REWARDS.forEach((r) => {
      if (count >= r.need && !state.unlocks[r.theme]) {
        state.unlocks[r.theme] = now;
        newlyUnlocked.push(r);
      }
    });
    if (newlyDone.length || newlyUnlocked.length) save(state);
    return { newlyDone, newlyUnlocked };
  }

  // Everything the challenge card needs for the current month.
  function status() {
    const state = load();
    const month = monthKey();
    const done = state.months[month] || {};
    const ctx = monthContext();
    // A recorded challenge stays full even if the live count later drops
    // (e.g. an undo, or another device's data merged differently).
    const items = CHALLENGES.map((c) => {
      const isDone = !!done[c.id];
      const value = isDone ? c.target : Math.min(c.value(ctx), c.target);
      return { id: c.id, icon: c.icon, label: c.label, target: c.target, value, done: isDone };
    });
    const doneCount = items.filter((i) => i.done).length;
    return {
      month,
      daysLeft: ctx.daysLeft,
      items,
      doneCount,
      total: CHALLENGES.length,
      rewards: REWARDS.map((r) => Object.assign({ unlocked: !!state.unlocks[r.theme] }, r))
    };
  }

  function isUnlocked(theme) { return !!load().unlocks[theme]; }
  function rewardFor(theme) { return REWARDS.find((r) => r.theme === theme) || null; }

  /* ---------- cloud hooks ---------- */
  function mergeForCloud(localState, cloudState) {
    const a = localState || emptyState();
    const b = cloudState || emptyState();
    const merged = emptyState();
    const keepOlder = (x, y) => (x && y ? Math.min(x, y) : x || y);
    new Set([...Object.keys(a.months || {}), ...Object.keys(b.months || {})]).forEach((mk) => {
      const ma = (a.months || {})[mk] || {};
      const mb = (b.months || {})[mk] || {};
      const out = merged.months[mk] = {};
      new Set([...Object.keys(ma), ...Object.keys(mb)]).forEach((id) => { out[id] = keepOlder(ma[id], mb[id]); });
    });
    const ua = a.unlocks || {};
    const ub = b.unlocks || {};
    new Set([...Object.keys(ua), ...Object.keys(ub)]).forEach((k) => { merged.unlocks[k] = keepOlder(ua[k], ub[k]); });
    merged.updatedAt = Math.max(a.updatedAt || 0, b.updatedAt || 0);
    return merged;
  }

  return { CHALLENGES, REWARDS, check, status, isUnlocked, rewardFor, mergeForCloud };
})();
