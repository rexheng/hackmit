"""Self-improving Office-of-the-CFO close agent.

It executes a real-ish month-end workflow against messy books:
  ingest → match bank/GL/AP → investigate variances → resolve exceptions
  → gather audit support → emit cash report.

Failures are typed. After each run the agent patches its own policy.
Physical layer maps each tool call to a MuJoCo waypoint in the office.
"""

from __future__ import annotations

import copy
import json
from dataclasses import asdict, dataclass, field
from typing import Any

try:
    from .books import ClosePack, Line, cash_balance, generate_close
except ImportError:
    from books import ClosePack, Line, cash_balance, generate_close


STATIONS = {
    "ingest": "door",
    "bank": "planter",
    "gl": "desk",
    "ap": "sideboard",
    "audit": "bookshelf",
    "exceptions": "chair",
    "report": "coffee_table",
    "fail": "floor",
}


@dataclass
class Policy:
    """Behavioral parameters the agent rewrites when it fails."""

    timing_window_days: int = 0
    match_on_vendor: bool = False
    fx_tolerance: float = 0.0
    auto_post_bank_fees: bool = False
    fuzzy_duplicate: bool = False
    require_po: bool = False
    callback_payee_changes: bool = False
    require_pdf: bool = False
    investigate_pnl: bool = False
    escalate_material: float = 50_000.0

    def as_dict(self) -> dict[str, Any]:
        return asdict(self)


@dataclass
class Failure:
    code: str
    why: str
    station: str
    line_id: str | None = None


@dataclass
class ToolCall:
    name: str
    station: str
    detail: str
    ok: bool


@dataclass
class EpisodeResult:
    seed: int
    score: float
    balanced: bool
    report: dict[str, Any]
    failures: list[Failure]
    patches: list[str]
    tools: list[ToolCall]
    policy_before: dict[str, Any]
    policy_after: dict[str, Any]
    waypoints: list[str]


def _near_amount(a: float, b: float, tol: float) -> bool:
    return abs(abs(a) - abs(b)) <= max(tol, 0.01)


def _date_shift(a: str, b: str) -> int:
    # YYYY-MM-DD
    return abs(int(a[-2:]) - int(b[-2:]))


