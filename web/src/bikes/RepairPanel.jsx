import React,{useEffect,useRef,useState} from 'react';
import {VEHICLES} from '../../../shared/vehicles.js';
import {DIAGNOSIS_EXAMPLES} from '../../../shared/diagnosis.js';
import './diagnosis.css';

const labels={provisional:'Possible cause · inspection required',needs_inspection:'More inspection needed',needs_evidence:'More evidence needed'};
const basisLabels={image:'From your photo',description:'Based on your description',both:'From your photo and description',none:'More detail needed'};
const findingLabels={visible:'Visible damage',reported:'Reported damage',suspected:'Suspected issue',not_observed:'No visible damage identified',undetermined:'Issue needs clarification'};
const money=value=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(value);
const External=({href,children})=><a href={href} target="_blank" rel="noreferrer">{children} ↗</a>;
async function imageData(file){
  if(!['image/jpeg','image/png','image/webp'].includes(file.type))throw new Error('Choose a JPEG, PNG or WebP photo.');
  if(file.size>25_000_000)throw new Error('The original photo must be under 25 MB.');
  const bitmap=await createImageBitmap(file),scale=Math.min(1,2048/Math.max(bitmap.width,bitmap.height));
  const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));
  canvas.getContext('2d').drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close();
  let data=canvas.toDataURL('image/jpeg',.88);
  if(data.length>2_700_000)data=canvas.toDataURL('image/jpeg',.7);
  if(data.length>2_700_000)throw new Error('That photo is too detailed for the upload limit. Crop to the affected area and try again.');
  return {src:data,label:file.name};
}
function saveDraft(text){const url=URL.createObjectURL(new Blob([text],{type:'text/plain'}));const a=document.createElement('a');a.href=url;a.download='repair-quote-request.txt';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}

