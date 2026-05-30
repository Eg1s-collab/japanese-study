/**
 * Top-level controller. Owns the active level, active tab, and
 * any nested unit/quiz selection. Re-renders #view on each change.
 */
(function () {
  const view = document.getElementById("view");
  const tabsNav = document.querySelector(".tabs");
  const tabs = document.querySelectorAll(".tab");
  const tabList = Array.from(tabs);
  const TAB_NAMES = tabList.map((t) => t.dataset.tab);
  const levelSel = document.getElementById("levelSelect");

  // Populate level dropdown
  window.LEVEL_ORDER.forEach((id) => {
    const opt = document.createElement("option");
    opt.value = id;
    opt.textContent = window.LEVELS[id].label;
    levelSel.appendChild(opt);
  });

  /* ---------- persist last-used level + tab across reloads ---------- */
  const LEVEL_KEY = "nihongo.level";
  const TAB_KEY = "nihongo.tab";
  function readSaved(key, valid, fallback) {
    try {
      const v = localStorage.getItem(key);
      return valid.includes(v) ? v : fallback;
    } catch (_) { return fallback; }
  }
  function writeSaved(key, value) {
    try { localStorage.setItem(key, value); } catch (_) {}
  }

  const state = {
    level: readSaved(LEVEL_KEY, window.LEVEL_ORDER, window.LEVEL_ORDER[0]),
    tab: readSaved(TAB_KEY, TAB_NAMES, "units"),
    selectedUnit: null, // id when reading; null when on list
    quizUnit: null
  };
  levelSel.value = state.level;

  // Toggle active class, ARIA state, and roving tabindex on the tablist,
  // then bring the active tab into view (matters on narrow, scrolling navs).
  function setActiveTabDom(name) {
    tabs.forEach((t) => {
      const on = t.dataset.tab === name;
      t.classList.toggle("active", on);
      t.setAttribute("aria-selected", on ? "true" : "false");
      t.tabIndex = on ? 0 : -1;
      if (on && t.scrollIntoView) t.scrollIntoView({ block: "nearest", inline: "nearest" });
    });
    updateTabFades();
  }

  /* ---------- hash routing ----------
   * The URL hash is the source of truth for navigation, so the browser
   * Back button moves between tabs / unit drill-downs instead of leaving
   * the app. Format: "#<tab>" or "#<tab>/<subId>" where subId is a unit id
   * (units / quiz) or the "__daily__" quiz sentinel. Level stays in
   * localStorage — it's a filter, not a navigation step.
   */
  function hashFor(tab, sub) {
    return "#" + tab + (sub != null && sub !== "" ? "/" + encodeURIComponent(sub) : "");
  }
  // Navigate by setting the hash; this pushes a history entry so Back works.
  function go(tab, sub) {
    const h = hashFor(tab, sub);
    if (location.hash === h) route(); // identical hash won't fire hashchange
    else location.hash = h;
  }
  function route() {
    const raw = (location.hash || "").replace(/^#/, "");
    const slash = raw.indexOf("/");
    let tab = decodeURIComponent(slash === -1 ? raw : raw.slice(0, slash));
    const sub = slash === -1 ? "" : decodeURIComponent(raw.slice(slash + 1));
    if (!TAB_NAMES.includes(tab)) tab = readSaved(TAB_KEY, TAB_NAMES, "units");
    state.tab = tab;
    writeSaved(TAB_KEY, tab);
    state.selectedUnit = null;
    state.quizUnit = null;
    if (tab === "units" && sub) {
      const lv = window.LEVELS[state.level];
      // Guard against a unit id from a different level (e.g. a shared link).
      state.selectedUnit = lv && lv.units.some((u) => u.id === sub) ? sub : null;
    } else if (tab === "quiz" && sub) {
      state.quizUnit = sub; // QuizView validates the unit id / daily sentinel
    }
    setActiveTabDom(tab);
    render();
  }
  function setTab(name) { go(name); }

  tabs.forEach((t) => t.addEventListener("click", () => setTab(t.dataset.tab)));
  window.addEventListener("hashchange", route);

  // WAI-ARIA tablist keyboard support: arrows move + activate, Home/End jump.
  if (tabsNav) {
    tabsNav.addEventListener("keydown", (e) => {
      const cur = tabList.indexOf(document.activeElement);
      if (cur === -1) return;
      let next = -1;
      if (e.key === "ArrowRight" || e.key === "ArrowDown") next = (cur + 1) % tabList.length;
      else if (e.key === "ArrowLeft" || e.key === "ArrowUp") next = (cur - 1 + tabList.length) % tabList.length;
      else if (e.key === "Home") next = 0;
      else if (e.key === "End") next = tabList.length - 1;
      else return;
      e.preventDefault();
      tabList[next].focus();
      setTab(tabList[next].dataset.tab);
    });
  }

  // Fade the scroll edge that still has hidden tabs, so it reads as scrollable.
  function updateTabFades() {
    if (!tabsNav) return;
    const max = tabsNav.scrollWidth - tabsNav.clientWidth;
    tabsNav.classList.toggle("fade-left", tabsNav.scrollLeft > 1);
    tabsNav.classList.toggle("fade-right", tabsNav.scrollLeft < max - 1);
  }
  if (tabsNav) {
    tabsNav.addEventListener("scroll", updateTabFades, { passive: true });
    window.addEventListener("resize", updateTabFades);
  }

  levelSel.addEventListener("change", () => {
    state.level = levelSel.value;
    writeSaved(LEVEL_KEY, state.level);
    state.selectedUnit = null;
    state.quizUnit = null;
    // Changing level is a filter, not navigation: drop any unit sub-id from
    // the URL without pushing a history entry, then repaint.
    const h = hashFor(state.tab);
    if (location.hash !== h) history.replaceState(null, "", h);
    render();
  });

  function render() {
    view.innerHTML = "";
    let node;

    if (state.tab === "units") {
      if (!state.selectedUnit) {
        node = window.UnitsView.renderList(state.level, (id) => go("units", id));
      } else {
        node = window.UnitsView.renderUnit(
          state.level,
          state.selectedUnit,
          () => go("units"),
          (unitId) => go("quiz", unitId)
        );
      }
    } else if (state.tab === "quiz") {
      node = window.QuizView.render(state.level, state.quizUnit, (unitId) => go("quiz", unitId));
    } else if (state.tab === "particles") {
      node = window.ParticlesView.render();
    } else if (state.tab === "conjugation") {
      // Conjugation is not level-segmented (shared pool across all levels).
      node = window.ConjugationView.render();
    } else if (state.tab === "flashcards") {
      node = window.FlashcardsView.render();
    } else if (state.tab === "dictation") {
      node = window.DictationView.render();
    } else if (state.tab === "arrange") {
      node = window.ArrangeView.render();
    } else if (state.tab === "bookmarks") {
      node = window.BookmarksView.render();
    }

    if (node) view.appendChild(node);
  }

  // Bootstrap: if the URL has no valid tab hash (fresh visit), seed it from
  // the saved tab without adding a history entry; then route() paints it.
  (function initRoute() {
    const tab = decodeURIComponent((location.hash || "").replace(/^#/, "").split("/")[0]);
    if (!TAB_NAMES.includes(tab)) {
      history.replaceState(null, "", hashFor(readSaved(TAB_KEY, TAB_NAMES, "units")));
    }
    route();
  })();

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
