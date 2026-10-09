// =========================================================
// post_template.js  記事ページ（posts/年/*.html）のひな形
// サイト共通のヘッダー・フッターと CSS（style.css / nav.css / sub.css）を
// 読み込む形で、記事の HTML を組み立てる。
// Google の認証を使わないので、このファイルだけで動作を確認できる。
// =========================================================

const SITE_URL = "https://chigasaki-outrigger-canoe-club.github.io/github.io/";
const SITE_NAME = "茅ヶ崎アウトリガーカヌークラブ";

// HTML に入れても安全な文字にする
function escapeHtml(value) {
  return String(value == null ? "" : value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// 「画像url(複数可)」から、URL として使えるものだけを取り出す
function imageUrls(value) {
  if (!value) return [];
  return String(value)
    .split(/[\s,、]+/)
    .filter(u => /^https?:\/\/[A-Za-z0-9.-]+\.[A-Za-z]{2,}(\/|$)/.test(u));
}

// カテゴリ（スプレッドシートの notes 列）。空や「無し」は表示しない
function categoryLabel(value) {
  const v = String(value == null ? "" : value).trim();
  if (!v || ["無し", "なし", "-", "—"].includes(v)) return "";
  return v;
}

// 2026-08-07 → 2026.08.07
function displayDate(date) {
  return String(date || "").replace(/-/g, ".");
}

const { postRelPath } = require("./post_paths");

function buildPostHtml(article, bodyHtml) {
  // Google ドキュメント由来の制御文字などを取り除く
  const cleanedHtml = String(bodyHtml || "")
    .replace(/\u000B/g, "<br>")
    .replace(/[\u0000-\u001F]/g, "<br>")
    .replace(/rgb\((\d+),\s*NaN,\s*NaN\)/g, "rgb($1,0,0)")
    .replace(/NaN/g, "0");

  const title = escapeHtml(article.title);
  const date = escapeHtml(article.date);
  const category = escapeHtml(categoryLabel(article.category));
  const fileName = postRelPath(article);
  const images = imageUrls(article.image_urls);

  const imagesHtml = images.length
    ? `
        <ul class="post-images">
${images.map(u => `          <li><img src="${escapeHtml(u)}" alt="" loading="lazy" onerror="this.parentNode.style.display='none'"></li>`).join("\n")}
        </ul>`
    : "";

  const entryHtml = article.entry_url
    ? `
        <p class="post-entry"><a class="btn" href="${escapeHtml(article.entry_url)}" target="_blank" rel="noopener">参加する</a></p>`
    : "";

  return `<!DOCTYPE html>
<html lang="ja">
  <head>
  <meta charset="UTF-8">
  <title>${title}｜${SITE_NAME}</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <!-- SNS や LINE で共有したときに出る情報（OGP） -->
  <meta property="og:type" content="article">
  <meta property="og:site_name" content="${SITE_NAME}">
  <meta property="og:title" content="${title}｜${SITE_NAME}">
  <meta property="og:url" content="${SITE_URL}posts/${escapeHtml(fileName)}">
  <meta property="og:image" content="${escapeHtml(images[0] || SITE_URL + "images/site/ogp.png")}">
  <meta property="og:locale" content="ja_JP">
  <meta name="twitter:card" content="summary_large_image">

  <link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&display=swap" rel="stylesheet">
  <!-- サイト共通の CSS（記事は posts/年/ の中にあるので ../../ で読み込む） -->
  <link rel="stylesheet" href="../../style.css">
  <link rel="stylesheet" href="../../nav.css">
  <link rel="stylesheet" href="../../sub.css">
  <link rel="stylesheet" href="../../theme.css">
  </head>

  <body class="post-page">

    <header class="site-header">
      <div class="header-inner">
        <div class="logo-area">
          <a href="../../index.html">
            <img src="../../images/site/header/chigasaki_logo_touka_v3.png" class="header-logo" alt="${SITE_NAME}">
          </a>
          <span class="logo-text-pc">CHIGASAKI OUTRIGGER CANOE CLUB</span>
          <span class="logo-text-mobile">COCC</span>
        </div>

        <div class="lang-switch"><a href="../../index.html" lang="ja" aria-current="true">JP</a><span aria-hidden="true">/</span><a href="../../en/index.html" lang="en">EN</a></div>
        <div class="menu-btn" id="menuBtn">
          <span></span><span></span><span></span>
        </div>

        <nav class="global-nav" id="globalNav">
          <ul>
            <li><a href="../../about.html">クラブについて</a></li>
            <li><a href="../../beginners.html">初めての方へ</a></li>
            <li class="has-sub"><a href="../../membership.html">会員案内</a><button type="button" class="sub-toggle" aria-expanded="false" aria-label="会員案内の中を開く"></button>
              <ul class="sub-menu">
                <li><a href="../../membership.html#fee">会費</a></li>
                <li><a href="../../membership.html#time">活動時間</a></li>
              </ul>
            </li>
            <li><a href="../../safety.html">安全管理</a></li>
            <li><a href="../../kids.html">COCC KIDS</a></li>
            <li class="has-sub"><a href="../../events.html">大会・イベント</a><button type="button" class="sub-toggle" aria-expanded="false" aria-label="大会・イベントの中を開く"></button>
              <ul class="sub-menu">
                <li><a href="../../events.html#event-schedule">年間スケジュール</a></li>
                <li><a href="../../oshima.html">大島クロッシング</a></li>
                <li><a href="../../hukilau.html">Hukilau Challenge</a></li>
                <li><a href="../../hoaikane.html">Women's Ho'aikane</a></li>
              </ul>
            </li>
            <li class="has-sub"><a href="../../contact.html">お問い合わせ</a><button type="button" class="sub-toggle" aria-expanded="false" aria-label="お問い合わせの中を開く"></button>
              <ul class="sub-menu">
                <li><a href="../../contact.html#access">アクセス</a></li>
              </ul>
            </li>
            <li><a href="../../faq.html">FAQ</a></li>
          </ul>
        </nav>
      </div>
    </header>

    <main class="post">
      <article class="post-inner">
        <p class="post-back"><a href="../../news.html">NEWS</a></p>

        <header class="post-head">
          <p class="post-meta">
            <time class="post-date" datetime="${date}">${escapeHtml(displayDate(article.date))}</time>${category ? `
            <span class="post-category">${category}</span>` : ""}
          </p>
          <h1 class="post-title">${title}</h1>
        </header>

        <div class="post-body">
          ${cleanedHtml}
        </div>
${imagesHtml}${entryHtml}

        <p class="post-foot"><a class="btn" href="../../news.html">NEWS一覧へ戻る</a></p>
      </article>
    </main>

    <footer class="site-footer">
      <div class="footer-inner">
        <div class="footer-left">
          <p class="footer-title">CHIGASAKI OUTRIGGER CANOE CLUB</p>
          <p class="footer-copy">©2026 CHIGASAKI OUTRIGGER CANOE CLUB</p>
        </div>
        <div class="footer-right">
          <p class="footer-label">FOLLOW US</p>
          <ul class="footer-sns">
            <li><a href="https://www.instagram.com/cocc_chigasaki/" target="_blank" rel="noopener">Instagram</a></li>
            <li><a href="https://www.facebook.com/pacificbeachclub/?locale=ja_JP" target="_blank" rel="noopener">Facebook</a></li>
          </ul>
        </div>
      </div>
    </footer>

    <script src="../../sub.js"></script>

  </body>
</html>
`;
}

module.exports = { buildPostHtml, escapeHtml, imageUrls, categoryLabel };
