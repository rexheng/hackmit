# THE PARISH LEDGER
## Product requirements — Democratising Data Centres

**Working title on the board:** Democratising Data Centres  
**This build:** a county broadsheet that covers data centers the way it covers school boards and water rights.  
**Date line:** Saturday, September 19, 2026.

---

### Vision

The public already lives with data centers. They do not live with a way to argue about them that feels like civic life. Dashboards make megawatts look like weather. This product makes them look like a vote.

The Parish Ledger is a newspaper that woke up. It ingests the day’s dispatches, flags the campuses in this parish, prints the fight in letters, and sets in type the consensus nobody’s PR shop will disclose. Democracy is the referee for social impact — not a sentiment on a slide. A referee needs a field, a record, and a crowd that can still read.

Policymakers do not get a separate portal. They get the same edition the farmer gets, because that is the point.

---

### Problem

News about data centers arrives as national tech copy or as a PDF in a planning packet. Neither is a public. The facts that matter locally — MW on a named tap, gallons from a named creek, a school-board abatement at 12:40 a.m. — are scattered, delayed, or phrased as “economic development.”

People who live next to a campus can smell a diesel and still be told the story is “the cloud.” They write Facebook comments. The county writes minutes. Nothing in the middle holds both and then says, out loud, what the parish actually agrees on.

Jigsaw’s sensemaking tools already cluster civic text. Operators and agencies do not print the cluster. The gap is not model quality. The gap is editorial nerve.

---

### Who it is for

- **Primary:** residents of host counties — farmers, teachers, linemen, teens, people who vote school boards and notice water trucks.
- **Secondary:** the policymakers who already interface with those people: supervisors, school boards, PUDs, co-ops, planning staff. They read this or they read about themselves in it.
- **Not for:** site-selection consultants who want a heat map of “community sentiment” they can sand down. If they use it, they use it the way they use a real paper: nervously.

---

### Thesis (why a newspaper, not a dashboard)

A dashboard asks you to be an analyst. A newspaper asks you to be a neighbor. The form is the argument: masthead, folio, column rules, jump lines, grease pencil, classifieds.

Data-center politics already happens in the rooms this paper has always covered — cafeterias, port commissions, irrigation districts. Putting compute on a dark UI with purple accents tells the truth of the vendor. Putting it on newsprint tells the truth of the parish.

The technical aha has to survive contact with a person who will not open a repo. If the aha cannot be set in 8-point type under a typesetter’s slug, it is not ready.

---

### User journeys

**1. Saturday reader, ten minutes at the table**  
Picks the parish edition (Northern Virginia / rural Georgia / central Washington / west Texas). Reads the lead — a named vote, named megawatts, named water. Sees the city desk’s grease-pencil flags. Opens one clip file. Recognizes a letter that sounds like someone they know. Leaves with a proper noun, not a vibe.

**2. Letter writer**  
Finishes the paper angry or precise. Sets a letter with a name and a place. Watches it appear as type with a postmark. The makeup desk locks. Three statements the parish will stand on, two it will not, printed as a composing-room note — not a pie.

**3. The person who would have drawn on a napkin**  
Clips the classified coupon. Stamps cooling towers, holding ponds, setbacks on the parcel. Prints the plan into tomorrow’s paper. Civic construction, in ink. (The 3D factory twin is another shop. We allude. We do not become it.)

**4. The official who got named**  
Searches their own last name. Finds the hallway quote, the abatement math, the letter from the teacher. Has to answer in public language, not in a portal comment thread that expires.

---

### Feature requirements, mapped to the board

| Excalidraw pipeline | What this paper actually does |
|---|---|
| LLM ingests news about data centres | Night-desk **wire slug**: items ingested since 2 a.m., four printed. The machine is a beat reporter, not a mascot. Copy is fake-but-specific: MW, operator, water, tax abatement, school-board vote, named creeks and roads. |
| Flags top data centres in your region (geoloc) | **Edition picker as city editions**, not a map pin. City desk **grease-pencils 2–3 campuses**. Click opens the **clip file** (operator, power, water, tax, the vote). |
| Forum for dialogue | **Letters to the Editor**. Six standing voices per parish (farmer/grower, teacher, lineman, official, teen, operator PR) plus a reader letter set in type with a postmark. |
| Redesign data centres and share them | Back-page coupon: **Wanted: a better site plan**. Click-to-stamp towers / ponds / setbacks. **Print it in tomorrow’s paper** writes a classified. |
| Sensemaking AI (Jigsaw) — “they don’t really disclose it” | **“What the parish actually agrees on.”** Hidden until letters exist and the page is locked. Three consensus lines, two contested. A typesetter’s note. No chart. The aha is disclosure of a reading that already happened off-stage. |

