"""Pack the pipeline outputs into prototypes/03-compute-works/live.js so the works runs on real records
(works on file open, no server). Each Compute Works preset is tied to one real county.
Run after atlas/build.py, bills/build.py, claims/verify.py, claims/score.py.
"""
import csv
import json
from collections import Counter, defaultdict
from pathlib import Path

P = Path(__file__).resolve().parent
grid = json.loads((P / "atlas/out/grid_2025.json").read_text())
bills = json.loads((P / "bills/out/bills.json").read_text())
claims = json.loads((P / "claims/out/claims.json").read_text())
scored = json.loads((P / "claims/out/receipts.json").read_text())
exposure = json.loads((P / "atlas/out/operator_exposure.json").read_text())

counties = defaultdict(lambda: {"ids": set(), "ops": Counter(), "grid": None, "grid_match": None})
for r in csv.DictReader(open(P / "atlas/out/sites_grid.csv")):
    c = counties[r["fips"]]
    c["name"], c["state"] = r["county"], r["state_abb"]
    if r["id"] not in c["ids"]:
        c["ids"].add(r["id"])
        c["ops"][r["operator"] or "Operator not listed"] += 1
    c["grid"], c["grid_match"] = r["grid_region_code"] or None, r["grid_match"]

out_counties = {
    f: {"name": c["name"], "state": c["state"], "sites": len(c["ids"]), "operators": c["ops"].most_common(),
        "grid": c["grid"], "grid_match": c["grid_match"], "bills": bills["counties"].get(f, [])}
    for f, c in counties.items()
}
# Compute Works presets -> the real county whose records they show.
PRESET_COUNTY = {"nova": "51107", "georgia": "13097"}
live_dir = P / "live"
news = json.loads((live_dir / "news.json").read_text()) if (live_dir / "news.json").exists() else {"counties": {}}
filings = json.loads((live_dir / "filings.json").read_text()) if (live_dir / "filings.json").exists() else {}
receipt_of = {r["claim_id"]: r for r in scored["receipts"]}
est = json.loads((P / "estimates/out/estimates.json").read_text())

tx = json.loads((P / "texas/out/labels.json").read_text())
sites = {}
# Every Texas county with a mapped data center is a site, keyed by its county code, and carries its label.
for preset, fips in {**PRESET_COUNTY, **{f: f for f in tx["counties"]}}.items():
    c = out_counties[fips]
    present = {o for o, _ in c["operators"]}
    mine = [dict(k, receipt=receipt_of[k["id"]]) for k in claims if k["owner"] in present]
    sites[preset] = {
        "fips": fips, "county": c["name"], "state": c["state"], "sites": c["sites"], "operators": c["operators"],
        "grid_code": c["grid"], "grid_match": c["grid_match"], "grid": grid.get(c["grid"]) if c["grid"] else None,
        "bills": c["bills"], "claims": mine,
        "exposure": {o: e for o, e in ((o["operator"], o) for o in exposure["operators"]) if o in present},
        "filings": {o: f for o, f in filings.items() if o in present},
        "news": news["counties"].get(fips) or news["counties"].get(fips[:2], []),  # no county feed yet: statewide headlines
        "estimate": est["counties"].get(fips),
        "label": tx["counties"].get(fips),
    }
data = {
    "built": news.get("retrieved"), "sites": sites, "weights": scored["weights"],
    "bills_meta": {k: bills[k] for k in ("base_year", "latest_year", "us_average", "source_table", "caveat")},
    "exposure_meta": {k: exposure[k] for k in ("year", "definition", "sources", "limits")},
    "news_source": news.get("source"),
    "estimate_meta": est["meta"],
    "texas": {k: tx[k] for k in ("scales", "operator_metrics", "texas_bill", "tax", "registry")},
    "default_site": "48113",
    "feeds": json.loads((live_dir / "feeds.json").read_text()) if (live_dir / "feeds.json").exists() else None,
}
dest = P.parent / "prototypes/03-compute-works/live.js"
dest.write_text("window.CW_LIVE = " + json.dumps(data, separators=(",", ":")) + ";\n")
print(dest, round(dest.stat().st_size / 1024), "KB;", len(sites), "sites")
