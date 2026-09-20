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


## Vehicle repair studio

Run `npm run dev:vehicles` for the API on port 3001 and `npm run dev -w web -- --host 127.0.0.1` for the viewer on port 5173. Open `/vehicles/corvette-c8?tab=repair` (also `yzf-2021` and `honda-cbr650r`). The root bicycle/manual demo remains separate.

The ignored root `.env` holds `OPENAI_API_KEY`. Do not use a `VITE_` variable for the key. `OPENAI_DIAGNOSIS_MODEL` defaults to the account-tested `gpt-5.4-2026-03-05`; diagnosis uses **medium reasoning** and one API call. Priority processing is enabled for lower latency at a higher per-token price (`OPENAI_DIAGNOSIS_SERVICE_TIER=default` selects standard processing). Restart the API after environment or server changes.

`POST /api/vehicles/diagnose` accepts `{vehicleId, year?, variant?, description?, images?}`. Supply text, **one** JPEG/PNG/WebP data URL, or both. The UI resizes photos locally; the server rejects a second photo, remote URLs, invalid image signatures and unsupported vehicles. Curated public photo fixtures can be selected individually through `exampleId` instead of `images`.

Every new result requires one completed OpenAI Responses API call on the submitted evidence. Photo 2 (the engine-bay view) is the first/default choice in the upload area’s Try Demo dropdown. Make/model options appear only when their picker is opened; the intake does not collect year or trim. There is no saved Codex assessment or offline diagnosis fallback. `GET /api/vehicles/diagnosis/status` reports configuration without exposing the key. Requests use `store:false`; the application does not persist submitted photos or descriptions. Results include model names, response IDs, timestamp, elapsed API duration and input modality.

Vehicle mismatch, limited and unusable evidence block automatic 3D localization and manual pairing. All diagnoses remain provisional. Only allowlisted source groups can be highlighted, and these are approximate assembly context, not photo-to-mesh registration. Current assets lack verified target-part geometry and tool paths: **repair animations remain unavailable**. The animated inspection separates the original model groups. Manual references are conditional and restricted to the verified edition/vehicle match; an unrelated static repair is never paired with the live assessment.

Nearby service leads are sourced for Cambridge MA 02139. Published hourly rates are distinguished from provider-issued quotes; unknown totals remain null. Quote requests are editable, unsent downloads. The app does not contact shops or book repairs.

Validation: `npm test` includes modality, one-photo enforcement, cross-vehicle/manual mismatches, API failure, image bounds, weak-evidence abstention, provenance, pricing, and actual source-group checks. A stronger model is not an accuracy guarantee. Before production, evaluate a labeled, technician-reviewed damage set, including poor photos, ambiguous components and no-fault cases; measure wrong-part identification and abstention, then validate each manual-to-mesh binding separately.

Single-pass latency smoke test: photo 2 completed in 7.0 seconds using GPT-5.4 medium reasoning on the priority tier (2026-09-19). This is an observed run, not a latency guarantee; no obvious damage was localized, and repair instructions remained withheld. The previous two-pass path is no longer used.
