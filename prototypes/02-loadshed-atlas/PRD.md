# LOADSHED ATLAS
## Product Requirements — Hydrographic Office of Compute
**Working title from the board:** Democratising Data Centres  
**Motto:** *Democracy is the referee for social impact.*  
**Folio date:** 19 September 2026 · HackMIT · Tracks: Voloridge / Arrowstreet  
**Authorities cited on the plate:** OECD.AI · LongtermWiki · Jigsaw civic sensemaking (undisclosed internals; we do not impersonate them)

---

### 1. Vision

A public that lives downwind of a 500 MW campus should be able to *read the hinterland* the way a pilot reads a harbor chart: tonnage, soundings, wrecks, and the weather of the last month’s news. LOADSHED ATLAS is that chart. Data centers are harbors. Transmission lines are shipping lanes. Water withdrawals are soundings in million gallons per day. The public is allowed on the bridge.

We are not mapping the internet. We are surveying the electrical and hydrological parish that an AI campus actually occupies — the balancing authority, the aquifer, the school levy, the abatement that made the concrete cheap. Dialogue happens *on the chart*, pinned to lat/long, because impact is local even when the model is not. Sensemaking is a tide, not a dashboard: the waterline rises when the parish agrees, and riptides hatch where it does not. Redesign is a vellum correction a visitor can file, numbered like a Notice to Mariners, so a counter-proposal becomes part of the public record of the place.

---

### 2. Problem

The people who live next to Data Center Alley, Boardman, Quincy, and the north Texas cluster encounter these plants as press releases, tax-board PDFs, and a new substation humming behind a berm. The information that would let them argue — firm megawatts, cooling water, which feeder is already N-1, which ISD just lost the abatement fight — is scattered across utility dockets, water-district agendas, and national news that never names the creek.

Policymakers get slideware. Residents get Facebook. Neither gets a *shared instrument*. The board’s pipeline is right and currently unimplemented: news is ingested somewhere, “top” campuses are declared somewhere else, a forum lives in a third tab, and the redesign (if it happens) is a PDF that dies in email. Democracy cannot referee what it cannot see on one sheet.

A factory-twin of robots on a floor would miss the point. The social impact of compute is not inside the hall. It is in the river, the school district, and the 500 kV line that will be built whether or not anyone in the parish was shown the sounding.

---

### 3. Thesis (why a chart, not a dashboard)

A dashboard asks you to trust a metric. A chart asks you to take a fix: you are *here*, the wreck is *there*, the lane is constrained, the sounding is shoaling. That spatial claim is the product. Residents do not experience “regional AI load.” They experience a campus on a feeder, a well, a levy. Planners do not need another KPI tile; they need the same parish the resident is looking at, with the two heaviest loads already flagged as wrecks so the argument starts at the constraint, not at the marketing name.

News, in this instrument, is not a feed. It is Admiralty Notices to Mariners: dated, terse, specific enough to act on (“Broad Run at 91% rated,” not “water concerns grow”). Sensemaking is not a pie. Agreement has a waterline. Dispute has a riptide. If the parish cannot see itself agreeing or splitting, the forum is just a comment box.

---

### 4. Users

**Resident (the watch on deck).** Lives in the school district or irrigation district that underwrites the campus. Needs: which two loads are heaviest *here*, what the last month’s notices actually said, a way to transmit without creating an account, and proof that a neighbor in the same grid square already said the thing they came to say. Success: they can tell a county supervisor, in one sentence, which harbor, which aquifer, and which wreck.

**Planner (the hydrographer).** County energy staff, PUD commissioner, PUC analyst, legislative aide. Needs: the same sheet the resident sees (no “staff view”), a quantitative step-change against a ten-year municipal baseline, and a filed correction they can take into a hearing as a numbered notice. Success: they stop toggling between EIA, the water district, and Nextdoor.

Secondary: journalists and civic orgs. They are not a third persona. They steal the chart.

---

### 5. Journeys

**Resident, four minutes after a hearing notice hits the listserv.**
1. Open the atlas. Take a fix (geolocate) or pull Folio I–IV from the rack.
2. Chart unrolls. Two wreck buoys already pulse. That is the FLAG. No search box.
3. Open the sounding: power BA, aquifer, ISD, abatement. Read the weather of the latest notice on that harbor.
4. Read radio traffic already pinned to the grid. Key the mic. Drop a transmission on their road, not in a sidebar. Receive a call sign.
5. Watch the tidal staff. If their parish is a riptide, the hatch says so. If it is making water together, the line rises.
6. Optional: pull the vellum, drag a setback / pond / tap, file a correction. Leave.

**Planner, ninety seconds before a briefing.**
1. Switch folios from the keyboard (the chart rack is a keyboard instrument).
2. Read Notices to Mariners as the news ingest — do not open Twitter.
3. Read the load spark against the ten-year baseline. Point at the step.
4. Open both wrecks. Quote the BA and the abatement in the same breath.
5. If a resident filed a correction overnight, it is already on the plate as an NtM.

---

### 6. Features, mapped to the Excalidraw pipeline

