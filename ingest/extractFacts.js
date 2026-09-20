// Facts are proposed by the small model and then checked IN CODE: the value, and the model code if any,
// must appear on that page. Anything that fails is dropped and counted. Responses are cached on disk by page hash.
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { complete } from "../server/llm.js";
import { appearsIn, findModelCodes, normalize } from "../server/text.js";

const CACHE = path.resolve(".cache/facts");
export const SPEC_TYPES = ["torque", "part_number", "compatibility", "dimension", "fluid", "tool", "procedure_rule"];

const SYSTEM = `You extract facts from one page of a bicycle component service manual. Return ONLY a JSON array.
Each item: {"specType": one of ${SPEC_TYPES.join("|")}, "name": short label, "value": the value EXACTLY as printed on the page, "unit": unit or "", "tool": tool named for it or "", "models": model codes it applies to, "verbatimText": the sentence or table row copied exactly from the page}.
Copy values character for character. Do not convert units, do not round, do not infer. If the page has no facts, return [].`;

const SAFETY = /brake|caliper|rotor|stem|handlebar|carbon|fork|steerer/i;
const SAFETY_PREFIX = /^(BR|BL|RT|SM-RT)-/;  // brake calipers, brake levers, rotors

/** Pure check, exported for tests. Returns the cleaned fact or null. */
export function verifyFact(fact, pageText) {
  if (!fact || !SPEC_TYPES.includes(fact.specType) || !fact.name || fact.value == null || fact.value === "") return null;
  const value = normalize(String(fact.value));
  if (!appearsIn(value, pageText)) return null;
  const models = (fact.models || []).map((m) => normalize(String(m)).toUpperCase());
  if (models.some((m) => !appearsIn(m, pageText))) return null;
  const verbatimText = normalize(fact.verbatimText || "");
  if (!verbatimText || !appearsIn(verbatimText.slice(0, 60), pageText)) return null;
  const near = contextAround(pageText, value);
  return {
    specType: fact.specType, name: normalize(fact.name), value, unit: normalize(fact.unit || ""), tool: normalize(fact.tool || ""),
    models: models.length ? models : findModelCodes(verbatimText), verbatimText,
    safetyCritical: SAFETY.test(`${fact.name} ${verbatimText}`) || models.some((m) => SAFETY_PREFIX.test(m)) || /WARNING|CAUTION|DANGER/.test(near),
  };
}

function contextAround(pageText, value) {
  const t = normalize(pageText), i = t.toLowerCase().indexOf(value.toLowerCase());
  return i < 0 ? "" : t.slice(Math.max(0, i - 300), i + 300);
}

export async function extractFacts(pageText) {
  if (normalize(pageText).length < 60) return { kept: [], dropped: 0, usage: null, cached: false };
  const key = createHash("sha256").update(pageText).digest("hex");
  const file = path.join(CACHE, `${key}.json`);
  let raw, usage = null, cached = true;
  try { raw = JSON.parse(await readFile(file, "utf8")); } catch {
    cached = false;
    const res = await complete({ size: "small", system: SYSTEM, user: pageText.slice(0, 12000), maxTokens: 4096, meta: { kind: "facts" } });
    usage = res.usage;
    raw = parseArray(res.text);
    await mkdir(CACHE, { recursive: true });
    await writeFile(file, JSON.stringify(raw));
  }
  const kept = raw.map((f) => verifyFact(f, pageText)).filter(Boolean);
  return { kept, dropped: raw.length - kept.length, usage, cached };
}

function parseArray(text) {
  const m = text.match(/\[[\s\S]*\]/);
  try { const v = JSON.parse(m ? m[0] : text); return Array.isArray(v) ? v : []; } catch { return []; }
}
