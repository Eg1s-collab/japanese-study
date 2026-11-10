/**
 * ความชำนาญรายคำของบัตรคำ (rarity แบบ POE) — สะสมข้ามรอบ ไม่ถูกล้างตอน
 * "รีเซ็ต" / "เริ่มรอบใหม่" เหมือน progress ของแต่ละโหมดใน flashcards_storage
 *
 * แต่ละคำมี 3 socket:
 *   r = อ่าน      กด "ผ่าน" ใน Flash Card (รวม Daily Words)
 *   m = ความหมาย  ตอบถูกใน Learn / ข้อความหมายของฟังเขียน
 *   w = ฟังเขียน   พิมพ์คำอ่านถูกในโหมดฟังเขียน
 *
 * ระดับ (rarityOf):
 *   0 —        ยังไม่เคยเจอ
 *   1 Normal   เคยเจอแล้ว (ผ่านหรือกด "ยังไม่ได้" อย่างน้อยครั้งเดียว)
 *   2 Magic    อ่าน + ความหมาย ผ่านแล้ว
 *   3 Rare     ครบทุก socket และผ่านมาแล้ว ≥ 3 วัน (คนละวัน)
 *   4 Unique   Rare + ผ่าน ≥ 5 วัน และวันแรกถึงวันล่าสุดห่างกัน ≥ 30 วัน
 * คำที่ฝึกฟังเขียนไม่ได้ (ไม่มีคำอ่าน) ไม่ต้องมี socket w
 *
 * วัน = วันที่เวลาไทย แปลงเป็นเลขวัน (epoch day) ให้เก็บได้เล็ก
 *
 * Shape:
 *   {
 *     decks: { [deckId]: { [wordId]: { r, m, w, d: [dayNum, ...] } } },
 *     log:   { [dayNum]: { xp, rare, unique, r, m, w } },
 *     updatedAt: number
 *   }
 * r/m/w = จำนวนครั้งที่ผ่าน, d = วันที่ผ่าน (ไม่ซ้ำ เรียงจากเก่า) เก็บวันแรก
 * + MAX_DAYS-1 วันล่าสุด
 * log = XP ที่ได้, จำนวนคำที่ขึ้น Rare/Unique และจำนวนครั้งที่ผ่านแต่ละ socket
 * ในแต่ละวัน (เก็บ LOG_KEEP วัน) ใช้คาดการณ์ว่าจะถึงเลเวล/ทั้งชุดเป็น Rare
 * เมื่อไหร่ และนับความคืบหน้า Challenge รายเดือน
 *
 * Cross-device merge: รายคำ — r/m/w เอาค่าสูงสุด, d รวมกันแล้วตัดตาม MAX_DAYS;
 * log รายวันเอาค่าสูงสุดของแต่ละช่อง (แบบเดียวกับ streak)
 */
