/**
 * Flashcards view — Quizlet-style deck browser + Flash Cards + Learn modes.
 *
 * Sub-screens (kept in `screen`):
 *   - "home":  folder + deck browser
 *   - "deck":  word list for a deck (add/import/edit/star)
 *   - "cards": flash-card review for a deck
 *   - "learn": 4-choice quiz for a deck
 */
window.FlashcardsView = (function () {
  const FS = () => window.FlashcardsStorage;

  const state = {
    screen: "home",
    folderId: null,         // null = root / “ทั้งหมด”
    deckId: null,
    // mode options (per-deck, transient)
    cardsOpts: { shuffle: false, swap: false, starredOnly: false },
    learnOpts: { swap: false, starredOnly: false }
  };

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

    // Folders grid (only at root)
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

    // Decks grid
    if (visibleDecks.length) {
      const decks = document.createElement("div");
      decks.className = "unit-list";
      decks.style.marginTop = (state.folderId ? "0" : "14px");
      visibleDecks.forEach((d) => {
        const starred = d.words.filter((w) => w.starred).length;
        const card = document.createElement("div");
        card.className = "card unit-card";
        card.innerHTML = `
          <div class="badge">📚 ${d.words.length} คำ${starred ? ` · ⭐ ${starred}` : ""}</div>
          <h3>${escapeHtml(d.name)}</h3>
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
    root.innerHTML = `
      <div class="qmeta">
        <h2 style="margin:0;">${escapeHtml(deck.name)}</h2>
        <button class="btn ghost" id="backHome">← กลับ</button>
      </div>
      <p class="subtle">${deck.words.length} คำ · ⭐ ${deck.words.filter((w) => w.starred).length}</p>

      <div class="card">
        <div class="btn-row" style="margin:0;">
          <button class="btn primary" id="goCards">📇 Flash Cards</button>
          <button class="btn primary" id="goLearn">🎯 Learn</button>
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
        <h3 style="margin-top:0;">คำศัพท์ในชุดนี้</h3>
        <div id="wordList"></div>
      </div>
    `;

    function drawList() {
      const list = root.querySelector("#wordList");
      const d = FS().getDeck(deck.id);
      if (!d.words.length) {
        list.innerHTML = `<div class="empty">ยังไม่มีคำในชุดนี้</div>`;
        return;
      }
      list.innerHTML = d.words.map((w) => `
        <div class="fc-word" data-id="${w.id}">
          <button class="star ${w.starred ? "on" : ""}" data-star title="ติดดาว">★</button>
          <div class="fc-word-text">
            <div class="fc-front">${escapeHtml(w.front)}</div>
            <div class="fc-back">${escapeHtml(w.back)}</div>
          </div>
          <div class="fc-word-actions">
            <button class="btn ghost" data-edit>แก้ไข</button>
            <button class="btn ghost" data-del>ลบ</button>
          </div>
        </div>
      `).join("");

      list.querySelectorAll("[data-star]").forEach((btn) => {
        btn.addEventListener("click", () => {
          const wid = btn.closest(".fc-word").dataset.id;
          FS().toggleStar(deck.id, wid);
          drawList();
        });
      });
      list.querySelectorAll("[data-del]").forEach((btn) => {
        btn.addEventListener("click", () => {
          const wid = btn.closest(".fc-word").dataset.id;
          if (confirm("ลบคำนี้?")) { FS().deleteWord(deck.id, wid); drawList(); }
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
          drawList();
        });
      });
    }
    drawList();

    root.querySelector("#backHome").addEventListener("click", () => {
      state.screen = "home"; state.deckId = null; refresh(root);
    });
    root.querySelector("#goCards").addEventListener("click", () => {
      if (!FS().getDeck(deck.id).words.length) return alert("ยังไม่มีคำในชุดนี้");
      state.screen = "cards"; refresh(root);
    });
    root.querySelector("#goLearn").addEventListener("click", () => {
      const d = FS().getDeck(deck.id);
      if (d.words.length < 4) return alert("ต้องมีอย่างน้อย 4 คำเพื่อใช้โหมด Learn");
      state.screen = "learn"; refresh(root);
    });
    root.querySelector("#addBtn").addEventListener("click", () => {
      const f = root.querySelector("#newFront");
      const b = root.querySelector("#newBack");
      if (!f.value.trim() && !b.value.trim()) return;
      FS().addWord(deck.id, f.value, b.value);
      f.value = ""; b.value = ""; f.focus();
      drawList();
      // also refresh meta line
      const meta = root.querySelector("p.subtle");
      const d = FS().getDeck(deck.id);
      meta.textContent = `${d.words.length} คำ · ⭐ ${d.words.filter((w) => w.starred).length}`;
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
        input.value = ""; // allow re-selecting the same file
        alert(`นำเข้าแล้ว ${res.added} คำ`);
        refresh(root);
      };
      reader.readAsText(file, "utf-8");
    });

    return root;
  }

  /* ===================== FLASH CARDS MODE ===================== */
  function renderCards() {
    const deck = FS().getDeck(state.deckId);
    if (!deck) { state.screen = "home"; return renderHome(); }

    const root = document.createElement("div");

    function startList() {
      let pool = state.cardsOpts.starredOnly ? deck.words.filter((w) => w.starred) : deck.words.slice();
      if (state.cardsOpts.shuffle) pool = shuffleArr(pool);
      return pool;
    }
    let cards = startList();
    let i = 0;
    let flipped = false;

    function frontOf(w) { return state.cardsOpts.swap ? w.back : w.front; }
    function backOf(w)  { return state.cardsOpts.swap ? w.front : w.back; }

    function draw() {
      const total = cards.length;

      if (!total) {
        root.innerHTML = `
          <div class="qmeta">
            <h2 style="margin:0;">📇 ${escapeHtml(deck.name)}</h2>
            <button class="btn ghost" id="back">← กลับ</button>
          </div>
          <div class="empty">ไม่มีคำให้รีวิว (ลองปิด "ดาวเท่านั้น")</div>
        `;
        root.querySelector("#back").addEventListener("click", goBack);
        return;
      }

      if (i >= total) {
        root.innerHTML = `
          <div class="score-card">
            <div>
              <h2 style="margin:0;">รีวิวจบแล้ว!</h2>
              <p class="subtle">${escapeHtml(deck.name)} · ${total} คำ</p>
            </div>
            <div class="score-num">✓</div>
          </div>
          <div class="btn-row">
            <button class="btn primary" id="restart">เริ่มใหม่</button>
            <button class="btn ghost" id="back">กลับสู่ชุดคำ</button>
          </div>
        `;
        root.querySelector("#restart").addEventListener("click", () => {
          cards = startList(); i = 0; flipped = false; draw();
        });
        root.querySelector("#back").addEventListener("click", goBack);
        return;
      }

      const w = cards[i];
      const pct = Math.round(((i) / total) * 100);
      const shownText = flipped ? backOf(w) : frontOf(w);

      root.innerHTML = `
        <div class="qmeta">
          <h2 style="margin:0;">📇 ${escapeHtml(deck.name)}</h2>
          <button class="btn ghost" id="back">← กลับ</button>
        </div>

        <div class="fc-toolbar">
          <label class="fc-toggle"><input type="checkbox" id="optShuffle" ${state.cardsOpts.shuffle ? "checked" : ""}/> สลับลำดับ</label>
          <label class="fc-toggle"><input type="checkbox" id="optSwap" ${state.cardsOpts.swap ? "checked" : ""}/> สลับด้าน</label>
          <label class="fc-toggle"><input type="checkbox" id="optStar" ${state.cardsOpts.starredOnly ? "checked" : ""}/> ดาวเท่านั้น</label>
        </div>

        <div class="qprog">${i + 1} / ${total}</div>
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

      root.querySelector("#back").addEventListener("click", goBack);
      root.querySelector("#card").addEventListener("click", () => { flipped = !flipped; draw(); });
      root.querySelector("#flipBtn").addEventListener("click", (e) => { e.stopPropagation(); flipped = !flipped; draw(); });
      root.querySelector("#prev").addEventListener("click", () => { if (i > 0) { i--; flipped = false; draw(); } });
      root.querySelector("#next").addEventListener("click", () => { i++; flipped = false; draw(); });
      root.querySelector("#starBtn").addEventListener("click", () => {
        FS().toggleStar(deck.id, w.id);
        w.starred = !w.starred;
        draw();
      });
      root.querySelector("#speakBtn").addEventListener("click", () => {
        speak(shownText);
      });
      root.querySelector("#optShuffle").addEventListener("change", (e) => {
        state.cardsOpts.shuffle = e.target.checked;
        cards = startList(); i = 0; flipped = false; draw();
      });
      root.querySelector("#optSwap").addEventListener("change", (e) => {
        state.cardsOpts.swap = e.target.checked;
        flipped = false; draw();
      });
      root.querySelector("#optStar").addEventListener("change", (e) => {
        state.cardsOpts.starredOnly = e.target.checked;
        cards = startList(); i = 0; flipped = false; draw();
      });
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

    function startQueue() {
      let pool = state.learnOpts.starredOnly ? deck.words.filter((w) => w.starred) : deck.words.slice();
      if (pool.length < 4) return [];
      return shuffleArr(pool);
    }
    let queue = startQueue();
    let completed = new Set(); // ids answered correctly (progress)
    let correct = 0;
    let attempts = 0;          // total attempts including retries
    let total = queue.length;
    let cur = null;            // current word
    let answeredThis = false;

    function pickNext() {
      cur = queue.shift() || null;
      answeredThis = false;
    }
    pickNext();

    function makeChoices(word) {
      const all = deck.words.filter((w) => w.id !== word.id);
      const distractors = shuffleArr(all).slice(0, 3);
      const choices = shuffleArr([word, ...distractors]).map((w) => ({
        text: backOf(w),
        correct: w.id === word.id
      }));
      return choices;
    }

    function draw() {
      if (!total) {
        root.innerHTML = `
          <div class="qmeta">
            <h2 style="margin:0;">🎯 ${escapeHtml(deck.name)}</h2>
            <button class="btn ghost" id="back">← กลับ</button>
          </div>
          <div class="empty">ต้องมีอย่างน้อย 4 คำเพื่อใช้โหมดนี้ (ลองปิด "ดาวเท่านั้น")</div>
        `;
        root.querySelector("#back").addEventListener("click", goBack);
        return;
      }
      if (!cur) {
        root.innerHTML = `
          <div class="score-card">
            <div>
              <h2 style="margin:0;">เรียนจบแล้ว!</h2>
              <p class="subtle">${escapeHtml(deck.name)}</p>
            </div>
            <div class="score-num">${correct} / ${total}</div>
          </div>
          <div class="btn-row">
            <button class="btn primary" id="restart">เริ่มใหม่</button>
            <button class="btn ghost" id="back">กลับสู่ชุดคำ</button>
          </div>
        `;
        root.querySelector("#restart").addEventListener("click", () => {
          queue = startQueue(); total = queue.length;
          completed = new Set(); correct = 0; attempts = 0;
          pickNext(); draw();
        });
        root.querySelector("#back").addEventListener("click", goBack);
        return;
      }

      const pct = total ? Math.round((completed.size / total) * 100) : 0;
      const choices = makeChoices(cur);

      root.innerHTML = `
        <div class="qmeta">
          <h2 style="margin:0;">🎯 ${escapeHtml(deck.name)}</h2>
          <button class="btn ghost" id="back">← กลับ</button>
        </div>

        <div class="fc-toolbar">
          <label class="fc-toggle"><input type="checkbox" id="optSwap" ${state.learnOpts.swap ? "checked" : ""}/> สลับด้าน</label>
          <label class="fc-toggle"><input type="checkbox" id="optStar" ${state.learnOpts.starredOnly ? "checked" : ""}/> ดาวเท่านั้น</label>
        </div>

        <div class="qprog">${completed.size} / ${total} · ตอบไป ${attempts} ครั้ง · ถูก ${correct}</div>
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

      root.querySelector("#back").addEventListener("click", goBack);
      root.querySelector("#speakBtn").addEventListener("click", () => speak(frontOf(cur)));
      root.querySelector("#optSwap").addEventListener("change", (e) => {
        state.learnOpts.swap = e.target.checked;
        queue = startQueue(); total = queue.length;
        completed = new Set(); correct = 0; attempts = 0;
        pickNext(); draw();
      });
      root.querySelector("#optStar").addEventListener("change", (e) => {
        state.learnOpts.starredOnly = e.target.checked;
        queue = startQueue(); total = queue.length;
        completed = new Set(); correct = 0; attempts = 0;
        pickNext(); draw();
      });

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
          attempts++;
          if (wasCorrect) {
            correct++;
            completed.add(cur.id);
            fb.innerHTML = `<div class="feedback ok"><strong>ถูกต้อง ✓</strong></div>`;
          } else {
            fb.innerHTML = `<div class="feedback bad"><strong>ยังไม่ถูก ✗</strong>
              <div style="margin-top:4px;">เฉลย: ${escapeHtml(backOf(cur))}</div></div>`;
            // wrong → push back in queue for retry
            queue.push(cur);
          }
          root.querySelector("#next").style.display = "inline-block";
        });
      });
      root.querySelector("#next").addEventListener("click", () => {
        pickNext(); draw();
      });
    }

    function goBack() {
      window.speechSynthesis && window.speechSynthesis.cancel();
      state.screen = "deck"; refresh(root);
    }

    draw();
    return root;
  }

  /* ===================== public ===================== */
  return { render };
})();
