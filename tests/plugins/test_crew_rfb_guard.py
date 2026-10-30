"""Hermes Crew — "view only" as something the server enforces.

The phone's viewer sets noVNC's ``viewOnly``, which is the client describing
itself. This module is the half that does not depend on the client being honest
or even being ours: the proxy reads the client→server RFB stream and forwards
only what a viewer needs in order to be sent pixels.

Most of what is tested here is framing rather than policy, and deliberately so.
Deciding that a PointerEvent must not pass is the easy half; the half that
actually breaks is finding where one message ends and the next begins, because
a WebSocket frame boundary has nothing to do with an RFB message boundary. A
guard that mis-frames does not fail loudly — it silently becomes a passthrough.
"""

from __future__ import annotations

import struct
import sys
from pathlib import Path

import pytest

_PLUGIN_ROOT = Path(__file__).resolve().parents[2] / "plugins" / "hermes-crew"
if str(_PLUGIN_ROOT) not in sys.path:
    sys.path.insert(0, str(_PLUGIN_ROOT))

from crew.rfb_guard import ReadOnlyGuard, RfbProtocolError  # noqa: E402

VERSION = b"RFB 003.008\n"
SECURITY_NONE = bytes([1])
CLIENT_INIT = bytes([1])
HANDSHAKE = VERSION + SECURITY_NONE + CLIENT_INIT


def update_request(incremental: int = 1, x: int = 0, y: int = 0, w: int = 1280, h: int = 800) -> bytes:
    return struct.pack(">BBHHHH", 3, incremental, x, y, w, h)


def set_pixel_format() -> bytes:
    return bytes([0, 0, 0, 0]) + bytes(16)


def set_encodings(*encodings: int) -> bytes:
    return struct.pack(">BBH", 2, 0, len(encodings)) + b"".join(
        struct.pack(">i", e) for e in encodings
    )


def key_event(keysym: int = 0x61, down: int = 1) -> bytes:
    return struct.pack(">BBHI", 4, down, 0, keysym)


def pointer_event(mask: int = 1, x: int = 10, y: int = 20) -> bytes:
    return struct.pack(">BBHH", 5, mask, x, y)


def cut_text(text: bytes = b"stolen") -> bytes:
    return struct.pack(">BBBBI", 6, 0, 0, 0, len(text)) + text


@pytest.fixture()
def opened():
    """A guard that has already seen the handshake through."""
    guard = ReadOnlyGuard()
    assert guard.feed(HANDSHAKE) == HANDSHAKE
    return guard


# ---------------------------------------------------------------------------
# The handshake
# ---------------------------------------------------------------------------


def test_the_handshake_goes_through_byte_for_byte():
    """The guard must be invisible until the message stream starts.

    Dropping or reordering a handshake byte does not produce a restricted
    session, it produces no session — and the operator would see "the screen
    will not connect" with nothing to point at.
    """
    guard = ReadOnlyGuard()
    assert guard.feed(HANDSHAKE) == HANDSHAKE
    assert guard.refused == 0


def test_the_handshake_survives_arriving_one_byte_at_a_time():
    """A 12-byte version string can be split across frames like anything else."""
    guard = ReadOnlyGuard()
    seen = b"".join(guard.feed(bytes([byte])) for byte in HANDSHAKE)
    assert seen == HANDSHAKE


def test_a_security_type_we_do_not_know_closes_the_socket():
    """Our image is ``-nopw``, so None is the only type on offer.

    Anything else has a sub-handshake of a length this guard does not know —
    VNC auth, for instance, inserts a 16-byte challenge response. Guessing
    would put the parser out of step with the stream for the rest of the
    session, and a parser that is out of step forwards whatever it happens to
    land on. Refusing to connect is the safe direction.
    """
    guard = ReadOnlyGuard()
    guard.feed(VERSION)
    with pytest.raises(RfbProtocolError, match="security type 2"):
        guard.feed(bytes([2]))


# ---------------------------------------------------------------------------
# Framing — where a filter like this actually fails
# ---------------------------------------------------------------------------


def test_several_messages_in_one_frame_are_each_decided(opened):
    """One WebSocket frame, three RFB messages, mixed verdicts.

    A guard that looks only at the first byte of a frame would forward the
    pointer event riding behind an allowed message.
    """
    out = opened.feed(update_request() + pointer_event() + update_request(incremental=0))

    assert out == update_request() + update_request(incremental=0)
    assert opened.refused == 1


