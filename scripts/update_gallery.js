// 大会・イベントのページの「ギャラリー」
//
// images/site/gallery/oshima/    → oshima.html（英語版も）
// images/site/gallery/hukilau/   → hukilau.html
// images/site/gallery/hoaikane/  → hoaikane.html
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

function galleryHtml(page, lang) {
  const dir = path.join(ROOT, "images", "site", "gallery", page);
  const files = fs.existsSync(dir) ? fs.readdirSync(dir).filter(f => IMAGE.test(f)).sort() : [];
  if (files.length === 0) {
    return `        <p class="gallery-empty">${lang === "en" ? "Photos coming soon." : "写真は準備中です。"}</p>`;
  }
  const prefix = lang === "en" ? "../" : "";
  const items = files.map(f => {
    const src = prefix + encodeURI(`images/site/gallery/${page}/${f}`);
    return `          <li><a href="${esc(src)}" target="_blank" rel="noopener"><img src="${esc(src)}" alt="" loading="lazy"></a></li>`;
  });
  return `        <ul class="gallery-grid">\n${items.join("\n")}\n        </ul>`;
}

function main() {
  for (const page of PAGES) {
    for (const lang of ["ja", "en"]) {
      const file = path.join(ROOT, lang === "en" ? "en" : "", `${page}.html`);
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
