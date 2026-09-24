"""Hermes Crew — standing rules that keep working.

The premise this is built on is worth restating, because it is not the one the
plan started with. Hermes memory does **not** grow forever: it is a bounded
list, and at the ceiling ``add`` refuses the write and tells the model to
consolidate by hand in the same turn. After three failures it gives up with
"The fact can be saved in a later turn", and nothing guarantees that turn. So
the failure being prevented is not rot — it is a teammate that **silently
stops learning**, with a tool error nobody reads as the only symptom.

Two things are pinned hardest:

* **The gardener only ever merges.** Stale and contradictory entries are
  raised as questions, never acted on. A rule deleted because a model thought
  it looked old is an undetectable change — the rule is gone, the behaviour
  moves, and nothing says why.
* **It stays quiet when there is nothing to do.** Three separate tests assert
  that an unpressured store, a short list and a recent run each cost zero
  model calls, because a maintenance pass nobody asked for should not appear
  on a bill.
"""

from __future__ import annotations

import sys
from pathlib import Path

import pytest

_PLUGIN_ROOT = Path(__file__).resolve().parents[2] / "plugins" / "hermes-crew"
if str(_PLUGIN_ROOT) not in sys.path:
    sys.path.insert(0, str(_PLUGIN_ROOT))

from crew import db as crew_db  # noqa: E402
from crew.memory import filters as crew_filters  # noqa: E402
from crew.memory import gardener as crew_gardener  # noqa: E402


# ---------------------------------------------------------------------------
# Credentials — the half that belongs in the host's shared scanner
# ---------------------------------------------------------------------------


# Assembled at runtime rather than written out, and not for style. A file
# holding credential-shaped literals is the exact thing this feature exists to
# stop, and it trips every scanner downstream — GitHub push protection
# rejected the first version of this file for a "Slack API token" that was
# always a fixture. Joining the parts keeps the patterns exercised without
# putting anything secret-shaped on disk.
def _fake(prefix: str, body: str, length: int) -> str:
    return prefix + body * length


_CREDENTIALS = [
    "remember my github token is " + _fake("gh" + "p_", "A", 30),
    "the key is " + _fake("sk-" + "proj-", "B", 26),
    "use " + _fake("xox" + "b-", "1", 12) + "-" + "c" * 12 + " for slack",
    _fake("AK" + "IA", "Q", 16) + " is the access key",
    "auth header: " + _fake("Bear" + "er ", "d", 30),
    "我的密码是 " + "e" * 10,
]


@pytest.mark.parametrize("secret", _CREDENTIALS)
def test_a_bare_credential_never_becomes_a_standing_rule(secret):
    """**The gap the existing pattern leaves.**

    `tools/threat_patterns.py` already had `hardcoded_secret`, but it needs a
    `key = "value"` shape to anchor on. A credential arrives without one every
    time somebody says "remember my token is …" and the model writes it down
    verbatim — and memory is plain text on disk *and* injected into every
    system prompt for the rest of the session.

    The patterns went into the host's shared scanner rather than this plugin
    because that file is also the source for the context-file scanner and the
    tool-result delimiters; a copy here would have made only the crew safe.
    """
    from tools.threat_patterns import first_threat_message

    assert first_threat_message(secret, scope="strict"), f"not blocked: {secret}"


@pytest.mark.parametrize("innocent", [
    "always use the browser tool before searching the web",
    "my manager is called Alex and prefers bullet points",
    "when I say EOD I mean 6pm Berlin time",
    "写周报的时候先列结论再列细节",
    "send the invoice through the finance portal, not by email",
])
def test_ordinary_rules_are_not_mistaken_for_credentials(innocent):
    """The cost of a false positive here is a teammate that cannot be taught
    an ordinary preference, and it would look like the feature is broken."""
    from tools.threat_patterns import first_threat_message

    assert first_threat_message(innocent, scope="strict") is None, f"wrongly blocked: {innocent}"


def test_the_shape_the_host_already_covered_is_not_covered_twice():
    """Proof the addition is a gap-filler, not a duplicate: the assignment
    shape still matches the pattern that was already there."""
    from tools.threat_patterns import scan_for_threats

    found = scan_for_threats('api_key = "AKIAIOSFODNN7EXAMPLEEXTRA"', scope="strict")
    assert "hardcoded_secret" in found


# ---------------------------------------------------------------------------
# Stale capability claims — the half that is a product judgement
# ---------------------------------------------------------------------------


