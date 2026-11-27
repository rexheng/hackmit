"""Build a MuJoCo MJCF virtual CFO office + flying ragdoll.

Geometry is a low-poly read of the Blender-style reference interior:
walnut slat wall, planter, taupe cabinets, niche bookshelf, leather desk,
white sideboard, charcoal coffee table, flying humanoid with freejoint + thrusters.
"""

from __future__ import annotations

from pathlib import Path

HERE = Path(__file__).resolve().parent
XML_PATH = HERE / "office.xml"


def slats(n: int = 16) -> str:
    bits = []
    x = -3.55
    z = 1.35
    for i in range(n):
        y = -1.55 + i * 0.13
        bits.append(
            f'      <geom name="slat_{i}" type="box" size="0.025 0.035 1.35" pos="{x:.3f} {y:.3f} {z:.2f}" '
            f'rgba="0.42 0.30 0.20 1" friction="0.8 0.1 0.1"/>'
        )
    return "\n".join(bits)


def ragdoll() -> str:
    # z-up. Torso freejoint. Floppy hinges. Thruster actuators on torso.
    return r'''
    <worldbody>
      <light name="sun" directional="true" pos="0 0 4" dir="0.2 0.2 -1" diffuse="0.55 0.52 0.48" specular="0.15 0.15 0.15"/>
      <light name="shelf" pos="1.15 2.05 2.1" dir="0 0 -1" diffuse="1.0 0.78 0.45" specular="0.3 0.2 0.1"/>
      <light name="spots" pos="-1.2 -0.4 3.1" dir="0.1 0.2 -1" diffuse="0.9 0.88 0.82"/>

      <geom name="floor" type="plane" size="6 6 0.1" rgba="0.86 0.78 0.64 1" friction="0.9 0.1 0.1"/>
      <geom name="ceiling" type="box" size="4.2 3.2 0.04" pos="0 0 3.28" rgba="0.93 0.92 0.90 1" contype="0" conaffinity="0"/>

      <geom name="wall_back" type="box" size="4.2 0.08 1.65" pos="0 2.55 1.65" rgba="0.55 0.52 0.50 1"/>
      <geom name="wall_right" type="box" size="0.08 3.2 1.65" pos="4.05 0 1.65" rgba="0.92 0.90 0.88 1"/>
      <geom name="wall_left" type="box" size="0.08 3.2 1.65" pos="-4.05 0 1.65" rgba="0.93 0.92 0.90 1"/>
      <geom name="wall_front" type="box" size="4.2 0.08 1.65" pos="0 -3.05 1.65" rgba="0.93 0.92 0.90 1" contype="0" conaffinity="0"/>

      <geom name="door" type="box" size="0.06 0.45 1.1" pos="-3.95 -2.35 1.15" rgba="0.12 0.12 0.12 1"/>

SLATS
      <geom name="planter" type="box" size="0.28 1.05 0.22" pos="-3.15 0.15 0.22" rgba="0.22 0.22 0.22 1"/>
      <geom name="hedge" type="box" size="0.22 0.95 0.55" pos="-3.15 0.15 0.95" rgba="0.22 0.38 0.24 1"/>

      <geom name="cabinets" type="box" size="1.55 0.18 1.55" pos="1.85 2.28 1.55" rgba="0.48 0.45 0.43 1"/>
      <geom name="sideboard" type="box" size="1.15 0.28 0.32" pos="2.05 1.95 0.32" rgba="0.94 0.93 0.91 1"/>
      <geom name="vase_a" type="cylinder" size="0.05 0.08" pos="2.55 1.95 0.72" rgba="0.95 0.95 0.94 1"/>
      <geom name="vase_b" type="sphere" size="0.07" pos="2.75 1.95 0.72" rgba="0.96 0.96 0.95 1"/>

      <geom name="shelf_case" type="box" size="0.22 0.18 1.35" pos="0.22 2.28 1.55" rgba="0.40 0.28 0.18 1"/>
      <geom name="book1" type="box" size="0.12 0.08 0.16" pos="0.22 2.12 0.85" rgba="0.75 0.78 0.82 1"/>
      <geom name="book2" type="box" size="0.12 0.08 0.14" pos="0.22 2.12 1.35" rgba="0.55 0.45 0.35 1"/>
      <geom name="book3" type="box" size="0.12 0.08 0.12" pos="0.22 2.12 1.85" rgba="0.85 0.82 0.76 1"/>
      <geom name="obj_shelf" type="sphere" size="0.07" pos="0.22 2.12 2.35" rgba="0.93 0.93 0.92 1"/>

      <geom name="desk_top" type="box" size="1.35 0.55 0.05" pos="0.15 0.35 0.74" rgba="0.82 0.80 0.77 1"/>
      <geom name="desk_ped_l" type="box" size="0.28 0.48 0.34" pos="-0.85 0.35 0.36" rgba="0.80 0.78 0.75 1"/>
      <geom name="desk_ped_r" type="box" size="0.28 0.48 0.34" pos="1.15 0.35 0.36" rgba="0.80 0.78 0.75 1"/>
      <geom name="laptop" type="box" size="0.22 0.14 0.012" pos="0.45 0.28 0.81" rgba="0.12 0.12 0.12 1"/>
      <geom name="laptop_lid" type="box" size="0.22 0.01 0.12" pos="0.45 0.42 0.93" rgba="0.14 0.14 0.14 1"/>
      <geom name="papers" type="box" size="0.12 0.09 0.01" pos="-0.45 0.22 0.80" rgba="0.93 0.93 0.91 1"/>

      <geom name="chair_seat" type="box" size="0.22 0.22 0.05" pos="0.15 1.05 0.48" rgba="0.84 0.82 0.79 1"/>
      <geom name="chair_back" type="box" size="0.22 0.04 0.28" pos="0.15 1.24 0.78" rgba="0.84 0.82 0.79 1"/>

      <geom name="coffee_table" type="box" size="0.70 0.45 0.08" pos="-0.15 -1.85 0.18" rgba="0.12 0.12 0.12 1"/>
      <geom name="magazine" type="box" size="0.16 0.11 0.01" pos="-0.35 -1.75 0.27" rgba="0.9 0.9 0.88 1"/>
      <geom name="sculpture" type="box" size="0.08 0.08 0.02" pos="0.15 -1.85 0.28" rgba="0.92 0.92 0.90 1"/>

      <geom name="linear_light_1" type="capsule" size="0.02" fromto="-0.2 1.4 3.18  1.6 -0.6 3.18" rgba="0.95 0.95 0.92 1" contype="0" conaffinity="0"/>
      <geom name="linear_light_2" type="capsule" size="0.02" fromto="0.4 1.5 3.18  2.2 -0.5 3.18" rgba="0.95 0.95 0.92 1" contype="0" conaffinity="0"/>

      <!-- Flying ragdoll: freejoint torso, hinge limbs. -->
      <body name="torso" pos="0.1 0.2 1.55">
        <freejoint name="root"/>
        <inertial pos="0 0 0" mass="12" diaginertia="0.18 0.22 0.12"/>
        <geom name="torso_g" type="capsule" fromto="0 0 -0.16  0 0 0.18" size="0.11" rgba="0.78 0.74 0.70 1" friction="0.6 0.1 0.1"/>
        <site name="thrust" pos="0 0 0" size="0.03"/>
        <site name="cam_chest" pos="0 -0.12 0.05" size="0.02"/>

        <body name="head" pos="0 0 0.32">
          <inertial pos="0 0 0.05" mass="3.2" diaginertia="0.03 0.03 0.02"/>
          <joint name="neck" type="hinge" axis="1 0 0" range="-0.7 0.7" damping="1.2" stiffness="4"/>
          <geom name="head_g" type="sphere" size="0.10" pos="0 0 0.06" rgba="0.86 0.78 0.72 1"/>
        </body>

        <body name="uarm_l" pos="-0.16 0 0.12">
          <inertial pos="0 0 -0.12" mass="1.6" diaginertia="0.02 0.02 0.006"/>
          <joint name="shoulder_l" type="hinge" axis="0 1 0" range="-2.4 1.2" damping="0.4" stiffness="1.2"/>
          <geom name="uarm_l_g" type="capsule" fromto="0 0 0  0 0 -0.24" size="0.045" rgba="0.76 0.72 0.68 1"/>
          <body name="larm_l" pos="0 0 -0.26">
            <inertial pos="0 0 -0.11" mass="1.1" diaginertia="0.012 0.012 0.004"/>
            <joint name="elbow_l" type="hinge" axis="0 1 0" range="-2.2 0" damping="0.35" stiffness="0.8"/>
            <geom name="larm_l_g" type="capsule" fromto="0 0 0  0 0 -0.22" size="0.038" rgba="0.80 0.76 0.72 1"/>
          </body>
        </body>

        <body name="uarm_r" pos="0.16 0 0.12">
          <inertial pos="0 0 -0.12" mass="1.6" diaginertia="0.02 0.02 0.006"/>
          <joint name="shoulder_r" type="hinge" axis="0 1 0" range="-1.2 2.4" damping="0.4" stiffness="1.2"/>
          <geom name="uarm_r_g" type="capsule" fromto="0 0 0  0 0 -0.24" size="0.045" rgba="0.76 0.72 0.68 1"/>
          <body name="larm_r" pos="0 0 -0.26">
            <inertial pos="0 0 -0.11" mass="1.1" diaginertia="0.012 0.012 0.004"/>
            <joint name="elbow_r" type="hinge" axis="0 1 0" range="0 2.2" damping="0.35" stiffness="0.8"/>
            <geom name="larm_r_g" type="capsule" fromto="0 0 0  0 0 -0.22" size="0.038" rgba="0.80 0.76 0.72 1"/>
          </body>
        </body>

        <body name="uleg_l" pos="-0.08 0 -0.20">
          <inertial pos="0 0 -0.16" mass="3.4" diaginertia="0.04 0.04 0.01"/>
          <joint name="hip_l" type="hinge" axis="1 0 0" range="-1.4 0.6" damping="0.6" stiffness="2"/>
          <geom name="uleg_l_g" type="capsule" fromto="0 0 0  0 0 -0.32" size="0.055" rgba="0.55 0.56 0.58 1"/>
          <body name="lleg_l" pos="0 0 -0.34">
            <inertial pos="0 0 -0.14" mass="2.2" diaginertia="0.025 0.025 0.006"/>
            <joint name="knee_l" type="hinge" axis="1 0 0" range="0 2.1" damping="0.5" stiffness="1.4"/>
            <geom name="lleg_l_g" type="capsule" fromto="0 0 0  0 0 -0.30" size="0.045" rgba="0.50 0.51 0.53 1"/>
          </body>
        </body>

        <body name="uleg_r" pos="0.08 0 -0.20">
          <inertial pos="0 0 -0.16" mass="3.4" diaginertia="0.04 0.04 0.01"/>
          <joint name="hip_r" type="hinge" axis="1 0 0" range="-1.4 0.6" damping="0.6" stiffness="2"/>
          <geom name="uleg_r_g" type="capsule" fromto="0 0 0  0 0 -0.32" size="0.055" rgba="0.55 0.56 0.58 1"/>
          <body name="lleg_r" pos="0 0 -0.34">
            <inertial pos="0 0 -0.14" mass="2.2" diaginertia="0.025 0.025 0.006"/>
            <joint name="knee_r" type="hinge" axis="1 0 0" range="0 2.1" damping="0.5" stiffness="1.4"/>
            <geom name="lleg_r_g" type="capsule" fromto="0 0 0  0 0 -0.30" size="0.045" rgba="0.50 0.51 0.53 1"/>
          </body>
        </body>
      </body>
    </worldbody>
'''


