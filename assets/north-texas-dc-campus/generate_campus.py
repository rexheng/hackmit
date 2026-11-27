#!/usr/bin/env python3
"""Build a composite North Texas hyperscale data-center campus as glTF 2.0 (.glb).

Not a real facility. Layout matches the public-facing campus pattern:
windowless data hall + glass office headhouse + generator yard + AIS
substation + parking + detention + perimeter fence.

Units: meters. glTF Y-up. Origin at campus center, ground at Y=0.
"""

from __future__ import annotations

import json
import math
import struct
from pathlib import Path

ROOT = Path(__file__).resolve().parent
OUT_GLB = ROOT / "north-texas-dc-campus.glb"

# ---------------------------------------------------------------------------
# Materials (PBR). Colors chosen from Texas DFW / Corgan / Midlothian photos.
# ---------------------------------------------------------------------------

MATERIALS = {
    "grass": dict(color=(0.42, 0.45, 0.28, 1), metallic=0.0, roughness=0.92),
    "asphalt": dict(color=(0.18, 0.18, 0.19, 1), metallic=0.0, roughness=0.88),
    "concrete": dict(color=(0.72, 0.70, 0.64, 1), metallic=0.0, roughness=0.78),
    "precast": dict(color=(0.78, 0.76, 0.70, 1), metallic=0.02, roughness=0.62),
    "imp_metal": dict(color=(0.58, 0.62, 0.66, 1), metallic=0.35, roughness=0.42),
    "navy_accent": dict(color=(0.10, 0.18, 0.32, 1), metallic=0.15, roughness=0.45),
    "glass": dict(color=(0.35, 0.48, 0.55, 0.42), metallic=0.55, roughness=0.12),
    "glass_frame": dict(color=(0.22, 0.24, 0.26, 1), metallic=0.7, roughness=0.28),
    "tpo_roof": dict(color=(0.90, 0.89, 0.86, 1), metallic=0.05, roughness=0.55),
    "genset": dict(color=(0.74, 0.70, 0.58, 1), metallic=0.2, roughness=0.55),
    "stack": dict(color=(0.45, 0.46, 0.48, 1), metallic=0.75, roughness=0.28),
    "steel": dict(color=(0.50, 0.52, 0.54, 1), metallic=0.65, roughness=0.32),
    "water": dict(color=(0.28, 0.42, 0.48, 0.85), metallic=0.1, roughness=0.18),
    "fence": dict(color=(0.08, 0.08, 0.09, 1), metallic=0.4, roughness=0.5),
    "stripe": dict(color=(0.85, 0.72, 0.18, 1), metallic=0.05, roughness=0.45),
    "oak_bark": dict(color=(0.32, 0.22, 0.12, 1), metallic=0.0, roughness=0.9),
    "oak_leaf": dict(color=(0.28, 0.38, 0.18, 1), metallic=0.0, roughness=0.85),
    "dirt": dict(color=(0.45, 0.38, 0.26, 1), metallic=0.0, roughness=0.95),
    "hvac": dict(color=(0.82, 0.83, 0.84, 1), metallic=0.25, roughness=0.4),
    "insulator": dict(color=(0.72, 0.22, 0.16, 1), metallic=0.05, roughness=0.4),
}


