// 記事ファイルの名前と置き場所
//
//   posts/2026/2026-08-07_1_8月の練習会レポート.html
//          ^年  ^日付      ^記事id ^タイトル
//
// - 年ごとのフォルダ（1月〜12月。記事の「日付」の年）
// - 記事id でファイルを見分ける（タイトルや日付を変えても、同じ記事として扱う）
// - 記事の写真は images/posts/2026/2026-08-07_1_8月の練習会レポート/ （記事と同じ名前）

const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const POSTS_DIR = path.join(ROOT, "posts");
const POST_IMAGES_DIR = path.join(ROOT, "images", "posts");

// 以前の名前（2026-08-07_COCC_WEB_1.html）も、記事id を読み取れるようにする
const POST_FILE = /^(\d{4})-\d{2}-\d{2}_(?:COCC_WEB_)?(\d+)(?:_.*)?\.html$/;

// ファイル名に使えない・URL で困る文字を除いて、短くする
function titleForFile(title) {
  const cleaned = String(title || "")
    .replace(/[\\/:*?"<>|#%&{}$!'@+`=^~\[\];,]/g, "")
    .replace(/[\s　]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[-.]+|[-.]+$/g, "");
  return Array.from(cleaned).slice(0, 40).join("");
}

// 2026-08-07_1_8月の練習会レポート
function postName(a) {
  const t = titleForFile(a.title);
  return `${a.date}_${a.id}${t ? "_" + t : ""}`;
}

// posts/ から見た場所：2026/2026-08-07_1_….html
function postRelPath(a) {
  return `${a.date.slice(0, 4)}/${postName(a)}.html`;
}

// サイトのトップから見た URL（a タグに入れる。日本語はそのままでよい）
function postUrl(a) {
  return `posts/${postRelPath(a)}`;
}

// posts/ の中の記事ファイルを全部（年フォルダと、以前の平らな置き方の両方）
function listPostFiles() {
  const out = [];
  if (!fs.existsSync(POSTS_DIR)) return out;
  const push = rel => {
    const m = path.basename(rel).match(POST_FILE);
    if (m) out.push({ rel, id: m[2] });
  };
  for (const entry of fs.readdirSync(POSTS_DIR, { withFileTypes: true })) {
    if (entry.isFile()) push(entry.name);
    else if (entry.isDirectory() && /^\d{4}$/.test(entry.name)) {
      for (const f of fs.readdirSync(path.join(POSTS_DIR, entry.name))) push(`${entry.name}/${f}`);
    }
  }
  return out;
}

// 空になった年フォルダを消す
function removeEmptyDir(dir) {
  try {
    if (fs.existsSync(dir) && fs.readdirSync(dir).length === 0) fs.rmdirSync(dir);
  } catch (e) { /* 消せなくても困らない */ }
}

// 記事ファイルと、その記事の写真フォルダを消す
function removePost(rel) {
  const file = path.join(POSTS_DIR, rel);
  if (fs.existsSync(file)) fs.unlinkSync(file);
  console.log(`Deleted: posts/${rel}`);
  const imgDir = path.join(POST_IMAGES_DIR, rel.replace(/\.html$/, ""));
  if (fs.existsSync(imgDir)) {
    fs.rmSync(imgDir, { recursive: true, force: true });
    console.log(`Deleted: images/posts/${rel.replace(/\.html$/, "")}/`);
  }
  removeEmptyDir(path.dirname(file));
  removeEmptyDir(path.dirname(imgDir));
}

module.exports = {
  POSTS_DIR, POST_IMAGES_DIR, POST_FILE,
  titleForFile, postName, postRelPath, postUrl,
  listPostFiles, removePost, removeEmptyDir
};
