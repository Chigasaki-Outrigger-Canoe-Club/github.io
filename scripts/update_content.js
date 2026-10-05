// =========================================================
// update_content.js
// サイトの文章を、スプレッドシートの「content」シートから書き換える。
//
// しくみ
// ・HTML の中で、書き換えてよい文章には data-cms="キー" という印が付いている。
// ・「content」シートは 1 行に 1 つの文章（キー / ページ / 場所 / 日本語 / 英語）。
// ・公開のたびに、シートの文章を HTML（日本語は直下、英語は en/）に入れる。
// ・シートに無いキーが HTML にあれば、今の文章をシートの末尾に足す。
//   シートがまだ無いときは、シートを作って、今の文章をすべて書き出す。
// ・シートを読めないときは、何も変えずに終わる（公開は止めない）。
//
// シートでの書き方
// ・改行はそのまま改行になる。
// ・【仮】（英語は [TBC]）と書くと、赤い「仮」の印になる。
// ・リンクは [表示する文字](ページ名.html) または [表示する文字](https://…) と書く。
// ・日本語の欄を空にした行は、書き換えない（今の文章のまま）。
// =========================================================
const fs = require("fs");
const path = require("path");

const SHEET = "content";
const HEADER = ["キー", "ページ", "場所", "日本語", "英語"];
const ROOT = process.cwd();

function esc(v) {
  return String(v).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
function unesc(v) {
  return String(v).replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, "&");
}

// HTML の中身 → シートに書く文字
function htmlToText(html) {
  let s = String(html);
  s = s.replace(/<span class="kari">([^<]*)<\/span>/g, "$1");
  s = s.replace(/<br\s*\/?>\s*/g, "\n");
  s = s.replace(/<a\b[^>]*\bhref="([^"]*)"[^>]*>([\s\S]*?)<\/a>/g, (m, href, text) => `[${text.replace(/<[^>]+>/g, "")}](${unesc(href)})`);
  s = s.replace(/<[^>]+>/g, "");
  s = s.split("\n").map(l => l.replace(/[ \t]+/g, " ").trim()).join("\n").trim();
  return unesc(s);
}

// 安全なリンク先だけを通す（サイト内のページ、https、メール、電話）
function safeHref(href) {
  const h = String(href).trim();
  if (/^(https:\/\/|mailto:|tel:)/.test(h)) return h;
  if (/^(\.\.\/)?(en\/)?[A-Za-z0-9_\-\/]*\.html(#[A-Za-z0-9_-]+)?$/.test(h)) return h;
  if (/^#[A-Za-z0-9_-]+$/.test(h)) return h;
  return "";
}

// シートの文字 → HTML の中身
function textToHtml(text) {
  const links = [];
  let s = String(text).replace(/\[([^\]\n]+)\]\(([^)\s]+)\)/g, (m, label, href) => {
    const safe = safeHref(href);
    if (!safe) return label;
    const ext = /^https:/.test(safe) ? ' target="_blank" rel="noopener"' : "";
    links.push(`<a href="${esc(safe)}"${ext}>${esc(label)}</a>`);
    return `\u0000${links.length - 1}\u0000`;
  });
  s = esc(s);
  s = s.replace(/(【仮】|\[TBC\])/g, '<span class="kari">$1</span>');
  s = s.replace(/\r?\n/g, "<br>");
  s = s.replace(/\u0000(\d+)\u0000/g, (m, i) => links[Number(i)]);
  return s;
}

// data-cms の付いた要素を探す
const ELEMENT = /<([a-z0-9]+)((?:\s[^>]*)?\sdata-cms="([^"]+)"[^>]*)>([\s\S]*?)<\/\1>/g;

function pageFiles() {
  return fs.readdirSync(ROOT).filter(f => f.endsWith(".html")).sort();
}

// いまの HTML から、キーごとの文章を取り出す
function extractAll() {
  const rows = new Map();
  for (const f of pageFiles()) {
    const ja = fs.readFileSync(path.join(ROOT, f), "utf-8");
    const enPath = path.join(ROOT, "en", f);
    const en = fs.existsSync(enPath) ? fs.readFileSync(enPath, "utf-8") : "";
    const enMap = new Map();
    for (const m of en.matchAll(ELEMENT)) enMap.set(m[3], htmlToText(m[4]));
    for (const m of ja.matchAll(ELEMENT)) {
      const key = m[3];
      const parts = key.split(".");
      rows.set(key, { key, page: parts[0], place: parts.slice(1, -1).join("."), ja: htmlToText(m[4]), en: enMap.get(key) || "" });
    }
  }
  return rows;
}