window.FlashcardsMastery = (function () {
  const KEY = "jp_flashcards_mastery_v1";
  const SOCKETS = ["r", "m", "w"];
  const RARE_DAYS = 3;
  const UNIQUE_DAYS = 5;
  const UNIQUE_SPAN = 30;
  const MAX_DAYS = 12;
  const LOG_KEEP = 90;
  const RATE_WINDOW = 14;
  const MIN_FORECAST_DAYS = 3;

  const TIERS = [
    { key: "none",   label: "ยังไม่เจอ" },
    { key: "normal", label: "Normal" },
    { key: "magic",  label: "Magic" },
    { key: "rare",   label: "Rare" },
    { key: "unique", label: "Unique" }
  ];

  function emptyState() { return { decks: {}, log: {}, updatedAt: 0 }; }

  // Parsed-state cache keyed on the raw string, so the home screen can
  // summarize many decks without re-parsing the whole store each time.
  let cacheRaw = null;
  let cacheState = null;

  function load() {
    let raw = null;
    try { raw = localStorage.getItem(KEY); } catch (e) { raw = null; }
    if (raw && raw === cacheRaw && cacheState) return cacheState;
    let state;
    try {
      state = JSON.parse(raw);
      if (!state || typeof state !== "object") state = emptyState();
      if (!state.decks || typeof state.decks !== "object") state.decks = {};
      if (!state.log || typeof state.log !== "object") state.log = {};
      state.updatedAt = state.updatedAt || 0;
    } catch (e) { state = emptyState(); }
    cacheRaw = raw;
    cacheState = state;
    return state;
  }
  function save(state) {
    state.updatedAt = Date.now();
    const raw = JSON.stringify(state);
    localStorage.setItem(KEY, raw);
    cacheRaw = raw;
    cacheState = state;
    if (window.CloudSync) window.CloudSync.notifyChange();
  }

  /* ---------- days ---------- */
  function thailandDate() {
    if (window.FlashcardsStreak) return window.FlashcardsStreak.thailandDate();
    try {
      return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Bangkok" });
    } catch (e) {
      return new Date(Date.now() + 7 * 3600 * 1000).toISOString().slice(0, 10);
    }
  }
  function dayNum(dateStr) { return Math.floor(Date.parse(dateStr + "T00:00:00Z") / 86400000); }
  function today() { return dayNum(thailandDate()); }
  function dayToDate(n) { return new Date(n * 86400000); }

  function capDays(days) {
    const uniq = Array.from(new Set(days)).sort((a, b) => a - b);
    if (uniq.length <= MAX_DAYS) return uniq;
    return [uniq[0], ...uniq.slice(uniq.length - (MAX_DAYS - 1))];
  }

  /* ---------- records ---------- */
  function ensureRec(state, deckId, wordId) {
    const deck = state.decks[deckId] || (state.decks[deckId] = {});
    const rec = deck[wordId] || (deck[wordId] = { r: 0, m: 0, w: 0, d: [] });
    if (!Array.isArray(rec.d)) rec.d = [];
    return rec;
  }
  function getRec(deckId, wordId) {
    const deck = load().decks[deckId];
    return (deck && deck[wordId]) || null;
  }

  function pass(deckId, wordId, socket) {
    if (!deckId || !wordId || !SOCKETS.includes(socket)) return;
    const state = load();
    const before = cloneRec(state, deckId, wordId);
    const rec = ensureRec(state, deckId, wordId);
    rec[socket] = (rec[socket] || 0) + 1;
    const t = today();
    if (!rec.d.includes(t)) rec.d = capDays([...rec.d, t]);
    logChange(state, deckId, wordId, before, rec);
    save(state);
  }
  // Seen but not passed (e.g. swiped "ยังไม่ได้") — counts as Normal.
  function touch(deckId, wordId) {
    if (!deckId || !wordId) return;
    const state = load();
    const deck = state.decks[deckId];
    if (deck && deck[wordId]) return;
    const rec = ensureRec(state, deckId, wordId);
    logChange(state, deckId, wordId, null, rec);
    save(state);
  }
  // Undo of a Flash Card swipe. Today's day entry stays — the user did
  // review the word today even if they took the swipe back.
  function unpass(deckId, wordId, socket) {
    const state = load();
    const deck = state.decks[deckId];
    const rec = deck && deck[wordId];
    if (!rec || !(rec[socket] > 0)) return;
    const before = cloneRec(state, deckId, wordId);
    rec[socket] -= 1;
    logChange(state, deckId, wordId, before, rec);
    save(state);
  }
  function cloneRec(state, deckId, wordId) {
    const deck = state.decks[deckId];
    const rec = deck && deck[wordId];
    return rec ? { r: rec.r, m: rec.m, w: rec.w, d: rec.d.slice() } : null;
  }

  /* ---------- rarity ---------- */
  function hasSockets(rec, needsWrite) {
    return rec.r > 0 && rec.m > 0 && (!needsWrite || rec.w > 0);
  }
  function rarityOf(rec, needsWrite) {
    if (!rec) return 0;
    const n = rec.d.length;
    if (hasSockets(rec, needsWrite) && n >= RARE_DAYS) {
      const span = rec.d[n - 1] - rec.d[0];
      return n >= UNIQUE_DAYS && span >= UNIQUE_SPAN ? 4 : 3;
    }
    if (rec.r > 0 && rec.m > 0) return 2;
    return 1;
  }
  // Earliest day this record can become Unique if reviewed every day from now.
  function uniqueEarliest(rec, t) {
    const n = rec.d.length;
    const hasToday = rec.d.includes(t);
    const missing = Math.max(0, UNIQUE_DAYS - n);
    const byCount = missing === 0 ? t : t + missing - (hasToday ? 0 : 1);
    const bySpan = rec.d[0] + UNIQUE_SPAN;
    return Math.max(byCount, bySpan);
  }

  // Seed sockets from the per-round progress sets that existed before this
  // store did, so returning users start with their Normal/Magic words. Only
  // raises zero counts; past study days are unknown so `d` is left alone.
  function backfill(state, deck) {
    const p = deck.progress || {};
    const sets = [
      ["r", (p.cards && p.cards.seenIds) || []],
      ["m", (p.learn && p.learn.completedIds) || []],
      ["w", (p.dictation && p.dictation.doneIds) || []]
    ];
    let changed = false;
    sets.forEach(([socket, ids]) => {
      ids.forEach((id) => {
        const rec = ensureRec(state, deck.id, id);
        if (!(rec[socket] > 0)) { rec[socket] = 1; changed = true; }
      });
    });
    ((p.cards && p.cards.stillUnknownIds) || []).forEach((id) => {
      const deckRecs = state.decks[deck.id] || {};
      if (!deckRecs[id]) { ensureRec(state, deck.id, id); changed = true; }
    });
    return changed;
  }

  /**
   * Tier counts and next-step hints for a deck.
   *   counts:  [none, normal, magic, rare, unique]
   *   next: {
   *     needRead, needMeaning  — Normal words one socket short of Magic
   *     needWrite              — words with every socket but ฟังเขียน
   *     rareToday              — reviewing today makes them Rare
   *     rareLater              — one day short but already reviewed today
   *     uniqueToday            — reviewing today makes them Unique
   *     uniqueAt               — earliest later Date a Rare word can become Unique (or null)
   *   }
   */
  function deckSummary(deck) {
    const counts = [0, 0, 0, 0, 0];
    const next = { needRead: 0, needMeaning: 0, needWrite: 0, rareToday: 0, rareLater: 0, uniqueToday: 0, uniqueAt: null };
    if (!deck || !Array.isArray(deck.words)) return { counts, total: 0, next };
    const state = load();
    if (backfill(state, deck)) save(state);
    const recs = state.decks[deck.id] || {};
    const DV = window.DictationView;
    const t = today();
    let uniqueMin = null;
    deck.words.forEach((w) => {
      const rec = recs[w.id] || null;
      const needsWrite = DV && DV.isDrillable ? DV.isDrillable(w.front) : true;
      const tier = rarityOf(rec, needsWrite);
      counts[tier]++;
      if (!rec) return;
      if (tier === 1) {
        if (rec.r > 0 && !(rec.m > 0)) next.needMeaning++;
        else if (rec.m > 0 && !(rec.r > 0)) next.needRead++;
      }
      if (tier === 2) {
        if (rec.r > 0 && rec.m > 0 && needsWrite && !(rec.w > 0)) next.needWrite++;
        else if (rec.d.length === RARE_DAYS - 1) {
          if (rec.d.includes(t)) next.rareLater++;
          else next.rareToday++;
        }
      }
      if (tier === 3) {
        const at = uniqueEarliest(rec, t);
        if (at === t && !rec.d.includes(t)) next.uniqueToday++;
        else if (uniqueMin === null || at < uniqueMin) uniqueMin = at;
      }
    });
    if (uniqueMin !== null) next.uniqueAt = dayToDate(uniqueMin);
    return { counts, total: deck.words.length, next };
  }

  /* ---------- XP & character level ----------
   * XP is derived from the records (never stored), so it merges across
   * devices for free: each socket pass is worth SOCKET_XP and reaching a
   * tier adds that tier's bonus once.
   */
  const SOCKET_XP = { r: 1, m: 2, w: 3 };
  const TIER_BONUS = [0, 1, 5, 20, 50];
  const MAX_LEVEL = 100;

  function recXp(rec, needsWrite) {
    if (!rec) return 0;
    let xp = (rec.r || 0) * SOCKET_XP.r + (rec.m || 0) * SOCKET_XP.m + (rec.w || 0) * SOCKET_XP.w;
    const tier = rarityOf(rec, needsWrite);
    for (let i = 1; i <= tier; i++) xp += TIER_BONUS[i];
    return xp;
  }
  // Total XP needed to reach level L (L1 = 0). Steepens like POE: ~3k for
  // Lv 10, ~16k for Lv 20, ~600k for Lv 100.
  function xpForLevel(L) { return Math.round(25 * Math.pow(Math.max(0, L - 1), 2.2)); }
  function levelInfo(xp) {
    let L = 1;
    while (L < MAX_LEVEL && xp >= xpForLevel(L + 1)) L++;
    const cur = xpForLevel(L);
    const next = L < MAX_LEVEL ? xpForLevel(L + 1) : cur;
    const pct = next > cur ? Math.min(100, Math.round(((xp - cur) / (next - cur)) * 100)) : 100;
    return { level: L, xp, cur, next, toNext: Math.max(0, next - xp), pct, max: L >= MAX_LEVEL };
  }

  function needsWriteFor(front) {
    const DV = window.DictationView;
    return DV && DV.isDrillable ? DV.isDrillable(front) : true;
  }
  function liveDecks() {
    return window.FlashcardsStorage ? window.FlashcardsStorage.load().decks : [];
  }
  // Whole-collection stats: XP/level plus tier counts over every live deck.
  // `state` lets a caller pass the in-flight (not yet saved) store.
  function profile(state) {
    state = state || load();
    const counts = [0, 0, 0, 0, 0];
    let xp = 0;
    let words = 0;
    liveDecks().forEach((deck) => {
      const recs = state.decks[deck.id] || {};
      (deck.words || []).forEach((w) => {
        const rec = recs[w.id] || null;
        const nw = needsWriteFor(w.front);
        counts[rarityOf(rec, nw)]++;
        xp += recXp(rec, nw);
        words++;
      });
    });
    return Object.assign(levelInfo(xp), { counts, words });
  }

  /* ---------- loot journal ----------
   * In-memory log of what changed during the current study stretch, so the
   * flashcards screen can show a POE-style drop summary when the user
   * comes back from any mode (cards, learn, daily, ฟังเขียน). Showing it
   * marks it seen; it stays up through re-renders until dismissed, and the
   * next pass after it was seen starts a fresh journal.
   */
  let journal = null;

  function wordFront(deckId, wordId) {
    const FS = window.FlashcardsStorage;
    const deck = FS && FS.getDeck(deckId);
    const w = deck && deck.words.find((x) => x.id === wordId);
    return w ? w.front : "";
  }
  // Records one word's change in the daily log (on `state`, saved by the
  // caller) and in the in-memory loot journal.
  function logChange(state, deckId, wordId, before, after) {
    const front = wordFront(deckId, wordId);
    const nw = needsWriteFor(front);
    const tierBefore = rarityOf(before, nw);
    const tierAfter = rarityOf(after, nw);
    const delta = recXp(after, nw) - recXp(before, nw);

    const t = today();
    const day = state.log[t] || (state.log[t] = { xp: 0, rare: 0, unique: 0 });
    day.xp += delta;
    SOCKETS.forEach((k) => {
      const diff = ((after && after[k]) || 0) - ((before && before[k]) || 0);
      if (diff) day[k] = (day[k] || 0) + diff;
    });
    if (tierBefore < 3 && tierAfter >= 3) day.rare++;
    if (tierBefore < 4 && tierAfter >= 4) day.unique++;
    Object.keys(state.log).forEach((k) => { if (Number(k) <= t - LOG_KEEP) delete state.log[k]; });

    if (!journal || journal.shown) {
      // profile(state) already includes this change; back it out for the start.
      journal = { startXp: profile(state).xp - delta, xp: 0, ups: {} };
    }
    journal.xp += delta;
    const key = deckId + "::" + wordId;
    const prev = journal.ups[key];
    const from = prev ? prev.from : tierBefore;
    if (tierAfter > from) journal.ups[key] = { from, to: tierAfter, front };
    else delete journal.ups[key];
  }
  /**
   * The current loot (and marks it seen), or null if nothing was earned:
   *   { xp, before: levelInfo, after: levelInfo,
   *     newWords, magic: [front], rare: [front], unique: [front] }
   */
  function peekLoot() {
    const j = journal;
    if (!j) return null;
    const ups = Object.values(j.ups);
    if (j.xp <= 0 && !ups.length) return null;
    j.shown = true;
    const pick = (t) => ups.filter((u) => u.to === t).map((u) => u.front);
    return {
      xp: j.xp,
      before: levelInfo(Math.max(0, j.startXp)),
      after: levelInfo(Math.max(0, j.startXp + j.xp)),
      newWords: ups.filter((u) => u.from === 0).length,
      magic: pick(2),
      rare: pick(3),
      unique: pick(4)
    };
  }
  function dismissLoot() { journal = null; }

  /* ---------- forecast ----------
   * Average pace over the last RATE_WINDOW days (counting days with no
   * study, but not days before the first logged one). Needs at least
   * MIN_FORECAST_DAYS of history before it projects anything.
   */
  function pace() {
    const log = load().log;
    const t = today();
    const days = Object.keys(log).map(Number).filter((k) => k > t - RATE_WINDOW && k <= t);
    if (!days.length) return { ready: false, daysLeft: MIN_FORECAST_DAYS, span: 0 };
    const span = t - Math.min(...days) + 1;
    if (span < MIN_FORECAST_DAYS) return { ready: false, daysLeft: MIN_FORECAST_DAYS - span, span };
    let xp = 0, rare = 0;
    days.forEach((k) => { xp += Math.max(0, log[k].xp || 0); rare += log[k].rare || 0; });
    return { ready: true, span, xpPerDay: xp / span, rarePerDay: rare / span };
  }
  function addDays(n) { return dayToDate(today() + n); }
  function getLog() { return load().log; }

  /**
   * Level projections:
   *   { ready, daysLeft } until there's enough history, then
   *   { ready, xpPerDay, nextLevel: {level, days, date},
   *     milestone: {level, days, date} | null }  (days null = no pace)
   */
  function levelForecast() {
    const p = pace();
    if (!p.ready) return p;
    const info = profile();
    const eta = (target) => {
      const need = xpForLevel(target) - info.xp;
      if (need <= 0) return { level: target, days: 0, date: addDays(0) };
      if (!(p.xpPerDay > 0)) return { level: target, days: null, date: null };
      const days = Math.ceil(need / p.xpPerDay);
      return { level: target, days, date: addDays(days) };
    };
    const milestone = Math.min(MAX_LEVEL, (Math.floor(info.level / 10) + 1) * 10);
    return {
      ready: true,
      xpPerDay: p.xpPerDay,
      nextLevel: info.max ? null : eta(info.level + 1),
      milestone: milestone > info.level + 1 ? eta(milestone) : null
    };
  }
  /**
   * When every word in `deck` could be Rare at the collection's recent
   * Rare-per-day pace — never sooner than the day-gating allows.
   *   { ready, daysLeft } | { ready, remaining, rarePerDay, days, date }
   */
  function deckRareForecast(deck) {
    const p = pace();
    if (!p.ready) return p;
    const recs = load().decks[deck.id] || {};
    const t = today();
    let remaining = 0;
    let minDays = 0;
    deck.words.forEach((w) => {
      const rec = recs[w.id] || null;
      if (rarityOf(rec, needsWriteFor(w.front)) >= 3) return;
      remaining++;
      // Each missing study day takes one calendar day; today counts if unused.
      const have = rec ? rec.d.length : 0;
      const studiedToday = rec ? rec.d.includes(t) : false;
      const need = Math.max(0, RARE_DAYS - have - (studiedToday ? 0 : 1));
      if (need > minDays) minDays = need;
    });
    if (!remaining) return { ready: true, remaining: 0, rarePerDay: p.rarePerDay, days: 0, date: addDays(0) };
    if (!(p.rarePerDay > 0)) return { ready: true, remaining, rarePerDay: 0, days: null, date: null };
    const days = Math.max(minDays, Math.ceil(remaining / p.rarePerDay));
    return { ready: true, remaining, rarePerDay: p.rarePerDay, days, date: addDays(days) };
  }

  // Tier a Flash Card pass today would move this word to, if higher than
  // its current tier (0 = no change). Daily Words uses it to surface words
  // that are one review away from levelling up.
  function upgradeOnPass(deckId, word) {
    const recs = load().decks[deckId];
    const rec = recs && recs[word.id];
    if (!rec) return 0;
    const t = today();
    if (rec.d.includes(t) && rec.r > 0) return 0;
    const nw = needsWriteFor(word.front);
    const now = rarityOf(rec, nw);
    const next = rarityOf({ r: rec.r + 1, m: rec.m, w: rec.w, d: capDays([...rec.d, t]) }, nw);
    return next > now ? next : 0;
  }

  /* ---------- cloud hooks ---------- */
  function getForCloud() { return load(); }
  function setFromCloud(state) {
    if (!state || typeof state !== "object") return;
    localStorage.setItem(KEY, JSON.stringify(state));
  }
  function mergeForCloud(localState, cloudState) {
    const a = (localState && localState.decks) || {};
    const b = (cloudState && cloudState.decks) || {};
    const merged = emptyState();
    new Set([...Object.keys(a), ...Object.keys(b)]).forEach((deckId) => {
      const da = a[deckId] || {};
      const db = b[deckId] || {};
      const out = merged.decks[deckId] = {};
      new Set([...Object.keys(da), ...Object.keys(db)]).forEach((wordId) => {
        const x = da[wordId] || {};
        const y = db[wordId] || {};
        out[wordId] = {
          r: Math.max(x.r || 0, y.r || 0),
          m: Math.max(x.m || 0, y.m || 0),
          w: Math.max(x.w || 0, y.w || 0),
          d: capDays([...(x.d || []), ...(y.d || [])])
        };
      });
    });
    const la = (localState && localState.log) || {};
    const lb = (cloudState && cloudState.log) || {};
    new Set([...Object.keys(la), ...Object.keys(lb)]).forEach((k) => {
      const x = la[k] || {};
      const y = lb[k] || {};
      merged.log[k] = {};
      ["xp", "rare", "unique", ...SOCKETS].forEach((f) => {
        merged.log[k][f] = Math.max(x[f] || 0, y[f] || 0);
      });
    });
    merged.updatedAt = Math.max((localState && localState.updatedAt) || 0, (cloudState && cloudState.updatedAt) || 0);
    return merged;
  }

  return {
    TIERS,
    pass, touch, unpass,
    getRec, rarityOf, deckSummary,
    profile, levelInfo, peekLoot, dismissLoot,
    levelForecast, deckRareForecast, upgradeOnPass,
    getLog, dayNum,
    getForCloud, setFromCloud, mergeForCloud
  };
})();
