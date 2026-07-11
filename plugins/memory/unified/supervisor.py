"""SidecarSupervisor — manages the unified memory sidecar process.

On initialize(), checks if the sidecar is already running. If not, starts
it as a subprocess (``python -m hindsight_unified.server``) and waits for
/health to become available.

Ported from the memory_tencentdb GatewaySupervisor; the launch command is a
Python module instead of a Node script, and auto-discovery looks for the
hindsight-unified package instead of server.ts.
"""

from __future__ import annotations

import logging
import os
import shlex
import subprocess
import sys
import time
from pathlib import Path
from typing import IO, Optional

from .client import UnifiedMemoryClient

logger = logging.getLogger(__name__)

DEFAULT_HOST = "127.0.0.1"
DEFAULT_PORT = 8766

HEALTH_CHECK_INTERVAL = 0.5   # seconds between checks
HEALTH_CHECK_MAX_WAIT = 60    # brain init (DB+models) can be slow on first start
HEALTH_CHECK_RETRIES = 3      # retries for is_running check

LOG_TAIL_BYTES_ON_CRASH = 2048


def discover_sidecar_cmd() -> Optional[str]:
    """Best-effort fallback to locate the sidecar when no CMD env is set.

    Resolution order:
      1. ``hindsight_unified`` importable in the current interpreter →
         ``<python> -m hindsight_unified.server``.
      2. A ``hindsight/hindsight-unified`` checkout in well-known places
         (sibling of the hermes-agent tree, ``~/hindsight``, ``~/.hermes``)
         → run with cwd-injected PYTHONPATH.

    Never raises; returns None when nothing is found.
    """
    python = sys.executable or "python3"

    try:
        import hindsight_unified  # noqa: F401

        return f"{shlex.quote(python)} -m hindsight_unified.server"
    except Exception:
        pass

    here = Path(__file__).resolve()
    candidates = []
    # plugins/memory/unified/supervisor.py -> hermes-agent root -> its parent
    try:
        repo_parent = here.parents[4]
        candidates.append(repo_parent / "hindsight" / "hindsight-unified")
    except IndexError:
        pass
    home_raw = os.environ.get("HOME") or os.environ.get("USERPROFILE")
    if home_raw:
        home = Path(home_raw)
        candidates.append(home / "hindsight" / "hindsight-unified")
        candidates.append(home / ".hermes" / "hindsight-unified")

    for cand in candidates:
        try:
            if (cand / "hindsight_unified" / "server.py").is_file():
                inner = (
                    f"cd {shlex.quote(str(cand))} && "
                    f"exec {shlex.quote(python)} -m hindsight_unified.server"
                )
                logger.info(
                    "unified memory sidecar auto-discovered at %s "
                    "(override with UNIFIED_MEMORY_SIDECAR_CMD)",
                    cand,
                )
                return f"sh -c {shlex.quote(inner)}"
        except OSError:
            continue
    return None


