/**
 * Reusable on-screen hiragana keypad for any text <input>.
 *
 * Usage:
 *   const node = window.KanaKeypad.create(inputEl);
 *   container.appendChild(node);
 *
 * Layout matches the conjugation view: 12-key iOS-style grid where tapping
 * a row (e.g. "か") pops up its variants (incl. dakuten / handakuten / small).
 */
window.KanaKeypad = (function () {
  const KANA_ROWS = {
    "あ": ["あ","い","う","え","お"],
    "か": ["か","き","く","け","こ","が","ぎ","ぐ","げ","ご"],
    "さ": ["さ","し","す","せ","そ","ざ","じ","ず","ぜ","ぞ"],
    "た": ["た","ち","つ","て","と","だ","ぢ","づ","で","ど","っ"],
    "な": ["な","に","ぬ","ね","の"],
    "は": ["は","ひ","ふ","へ","ほ","ば","び","ぶ","べ","ぼ","ぱ","ぴ","ぷ","ぺ","ぽ"],
    "ま": ["ま","み","む","め","も"],
    "や": ["や","ゆ","よ","ゃ","ゅ","ょ"],
    "ら": ["ら","り","る","れ","ろ"],
    "わ": ["わ","を","ん","ー"]
  };
  const KEYBOARD_LAYOUT = [
    ["あ", "か", "さ", { ctl: "bksp",  label: "⌫"   }],
    ["た", "な", "は", null],
    ["ま", "や", "ら", null],
    [null, "わ", null, { ctl: "clear", label: "ล้าง" }]
  ];

  function buildHtml() {
    const cells = KEYBOARD_LAYOUT.flat().map((cell) => {
      if (cell === null) return `<span class="kana-key kana-spacer" aria-hidden="true"></span>`;
      if (typeof cell === "string") {
        return `<button type="button" class="kana-key" data-row="${cell}">${cell}</button>`;
      }
      if (cell.ctl === "bksp") {
        return `<button type="button" class="kana-key kana-cmd kana-bksp" data-ctl="bksp" aria-label="ลบ">${cell.label}</button>`;
      }
      if (cell.ctl === "clear") {
        return `<button type="button" class="kana-key kana-cmd kana-clear" data-ctl="clear">${cell.label}</button>`;
      }
      return "";
    }).join("");
    return `
      <div class="kana-keyboard">
        <div class="kana-popup" role="listbox" aria-label="เลือกตัวอักษร"></div>
        <div class="kana-grid">${cells}</div>
      </div>
    `;
  }

  function create(input) {
    const wrap = document.createElement("div");
    wrap.innerHTML = buildHtml();
    const kb = wrap.firstElementChild;
    const popup = kb.querySelector(".kana-popup");

    function hidePopup() {
      popup.style.display = "none";
      popup.innerHTML = "";
      popup.removeAttribute("data-row");
    }
    function showPopup(rowKey) {
      popup.innerHTML = (KANA_ROWS[rowKey] || []).map((c) =>
        `<button type="button" class="kana-pop" data-c="${c}">${c}</button>`
      ).join("");
      popup.style.display = "flex";
      popup.dataset.row = rowKey;
    }

    kb.addEventListener("mousedown", (e) => {
      if (e.target.closest("button")) e.preventDefault();
    });
    kb.addEventListener("click", (e) => {
      const btn = e.target.closest("button");
      if (!btn) return;
      if (btn.classList.contains("kana-pop")) {
        const c = btn.dataset.c;
        if (c && !input.disabled) input.value += c;
        hidePopup();
      } else if (btn.dataset.ctl === "bksp") {
        if (!input.disabled) input.value = input.value.slice(0, -1);
        hidePopup();
      } else if (btn.dataset.ctl === "clear") {
        if (!input.disabled) input.value = "";
        hidePopup();
      } else if (btn.dataset.row) {
        if (popup.dataset.row === btn.dataset.row) hidePopup();
        else showPopup(btn.dataset.row);
      }
      input.focus();
    });

    return kb;
  }

  return { create };
})();
