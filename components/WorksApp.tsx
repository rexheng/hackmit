"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Campus } from "@/components/Campus";
import { AFFECT } from "@/lib/affect";
import { type RedesignResult } from "@/lib/redesign";
import { scoreSite } from "@/lib/score";
import { CREW, HERO, REPS, SUPPLY_CHAIN, type LayoutState, type Pin, type PinWho } from "@/lib/site";

const VicinityMap = dynamic(() => import("@/components/VicinityMap").then((m) => m.VicinityMap), {
  ssr: false,
});

export type View = "gate" | "texas" | "works" | "supply";
type Stage = "campus" | "map" | "interior" | "affect" | "mail";
type Locate = "idle" | "asking" | "in-state" | "out-of-state" | "denied";

const LS = "compute-works-tx-blueprints";
const LS_PINS = "compute-works-tx-pins";
const LS_MAIL = "compute-works-tx-letters";

type Sheet = {
  id: number;
  prompt: string;
  letter: string;
  total: number;
  layout: LayoutState;
};

const EU: { letter: "A" | "B" | "C" | "D" | "E" | "F"; cls: string }[] = [
  { letter: "A", cls: "eu-a" },
  { letter: "B", cls: "eu-b" },
  { letter: "C", cls: "eu-c" },
  { letter: "D", cls: "eu-d" },
  { letter: "E", cls: "eu-e" },
  { letter: "F", cls: "eu-f" },
];

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    return JSON.parse(localStorage.getItem(key) || "") as T;
  } catch {
    return fallback;
  }
}

