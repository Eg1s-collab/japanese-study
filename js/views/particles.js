/**
 * Particles view — แบบฝึกหัดเฉพาะคำช่วย は・が・を・に・で・へ
 * แยก bank (window.PARTICLE_BANK) ออกจาก unit quizzes
 *
 * UI flow:
 *   1) renderSelector — เลือกชนิดคำช่วย (ทั้งหมด / 6 ตัว) + จำนวนข้อสูงสุด
 *   2) renderRun      — ทำโจทย์ทีละข้อ มี particle-keypad ให้กดเลือก
 *   3) renderDone     — สรุปคะแนน
 *
 * ทุกข้อใช้รูป fill-in: ผู้ใช้พิมพ์ตัวอักษร 1 ตัวหรือกดปุ่ม
 * accept[] เป็น array — บางข้อยอมรับทั้ง に และ へ
 */
window.ParticlesView = (function () {
  const PREF_KEY = "jp_particles_pref_v1";
  const ALL = "__all__";

  function loadPref() {
    try {
      const raw = localStorage.getItem(PREF_KEY);
      if (!raw) return { filter: ALL, max: 15 };
      const obj = JSON.parse(raw);
      return {
        filter: typeof obj.filter === "string" ? obj.filter : ALL,
        max: Number.isFinite(obj.max) ? clampMax(obj.max) : 15
      };
    } catch (_) {
      return { filter: ALL, max: 15 };
    }
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

  function pool(filter) {
    const bank = window.PARTICLE_BANK || [];
    if (filter === ALL) return bank.slice();
    return bank.filter((it) => it.particle === filter);
  }

  /* คำอธิบายว่า "ทำไม" ถึงต้องใช้คำช่วยแต่ละตัว
     pron = ตัวอ่าน (เฉพาะที่ออกเสียงต่างจากตัวเขียน)
     tagline = ใช้บอกอะไร (สั้น ๆ บน chip)
     uses[]  = หน้าที่ย่อย ๆ + ตัวอย่าง */
  const PARTICLE_GUIDE = {
    "は": {
      pron: "wa",
      tagline: "ชี้หัวเรื่อง",
      summary: "บอกว่า 'กำลังพูดถึงอะไร' — เป็นป้ายชื่อของหัวข้อในประโยค ไม่ใช่ประธานทางไวยากรณ์โดยตรง",
      uses: [
        { label: "หัวเรื่อง (topic)", ex: "わたし**は** タイ人です。", th: "ฉัน(หัวเรื่อง) เป็นคนไทย" },
        { label: "เปรียบเทียบ / เน้นข้อปฏิเสธ", ex: "コーヒー**は** のみません。", th: "(เรื่อง)กาแฟไม่ดื่ม (แต่อาจดื่มอย่างอื่น)" }
      ]
    },
    "が": {
      tagline: "ประธาน / ข้อมูลใหม่",
      summary: "ชี้ประธานทางไวยากรณ์ มักใช้กับสิ่งที่ผู้ฟังยังไม่รู้ หรือคำถาม/ตอบที่เน้นว่า 'ใคร/อะไร'",
      uses: [
        { label: "あります・います (มี/อยู่)", ex: "へやに ねこ**が** います。", th: "ในห้องมีแมว" },
        { label: "好き・上手・わかる・ほしい・できる", ex: "わたしは すし**が** すきです。", th: "ฉันชอบซูชิ" },
        { label: "คำถาม/ตอบ ใคร-อะไรเป็นประธาน", ex: "だれ**が** きましたか。", th: "ใครมาคะ?" },
        { label: "ประธานในประโยคย่อย (ขยาย N)", ex: "やまださん**が** すんでいる うち", th: "บ้านที่คุณยามาดะอยู่" }
      ]
    },
    "を": {
      pron: "o",
      tagline: "กรรมตรง / จุดออก / เส้นทาง",
      summary: "ระบุสิ่งที่ถูกกระทำ (กรรมตรง). มีหน้าที่พิเศษกับกริยาเคลื่อนที่บางตัว",
      uses: [
        { label: "กรรมตรงของกริยา", ex: "ごはん**を** たべます。", th: "กินข้าว" },
        { label: "จุดออก (でる・おりる)", ex: "うち**を** でます。", th: "ออกจากบ้าน" },
        { label: "เส้นทางที่ผ่าน (あるく・さんぽする・わたる)", ex: "こうえん**を** さんぽします。", th: "เดินเล่นในสวน" }
      ]
    },
    "に": {
      tagline: "เวลา / ปลายทาง / ที่อยู่ / ผู้รับ",
      summary: "คำช่วย 'จุด' — จุดเวลา จุดปลายทาง จุดที่อยู่ จุดที่มอบให้ ฯลฯ",
      uses: [
        { label: "จุดเวลา (เวลาเจาะจง)", ex: "7じ**に** おきます。", th: "ตื่น 7 โมง" },
        { label: "ปลายทางของกริยาเคลื่อนที่", ex: "がっこう**に** いきます。", th: "ไปโรงเรียน (= がっこうへ)" },
        { label: "ที่อยู่กับ あります／います", ex: "じむしょ**に** います。", th: "อยู่ที่ออฟฟิศ" },
        { label: "ผู้รับ (あげる・もらう・くれる・おしえる)", ex: "ともだち**に** プレゼントを あげました。", th: "ให้ของขวัญเพื่อน" },
        { label: "ผู้กระทำใน passive / ผู้ทำให้ใน もらう", ex: "あめ**に** ふられました。", th: "ฝนตกใส่ (เดือดร้อน)" },
        { label: "กลายเป็น (なります)", ex: "いしゃ**に** なります。", th: "จะเป็นหมอ" }
      ]
    },
    "で": {
      tagline: "สถานที่ทำกิจกรรม / เครื่องมือ / ขอบเขต",
      summary: "ตอบคำถาม 'ที่ไหน-ด้วยอะไร-เพราะอะไร' ที่เกี่ยวกับการกระทำ ต่างจาก に ที่บอกแค่จุด",
      uses: [
        { label: "สถานที่ทำ action", ex: "としょかん**で** べんきょうします。", th: "เรียนที่ห้องสมุด" },
        { label: "เครื่องมือ / พาหนะ", ex: "はし**で** たべます。 / バス**で** いきます。", th: "กินด้วยตะเกียบ / ไปโดยรถบัส" },
        { label: "ภาษาที่ใช้", ex: "日本語**で** はなします。", th: "พูดเป็นภาษาญี่ปุ่น" },
        { label: "สาเหตุ (ที่ไม่ใช่เจตนา)", ex: "かぜ**で** やすみました。", th: "หยุดเพราะเป็นหวัด" },
        { label: "ขอบเขต/รวม (sum / total / group)", ex: "ぜんぶ**で** 3,000円。", th: "รวมทั้งหมด 3,000 เยน" }
      ]
    },
    "へ": {
      pron: "e",
      tagline: "ทิศทางมุ่งไป",
      summary: "บอก 'ทิศทาง' ของการเคลื่อนที่ — เน้นว่า 'มุ่งหน้าสู่' (มักใช้ に แทนได้ ยกเว้นจ่าหน้าจดหมาย)",
      uses: [
        { label: "ทิศทางการเคลื่อนที่", ex: "日本**へ** いきます。", th: "ไปประเทศญี่ปุ่น (= 日本に)" },
        { label: "จ่าหน้าจดหมาย / ของฝาก (เป็น へ มาตรฐาน)", ex: "ともだち**へ** てがみを かきました。", th: "เขียนจดหมายถึงเพื่อน" }
      ]
    }
  };

  // เน้นข้อความใน **...** ให้เป็นตัวหนา (หลัง escape HTML แล้ว)
  function bold(s) {
    return escapeHtml(s).replace(/\*\*(.+?)\*\*/g, "<b>$1</b>");
  }

  function guideCardsHtml() {
    const list = (window.PARTICLE_LIST || ["は", "が", "を", "に", "で", "へ"]);
    return list.map((p) => {
      const g = PARTICLE_GUIDE[p];
      if (!g) return "";
      const usesHtml = g.uses.map((u) =>
        `<li><span class="pt-use-label">${escapeHtml(u.label)}</span>
           <div class="pt-use-ex"><span class="pt-use-jp">${bold(u.ex)}</span> <span class="pt-use-th">— ${escapeHtml(u.th)}</span></div>
         </li>`
      ).join("");
      return `
        <details class="pt-guide" data-p="${escapeAttr(p)}">
          <summary>
            <span class="pt-guide-jp">${escapeHtml(p)}${g.pron ? `<span class="pt-guide-pron">(${escapeHtml(g.pron)})</span>` : ""}</span>
            <span class="pt-guide-tag">${escapeHtml(g.tagline)}</span>
          </summary>
          <p class="pt-guide-sum">${escapeHtml(g.summary)}</p>
          <ul class="pt-use-list">${usesHtml}</ul>
        </details>
      `;
    }).join("");
  }

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function render(onBack) {
    return renderSelector(onBack);
  }

  /* ---------- หน้าเลือกตัวกรอง ---------- */
  function renderSelector(onBack) {
    const root = document.createElement("div");
    const pref = loadPref();
    const list = (window.PARTICLE_LIST || ["は", "が", "を", "に", "で", "へ"]);
    const total = (window.PARTICLE_BANK || []).length;

    const counts = {};
    list.forEach((p) => { counts[p] = 0; });
    (window.PARTICLE_BANK || []).forEach((it) => {
      counts[it.particle] = (counts[it.particle] || 0) + 1;
    });

    const chips = list
      .map((p) => `
        <button class="pt-chip ${pref.filter === p ? "on" : ""}" data-p="${escapeAttr(p)}" type="button">
          <span class="pt-chip-jp">${escapeHtml(p)}</span>
          <span class="pt-chip-count">${counts[p] || 0} ข้อ</span>
        </button>
      `).join("");

    root.innerHTML = `
      <h2>คำช่วยเฉพาะจุด</h2>
      <p class="subtle">ฝึกเติม は・が・を・に・で・へ จากคลังแยกของตัวเอง (${total} ข้อ) — โจทย์ที่ผสมจาก Minna no Nihongo + แต่งใหม่</p>

      <div class="card">
        <h3 class="pt-section-title">ทำไมต้องใช้คำช่วยแต่ละตัว — แตะหัวข้อเพื่อขยายอ่าน</h3>
        <div class="pt-guides">
          ${guideCardsHtml()}
        </div>
      </div>

      <div class="card">
        <h3 class="pt-section-title">เลือกคำช่วย</h3>
        <div class="pt-chips">
          <button class="pt-chip ${pref.filter === ALL ? "on" : ""}" data-p="${ALL}" type="button">
            <span class="pt-chip-jp">ทั้งหมด</span>
            <span class="pt-chip-count">${total} ข้อ</span>
          </button>
          ${chips}
        </div>

        <div class="controls pt-controls" style="margin-top:14px;">
          <label class="inline-field">
            <span>จำนวนข้อสูงสุด</span>
            <input type="number" id="ptMax" min="1" max="100" value="${pref.max}" />
          </label>
          <button class="btn primary" id="ptStart">เริ่ม</button>
        </div>
      </div>
    `;

    const maxInput = root.querySelector("#ptMax");
    let curFilter = pref.filter;

    root.querySelectorAll(".pt-chip").forEach((btn) => {
      btn.addEventListener("click", () => {
        curFilter = btn.dataset.p;
        root.querySelectorAll(".pt-chip").forEach((b) => b.classList.toggle("on", b === btn));
        // เปิดการ์ดอธิบายของคำช่วยที่เลือก (ถ้ามี)
        const guide = root.querySelector(`.pt-guide[data-p="${curFilter}"]`);
        if (guide) {
          guide.open = true;
          guide.scrollIntoView({ behavior: "smooth", block: "nearest" });
        }
      });
    });

    const applyMax = () => {
      const v = clampMax(maxInput.value);
      maxInput.value = v;
    };
    maxInput.addEventListener("change", applyMax);
    maxInput.addEventListener("blur", applyMax);

    root.querySelector("#ptStart").addEventListener("click", () => {
      const max = clampMax(maxInput.value);
      savePref({ filter: curFilter, max });
      const items = shuffle(pool(curFilter)).slice(0, max);
      if (!items.length) {
        alert("ไม่มีข้อในตัวกรองนี้");
        return;
      }
      let runNode;
      runNode = renderRun(items, curFilter, () => {
        const fresh = renderSelector(onBack);
        runNode.replaceWith(fresh);
      });
      root.replaceWith(runNode);
    });

    return root;
  }

  /* ---------- หน้าโจทย์ ---------- */
  function renderRun(items, filter, onExit) {
    const root = document.createElement("div");
    const state = { i: 0, correct: 0 };
    const total = items.length;

    draw();

    function draw() {
      if (state.i >= total) {
        renderDone(root, items, state, filter, onExit);
        return;
      }
      const item = items[state.i];
      const pct = Math.round((state.i / total) * 100);

      root.innerHTML = `
        <div class="qhead">
          <h2 class="qtitle">คำช่วยเฉพาะจุด${filter === ALL ? "" : " · " + escapeHtml(filter)}</h2>
          <button class="btn ghost btn-sm" id="ptExit">← กลับเมนู</button>
        </div>
        <div class="progress" title="ความก้าวหน้า"><div class="bar" style="width:${pct}%"></div></div>
        <div class="qmeta">
          <span class="qprog">ข้อ ${state.i + 1} / ${total} · คะแนน ${state.correct}/${state.i}</span>
          <span class="qmeta-right">
            <span class="daily-pill" title="ที่มาของโจทย์">${escapeHtml(prettySource(item.source))}</span>
          </span>
        </div>
        <div class="card">
          <h3 class="pt-q">${escapeHtml(item.q)}</h3>
          ${item.hint ? `<p class="subtle pt-hint">${escapeHtml(item.hint)}</p>` : ""}

          <input type="text" class="txt-input pt-input" id="ptInput"
            placeholder="พิมพ์คำช่วย หรือกดปุ่มด้านล่าง"
            autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false"
            maxlength="2" />

          <div class="pt-keypad" id="ptKey">
            ${(window.PARTICLE_LIST || []).map((p) => `<button class="pt-key" type="button" data-p="${escapeAttr(p)}">${escapeHtml(p)}</button>`).join("")}
            <button class="pt-key pt-key-bksp" type="button" data-act="bksp" aria-label="ลบ">⌫</button>
          </div>

          <div class="btn-row">
            <button class="btn primary" id="ptSubmit">ตรวจคำตอบ</button>
          </div>

          <div id="ptFb"></div>

          <div class="btn-row">
            <button class="btn" id="ptNext" disabled>${state.i === total - 1 ? "ดูคะแนน" : "ข้อถัดไป →"}</button>
          </div>
        </div>
      `;

      const input = root.querySelector("#ptInput");
      const submitBtn = root.querySelector("#ptSubmit");
      const nextBtn = root.querySelector("#ptNext");
      const keypad = root.querySelector("#ptKey");

      input.focus();

      keypad.addEventListener("click", (e) => {
        const btn = e.target.closest("button");
        if (!btn || input.disabled) return;
        if (btn.dataset.act === "bksp") {
          input.value = input.value.slice(0, -1);
          input.focus();
          return;
        }
        if (btn.dataset.p) {
          input.value = btn.dataset.p;
          input.focus();
        }
      });

      const submit = () => handleSubmit(item, input, submitBtn, nextBtn);
      submitBtn.addEventListener("click", submit);
      input.addEventListener("keydown", (e) => {
        if (e.key === "Enter") submit();
      });

      nextBtn.addEventListener("click", () => {
        state.i += 1;
        draw();
      });

      root.querySelector("#ptExit").addEventListener("click", () => onExit());
    }

    function handleSubmit(item, input, submitBtn, nextBtn) {
      if (input.disabled) return;
      const got = String(input.value || "").trim();
      if (!got) { input.focus(); return; }
      const accepted = (item.accept || [item.particle]).map((s) => String(s).trim());
      const correct = accepted.includes(got);

      input.disabled = true;
      input.style.borderColor = correct ? "var(--ok)" : "var(--bad)";
      submitBtn.disabled = true;

      if (correct) state.correct += 1;

      const expected = accepted.join(" / ");
      const fb = root.querySelector("#ptFb");
      fb.innerHTML = `
        <div class="feedback ${correct ? "ok" : "bad"}">
          <strong>${correct ? "ถูกต้อง ✓" : "ยังไม่ถูก ✗"}</strong>
          <div style="white-space:pre-line;margin-top:4px;">${escapeHtml(item.explain || "")}${correct ? "" : "\nคำตอบที่ยอมรับ: " + expected}</div>
        </div>
      `;

      nextBtn.disabled = false;
    }

    return root;
  }

  /* ---------- หน้าสรุป ---------- */
  function renderDone(root, items, state, filter, onExit) {
    const total = items.length;
    const pct = total > 0 ? Math.round((state.correct / total) * 100) : 0;
    root.innerHTML = `
      <div class="score-card">
        <div>
          <h2 style="margin:0;">จบแบบฝึกหัดคำช่วย!</h2>
          <p class="subtle">${escapeHtml(filter === ALL ? "ทุกคำช่วย" : "คำช่วย " + filter)} · ${total} ข้อ</p>
          <p class="subtle" style="margin-top:4px;">${pct >= 80 ? "เก่งมาก ✨" : pct >= 50 ? "ลองทำใหม่ดูนะ" : "ทบทวนคำช่วยพื้นฐานก่อนน้าา"}</p>
        </div>
        <div class="score-num">${state.correct} / ${total}</div>
      </div>
      <div class="btn-row">
        <button class="btn primary" id="ptAgain">ทำชุดใหม่</button>
        <button class="btn ghost" id="ptBack">← กลับเมนู</button>
      </div>
    `;
    root.querySelector("#ptAgain").addEventListener("click", () => onExit());
    root.querySelector("#ptBack").addEventListener("click", () => onExit());
  }

  function prettySource(src) {
    if (!src) return "";
    if (src === "new") return "แต่งใหม่";
    return src.replace(/^minna-/, "Minna ");
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
