# Bike

A service desk for a small bike repair shop. A mechanic asks a repair question. Bike answers **only from manufacturer service manuals**, shows the manual page beside the answer, lists exact parts, and builds a parts cart and a customer quote.

The rule the code enforces: **the language model never produces a number, a part number, or a compatibility fact.** Those are copied verbatim from the manuals out of MongoDB. The model only routes questions and writes connecting prose, and a code guard checks every answer. When the manuals do not cover a question, Bike refuses and shows the nearest pages.

## Setup

```bash
npm install                      # installs server and web (npm workspaces)
cp .env.example .env             # fill in what you have; everything is optional for a first run
npm test                         # 17 tests, no network, no keys
npm run build                    # builds the web app into web/dist
DRY_RUN=1 npm run dev            # http://localhost:3000, on the labeled test fixture, with a stand-in model
```

With no `MONGODB_URI`, Bike starts an in-memory MongoDB and loads a **labeled fixture with made-up values**. The UI says so in a banner.

## Your manuals

Put PDFs in `manuals/` and list them in `manuals/sources.csv` (`title,brand,url,file`).

```bash
npm run ingest -- --dry          # parse every PDF, print page counts. No model, no database.
npm run ingest                   # extract facts with the small model, verify each one in code, store in MongoDB
npm run seed:prices              # SAMPLE prices for the part numbers found, so the quote flow can be shown
```

Ingest prints, per manual: pages, passages, facts kept, facts dropped. A fact is kept only if its value and model code appear on that page (dashes and "to" ranges normalized). Model responses are cached in `.cache/` by page hash, so reruns are free. Re-ingesting a manual replaces its documents.

## MongoDB Atlas

Set `MONGODB_URI` and `SEARCH_BACKEND=atlas`, then:

```bash
npm run indexes                  # creates Atlas Search (+ Vector Search if OPENAI_API_KEY is set)
SEARCH_BACKEND=atlas npm run dev
```

If your tier blocks index creation through the driver, the script prints the exact index JSON and the Atlas UI steps, and exits cleanly. Embeddings need `OPENAI_API_KEY`; without it vector search is skipped and fuzzy text search still works.

## Elasticsearch

```bash
# set ELASTIC_URL (and ELASTIC_API_KEY)
npm run sync:elastic             # copies facts and passages from MongoDB. MongoDB stays the system of record.
SEARCH_BACKEND=elastic npm run dev
```

## Eval

`eval/eval_questions.json`: `[{ id, question, difficulty, truth: { answer, manual, page } }]`

```bash
npm run eval -- --limit 15 --max-usd 5
```

Runs `memory_only`, `stuffed` and `bike` on the same questions, grades strictly (every number and unit in the truth must appear), and writes `eval/REPORT.md` and `eval/results.json`. It stops before it would pass `--max-usd`.

## Two minute demo

1. **Typo lookup.** Ask "ultegra r800 rear mech bracket axle torque". Point at the usage line: *0 model calls*, a few milliseconds, the number copied from the page shown beside it.
2. **Procedure.** Ask "how do I replace the brake pads on BR-R8070". The page shows first with the manual's own WARNING, because brakes are safety-critical. Every quantity in the steps is a fact filled in by code.
3. **The guard.** Say what happens if the model types its own number: the text is withheld and only the manual pages are shown. `npm test` proves it.
4. **Refusal.** Ask "what tyre pressure for gravel". "The manuals I have do not cover that." Nearest pages, zero model calls.
5. **Parts to quote.** Press Parts. Compatibility says "fits, per the manual" only when the manual says so. Build the quote, print it, run the demo checkout. No card fields exist anywhere.
6. **Stats.** Share of questions answered with zero model calls, mean cost and latency by path.

## Endpoints

`POST /api/ask` · `POST /api/parts` · `POST /api/quote` · `POST /api/checkout-demo` · `GET /api/health` · `GET /api/manuals` · `GET /api/stats`

See `DECISIONS.md` for the choices made while building.
