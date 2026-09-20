import { describe, expect, it } from "vitest";
import { guard, literalNumbers, quantities } from "../server/guard.js";
import { assemble } from "../server/pipeline/procedure.js";
import { verifyFact } from "../ingest/extractFacts.js";

const SOURCE = "Clamp bolt tightening torque: 12 – 14 N·m. Use TL-FC16 on FC-R8000.";

describe("guard", () => {
  it("2. blocks an answer containing a number that is not in the retrieved text", () => {
    const res = guard("Tighten the clamp bolts to 16 N·m.", [SOURCE]);
    expect(res.passed).toBe(false);
    expect(res.blockedNumbers[0]).toContain("16");
  });

  it("passes numbers that are in the text, across dash and spacing variants", () => {
    expect(guard("Tighten to 12-14 Nm with TL-FC16.", [SOURCE]).passed).toBe(true);
    expect(guard("Tighten to 12 to 14 N m.", [SOURCE]).passed).toBe(true);
    expect([...quantities("35 – 55 N·m").keys()]).toContain("35-55|nm");
  });

  it("blocks a part or model code the manuals never mention", () => {
    expect(guard("Use TL-FC99.", [SOURCE]).blockedNumbers).toContain("TL-FC99");
  });

  it("3b. placeholder substitution, and a literal number is caught", () => {
    const P = [{ id: "P1", doc: { page: 2, text: SOURCE } }];
    const F = [{ id: "F1", doc: { name: "Clamp bolt tightening torque", value: "12 - 14", unit: "N·m", verbatimText: SOURCE } }];
    const good = assemble("1. Tighten the clamp bolts to {{fact:F1}} [P1].", P, F);
    expect(good.guard.passed).toBe(true);
    expect(good.text).toContain("12 - 14 N·m");
    expect(assemble("1. Tighten to 13 N·m [P1].", P, F).guard.passed).toBe(false);
    expect(assemble("1. Tighten to {{fact:F9}} [P1].", P, F).guard.passed).toBe(false);
    expect(literalNumbers("1. Do this.\n2. Then {{fact:F1}} [P1].")).toEqual([]);
  });
});

describe("fact verbatim assertion", () => {
  const page = "Cable fixing bolt tightening torque: 6 – 7 N·m for RD-R8000.";
  const fact = { specType: "torque", name: "Cable fixing bolt", value: "6 - 7", unit: "N·m", models: ["RD-R8000"], verbatimText: "Cable fixing bolt tightening torque: 6 – 7 N·m" };

  it("keeps a fact whose value is on the page, even with a different dash", () => {
    expect(verifyFact(fact, page)?.value).toBe("6 - 7");
    expect(verifyFact({ ...fact, value: "6 to 7" }, page)).not.toBeNull();
  });

  it("6. drops a fabricated fact", () => {
    expect(verifyFact({ ...fact, value: "9 - 11" }, page)).toBeNull();
    expect(verifyFact({ ...fact, models: ["RD-M9100"] }, page)).toBeNull();
    expect(verifyFact({ ...fact, verbatimText: "Something the page never says" }, page)).toBeNull();
  });
});
