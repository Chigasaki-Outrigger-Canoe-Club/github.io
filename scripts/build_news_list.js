const { fetchArticles } = require("./sheets_fetch");

// 「はい / いいえ」→ boolean に変換
function normalizeBool(value) {
  if (typeof value === "boolean") return value;
  if (!value) return false;
  return value.trim() === "はい";
}

async function buildNewsList() {
  const articles = await fetchArticles();

  // 公開する？ = はい AND 生成済？ = はい の記事だけ対象
  const filtered = articles.filter(a => {
    const status = normalizeBool(a.status);
    const generated = normalizeBool(a.generated);
    return status && generated;
  });

  // 日付で降順ソート
  filtered.sort((a, b) => b.date.localeCompare(a.date));

  const count = filtered.length;

  if (count === 0) {
    return `
      <li class="news-item">
        <span class="news-text">まだ記事はありません。</span>
      </li>
    `;
  }

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

module.exports = { buildNewsList };
