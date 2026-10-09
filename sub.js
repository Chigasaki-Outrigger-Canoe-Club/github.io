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

// =========================================================
// 年間スケジュール（大会・イベント）
// data/schedule.js のデータ（window.COCC_SCHEDULE）を、年ごとに切り替えて表示する。
// 行を押すと、補足と主催／開催地が開く。
// =========================================================
(function () {
  const app = document.getElementById('scheduleApp');
  const data = window.COCC_SCHEDULE;
  if (!app || !Array.isArray(data) || data.length === 0) return;

  const isEn = (document.documentElement.lang || 'ja').toLowerCase().startsWith('en');
  const years = data.slice().sort((a, b) => b.year - a.year);   // 新しい年が先頭

  function esc(v) {
    return String(v == null ? '' : v)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  // 英語版では en の値を使い、なければ日本語の値を使う
  function pick(item, key) {
    if (isEn && item.en && item.en[key] != null) return item.en[key];
    if (isEn && key !== 'date' && key !== 'name') return (item.en ? '' : item[key]) || '';
    return item[key] || '';
  }

  // 最初に表示する年：URL の ?year=2025 → 今年 → いちばん新しい年
  function initialYear() {
    const q = new URLSearchParams(location.search).get('year');
    const has = y => years.some(d => String(d.year) === String(y));
    if (q && has(q)) return Number(q);
    const now = new Date().getFullYear();
    if (has(now)) return now;
    return years[0].year;
  }

  function render(year) {
    const cur = years.find(d => d.year === year) || years[0];

    const tabs = years.map(d =>
      '<button type="button" class="year-tab" data-year="' + d.year + '"' +
      (d.year === cur.year ? ' aria-pressed="true"' : ' aria-pressed="false"') + '>' + d.year + '</button>'
    ).join('');

    const rows = cur.items.map(item => {
      const name = esc(pick(item, 'name'));
      const detail = esc(pick(item, 'detail'));
      const note = esc(pick(item, 'note'));
      const place = esc(pick(item, 'place'));
      const link = item.link ? esc(item.link) : '';
      const more = (note || detail || place || link);
      return '<li class="sched-row' + (more ? ' has-more' : '') + '"' + (more ? ' tabindex="0" role="button" aria-expanded="false"' : '') + '>' +
        '<span class="sched-date">' + esc(pick(item, 'date')) + '</span>' +
        '<span class="sched-main">' +
          '<span class="sched-name">' + name + (detail ? '<span class="sched-detail">' + detail + '</span>' : '') + '</span>' +
          '<span class="sched-more">' +
            (note ? '<span class="sched-note">' + note + '</span>' : '') +
            (place ? '<span class="sched-place">' + place + '</span>' : '') +
            (link ? '<a class="sched-link" href="' + link + '">' + (isEn ? 'Event page' : '大会ページを見る') + '</a>' : '') +
          '</span>' +
        '</span>' +
      '</li>';
    }).join('');

    const prov = cur.provisional
      ? '<p class="sched-prov">' + (isEn
          ? cur.year + ': provisional content. <span class="kari">[TBC]</span>'
          : cur.year + '年の内容は仮のものです。<span class="kari">【仮】</span>') + '</p>'
      : '';
    const foot = (isEn ? cur.footnote_en : cur.footnote) || '';

    app.innerHTML =
      '<div class="year-nav" role="group" aria-label="' + (isEn ? 'Year' : '年の切り替え') + '">' + tabs + '</div>' +
      prov +
      '<p class="sched-hint">' + (isEn ? 'Tap a row for details.' : '行を押すと、くわしい内容が開きます。') + '</p>' +
      '<ul class="sched-list">' + rows + '</ul>' +
      (foot ? '<p class="sched-foot">※ ' + esc(foot) + '</p>' : '');
  }

  function toggle(row) {
    const open = row.classList.toggle('is-open');
    row.setAttribute('aria-expanded', open ? 'true' : 'false');
  }

  app.addEventListener('click', e => {
    const tab = e.target.closest('.year-tab');
    if (tab) {
      const y = Number(tab.dataset.year);
      render(y);
      // 開いている年を URL に残す（共有や「戻る」で同じ年が開く）
      const url = new URL(location.href);
      url.searchParams.set('year', y);
      history.replaceState(null, '', url);
      return;
    }
    if (e.target.closest('a')) return;            // リンクはそのまま移動
    const row = e.target.closest('.sched-row.has-more');
    if (row) toggle(row);
  });
  app.addEventListener('keydown', e => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const row = e.target.closest('.sched-row.has-more');
    if (row && e.target === row) { e.preventDefault(); toggle(row); }
  });

  render(initialYear());
})();