def build_xml() -> str:
    body = ragdoll().replace("SLATS", slats())
    return f'''<mujoco model="ocfo-virtual-office">
  <compiler angle="radian" autolimits="true" inertiafromgeom="true"/>
  <option gravity="0 0 -9.81" timestep="0.002" iterations="50" solver="Newton" cone="pyramidal">
    <flag contact="enable" energy="enable"/>
  </option>
  <visual>
    <headlight ambient="0.35 0.34 0.32" diffuse="0.45 0.44 0.40"/>
    <global offwidth="1280" offheight="720"/>
  </visual>
  <default>
    <joint limited="true" armature="0.02" damping="0.4"/>
    <geom condim="3" solref="0.02 1" solimp="0.9 0.95 0.001"/>
  </default>
  <asset>
    <texture name="wood" type="2d" builtin="checker" width="256" height="256" rgb1="0.80 0.70 0.54" rgb2="0.74 0.64 0.48"/>
    <material name="floor_mat" texture="wood" texrepeat="8 8" reflectance="0.08"/>
  </asset>
{body}
  <actuator>
    <general name="fx" site="thrust" gear="1 0 0 0 0 0" ctrlrange="-80 80"/>
    <general name="fy" site="thrust" gear="0 1 0 0 0 0" ctrlrange="-80 80"/>
    <general name="fz" site="thrust" gear="0 0 1 0 0 0" ctrlrange="-120 160"/>
    <general name="tx" site="thrust" gear="0 0 0 1 0 0" ctrlrange="-25 25"/>
    <general name="ty" site="thrust" gear="0 0 0 0 1 0" ctrlrange="-25 25"/>
    <general name="tz" site="thrust" gear="0 0 0 0 0 1" ctrlrange="-20 20"/>
  </actuator>
  <sensor>
    <framepos name="torso_pos" objtype="body" objname="torso"/>
    <framequat name="torso_quat" objtype="body" objname="torso"/>
    <framelinvel name="torso_vel" objtype="body" objname="torso"/>
  </sensor>
  <keyframe>
    <key name="hover" qpos="0.1 0.2 1.55 1 0 0 0  0 0 0 0 0 0 0 0"/>
  </keyframe>
</mujoco>
'''


WAYPOINTS = {
    "door": (-3.4, -2.2, 1.4),
    "planter": (-2.4, 0.2, 1.35),
    "desk": (0.15, 0.2, 1.45),
    "chair": (0.15, 0.85, 1.35),
    "sideboard": (2.0, 1.4, 1.35),
    "bookshelf": (0.25, 1.7, 1.7),
    "coffee_table": (-0.1, -1.4, 1.25),
    "floor": (0.3, -0.6, 0.9),
}


def write_xml(path: Path | None = None) -> Path:
    path = path or XML_PATH
    path.write_text(build_xml(), encoding="utf-8")
    return path


if __name__ == "__main__":
    p = write_xml()
    print(p)
