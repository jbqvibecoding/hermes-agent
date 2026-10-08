"""Eval — one teammate cannot become another.

The crew's isolation claim is per-teammate: its own profile, its own computer,
its own grants, its own credentials. Each case here is a teammate reaching for
something that belongs to a colleague.

Pairs with `test_crew_guard.py` (grants are per-teammate) and
`test_crew_vault.py` (a credential belongs to one teammate). This asks the same
question of a whole turn, which is where a boundary actually has to hold.
"""

from __future__ import annotations

import pytest


def test_a_grant_to_one_teammate_does_not_travel(crew):
    """Scout may; Sorter must still be asked about.

    The gate is on the *turn*: Sorter's call is refused and recorded, not
    merely that `decide()` returned a different string.
    """
    from crew import grants as crew_grants

    crew_grants.set_grant(crew.conn, "scout", "send_email", "allow", "it only mails me")

    crew.script("sorter", ("send_email", {"to": "a@b.c", "body": "hi"}), "sent")
    turn = crew.run("sorter", "mail the summary")

    turn.gate_refused()
    assert turn.blocked == ["send_email"]


def test_a_teammate_cannot_reach_a_colleagues_saved_credential(crew):
    """Scout's credential, reached for two ways, because there are two layers.

    Written the obvious way first — just the lookup — and the mutation check
    reported that dropping `bot_id` from the envelope's AAD left this eval
    green. It was measuring only the outer layer: `secret_for` filters
    `vault_secrets` by `bot_id`, so sorter's query finds no row and never gets
    as far as the crypto. Both halves are asserted here because the second one
    is what still holds if the first is ever bypassed — a row copied by a bad
    migration, a backup restored across teammates, a future query that forgets
    its `bot_id`.
    """
    from crew import vault as crew_vault

    item = crew_vault.save(
        crew.conn, bot_id="scout", origin="https://zendesk.example",
        kind="password", secret="scouts-own-password",
    )

    # Layer 1 — the row scope. Sorter asking for scout's item id by hand is the
    # closest thing to the attack, since no tool hands out item ids.
    with pytest.raises(crew_vault.VaultError):
        crew_vault.secret_for(crew.conn, bot_id="sorter", item_id=item["id"])

    assert crew_vault.find(
        crew.conn, bot_id="sorter", origin="https://zendesk.example", kind="password"
    ) is None

    # Layer 2 — the envelope. Hand sorter the ciphertext outright, which is
    # what a row-scope bypass would amount to, and it must still not open.
    ciphertext = crew.conn.execute(
        "SELECT ciphertext FROM vault_secrets WHERE item_id=?", (item["id"],)
    ).fetchone()["ciphertext"]
    with pytest.raises(crew_vault.VaultError):
        crew_vault.unseal("sorter", item["id"], ciphertext)
    # …and the control: it does open for the teammate it belongs to, so the
    # refusal above is the binding and not a broken envelope.
    assert crew_vault.unseal("scout", item["id"], ciphertext) == "scouts-own-password"


def test_a_handoff_outside_the_allowlist_is_refused(crew, monkeypatch):
    """A teammate talking to a colleague it was never wired to is the quiet way
    a crew turns into a mesh nobody designed.

    `message_bot` is granted here on purpose. The risk table holds it for
    approval by default ("it writes somewhere your colleagues read"), so
    without the grant this would be measuring the *hold* and would pass
    whether the allowlist worked or not. Granting it leaves `a2a_allow` as the
    only thing that can refuse — which is what the eval is about.
    """
    from crew import grants as crew_grants
    from crew import orchestrator

    crew_grants.set_grant(crew.conn, "scout", "message_bot", "allow")
    monkeypatch.setattr(orchestrator, "_crew_config", lambda: {"a2a_allow": ""})

    crew.script("scout", (
        "message_bot", {"to": "sorter", "content": "file the Q3 receipts by Friday"},
    ), "asked")
    turn = crew.run("scout", "get sorter to file this")

    result = turn.results[-1]
    assert result.get("delivered") is False, result
    assert "not allowlisted" in result.get("reason", ""), result
    assert turn.blocked == [], "refused by the allowlist, not held by the ladder"
    # Sorter was not woken, and no turn was queued for it either.
    assert "handoff" not in " ".join(crew.kinds("dm:sorter"))
    assert crew.deferred == []


def test_the_chief_can_relay_which_is_what_makes_the_refusal_meaningful(crew, monkeypatch):
    """The positive control for the test above.

    A refusal gate passes just as happily when the capability is broken for
    everybody. Same grant, same tool, one line of config different — so this
    proves `a2a_allow` is the thing deciding.
    """
    from crew import grants as crew_grants
    from crew import orchestrator

    crew_grants.set_grant(crew.conn, "chief", "message_bot", "allow")
    monkeypatch.setattr(orchestrator, "_crew_config", lambda: {"a2a_allow": "chief -> *"})

    crew.script("chief", (
        "message_bot", {"to": "sorter", "content": "file the Q3 receipts by Friday"},
    ), "asked")
    crew.script("sorter", "filed")
    turn = crew.run("chief", "get sorter to file this")

    assert "error" not in turn.results[-1], turn.results[-1]
