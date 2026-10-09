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
  // 記事ページ（posts/・overseas/）は、記事に目次があるときだけ出す（ページ一覧は出さない）
  const isPost = document.body.classList.contains('post-page');
  const pageToc = document.querySelector('.page-toc');
  if (isPost && !pageToc) return;

  const links = pageToc ? Array.from(pageToc.querySelectorAll('a[href^="#"]')) : [];
  const items = links
    .map(a => ({ href: a.getAttribute('href'), text: a.textContent.trim(), target: document.querySelector(a.getAttribute('href')) }))
    .filter(i => i.target);

  // 下に並べるほかのページ：
  // そのページだけの関連リンク（.page-toc の中のほかのページへのリンク）＋ メニューのページ（今のページは除く）
  const here = location.pathname.replace(/\/$/, '/index.html');
  const seen = new Set([here]);
  const pages = [];
  function addPage(a) {
    const url = new URL(a.getAttribute('href'), location.href);
    const key = url.pathname + url.hash;
    if (url.origin !== location.origin || seen.has(key) || (!url.hash && url.pathname === here)) return;
    seen.add(key);
    pages.push({ href: a.getAttribute('href'), text: a.textContent.trim() });
  }
  if (pageToc) pageToc.querySelectorAll('a:not([href^="#"])').forEach(addPage);
  if (!isPost) document.querySelectorAll('#globalNav > ul > li > a').forEach(addPage);

  if (items.length === 0 && pages.length === 0) return;

  const aside = document.createElement('aside');
  aside.className = 'side-toc';
  aside.setAttribute('aria-label', (pageToc && pageToc.getAttribute('aria-label')) || 'Contents');
  if (items.length) {
    aside.innerHTML = '<p class="side-toc-label">CONTENTS</p><div class="side-toc-track"><span class="side-toc-bar" aria-hidden="true"></span><ol></ol></div>';
  } else {
    aside.classList.add('side-toc--pages-only');
  }
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

  if (pages.length) {
    const more = document.createElement('ul');
    more.className = 'side-toc-more';
    pages.forEach(o => {
      const li = document.createElement('li');
      const a = document.createElement('a');
      a.href = o.href;
      a.textContent = o.text;
      li.appendChild(a);
      more.appendChild(li);
    });
    aside.appendChild(more);
  }

  document.body.appendChild(aside);
  document.body.classList.add('has-side-toc');

  const wide = window.matchMedia('(min-width: 1280px)');
  const startEl = document.querySelector('.next-race') || document.querySelector('.page-hero') || document.querySelector('.post-head');
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
    if (items.length === 0) return;
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

