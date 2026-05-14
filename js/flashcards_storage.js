/**
 * Flashcards storage — folders, decks, words.
 * Persisted to localStorage and (when signed in) mirrored to Firestore
 * via cloud_sync.js. Whole-document last-write-wins on top-level
 * `updatedAt`; concurrent edits across devices keep the newer device.
 *
 * Shape:
 *   {
 *     folders: [{ id, name, createdAt }],
 *     decks: [{
 *       id, name, folderId|null, createdAt,
 *       words: [{ id, front, back, starred, createdAt }]
 *     }],
 *     updatedAt: number
 *   }
 */
window.FlashcardsStorage = (function () {
  const KEY = "jp_flashcards_v1";

  function emptyState() {
    return { folders: [], decks: [], updatedAt: 0 };
  }

  function load() {
    try {
      const raw = JSON.parse(localStorage.getItem(KEY));
      if (!raw || typeof raw !== "object") return emptyState();
      raw.folders = Array.isArray(raw.folders) ? raw.folders : [];
      raw.decks = Array.isArray(raw.decks) ? raw.decks : [];
      raw.decks.forEach((d) => { d.words = Array.isArray(d.words) ? d.words : []; });
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

  function uid(prefix) {
    return prefix + "_" + Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);
  }

  /* ---------- folders ---------- */
  function createFolder(name) {
    const state = load();
    const f = { id: uid("f"), name: String(name || "").trim() || "โฟลเดอร์", createdAt: Date.now() };
    state.folders.push(f);
    save(state);
    return f;
  }
  function renameFolder(id, name) {
    const state = load();
    const f = state.folders.find((x) => x.id === id);
    if (f) { f.name = String(name || "").trim() || f.name; save(state); }
  }
  function deleteFolder(id, moveDecksTo) {
    const state = load();
    state.folders = state.folders.filter((f) => f.id !== id);
    state.decks.forEach((d) => { if (d.folderId === id) d.folderId = moveDecksTo || null; });
    save(state);
  }

  /* ---------- decks ---------- */
  function createDeck(name, folderId) {
    const state = load();
    const d = {
      id: uid("d"),
      name: String(name || "").trim() || "ชุดคำใหม่",
      folderId: folderId || null,
      createdAt: Date.now(),
      words: []
    };
    state.decks.push(d);
    save(state);
    return d;
  }
  function renameDeck(id, name) {
    const state = load();
    const d = state.decks.find((x) => x.id === id);
    if (d) { d.name = String(name || "").trim() || d.name; save(state); }
  }
  function moveDeck(id, folderId) {
    const state = load();
    const d = state.decks.find((x) => x.id === id);
    if (d) { d.folderId = folderId || null; save(state); }
  }
  function deleteDeck(id) {
    const state = load();
    state.decks = state.decks.filter((d) => d.id !== id);
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
    save(state);
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
    save(state);
  }
  function deleteWord(deckId, wordId) {
    const state = load();
    const d = state.decks.find((x) => x.id === deckId);
    if (!d) return;
    d.words = d.words.filter((w) => w.id !== wordId);
    save(state);
  }
  function toggleStar(deckId, wordId) {
    const state = load();
    const d = state.decks.find((x) => x.id === deckId);
    if (!d) return false;
    const w = d.words.find((x) => x.id === wordId);
    if (!w) return false;
    w.starred = !w.starred;
    save(state);
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
    save(state);
    return { added };
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
  // Whole-doc last-write-wins by top-level updatedAt
  function mergeForCloud(localState, cloudState) {
    const a = localState || emptyState();
    const b = cloudState || emptyState();
    return (b.updatedAt || 0) > (a.updatedAt || 0) ? b : a;
  }

  return {
    load, save,
    createFolder, renameFolder, deleteFolder,
    createDeck, renameDeck, moveDeck, deleteDeck,
    addWord, updateWord, deleteWord, toggleStar,
    parseCSV, importCSV,
    getDeck, getFolder,
    getForCloud, setFromCloud, mergeForCloud
  };
})();
