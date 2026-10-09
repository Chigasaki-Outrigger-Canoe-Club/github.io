// articles シート → 記事カードの一覧
//
// - index.html   … NEWS（全カテゴリの新しい順、5 件）
// - news.html    … すべての記事（カテゴリで絞り込める）       <!-- CARDS_ALL -->
// - events.html  … 大会・イベント（6 件）                     <!-- CARDS_EVENT -->
// - kids.html    … KIDS（6 件）                               <!-- CARDS_KIDS -->
// - oshima.html / hukilau.html / hoaikane.html
//                … その大会の記事（3 件）                     <!-- CARDS_OSHIMA など -->
//
// <!-- 名前:START --> と <!-- 名前:END --> のあいだを、毎回作り直す。

const fs = require("fs");
const path = require("path");
const { fetchArticles, categorySlug, eventSlug, displayLabel, EVENT_CATEGORY } = require("./sheets_fetch");

const ROOT = process.cwd();

// サイトに載せる記事：「載せる」にチェックがあり、記事ページができているもの
function isListed(a) {
  if (!a.publish || !a.date || !a.title || !a.id) return false;
  return fs.existsSync(path.join(ROOT, "posts", postFile(a)));
}

function postFile(a) {
  return `${a.date}_COCC_WEB_${a.id}.html`;
}

// 記事に画像がないとき（または読み込めないとき）に使う写真。順番に割り当てる。
const DEFAULT_IMAGES = [
  "images/2_ABOUT/mc10_296.jpg",
  "images/1_HERO/pc_hayama_hoe1.jpg",
  "images/2_ABOUT/mc10_316.jpg",
  "images/1_HERO/pc_hayama_hoe2.jpg",
  "images/1_HERO/pc_mc10_272.jpg"
];

// HTML に入れても安全な文字にする
function escapeHtml(value) {
  return String(value == null ? "" : value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// 「トップ画像」から、最初の1枚の URL を取り出す
function firstImageUrl(imageUrls) {
  if (!imageUrls) return "";
  // 「https://〜」のような記入例は URL として扱わない（ドメイン名まで書かれているものだけ使う）
  const first = String(imageUrls).split(/[\s,、]+/).find(u => /^https?:\/\/[A-Za-z0-9.-]+\.[A-Za-z]{2,}(\/|$)/.test(u));
  return first || "";
}

// 日付とカテゴリのラベル
function metaHtml(a) {
  const slug = categorySlug(a.category);
  const label = displayLabel(a);
  const cat = label
    ? `<span class="news-cat news-cat--${slug}">${escapeHtml(label)}</span>`
    : "";
  return `<span class="news-date">${escapeHtml(a.date)}${cat}</span>`;
}

function thumb(a, i) {
  const fallback = DEFAULT_IMAGES[i % DEFAULT_IMAGES.length];
  const image = firstImageUrl(a.image_urls) || fallback;
  return `<img src="${escapeHtml(image)}" alt="" loading="lazy" onerror="this.onerror=null;this.src='${fallback}'">`;
}

// トップの NEWS の1件分
function renderNewsItem(a, i) {
  return `
      <li class="news-item">
        <a href="posts/${postFile(a)}">
          <span class="news-thumb">${thumb(a, i)}</span>
          <span class="news-body">
            ${metaHtml(a)}
            <span class="news-text">${escapeHtml(a.title)}</span>
          </span>
        </a>
      </li>
    `;
}

// 一覧ページ（news / events / kids）の1件分
function renderCard(a, i) {
  return `          <li class="post-card" data-cat="${categorySlug(a.category) || "none"}" data-event="${eventSlug(a.event) || "none"}">
            <a href="posts/${postFile(a)}">
              <span class="post-card-thumb">${thumb(a, i)}</span>
              <span class="post-card-body">
                ${metaHtml(a)}
                <span class="post-card-title">${escapeHtml(a.title)}</span>
              </span>
            </a>
          </li>`;
}

function renderCards(list, emptyText) {
  if (list.length === 0) {
    return `          <li class="post-cards-empty">${escapeHtml(emptyText)}</li>`;
  }
  return list.map(renderCard).join("\n");
}

// <!-- NAME:START --> と <!-- NAME:END --> のあいだを入れ替える
function replaceBlock(html, name, inner) {
  const re = new RegExp(`(<!-- ${name}:START -->)[\\s\\S]*?(<!-- ${name}:END -->)`);
  if (!re.test(html)) {
    console.warn(`目印 ${name} が見つからないため、飛ばしました`);
    return html;
  }
  return html.replace(re, `$1\n${inner}\n$2`);
}

function updateFile(file, edit) {
  const p = path.join(ROOT, file);
  if (!fs.existsSync(p)) {
    console.warn(`${file} が無いため、飛ばしました`);
    return;
  }
  const before = fs.readFileSync(p, "utf-8");
  const after = edit(before);
  if (after !== before) {
    fs.writeFileSync(p, after, "utf-8");
    console.log(`${file} を更新しました`);
  }
}

async function main() {
  const articles = (await fetchArticles()).filter(isListed);
  articles.sort((a, b) => b.date.localeCompare(a.date) || Number(b.id) - Number(a.id));
  const byCat = name => articles.filter(a => a.category === name);

  // トップの NEWS（5 件）
  const top = articles.slice(0, 5);
  const newsListHtml = top.length
    ? top.map(renderNewsItem).join("\n")
    : `
      <li class="news-item">
        <span class="news-text">まだ記事はありません。</span>
      </li>
    `;
  updateFile("index.html", html => html.replace(
    /<ul class="news-right">[\s\S]*?<\/ul>/m,
    `<ul class="news-right">\n${newsListHtml}\n</ul>`
  ));

  // news.html（すべて）
  updateFile("news.html", html =>
    replaceBlock(html, "CARDS_ALL", renderCards(articles, "まだ記事はありません。")));

  // events.html（大会・イベント）
  updateFile("events.html", html =>
    replaceBlock(html, "CARDS_EVENT", renderCards(byCat(EVENT_CATEGORY).slice(0, 6), "大会・イベントの記事は、まだありません。")));

  // kids.html（KIDS）
  updateFile("kids.html", html =>
    replaceBlock(html, "CARDS_KIDS", renderCards(byCat("KIDS").slice(0, 6), "KIDS の記事は、まだありません。")));

  // 各大会のページ（その大会の記事 3 件）
  const races = [
    ["oshima.html", "CARDS_OSHIMA", "大島クロッシング"],
    ["hukilau.html", "CARDS_HUKILAU", "Hukilau Challenge"],
    ["hoaikane.html", "CARDS_HOAIKANE", "Ho'aikane"]
  ];
  for (const [file, mark, name] of races) {
    updateFile(file, html =>
      replaceBlock(html, mark, renderCards(articles.filter(a => a.event === name).slice(0, 3), "新しいお知らせは、まだありません。")));
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
