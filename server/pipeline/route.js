// Rules first. The small model is asked only when the rules cannot tell.
import { complete } from "../llm.js";

const LOOKUP = /\b(torque|n\s*[·.]?\s*m\b|nm\b|how tight|tighten(?:ing)? (?:to|value)|part number|part no|which part|compatible|compatibility|fit|fits|which tool|what tool|tool (?:do|number)|thickness|how thick|how many|how much|what size|diameter|length|minimum|maximum|wear limit|which (?:oil|fluid|grease)|what (?:oil|fluid|grease))\b/i;
const PROCEDURE = /\b(how do i|how to|steps?|procedure|install|installing|remove|removing|replace|replacing|adjust|adjusting|bleed|bleeding|set ?up|assemble|disassemble|service|align|index)\b/i;

export async function route(question) {
  const l = LOOKUP.test(question), p = PROCEDURE.test(question);
  if (l && !p) return { path: "lookup", routedBy: "rules", usage: null };
  if (p && !l) return { path: "procedure", routedBy: "rules", usage: null };
  // Both kinds of word: "how do I / how to ..." asks for steps; anything else is asking for the spec.
  if (l && p) return { path: /^\s*(how do i|how to|steps|procedure)\b/i.test(question) && !/\b(torque|n\s*[·.]?\s*m|nm|how tight|part number)\b/i.test(question) ? "procedure" : "lookup", routedBy: "rules", usage: null };
  const { text, usage } = await complete({
    size: "small", maxTokens: 10, meta: { kind: "route" },
    system: "You route bike repair questions. Reply with exactly one word: lookup (the answer is a single spec, number, part number, tool or compatibility fact) or procedure (the answer is a sequence of steps).",
    user: question,
  });
  return { path: /lookup/i.test(text) ? "lookup" : "procedure", routedBy: "model", usage };
}
