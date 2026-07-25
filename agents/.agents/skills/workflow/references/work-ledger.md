# Work Ledger

Load this when work will outlive one context: several slices, a long session, a
handoff to another agent or person, or anything likely to hit compaction.

## Why

Chat history is not durable. After compaction, a fresh session, or a handoff, the
approvals you were given and the evidence you gathered are gone, and the usual
recovery is to re-read long diffs and guess at what was already agreed. The
ledger keeps the two things that are expensive to reconstruct: what a human
approved, and what is actually proven.

It is not a task list. Step sequencing belongs to the host's planning mode, and a
plan the ledger duplicates is a plan that will drift from it.

## Location

`.consult/ledger/<slug>.md`, one file per unit of work. Name `<slug>` for the
work, not the date.

Add `.consult/` to the project's `.gitignore` when it is missing, and say that
you did. An untracked, unignored directory gets swept up by `git add -A` and ends
up in someone's pull request.

Promote a ledger to `docs/` only when the team should keep the record. Most
ledgers are scaffolding and should stay local.

## Format

```markdown
# <work name>

Repo root: <absolute path>. All commands below run from there unless stated.

## Request

<What was asked, in the user's words. Append later corrections and narrowings as
their own lines; do not rewrite the original.>

Plan or design artifact: <repo-relative path, or "none">

## Target

- Outcome:
- Acceptance signal:
- Classification: significance <low|high>, durability <low|high>

## Approved

| Decision | Shape approved | Approved by | When | Why (agent-authored only) |
| --- | --- | --- | --- | --- |

## Proof Contracts

| Claim | Invariant | Boundary | Check | Evidence | Pinned to | Status |
| --- | --- | --- | --- | --- | --- | --- |

## Open

- <question that blocks the work, and what it blocks>

## State

- Branch: <name> — Done work is <committed at `<sha>` | uncommitted in the working tree>
- Done:
- Remaining: <each step with the exact command and the directory it runs from>
```

`Status` is one of `proven`, `partly proven`, `unproven`, or `blocked` — the same
four words `proof` uses when it reports where things stand.

`Pinned to` is the code state the evidence was taken against. A proof is only as
current as the code it ran on: an unpinned `proven` row, or one pinned behind the
current state, is stale and must be re-run before you trust it. This is the
difference between a ledger and a stale status report.

Pin to something checkable — a commit SHA. While work is uncommitted there is no
such handle, so write `uncommitted` and treat every green as provisional: prose
like "the tree after the config edits" reads like a pin but cannot be verified,
and it drifts silently on the next edit. Uncommitted greens get re-run before the
close, not trusted.

Every clause in the acceptance signal needs a row here. An acceptance criterion
with no claim, no check, and no status cannot be shown met, and it will be quietly
dropped at the close.

The `Approved` table is the load-bearing part. "Approved by" distinguishes what
the user actually signed off from what you decided on your own, which is exactly
what a resumed context cannot otherwise tell apart. When the decision was yours,
the `Why` column is required — a self-authorized durable decision with no
recorded reasoning is the one entry a resuming context has no way to audit.

## Rules

- Write the ledger at framing, before implementing. A ledger written at the end
  is a status report, and it will be written from the same faded memory it was
  supposed to protect.
- Update it when a decision is approved, a slice lands, or a claim's status
  changes. Not every turn.
- Read it first when resuming, before re-reading diffs or replaying history.
- Keep entries short. It is an index into the repo, not a copy of it. Point at
  `file:line`, test names, and commands rather than pasting code or output.
- Name things by path, not by label. "the five manifests", "the plan file", or
  "the config" cannot be acted on from a cold context — the resuming agent has to
  guess, and a wrong guess about which files to edit is the failure this artifact
  exists to prevent. Same for commands: give the directory each one runs from.
- Use real dates. "this session" and "earlier today" mean nothing to the context
  that reads this next.
- Record the baseline for any expected failure. "4 pre-existing failures" is only
  checkable if you also name them; otherwise the next context cannot tell an
  unchanged baseline from a coincidence.
- Give each remaining step the outcome that means it passed. A step with no
  expected result leaves the next context guessing whether it succeeded.
- Update the ledger before you commit. Re-running a check without writing its
  result back leaves the file asserting a status the code no longer supports,
  which is worse than having no ledger.
- If the plan or design artifact lives outside the repo, carry enough of it
  inline. A path into someone's home directory is not recoverable by whoever
  resumes on another machine.

## What it is not

The ledger is an index into the repo, not a runbook and not a copy of the work.
Expect the next context to read code, run checks, and use the host's planning
mode for step sequencing. What it must not have to do is re-derive what was
approved, or guess whether a green check still applies to the current code.

So the bar is: a cold context can state the work, what was approved and by whom,
what is proven versus stale versus unproven, and what remains — then get to work.
Not: execute every remaining step without opening a file.
- The repo wins. If the ledger and the code disagree, the code is the truth and
  the ledger is stale — fix the ledger and say so.
- Never record a claim as `proven` from memory of an earlier run. That is the
  failure the ledger exists to prevent, not one it is allowed to launder.
- If a check appears in `Remaining`, its row is not `proven`. A table that says
  proven while the step list says re-run it is the one contradiction that will
  make the next context skip real work.
- Do not close while the ledger's own acceptance claims are unproven. A ledger
  that records a push over a failing acceptance row has inverted its purpose.
