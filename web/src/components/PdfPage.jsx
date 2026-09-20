// Renders the cited manual page in the browser with pdf.js, from the PDF Express serves. Nothing is rendered on the server.
import { useEffect, useRef, useState } from "react";
import * as pdfjs from "pdfjs-dist";
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
const docs = new Map();

export default function PdfPage({ pdfUrl, page }) {
  const canvas = useRef(null), box = useRef(null);
  const [state, setState] = useState("loading");

  useEffect(() => {
    let cancelled = false, task;
    (async () => {
      try {
        const file = pdfUrl.split("#")[0];
        if (!docs.has(file)) docs.set(file, pdfjs.getDocument(file).promise);
        const pg = await (await docs.get(file)).getPage(page);
        if (cancelled) return;
        const width = box.current.clientWidth, base = pg.getViewport({ scale: 1 });
        const viewport = pg.getViewport({ scale: (width / base.width) * (window.devicePixelRatio || 1) });
        const c = canvas.current;
        c.width = viewport.width; c.height = viewport.height; c.style.width = "100%";
        task = pg.render({ canvasContext: c.getContext("2d"), viewport });
        await task.promise;
        if (!cancelled) setState("ready");
      } catch { if (!cancelled) setState("error"); }
    })();
    return () => { cancelled = true; task?.cancel(); };
  }, [pdfUrl, page]);

  return (
    <div ref={box} className="overflow-hidden rounded-xl border border-line bg-white">
      {state === "error" ? <p className="p-4 text-sm text-neutral-500">Could not show this page. <a className="underline" href={pdfUrl} target="_blank" rel="noreferrer">Open the PDF</a></p> : <canvas ref={canvas} className={state === "ready" ? "" : "opacity-0"} />}
    </div>
  );
}
