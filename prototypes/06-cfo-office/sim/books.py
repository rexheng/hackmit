"""Messy Office-of-the-CFO source systems for a month-end cash close.

The books belong to Northline Compute LLC, a mid-size data-center operator.
Three systems disagree on purpose: bank, general ledger, and AP/payments.
"""

from __future__ import annotations

import copy
import hashlib
import random
from dataclasses import dataclass, field
from typing import Any


VENDORS = [
    ("ERCOT", "power"),
    ("Oncor Electric", "power"),
    ("Trane Comfort", "cooling"),
    ("Culligan Process Water", "water"),
    ("Turner Construction", "capex"),
    ("Equinix Cross-Connect", "network"),
    ("Marsh McLennan", "insurance"),
    ("Deloitte Tax", "professional"),
    ("Crane County PILOT", "tax"),
    ("ADP Payroll", "payroll"),
    ("Microsoft Azure", "cloud"),
    ("Siemens Switchgear", "capex"),
]


@dataclass
class Line:
    id: str
    system: str
    date: str
    amount: float
    currency: str
    vendor: str
    memo: str
    ref: str
    account: str
    extra: dict[str, Any] = field(default_factory=dict)


@dataclass
class ClosePack:
    seed: int
    period: str
    bank: list[Line]
    gl: list[Line]
    invoices: list[Line]
    payments: list[Line]
    prior_pnl: dict[str, float]
    current_pnl: dict[str, float]
    planted: list[dict[str, Any]]


def _id(system: str, n: int) -> str:
    return f"{system[:2].upper()}-{n:04d}"


