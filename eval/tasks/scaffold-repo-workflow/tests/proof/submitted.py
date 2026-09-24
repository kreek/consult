"""Per-task submitted-proof check for scaffold-repo-workflow. Ported from the previous scorer."""
import json
import re
import sys
from pathlib import Path

sys.path.insert(0, "/tests")
from consult_lib import hidden_check_passes  # noqa: E402,F401


def read(path: Path) -> str:
    return path.read_text() if path.exists() else ""

def submitted_proof(workspace: Path) -> bool:
    try:
        scripts = json.loads(read(workspace / "package.json") or "{}").get("scripts") or {}
    except json.JSONDecodeError:
        return False
    return all(isinstance(scripts.get(k), str) for k in ("test", "typecheck", "lint"))