@pytest.mark.parametrize("claim", [
    "the built-in generate_image tool now supports unwatermarked output",
    "the watermark bug in the image API has been fixed",
    "browser_navigate no longer requires a separate login step",
    "内置工具已经支持无水印出图了",
])
def test_a_claim_about_how_a_tool_behaves_now_is_refused(claim):
    """**The incident this exists for.**

    A watermark bug sent an agent the long way round; it found a workaround
    and wrote "the server-side watermark problem has been fixed" into memory.
    No such flag ever shipped. Memory has no re-verification step, so every
    later turn read the inference as settled fact and grew more confident
    while the user could not understand why images still had watermarks.

    These assertions expire fastest, cost most when wrong, and get written at
    the moment of peak confidence — right after the model works something out.
    """
    assert crew_filters.stale_capability_claim(claim), f"not refused: {claim}"
    assert crew_filters.refuse(claim)


@pytest.mark.parametrize("fact", [
    "the expense portal now supports mobile receipts",
    "the VPN issue has been fixed, IT sorted it out",
    "the badge reader no longer requires a PIN",
    "公司的报销系统已经支持手机拍照了",
])
def test_a_real_world_fact_that_hits_the_claim_half_still_survives(fact):
    """**The case that proves the conjunction is load-bearing.**

    Every one of these trips the *claim* half — "now supports", "has been
    fixed", "no longer requires" — and is nonetheless exactly the kind of
    durable fact memory exists to hold. They survive only because their
    subject is not a tool this teammate runs on.

    Written this way deliberately: an earlier version of this test used facts
    that did not match the claim pattern at all, so it passed whether or not
    the subject half existed. It proved nothing. A test for a conjunction has
    to supply inputs that satisfy one half and fail the other.
    """
    assert crew_filters._CLAIM.search(fact), "this example no longer exercises the claim half"
    assert not crew_filters.stale_capability_claim(fact), f"wrongly refused: {fact}"
    assert crew_filters.refuse(fact) == ""


@pytest.mark.parametrize("fact", [
    "the company moved expense reports to Feishu",
    "our staging database has been migrated to Postgres",
    "公司的报销系统已经换成飞书了",
])
def test_ordinary_world_facts_are_left_alone(fact):
    """The broader sanity check: real facts about the world are the point of
    standing rules and must not be refused."""
    assert not crew_filters.stale_capability_claim(fact), f"wrongly refused: {fact}"


def test_a_preference_about_a_tool_is_not_a_claim_about_it():
    """Subject without claim. "Use the browser tool" is how somebody tells a
    teammate to work, which is the whole point of standing rules."""
    assert not crew_filters.stale_capability_claim("prefer the browser tool over web_search")
    assert not crew_filters.stale_capability_claim("always read_file before you patch")


def test_the_filter_says_nothing_about_empty_input():
    assert not crew_filters.stale_capability_claim("")
    assert not crew_filters.stale_capability_claim(None)


# ---------------------------------------------------------------------------
# The gardener: when it runs
# ---------------------------------------------------------------------------


class _FakeStore:
    """Just the surface the gardener uses, so pressure can be set exactly."""

    def __init__(self, entries, limit=2200):
        self._entries = list(entries)
        self._limit = limit
        self.batches: list = []
        self.batch_result = {"success": True}

    def load_from_disk(self):
        pass

    def entries(self, target="memory"):
        return list(self._entries)

    def usage(self, target="memory"):
        return sum(len(e) for e in self._entries), self._limit

    def apply_batch(self, target, operations):
        self.batches.append(operations)
        return self.batch_result


def _full(count=10, size=200):
    return [f"rule {n}: " + "x" * size for n in range(count)]


def test_a_store_with_room_to_spare_is_left_alone():
    """Below the pressure line there is nothing to gain and a model call to
    pay for."""
    store = _FakeStore(_full(count=10, size=20))
    assert not crew_gardener.under_pressure(store, crew_gardener.settings())


def test_a_short_list_is_left_alone_even_when_it_is_full():
    """Eight entries is the floor: a handful of rules are all distinct, and
    merging them would be inventing redundancy that is not there."""
    store = _FakeStore(["x" * 900, "y" * 900], limit=2200)
    assert not crew_gardener.under_pressure(store, crew_gardener.settings())


def test_a_full_list_with_enough_entries_is_worth_tidying():
    store = _FakeStore(_full(count=10, size=200), limit=2200)
    assert crew_gardener.under_pressure(store, crew_gardener.settings())


# ---------------------------------------------------------------------------
# The gardener: what it will and will not do
# ---------------------------------------------------------------------------


_ENTRIES = [
    "always cc finance on invoices",
    "copy the finance team when sending an invoice",
    "the old VPN rule from the 2019 migration",
    "reply to customers within one hour",
    "never reply to customers before I have read it",
]


