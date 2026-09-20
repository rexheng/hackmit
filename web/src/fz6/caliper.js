import * as THREE from 'three';

// Yamaha 4S8-28197-E0: PDF 203 / printed 4-30, S2 monoblock diagram.
// Only the component inventory and piston diameters are source-backed.
// Case contours, depth, hole centers and clearance are visual approximations.
export const CALIPER_COMPONENTS = [
  {id:'housing',name:'Monoblock housing',count:1,reference:15,partNumber:'4S8-2580U-00',note:'Right caliper assembly number; housing is not a separate catalogue item.'},
  {id:'clips',name:'Pad retaining clips',count:2,reference:23,partNumber:'3GM-25925-00'},
  {id:'pin',name:'Pad retaining pin',count:1,reference:22,partNumber:'4SV-25924-00'},
  {id:'spring',name:'Pad spring / support',count:1,reference:21,partNumber:'4SV-25919-00'},
  {id:'pads',name:'Brake pads',count:2,reference:20,partNumber:'5VN-W0045-00',note:'Catalogue quantity is one pad kit; diagram shows two pads.'},
  {id:'pistons',name:'Opposed pistons',count:4,reference:16,partNumber:'4SV-W0057-00 / 4SV-W0057-10',note:'Two sizes: 30.20 mm and 27.00 mm cylinder bore specification; piston and bore are not identical fit dimensions.'},
  {id:'seals',name:'Piston seals',count:8,reference:17,partNumber:'3MA-W0047-10 / 3GM-W0047-10',note:'Two seals per piston; supplied as kits.'},
  {id:'bleeder',name:'Bleed screw',count:1,reference:24,partNumber:'1J3-W0048-00'},
];
export function createCaliper(){
 const root=new THREE.Group();root.name='S2 right monoblock caliper · approximate geometry';root.userData.partId='front-brake';
 const parts={}, materials=[];
 const material=(color,metalness,roughness)=>{const m=new THREE.MeshStandardMaterial({color,metalness,roughness});materials.push(m);return m;};
 const cast=material('#121518',.45,.39), steel=material('#adb4b7',.8,.27), seal=material('#121517',.02,.82), pad=material('#303436',.05,.94), backing=material('#514d40',.6,.53);
 const create=(id)=>{const g=new THREE.Group();g.name=id;g.userData.componentId=id;g.userData.partId='front-brake';parts[id]=g;root.add(g);return g;};
 CALIPER_COMPONENTS.forEach(p=>create(p.id));
 const add=(g,geo,m,p=[0,0,0],rot=[0,0,0])=>{const o=new THREE.Mesh(geo,m);o.position.set(...p);o.rotation.set(...rot);o.castShadow=true;o.receiveShadow=true;g.add(o);return o;};
 const cyl=(g,r,l,p,m,n=48)=>add(g,new THREE.CylinderGeometry(r,r,l,n),m,p,[Math.PI/2,0,0]);
 const ring=(g,r,t,p,m)=>add(g,new THREE.TorusGeometry(r,t,10,48),m,p);
 const path=(g,pts,r,m)=>add(g,new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map(p=>new THREE.Vector3(...p))),32,r,6,false),m);
 const shape=pts=>{const s=new THREE.Shape();s.moveTo(...pts[0]);pts.slice(1).forEach(p=>s.lineTo(...p));s.closePath();return s;};
 const centers=[{y:-.022,r:.0151},{y:.023,r:.0135}];
 for(const side of [-1,1]){
  const s=shape([[-.027,-.060],[.010,-.060],[.030,-.035],[.030,.039],[.015,.060],[-.028,.052],[-.034,.030],[-.034,-.038]]);
  centers.forEach(({y,r})=>{const h=new THREE.Path();h.absarc(0,y,r,0,Math.PI*2,true);s.holes.push(h);});
  add(parts.housing,new THREE.ExtrudeGeometry(s,{depth:.014,bevelEnabled:true,bevelThickness:.002,bevelSize:.002,bevelSegments:3}),cast,[0,0,side>0?.016:-.030]);
  centers.forEach(({y,r})=>{ring(parts.housing,r+.002,.0027,[0,y,side*.028],cast);cyl(parts.housing,r*.94,.002,[0,y,side*.033],cast);});
  // Opposed cup pistons, rendered as hollow cups instead of decorative solid plugs.
  centers.forEach(({y,r},i)=>{const g=new THREE.Group();g.name=`piston-${side}-${i}`;parts.pistons.add(g);g.userData.side=side;
   const actualRadius=r-.00004;const profile=[new THREE.Vector2(actualRadius,-.007),new THREE.Vector2(actualRadius,.007),new THREE.Vector2(actualRadius-.002,.007),new THREE.Vector2(actualRadius-.002,-.005),new THREE.Vector2(0,-.005),new THREE.Vector2(0,-.007)];
   add(g,new THREE.LatheGeometry(profile,48),steel,[0,y,side*.016],[side*Math.PI/2,0,0]);
   for(let j=0;j<2;j++){const sg=new THREE.Group();sg.userData.side=side;sg.userData.order=i*2+j;parts.seals.add(sg);ring(sg,r,.001,[0,y,side*(.019+j*.004)],seal);}
  });
  const pg=new THREE.Group();pg.userData.side=side;parts.pads.add(pg);
  const padShape=shape([[-.023,-.040],[.014,-.040],[.026,-.023],[.026,.028],[.013,.039],[-.023,.039],[-.027,.028],[-.027,-.030]]);
  add(pg,new THREE.ExtrudeGeometry(padShape,{depth:.002,bevelEnabled:false}),backing,[-.001,0,side>0?.007:-.009]);
  const lining=shape([[-.021,-.032],[.012,-.032],[.021,-.017],[.021,.024],[.010,.032],[-.021,.032]]);
  add(pg,new THREE.ExtrudeGeometry(lining,{depth:.0045,bevelEnabled:false}),pad,[0,0,side>0?.0025:-.007]);
 }
 // Top and bottom bridges are part of one housing, not two bolted case halves.
 for(const y of [-.051,.051]) add(parts.housing,new THREE.BoxGeometry(.043,.012,.047),cast,[-.008,y,0]);
 cyl(parts.pin,.0027,.081,[-.019,.039,0],steel);cyl(parts.pin,.004,.003,[-.019,.039,.042],steel);
 for(const side of [-1,1]){const g=new THREE.Group();g.userData.side=side;parts.clips.add(g);path(g,[[-.019,.033,side*.035],[-.018,.041,side*.035],[-.015,.046,side*.035],[-.017,.049,side*.035],[-.021,.047,side*.035],[-.021,.042,side*.035],[-.019,.039,side*.035]],.00065,steel);}
 const springShape=shape([[-.019,-.036],[.006,-.036],[.009,-.024],[.004,-.020],[.004,.021],[.010,.025],[.007,.036],[-.019,.036],[-.020,.029],[-.014,.024],[-.014,-.023],[-.020,-.029]]);
 add(parts.spring,new THREE.ExtrudeGeometry(springShape,{depth:.0008,bevelEnabled:false}),steel,[0,0,.0004],[0,Math.PI/2,0]);
 add(parts.bleeder,new THREE.CylinderGeometry(.003,.003,.018,16),steel,[.008,.067,.023]);add(parts.bleeder,new THREE.CylinderGeometry(.005,.005,.006,6),steel,[.008,.059,.023]);
 root.traverse(o=>{if(o.isMesh){o.userData.partId='front-brake';let p=o.parent;while(p&&!p.userData.componentId)p=p.parent;o.userData.componentId=p?.userData.componentId;o.userData.geometryStatus='approximate';o.userData.originalMaterial=o.material;}});
 function explode(t){parts.housing.position.set(0,0,0);parts.pin.position.z=t*.13;parts.clips.children.forEach((g,i)=>g.position.set(-t*.02,t*.055,t*(.08+i*.05)));parts.spring.position.x=t*.085;parts.pads.children.forEach(g=>g.position.z=g.userData.side*t*.085);parts.pistons.children.forEach(g=>g.position.z=g.userData.side*t*.17);parts.seals.children.forEach(g=>g.position.z=g.userData.side*t*(.105+g.userData.order*.01));parts.bleeder.position.y=t*.055;}
 return {root,parts,explode,materials};
}
