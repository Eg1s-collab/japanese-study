/**
 * Dictation / 聞き取り · 読み — type the reading of a flashcard's front.
 *
 * Two modes share everything below the prompt (input, romaji conversion,
 * scoring, retry-wrong loop):
 *   - "listen": play TTS, the user types the reading they heard
 *   - "read":   show the kanji form, the user types the hiragana reading
 *
 * Reuses the flashcards storage: pick a deck (honouring its chunkSize /
 * selectedChunks), iterate eligible cards, accept hiragana or romaji.
 *
 * Sub-screens (kept in `state.screen`):
 *   - "home":     mode picker + deck browser
 *   - "session":  active drill for the selected deck
 */
window.DictationView = (function () {
  const FS = () => window.FlashcardsStorage;

  const state = {
    screen: "home",
    folderId: null,
    deckId: null,
    mode: "listen",  // "listen" | "read"
    shuffle: true,
    autoSpeak: true,
    starredOnly: false,
    daily: false,    // session pulls from the shared daily-words pool (read mode)
    expandedDeckId: null  // deck whose chunk-picker is open on the home screen
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
  function isKanaOnly(s) {
    return /^[\u3040-\u309f\u30a0-\u30ffー\s]+$/.test(String(s || "").trim());
  }
  function shuffleArr(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  // Pull readings out of a front like "会う(あう)" → ["あう"], or
  // "明日(あした, あす)" → ["あした", "あす"]. If the front has no parens
  // but is purely kana (e.g. "あした"), the front itself is the reading.
  // Returns null when no reading can be recovered.
  function extractReadings(front) {
    const s = String(front || "");
    const m = s.match(/[(（]([^()（）]+)[)）]/);
    if (m) {
      const parts = m[1].split(/[,、，;；/]/).map((t) => t.trim()).filter(Boolean);
      return parts.length ? parts : null;
    }
    if (isKanaOnly(s)) return [s.trim()];
    return null;
  }

  // Display form without the "(reading)" — that's the prompt's secret.
  function frontDisplay(front) {
    return String(front || "").replace(/\s*[(（][^()（）]+[)）]\s*/g, "").trim() || String(front || "");
  }

  function speak(text) {
    if (!("speechSynthesis" in window)) return;
    try {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = "ja-JP";
      u.rate = 0.9;
      window.speechSynthesis.speak(u);
    } catch (e) { /* ignore */ }
  }

  /* ---------- romaji → hiragana ---------- */
  const ROMAJI = {
    a: "あ", i: "い", u: "う", e: "え", o: "お",
    ka: "か", ki: "き", ku: "く", ke: "け", ko: "こ",
    sa: "さ", shi: "し", si: "し", su: "す", se: "せ", so: "そ",
    ta: "た", chi: "ち", ti: "ち", tsu: "つ", tu: "つ", te: "て", to: "と",
    na: "な", ni: "に", nu: "ぬ", ne: "ね", no: "の",
    ha: "は", hi: "ひ", fu: "ふ", hu: "ふ", he: "へ", ho: "ほ",
    ma: "ま", mi: "み", mu: "む", me: "め", mo: "も",
    ya: "や", yu: "ゆ", yo: "よ",
    ra: "ら", ri: "り", ru: "る", re: "れ", ro: "ろ",
    wa: "わ", wo: "を", nn: "ん",
    ga: "が", gi: "ぎ", gu: "ぐ", ge: "げ", go: "ご",
    za: "ざ", ji: "じ", zi: "じ", zu: "ず", ze: "ぜ", zo: "ぞ",
    da: "だ", di: "ぢ", du: "づ", de: "で", "do": "ど",
    ba: "ば", bi: "び", bu: "ぶ", be: "べ", bo: "ぼ",
    pa: "ぱ", pi: "ぴ", pu: "ぷ", pe: "ぺ", po: "ぽ",
    kya: "きゃ", kyu: "きゅ", kyo: "きょ",
    sha: "しゃ", shu: "しゅ", sho: "しょ", sya: "しゃ", syu: "しゅ", syo: "しょ",
    cha: "ちゃ", chu: "ちゅ", cho: "ちょ", cya: "ちゃ",
    tya: "ちゃ", tyu: "ちゅ", tyo: "ちょ",
    nya: "にゃ", nyu: "にゅ", nyo: "にょ",
    hya: "ひゃ", hyu: "ひゅ", hyo: "ひょ",
    mya: "みゃ", myu: "みゅ", myo: "みょ",
    rya: "りゃ", ryu: "りゅ", ryo: "りょ",
    gya: "ぎゃ", gyu: "ぎゅ", gyo: "ぎょ",
    ja: "じゃ", ju: "じゅ", jo: "じょ",
    jya: "じゃ", jyu: "じゅ", jyo: "じょ",
    zya: "じゃ", zyu: "じゅ", zyo: "じょ",
    bya: "びゃ", byu: "びゅ", byo: "びょ",
    pya: "ぴゃ", pyu: "ぴゅ", pyo: "ぴょ",
    "-": "ー"
  };
  function romajiToHiragana(input) {
    const s = String(input || "").toLowerCase().replace(/\s+/g, "");
    let out = "";
    let i = 0;
    while (i < s.length) {
      const ch = s[i];
      // Apostrophe disambiguates n: "kon'i" → こんい (n + i, not ko-ni)
      if (ch === "'") { i++; continue; }
      // Sokuon: doubled consonant (kk, tt, pp, ss, …) → っ + that consonant
      if (i + 1 < s.length && ch === s[i + 1] && /[kstpgdjzbcfhmr]/.test(ch)) {
        out += "っ";
        i++;
        continue;
      }
      // Solo / pre-consonant n → ん
      if (ch === "n" && (i + 1 >= s.length || !/[aiueoyn]/.test(s[i + 1]))) {
        out += "ん";
        i++;
        continue;
      }
      let matched = false;
      for (let len = 3; len >= 1; len--) {
        const sub = s.substr(i, len);
        if (ROMAJI[sub]) {
          out += ROMAJI[sub];
          i += len;
          matched = true;
          break;
        }
      }
      if (!matched) { out += ch; i++; }
    }
    return out;
  }

  // Katakana → hiragana, strip whitespace and punctuation, drop the
  // long-vowel mark (ー) since it can be written either way in user input.
  function normalize(s) {
    let t = String(s || "").trim();
    t = t.replace(/[\u30a1-\u30f6]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0x60));
    t = t.replace(/[\s・,、，;；/]/g, "");
    t = t.replace(/ー/g, "");
    return t;
  }

  function checkAnswer(userInput, expectedReadings) {
    const raw = String(userInput || "").trim();
    if (!raw) return false;
    const asKana = /^[a-zA-Z'\-\s]+$/.test(raw) ? romajiToHiragana(raw) : raw;
    const u = normalize(asKana);
    return expectedReadings.some((r) => normalize(r) === u);
  }

  /* ---------- eligibility ----------
   * A word is drill-able only when we can extract a reading AND the
   * front contains Japanese. In "read" mode we additionally drop pure-kana
   * words — the kanji-only prompt would equal the answer, which is pointless.
   */
  function eligibleWords(deck, mode) {
    const m = mode || state.mode;
    const words = FS().chunkWords(deck);
    return words.filter((w) => {
      if (!hasJapanese(w.front) || !extractReadings(w.front)) return false;
      if (m === "read") {
        const display = frontDisplay(w.front);
        if (isKanaOnly(display)) return false;
      }
      return true;
    });
  }

  function isReadEligible(front) {
    if (!hasJapanese(front) || !extractReadings(front)) return false;
    return !isKanaOnly(frontDisplay(front));
  }

  // The daily review keeps its OWN pool (DictationDaily), independent of the
  // flashcards "คำประจำวัน". Only the candidate knowledge (struggled vs.
  // mastered words) is shared. Tell DictationDaily which words qualify as
  // kanji-reading questions.
  if (window.DictationDaily) window.DictationDaily.setEligibility(isReadEligible);

  /* ---------- daily-words pool (read mode) ----------
   * Draws from DictationDaily — a dedicated daily set biased toward struggled
   * words plus some mastered ones, restricted to kanji-bearing words. Resolve
   * each {deckId, wordId} ref to its word; each carries its deckId so answers
   * write progress back to the right deck.
   */
  function dailyReadWords() {
    const FD = window.DictationDaily;
    if (!FD) return [];
    const out = [];
    const seen = new Set();
    FD.getItems().forEach((it) => {
      const key = it.deckId + "/" + it.wordId;
      if (seen.has(key)) return;
      seen.add(key);
      const d = FS().getDeck(it.deckId);
      if (!d) return;
      const w = (d.words || []).find((x) => x.id === it.wordId);
      if (!w || !isReadEligible(w.front)) return;
      out.push(Object.assign({}, w, { deckId: it.deckId }));
    });
    return out;
  }

  /* ---------- chunk panel (inline on home cards) ----------
   * Mirrors the flashcards deck-detail chunk picker but rendered in place,
   * so the user can pick sub-sets without leaving the dictation tab.
   */
  function renderChunkPanel(host, deck, onChange) {
    function draw() {
      const d = FS().getDeck(deck.id);
      const total = d.words.length;
      const chunkTotal = FS().chunkCount(d);
      const chunkOpts = [25, 50, 100].map((n) =>
        `<option value="${n}" ${d.chunkSize === n ? "selected" : ""}>${n} คำ/ชุด</option>`
      ).join("");
      const selectedSet = new Set(FS().selectedChunkIndices(d));
      const chunkChips = d.chunkSize ? Array.from({ length: chunkTotal }, (_, i) => {
        const from = i * d.chunkSize + 1;
        const to = Math.min(total, (i + 1) * d.chunkSize);
        const on = selectedSet.has(i);
        return `<button class="fc-chunk-chip ${on ? "is-on" : ""}" data-chunk="${i}" aria-pressed="${on}" type="button">
          <span class="fc-chunk-title">ชุด ${i + 1}</span>
          <span class="fc-chunk-range">${from}-${to}</span>
        </button>`;
      }).join("") : "";

      host.innerHTML = `
        <div class="fc-chunk-row" style="margin-top:10px;">
          <label class="fc-toggle" style="gap:8px;">
            <span>ขนาดชุด:</span>
            <select data-size class="level-select">
              <option value="" ${!d.chunkSize ? "selected" : ""}>ทั้งหมด</option>
              ${chunkOpts}
              <option value="custom">กำหนดเอง…</option>
            </select>
          </label>
        </div>
        ${d.chunkSize ? `
          <p class="subtle" style="margin:8px 0 4px;">เลือกชุดย่อยที่จะฝึก (เลือกหลายชุดได้)</p>
          <div class="fc-chunk-grid" data-grid>${chunkChips}</div>
          <div class="fc-chunk-actions">
            <button class="btn ghost" data-all type="button">เลือกทั้งหมด</button>
            <button class="btn ghost" data-invert type="button">สลับ</button>
            <button class="btn ghost" data-clear type="button">ล้าง (ชุด 1)</button>
          </div>
        ` : ""}
        <p class="subtle" style="margin:8px 0 0;">ค่านี้แชร์กับ “บัตรคำ”</p>
      `;
      host.querySelector("[data-size]").addEventListener("change", (e) => {
        const v = e.target.value;
        if (v === "custom") {
          const n = prompt("ขนาดต่อชุด (จำนวนคำ):", d.chunkSize || 50);
          const num = parseInt(n, 10);
          if (!isNaN(num) && num > 0) FS().setChunkSize(deck.id, num);
        } else {
          FS().setChunkSize(deck.id, v ? Number(v) : null);
        }
        if (onChange) onChange();
      });
      host.querySelectorAll("[data-chunk]").forEach((chip) => {
        chip.addEventListener("click", (e) => {
          e.stopPropagation();
          const idx = Number(chip.dataset.chunk);
          const current = new Set(FS().selectedChunkIndices(FS().getDeck(deck.id)));
          if (current.has(idx)) {
            if (current.size === 1) return;
            current.delete(idx);
          } else current.add(idx);
          FS().setSelectedChunks(deck.id, Array.from(current));
          if (onChange) onChange();
        });
      });
      const allBtn = host.querySelector("[data-all]");
      if (allBtn) allBtn.addEventListener("click", () => {
        const t = FS().chunkCount(FS().getDeck(deck.id));
        FS().setSelectedChunks(deck.id, Array.from({ length: t }, (_, i) => i));
        if (onChange) onChange();
      });
      const invBtn = host.querySelector("[data-invert]");
      if (invBtn) invBtn.addEventListener("click", () => {
        const dk = FS().getDeck(deck.id);
        const t = FS().chunkCount(dk);
        const cur = new Set(FS().selectedChunkIndices(dk));
        const next = [];
        for (let i = 0; i < t; i++) if (!cur.has(i)) next.push(i);
        FS().setSelectedChunks(deck.id, next.length ? next : [0]);
        if (onChange) onChange();
      });
      const clrBtn = host.querySelector("[data-clear]");
      if (clrBtn) clrBtn.addEventListener("click", () => {
        FS().setSelectedChunks(deck.id, [0]);
        if (onChange) onChange();
      });
    }
    draw();
  }

  /* ---------- hint options (read mode) ----------
   * Build 4 reading choices: the correct reading + 3 distractors drawn from
   * the same pool. Score each candidate for closeness to the correct reading
   * (shared first/last mora, equal length, overlapping characters) so the
   * decoys look genuinely confusable rather than obviously off.
   */
  function readingCloseness(correct, cand) {
    if (cand === correct) return -Infinity;
    let score = 0;
    score -= Math.abs(cand.length - correct.length) * 2;
    if (cand.length === correct.length) score += 4;
    if (cand[0] === correct[0]) score += 3;
    if (cand[cand.length - 1] === correct[correct.length - 1]) score += 2;
    const inCorrect = new Set(correct.split(""));
    cand.split("").forEach((c) => { if (inCorrect.has(c)) score += 1; });
    return score;
  }
  function buildHintOptions(word, pool) {
    const readings = extractReadings(word.front) || [];
    const correct = readings[0];
    if (!correct) return [];
    // Okurigana: the kana shown in the kanji form reappear in the reading at
    // the same edge (e.g. 悪い → ends い, 大きい → ends きい, お金 → starts お).
    // Every choice should carry the same kana in that spot, not just the answer.
    const display = frontDisplay(word.front);
    const tailRun = (display.match(/[\u3040-\u309fー]+$/) || [""])[0];
    const head = (display.match(/^[\u3040-\u309fー]+/) || [""])[0];
    const headOk = (r) => !head || r.startsWith(head);

    const cands = [];
    const seen = new Set([correct]);
    pool.forEach((w) => {
      if (w.id === word.id) return;
      const rs = extractReadings(w.front);
      if (!rs || !rs[0]) return;
      const r = rs[0];
      if (seen.has(r)) return;
      seen.add(r);
      cands.push(r);
    });

    const byClose = (a, b) => readingCloseness(correct, b) - readingCloseness(correct, a);

    // Trailing-okurigana variants, deepest first: "める" → ["める", "る"].
    // Use the deepest tail that has ≥3 sharing decoys; otherwise the shallowest
    // (the last kana alone) so at least the final position matches everywhere.
    const tails = [];
    for (let k = 0; k < tailRun.length; k++) tails.push(tailRun.slice(k));
    let matching;
    if (!tails.length) {
      matching = cands.filter(headOk).sort(byClose);
    } else {
      matching = [];
      for (let i = 0; i < tails.length; i++) {
        const set = cands.filter((r) => headOk(r) && r.endsWith(tails[i])).sort(byClose);
        if (set.length >= 3 || i === tails.length - 1) { matching = set; break; }
      }
    }
    const chosen = new Set(matching);
    const others = cands.filter((r) => !chosen.has(r)).sort(byClose);

    let picks;
    if (matching.length >= 3) {
      // Enough okurigana-sharing decoys: sample from the closest handful.
      const topPool = matching.slice(0, Math.max(3, Math.min(6, matching.length)));
      picks = shuffleArr(topPool).slice(0, 3);
    } else {
      // Too few — keep all that match, then fill with the closest remaining.
      picks = matching.concat(others.slice(0, 3 - matching.length));
    }
    return shuffleArr([correct, ...picks]);
  }

  /* ===================== top-level render ===================== */
  function render() {
    const root = document.createElement("div");
    if (state.screen === "home") root.appendChild(renderHome());
    else if (state.screen === "session") root.appendChild(renderSession());
    return root;
  }
  function refresh(container) {
    const fresh = render();
    container.replaceWith(fresh);
    return fresh;
  }

  /* ---------- daily-words card (read-mode home) ----------
   * Its own daily set (DictationDaily) — separate goal/regenerate from the
   * flashcards "คำประจำวัน". Starting it drills today's words as kanji-reading
   * questions.
   */
  function renderDailyCard(homeRoot) {
    const FD = window.DictationDaily;
    const card = document.createElement("section");
    card.className = "card daily-card";
    const goal = FD.getGoalCount();
    const words = dailyReadWords();
    const total = words.length;
    const reviewed = words.filter((w) => {
      const it = FD.getItems().find((x) => x.deckId === w.deckId && x.wordId === w.id);
      return it && (it.state === "learnDone");
    }).length;
    const pct = total ? Math.round((reviewed / total) * 100) : 0;
    const allDone = total > 0 && reviewed >= total;

    card.innerHTML = `
      <div class="daily-head">
        <div class="daily-title-row">
          <span class="daily-emoji">📅</span>
          <h3 class="daily-title">คำประจำวัน · ทบทวนอ่านคันจิ</h3>
          <span class="daily-target subtle">${total}/${goal} คำ</span>
        </div>
        <div class="btn-row" style="margin:0;">
          <button class="btn ghost" id="dictDailyRegen" title="สลับคำประจำวันชุดใหม่">↻ สุ่มใหม่</button>
          <button class="btn ghost" id="dictDailyGoal" title="ตั้งจำนวนคำต่อวัน">⚙ ตั้งจำนวน</button>
        </div>
      </div>
      ${total === 0 ? `
        <p class="subtle daily-empty">ยังไม่มีคำที่มีคันจิให้ทบทวน — ฝึก Flash Card/Learn ในบัตรคำสักรอบ แล้วระบบจะดึงคำที่เคย “ยังไม่ได้” มาทบทวนที่นี่</p>
      ` : `
        <div class="daily-stat" style="margin-top:8px;">
          <div class="daily-stat-row">
            <span><strong>${reviewed}</strong> / ${total} คำทบทวนวันนี้</span>
            ${allDone ? `<span class="subtle">· ครบแล้ว ✓</span>` : ""}
          </div>
          <div class="progress ${allDone ? "ok" : ""}"><div class="bar" style="width:${pct}%"></div></div>
        </div>
        <p class="subtle" style="margin:8px 0 0;">ทบทวนคำที่เคยผิดและคำที่เคยทำได้แล้ว — ชุดเฉพาะของอ่านคันจิ แยกจาก “คำประจำวัน” ในบัตรคำ</p>
        <div class="btn-row daily-actions">
          <button class="btn primary" id="dictDailyStart">📅 เริ่มทบทวน (${total} คำ)</button>
        </div>
      `}
    `;
    const regen = card.querySelector("#dictDailyRegen");
    if (regen) regen.addEventListener("click", () => {
      if (!confirm("สุ่มคำประจำวันชุดใหม่? ความคืบหน้าของชุดเดิมจะถูกแทนที่")) return;
      FD.regenerate();
      refresh(homeRoot);
    });
    const goalBtn = card.querySelector("#dictDailyGoal");
    if (goalBtn) goalBtn.addEventListener("click", () => {
      const v = prompt(`จำนวนคำต่อวัน (${FD.MIN_COUNT}–${FD.MAX_COUNT}):`, String(FD.getGoalCount()));
      if (v == null) return;
      const n = parseInt(v, 10);
      if (!Number.isFinite(n) || n < FD.MIN_COUNT || n > FD.MAX_COUNT) {
        alert(`กรุณาใส่ตัวเลขระหว่าง ${FD.MIN_COUNT} ถึง ${FD.MAX_COUNT}`);
        return;
      }
      FD.setGoalCount(n);
      refresh(homeRoot);
    });
    const start = card.querySelector("#dictDailyStart");
    if (start) start.addEventListener("click", () => {
      state.daily = true;
      state.deckId = null;
      state.screen = "session";
      refresh(homeRoot);
    });
    return card;
  }

  /* ===================== HOME (deck picker) ===================== */
  function renderHome() {
    const data = FS().load();
    const folder = state.folderId ? data.folders.find((f) => f.id === state.folderId) : null;
    const visibleDecks = state.folderId
      ? data.decks.filter((d) => d.folderId === state.folderId)
      : data.decks.filter((d) => !d.folderId);

    const root = document.createElement("div");
    const isListen = state.mode === "listen";
    const headTitle = isListen ? "🎧 ฟังเขียน · 聞き取り" : "漢 อ่านคันจิ · 読み";
    const subHint = isListen
      ? "เปิดเสียง แล้วพิมพ์ฮิรางานะ (หรือโรมาจิ) ที่ได้ยิน — ใช้ชุดคำจาก “บัตรคำ”"
      : "ดูคันจิ แล้วพิมพ์คำอ่านเป็นฮิรางานะ (หรือโรมาจิ) — ใช้ชุดคำจาก “บัตรคำ”";
    root.innerHTML = `
      <div class="qmeta">
        <h2 style="margin:0;">${headTitle} ${folder ? "· " + escapeHtml(folder.name) : ""}</h2>
        <div class="btn-row" style="margin:0;">
          ${folder ? `<button class="btn ghost" id="backRoot">← กลับ</button>` : ""}
        </div>
      </div>
      <div class="fc-toolbar" id="modePicker" role="tablist" aria-label="เลือกโหมด">
        <button class="btn ${isListen ? "primary" : "ghost"}" data-mode="listen" role="tab" aria-selected="${isListen}">🎧 ฟัง → เขียนคำอ่าน</button>
        <button class="btn ${!isListen ? "primary" : "ghost"}" data-mode="read" role="tab" aria-selected="${!isListen}">漢 อ่านคันจิ → เขียนคำอ่าน</button>
      </div>
      <p class="subtle">${subHint}</p>
      <div id="fc-body"></div>
    `;
    root.querySelectorAll("#modePicker [data-mode]").forEach((btn) => {
      btn.addEventListener("click", () => {
        if (state.mode === btn.dataset.mode) return;
        state.mode = btn.dataset.mode;
        refresh(root);
      });
    });
    const body = root.querySelector("#fc-body");

    // Daily-words review — read mode only, at the library root (not inside a folder).
    if (!isListen && !state.folderId && window.DictationDaily) {
      body.appendChild(renderDailyCard(root));
    }

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
        `;
        card.addEventListener("click", () => {
          state.folderId = f.id; refresh(root);
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
        const eligible = eligibleWords(d).length;
        const totalChunk = FS().chunkWords(d).length;
        const card = document.createElement("div");
        card.className = "card unit-card" + (eligible === 0 ? " dim" : "");
        const badgeIcon = isListen ? "🎧" : "漢";
        const badgeWord = isListen ? "คำที่ฟังได้" : "คำที่มีคันจิ";
        const expanded = state.expandedDeckId === d.id;
        const chunkLabel = d.chunkSize
          ? `แบ่ง ${d.chunkSize} · เลือก ${FS().selectedChunkIndices(d).length}/${FS().chunkCount(d)} ชุด`
          : "ทั้งหมด";
        card.innerHTML = `
          <div class="badge">${badgeIcon} ${eligible} / ${totalChunk} ${badgeWord}</div>
          <h3>${escapeHtml(d.name)}</h3>
          <p class="subtle">${chunkLabel} · ${d.words.length} คำในชุด</p>
          <div class="btn-row">
            <button class="btn primary" data-start ${eligible === 0 ? "disabled" : ""}>เริ่ม</button>
            <button class="btn ghost" data-chunks aria-expanded="${expanded}">⚙ ชุดย่อย${expanded ? " ▲" : " ▼"}</button>
          </div>
          <div class="dict-chunk-panel" data-chunk-panel ${expanded ? "" : "hidden"}></div>
        `;
        card.querySelector("[data-start]").addEventListener("click", (e) => {
          e.stopPropagation();
          if (eligible === 0) return;
          state.screen = "session"; state.deckId = d.id; state.daily = false;
          refresh(root);
        });
        card.querySelector("[data-chunks]").addEventListener("click", (e) => {
          e.stopPropagation();
          state.expandedDeckId = expanded ? null : d.id;
          refresh(root);
        });
        if (expanded) {
          renderChunkPanel(card.querySelector("[data-chunk-panel]"), d, () => refresh(root));
        }
        decks.appendChild(card);
      });
      body.appendChild(decks);
    }

    if (!data.folders.length && !visibleDecks.length) {
      const empty = document.createElement("div");
      empty.className = "empty";
      empty.textContent = "ยังไม่มีชุดคำ — ไปสร้างที่แท็บ “บัตรคำ” ก่อน";
      body.appendChild(empty);
    }

    if (folder) {
      root.querySelector("#backRoot").addEventListener("click", () => {
        state.folderId = null; refresh(root);
      });
    }
    return root;
  }

  /* ===================== SESSION ===================== */
  function renderSession() {
    if (state.daily) state.mode = "read";  // daily review is always kanji-reading
    const deck = state.daily ? null : FS().getDeck(state.deckId);
    const root = document.createElement("div");
    if (!state.daily && !deck) { state.screen = "home"; return renderHome(); }

    const BATCH_SIZE = 10;
    const sessionTitle = state.daily ? "คำประจำวัน · ทบทวน" : deck.name;

    function buildPool() {
      let p = state.daily ? dailyReadWords() : eligibleWords(deck);
      if (state.starredOnly) p = p.filter((w) => w.starred);
      if (state.shuffle) p = shuffleArr(p);
      return p;
    }
    // In daily mode a correct/wrong answer writes progress back to the source
    // deck (and the dictation daily pool) so tomorrow keeps surfacing weak words.
    function recordDaily(word, ok) {
      if (!state.daily || !word || !word.deckId) return;
      const FD = window.DictationDaily;
      if (ok) {
        FS().markLearnCompleted(word.deckId, word.id);
        if (FD) FD.setItemState(word.deckId, word.id, "learnDone");
      } else {
        FS().markCardUnknown(word.deckId, word.id);
        if (FD) FD.setItemState(word.deckId, word.id, "cardsUnknown");
      }
    }

    let pool = buildPool();

    // Learn-style batching: work through the pool 10 words at a time. A wrong
    // answer re-queues that word at the end of the current batch, so the batch
    // isn't finished until every word in it has been answered correctly once.
    let batchStart = 0;            // index in `pool` of the current batch's first word
    let batchQueue = [];           // working queue for the batch (wrongs get re-appended)
    let batchPos = 0;              // cursor into batchQueue
    let batchSize = 0;             // distinct words in the current batch
    let batchMastered = new Set(); // ids answered correctly in the current batch
    let answered = false;
    let correctCount = 0;
    let wrongCount = 0;
    // Words the user got wrong this session — offered as a "retry only these" round.
    const wrongIds = [];
    // Hint panel (read mode) stays open across questions once the user opens it.
    let hintOpen = false;

    function startBatch() {
      const slice = pool.slice(batchStart, batchStart + BATCH_SIZE);
      batchSize = slice.length;
      batchQueue = slice.slice();
      batchPos = 0;
      batchMastered = new Set();
    }
    function currentWord() { return batchQueue[batchPos] || null; }

    function goBack() {
      if (window.speechSynthesis) window.speechSynthesis.cancel();
      state.screen = "home"; state.daily = false; refresh(root);
    }

    function renderHeader() {
      const isListen = state.mode === "listen";
      const icon = isListen ? "🎧" : "漢";
      const hint = isListen
        ? "ฟัง แล้วพิมพ์ฮิรางานะหรือโรมาจิที่ได้ยิน"
        : "ดูคันจิ แล้วพิมพ์คำอ่านเป็นฮิรางานะหรือโรมาจิ";
      return `
        <div class="qmeta">
          <h2 style="margin:0;">${icon} ${escapeHtml(sessionTitle)}</h2>
          <button class="btn ghost" id="back">← กลับ</button>
        </div>
        <p class="subtle">${hint} · ${pool.length} คำในรอบนี้</p>
      `;
    }
    function renderToolbar() {
      const isListen = state.mode === "listen";
      return `
        <div class="fc-toolbar fc-toolbar-sticky">
          <label class="fc-toggle"><input type="checkbox" data-opt="shuffle" ${state.shuffle ? "checked" : ""}/> สลับลำดับ</label>
          <label class="fc-toggle"><input type="checkbox" data-opt="starredOnly" ${state.starredOnly ? "checked" : ""}/> ดาวเท่านั้น</label>
          ${isListen ? `<label class="fc-toggle"><input type="checkbox" data-opt="autoSpeak" ${state.autoSpeak ? "checked" : ""}/> 🔊 เล่นอัตโนมัติ</label>` : ""}
        </div>
      `;
    }
    function bindHeader() { root.querySelector("#back").addEventListener("click", goBack); }
    function bindToolbar() {
      root.querySelectorAll(".fc-toolbar input[data-opt]").forEach((cb) => {
        cb.addEventListener("change", () => {
          state[cb.dataset.opt] = cb.checked;
          // Toggles that change the pool restart the session; autoSpeak just flips.
          if (cb.dataset.opt === "autoSpeak") {
            if (!cb.checked && window.speechSynthesis) window.speechSynthesis.cancel();
            else playCurrent();
            return;
          }
          // Re-enter the session with the new options
          refresh(root);
        });
      });
    }

    function playCurrent() {
      const w = currentWord();
      if (!w) return;
      const readings = extractReadings(w.front);
      if (!readings || !readings.length) return;
      speak(readings[0]);
    }

    function draw() {
      // No eligible words at all
      if (!pool.length) {
        const emptyMsg = state.mode === "listen"
          ? "ไม่มีคำที่ฟังได้ในชุดย่อยนี้"
          : "ไม่มีคำที่มีคันจิในชุดย่อยนี้";
        root.innerHTML = `
          ${renderHeader()}
          ${renderToolbar()}
          <div class="empty">${emptyMsg}${state.starredOnly ? " (ลองปิด “ดาวเท่านั้น”)" : ""}</div>
        `;
        bindHeader(); bindToolbar();
        return;
      }

      // End of session
      if (batchStart >= pool.length) {
        const total = correctCount + wrongCount;
        const pct = total ? Math.round((correctCount / total) * 100) : 0;
        root.innerHTML = `
          ${renderHeader()}
          ${renderToolbar()}
          <div class="qprog">เสร็จแล้ว: ถูก ${correctCount} · ผิด ${wrongCount}</div>
          <div class="progress ${wrongCount === 0 ? "ok" : ""}"><div class="bar" style="width:${pct}%"></div></div>
          <div class="score-card">
            <div>
              <h2 style="margin:0;">${wrongCount === 0 ? "เก่งมาก! ถูกทั้งหมด" : "จบรอบนี้แล้ว"}</h2>
              <p class="subtle">คะแนน ${correctCount}/${total} (${pct}%)</p>
            </div>
            <div class="score-num">${wrongCount === 0 ? "✓" : pct + "%"}</div>
          </div>
          <div class="btn-row">
            ${wrongIds.length ? `<button class="btn primary" id="retryWrong">ทบทวนเฉพาะ ${wrongIds.length} คำที่ผิด</button>` : ""}
            <button class="btn" id="restart">เริ่มรอบใหม่</button>
            <button class="btn ghost" id="back2">กลับสู่รายการ</button>
          </div>
        `;
        bindHeader(); bindToolbar();
        const retry = root.querySelector("#retryWrong");
        if (retry) retry.addEventListener("click", () => {
          const ids = new Set(wrongIds);
          pool = pool.filter((w) => ids.has(w.id));
          if (state.shuffle) pool = shuffleArr(pool);
          batchStart = 0; correctCount = 0; wrongCount = 0; answered = false;
          wrongIds.length = 0;
          startBatch();
          draw();
        });
        root.querySelector("#restart").addEventListener("click", () => {
          pool = buildPool();
          batchStart = 0; correctCount = 0; wrongCount = 0; answered = false;
          wrongIds.length = 0;
          startBatch();
          draw();
        });
        root.querySelector("#back2").addEventListener("click", goBack);
        return;
      }

      const w = currentWord();
      const total = pool.length;
      const overallDone = batchStart + batchMastered.size;
      const pct = total ? Math.round((overallDone / total) * 100) : 0;
      const batchNum = Math.floor(batchStart / BATCH_SIZE) + 1;
      const batchTotal = Math.ceil(total / BATCH_SIZE) || 1;
      // A word re-queued after a wrong answer is a review attempt.
      const isReview = wrongIds.includes(w.id) && !batchMastered.has(w.id);

      const isListen = state.mode === "listen";
      const promptInner = isListen
        ? `<div class="fc-learn-q" id="prompt" aria-label="เล่นเสียงคำ">🎧</div>
           <button class="btn primary fc-speak" id="speakBtn" title="เล่นเสียงอีกครั้ง">🔊 เล่นอีกครั้ง</button>`
        : `<div class="fc-learn-q" id="prompt">${escapeHtml(frontDisplay(w.front))}</div>
           <button class="btn ghost fc-speak" id="speakBtn" title="ฟังคำอ่าน (เฉลยเสียง)">🔊</button>`;
      const hintInner = isListen
        ? `พิมพ์สิ่งที่ได้ยินเป็นฮิรางานะ หรือพิมพ์โรมาจิ เช่น <code>あう</code> หรือ <code>au</code>`
        : `พิมพ์คำอ่านของคันจิด้านบนเป็นฮิรางานะ หรือพิมพ์โรมาจิ`;

      root.innerHTML = `
        ${renderHeader()}
        ${renderToolbar()}
        <div class="qprog">ชุด ${batchNum}/${batchTotal} · ในชุดนี้ ${batchMastered.size}/${batchSize}${isReview ? ` · 🔁 ทบทวน` : ""} · ถูก ${correctCount} · ผิด ${wrongCount}</div>
        <div class="progress"><div class="bar" style="width:${pct}%"></div></div>

        <div class="card">
          <div class="fc-learn-prompt">
            ${promptInner}
          </div>
          <p class="subtle" style="margin:6px 0 10px;">${hintInner}</p>
          <input type="text" class="txt-input" id="ansInput"
            placeholder="พิมพ์คำตอบ หรือกดแป้นพิมพ์ด้านล่าง"
            autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" />
          <div id="kbSlot"></div>
          <div class="btn-row">
            <button class="btn primary" id="checkBtn">ตรวจ</button>
            <button class="btn ghost" id="showBtn">เฉลย</button>
            ${!isListen ? `<button class="btn ghost" id="hintBtn">💡 คำใบ้</button>` : ""}
            <button class="btn" id="skipBtn">ข้อถัดไป →</button>
          </div>
          <div id="hintSlot"></div>
          <div id="fb"></div>
        </div>
      `;
      bindHeader(); bindToolbar();

      const input = root.querySelector("#ansInput");
      if (window.KanaKeypad) {
        const slot = root.querySelector("#kbSlot");
        if (slot) slot.appendChild(window.KanaKeypad.create(input));
      }
      // When the hint is open in read mode the user answers by tapping a
      // choice, so don't steal focus (which would pop the on-screen keyboard).
      if (!(state.mode === "read" && hintOpen)) input.focus();

      root.querySelector("#speakBtn").addEventListener("click", playCurrent);

      function doCheck() {
        if (answered) return null;
        const readings = extractReadings(w.front) || [];
        const ok = checkAnswer(input.value, readings);
        answered = true;
        recordDaily(w, ok);
        const fb = root.querySelector("#fb");
        if (ok) {
          correctCount++;
          batchMastered.add(w.id);
          fb.innerHTML = `
            <div class="feedback ok">
              <strong>ถูกต้อง ✓</strong>
              <div style="margin-top:4px;">
                ${escapeHtml(frontDisplay(w.front))} → <b>${escapeHtml(readings[0])}</b>
                ${w.back ? ` · <span class="subtle">${escapeHtml(w.back)}</span>` : ""}
              </div>
            </div>`;
        } else {
          wrongCount++;
          if (!wrongIds.includes(w.id)) wrongIds.push(w.id);
          // Re-queue this word at the end of the batch so it comes back.
          batchQueue.push(w);
          fb.innerHTML = `
            <div class="feedback bad">
              <strong>ยังไม่ถูก ✗</strong>
              <div style="margin-top:4px;">
                เฉลย: <b>${escapeHtml(readings.join(", "))}</b>
                · ${escapeHtml(frontDisplay(w.front))}
                ${w.back ? ` · <span class="subtle">${escapeHtml(w.back)}</span>` : ""}
              </div>
            </div>`;
        }
        return ok;
      }
      function doNext() {
        answered = false;
        batchPos++;
        // Skip any re-queued copies of words already mastered this batch.
        while (batchPos < batchQueue.length && batchMastered.has(batchQueue[batchPos].id)) {
          batchPos++;
        }
        if (batchPos >= batchQueue.length) {
          // Batch fully answered — advance to the next 10-word batch.
          batchStart += BATCH_SIZE;
          if (batchStart < pool.length) startBatch();
        }
        draw();
      }
      function doReveal() {
        if (answered) return;
        const readings = extractReadings(w.front) || [];
        const fb = root.querySelector("#fb");
        fb.innerHTML = `
          <div class="feedback ok">
            <strong>เฉลย</strong>
            <div style="margin-top:4px;">
              ${escapeHtml(frontDisplay(w.front))} → <b>${escapeHtml(readings.join(", "))}</b>
              ${w.back ? ` · <span class="subtle">${escapeHtml(w.back)}</span>` : ""}
            </div>
          </div>`;
      }
      root.querySelector("#checkBtn").addEventListener("click", doCheck);
      root.querySelector("#showBtn").addEventListener("click", doReveal);
      root.querySelector("#skipBtn").addEventListener("click", doNext);

      // Render (or clear) the choice hint for the *current* word. Called on
      // every draw so the panel persists across questions once opened.
      function renderHint() {
        const slot = root.querySelector("#hintSlot");
        if (!slot) return;
        if (!hintOpen) { slot.innerHTML = ""; return; }
        const opts = buildHintOptions(w, pool);
        if (!opts.length) { slot.innerHTML = ""; return; }
        const correct = (extractReadings(w.front) || [])[0];
        slot.innerHTML = `
          <div class="dict-hint">
            <div class="subtle" style="margin-bottom:6px;">💡 เลือกคำอ่านที่ใช่ — ระบบจะตรวจและไปข้อถัดไปให้</div>
            <div class="dict-hint-grid">
              ${opts.map((o) => `<button class="btn ghost dict-hint-opt" type="button" data-opt="${escapeHtml(o)}">${escapeHtml(o)}</button>`).join("")}
            </div>
          </div>`;
        slot.querySelectorAll(".dict-hint-opt").forEach((b) => {
          b.addEventListener("click", () => {
            if (answered) return;
            input.value = b.dataset.opt;
            const ok = doCheck();
            // Lock the panel and mark the chosen / correct options.
            slot.querySelectorAll(".dict-hint-opt").forEach((x) => {
              x.disabled = true;
              if (x.dataset.opt === correct) x.classList.add("is-correct");
            });
            if (!ok) b.classList.add("is-wrong");
            setTimeout(doNext, ok ? 700 : 1500);
          });
        });
      }

      const hintBtn = root.querySelector("#hintBtn");
      if (hintBtn) {
        hintBtn.classList.toggle("primary", hintOpen);
        hintBtn.classList.toggle("ghost", !hintOpen);
        hintBtn.addEventListener("click", () => {
          hintOpen = !hintOpen;
          hintBtn.classList.toggle("primary", hintOpen);
          hintBtn.classList.toggle("ghost", !hintOpen);
          renderHint();
        });
      }
      renderHint();
      input.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          if (!answered) doCheck();
          else doNext();
        }
      });

      if (state.mode === "listen" && state.autoSpeak) {
        // Slight delay so the synth picks up after the DOM swap on iOS Safari.
        setTimeout(playCurrent, 120);
      }
    }

    startBatch();
    draw();
    return root;
  }

  return { render };
})();
