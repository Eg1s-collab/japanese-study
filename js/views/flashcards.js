/**
 * Flashcards view — Quizlet-style deck browser + Flash Cards + Learn modes.
 *
 * Sub-screens (kept in `screen`):
 *   - "home":  folder + deck browser
 *   - "deck":  word list for a deck (chunk control + per-mode progress)
 *   - "cards": flash-card review for the current chunk of a deck
 *   - "learn": 4-choice quiz for the current chunk of a deck
 *
 * Progress is persisted per-deck via FlashcardsStorage (seenIds for cards,
 * completedIds + attempts/correct for learn) and survives reloads + cloud
 * sync. Pool for each mode = current chunk → optional star filter →
 * optional shuffle (cards only). Progress bars track unique words
 * finished within the current pool.
 */
window.FlashcardsView = (function () {
  const FS = () => window.FlashcardsStorage;

  const state = {
    screen: "home",
    folderId: null,
    deckId: null,
    cardsOpts: { shuffle: false, swap: false, starredOnly: false },
    learnOpts: { swap: false, starredOnly: false }
  };

  /* ---------- utils ---------- */
  function escapeHtml(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[c]));
  }
  function hasJapanese(s) {
    return /[\u3040-\u30ff\u3400-\u9fff\uff66-\uff9f]/.test(String(s || ""));
  }
  function speak(text, lang) {
    if (!("speechSynthesis" in window)) return;
    try {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(String(text || ""));
      u.lang = lang || (hasJapanese(text) ? "ja-JP" : "th-TH");
      u.rate = 0.95;
      window.speechSynthesis.speak(u);
    } catch (e) { /* ignore */ }
  }
  function shuffleArr(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
  function chunkLabel(deck) {
    if (!deck.chunkSize) return `ทั้งหมด (${deck.words.length} คำ)`;
    const total = FS().chunkCount(deck);
    const r = FS().chunkRange(deck);
    return `ชุด ${deck.selectedChunk + 1}/${total} (คำ ${r.from}-${r.to})`;
  }

  /* ===================== top-level render ===================== */
  function render() {
    const root = document.createElement("div");
    if (state.screen === "home")   root.appendChild(renderHome());
    else if (state.screen === "deck")  root.appendChild(renderDeck());
    else if (state.screen === "cards") root.appendChild(renderCards());
    else if (state.screen === "learn") root.appendChild(renderLearn());
    return root;
  }
  function refresh(container) {
    const fresh = render();
    container.replaceWith(fresh);
    return fresh;
  }

  /* ===================== HOME (folder + deck browser) ===================== */
  function renderHome() {
    const data = FS().load();
    const folder = state.folderId ? data.folders.find((f) => f.id === state.folderId) : null;
    const visibleDecks = state.folderId
      ? data.decks.filter((d) => d.folderId === state.folderId)
      : data.decks.filter((d) => !d.folderId);

    const root = document.createElement("div");
    root.innerHTML = `
      <div class="qmeta">
        <h2 style="margin:0;">📇 บัตรคำ ${folder ? "· " + escapeHtml(folder.name) : ""}</h2>
        <div class="btn-row" style="margin:0;">
          ${folder ? `<button class="btn ghost" id="backRoot">← กลับ</button>` : ""}
          <button class="btn" id="newFolderBtn">+ โฟลเดอร์</button>
          <button class="btn primary" id="newDeckBtn">+ ชุดคำ</button>
        </div>
      </div>
      <p class="subtle">${folder ? "ชุดคำในโฟลเดอร์นี้" : "โฟลเดอร์และชุดคำที่ยังไม่จัดเข้าโฟลเดอร์"}</p>
      <div id="fc-body"></div>
    `;
    const body = root.querySelector("#fc-body");

    if (!state.folderId && data.folders.length) {
      const folders = document.createElement("div");
      folders.className = "unit-list";
      data.folders.forEach((f) => {
        const count = data.decks.filter((d) => d.folderId === f.id).length;
        const card = document.createElement("div");
        card.className = "card unit-card";
        card.innerHTML = `
          <div class="badge">📁 โฟลเดอร์</div>
          <h3>${escapeHtml(f.name)}</h3>
          <p class="subtle">${count} ชุดคำ</p>
          <div class="btn-row">
            <button class="btn ghost" data-rename>เปลี่ยนชื่อ</button>
            <button class="btn ghost" data-del>ลบ</button>
          </div>
        `;
        card.addEventListener("click", (e) => {
          if (e.target.closest("button")) return;
          state.folderId = f.id; refresh(root);
        });
        card.querySelector("[data-rename]").addEventListener("click", () => {
          const n = prompt("ชื่อโฟลเดอร์ใหม่:", f.name);
          if (n != null) { FS().renameFolder(f.id, n); refresh(root); }
        });
        card.querySelector("[data-del]").addEventListener("click", () => {
          if (confirm(`ลบโฟลเดอร์ "${f.name}"? (ชุดคำในโฟลเดอร์จะย้ายไปอยู่นอกโฟลเดอร์)`)) {
            FS().deleteFolder(f.id, null); refresh(root);
          }
        });
        folders.appendChild(card);
      });
      body.appendChild(folders);
    }

    if (visibleDecks.length) {
      const decks = document.createElement("div");
      decks.className = "unit-list";
      decks.style.marginTop = (state.folderId ? "0" : "14px");
      visibleDecks.forEach((d) => {
        const starred = d.words.filter((w) => w.starred).length;
        const cardsDone = (d.progress && d.progress.cards) ? d.progress.cards.seenIds.length : 0;
        const learnDone = (d.progress && d.progress.learn) ? d.progress.learn.completedIds.length : 0;
        const pctC = d.words.length ? Math.round((cardsDone / d.words.length) * 100) : 0;
        const pctL = d.words.length ? Math.round((learnDone / d.words.length) * 100) : 0;
        const card = document.createElement("div");
        card.className = "card unit-card";
        card.innerHTML = `
          <div class="badge">📚 ${d.words.length} คำ${starred ? ` · ⭐ ${starred}` : ""}${d.chunkSize ? ` · แบ่ง ${d.chunkSize}` : ""}</div>
          <h3>${escapeHtml(d.name)}</h3>
          <div class="fc-mini-prog">
            <div class="fc-mini-row"><span>📇 ${cardsDone}/${d.words.length}</span>
              <div class="progress"><div class="bar" style="width:${pctC}%"></div></div></div>
            <div class="fc-mini-row"><span>🎯 ${learnDone}/${d.words.length}</span>
              <div class="progress"><div class="bar" style="width:${pctL}%"></div></div></div>
          </div>
          <div class="btn-row">
            <button class="btn primary" data-open>เปิด</button>
            <button class="btn ghost" data-move>ย้าย</button>
            <button class="btn ghost" data-rename>เปลี่ยนชื่อ</button>
            <button class="btn ghost" data-del>ลบ</button>
          </div>
        `;
        card.querySelector("[data-open]").addEventListener("click", () => {
          state.screen = "deck"; state.deckId = d.id; refresh(root);
        });
        card.querySelector("[data-rename]").addEventListener("click", () => {
          const n = prompt("ชื่อชุดคำใหม่:", d.name);
          if (n != null) { FS().renameDeck(d.id, n); refresh(root); }
        });
        card.querySelector("[data-del]").addEventListener("click", () => {
          if (confirm(`ลบชุดคำ "${d.name}"? ลบแล้วเรียกคืนไม่ได้`)) {
            FS().deleteDeck(d.id); refresh(root);
          }
        });
        card.querySelector("[data-move]").addEventListener("click", () => {
          const folders = FS().load().folders;
          const opts = ["(ไม่มีโฟลเดอร์)", ...folders.map((f) => f.name)];
          const choice = prompt(
            "ย้ายไปที่โฟลเดอร์ไหน? พิมพ์เลข\n" + opts.map((o, i) => `${i}. ${o}`).join("\n"),
            "0"
          );
          if (choice == null) return;
          const idx = parseInt(choice, 10);
          if (isNaN(idx) || idx < 0 || idx >= opts.length) return;
          const fid = idx === 0 ? null : folders[idx - 1].id;
          FS().moveDeck(d.id, fid);
          refresh(root);
        });
        decks.appendChild(card);
      });
      body.appendChild(decks);
    }

    if (!data.folders.length && !visibleDecks.length) {
      const empty = document.createElement("div");
      empty.className = "empty";
      empty.textContent = state.folderId
        ? "ยังไม่มีชุดคำในโฟลเดอร์นี้ — กด “+ ชุดคำ”"
        : "ยังไม่มีอะไรเลย — เริ่มต้นด้วยการสร้างโฟลเดอร์หรือชุดคำใหม่";
      body.appendChild(empty);
    }

    if (folder) {
      root.querySelector("#backRoot").addEventListener("click", () => {
        state.folderId = null; refresh(root);
      });
    }
    root.querySelector("#newFolderBtn").addEventListener("click", () => {
      const n = prompt("ตั้งชื่อโฟลเดอร์ใหม่:");
      if (n) { FS().createFolder(n); refresh(root); }
    });
    root.querySelector("#newDeckBtn").addEventListener("click", () => {
      const n = prompt("ตั้งชื่อชุดคำใหม่:");
      if (!n) return;
      const d = FS().createDeck(n, state.folderId);
      state.screen = "deck"; state.deckId = d.id; refresh(root);
    });
    return root;
  }

  /* ===================== DECK DETAIL ===================== */
  function renderDeck() {
    const deck = FS().getDeck(state.deckId);
    if (!deck) { state.screen = "home"; return renderHome(); }

    const root = document.createElement("div");

    function poolWords() { return FS().chunkWords(deck); }
    function poolIds() { return new Set(poolWords().map((w) => w.id)); }
    function cardsProgressInPool() {
      const pool = poolIds();
      return deck.progress.cards.seenIds.filter((id) => pool.has(id)).length;
    }
    function learnProgressInPool() {
      const pool = poolIds();
      return deck.progress.learn.completedIds.filter((id) => pool.has(id)).length;
    }

    function draw() {
      const d = FS().getDeck(state.deckId);
      // refresh local closure
      Object.assign(deck, d);

      const total = deck.words.length;
      const starred = deck.words.filter((w) => w.starred).length;
      const chunkTotal = FS().chunkCount(deck);
      const poolSize = poolWords().length;
      const seenInPool = cardsProgressInPool();
      const doneInPool = learnProgressInPool();
      const pctC = poolSize ? Math.round((seenInPool / poolSize) * 100) : 0;
      const pctL = poolSize ? Math.round((doneInPool / poolSize) * 100) : 0;

      const chunkOpts = [25, 50, 100].map((n) =>
        `<option value="${n}" ${deck.chunkSize === n ? "selected" : ""}>${n} คำ/ชุด</option>`
      ).join("");
      const chunkPickerOpts = Array.from({ length: chunkTotal }, (_, i) => {
        const from = i * deck.chunkSize + 1;
        const to = Math.min(total, (i + 1) * deck.chunkSize);
        return `<option value="${i}" ${i === deck.selectedChunk ? "selected" : ""}>ชุด ${i + 1} (คำ ${from}-${to})</option>`;
      }).join("");

      root.innerHTML = `
        <div class="qmeta">
          <h2 style="margin:0;">${escapeHtml(deck.name)}</h2>
          <button class="btn ghost" id="backHome">← กลับ</button>
        </div>
        <p class="subtle">${total} คำ · ⭐ ${starred}</p>

        <div class="card">
          <h3 style="margin-top:0;">แบ่งชุดย่อย</h3>
          <div class="fc-chunk-row">
            <label class="fc-toggle" style="gap:8px;">
              <span>ขนาดชุด:</span>
              <select id="chunkSizeSel" class="level-select">
                <option value="" ${!deck.chunkSize ? "selected" : ""}>ทั้งหมด</option>
                ${chunkOpts}
                <option value="custom">กำหนดเอง…</option>
              </select>
            </label>
            ${deck.chunkSize ? `
              <label class="fc-toggle" style="gap:8px;">
                <span>เลือกชุด:</span>
                <select id="chunkIdxSel" class="level-select">${chunkPickerOpts}</select>
              </label>` : ""}
          </div>
          <p class="subtle" style="margin:8px 0 0;">ใช้กับ ${escapeHtml(chunkLabel(deck))}</p>
        </div>

        <div class="card">
          <div class="fc-mode-row">
            <div class="fc-mode-meta">
              <div class="fc-mode-title">📇 Flash Cards</div>
              <div class="qprog">${seenInPool} / ${poolSize}</div>
              <div class="progress"><div class="bar" style="width:${pctC}%"></div></div>
            </div>
            <div class="btn-row" style="margin:0;">
              <button class="btn primary" id="goCards">${seenInPool > 0 && seenInPool < poolSize ? "ทำต่อ" : "เริ่ม"}</button>
              <button class="btn ghost" id="resetCards" ${seenInPool === 0 ? "disabled" : ""}>รีเซ็ต</button>
            </div>
          </div>
          <hr style="border:none; border-top:1px solid var(--line); margin:14px 0;" />
          <div class="fc-mode-row">
            <div class="fc-mode-meta">
              <div class="fc-mode-title">🎯 Learn</div>
              <div class="qprog">${doneInPool} / ${poolSize} · ตอบไป ${deck.progress.learn.attempts} ครั้ง · ถูก ${deck.progress.learn.correct}</div>
              <div class="progress"><div class="bar" style="width:${pctL}%"></div></div>
            </div>
            <div class="btn-row" style="margin:0;">
              <button class="btn primary" id="goLearn">${doneInPool > 0 && doneInPool < poolSize ? "ทำต่อ" : "เริ่ม"}</button>
              <button class="btn ghost" id="resetLearn" ${doneInPool === 0 && deck.progress.learn.attempts === 0 ? "disabled" : ""}>รีเซ็ต</button>
            </div>
          </div>
        </div>

        <div class="card">
          <div class="btn-row" style="margin:0;">
            <button class="btn" id="importBtn">⬆︎ นำเข้า CSV</button>
            <input type="file" id="csvFile" accept=".csv,text/csv" style="display:none;" />
          </div>
        </div>

        <div class="card">
          <h3 style="margin-top:0;">เพิ่มคำใหม่</h3>
          <div class="fc-add-row">
            <input class="txt-input" id="newFront" placeholder="ด้านหน้า (เช่น 会う(あう))" />
            <input class="txt-input" id="newBack" placeholder="ด้านหลัง (เช่น พบ, เจอ)" />
            <button class="btn primary" id="addBtn">+ เพิ่ม</button>
          </div>
        </div>

        <div class="card">
          <h3 style="margin-top:0;">คำศัพท์ใน ${escapeHtml(chunkLabel(deck))}</h3>
          <div id="wordList"></div>
        </div>
      `;

      drawWordList();
      bindEvents();
    }

    function drawWordList() {
      const list = root.querySelector("#wordList");
      const words = poolWords();
      if (!words.length) {
        list.innerHTML = `<div class="empty">ยังไม่มีคำในชุดนี้</div>`;
        return;
      }
      list.innerHTML = words.map((w) => `
        <div class="fc-word" data-id="${w.id}">
          <button class="star ${w.starred ? "on" : ""}" data-star title="ติดดาว">★</button>
          <div class="fc-word-text">
            <div class="fc-front">${escapeHtml(w.front)}</div>
            <div class="fc-back">${escapeHtml(w.back)}</div>
          </div>
          <div class="fc-word-actions">
            <button class="btn ghost" data-edit>แก้</button>
            <button class="btn ghost" data-del>ลบ</button>
          </div>
        </div>
      `).join("");

      list.querySelectorAll("[data-star]").forEach((btn) => {
        btn.addEventListener("click", () => {
          const wid = btn.closest(".fc-word").dataset.id;
          FS().toggleStar(deck.id, wid);
          draw();
        });
      });
      list.querySelectorAll("[data-del]").forEach((btn) => {
        btn.addEventListener("click", () => {
          const wid = btn.closest(".fc-word").dataset.id;
          if (confirm("ลบคำนี้?")) { FS().deleteWord(deck.id, wid); draw(); }
        });
      });
      list.querySelectorAll("[data-edit]").forEach((btn) => {
        btn.addEventListener("click", () => {
          const wid = btn.closest(".fc-word").dataset.id;
          const w = FS().getDeck(deck.id).words.find((x) => x.id === wid);
          const f = prompt("ด้านหน้า:", w.front);
          if (f == null) return;
          const b = prompt("ด้านหลัง:", w.back);
          if (b == null) return;
          FS().updateWord(deck.id, wid, f, b);
          draw();
        });
      });
    }

    function bindEvents() {
      root.querySelector("#backHome").addEventListener("click", () => {
        state.screen = "home"; state.deckId = null; refresh(root);
      });

      const sizeSel = root.querySelector("#chunkSizeSel");
      sizeSel.addEventListener("change", () => {
        const v = sizeSel.value;
        if (v === "custom") {
          const n = prompt("ขนาดต่อชุด (จำนวนคำ):", deck.chunkSize || 50);
          const num = parseInt(n, 10);
          if (!isNaN(num) && num > 0) FS().setChunkSize(deck.id, num);
          draw();
          return;
        }
        FS().setChunkSize(deck.id, v ? Number(v) : null);
        draw();
      });
      const idxSel = root.querySelector("#chunkIdxSel");
      if (idxSel) {
        idxSel.addEventListener("change", () => {
          FS().setSelectedChunk(deck.id, Number(idxSel.value));
          draw();
        });
      }

      root.querySelector("#goCards").addEventListener("click", () => {
        if (!poolWords().length) return alert("ยังไม่มีคำในชุดย่อยนี้");
        state.screen = "cards"; refresh(root);
      });
      root.querySelector("#resetCards").addEventListener("click", () => {
        if (confirm("รีเซ็ตความคืบหน้า Flash Cards ของชุดคำนี้?")) {
          FS().clearProgress(deck.id, "cards"); draw();
        }
      });
      root.querySelector("#goLearn").addEventListener("click", () => {
        if (poolWords().length < 4) return alert("ต้องมีอย่างน้อย 4 คำในชุดย่อยเพื่อใช้โหมด Learn");
        state.screen = "learn"; refresh(root);
      });
      root.querySelector("#resetLearn").addEventListener("click", () => {
        if (confirm("รีเซ็ตความคืบหน้า Learn ของชุดคำนี้?")) {
          FS().clearProgress(deck.id, "learn"); draw();
        }
      });

      root.querySelector("#addBtn").addEventListener("click", () => {
        const f = root.querySelector("#newFront");
        const b = root.querySelector("#newBack");
        if (!f.value.trim() && !b.value.trim()) return;
        FS().addWord(deck.id, f.value, b.value);
        f.value = ""; b.value = ""; f.focus();
        draw();
      });
      root.querySelector("#importBtn").addEventListener("click", () => {
        root.querySelector("#csvFile").click();
      });
      root.querySelector("#csvFile").addEventListener("change", (e) => {
        const input = e.target;
        const file = input.files && input.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
          const res = FS().importCSV(deck.id, reader.result);
          input.value = "";
          alert(`นำเข้าแล้ว ${res.added} คำ`);
          draw();
        };
        reader.readAsText(file, "utf-8");
      });
    }

    draw();
    return root;
  }

  /* ===================== FLASH CARDS MODE ===================== */
  function renderCards() {
    const deck = FS().getDeck(state.deckId);
    if (!deck) { state.screen = "home"; return renderHome(); }

    const root = document.createElement("div");

    // Build the pool (chunk → optional star filter → optional shuffle).
    // We re-build whenever options change.
    function buildPool() {
      let pool = FS().chunkWords(FS().getDeck(deck.id));
      if (state.cardsOpts.starredOnly) pool = pool.filter((w) => w.starred);
      if (state.cardsOpts.shuffle) pool = shuffleArr(pool);
      return pool;
    }
    let pool = buildPool();
    let i = 0;
    let flipped = false;

    // Resume at first unseen card in pool (so progress persists across visits).
    function resumeIndex() {
      const seen = new Set((FS().getDeck(deck.id).progress.cards.seenIds) || []);
      const idx = pool.findIndex((w) => !seen.has(w.id));
      return idx < 0 ? 0 : idx;
    }
    i = resumeIndex();

    function frontOf(w) { return state.cardsOpts.swap ? w.back : w.front; }
    function backOf(w)  { return state.cardsOpts.swap ? w.front : w.back; }

    function seenSet() {
      return new Set(FS().getDeck(deck.id).progress.cards.seenIds || []);
    }

    function renderToolbar() {
      return `
        <div class="fc-toolbar fc-toolbar-sticky">
          <label class="fc-toggle"><input type="checkbox" data-opt="shuffle" ${state.cardsOpts.shuffle ? "checked" : ""}/> สลับลำดับ</label>
          <label class="fc-toggle"><input type="checkbox" data-opt="swap" ${state.cardsOpts.swap ? "checked" : ""}/> สลับด้าน</label>
          <label class="fc-toggle"><input type="checkbox" data-opt="starredOnly" ${state.cardsOpts.starredOnly ? "checked" : ""}/> ดาวเท่านั้น</label>
        </div>
      `;
    }
    function bindToolbar() {
      root.querySelectorAll(".fc-toolbar input[data-opt]").forEach((cb) => {
        cb.addEventListener("change", () => {
          const opt = cb.dataset.opt;
          state.cardsOpts[opt] = cb.checked;
          pool = buildPool();
          i = resumeIndex();
          flipped = false;
          draw();
        });
      });
    }
    function renderHeader() {
      return `
        <div class="qmeta">
          <h2 style="margin:0;">📇 ${escapeHtml(deck.name)}</h2>
          <button class="btn ghost" id="back">← กลับ</button>
        </div>
        <p class="subtle">${escapeHtml(chunkLabel(deck))}</p>
      `;
    }
    function bindHeader() {
      root.querySelector("#back").addEventListener("click", goBack);
    }

    function draw() {
      const total = pool.length;
      const seen = seenSet();
      const seenInPool = pool.filter((w) => seen.has(w.id)).length;
      const pct = total ? Math.round((seenInPool / total) * 100) : 0;

      // Empty pool
      if (!total) {
        root.innerHTML = `
          ${renderHeader()}
          ${renderToolbar()}
          <div class="empty">ไม่มีคำให้รีวิวในชุดย่อยนี้${state.cardsOpts.starredOnly ? " (ลองปิด \"ดาวเท่านั้น\")" : ""}</div>
        `;
        bindHeader(); bindToolbar();
        return;
      }

      // Finished pool
      if (i >= total) {
        root.innerHTML = `
          ${renderHeader()}
          ${renderToolbar()}
          <div class="qprog">${seenInPool} / ${total}</div>
          <div class="progress ok"><div class="bar" style="width:${pct}%"></div></div>
          <div class="score-card">
            <div>
              <h2 style="margin:0;">รีวิวจบแล้ว!</h2>
              <p class="subtle">${escapeHtml(chunkLabel(deck))}</p>
            </div>
            <div class="score-num">✓</div>
          </div>
          <div class="btn-row">
            <button class="btn primary" id="restart">เริ่มชุดย่อยนี้ใหม่</button>
            <button class="btn ghost" id="back2">กลับสู่ชุดคำ</button>
          </div>
        `;
        bindHeader(); bindToolbar();
        root.querySelector("#restart").addEventListener("click", () => {
          // Clear seen for words in current pool only — keep other chunks' progress
          const ids = pool.map((w) => w.id);
          const cur = FS().getDeck(deck.id);
          cur.progress.cards.seenIds = cur.progress.cards.seenIds.filter((id) => !ids.includes(id));
          // direct save via storage's setFromCloud-style write
          const fullState = FS().load();
          const d = fullState.decks.find((x) => x.id === deck.id);
          if (d) {
            d.progress.cards.seenIds = d.progress.cards.seenIds.filter((id) => !ids.includes(id));
            FS().save(fullState);
          }
          pool = buildPool(); i = 0; flipped = false; draw();
        });
        root.querySelector("#back2").addEventListener("click", goBack);
        return;
      }

      const w = pool[i];
      const shownText = flipped ? backOf(w) : frontOf(w);

      root.innerHTML = `
        ${renderHeader()}
        ${renderToolbar()}
        <div class="qprog">${i + 1} / ${total} · เห็นแล้ว ${seenInPool}</div>
        <div class="progress"><div class="bar" style="width:${pct}%"></div></div>

        <div class="fc-flashcard ${flipped ? "is-flipped" : ""}" id="card" tabindex="0">
          <div class="fc-flashcard-inner">
            <div class="fc-flashcard-face fc-face-front">
              <div class="fc-flashcard-text">${escapeHtml(shownText)}</div>
              <div class="fc-flashcard-hint">${flipped ? "ด้านหลัง — แตะเพื่อพลิก" : "ด้านหน้า — แตะเพื่อพลิก"}</div>
            </div>
          </div>
        </div>

        <div class="btn-row" style="justify-content:space-between;">
          <button class="btn" id="prev" ${i === 0 ? "disabled" : ""}>← ก่อนหน้า</button>
          <div class="btn-row" style="margin:0;">
            <button class="star ${w.starred ? "on" : ""}" id="starBtn" title="ติดดาว">★</button>
            <button class="btn" id="speakBtn" title="ออกเสียง">🔊</button>
            <button class="btn" id="flipBtn">พลิก</button>
          </div>
          <button class="btn primary" id="next">${i === total - 1 ? "จบ" : "ถัดไป →"}</button>
        </div>
      `;

      bindHeader(); bindToolbar();
      root.querySelector("#card").addEventListener("click", () => { flipped = !flipped; draw(); });
      root.querySelector("#flipBtn").addEventListener("click", (e) => { e.stopPropagation(); flipped = !flipped; draw(); });
      root.querySelector("#prev").addEventListener("click", () => { if (i > 0) { i--; flipped = false; draw(); } });
      root.querySelector("#next").addEventListener("click", () => {
        FS().markCardSeen(deck.id, w.id);
        i++; flipped = false; draw();
      });
      root.querySelector("#starBtn").addEventListener("click", () => {
        FS().toggleStar(deck.id, w.id);
        w.starred = !w.starred;
        draw();
      });
      root.querySelector("#speakBtn").addEventListener("click", () => speak(shownText));
    }

    function goBack() {
      window.speechSynthesis && window.speechSynthesis.cancel();
      state.screen = "deck"; refresh(root);
    }

    draw();
    return root;
  }

  /* ===================== LEARN MODE (4-choice) ===================== */
  function renderLearn() {
    const deck = FS().getDeck(state.deckId);
    if (!deck) { state.screen = "home"; return renderHome(); }

    const root = document.createElement("div");

    function frontOf(w) { return state.learnOpts.swap ? w.back : w.front; }
    function backOf(w)  { return state.learnOpts.swap ? w.front : w.back; }

    function buildPool() {
      let pool = FS().chunkWords(FS().getDeck(deck.id));
      if (state.learnOpts.starredOnly) pool = pool.filter((w) => w.starred);
      return pool;
    }
    function completedSet() {
      return new Set(FS().getDeck(deck.id).progress.learn.completedIds || []);
    }
    function buildQueue() {
      const pool = buildPool();
      const done = completedSet();
      return shuffleArr(pool.filter((w) => !done.has(w.id)));
    }
    let pool = buildPool();
    let queue = buildQueue();
    let cur = null;
    let answeredThis = false;

    function pickNext() {
      cur = queue.shift() || null;
      answeredThis = false;
    }
    pickNext();

    function makeChoices(word) {
      const all = FS().getDeck(deck.id).words.filter((w) => w.id !== word.id);
      const distractors = shuffleArr(all).slice(0, 3);
      return shuffleArr([word, ...distractors]).map((w) => ({
        text: backOf(w),
        correct: w.id === word.id
      }));
    }

    function renderToolbar() {
      return `
        <div class="fc-toolbar fc-toolbar-sticky">
          <label class="fc-toggle"><input type="checkbox" data-opt="swap" ${state.learnOpts.swap ? "checked" : ""}/> สลับด้าน</label>
          <label class="fc-toggle"><input type="checkbox" data-opt="starredOnly" ${state.learnOpts.starredOnly ? "checked" : ""}/> ดาวเท่านั้น</label>
        </div>
      `;
    }
    function bindToolbar() {
      root.querySelectorAll(".fc-toolbar input[data-opt]").forEach((cb) => {
        cb.addEventListener("change", () => {
          const opt = cb.dataset.opt;
          state.learnOpts[opt] = cb.checked;
          pool = buildPool();
          queue = buildQueue();
          pickNext();
          draw();
        });
      });
    }
    function renderHeader() {
      return `
        <div class="qmeta">
          <h2 style="margin:0;">🎯 ${escapeHtml(deck.name)}</h2>
          <button class="btn ghost" id="back">← กลับ</button>
        </div>
        <p class="subtle">${escapeHtml(chunkLabel(deck))}</p>
      `;
    }
    function bindHeader() { root.querySelector("#back").addEventListener("click", goBack); }

    function draw() {
      const dk = FS().getDeck(deck.id);
      const total = pool.length;
      const done = completedSet();
      const doneInPool = pool.filter((w) => done.has(w.id)).length;
      const pct = total ? Math.round((doneInPool / total) * 100) : 0;
      const attempts = dk.progress.learn.attempts;
      const correct = dk.progress.learn.correct;

      // Not enough words
      if (total < 4) {
        root.innerHTML = `
          ${renderHeader()}
          ${renderToolbar()}
          <div class="empty">ต้องมีอย่างน้อย 4 คำในชุดย่อย${state.learnOpts.starredOnly ? " (ลองปิด \"ดาวเท่านั้น\")" : ""}</div>
        `;
        bindHeader(); bindToolbar(); return;
      }
      // Finished
      if (!cur) {
        root.innerHTML = `
          ${renderHeader()}
          ${renderToolbar()}
          <div class="qprog">${doneInPool} / ${total} · ตอบไป ${attempts} ครั้ง · ถูก ${correct}</div>
          <div class="progress ok"><div class="bar" style="width:${pct}%"></div></div>
          <div class="score-card">
            <div>
              <h2 style="margin:0;">เรียนจบแล้ว!</h2>
              <p class="subtle">${escapeHtml(chunkLabel(deck))}</p>
            </div>
            <div class="score-num">${doneInPool} / ${total}</div>
          </div>
          <div class="btn-row">
            <button class="btn primary" id="restart">เริ่มชุดย่อยนี้ใหม่</button>
            <button class="btn ghost" id="back2">กลับสู่ชุดคำ</button>
          </div>
        `;
        bindHeader(); bindToolbar();
        root.querySelector("#restart").addEventListener("click", () => {
          // Clear completed for words in current pool only
          const ids = pool.map((w) => w.id);
          const fullState = FS().load();
          const d = fullState.decks.find((x) => x.id === deck.id);
          if (d) {
            d.progress.learn.completedIds = d.progress.learn.completedIds.filter((id) => !ids.includes(id));
            FS().save(fullState);
          }
          queue = buildQueue(); pickNext(); draw();
        });
        root.querySelector("#back2").addEventListener("click", goBack);
        return;
      }

      const choices = makeChoices(cur);
      root.innerHTML = `
        ${renderHeader()}
        ${renderToolbar()}
        <div class="qprog">${doneInPool} / ${total} · ตอบไป ${attempts} ครั้ง · ถูก ${correct}</div>
        <div class="progress"><div class="bar" style="width:${pct}%"></div></div>

        <div class="card">
          <div class="fc-learn-prompt">
            <div class="fc-learn-q">${escapeHtml(frontOf(cur))}</div>
            <button class="btn ghost fc-speak" id="speakBtn" title="ออกเสียง">🔊</button>
          </div>
          <div id="choices">
            ${choices.map((c, idx) => `
              <button class="choice" data-i="${idx}" data-correct="${c.correct ? 1 : 0}">${escapeHtml(c.text)}</button>
            `).join("")}
          </div>
          <div id="fb"></div>
          <div class="btn-row" style="justify-content:flex-end;">
            <button class="btn primary" id="next" style="display:none;">ถัดไป →</button>
          </div>
        </div>
      `;

      bindHeader(); bindToolbar();
      root.querySelector("#speakBtn").addEventListener("click", () => speak(frontOf(cur)));

      const choiceBtns = root.querySelectorAll(".choice");
      choiceBtns.forEach((btn) => {
        btn.addEventListener("click", () => {
          if (answeredThis) return;
          answeredThis = true;
          const wasCorrect = btn.dataset.correct === "1";
          choiceBtns.forEach((b) => {
            b.classList.add("disabled");
            if (b.dataset.correct === "1") b.classList.add("correct");
            else if (b === btn) b.classList.add("wrong");
          });
          const fb = root.querySelector("#fb");
          FS().recordLearnAttempt(deck.id, cur.id, wasCorrect);
          if (wasCorrect) {
            fb.innerHTML = `<div class="feedback ok"><strong>ถูกต้อง ✓</strong></div>`;
          } else {
            fb.innerHTML = `<div class="feedback bad"><strong>ยังไม่ถูก ✗</strong>
              <div style="margin-top:4px;">เฉลย: ${escapeHtml(backOf(cur))}</div></div>`;
            queue.push(cur); // retry later
          }
          root.querySelector("#next").style.display = "inline-block";
        });
      });
      root.querySelector("#next").addEventListener("click", () => { pickNext(); draw(); });
    }

    function goBack() {
      window.speechSynthesis && window.speechSynthesis.cancel();
      state.screen = "deck"; refresh(root);
    }

    draw();
    return root;
  }

  return { render };
})();
