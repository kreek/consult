"""Per-task submitted-proof check for large-link-shortener. Ported from the previous scorer."""
import json
import re
import sys
from pathlib import Path

sys.path.insert(0, "/tests")
from consult_lib import hidden_check_passes  # noqa: E402,F401


def read(path: Path) -> str:
    return path.read_text() if path.exists() else ""

def submitted_proof(workspace: Path) -> bool:
    test_dir = workspace / "test"
    combined = ""
    if test_dir.is_dir():
        for entry in sorted(test_dir.iterdir()):
            if entry.suffix in (".js", ".mjs"):
                combined += "\n" + read(entry)
    return (
        bool(re.search(r"\b(shorten|/shorten)\b", combined, re.IGNORECASE))
        and bool(re.search(r"(redirect|location|302|301)", combined, re.IGNORECASE))
        and bool(re.search(r"(invalid|reject|4\d\d|javascript:|https:|//evil)", combined, re.IGNORECASE))
        and bool(re.search(r"\b(admin|list)\b", combined, re.IGNORECASE))
    )
