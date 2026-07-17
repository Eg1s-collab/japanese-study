/**
 * 四字熟語 arrangement view — reconstruct an idiom by ordering its shuffled
 * characters, then see its confirmed meaning. Idioms are bucketed by JLPT
 * level (the hardest kanji they contain) and split into fixed-size chapters
 * so learners work through N5 → N1 in bite-sized sets. A progress bar on the
 * menu shows how far they've got (an idiom is "learned" once assembled
 * correctly — persisted via YojijukugoProgress, cloud-synced).
 *
 * Interaction mirrors ArrangeView (並び替え): tap a bank card to append it to
 * the answer row, tap an answer card to send it back, drag to reorder.
 */
window.YojijukugoView = (function () {
  const PREF_KEY = "jp_yoji_pref_v1";
  const CHAPTER_SIZE = 12;
  const GROUP_SIZE = 4;

  const LEVELS = [
    { id: "n5", label: "N5", jp: "初級", sub: "เริ่มต้น" },
    { id: "n4", label: "N4", jp: "初中級", sub: "ต้น-กลาง" },
    { id: "n3", label: "N3", jp: "中級", sub: "กลาง" },
    { id: "n2", label: "N2", jp: "中上級", sub: "กลาง-สูง" },
    { id: "n1", label: "N1", jp: "上級", sub: "สูง" }
  ];

  /* ---------- prefs (reading hint + which level is expanded) ---------- */
  function loadPref() {
    try {
      const raw = localStorage.getItem(PREF_KEY);
      if (!raw) return { showReading: true, autoAdvance: true, openLevel: null };
      const obj = JSON.parse(raw);
      return {
        showReading: obj.showReading !== false,
        autoAdvance: obj.autoAdvance !== false,
        openLevel: typeof obj.openLevel === "string" ? obj.openLevel : null
      };
    } catch (_) { return { showReading: true, autoAdvance: true, openLevel: null }; }
  }
  function savePref(p) {
    try { localStorage.setItem(PREF_KEY, JSON.stringify(p)); } catch (_) {}
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
  function chars(str) { return Array.from(String(str || "")); }

  /* ---------- chapter model (memoized) ----------
   * chaptersByLevel["n5"] = [ [items…], [items…], … ]  (CHAPTER_SIZE each)
   * Order within a level follows the source (roughly aiueo) order. */
  let _chapters = null;
  function chapters() {
    if (_chapters) return _chapters;
    const bank = window.YOJIJUKUGO || [];
    const byLevel = {};
    LEVELS.forEach((lv) => { byLevel[lv.id] = []; });
    bank.forEach((it) => {
      const lv = byLevel[it.lvl] ? it.lvl : "n1";
      byLevel[lv].push(it);
    });
    const out = {};
    LEVELS.forEach((lv) => {
      const items = byLevel[lv.id];
      const chs = [];
      for (let i = 0; i < items.length; i += CHAPTER_SIZE) {
        chs.push(items.slice(i, i + CHAPTER_SIZE));
      }
      out[lv.id] = chs;
    });
    _chapters = out;
    return out;
  }

  function keysOf(items) { return items.map((it) => it.k); }
  function levelMeta(id) { return LEVELS.find((l) => l.id === id) || LEVELS[LEVELS.length - 1]; }

  /* ---------- entry ---------- */
  function render() { return renderMenu(); }

  /* ---------- menu ---------- */
  function renderMenu() {
    const root = document.createElement("div");
    const pref = loadPref();
    const chs = chapters();
    const bank = window.YOJIJUKUGO || [];
    const P = window.YojijukugoProgress;

    const totalDone = P ? P.countDone(keysOf(bank)) : 0;
    const total = bank.length;
    const totalPct = total ? Math.round((totalDone / total) * 100) : 0;

    // Default the open level to the first that has chapters, unless the user
    // has explicitly toggled one open.
    let openLevel = pref.openLevel;
    if (!openLevel) {
      const firstLv = LEVELS.find((lv) => (chs[lv.id] || []).length);
      openLevel = firstLv ? firstLv.id : "n5";
    }

    const levelBlocks = LEVELS.map((lv) => {
      const levelChs = chs[lv.id] || [];
      const levelItems = levelChs.reduce((acc, c) => acc.concat(c), []);
      const doneInLevel = P ? P.countDone(keysOf(levelItems)) : 0;
      const lvPct = levelItems.length ? Math.round((doneInLevel / levelItems.length) * 100) : 0;
      const isOpen = lv.id === openLevel;

      const chipCards = levelChs.map((chItems, idx) => {
        const done = P ? P.countDone(keysOf(chItems)) : 0;
        const full = done >= chItems.length && chItems.length > 0;
        const chPct = chItems.length ? Math.round((done / chItems.length) * 100) : 0;
        return `
          <button type="button" class="yoji-chap ${full ? "is-full" : ""}"
                  data-level="${escapeAttr(lv.id)}" data-chap="${idx}">
            <span class="yoji-chap-top">
              <span class="yoji-chap-no">บท ${idx + 1}</span>
              ${full ? `<span class="yoji-chap-check">✓</span>` : `<span class="yoji-chap-frac">${done}/${chItems.length}</span>`}
            </span>
            <span class="yoji-chap-bar"><span style="width:${chPct}%"></span></span>
          </button>`;
      }).join("");

      return `
        <div class="yoji-level ${isOpen ? "open" : ""}" data-level-block="${escapeAttr(lv.id)}">
          <button type="button" class="yoji-level-head" data-level-toggle="${escapeAttr(lv.id)}" aria-expanded="${isOpen}">
            <span class="yoji-lvl-pill yoji-lvl-${lv.id}">${lv.label}</span>
            <span class="yoji-level-meta">
              <span class="yoji-level-title">ระดับ ${lv.label} · ${escapeHtml(lv.sub)}</span>
              <span class="yoji-level-sub">${levelItems.length} คำ · ${levelChs.length} บท · เรียนแล้ว ${doneInLevel}/${levelItems.length}</span>
            </span>
            <span class="yoji-level-right">
              <span class="yoji-level-pct">${lvPct}%</span>
              <span class="yoji-level-chev" aria-hidden="true">▾</span>
            </span>
          </button>
          <div class="yoji-level-barwrap"><span class="yoji-level-bar" style="width:${lvPct}%"></span></div>
          <div class="yoji-level-body" ${isOpen ? "" : "hidden"}>
            ${levelItems.length ? `
            <div class="yoji-mode-row">
              <button type="button" class="yoji-mode-btn" data-mode="flash" data-level="${escapeAttr(lv.id)}">🃏 บัตรคำ</button>
              <button type="button" class="yoji-mode-btn" data-mode="choice" data-level="${escapeAttr(lv.id)}">☑️ ตัวเลือก</button>
            </div>
            <div class="yoji-chap-caption subtle">เรียงคำเป็นบท</div>` : ""}
            <div class="yoji-chap-grid">${chipCards || `<span class="subtle">— ไม่มีคำในระดับนี้ —</span>`}</div>
          </div>
        </div>`;
    }).join("");

    root.innerHTML = `
      <h2>เรียงสี่พยางค์ · 四字熟語</h2>
      <p class="subtle">อ่านความหมาย แล้วลาก/แตะตัวอักษรมาเรียงให้เป็นสำนวนที่ถูกต้อง · แบ่งเป็นบทตามระดับคันจิ N5→N1 (${total} สำนวน)</p>

      <div class="card yoji-overall">
        <div class="yoji-overall-head">
          <span class="pt-section-title" style="margin:0;">ความคืบหน้ารวม</span>
          <span class="yoji-overall-frac">${totalDone} / ${total} <span class="subtle">(${totalPct}%)</span></span>
        </div>
        <div class="yoji-level-barwrap big"><span class="yoji-level-bar" style="width:${totalPct}%"></span></div>
        <label class="arr-mode-toggle ${pref.showReading ? "on" : ""}" style="margin-top:14px;">
          <input type="checkbox" id="yojiShowReading" ${pref.showReading ? "checked" : ""} />
          <span class="arr-mode-jp">🔊 แสดงคำอ่าน</span>
          <span class="arr-mode-sub">โชว์ฮิรางานะเป็นตัวช่วยตอนเรียง — ปิดไว้เพื่อความท้าทายแบบ JLPT</span>
        </label>
        <label class="arr-mode-toggle ${pref.autoAdvance ? "on" : ""}" style="margin-top:10px;">
          <input type="checkbox" id="yojiAutoAdvance" ${pref.autoAdvance ? "checked" : ""} />
          <span class="arr-mode-jp">⏭️ ไปข้อถัดไปอัตโนมัติ</span>
          <span class="arr-mode-sub">เมื่อตอบถูก จะเลื่อนไปข้อต่อไปให้เองโดยไม่ต้องกด</span>
        </label>
      </div>

      <div class="yoji-levels">${levelBlocks}</div>
    `;

    // reading toggle
    const rdCb = root.querySelector("#yojiShowReading");
    rdCb.addEventListener("change", () => {
      const p = loadPref();
      p.showReading = rdCb.checked;
      savePref(p);
      rdCb.closest(".arr-mode-toggle").classList.toggle("on", rdCb.checked);
    });

    // auto-advance toggle
    const aaCb = root.querySelector("#yojiAutoAdvance");
    aaCb.addEventListener("change", () => {
      const p = loadPref();
      p.autoAdvance = aaCb.checked;
      savePref(p);
      aaCb.closest(".arr-mode-toggle").classList.toggle("on", aaCb.checked);
    });

    // level accordion (single-open)
    root.querySelectorAll("[data-level-toggle]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.dataset.levelToggle;
        const p = loadPref();
        const block = root.querySelector(`[data-level-block="${id}"]`);
        const nowOpen = !block.classList.contains("open");
        root.querySelectorAll(".yoji-level").forEach((b) => {
          b.classList.remove("open");
          const g = b.querySelector(".yoji-level-body");
          if (g) g.hidden = true;
          const h = b.querySelector(".yoji-level-head");
          if (h) h.setAttribute("aria-expanded", "false");
        });
        if (nowOpen) {
          block.classList.add("open");
          block.querySelector(".yoji-level-body").hidden = false;
          btn.setAttribute("aria-expanded", "true");
          p.openLevel = id;
        } else {
          p.openLevel = null;
        }
        savePref(p);
      });
    });

    // start a chapter — walk sub-sets of GROUP_SIZE (study → drill), then a
    // combined round over the whole chapter.
    root.querySelectorAll(".yoji-chap").forEach((chip) => {
      chip.addEventListener("click", () => {
        const lv = chip.dataset.level;
        const idx = parseInt(chip.dataset.chap, 10);
        const items = (chapters()[lv] || [])[idx] || [];
        if (!items.length) return;
        const label = `${levelMeta(lv).label} · บท ${idx + 1}`;
        const showReading = loadPref().showReading !== false;
        startChapter(items.slice(), {
          label,
          showReading,
          mount: (node) => root.replaceWith(node)
        });
      });
    });

    // per-level practice modes: flashcards / multiple-choice — pick a chapter
    // (or the whole level) first, then drill.
    root.querySelectorAll(".yoji-mode-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const lv = btn.dataset.level;
        const mode = btn.dataset.mode;
        const chs = chapters()[lv] || [];
        if (!chs.reduce((n, c) => n + c.length, 0)) return;
        let current = null;
        const swap = (node) => { if (current) current.replaceWith(node); else root.replaceWith(node); current = node; };
        startMode(lv, mode, { swap, backToMenu: () => swap(renderMenu()) });
      });
    });

    return root;
  }

  /* ---------- flash/choice flow: pick a chapter (or whole level), then drill ---------- */
  function startMode(lv, mode, ctrl) {
    const { swap, backToMenu } = ctrl;
    function showPicker() {
      swap(renderModePicker(lv, mode, { onExit: backToMenu, onPick: showRun }));
    }
    function showRun(items, label) {
      const showReading = loadPref().showReading !== false;
      const node = mode === "flash"
        ? renderFlashcards(shuffle(items), { label, onExit: showPicker })
        : renderChoice(shuffle(items), { label, showReading, poolLevel: lv, onExit: showPicker });
      swap(node);
    }
    showPicker();
  }

  /* ---------- chapter picker for flash/choice modes ---------- */
  function renderModePicker(lv, mode, opts) {
    const { onExit, onPick } = opts;
    const root = document.createElement("div");
    const P = window.YojijukugoProgress;
    const chs = chapters()[lv] || [];
    const levelItems = chs.reduce((acc, c) => acc.concat(c), []);
    const lm = levelMeta(lv);
    const modeLabel = mode === "flash" ? "🃏 บัตรคำ" : "☑️ ตัวเลือก";
    const allDone = P ? P.countDone(keysOf(levelItems)) : 0;

    const selected = new Set();

    const chipCards = chs.map((chItems, idx) => {
      const done = P ? P.countDone(keysOf(chItems)) : 0;
      const full = done >= chItems.length && chItems.length > 0;
      const pct = chItems.length ? Math.round((done / chItems.length) * 100) : 0;
      return `
        <button type="button" class="yoji-chap ${full ? "is-full" : ""}" data-chap="${idx}" aria-pressed="false">
          <span class="yoji-chap-sel" aria-hidden="true">✓</span>
          <span class="yoji-chap-top">
            <span class="yoji-chap-no">บท ${idx + 1}</span>
            ${full ? `<span class="yoji-chap-check">✓</span>` : `<span class="yoji-chap-frac">${done}/${chItems.length}</span>`}
          </span>
          <span class="yoji-chap-bar"><span style="width:${pct}%"></span></span>
        </button>`;
    }).join("");

    root.innerHTML = `
      <div class="qhead">
        <h2 class="qtitle">${modeLabel} · ${escapeHtml(lm.label)}</h2>
        <button class="btn ghost btn-sm" id="mpExit">← กลับเมนู</button>
      </div>
      <p class="subtle">แตะเลือกบท (เลือกได้หลายบท) แล้วกดเริ่ม — ทั้งระดับมี ${levelItems.length} คำ · เรียนแล้ว ${allDone}</p>
      <div class="btn-row">
        <button type="button" class="btn ghost btn-sm" id="mpAll">เลือกทั้งหมด</button>
        <button type="button" class="btn ghost btn-sm" id="mpClear">ล้างที่เลือก</button>
      </div>
      <div class="yoji-chap-grid">${chipCards}</div>
      <div class="btn-row" style="margin-top:14px;">
        <button type="button" class="btn primary" id="mpStart" disabled>เริ่มฝึก</button>
      </div>
    `;

    const startBtn = root.querySelector("#mpStart");
    function refresh() {
      root.querySelectorAll(".yoji-chap-grid .yoji-chap").forEach((chip) => {
        const idx = parseInt(chip.dataset.chap, 10);
        const on = selected.has(idx);
        chip.classList.toggle("is-selected", on);
        chip.setAttribute("aria-pressed", on ? "true" : "false");
      });
      const count = [...selected].reduce((n, idx) => n + chs[idx].length, 0);
      startBtn.disabled = selected.size === 0;
      startBtn.textContent = selected.size ? `เริ่มฝึก · ${count} คำ` : "เริ่มฝึก";
    }

    function start() {
      if (!selected.size) return;
      const idxs = [...selected].sort((a, b) => a - b);
      const items = idxs.reduce((acc, idx) => acc.concat(chs[idx]), []);
      const label = idxs.length === chs.length
        ? `${lm.label} · ทั้งระดับ`
        : idxs.length === 1
          ? `${lm.label} · บท ${idxs[0] + 1}`
          : `${lm.label} · บท ${idxs.map((i) => i + 1).join(",")}`;
      onPick(items, label);
    }

    root.querySelector("#mpExit").addEventListener("click", () => onExit());
    root.querySelector("#mpAll").addEventListener("click", () => { chs.forEach((_, i) => selected.add(i)); refresh(); });
    root.querySelector("#mpClear").addEventListener("click", () => { selected.clear(); refresh(); });
    startBtn.addEventListener("click", start);
    root.querySelectorAll(".yoji-chap-grid .yoji-chap").forEach((chip) => {
      chip.addEventListener("click", () => {
        const idx = parseInt(chip.dataset.chap, 10);
        if (selected.has(idx)) selected.delete(idx); else selected.add(idx);
        refresh();
      });
    });

    return root;
  }

  /* ---------- chapter flow: sub-sets of GROUP_SIZE, then a combined round ---------- */
  function startChapter(items, opts) {
    const { label, showReading, mount } = opts;
    const groups = [];
    for (let i = 0; i < items.length; i += GROUP_SIZE) {
      groups.push(items.slice(i, i + GROUP_SIZE));
    }
    const hasFinal = groups.length > 1;

    let current = null;
    function swap(node) {
      if (current) current.replaceWith(node);
      else mount(node);
      current = node;
    }
    function backToMenu() { swap(renderMenu()); }

    function runGroup(gi) {
      if (gi >= groups.length) {
        if (hasFinal) { runFinal(); return; }
        backToMenu();
        return;
      }
      const group = groups[gi];
      const partLabel = groups.length > 1
        ? `${label} · ชุด ${gi + 1}/${groups.length}`
        : label;
      const isLastGroup = gi === groups.length - 1;
      swap(renderStudy(group.slice(), {
        label: partLabel,
        onExit: backToMenu,
        onStart: () => {
          swap(renderRun(group.slice(), {
            label: partLabel,
            showReading,
            onExit: backToMenu,
            onComplete: () => runGroup(gi + 1),
            nextLabel: isLastGroup && hasFinal ? "รวมทั้งชุด →" : "ชุดถัดไป →"
          }));
        }
      }));
    }

    function runFinal() {
      swap(renderRun(items.slice(), {
        label: `${label} · รวมทั้งชุด`,
        showReading,
        onExit: backToMenu,
        onComplete: backToMenu,
        isFinal: true
      }));
    }

    runGroup(0);
  }

  /* ---------- study (preview all answers before the exercise) ---------- */
  function renderStudy(items, opts) {
    const { label, onExit, onStart } = opts;
    const root = document.createElement("div");
    const P = window.YojijukugoProgress;

    const cards = items.map((it) => {
      const lm = levelMeta(it.lvl);
      const already = P && P.isDone(it.k);
      return `
        <li class="yoji-study-card">
          <div class="yoji-study-top">
            <span class="yoji-study-k">${escapeHtml(it.k)}</span>
            <span class="yoji-study-tags">
              <span class="yoji-lvl-pill yoji-lvl-${it.lvl}" title="ระดับคันจิ">${lm.label}</span>
              ${already ? `<span class="daily-pill" title="เคยเรียงถูกแล้ว">✓</span>` : ""}
            </span>
          </div>
          <div class="yoji-study-r">${escapeHtml(it.r || "—")}</div>
          <div class="yoji-study-t">${escapeHtml(it.t)}</div>
        </li>`;
    }).join("");

    root.innerHTML = `
      <div class="qhead">
        <h2 class="qtitle">ทบทวนก่อนเรียง · ${escapeHtml(label)}</h2>
        <button class="btn ghost btn-sm" id="yojiStudyExit">← กลับเมนู</button>
      </div>
      <p class="subtle">อ่านและจำ ${items.length} คำในชุดนี้ให้ครบก่อน แล้วค่อยเริ่มทำแบบฝึกหัดเรียงคำ</p>
      <ul class="yoji-study-list">${cards}</ul>
      <div class="btn-row">
        <button class="btn primary" id="yojiStudyStart">เริ่มทำแบบฝึกหัด →</button>
        <button class="btn ghost" id="yojiStudyBack">← กลับเมนู</button>
      </div>
    `;

    root.querySelector("#yojiStudyExit").addEventListener("click", () => onExit());
    root.querySelector("#yojiStudyBack").addEventListener("click", () => onExit());
    root.querySelector("#yojiStudyStart").addEventListener("click", () => onStart());

    return root;
  }

  /* ---------- runner ---------- */
  function renderRun(items, opts) {
    const { label, showReading, onExit, onComplete, nextLabel, isFinal } = opts;
    const proceed = typeof onComplete === "function" ? onComplete : onExit;
    const root = document.createElement("div");
    const P = window.YojijukugoProgress;
    const state = { i: 0, correct: 0 };
    const total = items.length;
    const autoAdvance = loadPref().autoAdvance !== false;
    let q = null;
    let advanceTimer = null;

    function clearAdvance() {
      if (advanceTimer) { clearTimeout(advanceTimer); advanceTimer = null; }
    }
    function goNext() {
      clearAdvance();
      state.i += 1;
      drawQuestion();
    }

    drawQuestion();

    function drawQuestion() {
      if (state.i >= total) { renderDone(); return; }
      const item = items[state.i];
      const cards = chars(item.k).map((ch, idx) => ({ id: "c" + idx, text: ch }));
      let bank = shuffle(cards);
      if (cards.length > 1 && bank.every((c, i) => c.text === cards[i].text)) {
        bank = shuffle(cards);
      }
      q = { item, cards, bank, answer: [], locked: false, solved: false };
      drawShell();
    }

    function drawShell() {
      const item = q.item;
      const isLast = state.i === total - 1;
      const pct = Math.round((state.i / total) * 100);
      const lm = levelMeta(item.lvl);
      const already = P && P.isDone(item.k);

      root.innerHTML = `
        <div class="qhead">
          <h2 class="qtitle">เรียงสี่พยางค์ · ${escapeHtml(label)}</h2>
          <button class="btn ghost btn-sm" id="yojiExit">← กลับเมนู</button>
        </div>
        <div class="progress" title="ความก้าวหน้า"><div class="bar" style="width:${pct}%"></div></div>
        <div class="qmeta">
          <span class="qprog">ข้อ ${state.i + 1} / ${total} · คะแนน ${state.correct}/${state.i}</span>
          <span class="qmeta-right">
            <span class="yoji-lvl-pill yoji-lvl-${item.lvl}" title="ระดับคันจิ">${lm.label}</span>
            ${already ? `<span class="daily-pill" title="เคยเรียงถูกแล้ว">✓ เรียนแล้ว</span>` : ""}
          </span>
        </div>

        <div class="card">
          <div class="arr-meaning" id="yojiMeaning">
            <span class="arr-meaning-label">ความหมาย</span>
            <span class="arr-meaning-th">${escapeHtml(item.t)}</span>
          </div>

          <div class="arr-meaning" id="yojiReadingRow" style="${showReading ? "" : "display:none;"}">
            <span class="arr-meaning-label">คำอ่าน</span>
            <span class="arr-meaning-th">${escapeHtml(item.r || "—")}</span>
          </div>

          <div class="arr-answer" id="yojiAnswer" aria-label="แถวเรียงคำตอบ" role="list"></div>
          <div class="arr-bank" id="yojiBank" aria-label="คลังตัวอักษร" role="list"></div>

          <div class="btn-row">
            <button class="btn primary" id="yojiCheck">ตรวจคำตอบ</button>
            <button class="btn ghost" id="yojiClear">↺ ล้าง</button>
            <button class="btn ghost" id="yojiReveal">เฉลย</button>
          </div>

          <div id="yojiFb"></div>

          <div class="btn-row">
            <button class="btn" id="yojiNext" disabled>${isLast ? "ดูคะแนน" : "ข้อถัดไป →"}</button>
          </div>
        </div>
      `;

      root.querySelector("#yojiExit").addEventListener("click", () => { clearAdvance(); onExit(); });
      root.querySelector("#yojiCheck").addEventListener("click", handleCheck);
      root.querySelector("#yojiClear").addEventListener("click", handleClear);
      root.querySelector("#yojiReveal").addEventListener("click", handleReveal);
      root.querySelector("#yojiNext").addEventListener("click", goNext);

      paintCards();
    }

    /* ---------- card painting ---------- */
    function paintCards() {
      const bankEl = root.querySelector("#yojiBank");
      const ansEl = root.querySelector("#yojiAnswer");
      bankEl.innerHTML = q.bank.map((c) => cardHtml(c)).join("");
      ansEl.innerHTML = q.answer.length
        ? q.answer.map((c) => cardHtml(c, "answer")).join("")
        : `<span class="arr-answer-placeholder">— แตะตัวอักษรด้านล่าง —</span>`;

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
        el.addEventListener("click", () => {
          if (q.locked) return;
          if (el.dataset.dragJust === "1") { delete el.dataset.dragJust; return; }
          const id = el.dataset.id;
          const idx = q.answer.findIndex((c) => c.id === id);
          if (idx < 0) return;
          const [card] = q.answer.splice(idx, 1);
          q.bank.push(card);
          paintCards();
        });
      });

      if (!q.locked) wireAnswerReorder(ansEl);
    }

    function cardHtml(c, where) {
      const dragAttr = where === "answer" ? `draggable="true"` : "";
      return `<button type="button" class="arr-card arr-card-kanji" data-id="${escapeAttr(c.id)}" data-where="${where || "bank"}" ${dragAttr}>${escapeHtml(c.text)}</button>`;
    }

    /* ---------- drag-to-reorder (HTML5 native + pointer fallback) ---------- */
    function wireAnswerReorder(ansEl) {
      let draggingId = null;

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
        let to = targetIdx;
        if (to > fromIdx) to -= 1;
        if (to === fromIdx || to < 0) return;
        q.answer.splice(fromIdx, 1);
        q.answer.splice(to, 0, moving);
        paintCards();
      });

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
      q.bank = shuffle(q.bank.concat(q.answer));
      q.answer = [];
      paintCards();
    }

    function handleCheck() {
      if (q.locked) return;
      if (!q.answer.length) return;
      const got = q.answer.map((c) => c.text).join("");
      const ok = got === q.item.k;
      q.locked = true;
      q.solved = ok;
      if (ok) {
        state.correct += 1;
        if (P) P.markDone(q.item.k);
      }
      paintFeedback(ok ? "ok" : "bad");
      paintCardsLocked(ok, false);
      lockControls();
      if (ok && autoAdvance) {
        advanceTimer = setTimeout(goNext, 850);
      }
    }

    function handleReveal() {
      if (q.locked) return;
      const all = q.bank.concat(q.answer);
      const used = new Set();
      const filled = [];
      chars(q.item.k).forEach((ch) => {
        const card = all.find((c) => c.text === ch && !used.has(c.id));
        if (card) { used.add(card.id); filled.push(card); }
      });
      q.answer = filled.length === chars(q.item.k).length
        ? filled
        : chars(q.item.k).map((ch, idx) => ({ id: "r" + idx, text: ch }));
      q.bank = all.filter((c) => !used.has(c.id));
      q.locked = true;
      q.solved = false;
      paintCards();
      paintCardsLocked(false, true);
      paintFeedback("reveal");
      lockControls();
    }

    function lockControls() {
      root.querySelector("#yojiCheck").disabled = true;
      root.querySelector("#yojiClear").disabled = true;
      root.querySelector("#yojiReveal").disabled = true;
      root.querySelector("#yojiNext").disabled = false;
      const rr = root.querySelector("#yojiReadingRow");
      if (rr) rr.style.display = "";
    }

    function paintCardsLocked(ok, revealed) {
      const ansEl = root.querySelector("#yojiAnswer");
      if (!ansEl) return;
      const ideal = chars(q.item.k);
      ansEl.querySelectorAll(".arr-card").forEach((el, i) => {
        el.classList.add("is-locked");
        const card = q.answer[i];
        if (!card) return;
        if (revealed) el.classList.add("is-revealed");
        else if (ok || card.text === ideal[i]) el.classList.add("is-correct");
        else el.classList.add("is-wrong");
      });
      root.querySelectorAll("#yojiBank .arr-card").forEach((el) => el.classList.add("is-locked"));
    }

    function paintFeedback(kind) {
      const fb = root.querySelector("#yojiFb");
      if (!fb) return;
      const item = q.item;
      const answerLine = `${item.k}${item.r ? "（" + item.r + "）" : ""}\nความหมาย: ${item.t}`;
      if (kind === "ok") {
        fb.innerHTML = `
          <div class="feedback ok">
            <strong>ถูกต้อง ✓</strong>
            <div style="white-space:pre-line;margin-top:4px;">${escapeHtml(answerLine)}</div>
          </div>`;
      } else {
        const head = kind === "reveal" ? "เฉลย" : "ยังไม่ถูก ✗";
        fb.innerHTML = `
          <div class="feedback bad">
            <strong>${head}</strong>
            <div style="white-space:pre-line;margin-top:4px;">${escapeHtml("คำตอบที่ถูก: " + answerLine)}</div>
          </div>`;
      }
    }

    /* ---------- done ---------- */
    function renderDone() {
      const tot = total;
      const pct = tot > 0 ? Math.round((state.correct / tot) * 100) : 0;
      const heading = isFinal ? "จบบทนี้!" : "จบชุดนี้!";
      const advanceLabel = nextLabel || "ไปต่อ →";
      const showAdvance = typeof onComplete === "function" && !isFinal;
      root.innerHTML = `
        <div class="score-card">
          <div>
            <h2 style="margin:0;">${heading}</h2>
            <p class="subtle">${escapeHtml(label)} · ${tot} ข้อ</p>
            <p class="subtle" style="margin-top:4px;">${pct >= 80 ? "เก่งมาก ✨" : pct >= 50 ? "ใกล้แล้ว ลองอีกรอบ" : "ฝึกบ่อย ๆ จะคุ้นเอง"}</p>
          </div>
          <div class="score-num">${state.correct} / ${tot}</div>
        </div>
        <div class="btn-row">
          ${showAdvance ? `<button class="btn primary" id="yojiAdvance">${escapeHtml(advanceLabel)}</button>` : ""}
          <button class="btn ${showAdvance ? "ghost" : "primary"}" id="yojiAgain">ทำอีกรอบ</button>
          <button class="btn ghost" id="yojiBackMenu">← กลับเมนู</button>
        </div>
      `;
      const adv = root.querySelector("#yojiAdvance");
      if (adv) adv.addEventListener("click", () => proceed());
      root.querySelector("#yojiAgain").addEventListener("click", () => {
        state.i = 0; state.correct = 0;
        drawQuestion();
      });
      root.querySelector("#yojiBackMenu").addEventListener("click", () => onExit());
    }

    return root;
  }

  /* ---------- shared: speak (ja) ---------- */
  function speak(text) {
    try {
      if (!window.speechSynthesis || !text) return;
      const u = new SpeechSynthesisUtterance(String(text));
      u.lang = "ja-JP";
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(u);
    } catch (_) {}
  }

  /* ---------- flashcard mode (per level) — mirrors บัตรคำ card UI ---------- */
  function renderFlashcards(items, opts) {
    const { label, onExit } = opts;
    const root = document.createElement("div");
    const P = window.YojijukugoProgress;
    const state = { i: 0, known: 0 };
    const total = items.length;
    let flipped = false;
    let animating = false;

    function frontOf(item) { return item.r ? `${item.k}（${item.r}）` : item.k; }
    function backOf(item) { return item.t; }

    function commit(kind) {
      if (kind === "known") {
        const item = items[state.i];
        if (P && item) P.markDone(item.k);
        state.known += 1;
      }
      flipped = false;
      animating = false;
      state.i += 1;
      draw();
    }

    function animateOut(dir, then) {
      const cardEl = root.querySelector("#card");
      if (!cardEl) return then();
      animating = true;
      cardEl.style.pointerEvents = "none";
      cardEl.style.transition = "transform .2s ease, opacity .2s ease";
      cardEl.style.transform = `translateX(${dir * 120}%) rotate(${dir * 16}deg)`;
      cardEl.style.opacity = "0";
      setTimeout(then, 200);
    }

    draw();

    function draw() {
      if (state.i >= total) { done(); return; }
      const item = items[state.i];
      const lm = levelMeta(item.lvl);
      const already = P && P.isDone(item.k);
      const pct = Math.round((state.i / total) * 100);
      const shownText = flipped ? backOf(item) : frontOf(item);

      root.innerHTML = `
        <div class="qmeta">
          <h2 style="margin:0;">🃏 บัตรคำ · ${escapeHtml(label)}</h2>
          <button class="btn ghost" id="fcExit">← กลับเมนู</button>
        </div>
        <div class="qprog">ใบ ${state.i + 1} / ${total} · รู้แล้ว ${state.known}
          <span class="yoji-lvl-pill yoji-lvl-${item.lvl}" style="margin-left:6px;">${lm.label}</span>
          ${already ? `<span class="daily-pill">✓ เรียนแล้ว</span>` : ""}
        </div>
        <div class="progress"><div class="bar" style="width:${pct}%"></div></div>

        <div class="fc-flashcard ${flipped ? "is-flipped" : ""}" id="card" tabindex="0">
          <div class="fc-flashcard-inner">
            <div class="fc-flashcard-face fc-face-front">
              <div class="fc-flashcard-text">${escapeHtml(shownText)}</div>
              <div class="fc-flashcard-hint">${flipped ? "ด้านหลัง" : "ด้านหน้า"} — แตะเพื่อพลิก · ลาก ← ยังไม่รู้ · ลาก → รู้แล้ว</div>
            </div>
          </div>
          <div class="fc-swipe-hint fc-swipe-hint-left">✕ ยังไม่รู้</div>
          <div class="fc-swipe-hint fc-swipe-hint-right">✓ รู้แล้ว</div>
        </div>

        <div class="btn-row" style="justify-content:space-between;">
          <button class="btn fc-btn-unknown" id="btnUnknown">← ยังไม่รู้</button>
          <div class="btn-row" style="margin:0;">
            <button class="btn" id="speakBtn" title="ออกเสียง">🔊</button>
            <button class="btn" id="flipBtn">พลิก</button>
          </div>
          <button class="btn fc-btn-known" id="btnKnown">รู้แล้ว →</button>
        </div>
      `;

      setupSwipe(root.querySelector("#card"));
      root.querySelector("#fcExit").addEventListener("click", () => { window.speechSynthesis && window.speechSynthesis.cancel(); onExit(); });
      root.querySelector("#flipBtn").addEventListener("click", (e) => {
        e.stopPropagation();
        if (animating) return;
        flipped = !flipped; draw();
      });
      root.querySelector("#speakBtn").addEventListener("click", (e) => { e.stopPropagation(); speak(item.k); });
      root.querySelector("#btnUnknown").addEventListener("click", () => { if (!animating) animateOut(-1, () => commit("unknown")); });
      root.querySelector("#btnKnown").addEventListener("click", () => { if (!animating) animateOut(1, () => commit("known")); });
    }

    function setupSwipe(cardEl) {
      if (!cardEl) return;
      let startX = 0, startY = 0, dx = 0, dy = 0, dragging = false, moved = false;
      const THRESHOLD = 80;
      cardEl.addEventListener("pointerdown", (e) => {
        if (animating || dragging) return;
        if (e.target.closest("button")) return;
        dragging = true; moved = false;
        startX = e.clientX; startY = e.clientY; dx = 0; dy = 0;
        try { cardEl.setPointerCapture(e.pointerId); } catch (_) {}
        cardEl.style.transition = "none";
      });
      cardEl.addEventListener("pointermove", (e) => {
        if (!dragging) return;
        dx = e.clientX - startX; dy = e.clientY - startY;
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

    function done() {
      const pct = total > 0 ? Math.round((state.known / total) * 100) : 0;
      root.innerHTML = `
        <div class="qprog">รวม ${state.known} / ${total}</div>
        <div class="progress ok"><div class="bar" style="width:${pct}%"></div></div>
        <div class="score-card">
          <div>
            <h2 style="margin:0;">จบชุดบัตรคำ!</h2>
            <p class="subtle">${escapeHtml(label)} · ${total} ใบ</p>
          </div>
          <div class="score-num">${state.known} / ${total}</div>
        </div>
        <div class="btn-row">
          <button class="btn primary" id="fcAgain">ทำอีกรอบ</button>
          <button class="btn ghost" id="fcBack">← กลับเมนู</button>
        </div>
      `;
      root.querySelector("#fcAgain").addEventListener("click", () => {
        state.i = 0; state.known = 0; flipped = false; animating = false;
        items = shuffle(items);
        draw();
      });
      root.querySelector("#fcBack").addEventListener("click", () => onExit());
    }

    return root;
  }

  /* ---------- multiple-choice mode (per level) — mirrors Learn UI ---------- */
  function renderChoice(items, opts) {
    const { label, poolLevel, onExit } = opts;
    const root = document.createElement("div");
    const P = window.YojijukugoProgress;
    const autoAdvance = loadPref().autoAdvance !== false;
    const state = { i: 0, correct: 0 };
    const total = items.length;
    const pool = (chapters()[poolLevel] || []).reduce((acc, c) => acc.concat(c), []);
    const distractPool = pool.length >= 4 ? pool : (window.YOJIJUKUGO || []);
    let advanceTimer = null;
    let answered = false;

    function clearAdvance() { if (advanceTimer) { clearTimeout(advanceTimer); advanceTimer = null; } }
    function goNext() { clearAdvance(); state.i += 1; draw(); }

    draw();

    function buildOptions(item) {
      const opts4 = [item.t];
      const seen = new Set([item.t]);
      const bag = shuffle(distractPool);
      for (const cand of bag) {
        if (opts4.length >= 4) break;
        if (cand.t && !seen.has(cand.t)) { seen.add(cand.t); opts4.push(cand.t); }
      }
      return shuffle(opts4);
    }

    function draw() {
      if (state.i >= total) { done(); return; }
      const item = items[state.i];
      const lm = levelMeta(item.lvl);
      const already = P && P.isDone(item.k);
      const pct = Math.round((state.i / total) * 100);
      const options = buildOptions(item);
      answered = false;

      root.innerHTML = `
        <div class="qmeta">
          <h2 style="margin:0;">☑️ ตัวเลือก · ${escapeHtml(label)}</h2>
          <button class="btn ghost" id="chExit">← กลับเมนู</button>
        </div>
        <div class="qprog">ข้อ ${state.i + 1} / ${total} · คะแนน ${state.correct}/${state.i}
          <span class="yoji-lvl-pill yoji-lvl-${item.lvl}" style="margin-left:6px;">${lm.label}</span>
          ${already ? `<span class="daily-pill">✓ เรียนแล้ว</span>` : ""}
        </div>
        <div class="progress"><div class="bar" style="width:${pct}%"></div></div>

        <div class="card">
          <div class="fc-learn-prompt">
            <div class="fc-learn-q">${escapeHtml(item.r ? `${item.k}（${item.r}）` : item.k)}</div>
            <button class="btn ghost fc-speak" id="speakBtn" title="ออกเสียง">🔊</button>
          </div>
          <div id="choices">
            ${options.map((t, idx) => `<button class="choice" data-i="${idx}" data-t="${escapeAttr(t)}">${escapeHtml(t)}</button>`).join("")}
          </div>
          <div id="fb"></div>
          <div class="btn-row" style="justify-content:flex-end;">
            <button class="btn primary" id="next" style="display:none;">${state.i === total - 1 ? "ดูคะแนน →" : "ถัดไป →"}</button>
          </div>
        </div>
      `;

      root.querySelector("#chExit").addEventListener("click", () => { clearAdvance(); window.speechSynthesis && window.speechSynthesis.cancel(); onExit(); });
      root.querySelector("#speakBtn").addEventListener("click", () => speak(item.k));
      root.querySelector("#next").addEventListener("click", goNext);
      root.querySelectorAll("#choices .choice").forEach((btn) => {
        btn.addEventListener("click", () => handlePick(btn, item));
      });
    }

    function handlePick(btn, item) {
      if (answered) return;
      answered = true;
      const ok = btn.dataset.t === item.t;
      root.querySelectorAll("#choices .choice").forEach((b) => {
        b.classList.add("disabled");
        b.disabled = true;
        if (b.dataset.t === item.t) b.classList.add("correct");
        else if (b === btn) b.classList.add("wrong");
      });
      if (ok) {
        state.correct += 1;
        if (P) P.markDone(item.k);
      }
      root.querySelector("#fb").innerHTML = `
        <div class="feedback ${ok ? "ok" : "bad"}">
          <strong>${ok ? "ถูกต้อง ✓" : "ยังไม่ถูก ✗"}</strong>
          <div style="white-space:pre-line;margin-top:4px;">${escapeHtml(item.k + (item.r ? "（" + item.r + "）" : "") + "\n" + item.t)}</div>
        </div>`;
      const nextBtn = root.querySelector("#next");
      nextBtn.style.display = "";
      if (ok && autoAdvance) advanceTimer = setTimeout(goNext, 850);
    }

    function done() {
      const pct = total > 0 ? Math.round((state.correct / total) * 100) : 0;
      root.innerHTML = `
        <div class="qprog">รวม ${state.correct} / ${total}</div>
        <div class="progress ok"><div class="bar" style="width:${pct}%"></div></div>
        <div class="score-card">
          <div>
            <h2 style="margin:0;">จบชุดตัวเลือก!</h2>
            <p class="subtle">${escapeHtml(label)} · ${total} ข้อ</p>
            <p class="subtle" style="margin-top:4px;">${pct >= 80 ? "เก่งมาก ✨" : pct >= 50 ? "ใกล้แล้ว ลองอีกรอบ" : "ฝึกบ่อย ๆ จะคุ้นเอง"}</p>
          </div>
          <div class="score-num">${state.correct} / ${total}</div>
        </div>
        <div class="btn-row">
          <button class="btn primary" id="chAgain">ทำอีกรอบ</button>
          <button class="btn ghost" id="chBack">← กลับเมนู</button>
        </div>
      `;
      root.querySelector("#chAgain").addEventListener("click", () => {
        state.i = 0; state.correct = 0;
        items = shuffle(items);
        draw();
      });
      root.querySelector("#chBack").addEventListener("click", () => onExit());
    }

    return root;
  }

  return { render };
})();
