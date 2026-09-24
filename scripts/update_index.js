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

  return targetArticles.map(a => {
    const fileName = `${a.date}_COCC_WEB_${a.id}.html`;
    const url = `posts/${fileName}`;

    return `
      <li class="news-item">
        <a href="${url}">
          <span class="news-date">${a.date}</span>
          <span class="news-text">${a.title}</span>
        </a>
      </li>
    `;
  }).join("\n");
}

async function updateIndex() {
  const newsListHtml = await buildNewsList();

  // ★ ここで記事数を取得して index.html に埋め込む
  const articles = await fetchArticles();
  const filtered = articles.filter(a => normalizeBool(a.status));
  const debugCountHtml = `<div class="debug-count">記事数（status=true）：${filtered.length}</div>`;

  const indexPath = path.join(process.cwd(), "index.html");
  let indexHtml = fs.readFileSync(indexPath, "utf-8");

  // NEWS_LIST の部分を置き換え
  indexHtml = indexHtml.replace(
    /<ul class="news-right">[\s\S]*?<\/ul>/m,
    `<ul class="news-right">\n${newsListHtml}\n</ul>\n${debugCountHtml}`
  );


  fs.writeFileSync(indexPath, indexHtml, "utf-8");
  console.log("index.html updated with latest NEWS_LIST");
}

updateIndex();
