/**
 * Bookmarks view — questions the user starred from the quiz view.
 * Lets the user retry each one and remove from the list.
 */
window.BookmarksView = (function () {
  function render() {
    const root = document.createElement("div");
    const list = window.Storage.load();

    if (!list.length) {
      root.innerHTML = `
        <h2>คลังข้อที่บันทึก</h2>
        <div class="empty">ยังไม่มีข้อที่บันทึกไว้ — กดดาว ★ ในหน้าแบบฝึกหัดเพื่อเก็บไว้ทวน</div>
      `;
      return root;
    }

    const cards = list
      .map((b, i) => renderCard(b, i))
      .join("");

    root.innerHTML = `
      <div class="qmeta">
        <h2 style="margin:0;">คลังข้อที่บันทึก (${list.length})</h2>
        <button class="btn ghost" id="clearAll">ล้างทั้งหมด</button>
      </div>
      <p class="subtle">กดดูเฉลย หรือปลดดาวเพื่อนำออกจากรายการ</p>
      <div id="bm-list">${cards}</div>
    `;

    root.querySelector("#clearAll").addEventListener("click", () => {
      if (confirm("ล้างรายการทั้งหมด?")) {
        window.Storage.clear();
        render(); // simple: re-mount
        const fresh = window.BookmarksView.render();
        root.replaceWith(fresh);
      }
    });

    root.querySelectorAll("[data-bm]").forEach((card) => bindCard(card));
    return root;
  }

  function renderCard(b, i) {
    const q = b.snapshot && b.snapshot.q;
    const title = b.snapshot && b.snapshot.unitTitle;
    if (!q) return "";

    const choices = q.type === "mcq"
      ? q.choices.map((c, idx) => `<button class="choice" data-i="${idx}">${escapeHtml(c)}</button>`).join("")
      : `<input class="txt-input" data-fill placeholder="พิมพ์คำตอบ..." />
         <div class="btn-row"><button class="btn primary" data-submit>ตรวจ</button></div>`;

    return `
      <div class="card" data-bm data-id="${escapeHtml(b.id)}">
        <div class="qmeta">
          <span class="qprog">${escapeHtml(b.level.toUpperCase())} · ${escapeHtml(title || "")}</span>
          <button class="star on" data-unstar title="นำออกจากคลัง">★</button>
        </div>
        <h3>${escapeHtml(q.q)}</h3>
        <div data-body>${choices}</div>
        <div data-fb></div>
        <div class="btn-row">
          <button class="btn ghost" data-show>ดูเฉลย</button>
        </div>
      </div>
    `;
  }

  function bindCard(card) {
    const id = card.dataset.id;
    const list = window.Storage.load();
    const b = list.find((x) => x.id === id);
    if (!b) return;
    const q = b.snapshot.q;

    card.querySelector("[data-unstar]").addEventListener("click", () => {
      window.Storage.remove(id);
      card.remove();
    });

    card.querySelector("[data-show]").addEventListener("click", () => {
      const fb = card.querySelector("[data-fb]");
      const ans = q.type === "mcq" ? q.choices[q.answer] : (Array.isArray(q.answer) ? q.answer.join(" / ") : q.answer);
      fb.innerHTML = `
        <div class="feedback ok">
          <strong>เฉลย: ${escapeHtml(ans)}</strong>
          <div style="margin-top:4px;">${escapeHtml(q.explain || "")}</div>
        </div>`;
    });

    if (q.type === "mcq") {
      card.querySelectorAll(".choice").forEach((btn) => {
        btn.addEventListener("click", () => {
          const picked = Number(btn.dataset.i);
          const ok = picked === q.answer;
          card.querySelectorAll(".choice").forEach((c, idx) => {
            c.classList.add("disabled");
            if (idx === q.answer) c.classList.add("correct");
            else if (idx === picked) c.classList.add("wrong");
          });
          card.querySelector("[data-fb]").innerHTML = `
            <div class="feedback ${ok ? "ok" : "bad"}">
              <strong>${ok ? "ถูกต้อง ✓" : "ยังไม่ถูก ✗"}</strong>
              <div style="margin-top:4px;">${escapeHtml(q.explain || "")}</div>
            </div>`;
        });
      });
    } else {
      const input = card.querySelector("[data-fill]");
      const submit = () => {
        const accepted = (Array.isArray(q.answer) ? q.answer : [q.answer]).map((s) => String(s).trim());
        const got = String(input.value || "").trim();
        const ok = accepted.includes(got);
        input.disabled = true;
        input.style.borderColor = ok ? "var(--ok)" : "var(--bad)";
        card.querySelector("[data-fb]").innerHTML = `
          <div class="feedback ${ok ? "ok" : "bad"}">
            <strong>${ok ? "ถูกต้อง ✓" : "ยังไม่ถูก ✗"}</strong>
            <div style="margin-top:4px;">เฉลย: ${escapeHtml(accepted.join(" / "))} — ${escapeHtml(q.explain || "")}</div>
          </div>`;
      };
      card.querySelector("[data-submit]").addEventListener("click", submit);
      input.addEventListener("keydown", (e) => { if (e.key === "Enter") submit(); });
    }
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
