"""Per-task submitted-proof check for proof-organize-tangled-seam. Ported from the previous scorer."""
import json
import re
import sys
from pathlib import Path

sys.path.insert(0, "/tests")
from consult_lib import hidden_check_passes  # noqa: E402,F401


def read(path: Path) -> str:
    return path.read_text() if path.exists() else ""

def submitted_proof(workspace: Path) -> bool:
    tests = read(workspace / "test" / "orders.test.js")
    covers_tier = bool(re.search(r"(tier|threshold|10\s?%|0\.1|percentage)", tests, re.IGNORECASE))
    covers_coupon = bool(re.search(r"\bWELCOME\b", tests))
    covers_cap = bool(re.search(r"(cap|exceed|cannot\s+exceed|limit|max)", tests, re.IGNORECASE))
    covers_confirmation = bool(re.search(r"(charge|email|confirmation|queued|recorded)", tests, re.IGNORECASE))
    return covers_tier and covers_coupon and covers_cap and covers_confirmation
