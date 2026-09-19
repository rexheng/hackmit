"""Optional Blender bake of the same CFO office (run inside Blender).

Creates the walnut slat wall, planter, taupe millwork, leather desk and
exports `assets/cfo_office.glb` for Three.js. The live prototype does not
require Blender — MuJoCo MJCF + procedural Three.js are the runtime meshes.
"""

from __future__ import annotations

# This file is valid both as a Blender bpy script and as documentation.


def mesh_recipe() -> list[dict]:
    """Authoring recipe matching office.xml / the reference interior."""
    return [
        {"name": "floor", "kind": "box", "size": (8.4, 6.4, 0.08), "pos": (0, 0, 0), "color": (0.86, 0.78, 0.64)},
        {"name": "slat_wall", "kind": "slats", "count": 16, "pos": (-3.55, 0, 1.35), "color": (0.42, 0.30, 0.20)},
        {"name": "planter", "kind": "box", "size": (0.56, 2.1, 0.44), "pos": (-3.15, 0.15, 0.22), "color": (0.22, 0.22, 0.22)},
        {"name": "hedge", "kind": "box", "size": (0.44, 1.9, 1.1), "pos": (-3.15, 0.15, 0.95), "color": (0.22, 0.38, 0.24)},
        {"name": "desk", "kind": "rounded_box", "size": (2.7, 1.1, 0.1), "pos": (0.15, 0.35, 0.74), "color": (0.82, 0.80, 0.77)},
        {"name": "chair", "kind": "rounded_box", "size": (0.44, 0.44, 0.1), "pos": (0.15, 1.05, 0.48), "color": (0.84, 0.82, 0.79)},
        {"name": "cabinets", "kind": "box", "size": (3.1, 0.36, 3.1), "pos": (1.85, 2.28, 1.55), "color": (0.48, 0.45, 0.43)},
        {"name": "bookshelf", "kind": "box", "size": (0.44, 0.36, 2.7), "pos": (0.22, 2.28, 1.55), "color": (0.40, 0.28, 0.18)},
        {"name": "sideboard", "kind": "box", "size": (2.3, 0.56, 0.64), "pos": (2.05, 1.95, 0.32), "color": (0.94, 0.93, 0.91)},
        {"name": "coffee_table", "kind": "box", "size": (1.4, 0.9, 0.16), "pos": (-0.15, -1.85, 0.18), "color": (0.12, 0.12, 0.12)},
        {"name": "ragdoll_torso", "kind": "capsule", "size": (0.11, 0.34), "pos": (0.1, 0.2, 1.55), "color": (0.78, 0.74, 0.70)},
    ]


def run_blender_export(out_path: str = "assets/cfo_office.glb") -> None:
    try:
        import bpy  # type: ignore
        from mathutils import Vector  # type: ignore
    except ImportError as exc:
        raise SystemExit("Run this inside Blender: blender --background --python blender_office.py") from exc

    bpy.ops.wm.read_factory_settings(use_empty=True)

    def rgb(c):
        mat = bpy.data.materials.new(name=f"m_{c}")
        mat.use_nodes = True
        bsdf = mat.node_tree.nodes["Principled BSDF"]
        bsdf.inputs["Base Color"].default_value = (*c, 1.0)
        bsdf.inputs["Roughness"].default_value = 0.45
        return mat

    for spec in mesh_recipe():
        if spec["kind"] in ("box", "rounded_box"):
            bpy.ops.mesh.primitive_cube_add(size=1, location=spec["pos"])
            ob = bpy.context.active_object
            sx, sy, sz = spec["size"]
            ob.scale = Vector((sx / 2, sy / 2, sz / 2))
            ob.name = spec["name"]
            ob.data.materials.append(rgb(spec["color"]))
        elif spec["kind"] == "slats":
            for i in range(spec["count"]):
                y = -1.55 + i * 0.13
                bpy.ops.mesh.primitive_cube_add(size=1, location=(-3.55, y, 1.35))
                ob = bpy.context.active_object
                ob.scale = Vector((0.025, 0.035, 1.35))
                ob.name = f"slat_{i}"
                ob.data.materials.append(rgb(spec["color"]))
        elif spec["kind"] == "capsule":
            bpy.ops.mesh.primitive_uv_sphere_add(radius=spec["size"][0], location=spec["pos"])
            bpy.context.active_object.name = spec["name"]
            bpy.context.active_object.data.materials.append(rgb(spec["color"]))

    bpy.ops.export_scene.gltf(filepath=out_path, export_format="GLB")


if __name__ == "__main__":
    try:
        run_blender_export()
    except SystemExit:
        print("Blender not attached. Recipe nodes:", len(mesh_recipe()))
