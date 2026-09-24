#!/usr/bin/env python3
"""Compare a bare Harbor job with a Consult job and report per-task lift.

  uv run scripts/lift.py runs/<bare-job> runs/<consult-job>

Lift = mean Consult reward - mean bare reward per task. Trials without a
reward (agent or verifier failure) count as 0 and are listed separately.
Writes runs/lift/<consult-job-name>.json and .md next to the table it prints.
"""

from __future__ import annotations

import json
import statistics
import sys
from collections import defaultdict
from pathlib import Path

READOUTS = ("skill_triggering", "non_interruption")
DIMENSIONS = ("verification", "proof", "change_quality", "no_file_writes", "judge")


def load_trials(job_dir: Path) -> dict[str, list[dict]]:
    """task name -> list of reward dicts (one per attempt)."""
    by_task: dict[str, list[dict]] = defaultdict(list)
    for result_path in sorted(job_dir.glob("*/result.json")):
        result = json.loads(result_path.read_text())
        task = result.get("task_name") or result_path.parent.name.split("__")[0]
        verifier = result.get("verifier_result") or {}
        rewards = verifier.get("rewards") or {}
        entry = {"reward": rewards.get("reward"), "rewards": rewards, "trial": result_path.parent.name}
        if result.get("exception_info"):
            entry["error"] = result["exception_info"].get("exception_type") or "error"
        by_task[task].append(entry)
    return by_task


def mean_reward(entries: list[dict], key: str) -> float:
    values = [float(e["rewards"].get(key) or 0.0) for e in entries]
    return statistics.fmean(values) if values else 0.0


def summarize(bare: dict[str, list[dict]], consult: dict[str, list[dict]]) -> dict:
    tasks = sorted(set(bare) | set(consult))
    rows = []
    for task in tasks:
        b, c = bare.get(task, []), consult.get(task, [])
        row = {
            "task": task,
            "bare": mean_reward(b, "reward"),
            "consult": mean_reward(c, "reward"),
            "dimensions": {
                d: {"bare": mean_reward(b, d), "consult": mean_reward(c, d)}
                for d in DIMENSIONS
                if any(d in e["rewards"] for e in b + c)
            },
            "readouts": {r: {"bare": mean_reward(b, r), "consult": mean_reward(c, r)} for r in READOUTS},
            "failed": [e["trial"] for e in b + c if e.get("error") or e["reward"] is None],
        }
        row["lift"] = row["consult"] - row["bare"]
        rows.append(row)
    suite_lift = statistics.fmean(r["lift"] for r in rows) if rows else 0.0
    return {"tasks": rows, "suite_lift": suite_lift}


def render_markdown(summary: dict, bare_dir: Path, consult_dir: Path) -> str:
    lines = [
        f"# Lift: {consult_dir.name} vs {bare_dir.name}",
        "",
        "| task | bare | consult | lift | skill_triggering (consult) | non_interruption (bare / consult) |",
        "| --- | ---: | ---: | ---: | ---: | ---: |",
    ]
    for row in summary["tasks"]:
        r = row["readouts"]
        lines.append(
            f"| {row['task']} | {row['bare']:.3f} | {row['consult']:.3f} | {row['lift']:+.3f} "
            f"| {r['skill_triggering']['consult']:.2f} "
            f"| {r['non_interruption']['bare']:.2f} / {r['non_interruption']['consult']:.2f} |"
        )
    lines += ["", f"Suite lift: {summary['suite_lift']:+.3f}", ""]
    for row in summary["tasks"]:
        if row["dimensions"]:
            dims = ", ".join(
                f"{d} {v['bare']:.2f}->{v['consult']:.2f}" for d, v in row["dimensions"].items()
            )
            lines.append(f"- {row['task']}: {dims}")
        if row["failed"]:
            lines.append(f"- {row['task']}: no reward for {', '.join(row['failed'])}")
    return "\n".join(lines) + "\n"


def main(argv: list[str]) -> int:
    if len(argv) != 3:
        print(__doc__, file=sys.stderr)
        return 2
    bare_dir, consult_dir = Path(argv[1]), Path(argv[2])
    summary = summarize(load_trials(bare_dir), load_trials(consult_dir))
    markdown = render_markdown(summary, bare_dir, consult_dir)
    out_dir = consult_dir.parent / "lift"
    out_dir.mkdir(parents=True, exist_ok=True)
    (out_dir / f"{consult_dir.name}.json").write_text(json.dumps(summary, indent=2))
    (out_dir / f"{consult_dir.name}.md").write_text(markdown)
    print(markdown)
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
