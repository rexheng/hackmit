// Explicitly invoked, paid live smoke evaluation. No private/user evidence is used.
// Expected outcomes stay here; they are never supplied in API requests.
import 'dotenv/config';
import {writeFile} from 'node:fs/promises';
import {deflateSync} from 'node:zlib';
import {diagnosisRequestSchema,requestDiagnosis,buildDiagnosis,DEFAULT_DIAGNOSIS_MODEL} from '../server/routes/vehicle-diagnosis.js';

// A real, blank 128px PNG exercises unusable-image handling without a network fixture.
function blankImage(){
  const crc=buffer=>{let value=0xffffffff;for(const byte of buffer){value^=byte;for(let i=0;i<8;i++)value=value&1?0xedb88320^(value>>>1):value>>>1;}return(value^0xffffffff)>>>0;};
  const chunk=(name,data)=>{const type=Buffer.from(name),out=Buffer.alloc(data.length+12);out.writeUInt32BE(data.length);type.copy(out,4);data.copy(out,8);out.writeUInt32BE(crc(Buffer.concat([type,data])),data.length+8);return out;};
  const header=Buffer.alloc(13);header.writeUInt32BE(128);header.writeUInt32BE(128,4);header[8]=8;header[9]=2;
  const pixels=Buffer.alloc(128*(128*3+1),255);for(let y=0;y<128;y++)pixels[y*(128*3+1)]=0;
  return 'data:image/png;base64,'+Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',header),chunk('IDAT',deflateSync(pixels)),chunk('IEND',Buffer.alloc(0))]).toString('base64');
}
const suspension=result=>result.location.regionId==='suspension'&&result.hypotheses.some(h=>h.system==='suspension'&&/shock|damper/i.test(h.component))&&result.urgency==='stop_use';
const cases=[
  // Source report for the two photos: DIAGNOSIS_EXAMPLES source link in shared/diagnosis.js.
  {id:'c8-photo2',input:{vehicleId:'corvette-c8',exampleId:'c8-auction-overview'},check:suspension},
  {id:'c8-photo1',input:{vehicleId:'corvette-c8',exampleId:'c8-auction-closeup'},check:suspension},
  {id:'yamaha-reported-lever',input:{vehicleId:'yzf-2021',description:'The front brake lever snapped off when the bike fell over while parked. There is no brake fluid leaking. I have not ridden it. What needs fixing?'},check:r=>r.identification.basis==='description'&&r.damageStatus==='reported'&&r.location.regionId==='handlebars'&&r.urgency==='stop_use'},
  {id:'honda-no-start',input:{vehicleId:'honda-cbr650r',description:'My motorcycle will not start. What should I check first?'},check:r=>r.identification.basis==='description'&&r.repair.manualId===null&&r.questions.length>0&&r.damageStatus!=='visible'},
  {id:'c8-reported-mount',input:{vehicleId:'corvette-c8',description:'The rear shock has come up through its upper mount in the engine bay after a pothole impact. The mount is visibly broken. I am describing the damage, not uploading a photo.'},check:r=>suspension(r)&&r.damageStatus==='reported'&&r.identification.basis==='description'},
  {id:'blank-photo',input:{vehicleId:'corvette-c8',images:[blankImage()]},check:r=>r.hypotheses.length===0&&r.location.regionId===null&&r.repair.manualId===null},
];
const model=process.env.OPENAI_DIAGNOSIS_MODEL||DEFAULT_DIAGNOSIS_MODEL;
if(!process.env.OPENAI_API_KEY)throw new Error('Configure OPENAI_API_KEY before explicitly running this paid evaluation.');
const caseIndex=process.argv.indexOf('--case'),caseId=caseIndex<0?null:process.argv[caseIndex+1];
const selected=caseId?cases.filter(c=>c.id===caseId):cases;
if(!selected.length)throw new Error('Unknown evaluation case.');
const results=[];
for(const test of selected){
  try{
    const input=diagnosisRequestSchema.parse(test.input),run=await requestDiagnosis(input,{apiKey:process.env.OPENAI_API_KEY,model});
    const result=buildDiagnosis(input,run),textOnly=!input.images.length&&!input.exampleId;
    const outputText=JSON.stringify([result.summary,result.nextAction,result.repairApproach,result.questions,result.uncertainties,result.hypotheses]);
    const noPhotoDemands=!textOnly||!/(upload|send|provide|take|attach|replace|need|required?|show|share).{0,35}(photo|image|picture)/i.test(outputText);
    const modalitiesCorrect=!textOnly||(run.imageCount===0&&result.photoRegions.length===0&&result.observations.every(o=>o.source==='description'&&o.imageIndex===null));
    const passed=test.check(result)&&noPhotoDemands&&modalitiesCorrect&&!result.repair.animationAvailable;
    results.push({id:test.id,passed,noPhotoDemands,modalitiesCorrect,durationMs:run.durationMs,usage:run.usage,result});
    console.log(`${passed?'PASS':'FAIL'} ${test.id} · ${(run.durationMs/1000).toFixed(1)}s · ${result.summary}`);
  }catch(error){results.push({id:test.id,passed:false,error:error.message});console.log(`FAIL ${test.id} · ${error.message}`);}
}
const output=process.env.DIAGNOSIS_EVAL_OUTPUT||'/tmp/vehicle-diagnosis-evaluation.json';
await writeFile(output,JSON.stringify({model,ranAt:new Date().toISOString(),scope:'Six public/synthetic smoke cases; not a calibrated accuracy benchmark.',results},null,2));
console.log(`${results.filter(r=>r.passed).length}/${results.length} smoke cases passed. Full report: ${output}`);
if(results.some(r=>!r.passed))process.exitCode=1;
