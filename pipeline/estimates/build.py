"""Estimates for the things no public record measures: how much electricity and water
the data centers in one county use. Every output is labelled an ESTIMATE, carries a
low-high range, and lists the published figure behind each step. No model is involved.

Method (top-down, so it cannot exceed the national total):
  1. U.S. data centers used 176 TWh of electricity in 2023 (Lawrence Berkeley National Lab).
  2. Give each county a share of that, two ways: by its share of mapped data center floor
     area, and by its share of mapped sites. The two answers are the low and high of the range.
  3. Water = electricity x litres per kWh. Low uses the rate AWS reports for itself
     (0.12 L/kWh). High uses the industry average implied by AWS's own sentence that its
     rate is "7 times better than the industry average" (0.84 L/kWh).
  4. Turn both into "homes" with the EIA average home (10,791 kWh a year) and the EPA
     average family (300 gallons a day).
Run after atlas/build.py:  python build.py
"""
import csv
import json
from collections import defaultdict
from pathlib import Path

HERE = Path(__file__).parent
INPUTS = {
    "us_datacenter_twh_2023": {"value": 176, "unit": "TWh", "source": "Lawrence Berkeley National Laboratory, 2024 United States Data Center Energy Usage Report",
                               "url": "https://newscenter.lbl.gov/2025/01/15/berkeley-lab-report-evaluates-increase-in-electricity-demand-from-data-centers/"},
    "home_kwh_per_year": {"value": 10791, "unit": "kWh", "source": "U.S. Energy Information Administration, average U.S. home, 2022",
                          "url": "https://www.eia.gov/tools/faqs/faq.php?id=97&t=3"},
    "family_gallons_per_day": {"value": 300, "unit": "gallons", "source": "U.S. EPA WaterSense: the average American family uses more than 300 gallons a day at home",
                               "url": "https://www.epa.gov/watersense/how-we-use-water"},
    "wue_low_l_per_kwh": {"value": 0.12, "unit": "L/kWh", "source": "Amazon: AWS global data center water use effectiveness, as reported by the company",
                          "url": "https://sustainability.aboutamazon.com/natural-resources/water"},
    "wue_high_l_per_kwh": {"value": 0.84, "unit": "L/kWh", "source": "Industry average implied by Amazon's sentence that 0.12 L/kWh is \"7 times better than the industry average\"",
                           "url": "https://sustainability.aboutamazon.com/natural-resources/water"},
}
V = {k: v["value"] for k, v in INPUTS.items()}
LITRES_PER_GALLON = 3.78541

sites, sqft = defaultdict(set), defaultdict(float)
for r in csv.DictReader(open(HERE.parent / "atlas/out/sites_grid.csv")):
    sites[r["fips"]].add(r["id"])
    if r["type"] == "building" and r["sqft"]:
        sqft[r["fips"]] += float(r["sqft"])
all_sites = len(set().union(*sites.values()))
all_sqft = sum(sqft.values())


def round2(x):  # two significant figures: an estimate should not look exact
    if x <= 0: return 0
    from math import floor, log10
    p = 10 ** (floor(log10(x)) - 1)
    return int(round(x / p) * p) if p >= 1 else round(x, 2)


out = {}
for fips in sites:
    shares = sorted(s for s in (len(sites[fips]) / all_sites, sqft[fips] / all_sqft if sqft[fips] else None) if s)
    lo_kwh, hi_kwh = (shares[0] * V["us_datacenter_twh_2023"] * 1e9, shares[-1] * V["us_datacenter_twh_2023"] * 1e9)
    lo_gal = lo_kwh * V["wue_low_l_per_kwh"] / LITRES_PER_GALLON
    hi_gal = hi_kwh * V["wue_high_l_per_kwh"] / LITRES_PER_GALLON
    out[fips] = {
        "label": "ESTIMATE",
        "share_of_us_mapped_data_centers_pct": [round(100 * shares[0], 2), round(100 * shares[-1], 2)],
        "electricity_gwh_per_year": [round2(lo_kwh / 1e6), round2(hi_kwh / 1e6)],
        "electricity_as_homes": [round2(lo_kwh / V["home_kwh_per_year"]), round2(hi_kwh / V["home_kwh_per_year"])],
        "water_million_gallons_per_year": [round2(lo_gal / 1e6), round2(hi_gal / 1e6)],
        "water_as_families": [round2(lo_gal / (V["family_gallons_per_day"] * 365)), round2(hi_gal / (V["family_gallons_per_day"] * 365))],
    }

meta = {
    "inputs": INPUTS,
    "method": ["Start from the national total: U.S. data centers used 176 TWh in 2023.",
               "Give this county its share, by mapped floor area and by mapped site count. Those two answers are the low and the high.",
               "For water, multiply by litres per kWh: low is the rate AWS reports for itself, high is the industry average AWS's own page implies.",
               "Convert to average homes (electricity) and average families (water) so the size is easy to picture."],
    "limits": ["This is an estimate, not a measurement. No company or utility publishes these numbers per county.",
               "The public map is incomplete and a big building is not always a busy one, so the true figure can fall outside the range.",
               "The national total is for 2023; use has grown since.",
               "The water rates are per unit of computing power, a little less than total power, so water figures lean high by roughly a tenth to a third.",
               "Water is on-site cooling water only. It leaves out the water used by power plants."],
}
(HERE / "out").mkdir(exist_ok=True)
(HERE / "out" / "estimates.json").write_text(json.dumps({"meta": meta, "counties": out}, indent=1))
for f in ("51107", "13097", "04013"):
    print(f, out[f])
