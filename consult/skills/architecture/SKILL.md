---
name: architecture
description: Use for architecture decisions, module boundaries, coupling, layering, system shape.
---

# Architecture

## Iron Law

`ORGANIZE BY WHAT CHANGES TOGETHER. BOUNDARIES EXPOSE CONTRACTS, NOT INTERNAL STEPS.`

## When to Use

- Choosing between domain/feature-oriented organization and horizontal
  controller/service/repository/DTO layers.
- Choosing shared project/package/module boundaries, bounded contexts, and
  public surfaces.
- Defining internal boundary contracts: what shape crosses a
  module/component boundary, what assumptions are guaranteed, and what
  details stay hidden.
- Choosing API style or data store family before a specialist skill owns the
  detailed shape.
- Mapping data flow inside a component from external/service payloads through
  parsed internal shapes to output/render shapes.
- Deciding whether DDD tactical patterns (aggregates, repositories,
  factories, domain services) earn their keep.
- Reviewing code where one behavior is scattered across many files for no
  technical reason.

## When NOT to Use

- Data shape, invariant, and effect discipline; use `domain-modeling`.
- Public HTTP contract details; use `api`.
- Database physical schema, indexes, or migrations; use `database`.
- Reshaping existing code while preserving behavior; use `refactoring`.
- Local file moves or private helper extraction that do not create shared
  boundaries; explain the choice and proceed.

## Core Ideas

1. Organize by what changes together. Feature behavior, data shapes,
   invariants, and tests should live close enough to change together. Keep
   production files and their matching test files small enough that one focused
   behavior can be run without invoking the whole suite.
2. Functions should do one thing well. Keep them around 25-30 lines, and keep
   conditionals and loops under three nesting levels. Use guard clauses,
   extraction, or composition before adding another nested branch.
3. Use layers only for real boundaries. Horizontal layers are useful for
   process, deploy, trust, persistence, transport, or proven duplication. They
   are harmful when they scatter one behavior by default.
4. Expose contracts and hide internal shape. A module boundary should say what
   crosses it, what assumptions hold, and what details callers must not depend
   on.
5. Keep domain meaning local. Use bounded contexts when the same word means
   different things in different parts of the system. Do not force subtly
   different meanings into one shared model.
6. Use architecture patterns only when they carry behavior. DDD patterns like
   aggregates, repositories, factories, and domain services must protect a real
   invariant, workflow, or boundary.
7. Make data flow explicit. Name where external data enters, where it becomes
   trusted, where domain work happens, and what output shape leaves. These are
   roles, not required folders.
8. Shared structure is user-owned. Ask before creating project layout,
   package/module boundaries, public library shape, or cross-component
   ownership that future work will depend on.

## Workflow

1. Name the business capability and its transitions before drawing modules.
2. Sketch the module surface from the caller's view: what it accepts, what
   it returns, what it must never expose.
3. If the surface is caller-facing or the structure is shared, recommend one
   option and route to `contract-first` before implementation; it owns the
   approval scope for module boundaries, shared structure, and project
   layout.
4. Sketch the internal data path: where external data enters, where it is
   parsed into a trusted shape, where domain work happens, where output data
   is shaped, and what the renderer/presenter receives.
5. Group code by capability first; introduce horizontal layers only where a
   real technical boundary justifies them.
6. For each cross-module call, ask whether the caller depends on a stable
   contract or on internal shape. Stabilize the contract; hide the shape.
7. Record the decisions that future readers can't recover from the code:
   why this boundary, why this shape, what alternative was rejected.

## Verification

- [ ] One feature can be edited and its matching proof run without traversing
      more directories or test files than the change deserves.
- [ ] Functions do one thing well, stay roughly 25-30 lines, and avoid a fourth
      nesting level.
- [ ] Horizontal controller/service/repository/DTO layers, where present,
      correspond to real technical boundaries, not default ceremony.
- [ ] DDD tactical patterns are applied where they earn their keep, not as
      decoration.
- [ ] Component data flow has named ingress, parse, domain, output-shaping,
      and render/presentation roles; raw external payloads do not leak past
      the parse boundary.
- [ ] Module surfaces hide volatile decisions; callers depend on the
      contract, not the internal shape.
- [ ] Caller-facing interfaces and shared structure were routed through user-approved
      contract/API/architecture design before implementation.
- [ ] Boundaries separate concerns that change independently; they are
      not merely steps in a flowchart.
- [ ] Bounded contexts are explicit where the same word means different
      things in different parts of the system.
- [ ] Architectural decisions whose rationale isn't recoverable from the
      code are recorded (ADR, comment, or commit message).

## Tripwires

| Trigger | Do this instead | False alarm |
|---|---|---|
| "Start with controller/service/repository/DTO layers" | Group by capability first; add horizontal layers only where a real technical boundary justifies them. | The layer maps to a process, deploy, trust, persistence, or transport boundary. |
| "These two features look the same, share the code" | Share code only when the reused value has the same meaning and rules in both contexts. | One domain rule with one authoritative home. |
| "Add a repository/factory/aggregate for structure" | Add DDD patterns only when they protect a real domain rule, workflow, or boundary. | The pattern guards a named invariant. |
| "Put the business rule in middleware so it's global" | Keep feature-specific rules at the handler/domain boundary; middleware is for transport-wide concerns. | The concern is genuinely transport-wide. |
| "Move the files now, decide the boundary later" | Decide the boundary before using `refactoring` to move files. | The move is private organization that creates no shared boundary. |
| "Create the shared package; asking can wait" | Ask before locking in shared package/module/project structure future work will depend on. | Private file moves that establish no boundary. |
| "Another layer will make this cleaner" | Add a layer only when it separates an independent change axis, process, deploy, trust, persistence, transport, or proven duplication. | The axis is real and named. |

## Handoffs

- `specify`: compare current and proposed contracts before boundary decisions.
- `domain-modeling`: module data shapes, invariants, effects, parsed/output
  shapes.
- `refactoring`: move existing code toward the chosen structure.
- `api`: public HTTP contract details.
- `database`: physical schema, migrations, indexes, query behavior.
- `documentation`: ADRs that capture rationale.
- `proof`: handoff tests at each module boundary the architecture defines;
  a clean module boundary is a clean place to assert.
