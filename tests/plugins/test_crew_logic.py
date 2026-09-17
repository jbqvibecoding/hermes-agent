"""Hermes Crew — the invariants the ported product logic has to keep.

These cover the pure layer (report grammar, handoff allowlist, approval
idempotency, org-chart normalisation, schedule humanising, the screenshot
traversal guard) plus the crew DB. They import nothing that needs a model, a
container, or a network, so they run in the default ``pytest -m 'not
integration'`` sweep.

Each test names the behaviour it protects rather than the function it calls:
the risk in a port is not that a function disappears, it is that a rule quietly
stops being enforced.
"""

from __future__ import annotations

import sys
from pathlib import Path

import pytest

_PLUGIN_ROOT = Path(__file__).resolve().parents[2] / "plugins" / "hermes-crew"
if str(_PLUGIN_ROOT) not in sys.path:
    sys.path.insert(0, str(_PLUGIN_ROOT))

from crew import db as crew_db  # noqa: E402
from crew.a2a import (  # noqa: E402
    MAX_HOPS,
    can_message,
    deny_reason,
    parse_a2a_allow,
)
from crew.approvals import (  # noqa: E402
    attach_approval_message,
    create_approval,
    is_thumbs_up,
    latest_pending_approval,
    resolve_approval,
)
from crew.report import render_report_text, validate_report_payload  # noqa: E402
from crew.schedule import describe_schedule, is_valid_schedule  # noqa: E402
from crew.sections import (  # noqa: E402
    Section,
    load_sections,
    save_sections,
    sections_from_payload,
    with_unassigned,
)


@pytest.fixture()
def conn(tmp_path, monkeypatch):
    """A throwaway crew.db, pinned away from the developer's real root."""
    monkeypatch.setenv("HERMES_CREW_DB", str(tmp_path / "crew.db"))
    crew_db.close_all()
    connection = crew_db.connect()
    yield connection
    crew_db.close_all()


# ---------------------------------------------------------------------------
# Report grammar
# ---------------------------------------------------------------------------


def test_report_normalises_a_well_formed_payload():
    payload = validate_report_payload(
        {
            "lines": [
                {"system": " Salesforce ", "result": " list pulled ", "count": " 52 accounts "},
                {"system": "Gmail", "result": "triaged", "count": "   "},
            ],
            "closing": "  two things need you today  ",
        }
    )
    assert payload == {
        "lines": [
            {"system": "Salesforce", "result": "list pulled", "count": "52 accounts"},
            {"system": "Gmail", "result": "triaged"},
        ],
        "closing": "two things need you today",
    }


@pytest.mark.parametrize(
    "bad",
    [
        None,
        "a report",
        {},
        {"lines": []},
        {"lines": "nope"},
        {"lines": [{"system": "", "result": "y"}]},
        {"lines": [{"system": "a", "result": "   "}]},
        {"lines": [{"system": "a"}]},
        {"lines": [{"system": "a", "result": "b", "count": 52}]},
        {"lines": ["not an object"]},
    ],
)
def test_report_rejects_anything_malformed(bad):
    """A sloppy payload must be refused so the model retries.

    Rendering a half-empty chip instead would teach it the grammar is optional,
    and the grammar is the product.
    """
    assert validate_report_payload(bad) is None


def test_report_renders_the_canonical_line_shape():
    payload = validate_report_payload(
        {"lines": [{"system": "Salesforce", "result": "list pulled", "count": "52 accounts"}],
         "closing": "nothing needs you"}
    )
    assert render_report_text(payload) == "✓ Salesforce → list pulled · 52 accounts\nnothing needs you"


# ---------------------------------------------------------------------------
# Handoffs
# ---------------------------------------------------------------------------


def test_chief_is_a_hub_and_peers_are_off_by_default():
    rules = parse_a2a_allow("", "chief")
    assert can_message(rules, "chief", "researcher")
    assert can_message(rules, "researcher", "chief")
    assert not can_message(rules, "researcher", "market-watch")


def test_allowlist_is_directed():
    rules = parse_a2a_allow("researcher>market-watch", "chief")
    assert can_message(rules, "researcher", "market-watch")
    assert not can_message(rules, "market-watch", "researcher")


def test_a_teammate_cannot_message_itself():
    rules = parse_a2a_allow("chief>chief", "chief")
    assert not can_message(rules, "chief", "chief")


