import { useEffect, useState } from "react";
import { api } from "./api.js";
import Answer from "./components/Answer.jsx";
import Cart from "./components/Cart.jsx";
import Stats from "./components/Stats.jsx";

const FIXTURE_CHIPS = ["ultegra r800 rear mech bracket axle torque", "how do I replace the brake pads on BR-R8070", "clamp bolt torque FC-R8000", "what tyre pressure for gravel"];

export default function App() {
  const [view, setView] = useState("ask");
  const [question, setQuestion] = useState(""), [bike, setBike] = useState("");
  const [res, setRes] = useState(null), [busy, setBusy] = useState(false), [error, setError] = useState(null);
  const [manuals, setManuals] = useState([]), [examples, setExamples] = useState([]), [health, setHealth] = useState(null);

  useEffect(() => { api.manuals().then((d) => { setManuals(d.manuals); setExamples(d.examples || []); }).catch(() => {}); api.health().then(setHealth).catch(() => {}); }, []);

  async function ask(q = question) {
    if (q.trim().length < 3) return;
    setQuestion(q); setBusy(true); setError(null); setView("ask");
    try { setRes(await api.ask(q.trim(), bike.trim())); } catch (e) { setError(e.message); setRes(null); } finally { setBusy(false); }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 pb-16">
      <header className="no-print flex items-center justify-between py-4">
        <button className="text-xl font-extrabold tracking-tight" onClick={() => setView("ask")}>Bike</button>
        <button className="text-sm text-neutral-600 underline" onClick={() => setView(view === "stats" ? "ask" : "stats")}>{view === "stats" ? "Ask" : "Stats"}</button>
      </header>
      {health?.fixtureData && <p className="no-print mb-3 rounded-xl bg-fuchsia-100 p-2 text-center text-xs font-semibold text-fuchsia-900">Test fixture loaded. Values are made up. Add real manuals and a MongoDB URI to go live.</p>}

      {view === "stats" ? <Stats /> : view === "cart" && res ? <Cart parts={res.parts} bike={bike} onClose={() => setView("ask")} /> : (
        <>
          <form className="no-print card p-4 sm:p-5" onSubmit={(e) => { e.preventDefault(); ask(); }}>
            <textarea value={question} onChange={(e) => setQuestion(e.target.value)} rows={2} maxLength={500} placeholder="Ask a repair question" aria-label="Repair question"
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); ask(); } }} className="w-full resize-none rounded-xl border border-line p-3 text-lg outline-none focus:border-ink" />
            <div className="mt-2 flex flex-col gap-2 sm:flex-row">
              <input value={bike} onChange={(e) => setBike(e.target.value)} placeholder="Bike or part model (optional)" aria-label="Bike or part model" className="flex-1 rounded-xl border border-line p-3 outline-none focus:border-ink" />
              <button className="btn btn-primary" disabled={busy || question.trim().length < 3}>{busy ? "Checking the manuals…" : "Ask"}</button>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">{(health?.fixtureData ? FIXTURE_CHIPS : examples).map((c) => <button type="button" key={c} onClick={() => ask(c)} className="rounded-full border border-line bg-white px-3 py-1 text-sm hover:border-ink">{c}</button>)}</div>
          </form>
          {error && <p className="mt-4 text-red-700">{error}</p>}
          {res && <div className="mt-4"><Answer res={res} onParts={() => setView("cart")} /></div>}
        </>
      )}

      <footer className="no-print mt-10 border-t border-line pt-4 text-xs text-neutral-500">
        <p>Answers come only from these manuals. Prices are samples. Checkout is a demo and takes no payment.</p>
        <ul className="mt-1 space-y-0.5">{manuals.map((m) => <li key={m.id}>{m.title}{m.brand ? ` · ${m.brand}` : ""}{m.url && <> · <a className="underline" href={m.url} target="_blank" rel="noreferrer">source</a></>}</li>)}</ul>
      </footer>
    </div>
  );
}
