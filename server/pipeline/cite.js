// Citations, safety text and parts are all read straight out of MongoDB. No model is involved.
import { ObjectId } from "mongodb";
import { normalize } from "../text.js";

const oid = (id) => (id instanceof ObjectId ? id : new ObjectId(String(id)));

export async function manualMap(db) {
  const list = await db.collection("manuals").find().toArray();
  return new Map(list.map((m) => [String(m._id), m]));
}

export function citation(manuals, doc, verbatimText) {
  const m = manuals.get(String(doc.manualId));
  return {
    manualId: String(doc.manualId), manualTitle: m?.title || "Unknown manual", page: doc.page,
    pdfUrl: m?.file ? `/manuals/${encodeURIComponent(m.file)}#page=${doc.page}` : null,
    verbatimText: normalize(verbatimText).slice(0, 600),
  };
}

export function dedupeCitations(list) {
  const seen = new Set();
  return list.filter((c) => { const k = `${c.manualId}:${c.page}:${c.verbatimText.slice(0, 40)}`; if (seen.has(k)) return false; seen.add(k); return true; });
}

/** The manual's own WARNING / CAUTION sentences from the cited pages, copied verbatim. */
export async function warningText(db, cites) {
  const out = [];
  for (const c of cites.slice(0, 3)) {
    const page = await db.collection("pages").findOne({ manualId: oid(c.manualId), page: c.page });
    for (const m of normalize(page?.text || "").matchAll(/\b(WARNING|CAUTION|DANGER)\b[:\s-]*([^.]{10,260}\.)/g)) out.push(`${m[1]}: ${m[2].trim()}`);
  }
  return [...new Set(out)].slice(0, 3).join("\n");
}

/** Part numbers the manuals list on the cited pages, with compatibility taken only from what the manuals say. */
export async function partsFor(db, cites, bikeModels = []) {
  if (!cites.length) return [];
  const or = cites.map((c) => ({ manualId: oid(c.manualId), page: c.page }));
  const facts = await db.collection("facts").find({ $or: or, specType: { $in: ["part_number", "compatibility", "tool"] } }).toArray();
  const compat = facts.filter((f) => f.specType === "compatibility");
  const parts = new Map();
  for (const f of facts.filter((x) => x.specType !== "compatibility")) {
    const partNumber = String(f.value);
    let compatibility = "unknown";
    for (const c of compat) {
      const t = normalize(c.verbatimText).toUpperCase();
      if (!t.includes(partNumber.toUpperCase()) || !bikeModels.some((b) => t.includes(b.toUpperCase()))) continue;
      compatibility = /\b(NOT COMPATIBLE|INCOMPATIBLE|CANNOT BE USED|DO NOT USE|NOT BE USED)\b/.test(t) ? "incompatible" : "confirmed";
    }
    parts.set(partNumber, { partNumber, name: f.name, manualId: String(f.manualId), page: f.page, compatibility });
  }
  return [...parts.values()];
}
