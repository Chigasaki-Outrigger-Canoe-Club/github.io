const { google } = require("googleapis");

// articles シートの列名 → 内部キー
// 列の順番は自由。列名で探すので、並べ替えても動く。
const COLUMN_MAP = {
  "載せる": "publish",
  "日付": "date",
  "記事タイトル": "title",
  "記事（Google Doc）": "body_doc_url",
  "トップ画像（任意）": "image_urls",
  "カテゴリ": "category",
  "カテゴリ（任意）": "category",
  "状態（自動）": "state",
  "メモ（サイトに出ない）": "memo",
  "記事id（自動）": "id",
  "版（自動）": "version",

  // 古い列名（切り替え前のシートでも読めるように残す）
  "記事id": "id",
  "作成日": "date",
  "画像url(複数可)": "image_urls",
  "本文URL(Google Doc)": "body_doc_url",
  "notes": "category",
  "公開する?": "publish",
  "公開する？": "publish"
};

// チェックボックス（TRUE）や「はい」を true にする
function normalizeBool(value) {
  if (typeof value === "boolean") return value;
  if (!value) return false;
  const v = String(value).trim().toLowerCase();
  return ["true", "はい", "yes", "1", "✓", "☑"].includes(v);
}

// カテゴリ（シートのプルダウンと同じ並び）。slug はページの絞り込みに使う。
const CATEGORIES = [
  { name: "お知らせ", slug: "info" },
  { name: "大会・イベント情報", slug: "event" },
  { name: "イベントレポート", slug: "report" },
  { name: "KIDS", slug: "kids" }
];

// 書き方の揺れを吸収して、決まったカテゴリ名にする（当てはまらなければ空）
function normalizeCategory(value) {
  const v = String(value || "").trim().replace(/\s+/g, "");
  if (!v || ["無し", "なし", "-", "—"].includes(v)) return "";
  const hit = CATEGORIES.find(c => c.name.replace(/\s+/g, "") === v || c.slug === v.toLowerCase());
  if (hit) return hit.name;
  if (/kids|キッズ/i.test(v)) return "KIDS";
  if (/レポート|報告/.test(v)) return "イベントレポート";
  if (/大会|イベント/.test(v)) return "大会・イベント情報";
  return "";
}

function categorySlug(name) {
  const hit = CATEGORIES.find(c => c.name === name);
  return hit ? hit.slug : "";
}

// 2026/8/7・2026-08-07・2026年8月7日 → 2026-08-07（読めなければ空）
function normalizeDate(value) {
  const m = String(value || "").trim().match(/^(\d{4})\D+(\d{1,2})\D+(\d{1,2})/);
  if (!m) return "";
  return `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`;
}

// 0 → A, 1 → B …
function columnLetter(index) {
  let s = "";
  let n = index + 1;
  while (n > 0) {
    const r = (n - 1) % 26;
    s = String.fromCharCode(65 + r) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

function sheetsClient(write) {
  const auth = new google.auth.GoogleAuth({
    credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT),
    scopes: [write
      ? "https://www.googleapis.com/auth/spreadsheets"
      : "https://www.googleapis.com/auth/spreadsheets.readonly"]
  });
  return google.sheets({ version: "v4", auth });
}

// シートを読み、記事の一覧と「どの列が何か」を返す。
// 空の行は飛ばすが、rowNumber はシート上の本当の行番号を持つ。
async function readArticleSheet() {
  const sheets = sheetsClient(false);
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.SHEET_ID,
    range: "articles!A:Z"
  });

  const rows = res.data.values || [];
  if (rows.length === 0) throw new Error("articles シートが空です");

  const header = rows[0].map(h => String(h || "").trim());
  const columns = {};
  header.forEach((name, i) => {
    const key = COLUMN_MAP[name];
    if (key && columns[key] === undefined) columns[key] = i;
  });

  const articles = [];
  rows.slice(1).forEach((row, i) => {
    const obj = { rowNumber: i + 2 };
    for (const [key, col] of Object.entries(columns)) {
      obj[key] = String(row[col] == null ? "" : row[col]).trim();
    }
    // 何も書かれていない行は飛ばす
    if (!obj.title && !obj.body_doc_url) return;
    obj.publish = normalizeBool(obj.publish);
    obj.date = normalizeDate(obj.date);
    obj.category = normalizeCategory(obj.category);
    articles.push(obj);
  });

  return { header, columns, articles };
}

// 今までの呼び出し方（記事の配列だけ）も残す
async function fetchArticles() {
  return (await readArticleSheet()).articles;
}

module.exports = {
  fetchArticles,
  readArticleSheet,
  sheetsClient,
  columnLetter,
  normalizeBool,
  normalizeDate,
  normalizeCategory,
  categorySlug,
  CATEGORIES
};
