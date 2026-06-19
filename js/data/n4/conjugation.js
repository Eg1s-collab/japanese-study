/**
 * Conjugation drill data for N4 (Minna no Nihongo II, lessons 26–50).
 *
 * Strategy:
 *   • Re-state common N5 verbs by `dict` so the view's aggregate() merges
 *     N4 forms into them (potential/volitional/ba/imperative/passive/causative).
 *   • Add new N4 vocabulary with both N5 base forms and N4 extension forms,
 *     so the verb appears in the drill from N4 onward.
 *
 * New verb forms:
 *   pot   = potential (~e+る / ~られる / できる)        [Lesson 27]
 *   vol   = volitional (~oう / ~よう / しよう / こよう)   [Lesson 31]
 *   ba    = conditional (~e+ば / ~れば / すれば / くれば) [Lesson 35]
 *   imp   = imperative (~e / ~ろ / しろ / こい)          [Lesson 33]
 *   pass  = passive (~a+れる / ~られる)                  [Lesson 37]
 *   caus  = causative (~a+せる / ~させる)                [Lesson 48]
 *
 * New adjective forms:
 *   adv   = adverb form (い→く / な→に)                  [Lesson 36]
 *   noun  = noun-form (い→さ)  (i-adj only)              [Lesson 36]
 */

