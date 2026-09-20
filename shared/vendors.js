// Curated public-source snapshot, not a live stock feed or a provider-issued quotation.
export const VENDOR_RESEARCH_DATE = '2026-09-19';
export const DESTINATION = {country:'US', postalCode:'02139', city:'Cambridge', state:'MA'};
const source = (label,url,access='page') => ({label,url,access,checkedAt:VENDOR_RESEARCH_DATE});
const unknownShipping = (note,source) => ({kind:'quote',note,source});
const vendor = (id,name,category,condition,url,note,shipping,sources,extra={}) => ({id,name,category,kind:'retailer',condition,url,note,shipping,sources,checkedAt:VENDOR_RESEARCH_DATE,...extra});
const rmCatalog='https://www.rockymountainatvmc.com/oem-parts/yamaha/2021-yamaha-yzf-r1';
const rmElectrical=`${rmCatalog}/electrical-2?submodel=yzfr1-yzfr1m1cl-2021`;
const rmShipping=source('Shipping terms','https://www.rockymountainatvmc.com/Free-Shipping-Offer','browser');
const ucShipping=source('Ground shipping policy','https://www.universalcycles.com/');
const hondaHarness='https://www.partzilla.com/catalog/honda/motorcycle/2021/cbr650ra-cbr650r-abs/wire-harness';
const gmFilter='https://www.gmpartsdirect.com/oem-parts/gm-air-filter-84321605';
const dinoShipping=source('Shipping and delivery','https://www.corvettesalvage.com/shipping-delivery/');
const jensonShipping=source('Shipping FAQ','https://www.jensonusa.com/customer-service/faqs','indexed-page');
const sunShipping=source('Continental US shipping','https://suncoastcyclesports.com/international-non-continental-u-s-shipping/','indexed-page');
const tpcShipping=source('Shipping policy','https://theproscloset-taxvzqxext2.gorgias.help/en-US','indexed-page');
const ajoShipping=source('Shipping and returns','https://www.ajobikes.com/articles/shipping-return-policies-pg208.htm');

