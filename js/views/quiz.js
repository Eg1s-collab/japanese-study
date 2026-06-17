/**
 * Quiz view — รันแบบฝึกหัดของ unit + โหมดแบบฝึกหัดประจำวัน (Daily).
 * รองรับการบันทึกข้อรายข้อผ่าน window.Storage และบันทึกข้อที่ตอบผิด
 * ผ่าน window.DailyStorage (ใช้จัดลำดับให้ข้อที่ผิดเด้งมาในวันถัดไป).
 *
 * sentinel:  unitId === "__daily__" → render โหมดประจำวัน
 */
window.QuizView = (function () {
  const DAILY = "__daily__";

  function render(level, target, onPick) {
    const lv = window.LEVELS[level];
    if (!lv) return document.createTextNode("ไม่พบระดับ");

    if (!target) return renderSelector(level, onPick);
    if (target === DAILY) return renderDaily(level, onPick);
    return renderUnitQuiz(level, target, onPick);
  }

  /* ---------- หน้าเลือก unit + การ์ดประจำวัน ---------- */
  function renderSelector(level, onPick) {
    const lv = window.LEVELS[level];
    const root = document.createElement("div");

    const DS = window.DailyStorage;
    const today = DS ? DS.thailandDate() : "";
    const maxCount = DS ? DS.getMaxCount() : 10;
    const session = DS ? DS.peekSession(level) : null;
    const answered = session ? DS.answeredCount(session) : 0;
    const totalToday = session ? session.questions.length : 0;
    const correct = session ? DS.correctCount(session) : 0;
    const completed = !!(session && session.completed);
    const wrongCount = DS ? DS.getWrongCount(level) : 0;

    const dailyStatus = session
      ? `ทำแล้ว <b>${answered}/${totalToday}</b> ข้อ · คะแนน <b>${correct}/${answered || 0}</b>${completed ? " · เสร็จแล้ว ✓" : ""}`
      : `ยังไม่ได้เริ่ม · เลือกสูงสุด ${maxCount} ข้อ`;

    const startLabel = !session
      ? "เริ่มแบบฝึกหัดประจำวัน"
      : (completed ? "ทบทวนคำตอบ" : (answered > 0 ? "ทำต่อ" : "เริ่ม"));

    const opts = lv.units
      .map((u) => `<option value="${u.id}">${escapeHtml(u.title)}</option>`)
      .join("");

    root.innerHTML = `
      <h2>แบบฝึกหัด ${escapeHtml(lv.label)}</h2>

      <div class="card daily-card">
        <div class="daily-head">
          <div>
            <h3 class="daily-title">📅 แบบฝึกหัดประจำวัน</h3>
            <p class="subtle daily-meta">
              ${escapeHtml(today)} · จัดลำดับ <b>ข้อที่เคยตอบผิด</b> → <b>บทที่ซ่อนไว้</b> → ข้ออื่น ๆ · รีเซ็ต 00:00 (เวลาไทย)
            </p>
          </div>
          ${wrongCount > 0 ? `<span class="daily-pill bad" title="ข้อที่ค้างคา">${wrongCount} ข้อค้าง</span>` : ""}
        </div>

        <div class="daily-status">${dailyStatus}</div>

        <div class="controls daily-controls">
          <label class="inline-field">
            <span>จำนวนข้อสูงสุด</span>
            <input type="number" id="dailyMax" min="1" max="100" value="${maxCount}" />
          </label>
          <button class="btn primary" id="startDaily">${escapeHtml(startLabel)}</button>
          ${session ? `<button class="btn ghost" id="resetDaily" title="สร้างชุดข้อใหม่สำหรับวันนี้">↺ เริ่มใหม่</button>` : ""}
        </div>
      </div>

      <p class="subtle" style="margin-top:18px;">หรือเลือก unit ที่ต้องการฝึก</p>
      <div class="card">
        <div class="controls">
          <select id="unitSel">${opts}</select>
          <button class="btn primary" id="goBtn">เริ่ม</button>
        </div>
      </div>
    `;

    root.querySelector("#goBtn").addEventListener("click", () => {
      onPick(root.querySelector("#unitSel").value);
    });

    const maxInput = root.querySelector("#dailyMax");
    if (maxInput && DS) {
      const applyMax = () => {
        const v = DS.setMaxCount(maxInput.value);
        maxInput.value = v;
      };
      maxInput.addEventListener("change", applyMax);
      maxInput.addEventListener("blur", applyMax);
    }

    const startBtn = root.querySelector("#startDaily");
    if (startBtn) {
      startBtn.addEventListener("click", () => {
        if (DS && maxInput) DS.setMaxCount(maxInput.value);
        onPick(DAILY);
      });
    }

    const resetBtn = root.querySelector("#resetDaily");
    if (resetBtn) {
      resetBtn.addEventListener("click", () => {
        if (!confirm("เริ่มชุดข้อใหม่สำหรับวันนี้? คะแนนเดิมของวันนี้จะหายไป")) return;
        if (DS) {
          DS.setMaxCount((root.querySelector("#dailyMax") || {}).value);
          DS.resetSession(level);
        }
        const fresh = renderSelector(level, onPick);
        root.replaceWith(fresh);
      });
    }

    return root;
  }

  /* ---------- โหมดประจำวัน ---------- */
  function renderDaily(level, onPick) {
    const root = document.createElement("div");
    const DS = window.DailyStorage;
    const lv = window.LEVELS[level];

    if (!DS) {
      root.textContent = "ไม่พบ DailyStorage";
      return root;
    }

    const session = DS.getOrGenerateSession(level);

    if (!session.questions.length) {
      root.innerHTML = `
        <div class="btn-row">
          <button class="btn ghost" id="backBtn">← กลับ</button>
        </div>
        <div class="card">
          <h2>ไม่มีข้อในชุดประจำวัน</h2>
          <p class="subtle">ระดับ ${escapeHtml(lv.label)} ยังไม่มีบทเรียนหรือแบบฝึกหัด</p>
        </div>
      `;
      root.querySelector("#backBtn").addEventListener("click", () => onPick(null));
      return root;
    }

    function getRef(i) { return session.questions[i]; }
    function getMeta(i) {
      const ref = getRef(i);
      const unit = lv.units.find((u) => u.id === ref.unitId);
      if (!unit) return null;
      return { q: unit.quiz[ref.qIndex], unitTitle: unit.title, unitId: ref.unitId, qIndex: ref.qIndex, priority: ref.priority };
    }

    runner({
      root,
      level,
      title: `📅 แบบฝึกหัดประจำวัน ${lv.label} · ${session.date}`,
      total: session.questions.length,
      initialI: session.completed ? 0 : session.i,
      getMeta,
      isAnswered: (i) => !!session.answers[i],
      getStoredAnswer: (i) => session.answers[i],
      recordAnswer: (i, payload) => {
        DS.updateSession(level, (s) => {
          s.answers[i] = payload;
          s.i = Math.min(s.questions.length, Math.max(s.i, i + 1));
          if (s.answers.every((a) => a && typeof a === "object")) s.completed = true;
        });
        // อัปเดต wrong-list สำหรับวันถัดไปด้วย
        const ref = getRef(i);
        if (payload.correct) DS.clearWrong(level, ref.unitId, ref.qIndex);
        else DS.markWrong(level, ref.unitId, ref.qIndex);
      },
      onFinish: (state) => {
        DS.updateSession(level, (s) => { s.completed = true; });
        renderDailyDone(root, level, onPick, state);
      },
      onPickAnother: () => onPick(null),
      mode: "daily"
    });

    return root;
  }

  function renderDailyDone(root, level, onPick, state) {
    const DS = window.DailyStorage;
    const session = DS.peekSession(level) || { questions: [], answers: [] };
    const total = session.questions.length;
    const correct = DS.correctCount(session);
    const pct = total > 0 ? Math.round((correct / total) * 100) : 0;
    root.innerHTML = `
      <div class="score-card">
        <div>
          <h2 style="margin:0;">จบแบบฝึกหัดประจำวัน!</h2>
          <p class="subtle">${escapeHtml(window.LEVELS[level].label)} · ${escapeHtml(session.date || "")}</p>
          <p class="subtle" style="margin-top:4px;">${pct >= 80 ? "เก่งมาก ✨" : "ลองทำใหม่อีกครั้งวันพรุ่งนี้นะ"}</p>
        </div>
        <div class="score-num">${correct} / ${total}</div>
      </div>
      <div class="btn-row">
        <button class="btn" id="reviewBtn">ทบทวนคำตอบ</button>
        <button class="btn ghost" id="resetBtn">เริ่มชุดใหม่</button>
        <button class="btn ghost" id="backBtn">← กลับเมนู</button>
      </div>
    `;
    root.querySelector("#backBtn").addEventListener("click", () => onPick(null));
    root.querySelector("#reviewBtn").addEventListener("click", () => {
      // re-enter daily — runner จะอ่าน session.answers ที่บันทึกไว้และ skip ไปข้อแรก
      const fresh = renderDaily(level, onPick);
      root.replaceWith(fresh);
    });
    root.querySelector("#resetBtn").addEventListener("click", () => {
      if (!confirm("เริ่มชุดข้อใหม่สำหรับวันนี้? คะแนนเดิมของวันนี้จะหายไป")) return;
      DS.resetSession(level);
      const fresh = renderDaily(level, onPick);
      root.replaceWith(fresh);
    });
  }

  /* ---------- โหมด unit quiz ---------- */
  function renderUnitQuiz(level, unitId, onPick) {
    const lv = window.LEVELS[level];
    const unit = lv.units.find((u) => u.id === unitId);
    if (!unit) return document.createTextNode("ไม่พบ unit");

    const root = document.createElement("div");

    runner({
      root,
      level,
      title: unit.title,
      total: unit.quiz.length,
      initialI: 0,
      getMeta: (i) => ({ q: unit.quiz[i], unitTitle: unit.title, unitId: unit.id, qIndex: i }),
      isAnswered: () => false,
      getStoredAnswer: () => null,
      recordAnswer: (i, payload) => {
        const DS = window.DailyStorage;
        if (DS) {
          if (payload.correct) DS.clearWrong(level, unit.id, i);
          else DS.markWrong(level, unit.id, i);
        }
      },
      onFinish: (state) => renderUnitDone(root, level, unit, onPick, state),
      onPickAnother: () => onPick(null),
      mode: "unit",
      unit
    });

    return root;
  }

  function renderUnitDone(root, level, unit, onPick, state) {
    const LP = window.LessonProgress;
    const total = unit.quiz.length;
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
      const fresh = renderUnitQuiz(level, unit.id, onPick);
      root.replaceWith(fresh);
    });
    root.querySelector("#pickBtn").addEventListener("click", () => onPick(null));
    const dBtn = root.querySelector("#dismissBtn");
    if (dBtn) dBtn.addEventListener("click", () => {
      LP.setDismissed(level, unit.id, true, state.correct, total);
      renderUnitDone(root, level, unit, onPick, state);
    });
    const uBtn = root.querySelector("#undismissBtn");
    if (uBtn) uBtn.addEventListener("click", () => {
      LP.setDismissed(level, unit.id, false, state.correct, total);
      renderUnitDone(root, level, unit, onPick, state);
    });
  }

  /* ---------- runner: ใช้ร่วมระหว่าง unit quiz กับ daily ---------- */
  function runner(cfg) {
    const {
      root, level, title, total, initialI,
      getMeta, isAnswered, getStoredAnswer, recordAnswer,
      onFinish, onPickAnother, mode
    } = cfg;

    const state = { i: Math.min(initialI || 0, total), correct: 0 };
    // นับคะแนนจาก answers ที่ตอบไว้แล้ว (สำหรับโหมด daily ตอน resume)
    for (let k = 0; k < total; k++) {
      if (isAnswered(k)) {
        const stored = getStoredAnswer(k);
        if (stored && stored.correct) state.correct += 1;
      }
    }

    draw();

    function draw() {
      if (state.i >= total) {
        onFinish(state);
        return;
      }

      const meta = getMeta(state.i);
      if (!meta || !meta.q) {
        // ข้อมูล quiz หาย — ข้ามไปข้อถัดไป
        state.i += 1;
        draw();
        return;
      }
      const q = meta.q;
      const isLast = state.i === total - 1;
      const bookmarked = window.Storage && window.Storage.isBookmarked(level, meta.unitId, meta.qIndex);
      const stored = getStoredAnswer(state.i);
      const lockedView = !!stored;

      let body = "";
      if (q.type === "mcq") {
        const shuffled = q.choices.map((c, idx) => ({ c, idx }));
        for (let i = shuffled.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        body = shuffled
          .map((s, pos) => `<button class="choice" data-orig="${s.idx}" data-pos="${pos}">${escapeHtml(s.c)}</button>`)
          .join("");
      } else {
        const filledVal = stored && typeof stored.value === "string" ? stored.value : "";
        body = `
          <input type="text" class="txt-input" id="ansInput"
            value="${escapeAttr(filledVal)}"
            placeholder="พิมพ์คำตอบ หรือกดแป้นพิมพ์ด้านล่าง"
            autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" />
          <div id="kbSlot"></div>
          <div class="btn-row">
            <button class="btn primary" id="submitBtn">ตรวจคำตอบ</button>
            ${stored ? "" : `<button class="btn ghost" id="choicesBtn">โชว์ตัวเลือกคำตอบ</button>`}
          </div>
          <div id="choiceHints" class="choice-hints" hidden></div>
        `;
      }

      const pct = Math.round((state.i / total) * 100);
      const subTitle = mode === "daily" && meta.unitTitle
        ? ` · <span class="qsub">${escapeHtml(meta.unitTitle)}</span>`
        : "";
      const priorityTag = mode === "daily" && typeof meta.priority === "number"
        ? priorityBadge(meta.priority)
        : "";

      root.innerHTML = `
        <div class="qhead">
          <h2 class="qtitle">${escapeHtml(title)}</h2>
          ${mode === "daily" ? `<button class="btn ghost btn-sm" id="exitDaily">← กลับเมนู</button>` : ""}
        </div>
        <div class="progress" title="ความก้าวหน้า"><div class="bar" style="width:${pct}%"></div></div>
        <div class="qmeta">
          <span class="qprog">ข้อ ${state.i + 1} / ${total}${subTitle} · คะแนน ${state.correct}/${state.i}</span>
          <div class="qmeta-right">
            ${priorityTag}
            <button class="star ${bookmarked ? "on" : ""}" id="starBtn" title="บันทึกข้อนี้ไว้ทวน">★</button>
          </div>
        </div>
        <div class="card">
          <h3>${escapeHtml(q.q)}</h3>
          <div id="qBody">${body}</div>
          <div id="fb"></div>
          <div class="btn-row">
            <button class="btn" id="nextBtn" ${lockedView ? "" : "disabled"}>${isLast ? "ดูคะแนน" : "ข้อถัดไป →"}</button>
          </div>
        </div>
      `;

      const exitBtn = root.querySelector("#exitDaily");
      if (exitBtn) exitBtn.addEventListener("click", () => onPickAnother());

      const starBtn = root.querySelector("#starBtn");
      starBtn.addEventListener("click", (e) => {
        if (!window.Storage) return;
        const on = window.Storage.toggle(level, meta.unitId, meta.qIndex, {
          unitTitle: meta.unitTitle,
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
        const choices = root.querySelectorAll(".choice");
        if (stored) {
          // โหมดทบทวน: แสดงผลที่บันทึกไว้
          choices.forEach((c) => {
            const orig = Number(c.dataset.orig);
            c.classList.add("disabled");
            if (orig === q.answer) c.classList.add("correct");
            else if (orig === stored.picked) c.classList.add("wrong");
          });
          showFeedback(root, stored.correct, q.explain);
        } else {
          choices.forEach((btn) => {
            btn.addEventListener("click", () => handleMcq(btn, q, nextBtn, meta));
          });
        }
      } else {
        const input = root.querySelector("#ansInput");
        const submitBtn = root.querySelector("#submitBtn");
        if (stored) {
          input.disabled = true;
          input.style.borderColor = stored.correct ? "var(--ok)" : "var(--bad)";
          if (submitBtn) submitBtn.disabled = true;
          const expected = (Array.isArray(q.answer) ? q.answer.join(" / ") : q.answer);
          showFeedback(root, stored.correct, (q.explain || "") + (stored.correct ? "" : `\nคำตอบที่ยอมรับ: ${expected}`));
        } else {
          input.focus();
          if (window.KanaKeypad) {
            const slot = root.querySelector("#kbSlot");
            if (slot) slot.appendChild(window.KanaKeypad.create(input));
          }
          const submit = () => handleFill(input, q, nextBtn, meta);
          submitBtn.addEventListener("click", submit);
          input.addEventListener("keydown", (e) => {
            if (e.key === "Enter") submit();
          });
          const choicesBtn = root.querySelector("#choicesBtn");
          const choiceHints = root.querySelector("#choiceHints");
          if (choicesBtn && choiceHints) {
            choicesBtn.addEventListener("click", () => {
              if (!choiceHints.dataset.built) {
                const opts = buildFillChoices(level, q);
                choiceHints.innerHTML = opts
                  .map((o) => `<button type="button" class="choice-chip">${escapeHtml(o)}</button>`)
                  .join("");
                choiceHints.querySelectorAll(".choice-chip").forEach((chip) => {
                  chip.addEventListener("click", () => {
                    input.value = chip.textContent;
                    input.focus();
                  });
                });
                choiceHints.dataset.built = "1";
              }
              choiceHints.hidden = !choiceHints.hidden;
              choicesBtn.textContent = choiceHints.hidden ? "โชว์ตัวเลือกคำตอบ" : "ซ่อนตัวเลือก";
            });
          }
        }
      }
    }

    function handleMcq(btn, q, nextBtn, meta) {
      const choices = root.querySelectorAll(".choice");
      const picked = Number(btn.dataset.orig);
      const correct = q.answer === picked;
      choices.forEach((c) => {
        c.classList.add("disabled");
        const orig = Number(c.dataset.orig);
        if (orig === q.answer) c.classList.add("correct");
        else if (orig === picked) c.classList.add("wrong");
      });
      showFeedback(root, correct, q.explain);
      if (correct) state.correct += 1;
      nextBtn.disabled = false;
      recordAnswer(state.i, { correct, picked, type: "mcq" });
    }

    function handleFill(input, q, nextBtn, meta) {
      const accepted = (Array.isArray(q.answer) ? q.answer : [q.answer]).map((s) => normalize(s));
      const got = normalize(input.value);
      const correct = accepted.includes(got);
      input.disabled = true;
      input.style.borderColor = correct ? "var(--ok)" : "var(--bad)";
      const expected = (Array.isArray(q.answer) ? q.answer.join(" / ") : q.answer);
      showFeedback(root, correct, (q.explain || "") + (correct ? "" : `\nคำตอบที่ยอมรับ: ${expected}`));
      if (correct) state.correct += 1;
      nextBtn.disabled = false;
      recordAnswer(state.i, { correct, value: input.value, type: "fill" });
    }
  }

  function priorityBadge(priority) {
    if (priority === 0) return `<span class="daily-pill bad" title="ข้อที่เคยตอบผิด">ตอบผิด</span>`;
    if (priority === 1) return `<span class="daily-pill warn" title="ข้อจากบทที่ซ่อน">บทที่ซ่อน</span>`;
    return "";
  }

  function showFeedback(root, ok, explain) {
    const fb = root.querySelector("#fb");
    if (!fb) return;
    fb.innerHTML = `
      <div class="feedback ${ok ? "ok" : "bad"}">
        <strong>${ok ? "ถูกต้อง ✓" : "ยังไม่ถูก ✗"}</strong>
        <div style="white-space:pre-line;margin-top:4px;">${escapeHtml(explain || "")}</div>
      </div>`;
  }

  function normalize(s) {
    return String(s || "").trim().replace(/\s+/g, "");
  }

  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  // สร้างตัวเลือกแบบหลายตัวเลือกสำหรับข้อพิมพ์: คำตอบที่ถูก + ตัวลวง
  // ใช้ q.choices ถ้ามี ไม่งั้นดึงคำตอบของข้อพิมพ์อื่นในระดับเดียวกันมาเป็นตัวลวง
  function buildFillChoices(level, q) {
    if (Array.isArray(q.choices) && q.choices.length) return shuffle(q.choices.slice());
    const answers = Array.isArray(q.answer) ? q.answer : [q.answer];
    const correct = answers[0];
    const acceptedSet = new Set(answers.map(normalize));
    const lv = window.LEVELS[level];
    const pool = [];
    const seen = new Set();
    (lv ? lv.units : []).forEach((u) => {
      (u.quiz || []).forEach((qq) => {
        if (qq === q || qq.type !== "fill") return;
        const cand = Array.isArray(qq.answer) ? qq.answer[0] : qq.answer;
        const n = normalize(cand);
        if (!cand || acceptedSet.has(n) || seen.has(n)) return;
        seen.add(n);
        pool.push(cand);
      });
    });
    return shuffle([correct, ...shuffle(pool).slice(0, 3)]);
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
  function escapeAttr(s) { return escapeHtml(s); }

  return { render };
})();
