# Motion Lab vehicle inspection and repair studio

The viewer contains exactly three locally supplied vehicles. The FZ6 is removed from navigation and runtime imports; its old URLs redirect to the Yamaha. Historical source files are retained.

| URL | Source meshes / groups | Triangles | Original assets | Lossless web transfer |
| --- | ---: | ---: | ---: | ---: |
| `/vehicles/yzf-2021` | 100 / 22 | 371,509 | 29,765,704 B | 8,031,879 B |
| `/vehicles/bmw-s1000rr` | 117 / 34 | 313,174 | 27,868,581 B | 7,920,071 B |
| `/vehicles/fenomeno-2026` | 124 / 54 | 225,952 | 38,070,784 B | 23,125,280 B |

`/bikes/yzf-2021` and `/yzf` remain aliases. The existing service application at `/` is unchanged.

## Run

```sh
npm run dev -w web -- --host 127.0.0.1 --port 5173
npm run dev:vehicles
```

The standalone vehicle API runs on loopback port 3001, without requiring the existing MongoDB-backed app. Vite proxies `/api/vehicles` to it. The normal production Express server also mounts the same routes and local model middleware. `npm run build` builds the frontend.

Set `OPENAI_API_KEY` in the server environment (or local `.env`) and restart the API to enable live image analysis. `OPENAI_VISION_MODEL` defaults to `gpt-4.1-mini`. Never put the key in a `VITE_` variable or client code. Without a key, the UI clearly disables live analysis and the server returns 503; documented demo playback remains usable. No live OpenAI request was tested because no key was configured.

## Assets and fidelity

Source archives are extracted to ignored `web/local-assets/<vehicleId>/` directories. Original files and `license.txt` are retained. Assets are not copied into `dist`; deployment needs these directories installed separately. The middleware serves an allowlist only and negotiates Brotli with raw GLB fallback.

All three models are by **VTX**, under **CC BY-NC-SA 4.0**. Source URLs, attribution and license links live in `shared/vehicles.js` and appear in the viewer. Commercial use is not granted by this license.

Compression command:

```sh
node scripts/bikes/compress-yzf.mjs yzf-2021
node scripts/bikes/compress-yzf.mjs bmw-s1000rr
node scripts/bikes/compress-yzf.mjs fenomeno-2026
```

The Meshopt codec is used without quantization or simplification transforms. Every decoded vertex attribute, triangle winding, texture byte, node transform, hierarchy and skin binding is verified. Each model has its own `audit.json`. Compression does not reduce decoded GPU memory or invent parts. The importer checks rigid skin weights and freezes the source pose without altering surfaces.

Studio/PBR, Fresnel X-ray, wireframe, orbit/pan/zoom, picking, focus, isolation, bodywork hiding, exploded spacing, camera presets and source-group export apply to all vehicles. Exploded offsets are inspection spacing, not mechanically valid disassembly vectors.

## Coverage and repair evidence

These are artist-created visual models, not service CAD. Meshes may combine multiple physical components. Engine internals and complete electrical assemblies are unverified. The Fenomeno includes a cabin, doors, glazing and wheel/brake groups; each axle's wheel/brake meshes share one parent. BMW source metadata does not establish its year or trim. Yamaha is titled “YZF 2021” and uses an internal `yzfr7` name; that does not independently verify a production specification.

Two **reference demonstrations** are implemented in `shared/repairs.js`:

- Yamaha R7 main-fuse replacement, referenced to the Yamaha-authored BEB-28199-E0 owner manual, June 2021 edition, dealer-hosted at https://moto-nautika.com/pdf/navodila%20za%20uporabo/R7.pdf . Seat procedure: printed 3-19–3-21; fuse procedure/allocation: 6-32–6-33.
- BMW S1000 RR ignition-supply fuse replacement, referenced to the BMW Motorrad rider manual, April 2021: https://manuals.bmw-motorrad.com/manuals/BA-Extern/IN/BA-INTERNET-COM/PDF/S_0E21_RM_0421_01.pdf . Seat: 78; toolkit: 189; fuses: 220–221.

The timeline supports play/pause, scrub, individual steps and speed changes. Animated seat access, holder/cover movement, tool approach, fuse withdrawal, matching replacement, insertion and reassembly use **supplemental schematic geometry**. Plastic pullers are optional handling aids, not a claimed mandatory factory tool. Dimensions and tool paths are illustrative. The fuse is not present as a verified source component; the whole-model highlight denotes only an approximate access region. Exact vehicle/manual compatibility must be confirmed before real use. Completion of a demo does not establish a successful physical repair.

No public Fenomeno-specific procedure was verified. Lamborghini's official service portal provides manufacturer information to registered operators: https://serviceinformation.lamborghini.com/faq/general . The car's repair panel explicitly remains pending; no procedure from another Lamborghini is substituted.

## Photo and OpenAI flow

1. User chooses the vehicle, adds a JPEG/PNG/WebP photo and checks manual compatibility.
2. The browser downsizes to at most 1600 px and re-encodes JPEG. It sends the image only after **Analyze with OpenAI**.
3. The server accepts inline image data only, limits request size and concurrency, and calls OpenAI Responses with a strict JSON schema and `store:false`. No photos are written to application storage or logged. Provider policies still apply.
4. The model can select only that vehicle's documented fuse candidate or request further inspection. It cannot write arbitrary repair procedures, torque values, part IDs or tools. The server validates model match, IDs, confidence and image bounds; invalid output is rejected.
5. A candidate highlights the approximate source group and links the existing manual-backed animation. A photo cannot confirm continuity or the cause of a no-start condition. Bounding boxes are approximate; there is no calibrated 2D-to-3D pose registration.

Fenomeno analysis returns `MANUAL_REQUIRED` before contacting OpenAI. Unknown vehicles, remote image URLs, cross-vehicle repairs and malformed results are rejected.

## External CV contract

`window.vehicleViewer` (and compatibility alias `window.motorcycleViewer`) exposes `getParts`, `selectPart`, `applyDetection`, `previewSeparation`, and `getState`. A `motorcycle:detection` event and the inspection panel's JSON importer remain supported.

```json
{"modelId":"bmw-s1000rr","partId":"rider-seat","confidence":0.94,"bbox":[0.2,0.2,0.4,0.4]}
```

Image coordinates are normalized `[x,y,width,height]`. Unknown source groups, mismatched models and invalid bounds are rejected.

## Validation

`npm test` covers original service functionality, rigid geometry preservation, group naming, CV payloads, vehicle catalogue, animation ordering, local asset serving and constrained vision API behavior. Model assets are independently audited during compression. Browser QA checks actual renders and controls on desktop/mobile; API provider behavior uses mocked responses, not a live model call.
