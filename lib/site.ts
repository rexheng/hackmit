export type PinWho = "labor" | "neighbor" | "ops";

export type Pin = {
  who: PinWho;
  t: string;
};

export type FactorId = "electricity" | "jobs" | "water" | "community";

export type Factor = {
  id: FactorId;
  label: string;
  unit: string;
  templateValue: string;
  score: number;
  citizen: string;
  calculus: string;
};

export type GradeLetter = "A" | "B" | "C" | "D" | "E" | "F";

export type LayoutState = {
  pond: { x: number; y: number };
  sub: { x: number; y: number };
  halls: 1 | 2;
  cooling: "evaporative" | "closed-loop" | "air";
  bufferFt: number;
  localHire: boolean;
  nightQuiet: boolean;
  onsiteGenMw: number;
};

export type SiteTemplate = {
  id: string;
  operator: string;
  name: string;
  place: string;
  county: string;
  state: string;
  serial: string;
  address: string;
  lat: number;
  lng: number;
  coolingKind: string;
  prompt: string;
  mwIt: number;
  jobsPermanent: number;
  jobsConstruction: number;
  waterMgalYear: number;
  householdBillDeltaPct: number;
  feederSharePct: number;
  hearingsNoticed: number;
  lettersOnFile: number;
  news: { pin: string; h: string; p: string }[];
  seeds: Pin[];
  materials: Record<
    string,
    { name: string; days: number; civic: string; status: "red" | "amber" | "ok"; obj: string }
  >;
  layout: LayoutState;
  baseScores: Record<FactorId, number>;
};

export const HERO: SiteTemplate = {
  id: "midlothian",
  operator: "Google",
  name: "Google Midlothian Campus",
  place: "MIDLOTHIAN · ELLIS COUNTY",
  county: "Ellis County",
  state: "Texas",
  serial: "CW-03-TX-76065",
  address: "RailPort Parkway, Midlothian, TX 76065",
  lat: 32.4508,
  lng: -97.0211,
  coolingKind: "evaporative towers · Trinity makeup (TEMPLATE)",
  prompt: "make data center, Midlothian Texas, Ellis County, evaporative cooling",
  mwIt: 180,
  jobsPermanent: 85,
  jobsConstruction: 1200,
  waterMgalYear: 511,
  householdBillDeltaPct: 4.2,
  feederSharePct: 22,
  hearingsNoticed: 3,
  lettersOnFile: 41,
  news: [
    {
      pin: "ELLIS CO. TX",
      h: "Commissioners clock summer peaks against the same feeder",
      p: "TEMPLATE clipping. The campus sits on Oncor’s wires in ERCOT. Neighbors hear megawatts as a bill, not a press release.",
    },
    {
      pin: "TRINITY AQUIFER",
      h: "Makeup water is the fight the drought already priced",
      p: "TEMPLATE clipping. Evaporative towers pull from the same hydrology as lawns, stock tanks, and Midlothian ISD sprinklers.",
    },
    {
      pin: "MIDLOTHIAN ISD",
      h: "PILOT talk and a construction gate on RailPort",
      p: "TEMPLATE clipping. Permanent ops jobs are few. The tax object is large. Those two facts can both be true.",
    },
  ],
  seeds: [
    { who: "neighbor", t: "Move the pond off the creek or the wells go first in a dry August." },
    { who: "labor", t: "Night chiller duty wants a premium and a local apprenticeship, not a pamphlet." },
    { who: "ops", t: "We can finish Hall B if the intake stays red — we cannot fake water in Ellis County." },
  ],
  materials: {
    water: {
      name: "AQUIFER INTAKE",
      days: 14,
      civic: "TEMPLATE: Midlothian wells and Mountain Creek already share a dry August.",
      status: "red",
      obj: "pond",
    },
    cooling: {
      name: "TOWER A",
      days: 44,
      civic: "TEMPLATE: Night plume over the RailPort lots.",
      status: "amber",
      obj: "cooling",
    },
    transformer: {
      name: "ONCOR TAP T1",
      days: 160,
      civic: "TEMPLATE: Households and a school campus on the same feeder story.",
      status: "ok",
      obj: "substation",
    },
    concrete: {
      name: "HALL B SLAB",
      days: 380,
      civic: "TEMPLATE: County wants conditions before a second pour.",
      status: "ok",
      obj: "hallB",
    },
  },
  layout: {
    pond: { x: 30, y: 270 },
    sub: { x: 520, y: 95 },
    halls: 2,
    cooling: "evaporative",
    bufferFt: 40,
    localHire: false,
    nightQuiet: false,
    onsiteGenMw: 0,
  },
  baseScores: {
    electricity: 38,
    jobs: 52,
    water: 28,
    community: 48,
  },
};

