"""Hermes Crew — the one thing every teammate should not have to be told twice.

A teammate has a soul and a memory of its own. What was missing is the half
that belongs to nobody in particular: who the operator is and what they are
trying to get done. Without it, "the Q3 launch" and "Dana" have to be explained
to every teammate separately, and one hired next week starts from nothing.

The idea is LifeOS' TELOS. Most of these tests are about the two ways a shared
context file goes wrong: it gets silently ignored, or it gets silently
truncated — and in both cases the operator believes the crew is reading
something it is not.
"""

from __future__ import annotations

import importlib.util
import sys
from pathlib import Path

import pytest

_PLUGIN_ROOT = Path(__file__).resolve().parents[2] / "plugins" / "hermes-crew"
if str(_PLUGIN_ROOT) not in sys.path:
    sys.path.insert(0, str(_PLUGIN_ROOT))

from crew import db as crew_db  # noqa: E402
from crew import operator as crew_operator  # noqa: E402
from crew import orchestrator  # noqa: E402
from crew import prompts  # noqa: E402

FILLED = """\
# About your operator

## Who I am

Jordan, ops lead at Henley. Europe/Berlin, and I stop reading at 18:00.

## What I'm trying to get done

The Q3 launch — ships on the 14th. Pricing is still open.

## People and accounts that come up

Dana runs support. jordan@henley.example is the real inbox.
"""


@pytest.fixture()
def home(tmp_path, monkeypatch):
    monkeypatch.setenv("HERMES_CREW_DB", str(tmp_path / "crew.db"))
    monkeypatch.setenv("HERMES_CREW_HOME", str(tmp_path))
    crew_db.close_all()
    conn = crew_db.connect()
    crew_db.upsert_bot(conn, bot_id="scout", name="Scout", role="Scout's job")
    yield tmp_path
    crew_db.close_all()


@pytest.fixture()
def api():
    name = "_crew_plugin_api_operator"
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


# ---------------------------------------------------------------------------
# Reaching the teammates
# ---------------------------------------------------------------------------


def test_the_whole_crew_reads_one_file(home):
    crew_operator.write(FILLED)
    block = crew_operator.prompt_block()
    assert block is not None
    assert "Q3 launch" in block and "Dana" in block

    # …and it is in the prompt every teammate is built with.
    built = prompts.build_crew_prompt(bot_name="Scout", operator_context=block)
    assert "About your operator" in built
    assert "Europe/Berlin" in built
    assert orchestrator._operator_context() == block


def test_a_teammate_with_no_operator_file_gets_no_block(home):
    """A crew that has not been told anything should not carry an empty
    heading on every turn of every teammate."""
    assert crew_operator.prompt_block() is None
    assert "About your operator" not in prompts.build_crew_prompt(bot_name="Scout")


def test_the_operators_own_words_are_not_fenced(home):
    """Everything else a teammate reads arrives quoted — a colleague's handoff,
    a Space page, a web page — because somebody else wrote it. This one *is*
    the operator, and they are the single voice a teammate takes instructions
    from. Fencing it would teach the teammate to discount the one source it
    should trust."""
    crew_operator.write(FILLED)
    block = crew_operator.prompt_block()
    assert prompts._FENCE_OPEN not in block
    assert prompts._DOC_FENCE_OPEN not in block
    assert "not instructions for you" not in block


# ---------------------------------------------------------------------------
# The two silent failures
# ---------------------------------------------------------------------------


def test_an_untouched_template_is_not_sent(home):
    """The template is questions, not content. Shipping a page of commented-out
    prompts to every teammate on every turn would cost money to say nothing."""
    path = crew_operator.ensure_template()
    assert path.is_file()
    assert crew_operator.read() == ""
    assert crew_operator.prompt_block() is None

    status = crew_operator.status()
    assert status["exists"] is True
    assert status["in_use"] is False
    assert "template" in status["problem"]


def test_one_filled_section_is_enough(home):
    """…and the moment the operator actually answers something, it is in use."""
    crew_operator.ensure_template()
    path = crew_operator.operator_file()
    path.write_text(
        crew_operator.TEMPLATE + "\nI am Jordan and I run ops at Henley.\n",
        encoding="utf-8",
    )
    assert crew_operator.read() != ""
    assert crew_operator.status()["in_use"] is True


