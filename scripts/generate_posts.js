const { fetchArticles } = require("./sheets_fetch");
const { generatePostCore } = require("./generate_posts_core");
const { google } = require("googleapis");
const fs = require("fs");
const path = require("path");

// 「はい / いいえ」→ boolean に変換
function normalizeBool(value) {
  if (typeof value === "boolean") return value;
  if (!value) return false;
  return value.trim() === "はい";
}

// generated を「はい」に更新する
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

  const rowNumber = index + 3; // 1行目:列名, 2行目:説明行 → +3

  await sheets.spreadsheets.values.update({
    spreadsheetId: process.env.SHEET_ID,
    range: `articles!H${rowNumber}`,   // 生成済？ の列（日本語化後）
    valueInputOption: "RAW",
    requestBody: { values: [["はい"]] }
  });

  console.log(`generated を「はい」に更新: ${article.id}`);
}

// modified を「いいえ」に戻す
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

  const rowNumber = index + 3;

  await sheets.spreadsheets.values.update({
    spreadsheetId: process.env.SHEET_ID,
    range: `articles!I${rowNumber}`,   // 修正する？ の列（日本語化後）
    valueInputOption: "RAW",
    requestBody: { values: [["いいえ"]] }
  });

  console.log(`modified を「いいえ」に更新: ${article.id}`);
}

// メイン処理
async function main() {
  const articles = await fetchArticles();

  for (const article of articles) {

    const status = normalizeBool(article.status);
    const generated = normalizeBool(article.generated);
    const modified = normalizeBool(article.modified);

    // 公開する？ が「はい」の記事だけ生成
    if (!status) {
      console.log(`Skip (公開しない): ${article.id}`);
      continue;
    }

    const fileName = `${article.date}_COCC_WEB_${article.id}.html`;
    const filePath = path.join(process.cwd(), "posts", fileName);

    // 修正あり → 再生成
    if (modified) {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log(`Deleted old HTML: ${fileName}`);
      }

      const result = await generatePostCore(article);
      if (result) {
        await markGenerated(result);
        await clearModified(result);
      }
      continue;
    }

    // 生成済み → スキップ
    if (generated) {
      console.log(`Skip (already generated): ${article.id}`);
      continue;
    }

    // 新規生成
    const result = await generatePostCore(article);
    if (result) {
      await markGenerated(result);
    }
  }
}

main();