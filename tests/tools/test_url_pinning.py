"""F4: close the DNS-rebinding hole this module documented as unfixable.

``tools/url_safety.py`` used to say, in its own Limitations section, that a
resolver answering with a public IP for the check and a private one for the
connection could not be stopped at pre-flight level and needed connection-level
validation. This is that validation: the check now returns the addresses it
vetted, and the request dials one of them instead of resolving again.

The one way this can quietly make things *worse* rather than better is getting
the hostname preservation backwards — pin the IP but forget the ``Host`` header
and SNI, and TLS certificate verification silently stops matching the name the
user asked for. That is asserted first and hardest.
"""

from __future__ import annotations

from tools.url_safety import (
    is_safe_url,
    pin_to_address,
    resolve_safe_addresses,
    strip_cross_origin_credentials,
)


# ---------------------------------------------------------------------------
# The dangerous half: certificate verification must keep working
# ---------------------------------------------------------------------------


def test_the_original_hostname_survives_in_sni():
    """SNI drives the certificate hostname check. Losing it means a pinned
    HTTPS request stops verifying the name it was asked for."""
    _, _, ext = pin_to_address("https://example.com/x", ("93.184.216.34",), {})
    assert ext["sni_hostname"] == "example.com"


def test_the_original_hostname_survives_in_the_host_header():
    """Virtual-host routing needs it; without it a shared host serves the
    wrong site."""
    _, headers, _ = pin_to_address("https://example.com/x", ("93.184.216.34",), {})
    assert headers["Host"] == "example.com"


def test_the_url_actually_dials_the_vetted_address():
    url, _, _ = pin_to_address("https://example.com/a/b?q=1", ("93.184.216.34",), {})
    assert url == "https://93.184.216.34/a/b?q=1"


def test_the_port_is_preserved():
    url, headers, _ = pin_to_address("https://example.com:8443/x", ("10.0.0.1",), {})
    assert url == "https://10.0.0.1:8443/x"
    assert headers["Host"] == "example.com:8443"


def test_ipv6_addresses_are_bracketed():
    """An unbracketed IPv6 authority is an unparseable URL."""
    url, _, _ = pin_to_address("https://example.com/x", ("2606:2800:220:1:248::",), {})
    assert url.startswith("https://[2606:2800:220:1:248::]/")


def test_the_path_query_and_fragment_are_untouched():
    url, _, _ = pin_to_address(
        "https://example.com/a%20b?x=1&y=2#frag", ("1.2.3.4",), {}
    )
    assert url == "https://1.2.3.4/a%20b?x=1&y=2#frag"


def test_userinfo_is_kept_out_of_the_host_header():
    """``user:pw@host`` in the Host header would leak the credential to the
    server as routing data."""
    _, headers, _ = pin_to_address("https://u:pw@example.com/x", ("1.2.3.4",), {})
    assert headers["Host"] == "example.com"
    assert "pw" not in headers["Host"]


def test_existing_headers_are_preserved():
    _, headers, _ = pin_to_address(
        "https://example.com/x", ("1.2.3.4",), {"Accept": "text/html"}
    )
    assert headers["Accept"] == "text/html"


def test_the_callers_dict_is_not_mutated():
    original = {"Accept": "text/html"}
    pin_to_address("https://example.com/x", ("1.2.3.4",), original)
    assert "Host" not in original


# ---------------------------------------------------------------------------
# No-ops: pinning is hardening, never a second gate
# ---------------------------------------------------------------------------


def test_no_addresses_means_no_change():
    url, headers, ext = pin_to_address("https://example.com/x", (), {"A": "b"})
    assert (url, headers, ext) == ("https://example.com/x", {"A": "b"}, {})


def test_a_url_already_naming_the_address_is_left_alone():
    url, headers, ext = pin_to_address("https://1.2.3.4/x", ("1.2.3.4",), {})
    assert url == "https://1.2.3.4/x"
    assert ext == {}


def test_an_unparseable_url_falls_back_rather_than_raising():
    """The gate already ran and said yes. Failing to pin must leave the
    pre-existing behaviour, not break the request."""
    url, _, ext = pin_to_address("::::not a url::::", ("1.2.3.4",), {})
    assert isinstance(url, str)
    assert ext == {} or "sni_hostname" in ext


def test_none_headers_are_accepted():
    _, headers, _ = pin_to_address("https://example.com/x", ("1.2.3.4",), None)
    assert headers["Host"] == "example.com"


# ---------------------------------------------------------------------------
# resolve_safe_addresses — the other half of the pair
# ---------------------------------------------------------------------------


def test_it_returns_the_addresses_it_vetted():
    ok, addresses = resolve_safe_addresses("https://localhost/x")
    # localhost resolves to a blocked address, so this is the refusal shape.
    assert ok is False
    assert addresses == ()


