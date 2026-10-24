"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CREW, EDGES, HERO, NODES0 } from "@/lib/site";
import type { LayoutState } from "@/lib/site";

type Bot = {
  id: string;
  name: string;
  ser: string;
  role: string;
  loop: readonly string[];
  order: string;
  i: number;
  x: number;
  y: number;
  step: number;
  wait: number;
};

type Tip = { obj: string; x: number; y: number } | null;

type Props = {
  construction: "half" | "full";
  layout: LayoutState;
  selected: string | null;
  onSelect: (id: string | null) => void;
  onLayout: (next: LayoutState) => void;
  onFlight: (hall: "hallA" | "hallB" | null) => void;
  visible: boolean;
};

function iso(x: number, y: number) {
  return { x: 348 + (x - y) * 0.58, y: 42 + (x + y) * 0.3 };
}
function uniso(sx: number, sy: number) {
  const u = (sx - 348) / 0.58;
  const v = (sy - 42) / 0.3;
  return { x: (u + v) / 2, y: (v - u) / 2 };
}
function poly(pts: { x: number; y: number }[]) {
  return pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
}
function isoBox(
  x: number,
  y: number,
  w: number,
  d: number,
  h: number,
  top: string,
  left: string,
  right: string,
  half: boolean,
) {
  const A = iso(x, y),
    B = iso(x + w, y),
    C = iso(x + w, y + d),
    D = iso(x, y + d);
  const up = (p: { x: number; y: number }) => ({ x: p.x, y: p.y - h });
  const At = up(A),
    Bt = up(B),
    Ct = up(C),
    Dt = up(D);
  const roof = half
    ? `<polygon points="${poly([At, Bt, Ct, Dt])}" fill="none" stroke="#1c140c" stroke-width="1.5" stroke-dasharray="4 3"/>` +
      `<polygon points="${poly([A, B, C, D])}" fill="#c8b070" stroke="#1c140c" stroke-width="1.2" opacity=".55"/>`
    : `<polygon points="${poly([At, Bt, Ct, Dt])}" fill="${top}" stroke="#1c140c" stroke-width="1.6"/>`;
  return (
    `<polygon points="${poly([A, D, Dt, At])}" fill="${left}" stroke="#1c140c" stroke-width="1.4"/>` +
    `<polygon points="${poly([B, C, Ct, Bt])}" fill="${right}" stroke="#1c140c" stroke-width="1.4"/>` +
    roof
  );
}

function neighbors(id: string) {
  const out: string[] = [];
  EDGES.forEach(([a, b]) => {
    if (a === id) out.push(b);
    if (b === id) out.push(a);
  });
  return out;
}
function bfs(from: string, to: string) {
  if (from === to) return [from];
  const q = [from];
  const prev: Record<string, string | null> = { [from]: null };
  while (q.length) {
    const n = q.shift()!;
    for (const m of neighbors(n)) {
      if (m in prev) continue;
      prev[m] = n;
      if (m === to) {
        const path = [m];
        let c: string | null = n;
        while (c) {
          path.push(c);
          c = prev[c];
        }
        return path.reverse();
      }
      q.push(m);
    }
  }
  return [from];
}