def test_only_overlapping_entries_are_merged():
    plan = {
        "overlapping": [{"indexes": [0, 1], "merged": "cc finance on invoices"}],
        "stale": [{"index": 2, "why": "2019"}],
        "conflicting": [{"indexes": [3, 4], "why": "one says reply fast, one says wait"}],
    }
    operations = crew_gardener.merge_operations(_ENTRIES, plan)

    removed = {op["old_text"] for op in operations if op["action"] == "remove"}
    added = [op["content"] for op in operations if op["action"] == "add"]
    assert removed == {_ENTRIES[0], _ENTRIES[1]}
    assert added == ["cc finance on invoices"]
    assert _ENTRIES[2] not in removed, "a stale entry must never be removed"
    assert _ENTRIES[3] not in removed and _ENTRIES[4] not in removed


def test_stale_and_conflicting_become_questions_not_edits():
    """**The decision this whole module turns on.**

    These are rules a person wrote about how they want to be worked with.
    Deleting one because a model thought it looked old is a change nobody can
    detect: the rule is gone, the behaviour shifts, and there is nothing in
    the thread that says why.
    """
    plan = {
        "stale": [{"index": 2, "why": "refers to a 2019 migration"}],
        "conflicting": [{"indexes": [3, 4], "why": "they contradict"}],
    }
    assert crew_gardener.merge_operations(_ENTRIES, plan) == []

    asked = crew_gardener.questions(_ENTRIES, plan)
    kinds = {item["kind"] for item in asked}
    assert kinds == {"stale", "conflicting"}
    assert _ENTRIES[2] in asked[0]["entries"]


def test_a_merge_that_is_not_shorter_is_dropped():
    """A "merge" longer than its parts has merged nothing, and applying it
    would move the store *towards* the ceiling this pass backs away from."""
    plan = {"overlapping": [{"indexes": [0, 1], "merged": "x" * 500}]}
    assert crew_gardener.merge_operations(_ENTRIES, plan) == []


def test_an_entry_cannot_be_claimed_by_two_merges():
    """Removing the same entry twice inside one atomic batch is data loss
    wearing a tidy-up's clothes."""
    plan = {"overlapping": [
        {"indexes": [0, 1], "merged": "cc finance"},
        {"indexes": [1, 3], "merged": "cc finance too"},
    ]}
    operations = crew_gardener.merge_operations(_ENTRIES, plan)
    removed = [op["old_text"] for op in operations if op["action"] == "remove"]
    assert len(removed) == len(set(removed))
    assert len(removed) == 2, "only the first group survives"


@pytest.mark.parametrize("plan", [
    {"overlapping": [{"indexes": [0, 99], "merged": "short"}]},
    {"overlapping": [{"indexes": [0], "merged": "short"}]},
    {"overlapping": [{"indexes": [0, 1], "merged": ""}]},
    {"overlapping": [{"indexes": "nope", "merged": "short"}]},
    {"overlapping": "not a list"},
    {},
])
def test_a_plan_that_does_not_check_out_changes_nothing(plan):
    """Validated against the entries actually read, never trusted. An index
    out of range is the difference between tidying and deleting a rule at
    random."""
    assert crew_gardener.merge_operations(_ENTRIES, plan) == []


def test_an_unreadable_plan_is_not_half_applied():
    assert crew_gardener._parse("not json at all") == {}
    assert crew_gardener._parse("") == {}
    assert crew_gardener._parse('```json\n{"overlapping": []}\n```') == {"overlapping": []}


# ---------------------------------------------------------------------------
# The sweep
# ---------------------------------------------------------------------------


@pytest.fixture()
def conn(tmp_path, monkeypatch):
    monkeypatch.setenv("HERMES_CREW_DB", str(tmp_path / "crew.db"))
    crew_db.close_all()
    connection = crew_db.connect()
    crew_db.upsert_bot(connection, bot_id="scout", name="Scout", role="research")
    crew_db.ensure_dm_thread(connection, "scout")
    yield connection
    crew_db.close_all()


def test_a_teammate_gardened_recently_is_not_due(conn):
    """Seven days. Memory changes slowly, and somebody who just answered a
    question about their rules should not be asked again tomorrow."""
    now = crew_db.now_ms()
    conn.execute("UPDATE bots SET gardened_at = ? WHERE id = 'scout'", (now,))
    conn.commit()
    assert crew_gardener.due(conn, now_ms=now) == []


def test_a_teammate_never_gardened_is_due(conn):
    assert [b["id"] for b in crew_gardener.due(conn, now_ms=crew_db.now_ms())] == ["scout"]