// シートの文章を HTML に入れる。変えたファイルの数を返す
function applyAll(sheetRows) {
  let changed = 0;
  for (const f of pageFiles()) {
    for (const [lang, file] of [["ja", path.join(ROOT, f)], ["en", path.join(ROOT, "en", f)]]) {
      if (!fs.existsSync(file)) continue;
      const before = fs.readFileSync(file, "utf-8");
      const after = before.replace(ELEMENT, (m, tag, attrs, key, inner) => {
        const row = sheetRows.get(key);
        if (!row) return m;
        const text = lang === "ja" ? row.ja : row.en;
        if (text == null || String(text).trim() === "") return m;      // 空の欄は書き換えない
        if (htmlToText(inner) === String(text).trim()) return m;        // 同じ内容なら触らない
        return `<${tag}${attrs}>${textToHtml(String(text).trim())}</${tag}>`;
      });
      if (after !== before) { fs.writeFileSync(file, after, "utf-8"); changed++; }
    }
  }
  return changed;
}

function parseSheet(values) {
  const rows = new Map();
  if (!values || values.length === 0) return rows;
  const header = values[0].map(h => String(h || "").trim());
  const col = name => header.indexOf(name);
  const k = col("キー"), j = col("日本語"), e = col("英語");
  if (k < 0 || j < 0) return rows;
  values.slice(1).forEach(r => {
    const key = String(r[k] || "").trim();
    if (!key) return;
    rows.set(key, { key, ja: r[j] == null ? "" : String(r[j]), en: e >= 0 && r[e] != null ? String(r[e]) : "" });
  });
  return rows;
}

async function main() {
  const { google } = require("googleapis");
  const auth = new google.auth.GoogleAuth({
    credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT),
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  const sheets = google.sheets({ version: "v4", auth });
  const spreadsheetId = process.env.SHEET_ID;

  const current = extractAll();
  console.log(`HTML にある編集できる文章: ${current.size} 件`);

  // シートがあるか確かめる。無ければ作る
  const meta = await sheets.spreadsheets.get({ spreadsheetId, fields: "sheets.properties" });
  let sheet = meta.data.sheets.find(s => s.properties.title === SHEET);
  if (!sheet) {
    const res = await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: { requests: [{ addSheet: { properties: { title: SHEET, gridProperties: { rowCount: current.size + 200, columnCount: 5, frozenRowCount: 1 } } } }] },
    });
    const sheetId = res.data.replies[0].addSheet.properties.sheetId;
    // 入力した文字が日付や数字に変わらないよう、全体を「書式なしテキスト」にする。折り返しも付ける
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: { requests: [
        { repeatCell: { range: { sheetId }, cell: { userEnteredFormat: { numberFormat: { type: "TEXT" }, wrapStrategy: "WRAP", verticalAlignment: "TOP" } }, fields: "userEnteredFormat.numberFormat,userEnteredFormat.wrapStrategy,userEnteredFormat.verticalAlignment" } },
        { repeatCell: { range: { sheetId, startRowIndex: 0, endRowIndex: 1 }, cell: { userEnteredFormat: { textFormat: { bold: true } } }, fields: "userEnteredFormat.textFormat.bold" } },
        { updateDimensionProperties: { range: { sheetId, dimension: "COLUMNS", startIndex: 0, endIndex: 3 }, properties: { pixelSize: 150 }, fields: "pixelSize" } },
        { updateDimensionProperties: { range: { sheetId, dimension: "COLUMNS", startIndex: 3, endIndex: 5 }, properties: { pixelSize: 420 }, fields: "pixelSize" } },
      ] },
    });
    const values = [HEADER, ...[...current.values()].map(r => [r.key, r.page, r.place, r.ja, r.en])];
    await sheets.spreadsheets.values.update({ spreadsheetId, range: `${SHEET}!A1`, valueInputOption: "RAW", requestBody: { values } });
    console.log(`「${SHEET}」シートを作り、今の文章 ${current.size} 件を書き出しました。`);
    return;
  }

  const res = await sheets.spreadsheets.values.get({ spreadsheetId, range: `${SHEET}!A:E` });
  const sheetRows = parseSheet(res.data.values || []);

  // シートに無いキーは、今の文章を末尾に足す
  const missing = [...current.values()].filter(r => !sheetRows.has(r.key));
  if ((res.data.values || []).length === 0) missing.unshift(null);
  if (missing.length) {
    const values = missing.map(r => r === null ? HEADER : [r.key, r.page, r.place, r.ja, r.en]);
    await sheets.spreadsheets.values.append({ spreadsheetId, range: `${SHEET}!A1`, valueInputOption: "RAW", insertDataOption: "INSERT_ROWS", requestBody: { values } });
    console.log(`シートに無かった文章 ${values.length} 件を、シートの末尾に足しました。`);
  }

  const changed = applyAll(sheetRows);
  console.log(`シートの文章を反映しました（変わったファイル: ${changed} 個）。`);
}

if (require.main === module) {
  main().catch(e => {
    // 失敗しても公開全体は止めない。HTML は今のまま
    console.log("update_content.js で問題が起きました。文章は今のままにします。理由:", e.message);
  });
}

module.exports = { htmlToText, textToHtml, extractAll, applyAll, parseSheet };