**Audience on the board (general public + policymakers):** one edition, two kinds of reader. No staff login.

**Sponsor flavor (Voloridge / Arrowstreet — technical aha about AI):** the aha is not “AI wrote the news.” The aha is ingest + undisclosed clustering made visible as **editorial consensus**. Judges should feel the difference between a sentiment widget and a night editor who will stand behind three sentences.

**References (OECD.aim, longtermwiki):** they appear as the paper would treat them — a footnote that failed to reach the county site, a weather map that does not know Crane. Not as nav items.

**Factory-twin cluster (Build/Maintain, Tripo, robots):** classified aside only. This prototype is the broadsheet.

---

### The technical aha (write it on the whiteboard)

1. **Ingest** is a wire, not a chatbot. A model reads the day’s dump (permits, utility filings, board agendas, blotter). The desk prints four items and spikes the rest. Selection is the product.
2. **Geoloc** is a parish edition. “Your region” means Loudoun, Newton, Grant, Crane — not a hex bin.
3. **Sensemaking** already ran on the letters. Operators do not disclose the cluster. We do, as makeup: *the parish will stand on / still fighting in the aisle*. That is Jigsaw’s move, in public, in English.
4. If a judge can tell this from a Tableau of “community sentiment,” we failed the aha.

---

### Non-goals

- Not a 3D factory twin, robot sim, or GLTF toy.
- Not a real-time map, satellite layer, or “AI copilot.”
- Not an operator customer-success portal.
- Not a comment platform with likes, replies, or reputations.
- Not a national vertical. Four parishes is the world.
- Not live model calls in the hackathon build. The pipeline is demonstrated as editorial furniture with honest dummy copy. Wiring Jigsaw in production is a next-step, not a demo risk.
- Not both-sides mush. Operator PR gets a letter like everyone else. It does not get the masthead.

---

### Success metrics for a hackathon demo

- A stranger can name a campus, an operator, a water figure, and a vote after one edition.
- They can switch parishes and feel the paper reprint, not a filter chip.
- They can open a clip file and say what the grease pencil was for.
- They can set a letter and see consensus lock as type, not as a chart.
- They can stamp a parcel and find the plan in classifieds.
- A judge does not ask “but where is the AI?” because the wire slug and the composing-room note already answered.
- Nobody mistakes this for a SaaS landing page.

---

### Risks

- **Costume risk.** If the newsprint is a skin on cards, the thesis dies. Column flow, jump lines, and a masthead that is too large are load-bearing.
- **Fake-news risk.** Dummy copy must stay labeled by form (wire, clip file, letters) and stay locally plausible. Invented details sit next to public tropes (Ashburn, Quincy, flare-gas compute), never impersonate a live filing.
- **Consensus risk.** A locked reading can look like the paper is stuffing the ballot. The copy has to say it is a *reading of the letters*, spike-or-set, night editor on the line.
- **Capture risk.** The operator letter is already in the mix. If a later version lets Community Affairs buy the makeup desk, kill the product.
- **Scope bleed.** The factory twin will try to eat the weekend. Spike it.

---

### What a judge should click in 90 seconds

1. Let the paper hit the desk. Read the masthead quote. Do not scroll past the tombstone hed.
2. Stay on **Northern Virginia**. Open the grease-pencil flag on **Gainesville Crossing**. Close the clip.
3. Switch to **West Texas**. Confirm the paper reprinted (McCamey, trucks, flare).
4. Scroll to **Letters**. Read the teacher and the lineman. Submit one sentence with a name. Watch the postmark and the makeup desk lock.
5. Read **What the parish actually agrees on**. Ask yourself whether a pie chart would have been dumber. It would.
6. Clip **Wanted: a better site plan**. Stamp a pond and a setback. Print it. Find the classified.

If they still have twenty seconds, hand them Georgia and tell them Cypress is a tree.
