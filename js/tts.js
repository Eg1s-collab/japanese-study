/**
 * TTS — shared text-to-speech helper (window.TTS).
 *
 * Two engines, because no single one works everywhere:
 *
 *   • Web Speech API (speechSynthesis): offline, no network, good voices on
 *     desktop + Android. BUT on iOS it is silent inside an installed
 *     (Add-to-Home-Screen / standalone) PWA — a long-standing WebKit bug —
 *     and it only ever starts from a synchronous call inside a user gesture.
 *
 *   • Audio stream (Google Translate TTS → <audio>): a real MP3 played through
 *     a media element, which DOES work in an iOS standalone PWA. Needs network
 *     and depends on an unofficial Google endpoint, but is the only thing that
 *     makes sound in the installed iOS app.
 *
 * Routing: iOS (where Web Speech is unreliable/silent in the installed app)
 * uses the audio stream, falling back to speechSynthesis if the stream fails.
 * Everywhere else uses speechSynthesis, falling back to the audio stream if it
 * is unavailable.
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

  /* ---------- environment ---------- */
  const ua = navigator.userAgent || "";
  const platform = navigator.platform || "";
  const isIOS =
    /iPhone|iPad|iPod/.test(ua) ||
    /iPhone|iPad|iPod/.test(platform) ||
    // iPadOS 13+ reports as "MacIntel" but has a touch screen.
    (/Mac/.test(platform) && (navigator.maxTouchPoints || 0) > 1);

  // Prefer the audio stream where Web Speech can't be trusted (iOS), or where
  // speechSynthesis simply isn't present.
  function preferAudio() { return isIOS || !synth; }

  /* ---------- Web Speech engine ---------- */
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
  function speakSynth(text, lang, rate) {
    if (!synth) return false;
    try {
      if (synth.speaking || synth.pending) synth.cancel();
    } catch (e) { /* ignore */ }
    try { if (synth.paused) synth.resume(); } catch (e) { /* ignore */ }
    if (!voices.length) loadVoices();
    try {
      const u = new SpeechSynthesisUtterance(text);
      u.lang = lang || "ja-JP";
      const v = pickVoice(u.lang);
      if (v) u.voice = v;
      u.rate = rate || 0.95;
      u.volume = 1;
      synth.speak(u);
      try { if (synth.paused) synth.resume(); } catch (e) { /* ignore */ }
      return true;
    } catch (e) { return false; }
  }

  /* ---------- Audio-stream engine ---------- */
  // One reused element — iOS unlocks media playback per-element after the
  // first gesture-initiated play(), so reusing it keeps later calls audible.
  let audioEl = null;
  let audioUnlocked = false;
  function getAudio() {
    if (!audioEl) {
      try {
        audioEl = new Audio();
        audioEl.preload = "auto";
        audioEl.setAttribute("playsinline", "");
      } catch (e) { audioEl = null; }
    }
    return audioEl;
  }
  function ttsUrl(text, lang) {
    const tl = String(lang || "ja-JP").split("-")[0] || "ja";
    // Google Translate's unofficial TTS endpoint. client=tw-ob returns a plain
    // MP3 that a media element can play cross-origin without CORS.
    return "https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob"
      + "&tl=" + encodeURIComponent(tl)
      + "&q=" + encodeURIComponent(text);
  }
  function speakAudio(text, lang, onFail) {
    const a = getAudio();
    if (!a) { if (onFail) onFail(); return false; }
    let failed = false;
    const fail = () => { if (failed) return; failed = true; if (onFail) onFail(); };
    try {
      a.onerror = fail;
      try { a.pause(); a.currentTime = 0; } catch (e) { /* ignore */ }
      a.src = ttsUrl(text, lang);
      audioUnlocked = true;
      const p = a.play();
      if (p && typeof p.catch === "function") p.catch(fail);
      return true;
    } catch (e) { fail(); return false; }
  }

  /* ---------- public speak ---------- */
  function speak(text, opts) {
    const t = String(text == null ? "" : text).trim();
    if (!t) return;
    const lang = (typeof opts === "string") ? opts : (opts && opts.lang);
    const rate = (opts && typeof opts === "object") ? opts.rate : undefined;

    if (preferAudio()) {
      // Audio first; if the stream can't play (offline / endpoint blocked),
      // fall back to Web Speech (may still work, e.g. in iOS Safari browser).
      speakAudio(t, lang, () => speakSynth(t, lang, rate));
    } else {
      if (!speakSynth(t, lang, rate)) speakAudio(t, lang, null);
    }
  }

  function cancel() {
    try { if (synth) synth.cancel(); } catch (e) { /* ignore */ }
    try { if (audioEl) { audioEl.pause(); audioEl.currentTime = 0; } } catch (e) { /* ignore */ }
  }

  function available() { return !!synth || typeof Audio !== "undefined"; }

  return { speak, cancel, available, pickVoice };
})();
