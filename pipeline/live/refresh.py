"""Fetch and process primary sources automatically. Safe to run on a schedule.

Three kinds of source, all listed in sources.json (add a line, get it next run):
  pages    company marketing and report pages  -> claim sentences, word for word
  filings  each company's latest SEC 10-K      -> what it told investors about energy, water, climate
  news     GDELT news search per county        -> recent local coverage, headline + link only

Every page is saved as a dated snapshot, and each run is diffed against the last one,
so a claim that quietly appears, changes or disappears shows up in history.jsonl.
Sentences are cut straight from the fetched text, so every quote is verbatim by construction.
No model is needed. Run:  python refresh.py   (then ../claims/verify.py, score.py, ../bundle.py)
"""
import hashlib
import html
import json
import os
import re
import subprocess
import time
import urllib.parse
from datetime import datetime, timezone
from pathlib import Path

HERE = Path(__file__).parent
SNAP = HERE / "snapshots"
UA = "Mozilla/5.0 (compatible; hackmit-claim-check/0.1)"
# The SEC asks automated tools to identify themselves. Set SEC_CONTACT="Name email" to fetch filings.
SEC_UA = os.environ.get("SEC_CONTACT", "")
NOW = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%MZ")

CLAIM = re.compile(r"renewable|carbon[- ]free|clean energy|net[- ]zero|carbon[- ](neutral|negative)|water[- ]positive|replenish|100\s?%|24/7", re.I)
SPEAKER = re.compile(r"\b(we|our|we've|we'll|amazon|aws|meta|microsoft|google|equinix|digital realty)\b", re.I)
# A customer praising the company is not the company making a claim.
TESTIMONIAL = re.compile(r"partnered with (equinix|digital realty|aws|amazon|google|microsoft|meta)|\bsaid\b|\bsays\b", re.I)
RISK_TOPIC = re.compile(r"data cent(er|re)s?|electricity|energy|power|water|climate|carbon|renewable|emissions", re.I)
RISK_WORD = re.compile(r"\b(may|could|might|no assurance|cannot|unable|difficult|shortage|constrain|increase[sd]? (in )?cost|not be able|depend)", re.I)


def curl(url, ua=UA):
    out = subprocess.run(["curl", "-sSL", "--compressed", "--max-time", "60", "-A", ua, "-H", "Accept-Language: en-US", url],
                         check=True, capture_output=True).stdout
    return out.decode("utf-8", "replace")


def text_of(raw):
    raw = re.sub(r"(?is)<(script|style|noscript)\b.*?</\1>", " ", raw)
    raw = re.sub(r"(?i)</(p|div|li|h\d|td|section|br)\s*>|<br\s*/?>", " \n ", raw)
    t = html.unescape(re.sub(r"(?s)<[^>]+>", " ", raw))
    t = t.replace("’", "'").replace("‘", "'").replace("“", '"').replace("”", '"').replace(" ", " ")
    return t


def sentences(text):
    out = []
    for block in text.split("\n"):
        block = re.sub(r"\s+", " ", block).strip()
        for s in re.split(r"(?<=[.!?])\s+(?=[A-Z\"'])", block):
            if 40 <= len(s) <= 420 and s[-1] in ".!?":
                out.append(s)
    return list(dict.fromkeys(out))


def classify(s):
    l = s.lower()
    if re.search(r"water", l): kind = "water"
    elif re.search(r"net[- ]zero", l): kind = "net_zero"
    elif re.search(r"carbon[- ](neutral|negative)", l): kind = "carbon_neutral"
    elif re.search(r"renewable|carbon[- ]free|clean energy", l): kind = "renewable_100" if re.search(r"100\s?%|24/7|all of", l) else "other"
    else: kind = "other"
    basis = "hourly" if re.search(r"24/7|every hour|around the clock|hour[- ]by[- ]hour", l) else "annual" if re.search(r"match|annual|in 20\d\d", l) else "unspecified"
    target = re.search(r"\bby (20[3-9]\d)\b|\bin (20[3-9]\d)\b", l)
    return kind, basis, int(next(g for g in target.groups() if g)) if target else None


def snapshot(key, sents):
    """Save this run's sentences; return what was added and removed since the last run."""
    d = SNAP / key
    d.mkdir(parents=True, exist_ok=True)
    previous = sorted(d.glob("*.json"))
    old = set(json.loads(previous[-1].read_text())["sentences"]) if previous else None
    digest = hashlib.sha256("\n".join(sents).encode()).hexdigest()[:12]
    if not previous or json.loads(previous[-1].read_text())["digest"] != digest:
        (d / f"{NOW.replace(':', '')}.json").write_text(json.dumps({"retrieved": NOW, "digest": digest, "sentences": sents}, indent=0))
    if old is None:
        return [], []
    return [s for s in sents if s not in old], [s for s in old if s not in set(sents)]


cfg = json.loads((HERE / "sources.json").read_text())
history = (HERE / "history.jsonl").open("a")
candidates, filings_out, news_out, log = [], {}, {}, []

