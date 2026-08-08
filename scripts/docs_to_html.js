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
  const text = textRun.content.replace(/\n/g, "<br>");

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
  if (style.foregroundColor && style.foregroundColor.color) {
    const col = style.foregroundColor.color;

    // rgbColor がある場合はそれを使う
    const rgb = col.rgbColor || col;

    if (rgb.red !== undefined) {
      const color = `rgb(${Math.round(rgb.red * 255)}, ${Math.round(rgb.green * 255)}, ${Math.round(rgb.blue * 255)})`;
      html = `<span style="color:${color};">${html}</span>`;
    }
  }

  return html;
}


module.exports = { convertDocsToHtml };
