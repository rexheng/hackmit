"""Fly the ragdoll through Office-of-the-CFO waypoints with MuJoCo.

Thruster PD on the freejoint torso. Limbs stay passive (ragdoll).
Policy quality maps onto gain + noise: a learned close flies cleaner.
"""

from __future__ import annotations

import json
import math
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Iterable

import numpy as np

try:
    from .office import WAYPOINTS, write_xml
except ImportError:
    from office import WAYPOINTS, write_xml

HERE = Path(__file__).resolve().parent
TRAJ_DIR = HERE.parent / "trajectories"


@dataclass
class FlightConfig:
    kp: float = 28.0
    kd: float = 10.0
    k_upright: float = 18.0
    noise: float = 6.0
    hover_bias: float = 9.81 * 12.0  # roughly mass * g
    steps_per_wp: int = 280


def _load_model():
    import mujoco

    xml = write_xml()
    model = mujoco.MjModel.from_xml_path(str(xml))
    data = mujoco.MjData(model)
    return mujoco, model, data


def _body_id(model, name: str) -> int:
    return model.body(name).id


def fly_waypoints(
    names: Iterable[str],
    cfg: FlightConfig | None = None,
        record_every: int = 12,
) -> dict[str, Any]:
    mujoco, model, data = _load_model()
    cfg = cfg or FlightConfig()
    tid = _body_id(model, "torso")
    names = list(names)
    frames: list[dict[str, Any]] = []
    crashed = False

    def snapshot(wp: str, t: float) -> dict[str, Any]:
        bodies = {}
        for bname in (
            "torso",
            "head",
            "uarm_l",
            "larm_l",
            "uarm_r",
            "larm_r",
            "uleg_l",
            "lleg_l",
            "uleg_r",
            "lleg_r",
        ):
            bid = _body_id(model, bname)
            bodies[bname] = {
                "p": [round(float(x), 3) for x in data.xpos[bid]],
                "m": [round(float(x), 3) for x in data.xmat[bid]],
            }
        return {"t": round(t, 3), "wp": wp, "bodies": bodies}

    rng = np.random.default_rng(0)
    t = 0.0
    for name in names:
        target = np.array(WAYPOINTS.get(name, WAYPOINTS["desk"]), dtype=np.float64)
        for i in range(cfg.steps_per_wp):
            pos = data.xpos[tid].copy()
            vel = data.cvel[tid][3:].copy()  # linear in cvel last 3
            # cvel is rotational then linear in body frame; use qvel freejoint
            linvel = data.qvel[0:3].copy()
            err = target - pos
            # PD force
            force = cfg.kp * err - cfg.kd * linvel
            force[2] += cfg.hover_bias * 0.08  # extra lift
            force += rng.normal(0, cfg.noise, size=3)
            force = np.clip(force, -80, 80)
            force[2] = np.clip(force[2], -40, 140)

            # Upright torque from quaternion (qpos 3:7)
            qw, qx, qy, qz = data.qpos[3:7]
            # tilt vs world z
            # rotation matrix row 2 is body z in world
            z_body = data.xmat[tid].reshape(3, 3)[:, 2]
            tilt = np.cross(z_body, np.array([0.0, 0.0, 1.0]))
            angvel = data.qvel[3:6]
            torque = cfg.k_upright * tilt - 2.4 * angvel
            torque = np.clip(torque, -25, 25)

            data.ctrl[:] = [force[0], force[1], force[2], torque[0], torque[1], torque[2]]
            mujoco.mj_step(model, data)
            t += model.opt.timestep
            if i % record_every == 0:
                frames.append(snapshot(name, t))
            if data.xpos[tid][2] < 0.25:
                crashed = True
                frames.append(snapshot("floor", t))
                break
        if crashed:
            break

    return {
        "frames": frames,
        "waypoints": names,
        "crashed": crashed,
        "horizon": t,
        "n_frames": len(frames),
        "qpos_dim": int(model.nq),
    }


def config_from_score(score: float) -> FlightConfig:
    """Better close policy → tighter flight (less noise, more damping)."""
    s = max(0.0, min(100.0, score)) / 100.0
    return FlightConfig(
        kp=18 + 22 * s,
        kd=6 + 10 * s,
        k_upright=10 + 16 * s,
        noise=14 * (1.0 - s) + 1.2,
        steps_per_wp=240 + int(80 * s),
    )


def record_close_flight(waypoints: list[str], score: float, path: Path | None = None) -> Path:
    TRAJ_DIR.mkdir(parents=True, exist_ok=True)
    path = path or (TRAJ_DIR / "last_flight.json")
    traj = fly_waypoints(waypoints, cfg=config_from_score(score))
    traj["score"] = score
    path.write_text(json.dumps(traj), encoding="utf-8")
    return path


if __name__ == "__main__":
    write_xml()
    t = fly_waypoints(["door", "planter", "desk", "chair", "bookshelf", "coffee_table"], cfg=config_from_score(35))
    print("frames", t["n_frames"], "crashed", t["crashed"], "z", t["frames"][-1]["bodies"]["torso"]["pos"][2])
