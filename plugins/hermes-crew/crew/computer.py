"""Each teammate's own computer.

The product claim is "a private container with a persistent /workspace, a bash
shell, and a real browser whose logins persist". Hermes already ships every
piece of that; this module only points them at each other.

* **Shell and files** — Hermes's Docker terminal backend is already
  ``docker run -d`` + ``docker exec`` with per-``task_id`` reuse across
  processes and a per-``task_id`` persistent bind mount at ``/workspace``
  (``tools/environments/docker.py``). Give a teammate
  ``task_id = "crew-<bot_id>"`` and it has its own machine — ``shell_exec``,
  ``read_file``, ``write_file`` need no crew-specific code at all.
* **Browser** — the container runs a *headed* Chromium under Xvfb with CDP
  relayed to a published port. Hermes's browser tools already attach to an
  arbitrary CDP endpoint via ``BROWSER_CDP_URL``
  (``tools/browser_tool.py::_get_cdp_override``), so pointing that at the
  container gives the teammate the full ariaSnapshot browser surface —
  strictly better than the four hand-rolled ``browser_*`` tools OpenGrokBot
  needed, and again with no new tool code.
* **The screen** — the same X display is served over noVNC on another
  published port. That is what makes ``ask_for_login`` possible: the operator
  takes the wheel, signs in once, and the session persists in
  ``/workspace/.browser`` across container restarts.

Ports are published as ``127.0.0.1::<port>`` — loopback only, host port chosen
by Docker. That is deliberate on both counts: a teammate's screen must never be
reachable off-box, and a fixed host port would collide the moment a second
teammate started. The cost is that host ports change on every container
restart, so :func:`endpoints` re-reads them from ``docker inspect`` rather than
trusting a cache (the same trap OpenGrokBot's pool hit).
"""

from __future__ import annotations

import json
import logging
import re
import subprocess
from pathlib import Path
from typing import Any, Optional

log = logging.getLogger(__name__)

#: Built by ``docker build -t hermes/crew-computer docker/crew-computer``.
DEFAULT_CREW_IMAGE = "hermes/crew-computer:latest"

#: Ports the crew-computer image exposes.
NOVNC_PORT = 6080
CDP_PORT = 9222

#: Publish on loopback with a Docker-assigned host port. See module docstring.
CREW_DOCKER_EXTRA_ARGS = [
    "-p", f"127.0.0.1::{NOVNC_PORT}",
    "-p", f"127.0.0.1::{CDP_PORT}",
]

_SAFE_ID = re.compile(r"^[a-zA-Z0-9._-]+$")
_SCREENSHOT_FILE = re.compile(r"^\d+\.png$")


def crew_image() -> str:
    from hermes_cli.config import cfg_get, load_config_readonly

    configured = cfg_get(load_config_readonly(), "crew", "computer_image", default="") or ""
    return str(configured).strip() or DEFAULT_CREW_IMAGE


def task_id_for(bot_id: str) -> str:
    """The container key for this teammate.

    ``tools/terminal_tool.py`` collapses most task ids back to ``"default"`` so
    subagents share one container; it keeps an id distinct only when that id has
    an override registered under an *isolation key* (``docker_image`` /
    ``env_type``). :func:`terminal_overrides` always supplies both, which is
    what buys each teammate a machine of its own.
    """
    return f"crew-{bot_id}"


def terminal_overrides(bot_id: str) -> dict[str, Any]:
    """Per-turn sandbox settings for one teammate.

    Registered with ``tools.terminal_tool.register_task_env_overrides`` at the
    start of a turn. Doing it per turn rather than through process-global
    ``TERMINAL_*`` env vars is what lets one dashboard process run turns for
    several teammates — and for non-crew profiles — without them fighting over
    one container config.
    """
    return {
        "env_type": "docker",
        "docker_image": crew_image(),
        "cwd": "/workspace",
        "docker_extra_args": CREW_DOCKER_EXTRA_ARGS,
        "container_persistent": True,
    }


def apply_computer_config(cfg: dict, bot_id: str) -> None:
    """Write the computer settings into a teammate's ``config.yaml``.

    The per-turn overrides above only exist inside the crew orchestrator's
    process. A routine that fires in the **gateway** process runs through the
    ordinary agent path, where the terminal backend is resolved from
    ``config.yaml`` bridged to ``TERMINAL_*`` (``gateway/run.py``). That
    process serves one profile's turn at a time, so per-profile config is the
    right mechanism there. Both routes land on the same container because both
    resolve the same image and the same ``/workspace``.
    """
    terminal = cfg.setdefault("terminal", {})
    terminal["backend"] = "docker"
    terminal["docker_image"] = crew_image()
    terminal["cwd"] = "/workspace"
    terminal["container_persistent"] = True
    terminal["docker_persist_across_processes"] = True
    existing = list(terminal.get("docker_extra_args") or [])
    for flag, value in zip(CREW_DOCKER_EXTRA_ARGS[::2], CREW_DOCKER_EXTRA_ARGS[1::2]):
        if value not in existing:
            existing.extend([flag, value])
    terminal["docker_extra_args"] = existing


