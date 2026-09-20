# Motion Lab vehicle inspection and repair studio

The active vehicles are Yamaha YZF 2021, Honda CBR650R and Chevrolet Corvette C8 Stingray. BMW and Lamborghini were replaced; their old viewer URLs redirect to Honda and Corvette. FZ6 URLs redirect to Yamaha. Old local asset folders are retained but not served by the active catalogue.

| URL | Source meshes / groups | Triangles | Original assets | Lossless web transfer |
| --- | ---: | ---: | ---: | ---: |
| `/vehicles/yzf-2021` | 100 / 22 | 371,509 | 29,765,704 B | 8,031,879 B |
| `/vehicles/honda-cbr650r` | 114 / 25 | 366,615 | 29,953,117 B | 7,843,977 B |
| `/vehicles/corvette-c8` | 119 / 47 | 263,683 | 13,518,032 B | 6,129,253 B |

## Run

```sh
npm run dev -w web -- --host 127.0.0.1 --port 5173
npm run dev:vehicles
npm test
npm run build
```

The standalone vehicle API runs on loopback port 3001; Vite proxies `/api/vehicles` to it. Production Express mounts the same API and asset middleware. Set `OPENAI_API_KEY` in the server environment or local `.env` and restart the API to enable image analysis. Never put keys in client code or `VITE_` variables. The model defaults to `gpt-4.1-mini`. No live provider request has been tested because no key is configured.

## Original geometry only

Both workspace tabs use **one scene and the same mesh objects**. There is no separate procedural repair model. Repair studio exposes each assembly’s original meshes, source node, source group, material names and triangle counts. Select, isolate, separate and preview them in the main canvas. Mesh IDs are stable per imported group (`engine-exterior/mesh-4`, for example). Mesh spacing changes object transforms only; restoring zero returns their original positions. It does not create geometry or claim mechanically valid disassembly paths.

The Honda `enginecbr_33` assembly contains 11 meshes / 61,951 triangles. These are largely material-based divisions combining multiple physical surfaces, not an identified inventory of 11 service parts. The Corvette `6.2L LT2 V8 Engine and Engine Bay` assembly contains 3 meshes / 36,193 triangles, plus a separate `Engine Bay Bolts` group of 1 mesh / 140 triangles. Neither establishes separately modeled pistons, valves or a crankshaft. The app states these limitations in each model’s coverage panel.

Studio, X-ray, mesh, exploded assembly, camera dragging, picking, focus, isolation and source export work across all three vehicles. X-ray reveals existing geometry only. Source models are artist-made visual assets, not manufacturer service CAD. Model year and exact specification remain unverified: Honda has no stated year; the Corvette artist title says 2019 while the linked C8 owner manual is 2020.

## Assets, attribution and compression

Original archives are extracted into ignored `web/local-assets/<vehicleId>/` folders. Keep them with deployment; they are not copied into `dist`. The middleware serves only known vehicles and allowlisted filenames, negotiating Brotli with raw GLB fallback.

Yamaha and Honda are by **VTX**, CC BY-NC-SA 4.0. Corvette is by **Hari**, CC BY 4.0. The registry holds exact source URLs and per-asset license links, shown in the viewer. Each archive’s original `license.txt` is retained.

```sh
node scripts/bikes/compress-yzf.mjs yzf-2021
node scripts/bikes/compress-yzf.mjs honda-cbr650r
node scripts/bikes/compress-yzf.mjs corvette-c8
```

The Meshopt codec runs without simplification, quantization transforms, texture conversion or mesh joining. The script verifies decoded vertex attributes, every triangle’s vertices/winding, node transforms, hierarchy, skin bindings and original texture bytes. Each asset has an `audit.json`. Original source meshes remain independently selectable after import.

## Repair references and missing parts

`shared/repairs.js` contains curated references and source links for Yamaha R7 main fuse, Honda CBR650R/RA main fuse and Corvette C8 engine air filter inspection. Honda and Chevrolet references come from their official owner-manual PDFs. Vehicle/manual compatibility must be checked on the actual vehicle. The Corvette filter reference is maintenance, not a demonstrated no-start fix. Tool sizes not established by the cited owner manual are explicitly left unspecified.

**None of these target repair components has been individually mapped to the supplied geometry.** The UI lists each missing mapping and marks repair animation unavailable. The old schematic fuse, seat, holder and animated tools have been removed. Manual steps remain readable, but selecting a step does not invent an absent component or imply repair completion. A future repair sequence needs verified source-mesh bindings plus documented access order, tools and motion paths.

## Photo and CV integration

Photos are resized to 1600 px and sent only after the user clicks Analyze with OpenAI. The server accepts inline JPEG/PNG/WebP, limits size/concurrency, uses Responses structured outputs and `store:false`, and performs no application photo storage. It validates vehicle, allowed procedure, target ID and normalized bounds. A candidate may link only the curated manual reference; access-region IDs are marked `context-only`, `targetMapped:false` and `animationAvailable:false`. A photo cannot create an absent mesh, confirm electrical continuity or establish a successful physical repair. There is no calibrated 2D-to-3D pose registration.

`window.vehicleViewer` / `window.motorcycleViewer` exposes source groups with their mesh descriptors through `getParts`, plus `selectPart`, `applyDetection`, `previewSeparation` and `getState`. Detection import remains available in Inspect.

```json
{"modelId":"honda-cbr650r","partId":"engine-exterior","confidence":0.94,"bbox":[0.2,0.2,0.4,0.4]}
```

Tests cover geometry preservation, original mesh identity through separation, restoration, source naming, catalogue and licenses, missing-target gating, CV validation, local serving and constrained API behavior. Provider responses are mocked. Compression audits independently check the full local assets.

## Real online-photo example

Corvette Repair studio now includes the `c8-rear-damper` case with two actual Copart photographs, via CorvetteBlogger. The close-up and wider angle are annotated, attributed and linked to their report. Codex visually assessed these photos; saved results are labeled **Saved Codex image analysis**, distinct from live provider output. The suspected upper-damper-mount/support failure remains provisional, with an in-person structural assessment required to define the repair. GM bulletin 23-NA-019 supplies the documented specialist repair route, not a diagnosis or VIN-specific teardown procedure.

The four-step 3D walkthrough selects the real engine-bay, suspension and rear-left-wheel groups in the same model scene. It animates camera/inspection spacing only. No generic mount, fastener or fake successful repair is rendered.

`POST /api/vehicles/examples/c8-rear-damper/analyze` with `{ "vehicleId": "corvette-c8" }` optionally re-analyzes both allowlisted local photos with Responses. API output is validated, labeled `live-api`, and cannot enable repair execution. Arbitrary image URLs, file paths, example IDs and vehicle mismatches are rejected. A missing key returns 503 while the saved review remains visible. No live API inference was run without a configured key.
# Parts and service sourcing

Each vehicle has a **03 / Suppliers** tab. The file-backed directory contains public-source vendor records, new/used offers, conditional shipping estimates to Cambridge, MA 02139, and published local service rates. Deep links use `?tab=suppliers` or `?tab=repair`.

See `data/vendors/README.md` for JSON/CSV exports, provenance, limitations and the optional MongoDB importer. No vendor fitment is inferred from a 3D mesh, and no actual quote requests have been sent.
