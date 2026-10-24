import { applyPrompt, cloneCampus, DEFAULT_CAMPUS } from "./campus.mjs";

function eq(a, b, msg) {
  if (JSON.stringify(a) !== JSON.stringify(b) && a !== b) {
    throw new Error(msg + ` got ${JSON.stringify(a)} expected ${JSON.stringify(b)}`);
  }
}

const c0 = cloneCampus(DEFAULT_CAMPUS);
let r = applyPrompt(c0, "make DC1 8m taller");
if (!r.ok) throw new Error(r.note);
if (r.campus.halls[0].h !== 22) throw new Error("height " + r.campus.halls[0].h);

r = applyPrompt(c0, "add a data hall");
if (r.campus.halls.length !== 3) throw new Error("hall count " + r.campus.halls.length);

r = applyPrompt(c0, "more generators");
if (r.campus.generators.cols <= c0.generators.cols) throw new Error("gens");

r = applyPrompt(c0, "move the pond west 40m");
if (r.campus.pond.x !== c0.pond.x - 40) throw new Error("pond x " + r.campus.pond.x);

r = applyPrompt(c0, "hide the fence");
if (r.campus.fence !== false) throw new Error("fence");

r = applyPrompt(c0, "paint DC1 red");
if (r.campus.halls[0].color !== "#b42318") throw new Error("color");

r = applyPrompt(c0, "reset");
if (r.campus.halls[0].h !== DEFAULT_CAMPUS.halls[0].h) throw new Error("reset");

r = applyPrompt(c0, "please the weather tomorrow");
if (r.ok) throw new Error("should fail closed");

console.log("campus.mjs ok");
