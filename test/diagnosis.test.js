import {describe,it,expect,vi} from 'vitest';
import request from 'supertest';
import express from 'express';
import {readFileSync} from 'node:fs';
import {diagnosisRequestSchema,validateAssessment,buildDiagnosis,requestDiagnosis,vehicleDiagnosisRoutes,DEFAULT_DIAGNOSIS_MODEL} from '../server/routes/vehicle-diagnosis.js';
import {DIAGNOSIS_REGIONS,DIAGNOSIS_EXAMPLES} from '../shared/diagnosis.js';
import {describeGroup} from '../web/src/bikes/yzf-model.js';

const jpeg='data:image/jpeg;base64,/9j/AA==';
const input=()=>diagnosisRequestSchema.parse({vehicleId:'corvette-c8',year:'2022',variant:'Stingray',images:[jpeg],description:'Displaced component near the rear.'});
const assessment=()=>({summary:'Possible suspension support damage.',vehicleMatch:'uncertain',evidenceQuality:'adequate',identification:{label:'Rear damper upper mount',level:'assembly',basis:'image'},damageStatus:'visible',nextAction:'Have a qualified technician inspect the rear damper attachment.',repairApproach:'If confirmed, replace damaged suspension components after assessing the mounting structure.',referenceIds:['c8-rear-mount-layout'],observations:[{text:'A component protrudes above its support.',source:'image',imageIndex:0}],hypotheses:[{component:'Damper or support',system:'suspension',reason:'Shaft and attachment geometry.',check:'Qualified inspection of the mount and surrounding structure.'}],uncertainties:['Hidden damage and repairability are unknown.'],questions:['What preceded the damage?'],urgency:'stop_use',regionId:'suspension',locationReason:'Suspension assembly context only.',photoRegions:[{imageIndex:0,bbox:[.1,.2,.4,.4],label:'Visible displacement'}],manualCandidateId:null});
const run=()=>({assessment:assessment(),model:DEFAULT_DIAGNOSIS_MODEL,responseId:'resp_live',imageCount:1,serviceTier:'priority'});
const api=options=>express().use('/api/vehicles',vehicleDiagnosisRoutes(options));
const response=value=>({ok:true,json:async()=>({status:'completed',id:'resp_live',model:DEFAULT_DIAGNOSIS_MODEL,output:[{content:[{type:'output_text',text:JSON.stringify(value)}]}]})});

describe('Evidence intake',()=>{
  it('accepts text, photos, both, and the vehicle-matched photo fixture',()=>{
    for(const fields of [{description:'No start.'},{images:[jpeg]},{description:'Noise.',images:[jpeg]},{exampleId:'c8-auction-closeup'}])expect(diagnosisRequestSchema.safeParse({vehicleId:'corvette-c8',...fields}).success).toBe(true);
  });
  it('rejects empty evidence, unknown vehicles, remote URLs, fake image MIME, mixed fixtures and mismatched vehicles',()=>{
    for(const fields of [{description:'   '},{images:['https://example.com/private']},{images:['data:image/jpeg;base64,c2VjcmV0']},{vehicleId:'fz6',description:'No start.'},{vehicleId:'honda-cbr650r',exampleId:'c8-auction-closeup'},{exampleId:'c8-auction-closeup',images:[jpeg]},{images:[jpeg,jpeg]},{description:'Issue',apiKey:'unexpected'}])expect(diagnosisRequestSchema.safeParse({vehicleId:'corvette-c8',...fields}).success).toBe(false);
  });
  it('does not contact the provider for invalid input or absent credentials',async()=>{
    const analyze=vi.fn();const app=api({apiKey:'',analyze});
    expect((await request(app).post('/api/vehicles/diagnose').send({vehicleId:'corvette-c8'})).status).toBe(400);
    expect((await request(app).post('/api/vehicles/diagnose').send(input())).status).toBe(503);
    expect(analyze).not.toHaveBeenCalled();
  });
});

