// Work out which brand, model codes and component a question is about, tolerating typos.
// This only steers search. Nothing here is ever shown as a fact.
import { tokens, fuzzyEqual, normalize } from "../text.js";

// Everyday words -> the component family and the code prefixes manuals use for it.
const COMPONENTS = [
  { family: "rear derailleur", prefixes: ["RD"], words: ["rear derailleur", "rear mech", "rear derailer", "rear deraileur", "rd"] },
  { family: "front derailleur", prefixes: ["FD"], words: ["front derailleur", "front mech", "front derailer", "fd"] },
  { family: "crankset", prefixes: ["FC"], words: ["crankset", "crank", "cranks", "chainset", "crank arm", "chainring"] },
  { family: "brake", prefixes: ["BR", "BL"], words: ["brake", "brakes", "caliper", "brake lever", "brake pad", "bleed"] },
  { family: "cassette", prefixes: ["CS"], words: ["cassette", "sprocket", "sprockets", "lockring", "lock ring"] },
  { family: "chain", prefixes: ["CN"], words: ["chain", "quick link", "quick-link"] },
  { family: "shifter", prefixes: ["SL", "ST"], words: ["shifter", "shift lever", "sti", "dual control lever"] },
  { family: "bottom bracket", prefixes: ["BB", "SM"], words: ["bottom bracket", "bb"] },
  { family: "pedal", prefixes: ["PD", "SM"], words: ["pedal", "pedals", "cleat", "cleats"] },
  { family: "rotor", prefixes: ["RT", "SM"], words: ["rotor", "disc rotor", "center lock"] },
  { family: "hub", prefixes: ["HB", "FH"], words: ["hub", "freehub", "axle"] },
];

export function detectComponent(question) {
  const q = " " + normalize(question).toLowerCase() + " ";
  let best = null;
  for (const c of COMPONENTS) for (const w of c.words)
    if (q.includes(" " + w + " ") || q.includes(" " + w + "s ")) if (!best || w.length > best.word.length) best = { ...c, word: w };
  return best;
}

const alnum = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

/** Match question tokens against the distinct model codes in the database, allowing one or two typos. */
export function matchModels(question, knownModels, component) {
  const qTokens = tokens(question).flatMap((t) => [alnum(t), ...t.split("-").map(alnum)]).filter((t) => /\d/.test(t) && t.length >= 3);
  const hits = new Map();
  for (const model of knownModels) {
    const parts = model.toLowerCase().split("-").map(alnum), full = alnum(model);
    for (const t of new Set(qTokens)) {
      // 3: the whole code was typed. 2: its number part was typed exactly. 1: a near miss (typo).
      const tier = t === full ? 3 : parts.slice(1).includes(t) ? 2 : fuzzyEqual(t, full) || parts.slice(1).some((p) => /\d/.test(p) && fuzzyEqual(t, p)) ? 1 : 0;
      if (tier) hits.set(model, Math.max(hits.get(model) || 0, tier));
    }
  }
  let models = [...hits.keys()];
  if (component) {
    const narrowed = models.filter((m) => component.prefixes.includes(m.split("-")[0]));
    if (narrowed.length) models = narrowed;
  }
  const best = Math.max(0, ...models.map((m) => hits.get(m)));
  return models.filter((m) => hits.get(m) === best);
}

export function detect(question, known) {
  const component = detectComponent(question);
  const models = matchModels(question, known.models, component);
  const q = normalize(question).toLowerCase();
  const brand = known.brands.find((b) => q.includes(b.toLowerCase())) || null;
  // Several different kinds of part share the code the mechanic typed, and they did not say which.
  const families = new Set(models.map((m) => m.split("-")[0]));
  const ambiguous = !component && families.size > 1;
  return { brand, models, component: component?.family || null, ambiguous, families: [...families] };
}
