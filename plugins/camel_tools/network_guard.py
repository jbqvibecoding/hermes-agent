"""SSRF firewall for outbound URLs (ported from OpenHarness).

The CAMEL toolkits we expose include web fetch / browser / search tools that
follow URLs supplied by the model. That is a classic SSRF surface: a prompt
can steer the agent to ``http://169.254.169.254/...`` (cloud metadata),
``http://localhost:...`` (internal services), or private-range hosts.

This ports OpenHarness' ``utils/network_guard.py`` validation core into a
self-contained, sync-first guard (stdlib only — no httpx needed for the check).
It rejects:

* non-http(s) schemes and URLs with embedded credentials;
* local hostnames (localhost, ``*.internal``, ``metadata.google.internal``,
  single-label hosts);
* hosts that DNS-resolve to any non-global address (loopback / private /
  link-local / ULA / cloud-metadata).

:func:`assert_public_url` is the entry point; it raises
:class:`NetworkGuardError` on any violation.
"""

from __future__ import annotations

import ipaddress
import os
import socket
from urllib.parse import ParseResult, urlparse

_IPAddress = ipaddress.IPv4Address | ipaddress.IPv6Address
_DEFAULT_PORTS = {"http": 80, "https": 443}

_LOCAL_HOSTNAMES = {
    "localhost",
    "localhost.localdomain",
    "metadata.google.internal",
}
_LOCAL_HOST_SUFFIXES = (
    ".localhost",
    ".local",
    ".localdomain",
    ".internal",
    ".cluster.local",
)

GUARD_DISABLE_ENV = "HERMES_CAMEL_SSRF_GUARD"


class NetworkGuardError(ValueError):
    """Raised when an outbound HTTP target violates SSRF policy."""


def guard_enabled() -> bool:
    """SSRF guard is on unless HERMES_CAMEL_SSRF_GUARD is off/0/false."""
    return os.environ.get(GUARD_DISABLE_ENV, "").strip().lower() not in {
        "off",
        "0",
        "false",
        "no",
    }


def looks_like_http_url(value: object) -> bool:
    return isinstance(value, str) and value.strip().lower().startswith((
        "http://",
        "https://",
    ))


def validate_http_url(url: str) -> ParseResult:
    """Validate basic http(s) URL syntax; reject embedded credentials."""
    parsed = urlparse(url)
    if parsed.scheme not in {"http", "https"}:
        raise NetworkGuardError("only http and https URLs are allowed")
    if not parsed.netloc or not parsed.hostname:
        raise NetworkGuardError("URL must include a host")
    if parsed.username or parsed.password:
        raise NetworkGuardError("URLs with embedded credentials are not allowed")
    return parsed


def assert_public_url(url: str) -> None:
    """Reject loopback, private-network, single-label, and other non-public
    HTTP targets. Raises :class:`NetworkGuardError` on violation."""
    parsed = validate_http_url(url)
    hostname = parsed.hostname.rstrip(".").lower()

    literal = _parse_ip_literal(hostname)
    if literal is not None:
        _ensure_global_ip(literal)
        return

    _ensure_not_local_hostname(hostname)
    port = parsed.port or _DEFAULT_PORTS[parsed.scheme]
    addresses = _resolve_host_addresses(hostname, port)
    if not addresses:
        raise NetworkGuardError(f"target host did not resolve: {hostname}")

    blocked = sorted({str(a) for a in addresses if not a.is_global})
    if blocked:
        rendered = ", ".join(blocked[:3]) + (", ..." if len(blocked) > 3 else "")
        raise NetworkGuardError(
            f"target resolves to non-public address(es): {rendered}"
        )


def guard_args(args: dict) -> None:
    """Validate every http(s) URL value found in a tool's args. No-op when the
    guard is disabled. Raises :class:`NetworkGuardError` on the first bad URL."""
    if not guard_enabled() or not isinstance(args, dict):
        return
    for value in args.values():
        if looks_like_http_url(value):
            assert_public_url(value.strip())


# ---------------------------------------------------------------------------
# helpers (ported)
# ---------------------------------------------------------------------------


def _parse_ip_literal(value: str) -> _IPAddress | None:
    try:
        return ipaddress.ip_address(value)
    except ValueError:
        return None


def _ensure_global_ip(address: _IPAddress) -> None:
    if not address.is_global:
        raise NetworkGuardError(f"target resolves to non-public address: {address}")


def _ensure_not_local_hostname(hostname: str) -> None:
    if hostname in _LOCAL_HOSTNAMES or any(
        hostname.endswith(s) for s in _LOCAL_HOST_SUFFIXES
    ):
        raise NetworkGuardError(f"local hostnames are not allowed: {hostname}")
    if "." not in hostname:
        raise NetworkGuardError(f"single-label hostnames are not allowed: {hostname}")


def _resolve_host_addresses(host: str, port: int) -> set[_IPAddress]:
    try:
        infos = socket.getaddrinfo(host, port, socket.AF_UNSPEC, socket.SOCK_STREAM)
    except OSError as exc:
        raise NetworkGuardError(f"could not resolve target host {host}: {exc}") from exc
    addresses: set[_IPAddress] = set()
    for family, _, _, _, sockaddr in infos:
        if family in (socket.AF_INET, socket.AF_INET6):
            candidate = sockaddr[0]
            if isinstance(candidate, str):
                parsed = _parse_ip_literal(candidate)
                if parsed is not None:
                    addresses.add(parsed)
    return addresses
