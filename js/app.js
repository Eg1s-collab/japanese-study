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
    } else if (state.tab === "conjugation") {
      node = window.ConjugationView.render(state.level);
    } else if (state.tab === "bookmarks") {
      node = window.BookmarksView.render();
    }

    if (node) view.appendChild(node);
  }

  render();
})();
