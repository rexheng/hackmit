import { Router } from "express";
import { AskRequest, AskResponse } from "../pipeline/schemas.js";
import { ask } from "../pipeline/ask.js";

export function askRoutes(ctx) {
  const r = Router();
  r.post("/ask", async (req, res, next) => {
    try {
      const body = AskRequest.safeParse(req.body);
      if (!body.success) return res.status(400).json({ error: "Send { question } as text, 3 to 500 characters." });
      res.json(AskResponse.parse(await ask(ctx, body.data)));
    } catch (e) { next(e); }
  });
  return r;
}
