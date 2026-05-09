/**
 * Level registry. To add N4/N3:
 *   1. create js/data/n4/units.js (window.N4_UNITS)
 *      and js/data/n4/conjugation.js (window.N4_VERBS / N4_ADJECTIVES)
 *   2. include those <script> tags in index.html
 *   3. add an entry below
 *
 * Each unit's `id` must remain stable across edits — bookmarks/quiz
 * progress are keyed off it.
 */
window.LEVELS = {
  n5: {
    id: "n5",
    label: "N5 (เริ่มต้น)",
    units: window.N5_UNITS || [],
    verbs: window.N5_VERBS || [],
    adjectives: window.N5_ADJECTIVES || [],
    formLabels: window.N5_FORM_LABELS || {}
  }
  // n4: { id:"n4", label:"N4", units: window.N4_UNITS, ... }
};

window.LEVEL_ORDER = ["n5"]; // append "n4", "n3" later
