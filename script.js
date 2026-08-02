// ===============================
// 1. スムーススクロール
// ===============================
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function (e) {
    const targetId = this.getAttribute('href');
    const target = document.querySelector(targetId);

    if (!target) return;

    e.preventDefault();
    window.scrollTo({
      top: target.offsetTop - 60,
      behavior: "smooth"
    });
  });
});


// ===============================
// 2. スクロールでフェードイン
// ===============================
const fadeElements = document.querySelectorAll('.section, .hero-copy, .hero-image');

const fadeInOnScroll = () => {
  fadeElements.forEach(el => {
    const rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight - 80) {
      el.classList.add('fade-in');
    }
  });
};

window.addEventListener('scroll', fadeInOnScroll);
window.addEventListener('load', fadeInOnScroll);


// ===============================
// 3. ヘッダーの背景をスクロールで濃くする
// ===============================
const header = document.querySelector('.site-header');

window.addEventListener('scroll', () => {
  if (window.scrollY > 40) {
    header.classList.add('header-solid');
  } else {
    header.classList.remove('header-solid');
  }
});


// ===============================
// 4. スマホメニュー開閉（CSS追加で動く）
// ===============================
const menuBtn = document.querySelector('.menu-btn');
const nav = document.querySelector('.global-nav');

if (menuBtn) {
  menuBtn.addEventListener('click', () => {
    nav.classList.toggle('nav-open');
    menuBtn.classList.toggle('active');
  });
}


// ===============================
// 5. ボタンの軽いアニメーション
// ===============================
document.querySelectorAll('.btn-primary, .btn-secondary').forEach(btn => {
  btn.addEventListener('mouseenter', () => {
    btn.classList.add('hovered');
  });
  btn.addEventListener('mouseleave', () => {
    btn.classList.remove('hovered');
  });
});
