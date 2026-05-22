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
    cardsOpts: { shuffle: false, swap: false, starredOnly: false, autoSpeak: false },
    learnOpts: { swap: false, starredOnly: false, autoSpeak: false }
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
  // For Japanese entries formatted like "会う(あう)" or "明日(あした, あす)",
  // pull only what's inside the parentheses — that's the reading we want
  // the TTS voice to pronounce. First reading wins when several are listed.
  function readingFor(text) {
    const s = String(text || "");
    const m = s.match(/[(（]([^()（）]+)[)）]/);
    if (!m) return s;
    const inside = m[1].split(/[,、，;；/]/)[0].trim();
    return inside || s;
  }
  function speak(text, lang) {
    if (!("speechSynthesis" in window)) return;
    try {
      window.speechSynthesis.cancel();
      const spoken = hasJapanese(text) ? readingFor(text) : String(text || "");
      const u = new SpeechSynthesisUtterance(spoken);
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
    const indices = FS().selectedChunkIndices(deck);
    const wordCount = FS().chunkWords(deck).length;
    if (indices.length === 1) {
      const r = FS().chunkRange(deck);
      return `ชุด ${indices[0] + 1}/${total} (คำ ${r.from}-${r.to})`;
    }
    const labels = indices.map((i) => i + 1).join(", ");
    return `ชุด ${labels} (รวม ${wordCount} คำ จาก ${total} ชุด)`;
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

  /* ---------- streak panel ---------- */
  function renderStreakPanel() {
    const wrap = document.createElement("section");
    wrap.className = "card streak-card";

    // Local view state — persists across navigation clicks within this panel.
    // mode "month" shows the focused month at full size; mode "year" shows
    // a 12-tile overview that's clickable to drill back into a month.
    // selectedDay holds a YYYY-MM-DD when the user has tapped a day in
    // month view (drives the inline detail strip below the grid).
    const view = { mode: "month", y: null, m: null, selectedDay: null };

    const dowLabels = ["จ", "อ", "พ", "พฤ", "ศ", "ส", "อา"];
    const dowLong = ["จันทร์", "อังคาร", "พุธ", "พฤหัสบดี", "ศุกร์", "เสาร์", "อาทิตย์"];
    const monthLabels = [
      "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
      "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."
    ];
    function pad2(n) { return String(n).padStart(2, "0"); }

    function draw() {
      const FStr = window.FlashcardsStreak;
      if (!FStr) { wrap.innerHTML = ""; return; }
      const goal = FStr.getGoal();
      const today = FStr.getToday();
      const streak = FStr.getStreak();
      const pct = Math.min(100, Math.round((today / goal) * 100));

      const todayKey = FStr.thailandDate();
      const [tyS, tmS] = todayKey.split("-");
      const tY = parseInt(tyS, 10);
      const tM = parseInt(tmS, 10);

      // Default cursor → today's month/year. Clamp forward navigation
      // so the user can't peek past today (no data there).
      if (view.y == null) { view.y = tY; view.m = tM; }

      function lvl(c, met) {
        if (c === 0) return "l0";
        if (met) return "l4";
        const ratio = c / Math.max(goal, 1);
        if (ratio >= 0.66) return "l3";
        if (ratio >= 0.33) return "l2";
        return "l1";
      }

      // Track max within visible range only, so the header stat reflects
      // the currently shown period rather than all-time history.
      let max = 0;

      function renderMonth(y, m, compact) {
        const daysInMonth = new Date(y, m, 0).getDate();
        const firstDow = new Date(y, m - 1, 1).getDay();
        const padLeading = (firstDow + 6) % 7;
        const dowHtml = compact
          ? ""
          : dowLabels.map((l) => `<span class="hm-dow">${l}</span>`).join("");
        const padHtml = Array.from({ length: padLeading }, () => `<span class="hm-cell empty"></span>`).join("");
        let cellsHtml = "";
        for (let day = 1; day <= daysInMonth; day++) {
          const key = `${y}-${pad2(m)}-${pad2(day)}`;
          const count = FStr.getCount(key);
          if (count > max) max = count;
          const isFuture = key > todayKey;
          const isToday = key === todayKey;
          const isSelected = !compact && key === view.selectedDay;
          const met = !isFuture && count >= goal;
          const cls = isFuture ? "future" : lvl(count, met);
          const title = isFuture
            ? `${pad2(day)}/${pad2(m)}/${y}`
            : `${pad2(day)}/${pad2(m)}/${y} — ${count}/${goal} คำ${met ? " ✓" : ""}`;
          const dayLabel = compact ? "" : `<span class="hm-day">${day}</span>`;
          // In month view, cells are clickable to surface that day's detail.
          // In compact (year overview) cells defer to the tile's click handler.
          const dataAttr = compact ? "" : ` data-day="${key}"`;
          const clsList = ["hm-cell", cls];
          if (isToday) clsList.push("today");
          if (isSelected) clsList.push("selected");
          cellsHtml += `<span class="${clsList.join(" ")}" title="${title}"${dataAttr}>${dayLabel}</span>`;
        }
        const cls = "hm-month-grid" + (compact ? " compact" : "");
        return `<div class="${cls}">${dowHtml}${padHtml}${cellsHtml}</div>`;
      }

      // Inline detail strip below the month grid. Shows the selected day's
      // count + goal progress, or a hint to tap a day when none chosen.
      function renderDayDetail() {
        if (view.mode !== "month") return "";
        if (!view.selectedDay) {
          return `<div class="hm-day-detail subtle">แตะวันเพื่อดูจำนวนคำที่เรียน</div>`;
        }
        const key = view.selectedDay;
        const [yS, mS, dS] = key.split("-");
        const dObj = new Date(`${key}T00:00:00`);
        const dow = (dObj.getDay() + 6) % 7; // Monday=0..Sunday=6
        const count = FStr.getCount(key);
        const isFuture = key > todayKey;
        const isToday = key === todayKey;
        const dPct = isFuture ? 0 : Math.min(100, Math.round((count / Math.max(goal, 1)) * 100));
        const met = !isFuture && count >= goal;
        const status = isFuture
          ? `<span class="subtle">ยังมาไม่ถึง</span>`
          : met
            ? `<span class="hm-detail-ok">✓ ครบเป้า</span>`
            : count === 0
              ? `<span class="subtle">ยังไม่ได้เรียน</span>`
              : `<span class="subtle">${dPct}% ของเป้า</span>`;
        return `
          <div class="hm-day-detail">
            <div class="hm-detail-date">
              วัน${dowLong[dow]} ${parseInt(dS, 10)} ${monthLabels[parseInt(mS, 10) - 1]} ${yS}
              ${isToday ? `<span class="hm-detail-badge">วันนี้</span>` : ""}
            </div>
            <div class="hm-detail-count">
              <strong>${count}</strong> <span class="subtle">/ ${goal} คำ</span> · ${status}
            </div>
            ${!isFuture ? `<div class="progress hm-detail-bar"><div class="bar" style="width:${dPct}%"></div></div>` : ""}
          </div>
        `;
      }

      let calHtml = "";
      if (view.mode === "year") {
        const y = view.y;
        const atCurrentYear = y >= tY;
        const tiles = [];
        for (let m = 1; m <= 12; m++) {
          const isCurrentMonth = (y === tY && m === tM);
          const isFutureMonth = (y > tY) || (y === tY && m > tM);
          tiles.push(`
            <div class="hm-year-tile ${isCurrentMonth ? "is-current" : ""} ${isFutureMonth ? "is-future" : ""}" data-y="${y}" data-m="${m}" role="button" tabindex="0">
              <div class="hm-year-tile-title">${monthLabels[m - 1]}</div>
              ${renderMonth(y, m, true)}
            </div>
          `);
        }
        calHtml = `
          <div class="hm-nav">
            <button class="btn ghost hm-nav-btn" data-nav="prev" aria-label="ปีก่อน">‹</button>
            <div class="hm-nav-title">${y}</div>
            <button class="btn ghost hm-nav-btn" data-nav="next" ${atCurrentYear ? "disabled" : ""} aria-label="ปีถัดไป">›</button>
            <button class="btn ghost hm-mode-btn" data-mode="month" title="กลับมุมมองเดือน">📅 เดือน</button>
          </div>
          <div class="hm-year-grid">${tiles.join("")}</div>
        `;
      } else {
        const y = view.y, m = view.m;
        const atCurrent = (y === tY && m === tM);
        // Reset stale selection when the user navigates to a different month.
        if (view.selectedDay) {
          const [syS, smS] = view.selectedDay.split("-");
          if (parseInt(syS, 10) !== y || parseInt(smS, 10) !== m) {
            view.selectedDay = null;
          }
        }
        calHtml = `
          <div class="hm-nav">
            <button class="btn ghost hm-nav-btn" data-nav="prev" aria-label="เดือนก่อน">‹</button>
            <div class="hm-nav-title">${monthLabels[m - 1]} ${y}</div>
            <button class="btn ghost hm-nav-btn" data-nav="next" ${atCurrent ? "disabled" : ""} aria-label="เดือนถัดไป">›</button>
            <button class="btn ghost hm-mode-btn" data-mode="year" title="ดูภาพรวมทั้งปี">📊 ปี</button>
          </div>
          ${renderMonth(y, m, false)}
          ${renderDayDetail()}
        `;
      }

      wrap.innerHTML = `
        <div class="streak-head">
          <div class="streak-stat">
            <span class="streak-flame">${streak > 0 ? "🔥" : "·"}</span>
            <div>
              <div class="streak-num">${streak}</div>
              <div class="streak-sub">วันต่อเนื่อง</div>
            </div>
          </div>
          <div class="streak-stat">
            <div class="streak-today">
              <strong>${today}</strong> <span class="subtle">/ ${goal} คำวันนี้</span>
              <span class="hm-max subtle"> · สูงสุด ${max}/${view.mode === "year" ? "ปี" : "เดือน"}</span>
            </div>
            <div class="progress streak-progress"><div class="bar" style="width:${pct}%"></div></div>
          </div>
          <button class="btn ghost streak-goal-btn" id="streakGoalBtn" title="ตั้งเป้าหมายต่อวัน">⚙ ตั้งเป้า</button>
        </div>
        <div class="heatmap-cal" aria-label="ปฏิทินการเรียนบัตรคำ">${calHtml}</div>
      `;

      // Nav arrows (prev/next)
      wrap.querySelectorAll("[data-nav]").forEach((btn) => {
        btn.addEventListener("click", () => {
          if (btn.disabled) return;
          const dir = btn.dataset.nav === "next" ? 1 : -1;
          if (view.mode === "year") {
            const target = view.y + dir;
            if (target > tY) return;
            view.y = target;
          } else {
            let m = view.m + dir;
            let y = view.y;
            while (m > 12) { m -= 12; y++; }
            while (m < 1) { m += 12; y--; }
            if (y > tY || (y === tY && m > tM)) return;
            view.y = y; view.m = m;
          }
          draw();
        });
      });

      // Mode toggle (month ↔ year)
      wrap.querySelectorAll("[data-mode]").forEach((btn) => {
        btn.addEventListener("click", () => {
          view.mode = btn.dataset.mode;
          draw();
        });
      });

      // Day-cell click (month view) → toggle selection + show detail
      wrap.querySelectorAll(".hm-cell[data-day]").forEach((cell) => {
        cell.addEventListener("click", () => {
          const key = cell.dataset.day;
          view.selectedDay = (view.selectedDay === key) ? null : key;
          draw();
        });
      });

      // Year-tile click → drill into that month
      wrap.querySelectorAll(".hm-year-tile").forEach((tile) => {
        const open = () => {
          if (tile.classList.contains("is-future")) return;
          view.y = parseInt(tile.dataset.y, 10);
          view.m = parseInt(tile.dataset.m, 10);
          view.mode = "month";
          draw();
        };
        tile.addEventListener("click", open);
        tile.addEventListener("keydown", (e) => {
          if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(); }
        });
      });

      const goalBtn = wrap.querySelector("#streakGoalBtn");
      if (goalBtn) goalBtn.addEventListener("click", () => {
        const cur = FStr.getGoal();
        const v = prompt("ตั้งเป้าหมายจำนวนคำต่อวัน (1–500):", String(cur));
        if (v == null) return;
        const n = parseInt(v, 10);
        if (!Number.isFinite(n) || n < 1 || n > 500) {
          alert("กรุณาใส่ตัวเลขระหว่าง 1 ถึง 500");
          return;
        }
        FStr.setGoal(n);
        draw();
      });
    }
    draw();
    // Auto-refresh when streak changes elsewhere (e.g. cloud pull).
    if (window.FlashcardsStreak) {
      const unsub = window.FlashcardsStreak.subscribe(() => {
        if (wrap.isConnected) draw(); else unsub();
      });
    }
    return wrap;
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
      <div id="fc-streak-slot"></div>
      <div id="fc-body"></div>
    `;
    if (!state.folderId) {
      root.querySelector("#fc-streak-slot").appendChild(renderStreakPanel());
    }
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
      const cardsInFlight = (deck.progress.cards.queueIds || []).length + (deck.progress.cards.wrongIds || []).length;
      const learnInFlight = (deck.progress.learn.queueIds || []).length + (deck.progress.learn.wrongIds || []).length;
      const cardsAllSeen = (deck.progress.cards.seenIds || []).length;
      const learnAllDone = (deck.progress.learn.completedIds || []).length;
      const learnAttempts = deck.progress.learn.attempts || 0;
      const isChunked = !!deck.chunkSize;
      const resetCardsDisabled = seenInPool === 0 && cardsInFlight === 0;
      const resetCardsAllDisabled = cardsAllSeen === 0 && cardsInFlight === 0;
      const resetLearnDisabled = doneInPool === 0 && learnInFlight === 0;
      const resetLearnAllDisabled = learnAllDone === 0 && learnAttempts === 0 && learnInFlight === 0;

      const chunkOpts = [25, 50, 100].map((n) =>
        `<option value="${n}" ${deck.chunkSize === n ? "selected" : ""}>${n} คำ/ชุด</option>`
      ).join("");
      const selectedSet = new Set(FS().selectedChunkIndices(deck));
      const seenSet = new Set(deck.progress.cards.seenIds || []);
      const doneSet = new Set(deck.progress.learn.completedIds || []);
      const chunkChips = deck.chunkSize ? Array.from({ length: chunkTotal }, (_, i) => {
        const from = i * deck.chunkSize + 1;
        const to = Math.min(total, (i + 1) * deck.chunkSize);
        const chunkWords = deck.words.slice(i * deck.chunkSize, (i + 1) * deck.chunkSize);
        const cardsSeen = chunkWords.filter((w) => seenSet.has(w.id)).length;
        const learnDone = chunkWords.filter((w) => doneSet.has(w.id)).length;
        const cardsFinished = chunkWords.length > 0 && cardsSeen === chunkWords.length;
        const learnFinished = chunkWords.length > 0 && learnDone === chunkWords.length;
        const on = selectedSet.has(i);
        const allDone = cardsFinished && learnFinished;
        const statusBadges = [
          `<span class="fc-chunk-stat ${cardsFinished ? "done" : ""}" title="Flash Cards: ${cardsSeen}/${chunkWords.length}">📇${cardsFinished ? "✓" : ""}</span>`,
          `<span class="fc-chunk-stat ${learnFinished ? "done" : ""}" title="Learn: ${learnDone}/${chunkWords.length}">🎯${learnFinished ? "✓" : ""}</span>`
        ].join("");
        return `<button class="fc-chunk-chip ${on ? "is-on" : ""} ${allDone ? "all-done" : ""}" data-chunk="${i}" aria-pressed="${on}">
          <span class="fc-chunk-title">ชุด ${i + 1}</span>
          <span class="fc-chunk-range">${from}-${to}</span>
          <span class="fc-chunk-status">${statusBadges}</span>
        </button>`;
      }).join("") : "";

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
          </div>
          ${deck.chunkSize ? `
            <p class="subtle" style="margin:12px 0 4px;">เลือกชุดย่อยที่จะทบทวน (เลือกหลายชุดได้)</p>
            <div class="fc-chunk-grid" id="chunkGrid">${chunkChips}</div>
            <div class="fc-chunk-actions">
              <button class="btn ghost" id="chunkAll">เลือกทั้งหมด</button>
              <button class="btn ghost" id="chunkInvert">สลับ</button>
              <button class="btn ghost" id="chunkClear">ล้าง (เลือกเฉพาะชุด 1)</button>
            </div>
          ` : ""}
          <p class="subtle" style="margin:10px 0 0;">ใช้กับ ${escapeHtml(chunkLabel(deck))}</p>
        </div>

        <div class="card">
          <div class="fc-mode-row">
            <div class="fc-mode-meta">
              <div class="fc-mode-title">📇 Flash Cards</div>
              <div class="qprog">${seenInPool} / ${poolSize}</div>
              <div class="progress"><div class="bar" style="width:${pctC}%"></div></div>
            </div>
            <div class="btn-row" style="margin:0;">
              <button class="btn primary" id="goCards">${cardsInFlight > 0 || (seenInPool > 0 && seenInPool < poolSize) ? "ทำต่อ" : "เริ่ม"}</button>
              <button class="btn ghost" id="resetCards" ${resetCardsDisabled ? "disabled" : ""}>${isChunked ? "รีเซ็ตชุดย่อย" : "รีเซ็ต"}</button>
              ${isChunked ? `<button class="btn ghost" id="resetCardsAll" ${resetCardsAllDisabled ? "disabled" : ""}>รีเซ็ตทั้งหมด</button>` : ""}
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
              <button class="btn primary" id="goLearn">${learnInFlight > 0 || (doneInPool > 0 && doneInPool < poolSize) ? "ทำต่อ" : "เริ่ม"}</button>
              <button class="btn ghost" id="resetLearn" ${resetLearnDisabled ? "disabled" : ""}>${isChunked ? "รีเซ็ตชุดย่อย" : "รีเซ็ต"}</button>
              ${isChunked ? `<button class="btn ghost" id="resetLearnAll" ${resetLearnAllDisabled ? "disabled" : ""}>รีเซ็ตทั้งหมด</button>` : ""}
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
      const grid = root.querySelector("#chunkGrid");
      if (grid) {
        grid.querySelectorAll(".fc-chunk-chip").forEach((chip) => {
          chip.addEventListener("click", () => {
            const idx = Number(chip.dataset.chunk);
            const current = new Set(FS().selectedChunkIndices(FS().getDeck(deck.id)));
            if (current.has(idx)) {
              if (current.size === 1) return; // keep at least one selected
              current.delete(idx);
            } else {
              current.add(idx);
            }
            FS().setSelectedChunks(deck.id, Array.from(current));
            draw();
          });
        });
        const allBtn = root.querySelector("#chunkAll");
        if (allBtn) allBtn.addEventListener("click", () => {
          const total = FS().chunkCount(FS().getDeck(deck.id));
          FS().setSelectedChunks(deck.id, Array.from({ length: total }, (_, i) => i));
          draw();
        });
        const invertBtn = root.querySelector("#chunkInvert");
        if (invertBtn) invertBtn.addEventListener("click", () => {
          const dk = FS().getDeck(deck.id);
          const total = FS().chunkCount(dk);
          const cur = new Set(FS().selectedChunkIndices(dk));
          const next = [];
          for (let i = 0; i < total; i++) if (!cur.has(i)) next.push(i);
          FS().setSelectedChunks(deck.id, next.length ? next : [0]);
          draw();
        });
        const clearBtn = root.querySelector("#chunkClear");
        if (clearBtn) clearBtn.addEventListener("click", () => {
          FS().setSelectedChunks(deck.id, [0]);
          draw();
        });
      }

      root.querySelector("#goCards").addEventListener("click", () => {
        if (!poolWords().length) return alert("ยังไม่มีคำในชุดย่อยนี้");
        state.screen = "cards"; refresh(root);
      });
      root.querySelector("#resetCards").addEventListener("click", () => {
        const dk = FS().getDeck(deck.id);
        const scoped = !!dk.chunkSize;
        const msg = scoped
          ? "รีเซ็ตความคืบหน้า Flash Cards เฉพาะชุดย่อยที่เลือก?"
          : "รีเซ็ตความคืบหน้า Flash Cards ของชุดคำนี้?";
        if (confirm(msg)) {
          const ids = FS().chunkWords(dk).map((w) => w.id);
          FS().clearProgressForWords(deck.id, "cards", ids);
          draw();
        }
      });
      const resetCardsAllBtn = root.querySelector("#resetCardsAll");
      if (resetCardsAllBtn) resetCardsAllBtn.addEventListener("click", () => {
        if (confirm("รีเซ็ตความคืบหน้า Flash Cards ของชุดคำนี้ทั้งหมด (ทุกชุดย่อย)?")) {
          FS().clearProgress(deck.id, "cards"); draw();
        }
      });
      root.querySelector("#goLearn").addEventListener("click", () => {
        if (poolWords().length < 4) return alert("ต้องมีอย่างน้อย 4 คำในชุดย่อยเพื่อใช้โหมด Learn");
        state.screen = "learn"; refresh(root);
      });
      root.querySelector("#resetLearn").addEventListener("click", () => {
        const dk = FS().getDeck(deck.id);
        const scoped = !!dk.chunkSize;
        const msg = scoped
          ? "รีเซ็ตความคืบหน้า Learn เฉพาะชุดย่อยที่เลือก?"
          : "รีเซ็ตความคืบหน้า Learn ของชุดคำนี้?";
        if (confirm(msg)) {
          const ids = FS().chunkWords(dk).map((w) => w.id);
          FS().clearProgressForWords(deck.id, "learn", ids);
          draw();
        }
      });
      const resetLearnAllBtn = root.querySelector("#resetLearnAll");
      if (resetLearnAllBtn) resetLearnAllBtn.addEventListener("click", () => {
        if (confirm("รีเซ็ตความคืบหน้า Learn ของชุดคำนี้ทั้งหมด (ทุกชุดย่อย รวมตัวนับด้วย)?")) {
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

  /* ===================== FLASH CARDS MODE =====================
   * Round-based study with swipe gestures (Tinder-style).
   * Queue state (queueIds + wrongIds + roundTotal) is persisted to
   * storage so leaving mid-round and re-entering resumes exactly
   * where the user left off — including the "to retry" pile.
   *   - swipe right / "ผ่าน"      → markCardSeen, shift from queueIds
   *   - swipe left  / "ยังไม่ได้" → move from queueIds to wrongIds
   * When queueIds empties, wrongIds becomes the next round's queue.
   * Pool changes (chunk / starredOnly / shuffle) explicitly reset
   * the round; word deletions are reconciled on entry by filtering.
   */
  function renderCards() {
    const deck = FS().getDeck(state.deckId);
    if (!deck) { state.screen = "home"; return renderHome(); }

    const root = document.createElement("div");

    function buildPool() {
      let pool = FS().chunkWords(FS().getDeck(deck.id));
      if (state.cardsOpts.starredOnly) pool = pool.filter((w) => w.starred);
      return pool;
    }
    function poolIdSet() { return new Set(buildPool().map((w) => w.id)); }
    function wordById(wid) {
      const d = FS().getDeck(deck.id);
      return d.words.find((w) => w.id === wid) || null;
    }
    function unfinishedIds() {
      const seen = new Set((FS().getDeck(deck.id).progress.cards.seenIds) || []);
      return buildPool().filter((w) => !seen.has(w.id)).map((w) => w.id);
    }

    function loadRound() {
      const d = FS().getDeck(deck.id);
      const seen = new Set(d.progress.cards.seenIds || []);
      const poolIds = poolIdSet();
      let q = (d.progress.cards.queueIds || []).filter((id) => poolIds.has(id) && !seen.has(id));
      let w = (d.progress.cards.wrongIds || []).filter((id) => poolIds.has(id) && !seen.has(id));
      let total = d.progress.cards.roundTotal || 0;
      if (q.length === 0 && w.length === 0) {
        q = unfinishedIds();
        if (state.cardsOpts.shuffle) q = shuffleArr(q);
        total = q.length;
        FS().setCardsRound(deck.id, { queueIds: q, wrongIds: [], roundTotal: total });
      } else if (total < q.length + w.length) {
        total = q.length + w.length;
      }
      return { queueIds: q, wrongIds: w, roundTotal: total };
    }

    let { queueIds, wrongIds, roundTotal } = loadRound();
    let flipped = false;
    let animating = false;
    // In-memory undo stack — entries: { wid, action }. Lost on reload/back.
    const history = [];
    // Track last auto-spoken (wid + face) so re-renders (star toggle, etc.)
    // don't repeat speech for the same card+side.
    let lastSpokenKey = null;

    function maybeAutoSpeak(force) {
      if (!state.cardsOpts.autoSpeak) return;
      const wid = queueIds[0];
      if (!wid) return;
      const w = wordById(wid);
      if (!w) return;
      const text = flipped ? backOf(w) : frontOf(w);
      if (!hasJapanese(text)) return;
      const key = `${wid}:${flipped ? "b" : "f"}`;
      if (!force && key === lastSpokenKey) return;
      lastSpokenKey = key;
      speak(text, "ja-JP");
    }

    function frontOf(w) { return state.cardsOpts.swap ? w.back : w.front; }
    function backOf(w)  { return state.cardsOpts.swap ? w.front : w.back; }

    function persist() {
      FS().setCardsRound(deck.id, { queueIds, wrongIds, roundTotal });
    }

    function commit(action) {
      const wid = queueIds[0];
      if (!wid) { animating = false; return; }
      if (action === "known") FS().markCardSeen(deck.id, wid);
      else wrongIds.push(wid);
      queueIds.shift();
      history.push({ wid, action });
      flipped = false;
      animating = false;
      persist();
      draw();
    }

    function undo() {
      if (animating) return;
      const last = history.pop();
      if (!last) return;
      if (last.action === "known") {
        FS().unmarkCardSeen(deck.id, last.wid);
      } else {
        const idx = wrongIds.lastIndexOf(last.wid);
        if (idx >= 0) wrongIds.splice(idx, 1);
      }
      queueIds.unshift(last.wid);
      if (roundTotal < queueIds.length + wrongIds.length) {
        roundTotal = queueIds.length + wrongIds.length;
      }
      flipped = false;
      persist();
      draw();
    }

    function animateOut(dir, then) {
      if (animating) return;
      animating = true;
      const c = root.querySelector("#card");
      if (!c) { animating = false; then(); return; }
      c.style.pointerEvents = "none";
      c.style.transition = "transform .22s ease, opacity .22s ease";
      c.style.transform = `translateX(${dir > 0 ? "120%" : "-120%"}) rotate(${dir > 0 ? 16 : -16}deg)`;
      c.style.opacity = "0";
      setTimeout(() => then(), 200);
    }

    function resetRound() {
      queueIds = unfinishedIds();
      if (state.cardsOpts.shuffle) queueIds = shuffleArr(queueIds);
      wrongIds = [];
      roundTotal = queueIds.length;
      flipped = false;
      animating = false;
      history.length = 0;
      lastSpokenKey = null;
      persist();
      draw();
    }

    function startNextRound() {
      queueIds = state.cardsOpts.shuffle ? shuffleArr(wrongIds) : wrongIds.slice();
      wrongIds = [];
      roundTotal = queueIds.length;
      flipped = false;
      animating = false;
      history.length = 0;
      lastSpokenKey = null;
      persist();
      draw();
    }

    function renderToolbar() {
      return `
        <div class="fc-toolbar fc-toolbar-sticky">
          <label class="fc-toggle"><input type="checkbox" data-opt="shuffle" ${state.cardsOpts.shuffle ? "checked" : ""}/> สลับลำดับ</label>
          <label class="fc-toggle"><input type="checkbox" data-opt="swap" ${state.cardsOpts.swap ? "checked" : ""}/> สลับด้าน</label>
          <label class="fc-toggle"><input type="checkbox" data-opt="starredOnly" ${state.cardsOpts.starredOnly ? "checked" : ""}/> ดาวเท่านั้น</label>
          <label class="fc-toggle"><input type="checkbox" data-opt="autoSpeak" ${state.cardsOpts.autoSpeak ? "checked" : ""}/> 🔊 อ่านอัตโนมัติ</label>
        </div>
      `;
    }
    function bindToolbar() {
      root.querySelectorAll(".fc-toolbar input[data-opt]").forEach((cb) => {
        cb.addEventListener("change", () => {
          state.cardsOpts[cb.dataset.opt] = cb.checked;
          const opt = cb.dataset.opt;
          if (opt === "starredOnly" || opt === "shuffle") {
            resetRound();
          } else if (opt === "autoSpeak") {
            // Toggle only — no need to redraw or interrupt the current card.
            if (!cb.checked) {
              window.speechSynthesis && window.speechSynthesis.cancel();
            } else {
              maybeAutoSpeak(true);
            }
          } else {
            draw();
          }
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
    function bindHeader() { root.querySelector("#back").addEventListener("click", goBack); }

    function draw() {
      const pool = buildPool();
      const total = pool.length;
      const seen = new Set((FS().getDeck(deck.id).progress.cards.seenIds) || []);
      const seenInPool = pool.filter((w) => seen.has(w.id)).length;
      const overallPct = total ? Math.round((seenInPool / total) * 100) : 0;

      // Empty pool
      if (!total) {
        root.innerHTML = `
          ${renderHeader()}
          ${renderToolbar()}
          <div class="empty">ไม่มีคำในชุดย่อยนี้${state.cardsOpts.starredOnly ? " (ลองปิด \"ดาวเท่านั้น\")" : ""}</div>
        `;
        bindHeader(); bindToolbar();
        return;
      }

      // No cards left in this round
      if (queueIds.length === 0) {
        const allDone = wrongIds.length === 0;
        root.innerHTML = `
          ${renderHeader()}
          ${renderToolbar()}
          <div class="qprog">รวม ${seenInPool} / ${total}</div>
          <div class="progress ${allDone ? "ok" : ""}"><div class="bar" style="width:${overallPct}%"></div></div>
          <div class="score-card">
            <div>
              <h2 style="margin:0;">${allDone ? "เก่งมาก! ตอบได้ครบทุกคำแล้ว" : "จบรอบนี้แล้ว"}</h2>
              <p class="subtle">${allDone
                ? "ทบทวน " + total + " คำสำเร็จ"
                : "ยังต้องทบทวนอีก " + wrongIds.length + " คำ"}</p>
            </div>
            <div class="score-num">${allDone ? "✓" : wrongIds.length}</div>
          </div>
          <div class="btn-row">
            ${allDone
              ? `<button class="btn primary" id="restartAll">เริ่มชุดย่อยนี้ใหม่</button>`
              : `<button class="btn primary" id="nextRound">ทบทวนเฉพาะ ${wrongIds.length} คำที่เหลือ →</button>`}
            ${history.length ? `<button class="btn" id="undoEnd">↶ ย้อนกลับ</button>` : ""}
            <button class="btn ghost" id="back2">กลับสู่ชุดคำ</button>
          </div>
        `;
        bindHeader(); bindToolbar();
        const undoEndBtn = root.querySelector("#undoEnd");
        if (undoEndBtn) undoEndBtn.addEventListener("click", undo);
        if (!allDone) {
          root.querySelector("#nextRound").addEventListener("click", startNextRound);
        } else {
          root.querySelector("#restartAll").addEventListener("click", () => {
            const ids = pool.map((w) => w.id);
            const fullState = FS().load();
            const d = fullState.decks.find((x) => x.id === deck.id);
            if (d) {
              d.progress.cards.seenIds = d.progress.cards.seenIds.filter((id) => !ids.includes(id));
              d.progress.cards.queueIds = [];
              d.progress.cards.wrongIds = [];
              d.progress.cards.roundTotal = 0;
              FS().save(fullState);
            }
            ({ queueIds, wrongIds, roundTotal } = loadRound());
            flipped = false;
            animating = false;
            draw();
          });
        }
        root.querySelector("#back2").addEventListener("click", goBack);
        return;
      }

      const w = wordById(queueIds[0]);
      if (!w) {
        // Word was deleted while away — drop it and redraw
        queueIds.shift();
        persist();
        return draw();
      }
      const shownText = flipped ? backOf(w) : frontOf(w);
      const roundDone = Math.max(0, roundTotal - queueIds.length);
      const roundPct = roundTotal ? Math.round((roundDone / roundTotal) * 100) : 0;

      root.innerHTML = `
        ${renderHeader()}
        ${renderToolbar()}
        <div class="qprog">รอบนี้: ${roundDone + 1} / ${roundTotal} · รวม ${seenInPool} / ${total}${wrongIds.length ? ` · เก็บไว้ทบทวน ${wrongIds.length}` : ""}</div>
        <div class="progress"><div class="bar" style="width:${roundPct}%"></div></div>

        <div class="fc-flashcard ${flipped ? "is-flipped" : ""}" id="card" tabindex="0">
          <div class="fc-flashcard-inner">
            <div class="fc-flashcard-face fc-face-front">
              <div class="fc-flashcard-text">${escapeHtml(shownText)}</div>
              <div class="fc-flashcard-hint">${flipped ? "ด้านหลัง" : "ด้านหน้า"} — แตะเพื่อพลิก · ลาก ← ยังไม่ได้ · ลาก → ผ่าน</div>
            </div>
          </div>
          <div class="fc-swipe-hint fc-swipe-hint-left">✕ ยังไม่ได้</div>
          <div class="fc-swipe-hint fc-swipe-hint-right">✓ ผ่าน</div>
        </div>

        <div class="btn-row" style="justify-content:space-between;">
          <button class="btn fc-btn-unknown" id="btnUnknown">← ยังไม่ได้</button>
          <div class="btn-row" style="margin:0;">
            <button class="btn" id="undoBtn" title="ย้อนกลับการ์ดที่แล้ว" ${history.length ? "" : "disabled"}>↶ ย้อนกลับ</button>
            <button class="star ${w.starred ? "on" : ""}" id="starBtn" title="ติดดาว">★</button>
            <button class="btn" id="speakBtn" title="ออกเสียง">🔊</button>
            <button class="btn" id="flipBtn">พลิก</button>
          </div>
          <button class="btn fc-btn-known" id="btnKnown">ผ่าน →</button>
        </div>
      `;

      bindHeader(); bindToolbar();
      setupSwipe(root.querySelector("#card"));

      root.querySelector("#flipBtn").addEventListener("click", (e) => {
        e.stopPropagation();
        if (animating) return;
        flipped = !flipped; draw();
      });
      root.querySelector("#btnUnknown").addEventListener("click", () => {
        animateOut(-1, () => commit("unknown"));
      });
      root.querySelector("#btnKnown").addEventListener("click", () => {
        animateOut(1, () => commit("known"));
      });
      root.querySelector("#undoBtn").addEventListener("click", undo);
      root.querySelector("#starBtn").addEventListener("click", () => {
        FS().toggleStar(deck.id, w.id);
        draw();
      });
      root.querySelector("#speakBtn").addEventListener("click", () => speak(shownText));

      maybeAutoSpeak();
    }

    function setupSwipe(cardEl) {
      if (!cardEl) return;
      let startX = 0, startY = 0, dx = 0, dy = 0, dragging = false, moved = false;
      const THRESHOLD = 80;

      cardEl.addEventListener("pointerdown", (e) => {
        // Block new gestures while a swipe-out animation is in flight,
        // and ignore a second finger landing while the first is still down.
        if (animating || dragging) return;
        if (e.target.closest("button")) return;
        dragging = true; moved = false;
        startX = e.clientX; startY = e.clientY;
        dx = 0; dy = 0;
        try { cardEl.setPointerCapture(e.pointerId); } catch (_) {}
        cardEl.style.transition = "none";
      });
      cardEl.addEventListener("pointermove", (e) => {
        if (!dragging) return;
        dx = e.clientX - startX;
        dy = e.clientY - startY;
        if (Math.abs(dx) > 8 || Math.abs(dy) > 8) moved = true;
        cardEl.style.transform = `translateX(${dx}px) rotate(${dx * 0.06}deg)`;
        cardEl.classList.toggle("hint-right", dx > 30);
        cardEl.classList.toggle("hint-left", dx < -30);
      });
      function release(e) {
        if (!dragging) return;
        dragging = false;
        try { cardEl.releasePointerCapture(e.pointerId); } catch (_) {}
        cardEl.style.transition = "transform .22s ease, opacity .22s ease";

        if (!moved) {
          cardEl.style.transform = "";
          cardEl.classList.remove("hint-right", "hint-left");
          if (animating) return;
          flipped = !flipped; draw();
          return;
        }
        if (animating) {
          cardEl.style.transform = "";
          cardEl.classList.remove("hint-right", "hint-left");
          return;
        }
        if (dx > THRESHOLD) {
          animating = true;
          cardEl.style.pointerEvents = "none";
          cardEl.style.transform = "translateX(120%) rotate(16deg)";
          cardEl.style.opacity = "0";
          setTimeout(() => commit("known"), 200);
        } else if (dx < -THRESHOLD) {
          animating = true;
          cardEl.style.pointerEvents = "none";
          cardEl.style.transform = "translateX(-120%) rotate(-16deg)";
          cardEl.style.opacity = "0";
          setTimeout(() => commit("unknown"), 200);
        } else {
          cardEl.style.transform = "";
          cardEl.classList.remove("hint-right", "hint-left");
        }
      }
      cardEl.addEventListener("pointerup", release);
      cardEl.addEventListener("pointercancel", () => {
        if (!dragging) return;
        dragging = false;
        cardEl.style.transition = "transform .2s ease";
        cardEl.style.transform = "";
        cardEl.classList.remove("hint-right", "hint-left");
      });
    }

    function goBack() {
      window.speechSynthesis && window.speechSynthesis.cancel();
      state.screen = "deck"; refresh(root);
    }

    draw();
    return root;
  }

  /* ===================== LEARN MODE (4-choice) =====================
   * Batched MCQ: the unfinished queue is split into batches of BATCH_SIZE
   * words. Each batch runs in passes: pass 1 covers all 10, then any
   * subsequent pass cycles ONLY the words the user got wrong in the
   * previous pass. The batch is complete (and its 10 words committed to
   * completedIds) once a pass finishes with zero wrong answers. A streak
   * > FIRE_THRESHOLD lights up an on-fire banner that persists until the
   * user misses.
   *
   * queueIds is persisted; batch state (originals, pass queue, accumulators,
   * streak) is in-memory only — leaving mid-batch restarts the batch.
   */
  function renderLearn() {
    const deck = FS().getDeck(state.deckId);
    if (!deck) { state.screen = "home"; return renderHome(); }

    const BATCH_SIZE = 10;
    const FIRE_THRESHOLD = 15;

    const root = document.createElement("div");

    function frontOf(w) { return state.learnOpts.swap ? w.back : w.front; }
    function backOf(w)  { return state.learnOpts.swap ? w.front : w.back; }

    function buildPool() {
      let pool = FS().chunkWords(FS().getDeck(deck.id));
      if (state.learnOpts.starredOnly) pool = pool.filter((w) => w.starred);
      return pool;
    }
    function poolIdSet() { return new Set(buildPool().map((w) => w.id)); }
    function wordById(wid) {
      const d = FS().getDeck(deck.id);
      return d.words.find((w) => w.id === wid) || null;
    }
    function unfinishedIds() {
      const done = new Set(FS().getDeck(deck.id).progress.learn.completedIds || []);
      return buildPool().filter((w) => !done.has(w.id)).map((w) => w.id);
    }

    function loadRound() {
      const d = FS().getDeck(deck.id);
      const done = new Set(d.progress.learn.completedIds || []);
      const poolIds = poolIdSet();
      let q = (d.progress.learn.queueIds || []).filter((id) => poolIds.has(id) && !done.has(id));
      // Migrate any legacy wrongIds into the master queue, then drop them.
      const legacyWrong = (d.progress.learn.wrongIds || []).filter((id) => poolIds.has(id) && !done.has(id) && !q.includes(id));
      if (legacyWrong.length) q = q.concat(legacyWrong);
      if (q.length === 0) {
        q = shuffleArr(unfinishedIds());
      }
      FS().setLearnRound(deck.id, { queueIds: q, wrongIds: [], roundTotal: q.length });
      return { queueIds: q };
    }

    let { queueIds } = loadRound();
    // Original IDs of the current batch (the 10 we're committing on success).
    let batchOriginalIds = [];
    // The current pass's queue — pass 1 = all 10, later passes = only the
    // words that were wrong in the previous pass.
    let batchQueue = [];
    let batchPos = 0;
    // Words ever answered correctly in this batch (across passes).
    let batchCorrectIds = new Set();
    // Words wrong in the current pass; resets each pass.
    let batchWrongIdsThisPass = new Set();
    let passNumber = 1;
    let streak = 0;
    let fireJustLit = false;
    let answeredThis = false;
    let autoAdvanceTimer = null;
    let lastSpokenWid = null;

    function startNewBatch() {
      const size = Math.min(BATCH_SIZE, queueIds.length);
      batchOriginalIds = queueIds.slice(0, size);
      batchQueue = batchOriginalIds.slice();
      batchPos = 0;
      batchCorrectIds = new Set();
      batchWrongIdsThisPass = new Set();
      passNumber = 1;
    }
    function resetBatchState() {
      batchOriginalIds = [];
      batchQueue = [];
      batchPos = 0;
      batchCorrectIds = new Set();
      batchWrongIdsThisPass = new Set();
      passNumber = 1;
    }
    function persist() {
      FS().setLearnRound(deck.id, { queueIds, wrongIds: [], roundTotal: queueIds.length });
    }
    function clearAutoAdvance() {
      if (autoAdvanceTimer) { clearTimeout(autoAdvanceTimer); autoAdvanceTimer = null; }
    }
    function maybeAutoSpeak(force) {
      if (!state.learnOpts.autoSpeak) return;
      const wid = batchQueue[batchPos];
      if (!wid) return;
      const w = wordById(wid);
      if (!w) return;
      const text = frontOf(w);
      if (!hasJapanese(text)) return;
      if (!force && wid === lastSpokenWid) return;
      lastSpokenWid = wid;
      speak(text, "ja-JP");
    }

    function resetRound() {
      queueIds = shuffleArr(unfinishedIds());
      resetBatchState();
      streak = 0;
      fireJustLit = false;
      answeredThis = false;
      lastSpokenWid = null;
      persist();
      draw();
    }

    function tokenize(s) {
      return String(s || "")
        .toLowerCase()
        .split(/[,、，;；/]\s*|\s+/)
        .map((t) => t.trim())
        .filter(Boolean);
    }
    function jpChars(s) {
      return String(s || "").replace(/[()（）\s]/g, "");
    }
    function similarity(a, b) {
      if (!a || !b || a === b) return 0;
      if (hasJapanese(a) || hasJapanese(b)) {
        const ca = jpChars(a), cb = jpChars(b);
        if (!ca.length || !cb.length) return 0;
        let common = 0;
        const setA = new Set(ca);
        for (const ch of cb) if (setA.has(ch)) common++;
        const union = new Set([...ca, ...cb]).size || 1;
        const lenPenalty = Math.abs(ca.length - cb.length) <= 1 ? 0.15 : 0;
        return common / union + lenPenalty;
      }
      const ta = new Set(tokenize(a));
      const tb = new Set(tokenize(b));
      if (!ta.size || !tb.size) return 0;
      let inter = 0;
      ta.forEach((t) => { if (tb.has(t)) inter++; });
      const union = new Set([...ta, ...tb]).size;
      return union ? inter / union : 0;
    }

    // True when `a` and `b` mean essentially the same thing:
    // identical text, identical Japanese char set, or one Thai token
    // set is a subset of the other (e.g. "ปีศาจ, ซาตาน" vs "ซาตาน, ปีศาจ"
    // or "ปีศาจ, ซาตาน" vs "ปีศาจ"). Used to keep duplicate-meaning
    // options out of the choice set so distractors are similar but distinct.
    function isDuplicateMeaning(a, b) {
      if (!a || !b) return false;
      if (a === b) return true;
      if (hasJapanese(a) && hasJapanese(b)) {
        return jpChars(a) === jpChars(b);
      }
      const ta = new Set(tokenize(a));
      const tb = new Set(tokenize(b));
      if (!ta.size || !tb.size) return false;
      const aInB = [...ta].every((t) => tb.has(t));
      const bInA = [...tb].every((t) => ta.has(t));
      return aInB || bInA;
    }

    function makeChoices(word) {
      const all = FS().getDeck(deck.id).words.filter((w) => w.id !== word.id);
      const targetAns = backOf(word);
      // Hard-exclude options whose back means the same as the correct answer.
      const eligible = all.filter((w) => !isDuplicateMeaning(backOf(w), targetAns));
      // Rank by similarity, then dedupe by displayed text so we never show
      // two distractors that read the same.
      const scored = eligible.map((w) => ({ w, score: similarity(backOf(w), targetAns) }));
      scored.sort((a, b) => b.score - a.score);
      const seenBacks = new Set([targetAns]);
      const candidates = [];
      for (const s of scored) {
        const ans = backOf(s.w);
        if (seenBacks.has(ans)) continue;
        seenBacks.add(ans);
        candidates.push(s);
        if (candidates.length >= 10) break;
      }
      const nonZero = candidates.filter((x) => x.score > 0);
      const basis = nonZero.length >= 3 ? nonZero : candidates;
      const picked = shuffleArr(basis).slice(0, 3).map((x) => x.w);
      // Pad with random eligible (still dedup by back text) if too few.
      if (picked.length < 3) {
        const pickedIds = new Set(picked.map((w) => w.id));
        const pool = shuffleArr(eligible).filter((w) => !pickedIds.has(w.id) && !seenBacks.has(backOf(w)));
        for (const w of pool) {
          if (picked.length >= 3) break;
          picked.push(w);
          seenBacks.add(backOf(w));
        }
      }
      return shuffleArr([word, ...picked]).map((w) => ({
        text: backOf(w),
        correct: w.id === word.id
      }));
    }

    function renderToolbar() {
      return `
        <div class="fc-toolbar fc-toolbar-sticky">
          <label class="fc-toggle"><input type="checkbox" data-opt="swap" ${state.learnOpts.swap ? "checked" : ""}/> สลับด้าน</label>
          <label class="fc-toggle"><input type="checkbox" data-opt="starredOnly" ${state.learnOpts.starredOnly ? "checked" : ""}/> ดาวเท่านั้น</label>
          <label class="fc-toggle"><input type="checkbox" data-opt="autoSpeak" ${state.learnOpts.autoSpeak ? "checked" : ""}/> 🔊 อ่านอัตโนมัติ</label>
        </div>
      `;
    }
    function bindToolbar() {
      root.querySelectorAll(".fc-toolbar input[data-opt]").forEach((cb) => {
        cb.addEventListener("change", () => {
          state.learnOpts[cb.dataset.opt] = cb.checked;
          const opt = cb.dataset.opt;
          if (opt === "starredOnly") {
            resetRound();
          } else if (opt === "autoSpeak") {
            if (!cb.checked) {
              window.speechSynthesis && window.speechSynthesis.cancel();
            } else {
              maybeAutoSpeak(true);
            }
          } else {
            // swap — same question set, just front/back swapped
            draw();
          }
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
      const pool = buildPool();
      const total = pool.length;
      const done = new Set(dk.progress.learn.completedIds || []);
      const doneInPool = pool.filter((w) => done.has(w.id)).length;
      const attempts = dk.progress.learn.attempts;
      const correct = dk.progress.learn.correct;
      const overallPct = total ? Math.round((doneInPool / total) * 100) : 0;

      // Need ≥4 words for MCQ distractors
      if (FS().getDeck(deck.id).words.length < 4 || total < 1) {
        root.innerHTML = `
          ${renderHeader()}
          ${renderToolbar()}
          <div class="empty">ต้องมีอย่างน้อย 4 คำในชุดคำ และอย่างน้อย 1 คำในชุดย่อย${state.learnOpts.starredOnly ? " (ลองปิด \"ดาวเท่านั้น\")" : ""}</div>
        `;
        bindHeader(); bindToolbar(); return;
      }

      // End of all unfinished words in pool
      if (queueIds.length === 0) {
        root.innerHTML = `
          ${renderHeader()}
          ${renderToolbar()}
          <div class="qprog">รวม ${doneInPool} / ${total} · ตอบไป ${attempts} ครั้ง · ถูก ${correct}</div>
          <div class="progress ok"><div class="bar" style="width:${overallPct}%"></div></div>
          <div class="score-card">
            <div>
              <h2 style="margin:0;">เก่งมาก! ตอบได้ครบทุกคำแล้ว</h2>
              <p class="subtle">เรียน ${total} คำสำเร็จ</p>
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
          const ids = pool.map((w) => w.id);
          const fullState = FS().load();
          const d = fullState.decks.find((x) => x.id === deck.id);
          if (d) {
            d.progress.learn.completedIds = d.progress.learn.completedIds.filter((id) => !ids.includes(id));
            d.progress.learn.queueIds = [];
            d.progress.learn.wrongIds = [];
            d.progress.learn.roundTotal = 0;
            FS().save(fullState);
          }
          ({ queueIds } = loadRound());
          resetBatchState();
          streak = 0;
          fireJustLit = false;
          answeredThis = false;
          draw();
        });
        root.querySelector("#back2").addEventListener("click", goBack);
        return;
      }

      // Snapshot a new batch (pass 1) when the previous one is done.
      if (batchQueue.length === 0) startNewBatch();
      // Clamp in case the queue shrank under us (e.g. word deletion).
      if (batchPos >= batchQueue.length) batchPos = 0;
      const cur = wordById(batchQueue[batchPos]);
      if (!cur) {
        batchQueue.splice(batchPos, 1);
        // If pass becomes empty, treat as pass-ended (advance handles next pass / next batch).
        return advance();
      }
      const choices = makeChoices(cur);
      const passSize = batchQueue.length;
      const batchSize = batchOriginalIds.length;
      const overallSeen = doneInPool;
      const showFireBanner = streak > FIRE_THRESHOLD;
      const isReviewPass = passNumber > 1;
      const fireClasses = `fc-on-fire${fireJustLit ? " is-igniting" : ""}`;
      const passLabel = isReviewPass
        ? `ทบทวนคำที่ผิด (รอบ ${passNumber}): ${batchPos + 1} / ${passSize}`
        : `ชุดนี้: ${batchPos + 1} / ${batchSize}`;

      root.innerHTML = `
        ${renderHeader()}
        ${renderToolbar()}
        ${showFireBanner ? `<div class="${fireClasses}"><span class="fc-on-fire-flame">🔥</span><span>On fire! ตอบถูก ${streak} ครั้งติด</span><span class="fc-on-fire-flame">🔥</span></div>` : ""}
        <div class="qprog">${passLabel}${batchWrongIdsThisPass.size ? ` · ผิดในรอบนี้ ${batchWrongIdsThisPass.size}` : ""} · รวม ${overallSeen} / ${total}</div>
        <div class="progress"><div class="bar" style="width:${passSize ? Math.round((batchPos / passSize) * 100) : 0}%"></div></div>

        <div class="card${showFireBanner ? " is-on-fire" : ""}">
          <div class="fc-learn-prompt">
            <div class="fc-learn-q${isReviewPass ? " is-review" : ""}">${escapeHtml(frontOf(cur))}</div>
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

      // One-shot ignition is consumed on render; the persistent banner remains.
      if (fireJustLit) fireJustLit = false;

      bindHeader(); bindToolbar();
      answeredThis = false;
      clearAutoAdvance();
      root.querySelector("#speakBtn").addEventListener("click", () => speak(frontOf(cur)));

      maybeAutoSpeak();

      const choiceBtns = root.querySelectorAll(".choice");
      const nextBtn = root.querySelector("#next");
      function advance() {
        clearAutoAdvance();
        // Did the user just answer the final word of this pass?
        if (batchPos >= batchQueue.length) {
          if (batchWrongIdsThisPass.size === 0) {
            // Pass clean — entire batch complete. Commit and load next batch.
            const ids = batchOriginalIds.slice();
            if (ids.length) FS().markLearnCompleted(deck.id, ids);
            queueIds = queueIds.slice(batchOriginalIds.length);
            resetBatchState();
            persist();
          } else {
            // Pass had wrongs — next pass cycles only those wrong words.
            // The yellow question text in the review pass signals the state.
            batchQueue = shuffleArr(Array.from(batchWrongIdsThisPass));
            batchWrongIdsThisPass = new Set();
            batchPos = 0;
            passNumber += 1;
          }
        }
        draw();
      }
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
          FS().recordLearnAttempt(deck.id, cur.id, wasCorrect, { markCompleted: false });
          if (wasCorrect) {
            const prevStreak = streak;
            streak += 1;
            if (prevStreak <= FIRE_THRESHOLD && streak > FIRE_THRESHOLD) fireJustLit = true;
            batchCorrectIds.add(cur.id);
            fb.innerHTML = `<div class="feedback ok"><strong>ถูกต้อง ✓</strong></div>`;
          } else {
            streak = 0;
            fireJustLit = false;
            batchWrongIdsThisPass.add(cur.id);
            // If they got this word right earlier in the batch, undo that
            // — they have to get it right in this pass to count.
            batchCorrectIds.delete(cur.id);
            fb.innerHTML = `<div class="feedback bad"><strong>ยังไม่ถูก ✗</strong>
              <div style="margin-top:4px;">เฉลย: ${escapeHtml(backOf(cur))} — จะถูกทบทวนอีกครั้งหลังตอบครบรอบนี้</div></div>`;
          }
          batchPos += 1;
          nextBtn.style.display = "inline-block";
          autoAdvanceTimer = setTimeout(advance, wasCorrect ? 700 : 1800);
        });
      });
      nextBtn.addEventListener("click", advance);
    }

    function goBack() {
      clearAutoAdvance();
      window.speechSynthesis && window.speechSynthesis.cancel();
      state.screen = "deck"; refresh(root);
    }

    draw();
    return root;
  }

  return { render };
})();
