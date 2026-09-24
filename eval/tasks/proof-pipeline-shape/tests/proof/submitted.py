"""Per-task submitted-proof check for proof-pipeline-shape. Ported from the previous scorer."""
import json
import re
import sys
from pathlib import Path

sys.path.insert(0, "/tests")
from consult_lib import hidden_check_passes  # noqa: E402,F401


def read(path: Path) -> str:
    return path.read_text() if path.exists() else ""

def submitted_proof(workspace: Path) -> bool:
    tests = read(workspace / "test" / "pipeline.test.js")
    return (
        bool(re.search(r"\bvalid\b", tests))
        and bool(re.search(r"\berrors\b", tests))
        and bool(re.search(r"(deepEqual|deepStrictEqual|toEqual)", tests))
        and bool(re.search(r"(duplicate|dedupe|same\s+email|second\s+occurrence)", tests, re.IGNORECASE))
        and bool(re.search(r"(reason|invalid|malformed|unable|cannot)", tests, re.IGNORECASE))
    )
