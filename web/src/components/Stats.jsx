import { useEffect, useState } from "react";
import { api } from "../api.js";

export default function Stats() {
  const [s, setS] = useState(null);
  useEffect(() => { api.stats().then(setS).catch(() => setS({ questions: 0, byPath: [], zeroModelCallShare: 0, guardBlocked: 0 })); }, []);
  if (!s) return null;
  const tiles = [["Questions", s.questions], ["Answered with zero model calls", `${Math.round(s.zeroModelCallShare * 100)}%`], ["Answers blocked by the guard", s.guardBlocked]];
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">{tiles.map(([k, v]) => <div key={k} className="card p-4"><p className="text-3xl font-bold">{v}</p><p className="text-sm text-neutral-500">{k}</p></div>)}</div>
      <div className="card overflow-hidden"><table className="w-full text-sm"><thead className="bg-neutral-50 text-left text-xs uppercase text-neutral-500"><tr><th className="p-3">Path</th><th className="p-3 text-right">Questions</th><th className="p-3 text-right">Mean ms</th><th className="p-3 text-right">Mean cost</th></tr></thead>
        <tbody>{s.byPath.map((r) => <tr key={r.path} className="border-t border-line"><td className="p-3">{r.path}</td><td className="p-3 text-right">{r.questions}</td><td className="p-3 text-right">{r.meanLatencyMs}</td><td className="p-3 text-right">${r.meanCostUsd.toFixed(4)}</td></tr>)}</tbody></table></div>
    </div>
  );
}
