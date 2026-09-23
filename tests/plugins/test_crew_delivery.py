"""Hermes Crew — a teammate does not get to say it made a file it did not make.

A model asked for a deck it cannot manage will write a paragraph describing the
deck. Not as deception: it is summarising an intention, and nothing downstream
can tell that from a summary of work that happened. The operator finds out when
they go looking for the file.

Two directions to get wrong, and they are not symmetric. Missing a false claim
costs somebody an afternoon. Raising a false one makes a working teammate argue
with itself for two turns while the operator watches — so every rule here is a
conjunction and every ambiguity resolves to letting the work through. The tests
are weighted the same way: most of them are about *not* pushing back.
"""

from __future__ import annotations

import sys
from pathlib import Path

import pytest

_PLUGIN_ROOT = Path(__file__).resolve().parents[2] / "plugins" / "hermes-crew"
if str(_PLUGIN_ROOT) not in sys.path:
    sys.path.insert(0, str(_PLUGIN_ROOT))

from crew import artifacts as crew_artifacts  # noqa: E402
from crew import db as crew_db  # noqa: E402
from crew import verify as crew_verify  # noqa: E402


@pytest.fixture()
def workspace(tmp_path, monkeypatch):
    """A teammate's workspace on disk, with the DB pointed somewhere throwaway."""
    monkeypatch.setenv("HERMES_CREW_DB", str(tmp_path / "crew.db"))
    crew_db.close_all()
    root = tmp_path / "workspace"
    root.mkdir()
    monkeypatch.setattr(
        "crew.computer.workspace_dir", lambda bot_id: root, raising=False
    )
    yield root
    crew_db.close_all()


@pytest.fixture()
def conn(workspace):
    connection = crew_db.connect()
    crew_db.upsert_bot(connection, bot_id="scout", name="Scout", role="research")
    crew_db.ensure_dm_thread(connection, "scout")
    return connection


def write(root: Path, rel: str, content: bytes = b"real content") -> Path:
    path = root / rel
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(content)
    return path


# ---------------------------------------------------------------------------
# Reading a claim out of a reply
# ---------------------------------------------------------------------------


@pytest.mark.parametrize(
    "text",
    [
        "I've saved the deck as q3-review.pptx.",
        "Written to notes.md — take a look.",
        "Created summary.docx with the four sections you asked for.",
        "Generated a chart and exported figures.xlsx.",
        "已保存到 q3-review.pptx，请查收。",
        "报告生成了 summary.docx。",
    ],
)
def test_a_reply_that_says_it_made_a_file_is_read_as_a_claim(text):
    assert crew_verify.claimed_files(text)


@pytest.mark.parametrize(
    "text",
    [
        # Offers and plans. Pushing back on these is the most annoying possible
        # false positive: the teammate is asking a question and gets told off.
        "I could put this in a report.docx if that would help.",
        "Next I'll build the deck as q3-review.pptx.",
        "I was going to write notes.md but wanted to check the format first.",
        "I was unable to produce summary.docx — the data source is down.",
        "我准备把它做成 report.docx，你看可以吗？",
        # Not deliveries at all.
        "The error was in main.py at line 40.",
        "Their pricing page is at example.com and it says 9 dollars.",
        "I read config.json and the timeout is 30s.",
        "",
    ],
)
def test_a_reply_that_is_not_claiming_delivery_is_left_alone(text):
    assert crew_verify.claimed_files(text) == []


def test_a_real_delivery_inside_a_reply_about_a_failure_still_counts():
    """Judged per sentence, not per reply. "I couldn't reach the API, so I wrote
    what I have to notes.md" is a real delivery in a message that also contains
    a failure, and reply-level judgement throws it away."""
    text = "I couldn't reach the API. I wrote what I do have to notes.md."
    assert crew_verify.claimed_files(text) == ["notes.md"]


# ---------------------------------------------------------------------------
# Checking the claim against the disk
# ---------------------------------------------------------------------------


def test_a_claim_with_the_file_behind_it_passes(workspace):
    write(workspace, "q3-review.pptx")
    verdict = crew_verify.check_delivery("scout", "Saved the deck as q3-review.pptx.")
    assert verdict.ok


