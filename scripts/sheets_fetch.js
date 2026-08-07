const { google } = require("googleapis");

async function fetchArticles() {
  const creds = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT);

  const auth = new google.auth.GoogleAuth({
    credentials: creds,
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  });

  const sheets = google.sheets({ version: "v4", auth });

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.SHEET_ID,
    range: "articles!A:I", // id〜status まで
  });

  const rows = res.data.values;
  const header = rows[0];
  const articles = rows.slice(1).map(row => {
    const obj = {};
    header.forEach((key, i) => {
      obj[key] = row[i] || "";
    });
    return obj;
  });

  return articles;
}

module.exports = { fetchArticles };
