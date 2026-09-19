# Yard

Talk to a Fort Worth–style data center. The plant updates. You download a GLTF.

**Do not open `index.html` as a file.** ES modules need a local server.

```bash
cd prototypes/06-yard
python3 -m http.server 8766 --bind 0.0.0.0
```

Then open **http://127.0.0.1:8766/**

Or from the prototypes folder: **http://127.0.0.1:8766/06-yard/**

Drag the canvas to orbit. If you only see the header and no 3D, the server is not serving this folder.


Examples: `make DC1 8m taller`, `add a data hall`, `more generators`, `move the pond west 40m`, `hide the fence`, `paint DC1 red`, `reset`.

Edits are a campus JSON (`campus.mjs`), not a live LLM. The 3D mesh and `.glb` are rebuilt from that spec.
