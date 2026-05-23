/**
 * Top-level controller. Owns the active level, active tab, and
 * any nested unit/quiz selection. Re-renders #view on each change.
 */
(function () {
  const view = document.getElementById("view");
  const tabs = document.querySelectorAll(".tab");
  const levelSel = document.getElementById("levelSelect");

  // Populate level dropdown
  window.LEVEL_ORDER.forEach((id) => {
    const opt = document.createElement("option");
    opt.value = id;
    opt.textContent = window.LEVELS[id].label;
    levelSel.appendChild(opt);
  });

  const state = {
    level: window.LEVEL_ORDER[0],
    tab: "units",
    selectedUnit: null, // id when reading; null when on list
    quizUnit: null
  };

  function setTab(name) {
    state.tab = name;
    tabs.forEach((t) => t.classList.toggle("active", t.dataset.tab === name));
    if (name !== "units") state.selectedUnit = null;
    if (name !== "quiz") state.quizUnit = null;
    render();
  }

  tabs.forEach((t) => t.addEventListener("click", () => setTab(t.dataset.tab)));

  levelSel.addEventListener("change", () => {
    state.level = levelSel.value;
    state.selectedUnit = null;
    state.quizUnit = null;
    render();
  });

  function render() {
    view.innerHTML = "";
    let node;

    if (state.tab === "units") {
      if (!state.selectedUnit) {
        node = window.UnitsView.renderList(state.level, (id) => {
          state.selectedUnit = id;
          render();
        });
      } else {
        node = window.UnitsView.renderUnit(
          state.level,
          state.selectedUnit,
          () => { state.selectedUnit = null; render(); },
          (unitId) => { state.tab = "quiz"; state.quizUnit = unitId;
            tabs.forEach((t) => t.classList.toggle("active", t.dataset.tab === "quiz"));
            render(); }
        );
      }
    } else if (state.tab === "quiz") {
      node = window.QuizView.render(state.level, state.quizUnit, (unitId) => {
        state.quizUnit = unitId;
        render();
      });
    } else if (state.tab === "particles") {
      node = window.ParticlesView.render();
    } else if (state.tab === "conjugation") {
      // Conjugation is not level-segmented (shared pool across all levels).
      node = window.ConjugationView.render();
    } else if (state.tab === "flashcards") {
      node = window.FlashcardsView.render();
    } else if (state.tab === "dictation") {
      node = window.DictationView.render();
    } else if (state.tab === "bookmarks") {
      node = window.BookmarksView.render();
    }

    if (node) view.appendChild(node);
  }

  render();

  // Re-render after a cloud pull/merge so views reflect the merged state
  document.addEventListener("cloud-pulled", render);

  /* ---------- one-shot seed of N5/N4/N3 Thai flashcard decks ----------
   * Runs after the first cloud-pulled event (signed-in users) or after a
   * short grace period (signed-out users) so we don't clobber existing
   * cloud data. Idempotent — only adds decks that aren't already present.
   */
  const SEED_FLAG = "jp_flashcards_seeded_th_v1";
  const SEED_DEFS = [
    { name: "N5_Thai", csv: "N5_Thai.csv" },
    { name: "N4_Thai", csv: "N4_Thai.csv" },
    { name: "N3_Thai", csv: "N3_Thai.csv" }
  ];
  let seedRan = false;
  async function runSeed() {
    if (seedRan) return;
    seedRan = true;
    if (localStorage.getItem(SEED_FLAG)) return;
    if (!window.FlashcardsStorage) return;
    const FS = window.FlashcardsStorage;
    let added = 0;
    for (const def of SEED_DEFS) {
      const cur = FS.load();
      if (cur.decks.some((d) => d.name === def.name)) continue;
      try {
        const res = await fetch(def.csv);
        if (!res.ok) continue;
        const text = await res.text();
        const newDeck = FS.createDeck(def.name);
        FS.importCSV(newDeck.id, text);
        added++;
      } catch (e) {
        console.warn("[seed] failed for", def.name, e);
      }
    }
    localStorage.setItem(SEED_FLAG, "1");
    if (added > 0 && state.tab === "flashcards") render();
  }
  document.addEventListener("cloud-pulled", () => { runSeed(); }, { once: true });
  setTimeout(() => {
    if (window.CloudSync && window.CloudSync.isSignedIn && window.CloudSync.isSignedIn()) return;
    runSeed();
  }, 2500);

  /* ---------- one-shot cleanup of stray Japanese in Thai back fields ----------
   * Earlier seed imports may have stored back text like "霜, น้ำค้างแข็ง" with
   * leftover Japanese characters. Strip Japanese from any back that also
   * contains Thai characters (so back-side mixed Japanese clearly is junk),
   * then dedupe prefix tokens.
   */
  const CLEAN_FLAG = "jp_flashcards_cleaned_th_v2";
  const JP_RE_G = /[\u3040-\u30ff\u4e00-\u9fff\uff66-\uff9f]+/g;
  const JP_RE = /[\u3040-\u30ff\u4e00-\u9fff\uff66-\uff9f]/;
  const TH_RE = /[\u0e00-\u0e7f]/;
  function cleanThaiBack(raw) {
    let s = String(raw || "").replace(JP_RE_G, "");
    s = s.replace(/^[\s,]+|[\s,]+$/g, "")
         .replace(/\s*,\s*,\s*/g, ", ")
         .replace(/\s+,/g, ",");
    const tokens = s.split(/\s*,\s*/).map((t) => t.trim()).filter(Boolean);
    const keep = [];
    tokens.forEach((t) => {
      const subsumed = tokens.some((o) => o !== t && o.startsWith(t) && o.length > t.length);
      if (!subsumed && !keep.includes(t)) keep.push(t);
    });
    return keep.join(", ");
  }
  let cleanRan = false;
  function runClean() {
    if (cleanRan) return;
    cleanRan = true;
    if (localStorage.getItem(CLEAN_FLAG)) return;
    if (!window.FlashcardsStorage) return;
    const FS = window.FlashcardsStorage;
    const cur = FS.load();
    let changed = false;
    cur.decks.forEach((d) => {
      d.words.forEach((w) => {
        // Only clean backs that mix Thai + Japanese — leave pure-Japanese
        // backs (e.g. kanji-to-reading decks) untouched.
        if (!TH_RE.test(w.back || "")) return;
        if (!JP_RE.test(w.back || "")) return;
        const cleaned = cleanThaiBack(w.back);
        if (cleaned && cleaned !== w.back) { w.back = cleaned; changed = true; }
      });
    });
    if (changed) FS.save(cur);
    localStorage.setItem(CLEAN_FLAG, "1");
    if (changed && state.tab === "flashcards") render();
  }
  document.addEventListener("cloud-pulled", () => { runClean(); }, { once: true });
  setTimeout(() => {
    if (window.CloudSync && window.CloudSync.isSignedIn && window.CloudSync.isSignedIn()) return;
    runClean();
  }, 3000);
})();
