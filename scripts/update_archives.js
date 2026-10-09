// 大会・イベントのページの「保存版」を扱う
//
//   archive/2027/hukilau.html      ← hukilau.html の 2027 年の保存版
//   archive/2027/en/hukilau.html   ← 英語版
//
// 1) 保存版を固定する
//    - 置き場所が変わるので、CSS・画像・リンクの場所を書き換える
//    - スプレッドシートの反映で書き換わらないように、data-cms と自動更新の目印を外す
//    - 上に「これは○年の記録です」の帯を付ける
//    - 手でコピーしたファイルでも、次の反映のときに自動で固定される
// 2) 今のページ（hukilau.html など）の「これまでの大会」に、保存版へのリンクを並べる
//
// 保存版を作るとき：node scripts/update_archives.js hukilau 2027
//   （GitHub Actions の「大会・イベントのページを保存」から動かす）
// 固定と一覧の更新だけ：node scripts/update_archives.js

const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const ARCHIVE_DIR = path.join(ROOT, "archive");

// 保存できるページ
const PAGES = {
  oshima:   { ja: "大島クロッシング",  en: "Oshima Crossing",   item: { ja: y => `${y}年`,    en: y => `${y}` } },
  hukilau:  { ja: "Hukilau Challenge", en: "Hukilau Challenge", item: { ja: y => `${y}年大会`, en: y => `${y} race` } },
  hoaikane: { ja: "Ho'aikane",         en: "Ho'aikane",         item: { ja: y => `${y}年大会`, en: y => `${y} event` } }
};

