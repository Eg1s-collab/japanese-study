/**
 * Grammar summary view — สรุปไวยากรณ์ทั้งระดับในที่เดียว + ความเชื่อมโยง
 *
 * โหมดดู:
 *   • ตาม Unit       — จัดกลุ่มตามบทเรียน (ค่าเริ่มต้น)
 *   • ตามหมวดหมู่     — จัดกลุ่มตาม "หน้าที่" (คำช่วย, การผันกริยา ฯลฯ)
 *   • ตามรูปคำ       — จัดกลุ่มตาม "รูปการผัน" (て形・た形・辞書形 ฯลฯ) ที่ derive
 *                      อัตโนมัติจากข้อความ pattern — ใช้ได้ทุกระดับ หัวข้อหนึ่งอาจ
 *                      อยู่ได้หลายรูป (เช่น うちに ใช้ได้ทั้ง 辞書形/否定形)
 *
 * นอกจากนี้:
 *   • แผง "เส้นทางการต่อยอด" — แสดงลำดับว่าหัวข้อไหนเป็นฐานของหัวข้อถัดไป
 *   • ในแต่ละหัวข้อที่กางออก จะมีแถบความเชื่อมโยง: อยู่หมวดไหน + ตำแหน่งในเส้นทาง
 *     (กดปุ่ม ก่อนหน้า/ถัดไป เพื่อกระโดดไปหัวข้อที่เกี่ยวข้องได้)
 *
 * ข้อมูลความเชื่อมโยงมาจาก window.GRAMMAR_MAP[level] (ดู js/data/grammar-map.js)
 * เนื้อหาหัวข้อยังดึงตรงจาก window.LEVELS[level].units[].points[]
 */
