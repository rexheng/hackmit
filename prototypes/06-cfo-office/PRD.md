# OCFO — Virtual Office of the CFO
## Product requirements — physical close agent

**This build:** a MuJoCo twin of an executive suite. A flying ragdoll executes the month-end cash close for a data-center operator, names every break, and rewrites its own policy.

**Date line:** Saturday, September 19, 2026.

---

### Vision

Finance automation demos are usually a chat window on a spreadsheet. This one is a room.

The Office of the CFO is a physical place: walnut slats, a leather desk, a black coffee table, a niche of audit binders. The agent is not an avatar icon. It is a ragdoll with thrusters. When matching fails it hits the floor. When the policy learns T+1 settlement, the flight damps and the cash report lands on the table.

Judges should feel a close happening in space, then watch the same body fly the same route cleaner because it learned *why* it failed.

---

### Workflow (the actual job)

**Entity:** Northline Compute LLC (operator).  
**Period:** August 2026 cash close.  
**Systems:** Chase operating account, NetSuite GL, Coupa AP / ACH.

The agent must:

1. Ingest the four source files (door).
2. Reconcile bank ↔ cash GL (planter — live feed).
3. Investigate unexpected P&L change vs July (desk / laptop).
4. Resolve AP / payment exceptions (sideboard + chair).
5. Gather audit support — invoice PDF hashes (bookshelf).
6. Emit a cash report that either ties or is blocked (coffee table).

Planted breaks, all real close texture:

| Code | What happened |
|---|---|
| `TIMING_WINDOW` | ACH settles T+1; naive matcher keys on same-day amount |
| `BANK_FEE` | Chase analysis fee never booked |
| `FX_VARIANCE` | EUR invoice at 1.12, bank cleared at 1.08 |
| `DUP_INVOICE` | `INV-n` / `INV-n-A` clones |
| `MISSING_PO` | 3-way match fail |
| `PAYEE_CHANGE` | Vendor bank change, no W-9 / callback |
| `AUDIT_GAP` | No PDF hash in the pack |
| `UNEXPECTED_CHANGE` | Revenue +$790k = Oncor interconnection true-up, not run-rate |

---

### Self-improvement

The agent does not fine-tune a giant model in the demo. It **patches a typed policy** after each close:

- Open a 1-day matching window.
- Pair on vendor when dates slip.
- Auto-post sub-$100 bank fees.
- Allow 4% FX and log the rate source.
- Collapse duplicate invoice numbers.
- Block missing-PO posts.
- Callback payee changes.
- Require invoice PDFs.
- Explain material P&L deltas in the memo.

Episode 0 is naive and blocked. Later episodes on unseen seeds close clean. The physical layer maps score → thruster noise / PD gains, so learning is visible as flight quality.

---

### Physical layer

- **MJCF** `sim/office.xml` — z-up office, freejoint ragdoll, 6 thruster actuators.
- **Python** `sim/physics.py` — PD waypoint flight, recorded JSON.
- **Blender** `sim/blender_office.py` — same recipe, optional GLB bake.
- **Three.js twin** — walnut / taupe / linen read of the reference interior. Live ragdoll if MuJoCo JSON is absent; playback when present.

Stations are waypoints, not icons.

---

### Non-goals

- Not a production ERP connector.
- Not a photoreal Gaussian splat of a real office.
- Not an LLM-in-the-loop for the hackathon close (the policy is explicit so you can read the lesson).
- Not a second civic-newspaper prototype. This is the factory-twin cousin: the desk instead of the plant.

---

### Success in 90 seconds

1. Look at the room. Find the slats, the planter, the desk.
2. Hit **Run one close**. Watch the ragdoll fly door → bank → desk → AP → audit → table. Read the red failures.
3. Hit **Learn × 12**. Score sparkline climbs. Policy toggles go green.
4. Hit **Run one close** again. Same messy books, different behavior. Cash report issues.
5. **Throw ragdoll** if you need to remember it is a body.

If a judge asks “but where is the agent?” point at the policy rewrite, not the chat box.