class Mesh:
    def __init__(self, name: str, material: str):
        self.name = name
        self.material = material
        self.positions: list[float] = []
        self.normals: list[float] = []
        self.uvs: list[float] = []
        self.indices: list[int] = []

    def _v(self, p, n, uv) -> int:
        i = len(self.positions) // 3
        self.positions.extend(p)
        self.normals.extend(n)
        self.uvs.extend(uv)
        return i

    def add_tri(self, a, na, ua, b, nb, ub, c, nc, uc):
        ia, ib, ic = self._v(a, na, ua), self._v(b, nb, ub), self._v(c, nc, uc)
        self.indices.extend((ia, ib, ic))

    def add_quad(self, p00, p10, p11, p01, n, uv_scale=(1.0, 1.0)):
        sx, sy = uv_scale
        self.add_tri(p00, n, (0, 0), p10, n, (sx, 0), p11, n, (sx, sy))
        self.add_tri(p00, n, (0, 0), p11, n, (sx, sy), p01, n, (0, sy))

    def add_box(self, cx, cy, cz, sx, sy, sz, uv=1.0):
        hx, hy, hz = sx * 0.5, sy * 0.5, sz * 0.5
        x0, x1 = cx - hx, cx + hx
        y0, y1 = cy - hy, cy + hy
        z0, z1 = cz - hz, cz + hz
        # +X -X +Y -Y +Z -Z
        faces = [
            ((x1, y0, z1), (x1, y0, z0), (x1, y1, z0), (x1, y1, z1), (1, 0, 0), (sz, sy)),
            ((x0, y0, z0), (x0, y0, z1), (x0, y1, z1), (x0, y1, z0), (-1, 0, 0), (sz, sy)),
            ((x0, y1, z1), (x1, y1, z1), (x1, y1, z0), (x0, y1, z0), (0, 1, 0), (sx, sz)),
            ((x0, y0, z0), (x1, y0, z0), (x1, y0, z1), (x0, y0, z1), (0, -1, 0), (sx, sz)),
            ((x0, y0, z1), (x1, y0, z1), (x1, y1, z1), (x0, y1, z1), (0, 0, 1), (sx, sy)),
            ((x1, y0, z0), (x0, y0, z0), (x0, y1, z0), (x1, y1, z0), (0, 0, -1), (sx, sy)),
        ]
        for p00, p10, p11, p01, n, (us, vs) in faces:
            self.add_quad(p00, p10, p11, p01, n, (us * uv * 0.08, vs * uv * 0.08))

    def add_cylinder(self, cx, cy, cz, radius, height, segments=16, cap=True):
        y0, y1 = cy - height * 0.5, cy + height * 0.5
        for i in range(segments):
            a0 = 2 * math.pi * i / segments
            a1 = 2 * math.pi * (i + 1) / segments
            x0, z0 = cx + radius * math.cos(a0), cz + radius * math.sin(a0)
            x1, z1 = cx + radius * math.cos(a1), cz + radius * math.sin(a1)
            n0 = (math.cos(a0), 0.0, math.sin(a0))
            n1 = (math.cos(a1), 0.0, math.sin(a1))
            u0, u1 = i / segments, (i + 1) / segments
            self.add_tri(
                (x0, y0, z0), n0, (u0, 0),
                (x1, y0, z1), n1, (u1, 0),
                (x1, y1, z1), n1, (u1, 1),
            )
            self.add_tri(
                (x0, y0, z0), n0, (u0, 0),
                (x1, y1, z1), n1, (u1, 1),
                (x0, y1, z0), n0, (u0, 1),
            )
            if cap:
                up, dn = (0, 1, 0), (0, -1, 0)
                self.add_tri(
                    (cx, y1, cz), up, (0.5, 0.5),
                    (x0, y1, z0), up, (0.5 + 0.5 * math.cos(a0), 0.5 + 0.5 * math.sin(a0)),
                    (x1, y1, z1), up, (0.5 + 0.5 * math.cos(a1), 0.5 + 0.5 * math.sin(a1)),
                )
                self.add_tri(
                    (cx, y0, cz), dn, (0.5, 0.5),
                    (x1, y0, z1), dn, (0.5 + 0.5 * math.cos(a1), 0.5 + 0.5 * math.sin(a1)),
                    (x0, y0, z0), dn, (0.5 + 0.5 * math.cos(a0), 0.5 + 0.5 * math.sin(a0)),
                )

    def add_ellipsoid(self, cx, cy, cz, rx, ry, rz, seg=10, rings=8):
        def pt(lat, lon):
            la = math.pi * (lat / rings - 0.5)
            lo = 2 * math.pi * lon / seg
            x = cx + rx * math.cos(la) * math.cos(lo)
            y = cy + ry * math.sin(la)
            z = cz + rz * math.cos(la) * math.sin(lo)
            nx, ny, nz = (x - cx) / rx, (y - cy) / ry, (z - cz) / rz
            l = math.sqrt(nx * nx + ny * ny + nz * nz) or 1
            return (x, y, z), (nx / l, ny / l, nz / l)

        for r in range(rings):
            for s in range(seg):
                p00, n00 = pt(r, s)
                p10, n10 = pt(r, s + 1)
                p11, n11 = pt(r + 1, s + 1)
                p01, n01 = pt(r + 1, s)
                u0, u1 = s / seg, (s + 1) / seg
                v0, v1 = r / rings, (r + 1) / rings
                self.add_tri(p00, n00, (u0, v0), p10, n10, (u1, v0), p11, n11, (u1, v1))
                self.add_tri(p00, n00, (u0, v0), p11, n11, (u1, v1), p01, n01, (u0, v1))


