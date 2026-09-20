// Re-rank whatever the search backend returned with one shared score, so thresholds mean the same everywhere.
import { tokens, coverage } from "../text.js";
import { factText, passageText } from "../search/shape.js";

const SPEC_HINTS = [
  [/torque|tight|n\s*[·.]?\s*m\b|nm\b/i, "torque"], [/part number|part no|which part/i, "part_number"], [/compatib|fit\b|fits\b|work with/i, "compatibility"],
  [/tool/i, "tool"], [/oil|fluid|grease|lubric/i, "fluid"], [/thick|diameter|length|size|wear|minimum|maximum|how many|how much/i, "dimension"],
];
export const specHint = (q) => SPEC_HINTS.find(([re]) => re.test(q))?.[1] || null;

const overlaps = (a = [], b = []) => a.some((x) => b.includes(x));

export function rankFacts(question, found, facts) {
  const q = tokens(question), hint = specHint(question);
  return facts.map((f) => {
    let score = coverage(q, factText(f));
    if (found.models.length) score += overlaps(f.models, found.models) ? 0.25 : -0.4;
    if (hint) score += f.specType === hint ? 0.15 : -0.15;
    return { doc: f, score: Math.max(0, Math.min(1, score)) };
  }).sort((a, b) => b.score - a.score);
}

export function rankPassages(question, found, passages) {
  const q = tokens(question);
  return passages.map((p) => {
    let score = coverage(q, passageText(p));
    if (found.models.length) score += overlaps(p.models, found.models) ? 0.15 : -0.2;
    return { doc: p, score: Math.max(0, Math.min(1, score)) };
  }).sort((a, b) => b.score - a.score);
}
