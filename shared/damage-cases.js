// The saved findings are Codex's visual assessment of the actual source photos,
// not a fabricated API response. Keep provider provenance explicit in the UI.
export const DAMAGE_CASES = {
  'c8-rear-damper': {
    id: 'c8-rear-damper', vehicleId: 'corvette-c8', title: 'Rear damper mount damage',
    subtitle: '2022 Corvette C8 · two real auction photographs',
    source: {title: 'CorvetteBlogger · January 7, 2022', credit: 'Photos: Copart, via CorvetteBlogger', url: 'https://www.corvetteblogger.com/2022/01/07/what-happened-to-this-c8-corvette-to-end-up-at-a-copart-insurance-auction/'},
    photos: [
      {id: 'closeup', src: '/damage-cases/c8-damper-closeup.jpg', original: 'https://www.corvetteblogger.com/images/content/2022/010722_5.jpg', label: 'Damaged mount · close-up', bbox: [.26,.12,.58,.78]},
      {id: 'engine-bay', src: '/damage-cases/c8-engine-bay.jpg', original: 'https://www.corvetteblogger.com/images/content/2022/010722_3.jpg', label: 'Engine bay · opposite-side comparison', bbox: [.015,.625,.2,.25]},
    ],
    analysis: {
      mode: 'saved-codex-review', label: 'Saved Codex image analysis', date: '2026-09-19',
      observations: 'The close-up shows a damper shaft and upper assembly protruding above an open, irregular-edged support area. The wider image shows a different seating position from the opposite-side mount.',
      diagnosis: 'Suspected rear damper upper-mount or supporting-structure failure. This is a suspension/support problem; the photos do not establish an internal engine fault.',
      uncertainty: 'The exact failed component, concealed cracks, alignment and repairability cannot be confirmed from these photographs. The listing identifies the car as a 2022 C8; the imported model has a different artist title and unverified specification.',
      confidence: 'high', confidenceMeaning: 'Visible displacement only; the mechanical diagnosis remains provisional.',
      nextCheck: 'Keep the vehicle out of service and have a C8-qualified collision technician inspect the mount, supporting structure, damper and adjacent suspension before specifying replacement parts.',
    },
    fix: {
      title: 'Restore the damper support after structural assessment',
      recommendation: 'The likely repair is replacement of the failed mount/damper components and any damaged supporting structure identified during inspection. A damper-only swap is not established by these photos. The exact parts and repair sequence require the vehicle’s GM service information and in-person measurements.',
      documentation: 'GM bulletin 23-NA-019 covers 2020–2023 C8 structural-parts restrictions and specialist equipment. It establishes the repair route, not a diagnosis or step-by-step repair for this car.',
      source: {title: 'GM service bulletin 23-NA-019 · pp. 1–2', url: 'https://static.nhtsa.gov/odi/tsbs/2023/MC-10232080-0001.pdf'},
      tools: [
        {name: 'Fixture bench', note: 'GM specifies this for most structural repairs.'},
        {name: 'Pre/post-repair scan and calibration equipment', note: 'Part of the GM collision-repair quality process.'},
        {name: 'VIN-specific fixtures and joining tools', note: 'Exact equipment must come from the selected GM repair procedure.'},
      ],
    },
    mapping: {type: 'assembly-context', targetMapped: false, repairAnimationAvailable: false, explanation: 'The supplied model contains engine-bay and suspension assemblies, but no verified standalone damaged mount. The 3D walkthrough highlights real source geometry; it does not simulate a completed structural repair.'},
    steps: [
      {title: 'Locate the damage', groupId: 'engine-bay', text: 'Compare the annotated photos with the engine-bay context. The damaged mount is not an independently verified service mesh.', mode: 'studio', spacing: 0},
      {title: 'Inspect the suspension', groupId: 'suspension', text: 'This is the actual source suspension group. A technician must assess the damper, mount and adjoining load path.', mode: 'studio', spacing: .18},
      {title: 'Check adjacent running gear', groupId: 'rear-left-wheel', text: 'Include wheel, hub and alignment checks in the collision assessment. The photo alone does not prove these parts are damaged.', mode: 'studio', spacing: .3},
      {title: 'Plan the verified repair', groupId: 'engine-bay', text: 'Use the measured findings and GM procedure to specify the repair. The model cannot demonstrate unmodeled fasteners, structural joining or calibration.', mode: 'studio', spacing: .12},
    ],
  },
};

export const casesForVehicle = vehicleId => Object.values(DAMAGE_CASES).filter(item => item.vehicleId === vehicleId);
