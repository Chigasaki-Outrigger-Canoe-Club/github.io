// articles シート → 記事カードの一覧
//
// - index.html   … NEWS（全カテゴリの新しい順、5 件）
// - news.html    … すべての記事（カテゴリで絞り込める）       <!-- CARDS_ALL -->
// - events.html  … 大会とイベント（12 件）                     <!-- CARDS_EVENT -->
// - kids.html    … KIDS（6 件）                               <!-- CARDS_KIDS -->
// - overseas/index.html … 海外レースの挑戦記                <!-- CARDS_OVERSEAS -->
//
// <!-- 名前:START --> と <!-- 名前:END --> のあいだを、毎回作り直す。

const fs = require("fs");
const path = require("path");
const { postRelPath } = require("./post_paths");
const { rulesFor } = require("./post_photos");
const { fetchArticles, categorySlug, eventSlug, displayLabel, EVENTS_PAGE_CATEGORIES } = require("./sheets_fetch");

const ROOT = process.cwd();

// サイトに載せる記事：「載せる」にチェックがあり、記事ページができているもの
function isListed(a) {
  if (!a.publish || !a.date || !a.title || !a.id) return false;
  return fs.existsSync(path.join(ROOT, "posts", postRelPath(a)));
}

function postFile(a) {
  return postRelPath(a);
}

// 記事に画像がないとき（または読み込めないとき）に使う写真。順番に割り当てる。
const DEFAULT_IMAGES = [
  "images/site/about/mc10_296.jpg",
  "images/site/hero/pc_hayama_hoe1.jpg",
  "images/site/about/mc10_316.jpg",
  "images/site/hero/pc_hayama_hoe2.jpg",
  "images/site/hero/pc_mc10_272.jpg"
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

// Doc に貼った最初の写真（images/posts/年/記事の名前/01.webp）。なければ空
function docCover(a) {
  const rel = `images/posts/${postRelPath(a).replace(/\.html$/, "")}/01.webp`;
  if (fs.existsSync(path.join(ROOT, rel))) return encodeURI(rel);
  const extra = (rulesFor(a.id)[0] || {}).photo;               // git に置いた写真（data/post_photos.json）
  return extra && fs.existsSync(path.join(ROOT, extra)) ? encodeURI(extra) : "";
}

function thumb(a, i) {
  const fallback = DEFAULT_IMAGES[i % DEFAULT_IMAGES.length];
  const image = firstImageUrl(a.image_urls) || docCover(a) || fallback;
  return `<img src="${escapeHtml(image)}" alt="" loading="lazy" onerror="this.onerror=null;this.src='${fallback}'">`;
}

// トップの NEWS の1件分
function renderNewsItem(a, i) {
  return `
      <li class="news-item">
        <a href="${encodeURI("posts/" + postFile(a))}">
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
            <a href="${encodeURI("posts/" + postFile(a))}">
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

// 挑戦記のカードに出す説明：記事のリード文（Doc の「サブタイトル」）。なければ最初の段落を短くしたもの
function summaryOf(a) {
  const file = path.join(ROOT, "posts", postRelPath(a));
  if (!fs.existsSync(file)) return "";
  const html = fs.readFileSync(file, "utf-8");
  const body = html.split('<div class="post-body">')[1] || "";
  const m = body.match(/<p class="lead[^"]*">([\s\S]*?)<\/p>/) || body.match(/<p[^>]*>([\s\S]*?)<\/p>/);
  const text = m ? m[1].replace(/<br>/g, " ").replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/\s+/g, " ").trim() : "";
  return text.length > 90 ? text.slice(0, 88) + "…" : text;
}

// 海外レース挑戦記のページ（overseas/index.html）の 1 件分。1 つ下の階層なので ../ を付ける
function renderOverseasCard(a) {
  const summary = summaryOf(a);
  return `  <li class="card"><span class="card-date">${escapeHtml(a.date.replace(/-/g, "."))}</span><span class="card-title">${escapeHtml(a.title)}</span>${summary ? `<p>${escapeHtml(summary)}</p>` : ""}<p class="card-link"><a class="btn" href="${encodeURI("../posts/" + postFile(a))}">挑戦記を読む</a></p></li>`;
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
    replaceBlock(html, "CARDS_EVENT", renderCards(articles.filter(a => EVENTS_PAGE_CATEGORIES.includes(a.category)).slice(0, 12), "大会・イベントの記事は、まだありません。")));

  // kids.html（KIDS）
  updateFile("kids.html", html =>
    replaceBlock(html, "CARDS_KIDS", renderCards(byCat("KIDS").slice(0, 6), "KIDS の記事は、まだありません。")));

  // 海外レース挑戦記（overseas/index.html。1 つ下の階層なので、場所の頭に ../ を付ける）
  const overseas = articles.filter(a => a.event === "海外レース");
  updateFile("overseas/index.html", html =>
    replaceBlock(html, "CARDS_OVERSEAS", overseas.length
      ? overseas.map(renderOverseasCard).join("\n")
      : `  <li class="card"><p>挑戦記は、まだありません。</p></li>`));
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
