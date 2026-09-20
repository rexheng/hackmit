import {describe,it,expect,vi} from 'vitest';
import express from 'express';
import request from 'supertest';
import {existsSync} from 'node:fs';
import {DAMAGE_CASES} from '../shared/damage-cases.js';
import {damageExampleRoutes,analyzeDamageExample,validateExampleAssessment} from '../server/routes/damage-examples.js';

const example=DAMAGE_CASES['c8-rear-damper'];
const result={observations:'The upper damper assembly is displaced.',diagnosis:'Possible mount/support failure.',uncertainty:'Hidden damage is unknown.',nextCheck:'Qualified in-person collision inspection.',confidence:'high',bbox:[.26,.12,.58,.78]};
const app=options=>express().use('/examples',damageExampleRoutes(options));
describe('Online damage examples',()=>{
  it('retains real image provenance and never labels saved assessment as a live API run',()=>{
    expect(example.analysis.mode).toBe('saved-codex-review');
    expect(example.mapping).toMatchObject({targetMapped:false,repairAnimationAvailable:false});
    for(const photo of example.photos){expect(existsSync(new URL(`../web/public${photo.src}`,import.meta.url))).toBe(true);expect(photo.original).toMatch(/^https:\/\/www.corvetteblogger.com\//);}
    expect(example.steps.map(step=>step.groupId)).toEqual(['engine-bay','suspension','rear-left-wheel','engine-bay']);
  });
  it('rejects unknown examples, cross-vehicle input and missing configuration before provider calls',async()=>{
    const analyze=vi.fn(),api=app({apiKey:'',analyze});
    expect((await request(api).post('/examples/missing/analyze').send({vehicleId:'corvette-c8'})).status).toBe(404);
    expect((await request(api).post('/examples/c8-rear-damper/analyze').send({vehicleId:'honda-cbr650r'})).status).toBe(400);
    expect((await request(api).post('/examples/c8-rear-damper/analyze').send({vehicleId:'corvette-c8',image:'http://localhost/secret'})).status).toBe(400);
    expect((await request(api).post('/examples/c8-rear-damper/analyze').send({vehicleId:'corvette-c8'})).status).toBe(503);expect(analyze).not.toHaveBeenCalled();
  });
  it('sends both allowlisted photos and requires strict output without provider storage',async()=>{
    const fetchImpl=vi.fn(async()=>({ok:true,json:async()=>({output:[{content:[{type:'output_text',text:JSON.stringify(result)}]}]})}));
    const readImage=vi.fn(async()=>Buffer.from('fixture'));
    expect(await analyzeDamageExample(example,{apiKey:'test',fetchImpl,readImage})).toEqual(result);
    expect(readImage).toHaveBeenCalledTimes(2);
    const [url,options]=fetchImpl.mock.calls[0],body=JSON.parse(options.body);
    expect(url).toBe('https://api.openai.com/v1/responses');expect(body.store).toBe(false);expect(body.text.format.strict).toBe(true);
    expect(body.input[0].content.filter(c=>c.type==='input_image')).toHaveLength(2);
  });
  it('validates output and keeps live findings separate from repair execution',async()=>{
    const response=await request(app({apiKey:'test',analyze:async()=>result})).post('/examples/c8-rear-damper/analyze').send({vehicleId:'corvette-c8'});
    expect(response.status).toBe(200);expect(response.body).toMatchObject({mode:'live-api',animationAvailable:false,targetMapped:false,requiresInspection:true});
    expect(()=>validateExampleAssessment({...result,bbox:[.7,.1,.5,.5]})).toThrow();
    expect(()=>validateExampleAssessment({...result,repairComplete:true})).toThrow();
    const invalid=await request(app({apiKey:'test',analyze:async()=>({...result,confidence:'certain'})})).post('/examples/c8-rear-damper/analyze').send({vehicleId:'corvette-c8'});
    expect(invalid.status).toBe(502);
  });
});
