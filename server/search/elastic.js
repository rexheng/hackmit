// Elasticsearch: BM25 with fuzziness, plus kNN when embeddings exist. MongoDB stays the system of record;
// scripts/syncElastic.js copies facts and passages across. Hits are re-read from MongoDB by _id.
import { ObjectId } from "mongodb";
import { config } from "../config.js";
import { embed } from "../llm.js";
import { rrf } from "./rrf.js";

export const ES_INDEX = { facts: "bike_facts", passages: "bike_passages" };

export async function elasticClient() {
  const { Client } = await import("@elastic/elasticsearch");
  return new Client({ node: config.elasticUrl, auth: config.elasticApiKey ? { apiKey: config.elasticApiKey } : undefined });
}

export async function createElasticSearch(db) {
  const es = await elasticClient();
  const hydrate = async (coll, hits) => {
    const ids = hits.map((h) => new ObjectId(h._id));
    const docs = new Map((await db.collection(coll).find({ _id: { $in: ids } }, { projection: { embedding: 0 } }).toArray()).map((d) => [String(d._id), d]));
    return hits.map((h) => docs.get(h._id)).filter(Boolean);
  };
  const bm25 = (index, q, size) => es.search({ index, size, query: { multi_match: { query: q, fields: ["text"], fuzziness: "AUTO", operator: "or" } } }).then((r) => r.hits.hits);

  async function facts(q, { limit = 8 } = {}) { return hydrate("facts", await bm25(ES_INDEX.facts, q, limit)); }
  async function passages(q, { limit = 6 } = {}) {
    const lists = [await hydrate("passages", await bm25(ES_INDEX.passages, q, limit * 2))];
    const vec = await embed([q]).catch(() => null);
    if (vec) {
      const knn = await es.search({ index: ES_INDEX.passages, knn: { field: "embedding", query_vector: vec[0], k: limit * 2, num_candidates: 100 } }).then((r) => r.hits.hits).catch(() => []);
      if (knn.length) lists.push(await hydrate("passages", knn));
    }
    return rrf(lists).slice(0, limit);
  }
  return { name: "elastic", refresh: async () => {}, facts, passages };
}
