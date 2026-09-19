"""One real data center, one label. Same five rows as the county label, but every number is about this site.
Company facts and claims are kept only if they are on the company's page word for word.
The public map (OpenStreetMap) is used to check physical claims. Run after texas/build.py:  python build.py
"""
import html
import json
import re
import subprocess
from math import asin, cos, radians, sin, sqrt
from pathlib import Path

HERE = Path(__file__).parent
P = HERE.parent
S = json.loads((HERE / "site.json").read_text())
TX = json.loads((P / "texas/out/labels.json").read_text())
SC, county = TX["scales"], TX["counties"][S["county_fips"]]
heat = json.loads((P / "heat/out/heat.json").read_text())
grid = json.loads((P / "atlas/out/grid_2025.json").read_text())[county["grid_code"]]
LETTERS = "ABCDE"
UA = "Mozilla/5.0 (compatible; hackmit-claim-check/0.1)"


def page(url, cache={}):
    if url not in cache:
        raw = subprocess.run(["curl", "-sSL", "--compressed", "--max-time", "60", "-A", UA, url], capture_output=True).stdout.decode("utf-8", "replace")
        raw = re.sub(r"(?is)<(script|style|noscript)\b.*?</\1>", " ", raw)
        cache[url] = re.sub(r"\s+", " ", html.unescape(re.sub(r"(?s)<[^>]+>", " ", raw)).replace("’", "'").replace(" ", " "))
    return cache[url]


def grade(v, cuts, desc=False):
    if v is None: return None
    for i, c in enumerate(cuts):
        if (v >= c) if desc else (v <= c): return LETTERS[i]
    return "E"


def metres(a, b):
    la1, lo1, la2, lo2 = map(radians, (*a, *b))
    return 2 * 6371000 * asin(sqrt(sin((la2 - la1) / 2) ** 2 + cos(la1) * cos(la2) * sin((lo2 - lo1) / 2) ** 2))


facts = {f["key"]: f for f in S["facts"] if f["quote"] in page(f["url"])}
claims = [c for c in S["claims"] if c["quote"] in page(c["url"])]
print("facts verified:", list(facts), "| claims verified:", [c["id"] for c in claims])

# Physical check: substations on the public map near the site.
q = f'[out:json][timeout:25];nwr(around:800,{S["lat"]},{S["lon"]})[power=substation];out center tags;'
cache = HERE / "out" / "osm_substations.json"
osm = None
for attempt in range(3):  # the public Overpass server is often busy
    out = subprocess.run(["curl", "-sS", "--max-time", "60", "-A", "hackmit-claim-check/0.1", "--data-urlencode", "data=" + q, "https://overpass-api.de/api/interpreter"], capture_output=True).stdout
    if out.lstrip().startswith(b"{"):
        osm = json.loads(out); cache.write_text(json.dumps(osm)); break
    import time; time.sleep(8)
if osm is None:
    osm = json.loads(cache.read_text()) if cache.exists() else {"elements": []}
    print("map server busy: using the last saved answer" if cache.exists() else "map server busy: no substation data")
subs = sorted(({"name": e.get("tags", {}).get("name"), "operator": e.get("tags", {}).get("operator"), "voltage": e.get("tags", {}).get("voltage"),
                "metres": round(metres((S["lat"], S["lon"]), (e.get("center", e)["lat"], e.get("center", e)["lon"])), -1)} for e in osm["elements"]), key=lambda s: s["metres"])

fossil_hours = round(grid["fossil_majority_hours_pct"])
TALK = {"Holds up": 1, "Holds on paper only": 0.5, "Can't be checked": 0.25, "Does not hold up": 0}
for c in claims:
    if c["check"] == "grid":
        c["verdict"] = "Holds on paper only" if fossil_hours > 50 else "Holds up"
        c["why"] = f"Bought over a year, maybe. Hour by hour, the Texas grid ran mostly on coal and gas in {fossil_hours} of every 100 hours."
    elif c["check"] == "osm_substation":
        near = subs[0] if subs else None
        mine = [s for s in subs if s["metres"] <= 150 or re.search(S["owner"], (s["name"] or "") + (s["operator"] or ""), re.I)]
        c["verdict"] = "Holds up" if mine else "Can't be checked"
        c["why"] = (f"The public map shows one on site." if mine else
                    f"The public map shows no substation on the site. The nearest is {near['name']}, {near['metres']:.0f} m away." if near else "No substation on the public map nearby.")
    else:
        c["verdict"], c["why"] = "Can't be checked", "No public record. Needed: " + c["needed"] + "."
count = lambda v: sum(c["verdict"] == v for c in claims)
talk = round(sum(TALK[c["verdict"]] for c in claims) / len(claims), 2) if claims else None

