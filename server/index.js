import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { existsSync } from "node:fs";
import pino from "pino";
import { config } from "./config.js";
import { connect, isFixture } from "./db.js";
import { createSearch } from "./search/index.js";
import { askRoutes } from "./routes/ask.js";
import { infoRoutes } from "./routes/info.js";
import { shopRoutes } from "./routes/shop.js";
import {vehicleVisionRoutes} from './routes/vehicle-vision.js';
import {serveVehicleAsset} from '../web/local-model-assets.js';
import {VEHICLES} from '../shared/vehicles.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const log = pino({ name: "bike", level: process.env.LOG_LEVEL || "info" });

export async function createApp({ db, search } = {}) {
  db ??= await connect();
  search ??= await createSearch(db);
  const ctx = { db, search };
  const app = express();
  app.use('/api/vehicles', vehicleVisionRoutes());
  for (const id of Object.keys(VEHICLES)) app.use(`/models/${id}`, (req,res) => serveVehicleAsset(id,req,res));
  app.use(express.json({ limit: "50kb" }));
  app.use("/api", askRoutes(ctx), infoRoutes(ctx), shopRoutes(ctx));
  app.use("/manuals", express.static(path.join(root, "manuals"), { index: false }));
  const dist = path.join(root, "web", "dist");
  if (existsSync(dist)) {
    app.use(express.static(dist));
    app.get(/^\/(?!api|manuals).*/, (_req, res) => res.sendFile(path.join(dist, "index.html")));
  } else app.get("/", (_req, res) => res.type("text").send("Bike API is running. Build the web app with: npm run build"));
  // Request bodies are never logged: they could hold anything a user typed.
  app.use((err, _req, res, _next) => { log.error({ err: err.message }, "request failed"); res.status(500).json({ error: "Something went wrong." }); });
  return { app, ctx };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { app, ctx } = await createApp();
  app.listen(config.port, () => log.info({ port: config.port, backend: ctx.search.name, fixtureData: isFixture(), dryRun: config.dryRun }, "Bike is listening"));
}
