import React,{useEffect,useRef,useState} from 'react';
import DamageCase from './DamageCase.jsx';
import {casesForVehicle} from '../../../shared/damage-cases.js';
import {repairGeometryStatus} from '../../../shared/repairs.js';

async function imageData(file) {
  if(!['image/jpeg','image/png','image/webp'].includes(file.type)) throw new Error('Choose a JPEG, PNG or WebP photo.');
  if(file.size>25_000_000) throw new Error('Choose a photo under 25 MB.');
  const bitmap=await createImageBitmap(file);
  const scale=Math.min(1,1600/Math.max(bitmap.width,bitmap.height));
  const canvas=document.createElement('canvas');canvas.width=Math.round(bitmap.width*scale);canvas.height=Math.round(bitmap.height*scale);
  canvas.getContext('2d').drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close();
  return canvas.toDataURL('image/jpeg',.88);
}

export default function RepairPanel({vehicle,recipe,ready,onMap,onCaseStep,children}) {
  const [api,setApi]=useState(null),[photo,setPhoto]=useState(null),[busy,setBusy]=useState(false),[result,setResult]=useState(null),[error,setError]=useState('');
  const [confirmed,setConfirmed]=useState(false);
  const input=useRef(null),request=useRef(null),uploadVersion=useRef(0),reference=useRef(null);
  const [step,setStep]=useState(0);
  useEffect(()=>{const controller=new AbortController();fetch('/api/vehicles/status',{signal:controller.signal}).then(r=>r.ok?r.json():Promise.reject()).then(setApi).catch(()=>setApi({configured:false,offline:true}));return()=>{controller.abort();request.current?.abort();};},[]);
  async function upload(event) {
    const file=event.target.files?.[0];event.target.value='';if(!file)return;
    const version=++uploadVersion.current;request.current?.abort();setBusy(false);setError('');setResult(null);
    try {const data=await imageData(file);if(version===uploadVersion.current)setPhoto(data);}catch(e){setError(e.message);}
  }
  async function analyze() {
    request.current?.abort();const controller=new AbortController();request.current=controller;setBusy(true);setError('');setResult(null);
    try {
      const response=await fetch('/api/vehicles/analyze',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({vehicleId:vehicle.id,image:photo}),signal:controller.signal});
      const data=await response.json();if(!response.ok)throw new Error(data.error||'Inspection unavailable.');
      setResult(data);if(data.regionId)onMap(data.regionId);
    }catch(e){if(e.name!=='AbortError')setError(e.message);}finally{if(request.current===controller)setBusy(false);}
  }
  const coverage=repairGeometryStatus(recipe);
  return <div className="repair-panel">
    {casesForVehicle(vehicle.id).map(example=><DamageCase key={example.id} example={example} ready={ready} configured={api?.configured} onStep={onCaseStep}/>)}
    {children}
    <div className="repair-heading"><span className="eyebrow">MANUAL REFERENCE</span><h3>{recipe.name}</h3><p>{recipe.purpose}</p><span className="repair-rating">{recipe.rating}</span></div>
    <div className="repair-document-state" role="status"><span className="eyebrow">TARGET GEOMETRY NOT MAPPED</span><h4>Repair animation unavailable</h4><p>These components are not individually identified in this design: {coverage.missingGeometry.join(', ')}.</p><small>The model above remains the original assembly. Source-mesh inspection does not simulate this repair.</small></div>
    <details className="repair-evidence"><summary>Manual & vehicle compatibility</summary><p>{recipe.compatibility}</p><a href={`${recipe.source.url}#page=${recipe.source.page}`} target="_blank" rel="noreferrer">{recipe.source.title} · pp. {recipe.source.pages} ↗</a><small>{recipe.source.publisher}. A manual reference does not verify the imported model’s individual parts.</small></details>
    <details className="repair-reference" ref={reference}><summary>Read documented steps</summary>
      <ol className="repair-steps">{recipe.steps.map(([title,body],i)=><li key={title} className={step===i?'current':''}><button aria-current={step===i?'step':undefined} onClick={()=>setStep(i)}><span>{String(i+1).padStart(2,'0')}</span>{title}</button>{step===i&&<p>{body}</p>}</li>)}</ol>
      <small>Reference text only. No unmodeled parts or tool paths are substituted into the scene.</small>
    </details>
    <details className="repair-tools" open><summary>Tools & replacement part</summary>{recipe.tools.map(tool=><div key={tool.name}><span>{tool.kind==='driver'?'↗':tool.kind==='puller'?'⋂':'▣'}</span><p><strong>{tool.name}</strong><small>{tool.note}</small></p></div>)}</details>
    <div className="repair-photo"><div className="eyebrow">YOUR PHOTO → OPENAI → REPAIR CANDIDATE</div><p>Photograph the exposed target part and its marking. Analysis can suggest this manual reference; it cannot add missing geometry or establish a hidden fault.</p>
      <button className="image-upload" aria-label="Upload damage photo" disabled={busy} onClick={()=>input.current?.click()}>{photo?<><img src={photo} alt="Uploaded damage area"/>{result?.bbox&&<span className="detection-box" style={{left:`${result.bbox[0]*100}%`,top:`${result.bbox[1]*100}%`,width:`${result.bbox[2]*100}%`,height:`${result.bbox[3]*100}%`}}/>}</>:<><span>＋ Add damage photo</span><small>JPEG, PNG or WebP</small></>}</button>
      <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={upload}/>
      <label className="repair-confirm"><input type="checkbox" checked={confirmed} onChange={e=>setConfirmed(e.target.checked)}/><span>I checked that the actual vehicle and component match the cited manual.</span></label>
      <button className="repair-primary secondary" disabled={!photo||busy||!confirmed||!api?.configured} onClick={analyze}>{busy?'Inspecting photo…':'Analyze with OpenAI'} <span>↗</span></button>
      <small className="repair-api-status">{api?.configured?`Live API ready · ${api.model}. Photo is sent to OpenAI only when you analyze it.`:api?.offline?'Vision server offline. Start npm run dev:vehicles.':'Live API needs OPENAI_API_KEY on the server. Source-mesh inspection works without a key.'}</small>
      {error&&<p className="repair-error" role="alert">{error}</p>}
      {result&&<div className="repair-result" role="status"><span className="eyebrow">{result.status==='candidate'?'CANDIDATE · INSPECTION REQUIRED':result.status.replaceAll('_',' ').toUpperCase()}</span><p>{result.observations}</p><p>{result.nextCheck}</p><small>{Math.round(result.confidence*100)}% identification confidence · location is approximate.</small>{result.repairId&&<button className="repair-primary" onClick={()=>{reference.current.open=true;reference.current.scrollIntoView({behavior:'smooth',block:'nearest'});}}>Read linked manual steps ↗</button>}</div>}
    </div>
  </div>;
}
