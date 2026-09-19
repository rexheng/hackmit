from __future__ import annotations

import sys
from pathlib import Path

HERE = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(HERE / "sim"))

from office import WAYPOINTS, write_xml  # noqa: E402
from physics import FlightConfig, fly_waypoints  # noqa: E402


def test_mjcf_loads_and_ragdoll_flies():
    import mujoco

    path = write_xml()
    model = mujoco.MjModel.from_xml_path(str(path))
    data = mujoco.MjData(model)
    assert model.nq >= 15
    assert model.nu == 6
    mujoco.mj_step(model, data)
    z0 = float(data.xpos[model.body("torso").id][2])
    assert z0 > 0.5


def test_waypoint_flight_stays_airborne():
    traj = fly_waypoints(
        ["door", "desk", "coffee_table"],
        cfg=FlightConfig(noise=0.4, kp=40, kd=12, steps_per_wp=180),
        record_every=20,
    )
    assert traj["n_frames"] > 10
    zs = [f["bodies"]["torso"]["p"][2] for f in traj["frames"]]
    assert max(zs) > 1.0
    assert min(zs) > 0.2
    assert set(WAYPOINTS) >= {"door", "desk", "planter", "bookshelf"}
