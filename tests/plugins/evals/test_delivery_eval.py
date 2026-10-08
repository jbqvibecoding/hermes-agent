"""Eval — saying it is done is not doing it.

The product's claim is that a teammate's work arrives as something an operator
can open: a chip in the right shape, and a file that exists on disk. The
failure this guards is the plausible one — a turn that reports success in prose
and leaves nothing behind.

Pairs with `test_crew_delivery.py`, which tests the artifact scanner. This asks
whether a *turn* that claims a delivery produced one.
"""

from __future__ import annotations


def test_a_turn_that_reports_leaves_a_chip_in_the_thread(crew):
    crew.script("scout", (
        "message_user",
        {"payload": {
            "lines": [{"system": "inbox", "result": "cleared", "count": "18"}],
            "closing": "nothing needs you.",
        }},
    ), "done")
    turn = crew.run("scout", "clear the inbox")

    turn.gate_selected("message_user")
    turn.gate_delivered()


def test_prose_alone_is_not_a_delivery(crew):
    """The failure mode, written as a gate.

    A teammate that burns a turn and answers in prose has reported nothing the
    operator can open. The thread must not contain a report chip, and this eval
    exists so that a future change which starts *synthesising* one from the
    final answer has to argue with a test.
    """
    crew.script("scout", "I cleared the inbox, 18 items, all good.")
    turn = crew.run("scout", "clear the inbox")

    assert turn.calls == []
    assert "report" not in crew.kinds("dm:scout")


def test_a_malformed_report_is_refused_rather_than_half_rendered(crew):
    """A chip with no lines is worse than no chip: it teaches the model that
    the grammar is optional."""
    crew.script("scout", ("message_user", {"payload": {"lines": []}}), "tried")
    turn = crew.run("scout", "clear the inbox")

    turn.gate_refused()
    assert "report" not in crew.kinds("dm:scout")


def test_the_ledger_records_work_separately_from_permission(crew):
    """Two different questions — "was it allowed" and "did it run" — and an
    operator reading last week's refusals needs them apart."""
    crew.script("scout", (
        "message_user",
        {"payload": {"lines": [{"system": "inbox", "result": "cleared"}]}},
    ), "done")
    turn = crew.run("scout", "clear the inbox")

    events = [row["event_type"] for row in crew.audit()]
    assert "tool.allowed" in events or "tool.worked" in events, events
    assert "tool.refused" not in events