# ---------------------------------------------------------------------------
# Container discovery
# ---------------------------------------------------------------------------


def _docker() -> Optional[str]:
    from tools.environments.docker import find_docker

    return find_docker()


def _run_docker(args: list[str], timeout: int = 15) -> Optional[str]:
    """Run a docker CLI command, returning stdout or ``None`` on any failure.

    Every caller here is answering "is there a screen to show?", and the honest
    answer when Docker is unreachable is "no" — not a traceback in the panel.
    """
    docker = _docker()
    if not docker:
        return None
    try:
        proc = subprocess.run(
            [docker, *args],
            capture_output=True,
            text=True,
            timeout=timeout,
            check=False,
            stdin=subprocess.DEVNULL,
        )
    except (subprocess.TimeoutExpired, OSError) as exc:
        log.debug("crew: docker %s failed: %s", args[:1], exc)
        return None
    if proc.returncode != 0:
        log.debug("crew: docker %s returned %d: %s", args[:1], proc.returncode, proc.stderr.strip())
        return None
    return proc.stdout


def container_id(bot_id: str) -> Optional[str]:
    """Find this teammate's running container by its Hermes task label."""
    from tools.environments.docker import _sanitize_label_value

    out = _run_docker([
        "ps",
        "--filter", "label=hermes-agent=1",
        "--filter", f"label=hermes-task-id={_sanitize_label_value(task_id_for(bot_id))}",
        "--filter", "status=running",
        "--format", "{{.ID}}",
    ])
    if not out:
        return None
    ids = [line.strip() for line in out.splitlines() if line.strip()]
    return ids[0] if ids else None


def _published_port(ports: dict, container_port: int) -> Optional[int]:
    """Read the loopback host port Docker assigned to ``container_port``."""
    bindings = ports.get(f"{container_port}/tcp") or []
    for binding in bindings:
        host_ip = binding.get("HostIp") or ""
        host_port = binding.get("HostPort") or ""
        if host_port and host_ip in ("127.0.0.1", "::1", ""):
            try:
                return int(host_port)
            except ValueError:
                continue
    return None


def endpoints(bot_id: str) -> dict:
    """Return ``{running, vnc_url, cdp_url, container_id, error?}``.

    Always re-reads from ``docker inspect``: a restarted container keeps its
    name and labels but gets brand-new host ports, so a cached URL silently
    points at nothing (or, worse, at another container that has since taken
    the port).
    """
    cid = container_id(bot_id)
    if not cid:
        return {"running": False, "vnc_url": None, "cdp_url": None, "container_id": None}

    raw = _run_docker(["inspect", "--format", "{{json .NetworkSettings.Ports}}", cid])
    if not raw:
        return {
            "running": True,
            "vnc_url": None,
            "cdp_url": None,
            "container_id": cid,
            "error": "Could not read the container's published ports.",
        }
    try:
        ports = json.loads(raw.strip() or "{}") or {}
    except json.JSONDecodeError:
        ports = {}

    vnc = _published_port(ports, NOVNC_PORT)
    cdp = _published_port(ports, CDP_PORT)
    result = {
        "running": True,
        "container_id": cid,
        "vnc_url": f"http://127.0.0.1:{vnc}" if vnc else None,
        "cdp_url": f"http://127.0.0.1:{cdp}" if cdp else None,
        # The WebSocket websockify serves on the same port. This is what the
        # noVNC RFB client connects to directly — see `vnc_session()`.
        "vnc_ws_url": f"ws://127.0.0.1:{vnc}/websockify" if vnc else None,
    }
    if not vnc:
        result["error"] = (
            "This teammate's container is running but its screen port is not published. "
            "It was probably started before the crew computer settings were applied — "
            f"`docker rm -f {cid[:12]}` and it will come back configured."
        )
    return result


def vnc_session(bot_id: str, *, start: bool = False) -> Optional[dict]:
    """Return an Errand ``CloudComputerSession``, or ``None`` when there is no screen.

    ``{url, protocols, mode}`` is exactly what the ported ``VncSurface`` feeds
    to ``new RFB(target, session.url, {wsProtocols: session.protocols})``.
    Driving the RFB client directly — rather than pointing an iframe at
    ``vnc.html`` — is what buys the things that matter for *this* container:

    * a **view-only** mode, so the thread can show a live preview that the
      operator cannot accidentally type into, separate from taking the wheel;
    * a first-frame deadline. Xvfb + x11vnc will happily accept a connection
      before Chromium has painted anything, and "connected but black forever"
      is this image's most likely failure. An iframe cannot tell the difference;
      the RFB client plus ``canvasHasVisualFrame`` can.

    ``protocols`` is empty because websockify on loopback needs no ticket —
    there is no gateway to authenticate to. The field stays in the shape so the
    component is unmodified and a future remote computer can fill it.
    """
    info = ensure(bot_id) if start else endpoints(bot_id)
    url = info.get("vnc_ws_url")
    if not url:
        return None
    return {"url": url, "protocols": [], "mode": "remote"}


