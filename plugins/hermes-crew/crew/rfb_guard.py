"""Make "view only" true on the server, where the phone cannot lie about it.

The phone's viewer sets noVNC's ``viewOnly`` and therefore never sends a
keystroke. That is the client asserting something about itself, on a device we
do not control, over a socket anyone holding the operator's token can open. It
is a statement of intent, not a boundary.

This is the boundary. It sits in the middle of the proxy and reads the
client→server half of the RFB stream, forwarding the handful of messages a
viewer genuinely needs to *receive pixels* and dropping everything that would
*do* something to the teammate's machine.

**An allowlist, deliberately.** The opposite shape — listing the messages to
block — is a list of the ones somebody thought of, and this product has already
paid for that lesson once: the host's browser-expression denylist catches two
spellings of reading a password field and misses four. Here the question is
closed. Three message types carry a viewer's needs; everything else either goes
nowhere or closes the socket.

**Why an unknown type closes rather than drops.** RFB is a byte stream, not a
sequence of framed messages. Every message's length is implied by its type, so
a type whose length we do not know means we can no longer find where the next
message begins — and a filter that has lost the message boundary is not
filtering, it is guessing. The same reasoning covers a security type we do not
recognise during the handshake.

The container this guards is fixed and known: ``docker/crew-computer/
entrypoint.sh`` runs ``x11vnc … -nopw -shared``, so the only security type on
offer is None and the handshake below is deterministic. ``-shared`` is why the
phone watching does not evict the operator's own desktop view.
"""

from __future__ import annotations

import struct
from dataclasses import dataclass, field
from typing import Optional

#: RFB client→server message types a viewer needs in order to be *sent* pixels.
#: ``SetPixelFormat`` and ``SetEncodings`` describe what it can decode;
#: ``FramebufferUpdateRequest`` asks for the next frame. None of the three
#: reaches past the VNC server into the session.
SET_PIXEL_FORMAT = 0
SET_ENCODINGS = 2
FRAMEBUFFER_UPDATE_REQUEST = 3

#: Dropped. Each one acts on the teammate's machine: two synthesise input at
#: the X server, and the third writes the session's clipboard.
KEY_EVENT = 4
POINTER_EVENT = 5
CLIENT_CUT_TEXT = 6

#: Fixed-length messages, by type.
_FIXED_LENGTHS = {
    SET_PIXEL_FORMAT: 20,
    FRAMEBUFFER_UPDATE_REQUEST: 10,
    KEY_EVENT: 8,
    POINTER_EVENT: 6,
}

_ALLOWED = frozenset({SET_PIXEL_FORMAT, SET_ENCODINGS, FRAMEBUFFER_UPDATE_REQUEST})
_DROPPED = frozenset({KEY_EVENT, POINTER_EVENT, CLIENT_CUT_TEXT})

#: The one security type our image offers (``-nopw``). The handshake below is
#: written for it; see the module docstring for why anything else is fatal
#: rather than best-effort.
SECURITY_NONE = 1

#: ``ClientCutText`` carries a caller-declared length. It is dropped either way,
#: so the only thing the number can do is make us wait for bytes that never
#: come — a wedged socket rather than a leak, but still worth a ceiling.
MAX_CUT_TEXT = 1 << 20

#: The client's half of the handshake, in order: ProtocolVersion, the chosen
#: security type, then ClientInit's shared flag.
_VERSION_BYTES = 12


class RfbProtocolError(Exception):
    """The stream stopped being one we can follow, so the socket must close.

    Never raised for a message we simply refuse — those are dropped and
    counted. This means *we have lost the message boundary*, which is the one
    state in which continuing would turn the guard into a passthrough.
    """


@dataclass
class ReadOnlyGuard:
    """Filter one client→server RFB stream down to what a viewer may send.

    Feed it whatever arrives, in whatever sizes it arrives; take back the bytes
    to forward. Both halves of that sentence are load-bearing, because a
    WebSocket frame boundary has nothing to do with an RFB message boundary:
    one frame can carry three messages, and one message can straddle two
    frames. The buffer below is what makes those the same code path.
    """

    #: Bytes seen but not yet resolved into a complete message.
    _buffer: bytearray = field(default_factory=bytearray)
    #: Where we are in the handshake; ``None`` once the message stream starts.
    _phase: Optional[str] = "version"
    #: How many input messages this viewer has tried to send. Nonzero is worth
    #: an audit row: a correct viewer never sends one.
    refused: int = 0

    def feed(self, chunk: bytes) -> bytes:
        """Return the bytes of ``chunk`` that may go on to the VNC server.

        Raises :class:`RfbProtocolError` when the stream can no longer be
        followed. The caller closes the socket; it does not carry on.
        """
        self._buffer.extend(chunk)
        out = bytearray()
        while True:
            taken = self._take(out)
            if not taken:
                return bytes(out)

    def _take(self, out: bytearray) -> bool:
        """Resolve one unit from the buffer into ``out``. False when short."""
        if self._phase == "version":
            return self._forward_fixed(out, _VERSION_BYTES, "security")
        if self._phase == "security":
            if not self._buffer:
                return False
            if self._buffer[0] != SECURITY_NONE:
                raise RfbProtocolError(
                    f"security type {self._buffer[0]} is not the None our image offers; "
                    "its sub-handshake has a length this guard does not know"
                )
            return self._forward_fixed(out, 1, "client_init")
        if self._phase == "client_init":
            return self._forward_fixed(out, 1, None)
        return self._take_message(out)

    def _forward_fixed(self, out: bytearray, size: int, next_phase: Optional[str]) -> bool:
        if len(self._buffer) < size:
            return False
        out += self._buffer[:size]
        del self._buffer[:size]
        self._phase = next_phase
        return True

    def _take_message(self, out: bytearray) -> bool:
        if not self._buffer:
            return False
        kind = self._buffer[0]

        size = _FIXED_LENGTHS.get(kind)
        if size is None:
            if kind == SET_ENCODINGS:
                # 1 type + 1 padding + 2 count, then 4 bytes per encoding.
                if len(self._buffer) < 4:
                    return False
                (count,) = struct.unpack_from(">H", self._buffer, 2)
                size = 4 + 4 * count
            elif kind == CLIENT_CUT_TEXT:
                # 1 type + 3 padding + 4 length, then the text.
                if len(self._buffer) < 8:
                    return False
                (length,) = struct.unpack_from(">I", self._buffer, 4)
                if length > MAX_CUT_TEXT:
                    raise RfbProtocolError(
                        f"ClientCutText declares {length} bytes, past any real paste"
                    )
                size = 8 + length
            else:
                # See the module docstring: not knowing this message's length
                # means not knowing where the next one starts.
                raise RfbProtocolError(f"unknown client message type {kind}")

        if len(self._buffer) < size:
            return False

        if kind in _DROPPED:
            self.refused += 1
        elif kind in _ALLOWED:
            out += self._buffer[:size]
        else:  # pragma: no cover — _FIXED_LENGTHS and the branches above agree
            raise RfbProtocolError(f"unclassified client message type {kind}")
        del self._buffer[:size]
        return True
