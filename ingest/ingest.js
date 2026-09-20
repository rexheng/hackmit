// npm run ingest            read every PDF in /manuals, extract facts with the small model, store in MongoDB
// npm run ingest -- --dry   parse every PDF and print page counts. No model, no database.
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { config } from "../server/config.js";
import { embed } from "../server/llm.js";
import { pdfPages } from "./pdfText.js";
import { extractFacts } from "./extractFacts.js";
import { storeManual } from "./store.js";

const DIR = path.resolve("manuals");
const dry = process.argv.includes("--dry");

function parseCsv(text) {
  const rows = text.split(/\r?\n/).filter((l) => l.trim()).map((line) => {
    const cells = []; let cur = "", quoted = false;
    for (const ch of line) { if (ch === '"') quoted = !quoted; else if (ch === "," && !quoted) { cells.push(cur.trim()); cur = ""; } else cur += ch; }
    return [...cells, cur.trim()];
  });
  const head = rows.shift()?.map((h) => h.toLowerCase()) || [];
  return rows.map((r) => Object.fromEntries(head.map((h, i) => [h, r[i] || ""])));
}

const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "");

async function main() {
  const files = (await readdir(DIR)).filter((f) => f.toLowerCase().endsWith(".pdf")).sort();
  const sources = parseCsv(await readFile(path.join(DIR, "sources.csv"), "utf8").catch(() => ""));
  if (!files.length) { console.log("No PDFs in /manuals. Add manuals and sources.csv (title,brand,url,file), then run again."); return; }

  let db, close;
  if (!dry) { const m = await import("../server/db.js"); if (!config.mongoUri) throw new Error("Set MONGODB_URI before ingesting real manuals."); db = await m.connect(); close = m.close; }
  const embedBatch = async (texts) => { const out = []; for (let i = 0; i < texts.length; i += 64) out.push(...((await embed(texts.slice(i, i + 64))) || [])); return out.length ? out : null; };

  const report = [];
  for (const file of files) {
    const src = sources.find((s) => s.file === file) || sources.find((s) => slug(file).includes(slug(s.title)) || slug(s.title).includes(slug(file.replace(/\.pdf$/i, ""))));
    const meta = { title: src?.title || file.replace(/\.pdf$/i, ""), brand: src?.brand || "", url: src?.url || "", file };
    const pages = await pdfPages(path.join(DIR, file));
    if (dry) { report.push({ file, title: meta.title, pages: pages.length, inSourcesCsv: Boolean(src) }); continue; }

    const factsByPage = new Map(); let kept = 0, dropped = 0, calls = 0, cost = 0;
    for (const p of pages) {
      const r = await extractFacts(p.text);
      if (r.kept.length) factsByPage.set(p.page, r.kept);
      kept += r.kept.length; dropped += r.dropped; if (r.usage) { calls++; cost += r.usage.costUsd; }
    }
    const stored = await storeManual(db, { meta, pages, factsByPage, embedFn: config.embeddingsOn ? embedBatch : null });
    report.push({ file, pages: stored.pages, passages: stored.passages, factsKept: kept, factsDropped: dropped, modelCalls: calls, costUsd: Number(cost.toFixed(4)) });
  }
  console.table(report);
  if (dry) console.log("Dry run: no model was called and nothing was written.");
  await close?.();
}

main().catch((e) => { console.error(e.message); process.exit(1); });
