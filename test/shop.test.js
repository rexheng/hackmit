import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { llm, startApp, stopApp } from "./helpers.js";
import { CheckoutResponse, PartsResponse, QuoteResponse } from "../server/pipeline/schemas.js";

let api, db;
beforeAll(async () => { ({ api, db } = await startApp()); });
afterAll(stopApp);
beforeEach(() => llm.complete.mockReset());

describe("parts, quote, checkout", () => {
  it("lists parts from cited pages and only confirms compatibility the manual states", async () => {
    const res = await api.post("/api/parts").send({ question: "pad axle torque BR-R8070", bike: "BR-R8070" });
    const parts = PartsResponse.parse(res.body).parts;
    expect(parts.find((p) => p.partNumber === "Y8PU98010").compatibility).toBe("confirmed");
    const other = await api.post("/api/parts").send({ question: "pad axle torque BR-R8070", bike: "RD-R8000" });
    expect(other.body.parts.find((p) => p.partNumber === "Y8PU98010").compatibility).toBe("unknown");
  });

  it("builds a quote from sample prices and the hourly rate, and says they are sample prices", async () => {
    const res = await api.post("/api/quote").send({ bike: "test bike", parts: [{ partNumber: "Y8PU98010", qty: 2 }, { partNumber: "NOPE-1" }], laborMinutes: 30 });
    const q = QuoteResponse.parse(res.body);
    expect(q.partsUsd).toBe(48);
    expect(q.parts[1].priceUsd).toBeNull();
    expect(q.notice).toMatch(/sample prices/i);
    expect(q.total).toBe(48 + q.laborUsd);
  });

  it("8. checkout-demo rejects anything that looks like card data, and stores none of it", async () => {
    const quote = (await api.post("/api/quote").send({ bike: "b", parts: [], laborMinutes: 10 })).body;
    for (const bad of [{ quoteId: quote.quoteId, cardNumber: "4242 4242 4242 4242" }, { quoteId: quote.quoteId, cvv: "123" }, { quoteId: quote.quoteId, customerName: "4242424242424242" }, { quoteId: quote.quoteId, note: "hello" }]) {
      expect((await api.post("/api/checkout-demo").send(bad)).status).toBe(400);
    }
    const ok = await api.post("/api/checkout-demo").send({ quoteId: quote.quoteId });
    expect(CheckoutResponse.parse(ok.body).demo).toBe(true);
    const stored = JSON.stringify(await db.collection("quotes").find().toArray());
    expect(stored).not.toContain("4242");
  });

  it("health, manuals and stats respond", async () => {
    expect((await api.get("/api/health")).body.backend).toBe("local");
    expect((await api.get("/api/manuals")).body.manuals[0].fixture).toBe(true);
    expect((await api.get("/api/stats")).body).toHaveProperty("zeroModelCallShare");
  });
});
