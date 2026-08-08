const { fetchArticles } = require("./sheets_fetch");
const { generatePost } = require("./generate_posts_core");
const { google } = require("googleapis");
const fs = require("fs");
const path = require("path");

// generated を TRUE に更新する
async function markGenerated(article) {
  const creds = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT);

  const auth = new google.auth.GoogleAuth({
    credentials: creds,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  const sheets = google.sheets({ version: "v4", auth });

  const articles = await fetchArticles();
  const index = articles.findIndex(a => a.id === article.id);

  if (index === -1) {
    console.error("記事が見つからない:", article.id);
    return;
  }

  const rowNumber = index + 2;

  await sheets.spreadsheets.values.update({
    spreadsheetId: process.env.SHEET_ID,
    range: `articles!I${rowNumber}`,   // generated カラム
    valueInputOption: "RAW",
    requestBody: { values: [["TRUE"]] }
  });

  console.log(`generated を TRUE に更新: ${article.id}`);
}

// modified を FALSE に戻す
async function clearModified(article) {
  const creds = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT);

  const auth = new google.auth.GoogleAuth({
    credentials: creds,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  const sheets = google.sheets({ version: "v4", auth });

  const articles = await fetchArticles();
  const index = articles.findIndex(a => a.id === article.id);

  if (index === -1) {
    console.error("記事が見つからない:", article.id);
    return;
  }

  const rowNumber = index + 2;

  await sheets.spreadsheets.values.update({
    spreadsheetId: process.env.SHEET_ID,
    range: `articles!J${rowNumber}`,   // modified カラム
    valueInputOption: "RAW",
    requestBody: { values: [["FALSE"]] }
  });

  console.log(`modified を FALSE に更新: ${article.id}`);
}

// メイン処理
async function main() {
  const articles = await fetchArticles();

  for (const article of articles) {
    const statusValue = String(article.status).toUpperCase().trim();
    const generatedValue = String(article.generated).toUpperCase().trim();
    const modifiedValue = String(article.modified).toUpperCase().trim();

    // OPEN の記事だけ生成対象
    if (statusValue !== "OPEN") {
      console.log(`Skip (status not OPEN): ${article.id}`);
      continue;
    }

    const fileName = `${article.date}_COCC_WEB_${article.id}.html`;
    const filePath = path.join(process.cwd(), "posts", fileName);

    // modified = TRUE → 既存HTMLを削除して再生成
    if (modifiedValue === "TRUE") {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log(`Deleted old HTML: ${fileName}`);
      }

      await generatePost(article);
      await markGenerated(article);
      await clearModified(article);
      continue;
    }

    // generated = TRUE → 既に生成済みなのでスキップ
    if (generatedValue === "TRUE") {
      console.log(`Skip (already generated): ${article.id}`);
      continue;
    }

    // 新規生成
    await generatePost(article);
    await markGenerated(article);
  }
}

main();
