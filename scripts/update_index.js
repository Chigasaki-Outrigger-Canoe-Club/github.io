const fs = require("fs");
const path = require("path");
const { fetchArticles } = require("./sheets_fetch");

async function buildNewsList() {
  const articles = await fetchArticles();

  const filtered = articles.filter(a =>
    String(a.status).trim().toUpperCase() === "OPEN" &&
    String(a.generated).trim().toUpperCase() === "TRUE"
  );

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

async function updateIndex() {
  const newsListHtml = await buildNewsList();

  const indexPath = path.join(process.cwd(), "index.html");
  let indexHtml = fs.readFileSync(indexPath, "utf-8");

  indexHtml = indexHtml.replace(
    /<ul class="news-right">[\s\S]*?<\/ul>/,
    `<ul class="news-right">\n${newsListHtml}\n</ul>`
  );

  fs.writeFileSync(indexPath, indexHtml, "utf-8");
  console.log("index.html updated with latest NEWS_LIST");
}

updateIndex();