// 海外レース挑戦記：まだ用意できていない写真は表示しない
document.querySelectorAll('.story img').forEach(img => {
  img.addEventListener('error', () => img.remove());
  if (img.complete && img.naturalWidth === 0) img.remove();
});

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

// =========================================================
// 左の目次（横幅 1280px 以上のときだけ CSS で表示）
// .page-toc のリンクを写して、画面の左に置く。
// - HERO 画像の下から始まり、スクロールするとヘッダーの下で止まる
// - フッターに重ならないよう、フッターが来たら一緒に上がる
// - 今見ている見出しの項目に色をつける
// =========================================================
(function () {
  const pageToc = document.querySelector('.page-toc');
  if (!pageToc) return;

  const links = Array.from(pageToc.querySelectorAll('a[href^="#"]'));
  // ほかのページへのリンク（初めての方へ・会員案内にある）は、下に「関連ページ」として出す
  const others = Array.from(pageToc.querySelectorAll('a:not([href^="#"])'));
  const items = links
    .map(a => ({ href: a.getAttribute('href'), text: a.textContent.trim(), target: document.querySelector(a.getAttribute('href')) }))
    .filter(i => i.target);
  if (items.length === 0) return;

  const aside = document.createElement('aside');
  aside.className = 'side-toc';
  aside.setAttribute('aria-label', pageToc.getAttribute('aria-label') || 'Contents');
  aside.innerHTML = '<p class="side-toc-label">CONTENTS</p><div class="side-toc-track"><span class="side-toc-bar" aria-hidden="true"></span><ol></ol></div>';
  const list = aside.querySelector('ol');
  const bar = aside.querySelector('.side-toc-bar');

  items.forEach(i => {
    const li = document.createElement('li');
    const a = document.createElement('a');
    a.href = i.href;
    a.textContent = i.text;
    a.addEventListener('click', e => {
      e.preventDefault();
      window.scrollTo({ top: i.target.getBoundingClientRect().top + window.scrollY - 80, behavior: 'smooth' });
      history.replaceState(null, '', i.href);
    });
    li.appendChild(a);
    list.appendChild(li);
    i.link = a;
  });

  if (others.length) {
    const more = document.createElement('ul');
    more.className = 'side-toc-more';
    others.forEach(o => {
      const li = document.createElement('li');
      const a = document.createElement('a');
      a.href = o.getAttribute('href');
      a.textContent = o.textContent.trim();
      li.appendChild(a);
      more.appendChild(li);
    });
    aside.appendChild(more);
  }

  document.body.appendChild(aside);
  document.body.classList.add('has-side-toc');

  const wide = window.matchMedia('(min-width: 1280px)');
  const startEl = document.querySelector('.next-race') || document.querySelector('.page-hero');
  const headerEl = document.querySelector('.site-header');
  const footerEl = document.querySelector('.site-footer');
  let current = null;
  let ticking = false;

  function place() {
    const headerH = headerEl ? headerEl.offsetHeight : 0;
    const start = startEl ? startEl.getBoundingClientRect().bottom + 56 : headerH + 40;
    let top = Math.max(headerH + 40, start);
    if (footerEl) {
      const limit = footerEl.getBoundingClientRect().top - aside.offsetHeight - 40;
      top = Math.min(top, limit);
    }
    aside.style.transform = 'translateY(' + Math.round(top) + 'px)';
  }

  function highlight() {
    const line = window.innerHeight * 0.35;
    let active = items[0];
    items.forEach(i => { if (i.target.getBoundingClientRect().top <= line) active = i; });
    // いちばん下までスクロールしたら、最後の項目
    if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4) {
      active = items[items.length - 1];
    }
    if (active === current) return;
    current = active;
    items.forEach(i => i.link.classList.toggle('is-active', i === active));
    bar.style.transform = 'translateY(' + active.link.parentNode.offsetTop + 'px)';
    bar.style.height = active.link.parentNode.offsetHeight + 'px';
    bar.style.opacity = '1';
  }

  function update() {
    ticking = false;
    if (!wide.matches) return;
    place();
    highlight();
  }

  function requestUpdate() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(update);
  }

  window.addEventListener('scroll', requestUpdate, { passive: true });
  window.addEventListener('resize', () => { current = null; requestUpdate(); });
  if (wide.addEventListener) wide.addEventListener('change', () => { current = null; requestUpdate(); });
  window.addEventListener('load', () => { current = null; update(); aside.classList.add('is-ready'); });
  update();
  requestAnimationFrame(() => aside.classList.add('is-ready'));
})();
