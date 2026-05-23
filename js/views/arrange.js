/**
 * Sentence arrangement view (並び替え) — tap or drag word cards from the
 * bank into the answer row to assemble a Japanese sentence in the correct
 * order. Trains particles + grammar together.
 *
 * Interaction model:
 *   - Tap a card in the bank → moves to the answer row (appends)
 *   - Tap a card in the answer row → returns to the bank
 *   - Long-press / drag a card in either zone → reorder within that zone
 *     (HTML5 native drag-and-drop on desktop, pointer-based reorder on touch)
 *
 * UI flow:
 *   1) renderSelector — pick a level filter + max question count
 *   2) renderRun      — work through the shuffled set one sentence at a time
 *   3) renderDone     — score summary
 *
 * Persistence is intentionally minimal: only the level filter and the
 * "max question count" preference are saved (jp_arrange_pref_v1). The
 * session itself is in-memory — each "เริ่ม" reshuffles.
 */
window.ArrangeView = (function () {
  const PREF_KEY = "jp_arrange_pref_v1";
  const ALL = "__all__";

  /* ---------- prefs ---------- */
  function loadPref() {
    try {
      const raw = localStorage.getItem(PREF_KEY);
      if (!raw) return { level: ALL, max: 10, hideMeaning: false };
      const obj = JSON.parse(raw);
      return {
        level: typeof obj.level === "string" ? obj.level : ALL,
        max: Number.isFinite(obj.max) ? clampMax(obj.max) : 10,
        hideMeaning: !!obj.hideMeaning
      };
    } catch (_) { return { level: ALL, max: 10, hideMeaning: false }; }
  }
  function savePref(p) {
    try { localStorage.setItem(PREF_KEY, JSON.stringify(p)); } catch (_) {}
  }
  function clampMax(n) {
    n = Math.floor(Number(n) || 0);
    if (n < 1) n = 1;
    if (n > 100) n = 100;
    return n;
  }

  /* ---------- utils ---------- */
  function escapeHtml(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[c]));
  }
  function escapeAttr(s) { return escapeHtml(s); }
  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function pool(level) {
    const bank = window.SENTENCE_BANK || [];
    if (level === ALL) return bank.slice();
    return bank.filter((it) => it.level === level);
  }

  function prettyLevel(level) {
    if (level === ALL) return "ทุกระดับ";
    if (level === "n5") return "N5";
    if (level === "n4") return "N4";
    if (level === "n3") return "N3";
    return level;
  }

  /* ---------- entry ---------- */
  function render() {
    return renderSelector();
  }

  /* ---------- selector ---------- */
  function renderSelector() {
    const root = document.createElement("div");
    const pref = loadPref();
    const bank = window.SENTENCE_BANK || [];
    const total = bank.length;

    const counts = { n5: 0, n4: 0, n3: 0 };
    bank.forEach((it) => { counts[it.level] = (counts[it.level] || 0) + 1; });

    const levels = [
      { id: ALL, label: "ทั้งหมด", count: total },
      { id: "n5", label: "N5", count: counts.n5 },
      { id: "n4", label: "N4", count: counts.n4 },
      { id: "n3", label: "N3", count: counts.n3 }
    ];

    const chips = levels.map((lv) => `
      <button class="pt-chip arr-chip ${pref.level === lv.id ? "on" : ""}" data-lv="${escapeAttr(lv.id)}" type="button">
        <span class="pt-chip-jp">${escapeHtml(lv.label)}</span>
        <span class="pt-chip-count">${lv.count} ข้อ</span>
      </button>
    `).join("");

    root.innerHTML = `
      <h2>เรียงประโยค · 並び替え</h2>
      <p class="subtle">ลาก/แตะการ์ดคำมาเรียงให้ถูก — ฝึกไวยากรณ์ + คำช่วยพร้อมกัน (${total} ประโยคในคลัง)</p>

      <div class="card">
        <h3 class="pt-section-title">วิธีเล่น</h3>
        <ul class="arr-howto">
          <li><b>แตะการ์ดในกล่องล่าง</b> → ขึ้นไปต่อในประโยค</li>
          <li><b>แตะการ์ดในแถวคำตอบ</b> → ส่งกลับมาที่กล่อง</li>
          <li><b>ลากการ์ด</b> เพื่อสลับลำดับภายในแถวคำตอบ</li>
          <li>กด <b>ตรวจคำตอบ</b> เมื่อเรียงครบ — ถ้ายังไม่แน่ใจกด <b>เฉลย</b> ดูคำตอบที่ถูกต้องได้</li>
        </ul>
      </div>

      <div class="card">
        <h3 class="pt-section-title">เลือกระดับ</h3>
        <div class="pt-chips">${chips}</div>

        <div class="arr-mode-row">
          <label class="arr-mode-toggle ${pref.hideMeaning ? "on" : ""}">
            <input type="checkbox" id="arrHideMeaning" ${pref.hideMeaning ? "checked" : ""} />
            <span class="arr-mode-jp">🔒 โหมด JLPT</span>
            <span class="arr-mode-sub">ซ่อนความหมายไทย — เรียงประโยคจากการ์ดเท่านั้น (เผยเฉลยหลังตอบ)</span>
          </label>
        </div>

        <div class="controls pt-controls" style="margin-top:14px;">
          <label class="inline-field">
            <span>จำนวนข้อสูงสุด</span>
            <input type="number" id="arrMax" min="1" max="100" value="${pref.max}" />
          </label>
          <button class="btn primary" id="arrStart">เริ่ม</button>
        </div>
      </div>
    `;

    let curLevel = pref.level;
    let curHide = !!pref.hideMeaning;
    const hideCb = root.querySelector("#arrHideMeaning");
    hideCb.addEventListener("change", () => {
      curHide = hideCb.checked;
      hideCb.closest(".arr-mode-toggle").classList.toggle("on", curHide);
    });
    root.querySelectorAll(".arr-chip").forEach((btn) => {
      btn.addEventListener("click", () => {
        curLevel = btn.dataset.lv;
        root.querySelectorAll(".arr-chip").forEach((b) => b.classList.toggle("on", b === btn));
      });
    });

    const maxInput = root.querySelector("#arrMax");
    const applyMax = () => { maxInput.value = clampMax(maxInput.value); };
    maxInput.addEventListener("change", applyMax);
    maxInput.addEventListener("blur", applyMax);

    root.querySelector("#arrStart").addEventListener("click", () => {
      const max = clampMax(maxInput.value);
      savePref({ level: curLevel, max, hideMeaning: curHide });
      const items = shuffle(pool(curLevel)).slice(0, max);
      if (!items.length) { alert("ไม่มีประโยคในระดับนี้"); return; }
      const runNode = renderRun(items, curLevel, curHide, () => {
        const fresh = renderSelector();
        runNode.replaceWith(fresh);
      });
      root.replaceWith(runNode);
    });

    return root;
  }

  /* ---------- runner ---------- */
  function renderRun(items, level, hideMeaning, onExit) {
    const root = document.createElement("div");
    const state = { i: 0, correct: 0 };
    const total = items.length;

    // Per-question runtime state:
    //   bank   — array of { id, text } currently in the bank pool
    //   answer — array of { id, text } currently placed
    //   locked — true once "ตรวจ" or "เฉลย" was pressed (no more moves)
    //   solved — true once correct (for next-button label)
    let q = null;

    drawQuestion();

    function drawQuestion() {
      if (state.i >= total) { renderDone(); return; }
      const item = items[state.i];

      // Build bank items: tokens + distractors (if any), each with a stable id
      const baseCards = item.tokens.map((t, idx) => ({ id: "t" + idx, text: t, kind: "tok" }));
      const distractors = (item.distractors || []).map((t, idx) => ({ id: "d" + idx, text: t, kind: "dist" }));
      q = {
        item,
        bank: shuffle(baseCards.concat(distractors)),
        answer: [],
        locked: false,
        solved: false
      };

      drawShell();
    }

    function drawShell() {
      const item = q.item;
      const isLast = state.i === total - 1;
      const pct = Math.round((state.i / total) * 100);

      root.innerHTML = `
        <div class="qhead">
          <h2 class="qtitle">เรียงประโยค · ${escapeHtml(prettyLevel(level))}</h2>
          <button class="btn ghost btn-sm" id="arrExit">← กลับเมนู</button>
        </div>
        <div class="progress" title="ความก้าวหน้า"><div class="bar" style="width:${pct}%"></div></div>
        <div class="qmeta">
          <span class="qprog">ข้อ ${state.i + 1} / ${total} · คะแนน ${state.correct}/${state.i}</span>
          <span class="qmeta-right">
            <span class="daily-pill" title="ระดับ">${escapeHtml(item.level.toUpperCase())}</span>
            ${item.focus ? `<span class="daily-pill" title="ไวยากรณ์ที่เน้น">${escapeHtml(item.focus)}</span>` : ""}
          </span>
        </div>

        <div class="card">
          ${hideMeaning ? `
          <div class="arr-meaning arr-meaning-hidden" id="arrMeaning">
            <span class="arr-meaning-label is-locked">🔒 โหมด JLPT</span>
            <button type="button" class="arr-peek" id="arrPeek" title="แอบดูความหมาย (ตัวช่วย)">👁 ดูความหมาย</button>
          </div>
          ` : `
          <div class="arr-meaning" id="arrMeaning">
            <span class="arr-meaning-label">ความหมาย</span>
            <span class="arr-meaning-th">${escapeHtml(item.th)}</span>
          </div>
          `}

          <div class="arr-answer" id="arrAnswer" aria-label="แถวเรียงคำตอบ" role="list"></div>
          <div class="arr-bank" id="arrBank" aria-label="คลังคำ" role="list"></div>

          <div class="btn-row">
            <button class="btn primary" id="arrCheck">ตรวจคำตอบ</button>
            <button class="btn ghost" id="arrClear">↺ ล้าง</button>
            <button class="btn ghost" id="arrReveal">เฉลย</button>
          </div>

          <div id="arrFb"></div>

          <div class="btn-row">
            <button class="btn" id="arrNext" disabled>${isLast ? "ดูคะแนน" : "ข้อถัดไป →"}</button>
          </div>
        </div>
      `;

      root.querySelector("#arrExit").addEventListener("click", () => onExit());
      root.querySelector("#arrCheck").addEventListener("click", handleCheck);
      root.querySelector("#arrClear").addEventListener("click", handleClear);
      root.querySelector("#arrReveal").addEventListener("click", handleReveal);
      root.querySelector("#arrNext").addEventListener("click", () => {
        state.i += 1;
        drawQuestion();
      });
      const peekBtn = root.querySelector("#arrPeek");
      if (peekBtn) peekBtn.addEventListener("click", () => revealMeaning(/*peeked=*/true));

      paintCards();
    }

    // Replace the locked meaning row with the real Thai gloss. Called by the
    // "👁 ดูความหมาย" button (counts as a hint — marks q.peeked) and
    // automatically after the user locks an answer (correct/wrong/reveal) so
    // they always see the meaning + explanation together.
    function revealMeaning(peeked) {
      if (!hideMeaning) return;
      if (peeked) q.peeked = true;
      const el = root.querySelector("#arrMeaning");
      if (!el) return;
      el.classList.remove("arr-meaning-hidden");
      el.innerHTML = `
        <span class="arr-meaning-label">ความหมาย${q.peeked ? " · 👁 แอบดู" : ""}</span>
        <span class="arr-meaning-th">${escapeHtml(q.item.th)}</span>
      `;
    }

    /* ---------- card painting ---------- */
    function paintCards() {
      const bankEl = root.querySelector("#arrBank");
      const ansEl = root.querySelector("#arrAnswer");
      bankEl.innerHTML = q.bank.map((c) => cardHtml(c, "bank")).join("");
      ansEl.innerHTML = q.answer.length
        ? q.answer.map((c) => cardHtml(c, "answer")).join("")
        : `<span class="arr-answer-placeholder">— แตะคำด้านล่าง —</span>`;

      // Tap-to-move binding
      bankEl.querySelectorAll(".arr-card").forEach((el) => {
        el.addEventListener("click", () => {
          if (q.locked) return;
          const id = el.dataset.id;
          const idx = q.bank.findIndex((c) => c.id === id);
          if (idx < 0) return;
          const [card] = q.bank.splice(idx, 1);
          q.answer.push(card);
          paintCards();
        });
      });
      ansEl.querySelectorAll(".arr-card").forEach((el) => {
        el.addEventListener("click", (e) => {
          if (q.locked) return;
          // Avoid stealing the click during a drag (set by pointer drag handler)
          if (el.dataset.dragJust === "1") {
            delete el.dataset.dragJust;
            return;
          }
          const id = el.dataset.id;
          const idx = q.answer.findIndex((c) => c.id === id);
          if (idx < 0) return;
          const [card] = q.answer.splice(idx, 1);
          q.bank.push(card);
          paintCards();
        });
      });

      // Drag-to-reorder within the answer row
      if (!q.locked) wireAnswerReorder(ansEl);
    }

    function cardHtml(c, where) {
      const kindCls = c.kind === "dist" ? " is-dist" : "";
      const dragAttr = where === "answer" ? `draggable="true"` : "";
      return `<button type="button" class="arr-card${kindCls}" data-id="${escapeAttr(c.id)}" data-where="${where}" ${dragAttr}>${escapeHtml(c.text)}</button>`;
    }

    /* ---------- drag-to-reorder (HTML5 native + pointer fallback for touch) ---------- */
    function wireAnswerReorder(ansEl) {
      let draggingId = null;

      // Desktop HTML5 drag — works for mouse on Chrome/Firefox/Safari/Edge.
      ansEl.querySelectorAll(".arr-card").forEach((el) => {
        el.addEventListener("dragstart", (e) => {
          draggingId = el.dataset.id;
          el.classList.add("is-dragging");
          if (e.dataTransfer) {
            e.dataTransfer.effectAllowed = "move";
            try { e.dataTransfer.setData("text/plain", el.dataset.id); } catch (_) {}
          }
        });
        el.addEventListener("dragend", () => {
          el.classList.remove("is-dragging");
          draggingId = null;
        });
      });

      ansEl.addEventListener("dragover", (e) => {
        if (!draggingId) return;
        e.preventDefault();
        if (e.dataTransfer) e.dataTransfer.dropEffect = "move";
        const after = nearestAfter(ansEl, e.clientX);
        const moving = q.answer.find((c) => c.id === draggingId);
        if (!moving) return;
        const fromIdx = q.answer.indexOf(moving);
        const cards = Array.from(ansEl.querySelectorAll(".arr-card"));
        const targetIdx = after ? cards.indexOf(after) : cards.length;
        // splice in real time so the visual reflects insertion target;
        // adjust idx since the array still contains the moving card
        let to = targetIdx;
        if (to > fromIdx) to -= 1;
        if (to === fromIdx || to < 0) return;
        q.answer.splice(fromIdx, 1);
        q.answer.splice(to, 0, moving);
        paintCards();
      });

      // Pointer-based fallback for touch (HTML5 DnD is unreliable on iOS Safari).
      ansEl.querySelectorAll(".arr-card").forEach((el) => {
        el.addEventListener("pointerdown", (e) => {
          if (e.pointerType !== "touch") return;
          if (q.locked) return;
          const id = el.dataset.id;
          const startX = e.clientX;
          const startY = e.clientY;
          let moved = false;
          let captured = false;

          const onMove = (ev) => {
            const dx = ev.clientX - startX;
            const dy = ev.clientY - startY;
            if (!moved && Math.hypot(dx, dy) < 8) return;
            moved = true;
            if (!captured) {
              try { el.setPointerCapture(ev.pointerId); } catch (_) {}
              captured = true;
              el.classList.add("is-dragging");
            }
            const after = nearestAfter(ansEl, ev.clientX);
            const moving = q.answer.find((c) => c.id === id);
            if (!moving) return;
            const fromIdx = q.answer.indexOf(moving);
            const cards = Array.from(ansEl.querySelectorAll(".arr-card"));
            const targetIdx = after ? cards.indexOf(after) : cards.length;
            let to = targetIdx;
            if (to > fromIdx) to -= 1;
            if (to === fromIdx || to < 0) return;
            q.answer.splice(fromIdx, 1);
            q.answer.splice(to, 0, moving);
            paintCards();
            // After paintCards the element is gone — break out
            el.removeEventListener("pointermove", onMove);
            el.removeEventListener("pointerup", onUp);
            el.removeEventListener("pointercancel", onUp);
          };
          const onUp = () => {
            el.classList.remove("is-dragging");
            el.removeEventListener("pointermove", onMove);
            el.removeEventListener("pointerup", onUp);
            el.removeEventListener("pointercancel", onUp);
            if (moved) el.dataset.dragJust = "1";
          };
          el.addEventListener("pointermove", onMove);
          el.addEventListener("pointerup", onUp);
          el.addEventListener("pointercancel", onUp);
        });
      });
    }

    function nearestAfter(container, x) {
      const cards = Array.from(container.querySelectorAll(".arr-card:not(.is-dragging)"));
      for (const c of cards) {
        const rect = c.getBoundingClientRect();
        if (x < rect.left + rect.width / 2) return c;
      }
      return null;
    }

    /* ---------- check / clear / reveal ---------- */
    function handleClear() {
      if (q.locked) return;
      q.bank = q.bank.concat(q.answer);
      q.answer = [];
      // re-shuffle so the user doesn't see the previous tweaked order
      q.bank = shuffle(q.bank);
      paintCards();
    }

    function handleCheck() {
      if (q.locked) return;
      if (!q.answer.length) { return; }

      const got = q.answer.map((c) => c.text);
      const candidates = [q.item.tokens].concat(q.item.alternatives || []);
      const ok = candidates.some((cand) => arrEq(cand, got));

      q.locked = true;
      q.solved = ok;
      if (ok) state.correct += 1;

      paintFeedback(ok ? "ok" : "bad");
      paintCardsLocked(ok);
      revealMeaning(false);
      root.querySelector("#arrCheck").disabled = true;
      root.querySelector("#arrClear").disabled = true;
      root.querySelector("#arrReveal").disabled = true;
      root.querySelector("#arrNext").disabled = false;
    }

    function handleReveal() {
      if (q.locked) return;
      // Auto-fill the canonical answer, then lock as a "wrong" attempt (no point)
      const all = q.bank.concat(q.answer);
      const used = new Set();
      const filled = [];
      let missing = false;
      q.item.tokens.forEach((t) => {
        const card = all.find((c) => c.text === t && !used.has(c.id));
        if (card) { used.add(card.id); filled.push(card); }
        else missing = true;
      });
      if (missing) {
        // Fallback: synthesize plain cards (shouldn't happen, but safe)
        q.answer = q.item.tokens.map((t, idx) => ({ id: "r" + idx, text: t, kind: "tok" }));
        q.bank = [];
      } else {
        q.answer = filled;
        q.bank = all.filter((c) => !used.has(c.id));
      }
      q.locked = true;
      q.solved = false;
      paintCards();
      paintCardsLocked(false, /*revealed=*/true);
      paintFeedback("reveal");
      revealMeaning(false);
      root.querySelector("#arrCheck").disabled = true;
      root.querySelector("#arrClear").disabled = true;
      root.querySelector("#arrReveal").disabled = true;
      root.querySelector("#arrNext").disabled = false;
    }

    function paintCardsLocked(ok, revealed) {
      // Visually mark answer cards as correct/incorrect after locking.
      const ansEl = root.querySelector("#arrAnswer");
      if (!ansEl) return;
      const cards = ansEl.querySelectorAll(".arr-card");
      cards.forEach((el, i) => {
        el.classList.add("is-locked");
        const card = q.answer[i];
        if (!card) return;
        // Compare against the closest matching canonical token at this index
        const candidates = [q.item.tokens].concat(q.item.alternatives || []);
        const ideal = candidates[0][i];
        if (revealed) {
          el.classList.add("is-revealed");
        } else if (ok) {
          el.classList.add("is-correct");
        } else if (ideal && card.text === ideal) {
          el.classList.add("is-correct");
        } else {
          el.classList.add("is-wrong");
        }
      });
      // Lock the bank too — no more pickups
      root.querySelectorAll("#arrBank .arr-card").forEach((el) => el.classList.add("is-locked"));
    }

    function paintFeedback(kind) {
      const fb = root.querySelector("#arrFb");
      if (!fb) return;
      const item = q.item;
      const canonical = item.tokens.join(" ");
      const altLine = (item.alternatives && item.alternatives.length)
        ? `\nคำตอบที่ยอมรับเพิ่ม: ${item.alternatives.map((a) => a.join(" ")).join("  /  ")}`
        : "";
      if (kind === "ok") {
        fb.innerHTML = `
          <div class="feedback ok">
            <strong>ถูกต้อง ✓</strong>
            <div style="white-space:pre-line;margin-top:4px;">${escapeHtml(item.explain || "")}</div>
          </div>`;
      } else if (kind === "reveal") {
        fb.innerHTML = `
          <div class="feedback bad">
            <strong>เฉลย</strong>
            <div style="white-space:pre-line;margin-top:4px;">${escapeHtml("คำตอบที่ถูก: " + canonical + altLine + (item.explain ? "\n" + item.explain : ""))}</div>
          </div>`;
      } else {
        fb.innerHTML = `
          <div class="feedback bad">
            <strong>ยังไม่ถูก ✗</strong>
            <div style="white-space:pre-line;margin-top:4px;">${escapeHtml("คำตอบที่ถูก: " + canonical + altLine + (item.explain ? "\n" + item.explain : ""))}</div>
          </div>`;
      }
    }

    function arrEq(a, b) {
      if (!Array.isArray(a) || !Array.isArray(b)) return false;
      if (a.length !== b.length) return false;
      for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
      return true;
    }

    /* ---------- done ---------- */
    function renderDone() {
      const tot = total;
      const pct = tot > 0 ? Math.round((state.correct / tot) * 100) : 0;
      root.innerHTML = `
        <div class="score-card">
          <div>
            <h2 style="margin:0;">จบแบบฝึกหัดเรียงประโยค!</h2>
            <p class="subtle">${escapeHtml(prettyLevel(level))} · ${tot} ข้อ</p>
            <p class="subtle" style="margin-top:4px;">${pct >= 80 ? "เก่งมาก ✨" : pct >= 50 ? "ใกล้แล้ว ลองอีกชุด" : "ฝึกบ่อย ๆ จะคุ้นเอง"}</p>
          </div>
          <div class="score-num">${state.correct} / ${tot}</div>
        </div>
        <div class="btn-row">
          <button class="btn primary" id="arrAgain">ทำชุดใหม่</button>
          <button class="btn ghost" id="arrBackMenu">← กลับเมนู</button>
        </div>
      `;
      root.querySelector("#arrAgain").addEventListener("click", () => onExit());
      root.querySelector("#arrBackMenu").addEventListener("click", () => onExit());
    }

    return root;
  }

  return { render };
})();
