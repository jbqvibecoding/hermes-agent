"""Offline smoke run: register the plugin against a fake ctx and exercise
every tool. Usage (from the hermes-agent repo root):

    python3 -m plugins.agent_cluster.tests.smoke
"""
from __future__ import annotations

import json
import tempfile
from pathlib import Path

import plugins.agent_cluster as plugin
from plugins.agent_cluster.tests.conftest import FakeCtx


def main() -> int:
    tmp = Path(tempfile.mkdtemp(prefix="agent-cluster-smoke-"))
    plugin.cluster_config.get_config = lambda: {
        **plugin.cluster_config.DEFAULTS,
        "data_dir": str(tmp),
    }
    ctx = FakeCtx()
    plugin.register(ctx)
    print(f"tools: {sorted(ctx.tools)}")
    print(f"hooks: {sorted(ctx.hooks)}")

    def show(tool: str, **args):
        raw = ctx.tools[tool]["handler"](args)
        payload = json.loads(raw)
        preview = json.dumps(payload, ensure_ascii=False)[:400]
        print(f"\n=== {tool} ===\n{preview}")
        return payload

    found = show("cluster_search", query="backend api architect", limit=3)
    slug = found["results"][0]["slug"]
    show("cluster_inspect", slug=slug)
    show("cluster_load", slug=slug, task="design a small REST service")
    show("cluster_delegate", slug=slug, task="design a small REST service")
    ctx._results = [
        json.dumps({"results": [{"status": "success", "result": "design done"}]}),
        json.dumps({"results": [{"status": "success", "result": "code done"}]}),
        json.dumps({"results": [{"status": "success", "result": "VERDICT: PASS"}]}),
    ]
    show(
        "cluster_pipeline",
        stages=[
            {"agent": "system-architect", "goal": "design the feature"},
            {"agent": "coder", "goal": "implement the feature"},
        ],
        verify_goal="feature works",
        verify_criteria=["implementation matches design"],
        gate="G2",
    )
    ctx._results = [json.dumps({"results": [{"status": "success", "result": "VERDICT: PASS"}]})]
    show("cluster_verify", goal="release ready?", gate="G5")
    show("cluster_knowledge", query="backend")

    guard = ctx.hooks["pre_tool_call"][0]
    blocked = guard(tool_name="terminal", args={"command": "git push --force origin main"})
    print(f"\n=== guard ===\nforce-push blocked: {bool(blocked)}")
    print(f"\nsmoke OK (data dir: {tmp})")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
