function convertDocsToHtml(doc) {
  let html = "";

  const content = doc.body.content || [];

  for (const element of content) {
    if (element.paragraph) {
      html += convertParagraph(element.paragraph);
    }
  }

  return html;
}

function convertParagraph(paragraph) {
  // 空行（elements がない）
  if (!paragraph.elements || paragraph.elements.length === 0) {
    return "<p><br></p>";
  }

  let html = "<p>";

  for (const el of paragraph.elements) {
    if (el.textRun) {
      html += convertTextRun(el.textRun);
    }
  }

  html += "</p>";
  return html;
}

function convertTextRun(textRun) {
const text = textRun.content
  .replace(/\u000B/g, "<br>")  // VT を改行に変換
  .replace(/\n/g, "<br>");

  const style = textRun.textStyle || {};
  let html = text;

  // 太字
  if (style.bold) {
    html = `<strong>${html}</strong>`;
  }

  // 文字サイズ
  if (style.fontSize && style.fontSize.magnitude) {
    html = `<span style="font-size:${style.fontSize.magnitude}pt;">${html}</span>`;
  }

  // 文字色（Google Docs の2種類の形式に対応）
  // 文字色（Google Docs の2種類の形式に対応）
  if (style.foregroundColor && style.foregroundColor.color) {
    const col = style.foregroundColor.color;

    // rgbColor がある場合はそれを使う
    const rgb = col.rgbColor || col;

    if (rgb.red !== undefined) {
      const r = Math.round((rgb.red ?? 0) * 255);
      const g = Math.round((rgb.green ?? 0) * 255);
      const b = Math.round((rgb.blue ?? 0) * 255);

      // NaN を防ぐ
      const safeR = isNaN(r) ? 0 : r;
      const safeG = isNaN(g) ? 0 : g;
      const safeB = isNaN(b) ? 0 : b;

      const color = `rgb(${safeR}, ${safeG}, ${safeB})`;
      html = `<span style="color:${color};">${html}</span>`;
    }
  }

  return html;
}


module.exports = { convertDocsToHtml };
