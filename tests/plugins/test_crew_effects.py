"""Hermes Crew — what a turn changed, as opposed to what it said it changed.

The turn-end report is prose the model types: `crew/report.py` checks the shape
of `✓ system → result` and nothing else. So the operator's one account of an
unattended turn was also the one source that can be wrong about it.

These tests are about the two ways a "What changed" list lies. It can claim
something that did not happen — which is why the list is derived from the tool
record and never from the report. And it can quietly omit something that did:
a tool nobody added to the table, or a write that failed. The second is the
dangerous one, because a short list with nothing to say it is short reads
exactly like an honest one.

The model is conch-agent's `ActivityEffect` (MIT).
"""

from __future__ import annotations

import sys
from pathlib import Path

import pytest

_PLUGIN_ROOT = Path(__file__).resolve().parents[2] / "plugins" / "hermes-crew"
if str(_PLUGIN_ROOT) not in sys.path:
    sys.path.insert(0, str(_PLUGIN_ROOT))

from crew import db as crew_db  # noqa: E402
from crew import effects  # noqa: E402


@pytest.fixture()
def home(tmp_path, monkeypatch):
    monkeypatch.setenv("HERMES_CREW_DB", str(tmp_path / "crew.db"))
    monkeypatch.setenv("HERMES_CREW_HOME", str(tmp_path))
    crew_db.close_all()
    conn = crew_db.connect()
    crew_db.upsert_bot(conn, bot_id="scout", name="Scout", role="Scout's job")
    yield conn
    crew_db.close_all()


@pytest.fixture(autouse=True)
def _clean_losses():
    effects.forget_losses()
    yield
    effects.forget_losses()


# ---------------------------------------------------------------------------
# What counts as a change
# ---------------------------------------------------------------------------


def test_the_crews_own_tools_read_as_plain_words(home):
    """conch's rule: the line is for a person. "Created the page “Q3 pricing”",
    not "create_space_page(title=...)"."""
    page = effects.effect_from_call(
        "create_space_page", {"title": "Q3 pricing"},
        '{"id": "p1", "space_id": "s1", "title": "Q3 pricing", "revision": 1}',
    )
    assert page["kind"] == "publish"
    assert "Q3 pricing" in page["text"]
    assert page["text"].startswith("Created the page")
    assert page["target"] == "Q3 pricing"

    routine = effects.effect_from_call(
        "create_routine", {"name": "Morning digest", "cron": "0 8 * * *"}, "{}",
    )
    assert routine["kind"] == "schedule"
    assert "Morning digest" in routine["text"] and "0 8 * * *" in routine["text"]

    handoff = effects.effect_from_call("message_bot", {"to": "ana"}, "{}")
    assert handoff["kind"] == "send" and "@ana" in handoff["text"]


def test_a_file_write_is_a_change_even_though_the_risk_table_allows_it(home):
    """**The correction that shaped this module.** `is_privileged` answers "does
    this need approval", and the risk table *allows* `write_file`/`patch`/
    `terminal` — "it stays inside this teammate's own computer". Gating effects
    on it would have dropped conch's commonest kind entirely: a teammate could
    rewrite twelve files and the turn would report nothing changed."""
    from crew import provenance

    assert provenance.is_privileged("write_file")[0] is False, (
        "if this ever becomes privileged the test below stops proving anything"
    )

    wrote = effects.effect_from_call("write_file", {"path": "/workspace/notes.md"}, "{}")
    assert wrote is not None and wrote["kind"] == "file"
    assert "/workspace/notes.md" in wrote["text"]

    edited = effects.effect_from_call("patch", {"path": "/workspace/main.py"}, "{}")
    assert edited is not None and edited["kind"] == "file"


def test_reading_and_talking_are_not_changes(home):
    """The half that keeps the list short enough to read. `message_user` is the
    report itself — the chat — and conch's effects are what happened *outside*
    it."""
    for tool, args in (
        ("read_file", {"path": "/workspace/notes.md"}),
        ("search_files", {"pattern": "TODO"}),
        ("browser_navigate", {"url": "https://example.com"}),
        ("web_extract", {"url": "https://example.com"}),
        ("read_space_page", {"id": "p1"}),
        ("list_space_pages", {}),
        ("todo", {}),
        ("message_user", {"payload": {"lines": [{"system": "x", "result": "y"}]}}),
        ("set_plan", {"steps": []}),
    ):
        assert effects.effect_from_call(tool, args, "{}") is None, tool


# ---------------------------------------------------------------------------
# Shell commands — name what can be named, guess at nothing
# ---------------------------------------------------------------------------


def test_recognisable_command_shapes_are_named(home):
    for command, kind in (
        ("git commit -m 'fix the thing'", "commit"),
        ("git push origin main", "push"),
        ("npm install left-pad", "install"),
        ("pip install httpx", "install"),
        ("rm -rf build/", "delete"),
    ):
        effect = effects.effect_from_call("terminal", {"command": command}, "{}")
        assert effect is not None, command
        assert effect["kind"] == kind, (command, effect)


def test_a_command_we_cannot_name_claims_nothing(home):
    """`echo x > file` changed a file and is reported as nothing. That is the
    deliberate trade: parsing a shell to guess produces a *wrong* line in the
    one place the operator goes to check the model's account, and the audit
    ledger still has every command in full."""
    for command in ("ls /workspace", "grep -r TODO src/", "pytest -q", "echo hi > f"):
        assert effects.effect_from_call("terminal", {"command": command}, "{}") is None