for src in cfg["pages"]:
    key = hashlib.sha1(src["url"].encode()).hexdigest()[:10]
    try:
        claim_sents = [s for s in sentences(text_of(curl(src["url"]))) if CLAIM.search(s) and SPEAKER.search(s) and not TESTIMONIAL.search(s)]
    except Exception as e:
        log.append(f"PAGE FAILED {src['url']}: {e}"); continue
    added, removed = snapshot(key, claim_sents)
    for s in added: history.write(json.dumps({"at": NOW, "owner": src["owner"], "url": src["url"], "change": "appeared", "text": s}) + "\n")
    for s in removed: history.write(json.dumps({"at": NOW, "owner": src["owner"], "url": src["url"], "change": "disappeared", "text": s}) + "\n")
    # Keep the most specific sentences: claim words plus a number.
    ranked = sorted(claim_sents, key=lambda s: (len(CLAIM.findall(s)) + 2 * bool(re.search(r"\d", s))), reverse=True)[:6]
    for s in ranked:
        kind, basis, target = classify(s)
        candidates.append({"owner": src["owner"], "url": src["url"], "source_kind": src["kind"], "text": s,
                           "claim_type": kind, "basis": basis, "target_year": target})
    log.append(f"page  {src['owner']:<20} {len(claim_sents):>3} claim sentences, kept {len(ranked)}, +{len(added)} -{len(removed)} since last run")

if SEC_UA:
    for f in cfg["filings"]:
        try:
            sub = json.loads(curl(f"https://data.sec.gov/submissions/CIK{f['cik']}.json", SEC_UA))
            assert f["expect_name"] in sub["name"].upper(), f"CIK {f['cik']} is {sub['name']}, expected {f['expect_name']}"
            r = sub["filings"]["recent"]
            i = r["form"].index("10-K")
            url = f"https://www.sec.gov/Archives/edgar/data/{int(f['cik'])}/{r['accessionNumber'][i].replace('-', '')}/{r['primaryDocument'][i]}"
            time.sleep(0.5)
            sents = [s for s in sentences(text_of(curl(url, SEC_UA))) if RISK_TOPIC.search(s) and RISK_WORD.search(s)]
            ranked = sorted(sents, key=lambda s: len(RISK_TOPIC.findall(s)) + 2 * bool(re.search(r"data cent", s, re.I)), reverse=True)[:8]
            filings_out[f["owner"]] = {"form": "10-K", "filed": r["filingDate"][i], "url": url, "sentences": ranked}
            snapshot("sec-" + f["cik"], ranked)
            log.append(f"10-K  {f['owner']:<20} filed {r['filingDate'][i]}, {len(sents)} risk sentences, kept {len(ranked)}")
        except Exception as e:
            log.append(f"FILING FAILED {f['owner']}: {e}")
else:
    log.append("filings skipped: set SEC_CONTACT to fetch 10-Ks")

for n in cfg["news_counties"]:
    q = urllib.parse.quote(n["query"])
    url = f"https://api.gdeltproject.org/api/v2/doc/doc?query={q}&mode=artlist&format=json&maxrecords=12&sort=datedesc&timespan=3m"
    for attempt in range(3):
        time.sleep(6)  # GDELT allows one request every 5 seconds
        body = curl(url)
        if body.lstrip().startswith("{"):
            arts = json.loads(body).get("articles", [])
            news_out[n["fips"]] = [{"title": a["title"], "url": a["url"], "outlet": a.get("domain"), "seen": a.get("seendate")} for a in arts]
            log.append(f"news  {n['fips']} {len(arts)} articles")
            break
    else:
        # GDELT limits shared networks hard. Fall back to the Google News RSS search for the same words.
        try:
            rss = curl("https://news.google.com/rss/search?q=" + urllib.parse.quote(n["query"] + " when:60d") + "&hl=en-US&gl=US&ceid=US:en")
            tag = lambda it, t: html.unescape((re.search(rf"(?s)<{t}[^>]*>(.*?)</{t}>", it) or [None, ""])[1])
            items = re.findall(r"(?s)<item>(.*?)</item>", rss)[:12]
            news_out[n["fips"]] = [{"title": re.sub(r" - [^-]+$", "", tag(it, "title")), "url": tag(it, "link"), "outlet": tag(it, "source"), "seen": tag(it, "pubDate")[5:16], "via": "Google News RSS"} for it in items]
            log.append(f"news  {n['fips']} {len(items)} articles (RSS fallback)")
        except Exception as e:
            log.append(f"NEWS FAILED {n['fips']}: {e}")

(HERE.parent / "claims" / "candidates_auto.json").write_text(json.dumps(candidates, indent=1))
(HERE / "filings.json").write_text(json.dumps(filings_out, indent=1))
old_news = json.loads((HERE / "news.json").read_text())["counties"] if (HERE / "news.json").exists() else {}
news_out = {**{k: v for k, v in old_news.items() if k not in news_out}, **news_out}  # a rate-limited county keeps its last good result
(HERE / "news.json").write_text(json.dumps({"retrieved": NOW, "source": "GDELT DOC 2.0 API", "counties": news_out}, indent=1))
(HERE / "feeds.json").write_text(json.dumps({"retrieved": NOW, "every": "6 hours", "feeds": [
    {"kind": "Company pages and reports", "count": len(cfg["pages"]), "what": "claims, PUE, WUE, checked word for word"},
    {"kind": "Local news", "count": sum(len(v) for v in news_out.values()), "what": "headlines by county, GDELT then Google News"},
    {"kind": "SEC filings", "count": len(filings_out), "what": "what owners tell investors" + ("" if SEC_UA else " (off: needs a contact email)")},
    {"kind": "Government data", "count": 6, "what": "EIA bills and grid, NOAA weather, Texas Comptroller, BLS jobs, PNNL map, Berkeley Lab"}]}, indent=1))
print("\n".join(log))
