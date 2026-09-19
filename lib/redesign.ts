import type { FactorId, LayoutState } from "./site";
import { HERO } from "./site";

export type RedesignResult = {
  prompt: string;
  operations: string[];
  mitigations: string[];
  extras: Partial<Record<FactorId, number>>;
  layout: LayoutState;
  narrative: string;
};

const RULES: {
  test: RegExp;
  op?: string;
  mit?: string;
  extras?: Partial<Record<FactorId, number>>;
  patch?: (l: LayoutState) => void;
}[] = [
  {
    test: /closed[-\s]?loop|dry cooler|water[-\s]?cooled closed|no evaporat/i,
    op: "Swap evaporative towers for closed-loop cooling.",
    mit: "Makeup gallons fall; chiller watts rise. Score water up, electricity slightly down.",
    extras: { water: 4 },
    patch: (l) => {
      l.cooling = "closed-loop";
    },
  },
  {
    test: /air[-\s]?cool|adiabatic off|no water/i,
    op: "Specify air-cooled plant; water is no longer the constraint.",
    mit: "Wells spared. Summer efficiency drops. Neighbors still hear fans.",
    extras: { water: 6, community: -2 },
    patch: (l) => {
      l.cooling = "air";
    },
  },
  {
    test: /greywater|reclaim|recycle water|reuse/i,
    op: "Reclaim process water before aquifer makeup.",
    mit: "Partial water relief without changing the tower type.",
    extras: { water: 12 },
  },
  {
    test: /pond off|move the pond|away from (the )?creek|off the creek/i,
    op: "Drag the cooling pond off Mountain Creek / the lot low point.",
    mit: "Adjacency heat leaves the hydrology. Days-to-fail on intake improve.",
    extras: { water: 6, community: 4 },
    patch: (l) => {
      l.pond = { x: 240, y: 360 };
    },
  },
  {
    test: /substation|transformer|move the tap|off the lot/i,
    op: "Shift the substation toward the industrial edge, off the shared lot line.",
    mit: "Feeder story gets a clearer fence. Not more megawatts — a cleaner neighbor.",
    extras: { community: 4, electricity: 3 },
    patch: (l) => {
      l.sub = { x: 520, y: 300 };
    },
  },
  {
    test: /solar|photovoltaic|behind[-\s]the[-\s]meter|on[-\s]?site gen|onsite gen/i,
    op: "Add behind-the-meter generation on the parking and roof.",
    mit: "Households still share the feeder; the plant buys some of its own peaks.",
    extras: { electricity: 8 },
    patch: (l) => {
      l.onsiteGenMw = Math.max(l.onsiteGenMw, 25);
    },
  },
  {
    test: /battery|bess|storage/i,
    op: "Site a battery to shave coincident peak.",
    mit: "Does not create water. Does change when the feeder is asked to work.",
    extras: { electricity: 10, community: 4 },
  },
  {
    test: /smaller|one hall|fewer halls|less mw|half the|scale down/i,
    op: "Build one hall, not two. Cut nameplate IT load.",
    mit: "Fewer permanent jobs. Fewer gallons. Fewer watts. A different plant.",
    extras: { electricity: 4, jobs: -4 },
    patch: (l) => {
      l.halls = 1;
    },
  },
  {
    test: /apprentice|local hire|prevailing wage|union|career/i,
    op: "Write a local-hire and apprenticeship clause into the ops contract.",
    mit: "Permanent jobs stay few; they become local. Construction peak is still a peak.",
    extras: { jobs: 6, community: 4 },
    patch: (l) => {
      l.localHire = true;
    },
  },
  {
    test: /tree|buffer|berm|setback|landscape/i,
    op: "Require a 120-ft berm and tree buffer on the residential edge.",
    mit: "Does not change MW. Changes what a kitchen window sees and hears.",
    extras: { community: 6 },
    patch: (l) => {
      l.bufferFt = Math.max(l.bufferFt, 120);
    },
  },
  {
    test: /night|quiet|noise|chiller wall|sound wall/i,
    op: "Night-quiet operations: no diesel tests after 22:00, acoustic wall on Tower A.",
    mit: "Complaint volume is a civic meter. This moves it without touching the aquifer.",
    extras: { community: 6 },
    patch: (l) => {
      l.nightQuiet = true;
    },
  },
  {
    test: /truck|school|crossing|gate|haul/i,
    op: "Move the construction gate off the school crossing; daylight hauls only.",
    mit: "A condition a parent can enforce from a minivan.",
    extras: { community: 8 },
  },
  {
    test: /pilot|tax|payment in lieu|isd|school board/i,
    op: "Publish the PILOT schedule next to the MW nameplate.",
    mit: "Disclosure is not a gift. It lets a voter add. Neutral on the letter until the numbers exist — TEMPLATE holds.",
    extras: { community: 5 },
  },
];

export function interpretRedesign(prompt: string, base: LayoutState = HERO.layout): RedesignResult {
  const layout: LayoutState = {
    ...base,
    pond: { ...base.pond },
    sub: { ...base.sub },
  };
  const operations: string[] = [];
  const mitigations: string[] = [];
  const extras: Partial<Record<FactorId, number>> = {};

  for (const rule of RULES) {
    if (!rule.test.test(prompt)) continue;
    if (rule.op) operations.push(rule.op);
    if (rule.mit) mitigations.push(rule.mit);
    if (rule.extras) {
      for (const [k, v] of Object.entries(rule.extras)) {
        const key = k as FactorId;
        extras[key] = (extras[key] ?? 0) + (v ?? 0);
      }
    }
    rule.patch?.(layout);
  }

  if (operations.length === 0) {
    operations.push("No stencil matched. The plant is unchanged. Try cooling, water, jobs, noise, halls, or the pond.");
    mitigations.push("The calculus only moves when a citizen names an object the factory can actually restamp.");
  }

  const narrative =
    operations.length && !operations[0].startsWith("No stencil")
      ? `Citizen language restamped the Midlothian plant. ${operations.join(" ")} Mitigations: ${mitigations.join(" ")}`
      : "The shipping tag did not name a part the works can punch. The grade holds.";

  return { prompt, operations, mitigations, extras, layout, narrative };
}
