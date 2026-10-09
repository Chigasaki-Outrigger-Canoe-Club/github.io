const fs = require("fs");
const path = require("path");
const { google } = require("googleapis");
const { convertDocsToHtml, collectImages, imageUri } = require("./docs_to_html");
const { extractDocumentId } = require("./utils");
const { buildPostHtml } = require("./post_template");

const auth = new google.auth.GoogleAuth({
  credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT),
  scopes: [
    "https://www.googleapis.com/auth/documents.readonly",
    "https://www.googleapis.com/auth/drive.readonly"
  ]
});

const { POSTS_DIR, POST_IMAGES_DIR, postRelPath } = require("./post_paths");

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

// 写真をダウンロードして、Web 用に縮める
// - 横 1600px まで、WebP 形式
// - 撮った場所（GPS）などの情報は消える（sharp は何も指定しなければ写真の付加情報を書き出さない）
async function downloadImage(uri) {
  let res = await fetch(uri);
  if (res.status === 401 || res.status === 403) {
    const client = await auth.getClient();
    const token = (await client.getAccessToken()).token;
    res = await fetch(uri, { headers: { Authorization: `Bearer ${token}` } });
  }
  if (!res.ok) throw new Error(`写真を取れませんでした（${res.status}）`);
  return Buffer.from(await res.arrayBuffer());
}

async function toWebp(buf) {
  const sharp = require("sharp");
  return sharp(buf, { failOn: "none" })
    .rotate()                                   // スマホ写真の向きを直す
    .resize({ width: 1600, withoutEnlargement: true })
    .webp({ quality: 80 })
    .toBuffer();
}

// 記事の写真を images/posts/年/記事の名前/01.webp … に置く
// 中身が同じなら書き直さない。使わなくなった写真は消す
async function saveImages(doc, rel) {
  const ids = collectImages(doc);
  const base = rel.replace(/\.html$/, "");             // 2026/2026-08-07_1_タイトル
  const dir = path.join(POST_IMAGES_DIR, base);
  const srcMap = new Map();
  const keep = new Set();
  const warnings = [];
  let first = "";

  for (let i = 0; i < ids.length; i++) {
    const name = `${String(i + 1).padStart(2, "0")}.webp`;
    try {
      const webp = await toWebp(await downloadImage(imageUri(doc, ids[i])));
      fs.mkdirSync(dir, { recursive: true });
      const file = path.join(dir, name);
      if (!fs.existsSync(file) || !fs.readFileSync(file).equals(webp)) fs.writeFileSync(file, webp);
      keep.add(name);
      // 記事ページ（posts/年/…）から見た場所
      srcMap.set(ids[i], encodeURI(`../../images/posts/${base}/${name}`));
      if (!first) first = `images/posts/${base}/${name}`;
    } catch (e) {
      console.error(`写真 ${i + 1} 枚目：${e.message}`);
      warnings.push(`写真 ${i + 1} 枚目を保存できませんでした`);
    }
  }

  if (fs.existsSync(dir)) {
    for (const f of fs.readdirSync(dir)) if (!keep.has(f)) fs.unlinkSync(path.join(dir, f));
    if (fs.readdirSync(dir).length === 0) fs.rmdirSync(dir);
  }
  if (ids.length) console.log(`写真 ${keep.size} / ${ids.length} 枚：images/posts/${base}/`);
  return { srcOf: id => srcMap.get(id) || "", first, warnings };
}

// 記事ページを書き出す（posts/2026/… に置く）。注意（warnings）を返す
async function writePost(article, doc) {
  const rel = postRelPath(article);
  const outputPath = path.join(POSTS_DIR, rel);
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  const images = await saveImages(doc, rel);
  const body = convertDocsToHtml(doc, images.srcOf);
  const html = buildPostHtml({ ...article, cover: images.first }, body.html);
  fs.writeFileSync(outputPath, html, "utf-8");
  console.log(`Generated: posts/${rel}`);
  return { rel, warnings: [...images.warnings, ...body.warnings] };
}

module.exports = { fetchDoc, writePost };
