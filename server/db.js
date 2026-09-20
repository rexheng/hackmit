// MongoDB connection. With no MONGODB_URI, an in-memory MongoDB is started and loaded with the
// labeled test fixture, so the app runs with no keys and no network.
import { MongoClient } from "mongodb";
import { config } from "./config.js";

let client, db, memoryServer;

export async function connect(uri = config.mongoUri) {
  if (db) return db;
  let usedFixture = false;
  if (!uri) {
    const { MongoMemoryServer } = await import("mongodb-memory-server");
    memoryServer = await MongoMemoryServer.create();
    uri = memoryServer.getUri();
    usedFixture = true;
  }
  client = new MongoClient(uri);
  await client.connect();
  db = client.db(config.mongoDb);
  if (usedFixture) {
    const { loadFixture } = await import("../test/fixtures/loadFixture.js");
    await loadFixture(db);
  }
  return db;
}

export function getDb() {
  if (!db) throw new Error("connect() first");
  return db;
}

export const isFixture = () => Boolean(memoryServer);

export async function close() {
  await client?.close();
  await memoryServer?.stop();
  client = db = memoryServer = undefined;
}

export const COLLECTIONS = ["manuals", "pages", "passages", "facts", "prices", "questions", "quotes"];
