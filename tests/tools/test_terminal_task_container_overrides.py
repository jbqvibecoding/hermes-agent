"""Per-task overrides must reach ``container_config``, not just the image.

``register_task_env_overrides`` has always let a caller pick a per-task sandbox
image, but everything that makes that image *usable* — published ports, bind
mounts, resource limits, network — was read from the process-global
``TERMINAL_*`` config. That meant two tasks needing different container shapes
inside one process had to fight over the same env vars.

These tests pin the completed behaviour: an override wins for any
``container_config`` key, and absent an override the global config is used
exactly as before.
"""

import threading
from unittest.mock import MagicMock, patch

import tools.terminal_tool as terminal_tool


def _env_config(**overrides):
    base = {
        "env_type": "docker",
        "docker_image": "global-image:latest",
        "singularity_image": "docker://test",
        "modal_image": "test",
        "daytona_image": "test",
        "cwd": "/workspace",
        "host_cwd": None,
        "timeout": 180,
        "modal_mode": "auto",
        "container_cpu": 1,
        "container_memory": 5120,
        "container_disk": 51200,
        "container_persistent": True,
        "docker_volumes": [],
        "docker_extra_args": [],
        "docker_env": {},
        "docker_forward_env": [],
        "docker_network": True,
        "docker_mount_cwd_to_workspace": False,
        "docker_run_as_host_user": False,
        "docker_persist_across_processes": True,
        "docker_orphan_reaper": False,
        "ssh_persistent": False,
        "local_persistent": False,
    }
    base.update(overrides)
    return base


def _run(env_config, task_id, task_env_overrides=None):
    """Drive one terminal command and capture what the environment got."""
    captured = {}

    def fake_create_env(**kwargs):
        captured.update(kwargs)
        env = MagicMock()
        env.execute.return_value = {"output": "", "exit_code": 0, "error": None}
        return env

    with patch("tools.terminal_tool._get_env_config", return_value=env_config), \
         patch("tools.terminal_tool._task_env_overrides", task_env_overrides or {}), \
         patch("tools.terminal_tool._active_environments", {}), \
         patch("tools.terminal_tool._creation_locks", {}), \
         patch("tools.terminal_tool._creation_locks_lock", threading.Lock()), \
         patch("tools.terminal_tool._create_environment", side_effect=fake_create_env), \
         patch("tools.terminal_tool._start_cleanup_thread"), \
         patch("tools.terminal_tool._check_disk_usage_warning"), \
         patch("tools.terminal_tool._maybe_reap_docker_orphans"):
        terminal_tool.terminal_tool(command="true", task_id=task_id, force=True)

    return captured


def test_container_config_falls_back_to_the_global_config():
    captured = _run(_env_config(docker_extra_args=["--cap-add", "SYS_PTRACE"]), "plain")
    assert captured["container_config"]["docker_extra_args"] == ["--cap-add", "SYS_PTRACE"]
    assert captured["container_config"]["container_memory"] == 5120


def test_a_per_task_override_wins_for_container_config_keys():
    overrides = {
        "isolated": {
            "env_type": "docker",
            "docker_image": "task-image:latest",
            "docker_extra_args": ["-p", "127.0.0.1::6080"],
            "container_memory": 2048,
        }
    }
    captured = _run(_env_config(), "isolated", overrides)

    assert captured["image"] == "task-image:latest"
    assert captured["container_config"]["docker_extra_args"] == ["-p", "127.0.0.1::6080"]
    assert captured["container_config"]["container_memory"] == 2048
    # Keys the caller did not override still come from the global config.
    assert captured["container_config"]["container_disk"] == 51200


def test_an_image_override_still_isolates_the_container():
    """An isolation-keyed override keeps its own task id, so its sandbox is its own."""
    overrides = {"mine": {"env_type": "docker", "docker_image": "mine:latest"}}
    captured = _run(_env_config(), "mine", overrides)
    assert captured["task_id"] == "mine"


def test_a_cwd_only_override_still_shares_the_default_container():
    """A workspace-tracking override is not an isolation signal — unchanged behaviour."""
    overrides = {"session-a": {"cwd": "/workspace/project"}}
    captured = _run(_env_config(), "session-a", overrides)
    assert captured["task_id"] == "default"
