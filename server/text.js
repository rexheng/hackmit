// Text normalization shared by ingest, search, and the guard.

const DASHES = /[‐‑‒–—―−﹘﹣－]/g;

// One spelling for every dash and space, so "35 – 55" and "35-55" compare equal.
export function normalize(s) {
  return String(s ?? "")
    .replace(DASHES, "-")
    .replace(/ /g, " ")
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/·|•|⋅/g, "·")
    .replace(/\s+/g, " ")
    .trim();
}

// For "does this string appear on the page": ignore case, spaces around dashes, and "to" ranges.
export function squash(s) {
  return normalize(s)
    .toLowerCase()
    .replace(/(\d)\s*(?:-|to|~)\s*(?=\d)/g, "$1-")
    .replace(/\s*-\s*/g, "-")
    .replace(/n\s*[·.*]?\s*m\b/g, "nm")
    .replace(/\s+/g, "");
}

export function appearsIn(needle, haystack) {
  const n = squash(needle);
  return n.length > 0 && squash(haystack).includes(n);
}

// Shimano-style codes: RD-M9100, FC-R9200, BR-M8120, CS-R9200-12, SM-SH11, TL-FC16.
export const MODEL_CODE = /\b([A-Z]{2,3})-([A-Z]{0,3}\d{2,5}[A-Z]?)(?:-([A-Z0-9]{1,4}))?\b/g;

export function findModelCodes(text) {
  const out = new Set();
  for (const m of normalize(text).toUpperCase().matchAll(MODEL_CODE)) out.add(m[0]);
  return [...out];
}

const STOP = new Set("a an the of for to on in is are what whats how do does i my it its and or with at be this that which should can you me need use when from by as about s".split(" "));

export function tokens(s) {
  return normalize(s).toLowerCase().replace(/[^a-z0-9·.\- ]/g, " ").split(/\s+/)
    .map((t) => t.replace(/^[.\-]+|[.\-]+$/g, "")).filter((t) => t && !STOP.has(t));
}

export function editDistance(a, b) {
  if (Math.abs(a.length - b.length) > 2) return 3;
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length][b.length];
}

export function fuzzyEqual(a, b) {
  if (a === b) return true;
  if (a.length < 4 || b.length < 4) return false;
  if (a.length >= 5 && (b.startsWith(a) || a.startsWith(b))) return true;
  return editDistance(a, b) <= (Math.max(a.length, b.length) >= 8 ? 2 : 1);
}

// Share of the question's meaningful words that the document covers (0 to 1).
// This one score is used for thresholds on every search backend, so they behave the same.
export function coverage(questionTokens, docText) {
  if (!questionTokens.length) return 0;
  const doc = new Set(tokens(docText).flatMap((t) => [t, ...t.split("-")]));
  const docList = [...doc];
  let hit = 0;
  for (const q of questionTokens) if (doc.has(q) || docList.some((d) => fuzzyEqual(q, d))) hit++;
  return hit / questionTokens.length;
}