def test_malformed_allowlist_entries_are_dropped_not_raised():
    """A config typo must narrow what is permitted, never crash a turn."""
    rules = parse_a2a_allow("a>b, garbage, >x, y>, ,c>d", "chief")
    assert rules.pairs == (("a", "b"), ("c", "d"))


def test_deny_reason_names_the_fallback_route():
    rules = parse_a2a_allow("", "chief")
    assert "chief" in deny_reason(rules, "researcher", "market-watch")
    assert deny_reason(rules, "a", "a") == "You cannot message yourself."


def test_hop_cap_is_two():
    """One dispatch plus one reply. The third hop is an echo."""
    assert MAX_HOPS == 2


# ---------------------------------------------------------------------------
# Approvals
# ---------------------------------------------------------------------------


def test_an_approval_can_only_be_decided_once(conn):
    """The guard that stops a double-clicked Approve sending twice."""
    approval = create_approval(
        conn, thread_id="dm:scout", bot_id="scout", action="send the 4 drafts"
    )
    first = resolve_approval(conn, approval["id"], "approve")
    second = resolve_approval(conn, approval["id"], "approve")
    assert first is not None and first["status"] == "approved"
    assert second is None


def test_discarding_after_approving_is_also_refused(conn):
    approval = create_approval(conn, thread_id="dm:scout", bot_id="scout", action="publish")
    assert resolve_approval(conn, approval["id"], "approve") is not None
    assert resolve_approval(conn, approval["id"], "discard") is None


def test_latest_pending_is_the_one_a_thumbs_up_releases(conn):
    create_approval(conn, thread_id="dm:scout", bot_id="scout", action="first")
    second = create_approval(conn, thread_id="dm:scout", bot_id="scout", action="second")
    assert latest_pending_approval(conn, "dm:scout")["id"] == second["id"]
    resolve_approval(conn, second["id"], "approve")
    assert latest_pending_approval(conn, "dm:scout")["action"] == "first"


def test_resolved_approvals_are_not_pending(conn):
    approval = create_approval(conn, thread_id="dm:scout", bot_id="scout", action="x")
    resolve_approval(conn, approval["id"], "discard")
    assert latest_pending_approval(conn, "dm:scout") is None


def test_the_chip_is_linked_back_to_the_approval(conn):
    approval = create_approval(conn, thread_id="dm:scout", bot_id="scout", action="x")
    chip = crew_db.insert_message(
        conn, thread_id="dm:scout", sender="scout", kind="approval_request", payload={}
    )
    attach_approval_message(conn, approval["id"], chip["id"])
    from crew.approvals import get_approval

    assert get_approval(conn, approval["id"])["message_id"] == chip["id"]


@pytest.mark.parametrize("text", ["👍", "  👍  ", "👍🏽", "👍️"])
def test_a_bare_thumbs_up_releases(text):
    """Skin tone, variation selectors and whitespace must not defeat it."""
    assert is_thumbs_up(text)


@pytest.mark.parametrize("text", ["👍 do it", "👎", "", "ok 👍", "👍👍"])
def test_anything_more_than_a_thumbs_up_is_a_message(text):
    assert not is_thumbs_up(text)


# ---------------------------------------------------------------------------
# Sections (the org chart)
# ---------------------------------------------------------------------------


def test_a_teammate_lands_in_exactly_one_section(conn):
    for bot_id in ("chief", "scout", "sorter"):
        crew_db.upsert_bot(conn, bot_id=bot_id, name=bot_id.title())
    saved = save_sections(
        conn,
        sections_from_payload(
            [
                {"id": "ops", "name": "Ops", "bot_ids": ["scout", "sorter"]},
                {"id": "research", "name": "Research", "bot_ids": ["scout"]},
            ]
        ),
    )
    placements = {s.id: list(s.bot_ids) for s in saved}
    assert placements["ops"] == ["scout", "sorter"]
    assert placements["research"] == []


def test_the_unassigned_bucket_cannot_be_hijacked(conn):
    crew_db.upsert_bot(conn, bot_id="chief", name="Chief")
    saved = save_sections(
        conn,
        sections_from_payload(
            [
                {"id": "ops", "name": "Ops", "bot_ids": []},
                {"id": "__agents__", "name": "Mine", "bot_ids": ["chief"]},
            ]
        ),
    )
    bucket = [s for s in saved if s.id == "__agents__"][0]
    assert bucket.name == "Unassigned"
    assert bucket.bot_ids == ()


