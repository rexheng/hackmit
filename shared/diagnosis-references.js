// Curated anatomy / troubleshooting context, never a saved diagnosis or photo answer.
// These concise paraphrases are sent for every assessment of the matching vehicle.
// Procedure applicability and actual service-part geometry are checked separately.
export const DIAGNOSIS_REFERENCES = {
  'corvette-c8': [
    {
      id:'c8-layout', title:'GM 20-NA-061 · C8 systems and suspension',
      url:'https://static.nhtsa.gov/odi/tsbs/2020/MC-10174083-9999.pdf#page=18',
      scope:'2020 C8 Stingray systems overview; equipment varies.',
      facts:'The LT2 engine is behind the cabin. Rear suspension has double-wishbone control arms and monotube shock absorbers. Optional electronic suspension controls each damper electrically. A wire does not by itself identify a standalone sensor. Suspension and engine components share the rear compartment.',
    },
    {
      id:'c8-rear-mount-layout', title:'Lingenfelter C8 guide · rear shock mount locations',
      url:'https://www.lingenfelter.com/PDFdownloads/L011300021.pdf#page=31',
      scope:'Rev. Q, PDF p. 31 / printed p. 30: original component locations during teardown for a supercharger installation. Anatomy reference only.',
      facts:'Rear upper shock mounts are accessed from the engine compartment, on both left and right sides, with three upper mounting nuts per side. Mag Ride connections are disconnected from adjacent brackets. Identify by position, mounting geometry and connections together; the guide does not diagnose a broken mount or prove any pictured vehicle has Mag Ride.',
    },
    {
      id:'c8-owner-layout', title:'Chevrolet owner manual · engine compartment and air cleaner',
      url:'https://www.chevrolet.ca/en/ownercenter/content/dam/gmownercenter/gmna/GMCC/dynamic/2020/chevrolet/corvette/en/2020-chevrolet-corvette-owners-manual-english.pdf#page=223',
      scope:'2020 manual; confirm equipment before using service instructions.',
      facts:'The engine air cleaner is reached through rear-compartment trim and an access panel. Visible engine covers, heat shields and compartment trim are not the filter element. The air-cleaner maintenance procedure is not a general no-start or suspension repair.',
    },
  ],
  'honda-cbr650r': [
    {
      id:'honda-starting', title:'Honda CBR650R/RA manual · starting diagnosis',
      url:'https://cdn.powersports.honda.com/documentum/MWOM/ml.remawmom.2019_31mknc00_cbr650r.pdf#page=107',
      scope:'2019 manual, printed p. 105. Diagnostic categories; confirm edition before service.',
      facts:'Distinguish starter-not-turning from engine-cranking-but-not-starting. For no crank, the manual considers the starting sequence, run/stop switch, fuse, battery connections/corrosion and battery condition. When it cranks, consider fuel and the PGM-FI warning lamp. No-start alone does not identify a blown fuse.',
    },
    {
      id:'honda-electrical-layout', title:'Honda CBR650R/RA manual · seats and main fuse',
      url:'https://cdn.powersports.honda.com/documentum/MWOM/ml.remawmom.2019_31mknc00_cbr650r.pdf#page=126',
      scope:'2019 reference; uploaded model year is not verified.',
      facts:'The main fuse is at the starter magnetic switch under the front seat. The front seat and battery access are separate from engine-exterior castings. A described under-seat electrical issue can use the bodywork/seat group as access-area context, not as an exact fuse or battery mesh.',
    },
  ],
  'yzf-2021': [
    {
      id:'yamaha-troubleshooting', title:'Yamaha R7 manual · diagnostic categories',
      url:'https://moto-nautika.com/pdf/navodila%20za%20uporabo/R7.pdf#page=86',
      scope:'YZF-R7 / YZF690 reference ONLY. The selected asset is titled YZF 2021; do not assume it is an R1 or R7.',
      facts:'The starting chart separates fuel supply, battery/cranking speed, ignition and compression. Slow cranking calls for battery/connection checks. These are diagnostic categories, not proof of a failed part. R7-specific fuse ratings, locations and procedures must not be applied to an unidentified YZF. General fork, wheel, brake, engine and bodywork regions can still be identified from evidence without exact variant confirmation.',
    },
  ],
};