def pack_f32(values: list[float]) -> bytes:
    return struct.pack(f"<{len(values)}f", *values)


def pack_u32(values: list[int]) -> bytes:
    return struct.pack(f"<{len(values)}I", *values)


def bounds(values: list[float], stride: int) -> tuple[list[float], list[float]]:
    mn = [float("inf")] * stride
    mx = [float("-inf")] * stride
    for i in range(0, len(values), stride):
        for k in range(stride):
            v = values[i + k]
            mn[k] = min(mn[k], v)
            mx[k] = max(mx[k], v)
    return mn, mx


def build_glb(meshes: list[Mesh], nodes_spec: list[dict]) -> bytes:
    """nodes_spec: {name, mesh_index or None, children[], extras?} with mesh_index into meshes."""
    bin_chunks: list[bytes] = []
    offset = 0
    buffer_views = []
    accessors = []
    gltf_meshes = []

    def add_view(data: bytes, target: int | None) -> int:
        nonlocal offset
        pad = (4 - (len(data) % 4)) % 4
        idx = len(buffer_views)
        view = {"buffer": 0, "byteOffset": offset, "byteLength": len(data)}
        if target is not None:
            view["target"] = target
        buffer_views.append(view)
        bin_chunks.append(data + b"\x00" * pad)
        offset += len(data) + pad
        return idx

    mat_names = list(dict.fromkeys(m.material for m in meshes))
    mat_index = {n: i for i, n in enumerate(mat_names)}
    gltf_materials = []
    for name in mat_names:
        spec = MATERIALS[name]
        r, g, b, a = spec["color"]
        mat = {
            "name": name,
            "pbrMetallicRoughness": {
                "baseColorFactor": [r, g, b, a],
                "metallicFactor": spec["metallic"],
                "roughnessFactor": spec["roughness"],
            },
        }
        if a < 0.999:
            mat["alphaMode"] = "BLEND"
            mat["doubleSided"] = True
        gltf_materials.append(mat)

    for mesh in meshes:
        if not mesh.indices:
            raise ValueError(f"empty mesh {mesh.name}")
        pos_b = pack_f32(mesh.positions)
        nrm_b = pack_f32(mesh.normals)
        uv_b = pack_f32(mesh.uvs)
        idx_b = pack_u32(mesh.indices)
        pos_view = add_view(pos_b, 34962)
        nrm_view = add_view(nrm_b, 34962)
        uv_view = add_view(uv_b, 34962)
        idx_view = add_view(idx_b, 34963)
        pos_min, pos_max = bounds(mesh.positions, 3)
        acc0 = len(accessors)
        accessors.append(
            {
                "bufferView": pos_view,
                "componentType": 5126,
                "count": len(mesh.positions) // 3,
                "type": "VEC3",
                "min": pos_min,
                "max": pos_max,
            }
        )
        accessors.append(
            {
                "bufferView": nrm_view,
                "componentType": 5126,
                "count": len(mesh.normals) // 3,
                "type": "VEC3",
            }
        )
        accessors.append(
            {
                "bufferView": uv_view,
                "componentType": 5126,
                "count": len(mesh.uvs) // 2,
                "type": "VEC2",
            }
        )
        accessors.append(
            {
                "bufferView": idx_view,
                "componentType": 5125,
                "count": len(mesh.indices),
                "type": "SCALAR",
            }
        )
        gltf_meshes.append(
            {
                "name": mesh.name,
                "primitives": [
                    {
                        "attributes": {
                            "POSITION": acc0,
                            "NORMAL": acc0 + 1,
                            "TEXCOORD_0": acc0 + 2,
                        },
                        "indices": acc0 + 3,
                        "material": mat_index[mesh.material],
                    }
                ],
            }
        )

    blob = b"".join(bin_chunks)
    gltf_nodes = []
    for spec in nodes_spec:
        node: dict = {"name": spec["name"]}
        if spec.get("mesh") is not None:
            node["mesh"] = spec["mesh"]
        if spec.get("children"):
            node["children"] = spec["children"]
        elif "children" in spec:
            spec.pop("children", None)
        if spec.get("translation"):
            node["translation"] = spec["translation"]
        if spec.get("extras"):
            node["extras"] = spec["extras"]
        gltf_nodes.append(node)

    root_children = [i for i, n in enumerate(nodes_spec) if n.get("parent") is None]
    doc = {
        "asset": {
            "version": "2.0",
            "generator": "hackmit/assets/north-texas-dc-campus",
            "extras": {
                "disclaimer": "COMPOSITE typical North Texas hyperscale campus. Not a real operator as-built.",
            },
        },
        "scene": 0,
        "scenes": [
            {
                "name": "NorthTexasDC_Composite",
                "nodes": root_children,
                "extras": {
                    "units": "meters",
                    "up": "Y",
                    "region": "North Texas / DFW fringe (composite)",
                },
            }
        ],
        "nodes": gltf_nodes,
        "meshes": gltf_meshes,
        "materials": gltf_materials,
        "accessors": accessors,
        "bufferViews": buffer_views,
        "buffers": [{"byteLength": len(blob)}],
    }
    json_bytes = json.dumps(doc, separators=(",", ":")).encode("utf-8")
    json_pad = (4 - (len(json_bytes) % 4)) % 4
    json_bytes += b" " * json_pad
    bin_pad = (4 - (len(blob) % 4)) % 4
    blob += b"\x00" * bin_pad
    total = 12 + 8 + len(json_bytes) + 8 + len(blob)
    header = struct.pack("<4sII", b"glTF", 2, total)
    json_chunk = struct.pack("<I4s", len(json_bytes), b"JSON") + json_bytes
    bin_chunk = struct.pack("<I4s", len(blob), b"BIN\x00") + blob
    return header + json_chunk + bin_chunk, doc, blob


