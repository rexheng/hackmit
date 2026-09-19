"""What homes actually paid for electricity in every county that has a data center.

Source: EIA Form 861 (via PUDL): what each utility billed its residential customers
each year (dollars, kWh, customers). Average monthly bill = revenue / customers / 12.
This is measured billing data, not an estimate.

It does NOT say why a bill changed. Fuel prices, storms, new power lines and new
large customers all move bills. The site must say that next to the number.
Run:  python build.py
"""
import json
from pathlib import Path

import duckdb

HERE = Path(__file__).parent
ATLAS = HERE.parent / "atlas" / "data" / "im3_open_source_data_center_atlas_v2026.02.09.csv"
PUDL = "s3://pudl.catalyst.coop/stable/"
BASE_YEAR = 2019

con = duckdb.connect()
con.execute("INSTALL httpfs; LOAD httpfs; SET s3_region='us-west-2'; SET s3_url_style='path';")

con.execute(f"""
CREATE TABLE res AS
SELECT utility_id_eia, utility_name_eia, state, year(report_date) yr,
       sum(customers) customers, sum(sales_mwh) mwh, sum(sales_revenue) dollars
FROM '{PUDL}core_eia861__yearly_sales.parquet'
WHERE customer_class = 'residential' AND service_type = 'bundled' AND year(report_date) >= {BASE_YEAR}
  AND data_maturity = 'final'  -- the newest year is provisional, so it is left out
GROUP BY 1, 2, 3, 4 HAVING sum(customers) > 0 AND sum(sales_revenue) > 0
""")
# In states where homes can pick their power supplier, the utility only bills some
# homes for the full service. Record what share that is so the site can say so.
con.execute(f"""
CREATE TABLE share AS
SELECT utility_id_eia, state, year(report_date) yr,
       sum(customers) FILTER (WHERE service_type = 'bundled') * 1.0 / nullif(sum(customers), 0) bundled_share
FROM '{PUDL}core_eia861__yearly_sales.parquet'
WHERE customer_class = 'residential' AND service_type IN ('bundled', 'delivery') GROUP BY 1, 2, 3
""")
LATEST = con.execute("SELECT max(yr) FROM res").fetchone()[0]

us = {yr: {"avg_monthly_bill_usd": round(d / c / 12, 2), "cents_per_kwh": round(100 * d / (m * 1000), 2)}
      for yr, c, m, d in con.execute(
          "SELECT yr, sum(customers), sum(mwh), sum(dollars) FROM res WHERE yr IN (?, ?) GROUP BY 1", [BASE_YEAR, LATEST]).fetchall()}

con.execute(f"""
CREATE TABLE county_util AS
SELECT DISTINCT st.county_id_fips fips, st.utility_id_eia, st.state
FROM '{PUDL}core_eia861__yearly_service_territory.parquet' st
WHERE st.report_date = (SELECT max(report_date) FROM '{PUDL}core_eia861__yearly_service_territory.parquet')
  AND st.county_id_fips IN (SELECT DISTINCT lpad(state_id, 2, '0') || lpad(county_id, 3, '0')
                            FROM read_csv('{ATLAS}', all_varchar = true))
""")
rows = con.execute(f"""
SELECT cu.fips, a.utility_name_eia, a.customers, round(sh.bundled_share, 2) bundled_share,
       round(b.dollars / b.customers / 12, 2) bill_base, round(a.dollars / a.customers / 12, 2) bill_latest,
       round(100 * b.dollars / (b.mwh * 1000), 2) cents_base, round(100 * a.dollars / (a.mwh * 1000), 2) cents_latest
FROM county_util cu
JOIN res a ON a.utility_id_eia = cu.utility_id_eia AND a.state = cu.state AND a.yr = {LATEST}
JOIN res b ON b.utility_id_eia = cu.utility_id_eia AND b.state = cu.state AND b.yr = {BASE_YEAR}
LEFT JOIN share sh ON sh.utility_id_eia = cu.utility_id_eia AND sh.state = cu.state AND sh.yr = {LATEST}
ORDER BY cu.fips, a.customers DESC
""").fetchall()

counties: dict[str, list] = {}
for fips, name, cust, share, bill0, bill1, c0, c1 in rows:
    counties.setdefault(fips, []).append({
        "utility_name": name, "residential_customers_in_state": cust,
        "share_of_homes_covered": share,
        "covers_most_homes": share is not None and share >= 0.9,
        "avg_monthly_bill_usd": {str(BASE_YEAR): bill0, str(LATEST): bill1},
        "change_usd_per_month": round(bill1 - bill0, 2),
        "change_pct": round(100 * (bill1 - bill0) / bill0, 1),
        "cents_per_kwh": {str(BASE_YEAR): c0, str(LATEST): c1},
    })

out = {
    "base_year": BASE_YEAR, "latest_year": LATEST, "us_average": us,
    "source_table": "PUDL core_eia861__yearly_sales and core_eia861__yearly_service_territory (EIA Form 861)",
    "caveat": "These are average bills for all homes a utility serves in the state, not just this county. "
              "The data does not say why bills changed, so we do not say data centers caused it. Not adjusted for inflation.",
    "counties": counties,
}
(HERE / "out").mkdir(exist_ok=True)
(HERE / "out" / "bills.json").write_text(json.dumps(out, indent=1))
print("US:", us)
for f in ("51107", "39089", "13121", "04013", "41059"):
    for u in counties.get(f, [])[:2]:
        print(f, u["utility_name"], u["avg_monthly_bill_usd"], f"{u['change_pct']}%", "covers", u["share_of_homes_covered"])
print(len(counties), "counties with bill data")
