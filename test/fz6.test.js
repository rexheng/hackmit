import {describe,it,expect} from 'vitest';
import {validateDetection} from '../web/src/fz6/detection.js';
import {PARTS} from '../web/src/fz6/model.js';
describe('FZ6 CV integration contract',()=>{
 it('maps all ten named components and accepts a normalized detection',()=>{
  expect(new Set(PARTS.map(p=>p.id)).size).toBe(10);
  for(const part of PARTS)expect(validateDetection({partId:part.id}).partId).toBe(part.id);
  expect(validateDetection({partId:'front-brake',confidence:.96,bbox:[.6,.5,.1,.2]}).confidence).toBe(.96);
 });
 it('rejects unknown parts and invalid confidence',()=>{
  for(const value of [null,{}, {partId:'unknown'},{partId:'front-brake',confidence:1.1},{partId:'tank',confidence:'0.8'},{partId:'tank',confidence:NaN}])expect(()=>validateDetection(value)).toThrow();
 });
 it('rejects malformed, empty, negative and out-of-image bounding boxes',()=>{
  for(const bbox of [[.9,.9,.2,.2],[0,0,0,.2],[-.1,0,.2,.2],[0,0,NaN,.3],[0,0,1],['0',0,.1,.2]])expect(()=>validateDetection({partId:'front-brake',bbox})).toThrow();
 });
});

import {readFileSync} from 'node:fs';
import {createCaliper,CALIPER_COMPONENTS} from '../web/src/fz6/caliper.js';
const catalogue=JSON.parse(readFileSync(new URL('../web/public/fz6/oem-catalogue.json',import.meta.url),'utf8'));
describe('FZ6 source inventory',()=>{
 it('preserves the 46 catalogue figures, source pages and unresolved fitment',()=>{
  expect(catalogue.assemblies.map(a=>a.figure)).toEqual(Array.from({length:46},(_,i)=>i+1));
  expect(catalogue.parseIssues).toEqual([]);
  expect(catalogue.vehicleIdentityConfirmed).toBe(false);
  expect(catalogue.assemblies.flatMap(a=>a.entries).every(p=>p.page>6&&p.page<=71&&p.geometryStatus==='unverified')).toBe(true);
 });
 it('keeps quantities out of numbered descriptions and preserves bearing alternatives',()=>{
  const cylinder=catalogue.assemblies.find(a=>a.figure===1);
  expect(cylinder.entries.find(p=>p.partNumber==='5EB-11133-10')).toMatchObject({description:'.GUIDE, VALVE 1',quantity:16});
  const crank=catalogue.assemblies.find(a=>a.figure===2);
  const bearings=crank.entries.filter(p=>p.reference===5);
  expect(bearings).toHaveLength(5);
  expect(bearings.every(p=>p.quantity===10&&p.remarks.startsWith('UR'))).toBe(true);
  expect(crank.entries.find(p=>p.partNumber==='5SL-11631-00').quantity).toBe(4);
 });
 it('matches S2 caliper diagram quantities while preserving the pad-kit distinction',()=>{
  const model=createCaliper();
  expect(model.parts.pistons.children).toHaveLength(4);
  expect(model.parts.seals.children).toHaveLength(8);
  expect(model.parts.pads.children).toHaveLength(2);
  expect(model.parts.clips.children).toHaveLength(2);
  const rows=catalogue.assemblies.find(a=>a.figure===30).entries;
  expect(rows.find(p=>p.reference===20)).toMatchObject({partNumber:'5VN-W0045-00',quantity:1});
  expect(CALIPER_COMPONENTS.find(p=>p.id==='pads').count).toBe(2);
  model.explode(1);model.explode(0);
  for(const part of Object.values(model.parts))expect(part.position.length()).toBe(0);
  model.root.traverse(o=>o.geometry?.dispose());model.materials.forEach(m=>m.dispose());
 });
});
