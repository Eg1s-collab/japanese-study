/**
 * N4 grammar units (เนื้อหาตาม Minna no Nihongo II บทที่ 26–50).
 *
 * โครงสร้างเดียวกับ N5: id (อย่าเปลี่ยน — ใช้คุม bookmark/quiz progress),
 * title, summary, points[], quiz[].
 *
 *  ⚠ การแก้ไขใน array ใด ๆ ให้ "เพิ่มต่อท้าย" เท่านั้น
 *    เพื่อรักษา index ของข้อที่ผู้ใช้บันทึกไว้ใน localStorage.
 */
window.N4_UNITS = [
  {
    id: "n4-u01-nodesu-request",
    title: "Unit 1 — ~んです / ~ていただけませんか  (มินนะ II บท 26)",
    summary: "อธิบายสาเหตุ/ขอข้อมูลด้วย んです, การขอร้องสุภาพมาก ~ていただけませんか",
    points: [
      {
        pattern: "V/A plain + んです / N・なAdj. + な + んです",
        desc: "ใช้อธิบาย เหตุผล/สถานการณ์ หรือถามเหตุผล ใช้ในการสนทนา (เขียนเป็น のです). คำนาม-な + な + んです",
        examples: [
          { jp: "どうして おくれましたか。― バスが おくれたんです。", ro: "Doushite okuremashita ka. — Basu ga okureta n desu.", th: "ทำไมมาสาย? — เพราะรถบัสมาสาย" },
          { jp: "あたまが いたいんです。", ro: "Atama ga itai n desu.", th: "(เพราะว่า) ปวดหัว" },
          { jp: "あの 人は びょうきなんです。", ro: "Ano hito wa byouki na n desu.", th: "คนนั้นไม่สบาย (อธิบาย)" }
        ]
      },
      {
        pattern: "V-て + いただけませんか",
        desc: "ขอร้องอย่างสุภาพมาก (กว่า ください). เหมาะใช้กับคนแปลกหน้า/อาวุโส",
        examples: [
          { jp: "ちょっと てつだって いただけませんか。", ro: "Chotto tetsudatte itadakemasen ka.", th: "ช่วยหน่อยได้ไหมคะ" },
          { jp: "もう いちど 言って いただけませんか。", ro: "Mou ichido itte itadakemasen ka.", th: "พูดอีกครั้งหนึ่งได้ไหมคะ" }
        ]
      },
      {
        pattern: "~んですが、~",
        desc: "ใช้บอกสถานการณ์/บริบทก่อนขอร้อง 'คือว่า…, …'",
        examples: [
          { jp: "にほんごが わからないんですが、てつだって ください。", ro: "Nihongo ga wakaranai n desu ga, tetsudatte kudasai.", th: "ดิฉันไม่เข้าใจภาษาญี่ปุ่น ช่วยหน่อย" }
        ]
      }
    ],
    quiz: [
      { type: "mcq",
        q: "どうして がっこうを やすみましたか。― ____。",
        choices: ["びょうきでした", "びょうきだったんです", "びょうきです", "びょうきな"],
        answer: 1,
        explain: "อธิบายเหตุผลใช้ ~んです (なAdj. → だった + んです)" },
      { type: "fill",
        q: "もう いちど せつめいして ____ませんか。",
        answer: ["いただけ"],
        explain: "~て いただけませんか = ขอร้องสุภาพมาก" },
      { type: "mcq",
        q: "เลือกประโยคที่ใช้ ~んです ถูก",
        choices: ["きょうは いそがしいだんです", "きょうは いそがしいんです", "きょうは いそがしいなんです", "きょうは いそがしくんです"],
        answer: 1,
        explain: "い-adj plain + んです → いそがしい+んです" }
    ]
  },

  {
    id: "n4-u02-potential",
    title: "Unit 2 — รูปสามารถ (可能形 kanou-kei) + 見える(mieru)/聞こえる(kikoeru) + しか~ない  (มินนะ II บท 27)",
    summary: "การผันรูปสามารถ, ความต่างระหว่าง 見える/見られる, 聞こえる/聞ける, การใช้ しか~ない และ なら",
    points: [
      {
        pattern: "Vる → รูปสามารถ (godan u→eる / ichidan る→られる / する→できる / くる→こられる)",
        desc: "บอกว่า 'สามารถ V ได้' กรรมเปลี่ยน を → が (เลือกใช้ก็ได้แต่ が เป็นทางการกว่า)",
        examples: [
          { jp: "わたしは かんじが かけます。", ro: "Watashi wa kanji ga kakemasu.", th: "ฉันเขียนคันจิได้" },
          { jp: "ミラーさんは さしみが たべられます。", ro: "Mira-san wa sashimi ga taberaremasu.", th: "คุณมิลเลอร์กินซาชิมิได้" },
          { jp: "にほんごで でんわが できます。", ro: "Nihongo de denwa ga dekimasu.", th: "โทรศัพท์เป็นภาษาญี่ปุ่นได้" }
        ]
      },
      {
        pattern: "N が 見える(mieru) / 聞こえる(kikoeru)",
        desc: "เห็น/ได้ยิน 'โดยธรรมชาติ' ต่างจาก 見られる/聞ける ที่หมายถึง 'มีความสามารถดู/ฟัง'",
        examples: [
          { jp: "まどから うみが 見えます。", ro: "Mado kara umi ga miemasu.", th: "เห็นทะเลจากหน้าต่าง" },
          { jp: "おんがくが 聞こえます。", ro: "Ongaku ga kikoemasu.", th: "ได้ยินเสียงเพลง" }
        ]
      },
      {
        pattern: "N しか + 否定 (hitei = ปฏิเสธ)",
        desc: "'มี/มีเพียง...เท่านั้น' กริยาเป็นปฏิเสธเสมอ — เน้นความน้อยกว่าที่คาด",
        examples: [
          { jp: "100円 しか ありません。", ro: "Hyaku-en shika arimasen.", th: "มีแค่ 100 เยนเท่านั้น" },
          { jp: "ひらがな しか かけません。", ro: "Hiragana shika kakemasen.", th: "เขียนได้แค่ฮิรากานะเท่านั้น" }
        ]
      },
      {
        pattern: "N + なら、~",
        desc: "'ถ้าพูดถึง N นั้น...' เน้นหัวเรื่อง ใช้ตอบ/แนะนำ",
        examples: [
          { jp: "おさけなら にほんしゅが いちばん。", ro: "Osake nara nihonshu ga ichiban.", th: "ถ้าเหล้าก็เหล้าญี่ปุ่นอันดับหนึ่ง" }
        ]
      }
    ],
    quiz: [
      { type: "fill",
        q: "わたしは すしを ____。 (สามารถ + たべる)",
        answer: ["たべられます"],
        explain: "ichidan: たべる → たべられる → たべられます" },
      { type: "mcq",
        q: "へやから ふじさんが ____。",
        choices: ["みえます", "みられます", "みます", "みせます"],
        answer: 0,
        explain: "เห็นโดยธรรมชาติ (ทิวทัศน์) ใช้ 見える" },
      { type: "fill",
        q: "1000円 ____ ありません。",
        answer: ["しか"],
        explain: "しか + ปฏิเสธ = แค่...เท่านั้น" },
      { type: "mcq",
        q: "เลือก potential ของ かく",
        choices: ["かくれる", "かける", "かかれる", "かかせる"],
        answer: 1,
        explain: "godan: かく(ku) → かけ(ke) + る = かける" }
    ]
  },

  {
    id: "n4-u03-nagara-shi",
    title: "Unit 3 — ~ながら / ~ています(นิสัย) / ~し~し  (มินนะ II บท 28)",
    summary: "ทำสองอย่างพร้อมกัน, บอกนิสัย/อาชีพ, การยกเหตุผลหลายข้อด้วย ~し",
    points: [
      {
        pattern: "V1-ます-stem + ながら、 V2",
        desc: "ทำ V1 และ V2 พร้อมกัน (ประธานคนเดียวกัน) V2 เป็นกริยาหลัก",
        examples: [
          { jp: "おんがくを ききながら べんきょうします。", ro: "Ongaku o kiki-nagara benkyou shimasu.", th: "ฟังเพลงไปด้วยเรียนไปด้วย" },
          { jp: "あるきながら はなしましょう。", ro: "Aruki-nagara hanashimashou.", th: "เดินคุยกันเถอะ" }
        ]
      },
      {
        pattern: "V-ています (นิสัย/อาชีพ)",
        desc: "~ている ใช้บอกการกระทำที่ทำเป็นประจำ หรืออาชีพ ไม่ใช่กำลังทำ",
        examples: [
          { jp: "まいあさ ジョギングを して います。", ro: "Mai-asa jogingu o shite imasu.", th: "วิ่งจ๊อกกิ้งทุกเช้า" },
          { jp: "IMC で はたらいて います。", ro: "IMC de hataraite imasu.", th: "ทำงานที่ IMC" }
        ]
      },
      {
        pattern: "~し、 ~し、 ~",
        desc: "ยกเหตุผล/คุณสมบัติหลายอย่างมาเรียง 'ทั้ง...ทั้ง...'  หน้า し ใช้รูป plain",
        examples: [
          { jp: "この みせは やすいし、おいしいし、いいですね。", ro: "Kono mise wa yasui shi, oishii shi, ii desu ne.", th: "ร้านนี้ทั้งถูกทั้งอร่อย ดีนะ" },
          { jp: "あの 人は しんせつだし、まじめだし、すきです。", ro: "Ano hito wa shinsetsu da shi, majime da shi, suki desu.", th: "คนนั้นทั้งใจดีทั้งจริงจัง ฉันชอบ" }
        ]
      }
    ],
    quiz: [
      { type: "fill",
        q: "テレビを ____ながら ごはんを たべます。 (みる)",
        answer: ["み"],
        explain: "ながら ใช้รูป masu-stem; みます → み" },
      { type: "mcq",
        q: "この みせは ____、 ____、 すごく いいですよ。",
        choices: ["やすいで・おいしいで", "やすくて・おいしくて", "やすいし・おいしいし", "やすい・おいしい"],
        answer: 2,
        explain: "ยกเหตุผลหลายข้อใช้ ~し" },
      { type: "fill",
        q: "ちちは ぎんこうで はたらいて ____。 (อาชีพ)",
        answer: ["います"],
        explain: "บอกอาชีพใช้ ~ています" }
    ]
  },

  {
    id: "n4-u04-state-teshimau",
    title: "Unit 4 — สถานะ (ある→V-ている) / ~てしまう  (มินนะ II บท 29)",
    summary: "กริยา intransitive + ている แสดงสภาพ, ~てしまう แสดงเสร็จสมบูรณ์/น่าเสียดาย",
    points: [
      {
        pattern: "V自動詞 jidoushi (intransitive) + ています",
        desc: "บอก 'สภาพ/สถานะที่ยังคงอยู่' (เช่น ประตูเปิดอยู่). ต่างจาก V他動詞 (tadoushi/transitive) + てあります ที่เน้นว่ามีคนทำไว้",
        examples: [
          { jp: "まどが あいて います。", ro: "Mado ga aite imasu.", th: "หน้าต่างเปิดอยู่" },
          { jp: "でんきが ついて います。", ro: "Denki ga tsuite imasu.", th: "ไฟติดอยู่" },
          { jp: "さいふが おちて います。", ro: "Saifu ga ochite imasu.", th: "กระเป๋าตังตกอยู่ (สภาพ)" }
        ]
      },
      {
        pattern: "V-て + しまいます / しまいました",
        desc: "1) เสร็จสมบูรณ์โดยใช้เวลาน้อย 2) เสียใจ/ผิดพลาด/ไม่ตั้งใจ (ภาษาพูด: ~ちゃう / ~ちゃった)",
        examples: [
          { jp: "ほんを ぜんぶ よんで しまいました。", ro: "Hon o zenbu yonde shimaimashita.", th: "อ่านหนังสือจบหมดแล้ว (เสร็จสมบูรณ์)" },
          { jp: "でんしゃに かさを わすれて しまいました。", ro: "Densha ni kasa o wasurete shimaimashita.", th: "ลืมร่มไว้ในรถไฟ (น่าเสียดาย)" }
        ]
      }
    ],
    quiz: [
      { type: "mcq",
        q: "ドアが ____。 (ใครคนหนึ่งเปิดทิ้งไว้ — สภาพ)",
        choices: ["あけて います", "あいて います", "あけて あります", "あきます"],
        answer: 1,
        explain: "intransitive あく → あいて います = สภาพที่เปิดอยู่" },
      { type: "fill",
        q: "ケーキを ぜんぶ たべて ____ました。 (เสร็จหมด/เสียใจ)",
        answer: ["しまい"],
        explain: "~てしまう บอกความสมบูรณ์/น่าเสียดาย" }
    ]
  },

  {
    id: "n4-u05-tearu-teoku",
    title: "Unit 5 — ~てあります / ~ておきます / まだ~ていません  (มินนะ II บท 30)",
    summary: "การเตรียมไว้ก่อน, ผลของการกระทำที่คงอยู่, การบอกว่ายังไม่ได้ทำ",
    points: [
      {
        pattern: "N が V他動詞 tadoushi-て あります",
        desc: "'ถูก V ไว้แล้ว' — เน้นผลของคนที่ทำเอาไว้ ใช้กับ 他動詞 tadoushi (กริยาที่ต้องการกรรม)",
        examples: [
          { jp: "つくえの 上に メモが かいて あります。", ro: "Tsukue no ue ni memo ga kaite arimasu.", th: "บนโต๊ะมีโน้ตเขียนไว้" },
          { jp: "へやに はなが かざって あります。", ro: "Heya ni hana ga kazatte arimasu.", th: "ในห้องมีดอกไม้ประดับไว้" }
        ]
      },
      {
        pattern: "V-て + おきます",
        desc: "ทำ V เตรียมไว้ล่วงหน้า / ปล่อยไว้อย่างนั้น (ภาษาพูด: ~とく)",
        examples: [
          { jp: "りょこうの まえに きっぷを かって おきます。", ro: "Ryokou no mae ni kippu o katte okimasu.", th: "ก่อนเดินทางจะซื้อตั๋วเตรียมไว้" },
          { jp: "つかった あとは そうじして おいて ください。", ro: "Tsukatta ato wa souji shite oite kudasai.", th: "หลังใช้แล้วช่วยทำความสะอาดเตรียมไว้ด้วย" }
        ]
      },
      {
        pattern: "まだ V-て いません",
        desc: "'ยังไม่ได้ V'  (ไม่ใช่ V ません) — เน้นว่ายังไม่เกิดขึ้นแต่จะเกิด",
        examples: [
          { jp: "ひるごはんは まだ たべて いません。", ro: "Hirugohan wa mada tabete imasen.", th: "ยังไม่ได้กินข้าวเที่ยง" }
        ]
      }
    ],
    quiz: [
      { type: "mcq",
        q: "かべに ちずが ____ あります。 (ติดไว้)",
        choices: ["はり", "はって", "はりて", "はる"],
        answer: 1,
        explain: "~てあります ต้องใช้รูป て" },
      { type: "fill",
        q: "あした パーティーですから、 ビールを かって ____ます。 (เตรียมไว้)",
        answer: ["おき"],
        explain: "เตรียมล่วงหน้าใช้ ~ておく" },
      { type: "mcq",
        q: "「もう しゅくだいを しましたか。」 「いいえ、まだ ____。」",
        choices: ["しません", "しませんでした", "して いません", "しないです"],
        answer: 2,
        explain: "まだ + V-て いません = ยังไม่ได้ทำ" }
    ]
  },

  {
    id: "n4-u06-volitional-intent",
    title: "Unit 6 — รูปตั้งใจ (意向形 ikou-kei) + ~ようと思(おも)う + つもり + ~と言(い)う/思(おも)う  (มินนะ II บท 31)",
    summary: "การแสดงเจตนา/ความตั้งใจ + การอ้างคำพูดหรือความคิดของผู้พูด/คนอื่น",
    points: [
      {
        pattern: "V รูปตั้งใจ (godan u→oう / ichidan る→よう / する→しよう / くる→こよう)",
        desc: "รูป 'ตั้งใจจะ V' ใช้ในใจ/ชวน/บอกความตั้งใจ เป็น plain ของ ~ましょう",
        examples: [
          { jp: "ちょっと やすもう。", ro: "Chotto yasumou.", th: "พักหน่อยเถอะ" },
          { jp: "あした はやく おきよう。", ro: "Ashita hayaku okiyou.", th: "พรุ่งนี้ตื่นเช้าหน่อยกัน" }
        ]
      },
      {
        pattern: "V รูปตั้งใจ + と 思(おも)って います / 思います",
        desc: "บอก 'ตั้งใจจะ V' (思(おも)っています = ตั้งใจมาก่อนหน้านี้แล้ว / 思います = เพิ่งคิดตอนนี้)",
        examples: [
          { jp: "らいねん にほんへ いこうと 思って います。", ro: "Rainen Nihon e ikou to omotte imasu.", th: "ปีหน้าคิดจะไปญี่ปุ่น" }
        ]
      },
      {
        pattern: "V รูปพจนานุกรม + つもりです / V-ない + つもりです",
        desc: "บอก 'ตั้งใจจะ V / จะไม่ V' — เน้นความตั้งใจที่ตัดสินใจแล้ว",
        examples: [
          { jp: "らいげつ ひっこすつもりです。", ro: "Raigetsu hikkosu tsumori desu.", th: "เดือนหน้าตั้งใจจะย้ายบ้าน" },
          { jp: "もう たばこは すわないつもりです。", ro: "Mou tabako wa suwanai tsumori desu.", th: "ตั้งใจจะไม่สูบบุหรี่อีกแล้ว" }
        ]
      },
      {
        pattern: "S(plain) + と 言いました / 思います",
        desc: "อ้างคำพูด/ความคิด ใช้ plain หน้า と  と言いました = พูดว่า, と思います = คิดว่า",
        examples: [
          { jp: "ミラーさんは 「あした 休む」と 言いました。", ro: "Mira-san wa 'Ashita yasumu' to iimashita.", th: "คุณมิลเลอร์พูดว่า 'พรุ่งนี้หยุด'" },
          { jp: "わたしは にほんごは おもしろいと 思います。", ro: "Watashi wa nihongo wa omoshiroi to omoimasu.", th: "ฉันคิดว่าภาษาญี่ปุ่นน่าสนใจ" }
        ]
      }
    ],
    quiz: [
      { type: "fill",
        q: "らいねん くるまを かおうと ____います。 (ตั้งใจ)",
        answer: ["おもって"],
        explain: "รูปตั้งใจ + と思っています = ตั้งใจจะ V" },
      { type: "mcq",
        q: "もう おさけは ____つもりです。",
        choices: ["のもう", "のむ", "のまない", "のんで"],
        answer: 2,
        explain: "~ないつもり = ตั้งใจจะไม่ทำ" },
      { type: "fill",
        q: "รูปตั้งใจ ของ する คือ ____",
        answer: ["しよう"],
        explain: "する → しよう" }
    ]
  },

  {
    id: "n4-u07-suggest-probability",
    title: "Unit 7 — ~ほうがいい / ~でしょう / ~かもしれない  (มินนะ II บท 32)",
    summary: "แนะนำให้ทำ/ไม่ทำ, การคาดเดาด้วย でしょう, ความน่าจะเป็น かもしれない",
    points: [
      {
        pattern: "V-た + ほうが いい / V-ない + ほうが いい",
        desc: "แนะนำว่า 'V ดีกว่า / ไม่ V ดีกว่า' รูปบอกใช้ た (รูปอดีตสำหรับคำแนะนำ) ปฏิเสธใช้ ない",
        examples: [
          { jp: "もう ねた ほうが いいですよ。", ro: "Mou neta hou ga ii desu yo.", th: "นอนได้แล้วดีกว่านะ" },
          { jp: "むりを しない ほうが いいですよ。", ro: "Muri o shinai hou ga ii desu yo.", th: "อย่าฝืนตัวเองดีกว่านะ" }
        ]
      },
      {
        pattern: "S(plain) + でしょう  (เสียงสูงท้ายประโยค = คำถาม)",
        desc: "คาดการณ์ 'คงจะ ~' / ขอความเห็นพ้อง  (ไม่ใช่ でしょう ของ です ที่ใช้กับสภาพอากาศ)",
        examples: [
          { jp: "あした さむくなる でしょう。", ro: "Ashita samuku naru deshou.", th: "พรุ่งนี้คงจะหนาวขึ้น" },
          { jp: "あの 人は たぶん きょうしでしょう。", ro: "Ano hito wa tabun kyoushi deshou.", th: "คนนั้นคงจะเป็นครูกระมัง" }
        ]
      },
      {
        pattern: "S(plain) + かも しれません",
        desc: "'อาจจะ ~' — ความน่าจะเป็นต่ำกว่า でしょう  รูป plain หน้า かもしれない (なAdj.・N ตัด だ)",
        examples: [
          { jp: "あした あめが ふるかも しれません。", ro: "Ashita ame ga furu kamo shiremasen.", th: "พรุ่งนี้ฝนอาจตก" },
          { jp: "あの 人は がくせいかも しれません。", ro: "Ano hito wa gakusei kamo shiremasen.", th: "คนนั้นอาจเป็นนักเรียน" }
        ]
      }
    ],
    quiz: [
      { type: "mcq",
        q: "ねつが ありますから、 びょういんへ ____ ほうが いいですよ。",
        choices: ["いく", "いって", "いった", "いかない"],
        answer: 2,
        explain: "แนะนำให้ทำ ใช้รูป た" },
      { type: "fill",
        q: "あの レストランは おいしい ____ しれません。 (อาจจะ)",
        answer: ["かも"],
        explain: "かもしれません = อาจจะ" },
      { type: "mcq",
        q: "เลือกความหมายที่ใกล้ที่สุดของ '雨が ふるでしょう。'",
        choices: ["ฝนตกแล้ว", "ฝนคงจะตก", "ฝนต้องตก", "ฝนตกเสมอ"],
        answer: 1,
        explain: "~でしょう = คาดการณ์ คงจะ" }
    ]
  },

  {
    id: "n4-u08-imperative",
    title: "Unit 8 — รูปสั่ง (命令形 meirei-kei) / รูปห้าม / ~なさい  (มินนะ II บท 33)",
    summary: "รูปสั่งแบบไม่สุภาพ, ห้าม (~な), คำสั่งสุภาพ (~なさい), ป้าย/คำเขียน",
    points: [
      {
        pattern: "รูปคำสั่ง (godan u→e / ichidan る→ろ / する→しろ / くる→こい)",
        desc: "คำสั่งแบบไม่สุภาพ — ใช้ระหว่างผู้ใหญ่กับเด็ก/พ่อกับลูก/ในกีฬา/สถานการณ์ฉุกเฉิน",
        examples: [
          { jp: "はやく 起(お)きろ!", ro: "Hayaku okiro!", th: "ตื่นเร็ว ๆ!" },
          { jp: "もっと べんきょうしろ。", ro: "Motto benkyou shiro.", th: "เรียนให้มากกว่านี้!" },
          { jp: "がんばれ!", ro: "Ganbare!", th: "สู้ ๆ!" }
        ]
      },
      {
        pattern: "V รูปพจนานุกรม + な",
        desc: "'อย่า V' — รูปห้ามแบบไม่สุภาพ (ระวัง: ต่างกับ ~なさい สิ้นเชิง)",
        examples: [
          { jp: "ここで たばこを すうな。", ro: "Koko de tabako o suu na.", th: "ห้ามสูบบุหรี่ที่นี่" }
        ]
      },
      {
        pattern: "V-ます-stem + なさい",
        desc: "คำสั่งแบบสุภาพ — ครู/พ่อแม่ใช้กับนักเรียน/ลูก  เป็นทางการ มักพบในข้อสอบ",
        examples: [
          { jp: "つぎの しつもんに こたえなさい。", ro: "Tsugi no shitsumon ni kotaenasai.", th: "ตอบคำถามต่อไปนี้ (ในข้อสอบ)" }
        ]
      },
      {
        pattern: "S + と 書いて あります / と 読みます",
        desc: "ใช้บอกว่าป้าย/หนังสือเขียนว่า/อ่านว่า  X は Y と読みます (X อ่านว่า Y)",
        examples: [
          { jp: "あの ひょうしきには 「とまれ」と 書いて あります。", ro: "Ano hyoushiki ni wa 'tomare' to kaite arimasu.", th: "ป้ายนั้นเขียนว่า 'หยุด'" },
          { jp: "「危(き)」は 「あぶない」と 読(よ)みます。", ro: "'Ki' wa 'abunai' to yomimasu.", th: "「危」 (อ่านเดี่ยวว่า ki แต่ในคำ あぶない เป็นการอ่านในรูปคุณศัพท์)" }
        ]
      }
    ],
    quiz: [
      { type: "fill",
        q: "รูปคำสั่ง ของ たべる คือ ____",
        answer: ["たべろ"],
        explain: "ichidan: る→ろ" },
      { type: "mcq",
        q: "เลือกประโยคห้ามที่ถูก",
        choices: ["ここに 入るな", "ここに 入ろう", "ここに 入りなさい", "ここに 入れ"],
        answer: 0,
        explain: "รูปพจนานุกรม + な = ห้าม" },
      { type: "fill",
        q: "しずかに し____。 (สั่งสุภาพ — ครูกับนักเรียน)",
        answer: ["なさい"],
        explain: "ます-stem + なさい" }
    ]
  },

  {
    id: "n4-u09-manner-time",
    title: "Unit 9 — ~とおりに / ~あとで / ~て/ないで/ずに  (มินนะ II บท 34)",
    summary: "ทำตาม, ก่อน-หลัง, การทำ/ไม่ทำพร้อมกัน (~て / ~ないで)",
    points: [
      {
        pattern: "V รูปพจนานุกรม / V-た + とおりに",
        desc: "'ทำตามที่ ~' — V รูปพจนานุกรม = ตามที่จะเกิด, V-た = ตามที่เกิดไปแล้ว",
        examples: [
          { jp: "わたしが する とおりに して ください。", ro: "Watashi ga suru toori ni shite kudasai.", th: "กรุณาทำตามที่ฉันทำ" },
          { jp: "ならった とおりに かいて ください。", ro: "Naratta toori ni kaite kudasai.", th: "ช่วยเขียนตามที่เรียนมา" }
        ]
      },
      {
        pattern: "V-た + あとで / N の あとで",
        desc: "'หลังจาก V/N แล้ว ~' รูปอดีต た + あとで",
        examples: [
          { jp: "ばんごはんを たべた あとで、 さんぽします。", ro: "Bangohan o tabeta ato de, sanpo shimasu.", th: "หลังกินข้าวเย็นแล้วจะเดินเล่น" },
          { jp: "しごとの あとで、 のみに いきませんか。", ro: "Shigoto no ato de, nomi ni ikimasen ka.", th: "หลังเลิกงานไปดื่มกันไหม" }
        ]
      },
      {
        pattern: "V-ない + で / V-ず + に",
        desc: "'ไม่ V แล้ว ~' (ทำ/ไม่ทำพร้อมกัน). ~ずに เป็นทางการกว่า",
        examples: [
          { jp: "あさごはんを たべないで、 がっこうへ いきました。", ro: "Asagohan o tabenai de, gakkou e ikimashita.", th: "ไม่กินข้าวเช้าแล้วไปโรงเรียน" },
          { jp: "じしょを 使わずに かんじを かきました。", ro: "Jisho o tsukawazu ni kanji o kakimashita.", th: "เขียนคันจิโดยไม่ใช้พจนานุกรม" }
        ]
      }
    ],
    quiz: [
      { type: "mcq",
        q: "ごはんを たべ____、 はを みがきます。 (หลังจาก)",
        choices: ["るあとで", "たあとで", "ますあとで", "ない あとで"],
        answer: 1,
        explain: "V-た + あとで" },
      { type: "fill",
        q: "せんせいが いった ____ に やって ください。 (ตามที่)",
        answer: ["とおり"],
        explain: "V-た + とおりに = ตามที่ V" },
      { type: "mcq",
        q: "เลือกคำที่หมายถึง 'ไม่กินข้าวแล้วไป'",
        choices: ["たべて いきました", "たべないで いきました", "たべたあとで いきました", "たべながら いきました"],
        answer: 1,
        explain: "~ないで = ไม่ V แล้วทำต่อ" }
    ]
  },

  {
    id: "n4-u10-conditional",
    title: "Unit 10 — รูปเงื่อนไข ~ば / ~たら / ~ば~ほど  (มินนะ II บท 35)",
    summary: "เงื่อนไข ば และความต่างกับ たら/と/なら, สำนวน ยิ่ง...ยิ่ง...",
    points: [
      {
        pattern: "V ば (godan u→e+ば / ichidan る→れば / い-adj い→ければ / なAdj.・N + なら)",
        desc: "'ถ้า ~' เน้นเงื่อนไข — มักใช้กับเงื่อนไขที่ไม่ขึ้นกับคน หรือสำนวนทั่วไป",
        examples: [
          { jp: "やすければ かいます。", ro: "Yasukereba kaimasu.", th: "ถ้าถูกจะซื้อ" },
          { jp: "ボタンを 押(お)せば、 ドアが あきます。", ro: "Botan o oseba, doa ga akimasu.", th: "ถ้ากดปุ่ม ประตูจะเปิด" },
          { jp: "あめが ふらなければ、 いきます。", ro: "Ame ga furanakereba, ikimasu.", th: "ถ้าฝนไม่ตกจะไป" }
        ]
      },
      {
        pattern: "V-たら、 ~  (รูปเงื่อนไข 'หลังจาก/ถ้า')",
        desc: "ใช้ได้ทั่วไป รวมเงื่อนไขครั้งเดียว/อดีต  ภายในประโยคเดียวเลือก ~ば หรือ ~たら ตามบริบท",
        examples: [
          { jp: "じかんが あったら、 おしえて ください。", ro: "Jikan ga attara, oshiete kudasai.", th: "ถ้ามีเวลา ช่วยบอกด้วย" },
          { jp: "うちへ かえったら、 でんわを かけます。", ro: "Uchi e kaettara, denwa o kakemasu.", th: "ถึงบ้านแล้วจะโทรหา" }
        ]
      },
      {
        pattern: "V-ば + Vรูปพจนานุกรม + ほど / い-adj ければ + い + ほど / なAdj. + なら + なほど",
        desc: "'ยิ่ง V/A ยิ่ง ~' (สำนวน)  เช่น 安(やす)ければ 安いほど = ยิ่งถูกยิ่งดี / 静(しず)かなら 静かなほど = ยิ่งเงียบยิ่ง ~",
        examples: [
          { jp: "考(かんが)えれば 考(かんが)えるほど、 わからなく なります。", ro: "Kangaereba kangaeru hodo, wakaranaku narimasu.", th: "ยิ่งคิดยิ่งไม่เข้าใจ" }
        ]
      }
    ],
    quiz: [
      { type: "fill",
        q: "ば-form ของ いく คือ ____",
        answer: ["いけば"],
        explain: "godan: いく → いけ + ば" },
      { type: "mcq",
        q: "い-adj 'やすい' รูป ば คือ?",
        choices: ["やすいば", "やすければ", "やすけば", "やすかったら"],
        answer: 1,
        explain: "い-adj: い→ければ" },
      { type: "fill",
        q: "やすければ やすい ____、 いいです。 (ยิ่งถูกยิ่งดี)",
        answer: ["ほど"],
        explain: "~ば~ほど = ยิ่ง...ยิ่ง..." }
    ]
  },

  {
    id: "n4-u11-purpose-become",
    title: "Unit 11 — ~ように(เป้าหมาย) / ~ようになる / ~ようにする  (มินนะ II บท 36)",
    summary: "เป้าหมาย/ความหวัง, การเปลี่ยนความสามารถ/นิสัย",
    points: [
      {
        pattern: "V รูปพจนานุกรม・V-ない + ように、~",
        desc: "'เพื่อให้ V/ ไม่ V'  ใช้กับเป้าหมายที่อยู่เหนือการควบคุม (ความสามารถ/สภาพ) เช่น ~できる, わかる, intransitive",
        examples: [
          { jp: "にほんごが はなせる ように、 まいにち れんしゅうします。", ro: "Nihongo ga hanaseru you ni, mainichi renshuu shimasu.", th: "เพื่อให้พูดญี่ปุ่นได้ ฝึกทุกวัน" },
          { jp: "わすれない ように、 メモを とります。", ro: "Wasurenai you ni, memo o torimasu.", th: "เพื่อไม่ลืม จดโน้ตไว้" }
        ]
      },
      {
        pattern: "V รูปพจนานุกรม + ように なります",
        desc: "'กลายเป็นว่า V ได้/ทำ V'  เน้นการเปลี่ยนแปลงจากที่ทำไม่ได้ → ทำได้",
        examples: [
          { jp: "じてんしゃに のれる ように なりました。", ro: "Jitensha ni noreru you ni narimashita.", th: "ขี่จักรยานได้แล้ว (เริ่มทำได้)" },
          { jp: "やさいを 食べる ように なりました。", ro: "Yasai o taberu you ni narimashita.", th: "เริ่มกินผักแล้ว" }
        ]
      },
      {
        pattern: "V รูปพจนานุกรม・V-ない + ように します",
        desc: "'พยายาม (ไม่) V'  เน้นความตั้งใจของตัวเอง",
        examples: [
          { jp: "あまい ものを 食べない ように して います。", ro: "Amai mono o tabenai you ni shite imasu.", th: "พยายามไม่กินของหวาน" }
        ]
      }
    ],
    quiz: [
      { type: "mcq",
        q: "かんじが よめる ____ に、 まいにち べんきょうします。",
        choices: ["ため", "よう", "ところ", "つもり"],
        answer: 1,
        explain: "~ように (เป้าหมายเหนือการควบคุม)" },
      { type: "fill",
        q: "さいきん やさいを たべる ようにな ____。 (เริ่มทำได้)",
        answer: ["りました"],
        explain: "~ようになる = เริ่มทำ/ทำได้" },
      { type: "mcq",
        q: "おそく ねない ____ して います。 (พยายามไม่ทำ)",
        choices: ["ように", "ために", "とおりに", "あとで"],
        answer: 0,
        explain: "ตั้งใจของตัวเอง → ~ようにする" }
    ]
  },

  {
    id: "n4-u12-passive",
    title: "Unit 12 — รูปถูกกระทำ (受身形 ukemi-kei)  (มินนะ II บท 37)",
    summary: "Passive 3 ประเภท: direct, indirect/possession, suffering passive; การอ้างผู้สร้าง によって",
    points: [
      {
        pattern: "รูปถูกกระทำ (godan u→a+れる / ichidan る→られる / する→される / くる→こられる)",
        desc: "'ถูก V' — กรรมขึ้นต้น (が/は), ผู้กระทำใช้ に",
        examples: [
          { jp: "わたしは ちちに しかられました。", ro: "Watashi wa chichi ni shikararemashita.", th: "ฉันถูกพ่อดุ" },
          { jp: "ねこに さかなを 食べられました。", ro: "Neko ni sakana o taberaremashita.", th: "ถูกแมวกินปลาไป (ของครอง)" }
        ]
      },
      {
        pattern: "รูปถูกกระทำแบบเดือดร้อน (迷惑の受身)",
        desc: "'(ฉัน) เดือดร้อนเพราะ ~' กริยา intransitive ก็ใช้ได้ ผู้ที่เดือดร้อนเป็นประธาน",
        examples: [
          { jp: "あめに ふられて、 ぬれました。", ro: "Ame ni furarete, nuremashita.", th: "(ฉัน) เดือดร้อนเพราะฝนตก เลยเปียก" },
          { jp: "となりの 人に たばこを すわれて、 こまりました。", ro: "Tonari no hito ni tabako o suwarete, komarimashita.", th: "ถูกคนข้าง ๆ สูบบุหรี่ (เดือดร้อน)" }
        ]
      },
      {
        pattern: "N1 は N2 に よって V รูปถูกกระทำ",
        desc: "ใช้บอก 'X ถูกสร้าง/แต่ง/ค้นพบโดย Y' (ผลงาน) ใช้กับสิ่งสำคัญในประวัติศาสตร์",
        examples: [
          { jp: "「げんじものがたり」は むらさきしきぶに よって 書かれました。", ro: "'Genji Monogatari' wa Murasakishikibu ni yotte kakaremashita.", th: "เก็นจิโมโนกาตาริถูกแต่งโดยมุราซากิชิคิบุ" }
        ]
      }
    ],
    quiz: [
      { type: "fill",
        q: "รูปถูกกระทำ ของ よむ คือ ____",
        answer: ["よまれる"],
        explain: "godan: よむ → よま + れる" },
      { type: "mcq",
        q: "わたしは ともだち ____ パーティーに よばれました。",
        choices: ["を", "が", "に", "で"],
        answer: 2,
        explain: "ผู้กระทำใน passive ใช้ に" },
      { type: "fill",
        q: "あめ ____ ふられて、 こまりました。 (เดือดร้อนเพราะ)",
        answer: ["に"],
        explain: "ผู้กระทำ (สาเหตุที่ทำให้เดือดร้อน) ใช้ に" }
    ]
  },

  {
    id: "n4-u13-nominalization",
    title: "Unit 13 — ~の/~こと / ~ことができる / ~ことがある  (มินนะ II บท 38)",
    summary: "การเปลี่ยนกริยา/ประโยคให้เป็นนาม + สำนวนสามารถและประสบการณ์",
    points: [
      {
        pattern: "V รูปพจนานุกรม + の / こと + は・が・を ~",
        desc: "เปลี่ยนกริยาเป็นนาม — の ใช้ในการรับรู้/อาการ (見る, 聞く); こと ใช้กับ 思う, 知る, ความสามารถ",
        examples: [
          { jp: "わたしは うたを うたうのが すきです。", ro: "Watashi wa uta o utau no ga suki desu.", th: "ฉันชอบร้องเพลง" },
          { jp: "うたを うたうことが しごとです。", ro: "Uta o utau koto ga shigoto desu.", th: "การร้องเพลงเป็นงาน" }
        ]
      },
      {
        pattern: "V รูปพจนานุกรม + ことが できます",
        desc: "อีกวิธีหนึ่งที่บอก 'สามารถ V ได้' (เทียบเท่ารูปสามารถ)",
        examples: [
          { jp: "ミラーさんは かんじを かくことが できます。", ro: "Mira-san wa kanji o kaku koto ga dekimasu.", th: "คุณมิลเลอร์เขียนคันจิได้" }
        ]
      },
      {
        pattern: "V-た + ことが あります",
        desc: "'เคย V'  — บอกประสบการณ์  (ปฏิเสธ: ことが ありません = ไม่เคย)",
        examples: [
          { jp: "ほっかいどうへ いったことが あります。", ro: "Hokkaidou e itta koto ga arimasu.", th: "เคยไปฮอกไกโด" },
          { jp: "すしを 食べたことが ありません。", ro: "Sushi o tabeta koto ga arimasen.", th: "ไม่เคยกินซูชิ" }
        ]
      },
      {
        pattern: "Nの しゅみは V รูปพจนานุกรม + こと です",
        desc: "งานอดิเรก/ความชอบ: 'งานอดิเรกคือ V'",
        examples: [
          { jp: "わたしの しゅみは えいがを みる ことです。", ro: "Watashi no shumi wa eiga o miru koto desu.", th: "งานอดิเรกของฉันคือดูหนัง" }
        ]
      }
    ],
    quiz: [
      { type: "mcq",
        q: "わたしは ピアノを ひく ____ が できます。",
        choices: ["の", "こと", "もの", "ところ"],
        answer: 1,
        explain: "~ことができる = สามารถ" },
      { type: "fill",
        q: "ふじさんに のぼった ____ が あります。 (เคย)",
        answer: ["こと"],
        explain: "V-た + ことがある = เคย" },
      { type: "mcq",
        q: "わたしの しゅみは ほんを ____ ことです。",
        choices: ["よむ", "よみます", "よんで", "よんだ"],
        answer: 0,
        explain: "ก่อน こと ใช้ V รูปพจนานุกรม" }
    ]
  },

  {
    id: "n4-u14-cause-contrast",
    title: "Unit 14 — ~て / ~ので / ~のに  (มินนะ II บท 39)",
    summary: "การบอกสาเหตุที่อ่อน (~て / ~ので) และความขัดแย้งกับสิ่งที่คาด (~のに)",
    points: [
      {
        pattern: "S1-て / N-で、 S2",
        desc: "บอกสาเหตุที่อ่อน 'เพราะ ~ จึง ~' (มักเป็นอารมณ์/ความรู้สึก)",
        examples: [
          { jp: "ニュースを 聞いて、 びっくりしました。", ro: "Nyuusu o kiite, bikkuri shimashita.", th: "ฟังข่าวแล้วตกใจ" },
          { jp: "かぜで、 がっこうを やすみました。", ro: "Kaze de, gakkou o yasumimashita.", th: "เป็นหวัด เลยหยุดเรียน" }
        ]
      },
      {
        pattern: "S1(plain) + ので、 S2",
        desc: "'เพราะ ~' (สุภาพกว่า から / เป็นกลาง)  なAdj.・N + な + ので",
        examples: [
          { jp: "ねつが ある ので、 やすませて ください。", ro: "Netsu ga aru node, yasumasete kudasai.", th: "เนื่องจากมีไข้ ขอลาหยุดด้วย" },
          { jp: "しずかな ので、 よく ねむれます。", ro: "Shizuka na node, yoku nemuremasu.", th: "เพราะเงียบ จึงนอนหลับได้ดี" }
        ]
      },
      {
        pattern: "S1(plain) + のに、 S2",
        desc: "'ทั้ง ๆ ที่ ~ แต่ ~' — บอกความตรงข้ามกับที่คาด  なAdj.・N + な + のに",
        examples: [
          { jp: "あめが ふって いる のに、 でかけました。", ro: "Ame ga futte iru noni, dekakemashita.", th: "ทั้ง ๆ ที่ฝนตกก็ออกไป" },
          { jp: "やすかった のに、 おいしいです。", ro: "Yasukatta noni, oishii desu.", th: "ถูกแต่อร่อยจัง" }
        ]
      }
    ],
    quiz: [
      { type: "mcq",
        q: "あめが ふって いる ____、 でかけました。 (ทั้งที่ฝนตก)",
        choices: ["から", "ので", "のに", "なら"],
        answer: 2,
        explain: "~のに = ทั้งที่...แต่" },
      { type: "fill",
        q: "つかれた ____、 はやく ねます。 (เพราะ — สุภาพ)",
        answer: ["ので"],
        explain: "plain + ので = เพราะ" },
      { type: "mcq",
        q: "เลือกประโยคที่ใช้ ~のに ผิด",
        choices: ["あつい のに、 さんぽしました", "やすかった のに、 おいしかった", "がんばった のに、 だめでした", "あめなので、 やすみました"],
        answer: 3,
        explain: "ข้อ 4 ใช้ ~ので (ปกติ) — ไม่ใช่ ~のに" }
    ]
  },

  {
    id: "n4-u15-indirect-q-try",
    title: "Unit 15 — ~か(どうか) / ~てみる  (มินนะ II บท 40)",
    summary: "การฝังคำถามในประโยค + การลองทำ",
    points: [
      {
        pattern: "(疑問詞 gimonshi=คำถาม)~か, ~  /  S(plain)+か どうか、 ~",
        desc: "ฝังคำถามในประโยค: มี 疑問詞 gimonshi (คำว่า どこ/だれ/なに...) ใช้ ~か ตรง ๆ; ไม่มี ใช้ ~かどうか",
        examples: [
          { jp: "なんじに 来るか おしえて ください。", ro: "Nanji ni kuru ka oshiete kudasai.", th: "ช่วยบอกว่าจะมากี่โมง" },
          { jp: "あした パーティーが ある か どうか しりません。", ro: "Ashita paatii ga aru ka douka shirimasen.", th: "ไม่ทราบว่าพรุ่งนี้จะมีปาร์ตี้หรือเปล่า" }
        ]
      },
      {
        pattern: "V-て + みます",
        desc: "'ลอง V ดู'  ใช้กับสิ่งที่ไม่เคยทำ/ผลไม่แน่ใจ",
        examples: [
          { jp: "この くつを はいて みます。", ro: "Kono kutsu o haite mimasu.", th: "ลองสวมรองเท้านี้ดู" },
          { jp: "おちゃを のんで みて ください。", ro: "Ocha o nonde mite kudasai.", th: "ลองดื่มชาดูสิ" }
        ]
      }
    ],
    quiz: [
      { type: "mcq",
        q: "あした あめが ふる ____ しらべて ください。",
        choices: ["か", "が", "を", "に"],
        answer: 0,
        explain: "ฝังคำถาม (有 疑問詞 (gimonshi) อยู่ในใจความ) ใช้ ~か" },
      { type: "fill",
        q: "この りょうりを たべて ____ ください。 (ลอง)",
        answer: ["みて"],
        explain: "~てみる = ลองทำ" },
      { type: "mcq",
        q: "เลือกประโยคที่ใช้ ~かどうか ถูก",
        choices: ["パーティーに 行く か どうか まだ きめて いません", "あした なんじに 来る か どうか おしえて", "どこ で 会う か どうか", "なに を たべる か どうか"],
        answer: 0,
        explain: "ไม่มี 疑問詞 (gimonshi) ในใจความ ใช้ ~かどうか (ไป-ไม่ไป)" }
    ]
  },

  {
    id: "n4-u16-giving-receiving",
    title: "Unit 16 — あげる/もらう/くれる + V-て forms  (มินนะ II บท 41)",
    summary: "การให้-รับ ของ และ บริการ (V-てあげる/くれる/もらう)",
    points: [
      {
        pattern: "A は B に N を あげます / B は A に N を もらいます",
        desc: "あげる = ฉัน/คนอื่น 'ให้' คนอื่น (ทิศทาง 1→2,3 / 3→3). もらう = ฉัน/คนอื่น 'รับ' จาก…",
        examples: [
          { jp: "わたしは いもうとに ほんを あげました。", ro: "Watashi wa imouto ni hon o agemashita.", th: "ฉันให้หนังสือกับน้องสาว" },
          { jp: "ミラーさんは パパに じてんしゃを もらいました。", ro: "Mira-san wa papa ni jitensha o moraimashita.", th: "คุณมิลเลอร์ได้จักรยานจากพ่อ" }
        ]
      },
      {
        pattern: "A は わたしに N を くれます",
        desc: "くれる = คนอื่น 'ให้' กับฉัน/ฝ่ายฉัน (ผู้รับเป็นฉันเสมอ; ผู้ให้ ≠ ฉัน)",
        examples: [
          { jp: "ちちは わたしに とけいを くれました。", ro: "Chichi wa watashi ni tokei o kuremashita.", th: "พ่อให้นาฬิกากับฉัน" }
        ]
      },
      {
        pattern: "V-て + あげます / もらいます / くれます",
        desc: "การให้บริการ (V) เพื่อใครคนหนึ่ง: ~てあげる = ทำให้, ~てもらう = ขอให้ทำให้, ~てくれる = (เขา) ทำให้ฉัน",
        examples: [
          { jp: "ともだちに しゃしんを とって もらいました。", ro: "Tomodachi ni shashin o totte moraimashita.", th: "ขอให้เพื่อนถ่ายรูปให้" },
          { jp: "ちちが おもちゃを 買って くれました。", ro: "Chichi ga omocha o katte kuremashita.", th: "พ่อซื้อของเล่นให้ (ฉัน)" },
          { jp: "わたしは いもうとに ピアノを おしえて あげました。", ro: "Watashi wa imouto ni piano o oshiete agemashita.", th: "ฉันสอนเปียโนให้น้องสาว" }
        ]
      }
    ],
    quiz: [
      { type: "mcq",
        q: "ちちは わたし____ ペンを くれました。",
        choices: ["を", "に", "が", "で"],
        answer: 1,
        explain: "ผู้รับ (わたし) ในประโยค くれる ใช้ に" },
      { type: "fill",
        q: "ミラーさんに にほんごを おしえて ____ました。 (ขอให้ทำให้)",
        answer: ["もらい"],
        explain: "~てもらう = ขอให้ทำให้" },
      { type: "mcq",
        q: "เลือกประโยคที่ใช้ くれる ถูก",
        choices: ["わたしは ちちに とけいを くれました", "ちちは わたしに とけいを くれました", "わたしは ちちに とけいを もらいました", "ちちは わたしに とけいを あげました"],
        answer: 1,
        explain: "くれる: คนอื่นให้ฉัน — ฉันคือผู้รับเสมอ" }
    ]
  },

  {
    id: "n4-u17-purpose-tame",
    title: "Unit 17 — ~ために / ~ように / ~のに(วัตถุประสงค์)  (มินนะ II บท 42)",
    summary: "การบอกวัตถุประสงค์ ความต่างของ ために, ように, のに(N)",
    points: [
      {
        pattern: "V รูปพจนานุกรม / N の + ために、 ~",
        desc: "'เพื่อ V/N' — ใช้กับวัตถุประสงค์ที่ควบคุมได้ ประธานหน้า-หลังต้องเดียวกัน",
        examples: [
          { jp: "いえを 買う ために、 おかねを ためて います。", ro: "Ie o kau tame ni, okane o tamete imasu.", th: "เก็บเงินเพื่อซื้อบ้าน" },
          { jp: "けんこうの ために、 まいにち あるきます。", ro: "Kenkou no tame ni, mainichi arukimasu.", th: "เดินทุกวันเพื่อสุขภาพ" }
        ]
      },
      {
        pattern: "V รูปพจนานุกรม + ように (เป้าหมาย) — ทบทวน",
        desc: "ใช้กับเป้าหมายที่ไม่ควบคุม (สามารถ/อาการ) ต่างกับ ために",
        examples: [
          { jp: "わすれない ように、 メモを とります。", ro: "Wasurenai you ni, memo o torimasu.", th: "เพื่อไม่ให้ลืม จดโน้ตไว้" }
        ]
      },
      {
        pattern: "V รูปพจนานุกรม + のに / N + に",
        desc: "'ใช้ V/N สำหรับ ~' (โทนกึ่งกลาง — มักบอกว่า เครื่องมือ/เวลาใช้สำหรับ)",
        examples: [
          { jp: "この はさみは かみを 切るのに 使います。", ro: "Kono hasami wa kami o kiru no ni tsukaimasu.", th: "กรรไกรนี้ใช้ตัดกระดาษ" },
          { jp: "ひっこしに 10万円 かかりました。", ro: "Hikkoshi ni juu-man en kakarimashita.", th: "ใช้เงิน 100,000 เยนกับการย้ายบ้าน" }
        ]
      }
    ],
    quiz: [
      { type: "mcq",
        q: "けんこう ____ ために、 まいにち やさいを たべます。",
        choices: ["の", "が", "を", "に"],
        answer: 0,
        explain: "N + の + ために" },
      { type: "fill",
        q: "にほんに 行く ____ に、 おかねを ためて います。 (เพื่อ — ควบคุมได้)",
        answer: ["ため"],
        explain: "V รูปพจนานุกรม + ために (ควบคุมได้)" },
      { type: "mcq",
        q: "เลือกความต่างที่ถูกต้อง",
        choices: ["~ために กับ ~ように ใช้ทดแทนกันได้เสมอ", "~ために ใช้กับเป้าหมายควบคุมได้ ~ように ใช้กับเป้าหมายไม่ควบคุม", "~ように ใช้กับการทำให้คนอื่น", "~ために ใช้กับ V-ない เท่านั้น"],
        answer: 1,
        explain: "ความต่างหลัก: ควบคุมได้ (ために) vs ไม่ควบคุม (ように)" }
    ]
  },

  {
    id: "n4-u18-sou-motion",
    title: "Unit 18 — ~そう (มอง) / ~てくる / ~ていく  (มินนะ II บท 43)",
    summary: "การคาดเดาจากรูปลักษณ์ + การเคลื่อนไหว/เปลี่ยนแปลงต่อเนื่อง",
    points: [
      {
        pattern: "V-ます-stem / い-adj ตัด い / なAdj. + そうです (รูปดู)",
        desc: "'ดูเหมือนจะ ~' จากรูปลักษณ์ที่เห็น (い-adj ตัด い, いい→よさそう, ない→なさそう)",
        examples: [
          { jp: "この ケーキは おいしそうです。", ro: "Kono keeki wa oishi-sou desu.", th: "เค้กนี้ดูอร่อย" },
          { jp: "あめが ふりそうです。", ro: "Ame ga furi-sou desu.", th: "ฝนดูจะตก" },
          { jp: "あの 人は げんきそうです。", ro: "Ano hito wa genki-sou desu.", th: "คนนั้นดูสดใส" }
        ]
      },
      {
        pattern: "V-て + きます / いきます",
        desc: "การเคลื่อนเข้าหา/ออกจาก ผู้พูด หรือการเปลี่ยนแปลงต่อเนื่องในเวลา",
        examples: [
          { jp: "あめが ふって きました。", ro: "Ame ga futte kimashita.", th: "ฝนเริ่มตก (เปลี่ยนแปลงเข้ามาในปัจจุบัน)" },
          { jp: "これから だんだん さむくなって いきます。", ro: "Kore kara dandan samuku natte ikimasu.", th: "หลังจากนี้จะหนาวขึ้นเรื่อย ๆ (ไปข้างหน้า)" },
          { jp: "コンビニで おべんとうを 買って きます。", ro: "Konbini de obentou o katte kimasu.", th: "(จะ) ไปซื้อข้าวกล่องที่ร้านสะดวกซื้อ (แล้วกลับมา)" }
        ]
      }
    ],
    quiz: [
      { type: "mcq",
        q: "この りょうりは おいし____です。 (ดูเหมือน)",
        choices: ["い そう", "そう", "くそう", "いて"],
        answer: 1,
        explain: "い-adj ตัด い + そう: おいし + そう" },
      { type: "fill",
        q: "これから あつくなって ____ます。 (เปลี่ยนแปลงไปข้างหน้า)",
        answer: ["いき"],
        explain: "~ていく = เปลี่ยนแปลงไปในอนาคต" }
    ]
  },

  {
    id: "n4-u19-sugiru-yasui",
    title: "Unit 19 — ~すぎる / ~やすい / ~にくい  (มินนะ II บท 44)",
    summary: "การพูดถึงระดับเกินไป, ความง่าย/ยากของการกระทำ",
    points: [
      {
        pattern: "V-ます-stem / い-adj ตัด い / なAdj. + すぎる",
        desc: "'V/A เกินไป' — เป็น ichidan-verb ผันต่อได้ (すぎます, すぎて, すぎた)",
        examples: [
          { jp: "ゆうべ のみすぎました。", ro: "Yuube nomi-sugimashita.", th: "เมื่อคืนดื่มเกินไป" },
          { jp: "この もんだいは むずかし すぎます。", ro: "Kono mondai wa muzukashi-sugimasu.", th: "ข้อนี้ยากเกินไป" }
        ]
      },
      {
        pattern: "V-ます-stem + やすい / にくい",
        desc: "'V ได้ง่าย / ยาก' — ผันเป็น い-adjective",
        examples: [
          { jp: "この ペンは 書きやすいです。", ro: "Kono pen wa kaki-yasui desu.", th: "ปากกานี้เขียนง่าย" },
          { jp: "あの 道は あるきにくいです。", ro: "Ano michi wa aruki-nikui desu.", th: "ถนนนั้นเดินยาก" }
        ]
      }
    ],
    quiz: [
      { type: "fill",
        q: "この くつは あるき ____ です。 (เดินง่าย)",
        answer: ["やすい"],
        explain: "ます-stem + やすい" },
      { type: "mcq",
        q: "おさけを のみ____ました。 (ดื่มมากเกินไป)",
        choices: ["すぎ", "やすき", "なさ", "がち"],
        answer: 0,
        explain: "ます-stem + すぎる = เกินไป" }
    ]
  },

  {
    id: "n4-u20-ba-yokatta",
    title: "Unit 20 — ~ばよかった / ~ところ / ~ばかり  (มินนะ II บท 45-46)",
    summary: "การเสียดาย, การบอกช่วงเวลาของการกระทำ, การเน้นว่าเพิ่ง/มีแต่",
    points: [
      {
        pattern: "V-ば + よかった",
        desc: "'น่าจะ V (แต่ไม่ได้ทำ)' — แสดงความเสียดาย",
        examples: [
          { jp: "もっと はやく 来れば よかった。", ro: "Motto hayaku kureba yokatta.", th: "น่าจะมาเร็วกว่านี้" },
          { jp: "あの 本を かわなければ よかった。", ro: "Ano hon o kawanakereba yokatta.", th: "น่าจะไม่ซื้อหนังสือเล่มนั้น" }
        ]
      },
      {
        pattern: "V รูปพจนานุกรม + ところ / V-ている + ところ / V-た + ところ",
        desc: "บอกช่วงเวลาของการกระทำ: ~รูปพจนานุกรม = กำลังจะ, ~ている = กำลัง, ~た = เพิ่ง",
        examples: [
          { jp: "これから 食べる ところです。", ro: "Kore kara taberu tokoro desu.", th: "กำลังจะกินอยู่พอดี" },
          { jp: "いま 食べて いる ところです。", ro: "Ima tabete iru tokoro desu.", th: "กำลังกินอยู่" },
          { jp: "たった いま 食べた ところです。", ro: "Tatta ima tabeta tokoro desu.", th: "เพิ่งกินเสร็จเลย" }
        ]
      },
      {
        pattern: "V-た + ばかりです / N + ばかり",
        desc: "'V เพิ่ง / มีแต่ N เท่านั้น' — ばかり เน้นว่าเพิ่งทำหรือมีแค่",
        examples: [
          { jp: "にほんに 来た ばかりです。", ro: "Nihon ni kita bakari desu.", th: "เพิ่งมาญี่ปุ่น" },
          { jp: "むすこは あそんで ばかり います。", ro: "Musuko wa asonde bakari imasu.", th: "ลูกชายเอาแต่เล่น" }
        ]
      }
    ],
    quiz: [
      { type: "fill",
        q: "もっと べんきょうすれ ____ かった。 (เสียดาย)",
        answer: ["ばよ"],
        explain: "~ばよかった = น่าจะ" },
      { type: "mcq",
        q: "いま テレビを みて いる ____ です。 (กำลัง)",
        choices: ["ばかり", "ところ", "つもり", "ため"],
        answer: 1,
        explain: "~ているところ = กำลัง" },
      { type: "fill",
        q: "ちょうど かえって ____ ところです。 (เพิ่ง)",
        answer: ["きた"],
        explain: "V-た + ところ = เพิ่งทำ" }
    ]
  },

  {
    id: "n4-u21-hearsay-you",
    title: "Unit 21 — ~そう(เล่าลือ) / ~ようだ・みたいだ  (มินนะ II บท 47)",
    summary: "การบอกข่าวลือ (จากสื่อ/คนอื่น) + การเปรียบเทียบ/คาดเดาด้วย ようだ",
    points: [
      {
        pattern: "S(plain) + そうです (เล่าลือ — ระวังต่างกับ ~そう ของบทก่อน)",
        desc: "'ได้ยินมาว่า / มีข่าวว่า ~' ใช้ plain ก่อน そう (なAdj. + だ + そう / N + だ + そう)",
        examples: [
          { jp: "ニュースに よると、 たいふうが 来る そうです。", ro: "Nyuusu ni yoru to, taifuu ga kuru sou desu.", th: "ตามข่าวว่า พายุไต้ฝุ่นกำลังมา" },
          { jp: "ミラーさんは げんきだ そうです。", ro: "Mira-san wa genki da sou desu.", th: "ได้ยินมาว่าคุณมิลเลอร์สบายดี" }
        ]
      },
      {
        pattern: "S(plain) + ようです / みたいです",
        desc: "'ดูเหมือน / ราวกับ ~' — คาดเดาจากข้อมูลรอบตัว (なAdj.・N + な/の + ようだ; みたい เป็นภาษาพูด)",
        examples: [
          { jp: "あの 人は びょうきの ようです。", ro: "Ano hito wa byouki no you desu.", th: "คนนั้นดูเหมือนจะป่วย" },
          { jp: "だれか 来た みたいです。", ro: "Dareka kita mitai desu.", th: "ดูเหมือนจะมีใครมา" }
        ]
      }
    ],
    quiz: [
      { type: "mcq",
        q: "เลือกประโยคที่หมายถึง 'ได้ยินมาว่าฝนจะตก'",
        choices: ["あめが ふりそうです", "あめが ふる そうです", "あめが ふる ようです", "あめが ふって います"],
        answer: 1,
        explain: "plain + そうです = เล่าลือ (ต่างจาก ます-stem + そう = ดู)" },
      { type: "fill",
        q: "へやが しずかです。 だれも いない ____ です。 (ดูเหมือน)",
        answer: ["よう"],
        explain: "plain + ようです = ดูเหมือน" }
    ]
  },

  {
    id: "n4-u22-causative",
    title: "Unit 22 — รูปให้/บังคับ (使役形 shieki-kei) + ~(さ)せて ください  (มินนะ II บท 48)",
    summary: "การให้/บังคับให้ทำ, การขออนุญาตทำเอง",
    points: [
      {
        pattern: "รูปให้ทำ (godan u→a+せる / ichidan る→させる / する→させる / くる→こさせる)",
        desc: "'ให้/บังคับให้ V' — กรรม (ผู้ที่ถูกให้ทำ) ใช้ に (กับกริยา transitive) หรือ を (intransitive)",
        examples: [
          { jp: "ちちは いもうとに やさいを 食べさせます。", ro: "Chichi wa imouto ni yasai o tabesasemasu.", th: "พ่อทำให้น้องสาวกินผัก (transitive — ผู้ถูกให้ทำใช้ に)" },
          { jp: "せんせいは こどもを たたせました。", ro: "Sensei wa kodomo o tatasemashita.", th: "ครูให้เด็กยืน (intransitive — ใช้ を)" }
        ]
      },
      {
        pattern: "V-(さ)せて + ください",
        desc: "'กรุณาให้ ฉัน V'  — ขออนุญาตทำ V เอง สุภาพมาก",
        examples: [
          { jp: "あした やすませて ください。", ro: "Ashita yasumasete kudasai.", th: "พรุ่งนี้ขอลาหยุดด้วย" },
          { jp: "わたしに はらわせて ください。", ro: "Watashi ni harawasete kudasai.", th: "ขอให้ฉันจ่ายเถอะ" }
        ]
      }
    ],
    quiz: [
      { type: "fill",
        q: "รูปให้ทำ ของ よむ คือ ____",
        answer: ["よませる"],
        explain: "godan: よむ → よま + せる" },
      { type: "mcq",
        q: "ちちは おとうと ____ くすりを のませました。",
        choices: ["が", "を", "に", "の"],
        answer: 2,
        explain: "transitive รูปให้ทำ ผู้ถูกให้ทำใช้ に" },
      { type: "fill",
        q: "ちょっと かんがえ ____ ください。 (ขอ)",
        answer: ["させて"],
        explain: "ichidan: かんがえる → かんがえさせる → かんがえさせて" }
    ]
  },

  {
    id: "n4-u23-keigo-sonkei",
    title: "Unit 23 — 尊敬語 sonkeigo (ภาษายกย่อง)  (มินนะ II บท 49)",
    summary: "คำสุภาพยกย่องผู้อื่น: お~になる, รูปพิเศษ (いらっしゃる, めしあがる, ご覧(らん)になる ...), passive sonkei",
    points: [
      {
        pattern: "お + V-ます-stem + に なります",
        desc: "รูปยกย่อง 'ท่าน V'  ใช้กับการกระทำของผู้อาวุโส/ลูกค้า (V ที่ก้านมีพยางค์เดียวใช้ いらっしゃる / 特殊形 tokushu-kei (รูปพิเศษ) แทน)",
        examples: [
          { jp: "しゃちょうは いま おかえりに なりました。", ro: "Shachou wa ima okaeri ni narimashita.", th: "ท่านประธานเพิ่งกลับ" },
          { jp: "せんせい、 おまちに なりますか。", ro: "Sensei, omachi ni narimasu ka.", th: "อาจารย์จะรอไหมครับ" }
        ]
      },
      {
        pattern: "Special sonkeigo verbs",
        desc: "กริยาบางคำมีรูปยกย่องเฉพาะ — ต้องจำ",
        examples: [
          { jp: "いる/行く/来る → いらっしゃる (~いらっしゃいます)", ro: "iru/iku/kuru → irassharu", th: "เป็น/อยู่/ไป/มา → いらっしゃる" },
          { jp: "食べる/飲む → めしあがる", ro: "taberu/nomu → meshiagaru", th: "กิน/ดื่ม → めしあがる" },
          { jp: "見(み)る → ごらんに なる / 言(い)う → おっしゃる / する → なさる / 知(し)っている → ごぞんじです", ro: "miru → goran ni naru / iu → ossharu / suru → nasaru / shitte iru → gozonji desu", th: "ดู/พูด/ทำ/รู้ → goran/ossharu/nasaru/gozonji" }
        ]
      },
      {
        pattern: "V รูปถูกกระทำ (เป็นรูป sonkei แบบเบา)",
        desc: "passive form ใช้เป็น sonkeigo แบบเบา ๆ ก็ได้ (เช่น ข่าว/รายงานทางการ)",
        examples: [
          { jp: "せんせいは いつ にほんへ こられますか。", ro: "Sensei wa itsu Nihon e koraremasu ka.", th: "อาจารย์มาญี่ปุ่นเมื่อไหร่ครับ (こられる = sonkei แบบเบาของ くる)" }
        ]
      }
    ],
    quiz: [
      { type: "mcq",
        q: "せんせいは いま ____。 (ท่านดู — sonkei)",
        choices: ["みます", "ごらんに なります", "はいけんします", "みえます"],
        answer: 1,
        explain: "見(み)る → ご覧(らん)になる (sonkeigo)" },
      { type: "mcq",
        q: "いる/行く/来る ของ sonkeigo คือ?",
        choices: ["まいる", "いらっしゃる", "おる", "うかがう"],
        answer: 1,
        explain: "いらっしゃる ใช้ได้ทั้ง 3 ความหมาย" },
      { type: "fill",
        q: "なに を ____ますか。 (ท่านกิน — めしあがる)",
        answer: ["めしあがり"],
        explain: "めしあがる → めしあがります" }
    ]
  },

  {
    id: "n4-u24-keigo-kenjou",
    title: "Unit 24 — 謙譲語 kenjougo (ภาษาถ่อมตน) + 丁寧語 teineigo (ภาษาสุภาพ)  (มินนะ II บท 50)",
    summary: "คำถ่อมตน (พูดถึงการกระทำของตัวเอง/ฝ่ายเรา) + คำสุภาพ ございます",
    points: [
      {
        pattern: "お + V-ます-stem + します / いたします",
        desc: "รูปถ่อมตน 'ฉันขอ V (ให้ท่าน)' — ใช้กับการกระทำของฉัน/ฝ่ายเราที่กระทบฝ่ายอาวุโส",
        examples: [
          { jp: "おにもつを おもちします。", ro: "Onimotsu o omochi shimasu.", th: "ขอช่วยถือกระเป๋าค่ะ" },
          { jp: "あした おでんわ いたします。", ro: "Ashita odenwa itashimasu.", th: "พรุ่งนี้จะโทรไปครับ" }
        ]
      },
      {
        pattern: "Special kenjougo verbs",
        desc: "กริยาบางคำมีรูปถ่อมตนเฉพาะ",
        examples: [
          { jp: "いる → おる / 行(い)く・来(く)る → まいる / 言(い)う → もうす", ro: "iru → oru / iku/kuru → mairu / iu → mousu", th: "เป็น/อยู่/ไป/มา/พูด" },
          { jp: "見(み)る → 拝見(はいけん)する / 食(た)べる・飲(の)む → いただく / 知(し)っている → ぞんじて おります", ro: "miru → haiken-suru / taberu/nomu → itadaku / shitte iru → zonjite orimasu", th: "ดู/กิน/รู้ — 拝見 (haiken) = ดูแบบถ่อมตน" },
          { jp: "する → いたす / 会(あ)う → お目(め)に かかる / もらう → いただく", ro: "suru → itasu / au → o-me-ni-kakaru / morau → itadaku", th: "ทำ/เจอ/รับ — お目にかかる = พบ (ถ่อมตน)" }
        ]
      },
      {
        pattern: "丁寧語 teineigo: ございます / ~でございます",
        desc: "รูปสุภาพมากของ あります / です — ใช้ในร้านค้า/บริการ",
        examples: [
          { jp: "トイレは あちらに ございます。", ro: "Toire wa achira ni gozaimasu.", th: "ห้องน้ำอยู่ทางนั้นครับ" },
          { jp: "わたしは IMC の ミラーで ございます。", ro: "Watashi wa IMC no Mira de gozaimasu.", th: "ผมชื่อมิลเลอร์จาก IMC ครับ" }
        ]
      }
    ],
    quiz: [
      { type: "mcq",
        q: "เลือก kenjougo ของ 食べる",
        choices: ["めしあがる", "いただく", "おたべに なる", "たべさせる"],
        answer: 1,
        explain: "食べる/飲む → いただく (kenjougo)" },
      { type: "mcq",
        q: "เลือก kenjougo ของ 行く",
        choices: ["いらっしゃる", "まいる", "うかがう", "おる"],
        answer: 1,
        explain: "行く・来る → まいる (まいる ก็ใช้กับ うかがう ในบริบทเฉพาะ)" },
      { type: "fill",
        q: "おにもつを お ____ します。 (ขอช่วยถือ)",
        answer: ["もち"],
        explain: "お + ます-stem + します = kenjougo" },
      { type: "mcq",
        q: "เลือก kenjougo ของ 言う",
        choices: ["おっしゃる", "もうす", "うけたまわる", "はなす"],
        answer: 1,
        explain: "言う → もうす (kenjougo); おっしゃる = sonkeigo" }
    ]
  }
];
