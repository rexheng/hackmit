// Procedure path: the large model writes the connecting prose, and only that. Quantities are placeholders
// that code fills in from facts. A literal number typed by the model blocks the answer.
import { complete } from "../llm.js";
import { guard, literalNumbers } from "../guard.js";
import { findModelCodes } from "../text.js";

const SYSTEM = `You write repair steps for a bike mechanic using ONLY the manual passages given.
Rules you must follow exactly:
1. Write numbered steps. After each step cite the passage it came from in square brackets, like [P2].
2. NEVER type a number, measurement, torque, part number or model code yourself. When a step needs a quantity, insert a placeholder exactly like {{fact:F3}}, chosen from the candidate facts list. If no candidate fits, say "see the manual page" instead.
3. Do not add anything that is not in the passages. No general knowledge. If the passages do not cover the question, reply with exactly: NOT_COVERED`;

export const factPhrase = (f) => [f.value, f.unit].filter(Boolean).join(" ");

export async function runProcedure(question, passages, candidates) {
  const P = passages.map((p, i) => ({ id: `P${i + 1}`, doc: p }));
  const F = candidates.map((f, i) => ({ id: `F${i + 1}`, doc: f }));
  const user = [
    `Question: ${question}`,
    "Passages:", ...P.map((p) => `[${p.id}] (${p.doc.sectionTitle || "page " + p.doc.page}) ${p.doc.text}`),
    "Candidate facts (use as placeholders only):", ...F.map((f) => `${f.id}: ${f.doc.name} (${f.doc.specType}${f.doc.models?.length ? ", " + f.doc.models.join("/") : ""})`),
  ].join("\n");
  const { text, usage } = await complete({
    size: "large", system: SYSTEM, user, maxTokens: 4096,
    meta: { kind: "procedure", passages: P.map((p) => ({ id: p.id, page: p.doc.page, sectionTitle: p.doc.sectionTitle })), candidates: F.map((f) => ({ id: f.id })) },
  });
  return { ...assemble(text, P, F, question), usage };
}

/** Pure function: placeholders in, guarded text out. Exported so tests can drive it with any model text. */
export function assemble(modelText, P, F, question = "") {
  if (/^\s*NOT_COVERED\s*$/.test(modelText)) return { notCovered: true, guard: { passed: true, blockedNumbers: [] }, usedFacts: [], usedPassages: [] };
  const known = findModelCodes([question, ...P.map((p) => p.doc.text), ...F.map((f) => f.doc.verbatimText)].join("\n"));
  const blocked = literalNumbers(modelText.replace(/\[P\d+\]/g, ""), known);
  const usedFacts = [], usedPassages = [];
  let text = modelText.replace(/\{\{fact:([A-Za-z0-9]+)\}\}/g, (_, id) => {
    const f = F.find((x) => x.id === id);
    if (!f) { blocked.push(`{{fact:${id}}}`); return "[unknown]"; }
    usedFacts.push(f.doc);
    return `**${factPhrase(f.doc)}**`;
  });
  text = text.replace(/\[(P\d+)\]/g, (_, id) => {
    const p = P.find((x) => x.id === id);
    if (p) usedPassages.push(p.doc);
    return p ? `(p. ${p.doc.page})` : "";
  });
  const sources = [...P.map((p) => p.doc.text), ...F.map((f) => f.doc.verbatimText + " " + factPhrase(f.doc))];
  const g = guard(text, sources, question);
  const allBlocked = [...new Set([...blocked, ...g.blockedNumbers])];
  return { text, guard: { passed: allBlocked.length === 0, blockedNumbers: allBlocked }, usedFacts, usedPassages };
}