window.N4_VERBS = [
  // === Extend existing N5 verbs with N4 forms (merged into N5 entries via aggregate()) ===

  // --- Godan (group 1) ---
  { dict: "のむ", group: 1,
    forms: { pot: "のめる", vol: "のもう", ba: "のめば", imp: "のめ", pass: "のまれる", caus: "のませる" } },
  { dict: "かく", group: 1,
    forms: { pot: "かける", vol: "かこう", ba: "かけば", imp: "かけ", pass: "かかれる", caus: "かかせる" } },
  { dict: "はなす", group: 1,
    forms: { pot: "はなせる", vol: "はなそう", ba: "はなせば", imp: "はなせ", pass: "はなされる", caus: "はなさせる" } },
  { dict: "あう", group: 1,
    forms: { pot: "あえる", vol: "あおう", ba: "あえば", imp: "あえ", pass: "あわれる", caus: "あわせる" } },
  { dict: "まつ", group: 1,
    forms: { pot: "まてる", vol: "まとう", ba: "まてば", imp: "まて", pass: "またれる", caus: "またせる" } },
  { dict: "かえる", group: 1,
    forms: { pot: "かえれる", vol: "かえろう", ba: "かえれば", imp: "かえれ", pass: "かえられる", caus: "かえらせる" } },
  { dict: "いく", group: 1,
    forms: { pot: "いける", vol: "いこう", ba: "いけば", imp: "いけ", pass: "いかれる", caus: "いかせる" } },
  { dict: "あそぶ", group: 1,
    forms: { pot: "あそべる", vol: "あそぼう", ba: "あそべば", imp: "あそべ", pass: "あそばれる", caus: "あそばせる" } },
  { dict: "かう", group: 1,
    forms: { pot: "かえる", vol: "かおう", ba: "かえば", imp: "かえ", pass: "かわれる", caus: "かわせる" } },
  { dict: "よむ", group: 1,
    forms: { pot: "よめる", vol: "よもう", ba: "よめば", imp: "よめ", pass: "よまれる", caus: "よませる" } },
  { dict: "きく", group: 1,
    forms: { pot: "きける", vol: "きこう", ba: "きけば", imp: "きけ", pass: "きかれる", caus: "きかせる" } },
  { dict: "はたらく", group: 1,
    forms: { pot: "はたらける", vol: "はたらこう", ba: "はたらけば", imp: "はたらけ", pass: "はたらかれる", caus: "はたらかせる" } },
  { dict: "つかう", group: 1,
    forms: { pot: "つかえる", vol: "つかおう", ba: "つかえば", imp: "つかえ", pass: "つかわれる", caus: "つかわせる" } },
  { dict: "およぐ", group: 1,
    forms: { pot: "およげる", vol: "およごう", ba: "およげば", imp: "およげ", pass: "およがれる", caus: "およがせる" } },
  { dict: "もつ", group: 1,
    forms: { pot: "もてる", vol: "もとう", ba: "もてば", imp: "もて", pass: "もたれる", caus: "もたせる" } },
  { dict: "いう", group: 1,
    forms: { pot: "いえる", vol: "いおう", ba: "いえば", imp: "いえ", pass: "いわれる", caus: "いわせる" } },
  { dict: "おもう", group: 1,
    forms: { pot: "おもえる", vol: "おもおう", ba: "おもえば", imp: "おもえ", pass: "おもわれる", caus: "おもわせる" } },
  { dict: "つくる", group: 1,
    forms: { pot: "つくれる", vol: "つくろう", ba: "つくれば", imp: "つくれ", pass: "つくられる", caus: "つくらせる" } },
  { dict: "やすむ", group: 1,
    forms: { pot: "やすめる", vol: "やすもう", ba: "やすめば", imp: "やすめ", pass: "やすまれる", caus: "やすませる" } },
  { dict: "おわる", group: 1,
    forms: { pot: "おわれる", vol: "おわろう", ba: "おわれば", imp: "おわれ", pass: "おわられる", caus: "おわらせる" } },

  // --- Ichidan (group 2) ---
  { dict: "たべる", group: 2,
    forms: { pot: "たべられる", vol: "たべよう", ba: "たべれば", imp: "たべろ", pass: "たべられる", caus: "たべさせる" } },
  { dict: "みる", group: 2,
    forms: { pot: "みられる", vol: "みよう", ba: "みれば", imp: "みろ", pass: "みられる", caus: "みさせる" } },
  { dict: "ねる", group: 2,
    forms: { pot: "ねられる", vol: "ねよう", ba: "ねれば", imp: "ねろ", pass: "ねられる", caus: "ねさせる" } },
  { dict: "おきる", group: 2,
    forms: { pot: "おきられる", vol: "おきよう", ba: "おきれば", imp: "おきろ", pass: "おきられる", caus: "おきさせる" } },
  { dict: "おしえる", group: 2,
    forms: { pot: "おしえられる", vol: "おしえよう", ba: "おしえれば", imp: "おしえろ", pass: "おしえられる", caus: "おしえさせる" } },
  { dict: "でる", group: 2,
    forms: { pot: "でられる", vol: "でよう", ba: "でれば", imp: "でろ", pass: "でられる", caus: "でさせる" } },
  { dict: "おぼえる", group: 2,
    forms: { pot: "おぼえられる", vol: "おぼえよう", ba: "おぼえれば", imp: "おぼえろ", pass: "おぼえられる", caus: "おぼえさせる" } },
  { dict: "はじめる", group: 2,
    forms: { pot: "はじめられる", vol: "はじめよう", ba: "はじめれば", imp: "はじめろ", pass: "はじめられる", caus: "はじめさせる" } },

  // --- Irregular (group 3) ---
  { dict: "する", group: 3,
    forms: { pot: "できる", vol: "しよう", ba: "すれば", imp: "しろ", pass: "される", caus: "させる" } },
  { dict: "くる", group: 3,
    forms: { pot: "こられる", vol: "こよう", ba: "くれば", imp: "こい", pass: "こられる", caus: "こさせる" } },
  { dict: "べんきょうする", group: 3,
    forms: { pot: "べんきょうできる", vol: "べんきょうしよう", ba: "べんきょうすれば", imp: "べんきょうしろ", pass: "べんきょうされる", caus: "べんきょうさせる" } },
  { dict: "うんてんする", group: 3,
    forms: { pot: "うんてんできる", vol: "うんてんしよう", ba: "うんてんすれば", imp: "うんてんしろ", pass: "うんてんされる", caus: "うんてんさせる" } },

  // === New N4-only vocabulary (full base + N4 extension) ===

  // -- Godan (group 1) --
  { dict: "さがす", reading: "sagasu", group: 1, meaning: "ค้นหา",
    forms: { dict: "さがす", masu: "さがします", masen: "さがしません", mashita: "さがしました", te: "さがして", nai: "さがさない", ta: "さがした", tai: "さがしたい",
             pot: "さがせる", vol: "さがそう", ba: "さがせば", imp: "さがせ", pass: "さがされる", caus: "さがさせる" } },
  { dict: "おこる", reading: "okoru", group: 1, meaning: "โกรธ",
    forms: { dict: "おこる", masu: "おこります", masen: "おこりません", mashita: "おこりました", te: "おこって", nai: "おこらない", ta: "おこった", tai: "おこりたい",
             pot: "おこれる", vol: "おころう", ba: "おこれば", imp: "おこれ", pass: "おこられる", caus: "おこらせる" } },
  { dict: "なく", reading: "naku", group: 1, meaning: "ร้องไห้",
    forms: { dict: "なく", masu: "なきます", masen: "なきません", mashita: "なきました", te: "ないて", nai: "なかない", ta: "ないた", tai: "なきたい",
             pot: "なける", vol: "なこう", ba: "なけば", imp: "なけ", pass: "なかれる", caus: "なかせる" } },
  { dict: "わらう", reading: "warau", group: 1, meaning: "หัวเราะ",
    forms: { dict: "わらう", masu: "わらいます", masen: "わらいません", mashita: "わらいました", te: "わらって", nai: "わらわない", ta: "わらった", tai: "わらいたい",
             pot: "わらえる", vol: "わらおう", ba: "わらえば", imp: "わらえ", pass: "わらわれる", caus: "わらわせる" } },
  { dict: "ぬすむ", reading: "nusumu", group: 1, meaning: "ขโมย",
    forms: { dict: "ぬすむ", masu: "ぬすみます", masen: "ぬすみません", mashita: "ぬすみました", te: "ぬすんで", nai: "ぬすまない", ta: "ぬすんだ", tai: "ぬすみたい",
             pot: "ぬすめる", vol: "ぬすもう", ba: "ぬすめば", imp: "ぬすめ", pass: "ぬすまれる", caus: "ぬすませる" } },
  { dict: "ふむ", reading: "fumu", group: 1, meaning: "เหยียบ",
    forms: { dict: "ふむ", masu: "ふみます", masen: "ふみません", mashita: "ふみました", te: "ふんで", nai: "ふまない", ta: "ふんだ", tai: "ふみたい",
             pot: "ふめる", vol: "ふもう", ba: "ふめば", imp: "ふめ", pass: "ふまれる", caus: "ふませる" } },
  { dict: "やくにたつ", reading: "yaku-ni-tatsu", group: 1, meaning: "เป็นประโยชน์",
    forms: { dict: "やくにたつ", masu: "やくにたちます", masen: "やくにたちません", mashita: "やくにたちました", te: "やくにたって", nai: "やくにたたない", ta: "やくにたった", tai: "やくにたちたい",
             pot: "やくにたてる", vol: "やくにたとう", ba: "やくにたてば", imp: "やくにたて", pass: "やくにたたれる", caus: "やくにたたせる" } },
  { dict: "なおる", reading: "naoru", group: 1, meaning: "หาย / ซ่อมแล้ว",
    forms: { dict: "なおる", masu: "なおります", masen: "なおりません", mashita: "なおりました", te: "なおって", nai: "なおらない", ta: "なおった", tai: "なおりたい",
             pot: "なおれる", vol: "なおろう", ba: "なおれば", imp: "なおれ", pass: "なおられる", caus: "なおらせる" } },
  { dict: "ぬぐ", reading: "nugu", group: 1, meaning: "ถอด (เสื้อ/รองเท้า)",
    forms: { dict: "ぬぐ", masu: "ぬぎます", masen: "ぬぎません", mashita: "ぬぎました", te: "ぬいで", nai: "ぬがない", ta: "ぬいだ", tai: "ぬぎたい",
             pot: "ぬげる", vol: "ぬごう", ba: "ぬげば", imp: "ぬげ", pass: "ぬがれる", caus: "ぬがせる" } },
  { dict: "もうしこむ", reading: "moushikomu", group: 1, meaning: "สมัคร",
    forms: { dict: "もうしこむ", masu: "もうしこみます", masen: "もうしこみません", mashita: "もうしこみました", te: "もうしこんで", nai: "もうしこまない", ta: "もうしこんだ", tai: "もうしこみたい",
             pot: "もうしこめる", vol: "もうしこもう", ba: "もうしこめば", imp: "もうしこめ", pass: "もうしこまれる", caus: "もうしこませる" } },
  { dict: "しかる", reading: "shikaru", group: 1, meaning: "ดุ",
    forms: { dict: "しかる", masu: "しかります", masen: "しかりません", mashita: "しかりました", te: "しかって", nai: "しからない", ta: "しかった", tai: "しかりたい",
             pot: "しかれる", vol: "しかろう", ba: "しかれば", imp: "しかれ", pass: "しかられる", caus: "しからせる" } },
  { dict: "つたわる", reading: "tsutawaru", group: 1, meaning: "ถ่ายทอด (ออโต้)",
    forms: { dict: "つたわる", masu: "つたわります", masen: "つたわりません", mashita: "つたわりました", te: "つたわって", nai: "つたわらない", ta: "つたわった", tai: "つたわりたい",
             pot: "つたわれる", vol: "つたわろう", ba: "つたわれば", imp: "つたわれ", pass: "つたわられる", caus: "つたわらせる" } },

  // -- Ichidan (group 2) --
  { dict: "しらべる", reading: "shiraberu", group: 2, meaning: "ค้นคว้า / ตรวจสอบ",
    forms: { dict: "しらべる", masu: "しらべます", masen: "しらべません", mashita: "しらべました", te: "しらべて", nai: "しらべない", ta: "しらべた", tai: "しらべたい",
             pot: "しらべられる", vol: "しらべよう", ba: "しらべれば", imp: "しらべろ", pass: "しらべられる", caus: "しらべさせる" } },
  { dict: "つたえる", reading: "tsutaeru", group: 2, meaning: "ถ่ายทอด / บอก",
    forms: { dict: "つたえる", masu: "つたえます", masen: "つたえません", mashita: "つたえました", te: "つたえて", nai: "つたえない", ta: "つたえた", tai: "つたえたい",
             pot: "つたえられる", vol: "つたえよう", ba: "つたえれば", imp: "つたえろ", pass: "つたえられる", caus: "つたえさせる" } },
  { dict: "きめる", reading: "kimeru", group: 2, meaning: "ตัดสินใจ",
    forms: { dict: "きめる", masu: "きめます", masen: "きめません", mashita: "きめました", te: "きめて", nai: "きめない", ta: "きめた", tai: "きめたい",
             pot: "きめられる", vol: "きめよう", ba: "きめれば", imp: "きめろ", pass: "きめられる", caus: "きめさせる" } },
  { dict: "やめる", reading: "yameru", group: 2, meaning: "เลิก / ยุติ",
    forms: { dict: "やめる", masu: "やめます", masen: "やめません", mashita: "やめました", te: "やめて", nai: "やめない", ta: "やめた", tai: "やめたい",
             pot: "やめられる", vol: "やめよう", ba: "やめれば", imp: "やめろ", pass: "やめられる", caus: "やめさせる" } },
  { dict: "ほめる", reading: "homeru", group: 2, meaning: "ชม",
    forms: { dict: "ほめる", masu: "ほめます", masen: "ほめません", mashita: "ほめました", te: "ほめて", nai: "ほめない", ta: "ほめた", tai: "ほめたい",
             pot: "ほめられる", vol: "ほめよう", ba: "ほめれば", imp: "ほめろ", pass: "ほめられる", caus: "ほめさせる" } },

  // -- Irregular (group 3) — N4 compounds --
  { dict: "しっぱいする", reading: "shippai-suru", group: 3, meaning: "ล้มเหลว",
    forms: { dict: "しっぱいする", masu: "しっぱいします", masen: "しっぱいしません", mashita: "しっぱいしました", te: "しっぱいして", nai: "しっぱいしない", ta: "しっぱいした", tai: "しっぱいしたい",
             pot: "しっぱいできる", vol: "しっぱいしよう", ba: "しっぱいすれば", imp: "しっぱいしろ", pass: "しっぱいされる", caus: "しっぱいさせる" } },
  { dict: "せいこうする", reading: "seikou-suru", group: 3, meaning: "ประสบความสำเร็จ",
    forms: { dict: "せいこうする", masu: "せいこうします", masen: "せいこうしません", mashita: "せいこうしました", te: "せいこうして", nai: "せいこうしない", ta: "せいこうした", tai: "せいこうしたい",
             pot: "せいこうできる", vol: "せいこうしよう", ba: "せいこうすれば", imp: "せいこうしろ", pass: "せいこうされる", caus: "せいこうさせる" } },
  { dict: "そつぎょうする", reading: "sotsugyou-suru", group: 3, meaning: "จบการศึกษา",
    forms: { dict: "そつぎょうする", masu: "そつぎょうします", masen: "そつぎょうしません", mashita: "そつぎょうしました", te: "そつぎょうして", nai: "そつぎょうしない", ta: "そつぎょうした", tai: "そつぎょうしたい",
             pot: "そつぎょうできる", vol: "そつぎょうしよう", ba: "そつぎょうすれば", imp: "そつぎょうしろ", pass: "そつぎょうされる", caus: "そつぎょうさせる" } },
  { dict: "しょうかいする", reading: "shoukai-suru", group: 3, meaning: "แนะนำ (คน)",
    forms: { dict: "しょうかいする", masu: "しょうかいします", masen: "しょうかいしません", mashita: "しょうかいしました", te: "しょうかいして", nai: "しょうかいしない", ta: "しょうかいした", tai: "しょうかいしたい",
             pot: "しょうかいできる", vol: "しょうかいしよう", ba: "しょうかいすれば", imp: "しょうかいしろ", pass: "しょうかいされる", caus: "しょうかいさせる" } }
];

