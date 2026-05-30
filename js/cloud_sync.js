/**
 * Cloud sync via Firebase Auth (Google) + Firestore.
 *
 * Storage shape on Firestore:  /users/{uid}
 *   {
 *     bookmarks: [...] (mirror of jp_grammar_bookmarks_v1),
 *     conjugation: {...} (mirror of jp_conjugation_progress_v1),
 *     updatedAt: serverTimestamp,
 *     clientTs:  Date.now()
 *   }
 *
 * Sync model:
 *   • on sign-in: pull cloud doc, merge with local, write merged back to both
 *   • on subsequent local saves: debounced push to cloud (1.5 s)
 *   • merge is conflict-free per record:
 *       - bookmarks: union by id (newer savedAt wins)
 *       - conjugation per (level/kind/key/form): newer lastTs wins;
 *         on tie, take max(tries, correct)
 *
 * Security: Firestore rules enforce  request.auth.uid == doc id.
 */
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import {
  getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect,
  getRedirectResult, signOut, onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import {
  getFirestore, doc, getDoc, setDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyB-zMFPzXUL7Ybtsst-FiB698tbzC9VuJg",
  authDomain: "japanese-study-86e17.firebaseapp.com",
  projectId: "japanese-study-86e17",
  storageBucket: "japanese-study-86e17.firebasestorage.app",
  messagingSenderId: "679148180451",
  appId: "1:679148180451:web:352ef8efffc7232ddcc6d6",
  measurementId: "G-KCPEPVDSDH"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const BM_KEY = "jp_grammar_bookmarks_v1";
const CJ_KEY = "jp_conjugation_progress_v1";
const FC_KEY = "jp_flashcards_v1";
const LP_KEY = "jp_lesson_progress_v1";
const DL_KEY = "jp_daily_v1";
const FS_KEY = "jp_flashcards_streak_v1";
const FD_KEY = "jp_flashcards_daily_v1";

let currentUser = null;
let pushTimer = null;
let initialPullDone = false;

/* ---------- DOM elements (created once, then reused) ---------- */
function el(id) { return document.getElementById(id); }
function setStatus(text, isError) {
  const s = el("syncStatus");
  if (!s) return;
  s.textContent = text;
  s.classList.toggle("err", !!isError);
}

function updateAuthUI() {
  const signInBtn = el("signInBtn");
  const userInfo = el("userInfo");
  if (!signInBtn || !userInfo) return;
  if (currentUser) {
    signInBtn.style.display = "none";
    userInfo.style.display = "inline-flex";
    const photo = currentUser.photoURL ? `<img src="${currentUser.photoURL}" alt="" />` : "";
    const name = currentUser.displayName || currentUser.email || "user";
    userInfo.innerHTML = `${photo}<span class="uname" title="${name}">${name}</span><button id="signOutBtn" class="btn ghost">ออก</button>`;
    el("signOutBtn").addEventListener("click", () => signOut(auth));
  } else {
    signInBtn.style.display = "inline-flex";
    userInfo.style.display = "none";
    userInfo.innerHTML = "";
    setStatus("");
  }
}

/* ---------- merge helpers ---------- */
function mergeBookmarks(a, b) {
  const map = new Map();
  [...(a || []), ...(b || [])].forEach((bm) => {
    if (!bm || !bm.id) return;
    const cur = map.get(bm.id);
    if (!cur || (bm.savedAt || 0) > (cur.savedAt || 0)) map.set(bm.id, bm);
  });
  return [...map.values()];
}

function mergeConj(a, b) {
  const out = JSON.parse(JSON.stringify(a || {}));
  const src = b || {};
  for (const lv in src) {
    out[lv] = out[lv] || {};
    for (const kind in src[lv]) {
      out[lv][kind] = out[lv][kind] || {};
      for (const k in src[lv][kind]) {
        out[lv][kind][k] = out[lv][kind][k] || {};
        for (const f in src[lv][kind][k]) {
          const aslot = out[lv][kind][k][f];
          const bslot = src[lv][kind][k][f];
          if (!aslot) {
            out[lv][kind][k][f] = bslot;
          } else if ((bslot.lastTs || 0) > (aslot.lastTs || 0)) {
            out[lv][kind][k][f] = bslot;
          } else if ((bslot.lastTs || 0) === (aslot.lastTs || 0)) {
            out[lv][kind][k][f] = {
              tries: Math.max(aslot.tries || 0, bslot.tries || 0),
              correct: Math.max(aslot.correct || 0, bslot.correct || 0),
              lastTs: aslot.lastTs || bslot.lastTs || 0
            };
          }
        }
      }
    }
  }
  return out;
}

/* ---------- pull / push ---------- */
async function pullAndMerge() {
  if (!currentUser) return;
  setStatus("กำลังซิงก์…");
  try {
    const ref = doc(db, "users", currentUser.uid);
    const snap = await getDoc(ref);
    const cloud = snap.exists() ? snap.data() : null;

    const localBm = JSON.parse(localStorage.getItem(BM_KEY) || "[]");
    const localCj = JSON.parse(localStorage.getItem(CJ_KEY) || "{}");
    const localFc = JSON.parse(localStorage.getItem(FC_KEY) || "null");
    const localLp = JSON.parse(localStorage.getItem(LP_KEY) || "null");
    const localDl = JSON.parse(localStorage.getItem(DL_KEY) || "null");
    const localFs = JSON.parse(localStorage.getItem(FS_KEY) || "null");
    const localFd = JSON.parse(localStorage.getItem(FD_KEY) || "null");

    const mergedBm = mergeBookmarks(cloud ? cloud.bookmarks : [], localBm);
    let mergedCj = mergeConj(cloud ? cloud.conjugation : {}, localCj);
    // Fold legacy per-level keys (e.g. cloud copies still under "n5") into "all".
    if (window.ConjStorage && window.ConjStorage.migrate) {
      mergedCj = window.ConjStorage.migrate(mergedCj).data;
    }
    // Flashcards: whole-doc last-write-wins by top-level updatedAt
    const cloudFc = cloud && cloud.flashcards ? cloud.flashcards : null;
    let mergedFc;
    if (window.FlashcardsStorage && window.FlashcardsStorage.mergeForCloud) {
      mergedFc = window.FlashcardsStorage.mergeForCloud(localFc, cloudFc);
    } else {
      mergedFc = (cloudFc && (!localFc || (cloudFc.updatedAt || 0) > (localFc.updatedAt || 0))) ? cloudFc : (localFc || { folders: [], decks: [], updatedAt: 0 });
    }
    // Lesson progress: per-key LWW on ts
    const cloudLp = cloud && cloud.lessonProgress ? cloud.lessonProgress : null;
    const mergedLp = window.LessonProgress
      ? window.LessonProgress.mergeForCloud(localLp, cloudLp)
      : (cloudLp || localLp || { records: {}, updatedAt: 0 });

    // Daily exercise: per-level/key LWW on ts (wrong list + settings + sessions)
    const cloudDl = cloud && cloud.daily ? cloud.daily : null;
    const mergedDl = window.DailyStorage
      ? window.DailyStorage.mergeForCloud(localDl, cloudDl)
      : (cloudDl || localDl || { wrong: {}, settings: { maxCount: 10 }, sessions: {}, updatedAt: 0 });

    // Flashcards streak: per-day max + goal LWW
    const cloudFs = cloud && cloud.flashcardsStreak ? cloud.flashcardsStreak : null;
    const mergedFs = window.FlashcardsStreak
      ? window.FlashcardsStreak.mergeForCloud(localFs, cloudFs)
      : (cloudFs || localFs || { goal: 50, days: {}, updatedAt: 0 });

    // Flashcards daily: whole-doc LWW by updatedAt
    const cloudFd = cloud && cloud.flashcardsDaily ? cloud.flashcardsDaily : null;
    const mergedFd = window.FlashcardsDaily
      ? window.FlashcardsDaily.mergeForCloud(localFd, cloudFd)
      : (cloudFd || localFd || { goalCount: 100, date: "", items: [], updatedAt: 0 });

    localStorage.setItem(BM_KEY, JSON.stringify(mergedBm));
    localStorage.setItem(CJ_KEY, JSON.stringify(mergedCj));
    localStorage.setItem(FC_KEY, JSON.stringify(mergedFc));
    localStorage.setItem(LP_KEY, JSON.stringify(mergedLp));
    localStorage.setItem(DL_KEY, JSON.stringify(mergedDl));
    localStorage.setItem(FS_KEY, JSON.stringify(mergedFs));
    localStorage.setItem(FD_KEY, JSON.stringify(mergedFd));
    if (window.FlashcardsStreak && window.FlashcardsStreak.setFromCloud) {
      window.FlashcardsStreak.setFromCloud(mergedFs);
    }
    if (window.FlashcardsDaily && window.FlashcardsDaily.setFromCloud) {
      window.FlashcardsDaily.setFromCloud(mergedFd);
    }

    await setDoc(ref, {
      bookmarks: mergedBm,
      conjugation: mergedCj,
      flashcards: mergedFc,
      lessonProgress: mergedLp,
      daily: mergedDl,
      flashcardsStreak: mergedFs,
      flashcardsDaily: mergedFd,
      updatedAt: serverTimestamp(),
      clientTs: Date.now()
    });

    initialPullDone = true;
    setStatus("ซิงก์แล้ว ✓");
    document.dispatchEvent(new CustomEvent("cloud-pulled"));
  } catch (e) {
    console.error("[cloud] pullAndMerge", e);
    setStatus("ซิงก์ไม่สำเร็จ", true);
  }
}

async function pushNow() {
  if (!currentUser || !initialPullDone) return;
  try {
    setStatus("กำลังบันทึก…");
    const ref = doc(db, "users", currentUser.uid);
    await setDoc(ref, {
      bookmarks: JSON.parse(localStorage.getItem(BM_KEY) || "[]"),
      conjugation: JSON.parse(localStorage.getItem(CJ_KEY) || "{}"),
      flashcards: JSON.parse(localStorage.getItem(FC_KEY) || "null") || { folders: [], decks: [], updatedAt: 0 },
      lessonProgress: JSON.parse(localStorage.getItem(LP_KEY) || "null") || { records: {}, updatedAt: 0 },
      daily: JSON.parse(localStorage.getItem(DL_KEY) || "null") || { wrong: {}, settings: { maxCount: 10 }, sessions: {}, updatedAt: 0 },
      flashcardsStreak: JSON.parse(localStorage.getItem(FS_KEY) || "null") || { goal: 50, days: {}, updatedAt: 0 },
      flashcardsDaily: JSON.parse(localStorage.getItem(FD_KEY) || "null") || { goalCount: 100, date: "", items: [], updatedAt: 0 },
      updatedAt: serverTimestamp(),
      clientTs: Date.now()
    });
    setStatus("ซิงก์แล้ว ✓");
  } catch (e) {
    console.error("[cloud] pushNow", e);
    setStatus("บันทึกไม่สำเร็จ", true);
  }
}

function schedulePush() {
  if (!currentUser || !initialPullDone) return;
  if (pushTimer) clearTimeout(pushTimer);
  pushTimer = setTimeout(pushNow, 1500);
}

/* ---------- sign-in ----------
 * Installed PWAs — especially on iOS — run with no popup context, so
 * signInWithPopup silently fails there. Use redirect-based auth when the app
 * is launched standalone (added to home screen), and fall back to redirect if
 * a popup is blocked or unsupported in a normal tab.
 */
function isStandalone() {
  return (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches)
    || window.navigator.standalone === true;
}
async function doSignIn() {
  const provider = new GoogleAuthProvider();
  if (isStandalone()) return signInWithRedirect(auth, provider);
  try {
    return await signInWithPopup(auth, provider);
  } catch (e) {
    const code = e && e.code;
    if (code === "auth/popup-blocked"
      || code === "auth/cancelled-popup-request"
      || code === "auth/operation-not-supported-in-this-environment") {
      return signInWithRedirect(auth, provider);
    }
    throw e;
  }
}

/* ---------- public API ---------- */
window.CloudSync = {
  signIn: () => doSignIn().catch((e) => {
    console.error("[cloud] signIn", e);
    setStatus("เข้าสู่ระบบไม่สำเร็จ", true);
  }),
  signOut: () => signOut(auth),
  notifyChange: () => schedulePush(),
  isSignedIn: () => !!currentUser,
  getUser: () => currentUser
};

/* ---------- bootstrap ---------- */
// Complete any redirect-based sign-in and surface its errors (the actual
// session is picked up by onAuthStateChanged below).
getRedirectResult(auth).catch((e) => {
  console.error("[cloud] redirect", e);
  setStatus("เข้าสู่ระบบไม่สำเร็จ", true);
});

onAuthStateChanged(auth, async (u) => {
  currentUser = u;
  initialPullDone = false;
  updateAuthUI();
  if (u) {
    await pullAndMerge();
  }
});

document.addEventListener("DOMContentLoaded", () => {
  const btn = el("signInBtn");
  if (btn) btn.addEventListener("click", () => window.CloudSync.signIn());
  updateAuthUI();
});
