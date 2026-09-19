# Yard

Talk to a Fort Worth–style data center. The plant updates. You download a GLTF.

Open `index.html` over HTTP (modules):

```bash
python3 -m http.server 8766 --directory prototypes
# http://127.0.0.1:8766/06-yard/
```

Examples: `make DC1 8m taller`, `add a data hall`, `more generators`, `move the pond west 40m`, `hide the fence`, `paint DC1 red`, `reset`.

Edits are a campus JSON (`campus.mjs`), not a live LLM. The 3D mesh and `.glb` are rebuilt from that spec.
