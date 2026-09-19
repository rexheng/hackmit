"""Score each verified claim. Every number here comes from code, never from a model.

Two separate outputs per claim, because they answer different questions:
  likelihood  how likely the sentence leaves a reader with a false impression (0 to 1)
  confidence  how much public record we had to test it with (high / medium / low)

The likelihood is a sum of plain, named text features plus one physical test:
the share of the company's mapped US sites that sit on grids that ran mostly on
fossil fuels. Weights are printed in the output so anyone can argue with them.
Run after ../atlas/build.py and verify.py:  python score.py
"""
import json
import re
from pathlib import Path

HERE = Path(__file__).parent
claims = json.loads((HERE / "out" / "claims.json").read_text())
exposure = {o["operator"]: o for o in json.loads((HERE.parent / "atlas" / "out" / "operator_exposure.json").read_text())["operators"]}

HEDGES = ["goal", "aim", "strive", "expect", "committed", "commitment", "on track", "toward", "towards", "path to", "up to", "key to"]
WEIGHTS = {
    "physical_gap": 0.45,      # energy claims only: share of mapped sites on mostly-fossil grids
    "annual_wording": 0.15,    # "matched" / "annual": bookkeeping over a year, easy to read as "runs on"
    "future_target": 0.15,     # a promise about a later year, not a result
    "hedged": 0.10,            # softening words
    "no_number": 0.10,         # nothing measurable in the sentence
    "no_boundary": 0.05,       # does not say which sites or which part of the company
}


def features(c):
    t = c["text"].lower()
    years = [int(y) for y in re.findall(r"\b(20\d\d)\b", t)]
    f = {
        "annual_wording": bool(re.search(r"\bmatch(ed|es|ing)?\b|\bannual", t)),
        "future_target": bool(c.get("target_year")) or bool(re.search(r"\bby 20\d\d\b|\bwill\b|\bbecome\b", t)),
        "hedged": [h for h in HEDGES if h in t],
        "no_number": not re.search(r"\d+(\.\d+)?\s*(%|percent|billion|million|gw|gigawatt|liters|gallons|cubic)", t),
        "no_boundary": not re.search(r"data center|operations|global|u\.s\.|devices|aws", t),
        "years_named": years,
    }
    return f


def verdict_for(c, f, exp):
    energy = c["claim_type"] == "renewable_100"
    if energy and exp and exp["sites_with_grid"]:
        gap = exp["sites_on_mostly_fossil_grid"] / exp["sites_with_grid"]
        if c["basis"] == "hourly":
            return ("Does not hold up" if gap > 0.5 else "Holds up"), gap
        return ("Holds on paper only" if gap > 0.5 else "Holds up"), gap
    return "Can't be checked", None


NEEDED = {
    "water": "metered yearly water use for each site, published by the company or the local water utility, and the location of each restoration project",
    "net_zero": "a verified yearly emissions inventory for the company that includes the power its data centers draw hour by hour",
    "carbon_neutral": "a verified yearly emissions inventory and a public list of the carbon removals bought",
}

receipts = []
for c in claims:
    f = features(c)
    exp = exposure.get(c["owner"])
    verdict, gap = verdict_for(c, f, exp)
    parts = {
        "physical_gap": gap or 0.0,
        "annual_wording": 1.0 if f["annual_wording"] else 0.0,
        "future_target": 1.0 if f["future_target"] else 0.0,
        "hedged": min(1.0, len(f["hedged"]) / 2),
        "no_number": 1.0 if f["no_number"] else 0.0,
        "no_boundary": 1.0 if f["no_boundary"] else 0.0,
    }
    score = round(sum(WEIGHTS[k] * v for k, v in parts.items()), 2)

    coverage = exp["sites_with_grid"] / exp["sites_in_atlas"] if exp else 0
    if verdict == "Can't be checked":
        confidence = "low"
    elif exp["sites_with_grid"] >= 30 and coverage >= 0.8:
        confidence = "high"
    else:
        confidence = "medium"

    evidence = []
    if gap is not None:
        evidence += [
            {"label": f"of {c['owner']}'s {exp['sites_with_grid']} mapped U.S. sites sit on a power grid that ran mostly on fossil fuels in more than half of 2025's hours",
             "value": exp["sites_on_mostly_fossil_grid"], "unit": "sites",
             "source": "IM3 Open Source Data Center Atlas (PNNL, from OpenStreetMap) joined to PUDL core_eia930__hourly_net_generation_by_energy_source"},
            {"label": f"of the {exp['sites_in_atlas']} sites the atlas lists for this company could be matched to one power grid",
             "value": exp["sites_with_grid"], "unit": "sites", "source": "PUDL core_eia861__yearly_service_territory"},
        ]

    if verdict == "Holds on paper only":
        plain = (f"Over a whole year, {c['owner']} says it buys as much renewable energy as it uses. We did not audit those purchases. "
                 f"Hour by hour is a different story: {exp['sites_on_mostly_fossil_grid']} of its {exp['sites_with_grid']} mapped U.S. sites "
                 "plug into grids that ran mostly on coal, gas and oil for more than half the year.")
    elif verdict == "Holds up":
        plain = f"The record supports this. Most of {c['owner']}'s mapped U.S. sites plug into grids that were mostly clean."
    elif verdict == "Does not hold up":
        plain = f"This claim is inconsistent with the hourly grid record for most of {c['owner']}'s mapped U.S. sites."
    else:
        plain = f"No public record exists to test this. What would be needed: {NEEDED.get(c['claim_type'], 'a measured public record that matches the wording of the claim')}."

    receipts.append({
        "claim_id": c["id"], "verdict": verdict, "score": score, "confidence": confidence,
        "evidence": evidence, "explanation_plain": plain,
        "text_features": {k: v for k, v in f.items()}, "score_parts": {k: round(WEIGHTS[k] * v, 3) for k, v in parts.items()},
    })

(HERE / "out" / "receipts.json").write_text(json.dumps({"weights": WEIGHTS, "receipts": receipts}, indent=1))
for c, r in zip(claims, receipts):
    print(f"{r['score']:.2f} {r['confidence']:<6} {r['verdict']:<20} {c['owner']:<20} {c['text'][:58]}")
