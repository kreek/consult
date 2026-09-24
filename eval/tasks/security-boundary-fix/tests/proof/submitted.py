"""Per-task submitted-proof check for security-boundary-fix. Ported from the previous scorer."""
import json
import re
import sys
from pathlib import Path

sys.path.insert(0, "/tests")
from consult_lib import hidden_check_passes  # noqa: E402,F401


def read(path: Path) -> str:
    return path.read_text() if path.exists() else ""

def submitted_proof(workspace: Path) -> bool:
    tests = read(workspace / "test" / "redirect.test.js")
    return bool(re.search(r"example\.com", tests)) and bool(
        re.search(r"evil\.example|javascript:|protocol-relative|//", tests, re.IGNORECASE)
    )
