// One interface, three backends. Every backend returns plain MongoDB documents; scoring for thresholds
// happens in the pipeline (text.js coverage), so local, atlas and elastic refuse at the same point.
import { config } from "../config.js";

export async function createSearch(db, backend = config.searchBackend) {
  if (backend === "atlas") return (await import("./atlas.js")).createAtlasSearch(db);
  if (backend === "elastic") return (await import("./elastic.js")).createElasticSearch(db);
  return (await import("./local.js")).createLocalSearch(db);
}
