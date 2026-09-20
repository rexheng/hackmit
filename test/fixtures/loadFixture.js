// Loads the labeled fixture through the same verbatim check and the same store path as real ingest.
import { verifyFact } from "../../ingest/extractFacts.js";
import { storeManual } from "../../ingest/store.js";
import { FIXTURE_META, FIXTURE_PAGES, FIXTURE_FACTS, FIXTURE_PRICES } from "./manual.js";

export async function loadFixture(db) {
  const factsByPage = new Map();
  for (const f of FIXTURE_FACTS) {
    const ok = verifyFact(f, FIXTURE_PAGES.find((p) => p.page === f.page).text);
    if (!ok) throw new Error(`fixture fact failed its own verbatim check: ${f.name}`);
    factsByPage.set(f.page, [...(factsByPage.get(f.page) || []), ok]);
  }
  const out = await storeManual(db, { meta: FIXTURE_META, pages: FIXTURE_PAGES, factsByPage });
  await db.collection("prices").deleteMany({});
  await db.collection("prices").insertMany(FIXTURE_PRICES.map((p) => ({ ...p })));
  return out;
}
