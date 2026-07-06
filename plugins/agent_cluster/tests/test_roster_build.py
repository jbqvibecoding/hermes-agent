"""Roster builder + runtime roster module tests (offline, fixture repos)."""
from __future__ import annotations

from plugins.agent_cluster.cluster import roster


def _by_slug(agents, slug):
    return next(a for a in agents if a["slug"] == slug)


def test_build_collects_all_sources(built_roster):
    sources = {a["source"] for a in built_roster}
    assert sources == {"agency", "ruflo", "agenthub", "openopc"}
    assert len(built_roster) == 5


def test_dedup_priority_and_requalification(built_roster):
    # agency + openopc both define "Backend Architect"; agency outranks openopc
    # so the bare slug belongs to agency and openopc gets requalified.
    winner = _by_slug(built_roster, "backend-architect")
    assert winner["source"] == "agency"
    requalified = _by_slug(built_roster, "openopc--backend-architect")
    assert requalified["source"] == "openopc"


def test_agenthub_hierarchy_fields(built_roster):
    lead = _by_slug(built_roster, "tech-lead")
    hierarchy = lead["hierarchy"]
    assert hierarchy["level"] == "L1"
    assert hierarchy["department"] == "engineering"
    assert hierarchy["reports_to"] == "boss"
    assert hierarchy["manages"] == ["backend-architect", "frontend-developer"]
    assert hierarchy["coordinates_with"] == ["product-manager"]
    assert hierarchy["model"] == "opus"


def test_agenthub_plain_markdown_fallback(built_roster):
    plain = _by_slug(built_roster, "plain-role")
    assert plain["source"] == "agenthub"
    assert "frontmatter-less" in plain["description"]


def test_lookup_by_slug_name_and_alias(built_roster):
    assert roster.lookup("tech-lead", built_roster)["name"] == "tech-lead"
    assert roster.lookup("Backend Architect", built_roster)["source"] == "agency"
    assert roster.lookup("no-such-agent", built_roster) is None
    assert roster.lookup("", built_roster) is None


def test_search_scores_and_filters(built_roster):
    results = roster.search("backend architect scalable", agents=built_roster, limit=5)
    assert results and results[0]["slug"] == "backend-architect"
    only_ruflo = roster.search("code", source="ruflo", agents=built_roster)
    assert {r["source"] for r in only_ruflo} == {"ruflo"}
    filtered = roster.search("backend", division="engineering", agents=built_roster)
    assert all(r["division"] == "engineering" for r in filtered)


def test_search_cjk_tokens(built_roster):
    results = roster.search("技術決策", agents=built_roster)
    assert results and results[0]["slug"] == "tech-lead"


def test_committed_roster_is_valid():
    agents = roster.load_agents()
    assert len(agents) > 500
    slugs = [a["slug"] for a in agents]
    assert len(slugs) == len(set(slugs)), "committed roster has duplicate slugs"
    for agent in agents:
        assert agent["name"] and agent["slug"] and agent["source"] in {
            "agency", "ruflo", "agenthub", "openopc",
        }
