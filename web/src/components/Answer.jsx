import Markdown from "./Markdown.jsx";
import PdfPage from "./PdfPage.jsx";

const PATH_LABEL = { lookup: "Looked up", procedure: "Steps from the manual", refusal: "Not covered", clarify: "One question" };

function Usage({ u, path }) {
  return (
    <p className="mt-3 text-xs text-neutral-500">
      {PATH_LABEL[path]} · {u.modelCalls} model {u.modelCalls === 1 ? "call" : "calls"} · {u.tokensIn + u.tokensOut} tokens · ${u.costUsd.toFixed(4)} · {u.latencyMs} ms{u.cached ? " · cached" : ""}
    </p>
  );
}

function Cite({ c }) {
  return (
    <figure className="space-y-2">
      <figcaption className="text-sm font-semibold">{c.manualTitle} · page {c.page}</figcaption>
      {c.pdfUrl && <PdfPage pdfUrl={c.pdfUrl} page={c.page} />}
      <blockquote className="rounded-xl bg-neutral-50 p-3 text-sm text-neutral-700">“{c.verbatimText}”</blockquote>
    </figure>
  );
}

export default function Answer({ res, onParts }) {
  const pages = <div className="space-y-4">{res.citations.map((c, i) => <Cite key={i} c={c} />)}</div>;
  const body = (
    <div className="card p-4 sm:p-5">
      {res.safety && <p className="mb-3 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm font-medium text-amber-900">Safety-critical. Read the manual page first.<span className="mt-1 block whitespace-pre-line font-normal">{res.safetyText}</span></p>}
      {!res.guard.passed && <p className="mb-3 rounded-xl bg-red-50 p-3 text-sm text-red-800">Blocked: {res.guard.blockedNumbers.join(", ")} not found in the manuals.</p>}
      <Markdown text={res.answerMarkdown} />
      {res.path === "refusal" && res.citations.length > 0 && <p className="mt-2 text-sm text-neutral-600">Nearest pages are shown.</p>}
      <Usage u={res.usage} path={res.path} />
      {res.parts.length > 0 && <button className="btn btn-primary no-print mt-4 w-full sm:w-auto" onClick={onParts}>Parts ({res.parts.length})</button>}
    </div>
  );
  // Safety-critical answers show the manual page first.
  return <div className="grid gap-4 lg:grid-cols-2">{res.safety ? <>{pages}{body}</> : <>{body}{pages}</>}</div>;
}
