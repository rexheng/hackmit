import React, {useEffect, useRef, useState} from 'react';
import BikeSwitcher from './BikeSwitcher.jsx';
import {loadVehicle, disposeYZF} from './yzf-model.js';
import {createAssemblyScene} from './assembly-scene.js';
import {validateModelDetection} from './detection.js';
import {VEHICLES} from '../../../shared/vehicles.js';
import RepairPanel from './RepairPanel.jsx';
import SourceParts from './SourceParts.jsx';
import SupplierPanel from './SupplierPanel.jsx';
import {sourcePartDescriptor} from './source-parts.js';
import '../fz6/fz6.css';
import './bikes.css';
import './suppliers.css';

const initialState = {selected:null,selectedMesh:null,detailSpacing:0,meshIsolated:false,hidden:[],isolated:false,playing:false,spacing:0};
function download(href,name) {const a=document.createElement('a');a.href=href;a.download=name;a.click();}

export default function VehicleViewer({vehicle:initialVehicle=VEHICLES['yzf-2021']}) {
  const [vehicle,setVehicle]=useState(initialVehicle),[repairPhase,setRepairPhase]=useState('intake');
  const host=useRef(null),engine=useRef(null),detectionInput=useRef(null);
  const [parts,setParts]=useState([]),[stats,setStats]=useState(null),[error,setError]=useState('');
  const [viewer,setViewer]=useState(initialState),[mode,setMode]=useState('studio'),[orbit,setOrbit]=useState(false);
  const [category,setCategory]=useState('All'),[search,setSearch]=useState(''),[tab,setTab]=useState(()=>{
    const requested=new URLSearchParams(location.search).get('tab');return ['repair','suppliers'].includes(requested)?requested:'inspect';
  });
  const [detection,setDetection]=useState(null),[notice,setNotice]=useState('');
  const selected=parts.find(p=>p.id===viewer.selected),ready=!!stats,source=vehicle.source;
  useEffect(()=>{const url=new URL(location.href);url.pathname=`/vehicles/${vehicle.id}`;if(tab==='inspect')url.searchParams.delete('tab');else url.searchParams.set('tab',tab);history.replaceState(null,'',url);},[tab,vehicle.id]);
  useEffect(()=>{
    document.title=`${source.title} / Motion Lab`;
    let disposed=false;setStats(null);setParts([]);setViewer(initialState);setError('');setMode('studio');setOrbit(false);
    loadVehicle(vehicle.id).then(model=>{
      if(disposed)return disposeYZF(model);
      try {
        engine.current=createAssemblyScene(host.current,model,{onState:setViewer});
        setParts([...model.groups.values()].map(sourcePartDescriptor));
        setStats({meshes:model.meshes.length,triangles:model.triangles,groups:model.groups.size});
      }catch(e){disposeYZF(model);setError(`The viewer could not start: ${e.message}`);}
    }).catch(e=>{if(!disposed)setError(`The model could not be loaded: ${e.message}`);});
    return()=>{disposed=true;engine.current?.dispose();engine.current=null;};
  },[vehicle.id]);
  useEffect(()=>{if(!notice)return;const id=setTimeout(()=>setNotice(''),4500);return()=>clearTimeout(id);},[notice]);
  function applyDetection(payload) {
    const valid=validateModelDetection(payload,parts,vehicle.id);setDetection(valid);setTab('inspect');engine.current?.select(valid.partId,true);return {ok:true,...valid};
  }
  useEffect(()=>{
    if(!ready)return;
    const api={modelId:vehicle.id,getParts:()=>parts.map(p=>({...p,materialNames:[...p.materialNames],verified:false})),selectPart:id=>engine.current?.select(id,true),applyDetection,previewSeparation:()=>engine.current?.preview(),getState:()=>engine.current?.getState()};
    window.vehicleViewer=window.motorcycleViewer=api;
    const listener=e=>{try{applyDetection(e.detail);}catch(error){setNotice(error.message);}};
    window.addEventListener('motorcycle:detection',listener);
    return()=>{if(window.vehicleViewer===api)delete window.vehicleViewer;if(window.motorcycleViewer===api)delete window.motorcycleViewer;window.removeEventListener('motorcycle:detection',listener);};
  },[ready,parts,vehicle.id]);
  const visibleParts=parts.filter(p=>(category==='All'||p.category===category)&&`${p.name} ${p.id} ${p.sourceName} ${p.materialNames.join(' ')}`.toLowerCase().includes(search.toLowerCase())).sort((a,b)=>(a.category==='Other')-(b.category==='Other')||a.name.localeCompare(b.name));
  function reset(){engine.current?.reset();setOrbit(false);setDetection(null);}
  function exportMap(){const url=URL.createObjectURL(new Blob([JSON.stringify({modelId:vehicle.id,source,coverage:vehicle.coverage,parts},null,2)],{type:'application/json'}));download(url,`${vehicle.id}-components.json`);setTimeout(()=>URL.revokeObjectURL(url),1000);}
  async function importDetection(event){const file=event.target.files?.[0];if(!file)return;try{applyDetection(JSON.parse(await file.text()));setNotice('Detection mapped to the selected source group.');}catch(e){setNotice(e.message);}event.target.value='';}
  function inspectEngine(){
    if(!ready)return;
    engine.current.showAll();engine.current.setDetailSpacing(0);engine.current.setSpacing(0);engine.current.select(vehicle.engineGroup);
    engine.current.isolate();engine.current.focus();engine.current.setOrbit(false);setOrbit(false);
  }
  function focusCaseStep(step){
    if(!ready)return;
    engine.current.showAll();engine.current.setDetailSpacing(0);engine.current.setSpacing(step.spacing);
    engine.current.select(step.groupId,true);
    engine.current.setMode(step.mode);setMode(step.mode);engine.current.setOrbit(false);setOrbit(false);
  }
  const sourceControls = <SourceParts vehicle={vehicle} parts={parts} selected={selected} viewer={viewer} ready={ready}
    onEngine={inspectEngine} onGroup={id=>engine.current?.select(id,true)} onMesh={id=>engine.current?.selectMesh(id)}
    onSpread={amount=>engine.current?.setDetailSpacing(amount)} onFocus={()=>engine.current?.focus()}
    onIsolate={()=>engine.current?.isolate()} onIsolateMesh={()=>engine.current?.isolateMesh()} onPreview={()=>engine.current?.preview()}/>;
  return <div className={`motion-lab assembly-lab ${tab==='repair'?`repair-${repairPhase}`:''}`}>
    <header className="lab-header"><a className="lab-brand" href="/vehicles/yzf-2021"><span className="brand-symbol">◇</span><span>MOTION<span className="brand-light"> / LAB</span></span></a><div className="header-center"><span className="status-dot"/>VEHICLE INSPECTION STUDIO</div><BikeSwitcher value={vehicle.id} onChange={id=>{setVehicle(VEHICLES[id]);setRepairPhase('intake');}}/></header>
    <main className="assembly-workspace">
      <section className="assembly-stage" aria-label="Vehicle viewer">
        <div className="canvas-host" ref={host} aria-label={`Interactive ${source.title}. Drag to orbit, scroll to zoom and click a component.`}/>
        <div className="model-heading"><div className="eyebrow">{vehicle.brand.toUpperCase()} <span>/</span> {vehicle.edition.toUpperCase()}</div><h1>{vehicle.name}<span>{tab==='repair'?'DIAGNOSIS / ASSEMBLY CONTEXT':'IMPORTED ASSEMBLY'}</span></h1><p>{tab==='repair'?'Approximate assembly context. Drag to explore.':'Inspect the assembly. Understand the repair.'}</p></div>
        <div className="scene-status"><span className="status-dot"/>{ready?'LIVE 3D':'LOADING MODEL'}<span className="scene-status-note">{ready?`${stats.meshes} SOURCE MESHES`:'GEOMETRY + TEXTURES'}</span></div>
        {!ready&&!error&&<div className="assembly-loading" role="status">Loading {source.title} · {vehicle.transfer} compressed transfer…</div>}
        {error&&<div className="assembly-placeholder" role="alert"><h2>Model unavailable</h2><p>{error}</p><button onClick={()=>location.reload()}>Reload viewer</button></div>}
        <div className="vertical-tools"><button title="Reset view" aria-label="Reset view" disabled={!ready} onClick={reset}>↺</button><button title="Focus selected group" aria-label="Focus selected group" disabled={!selected} onClick={()=>engine.current?.focus()}>⊙</button><button title="Auto rotate" aria-label="Auto rotate" aria-pressed={orbit} disabled={!ready} className={orbit?'active':''} onClick={()=>{setOrbit(!orbit);engine.current?.setOrbit(!orbit);}}>↻</button><span/><button title="Save image" aria-label="Save image" disabled={!ready} onClick={()=>download(engine.current.capture(),`${vehicle.id}.png`)}>↓</button></div>

        <div className="assembly-caption">{selected?<><span className="status-dot"/>{selected.name} <span className="assembly-caption-id">{viewer.selectedMesh || selected.id}</span></>:'Select a surface to inspect its source group.'}</div>
        <div className="viewport-bottom"><div className="view-presets">{[['hero','Perspective'],['side','Side'],['front','Front'],['rear','Rear'],['top','Top']].map(([id,name])=><button key={id} disabled={!ready} onClick={()=>engine.current?.view(id)}>{name}</button>)}</div><div className="interaction-hint">Drag to orbit <i/> Scroll to zoom <i/> Click to select</div></div>
      </section>
      <aside className="assembly-inspector">
        <div className="workspace-tabs" role="tablist" aria-label="Workspace"><button role="tab" aria-selected={tab==='inspect'} className={tab==='inspect'?'active':''} onClick={()=>setTab('inspect')}>01 / Inspect</button><button role="tab" aria-selected={tab==='repair'} className={tab==='repair'?'active':''} onClick={()=>setTab('repair')}>02 / Repair studio</button><button role="tab" aria-selected={tab==='suppliers'} className={tab==='suppliers'?'active':''} onClick={()=>setTab('suppliers')}>03 / Suppliers</button></div>
        {(tab==='inspect'||tab==='repair'&&repairPhase==='results')&&<details className={`scene-controls ${tab==='inspect'?'inspecting':''}`} open={tab==='inspect'}><summary>3D view controls</summary><div className="assembly-stats"><div><strong>{stats?.groups??'—'}</strong><small>SOURCE GROUPS</small></div><div><strong>{stats?(stats.triangles/1000).toFixed(1)+'k':'—'}</strong><small>TRIANGLES</small></div></div>
        <label className="section-label">RENDER MODE</label><div className="mode-switch">{[['studio','Studio'],['xray','X-ray'],['wireframe','Mesh']].map(([id,title])=><button key={id} disabled={!ready} aria-pressed={mode===id} className={mode===id?'active':''} onClick={()=>{setMode(id);engine.current?.setMode(id);}}>{title}</button>)}</div>
        <div className="assembly-control"><label htmlFor="assembly-spacing">Exploded view <span>{Math.round(viewer.spacing*100)}%</span></label><input id="assembly-spacing" aria-label="Exploded view" type="range" min="0" max="1" step="0.01" disabled={!ready} value={viewer.spacing} onChange={e=>engine.current?.setSpacing(Number(e.target.value))}/><div className="assembly-actions"><button disabled={!ready} onClick={()=>engine.current?.hideBodywork()}>Hide bodywork</button><button disabled={!ready} onClick={()=>engine.current?.showAll()}>Show all{viewer.hidden.length?` · ${viewer.hidden.length} hidden`:''}</button></div></div>
        </details>}{tab==='suppliers'?<SupplierPanel vehicle={vehicle}/>:tab==='repair'?<RepairPanel onPhase={setRepairPhase} onVehicle={id=>setVehicle(VEHICLES[id])} onCaseStep={focusCaseStep} ready={ready} vehicle={vehicle}>{sourceControls}</RepairPanel>:<>
          {selected&&<div className="assembly-picked"><div className="eyebrow">SELECTED SOURCE GROUP</div><h3>{selected.name}</h3><code>{selected.id}</code><p>{selected.meshCount} meshes · {selected.triangles.toLocaleString()} triangles</p><div className="assembly-actions"><button onClick={()=>engine.current?.focus()}>Focus</button><button className={viewer.isolated?'active':''} aria-pressed={viewer.isolated} onClick={()=>engine.current?.isolate()}>{viewer.isolated?'Exit isolation':'Isolate'}</button><button onClick={()=>engine.current?.hideSelected()}>Hide</button><button onClick={()=>engine.current?.preview()}>{viewer.playing?'Stop preview':'Preview separation'}</button></div></div>}
          <div className="assembly-filters">{['All',...new Set(parts.map(p=>p.category))].map(item=><button key={item} aria-pressed={category===item} className={category===item?'active':''} onClick={()=>setCategory(item)}>{item}</button>)}</div><input className="assembly-search" aria-label="Search components" placeholder="Find a component or source name…" value={search} onChange={e=>setSearch(e.target.value)}/>
          <div className="assembly-piece-list">{visibleParts.map(part=><button key={part.id} className={`assembly-piece ${viewer.selected===part.id?'selected':''}`} aria-pressed={viewer.selected===part.id} onClick={()=>engine.current?.select(part.id)}><strong>{part.name}{viewer.hidden.includes(part.id)?' · hidden':''}</strong><small>{part.meshCount} meshes · {part.sourceName}</small></button>)}{ready&&!visibleParts.length&&<div className="assembly-empty">No matching source groups.</div>}</div>
          <details className="assembly-json"><summary>External CV integration</summary><p>Import a detection mapped to this vehicle’s source groups.</p><input type="file" ref={detectionInput} hidden accept="application/json,.json" onChange={importDetection}/><div className="assembly-actions"><button disabled={!ready} onClick={()=>detectionInput.current?.click()}>Import detection JSON</button><button disabled={!ready} onClick={exportMap}>Export part IDs</button></div><pre>{JSON.stringify({modelId:vehicle.id,partId:parts[0]?.id||'source-group',confidence:.94,bbox:[.2,.2,.4,.4]},null,2)}</pre>{detection&&<p>Mapped: {detection.partId}</p>}</details>
        </>}
        <details className="assembly-source-details"><summary>Source, compression & coverage</summary><p>{vehicle.coverage}</p><p>{stats?.meshes??'—'} meshes in {stats?.groups??'—'} groups. These are source groups, not a complete inventory of physical parts. X-ray reveals existing surfaces only.</p><p>Lossless compression: {vehicle.original} source → {vehicle.transfer} web transfer. Every triangle and original texture retained.</p><a href={source.url} target="_blank" rel="noreferrer">“{source.title}” by {source.author} ↗</a><a href={source.licenseUrl} target="_blank" rel="noreferrer">{source.license} · license terms ↗</a><a href={`/models/${vehicle.id}/audit.json`} target="_blank" rel="noreferrer">Compression audit ↗</a><button onClick={exportMap} disabled={!ready}>Export component map ↓</button></details>
      </aside>
    </main>
    <footer className="assembly-footer"><span>“{source.title}” by <a href={source.url} target="_blank" rel="noreferrer">{source.author}</a> · <a href={source.licenseUrl} target="_blank" rel="noreferrer">{source.license}</a></span><span>Source mesh inspection · internal completeness unverified</span></footer>
    {notice&&<div className="toast" role="status">{notice}</div>}
  </div>;
}
