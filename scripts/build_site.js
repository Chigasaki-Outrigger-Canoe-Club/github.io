// 公開用のサイトを _site/ に組み立てる。
//
// GitHub の中では html/sites/・html/posts/ … と分けて管理しているが、
// 見る人の URL にはフォルダ名と「.html」を出さない。
//   html/sites/kids.html            → /kids
//   html/sites/en/kids.html         → /en/kids
//   html/sites/index.html           → /
//   html/posts/2026/xxx.html        → /posts/2026/xxx
//   html/archive/2027/hukilau.html  → /archive/2027/hukilau
//   html/css/・html/js/             → /css/・/js/
//   images/・data/・site.webmanifest → そのまま
// ファイルを移したうえで、中のリンク・画像の場所を新しい場所に書き直す。
// docs/・scripts/ などは公開しない。
//
// 使い方：node scripts/build_site.js（GitHub Actions「サイトを公開」が自動で動かす）

const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const OUT = path.join(ROOT, "_site");

// 記事などの中に書かれている、元のサイトの住所
const SOURCE_URL = "https://chigasaki-outrigger-canoe-club.github.io/github.io/";
// 公開するサイトの住所。独自ドメインを取ったら、ここを書き換える（例："https://cocc.jp/"）
const PUBLIC_URL = "https://chigasaki-outrigger-canoe-club.github.io/github.io/";

const P = path.posix;

// 元の場所（リポジトリの中のパス）→ 公開する場所。公開しないものは null
function toPublic(src) {
  const rules = [
    ["html/sites/", ""],
    ["html/posts/", "posts/"],
    ["html/archive/", "archive/"],
    ["html/css/", "css/"],
    ["html/js/", "js/"],
    ["images/", "images/"],
    ["data/", "data/"],
  ];
  for (const [from, to] of rules) if (src.startsWith(from)) return to + src.slice(from.length);
  if (src === "site.webmanifest") return src;
  return null;
}

// ページの URL から「.html」と「index.html」を外す
function pageUrl(pub) {
  if (pub === "index.html") return "";
  if (pub.endsWith("/index.html")) return pub.slice(0, -"index.html".length);
  if (pub.endsWith(".html")) return pub.slice(0, -".html".length);
  return pub;
}

function relFrom(fromDir, target) {
  const isDir = target === "" || target.endsWith("/");
  let r = P.relative(fromDir || ".", target || ".");
  if (r === "") return "./";
  if (isDir && !r.endsWith("/")) r += "/";
  return r;
}

