"""Headless Blender build of QTS Fort Worth FTW1 from OSM + Esri (Cesium-style) imagery.

Usage:
  blender --background --python blender_build_qts_ftw1.py
"""

from __future__ import annotations

import json
import math
import os
import sys

import bpy
import bmesh
from mathutils import Vector

ROOT = os.path.dirname(os.path.abspath(__file__))
SITE = json.load(open(os.path.join(ROOT, "site.json"), encoding="utf-8"))
MOSAIC = os.path.join(ROOT, "ref", "qts-ftw1-esri-mosaic.jpg")
OUT = os.path.join(ROOT, "qts-fort-worth-ftw1.glb")


def reset_scene() -> None:
    bpy.ops.wm.read_factory_settings(use_empty=True)


def collection(name: str):
    col = bpy.data.collections.new(name)
    bpy.context.scene.collection.children.link(col)
    return col


def link(obj, col):
    col.objects.link(obj)
    if obj.name in bpy.context.scene.collection.objects:
        bpy.context.scene.collection.objects.unlink(obj)


def mat(name, color, metallic=0.0, roughness=0.5, alpha=1.0):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    p = m.node_tree.nodes["Principled BSDF"]
    p.inputs["Base Color"].default_value = (color[0], color[1], color[2], 1.0)
    p.inputs["Metallic"].default_value = metallic
    p.inputs["Roughness"].default_value = roughness
    if alpha < 0.999:
        p.inputs["Alpha"].default_value = alpha
        m.blend_method = "BLEND"
        m.shadow_method = "HASHED"
    return m


def extrude_ngon(name, pts_xy, height, material, z0=0.0):
    mesh = bpy.data.meshes.new(name)
    obj = bpy.data.objects.new(name, mesh)
    bm = bmesh.new()
    verts = [bm.verts.new((float(x), float(y), z0)) for x, y in pts_xy]
    try:
        bm.faces.new(verts)
    except ValueError:
        # fallback convex hull-ish: skip degenerate
        bm.free()
        raise
    geom = bmesh.ops.extrude_face_region(bm, geom=list(bm.faces))
    top = [v for v in geom["geom"] if isinstance(v, bmesh.types.BMVert)]
    bmesh.ops.translate(bm, verts=top, vec=(0.0, 0.0, height))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(mesh)
    bm.free()
    obj.data.materials.append(material)
    return obj


def add_box(name, loc, size, material):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc)
    obj = bpy.context.active_object
    obj.name = name
    obj.scale = size
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    obj.data.materials.append(material)
    return obj


def add_cylinder(name, loc, radius, depth, material, verts=12):
    bpy.ops.mesh.primitive_cylinder_add(
        vertices=verts, radius=radius, depth=depth, location=loc
    )
    obj = bpy.context.active_object
    obj.name = name
    obj.data.materials.append(material)
    return obj


def ground_from_mosaic(col, origin_lat, origin_lon, mats):
    """3x3 z18 Esri tiles: 256px, ~0.5 m/px at this latitude → 384 m square."""
    z = 18
    # mosaic NW tile
    tx0, ty0 = 60249, 105600
    n = 2 ** z

    def tile_nw(x, y):
        lon = x / n * 360.0 - 180.0
        lat = math.degrees(math.atan(math.sinh(math.pi * (1 - 2 * y / n))))
        return lat, lon

    m_lat = 111320.0
    m_lon = 111320.0 * math.cos(math.radians(origin_lat))

    def ll_xy(lat, lon):
        return (lon - origin_lon) * m_lon, (lat - origin_lat) * m_lat

    nw_lat, nw_lon = tile_nw(tx0, ty0)
    se_lat, se_lon = tile_nw(tx0 + 3, ty0 + 3)
    x0, y0 = ll_xy(nw_lat, nw_lon)
    x1, y1 = ll_xy(se_lat, se_lon)
    cx, cy = (x0 + x1) / 2.0, (y0 + y1) / 2.0
    sx, sy = abs(x1 - x0), abs(y1 - y0)

    bpy.ops.mesh.primitive_plane_add(size=1, location=(cx, cy, -0.05))
    ground = bpy.context.active_object
    ground.name = "EsriWorldImagery_Ground"
    ground.scale = (sx, sy, 1.0)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)

    img = bpy.data.images.load(MOSAIC)
    m = bpy.data.materials.new("Satellite")
    m.use_nodes = True
    nt = m.node_tree
    nt.nodes.clear()
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    bsdf = nt.nodes.new("ShaderNodeBsdfPrincipled")
    tex = nt.nodes.new("ShaderNodeTexImage")
    tex.image = img
    tex.interpolation = "Linear"
    uv = nt.nodes.new("ShaderNodeTexCoord")
    # Esri tiles: x east, y south in image space. Plane default UV is fine if we rotate 0.
    nt.links.new(uv.outputs["UV"], tex.inputs["Vector"])
    nt.links.new(tex.outputs["Color"], bsdf.inputs["Base Color"])
    bsdf.inputs["Roughness"].default_value = 0.95
    nt.links.new(bsdf.outputs["BSDF"], out.inputs["Surface"])
    ground.data.materials.append(m)
    link(ground, col)
    return ground


