"""Hermes Crew — putting back one thing a teammate did.

conch-agent's `ActivityEffect.undo` "names the change set that puts it back,
**when one does**". That last clause is the design, and most of these tests are
about it: the value of an undo button is destroyed by one that cannot honour
itself, because it turns "I can't fix this" into "I thought I had fixed this".

So the tests come in pairs. For each thing that really can be put back, a round
trip proving it actually is. For each thing that cannot, a test that we offer
nothing — above all `edit_space_page`, which is the one an operator would most
want and the one we cannot honestly give, because `pages.revision` is an
optimistic-concurrency token and nothing stores the body as it was.
"""

from __future__ import annotations

import importlib.util
import json
import sys
from pathlib import Path

import pytest

_PLUGIN_ROOT = Path(__file__).resolve().parents[2] / "plugins" / "hermes-crew"
if str(_PLUGIN_ROOT) not in sys.path:
    sys.path.insert(0, str(_PLUGIN_ROOT))

from crew import db as crew_db  # noqa: E402
from crew import effects  # noqa: E402
from crew import pages as crew_pages  # noqa: E402
from crew import routines as crew_routines  # noqa: E402
from crew import undo as crew_undo  # noqa: E402


@pytest.fixture()
def home(tmp_path, monkeypatch):
    monkeypatch.setenv("HERMES_CREW_DB", str(tmp_path / "crew.db"))
    monkeypatch.setenv("HERMES_CREW_HOME", str(tmp_path))
    crew_db.close_all()
    conn = crew_db.connect()
    crew_db.upsert_bot(conn, bot_id="scout", name="Scout", role="Scout's job")
    yield conn
    crew_db.close_all()


@pytest.fixture()
def api():
    name = "_crew_plugin_api_undo"
    spec = importlib.util.spec_from_file_location(
        name, _PLUGIN_ROOT / "dashboard" / "plugin_api.py"
    )
    assert spec and spec.loader
    module = importlib.util.module_from_spec(spec)
    sys.modules[name] = module
    try:
        spec.loader.exec_module(module)
    except Exception:
        sys.modules.pop(name, None)
        raise
    yield module
    sys.modules.pop(name, None)


def _record(conn, tool, args, result, *, turn_id="t1"):
    """Record what the hook would have recorded, and hand back the row."""
    effect = effects.effect_from_call(tool, args, result)
    assert effect is not None, tool
    effects.record(
        conn, turn_id=turn_id, thread_id="dm:scout", bot_id="scout", effect=effect,
    )
    rows = effects.for_turn(conn, turn_id)
    return rows[-1]


# ---------------------------------------------------------------------------
# The things that really can be put back
# ---------------------------------------------------------------------------


def test_a_page_a_teammate_made_can_be_removed_again(home):
    """End to end on the real objects: a real Space, a real page, the effect
    the hook would have written, and the page actually gone afterwards."""
    space = crew_pages.create_space(home, name="Launch")
    page = crew_pages.create_page(
        home, space_id=space["id"], title="Q3 pricing",
        content="draft", parent_id=None, created_by="scout",
    )
    row = _record(
        home, "create_space_page", {"title": "Q3 pricing"},
        json.dumps({"id": page["id"], "space_id": space["id"], "title": "Q3 pricing"}),
    )
    assert row["undoable"] is True

    result = crew_undo.apply(home, row["id"])
    assert result["ok"] is True

    with pytest.raises(crew_pages.PageError):
        crew_pages.get_page(home, space_id=space["id"], page_id=page["id"])


def test_a_routine_a_teammate_scheduled_can_be_cancelled(home, tmp_path, monkeypatch):
    """The routine lives in the teammate's own profile, so the inverse has to
    run there — which is why `crew.undo` takes `bot_id` off the effect row
    rather than trusting the undo payload to carry it."""
    # Two real profiles, resolved *by bot_id*. A single-profile stub would let
    # `crew.undo` pass the wrong teammate — or an empty string — and still
    # delete the right job, so the test would pass with the lookup broken.
    made = {}
    for bot_id in ("scout", "scribe"):
        profile = tmp_path / "profiles" / bot_id
        (profile / "cron").mkdir(parents=True)
        made[bot_id] = profile
    monkeypatch.setattr(crew_routines.roster, "profile_dir", lambda bot_id: made[bot_id])
    monkeypatch.setattr(
        "crew.orchestrator.has_computer", lambda bot_id: False, raising=False
    )

    routine = crew_routines.create_routine(
        bot_id="scout", name="Morning digest", schedule="every 30m",
        instructions="Summarise the inbox.",
    )
    assert crew_routines.list_routines("scout"), "the routine has to exist first"

    row = _record(
        home, "create_routine",
        {"name": "Morning digest", "cron": "every 30m"},
        json.dumps({"created": True, **routine}),
    )
    assert row["undoable"] is True

    crew_undo.apply(home, row["id"])
    assert crew_routines.list_routines("scout") == []


