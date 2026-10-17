// Google Doc の決まった段落の下に、写真を差し込む（1 回だけ使う道具）
//
// 使い方：GitHub の「Googleドキュメントに写真を入れる」から動かす。
//   PLAN … 計画ファイル（{ doc, base, groups:[{ after, images:[…] }] }）
//   after … この文で終わる段落のすぐ下に入れる（"TOP" なら本文のいちばん上）
//   table: true … 写真を 1 行の表に入れる（写真の枚数ぶんの列。1 マスに 1 枚）
//   DRY_RUN=true なら、Doc は変えずに、どこに入るかだけ表示する
// Doc はサービスアカウントに「編集者」で共有しておく。

const fs = require("fs");
const { google } = require("googleapis");

const norm = s => String(s || "").replace(/\s+/g, "");

async function main() {
  const plan = JSON.parse(fs.readFileSync(process.env.PLAN, "utf-8"));
  const dry = String(process.env.DRY_RUN) === "true";
  const auth = new google.auth.GoogleAuth({
    credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT),
    scopes: ["https://www.googleapis.com/auth/documents"]
  });
  const docs = google.docs({ version: "v1", auth });
  const doc = (await docs.documents.get({ documentId: plan.doc })).data;

  // 本文の段落（表の中は見ない）
  const paras = [];
  for (const el of doc.body.content || []) {
    if (!el.paragraph) continue;
    const text = (el.paragraph.elements || []).map(e => (e.textRun && e.textRun.content) || "").join("");
    const hasImage = (el.paragraph.elements || []).some(e => e.inlineObjectElement);
    paras.push({ start: el.startIndex, end: el.endIndex, text: norm(text), hasImage });
  }
  if (paras.some(p => p.hasImage) && process.env.FORCE !== "true") {
    throw new Error("この Doc にはもう写真が入っています。二重に入れないよう止めました（FORCE=true で続ける）");
  }

  // 差し込む場所を決める（上から順に探す）
  const jobs = [];
  let from = 0;
  for (const g of plan.groups) {
    let index;
    if (g.after === "TOP") index = paras[0].start;
    else {
      const key = norm(g.after);
      const i = paras.findIndex((p, k) => k >= from && p.text.endsWith(key));
      if (i < 0) throw new Error(`差し込み先が見つかりません：${g.after}`);
      from = i + 1;
      index = paras[i].end - 1;           // 段落の最後（改行の手前）
    }
    jobs.push({ index, top: g.after === "TOP", images: g.images, after: g.after });
  }
  plan.groups.forEach((g, i) => { jobs[i].table = !!g.table; });
  for (const j of jobs) console.log(`${j.images.join(", ")} → ${j.top ? "いちばん上" : "「…" + j.after + "」の下"}${j.table ? "（表）" : ""}`);
  if (dry) { console.log("DRY_RUN：Doc は変えていません"); return; }

  // 表に入れる分：下から 1 つずつ。表を入れたら Doc を読み直して、マスの場所を調べて写真を入れる
  for (const j of jobs.filter(x => x.table).sort((a, b) => b.index - a.index)) {
    const n = j.images.length;
    await docs.documents.batchUpdate({ documentId: plan.doc, requestBody: { requests: [
      { insertTable: { rows: 1, columns: n, location: { index: j.index } } }
    ] } });
    const fresh = (await docs.documents.get({ documentId: plan.doc })).data;
    const tableEl = (fresh.body.content || []).find(el => el.table && el.startIndex >= j.index);
    if (!tableEl) throw new Error(`入れた表が見つかりません：${j.after}`);
    const cells = tableEl.table.tableRows[0].tableCells;
    const width = n === 1 ? 300 : n === 2 ? 200 : 140;
    const reqs = [];
    for (let c = n - 1; c >= 0; c--) {           // 後ろのマスから入れると、前のマスの場所がずれない
      const at = cells[c].content[0].startIndex;
      reqs.push({ insertInlineImage: { location: { index: at }, uri: plan.base + j.images[c], objectSize: { width: { magnitude: width, unit: "PT" } } } });
    }
    await docs.documents.batchUpdate({ documentId: plan.doc, requestBody: { requests: reqs } });
    console.log(`表に写真 ${n} 枚：「…${j.after}」の下`);
  }

  // 表に入れない分：下から順に入れると、上の場所がずれない
  const requests = [];
  for (const j of [...jobs].filter(x => !x.table).sort((a, b) => b.index - a.index)) {
    const width = j.images.length === 1 ? 420 : j.images.length === 2 ? 210 : 140;
    const at = j.top ? j.index : j.index + 1;
    requests.push({ insertText: { location: { index: j.index }, text: "\n" } });
    requests.push({ updateParagraphStyle: { range: { startIndex: at, endIndex: at + 1 }, paragraphStyle: { namedStyleType: "NORMAL_TEXT", alignment: "CENTER" }, fields: "namedStyleType,alignment" } });
    for (const name of [...j.images].reverse()) {
      requests.push({ insertInlineImage: { location: { index: at }, uri: plan.base + name, objectSize: { width: { magnitude: width, unit: "PT" } } } });
    }
  }
  if (requests.length) await docs.documents.batchUpdate({ documentId: plan.doc, requestBody: { requests } });
  console.log(`写真 ${jobs.reduce((n, j) => n + j.images.length, 0)} 枚を入れました（${jobs.length} か所）`);
}

main().catch(e => { console.error(e.message || e); process.exit(1); });
