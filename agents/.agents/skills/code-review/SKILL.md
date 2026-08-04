---
name: code-review
description: Use to review diffs and PRs for bugs, regressions, edge cases, proof, merge readiness.
---

# Code Review

## Iron Law

`FINDINGS FIRST. BLOCK ON CORRECTNESS, SAFETY, DATA LOSS, AND UNPROVEN CLAIMS.`

## When to Use

- Self-review of your own implementation diff in the `workflow`
  completion loop after proving behavior with `proof`, before claiming done.
  Default for any non-trivial agent-generated change. A second pass still
  catches bugs, dead code, and missed edge cases, but it is the weakest form of
  review: the same context that produced the code also carries the reasoning
  that justified it. Read the diff as an outside reviewer who does not know why
  a line is there, and prefer a fresh-context reviewer when one is available.
- Diff review (local, branch, or a GitHub PR through whatever GitHub surface
  the host provides).
- Review-comment follow-up on the user's own PRs.
- Agent-generated code review before merge or handoff.

## When NOT to Use

- Commit grouping or git history repair only; use `git-workflow`.
- A narrow domain-only review where a specialist skill is sufficient
  (`security`, `database`, `api`, `accessibility`).

## Core Ideas

1. Review owns defect discovery, not proof execution. It should find behavioral
   bugs, regressions, unsafe edge cases, missing evidence, and merge blockers;
   `proof` owns turning claims into checks.
2. Findings first. Summaries, compliments, and change descriptions come after
   concrete issues ordered by severity.
3. Every review includes a security pass and a proof-evidence pass. If the
   review cannot verify a claim, report it as unproven.
4. Repository constraints beat generic advice. Check declared runtime,
   framework, dependency, CI, and support-policy constraints before using a
   language reference.
5. Maintainability findings need a concrete risk: hidden state, coupled
   effects, stale flags, duplicated rules, dead compatibility, unreachable
   paths, or behavior split across unrelated lifecycles.
6. Review protects the human's mental model. Generated code that is too large,
   vague, or disconnected from the stated intent is comprehension debt even when
   it appears to work.

## Independent Review

The strongest review comes from a reviewer with no implementation context. Set
one up when the host allows it: a subagent, a fresh session, or the same agent
reading the diff cold after the reasoning has left context.

Give the reviewer only what a real reviewer would have:

- The diff.
- The stated intent and acceptance criteria, from the Work Ledger when one
  exists, since that is what survives into a context with no history.
- The repo's declared constraints: runtime, framework, support policy, test
  command.

Withhold the implementation rationale. Why a line is there is precisely what
biases a reviewer into accepting it; a reviewer who has to work out the intent
from the diff finds what the author's own second pass cannot. Answer questions
the reviewer asks, but do not pre-empt them with justification.

When no independent reviewer is available, say the review was same-context and
treat its clean result as weaker evidence.

## Review Lenses

- Security: auth/authz, secrets, trust boundaries, input handling, dependencies,
  crypto, unsafe sinks, redaction, and error/log disclosure.
- Behavior: changed return values, effects, ordering, error shape, concurrency,
  persistence, migrations, UI states, and compatibility.
- Evidence: tests, CI, build output, root-cause evidence, proof contracts, and
  claims marked unproven.
- Dead surface: unused exports, old routes, stale flags, orphaned jobs, removed
  files still referenced, and duplicated rules with divergent meaning.
- Reuse & composition: duplicated logic with shared meaning and rules,
  inheritance where composition fits, deep inheritance chains, parallel
  implementations of existing behavior, and second wrappers for cross-cutting
  concerns already covered.
- Build-vs-adopt: hand-rolled HTTP clients, ORMs/query builders, parsers,
  retry/backoff loops, validators, serializers, format builders, date/time
  math, schedulers, templating, crypto, and migration runners.
- AI-generated risk: speculative abstraction, unnecessary compatibility shims,
  dead defensive code, test theater, fabricated APIs, scope creep, refactor
  drift, and comprehension debt.

## Workflow

1. **Resolve the target.** Use local diffs or approved GitHub reads. For PR
   review threads, fetch thread state only when resolution or line context
   matters. Never reach GitHub without explicit permission; `git-workflow` owns
   that gate and which surface to use.
2. **Pre-flight the review.** Identify intent, impact, CI status, and changed
   surface. Missing PR intent on a non-trivial diff is a finding. Red or
   absent CI means the review is unproven, not blocked from inspection.
3. **Bound the scope.** For oversized generated or durable diffs, declare the
   partial review scope and make split/scope a finding when the human cannot
   review it in one sitting.
