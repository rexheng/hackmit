# North Texas data-center campus (composite glTF)

Blender-ready **glTF 2.0** of a typical DFW-fringe hyperscale campus: windowless data hall, glass office headhouse, screened generator yard, AIS substation, parking, detention pond, live oaks, perimeter fence.

**This is not a real operator as-built.** It is a composite from public campus patterns (QTS Fort Worth–scale hall, Corgan-style headhouse, Midlothian-style yard + substation). Do not treat dimensions as a specific site.

| File | Use |
|---|---|
| `north-texas-dc-campus.glb` | Drop into Blender, three.js, Godot, etc. |
| `generate_campus.py` | Regenerates the `.glb` (`python3 generate_campus.py`) |
| `viewer.html` | Local three.js orbit preview |

## Blender

1. File → Import → glTF 2.0 (`.glb`).
2. Units are **meters**. Importer converts glTF Y-up to Blender Z-up.
3. Outliner collections follow empties: `Site`, `Building`, `Power`, `Security`, `Landscape`.
4. Materials are simple PBR (precast, IMP metal, glass, TPO, genset beige, etc.). Rebind your own textures if you want photoreal.

Regenerate after edits:

```bash
python3 assets/north-texas-dc-campus/generate_campus.py
```

No extra Python packages. ~13k triangles, ~1.4 MB `.glb`. Blender imports `.glb` as glTF 2.0.
