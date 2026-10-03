const fs = require("fs");
const path = require("path");
const { fetchArticles } = require("./sheets_fetch");

// 「はい / いいえ」→ boolean に変換
function normalizeBool(value) {
  if (typeof value === "boolean") return value;
  if (!value) return false;
  return value.trim() === "はい";
}

async function buildNewsList() {
  const articles = await fetchArticles();

  // 公開する？ = はい AND 生成済？ = はい の記事だけ表示
  const filtered = articles.filter(a => {
    const status = normalizeBool(a.status);
    const generated = normalizeBool(a.generated);
    return status;
  });

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
            <span class="news-date">${escapeHtml(a.date)}</span>
            <span class="news-text">${escapeHtml(a.title)}</span>
          </span>
        </a>
      </li>
    `;
}

async function updateIndex() {
  const newsListHtml = await buildNewsList();

// ★ ここで記事数を取得して index.html に埋め込む
  const articles = await fetchArticles();

  // ① status=true の件数
  const countStatus = articles.filter(a => normalizeBool(a.status)).length;

  // ② status=true AND generated=true の件数
  const countStatusGenerated = articles.filter(a =>
    normalizeBool(a.status) && normalizeBool(a.generated)
  ).length;

  console.log("FETCHED:", articles);

  // デバッグ用の件数表示（公開ページに出さないためコメントアウト）
  // const debugCountHtml = `
  //   <div class="debug-count">
  //     status=true：${countStatus} 件<br>
  //     status=true AND generated=true：${countStatusGenerated} 件
  //   </div>
  // `;

  const indexPath = path.join(process.cwd(), "index.html");
  let indexHtml = fs.readFileSync(indexPath, "utf-8");

  // NEWS_LIST の部分を置き換え
  indexHtml = indexHtml.replace(
    /<ul class="news-right">[\s\S]*?<\/ul>/m,
    `<ul class="news-right">\n${newsListHtml}\n</ul>`
    // デバッグ表示を戻す場合: `<ul class="news-right">\n${newsListHtml}\n</ul>\n${debugCountHtml}`
  );

  fs.writeFileSync(indexPath, indexHtml, "utf-8");
  console.log("index.html updated with latest NEWS_LIST");
}

updateIndex();
