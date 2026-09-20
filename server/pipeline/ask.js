// POST /api/ask, end to end. Numbers, part numbers and compatibility facts only ever come from MongoDB.
import { config } from "../config.js";
import { normalize } from "../text.js";
import { guard } from "../guard.js";
import { detect } from "./detect.js";
import { route } from "./route.js";
import { rankFacts, rankPassages } from "./rank.js";
import { runProcedure, factPhrase } from "./procedure.js";
import { manualMap, citation, dedupeCitations, warningText, partsFor } from "./cite.js";

export const REFUSAL_SENTENCE = "The manuals I have do not cover that.";
const cache = new Map();
export const clearCache = () => cache.clear();

function addUsage(total, u) {
  if (!u) return;
  total.modelCalls += 1; total.tokensIn += u.tokensIn; total.tokensOut += u.tokensOut; total.costUsd += u.costUsd;
}

async function known(db) {
  const [models, brands] = await Promise.all([db.collection("facts").distinct("models"), db.collection("manuals").distinct("brand")]);
  const more = await db.collection("passages").distinct("models");
  return { models: [...new Set([...models, ...more])].filter(Boolean), brands: brands.filter(Boolean) };
}

function lookupAnswer(f) {
  const lines = [`**${f.name}${f.models?.length ? " (" + f.models.join(", ") + ")" : ""}: ${factPhrase(f)}**`];
  if (f.tool) lines.push(`Tool: ${f.tool}`);
  lines.push(`> ${normalize(f.verbatimText)}`);
  return lines.join("\n\n");
}

export async function ask({ db, search }, { question, bike }) {
  const started = Date.now();
  const key = normalize(`${question}|${bike || ""}`).toLowerCase();
  if (cache.has(key)) return { ...cache.get(key), usage: { ...cache.get(key).usage, cached: true, latencyMs: Date.now() - started } };

  const usage = { modelCalls: 0, tokensIn: 0, tokensOut: 0, costUsd: 0, latencyMs: 0, routedBy: "none" };
  const base = { answerMarkdown: "", path: "refusal", citations: [], parts: [], safety: false, guard: { passed: true, blockedNumbers: [] }, usage };
  const finish = async (res) => {
    res.usage.latencyMs = Date.now() - started;
    res.usage.costUsd = Number(res.usage.costUsd.toFixed(6));
    cache.set(key, res);
    await db.collection("questions").insertOne({ askedAt: new Date(), question, path: res.path, guard: res.guard, usage: res.usage, citations: res.citations.map((c) => ({ manualId: c.manualId, page: c.page })) });
    return res;
  };

  const manuals = await manualMap(db);
  const found = detect(`${question} ${bike || ""}`, await known(db));
  if (found.ambiguous) {
    return finish({ ...base, path: "clarify", answerMarkdown: `Which part do you mean? The manuals list ${found.models.join(", ")}.` });
  }

  const query = [question, bike, ...found.models, found.component].filter(Boolean).join(" ");
  const facts = rankFacts(question, found, await search.facts(query, { limit: 10 }));
  const passages = rankPassages(question, found, await search.passages(query, { limit: 6 }));
  const bikeModels = detect(bike || question, await known(db)).models;

  // Refuse before any model is involved: nothing in the manuals is close enough.
  const bestScore = Math.max(facts[0]?.score || 0, passages[0]?.score || 0);
  if (bestScore < config.refusalThreshold) return finish(refusal(base, manuals, passages));

  const routed = await route(question);
  usage.routedBy = routed.routedBy;
  addUsage(usage, routed.usage);

  // Lookup: a fact clears the threshold -> answer from a template. Zero model calls on this path.
  if (routed.path === "lookup" && facts[0]?.score >= config.refusalThreshold) {
    const f = facts[0].doc;
    const cites = [citation(manuals, f, f.verbatimText)];
    const answerMarkdown = lookupAnswer(f);
    const g = guard(answerMarkdown, [f.verbatimText, factPhrase(f), f.name, f.tool || "", (f.models || []).join(" ")], question);
    return finish(await withSafety(db, { ...base, path: "lookup", answerMarkdown, citations: cites, parts: await partsFor(db, cites, bikeModels), guard: g }, [f]));
  }

  if (!passages.length || passages[0].score < config.refusalThreshold) return finish(refusal(base, manuals, passages));

  // Procedure: the model writes prose with placeholders; code fills them and the guard checks the result.
  // Only passages close to the best one: an unrelated page must not feed the model.
  const top = passages.filter((p) => p.score >= Math.max(config.refusalThreshold * 0.5, passages[0].score * 0.6)).slice(0, 4).map((p) => p.doc);
  const pageKeys = new Set(top.map((p) => `${p.manualId}:${p.page}`));
  const candidates = facts.filter((f) => f.score >= 0.2 || pageKeys.has(`${f.doc.manualId}:${f.doc.page}`)).slice(0, 12).map((f) => f.doc);
  const proc = await runProcedure(question, top, candidates);
  addUsage(usage, proc.usage);
  if (proc.notCovered) return finish(refusal(base, manuals, passages));

  const cites = dedupeCitations([...proc.usedFacts.map((f) => citation(manuals, f, f.verbatimText)), ...(proc.usedPassages.length ? proc.usedPassages : top).map((p) => citation(manuals, p, p.text))]);
  if (!proc.guard.passed) {
    const pagesOnly = top.map((p) => citation(manuals, p, p.text));
    return finish({ ...base, path: "procedure", guard: proc.guard, citations: pagesOnly,
      answerMarkdown: "I could not verify every number in my wording against the manuals, so I am not showing it. Here are the manual pages instead." });
  }
  return finish(await withSafety(db, { ...base, path: "procedure", answerMarkdown: proc.text, citations: cites, parts: await partsFor(db, cites, bikeModels), guard: proc.guard }, proc.usedFacts));
}

function refusal(base, manuals, passages) {
  return { ...base, path: "refusal", answerMarkdown: REFUSAL_SENTENCE, citations: dedupeCitations(passages.slice(0, 3).map((p) => citation(manuals, p.doc, p.doc.text))) };
}

async function withSafety(db, res, citedFacts) {
  if (!citedFacts.some((f) => f.safetyCritical)) return res;
  const text = await warningText(db, res.citations);
  return { ...res, safety: true, safetyText: text || "This is a safety-critical part. Read the manual page before you start." };
}