def build():
    reset_scene()
    site = collection("QTS_FortWorth_FTW1")
    bld = collection("Building")
    pwr = collection("Power")
    sec = collection("Security")
    lnd = collection("Landscape")
    for c in (bld, pwr, sec, lnd):
        site.children.link(c)

    precast = mat("precast", (0.78, 0.74, 0.66), 0.02, 0.62)
    tpo = mat("tpo", (0.88, 0.86, 0.82), 0.05, 0.55)
    glass = mat("glass", (0.22, 0.32, 0.38), 0.55, 0.12, alpha=0.45)
    navy = mat("navy", (0.10, 0.16, 0.28), 0.2, 0.4)
    genset = mat("genset", (0.76, 0.62, 0.52), 0.15, 0.55)
    stack = mat("stack", (0.55, 0.56, 0.58), 0.7, 0.28)
    steel = mat("steel", (0.48, 0.50, 0.52), 0.65, 0.32)
    fence = mat("fence", (0.08, 0.08, 0.09), 0.4, 0.5)
    asphalt = mat("asphalt", (0.16, 0.16, 0.17), 0.0, 0.9)
    grass = mat("grass", (0.35, 0.40, 0.22), 0.0, 0.92)
    hvac = mat("hvac", (0.82, 0.83, 0.84), 0.25, 0.4)

    origin_lat, origin_lon = SITE["origin_lat"], SITE["origin_lon"]
    ground_from_mosaic(lnd, origin_lat, origin_lon, None)

    dc1 = extrude_ngon("FTW1_DC1_OSM", SITE["dc1_osm_xy_m"], 14.0, precast)
    link(dc1, bld)
    # roof slab
    xs = [p[0] for p in SITE["dc1_osm_xy_m"]]
    ys = [p[1] for p in SITE["dc1_osm_xy_m"]]
    roof = add_box(
        "FTW1_DC1_TPORoof",
        ((min(xs) + max(xs)) / 2, (min(ys) + max(ys)) / 2, 14.25),
        ((max(xs) - min(xs)) * 0.92, (max(ys) - min(ys)) * 0.55, 0.5),
        tpo,
    )
    link(roof, bld)

    dc2 = extrude_ngon("FTW1_DC2_IndustrialOSM", SITE["dc2_osm_xy_m"], 14.0, precast)
    link(dc2, bld)

    # glass office at west notch of DC1 (from satellite + left elevation)
    office = add_box("FTW1_OfficeHeadhouse", (-70, -10, 6.0), (18, 22, 12), navy)
    link(office, bld)
    curtain = add_box("FTW1_CurtainWall", (-79.2, -10, 6.2), (0.3, 18, 10), glass)
    link(curtain, bld)

    # HVAC array on DC1 roof — matches right elevation
    hvac_parent = bpy.data.objects.new("FTW1_RoofDryCoolers", None)
    link(hvac_parent, bld)
    for i in range(10):
        for j in range(4):
            o = add_box(
                f"Cooler_{i}_{j}",
                (-40 + i * 12, -20 + j * 14, 16.2),
                (5.5, 4.0, 2.2),
                hvac,
            )
            o.parent = hvac_parent
            link(o, bld)

    # Generator farm south of DC1 — satellite tile y=105602 + back elevation
    gen_empty = bpy.data.objects.new("FTW1_GeneratorYard", None)
    link(gen_empty, pwr)
    n = 0
    for row in range(3):
        for col in range(14):
            x = -50 + col * 9.0
            y = -70 - row * 8.0
            pad = add_box(f"GenPad_{n}", (x, y, 0.15), (6.2, 3.0, 0.3), steel)
            body = add_box(f"Genset_{n}", (x, y, 1.7), (5.4, 2.4, 2.8), genset)
            stk = add_cylinder(f"Stack_{n}", (x + 1.8, y, 4.6), 0.22, 3.2, stack, verts=8)
            for o in (pad, body, stk):
                o.parent = gen_empty
                link(o, pwr)
            n += 1

    sub = add_box("FTW1_OnSiteSubstation", (130, 20, 3.5), (28, 22, 7), steel)
    link(sub, pwr)
    gantry = add_box("FTW1_SubstationGantry", (130, 20, 12), (24, 0.4, 16), steel)
    link(gantry, pwr)

    park = add_box("StaffParking", (-95, 40, 0.05), (50, 40, 0.1), asphalt)
    link(park, lnd)

    # perimeter
    for name, loc, scale in (
        ("Fence_N", (10, 130, 1.5), (280, 0.08, 3)),
        ("Fence_S", (20, -210, 1.5), (300, 0.08, 3)),
        ("Fence_W", (-130, -40, 1.5), (0.08, 340, 3)),
        ("Fence_E", (170, -40, 1.5), (0.08, 340, 3)),
    ):
        o = add_box(name, loc, scale, fence)
        link(o, sec)

    # extras
    bpy.context.scene["qts_ftw1_lat"] = origin_lat
    bpy.context.scene["qts_ftw1_lon"] = origin_lon
    bpy.context.scene["qts_ftw1_disclaimer"] = (
        "Exterior massing from OSM + Esri World Imagery. Not an operator as-built."
    )

    bpy.ops.object.select_all(action="DESELECT")
    os.makedirs(ROOT, exist_ok=True)
    bpy.ops.export_scene.gltf(
        filepath=OUT,
        export_format="GLB",
        export_apply=True,
        export_yup=True,
        export_extras=True,
    )
    print("WROTE", OUT, "bytes", os.path.getsize(OUT))


if __name__ == "__main__":
    try:
        build()
    except Exception as e:
        print("BUILD FAILED", e, file=sys.stderr)
        raise