export function WorksApp({ view }: { view: View }) {
  const router = useRouter();
  const [locate, setLocate] = useState<Locate>("idle");
  const [construction, setConstruction] = useState<"half" | "full">("half");
  const [stage, setStage] = useState<Stage>(view === "gate" ? "campus" : view === "texas" ? "affect" : view === "supply" ? "affect" : "map");
  const [flight, setFlight] = useState<"hallA" | "hallB" | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [who, setWho] = useState<PinWho>("labor");
  const [pinText, setPinText] = useState("");
  const [pins, setPins] = useState<Pin[]>(HERO.seeds);
  const [layout, setLayout] = useState<LayoutState>(HERO.layout);
  const [prompt, setPrompt] = useState(HERO.prompt);
  const [redesign, setRedesign] = useState<RedesignResult | null>(null);
  const [marble, setMarble] = useState(false);
  const [sound, setSound] = useState(false);
  const [sheets, setSheets] = useState<Sheet[]>([]);
  const [letters, setLetters] = useState(0);
  const [citizenName, setCitizenName] = useState("");
  const [citizenEmail, setCitizenEmail] = useState("");
  const [city, setCity] = useState("Midlothian");
  const [extraTo, setExtraTo] = useState("");
  const [mailBody, setMailBody] = useState("");
  const [mailStatus, setMailStatus] = useState<string | null>(null);
  const [mailBusy, setMailBusy] = useState(false);

  const card = useMemo(
    () => scoreSite(HERO, layout, pins, redesign?.extras ?? {}),
    [layout, pins, redesign],
  );

  useEffect(() => {
    setPins(readJson<Pin[]>(LS_PINS, HERO.seeds));
    setSheets(readJson<Sheet[]>(LS, []));
    setLetters(readJson<number>(LS_MAIL, 0));
    try {
      const stored = sessionStorage.getItem("cw-locate") as Locate | null;
      if (stored) setLocate(stored);
    } catch {
      /* ignore */
    }
    let held: Stage | null = null;
    try {
      held = sessionStorage.getItem("cw-stage") as Stage | null;
      sessionStorage.removeItem("cw-stage");
    } catch {
      /* ignore */
    }
    if (view === "works") setStage(held === "mail" || held === "campus" || held === "interior" ? held : "map");
    if (view === "texas") setStage(held === "mail" ? "mail" : "affect");
    if (view === "supply") setStage("affect");
    if (view === "gate") setStage("campus");
  }, [view]);

  useEffect(() => {
    const draft = [
      `I am writing as a resident about the ${HERO.name} at ${HERO.address}.`,
      ``,
      `TEMPLATE grade for this campus is ${card.letter} (${card.total}/100) from a four-factor residual: electricity, jobs, water, community. This is not a vote for or against the plant. It is the arithmetic on the punch-card.`,
      ``,
      card.lines.join("\n"),
      ``,
      redesign
        ? `I am submitting this restamp:\n- ${redesign.operations.join("\n- ")}\n\n${redesign.narrative}`
        : `I have not restamped the plant yet. I am asking the record to show the current TEMPLATE letter.`,
      ``,
      `Please treat this as opt-in civic mail. I am not selling anything.`,
    ].join("\n");
    setMailBody(draft);
  }, [card, redesign]);

  const beep = useCallback(
    (f: number, d: number) => {
      if (!sound) return;
      try {
        const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        const ctx = new Ctx();
        const o = ctx.createOscillator();
        const a = ctx.createGain();
        o.type = "square";
        o.frequency.value = f;
        a.gain.value = 0.03;
        o.connect(a);
        a.connect(ctx.destination);
        o.start();
        setTimeout(() => {
          o.stop();
          void ctx.close();
        }, d);
      } catch {
        /* muted desks stay quiet */
      }
    },
    [sound],
  );

  function dropMarble() {
    setMarble(false);
    requestAnimationFrame(() => setMarble(true));
    beep(140, 40);
  }

  function goTexas(mode: Locate) {
    setLocate(mode);
    try {
      sessionStorage.setItem("cw-locate", mode);
    } catch {
      /* ignore */
    }
    dropMarble();
    setTimeout(() => router.push("/texas"), 700);
  }

  function allowLocation() {
    setLocate("asking");
    dropMarble();
    if (!navigator.geolocation) {
      goTexas("denied");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        const inTexas = lat > 25.8 && lat < 36.6 && lng > -106.7 && lng < -93.5;
        goTexas(inTexas ? "in-state" : "out-of-state");
      },
      () => goTexas("denied"),
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 60_000 },
    );
  }

  async function stampRedesign() {
    dropMarble();
    const res = await fetch("/api/redesign", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ prompt, layout }),
    });
    const data = (await res.json()) as RedesignResult;
    setRedesign(data);
    setLayout(data.layout);
    setStage("campus");
    beep(220, 80);
  }

  function pinLine() {
    const t = pinText.trim();
    if (!t) return;
    const next = [{ who, t }, ...pins].slice(0, 40);
    setPins(next);
    setPinText("");
    try {
      localStorage.setItem(LS_PINS, JSON.stringify(next));
    } catch {
      /* clothesline is this browser */
    }
    fetch("/api/comments", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ who, t }),
    }).catch(() => undefined);
    beep(260, 40);
  }

  function stampBlueprint() {
    const rec: Sheet = {
      id: Date.now(),
      prompt,
      letter: card.letter,
      total: card.total,
      layout,
    };
    const all = [rec, ...sheets].slice(0, 8);
    setSheets(all);
    try {
      localStorage.setItem(LS, JSON.stringify(all));
    } catch {
      /* single-browser share, as the prototype said */
    }
    beep(300, 90);
  }

  async function sendMail(e: React.FormEvent) {
    e.preventDefault();
    if (!citizenName || !citizenEmail.includes("@")) {
      setMailStatus("Name and a real From address are required. This is opt-in civic mail, not a blast.");
      return;
    }
    setMailBusy(true);
    setMailStatus("Stamping the envelope…");
    try {
      const res = await fetch("/api/mail", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          citizenName,
          citizenEmail,
          city,
          extraTo,
          subject: `Restamp · ${HERO.name} · grade ${card.letter}`,
          body: mailBody,
        }),
      });
      const data = await res.json();
      const n = letters + 1;
      setLetters(n);
      try {
        localStorage.setItem(LS_MAIL, JSON.stringify(n));
      } catch {
        /* ignore */
      }
      if (data.ok) {
        setMailStatus(`SENT via ${data.provider}. To: ${(data.to || []).join(", ")} · id ${data.id || "—"}`);
      } else if (data.demo) {
        setMailStatus(
          `DEMO MODE — no RESEND_API_KEY / SMTP. Letter was punched here and addressed to ${(data.to || []).join(", ")}. Set env to actually send. ${data.error || ""}`,
        );
      } else {
        setMailStatus(`HOLD — ${data.error || res.statusText}`);
      }
    } catch (err) {
      setMailStatus(`HOLD — ${err instanceof Error ? err.message : "network"}`);
    } finally {
      setMailBusy(false);
    }
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement)?.tagName;
      const typing = tag === "INPUT" || tag === "TEXTAREA";
      if ((e.key === "/" || e.key === "p" || e.key === "P") && !typing) {
        e.preventDefault();
        document.getElementById("prompt")?.focus();
      }
      if ((e.key === "h" || e.key === "H") && !typing) {
        setConstruction((c) => (c === "half" ? "full" : "half"));
      }
      if (e.key === "Escape") setFlight(null);
      if (/^[1-5]$/.test(e.key) && !typing) {
        const b = CREW[Number(e.key) - 1];
        if (b) setSelected(b.id);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const laborN = pins.filter((p) => p.who === "labor").length;
  const neighborN = pins.filter((p) => p.who === "neighbor").length;
  const opsN = pins.filter((p) => p.who === "ops").length;
  const involvement = laborN + neighborN + opsN + sheets.length + letters;

  const stewardShare = (() => {
    const blob = pins.map((p) => p.t).join(" ").toLowerCase();
    if (/creek|pond|well|water|aquifer/.test(blob))
      return "They share the creek: labor will walk the intake, neighbors want it off the wells, ops will move the pond if the letter improves.";
    if (/transformer|substation|feeder|grid|oncor|bill/.test(blob))
      return "They share the tap: do not energize another hall off a stressed feeder just because the slab is poured.";
    if (/night|noise|plume|chiller|shift/.test(blob))
      return "They share the night: a premium for the trek, a quieter tower, and no second shift of excuses.";
    if (/job|hire|apprentice/.test(blob))
      return "They share the count: construction is a crowd, operations is a badge. Write who keeps the badge.";
    return "They agree the red component is not a metaphor.";
  })();

  const plate =
    view === "gate"
      ? "CAM · AWAITING STAMP · SHARE VICINITY"
      : stage === "map"
        ? "CAM · VICINITY · GOOGLE MIDLOTHIAN · SATELLITE"
        : stage === "mail"
          ? "CAM · MAIL DESK · OPT-IN CIVIC LETTER"
          : stage === "affect"
            ? view === "supply"
              ? "CAM · BILL OF MATERIALS · SUPPLY CHAIN"
              : "CAM · LEDGER · HOW THIS PLANT TOUCHES YOU"
            : flight
              ? `CAM · DOLLHOUSE OPEN · ${flight.toUpperCase()} · ESC LEAVES`
              : "CAM · SIMPLE FLIGHT · NO WHEEL SPEED";

  return (
    <div className="works">
      <header className="sign">
        <div className="gear" aria-hidden />
        <div className="wordmark">
          <h1>COMPUTE WORKS</h1>
          <p>a marble works for megawatts</p>
          <nav className="nav-tabs" aria-label="Works desks">
            <Link className={view === "gate" ? "on" : ""} href="/">
              LOCATION
            </Link>
            <Link className={view === "texas" ? "on" : ""} href="/texas">
              TEXAS
            </Link>
            <Link className={view === "works" ? "on" : ""} href="/works">
              WORKS
            </Link>
            <Link className={view === "supply" ? "on" : ""} href="/supply">
              SUPPLY
            </Link>
          </nav>
        </div>
        <div className="lot">
          <div className="rivets">
            <i className="rivet" />
            <i className="rivet" />
            <i className="rivet" />
          </div>
          <b>LOT 03-CW · TEXAS DEMO · U.S. PAT. PEND.</b>
          TIN LITHO · {HERO.place}
          <br />
          SERIAL {HERO.serial}
        </div>
      </header>

      <div className="floor">
        <aside className="left">
          <section className="panel tag-panel">
            <h2>{view === "gate" ? "SHIPPING TAG · LOCATION" : "SHIPPING TAG · RESTAMP"}</h2>
            <div className="tag-body">
              {view === "gate" ? (
                <>
                  <div className="script-lab">Share where you stand</div>
                  <p style={{ fontFamily: "var(--font-serif), serif", fontSize: 12, margin: "6px 0 8px" }}>
                    Demo geography is Texas. Allow location and the works selects Ellis County — the high-impact campus for this stamp is Google Midlothian.
                  </p>
                  <div className="presets">
                    <button type="button" className="on" onClick={allowLocation}>
                      ALLOW LOCATION · GO TO TEXAS
                    </button>
                    <button type="button" onClick={() => goTexas("denied")}>
                      SKIP · ELLIS COUNTY ANYWAY
                    </button>
                  </div>
                  <button type="button" className="stamp-btn" onClick={allowLocation}>
                    STAMP IT
                  </button>
                </>
              ) : (
                <>
                  <div className="script-lab">Redesign this data center in English</div>
                  <textarea
                    id="prompt"
                    className="ship-input"
                    style={{ height: 52, resize: "vertical" }}
                    spellCheck={false}
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                        e.preventDefault();
                        void stampRedesign();
                      }
                    }}
                  />
                  <div className="presets">
                    <button type="button" onClick={() => setPrompt("closed-loop cooling, move the pond off the creek, local hire apprenticeships, 120-ft tree buffer, night-quiet chillers")}>
                      CLOSED LOOP · POND OFF CREEK · LOCAL HIRE
                    </button>
                    <button type="button" onClick={() => setPrompt("air cooled, one hall, battery on the lot, school-crossing gate, publish the PILOT")}>
                      AIR COOLED · ONE HALL · PILOT ON THE CARD
                    </button>
                  </div>
                  <button type="button" className="stamp-btn" onClick={() => void stampRedesign()}>
                    STAMP IT
                  </button>
                </>
              )}
              {redesign && view !== "gate" ? (
                <p className="calc restamp-receipt">
                  RESTAMPED · {redesign.operations.length} OPS ON THE CARD · LETTER MOVED
                </p>
              ) : null}
              <div className="chute" aria-hidden>
                <div className="chute-rail" />
                <div className={`marble${marble ? " go" : ""}`} />
              </div>
            </div>
          </section>

          <section className="panel levers-panel">
            <h2>LEVERS</h2>
            <div className="levers">
              <button type="button" className={`lever${construction === "half" ? " on" : ""}`} onClick={() => setConstruction("half")}>
                HALF
              </button>
              <button type="button" className={`lever${construction === "full" ? " on" : ""}`} onClick={() => setConstruction("full")}>
                FULL
              </button>
              <button
                type="button"
                className={`lever${stage === "campus" && !flight ? " on" : ""}`}
                onClick={() => {
                  setFlight(null);
                  setStage("campus");
                }}
              >
                CAMPUS
              </button>
              <button type="button" className={`lever${stage === "map" ? " on" : ""}`} onClick={() => setStage("map")}>
                MAP
              </button>
              <button
                type="button"
                className={`lever${flight ? " on" : ""}`}
                onClick={() => {
                  setStage("campus");
                  setFlight(flight || "hallA");
                }}
              >
                INTERIOR
              </button>
              <button type="button" className={`lever${stage === "affect" ? " on" : ""}`} onClick={() => setStage("affect")}>
                LEDGER
              </button>
            </div>
          </section>

          <section className="panel crew-panel">
            <h2>TIN CREW · 1–5</h2>
            <div className="roster">
              {CREW.map((b) => (
                <div
                  key={b.id}
                  className={`bot-row${selected === b.id ? " sel" : ""}`}
                  data-bot={b.id}
                  onClick={() => setSelected(b.id)}
                >
                  <i className="bot-dot" />
                  <span>
                    {b.name} · {b.role}
                  </span>
                  <span className="ser">{b.ser}</span>
                </div>
              ))}
            </div>
          </section>
        </aside>

        <main className="stage-wrap" id="stage">
          <div className="stage-plate">{plate}</div>
          {view === "gate" ? (
            <>
              <Campus
                visible
                construction="half"
                layout={layout}
                selected={null}
                onSelect={() => undefined}
                onLayout={setLayout}
                onFlight={() => undefined}
              />
              <div className="await">
              <div className="plate">
                <h3>AWAITING A VICINITY</h3>
                <p>
                  The lot is empty until you stamp a place. This demo’s selected area is Texas — Ellis County, Midlothian, Google’s campus on RailPort Parkway.
                </p>
                <button type="button" className="stamp-btn" onClick={allowLocation}>
                  ALLOW LOCATION
                </button>
                {locate === "asking" ? <p style={{ marginTop: 10 }}>Listening for a fix…</p> : null}
              </div>
            </div>
            </>
          ) : null}
          {view !== "gate" && view !== "supply" ? (
            <>
              <VicinityMap visible={stage === "map"} />
              <Campus
                visible={stage === "campus"}
                construction={construction}
                layout={layout}
                selected={selected}
                onSelect={setSelected}
                onLayout={setLayout}
                onFlight={(h) => {
                  setFlight(h);
                  if (h) setStage("campus");
                }}
              />
              <div className={`cutaway${flight && stage === "campus" ? " open" : ""}`}>
                <h3>{flight === "hallB" ? "HALL B" : "HALL A"} · DOLLHOUSE OPEN</h3>
                <div className="aisle">
                  {Array.from({ length: 8 }, (_, i) => (
                    <i key={i} className="cab" />
                  ))}
                </div>
                <div className="cap">
                  Front wall swung on a fixed ease. {HERO.coolingKind}. Esc or click dirt to close.
                </div>
              </div>
              {stage === "affect" ? (
                <article className="ledger">
                  <div className="kicker">{AFFECT.kicker}</div>
                  <h3>{AFFECT.title}</h3>
                  {view === "texas" ? (
                    <p>
                      <b>SELECTED AREA · TEXAS · ELLIS COUNTY · MIDLOTHIAN.</b>{" "}
                      {locate === "in-state"
                        ? "Your fix landed in Texas. This demo’s high-impact campus is the Google plant on RailPort Parkway."
                        : locate === "out-of-state"
                          ? "Your fix is outside Texas. Demo geography is still Ellis County — the plant a Texan would meet first in this stamp."
                          : "Location skipped or unavailable. Demo geography is Texas. The selected area is Ellis County anyway."}
                    </p>
                  ) : null}
                  <p>{AFFECT.lead}</p>
                  {AFFECT.sections.map((s) => (
                    <section key={s.h}>
                      <h4>{s.h}</h4>
                      {s.p.map((para) => (
                        <p key={para.slice(0, 24)}>{para}</p>
                      ))}
                    </section>
                  ))}
                  {view === "texas" ? (
                    <button type="button" className="stamp-btn" onClick={() => router.push("/works")}>
                      ENTER THE WORKS · OPEN THE MAP
                    </button>
                  ) : null}
                </article>
              ) : null}
              {stage === "mail" ? (
                <article className="ledger">
                  <div className="kicker">OPT-IN CIVIC MAIL · NOT A BLAST · REPLY-TO IS YOU</div>
                  <h3>SEND THE RESTAMP TO THE DESKS</h3>
                  <p>
                    Constructed public addresses for TX-6, the Ellis County Judge, and the City of Midlothian, plus an optional extra To. This is a letter from a resident, not a harvest.
                  </p>
                  {REPS.map((r) => (
                    <div key={r.email} className="clipping">
                      <span className="pin">{r.title}</span>
                      <h3>{r.name}</h3>
                      <p>
                        {r.email} — {r.why}
                      </p>
                    </div>
                  ))}
                  <form className="mail-form" onSubmit={sendMail}>
                    <label>
                      YOUR NAME
                      <input value={citizenName} onChange={(e) => setCitizenName(e.target.value)} required />
                    </label>
                    <label>
                      YOUR EMAIL (reply-to)
                      <input type="email" value={citizenEmail} onChange={(e) => setCitizenEmail(e.target.value)} required />
                    </label>
                    <label>
                      CITY
                      <input value={city} onChange={(e) => setCity(e.target.value)} />
                    </label>
                    <label>
                      EXTRA TO (optional)
                      <input value={extraTo} onChange={(e) => setExtraTo(e.target.value)} placeholder="another desk, if you have one" />
                    </label>
                    <label>
                      LETTER
                      <textarea value={mailBody} onChange={(e) => setMailBody(e.target.value)} />
                    </label>
                    <button type="submit" className="stamp-btn" style={{ marginTop: 8 }} disabled={mailBusy}>
                      {mailBusy ? "SENDING…" : "SEND TO THE DESKS"}
                    </button>
                  </form>
                  {mailStatus ? <div className="mail-status">{mailStatus}</div> : null}
                </article>
              ) : null}
            </>
          ) : null}
          {view === "supply" ? (
            <article className="ledger">
              <div className="kicker">
                CORPORATE TRACKING · WHO BUILDS AND FEEDS THE PLANT · <span className="tmpl">TEMPLATE WHERE MARKED</span>
              </div>
              <h3>BILL OF MATERIALS · {HERO.name}</h3>
              <p>
                A campus is a stack of companies. This page is a ledger, not a boycott list. Public operators and utilities are named as themselves. Contractors and chip vendors are stamped TEMPLATE until a permit set confirms them.
              </p>
              <table className="supply-table">
                <thead>
                  <tr>
                    <th>TIER</th>
                    <th>COMPANY</th>
                    <th>ROLE</th>
                    <th>NOTE</th>
                  </tr>
                </thead>
                <tbody>
                  {SUPPLY_CHAIN.map((row) => (
                    <tr key={row.company}>
                      <td className="tier">{row.tier}</td>
                      <td className="co">
                        {row.company}
                        {row.template ? <span className="tmpl">TEMPLATE</span> : null}
                      </td>
                      <td>{row.role}</td>
                      <td>{row.note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </article>
          ) : null}
        </main>

        <aside className="right">
          <section className="panel punch-panel">
            <h2>PUNCH CARD · TREE GRADE</h2>
            <div className="card-body">
              <div className="punch">
                {HERO.place} · {HERO.serial}
                <br />
                <span className="tmpl">TEMPLATE NUMBERS</span>
                <div className="eu" aria-label={`Grade ${card.letter}`}>
                  {EU.map((row) => (
                    <div key={row.letter} className={`eu-row${card.letter === row.letter ? " on" : ""}`}>
                      <span>{row.letter}</span>
                      <i className={`eu-bar ${row.cls}`} />
                      <span>{card.letter === row.letter ? card.total.toFixed(0) : ""}</span>
                    </div>
                  ))}
                </div>
                <div className="factors-grid">
                  {card.factors.map((f) => (
                    <article key={f.id} className="factor compact">
                      <h3>
                        {f.label} <span>{f.score}</span>
                      </h3>
                      <div className="meter">
                        <i style={{ width: `${f.score}%` }} />
                      </div>
                    </article>
                  ))}
                </div>
                <div className="holes">{card.lines[2]}</div>
              </div>
              <div className="alpha">
                RESIDUAL LETTER · NEUTRAL CALCULUS ONLY
                <em>
                  GRADE {card.letter} · {card.total.toFixed(1)}
                </em>
                Neither anti nor pro. The band is the arithmetic.
              </div>
            </div>
          </section>

          <section className="panel clip-panel">
            <h2>CLIPBOARD · INGEST</h2>
            <div className="clip">
              {HERO.news.map((n) => (
                <article key={n.h} className="clipping">
                  <span className="pin">{n.pin}</span>
                  <h3>{n.h}</h3>
                  <p>{n.p}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="panel union-panel">
            <h2>UNION BOARD</h2>
            <div className="board">
              <textarea
                value={pinText}
                onChange={(e) => setPinText(e.target.value)}
                placeholder="Pin a line — labor, neighbor, or ops…"
              />
              <div className="pin-row">
                {(["labor", "neighbor", "ops"] as PinWho[]).map((w) => (
                  <button key={w} type="button" className={`chip${who === w ? " on" : ""}`} onClick={() => setWho(w)}>
                    {w.toUpperCase()}
                  </button>
                ))}
                <button type="button" className="stamp-btn" style={{ flex: 1, fontSize: 16, padding: "2px 4px 0" }} onClick={pinLine}>
                  PIN
                </button>
              </div>
              <ul className="pins">
                {pins.map((p, i) => (
                  <li key={`${p.t}-${i}`}>
                    <b>{p.who.toUpperCase()}</b> — {p.t}
                  </li>
                ))}
              </ul>
              <div className="steward">
                <small>SHOP STEWARD · COMMON GROUND</small>
                <div className="cols">
                  <div>
                    <b>LABOR</b>
                    <br />
                    {pins.find((p) => p.who === "labor")?.t || "No labor pin yet."}
                  </div>
                  <div>
                    <b>NEIGHBORS</b>
                    <br />
                    {pins.find((p) => p.who === "neighbor")?.t || "No neighbor pin yet."}
                  </div>
                  <div>
                    <b>OPS</b>
                    <br />
                    {pins.find((p) => p.who === "ops")?.t || "No ops pin yet."}
                  </div>
                </div>
                <p>{stewardShare}</p>
                <div className="demo-index">
                  <div>
                    PINS
                    <b>{pins.length}</b>
                  </div>
                  <div>
                    LETTERS STAMPED
                    <b>{letters}</b>
                  </div>
                  <div>
                    BLUEPRINTS
                    <b>{sheets.length}</b>
                  </div>
                  <div>
                    INVOLVEMENT INDEX
                    <b>{involvement}</b>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </aside>
      </div>

      <footer className="belt">
        <div className="hint">
          / OR P · PROMPT
          <br />
          H · HALF/FULL
          <br />
          1–5 · CREW
          <br />
          ESC · LEAVE HALL
        </div>
        <div>
          <div style={{ fontSize: 15, letterSpacing: ".16em", color: "var(--cream)", padding: "10px 0 0" }}>
            CLOTHESLINE · STAMPED PLANS
          </div>
          <div className="line">
            {sheets.length ? (
              sheets.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  className="sheet"
                  onClick={() => {
                    setLayout(s.layout);
                    setPrompt(s.prompt);
                  }}
                >
                  <div className="peg" />
                  {HERO.place}
                  <br />
                  GRADE {s.letter} · {s.total.toFixed(0)}
                </button>
              ))
            ) : (
              <div className="sheet">
                <div className="peg" />
                NO PLANS STAMPED
                <br />
                YET · THE LINE IS EMPTY
              </div>
            )}
          </div>
        </div>
        <button
          type="button"
          className="share-btn"
          onClick={() => {
            setStage("mail");
            if (view === "gate" || view === "supply") {
              try {
                sessionStorage.setItem("cw-stage", "mail");
              } catch {
                /* ignore */
              }
              router.push("/works");
            }
          }}
        >
          MAIL THE
          <br />
          DESKS
        </button>
        <button type="button" className="share-btn" onClick={stampBlueprint}>
          STAMP THE
          <br />
          BLUEPRINT
        </button>
        <label className="mute">
          <input type="checkbox" checked={sound} onChange={(e) => setSound(e.target.checked)} /> SOUND
        </label>
        <div className="conveyor" />
      </footer>
    </div>
  );
}
