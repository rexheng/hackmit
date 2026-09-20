// Split page text into passages of roughly 800 to 1200 characters, by heading where one can be seen.
import { findModelCodes } from "../server/text.js";

const HEADING = /^(?:[A-Z][A-Z0-9 /&,()'-]{5,70}|(?:\d+\.)+\s+\S.{3,70}|Chapter \d+.*)$/;

const FAMILIES = [["rear derailleur", /rear derailleur/i], ["front derailleur", /front derailleur/i], ["crankset", /crank|chainring/i], ["brake", /brake|caliper|bleed/i],
  ["cassette", /cassette|sprocket/i], ["chain", /\bchain\b|quick.?link/i], ["shifter", /shift(?:ing)? lever|dual control/i], ["bottom bracket", /bottom bracket/i],
  ["pedal", /pedal|cleat/i], ["rotor", /rotor/i], ["hub", /\bhub\b|freehub/i]];

export const componentFamily = (text) => FAMILIES.find(([, re]) => re.test(text))?.[0] || null;

export function chunkPage(pageText, page, { min = 800, max = 1200 } = {}) {
  const lines = pageText.split(/\n+/).map((l) => l.trim()).filter(Boolean);
  const out = [];
  let title = null, buf = [];
  const flush = () => {
    const text = buf.join(" ").replace(/\s+/g, " ").trim();
    if (text.length >= 40) out.push({ page, sectionTitle: title, text, models: findModelCodes(text), componentFamily: componentFamily(`${title || ""} ${text}`) });
    buf = [];
  };
  for (const line of lines) {
    const isHeading = HEADING.test(line) && line.length < 80;
    const size = buf.join(" ").length;
    if (isHeading && size >= min / 4) { flush(); title = line; continue; }
    if (isHeading && !buf.length) { title = line; continue; }
    if (size + line.length > max) flush();
    buf.push(line);
  }
  flush();
  return out;
}
