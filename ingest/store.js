// Write one manual into MongoDB. Idempotent: re-ingesting a manual replaces everything it owned.
import { chunkPage } from "./chunk.js";

export async function storeManual(db, { meta, pages, factsByPage = new Map(), embedFn = null }) {
  const existing = await db.collection("manuals").findOne({ file: meta.file ?? null, title: meta.title });
  if (existing) for (const c of ["pages", "passages", "facts"]) await db.collection(c).deleteMany({ manualId: existing._id });
  if (existing) await db.collection("manuals").deleteOne({ _id: existing._id });

  const { insertedId: manualId } = await db.collection("manuals").insertOne({ ...meta, pages: pages.length, ingestedAt: new Date() });
  if (pages.length) await db.collection("pages").insertMany(pages.map((p) => ({ manualId, page: p.page, text: p.text })));

  const chunks = pages.flatMap((p) => chunkPage(p.text, p.page));
  const embeddings = embedFn && chunks.length ? await embedFn(chunks.map((c) => c.text)) : null;
  const passages = chunks.map((p, i) => ({ manualId, brand: meta.brand, ...p, ...(embeddings?.[i] ? { embedding: embeddings[i] } : {}) }));
  if (passages.length) await db.collection("passages").insertMany(passages);

  const facts = [...factsByPage].flatMap(([page, list]) => list.map((f) => ({ manualId, page, brand: meta.brand, ...f })));
  if (facts.length) await db.collection("facts").insertMany(facts);
  return { manualId, pages: pages.length, passages: passages.length, facts: facts.length };
}
