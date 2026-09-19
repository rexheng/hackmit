"""The data center label for Texas: five things that matter, each graded A to E, each tied
to something a household can picture. Built like a nutrition label: fixed scales, published
cut-offs (scales.json), every number from a named source, all of it computed here in code.

  POWER         PUE + how fossil-heavy the grid is   ->  your electric bill, homes' worth of power
  WATER         WUE                                  ->  families' worth of water
  TAX DOLLARS   state sales tax not collected        ->  dollars per Texas home
  JOBS          jobs per mapped site (the upside)    ->  people employed, and what they are paid
  STRAIGHT TALK how the owners' claims check out     ->  how many hold up

A number a company never published is "not disclosed": it shows as a blank, and the overall letter
averages only the rows that could be graded. Estimates are always marked as estimates.
Run after atlas, bills, estimates, claims:  python build.py
"""
import csv
import html
import json
import re
import subprocess
from collections import Counter, defaultdict
from math import floor, log10
from pathlib import Path

import duckdb

HERE = Path(__file__).parent
P = HERE.parent
M = json.loads((HERE / "metrics.json").read_text())
SC = json.loads((HERE / "scales.json").read_text())
LETTERS = "ABCDE"
LITRES_PER_GALLON, FAMILY_GAL_PER_YEAR, HOME_KWH = 3.78541, 300 * 365, 10791


def page(url, cache={}):
    if url not in cache:
        raw = subprocess.run(["curl", "-sSL", "--compressed", "--max-time", "60", "-A", "Mozilla/5.0 (compatible; hackmit-claim-check/0.1)", url],
                             capture_output=True).stdout.decode("utf-8", "replace")
        raw = re.sub(r"(?is)<(script|style|noscript)\b.*?</\1>", " ", raw)
        t = html.unescape(re.sub(r"(?s)<[^>]+>", " ", raw)).replace("’", "'").replace(" ", " ")
        cache[url] = re.sub(r"\s+", " ", t)
    return cache[url]


def grade(value, cuts, descending=False):
    if value is None: return None
    for i, c in enumerate(cuts):
        if (value >= c) if descending else (value <= c): return LETTERS[i]
    return "E"


def sig2(x):
    if not x or x <= 0: return 0
    p = 10 ** (floor(log10(x)) - 1)
    return int(round(x / p) * p) if p >= 1 else round(x, 2)


# 1. Keep a company metric only if its sentence is on the company's page, word for word.
verified, dropped = [], []
for m in M["operator_metrics"] + M["benchmarks"]:
    ok = re.sub(r"\s+", " ", m["quote"]) in page(m["url"])
    (verified if ok else dropped).append(m)
    print("verified " if ok else "DROPPED  ", m.get("owner", m.get("id")), m.get("metric", ""), m["value"])
op = defaultdict(dict)
for m in verified:
    if "owner" in m: op[m["owner"]][m["metric"]] = m

# 2. What the average Texas home paid, from every seller's billing records (EIA-861).
con = duckdb.connect()
con.execute("INSTALL httpfs; LOAD httpfs; SET s3_region='us-west-2'; SET s3_url_style='path';")
tx = {y: (c, d) for y, c, d in con.execute("""
  SELECT year(report_date), sum(customers), sum(sales_revenue) FROM 's3://pudl.catalyst.coop/stable/core_eia861__yearly_sales.parquet'
  WHERE state='TX' AND customer_class='residential' AND service_type='bundled' AND data_maturity='final' AND year(report_date) IN (2019, 2024) GROUP BY 1""").fetchall()}
bill = {str(y): round(d / c / 12, 2) for y, (c, d) in tx.items()}
homes_tx = tx[2024][0]
bills = json.loads((P / "bills/out/bills.json").read_text())
us = bills["us_average"]

# 3. Tax dollars: what the state says it does not collect, per Texas home with an electric account.
tax = M["state_tax"]
tax_per_home = {y: round(v * 1e6 / homes_tx, 2) for y, v in tax["sales_tax_not_collected_usd_millions"].items()}

