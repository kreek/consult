"""Per-task submitted-proof check for debugging-regression. Ported from the previous scorer."""
import json
import re
import sys
from pathlib import Path

sys.path.insert(0, "/tests")
from consult_lib import hidden_check_passes  # noqa: E402,F401


def read(path: Path) -> str:
    return path.read_text() if path.exists() else ""

def submitted_proof(workspace: Path) -> bool:
    tests = read(workspace / "test" / "profile.test.js")
    return (
        "preferences" in tests
        and bool(re.search(r"notEqual|notStrictEqual", tests))
        and bool(re.search(r"__proto__|constructor|prototype", tests))
    )
