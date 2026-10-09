const fs = require("fs");
const path = require("path");
const { google } = require("googleapis");
const { convertDocsToHtml } = require("./docs_to_html");
const { extractDocumentId } = require("./utils");
const { buildPostHtml } = require("./post_template");

const auth = new google.auth.GoogleAuth({
  credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT),
  scopes: [
    "https://www.googleapis.com/auth/documents.readonly",
    "https://www.googleapis.com/auth/drive.readonly"
  ]
});

const POSTS_DIR = path.join(process.cwd(), "posts");

function postFileName(article) {
  return `${article.date}_COCC_WEB_${article.id}.html`;
}

// Google Doc を読む。開けなければ例外を投げる。
async function fetchDoc(docUrl) {
  const docId = extractDocumentId(docUrl || "");
  if (!docId) {
    const err = new Error("記事のリンクが Google Doc ではありません");
    err.userMessage = err.message;
    throw err;
  }
  const docs = google.docs({ version: "v1", auth: await auth.getClient() });
  try {
    const res = await docs.documents.get({ documentId: docId });
    return res.data;
  } catch (e) {
    const err = new Error(`Doc を開けません（${e.code || e.message}）`);
    err.userMessage = "Doc を開けません。共有の設定を確かめてください";
    throw err;
  }
}

// 記事ページを書き出す
function writePost(article, doc) {
  if (!fs.existsSync(POSTS_DIR)) fs.mkdirSync(POSTS_DIR);
  const html = buildPostHtml(article, convertDocsToHtml(doc));
  const outputPath = path.join(POSTS_DIR, postFileName(article));
  fs.writeFileSync(outputPath, html, "utf-8");
  console.log(`Generated: ${outputPath}`);
  return outputPath;
}

module.exports = { fetchDoc, writePost, postFileName, POSTS_DIR };