window.N4_ADJECTIVES = [
  // === Extend existing N5 adjectives with N4 forms (adv / noun) ===

  // -- i-adj: adv (く), noun (さ) --
  { word: "たかい", kind: "i",
    forms: { adv: "たかく", noun: "たかさ" } },
  { word: "やすい", kind: "i",
    forms: { adv: "やすく", noun: "やすさ" } },
  { word: "おおきい", kind: "i",
    forms: { adv: "おおきく", noun: "おおきさ" } },
  { word: "ちいさい", kind: "i",
    forms: { adv: "ちいさく", noun: "ちいささ" } },
  { word: "おいしい", kind: "i",
    forms: { adv: "おいしく", noun: "おいしさ" } },
  { word: "あつい", kind: "i",
    forms: { adv: "あつく", noun: "あつさ" } },
  { word: "さむい", kind: "i",
    forms: { adv: "さむく", noun: "さむさ" } },
  { word: "いい", kind: "i",
    forms: { adv: "よく", noun: "よさ" } },
  { word: "ながい", kind: "i",
    forms: { adv: "ながく", noun: "ながさ" } },
  { word: "みじかい", kind: "i",
    forms: { adv: "みじかく", noun: "みじかさ" } },
  { word: "おもい", kind: "i",
    forms: { adv: "おもく", noun: "おもさ" } },
  { word: "かるい", kind: "i",
    forms: { adv: "かるく", noun: "かるさ" } },
  { word: "はやい", kind: "i",
    forms: { adv: "はやく", noun: "はやさ" } },
  { word: "おそい", kind: "i",
    forms: { adv: "おそく", noun: "おそさ" } },
  { word: "たのしい", kind: "i",
    forms: { adv: "たのしく", noun: "たのしさ" } },
  { word: "むずかしい", kind: "i",
    forms: { adv: "むずかしく", noun: "むずかしさ" } },
  { word: "ひろい", kind: "i",
    forms: { adv: "ひろく", noun: "ひろさ" } },

  // -- na-adj: adv (に) --
  { word: "しずか", kind: "na",
    forms: { adv: "しずかに" } },
  { word: "きれい", kind: "na",
    forms: { adv: "きれいに" } },
  { word: "げんき", kind: "na",
    forms: { adv: "げんきに" } },
  { word: "にぎやか", kind: "na",
    forms: { adv: "にぎやかに" } },
  { word: "じょうず", kind: "na",
    forms: { adv: "じょうずに" } },
  { word: "へた", kind: "na",
    forms: { adv: "へたに" } },
  { word: "かんたん", kind: "na",
    forms: { adv: "かんたんに" } },
  { word: "しんせつ", kind: "na",
    forms: { adv: "しんせつに" } },

  // === New N4 adjectives (full base + adv/noun) ===

  // -- i-adj --
  { word: "あぶない", kind: "i", meaning: "อันตราย",
    forms: { neg: "あぶなくない", past: "あぶなかった", "past-neg": "あぶなくなかった", adv: "あぶなく", noun: "あぶなさ" } },
  { word: "うつくしい", kind: "i", meaning: "งดงาม",
    forms: { neg: "うつくしくない", past: "うつくしかった", "past-neg": "うつくしくなかった", adv: "うつくしく", noun: "うつくしさ" } },
  { word: "さびしい", kind: "i", meaning: "เหงา",
    forms: { neg: "さびしくない", past: "さびしかった", "past-neg": "さびしくなかった", adv: "さびしく", noun: "さびしさ" } },
  { word: "きびしい", kind: "i", meaning: "เคร่งครัด",
    forms: { neg: "きびしくない", past: "きびしかった", "past-neg": "きびしくなかった", adv: "きびしく", noun: "きびしさ" } },
  { word: "やわらかい", kind: "i", meaning: "นุ่ม",
    forms: { neg: "やわらかくない", past: "やわらかかった", "past-neg": "やわらかくなかった", adv: "やわらかく", noun: "やわらかさ" } },
  { word: "かたい", kind: "i", meaning: "แข็ง",
    forms: { neg: "かたくない", past: "かたかった", "past-neg": "かたくなかった", adv: "かたく", noun: "かたさ" } },
  { word: "ふかい", kind: "i", meaning: "ลึก",
    forms: { neg: "ふかくない", past: "ふかかった", "past-neg": "ふかくなかった", adv: "ふかく", noun: "ふかさ" } },
  { word: "あさい", kind: "i", meaning: "ตื้น",
    forms: { neg: "あさくない", past: "あさかった", "past-neg": "あさくなかった", adv: "あさく", noun: "あささ" } },

  // -- na-adj --
  { word: "あんぜん", kind: "na", meaning: "ปลอดภัย",
    forms: { neg: "あんぜんじゃない", past: "あんぜんだった", "past-neg": "あんぜんじゃなかった", modify: "あんぜんな", adv: "あんぜんに" } },
  { word: "じゆう", kind: "na", meaning: "อิสระ",
    forms: { neg: "じゆうじゃない", past: "じゆうだった", "past-neg": "じゆうじゃなかった", modify: "じゆうな", adv: "じゆうに" } },
  { word: "まじめ", kind: "na", meaning: "เอาจริงเอาจัง",
    forms: { neg: "まじめじゃない", past: "まじめだった", "past-neg": "まじめじゃなかった", modify: "まじめな", adv: "まじめに" } },
  { word: "ねっしん", kind: "na", meaning: "ขยัน / ตั้งใจ",
    forms: { neg: "ねっしんじゃない", past: "ねっしんだった", "past-neg": "ねっしんじゃなかった", modify: "ねっしんな", adv: "ねっしんに" } },
  { word: "ふくざつ", kind: "na", meaning: "ซับซ้อน",
    forms: { neg: "ふくざつじゃない", past: "ふくざつだった", "past-neg": "ふくざつじゃなかった", modify: "ふくざつな", adv: "ふくざつに" } },
  { word: "とくべつ", kind: "na", meaning: "พิเศษ",
    forms: { neg: "とくべつじゃない", past: "とくべつだった", "past-neg": "とくべつじゃなかった", modify: "とくべつな", adv: "とくべつに" } }
];

window.N4_FORM_LABELS = {
  // verbs (N4-only)
  pot:  "รูปสามารถ (~e+る / ~られる / できる) (N4)",
  vol:  "รูปตั้งใจ (意向形 ~oう / ~よう) (N4)",
  ba:   "รูปเงื่อนไข (~e+ば / ~れば) (N4)",
  imp:  "รูปสั่ง (命令形 ~e / ~ろ) (N4)",
  pass: "รูปถูกกระทำ (受身形 ~a+れる / ~られる) (N4)",
  caus: "รูปให้/ทำให้ (使役形 ~a+せる / ~させる) (N4)",
  // adjectives (N4-only)
  adv:  "รูปวิเศษณ์ (い→く / な→に) (N4)",
  noun: "รูปนาม (い→さ) (N4)"
};
