// Manufacturer-authored reference instructions, paraphrased. Unmapped geometry cannot drive a repair animation.
const yamahaManual = 'https://moto-nautika.com/pdf/navodila%20za%20uporabo/R7.pdf';
const hondaManual = 'https://cdn.powersports.honda.com/documentum/MWOM/ml.remawmom.2019_31mknc00_cbr650r.pdf';
const chevroletManual = 'https://www.chevrolet.ca/en/ownercenter/content/dam/gmownercenter/gmna/GMCC/dynamic/2020/chevrolet/corvette/en/2020-chevrolet-corvette-owners-manual-english.pdf';
export const REPAIRS = {
  'r7-main-fuse': {
    id: 'r7-main-fuse', vehicleId: 'yzf-2021', name: 'Main fuse replacement', rating: '30 A', color: '#5db679',
    componentId: 'main-fuse', geometryBindings: [], missingGeometry: ['Main fuse', 'Starter-relay cover', 'Seat fasteners'], region: 'bodywork', location: 'Under the rider seat · starter relay',
    purpose: 'An open main fuse can interrupt electrical power and prevent starting. A photo alone cannot establish the electrical fault.',
    compatibility: 'Manual reference: YZF-R7 / YZF690, BEB-28199-E0, June 2021 edition. Confirm the actual model and fuse allocation before use; the uploaded model is only titled “YZF 2021”.',
    source: {title: 'Yamaha R7 owner manual', url: yamahaManual, pages: '3-19–3-21 · 6-32–6-33', page: 82, publisher: 'Yamaha · dealer-hosted PDF'},
    tools: [{name: 'Hexagon wrench + seat key', note: 'Use the supplied wrench; confirm the actual fastener.', kind: 'driver'}, {name: 'Plastic fuse puller', note: 'Optional handling aid.', kind: 'puller'}, {name: 'Matching 30 A fuse', note: 'Confirm the fuse type and main-fuse label.', kind: 'part'}],
    steps: [
      ['Power off', 'Turn the key off and switch off the affected circuit.'],
      ['Access the seat area', 'Unlock the passenger seat; remove its cover, then the rider-seat bolts with the supplied hexagon wrench. Lift rearward and up.'],
      ['Expose the main fuse', 'Remove the starter-relay cover. Identify the main fuse, not the spare.'],
      ['Remove and inspect', 'Withdraw the failed fuse. Confirm failure; an image cannot prove continuity.'],
      ['Match the replacement', 'Use the specified 30 A main fuse. A higher rating is unsafe.'],
      ['Seat the new fuse', 'Insert the matching replacement into the original slot.'],
      ['Close the assembly', 'Refit the cover and rider seat securely.'],
      ['Check the circuit', 'Check operation. If the fuse blows again, stop and have Yamaha inspect the circuit.'],
    ],
  },
  'cbr650r-main-fuse': {
    id: 'cbr650r-main-fuse', vehicleId: 'honda-cbr650r', name: 'Main fuse replacement', rating: '30 A',
    componentId: 'main-fuse', region: 'bodywork', location: 'Under front seat · starter magnetic switch',
    geometryBindings: [], missingGeometry: ['Main fuse', 'Starter-switch connector', 'Seat fasteners'],
    purpose: 'An interrupted main electrical supply can prevent starting. A photograph cannot establish continuity.',
    compatibility: 'Reference: 2019 CBR650R/RA, 31MKNC00. The uploaded model has no verified year; check the actual vehicle first.',
    source: {title: 'Honda CBR650R/RA owner manual', url: hondaManual, pages: '71 · 81–82 · 124 · 150', page: 126, publisher: 'Honda'},
    tools: [{name: 'Seat key and mounting-bolt tool', note: 'Match the actual bolt; size not established here.', kind: 'driver'}, {name: 'Matching 30 A main fuse', note: 'Verify the vehicle specification.', kind: 'part'}],
    steps: [
      ['Switch off', 'Switch off the ignition before handling fuses.'],
      ['Remove the seats', 'Release the rear seat; remove the front-seat bolts and lift the front seat back and upward.'],
      ['Access the fuse', 'Disconnect the starter magnetic switch wire connector.'],
      ['Inspect and replace', 'Withdraw the main fuse and check it. Replace a failed fuse with the same rating.'],
      ['Refit', 'Reverse removal and confirm the seat is secure.'],
      ['Check recurrence', 'Repeated failure requires dealer diagnosis.'],
    ],
  },
  'c8-air-filter': {
    id: 'c8-air-filter', vehicleId: 'corvette-c8', name: 'Engine air filter inspection', rating: 'LT2 / C8',
    componentId: 'engine-air-filter', region: 'engine-bay', location: 'Rear compartment · air cleaner access',
    geometryBindings: [], missingGeometry: ['Air filter element', 'Air cleaner cover', 'Access-panel fasteners'],
    purpose: 'Documented engine maintenance reference. This is not a confirmed no-start repair.',
    compatibility: 'Reference: 2020 Corvette owner manual. The artist title says 2019; verify C8 model year and equipment.',
    source: {title: '2020 Corvette owner manual', url: chevroletManual, pages: '222–224', page: 223, publisher: 'Chevrolet'},
    tools: [{name: 'Bracket-bolt and cover-screw tools', note: 'Bit sizes are not specified in this owner-manual procedure.', kind: 'driver'}, {name: 'Matching filter element', note: 'Select by the actual vehicle specification.', kind: 'part'}],
    steps: [
      ['Prepare', 'Keep the engine off. Clear nearby dirt; do not use water or compressed air.'],
      ['Access the compartment', 'Remove the net if fitted, bracket bolts, brackets, hooks, retainers and carpet.'],
      ['Open the housing', 'Remove the rear access panel, then the air-cleaner cover and their screws.'],
      ['Inspect the element', 'Remove and inspect or replace the filter.'],
      ['Reassemble', 'Reverse removal. Never run the engine with the air cleaner removed.'],
    ],
  },
};

export function repairGeometryStatus(recipe) {
  const missing = recipe?.missingGeometry || [];
  // Animation also requires validated access order, paths and tools. No supplied
  // asset currently has these; a matching region is never a target-part binding.
  return {animationAvailable: false, targetMapped: false, missingGeometry: [...missing]};
}
