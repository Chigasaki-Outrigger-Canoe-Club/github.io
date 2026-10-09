// ===============================
// スムーススクロール
// ===============================
document.querySelectorAll('a[href^="#"]').forEach(a=>{
  a.addEventListener('click', e=>{
    e.preventDefault();
    const target = document.querySelector(a.getAttribute('href'));
    if(!target) return;
    window.scrollTo({ top: target.offsetTop - 60, behavior:"smooth" });
  });
});

// ===============================
// フェードイン（スクロール）
// ===============================
const fadeTargets = document.querySelectorAll('.fade-target');

function fadeInOnScroll(){
  fadeTargets.forEach(el=>{
    const rect = el.getBoundingClientRect();
    if(rect.top < window.innerHeight - 80){
      el.classList.add('fade-in');
    }
  });
}

window.addEventListener('scroll', fadeInOnScroll);
window.addEventListener('load', fadeInOnScroll);

// ===============================
// ハンバーガーメニュー
// ===============================
const menuBtn = document.getElementById('menuBtn');
const globalNav = document.getElementById('globalNav');

menuBtn.addEventListener('click', ()=>{
  menuBtn.classList.toggle('active');
  globalNav.classList.toggle('nav-open');
});

// ===============================
// ヘッダー透明 → 黒背景切り替え
// ===============================
const header = document.querySelector('.site-header');

window.addEventListener('scroll', () => {
  if (window.scrollY > 40) {
    header.classList.add('scrolled');
  } else {
    header.classList.remove('scrolled');
  }
});

// ===============================
// 背景フェード式スライドショー
// ===============================
let images;
if (window.innerWidth > 900) {
  // ★ PC用画像セット
  images = [
    "images/site/hero/pc_hayama_hoe1.jpg",
    "images/site/hero/pc_mc10_272.jpg",
    "images/site/hero/pc_hayama_hoe2.jpg",
    "images/site/hero/pc_mc10_368.jpg"
  ];
} else {
  // ★ スマホ用画像セット
  images = [
    "images/site/hero/mobile_hayama_hoe1.jpg",
    "images/site/hero/mobile_mc10_033.jpg",
    "images/site/hero/mobile_hayama_hoe2.jpg",
    "images/site/hero/mobile_mc10_015.jpg"
  ];
}
// ===============================
// ★ 画像プリロード（裏で読み込む）
// ===============================
const preloaded = [];

images.forEach(src => {
  const img = new Image();
  img.src = src;
  preloaded.push(img);
});

// ===============================
// スライドショー
// ===============================

let index = 0;
const bg1 = document.querySelector('.bg1');
const bg2 = document.querySelector('.bg2');

bg1.style.backgroundImage = `url(${images[0]})`;
bg2.style.backgroundImage = `url(${images[0]})`;

function changeImage() {
  index = (index + 1) % images.length;

  bg2.style.backgroundImage = `url(${images[index]})`;
  bg2.style.opacity = 1;

  setTimeout(() => {
    bg1.style.backgroundImage = bg2.style.backgroundImage;
    bg2.style.opacity = 0;
  }, 1000);
}

// 静止 + フェード = 7秒ごとに切り替え
setInterval(changeImage, 6500);

// ===============================
// NEWS：横に流せるときの現在位置バー
// ===============================
(function () {
  const list = document.querySelector('.news-right');
  const bar = document.querySelector('.news-progress');
  if (!list || !bar) return;
  const thumb = bar.querySelector('span');

  function updateNewsProgress() {
    const max = list.scrollWidth - list.clientWidth;
    // 流す余地がなければバーを出さない
    if (max <= 4) { bar.classList.remove('is-active'); return; }
    bar.classList.add('is-active');
    const ratio = list.clientWidth / list.scrollWidth;      // バーの長さ＝見えている割合
    const pos = list.scrollLeft / max;                      // 0（先頭）〜1（末尾）
    thumb.style.width = (ratio * 100) + '%';
    thumb.style.left = (pos * (1 - ratio) * 100) + '%';
  }

  list.addEventListener('scroll', updateNewsProgress, { passive: true });
  window.addEventListener('resize', updateNewsProgress);
  window.addEventListener('load', updateNewsProgress);
  updateNewsProgress();
})();

// ===============================
// メニューの中の小さな項目（「＋」を押すと開く）
// ===============================
document.querySelectorAll('.global-nav .sub-toggle').forEach(btn => {
  btn.addEventListener('click', () => {
    const li = btn.closest('li');
    const open = li.classList.toggle('is-open');
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
  });
});

// メニューの中のリンクを押したら、メニューを閉じる（同じページ内の移動でも開いたままにしない）
document.querySelectorAll('.global-nav a').forEach(a => {
  a.addEventListener('click', () => {
    const nav = document.getElementById('globalNav');
    const btn = document.getElementById('menuBtn');
    if (nav) nav.classList.remove('nav-open');
    if (btn) btn.classList.remove('active');
  });
});
