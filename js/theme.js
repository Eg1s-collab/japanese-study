/* Theme picker: applies CSS custom properties for accent palette.
 * Stores choice in localStorage("nihongo.theme"). Loaded BEFORE views
 * so initial paint already uses the saved theme.
 */
(function () {
  const STORAGE_KEY = "nihongo.theme";

  const THEMES = {
    sakura: {
      label: "桜",
      accent: "#f8a5c2",
      strong: "#ff8fb1",
      deep:   "#e0648f",
      orb1:   "rgba(255, 143, 177, 0.55)",
      orb2:   "rgba(139, 157, 217, 0.45)",
      orb3:   "rgba(224, 100, 143, 0.40)",
    },
    indigo: {
      label: "藍",
      accent: "#8fb0ff",
      strong: "#7a9cff",
      deep:   "#4d6fd9",
      orb1:   "rgba(139, 157, 217, 0.55)",
      orb2:   "rgba(122, 156, 255, 0.45)",
      orb3:   "rgba(77, 111, 217, 0.40)",
    },
    matcha: {
      label: "抹茶",
      accent: "#9fdca0",
      strong: "#7ecb83",
      deep:   "#4f9d6b",
      orb1:   "rgba(159, 220, 160, 0.50)",
      orb2:   "rgba(120, 188, 143, 0.45)",
      orb3:   "rgba(79, 157, 107, 0.40)",
    },
    fuji: {
      label: "藤",
      accent: "#c8a5f8",
      strong: "#b48cf2",
      deep:   "#8a5fd6",
      orb1:   "rgba(200, 165, 248, 0.55)",
      orb2:   "rgba(180, 140, 242, 0.45)",
      orb3:   "rgba(138, 95, 214, 0.40)",
    },
    shu: {
      label: "朱",
      accent: "#ff9e7a",
      strong: "#ff7e57",
      deep:   "#d24a3c",
      orb1:   "rgba(255, 126, 87, 0.55)",
      orb2:   "rgba(255, 158, 122, 0.45)",
      orb3:   "rgba(210, 74, 60, 0.40)",
    },
    kurenai: {
      label: "紅",
      accent: "#ff6b7a",
      strong: "#e84855",
      deep:   "#b3122a",
      orb1:   "rgba(232, 72, 85, 0.55)",
      orb2:   "rgba(255, 107, 122, 0.45)",
      orb3:   "rgba(179, 18, 42, 0.40)",
    },
    kogane: {
      label: "黄金",
      accent: "#f5d36b",
      strong: "#ecc24a",
      deep:   "#c89a2a",
      orb1:   "rgba(245, 211, 107, 0.50)",
      orb2:   "rgba(236, 194, 74, 0.45)",
      orb3:   "rgba(200, 154, 42, 0.40)",
    },
    // Reward themes — unlocked by finishing monthly flashcard challenges
    // (FlashcardsChallenges.REWARDS). Colors follow POE item rarities.
    magic: {
      label: "Magic",
      reward: true,
      accent: "#9fa1ff",
      strong: "#8a8cff",
      deep:   "#5457d6",
      orb1:   "rgba(138, 140, 255, 0.55)",
      orb2:   "rgba(84, 87, 214, 0.45)",
      orb3:   "rgba(159, 161, 255, 0.35)",
    },
    rare: {
      label: "Rare",
      reward: true,
      accent: "#ffe27a",
      strong: "#f2d45c",
      deep:   "#b8941f",
      orb1:   "rgba(242, 212, 92, 0.50)",
      orb2:   "rgba(184, 148, 31, 0.45)",
      orb3:   "rgba(255, 226, 122, 0.30)",
    },
    unique: {
      label: "Unique",
      reward: true,
      accent: "#f0a060",
      strong: "#e8893c",
      deep:   "#a8541c",
      orb1:   "rgba(232, 137, 60, 0.55)",
      orb2:   "rgba(168, 84, 28, 0.45)",
      orb3:   "rgba(240, 160, 96, 0.35)",
    },
    sumi: {
      label: "墨",
      accent: "#c8c0d2",
      strong: "#b4abc0",
      deep:   "#7a7286",
      orb1:   "rgba(200, 192, 210, 0.40)",
      orb2:   "rgba(180, 171, 192, 0.35)",
      orb3:   "rgba(122, 114, 134, 0.30)",
    },
  };

  function hexToRgba(hex, a) {
    const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!m) return hex;
    const r = parseInt(m[1], 16), g = parseInt(m[2], 16), b = parseInt(m[3], 16);
    return `rgba(${r}, ${g}, ${b}, ${a})`;
  }

  function apply(themeKey) {
    const t = THEMES[themeKey] || THEMES.sakura;
    const r = document.documentElement.style;
    r.setProperty("--accent",        t.accent);
    r.setProperty("--accent-strong", t.strong);
    r.setProperty("--accent-deep",   t.deep);
    r.setProperty("--accent-soft",   hexToRgba(t.accent, 0.16));
    r.setProperty("--accent-softer", hexToRgba(t.accent, 0.08));
    r.setProperty("--accent-glow",   hexToRgba(t.strong, 0.30));
    r.setProperty("--accent-border", hexToRgba(t.strong, 0.50));
    r.setProperty("--accent-strong-rgba", hexToRgba(t.strong, 0.95));
    r.setProperty("--accent-deep-rgba",   hexToRgba(t.deep,   0.95));
    r.setProperty("--orb-1", t.orb1);
    r.setProperty("--orb-2", t.orb2);
    r.setProperty("--orb-3", t.orb3);
    document.documentElement.dataset.theme = themeKey;

    // paint each swatch its color
    document.querySelectorAll(".theme-swatch").forEach((s) => {
      const key = s.dataset.theme;
      const def = THEMES[key];
      if (def) {
        s.style.setProperty("--sw", def.accent);
        s.style.setProperty("--sw2", def.deep);
      }
      s.classList.toggle("active", key === themeKey);
    });
    paintLocks();
    // paint the current-color dot on the button
    const dot = document.querySelector(".theme-btn-dot");
    if (dot) dot.style.background = `linear-gradient(135deg, ${t.accent}, ${t.deep})`;
  }

  // A reward theme is locked until FlashcardsChallenges records its unlock.
  function isLocked(key) {
    const def = THEMES[key];
    if (!def || !def.reward) return false;
    const FC = window.FlashcardsChallenges;
    return !(FC && FC.isUnlocked(key));
  }
  function paintLocks() {
    const hint = document.querySelector(".theme-lock-hint");
    if (hint) hint.textContent = "";
    document.querySelectorAll(".theme-swatch").forEach((s) => {
      const key = s.dataset.theme;
      if (!THEMES[key] || !THEMES[key].reward) return;
      const locked = isLocked(key);
      s.classList.toggle("locked", locked);
      const FC = window.FlashcardsChallenges;
      const r = FC && FC.rewardFor(key);
      s.title = locked && r
        ? `🔒 ${THEMES[key].label} — ทำ Challenge บัตรคำให้ครบ ${r.need} ข้อในเดือนเดียวเพื่อปลดล็อก`
        : `${THEMES[key].label} (ธีมรางวัล)`;
    });
  }

  function load() {
    try { return localStorage.getItem(STORAGE_KEY) || "sakura"; }
    catch (_) { return "sakura"; }
  }
  function save(k) {
    try { localStorage.setItem(STORAGE_KEY, k); } catch (_) {}
  }

  function init() {
    const btn = document.getElementById("themeBtn");
    const pop = document.getElementById("themePopover");
    if (!btn || !pop) return;
    const topbar = btn.closest(".topbar");

    apply(load());

    function setOpen(open) {
      pop.hidden = !open;
      btn.setAttribute("aria-expanded", open ? "true" : "false");
      // Lift the whole topbar above the sticky tabs bar while the popover is
      // open — the popover sits inside the topbar's stacking context, so the
      // topbar itself must outrank .tabs for the swatches to be tappable.
      if (topbar) topbar.classList.toggle("theme-open", open);
    }

    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      if (pop.hidden) paintLocks();
      setOpen(pop.hidden);
    });
    pop.addEventListener("click", (e) => {
      const sw = e.target.closest(".theme-swatch");
      if (!sw) return;
      const key = sw.dataset.theme;
      if (isLocked(key)) {
        const hint = pop.querySelector(".theme-lock-hint");
        if (hint) hint.textContent = sw.title;
        return;
      }
      apply(key);
      save(key);
      setOpen(false);
    });
    document.addEventListener("click", (e) => {
      if (pop.hidden) return;
      if (e.target.closest("#themePopover") || e.target.closest("#themeBtn")) return;
      setOpen(false);
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !pop.hidden) setOpen(false);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  // expose for debugging
  window.__theme = { apply, THEMES, paintLocks };
})();
