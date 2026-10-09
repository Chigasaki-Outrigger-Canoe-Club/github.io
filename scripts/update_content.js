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

// トップの階層のページだけ（保存版は archive/ にあるので対象外。古い名前の hukilau-2027.html も念のため除く）
function pageFiles() {
  return fs.readdirSync(ROOT).filter(f => f.endsWith(".html") && !/-\d{4}\.html$/.test(f)).sort();
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

// ---------------------------------------------------------
// 「基本情報」シート：よく直す項目だけを集めた、小さな入力シート
// 項目 / 内容 / 英語 / キー（キーの列は隠してある）
// ---------------------------------------------------------
const INFO_SHEET = "基本情報";
const INFO_HEADER = ["項目", "内容（日本語）", "英語", "キー"];
// 見出しの行は ["■ 見出し"]、項目の行は [項目名, キー]
const INFO_ITEMS = [
  ["■ 会費（会員案内のページ）"],
  ["会費についての一言", "membership.fee.03"],
  ["一般：入会金", "membership.fee.08"],
  ["一般：月会費", "membership.fee.09"],
  ["学生：入会金", "membership.fee.11"],
  ["学生：月会費", "membership.fee.12"],
  ["会費の補足 1", "membership.fee.15"],
  ["会費の補足 2", "membership.fee.16"],
  ["会費の補足 3", "membership.fee.17"],
  ["■ 活動時間（会員案内のページ）"],
  ["活動時間の説明", "membership.time.03"],
  ["土曜：時間", "membership.time.08"],
  ["土曜：内容", "membership.time.09"],
  ["日曜：時間", "membership.time.11"],
  ["日曜：内容", "membership.time.12"],
  ["祝日・その他：時間", "membership.time.14"],
  ["祝日・その他：内容", "membership.time.15"],
  ["活動時間の補足", "membership.time.16"],
  ["■ COCC KIDS"],
  ["KIDS：入会金", "kids.kids-fee.06"],
  ["KIDS：月会費", "kids.kids-fee.08"],
  ["KIDS：料金の補足", "kids.kids-fee.09"],
  ["ユース（中高生）：活動日", "kids.kids-activity.11"],
  ["ユース（中高生）：時間", "kids.kids-activity.12"],
  ["ジュニア（小学生）：活動日", "kids.kids-activity.14"],
  ["ジュニア（小学生）：時間", "kids.kids-activity.15"],
  ["KIDS：活動日の補足", "kids.kids-activity.16"],
  ["■ 体験（初めての方へのページ）"],
  ["当日の時間例 1：時間", "beginners.trial.11"],
  ["当日の時間例 1：内容", "beginners.trial.12"],
  ["当日の時間例 2：時間", "beginners.trial.13"],
  ["当日の時間例 2：内容", "beginners.trial.14"],
  ["当日の時間例 3：時間", "beginners.trial.15"],
  ["当日の時間例 3：内容", "beginners.trial.16"],
  ["当日の時間例 4：時間", "beginners.trial.17"],
  ["当日の時間例 4：内容", "beginners.trial.18"],
  ["当日の時間例 5：時間", "beginners.trial.19"],
  ["当日の時間例 5：内容", "beginners.trial.20"],
  ["持ち物 1", "beginners.trial.22"],
  ["持ち物 2", "beginners.trial.23"],
  ["持ち物 3", "beginners.trial.24"],
  ["持ち物 4", "beginners.trial.25"],
  ["持ち物 5", "beginners.trial.26"],
  ["■ 場所（お問い合わせのページ）"],
  ["住所", "contact.access.05"],
  ["場所の説明", "contact.access.03"],
  ["■ 代表の言葉（クラブについてのページ）"],
  ["代表の言葉（本文）", "about.message.03"],
];

function infoSeedValues(current) {
  return [INFO_HEADER, ...INFO_ITEMS.map(([label, key]) => {
    if (!key) return [label, "", "", ""];
    const r = current.get(key) || { ja: "", en: "" };
    return [label, r.ja, r.en, key];
  })];
}

function parseInfo(values) {
  const rows = new Map();
  (values || []).slice(1).forEach(r => {
    const key = String(r[3] || "").trim();
    if (!key) return;
    rows.set(key, { key, ja: r[1] == null ? "" : String(r[1]), en: r[2] == null ? "" : String(r[2]) });
  });
  return rows;
}

// ---------------------------------------------------------
// 「FAQ」シート：1 行に 1 問。行を足せば質問が増える
// 分類 / 質問 / 答え / 英語：分類 / 英語：質問 / 英語：答え
// ---------------------------------------------------------
const FAQ_SHEET = "FAQ";
const FAQ_HEADER = ["分類", "質問", "答え", "英語：分類", "英語：質問", "英語：答え"];
const FAQ_BLOCK = /([ \t]*<!-- FAQ:START[^>]*-->\n)([\s\S]*?)([ \t]*<!-- FAQ:END -->)/;

// いまの faq.html から、質問の一覧を取り出す（シートを最初に作るときに使う）
function extractFaq(html) {
  const m = html.match(FAQ_BLOCK);
  if (!m) return [];
  const out = [];
  for (const sec of m[2].matchAll(/<section\b[\s\S]*?<\/section>/g)) {
    const title = (sec[0].match(/<h2[^>]*>([\s\S]*?)<\/h2>/) || [])[1];
    if (title == null) continue;
    for (const d of sec[0].matchAll(/<details[^>]*>\s*<summary[^>]*>([\s\S]*?)<\/summary>\s*<p[^>]*>([\s\S]*?)<\/p>\s*<\/details>/g)) {
      out.push({ category: htmlToText(title), q: htmlToText(d[1]), a: htmlToText(d[2]) });
    }
  }
  return out;
}

function faqSeedValues() {
  const ja = extractFaq(fs.readFileSync(path.join(ROOT, "faq.html"), "utf-8"));
  const enPath = path.join(ROOT, "en", "faq.html");
  const en = fs.existsSync(enPath) ? extractFaq(fs.readFileSync(enPath, "utf-8")) : [];
  return [FAQ_HEADER, ...ja.map((r, i) => {
    const e = en[i] || { category: "", q: "", a: "" };
    return [r.category, r.q, r.a, e.category, e.q, e.a];
  })];
}

// シートの行 → 分類ごとのまとまり（シートの上から順）
function parseFaq(values) {
  const groups = [];
  (values || []).slice(1).forEach(r => {
    const c = i => String(r[i] == null ? "" : r[i]).trim();
    if (!c(0) || !c(1) || !c(2)) return;            // 分類・質問・答えのどれかが空の行は飛ばす
    let g = groups.find(x => x.category === c(0));
    if (!g) { g = { category: c(0), category_en: "", items: [] }; groups.push(g); }
    if (!g.category_en && c(3)) g.category_en = c(3);
    g.items.push({ q: c(1), a: c(2), q_en: c(4), a_en: c(5) });
  });
  return groups;
}

function buildFaqHtml(groups, lang) {
  const en = lang === "en";
  const title = g => (en ? (g.category_en || g.category) : g.category);
  const toc =
    `    <nav class="page-toc" aria-label="${en ? "On this page" : "このページの内容"}">\n` +
    groups.map((g, i) => `      <a href="#faq-${i + 1}">${esc(title(g))}</a>\n`).join("") +
    "    </nav>\n\n";
  const sections = groups.map((g, i) => {
    const items = g.items.map(it => {
      const q = en ? (it.q_en || it.q) : it.q;
      const a = en ? (it.a_en || it.a) : it.a;
      return `          <details><summary>${textToHtml(q)}</summary><p>${textToHtml(a)}</p></details>`;
    }).join("\n");
    return `    <section id="faq-${i + 1}" class="page-section">
      <div class="section-inner">
        <h2 class="section-title">${esc(title(g))}</h2>
        <div class="faq">
${items}
        </div>
      </div>
    </section>

`;
  }).join("");
  return toc + sections;
}

// FAQ のページを作り直す。変えたファイルの数を返す
function applyFaq(groups) {
  if (!groups.length) return 0;
  let changed = 0;
  for (const [lang, file] of [["ja", path.join(ROOT, "faq.html")], ["en", path.join(ROOT, "en", "faq.html")]]) {
    if (!fs.existsSync(file)) continue;
    const before = fs.readFileSync(file, "utf-8");
    if (!FAQ_BLOCK.test(before)) continue;
    const after = before.replace(FAQ_BLOCK, (m, start, body, end) => start + buildFaqHtml(groups, lang) + end);
    if (after !== before) { fs.writeFileSync(file, after, "utf-8"); changed++; }
  }
  return changed;
}

// ---------------------------------------------------------
// シートの準備（無ければ作って、今の内容を書き出す）
// ---------------------------------------------------------
async function ensureSheet(sheets, spreadsheetId, meta, title, seedValues, widths, hideLastColumn) {
  if (meta.data.sheets.find(s => s.properties.title === title)) return false;
  const cols = seedValues[0].length;
  const res = await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: { requests: [{ addSheet: { properties: { title, gridProperties: { rowCount: seedValues.length + 200, columnCount: cols, frozenRowCount: 1 } } } }] },
  });
  const sheetId = res.data.replies[0].addSheet.properties.sheetId;
  const requests = [
    // 入力した文字が日付や数字に変わらないよう、全体を「書式なしテキスト」にする
    { repeatCell: { range: { sheetId }, cell: { userEnteredFormat: { numberFormat: { type: "TEXT" }, wrapStrategy: "WRAP", verticalAlignment: "TOP" } }, fields: "userEnteredFormat.numberFormat,userEnteredFormat.wrapStrategy,userEnteredFormat.verticalAlignment" } },
    { repeatCell: { range: { sheetId, startRowIndex: 0, endRowIndex: 1 }, cell: { userEnteredFormat: { textFormat: { bold: true, foregroundColorStyle: { rgbColor: { red: 1, green: 1, blue: 1 } } }, backgroundColorStyle: { rgbColor: { red: 0.118, green: 0.204, blue: 0.278 } } } }, fields: "userEnteredFormat.textFormat.bold,userEnteredFormat.textFormat.foregroundColorStyle,userEnteredFormat.backgroundColorStyle" } },
    ...widths.map((w, i) => ({ updateDimensionProperties: { range: { sheetId, dimension: "COLUMNS", startIndex: i, endIndex: i + 1 }, properties: { pixelSize: w }, fields: "pixelSize" } })),
  ];
  // 「■」で始まる行は見出し。色を付ける
  seedValues.forEach((row, r) => {
    if (r > 0 && String(row[0]).startsWith("■")) {
      requests.push({ repeatCell: { range: { sheetId, startRowIndex: r, endRowIndex: r + 1 }, cell: { userEnteredFormat: { textFormat: { bold: true }, backgroundColorStyle: { rgbColor: { red: 0.945, green: 0.918, blue: 0.863 } } } }, fields: "userEnteredFormat.textFormat.bold,userEnteredFormat.backgroundColorStyle" } });
    }
  });
  if (hideLastColumn) requests.push({ updateDimensionProperties: { range: { sheetId, dimension: "COLUMNS", startIndex: cols - 1, endIndex: cols }, properties: { hiddenByUser: true }, fields: "hiddenByUser" } });
  await sheets.spreadsheets.batchUpdate({ spreadsheetId, requestBody: { requests } });
  await sheets.spreadsheets.values.update({ spreadsheetId, range: `'${title}'!A1`, valueInputOption: "RAW", requestBody: { values: seedValues } });
  console.log(`「${title}」シートを作り、今の内容 ${seedValues.length - 1} 行を書き出しました。`);
  return true;
}

