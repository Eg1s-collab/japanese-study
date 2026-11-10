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
    stopSilentSoon(); // the <audio> stream doesn't need the keep-alive
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

  /* ---------- iOS silent-switch keep-alive ---------- */
  // Setting audioSession.type alone isn't enough for speechSynthesis: WebKit
  // only moves the page's audio session to the "playback" category (which
  // ignores the Ring/Silent switch) while a media element is actually
  // playing. With nothing playing, speech uses the ambient category and is
  // muted on the speaker in silent mode — headphones still work, which is
  // exactly the symptom. So on iOS we loop an inaudible WAV while speaking.
  // It must be real silence, not muted=true: a muted element doesn't count
  // as audible and the category wouldn't change.
  let silentEl = null;
  let silentStopTimer = null;
  const SILENT_IDLE_MS = 20000;
  function silentWavUrl() {
    const rate = 8000, samples = rate / 2;      // 0.5 s, 16-bit mono
    const buf = new ArrayBuffer(44 + samples * 2);
    const v = new DataView(buf);
    const str = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
    str(0, "RIFF"); v.setUint32(4, 36 + samples * 2, true); str(8, "WAVE");
    str(12, "fmt "); v.setUint32(16, 16, true); v.setUint16(20, 1, true);
    v.setUint16(22, 1, true); v.setUint32(24, rate, true);
    v.setUint32(28, rate * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true);
    str(36, "data"); v.setUint32(40, samples * 2, true);
    return URL.createObjectURL(new Blob([buf], { type: "audio/wav" }));
  }
  function startSilent() {
    if (!isIOS) return;
    if (silentStopTimer) { clearTimeout(silentStopTimer); silentStopTimer = null; }
    try {
      if (!silentEl) {
        silentEl = new Audio();
        silentEl.loop = true;
        silentEl.preload = "auto";
        silentEl.setAttribute("playsinline", "");
        silentEl.src = silentWavUrl();
      }
      if (silentEl.paused) {
        const p = silentEl.play();
        if (p && typeof p.catch === "function") p.catch(() => { /* ignore */ });
      }
    } catch (e) { /* ignore */ }
  }
  function stopSilentSoon() {
    if (!silentEl) return;
    if (silentStopTimer) clearTimeout(silentStopTimer);
    silentStopTimer = setTimeout(() => {
      silentStopTimer = null;
      try { silentEl.pause(); } catch (e) { /* ignore */ }
    }, SILENT_IDLE_MS);
  }
  if (isIOS) {
    // Prime on the first touch anywhere, so the session is already in
    // playback mode by the time the user taps a speaker button.
    const prime = () => { startSilent(); stopSilentSoon(); };
    ["touchend", "click"].forEach((ev) =>
      document.addEventListener(ev, prime, { once: true, capture: true, passive: true }));
    document.addEventListener("visibilitychange", () => {
      if (document.hidden && silentEl) {
        try { silentEl.pause(); } catch (e) { /* ignore */ }
      }
    });
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
    startSilent(); // inside the tap: puts iOS in playback mode before speaking

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
    u.onend = () => { settle(); stopSilentSoon(); };
    u.onerror = () => {
      stopSilentSoon();
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
