import { CloseAgent } from "./close-agent.js";
import { createOffice } from "./office-scene.js";

const agent = new CloseAgent();
const canvas = document.getElementById("view");
const office = createOffice(canvas);

const $ = (id) => document.getElementById(id);
const scores = [];
let episode = 0;
let busy = false;

function money(n) {
  return n.toLocaleString(undefined, { maximumFractionDigits: 0 });
}

function renderPolicy() {
  const p = agent.policy;
  $("policy").innerHTML = Object.entries(p)
    .map(([k, v]) => {
      const on = v === true || (typeof v === "number" && v > 0);
      return `<li class="${on ? "on" : "off"}"><span>${k.replaceAll("_", " ")}</span><b>${v === true || v === false ? (v ? "on" : "off") : v}</b></li>`;
    })
    .join("");
}

function spark() {
  const w = 220, h = 46;
  if (scores.length < 2) {
    $("spark").innerHTML = `<svg viewBox="0 0 ${w} ${h}" width="${w}" height="${h}"></svg>`;
    return;
  }
  const max = 100, min = 0;
  const pts = scores
    .map((s, i) => {
      const x = (i / (scores.length - 1)) * (w - 8) + 4;
      const y = h - 6 - ((s - min) / (max - min)) * (h - 12);
      return `${x},${y}`;
    })
    .join(" ");
  $("spark").innerHTML = `<svg viewBox="0 0 ${w} ${h}" width="${w}" height="${h}"><polyline fill="none" stroke="#c4a574" stroke-width="2" points="${pts}"/></svg>`;
}

function renderEpisode(res) {
  $("score").textContent = res.score.toFixed(0);
  $("score").className = res.balanced ? "ok" : "bad";
  $("ep").textContent = String(episode).padStart(2, "0");
  $("status").textContent = res.balanced ? "CLOSE ISSUED" : "CLOSE BLOCKED";
  $("status").className = res.balanced ? "pill ok" : "pill bad";
  $("meta").textContent = `Northline Compute · ${res.period} · bank ${res.bank_n} · GL ${res.gl_n} · AP ${res.inv_n}`;

  $("tools").innerHTML = res.tools
    .map(
      (t) => `<li class="${t.ok ? "ok" : "fail"}">
        <i>${t.station}</i>
        <strong>${t.name}</strong>
        <span>${t.detail}</span>
      </li>`
    )
    .join("");

  $("fails").innerHTML = res.failures.length
    ? res.failures
        .map((f) => `<li><b>${f.code}</b><span>${f.why}</span></li>`)
        .join("")
    : `<li class="clean"><b>NONE</b><span>No material exceptions. Audit pack complete.</span></li>`;

  $("learn").innerHTML = res.patches.map((p) => `<li>${p}</li>`).join("");
  renderPolicy();
  spark();
}

async function maybePlayMujoco(kind) {
  try {
    const url = kind === "naive" ? "./trajectories/flight_naive.json" : "./trajectories/flight_learned.json";
    const r = await fetch(url);
    if (!r.ok) return false;
    const json = await r.json();
    office.playFlight(json);
    return true;
  } catch {
    return false;
  }
}

async function runOne() {
  if (busy) return;
  busy = true;
  $("run").disabled = true;
  const res = agent.run(11 + episode, 0.72);
  episode += 1;
  scores.push(res.score);
  renderEpisode(res);
  office.queueWaypoints(res.waypoints, res.score, !res.balanced);
  if (episode === 1) await maybePlayMujoco("naive");
  if (res.balanced && episode > 1) await maybePlayMujoco("learned");
  $("run").disabled = false;
  busy = false;
  return res;
}

async function learnMany() {
  if (busy) return;
  busy = true;
  $("learn12").disabled = true;
  for (let i = 0; i < 12; i++) {
    const res = agent.run(40 + episode, 0.74);
    episode += 1;
    scores.push(res.score);
    renderEpisode(res);
    office.queueWaypoints(res.waypoints, res.score, !res.balanced);
    await new Promise((r) => setTimeout(r, 220));
  }
  await maybePlayMujoco("learned");
  $("learn12").disabled = false;
  busy = false;
}

$("run").addEventListener("click", runOne);
$("learn12").addEventListener("click", learnMany);
$("throw").addEventListener("click", () => office.throwRagdoll());
$("reset").addEventListener("click", () => {
  agent.policy = {
    timing_window_days: 0,
    match_on_vendor: false,
    fx_tolerance: 0,
    auto_post_bank_fees: false,
    fuzzy_duplicate: false,
    require_po: false,
    callback_payee_changes: false,
    require_pdf: false,
    investigate_pnl: false,
  };
  agent.history = [];
  agent.lessons = {};
  scores.length = 0;
  episode = 0;
  $("score").textContent = "—";
  $("ep").textContent = "00";
  $("status").textContent = "IDLE";
  $("status").className = "pill";
  $("tools").innerHTML = "";
  $("fails").innerHTML = "";
  $("learn").innerHTML = "";
  renderPolicy();
  spark();
});

renderPolicy();

fetch("./trajectories/curriculum.json")
  .then((r) => (r.ok ? r.json() : null))
  .then((j) => {
    if (!j) return;
    $("py").textContent = `MuJoCo curriculum on disk: ${j.summary.first_avg} → ${j.summary.last_avg} over ${j.summary.episodes} closes.`;
  })
  .catch(() => {});
