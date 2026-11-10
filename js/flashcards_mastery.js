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
 * คำซีด: คำระดับ Magic ขึ้นไปที่ไม่ได้ทวนผ่านมา ≥ FADE_DAYS วัน ระดับไม่ลด
 * แค่ขึ้นสถานะซีด แล้วคำประจำวันจะดึงมาให้ทวน ผ่านครั้งเดียวก็กลับมาสด
 *
 * วัน = วันที่เวลาไทย แปลงเป็นเลขวัน (epoch day) ให้เก็บได้เล็ก
 *
 * Shape:
 *   {
 *     decks: { [deckId]: { [wordId]: { r, m, w, d: [dayNum, ...], t } | { g } } },
 *     gone:  { [deckId]: xp },
 *     log:   { [dayNum]: { xp, rare, unique, r, m, w } },
 *     updatedAt: number
 *   }
 * r/m/w = จำนวนครั้งที่ผ่าน, d = วันที่ผ่าน (ไม่ซ้ำ เรียงจากเก่า) เก็บวันแรก
 * + MAX_DAYS-1 วันล่าสุด, t = ระดับสูงสุดที่เคยได้ (ระดับไม่ลดแม้แก้คำทีหลัง)
 * { g } = คำที่ถูกลบ เหลือแค่ XP ที่สะสมไว้; gone = XP ของชุดคำที่ถูกลบ
 * (ลบคำ/ชุดคำแล้ว XP และเลเวลไม่หาย)
 * log = XP ที่ได้, จำนวนคำที่ขึ้น Rare/Unique และจำนวนครั้งที่ผ่านแต่ละ socket
 * ในแต่ละวัน (เก็บ LOG_KEEP วัน) ใช้คาดการณ์ว่าจะถึงเลเวล/ทั้งชุดเป็น Rare
 * เมื่อไหร่ และนับความคืบหน้า Challenge รายเดือน
 *
 * Cross-device merge: รายคำ — r/m/w/t เอาค่าสูงสุด, d รวมกันแล้วตัดตาม MAX_DAYS;
 * คำ/ชุดคำที่ถูกลบ (ตาม flashcards ที่ merge แล้ว) ถูกย่อเหลือ XP;
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
  const FADE_DAYS = 21;

  const TIERS = [
    { key: "none",   label: "ยังไม่เจอ" },
    { key: "normal", label: "Normal" },
    { key: "magic",  label: "Magic" },
    { key: "rare",   label: "Rare" },
    { key: "unique", label: "Unique" }
  ];

  function emptyState() { return { decks: {}, gone: {}, log: {}, updatedAt: 0 }; }

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
      if (!state.gone || typeof state.gone !== "object") state.gone = {};
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
  function thailandDate() { return window.FlashcardsStreak.thailandDate(); }
  function dayNum(dateStr) { return Math.floor(Date.parse(dateStr + "T00:00:00Z") / 86400000); }
  // Cached for a minute: Intl date formatting is slow and callers like the
  // Daily pool builder ask once per word.
  let todayCache = { at: 0, n: 0 };
  function today() {
    const now = Date.now();
    if (now - todayCache.at > 60000) todayCache = { at: now, n: dayNum(thailandDate()) };
    return todayCache.n;
  }
  function dayToDate(n) { return new Date(n * 86400000); }

  function capDays(days) {
    const uniq = Array.from(new Set(days)).sort((a, b) => a - b);
    if (uniq.length <= MAX_DAYS) return uniq;
    return [uniq[0], ...uniq.slice(uniq.length - (MAX_DAYS - 1))];
  }

  /* ---------- records ---------- */
  // A deleted word's leftover: { g: xp }.
  function isGone(rec) { return !!rec && typeof rec.g === "number"; }
  function ensureRec(state, deckId, wordId) {
    const deck = state.decks[deckId] || (state.decks[deckId] = {});
    if (!deck[wordId] || isGone(deck[wordId])) deck[wordId] = { r: 0, m: 0, w: 0, d: [] };
    const rec = deck[wordId];
    if (!Array.isArray(rec.d)) rec.d = [];
    return rec;
  }
  // Live (not deleted) record or null.
  function liveRec(recs, wordId) {
    const rec = recs && recs[wordId];
    return rec && !isGone(rec) ? rec : null;
  }
  function getRec(deckId, wordId) { return liveRec(load().decks[deckId], wordId); }

  // `front` (the word's front text) is optional; callers that have the word
  // pass it so the log needn't look the word up in FlashcardsStorage.
  function pass(deckId, wordId, socket, front) {
    if (!deckId || !wordId || !SOCKETS.includes(socket)) return;
    const state = load();
    const before = cloneRec(state, deckId, wordId);
    const rec = ensureRec(state, deckId, wordId);
    rec[socket] = (rec[socket] || 0) + 1;
    const t = today();
    if (!rec.d.includes(t)) rec.d = capDays([...rec.d, t]);
    logChange(state, deckId, wordId, before, rec, front);
    save(state);
  }
  // Seen but not passed (e.g. swiped "ยังไม่ได้") — counts as Normal.
  function touch(deckId, wordId, front) {
    if (!deckId || !wordId) return;
    const state = load();
    if (liveRec(state.decks[deckId], wordId)) return;
    const rec = ensureRec(state, deckId, wordId);
    logChange(state, deckId, wordId, null, rec, front);
    save(state);
  }
  // Undo of a Flash Card swipe. Today's day entry stays — the user did
  // review the word today even if they took the swipe back.
  function unpass(deckId, wordId, socket, front) {
    const state = load();
    const rec = liveRec(state.decks[deckId], wordId);
    if (!rec || !(rec[socket] > 0)) return;
    const before = cloneRec(state, deckId, wordId);
    rec[socket] -= 1;
    logChange(state, deckId, wordId, before, rec, front);
    save(state);
  }
  function cloneRec(state, deckId, wordId) {
    const rec = liveRec(state.decks[deckId], wordId);
    return rec ? { r: rec.r, m: rec.m, w: rec.w, d: rec.d.slice(), t: rec.t } : null;
  }

  // Deleting a word keeps its XP as a { g } leftover so the level doesn't drop.
  function dropWord(deckId, wordId, front) {
    const state = load();
    const rec = liveRec(state.decks[deckId], wordId);
    if (!rec) return;
    state.decks[deckId][wordId] = { g: recXp(rec, needsWriteFor(front)) };
    save(state);
  }
  // Deleting a deck banks all of its XP in `gone` and drops its records.
  function dropDeck(deck) {
    if (!deck) return;
    const state = load();
    const recs = state.decks[deck.id];
    if (!recs) return;
    const fronts = new Map((deck.words || []).map((w) => [w.id, w.front]));
    const xp = Object.keys(recs).reduce((sum, id) =>
      sum + recXp(recs[id], needsWriteFor(fronts.has(id) ? fronts.get(id) : "")), 0);
    state.gone[deck.id] = Math.max(state.gone[deck.id] || 0, xp);
    delete state.decks[deck.id];
    save(state);
  }

  /* ---------- rarity ---------- */
  function hasSockets(rec, needsWrite) {
    return rec.r > 0 && rec.m > 0 && (!needsWrite || rec.w > 0);
  }
  // Never below `t`, the highest tier already reached: editing a word (e.g.
  // adding a reading so it now needs ฟังเขียน) doesn't take a tier away.
  function rarityOf(rec, needsWrite) {
    if (!rec || isGone(rec)) return 0;
    return Math.max(rec.t || 0, computedTier(rec, needsWrite));
  }
  // Days since a faded word was last studied, or 0 if it isn't faded.
  // Only Magic+ words fade; backfilled records with no study days don't.
  function fadedDays(rec, t) {
    if (!rec || isGone(rec) || !rec.d.length) return 0;
    if (!((rec.t || 0) >= 2 || (rec.r > 0 && rec.m > 0))) return 0;
    const since = (t === undefined ? today() : t) - rec.d[rec.d.length - 1];
    return since >= FADE_DAYS ? since : 0;
  }
  function computedTier(rec, needsWrite) {
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
    // Progress lists can still hold ids of deleted words; skip those.
    const live = new Set(deck.words.map((w) => w.id));
    const sets = [
      ["r", (p.cards && p.cards.seenIds) || []],
      ["m", (p.learn && p.learn.completedIds) || []],
      ["w", (p.dictation && p.dictation.doneIds) || []]
    ];
    let changed = false;
    sets.forEach(([socket, ids]) => {
      ids.forEach((id) => {
        if (!live.has(id)) return;
        const rec = ensureRec(state, deck.id, id);
        if (!(rec[socket] > 0)) { rec[socket] = 1; changed = true; }
      });
    });
    ((p.cards && p.cards.stillUnknownIds) || []).forEach((id) => {
      if (!live.has(id) || liveRec(state.decks[deck.id], id)) return;
      ensureRec(state, deck.id, id);
      changed = true;
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
   *     faded, fadedMax        — faded words and the longest gap (days)
   *   }
   *   rareMinDays: fewest calendar days before every word could be Rare
   *                (day-gating only), used by deckRareForecast
   */
  function deckSummary(deck) {
    const counts = [0, 0, 0, 0, 0];
    const next = { needRead: 0, needMeaning: 0, needWrite: 0, rareToday: 0, rareLater: 0, uniqueToday: 0, uniqueAt: null, faded: 0, fadedMax: 0 };
    if (!deck || !Array.isArray(deck.words)) return { counts, total: 0, next, rareMinDays: 0 };
    const state = load();
    let changed = backfill(state, deck);
    const recs = state.decks[deck.id] || {};
    const t = today();
    let uniqueMin = null;
    let rareMinDays = 0;
    deck.words.forEach((w) => {
      const rec = liveRec(recs, w.id);
      const needsWrite = needsWriteFor(w.front);
      const tier = rarityOf(rec, needsWrite);
      counts[tier]++;
      if (tier < 3) {
        // Each missing study day takes one calendar day; today counts if unused.
        const have = rec ? rec.d.length : 0;
        const studiedToday = rec ? rec.d.includes(t) : false;
        rareMinDays = Math.max(rareMinDays, RARE_DAYS - have - (studiedToday ? 0 : 1));
      }
      if (!rec) return;
      // Records from before `t` existed: remember the tier they reached.
      if (tier > (rec.t || 0)) { rec.t = tier; changed = true; }
      const fd = fadedDays(rec, t);
      if (fd) { next.faded++; next.fadedMax = Math.max(next.fadedMax, fd); }
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
    if (changed) save(state);
    if (uniqueMin !== null) next.uniqueAt = dayToDate(uniqueMin);
    return { counts, total: deck.words.length, next, rareMinDays };
  }

  /* ---------- map tier ----------
   * A deck (or folder) is a POE map: T1–T16 from how far its words have
   * come. Each word scores its tier (none 0 … Unique 4); T16 means every
   * word is Unique. POE colors: white T1–5, yellow T6–10, red T11–16.
   */
  const MAP_TIERS = 16;
  function mapTier(counts) {
    const total = counts.reduce((a, b) => a + b, 0);
    const points = counts.reduce((sum, n, tier) => sum + n * tier, 0);
    const maxPts = total * 4;
    const need = (k) => Math.ceil((maxPts * (k - 1)) / (MAP_TIERS - 1));
    let tier = 1;
    while (total && tier < MAP_TIERS && points >= need(tier + 1)) tier++;
    return {
      tier,
      color: tier <= 5 ? "white" : tier <= 10 ? "yellow" : "red",
      // Word-tier steps still needed for the next map tier.
      toNext: total && tier < MAP_TIERS ? need(tier + 1) - points : 0,
      max: tier >= MAP_TIERS
    };
  }

  /* ---------- XP & character level ----------
   * XP is derived from the records, so it merges across devices for free:
   * each socket pass is worth SOCKET_XP and reaching a tier adds that
   * tier's bonus once. Deleted words/decks keep their XP (`g` / `gone`).
   */
  const SOCKET_XP = { r: 1, m: 2, w: 3 };
  const TIER_BONUS = [0, 1, 5, 20, 50];
  const MAX_LEVEL = 100;

  function recXp(rec, needsWrite) {
    if (!rec) return 0;
    if (isGone(rec)) return rec.g;
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
  // XP kept from deleted decks and deleted words.
  function bankedXp(state) {
    let xp = Object.values(state.gone).reduce((a, b) => a + (b || 0), 0);
    Object.values(state.decks).forEach((recs) => {
      Object.values(recs).forEach((rec) => { if (isGone(rec)) xp += rec.g; });
    });
    return xp;
  }
  // Whole-collection stats: XP/level plus tier counts over every live deck.
  // `state` lets a caller pass the in-flight (not yet saved) store.
  function profile(state) {
    state = state || load();
    const counts = [0, 0, 0, 0, 0];
    let xp = bankedXp(state);
    let words = 0;
    let faded = 0;
    const t = today();
    liveDecks().forEach((deck) => {
      const recs = state.decks[deck.id] || {};
      (deck.words || []).forEach((w) => {
        const rec = liveRec(recs, w.id);
        const nw = needsWriteFor(w.front);
        counts[rarityOf(rec, nw)]++;
        xp += recXp(rec, nw);
        if (fadedDays(rec, t)) faded++;
        words++;
      });
    });
    return Object.assign(levelInfo(xp), { counts, words, faded });
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
  function logChange(state, deckId, wordId, before, after, front) {
    if (typeof front !== "string") front = wordFront(deckId, wordId);
    const nw = needsWriteFor(front);
    const tierBefore = rarityOf(before, nw);
    const tierAfter = rarityOf(after, nw);
    if (after) after.t = tierAfter;
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

    // Start XP is filled in lazily by peekLoot (total minus journal.xp), so
    // a pass never has to scan the whole collection.
    if (!journal || journal.shown) journal = { startXp: null, xp: 0, ups: {}, revived: {} };
    journal.xp += delta;
    const key = deckId + "::" + wordId;
    if (fadedDays(before, t) && !fadedDays(after, t)) journal.revived[key] = front;
    const prev = journal.ups[key];
    const from = prev ? prev.from : tierBefore;
    if (tierAfter > from) journal.ups[key] = { from, to: tierAfter, front };
    else delete journal.ups[key];
  }
  /**
   * The current loot (and marks it seen), or null if nothing was earned:
   *   { xp, before: levelInfo, after: levelInfo,
   *     newWords, magic: [front], rare: [front], unique: [front],
   *     revived: [front] }  (faded words brought back)
   */
  function peekLoot() {
    const j = journal;
    if (!j) return null;
    const ups = Object.values(j.ups);
    const revived = Object.values(j.revived);
    if (j.xp <= 0 && !ups.length && !revived.length) return null;
    j.shown = true;
    if (j.startXp === null) j.startXp = profile().xp - j.xp;
    const pick = (t) => ups.filter((u) => u.to === t).map((u) => u.front);
    return {
      xp: j.xp,
      before: levelInfo(Math.max(0, j.startXp)),
      after: levelInfo(Math.max(0, j.startXp + j.xp)),
      newWords: ups.filter((u) => u.from === 0).length,
      magic: pick(2),
      rare: pick(3),
      unique: pick(4),
      revived
    };
  }
  function dismissLoot() { journal = null; }

  /* ---------- forecast ----------
   * Average pace over the last RATE_WINDOW days, counting days with no
   * study. The window only shrinks for a brand-new history (it never
   * reaches back before the first logged day ever). Needs at least
   * MIN_FORECAST_DAYS of history before it projects anything.
   */
  function pace() {
    const log = load().log;
    const t = today();
    const all = Object.keys(log).map(Number).filter((k) => k <= t);
    if (!all.length) return { ready: false, daysLeft: MIN_FORECAST_DAYS, span: 0 };
    const span = Math.min(RATE_WINDOW, t - Math.min(...all) + 1);
    if (span < MIN_FORECAST_DAYS) return { ready: false, daysLeft: MIN_FORECAST_DAYS - span, span };
    let xp = 0, rare = 0;
    all.filter((k) => k > t - span).forEach((k) => { xp += Math.max(0, log[k].xp || 0); rare += log[k].rare || 0; });
    return { ready: true, span, xpPerDay: xp / span, rarePerDay: rare / span };
  }
  function addDays(n) { return dayToDate(today() + n); }
  function getLog() { return load().log; }
  // A deck's { wordId: record } map, read once for bulk lookups.
  function deckRecords(deckId) { return load().decks[deckId] || {}; }

  /**
   * Level projections:
   *   { ready, daysLeft } until there's enough history, then
   *   { ready, xpPerDay, nextLevel: {level, days, date},
   *     milestone: {level, days, date} | null }  (days null = no pace)
   * `info` = an already computed profile(), to avoid a second full scan.
   */
  function levelForecast(info) {
    const p = pace();
    if (!p.ready) return p;
    info = info || profile();
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
   * `sum` = deckSummary(deck) when the caller already has it.
   */
  function deckRareForecast(deck, sum) {
    const p = pace();
    if (!p.ready) return p;
    sum = sum || deckSummary(deck);
    const remaining = sum.counts[0] + sum.counts[1] + sum.counts[2];
    const minDays = sum.rareMinDays;
    if (!remaining) return { ready: true, remaining: 0, rarePerDay: p.rarePerDay, days: 0, date: addDays(0) };
    if (!(p.rarePerDay > 0)) return { ready: true, remaining, rarePerDay: 0, days: null, date: null };
    const days = Math.max(minDays, Math.ceil(remaining / p.rarePerDay));
    return { ready: true, remaining, rarePerDay: p.rarePerDay, days, date: addDays(days) };
  }

  // Tier a Flash Card pass today would move this word to, if higher than
  // its current tier (0 = no change). Daily Words uses it to surface words
  // that are one review away from levelling up.
  // `recs` = deckRecords(deckId), when checking many words of one deck.
  function upgradeOnPass(deckId, word, recs) {
    recs = recs || load().decks[deckId];
    const rec = liveRec(recs, word.id);
    if (!rec) return 0;
    const t = today();
    if (rec.d.includes(t) && rec.r > 0) return 0;
    const nw = needsWriteFor(word.front);
    const now = rarityOf(rec, nw);
    const next = computedTier({ r: rec.r + 1, m: rec.m, w: rec.w, d: capDays([...rec.d, t]) }, nw);
    return next > now ? next : 0;
  }

  /* ---------- cloud hooks ---------- */
  function getForCloud() { return load(); }
  function setFromCloud(state) {
    if (!state || typeof state !== "object") return;
    localStorage.setItem(KEY, JSON.stringify(state));
  }
  /**
   * `flashcards` = the already merged FlashcardsStorage state (optional).
   * With it, records of deleted decks (tombstoned) collapse into `gone`
   * and records of words no longer in their deck collapse to { g }, so
   * deletions on one device don't come back from another. Without it
   * (no deck data), nothing is pruned.
   */
  function mergeForCloud(localState, cloudState, flashcards) {
    const a = (localState && localState.decks) || {};
    const b = (cloudState && cloudState.decks) || {};
    const merged = emptyState();
    const ga = (localState && localState.gone) || {};
    const gb = (cloudState && cloudState.gone) || {};
    new Set([...Object.keys(ga), ...Object.keys(gb)]).forEach((k) => {
      merged.gone[k] = Math.max(ga[k] || 0, gb[k] || 0);
    });
    const deleted = (flashcards && flashcards.deletedDecks) || {};
    const liveWords = new Map(((flashcards && flashcards.decks) || []).map((d) =>
      [d.id, new Set((d.words || []).map((w) => w.id))]));
    new Set([...Object.keys(a), ...Object.keys(b)]).forEach((deckId) => {
      const da = a[deckId] || {};
      const db = b[deckId] || {};
      const out = {};
      new Set([...Object.keys(da), ...Object.keys(db)]).forEach((wordId) => {
        const x = da[wordId] || {};
        const y = db[wordId] || {};
        if (isGone(x) || isGone(y)) {
          // Max of every XP figure seen for it, so a merge never counts twice.
          out[wordId] = { g: Math.max(isGone(x) ? x.g : recXp(liveRec(da, wordId), true),
                                      isGone(y) ? y.g : recXp(liveRec(db, wordId), true)) };
          return;
        }
        out[wordId] = {
          r: Math.max(x.r || 0, y.r || 0),
          m: Math.max(x.m || 0, y.m || 0),
          w: Math.max(x.w || 0, y.w || 0),
          d: capDays([...(x.d || []), ...(y.d || [])]),
          t: Math.max(x.t || 0, y.t || 0)
        };
      });
      if (deleted[deckId] || merged.gone[deckId] !== undefined) {
        const xp = Object.values(out).reduce((sum, rec) => sum + recXp(rec, true), 0);
        merged.gone[deckId] = Math.max(merged.gone[deckId] || 0, xp);
        return;
      }
      const words = liveWords.get(deckId);
      if (words) {
        Object.keys(out).forEach((wordId) => {
          if (!words.has(wordId) && !isGone(out[wordId])) out[wordId] = { g: recXp(out[wordId], true) };
        });
      }
      merged.decks[deckId] = out;
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
    pass, touch, unpass, dropWord, dropDeck,
    getRec, rarityOf, deckSummary, mapTier,
    profile, levelInfo, peekLoot, dismissLoot,
    levelForecast, deckRareForecast, upgradeOnPass,
    getLog, dayNum, deckRecords, fadedDays, FADE_DAYS,
    getForCloud, setFromCloud, mergeForCloud
  };
})();
