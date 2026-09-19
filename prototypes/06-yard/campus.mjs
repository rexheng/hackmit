/** QTS-style campus spec + natural-language edits. No API key required. */

export const DEFAULT_CAMPUS = {
  name: "QTS Fort Worth FTW1",
  lot: { w: 280, d: 260 },
  halls: [
    {
      id: "dc1",
      label: "DC1",
      x: 8,
      z: -6,
      w: 122,
      d: 52,
      h: 14,
      color: "#c4b89a",
    },
    {
      id: "dc2",
      label: "DC2",
      x: 40,
      z: -100,
      w: 90,
      d: 44,
      h: 14,
      color: "#c4b89a",
    },
  ],
  office: {
    enabled: true,
    x: -68,
    z: -6,
    w: 32,
    d: 22,
    h: 12,
    color: "#1e3a5f",
  },
  generators: { enabled: true, x: -8, z: -52, rows: 2, cols: 12 },
  substation: { enabled: true, x: 108, z: -62, w: 42, d: 36, h: 8 },
  pond: { enabled: true, x: 78, z: 62, r: 22 },
  parking: { enabled: true, x: -72, z: 48, w: 55, d: 42 },
  fence: true,
  hvac: true,
};

export function cloneCampus(c = DEFAULT_CAMPUS) {
  return JSON.parse(JSON.stringify(c));
}

const COLORS = {
  beige: "#c4b89a",
  tan: "#c4b89a",
  white: "#e8e6e0",
  red: "#b42318",
  enamel: "#c01018",
  grey: "#8a9096",
  gray: "#8a9096",
  black: "#2a2a2c",
  navy: "#1e3a5f",
  glass: "#4a6b7a",
  green: "#3d5c3a",
};

function meters(text) {
  const withUnit = text.match(/(\d+(?:\.\d+)?)\s*(m|meters?|metres?)\b/i);
  if (withUnit) return Number(withUnit[1]);
  return null;
}

function pickHall(campus, text) {
  if (/dc2|hall 2|second hall|building 2/i.test(text)) {
    return campus.halls.find((h) => h.id === "dc2") || campus.halls[1];
  }
  if (/dc1|hall 1|first hall|building 1/i.test(text)) {
    return campus.halls.find((h) => h.id === "dc1") || campus.halls[0];
  }
  if (campus.halls.length === 1) return campus.halls[0];
  if (/hall|data hall|building/i.test(text)) return campus.halls[0];
  return null;
}

function nextHallId(campus) {
  let n = campus.halls.length + 1;
  while (campus.halls.some((h) => h.id === `dc${n}`)) n += 1;
  return `dc${n}`;
}

function applyMove(obj, text) {
  const n = meters(text) ?? 40;
  if (/north|up\b/.test(text)) obj.z += n;
  else if (/south|down\b/.test(text)) obj.z -= n;
  else if (/east|right\b/.test(text)) obj.x += n;
  else if (/west|left\b/.test(text)) obj.x -= n;
  else return null;
  return n;
}

function paint(obj, text) {
  for (const [name, hex] of Object.entries(COLORS)) {
    if (new RegExp(`\\b${name}\\b`, "i").test(text)) {
      obj.color = hex;
      return name;
    }
  }
  return null;
}

/**
 * @returns {{ campus: object, note: string, ok: boolean }}
 */
