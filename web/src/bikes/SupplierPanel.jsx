import React,{useState} from 'react';
import {DESTINATION,VENDORS,PART_OFFERS,VENDOR_RESEARCH_DATE,vehicleCategory,directorySnapshot,estimateShipping,estimateLabor,quoteRequestDraft} from '../../../shared/vendors.js';
const money=value=>value==null?'Quote needed':new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(value);
function save(text,name,type='text/plain'){
  const url=URL.createObjectURL(new Blob([text],{type})),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
const External=({href,children})=><a href={href} target="_blank" rel="noreferrer">{children} ↗</a>;
export default function SupplierPanel({vehicle}){
  const [scope,setScope]=useState(vehicleCategory(vehicle.id)),[condition,setCondition]=useState('all'),[view,setView]=useState('parts');
  const [subtotal,setSubtotal]=useState('50'),[eligible,setEligible]=useState(false),[hours,setHours]=useState('1'),[work,setWork]=useState(''),[draft,setDraft]=useState(null);
  const amount=Number(subtotal),validAmount=subtotal.trim()!==''&&Number.isFinite(amount)&&amount>=0&&amount<=1_000_000;
  const laborHours=Number(hours),validHours=hours.trim()!==''&&Number.isFinite(laborHours)&&laborHours>0&&laborHours<=100;
  const records=VENDORS.filter(v=>(scope==='all'||v.category===scope)&&(view==='service'?v.kind==='service':v.kind!=='service')&&(view==='service'||condition==='all'||v.condition.includes(condition)));
  return <section className="supplier-panel" aria-label="Parts vendors and service estimates">
    <div className="eyebrow">SOURCED DIRECTORY · {DESTINATION.postalCode}</div>
    <h3>Find parts. Price the work.</h3>
    <p>Cambridge, MA · USA. Public listings checked {VENDOR_RESEARCH_DATE}; prices and stock need reconfirmation.</p>
    <div className="supplier-summary"><span><strong>{VENDORS.filter(v=>v.kind==='retailer').length}</strong> sellers</span><span><strong>{PART_OFFERS.length}</strong> part listings</span><span><strong>3</strong> service leads</span></div>
    {vehicle.id==='yzf-2021'&&<p className="supplier-fitment">Your catalog links cover the 2021 R1. The imported YZF model is unverified and its current manual reference is R7. These are separate fitments.</p>}
    <div className="supplier-switch" role="group" aria-label="Supplier information"><button aria-pressed={view==='parts'} onClick={()=>setView('parts')}>Parts & shipping</button><button aria-pressed={view==='service'} onClick={()=>setView('service')}>Service estimates</button></div>
    <div className="supplier-fields"><label>Vehicle category<select value={scope} onChange={e=>{setScope(e.target.value);setDraft(null);}}><option value="motorcycle">Motorcycles</option><option value="car">Cars</option><option value="bicycle">Bicycles · Audrey’s list</option><option value="all">All categories</option></select></label>
      {view==='parts'&&<label>Part condition<select value={condition} onChange={e=>setCondition(e.target.value)}><option value="all">All / sourcing leads</option><option value="new">New</option><option value="used">Verified used inventory</option></select></label>}
    </div>
    {view==='parts'?<details className="supplier-calculator" open><summary>Shipping estimate to 02139</summary><label>Basket subtotal · USD<input type="number" min="0" max="1000000" step="0.01" value={subtotal} onChange={e=>setSubtotal(e.target.value)}/></label>
      <label className="supplier-check"><input type="checkbox" checked={eligible} onChange={e=>setEligible(e.target.checked)}/>Assume eligible standard parcels</label><small>Excludes oversized, freight and hazardous items. Policy estimates, before tax; final charges come from checkout.</small>{!validAmount&&<p role="alert">Enter a subtotal from $0 to $1,000,000.</p>}</details>:
      <div className="supplier-calculator"><label>Assumed labor hours<input type="number" min="0.01" max="100" step="0.25" value={hours} onChange={e=>setHours(e.target.value)}/></label><small>For hourly pricing only. This is your planning assumption, not a repair-time specification.</small><label>Work to request<textarea value={work} maxLength="1500" onChange={e=>setWork(e.target.value)} placeholder="Describe the symptoms or requested maintenance…"/></label><small>No provider has issued a quote. Open a provider’s page or download an unsent request.</small></div>}
    <div className="supplier-records">{records.map(v=>{
      const shipping=view==='parts'&&v.kind==='retailer'&&validAmount?estimateShipping(v.id,{subtotalUsd:amount,standardParcel:eligible}):null;
      const offers=PART_OFFERS.filter(o=>o.vendorId===v.id&&(condition==='all'||o.condition===condition));
      return <article className="supplier-card" key={v.id}>
        <div className="supplier-card-top"><span>{v.category} · {v.kind==='service'?'service':v.kind==='catalog'?'catalog reference':v.condition.join(' / ').replaceAll('-',' ')}</span><span>{v.kind==='service'?'Boston area':'Online'}</span></div>
        <h4><External href={v.url}>{v.name}</External></h4><p>{v.note}</p>
        {shipping&&<div className="supplier-shipping"><strong>{money(shipping.shippingUsd)}</strong><span>shipping · {shipping.status==='policy-estimate'?'conditional estimate':'not priced'}</span><small>{shipping.note}</small></div>}
        {offers.length>0&&<details className="supplier-offers" open><summary>{offers.length} observed part listing{offers.length>1?'s':''}</summary>{offers.map(o=><div className="supplier-offer" key={o.id}><div><strong>{o.name}</strong><b>{o.priceRangeUsd?`${money(o.priceRangeUsd[0])}–${money(o.priceRangeUsd[1])}`:money(o.priceUsd)}</b></div><code>{o.partNumber}</code><small>{o.condition} · {o.fitment}</small><p>{o.note}</p>{o.shippingOverride&&<p className="supplier-fitment">{o.shippingOverride.note}</p>}<External href={o.source.url}>View listing · {o.source.access==='indexed-page'?'indexed snapshot':'source checked'}</External></div>)}</details>}
        {v.kind==='service'&&<><p className="supplier-location">{v.location}{v.phone&&<> · <a href={`tel:${v.phone}`}>{v.phone}</a></>}</p>
          {v.rates.length?v.rates.map(rate=><div className="supplier-rate" key={rate.id}><div><strong>{money(rate.amountUsd)} / {rate.unit}</strong><span>{rate.label}</span></div>{validHours&&<small>{rate.unit==='hour'?`${hours} assumed hours → `:'Published visit → '}{money(estimateLabor(v.id,rate.id,laborHours).amountUsd)} {rate.unit==='hour'?'labor only':'plus parts'}</small>}</div>):<p className="supplier-fitment">Vehicle-specific quote required · no verified rate.</p>}
          <div className="assembly-actions"><button onClick={()=>setDraft({vendor:v,text:quoteRequestDraft(v.id,{vehicle:scope===vehicleCategory(vehicle.id)?vehicle.source.title:'',work})})}>Prepare quote request</button><External href={v.quoteUrl}>Provider page</External></div>
        </>}
        <details className="supplier-sources"><summary>Sources & verification</summary><small>Checked {v.checkedAt} · public snapshot</small>{v.sources.map(s=><div key={s.url}><External href={s.url}>{s.label}</External><small>{s.access==='unverified'?'Page could not be verified':s.access==='indexed-page'?'Search-index evidence; live page access limited':'Page read directly'}</small></div>)}</details>
      </article>;
    })}</div>
    {!records.length&&<p className="assembly-empty">No verified records for these filters.</p>}
    {draft&&<div className="supplier-draft" role="region" aria-label="Unsent quote request"><h4>Request for {draft.vendor.name}</h4><textarea aria-label="Quote request draft" value={draft.text} onChange={e=>setDraft({...draft,text:e.target.value})}/><button onClick={()=>save(draft.text,`${draft.vendor.id}-quote-request.txt`)}>Download unsent request ↓</button><button onClick={()=>setDraft(null)}>Close draft</button></div>}
    <button className="supplier-export" onClick={()=>save(JSON.stringify(directorySnapshot(),null,2),'vendor-directory-02139.json','application/json')}>Export full vendor database · JSON ↓</button>
    <small className="supplier-footnote">No listing is bound to a verified service mesh. Confirm OEM number, VIN / trim and condition before specifying a repair. Quotes, tax and unknown shipping are never counted as $0.</small>
  </section>;
}