def test_a_push_outranks_the_commit_in_the_same_command(home):
    """One line per call, so the one with a reader outside this machine wins."""
    effect = effects.effect_from_call(
        "terminal", {"command": "git commit -m wip && git push"}, "{}",
    )
    assert effect["kind"] == "push"


# ---------------------------------------------------------------------------
# Drift — the failure this module cannot afford
# ---------------------------------------------------------------------------


def test_an_outward_tool_nobody_listed_still_shows_up(home):
    """A table of known tools goes stale the moment someone adds a tool. The
    risk table is consulted as the backstop, so a new tool that reaches people
    leaves a generic line rather than silence.

    The tool name is chosen to reach *only* the backstop: ``send_invoice`` was
    the obvious pick and was wrong, because `_SEND` matches `^send_` and the
    test passed with the backstop deleted. ``refund_customer`` matches none of
    the explicit patterns above and is outward solely by the risk table's
    "it moves money" rule — so this is the one call that proves the backstop
    runs.
    """
    from crew import provenance

    assert provenance.is_privileged("refund_customer")[0] is True
    for pattern in (effects._SEND, effects._FILE_WRITE):
        assert not pattern.search("refund_customer"), (
            "this name must reach the backstop, not an explicit rule"
        )

    effect = effects.effect_from_call("refund_customer", {"amount": "40"}, "{}")
    assert effect is not None, "a tool that reaches someone must leave a line"
    assert "refund_customer" in effect["text"]


def test_the_backstop_does_not_fire_for_an_inert_unknown_tool(home):
    """…and the other half: an unknown tool the risk table considers inert
    must not fill the list with noise."""
    assert effects.effect_from_call("read_widget_catalogue", {}, "{}") is None


# ---------------------------------------------------------------------------
# A row that could not be written, and one that cannot be read
# ---------------------------------------------------------------------------


def test_a_lost_write_is_visible_rather_than_absent(home):
    """**The point of the whole failure posture.** Two of three changes, with
    nothing to say so, is worse than the report this list was built to check."""
    effects.record(
        home, turn_id="t1", thread_id="dm:scout", bot_id="scout",
        effect=effects.effect_from_call("write_file", {"path": "/workspace/a.md"}, "{}"),
    )
    effects.record_loss("t1")

    rows = effects.for_turn(home, "t1")
    assert len(rows) == 2
    assert rows[0]["unrecorded"] is True
    assert "could not be recorded" in rows[0]["text"]


def test_a_loss_is_per_turn_not_a_global_switch(home):
    """One teammate's lost row must not put a warning on everybody's turns."""
    effects.record(
        home, turn_id="t2", thread_id="dm:scout", bot_id="scout",
        effect=effects.effect_from_call("write_file", {"path": "/workspace/b.md"}, "{}"),
    )
    effects.record_loss("some-other-turn")

    rows = effects.for_turn(home, "t2")
    assert len(rows) == 1 and not rows[0].get("unrecorded")


def test_a_ledger_that_cannot_be_read_is_not_an_empty_turn(home):
    class Broken:
        def execute(self, *a, **k):
            raise RuntimeError("no such table: effects")

    rows = effects.for_turn(Broken(), "t3")
    assert len(rows) == 1 and rows[0]["unrecorded"] is True


def test_effects_are_kept_in_the_order_they_happened(home):
    for path in ("a.md", "b.md", "c.md"):
        effects.record(
            home, turn_id="t4", thread_id="dm:scout", bot_id="scout",
            effect=effects.effect_from_call("write_file", {"path": path}, "{}"),
        )
    texts = [row["text"] for row in effects.for_turn(home, "t4")]
    assert texts == ["Wrote a.md", "Wrote b.md", "Wrote c.md"]


# ---------------------------------------------------------------------------
# Shape
# ---------------------------------------------------------------------------


def test_every_kind_is_one_the_renderer_knows(home):
    """Closed vocabulary, same discipline as ACTIVITY_KINDS: a tenth kind added
    without touching the component renders as nothing."""
    calls = (
        ("create_space_page", {"title": "T"}),
        ("create_routine", {"name": "R", "cron": "0 8 * * *"}),
        ("save_memory_rule", {"rule": "always cc dana"}),
        ("message_bot", {"to": "ana"}),
        ("write_file", {"path": "a.md"}),
        ("remove_file", {"path": "a.md"}),
        ("terminal", {"command": "git push"}),
        ("send_email", {"to": "ana@example.com", "subject": "hi"}),
    )
    for tool, args in calls:
        effect = effects.effect_from_call(tool, args, "{}")
        assert effect is not None, tool
        assert effect["kind"] in effects.EFFECT_KINDS, (tool, effect["kind"])


def test_a_title_with_a_newline_does_not_break_the_line_it_renders_on(home):
    effect = effects.effect_from_call(
        "create_space_page", {"title": "Q3\npricing\t  plan"}, "{}",
    )
    assert "\n" not in effect["text"] and "\t" not in effect["text"]
    assert "Q3 pricing plan" in effect["text"]


def test_text_and_target_are_clipped_to_conchs_limits(home):
    effect = effects.effect_from_call(
        "save_memory_rule", {"rule": "x" * 500}, "{}",
    )
    assert len(effect["text"]) <= effects.TEXT_LIMIT
    assert len(effect["target"]) <= effects.TARGET_LIMIT