def cloud_computer(bot_id: str) -> dict:
    """Errand's ``CloudComputer`` shape for the detail panel.

    ``starting`` is reported when the container is up but has not published a
    screen yet, which is the window where the panel should say "starting" rather
    than offering a Connect button that would fail.
    """
    info = endpoints(bot_id)
    if not info.get("running"):
        status = "offline"
    elif info.get("vnc_ws_url"):
        status = "online"
    else:
        status = "starting"
    computer = {
        "id": task_id_for(bot_id),
        "agentId": bot_id,
        "runtimeName": task_id_for(bot_id),
        "status": status,
        "capabilities": ["open", "takeover"],
    }
    if info.get("error"):
        computer["error"] = info["error"]
    return computer


def ensure(bot_id: str, *, timeout: int = 120) -> dict:
    """Start the teammate's container if it is not up, then return endpoints.

    Rather than reimplementing container lifecycle, this runs a no-op command
    through the ordinary terminal tool: the same create-or-reuse path a real
    tool call would take, so there is exactly one way a crew container comes
    into existence and it is the one that is already tested.

    Called when ``ask_for_login`` fires and when the operator opens the panel,
    so the screen is live by the time they look at it.
    """
    from tools.terminal_tool import register_task_env_overrides, terminal_tool

    task_id = task_id_for(bot_id)
    register_task_env_overrides(task_id, terminal_overrides(bot_id))
    try:
        terminal_tool(command="true", task_id=task_id, timeout=timeout, force=True)
    except Exception as exc:  # noqa: BLE001 — reported to the operator, not raised
        log.exception("crew: could not start the computer for %s", bot_id)
        return {
            "running": False,
            "vnc_url": None,
            "cdp_url": None,
            "container_id": None,
            "error": f"Could not start this teammate's computer: {exc}",
        }
    return endpoints(bot_id)


def bind_browser(bot_id: str, cdp_url: Optional[str]) -> bool:
    """Point this teammate's browser tools at the browser in its container.

    Seeds ``tools.browser_tool._active_sessions[task_id]`` with a CDP session.
    ``_get_session_info`` returns a cached entry for a known task id before it
    consults anything else, and ``session_info["cdp_url"]`` is what becomes
    ``agent-browser --cdp <url>``, so every ``browser_*`` call made during this
    teammate's turn drives the headed Chromium on its own screen.

    Deliberately **not** ``BROWSER_CDP_URL``: that env var is process-global,
    and the whole point of the crew is that one process runs turns for several
    teammates. Keying on ``task_id`` keeps each teammate's browser its own.
    An operator who has set ``browser.cdp_url`` by hand still wins — that is
    ``_get_cdp_override``'s job and we do not fight it.

    Returns whether a binding was installed.
    """
    if not cdp_url:
        return False
    try:
        from tools import browser_tool

        task_id = task_id_for(bot_id)
        with browser_tool._cleanup_lock:  # noqa: SLF001 — the module's own guard
            existing = browser_tool._active_sessions.get(task_id)  # noqa: SLF001
            if existing and existing.get("cdp_url") == cdp_url:
                return True
            browser_tool._active_sessions[task_id] = browser_tool._create_cdp_session(  # noqa: SLF001
                task_id, cdp_url
            )
        return True
    except Exception:
        log.debug("crew: could not bind the browser for %s", bot_id, exc_info=True)
        return False


def unbind_browser(bot_id: str) -> None:
    """Drop a stale CDP binding so the next turn re-reads the host port.

    A restarted container keeps its name but is handed new host ports, so a
    binding that outlives the container points at nothing.
    """
    try:
        from tools import browser_tool

        with browser_tool._cleanup_lock:  # noqa: SLF001
            browser_tool._active_sessions.pop(task_id_for(bot_id), None)  # noqa: SLF001
    except Exception:
        pass


# ---------------------------------------------------------------------------
# Workspace + screenshots
# ---------------------------------------------------------------------------


def workspace_dir(bot_id: str) -> Path:
    """The host side of the teammate's ``/workspace`` bind mount.

    Mirrors ``DockerEnvironment``'s own layout
    (``<sandbox_dir>/docker/<task_id>/workspace``) so the operator, the
    teammate, and the screenshot route are all looking at one directory.
    """
    from tools.environments.base import get_sandbox_dir

    return get_sandbox_dir() / "docker" / task_id_for(bot_id) / "workspace"


def screenshot_dir(bot_id: str) -> Path:
    return workspace_dir(bot_id) / "screenshots"


def screenshot_file_path(bot_id: str, filename: str) -> Optional[Path]:
    """Resolve a screenshot path, or ``None`` when the request is not one.

    Both components are matched against strict allowlists rather than being
    sanitised: the route is reachable from a browser, and ``..`` in either
    position would otherwise walk out of the workspace and serve ``crew.db``.
    Ported, with its test, from OpenGrokBot's ``screenshots.ts``.
    """
    if not _SAFE_ID.match(bot_id or "") or bot_id == "..":
        return None
    if not _SCREENSHOT_FILE.match(filename or ""):
        return None
    return screenshot_dir(bot_id) / filename
