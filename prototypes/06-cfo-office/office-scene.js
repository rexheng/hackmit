import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { RectAreaLightUniformsLib } from "three/addons/lights/RectAreaLightUniformsLib.js";

/** MuJoCo z-up (x,y,z) → Three y-up (x,z,y) */
export function mjToThree(p) {
  return new THREE.Vector3(p[0], p[2], p[1]);
}

export const WAYPOINTS = {
  door: [-3.4, -2.2, 1.4],
  planter: [-2.4, 0.2, 1.35],
  desk: [0.15, 0.2, 1.45],
  chair: [0.15, 0.85, 1.35],
  sideboard: [2.0, 1.4, 1.35],
  bookshelf: [0.25, 1.7, 1.7],
  coffee_table: [-0.1, -1.4, 1.25],
  floor: [0.3, -0.6, 0.9],
};

const RAGDOLL_PARTS = [
  ["torso", 0.11, 0.34, 0xcdc4ba],
  ["head", 0.1, 0.12, 0xdbc7b8],
  ["uarm_l", 0.045, 0.24, 0xc2b8ae],
  ["larm_l", 0.038, 0.22, 0xccc4bc],
  ["uarm_r", 0.045, 0.24, 0xc2b8ae],
  ["larm_r", 0.038, 0.22, 0xccc4bc],
  ["uleg_l", 0.055, 0.32, 0x8c8e93],
  ["lleg_l", 0.045, 0.3, 0x7f8287],
  ["uleg_r", 0.055, 0.32, 0x8c8e93],
  ["lleg_r", 0.045, 0.3, 0x7f8287],
];

function woodTexture() {
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 512;
  const g = c.getContext("2d");
  g.fillStyle = "#dcc8a4";
  g.fillRect(0, 0, 512, 512);
  for (let y = 0; y < 512; y++) {
    const n = Math.sin(y * 0.08) * 8 + Math.sin(y * 0.31) * 4;
    g.strokeStyle = `rgba(150,110,60,${0.06 + (y % 9) * 0.008})`;
    g.beginPath();
    g.moveTo(0, y);
    g.lineTo(512, y + n);
    g.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(8, 8);
  t.anisotropy = 8;
  return t;
}

function mat(color, extra = {}) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: extra.roughness ?? 0.55,
    metalness: extra.metalness ?? 0.04,
    ...extra,
  });
}

