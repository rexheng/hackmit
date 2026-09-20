// MongoDB Atlas Search ($search, fuzzy) plus Atlas Vector Search ($vectorSearch) when passages have embeddings.
import { embed } from "../llm.js";
import { rrf } from "./rrf.js";

export const INDEXES = {
  facts: { name: "facts_text", definition: { mappings: { dynamic: false, fields: { name: { type: "string" }, verbatimText: { type: "string" }, brand: { type: "string" }, models: { type: "string" }, specType: { type: "string" }, tool: { type: "string" } } } } },
  passages: { name: "passages_text", definition: { mappings: { dynamic: false, fields: { text: { type: "string" }, sectionTitle: { type: "string" }, brand: { type: "string" }, models: { type: "string" }, componentFamily: { type: "string" } } } } },
  vector: { name: "passages_vector", type: "vectorSearch", definition: { fields: [{ type: "vector", path: "embedding", numDimensions: 1536, similarity: "cosine" }] } },
};

const textStage = (index, query, paths) => ({ $search: { index, text: { query, path: paths, fuzzy: { maxEdits: 1, prefixLength: 1 } } } });

export async function createAtlasSearch(db) {
  async function facts(q, { limit = 8 } = {}) {
    return db.collection("facts").aggregate([textStage(INDEXES.facts.name, q, ["name", "verbatimText", "brand", "models", "specType", "tool"]), { $limit: limit }]).toArray();
  }
  async function passages(q, { limit = 6 } = {}) {
    const lists = [await db.collection("passages").aggregate([textStage(INDEXES.passages.name, q, ["text", "sectionTitle", "brand", "models", "componentFamily"]), { $limit: limit * 2 }, { $project: { embedding: 0 } }]).toArray()];
    const vec = await embed([q]).catch(() => null);
    if (vec) {
      const near = await db.collection("passages").aggregate([{ $vectorSearch: { index: INDEXES.vector.name, path: "embedding", queryVector: vec[0], numCandidates: 100, limit: limit * 2 } }, { $project: { embedding: 0 } }]).toArray().catch(() => []);
      if (near.length) lists.push(near);
    }
    return rrf(lists).slice(0, limit);
  }
  return { name: "atlas", refresh: async () => {}, facts, passages };
}
