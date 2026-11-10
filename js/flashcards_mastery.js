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
 *     updatedAt: number
 *   }
 * r/m/w = จำนวนครั้งที่ผ่าน, d = วันที่ผ่าน (ไม่ซ้ำ เรียงจากเก่า) เก็บวันแรก
 * + MAX_DAYS-1 วันล่าสุด
 *
 * Cross-device merge: รายคำ — r/m/w เอาค่าสูงสุด, d รวมกันแล้วตัดตาม MAX_DAYS
 */
window.FlashcardsMastery = (function () {
  const KEY = "jp_flashcards_mastery_v1";
  const SOCKETS = ["r", "m", "w"];
  const RARE_DAYS = 3;
  const UNIQUE_DAYS = 5;
  const UNIQUE_SPAN = 30;
  const MAX_DAYS = 12;

  const TIERS = [
    { key: "none",   label: "ยังไม่เจอ" },
    { key: "normal", label: "Normal" },
    { key: "magic",  label: "Magic" },
    { key: "rare",   label: "Rare" },
    { key: "unique", label: "Unique" }
  ];

  function emptyState() { return { decks: {}, updatedAt: 0 }; }

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
    const rec = ensureRec(state, deckId, wordId);
    rec[socket] = (rec[socket] || 0) + 1;
    const t = today();
    if (!rec.d.includes(t)) rec.d = capDays([...rec.d, t]);
    save(state);
  }
  // Seen but not passed (e.g. swiped "ยังไม่ได้") — counts as Normal.
  function touch(deckId, wordId) {
    if (!deckId || !wordId) return;
    const state = load();
    const deck = state.decks[deckId];
    if (deck && deck[wordId]) return;
    ensureRec(state, deckId, wordId);
    save(state);
  }
  // Undo of a Flash Card swipe. Today's day entry stays — the user did
  // review the word today even if they took the swipe back.
  function unpass(deckId, wordId, socket) {
    const state = load();
    const deck = state.decks[deckId];
    const rec = deck && deck[wordId];
    if (!rec || !(rec[socket] > 0)) return;
    rec[socket] -= 1;
    save(state);
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
   *     uniqueAt               — earliest Date a word can become Unique (or null)
   *   }
   */
  function deckSummary(deck) {
    const counts = [0, 0, 0, 0, 0];
    const next = { needRead: 0, needMeaning: 0, needWrite: 0, rareToday: 0, rareLater: 0, uniqueAt: null };
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
        if (uniqueMin === null || at < uniqueMin) uniqueMin = at;
      }
    });
    if (uniqueMin !== null) next.uniqueAt = dayToDate(uniqueMin);
    return { counts, total: deck.words.length, next };
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
    merged.updatedAt = Math.max((localState && localState.updatedAt) || 0, (cloudState && cloudState.updatedAt) || 0);
    return merged;
  }

  return {
    TIERS,
    pass, touch, unpass,
    getRec, rarityOf, deckSummary,
    getForCloud, setFromCloud, mergeForCloud
  };
})();
