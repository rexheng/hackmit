# OCFO Virtual Close

Playable prototype of a **virtual Office of the CFO**: MuJoCo office + flying ragdoll + a close agent that fails, explains, and rewrites itself.

## Run the office (browser)

Serve this folder (modules + JSON trajectories):

```bash
python3 sim/serve.py
# → http://127.0.0.1:8060/
```

Open `index.html` via that server. **Run one close**, then **Learn × 12**.

## Run the agent / physics (Python)

```bash
pip install -r requirements.txt
python3 -m pytest tests -q
python3 sim/run_close.py          # curriculum + MuJoCo flight JSON
python3 sim/office.py             # write sim/office.xml
```

Optional Blender bake:

```bash
blender --background --python sim/blender_office.py
```

## Layout

| Path | What |
|---|---|
| `index.html` | Executive-suite twin + HUD |
| `sim/agent.py` | Close workflow + policy patches |
| `sim/books.py` | Messy bank / GL / AP |
| `sim/office.py` | MJCF builder |
| `sim/physics.py` | Flying ragdoll |
| `trajectories/` | Recorded MuJoCo flights + curriculum |
