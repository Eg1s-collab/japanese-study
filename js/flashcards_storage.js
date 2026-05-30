/**
 * Flashcards storage — folders, decks, words, progress.
 * Persisted to localStorage and (when signed in) mirrored to Firestore
 * via cloud_sync.js. Whole-document last-write-wins on top-level
 * `updatedAt`; concurrent edits across devices keep the newer device.
 *
 * Shape:
 *   {
 *     folders: [{ id, name, createdAt }],
 *     decks: [{
 *       id, name, folderId|null, createdAt,
 *       words: [{ id, front, back, starred, createdAt }],
 *       chunkSize: number|null,     // null = no sub-sets
 *       selectedChunk: number,      // 0-based index of the first selected chunk (legacy)
 *       selectedChunks: number[],   // 0-based indices of all selected chunks (multi-select)
 *       progress: {
 *         cards: { seenIds: [wordId, ...] },
 *         learn: { completedIds: [wordId, ...], attempts: n, correct: n }
 *       }
 *     }],
 *     updatedAt: number
 *   }
 */
window.FlashcardsStorage = (function () {
  const KEY = "jp_flashcards_v1";

  function emptyState() {
    return { folders: [], decks: [], deletedDecks: {}, deletedFolders: {}, updatedAt: 0 };
  }

  function ensureDeckShape(d) {
    // Per-deck last-write-wins timestamp. Legacy decks (created before this
    // existed) fall back to createdAt so they have a stable baseline; any
    // future edit bumps it via commitDeck().
    if (typeof d.updatedAt !== "number") d.updatedAt = d.createdAt || 0;
    if (typeof d.chunkSize === "undefined") d.chunkSize = null;
    if (typeof d.selectedChunk !== "number" || d.selectedChunk < 0) d.selectedChunk = 0;
    // Multi-chunk selection (review can span several sub-sets at once).
    // Migrate legacy single-chunk decks by seeding [selectedChunk].
    if (!Array.isArray(d.selectedChunks) || !d.selectedChunks.length) {
      d.selectedChunks = [d.selectedChunk || 0];
    }
    d.selectedChunks = d.selectedChunks
      .map((n) => Math.max(0, Math.floor(Number(n) || 0)))
      .filter((n, i, a) => a.indexOf(n) === i)
      .sort((a, b) => a - b);
    if (!d.selectedChunks.length) d.selectedChunks = [0];
    if (!d.progress || typeof d.progress !== "object") d.progress = {};
    if (!d.progress.cards || typeof d.progress.cards !== "object") d.progress.cards = {};
    if (!Array.isArray(d.progress.cards.seenIds)) d.progress.cards.seenIds = [];
    if (!Array.isArray(d.progress.cards.queueIds)) d.progress.cards.queueIds = [];
    if (!Array.isArray(d.progress.cards.wrongIds)) d.progress.cards.wrongIds = [];
    // Sticky set of words the user has marked "ยังไม่ได้" on a flash card
    // (across sessions), cleared only when the same word is later marked
    // "ผ่าน". Used by Daily Words to prioritize previously-uncertain items.
    if (!Array.isArray(d.progress.cards.stillUnknownIds)) d.progress.cards.stillUnknownIds = [];
    if (typeof d.progress.cards.roundTotal !== "number") d.progress.cards.roundTotal = 0;
    if (!d.progress.learn || typeof d.progress.learn !== "object") d.progress.learn = {};
    if (!Array.isArray(d.progress.learn.completedIds)) d.progress.learn.completedIds = [];
    if (!Array.isArray(d.progress.learn.queueIds)) d.progress.learn.queueIds = [];
    if (!Array.isArray(d.progress.learn.wrongIds)) d.progress.learn.wrongIds = [];
    if (typeof d.progress.learn.roundTotal !== "number") d.progress.learn.roundTotal = 0;
    if (typeof d.progress.learn.attempts !== "number") d.progress.learn.attempts = 0;
    if (typeof d.progress.learn.correct !== "number") d.progress.learn.correct = 0;
    return d;
  }

  function load() {
    try {
      const raw = JSON.parse(localStorage.getItem(KEY));
      if (!raw || typeof raw !== "object") return emptyState();
      raw.folders = Array.isArray(raw.folders) ? raw.folders : [];
      raw.decks = Array.isArray(raw.decks) ? raw.decks : [];
      raw.folders.forEach((f) => {
        if (typeof f.updatedAt !== "number") f.updatedAt = f.createdAt || 0;
      });
      raw.decks.forEach((d) => {
        d.words = Array.isArray(d.words) ? d.words : [];
        ensureDeckShape(d);
      });
      raw.deletedDecks = (raw.deletedDecks && typeof raw.deletedDecks === "object") ? raw.deletedDecks : {};
      raw.deletedFolders = (raw.deletedFolders && typeof raw.deletedFolders === "object") ? raw.deletedFolders : {};
      raw.updatedAt = raw.updatedAt || 0;
      return raw;
    } catch (e) {
      return emptyState();
    }
  }

  function save(state, opts) {
    state.updatedAt = Date.now();
    localStorage.setItem(KEY, JSON.stringify(state));
    if (!opts || !opts.skipCloud) {
      if (window.CloudSync) window.CloudSync.notifyChange();
    }
  }

  // Save after a deck mutation, stamping the deck's own updatedAt so cross-
  // device merges resolve per-deck (a reset or edit on the most-recently-used
  // device wins, instead of one stale doc clobbering everything).
  function commitDeck(state, d) {
    if (d) d.updatedAt = Date.now();
    save(state);
  }

  function uid(prefix) {
    return prefix + "_" + Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);
  }

  /* ---------- folders ---------- */
  function createFolder(name) {
    const state = load();
    const now = Date.now();
    const f = { id: uid("f"), name: String(name || "").trim() || "โฟลเดอร์", createdAt: now, updatedAt: now };
    state.folders.push(f);
    save(state);
    return f;
  }
  function renameFolder(id, name) {
    const state = load();
    const f = state.folders.find((x) => x.id === id);
    if (f) { f.name = String(name || "").trim() || f.name; f.updatedAt = Date.now(); save(state); }
  }
  function deleteFolder(id, moveDecksTo) {
    const state = load();
    const existed = state.folders.some((f) => f.id === id);
    state.folders = state.folders.filter((f) => f.id !== id);
    const now = Date.now();
    state.decks.forEach((d) => {
      if (d.folderId === id) { d.folderId = moveDecksTo || null; d.updatedAt = now; }
    });
    if (existed) state.deletedFolders[id] = now;
    save(state);
  }

  /* ---------- decks ---------- */
  function createDeck(name, folderId) {
    const state = load();
    const now = Date.now();
    const d = ensureDeckShape({
      id: uid("d"),
      name: String(name || "").trim() || "ชุดคำใหม่",
      folderId: folderId || null,
      createdAt: now,
      updatedAt: now,
      words: []
    });
    state.decks.push(d);
    save(state);
    return d;
  }
  function renameDeck(id, name) {
    const state = load();
    const d = state.decks.find((x) => x.id === id);
    if (d) { d.name = String(name || "").trim() || d.name; commitDeck(state, d); }
  }
  function moveDeck(id, folderId) {
    const state = load();
    const d = state.decks.find((x) => x.id === id);
    if (d) { d.folderId = folderId || null; commitDeck(state, d); }
  }
  function deleteDeck(id) {
    const state = load();
    const before = state.decks.length;
    state.decks = state.decks.filter((d) => d.id !== id);
    if (state.decks.length !== before) state.deletedDecks[id] = Date.now();
    save(state);
  }

  /* ---------- words ---------- */
  function addWord(deckId, front, back) {
    const state = load();
    const d = state.decks.find((x) => x.id === deckId);
    if (!d) return null;
    const w = {
      id: uid("w"),
      front: String(front || "").trim(),
      back: String(back || "").trim(),
      starred: false,
      createdAt: Date.now()
    };
    if (!w.front && !w.back) return null;
    d.words.push(w);
    commitDeck(state, d);
    return w;
  }
  function updateWord(deckId, wordId, front, back) {
    const state = load();
    const d = state.decks.find((x) => x.id === deckId);
    if (!d) return;
    const w = d.words.find((x) => x.id === wordId);
    if (!w) return;
    w.front = String(front || "").trim();
    w.back = String(back || "").trim();
    commitDeck(state, d);
  }
  function deleteWord(deckId, wordId) {
    const state = load();
    const d = state.decks.find((x) => x.id === deckId);
    if (!d) return;
    d.words = d.words.filter((w) => w.id !== wordId);
    commitDeck(state, d);
  }
  function toggleStar(deckId, wordId) {
    const state = load();
    const d = state.decks.find((x) => x.id === deckId);
    if (!d) return false;
    const w = d.words.find((x) => x.id === wordId);
    if (!w) return false;
    w.starred = !w.starred;
    commitDeck(state, d);
    return w.starred;
  }

  /* ---------- CSV import ----------
   * Accepts 2+ column CSV. First two columns are taken as (front, back).
   * Handles quoted fields with embedded commas / escaped quotes "".
   * If the first row's first cell looks like a header (front/word/term/…), skips it.
   */
  function parseCSV(text) {
    const rows = [];
    let cur = [];
    let field = "";
    let inQ = false;
    const s = String(text || "").replace(/\r\n?/g, "\n");
    for (let i = 0; i < s.length; i++) {
      const ch = s[i];
      if (inQ) {
        if (ch === '"') {
          if (s[i + 1] === '"') { field += '"'; i++; }
          else { inQ = false; }
        } else {
          field += ch;
        }
      } else {
        if (ch === '"') inQ = true;
        else if (ch === ",") { cur.push(field); field = ""; }
        else if (ch === "\n") {
          cur.push(field); field = "";
          if (cur.some((c) => c !== "")) rows.push(cur);
          cur = [];
        } else { field += ch; }
      }
    }
    if (field !== "" || cur.length) { cur.push(field); if (cur.some((c) => c !== "")) rows.push(cur); }
    return rows;
  }

  function importCSV(deckId, text) {
    const state = load();
    const d = state.decks.find((x) => x.id === deckId);
    if (!d) return { added: 0 };
    const rows = parseCSV(text);
    if (!rows.length) return { added: 0 };

    // Heuristic: drop header row if first column looks like a header keyword
    const headerHints = ["front", "word", "term", "japanese", "kanji", "vocab", "คำ", "ศัพท์"];
    const first = (rows[0][0] || "").trim().toLowerCase();
    const startAt = headerHints.includes(first) ? 1 : 0;

    let added = 0;
    for (let i = startAt; i < rows.length; i++) {
      const r = rows[i];
      const front = String(r[0] || "").trim();
      const back = String(r[1] || "").trim();
      if (!front && !back) continue;
      d.words.push({
        id: uid("w"),
        front, back,
        starred: false,
        createdAt: Date.now() + i
      });
      added++;
    }
    commitDeck(state, d);
    return { added };
  }

  /* ---------- chunks ---------- */
  function clearRounds(d) {
    ensureDeckShape(d);
    d.progress.cards.queueIds = [];
    d.progress.cards.wrongIds = [];
    d.progress.cards.roundTotal = 0;
    d.progress.learn.queueIds = [];
    d.progress.learn.wrongIds = [];
    d.progress.learn.roundTotal = 0;
  }
  function setChunkSize(deckId, size) {
    const state = load();
    const d = state.decks.find((x) => x.id === deckId);
    if (!d) return;
    const n = Number(size);
    d.chunkSize = (n && n > 0) ? Math.floor(n) : null;
    d.selectedChunk = 0;
    d.selectedChunks = [0];
    clearRounds(d);
    commitDeck(state, d);
  }
  function setSelectedChunk(deckId, idx) {
    const state = load();
    const d = state.decks.find((x) => x.id === deckId);
    if (!d) return;
    d.selectedChunk = Math.max(0, Math.floor(Number(idx) || 0));
    d.selectedChunks = [d.selectedChunk];
    clearRounds(d);
    commitDeck(state, d);
  }
  function setSelectedChunks(deckId, indices) {
    const state = load();
    const d = state.decks.find((x) => x.id === deckId);
    if (!d) return;
    const total = chunkCount(d);
    const clean = (Array.isArray(indices) ? indices : [])
      .map((n) => Math.max(0, Math.floor(Number(n) || 0)))
      .filter((n) => n < total)
      .filter((n, i, a) => a.indexOf(n) === i)
      .sort((a, b) => a - b);
    d.selectedChunks = clean.length ? clean : [0];
    d.selectedChunk = d.selectedChunks[0];
    clearRounds(d);
    commitDeck(state, d);
  }
  function chunkCount(deck) {
    if (!deck.chunkSize || !deck.words.length) return 1;
    return Math.max(1, Math.ceil(deck.words.length / deck.chunkSize));
  }
  function selectedChunkIndices(deck) {
    if (!deck.chunkSize) return [0];
    const total = chunkCount(deck);
    const arr = Array.isArray(deck.selectedChunks) && deck.selectedChunks.length
      ? deck.selectedChunks
      : [deck.selectedChunk || 0];
    return arr
      .map((n) => Math.max(0, Math.min(total - 1, Math.floor(Number(n) || 0))))
      .filter((n, i, a) => a.indexOf(n) === i)
      .sort((a, b) => a - b);
  }
  function chunkWords(deck) {
    if (!deck.chunkSize) return deck.words.slice();
    const size = deck.chunkSize;
    const indices = selectedChunkIndices(deck);
    const out = [];
    for (const idx of indices) {
      out.push(...deck.words.slice(idx * size, idx * size + size));
    }
    return out;
  }
  function chunkRange(deck) {
    if (!deck.chunkSize) return { from: 1, to: deck.words.length };
    const size = deck.chunkSize;
    const indices = selectedChunkIndices(deck);
    if (indices.length === 1) {
      const idx = indices[0];
      return { from: idx * size + 1, to: Math.min(deck.words.length, (idx + 1) * size) };
    }
    // Non-contiguous (or multiple) selection — no single range.
    return null;
  }

  /* ---------- progress ---------- */
  function markCardSeen(deckId, wordId) {
    const state = load();
    const d = state.decks.find((x) => x.id === deckId);
    if (!d) return;
    ensureDeckShape(d);
    let changed = false;
    if (!d.progress.cards.seenIds.includes(wordId)) {
      d.progress.cards.seenIds.push(wordId);
      changed = true;
    }
    // Passing a card clears its "still unknown" tag — the user
    // demonstrated mastery this round.
    const before = d.progress.cards.stillUnknownIds.length;
    d.progress.cards.stillUnknownIds = d.progress.cards.stillUnknownIds.filter((id) => id !== wordId);
    if (d.progress.cards.stillUnknownIds.length !== before) changed = true;
    if (changed) {
      commitDeck(state, d);
      if (window.FlashcardsStreak) window.FlashcardsStreak.addCards(1);
    }
  }
  function markCardUnknown(deckId, wordId) {
    const state = load();
    const d = state.decks.find((x) => x.id === deckId);
    if (!d) return;
    ensureDeckShape(d);
    if (!d.progress.cards.stillUnknownIds.includes(wordId)) {
      d.progress.cards.stillUnknownIds.push(wordId);
      commitDeck(state, d);
    }
  }
  function unmarkCardSeen(deckId, wordId) {
    const state = load();
    const d = state.decks.find((x) => x.id === deckId);
    if (!d) return;
    ensureDeckShape(d);
    const before = d.progress.cards.seenIds.length;
    d.progress.cards.seenIds = d.progress.cards.seenIds.filter((id) => id !== wordId);
    if (d.progress.cards.seenIds.length !== before) commitDeck(state, d);
  }
  function recordLearnAttempt(deckId, wordId, isCorrect, opts) {
    const state = load();
    const d = state.decks.find((x) => x.id === deckId);
    if (!d) return;
    ensureDeckShape(d);
    d.progress.learn.attempts++;
    let newlyCompleted = 0;
    if (isCorrect) {
      d.progress.learn.correct++;
      const markCompleted = !opts || opts.markCompleted !== false;
      if (markCompleted && !d.progress.learn.completedIds.includes(wordId)) {
        d.progress.learn.completedIds.push(wordId);
        newlyCompleted = 1;
      }
    }
    commitDeck(state, d);
    if (newlyCompleted && window.FlashcardsStreak) window.FlashcardsStreak.addCards(newlyCompleted);
  }
  function markLearnCompleted(deckId, wordIds) {
    const state = load();
    const d = state.decks.find((x) => x.id === deckId);
    if (!d) return;
    ensureDeckShape(d);
    const list = Array.isArray(wordIds) ? wordIds : [wordIds];
    let added = 0;
    for (const id of list) {
      if (id && !d.progress.learn.completedIds.includes(id)) {
        d.progress.learn.completedIds.push(id);
        added++;
      }
    }
    if (added) {
      commitDeck(state, d);
      if (window.FlashcardsStreak) window.FlashcardsStreak.addCards(added);
    }
  }
  function clearProgress(deckId, mode) {
    const state = load();
    const d = state.decks.find((x) => x.id === deckId);
    if (!d) return;
    ensureDeckShape(d);
    if (mode === "cards" || mode === "all") {
      d.progress.cards = { seenIds: [], queueIds: [], wrongIds: [], stillUnknownIds: [], roundTotal: 0 };
    }
    if (mode === "learn" || mode === "all") {
      d.progress.learn = { completedIds: [], queueIds: [], wrongIds: [], roundTotal: 0, attempts: 0, correct: 0 };
    }
    commitDeck(state, d);
  }
  // Reset progress only for the supplied wordIds (e.g. the currently
  // selected sub-chunk). Aggregate counters (attempts/correct) are left
  // intact since they reflect deck-wide history.
  function clearProgressForWords(deckId, mode, wordIds) {
    const state = load();
    const d = state.decks.find((x) => x.id === deckId);
    if (!d) return;
    ensureDeckShape(d);
    const idSet = new Set(Array.isArray(wordIds) ? wordIds : []);
    if (!idSet.size) return;
    if (mode === "cards" || mode === "all") {
      d.progress.cards.seenIds = d.progress.cards.seenIds.filter((id) => !idSet.has(id));
      d.progress.cards.queueIds = d.progress.cards.queueIds.filter((id) => !idSet.has(id));
      d.progress.cards.wrongIds = d.progress.cards.wrongIds.filter((id) => !idSet.has(id));
      d.progress.cards.stillUnknownIds = d.progress.cards.stillUnknownIds.filter((id) => !idSet.has(id));
      if (!d.progress.cards.queueIds.length && !d.progress.cards.wrongIds.length) {
        d.progress.cards.roundTotal = 0;
      }
    }
    if (mode === "learn" || mode === "all") {
      d.progress.learn.completedIds = d.progress.learn.completedIds.filter((id) => !idSet.has(id));
      d.progress.learn.queueIds = d.progress.learn.queueIds.filter((id) => !idSet.has(id));
      d.progress.learn.wrongIds = d.progress.learn.wrongIds.filter((id) => !idSet.has(id));
      if (!d.progress.learn.queueIds.length && !d.progress.learn.wrongIds.length) {
        d.progress.learn.roundTotal = 0;
      }
    }
    commitDeck(state, d);
  }
  function setCardsRound(deckId, partial) {
    const state = load();
    const d = state.decks.find((x) => x.id === deckId);
    if (!d) return;
    ensureDeckShape(d);
    if ("queueIds" in partial) d.progress.cards.queueIds = partial.queueIds.slice();
    if ("wrongIds" in partial) d.progress.cards.wrongIds = partial.wrongIds.slice();
    if ("roundTotal" in partial) d.progress.cards.roundTotal = partial.roundTotal;
    commitDeck(state, d);
  }
  function setLearnRound(deckId, partial) {
    const state = load();
    const d = state.decks.find((x) => x.id === deckId);
    if (!d) return;
    ensureDeckShape(d);
    if ("queueIds" in partial) d.progress.learn.queueIds = partial.queueIds.slice();
    if ("wrongIds" in partial) d.progress.learn.wrongIds = partial.wrongIds.slice();
    if ("roundTotal" in partial) d.progress.learn.roundTotal = partial.roundTotal;
    commitDeck(state, d);
  }

  /* ---------- queries ---------- */
  function getDeck(id) { return load().decks.find((d) => d.id === id) || null; }
  function getFolder(id) { return load().folders.find((f) => f.id === id) || null; }

  /* ---------- cloud sync hooks ---------- */
  function getForCloud() {
    return load();
  }
  function setFromCloud(state) {
    if (!state || typeof state !== "object") return;
    localStorage.setItem(KEY, JSON.stringify(state));
  }
  /* ---------- cloud merge ----------
   * Conflict-free per-record merge, so a stale or cold-start write can never
   * clobber the real copy on the sign-in pull:
   *   • decks / folders: union by id; for an id on both sides the one with the
   *     newer per-record `updatedAt` wins (so a reset or edit on the
   *     most-recently-used device propagates).
   *   • deletions: tracked as tombstones ({ id: deletedAt }). A record is
   *     dropped when a tombstone's deletedAt is >= the record's updatedAt, so a
   *     delete on one device propagates — yet an edit made AFTER the delete
   *     (updatedAt > deletedAt) wins, i.e. "edit beats delete".
   * Tombstones older than 180 days are pruned to bound document growth.
   */
  const TOMBSTONE_TTL = 180 * 24 * 60 * 60 * 1000;

  function mergeTombstones(a, b) {
    const out = {};
    [a, b].forEach((m) => {
      if (m && typeof m === "object") {
        for (const id in m) {
          const t = Number(m[id]) || 0;
          if (t > (out[id] || 0)) out[id] = t;
        }
      }
    });
    return out;
  }
  function pruneTombstones(map) {
    const cutoff = Date.now() - TOMBSTONE_TTL;
    const out = {};
    for (const id in map) { if ((map[id] || 0) >= cutoff) out[id] = map[id]; }
    return out;
  }
  // A record survives unless a tombstone for it is at least as new as its
  // own last edit.
  function alive(rec, tombstones) {
    const t = tombstones[rec.id];
    return typeof t !== "number" || t < (rec.updatedAt || 0);
  }
  function normalizeForMerge(s) {
    const st = (s && typeof s === "object") ? s : emptyState();
    const folders = (Array.isArray(st.folders) ? st.folders : []).map((f) => {
      if (typeof f.updatedAt !== "number") f.updatedAt = f.createdAt || 0;
      return f;
    });
    const decks = (Array.isArray(st.decks) ? st.decks : []).map((d) => {
      d.words = Array.isArray(d.words) ? d.words : [];
      return ensureDeckShape(d);
    });
    return {
      folders, decks,
      deletedDecks: (st.deletedDecks && typeof st.deletedDecks === "object") ? st.deletedDecks : {},
      deletedFolders: (st.deletedFolders && typeof st.deletedFolders === "object") ? st.deletedFolders : {},
      updatedAt: st.updatedAt || 0
    };
  }
  // Per-id last-write-wins on `updatedAt`.
  function pickNewer(x, y) {
    return (x.updatedAt || 0) >= (y.updatedAt || 0) ? x : y;
  }
  function mergeForCloud(localState, cloudState) {
    const a = normalizeForMerge(localState);
    const b = normalizeForMerge(cloudState);

    const delDecks = mergeTombstones(a.deletedDecks, b.deletedDecks);
    const delFolders = mergeTombstones(a.deletedFolders, b.deletedFolders);

    const folderMap = new Map();
    [...a.folders, ...b.folders].forEach((f) => {
      if (!f || !f.id) return;
      const prev = folderMap.get(f.id);
      folderMap.set(f.id, prev ? pickNewer(f, prev) : f);
    });
    const deckMap = new Map();
    [...a.decks, ...b.decks].forEach((d) => {
      if (!d || !d.id) return;
      const prev = deckMap.get(d.id);
      deckMap.set(d.id, prev ? pickNewer(d, prev) : d);
    });

    return {
      folders: [...folderMap.values()].filter((f) => alive(f, delFolders)),
      decks: [...deckMap.values()].filter((d) => alive(d, delDecks)),
      deletedDecks: pruneTombstones(delDecks),
      deletedFolders: pruneTombstones(delFolders),
      updatedAt: Math.max(a.updatedAt || 0, b.updatedAt || 0)
    };
  }

  return {
    load, save,
    createFolder, renameFolder, deleteFolder,
    createDeck, renameDeck, moveDeck, deleteDeck,
    addWord, updateWord, deleteWord, toggleStar,
    setChunkSize, setSelectedChunk, setSelectedChunks, chunkCount, chunkWords, chunkRange, selectedChunkIndices,
    markCardSeen, markCardUnknown, unmarkCardSeen, recordLearnAttempt, markLearnCompleted, clearProgress, clearProgressForWords,
    setCardsRound, setLearnRound,
    parseCSV, importCSV,
    getDeck, getFolder,
    getForCloud, setFromCloud, mergeForCloud
  };
})();
