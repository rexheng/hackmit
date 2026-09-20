import React from 'react';

export default function SourceParts({vehicle, parts, selected, viewer, ready, onGroup, onEngine, onMesh, onSpread, onFocus, onIsolate, onIsolateMesh, onPreview}) {
  const mesh = selected?.meshes.find(m => m.id === viewer.selectedMesh);
  return <section className="repair-source-parts" aria-label="Original model parts">
    <div className="eyebrow">SAME VEHICLE · SAME SOURCE MESHES</div>
    <h3>Inspect the actual design</h3>
    <p>Every piece here belongs to the imported model. Separate its mesh surfaces to see what is actually modeled.</p>
    <button className="repair-primary" disabled={!ready} onClick={onEngine}>Inspect engine meshes <span>↗</span></button>
    <label className="section-label" htmlFor="repair-source-group">SOURCE ASSEMBLY</label>
    <select id="repair-source-group" value={selected?.id || ''} disabled={!ready} onChange={e => onGroup(e.target.value)}>
      <option value="" disabled>Choose a source assembly</option>
      {parts.map(part => <option key={part.id} value={part.id}>{part.name} · {part.meshCount} meshes</option>)}
    </select>
    {selected && <>
      <div className="source-provenance"><strong>{selected.name}</strong><code>{selected.sourceName}</code><small>{selected.meshCount} source meshes · {selected.triangles.toLocaleString()} triangles</small></div>
      <div className="assembly-actions"><button onClick={onFocus}>Focus</button><button onClick={onIsolate} aria-pressed={viewer.isolated}>{viewer.isolated?'Exit assembly isolation':'Isolate assembly'}</button></div>
      <div className="assembly-control"><label htmlFor="source-mesh-spacing">Separate source meshes <span>{Math.round((viewer.detailSpacing || 0)*100)}%</span></label><input id="source-mesh-spacing" aria-label="Separate source meshes" type="range" min="0" max="1" step=".01" disabled={selected.meshCount<2} value={viewer.detailSpacing || 0} onChange={e=>onSpread(Number(e.target.value))}/><small>Inspection spacing only. Mesh boundaries and movement do not establish a physical disassembly sequence.</small></div>
      <div className="source-mesh-list" aria-label="Meshes in selected assembly">{selected.meshes.map(item => <button key={item.id} aria-pressed={viewer.selectedMesh===item.id} className={viewer.selectedMesh===item.id?'active':''} onClick={()=>onMesh(item.id)}><span>{String(item.index).padStart(2,'0')}</span><div><strong>{item.materials.join(' / ').replaceAll('_',' ')}</strong><small>{item.sourceNode} · {item.triangles.toLocaleString()} triangles</small></div></button>)}</div>
      {mesh && <div className="source-mesh-actions"><code>{mesh.id}</code><div className="assembly-actions"><button onClick={onIsolateMesh} aria-pressed={viewer.meshIsolated}>{viewer.meshIsolated?'Show assembly meshes':'Isolate this mesh'}</button><button onClick={onPreview}>{viewer.playing?'Stop separation preview':'Preview this mesh'}</button></div></div>}
    </>}
    <details className="source-engine-coverage"><summary>What can this model show?</summary><p>{vehicle.coverage}</p></details>
  </section>;
}
