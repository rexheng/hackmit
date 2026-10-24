import type { Factor, FactorId, GradeLetter, LayoutState, Pin, SiteTemplate } from "./site";
import { HERO } from "./site";

export const WEIGHTS: Record<FactorId, number> = {
  electricity: 0.3,
  jobs: 0.2,
  water: 0.3,
  community: 0.2,
};

export type Scorecard = {
  factors: Factor[];
  total: number;
  letter: GradeLetter;
  lines: string[];
  template: true;
};

export function letterFor(total: number): GradeLetter {
  if (total >= 85) return "A";
  if (total >= 70) return "B";
  if (total >= 55) return "C";
  if (total >= 40) return "D";
  if (total >= 25) return "E";
  return "F";
}

function clamp(n: number) {
  return Math.max(0, Math.min(100, Math.round(n)));
}

export function pondNearCreek(layout: LayoutState) {
  return Math.hypot(layout.pond.x - 40, layout.pond.y - 220) < 200;
}

export function scoreSite(
  site: SiteTemplate = HERO,
  layout: LayoutState = site.layout,
  pins: Pin[] = [],
  extras: Partial<Record<FactorId, number>> = {},
): Scorecard {
  const neighborHeat = pins.filter((p) => p.who === "neighbor").length;
  const laborHeat = pins.filter((p) => p.who === "labor").length;

  let electricity = site.baseScores.electricity + (extras.electricity ?? 0);
  let jobs = site.baseScores.jobs + (extras.jobs ?? 0);
  let water = site.baseScores.water + (extras.water ?? 0);
  let community = site.baseScores.community + (extras.community ?? 0);

  if (layout.cooling === "closed-loop") {
    water += 38;
    electricity -= 6;
  } else if (layout.cooling === "air") {
    water += 48;
    electricity -= 10;
  }
  if (!pondNearCreek(layout) && layout.cooling === "evaporative") {
    water += 14;
    community += 8;
  }
  if (layout.sub.y > 260) {
    community += 6;
    electricity += 4;
  }
  if (layout.halls === 1) {
    electricity += 16;
    jobs -= 8;
    water += 8;
  }
  if (layout.bufferFt >= 120) community += 10;
  else if (layout.bufferFt >= 80) community += 6;
  if (layout.localHire) {
    jobs += 14;
    community += 6;
  }
  if (layout.nightQuiet) community += 10;
  if (layout.onsiteGenMw >= 20) electricity += 18;
  else if (layout.onsiteGenMw >= 5) electricity += 8;

  community -= neighborHeat * 2;
  jobs += laborHeat * 1;

  electricity = clamp(electricity);
  jobs = clamp(jobs);
  water = clamp(water);
  community = clamp(community);

  const factors: Factor[] = [
    {
      id: "electricity",
      label: "ELECTRICITY",
      unit: "MW IT + household bill pressure",
      templateValue: `${site.mwIt} MW IT · +${site.householdBillDeltaPct}% bill pressure · ${site.feederSharePct}% feeder share`,
      score: electricity,
      citizen:
        "You meet this plant on the Oncor bill and at summer peak. Megawatts on a shared feeder are not abstract: they are a queue, a rate case, and whether the air conditioner still starts at 6 p.m.",
      calculus: `base ${site.baseScores.electricity} + cooling/gen/hall deltas → ${electricity}. Weight ${WEIGHTS.electricity}.`,
    },
    {
      id: "jobs",
      label: "JOBS",
      unit: "permanent ops per MW + construction peak",
      templateValue: `${site.jobsPermanent} permanent · ${site.jobsConstruction} construction peak · ${(site.jobsPermanent / site.mwIt).toFixed(2)} jobs/MW`,
      score: jobs,
      citizen:
        "Construction is a crowd for eighteen months. Operations is a small crew with badges. Count both, and say which one is still there when the halls are full.",
      calculus: `base ${site.baseScores.jobs} + hire clauses / hall count / labor pins → ${jobs}. Weight ${WEIGHTS.jobs}.`,
    },
    {
      id: "water",
      label: "WATER",
      unit: "million gallons / year makeup",
      templateValue: `${site.waterMgalYear} Mgal/yr evaporative makeup (TEMPLATE)`,
      score: water,
      citizen:
        "North Texas already budgets rain. Evaporative cooling turns electricity into steam. Closed-loop and air-cooled plants spend watts to spare wells. That trade is the whole argument.",
      calculus: `base ${site.baseScores.water} + cooling type + pond/creek adjacency → ${water}. Weight ${WEIGHTS.water}.`,
    },
    {
      id: "community",
      label: "COMMUNITY",
      unit: "noise, tax object, hearings, feeder fairness",
      templateValue: `${site.hearingsNoticed} noticed hearings · ${site.lettersOnFile} letters on file · PILOT talks (TEMPLATE)`,
      score: community,
      citizen:
        "A plant is a neighbor: night noise, truck gates, school tax, and whether the hearing was real. Democracy here is turnout and a packet, not a sentiment score.",
      calculus: `base ${site.baseScores.community} + buffers/quiet/hire − neighbor heat → ${community}. Weight ${WEIGHTS.community}.`,
    },
  ];

  const total =
    Math.round(
      (electricity * WEIGHTS.electricity +
        jobs * WEIGHTS.jobs +
        water * WEIGHTS.water +
        community * WEIGHTS.community) *
        10,
    ) / 10;
  const letter = letterFor(total);

  const lines = [
    `TOTAL = 0.30×electricity + 0.20×jobs + 0.30×water + 0.20×community`,
    `TOTAL = 0.30×${electricity} + 0.20×${jobs} + 0.30×${water} + 0.20×${community} = ${total}`,
    `BANDS  A≥85  B≥70  C≥55  D≥40  E≥25  F<25  →  GRADE ${letter}`,
    `All input quantities are TEMPLATE. The formula is the product. The letter is not a campaign.`,
  ];

  return { factors, total, letter, lines, template: true };
}