describe('Diagnosis evidence and geometry gates',()=>{
  it('rejects imagined observations, invalid photo references, cross-vehicle manuals and unknown groups',()=>{
    const textInput={...input(),images:[]};
    expect(()=>validateAssessment(assessment(),textInput)).toThrow();
    expect(()=>validateAssessment({...assessment(),observations:[{text:'User reports smoke.',source:'description',imageIndex:null}]},{...input(),description:''})).toThrow();
    for(const fields of [{photoRegions:[{imageIndex:1,bbox:[0,0,1,1],label:'Wrong image'}]},{regionId:'invented-piston'},{manualCandidateId:'r7-main-fuse'}])expect(()=>validateAssessment({...assessment(),...fields},input())).toThrow();
  });
  it('withholds localization and repair pairing on unusable evidence or a different vehicle',()=>{
    for(const fields of [{vehicleMatch:'different'},{evidenceQuality:'unusable'}]){
      const data=run();Object.assign(data.assessment,fields);
      const result=buildDiagnosis(input(),data);
      expect(result.location.regionId).toBe(null);expect(result.photoRegions).toEqual([]);expect(result.repair.manualId).toBe(null);expect(result.status).not.toBe('provisional');
    }
  });
  it('never turns a provisional finding into a confirmed fault, repair animation or invented quote',()=>{
    const result=buildDiagnosis(input(),run());
    expect(result).toMatchObject({mode:'live-api',status:'provisional',requiresInspection:true,location:{regionId:'suspension',targetMapped:false},repair:{animationAvailable:false,manualId:null}});
    expect(result.providers[0]).toMatchObject({id:'quirk',quoteStatus:'not-requested',quotedTotalUsd:null});
    expect(result.provenance.passes.map(p=>p.responseId)).toEqual(['resp_live']);
    expect(result.repair.structuralReference.url).toContain('nhtsa.gov');
  });
  it('drops invalid optional annotation bounds without losing a valid diagnosis',()=>{
    const data=run();data.assessment.photoRegions=[{imageIndex:0,bbox:[.9,0,.5,.2],label:'Outside'}];
    const result=buildDiagnosis(input(),data);expect(result.photoRegions).toEqual([]);expect(result.status).toBe('provisional');expect(result.hypotheses).toHaveLength(1);
  });
  it('keeps useful assembly context on limited evidence without authorizing an exact repair',()=>{
    const data=run();data.assessment.evidenceQuality='limited';data.assessment.manualCandidateId='c8-air-filter';
    const result=buildDiagnosis({...input(),year:'2020'},data);
    expect(result.location.regionId).toBe('suspension');expect(result.photoRegions).toHaveLength(1);
    expect(result.repair.manualId).toBe(null);expect(result.repair.animationAvailable).toBe(false);
  });
  it('accepts reported damage and localizes it without a photo or fabricated visual evidence',()=>{
    const data=run();data.imageCount=0;Object.assign(data.assessment,{
      identification:{label:'Rear damper mount',level:'assembly',basis:'description'},damageStatus:'reported',
      observations:[{text:'User reports the rear shock mount has separated.',source:'description',imageIndex:null}],photoRegions:[],
    });
    const result=buildDiagnosis({...input(),description:'My rear shock mount has separated.',images:[]},data);
    expect(result.location).toMatchObject({regionId:'suspension',basis:'description'});
    expect(result.provenance).toMatchObject({imageCount:0,inputMode:'text only'});
    expect(result.identification.basis).toBe('description');expect(result.photoRegions).toEqual([]);
  });
  it('does not require a failed-part hypothesis to identify a visible assembly',()=>{
    const data=run();Object.assign(data.assessment,{hypotheses:[],damageStatus:'not_observed',uncertainties:[]});
    const result=buildDiagnosis(input(),data);
    expect(result.location.regionId).toBe('suspension');expect(result.hypotheses).toEqual([]);expect(result.repair.manualId).toBe(null);
  });
  it('rejects fabricated visual findings in text-only results and unverified reference IDs',()=>{
    const textInput={...input(),images:[]};
    expect(()=>validateAssessment({...assessment(),observations:[],photoRegions:[]},textInput)).toThrow('Missing image evidence');
    expect(()=>validateAssessment({...assessment(),identification:{label:'Mount',level:'assembly',basis:'description'},observations:[],photoRegions:[]},textInput)).toThrow('Visible damage requires an image');
    expect(()=>validateAssessment({...assessment(),referenceIds:['invented-manual']},input())).toThrow('Unknown anatomy reference');
  });
  it('requires matching manual edition before showing conditional instructions',()=>{
    const data=run();data.assessment.manualCandidateId='c8-air-filter';data.assessment.hypotheses[0].system='engine';data.assessment.regionId='engine-bay';
    expect(buildDiagnosis(input(),data).repair.manualId).toBe(null);
    const result=buildDiagnosis({...input(),year:'2020'},data);
    expect(result.repair.manualId).toBe('c8-air-filter');expect(result.repair.animationAvailable).toBe(false);
    data.assessment.manualCandidateId=null;expect(buildDiagnosis({...input(),year:'2020'},data).repair.manualId).toBe(null);
  });
  it('keeps the stop-use warning and defaults the demo to the wider photo 2',()=>{expect(buildDiagnosis(input(),run()).urgency).toBe('stop_use');expect(DIAGNOSIS_EXAMPLES[0]).toMatchObject({id:'c8-auction-overview',isDefault:true});expect(DIAGNOSIS_EXAMPLES.every(e=>e.photos.length===1)).toBe(true);});
  it('maps only source groups present in each imported design',()=>{
    for(const [id,regions] of Object.entries(DIAGNOSIS_REGIONS)){
      const gltf=JSON.parse(readFileSync(new URL(`../web/local-assets/${id}/scene.gltf`,import.meta.url)));
      const ids=new Set(gltf.nodes.map(n=>describeGroup(n.name||'',id).id));
      for(const [region] of regions)expect(ids.has(region),`${id}: ${region}`).toBe(true);
    }
  });
});

