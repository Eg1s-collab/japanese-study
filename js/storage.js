/**
 * Thin localStorage wrapper for bookmarks (questions to revisit).
 * Bookmarks are keyed globally so that a question kept from N5
 * still surfaces if the user later switches to N4.
 */
window.Storage = (function () {
  const KEY = "jp_grammar_bookmarks_v1";

  function load() {
    try {
      return JSON.parse(localStorage.getItem(KEY)) || [];
    } catch (e) {
      return [];
    }
  }
  function save(list) {
    localStorage.setItem(KEY, JSON.stringify(list));
  }

  function makeId(level, unitId, qIndex) {
    return `${level}::${unitId}::${qIndex}`;
  }

  function isBookmarked(level, unitId, qIndex) {
    const id = makeId(level, unitId, qIndex);
    return load().some((b) => b.id === id);
  }

  function toggle(level, unitId, qIndex, snapshot) {
    const id = makeId(level, unitId, qIndex);
    const list = load();
    const idx = list.findIndex((b) => b.id === id);
    if (idx >= 0) {
      list.splice(idx, 1);
    } else {
      list.push({ id, level, unitId, qIndex, snapshot, savedAt: Date.now() });
    }
    save(list);
    return list.findIndex((b) => b.id === id) >= 0;
  }

  function remove(id) {
    save(load().filter((b) => b.id !== id));
  }

  function clear() {
    save([]);
  }

  return { load, save, isBookmarked, toggle, remove, clear, makeId };
})();
