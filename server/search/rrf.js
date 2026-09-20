// Reciprocal rank fusion: merge ranked lists without needing comparable scores.
export function rrf(lists, k = 60) {
  const score = new Map(), doc = new Map();
  for (const list of lists)
    list.forEach((d, i) => {
      const id = String(d._id);
      score.set(id, (score.get(id) || 0) + 1 / (k + i + 1));
      doc.set(id, d);
    });
  return [...score.entries()].sort((a, b) => b[1] - a[1]).map(([id]) => doc.get(id));
}