# ---------------------------------------------------------------------------
# Campus construction
# ---------------------------------------------------------------------------

def make_campus() -> tuple[list[Mesh], list[dict]]:
    meshes: list[Mesh] = []
    nodes: list[dict] = []

    def add_mesh(mesh: Mesh, parent_name: str):
        mi = len(meshes)
        meshes.append(mesh)
        ni = len(nodes)
        nodes.append({"name": mesh.name, "mesh": mi, "parent": parent_name, "children": []})
        return ni

    groups: dict[str, int] = {}

    def group(name: str, parent: str | None = None, extras=None) -> str:
        idx = len(nodes)
        nodes.append(
            {
                "name": name,
                "mesh": None,
                "parent": parent,
                "children": [],
                "extras": extras,
            }
        )
        groups[name] = idx
        return name

    def wire_parents():
        for i, n in enumerate(nodes):
            p = n.get("parent")
            if p is None:
                continue
            # parent may be name
            if isinstance(p, str):
                pi = groups[p]
                nodes[pi]["children"].append(i)

    group("NorthTexasDC_Composite", None, extras={"composite": True, "not_a_real_site": True})
    for g in (
        "Site",
        "Building",
        "Power",
        "Security",
        "Landscape",
    ):
        group(g, "NorthTexasDC_Composite")

    # --- Site ---
    grass = Mesh("Lot_PrairieGrass", "grass")
    grass.add_box(0, -0.15, 0, 260, 0.3, 200, uv=0.4)
    add_mesh(grass, "Site")

    berm = Mesh("StreetBerm_West", "dirt")
    berm.add_box(-118, 0.6, 0, 12, 1.2, 160)
    add_mesh(berm, "Site")

    road = Mesh("ParkVista_Boulevard", "asphalt")
    road.add_box(-132, 0.05, 0, 16, 0.1, 200)
    add_mesh(road, "Site")

    drive = Mesh("EntryDrive", "asphalt")
    drive.add_box(-90, 0.06, 8, 50, 0.12, 10)
    add_mesh(drive, "Site")

    apron = Mesh("ServiceApron", "asphalt")
    apron.add_box(8, 0.06, 42, 130, 0.12, 28)
    add_mesh(apron, "Site")

    parking = Mesh("StaffParking", "asphalt")
    parking.add_box(-72, 0.06, 48, 55, 0.12, 42)
    add_mesh(parking, "Site")

    # parking stripes
    stripes = Mesh("ParkingStripes", "stripe")
    for i in range(12):
        x = -92 + i * 4.2
        stripes.add_box(x, 0.13, 48, 0.12, 0.02, 36)
    add_mesh(stripes, "Site")

    pond = Mesh("DetentionPond", "water")
    pond.add_cylinder(78, -0.2, 62, 22, 0.6, segments=24)
    add_mesh(pond, "Site")

    pond_bank = Mesh("DetentionBank", "dirt")
    pond_bank.add_cylinder(78, 0.15, 62, 24.5, 0.4, segments=24)
    add_mesh(pond_bank, "Site")

    # expansion pad
    pad = Mesh("ExpansionPad_Building2", "concrete")
    pad.add_box(95, 0.08, -8, 70, 0.16, 70)
    add_mesh(pad, "Site")

    # --- Building: data hall ---
    hall_w, hall_d, hall_h = 122.0, 52.0, 14.0
    hall_x, hall_z = 8.0, -6.0
    hall = Mesh("DataHall_TiltWall", "precast")
    hall.add_box(hall_x, hall_h / 2, hall_z, hall_w, hall_h, hall_d)
    add_mesh(hall, "Building")

    # IMP side cladding strips
    imp = Mesh("DataHall_IMPCladding", "imp_metal")
    imp.add_box(hall_x, 7.0, hall_z + hall_d / 2 + 0.12, hall_w - 4, 10, 0.2)
    imp.add_box(hall_x, 7.0, hall_z - hall_d / 2 - 0.12, hall_w - 4, 10, 0.2)
    add_mesh(imp, "Building")

    band = Mesh("DataHall_NavyAccent", "navy_accent")
    band.add_box(hall_x, 8.2, hall_z + hall_d / 2 + 0.22, hall_w - 2, 0.6, 0.12)
    band.add_box(hall_x, 8.2, hall_z - hall_d / 2 - 0.22, hall_w - 2, 0.6, 0.12)
    add_mesh(band, "Building")

    roof = Mesh("DataHall_TPORoof", "tpo_roof")
    roof.add_box(hall_x, hall_h + 0.25, hall_z, hall_w + 1.2, 0.5, hall_d + 1.2)
    add_mesh(roof, "Building")

    parapet = Mesh("DataHall_Parapet", "precast")
    parapet.add_box(hall_x, hall_h + 1.1, hall_z + hall_d / 2 + 0.4, hall_w + 1.4, 1.4, 0.35)
    parapet.add_box(hall_x, hall_h + 1.1, hall_z - hall_d / 2 - 0.4, hall_w + 1.4, 1.4, 0.35)
    parapet.add_box(hall_x - hall_w / 2 - 0.4, hall_h + 1.1, hall_z, 0.35, 1.4, hall_d + 1.4)
    parapet.add_box(hall_x + hall_w / 2 + 0.4, hall_h + 1.1, hall_z, 0.35, 1.4, hall_d + 1.4)
    add_mesh(parapet, "Building")

    hvac = Mesh("Roof_DryCoolers", "hvac")
    cols, rows = 14, 5
    for i in range(cols):
        for j in range(rows):
            x = hall_x - 52 + i * 8.0
            z = hall_z - 16 + j * 8.0
            hvac.add_box(x, hall_h + 1.6, z, 5.5, 2.2, 4.2)
            # fan cylinders on top
            hvac.add_cylinder(x - 1.2, hall_h + 2.9, z, 0.9, 0.45, 10, cap=True)
            hvac.add_cylinder(x + 1.2, hall_h + 2.9, z, 0.9, 0.45, 10, cap=True)
    add_mesh(hvac, "Building")

    # loading dock
    dock = Mesh("LoadingDock", "concrete")
    dock.add_box(hall_x + 20, 0.7, hall_z + hall_d / 2 + 6, 36, 1.4, 10)
    add_mesh(dock, "Building")

    dock_doors = Mesh("LoadingDock_Doors", "navy_accent")
    for i in range(4):
        dock_doors.add_box(hall_x + 8 + i * 8, 3.2, hall_z + hall_d / 2 + 0.2, 3.6, 4.2, 0.25)
    add_mesh(dock_doors, "Building")

    # --- Office headhouse ---
    ox, oz = -68.0, -6.0
    office = Mesh("OfficeHeadhouse_Mass", "precast")
    office.add_box(ox, 6.0, oz, 32, 12, 22)
    add_mesh(office, "Building")

    glass = Mesh("OfficeHeadhouse_CurtainWall", "glass")
    glass.add_box(ox - 16.15, 6.2, oz, 0.18, 10.5, 18)
    glass.add_box(ox, 6.2, oz - 11.15, 26, 10.5, 0.18)
    glass.add_box(ox, 6.2, oz + 11.15, 26, 10.5, 0.18)
    add_mesh(glass, "Building")

    mullion = Mesh("OfficeHeadhouse_Mullions", "glass_frame")
    for i in range(-4, 5):
        mullion.add_box(ox - 16.22, 6.2, oz + i * 2.0, 0.12, 10.6, 0.12)
    for j in range(4):
        mullion.add_box(ox - 16.22, 2.2 + j * 2.8, oz, 0.12, 0.12, 18)
    add_mesh(mullion, "Building")

    canopy = Mesh("Office_MetalCanopy", "imp_metal")
    canopy.add_box(ox - 20, 4.6, oz, 10, 0.25, 14)
    add_mesh(canopy, "Building")

    canopy_cols = Mesh("Office_CanopyColumns", "steel")
    canopy_cols.add_cylinder(ox - 23, 2.3, oz - 5, 0.18, 4.6, 10)
    canopy_cols.add_cylinder(ox - 23, 2.3, oz + 5, 0.18, 4.6, 10)
    add_mesh(canopy_cols, "Building")

    plaza = Mesh("OfficePlaza", "concrete")
    plaza.add_box(ox - 22, 0.08, oz, 18, 0.16, 28)
    add_mesh(plaza, "Building")

    office_roof = Mesh("Office_Roof", "tpo_roof")
    office_roof.add_box(ox, 12.3, oz, 33, 0.4, 23)
    add_mesh(office_roof, "Building")

    # --- Generator yard (north of hall) ---
    gens = Mesh("GeneratorYard_Enclosures", "genset")
    stacks = Mesh("GeneratorYard_Stacks", "stack")
    pads = Mesh("GeneratorYard_Pads", "concrete")
    screen = Mesh("GeneratorYard_ScreenWall", "imp_metal")
    gx0, gz0 = -40.0, -52.0
    n = 0
    for row in range(2):
        for col in range(12):
            x = gx0 + col * 8.2
            z = gz0 - row * 10.0
            pads.add_box(x, 0.2, z, 6.4, 0.4, 3.2)
            gens.add_box(x, 1.9, z, 5.6, 3.0, 2.4)
            stacks.add_cylinder(x + 2.0, 5.4, z, 0.28, 4.2, 10)
            n += 1
    add_mesh(pads, "Power")
    add_mesh(gens, "Power")
    add_mesh(stacks, "Power")
    screen.add_box(8, 4.0, gz0 + 8.5, 110, 8.0, 0.35)
    screen.add_box(-48, 4.0, gz0 - 5, 0.35, 8.0, 22)
    screen.add_box(64, 4.0, gz0 - 5, 0.35, 8.0, 22)
    add_mesh(screen, "Power")

    switch = Mesh("SwitchgearYard", "steel")
    for i in range(8):
        switch.add_box(58 + (i % 4) * 4.5, 1.8, -48 - (i // 4) * 5, 3.2, 3.4, 2.2)
    add_mesh(switch, "Power")

    xfmr = Mesh("TransformerPads", "steel")
    for i in range(6):
        xfmr.add_box(78 + (i % 3) * 6, 1.6, -46 - (i // 3) * 6.5, 3.6, 3.0, 3.0)
    add_mesh(xfmr, "Power")

    # AIS substation NE
    sub_pad = Mesh("Substation_Pad", "concrete")
    sub_pad.add_box(108, 0.25, -62, 42, 0.5, 36)
    add_mesh(sub_pad, "Power")

    ganty = Mesh("Substation_Gantry", "steel")
    for x in (92, 124):
        ganty.add_box(x, 8, -62, 0.5, 16, 0.5)
        ganty.add_box(x, 8, -48, 0.5, 16, 0.5)
    ganty.add_box(108, 15.8, -62, 33, 0.4, 0.4)
    ganty.add_box(108, 15.8, -48, 33, 0.4, 0.4)
    ganty.add_box(92, 15.8, -55, 0.4, 0.4, 14)
    ganty.add_box(124, 15.8, -55, 0.4, 0.4, 14)
    add_mesh(ganty, "Power")

    bus = Mesh("Substation_Bus", "stack")
    for i in range(5):
        bus.add_box(98 + i * 5, 12.5, -55, 0.15, 0.15, 12)
    add_mesh(bus, "Power")

    ins = Mesh("Substation_Insulators", "insulator")
    for i in range(5):
        for z in (-62.0, -48.0):
            ins.add_cylinder(98 + i * 5, 9.2, z, 0.18, 3.5, 8)
    add_mesh(ins, "Power")

    big_xfmr = Mesh("Substation_MainTransformers", "steel")
    big_xfmr.add_box(100, 3.2, -70, 6, 6, 5)
    big_xfmr.add_box(112, 3.2, -70, 6, 6, 5)
    add_mesh(big_xfmr, "Power")

    # transmission poles along north
    poles = Mesh("TransmissionPoles", "steel")
    for i, x in enumerate((-40, 20, 80, 130)):
        poles.add_cylinder(x, 12, -92, 0.45, 24, 10)
        poles.add_box(x, 22, -92, 10, 0.25, 0.25)
    add_mesh(poles, "Power")

    # --- Fence ---
    fence = Mesh("PerimeterFence", "fence")
    # west, east, north, south runs
    fence.add_box(-108, 1.5, 0, 0.08, 3.0, 176)
    fence.add_box(128, 1.5, 0, 0.08, 3.0, 176)
    fence.add_box(10, 1.5, -88, 236, 3.0, 0.08)
    fence.add_box(10, 1.5, 88, 236, 3.0, 0.08)
    add_mesh(fence, "Security")

    posts = Mesh("FencePosts", "fence")
    for x in range(-108, 129, 8):
        posts.add_box(x, 1.6, -88, 0.12, 3.2, 0.12)
        posts.add_box(x, 1.6, 88, 0.12, 3.2, 0.12)
    for z in range(-88, 89, 8):
        posts.add_box(-108, 1.6, z, 0.12, 3.2, 0.12)
        posts.add_box(128, 1.6, z, 0.12, 3.2, 0.12)
    add_mesh(posts, "Security")

    gate = Mesh("SallyPort_Gate", "steel")
    gate.add_box(-108, 1.6, 8, 0.2, 3.2, 8)
    add_mesh(gate, "Security")

    gatehouse = Mesh("Gatehouse", "precast")
    gatehouse.add_box(-100, 1.8, 16, 6, 3.6, 5)
    add_mesh(gatehouse, "Security")
    gh_glass = Mesh("Gatehouse_Glass", "glass")
    gh_glass.add_box(-100, 2.2, 13.4, 5, 1.8, 0.12)
    add_mesh(gh_glass, "Security")

    # --- Trees (live oak masses along west berm) ---
    trunks = Mesh("LiveOak_Trunks", "oak_bark")
    canopy = Mesh("LiveOak_Canopies", "oak_leaf")
    oak_spots = [
        (-118, -70), (-116, -40), (-117, -10), (-115, 22), (-118, 50),
        (-118, 72), (20, 82), (50, 80), (-20, 84),
    ]
    for x, z in oak_spots:
        trunks.add_cylinder(x, 2.4, z, 0.45, 4.8, 8)
        canopy.add_ellipsoid(x, 6.8, z, 4.2, 3.2, 4.2, seg=8, rings=6)
    add_mesh(trunks, "Landscape")
    add_mesh(canopy, "Landscape")

    shrubs = Mesh("StreetShrubs", "oak_leaf")
    for i in range(10):
        shrubs.add_ellipsoid(-122, 0.7, -60 + i * 14, 1.4, 0.9, 1.4, seg=6, rings=4)
    add_mesh(shrubs, "Landscape")

    wire_parents()
    # convert parent names already done; root has parent None
    return meshes, nodes


def main() -> None:
    meshes, nodes = make_campus()
    glb, _doc, _blob = build_glb(meshes, nodes)
    OUT_GLB.write_bytes(glb)
    tris = sum(len(m.indices) // 3 for m in meshes)
    print(f"Wrote {OUT_GLB} ({len(glb):,} bytes)")
    print(f"{len(meshes)} meshes, {len(nodes)} nodes, {tris:,} triangles")


if __name__ == "__main__":
    main()
