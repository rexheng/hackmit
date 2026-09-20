// Shared test setup: in-memory MongoDB, the labeled fixture, local search, and a mocked LLM. No network, no keys.
import { vi } from "vitest";
import request from "supertest";

export const llm = { complete: vi.fn(), embed: vi.fn(async () => null) };
vi.mock("../server/llm.js", () => ({ complete: (...a) => llm.complete(...a), embed: (...a) => llm.embed(...a) }));

export async function startApp() {
  const { connect } = await import("../server/db.js");
  const { createApp } = await import("../server/index.js");
  const db = await connect("");
  const { app, ctx } = await createApp({ db });
  return { app, ctx, db, api: request(app) };
}

export async function stopApp() {
  const { close } = await import("../server/db.js");
  await close();
}

export const usageOf = (kind) => ({ model: "mock", tokensIn: 10, tokensOut: 5, costUsd: 0, latencyMs: 1, kind });
