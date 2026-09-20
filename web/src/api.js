async function call(path, body) {
  const res = await fetch(`/api${path}`, body ? { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) } : undefined);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Something went wrong.");
  return data;
}
export const api = {
  ask: (question, bike) => call("/ask", { question, ...(bike ? { bike } : {}) }),
  quote: (bike, parts, laborMinutes) => call("/quote", { bike, parts, laborMinutes }),
  checkout: (quoteId) => call("/checkout-demo", { quoteId }),
  manuals: () => call("/manuals"), stats: () => call("/stats"), health: () => call("/health"),
};
