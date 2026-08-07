import { google } from "googleapis";

async function main() {
  // GitHub Secrets に保存した JSON を読み込む
  const creds = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT);

  // 認証
  const auth = new google.auth.GoogleAuth({
    credentials: creds,
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  });

  const sheets = google.sheets({ version: "v4", auth });

  // Google Sheets のデータ取得
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.SHEET_ID,  // GitHub Secrets に入れる
    range: "articles!A:E",                // シート名＋範囲
  });

  console.log("記事一覧:", res.data.values);
}

main();
