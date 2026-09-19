"""Join the IM3 data center atlas to the power grid each site plugs into.

Inputs
  data/im3_open_source_data_center_atlas_v2026.02.09.csv  (PNNL IM3, from OpenStreetMap, ODbL)
  PUDL public S3 (no credentials): EIA-930 hourly generation, EIA-861 service territories

Outputs (out/)
  grid_2025.json          per grid region: fuel shares, share of hours that were mostly fossil
  sites_grid.csv          every atlas site with its grid region, or why it has none
  operator_exposure.json  per operator: how much of its footprint sits on mostly-fossil grids

Every number is computed here in code. Nothing is estimated by a model.
Run:  pip install duckdb pandas && python build.py
"""
import json
from pathlib import Path

import duckdb

HERE = Path(__file__).parent
ATLAS = HERE / "data" / "im3_open_source_data_center_atlas_v2026.02.09.csv"
OUT = HERE / "out"
PUDL = "s3://pudl.catalyst.coop/stable/"
YEAR = 2025  # latest full year in EIA-930
HOURLY = "core_eia930__hourly_net_generation_by_energy_source"
FOSSIL = ("coal", "gas", "oil")

con = duckdb.connect()
# The bucket name has dots, so virtual-host style URLs fail TLS. Path style works.
con.execute("INSTALL httpfs; LOAD httpfs; SET s3_region='us-west-2'; SET s3_url_style='path';")

# 1. Hourly generation. In 2025 only the fine-grained categories are filled
#    (solar_wo_integrated_battery_storage, hydro_excluding_pumped_storage, ...);
#    the roll-up rows (solar, wind, hydro) are null, so summing does not double count.
#    Standalone storage is left out: it moves energy, it does not make it.
con.execute(f"""
CREATE TABLE gen AS
SELECT datetime_utc t, balancing_authority_code_eia ba,
       CASE WHEN generation_energy_source LIKE 'solar%' THEN 'solar'
            WHEN generation_energy_source LIKE 'wind%' THEN 'wind'
            WHEN generation_energy_source LIKE 'hydro%' THEN 'hydro'
            WHEN generation_energy_source IN ('coal','gas','oil','nuclear') THEN generation_energy_source
            ELSE 'other' END fuel,
       greatest(coalesce(net_generation_adjusted_mwh, net_generation_reported_mwh), 0) mwh
FROM '{PUDL}{HOURLY}.parquet'
WHERE datetime_utc >= '{YEAR}-01-01' AND datetime_utc < '{YEAR + 1}-01-01'
  AND generation_energy_source NOT IN ('battery_storage','pumped_storage','other_energy_storage','unknown_energy_storage')
  AND coalesce(net_generation_adjusted_mwh, net_generation_reported_mwh) IS NOT NULL
""")
con.execute(f"""
CREATE TABLE hourly AS
SELECT ba, t, sum(mwh) FILTER (WHERE fuel IN {FOSSIL}) fossil, sum(mwh) total
FROM gen GROUP BY 1, 2 HAVING sum(mwh) > 0
""")
con.execute("""
CREATE TABLE ba_year AS
SELECT ba, count(*) n_hours,
       round(100.0 * avg(CASE WHEN fossil / total > 0.5 THEN 1 ELSE 0 END), 1) fossil_majority_hours_pct,
       round(100.0 * avg(CASE WHEN fossil / total < 0.5 THEN 1 ELSE 0 END), 1) clean_hours_pct
FROM hourly GROUP BY 1
""")

grid = {}
for ba, n, fmh, clean in con.execute("SELECT * FROM ba_year").fetchall():
    shares = dict(con.execute(
        "SELECT fuel, round(sum(mwh) / (SELECT sum(mwh) FROM gen WHERE ba = ?), 4) FROM gen WHERE ba = ? GROUP BY 1",
        [ba, ba]).fetchall())
    grid[ba] = {
        "year": YEAR, "n_hours": n, "fuel_shares": shares,
        "fossil_majority_hours_pct": fmh, "clean_hours_pct": clean,
        "source_table": f"PUDL {HOURLY} (EIA-930)",
        "caveat": "Counts power made inside the region. Does not trace imports or private supply contracts.",
    }

