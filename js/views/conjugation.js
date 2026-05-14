/**
 * Conjugation drill — pick a target form, generate items from a global pool
 * aggregated across all window.LEVELS (conjugation is NOT level-segmented;
 * the level dropdown controls grammar/quiz only). Auto-saves per-item-per-form
 * progress to window.ConjStorage under a fixed "all" key.
 *
 * UI:
 *   • progress bar (overall completion of mode)
 *   • per-current-item "form pills" (✓ correct / · tried)
 *   • collapsible "ความก้าวหน้า" panel with per-item table + reset
 *   • on-screen hiragana keyboard so users without a JP IME can answer
 */
window.ConjugationView = (function () {
  const STORAGE_LEVEL = "all";

  // Aggregate verbs / adjectives / formLabels across all configured levels.
  // First-occurrence wins on duplicates (keyed by dict / word).
  function aggregate() {
    const verbs = [], adjectives = [], formLabels = {};
    const seenV = new Set(), seenA = new Set();
    Object.keys(window.LEVELS || {}).forEach((id) => {
      const lv = window.LEVELS[id] || {};
      (lv.verbs || []).forEach((v) => {
        if (v && v.dict && !seenV.has(v.dict)) { seenV.add(v.dict); verbs.push(v); }
      });
      (lv.adjectives || []).forEach((a) => {
        if (a && a.word && !seenA.has(a.word)) { seenA.add(a.word); adjectives.push(a); }
      });
      Object.assign(formLabels, lv.formLabels || {});
    });
    return { verbs, adjectives, formLabels };
  }

  function render() {
    const data = aggregate();
    const root = document.createElement("div");

    const verbForms = ["masu", "masen", "mashita", "te", "nai", "ta", "tai"];
    const iAdjForms = ["neg", "past", "past-neg"];
    const naAdjForms = ["neg", "past", "past-neg", "modify"];

    let mode = "verb"; // "verb" | "i-adj" | "na-adj"
    let target = "masu";
    let item = null;
    let panelOpen = false;

    function pool() {
      if (mode === "verb") return data.verbs;
      if (mode === "i-adj") return data.adjectives.filter((a) => a.kind === "i");
      return data.adjectives.filter((a) => a.kind === "na");
    }
    function targetOptions() {
      if (mode === "verb") return verbForms;
      if (mode === "i-adj") return iAdjForms;
      return naAdjForms;
    }
    function keyOf(it) { return mode === "verb" ? it.dict : it.word; }

    function ensureValidTarget() {
      const opts = targetOptions();
      if (!opts.includes(target)) target = opts[0];
    }

    function pickItem() {
      const p = pool();
      if (!p.length) return null;
      return p[Math.floor(Math.random() * p.length)];
    }

    function next() {
      ensureValidTarget();
      item = pickItem();
      draw();
    }

    function modeLabel() {
      return mode === "verb" ? "กริยา" : mode === "i-adj" ? "คุณศัพท์ い" : "คุณศัพท์ な";
    }

    function draw() {
      const opts = targetOptions()
        .map((f) => `<option value="${f}" ${f === target ? "selected" : ""}>${escapeHtml(data.formLabels[f] || f)}</option>`)
        .join("");

      const totals = window.ConjStorage.totals(STORAGE_LEVEL, mode, pool(), targetOptions());
      const overallPct = totals.total ? Math.round((totals.done / totals.total) * 100) : 0;

      let prompt = "—", groupPill = "", pillsHtml = "", meaning = "";
      if (item) {
        if (mode === "verb") {
          const cls = `g${item.group}`;
          const lbl = item.group === 1 ? "Godan" : item.group === 2 ? "Ichidan" : "Irregular";
          groupPill = `<span class="pill ${cls}">${lbl}</span>`;
          prompt = item.dict;
        } else {
          const cls = item.kind === "i" ? "adj-i" : "adj-na";
          groupPill = `<span class="pill ${cls}">${item.kind === "i" ? "i-adj" : "na-adj"}</span>`;
          prompt = item.word;
        }
        meaning = item.meaning || "";

        const sm = window.ConjStorage.summary(STORAGE_LEVEL, mode, keyOf(item), targetOptions());
        pillsHtml = targetOptions().map((f) => {
          const slot = sm.item[f];
          let cls = "fpill";
          let mark = "";
          if (slot && slot.correct > 0) { cls += " done"; mark = " ✓"; }
          else if (slot && slot.tries > 0) { cls += " tried"; mark = " ·"; }
          return `<span class="${cls}">${escapeHtml(data.formLabels[f] || f)}${mark}</span>`;
        }).join("");
      }

      root.innerHTML = `
        <h2>ฝึกผันคำ</h2>

        <div class="card">
          <div class="conj-summary">
            <span><b>${totals.done}/${totals.total}</b> รูปที่ผันถูก (${modeLabel()})</span>
            <span>คำที่ผันครบทุกรูป: <b>${totals.perfectItems}/${totals.totalItems}</b></span>
            <span style="margin-left:auto;">
              <button class="btn ghost" id="togglePanel">${panelOpen ? "ซ่อนความก้าวหน้า ▲" : "ดูความก้าวหน้า ▼"}</button>
            </span>
          </div>
          <div class="progress ${overallPct === 100 ? "ok" : ""}"><div class="bar" style="width:${overallPct}%"></div></div>

          <div class="controls" style="margin-top:6px;">
            <label>หมวด</label>
            <select id="modeSel">
              <option value="verb" ${mode === "verb" ? "selected" : ""}>กริยา</option>
              <option value="i-adj" ${mode === "i-adj" ? "selected" : ""}>คุณศัพท์ い</option>
              <option value="na-adj" ${mode === "na-adj" ? "selected" : ""}>คุณศัพท์ な</option>
            </select>
            <label>รูปที่ต้องการ</label>
            <select id="formSel">${opts}</select>
            <button class="btn" id="newBtn">ข้อใหม่</button>
          </div>

          <div class="flex-row" style="margin-top:14px;">
            <span class="subtle">โจทย์:</span>
            <h3 style="margin:0; font-size: 22px;">${escapeHtml(prompt)}</h3>
            ${groupPill}
            <span class="subtle">— ${escapeHtml(meaning)}</span>
          </div>
          <p class="subtle" style="margin:6px 0 4px;">ผันเป็นรูป <b>${escapeHtml(data.formLabels[target] || target)}</b></p>
          <div class="fpill-row" title="สถานะของคำนี้: ✓ = เคยตอบถูก / · = เคยตอบผิด">${pillsHtml}</div>

          <input type="text" class="txt-input" id="ansInput"
            placeholder="พิมพ์คำตอบ หรือกดแป้นพิมพ์ด้านล่าง"
            autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" />
          <div id="kbSlot"></div>
          <div class="btn-row">
            <button class="btn primary" id="checkBtn">ตรวจ</button>
            <button class="btn ghost" id="showBtn">เฉลย</button>
            <button class="btn" id="skipBtn">ข้อถัดไป →</button>
          </div>
          <div id="fb"></div>
        </div>

        <div id="panel" style="display:${panelOpen ? "block" : "none"};"></div>

        <p class="subtle">เคล็ดลับการผัน:
          กริยา Godan → เปลี่ยนแถว u→i+ます / u→a+ない;
          กริยา Ichidan → ตัด る แล้วเติมรูป;
          い-adj → ตัด い + くない / かった;
          な-adj → ผันเหมือน N+です (じゃない / だった).
        </p>
      `;

      bindControls();
      if (panelOpen) renderPanel();
    }

    function bindControls() {
      const modeSel = root.querySelector("#modeSel");
      const formSel = root.querySelector("#formSel");
      modeSel.addEventListener("change", () => { mode = modeSel.value; ensureValidTarget(); next(); });
      formSel.addEventListener("change", () => { target = formSel.value; draw(); });

      root.querySelector("#newBtn").addEventListener("click", next);
      root.querySelector("#skipBtn").addEventListener("click", next);

      const input = root.querySelector("#ansInput");
      const check = () => doCheck(input);
      root.querySelector("#checkBtn").addEventListener("click", check);
      input.addEventListener("keydown", (e) => { if (e.key === "Enter") check(); });
      root.querySelector("#showBtn").addEventListener("click", showAnswer);

      root.querySelector("#togglePanel").addEventListener("click", () => {
        panelOpen = !panelOpen;
        draw();
      });

      if (window.KanaKeypad) {
        const slot = root.querySelector("#kbSlot");
        if (slot) slot.appendChild(window.KanaKeypad.create(input));
      }
    }

    function expected() {
      if (!item) return "";
      return (item.forms && item.forms[target]) || "";
    }

    function doCheck(input) {
      if (!item) return;
      const got = (input.value || "").trim();
      const exp = expected();
      const ok = !!got && got === exp;
      window.ConjStorage.record(STORAGE_LEVEL, mode, keyOf(item), target, ok);
      draw(); // refresh pills + overall progress
      const inp2 = root.querySelector("#ansInput");
      if (inp2) inp2.value = got;
      const fb = root.querySelector("#fb");
      if (fb) fb.innerHTML = `
        <div class="feedback ${ok ? "ok" : "bad"}">
          <strong>${ok ? "ถูกต้อง ✓" : "ยังไม่ถูก ✗"}</strong>
          <div style="margin-top:4px;">เฉลย: <b>${escapeHtml(exp)}</b></div>
        </div>`;
    }

    function showAnswer() {
      if (!item) return;
      const fb = root.querySelector("#fb");
      fb.innerHTML = `
        <div class="feedback ok">
          <strong>เฉลย</strong>
          <div style="margin-top:4px;">${escapeHtml(item.dict || item.word)} → <b>${escapeHtml(expected())}</b></div>
        </div>`;
    }

    function renderPanel() {
      const panel = root.querySelector("#panel");
      if (!panel) return;
      const items = pool();
      const forms = targetOptions();
      const dataAll = window.ConjStorage.getAll(STORAGE_LEVEL, mode);

      const rows = items.map((it) => {
        const k = mode === "verb" ? it.dict : it.word;
        const slot = dataAll[k] || {};
        let done = 0, tried = 0;
        forms.forEach((f) => {
          if (slot[f] && slot[f].correct > 0) done++;
          else if (slot[f] && slot[f].tries > 0) tried++;
        });
        const pct = forms.length ? Math.round((done / forms.length) * 100) : 0;
        const display = mode === "verb"
          ? `${escapeHtml(it.dict)} <span class="subtle">(${escapeHtml(it.meaning || "")})</span>`
          : `${escapeHtml(it.word)} <span class="subtle">(${escapeHtml(it.meaning || "")})</span>`;
        return `
          <tr class="${done === forms.length ? "row-perfect" : ""}">
            <td>${display}</td>
            <td>
              <span class="mini-bar ${done === forms.length ? "full" : ""}"><div style="width:${pct}%"></div></span>
              <span style="margin-left:6px; font-variant-numeric: tabular-nums;">${done}/${forms.length}</span>
              ${tried ? `<span class="subtle"> · ผิด ${tried}</span>` : ""}
            </td>
          </tr>
        `;
      }).join("");

      panel.innerHTML = `
        <div class="card">
          <div class="qmeta">
            <h3 style="margin:0;">ความก้าวหน้า — ${escapeHtml(modeLabel())}</h3>
            <button class="btn ghost" id="resetKindBtn">ล้างความก้าวหน้าหมวดนี้</button>
          </div>
          <p class="subtle" style="margin:0 0 8px;">บันทึกอัตโนมัติ — ซิงก์ข้ามเครื่องเมื่อเข้าสู่ระบบ.</p>
          <table class="conj-progress-table">
            <thead><tr><th>คำ</th><th>ผันถูกแล้ว</th></tr></thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      `;
      panel.querySelector("#resetKindBtn").addEventListener("click", () => {
        if (confirm(`ล้างความก้าวหน้าของ ${modeLabel()} ?`)) {
          window.ConjStorage.resetKind(STORAGE_LEVEL, mode);
          draw();
        }
      });
    }

    next();
    return root;
  }

  function escapeHtml(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    }[c]));
  }

  return { render };
})();