# 3b. The state's own list of data centers certified for the exemption, by who occupies them.
REG_URL = "https://comptroller.texas.gov/taxes/data-centers/data-center-lists.php"
reg_raw = subprocess.run(["curl", "-sSL", "--compressed", "--max-time", "60", "-A", "Mozilla/5.0 (compatible; hackmit-claim-check/0.1)", REG_URL], capture_output=True).stdout.decode("utf-8", "replace")
clean = lambda c: re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", " ", c))).strip()
reg_rows = [[clean(c) for c in re.findall(r"(?is)<td[^>]*>(.*?)</td>", r)] for r in re.findall(r"(?is)<tr[^>]*>(.*?)</tr>", reg_raw)]
reg_rows = [r for r in reg_rows if len(r) >= 7]
OWNER_WORDS = {"Amazon Web Services": "amazon", "Microsoft": "microsoft", "Google": "google", "Meta": "meta platforms|facebook", "Digital Realty": "digital realty",
               "CyrusOne": "cyrusone", "Equinix": "equinix", "Oracle": "oracle", "Quality Technology Services": r"\bqts\b|quality technology"}
registry = {o: sum(bool(re.search(w, " ".join(r[1:6]), re.I)) for r in reg_rows) for o, w in OWNER_WORDS.items()}
print("registry:", len(reg_rows), "certified facilities;", {o: n for o, n in registry.items() if n})

# 3c. Jobs: the federal jobs census (BLS QCEW), private employers in the data hosting industry, by county.
QCEW_URL = "https://data.bls.gov/cew/data/api/2024/a/industry/518210.csv"
qcew_raw = subprocess.run(["curl", "-sSL", "--compressed", "--max-time", "90", "-A", "Mozilla/5.0 (compatible; hackmit-claim-check/0.1)", QCEW_URL], capture_output=True).stdout.decode()
jobs = {r["area_fips"]: {"jobs": int(r["annual_avg_emplvl"]), "employers": int(r["annual_avg_estabs"]), "avg_pay": int(r["avg_annual_pay"])}
        for r in csv.DictReader(qcew_raw.splitlines()) if r["own_code"] == "5" and not r["disclosure_code"] and int(r["annual_avg_emplvl"] or 0) > 0}
print("jobs: Texas", jobs.get("48000"))

claims = json.loads((P / "claims/out/claims.json").read_text())
receipts = {r["claim_id"]: r for r in json.loads((P / "claims/out/receipts.json").read_text())["receipts"]}
TALK = {"Holds up": 1, "Holds on paper only": 0.5, "Can't be checked": 0.25, "Does not hold up": 0}
grid = json.loads((P / "atlas/out/grid_2025.json").read_text())
est = json.loads((P / "estimates/out/estimates.json").read_text())["counties"]
heat = json.loads((P / "heat/out/heat.json").read_text()) if (P / "heat/out/heat.json").exists() else None

counties = defaultdict(lambda: {"ids": {}, "grid": None})
for r in csv.DictReader(open(P / "atlas/out/sites_grid.csv")):
    if r["state_abb"] != "TX": continue
    c = counties[r["fips"]]
    c["name"], c["grid"] = r["county"], r["grid_region_code"] or c["grid"]
    c["ids"][r["id"]] = r["operator"] or "Operator not listed"


def weighted(ops, metric):
    """Site-weighted average of what the owners here publish, and the share of sites it covers."""
    have = [(op[o][metric]["value"], n) for o, n in ops.items() if metric in op.get(o, {})]
    # Sites with no owner on the public map cannot count for or against anyone.
    n_all, n_have = sum(n for o, n in ops.items() if o != "Operator not listed"), sum(n for _, n in have)
    if not n_have: return None, 0.0
    return round(sum(v * n for v, n in have) / n_have, 2), round(n_have / n_all, 2)


