import { Router } from "express";
import { config } from "../config.js";
import { COLLECTIONS, isFixture } from "../db.js";

export function infoRoutes({ db, search }) {
  const r = Router();

  r.get("/health", async (_req, res) => {
    const counts = Object.fromEntries(await Promise.all(COLLECTIONS.map(async (c) => [c, await db.collection(c).countDocuments()])));
    res.json({ ok: true, backend: search.name, provider: config.llmProvider, dryRun: config.dryRun, fixtureData: isFixture(), embeddings: config.embeddingsOn, counts });
  });

  r.get("/manuals", async (_req, res) => {
    const list = await db.collection("manuals").find().sort({ brand: 1, title: 1 }).toArray();
    // Example questions for the chips, built from real fact names in the database. Nothing is invented.
    const sample = await db.collection("facts").find({ specType: { $in: ["torque", "dimension", "tool"] }, "models.0": { $exists: true } }).limit(40).toArray();
    const examples = [...new Map(sample.map((f) => [f.models[0], `${f.name} ${f.models[0]}`])).values()].slice(0, 4);
    res.json({ examples, manuals: list.map((m) => ({ id: String(m._id), title: m.title, brand: m.brand, url: m.url, pages: m.pages, pdfUrl: m.file ? `/manuals/${encodeURIComponent(m.file)}` : null, fixture: Boolean(m.fixture) })) });
  });

  r.get("/stats", async (_req, res) => {
    const rows = await db.collection("questions").aggregate([{ $group: { _id: "$path", n: { $sum: 1 }, latencyMs: { $avg: "$usage.latencyMs" }, costUsd: { $avg: "$usage.costUsd" }, zeroCalls: { $sum: { $cond: [{ $eq: ["$usage.modelCalls", 0] }, 1, 0] } }, guardBlocked: { $sum: { $cond: ["$guard.passed", 0, 1] } } } }]).toArray();
    const questions = rows.reduce((a, x) => a + x.n, 0), zero = rows.reduce((a, x) => a + x.zeroCalls, 0);
    res.json({
      questions, zeroModelCallShare: questions ? zero / questions : 0, guardBlocked: rows.reduce((a, x) => a + x.guardBlocked, 0),
      byPath: rows.map((x) => ({ path: x._id, questions: x.n, meanLatencyMs: Math.round(x.latencyMs), meanCostUsd: Number(x.costUsd.toFixed(6)) })),
    });
  });
  return r;
}
