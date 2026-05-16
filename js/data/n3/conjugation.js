/**
 * Conjugation drill data for N3.
 *
 * N3 ไม่ได้เพิ่ม "รูปกริยาใหม่" เกินจาก N4 (potential/volitional/conditional/
 * imperative/passive/causative ครบแล้วในระดับ N4).  ฉะนั้นไฟล์นี้ใช้สำหรับ
 *   1. เพิ่มคำศัพท์ N3 ใหม่ ๆ เพื่อให้มาฝึกผันได้
 *   2. เผื่อในอนาคตอยากเพิ่มรูปแบบเฉพาะของ N3 (เช่น causative-passive 使役受身
 *      ~aせられる) สามารถเสริมได้ที่นี่
 */

window.N3_VERBS = [
  // === คำศัพท์ N3 ใหม่ — Godan (group 1) ===
  { dict: "あつかう", reading: "atsukau", group: 1, meaning: "จัดการ / ปฏิบัติต่อ",
    forms: { dict: "あつかう", masu: "あつかいます", masen: "あつかいません", mashita: "あつかいました", te: "あつかって", nai: "あつかわない", ta: "あつかった", tai: "あつかいたい",
             pot: "あつかえる", vol: "あつかおう", ba: "あつかえば", imp: "あつかえ", pass: "あつかわれる", caus: "あつかわせる" } },
  { dict: "うかがう", reading: "ukagau", group: 1, meaning: "ถาม/เยี่ยม (ถ่อมตน)",
    forms: { dict: "うかがう", masu: "うかがいます", masen: "うかがいません", mashita: "うかがいました", te: "うかがって", nai: "うかがわない", ta: "うかがった", tai: "うかがいたい",
             pot: "うかがえる", vol: "うかがおう", ba: "うかがえば", imp: "うかがえ", pass: "うかがわれる", caus: "うかがわせる" } },
  { dict: "あらわす", reading: "arawasu", group: 1, meaning: "แสดงออก / สื่อ",
    forms: { dict: "あらわす", masu: "あらわします", masen: "あらわしません", mashita: "あらわしました", te: "あらわして", nai: "あらわさない", ta: "あらわした", tai: "あらわしたい",
             pot: "あらわせる", vol: "あらわそう", ba: "あらわせば", imp: "あらわせ", pass: "あらわされる", caus: "あらわさせる" } },
  { dict: "うつる", reading: "utsuru", group: 1, meaning: "ย้าย / สะท้อน",
    forms: { dict: "うつる", masu: "うつります", masen: "うつりません", mashita: "うつりました", te: "うつって", nai: "うつらない", ta: "うつった", tai: "うつりたい",
             pot: "うつれる", vol: "うつろう", ba: "うつれば", imp: "うつれ", pass: "うつられる", caus: "うつらせる" } },
  { dict: "なやむ", reading: "nayamu", group: 1, meaning: "กังวล / กลุ้มใจ",
    forms: { dict: "なやむ", masu: "なやみます", masen: "なやみません", mashita: "なやみました", te: "なやんで", nai: "なやまない", ta: "なやんだ", tai: "なやみたい",
             pot: "なやめる", vol: "なやもう", ba: "なやめば", imp: "なやめ", pass: "なやまれる", caus: "なやませる" } },
  { dict: "ふくむ", reading: "fukumu", group: 1, meaning: "บรรจุ / รวมถึง",
    forms: { dict: "ふくむ", masu: "ふくみます", masen: "ふくみません", mashita: "ふくみました", te: "ふくんで", nai: "ふくまない", ta: "ふくんだ", tai: "ふくみたい",
             pot: "ふくめる", vol: "ふくもう", ba: "ふくめば", imp: "ふくめ", pass: "ふくまれる", caus: "ふくませる" } },
  { dict: "あらわれる", reading: "arawareru", group: 2, meaning: "ปรากฏ",
    forms: { dict: "あらわれる", masu: "あらわれます", masen: "あらわれません", mashita: "あらわれました", te: "あらわれて", nai: "あらわれない", ta: "あらわれた", tai: "あらわれたい",
             pot: "あらわれられる", vol: "あらわれよう", ba: "あらわれれば", imp: "あらわれろ", pass: "あらわれられる", caus: "あらわれさせる" } },
  { dict: "くらべる", reading: "kuraberu", group: 2, meaning: "เปรียบเทียบ",
    forms: { dict: "くらべる", masu: "くらべます", masen: "くらべません", mashita: "くらべました", te: "くらべて", nai: "くらべない", ta: "くらべた", tai: "くらべたい",
             pot: "くらべられる", vol: "くらべよう", ba: "くらべれば", imp: "くらべろ", pass: "くらべられる", caus: "くらべさせる" } },
  { dict: "あたえる", reading: "ataeru", group: 2, meaning: "ให้ / มอบให้",
    forms: { dict: "あたえる", masu: "あたえます", masen: "あたえません", mashita: "あたえました", te: "あたえて", nai: "あたえない", ta: "あたえた", tai: "あたえたい",
             pot: "あたえられる", vol: "あたえよう", ba: "あたえれば", imp: "あたえろ", pass: "あたえられる", caus: "あたえさせる" } },
  { dict: "もとめる", reading: "motomeru", group: 2, meaning: "ร้องขอ / เรียกร้อง",
    forms: { dict: "もとめる", masu: "もとめます", masen: "もとめません", mashita: "もとめました", te: "もとめて", nai: "もとめない", ta: "もとめた", tai: "もとめたい",
             pot: "もとめられる", vol: "もとめよう", ba: "もとめれば", imp: "もとめろ", pass: "もとめられる", caus: "もとめさせる" } },
  { dict: "つたえる", reading: "tsutaeru", group: 2, meaning: "บอกต่อ / ถ่ายทอด",
    forms: { dict: "つたえる", masu: "つたえます", masen: "つたえません", mashita: "つたえました", te: "つたえて", nai: "つたえない", ta: "つたえた", tai: "つたえたい",
             pot: "つたえられる", vol: "つたえよう", ba: "つたえれば", imp: "つたえろ", pass: "つたえられる", caus: "つたえさせる" } }
];

