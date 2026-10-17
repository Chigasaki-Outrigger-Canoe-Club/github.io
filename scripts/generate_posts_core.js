const fs = require("fs");
const path = require("path");
const { google } = require("googleapis");
const { convertDocsToHtml, collectImages, imageUri, imageCrop } = require("./docs_to_html");
const { extractDocumentId } = require("./utils");
const { buildPostHtml } = require("./post_template");
const { insertPhotos, rulesFor } = require("./post_photos");

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

// Doc で切り抜いた写真は、同じように切り抜く。
// Google が切り抜き済みの写真を渡してきたとき（縦横の比が Doc の表示と同じ）は、二重に切らない
async function cropLikeDoc(sharp, buf, crop) {
  if (!crop || !(crop.left || crop.right || crop.top || crop.bottom)) return buf;
  const { width: w, height: h } = await sharp(buf).metadata();
  if (!w || !h) return buf;
  const cw = w * (1 - crop.left - crop.right), ch = h * (1 - crop.top - crop.bottom);
  if (cw < 10 || ch < 10) return buf;
  if (crop.shownW && crop.shownH) {
    const shown = crop.shownW / crop.shownH;
    const near = r => Math.abs(r - shown) / shown < 0.02;
    if (near(w / h) && !near(cw / ch)) return buf;            // もう切り抜かれている
  }
  const left = Math.round(w * crop.left), top = Math.round(h * crop.top);
  return sharp(buf).extract({
    left, top,
    width: Math.max(1, Math.min(w - left, Math.round(cw))),
    height: Math.max(1, Math.min(h - top, Math.round(ch)))
  }).toBuffer();
}

async function toWebp(buf, crop) {
  const sharp = require("sharp");
  const upright = await sharp(buf, { failOn: "none" }).rotate().toBuffer();   // スマホ写真の向きを直す
  const cropped = await cropLikeDoc(sharp, upright, crop);
  return sharp(cropped)
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
  const sizeMap = new Map();                            // 写真の id → { w, h }（縮めたあとの大きさ）
  const keep = new Set();
  const warnings = [];
  let first = "";

  for (let i = 0; i < ids.length; i++) {
    const name = `${String(i + 1).padStart(2, "0")}.webp`;
    try {
      const webp = await toWebp(await downloadImage(imageUri(doc, ids[i])), imageCrop(doc, ids[i]));
      fs.mkdirSync(dir, { recursive: true });
      const file = path.join(dir, name);
      if (!fs.existsSync(file) || !fs.readFileSync(file).equals(webp)) fs.writeFileSync(file, webp);
      keep.add(name);
      try {
        const meta = await require("sharp")(webp).metadata();
        if (meta.width && meta.height) sizeMap.set(ids[i], { w: meta.width, h: meta.height });
      } catch (e) { /* 大きさが分からなくても表示はできる */ }
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
  return { srcOf: id => srcMap.get(id) || "", sizeOf: id => sizeMap.get(id) || null, first, warnings };
}

// 記事ページを書き出す（posts/2026/… に置く）。注意（warnings）を返す
async function writePost(article, doc) {
  const rel = postRelPath(article);
  const outputPath = path.join(POSTS_DIR, rel);
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  const images = await saveImages(doc, rel);
  const body = convertDocsToHtml(doc, images.srcOf, images.sizeOf);
  const extra = await insertPhotos(body.html, article.id);            // git に置いた写真（data/post_photos.json）
  const html = buildPostHtml({ ...article, cover: images.first || ((rulesFor(article.id)[0] || {}).photo || "") }, extra.html);
  fs.writeFileSync(outputPath, html, "utf-8");
  console.log(`Generated: posts/${rel}`);
  return { rel, warnings: [...images.warnings, ...body.warnings, ...extra.warnings] };
}

module.exports = { fetchDoc, writePost };