export const VENDORS = [
  vendor('yamaha-catalog','Yamaha Motor OEM catalog','motorcycle',['new'],'https://yamaha-motor.com/parts/motorcycle/697278/14148181',
    'Manufacturer catalog verified as 2021 YZFR1M1B / B3LB0. Yamaha notes that regional model codes can change parts. R1 references must not be applied to the unverified imported YZF model.',
    unknownShipping('Yamaha lists UPS Ground, with weight/dimension surcharges and LTL for large items. No numeric rate verified; confirm checkout.',source('Yamaha shipping policy','https://yamaha-motor.com/help/shipping-and-delivery','browser')),
    [source('2021 YZFR1M1B / B3LB0 catalog','https://yamaha-motor.com/parts/motorcycle/697278/14148181','browser'),source('Yamaha shipping policy','https://yamaha-motor.com/help/shipping-and-delivery','browser')],{kind:'catalog',brands:['Yamaha']}),
  vendor('rocky-mountain','Rocky Mountain ATV/MC','motorcycle',['new'],rmCatalog,
    'Verified 2021 YZF-R1 catalog; choose the exact regional submodel. Also sells Honda OEM parts. No imported-mesh fitment is established.',
    {kind:'threshold',thresholdUsd:75,thresholdRule:'over',belowUsd:7,atThresholdUsd:null,note:'Eligible standard parcels to the lower 48: $7 below $75; free over $75. Oversize exclusions. Confirm exactly $75 in checkout.',source:rmShipping},
    [source('2021 R1 OEM catalog',rmCatalog,'browser'),rmShipping],{brands:['Yamaha','Honda']}),
  vendor('partzilla','Partzilla','motorcycle',['new'],'https://www.partzilla.com/',
    'New OEM parts and exploded diagrams for Yamaha and Honda. Catalog identity and OEM number must match the actual vehicle.',
    unknownShipping('Advertises free shipping from $149 with restrictions. Exact eligibility and lower-order cost need checkout verification.',source('Shipping offer','https://www.partzilla.com/','indexed-page')),
    [source('2021 R1 B3LB0 catalog','https://www.partzilla.com/catalog/yamaha/motorcycle/2021/yzfr1-yzfr1m1b-b3lb0','indexed-page'),source('2021 CBR650RA wiring harness',hondaHarness,'indexed-page')],{brands:['Yamaha','Honda']}),
  vendor('suncoast','Sun Coast Cycle Sports','motorcycle',['used'],'https://suncoastcyclesports.com/',
    'Used OEM motorcycle components. Honda/Yamaha inventory is a sourcing lead; no specific CBR650R or R1 item or fitment was confirmed.',
    {kind:'free',note:'Published policy offers free shipping within the lower 48. Confirm item restrictions before purchase.',source:sunShipping},
    [source('Used OEM powersports inventory','https://suncoastcyclesports.com/','indexed-page'),sunShipping],{brands:['Yamaha','Honda']}),
  vendor('gm-parts-direct','GMPartsDirect / Flow Automotive','car',['new'],'https://www.gmpartsdirect.com/',
    'New GM components. Confirm VIN, RPO codes, supersessions and stock; a parts drawing does not validate a mesh.',
    unknownShipping('ZIP and basket are required for shipping charges; special-order lead times vary.',source('Filter listing and shipping terms',gmFilter,'indexed-page')),
    [source('C8 air filter listing',gmFilter,'indexed-page')],{brands:['Chevrolet']}),
  vendor('dinos','Dino’s Corvette Salvage','car',['used','new','rebuilt'],'https://www.corvettesalvage.com/c8-corvette-parts/',
    'C8 new and salvage inventory with OEM numbers and option restrictions. Stock is item-specific.',
    unknownShipping('Checkout shipping may need adjustment for oversized/freight shipments; residential and lift-gate charges may apply.',dinoShipping),
    [source('C8 inventory','https://www.corvettesalvage.com/c8-corvette-parts/'),dinoShipping],{brands:['Chevrolet']}),
  vendor('jenson','Jenson USA','bicycle',['new'],'https://www.jensonusa.com/',
    'Bicycle parts and accessories; not a supplier for the modeled motorcycles or Corvette.',
    {kind:'threshold',thresholdUsd:50,thresholdRule:'at-least',belowUsd:null,atThresholdUsd:0,note:'Eligible standard items: free from $50 to physical lower-48 addresses. Oversize surcharges apply; lower-order shipping needs checkout.',source:jensonShipping},
    [jensonShipping]),
  vendor('universal','Universal Cycles','bicycle',['new'],'https://www.universalcycles.com/',
    'Bicycle drivetrain, brake and service components. Exact speed, dimensions and manufacturer compatibility matter.',
    {kind:'threshold',thresholdUsd:150,thresholdRule:'over',belowUsd:9.99,atThresholdUsd:null,note:'Ground shipping to the lower 48 is $9.99 below $150 and free over $150 for eligible items. Exact threshold and oversize items need checkout.',source:ucShipping},
    [ucShipping]),
  vendor('pros-closet','The Pro’s Closet','bicycle',['used','new'],'https://www.theproscloset.com/',
    'Verified used bicycle components catalog, including drivetrain and brakes. Not motorcycle components.',
    unknownShipping('Shipping and handling are shown when the order is placed. No flat component rate verified.',tpcShipping),
    [source('Used component inventory','https://www.theproscloset.com/collections/used-bike-components'),tpcShipping]),
  vendor('recycled-cycling','Recycled Cycling','bicycle',['new','used-unverified'],'https://www.recycledcycling.com/',
    'Bicycle retailer supplied as a used-parts lead. A current standalone used-parts listing has not been verified.',
    unknownShipping('Store requires a call to confirm both inventory and shipping before ordering.',source('Ordering notice','https://www.recycledcycling.com/')),
    [source('Catalog and ordering notice','https://www.recycledcycling.com/')],{phone:'630-251-0314'}),
  vendor('ajo','Ajo Bikes','bicycle',['new','used-bikes'],'https://www.ajobikes.com/',
    'Used bicycle sales are documented; standalone used components are not verified. Tucson, AZ, not a local Cambridge provider.',
    unknownShipping('Most apparel/accessories can ship; no rate published here. New bicycle purchases require store possession. Confirm used-item shipping individually.',ajoShipping),
    [ajoShipping]),
  vendor('madhouse','Madhouse Motors','motorcycle',[],'https://www.madhousemotors.com/repairs',
    'Motorcycle maintenance and repairs. Model acceptance, diagnosis, billable time and parts require an individual estimate.',null,
    [source('Published labor rates and estimate form','https://www.madhousemotors.com/repairs')],
    {kind:'service',location:'24 Blue Hill Ave, Boston, MA',phone:'617-686-0740',email:'service@madhousemotors.com',quoteUrl:'https://www.madhousemotors.com/repairs',brands:['Yamaha','Honda'],rates:[{id:'standard',label:'Standard labor',amountUsd:165,unit:'hour'},{id:'oversized',label:'Oversized motorcycle labor',amountUsd:185,unit:'hour'},{id:'fabrication',label:'Fabrication',amountUsd:225,unit:'hour'}],quoteStatus:'not-requested'}),
  vendor('quirk','Quirk Chevrolet','car',[],'https://www.quirkchevy.com/service-2/',
    'Greater Boston Chevrolet service lead. C8 job pricing and specialist structural-repair capability require confirmation. Its $149.95 oil-change promotion explicitly excludes Corvettes.',null,
    [source('Service center and exclusions','https://www.quirkchevy.com/service-2/')],
    {kind:'service',location:'444 Quincy Avenue, Braintree, MA 02184',phone:'781-519-4311',quoteUrl:'https://www.quirkchevy.com/service-2/',brands:['Chevrolet'],rates:[],quoteStatus:'not-requested'}),
  vendor('nemo','NEMO mobile bicycle repair','bicycle',[],'https://get-nemo.com/cambridge',
    'Serves Cambridge. Published visit rates include mechanic time, travel and diagnostics; parts are additional.',null,
    [source('Cambridge service and pricing','https://get-nemo.com/cambridge')],
    {kind:'service',location:'Mobile service across Cambridge, MA',phone:'857-847-6366',quoteUrl:'https://get-nemo.com/cambridge',rates:[{id:'standard',label:'Standard bicycle repair visit',amountUsd:95,unit:'visit'},{id:'cargo',label:'E-bike / cargo bicycle visit',amountUsd:135,unit:'visit'}],quoteStatus:'not-requested'})
];