def test_a_message_split_across_frames_is_buffered_not_mis_parsed(opened):
    """The failure this prevents is the quiet one.

    Parsing each frame independently would read the tail of a split
    FramebufferUpdateRequest as a fresh message — those bytes are screen
    coordinates, so the "type" would be whatever pixel column the viewer asked
    about, and the parser would be lost from there on.
    """
    message = update_request(x=4, y=5)
    first, second = message[:4], message[4:]

    assert opened.feed(first) == b""
    assert opened.feed(second) == message


def test_a_dropped_message_split_across_frames_is_still_dropped(opened):
    """The same, for a message that must not pass. Half a key event is not a
    reason to forward the other half."""
    message = key_event()
    assert opened.feed(message[:3]) == b""
    assert opened.feed(message[3:]) == b""
    assert opened.refused == 1


def test_set_encodings_is_measured_by_its_own_count(opened):
    """The one allowed message with a variable length.

    Getting this wrong is the same class of bug as the split frame: the parser
    resumes at the wrong offset and every verdict after it is meaningless. The
    second request is here to prove the stream is still aligned afterwards.
    """
    encodings = set_encodings(0, 1, -239, -223)
    out = opened.feed(encodings + update_request())

    assert out == encodings + update_request()


def test_a_truncated_set_encodings_header_waits_rather_than_guesses(opened):
    """The count lives in bytes 3-4, so a 2-byte fragment cannot be sized yet."""
    encodings = set_encodings(0, 1)
    assert opened.feed(encodings[:2]) == b""
    assert opened.feed(encodings[2:]) == encodings


# ---------------------------------------------------------------------------
# The policy
# ---------------------------------------------------------------------------


@pytest.mark.parametrize(
    ("name", "message"),
    [("key", key_event()), ("pointer", pointer_event()), ("cut text", cut_text())],
    ids=["key_event", "pointer_event", "client_cut_text"],
)
def test_every_message_that_acts_on_the_machine_is_dropped(opened, name, message):
    """Parametrised so no one of the three rides on another's coverage.

    Two synthesise input at the X server; the third writes the session's
    clipboard, which is how a watcher would push text into a terminal without
    a keystroke.
    """
    assert opened.feed(message) == b""
    assert opened.refused == 1


def test_pixels_keep_flowing_after_input_is_refused(opened):
    """Refusing input must not break the view.

    The viewer is asking for frames continuously; if a dropped message left
    the parser confused, the screen would freeze and look like a network
    problem rather than a policy.
    """
    opened.feed(key_event())
    assert opened.feed(update_request()) == update_request()


def test_what_a_viewer_legitimately_needs_passes(opened):
    """The whole allowlist, in the order a real client sends it."""
    hello = set_pixel_format() + set_encodings(0, -223) + update_request(incremental=0)
    assert opened.feed(hello) == hello
    assert opened.refused == 0


def test_an_unknown_message_type_closes_rather_than_guesses(opened):
    """Not knowing a message's length means not knowing where the next starts.

    Dropping it would be worse than forwarding it: both leave the parser
    reading a message body as though it were a header, except dropping feels
    safe. There is no way to resynchronise an RFB stream, so the socket goes.
    """
    with pytest.raises(RfbProtocolError, match="unknown client message type 250"):
        opened.feed(bytes([250, 0, 0, 0]))


def test_an_absurd_cut_text_length_closes_rather_than_waiting_forever(opened):
    """The length is the client's claim, and the text is dropped either way.

    So the only thing a huge number can buy is a guard waiting for bytes that
    never arrive, holding the socket open with a buffer it will never resolve.
    """
    with pytest.raises(RfbProtocolError, match="past any real paste"):
        opened.feed(struct.pack(">BBBBI", 6, 0, 0, 0, 1 << 30))


def test_the_refusal_count_is_what_the_ledger_records(opened):
    """A correct viewer never sends input, so a nonzero count is worth a row.

    It separates "somebody watched the screen" from "somebody watched the
    screen and something tried to type into it", which are different events
    for the person reading the audit log later.
    """
    opened.feed(key_event() + key_event(down=0) + pointer_event())
    assert opened.refused == 3

    opened.feed(update_request())
    assert opened.refused == 3, "allowed traffic must not inflate the count"
