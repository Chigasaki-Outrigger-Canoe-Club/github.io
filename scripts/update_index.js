// articles シート → 記事カードの一覧
//
// - index.html   … NEWS（全カテゴリの新しい順、5 件）
// - news.html    … すべての記事（カテゴリで絞り込める）       <!-- CARDS_ALL -->
// - events.html  … 大会とイベント（12 件）                     <!-- CARDS_EVENT -->
// - kids.html    … KIDS（6 件）                               <!-- CARDS_KIDS -->
//
// <!-- 名前:START --> と <!-- 名前:END --> のあいだを、毎回作り直す。

const fs = require("fs");
const path = require("path");
const { postRelPath } = require("./post_paths");
const { fetchArticles, categorySlug, eventSlug, displayLabel, EVENTS_PAGE_CATEGORIES } = require("./sheets_fetch");

const ROOT = process.cwd();

// サイトに載せる記事：「載せる」にチェックがあり、記事ページができているもの
function isListed(a) {
  if (!a.publish || !a.date || !a.title || !a.id) return false;
  return fs.existsSync(path.join(ROOT, "html", "posts", postRelPath(a)));
}

function postFile(a) {
  return postRelPath(a);
}

// 記事に画像がないとき（または読み込めないとき）に使う写真。順番に割り当てる。
const DEFAULT_IMAGES = [
  "images/sites/COMMON/mc10_296.webp",
  "images/sites/COMMON/pc_hayama_hoe1.webp",
  "images/sites/COMMON/mc10_316.webp",
  "images/sites/COMMON/pc_hayama_hoe2.webp",
  "images/sites/COMMON/pc_mc10_272.webp"
];

// HTML に入れても安全な文字にする
function escapeHtml(value) {
  return String(value == null ? "" : value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// 「トップ画像」から、最初の1枚の URL を取り出す
function firstImageUrl(imageUrls) {
  if (!imageUrls) return "";
  // 「https://〜」のような記入例は URL として扱わない（ドメイン名まで書かれているものだけ使う）
  const first = String(imageUrls).split(/[\s,、]+/).find(u => /^https?:\/\/[A-Za-z0-9.-]+\.[A-Za-z]{2,}(\/|$)/.test(u));
  return first || "";
}

// 日付とカテゴリのラベル
function metaHtml(a) {
  const slug = categorySlug(a.category);
  const label = displayLabel(a);
  const cat = label
    ? `<span class="news-cat news-cat--${slug}">${escapeHtml(label)}</span>`
    : "";
  return `<span class="news-date">${escapeHtml(a.date)}${cat}</span>`;
}

// Doc に貼った最初の写真（images/posts/年/記事の名前/01.webp）。なければ空
function docCover(a) {
  const rel = `images/posts/${postRelPath(a).replace(/\.html$/, "")}/01.webp`;
  return fs.existsSync(path.join(ROOT, rel)) ? encodeURI(rel) : "";
}

// ページ（html/sites/…）から見た場所にする。https:// の画像はそのまま
const fromPage = p => (/^https?:/i.test(p) ? p : "../../" + p);

function thumb(a, i) {
  const fallback = fromPage(DEFAULT_IMAGES[i % DEFAULT_IMAGES.length]);
  const image = firstImageUrl(a.image_urls) || (docCover(a) && fromPage(docCover(a))) || fallback;
  return `<img src="${escapeHtml(image)}" alt="" loading="lazy" onerror="this.onerror=null;this.src='${fallback}'">`;
}

// 記事ページの本文から、カード用の「書き出し」と「読む時間」を取り出す
function postInfo(a) {
  const file = path.join(ROOT, "html", "posts", postRelPath(a));
  let excerpt = "", minutes = 1;
  try {
    const html = fs.readFileSync(file, "utf-8");
    const start = html.indexOf('<div class="post-body">');
    const end = html.indexOf("</article>", start);
    const body = start >= 0 ? html.slice(start, end > start ? end : undefined) : "";
    const text = s => s.replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/\s+/g, " ").trim();
    const paras = [...body.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/g)].map(m => text(m[1])).filter(t => t.length >= 15);
    excerpt = paras[0] || "";
    if (excerpt.length > 70) excerpt = excerpt.slice(0, 70) + "…";
    minutes = Math.max(1, Math.round(text(body).replace(/\s/g, "").length / 600));   // 日本語はおよそ 1 分で 600 字
  } catch (e) { /* 記事ページが読めないときは書き出しなし */ }
  return { excerpt, minutes };
}

