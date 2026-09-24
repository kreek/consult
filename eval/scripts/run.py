#!/usr/bin/env python3
"""Run a Consult suite through Harbor with and without Consult skills, then report lift.

Examples:
  uv run scripts/run.py --suite smoke --agent claude-code --arms bare,consult
  uv run scripts/run.py --suite core --agent codex --arms consult --attempts 3
  uv run scripts/run.py --suite smoke --agent claude-code --install-only

One Harbor job is written and started per arm. The consult arm adds the canonical
skills directory (agents/.agents/skills) to the agent; the bare arm is the same
agent with no skills. Job configs and results land under eval/runs/.
"""

from __future__ import annotations

import argparse
import datetime as dt
import json
import os
import subprocess
import sys
from pathlib import Path

import yaml

EVAL_DIR = Path(__file__).resolve().parent.parent
REPO_DIR = EVAL_DIR.parent
SKILLS_DIR = REPO_DIR / "agents" / ".agents" / "skills"
RUNS_DIR = EVAL_DIR / "runs"
ARMS = ("bare", "consult")


def load_suite(name: str) -> list[str]:
    path = EVAL_DIR / "suites" / f"{name}.yaml"
    if not path.is_file():
        raise SystemExit(f"unknown suite {name!r}; expected {path}")
    trials = yaml.safe_load(path.read_text()).get("trials") or []
    missing = [t for t in trials if not (EVAL_DIR / "tasks" / t / "task.toml").is_file()]
    if missing:
        raise SystemExit(f"suite {name} lists tasks without a Harbor task dir: {', '.join(missing)}")
    return trials


def load_agent(name: str, model: str | None) -> tuple[dict, dict[str, str]]:
    """Agent fragment plus host_env: variables exported to the harbor process.

    Auth toggles such as CODEX_FORCE_AUTH_JSON stay out of the job config on
    purpose. Harbor scrubs the value of every AUTH/TOKEN-named agent env var from
    the persisted trial files, so a literal "1" there corrupts trajectory.json.
    """
    path = EVAL_DIR / "agents" / f"{name}.yaml"
    if not path.is_file():
        raise SystemExit(f"unknown agent {name!r}; expected {path}")
    agent = yaml.safe_load(path.read_text())
    host_env = {k: str(v) for k, v in (agent.pop("host_env", None) or {}).items()}
    if model:
        agent["model_name"] = model
    return agent, host_env


def build_job(args: argparse.Namespace, arm: str, stamp: str, tasks: list[str], agent: dict) -> dict:
    agent = dict(agent)
    agent["skills"] = [str(SKILLS_DIR)] if arm == "consult" else []
    return {
        "job_name": f"{stamp}-{args.suite}-{args.agent}-{arm}",
        "jobs_dir": str(RUNS_DIR),
        "n_attempts": args.attempts,
        "n_concurrent_trials": args.concurrency,
        "install_only": bool(args.install_only),
        "tasks": [{"path": str(EVAL_DIR / "tasks" / t)} for t in tasks],
        "agents": [agent],
    }


def start_job(config_path: Path, extra: list[str], host_env: dict[str, str]) -> Path:
    cmd = ["harbor", "run", "-c", str(config_path), "--yes", *extra]
    print("+", " ".join(f"{k}={v}" for k, v in host_env.items()), " ".join(cmd), flush=True)
    subprocess.run(cmd, check=True, env={**os.environ, **host_env})
    config = json.loads(config_path.read_text())
    return RUNS_DIR / config["job_name"]


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--suite", required=True, help="name of a file under eval/suites/")
    parser.add_argument("--agent", required=True, help="name of a file under eval/agents/")
    parser.add_argument("--arms", default="bare,consult", help="comma-separated subset of bare,consult")
    parser.add_argument("--model", help="override the agent fragment's model_name")
    parser.add_argument("--attempts", type=int, default=1, help="Harbor n_attempts per task")
    parser.add_argument("--concurrency", type=int, default=2, help="Harbor n_concurrent_trials")
    parser.add_argument("--install-only", action="store_true", help="agent setup only; proves wiring and auth")
    parser.add_argument("--no-lift", action="store_true", help="skip the lift report")
    parser.add_argument("harbor_args", nargs="*", help="extra args passed to `harbor run` after --")
    args = parser.parse_args()

    arms = [a.strip() for a in args.arms.split(",") if a.strip()]
    unknown = [a for a in arms if a not in ARMS]
    if unknown:
        raise SystemExit(f"unknown arms {unknown}; choose from {ARMS}")

    tasks = load_suite(args.suite)
    agent, host_env = load_agent(args.agent, args.model)
    stamp = dt.datetime.now().strftime("%Y-%m-%dT%H-%M-%S")
    RUNS_DIR.mkdir(parents=True, exist_ok=True)

    job_dirs: dict[str, Path] = {}
    for arm in arms:
        config = build_job(args, arm, stamp, tasks, agent)
        config_path = RUNS_DIR / f"{config['job_name']}.job.json"
        config_path.write_text(json.dumps(config, indent=2))
        job_dirs[arm] = start_job(config_path, args.harbor_args, host_env)

    if args.no_lift or args.install_only or set(job_dirs) != set(ARMS):
        for arm, job_dir in job_dirs.items():
            print(f"{arm}: {job_dir}")
        return 0
    lift = EVAL_DIR / "scripts" / "lift.py"
    return subprocess.run([sys.executable, str(lift), str(job_dirs["bare"]), str(job_dirs["consult"])]).returncode


if __name__ == "__main__":
    raise SystemExit(main())
