const fs = require("fs");
const path = require("path");
const { fetchArticles, categorySlug } = require("./sheets_fetch");

// サイトに載せる記事：「載せる」にチェックがあり、記事ページができているもの
function isListed(a) {
  if (!a.publish || !a.date || !a.title || !a.id) return false;
  const file = path.join(process.cwd(), "posts", `${a.date}_COCC_WEB_${a.id}.html`);
  return fs.existsSync(file);
}

async function buildNewsList() {
  const articles = await fetchArticles();
  const filtered = articles.filter(isListed);

  // 日付降順
  filtered.sort((a, b) => b.date.localeCompare(a.date));

  const count = filtered.length;

  if (count === 0) {
    return `
      <li class="news-item">
        <span class="news-text">まだ記事はありません。</span>
      </li>
    `;
  }

  // 最大5件まで
  const targetArticles = count < 5 ? filtered : filtered.slice(0, 5);

  return targetArticles.map((a, i) => renderNewsItem(a, i)).join("\n");
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

// スプレッドシートの「画像url(複数可)」から、最初の1枚の URL を取り出す
function firstImageUrl(imageUrls) {
  if (!imageUrls) return "";
  // 「https://〜」のような記入例は URL として扱わない（ドメイン名まで書かれているものだけ使う）
  const first = String(imageUrls).split(/[\s,、]+/).find(u => /^https?:\/\/[A-Za-z0-9.-]+\.[A-Za-z]{2,}(\/|$)/.test(u));
  return first || "";
}

// NEWS の1件分（画像つきカード）
function renderNewsItem(a, i) {
  const fileName = `${a.date}_COCC_WEB_${a.id}.html`;
  const url = `posts/${fileName}`;
  const fallback = DEFAULT_IMAGES[i % DEFAULT_IMAGES.length];
  const image = firstImageUrl(a.image_urls) || fallback;

  return `
      <li class="news-item">
        <a href="${url}">
          <span class="news-thumb"><img src="${escapeHtml(image)}" alt="" loading="lazy" onerror="this.onerror=null;this.src='${fallback}'"></span>
          <span class="news-body">
            <span class="news-date">${escapeHtml(a.date)}${a.category ? `<span class="news-cat news-cat--${categorySlug(a.category)}">${escapeHtml(a.category)}</span>` : ""}</span>
            <span class="news-text">${escapeHtml(a.title)}</span>
          </span>
        </a>
      </li>
    `;
}

async function updateIndex() {
  const newsListHtml = await buildNewsList();

  const indexPath = path.join(process.cwd(), "index.html");
  let indexHtml = fs.readFileSync(indexPath, "utf-8");

  // NEWS_LIST の部分を置き換え
  indexHtml = indexHtml.replace(
    /<ul class="news-right">[\s\S]*?<\/ul>/m,
    `<ul class="news-right">\n${newsListHtml}\n</ul>`
  );

  fs.writeFileSync(indexPath, indexHtml, "utf-8");
  console.log("index.html updated with latest NEWS_LIST");
}

updateIndex().catch(err => {
  console.error(err);
  process.exit(1);
});