class CloseAgent:
    def __init__(self, policy: Policy | None = None):
        self.policy = policy or Policy()
        self.history: list[EpisodeResult] = []
        self.lessons: dict[str, int] = {}

    def run(self, pack: ClosePack | None = None, seed: int = 0, difficulty: float = 0.6) -> EpisodeResult:
        pack = pack or generate_close(seed, difficulty)
        before = self.policy.as_dict()
        tools: list[ToolCall] = []
        failures: list[Failure] = []
        waypoints: list[str] = ["door"]

        def call(name: str, station: str, detail: str, ok: bool = True) -> None:
            tools.append(ToolCall(name, station, detail, ok))
            waypoints.append(station)

        call("ingest_sources", "door", f"Load {pack.period} bank / GL / AP / payments", True)

        # --- match bank to GL ---
        call("match_bank_gl", "planter", "Reconcile bank against cash GL")
        matched_bank: set[str] = set()
        matched_gl: set[str] = set()
        unmatched_bank: list[Line] = []
        p = self.policy

        for b in pack.bank:
            hit = None
            for g in pack.gl:
                if g.id in matched_gl or g.account != "1000 Cash":
                    continue
                amt_tol = abs(b.amount) * p.fx_tolerance if (b.currency != "USD" or g.extra.get("fx")) else 0.02
                # FX planted on invoice; GL/bank amounts already differ.
                if p.fx_tolerance > 0:
                    amt_tol = max(amt_tol, abs(b.amount) * p.fx_tolerance)
                same_amt = _near_amount(b.amount, g.amount, amt_tol)
                same_day = _date_shift(b.date, g.date) <= p.timing_window_days
                same_vendor = (not p.match_on_vendor) or b.vendor == g.vendor
                if same_amt and same_day and same_vendor:
                    hit = g
                    break
                # FX case: amounts disagree by ~3.7% — only match with tolerance.
                if p.fx_tolerance >= 0.03 and same_day and b.vendor == g.vendor and abs(abs(b.amount) - abs(g.amount)) / max(abs(b.amount), 1) < 0.08:
                    hit = g
                    break
            if hit:
                matched_bank.add(b.id)
                matched_gl.add(hit.id)
            else:
                unmatched_bank.append(b)

        if any(b.id == "BK-FEES" for b in unmatched_bank):
            if p.auto_post_bank_fees:
                call("post_bank_fee", "desk", "Auto-post Chase analysis fee $42.50", True)
                matched_bank.add("BK-FEES")
                unmatched_bank = [b for b in unmatched_bank if b.id != "BK-FEES"]
            else:
                failures.append(Failure("BANK_FEE", "Chase analysis fee $42.50 hit the bank and was never booked in the GL.", "desk", "BK-FEES"))
                call("post_bank_fee", "desk", "Fee unbooked — cash will not tie", False)

        timing_left = [b for b in unmatched_bank if b.id != "BK-FEES"]
        if timing_left and p.timing_window_days < 1:
            for b in timing_left:
                # If a GL exists same vendor different day, it's a timing miss.
                if any(g.vendor == b.vendor and g.account == "1000 Cash" for g in pack.gl):
                    failures.append(Failure("TIMING_WINDOW", f"{b.vendor} settled {b.date} vs GL date mismatch; matcher used same-day key.", "planter", b.id))
                    call("investigate_timing", "planter", f"{b.vendor} T+1 settlement missed", False)

        if any(x["code"] == "FX_VARIANCE" for x in pack.planted) and p.fx_tolerance < 0.03:
            fx = next(x for x in pack.planted if x["code"] == "FX_VARIANCE")
            failures.append(Failure("FX_VARIANCE", fx["why"], "desk", fx["line"]))
            call("investigate_fx", "desk", "EUR rate 1.12 vs 1.08 unexplained", False)

        # --- AP exceptions ---
        call("review_ap_exceptions", "sideboard", f"{len(pack.invoices)} invoices")
        open_exceptions = 0
        for inv in pack.invoices:
            if inv.extra.get("duplicate_of"):
                if p.fuzzy_duplicate:
                    call("collapse_duplicate", "sideboard", f"Collapsed {inv.ref} into {inv.extra['duplicate_of']}", True)
                else:
                    open_exceptions += 1
                    failures.append(Failure("DUP_INVOICE", f"Duplicate AP invoice {inv.ref} clones {inv.extra['duplicate_of']}.", "sideboard", inv.id))
                    call("collapse_duplicate", "sideboard", f"Missed duplicate {inv.ref}", False)
            if inv.extra.get("po") == "" and inv.extra.get("status") == "blocked":
                if p.require_po:
                    call("request_po", "chair", f"Held {inv.ref} pending PO — documented", True)
                else:
                    open_exceptions += 1
                    failures.append(Failure("MISSING_PO", f"{inv.vendor} invoice {inv.ref} has no purchase order; 3-way match fails.", "chair", inv.id))
                    call("three_way_match", "chair", f"{inv.ref} posted without PO", False)
            if inv.extra.get("payee_change"):
                if p.callback_payee_changes:
                    call("callback_vendor", "chair", f"Validated {inv.vendor} bank change", True)
                else:
                    open_exceptions += 1
                    failures.append(Failure("PAYEE_CHANGE", f"{inv.vendor} changed bank details without a validated W-9 / callback.", "chair", inv.id))
                    call("release_payment", "chair", f"Unsafe payee change on {inv.ref}", False)
            if inv.extra.get("pdf") is False:
                if p.require_pdf:
                    call("pull_invoice_pdf", "bookshelf", f"Archived PDF for {inv.ref}", True)
                else:
                    failures.append(Failure("AUDIT_GAP", f"No invoice PDF / hash on {inv.ref}; audit support incomplete.", "bookshelf", inv.id))
                    call("pull_invoice_pdf", "bookshelf", f"Audit pack missing {inv.ref}", False)

        # --- unexpected change ---
        rev_delta = pack.current_pnl["revenue"] - pack.prior_pnl["revenue"]
        call("investigate_variance", "desk", f"Revenue Δ ${rev_delta:,.0f} vs July")
        if rev_delta > 50_000:
            if p.investigate_pnl:
                call("attach_trueup_memo", "bookshelf", "Oncor interconnection true-up — not run-rate", True)
            else:
                failures.append(Failure("UNEXPECTED_CHANGE", "Revenue +$790k vs July. Source: Oncor interconnection true-up, not run-rate.", "desk", "GL-CATCH"))
                call("attach_trueup_memo", "bookshelf", "Variance unexplained in the close memo", False)

        # --- cash report ---
        bank_cash = cash_balance(pack.bank)
        gl_cash = cash_balance([g for g in pack.gl if g.account == "1000 Cash"])
        # Fees and unmatched items drive imbalance when not learned.
        balanced = len(failures) == 0
        if not balanced:
            call("emit_cash_report", "coffee_table", "Close BLOCKED — exceptions still open", False)
            waypoints.append("floor")
        else:
            call("emit_cash_report", "coffee_table", f"Cash ties at bank {bank_cash:,.2f}", True)

        # Score: start at 100, subtract by failure class.
        weights = {
            "BANK_FEE": 8,
            "TIMING_WINDOW": 12,
            "FX_VARIANCE": 14,
            "DUP_INVOICE": 12,
            "MISSING_PO": 14,
            "PAYEE_CHANGE": 16,
            "AUDIT_GAP": 10,
            "UNEXPECTED_CHANGE": 14,
            "PAYMENT_HOLD": 0,
        }
        score = 100.0
        seen = set()
        for f in failures:
            if f.code in seen:
                score -= weights.get(f.code, 8) * 0.35
            else:
                score -= weights.get(f.code, 8)
                seen.add(f.code)
        score = max(0.0, round(score, 2))

        report = {
            "period": pack.period,
            "bank_cash": bank_cash,
            "gl_cash": gl_cash,
            "invoices": len(pack.invoices),
            "open_exceptions": open_exceptions,
            "balanced": balanced,
            "failures": [f.code for f in failures],
            "trueup_explained": p.investigate_pnl or rev_delta <= 50_000,
        }

        patches = self._learn(failures)
        after = self.policy.as_dict()
        result = EpisodeResult(
            seed=pack.seed,
            score=score,
            balanced=balanced,
            report=report,
            failures=failures,
            patches=patches,
            tools=tools,
            policy_before=before,
            policy_after=after,
            waypoints=waypoints,
        )
        self.history.append(result)
        return result

    def _learn(self, failures: list[Failure]) -> list[str]:
        """Rewrite policy from this run's failure codes. Idempotent per flag."""
        patches: list[str] = []
        codes = {f.code for f in failures}

        def set_flag(attr: str, value: Any, note: str) -> None:
            cur = getattr(self.policy, attr)
            if cur != value:
                setattr(self.policy, attr, value)
                patches.append(note)
                self.lessons[attr] = self.lessons.get(attr, 0) + 1

        if "TIMING_WINDOW" in codes:
            if self.policy.timing_window_days < 1:
                self.policy.timing_window_days = 1
                patches.append("Learned: bank ACH can settle T+1 — open a 1-day matching window.")
                self.lessons["timing_window_days"] = self.lessons.get("timing_window_days", 0) + 1
            set_flag("match_on_vendor", True, "Learned: pair timing breaks on vendor, not just amount+date.")
        if "BANK_FEE" in codes:
            set_flag("auto_post_bank_fees", True, "Learned: auto-post account-analysis fees under $100.")
        if "FX_VARIANCE" in codes:
            if self.policy.fx_tolerance < 0.04:
                self.policy.fx_tolerance = 0.04
                patches.append("Learned: allow 4% FX tolerance and flag the rate source.")
                self.lessons["fx_tolerance"] = self.lessons.get("fx_tolerance", 0) + 1
        if "DUP_INVOICE" in codes:
            set_flag("fuzzy_duplicate", True, "Learned: collapse INV-n / INV-n-A duplicates before paying.")
        if "MISSING_PO" in codes:
            set_flag("require_po", True, "Learned: block 3-way match failures instead of posting.")
        if "PAYEE_CHANGE" in codes:
            set_flag("callback_payee_changes", True, "Learned: callback + W-9 before any payee-bank change.")
        if "AUDIT_GAP" in codes:
            set_flag("require_pdf", True, "Learned: no close without invoice PDF hash in the audit pack.")
        if "UNEXPECTED_CHANGE" in codes:
            set_flag("investigate_pnl", True, "Learned: explain material P&L deltas in the close memo.")
        if not patches and failures:
            patches.append("No policy lever for remaining failures — escalate to human controller.")
        if not failures:
            patches.append("Close clean. Policy held. Dampen thrusters.")
        return patches

    def curriculum(self, episodes: int = 16, base_seed: int = 7, difficulty: float = 0.7) -> list[EpisodeResult]:
        out = []
        for i in range(episodes):
            out.append(self.run(seed=base_seed + i, difficulty=difficulty))
        return out

    def summary(self) -> dict[str, Any]:
        if not self.history:
            return {}
        scores = [h.score for h in self.history]
        n = max(1, len(scores) // 4)
        return {
            "episodes": len(scores),
            "first_avg": round(sum(scores[:n]) / n, 2),
            "last_avg": round(sum(scores[-n:]) / n, 2),
            "last_score": scores[-1],
            "lessons": dict(self.lessons),
            "policy": self.policy.as_dict(),
        }


def dumps_result(res: EpisodeResult) -> str:
    def conv(o: Any) -> Any:
        if hasattr(o, "__dataclass_fields__"):
            return asdict(o)
        raise TypeError(type(o))

    return json.dumps(asdict(res), default=str)


def clone_naive() -> CloseAgent:
    return CloseAgent(Policy())
