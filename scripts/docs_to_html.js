// Google Doc（Docs API の documents.get の結果）→ 記事の本文 HTML
//
// 出すもの：見出し、段落、太字、斜体、取り消し線、リンク、箇条書き、表、写真
// 出さないもの：文字の色や大きさ（サイトのデザインにそろえる）、図形描画やグラフ
//
// 写真の並べ方（docs/SPREADSHEET_GUIDE.md にも書いてある）
//   A 写真だけの行に 1 枚        → 横いっぱい
//   B 同じ行に 2 枚              → 2 枚並び（スマホは縦）
//   C 同じ行に 3 枚以上          → ギャラリー（3 列）
//   D 写真のすぐ下の「※」で始まる行 → 写真の説明（キャプション）
//   F 1 行 2 列の表で、片方のマスに写真 → 写真と文章を左右に（スマホは縦）
//   写真が入っていない表 → ふつうの表

function esc(v) {
  return String(v == null ? "" : v)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// リンクに使ってよい URL だけ通す
function safeUrl(url) {
  const u = String(url || "").trim();
  return /^(https?:|mailto:|tel:)/i.test(u) ? u : "";
}

// ---------------------------------------------------------
// 1) 写真の一覧（Doc の中の順番）
// ---------------------------------------------------------

// Doc の中の写真を、出てくる順に集める（同じ写真が 2 回出ても 1 つ）
function collectImages(doc) {
  const order = [];
  const seen = new Set();
  const add = id => {
    if (!id || seen.has(id)) return;
    seen.add(id);
    order.push(id);
  };
  const walk = content => {
    for (const el of content || []) {
      if (el.paragraph) {
        for (const pe of el.paragraph.elements || []) {
          if (pe.inlineObjectElement && isImage(doc, pe.inlineObjectElement.inlineObjectId)) add(pe.inlineObjectElement.inlineObjectId);
        }
        for (const id of el.paragraph.positionedObjectIds || []) {
          if (isImage(doc, id, true)) add(id);
        }
      } else if (el.table) {
        for (const row of el.table.tableRows || []) {
          for (const cell of row.tableCells || []) walk(cell.content);
        }
      }
    }
  };
  walk(doc.body && doc.body.content);
  return order;
}

function embeddedOf(doc, id, positioned) {
  const obj = positioned ? (doc.positionedObjects || {})[id] : (doc.inlineObjects || {})[id];
  const props = obj && (positioned ? obj.positionedObjectProperties : obj.inlineObjectProperties);
  return props && props.embeddedObject;
}

function isImage(doc, id, positioned) {
  const e = embeddedOf(doc, id, positioned);
  return !!(e && e.imageProperties && e.imageProperties.contentUri);
}

function imageUri(doc, id) {
  const e = embeddedOf(doc, id, false) || embeddedOf(doc, id, true);
  return e && e.imageProperties ? e.imageProperties.contentUri : "";
}

function imageAlt(doc, id) {
  const e = embeddedOf(doc, id, false) || embeddedOf(doc, id, true);
  return (e && (e.description || e.title)) || "";
}

// ---------------------------------------------------------
// 2) 本文 HTML
// ---------------------------------------------------------

// srcOf(id) は、写真の id → <img src> に入れる場所 を返す（保存できなかった写真は ""）
function convertDocsToHtml(doc, srcOf = () => "") {
  const warnings = new Set();
  const lists = doc.lists || {};
  const out = [];

  const imgTag = id => {
    const src = srcOf(id);
    if (!src) return "";
    return `<img src="${esc(src)}" alt="${esc(imageAlt(doc, id))}" loading="lazy">`;
  };

  // 文字の部分（太字・斜体・リンクなど）
  const runHtml = tr => {
    let text = esc(String(tr.content || "").replace(/\n$/, "")).replace(/\u000B/g, "<br>");
    if (!text) return "";
    const st = tr.textStyle || {};
    if (st.bold) text = `<strong>${text}</strong>`;
    if (st.italic) text = `<em>${text}</em>`;
    if (st.strikethrough) text = `<s>${text}</s>`;
    const url = st.link && safeUrl(st.link.url);
    if (url) {
      const ext = /^https?:/i.test(url) ? ' target="_blank" rel="noopener"' : "";
      text = `<a href="${esc(url)}"${ext}>${text}</a>`;
    }
    return text;
  };

  // 段落を「文字」と「写真」に分ける
  const splitParagraph = p => {
    let html = "";
    const images = [];
    for (const pe of p.elements || []) {
      if (pe.textRun) html += runHtml(pe.textRun);
      else if (pe.inlineObjectElement) {
        const id = pe.inlineObjectElement.inlineObjectId;
        if (isImage(doc, id)) images.push(id);
        else warnings.add("図形描画やグラフは記事に出ません");
      }
    }
    for (const id of p.positionedObjectIds || []) {
      if (isImage(doc, id, true)) images.push(id);
      else warnings.add("図形描画やグラフは記事に出ません");
    }
    return { html: html.trim(), plain: html.replace(/<[^>]+>/g, "").trim(), images };
  };

  // 写真のかたまり（A・B・C）。caption は D
  const imageBlock = (ids, caption) => {
    const tags = ids.map(imgTag).filter(Boolean);
    if (tags.length === 0) return "";
    const cls = tags.length === 1 ? "post-photo" : tags.length === 2 ? "post-photo post-photo--pair" : "post-photo post-photo--gallery";
    const cap = caption ? `<figcaption>${caption}</figcaption>` : "";
    return `<figure class="${cls}">${tags.join("")}${cap}</figure>`;
  };

  // 箇条書き：番号つきかどうか
  const isOrdered = bullet => {
    const list = lists[bullet.listId];
    const levels = list && list.listProperties && list.listProperties.nestingLevels;
    const lv = levels && levels[bullet.nestingLevel || 0];
    return !!(lv && lv.glyphType && !/GLYPH_TYPE_UNSPECIFIED|NONE/.test(lv.glyphType));
  };

  // 表のマスの中身（段落と箇条書きだけの簡単な形）
  const cellHtml = cell => {
    const parts = [];
    for (const el of cell.content || []) {
      if (!el.paragraph) continue;
      const { html } = splitParagraph(el.paragraph);
      if (html) parts.push(el.paragraph.bullet ? `<li>${html}</li>` : `<p>${html}</p>`);
    }
    return parts.join("").replace(/(<li>.*?<\/li>)+/g, m => `<ul>${m}</ul>`);
  };

  const cellImages = cell => {
    const ids = [];
    for (const el of cell.content || []) if (el.paragraph) ids.push(...splitParagraph(el.paragraph).images);
    return ids;
  };

  const tableHtml = table => {
    const rows = table.tableRows || [];
    // F：1 行 2 列で、片方のマスだけに写真 → 写真と文章を左右に
    if (rows.length === 1 && (rows[0].tableCells || []).length === 2) {
      const [c1, c2] = rows[0].tableCells;
      const i1 = cellImages(c1), i2 = cellImages(c2);
      if ((i1.length > 0) !== (i2.length > 0)) {
        const photoLeft = i1.length > 0;
        const photo = imageBlock(photoLeft ? i1 : i2, "");
        const text = cellHtml(photoLeft ? c2 : c1);
        if (photo) {
          return `<div class="post-media${photoLeft ? "" : " post-media--right"}">${photo}<div class="post-media-text">${text}</div></div>`;
        }
      }
    }
    // ふつうの表（1 行目を見出しにする）
    const body = rows.map((row, r) => {
      const tag = r === 0 && rows.length > 1 ? "th" : "td";
      const cells = (row.tableCells || []).map(c => `<${tag}>${cellHtml(c).replace(/^<p>([\s\S]*)<\/p>$/, "$1")}</${tag}>`).join("");
      return `<tr>${cells}</tr>`;
    }).join("");
    if (cellImagesAny(rows)) warnings.add("写真入りの表は、1 行 2 列（写真と文章）のときだけ左右に並びます");
    return `<div class="post-table"><table>${body}</table></div>`;
  };

  const cellImagesAny = rows => rows.some(row => (row.tableCells || []).some(c => cellImages(c).length > 0));

  // 本文を上から順に
  const content = (doc.body && doc.body.content) || [];
  let listOpen = null;           // "ul" | "ol" | null
  let sectionNo = 0;             // 見出し1 の番号（目次の飛び先 #sec-1 …）
  const closeList = () => { if (listOpen) { out.push(`</${listOpen}>`); listOpen = null; } };

  for (let i = 0; i < content.length; i++) {
    const el = content[i];

    if (el.table) {
      closeList();
      out.push(tableHtml(el.table));
      continue;
    }
    if (!el.paragraph) continue;

    const p = el.paragraph;
    const style = (p.paragraphStyle && p.paragraphStyle.namedStyleType) || "NORMAL_TEXT";
    const { html, plain, images } = splitParagraph(p);

    // 写真（A・B・C）。すぐ下の「※」で始まる行はキャプション（D）
    if (images.length) {
      closeList();
      let caption = "";
      const next = content[i + 1] && content[i + 1].paragraph;
      if (next) {
        const n = splitParagraph(next);
        if (!n.images.length && /^[※＊*]/.test(n.plain)) {
          caption = n.plain.replace(/^[※＊*]\s*/, "");
          i++;
        }
      }
      out.push(imageBlock(images, caption));
      if (!html) continue;
    }

    // 箇条書き
    if (p.bullet) {
      const tag = isOrdered(p.bullet) ? "ol" : "ul";
      if (listOpen !== tag) { closeList(); out.push(`<${tag}>`); listOpen = tag; }
      if (html) out.push(`<li>${html}</li>`);
      continue;
    }
    closeList();

    if (!html) { continue; }   // 空の行は詰める（段落のあいだは CSS で空ける）
    if (/^【写真をここに】$/.test(plain)) continue;   // 写真を入れる場所の目印（サイトには出さない）

    if (style === "TITLE" || style === "HEADING_1") out.push(`<h2 id="sec-${++sectionNo}">${html}</h2>`);
    else if (style === "SUBTITLE") {
      // サブタイトルが続くときは、1 つのリード文にまとめる（行は改行でつなぐ）
      const last = out[out.length - 1] || "";
      if (last.startsWith('<p class="lead">')) out[out.length - 1] = last.replace(/<\/p>$/, `<br>${html}</p>`);
      else out.push(`<p class="lead">${html}</p>`);
    }
    else if (style === "HEADING_2") out.push(`<h3>${html}</h3>`);
    else if (/^HEADING_[3-6]$/.test(style)) out.push(`<h4>${html}</h4>`);
    else out.push(`<p>${html}</p>`);
  }
  closeList();

  return { html: out.join("\n"), warnings: [...warnings] };
}

module.exports = { convertDocsToHtml, collectImages, imageUri };
