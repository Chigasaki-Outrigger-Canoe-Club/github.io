// =========================================================
// data/schedule.js  年間スケジュールのデータ
//
// 「大会・イベント」ページ（日本語・英語の両方）は、このファイルを読んで
// 年間スケジュールを表示する。表示する側のプログラムは sub.js にある。
//
// ■ 新しい年を足すとき
//   下の一覧のいちばん上に、同じ形のかたまり（year から items の終わりまで）を足す。
//   過去の年は消さずに残す。ページ上の年の切り替えに、自動で並ぶ。
//
// ■ 1件の書き方
//   date   : 日付（短く。例 "6/7"、"7/18・19"、"10月"）
//   note   : 日付の補足（例 "予備日 6/14"、"日程未定"）。なければ書かない
//   name   : イベント名
//   detail : 補足（例 "逗子OC6レース"）。なければ書かない
//   place  : 主催／開催地。なければ書かない
//   link   : 専用ページがあるときのファイル名（例 "hukilau.html"）。なければ書かない
//   en     : 英語版での表示。同じ項目を英語で書く
//
// ■ provisional: true にすると、その年に「仮の内容です」という注記が出る。
// =========================================================
window.COCC_SCHEDULE = [
  {
    year: 2026,
    provisional: false,
    footnote: "COCCファミリーデーは日程未定です。",
    footnote_en: "COCC Family Day: date to be decided.",
    items: [
      {"date": "3/22", "name": "新入会員対象 活動セミナー", "detail": "天候、ルール、装備、安全対策ほか", "place": "クラブ", "en": {"date": "3/22", "name": "Seminar for new members", "detail": "Weather, rules, equipment, safety and more", "place": "Club"}},
      {"date": "4/4・5", "name": "シーズンイン", "en": {"date": "4/4–5", "name": "Season opening"}},
      {"date": "4/18・19", "name": "OC1V1 JAPAN CUP", "detail": "南伊豆OC1レース", "place": "Va'a JAPAN／下田 弓ヶ浜", "en": {"date": "4/18–19", "name": "OC1V1 JAPAN CUP", "detail": "Minami-Izu OC1 race", "place": "Va'a JAPAN / Yumigahama, Shimoda"}},
      {"date": "5/4", "name": "GW Paddletrip", "place": "COCC／三浦方面", "en": {"date": "5/4", "name": "GW Paddletrip", "place": "COCC / Miura area"}},
      {"date": "5/6", "name": "MOLOKAI SOLO", "place": "モロカイ島→オアフ島（ワイキキ）", "en": {"date": "5/6", "name": "MOLOKAI SOLO", "place": "Molokai to Oahu (Waikiki)"}},
      {"date": "5月", "note": "GW・日程未定", "name": "BBQ", "place": "COCC／茅ヶ崎ビーチ", "en": {"date": "May", "name": "BBQ", "note": "Golden Week, date TBC", "place": "COCC / Chigasaki Beach"}},
      {"date": "5/23・24", "name": "JOCAカップ", "detail": "逗子OC6レース", "place": "JOCA／逗子海岸", "en": {"date": "5/23–24", "name": "JOCA Cup", "detail": "Zushi OC6 race", "place": "JOCA / Zushi Beach"}},
      {"date": "6/7", "note": "予備日 6/14", "name": "湘南パドリングチャレンジ", "detail": "江の島OC6レース", "place": "SOCC／江ノ島東浜", "en": {"date": "6/7", "name": "Shonan Paddling Challenge", "note": "backup 6/14", "detail": "Enoshima OC6 race", "place": "SOCC / Enoshima Higashihama"}},
      {"date": "6/27", "note": "予備日 6/28", "name": "The Race", "place": "Wailea／鎌倉 材木座", "en": {"date": "6/27", "name": "The Race", "note": "backup 6/28", "place": "Wailea / Zaimokuza, Kamakura"}},
      {"date": "7/18・19", "name": "大島クロッシング", "detail": "茅ヶ崎⇔大島", "place": "COCC／伊豆大島", "en": {"date": "7/18–19", "name": "Oshima Crossing", "detail": "Chigasaki to Oshima and back", "place": "COCC / Izu Oshima"}},
      {"date": "7/20", "note": "月・祝", "name": "浜降祭", "place": "茅ヶ崎", "en": {"date": "7/20", "name": "Hamaori Festival", "note": "Mon, holiday", "place": "Chigasaki"}},
      {"date": "8/4〜9", "name": "小笠原KIDSキャンプ", "place": "COCC／小笠原 父島", "en": {"date": "8/4–9", "name": "Ogasawara KIDS Camp", "place": "COCC / Chichijima, Ogasawara"}},
      {"date": "8/29", "note": "予備日 8/30", "name": "Women's Paddle Meet Ho'aikane", "place": "COCC／茅ヶ崎", "link": "hoaikane.html", "en": {"date": "8/29", "name": "Women's Paddle Meet Ho'aikane", "note": "backup 8/30", "place": "COCC / Chigasaki"}},
      {"date": "9/3〜7", "name": "QUEEN LILI'UOKALANI CANOE RACE", "detail": "KONA", "place": "ハワイ島", "en": {"date": "9/3–7", "name": "QUEEN LILI'UOKALANI CANOE RACE", "detail": "KONA", "place": "Island of Hawaii"}},
      {"date": "9/26", "name": "三浦半島Paddle", "detail": "和田浜－油壷－城ヶ島", "place": "COCC・SPC／油壷周辺", "en": {"date": "9/26", "name": "Miura Peninsula Paddle", "detail": "Wadahama, Aburatsubo, Jogashima", "place": "COCC, SPC / around Aburatsubo"}},
      {"date": "10/3・4", "name": "HAWAIKI NUI VA'A", "place": "OCEAN／葉山", "en": {"date": "10/3–4", "name": "HAWAIKI NUI VA'A", "place": "OCEAN / Hayama"}},
      {"date": "10月", "note": "日程未定", "name": "逗子パドルミート", "detail": "逗子OC6スプリントレース", "place": "Ohana Hoe／逗子", "en": {"date": "Oct", "name": "Zushi Paddle Meet", "note": "date TBC", "detail": "Zushi OC6 sprint race", "place": "Ohana Hoe / Zushi"}},
      {"date": "10月", "note": "日程未定", "name": "湘南パドリングチャレンジU19", "detail": "江ノ島OC6レース", "place": "SOCC／江ノ島東浜", "en": {"date": "Oct", "name": "Shonan Paddling Challenge U19", "note": "date TBC", "detail": "Enoshima OC6 race", "place": "SOCC / Enoshima Higashihama"}},
      {"date": "10/31・11/1", "name": "HUKILAU CHALLENGE", "detail": "茅ヶ崎OC6チャンピオンシップ", "place": "COCC／茅ヶ崎", "link": "hukilau.html", "en": {"date": "10/31–11/1", "name": "HUKILAU CHALLENGE", "detail": "Chigasaki OC6 Championship", "place": "COCC / Chigasaki"}},
      {"date": "12/19", "name": "Christmas Race ＆ 忘年会", "place": "COCC／茅ヶ崎", "en": {"date": "12/19", "name": "Christmas Race & year-end party", "place": "COCC / Chigasaki"}}
    ]
  },
  {
    year: 2025,
    provisional: true,   // 2025年は仮の内容（2026年の予定をもとに、月だけを入れたもの）
    footnote: "",
    footnote_en: "",
    items: [
      {"date": "3月", "name": "新入会員対象 活動セミナー", "detail": "天候、ルール、装備、安全対策ほか", "place": "クラブ", "en": {"date": "Mar", "name": "Seminar for new members", "detail": "Weather, rules, equipment, safety and more", "place": "Club"}},
      {"date": "4月", "name": "シーズンイン", "en": {"date": "Apr", "name": "Season opening"}},
      {"date": "4月", "name": "OC1V1 JAPAN CUP", "detail": "南伊豆OC1レース", "place": "Va'a JAPAN／下田 弓ヶ浜", "en": {"date": "Apr", "name": "OC1V1 JAPAN CUP", "detail": "Minami-Izu OC1 race", "place": "Va'a JAPAN / Yumigahama, Shimoda"}},
      {"date": "5月", "name": "GW Paddletrip", "place": "COCC／三浦方面", "en": {"date": "May", "name": "GW Paddletrip", "place": "COCC / Miura area"}},
      {"date": "5月", "name": "MOLOKAI SOLO", "place": "モロカイ島→オアフ島（ワイキキ）", "en": {"date": "May", "name": "MOLOKAI SOLO", "place": "Molokai to Oahu (Waikiki)"}},
      {"date": "5月", "name": "BBQ", "place": "COCC／茅ヶ崎ビーチ", "en": {"date": "May", "name": "BBQ", "place": "COCC / Chigasaki Beach"}},
      {"date": "5月", "name": "JOCAカップ", "detail": "逗子OC6レース", "place": "JOCA／逗子海岸", "en": {"date": "May", "name": "JOCA Cup", "detail": "Zushi OC6 race", "place": "JOCA / Zushi Beach"}},
      {"date": "6月", "name": "湘南パドリングチャレンジ", "detail": "江の島OC6レース", "place": "SOCC／江ノ島東浜", "en": {"date": "Jun", "name": "Shonan Paddling Challenge", "detail": "Enoshima OC6 race", "place": "SOCC / Enoshima Higashihama"}},
      {"date": "6月", "name": "The Race", "place": "Wailea／鎌倉 材木座", "en": {"date": "Jun", "name": "The Race", "place": "Wailea / Zaimokuza, Kamakura"}},
      {"date": "7月", "name": "大島クロッシング", "detail": "茅ヶ崎⇔大島", "place": "COCC／伊豆大島", "en": {"date": "Jul", "name": "Oshima Crossing", "detail": "Chigasaki to Oshima and back", "place": "COCC / Izu Oshima"}},
      {"date": "7月", "name": "浜降祭", "place": "茅ヶ崎", "en": {"date": "Jul", "name": "Hamaori Festival", "place": "Chigasaki"}},
      {"date": "8月", "name": "小笠原KIDSキャンプ", "place": "COCC／小笠原 父島", "en": {"date": "Aug", "name": "Ogasawara KIDS Camp", "place": "COCC / Chichijima, Ogasawara"}},
      {"date": "8月", "name": "Women's Paddle Meet Ho'aikane", "place": "COCC／茅ヶ崎", "link": "hoaikane.html", "en": {"date": "Aug", "name": "Women's Paddle Meet Ho'aikane", "place": "COCC / Chigasaki"}},
      {"date": "9月", "name": "QUEEN LILI'UOKALANI CANOE RACE", "detail": "KONA", "place": "ハワイ島", "en": {"date": "Sep", "name": "QUEEN LILI'UOKALANI CANOE RACE", "detail": "KONA", "place": "Island of Hawaii"}},
      {"date": "9月", "name": "三浦半島Paddle", "detail": "和田浜－油壷－城ヶ島", "place": "COCC・SPC／油壷周辺", "en": {"date": "Sep", "name": "Miura Peninsula Paddle", "detail": "Wadahama, Aburatsubo, Jogashima", "place": "COCC, SPC / around Aburatsubo"}},
      {"date": "10月", "name": "HAWAIKI NUI VA'A", "place": "OCEAN／葉山", "en": {"date": "Oct", "name": "HAWAIKI NUI VA'A", "place": "OCEAN / Hayama"}},
      {"date": "10月", "name": "逗子パドルミート", "detail": "逗子OC6スプリントレース", "place": "Ohana Hoe／逗子", "en": {"date": "Oct", "name": "Zushi Paddle Meet", "detail": "Zushi OC6 sprint race", "place": "Ohana Hoe / Zushi"}},
      {"date": "10月", "name": "湘南パドリングチャレンジU19", "detail": "江ノ島OC6レース", "place": "SOCC／江ノ島東浜", "en": {"date": "Oct", "name": "Shonan Paddling Challenge U19", "detail": "Enoshima OC6 race", "place": "SOCC / Enoshima Higashihama"}},
      {"date": "10月", "name": "HUKILAU CHALLENGE", "detail": "茅ヶ崎OC6チャンピオンシップ", "place": "COCC／茅ヶ崎", "link": "hukilau.html", "en": {"date": "Oct", "name": "HUKILAU CHALLENGE", "detail": "Chigasaki OC6 Championship", "place": "COCC / Chigasaki"}},
      {"date": "12月", "name": "Christmas Race ＆ 忘年会", "place": "COCC／茅ヶ崎", "en": {"date": "Dec", "name": "Christmas Race & year-end party", "place": "COCC / Chigasaki"}}
    ]
  }
];
