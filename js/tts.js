/**
 * TTS — shared text-to-speech helper (window.TTS).
 *
 * Centralises the Web Speech API quirks that otherwise cause "I pressed 🔊
 * but nothing played":
 *
 *   1. Voices load asynchronously. On first paint `getVoices()` is often []
 *      and no Japanese voice is picked, so a ja-JP utterance falls back to a
 *      voice that can't pronounce kana → silence. We cache voices, listen for
 *      `voiceschanged`, and explicitly pick a matching voice.
 *   2. Chrome drops an utterance when `speak()` is called in the same tick as
 *      `cancel()`. We defer the real speak to the next tick.
 *   3. iOS Safari / some Chrome builds only allow speech once the engine has
 *      been "unlocked" from a real user gesture. We prime it on the first
 *      pointer/key interaction.
 *   4. Chrome sometimes leaves the queue in a `paused` state; we resume().
 *
 * API:
 *   TTS.speak(text, "ja-JP")                 // lang string, or
 *   TTS.speak(text, { lang: "ja-JP", rate }) // options object
 *   TTS.cancel()
 *   TTS.available()  → boolean
 */
window.TTS = (function () {
  const synth = ("speechSynthesis" in window) ? window.speechSynthesis : null;
  let voices = [];
  let unlocked = false;

  function loadVoices() {
    if (!synth) return;
    try { voices = synth.getVoices() || []; } catch (e) { voices = []; }
  }

  if (synth) {
    loadVoices();
    try {
      if (typeof synth.addEventListener === "function") {
        synth.addEventListener("voiceschanged", loadVoices);
      } else {
        synth.onvoiceschanged = loadVoices;
      }
    } catch (e) { /* ignore */ }
  }

  function pickVoice(lang) {
    if (!voices.length) loadVoices();
    if (!voices.length) return null;
    const want = String(lang || "").toLowerCase().replace("_", "-");
    const base = want.split("-")[0];
    const norm = (v) => String(v.lang || "").toLowerCase().replace("_", "-");
    return voices.find((v) => norm(v) === want)
        || voices.find((v) => norm(v).split("-")[0] === base)
        || null;
  }

  // Prime the engine from a real user gesture so later programmatic calls
  // (auto-speak, deferred speak) are allowed to make sound on mobile.
  function unlock() {
    if (unlocked || !synth) return;
    unlocked = true;
    try {
      synth.resume();
      const u = new SpeechSynthesisUtterance(" ");
      u.volume = 0;
      synth.speak(u);
    } catch (e) { /* ignore */ }
  }

  try {
    ["pointerdown", "touchstart", "keydown", "mousedown"].forEach((ev) => {
      window.addEventListener(ev, unlock, { capture: true, passive: true });
    });
  } catch (e) { /* ignore */ }

  function fire(text, lang, rate) {
    try {
      const u = new SpeechSynthesisUtterance(text);
      u.lang = lang || "ja-JP";
      const v = pickVoice(u.lang);
      if (v) u.voice = v;
      u.rate = rate || 0.95;
      try { if (synth.paused) synth.resume(); } catch (e) { /* ignore */ }
      synth.speak(u);
    } catch (e) { /* ignore */ }
  }

  function speak(text, opts) {
    if (!synth) return;
    const t = String(text == null ? "" : text).trim();
    if (!t) return;
    const lang = (typeof opts === "string") ? opts : (opts && opts.lang);
    const rate = (opts && typeof opts === "object") ? opts.rate : undefined;

    unlock();
    try { synth.cancel(); } catch (e) { /* ignore */ }

    // Voices not ready yet → wait for them (with a timeout fallback) so the
    // right language voice is used instead of silently failing.
    if (!voices.length) {
      loadVoices();
      if (!voices.length) {
        let done = false;
        const once = () => {
          if (done) return;
          done = true;
          loadVoices();
          fire(t, lang, rate);
        };
        try { synth.addEventListener("voiceschanged", once, { once: true }); } catch (e) { /* ignore */ }
        setTimeout(once, 300);
        return;
      }
    }

    // Defer one tick to dodge the Chrome cancel()->speak() race.
    setTimeout(() => fire(t, lang, rate), 0);
  }

  function cancel() {
    if (!synth) return;
    try { synth.cancel(); } catch (e) { /* ignore */ }
  }

  function available() { return !!synth; }

  return { speak, cancel, available, pickVoice };
})();
