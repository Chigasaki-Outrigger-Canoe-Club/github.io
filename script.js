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
