"""Per-task submitted-proof check for proof-first-bugfix."""
import re
from pathlib import Path


def submitted_proof(workspace: Path) -> bool:
    tests = (workspace / "test" / "cart.test.js").read_text() if (workspace / "test" / "cart.test.js").exists() else ""
    return (
        bool(re.search(r"\bSAVE10\b", tests))
        and "assert.throws" in tests
        and bool(re.search(r"\b(integer|invalid|negative|quantity|priceCents)\b", tests, re.IGNORECASE))
    )
