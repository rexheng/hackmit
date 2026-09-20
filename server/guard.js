// The guard. Every number-with-a-unit and every part or model code in an answer must already exist,
// verbatim, in the manual text we retrieved. If one does not, the model's text is never shown.
import { normalize, findModelCodes } from "./text.js";

const NUM = String.raw`\d+(?:[.,]\d+)?`;
const UNIT = String.raw`N\s*[·.*]?\s*m\b|kgf\s*[·.]?\s*cm|in\.?\s*-?\s*lbs?\.?|lbf?\s*[·.\- ]?\s*in\b|ft\.?\s*-?\s*lbs?\.?|mm\b|cm\b|ml\b|cc\b|psi\b|bar\b|kpa\b|°|deg(?:rees?)?\b|%|kg\b|g\b|rpm\b|turns?\b|clicks?\b|teeth\b|years?\b|km\b|months?\b|hours?\b|minutes?\b|seconds?\b`;
const QUANTITY = new RegExp(String.raw`(${NUM})(?:\s*(?:-|to|~)\s*(${NUM}))?\s*(${UNIT})`, "gi");

function unitKey(u) {
  const k = u.toLowerCase().replace(/[\s·.*\-]/g, "").replace(/s$/, "");
  if (k === "degree" || k === "°") return "deg";
  if (k === "lbin" || k === "lbfin" || k === "inlb") return "inlb";
  return k;
}

/** All quantities in a text as canonical "value|unit" keys. Ranges also yield their end points. */
export function quantities(text) {
  const out = new Map();
  for (const m of normalize(text).matchAll(QUANTITY)) {
    const [raw, a, b, unit] = m;
    const u = unitKey(unit), lo = a.replace(",", "."), hi = b?.replace(",", ".");
    if (hi) { out.set(`${lo}-${hi}|${u}`, raw); out.set(`${lo}|${u}`, raw); out.set(`${hi}|${u}`, raw); }
    else out.set(`${lo}|${u}`, raw);
  }
  return out;
}

/**
 * @param {string} answer   final text, after placeholder substitution
 * @param {string[]} sources retrieved passage texts and fact verbatim texts
 * @param {string} question  codes the user typed are allowed to be echoed back
 */
export function guard(answer, sources, question = "") {
  const allowed = quantities(sources.join("\n"));
  const blocked = [];
  for (const [key, raw] of quantities(stripStepNumbers(answer))) if (!allowed.has(key)) blocked.push(raw.trim());
  const knownCodes = new Set(findModelCodes(sources.join("\n") + "\n" + question));
  for (const code of findModelCodes(answer)) if (!knownCodes.has(code)) blocked.push(code);
  return { passed: blocked.length === 0, blockedNumbers: [...new Set(blocked)] };
}

// "1. Remove the wheel" is a list marker, not a quantity.
const stripStepNumbers = (t) => t.replace(/^\s*\d+[.)]\s+/gm, "");

/** Any bare digit the model typed itself, outside placeholders and citations. Used on the raw procedure text. */
export function literalNumbers(rawModelText, knownCodes = []) {
  // A model code that is already in the manuals or the question is a name, not a quantity. Unknown codes are caught by guard().
  let cleaned = stripStepNumbers(rawModelText).replace(/\{\{fact:[^}]+\}\}/g, "").replace(/\[[^\]]*\]/g, "");
  for (const code of knownCodes) cleaned = cleaned.split(code).join(" ");
  return [...cleaned.matchAll(/\d+(?:[.,]\d+)?/g)].map((m) => m[0]);
}