class SidecarSupervisor:
    """Manages the unified memory sidecar lifecycle."""

    def __init__(
        self,
        host: str = DEFAULT_HOST,
        port: int = DEFAULT_PORT,
        sidecar_cmd: Optional[str] = None,
    ):
        self._host = host
        self._port = port
        self._base_url = f"http://{host}:{port}"
        self._client = UnifiedMemoryClient(base_url=self._base_url, timeout=5)
        self._process: Optional[subprocess.Popen] = None
        # Kept open for the child's lifetime so the kernel pipe buffer never
        # fills (a PIPE without a reader deadlocks the child after ~64 KB).
        self._stdout_log: Optional[IO[bytes]] = None
        self._stderr_log: Optional[IO[bytes]] = None
        self._stderr_log_path: Optional[str] = None
        self._sidecar_cmd = (
            sidecar_cmd
            or os.environ.get("UNIFIED_MEMORY_SIDECAR_CMD", "")
            or discover_sidecar_cmd()
            or ""
        )

    def is_running(self) -> bool:
        """Check if the sidecar is currently responding to health checks."""
        for _ in range(HEALTH_CHECK_RETRIES):
            try:
                result = self._client.health(timeout=2)
                return result.get("status") in ("ok", "degraded")
            except Exception:
                time.sleep(0.2)
        return False

    def is_process_alive(self) -> bool:
        """True iff we spawned a child and it has not exited (no HTTP cost)."""
        proc = self._process
        if proc is None:
            return False
        return proc.poll() is None

    def _reap_dead_process(self) -> None:
        """Drop the reference to a spawned child that has since exited."""
        proc = self._process
        if proc is None or proc.poll() is None:
            return
        logger.warning(
            "unified memory sidecar: previous child exited (code=%s); "
            "reaping before respawn.", proc.returncode,
        )
        self._process = None
        self._close_log_handles()

    def ensure_running(self) -> bool:
        """Ensure the sidecar is running. Start it if not."""
        if self.is_running():
            logger.info("unified memory sidecar already running at %s", self._base_url)
            return True

        self._reap_dead_process()

        if not self._sidecar_cmd:
            logger.warning(
                "unified memory sidecar is not running and no launch command was "
                "found. Set UNIFIED_MEMORY_SIDECAR_CMD or install hindsight-unified "
                "into this environment. Unified memory will be unavailable."
            )
            return False

        logger.info("Starting unified memory sidecar: %s", self._sidecar_cmd)

        try:
            env = os.environ.copy()
            env["UNIFIED_MEMORY_GATEWAY_HOST"] = self._host
            env["UNIFIED_MEMORY_GATEWAY_PORT"] = str(self._port)

            log_dir = self._resolve_log_dir()
            try:
                os.makedirs(log_dir, exist_ok=True)
            except OSError as e:
                logger.warning(
                    "unified memory sidecar: failed to create log dir %s (%s); "
                    "falling back to DEVNULL", log_dir, e,
                )
                log_dir = None

            if log_dir is not None:
                stdout_path = os.path.join(log_dir, "sidecar.stdout.log")
                stderr_path = os.path.join(log_dir, "sidecar.stderr.log")
                self._stdout_log = open(stdout_path, "ab", buffering=0)
                self._stderr_log = open(stderr_path, "ab", buffering=0)
                self._stderr_log_path = stderr_path
                stdout_target: object = self._stdout_log
                stderr_target: object = self._stderr_log
            else:
                stdout_target = subprocess.DEVNULL
                stderr_target = subprocess.DEVNULL

            self._process = subprocess.Popen(
                shlex.split(self._sidecar_cmd),
                env=env,
                stdout=stdout_target,
                stderr=stderr_target,
                start_new_session=True,
            )
        except Exception as e:
            logger.error("Failed to start unified memory sidecar: %s", e)
            self._close_log_handles()
            return False

        return self._wait_for_health()

    def _resolve_log_dir(self) -> str:
        env_dir = os.environ.get("UNIFIED_MEMORY_LOG_DIR")
        if env_dir:
            return env_dir
        home = os.environ.get("HOME") or os.environ.get("USERPROFILE")
        if home:
            return os.path.join(home, ".hermes", "logs", "unified_memory")
        return os.path.join(os.getcwd(), ".unified-memory-logs")

    def _close_log_handles(self) -> None:
        for attr in ("_stdout_log", "_stderr_log"):
            handle: Optional[IO[bytes]] = getattr(self, attr, None)
            if handle is not None:
                try:
                    handle.close()
                except Exception:
                    pass
                setattr(self, attr, None)

    def _tail_stderr_log(self, max_bytes: int = LOG_TAIL_BYTES_ON_CRASH) -> str:
        path = self._stderr_log_path
        if not path:
            return ""
        try:
            size = os.path.getsize(path)
            with open(path, "rb") as f:
                if size > max_bytes:
                    f.seek(-max_bytes, os.SEEK_END)
                return f.read().decode("utf-8", errors="replace")
        except Exception:
            return ""

    def _wait_for_health(self) -> bool:
        start = time.monotonic()
        while time.monotonic() - start < HEALTH_CHECK_MAX_WAIT:
            if self._process and self._process.poll() is not None:
                rc = self._process.returncode
                stderr = self._tail_stderr_log()[:500]
                logger.error(
                    "unified memory sidecar exited with code %d during startup. "
                    "stderr_log=%s tail=%s",
                    rc, self._stderr_log_path or "<none>", stderr,
                )
                self._close_log_handles()
                return False

            try:
                result = self._client.health(timeout=2)
                if result.get("status") in ("ok", "degraded"):
                    logger.info(
                        "unified memory sidecar is ready (took %.1fs, status=%s)",
                        time.monotonic() - start, result.get("status"),
                    )
                    return True
            except Exception:
                pass

            time.sleep(HEALTH_CHECK_INTERVAL)

        logger.error(
            "unified memory sidecar did not become healthy within %ds",
            HEALTH_CHECK_MAX_WAIT,
        )
        return False

    def shutdown(self) -> None:
        """Shut down the managed sidecar process (if we started it)."""
        if self._process is None:
            return

        logger.info("Shutting down unified memory sidecar...")
        try:
            self._process.terminate()
            try:
                self._process.wait(timeout=10)
            except subprocess.TimeoutExpired:
                logger.warning("unified memory sidecar did not exit in 10s, sending SIGKILL")
                self._process.kill()
                self._process.wait(timeout=5)
        except Exception as e:
            logger.warning("Error shutting down unified memory sidecar: %s", e)
        finally:
            self._process = None
            self._close_log_handles()

    @property
    def client(self) -> UnifiedMemoryClient:
        return self._client
