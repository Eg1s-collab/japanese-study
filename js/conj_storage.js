/**
 * localStorage progress for the conjugation drill.
 * Tracks per (level → kind → key → form): tries, correct count, last timestamp.
 *
 * kind: "verb" | "i-adj" | "na-adj"
 * key:  verb dict (item.dict)  OR  adjective word (item.word)
 */
window.ConjStorage = (function () {
  const KEY = "jp_conjugation_progress_v1";

  function load() {
    let raw = {};
    try { raw = JSON.parse(localStorage.getItem(KEY)) || {}; }
    catch (e) { raw = {}; }
    const { data, changed } = migrate(raw);
    if (changed) localStorage.setItem(KEY, JSON.stringify(data));
    return data;
  }
  function save(data) {
    localStorage.setItem(KEY, JSON.stringify(data));
    if (window.CloudSync) window.CloudSync.notifyChange();
  }

  // Conjugation is no longer level-segmented — fold any legacy per-level
  // keys (e.g. "n5") into the shared "all" pool. Pure: returns a fresh object.
  function migrate(data) {
    if (!data || typeof data !== "object") return { data: data || {}, changed: false };
    const legacy = Object.keys(data).filter((k) => k !== "all");
    if (!legacy.length) return { data, changed: false };
    const all = data.all ? JSON.parse(JSON.stringify(data.all)) : {};
    legacy.forEach((lv) => {
      const src = data[lv] || {};
      Object.keys(src).forEach((kind) => {
        all[kind] = all[kind] || {};
        Object.keys(src[kind] || {}).forEach((key) => {
          const dst = all[kind][key] = all[kind][key] || {};
          const sk = src[kind][key];
          Object.keys(sk).forEach((form) => {
            const a = dst[form], b = sk[form];
            if (!a) dst[form] = b;
            else if ((b.lastTs || 0) > (a.lastTs || 0)) dst[form] = b;
            else if ((b.lastTs || 0) === (a.lastTs || 0)) {
              dst[form] = {
                tries: Math.max(a.tries || 0, b.tries || 0),
                correct: Math.max(a.correct || 0, b.correct || 0),
                lastTs: a.lastTs || b.lastTs || 0
              };
            }
          });
        });
      });
    });
    return { data: { all }, changed: true };
  }

  function record(level, kind, key, form, isCorrect) {
    const data = load();
    data[level] = data[level] || {};
    data[level][kind] = data[level][kind] || {};
    data[level][kind][key] = data[level][kind][key] || {};
    const slot = data[level][kind][key][form] || { tries: 0, correct: 0, lastTs: 0 };
    slot.tries += 1;
    if (isCorrect) slot.correct += 1;
    slot.lastTs = Date.now();
    data[level][kind][key][form] = slot;
    save(data);
    return slot;
  }

  function getItem(level, kind, key) {
    const data = load();
    return (data[level] && data[level][kind] && data[level][kind][key]) || {};
  }

  function getAll(level, kind) {
    const data = load();
    return (data[level] && data[level][kind]) || {};
  }

  /** done = forms with correct >= 1; tried = forms with tries >= 1 */
  function summary(level, kind, key, allForms) {
    const item = getItem(level, kind, key);
    let done = 0, tried = 0;
    allForms.forEach((f) => {
      if (item[f]) {
        if (item[f].correct > 0) done += 1;
        else if (item[f].tries > 0) tried += 1;
      }
    });
    return { item, done, tried, total: allForms.length };
  }

  /** Aggregate completion across an array of items + all their forms. */
  function totals(level, kind, items, allForms) {
    const data = load();
    const lv = (data[level] && data[level][kind]) || {};
    let done = 0, perfectItems = 0;
    items.forEach((it) => {
      const k = (kind === "verb") ? it.dict : it.word;
      const slot = lv[k] || {};
      let itemDone = 0;
      allForms.forEach((f) => {
        if (slot[f] && slot[f].correct > 0) { done += 1; itemDone += 1; }
      });
      if (itemDone === allForms.length) perfectItems += 1;
    });
    return { done, total: items.length * allForms.length, perfectItems, totalItems: items.length };
  }

  function resetLevel(level) {
    const data = load();
    delete data[level];
    save(data);
  }
  function resetKind(level, kind) {
    const data = load();
    if (data[level]) { delete data[level][kind]; save(data); }
  }

  return { load, record, getItem, getAll, summary, totals, resetLevel, resetKind, migrate };
})();
