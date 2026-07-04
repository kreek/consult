---
name: official-source-check
description: "Use for version-sensitive framework, library, SDK, or platform behavior: upgrades, deprecations, current APIs."
---

# Official Source Check

## Iron Law

`MODEL MEMORY IS A HINT, NOT EVIDENCE, FOR VERSION-SENSITIVE BEHAVIOR.`

## When to Use

- Implementation depends on current external framework, library, runtime,
  browser, SDK, cloud, or platform behavior.
- The repo does not already prove the exact API, configuration, migration,
  browser behavior, or provider contract.
- The user asks for current, official, documented, verified, or best-practice
  implementation.

## When NOT to Use

- Project-local logic with tests and no external API dependency.
- Stable language syntax covered by the compiler, linter, or type checker.
- Typos, formatting, prose-only edits, or mechanical metadata changes.
- Emergency mitigation where the user accepts unverified risk.

## Workflow

1. Find the local version from manifests, lockfiles, imports, generated
   clients, schemas, config, or CI images.
2. Check the narrow source of truth: official docs, release notes, migration
   guide, standards spec, or provider SDK reference.
3. Compare that source with local conventions.
4. Use the smallest source-compatible implementation.
5. In the final claim, name the source checked or mark the claim unverified.

## Verification

- [ ] Local version or platform was identified, or its absence was reported.
- [ ] The source of truth was checked for the exact pattern.
- [ ] Deprecated or version-incompatible APIs were avoided.
- [ ] Conflicts between source guidance and local convention were surfaced.
- [ ] Unverified external-behavior claims were marked unverified.
- [ ] Runtime behavior was proven when source guidance alone did not prove it.

## Tripwires

| Trigger | Do this instead | False alarm |
| --- | --- | --- |
| "I know this API" | Check the local version and source of truth. | Project-local helper with tests. |
| "The docs are too broad" | Check the narrow API, migration, or release-note page. | Offline task where user accepts unverified output. |
| "Existing code does it this way" | Check whether the pattern is still supported before copying it. | Repo policy pins an older supported pattern. |
| "I'll cite a blog post" | Use official docs, standards, release notes, or provider references first. | The project owns the library being edited. |

## Handoffs

- Use `workflow` to choose the full skill set.
- Use `proof` when source guidance must be backed by runtime behavior.
- Use `documentation` when the checked source needs to be captured for
  maintainers.