def test_unfiled_teammates_show_up_without_touching_the_layout(conn):
    for bot_id in ("chief", "scout"):
        crew_db.upsert_bot(conn, bot_id=bot_id, name=bot_id.title())
    save_sections(conn, sections_from_payload([{"id": "ops", "name": "Ops", "bot_ids": ["scout"]}]))
    rendered = with_unassigned(load_sections(conn), ["chief", "scout"])
    bucket = [s for s in rendered if s.id == "__agents__"][0]
    assert bucket.bot_ids == ("chief",)


def test_collapsed_state_survives_a_relayout(conn):
    crew_db.upsert_bot(conn, bot_id="scout", name="Scout")
    save_sections(
        conn,
        [Section(id="ops", name="Ops", bot_ids=("scout",), collapsed=True)],
    )
    # Rename the section; the operator's fold must not silently spring open.
    saved = save_sections(conn, sections_from_payload([{"id": "ops", "name": "Operations", "bot_ids": ["scout"]}]))
    ops = [s for s in saved if s.id == "ops"][0]
    assert ops.name == "Operations"
    assert ops.collapsed is True


def test_a_malformed_layout_payload_is_ignored_entry_by_entry():
    parsed = sections_from_payload(
        ["not a dict", {"no_id": 1}, {"id": "ops", "bot_ids": ["a", 5, "b"]}]
    )
    assert [s.id for s in parsed] == ["ops"]
    assert parsed[0].bot_ids == ("a", "b")


# ---------------------------------------------------------------------------
# Schedules
# ---------------------------------------------------------------------------


@pytest.mark.parametrize(
    "expression,expected",
    [
        ("0 9 * * *", "Every day at 9:00 AM"),
        ("0 9 * * 1", "Every Monday at 9:00 AM"),
        ("0 9 * * 1-5", "Weekdays at 9:00 AM"),
        ("0 9 * * 0,6", "Weekends at 9:00 AM"),
        ("*/5 * * * *", "Every 5 minutes"),
        ("* * * * *", "Every minute"),
        ("0 */4 * * *", "Every 4 hours"),
        ("0 0 1 * *", "On the 1st of every month at 12:00 AM"),
        ("@daily", "Every day at 12:00 AM"),
        ("@every 5m", "Every 5 minutes"),
        ("every 30m", "Every 30 minutes"),
        ("CRON_TZ=Europe/Berlin 0 9 * * *", "Every day at 9:00 AM (Europe/Berlin)"),
        ("0 9-17 * * 1-5", "Every hour on weekdays, 9:00 AM – 5:00 PM"),
    ],
)
def test_schedules_read_as_english(expression, expected):
    assert describe_schedule(expression) == expected


@pytest.mark.parametrize("expression", ["nonsense", "0 9 1 * 1", "99 99 * * *", "1 2 3"])
def test_an_unrecognised_schedule_is_echoed_not_guessed(expression):
    """A wrong sentence about when a routine fires is worse than no sentence.

    ``0 9 1 * 1`` is the interesting one: cron ORs the two day fields when both
    are restricted, and no short English sentence says that honestly.
    """
    assert describe_schedule(expression) == expression


@pytest.mark.parametrize("expression", ["0 9 * * *", "every 30m", "@every 2h", "@daily"])
def test_valid_recurring_schedules_are_accepted(expression):
    assert is_valid_schedule(expression)


@pytest.mark.parametrize("expression", ["", "   ", "nonsense", "2026-01-01T09:00"])
def test_one_shots_and_junk_are_not_routines(expression):
    """A routine is recurring by definition; a one-shot is a different thing."""
    assert not is_valid_schedule(expression)


# ---------------------------------------------------------------------------
# The crew DB
# ---------------------------------------------------------------------------


def test_thread_ids_follow_the_wire_convention():
    assert crew_db.dm_thread_id("scout") == "dm:scout"
    assert crew_db.bot_id_of_dm("dm:scout") == "scout"
    assert crew_db.bot_id_of_dm("group:crew") is None
    assert crew_db.is_group_thread("group:crew")
    assert not crew_db.is_group_thread("dm:scout")


def test_messages_come_back_oldest_first_with_payloads_decoded(conn):
    crew_db.insert_message(conn, thread_id="dm:scout", sender="user", content="hi")
    crew_db.insert_message(
        conn,
        thread_id="dm:scout",
        sender="scout",
        kind="report",
        payload={"lines": [{"system": "X", "result": "done"}]},
    )
    rows = crew_db.list_messages(conn, "dm:scout")
    assert [r["kind"] for r in rows] == ["text", "report"]
    assert rows[1]["payload"]["lines"][0]["system"] == "X"


