"""Per-task submitted-proof check for proof-validator-error-content. Ported from the previous scorer."""
import json
import re
import sys
from pathlib import Path

sys.path.insert(0, "/tests")
from consult_lib import hidden_check_passes  # noqa: E402,F401


def read(path: Path) -> str:
    return path.read_text() if path.exists() else ""

def submitted_proof(workspace: Path) -> bool:
    tests = read(workspace / "test" / "signup.test.js")
    fields_covered = all(
        re.search(rf"errors\.{f}\b|errors\[[\"']{f}[\"']\]", tests) for f in ("email", "password", "age", "country")
    )
    asserts_message_content = bool(re.search(r"(assert\.match|\.includes\([\"']|\.toMatch|\.toContain)", tests))
    return fields_covered and asserts_message_content
