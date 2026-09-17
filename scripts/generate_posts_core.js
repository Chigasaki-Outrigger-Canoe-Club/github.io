const fs = require("fs");
const path = require("path");
const { google } = require("googleapis");
const { convertDocsToHtml } = require("./docs_to_html");
const { extractDocumentId } = require("./utils");

// 「はい / いいえ」→ boolean に正規化
function normalizeBool(value) {
  if (typeof value === "boolean") return value;
  if (!value) return false;
  return value.trim() === "はい";
}

const auth = new google.auth.GoogleAuth({
  credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT),
  scopes: [
    "https://www.googleapis.com/auth/documents.readonly",
    "https://www.googleapis.com/auth/drive.readonly"
  ]
});

async function generatePostCore(article) {
  const authClient = await auth.getClient();

  // 生成済み・修正フラグを正規化
  const isGenerated = normalizeBool(article.generated);
  const isModified = normalizeBool(article.modified);

  // ① 生成済み & 修正なし → スキップ
  if (isGenerated && !isModified) {
    console.log(`記事 ${article.id} は生成済みのためスキップ`);
    return null;
  }

  // ② Docs URL → documentId
  const docId = extractDocumentId(article.body_doc_url);

  // ③ Docs API → HTML
  const docs = google.docs({ version: "v1", auth: authClient });
  const doc = await docs.documents.get({ documentId: docId });
  const bodyHtml = convertDocsToHtml(doc.data);

  // ④ posts フォルダがなければ作る
  const postsDir = path.join(process.cwd(), "posts");
  if (!fs.existsSync(postsDir)) {
    fs.mkdirSync(postsDir);
  }

  // ⑤ HTMLテンプレートに埋め込む
  const html = buildHtml(article, bodyHtml);

  // ⑥ posts/ に保存
  const outputPath = path.join(postsDir, `${article.date}_COCC_WEB_${article.id}.html`);
  fs.writeFileSync(outputPath, html, "utf-8");

  console.log(`Generated: ${outputPath}`);

  // ⑦ 生成後の状態を返す（sheets_sync.js で書き戻す）
  return {
    ...article,
    generated: true,
    modified: false
  };
}

function buildHtml(article, bodyHtml) {

  const cleanedHtml = bodyHtml
    .replace(/\u000B/g, "<br>")
    .replace(/[\u0000-\u001F]/g, "<br>")
    .replace(/rgb\((\d+),\s*NaN,\s*NaN\)/g, "rgb($1,0,0)")
    .replace(/NaN/g, "0");

  return `
  <html>
    <head>
      <meta charset="UTF-8">
      <title>${article.title}</title>
    </head>
    <body>
      <h1>${article.title}</h1>
      <p>${article.date}</p>

      <div class="post-body">
        ${cleanedHtml}
      </div>

      <div class="post-category">
        ${article.category || ""}
      </div>

      ${article.entry_url ? `<a href="${article.entry_url}" target="_blank">参加する</a>` : ""}
    </body>
  </html>
  `;
}

module.exports = { generatePostCore };