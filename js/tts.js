/**
 * TTS — shared text-to-speech helper (window.TTS).
 *
 * Centralises the Web Speech API quirks that otherwise cause "I pressed 🔊
 * but nothing played":
 *
 *   1. Voices load asynchronously. On first paint `getVoices()` is often []
 *      and no Japanese voice is picked, so a ja-JP utterance falls back to a
 *      voice that can't pronounce kana → silence. We cache voices, listen for
 *      `voiceschanged`, and explicitly pick a matching voice when we have one.
 *   2. MOBILE (iOS Safari / Chrome on Android, incl. installed PWAs) only lets
 *      speech start when `speak()` runs *synchronously inside the user gesture*
 *      (the tap handler). Deferring it even one tick (setTimeout/Promise) makes
 *      the browser silently drop it. So speak() does its work synchronously and
 *      never defers.
 *   3. Chrome can leave the queue in a `paused` state; we resume().
 *   4. Calling `cancel()` right before `speak()` can swallow the new utterance
 *      on desktop Chrome, so we only cancel when something is actually playing.
 *
 * API:
 *   TTS.speak(text, "ja-JP")                 // lang string, or
 *   TTS.speak(text, { lang: "ja-JP", rate }) // options object
 *   TTS.cancel()
 *   TTS.available()  → boolean
 *   TTS.hasVoiceFor("ja-JP") → boolean       // is a matching voice installed?
 */
window.TTS = (function () {
  const synth = ("speechSynthesis" in window) ? window.speechSynthesis : null;
  let voices = [];

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
    // Nudge some engines that populate voices lazily.
    setTimeout(loadVoices, 250);
    setTimeout(loadVoices, 1000);
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

  function hasVoiceFor(lang) {
    if (!synth) return false;
    if (!voices.length) loadVoices();
    // Unknown (voices not yet reported) → assume yes; the OS usually has one.
    if (!voices.length) return true;
    return !!pickVoice(lang);
  }

  function build(text, lang, rate) {
    const u = new SpeechSynthesisUtterance(text);
    u.lang = lang || "ja-JP";
    const v = pickVoice(u.lang);
    if (v) u.voice = v;
    u.rate = rate || 0.95;
    u.volume = 1;
    return u;
  }

  function speak(text, opts) {
    if (!synth) return;
    const t = String(text == null ? "" : text).trim();
    if (!t) return;
    const lang = (typeof opts === "string") ? opts : (opts && opts.lang);
    const rate = (opts && typeof opts === "object") ? opts.rate : undefined;

    try {
      // Only cancel when something is really in flight — cancelling an idle
      // queue right before speak() can swallow the new utterance on Chrome.
      if (synth.speaking || synth.pending) synth.cancel();
    } catch (e) { /* ignore */ }
    try { if (synth.paused) synth.resume(); } catch (e) { /* ignore */ }

    if (!voices.length) loadVoices();

    // Speak synchronously — staying inside the tap handler is what lets mobile
    // browsers actually produce sound.
    try {
      synth.speak(build(t, lang, rate));
    } catch (e) { /* ignore */ }

    // Safety net for Chrome's "stuck paused right after speak" quirk.
    try {
      if (synth.paused) synth.resume();
    } catch (e) { /* ignore */ }
  }

  function cancel() {
    if (!synth) return;
    try { synth.cancel(); } catch (e) { /* ignore */ }
  }

  function available() { return !!synth; }

  return { speak, cancel, available, hasVoiceFor, pickVoice };
})();