mw = facts["capacity_mw"]["value"]
kwh = mw * 1000 * 8760
homes = round(kwh / 10791, -3)
fam_hi = round(kwh * 0.84 / 3.78541 / (300 * 365), -2)
bill = TX["texas_bill"]
registry_hit = False  # set below from the state list
reg = subprocess.run(["curl", "-sSL", "--compressed", "--max-time", "60", "-A", UA, TX["registry"]["url"]], capture_output=True).stdout.decode("utf-8", "replace")
reg_rows = [re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", " ", r))) for r in re.findall(r"(?is)<tr[^>]*>(.*?)</tr>", reg)]
registry_hit = [r.strip()[:80] for r in reg_rows if re.search(r"qts", r, re.I) and re.search(r"fort worth|ftw", r, re.I)]

jobs_row = next(r for r in county["rows"] if r["id"] == "jobs")
g_grid = grade(grid["fossil_majority_hours_pct"], SC["grid_fossil_hours_pct"]["cuts"])
g_talk = grade(talk, SC["straight_talk"]["cuts_desc"], desc=True)
rows = [
    {"id": "power", "name": "POWER", "grade": g_grid,
     "plain_big": f"{mw} MW", "plain_unit": f"up to {homes:,.0f} homes' worth of power",
     "plain": f"{facts['planned_mw']['value']} MW planned. Average Texas electric bill: ${bill['2024']:.0f} a month, up {round(100 * (bill['2024'] - bill['2019']) / bill['2019'])}% since 2019.",
     "technical": [{"label": "PUE", "value": None, "grade": None, "industry_average": 1.54, "note": "QTS does not publish it for this site."},
                   {"label": "Hours the grid ran mostly on coal and gas", "value": fossil_hours, "unit": "of 100", "grade": g_grid, "note": f"{county['grid_code']}, 2025."},
                   {"label": "Coal and gas share in the hottest hours", "value": heat["hottest_5pct"]["fossil_share_pct"], "unit": "%", "note": f"Coldest hours: {heat['coldest_5pct']['fossil_share_pct']}%."}],
     "caveat": "Homes' worth assumes the site runs at full capacity all year. Records don't say why bills changed.",
     "source": "QTS Fort Worth page; EIA via PUDL; NOAA", "source_url": facts["capacity_mw"]["url"]},
    {"id": "water", "name": "WATER", "grade": None, "estimate": True,
     "plain_big": f"0–{fam_hi:,.0f}", "plain_unit": "families' worth a year",
     "plain": f"QTS says it uses zero water for cooling. No public record confirms that here. If it cooled like the industry average: {fam_hi:,.0f} families' worth.",
     "technical": [{"label": "WUE", "value": None, "unit": "L/kWh", "grade": None, "industry_average": 0.84, "note": "Not published for this site."}],
     "caveat": "To settle it: this site's metered water use, from Fort Worth Water."},
    {"id": "tax", "name": "TAX DOLLARS", "grade": None,
     "plain_big": "LISTED" if registry_hit else "NOT LISTED", "plain_unit": "for the state sales-tax break",
     "plain": f"The state list has {TX['registry']['certified_facilities']} certified data centers." + ("" if registry_hit else " This site is not one of them.") + " City and county tax breaks: not found.",
     "technical": [{"label": "Statewide, all data centers", "by_year": TX["tax"]["sales_tax_not_collected_usd_millions"], "per_home": TX["tax"]["per_home"]}],
     "caveat": "To settle it: the abatement agreement and tax paid, from the Tarrant Appraisal District.",
     "source": "Texas Comptroller registry", "source_url": TX["registry"]["url"]},
    {**jobs_row, "plain_unit": jobs_row["plain_unit"] + " · county-wide", "plain": "QTS does not publish jobs for this site. " + (jobs_row.get("plain") or "")},
    {"id": "talk", "name": "STRAIGHT TALK", "grade": g_talk,
     "plain_big": f"{count('Holds up') + count('Holds on paper only')} of {len(claims)}", "plain_unit": f"hold up, at least on paper · {count(chr(68) + 'oes not hold up')} contradicted",
     "plain": None, "claims": [{"text": c["quote"], "verdict": c["verdict"], "why": c["why"], "url": c["url"]} for c in claims],
     "technical": [{"label": "Score", "value": talk, "unit": "of 1", "grade": g_talk}],
     "caveat": "Can't be checked doesn't mean false."},
]
pts = [LETTERS.index(r["grade"]) for r in rows if r["grade"]]
label = {"site": S["name"], "county": county["county"], "lat": S["lat"], "lon": S["lon"], "overall": LETTERS[round(sum(pts) / len(pts) + 1e-9)], "graded_rows": len(pts),
         "rows": rows, "blanks": [r["name"] for r in rows if not r["grade"]], "owners": [], "sites_without_named_owner": 0,
         "nearby": {"substations": subs}, "facts": list(facts.values())}
(HERE / "out" / "label.json").write_text(json.dumps(label, indent=1))
print(label["overall"], [(r["name"], r["grade"], r["plain_big"], r["plain_unit"]) for r in rows])
for c in claims: print(" ", c["verdict"], "|", c["quote"][:50], "|", c["why"][:90])
