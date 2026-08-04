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
  // ★ スマホ用画像セット
  images = [
    "images/hayama_hoe1.jpg",
    "images/hayama_hoe12.jpg",
    "images/kaioumaru.jpg",
    "images/JOCA1.jpg"
  ];
} else {
  // ★ PC用画像セット
  images = [
    "images/hayama_hoe1_mobile.jpg",
    "images/hayama_hoe2_mobile.jpg",
    "images/kaioumaru_mobile.jpg",
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
// スライドショー本体
// ===============================

let index = 0;
// const bg = document.querySelector('.hero-bg'); // ← HTMLに追加したレイヤー

/*function changeImage() {
  bg.style.opacity = 0; // フェードアウト

  setTimeout(() => {
    // ★ 先に index を進める（ここが重要）
    index = (index + 1) % images.length;

    // ★ 次の画像をセット
    bg.style.backgroundImage = `url(${images[index]})`;

    bg.style.opacity = 1; // フェードイン
  }, 1800);
}*/

const bg1 = document.querySelector('.bg1');
const bg2 = document.querySelector('.bg2');

// 初期画像（1枚目）
bg1.style.backgroundImage = `url(${images[0]})`;

function changeImage() {
  index = (index + 1) % images.length;

  bg2.style.backgroundImage = `url(${images[index]})`;
  bg2.style.opacity = 1;

  setTimeout(() => {
    bg1.style.backgroundImage = bg2.style.backgroundImage;
    bg2.style.opacity = 0;
  }, 1500);
}

// 初期画像（1枚目）
//bg.style.backgroundImage = `url(${images[0]})`;

// 静止 + フェード = 8秒ごとに切り替え
setInterval(changeImage, 8000);