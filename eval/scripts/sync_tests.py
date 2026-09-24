#!/usr/bin/env python3
"""Copy the shared verifier files into every task under eval/tasks.

Harbor uploads only a task's own tests/ directory into the sandbox, so shared
verifier code is vendored into each task. This script is the single writer of
those copies. Run it after editing anything under eval/verifier; run it with
--check in CI to fail on drift.

Per task it writes:
  environment/Dockerfile          from verifier/shared/Dockerfile
  tests/test.sh                   from verifier/shared/test.sh
  tests/consult_lib.py            from verifier/shared/consult_lib.py
  tests/reward.toml               from verifier/shared/reward.<kind>.toml
  tests/<dimension>/...           from verifier/shared/<dimension>/ (kind-dependent set)
  tests/hidden.mjs                from verifier/hidden/<task>.mjs (code tasks)
  tests/judge/instruction.md      from the task's instruction.md

Per-task files it never touches: task.toml, instruction.md, environment/workspace,
solution/, tests/consult.json, tests/proof/submitted.py.
"""

from __future__ import annotations

import argparse
import filecmp
import json
import shutil
import sys
from pathlib import Path

EVAL_DIR = Path(__file__).resolve().parent.parent
TASKS_DIR = EVAL_DIR / "tasks"
SHARED_DIR = EVAL_DIR / "verifier" / "shared"
HIDDEN_DIR = EVAL_DIR / "verifier" / "hidden"

COMMON_DIMENSIONS = ("skill_triggering", "non_interruption", "judge")
DIMENSIONS_BY_KIND = {
    "code": ("verification", "proof", "change_quality", *COMMON_DIMENSIONS),
    "routing": ("no_file_writes", *COMMON_DIMENSIONS),
}


def task_dirs() -> list[Path]:
    return sorted(p for p in TASKS_DIR.iterdir() if (p / "tests" / "consult.json").is_file())


def task_kind(task: Path) -> str:
    kind = json.loads((task / "tests" / "consult.json").read_text()).get("kind")
    if kind not in DIMENSIONS_BY_KIND:
        raise SystemExit(f"{task.name}: consult.json kind must be one of {sorted(DIMENSIONS_BY_KIND)}, got {kind!r}")
    return kind


def planned_copies(task: Path) -> list[tuple[Path, Path]]:
    """(source, destination) pairs for one task."""
    kind = task_kind(task)
    tests = task / "tests"
    pairs = [
        (SHARED_DIR / "Dockerfile", task / "environment" / "Dockerfile"),
        (SHARED_DIR / "test.sh", tests / "test.sh"),
        (SHARED_DIR / "consult_lib.py", tests / "consult_lib.py"),
        (SHARED_DIR / f"reward.{kind}.toml", tests / "reward.toml"),
        (task / "instruction.md", tests / "judge" / "instruction.md"),
    ]
    for dimension in DIMENSIONS_BY_KIND[kind]:
        for source in sorted((SHARED_DIR / dimension).iterdir()):
            if source.is_file():
                pairs.append((source, tests / dimension / source.name))
    if kind == "code":
        hidden = HIDDEN_DIR / f"{task.name}.mjs"
        if not hidden.is_file():
            raise SystemExit(f"{task.name}: missing hidden check {hidden}")
        pairs.append((hidden, tests / "hidden.mjs"))
    return pairs


def sync(check: bool) -> int:
    drift: list[str] = []
    for task in task_dirs():
        for source, dest in planned_copies(task):
            if dest.is_file() and filecmp.cmp(source, dest, shallow=False):
                continue
            if check:
                drift.append(str(dest.relative_to(EVAL_DIR)))
                continue
            dest.parent.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(source, dest)
            shutil.copymode(source, dest)
            print(f"synced {dest.relative_to(EVAL_DIR)}")
    if drift:
        print("verifier files out of sync; run eval/scripts/sync_tests.py:", file=sys.stderr)
        for path in drift:
            print(f"  {path}", file=sys.stderr)
        return 1
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--check", action="store_true", help="report drift without writing")
    args = parser.parse_args()
    return sync(check=args.check)


if __name__ == "__main__":
    raise SystemExit(main())
