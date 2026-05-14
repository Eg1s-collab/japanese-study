/**
 * Units view: list of grammar units → drill-down into one unit
 * showing patterns + bilingual examples.
 */
window.UnitsView = (function () {
  function renderList(level, onPick) {
    const lv = window.LEVELS[level];
    if (!lv) return "<div class='empty'>ไม่พบระดับ</div>";

    const LP = window.LessonProgress;
    const cards = lv.units
      .map((u) => {
        const dismissed = LP && LP.isDismissed(level, u.id);
        const rec = LP && LP.getRecord(level, u.id);
        const scoreBit = dismissed && rec && typeof rec.lastScore === "number"
          ? ` · คะแนน ${rec.lastScore}/${rec.lastTotal}` : "";
        return `
        <article class="card unit-card ${dismissed ? "dim" : ""}" data-id="${u.id}">
          ${dismissed ? `<span class="done-badge" title="เรียบร้อยแล้ว">✓</span>` : ""}
          <span class="badge">${lv.label}</span>
          <h3>${escapeHtml(u.title)}</h3>
          <p class="subtle">${escapeHtml(u.summary || "")}</p>
          <div class="subtle" style="margin-top:8px;">
            ${u.points.length} หัวข้อ · ${u.quiz.length} ข้อแบบฝึก${scoreBit}
          </div>
        </article>`;
      })
      .join("");

    const root = document.createElement("div");
    root.innerHTML = `
      <h2>บทเรียนไวยากรณ์ ${lv.label}</h2>
      <p class="subtle">เลือก unit เพื่อดูเนื้อหาและตัวอย่าง</p>
      <div class="unit-list">${cards || `<div class='empty'>ยังไม่มีบทเรียน</div>`}</div>
    `;
    root.querySelectorAll(".unit-card").forEach((el) => {
      el.addEventListener("click", () => onPick(el.dataset.id));
    });
    return root;
  }

  function renderUnit(level, unitId, onBack, onStartQuiz) {
    const lv = window.LEVELS[level];
    const unit = lv.units.find((u) => u.id === unitId);
    if (!unit) return document.createTextNode("ไม่พบ unit");

    const points = unit.points
      .map(
        (p) => `
      <div class="point">
        <div class="pat">${escapeHtml(p.pattern)}</div>
        <div class="desc">${escapeHtml(p.desc)}</div>
        ${(p.examples || [])
          .map(
            (ex) => `
          <div class="example">
            <div class="jp">${escapeHtml(ex.jp)}</div>
            <div class="ro">${escapeHtml(ex.ro || "")}</div>
            <div class="th">— ${escapeHtml(ex.th || "")}</div>
          </div>`
          )
          .join("")}
      </div>`
      )
      .join("");

    const LP = window.LessonProgress;
    const dismissed = LP && LP.isDismissed(level, unit.id);

    const root = document.createElement("div");
    root.innerHTML = `
      <div class="btn-row">
        <button class="btn ghost" id="backBtn">← กลับไปรายการ</button>
        <button class="btn primary" id="quizBtn">เริ่มทำแบบฝึกหัดของ unit นี้</button>
        ${dismissed ? `<button class="btn ghost" id="unhideBtn">↺ ยกเลิกการซ่อน</button>` : ""}
      </div>
      <div class="card">
        <h2>${escapeHtml(unit.title)}</h2>
        <p class="subtle">${escapeHtml(unit.summary || "")}</p>
        ${points}
      </div>
    `;
    root.querySelector("#backBtn").addEventListener("click", onBack);
    root.querySelector("#quizBtn").addEventListener("click", () => onStartQuiz(unit.id));
    const unhideBtn = root.querySelector("#unhideBtn");
    if (unhideBtn) {
      unhideBtn.addEventListener("click", () => {
        LP.setDismissed(level, unit.id, false);
        onBack();
      });
    }
    return root;
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    }[c]));
  }

  return { renderList, renderUnit };
})();
