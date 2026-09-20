// npm run seed:prices: give every part number found in the manuals a SAMPLE price, so the quote flow can be shown.
// These are not real prices. Every one is stored with sample: true and the app labels them everywhere.
import { config } from "../server/config.js";
import { connect, close } from "../server/db.js";

if (!config.mongoUri) { console.log("MONGODB_URI is not set. With no database the app runs on the fixture, which has its own sample prices."); process.exit(0); }
const db = await connect();
const parts = await db.collection("facts").find({ specType: "part_number" }).toArray();
let n = 0;
for (const f of parts) {
  // A stable placeholder between $5 and $120 derived from the part number, so reruns do not change it.
  const seed = [...String(f.value)].reduce((a, ch) => (a * 31 + ch.charCodeAt(0)) % 9973, 7);
  const priceUsd = Number((5 + (seed % 11500) / 100).toFixed(2));
  await db.collection("prices").updateOne({ partNumber: String(f.value) }, { $set: { partNumber: String(f.value), name: f.name, priceUsd, sample: true } }, { upsert: true });
  n++;
}
console.log(`${n} sample prices written. They are placeholders, not real prices.`);
await close();
