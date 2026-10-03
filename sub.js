// =========================================================
// sub.js  サブページ共通の動き
// トップページの script.js から、スライドショー以外の部分を
// 取り出したもの（script.js は変更していない）。
// =========================================================

// ページ内リンクのスムーススクロール
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', e => {
    const target = document.querySelector(a.getAttribute('href'));
    if (!target) return;
    e.preventDefault();
    window.scrollTo({ top: target.offsetTop - 60, behavior: "smooth" });
  });
});

// ハンバーガーメニュー
const menuBtn = document.getElementById('menuBtn');
const globalNav = document.getElementById('globalNav');

if (menuBtn && globalNav) {
  menuBtn.addEventListener('click', () => {
    menuBtn.classList.toggle('active');
    globalNav.classList.toggle('nav-open');
  });
}

// ヘッダー透明 → 黒背景切り替え
const header = document.querySelector('.site-header');

function updateHeader() {
  if (!header) return;
  if (window.scrollY > 40) {
    header.classList.add('scrolled');
  } else {
    header.classList.remove('scrolled');
  }
}

window.addEventListener('scroll', updateHeader);
window.addEventListener('load', updateHeader);
