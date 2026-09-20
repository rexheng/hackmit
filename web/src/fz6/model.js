import * as THREE from 'three';
import {createCaliper} from './caliper.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

export const PARTS = [
  { id:'front-brake', name:'Front brake caliper', system:'Braking system', description:'S2 four-piston caliper. Inventory follows the Yamaha diagram; exact contours and clearances remain unverified.', position:[.66,.40,.16], explode:[.18,.05,.52] },
  { id:'front-wheel', name:'Front wheel & discs', system:'Running gear', description:'17-inch alloy wheel with twin drilled brake rotors and a 120/70 tire.', position:[.72,.30,0], explode:[.42,-.03,0] },
  { id:'fork', name:'Front suspension', system:'Chassis', description:'Conventional telescopic fork, triple clamps and front fender.', position:[.61,.64,0], explode:[.32,.24,0] },
  { id:'fairing', name:'Fazer front cowling', system:'Bodywork', description:'S2 half fairing, twin headlamps, windscreen and stalk mirrors.', position:[.51,.91,0], explode:[.3,.4,0] },
  { id:'tank', name:'Fuel tank', system:'Fuel system', description:'Sculpted 19.4-liter fuel tank with a recessed filler cap.', position:[-.04,.86,0], explode:[0,.48,0] },
  { id:'engine', name:'Inline-four engine', system:'Powertrain', description:'Liquid-cooled 600 cc inline-four. External geometry is a visual approximation.', position:[.02,.43,0], explode:[0,-.03,.42] },
  { id:'exhaust', name:'Exhaust assembly', system:'Powertrain', description:'Four curved headers feed an under-seat muffler assembly with twin outlets.', position:[-.68,.70,0], explode:[-.12,.10,-.45] },
  { id:'frame', name:'Aluminum frame', system:'Chassis', description:'Sculpted twin-sided aluminum frame surrounding the engine.', position:[-.16,.62,0], explode:[0,.08,-.22] },
  { id:'seat', name:'Seat & tail', system:'Bodywork', description:'Stepped rider and passenger seat with tail cowls and grab rails.', position:[-.53,.81,0], explode:[-.23,.35,0] },
  { id:'rear-wheel', name:'Rear wheel & drive', system:'Running gear', description:'180/55 rear tire, chain, sprocket and cast swingarm.', position:[-.72,.30,0], explode:[-.42,0,0] },
];
const V = p => new THREE.Vector3(...p);
export function createMotorcycle() {
 const bike = new THREE.Group(); bike.name='Yamaha FZ6 Fazer S2';
 const groups = {}, materialList = [], repair = { bolts:[], pads:[] };
 const mat=(c,metalness=.0,roughness=.4,extra={})=>{const m=new THREE.MeshPhysicalMaterial({color:c,metalness,roughness,...extra});materialList.push(m);return m;};
 const paint=mat('#14277a',.28,.32,{clearcoat:1,clearcoatRoughness:.23});
 paint.onBeforeCompile = shader => { shader.fragmentShader=shader.fragmentShader.replace('#include <roughnessmap_fragment>',`#include <roughnessmap_fragment>\nfloat flake = fract(sin(dot(floor(vViewPosition.xy * 3800.0), vec2(12.9898,78.233))) * 43758.5453);\nroughnessFactor = clamp(roughnessFactor + (flake - 0.5) * 0.055, 0.12, 1.0);`); };
 const black=mat('#11171d',.5,.35), rubber=mat('#111317',.02,.85), seatMat=mat('#20242b',.0,.85), silver=mat('#b3bdc5',.9,.25), alloy=mat('#15191b',.35,.54), engineMat=mat('#121517',.2,.55), gold=mat('#b5a173',.8,.32), exhaustMat=mat('#afb0aa',.95,.23), dark=mat('#060a0e',.05,.55), red=mat('#c60817',.3,.24,{emissive:'#e10b1b',emissiveIntensity:.8}), amber=mat('#ff9100',.2,.22,{emissive:'#ff7b00',emissiveIntensity:.6}), lens=mat('#cadcf0',.5,.15,{emissive:'#c7e0ff',emissiveIntensity:.02,clearcoat:1}), glass=mat('#233444',.2,.12,{transparent:true,opacity:.5,side:THREE.DoubleSide,clearcoat:1});
 [black,alloy,engineMat].forEach(m=>m.envMapIntensity=.12);
 PARTS.forEach(p=>{let g=new THREE.Group();g.name=p.name;g.userData.partId=p.id;bike.add(g);groups[p.id]=g;});
 function mesh(g,geo,m,p=[0,0,0],r=[0,0,0]){const o=new THREE.Mesh(geo,m);o.position.set(...p);o.rotation.set(...r);o.castShadow=true;o.receiveShadow=true;o.userData.partId=g.userData.partId;g.add(o);return o;}
 function box(g,p,s,m,r=[0,0,0],radius=.012){return mesh(g,new RoundedBoxGeometry(...s,3,radius),m,p,r);}
 function sphere(g,p,s,m){let o=mesh(g,new THREE.SphereGeometry(1,32,20),m,p);o.scale.set(...s);return o;}
 function cyl(g,p,rad,len,m,axis='z',r2=rad,n=32){return mesh(g,new THREE.CylinderGeometry(rad,r2,len,n),m,p,axis==='z'?[Math.PI/2,0,0]:axis==='x'?[0,0,Math.PI/2]:[0,0,0]);}
 function tube(g,pts,r,m,segments=32){return mesh(g,new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map(V)),segments,r,8,false),m);}
 function rod(g,a,b,r,m,r2=r){let d=V(b).sub(V(a));const o=mesh(g,new THREE.CylinderGeometry(r2,r,d.length(),16),m,V(a).add(V(b)).multiplyScalar(.5).toArray());o.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize());return o;}
 function torus(g,p,r,t,m){return mesh(g,new THREE.TorusGeometry(r,t,10,80),m,p);}
 function panel(g,pts,depth,z,m){const s=new THREE.Shape();s.moveTo(...pts[0]);for(let i=1;i<pts.length;i++)s.lineTo(...pts[i]);s.closePath();const geo=new THREE.ExtrudeGeometry(s,{depth,bevelEnabled:true,bevelThickness:.008,bevelSize:.008,bevelSegments:3,steps:1});return mesh(g,geo,m,[0,0,z-depth/2]);}
 function loft(g,sections,m,segments=64){const curves=[0,1,2,3].map(i=>new THREE.CatmullRomCurve3(sections.map(s=>new THREE.Vector3(s[0],s[i+1]||0,0))));const points=[],uv=[],indices=[];const count=64;for(let i=0;i<=count;i++){const t=i/count;const vals=curves.map(c=>c.getPoint(t));const x=vals[0].x,cy=vals[0].y,ry=vals[1].y,rz=vals[2].y;for(let j=0;j<=segments;j++){const a=j/segments*Math.PI*2;points.push(x,cy+Math.cos(a)*ry,Math.sin(a)*rz);uv.push(t,j/segments);if(i<count&&j<segments){let k=i*(segments+1)+j;indices.push(k,k+1,k+segments+1,k+1,k+segments+2,k+segments+1);}}}const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(points,3));geo.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geo.setIndex(indices);geo.computeVertexNormals();return mesh(g,geo,m);}
 function surface(g,rows,m,nu=28,nv=20){
 const curves=rows.map(row=>new THREE.CatmullRomCurve3(row.map(V),false,'catmullrom',.25));const positions=[],indices=[];
 for(let i=0;i<=nu;i++){let u=i/nu;const across=new THREE.CatmullRomCurve3(curves.map(c=>c.getPoint(u)),false,'catmullrom',.25);for(let j=0;j<=nv;j++){const p=across.getPoint(j/nv);positions.push(p.x,p.y,p.z);if(i<nu&&j<nv){const a=i*(nv+1)+j;indices.push(a,a+1,a+nv+1,a+1,a+nv+2,a+nv+1);}}}
 const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geo.setIndex(indices);geo.computeVertexNormals();const material=m.clone();material.side=THREE.DoubleSide;material.onBeforeCompile=m.onBeforeCompile;materialList.push(material);if(m===paint)material.userData.bodyPaint=true;return mesh(g,geo,material);
 }
 function skin(g,pts,m,bulge=0){const center=pts.reduce((sum,p)=>sum.add(V(p)),new THREE.Vector3()).multiplyScalar(1/pts.length);center.x+=bulge;const curve=new THREE.CatmullRomCurve3(pts.map(V),true,'catmullrom',.12),vertices=[...center.toArray()],indices=[];for(let i=0;i<64;i++)vertices.push(...curve.getPoint(i/64).toArray());for(let i=0;i<64;i++)indices.push(0,1+i,1+(i+1)%64);const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geo.setIndex(indices);geo.computeVertexNormals();const mm=m.clone();mm.side=THREE.DoubleSide;mm.onBeforeCompile=m.onBeforeCompile;materialList.push(mm);if(m===paint)mm.userData.bodyPaint=true;return mesh(g,geo,mm);}
 function shellArc(g,x,y,from,to,r,width,m){const rows=[];for(let i=0;i<7;i++){let z=(i/6*2-1)*width;const row=[];for(let j=0;j<10;j++){const a=from+(to-from)*j/9,rr=r-.018*(z/width)**2;row.push([x+Math.cos(a)*rr,y+Math.sin(a)*rr,z]);}rows.push(row);}return surface(g,rows,m,36,16);}
 function bolt(g,p,size=.009){cyl(g,p,size,.008,silver,'z',size,6);cyl(g,[p[0],p[1],p[2]+Math.sign(p[2]||1)*.005],size*.42,.001,dark,'z',size*.42,6);}
 function disc(g,x,y,z,r){const s=new THREE.Shape();s.absarc(0,0,r,0,Math.PI*2,false);let hole=new THREE.Path();hole.absarc(0,0,r*.65,0,Math.PI*2,true);s.holes.push(hole);for(let i=0;i<42;i++){const a=i/42*Math.PI*2;const rr=r*(i%2?.89:.77);let h=new THREE.Path();h.absarc(Math.cos(a)*rr,Math.sin(a)*rr,.004,0,Math.PI*2,true);s.holes.push(h);}mesh(g,new THREE.ExtrudeGeometry(s,{depth:.004,bevelEnabled:false}),silver,[x,y,z]);torus(g,[x,y,z],r*.64,.008,alloy);for(let i=0;i<6;i++){let a=i/6*Math.PI*2;rod(g,[x+Math.cos(a)*.035,y+Math.sin(a)*.035,z],[x+Math.cos(a+.15)*r*.67,y+Math.sin(a+.15)*r*.67,z],.009,alloy);bolt(g,[x+Math.cos(a)*r*.61,y+Math.sin(a)*r*.61,z+.008],.006);}}
 function wheel(id,x,width){let g=groups[id],y=id==='front-wheel'?.300:.315;const tireRadius=y,radial=(tireRadius-.208)/2,centerRadius=(tireRadius+.208)/2;const profile=[];for(let i=0;i<=24;i++){const a=i/24*Math.PI*2;profile.push(new THREE.Vector2(centerRadius+Math.cos(a)*radial,Math.sin(a)*width*.5));}let tire=mesh(g,new THREE.LatheGeometry(profile,112),rubber,[x,y,0],[Math.PI/2,0,0]);for(const side of [-1,1]){torus(g,[x,y,side*width*.45],.239,.005,rubber);torus(g,[x,y,side*width*.36],.213,.012,black);torus(g,[x,y,side*width*.39],.215,.002,alloy);}cyl(g,[x,y,0],.046,width*.9,alloy);cyl(g,[x,y,0],.018,width+ .025,silver);for(let i=0;i<5;i++){let a=i*Math.PI*2/5;const pts=[[.028,-.022],[.075,-.014],[.172,.021],[.21,.044],[.211,.061],[.168,.044],[.077,.018],[.027,.016]].map(([u,v])=>[x+Math.cos(a)*u-Math.sin(a)*v,y+Math.sin(a)*u+Math.cos(a)*v]);panel(g,pts,.028,0,black);}const treadMat=mat('#17191b',.0,.9);for(let i=0;i<56;i++){const a=i/56*Math.PI*2;for(let side of [-1,1]){const pts=[];for(let j=0;j<5;j++){let t=j/4,ang=a+t*.08*side;const z=side*(.009+t*width*.35),radius=centerRadius+radial*Math.sqrt(Math.max(0,1-(z/(width*.51))**2));pts.push([x+Math.sin(ang)*radius,y+Math.cos(ang)*radius,z]);}tube(g,pts,.0008,treadMat,6);}}if(id==='front-wheel'){disc(g,x,y,.079,.149);disc(g,x,y,-.083,.149);}else{disc(g,x,y,.096,.122);} }
 wheel('front-wheel',.72,.12);wheel('rear-wheel',-.72,.18);
 // Cast swingarm, drive sprocket and individual chain links.
 let rear=groups['rear-wheel'];for(let s of [-1,1]){panel(rear,[[-.76,.28],[-.76,.34],[-.29,.44],[-.22,.39],[-.31,.32]],.043,s*.119,alloy);bolt(rear,[-.72,.307,s*.149],.019);bolt(rear,[-.27,.386,s*.153],.023);}
 cyl(rear,[-.72,.307,-.131],.119,.009,alloy);for(let i=0;i<42;i++){let a=i/42*Math.PI*2;box(rear,[-.72+Math.cos(a)*.12,.307+Math.sin(a)*.12,-.131],[.012,.012,.009],silver,[0,0,a],.002);}for(let i=0;i<7;i++){let a=i/7*Math.PI*2;cyl(rear,[-.72+Math.cos(a)*.075,.307+Math.sin(a)*.075,-.138],.023,.002,black);}
 const chainPts=[[-.72,.435,-.15],[-.35,.451,-.15],[-.16,.41,-.15],[-.16,.31,-.15],[-.4,.207,-.15],[-.72,.179,-.15],[-.845,.307,-.15]];const chainCurve=new THREE.CatmullRomCurve3(chainPts.map(V),true,'catmullrom',.2);const linkGeo=new THREE.BoxGeometry(.011,.008,.019),linkMesh=new THREE.InstancedMesh(linkGeo,gold,120);const dummy=new THREE.Object3D();for(let i=0;i<120;i++){dummy.position.copy(chainCurve.getPoint(i/120));let tangent=chainCurve.getTangent(i/120);dummy.rotation.z=Math.atan2(tangent.y,tangent.x);dummy.updateMatrix();linkMesh.setMatrixAt(i,dummy.matrix);}rear.add(linkMesh);
 // Front fork geometry follows the steering rake.
 let fork=groups.fork;for(let s of [-1,1]){rod(fork,[.724,.302,s*.10],[.592,.635,s*.10],.028,black);rod(fork,[.591,.635,s*.10],[.467,.94,s*.10],.020,silver);rod(fork,[.71,.36,s*.102],[.64,.53,s*.102],.026,black);bolt(fork,[.72,.307,s*.136],.014);box(fork,[.50,.859,s*.10],[.086,.037,.067],black,[0,0,.35]);}box(fork,[.51,.853,0],[.078,.025,.28],alloy,[0,0,.35]);box(fork,[.464,.948,0],[.08,.025,.25],alloy,[0,0,.35]);
 shellArc(fork,.72,.300,1.04,2.72,.337,.078,paint);
 for(let side of [-1,1]){surface(fork,[[[.894,.583,side*.050],[.80,.623,side*.067],[.693,.626,side*.078],[.58,.587,side*.078],[.418,.433,side*.06]],[[.889,.566,side*.061],[.80,.592,side*.084],[.687,.597,side*.085],[.572,.544,side*.075],[.420,.41,side*.055]]],paint,32,12);}
