/**
 * Particle drill bank — fill-in-the-blank items focusing only on
 * は・が・を・に・で・へ.
 *
 * Schema (per item):
 *   id       — stable string id (do not rename; used for stats keys)
 *   particle — primary target particle (one of the six)
 *   accept[] — list of strings that count as correct (some sentences accept
 *              both に and へ for direction; passive agent accepts に only)
 *   q        — sentence with ___ marking the blank
 *   hint     — optional Thai gloss (rendered next to the question)
 *   explain  — Thai explanation shown after answer
 *   source   — "minna" + unit ref if lifted from the existing quiz bank, else "new"
 *
 * ⚠ เพิ่มข้อใหม่โดยต่อท้าย array เท่านั้น เพื่อรักษา id ของสถิติเก่า
 */
window.PARTICLE_BANK = [
  /* ========================== は (topic) ========================== */
  {
    id: "p-wa-01",
    particle: "は",
    accept: ["は"],
    q: "わたし___ タイじんです。",
    hint: "ฉันเป็นคนไทย",
    explain: "は ชี้หัวเรื่องของประโยค (อ่านว่า wa)",
    source: "minna-n5-u01"
  },
  {
    id: "p-wa-02",
    particle: "は",
    accept: ["は"],
    q: "これ___ にほんごの ほんです。",
    hint: "นี่คือหนังสือภาษาญี่ปุ่น",
    explain: "ใช้ は ชี้ว่า これ คือหัวเรื่องของประโยค",
    source: "new"
  },
  {
    id: "p-wa-03",
    particle: "は",
    accept: ["は"],
    q: "あの ひと___ せんせいです。",
    hint: "คนนั้นเป็นคุณครู",
    explain: "เลือก あの ひと เป็นหัวเรื่อง ใช้ は",
    source: "new"
  },
  {
    id: "p-wa-04",
    particle: "は",
    accept: ["は"],
    q: "きのう___ あめでした。",
    hint: "เมื่อวานฝนตก",
    explain: "เวลาที่เป็นหัวเรื่อง (きのう) ใช้ は",
    source: "new"
  },
  {
    id: "p-wa-05",
    particle: "は",
    accept: ["は"],
    q: "やまださん___ いま いえに いません。",
    hint: "ตอนนี้คุณยามาดะไม่อยู่บ้าน",
    explain: "ผู้ที่พูดถึงเป็นหัวเรื่อง ใช้ は",
    source: "new"
  },
  {
    id: "p-wa-06",
    particle: "は",
    accept: ["は"],
    q: "わたし___ コーヒーが すきです。",
    hint: "ฉันชอบกาแฟ",
    explain: "ในรูป 〜が すきです หัวเรื่อง (わたし) ใช้ は ส่วนสิ่งที่ชอบใช้ が",
    source: "new"
  },
  {
    id: "p-wa-07",
    particle: "は",
    accept: ["は"],
    q: "ぎんこう___ どこですか。",
    hint: "ธนาคารอยู่ที่ไหน?",
    explain: "หัวเรื่องของคำถาม 'อยู่ที่ไหน' ใช้ は",
    source: "new"
  },
  {
    id: "p-wa-08",
    particle: "は",
    accept: ["は"],
    q: "この みせ___ 9じから 9じまでです。",
    hint: "ร้านนี้เปิด 9 โมงถึง 3 ทุ่ม",
    explain: "ใช้ は ชี้หัวเรื่อง (この みせ)",
    source: "new"
  },
  {
    id: "p-wa-09",
    particle: "は",
    accept: ["は"],
    q: "なっとう___ あまり すきじゃ ありません。",
    hint: "ไม่ค่อยชอบนัตโตะ",
    explain: "เปลี่ยน topic เป็น なっとう ก่อนปฏิเสธ ใช้ は",
    source: "new"
  },
  {
    id: "p-wa-10",
    particle: "は",
    accept: ["は"],
    q: "テスト___ かんたんじゃ ありませんでした。",
    hint: "ข้อสอบไม่ง่าย",
    explain: "หัวเรื่อง テスト ใช้ は",
    source: "new"
  },

  /* ========================== が (subject / new info / suki etc.) ========================== */
  {
    id: "p-ga-01",
    particle: "が",
    accept: ["が"],
    q: "へやに ねこ___ います。",
    hint: "ในห้องมีแมว",
    explain: "あります/います ใช้ が นำหน้าสิ่งที่มี/อยู่",
    source: "minna-n5-u03"
  },
  {
    id: "p-ga-02",
    particle: "が",
    accept: ["が"],
    q: "つくえの うえに ほん___ あります。",
    hint: "บนโต๊ะมีหนังสือ",
    explain: "あります ใช้ が ระบุสิ่งที่มี",
    source: "minna-n5-u14"
  },
  {
    id: "p-ga-03",
    particle: "が",
    accept: ["が"],
    q: "わたしは すし___ すきです。",
    hint: "ฉันชอบซูชิ",
    explain: "好き/きらい/上手/下手/わかる ใช้ が ระบุสิ่งที่เป็น object",
    source: "minna-n5-u13"
  },
  {
    id: "p-ga-04",
    particle: "が",
    accept: ["が"],
    q: "ミラーさんは うた___ じょうずです。",
    hint: "คุณมิลเลอร์ร้องเพลงเก่ง",
    explain: "上手/下手 ใช้ が",
    source: "minna-n5-u13"
  },
  {
    id: "p-ga-05",
    particle: "が",
    accept: ["が"],
    q: "かんじ___ ぜんぜん わかりません。",
    hint: "ไม่เข้าใจคันจิเลย",
    explain: "わかる ใช้ が ระบุสิ่งที่เข้าใจ/ไม่เข้าใจ",
    source: "new"
  },
  {
    id: "p-ga-06",
    particle: "が",
    accept: ["が"],
    q: "あたらしい くるま___ ほしいです。",
    hint: "อยากได้รถใหม่",
    explain: "ほしい (i-adj) ใช้ が ระบุสิ่งที่อยากได้",
    source: "minna-n5-u16"
  },
  {
    id: "p-ga-07",
    particle: "が",
    accept: ["が"],
    q: "だれ___ きましたか。",
    hint: "ใครมาคะ?",
    explain: "คำถามด้วย だれ/なに ที่เป็นประธาน ใช้ が",
    source: "new"
  },
  {
    id: "p-ga-08",
    particle: "が",
    accept: ["が"],
    q: "あめ___ ふって います。",
    hint: "ฝนกำลังตก",
    explain: "ปรากฏการณ์ธรรมชาติ (ข้อมูลใหม่) ใช้ が",
    source: "new"
  },
  {
    id: "p-ga-09",
    particle: "が",
    accept: ["が"],
    q: "やまださん___ すんで いる うちは おおきいです。",
    hint: "บ้านที่คุณยามาดะอยู่ใหญ่",
    explain: "ในประโยคย่อยขยาย N ประธานใช้ が (ห้ามใช้ は)",
    source: "minna-n5-u21"
  },
  {
    id: "p-ga-10",
    particle: "が",
    accept: ["が"],
    q: "わたしは ピアノを ひくこと___ できます。",
    hint: "ฉันเล่นเปียโนได้",
    explain: "〜ことが できます ใช้ が",
    source: "new"
  },
  {
    id: "p-ga-11",
    particle: "が",
    accept: ["が"],
    q: "あ、バス___ きました。",
    hint: "อ้า รถบัสมาแล้ว",
    explain: "บอกการรับรู้สิ่งใหม่/เพิ่งสังเกตเห็น ใช้ が",
    source: "new"
  },
  {
    id: "p-ga-12",
    particle: "が",
    accept: ["が"],
    q: "わたしは あたま___ いたいです。",
    hint: "ฉันปวดหัว",
    explain: "อาการของร่างกาย (いたい) ใช้ が ระบุส่วนที่ปวด",
    source: "new"
  },

  /* ========================== を (direct object) ========================== */
  {
    id: "p-wo-01",
    particle: "を",
    accept: ["を"],
    q: "ごはん___ たべます。",
    hint: "กินข้าว",
    explain: "ごはん เป็นกรรมตรงของ たべます ใช้ を",
    source: "minna-n5-u03"
  },
  {
    id: "p-wo-02",
    particle: "を",
    accept: ["を"],
    q: "ほん___ よみます。",
    hint: "อ่านหนังสือ",
    explain: "กรรมตรงของ よむ ใช้ を",
    source: "new"
  },
  {
    id: "p-wo-03",
    particle: "を",
    accept: ["を"],
    q: "みず___ のみます。",
    hint: "ดื่มน้ำ",
    explain: "กรรมตรงของ のむ ใช้ を",
    source: "new"
  },
  {
    id: "p-wo-04",
    particle: "を",
    accept: ["を"],
    q: "えいが___ みました。",
    hint: "ดูหนัง(แล้ว)",
    explain: "กรรมตรงของ みる ใช้ を",
    source: "new"
  },
  {
    id: "p-wo-05",
    particle: "を",
    accept: ["を"],
    q: "日本語___ べんきょうします。",
    hint: "เรียนภาษาญี่ปุ่น",
    explain: "กรรมตรงของ べんきょうする ใช้ を",
    source: "new"
  },
  {
    id: "p-wo-06",
    particle: "を",
    accept: ["を"],
    q: "しゃしん___ とります。",
    hint: "ถ่ายรูป",
    explain: "กรรมตรงของ とる ใช้ を",
    source: "new"
  },
  {
    id: "p-wo-07",
    particle: "を",
    accept: ["を"],
    q: "てがみ___ かきました。",
    hint: "เขียนจดหมาย",
    explain: "กรรมตรงของ かく ใช้ を",
    source: "new"
  },
  {
    id: "p-wo-08",
    particle: "を",
    accept: ["を"],
    q: "ドア___ あけて ください。",
    hint: "ช่วยเปิดประตูหน่อย",
    explain: "กรรมตรงของ あける ใช้ を",
    source: "new"
  },
  {
    id: "p-wo-09",
    particle: "を",
    accept: ["を"],
    q: "まいあさ コーヒー___ のみます。",
    hint: "ดื่มกาแฟทุกเช้า",
    explain: "กรรมตรง コーヒー ใช้ を",
    source: "new"
  },
  {
    id: "p-wo-10",
    particle: "を",
    accept: ["を"],
    q: "つぎの えき___ おります。",
    hint: "ลงที่สถานีถัดไป",
    explain: "おりる ใช้ を ระบุสถานที่ที่ออก/ลง (point of separation)",
    source: "new"
  },
  {
    id: "p-wo-11",
    particle: "を",
    accept: ["を"],
    q: "こうえん___ さんぽします。",
    hint: "เดินเล่นในสวน",
    explain: "กริยาเคลื่อนที่ผ่านเส้นทาง (さんぽする・あるく・わたる) ใช้ を",
    source: "new"
  },
  {
    id: "p-wo-12",
    particle: "を",
    accept: ["を"],
    q: "9じに うち___ でます。",
    hint: "ออกจากบ้าน 9 โมง",
    explain: "でる ใช้ を ระบุจุดเริ่มที่ออก (point of departure)",
    source: "new"
  },

  /* ========================== に (time / destination / location-be / recipient / passive agent) ========================== */
  {
    id: "p-ni-01",
    particle: "に",
    accept: ["に", "へ"],
    q: "がっこう___ 行きます。",
    hint: "ไปโรงเรียน",
    explain: "ปลายทางของกริยาเคลื่อนที่ ใช้ に หรือ へ ก็ได้ (へ เน้นทิศ)",
    source: "minna-n5-u03"
  },
  {
    id: "p-ni-02",
    particle: "に",
    accept: ["に"],
    q: "7じ___ おきます。",
    hint: "ตื่น 7 โมง",
    explain: "ระบุจุดเวลา (เวลาที่เจาะจง เช่น 7じ) ใช้ に",
    source: "new"
  },
  {
    id: "p-ni-03",
    particle: "に",
    accept: ["に"],
    q: "ミラーさんは じむしょ___ います。",
    hint: "คุณมิลเลอร์อยู่ที่ออฟฟิศ",
    explain: "สถานที่ที่อยู่ (います/あります) ใช้ に",
    source: "minna-n5-u14"
  },
  {
    id: "p-ni-04",
    particle: "に",
    accept: ["に"],
    q: "わたしは ミラーさん___ チョコレートを あげました。",
    hint: "ฉันให้ช็อกโกแลตคุณมิลเลอร์",
    explain: "ผู้รับใน あげます ใช้ に",
    source: "minna-n5-u12"
  },
  {
    id: "p-ni-05",
    particle: "に",
    accept: ["に"],
    q: "わたしは ともだち___ パーティーに よばれました。",
    hint: "ฉันถูกเพื่อนชวนไปงานปาร์ตี้",
    explain: "ผู้กระทำในรูป passive ใช้ に",
    source: "minna-n4-u12"
  },
  {
    id: "p-ni-06",
    particle: "に",
    accept: ["に"],
    q: "あめ___ ふられて、こまりました。",
    hint: "เดือดร้อนเพราะฝนตกใส่",
    explain: "ผู้กระทำในรูป passive (สิ่งที่ทำให้เดือดร้อน) ใช้ に",
    source: "minna-n4-u12"
  },
  {
    id: "p-ni-07",
    particle: "に",
    accept: ["に"],
    q: "あに___ じてんしゃを なおして もらいました。",
    hint: "ขอให้พี่ชายซ่อมจักรยานให้",
    explain: "ผู้ทำให้ในรูป もらう ใช้ に",
    source: "minna-n5-u23"
  },
  {
    id: "p-ni-08",
    particle: "に",
    accept: ["に"],
    q: "あには いしゃ___ なりました。",
    hint: "พี่ชายได้เป็นหมอ",
    explain: "N + に なります (กลายเป็น)",
    source: "minna-n5-u18"
  },
  {
    id: "p-ni-09",
    particle: "に",
    accept: ["に"],
    q: "ちちは わたし___ ペンを くれました。",
    hint: "พ่อให้ปากกาฉัน",
    explain: "ผู้รับใน くれます ใช้ に",
    source: "minna-n4-u16"
  },
  {
    id: "p-ni-10",
    particle: "に",
    accept: ["に"],
    q: "土よう日___ ともだちに あいます。",
    hint: "วันเสาร์จะเจอเพื่อน",
    explain: "วันที่/เวลาเจาะจง ใช้ に",
    source: "new"
  },
  {
    id: "p-ni-11",
    particle: "に",
    accept: ["に"],
    q: "せんせい___ しつもんを します。",
    hint: "ถามคำถามอาจารย์",
    explain: "ผู้ที่ทำกิจกรรมไปถึง (ถาม/พูด/บอก) ใช้ に",
    source: "new"
  },
  {
    id: "p-ni-12",
    particle: "に",
    accept: ["に"],
    q: "うち___ かえる まえに、てを あらいます。",
    hint: "ก่อนกลับบ้าน ล้างมือ",
    explain: "ปลายทาง うち + กริยาเคลื่อนที่ かえる ใช้ に",
    source: "new"
  },
  {
    id: "p-ni-13",
    particle: "に",
    accept: ["に"],
    q: "ホテルの まえ___ タクシーが あります。",
    hint: "หน้าโรงแรมมีแท็กซี่",
    explain: "あります ใช้ に ระบุสถานที่",
    source: "new"
  },
  {
    id: "p-ni-14",
    particle: "に",
    accept: ["に"],
    q: "1しゅうかん___ 2かい、テニスを します。",
    hint: "เล่นเทนนิสสัปดาห์ละ 2 ครั้ง",
    explain: "ระยะเวลา + に + จำนวนครั้ง = 'ต่อ X' (ความถี่)",
    source: "new"
  },

  /* ========================== で (place of action / means / language) ========================== */
  {
    id: "p-de-01",
    particle: "で",
    accept: ["で"],
    q: "としょかん___ べんきょうします。",
    hint: "เรียนที่ห้องสมุด",
    explain: "สถานที่ทำกิจกรรม (action) ใช้ で",
    source: "minna-n5-u03"
  },
  {
    id: "p-de-02",
    particle: "で",
    accept: ["で"],
    q: "バス___ かいしゃへ 行きます。",
    hint: "ไปบริษัทโดยรถบัส",
    explain: "วิธีการ/พาหนะ ใช้ で",
    source: "new"
  },
  {
    id: "p-de-03",
    particle: "で",
    accept: ["で"],
    q: "日本語___ はなしましょう。",
    hint: "พูดเป็นภาษาญี่ปุ่นกันเถอะ",
    explain: "ภาษาที่ใช้ ใช้ で",
    source: "new"
  },
  {
    id: "p-de-04",
    particle: "で",
    accept: ["で"],
    q: "レストラン___ ばんごはんを たべます。",
    hint: "กินข้าวเย็นที่ร้านอาหาร",
    explain: "สถานที่ทำกริยา action (たべる) ใช้ で",
    source: "new"
  },
  {
    id: "p-de-05",
    particle: "で",
    accept: ["で"],
    q: "はし___ ごはんを たべます。",
    hint: "กินข้าวด้วยตะเกียบ",
    explain: "เครื่องมือ/อุปกรณ์ ใช้ で",
    source: "new"
  },
  {
    id: "p-de-06",
    particle: "で",
    accept: ["で"],
    q: "うち___ テレビを みます。",
    hint: "ดูทีวีที่บ้าน",
    explain: "สถานที่ทำกริยา ใช้ で",
    source: "new"
  },
  {
    id: "p-de-07",
    particle: "で",
    accept: ["で"],
    q: "ペン___ なまえを かいて ください。",
    hint: "ช่วยเขียนชื่อด้วยปากกา",
    explain: "เครื่องมือเขียน ใช้ で",
    source: "new"
  },
  {
    id: "p-de-08",
    particle: "で",
    accept: ["で"],
    q: "こうえん___ こどもが あそんで います。",
    hint: "เด็กกำลังเล่นที่สวน",
    explain: "สถานที่ทำกริยา action (あそぶ) ใช้ で",
    source: "new"
  },
  {
    id: "p-de-09",
    particle: "で",
    accept: ["で"],
    q: "インターネット___ チケットを かいました。",
    hint: "ซื้อตั๋วผ่านอินเทอร์เน็ต",
    explain: "ช่องทาง/วิธีการ ใช้ で",
    source: "new"
  },
  {
    id: "p-de-10",
    particle: "で",
    accept: ["で"],
    q: "かぜ___ がっこうを やすみました。",
    hint: "หยุดโรงเรียนเพราะเป็นหวัด",
    explain: "สาเหตุที่เป็นเหตุการณ์/อาการ ใช้ で",
    source: "new"
  },
  {
    id: "p-de-11",
    particle: "で",
    accept: ["で"],
    q: "ぜんぶ___ 3,000円です。",
    hint: "รวมทั้งหมด 3,000 เยน",
    explain: "ขอบเขต/รวม (sum/total) ใช้ で",
    source: "new"
  },
  {
    id: "p-de-12",
    particle: "で",
    accept: ["で"],
    q: "わたしたち___ プレゼントを かいました。",
    hint: "พวกเราซื้อของขวัญร่วมกัน",
    explain: "บอก 'กลุ่ม/จำนวนคน' ที่ทำร่วมกัน ใช้ で",
    source: "new"
  },

  /* ========================== へ (direction) ========================== */
  {
    id: "p-e-01",
    particle: "へ",
    accept: ["へ", "に"],
    q: "日本___ 行きます。",
    hint: "จะไปประเทศญี่ปุ่น",
    explain: "ทิศทางการเคลื่อนที่ ใช้ へ (อ่าน e) — に ก็ใช้ได้",
    source: "minna-n5-u03"
  },
  {
    id: "p-e-02",
    particle: "へ",
    accept: ["へ", "に"],
    q: "うち___ かえります。",
    hint: "กลับบ้าน",
    explain: "ทิศทางการเคลื่อนที่ (かえる) ใช้ へ ได้  (に ก็ใช้ได้)",
    source: "new"
  },
  {
    id: "p-e-03",
    particle: "へ",
    accept: ["へ"],
    q: "ともだち___ てがみを かきました。",
    hint: "เขียนจดหมายถึงเพื่อน",
    explain: "ทิศทาง 'ถึง...' ของจดหมาย/ของฝาก นิยมใช้ へ",
    source: "new"
  },
  {
    id: "p-e-04",
    particle: "へ",
    accept: ["へ", "に"],
    q: "らいしゅう 京都___ 行きませんか。",
    hint: "สัปดาห์หน้าไปเกียวโตกันไหม",
    explain: "ปลายทาง 京都 ใช้ へ ได้ (に ก็ได้)",
    source: "new"
  },
  {
    id: "p-e-05",
    particle: "へ",
    accept: ["へ", "に"],
    q: "あした パーティー___ いきましょう。",
    hint: "พรุ่งนี้ไปงานปาร์ตี้กันเถอะ",
    explain: "ปลายทางที่จะไป ใช้ へ ได้",
    source: "new"
  },
  {
    id: "p-e-06",
    particle: "へ",
    accept: ["へ", "に"],
    q: "3ねん まえに、にほん___ きました。",
    hint: "มาญี่ปุ่นเมื่อ 3 ปีก่อน",
    explain: "ทิศทาง にほん + กริยา くる ใช้ へ ได้",
    source: "new"
  },
  {
    id: "p-e-07",
    particle: "へ",
    accept: ["へ"],
    q: "「アンナさん___」 — ของขวัญที่จ่าหน้าถึงอันนะ",
    hint: "เขียนบนการ์ด/ของขวัญ",
    explain: "เขียนระบุผู้รับบนของ/จดหมาย ใช้ へ เป็นมาตรฐาน",
    source: "new"
  },
  {
    id: "p-e-08",
    particle: "へ",
    accept: ["へ", "に"],
    q: "やまださんは アメリカ___ いきました。",
    hint: "คุณยามาดะไปอเมริกา",
    explain: "ทิศทาง アメリカ + いきます ใช้ へ ได้ (に ก็ได้)",
    source: "new"
  }
];

/* Convenience grouping for the UI. Order matches the keypad row. */
window.PARTICLE_LIST = ["は", "が", "を", "に", "で", "へ"];