window.N3_ADJECTIVES = [
  // === คำคุณศัพท์ N3 ใหม่ ===
  { word: "ゆたか", kind: "na", meaning: "อุดมสมบูรณ์",
    forms: { neg: "ゆたかじゃない", past: "ゆたかだった", "past-neg": "ゆたかじゃなかった", modify: "ゆたかな", adv: "ゆたかに" } },
  { word: "あきらか", kind: "na", meaning: "ชัดเจน",
    forms: { neg: "あきらかじゃない", past: "あきらかだった", "past-neg": "あきらかじゃなかった", modify: "あきらかな", adv: "あきらかに" } },
  { word: "むだ", kind: "na", meaning: "ไร้ประโยชน์",
    forms: { neg: "むだじゃない", past: "むだだった", "past-neg": "むだじゃなかった", modify: "むだな", adv: "むだに" } },
  { word: "おだやか", kind: "na", meaning: "สงบ / นุ่มนวล",
    forms: { neg: "おだやかじゃない", past: "おだやかだった", "past-neg": "おだやかじゃなかった", modify: "おだやかな", adv: "おだやかに" } },
  { word: "するどい", kind: "i", meaning: "แหลม / คม",
    forms: { neg: "するどくない", past: "するどかった", "past-neg": "するどくなかった", adv: "するどく", noun: "するどさ" } },
  { word: "けわしい", kind: "i", meaning: "ลาดชัน / รุนแรง",
    forms: { neg: "けわしくない", past: "けわしかった", "past-neg": "けわしくなかった", adv: "けわしく", noun: "けわしさ" } },
  { word: "なつかしい", kind: "i", meaning: "คิดถึง (ความหลัง)",
    forms: { neg: "なつかしくない", past: "なつかしかった", "past-neg": "なつかしくなかった", adv: "なつかしく", noun: "なつかしさ" } },
  { word: "くわしい", kind: "i", meaning: "ละเอียด / รู้ดี",
    forms: { neg: "くわしくない", past: "くわしかった", "past-neg": "くわしくなかった", adv: "くわしく", noun: "くわしさ" } }
];

window.N3_FORM_LABELS = {
  // ใช้ label เดียวกับ N4 เพราะรูปกริยาไม่ได้เพิ่มใหม่
  pot:  "รูปสามารถ (~e+る / ~られる / できる) (N4↑)",
  vol:  "รูปตั้งใจ (意向形 ~oう / ~よう) (N4↑)",
  ba:   "รูปเงื่อนไข (~e+ば / ~れば) (N4↑)",
  imp:  "รูปสั่ง (命令形 ~e / ~ろ) (N4↑)",
  pass: "รูปถูกกระทำ (受身形 ~a+れる / ~られる) (N4↑)",
  caus: "รูปให้/ทำให้ (使役形 ~a+せる / ~させる) (N4↑)",
  adv:  "รูปวิเศษณ์ (い→く / な→に) (N4↑)",
  noun: "รูปนาม (い→さ) (N4↑)"
};
