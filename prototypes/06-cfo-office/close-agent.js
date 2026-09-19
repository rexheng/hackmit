/** Browser port of sim/agent.py — month-end close that rewrites its own policy. */

const VENDORS = [
  ["ERCOT", "power"],
  ["Oncor Electric", "power"],
  ["Trane Comfort", "cooling"],
  ["Culligan Process Water", "water"],
  ["Turner Construction", "capex"],
  ["Equinix Cross-Connect", "network"],
  ["Marsh McLennan", "insurance"],
  ["Deloitte Tax", "professional"],
  ["Crane County PILOT", "tax"],
  ["ADP Payroll", "payroll"],
  ["Microsoft Azure", "cloud"],
  ["Siemens Switchgear", "capex"],
];

function mulberry32(a) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function line(id, system, date, amount, currency, vendor, memo, ref, account, extra = {}) {
  return { id, system, date, amount, currency, vendor, memo, ref, account, extra };
}

export function generateClose(seed = 0, difficulty = 0.72) {
  const rng = mulberry32(seed >>> 0);
  difficulty = Math.min(1, Math.max(0.15, difficulty));
  const planted = [];
  const bank = [];
  const gl = [];
  const invoices = [];
  const payments = [];
  const n = 18 + Math.floor(8 * difficulty);

  for (let i = 0; i < n; i++) {
    const [vendor, category] = VENDORS[i % VENDORS.length];
    const day = 1 + Math.floor((i * 1.7) % 27);
    const date = `2026-08-${String(day).padStart(2, "0")}`;
    const amount = Math.round((category === "payroll" ? 180000 + rng() * 80000 : 1200 + rng() * 82800) * 100) / 100;
    const ref = `INV-${8000 + i}`;
    const memo = `${category} · ${vendor}`;
    const inv = line(`IN-${String(i).padStart(4, "0")}`, "ap", date, amount, "USD", vendor, memo, ref, "2100 AP", {
      po: `PO-${400 + i}`,
      status: "open",
      pdf: true,
    });
    invoices.push(inv);

    let bankDate = date;
    let bankAmt = -amount;
    let glAmt = -amount;
    const roll = rng();
    if (roll < 0.12 * difficulty) {
      const d = Math.min(28, day + 1);
      bankDate = `2026-08-${String(d).padStart(2, "0")}`;
      planted.push({ code: "TIMING_WINDOW", line: inv.id, why: `${vendor} ACH settled ${bankDate} but GL booked ${date}.` });
    } else if (roll < 0.22 * difficulty) {
      invoices.push(
        line(`IN-D${i}`, "ap", date, amount, "USD", vendor, memo, `${ref}-A`, "2100 AP", {
          po: inv.extra.po,
          status: "open",
          duplicate_of: ref,
        })
      );
      planted.push({ code: "DUP_INVOICE", line: `IN-D${i}`, why: `Duplicate AP invoice ${ref}-A clones ${ref} for ${vendor}.` });
    }

    if (inv.extra.status === "blocked") {
      planted.push({ code: "PAYMENT_HOLD", line: inv.id, why: `Payment file omitted ${vendor}.` });
    } else {
      payments.push(line(`PY-${i}`, "pay", date, amount, "USD", vendor, memo, `ACH-${9000 + i}`, "1000 Cash", { invoice: ref }));
      bank.push(line(`BK-${i}`, "bank", bankDate, bankAmt, "USD", vendor, memo, `ACH-${9000 + i}`, "1000 Cash"));
      gl.push(line(`GL-${i}`, "gl", date, glAmt, "USD", vendor, memo, ref, "1000 Cash"));
    }
  }

  if (difficulty >= 0.5) {
    invoices.push(line("IN-DUPX", "ap", "2026-08-12", 4400, "USD", "Trane Comfort", "cooling · dup", "INV-DUP-A", "2100 AP", { po: "PO-409", duplicate_of: "INV-DUP" }));
    planted.push({ code: "DUP_INVOICE", line: "IN-DUPX", why: "Duplicate AP invoice INV-DUP-A clones INV-DUP for Trane Comfort." });
    invoices.push(line("IN-NOPO", "ap", "2026-08-18", 12600, "USD", "Turner Construction", "capex · no PO", "INV-NOPO", "2100 AP", { po: "", status: "blocked" }));
    planted.push({ code: "MISSING_PO", line: "IN-NOPO", why: "Turner Construction invoice INV-NOPO has no purchase order; 3-way match fails." });
    invoices.push(line("IN-PAYX", "ap", "2026-08-20", 8800, "USD", "Siemens Switchgear", "capex · payee", "INV-PAYX", "2100 AP", { po: "PO-777", payee_change: true, w9: false }));
    planted.push({ code: "PAYEE_CHANGE", line: "IN-PAYX", why: "Siemens Switchgear changed bank details without a validated W-9 / callback." });
    invoices.push(line("IN-PDFX", "ap", "2026-08-21", 2100, "USD", "Deloitte Tax", "professional · no pdf", "INV-PDFX", "2100 AP", { po: "PO-221", pdf: false }));
    planted.push({ code: "AUDIT_GAP", line: "IN-PDFX", why: "No invoice PDF / hash on INV-PDFX; audit support incomplete." });
    invoices.push(line("IN-EURX", "ap", "2026-08-09", 5000, "EUR", "Marsh McLennan", "insurance · EUR", "INV-EURX", "2100 AP", { po: "PO-EUR", pdf: true }));
    gl.push(line("GL-EURX", "gl", "2026-08-09", -5600, "USD", "Marsh McLennan", "insurance · EUR", "INV-EURX", "1000 Cash"));
    bank.push(line("BK-EURX", "bank", "2026-08-09", -5400, "USD", "Marsh McLennan", "insurance · EUR", "ACH-EURX", "1000 Cash"));
    planted.push({ code: "FX_VARIANCE", line: "IN-EURX", why: "Marsh McLennan EUR booked at 1.12; bank cleared at 1.08." });
    gl.push(line("GL-TIME", "gl", "2026-08-05", -3200, "USD", "Equinix Cross-Connect", "network · t+1", "INV-TIME", "1000 Cash"));
    bank.push(line("BK-TIME", "bank", "2026-08-06", -3200, "USD", "Equinix Cross-Connect", "network · t+1", "ACH-TIME", "1000 Cash"));
    planted.push({ code: "TIMING_WINDOW", line: "BK-TIME", why: "Equinix Cross-Connect ACH settled 2026-08-06 but GL booked 2026-08-05." });
  }
  if (difficulty >= 0.3) {
    bank.push(line("BK-FEES", "bank", "2026-08-31", -42.5, "USD", "Chase", "account analysis fee", "FEE-831", "1000 Cash"));
    planted.push({ code: "BANK_FEE", line: "BK-FEES", why: "Chase analysis fee $42.50 hit the bank and was never booked in the GL." });
  }
  const prior = { revenue: 4820000, power: 1140000, water: 86000, opex: 2010000 };
  const current = { ...prior };
  if (difficulty >= 0.35) {
    current.revenue = 5610000;
    gl.push(line("GL-CATCH", "gl", "2026-08-29", 790000, "USD", "Oncor Electric", "true-up interconnection", "JE-TRUEUP", "4000 Revenue"));
    planted.push({ code: "UNEXPECTED_CHANGE", line: "GL-CATCH", why: "Revenue +$790k vs July. Source: Oncor interconnection true-up, not run-rate." });
  }
  return { seed, period: "2026-08", bank, gl, invoices, payments, prior_pnl: prior, current_pnl: current, planted };
}

