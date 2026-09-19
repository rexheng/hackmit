"""Heat vs the grid. Joins two of the Voloridge datasets hour by hour:
  NOAA Integrated Surface Database (s3://noaa-isd-pds)  hourly temperature at big Texas airports
  PUDL / EIA-930                                         hourly fuel mix of the Texas grid (ERCOT)
Question: in the hottest hours, when data centers need the most cooling, what is the grid burning?
Run:  python build.py
"""
import gzip
import io
import json
import subprocess
from collections import defaultdict
from pathlib import Path
from statistics import mean

import duckdb

HERE = Path(__file__).parent
YEAR = 2025
# USAF-WBAN ids, checked against isd-history.csv in the bucket at run time.
STATIONS = {"722590-03927": "DALLAS", "722530-12921": "SAN ANTONIO", "722540-13904": "AUSTIN", "722430-12960": "HOUSTON"}
BUCKET = "https://noaa-isd-pds.s3.amazonaws.com"


def get(url):
    return subprocess.run(["curl", "-sSL", "--max-time", "120", url], check=True, capture_output=True).stdout


history = get(f"{BUCKET}/isd-history.csv").decode("latin-1")
temps = defaultdict(list)  # "YYYYMMDDHH" UTC -> [deg C]
used = []
for sid, city in STATIONS.items():
    usaf, wban = sid.split("-")
    row = next((l for l in history.splitlines() if l.startswith(f'"{usaf}","{wban}"')), "")
    assert city in row.upper(), f"{sid} is not {city}: {row[:80]}"
    raw = gzip.decompress(get(f"{BUCKET}/data/{YEAR}/{sid}-{YEAR}.gz")).decode("latin-1")
    n = 0
    for line in io.StringIO(raw):
        t, quality = line[87:92], line[92]          # air temperature, tenths of a degree C, +9999 = missing
        if t != "+9999" and quality in "01459ACIMPRU":
            temps[line[15:25]].append(int(t) / 10)   # date + hour, UTC
            n += 1
    used.append({"station": sid, "city": row.split('","')[2], "readings": n})
    print(sid, row.split('","')[2], n, "readings")

con = duckdb.connect()
con.execute("INSTALL httpfs; LOAD httpfs; SET s3_region='us-west-2'; SET s3_url_style='path';")
grid = con.execute(f"""
  SELECT strftime(datetime_utc, '%Y%m%d%H') h,
         sum(greatest(coalesce(net_generation_adjusted_mwh, net_generation_reported_mwh), 0)) FILTER (WHERE generation_energy_source IN ('coal','gas','oil')) fossil,
         sum(greatest(coalesce(net_generation_adjusted_mwh, net_generation_reported_mwh), 0)) FILTER (WHERE generation_energy_source NOT IN ('battery_storage','pumped_storage','other_energy_storage','unknown_energy_storage')) total  -- wind and solar names also end in 'storage', so list the standalone ones
  FROM 's3://pudl.catalyst.coop/stable/core_eia930__hourly_net_generation_by_energy_source.parquet'
  WHERE balancing_authority_code_eia = 'ERCO' AND year(datetime_utc) = {YEAR} GROUP BY 1 HAVING total > 0""").fetchall()

hours = [(mean(temps[h]) * 9 / 5 + 32, f / t, t) for h, f, t in grid if len(temps.get(h, [])) >= 2]
hours.sort()
f_all, g_all = mean(x[1] for x in hours), mean(x[2] for x in hours)


def block(rows):
    return {"hours": len(rows), "temp_f": [round(rows[0][0]), round(rows[-1][0])], "fossil_share_pct": round(100 * mean(r[1] for r in rows), 1),
            "generation_vs_average_pct": round(100 * (mean(r[2] for r in rows) / g_all - 1), 1)}


k = len(hours) // 20
bins = []
for lo in range(20, 110, 10):
    rows = [r for r in hours if lo <= r[0] < lo + 10]
    if len(rows) >= 24: bins.append({"from_f": lo, **block(rows)})
# Pearson correlation between temperature and fossil share, hour by hour
n = len(hours); mt, mf = mean(r[0] for r in hours), f_all
corr = sum((r[0] - mt) * (r[1] - mf) for r in hours) / (sum((r[0] - mt) ** 2 for r in hours) * sum((r[1] - mf) ** 2 for r in hours)) ** 0.5

out = {"year": YEAR, "grid": "ERCOT", "hours_joined": n, "stations": used, "all_hours_fossil_share_pct": round(100 * f_all, 1),
       "hottest_5pct": block(hours[-k:]), "coldest_5pct": block(hours[:k]), "mildest": block([r for r in hours if 60 <= r[0] < 70]),
       "by_temperature": bins, "correlation_temp_vs_fossil_share": round(corr, 2),
       "sources": ["NOAA Integrated Surface Database, s3://noaa-isd-pds", "PUDL core_eia930__hourly_net_generation_by_energy_source (EIA-930)"],
       "limits": "Four airport stations stand in for the whole ERCOT grid. Correlation is not cause: hot hours are also late-afternoon hours when solar is fading."}
(HERE / "out" / "heat.json").write_text(json.dumps(out, indent=1))
print(json.dumps({k2: v for k2, v in out.items() if k2 not in ("stations", "sources", "limits")}, indent=1))
