// The text each backend indexes for a fact or a passage. One definition, so all three backends agree.
export const factText = (f) => [f.brand, (f.models || []).join(" "), f.specType?.replace("_", " "), f.name, f.tool, f.verbatimText].filter(Boolean).join(" ");
export const passageText = (p) => [p.brand, (p.models || []).join(" "), p.componentFamily, p.sectionTitle, p.text].filter(Boolean).join(" ");