export function naivePolicy() {
  return {
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
}

function dateShift(a, b) {
  return Math.abs(Number(a.slice(-2)) - Number(b.slice(-2)));
}

export class CloseAgent {
  constructor(policy) {
    this.policy = policy || naivePolicy();
    this.history = [];
    this.lessons = {};
  }

  run(seed = 0, difficulty = 0.72) {
    const pack = generateClose(seed, difficulty);
    const before = { ...this.policy };
    const tools = [];
    const failures = [];
    const waypoints = ["door"];
    const call = (name, station, detail, ok = true) => {
      tools.push({ name, station, detail, ok });
      waypoints.push(station);
    };
    const p = this.policy;
    call("ingest_sources", "door", `Load ${pack.period} bank / GL / AP / payments`);

    call("match_bank_gl", "planter", "Reconcile bank against cash GL");
    const matchedGl = new Set();
    const unmatchedBank = [];
    for (const b of pack.bank) {
      let hit = null;
      for (const g of pack.gl) {
        if (matchedGl.has(g.id) || g.account !== "1000 Cash") continue;
        const sameDay = dateShift(b.date, g.date) <= p.timing_window_days;
        const sameVendor = !p.match_on_vendor || b.vendor === g.vendor;
        const rel = Math.abs(Math.abs(b.amount) - Math.abs(g.amount)) / Math.max(Math.abs(b.amount), 1);
        const sameAmt = Math.abs(Math.abs(b.amount) - Math.abs(g.amount)) <= 0.02;
        if (sameAmt && sameDay && sameVendor) {
          hit = g;
          break;
        }
        if (p.fx_tolerance >= 0.03 && sameDay && b.vendor === g.vendor && rel < 0.08) {
          hit = g;
          break;
        }
      }
      if (hit) matchedGl.add(hit.id);
      else unmatchedBank.push(b);
    }

    if (unmatchedBank.some((b) => b.id === "BK-FEES")) {
      if (p.auto_post_bank_fees) call("post_bank_fee", "desk", "Auto-post Chase analysis fee $42.50");
      else {
        failures.push({ code: "BANK_FEE", why: "Chase analysis fee $42.50 hit the bank and was never booked in the GL.", station: "desk" });
        call("post_bank_fee", "desk", "Fee unbooked — cash will not tie", false);
      }
    }
    if (unmatchedBank.some((b) => b.id !== "BK-FEES") && p.timing_window_days < 1) {
      failures.push({
        code: "TIMING_WINDOW",
        why: "ACH settled T+1 vs GL same-day key. Matcher used amount+date only.",
        station: "planter",
      });
      call("investigate_timing", "planter", "T+1 settlement missed", false);
    }
    if (pack.planted.some((x) => x.code === "FX_VARIANCE") && p.fx_tolerance < 0.03) {
      const fx = pack.planted.find((x) => x.code === "FX_VARIANCE");
      failures.push({ code: "FX_VARIANCE", why: fx.why, station: "desk" });
      call("investigate_fx", "desk", "EUR rate 1.12 vs 1.08 unexplained", false);
    }

    call("review_ap_exceptions", "sideboard", `${pack.invoices.length} invoices`);
    let openEx = 0;
    for (const inv of pack.invoices) {
      if (inv.extra.duplicate_of) {
        if (p.fuzzy_duplicate) call("collapse_duplicate", "sideboard", `Collapsed ${inv.ref}`);
        else {
          openEx++;
          failures.push({ code: "DUP_INVOICE", why: `Duplicate AP invoice ${inv.ref} clones ${inv.extra.duplicate_of}.`, station: "sideboard" });
          call("collapse_duplicate", "sideboard", `Missed duplicate ${inv.ref}`, false);
        }
      }
      if (inv.extra.po === "" && inv.extra.status === "blocked") {
        if (p.require_po) call("request_po", "chair", `Held ${inv.ref} pending PO`);
        else {
          openEx++;
          failures.push({ code: "MISSING_PO", why: `${inv.vendor} invoice ${inv.ref} has no purchase order; 3-way match fails.`, station: "chair" });
          call("three_way_match", "chair", `${inv.ref} posted without PO`, false);
        }
      }
      if (inv.extra.payee_change) {
        if (p.callback_payee_changes) call("callback_vendor", "chair", `Validated ${inv.vendor} bank change`);
        else {
          openEx++;
          failures.push({ code: "PAYEE_CHANGE", why: `${inv.vendor} changed bank details without a validated W-9 / callback.`, station: "chair" });
          call("release_payment", "chair", `Unsafe payee change on ${inv.ref}`, false);
        }
      }
      if (inv.extra.pdf === false) {
        if (p.require_pdf) call("pull_invoice_pdf", "bookshelf", `Archived PDF for ${inv.ref}`);
        else {
          failures.push({ code: "AUDIT_GAP", why: `No invoice PDF / hash on ${inv.ref}; audit support incomplete.`, station: "bookshelf" });
          call("pull_invoice_pdf", "bookshelf", `Audit pack missing ${inv.ref}`, false);
        }
      }
    }

    const revDelta = pack.current_pnl.revenue - pack.prior_pnl.revenue;
    call("investigate_variance", "desk", `Revenue Δ $${revDelta.toLocaleString()} vs July`);
    if (revDelta > 50000) {
      if (p.investigate_pnl) call("attach_trueup_memo", "bookshelf", "Oncor interconnection true-up — not run-rate");
      else {
        failures.push({ code: "UNEXPECTED_CHANGE", why: "Revenue +$790k vs July. Source: Oncor interconnection true-up, not run-rate.", station: "desk" });
        call("attach_trueup_memo", "bookshelf", "Variance unexplained in the close memo", false);
      }
    }

    const balanced = failures.length === 0;
    if (!balanced) {
      call("emit_cash_report", "coffee_table", "Close BLOCKED — exceptions still open", false);
      waypoints.push("floor");
    } else call("emit_cash_report", "coffee_table", "Cash ties. Report issued.");

    const weights = {
      BANK_FEE: 8,
      TIMING_WINDOW: 12,
      FX_VARIANCE: 14,
      DUP_INVOICE: 12,
      MISSING_PO: 14,
      PAYEE_CHANGE: 16,
      AUDIT_GAP: 10,
      UNEXPECTED_CHANGE: 14,
    };
    let score = 100;
    const seen = new Set();
    for (const f of failures) {
      score -= seen.has(f.code) ? (weights[f.code] || 8) * 0.35 : weights[f.code] || 8;
      seen.add(f.code);
    }
    score = Math.max(0, Math.round(score * 100) / 100);

    const patches = this.learn(failures);
    const result = {
      seed: pack.seed,
      score,
      balanced,
      failures,
      patches,
      tools,
      waypoints,
      policy_before: before,
      policy_after: { ...this.policy },
      open_exceptions: openEx,
      period: pack.period,
      bank_n: pack.bank.length,
      gl_n: pack.gl.length,
      inv_n: pack.invoices.length,
    };
    this.history.push(result);
    return result;
  }

  learn(failures) {
    const patches = [];
    const codes = new Set(failures.map((f) => f.code));
    const setFlag = (attr, value, note) => {
      if (this.policy[attr] !== value) {
        this.policy[attr] = value;
        patches.push(note);
        this.lessons[attr] = (this.lessons[attr] || 0) + 1;
      }
    };
    if (codes.has("TIMING_WINDOW")) {
      if (this.policy.timing_window_days < 1) {
        this.policy.timing_window_days = 1;
        patches.push("Learned: bank ACH can settle T+1 — open a 1-day matching window.");
        this.lessons.timing_window_days = (this.lessons.timing_window_days || 0) + 1;
      }
      setFlag("match_on_vendor", true, "Learned: pair timing breaks on vendor, not just amount+date.");
    }
    if (codes.has("BANK_FEE")) setFlag("auto_post_bank_fees", true, "Learned: auto-post account-analysis fees under $100.");
    if (codes.has("FX_VARIANCE") && this.policy.fx_tolerance < 0.04) {
      this.policy.fx_tolerance = 0.04;
      patches.push("Learned: allow 4% FX tolerance and flag the rate source.");
      this.lessons.fx_tolerance = (this.lessons.fx_tolerance || 0) + 1;
    }
    if (codes.has("DUP_INVOICE")) setFlag("fuzzy_duplicate", true, "Learned: collapse INV-n / INV-n-A duplicates before paying.");
    if (codes.has("MISSING_PO")) setFlag("require_po", true, "Learned: block 3-way match failures instead of posting.");
    if (codes.has("PAYEE_CHANGE")) setFlag("callback_payee_changes", true, "Learned: callback + W-9 before any payee-bank change.");
    if (codes.has("AUDIT_GAP")) setFlag("require_pdf", true, "Learned: no close without invoice PDF hash in the audit pack.");
    if (codes.has("UNEXPECTED_CHANGE")) setFlag("investigate_pnl", true, "Learned: explain material P&L deltas in the close memo.");
    if (!patches.length) patches.push(failures.length ? "Escalate remaining items to the controller." : "Close clean. Policy held. Dampen thrusters.");
    return patches;
  }
}
