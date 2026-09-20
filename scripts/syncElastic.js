// npm run sync:elastic: copy facts and passages from MongoDB into Elasticsearch. MongoDB stays the system of record.
import { config } from "../server/config.js";
import { connect, close } from "../server/db.js";
import { elasticClient, ES_INDEX } from "../server/search/elastic.js";
import { factText, passageText } from "../server/search/shape.js";

if (!config.elasticUrl || !config.mongoUri) { console.log("Set ELASTIC_URL and MONGODB_URI first."); process.exit(0); }
const db = await connect(), es = await elasticClient();

async function sync(coll, index, toText) {
  const docs = await db.collection(coll).find().toArray();
  const dims = docs.find((d) => d.embedding)?.embedding.length;
  await es.indices.delete({ index }, { ignore: [404] });
  await es.indices.create({ index, mappings: { properties: { text: { type: "text" }, ...(dims ? { embedding: { type: "dense_vector", dims, index: true, similarity: "cosine" } } : {}) } } });
  const operations = docs.flatMap((d) => [{ index: { _index: index, _id: String(d._id) } }, { text: toText(d), ...(d.embedding ? { embedding: d.embedding } : {}) }]);
  if (operations.length) await es.bulk({ refresh: true, operations });
  console.log(`${index}: ${docs.length} documents`);
}

await sync("facts", ES_INDEX.facts, factText);
await sync("passages", ES_INDEX.passages, passageText);
await close();
