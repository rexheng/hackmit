// PDF text per page with pdfjs-dist. Pure JavaScript, no native dependencies, page numbers kept.
import { readFile } from "node:fs/promises";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";

export async function pdfPages(file) {
  const data = new Uint8Array(await readFile(file));
  const doc = await getDocument({ data, useSystemFonts: true, isEvalSupported: false, verbosity: 0 }).promise;
  const pages = [];
  for (let n = 1; n <= doc.numPages; n++) {
    const content = await (await doc.getPage(n)).getTextContent();
    let text = "", lastY = null;
    for (const item of content.items) {
      const y = item.transform?.[5];
      if (lastY !== null && Math.abs(y - lastY) > 2) text += "\n";
      text += item.str + (item.hasEOL ? "\n" : " ");
      lastY = y;
    }
    pages.push({ page: n, text: text.replace(/[ \t]+/g, " ").replace(/ ?\n ?/g, "\n").trim() });
  }
  await doc.destroy();
  return pages;
}