const offer=(id,vendorId,name,partNumber,priceUsd,condition,category,fitment,url,note,extra={})=>({id,vendorId,name,partNumber,priceUsd,currency:'USD',condition,category,fitment,note,source:source('Listing / price evidence',url),checkedAt:VENDOR_RESEARCH_DATE,stockStatus:'recheck',fitmentStatus:'seller-catalog-only',modelMeshVerified:false,repairRecommendation:false,...extra});
export const PART_OFFERS = [
  offer('r1-50a','rocky-mountain','Yamaha fuse · 50A','5JW-82151-10-00',14.03,'new','motorcycle','2021 YZF-R1 · YZFR1M1CL electrical 2, callout 26',rmElectrical,'Observed 3 in stock in the browser. Not the R7 30A reference; select only after exact vehicle/circuit verification.',{source:source('Live catalog row',rmElectrical,'browser'),stockStatus:'observed-in-stock'}),
  offer('honda-30a','partzilla','Honda blade fuse · 30A','38221-SNA-A81',2.24,'new','motorcycle','2021 CBR650RA / CBR650R ABS · wiring harness, callout 015',hondaHarness,'Indexed page reports stock. Current availability and actual vehicle year require checking.',{source:source('Indexed Honda catalog row',hondaHarness,'indexed-page')}),
  offer('honda-puller','partzilla','Honda mini-fuse puller','38235-SNA-A01',3.55,'new','motorcycle','2021 CBR650RA / CBR650R ABS · wiring harness, callout 016',hondaHarness,'Tool listing; not a modeled component.',{source:source('Indexed Honda catalog row',hondaHarness,'indexed-page')}),
  offer('c8-air-filter','gm-parts-direct','GM engine air filter','84321605',66.34,'new','car','Seller title: 2020–2026 Corvette; confirm VIN / engine',gmFilter,'Alias A3239C. Special-order wording appears on the listing; no immediate stock claim.',{source:source('Indexed GM listing',gmFilter,'indexed-page'),stockStatus:'special-order-check'}),
  offer('c8-used-exhaust','dinos','C8 used exhaust muffler & pipe assembly','85047991',895,'used','car','Seller lists C8 2020–2026; LT2 / NWI; excludes NPP dual-mode exhaust','https://www.corvettesalvage.com/product/c8-used-exhaust-muffler-pipe-assembly-2020-2026/','Not a fix for the damper-damage case. Seller’s broad model list requires VIN/RPO confirmation.',{shippingOverride:{kind:'freight',knownFeeUsd:121,note:'$121 crating plus truck freight. Additional charges can apply after checkout; request a delivered quote to 02139.'}}),
  offer('c8-used-radiator','dinos','C8 used engine radiator','C8-ER-2024-U',null,'used','car','2020–2024 C8; side and V08/V09 option must match','https://www.corvettesalvage.com/product/c8-used-engine-radiator-2020-2024/','Seller asks customers to text for availability. Price depends on variant.',{priceRangeUsd:[125,150],stockStatus:'contact-seller'}),
  offer('kmc-link','universal','KMC MissingLink-10CR · each','ML00967',3.99,'new','bicycle','Campagnolo 10-speed chain only · 5.88 mm','https://www.universalcycles.com/shopping/product_details.php?id=16793','Seller SKU 16793-83001; not for a motorcycle chain. Indexed inventory dates may be stale.')
];

