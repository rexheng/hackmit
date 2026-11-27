"""Record a curriculum of closes, fly the ragdoll, dump JSON for the web twin."""

from __future__ import annotations

import json
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))

from agent import CloseAgent  # noqa: E402
from physics import record_close_flight  # noqa: E402


def main() -> None:
    agent = CloseAgent()
    results = agent.curriculum(episodes=12, base_seed=11, difficulty=0.72)
    summary = agent.summary()
    out_dir = HERE.parent / "trajectories"
    out_dir.mkdir(exist_ok=True)

    compact = []
    for i, r in enumerate(results):
        compact.append(
            {
                "i": i,
                "seed": r.seed,
                "score": r.score,
                "balanced": r.balanced,
                "failures": [{"code": f.code, "why": f.why, "station": f.station} for f in r.failures],
                "patches": r.patches,
                "waypoints": r.waypoints,
                "tools": [{"name": t.name, "station": t.station, "detail": t.detail, "ok": t.ok} for t in r.tools],
                "policy": r.policy_after,
            }
        )

    first, last = results[0], results[-1]
    record_close_flight(first.waypoints, first.score, out_dir / "flight_naive.json")
    record_close_flight(last.waypoints, last.score, out_dir / "flight_learned.json")

    payload = {"summary": summary, "episodes": compact}
    (out_dir / "curriculum.json").write_text(json.dumps(payload, indent=2), encoding="utf-8")
    print(json.dumps(summary, indent=2))


if __name__ == "__main__":
    main()
