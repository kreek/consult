---
name: proof
description: Use for proof and tests, claims, invariants, behavior specs, edge cases, evidence.
---

# Proof

## Iron Law

`NO ENGINEERING CLAIM WITHOUT A NAMED PROOF.`

Prove every non-trivial claim before you call it done. A proof is a named check
that would fail if the claim were false: point to that check, or mark the claim
unproven. "The tests pass" doesn't count until you can say which test would
break if you were wrong.

## When to Use

As a completion gate, before any reply that says or implies the work is done,
fixed, ready to commit, ready for a PR, or passing:

- Name the claim and the check that backs it. If there is no check, say what is
  unproven and which evidence is missing; don't just write `unproven` and move
  on.

As the main skill, when the task is the proof itself:

- Writing or reviewing behavior tests for a feature, bug fix, refactor, flaky
  test, or any untested behavior.
- Deciding what needs coverage and which boundary the test should enter through.
- Turning an agreed spec, domain model, contract, or root-cause finding into
  Proof Contracts and runnable checks.

## When NOT to Use

- Formatting, typo fixes, or file moves that change no behavior, data, or
  contract.
- Mechanical refactors with no behavior surface (renames, file moves,
  comment-only edits) that tooling or a direct look at the result already
  confirms. If the refactor changes something a caller can observe, you still
  need `proof`.
- Chasing a bug whose cause you haven't pinned down. Use `debugging` first; come
  back once you have a claim to prove.
- Judging design, complexity, naming, or structure. Use `code-review`. Reach for
  `proof` only when the open question is whether the evidence is enough.
- Load testing, profiling, or benchmarks. Use `performance`.
- Setting up the test runner, linter, or typecheck baseline. Use `scaffolding`.

## Where Proof Enters

Test at boundaries. A boundary is any point where one part of the system hands
data to another and the receiver expects a certain shape: between modules,
layers, or processes. (This skill also calls these handoffs.) Put the proof
where the data's shape, value, state, or error visibly changes. A good boundary
test passes against any implementation that keeps the same contract, so it
survives refactors.

The outermost boundary is the one your caller sees: the HTTP endpoint, CLI, UI,
or public API. It always counts, because its behavior is what the user actually
depends on.

Boundary tests usually exercise the helpers beneath them for free. Add a
separate unit test only for non-trivial pure logic, not for every function a
boundary test already drives.

## Core Ideas

1. Every claim owes a check. If you can't point to one, mark the claim
   `unproven`. Silence is not proof.
2. You don't have to write the test first, and you don't always have to write
   one. Behavior changes need a runnable check; mechanical edits, prose, and
   facts the tooling already guarantees do not. Never test static text that only
   changes when someone hand-edits the file.
3. Match the proof to the claim. A typo fix needs nothing. A new endpoint needs
   a contract test. A subtle bug fix needs a regression test that fails before
   the fix and passes after.
4. "Done" is a claim too. A green check counts only when it proves the latest
   request was met.
5. Write the proof so it teaches the behavior. The next developer should read it
   and learn how the system is meant to work, not just see a checkmark.
6. Different claims need different evidence: data claims need an invariant;
   behavior claims need a boundary check; bug fixes need root-cause evidence and
   a regression test; refactors need the same behavior before and after.
7. One behavior per test. Use the real collaborators on the inside; mock only
   true system edges such as the network, clock, or filesystem. Don't test the
   framework, the language, or static copy unless your code makes it a contract.
8. A flaky test is a bug: in the test, the code, or the environment. Fix it;
   don't bury it under sleeps or retries.

## Proof Contract

For each non-trivial claim, write down these five things. Filling them in is
what "naming a proof" means, and other skills (`domain-modeling`, `refactoring`)
hand work back here expecting it.

- **Claim**: the behavior, invariant, contract, or root cause you assert.
- **Data invariant**: the shape, state rule, or type that makes bad states
  impossible, or at least visible.
- **Boundary**: where the claim becomes observable, i.e. where the check
  enters.
- **Check**: the runnable test or command that would fail if the claim were
  false.
- **Evidence**: what you actually saw: the command and its output, the test
  name and pass/fail, the artifact you inspected, or a plain reason you couldn't
  run it.

## Red-Green Mode

Test-first is a tool, not a law here; Core Idea 2 stands. But for some claims it
is plainly the right tool, because the failing test is itself the evidence:

- A bug fix with a reproducible symptom. Write the test that reproduces it, watch
  it fail for the stated reason, then fix. A regression test written after the fix
  proves far less, because you never saw it catch anything.
- A behavior change with a clear observable. The failing assertion is how you
  confirm you are changing the thing you meant to.
- A contract change. Assert the new shape before the implementation can talk you
  into a different one.

Verify the red as deliberately as the green: a test that passes on the first run
is testing behavior that already existed, so it proves nothing about your change.

Pi's `/proof` runtime command drives this cycle when it is the right mode. Its
output counts only toward the claims it actually covers.

## Workflow

1. List the claims this change makes or relies on. Keep the ones a caller or
   user can observe, external contracts, domain invariants, "still behaves the
   same" refactor claims, and real error cases. Drop imagined edge cases,
   framework guarantees, and language behavior.
