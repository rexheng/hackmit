import { useState } from "react";
import { api } from "../api.js";

const COMPAT = { confirmed: ["Fits, per the manual", "text-emerald-700"], unknown: ["Manual does not say", "text-neutral-500"], incompatible: ["Manual says it does not fit", "text-red-700"] };
const usd = (n) => (n == null ? "not priced" : `$${n.toFixed(2)}`);

export default function Cart({ parts, bike, onClose }) {
  const [qty, setQty] = useState(Object.fromEntries(parts.map((p) => [p.partNumber, 1])));
  const [minutes, setMinutes] = useState(30);
  const [quote, setQuote] = useState(null), [order, setOrder] = useState(null), [error, setError] = useState(null);

  async function build() {
    setError(null);
    try { setQuote(await api.quote(bike || "", parts.filter((p) => qty[p.partNumber] > 0).map((p) => ({ partNumber: p.partNumber, name: p.name, qty: qty[p.partNumber] })), Number(minutes) || 0)); }
    catch (e) { setError(e.message); }
  }

  if (quote) return (
    <div className="card p-5">
      <div className="flex items-start justify-between"><h2 className="text-xl font-bold">Quote</h2><span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-900">Sample prices</span></div>
      <p className="text-sm text-neutral-500">{quote.bike || "Bike not given"} · {new Date(quote.createdAt).toLocaleDateString()}</p>
      <table className="mt-4 w-full text-sm"><tbody>
        {quote.parts.map((l) => <tr key={l.partNumber} className="border-t border-line"><td className="py-2">{l.name}<span className="block text-xs text-neutral-500">{l.partNumber} × {l.qty}</span></td><td className="py-2 text-right">{usd(l.lineUsd)}</td></tr>)}
        <tr className="border-t border-line"><td className="py-2">Labor · {quote.laborMinutes} min at ${quote.hourlyRate}/h</td><td className="py-2 text-right">{usd(quote.laborUsd)}</td></tr>
        <tr className="border-t-2 border-ink font-bold"><td className="py-2">Total</td><td className="py-2 text-right">{usd(quote.total)}</td></tr>
      </tbody></table>
      <p className="mt-2 text-xs text-neutral-500">{quote.notice}</p>
      {order ? <p className="mt-4 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-900">{order.orderId} · {order.message}</p> : (
        <div className="no-print mt-4 flex flex-wrap gap-2">
          <button className="btn btn-ghost" onClick={() => window.print()}>Print</button>
          <button className="btn btn-primary" onClick={async () => setOrder(await api.checkout(quote.quoteId))}>Demo checkout · no payment</button>
          <button className="btn btn-ghost" onClick={onClose}>Back</button>
        </div>)}
    </div>
  );

  return (
    <div className="card p-5">
      <h2 className="text-xl font-bold">Parts</h2>
      <ul className="mt-3 divide-y divide-line">
        {parts.map((p) => (
          <li key={p.partNumber} className="flex items-center justify-between gap-3 py-3">
            <div className="min-w-0"><p className="font-semibold">{p.name}</p><p className="text-xs text-neutral-500">{p.partNumber} · page {p.page}</p><p className={`text-xs ${COMPAT[p.compatibility][1]}`}>{COMPAT[p.compatibility][0]}</p></div>
            <input type="number" min="0" max="99" value={qty[p.partNumber]} onChange={(e) => setQty({ ...qty, [p.partNumber]: Number(e.target.value) })} className="w-16 rounded-lg border border-line p-2 text-center" aria-label={`Quantity of ${p.name}`} />
          </li>))}
      </ul>
      <label className="mt-3 flex items-center justify-between text-sm">Labor minutes<input type="number" min="0" value={minutes} onChange={(e) => setMinutes(e.target.value)} className="w-24 rounded-lg border border-line p-2 text-center" /></label>
      {error && <p className="mt-2 text-sm text-red-700">{error}</p>}
      <div className="mt-4 flex gap-2"><button className="btn btn-primary" onClick={build}>Build quote</button><button className="btn btn-ghost" onClick={onClose}>Back</button></div>
    </div>
  );
}
