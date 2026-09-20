// A tiny, safe renderer for the three things an answer uses: numbered steps, bold, and a quote.
const esc = (s) => s.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
const inline = (s) => esc(s).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");

export default function Markdown({ text }) {
  const blocks = [];
  let list = null;
  for (const line of text.split("\n")) {
    const step = line.match(/^\s*\d+[.)]\s+(.*)$/);
    if (step) { (list ??= []).push(step[1]); continue; }
    if (list) { blocks.push({ list }); list = null; }
    if (line.startsWith(">")) blocks.push({ quote: line.replace(/^>\s?/, "") });
    else if (line.trim()) blocks.push({ p: line });
  }
  if (list) blocks.push({ list });
  return (
    <div className="answer space-y-2 text-[1.05rem] leading-relaxed">
      {blocks.map((b, i) => b.list ? <ol key={i}>{b.list.map((x, j) => <li key={j} dangerouslySetInnerHTML={{ __html: inline(x) }} />)}</ol>
        : b.quote ? <blockquote key={i} dangerouslySetInnerHTML={{ __html: inline(b.quote) }} />
        : <p key={i} dangerouslySetInnerHTML={{ __html: inline(b.p) }} />)}
    </div>
  );
}