def generate_close(seed: int = 0, difficulty: float = 0.55) -> ClosePack:
    """Build a messy close. Higher difficulty plants more exceptions."""
    rng = random.Random(seed)
    difficulty = min(1.0, max(0.15, difficulty))
    period = "2026-08"
    planted: list[dict[str, Any]] = []

    bank: list[Line] = []
    gl: list[Line] = []
    invoices: list[Line] = []
    payments: list[Line] = []

    n = 18 + int(8 * difficulty)
    for i in range(n):
        vendor, category = VENDORS[i % len(VENDORS)]
        day = 1 + (i * 1.7) % 27
        date = f"2026-08-{int(day):02d}"
        amount = round(rng.uniform(1200, 84000) if category != "payroll" else rng.uniform(180000, 260000), 2)
        ref = f"INV-{8000 + i}"
        memo = f"{category} · {vendor}"

        inv = Line(_id("invoices", i), "ap", date, amount, "USD", vendor, memo, ref, "2100 AP", {"po": f"PO-{400 + i}", "status": "open"})
        invoices.append(inv)

        pay_date = date
        pay_amt = amount
        pay_ref = f"ACH-{9000 + i}"
        gl_date = date
        gl_amt = -amount
        bank_date = date
        bank_amt = -amount
        bank_ref = pay_ref

        # Plant failures proportional to difficulty.
        roll = rng.random()
        if roll < 0.12 * difficulty:
            # Bank settles T+1; naive same-day matcher misses it.
            d = min(28, int(day) + 1)
            bank_date = f"2026-08-{d:02d}"
            planted.append({"code": "TIMING_WINDOW", "line": inv.id, "why": f"{vendor} ACH settled {bank_date} but GL booked {date}."})
        elif roll < 0.22 * difficulty:
            # Duplicate invoice, off-by-one number.
            dup = copy.deepcopy(inv)
            dup.id = _id("invoices", 200 + i)
            dup.ref = f"INV-{8000 + i}-A"
            dup.extra = {"po": inv.extra["po"], "status": "open", "duplicate_of": inv.ref}
            invoices.append(dup)
            planted.append({"code": "DUP_INVOICE", "line": dup.id, "why": f"Duplicate AP invoice {dup.ref} clones {inv.ref} for {vendor}."})
        elif roll < 0.32 * difficulty:
            # FX: EUR invoice booked at stale rate.
            inv.currency = "EUR"
            inv.amount = round(amount / 1.08, 2)
            gl_amt = -round(inv.amount * 1.12, 2)  # stale 1.12 vs spot 1.08
            bank_amt = -round(inv.amount * 1.08, 2)
            pay_amt = -bank_amt
            planted.append({"code": "FX_VARIANCE", "line": inv.id, "why": f"{vendor} EUR booked at 1.12; bank cleared at 1.08."})
        elif roll < 0.40 * difficulty:
            # 3-way match fail: missing PO.
            inv.extra["po"] = ""
            inv.extra["status"] = "blocked"
            planted.append({"code": "MISSING_PO", "line": inv.id, "why": f"{vendor} invoice {inv.ref} has no purchase order; 3-way match fails."})
        elif roll < 0.48 * difficulty:
            # Vendor bank-account change, no W-9 / callback.
            inv.extra["payee_change"] = True
            inv.extra["w9"] = False
            planted.append({"code": "PAYEE_CHANGE", "line": inv.id, "why": f"{vendor} changed bank details without a validated W-9 / callback."})
        elif roll < 0.55 * difficulty:
            # Missing audit PDF.
            inv.extra["pdf"] = False
            planted.append({"code": "AUDIT_GAP", "line": inv.id, "why": f"No invoice PDF / hash on {inv.ref}; audit support incomplete."})
        else:
            inv.extra["pdf"] = True

        if inv.extra.get("status") == "blocked" or inv.extra.get("payee_change"):
            # Payment exception: not released.
            planted.append({"code": "PAYMENT_HOLD", "line": inv.id, "why": f"Payment file omitted {vendor}; cash is short at the bank vs AP."})
        else:
            payments.append(Line(_id("payments", i), "pay", pay_date, pay_amt if pay_amt > 0 else amount, "USD", vendor, memo, pay_ref, "1000 Cash", {"invoice": inv.ref}))
            bank.append(Line(_id("bank", i), "bank", bank_date, bank_amt, "USD", vendor, memo, bank_ref, "1000 Cash", {}))
            gl.append(Line(_id("gl", i), "gl", gl_date, gl_amt, "USD", vendor, memo, inv.ref, "1000 Cash", {"counter": "2100 AP"}))

    # Guarantee one of each material exception so a curriculum can learn the full set.
    if difficulty >= 0.5:
        invoices.append(Line("IN-DUPX", "ap", "2026-08-12", 4400.00, "USD", "Trane Comfort", "cooling · dup", "INV-DUP-A", "2100 AP", {"po": "PO-409", "status": "open", "duplicate_of": "INV-DUP"}))
        planted.append({"code": "DUP_INVOICE", "line": "IN-DUPX", "why": "Duplicate AP invoice INV-DUP-A clones INV-DUP for Trane Comfort."})
        invoices.append(Line("IN-NOPO", "ap", "2026-08-18", 12600.00, "USD", "Turner Construction", "capex · no PO", "INV-NOPO", "2100 AP", {"po": "", "status": "blocked"}))
        planted.append({"code": "MISSING_PO", "line": "IN-NOPO", "why": "Turner Construction invoice INV-NOPO has no purchase order; 3-way match fails."})
        invoices.append(Line("IN-PAYX", "ap", "2026-08-20", 8800.00, "USD", "Siemens Switchgear", "capex · payee", "INV-PAYX", "2100 AP", {"po": "PO-777", "status": "open", "payee_change": True, "w9": False}))
        planted.append({"code": "PAYEE_CHANGE", "line": "IN-PAYX", "why": "Siemens Switchgear changed bank details without a validated W-9 / callback."})
        invoices.append(Line("IN-PDFX", "ap", "2026-08-21", 2100.00, "USD", "Deloitte Tax", "professional · no pdf", "INV-PDFX", "2100 AP", {"po": "PO-221", "status": "open", "pdf": False}))
        planted.append({"code": "AUDIT_GAP", "line": "IN-PDFX", "why": "No invoice PDF / hash on INV-PDFX; audit support incomplete."})
        # FX pair: GL vs bank disagree by ~3.7%.
        invoices.append(Line("IN-EURX", "ap", "2026-08-09", 5000.00, "EUR", "Marsh McLennan", "insurance · EUR", "INV-EURX", "2100 AP", {"po": "PO-EUR", "status": "open", "pdf": True}))
        gl.append(Line("GL-EURX", "gl", "2026-08-09", -5600.00, "USD", "Marsh McLennan", "insurance · EUR", "INV-EURX", "1000 Cash", {"counter": "2100 AP"}))
        bank.append(Line("BK-EURX", "bank", "2026-08-09", -5400.00, "USD", "Marsh McLennan", "insurance · EUR", "ACH-EURX", "1000 Cash", {}))
        payments.append(Line("PY-EURX", "pay", "2026-08-09", 5400.00, "USD", "Marsh McLennan", "insurance · EUR", "ACH-EURX", "1000 Cash", {"invoice": "INV-EURX"}))
        planted.append({"code": "FX_VARIANCE", "line": "IN-EURX", "why": "Marsh McLennan EUR booked at 1.12; bank cleared at 1.08."})
        # Timing pair
        gl.append(Line("GL-TIME", "gl", "2026-08-05", -3200.00, "USD", "Equinix Cross-Connect", "network · t+1", "INV-TIME", "1000 Cash", {"counter": "2100 AP"}))
        bank.append(Line("BK-TIME", "bank", "2026-08-06", -3200.00, "USD", "Equinix Cross-Connect", "network · t+1", "ACH-TIME", "1000 Cash", {}))
        planted.append({"code": "TIMING_WINDOW", "line": "BK-TIME", "why": "Equinix Cross-Connect ACH settled 2026-08-06 but GL booked 2026-08-05."})

    # Unposted bank fee — always present above a threshold.
    if difficulty >= 0.3:
        bank.append(Line("BK-FEES", "bank", "2026-08-31", -42.50, "USD", "Chase", "account analysis fee", "FEE-831", "1000 Cash", {}))
        planted.append({"code": "BANK_FEE", "line": "BK-FEES", "why": "Chase analysis fee $42.50 hit the bank and was never booked in the GL."})

    # Unexpected revenue change vs prior month (catch-up bill).
    prior_pnl = {"revenue": 4_820_000.0, "power": 1_140_000.0, "water": 86_000.0, "opex": 2_010_000.0}
    current_pnl = {"revenue": 4_820_000.0, "power": 1_140_000.0, "water": 86_000.0, "opex": 2_010_000.0}
    if difficulty >= 0.35:
        current_pnl["revenue"] = 5_610_000.0
        gl.append(Line("GL-CATCH", "gl", "2026-08-29", 790_000.0, "USD", "Oncor Electric", "true-up interconnection", "JE-TRUEUP", "4000 Revenue", {"counter": "1200 AR"}))
        planted.append({"code": "UNEXPECTED_CHANGE", "line": "GL-CATCH", "why": "Revenue +$790k vs July. Source: Oncor interconnection true-up, not run-rate."})

    # Hash for audit pack identity
    blob = f"{seed}|{difficulty}|{len(invoices)}|{len(bank)}".encode()
    extra = hashlib.sha1(blob).hexdigest()[:8]
    planted.append({"code": "PACK", "line": extra, "why": f"Close pack {period} seed={seed} diff={difficulty:.2f}"})

    return ClosePack(
        seed=seed,
        period=period,
        bank=bank,
        gl=gl,
        invoices=invoices,
        payments=payments,
        prior_pnl=prior_pnl,
        current_pnl=current_pnl,
        planted=planted,
    )


def cash_balance(lines: list[Line]) -> float:
    return round(sum(l.amount for l in lines), 2)
