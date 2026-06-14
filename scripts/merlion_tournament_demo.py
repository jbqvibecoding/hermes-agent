#!/usr/bin/env python3
"""Offline-friendly demo of the Merlion plan tournament.

Runs ``tools.tournament.run_tournament`` and prints a candidate comparison table:
each contestant model's plan scored on feasibility / impact / risk / cost, ranked
best-first, with the recommended winner starred. The deterministic baseline is
always entered, so this prints something useful with NO models and NO LLM key.

Usage:
    # offline: baseline only, no key needed
    python scripts/merlion_tournament_demo.py "Launch a fintech super-app with KYC"

    # real multi-LLM (needs provider keys; models route via tools.model_router)
    python scripts/merlion_tournament_demo.py "Build a marketplace" --models gpt-5.5,opus

A fresh temp DB is seeded with one lead spec per department so scores are
meaningful without touching any real Hermes state.
"""

from __future__ import annotations

import argparse
import sys
import tempfile
from pathlib import Path

from hermes_cli import spec_registry as reg
from hermes_cli.subagent_spec import SubagentSpec
from tools import merlion_classify, orchestrate, tournament


def _seed_departments(conn) -> None:
    for dept in merlion_classify.DEFAULT_DEPARTMENTS:
        reg.upsert_spec(
            conn,
            SubagentSpec(
                id=reg.make_spec_id(dept, "lead", 1), name=f"{dept} lead",
                domain=dept, status="active", provenance="preset",
            ),
        )


def _fmt_row(cells: list[str], widths: list[int]) -> str:
    return "  ".join(c.ljust(w) for c, w in zip(cells, widths))


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description="Merlion plan tournament demo")
    ap.add_argument("brief", help="the task brief to plan")
    ap.add_argument(
        "--models", default="",
        help="comma-separated model ids (e.g. gpt-5.5,opus); empty = baseline only",
    )
    args = ap.parse_args(argv)

    models = [m.strip() for m in args.models.split(",") if m.strip()]

    with tempfile.TemporaryDirectory() as td:
        conn = orchestrate.open_conn(Path(td) / "demo.sqlite")
        try:
            _seed_departments(conn)
            result = tournament.run_tournament(conn, args.brief, models)
        finally:
            conn.close()

    headers = ["", "model", "depts", "feas", "impact", "risk", "cost", "overall", "ms"]
    rows: list[list[str]] = []
    for c in result.candidates:
        star = "★" if c.model == result.recommended_model else " "
        if c.ok and c.plan is not None and c.score is not None:
            n_depts = len({s.subtask.dept for s in c.plan.steps if not s.subtask.is_synthesis})
            rows.append([
                star, c.model, str(n_depts),
                f"{c.score.feasibility:.2f}", f"{c.score.impact:.2f}",
                f"{c.score.risk:.2f}", f"{c.score.cost:.2f}",
                f"{c.overall:.3f}", str(c.latency_ms),
            ])
        else:
            rows.append([star, c.model, "—", "—", "—", "—", "—", "FAILED", str(c.latency_ms)])

    widths = [len(h) for h in headers]
    for r in rows:
        widths = [max(w, len(cell)) for w, cell in zip(widths, r)]

    print(f"\nBrief: {args.brief}")
    print(f"Contestants: {len(result.candidates)} (baseline always entered)\n")
    print(_fmt_row(headers, widths))
    print(_fmt_row(["-" * w for w in widths], widths))
    for r in rows:
        print(_fmt_row(r, widths))
    print(f"\nRecommended (operator decides whether to execute): {result.recommended_model}\n")
    return 0


if __name__ == "__main__":
    sys.exit(main())
