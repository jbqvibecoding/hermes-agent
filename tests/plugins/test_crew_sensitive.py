"""Hermes Crew — the crew's own control plane is not a file a teammate reads.

Two halves, and the second matters as much as the first. LifeOS' own guard
suite says it best: *a guard that blocks the thing the mount exists for is a
failed guard, not a safe one.* Its blanket `*.claude*` glob denied every
command naming the LifeOS tree — which was every skill CLI — so it looked like
ordinary hardening while removing the only way to do useful work.

So: DENY the credential surface and this crew's control plane, ALLOW everything
a teammate's day is made of.

The finding that motivated this file: `agent/file_safety.py` blocks reads of
`.env` and `auth.json`, and says of itself "This is NOT a security boundary —
the terminal tool can still bypass". Checked against our own state, it left
`crew-vault.key` and `crew.db` readable by `read_file`, which the risk table
*allows* ("it stays inside this teammate's own computer"). The vault's whole
claim is that a teammate never holds a credential.
"""

from __future__ import annotations

import sys
from pathlib import Path

import pytest

_PLUGIN_ROOT = Path(__file__).resolve().parents[2] / "plugins" / "hermes-crew"
if str(_PLUGIN_ROOT) not in sys.path:
    sys.path.insert(0, str(_PLUGIN_ROOT))

from crew import db as crew_db  # noqa: E402
from crew import policy as crew_policy  # noqa: E402
from crew import sensitive  # noqa: E402


@pytest.fixture()
def home(tmp_path, monkeypatch):
    """A crew home of its own, so the computed rules point at this tmp tree."""
    monkeypatch.setenv("HERMES_CREW_DB", str(tmp_path / "crew.db"))
    monkeypatch.setenv("HERMES_CREW_HOME", str(tmp_path))
    crew_db.close_all()
    conn = crew_db.connect()
    crew_db.upsert_bot(conn, bot_id="scout", name="Scout", role="Scout's job")
    yield tmp_path
    crew_db.close_all()


# ---------------------------------------------------------------------------
# DENY — the crew's own control plane
# ---------------------------------------------------------------------------


def test_the_vault_key_is_not_readable_by_the_teammate_it_protects(home):
    """**The finding.** The vault fills a password into a page so the teammate
    never sees it. The key that decrypts every one of them was a `read_file`
    away, and `read_file` is allowed by default."""
    assert sensitive.check_path(home / "crew-vault.key") is not None
    verdict = crew_policy.evaluate(
        crew_db.connect(), "scout", "read_file",
        {"path": str(home / "crew-vault.key")}, classify=False,
    )
    assert verdict.mode == "deny"
    assert verdict.source == "sensitive"
    assert "not with a grant" in verdict.why


def test_crew_db_is_not_readable_or_writable(home):
    """It holds the grant table — a teammate that can write it grants itself
    whatever it likes — and the vault ciphertexts the key above opens."""
    db = crew_db.crew_db_path()
    for path in (db, Path(f"{db}-wal"), Path(f"{db}-shm")):
        assert sensitive.check_path(path) is not None, path

    for tool, args in (
        ("read_file", {"path": str(db)}),
        ("write_file", {"path": str(db)}),
        ("patch", {"path": str(db)}),
        ("terminal", {"command": f'sqlite3 {db} "UPDATE grants SET mode=\'allow\'"'}),
        ("execute_code", {"code": f"import sqlite3; sqlite3.connect('{db}')"}),
    ):
        verdict = crew_policy.evaluate(crew_db.connect(), "scout", tool, args, classify=False)
        assert verdict.mode == "deny", (tool, verdict)
        assert verdict.source == "sensitive", (tool, verdict)


def test_the_guard_cannot_be_disarmed_through_its_own_control_plane(home):
    """LifeOS' insight, and it applies to us harder than to them: one write to
    the config turning the crew plugin off and the next process starts with no
    guard at all, with nothing about the session looking wrong."""
    for target in ("config.yaml", "plugins/hermes-crew/crew/policy.py", "cron/jobs.json"):
        assert sensitive.check_path(home / target) is not None, target


def test_credential_material_the_host_guard_misses(home):
    """`.env` and `auth.json` are already blocked by core. These are not."""
    fake_home = home / "fakeuser"
    for target in (
        ".ssh/id_rsa", ".ssh", ".aws/credentials", ".kube/config",
        ".gnupg/secring.gpg", ".docker/config.json", ".netrc",
        "certs/server.pem", "keys/bundle.p12", ".codex/auth.json",
    ):
        assert sensitive.check_path(fake_home / target) is not None, target


# ---------------------------------------------------------------------------
# DENY — the three spellings that walk past a naive matcher
# ---------------------------------------------------------------------------


def test_a_symlink_to_the_vault_key_is_refused(home):
    """A LifeOS install keeps `USER` as a symlink, so they hit this first. For
    us the attacker supplies the link: a teammate writes one in its own
    workspace and reads *that*."""
    real = home / "crew-vault.key"
    real.write_text("k")
    link = home / "innocent.txt"
    try:
        link.symlink_to(real)
    except (OSError, NotImplementedError):
        pytest.skip("this filesystem does not do symlinks")
    assert sensitive.check_path(link) is not None


def test_case_and_traversal_spellings_are_refused(home):
    """macOS opens `.ENV` as `.env`, so matching has to be case-insensitive;
    and `a/../b` has to normalise before anything is compared."""
    assert sensitive.check_path(home / "sub" / ".." / "crew-vault.key") is not None
    assert sensitive.check_path(str(home / "crew-vault.key").upper()) is not None
    assert sensitive.check_path(home / ".." / home.name / "crew.db") is not None


