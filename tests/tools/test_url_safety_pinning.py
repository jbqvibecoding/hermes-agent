"""Holding the safety check and the connection together.

``is_safe_url`` resolves a hostname, checks every address it gets back, and
returns a bool. The caller then connects **by hostname** — a second DNS lookup,
and between the two the answer can change. That is DNS rebinding: the name
validates as public, and the socket that matters reaches
``169.254.169.254``. OpenMuse's proxy states the rule in one line — *all
upstream sockets connect to a validated IP, never a second DNS lookup* — and
the blocklists, which are the bulk of that design, were already here and more
thorough than the ones being ported. This is the half that was missing.

What these tests pin is that ``resolve_and_pin`` hands back **the address**
rather than a verdict, that it refuses everything ``is_safe_url`` refuses (one
set of rules, not two), and that the peer comparison does not reject a
perfectly good connection over address formatting — a guard that fails closed
breaks downloads when it is wrong, so being right about ``::ffff:`` matters.
"""

from __future__ import annotations

from unittest.mock import patch

import pytest

from tools.url_safety import peer_is_pinned, resolve_and_pin


def _addr_info(*ips):
    import socket

    return [(socket.AF_INET, socket.SOCK_STREAM, 6, "", (ip, 0)) for ip in ips]


# ---------------------------------------------------------------------------
# resolve_and_pin
# ---------------------------------------------------------------------------


def test_it_hands_back_the_address_not_just_a_verdict():
    """**The whole point.** A bool leaves the caller to resolve again; an
    address lets the check and the connection be the same decision."""
    with patch("socket.getaddrinfo", return_value=_addr_info("93.184.216.34")):
        assert resolve_and_pin("https://example.com/a.png") == ("93.184.216.34", "example.com")


@pytest.mark.parametrize("ip", [
    "127.0.0.1",
    "10.0.0.5",
    "192.168.1.1",
    "169.254.169.254",   # the metadata endpoint SSRF exists for
    "169.254.170.2",     # AWS ECS task credentials
    "100.100.100.200",   # Alibaba Cloud metadata
    "100.64.0.1",        # CGNAT — not covered by is_private, blocked explicitly
])
def test_it_refuses_everything_the_existing_check_refuses(ip):
    """Delegating rather than restating is the design: one set of blocklists
    means a range added there is covered here without anybody remembering to."""
    with patch("socket.getaddrinfo", return_value=_addr_info(ip)):
        assert resolve_and_pin(f"https://evil.test/{ip}") is None


def test_the_metadata_endpoint_stays_refused_with_private_urls_allowed():
    """Host behaviour, locked down by a test rather than rewritten. The
    `_ALWAYS_BLOCKED_*` sets are checked before the allow-private toggle, which
    is what makes "no configuration can reach cloud credentials" true."""
    with patch("socket.getaddrinfo", return_value=_addr_info("169.254.169.254")), \
         patch("tools.url_safety._global_allow_private_urls", return_value=True):
        assert resolve_and_pin("https://metadata.test/") is None


def test_a_private_address_is_reachable_when_the_operator_asked_for_that():
    """The pair to the test above: the toggle still works for the ranges it
    governs, so this is not quietly stricter than the check it delegates to."""
    with patch("socket.getaddrinfo", return_value=_addr_info("10.0.0.5")), \
         patch("tools.url_safety._global_allow_private_urls", return_value=True):
        assert resolve_and_pin("https://internal.test/") == ("10.0.0.5", "internal.test")


@pytest.mark.parametrize("url", [
    "file:///etc/passwd",
    "ftp://example.com/x",
    "not a url at all",
    "",
])
def test_anything_that_is_not_a_fetchable_url_is_refused(url):
    assert resolve_and_pin(url) is None


def test_dns_failure_refuses_rather_than_guessing():
    import socket as socket_module

    with patch("socket.getaddrinfo", side_effect=socket_module.gaierror("nope")):
        assert resolve_and_pin("https://example.com/") is None


# ---------------------------------------------------------------------------
# peer_is_pinned
# ---------------------------------------------------------------------------


def test_the_same_address_matches():
    assert peer_is_pinned("93.184.216.34", "93.184.216.34")


def test_the_same_host_reached_two_ways_still_matches():
    """**Why this is not a string compare.**

    A dual-stack client can report the peer as `::ffff:93.184.216.34` for the
    address that validated as `93.184.216.34`. They are the same host. A guard
    that fails closed and gets this wrong does not leak anything — it breaks
    every download on such a stack, which is how a security check gets turned
    off by whoever is on call.
    """
    assert peer_is_pinned("::ffff:93.184.216.34", "93.184.216.34")
    assert peer_is_pinned("93.184.216.34", "::ffff:93.184.216.34")


def test_a_scope_id_does_not_confuse_it():
    assert peer_is_pinned("fe80::1%eth0", "fe80::1")


def test_a_different_address_does_not_match():
    """The case the whole thing exists for: checked one host, reached another."""
    assert not peer_is_pinned("169.254.169.254", "93.184.216.34")


def test_an_unparseable_peer_does_not_match():
    """Fails closed. Something that is not an address is not the address we
    validated, whatever else it might be."""
    assert not peer_is_pinned("", "93.184.216.34")
    assert not peer_is_pinned("example.com", "93.184.216.34")
