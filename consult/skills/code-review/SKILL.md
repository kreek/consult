---
name: code-review
description: Use to review diffs and PRs for bugs, regressions, edge cases, proof, merge readiness.
---

# Code Review

## Iron Law

`FINDINGS FIRST. BLOCK ON CORRECTNESS, SAFETY, DATA LOSS, AND UNPROVEN CLAIMS.`

## When to Use

- Self-review of your own diff in the `workflow` completion loop, after
  `proof` and before claiming done. Default for any non-trivial agent-generated
  change.
- Diff review: local, branch, or a GitHub PR through the host's GitHub surface.
- Review-comment follow-up on the user's own PRs.

## When NOT to Use

- Commit grouping or history repair only; use `git-workflow`.
- A narrow domain-only review where `security`, `database`, `api`, or
  `ui-design` is sufficient.

## Rules

1. Review owns defect discovery; `proof` owns checks. Find behavioral bugs,
   regressions, unsafe edge cases, missing evidence, and merge blockers.
2. Findings come first, in severity order, each with a file/line or thread
   anchor, the issue, its impact, a fix direction, and the evidence or missing
   proof. Summaries and compliments come after. Use a question only when
   ambiguity blocks the finding.

   | Severity | When to use |
   |---|---|
   | Critical | Exploitable security, data loss, broken auth, destructive migration, outage risk |
   | High | Incorrect behavior, broken contract, missing authorization, race, serious regression |
   | Medium | Maintainability, error handling, observability, compatibility, or test gaps likely to cause defects |
   | Low | Non-blocking clarity, skip unless asked |

3. Every review includes a security pass and a proof-evidence pass. A claim
   the review cannot verify is reported as unproven. Red or absent CI makes
   the review unproven, not blocked from inspection. Missing intent on a
   non-trivial PR is a finding.
4. Repository constraints beat generic advice. Check declared runtime,
   framework, dependency, CI, and support policy before applying a language
   reference.
5. Maintainability findings need a concrete risk: hidden state, coupled
   effects, stale flags, duplicated rules with divergent meaning, dead
   compatibility, unreachable paths. Style is not blocking unless it hides
   ambiguity or unsafe control flow.
6. Agent-written code gets an AI-generated risk pass: speculative abstraction,
   unnecessary compatibility shims, dead defensive code, test theater,
   fabricated APIs, scope creep, refactor drift, and code too large or vague
   for the human to keep a mental model of. Hand-rolled versions of solved
   problems (HTTP clients, ORMs, parsers, retry loops, validators, crypto)
   are findings.
7. A diff the human cannot review in one sitting gets a declared partial
   scope, and split/scope becomes a finding. Bundled reformatting or unrelated
   edits are split before deep review. Sample generated, vendored, and
   lockfile churn only enough to detect obvious risk.
8. GitHub: never reach it without explicit permission (`git-workflow` owns
   that gate). Modify a PR only when it belongs to the user or the user asks.
   Ask before every write: comments, reviews, thread resolution, pushes. When
   addressing feedback, fix the smallest coherent set of actionable requests
   and surface conflicting comments before editing.

### Independent Review

The strongest review comes from a reviewer with no implementation context: a
subagent, a fresh session, or the same agent reading the diff cold after the
reasoning has left context. A host review surface satisfies this when it
receives exactly these inputs and nothing more:

- The diff.
- The stated intent and acceptance criteria.
- The repo's declared constraints: runtime, framework, support policy, test
  command.

Withhold the implementation rationale. Why a line is there is precisely what
biases a reviewer into accepting it; a reviewer who has to work out the intent
from the diff finds what the author's own second pass cannot. Answer questions
the reviewer asks, but do not pre-empt them with justification.

When no independent reviewer is available, say the review was same-context
and treat its clean result as weaker evidence.

## Workflow

1. Resolve the target and pre-flight: intent, impact, CI status, changed
   surface, and the scope you can honestly cover.
2. Load only what the diff needs: the language guide for each language present
   and the domain skill for each touched risk. Load `release` only for
   concrete release artifacts or explicit release-readiness review.
3. Sweep by risk: security, behavior, evidence, dead surface, reuse and
   composition, build-vs-adopt, AI-generated risk.
4. Write findings first. If none, name residual risk and unreviewed scope.

## Tripwires

| Trigger | Do this instead | False alarm |
|---|---|---|
| "Tests pass, so the diff is fine" | Passing tests prove only what they assert; still review safety, data, and dead-surface risk. | None. |
| "The author is careful, skim this one" | Trusting the author changes how you write findings, not how thoroughly you review. | None. |
| "The tests look thorough" | Test theater is a finding; load `proof` for the taxonomy. | Tests assert caller-observable behavior at real boundaries. |
| "The abstraction might be useful later" | Speculative abstraction waits for a real caller or requirement. | The requirement exists and is named. |
| "Defensive code never hurts" | Dead defensive code becomes a boundary assertion or is removed. | The guarded state is reachable and tested. |
| "It's labeled a refactor" | A refactor with observable behavior change is a feature change; review it as one. | Behavior preservation has before/after evidence. |
| "The shim is harmless, keep it" | Compatibility shims need owner, caller, removal condition, and proof. | All four are recorded. |
| "It's generated code, wave it through" | Oversized durable generated code is comprehension debt; make split/scope a finding. | Regenerable artifacts such as lockfiles, sampled for obvious risk. |

## Handoffs

- `specify`: plan-to-code divergence from an agreed design artifact.
- `security`: auth, trust boundaries, secrets, crypto, dependencies, injection.
- `database`: migrations, locking, transactions, schema, indexes.
- `release`: version, changelog, package, publish, or rollout readiness.
- `proof`: missing behavior coverage, test quality, mocks, flakes.
- `git-workflow`: branch mechanics and packaging accepted fixes.

## References

- Language reviewer guides, load one per language in the diff:
  `references/rust.md`, `references/fsharp.md`, `references/csharp.md`,
  `references/python.md`, `references/typescript.md`, `references/ruby.md`,
  `references/java.md`, `references/kotlin.md`, `references/bash.md`,
  `references/sql.md`.
