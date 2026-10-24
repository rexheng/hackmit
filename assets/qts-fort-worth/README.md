# QTS Fort Worth FTW1 — glTF

End file: **`qts-fort-worth-ftw1.glb`**

Blender: File → Import → glTF 2.0.

This is **exterior massing of QTS FTW1** (14100 / 14052 Park Vista Blvd, Fort Worth), not an operator as-built, and not interiors or security drawings.

## Pipeline (what actually ran)

| You asked for | What this environment has | What we used |
|---|---|---|
| Blender MCP | No Blender MCP server on this agent | **Blender 4.0.2 headless** (`blender_build_qts_ftw1.py`) |
| Cesium satellite, not Google Maps API | No Cesium ion token | **Esri World Imagery WMTS** (the imagery layer CesiumJS uses without Google) at z18 over OSM centroid `32.988821, -97.259344` |
| World Labs world model | No Marble API | `world_model.json` — geolocated scene graph driving the Blender file |
| Nano Banana 2D front/right/back/left | Replicate `predictions.create` is blocked | Four elevation stills + `ref/qts-ftw1-nanobanana-2x2.jpg`, then gensets / glass office / roof coolers in Blender |

## Site facts baked in

- OSM way `507673437` named **QTS Data Center** (~279k sf footprint) extruded 14 m (2-story)
- OSM industrial way south as DC2 massing
- TAD / QTS: 52-acre campus, on-site substation, DC2 TDLR 471,876 sf
- Generator farm on the south side as in the Esri tile and the rear elevation

Rebuild:

```bash
blender --background --python assets/qts-fort-worth/blender_build_qts_ftw1.py
```
