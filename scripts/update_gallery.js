// 大会・イベントのページの「ギャラリー」
//
// images/sites/OSHIMA/gallery/    → html/sites/oshima.html（英語版も）
// images/sites/HUKILAU/gallery/   → html/sites/hukilau.html
// images/sites/HOAIKANE/gallery/  → html/sites/hoaikane.html
// JPG・PNG を入れたときは、自動で WebP（横 1600px まで）に変えて、元のファイルは消す
//
// フォルダに写真（.jpg .jpeg .png .webp）を入れると、ファイル名の順に並ぶ。
// 並べ方を決めたいときは、ファイル名の頭に 01_ 02_ … と番号を付ける。
// <!-- GALLERY:START --> と <!-- GALLERY:END --> のあいだを、毎回作り直す。

const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const PAGES = ["oshima", "hukilau", "hoaikane"];
const IMAGE = /\.(jpe?g|png|webp)$/i;

function esc(v) {
  return String(v).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

const galleryDir = page => path.join(ROOT, "images", "sites", page.toUpperCase(), "gallery");

// JPG・PNG を WebP にする（横 1600px まで。撮った場所などの情報は消える）。元のファイルは消す
async function toWebp(page) {
  const dir = galleryDir(page);
  if (!fs.existsSync(dir)) return;
  const sharp = require("sharp");
  for (const f of fs.readdirSync(dir).filter(f => /\.(jpe?g|png)$/i.test(f))) {
    const src = path.join(dir, f);
    const dst = path.join(dir, f.replace(/\.[^.]+$/, ".webp"));
    await sharp(src, { failOn: "none" }).rotate().resize({ width: 1600, withoutEnlargement: true }).webp({ quality: 82 }).toFile(dst);
    fs.unlinkSync(src);
    console.log(`WebP にしました：${path.relative(ROOT, dst)}`);
  }
}

function galleryHtml(page, lang) {
  const dir = galleryDir(page);
  const files = fs.existsSync(dir) ? fs.readdirSync(dir).filter(f => IMAGE.test(f)).sort() : [];
  if (files.length === 0) {
    return `        <p class="gallery-empty">${lang === "en" ? "Photos coming soon." : "写真は準備中です。"}</p>`;
  }
  const prefix = lang === "en" ? "../../../" : "../../";      // html/sites/（英語は html/sites/en/）から見た場所
  const items = files.map(f => {
    const src = prefix + encodeURI(`images/sites/${page.toUpperCase()}/gallery/${f}`);
    return `          <li><a href="${esc(src)}" target="_blank" rel="noopener"><img src="${esc(src)}" alt="" loading="lazy"></a></li>`;
  });
  return `        <ul class="gallery-grid">\n${items.join("\n")}\n        </ul>`;
}

async function main() {
  for (const page of PAGES) {
    try { await toWebp(page); } catch (e) { console.log(`WebP にできませんでした（${page}）：${e.message}`); }
    for (const lang of ["ja", "en"]) {
      const file = path.join(ROOT, "html", "sites", lang === "en" ? "en" : "", `${page}.html`);
      if (!fs.existsSync(file)) continue;
      const before = fs.readFileSync(file, "utf-8");
      const after = before.replace(
        /([ \t]*<!-- GALLERY:START[^>]*-->\n)[\s\S]*?([ \t]*<!-- GALLERY:END -->)/,
        (m, a, b) => `${a}${galleryHtml(page, lang)}\n${b}`);
      if (after !== before) {
        fs.writeFileSync(file, after, "utf-8");
        console.log(`ギャラリーを更新：${path.relative(ROOT, file)}`);
      }
    }
  }
}

main();