def test_undoing_is_on_the_record_under_the_operators_name(home):
    """An undo is itself an action on the world. Without this row, "who
    removed that page" has no answer: the effects ledger says the teammate
    created it and nothing says who took it away."""
    from crew import audit as crew_audit

    space = crew_pages.create_space(home, name="Launch")
    page = crew_pages.create_page(
        home, space_id=space["id"], title="Notes", content="",
        parent_id=None, created_by="scout",
    )
    row = _record(
        home, "create_space_page", {"title": "Notes"},
        json.dumps({"id": page["id"], "space_id": space["id"], "title": "Notes"}),
    )
    crew_undo.apply(home, row["id"])

    audited = [
        dict(r) for r in home.execute(
            "SELECT * FROM audit WHERE event_type='effect.undone'"
        )
    ]
    assert len(audited) == 1
    assert audited[0]["actor"] == crew_audit.ACTOR_OPERATOR
    assert "Notes" in audited[0]["subject"]


# ---------------------------------------------------------------------------
# The things we will not pretend to put back
# ---------------------------------------------------------------------------


def test_an_edited_page_offers_no_undo(home):
    """**The one an operator would most want, and the one we cannot honestly
    give.** Putting a page back needs the body as it was; `pages.revision` is a
    concurrency token, not a changelog, and nothing stores it. An undo built
    from the page's current previous state would restore whatever was there
    last — after the operator's own edit, that is the teammate's text. The
    button would do the opposite of what it says."""
    row = _record(
        home, "edit_space_page", {"id": "p1", "expected_revision": 2},
        json.dumps({"id": "p1", "space_id": "s1", "title": "Q3 pricing", "revision": 3}),
    )
    assert row["undo"] is None
    assert row["undoable"] is False


def test_sends_and_file_writes_and_shell_offer_no_undo(home):
    """Nothing here can be put back, and each would be a different flavour of
    lie: an email is already read, a file's prior content is not stored, and a
    shell command's side effects were never inventoried."""
    for tool, args, result in (
        ("send_email", {"to": "dana@henley.example"}, "{}"),
        ("write_file", {"path": "/workspace/a.md"}, "{}"),
        ("terminal", {"command": "git push"}, "{}"),
        ("save_memory_rule", {"rule": "always cc dana"}, "{}"),
        ("message_bot", {"to": "ana"}, "{}"),
    ):
        row = _record(home, tool, args, result)
        assert row["undo"] is None, tool
        assert row["undoable"] is False, tool


def test_a_change_with_no_inverse_is_refused_rather_than_half_run(home):
    row = _record(home, "write_file", {"path": "/workspace/a.md"}, "{}")
    with pytest.raises(crew_undo.UndoError) as caught:
        crew_undo.apply(home, row["id"])
    assert caught.value.status == 409


def test_an_op_nobody_implemented_is_refused_not_guessed_at(home):
    """The dispatch table is closed on purpose: this is the one place in the
    plugin that deletes things."""
    effects.record(
        home, turn_id="t9", thread_id="dm:scout", bot_id="scout",
        effect={"kind": "other", "text": "Did a thing", "target": "",
                "undo": {"op": "unmake_the_universe"}},
    )
    row = effects.for_turn(home, "t9")[-1]
    with pytest.raises(crew_undo.UndoError):
        crew_undo.apply(home, row["id"])


# ---------------------------------------------------------------------------
# Doing it twice, and doing it to something already gone
# ---------------------------------------------------------------------------


def test_a_page_deleted_by_hand_is_not_an_error(home):
    """The operator asked for it to not exist, and it does not exist. Making
    them interpret a failure for that is worse than saying so."""
    space = crew_pages.create_space(home, name="Launch")
    page = crew_pages.create_page(
        home, space_id=space["id"], title="Notes", content="",
        parent_id=None, created_by="scout",
    )
    row = _record(
        home, "create_space_page", {"title": "Notes"},
        json.dumps({"id": page["id"], "space_id": space["id"], "title": "Notes"}),
    )
    crew_pages.delete_page(home, space_id=space["id"], page_id=page["id"])

    result = crew_undo.apply(home, row["id"])
    assert result["ok"] is True
    assert "already gone" in result["detail"]