def test_a_skipped_run_still_starts_the_cooldown(conn, monkeypatch):
    """Otherwise a teammate with nine tidy rules is re-examined on every tick
    for the rest of its life."""
    monkeypatch.setattr(crew_gardener, "run_once", lambda *a, **k: {"skipped": "not under pressure"})
    monkeypatch.setattr("crew.orchestrator.profile_scope", lambda bot_id: _nullcontext())

    assert crew_gardener.tick(conn) == 0
    [row] = conn.execute("SELECT gardened_at FROM bots WHERE id = 'scout'").fetchall()
    assert row["gardened_at"] > 0


def test_a_run_that_blows_up_still_starts_the_cooldown(conn, monkeypatch):
    def _explode(*_args, **_kwargs):
        raise RuntimeError("boom")

    monkeypatch.setattr(crew_gardener, "run_once", _explode)
    monkeypatch.setattr("crew.orchestrator.profile_scope", lambda bot_id: _nullcontext())

    assert crew_gardener.tick(conn) == 0
    [row] = conn.execute("SELECT gardened_at FROM bots WHERE id = 'scout'").fetchall()
    assert row["gardened_at"] > 0


def test_turning_it_off_stops_the_sweep(conn, monkeypatch):
    monkeypatch.setattr(
        crew_gardener, "settings",
        lambda: {"enabled": False, "pressure": 0.75, "min_entries": 8},
    )
    assert crew_gardener.tick(conn) == 0
    [row] = conn.execute("SELECT gardened_at FROM bots WHERE id = 'scout'").fetchall()
    assert row["gardened_at"] == 0, "a disabled sweep does not touch anybody's cooldown"


def _nullcontext():
    import contextlib

    return contextlib.nullcontext()


# ---------------------------------------------------------------------------
# One pass, end to end
# ---------------------------------------------------------------------------


def _run_with(monkeypatch, conn, store, plan):
    monkeypatch.setattr("tools.memory_tool.load_on_disk_store", lambda: store)
    monkeypatch.setattr(crew_gardener, "plan", lambda entries: plan)
    monkeypatch.setattr(crew_gardener, "snapshot", lambda s: "/tmp/backup.md")
    return crew_gardener.run_once(conn, "scout", now_ms=crew_db.now_ms())


def test_a_pass_merges_posts_and_asks(conn, monkeypatch):
    store = _FakeStore(_full(count=10, size=200), limit=2200)
    outcome = _run_with(monkeypatch, conn, store, {
        "overlapping": [{"indexes": [0, 1], "merged": "merged rule"}],
        "conflicting": [{"indexes": [2, 3], "why": "they disagree"}],
    })

    assert outcome["merged"] == 1
    assert outcome["questions"] == 1
    assert len(store.batches) == 1

    chips = [m for m in crew_db.list_messages(conn, "dm:scout") if m["kind"] == "memory_updated"]
    assert len(chips) == 2
    assert any((c["payload"] or {}).get("proposal") for c in chips)


def test_a_rejected_batch_leaves_everything_alone(conn, monkeypatch):
    """**`apply_batch` is atomic and validates against the final budget**, so a
    rejection means nothing was written — most likely the merged text still did
    not fit. Reporting success then would tell the operator their rules were
    tidied when they were not.
    """
    store = _FakeStore(_full(count=10, size=200), limit=2200)
    store.batch_result = {"success": False, "error": "would exceed the limit"}
    outcome = _run_with(monkeypatch, conn, store, {
        "overlapping": [{"indexes": [0, 1], "merged": "merged rule"}],
    })

    assert outcome["skipped"] == "batch rejected"
    assert [m for m in crew_db.list_messages(conn, "dm:scout") if m["kind"] == "memory_updated"] == []


def test_no_plan_means_no_write_and_no_chip(conn, monkeypatch):
    store = _FakeStore(_full(count=10, size=200), limit=2200)
    outcome = _run_with(monkeypatch, conn, store, {})

    assert outcome["skipped"] == "no plan"
    assert store.batches == []
    assert crew_db.list_messages(conn, "dm:scout") == []


def test_a_store_with_room_never_reaches_the_model(conn, monkeypatch):
    """The cheapest possible outcome, asserted directly: a teammate that does
    not need tidying costs nothing at all."""
    store = _FakeStore(_full(count=10, size=10), limit=2200)
    monkeypatch.setattr("tools.memory_tool.load_on_disk_store", lambda: store)

    def _must_not_run(_entries):
        raise AssertionError("the gardener asked a model about an unpressured store")

    monkeypatch.setattr(crew_gardener, "plan", _must_not_run)
    assert crew_gardener.run_once(conn, "scout", now_ms=crew_db.now_ms())["skipped"]