def test_a_bare_relative_credential_name_is_refused(home):
    """`read_file(".netrc")` arrives with no directory at all."""
    assert sensitive.check_path(".netrc") is not None
    assert sensitive.check_path("id_rsa") is not None


def test_a_quoted_path_inside_a_program_body_is_refused(home):
    """`execute_code` matters as much as `terminal`: two lines of Python read
    any file the process can reach."""
    reason = sensitive.check_command(
        f"print(open('{home / 'crew-vault.key'}').read())"
    )
    assert reason is not None


# ---------------------------------------------------------------------------
# ALLOW — the half that keeps this a guard rather than a wall
# ---------------------------------------------------------------------------


def test_a_teammates_own_work_is_untouched(home):
    """What a teammate's day is actually made of. If any of these were refused
    the guard would be removing the product's reason to exist."""
    for path in (
        "/workspace/notes.md",
        "/workspace/q3-review.pptx",
        "/workspace/screenshots/shot.png",
        "/workspace/src/main.py",
        "/workspace/.browser/profile/Default/Preferences",
        "/workspace/data/environment-survey.csv",
        "/workspace/report.pem.md",
    ):
        assert sensitive.check_path(path) is None, path


def test_ordinary_commands_are_untouched(home):
    """**The glob trap that cost LifeOS a cron job.** `*.env*` as a command
    glob matches `os.environ` and `process.env`: six of their guard's first
    eleven blocks were ordinary code touching no file, and their mail monitor
    died on it. A glob that fires on normal work teaches everyone to route
    around the guard."""
    for command in (
        "python -c 'import os; print(os.environ[\"PATH\"])'",
        "node -e 'console.log(process.env.NODE_ENV)'",
        "printenv | sort",
        "pytest tests/ -q",
        "git log --oneline -5",
        "ls /workspace",
        "cat /workspace/notes.md",
        "npm run build",
        "grep -r TODO /workspace/src",
    ):
        assert sensitive.check_command(command) is None, command


def test_the_crew_tree_as_a_whole_is_not_denied(home):
    """The inverse trap, which LifeOS calls the worse one: their `*.claude*`
    denied every command naming their tree, and every skill CLI lived there.
    Our teammates' skills and profiles live under the crew home, so a blanket
    rule would do the same thing to us."""
    assert sensitive.check_path(home / "skills" / "research" / "SKILL.md") is None
    assert sensitive.check_path(home / "profiles" / "scout" / "SOUL.md") is None
    assert sensitive.check_path(home / "profiles" / "scout" / "memories" / "MEMORY.md") is None
    assert sensitive.check_command(f"ls {home / 'skills'}") is None


def test_a_tool_with_no_path_argument_is_not_inspected(home):
    """The crew's own tools carry payloads, not paths. `message_user` holding
    the word "credentials" is a report, not a credential read."""
    verdict = crew_policy.evaluate(
        crew_db.connect(), "scout", "message_user",
        {"payload": {"lines": [{"system": "vault", "result": "2 credentials saved"}]}},
        classify=False,
    )
    assert verdict.source != "sensitive"


# ---------------------------------------------------------------------------
# Shape
# ---------------------------------------------------------------------------


def test_the_rules_follow_the_install_rather_than_a_hardcoded_home(home, monkeypatch, tmp_path):
    """Computed from `crew_home()` at call time, so they are right under a
    profile and under `HERMES_CREW_HOME` — where a `**/.hermes/**` glob would
    either miss everything or match everything."""
    assert sensitive.check_path(home / "crew-vault.key") is not None

    elsewhere = tmp_path / "another-root"
    elsewhere.mkdir()
    monkeypatch.setenv("HERMES_CREW_HOME", str(elsewhere))
    monkeypatch.setenv("HERMES_CREW_DB", str(elsewhere / "crew.db"))
    crew_db.close_all()
    crew_db.connect()

    assert sensitive.check_path(elsewhere / "crew-vault.key") is not None
    assert sensitive.check_path(home / "crew-vault.key") is None, (
        "the old root is not this install's control plane any more"
    )


def test_a_broken_guard_refuses_path_tools_and_leaves_the_rest_alone(home, monkeypatch):
    """Fail closed, but not catastrophically: a guard that errored should stop
    file access, not end the conversation."""
    def boom(tool, args):
        raise RuntimeError("policy unreadable")

    monkeypatch.setattr(sensitive, "evaluate", boom)

    blocked = crew_policy.evaluate(
        crew_db.connect(), "scout", "read_file", {"path": "/workspace/x.md"}, classify=False
    )
    assert blocked.mode == "deny" and blocked.source == "sensitive"

    # A tool that cannot reach a path is unaffected.
    other = crew_policy.evaluate(crew_db.connect(), "scout", "todo", {}, classify=False)
    assert other.source != "sensitive"


def test_the_never_list_still_outranks_this_floor(home, monkeypatch):
    """Ordering: the operator's own words keep their clearer message."""
    from crew import orchestrator

    monkeypatch.setattr(
        orchestrator, "_crew_config", lambda: {"a2a_allow": "", "never": ["crew-vault.key"]},
    )
    verdict = crew_policy.evaluate(
        crew_db.connect(), "scout", "read_file",
        {"path": str(home / "crew-vault.key")}, classify=False,
    )
    assert verdict.source == "floor", verdict
