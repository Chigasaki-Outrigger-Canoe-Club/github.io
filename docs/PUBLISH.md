# サイトの公開のしかた

## しくみ

- GitHub の中は、整理しやすいようにフォルダで分けている（`html/sites/`、`html/posts/` など。`docs/FOLDERS.md`）。
- 公開するときは、GitHub Actions の「サイトを公開」が自動で動き、見る人向けの形に組み立て直す。
  - フォルダ名と「.html」を外す：`html/sites/kids.html` → `…/kids`
  - ページの中のリンク・画像の場所も、自動で書き直す。
  - `docs/`・`scripts/` などは公開しない。
- 組み立てるプログラムは `scripts/build_site.js`。

## いつ動くか（手で動かす必要はない）

- GitHub でファイルを直して保存したとき（main への保存すべて）
- スプレッドシートの「サイトに反映する」で、記事の生成（Generate Posts）が終わったとき
- 「大会・イベントのページを保存」が終わったとき

反映まで 1〜2 分かかる。Actions 画面の「サイトを公開」に緑のチェックが付けば公開済み。
赤い × のときは公開されていない（サイトは前の状態のまま表示される）。Actions →「サイトを公開」→「Run workflow」でやり直せる。

## 最初に 1 回だけの設定

GitHub のリポジトリ → Settings → Pages → 「Build and deployment」の Source を **GitHub Actions** にする。

## 独自ドメインを取ったら

1. ドメインの会社の管理画面で、DNS を GitHub Pages に向ける（GitHub の説明「Managing a custom domain for your GitHub Pages site」のとおり）。
2. GitHub → Settings → Pages → Custom domain にドメインを入れて Save。「Enforce HTTPS」にチェック。
3. `scripts/build_site.js` の `PUBLIC_URL` を新しい住所にする（例：`"https://cocc.jp/"`）。SNS で共有したときの URL に使われる。
4. ドメインにすると URL の `/github.io/` の部分がなくなる（例：`https://cocc.jp/kids`）。
