// In-memory search with minisearch (fuzzy on). Used by tests and whenever there is no Atlas connection.
import MiniSearch from "minisearch";
import { factText, passageText } from "./shape.js";

export async function createLocalSearch(db) {
  let facts, passages, factDocs, passageDocs;

  async function refresh() {
    factDocs = new Map((await db.collection("facts").find().toArray()).map((d) => [String(d._id), d]));
    passageDocs = new Map((await db.collection("passages").find().toArray()).map((d) => [String(d._id), d]));
    const opts = { fields: ["text"], storeFields: [], searchOptions: { fuzzy: 0.2, prefix: true, combineWith: "OR" } };
    facts = new MiniSearch(opts);
    passages = new MiniSearch(opts);
    facts.addAll([...factDocs].map(([id, d]) => ({ id, text: factText(d) })));
    passages.addAll([...passageDocs].map(([id, d]) => ({ id, text: passageText(d) })));
  }
  await refresh();

  return {
    name: "local",
    refresh,
    facts: async (q, { limit = 8 } = {}) => facts.search(q).slice(0, limit).map((r) => factDocs.get(r.id)),
    passages: async (q, { limit = 6 } = {}) => passages.search(q).slice(0, limit).map((r) => passageDocs.get(r.id)),
  };
}
