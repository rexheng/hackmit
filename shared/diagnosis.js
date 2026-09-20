// These are visual context groups, not verified service-part bindings.
const motorcycleRegions = [
  ['engine-exterior','Engine exterior'], ['bodywork','Bodywork / seat access'],
  ['chassis','Chassis'], ['lower-forks','Front fork assembly'], ['swingarm','Rear swingarm'],
  ['front-wheel','Front wheel'], ['rear-wheel','Rear wheel'],
  ['front-brakes','Front brake discs'], ['rear-brake','Rear brake disc'],
  ['upper-forks','Upper fork assembly'], ['handlebars','Handlebars and hand controls / levers'],
  ['headlight','Headlight'], ['taillight','Tail light'], ['bodywork-2','Secondary bodywork'],
];
export const DIAGNOSIS_REGIONS = {
  'yzf-2021': [...motorcycleRegions,['radiator-group','Radiator area'],['exhaust','Exhaust'],['windscreen','Windscreen']],
  'honda-cbr650r': [...motorcycleRegions,['instruments','Instrument display'],['headlight-right','Right headlight'],['taillight-right','Right tail light'],['indicator-left','Left rear indicator'],['indicator-right','Right rear indicator']],
  'corvette-c8': [
    ['engine-bay','Engine and rear engine bay'], ['suspension','Suspension assembly'],
    ['bodywork','Body / chassis'], ['rear-cover','Rear engine cover'],
    ['front-left-wheel','Front left wheel'], ['front-right-wheel','Front right wheel'],
    ['rear-left-wheel','Rear left wheel'], ['rear-right-wheel','Rear right wheel'],
    ['front-left-brake-caliper','Front left brake caliper'], ['front-right-brake-caliper','Front right brake caliper'],
    ['rear-left-brake-caliper','Rear left brake caliper'], ['rear-right-brake-caliper','Rear right brake caliper'],
    ['left-door','Left door'], ['right-door','Right door'], ['frunk','Front luggage compartment / hood'],
    ['steering-wheel','Steering wheel'], ['interior','Cabin'], ['headlights','Headlights'], ['taillights','Tail lights'],
  ],
};

// A photo fixture only. No saved diagnosis, annotations or repair recommendation
// is sent to the API or displayed as an assessment.
export const DIAGNOSIS_EXAMPLES = [{
  id:'c8-auction-closeup', vehicleId:'corvette-c8', year:'2022', variant:'Stingray',
  title:'Photo 1 · Close-up',
  source:{title:'CorvetteBlogger · Copart photos',url:'https://www.corvetteblogger.com/2022/01/07/what-happened-to-this-c8-corvette-to-end-up-at-a-copart-insurance-auction/'},
  photos:[{src:'/damage-cases/c8-damper-closeup.jpg',label:'Photo 1 · Close-up'}],
}];

DIAGNOSIS_EXAMPLES.unshift({...DIAGNOSIS_EXAMPLES[0],id:'c8-auction-overview',title:'Photo 2 · Engine-bay view',isDefault:true,photos:[{src:'/damage-cases/c8-engine-bay.jpg',label:'Photo 2 · Engine-bay view'}]});

export const STRUCTURAL_REFERENCE = {
  title:'GM bulletin 23-NA-019 · C8 structural repair requirements',
  url:'https://static.nhtsa.gov/odi/tsbs/2023/MC-10232080-0001.pdf',
  scope:'2020–2023 C8. Structural-parts restrictions and specialist equipment; not a diagnosis or a vehicle-specific repair procedure.',
  tools:['Fixture bench for most structural repairs','Pre/post-repair scan and calibration equipment','VIN-specific fixtures and joining tools from the selected GM procedure'],
};