def test_a_claim_with_no_file_behind_it_is_caught(workspace):
    verdict = crew_verify.check_delivery("scout", "Saved the deck as q3-review.pptx.")
    assert not verdict.ok
    assert verdict.missing == ("q3-review.pptx",)


def test_a_zero_byte_file_is_a_failed_delivery_not_a_successful_one(workspace):
    """The rule that costs the most to get wrong. A script that dies inside
    `prs.save()` leaves an empty shell; checking only existence marks that a
    success, and the operator downloads something that will not open."""
    write(workspace, "q3-review.pptx", b"")
    verdict = crew_verify.check_delivery("scout", "Saved the deck as q3-review.pptx.")
    assert not verdict.ok
    assert verdict.empty == ("q3-review.pptx",)
    assert verdict.missing == ()


def test_the_path_the_teammate_says_does_not_have_to_match_how_it_is_stored(workspace):
    """It works in the container's /workspace and may say `/workspace/deck.pptx`,
    `./deck.pptx` or `deck.pptx` for one file. A spelling difference is not a
    missing delivery."""
    write(workspace, "deck.pptx")
    for spelling in ("/workspace/deck.pptx", "./deck.pptx", "deck.pptx", "out/deck.pptx"):
        assert crew_verify.check_delivery("scout", f"Saved it to {spelling}.").ok


def test_a_workspace_we_cannot_read_never_produces_an_accusation(monkeypatch):
    """A teammate with no container, or a container that is down. Being told it
    did not deliver because nobody could look is the one failure worth ruling
    out completely."""
    def boom(bot_id, **kwargs):
        raise OSError("no such container")

    monkeypatch.setattr(crew_artifacts, "scan_workspace", boom)
    assert crew_verify.check_delivery("scout", "Saved the deck as q3-review.pptx.").ok


def test_the_pushback_says_what_was_checked_and_allows_an_honest_no(workspace):
    verdict = crew_verify.check_delivery("scout", "Saved the deck as q3-review.pptx.")
    seed = crew_verify.pushback_seed(verdict, attempt=1)
    assert "q3-review.pptx" in seed
    assert "workspace was checked" in seed
    # Without this, a teammate with no route to the file has only one move left,
    # which is to claim harder.
    assert "If you cannot" in seed


def test_the_pushback_names_zero_bytes_rather_than_saying_it_is_missing(workspace):
    """"It is not there" and "it is there and empty" call for different fixes,
    and a teammate told the wrong one goes looking in the wrong place."""
    write(workspace, "deck.pptx", b"")
    verdict = crew_verify.check_delivery("scout", "Saved the deck as deck.pptx.")
    seed = crew_verify.pushback_seed(verdict, attempt=1)
    assert "0 bytes" in seed


# ---------------------------------------------------------------------------
# What is on disk
# ---------------------------------------------------------------------------


def test_the_scan_finds_a_file_however_it_was_produced(workspace):
    """The divergence from octop, and the reason for it. A teammate asked for a
    deck writes make_deck.py and runs it; the .pptx appears as a side effect of
    a `terminal` call whose result says nothing about it. A tool-name allow-list
    would miss exactly the case the operator cares about."""
    write(workspace, "q3-review.pptx")
    found = {item["rel_path"] for item in crew_artifacts.scan_workspace("scout")}
    assert "q3-review.pptx" in found


def test_the_scan_leaves_out_the_machinery_a_teammate_works_with(workspace):
    write(workspace, "deck.pptx")
    write(workspace, "screenshots/1730000000000.png")
    write(workspace, "__pycache__/build.cpython-311.pyc")
    write(workspace, "build.log")
    write(workspace, ".hidden/secret.txt")
    found = {item["rel_path"] for item in crew_artifacts.scan_workspace("scout")}
    assert found == {"deck.pptx"}


def test_an_empty_file_is_listed_rather_than_hidden(workspace):
    """Half of the delivery check's job. A scan that filtered empties would make
    a half-written file look like one that was never created — a much harder
    thing to diagnose."""
    write(workspace, "deck.pptx", b"")
    [found] = crew_artifacts.scan_workspace("scout")
    assert found["size"] == 0


