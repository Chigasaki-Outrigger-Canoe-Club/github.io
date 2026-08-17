const { fetchArticles } = require("./sheets_fetch");
const fs = require("fs");
const path = require("path");

async function main() {
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

  console.log("最新5件:");
  latest5.forEach(a => {
    console.log(`${a.date} | ${a.title} | ${a.id}`);
  });
}

main();
