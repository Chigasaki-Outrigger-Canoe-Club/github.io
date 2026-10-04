const fs = require("fs");
const path = require("path");
const { google } = require("googleapis");
const { convertDocsToHtml } = require("./docs_to_html");
const { extractDocumentId } = require("./utils");
const { buildPostHtml } = require("./post_template");

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

// 記事ページのひな形は post_template.js にまとめている
function buildHtml(article, bodyHtml) {
  return buildPostHtml(article, bodyHtml);
}

module.exports = { generatePostCore };