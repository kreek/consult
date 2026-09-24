"""Shared verifier helpers for Consult Harbor tasks.

Synced from eval/verifier/shared/consult_lib.py into every task's tests/ by
eval/scripts/sync_tests.py. Do not edit the copy under tests/.

Pure helpers over the workspace (/app) and the ATIF trajectory
(/logs/agent/trajectory.json). Dimension scripts under tests/<dim>/ import this
module and register their own rewardkit criteria. Standard library only, so
`python3 consult_lib.py bundle` also runs outside rewardkit to build the judge
bundle.
"""

from __future__ import annotations

import json
import re
import subprocess
import sys
from dataclasses import dataclass, field
from pathlib import Path

TESTS_DIR = Path("/tests")
TRAJECTORY_PATH = Path("/logs/agent/trajectory.json")

COMMAND_TOOL_RE = re.compile(
    r"\b(command_execution|exec_command|bash|shell|terminal|run_command|write_stdin)\b",
    re.IGNORECASE,
)
WRITE_TOOL_RE = re.compile(
    r"^(Write|Edit|MultiEdit|NotebookEdit|apply_patch|write_file|create_file|str_replace_editor)$",
    re.IGNORECASE,
)
# Shell writes: apply_patch, tee, sed -i, or a redirect that is not stderr or
# /dev/null. `git status` is the authoritative signal; this only catches writes
# the agent reverted before the verifier ran.
WRITE_COMMAND_RE = re.compile(r"apply_patch|(?<![0-9&])>\s*(?!/dev/null|&)\S|\btee\b|\bsed\s+-i\b")
SKILL_PATH_RE = re.compile(r"skills/([a-z][a-z0-9-]*)/SKILL\.md")
SKILL_INVOCATION_TOOLS = {"Skill", "SlashCommand"}
POST_WRITE_PROOF_RE = re.compile(
    r"\b(npm\s+test|npm\s+run\s+(test|typecheck|lint|check)|vitest|pytest|go\s+test|cargo\s+test|mvn\s+test"
    r"|uv\s+run\s+(pytest|ruff|pyright|python)|refcheck|validate[-_]skill[-_]anatomy)\b",
    re.IGNORECASE,
)
COMMAND_FIELDS = ("cmd", "command", "script", "input", "chars")


@dataclass
class ToolCall:
    step_index: int
    name: str
    arguments: dict
    results: list[str] = field(default_factory=list)


@dataclass
class Trajectory:
    steps: list[dict]
    calls: list[ToolCall]

    @property
    def agent_messages(self) -> list[str]:
        return [str(s.get("message") or "") for s in self.steps if s.get("source") == "agent"]


def load_task_meta() -> dict:
    return json.loads((TESTS_DIR / "consult.json").read_text())


def load_trajectory(path: Path = TRAJECTORY_PATH) -> Trajectory:
    if not path.exists():
        return Trajectory(steps=[], calls=[])
    data = json.loads(path.read_text())
    steps = data.get("steps") or []
    calls: list[ToolCall] = []
    for index, step in enumerate(steps):
        calls.extend(_step_calls(index, step))
    return Trajectory(steps=steps, calls=calls)


def _step_calls(index: int, step: dict) -> list[ToolCall]:
    results_by_id: dict[str, list[str]] = {}
    observation = step.get("observation") or {}
    for result in observation.get("results") or []:
        content = result.get("content")
        text = content if isinstance(content, str) else json.dumps(content)
        results_by_id.setdefault(str(result.get("source_call_id")), []).append(text)
    calls = []
    for call in step.get("tool_calls") or []:
        args = call.get("arguments")
        calls.append(
            ToolCall(
                step_index=index,
                name=str(call.get("function_name") or ""),
                arguments=args if isinstance(args, dict) else {"input": args},
                results=results_by_id.get(str(call.get("tool_call_id")), []),
            )
        )
    return calls


def is_command_call(call: ToolCall) -> bool:
    return bool(COMMAND_TOOL_RE.search(call.name))


def command_text(call: ToolCall) -> str:
    parts = [call.arguments.get(f) for f in COMMAND_FIELDS]
    return " ".join(p for p in parts if isinstance(p, str))


def is_write_call(call: ToolCall) -> bool:
    if WRITE_TOOL_RE.match(call.name):
        return True
    return is_command_call(call) and bool(WRITE_COMMAND_RE.search(command_text(call)))


def read_skill_names(trajectory: Trajectory) -> list[str]:
    """Skills the agent actually read or invoked, by SKILL.md path or Skill tool call."""
    names: set[str] = set()
    for call in trajectory.calls:
        text = json.dumps(call.arguments) + "\n" + "\n".join(call.results)
        names.update(SKILL_PATH_RE.findall(text))
        if call.name in SKILL_INVOCATION_TOOLS:
            names.update(_invoked_skill_names(call.arguments))
    return sorted(names)


def _invoked_skill_names(arguments: dict) -> list[str]:
    text = json.dumps(arguments)
    found = [m.group(1) for m in re.finditer(r"consult[:/]([a-z][a-z0-9-]*)", text)]
    for key in ("skill", "name", "command"):
        value = arguments.get(key)
        if isinstance(value, str):
            found.append(value.split(":")[-1].split("/")[-1].lstrip("/"))
    return found


def question_message_count(trajectory: Trajectory) -> int:
    count = 0
    for message in trajectory.agent_messages:
        lines = [line.strip() for line in message.strip().splitlines() if line.strip()]
        if lines and lines[-1].endswith("?"):
            count += 1
    return count


