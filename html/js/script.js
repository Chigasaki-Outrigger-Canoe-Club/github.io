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
    "../../images/sites/COMMON/pc_hayama_hoe1.webp",
    "../../images/sites/COMMON/pc_mc10_272.webp",
    "../../images/sites/COMMON/pc_hayama_hoe2.webp",
    "../../images/sites/TOP/pc_mc10_368.webp"
  ];
} else {
  // ★ スマホ用画像セット
  images = [
    "../../images/sites/COMMON/mobile_hayama_hoe1.webp",
    "../../images/sites/TOP/mobile_mc10_033.webp",
    "../../images/sites/TOP/mobile_hayama_hoe2.webp",
    "../../images/sites/TOP/mobile_mc10_015.webp"
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

// Esc キーでメニューを閉じる
document.addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  const nav = document.getElementById('globalNav');
  const btn = document.getElementById('menuBtn');
  if (nav && nav.classList.contains('nav-open')) {
    nav.classList.remove('nav-open');
    if (btn) btn.classList.remove('active');
  }
});

// PC のメニュー：一番上に「トップページ」へのリンクを置く（ロゴと同じ行き先）
(function () {
  const nav = document.getElementById('globalNav');
  const logo = document.querySelector('.site-header .logo-area a');
  if (!nav || !logo || nav.querySelector('.nav-top')) return;
  const en = (document.documentElement.lang || '').startsWith('en');
  const a = document.createElement('a');
  a.className = 'nav-top';
  a.href = logo.getAttribute('href');
  a.textContent = en ? 'Top page' : 'トップページ';
  nav.insertBefore(a, nav.firstChild);
})();

// フッター：ページの一覧（トップページ＋メニューの項目）と、Instagram・Facebook のアイコン
// 一覧はメニューから作るので、メニューを変えればフッターも変わる
(function () {
  const inner = document.querySelector('.site-footer .footer-inner');
  if (!inner || inner.querySelector('.footer-menu')) return;
  const en = (document.documentElement.lang || '').startsWith('en');
  const logo = document.querySelector('.site-header .logo-area a');
  const links = [];
  if (logo) links.push({ href: logo.getAttribute('href'), text: en ? 'Top page' : 'トップページ' });
  document.querySelectorAll('#globalNav > ul > li > a').forEach(a => links.push({ href: a.getAttribute('href'), text: a.textContent.trim() }));
  if (links.length > 1) {
    const box = document.createElement('nav');
    box.className = 'footer-menu';
    box.setAttribute('aria-label', en ? 'Site menu' : 'サイトのページ');
    box.innerHTML = '<p class="footer-label">MENU</p><ul></ul>';
    const ul = box.querySelector('ul');
    links.forEach(o => {
      const li = document.createElement('li');
      const a = document.createElement('a');
      a.href = o.href;
      a.textContent = o.text;
      li.appendChild(a);
      ul.appendChild(li);
    });
    const right = inner.querySelector('.footer-right');
    inner.insertBefore(box, right || null);
  }
  const icons = {
    instagram: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1.2" fill="currentColor" stroke="none"/></svg>',
    facebook: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M22 12a10 10 0 1 0-11.56 9.88v-6.99H7.9V12h2.54V9.8c0-2.5 1.49-3.89 3.78-3.89 1.09 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56V12h2.78l-.44 2.89h-2.34v6.99A10 10 0 0 0 22 12z"/></svg>'
  };
  inner.querySelectorAll('.footer-sns a').forEach(a => {
    const href = a.getAttribute('href') || '';
    const key = /instagram/.test(href) ? 'instagram' : /facebook/.test(href) ? 'facebook' : '';
    if (key && !a.querySelector('svg')) a.insertAdjacentHTML('beforeend', icons[key]);
  });
})();