for(let side of [-1,1]){panel(fork,[[.60,.577],[.65,.57],[.68,.435],[.628,.445],[.58,.535]],.009,side*.076,paint);bolt(fork,[.643,.453,side*.085],.006);}
 let brake=groups['front-brake'];
 repair.details=[];
 for(const side of [-1,1]){const assembly=createCaliper();assembly.root.position.set(.637,.393,side*.081);assembly.root.rotation.z=-.23;if(side<0)assembly.root.rotation.y=Math.PI;brake.add(assembly.root);repair.details.push(assembly);}
 repair.caliper=repair.details[1].root;
 for(let y of [.342,.445]){let g=new THREE.Group();g.userData.partId='front-brake';brake.add(g);g.position.set(.614,y,.132);g.userData.baseZ=.132;bolt(g,[0,0,0],.008);repair.bolts.push(g);}
 tube(brake,[[.64,.46,.11],[.57,.56,.14],[.57,.74,.12],[.46,.92,.14]],.004,rubber);
 // Exterior castings traced against S2 side/detail photos. Internal solids are not represented.
 let eng=groups.engine;box(eng,[-.015,.405,0],[.38,.30,.35],engineMat,[0,0,0],.028);
 box(eng,[.105,.59,0],[.265,.205,.354],engineMat,[0,0,-.34],.016);box(eng,[.082,.70,0],[.283,.049,.39],black,[0,0,-.34],.011);
 for(let side of [-1,1]){
 panel(eng,[[.008,.704],[.25,.631],[.17,.463],[.074,.446],[-.045,.57]],.012,side*.186,engineMat);
 for(let i=0;i<3;i++)rod(eng,[.02+i*.065,.664-i*.023,side*.199],[.085+i*.047,.51-i*.017,side*.199],.006,alloy);
 cyl(eng,[-.045,.491,side*.20],.101,.032,engineMat);cyl(eng,[-.045,.491,side*.218],.086,.007,engineMat);
 box(eng,[.085,.382,side*.195],[.146,.187,.036],engineMat,[0,0,-.19],.025);cyl(eng,[.085,.382,side*.217],.027,.003,black);
 for(let i=0;i<8;i++){let a=i/8*Math.PI*2;bolt(eng,[-.045+Math.cos(a)*.093,.491+Math.sin(a)*.093,side*.221],.006);}
 for(let [x,y] of [[.003,.45],[.125,.457],[.151,.385],[.11,.297],[-.015,.30],[-.03,.374]])bolt(eng,[x,y,side*.219],.0055);
 rod(eng,[-.155,.533,side*.226],[-.095,.46,side*.226],.003,alloy);
 tube(eng,[[.278,.61,side*.147],[.268,.477,side*.187],[.215,.395,side*.202],[.155,.32,side*.188]],.017,rubber);
 }
 box(eng,[-.007,.218,0],[.293,.088,.29],engineMat,[0,0,.02],.01);for(let i=0;i<5;i++)box(eng,[-.12+i*.052,.223,.151],[.008,.064,.006],black,[0,0,0],.002);
 cyl(eng,[.191,.29,-.12],.039,.066,black,'x');
 box(eng,[.345,.62,0],[.03,.24,.34],black,[0,0,-.25],.008);for(let i=0;i<25;i++)box(eng,[.363,.504+i*.0088,0],[.004,.0025,.320],alloy,[0,0,-.25],.001);
 for(let side of [-1,1]){panel(eng,[[.37,.734],[.32,.502],[.278,.512],[.326,.744]],.009,side*.177,silver);rod(eng,[.341,.706,side*.184],[.30,.53,side*.184],.009,black);bolt(eng,[.347,.722,side*.185],.006);bolt(eng,[.302,.53,side*.185],.006);}
 for(let i=0;i<4;i++){const z=(i-1.5)*.078;rod(eng,[.01,.685,z],[-.028,.762,z],.029,black);rod(eng,[-.028,.758,z],[-.018,.794,z],.032,alloy);tube(eng,[[.094,.710,z],[.052,.756,z],[-.08,.776,z]],.004,rubber);}
 box(eng,[-.068,.780,0],[.266,.062,.325],black,[0,0,-.07],.015);
 for(let side of [-1,1]){tube(eng,[[-.25,.69,side*.16],[-.10,.72,side*.18],[.12,.75,side*.16],[.24,.69,side*.15]],.007,rubber);tube(eng,[[-.22,.37,side*.17],[-.25,.48,side*.18],[-.20,.64,side*.19]],.006,rubber);}
 let exh=groups.exhaust;for(let i=0;i<4;i++){let z=(i-1.5)*.074;tube(exh,[[.245,.565,z],[.303,.505,z],[.292,.297,z],[.218,.171,z],[-.06,.160,z*.84],[-.23,.20,z*.48],[-.35,.31,z*.30]],.0175,exhaustMat,56);rod(exh,[.247,.564,z],[.268,.531,z],.024,alloy);}
 tube(exh,[[-.33,.26,0],[-.42,.42,0],[-.47,.63,0],[-.64,.811,0],[-.85,.866,0]],.037,exhaustMat);
 loft(exh,[[-1.01,.872,.042,.136],[-.96,.870,.059,.16],[-.77,.837,.068,.154],[-.61,.809,.055,.127],[-.54,.787,.024,.048]],alloy);
 for(let side of [-1,1]){surface(exh,[[[-1.00,.913,side*.11],[-.91,.922,side*.14],[-.72,.87,side*.146],[-.57,.818,side*.105]],[[-1.015,.873,side*.151],[-.91,.87,side*.171],[-.72,.808,side*.158],[-.60,.771,side*.122]]],silver);cyl(exh,[-1.014,.870,side*.074],.036,.008,black,'x');cyl(exh,[-1.019,.870,side*.074],.027,.009,dark,'x');}
 // Twin aluminum frame spars and triangulated rear subframe.
 let frame=groups.frame;const cast=mat('#111416',.16,.57);cast.envMapIntensity=.1;
 for(let side of [-1,1]){const shape=new THREE.Shape();shape.moveTo(.35,.740);shape.bezierCurveTo(.20,.788,-.02,.754,-.18,.655);shape.lineTo(-.274,.658);shape.quadraticCurveTo(-.23,.558,-.20,.404);shape.quadraticCurveTo(-.17,.355,-.106,.399);shape.lineTo(-.105,.568);shape.quadraticCurveTo(-.078,.621,.025,.651);shape.quadraticCurveTo(.10,.678,.093,.543);shape.lineTo(.135,.513);shape.quadraticCurveTo(.142,.655,.204,.694);shape.lineTo(.35,.714);shape.closePath();mesh(frame,new THREE.ExtrudeGeometry(shape,{depth:.038,bevelEnabled:true,bevelThickness:.009,bevelSize:.008,bevelSegments:4}),cast,[0,0,side*.185-.019]);
 for(let [x,y] of [[-.17,.41],[-.197,.56],[-.17,.635],[.29,.74]])bolt(frame,[x,y,side*.226],.009);
 rod(frame,[-.35,.53,side*.15],[-.89,.866,side*.116],.017,black);rod(frame,[-.26,.704,side*.145],[-.91,.91,side*.107],.014,black);
 panel(frame,[[-.40,.458],[-.36,.51],[-.19,.359],[-.17,.283],[-.34,.306]],.014,side*.227,silver);
 rod(frame,[-.22,.309,side*.217],[-.22,.309,side*.32],.015,black);tube(frame,[[-.22,.309,side*.29],[-.15,.279,side*.29],[-.03,.282,side*.29]],.006,silver);
 panel(frame,[[-.69,.66],[-.57,.733],[-.40,.561],[-.49,.541]],.012,side*.188,alloy);rod(frame,[-.51,.557,side*.19],[-.51,.557,side*.30],.013,silver);
 }
 // Folded center stand, side stand and rear wheel hugger visible in OEM studio images.
 for(let side of [-1,1])tube(frame,[[-.31,.225,side*.13],[-.33,.17,side*.14],[-.43,.155,side*.14],[-.44,.176,side*.07]],.012,black);
 tube(frame,[[-.24,.24,-.20],[-.40,.17,-.215],[-.60,.18,-.21]],.010,black);
 shellArc(rear,-.72,.315,.42,1.89,.364,.107,black);
 rod(frame,[-.40,.39,0],[-.29,.68,0],.024,silver);const spring=[];for(let i=0;i<150;i++){let t=i/149,a=t*Math.PI*18;spring.push([-.4+t*.11+Math.cos(a)*.04,.39+t*.29,Math.sin(a)*.04]);}tube(frame,spring,.008,mat('#24272a',.5,.5),150);
 // Smooth, hand-profiled tank and stepped seat.
 const fuelTank=loft(groups.tank,[[-.253,.754,.008,.006],[-.208,.793,.060,.079],[-.139,.852,.091,.127],[-.037,.879,.135,.182],[.076,.876,.133,.188],[.17,.861,.127,.160],[.270,.835,.104,.113],[.335,.819,.049,.064],[.355,.804,.004,.004]],paint);
 const fp=fuelTank.geometry.attributes.position;for(let i=0;i<fp.count;i++){let x=fp.getX(i),y=fp.getY(i),z=fp.getZ(i);if(y>.98)fp.setY(i,.98+(y-.98)*.48);if(y<.82&&x<-.08)fp.setZ(i,z*.80);}fp.needsUpdate=true;fuelTank.geometry.computeVertexNormals();
 cyl(groups.tank,[.065,.995,0],.041,.004,alloy,'y');cyl(groups.tank,[.065,.998,0],.030,.003,silver,'y');box(groups.tank,[.065,1.001,0],[.027,.003,.014],black,[0,0,0],.002);
 let seat=groups.seat;const saddle=loft(seat,[[-.986,.957,.002,.004],[-.91,.955,.024,.102],[-.77,.938,.032,.119],[-.65,.921,.037,.124],[-.54,.840,.042,.131],[-.41,.799,.025,.128],[-.29,.788,.025,.099],[-.231,.804,.015,.061],[-.22,.813,.002,.003]],seatMat);
 const sp=saddle.geometry.attributes.position;for(let i=0;i<sp.count;i++){const x=sp.getX(i);if(x>-.41)sp.setY(i,sp.getY(i)-Math.min(1,(x+.41)/.19)*.075);}sp.needsUpdate=true;saddle.geometry.computeVertexNormals();
 for(let side of [-1,1]){surface(seat,[[[-1.00,.948,side*.075],[-.85,.925,side*.12],[-.65,.863,side*.128],[-.45,.796,side*.133],[-.245,.758,side*.079]],[[-1.01,.916,side*.07],[-.83,.89,side*.14],[-.62,.81,side*.139],[-.43,.748,side*.12],[-.25,.738,side*.074]]],paint);
 tube(seat,[[-.65,.884,side*.138],[-.78,.936,side*.15],[-.94,.952,side*.114],[-1.015,.927,side*.079]],.010,paint);
 tube(seat,[[-.29,.806,side*.080],[-.45,.826,side*.113],[-.55,.870,side*.115],[-.68,.954,side*.102],[-.91,.977,side*.08]],.001,alloy);
 panel(seat,[[-.23,.728],[-.38,.721],[-.60,.773],[-.77,.846],[-.60,.809],[-.40,.762]],.018,side*.12,black);
 }
 box(seat,[-1.012,.929,0],[.019,.033,.143],red,[0,0,-.25]);panel(seat,[[-.94,.837],[-1.005,.718],[-1.085,.572],[-1.025,.626],[-.951,.736]],.045,0,black);box(seat,[-1.053,.671,0],[.012,.097,.145],black,[0,0,-.32]);for(let side of [-1,1]){rod(seat,[-.987,.802,side*.042],[-1.0,.802,side*.17],.008,black);sphere(seat,[-1.0,.802,side*.187],[.033,.016,.024],black);sphere(seat,[-1.014,.802,side*.19],[.01,.013,.018],amber);}
 // S2 cowling: sharp center nose, tall swept-back brow and angular twin reflectors.
 let fair=groups.fairing;
 for(let side of [-1,1]){const pts=rows=>rows.map(row=>row.map(([x,y,z])=>[x,y,z*side]));
 surface(fair,pts([
 [[.447,1.142,0],[.527,1.036,0],[.715,.936,0],[.871,.803,0]],
 [[.43,1.12,.104],[.55,1.016,.088],[.729,.935,.067],[.861,.805,.037]],
 [[.40,1.075,.204],[.59,1.035,.198],[.752,.925,.105],[.861,.805,.038]],
 [[.425,1.038,.230],[.625,1.012,.227],[.803,.892,.095],[.853,.823,.032]]
 ]),paint,40,24);
 const boundary=pts([[[.852,.821,.032],[.803,.893,.095],[.625,1.012,.225],[.642,.956,.258],[.735,.867,.227],[.83,.818,.08]]])[0];
 skin(fair,boundary,black,.009);
 const center=boundary.reduce((a,p)=>a.add(V(p)),new THREE.Vector3()).multiplyScalar(1/boundary.length);
 const inset=boundary.map(p=>V(p).sub(center).multiplyScalar(.91).add(center).add(new THREE.Vector3(.008,0,0)).toArray());
 const reflector=mat('#b8c3c8',.98,.17,{clearcoat:1,clearcoatRoughness:.06});skin(fair,inset,reflector,.012);
 // Reflector facets follow the lens perimeter; no protruding round headlamp pods.
 const c=[.778,.881,side*.123];for(let i=0;i<6;i++)tube(fair,[c,inset[i]],.0014,silver,8);
 for(let j=0;j<7;j++){let t=j/6;tube(fair,[[.646+t*.147,.982-t*.108,side*(.224-t*.102)],[.688+t*.10,.909-t*.045,side*(.222-t*.08)]],.0008,alloy,8);}
 surface(fair,pts([
 [[.241,.898,.156],[.409,.881,.248],[.646,.811,.245],[.858,.802,.02]],
 [[.232,.857,.21],[.393,.819,.270],[.632,.772,.23],[.861,.797,.015]],
 [[.271,.786,.19],[.420,.750,.252],[.665,.747,.197],[.837,.776,.012]]
 ]),paint,36,20);
 surface(fair,pts([[[.43,1.036,.229],[.488,.981,.241],[.626,.906,.265],[.735,.867,.227]],[[.409,.88,.25],[.5,.866,.277],[.631,.801,.24],[.858,.802,.021]]]),paint);
 skin(fair,pts([[[.263,.894,.205],[.446,.853,.270],[.69,.79,.224],[.55,.813,.262],[.40,.847,.272]]])[0],black,.001);
 tube(fair,pts([[[.28,.824,.247],[.46,.799,.264],[.69,.79,.224]]])[0],.001,silver,20);
 bolt(fair,[.286,.854,side*.242],.006);
 // Inner cowl lining closes gaps between the independent exterior patches.
 skin(fair,pts([[[.252,.875,.178],[.397,1.063,.173],[.45,1.115,.11],[.60,1.00,.182],[.728,.891,.198],[.839,.799,.019],[.655,.756,.179],[.417,.762,.226],[.282,.799,.164]]])[0],black,-.024);
 // Cowl-mounted mirrors and signals.
 tube(fair,[[.455,1.066,side*.178],[.430,1.14,side*.269],[.400,1.222,side*.335]],.012,black);
 const mirror=sphere(fair,[.380,1.246,side*.351],[.040,.059,.080],black);mirror.rotation.x=side*.37;mirror.rotation.z=.40;
 const mirrorGlass=sphere(fair,[.344,1.251,side*.352],[.003,.044,.061],silver);mirrorGlass.rotation.x=side*.37;
 rod(fair,[.435,.733,side*.18],[.45,.729,side*.245],.008,black);sphere(fair,[.464,.73,side*.256],[.029,.019,.024],amber);
 }
 for(const side of [-1,1]){surface(fair,[[[.27,.899,side*.13],[.398,.97,side*.20],[.43,1.071,side*.194]],[[.47,.894,side*.10],[.53,.98,side*.105],[.517,1.066,side*.11]]],black,18,12);}
 const beforeScreen=new Set(fair.children);
 const windshieldRows=[];for(let i=0;i<9;i++){const u=i/8*2-1;windshieldRows.push([[.657-.011*u*u,.966,.113*u],[.503-.02*u*u,1.123-.011*u*u,.155*u],[.386+.023*u*u,1.246-.016*u*u,.148*u],[.331+.07*u*u,1.289-.041*u*u,.116*u]]);}surface(fair,windshieldRows,glass,32,24);
 for(let side of [-1,1])tube(fair,[[.646,.966,side*.113],[.483,1.112,side*.155],[.409,1.230,side*.148],[.401,1.248,side*.116]],.0018,black,28);
 for(let side of [-1,1])for(let [x,y,z] of [[.609,1.016,.119],[.496,1.123,.146]])sphere(fair,[x,y,side*z],[.004,.004,.004],black);
 for(const o of fair.children){if(!beforeScreen.has(o)&&o.geometry){const p=o.geometry.attributes.position;for(let i=0;i<p.count;i++){const y=p.getY(i);p.setY(i,.97+(y-.97)*.60);}p.needsUpdate=true;o.geometry.computeVertexNormals();}}
 // Handlebar, controls, brake reservoir and instrument binnacle.
 const bar=groups.fork;tube(bar,[[.28,1.005,-.33],[.32,1.009,-.23],[.38,.978,-.13],[.40,.972,0],[.38,.978,.13],[.32,1.009,.23],[.28,1.005,.33]],.011,silver);for(let s of [-1,1]){rod(bar,[.275,1.005,s*.33],[.32,1.009,s*.245],.017,rubber);for(let i=0;i<9;i++)cyl(bar,[.285+i*.003,1.006,s*(.323-i*.007)],.018,.002,black,'z');box(bar,[.325,1.012,s*.224],[.037,.04,.038],black);box(bar,[.309,1.034,s*.227],[.01,.008,.016],red);tube(bar,[[.337,1.005,s*.232],[.363,.999,s*.286],[.32,.996,s*.349]],.004,silver);tube(bar,[[.32,1.0,s*.22],[.39,.95,s*.20],[.39,.88,s*.14]],.004,rubber);}box(bar,[.363,1.038,.204],[.039,.035,.053],black);box(bar,[.477,1.002,0],[.075,.043,.152],black,[0,0,.42]);cyl(bar,[.453,1.023,-.035],.033,.009,alloy,'y');cyl(bar,[.453,1.029,-.035],.028,.002,dark,'y');box(bar,[.452,1.031,.035],[.044,.003,.045],mat('#639f9d',.2,.4,{emissive:'#307f7d',emissiveIntensity:.3}));
 // Branded decals are canvas textures, attached to the physical surfaces.
 function decal(g,text,p,w,h,size=100){const canvas=document.createElement('canvas');canvas.width=512;canvas.height=128;const ctx=canvas.getContext('2d');ctx.fillStyle='#e5eaf6';ctx.font=`italic 700 ${size}px Arial`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,256,64);let tex=new THREE.CanvasTexture(canvas);tex.colorSpace=THREE.SRGBColorSpace;const m=new THREE.MeshBasicMaterial({map:tex,transparent:true,side:THREE.DoubleSide,depthWrite:false});const o=mesh(g,new THREE.PlaneGeometry(w,h),m,p);return o;}
 const logoCanvas=document.createElement('canvas');logoCanvas.width=256;logoCanvas.height=256;const logo=logoCanvas.getContext('2d');logo.strokeStyle='#eeeeec';logo.lineWidth=12;logo.beginPath();logo.arc(128,128,103,0,Math.PI*2);logo.stroke();for(let i=0;i<3;i++){logo.save();logo.translate(128,128);logo.rotate(i*Math.PI*2/3);logo.lineWidth=10;logo.beginPath();logo.moveTo(-14,-77);logo.lineTo(-14,-27);logo.lineTo(0,-9);logo.lineTo(14,-27);logo.lineTo(14,-77);logo.moveTo(0,-9);logo.lineTo(0,68);logo.stroke();logo.restore();}const logoTex=new THREE.CanvasTexture(logoCanvas);logoTex.colorSpace=THREE.SRGBColorSpace;const logoMat=new THREE.MeshBasicMaterial({map:logoTex,transparent:true,depthWrite:false,side:THREE.DoubleSide});
 for(let side of [-1,1]){const badge=mesh(groups.tank,new THREE.PlaneGeometry(.033,.033),logoMat,[.04,.901,side*.196]);if(side<0)badge.rotation.y=Math.PI;const label=decal(fair,'FAZER',[.378,.819,side*.266],.135,.020,64);if(side<0)label.rotation.y=Math.PI;}
 bike.traverse(o=>{if(o.isMesh){let p=o.parent;while(p&&!p.userData.partId)p=p.parent;if(p)o.userData.partId=p.userData.partId;o.userData.originalMaterial=o.material;}});
 return {bike,groups,repair,paint,materialList,setPaint(color){paint.color.set(color);materialList.filter(m=>m.userData.bodyPaint).forEach(m=>m.color.set(color));}};
}
