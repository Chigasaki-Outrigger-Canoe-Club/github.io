// git に置いた写真を、記事の決まった段落の下に差し込む（data/post_photos.json）
//
// Google Doc に写真を貼るのが基本。昔の記事など、写真を git で持っているときだけ使う。
// 記事は Doc から毎回作り直されるので、差し込みもそのたびに行う。

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const FILE = path.join(process.cwd(), "data", "post_photos.json");

function load() {
  try { return JSON.parse(fs.readFileSync(FILE, "utf-8")); } catch (e) { return {}; }
}

function rulesFor(id) {
  const entry = load()[String(id)];
  return entry && Array.isArray(entry.photos) ? entry.photos : [];
}

// 設定が変わったら記事を作り直すための目印
function photosHash(id) {
  const rules = rulesFor(id);
  return rules.length ? crypto.createHash("md5").update(JSON.stringify(rules)).digest("hex").slice(0, 6) : "";
}

const esc = v => String(v == null ? "" : v).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const plain = html => html.replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/\s+/g, "");

// bodyHtml は 1 行に 1 つのかたまり（段落・見出し・写真）。見つからなかった文は warnings に入れる
function insertPhotos(bodyHtml, id, prefix = "../../") {
  const rules = rulesFor(id);
  if (!rules.length) return { html: bodyHtml, warnings: [] };
  const lines = bodyHtml.split("\n");
  const warnings = [];
  // 下の行から差し込むと、行の番号がずれない
  const hits = [];
  for (const r of rules) {
    const key = String(r.after || "").replace(/\s+/g, "");
    const i = lines.findIndex(l => /^<(p|h[2-4])[\s>]/.test(l) && plain(l).includes(key));
    if (!key || i < 0) { warnings.push(`写真の差し込み先が見つかりません（${r.after}）`); continue; }
    if (!fs.existsSync(path.join(process.cwd(), r.photo))) { warnings.push(`写真がありません（${r.photo}）`); continue; }
    const cap = r.caption ? `<figcaption class="is-center">${esc(r.caption)}</figcaption>` : "";
    hits.push({ i, tag: `<figure class="post-photo"><img src="${esc(encodeURI(prefix + r.photo))}" alt="" loading="lazy">${cap}</figure>` });
  }
  hits.sort((a, b) => b.i - a.i).forEach(h => lines.splice(h.i + 1, 0, h.tag));
  return { html: lines.join("\n"), warnings };
}

module.exports = { insertPhotos, photosHash, rulesFor };
