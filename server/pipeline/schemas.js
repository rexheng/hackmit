import { z } from "zod";

export const AskRequest = z.object({ question: z.string().trim().min(3).max(500), bike: z.string().trim().max(120).optional() });

const Citation = z.object({ manualId: z.string(), manualTitle: z.string(), page: z.number().int(), pdfUrl: z.string().nullable(), verbatimText: z.string() });
const Part = z.object({ partNumber: z.string(), name: z.string(), manualId: z.string(), page: z.number().int(), compatibility: z.enum(["confirmed", "unknown", "incompatible"]) });

export const AskResponse = z.object({
  answerMarkdown: z.string(),
  path: z.enum(["lookup", "procedure", "refusal", "clarify"]),
  citations: z.array(Citation),
  parts: z.array(Part),
  safety: z.boolean(),
  safetyText: z.string().optional(),
  guard: z.object({ passed: z.boolean(), blockedNumbers: z.array(z.string()) }),
  usage: z.object({ modelCalls: z.number().int(), tokensIn: z.number(), tokensOut: z.number(), costUsd: z.number(), latencyMs: z.number(), routedBy: z.enum(["rules", "model", "none"]), cached: z.boolean().optional() }),
});

export const PartsRequest = z.object({ citations: z.array(z.object({ manualId: z.string(), page: z.number().int() })).optional(), question: z.string().optional(), bike: z.string().optional() })
  .refine((v) => v.citations?.length || v.question, "send citations or a question");
export const PartsResponse = z.object({ parts: z.array(Part) });

export const QuoteRequest = z.object({ bike: z.string().max(120).default(""), parts: z.array(z.object({ partNumber: z.string(), name: z.string().optional(), qty: z.number().int().min(1).max(99).default(1) })).max(50), laborMinutes: z.number().min(0).max(6000).default(0) });
export const QuoteResponse = z.object({
  quoteId: z.string(), createdAt: z.string(), bike: z.string(),
  parts: z.array(z.object({ partNumber: z.string(), name: z.string(), qty: z.number(), priceUsd: z.number().nullable(), lineUsd: z.number().nullable() })),
  laborMinutes: z.number(), hourlyRate: z.number(), laborUsd: z.number(), partsUsd: z.number(), total: z.number(),
  demo: z.literal(true), notice: z.string(),
});

// The demo checkout takes a quote id and nothing else. .strict() rejects any extra field at all.
export const CheckoutRequest = z.object({ quoteId: z.string().min(1), customerName: z.string().max(80).optional() }).strict();
export const CheckoutResponse = z.object({ demo: z.literal(true), orderId: z.string(), quoteId: z.string(), total: z.number(), message: z.string() });
