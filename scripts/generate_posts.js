const { fetchArticles } = require("./sheets_fetch");
const { generatePost } = require("./generate_posts_core");
const { google } = require("googleapis");

// generated を TRUE に更新する
async function markGenerated(article) {
  const creds = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT);

  const auth = new google.auth.GoogleAuth({
    credentials: creds,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  const sheets = google.sheets({ version: "v4", auth });

  // 記事一覧を再取得して行番号を特定
  const articles = await fetchArticles();
  const index = articles.findIndex(a => a.id === article.id);

  if (index === -1) {
    console.error("記事が見つからない:", article.id);
    return;
  }

  // 1行目はヘッダーなので +2
  const rowNumber = index + 2;

  await sheets.spreadsheets.values.update({
    spreadsheetId: process.env.SHEET_ID,
    range: `articles!J${rowNumber}`, // J列 = generated
    valueInputOption: "RAW",
    requestBody: { values: [["TRUE"]] }
  });

  console.log(`generated を TRUE に更新: ${article.id}`);
}

// メイン処理（1つだけ）
async function main() {
  const articles = await fetchArticles();

  for (const article of articles) {
    if (article.status !== "TRUE") {
      console.log(`Skip draft: ${article.id}`);
      continue;
    }

    await generatePost(article);

    // HTML生成後に generated を TRUE にする
    await markGenerated(article);
  }
}

main();