def test_a_refusal_returns_no_addresses_to_pin():
    """Handing back addresses on a refusal would let a careless caller pin to
    an address the gate just rejected."""
    for blocked in (
        "http://169.254.169.254/latest/meta-data/",
        "http://metadata.google.internal/",
        "file:///etc/passwd",
        "https://",
    ):
        ok, addresses = resolve_safe_addresses(blocked)
        assert ok is False, blocked
        assert addresses == (), blocked


def test_the_boolean_wrapper_still_agrees_with_the_pair():
    """is_safe_url has many callers; its verdict must not have shifted."""
    for url in (
        "http://169.254.169.254/",
        "file:///etc/passwd",
        "https://",
        "not-a-url",
    ):
        assert is_safe_url(url) == resolve_safe_addresses(url)[0], url


def test_a_resolvable_public_host_yields_addresses(monkeypatch):
    import socket as _socket

    import tools.url_safety as mod

    monkeypatch.setattr(
        mod.socket,
        "getaddrinfo",
        lambda *a, **kw: [(_socket.AF_INET, None, None, "", ("93.184.216.34", 0))],
    )
    ok, addresses = resolve_safe_addresses("https://example.com/x")
    assert ok is True
    assert addresses == ("93.184.216.34",)


def test_every_resolved_address_is_returned_not_just_the_first(monkeypatch):
    """A host with several A records was fully checked; a caller that fails
    over between them must be able to pin to any vetted one."""
    import socket as _socket

    import tools.url_safety as mod

    monkeypatch.setattr(
        mod.socket,
        "getaddrinfo",
        lambda *a, **kw: [
            (_socket.AF_INET, None, None, "", ("93.184.216.34", 0)),
            (_socket.AF_INET, None, None, "", ("93.184.216.35", 0)),
        ],
    )
    ok, addresses = resolve_safe_addresses("https://example.com/x")
    assert ok is True
    assert addresses == ("93.184.216.34", "93.184.216.35")


def test_a_dns_failure_still_fails_closed(monkeypatch):
    import socket as _socket

    import tools.url_safety as mod

    def _boom(*a, **kw):
        raise _socket.gaierror("nope")

    monkeypatch.setattr(mod.socket, "getaddrinfo", _boom)
    assert resolve_safe_addresses("https://example.com/x") == (False, ())


def test_the_end_to_end_pair_pins_to_what_was_checked(monkeypatch):
    """The whole point: one address is vetted and that same address is dialled,
    so a second resolution cannot substitute a private one."""
    import socket as _socket

    import tools.url_safety as mod

    monkeypatch.setattr(
        mod.socket,
        "getaddrinfo",
        lambda *a, **kw: [(_socket.AF_INET, None, None, "", ("93.184.216.34", 0))],
    )
    ok, addresses = resolve_safe_addresses("https://example.com/x")
    assert ok
    url, headers, ext = pin_to_address("https://example.com/x", addresses, {})
    assert "93.184.216.34" in url
    assert headers["Host"] == "example.com"
    assert ext["sni_hostname"] == "example.com"


# ---------------------------------------------------------------------------
# Credential stripping across a redirect hop
# ---------------------------------------------------------------------------


def test_credentials_are_dropped_on_a_cross_origin_hop():
    out = strip_cross_origin_credentials(
        {"Authorization": "Bearer x", "Accept": "*/*"},
        "https://a.example/1",
        "https://b.example/2",
    )
    assert "Authorization" not in out
    assert out["Accept"] == "*/*"


def test_credentials_survive_a_same_origin_hop():
    out = strip_cross_origin_credentials(
        {"Authorization": "Bearer x"},
        "https://a.example/1",
        "https://a.example/2",
    )
    assert out["Authorization"] == "Bearer x"


def test_a_scheme_change_counts_as_cross_origin():
    """https -> http is a downgrade; the credential must not ride along."""
    out = strip_cross_origin_credentials(
        {"Cookie": "s=1"}, "https://a.example/1", "http://a.example/2"
    )
    assert "Cookie" not in out


def test_a_port_change_counts_as_cross_origin():
    out = strip_cross_origin_credentials(
        {"Cookie": "s=1"}, "https://a.example:443/1", "https://a.example:8443/2"
    )
    assert "Cookie" not in out


def test_header_matching_is_case_insensitive():
    out = strip_cross_origin_credentials(
        {"AUTHORIZATION": "x", "cookie": "y"},
        "https://a.example/1",
        "https://b.example/2",
    )
    assert out == {}


def test_an_unparseable_hop_is_treated_as_cross_origin():
    """Fail closed: if we cannot tell, do not hand over the credential."""
    out = strip_cross_origin_credentials(
        {"Authorization": "x"}, "https://a.example/1", "::::"
    )
    assert "Authorization" not in out
