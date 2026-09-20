import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { llm, startApp, stopApp, usageOf } from "./helpers.js";
import { AskResponse } from "../server/pipeline/schemas.js";
import { clearCache, REFUSAL_SENTENCE } from "../server/pipeline/ask.js";

let api;
beforeAll(async () => { ({ api } = await startApp()); });
afterAll(stopApp);
beforeEach(() => { llm.complete.mockReset(); clearCache(); });

const ask = (question, bike) => api.post("/api/ask").send({ question, bike });

describe("POST /api/ask", () => {
  it("1. lookup path makes zero model calls", async () => {
    const res = await ask("what is the clamp bolt torque for FC-R8000");
    expect(res.body.path).toBe("lookup");
    expect(res.body.answerMarkdown).toContain("12 - 14 N·m");
    expect(res.body.usage.modelCalls).toBe(0);
    expect(llm.complete).not.toHaveBeenCalled();
  });

  it("3. placeholders are filled from facts, and a literal number typed by the model is blocked", async () => {
    llm.complete.mockImplementation(async ({ meta }) => ({ usage: usageOf(meta.kind), text: `1. Remove the pad axle and take out the pads [P1].\n2. Tighten the pad axle to {{fact:${meta.candidates[0].id}}} [P1].` }));
    const ok = await ask("how do I replace the brake pads on BR-R8070");
    expect(ok.body.path).toBe("procedure");
    expect(ok.body.guard.passed).toBe(true);
    expect(ok.body.answerMarkdown).not.toContain("{{fact:");
    expect(ok.body.answerMarkdown).toMatch(/\d/);

    clearCache();
    llm.complete.mockImplementation(async ({ meta }) => ({ usage: usageOf(meta.kind), text: "1. Tighten the pad axle to 9 N·m [P1]." }));
    const bad = await ask("how do I replace the brake pads on BR-R8070");
    expect(bad.body.guard.passed).toBe(false);
    expect(bad.body.guard.blockedNumbers).toContain("9");
    expect(bad.body.answerMarkdown).not.toContain("9 N·m");
    expect(bad.body.citations.length).toBeGreaterThan(0);
  });

  it("4. refusal triggers on a nonsense question and never calls the model", async () => {
    const res = await ask("what is the best pizza topping in naples");
    expect(res.body.path).toBe("refusal");
    expect(res.body.answerMarkdown).toBe(REFUSAL_SENTENCE);
    expect(res.body.citations.length).toBeLessThanOrEqual(3);
    expect(llm.complete).not.toHaveBeenCalled();
  });

  it("5. typos still find the right model codes", async () => {
    const res = await ask("ultegra r800 rear mech bracket axle torque");
    expect(res.body.path).toBe("lookup");
    expect(res.body.answerMarkdown).toContain("RD-R8000");
    expect(res.body.answerMarkdown).toContain("8 - 10 N·m");
    expect(llm.complete).not.toHaveBeenCalled();
  });

  it("asks one clarifying question when the part is ambiguous", async () => {
    const res = await ask("r8000 torque");
    expect(res.body.path).toBe("clarify");
    expect(llm.complete).not.toHaveBeenCalled();
  });

  it("flags safety-critical answers and copies the manual's warning", async () => {
    const res = await ask("pad axle torque BR-R8070");
    expect(res.body.safety).toBe(true);
    expect(res.body.safetyText).toContain("WARNING");
  });

  it("7. every response validates against the zod schema", async () => {
    llm.complete.mockImplementation(async ({ meta }) => ({ usage: usageOf(meta.kind), text: meta.kind === "route" ? "procedure" : "1. Remove the wheel [P1]." }));
    for (const q of ["clamp bolt torque FC-R8000", "how do I replace the brake pads on BR-R8070", "best pizza topping in naples", "r8000 torque"]) {
      const res = await ask(q);
      expect(res.status).toBe(200);
      expect(() => AskResponse.parse(res.body)).not.toThrow();
    }
    expect((await api.post("/api/ask").send({ question: "" })).status).toBe(400);
  });
});
