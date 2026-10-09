// articles シート → posts/ の記事ページ
//
// 使い方（シート側）
// - 「載せる」にチェック → サイトに出す。外す → サイトから消す。
// - Google Doc を直したら、反映するだけで作り直される（Doc の版の番号で判断）。
// - 「状態（自動）」「記事id（自動）」「版（自動）」はこのスクリプトが書く。
//
// REBUILD_ALL=true のときは、変わっていない記事も全部作り直す（テンプレートを変えたとき用）。

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { readArticleSheet, sheetsClient, columnLetter, displayLabel } = require("./sheets_fetch");
const { fetchDoc, writePost } = require("./generate_posts_core");
const { postRelPath, listPostFiles, removePost } = require("./post_paths");

const REBUILD_ALL = String(process.env.REBUILD_ALL || "").toLowerCase() === "true";

// 日本時間の「10/09 13:08」
function nowLabel() {
  const parts = new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hour12: false
  }).formatToParts(new Date());
  const get = t => (parts.find(p => p.type === t) || {}).value || "";
  return `${get("month")}/${get("day")} ${get("hour")}:${get("minute")}`;
}

// タイトル・日付・画像・カテゴリが変わったときも作り直すための目印
function metaHash(a) {
  return crypto.createHash("md5")
    .update([a.title, a.date, a.image_urls, a.category, a.event].join("\u0001"))
    .digest("hex").slice(0, 8);
}

// 状態に付け足す注意
function note(a) {
  return a.eventIgnored ? " ⚠️ 大会・イベント名は、カテゴリが「大会・イベント」のときだけ使います" : "";
}

// 版（自動）の中身：「Doc の版|目印|更新日時」
function parseVersion(v) {
  const [rev = "", meta = "", time = ""] = String(v || "").split("|");
  return { rev, meta, time };
}

// posts/ の中で、この記事 id のファイルを全部探す（posts/ から見た場所）
function filesForId(id) {
  return listPostFiles().filter(f => f.id === String(id)).map(f => f.rel);
}

async function main() {
  const { columns, articles } = await readArticleSheet();
  const updates = [];   // シートに書き戻す [range, value]
  const setCell = (key, rowNumber, value) => {
    if (columns[key] === undefined) return;   // その列がないシートでは書かない
    updates.push({ range: `articles!${columnLetter(columns[key])}${rowNumber}`, values: [[value]] });
  };

  // ① 記事id がない行に番号を振る
  let maxId = articles.reduce((m, a) => Math.max(m, parseInt(a.id, 10) || 0), 0);
  for (const a of articles) {
    if (!/^\d+$/.test(a.id)) {
      a.id = String(++maxId);
      setCell("id", a.rowNumber, a.id);
      console.log(`記事id を振りました: ${a.rowNumber} 行目 → ${a.id}`);
    }
  }

  // ② 1 件ずつ処理
  for (const a of articles) {
    const existing = filesForId(a.id);

    // チェックなし → サイトから消す
    if (!a.publish) {
      existing.forEach(removePost);
      setCell("state", a.rowNumber, "下書き（サイトに出ていません）");
      continue;
    }

    if (!a.date || !a.title) {
      setCell("state", a.rowNumber, "⚠️ 日付とタイトルを入れてください");
      continue;
    }

    const fileName = postRelPath(a);
    const fileExists = existing.includes(fileName);

    let doc;
    try {
      doc = await fetchDoc(a.body_doc_url);
    } catch (e) {
      console.error(`記事 ${a.id}: ${e.message}`);
      const tail = fileExists ? "（前の内容のまま公開中）" : "（まだサイトに出ていません）";
      setCell("state", a.rowNumber, `⚠️ ${e.userMessage || e.message}${tail}`);
      continue;
    }

    const prev = parseVersion(a.version);
    const rev = doc.revisionId || "";
    const meta = metaHash(a);
    const unchanged = fileExists && prev.rev === rev && prev.meta === meta && rev !== "";

    if (unchanged && !REBUILD_ALL) {
      console.log(`Skip (変更なし): ${a.id}`);
      setCell("state", a.rowNumber, `✅ 公開中（${prev.time || "-"} 更新）${note(a)}`);
      continue;
    }

    // 記事ページの日付の横には、大会名（なければカテゴリ名）を出す
    writePost({ ...a, category: displayLabel(a) }, doc);
    // 日付を変えたときなど、古い名前のファイルを消す
    existing.filter(f => f !== fileName).forEach(removePost);

    const time = unchanged ? (prev.time || nowLabel()) : nowLabel();
    setCell("version", a.rowNumber, `${rev}|${meta}|${time}`);
    setCell("state", a.rowNumber, `✅ 公開中（${time} 更新）${note(a)}`);
  }

  // ③ シートから行ごと消された記事のファイルを消す
  //    （シートが読めて、記事が 1 件以上あるときだけ）
  if (articles.length > 0) {
    const ids = new Set(articles.map(a => a.id));
    listPostFiles().forEach(f => { if (!ids.has(f.id)) removePost(f.rel); });
  }

  // ④ シートに書き戻す
  if (updates.length) {
    await sheetsClient(true).spreadsheets.values.batchUpdate({
      spreadsheetId: process.env.SHEET_ID,
      requestBody: { valueInputOption: "RAW", data: updates }
    });
    console.log(`シートに ${updates.length} か所書き戻しました`);
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