2. Fill a Proof Contract for each remaining claim before you call the work done.
3. Tie every named requirement to the artifact that satisfies it and the check
   that proves it. A green command isn't proof if it never runs that artifact.
4. For data, config, wiring, generated output, or documents, prove them the way
   the system uses them (run, load, parse, render, or inspect), not by
   asserting their literal text.
5. For a removal or replacement, prove the behavior that remains, not the thing
   you deleted. Don't write tests for ghosts; confirm the old code is gone with a
   search instead. Exception: if removing something now returns an explicit
   rejection (404, 410, a deprecation error), test that rejection, because it is
   new behavior.
6. Pull in only the one reference you need:
   - `references/data-shape-boundaries.md`: worked boundary examples such as
     pipelines, parsers, validators, middleware, sans-IO protocols, and
     functional-core/imperative-shell splits.
   - `references/recipes.md`: when the proof shape is specific to a domain.
   - `references/removals.md`: for removals and replacements.
   - `references/test-theater.md`: when a test asserts how the code is built
     instead of what it does.
7. When a claim needs a test, name it in the caller's words and assert the result
   the caller sees.
8. Use the narrowest check that proves the claim. Start with a single test by
   name or line; fall back to one test file. Once a failing test is known,
   iterate on that failure until it is green. Run the whole package or suite
   after major changes, before completion or commit, or when targeted green
   evidence suggests wider breakage.

## Before Saying Done

1. Re-read the latest request and any corrections. State what "done" means in the
   caller's words.
2. Look at any file or artifact the request named, as it stands after your last
   edit, and confirm your proof actually reads or runs it.
3. Run or inspect the check you picked in the workflow. Do it freshly, not from
   memory of an earlier run.
4. Say where things really stand: proven, partly proven, blocked, or unproven.

## Verification

- [ ] Every non-trivial behavior, invariant, contract, root-cause, or refactor
      claim has a Proof Contract.
- [ ] A check enters at each boundary where the data's shape, value, state, or
      error visibly changes, plus the outermost caller boundary, and each would
      fail if the claim were wrong.
- [ ] Test names and assertions describe what the caller observes, not private
      methods, call order, framework behavior, or static text that never varies.
- [ ] Mocks sit only at true system edges, or carry a written reason.
- [ ] Tests pass in any order and don't depend on sleeps.
- [ ] Every file, script, config, command, or document the request named is tied
      to an artifact and a check.
- [ ] Smoke checks, helper-only checks, and proofs of nearby behavior are flagged
      as partial: they don't count as acceptance.

## Tripwires

| Trigger | Do this instead | False alarm |
|---|---|---|
| "The suite is green, so the change is proven" | Run the check that would fail if this change were wrong. A green check that never touches what you changed, or only hits a helper or nearby behavior, is partial. | The green check enters at the changed boundary and asserts the new behavior. |
| "Run the whole suite for this one-line edit" | Run the single relevant test, line, or file first; widen after major changes, before completion or commit, or when wider breakage is plausible. | The change is cross-cutting and no narrower check exists. |
| "The broad suite is red, so the work is blocked" | Switch to the targeted check and report the unrelated broad failure separately. | The broad failure is caused by this change. |
| "Add a unit test for every helper" | Test the contract at the boundary so refactors don't rewrite proof; unit-test only non-trivial pure logic. | The helper has branching or state a boundary test cannot drive. |
| "The types already prove it" | Name the invariant or boundary behavior the types don't cover and check that. | The claim is exactly what the type checker enforces at compile time. |
| "There's no way to test this, so skip proof" | Record the manual check: the command, the output, and the claim it proves. Common for config, build wiring, and generated files. | The artifact is already proven by the system loading or running it in an existing check. |
| "The test mentions the changed code, so it counts" | Rewrite or delete tests that assert how the code is built instead of what it does; see `references/test-theater.md`. | The asserted structure is itself a public contract. |

## Handoffs

- `specify`: turn an agreed ADR, RFC, spec, or note's proof obligations into
  Proof Contracts before you claim done.
- `domain-modeling`: shape the invariants and make invalid states impossible to
  represent.
- `debugging`: when the proof hinges on root-cause evidence.
- `api`: when the claim is a public contract.
- `refactoring`: for before/after behavior evidence, and when a test that's hard
  to place is telling you the code is tangled and should be simplified first. Add
  `architecture` when the tangle crosses module boundaries.
- `error-handling`: when the error shape, message, or recovery the proof must
  assert isn't settled yet. That skill owns the contract; this one owns the
  proof.
- `security`: when the proof needs abuse cases or trust-boundary checks.

## References

- Worked boundary examples (pipelines, parsers, validators, middleware, sans-IO,
  functional core): `references/data-shape-boundaries.md`.
- Proof recipes by claim type: `references/recipes.md`.
- Removals and replacements: `references/removals.md`.
- Test-theater traps: `references/test-theater.md`.
- The `consult` Pi package ships a `/proof` runtime command that runs a
  red-green-refactor cycle when behavior tests are the right tool. Its output
  counts only toward the claims it actually covers.