def test_undoing_twice_does_nothing_the_second_time(home):
    space = crew_pages.create_space(home, name="Launch")
    page = crew_pages.create_page(
        home, space_id=space["id"], title="Notes", content="",
        parent_id=None, created_by="scout",
    )
    row = _record(
        home, "create_space_page", {"title": "Notes"},
        json.dumps({"id": page["id"], "space_id": space["id"], "title": "Notes"}),
    )
    crew_undo.apply(home, row["id"])
    again = crew_undo.apply(home, row["id"])
    assert "already undone" in again["detail"]

    audited = home.execute(
        "SELECT COUNT(*) AS n FROM audit WHERE event_type='effect.undone'"
    ).fetchone()
    assert audited["n"] == 1, "the second click is not a second action"


def test_an_inverse_that_fails_leaves_the_button_there(home, monkeypatch):
    """Ordering, and it is the whole reason `mark_undone` runs last. Marking
    first would leave a row claiming to be undone after a failure, and the
    operator would stop being offered the one button that still needs
    pressing — the page would still be there and nothing would say so."""
    space = crew_pages.create_space(home, name="Launch")
    page = crew_pages.create_page(
        home, space_id=space["id"], title="Notes", content="",
        parent_id=None, created_by="scout",
    )
    row = _record(
        home, "create_space_page", {"title": "Notes"},
        json.dumps({"id": page["id"], "space_id": space["id"], "title": "Notes"}),
    )

    monkeypatch.setattr(
        crew_pages, "delete_page",
        lambda *a, **k: (_ for _ in ()).throw(RuntimeError("database is locked")),
    )
    with pytest.raises(RuntimeError):
        crew_undo.apply(home, row["id"])

    still = effects.for_turn(home, "t1")[-1]
    assert still["undone_at"] == 0
    assert still["undoable"] is True, "the change is still there, so the button is too"
    assert not list(home.execute("SELECT 1 FROM audit WHERE event_type='effect.undone'"))


def test_an_undone_change_stays_in_the_history(home):
    """"It created the page and I removed it again" and "it never created the
    page" are different histories, and the second one is false."""
    space = crew_pages.create_space(home, name="Launch")
    page = crew_pages.create_page(
        home, space_id=space["id"], title="Notes", content="",
        parent_id=None, created_by="scout",
    )
    row = _record(
        home, "create_space_page", {"title": "Notes"},
        json.dumps({"id": page["id"], "space_id": space["id"], "title": "Notes"}),
    )
    crew_undo.apply(home, row["id"])

    after = effects.for_turn(home, "t1")
    assert len(after) == 1
    assert "Created the page" in after[0]["text"]
    assert after[0]["undone_at"] > 0
    assert after[0]["undoable"] is False, "and the button is gone"


# ---------------------------------------------------------------------------
# Who is allowed to do it
# ---------------------------------------------------------------------------


def test_no_crew_tool_can_undo_anything(home):
    """A teammate that could erase its own trail is the exact inverse of what
    the effects ledger is for. Asserted the way `OPERATOR.md` asserts it: not
    by reading the code, but by checking nothing reachable by a model mentions
    it."""
    from crew import tools as crew_tools

    names = [name for name, _schema, _fn, _icon in crew_tools.CREW_TOOLS]
    assert not any("undo" in name for name in names)
    for _name, schema, _fn, _icon in crew_tools.CREW_TOOLS:
        assert "undo" not in str(schema).lower()


def test_the_route_maps_a_refusal_to_its_status(home, api):
    from fastapi import HTTPException

    row = _record(home, "write_file", {"path": "/workspace/a.md"}, "{}")
    with pytest.raises(HTTPException) as caught:
        api.undo_effect(row["id"])
    assert caught.value.status_code == 409

    with pytest.raises(HTTPException) as missing:
        api.undo_effect("no-such-effect")
    assert missing.value.status_code == 404


def test_the_route_lists_a_turns_changes(home, api):
    _record(home, "write_file", {"path": "/workspace/a.md"}, "{}")
    _record(home, "terminal", {"command": "git push"}, "{}")
    listed = api.get_turn_effects("t1")["effects"]
    assert [row["kind"] for row in listed] == ["file", "push"]
