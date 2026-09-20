// The one door to a language model. Every call is counted: tokens, dollars, latency.
// DRY_RUN=1 answers from a deterministic stand-in, so the app can be exercised with no key.
import pino from "pino";
import { config, costUsd } from "./config.js";

const log = pino({ name: "llm", level: process.env.LOG_LEVEL || "info" });
let anthropic, openai;

async function callAnthropic(model, system, user, maxTokens) {
  if (!anthropic) anthropic = new (await import("@anthropic-ai/sdk")).default();
  const res = await anthropic.messages.create({ model, max_tokens: maxTokens, system, messages: [{ role: "user", content: user }] });
  const text = res.content.filter((b) => b.type === "text").map((b) => b.text).join("");
  return { text, tokensIn: res.usage.input_tokens, tokensOut: res.usage.output_tokens };
}

async function callOpenAI(model, system, user, maxTokens) {
  if (!openai) openai = new (await import("openai")).default();
  const res = await openai.chat.completions.create({ model, max_completion_tokens: maxTokens, messages: [{ role: "system", content: system }, { role: "user", content: user }] });
  return { text: res.choices[0].message.content || "", tokensIn: res.usage?.prompt_tokens || 0, tokensOut: res.usage?.completion_tokens || 0 };
}

// Stand-in used by DRY_RUN and nothing else. It never writes a number: it only uses the placeholders it was given.
function dryRun(meta) {
  if (meta.kind === "route") return "procedure";
  if (meta.kind === "facts") return "[]";
  if (meta.kind === "judge") return "incorrect";
  if (meta.kind === "procedure") {
    const p = meta.passages || [], f = meta.candidates || [];
    const lines = p.slice(0, 3).map((x, i) => `${i + 1}. Follow the cited manual section [${x.id}].`);
    if (f[0]) lines.push(`${lines.length + 1}. Tighten to {{fact:${f[0].id}}} [${p[0]?.id || ""}].`);
    return lines.join("\n");
  }
  return "";
}

/** size: "small" | "large". meta.kind labels the call in logs and drives DRY_RUN. */
export async function complete({ size = "small", system = "", user, maxTokens = 2048, meta = {} }) {
  const model = size === "large" ? config.modelLarge : config.modelSmall;
  const started = Date.now();
  let out;
  if (config.dryRun) out = { text: dryRun(meta), tokensIn: 0, tokensOut: 0 };
  else if (config.llmProvider === "openai") out = await callOpenAI(model, system, user, maxTokens);
  else out = await callAnthropic(model, system, user, maxTokens);
  const latencyMs = Date.now() - started;
  const dollars = costUsd(model, out.tokensIn, out.tokensOut);
  if (dollars === null && !config.dryRun) log.warn({ model }, "no price for this model in server/config.js; cost logged as 0");
  const usage = { model, tokensIn: out.tokensIn, tokensOut: out.tokensOut, costUsd: dollars ?? 0, latencyMs, kind: meta.kind || "other" };
  log.info(usage, "llm call");
  return { text: out.text, usage };
}

export async function embed(texts) {
  if (!config.embeddingsOn) return null;
  if (!openai) openai = new (await import("openai")).default();
  const res = await openai.embeddings.create({ model: config.embeddingModel, input: texts });
  return res.data.map((d) => d.embedding);
}
