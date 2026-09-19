# OPEN MEETING, ARTICLE 19
## Product Requirements — Democratising Data Centres, participatory track

**Working title (Excalidraw):** Democratising Data Centres  
**This prototype:** a New England town meeting that has put a computing campus on the warrant.  
**One-line:** Democracy is the referee for social impact — and the gym, not the map, is where the town keeps score.

---

## Vision

A data-center siting is not a pin on a planner’s GIS. It is a warrant article. Neighbors write on index cards. A moderator pulls yarn until the room has a shape. People move paper buildings on foam-core because that is how a town talks when speech is not enough. The packet that leaves the gym is minutes plus yarn plus xeroxed plans — something a selectboard or a House committee can read without being handed a sentiment score.

We are building for the general public first. Policymakers arrive later, as readers of a room that already happened.

## Thesis

The forum is the product. Ingested news and geolocation exist only to put a real article on a real floor. If you ship a handsome map with a comment box, you have built the thing this prototype refuses.

Redesign is how a town talks with its hands. A cooling pond placed on foam-core is an argument. A tree buffer is a condition. A shifted access road is a neighbor protecting a school crossing. Shared plans on the cork wall are the “redesign and share them” node from the Excalidraw — not a gallery of renders.

Sensemaking is not a dashboard. Jigsaw’s tools (see [sensemaking-tools](https://github.com/Jigsaw-Code/sensemaking-tools/)) do not really disclose the split; they hide behind “mixed.” This product forces disclosure: taut yarn is consensus, slack yarn is a minority report, shoebox labels are topics, and a shy sentence is what the model must say when asked to name the room. A policymaker reads that sentence and the yarn. They do not read 61% against.

## Users

**Residents (primary).** People who would actually stand in a high-school gym on a Tuesday. They have a street, a well or a commute, a kid in the school whose roof needs the PILOT. They will not type into a thread. They will fill a 3×5 card and drop it.

**Town officials (secondary, in the room).** Clerk, moderator, a tired selectboard member. They staple news to the warrant, pull yarn, call the vote, and type the minutes.

**Policymakers (secondary, after).** A staffer at the state house, someone who has OECD.AI and a longtermwiki tab open, someone from the Voloridge / Arrowstreet orbit who needs to know *when the language flipped* (jobs → wells) — not a heat map of tweets. They read the packet.

**Not users:** GIS analysts, corporate site selectors, people who want a Slack for “stakeholders.”

## Journeys

### Resident, one night

1. Walk into the gym. The warrant is already on the folding table: Article 19, *To see if the Town will adopt conditions on the proposed computing campus.* A clerk’s recap of ingested news is stapled to it — dated, local, specific. Not a feed.
2. Look at the vicinity sketch. Two campuses that matter to *this* town are flagged in ballpoint. Switch towns if you are visiting from West Tunbridge or Linebrook; the floor changes with you.
3. Read cards already dealt into clusters. Different hands. Forty words. For / against / conditions.
4. Fill your own card. Drop it. It lands in a cluster. Chairs scrape.
5. Watch the moderator’s yarn. Press **Ask the moderator to name the room.** A sentence appears that the model did not want to say.
6. Walk to the foam-core. Place a cooling pond, a tree buffer, a smaller hall, a shifted road, a rec lease. Look at other residents’ xeroxes on the cork. Xerox yours for the packet.
7. Voice vote: aye / no / hold. The minutes record the vote *and* the yarn consensus. You leave. The packet stays.

### Policymaker, the next morning

Opens the minutes. Does not get a poll. Gets: the article language, the voice vote, the moderator’s naming of the room, the yarn topics (shoebox labels), attached xeroxes, and the clerk’s appendix — a pencil sparkline of when testimony language stepped from jobs to wells. That sparkline is the quiet Voloridge nod: a regime change in words, not a price.

### Clerk (thin, in-product)

Switches the town, staples the recap, does not “run the AI.” The AI is the yarn and the shy sentence. The clerk is a person with a stapler.

## Mapping to the Excalidraw

Treat the board as canon. This prototype owns **forum → redesign → share**, with news and geoloc as inputs, not the stage.

| Excalidraw node | Where it lives here | What we refuse |
|---|---|---|
| LLM ingests news | Clerk’s recap stapled to Article 19. Specific papers, specific dates. | A news ticker. A chatbot that “summarizes the discourse.” |
| Flags top regional data centres (geoloc) | Hand-drawn vicinity sketch; two campuses per town; four towns (mill, farm, pipeline suburb, river). | A factory-floor map. A national layer. Anyone else’s sports-referee booth. |
| FORUM FOR DIALOGUE | Index cards on the gym floor. No chat. No thread. | Slack. Discourse. “Add a comment.” |
| Sensemaking AI (Jigsaw) | Yarn between cards that agree. Shoebox labels = topics. Taut = consensus. Slack = minority report. The button that forces a name. | A topic model dump. A pie chart. “Mixed sentiment.” |
| REDESIGN DATA CENTRES AND SHARE THEM | Foam-core site plan + cork wall. Xerox to localStorage = the packet. | A professional CAD. A “generate me a greener campus” button. |
| Audience: public first, policymakers second | You play as a resident. The packet is what the second audience reads. | A staff-only briefing tool with a public skin. |
| Tracks: Voloridge / Arrowstreet | Clerk’s appendix: language flip as a step-change sparkline. | A trading dashboard. A factor model cosplay. |
| Refs: OECD.aim, longtermwiki | Ethical stance and the “public product” test — see below. Not a citation dump in the gym. | Academic chrome. |

**Especially forum + share + Jigsaw:** if those three are weak, the prototype has failed, even if the maple floor looks right. The yarn *is* the Jigsaw output. The xerox *is* share. The cards *are* the forum.

## How this stays a public product, not a planner’s GIS

- The unit of geography is a town, not a raster. Four towns, two sites each, a sketch. No basemap tiles.
- The unit of speech is a card with a street name, not a geocoded tweet.
- The unit of agreement is yarn, not a cluster centroid.
- The unit of design is a cut-out a person can move, not a parcel layer with buffers in meters.
- The unit of record is minutes, not a CSV of “engagement.”
- If a feature would make more sense in ArcGIS or in a consultant’s slide 14, it does not ship.

OECD.AI-shaped test: does this increase the public’s ability to contest a siting, or does it increase a planner’s ability to claim consultation happened? Only the first is in scope.

## Non-goals

- A factory-floor or industrial digital-twin of a data hall. Another prototype owns that.
- A sports-referee booth, scoreboard democracy, or mascot-as-UI. Another prototype owns that.
- Live LLM calls, Jigsaw API integration, or any disclosure of their undisclosed pipeline. We stage the *output* as yarn and a sentence.
- Account systems, moderation queues, real identity, real wells, real towns’ actual pending applications.
- Chat, upvotes, reply trees, “like.”
- Inter, Roboto, Arial, Space Grotesk, glass, purple, Material buttons, D3-default orange edges.
- A national “all data centres” browser. Geoloc here is *which two parcels are on tonight’s warrant.*
- Turning the Voloridge nod into a product: one pencil sparkline, then stop.

## 90-second judge path

Stand in the gym. Do not explain the metaphor; it should already be a gym.

1. **0:00–0:15 — Warrant.** Point at Article 19. Flip the clerk’s staple: dated local news, not a vibe. Two campuses flagged on the sketch. Switch to a second town if you need to prove the floor is local (mill → farm, or pipeline → river).
2. **0:15–0:35 — Forum.** Read two cards in different hands. Fill one (keyboard: `C`). Drop it. It hits the maple.
3. **0:35–0:55 — Sensemaking.** The yarn is already the model. Taut vs slack. Shoebox labels. Press **Ask the moderator to name the room.** Read the shy sentence out loud. That is the aha. Say: Jigsaw would rather say “mixed”; the town does not get to leave it mixed.
4. **0:55–1:15 — Redesign + share.** Place two cut-outs on the foam-core. **Xerox my plan for the packet.** The light bar. The copy pins to the cork next to other residents.
5. **1:15–1:30 — Vote + packet.** Aye / no / hold. Minutes open with the yarn consensus attached. Point at the clerk’s sparkline: the night the room stopped saying jobs and started saying wells. Stop talking.

Keyboard the whole way if the mouse dies: `1` warrant, `2` floor, `3` plan, `C` card, `M` moderator, `X` xerox, `A` / `N` / `H` vote.

## Ethical note on representing communities

These towns are analogs. Ashuelot, West Tunbridge, Linebrook, Saco Bend are not standing in for a single real hearing, and the names on the cards are invented. The risk is still real: a prototype can flatten a mill town into “jobs,” a farm town into “wells,” a pipeline suburb into “NIMBY,” a river town into “salmon.” That is the same sin as a sentiment dashboard.

Rules for this file and anything that grows from it:

- Cards disagree *inside* a town. The mill town has the construction worker *and* the well on River Road. The farm town has the rec-lease skeptic *and* the person who wants the school roof.
- Do not put dialect in mouths for flavor. Hands differ; intelligence does not.
- The moderator’s sentence names a split the room actually holds. It does not diagnose a community.
- No real well reports, no real PILOT figures claimed as fact. Dates and paper names are staged journalism for a one-shot.
- If this ever left a hackathon, cards would be opt-in, attributable, and withdrawable. Yarn would be recomputed in the open. Minutes would be a public record, not a model weight.

We are not consulting these towns. We are arguing that consultation that does not look like a meeting is theater.

## Risks

- **Charm eats the argument.** If judges remember the coffee urn and not the yarn-as-Jigsaw move, we decorated. The moderator button is load-bearing.
- **Four towns become a picker, not places.** If switching towns only swaps labels on the same cards, we built a dropdown. Each floor needs its own fight.
- **Yarn reads as a graph viz.** If it looks like D3, we failed the Jigsaw translation. It has to look like a person had a skein and ten minutes.
- **Redesign becomes SimCity.** Pieces are conditions in a warrant, not a winning layout. Xerox-to-packet is the share action; high score is not.
- **Voice vote cosplays legitimacy.** A prototype vote is not a town vote. Minutes must read as *this room, tonight*, never as “Ashuelot has decided.”
- **Voloridge sparkline gets productized.** It is an appendix for a quant-shaped reader. If we add a second chart we have left the gym.
- **Extraction.** Pretty cards about wells, shown to investors. Mitigate by keeping the packet clumsy, paper, and incomplete — a record of disagreement, not a social-license PDF.
- **Jigsaw mismatch.** Their tools are not a town moderator. We are staging the *political* output we wish they would disclose. Do not claim we ran their repo.

## What “done” means for this one-shot

A person can open `index.html`, inhabit a gym, put a card on the floor, force the room to be named, move paper buildings, xerox a plan, and vote — and a second person can read the minutes and know what the town was actually split on. If any of those verbs are missing, it is not this product.
