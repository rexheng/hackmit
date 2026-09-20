// npm run indexes: create the Atlas Search and Vector Search indexes through the driver.
// Some Atlas tiers block this. If so, print the exact JSON and the UI steps, and exit cleanly.
import { config } from "../server/config.js";
import { connect, close } from "../server/db.js";
import { INDEXES } from "../server/search/atlas.js";

const plan = [["facts", INDEXES.facts], ["passages", INDEXES.passages], ...(config.embeddingsOn ? [["passages", INDEXES.vector]] : [])];

function manualSteps() {
  console.log("\nCreate them by hand in the Atlas UI: Database > your cluster > Atlas Search > Create Search Index > JSON Editor.");
  for (const [coll, ix] of plan) console.log(`\nCollection: ${config.mongoDb}.${coll}\nIndex name: ${ix.name}\nType: ${ix.type === "vectorSearch" ? "Vector Search" : "Search"}\nDefinition:\n${JSON.stringify(ix.definition, null, 2)}`);
}

if (!config.mongoUri) { console.log("MONGODB_URI is not set."); manualSteps(); process.exit(0); }
try {
  const db = await connect();
  await db.collection("facts").createIndex({ manualId: 1, page: 1 });
  await db.collection("passages").createIndex({ manualId: 1, page: 1 });
  await db.collection("pages").createIndex({ manualId: 1, page: 1 });
  for (const [coll, ix] of plan) {
    const have = await db.collection(coll).listSearchIndexes(ix.name).toArray().catch(() => []);
    if (have.length) { console.log(`exists: ${coll}.${ix.name}`); continue; }
    await db.collection(coll).createSearchIndex({ name: ix.name, ...(ix.type ? { type: ix.type } : {}), definition: ix.definition });
    console.log(`created: ${coll}.${ix.name} (Atlas builds it in the background; give it a minute)`);
  }
  if (!config.embeddingsOn) console.log("No OPENAI_API_KEY, so the vector index was skipped. Fuzzy text search still works.");
} catch (e) {
  console.log(`Could not create search indexes through the driver: ${e.message}`);
  manualSteps();
} finally { await close(); }
