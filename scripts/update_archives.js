// 大会・イベントのページの「保存版」（hukilau-2027.html など）を扱う
//
// 1) 保存版を固定する
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

// 保存できるページ
const PAGES = {
  oshima:   { ja: "大島クロッシング",  en: "Oshima Crossing",   item: { ja: y => `${y}年`,    en: y => `${y}` } },
  hukilau:  { ja: "Hukilau Challenge", en: "Hukilau Challenge", item: { ja: y => `${y}年大会`, en: y => `${y} race` } },
  hoaikane: { ja: "Ho'aikane",         en: "Ho'aikane",         item: { ja: y => `${y}年大会`, en: y => `${y} event` } }
};

const ARCHIVE_FILE = /^(oshima|hukilau|hoaikane)-(\d{4})\.html$/;

function esc(v) {
  return String(v).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function dirFor(lang) {
  return lang === "en" ? path.join(ROOT, "en") : ROOT;
}

// 保存版の HTML を固定する（もう固定してあれば、そのまま返す）
function freezeHtml(html, page, year, lang) {
  if (html.includes("<!-- ARCHIVED")) return html;
  const info = PAGES[page];
  const name = info[lang];

  // スプレッドシートからの書き換え・自動のカード更新を止める
  html = html.replace(/ data-cms="[^"]*"/g, "");
  html = html.replace(/^[ \t]*<!-- (?:CARDS_[A-Z]+|ARCHIVE):(?:START|END)[^>]*-->\n/gm, "");

  // 日本語と英語の切り替えは、同じ年の保存版どうしで行き来する
  html = html.replace(/(<div class="lang-switch">)([\s\S]*?)(<\/div>)/, (m, a, inner, b) =>
    a + inner.replace(new RegExp(`${page}\\.html"`, "g"), `${page}-${year}.html"`) + b);

  // タイトルと共有用の URL
  const suffix = lang === "en" ? ` (${year})` : `（${year}年）`;
  html = html.replace(/(<title>)(.*?)(\s*[｜|])/, (m, a, t, sep) => a + t + suffix + sep);
  html = html.replace(/(<meta property="og:title" content=")(.*?)(\s*[｜|])/, (m, a, t, sep) => a + t + suffix + sep);
  html = html.replace(new RegExp(`(/${page})\\.html"`, "g"), `$1-${year}.html"`);
  // ↑ og:url だけでなくページ内の自分へのリンクも書き換わるので、メニューのリンクは元に戻す
  html = html.replace(/(<nav class="global-nav"[\s\S]*?<\/nav>)/, nav =>
    nav.replace(new RegExp(`${page}-${year}\\.html"`, "g"), `${page}.html"`));

  // 「準備中」のお知らせの代わりに、保存版の帯を出す
  const notice = lang === "en"
    ? `<div class="archive-notice"><p>This page is a record of the ${year} ${esc(name)}. <a href="${page}.html">See the latest page</a></p></div>`
    : `<div class="archive-notice"><p>このページは、${year}年の${esc(name)}の記録です。<a href="${page}.html">最新のページへ</a></p></div>`;
  if (/<div class="draft-notice">[\s\S]*?<\/div>/.test(html)) {
    html = html.replace(/<div class="draft-notice">[\s\S]*?<\/div>/, notice);
  } else {
    html = html.replace(/(\n[ \t]*)(<nav class="page-toc")/, `$1${notice}\n$1$2`);
  }

  // 固定した印
  html = html.replace(/(<body[^>]*>)/, `$1\n    <!-- ARCHIVED ${year}：このファイルは保存版です。スプレッドシートからは書き換わりません -->`);
  return html;
}

// 保存版の一覧（新しい年が上）
function archivesOf(page, lang) {
  const dir = dirFor(lang);
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .map(f => f.match(ARCHIVE_FILE))
    .filter(m => m && m[1] === page)
    .map(m => Number(m[2]))
    .sort((a, b) => b - a);
}

function listHtml(page, lang) {
  const years = archivesOf(page, lang);
  const make = PAGES[page].item[lang];
  const items = years.map(y => `          <li><a href="${page}-${y}.html">${esc(make(y))}</a></li>`);
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
  for (const lang of ["ja", "en"]) {
    const dir = dirFor(lang);
    if (!fs.existsSync(dir)) continue;
    for (const f of fs.readdirSync(dir)) {
      const m = f.match(ARCHIVE_FILE);
      if (!m) continue;
      const file = path.join(dir, f);
      const before = fs.readFileSync(file, "utf-8");
      writeIfChanged(file, before, freezeHtml(before, m[1], m[2], lang));
    }
    for (const page of Object.keys(PAGES)) {
      const file = path.join(dir, `${page}.html`);
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
    const dir = dirFor(lang);
    const src = path.join(dir, `${page}.html`);
    const dst = path.join(dir, `${page}-${year}.html`);
    if (!fs.existsSync(src)) continue;
    if (fs.existsSync(dst)) throw new Error(`${path.relative(ROOT, dst)} はもうあります。作り直すときは、先にそのファイルを消してください`);
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

module.exports = { freezeHtml, updateArchives, createArchive, ARCHIVE_FILE };
