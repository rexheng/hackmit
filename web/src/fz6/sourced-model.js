import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {PARTS,createMotorcycle} from './model.js';

// Local-only evaluation asset; the licensed file is not part of the code distribution.
export async function loadSourcedMotorcycle(){
 const gltf=await new GLTFLoader().loadAsync('/fz6/local-model.glb');
 const root=gltf.scene;root.rotation.y=-Math.PI/2;
 const scale=1.44/(.756-(-.672));root.scale.setScalar(scale);root.position.set(-.042*scale,-.010,0);root.updateMatrixWorld(true);
 const bike=new THREE.Group();bike.name='Satyam / S3D FZ6 2008 · local exterior evaluation';
 const groups={};PARTS.forEach(p=>{const g=new THREE.Group();g.name=p.name;g.userData.partId=p.id;groups[p.id]=g;bike.add(g);});
 const materialList=new Set(),geometries=new Set();let triangles=0;
 const meshes=[];root.traverse(o=>{if(o.isMesh)meshes.push(o);});
 for(const o of meshes){
  let ancestor=o,source=o.userData.sourceObject;while(!source&&ancestor.parent){ancestor=ancestor.parent;source=ancestor.userData.sourceObject;}
  source=source||o.name;
  let material=Array.isArray(o.material)?o.material[0]:o.material;const matName=material.name;
  let id='frame';
  if(source==='FZ6_front-brake')id='front-brake';
  else if(source==='FZ6_front-fender'||source==='FZ6_fork')id='fork';
  else if(/blazer|retro/.test(source))id='fairing';
  else if(/Guid|forks/.test(source))id='fork';
  else if(/Motor/.test(source))id='engine';
  else if(/escape/.test(source))id='exhaust';
  else if(/Tanque/.test(source))id=/seat|Cloth/.test(matName)?'seat':'tank';
  else if(/Rabeta|indicator_|taillight/.test(source))id='seat';
  else if(/pneu|^Cylinder$/.test(source))id='front-wheel';
  else if(/wheel_rear|Corrente|fazer600|Yamalube/.test(source))id='rear-wheel';
  if(['seat','exhaust','fork','front-brake'].includes(id)||/blazer|retro/.test(source))continue;
  let geometry=o.geometry.clone().applyMatrix4(o.matrixWorld);
  if(id==='front-wheel'){
   const p=geometry.attributes.position;for(let i=0;i<p.count;i++){p.setXYZ(i,.72+(p.getX(i)-.72)*.947,.30+(p.getY(i)-.3208)*.947,p.getZ(i));}p.needsUpdate=true;geometry.computeVertexNormals();
  }
  if(id==='tank'){
   const pos=geometry.attributes.position,index=geometry.index,kept=[];for(let i=0;i<(index?.count||pos.count);i+=3){const a=index?index.getX(i):i,b=index?index.getX(i+1):i+1,c=index?index.getX(i+2):i+2;if((pos.getX(a)+pos.getX(b)+pos.getX(c))/3>-.245)kept.push(a,b,c);}geometry.setIndex(kept);
  }

  geometries.add(o.geometry);
  if((id==='engine'||id==='frame')&&matName==='pipes'){material=material.clone();material.color.set('#252a2d');material.metalness=.2;material.roughness=.53;material.envMapIntensity=.25;material.metalnessMap=null;material.roughnessMap=null;}
  const mesh=new THREE.Mesh(geometry,material);mesh.name=source;mesh.castShadow=true;mesh.receiveShadow=source!=='FZ6_front-fender';mesh.userData={partId:id,sourceObject:source,geometryStatus:'unverified-artistic-model',originalMaterial:material};groups[id].add(mesh);
  triangles+=(geometry.index?.count||geometry.attributes.position.count)/3;materialList.add(material);
  if(matName==='mesh')material.userData.bodyPaint=true;
  if(material.map)material.map.anisotropy=8;
  if(/tire/.test(matName)){material.metalness=0;material.roughness=.91;material.metalnessMap=null;material.roughnessMap=null;material.envMapIntensity=.12;material.normalScale?.set(.2,.2);material.color.set('#777777');}
  if(matName==='lower mesh'){material.metalness=.18;material.roughness=.54;material.metalnessMap=null;material.roughnessMap=null;material.envMapIntensity=.25;material.color.set('#282c30');}
  if(/vehicle_mesh/.test(matName)){material.roughness=Math.max(material.roughness,.38);material.envMapIntensity=.45;}
  if(/seat|Cloth/.test(matName)){material.metalness=0;material.roughness=.9;material.metalnessMap=null;material.roughnessMap=null;material.envMapIntensity=.1;}

  // glTF conversion retains the source's texture mapping; no photograph is projected on it.
  if(/vehglass/.test(matName)){material.transparent=true;material.opacity=.3;material.depthWrite=false;}
 }
 meshes.forEach(o=>geometries.add(o.geometry));geometries.forEach(g=>g.dispose());
 const study=createMotorcycle();const keepMaterials=new Set();
 for(const id of ['fairing','seat','exhaust','fork','front-brake']){const group=study.groups[id];groups[id].add(group);group.traverse(o=>{if(o.material){materialList.add(o.material);keepMaterials.add(o.material);if(o.material===study.paint)o.material.userData.bodyPaint=true;}});}

 study.bike.traverse(o=>{o.geometry?.dispose();});study.materialList.filter(m=>!keepMaterials.has(m)).forEach(m=>m.dispose());

 return {bike,groups,materialList:[...materialList],repair:study.repair,source:'s3d-hybrid',triangles,
  setPaint(color){materialList.forEach(m=>{if(m.userData.bodyPaint)m.color.set(color);});},

 };
}
