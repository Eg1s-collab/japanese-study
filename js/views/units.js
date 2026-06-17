/**
 * Units view: list of grammar units → drill-down into one unit
 * showing patterns + bilingual examples.
 */
window.UnitsView = (function () {
  function renderList(level, onPick) {
    const lv = window.LEVELS[level];
    if (!lv) return "<div class='empty'>ไม่พบระดับ</div>";

    const LP = window.LessonProgress;
    const cards = lv.units
      .map((u) => {
        const dismissed = LP && LP.isDismissed(level, u.id);
        const rec = LP && LP.getRecord(level, u.id);
        const scoreBit = dismissed && rec && typeof rec.lastScore === "number"
          ? ` · คะแนน ${rec.lastScore}/${rec.lastTotal}` : "";
        return `
        <article class="card unit-card ${dismissed ? "dim" : ""}" data-id="${u.id}">
          ${dismissed ? `<span class="done-badge" title="เรียบร้อยแล้ว">✓</span>` : ""}
          <span class="badge">${lv.label}</span>
          <h3>${escapeHtml(u.title)}</h3>
          <p class="subtle">${escapeHtml(u.summary || "")}</p>
          <div class="subtle" style="margin-top:8px;">
            ${u.points.length} หัวข้อ · ${u.quiz.length} ข้อแบบฝึก${scoreBit}
          </div>
        </article>`;
      })
      .join("");

    const root = document.createElement("div");
    root.innerHTML = `
      <h2>บทเรียนไวยากรณ์ ${lv.label}</h2>
      <p class="subtle">เลือก unit เพื่อดูเนื้อหาและตัวอย่าง</p>
      <div class="unit-list">${cards || `<div class='empty'>ยังไม่มีบทเรียน</div>`}</div>
    `;
    root.querySelectorAll(".unit-card").forEach((el) => {
      el.addEventListener("click", () => onPick(el.dataset.id));
    });
    return root;
  }

  function renderUnit(level, unitId, onBack, onStartQuiz) {
    const lv = window.LEVELS[level];
    const unit = lv.units.find((u) => u.id === unitId);
    if (!unit) return document.createTextNode("ไม่พบ unit");

    const playlistUrl = unit.playlistUrl || lv.playlistUrl || "";
    const playlistId = window.N3_PLAYLIST_ID || "";
    const videoIds = window.N3_VIDEO_IDS || {};

    const points = unit.points
      .map(
        (p) => `
      <div class="point">
        <div class="pat">${escapeHtml(p.pattern)}</div>
        <div class="desc">${formatDesc(p.desc)}</div>
        ${p.videoTopic ? videoBlockHtml(p.videoTopic, videoIds[p.videoTopic], playlistId) : ""}
        ${(p.examples || [])
          .map(
            (ex) => `
          <div class="example">
            <div class="jp">${escapeHtml(ex.jp)}</div>
            <div class="ro">${escapeHtml(ex.ro || "")}</div>
            <div class="th">— ${escapeHtml(ex.th || "")}</div>
          </div>`
          )
          .join("")}
      </div>`
      )
      .join("");

    const LP = window.LessonProgress;
    const dismissed = LP && LP.isDismissed(level, unit.id);

    const root = document.createElement("div");
    root.innerHTML = `
      <div class="btn-row">
        <button class="btn ghost" id="backBtn">← กลับไปรายการ</button>
        <button class="btn primary" id="quizBtn">เริ่มทำแบบฝึกหัดของ unit นี้</button>
        ${playlistUrl ? `<a class="btn ghost video-btn" href="${escapeAttr(playlistUrl)}" target="_blank" rel="noopener">▶ ดู Playlist ทั้งหมด</a>` : ""}
        ${LP && !dismissed ? `<button class="btn ghost" id="hideBtn">✓ ซ่อนบทนี้</button>` : ""}
        ${dismissed ? `<button class="btn ghost" id="unhideBtn">↺ ยกเลิกการซ่อน</button>` : ""}
      </div>
      <div class="card">
        <h2>${escapeHtml(unit.title)}</h2>
        <p class="subtle">${escapeHtml(unit.summary || "")}</p>
        ${legendHtml()}
        ${points}
      </div>
    `;
    root.querySelector("#backBtn").addEventListener("click", onBack);
    root.querySelector("#quizBtn").addEventListener("click", () => onStartQuiz(unit.id));
    const hideBtn = root.querySelector("#hideBtn");
    if (hideBtn) {
      hideBtn.addEventListener("click", () => {
        LP.setDismissed(level, unit.id, true);
        onBack();
      });
    }
    const unhideBtn = root.querySelector("#unhideBtn");
    if (unhideBtn) {
      unhideBtn.addEventListener("click", () => {
        LP.setDismissed(level, unit.id, false);
        onBack();
      });
    }
    return root;
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

  function escapeAttr(s) {
    return escapeHtml(s);
  }

  // คงการขึ้นบรรทัดใหม่ใน desc + รองรับ bullet "•"
  function formatDesc(s) {
    return escapeHtml(s || "").replace(/\n/g, "<br>");
  }

  function legendHtml() {
    // อธิบายตัวย่อที่ใช้ในรูปไวยากรณ์ — ผู้เริ่มต้นจะได้รู้ว่า "stem" คืออะไร
    return `
      <details class="legend">
        <summary>📘 คำย่อในรูปไวยากรณ์ (กดเพื่ออ่าน)</summary>
        <div class="legend-body">
          <ul>
            <li><b>V</b> = คำกริยา (Verb)</li>
            <li><b>Vる / 辞書形 (jisho-kei)</b> = รูปดิคชันนารี เช่น 食(た)べる, 行(い)く</li>
            <li><b>Vます-stem</b> = ตัด <code>ます</code> ออกจากรูป ます<br>เช่น 食べ<u>ます</u> → <b>食べ</b> ・ 飲み<u>ます</u> → <b>飲み</b> ・ 読み<u>ます</u> → <b>読み</b><br>ส่วนที่เหลือนี้เรียกว่า "stem" (รากกริยา) ใช้ต่อกับไวยากรณ์ N3 หลายตัว เช่น <code>~かけ</code>, <code>~次第</code>, <code>~がたい</code></li>
            <li><b>Vて</b> = รูป て เช่น 食べて, 行って, 読んで</li>
            <li><b>Vた</b> = รูปอดีต (普通体) เช่น 食べた, 行った</li>
            <li><b>Vない</b> = รูปปฏิเสธ (普通体) เช่น 食べない, 行かない</li>
            <li><b>Vば / V-ば形 (ba-kei)</b> = รูปเงื่อนไข เช่น 食べれば, 行けば, 安(やす)ければ</li>
            <li><b>Adj.</b> = คำคุณศัพท์ (Adjective)</li>
            <li><b>Adj.い</b> = い-adjective (い形容詞) เช่น 高(たか)い, 安(やす)い</li>
            <li><b>なAdj.</b> = な-adjective (な形容詞) เช่น 静(しず)か, 元気(げんき)</li>
            <li><b>N</b> = คำนาม (Noun)</li>
            <li><b>普通体 (futsuu-tai)</b> = รูปธรรมดา (ไม่สุภาพ) เช่น 食べる/食べない/食べた/食べなかった</li>
          </ul>
        </div>
      </details>`;
  }

  function videoBlockHtml(topic, videoId, playlistId) {
    // Link directly to YouTube — open the matching video (inside its playlist
    // when we know the mapping), or fall back to a search query.
    if (videoId) {
      const watchUrl = `https://www.youtube.com/watch?v=${videoId}${playlistId ? "&list=" + playlistId : ""}`;
      return `<div class="vid-row">
        <a class="vid-link" href="${escapeAttr(watchUrl)}" target="_blank" rel="noopener">▶ ดูวิดีโอบน YouTube</a>
      </div>`;
    }
    const q = encodeURIComponent("JLPT N3 " + topic);
    const searchUrl = "https://www.youtube.com/results?search_query=" + q;
    return `<div class="vid-row">
      <a class="vid-search" href="${escapeAttr(searchUrl)}" target="_blank" rel="noopener">🔎 ค้นวิดีโอ "${escapeHtml(topic)}"</a>
    </div>`;
  }

  return { renderList, renderUnit };
})();
