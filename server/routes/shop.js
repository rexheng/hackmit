// Parts, quote and the demo checkout. Prices are a sample list and every response says so.
// The checkout never accepts, logs or stores card data: the schema is strict and card-like input is rejected first.
import { Router } from "express";
import { ObjectId } from "mongodb";
import { config } from "../config.js";
import { PartsRequest, PartsResponse, QuoteRequest, QuoteResponse, CheckoutRequest, CheckoutResponse } from "../pipeline/schemas.js";
import { ask } from "../pipeline/ask.js";
import { partsFor } from "../pipeline/cite.js";
import { detect } from "../pipeline/detect.js";

const CARD_KEY = /card|pan\b|cvv|cvc|ccv|expir|exp_?(month|year)|security_?code|account_?number|iban|routing/i;
const CARD_VALUE = /\b(?:\d[ -]?){13,19}\b/;

export function looksLikeCardData(value, key = "") {
  if (CARD_KEY.test(key)) return true;
  if (typeof value === "string") return CARD_VALUE.test(value);
  if (typeof value === "number") return String(value).length >= 13;
  if (value && typeof value === "object") return Object.entries(value).some(([k, v]) => looksLikeCardData(v, k));
  return false;
}

export function shopRoutes(ctx) {
  const { db } = ctx, r = Router();

  r.post("/parts", async (req, res, next) => {
    try {
      const body = PartsRequest.safeParse(req.body);
      if (!body.success) return res.status(400).json({ error: "Send citations or a question." });
      const cites = body.data.citations?.length ? body.data.citations : (await ask(ctx, { question: body.data.question, bike: body.data.bike })).citations;
      const models = await db.collection("facts").distinct("models");
      const bikeModels = body.data.bike ? detect(body.data.bike, { models, brands: [] }).models : [];
      res.json(PartsResponse.parse({ parts: await partsFor(db, cites, bikeModels) }));
    } catch (e) { next(e); }
  });

  r.post("/quote", async (req, res, next) => {
    try {
      const body = QuoteRequest.safeParse(req.body);
      if (!body.success) return res.status(400).json({ error: "Send { bike, parts[], laborMinutes }." });
      const { bike, parts, laborMinutes } = body.data;
      const prices = new Map((await db.collection("prices").find({ partNumber: { $in: parts.map((p) => p.partNumber) } }).toArray()).map((p) => [p.partNumber, p]));
      const lines = parts.map((p) => {
        const price = prices.get(p.partNumber);
        return { partNumber: p.partNumber, name: price?.name || p.name || p.partNumber, qty: p.qty, priceUsd: price?.priceUsd ?? null, lineUsd: price ? Number((price.priceUsd * p.qty).toFixed(2)) : null };
      });
      const partsUsd = Number(lines.reduce((a, l) => a + (l.lineUsd || 0), 0).toFixed(2));
      const laborUsd = Number(((laborMinutes / 60) * config.hourlyRate).toFixed(2));
      const doc = { createdAt: new Date(), bike, parts: lines, laborMinutes, hourlyRate: config.hourlyRate, total: Number((partsUsd + laborUsd).toFixed(2)), demo: true };
      const { insertedId } = await db.collection("quotes").insertOne(doc);
      res.json(QuoteResponse.parse({ ...doc, quoteId: String(insertedId), createdAt: doc.createdAt.toISOString(), laborUsd, partsUsd,
        notice: "Sample prices for demonstration only. Parts with no sample price show as not priced." }));
    } catch (e) { next(e); }
  });

  r.post("/checkout-demo", async (req, res, next) => {
    try {
      if (looksLikeCardData(req.body)) return res.status(400).json({ error: "This is a demo. Do not send payment details. Nothing was stored." });
      const body = CheckoutRequest.safeParse(req.body);
      if (!body.success) return res.status(400).json({ error: "Send { quoteId } only." });
      const quote = ObjectId.isValid(body.data.quoteId) ? await db.collection("quotes").findOne({ _id: new ObjectId(body.data.quoteId) }) : null;
      if (!quote) return res.status(404).json({ error: "Quote not found." });
      res.json(CheckoutResponse.parse({ demo: true, orderId: `DEMO-${String(quote._id).slice(-6).toUpperCase()}`, quoteId: String(quote._id), total: quote.total, message: "Demo order. No payment was taken and no payment details were collected." }));
    } catch (e) { next(e); }
  });
  return r;
}
