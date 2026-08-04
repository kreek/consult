---
name: refactoring
description: Use for refactoring, behavior-preserving change, tests, safe rewrites.
---

# Refactoring

## Iron Law

`GREEN BEFORE THE REFACTOR. GREEN AFTER EACH STEP. NEVER MIX STRUCTURE AND BEHAVIOR IN ONE COMMIT.`

## When to Use

- Changing structure while preserving behavior: legacy refactors, large
  renames, extractions, migrations, branch by abstraction, strangler fig,
  Mikado planning, characterization tests, or big-bang rewrite avoidance.

## When NOT to Use

- Behavior-first feature work; use `proof`.
- Commit grouping or git history surgery after changes already exist;
  use `git-workflow`.

## Core Ideas

1. Preserve behavior first; add characterization tests where coverage
   is missing. Separate structural from behavior changes: every commit
   is one or the other, never both.
2. Name the coupling before changing structure: data shape, side effect,
   module boundary, ownership, time, transport, persistence, or
   compatibility.
3. Make every step small, reversible, and shippable.
4. Validate the target shape before moving large amounts of code.
5. For public interfaces, use parallel change: expand, migrate callers, then
   contract. Ask which callers, data, and releases must keep working before
   adding shims, dual paths, or migration complexity.
6. Delete old paths only when traffic/callers have moved and
   verification proves it.
7. Simplification is refactoring: remove accidental complexity only after
   naming the behavior preserved and the coupling reduced.

## Workflow

1. Define the current behavior that must not change. Add or identify
   tests that catch regressions at the public boundary.
2. Name the concern being separated and its current coupling point.
3. Pick the smallest safe pattern: rename, extract, move, parallel
   change, branch by abstraction, or strangler. For broad renames,
   write a rename map first: separate private symbols, file paths,
   runtime/public keys, persisted names, docs, and compatibility cleanup.
4. Record a preservation Proof Contract: unchanged behavior claim,
   relevant invariant, public boundary, before/after check, evidence.
5. For simplification, remove only complexity that has a named cost:
   hidden mutable state, unnecessary layer, broad helper, scattered
   behavior, compatibility shim, dead flag, or duplicated rule with
   divergent meaning.
6. Make one structural step, run focused tests, commit. Track any old
   path left behind with owner and removal condition.

## Verification

- [ ] Tests were green before the refactor; characterization coverage
      exists for legacy behavior touched.
- [ ] The coupling being separated was named before code moved.
- [ ] Each commit is structural or behavioral, not both; the system is
      shippable at every commit.
- [ ] Public interface changes use expand-contract or compatibility
      shims; old and new paths both work during migration.
- [ ] Backward compatibility expectations were confirmed or inherited
      from an explicit public contract before compatibility machinery
      was added.
- [ ] Simplification claims name the removed complexity and the preserved
      behavior; behavior preservation has before/after evidence.
- [ ] Deleted tests were replaced by equal or stronger behavior
      coverage.
- [ ] Leftover migration/deletion work has owner and deadline.
- [ ] Every behavior-preservation claim has before/after proof
      evidence, or the refactor is reported as unproven.

## Tripwires

| Trigger | Do this instead | False alarm |
|---|---|---|
| "It's just a refactor, no tests needed" | Name the behavior-preservation proof and add characterization where coverage is missing. | A mechanical rename the tooling already verifies. |
| "Fix the behavior while I'm in here" | Split structural and behavioral changes before committing; every commit is one or the other. | None. |
| "Extract a helper to shorten this" | Extract only after naming the behavior, state, effect, or boundary being separated. | The coupling being separated is already named. |
| "Shorter code is simpler" | Treat shorter as simpler only when it does not hide state, effects, compatibility, ownership, or independent behavior. | None. |
| "Bundle the rename with the extraction" | Commit renames separately from extractions when possible. | The tool makes them one inseparable mechanical step. |
| "Sneak in this small tweak" | Put opportunistic tweaks in separate behavior commits or leave them out. | None. |
| "Nobody uses the old path anymore" | Prove no callers remain before deleting old paths, or use expand-contract migration. | Verification already proves traffic and callers have moved. |
| "A rewrite would be faster" | Replace big-bang rewrites with the next safe slice or branch-by-abstraction path. | The scope is small, disposable, and the user approved a rewrite. |

## Handoffs

- `proof`: preservation evidence, characterization, boundary tests.
- `git-workflow`: clean change grouping.
- `domain-modeling`: effects or domain shape.
- `architecture`: module boundaries, locality, layering, DDD patterns.
- Workflow `references/simple-not-easy.md`: real coupling vs local ease.
