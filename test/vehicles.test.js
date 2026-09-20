import {describe,it,expect,vi} from 'vitest';
import express from 'express';
import request from 'supertest';
import {vehicleVisionRoutes,validateVisionResult,requestOpenAIVision} from '../server/routes/vehicle-vision.js';
import {describeGroup} from '../web/src/bikes/yzf-model.js';
import {repairPose} from '../web/src/bikes/repair-scene.js';
import {VEHICLES} from '../shared/vehicles.js';
import {serveVehicleAsset} from '../web/local-model-assets.js';
import {mkdtempSync,mkdirSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';

const candidate={status:'candidate',vehicleMatch:'uncertain',componentId:'main-fuse',repairId:'r7-main-fuse',confidence:.8,bbox:[.2,.2,.3,.3],observations:'Exposed fuse marking visible.',nextCheck:'Confirm continuity and vehicle identity.'};
const photo={vehicleId:'yzf-2021',image:'data:image/jpeg;base64,/9j/'};
function app(options){const a=express();a.use('/api/vehicles',vehicleVisionRoutes(options));return a;}

describe('Vehicle catalogue and rigid group labels',()=>{
  it('exposes only the three supplied vehicles',()=>expect(Object.keys(VEHICLES)).toEqual(['yzf-2021','bmw-s1000rr','fenomeno-2026']));
  it('uses vehicle-specific names without inventing engine or fuse internals',()=>{
    expect(describeGroup('seat_32','bmw-s1000rr').id).toBe('rider-seat');
    expect(describeGroup('engineblock_40','bmw-s1000rr').id).toBe('engine-exterior');
    expect(describeGroup('misc_a_23','fenomeno-2026').name).toBe('Source group A');
    expect(describeGroup('door_dside_f_28','fenomeno-2026').name).toBe('Driver door');
    expect(describeGroup('Flcaliper1_Caliper_0_473','fenomeno-2026').name).toBe('Front wheels & brakes');
  });
  it('removes the old fuse before inserting its replacement and reassembles at completion',()=>{
    expect(repairPose(0).removal).toBe(0);
    expect(repairPose(.52).removal).toBe(1);
    expect(repairPose(.52).insertion).toBe(0);
    const end=repairPose(1);expect(end).toMatchObject({phase:7,seat:0,bolt:0,cover:0,removal:1,insertion:1,puller:false,driver:false});
    for(let p=0;p<=1;p+=.01){const state=repairPose(p);expect(state.insertion===0||state.removal===1).toBe(true);}
  });
});

describe('Document-constrained image analysis',()=>{
  it('preserves uncertainty and distinguishes photo coordinates from 3D registration',()=>{
    expect(validateVisionResult(candidate,'yzf-2021')).toMatchObject({requiresInspection:true,regionId:'bodywork',vehicleId:'yzf-2021'});
  });
  it('rejects cross-vehicle repairs, false matches, invented parts and out-of-image boxes',()=>{
    expect(()=>validateVisionResult(candidate,'bmw-s1000rr')).toThrow();
    expect(()=>validateVisionResult(candidate,'fenomeno-2026')).toThrow();
    for(const fields of [{bbox:[.8,0,.3,.4]},{bbox:[0,0,0,1]},{bbox:null},{componentId:'crankshaft'},{vehicleMatch:'different'},{confidence:1.2}])expect(()=>validateVisionResult({...candidate,...fields},'yzf-2021')).toThrow();
  });
  it('does not map a repair when more inspection is needed',()=>{
    expect(validateVisionResult({...candidate,status:'needs_inspection'},'yzf-2021')).toMatchObject({repairId:null,componentId:null,regionId:null});
  });
  it('reports missing configuration without calling a provider',async()=>{
    const analyze=vi.fn();const api=app({apiKey:'',analyze});
    expect((await request(api).get('/api/vehicles/status')).body.configured).toBe(false);
    expect((await request(api).post('/api/vehicles/analyze').send(photo)).status).toBe(503);expect(analyze).not.toHaveBeenCalled();
  });
  it('rejects undocumented car repairs and remote URLs before contacting OpenAI',async()=>{
    const analyze=vi.fn();const api=app({apiKey:'test',analyze});
    expect((await request(api).post('/api/vehicles/analyze').send({...photo,vehicleId:'fenomeno-2026'})).status).toBe(422);
    expect((await request(api).post('/api/vehicles/analyze').send({...photo,image:'http://localhost/secret'})).status).toBe(400);expect(analyze).not.toHaveBeenCalled();
  });
  it('returns a validated candidate but refuses malformed provider output',async()=>{
    const good=await request(app({apiKey:'test',analyze:async()=>candidate})).post('/api/vehicles/analyze').send(photo);
    expect(good.status).toBe(200);expect(good.body.regionId).toBe('bodywork');
    const bad=await request(app({apiKey:'test',analyze:async()=>({...candidate,repairId:'invented'})})).post('/api/vehicles/analyze').send(photo);
    expect(bad.status).toBe(502);expect(bad.body).not.toHaveProperty('repairId');
  });
  it('sends the image only to Responses with a strict schema and storage disabled',async()=>{
    const fetchImpl=vi.fn(async()=>({ok:true,json:async()=>({output:[{content:[{type:'output_text',text:JSON.stringify(candidate)}]}]})}));
    await requestOpenAIVision(photo,{apiKey:'test',fetchImpl});
    const [url,options]=fetchImpl.mock.calls[0];const payload=JSON.parse(options.body);
    expect(url).toBe('https://api.openai.com/v1/responses');expect(payload.store).toBe(false);expect(payload.text.format.strict).toBe(true);
    expect(payload.input[0].content[1].image_url).toBe(photo.image);
  });
});

describe('Local model serving',()=>{
  it('serves each compression audit and blocks arbitrary files',async()=>{
    const folder=mkdtempSync(join(tmpdir(),'vehicle-assets-'));
    const a=express();for(const id of Object.keys(VEHICLES)){
      mkdirSync(join(folder,id));writeFileSync(join(folder,id,'audit.json'),JSON.stringify({geometrySimplified:false}));
      writeFileSync(join(folder,id,'model.glb'),'fixture');writeFileSync(join(folder,id,'model.glb.br'),'compressed-fixture');
      a.use(`/models/${id}`,(req,res)=>serveVehicleAsset(id,req,res,folder));
    }
    try {
    for(const id of Object.keys(VEHICLES)){
      const audit=await request(a).get(`/models/${id}/audit.json`);expect(audit.status).toBe(200);expect(audit.body.geometrySimplified).toBe(false);
      const head=await request(a).head(`/models/${id}/model.glb`).set('Accept-Encoding','br');expect(head.status).toBe(200);expect(head.headers['content-encoding']).toBe('br');
    }
    expect((await request(a).get('/models/yzf-2021/../../package.json')).status).toBe(404);
    expect((await request(a).post('/models/bmw-s1000rr/model.glb')).status).toBe(405);
    expect((await request(a).head('/models/yzf-2021/model.glb').set('Accept-Encoding','br;q=0')).headers['content-encoding']).toBeUndefined();
    } finally {rmSync(folder,{recursive:true,force:true});}
  });
});