def test_an_oversized_file_is_dropped_loudly_not_truncated(home, caplog):
    """**The failure LifeOS named in Hermes, applied to our own file.** A
    context file cut in the middle fails in the worst way, because nothing
    looks wrong. This one is read by the whole crew, so it is refused entirely
    and the reason is on the record."""
    path = crew_operator.operator_file()
    path.write_text("I am Jordan. " + "x" * crew_operator.MAX_CHARS, encoding="utf-8")

    with caplog.at_level("WARNING"):
        assert crew_operator.read() == ""
    assert any("over the" in r.message or "over the" in r.getMessage()
               for r in caplog.records), [r.getMessage() for r in caplog.records]

    status = crew_operator.status()
    assert status["in_use"] is False
    assert "over the" in status["problem"]
    assert str(crew_operator.MAX_CHARS) in status["problem"].replace(",", "")


def test_the_write_path_refuses_an_oversized_file_rather_than_accepting_it(home):
    """Refusing at the boundary beats accepting a file the crew will ignore —
    the operator finds out while they are still looking at the editor."""
    with pytest.raises(ValueError, match="cap"):
        crew_operator.write("x" * (crew_operator.MAX_CHARS + 1))


# ---------------------------------------------------------------------------
# Shape
# ---------------------------------------------------------------------------


def test_comments_and_headings_alone_do_not_count_as_content(home):
    assert crew_operator.meaningful("# A heading\n## Another\n") is False
    assert crew_operator.meaningful("<!-- a note\nspanning lines -->\n") is False
    assert crew_operator.meaningful("<!-- unclosed comment\n") is False
    assert crew_operator.meaningful("# Heading\n\nActual prose.\n") is True
    assert crew_operator.meaningful("<!-- hint -->\nActual prose.\n") is True


def test_no_crew_tool_can_write_it(home):
    """It is the operator's own description of themselves, and
    `save_memory_rule` already covers "remember this about how I want *you* to
    behave". Zero new model-tool footprint."""
    from crew import tools as crew_tools

    names = [name for name, _schema, _fn, _icon in crew_tools.CREW_TOOLS]
    assert not any("operator" in name for name in names)
    for _name, schema, _fn, _icon in crew_tools.CREW_TOOLS:
        assert "OPERATOR.md" not in str(schema)


def test_the_file_follows_the_install(home, monkeypatch, tmp_path):
    crew_operator.write(FILLED)
    assert crew_operator.operator_file().parent == home

    elsewhere = tmp_path / "other-root"
    elsewhere.mkdir()
    monkeypatch.setenv("HERMES_CREW_HOME", str(elsewhere))
    monkeypatch.setenv("HERMES_CREW_DB", str(elsewhere / "crew.db"))
    crew_db.close_all()
    crew_db.connect()
    assert crew_operator.read() == "", "a different install has its own operator"


# ---------------------------------------------------------------------------
# The operator's side
# ---------------------------------------------------------------------------


def test_the_route_seeds_the_template_and_reports_why_it_is_unused(home, api):
    first = api.get_operator_context()
    assert "About your operator" in first["content"]
    assert first["in_use"] is False
    assert first["problem"]

    saved = api.put_operator_context(api.OperatorContextBody(content=FILLED))
    assert saved["in_use"] is True
    assert saved["problem"] == ""
    assert api.get_operator_context()["content"] == FILLED


def test_the_route_refuses_an_oversized_save_with_a_422(home, api):
    from fastapi import HTTPException

    with pytest.raises(HTTPException) as caught:
        api.put_operator_context(
            api.OperatorContextBody(content="x" * (crew_operator.MAX_CHARS + 1))
        )
    assert caught.value.status_code == 422
    assert "cap" in caught.value.detail


def test_changing_it_is_on_the_record(home, api):
    """Not a permission change, but it changes how the whole crew behaves from
    the next turn on, and "why did they all start doing that on Tuesday" is a
    question this row answers."""
    api.put_operator_context(api.OperatorContextBody(content=FILLED))
    rows = [
        dict(r) for r in crew_db.connect().execute(
            "SELECT * FROM audit WHERE event_type='operator.context_changed'"
        )
    ]
    assert len(rows) == 1
    assert rows[0]["actor"] == "_operator"
    assert "in use" in rows[0]["detail"]