labels = {}
for fips, c in counties.items():
    ops = Counter(c["ids"].values())
    g = grid.get(c["grid"]) if c["grid"] else None
    e = est.get(fips)
    min_cov = SC["min_site_coverage_for_a_grade"]

    pue, pue_cov = weighted(ops, "pue")
    wue, wue_cov = weighted(ops, "wue")
    g_pue = grade(pue, SC["pue"]["cuts"]) if pue_cov >= min_cov else None
    g_grid = grade(g["fossil_majority_hours_pct"], SC["grid_fossil_hours_pct"]["cuts"]) if g else None
    parts = [x for x in (g_pue, g_grid) if x]
    g_power = LETTERS[-(-sum(LETTERS.index(x) for x in parts) // len(parts))] if parts else None  # average, rounded toward the worse letter
    g_water = grade(wue, SC["wue"]["cuts"]) if wue_cov >= min_cov else None

    # Water estimate, now using what the owners here publish where they do.
    water = None
    if e:
        kwh_lo, kwh_hi = (x * 1e6 for x in e["electricity_gwh_per_year"])
        lo_rate = wue if wue is not None else 0.12
        blended_hi = (wue * wue_cov + 0.84 * (1 - wue_cov)) if wue is not None else 0.84
        gal = (kwh_lo * lo_rate / LITRES_PER_GALLON, kwh_hi * blended_hi / LITRES_PER_GALLON)
        water = {"million_gallons_per_year": [sig2(gal[0] / 1e6), sig2(gal[1] / 1e6)], "families": [sig2(gal[0] / FAMILY_GAL_PER_YEAR), sig2(gal[1] / FAMILY_GAL_PER_YEAR)]}

    mine = [receipts[k["id"]] for k in claims if k["owner"] in ops]
    talk = round(sum(TALK[r["verdict"]] for r in mine) / len(mine), 2) if mine else None
    g_talk = grade(talk, SC["straight_talk"]["cuts_desc"], descending=True)
    g_tax = grade(tax_per_home["2025"], SC["tax_usd_per_home"]["cuts"])

    j = jobs.get(fips)
    per_site = round(j["jobs"] / len(c["ids"])) if j else None
    g_jobs = grade(per_site, SC["jobs_per_mapped_site"]["cuts_desc"], descending=True)
    tx_j = jobs.get("48000")
    pct = lambda a, b: round(100 * (b - a) / a)
    rng = lambda r: f"{r[0]:,}–{r[1]:,}"
    n = lambda v: sum(r["verdict"] == v for r in mine)
    # Copy rule: one number, a few words. Everything else sits behind a tap.
    rows = [
        {"id": "power", "name": "POWER", "grade": g_power,
         "plain_big": f"${bill['2024']:.0f}", "plain_unit": "a month · average Texas electric bill",
         "plain": f"Up {pct(bill['2019'], bill['2024'])}% since 2019. U.S. average: +{pct(us['2019']['avg_monthly_bill_usd'], us['2024']['avg_monthly_bill_usd'])}%.",
         "also": (f"Sites here use about {rng(e['electricity_as_homes'])} homes' worth of power (estimate)." if e else None),
         "technical": [
             {"label": "PUE", "value": pue, "grade": g_pue, "industry_average": 1.54,
              "note": (f"About {round((pue - 1) * 100)} extra units of power per 100 go to cooling. From owners of {round(pue_cov * 100)}% of named sites." if pue is not None else "No owner here publishes it.")},
             {"label": "Hours the grid ran mostly on coal and gas", "value": g and round(g["fossil_majority_hours_pct"]), "unit": "of 100", "grade": g_grid,
              "note": f"{c['grid']}, 2025." if g else "More than one grid serves this county."}] +
             ([{"label": "Coal and gas share in the hottest hours", "value": heat["hottest_5pct"]["fossil_share_pct"], "unit": "%",
                "note": f"Coldest hours: {heat['coldest_5pct']['fossil_share_pct']}%. All hours: {heat['all_hours_fossil_share_pct']}%. Hot afternoons get solar; cold nights don't. Demand runs {heat['hottest_5pct']['generation_vs_average_pct']:.0f}% above average when it's hottest. NOAA weather joined to the grid, hour by hour."}]
              if heat and c["grid"] == "ERCO" else []),
         "caveat": "Records don't say why bills changed, so we don't blame data centers.",
         "source": "EIA Form 861 and EIA-930, via PUDL"},
        {"id": "water", "name": "WATER", "grade": g_water, "estimate": True, "water": water,
         "plain_big": (rng(water["families"]) if water else "NOT FOUND"), "plain_unit": "families' worth a year",
         "plain": "Nobody publishes the real number.",
         "technical": [{"label": "WUE", "value": wue, "unit": "L/kWh", "grade": g_water, "industry_average": 0.84,
                        "note": (f"From owners of {round(wue_cov * 100)}% of named sites. Company-wide, not Texas." if wue is not None else "No owner here publishes it.")}],
         "caveat": "Hot, dry places usually need more water than a company's global average."},
        {"id": "tax", "name": "TAX DOLLARS", "grade": g_tax,
         "plain_big": f"${tax_per_home['2025']:.0f}", "plain_unit": "per Texas home · 2025",
         "plain": f"Sales tax Texas doesn't collect on data center equipment: ${tax['sales_tax_not_collected_usd_millions']['2025']:,.0f}M now, ${tax['sales_tax_not_collected_usd_millions']['2030']:,.0f}M by 2030.",
         "technical": [{"label": "By year", "by_year": tax["sales_tax_not_collected_usd_millions"], "per_home": tax_per_home}],
         "caveat": "Statewide, not a bill to you. To qualify: $200M invested and 20 jobs. County property tax breaks: not found.",
         "source": "Texas Comptroller, Tax Exemptions and Tax Incidence, Jan 2025, p. 5", "source_url": tax["url"]},
        {"id": "jobs", "name": "JOBS", "grade": g_jobs, "positive": True,
         "plain_big": (f"{j['jobs']:,}" if j else "NOT FOUND"), "plain_unit": (f"jobs · average pay ${round(j['avg_pay'], -3) // 1000}k" if j else "too few employers to publish"),
         "plain": (f"At {j['employers']:,} employers in this county." if j else None),
         "also": (f"Texas: {tx_j['jobs']:,} jobs. About ${round(tax['sales_tax_not_collected_usd_millions']['2025'] * 1e6 / tx_j['jobs'], -2):,.0f} of uncollected sales tax per job." if tx_j else None),
         "technical": [{"label": "Jobs per mapped data center", "value": per_site, "grade": g_jobs}],
         "caveat": "Includes cloud office jobs. Leaves out construction.",
         "source": "BLS Quarterly Census of Employment and Wages, 2024, NAICS 518210", "source_url": QCEW_URL},
        {"id": "talk", "name": "STRAIGHT TALK", "grade": g_talk,
         "plain_big": (f"{n('Holds up')} of {len(mine)}" if mine else "NOT FOUND"), "plain_unit": "owner claims confirmed",
         "plain": (f"{n('Holds on paper only')} hold on paper only · {n('Does not hold up')} don't hold up · {n(chr(67) + 'an' + chr(39) + 't be checked')} can't be checked." if mine else None),
         "technical": [{"label": "Score", "value": talk, "unit": "of 1", "grade": g_talk}],
         "caveat": "Can't be checked doesn't mean false. No public record exists to test it."},
    ]
    # One small label per owner, so a resident can see who publishes what.
    owners = []
    for o, n in ops.most_common():
        if o == "Operator not listed": continue
        oc = [receipts[k["id"]] for k in claims if k["owner"] == o]
        ot = round(sum(TALK[r["verdict"]] for r in oc) / len(oc), 2) if oc else None
        owners.append({"owner": o, "sites": n,
                       "pue": op.get(o, {}).get("pue"), "pue_grade": grade(op.get(o, {}).get("pue", {}).get("value"), SC["pue"]["cuts"]),
                       "wue": op.get(o, {}).get("wue"), "wue_grade": grade(op.get(o, {}).get("wue", {}).get("value"), SC["wue"]["cuts"]),
                       "talk_grade": grade(ot, SC["straight_talk"]["cuts_desc"], descending=True), "claims_checked": len(oc),
                       "state_tax_certificates": registry.get(o)})
    # The overall letter averages only the rows we could grade. Blanks are shown as blanks.
    pts = [LETTERS.index(r["grade"]) for r in rows if r["grade"]]
    labels[fips] = {"county": c["name"], "sites": len(c["ids"]), "operators": ops.most_common(), "grid_code": c["grid"],
                    "sites_without_named_owner": ops.get("Operator not listed", 0), "owners": owners,
                    "overall": LETTERS[round(sum(pts) / len(pts) + 1e-9)] if pts else None, "graded_rows": len(pts), "rows": rows,
                    "blanks": [r["name"] for r in rows if not r["grade"]]}

out = {"state": "TX", "scales": SC, "operator_metrics": verified, "dropped": dropped,
       "texas_bill": bill, "texas_homes_with_electric_account": homes_tx, "tax": {**tax, "per_home": tax_per_home},
       "registry": {"url": REG_URL, "certified_facilities": len(reg_rows), "by_owner": registry}, "counties": labels}
(HERE / "out" / "labels.json").write_text(json.dumps(out, indent=1))
for f in ("48113", "48029", "48453"):
    L = labels[f]
    print(L["county"], L["sites"], "sites | overall", L["overall"], "|", " ".join(f"{r['name']}:{r['grade'] or '?'}" for r in L["rows"]), "|", L["rows"][1]["plain_big"])
print("TX bill", bill, "| tax per home", tax_per_home["2025"], "| counties", len(labels))
