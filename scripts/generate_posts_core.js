const fs = require("fs");
const path = require("path");
const { google } = require("googleapis");
const { convertDocsToHtml } = require("./docs_to_html");
const { extractDocumentId } = require("./utils");

const auth = new google.auth.GoogleAuth({
  credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT),
  scopes: [
    "https://www.googleapis.com/auth/documents.readonly",
    "https://www.googleapis.com/auth/drive.readonly"
  ]
});

async function generatePost(article) {
  const authClient = await auth.getClient();

  // ① Docs URL → documentId
  const docId = extractDocumentId(article.body_doc_url);

  // ② Docs API → HTML
  const docs = google.docs({ version: "v1", auth: authClient });
  const doc = await docs.documents.get({ documentId: docId });
  const bodyHtml = convertDocsToHtml(doc.data);

  // ③ HTMLテンプレートに埋め込む
  const html = buildHtml(article, bodyHtml);

  // ④ posts/ に保存
  const outputPath = path.join("posts", `${article.id}.html`);
  fs.writeFileSync(outputPath, html, "utf-8");

  console.log(`Generated: ${outputPath}`);
}

function buildHtml(article, bodyHtml) {
  return `
  <html>
    <head>
      <meta charset="UTF-8">
      <title>${article.title}</title>
    </head>
    <body>
      <h1>${article.title}</h1>
      <p>${article.date}</p>
      <p>${article.lead}</p>

      <div class="post-body">
        ${bodyHtml}
      </div>

      <div class="post-notes">
        ${article.notes || ""}
      </div>

      ${article.entry_url ? `<a href="${article.entry_url}" target="_blank">参加する</a>` : ""}
    </body>
  </html>
  `;
}

module.exports = { generatePost };
