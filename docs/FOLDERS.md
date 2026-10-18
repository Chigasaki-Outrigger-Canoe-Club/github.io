# フォルダとファイルの決まり

決まりは 3 つ。

- **ページ（HTML）は `html/` の中**。見た目（CSS）は `html/css/`、動き（JS）は `html/js/`。
- **サイトの写真は `images/sites/ページ名/`**（英語の大文字）に、**WebP** で置く。いくつかのページで使う写真は `COMMON`。
- **年ごとに増えるもの**は「種類 → 年（1月〜12月）」の順でフォルダに分ける。

## 全体

```
github.io/
├─ index.html                 転送だけ（…/github.io/ を開くと html/sites/index.html へ移る）。消さない
├─ site.webmanifest           スマホのホーム画面に追加したときの設定
│
├─ html/
│   ├─ sites/                 ページ本体（日本語）：index.html（トップ）, about.html, events.html …
│   │   └─ en/                英語版のページ（ファイル名は日本語版と同じ）
│   ├─ posts/                 ★年ごと：記事（スプレッドシートの articles から自動で作る）
│   ├─ archive/               ★年ごと：大会・イベントのページの保存版（作ったときにできる）
│   ├─ css/                   style.css（トップ）, nav.css, sub.css（サブページ）, theme.css（色・書体）
│   └─ js/                    script.js（トップ）, sub.js（サブページと記事）
│
├─ images/
│   ├─ sites/                 サイトの写真（人が入れる）。下を参照
│   └─ posts/                 ★年ごと：記事の写真（自動で作る）
│
├─ data/                      年間スケジュールのデータ（自動で作る）
├─ scripts/                   自動で動くプログラム
├─ docs/                      手順書（このファイルもここ）
└─ .github/workflows/         GitHub のボタン・自動処理
```

ページの URL は `…/github.io/html/sites/about.html` のようになる（トップは `…/github.io/` のままで開ける）。

## サイトの写真：`images/sites/`

| フォルダ | 使うページ |
|---|---|
| `COMMON/` | いくつかのページで使う写真（ヘッダーのロゴ、トップと各ページの大きな写真など） |
| `COMMON/icons/` | アイコン（ブラウザのタブ・ホーム画面）。PNG / ICO のまま |
| `COMMON/ogp.png` | SNS で共有したときに出る画像。PNG のまま |
| `TOP/` | トップページ（`html/sites/index.html`） |
| `ABOUT/` `FOR_BEGINNERS/` `MEMBERSHIP/` `SAFETY/` `KIDS/` `EVENTS/` `CONTACT/` `FAQ/` `NEWS/` | それぞれのページ（使う写真があるときだけフォルダがある） |
| `OSHIMA/` `HUKILAU/` `HOAIKANE/` | 大会のページ。中の `gallery/` に写真を入れると「ギャラリー」に並ぶ（ファイル名の順。01_ 02_ … で決める） |

- 写真は **WebP** で置く。ギャラリーだけは JPG・PNG を入れても、「サイトに反映する」で自動で WebP（横 1600px まで）に変わる。
- ほかのフォルダに JPG・PNG を足すときは、WebP に変えてから入れる（Google の Squoosh など）。横幅の目安：PC の大きな写真 1920px、スマホ 1080px、そのほか 1600px。
- ファイル名は英数字と `_` だけにする（例：`oshima_crossing.webp`）。
- 使わなくなった写真は消す（HTML の中でファイル名を検索して、出てこなければ使っていない）。

## ★ 年ごとのフォルダ

### 記事：`html/posts/年/`

```
html/posts/2026/2026-08-07_1_8月の練習会レポート.html
                 ^日付      ^記事id ^タイトル
```

- 年は記事の「日付」の年。日付やタイトルを変えると、ファイル名も自動で変わる（記事id で同じ記事と見分ける）。
- 手で作ったり消したりしない。スプレッドシートの「載せる」で出し入れする。

### 記事の写真：`images/posts/年/記事と同じ名前/`

```
images/posts/2026/2026-08-07_1_8月の練習会レポート/01.webp
                                                   02.webp
```

- Google Doc に貼った写真を、自動で縮めてここに置く。番号は Doc の中の順番。
- 記事を消すと、写真のフォルダも一緒に消える。

### 大会・イベントの保存版：`html/archive/年/`

```
html/archive/2027/hukilau.html
html/archive/2027/en/hukilau.html
```

- 作り方は `docs/RACE_ARCHIVE.md`。

## 自動で作られるもの（手で直さない）

| 場所 | 作るもの | 元になるもの |
|---|---|---|
| `html/posts/`、`images/posts/` | 記事と写真 | articles シート＋Google Doc |
| `html/sites/` の記事カード（トップの NEWS、news.html など） | カードの一覧 | articles シート |
| `data/schedule.js` | 年間スケジュール | schedule シート |
| 各ページの `data-cms` の付いた文章 | ページの文章 | 基本情報・FAQ・content シート |
| 大会ページのギャラリー | 写真の一覧 | `images/sites/大会名/gallery/` |
| `html/archive/` の保存版の固定と、一覧 | 保存版 | 「大会・イベントのページを保存」ボタン |