async function readSheet(sheets, spreadsheetId, range) {
  const res = await sheets.spreadsheets.values.get({ spreadsheetId, range });
  return res.data.values || [];
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
  const meta = await sheets.spreadsheets.get({ spreadsheetId, fields: "sheets.properties" });

  // 1) content（全部の文章。裏方）
  const madeContent = await ensureSheet(sheets, spreadsheetId, meta, SHEET,
    [HEADER, ...[...current.values()].map(r => [r.key, r.page, r.place, r.ja, r.en])], [150, 150, 150, 420, 420], false);
  let contentRows = new Map();
  if (!madeContent) {
    const values = await readSheet(sheets, spreadsheetId, `${SHEET}!A:E`);
    contentRows = parseSheet(values);
    const missing = [...current.values()].filter(r => !contentRows.has(r.key));
    if (missing.length) {
      await sheets.spreadsheets.values.append({ spreadsheetId, range: `${SHEET}!A1`, valueInputOption: "RAW", insertDataOption: "INSERT_ROWS",
        requestBody: { values: missing.map(r => [r.key, r.page, r.place, r.ja, r.en]) } });
      console.log(`シートに無かった文章 ${missing.length} 件を、content シートの末尾に足しました。`);
    }
    // ページから無くなった文章の行は消す（シートを見やすく保つ）
    // 念のため、HTML から十分な数の文章が読めたときだけ行う
    const keyCol = (values[0] || []).map(h => String(h || "").trim()).indexOf("キー");
    if (current.size >= 100 && keyCol >= 0) {
      const gone = [];
      values.forEach((r, i) => {
        if (i === 0) return;
        const key = String(r[keyCol] || "").trim();
        if (key && !current.has(key)) gone.push(i);           // i は 0 始まり＝シートの行番号 - 1
      });
      if (gone.length) {
        const sheetId = meta.data.sheets.find(sh => sh.properties.title === SHEET).properties.sheetId;
        const requests = gone.sort((a, b) => b - a).map(i => ({
          deleteDimension: { range: { sheetId, dimension: "ROWS", startIndex: i, endIndex: i + 1 } }
        }));
        await sheets.spreadsheets.batchUpdate({ spreadsheetId, requestBody: { requests } });
        console.log(`ページから無くなった文章 ${gone.length} 件の行を、content シートから消しました。`);
      }
    }
  }

  // 2) 基本情報（よく直す項目。content より優先する）
  const madeInfo = await ensureSheet(sheets, spreadsheetId, meta, INFO_SHEET, infoSeedValues(current), [240, 420, 420, 120], true);
  let infoRows = new Map();
  if (!madeInfo) infoRows = parseInfo(await readSheet(sheets, spreadsheetId, `'${INFO_SHEET}'!A:D`));

  const merged = new Map([...contentRows, ...infoRows]);
  const changed = applyAll(merged);
  console.log(`文章を反映しました（変わったファイル: ${changed} 個）。`);

  // 3) FAQ（行を足せば質問が増える）
  const madeFaq = await ensureSheet(sheets, spreadsheetId, meta, FAQ_SHEET, faqSeedValues(), [170, 300, 460, 170, 300, 460], false);
  if (!madeFaq) {
    const groups = parseFaq(await readSheet(sheets, spreadsheetId, `'${FAQ_SHEET}'!A:F`));
    if (groups.length === 0) console.log("FAQ シートに使える行がないので、FAQ のページは今のままにします。");
    else console.log(`FAQ を反映しました（${groups.length} 分類、変わったファイル: ${applyFaq(groups)} 個）。`);
  }
}

if (require.main === module) {
  main().catch(e => {
    // 失敗しても公開全体は止めない。HTML は今のまま
    console.log("update_content.js で問題が起きました。文章は今のままにします。理由:", e.message);
  });
}

module.exports = { htmlToText, textToHtml, extractAll, applyAll, parseSheet, infoSeedValues, parseInfo, faqSeedValues, parseFaq, applyFaq, extractFaq };
