# COMPUTE WORKS — Product Requirements
**A marble works for megawatts.**  
Working title on the tin: *Democratising Data Centres.*  
Prototype cluster: the technical aha / factory twin.

---

## Vision

The public does not get a GIS layer. They get a toy they already know how to argue with.

COMPUTE WORKS is a 1930s–50s tin-lithograph factory playset that **builds** a data center from a shipping-tag prompt, then **maintains** it with stamped-tin robots walking metadata routes. The campus is a dollhouse: half-built or full, exterior or cracked open. Hover a cooling tower and a punch-card drops — not a tooltip, a factory reject flag — naming the failure window and the civic cost.

Democracy is the referee for social impact. The works is the object under the whistle.

---

## Problem

Data centers arrive as press releases and site plans. Neighbors hear “jobs” and taste the aquifer. Operators hear “capacity” and hide the transformer that is already in the red. Policymakers get a slide with a globe.

Nobody shares a model that is both **technically honest** (routes, materials, interiors) and **civically legible** (this creek, this county, this complaint). The factory cluster on the board tried to solve honesty with GLTF and gaussian splats. That is a flex. The public does not enter a splat. They enter a dollhouse.

---

## Thesis

A data center is already a factory: halls, a cooling plant, a substation, a parking lot, a creek it should not touch. The public understands factories. They have held the toy.

If construction is a marble run and maintenance is a trek for enamel robots, then predictive failure and civic cost become the same object — a punch-card you can hold. If the Voloridge signal is a residual stamped on that card (unexpected downtime versus municipal complaint volume), a trader and a shop steward can read the same tin.

That is how you democratise a data centre without giving anyone a dashboard.

---

## Audience

Primary for this prototype: **the public who will live next to the plant, and the policymaker who will permit it.**  
Secondary (the signal): an operator or a Voloridge-shaped desk that needs one number, not twelve tiles.

The civic track (news → geoloc → forum → redesign & share) is present and playable. It is not the toy. The toy is the campus.

---

## Mapping every factory-cluster note

Canon from the Excalidraw. Nothing below is decorative.

| Board note | What it means here | How the prototype does it |
|---|---|---|
| **metadata based route planning** | Rooms are nodes. Doors are edges. Robots do not wander — they are routed. | Tiny BFS router on the campus graph (`gate`, `office`, `hallA`, `hallB`, `cooling`, `pond`, `creek`, `substation`, `parking`). Click a robot; its work-order path lights. Drag the pond or substation and the node moves with the object. |
| **Materials based predictive maintenance** | Water, transformers, concrete, cooling fabric fail on a clock the public never sees. | Hover a tower, slab, or transformer. A punch-card names **days-to-fail** and the **civic cost** (water table, night noise, jobs on the same feeder). One component ships already in the red. |
| **semantic object recognition (?)** | The board was unsure. Do not fake a vision model. | The works *knows what you pointed at*. Click/hover stamps a lithographed nameplate: object class, thermal load, which robot owns it. That is recognition as a factory stencil, not a neural net. |
| **split into half / full construction** | A plant under pour is a different political object than a finished campus. | Keyboard `H` / the HALF–FULL lever. Half: no roofs, scaffold stripes, exposed racks, `UNFINISHED` stamp. Full: enamel-complete litho. Same graph, different honesty. |
| **BUILD box → marble setup prompt "make car factory"** | The prompt *is* the build. The board said car factory; this product builds a **data center**. | Shipping tag: `MAKE A DATA CENTER FOR [PLACE]`. Presets: rural Georgia / evaporative; Northern Virginia / already too many. Submit drops a marble down a chute (stepped, not eased). Campus stamps in. |
| **preload factory sprite / interior-exterior GLTF [TRIPO]** | They wanted a generated factory mesh. | **Non-goal: no Tripo, no GLTF.** The “preload” is a lithographed CSS-3D dollhouse with a known interior. Exterior is the closed box. Interior is the front wall swung open. Same sprite, two states. |
| **robots running around the factory** | The plant is occupied. | Five stamped-tin workers (Millie, Brass, Hopper, Rivet, Punch) walk assigned loops on the graph. Walks are **stepped** (snapped, ~160ms), never smoothed. Keys `1`–`5` select. |
| **MAINTAIN box → robot pathing along the trek** | Maintenance is a route, not a status pill. | MAINTAIN mode emphasizes the trek: selected robot’s edges glow brass; the work order is a job ticket, not a toast. |
| **materials inference** | Infer failure from what the object *is* and *where it sits*. | Failure windows shift when you drag the cooling pond off the creek or the substation off the implied lot line. Inference is toy-physics + civic adjacency, not a trained model. |
| **converge on "Feed the gaussian splats / Globe > SF > Park > Statues"** | The board wanted a wow you can enter. | **Reinterpreted: a dollhouse you can enter.** Click a hall. Fixed-easing “flight” (one curve, one duration). No scroll-wheel speed. You are inside the paper model, not a globe of statues. |
| **Camera — simple flight, no adjustable speed upon zoom in** | Judges should not fly a drone. | Click-to-enter, `Esc` or click dirt to leave. `transition: transform 0.85s cubic-bezier(0.22, 1, 0.36, 1)` only. Wheel does nothing to camera speed. |
| **Tripo Factory** | Checklist item. | Satisfied as **Tripo-shaped preload**: a finished factory sprite with interior/exterior. Not the API. See non-goals. |
| **core 'aha' technical moment function** | One function the room remembers. | `computeAlpha()` — materials telemetry + pathing delay + complaint heat → a single residual a desk would recognize. The punch-card re-stamps. |
| **pulls something from the volo track** | Voloridge is not a sponsor sticker. | The residual **α**: unexpected downtime risk minus complaint-implied downtime, in basis points. Fat α = the plant is more fragile than the town is angry. That is a signal. |