// 1つのリンクを書き直す。srcDir：元のファイルでリンクを解決するフォルダ、pubDir：公開先のフォルダ
function rewriteRef(ref, srcDir, pubDir) {
  if (!ref) return ref;
  if (ref.startsWith(SOURCE_URL)) {
    const rest = ref.slice(SOURCE_URL.length);
    const m = rest.match(/^([^?#]*)(.*)$/);
    const pub = toPublic(m[1]);
    if (pub === null) return ref;
    return PUBLIC_URL + pageUrl(pub) + m[2];
  }
  if (/^([a-z][a-z0-9+.-]*:|\/\/|#|\/)/i.test(ref)) return ref;
  const m = ref.match(/^([^?#]*)(.*)$/);
  if (!m[1]) return ref;
  const src = P.normalize(P.join(srcDir, m[1]));
  if (src.startsWith("..")) return ref;
  const pub = toPublic(src);
  if (pub === null) return ref;
  return relFrom(pubDir, pageUrl(pub)) + m[2];
}

const ATTR_RE = /(\s(?:href|src|data-src|data-src-sp|data-back|poster|content)=")([^"]*)(")/g;

function rewriteHtml(text, srcFile, pubFile) {
  let srcDir = P.dirname(srcFile);
  let pubDir = P.dirname(pubFile);
  const base = text.match(/<base\s+href="([^"]*)"/i);
  if (base) { srcDir = P.normalize(P.join(srcDir, base[1])); pubDir = P.normalize(P.join(pubDir, base[1])); }
  if (srcDir === ".") srcDir = "";
  if (pubDir === ".") pubDir = "";
  const fix = r => rewriteRef(r, srcDir, pubDir);

  return text
    .replace(/<base\s[^>]*>/gi, m => m.replace(/href=/, "\u0000HREF=")) // base は書き直さない
    .replace(ATTR_RE, (all, a, v, b) => {
      if (a.includes("content=") && !v.startsWith(SOURCE_URL)) return all;
      return a + fix(v) + b;
    })
    .replace(/\u0000HREF=/g, "href=")
    .replace(/\ssrcset="([^"]*)"/g, (all, v) =>
      ` srcset="${v.split(",").map(s => s.trim().replace(/^\S+/, u => fix(u))).join(", ")}"`)
    .replace(/url\((['"]?)([^'")]+)\1\)/g, (all, q, u) => `url(${q}${fix(u)}${q})`)
    .replace(/this\.src='([^']+)'/g, (all, u) => `this.src='${fix(u)}'`)
    .replace(new RegExp(escapeRe(SOURCE_URL) + "[^\"'\\s<>)]*", "g"), u => fix(u));
}

function rewriteCss(text, srcFile, pubFile) {
  const srcDir = P.dirname(srcFile), pubDir = P.dirname(pubFile);
  return text.replace(/url\((['"]?)([^'")]+)\1\)/g, (all, q, u) => `url(${q}${rewriteRef(u, srcDir, pubDir)}${q})`);
}

// JS の中の場所は、そのファイルを読み込むページ（html/sites/）から見た書き方になっている
const SITE_PAGES = new Set(fs.readdirSync(path.join(ROOT, "html/sites")).filter(f => f.endsWith(".html")));
function rewriteJs(text) {
  return text
    .replace(/(["'])(\.\.\/[^"'\s]+)\1/g, (all, q, u) => q + rewriteRef(u, "html/sites", "") + q)
    .replace(/(["'])([a-z0-9_-]+\.html)([#?][^"']*)?\1/gi, (all, q, f, tail) =>
      SITE_PAGES.has(f) ? q + relFrom("", pageUrl(f)) + (tail || "") + q : all)
    .replace(new RegExp(escapeRe(SOURCE_URL) + "[^\"'\\s<>)]*", "g"), u => rewriteRef(u, "", ""));
}

function escapeRe(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }

function walk(dir) {
  const out = [];
  for (const e of fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true })) {
    const rel = P.join(dir, e.name);
    if (e.isDirectory()) out.push(...walk(rel));
    else if (e.name !== ".gitkeep") out.push(rel);
  }
  return out;
}

function write(pub, data) {
  const f = path.join(OUT, pub);
  fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.writeFileSync(f, data);
}

function main() {
  fs.rmSync(OUT, { recursive: true, force: true });
  const files = [...walk("html"), ...walk("images"), ...walk("data"), "site.webmanifest"];
  let pages = 0;
  for (const src of files) {
    const pub = toPublic(src);
    if (pub === null) continue;
    const ext = P.extname(src).toLowerCase();
    if (ext === ".html") {
      const text = fs.readFileSync(path.join(ROOT, src), "utf8");
      write(pub, rewriteHtml(text, src, pub));
      pages++;
      // 前の住所（…/html/sites/kids.html など）で開いた人を、新しい住所へ案内する
      const to = PUBLIC_URL + pageUrl(pub);
      write(src, `<!DOCTYPE html><html lang="ja"><head><meta charset="UTF-8"><meta name="robots" content="noindex">` +
        `<link rel="canonical" href="${to}"><meta http-equiv="refresh" content="0; url=${to}">` +
        `<script>location.replace(${JSON.stringify(to)} + location.search + location.hash)</script></head>` +
        `<body><a href="${to}">${to}</a></body></html>`);
    } else if (ext === ".css") {
      write(pub, rewriteCss(fs.readFileSync(path.join(ROOT, src), "utf8"), src, pub));
    } else if (ext === ".js") {
      write(pub, rewriteJs(fs.readFileSync(path.join(ROOT, src), "utf8")));
    } else if (src === "site.webmanifest") {
      const m = JSON.parse(fs.readFileSync(path.join(ROOT, src), "utf8"));
      m.start_url = "./";
      write(pub, JSON.stringify(m, null, 2) + "\n");
    } else {
      write(pub, fs.readFileSync(path.join(ROOT, src)));
    }
  }
  write(".nojekyll", "");
  console.log(`公開用のサイトを _site/ に作りました（ページ ${pages} 枚）。`);
}

main();