def test_a_symlink_out_of_the_workspace_is_not_offered(workspace, tmp_path):
    """The workspace is a teammate's own, but it writes into it from things it
    read on the web. A symlink it planted would otherwise turn the download
    route into a reader for anything this process can open."""
    outside = tmp_path / "id_rsa"
    outside.write_text("PRIVATE KEY")
    (workspace / "key.txt").symlink_to(outside)
    assert crew_artifacts.scan_workspace("scout") == []


def test_a_file_is_labelled_by_what_it_is_for_not_by_its_mime_type():
    assert crew_artifacts.kind_of("a/b/q3.pptx") == "slides"
    assert crew_artifacts.kind_of("memo.docx") == "document"
    assert crew_artifacts.kind_of("data.csv") == "sheet"
    assert crew_artifacts.kind_of("whatever.bin") == "file"


@pytest.mark.parametrize(
    "rel_path",
    [
        "../crew.db", "../../etc/passwd", "a/../../x", "/etc/passwd",
        "screenshots/1730000000000.png", "..", "", "a\\b.txt",
    ],
)
def test_the_download_route_refuses_anything_that_is_not_a_deliverable(workspace, rel_path):
    """Reachable from a browser, so every segment is checked rather than the
    joined string: `a/../../../etc` has no segment that looks wrong on its own."""
    assert crew_artifacts.artifact_file_path("scout", rel_path) is None


def test_a_real_file_resolves_inside_the_workspace(workspace):
    write(workspace, "out/q3-review.pptx")
    path = crew_artifacts.artifact_file_path("scout", "out/q3-review.pptx")
    assert path is not None
    assert path.is_relative_to(workspace)


def test_a_file_named_in_chinese_can_still_be_downloaded(workspace):
    write(workspace, "第三季度汇报.pptx")
    assert crew_artifacts.artifact_file_path("scout", "第三季度汇报.pptx") is not None


# ---------------------------------------------------------------------------
# Pinning it to the thread
# ---------------------------------------------------------------------------


def test_re_running_a_script_updates_one_row_instead_of_stacking_versions(conn, workspace):
    """The operator wants "the deck", not its version history. A list that grows
    every time a script is re-run stops being a list of deliverables."""
    for size in (10, 20, 30):
        write(workspace, "deck.pptx", b"x" * size)
        crew_artifacts.record(
            conn, bot_id="scout", rel_path="deck.pptx", size=size, mtime=size,
        )
    rows = crew_artifacts.list_artifacts(conn, "scout")
    assert len(rows) == 1
    assert rows[0]["size"] == 30


def test_a_row_whose_file_is_gone_is_dropped_rather_than_offered(conn, workspace):
    """A container can be reset out from under the row. A download button for
    something that is no longer there is worse than not listing it."""
    write(workspace, "deck.pptx")
    crew_artifacts.record(conn, bot_id="scout", rel_path="deck.pptx", size=11, mtime=1)
    (workspace / "deck.pptx").unlink()
    assert crew_artifacts.list_artifacts(conn, "scout") == []
    assert conn.execute("SELECT COUNT(*) c FROM artifacts").fetchone()["c"] == 0


def test_only_what_this_turn_touched_is_pinned_to_this_turn(conn, workspace):
    import os
    import time

    write(workspace, "old.txt")
    os.utime(workspace / "old.txt", (1000, 1000))
    started = crew_db.now_ms()
    time.sleep(0.01)
    write(workspace, "new.txt")

    rows = crew_artifacts.record_turn_output(
        conn, "scout", thread_id="dm:scout", turn_id="t1", since_ms=started,
    )
    assert [row["rel_path"] for row in rows] == ["new.txt"]


def test_a_tools_own_arguments_are_preferred_over_its_prose(conn):
    """octop's ordering and the right one: a result is text the tool wrote and
    may mention a file it never touched, while an argument is what the call was
    actually about."""
    assert crew_artifacts.extract_paths(
        "write_file", {"path": "notes.md"}, "wrote something to other.md",
    ) == ["notes.md"]


def test_a_tool_that_does_not_make_files_is_not_read_for_paths():
    assert crew_artifacts.extract_paths("terminal", {"command": "cat notes.md"}) == []


def test_a_directory_or_a_version_number_is_not_a_deliverable():
    assert not crew_artifacts.looks_like_a_file("out/")
    assert not crew_artifacts.looks_like_a_file("1.2.3")
    assert crew_artifacts.looks_like_a_file("out/deck.pptx")