---

## How the civic pipeline still appears

The other cluster on the board owns the civic spine. This prototype must still *serve* Democratising Data Centres or the factory is a screensaver.

| Civic step | Factory expression |
|---|---|
| **LLM news ingest** | Wall-mounted clipboard. Three or four clippings **about this site**, swapped when the shipping tag changes place. Not a generic newsfeed. |
| **geoloc flags** | Brass pins on each clipping: county / grid / creek. The campus itself is the map — pond against creek, substation against parking. |
| **forum** | Union noticeboard. Type a line, pin it. Labor / neighbor / ops chips. |
| **Jigsaw sensemaking (undisclosed)** | **Shop steward summary.** Not a word cloud. Three columns (labor, neighbors, ops) plus one sentence they actually share. Deterministic from pins — a stand-in for Jigsaw, not a call to Jigsaw. |
| **redesign & share** | Drag the cooling pond. Drag the substation. `STAMP THE BLUEPRINT` writes localStorage and pegs a sheet on the clothesline. Other “shared” plans are the room’s memory of this browser. |
| **Audience: public + policymakers** | The dollhouse is for the public. The punch-card α is for the desk that has to say yes. Same object. |

---

## The Voloridge signal

Not a KPI tile. A punch-card.

```
UNEXPECTED DOWNTIME     (materials red/amber + trek delay)
− COMPLAINT-IMPLIED     (clippings + pinned heat + pond/creek adjacency)
= α  (basis points of residual risk)
```

If you move the pond off the creek, water days-to-fail improve and α thins.  
If the noticeboard fills with night-noise pins, complaint-implied rises and α compresses — the town is already pricing the plant.  
If the transformer stays red and robots detour, α stays fat: **short the uptime, the politics are not the constraint.**

That is the trader-shaped aha. One number. The card re-punches when the toy changes. No chart.

---

## Playable core loop (must work on file open)

1. **BUILD** — Type or pick a prompt. Marble drops. Campus constructs (Georgia water-red vs NoVA transformer-red).
2. **Half / full** — Lever or `H`.
3. **Flight** — Click a hall. Dollhouse opens. Interior racks. `Esc` leaves. No wheel-zoom.
4. **Robots** — Watch the trek. `1`–`5` or click. Read the work order.
5. **MAINTAIN** — Hover the red component. Read civic cost. Flag already dropped.
6. **News** — Clipboard matches this site.
7. **Forum** — Pin a comment. Steward rewrites the common ground.
8. **Redesign & share** — Drag pond or substation. Stamp. Clothesline grows. α re-punches.

Keyboard: prompt focus (`/` or `P`), half/full (`H`), robots (`1`–`5`), leave hall (`Esc`).

---

## Aesthetic (requirements, not vibe)

Tin lithograph 1930s–50s. Enamel red, factory cream, brass, danger-stripe. Die-cut shadows, rivets, conveyor, stamped serials. Gears turn. Marble steps down the chute. Robots walk like clockwork, not characters.

Type: **Monoton** on the works sign, **Teko** on levers, **Mr Dafoe** on the packing tag, **Special Elite** on punch-cards, **Source Serif 4** on notices. No Inter, Roboto, Arial, Space Grotesk, system-ui. No purple. No glass. No Tailwind cards.

WebAudio beeps exist and are **muted by default**.

---

## Non-goals

- No real Tripo, no GLTF, no gaussian splats, no Three.js globe, no SF park statues.
- No live LLM ingest, no Jigsaw API, no real utility SCADA, no real Voloridge feed.
- No scroll-wheel flight, no adjustable zoom speed, no orbit camera.
- No npm, no build, no extra README, no files outside this folder.
- Not the civic product’s home. News, forum, and share are thin on purpose.
- Not a materials-science simulator. Inference is toy-honest, not calibrated.

---

## 90-second judge path

0:00 — Sign: COMPUTE WORKS. Shipping tag already set to Georgia evaporative. Hit **STAMP IT**. Marble drops. Halls, pond, creek, substation stamp in. Half-built first so they see the racks.  
0:20 — Throw the **FULL** lever (`H`). Click Hall A. Wall opens. No wheel.  
0:35 — `Esc`. Click **Punch** or press `5`. Path lights. Work order is a ticket.  
0:48 — Hover the cooling intake — it is already red. Punch-card: days-to-fail, orchard wells.  
1:00 — Clipboard: this county, this creek. Pin one line on the noticeboard. Steward names the overlap.  
1:12 — Drag the pond off the creek. Watch **α** re-punch. Stamp the blueprint. It pins on the clothesline.  
1:25 — Swap the tag to **Northern Virginia, already too many**. Transformer goes red. α changes meaning. Stop talking.

---

## Risks

- **Looks like a game.** If judges bounce off “toy,” they miss the thesis. The red component and α have to land in the first minute or it is a screensaver.
- **Civic too thin.** If the clipboard does not change with the place, this is not Democratising Data Centres.
- **CSS 3D jank on a projector.** Flight must still read as dollhouse-open if the isometric shear collapses. Interior cutaway is the fallback.
- **localStorage “share” is a lie in a room.** Clothesline is single-browser. Say so if asked; do not pretend it is multiplayer.
- **Voloridge as sticker.** If α is a number that does not move when you drag the pond, we failed the volo pull.
- **Scope bleed into real ML.** Semantic recognition and materials inference are stencils. Do not demo them as models.

---

## Hackathon success

A stranger can stamp a place, enter a hall, read a red flag, move a pond, and watch one punch-card residual change — and then say, without being told, that the factory is the data center and the referee is the room.
