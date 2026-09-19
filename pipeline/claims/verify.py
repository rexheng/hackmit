"""Keep a company claim only if it appears word for word on the company's own page.

candidates.json is a list of { owner, url, text, claim_type, basis, target_year? }.
Each page is downloaded again here, tags are stripped, and the quote must be an
exact substring of the page text. Anything that fails is dropped and reported.
Writes out/claims.json in the shape the site reads.
Run:  python verify.py
"""
import html
import json
import re
import subprocess
from datetime import date
from pathlib import Path

HERE = Path(__file__).parent
UA = "Mozilla/5.0 (compatible; hackmit-claim-check/0.1)"


def page_text(url: str) -> str:
    # curl uses the system certificate store, which python.org builds on macOS lack.
    raw = subprocess.run(
        ["curl", "-sSL", "--compressed", "--max-time", "40", "-A", UA, "-H", "Accept-Language: en-US", url],
        check=True, capture_output=True,
    ).stdout.decode("utf-8", "replace")
    raw = re.sub(r"(?is)<(script|style|noscript)\b.*?</\1>", " ", raw)
    return norm(html.unescape(re.sub(r"(?s)<[^>]+>", " ", raw)))


def norm(s: str) -> str:
    # Same characters, one spelling: straight quotes, plain spaces, plain hyphens.
    s = s.replace("’", "'").replace("‘", "'").replace("“", '"').replace("”", '"')
    s = s.replace(" ", " ").replace("‑", "-").replace("–", "-").replace("—", "-")
    return re.sub(r"\s+", " ", s).strip()


pages: dict[str, str] = {}
kept, dropped = [], []
# Hand-picked candidates first, then whatever ../live/refresh.py pulled automatically.
candidates = json.loads((HERE / "candidates.json").read_text())
auto = HERE / "candidates_auto.json"
if auto.exists():
    seen = {norm(c["text"]) for c in candidates}
    candidates += [c for c in json.loads(auto.read_text()) if norm(c["text"]) not in seen]
for i, c in enumerate(candidates, 1):
    url = c["url"]
    try:
        if url not in pages:
            pages[url] = page_text(url)
        ok = norm(c["text"]) in pages[url]
        why = "" if ok else "quote is not a word for word substring of the page text"
    except Exception as e:  # network errors, blocks
        ok, why = False, f"page could not be downloaded: {e}"
    if ok:
        kept.append({
            "id": f"claim-{i:03d}", "site_id": None, "owner": c["owner"], "text": c["text"],
            "source_url": url, "source_date": date.today().isoformat(), "page": None,
            "claim_type": c["claim_type"], "basis": c["basis"], "target_year": c.get("target_year"),
            "source_kind": c.get("source_kind", "marketing"),
            # A water claim is checkable only if a measured public record exists. None found yet.
            "checkable": c["claim_type"] == "renewable_100",
            "source_date_note": "date the page was retrieved; the page shows no publication date",
        })
    else:
        dropped.append({"owner": c["owner"], "text": c["text"], "url": url, "why": why})

(HERE / "out").mkdir(exist_ok=True)
(HERE / "out" / "claims.json").write_text(json.dumps(kept, indent=1))
(HERE / "out" / "dropped.json").write_text(json.dumps(dropped, indent=1))
print(f"kept {len(kept)}, dropped {len(dropped)}")
for d in dropped:
    print(" DROPPED", d["owner"], "|", d["text"][:60], "|", d["why"][:80])