// =========================================================
// news.html：カテゴリで絞り込む（?cat=report のように URL でも指定できる）
// =========================================================
(function () {
  const list = document.getElementById('newsCards');
  const buttons = document.querySelectorAll('.news-filter-btn');
  if (!list || buttons.length === 0) return;
  const none = document.getElementById('newsNone');
  const valid = Array.from(buttons).map(b => b.dataset.filter);

  function apply(filter) {
    if (!valid.includes(filter)) filter = 'all';
    buttons.forEach(b => {
      const on = b.dataset.filter === filter;
      b.classList.toggle('is-active', on);
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
    let shown = 0;
    list.querySelectorAll('.post-card').forEach(card => {
      const hit = filter === 'all' || card.dataset.cat === filter || card.dataset.event === filter;
      card.hidden = !hit;
      if (hit) shown++;
    });
    const hasCards = list.querySelector('.post-card') !== null;
    if (none) none.hidden = !hasCards || shown > 0;
  }

  buttons.forEach(b => b.addEventListener('click', () => {
    apply(b.dataset.filter);
    const url = new URL(location.href);
    if (b.dataset.filter === 'all') url.searchParams.delete('cat'); else url.searchParams.set('cat', b.dataset.filter);
    history.replaceState(null, '', url);
  }));

  apply(new URLSearchParams(location.search).get('cat') || 'all');
})();

// =========================================================
// ページのあいだを移る道しるべ
// 1) 戻るリンク：<body data-back="行き先" data-back-label="名前"> があるページ
//    - 写真（HERO）があるページ：HERO の下に「← 名前」
//    - 記事のページ：記事のタイトルの上に「← 名前」
// 2) 前後のページ（フッターの上）：
//    - メニューにあるページ：メニューの順に「← 前のページ」「次のページ →」（両端はトップページ）
//    - 大会・イベントの個別ページ：「← 大会・イベント」だけ
// =========================================================
(function () {
  const body = document.body;
  const en = document.documentElement.lang === 'en';
  const backHref = body.getAttribute('data-back');
  const backLabel = body.getAttribute('data-back-label') || (en ? 'Back' : '戻る');
  const isPost = body.classList.contains('post-page');

  const link = (href, text, cls) => {
    const a = document.createElement('a');
    a.href = href;
    a.className = cls;
    a.textContent = text;
    return a;
  };

  // 1) 戻るリンク
  if (backHref) {
    const wrap = document.createElement('div');
    wrap.className = 'hero-back';
    wrap.appendChild(link(backHref, backLabel, 'hero-back-link'));
    const after = document.querySelector('.next-race') || document.querySelector('.page-hero');
    const postInner = document.querySelector('.post-inner');
    if (after) after.insertAdjacentElement('afterend', wrap);
    else if (postInner) { wrap.classList.add('hero-back--post'); postInner.insertBefore(wrap, postInner.firstChild); }
  }

  // 2) 前後のページ
  const footer = document.querySelector('.site-footer');
  if (!footer || isPost || body.getAttribute('data-pager') === 'off') return;
  const logo = document.querySelector('.site-header .logo-area a');
  const top = { href: logo ? logo.getAttribute('href') : 'index.html', text: en ? 'Top page' : 'トップページ' };
  const items = Array.from(document.querySelectorAll('#globalNav > ul > li > a'))
    .map(a => ({ href: a.getAttribute('href'), text: a.textContent.trim(), path: new URL(a.getAttribute('href'), location.href).pathname }));
  const here = location.pathname;
  const i = items.findIndex(it => it.path === here);

  let prev = null, next = null;
  if (i >= 0) {
    prev = i > 0 ? items[i - 1] : top;
    next = i < items.length - 1 ? items[i + 1] : top;
  } else if (backHref && !document.querySelector('.archive-notice')) {
    prev = { href: backHref, text: backLabel };       // 大会・イベントの個別ページ
  } else {
    return;
  }

  const nav = document.createElement('nav');
  nav.className = 'page-pager';
  nav.setAttribute('aria-label', en ? 'Other pages' : 'ほかのページへ');
  const cell = (it, dir) => {
    if (!it) { const s = document.createElement('span'); s.className = 'page-pager-empty'; return s; }
    const a = document.createElement('a');
    a.href = it.href;
    a.className = `page-pager-link page-pager-link--${dir}`;
    a.innerHTML = `<span class="page-pager-dir">${dir === 'prev' ? 'PREV' : 'NEXT'}</span><span class="page-pager-name"></span>`;
    a.querySelector('.page-pager-name').textContent = it.text;
    return a;
  };
  nav.appendChild(cell(prev, 'prev'));
  nav.appendChild(cell(next, 'next'));
  footer.parentNode.insertBefore(nav, footer);
})();

// =========================================================
// 横にスクロールするカードの列（大会・イベントの記事）
// 下のバーで「今どのあたりか」を見せ、← → のボタンでも動かせる
// =========================================================
document.querySelectorAll('.scroll-ctrl').forEach(ctrl => {
  const list = document.getElementById(ctrl.dataset.for);
  if (!list) return;
  const thumb = ctrl.querySelector('.scroll-progress span');
  const prev = ctrl.querySelector('.scroll-btn--prev');
  const next = ctrl.querySelector('.scroll-btn--next');

  function update() {
    const max = list.scrollWidth - list.clientWidth;
    ctrl.classList.toggle('is-active', max > 4);           // 流す余地がなければ隠す
    if (max <= 4) return;
    const ratio = list.clientWidth / list.scrollWidth;
    const pos = list.scrollLeft / max;
    thumb.style.width = (ratio * 100) + '%';
    thumb.style.left = (pos * (1 - ratio) * 100) + '%';
    prev.disabled = list.scrollLeft <= 2;
    next.disabled = list.scrollLeft >= max - 2;
  }

  const step = dir => {
    const card = list.querySelector('.post-card');
    const w = card ? card.getBoundingClientRect().width + 18 : list.clientWidth * 0.8;
    list.scrollBy({ left: dir * w, behavior: 'smooth' });
  };
  prev.addEventListener('click', () => step(-1));
  next.addEventListener('click', () => step(1));
  list.addEventListener('scroll', update, { passive: true });
  window.addEventListener('resize', update);
  window.addEventListener('load', update);
  update();
});
