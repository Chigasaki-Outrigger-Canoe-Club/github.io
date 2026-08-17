const { fetchArticles } = require("./sheets_fetch");
const fs = require("fs");
const path = require("path");

async function buildNewsList() {
  const articles = await fetchArticles();

  // OPEN & generated=TRUE の記事だけ対象
  const filtered = articles.filter(a =>
    String(a.status).trim().toUpperCase() === "OPEN" &&
    String(a.generated).trim().toUpperCase() === "TRUE"
  );

  // 日付で降順ソート（新しい順）
  filtered.sort((a, b) => b.date.localeCompare(a.date));

  // 最新5件だけ
  const latest5 = filtered.slice(0, 5);

  // `<li>` を生成
  const listItems = latest5.map(a => {
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

  // コンソールに出す（まずは確認用）
  console.log("=== NEWS_LIST HTML ===");
  console.log(listItems);

  return listItems;
}

buildNewsList();
