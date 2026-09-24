"""Per-task submitted-proof check for design-decision-record. Ported from the previous scorer."""
import json
import re
import sys
from pathlib import Path

sys.path.insert(0, "/tests")
from consult_lib import hidden_check_passes  # noqa: E402,F401


def read(path: Path) -> str:
    return path.read_text() if path.exists() else ""

def submitted_proof(workspace: Path) -> bool:
    content = read(workspace / "docs" / "checkout-validation.md")
    return all(re.search(p, content, re.IGNORECASE) for p in (r"\bcontext\b", r"\bdecision\b", r"\balternatives?\b"))