function esc(v) {
  return String(v).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// サイトのトップから見た場所
const currentPath = (page, lang) => (lang === "en" ? `en/${page}.html` : `${page}.html`);
const archivePath = (page, year, lang) => (lang === "en" ? `archive/${year}/en/${page}.html` : `archive/${year}/${page}.html`);

// 元のページ（fromFile）で書かれていた相対リンクを、新しい場所（toFile）から見た相対リンクにする
function relocate(html, fromFile, toFile) {
  const fromDir = path.posix.dirname(fromFile);
  const toDir = path.posix.dirname(toFile);
  const fix = url => {
    if (!url || /^(?:[a-z][a-z0-9+.-]*:|\/\/|\/|#|\$\{)/i.test(url)) return url;   // http: mailto: # / などはそのまま
    const m = url.match(/^([^?#]*)(.*)$/);
    if (!m[1]) return url;
    const target = path.posix.normalize(path.posix.join(fromDir, m[1]));
    let rel = path.posix.relative(toDir, target) || path.posix.basename(target);
    return rel + m[2];
  };
  html = html.replace(/(\s(?:href|src)=")([^"]*)(")/g, (all, a, url, b) => a + fix(url) + b);
  html = html.replace(/(url\(\s*['"]?)([^'")]+)(['"]?\s*\))/g, (all, a, url, b) => a + fix(url) + b);
  return html;
}

// 保存版の HTML を固定する（もう固定してあれば、そのまま返す）
function freezeHtml(html, page, year, lang) {
  if (html.includes("<!-- ARCHIVED")) return html;
  const name = PAGES[page][lang];
  const from = currentPath(page, lang);
  const to = archivePath(page, year, lang);

  // 置き場所が変わるので、リンク・画像・CSS の場所を直す
  html = relocate(html, from, to);

  // スプレッドシートからの書き換え・自動のカード更新を止める
  html = html.replace(/ data-cms="[^"]*"/g, "");
  html = html.replace(/^[ \t]*<!-- (?:CARDS_[A-Z]+|ARCHIVE):(?:START|END)[^>]*-->\n/gm, "");

  // タイトルと共有用の URL
  const suffix = lang === "en" ? ` (${year})` : `（${year}年）`;
  html = html.replace(/(<title>)(.*?)(\s*[｜|])/, (m, a, t, sep) => a + t + suffix + sep);
  html = html.replace(/(<meta property="og:title" content=")(.*?)(\s*[｜|])/, (m, a, t, sep) => a + t + suffix + sep);
  html = html.replace(new RegExp(`(<meta property="og:url" content="https?://[^"]*?/)(?:en/)?${page}\\.html"`), `$1${to}"`);

  // 「準備中」のお知らせの代わりに、保存版の帯を出す
  const latest = path.posix.relative(path.posix.dirname(to), from);
  const notice = lang === "en"
    ? `<div class="archive-notice"><p>This page is a record of the ${year} ${esc(name)}. <a href="${latest}">See the latest page</a></p></div>`
    : `<div class="archive-notice"><p>このページは、${year}年の${esc(name)}の記録です。<a href="${latest}">最新のページへ</a></p></div>`;
  if (/<div class="draft-notice">[\s\S]*?<\/div>/.test(html)) {
    html = html.replace(/<div class="draft-notice">[\s\S]*?<\/div>/, notice);
  } else {
    html = html.replace(/(\n[ \t]*)(<nav class="page-toc")/, `$1${notice}\n$1$2`);
  }

  // 固定した印
  html = html.replace(/(<body[^>]*>)/, `$1\n    <!-- ARCHIVED ${year}：このファイルは保存版です。スプレッドシートからは書き換わりません -->`);
  return html;
}

// 日本語と英語の切り替え：同じ年の保存版があればそこへ、なければ今のページへ
function fixLangSwitch(html, page, year, lang) {
  const here = path.posix.dirname(archivePath(page, year, lang));
  const linkTo = l => {
    const archived = archivePath(page, year, l);
    const target = fs.existsSync(path.join(ROOT, archived)) ? archived : currentPath(page, l);
    return path.posix.relative(here, target);
  };
  return html.replace(/(<div class="lang-switch">)([\s\S]*?)(<\/div>)/, (m, a, inner, b) =>
    a + inner
      .replace(/href="[^"]*"(\s+lang="ja")/, `href="${linkTo("ja")}"$1`)
      .replace(/href="[^"]*"(\s+lang="en")/, `href="${linkTo("en")}"$1`) + b);
}

// 保存版がある年（新しい年が上）
function yearsOf(page, lang) {
  if (!fs.existsSync(ARCHIVE_DIR)) return [];
  return fs.readdirSync(ARCHIVE_DIR)
    .filter(y => /^\d{4}$/.test(y) && fs.existsSync(path.join(ROOT, archivePath(page, y, lang))))
    .map(Number)
    .sort((a, b) => b - a);
}

function listHtml(page, lang) {
  const make = PAGES[page].item[lang];
  const from = path.posix.dirname(currentPath(page, lang));
  const items = yearsOf(page, lang).map(y =>
    `          <li><a href="${path.posix.relative(from, archivePath(page, y, lang))}">${esc(make(y))}</a></li>`);
  if (items.length === 0) {
    const empty = lang === "en" ? "Past pages will be listed here." : "これまでのページは、ここに並びます。";
    items.push(`          <li class="archive-empty">${empty}</li>`);
  }
  return items.join("\n");
}

function writeIfChanged(file, before, after) {
  if (after !== before) {
    fs.writeFileSync(file, after, "utf-8");
    console.log(`更新：${path.relative(ROOT, file)}`);
  }
}

// 保存版を固定し、今のページの一覧を作り直す
function updateArchives() {
  if (fs.existsSync(ARCHIVE_DIR)) {
    for (const year of fs.readdirSync(ARCHIVE_DIR).filter(y => /^\d{4}$/.test(y))) {
      for (const lang of ["ja", "en"]) {
        for (const page of Object.keys(PAGES)) {
          const file = path.join(ROOT, archivePath(page, year, lang));
          if (!fs.existsSync(file)) continue;
          const before = fs.readFileSync(file, "utf-8");
          writeIfChanged(file, before, fixLangSwitch(freezeHtml(before, page, year, lang), page, year, lang));
        }
      }
    }
  }
  for (const lang of ["ja", "en"]) {
    for (const page of Object.keys(PAGES)) {
      const file = path.join(ROOT, currentPath(page, lang));
      if (!fs.existsSync(file)) continue;
      const before = fs.readFileSync(file, "utf-8");
      const after = before.replace(
        /(<!-- ARCHIVE:START[^>]*-->\n)[\s\S]*?(<!-- ARCHIVE:END -->)/,
        (all, a, b) => `${a}${listHtml(page, lang)}\n${b}`);
      writeIfChanged(file, before, after);
    }
  }
}

// 今のページをコピーして、保存版を作る
function createArchive(page, year) {
  if (!PAGES[page]) throw new Error(`保存できるのは ${Object.keys(PAGES).join(" / ")} です（指定：${page}）`);
  if (!/^\d{4}$/.test(String(year))) throw new Error(`年は 4 けたの数字で指定してください（指定：${year}）`);
  for (const lang of ["ja", "en"]) {
    const src = path.join(ROOT, currentPath(page, lang));
    const dst = path.join(ROOT, archivePath(page, year, lang));
    if (!fs.existsSync(src)) continue;
    if (fs.existsSync(dst)) throw new Error(`${path.relative(ROOT, dst)} はもうあります。作り直すときは、先にそのファイルを消してください`);
    fs.mkdirSync(path.dirname(dst), { recursive: true });
    fs.copyFileSync(src, dst);
    console.log(`保存版を作りました：${path.relative(ROOT, dst)}`);
  }
}

if (require.main === module) {
  try {
    const [page, year] = process.argv.slice(2);
    if (page || year) createArchive(page, year);
    updateArchives();
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
}

module.exports = { freezeHtml, updateArchives, createArchive, relocate };
