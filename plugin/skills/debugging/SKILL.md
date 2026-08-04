---
name: debugging
description: Use to debug failures, reproduce symptoms, isolate causes, inspect evidence, fix bugs.
---

# Debugging

## Iron Law

`NO FIX WITHOUT ROOT-CAUSE EVIDENCE.`

## When to Use

- Investigating defects, flakes, timing-sensitive bugs, regressions,
  production incidents, unclear failures, or "stuck" debugging sessions.

## When NOT to Use

- Planned refactors with no failing behavior; use `refactoring`.
- Performance investigation where the symptom is slowness; use
  `performance`.
- Git-history regression search mechanics; pair with `git-workflow`.

## Core Ideas

1. Reproduce before fixing. Change one variable per experiment.
2. Reduce the failing case until only the bug remains. Localize by
   boundary: data, service, integration, application, infrastructure.
3. Debugging should improve the human's failure model with evidence.
4. Fix causes, not symptoms.
5. For incidents, produce blameless learning with owned follow-up
   actions, never "human error" as a root cause.

## Workflow

1. Capture the exact symptom: command, input, output, stack trace,
   timing, environment. Reproduce reliably or record why reproduction
   isn't yet possible.
2. After the third experiment, keep a short debug log. Form one
   hypothesis at a time, predict what else must be true, run the
   smallest experiment that confirms or refutes it.
3. Before editing, state the current failure model: likely cause,
   evidence for it, and the observation that would disprove it.
4. Fix the identified cause. Add a regression test or operational
   guard before declaring fixed.

## Verification

- [ ] The bug reproduces on pre-fix code or non-reproducibility is
      documented.
- [ ] The root cause is named in one sentence, explains all observed
      symptoms, and identifies evidence that ruled out main alternatives.
- [ ] The fix is one atomic change aimed at that cause, with a
      regression test or equivalent guard that fails before and passes
      after.
- [ ] Timing-sensitive bugs were verified with non-invasive observation or
      replay.
- [ ] Incident follow-ups have owners and deadlines.
- [ ] Unproven root-cause or fix claims are reported as unproven.

## Tripwires

| Trigger | Do this instead | False alarm |
|---|---|---|
| "Probably X, let me try fixing" | Gather evidence that confirms X before editing. | The user asked for a speculative explanation, not a fix. |
| "No time to reproduce" | Create the smallest reproduction or state why reproduction is blocked. | Production-only incident where logs/traces are the available reproduction. |
| "One more guess and it'll work" | Stop editing. Collect a new observation that changes the model. | A syntax or wiring typo found directly in the failing output. |
| "The agent found a fix but I can't explain the bug" | Stop and rebuild the failure model before editing further. | Disposable local experiment with no completion claim. |
| "Fixed it locally, ship it" | Name the root cause and add or run the regression guard. | Local run is the requested diagnostic, not a completion claim. |
| "Flake - just retry" | Treat the flake as a bug and identify whether test, code, or environment failed. | Infrastructure outage already confirmed outside the code under review. |
| "Probably a race condition" | Show interleaving, shared state, or timing evidence before changing concurrency code. | The race is already demonstrated by a failing sanitizer or trace. |

## Handoffs

- Use `proof` for fix-claim evidence and the regression test shape.
- Use `git-workflow` for `git bisect`, reflog recovery, or conflict-heavy
  debugging.
- Use `observability` when the right evidence must come from logs,
  metrics, traces, or incident timelines.
- Use `error-handling` when the root cause is an error boundary,
  retry, timeout, or recovery contract.
