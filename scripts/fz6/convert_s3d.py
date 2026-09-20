"""Local inspection conversion of Satyam/S3D's FZ6 2008 asset.
Input is a downloaded .blend; embedded Python is disabled. No mesh decimation.
Output stays in gitignored local-assets and is served only by the local dev server.
Source licence: CC BY-NC-ND 4.0. Do not publish this adaptation without permission.
"""
import bpy,bmesh,json,sys
from collections import defaultdict
from pathlib import Path
bpy.context.preferences.filepaths.use_scripts_auto_execute=False
bpy.ops.wm.open_mainfile(filepath=sys.argv[1],load_ui=False,use_scripts=False)
materials=[]
for m in bpy.data.materials:
 if not m.node_tree: continue
 nodes=m.node_tree.nodes
 shaders=[n for n in nodes if n.type=='BSDF_PRINCIPLED']
 if not shaders:continue
 shader=shaders[0]
 materials.append({'name':m.name,'color':list(shader.inputs['Base Color'].default_value),'metallic':shader.inputs['Metallic'].default_value,'roughness':shader.inputs['Roughness'].default_value,'colorLink':[l.from_node.name for l in shader.inputs['Base Color'].links]})
 # glTF has one PBR surface; use the existing underlying Principled material.
 output=next((n for n in nodes if n.type=='OUTPUT_MATERIAL' and n.is_active_output),None)
 if output:bpy.data.materials[m.name].node_tree.links.new(shader.outputs['BSDF'],output.inputs['Surface'])
 # Unsupported volume/layered transparency is approximated for inspection.
 if 'vehglass' in m.name:
  shader.inputs['Alpha'].default_value=.30
  shader.inputs['Transmission Weight'].default_value=.15
 if m.name=='mesh':
  for l in list(shader.inputs['Base Color'].links):m.node_tree.links.remove(l)
  shader.inputs['Base Color'].default_value=(.009,.022,.20,1)
  shader.inputs['Metallic'].default_value=.35
  shader.inputs['Roughness'].default_value=.27
  shader.inputs['Coat Weight'].default_value=1
for image in bpy.data.images:
 if image.size[0] and max(image.size)>2048:
  factor=2048/max(image.size);image.scale(round(image.size[0]*factor),round(image.size[1]*factor))
# Separate actual disconnected fork pieces before export so picking can target
# calipers independently. These are visual assembly labels, not OEM verification.
fork=bpy.data.objects.get('forks_l')
if fork:
 parent=list(range(len(fork.data.vertices)))
 def find(i):
  while parent[i]!=i:parent[i]=parent[parent[i]];i=parent[i]
  return i
 for edge in fork.data.edges:
  a,b=map(find,edge.vertices);parent[a]=b
 islands=defaultdict(list)
 for v in fork.data.vertices:islands[find(v.index)].append(fork.matrix_world@v.co)
 labels={}
 for key,points in islands.items():
  lo=[min(p[k] for p in points) for k in range(3)];hi=[max(p[k] for p in points) for k in range(3)]
  center=[(lo[k]+hi[k])/2 for k in range(3)];size=[hi[k]-lo[k] for k in range(3)]
  label='fork'
  if size[1]>.40 and size[0]>.15 and hi[2]<.69:label='front-fender'
  elif .53<center[1]<.666 and center[2]<.495 and size[2]<.21:label='front-brake'
  labels[key]=label
 face_labels=[labels[find(face.vertices[0])] for face in fork.data.polygons]
 for label in sorted(set(face_labels)):
  bm=bmesh.new();bm.from_mesh(fork.data);bm.faces.ensure_lookup_table()
  bmesh.ops.delete(bm,geom=[face for face in bm.faces if face_labels[face.index]!=label],context='FACES')
  bmesh.ops.delete(bm,geom=[v for v in bm.verts if not v.link_faces],context='VERTS')
  data=bpy.data.meshes.new('FZ6_'+label);bm.to_mesh(data);bm.free()
  for material in fork.data.materials:data.materials.append(material)
  part=fork.copy();part.data=data;part.name='FZ6_'+label;part.parent=None;part.matrix_world=fork.matrix_world.copy();bpy.context.collection.objects.link(part)
 bpy.data.objects.remove(fork,do_unlink=True)
# Remove the studio and rig, preserving evaluated, fully detailed visible geometry.
for o in list(bpy.data.objects):
 if o.type!='MESH' or o.name=='Plane':bpy.data.objects.remove(o,do_unlink=True)
bpy.ops.object.select_all(action='SELECT')
for o in bpy.context.selected_objects:
 o['sourceObject']=o.name
 o['geometryStatus']='unverified-artistic-model'
 for mod in list(o.modifiers):
  if mod.type=='ARMATURE':o.modifiers.remove(mod)
output=Path('web/local-assets/fz6-s3d.glb').resolve()
bpy.ops.export_scene.gltf(filepath=str(output),export_format='GLB',use_selection=True,export_apply=True,export_animations=False,export_skins=False,export_extras=True,export_yup=True,export_image_format='AUTO')
Path('/tmp/fz6-material-inputs.json').write_text(json.dumps(materials,indent=2))
print('EXPORTED',output,output.stat().st_size)
