from __future__ import annotations

import sys
from pathlib import Path

HERE = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(HERE / "sim"))

from agent import CloseAgent, Policy  # noqa: E402
from books import generate_close  # noqa: E402


def test_naive_close_fails_and_explains():
    pack = generate_close(seed=3, difficulty=0.85)
    assert any(p["code"] == "BANK_FEE" for p in pack.planted)
    agent = CloseAgent(Policy())
    res = agent.run(pack)
    assert res.score < 90
    assert res.failures
    assert all(f.why for f in res.failures)
    assert "door" in res.waypoints


def test_policy_improves_over_repeated_closes():
    agent = CloseAgent()
    results = agent.curriculum(episodes=14, base_seed=21, difficulty=0.75)
    scores = [r.score for r in results]
    first = sum(scores[:4]) / 4
    last = sum(scores[-4:]) / 4
    assert results[-1].score >= results[0].score + 20, scores
    assert last >= first
    assert results[-1].score >= 85
    assert agent.policy.auto_post_bank_fees
    assert agent.policy.timing_window_days >= 1
    assert agent.policy.fuzzy_duplicate
    assert agent.policy.investigate_pnl
    assert any("Learned:" in p for r in results for p in r.patches)


def test_learned_policy_closes_clean_on_new_seed():
    teacher = CloseAgent()
    teacher.curriculum(episodes=10, base_seed=0, difficulty=0.8)
    probe = CloseAgent(teacher.policy)
    res = probe.run(seed=99, difficulty=0.8)
    assert res.balanced
    assert res.score >= 95
    assert res.failures == []