4. **Load only needed references.** Load language guides for languages in the
   diff and domain skills for touched risks. Use `release` only for concrete
   release artifacts, rollout obligations, or explicit release-readiness review.
5. **Sweep by risk.** Apply the Review Lenses, including the AI-generated risk
   pass for agent-written code. Sample generated, vendored, and lockfile churn
   only enough to detect obvious risk.
6. **Write findings first.** Report concrete issues in severity order with
   file/line or thread anchors. If no issues are found, name residual risk and
   unreviewed scope.

## Addressing Review Feedback

- Modify a PR only when it belongs to the user or the user explicitly asks.
- Separate actionable requested changes from discussion, approvals, duplicates,
  resolved threads, and outdated threads.
- Cluster comments by behavior or file and fix the smallest coherent set.
- Draft a reply when the reviewer asks for explanation rather than code.
- Ask before GitHub writes: comments, reviews, thread resolution, pushes, and
  similar externally visible actions.
- Surface conflicting comments or behavior regressions before editing.

## Finding Format

Each finding includes: file/line or PR thread anchor, issue, impact, concrete
fix direction, and evidence or missing proof. Use questions only when ambiguity
blocks the finding or fix.

| Severity | When to use |
|---|---|
| Critical | Exploitable security, data loss, broken auth, destructive migration, production outage risk |
| High | Incorrect behavior, broken contract, missing authorization, race, serious regression |
| Medium | Maintainability, error handling, observability, compatibility, or test gaps likely to cause defects |
| Low | Non-blocking clarity, skip unless asked |

## Verification

- [ ] The review target, intent, CI/proof status, and scope of the review are
      explicit.
- [ ] Runtime/toolchain constraints and relevant language references informed
      the advice.
- [ ] Security, behavior, evidence, dead-surface, reuse-&-composition,
      build-vs-adopt, maintainability, and AI-generated risk lenses were
      applied where relevant.
- [ ] Findings are severity ordered, anchored, concrete, and focused on impact.
- [ ] Missing evidence, residual risk, and unreviewed scope are named.
- [ ] GitHub reads and writes had explicit permission.

## Tripwires

| Trigger | Do this instead | False alarm |
|---|---|---|
| "Tests pass, so the diff is fine" | Passing tests prove only what they assert; still review safety, data, and dead-surface risk. | None. |
| "Flag every style nit" | Style is not blocking unless it hides ambiguity, behavior risk, or unsafe control flow. | The repo's own lint gate makes it a CI failure. |
| "Fewer files means simpler" | Fewer files is simpler only when behavior, data, effects, and lifecycles stay uncoupled. | None. |
| "The shim is harmless, keep it" | Compatibility shims need owner, caller, removal condition, and proof. | All four are recorded. |
| "The author is careful, skim this one" | Trusting the author changes how you write findings, not how thoroughly you review. | None. |
| "The tests look thorough" | Test theater is a finding; load `proof` for the detailed taxonomy. | Tests assert caller-observable behavior at real boundaries. |
| "The abstraction might be useful later" | Speculative abstraction waits for a real caller or requirement. | The requirement exists and is named. |
| "Defensive code never hurts" | Dead defensive code should become a boundary assertion or be removed. | The guarded state is reachable and tested. |
| "It's labeled a refactor" | A refactor with observable behavior change is a feature change; review it as one. | Behavior preservation has before/after evidence. |
| "Review the whole bundle in one pass" | Bundled reformatting or unrelated edits should be split before deep review. | The bundle is small enough for one focused review. |
| "It's generated code, wave it through" | Oversized durable generated code is comprehension debt; make split/scope a finding. | Regenerable artifacts such as lockfiles, sampled for obvious risk. |

## Handoffs

- `specify`: plan-to-code divergence from an agreed design artifact.
- `security`: auth, trust boundaries, secrets, crypto, dependencies, injection.
- `database`: migrations, locking, transactions, schema, indexes, data access.
- `release`: version, changelog, package, publish, rollout, or migration
  release-readiness review.
- `proof`: missing behavior coverage, test quality, mocks, flakes, and proof
  obligations.
- `git-workflow`: branch mechanics and packaging accepted fixes.

## References

- Language-specific reviewer guides: `references/rust.md`,
  `references/fsharp.md`, `references/csharp.md`, `references/python.md`,
  `references/typescript.md`, `references/ruby.md`, `references/java.md`,
  `references/kotlin.md`, `references/bash.md`, `references/sql.md`.
