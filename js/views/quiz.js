/**
 * Quiz view — runs a unit's exercises (mcq + fill).
 * Supports per-question bookmarking via window.Storage.
 */
window.QuizView = (function () {
  function render(level, unitId, onDone) {
    const lv = window.LEVELS[level];
    const root = document.createElement("div");

    if (!unitId) {
      // selector
      const opts = lv.units.map((u) => `<option value="${u.id}">${escapeHtml(u.title)}</option>`).join("");
      root.innerHTML = `
        <h2>แบบฝึกหัด ${lv.label}</h2>
        <p class="subtle">เลือก unit ที่ต้องการฝึก</p>
        <div class="card">
          <div class="controls">
            <select id="unitSel">${opts}</select>
            <button class="btn primary" id="goBtn">เริ่ม</button>
          </div>
        </div>
      `;
      root.querySelector("#goBtn").addEventListener("click", () => {
        onDone(root.querySelector("#unitSel").value);
      });
      return root;
    }

    const unit = lv.units.find((u) => u.id === unitId);
    if (!unit) return document.createTextNode("ไม่พบ unit");

    const state = { i: 0, correct: 0, answered: [] };

    function draw() {
      const q = unit.quiz[state.i];
      const total = unit.quiz.length;
      const isLast = state.i === total - 1;

      if (state.i >= total) {
        const LP = window.LessonProgress;
        const pct = total > 0 ? (state.correct / total) * 100 : 0;
        const eligible = pct >= 80;
        const dismissed = LP && LP.isDismissed(level, unit.id);
        let masteryBtn = "";
        if (eligible && !dismissed) {
          masteryBtn = `<button class="btn primary" id="dismissBtn">✓ เรียบร้อย — ซ่อนบทนี้</button>`;
        } else if (dismissed) {
          masteryBtn = `<button class="btn ghost" id="undismissBtn">↺ ยกเลิกการซ่อน</button>`;
        }
        root.innerHTML = `
          <div class="score-card">
            <div>
              <h2 style="margin:0;">จบแบบฝึกหัด!</h2>
              <p class="subtle">${escapeHtml(unit.title)}</p>
              ${eligible ? `<p class="subtle" style="margin-top:4px;color:var(--ok);">เก่งมาก! คะแนน ${Math.round(pct)}%</p>` : ""}
            </div>
            <div class="score-num">${state.correct} / ${total}</div>
          </div>
          <div class="btn-row">
            <button class="btn" id="againBtn">ทำใหม่</button>
            <button class="btn ghost" id="pickBtn">เลือก unit อื่น</button>
            ${masteryBtn}
          </div>
        `;
        root.querySelector("#againBtn").addEventListener("click", () => {
          state.i = 0; state.correct = 0; state.answered = []; draw();
        });
        root.querySelector("#pickBtn").addEventListener("click", () => onDone(null));
        const dBtn = root.querySelector("#dismissBtn");
        if (dBtn) {
          dBtn.addEventListener("click", () => {
            LP.setDismissed(level, unit.id, true, state.correct, total);
            draw();
          });
        }
        const uBtn = root.querySelector("#undismissBtn");
        if (uBtn) {
          uBtn.addEventListener("click", () => {
            LP.setDismissed(level, unit.id, false, state.correct, total);
            draw();
          });
        }
        return;
      }

      const bookmarked = window.Storage.isBookmarked(level, unit.id, state.i);

      let body = "";
      if (q.type === "mcq") {
        body = q.choices
          .map(
            (c, idx) => `<button class="choice" data-i="${idx}">${escapeHtml(c)}</button>`
          )
          .join("");
      } else {
        body = `
          <input type="text" class="txt-input" id="ansInput" placeholder="พิมพ์คำตอบ..." autocomplete="off" />
          <div class="btn-row">
            <button class="btn primary" id="submitBtn">ตรวจคำตอบ</button>
          </div>
        `;
      }

      const pct = Math.round(((state.i) / total) * 100);

      root.innerHTML = `
        <div class="progress" title="ความก้าวหน้า"><div class="bar" style="width:${pct}%"></div></div>
        <div class="qmeta">
          <span class="qprog">ข้อ ${state.i + 1} / ${total} · ${escapeHtml(unit.title)} · คะแนน ${state.correct}/${state.i}</span>
          <button class="star ${bookmarked ? "on" : ""}" id="starBtn" title="บันทึกข้อนี้ไว้ทวน">★</button>
        </div>
        <div class="card">
          <h3>${escapeHtml(q.q)}</h3>
          <div id="qBody">${body}</div>
          <div id="fb"></div>
          <div class="btn-row">
            <button class="btn" id="nextBtn" disabled>${isLast ? "ดูคะแนน" : "ข้อถัดไป →"}</button>
          </div>
        </div>
      `;

      root.querySelector("#starBtn").addEventListener("click", (e) => {
        const on = window.Storage.toggle(level, unit.id, state.i, {
          unitTitle: unit.title,
          q
        });
        e.currentTarget.classList.toggle("on", on);
      });

      const nextBtn = root.querySelector("#nextBtn");
      nextBtn.addEventListener("click", () => {
        state.i += 1;
        draw();
      });

      if (q.type === "mcq") {
        root.querySelectorAll(".choice").forEach((btn) => {
          btn.addEventListener("click", () => handleMcq(btn, q, nextBtn));
        });
      } else {
        const input = root.querySelector("#ansInput");
        input.focus();
        const submit = () => handleFill(input, q, nextBtn);
        root.querySelector("#submitBtn").addEventListener("click", submit);
        input.addEventListener("keydown", (e) => {
          if (e.key === "Enter") submit();
        });
      }
    }

    function handleMcq(btn, q, nextBtn) {
      const choices = root.querySelectorAll(".choice");
      const picked = Number(btn.dataset.i);
      const correct = q.answer === picked;
      choices.forEach((c, idx) => {
        c.classList.add("disabled");
        if (idx === q.answer) c.classList.add("correct");
        else if (idx === picked) c.classList.add("wrong");
      });
      showFeedback(correct, q.explain);
      if (correct) state.correct += 1;
      nextBtn.disabled = false;
    }

    function handleFill(input, q, nextBtn) {
      const accepted = (Array.isArray(q.answer) ? q.answer : [q.answer]).map((s) => normalize(s));
      const got = normalize(input.value);
      const correct = accepted.includes(got);
      input.disabled = true;
      input.style.borderColor = correct ? "var(--ok)" : "var(--bad)";
      const expected = (Array.isArray(q.answer) ? q.answer.join(" / ") : q.answer);
      showFeedback(correct, q.explain + (correct ? "" : `\nคำตอบที่ยอมรับ: ${expected}`));
      if (correct) state.correct += 1;
      nextBtn.disabled = false;
    }

    function showFeedback(ok, explain) {
      const fb = root.querySelector("#fb");
      fb.innerHTML = `
        <div class="feedback ${ok ? "ok" : "bad"}">
          <strong>${ok ? "ถูกต้อง ✓" : "ยังไม่ถูก ✗"}</strong>
          <div style="white-space:pre-line;margin-top:4px;">${escapeHtml(explain || "")}</div>
        </div>`;
    }

    draw();
    return root;
  }

  function normalize(s) {
    return String(s || "").trim().replace(/\s+/g, "");
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

  return { render };
})();