export default function RepairPanel({vehicle,ready,onVehicle,onPhase,onCaseStep,children}){
  const [api,setApi]=useState(null);
  const [description,setDescription]=useState(''),[photos,setPhotos]=useState([]),[example,setExample]=useState(null);
  const [busy,setBusy]=useState(false),[loadingPhotos,setLoadingPhotos]=useState(false),[elapsed,setElapsed]=useState(0),[error,setError]=useState('');
  const [result,setResult]=useState(null),[submitted,setSubmitted]=useState(null),[activePhoto,setActivePhoto]=useState(0),[questions,setQuestions]=useState([]);
  const [playing,setPlaying]=useState(false),[tourStep,setTourStep]=useState(0),[draft,setDraft]=useState(null);
  const input=useRef(null),request=useRef(null),root=useRef(null),heading=useRef(null),uploadVersion=useRef(0),pendingExample=useRef(null);
  const actionRef=useRef(onCaseStep);actionRef.current=onCaseStep;
  useEffect(()=>{request.current?.abort();setBusy(false);setResult(null);setSubmitted(null);setExample(pendingExample.current);pendingExample.current=null;setQuestions([]);setPlaying(false);setDraft(null);},[vehicle.id]);
  useEffect(()=>{const c=new AbortController();fetch('/api/vehicles/diagnosis/status',{signal:c.signal}).then(r=>r.ok?r.json():Promise.reject()).then(setApi).catch(e=>{if(e.name!=='AbortError')setApi({configured:false,offline:true});});return()=>{c.abort();request.current?.abort();uploadVersion.current++;};},[]);
  useEffect(()=>{onPhase(result?'results':'intake');heading.current?.focus({preventScroll:true});root.current?.closest('.assembly-inspector')?.scrollTo({top:0});},[result]);
  useEffect(()=>{if(!busy)return;setElapsed(0);const timer=setInterval(()=>setElapsed(s=>s+1),1000);return()=>clearInterval(timer);},[busy]);
  const region=result?.location.regionId;
  useEffect(()=>{if(region&&ready)actionRef.current({groupId:region,spacing:0,mode:'studio'});},[region,ready,result]);
  useEffect(()=>{
    if(!playing||!region||!ready)return;
    const steps=[{spacing:0,mode:'studio'},{spacing:.25,mode:'xray'},{spacing:.4,mode:'studio'}];
    actionRef.current({groupId:region,...steps[tourStep]});
    const timer=setTimeout(()=>{if(tourStep===2){setPlaying(false);}else setTourStep(tourStep+1);},3500);
    return()=>clearTimeout(timer);
  },[playing,tourStep,region,ready]);
  function chooseVehicle(id){
    if(id===vehicle.id)return;
    uploadVersion.current++;setLoadingPhotos(false);setResult(null);setExample(null);setQuestions([]);setPlaying(false);setError('');onVehicle(id);
  }
  async function upload(files){
    const version=++uploadVersion.current,selected=Array.from(files||[]);if(!selected.length)return;
    if(selected.length!==1){setError('Use one photo per diagnosis. Choose a clear photo showing the damaged area and its surroundings.');return;}
    setLoadingPhotos(true);setError('');
    try{const added=await Promise.all(selected.map(imageData));if(version===uploadVersion.current){setPhotos(added);setExample(null);}}
    catch(e){if(version===uploadVersion.current)setError(e.message);}finally{if(version===uploadVersion.current)setLoadingPhotos(false);}
  }
  function loadExample(item){setPhotos([]);setDescription('');setError('');setQuestions([]);if(item.vehicleId!==vehicle.id){pendingExample.current=item;onVehicle(item.vehicleId);}else setExample(item);}
  const evidencePhotos=example?example.photos:photos;
  function edit(){setPlaying(false);setQuestions(result?.questions||[]);setResult(null);setDraft(null);setError('');}
  async function analyze(event){
    event.preventDefault();if(busy||loadingPhotos)return;
    request.current?.abort();const controller=new AbortController();request.current=controller;setBusy(true);setError('');setPlaying(false);
    const evidence={vehicleId:vehicle.id,description:description.trim(),images:photos.map(p=>p.src),exampleId:example?.id||null};
    try{
      const response=await fetch('/api/vehicles/diagnose',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(evidence),signal:controller.signal});
      const data=await response.json();if(!response.ok)throw new Error(data.error||'Analysis unavailable.');
      if(data.mode!=='live-api'||data.vehicleId!==vehicle.id||data.provenance?.passes?.length!==1)throw new Error('The API returned an invalid diagnosis.');
      setSubmitted({...evidence,images:undefined,photos:evidencePhotos,source:example?.source});setActivePhoto(0);setTourStep(0);setResult(data);
    }catch(e){if(e.name!=='AbortError')setError(e.message);}finally{if(request.current===controller)setBusy(false);}
  }
  function makeDraft(provider){
    const text=`To: ${provider.name}\nVehicle: ${vehicle.brand} ${vehicle.name}\nLocation: Cambridge, MA 02139\n\nReported issue: ${submitted.description||'See photographs; no written symptom report.'}\n\nProvisional API assessment (not a confirmed diagnosis): ${result.summary}\n\nRequested work: ${result.repair.requestText}\n\nPlease confirm vehicle acceptance, specialist capability, inspection/diagnostic charges and transport requirements. After inspection, please itemize the proposed work, OEM part numbers, parts, labor hours/rate, taxes, fees, warranty and quote validity. Do not start repairs without my approval.\n\nThis draft has not been sent. Attach photos yourself when contacting the shop.`;
    setDraft(text);
  }
  if(!result)return <section className="diagnosis-flow" ref={root} aria-label="Repair diagnosis intake">
    <div className="diagnosis-kicker"><span className="eyebrow">REPAIR STUDIO</span><span>01 / EVIDENCE</span></div>
    <h2 tabIndex={-1} ref={heading}>Tell us what happened.</h2>
    <p className="diagnosis-intro">Start with your vehicle and the problem. Add a description, one photo, or both. A clear view of the affected area and its surroundings helps identify the component.</p>
    <form onSubmit={analyze}>
      <fieldset disabled={busy||loadingPhotos}>
        <div className="diagnosis-intake-grid">
          <div className="diagnosis-vehicle-column">
            <div className="diagnosis-field"><span className="diagnosis-step">01</span> Which vehicle are you working on?</div>
            <label className="diagnosis-native-label">Make / model<select className="diagnosis-native-vehicle" aria-label="Make or model" value={vehicle.id} onChange={e=>chooseVehicle(e.target.value)}>{Object.values(VEHICLES).map(v=><option key={v.id} value={v.id}>{v.brand} {v.name}</option>)}</select></label>
            <div className="diagnosis-location"><span>⌖</span><div><strong>Cambridge, Massachusetts</strong><small>USA · 02139 · nearby service leads</small></div></div>
          </div>
          <div className="diagnosis-evidence-column">
            <label className="diagnosis-field" htmlFor="diagnosis-description"><span className="diagnosis-step">02</span> What’s wrong?</label>
            {questions.length>0&&<div className="diagnosis-followup"><strong>Add what you know about these questions</strong><ul>{questions.map(q=><li key={q}>{q}</li>)}</ul></div>}
            <textarea id="diagnosis-description" maxLength={6000} rows={6} value={description} onChange={e=>setDescription(e.target.value)} placeholder="What happened? Where is the problem? Does it start? Any noises, leaks, warning lights or recent work? Include exact fault codes or test results if you have them."/>
            <small className="diagnosis-help">No photo required. Tell us the part if you know it, what happened, and any symptoms or test results.</small>
            <div className="diagnosis-photo-label"><strong>Photo of the problem</strong><span>Optional · one photo</span></div>
            <div className="diagnosis-dropzone" onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();if(!busy&&!loadingPhotos)upload(e.dataTransfer.files);}}>
              <button type="button" className="diagnosis-upload-main" onClick={()=>input.current?.click()}><span>＋</span><strong>{evidencePhotos.length?'Replace photo':'Add or drop a photo'}</strong><small>Show the part and where it attaches<br/>JPEG, PNG, WebP · up to 25 MB</small></button>
              <select className="diagnosis-native-demo" aria-label="Try Demo" value={example?.id||''} onChange={e=>loadExample(DIAGNOSIS_EXAMPLES.find(item=>item.id===e.target.value))}><option value="" disabled>Try Demo</option>{DIAGNOSIS_EXAMPLES.map(item=><option key={item.id} value={item.id}>{item.title}{item.isDefault?' (default)':''}</option>)}</select>
            </div>
            <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={e=>{upload(e.target.files);e.target.value='';}}/>
            {evidencePhotos.length>0&&<div className="diagnosis-thumbnails">{evidencePhotos.map((photo,i)=><figure key={photo.src}><img src={photo.src} alt={`Evidence ${i+1}: ${photo.label}`}/><figcaption>{i+1} · {photo.label}</figcaption>{!example&&<button type="button" aria-label={`Remove photo ${i+1}`} onClick={()=>setPhotos(photos.filter((_,n)=>n!==i))}>×</button>}</figure>)}</div>}
            {example?<p className="diagnosis-example-credit">Public photos · <External href={example.source.url}>{example.source.title}</External><button type="button" onClick={()=>setExample(null)}>Remove example</button></p>:null}
          </div>
        </div>
      </fieldset>
      <div className="diagnosis-submit-row"><div><strong>{busy?`Analyzing your evidence · ${elapsed}s`:loadingPhotos?'Preparing photo…':'Live damage analysis'}</strong><small>{api?.configured?`OpenAI API · ${api.model.replace(/-\d{4}-\d{2}-\d{2}$/,'')} · medium reasoning · one pass`:'Live API configuration required'}</small><small>Your evidence is sent to OpenAI when you analyze. No application storage; requests use store:false.</small></div><button type="submit" className="diagnosis-primary" disabled={!api?.configured||busy||loadingPhotos||(!description.trim()&&!evidencePhotos.length)}>{busy?'Analyzing…':'Analyze with OpenAI'} <span>↗</span></button>{busy&&<button type="button" className="diagnosis-text-button" onClick={()=>{request.current?.abort();setBusy(false);}}>Cancel</button>}</div>
      {busy&&<p className="diagnosis-progress" role="status">{elapsed<15?'Analyzing the evidence in one API call. Target: 10–15 seconds.':'The API is taking longer than the target. You can wait or cancel; no diagnosis is substituted.'}</p>}
      {!api?.configured&&<p className="diagnosis-help">{api?.offline?'The API server is offline. Start npm run dev:vehicles.':'Set OPENAI_API_KEY in the server .env and restart npm run dev:vehicles.'}</p>}
      {error&&<p className="repair-error" role="alert">{error}</p>}
    </form>
  </section>;
  const photo=submitted.photos[activePhoto],boxes=result.photoRegions.filter(b=>b.imageIndex===activePhoto);
  return <section className="diagnosis-flow diagnosis-results" ref={root} aria-label="API diagnosis result">
    <div className="diagnosis-kicker"><span className="eyebrow">02 / API ASSESSMENT</span><button onClick={edit}>Edit evidence ↗</button></div>
    <span className={`diagnosis-status ${result.status}`}>{labels[result.status]}</span>
    <h2 ref={heading} tabIndex={-1}>{result.summary}</h2>
    <div className="diagnosis-provenance-line"><span className="status-dot"/>OpenAI API · {result.provenance.model.replace(/-\d{4}-\d{2}-\d{2}$/,'')} · medium reasoning · 1 API call</div>
    <p className="diagnosis-vehicle-summary">{vehicle.brand} {vehicle.name} · {submitted.photos.length?result.provenance.inputMode:'Based on your description'}</p>
    <div className="diagnosis-next-action"><span>START HERE</span><h3>{result.nextAction}</h3></div>
    {result.urgency!=='not_established'&&<div className="diagnosis-urgency"><strong>{result.urgency==='stop_use'?'Keep the vehicle out of service':'Arrange inspection before use'}</strong><p>{result.urgency==='stop_use'?'Ask the receiving shop about safe transport. Do not test-drive the vehicle to reproduce the fault.':'The assessment does not establish that the vehicle is safe to operate.'}</p></div>}
    {photo&&<div className="diagnosis-photo-review"><div className="diagnosis-photo"><img src={photo.src} alt={`Submitted evidence ${activePhoto+1}: ${photo.label}`}/>{boxes.map((box,i)=><span key={i} className="detection-box" title={box.label} style={{left:`${box.bbox[0]*100}%`,top:`${box.bbox[1]*100}%`,width:`${box.bbox[2]*100}%`,height:`${box.bbox[3]*100}%`}}/>)}</div><div className="diagnosis-photo-tabs">{submitted.photos.map((p,i)=><button key={p.src} aria-pressed={i===activePhoto} onClick={()=>setActivePhoto(i)}>{p.label}</button>)}</div>{boxes.length>0&&<small>API region · approximate 2D annotation</small>}{submitted.source&&<External href={submitted.source.url}>{submitted.source.title}</External>}</div>}
    {result.identification.level!=='none'&&<div className="diagnosis-identified"><small>{basisLabels[result.identification.basis]} · {result.identification.level}</small><h3>{result.identification.label}</h3><span>{findingLabels[result.damageStatus]}</span></div>}
    {submitted.description&&<details className="diagnosis-details"><summary>Your description</summary><p className="diagnosis-preserve">{submitted.description}</p></details>}
    <section className="diagnosis-section"><h3>{submitted.photos.length?'Evidence behind this assessment':'What you described'}</h3>{result.observations.length?result.observations.map((o,i)=><div className="diagnosis-observation" key={i}><span>{o.source==='image'?'PHOTO':'YOUR REPORT'}</span><p>{o.text}</p></div>):<p>{result.nextAction}</p>}</section>
    <section className="diagnosis-section"><h3>Possible causes & how to distinguish them</h3>{result.hypotheses.map((h,i)=><article className="diagnosis-hypothesis" key={i}><span>0{i+1} / {h.system.replaceAll('_',' ')}</span><h4>{h.component}</h4><p>{h.reason}</p><strong>Next check</strong><p>{h.check}</p></article>)}{!result.hypotheses.length&&<p>The evidence does not support identifying a failed component.</p>}</section>
    {result.uncertainties.length>0&&<details className="diagnosis-details"><summary>Checks still needed to confirm the cause</summary><ul>{result.uncertainties.map(s=><li key={s}>{s}</li>)}</ul></details>}
    {result.questions.length>0&&<section className="diagnosis-section"><h3>Help narrow it down</h3><ol>{result.questions.map(q=><li key={q}>{q}</li>)}</ol><button className="diagnosis-outline" onClick={edit}>Add these details ↗</button></section>}
    {result.references.length>0&&<details className="diagnosis-details"><summary>Vehicle references used by the API</summary>{result.references.map(reference=><div key={reference.id}><External href={reference.url}>{reference.title}</External><small>{reference.scope}</small></div>)}</details>}
    <section className="diagnosis-section"><div className="diagnosis-section-number">03 / LOCATION</div><h3>{result.location.label||'3D inspection'}</h3><p>{result.location.reason}</p>{region&&<><small>Assembly context from {result.location.basis==='description'?'your report':result.location.basis==='both'?'your photo and report':'your photo'}; not an exact service-part match.</small><button className="diagnosis-outline" disabled={!ready} onClick={()=>{setPlaying(false);onCaseStep({groupId:region,spacing:0,mode:'studio'});}}>Focus this assembly in 3D ⊙</button><button className="diagnosis-outline" disabled={!ready} onClick={()=>{setTourStep(0);setPlaying(!playing);}}>{playing?'Pause inspection':'Play exploded inspection'} {playing?'Ⅱ':'▷'}</button>{playing&&<small role="status">{['Locate the source assembly','See its context in X-ray','Separate the original groups'][tourStep]}</small>}</>}
      <details className="diagnosis-details"><summary>Inspection and repair animation coverage</summary><p>{result.repair.animationReason}</p><small>Exact repair animation is unavailable for this model.</small></details>
    </section>
    <section className="diagnosis-section"><div className="diagnosis-section-number">04 / REPAIR PATH</div>{result.repairApproach&&<><h3>Repair approach if confirmed</h3><p>{result.repairApproach}</p></>}<h4>What to ask a repair shop</h4><p>{result.repair.requestText}</p>
      {result.repair.reference&&<details className="diagnosis-details"><summary>Relevant manual reference · conditional</summary><p>{result.repair.compatibility}</p><p>Confirm the fault and exact vehicle before following this procedure.</p><External href={`${result.repair.reference.url}#page=${result.repair.reference.page}`}>{result.repair.reference.title}</External><ol>{result.repair.steps.map(([title,body])=><li key={title}><strong>{title}</strong> — {body}</li>)}</ol><h4>Tools in the documented procedure</h4>{result.repair.tools.map(t=><p key={t.name}><strong>{t.name}</strong> · {t.note}</p>)}</details>}
      {result.repair.structuralReference&&<details className="diagnosis-details"><summary>C8 structural repair reference & equipment</summary><p>{result.repair.structuralReference.scope}</p><External href={result.repair.structuralReference.url}>{result.repair.structuralReference.title}</External><ul>{result.repair.structuralReference.tools.map(t=><li key={t}>{t}</li>)}</ul></details>}
    </section>
    <section className="diagnosis-section"><h3>Nearby shops & quote requests</h3><small>Cambridge, MA · 02139 · Greater Boston leads</small>{result.providers.map(provider=><article className="diagnosis-provider" key={provider.id}><h4>{provider.name}</h4><p>{provider.location} · <a href={`tel:${provider.phone}`}>{provider.phone}</a></p><p>{provider.note}</p><span className="diagnosis-quote-status">Itemized quote available on request · not yet requested</span>{provider.rates.length>0&&<p className="diagnosis-rate">Published standard labor: <strong>{money(provider.rates[0].amountUsd)} / {provider.rates[0].unit}</strong><small>A rate, not a quote for this repair. Hours, parts, fees and tax are unpriced.</small></p>}<div className="diagnosis-provider-actions"><External href={provider.url}>Provider & rates</External><button onClick={()=>makeDraft(provider)}>Prepare quote request ↗</button></div></article>)}<small>{result.pricingNotice}</small>{draft!==null&&<div className="diagnosis-draft"><label>Unsent quote request<textarea aria-label="Unsent quote request" value={draft} onChange={e=>setDraft(e.target.value)}/></label><button className="diagnosis-outline" onClick={()=>saveDraft(draft)}>Download request ↓</button><button className="diagnosis-text-button" onClick={()=>setDraft(null)}>Close</button></div>}</section>
    <details className="diagnosis-details"><summary>API provenance & limitations</summary><p>Findings come from one live API call using your submitted evidence and the listed vehicle references. Reference notes describe normal anatomy and troubleshooting; no saved demo diagnosis is used.</p><small>{result.provenance.createdAt} · {result.provenance.durationMs?`${Math.round(result.provenance.durationMs/1000)}s · `:''}{result.provenance.imageCount} photo{result.provenance.imageCount===1?'':'s'} · store:false</small><small>Medium reasoning · processing tier: {result.provenance.serviceTier}</small>{result.provenance.passes.map(pass=><p key={pass.purpose}><strong>{pass.purpose}</strong><br/>{pass.model}<br/><code>{pass.responseId}</code></p>)}<p>This is a single API assessment, not a confirmed mechanical diagnosis. Exact service procedures, target meshes and a technician-confirmed fault are required before a repair animation can be trusted.</p></details>
    <details className="diagnosis-details"><summary>Inspect original source meshes</summary>{children}</details>
    <button className="diagnosis-outline" onClick={edit}>Return to intake</button>
  </section>;
}
