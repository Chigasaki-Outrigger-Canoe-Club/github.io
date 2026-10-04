// =========================================================
// update_schedule.js
// スプレッドシートの「schedule」シートを読んで、
// 年間スケジュールのデータ（data/schedule.js）を作り直す。
//
// ・シートがまだ無いとき、読めないとき、使える行が 1 行も無いときは、
//   何も変えずに終わる（今の data/schedule.js をそのまま使う）。
// ・形がおかしい行は飛ばして、ログに理由を出す。
// =========================================================
const fs = require("fs");
const path = require("path");

const SHEET_RANGE = "schedule!A:M";
const OUT_PATH = path.join(process.cwd(), "data", "schedule.js");

// シートの列名 → 内部の名前
const COLUMN_MAP = {
  "年": "year",
  "日付": "date",
  "日付の補足": "note",
  "イベント名": "name",
  "補足": "detail",
  "主催・開催地": "place",
  "リンク": "link",
  "仮の年?": "provisional",
  "英語：日付": "en_date",
  "英語：日付の補足": "en_note",
  "英語：イベント名": "en_name",
  "英語：補足": "en_detail",
  "英語：主催・開催地": "en_place"
};

function isYes(value) {
  return ["はい", "true", "TRUE", "yes", "YES", "○", "〇"].includes(String(value || "").trim());
}

// リンクは、サイト内のページ名（例 hukilau.html）だけを受け付ける
function safeLink(value) {
  const v = String(value || "").trim();
  return /^[A-Za-z0-9_-]+\.html(#[A-Za-z0-9_-]+)?$/.test(v) ? v : "";
}

// シートの行（1 行目は列名）から、年ごとのデータを組み立てる
function buildYears(rows) {
  const warnings = [];
  if (!rows || rows.length < 2) return { years: [], warnings: ["シートに行がありません。"] };

  const header = rows[0].map(h => String(h || "").trim());
  const missing = ["年", "日付", "イベント名"].filter(h => !header.includes(h));
  if (missing.length) return { years: [], warnings: ["必要な列がありません: " + missing.join("、")] };

  const byYear = new Map();
  rows.slice(1).forEach((row, i) => {
    const line = i + 2; // シート上の行番号
    const r = {};
    header.forEach((h, c) => { const k = COLUMN_MAP[h]; if (k) r[k] = String(row[c] == null ? "" : row[c]).trim(); });

    if (!/^\d{4}$/.test(r.year || "")) {
      // 説明行や空行は、年が 4 けたの数字でないので自然に飛ばされる
      // 2 行目の説明（「（西暦4けた）」のようにかっこで始まる）は、注意を出さずに飛ばす
      if (!/^[（(]/.test(r.year || "") && Object.values(r).some(v => v)) warnings.push(`${line} 行目: 「年」が 4 けたの数字ではないので飛ばしました。`);
      return;
    }
    const year = Number(r.year);
    if (!byYear.has(year)) byYear.set(year, { year, provisional: false, footnote: "", footnote_en: "", items: [] });
    const y = byYear.get(year);
    if (isYes(r.provisional)) y.provisional = true;

    // 日付が「※」の行は、その年の注記
    if (r.date === "※") { y.footnote = r.name || ""; y.footnote_en = r.en_name || ""; return; }

    if (!r.date || !r.name) { warnings.push(`${line} 行目: 「日付」か「イベント名」が空なので飛ばしました。`); return; }

    const item = { date: r.date };
    if (r.note) item.note = r.note;
    item.name = r.name;
    if (r.detail) item.detail = r.detail;
    if (r.place) item.place = r.place;
    const link = safeLink(r.link);
    if (r.link && !link) warnings.push(`${line} 行目: 「リンク」はサイト内のページ名（例 hukilau.html）だけ使えます。無視しました。`);
    if (link) item.link = link;

    const en = {};
    if (r.en_date) en.date = r.en_date;
    if (r.en_name) en.name = r.en_name;
    if (r.en_note) en.note = r.en_note;
    if (r.en_detail) en.detail = r.en_detail;
    if (r.en_place) en.place = r.en_place;
    if (Object.keys(en).length) item.en = en;

    y.items.push(item);
  });

  const years = [...byYear.values()].filter(y => y.items.length > 0).sort((a, b) => b.year - a.year);
  return { years, warnings };
}

function buildScheduleJs(years) {
  const body = years.map(y =>
    "  {\n" +
    `    year: ${y.year},\n` +
    `    provisional: ${y.provisional ? "true" : "false"},\n` +
    `    footnote: ${JSON.stringify(y.footnote)},\n` +
    `    footnote_en: ${JSON.stringify(y.footnote_en)},\n` +
    "    items: [\n" +
    y.items.map(it => "      " + JSON.stringify(it)).join(",\n") +
    "\n    ]\n  }"
  ).join(",\n");

  return `// =========================================================
// data/schedule.js  年間スケジュールのデータ
//
// このファイルは、スプレッドシートの「schedule」シートから自動で作られる
// （scripts/update_schedule.js）。直接書き換えても、次の公開で上書きされる。
// 予定を直すときは、スプレッドシートを直す。
//
// 「大会・イベント」ページ（日本語・英語）がこのファイルを読んで表示する。
// 表示する側のプログラムは sub.js にある。
// =========================================================
window.COCC_SCHEDULE = [
${body}
];
`;
}

async function fetchRows() {
  const { google } = require("googleapis");
  const creds = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT);
  const auth = new google.auth.GoogleAuth({
    credentials: creds,
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  });
  const sheets = google.sheets({ version: "v4", auth });
  const res = await sheets.spreadsheets.values.get({ spreadsheetId: process.env.SHEET_ID, range: SHEET_RANGE });
  return res.data.values || [];
}

async function main() {
  let rows;
  try {
    rows = await fetchRows();
  } catch (e) {
    // シートがまだ無い場合など。サイトの公開は止めず、今のデータをそのまま使う。
    console.log("schedule シートを読めませんでした。今の data/schedule.js をそのまま使います。理由:", e.message);
    return;
  }

  const { years, warnings } = buildYears(rows);
  warnings.forEach(w => console.log("注意:", w));

  if (years.length === 0) {
    console.log("使える予定が 1 件もないので、今の data/schedule.js をそのまま使います。");
    return;
  }

  fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });
  fs.writeFileSync(OUT_PATH, buildScheduleJs(years), "utf-8");
  console.log(`data/schedule.js を更新しました（${years.map(y => `${y.year}年 ${y.items.length}件`).join("、")}）`);
}

if (require.main === module) {
  main().catch(e => {
    // 予期しない失敗でも、公開全体は止めない
    console.log("update_schedule.js で問題が起きました。今の data/schedule.js をそのまま使います。", e);
  });
}

module.exports = { buildYears, buildScheduleJs, COLUMN_MAP };
