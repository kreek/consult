"""Per-task submitted-proof check for large-checkout-workflow. Ported from the previous scorer."""
import json
import re
import sys
from pathlib import Path

sys.path.insert(0, "/tests")
from consult_lib import hidden_check_passes  # noqa: E402,F401


def read(path: Path) -> str:
    return path.read_text() if path.exists() else ""

def submitted_proof(workspace: Path) -> bool:
    tests = read(workspace / "test" / "checkout.test.js")
    return len(re.findall(r"(?:^|\n)\s*test\s*\(", tests)) >= 4