export function vehicleCategory(id) { return id==='corvette-c8'?'car':'motorcycle'; }
export function directorySnapshot() {return {schemaVersion:1,checkedAt:VENDOR_RESEARCH_DATE,destination:DESTINATION,currency:'USD',live:false,notice:'Public listing snapshot. Verify stock, exact fitment and final charges with the seller. No provider-issued quotations obtained.',vendors:VENDORS,offers:PART_OFFERS};}

export function estimateShipping(vendorId,{subtotalUsd,postalCode='02139',country='US',standardParcel=false}={}) {
  const v=VENDORS.find(v=>v.id===vendorId);
  if(!v)throw new Error('Unknown vendor.');
  if(!Number.isFinite(subtotalUsd)||subtotalUsd<0||subtotalUsd>1_000_000)throw new Error('Enter a valid nonnegative subtotal.');
  const base={vendorId,currency:'USD',destination:{country,postalCode},shippingUsd:null,taxUsd:null,totalUsd:null,status:'quote-needed',basis:'published-policy',checkedAt:VENDOR_RESEARCH_DATE,note:v.shipping?.note||'Shipping does not apply to a service provider.'};
  // Only Cambridge was researched. Never silently apply lower-48 policies to other destinations.
  if(country!=='US'||postalCode!=='02139')return {...base,note:'This snapshot estimates shipping only to Cambridge, MA 02139.'};
  if(!standardParcel)return {...base,note:'Confirm eligible standard parcel; freight, hazardous and oversized items require a separate quote.'};
  const p=v.shipping;let amount=null;
  if(p?.kind==='free')amount=0;
  if(p?.kind==='threshold'){
    if(subtotalUsd>p.thresholdUsd || (subtotalUsd===p.thresholdUsd&&p.thresholdRule==='at-least'))amount=0;
    else if(subtotalUsd<p.thresholdUsd)amount=p.belowUsd;
    else amount=p.atThresholdUsd;
  }
  return amount===null?base:{...base,shippingUsd:amount,knownSubtotalUsd:Math.round((subtotalUsd+amount)*100)/100,status:'policy-estimate'};
}

export function estimateLabor(vendorId,rateId,hours=1){
  const v=VENDORS.find(v=>v.id===vendorId),rate=v?.rates?.find(r=>r.id===rateId);
  if(!rate)throw new Error('Choose a published service rate.');
  if(!Number.isFinite(hours)||hours<=0||hours>100)throw new Error('Enter hours between 0 and 100.');
  return {amountUsd:Math.round(rate.amountUsd*(rate.unit==='hour'?hours:1)*100)/100,currency:'USD',basis:rate.unit==='hour'?'published-rate-times-assumed-hours':'published-visit-rate',providerQuote:false,partsUsd:null,taxUsd:null,totalUsd:null};
}

export function quoteRequestDraft(vendorId,{vehicle='',work='',partNumber=''}={}){
  const v=VENDORS.find(v=>v.id===vendorId);if(!v)throw new Error('Unknown vendor.');
  return `UNSENT REQUEST FOR ESTIMATE — ${v.name}\nDestination: Cambridge, MA 02139, USA\nVehicle: ${vehicle||'[exact year / model / trim]'}\nVIN / RPO or bicycle specification: [to be supplied]\nRequested inspection or work: ${work||'[describe symptoms and requested work]'}\nOEM part number / quantity: ${partNumber||'[confirm after diagnosis]'}\n\nPlease confirm vehicle fitment and provide an itemized written estimate: diagnostics, parts (new/used and condition), labor hours and rate, freight/shipping, packaging, shop fees, tax, lead time, warranty and quote validity. Please identify exclusions and obtain approval before additional work.\n\nFor used parts: please include donor details, photos, inspection/testing, OEM number and return terms.\nNo booking, purchase, or repair authorization is given by this request.\n`;
}
