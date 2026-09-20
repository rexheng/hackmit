// FIXTURE. NOT A REAL MANUAL. Every value below is made up for automated tests and for running the app with no keys.
// The model codes look real so that typo matching can be tested. Do not use any number here on a bike.
export const FIXTURE_META = { title: "FIXTURE Dealer Manual (made-up values, not a real manual)", brand: "FixtureBrand", url: "", file: null, fixture: true };

export const FIXTURE_PAGES = [
  { page: 1, text: `FIXTURE REAR DERAILLEUR RD-R8000\nThis page is a test fixture. Values are invented.\nINSTALLATION OF THE REAR DERAILLEUR\nMount the rear derailleur RD-R8000 on the frame bracket. Tighten the bracket axle with a 5 mm hexagon wrench.\nBracket axle tightening torque: 8 - 10 N·m\nTurn the low adjustment bolt until the guide pulley lines up with the largest sprocket.\nCable fixing bolt tightening torque: 6 - 7 N·m\nUse hexagon wrench TL-FX01 for the cable fixing bolt.` },
  { page: 2, text: `FIXTURE CRANKSET FC-R8000\nThis page is a test fixture. Values are invented.\nINSTALLATION OF THE CRANK\nFit the left crank arm FC-R8000 onto the axle. Tighten the cap with tool TL-FC16.\nCap tightening torque: 0.7 - 1.5 N·m\nTighten the two clamp bolts evenly.\nClamp bolt tightening torque: 12 - 14 N·m\nChainring part number: Y1W898010` },
  { page: 3, text: `FIXTURE DISC BRAKE BR-R8070\nThis page is a test fixture. Values are invented.\nWARNING: Disc brake rotors become hot during riding. Do not touch them, otherwise you may be burned.\nREPLACING THE BRAKE PADS\nRemove the wheel. Remove the pad axle and take out the pads. Push the pistons back with a flat tool.\nReplace the pads when the pad thickness is 0.5 mm or less.\nPad axle tightening torque: 0.2 - 0.4 N·m\nBrake pad part number: Y8PU98010\nThe brake pad Y8PU98010 is compatible with BR-R8070.` },
];

export const FIXTURE_FACTS = [
  { page: 1, specType: "torque", name: "Bracket axle tightening torque", value: "8 - 10", unit: "N·m", tool: "5 mm hexagon wrench", models: ["RD-R8000"], verbatimText: "Bracket axle tightening torque: 8 - 10 N·m" },
  { page: 1, specType: "torque", name: "Cable fixing bolt tightening torque", value: "6 - 7", unit: "N·m", tool: "TL-FX01", models: ["RD-R8000"], verbatimText: "Cable fixing bolt tightening torque: 6 - 7 N·m" },
  { page: 2, specType: "torque", name: "Clamp bolt tightening torque", value: "12 - 14", unit: "N·m", tool: "", models: ["FC-R8000"], verbatimText: "Clamp bolt tightening torque: 12 - 14 N·m" },
  { page: 2, specType: "torque", name: "Cap tightening torque", value: "0.7 - 1.5", unit: "N·m", tool: "TL-FC16", models: ["FC-R8000"], verbatimText: "Cap tightening torque: 0.7 - 1.5 N·m" },
  { page: 2, specType: "part_number", name: "Chainring", value: "Y1W898010", unit: "", tool: "", models: ["FC-R8000"], verbatimText: "Chainring part number: Y1W898010" },
  { page: 3, specType: "dimension", name: "Brake pad replacement thickness", value: "0.5", unit: "mm", tool: "", models: ["BR-R8070"], verbatimText: "Replace the pads when the pad thickness is 0.5 mm or less." },
  { page: 3, specType: "torque", name: "Pad axle tightening torque", value: "0.2 - 0.4", unit: "N·m", tool: "", models: ["BR-R8070"], verbatimText: "Pad axle tightening torque: 0.2 - 0.4 N·m" },
  { page: 3, specType: "part_number", name: "Brake pad", value: "Y8PU98010", unit: "", tool: "", models: ["BR-R8070"], verbatimText: "Brake pad part number: Y8PU98010" },
  { page: 3, specType: "compatibility", name: "Brake pad compatibility", value: "Y8PU98010", unit: "", tool: "", models: ["BR-R8070"], verbatimText: "The brake pad Y8PU98010 is compatible with BR-R8070." },
];

export const FIXTURE_PRICES = [
  { partNumber: "Y8PU98010", name: "FIXTURE brake pad", priceUsd: 24.0, sample: true },
  { partNumber: "Y1W898010", name: "FIXTURE chainring", priceUsd: 89.0, sample: true },
];
