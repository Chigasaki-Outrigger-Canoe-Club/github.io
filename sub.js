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