export function createOffice(canvas) {
  RectAreaLightUniformsLib.init();
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xe8e4de);
  scene.fog = new THREE.Fog(0xe8e4de, 12, 22);

  const camera = new THREE.PerspectiveCamera(42, 1, 0.05, 40);
  camera.position.set(-1.6, 1.55, -3.35);

  const controls = new OrbitControls(camera, canvas);
  controls.target.set(0.2, 0.9, 0.4);
  controls.enableDamping = true;
  controls.maxPolarAngle = Math.PI * 0.48;
  controls.minDistance = 1.2;
  controls.maxDistance = 11;

  scene.add(new THREE.HemisphereLight(0xf4f0e8, 0x8a7a62, 0.55));
  const sun = new THREE.DirectionalLight(0xfff6e8, 1.15);
  sun.position.set(-2.8, 5.2, -1.4);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.near = 0.5;
  sun.shadow.camera.far = 16;
  sun.shadow.camera.left = -6;
  sun.shadow.camera.right = 6;
  sun.shadow.camera.top = 6;
  sun.shadow.camera.bottom = -6;
  scene.add(sun);

  const shelfLight = new THREE.SpotLight(0xffc878, 12, 6, 0.35, 0.6, 1);
  shelfLight.position.set(0.22, 2.7, 2.35);
  shelfLight.target.position.set(0.22, 0.4, 2.28);
  scene.add(shelfLight, shelfLight.target);

  const lin1 = new THREE.RectAreaLight(0xf5f2ea, 8, 2.4, 0.05);
  lin1.position.set(0.7, 3.16, 0.4);
  lin1.lookAt(0.7, 0, 0.4);
  scene.add(lin1);
  const lin2 = new THREE.RectAreaLight(0xf5f2ea, 8, 2.4, 0.05);
  lin2.position.set(1.3, 3.16, 0.5);
  lin2.lookAt(1.3, 0, 0.5);
  scene.add(lin2);

  const room = new THREE.Group();
  scene.add(room);

  const floor = new THREE.Mesh(
    new THREE.BoxGeometry(8.4, 0.08, 6.4),
    new THREE.MeshStandardMaterial({ map: woodTexture(), roughness: 0.42, metalness: 0.02 })
  );
  floor.position.y = -0.04;
  floor.receiveShadow = true;
  room.add(floor);

  const ceiling = new THREE.Mesh(new THREE.BoxGeometry(8.4, 0.08, 6.4), mat(0xeeebe8, { roughness: 0.85 }));
  ceiling.position.y = 3.24;
  room.add(ceiling);

  const wall = (w, h, d, x, y, z, c) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(c, { roughness: 0.72 }));
    m.position.set(x, y, z);
    m.receiveShadow = true;
    m.castShadow = true;
    room.add(m);
    return m;
  };
  wall(8.4, 3.3, 0.12, 0, 1.65, 2.58, 0x8c8782); // back taupe
  wall(0.12, 3.3, 6.4, 4.1, 1.65, 0, 0xebe8e4);
  wall(0.12, 3.3, 6.4, -4.1, 1.65, 0, 0xeeebe8);
  wall(8.4, 3.3, 0.12, 0, 1.65, -3.12, 0xeeebe8);

  // Door
  const door = new THREE.Mesh(new RoundedBoxGeometry(0.08, 2.2, 0.9, 2, 0.02), mat(0x1a1a1a, { roughness: 0.35, metalness: 0.2 }));
  door.position.set(-4.02, 1.15, -2.35);
  room.add(door);
  const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.12, 12), mat(0xc9c9c9, { metalness: 0.8, roughness: 0.2 }));
  handle.rotation.z = Math.PI / 2;
  handle.position.set(-3.96, 1.05, -2.05);
  room.add(handle);

  // Walnut slats
  for (let i = 0; i < 16; i++) {
    const slat = new THREE.Mesh(new RoundedBoxGeometry(0.05, 2.7, 0.07, 1, 0.01), mat(0x6b4e35, { roughness: 0.48 }));
    slat.position.set(-3.55, 1.35, -1.55 + i * 0.13);
    slat.castShadow = true;
    room.add(slat);
  }

  // Planter + hedge
  const planter = new THREE.Mesh(new RoundedBoxGeometry(0.56, 0.44, 2.1, 2, 0.04), mat(0x2a2a2a, { roughness: 0.4 }));
  planter.position.set(-3.15, 0.22, 0.15);
  planter.castShadow = true;
  room.add(planter);
  const hedgeMat = mat(0x385e3d, { roughness: 0.85 });
  for (let i = 0; i < 28; i++) {
    const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.16 + (i % 5) * 0.02, 10, 8), hedgeMat);
    leaf.position.set(-3.18 + (i % 3) * 0.07, 0.7 + (i % 4) * 0.18, -0.7 + (i * 0.065) % 1.7);
    leaf.castShadow = true;
    room.add(leaf);
  }

  // Desk
  const leather = mat(0xd2cec8, { roughness: 0.38 });
  const desk = new THREE.Mesh(new RoundedBoxGeometry(2.7, 0.1, 1.1, 4, 0.05), leather);
  desk.position.set(0.15, 0.74, 0.35);
  desk.castShadow = true;
  desk.receiveShadow = true;
  room.add(desk);
  const pedL = new THREE.Mesh(new RoundedBoxGeometry(0.56, 0.68, 0.96, 3, 0.06), leather);
  pedL.position.set(-0.85, 0.34, 0.35);
  pedL.castShadow = true;
  room.add(pedL);
  const pedR = pedL.clone();
  pedR.position.x = 1.15;
  room.add(pedR);

  const laptop = new THREE.Mesh(new RoundedBoxGeometry(0.44, 0.02, 0.28, 1, 0.01), mat(0x1c1c1c, { roughness: 0.3, metalness: 0.4 }));
  laptop.position.set(0.45, 0.81, 0.28);
  room.add(laptop);
  const lid = new THREE.Mesh(new RoundedBoxGeometry(0.44, 0.24, 0.02, 1, 0.008), mat(0x222));
  lid.position.set(0.45, 0.93, 0.42);
  room.add(lid);
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.2), new THREE.MeshBasicMaterial({ color: 0x1a2228 }));
  screen.position.set(0.45, 0.93, 0.432);
  room.add(screen);

  const paper = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.01, 0.18), mat(0xf3f1ec, { roughness: 0.9 }));
  paper.position.set(-0.5, 0.8, 0.22);
  room.add(paper);

  // Chair
  const chairMat = mat(0xd6d2cc, { roughness: 0.45 });
  const seat = new THREE.Mesh(new RoundedBoxGeometry(0.46, 0.08, 0.46, 3, 0.04), chairMat);
  seat.position.set(0.15, 0.48, 1.05);
  seat.castShadow = true;
  room.add(seat);
  const back = new THREE.Mesh(new RoundedBoxGeometry(0.46, 0.56, 0.08, 3, 0.04), chairMat);
  back.position.set(0.15, 0.78, 1.24);
  back.castShadow = true;
  room.add(back);
  for (const dx of [-0.12, 0.12]) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.44, 8), mat(0xc5c5c5, { metalness: 0.7, roughness: 0.25 }));
    leg.position.set(0.15 + dx, 0.22, 1.05);
    room.add(leg);
  }

  // Cabinets + niche
  const cab = new THREE.Mesh(new THREE.BoxGeometry(3.1, 3.1, 0.36), mat(0x7a746f, { roughness: 0.6 }));
  cab.position.set(1.85, 1.55, 2.28);
  cab.castShadow = true;
  room.add(cab);
  // panel seams
  for (const px of [0.7, 1.85, 3.0]) {
    const seam = new THREE.Mesh(new THREE.BoxGeometry(0.015, 3.05, 0.01), mat(0x6a6560));
    seam.position.set(px, 1.55, 2.1);
    room.add(seam);
  }
  const niche = new THREE.Mesh(new THREE.BoxGeometry(0.44, 2.7, 0.38), mat(0x66482e, { roughness: 0.5 }));
  niche.position.set(0.22, 1.55, 2.28);
  room.add(niche);
  for (let i = 0; i < 4; i++) {
    const shelf = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.03, 0.32), mat(0x5a3f28));
    shelf.position.set(0.22, 0.55 + i * 0.55, 2.2);
    room.add(shelf);
    const book = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.22, 0.12), mat(i % 2 ? 0xc8cdd3 : 0x8a6a4a));
    book.position.set(0.22, 0.68 + i * 0.55, 2.18);
    room.add(book);
  }
  const glow = new THREE.PointLight(0xffb35a, 3.5, 2.2);
  glow.position.set(0.22, 1.6, 2.15);
  scene.add(glow);

  const sideboard = new THREE.Mesh(new RoundedBoxGeometry(2.3, 0.64, 0.56, 2, 0.03), mat(0xf0eeeb, { roughness: 0.4 }));
  sideboard.position.set(2.05, 0.32, 1.95);
  sideboard.castShadow = true;
  room.add(sideboard);
  const vase = new THREE.Mesh(new THREE.SphereGeometry(0.07, 16, 12), mat(0xf4f4f2, { roughness: 0.3 }));
  vase.position.set(2.7, 0.72, 1.95);
  room.add(vase);
  const vase2 = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.16, 12), mat(0xf2f2f0));
  vase2.position.set(2.5, 0.72, 1.95);
  room.add(vase2);

  const table = new THREE.Mesh(new RoundedBoxGeometry(1.4, 0.16, 0.9, 2, 0.02), mat(0x1c1c1c, { roughness: 0.28, metalness: 0.12 }));
  table.position.set(-0.15, 0.18, -1.85);
  table.castShadow = true;
  table.receiveShadow = true;
  room.add(table);
  const mag = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.015, 0.22), mat(0xf2f0ea));
  mag.position.set(-0.4, 0.28, -1.75);
  mag.rotation.y = 0.3;
  room.add(mag);
  const sculp = new THREE.Mesh(new THREE.OctahedronGeometry(0.07), mat(0xe8e4dc, { metalness: 0.15, roughness: 0.35 }));
  sculp.position.set(0.18, 0.32, -1.85);
  room.add(sculp);

  // Recessed spots
  for (const [x, z] of [[-2.4, -1.6], [-1.6, -0.4]]) {
    const spot = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.02, 16), mat(0xfaf8f4, { emissive: 0xfaf8f4, emissiveIntensity: 0.6 }));
    spot.position.set(x, 3.2, z);
    room.add(spot);
  }

  // Station markers (soft rings)
  const stations = {};
  const labels = {
    door: "INGEST",
    planter: "BANK",
    desk: "GL / P&L",
    chair: "EXCEPTIONS",
    sideboard: "AP",
    bookshelf: "AUDIT",
    coffee_table: "CASH REPORT",
  };
  for (const [name, p] of Object.entries(WAYPOINTS)) {
    if (name === "floor") continue;
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.18, 0.008, 8, 32),
      new THREE.MeshBasicMaterial({ color: 0xc4a574, transparent: true, opacity: 0.55 })
    );
    const v = mjToThree(p);
    ring.rotation.x = Math.PI / 2;
    ring.position.set(v.x, 0.04, v.z);
    room.add(ring);
    stations[name] = ring;
  }

  // Ragdoll
  const ragdoll = new THREE.Group();
  ragdoll.name = "closebot";
  scene.add(ragdoll);
  const parts = {};
  for (const [name, r, len, color] of RAGDOLL_PARTS) {
    const mesh = new THREE.Mesh(
      name === "head" ? new THREE.SphereGeometry(r, 14, 12) : new THREE.CapsuleGeometry(r, len * 0.7, 4, 10),
      new THREE.MeshStandardMaterial({ color, roughness: 0.45, metalness: 0.08 })
    );
    mesh.castShadow = true;
    ragdoll.add(mesh);
    parts[name] = mesh;
  }
  const visor = new THREE.Mesh(new THREE.SphereGeometry(0.045, 12, 8, 0, Math.PI), new THREE.MeshStandardMaterial({ color: 0x111418, roughness: 0.2, metalness: 0.4 }));
  parts.head.add(visor);
  visor.position.set(0, 0.01, 0.06);

  const thrust = new THREE.Points(
    new THREE.BufferGeometry().setAttribute("position", new THREE.Float32BufferAttribute(new Float32Array(90), 3)),
    new THREE.PointsMaterial({ color: 0xe8d5b0, size: 0.035, transparent: true, opacity: 0.7 })
  );
  scene.add(thrust);

  const livePos = {};
  for (const [k, p] of Object.entries(WAYPOINTS)) livePos[k] = mjToThree(p);
  const bodyState = {};
  for (const [name] of RAGDOLL_PARTS) {
    bodyState[name] = { pos: new THREE.Vector3(0.1, 1.55, 0.2), vel: new THREE.Vector3() };
  }

  let flight = null;
  let flightT = 0;
  let wpQueue = ["desk"];
  let wpIndex = 0;
  let noise = 2.4;
  let kp = 2.8;
  let failed = false;
  let hover = 1.45;

  function setPolicyFlight(score) {
    const s = Math.max(0, Math.min(100, score)) / 100;
    noise = 2.6 * (1 - s) + 0.15;
    kp = 2.2 + 2.8 * s;
  }

  function playFlight(json) {
    flight = json;
    flightT = 0;
  }

  function queueWaypoints(list, score, didFail) {
    wpQueue = list.length ? list.slice() : ["desk"];
    wpIndex = 0;
    failed = didFail;
    setPolicyFlight(score);
    flight = null;
  }

  function applyFrame(frame) {
    for (const [name, b] of Object.entries(frame.bodies || {})) {
      const mesh = parts[name];
      if (!mesh || !b.p) continue;
      const p = mjToThree(b.p);
      mesh.position.copy(p);
      if (b.m && b.m.length === 9) {
        // C * R * C^T with C mapping (x,y,z)->(x,z,y)
        const R = b.m;
        const e = [
          R[0], R[2], R[1],
          R[6], R[8], R[7],
          R[3], R[5], R[4],
        ];
        const m4 = new THREE.Matrix4().set(
          e[0], e[1], e[2], 0,
          e[3], e[4], e[5], 0,
          e[6], e[7], e[8], 0,
          0, 0, 0, 1
        );
        mesh.quaternion.setFromRotationMatrix(m4);
      }
    }
  }

  function stepLive(dt) {
    const targetName = wpQueue[Math.min(wpIndex, wpQueue.length - 1)] || "desk";
    const target = mjToThree(WAYPOINTS[targetName] || WAYPOINTS.desk);
    const torso = bodyState.torso;
    const err = target.clone().sub(torso.pos);
    const acc = err.multiplyScalar(kp).add(new THREE.Vector3((Math.random() - 0.5) * noise, (Math.random() - 0.5) * noise * 0.6, (Math.random() - 0.5) * noise));
    acc.y += (hover - torso.pos.y) * 1.4;
    if (failed) acc.y -= 2.2;
    torso.vel.add(acc.multiplyScalar(dt));
    torso.vel.multiplyScalar(0.92);
    torso.pos.add(torso.vel.clone().multiplyScalar(dt));
    torso.pos.y = Math.max(0.35, torso.pos.y);
    if (err.length() < 0.35 && wpIndex < wpQueue.length - 1) wpIndex++;

    // Floppy limbs trail the torso
    const offsets = {
      head: [0, 0.32, 0],
      uarm_l: [-0.18, 0.08, 0],
      larm_l: [-0.22, -0.18, 0.05],
      uarm_r: [0.18, 0.08, 0],
      larm_r: [0.22, -0.18, 0.05],
      uleg_l: [-0.08, -0.28, 0],
      lleg_l: [-0.1, -0.55, 0.04],
      uleg_r: [0.08, -0.28, 0],
      lleg_r: [0.1, -0.55, 0.04],
    };
    parts.torso.position.copy(torso.pos);
    const tilt = Math.atan2(torso.vel.x, 4);
    parts.torso.rotation.z = -tilt;
    parts.torso.rotation.x = torso.vel.z * 0.05;
    for (const [name, off] of Object.entries(offsets)) {
      const st = bodyState[name];
      const want = torso.pos.clone().add(new THREE.Vector3(...off));
      st.vel.add(want.sub(st.pos).multiplyScalar(8 * dt));
      st.vel.y -= 6 * dt;
      st.vel.multiplyScalar(0.86);
      st.pos.add(st.vel.clone().multiplyScalar(dt));
      parts[name].position.copy(st.pos);
    }

    const posAttr = thrust.geometry.attributes.position;
    for (let i = 0; i < 30; i++) {
      posAttr.setXYZ(
        i,
        torso.pos.x + (Math.random() - 0.5) * 0.2,
        torso.pos.y - 0.12 - Math.random() * 0.35,
        torso.pos.z + (Math.random() - 0.5) * 0.2
      );
    }
    posAttr.needsUpdate = true;
    thrust.position.set(0, 0, 0);
  }

  function resize() {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (!w || !h) return;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
  }
  resize();
  window.addEventListener("resize", resize);

  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.033, (now - last) / 1000);
    last = now;
    controls.update();
    if (flight && flight.frames && flight.frames.length) {
      flightT += dt;
      const fps = 1 / 0.024;
      const i = Math.min(flight.frames.length - 1, Math.floor(flightT * fps));
      applyFrame(flight.frames[i]);
      if (i >= flight.frames.length - 1) flight = null;
    } else {
      stepLive(dt);
    }
    renderer.render(scene, camera);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  return {
    scene,
    camera,
    stations,
    labels,
    playFlight,
    queueWaypoints,
    setPolicyFlight,
    throwRagdoll() {
      bodyState.torso.vel.set((Math.random() - 0.5) * 8, 5, (Math.random() - 0.5) * 8);
      failed = true;
      setTimeout(() => (failed = false), 1800);
    },
  };
}