window.GrammarSummaryView = (function () {
  const MODE_KEY = "jp_grammar_mode_v1";

  /* taxonomy รูปการผัน — เรียงตามลำดับการเรียน; derive จาก pattern */
  const FORMS = [
    { id: "masu", icon: "連", label: "รูป ます / ます-stem (連用形)" },
    { id: "te", icon: "て", label: "รูป て (て形)" },
    { id: "ta", icon: "た", label: "รูป た (た形)" },
    { id: "nai", icon: "否", label: "รูป ない (否定形)" },
    { id: "dic", icon: "辞", label: "รูปพจนานุกรม (辞書形)" },
    { id: "ba", icon: "仮", label: "รูปเงื่อนไข ば (ば形)" },
    { id: "volitional", icon: "意", label: "รูปตั้งใจ (意向形)" },
    { id: "potential", icon: "可", label: "รูปสามารถ (可能形)" },
    { id: "passive", icon: "受", label: "รูปถูกกระทำ (受身形)" },
    { id: "causative", icon: "使", label: "รูปให้/บังคับ (使役形)" },
    { id: "imperative", icon: "命", label: "รูปสั่ง (命令形)" },
    { id: "plain", icon: "普", label: "รูปธรรมดา (普通形)" },
    { id: "other", icon: "他", label: "ไม่อิงรูปกริยา (คำนาม/สำนวน)" }
  ];
  const FORM_LABEL = {};
  FORMS.forEach((f) => { FORM_LABEL[f.id] = f; });
  const FORM_IDS = FORMS.map((f) => f.id);

  /* แยกรูปการผันจากข้อความ pattern (+ unitId เป็นบริบทเสริม) — คืน array ของ form id
   * หลักการกัน false positive: て・た・ない ต้องมี V/S นำหน้า
   *   เช่น について (มี て แต่ไม่ใช่ V-て) หรือ とは限らない (ない แต่ไม่ใช่ V) จะไม่ถูกจับ
   * ข้อยกเว้นที่จับเพิ่ม:
   *   - สำนวน て ที่ไม่กำกวม (てください・ています・てあります ฯลฯ) แม้ไม่มี V นำหน้า
   *   - pattern ขึ้นต้นด้วย 〜て (เช่น 〜てください・〜ては)
   *   - subscript ห้อย V₁て V₂ (U+2080–2089) ที่ \d เดิมจับไม่ได้
   *   - ป้ายไทยของบทพื้นฐาน เช่น "รูป ない", "ตารางผัน ます"
   *   - บทที่ "ทั้งบทเป็นรูปเดียว" (te-form / passive / causative) ใช้ unitId ยืนยัน */
  function deriveForms(pat, unitId) {
    const s = String(pat || "");
    const uid = String(unitId || "");
    const out = [];
    const add = (id) => { if (out.indexOf(id) === -1) out.push(id); };
    const D = "[\\d\\u2080-\\u2089]?"; // ASCII หรือ subscript digit (V₁ ฯลฯ)
    // รูปพิเศษ — ตรวจก่อน
    if (/可能形|可能 ?kei|見える|聞こえる|รูปสามารถ/.test(s)) add("potential");
    if (/受身形|ukemi|รูปถูกกระทำ/.test(s) || /passive/.test(uid)) add("passive");
    if (/使役形|shieki|\(さ\)せて|รูปให้ทำ/.test(s) || /causative/.test(uid)) add("causative");
    if (/命令形|meirei|รูปคำสั่ง/.test(s)) add("imperative");
    if (/意向形|ikou|รูปตั้งใจ/.test(s)) add("volitional");
    // รูป て — V/S นำหน้า · สำนวน て ชัดเจน · ขึ้นต้น 〜て · ทั้งบทเป็นรูป て
    const teCompound = /て ?(い(ます|る|ない|ません)|あり?ます|ある|おき|おく|ください|しま|みま|みる|から)/;
    if (new RegExp("[VS]" + D + "[‐\\- ]?て").test(s) ||
        /他動詞.{0,20}て|自動詞.{0,20}て/.test(s) ||
        /〜 ?て/.test(s) || teCompound.test(s) || /(^|-)te-forms?($|-)/.test(uid)) add("te");
    if (new RegExp("[VS]" + D + "[‐\\- ]?た(?!い)").test(s)) add("ta");
    if (new RegExp("[VS]" + D + "[‐\\- ]?ない").test(s) || /V[‐\- ]?ず|รูป ?ない|形 ?ない/.test(s)) add("nai");
    if (/ます[‐\- ]?stem|連用形|ผัน ?ます|V[‐\- ]?(stem|ます|ませ|ましょ|ました)/.test(s)) add("masu");
    if (/辞書形|jisho|Vる|รูปดิก|รูปพจนานุกรม/.test(s)) add("dic");
    if (/ば形|ければ|V ?[‐\-]?ば|Vば/.test(s)) add("ba");
    if (/普通形|plain|รูปธรรมดา/.test(s)) add("plain");
    if (!out.length) add("other");
    return out;
  }

  const MAP_LV_KEY = "jp_grammar_map_levels_v1";

  function loadMode() {
    try {
      const m = localStorage.getItem(MODE_KEY);
      return (m === "cat" || m === "form" || m === "unit" || m === "map") ? m : "map";
    } catch (_) { return "map"; }
  }
  function saveMode(m) {
    try { localStorage.setItem(MODE_KEY, m); } catch (_) {}
  }

  /* ชุดระดับที่แสดงในแผนผัง — เลือกได้หลายระดับพร้อมกัน (ลด/เพิ่ม N5・N4・N3) */
  function loadMapLevels(fallback) {
    try {
      const raw = JSON.parse(localStorage.getItem(MAP_LV_KEY) || "null");
      if (Array.isArray(raw)) {
        const order = window.LEVEL_ORDER || [];
        const f = order.filter((l) => raw.indexOf(l) !== -1);
        if (f.length) return f;
      }
    } catch (_) {}
    return [fallback];
  }
  function saveMapLevels(arr) {
    try { localStorage.setItem(MAP_LV_KEY, JSON.stringify(arr)); } catch (_) {}
  }

  /* การจัดกลุ่มในแผนผัง: "level" (ระดับ→หมวด) หรือ "form" (รูปคำ→ระดับ, รวมข้ามระดับ) */
  const MAP_GROUP_KEY = "jp_grammar_map_group_v1";
  function loadMapGroup() {
    try {
      const g = localStorage.getItem(MAP_GROUP_KEY);
      return g === "form" ? "form" : "level";
    } catch (_) { return "level"; }
  }
  function saveMapGroup(g) {
    try { localStorage.setItem(MAP_GROUP_KEY, g); } catch (_) {}
  }

  function render(level, onOpenUnit) {
    const lv = window.LEVELS[level];
    const root = document.createElement("div");
    if (!lv) {
      root.innerHTML = "<div class='empty'>ไม่พบระดับ</div>";
      return root;
    }

    const map = (window.GRAMMAR_MAP && window.GRAMMAR_MAP[level]) || { categories: [], paths: [] };
    const categories = map.categories || [];
    const paths = map.paths || [];
    const hasCats = categories.length > 0;
    const hasPaths = paths.length > 0;

    const units = lv.units || [];
    const unitById = {};
    units.forEach((u) => { unitById[u.id] = u; });

    function resolve(unitId, i) {
      const u = unitById[unitId];
      if (!u || !u.points || !u.points[i]) return null;
      return { unit: u, point: u.points[i], uid: unitId + "#" + i, idx: i };
    }

    /* ดัชนีความเชื่อมโยงต่อ uid (uid = "<unitId>#<index>") */
    const catOf = {};
    categories.forEach((c) => {
      (c.refs || []).forEach((ref) => {
        const uid = ref[0];
        (ref[1] || []).forEach((i) => { catOf[uid + "#" + i] = c; });
      });
    });
    const patOf = {};
    const formOf = {};
    units.forEach((u) => (u.points || []).forEach((pt, i) => {
      const uid = u.id + "#" + i;
      patOf[uid] = pt.pattern;
      formOf[uid] = deriveForms(pt.pattern, u.id);
    }));
    const pathsOf = {};
    paths.forEach((p) => {
      const steps = (p.steps || []).map((s) => s[0] + "#" + s[1]);
      steps.forEach((stepUid, k) => {
        (pathsOf[stepUid] = pathsOf[stepUid] || []).push({
          pathId: p.id, label: p.label, idx: k, total: steps.length,
          prev: k > 0 ? steps[k - 1] : null,
          next: k < steps.length - 1 ? steps[k + 1] : null
        });
      });
    });

    let mode = loadMode();
    if (mode === "cat" && !hasCats) mode = "unit";

    /* ชุดระดับสำหรับโหมดแผนผัง (default = ระดับที่เลือกอยู่) */
    let mapLevels = loadMapLevels(level);
    let mapGroup = loadMapGroup();

    const totalPoints = units.reduce((n, u) => n + (u.points ? u.points.length : 0), 0);

    root.innerHTML = `
      <h2>สรุปไวยากรณ์ ${escapeHtml(lv.label)}</h2>
      <p class="subtle">รวมทุกหัวข้อไวยากรณ์ของระดับนี้ (${units.length} unit · ${totalPoints} หัวข้อ) — แตะหัวข้อเพื่อขยายดูคำอธิบาย ตัวอย่าง และความเชื่อมโยง</p>

      ${hasPaths ? pathsPanelHtml(paths, patOf) : ""}

      <div class="gs-toolbar">
        <input type="search" id="gsSearch" class="txt-input gs-search"
          placeholder="ค้นหารูปไวยากรณ์ / คำอธิบาย…"
          autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" />
        <div class="gs-tool-btns">
          <button class="btn ghost btn-sm" id="gsExpand" type="button">ขยายทั้งหมด</button>
          <button class="btn ghost btn-sm" id="gsCollapse" type="button">ย่อทั้งหมด</button>
        </div>
      </div>

      <div class="gs-modes" role="tablist" aria-label="โหมดการจัดกลุ่ม">
        <button class="gs-mode ${mode === "map" ? "on" : ""}" data-mode="map" type="button">แผนผัง</button>
        <button class="gs-mode ${mode === "unit" ? "on" : ""}" data-mode="unit" type="button">ตาม Unit</button>
        ${hasCats ? `<button class="gs-mode ${mode === "cat" ? "on" : ""}" data-mode="cat" type="button">ตามหมวดหมู่</button>` : ""}
        <button class="gs-mode ${mode === "form" ? "on" : ""}" data-mode="form" type="button">ตามรูปคำ</button>
      </div>

      <div class="gs-map-levels" id="gsMapLevels" hidden>
        <span class="gs-map-levels-label">ระดับในแผนผัง</span>
        ${(window.LEVEL_ORDER || []).map((id) =>
          `<button class="gs-lvl-chip ${mapLevels.indexOf(id) !== -1 ? "on" : ""}" data-level="${escapeAttr(id)}" type="button">${escapeHtml(shortLevel(id))}</button>`
        ).join("")}
        <span class="gs-map-group" role="group" aria-label="วิธีจัดกลุ่มแผนผัง">
          <button class="gs-grp-btn ${mapGroup === "level" ? "on" : ""}" data-group="level" type="button">ตามระดับ</button>
          <button class="gs-grp-btn ${mapGroup === "form" ? "on" : ""}" data-group="form" type="button">ตามรูปคำ</button>
        </span>
        <span class="gs-map-hint">แตะหมวดเพื่อกางหัวข้อ · แตะหัวข้อเพื่อไปบทเรียน</span>
      </div>

      <div class="gs-sections" id="gsGroups"></div>
      <div class="gs-noresult empty" id="gsNoResult" hidden>ไม่พบหัวข้อที่ตรงกับคำค้น</div>
    `;

    const groups = root.querySelector("#gsGroups");
    const search = root.querySelector("#gsSearch");
    const noResult = root.querySelector("#gsNoResult");
    const mapLevelsBar = root.querySelector("#gsMapLevels");

    function buildGroups() {
      const isMap = mode === "map";
      mapLevelsBar.hidden = !isMap;
      groups.classList.toggle("gs-sections-map", isMap);
      if (isMap) {
        const html = mapGroup === "form" ? mapByFormHtml(mapLevels) : mapHtml(mapLevels);
        groups.innerHTML = html || `<div class='empty'>เลือกอย่างน้อยหนึ่งระดับ</div>`;
        applyMapSearch();
        return;
      }
      if (mode === "cat" && hasCats) {
        groups.innerHTML = categories.map((c) => categorySectionHtml(c, resolve, catOf, pathsOf, patOf, formOf)).join("")
          || `<div class='empty'>ยังไม่มีเนื้อหา</div>`;
      } else if (mode === "form") {
        groups.innerHTML = FORMS.map((f) => formSectionHtml(f, units, formOf, catOf, pathsOf, patOf)).filter(Boolean).join("")
          || `<div class='empty'>ยังไม่มีเนื้อหา</div>`;
      } else {
        groups.innerHTML = units.map((u) => unitSectionHtml(u, catOf, pathsOf, patOf, formOf)).join("")
          || `<div class='empty'>ยังไม่มีเนื้อหา</div>`;
      }
      applySearch();
    }

    function applySearch() {
      const q = search.value.trim().toLowerCase();
      let anyVisible = false;
      groups.querySelectorAll(".gs-group").forEach((section) => {
        let has = false;
        section.querySelectorAll(".gs-point").forEach((d) => {
          const match = !q || (d.dataset.search || "").indexOf(q) !== -1;
          d.hidden = !match;
          if (match) has = true;
        });
        section.hidden = !has;
        if (has) anyVisible = true;
      });
      noResult.hidden = anyVisible;
    }

    /* ค้นหาในโหมดแผนผัง — กรองที่ใบ (หัวข้อ) แล้วกางหมวด/ระดับที่มีผลลัพธ์ */
    function applyMapSearch() {
      const tree = groups.querySelector(".mm-tree");
      if (!tree) { noResult.hidden = true; return; }
      const q = search.value.trim().toLowerCase();
      if (!q) {
        tree.querySelectorAll(".mm-leaf").forEach((l) => { l.hidden = false; });
        if (mapGroup === "form") {
          // รูปคำ → ระดับ: ยุบทั้งหมวด(รูปคำ)และระดับ ให้เริ่มจากภาพรวม
          tree.querySelectorAll(".mm-cat-node, .mm-level-node").forEach((n) => { n.hidden = false; n.classList.add("collapsed"); });
        } else {
          tree.querySelectorAll(".mm-cat-node").forEach((c) => { c.hidden = false; c.classList.add("collapsed"); });
          tree.querySelectorAll(".mm-level-node, .mm-root-node").forEach((n) => { n.hidden = false; n.classList.remove("collapsed"); });
        }
        noResult.hidden = true;
        return;
      }
      let any = false;
      tree.querySelectorAll(".mm-leaf").forEach((l) => {
        const m = (l.dataset.search || "").indexOf(q) !== -1;
        l.hidden = !m;
        if (m) any = true;
      });
      // โหนดที่มีหัวข้ออยู่ข้างใน: ซ่อนถ้าไม่มีผลลัพธ์ กางถ้ามี (ใช้ได้ทั้งสองโครงสร้าง)
      tree.querySelectorAll(".mm-node").forEach((node) => {
        if (node.classList.contains("mm-leaf")) return;
        const leaves = node.querySelectorAll(".mm-leaf");
        if (!leaves.length) return;
        const vis = Array.prototype.some.call(leaves, (l) => !l.hidden);
        node.hidden = !vis;
        if (vis) node.classList.remove("collapsed");
      });
      noResult.hidden = any;
    }

    function jumpTo(uid) {
      const el = groups.querySelector('.gs-point[data-uid="' + cssEscape(uid) + '"]');
      if (!el) return;
      // ถ้า section ถูกซ่อนด้วยคำค้น ให้ล้างคำค้นก่อน
      if (el.hidden || (el.closest(".gs-group") || {}).hidden) {
        search.value = "";
        applySearch();
      }
      el.open = true;
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.classList.remove("gs-flash");
      void el.offsetWidth;
      el.classList.add("gs-flash");
    }

    // event delegation
    root.addEventListener("click", (e) => {
      // แผนผัง: แตะระดับเพื่อ ลด/เพิ่ม ระดับ
      const lvlChip = e.target.closest(".gs-lvl-chip");
      if (lvlChip) {
        const id = lvlChip.dataset.level;
        const has = mapLevels.indexOf(id) !== -1;
        let next = has ? mapLevels.filter((l) => l !== id) : mapLevels.concat([id]);
        if (!next.length) return; // ต้องเหลืออย่างน้อยหนึ่งระดับ
        const order = window.LEVEL_ORDER || [];
        next = order.filter((l) => next.indexOf(l) !== -1);
        mapLevels = next;
        saveMapLevels(mapLevels);
        root.querySelectorAll(".gs-lvl-chip").forEach((c) => c.classList.toggle("on", mapLevels.indexOf(c.dataset.level) !== -1));
        buildGroups();
        return;
      }

      // แผนผัง: สลับวิธีจัดกลุ่ม (ตามระดับ / ตามรูปคำ)
      const grpBtn = e.target.closest(".gs-grp-btn");
      if (grpBtn) {
        const g = grpBtn.dataset.group;
        if (g !== mapGroup) {
          mapGroup = g; saveMapGroup(mapGroup);
          root.querySelectorAll(".gs-grp-btn").forEach((b) => b.classList.toggle("on", b.dataset.group === mapGroup));
          buildGroups();
        }
        return;
      }

      // แผนผัง: แตะหัวข้อ → ไปบทเรียนนั้น
      const mapOpen = e.target.closest(".gs-map-open");
      if (mapOpen) { e.preventDefault(); if (typeof onOpenUnit === "function") onOpenUnit(mapOpen.dataset.unit); return; }

      // แผนผัง: แตะหมวด/ระดับ → กาง/ยุบกิ่ง
      const toggleLabel = e.target.closest(".mm-label[data-toggle]");
      if (toggleLabel) {
        const node = toggleLabel.closest(".mm-node");
        if (node) node.classList.toggle("collapsed");
        return;
      }

      const openBtn = e.target.closest(".gs-open-unit");
      if (openBtn) { e.preventDefault(); if (typeof onOpenUnit === "function") onOpenUnit(openBtn.dataset.unit); return; }

      const jump = e.target.closest(".gs-jump");
      if (jump) { e.preventDefault(); jumpTo(jump.dataset.target); return; }

      const catJump = e.target.closest(".gs-cat-jump");
      if (catJump && hasCats) {
        e.preventDefault();
        mode = "cat"; saveMode(mode); syncModeButtons(); buildGroups();
        const sec = groups.querySelector('.gs-group[data-cat="' + cssEscape(catJump.dataset.cat) + '"]');
        if (sec) sec.scrollIntoView({ behavior: "smooth", block: "start" });
        return;
      }

      const formJump = e.target.closest(".gs-form-jump");
      if (formJump) {
        e.preventDefault();
        mode = "form"; saveMode(mode); syncModeButtons(); buildGroups();
        const sec = groups.querySelector('.gs-group[data-form="' + cssEscape(formJump.dataset.form) + '"]');
        if (sec) sec.scrollIntoView({ behavior: "smooth", block: "start" });
        return;
      }

      const modeBtn = e.target.closest(".gs-mode");
      if (modeBtn) {
        const m = modeBtn.dataset.mode;
        if (m !== mode) { mode = m; saveMode(mode); syncModeButtons(); buildGroups(); }
        return;
      }
    });

    function syncModeButtons() {
      root.querySelectorAll(".gs-mode").forEach((b) => b.classList.toggle("on", b.dataset.mode === mode));
    }

    root.querySelector("#gsExpand").addEventListener("click", () => {
      if (mode === "map") {
        groups.querySelectorAll(".mm-node").forEach((n) => n.classList.remove("collapsed"));
        return;
      }
      groups.querySelectorAll(".gs-point:not([hidden])").forEach((d) => { d.open = true; });
    });
    root.querySelector("#gsCollapse").addEventListener("click", () => {
      if (mode === "map") {
        groups.querySelectorAll(".mm-cat-node").forEach((n) => n.classList.add("collapsed"));
        return;
      }
      groups.querySelectorAll(".gs-point").forEach((d) => { d.open = false; });
    });
    search.addEventListener("input", () => { (mode === "map" ? applyMapSearch : applySearch)(); });

    buildGroups();
    return root;
  }

  /* ---------- แผงเส้นทางการต่อยอด ---------- */
  function pathsPanelHtml(paths, patOf) {
    const items = paths.map((p) => {
      const steps = (p.steps || []).map((s, k) => {
        const uid = s[0] + "#" + s[1];
        const pat = patOf[uid] || uid;
        const arrow = k > 0 ? `<span class="gs-path-arrow" aria-hidden="true">→</span>` : "";
        return `${arrow}<button class="gs-path-step gs-jump" type="button" data-target="${escapeAttr(uid)}">${escapeHtml(shortPat(pat))}</button>`;
      }).join("");
      return `
        <div class="gs-path">
          <div class="gs-path-head">${escapeHtml(p.label)}</div>
          ${p.desc ? `<div class="gs-path-desc">${escapeHtml(p.desc)}</div>` : ""}
          <div class="gs-path-steps">${steps}</div>
        </div>`;
    }).join("");
    return `
      <details class="gs-paths-panel">
        <summary><span class="gs-paths-ico">🔗</span> เส้นทางการต่อยอด — หัวข้อไหนเป็นฐานของหัวข้อไหน (กดดู)</summary>
        <div class="gs-paths-body">${items}</div>
      </details>`;
  }

  /* ---------- group: ตาม unit ---------- */
  function unitSectionHtml(unit, catOf, pathsOf, patOf, formOf) {
    const points = (unit.points || [])
      .map((p, i) => pointHtml(p, unit, i, catOf, pathsOf, patOf, formOf, { showUnit: false }))
      .join("");
    return `
      <section class="gs-group gs-unit">
        <div class="gs-unit-head">
          <h3 class="gs-unit-title">${escapeHtml(unit.title)}</h3>
          <button class="btn ghost btn-sm gs-open-unit" type="button" data-unit="${escapeAttr(unit.id)}">เปิดบทเรียน →</button>
        </div>
        <div class="pt-guides gs-points">${points}</div>
      </section>`;
  }

  /* ---------- group: ตามหมวดหมู่ ---------- */
  function categorySectionHtml(cat, resolve, catOf, pathsOf, patOf, formOf) {
    const points = (cat.refs || []).flatMap((ref) =>
      (ref[1] || []).map((i) => {
        const r = resolve(ref[0], i);
        if (!r) return "";
        return pointHtml(r.point, r.unit, i, catOf, pathsOf, patOf, formOf, { showUnit: true });
      })
    ).join("");
    return `
      <section class="gs-group gs-cat" data-cat="${escapeAttr(cat.id)}">
        <div class="gs-cat-head">
          <span class="gs-cat-ico">${escapeHtml(cat.icon || "")}</span>
          <div class="gs-cat-titles">
            <h3 class="gs-cat-title">${escapeHtml(cat.label)}</h3>
            ${cat.desc ? `<p class="gs-cat-desc">${escapeHtml(cat.desc)}</p>` : ""}
          </div>
        </div>
        <div class="pt-guides gs-points">${points}</div>
      </section>`;
  }

  /* ---------- group: ตามรูปคำ (derive อัตโนมัติ) ---------- */
  function formSectionHtml(form, units, formOf, catOf, pathsOf, patOf) {
    const points = [];
    units.forEach((u) => (u.points || []).forEach((p, i) => {
      const uid = u.id + "#" + i;
      if ((formOf[uid] || []).indexOf(form.id) !== -1) {
        points.push(pointHtml(p, u, i, catOf, pathsOf, patOf, formOf, { showUnit: true }));
      }
    }));
    if (!points.length) return "";
    return `
      <section class="gs-group gs-cat gs-form-group" data-form="${escapeAttr(form.id)}">
        <div class="gs-cat-head">
          <span class="gs-cat-ico">${escapeHtml(form.icon || "")}</span>
          <div class="gs-cat-titles">
            <h3 class="gs-cat-title">${escapeHtml(form.label)}</h3>
            <p class="gs-cat-desc">${points.length} หัวข้อที่ใช้รูปนี้</p>
          </div>
        </div>
        <div class="pt-guides gs-points">${points.join("")}</div>
      </section>`;
  }

  /* ---------- แผนผัง (mind-map) ตามความเกี่ยวข้อง ---------- */
  /* โครงสร้าง: (ราก) → ระดับ → หมวดหมู่ → หัวข้อ
   * หัวข้อแต่ละใบกดเพื่อลิงค์ไปบทเรียน; รองรับหลายระดับพร้อมกัน */
  function mapHtml(levels) {
    const active = (levels || []).filter((id) => window.LEVELS && window.LEVELS[id]);
    if (!active.length) return "";
    const levelNodes = active.map(mmLevelNode).join("");
    let inner;
    if (active.length === 1) {
      inner = levelNodes;
    } else {
      inner = `
        <div class="mm-node mm-root-node">
          <button class="mm-label mm-root" type="button" data-toggle>
            <span class="mm-caret" aria-hidden="true">▾</span>文法
          </button>
          <div class="mm-children mm-levels">${levelNodes}</div>
        </div>`;
    }
    return `<div class="mm-tree">${inner}</div>`;
  }

  /* จัดกลุ่มตามรูปคำ — รวมหัวข้อที่ "รูปเหมือนกัน" ข้ามทุกระดับที่เลือก
   * โครงสร้าง: รูปคำ (て形 ฯลฯ) → ระดับ → หัวข้อ
   * ใช้ deriveForms() เดียวกับโหมด "ตามรูปคำ" จึงครอบคลุมทุกระดับอัตโนมัติ */
  function mapByFormHtml(levels) {
    const active = (levels || []).filter((id) => window.LEVELS && window.LEVELS[id]);
    if (!active.length) return "";
    const formNodes = FORMS.map((f) => mmFormNode(f, active)).filter(Boolean).join("");
    if (!formNodes) return "";
    return `<div class="mm-tree">${formNodes}</div>`;
  }

  function mmFormNode(form, levels) {
    let total = 0;
    const levelNodes = levels.map((levelId) => {
      const lvl = window.LEVELS[levelId] || { units: [] };
      const leaves = [];
      (lvl.units || []).forEach((u) => (u.points || []).forEach((p, i) => {
        if (deriveForms(p.pattern, u.id).indexOf(form.id) !== -1) {
          leaves.push(mmLeaf(u.id + "#" + i, p.pattern, u.id, p.desc));
        }
      }));
      if (!leaves.length) return "";
      total += leaves.length;
      return `
        <div class="mm-node mm-level-node collapsed">
          <button class="mm-label mm-level lv-${escapeAttr(levelId)}" type="button" data-toggle>
            <span class="mm-caret" aria-hidden="true">▾</span>${escapeHtml(shortLevel(levelId))}
            <span class="mm-count">${leaves.length}</span>
          </button>
          <div class="mm-children mm-points">${leaves.join("")}</div>
        </div>`;
    }).filter(Boolean);
    if (!levelNodes.length) return "";
    return `
      <div class="mm-node mm-cat-node collapsed" data-form="${escapeAttr(form.id)}">
        <button class="mm-label mm-cat" type="button" data-toggle>
          <span class="mm-caret" aria-hidden="true">▾</span>
          <span class="mm-ico">${escapeHtml(form.icon || "")}</span>
          <span class="mm-cat-label">${escapeHtml(form.label)}</span>
          <span class="mm-count">${total}</span>
        </button>
        <div class="mm-children mm-cats">${levelNodes.join("")}</div>
      </div>`;
  }

  function mmLevelNode(levelId) {
    const lvl = window.LEVELS[levelId] || { units: [] };
    const map = (window.GRAMMAR_MAP && window.GRAMMAR_MAP[levelId]) || { categories: [] };
    const units = lvl.units || [];
    const unitById = {};
    units.forEach((u) => { unitById[u.id] = u; });
    const resolveFn = (uid, i) => {
      const u = unitById[uid];
      if (!u || !u.points || !u.points[i]) return null;
      return { unit: u, point: u.points[i] };
    };

    let cats = (map.categories || []).map((c) => mmCatNode(c, levelId, resolveFn)).filter(Boolean);
    // ระดับไม่มีหมวด → ถอยไปจัดกลุ่มตาม unit
    if (!cats.length) {
      cats = units.map((u) => mmUnitCatNode(u, levelId)).filter(Boolean);
    }
    const body = cats.join("") || `<div class="mm-empty">ยังไม่มีเนื้อหา</div>`;
    return `
      <div class="mm-node mm-level-node">
        <button class="mm-label mm-level lv-${escapeAttr(levelId)}" type="button" data-toggle>
          <span class="mm-caret" aria-hidden="true">▾</span>${escapeHtml(shortLevel(levelId))}
        </button>
        <div class="mm-children mm-cats">${body}</div>
      </div>`;
  }

  function mmCatNode(cat, levelId, resolveFn) {
    const leaves = (cat.refs || []).flatMap((ref) =>
      (ref[1] || []).map((i) => {
        const r = resolveFn(ref[0], i);
        if (!r) return "";
        return mmLeaf(ref[0] + "#" + i, r.point.pattern, ref[0], r.point.desc);
      })
    ).filter(Boolean);
    if (!leaves.length) return "";
    return `
      <div class="mm-node mm-cat-node collapsed" data-cat="${escapeAttr(cat.id)}">
        <button class="mm-label mm-cat lv-${escapeAttr(levelId)}" type="button" data-toggle>
          <span class="mm-caret" aria-hidden="true">▾</span>
          <span class="mm-ico">${escapeHtml(cat.icon || "")}</span>
          <span class="mm-cat-label">${escapeHtml(cat.label)}</span>
          <span class="mm-count">${leaves.length}</span>
        </button>
        <div class="mm-children mm-points">${leaves.join("")}</div>
      </div>`;
  }

  /* fallback: หนึ่ง unit = หนึ่งหมวด เมื่อระดับยังไม่มี categories */
  function mmUnitCatNode(unit, levelId) {
    const leaves = (unit.points || []).map((p, i) =>
      mmLeaf(unit.id + "#" + i, p.pattern, unit.id, p.desc)
    );
    if (!leaves.length) return "";
    return `
      <div class="mm-node mm-cat-node collapsed" data-cat="${escapeAttr(unit.id)}">
        <button class="mm-label mm-cat lv-${escapeAttr(levelId)}" type="button" data-toggle>
          <span class="mm-caret" aria-hidden="true">▾</span>
          <span class="mm-cat-label">${escapeHtml(shortUnit(unit))}</span>
          <span class="mm-count">${leaves.length}</span>
        </button>
        <div class="mm-children mm-points">${leaves.join("")}</div>
      </div>`;
  }

  function mmLeaf(uid, pattern, unitId, desc) {
    const hay = [(pattern || ""), (desc || "")].join(" ").toLowerCase();
    return `
      <div class="mm-node mm-leaf" data-search="${escapeAttr(hay)}">
        <button class="mm-label mm-point gs-map-open" type="button"
          data-unit="${escapeAttr(unitId)}" data-target="${escapeAttr(uid)}"
          title="ไปที่บทเรียน">${escapeHtml(shortPat(pattern))}</button>
      </div>`;
  }

  /* ---------- การ์ดหัวข้อเดียว ---------- */
  function pointHtml(p, unit, i, catOf, pathsOf, patOf, formOf, opt) {
    const uid = unit.id + "#" + i;
    const examples = (p.examples || [])
      .map(
        (ex) => `
        <div class="example">
          <div class="jp">${escapeHtml(ex.jp)}</div>
          ${ex.ro ? `<div class="ro">${escapeHtml(ex.ro)}</div>` : ""}
          ${ex.th ? `<div class="th">— ${escapeHtml(ex.th)}</div>` : ""}
        </div>`
      )
      .join("");
    const hay = [(p.pattern || ""), (p.desc || "")].join(" ").toLowerCase();
    const unitTag = opt && opt.showUnit
      ? `<span class="gs-unit-tag">${escapeHtml(shortUnit(unit))}</span>` : "";

    return `
      <details class="pt-guide gs-point" data-uid="${escapeAttr(uid)}" data-search="${escapeAttr(hay)}">
        <summary>
          <span class="gs-point-pat">${escapeHtml(p.pattern)}</span>
          ${unitTag}
        </summary>
        <div class="gs-point-body">
          <div class="desc">${formatDesc(p.desc)}</div>
          ${examples}
          ${connectionsHtml(uid, unit, catOf, pathsOf, patOf, formOf)}
        </div>
      </details>`;
  }

  /* ---------- แถบความเชื่อมโยงใต้หัวข้อ ---------- */
  function connectionsHtml(uid, unit, catOf, pathsOf, patOf, formOf) {
    const cat = catOf[uid];
    const inPaths = pathsOf[uid] || [];
    const forms = (formOf && formOf[uid]) || [];

    const catChip = cat
      ? `<button class="gs-conn-cat gs-cat-jump" type="button" data-cat="${escapeAttr(cat.id)}" title="ดูหัวข้ออื่นในหมวดนี้">
           <span class="gs-conn-ico">${escapeHtml(cat.icon || "🏷")}</span> ${escapeHtml(cat.label)}
         </button>`
      : "";

    const formChips = forms.map((fid) => {
      const f = FORM_LABEL[fid];
      if (!f) return "";
      return `<button class="gs-conn-form gs-form-jump" type="button" data-form="${escapeAttr(fid)}" title="ดูหัวข้ออื่นที่ใช้รูปนี้">
                <span class="gs-conn-ico">${escapeHtml(f.icon)}</span> ${escapeHtml(f.label)}
              </button>`;
    }).join("");

    const pathRows = inPaths.map((pi) => {
      const prev = pi.prev
        ? `<button class="gs-conn-step gs-jump" type="button" data-target="${escapeAttr(pi.prev)}" title="ก่อนหน้า">← ${escapeHtml(shortPat(patOf[pi.prev] || ""))}</button>`
        : `<span class="gs-conn-edge">◆ จุดเริ่ม</span>`;
      const next = pi.next
        ? `<button class="gs-conn-step gs-jump" type="button" data-target="${escapeAttr(pi.next)}" title="ถัดไป">${escapeHtml(shortPat(patOf[pi.next] || ""))} →</button>`
        : `<span class="gs-conn-edge">ปลายทาง ◆</span>`;
      return `
        <div class="gs-conn-path">
          <span class="gs-conn-path-label">🔗 ${escapeHtml(pi.label)} <span class="gs-conn-pos">(${pi.idx + 1}/${pi.total})</span></span>
          <span class="gs-conn-nav">${prev}${next}</span>
        </div>`;
    }).join("");

    return `
      <div class="gs-conn">
        <div class="gs-conn-row">
          ${catChip}
          ${formChips}
          <button class="btn ghost btn-sm gs-open-unit gs-conn-open" type="button" data-unit="${escapeAttr(unit.id)}">เปิดบทเรียน →</button>
        </div>
        ${pathRows}
      </div>`;
  }

  /* ---------- helpers ---------- */
  function shortPat(s) {
    s = String(s || "").trim();
    // ตัดเอาส่วนแรกก่อนตัวคั่นอธิบาย ให้ chip สั้นพออ่านง่าย
    s = s.split(/\s[—\(（]/)[0].trim();
    if (s.length > 22) s = s.slice(0, 21) + "…";
    return s;
  }
  function shortUnit(unit) {
    const t = String(unit.title || "");
    const head = t.split("—")[0].trim();
    return head || unit.id;
  }
  function shortLevel(id) {
    return String(id || "").toUpperCase();
  }
  function formatDesc(s) {
    return escapeHtml(s || "").replace(/\n/g, "<br>");
  }
  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[c]));
  }
  function escapeAttr(s) { return escapeHtml(s); }
  function cssEscape(s) { return String(s).replace(/["\\]/g, "\\$&"); }

  return { render };
})();
