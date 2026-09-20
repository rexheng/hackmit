// npm run eval -- --limit 15 --max-usd 5
// Three systems on the same questions:
//   memory_only  large model, no retrieval
//   stuffed      large model with the whole relevant manual pasted into the prompt
//   bike         our /api/ask pipeline
// Grading is strict: every number-with-unit in the truth must appear in the answer. The small model judges
// only answers whose truth has no numbers. The run stops before it would pass --max-usd.
import { readFile, writeFile } from "node:fs/promises";
import { config, costUsd } from "../server/config.js";
import { connect, close } from "../server/db.js";
import { createSearch } from "../server/search/index.js";
import { complete } from "../server/llm.js";
import { ask, clearCache } from "../server/pipeline/ask.js";
import { quantities } from "../server/guard.js";

const arg = (name, fallback) => { const i = process.argv.indexOf(name); return i > 0 ? Number(process.argv[i + 1]) : fallback; };
const LIMIT = arg("--limit", Infinity), MAX_USD = arg("--max-usd", 5), STUFF_CHARS = 400_000;
const REFUSED = /do(?:es)? not cover|don't know|do not know|cannot (?:find|answer)|not sure|unable to|no information/i;

let spent = 0;
const budgetLeft = (estimate = 0) => spent + estimate <= MAX_USD;

async function llmAnswer(system, user) {
  const estimate = costUsd(config.modelLarge, user.length / 4, 300) ?? 0;
  if (!budgetLeft(estimate)) return null;
  const { text, usage } = await complete({ size: "large", system, user, maxTokens: 1024, meta: { kind: "eval" } });
  spent += usage.costUsd;
  return { answer: text, refused: REFUSED.test(text), tokens: usage.tokensIn + usage.tokensOut, costUsd: usage.costUsd, latencyMs: usage.latencyMs };
}

async function grade(q, answer) {
  const truth = quantities(q.truth.answer);
  if (truth.size) { const got = quantities(answer); return [...truth.keys()].every((k) => got.has(k)); }
  if (!budgetLeft(0.01)) return false;
  const { text, usage } = await complete({ size: "small", maxTokens: 5, meta: { kind: "judge" },
    system: "You grade an answer against the true answer from a service manual. Reply with exactly one word: correct or incorrect. Be strict: a different part number, tool or compatibility statement is incorrect.",
    user: `Question: ${q.question}\nTrue answer: ${q.truth.answer}\nAnswer to grade: ${answer}` });
  spent += usage.costUsd;
  return /^\s*correct/i.test(text);
}

async function main() {
  const questions = JSON.parse(await readFile("eval/eval_questions.json", "utf8")).slice(0, LIMIT);
  if (!questions.length) { console.log("eval/eval_questions.json is empty. Add questions with { id, question, difficulty, truth: { answer, manual, page } }."); return; }
  const db = await connect(), search = await createSearch(db);
  const manuals = await db.collection("manuals").find().toArray();
  const manualText = async (title) => {
    const m = manuals.find((x) => x.title === title) || manuals.find((x) => title && x.title.toLowerCase().includes(String(title).toLowerCase()));
    if (!m) return "";
    const pages = await db.collection("pages").find({ manualId: m._id }).sort({ page: 1 }).toArray();
    return pages.map((p) => `[page ${p.page}]\n${p.text}`).join("\n\n").slice(0, STUFF_CHARS);
  };

  const systems = {
    memory_only: (q) => llmAnswer("You are a bike mechanic. Answer briefly. If you do not know, say you do not know.", q.question),
    stuffed: async (q) => llmAnswer("Answer briefly using only the manual text given. If it is not covered, say the manual does not cover it.", `${await manualText(q.truth.manual)}\n\nQuestion: ${q.question}`),
    bike: async (q) => { clearCache(); const r = await ask({ db, search }, { question: q.question }); spent += r.usage.costUsd; return { answer: r.answerMarkdown, refused: r.path === "refusal" || r.path === "clarify" || !r.guard.passed, tokens: r.usage.tokensIn + r.usage.tokensOut, costUsd: r.usage.costUsd, latencyMs: r.usage.latencyMs }; },
  };

  const results = [];
  outer: for (const q of questions) for (const [name, run] of Object.entries(systems)) {
    const out = await run(q).catch((e) => ({ answer: `ERROR ${e.message}`, refused: true, tokens: 0, costUsd: 0, latencyMs: 0 }));
    if (!out) { console.log(`Stopped: the next call would pass --max-usd ${MAX_USD}.`); break outer; }
    const correct = out.refused ? false : await grade(q, out.answer);
    results.push({ id: q.id, difficulty: q.difficulty, system: name, correct, refused: out.refused, wrongAndConfident: !correct && !out.refused, tokens: out.tokens, costUsd: out.costUsd, latencyMs: out.latencyMs, answer: out.answer.slice(0, 400) });
  }

  const rows = Object.keys(systems).map((name) => {
    const r = results.filter((x) => x.system === name), n = r.length || 1, sum = (k) => r.reduce((a, x) => a + x[k], 0);
    return { system: name, questions: r.length, correct: sum("correct"), refused: sum("refused"), wrongAndConfident: sum("wrongAndConfident"), tokens: sum("tokens"), costUsd: sum("costUsd").toFixed(4), meanLatencyMs: Math.round(sum("latencyMs") / n) };
  });
  await writeFile("eval/results.json", JSON.stringify({ ranAt: new Date().toISOString(), models: { small: config.modelSmall, large: config.modelLarge }, backend: search.name, spentUsd: Number(spent.toFixed(4)), summary: rows, results }, null, 1));
  const table = ["| system | questions | correct | refused | wrong and confident | tokens | cost USD | mean latency ms |", "|---|---|---|---|---|---|---|---|",
    ...rows.map((r) => `| ${r.system} | ${r.questions} | ${r.correct} | ${r.refused} | ${r.wrongAndConfident} | ${r.tokens} | ${r.costUsd} | ${r.meanLatencyMs} |`)].join("\n");
  await writeFile("eval/REPORT.md", `# Bike eval\n\nRan ${new Date().toISOString()} on ${questions.length} questions. Search backend: ${search.name}. Large model: ${config.modelLarge}. Spent $${spent.toFixed(4)} of a $${MAX_USD} cap.\n\n${table}\n\n"Wrong and confident" is the number that matters in a repair shop: an answer that was given, and was wrong.\nGrading is strict on numbers: every quantity in the truth must appear, with its unit, in the answer.\n`);
  console.table(rows);
  await close();
}

main().catch((e) => { console.error(e.message); process.exit(1); });