# 2. County -> grid region, through the utilities that serve the county (EIA-861).
con.execute(f"""
CREATE TABLE county_ba AS
SELECT DISTINCT st.county_id_fips fips, b.balancing_authority_code_eia ba
FROM '{PUDL}core_eia861__yearly_service_territory.parquet' st
JOIN '{PUDL}core_eia861__assn_balancing_authority.parquet' a
  ON a.utility_id_eia = st.utility_id_eia AND a.report_date = st.report_date AND a.state = st.state
JOIN '{PUDL}core_eia861__yearly_balancing_authority.parquet' b
  ON b.balancing_authority_id_eia = a.balancing_authority_id_eia AND b.report_date = a.report_date
WHERE st.report_date = (SELECT max(report_date) FROM '{PUDL}core_eia861__yearly_service_territory.parquet')
  AND b.balancing_authority_code_eia IN (SELECT ba FROM ba_year)
""")
con.execute(f"""
CREATE TABLE atlas AS
SELECT *, lpad(state_id, 2, '0') || lpad(county_id, 3, '0') fips
FROM read_csv('{ATLAS}', all_varchar = true)
""")
# A site gets a grid only when its county maps to exactly one. We do not guess.
con.execute("""
CREATE TABLE sites AS
WITH g AS (SELECT fips, list(DISTINCT ba ORDER BY ba) bas FROM county_ba GROUP BY 1)
SELECT a.id, a.type, a.name, a.operator, a.county, a.state_abb, a.fips,
       CAST(a.lat AS DOUBLE) lat, CAST(a.lon AS DOUBLE) lon, TRY_CAST(a.sqft AS DOUBLE) sqft,
       CASE WHEN len(g.bas) = 1 THEN g.bas[1] END grid_region_code,
       CASE WHEN g.bas IS NULL THEN 'not found: no utility to grid record for this county'
            WHEN len(g.bas) > 1 THEN 'not assigned: county is served by ' || array_to_string(g.bas, ', ')
            ELSE 'county served by one grid region' END grid_match,
       y.fossil_majority_hours_pct
FROM atlas a LEFT JOIN g USING (fips)
LEFT JOIN ba_year y ON len(g.bas) = 1 AND y.ba = g.bas[1]
""")

# 3. Operator exposure. Count distinct sites; a campus and its buildings can both
#    be listed, so floor area uses buildings only.
ops = con.execute("""
SELECT operator,
       count(DISTINCT id) sites_in_atlas,
       count(DISTINCT id) FILTER (WHERE grid_region_code IS NOT NULL) sites_with_grid,
       count(DISTINCT id) FILTER (WHERE fossil_majority_hours_pct > 50) sites_on_mostly_fossil_grid,
       round(sum(sqft) FILTER (WHERE type = 'building' AND grid_region_code IS NOT NULL)) building_sqft_with_grid,
       round(sum(sqft) FILTER (WHERE type = 'building' AND fossil_majority_hours_pct > 50)) building_sqft_on_mostly_fossil_grid,
       list(DISTINCT grid_region_code ORDER BY grid_region_code) FILTER (WHERE grid_region_code IS NOT NULL) grid_regions
FROM sites WHERE operator <> '' GROUP BY 1 HAVING count(DISTINCT id) >= 5 ORDER BY 2 DESC
""").fetchdf()

OUT.mkdir(exist_ok=True)
(OUT / "grid_2025.json").write_text(json.dumps(grid, indent=1, sort_keys=True))
con.execute(f"COPY (SELECT * FROM sites ORDER BY state_abb, county, id) TO '{OUT / 'sites_grid.csv'}' (HEADER)")
(OUT / "operator_exposure.json").write_text(json.dumps({
    "year": YEAR,
    "definition": "A grid is 'mostly fossil' for a site when coal, gas and oil made more than half the power in more than half of the year's hours.",
    "sources": ["IM3 Open Source Data Center Atlas v2026.02.09 (PNNL, from OpenStreetMap, ODbL), DOI 10.57931/3017294",
                f"PUDL {HOURLY}", "PUDL core_eia861__yearly_service_territory", "PUDL core_eia861__assn_balancing_authority"],
    "limits": ["The atlas is crowd-sourced and lists existing sites only. Operator is blank for about a third of rows.",
               "Sites in counties served by more than one grid region are left out rather than guessed.",
               "Grid mix counts power generated inside the region. It does not trace imports or a company's private supply contracts."],
    "operators": json.loads(ops.to_json(orient="records")),
}, indent=1))

total, matched = con.execute("SELECT count(DISTINCT id), count(DISTINCT id) FILTER (WHERE grid_region_code IS NOT NULL) FROM sites").fetchone()
print(f"{matched} of {total} sites matched to exactly one grid region")
print(ops.head(12).to_string())
