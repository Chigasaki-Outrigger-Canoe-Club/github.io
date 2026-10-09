# 大会・イベントのページを、毎年保存する

対象：大島クロッシング（`oshima.html`）、Hukilau Challenge（`hukilau.html`）、Ho'aikane（`hoaikane.html`）

## 考え方

- `hukilau.html` などは、いつも「次の開催」のページとして使い続ける。
- 開催が終わったら、そのときのページを **`archive/年/` のフォルダにコピーして保存** する（例：`archive/2027/hukilau.html`）。
- 保存したページは、元のページの「これまでの大会（これまでの開催）」に自動で並ぶ。
- 保存したページは固定される（スプレッドシートを直しても書き換わらない）。上に「○年の記録です」の帯が付く。

## 1 年の流れ

| いつ | やること | どこで |
|---|---|---|
| 開催の前 | 日程・要項・参加費などを直す | スプレッドシートの `content` シート（ページの文章）→ サイトに反映する |
| 開催の前〜当日 | 募集・集合時間の変更などを知らせる | `articles` シートで記事を書く（カテゴリ「大会・イベント」、大会・イベント名を選ぶ） |
| 開催のあと | 結果の記事を書く | `articles` シート |
| 結果の記事を出したあと | **ページを保存する**（下の手順） | GitHub |
| 保存したあと | 次の年の内容に直していく | スプレッドシート |

## ページを保存する（ボタンで）

1. GitHub でリポジトリを開く：https://github.com/Chigasaki-Outrigger-Canoe-Club/github.io
2. 上の「Actions」を押す。
3. 左の一覧から「大会・イベントのページを保存」を選ぶ。
4. 右の「Run workflow」を押す。
5. 「保存するページ」で hukilau / hoaikane / oshima を選ぶ。
6. 「何年の記録として残すか」に年を 4 けたで入れる（例：2027）。
7. 緑の「Run workflow」を押す。1 分ほどで終わり、数分でサイトに出る。

- 日本語版と英語版の両方が保存される（`archive/2027/hukilau.html` と `archive/2027/en/hukilau.html`）。
- 同じ年をもう一度保存しようとすると、止まる（上書きはしない）。作り直したいときは、先にその年のファイルを消す（下の「保存したページを消す」）。

## ボタンが使えないとき（手でコピーする）

GitHub の画面だけでできる。

1. GitHub で `hukilau.html` を開き、右上の「Raw」の横のコピーのボタン（Copy raw file）を押す。
2. リポジトリのトップに戻り、「Add file」→「Create new file」。
3. 名前に `archive/2027/hukilau.html` と入れ（`/` を打つとフォルダになる）、中身に貼り付けて「Commit changes」。
4. 英語版も残すときは、`en/hukilau.html` を同じように `archive/2027/en/hukilau.html` として作る。
5. スプレッドシートから「サイトに反映する」を行う。→ 固定と、一覧への追加が自動で行われる。

置き場所は必ず **`archive/年4けた/ページ名.html`**（例：`archive/2027/oshima.html`、`archive/2028/hoaikane.html`）。英語版は `archive/年/en/ページ名.html`。この形なら、保存版として扱われる。
コピーした直後は CSS や画像の場所が合っていないが、反映すると自動で直る。

## 保存したページを消す

1. GitHub でそのファイル（例：`archive/2027/hukilau.html`）を開く。
2. 右上の「…」→「Delete file」→「Commit changes」。英語版（`archive/2027/en/` の中）も同じ。
3. スプレッドシートから「サイトに反映する」を行う。→ 一覧から消える。

## 以前の外部サイト（2024〜2026 年など）のリンク

`hukilau.html` の「これまでの大会」の中で、`<!-- ARCHIVE:END -->` より下に書いてある。
増やす・直すときは、GitHub で `hukilau.html` を開き、鉛筆（Edit）で次の 1 行をまねて足す。

```html
          <li><a href="https://（サイトのURL）/" target="_blank" rel="noopener">2026年大会</a></li>
```

`<!-- ARCHIVE:START -->` と `<!-- ARCHIVE:END -->` のあいだは自動で作り直されるので、手で書かない。

## しくみ（直す人向け）

- `scripts/update_archives.js`
  - `node scripts/update_archives.js hukilau 2027`：コピーして保存版を作り、場所を直して固定し、一覧を作り直す
  - `node scripts/update_archives.js`：固定と一覧の作り直しだけ（「Generate Posts」の中で毎回動く）
- `.github/workflows/archive-race-page.yml`：上のボタン
- 保存版は `scripts/update_content.js`（スプレッドシートの文章）と `scripts/update_index.js`（記事カード）の対象外。
