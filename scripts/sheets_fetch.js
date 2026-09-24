const { google } = require("googleapis");

// 日本語 → 内部キー のマッピング
const COLUMN_MAP = {
  "記事id": "id",
  "記事タイトル": "title",
  "作成日": "date",
  "画像url(複数可)": "image_urls",
  "本文URL(Google Doc)": "body_doc_url",
  "notes": "category",
  "公開する?": "status",
  "生成済?": "generated",
  "修正する?": "modified"
};

// 「はい / いいえ」→ true / false
function normalizeBool(value) {
  if (typeof value === "boolean") return value;
  if (!value) return false;

  const v = String(value).trim();
  return ["はい", "true", "TRUE", "yes", "YES"].includes(v);
}

async function fetchArticles() {
  const creds = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT);

  const auth = new google.auth.GoogleAuth({
    credentials: creds,
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  });

  const sheets = google.sheets({ version: "v4", auth });

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.SHEET_ID,
    range: "articles!A:J",
  });

  const rows = res.data.values;

  // 1行目：列名
  const header = rows[0];

  // 2行目：説明行 → スキップ
  const dataRows = rows.slice(2);

  const articles = dataRows.map(row => {
    const obj = {};

    header.forEach((colName, i) => {
      const internalKey = COLUMN_MAP[colName];

      if (!internalKey) return; // マッピングされていない列は無視

      let value = row[i] || "";

      // はい/いいえ → true/false に変換する列
      if (["status", "generated", "modified"].includes(internalKey)) {
        value = normalizeBool(value);
      }

      obj[internalKey] = value;
    });

    return obj;
  });

  return articles;
}

module.exports = { fetchArticles };