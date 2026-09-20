import {describe,it,expect} from 'vitest';
import express from 'express';
import request from 'supertest';
import {VENDORS,PART_OFFERS,directorySnapshot,estimateShipping,estimateLabor,quoteRequestDraft} from '../shared/vendors.js';
import {vendorDirectoryRoutes} from '../server/routes/vendor-directory.js';

describe('Sourced vendor directory',()=>{
  it('has stable source-backed records without asserting mesh fitment or obtained quotes',()=>{
    expect(new Set(VENDORS.map(v=>v.id)).size).toBe(VENDORS.length);
    for(const v of VENDORS){expect(v.sources.length).toBeGreaterThan(0);for(const s of v.sources){expect(new URL(s.url).protocol).toBe('https:');expect(s.checkedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);}}
    for(const o of PART_OFFERS){expect(VENDORS.some(v=>v.id===o.vendorId)).toBe(true);expect(o.modelMeshVerified).toBe(false);expect(o.repairRecommendation).toBe(false);}
    expect(VENDORS.filter(v=>v.kind==='service').every(v=>v.quoteStatus==='not-requested')).toBe(true);
    expect(directorySnapshot().live).toBe(false);
  });
  it('applies researched shipping thresholds only to eligible Cambridge parcels',()=>{
    expect(estimateShipping('rocky-mountain',{subtotalUsd:50,standardParcel:true}).shippingUsd).toBe(7);
    expect(estimateShipping('rocky-mountain',{subtotalUsd:76,standardParcel:true}).shippingUsd).toBe(0);
    expect(estimateShipping('rocky-mountain',{subtotalUsd:75,standardParcel:true}).shippingUsd).toBeNull();
    expect(estimateShipping('universal',{subtotalUsd:149,standardParcel:true}).shippingUsd).toBe(9.99);
    expect(estimateShipping('universal',{subtotalUsd:151,standardParcel:true}).shippingUsd).toBe(0);
    expect(estimateShipping('jenson',{subtotalUsd:50,standardParcel:true}).shippingUsd).toBe(0);
    expect(estimateShipping('jenson',{subtotalUsd:49,standardParcel:true}).shippingUsd).toBeNull();
    for(const options of [{subtotalUsd:100},{subtotalUsd:100,standardParcel:true,postalCode:'96801'},{subtotalUsd:100,standardParcel:true,country:'CA'}])expect(estimateShipping('rocky-mountain',options).shippingUsd).toBeNull();
  });
  it('keeps unknown freight, taxes and total separate from known fees',()=>{
    const estimate=estimateShipping('dinos',{subtotalUsd:895,standardParcel:true});
    expect(estimate.shippingUsd).toBeNull();expect(estimate.taxUsd).toBeNull();expect(estimate.totalUsd).toBeNull();
    expect(PART_OFFERS.find(o=>o.id==='c8-used-exhaust').shippingOverride).toMatchObject({kind:'freight',knownFeeUsd:121});
    expect(estimateShipping('partzilla',{subtotalUsd:200,standardParcel:true}).shippingUsd).toBeNull();
    expect(()=>estimateShipping('rocky-mountain',{subtotalUsd:-1})).toThrow();
    expect(()=>estimateShipping('rocky-mountain',{subtotalUsd:NaN})).toThrow();
  });
  it('distinguishes hourly assumptions from flat visits and actual quotes',()=>{
    expect(estimateLabor('madhouse','standard',2)).toMatchObject({amountUsd:330,providerQuote:false,totalUsd:null});
    expect(estimateLabor('nemo','standard',2)).toMatchObject({amountUsd:95,providerQuote:false});
    expect(()=>estimateLabor('quirk','standard',1)).toThrow();
    expect(()=>estimateLabor('madhouse','standard',-1)).toThrow();
    const draft=quoteRequestDraft('madhouse',{vehicle:'Honda CBR650R',work:'Inspect a no-start condition'});
    expect(draft).toContain('UNSENT');expect(draft).toContain('02139');expect(draft).toContain('Honda CBR650R');
  });
  it('serves filtered records and rejects invalid estimate requests',async()=>{
    const app=express();app.use('/api/vehicles',vendorDirectoryRoutes());
    const res=await request(app).get('/api/vehicles/vendors?category=bicycle').expect(200);
    expect(res.body.vendors.every(v=>v.category==='bicycle')).toBe(true);
    expect(res.body.offers.every(o=>o.category==='bicycle')).toBe(true);
    await request(app).get('/api/vehicles/vendors?category=spaceship').expect(400);
    await request(app).get('/api/vehicles/vendors/rocky-mountain/shipping').expect(400);
    await request(app).get('/api/vehicles/vendors/rocky-mountain/shipping?subtotalUsd=-1').expect(400);
    await request(app).get('/api/vehicles/vendors/rocky-mountain/shipping?subtotalUsd=100&standardParcel=1').expect(400);
    await request(app).get('/api/vehicles/vendors/unknown/shipping?subtotalUsd=100').expect(404);
    const shipping=await request(app).get('/api/vehicles/vendors/rocky-mountain/shipping?subtotalUsd=50&standardParcel=true').expect(200);
    expect(shipping.body.shippingUsd).toBe(7);expect(shipping.body.totalUsd).toBeNull();
  });
});
