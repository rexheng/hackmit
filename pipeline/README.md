# /pipeline — the real records behind COMPUTE WORKS

Everything the "ON THE RECORD" ledger in `prototypes/03-compute-works` shows is built here.
Numbers and scores come from code. No model is in the loop. Missing data stays "not found".

| Step | Run | Makes |
| --- | --- | --- |
| Sites and grids | `python atlas/build.py` | every mapped U.S. data center joined to the power grid it plugs into, and how many hours that grid ran mostly on fossil fuels (`atlas/out/`) |
| Household bills | `python bills/build.py` | what homes actually paid for electricity, 2019 vs latest final year, per county (`bills/out/`) |
| Live sources | `python live/refresh.py` | fetches company pages, SEC 10-Ks and county news listed in `live/sources.json`; snapshots each page and logs wording that appears or disappears (`live/history.jsonl`) |
| Verbatim check | `python claims/verify.py` | keeps a quote only if it is a word for word substring of the company's page (`claims/out/claims.json`, `dropped.json`) |
| Scoring | `python claims/score.py` | verdict, likelihood of a false impression (0 to 1, named features with printed weights), and confidence (`claims/out/receipts.json`) |
| Estimates | `python estimates/build.py` | labelled low to high estimates of county data center electricity and water use, from published national figures (`estimates/out/`) |
| Heat vs grid | `python heat/build.py` | NOAA hourly temperature (ISD) joined to the ERCOT hourly fuel mix: what the grid burns in the hottest and coldest hours (`heat/out/`) |
| Texas label | `python texas/build.py` | the five-row A to E data center label for every Texas county: power, water, tax dollars, jobs, straight talk. Company PUE and WUE are checked word for word (`texas/metrics.json`); every cut-off is in `texas/scales.json` (`texas/out/labels.json`) |
| Demo site | `python site/build.py` | the label for one real data center (QTS Fort Worth): company facts and claims checked word for word, physical claims checked against OpenStreetMap, state tax registry lookup (`site/site.json` -> `site/out/label.json`) |
| Bundle | `python bundle.py` | `prototypes/03-compute-works/live.js` |

`pip install -r requirements.txt` first. Atlas and bills only need re-running when EIA publishes new data.
`.github/workflows/refresh-records.yml` runs the last four steps every six hours.

To add a source, add one line to `live/sources.json`. To add a county to the works, add it to
`PRESET_COUNTY` in `bundle.py` and to `news_counties` in `live/sources.json`.

SEC filings need `SEC_CONTACT="Your Name you@example.com"` in the environment (the SEC blocks
automated requests without a contact). Without it the filings step is skipped and the ledger says "not found".

Data: IM3 Open Source Data Center Atlas (PNNL, from OpenStreetMap, ODbL, DOI 10.57931/3017294);
EIA-930 and EIA-861 via PUDL (Catalyst Cooperative); GDELT DOC 2.0; company pages and SEC EDGAR.

Known limits: the atlas lists existing sites only and is crowd-sourced. Sites in counties served by more
than one grid are left unassigned, not guessed. Grid mix counts power made inside the region and does
not trace imports or private supply contracts. Company claims are company-wide; the grid test uses U.S. sites only.
Bills data does not say why a bill changed.