| Board step | Atlas instrument | What ships in this prototype |
|---|---|---|
| LLM ingests news | Admiralty Notices to Mariners | Dated, folio-specific, terse lines (utility docket, water, auction, ISD). Shown as weather on harbors. |
| Flags top data centres in your region (geoloc) | Wreck buoys + folio snap | Geolocate takes a fix and opens the nearest of four folios. The two heaviest local loads pulse as wrecks. |
| Forum for dialogue | Radio traffic | Shortwave comments pinned to chart coordinates. New transmissions get a call sign. Not a chat rail. |
| Sensemaking AI (Jigsaw-class; internals undisclosed) | Tide table of AGREEMENT | Local concordance: consensus raises a tidal staff; dispute hatches as riptide. No pies. We compute in the open; we do not claim Jigsaw’s stack. |
| Redesign and share | Vellum overlay + numbered NtM | Drag setback, cooling pond, substation tap. “File the chart correction” writes a Notice other visitors would see (localStorage). |
| Audience: public + policymakers | One sheet, two watches | No staff login. Resident and planner share the same plate. |
| Voloridge quantitative hook | Load spark vs 10-year municipal baseline | County peak (MW) 2015–2025 with the step-change annotated. Someone finally plotted it. |
| Factory-twin cluster on the board | Out of scope on the water | Substations and feeders may appear as roadsteads and lanes. We do not build a robot floor. |

**Folios (minimum):** Loudoun County VA (Potomac approaches) · Morrow County OR / Boardman (Columbia) · Grant County WA (Quincy canals) · Dallas–Fort Worth (Trinity inland survey).

---

### 7. The geoloc + news-ingest aha

The aha is not “we have a map.” It is: *I am in a parish, the two wrecks are already marked, and last Tuesday’s notice is already on the plate.* Geolocate is a sextant, not a permission nag — it snaps you onto a surveyed folio or tells you that you are in open water and must pick a sheet. The LLM ingest is visible *as notices*, not as a latent ranking. If the model decided these four sentences are the weather, the public can read the sentences. That is the opposite of a black-box “top campuses near you” list. Flagging is a consequence of tonnage on *this* folio, not a national leaderboard.

---

### 8. Non-goals

- Not Google Maps, not Mapbox, not satellite tiles, not a dark “cyber” SOC map.
- Not a factory-floor digital twin, robot teleop, or Tripo toy. Those stay on the other cluster of the board.
- Not an account system, not a real LLM call, not a live EIA/PJM/ERCOT feed (the prototype *stages* ingest as notices).
- Not a comment sidebar, not Slack, not a pie of sentiment.
- Not a general GIS of every U.S. campus. Four folios, surveyed hard.
- Not Inter, not glass cards, not a hamburger app.
- Not policy recommendations disguised as “neutral scores.” The referee is the parish, not the product.

---

### 9. Ninety-second judge path

1. **0:00–0:12** — Chart unrolls on Folio I (Loudoun). Point at the motto and the wrecks already breathing. “Data centers are harbors. The two heaviest loads are wrecks.”
2. **0:12–0:28** — Click the AWS wreck. Sounding: Dominion / PJM, Potomac, LCPS, M&T abatement. Close. The notices along the keel are the news ingest.
3. **0:28–0:48** — Open a radio pin. Key the mic, drop a transmission on Ashburn Roads, take the call sign. The tidal staff moves. Show the riptide hatch on water or schools.
4. **0:48–1:10** — Slide the vellum. Drag a cooling pond and a tap. File the correction. NtM appears, numbered, on the plate.
5. **1:10–1:30** — Load spark: the step-change against the ten-year baseline (Voloridge hook). Tap `2` for Boardman. Same instrument, different river. Stop.

Keyboard is part of the demo: `1`–`4` change folios; marks tab-focus.

---

### 10. Hackathon success metrics

- A judge who has never heard of Broad Run can, after ninety seconds, name the two Loudoun wrecks and one aquifer.
- A resident-shaped tester files a radio transmission and *looks at the tide staff* without being told to.
- A planner-shaped tester points at the load step-change unprompted.
- At least one filed chart correction survives a refresh (the share primitive works).
- Nobody asks “where is the chat.” If they do, the radio pins failed.
- Folio switch by keyboard during the pitch (proves the atlas is an instrument, not a scroll).

Qualitative bar: someone says “this is a chart” before they say “this is a map app.”

---

### 11. Risks

- **Pretty lie.** A schematic coast that feels true can be taken as a surveyed plat. Mitigate with the plate language: *schematic hydrography, not a legal survey.* Soundings are staged from public reporting, not a water-district SCADA dump.
- **Fake Jigsaw.** Civic sensemaking is the *job*; their model is undisclosed. If we brand the tide as their product, we are lying. The staff is ours, the method is visible, the citation is “in the spirit of.”
- **Forum capture.** Radio traffic without identity is both the point and the failure mode. A hackathon localStorage parish is fine; a public launch needs rate limits and a real moderator (the referee still needs a bosun).
- **Four-folio provincialism.** Loudoun/Boardman/Quincy/DFW are the canon clusters on the board. A judge from Atlanta will feel offshore. The geolocate “open water” copy must invite them to pick a sheet, not apologize.
- **Voloridge hook too thin.** A spark without a stated baseline year and unit is decoration. The series is county-scale peak MW, 2015–2025, against the 2015 municipal line. If we cannot defend the step, cut the spark.
- **Redesign as wish.** Dragging a pond does not move water rights. The filed NtM is a *proposal in public*, not an engineering stamp. Keep the language of correction, not of permit.
- **Factory-twin gravity.** The board has robots. Do not drift. If a judge asks where the robots are, point at the lanes and say the impact is the hinterland.

---

### 12. Open questions we are deliberately not answering this weekend

Who operates the real news ingest. Who numbers Notices after the demo. Whether Arrowstreet’s “relative value” is water-per-watt or tax-per-seat — the prototype shows both numbers on the sounding and refuses to collapse them. Whether a fifth folio (Atlanta, Phoenix, Chicago) is a week-two job. It is.