def has_post_write_proof(trajectory: Trajectory) -> bool:
    write_indexes = [c.step_index for c in trajectory.calls if is_write_call(c)]
    if not write_indexes:
        return False
    last_write = max(write_indexes)
    return any(
        c.step_index > last_write and is_command_call(c) and POST_WRITE_PROOF_RE.search(f"{c.name} {command_text(c)}")
        for c in trajectory.calls
    )


def changed_paths(workspace: Path) -> list[str]:
    result = subprocess.run(
        ["git", "-C", str(workspace), "status", "--porcelain", "--untracked-files=all"],
        capture_output=True,
        text=True,
        check=False,
    )
    paths = []
    for line in result.stdout.splitlines():
        if len(line) > 3:
            paths.append(line[3:].strip().strip('"'))
    return paths


def classify(path: str) -> str:
    if "/test/" in f"/{path}" or path.endswith(".test.js"):
        return "test"
    if path.endswith(".md"):
        return "documentation"
    if "package.json" in path:
        return "config"
    return "source"


def run_command(workspace: Path, argv: list[str], timeout: int) -> tuple[bool, str]:
    try:
        result = subprocess.run(argv, cwd=workspace, capture_output=True, text=True, timeout=timeout, check=False)
    except subprocess.TimeoutExpired:
        return False, f"timed out after {timeout}s: {' '.join(argv)}"
    return result.returncode == 0, (result.stdout + result.stderr)[-4000:]


def visible_tests_pass(workspace: Path, meta: dict) -> bool:
    cmd = meta.get("visible_test_cmd")
    if not cmd:
        return False
    ok, _ = run_command(workspace, ["bash", "-lc", cmd], timeout=120)
    return ok


def hidden_check_passes(workspace: Path) -> bool:
    script = TESTS_DIR / "hidden.mjs"
    if not script.exists():
        return False
    ok, _ = run_command(workspace, ["node", "--input-type=module", "-e", script.read_text()], timeout=60)
    return ok


def final_agent_message(trajectory: Trajectory) -> str:
    messages = [m for m in trajectory.agent_messages if m.strip()]
    return messages[-1] if messages else ""


def build_bundle(workspace: Path) -> str:
    """Judge input: the diff against the committed scaffold plus new files and the final message."""
    diff = subprocess.run(
        ["git", "-C", str(workspace), "diff"], capture_output=True, text=True, check=False
    ).stdout
    untracked = subprocess.run(
        ["git", "-C", str(workspace), "ls-files", "--others", "--exclude-standard"],
        capture_output=True,
        text=True,
        check=False,
    ).stdout.split()
    sections = ["# Changes against the starting repository", "", "## Diff", "", "```diff", diff.strip(), "```", ""]
    for rel in untracked:
        file_path = workspace / rel
        if not file_path.is_file() or file_path.stat().st_size > 64_000:
            continue
        sections += [f"## New file: {rel}", "", "```", file_path.read_text(errors="replace"), "```", ""]
    final = final_agent_message(load_trajectory())
    sections += ["## Final agent message", "", final or "No final message was captured.", ""]
    return "\n".join(sections)


def judge_credentials_present() -> bool:
    import os

    judge = os.environ.get("REWARDKIT_JUDGE", "claude-code")
    if judge.startswith("anthropic/") or judge.lower().startswith("claude"):
        return bool(os.environ.get("CLAUDE_CODE_OAUTH_TOKEN") or os.environ.get("ANTHROPIC_API_KEY"))
    if judge.startswith("openai/") or judge.startswith("gpt"):
        return bool(os.environ.get("OPENAI_API_KEY"))
    return True


def prepare_tests(tests_dir: Path) -> None:
    """Adjust the uploaded tests dir to what this trial can actually score.

    Without a trajectory (the oracle agent, or an agent that failed before
    writing one) the judge cannot include it, so the reference is dropped.
    Without judge credentials, or with CONSULT_EVAL_SKIP_JUDGE set, the judge
    dimension is removed and its weight dropped from reward.toml so the
    programmatic dimensions still produce a reward.
    """
    import os
    import shutil

    quality = tests_dir / "judge" / "quality.toml"
    if quality.exists() and not TRAJECTORY_PATH.exists():
        lines = [l for l in quality.read_text().splitlines() if not l.startswith("atif-trajectory")]
        quality.write_text("\n".join(lines) + "\n")
        sys.stderr.write("consult: no trajectory at /logs/agent/trajectory.json; judge runs without it\n")
    skip = bool(os.environ.get("CONSULT_EVAL_SKIP_JUDGE")) or not judge_credentials_present()
    if skip and (tests_dir / "judge").exists():
        shutil.rmtree(tests_dir / "judge")
        reward = tests_dir / "reward.toml"
        reward.write_text(re.sub(r",\s*judge\s*=\s*[0-9.]+", "", reward.read_text()))
        sys.stderr.write("consult: judge skipped (no credentials or CONSULT_EVAL_SKIP_JUDGE); reward excludes judge\n")


def main(argv: list[str]) -> int:
    if argv[1:2] == ["bundle"]:
        sys.stdout.write(build_bundle(Path(argv[2] if len(argv) > 2 else "/app")))
        return 0
    if argv[1:2] == ["prepare"]:
        prepare_tests(Path(argv[2]) if len(argv) > 2 else TESTS_DIR)
        return 0
    sys.stderr.write("usage: consult_lib.py bundle [workspace] | prepare [tests_dir]\n")
    return 2


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
