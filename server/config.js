// All settings come from the environment. Prices live here and nowhere else.
import "dotenv/config";

const env = process.env;

export const config = {
  mongoUri: env.MONGODB_URI || "",
  mongoDb: env.MONGODB_DB || "bike",
  searchBackend: env.SEARCH_BACKEND || "local",
  elasticUrl: env.ELASTIC_URL || "",
  elasticApiKey: env.ELASTIC_API_KEY || "",
  llmProvider: env.LLM_PROVIDER || "anthropic",
  modelSmall: env.LLM_MODEL_SMALL || "claude-haiku-4-5",
  modelLarge: env.LLM_MODEL_LARGE || "claude-opus-5",
  embeddingModel: env.EMBEDDING_MODEL || "text-embedding-3-small",
  embeddingsOn: Boolean(env.OPENAI_API_KEY),
  refusalThreshold: Number(env.REFUSAL_THRESHOLD || 0.5),
  port: Number(env.PORT || 3000),
  hourlyRate: Number(env.SHOP_HOURLY_RATE || 90),
  dryRun: env.DRY_RUN === "1",
};

// US dollars per million tokens. Anthropic prices are the published list prices.
// Add a row for any other model you use; an unknown model is logged with cost 0 and a warning.
export const PRICES = {
  "claude-haiku-4-5": { in: 1, out: 5 },
  "claude-sonnet-5": { in: 2, out: 10 },
  "claude-sonnet-4-6": { in: 3, out: 15 },
  "claude-opus-5": { in: 5, out: 25 },
  "claude-opus-4-8": { in: 5, out: 25 },
  "claude-fable-5-1": { in: 10, out: 50 },
};

export function costUsd(model, tokensIn, tokensOut) {
  const p = PRICES[model];
  if (!p) return null;
  return (tokensIn * p.in + tokensOut * p.out) / 1e6;
}
