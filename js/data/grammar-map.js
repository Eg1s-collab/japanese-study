/**
 * Grammar connection map — ชั้นข้อมูล "ความเชื่อมโยง" ระหว่างหัวข้อไวยากรณ์
 *
 * แยกออกจากเนื้อหา (units.js) เพื่อไม่ให้ต้องแก้ไฟล์เนื้อหาก้อนใหญ่
 * อ้างถึงแต่ละหัวข้อด้วย [unitId, index] — index คือลำดับใน unit.points[]
 *
 *   categories[] = จัดกลุ่มหัวข้อตาม "หน้าที่" (เช่น คำช่วย, การผันกริยา)
 *   paths[]      = ลำดับการต่อยอด (หัวข้อนี้เป็นพื้นฐานของหัวข้อถัดไป)
 *
 * ref รูปแบบ [unitId, [i, i, ...]] (สำหรับ categories) หรือ [unitId, i] (paths)
 * วิวจะ resolve เป็น object จริงจาก window.LEVELS[level].units — ref ที่หาไม่เจอ
 * จะถูกข้ามอย่างนุ่มนวล (ไม่ error)
 *
 * ตอนนี้ทำข้อมูลครบสำหรับ N5; N4/N3 เว้นว่างไว้ (วิวจะถอยกลับไปจัดกลุ่มตาม unit)
 */