const LOGO = "images/sites/COMMON/chigasaki_logo_touka_v3.webp";
const CLOCK = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 7v5l3 2" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';

// カード 1 枚の中身（写真＋写真の下の帯（クラブ名と読む時間）、分類と日付、題、書き出し）
// thumbClass / bodyClass / titleClass は、トップの NEWS と一覧ページで名前が違うため
function cardInner(a, i, thumbClass, bodyClass, titleClass) {
  const info = postInfo(a);
  const slug = categorySlug(a.category);
  const label = displayLabel(a);
  const cat = label ? `<span class="news-cat news-cat--${slug}">${escapeHtml(label)}</span>` : "";
  const time = `<span class="card-time">${CLOCK}${info.minutes} MIN</span>`;
  return `<span class="${thumbClass} card-media">${thumb(a, i)}<span class="card-overlay"><span class="card-by"><img src="${fromPage(LOGO)}" alt="" loading="lazy">COCC</span>${time}</span></span>
              <span class="${bodyClass} card-body">
                <span class="card-meta">${cat}<span class="card-date">${escapeHtml(a.date)}</span></span>
                <span class="${titleClass} card-title">${escapeHtml(a.title)}</span>
                ${info.excerpt ? `<span class="card-excerpt">${escapeHtml(info.excerpt)}</span>` : ""}
              </span>`;
}

// トップの NEWS の1件分
function renderNewsItem(a, i) {
  return `
      <li class="news-item">
        <a href="${encodeURI("../posts/" + postFile(a))}">
          ${cardInner(a, i, "news-thumb", "news-body", "news-text")}
        </a>
      </li>
    `;
}

// 一覧ページ（news / events / kids）の1件分
function renderCard(a, i) {
  return `          <li class="post-card" data-cat="${categorySlug(a.category) || "none"}" data-event="${eventSlug(a.event) || "none"}">
            <a href="${encodeURI("../posts/" + postFile(a))}">
              ${cardInner(a, i, "post-card-thumb", "post-card-body", "post-card-title")}
            </a>
          </li>`;
}

function renderCards(list, emptyText) {
  if (list.length === 0) {
    return `          <li class="post-cards-empty">${escapeHtml(emptyText)}</li>`;
  }
  return list.map(renderCard).join("\n");
}

// <!-- NAME:START --> と <!-- NAME:END --> のあいだを入れ替える
function replaceBlock(html, name, inner) {
  const re = new RegExp(`(<!-- ${name}:START -->)[\\s\\S]*?(<!-- ${name}:END -->)`);
  if (!re.test(html)) {
    console.warn(`目印 ${name} が見つからないため、飛ばしました`);
    return html;
  }
  return html.replace(re, `$1\n${inner}\n$2`);
}

function updateFile(file, edit) {
  const p = path.join(ROOT, file);
  if (!fs.existsSync(p)) {
    console.warn(`${file} が無いため、飛ばしました`);
    return;
  }
  const before = fs.readFileSync(p, "utf-8");
  const after = edit(before);
  if (after !== before) {
    fs.writeFileSync(p, after, "utf-8");
    console.log(`${file} を更新しました`);
  }
}

async function main() {
  const articles = (await fetchArticles()).filter(isListed);
  articles.sort((a, b) => b.date.localeCompare(a.date) || Number(b.id) - Number(a.id));
  const byCat = name => articles.filter(a => a.category === name);

  // トップの NEWS（5 件）
  const top = articles.slice(0, 5);
  const newsListHtml = top.length
    ? top.map(renderNewsItem).join("\n")
    : `
      <li class="news-item">
        <span class="news-text">まだ記事はありません。</span>
      </li>
    `;
  updateFile("html/sites/index.html", html => html.replace(
    /<ul class="news-right">[\s\S]*?<\/ul>/m,
    `<ul class="news-right">\n${newsListHtml}\n</ul>`
  ));

  // news.html（すべて）
  updateFile("html/sites/news.html", html =>
    replaceBlock(html, "CARDS_ALL", renderCards(articles, "まだ記事はありません。")));

  // events.html（大会・イベント）
  updateFile("html/sites/events.html", html =>
    replaceBlock(html, "CARDS_EVENT", renderCards(articles.filter(a => EVENTS_PAGE_CATEGORIES.includes(a.category)).slice(0, 12), "大会・イベントの記事は、まだありません。")));

  // kids.html（KIDS）
  updateFile("html/sites/kids.html", html =>
    replaceBlock(html, "CARDS_KIDS", renderCards(byCat("KIDS").slice(0, 6), "KIDS の記事は、まだありません。")));

}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
