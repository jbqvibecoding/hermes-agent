"""Hermes Crew — who a room message is actually for.

A group round asked **everybody**, always. Naming one teammate ran four agent
turns and produced three answers nobody wanted — four models' worth of cost for
one question, and a room that people stop asking questions in.

What is pinned here is mostly about *not* addressing somebody. A router that
treats every at-sign as an address wakes teammates over a CSS `@media` rule or
an email address in a pasted stack trace, and a teammate that answers a
question nobody asked it is worse than one that misses a mention: the miss is
visible and the operator asks again, the false wake is a model run that looks
like the teammate has opinions about your stylesheet.
"""

from __future__ import annotations

import sys
from pathlib import Path

import pytest

_PLUGIN_ROOT = Path(__file__).resolve().parents[2] / "plugins" / "hermes-crew"
if str(_PLUGIN_ROOT) not in sys.path:
    sys.path.insert(0, str(_PLUGIN_ROOT))

from crew import mentions  # noqa: E402

ROOM = [
    {"id": "chief", "name": "Chief"},
    {"id": "ada", "name": "Ada Chen"},
    {"id": "scout", "name": "Scout"},
]


# ---------------------------------------------------------------------------
# What counts as an address
# ---------------------------------------------------------------------------


@pytest.mark.parametrize("text,expected", [
    ("@ada can you check the deploy?", ["ada"]),
    ("hey @ada and @scout, together please", ["ada", "scout"]),
    ("@ada @ada @ada", ["ada"]),                      # asked once, not three times
    ("thanks @scout!", ["scout"]),                    # punctuation ends the name
    ("(@scout)", ["scout"]),
    ("line one\n@scout line two", ["scout"]),
    ("@艾达 看一下", ["艾达"]),                        # a CJK display name
    ("nobody is named here", []),
    ("", []),
])
def test_what_reads_as_an_address(text, expected):
    assert mentions.find(text) == expected


@pytest.mark.parametrize("text", [
    "```css\n@media (max-width: 600px) { }\n```",
    "`@scout`",
    "the error was `connect ECONNREFUSED @scout`",
    "```\n@ada\n```",
])
def test_a_name_inside_code_addresses_nobody(text):
    """**The rule worth having.** A room where people paste things is full of
    at-signs that address nobody: stylesheets, decorators, log lines, shell
    arrays. Treating those as addresses is how a teammate gets woken by a
    paste."""
    assert mentions.find(text) == []


def test_prose_around_a_code_span_still_addresses(text=None):
    """The pair to the test above — cutting code must not cut the sentence it
    is embedded in, or one backtick anywhere would disarm the whole message."""
    assert mentions.find("`@media` is fine but @ada should look at it") == ["ada"]


@pytest.mark.parametrize("text", [
    "mail me at sam@example.com",
    "ssh deploy@prod-1 and check",
    "see user@host for the log",
    "version 1.2@beta",
])
def test_an_at_sign_inside_a_word_is_not_an_address(text):
    """An email address is not a mention. The lookbehind is what does this:
    an at-sign with a word character in front of it is part of something."""
    assert mentions.find(text) == []


# ---------------------------------------------------------------------------
# Turning a typed name into a teammate
# ---------------------------------------------------------------------------


@pytest.mark.parametrize("typed", ["@ada", "@Ada", "@ADA", "@Ada-Chen", "@adachen", "@AdaChen"])
def test_a_name_resolves_however_it_was_typed(typed):
    """Operators type a display name, not an id, and have no reason to know
    there is a difference. A mention that missed on capitalisation would read
    as the feature being broken rather than as a typo."""
    assert mentions.resolve(f"{typed} please look", ROOM) == ["ada"]


def test_a_name_nobody_has_is_dropped_not_fatal():
    """A typo should not stop the room from answering. Falling back to "the
    room" is the behaviour that was already there, so an unresolvable mention
    costs nothing that was not already being spent."""
    assert mentions.resolve("@nobody hello", ROOM) == []


def test_the_order_typed_is_the_order_kept():
    assert mentions.resolve("@scout then @ada", ROOM) == ["scout", "ada"]


def test_an_id_that_is_someone_elses_display_name_goes_to_the_id():
    """Ambiguity resolves to the id, because an id is unique and a display name
    is whatever somebody typed into the hire dialog."""
    room = [{"id": "scout", "name": "Ada"}, {"id": "ada", "name": "Ada Chen"}]
    assert mentions.resolve("@ada", room) == ["ada"]


# ---------------------------------------------------------------------------
# Who ends up speaking
# ---------------------------------------------------------------------------


def test_a_question_to_the_room_still_asks_the_room():
    """The existing behaviour, held in place. Mentions narrow a round; their
    absence must change nothing, including the chief-speaks-last ordering that
    lets the chief build a dispatch table from real reports."""
    speakers, addressed = mentions.speakers_for("where are we?", ROOM, chief_id="chief")
    assert [s["id"] for s in speakers] == ["ada", "scout", "chief"]
    assert addressed is None


def test_naming_one_teammate_asks_only_that_one():
    """**The whole point.** Three turns become one."""
    speakers, addressed = mentions.speakers_for("@scout the deploy?", ROOM, chief_id="chief")
    assert [s["id"] for s in speakers] == ["scout"]
    assert addressed == ["scout"]


def test_the_chief_does_not_close_a_round_it_was_not_asked_to():
    """A dispatch table summarising a single answer that is already on screen
    is not a summary, it is a second model run saying the same thing."""
    speakers, _ = mentions.speakers_for("@ada thoughts?", ROOM, chief_id="chief")
    assert "chief" not in [s["id"] for s in speakers]


def test_the_chief_answers_when_the_chief_is_the_one_asked():
    speakers, _ = mentions.speakers_for("@chief what's the plan?", ROOM, chief_id="chief")
    assert [s["id"] for s in speakers] == ["chief"]


def test_naming_two_teammates_asks_both_in_that_order():
    speakers, addressed = mentions.speakers_for("@scout and @ada", ROOM, chief_id="chief")
    assert [s["id"] for s in speakers] == ["scout", "ada"]
    assert addressed == ["scout", "ada"]


def test_naming_somebody_who_is_not_in_this_room_asks_the_room():
    """Being mentioned is not being a member. Someone outside the thread cannot
    be pulled into it by being named, or a mention would be a back door into
    rooms a teammate was never added to."""
    speakers, addressed = mentions.speakers_for(
        "@outsider have a look", ROOM, chief_id="chief",
    )
    assert [s["id"] for s in speakers] == ["ada", "scout", "chief"]
    assert addressed is None


def test_a_mention_inside_a_code_block_does_not_narrow_the_round():
    """The parsing rule and the routing rule are the same rule, checked at the
    level that matters: pasting a stylesheet into a room must not silently turn
    a question to everyone into a question to nobody's stylesheet."""
    speakers, addressed = mentions.speakers_for(
        "what do we do about\n```css\n@media print { }\n```", ROOM, chief_id="chief",
    )
    assert [s["id"] for s in speakers] == ["ada", "scout", "chief"]
    assert addressed is None