window.GRAMMAR_MAP = {
  n5: {
    categories: [
      {
        id: "sentence",
        label: "ประโยคพื้นฐาน & คำชี้",
        icon: "文",
        desc: "โครงประโยคหลัก Nは Nです และกลุ่มคำชี้ これ・それ・あれ — รากฐานก่อนเรื่องอื่น",
        refs: [
          ["n5-u01-copula", [0, 1, 2, 3, 5, 6]],
          ["n5-u02-kosoado", [0, 1, 2, 3]],
          ["n5-u10-question-words", [0]]
        ]
      },
      {
        id: "particle",
        label: "คำช่วย (助詞)",
        icon: "助",
        desc: "ตัวบ่งหน้าที่ของคำในประโยค は・が・を・に・で・と・へ・から・まで และคำลงท้าย ね・よ",
        refs: [
          ["n5-u01-copula", [4]],
          ["n5-u03-particles", [0, 1, 2, 3, 4, 5, 6, 7]],
          ["n5-u10-question-words", [3, 4]]
        ]
      },
      {
        id: "adjective",
        label: "คำคุณศัพท์ & การเปรียบเทียบ",
        icon: "形",
        desc: "い-adj / な-adj การผันบอก/ปฏิเสธ/อดีต รวมถึงการเปรียบเทียบ より・ほうが・いちばん และการเปลี่ยนสภาพ なります",
        refs: [
          ["n5-u04-i-adj", [0, 1, 2, 3, 4]],
          ["n5-u05-na-adj", [0, 1, 2]],
          ["n5-u15-comparison", [0, 1, 2, 3]],
          ["n5-u18-experience-tari-naru", [2]]
        ]
      },
      {
        id: "verbform",
        label: "การผันรูปกริยา",
        icon: "動",
        desc: "ฐานของไวยากรณ์เกือบทั้งหมด — กลุ่มกริยา, รูป ます, รูป て, รูป ない, รูปธรรมดา (普通形)",
        refs: [
          ["n5-u06-verbs-masu", [0, 1, 2, 3]],
          ["n5-u07-te-form", [0, 1]],
          ["n5-u08-nai-tai-mo-ii", [0]],
          ["n5-u19-plain-form", [0, 1, 2]]
        ]
      },
      {
        id: "request",
        label: "ขอร้อง อนุญาต หน้าที่ & ชวน",
        icon: "頼",
        desc: "ทำอะไรกับคนอื่น — てください, てもいい, てはいけません, なければなりません, ませんか, ましょう",
        refs: [
          ["n5-u07-te-form", [2]],
          ["n5-u08-nai-tai-mo-ii", [2, 3, 4, 5]],
          ["n5-u11-invitations", [0, 1, 2, 3]]
        ]
      },
      {
        id: "giveget",
        label: "การให้และการรับ (授受)",
        icon: "授",
        desc: "ทิศทางของการให้-รับ あげます・もらいます・くれます และรูป て + กริยาให้รับ",
        refs: [
          ["n5-u12-give-receive", [0, 1]],
          ["n5-u23-giving-receiving-actions", [0, 1, 2]]
        ]
      },
      {
        id: "existloc",
        label: "การมีอยู่ & ตำแหน่ง",
        icon: "在",
        desc: "あります・います และคำบอกตำแหน่ง うえ・した・なか・となり ฯลฯ",
        refs: [
          ["n5-u14-existence-location", [0, 1, 2, 3]]
        ]
      },
      {
        id: "desire",
        label: "ความชอบ ความสามารถ ความต้องการ",
        icon: "好",
        desc: "ใจอยากและทำได้ — 好き・上手・わかります, ほしい, たい, ことができます และคำไม่เจาะจง なにか",
        refs: [
          ["n5-u08-nai-tai-mo-ii", [1]],
          ["n5-u13-likes-ability", [0, 1, 2, 3]],
          ["n5-u16-want-indefinite", [0, 1, 2]],
          ["n5-u17-can-do-hobby", [0, 1]]
        ]
      },
      {
        id: "connect",
        label: "เชื่อมประโยค เงื่อนไข & เวลา",
        icon: "接",
        desc: "ร้อยประโยคเข้าด้วยกัน — から・が, ています, とき・と・たら・ても, たり, まえに",
        refs: [
          ["n5-u07-te-form", [3, 4]],
          ["n5-u10-question-words", [1, 2]],
          ["n5-u12-give-receive", [2]],
          ["n5-u17-can-do-hobby", [2]],
          ["n5-u18-experience-tari-naru", [0, 1]],
          ["n5-u22-conditionals", [0, 1, 2, 3]]
        ]
      },
      {
        id: "quotemodify",
        label: "การอ้างคำพูด & ขยายคำนาม",
        icon: "述",
        desc: "พูดถึงสิ่งที่คิด/พูด — と思います, と言いました, でしょう และประโยคขยายคำนาม",
        refs: [
          ["n5-u20-think-say", [0, 1, 2]],
          ["n5-u21-noun-modify", [0, 1, 2]]
        ]
      },
      {
        id: "number",
        label: "ตัวเลข ตัวนับ & วันเวลา",
        icon: "数",
        desc: "เลข, การบอกเวลา, วันในสัปดาห์ และตัวนับ ~つ・~にん・~まい ฯลฯ",
        refs: [
          ["n5-u09-counters-time", [0, 1, 2, 3, 4]]
        ]
      }
    ],

    paths: [
      {
        id: "verb-te",
        label: "จากกริยา → รูป て → การใช้งาน",
        desc: "เมื่อสร้างรูป て ได้ จะต่อยอดเป็นไวยากรณ์ได้อีกมาก",
        steps: [
          ["n5-u06-verbs-masu", 3],
          ["n5-u07-te-form", 0],
          ["n5-u07-te-form", 2],
          ["n5-u07-te-form", 3],
          ["n5-u08-nai-tai-mo-ii", 2],
          ["n5-u23-giving-receiving-actions", 1]
        ]
      },
      {
        id: "verb-nai",
        label: "รูป ない → ข้อห้าม & หน้าที่",
        desc: "รูปปฏิเสธธรรมดาเป็นฐานของการบอกหน้าที่/ข้อยกเว้น",
        steps: [
          ["n5-u08-nai-tai-mo-ii", 0],
          ["n5-u08-nai-tai-mo-ii", 4],
          ["n5-u08-nai-tai-mo-ii", 5]
        ]
      },
      {
        id: "plain",
        label: "รูปธรรมดา (普通形) → ไวยากรณ์ขั้นต่อไป",
        desc: "หลายไวยากรณ์ N5 ปลาย ๆ ต้องเอารูปธรรมดามาต่อข้างหน้า",
        steps: [
          ["n5-u19-plain-form", 0],
          ["n5-u20-think-say", 0],
          ["n5-u21-noun-modify", 0],
          ["n5-u22-conditionals", 0],
          ["n5-u22-conditionals", 2],
          ["n5-u20-think-say", 2]
        ]
      },
      {
        id: "adj",
        label: "คำคุณศัพท์: ฐาน → ผัน → เปรียบเทียบ",
        desc: "เริ่มจากใช้ขยาย แล้วผันบอก/ปฏิเสธ/อดีต จนถึงการเปรียบเทียบ",
        steps: [
          ["n5-u04-i-adj", 0],
          ["n5-u04-i-adj", 1],
          ["n5-u04-i-adj", 2],
          ["n5-u15-comparison", 0],
          ["n5-u15-comparison", 2],
          ["n5-u15-comparison", 3]
        ]
      },
      {
        id: "giveget",
        label: "การให้–รับ: คำนาม → การกระทำ",
        desc: "เข้าใจทิศทางกับคำนามก่อน แล้วต่อยอดเป็นการให้-รับ 'การกระทำ' ด้วยรูป て",
        steps: [
          ["n5-u12-give-receive", 0],
          ["n5-u12-give-receive", 1],
          ["n5-u23-giving-receiving-actions", 0],
          ["n5-u23-giving-receiving-actions", 1]
        ]
      }
    ]
  },

  n4: {
    categories: [
      {
        id: "request-explain",
        label: "อธิบาย & ขอร้องสุภาพ",
        icon: "説",
        desc: "เล่าเหตุผล/สถานการณ์ด้วย んです และขอร้องอย่างสุภาพ ていただけませんか",
        refs: [
          ["n4-u01-nodesu-request", [0, 1, 2]]
        ]
      },
      {
        id: "ability",
        label: "ความสามารถ & การรับรู้",
        icon: "可",
        desc: "ทำได้ไหม — รูปสามารถ 可能形, 見える・聞こえる และ ことができます",
        refs: [
          ["n4-u02-potential", [0, 1]],
          ["n4-u13-nominalization", [1]]
        ]
      },
      {
        id: "intention",
        label: "ความตั้งใจ & แผนการ",
        icon: "意",
        desc: "บอกความตั้งใจ — รูป意向形, つもり, と思っています และความเสียดาย ばよかった",
        refs: [
          ["n4-u06-volitional-intent", [0, 1, 2, 3]],
          ["n4-u20-ba-yokatta", [0]]
        ]
      },
      {
        id: "advice-command",
        label: "คำแนะนำ คำสั่ง ห้าม & ใช้ให้ทำ",
        icon: "令",
        desc: "บอกให้คนอื่นทำ — ほうがいい, รูปคำสั่ง 命令形, な・なさい และรูปใช้ให้ทำ 使役形",
        refs: [
          ["n4-u07-suggest-probability", [0]],
          ["n4-u08-imperative", [0, 1, 2]],
          ["n4-u22-causative", [0, 1]]
        ]
      },
      {
        id: "guess-probability",
        label: "การคาดเดา & ความน่าจะเป็น",
        icon: "推",
        desc: "ไม่ฟันธง — でしょう, かもしれません, そう (ดูเหมือน/เล่าลือ), ようです・みたいです",
        refs: [
          ["n4-u07-suggest-probability", [1, 2]],
          ["n4-u18-sou-motion", [0]],
          ["n4-u21-hearsay-you", [0, 1]]
        ]
      },
      {
        id: "conditional",
        label: "เงื่อนไข & สมมติ",
        icon: "条",
        desc: "ถ้า~ — なら, รูป ば, たら และยิ่ง~ยิ่ง ば〜ほど",
        refs: [
          ["n4-u02-potential", [3]],
          ["n4-u10-conditional", [0, 1, 2]]
        ]
      },
      {
        id: "purpose",
        label: "จุดประสงค์ & การกลายเป็น",
        icon: "的",
        desc: "เพื่อ~ — ように (เป้าหมาย), ようになります, ようにします และ ために",
        refs: [
          ["n4-u11-purpose-become", [0, 1, 2]],
          ["n4-u17-purpose-tame", [0, 1, 2]]
        ]
      },
      {
        id: "passive",
        label: "รูปถูกกระทำ (受身)",
        icon: "受",
        desc: "ถูก~ — รูป受身形, passive แบบเดือดร้อน 迷惑の受身 และ によって",
        refs: [
          ["n4-u12-passive", [0, 1, 2]]
        ]
      },
      {
        id: "aspect",
        label: "สภาพ & การดำเนินของการกระทำ",
        icon: "態",
        desc: "สภาพที่เป็นอยู่/เตรียมไว้ — ています, てあります, ておきます, てしまいます, てみます, ところ, たばかり",
        refs: [
          ["n4-u03-nagara-shi", [1]],
          ["n4-u04-state-teshimau", [0, 1]],
          ["n4-u05-tearu-teoku", [0, 1, 2]],
          ["n4-u15-indirect-q-try", [1]],
          ["n4-u18-sou-motion", [1]],
          ["n4-u20-ba-yokatta", [1, 2]]
        ]
      },
      {
        id: "nominalization",
        label: "ทำเป็นคำนาม & อ้างคำพูด",
        icon: "名",
        desc: "เปลี่ยนประโยคเป็นก้อนคำนาม — の・こと, たことがある, か どうか และ と書いてあります",
        refs: [
          ["n4-u08-imperative", [3]],
          ["n4-u13-nominalization", [0, 2, 3]],
          ["n4-u15-indirect-q-try", [0]]
        ]
      },
      {
        id: "connect",
        label: "เชื่อมประโยค เหตุ & ขัดแย้ง",
        icon: "接",
        desc: "ร้อยประโยค — ながら, し, とおりに, あとで, ないで・ずに, ので, のに",
        refs: [
          ["n4-u03-nagara-shi", [0, 2]],
          ["n4-u09-manner-time", [0, 1, 2]],
          ["n4-u14-cause-contrast", [0, 1, 2]]
        ]
      },
      {
        id: "giving-receiving",
        label: "การให้และการรับ (授受)",
        icon: "授",
        desc: "ทิศทางให้-รับ あげる・もらう・くれる และรูป て + กริยาให้รับ",
        refs: [
          ["n4-u16-giving-receiving", [0, 1, 2]]
        ]
      },
      {
        id: "degree-limit",
        label: "ระดับ เกินไป & จำกัด",
        icon: "度",
        desc: "บอกระดับ — すぎる, やすい・にくい และการจำกัด しか + ปฏิเสธ",
        refs: [
          ["n4-u02-potential", [2]],
          ["n4-u19-sugiru-yasui", [0, 1]]
        ]
      },
      {
        id: "keigo",
        label: "ภาษาสุภาพ (敬語)",
        icon: "敬",
        desc: "ยกย่อง 尊敬語 และถ่อมตน 謙譲語 — お〜になります, お〜します, คำเฉพาะ และ ございます",
        refs: [
          ["n4-u23-keigo-sonkei", [0, 1, 2]],
          ["n4-u24-keigo-kenjou", [0, 1, 2]]
        ]
      }
    ],

    paths: [
      {
        id: "verb-forms",
        label: "การผันรูปกริยาขั้น N4",
        desc: "ต่อจาก ます/て ของ N5 — สามารถ → ตั้งใจ → สั่ง → ถูกกระทำ → ใช้ให้ทำ",
        steps: [
          ["n4-u02-potential", 0],
          ["n4-u06-volitional-intent", 0],
          ["n4-u08-imperative", 0],
          ["n4-u12-passive", 0],
          ["n4-u22-causative", 0]
        ]
      },
      {
        id: "conditional",
        label: "เงื่อนไข: ば・たら → ยิ่ง~ยิ่ง → เสียดาย",
        desc: "เริ่มจากรูปเงื่อนไขพื้นฐาน ขยายเป็น ば〜ほど และความเสียดาย ばよかった",
        steps: [
          ["n4-u10-conditional", 0],
          ["n4-u10-conditional", 1],
          ["n4-u10-conditional", 2],
          ["n4-u20-ba-yokatta", 0]
        ]
      },
      {
        id: "youni",
        label: "ように: เป้าหมาย → กลายเป็น → พยายาม",
        desc: "เข้าใจ ように ในความหมายเป้าหมายก่อน แล้วต่อยอด ようになる・ようにする",
        steps: [
          ["n4-u11-purpose-become", 0],
          ["n4-u11-purpose-become", 1],
          ["n4-u11-purpose-become", 2],
          ["n4-u17-purpose-tame", 1]
        ]
      },
      {
        id: "te-ext",
        label: "ต่อยอดรูป て (N4)",
        desc: "เมื่อมีรูป て แล้ว ต่อได้อีกมาก — てある → ておく → てしまう → てみる → てくる",
        steps: [
          ["n4-u05-tearu-teoku", 0],
          ["n4-u05-tearu-teoku", 1],
          ["n4-u04-state-teshimau", 1],
          ["n4-u15-indirect-q-try", 1],
          ["n4-u18-sou-motion", 1]
        ]
      },
      {
        id: "guess",
        label: "การคาดเดา: そう → でしょう → よう",
        desc: "ไล่ระดับความมั่นใจ จากการดู そう ไปจนถึงการเล่าลือและการสันนิษฐาน よう",
        steps: [
          ["n4-u18-sou-motion", 0],
          ["n4-u07-suggest-probability", 2],
          ["n4-u07-suggest-probability", 1],
          ["n4-u21-hearsay-you", 0],
          ["n4-u21-hearsay-you", 1]
        ]
      },
      {
        id: "keigo",
        label: "ภาษาสุภาพ: ยกย่อง → ถ่อมตน",
        desc: "เรียงลำดับการเรียน 敬語 — sonkei ก่อน แล้วจึง kenjou",
        steps: [
          ["n4-u23-keigo-sonkei", 0],
          ["n4-u23-keigo-sonkei", 1],
          ["n4-u24-keigo-kenjou", 0],
          ["n4-u24-keigo-kenjou", 1]
        ]
      }
    ]
  },

  n3: {
    categories: [
      {
        id: "time",
        label: "เวลา & ลำดับเหตุการณ์",
        icon: "時",
        desc: "จังหวะเวลา — ところだ, うちに, 間(に), かけ และลำดับ とたん, かのうちに, てから, 次第",
        refs: [
          ["n3-u01-time-tokoro-uchi", [0, 1, 2, 3]],
          ["n3-u02-simultaneous-sequence", [0, 1, 2, 3]]
        ]
      },
      {
        id: "about-perspective",
        label: "เกี่ยวกับ & มุมมอง/จุดยืน",
        icon: "観",
        desc: "พูดถึงประเด็น — について, に対して, に関して, に向けて และมุมมอง にとって, として, にしては, からすると",
        refs: [
          ["n3-u03-about-regarding", [0, 1, 2, 3]],
          ["n3-u23-perspective-standpoint", [0, 1, 2, 3, 4]]
        ]
      },
      {
        id: "scope-medium",
        label: "ขอบเขต & สื่อกลาง/อ้างอิง",
        icon: "範",
        desc: "ช่วงและตัวกลาง — からにかけて, を通じて, 限り และ によって, によると, をもとに, どおり",
        refs: [
          ["n3-u04-scope-through", [0, 1, 2, 3]],
          ["n3-u05-medium-basis", [0, 1, 2, 3]]
        ]
      },
      {
        id: "cause",
        label: "เหตุผล & ที่มา",
        icon: "因",
        desc: "อธิบายสาเหตุ — おかげで, せいで, ばかりに, あまり และ からには・以上は",
        refs: [
          ["n3-u06-cause-reason", [0, 1, 2, 3, 4]]
        ]
      },
      {
        id: "contrast",
        label: "การขัดแย้ง & สวนทาง",
        icon: "逆",
        desc: "ทั้งที่~แต่ — のに, くせに, にもかかわらず, わりに(は), ながらも, に反して",
        refs: [
          ["n3-u07-contrast-despite", [0, 1, 2, 3, 4, 5]]
        ]
      },
      {
        id: "negation",
        label: "การปฏิเสธเชิงเข้ม & ห้าม",
        icon: "否",
        desc: "ปฏิเสธหนักแน่น — わけがない, わけではない, とは限らない, っこない และห้าม わけにはいかない, ことはない",
        refs: [
          ["n3-u08-strong-negation", [0, 1, 2, 3, 4]],
          ["n3-u09-cannot-mustnot", [0, 1, 2, 3]]
        ]
      },
      {
        id: "conditional",
        label: "เงื่อนไข & สมมติ",
        icon: "仮",
        desc: "ถ้าเพียง~ — さえ〜ば, としたら, ものなら และยิ่ง~ยิ่ง ば〜ほど",
        refs: [
          ["n3-u10-conditional-hypothetical", [0, 1, 2, 3]]
        ]
      },
      {
        id: "examples",
        label: "การยกตัวอย่าง",
        icon: "例",
        desc: "ยกตัวอย่าง — とか, やら, をはじめ และ なんか・なんて",
        refs: [
          ["n3-u11-examples-and-such", [0, 1, 2, 3]]
        ]
      },
      {
        id: "difficulty",
        label: "ยาก ง่าย & เป็นไปไม่ได้",
        icon: "難",
        desc: "ต่อท้าย Vます-stem บอกความยากง่าย — ようがない, がたい, かねる, きる, づらい・にくい",
        refs: [
          ["n3-u12-hard-impossible-easy", [0, 1, 2, 3, 4]]
        ]
      },
      {
        id: "judgement",
        label: "การตัดสิน ควร/ต้อง/น่าจะ",
        icon: "判",
        desc: "ประเมินสถานการณ์ — はずだ, べき(だ), ものだ, ことだ และ に違いない",
        refs: [
          ["n3-u13-should-must-supposed", [0, 1, 2, 3, 4]]
        ]
      },
      {
        id: "te-aspect",
        label: "รูป て & การเปลี่ยน/ดำเนิน",
        icon: "態",
        desc: "ขยายรูป て — ておく, てある, てしまう, てみる และการเปลี่ยน/ดำเนินไป ようになる, ていく・てくる, つつある, 一方だ",
        refs: [
          ["n3-u14-te-forms-extended", [0, 1, 2, 3]],
          ["n3-u15-change-progress", [0, 1, 2, 3, 4, 5]]
        ]
      },
      {
        id: "feeling",
        label: "ความรู้สึกรุนแรง & อดไม่ได้",
        icon: "情",
        desc: "อารมณ์ท่วมท้น/กลั้นไม่อยู่ — Vて + たまらない・しかたがない・ならない และ ずにはいられない",
        refs: [
          ["n3-u22-unbearable-feeling", [0, 1, 2, 3]]
        ]
      },
      {
        id: "appearance-hearsay",
        label: "ลักษณะ แนวโน้ม & การเล่าลือ",
        icon: "伝",
        desc: "ดูเหมือน/แนวโน้ม — ようだ, みたい, らしい, がち, っぽい, 気味, だらけ และเล่าลือ そうだ, ということだ, って",
        refs: [
          ["n3-u16-appearance-tendency", [0, 1, 2, 3, 4, 5, 6]],
          ["n3-u17-hearsay-quote", [0, 1, 2, 3, 4]]
        ]
      },
      {
        id: "comparison",
        label: "การเปรียบเทียบ & ระดับ",
        icon: "比",
        desc: "เทียบระดับ — ほど〜ない, ほど, くらい, に比べて และ というより",
        refs: [
          ["n3-u18-comparison", [0, 1, 2, 3, 4]]
        ]
      },
      {
        id: "emphasis-limit",
        label: "การเน้น จำกัด & ไม่เพียงแค่",
        icon: "強",
        desc: "เน้นย้ำ — こそ, さえ, すら, までも และจำกัด しか, に限る และเสริม だけでなく, のみならず, 上に",
        refs: [
          ["n3-u19-emphasis-even", [0, 1, 2, 3, 4]],
          ["n3-u20-only-limit", [0, 1, 2, 3, 4]],
          ["n3-u21-not-only", [0, 1, 2, 3, 4]]
        ]
      },
      {
        id: "change-together",
        label: "ควบคู่ & เปลี่ยนไปด้วยกัน",
        icon: "連",
        desc: "เปลี่ยนแปลงพร้อมกัน — とともに, につれて, にしたがって และ に伴って",
        refs: [
          ["n3-u24-along-with-change", [0, 1, 2, 3]]
        ]
      }
    ],

    paths: [
      {
        id: "te-ext",
        label: "ต่อยอดรูป て (N3)",
        desc: "ทบทวนและขยายการใช้รูป て — ておく → てある → てしまう → てみる",
        steps: [
          ["n3-u14-te-forms-extended", 0],
          ["n3-u14-te-forms-extended", 1],
          ["n3-u14-te-forms-extended", 2],
          ["n3-u14-te-forms-extended", 3]
        ]
      },
      {
        id: "masu-stem",
        label: "ต่อท้าย Vます-stem (連用形)",
        desc: "หลายไวยากรณ์ N3 ต่อท้ายราก ます — かけ → 次第 → がたい → きる → がち",
        steps: [
          ["n3-u01-time-tokoro-uchi", 3],
          ["n3-u02-simultaneous-sequence", 3],
          ["n3-u12-hard-impossible-easy", 1],
          ["n3-u12-hard-impossible-easy", 3],
          ["n3-u16-appearance-tendency", 3]
        ]
      },
      {
        id: "change",
        label: "การเปลี่ยนแปลง & การดำเนินไป",
        desc: "ไล่จากการเปลี่ยนนิสัย/สภาพ ไปจนถึงทิศทางและแนวโน้มต่อเนื่อง",
        steps: [
          ["n3-u15-change-progress", 0],
          ["n3-u15-change-progress", 1],
          ["n3-u15-change-progress", 2],
          ["n3-u15-change-progress", 4],
          ["n3-u15-change-progress", 5]
        ]
      },
      {
        id: "guess",
        label: "การคาดเดา & เล่าลือ: そう → よう → らしい",
        desc: "แยกแยะ そう(様態) จาก そう(伝聞) แล้วเทียบกับ ようだ・みたい・らしい",
        steps: [
          ["n3-u17-hearsay-quote", 0],
          ["n3-u16-appearance-tendency", 0],
          ["n3-u16-appearance-tendency", 1],
          ["n3-u16-appearance-tendency", 2],
          ["n3-u17-hearsay-quote", 1]
        ]
      },
      {
        id: "emphasis",
        label: "การเน้นด้วย さえ・こそ & เงื่อนไข",
        desc: "เชื่อม さえ กับเงื่อนไข และต่อยอดสู่การจำกัด/เสริม しか・だけでなく",
        steps: [
          ["n3-u19-emphasis-even", 0],
          ["n3-u19-emphasis-even", 1],
          ["n3-u10-conditional-hypothetical", 0],
          ["n3-u20-only-limit", 0],
          ["n3-u21-not-only", 0]
        ]
      }
    ]
  }
};