export function applyPrompt(campus, raw) {
  const text = String(raw || "").trim();
  if (!text) return { campus, note: "Say what to change.", ok: false };
  const t = text.toLowerCase();
  const c = cloneCampus(campus);
  const notes = [];

  if (/^(reset|start over|original|qts default)\b/.test(t)) {
    return { campus: cloneCampus(DEFAULT_CAMPUS), note: "Reset to QTS Fort Worth FTW1.", ok: true };
  }

  if (/rename|call it|named?\s/.test(t)) {
    const named = text.match(/["']([^"']+)["']/) || text.match(/to\s+(.+)$/i);
    if (named) {
      c.name = named[1].trim();
      notes.push(`Named the campus “${c.name}”.`);
    }
  }

  if (/add (a )?(another |new |second |third )?(data )?hall|add (a )?building/.test(t)) {
    const last = c.halls[c.halls.length - 1];
    const id = nextHallId(c);
    c.halls.push({
      id,
      label: id.toUpperCase(),
      x: (last?.x ?? 0) + 140,
      z: last?.z ?? 0,
      w: last?.w ?? 90,
      d: last?.d ?? 44,
      h: last?.h ?? 14,
      color: last?.color ?? "#c4b89a",
    });
    notes.push(`Added ${id.toUpperCase()} to the east.`);
  }

  if (/(remove|delete|drop) (the )?(dc2|second hall|hall 2)/.test(t) && c.halls.length > 1) {
    c.halls = c.halls.filter((h) => h.id !== "dc2");
    notes.push("Removed DC2.");
  } else if (/(remove|delete) (a |the )?(data )?hall/.test(t) && c.halls.length > 1) {
    const gone = c.halls.pop();
    notes.push(`Removed ${gone.label || gone.id}.`);
  }

  const hall = pickHall(c, t);
  if (hall) {
    if (/taller|higher|raise|add (a )?stor(e)y|two more meters/.test(t)) {
      const n = meters(t) ?? 6;
      hall.h = Math.min(80, hall.h + n);
      notes.push(`${hall.label} is now ${hall.h} m tall.`);
    }
    if (/shorter|lower the hall|reduce height/.test(t)) {
      const n = meters(t) ?? 4;
      hall.h = Math.max(6, hall.h - n);
      notes.push(`${hall.label} is now ${hall.h} m tall.`);
    }
    if (/wider|longer|bigger hall|expand the hall|scale up/.test(t)) {
      hall.w = Math.min(220, hall.w * 1.25);
      hall.d = Math.min(120, hall.d * 1.15);
      notes.push(`${hall.label} footprint is ${Math.round(hall.w)} × ${Math.round(hall.d)} m.`);
    }
    if (/smaller hall|narrower|shrink the hall/.test(t)) {
      hall.w = Math.max(40, hall.w * 0.8);
      hall.d = Math.max(24, hall.d * 0.85);
      notes.push(`${hall.label} footprint is ${Math.round(hall.w)} × ${Math.round(hall.d)} m.`);
    }
    const color = paint(hall, t);
    if (color && /hall|building|dc\d|paint|colour|color|make/.test(t)) {
      notes.push(`${hall.label} painted ${color}.`);
    }
    if (/move|shift/.test(t) && /hall|dc\d|building/.test(t)) {
      const n = applyMove(hall, t);
      if (n != null) notes.push(`Moved ${hall.label} ${n} m.`);
    }
  }

  if (/generator/.test(t)) {
    if (/hide|remove|no generator|delete generator/.test(t)) {
      c.generators.enabled = false;
      notes.push("Generator yard off.");
    } else if (/show|add generator|bring back/.test(t)) {
      c.generators.enabled = true;
      notes.push("Generator yard on.");
    }
    if (/more generator|extra generator|double generator/.test(t)) {
      c.generators.enabled = true;
      c.generators.cols = Math.min(24, c.generators.cols + 4);
      c.generators.rows = Math.min(6, c.generators.rows + 1);
      notes.push(
        `Generators: ${c.generators.rows} × ${c.generators.cols}.`
      );
    }
    if (/fewer generator|less generator/.test(t)) {
      c.generators.cols = Math.max(4, c.generators.cols - 4);
      notes.push(
        `Generators: ${c.generators.rows} × ${c.generators.cols}.`
      );
    }
    if (/move|shift/.test(t)) {
      const n = applyMove(c.generators, t);
      if (n != null) notes.push(`Moved generator yard ${n} m.`);
    }
  }

  if (/substation|transformer/.test(t)) {
    if (/hide|remove/.test(t)) {
      c.substation.enabled = false;
      notes.push("Substation off.");
    } else if (/show|add/.test(t)) {
      c.substation.enabled = true;
      notes.push("Substation on.");
    }
    if (/bigger|larger|expand/.test(t)) {
      c.substation.w *= 1.3;
      c.substation.d *= 1.3;
      notes.push("Substation scaled up.");
    }
    if (/move|shift/.test(t)) {
      const n = applyMove(c.substation, t);
      if (n != null) notes.push(`Moved substation ${n} m.`);
    }
  }

  if (/pond|detention|lake|water/.test(t)) {
    if (/hide|remove|fill/.test(t)) {
      c.pond.enabled = false;
      notes.push("Detention pond off.");
    } else if (/show|add/.test(t)) {
      c.pond.enabled = true;
      notes.push("Detention pond on.");
    }
    if (/bigger|larger/.test(t)) {
      c.pond.r = Math.min(60, c.pond.r * 1.4);
      notes.push(`Pond radius ${Math.round(c.pond.r)} m.`);
    }
    if (/smaller/.test(t)) {
      c.pond.r = Math.max(8, c.pond.r * 0.7);
      notes.push(`Pond radius ${Math.round(c.pond.r)} m.`);
    }
    if (/move|shift/.test(t)) {
      const n = applyMove(c.pond, t);
      if (n != null) notes.push(`Moved pond ${n} m.`);
    }
  }

  if (/parking|car park|lot\b/.test(t)) {
    if (/hide|remove/.test(t)) {
      c.parking.enabled = false;
      notes.push("Parking off.");
    } else if (/show|add|more parking/.test(t)) {
      c.parking.enabled = true;
      c.parking.w = Math.min(120, c.parking.w * 1.2);
      notes.push("Parking expanded.");
    }
    if (/move|shift/.test(t)) {
      const n = applyMove(c.parking, t);
      if (n != null) notes.push(`Moved parking ${n} m.`);
    }
  }

  if (/office|headhouse/.test(t)) {
    if (/hide|remove/.test(t)) {
      c.office.enabled = false;
      notes.push("Office off.");
    } else if (/show|add/.test(t)) {
      c.office.enabled = true;
      notes.push("Office on.");
    }
    if (/taller/.test(t)) {
      c.office.h = Math.min(40, c.office.h + (meters(t) ?? 4));
      notes.push(`Office ${c.office.h} m tall.`);
    }
    const color = paint(c.office, t);
    if (color) notes.push(`Office painted ${color}.`);
  }

  if (/no fence|hide (the )?fence|remove (the )?fence/.test(t)) {
    c.fence = false;
    notes.push("Fence off.");
  } else if (/add (a |the )?fence|show (the )?fence|fence on/.test(t)) {
    c.fence = true;
    notes.push("Fence on.");
  }

  if (/no hvac|hide (the )?(coolers|hvac|chillers)/.test(t)) {
    c.hvac = false;
    notes.push("Roof coolers off.");
  } else if (/add hvac|show (the )?(coolers|hvac)/.test(t)) {
    c.hvac = true;
    notes.push("Roof coolers on.");
  }

  if (/texas|fort worth|qts look/.test(t) && notes.length === 0) {
    const d = cloneCampus(DEFAULT_CAMPUS);
    d.name = c.name;
    return { campus: d, note: "Restored the Fort Worth massing.", ok: true };
  }

  if (!notes.length) {
    return {
      campus,
      note: "Try: “make DC1 taller”, “add a hall”, “more generators”, “move the pond west 40m”, “hide the fence”, “download” is a button.",
      ok: false,
    };
  }

  return { campus: c, note: notes.join(" "), ok: true };
}