def test_an_unknown_chip_kind_is_refused(conn):
    """The nine kinds are a wire contract shared with the renderer."""
    with pytest.raises(ValueError):
        crew_db.insert_message(conn, thread_id="dm:scout", sender="scout", kind="invented")


def test_rewriting_a_payload_keeps_the_message_id(conn):
    """How a pending approval chip flips in place instead of a second appearing."""
    chip = crew_db.insert_message(
        conn, thread_id="dm:scout", sender="scout", kind="approval_request",
        payload={"status": "pending"},
    )
    crew_db.update_message_payload(conn, chip["id"], {"status": "approved"})
    rows = crew_db.list_messages(conn, "dm:scout")
    assert len(rows) == 1
    assert rows[0]["id"] == chip["id"]
    assert rows[0]["payload"]["status"] == "approved"


def test_the_event_tail_is_a_rowid_cursor(conn):
    """Whichever process wrote the row, the tail picks it up by id."""
    first = crew_db.insert_message(conn, thread_id="dm:scout", sender="user", content="one")
    second = crew_db.insert_message(conn, thread_id="dm:sorter", sender="user", content="two")
    assert [m["id"] for m in crew_db.messages_after(conn, 0)] == [first["id"], second["id"]]
    assert [m["id"] for m in crew_db.messages_after(conn, first["id"])] == [second["id"]]
    assert crew_db.messages_after(conn, second["id"]) == []
    assert crew_db.max_message_id(conn) == second["id"]


def test_reseeding_does_not_reshuffle_an_organised_roster(conn):
    crew_db.upsert_bot(conn, bot_id="scout", name="Scout", role="old", emoji="🔎")
    save_sections(conn, sections_from_payload([{"id": "ops", "name": "Ops", "bot_ids": ["scout"]}]))
    crew_db.upsert_bot(conn, bot_id="scout", name="Scout", role="new", emoji="🔎")
    bot = crew_db.get_bot(conn, "scout")
    assert bot["role"] == "new"
    assert bot["section_id"] == "ops"


def test_firing_a_teammate_clears_its_thread_but_not_the_others(conn):
    crew_db.upsert_bot(conn, bot_id="scout", name="Scout")
    crew_db.upsert_bot(conn, bot_id="sorter", name="Sorter")
    crew_db.ensure_dm_thread(conn, "scout")
    crew_db.insert_message(conn, thread_id="dm:scout", sender="user", content="hi")
    crew_db.insert_message(conn, thread_id="dm:sorter", sender="user", content="hi")
    create_approval(conn, thread_id="dm:scout", bot_id="scout", action="x")

    crew_db.delete_bot(conn, "scout")

    assert crew_db.get_bot(conn, "scout") is None
    assert crew_db.list_messages(conn, "dm:scout") == []
    assert latest_pending_approval(conn, "dm:scout") is None
    assert len(crew_db.list_messages(conn, "dm:sorter")) == 1


def test_group_membership_is_backfilled_not_reset(conn):
    crew_db.ensure_group_thread(conn, "group:crew", "Offsite crew", ["chief", "scout"])
    crew_db.ensure_group_thread(conn, "group:crew", "Offsite crew", ["chief", "scout", "sorter"])
    assert crew_db.thread_members(conn, "group:crew") == ["chief", "scout", "sorter"]


# ---------------------------------------------------------------------------
# Screenshot traversal guard
# ---------------------------------------------------------------------------


@pytest.mark.parametrize(
    "bot_id,filename",
    [
        ("../../..", "1.png"),
        ("..", "1.png"),
        ("scout/../..", "1.png"),
        ("scout", "../crew.db"),
        ("scout", "crew.db"),
        ("scout", "1.png.txt"),
        ("scout", "a.png"),
        ("", "1.png"),
        ("scout", ""),
    ],
)
def test_the_screenshot_route_refuses_anything_but_a_screenshot(bot_id, filename):
    """This route is reachable from a browser; a traversal here serves crew.db."""
    from crew.computer import screenshot_file_path

    assert screenshot_file_path(bot_id, filename) is None


def test_a_real_screenshot_path_resolves_inside_the_workspace():
    from crew.computer import screenshot_file_path, workspace_dir

    path = screenshot_file_path("scout", "1730000000000.png")
    assert path is not None
    assert path.is_relative_to(workspace_dir("scout"))
