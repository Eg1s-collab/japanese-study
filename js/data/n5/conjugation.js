/**
 * Conjugation drill data for N5.
 *
 * Verb groups:
 *   1 = godan (五段)
 *   2 = ichidan (一段)
 *   3 = irregular (する / くる / 〜する)
 *
 * Adjective kinds: "i", "na"
 *
 * Forms:
 *   verb : "masu", "masen", "mashita", "te", "nai", "ta", "tai", "dict"
 *   i-adj: "neg", "past", "past-neg"
 *   na-adj: "neg", "past", "past-neg", "modify" (oo な + N)
 */

window.N5_VERBS = [
  { dict: "のむ",     reading: "nomu",     group: 1, meaning: "ดื่ม",
    forms: { dict: "のむ", masu: "のみます", masen: "のみません", mashita: "のみました", te: "のんで", nai: "のまない", ta: "のんだ", tai: "のみたい" } },
  { dict: "かく",     reading: "kaku",     group: 1, meaning: "เขียน",
    forms: { dict: "かく", masu: "かきます", masen: "かきません", mashita: "かきました", te: "かいて", nai: "かかない", ta: "かいた", tai: "かきたい" } },
  { dict: "はなす",   reading: "hanasu",   group: 1, meaning: "พูด",
    forms: { dict: "はなす", masu: "はなします", masen: "はなしません", mashita: "はなしました", te: "はなして", nai: "はなさない", ta: "はなした", tai: "はなしたい" } },
  { dict: "あう",     reading: "au",       group: 1, meaning: "พบ",
    forms: { dict: "あう", masu: "あいます", masen: "あいません", mashita: "あいました", te: "あって", nai: "あわない", ta: "あった", tai: "あいたい" } },
  { dict: "まつ",     reading: "matsu",    group: 1, meaning: "รอ",
    forms: { dict: "まつ", masu: "まちます", masen: "まちません", mashita: "まちました", te: "まって", nai: "またない", ta: "まった", tai: "まちたい" } },
  { dict: "かえる",   reading: "kaeru",    group: 1, meaning: "กลับ (godan ลวงตา)",
    forms: { dict: "かえる", masu: "かえります", masen: "かえりません", mashita: "かえりました", te: "かえって", nai: "かえらない", ta: "かえった", tai: "かえりたい" } },
  { dict: "いく",     reading: "iku",      group: 1, meaning: "ไป (て-form ผิดกฎ)",
    forms: { dict: "いく", masu: "いきます", masen: "いきません", mashita: "いきました", te: "いって", nai: "いかない", ta: "いった", tai: "いきたい" } },
  { dict: "あそぶ",   reading: "asobu",    group: 1, meaning: "เล่น",
    forms: { dict: "あそぶ", masu: "あそびます", masen: "あそびません", mashita: "あそびました", te: "あそんで", nai: "あそばない", ta: "あそんだ", tai: "あそびたい" } },
  { dict: "かう",     reading: "kau",      group: 1, meaning: "ซื้อ",
    forms: { dict: "かう", masu: "かいます", masen: "かいません", mashita: "かいました", te: "かって", nai: "かわない", ta: "かった", tai: "かいたい" } },
  { dict: "よむ",     reading: "yomu",     group: 1, meaning: "อ่าน",
    forms: { dict: "よむ", masu: "よみます", masen: "よみません", mashita: "よみました", te: "よんで", nai: "よまない", ta: "よんだ", tai: "よみたい" } },
  { dict: "はしる",   reading: "hashiru",  group: 1, meaning: "วิ่ง (godan ลวงตา)",
    forms: { dict: "はしる", masu: "はしります", masen: "はしりません", mashita: "はしりました", te: "はしって", nai: "はしらない", ta: "はしった", tai: "はしりたい" } },
  { dict: "はいる",   reading: "hairu",    group: 1, meaning: "เข้า (godan ลวงตา)",
    forms: { dict: "はいる", masu: "はいります", masen: "はいりません", mashita: "はいりました", te: "はいって", nai: "はいらない", ta: "はいった", tai: "はいりたい" } },
  { dict: "もらう",   reading: "morau",    group: 1, meaning: "ได้รับ",
    forms: { dict: "もらう", masu: "もらいます", masen: "もらいません", mashita: "もらいました", te: "もらって", nai: "もらわない", ta: "もらった", tai: "もらいたい" } },
  { dict: "わかる",   reading: "wakaru",   group: 1, meaning: "เข้าใจ",
    forms: { dict: "わかる", masu: "わかります", masen: "わかりません", mashita: "わかりました", te: "わかって", nai: "わからない", ta: "わかった", tai: "わかりたい" } },
  { dict: "ある",     reading: "aru",      group: 1, meaning: "มี (สิ่งของ — nai = ない พิเศษ)",
    forms: { dict: "ある", masu: "あります", masen: "ありません", mashita: "ありました", te: "あって", nai: "ない", ta: "あった", tai: "ありたい" } },
  { dict: "およぐ",   reading: "oyogu",    group: 1, meaning: "ว่ายน้ำ",
    forms: { dict: "およぐ", masu: "およぎます", masen: "およぎません", mashita: "およぎました", te: "およいで", nai: "およがない", ta: "およいだ", tai: "およぎたい" } },
  { dict: "とる",     reading: "toru",     group: 1, meaning: "ถ่าย / หยิบ",
    forms: { dict: "とる", masu: "とります", masen: "とりません", mashita: "とりました", te: "とって", nai: "とらない", ta: "とった", tai: "とりたい" } },
  { dict: "すむ",     reading: "sumu",     group: 1, meaning: "อาศัยอยู่ (มักใช้ ~ている)",
    forms: { dict: "すむ", masu: "すみます", masen: "すみません", mashita: "すみました", te: "すんで", nai: "すまない", ta: "すんだ", tai: "すみたい" } },
  { dict: "なる",     reading: "naru",     group: 1, meaning: "กลายเป็น",
    forms: { dict: "なる", masu: "なります", masen: "なりません", mashita: "なりました", te: "なって", nai: "ならない", ta: "なった", tai: "なりたい" } },
  { dict: "おす",     reading: "osu",      group: 1, meaning: "กด / ดัน",
    forms: { dict: "おす", masu: "おします", masen: "おしません", mashita: "おしました", te: "おして", nai: "おさない", ta: "おした", tai: "おしたい" } },
  { dict: "なおす",   reading: "naosu",    group: 1, meaning: "ซ่อม / แก้",
    forms: { dict: "なおす", masu: "なおします", masen: "なおしません", mashita: "なおしました", te: "なおして", nai: "なおさない", ta: "なおした", tai: "なおしたい" } },

  { dict: "たべる",   reading: "taberu",   group: 2, meaning: "กิน",
    forms: { dict: "たべる", masu: "たべます", masen: "たべません", mashita: "たべました", te: "たべて", nai: "たべない", ta: "たべた", tai: "たべたい" } },
  { dict: "みる",     reading: "miru",     group: 2, meaning: "ดู",
    forms: { dict: "みる", masu: "みます", masen: "みません", mashita: "みました", te: "みて", nai: "みない", ta: "みた", tai: "みたい" } },
  { dict: "ねる",     reading: "neru",     group: 2, meaning: "นอน",
    forms: { dict: "ねる", masu: "ねます", masen: "ねません", mashita: "ねました", te: "ねて", nai: "ねない", ta: "ねた", tai: "ねたい" } },
  { dict: "おきる",   reading: "okiru",    group: 2, meaning: "ตื่น",
    forms: { dict: "おきる", masu: "おきます", masen: "おきません", mashita: "おきました", te: "おきて", nai: "おきない", ta: "おきた", tai: "おきたい" } },
  { dict: "おしえる", reading: "oshieru",  group: 2, meaning: "สอน / บอก",
    forms: { dict: "おしえる", masu: "おしえます", masen: "おしえません", mashita: "おしえました", te: "おしえて", nai: "おしえない", ta: "おしえた", tai: "おしえたい" } },
  { dict: "かりる",   reading: "kariru",   group: 2, meaning: "ยืม",
    forms: { dict: "かりる", masu: "かります", masen: "かりません", mashita: "かりました", te: "かりて", nai: "かりない", ta: "かりた", tai: "かりたい" } },
  { dict: "でる",     reading: "deru",     group: 2, meaning: "ออก",
    forms: { dict: "でる", masu: "でます", masen: "でません", mashita: "でました", te: "でて", nai: "でない", ta: "でた", tai: "でたい" } },
  { dict: "あげる",   reading: "ageru",    group: 2, meaning: "ให้ (ของผู้อื่น)",
    forms: { dict: "あげる", masu: "あげます", masen: "あげません", mashita: "あげました", te: "あげて", nai: "あげない", ta: "あげた", tai: "あげたい" } },
  { dict: "いる",     reading: "iru",      group: 2, meaning: "มี (สิ่งมีชีวิต)",
    forms: { dict: "いる", masu: "います", masen: "いません", mashita: "いました", te: "いて", nai: "いない", ta: "いた", tai: "いたい" } },
  { dict: "あびる",   reading: "abiru",    group: 2, meaning: "อาบ (น้ำ/แดด)",
    forms: { dict: "あびる", masu: "あびます", masen: "あびません", mashita: "あびました", te: "あびて", nai: "あびない", ta: "あびた", tai: "あびたい" } },
  { dict: "すすめる", reading: "susumeru", group: 2, meaning: "แนะนำ",
    forms: { dict: "すすめる", masu: "すすめます", masen: "すすめません", mashita: "すすめました", te: "すすめて", nai: "すすめない", ta: "すすめた", tai: "すすめたい" } },

  { dict: "する",     reading: "suru",     group: 3, meaning: "ทำ",
    forms: { dict: "する", masu: "します", masen: "しません", mashita: "しました", te: "して", nai: "しない", ta: "した", tai: "したい" } },
  { dict: "くる",     reading: "kuru",     group: 3, meaning: "มา",
    forms: { dict: "くる", masu: "きます", masen: "きません", mashita: "きました", te: "きて", nai: "こない", ta: "きた", tai: "きたい" } },
  { dict: "べんきょうする", reading: "benkyou-suru", group: 3, meaning: "เรียน",
    forms: { dict: "べんきょうする", masu: "べんきょうします", masen: "べんきょうしません", mashita: "べんきょうしました", te: "べんきょうして", nai: "べんきょうしない", ta: "べんきょうした", tai: "べんきょうしたい" } },
  { dict: "うんてんする", reading: "unten-suru", group: 3, meaning: "ขับ (รถ)",
    forms: { dict: "うんてんする", masu: "うんてんします", masen: "うんてんしません", mashita: "うんてんしました", te: "うんてんして", nai: "うんてんしない", ta: "うんてんした", tai: "うんてんしたい" } },
  { dict: "りょうりする", reading: "ryouri-suru", group: 3, meaning: "ทำอาหาร",
    forms: { dict: "りょうりする", masu: "りょうりします", masen: "りょうりしません", mashita: "りょうりしました", te: "りょうりして", nai: "りょうりしない", ta: "りょうりした", tai: "りょうりしたい" } }
];

