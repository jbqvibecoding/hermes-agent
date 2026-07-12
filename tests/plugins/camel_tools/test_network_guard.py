"""SSRF firewall tests (ported OpenHarness network_guard), plus adapter wiring.

DNS resolution is monkeypatched so tests are hermetic (no real network).
"""

from __future__ import annotations

import ipaddress
import json

import pytest

from plugins.camel_tools import network_guard as ng
from plugins.camel_tools.adapter import make_handler


def _fake_resolve(mapping):
    def _resolve(host, port):
        if host in mapping:
            return {ipaddress.ip_address(ip) for ip in mapping[host]}
        raise ng.NetworkGuardError(f"could not resolve target host {host}")

    return _resolve


# ---------------------------------------------------------------------------
# URL syntax
# ---------------------------------------------------------------------------


def test_rejects_non_http_scheme():
    with pytest.raises(ng.NetworkGuardError, match="http and https"):
        ng.assert_public_url("ftp://example.com")


def test_rejects_embedded_credentials():
    with pytest.raises(ng.NetworkGuardError, match="embedded credentials"):
        ng.assert_public_url("https://user:pass@example.com")


def test_rejects_missing_host():
    with pytest.raises(ng.NetworkGuardError):
        ng.assert_public_url("http:///path")


# ---------------------------------------------------------------------------
# local / metadata / private
# ---------------------------------------------------------------------------


def test_rejects_localhost_hostname():
    with pytest.raises(ng.NetworkGuardError, match="local hostnames"):
        ng.assert_public_url("http://localhost:8080/")


def test_rejects_metadata_hostname():
    with pytest.raises(ng.NetworkGuardError, match="local hostnames"):
        ng.assert_public_url("http://metadata.google.internal/")


def test_rejects_internal_suffix():
    with pytest.raises(ng.NetworkGuardError, match="local hostnames"):
        ng.assert_public_url("http://db.internal/")


def test_rejects_single_label_host():
    with pytest.raises(ng.NetworkGuardError, match="single-label"):
        ng.assert_public_url("http://intranet/")


def test_rejects_loopback_ip_literal():
    with pytest.raises(ng.NetworkGuardError, match="non-public"):
        ng.assert_public_url("http://127.0.0.1/")


def test_rejects_cloud_metadata_ip_literal():
    with pytest.raises(ng.NetworkGuardError, match="non-public"):
        ng.assert_public_url("http://169.254.169.254/latest/meta-data/")


def test_rejects_private_range_ip_literal():
    with pytest.raises(ng.NetworkGuardError, match="non-public"):
        ng.assert_public_url("http://10.0.0.5/")


def test_rejects_host_resolving_to_private(monkeypatch):
    monkeypatch.setattr(
        ng, "_resolve_host_addresses", _fake_resolve({"evil.example.com": ["10.1.2.3"]})
    )
    with pytest.raises(ng.NetworkGuardError, match="non-public"):
        ng.assert_public_url("https://evil.example.com/")


def test_allows_host_resolving_to_public(monkeypatch):
    monkeypatch.setattr(
        ng, "_resolve_host_addresses", _fake_resolve({"example.com": ["93.184.216.34"]})
    )
    ng.assert_public_url("https://example.com/path")  # no raise


def test_allows_public_ip_literal():
    ng.assert_public_url("https://8.8.8.8/")  # no raise


# ---------------------------------------------------------------------------
# guard_args + enable toggle
# ---------------------------------------------------------------------------


def test_guard_args_scans_all_url_values(monkeypatch):
    monkeypatch.setattr(ng, "_resolve_host_addresses", _fake_resolve({}))
    with pytest.raises(ng.NetworkGuardError):
        ng.guard_args({"document_path": "http://169.254.169.254/", "note": "hi"})


def test_guard_args_ignores_non_url_strings():
    ng.guard_args({"query": "what is http", "n": 5})  # no raise


def test_guard_disabled_via_env(monkeypatch):
    monkeypatch.setenv(ng.GUARD_DISABLE_ENV, "off")
    ng.guard_args({"url": "http://127.0.0.1/"})  # no raise when disabled


# ---------------------------------------------------------------------------
# adapter wiring: a camel tool handler blocks an unsafe URL arg
# ---------------------------------------------------------------------------


class _FakeFT:
    def __init__(self):
        self.called = False

    def get_openai_tool_schema(self):
        return {
            "function": {
                "name": "browse_url",
                "parameters": {
                    "type": "object",
                    "properties": {"url": {"type": "string"}},
                },
            }
        }

    def func(self, url):
        self.called = True
        return {"ok": url}


def test_handler_blocks_unsafe_url_before_calling_tool():
    ft = _FakeFT()
    handler = make_handler(ft)
    out = json.loads(handler({"url": "http://169.254.169.254/latest/meta-data/"}))
    assert "error" in out
    assert "blocked unsafe URL" in out["error"]
    assert ft.called is False  # tool never executed


def test_handler_allows_public_url(monkeypatch):
    monkeypatch.setattr(
        ng, "_resolve_host_addresses", _fake_resolve({"example.com": ["93.184.216.34"]})
    )
    ft = _FakeFT()
    handler = make_handler(ft)
    out = json.loads(handler({"url": "https://example.com"}))
    assert ft.called is True
    assert out["ok"] == "https://example.com"