export function Campus({
  construction,
  layout,
  selected,
  onSelect,
  onLayout,
  onFlight,
  visible,
}: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const [bots, setBots] = useState<Bot[]>(() =>
    CREW.map((c) => ({
      ...c,
      i: 0,
      x: NODES0[c.loop[0]].x,
      y: NODES0[c.loop[0]].y,
      step: 0,
      wait: 0,
    })),
  );
  const [tip, setTip] = useState<Tip>(null);
  const nodes = useMemo(() => {
    const n = structuredClone(NODES0);
    n.pond.x = layout.pond.x + 45;
    n.pond.y = layout.pond.y + 36;
    n.substation.x = layout.sub.x + 40;
    n.substation.y = layout.sub.y + 32;
    return n;
  }, [layout]);

  useEffect(() => {
    const id = setInterval(() => {
      setBots((prev) =>
        prev.map((b) => {
          const next = { ...b };
          if (next.wait > 0) {
            next.wait -= 1;
            return next;
          }
          const cur = next.loop[next.i % next.loop.length];
          const nxt = next.loop[(next.i + 1) % next.loop.length];
          const destId = bfs(cur, nxt)[1] || nxt;
          const dest = nodes[destId] || NODES0[destId];
          const dx = dest.x - next.x;
          const dy = dest.y - next.y;
          const step = 8;
          if (Math.abs(dx) <= step && Math.abs(dy) <= step) {
            next.x = dest.x;
            next.y = dest.y;
            next.i += 1;
            next.wait = 2;
          } else if (Math.abs(dx) > Math.abs(dy)) next.x += Math.sign(dx) * step;
          else next.y += Math.sign(dy) * step;
          next.step = 1 - next.step;
          return next;
        }),
      );
    }, 160);
    return () => clearInterval(id);
  }, [nodes]);

  const half = construction === "half";
  const red = Object.values(HERO.materials).find((m) => m.status === "red")?.obj;
  const plate = [iso(20, 20), iso(620, 20), iso(620, 480), iso(20, 480)];
  const creekPts: { x: number; y: number }[] = [];
  for (let t = 0; t <= 1.001; t += 0.08) {
    const y = 30 + t * 450;
    const x = 36 + Math.sin(t * 6) * 18;
    creekPts.push(iso(x, y));
  }
  const creekR = creekPts
    .map((_, i) => {
      const y = 30 + i * 0.08 * 450;
      const x = 58 + Math.sin(i * 0.08 * 6) * 14;
      return iso(x, y);
    })
    .reverse();

  const buildings = [
    { id: "cooling", x: 55, y: 70, w: 64, d: 64, h: half ? 28 : 62, top: "#2c4538", left: "#8a6a22", right: "#c9a24a", title: "TOWER" },
    { id: "hallA", x: 160, y: 155, w: 120, d: 80, h: half ? 20 : 40, top: "#c01018", left: "#efe0b4", right: "#c8b070", title: "HALL A" },
    ...(layout.halls === 2
      ? [{ id: "hallB", x: 370, y: 115, w: 120, d: 80, h: half ? 20 : 40, top: "#c01018", left: "#efe0b4", right: "#c8b070", title: "HALL B" }]
      : []),
    { id: "office", x: 210, y: 330, w: 70, d: 52, h: half ? 14 : 24, top: "#8a6a22", left: "#efe0b4", right: "#d4c08a", title: "OFFICE" },
    { id: "substation", x: layout.sub.x, y: layout.sub.y, w: 72, d: 56, h: half ? 14 : 26, top: "#e6b423", left: "#2a2118", right: "#3a3228", title: "SUB" },
  ].sort((a, b) => a.x + a.y - (b.x + b.y));

  const html = (() => {
    const pk = [iso(500, 390), iso(640, 390), iso(640, 480), iso(500, 480)];
    const parking =
      `<polygon data-obj="parking" class="hit" points="${poly(pk)}" fill="#6a6558" stroke="#1c140c" stroke-width="2"/>` +
      `<text x="${iso(570, 435).x}" y="${iso(570, 435).y}" text-anchor="middle" font-family="Teko" font-size="18" fill="#efe4c488" letter-spacing="3">LOT</text>`;
    const pc = iso(layout.pond.x + 45, layout.pond.y + 36);
    const pond =
      `<ellipse data-obj="pond" class="hit drag" cx="${pc.x}" cy="${pc.y}" rx="38" ry="22" fill="#2a7c7c" stroke="#1c140c" stroke-width="2"/>` +
      `<text x="${pc.x}" y="${pc.y + 4}" text-anchor="middle" font-family="Teko" font-size="13" fill="#e8f6f2" letter-spacing="2">POND</text>`;
    const creek = `<polygon data-obj="creek" class="hit" points="${poly(creekPts.concat(creekR))}" fill="#2f7a78" stroke="#1c140c" stroke-width="2"/>`;
    let bldg = "";
    buildings.forEach((b) => {
      const drag = b.id === "substation" ? " drag" : "";
      const label = iso(b.x + b.w * 0.35, b.y + 8);
      const flag =
        red === b.id || (red === "pond" && b.id === "cooling")
          ? `<rect x="${label.x + 36}" y="${label.y - b.h - 28}" width="10" height="22" fill="#c01018" stroke="#1c140c"/>`
          : "";
      bldg +=
        `<g data-obj="${b.id}" class="hit${drag}">` +
        isoBox(b.x, b.y, b.w, b.d, b.h, b.top, b.left, b.right, half) +
        `<text x="${label.x}" y="${label.y - b.h - 6}" font-family="Teko" font-size="14" fill="#1c140c" letter-spacing="1.5">${b.title}${half ? " · UNFIN." : ""}</text>` +
        flag +
        "</g>";
    });
    let routes = "";
    if (selected) {
      const bot = bots.find((x) => x.id === selected);
      bot?.loop.forEach((id) => {
        const n = nodes[id];
        if (!n) return;
        const p = iso(n.x, n.y);
        routes += `<circle cx="${p.x}" cy="${p.y}" r="5" fill="#c9a24a" stroke="#1c140c" stroke-width="1.5"/>`;
      });
    }
    const crew = bots
      .map((b) => {
        const p = iso(b.x, b.y);
        const sel = selected === b.id ? ` stroke="#e6b423" stroke-width="2"` : ` stroke="#1c140c" stroke-width="1"`;
        return `<g data-bot="${b.id}" class="hit" transform="translate(${p.x},${p.y + (b.step ? -3 : 0)})">
          <rect x="-6" y="-18" width="12" height="7" fill="#c9a24a"${sel}/>
          <rect x="-7" y="-11" width="14" height="10" fill="#c01018"${sel}/>
          <rect x="-6" y="-1" width="4" height="6" fill="#1c140c"/>
          <rect x="2" y="${b.step ? 1 : -1}" width="4" height="6" fill="#1c140c"/>
        </g>`;
      })
      .join("");
    return (
      `<rect width="720" height="520" fill="none"/>` +
      `<polygon points="${poly(plate)}" fill="#4e7340" stroke="#1c140c" stroke-width="4"/>` +
      creek +
      parking +
      pond +
      bldg +
      `<g id="routes">${routes}</g><g id="crewG">${crew}</g>`
    );
  })();

  function svgPt(e: React.PointerEvent) {
    const svg = svgRef.current!;
    const p = svg.createSVGPoint();
    p.x = e.clientX;
    p.y = e.clientY;
    const m = svg.getScreenCTM()!.inverse();
    return p.matrixTransform(m);
  }

  const drag = useRef<string | null>(null);

  function onDown(e: React.PointerEvent) {
    const hit = (e.target as Element).closest("[data-obj]");
    if (!hit) return;
    const id = hit.getAttribute("data-obj");
    if (id !== "pond" && id !== "substation") return;
    drag.current = id;
    svgRef.current?.setPointerCapture(e.pointerId);
    e.stopPropagation();
  }
  function onMove(e: React.PointerEvent) {
    if (!drag.current) return;
    const q = svgPt(e);
    const w = uniso(q.x, q.y);
    w.x = Math.max(20, Math.min(560, w.x));
    w.y = Math.max(20, Math.min(430, w.y));
    if (drag.current === "pond") onLayout({ ...layout, pond: { x: w.x - 45, y: w.y - 36 } });
    else onLayout({ ...layout, sub: { x: w.x - 40, y: w.y - 32 } });
  }

  function onClick(e: React.MouseEvent) {
    const bot = (e.target as Element).closest("[data-bot]");
    if (bot) {
      onSelect(bot.getAttribute("data-bot"));
      return;
    }
    const obj = (e.target as Element).closest("[data-obj]");
    if (!obj) {
      onFlight(null);
      onSelect(null);
      setTip(null);
      return;
    }
    const id = obj.getAttribute("data-obj")!;
    if (id === "hallA" || id === "hallB") onFlight(id);
    const stage = stageRef.current?.getBoundingClientRect();
    if (stage) setTip({ obj: id, x: e.clientX - stage.left + 12, y: e.clientY - stage.top + 12 });
  }

  const material = tip
    ? Object.values(HERO.materials).find((m) => m.obj === tip.obj)
    : null;
  const labels: Record<string, [string, string, string]> = {
    hallA: ["HALL A", "compute floor · 18 MW IT (TEMPLATE)", "Millie owns the aisles."],
    hallB: ["HALL B", "compute floor · 18 MW IT (TEMPLATE)", "Rivet walks the slab."],
    cooling: ["TOWER A", HERO.coolingKind, "Hopper owns the trek."],
    pond: ["COOLING POND", "makeup against the creek — drag to redesign", "Water is the red part on arrival."],
    substation: ["SUBSTATION", "the tap the town shares — drag to redesign", "Oncor / ERCOT story."],
    parking: ["STAFF LOT", "shift change · 96 stalls (TEMPLATE)", "Brass cuts through."],
    creek: ["MOUNTAIN CREEK TRACE", "not a utility, a neighbor", "Do not feed it heat."],
    office: ["TIME OFFICE", "clocks and punch cards", "Gate node on the graph."],
  };

  const work = selected ? bots.find((b) => b.id === selected) : null;

  return (
    <div ref={stageRef} className="viewport" style={{ display: visible ? "block" : "none" }} onClick={onClick}>
      <svg
        ref={svgRef}
        id="campus"
        viewBox="0 0 720 520"
        role="img"
        aria-label="Isometric paper-model data center campus"
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={() => {
          drag.current = null;
        }}
        dangerouslySetInnerHTML={{ __html: html }}
      />
      {tip && labels[tip.obj] ? (
        <div className={`obj-tip show${material?.status === "red" ? " bad" : ""}`} style={{ left: tip.x, top: tip.y }}>
          <div className="who">{labels[tip.obj][0]}</div>
          {labels[tip.obj][1]}
          <br />
          STENCIL {labels[tip.obj][2]}
          {material ? (
            <>
              <br />
              FAIL WINDOW {material.days} DAYS
              <br />
              CIVIC COST {material.civic}
              <br />
              STATUS {material.status.toUpperCase()}
            </>
          ) : null}
        </div>
      ) : null}
      {work ? (
        <div className="id-card show" style={{ left: 24, top: 36 }}>
          <strong>{work.name}</strong> {work.ser} · {work.role}
          <br />
          WORK ORDER
          <br />
          {work.order}
          <br />
          ROUTE {work.loop.join(" → ")}
        </div>
      ) : null}
    </div>
  );
}
