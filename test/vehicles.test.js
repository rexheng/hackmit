import {describe,it,expect,vi} from 'vitest';
import express from 'express';
import request from 'supertest';
import {vehicleVisionRoutes,validateVisionResult,requestOpenAIVision} from '../server/routes/vehicle-vision.js';
import {describeGroup} from '../web/src/bikes/yzf-model.js';
import * as THREE from 'three';
import {prepareSourceMeshes, spreadSourceMeshes, sourcePartDescriptor} from '../web/src/bikes/source-parts.js';
import {REPAIRS, repairGeometryStatus} from '../shared/repairs.js';
import {VEHICLES} from '../shared/vehicles.js';
import {serveVehicleAsset} from '../web/local-model-assets.js';
import {mkdtempSync,mkdirSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';

const candidate={status:'candidate',vehicleMatch:'uncertain',componentId:'main-fuse',repairId:'r7-main-fuse',confidence:.8,bbox:[.2,.2,.3,.3],observations:'Exposed fuse marking visible.',nextCheck:'Confirm continuity and vehicle identity.'};
const photo={vehicleId:'yzf-2021',image:'data:image/jpeg;base64,/9j/'};
function app(options){const a=express();a.use('/api/vehicles',vehicleVisionRoutes(options));return a;}

describe('Vehicle catalogue and rigid group labels',()=>{
  it('exposes only the three supplied vehicles',()=>expect(Object.keys(VEHICLES)).toEqual(['yzf-2021','honda-cbr650r','corvette-c8']));
  it('uses vehicle-specific names without inventing engine or fuse internals',()=>{
    expect(describeGroup('enginecbr_33','honda-cbr650r').id).toBe('engine-exterior');
    expect(describeGroup('misc_a_35','honda-cbr650r').name).toBe('Source group A');
    expect(describeGroup('6.2L LT2 V8 Engine and Engine Bay','corvette-c8').id).toBe('engine-bay');
    expect(describeGroup('Engine Bay Bolts','corvette-c8').id).toBe('engine-bay-bolts');
    expect(describeGroup('Front Left Brake Caliper','corvette-c8').category).toBe('Running gear');
    expect(VEHICLES['corvette-c8'].source).toMatchObject({author:'Hari',license:'CC BY 4.0'});
  });
  it('separates the original mesh objects and restores their positions without changing geometry or materials',()=>{
    const material=new THREE.MeshStandardMaterial();
    const meshes=[new THREE.Mesh(new THREE.BoxGeometry(1,2,1),material),new THREE.Mesh(new THREE.SphereGeometry(.5),material)];
    const node=new THREE.Group();node.add(...meshes);meshes[1].position.set(.1,.2,.3);
    for(const mesh of meshes)mesh.userData={originalMaterial:material,sourceNode:mesh.uuid,sourceGroup:'original'};
    const part={id:'engine',name:'Engine',category:'Powertrain',sourceName:'original',meshes,node,bounds:new THREE.Box3().setFromObject(node),triangles:1,materialNames:['original']};
    const original=meshes.map(m=>({mesh:m,geometry:m.geometry,position:m.position.clone(),vertices:Array.from(m.geometry.attributes.position.array)}));
    prepareSourceMeshes(part);spreadSourceMeshes(part,1);
    for(let i=0;i<meshes.length;i++) {
      expect(meshes[i]).toBe(original[i].mesh);expect(meshes[i].geometry).toBe(original[i].geometry);expect(meshes[i].material).toBe(material);
      expect(Array.from(meshes[i].geometry.attributes.position.array)).toEqual(original[i].vertices);
      expect(meshes[i].position.distanceTo(original[i].position)).toBeGreaterThan(0);
    }
    const descriptors=sourcePartDescriptor(part);expect(descriptors.meshes.map(m=>m.id)).toEqual(['engine/mesh-1','engine/mesh-2']);
    expect(descriptors.meshes[0].sourceNode).toBe(meshes[0].uuid);
    spreadSourceMeshes(part,0);meshes.forEach((mesh,i)=>expect(mesh.position.equals(original[i].position)).toBe(true));
    meshes.forEach(m=>m.geometry.dispose());material.dispose();
  });
  it('never presents an access-region mapping as modeled repair geometry',()=>{
    for(const vehicle of Object.values(VEHICLES)) {
      const recipe=REPAIRS[vehicle.repairId];expect(recipe.vehicleId).toBe(vehicle.id);
      expect(repairGeometryStatus(recipe)).toMatchObject({animationAvailable:false,targetMapped:false});
      expect(recipe.missingGeometry.length).toBeGreaterThan(0);
    }
  });
});

describe('Document-constrained image analysis',()=>{
  it('preserves uncertainty and distinguishes photo coordinates from 3D registration',()=>{
    expect(validateVisionResult(candidate,'yzf-2021')).toMatchObject({requiresInspection:true,regionId:'bodywork',vehicleId:'yzf-2021',regionRole:'context-only',animationAvailable:false,targetMapped:false});
  });
  it('rejects cross-vehicle repairs, false matches, invented parts and out-of-image boxes',()=>{
    expect(()=>validateVisionResult(candidate,'honda-cbr650r')).toThrow();
    expect(()=>validateVisionResult(candidate,'corvette-c8')).toThrow();
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
  it('rejects retired vehicle IDs and remote URLs before contacting OpenAI',async()=>{
    const analyze=vi.fn();const api=app({apiKey:'test',analyze});
    expect((await request(api).post('/api/vehicles/analyze').send({...photo,vehicleId:'fenomeno-2026'})).status).toBe(400);
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
    expect((await request(a).post('/models/honda-cbr650r/model.glb')).status).toBe(405);
    expect((await request(a).head('/models/yzf-2021/model.glb').set('Accept-Encoding','br;q=0')).headers['content-encoding']).toBeUndefined();
    } finally {rmSync(folder,{recursive:true,force:true});}
  });
});
