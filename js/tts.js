/**
 * TTS — shared text-to-speech helper (window.TTS).
 *
 * Primary engine: Web Speech API (speechSynthesis). It's offline, needs no
 * network, and — crucially — works on iOS (including installed PWAs) as long
 * as speak() is called synchronously inside the user's tap, which is what the
 * app did originally. So we speak natively first, everywhere.
 *
 * Fallback engine: a real MP3 stream (Google Translate TTS → a reused <audio>
 * element). Used only when native speech can't make sound:
 *   • speechSynthesis isn't available, or the utterance errors; or
 *   • on iOS, native speech reports no start within a short window (a safety
 *     net for the WebKit standalone-PWA silent-speech bug on some iOS builds).
 * The stream needs network and relies on an unofficial Google endpoint.
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

  // iOS 16.4+ : by default web audio (speechSynthesis and <audio>) is muted on
  // the built-in speaker when the Ring/Silent switch is in silent mode — it's
  // only heard through headphones. Declaring a "playback" audio session asks
  // the OS to play through the speaker anyway, like a music/video app. Safe to
  // set where unsupported (feature-detected); harmless elsewhere.
  function ensurePlaybackSession() {
    try {
      if (navigator.audioSession && navigator.audioSession.type !== "playback") {
        navigator.audioSession.type = "playback";
      }
    } catch (e) { /* ignore */ }
  }
  ensurePlaybackSession();

  /* ---------- environment ---------- */
  const ua = navigator.userAgent || "";
  const platform = navigator.platform || "";
  const isIOS =
    /iPhone|iPad|iPod/.test(ua) ||
    /iPhone|iPad|iPod/.test(platform) ||
    (/Mac/.test(platform) && (navigator.maxTouchPoints || 0) > 1); // iPadOS 13+

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

  /* ---------- Audio-stream (fallback) engine ---------- */
  let audioEl = null;
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
    return "https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob"
      + "&tl=" + encodeURIComponent(tl)
      + "&q=" + encodeURIComponent(text);
  }
  function speakAudio(text, lang) {
    const a = getAudio();
    if (!a) return false;
    try {
      try { a.pause(); a.currentTime = 0; } catch (e) { /* ignore */ }
      a.src = ttsUrl(text, lang);
      const p = a.play();
      if (p && typeof p.catch === "function") p.catch(() => { /* give up quietly */ });
      return true;
    } catch (e) { return false; }
  }

  /* ---------- native-first with fallback ---------- */
  let fallbackTimer = null;
  function clearFallbackTimer() {
    if (fallbackTimer) { clearTimeout(fallbackTimer); fallbackTimer = null; }
  }

  function speak(text, opts) {
    const t = String(text == null ? "" : text).trim();
    if (!t) return;
    const lang = (typeof opts === "string") ? opts : (opts && opts.lang);
    const rate = (opts && typeof opts === "object") ? opts.rate : undefined;

    ensurePlaybackSession();
    clearFallbackTimer();

    // No Web Speech at all → go straight to the audio stream.
    if (!synth) { speakAudio(t, lang); return; }

    try {
      if (synth.speaking || synth.pending) synth.cancel();
    } catch (e) { /* ignore */ }
    try { if (synth.paused) synth.resume(); } catch (e) { /* ignore */ }
    if (!voices.length) loadVoices();

    let u;
    try {
      u = new SpeechSynthesisUtterance(t);
      u.lang = lang || "ja-JP";
      const v = pickVoice(u.lang);
      if (v) u.voice = v;
      u.rate = rate || 0.95;
      u.volume = 1;
    } catch (e) {
      speakAudio(t, lang);
      return;
    }

    let settled = false;
    const settle = () => { settled = true; clearFallbackTimer(); };
    u.onstart = settle;
    u.onend = settle;
    u.onerror = () => {
      if (settled) return;
      settle();
      speakAudio(t, lang); // native errored → stream
    };

    try {
      synth.speak(u);
    } catch (e) {
      speakAudio(t, lang);
      return;
    }
    try { if (synth.paused) synth.resume(); } catch (e) { /* ignore */ }

    // iOS safety net: if native speech never actually started (the silent
    // standalone-PWA case on some iOS builds), switch to the audio stream.
    // On this device native speech works, so `onstart` clears this first and
    // nothing double-plays.
    if (isIOS) {
      fallbackTimer = setTimeout(() => {
        if (settled) return;
        settle();
        try { synth.cancel(); } catch (e) { /* ignore */ }
        speakAudio(t, lang);
      }, 1400);
    }
  }

  function cancel() {
    clearFallbackTimer();
    try { if (synth) synth.cancel(); } catch (e) { /* ignore */ }
    try { if (audioEl) { audioEl.pause(); audioEl.currentTime = 0; } } catch (e) { /* ignore */ }
  }

  function available() { return !!synth || typeof Audio !== "undefined"; }

  return { speak, cancel, available, pickVoice };
})();