describe('Live API provenance and failure behavior',()=>{
  it('makes exactly one stronger-model Responses call with medium reasoning and strict output',async()=>{
    const fetchImpl=vi.fn().mockResolvedValueOnce(response(assessment()));
    const data=await requestDiagnosis(input(),{apiKey:'test',fetchImpl});
    expect(data.imageCount).toBe(1);expect(fetchImpl).toHaveBeenCalledTimes(1);
    for(const [url,options] of fetchImpl.mock.calls){
      const body=JSON.parse(options.body);expect(url).toBe('https://api.openai.com/v1/responses');expect(body.model).toBe(DEFAULT_DIAGNOSIS_MODEL);expect(body.reasoning.effort).toBe('medium');expect(body.store).toBe(false);expect(body.text.format.strict).toBe(true);
      expect(body.input[0].content.filter(c=>c.type==='input_image').map(c=>c.image_url)).toEqual([jpeg]);expect(options.body).not.toContain('saved-codex-review');
    }
    expect(JSON.parse(fetchImpl.mock.calls[0][1].body).service_tier).toBe('priority');
  });
  it('uses no image blocks for text-only analysis',async()=>{
    const result={...assessment(),identification:{label:'Starting system',level:'assembly',basis:'description'},damageStatus:'suspected',observations:[{text:'No start is reported.',source:'description',imageIndex:null}],photoRegions:[],regionId:null};
    const fetchImpl=vi.fn().mockResolvedValueOnce(response(result));
    await requestDiagnosis({...input(),images:[]},{apiKey:'test',fetchImpl});
    for(const [,options] of fetchImpl.mock.calls){const body=JSON.parse(options.body);expect(body.input[0].content.filter(c=>c.type==='input_image')).toHaveLength(0);expect(body.instructions).toContain('TEXT ONLY. There is no photo.');expect(body.instructions).toContain('a photo is NEVER required');expect(JSON.parse(body.input[0].content[0].text)).toMatchObject({evidenceMode:'text_only',imageCount:0});}
  });
  it('supplies normal anatomy equally for uploaded and demo photos, without the case answer',async()=>{
    const fetchImpl=vi.fn().mockResolvedValue(response(assessment()));
    await requestDiagnosis({...input(),description:''},{apiKey:'test',fetchImpl});
    await requestDiagnosis({...input(),description:'',images:[],exampleId:'c8-auction-overview'},{apiKey:'test',fetchImpl,readImage:async()=>Buffer.from('/9j/AA==','base64')});
    const contexts=fetchImpl.mock.calls.map(([,o])=>JSON.parse(JSON.parse(o.body).input[0].content[0].text));
    expect(contexts[0]).toEqual(contexts[1]);
    expect(contexts[0].anatomyAndTroubleshootingReferences.some(r=>r.id==='c8-rear-mount-layout')).toBe(true);
    expect(JSON.stringify(contexts)).not.toMatch(/Copart|auction|CorvetteBlogger|protrud/);
  });
  it('returns no assessment on a failed/incomplete call and never exposes provider errors',async()=>{
    const fetchImpl=vi.fn().mockResolvedValueOnce({ok:true,json:async()=>({status:'incomplete',output:[]})});
    await expect(requestDiagnosis(input(),{apiKey:'test',fetchImpl})).rejects.toThrow();
    const result=await request(api({apiKey:'test',analyze:async()=>{throw new Error('private-provider-debug');}})).post('/api/vehicles/diagnose').send(input());
    expect(result.status).toBe(502);expect(result.body.mode).toBeUndefined();expect(JSON.stringify(result.body)).not.toContain('private-provider-debug');
  });
  it('returns real API provenance from the endpoint rather than a saved case',async()=>{
    const result=await request(api({apiKey:'test',analyze:async()=>run()})).post('/api/vehicles/diagnose').send(input());
    expect(result.status).toBe(200);expect(result.body.mode).toBe('live-api');expect(result.body.provenance.passes).toHaveLength(1);
  });
});