window.N5_ADJECTIVES = [
  { word: "たかい", kind: "i", meaning: "แพง / สูง",
    forms: { neg: "たかくない", past: "たかかった", "past-neg": "たかくなかった" } },
  { word: "やすい", kind: "i", meaning: "ถูก",
    forms: { neg: "やすくない", past: "やすかった", "past-neg": "やすくなかった" } },
  { word: "おいしい", kind: "i", meaning: "อร่อย",
    forms: { neg: "おいしくない", past: "おいしかった", "past-neg": "おいしくなかった" } },
  { word: "おおきい", kind: "i", meaning: "ใหญ่",
    forms: { neg: "おおきくない", past: "おおきかった", "past-neg": "おおきくなかった" } },
  { word: "あつい", kind: "i", meaning: "ร้อน",
    forms: { neg: "あつくない", past: "あつかった", "past-neg": "あつくなかった" } },
  { word: "いい", kind: "i", meaning: "ดี (ผิดกฎ — ใช้ราก よ-)",
    forms: { neg: "よくない", past: "よかった", "past-neg": "よくなかった" } },
  { word: "ほしい", kind: "i", meaning: "อยากได้",
    forms: { neg: "ほしくない", past: "ほしかった", "past-neg": "ほしくなかった" } },
  { word: "あたらしい", kind: "i", meaning: "ใหม่",
    forms: { neg: "あたらしくない", past: "あたらしかった", "past-neg": "あたらしくなかった" } },
  { word: "ふるい", kind: "i", meaning: "เก่า",
    forms: { neg: "ふるくない", past: "ふるかった", "past-neg": "ふるくなかった" } },
  { word: "おもしろい", kind: "i", meaning: "น่าสนใจ / สนุก",
    forms: { neg: "おもしろくない", past: "おもしろかった", "past-neg": "おもしろくなかった" } },
  { word: "さむい", kind: "i", meaning: "หนาว",
    forms: { neg: "さむくない", past: "さむかった", "past-neg": "さむくなかった" } },
  { word: "いそがしい", kind: "i", meaning: "ยุ่ง",
    forms: { neg: "いそがしくない", past: "いそがしかった", "past-neg": "いそがしくなかった" } },

  { word: "しずか", kind: "na", meaning: "เงียบ",
    forms: { neg: "しずかじゃない", past: "しずかだった", "past-neg": "しずかじゃなかった", modify: "しずかな" } },
  { word: "きれい", kind: "na", meaning: "สวย / สะอาด",
    forms: { neg: "きれいじゃない", past: "きれいだった", "past-neg": "きれいじゃなかった", modify: "きれいな" } },
  { word: "ゆうめい", kind: "na", meaning: "มีชื่อเสียง",
    forms: { neg: "ゆうめいじゃない", past: "ゆうめいだった", "past-neg": "ゆうめいじゃなかった", modify: "ゆうめいな" } },
  { word: "げんき", kind: "na", meaning: "สบายดี",
    forms: { neg: "げんきじゃない", past: "げんきだった", "past-neg": "げんきじゃなかった", modify: "げんきな" } },
  { word: "べんり", kind: "na", meaning: "สะดวก",
    forms: { neg: "べんりじゃない", past: "べんりだった", "past-neg": "べんりじゃなかった", modify: "べんりな" } },
  { word: "ひま", kind: "na", meaning: "ว่าง",
    forms: { neg: "ひまじゃない", past: "ひまだった", "past-neg": "ひまじゃなかった", modify: "ひまな" } },
  { word: "にぎやか", kind: "na", meaning: "คึกคัก",
    forms: { neg: "にぎやかじゃない", past: "にぎやかだった", "past-neg": "にぎやかじゃなかった", modify: "にぎやかな" } },
  { word: "すき", kind: "na", meaning: "ชอบ",
    forms: { neg: "すきじゃない", past: "すきだった", "past-neg": "すきじゃなかった", modify: "すきな" } },
  { word: "きらい", kind: "na", meaning: "ไม่ชอบ",
    forms: { neg: "きらいじゃない", past: "きらいだった", "past-neg": "きらいじゃなかった", modify: "きらいな" } }
];

window.N5_FORM_LABELS = {
  // verbs
  dict: "รูปดิก (普通形 plain)",
  masu: "ます (สุภาพ ปัจจุบัน)",
  masen: "ません (สุภาพ ปฏิเสธ)",
  mashita: "ました (สุภาพ อดีต)",
  te: "รูป て",
  nai: "ない (plain ปฏิเสธ)",
  ta: "た (plain อดีต)",
  tai: "たい (อยากทำ)",
  // adjectives
  neg: "ปฏิเสธ (plain)",
  past: "อดีต (plain)",
  "past-neg": "อดีตปฏิเสธ (plain)",
  modify: "ขยายคำนาม (+な)"
};