export const CREW = [
  { id: "millie", name: "MILLIE", ser: "CW-R01", role: "AISLE WALKER", loop: ["office", "hallA", "hallB", "office"], order: "Punch humidity cards — Hall A aisle 3, then Hall B." },
  { id: "brass", name: "BRASS", ser: "CW-R02", role: "ELECTRICIAN", loop: ["office", "hallB", "substation", "parking", "office"], order: "Inspect transformer bushings — Hall B feed." },
  { id: "hopper", name: "HOPPER", ser: "CW-R03", role: "COOLANT", loop: ["cooling", "pond", "creek", "cooling"], order: "Top the pond. Creek intake is silting." },
  { id: "rivet", name: "RIVET", ser: "CW-R04", role: "MASON", loop: ["gate", "office", "hallB", "hallA", "gate"], order: "Walk the slab pour. Report if Hall B stays unfinished." },
  { id: "punch", name: "PUNCH", ser: "CW-R05", role: "INSPECTOR", loop: ["substation", "hallB", "hallA", "cooling", "pond", "office", "substation"], order: "Drop reject flags on any material already in the red." },
] as const;

export const NODES0: Record<string, { x: number; y: number; label: string }> = {
  gate: { x: 300, y: 470, label: "GATE" },
  office: { x: 250, y: 360, label: "OFFICE" },
  hallA: { x: 220, y: 200, label: "HALL A" },
  hallB: { x: 430, y: 170, label: "HALL B" },
  cooling: { x: 90, y: 120, label: "TOWER" },
  pond: { x: 70, y: 300, label: "POND" },
  creek: { x: 36, y: 220, label: "CREEK" },
  substation: { x: 560, y: 130, label: "SUB" },
  parking: { x: 560, y: 430, label: "LOT" },
};

export const EDGES: [string, string][] = [
  ["gate", "office"],
  ["gate", "parking"],
  ["office", "hallA"],
  ["office", "hallB"],
  ["hallA", "hallB"],
  ["hallA", "cooling"],
  ["cooling", "pond"],
  ["pond", "creek"],
  ["hallB", "substation"],
  ["parking", "substation"],
  ["office", "parking"],
];

export const SUPPLY_CHAIN = [
  { tier: "01 SITE", company: "Google", role: "Owner / operator of the Midlothian campus", note: "Public operator of this Texas site. Not a judgment.", template: false },
  { tier: "01 SITE", company: "City of Midlothian / Ellis County", role: "Land use, permits, PILOT talks", note: "The civic counterparty. Hearings are the record.", template: false },
  { tier: "02 POWER", company: "Oncor Electric Delivery", role: "Transmission and distribution (TDU)", note: "Ellis County wires. ERCOT is the market. Households share the feeder story.", template: false },
  { tier: "02 POWER", company: "ERCOT", role: "Grid operator", note: "Summer peaks are a Texas fact, not a slogan.", template: false },
  { tier: "03 BUILD", company: "Holder Construction (TEMPLATE)", role: "General contractor — hyperscale halls", note: "Common GC on U.S. Google campuses. Confirm on the permit set.", template: true },
  { tier: "03 BUILD", company: "Turner / local subcontract (TEMPLATE)", role: "Civil, slab, and site", note: "Pour, dirt, and the gate on RailPort.", template: true },
  { tier: "04 ELECTRIC", company: "Rosendin (TEMPLATE)", role: "Electrical contractor", note: "Switchgear, busway, hall energization.", template: true },
  { tier: "04 ELECTRIC", company: "Hitachi Energy / ABB (TEMPLATE)", role: "Transformers and high-voltage gear", note: "The tap the town can see from the road.", template: true },
  { tier: "05 COOLING", company: "Baltimore Aircoil / Evapco (TEMPLATE)", role: "Evaporative towers", note: "The water object. Closed-loop swaps this bill of materials.", template: true },
  { tier: "05 COOLING", company: "Vertiv / Schneider (TEMPLATE)", role: "CRAC, CDU, electrical-thermal plant", note: "Inside the halls: the dollhouse racks.", template: true },
  { tier: "06 COMPUTE", company: "NVIDIA / Broadcom / Intel (TEMPLATE)", role: "Accelerators, NICs, CPUs", note: "The reason the halls pull megawatts. Not sited in Ellis County.", template: true },
  { tier: "06 COMPUTE", company: "Foxconn / Quanta / Wistron (TEMPLATE)", role: "Server and rack assembly", note: "Manufactured offshore, trucked to RailPort.", template: true },
  { tier: "07 CIVIL", company: "Local ready-mix (TEMPLATE)", role: "Concrete batch", note: "The only plant most neighbors will actually meet.", template: true },
  { tier: "07 CIVIL", company: "Zayo / AT&T (TEMPLATE)", role: "Long-haul fiber", note: "The other pipe. Not water, not watts — packets.", template: true },
] as const;

export const REPS = [
  {
    title: "U.S. House — TX-6 (constructed civic address)",
    name: "Office of the Representative, Texas 6th District",
    email: "TX06IMA@mail.house.gov",
    why: "Midlothian sits in the 6th Congressional District. House mail.house.gov inboxes are public constituent channels.",
  },
  {
    title: "Ellis County Judge (constructed civic address)",
    name: "Office of the Ellis County Judge",
    email: "countyjudge@co.ellis.tx.us",
    why: "County permitting, roads, and the hearing calendar live here.",
  },
  {
    title: "City of Midlothian — City Manager (constructed civic address)",
    name: "City of Midlothian",
    email: "citymanager@midlothian.tx.us",
    why: "Site plan, water, and the local PILOT conversation.",
  },
] as const;
