const { google } = require("googleapis");

async function main() {
  const creds = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT);

  const auth = new google.auth.GoogleAuth({
    credentials: creds,
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  });

  const sheets = google.sheets({ version: "v4", auth });

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.SHEET_ID,
    range: "articles!A:J",   // ← 列が増えたので修正
  });

  const rows = res.data.values;

  // 1行目：列名
  // 2行目：説明行 → スキップ
  const dataRows = rows.slice(2);

  console.log("記事一覧:", dataRows);
}

main();
