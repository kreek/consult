---
name: specify
description: "Use to design before building: discovery, tradeoffs, ADRs, RFCs, tech specs, and decisions needing user agreement."
---

# Specify

## Iron Law

`DESIGN-PARTNER MODE: READ THE SYSTEM, DECIDE THE SHAPE TOGETHER, THEN RECORD WHAT WAS AGREED.`

## When to Use

- Feature work, refactors, migrations, or bug fixes that touch more than one
  contract, component, module boundary, state transition, or domain invariant.
- Adding or changing a public surface: function signature, exported type,
  endpoint, event/queue payload, CLI flag, environment variable, config key,
  file format, or database schema/migration step.
- Choosing shared project/package/module structure or a structural runtime
  dependency such as a framework, database, ORM, auth client, SDK, state
  library, or job queue.
- Ambiguous or risky implementation intent where the agent should turn fuzzy
  goals into an approved design direction before code lands.
- Significant new code with no caller-facing boundary: a substantial new module
  or component, new or rewritten non-trivial logic or an algorithm, or a
  deliberate change to observable behavior. Agree the plan or shape before
  implementing.
- The user asks to design, specify, draft an ADR/RFC/tech spec, or capture a
  design note.
- `workflow` chooses the Design-partner mode because architecture, domain
  modeling, caller-facing interfaces, cross-boundary contracts, or
  multi-component choices need human participation.

## When NOT to Use

- Typos, formatting, comment-only edits, or docs-only changes with no
  executable or contract effect.
- Internal helper extraction with no caller-visible boundary.
- Narrow bug fixes that restore intended behavior with no contract, state,
  data, or boundary change.
- Pure dependency bumps with no public surface change.
- Small local file moves or private implementation organization that does not
  establish a package/module boundary future work will depend on.
- The user wants a concrete task plan after the design is already settled; use
  workflow or the harness planning mode instead.
- A caller-facing interface is already concrete and only needs approval; use
  `contract-first` directly.

## Core Ideas

1. Specify turns fuzzy intent into shared design. Its output is agreement on
   the current surface, target shape, tradeoffs, decisions, and open questions;
   it is not autonomous coding or document theater.
2. Stay above implementation sequencing. Specify owns contracts, states,
   tradeoffs, risks, and decisions. File-by-file edits, pseudocode, and task
   checklists belong to planning after the design direction is agreed.
3. Contracts are any caller-facing boundary: function signature, module export,
   public type, error vocabulary, CLI flag, environment variable, database
   schema or migration step, event payload, file format, or config key. "API"
   does not mean only HTTP.
4. Consultation is not constant interruption. Ask when a decision would be
   expensive to reverse (caller-facing shape, shared structure, data model, or
   structural dependency) or when the work is significant enough that the user
   should shape it: a substantial new module or component, non-trivial logic, or
   a deliberate observable behavior change. Routine, local, and disposable work
   does not need a gate.

## Workflow

1. **Frame the design task.** State the intended outcome and the decision that
   needs collaboration. Say that coding waits until the shape is agreed.
2. **Read before proposing.** Summarize current contracts, data shapes, states,
   constraints, and ownership with citations. For greenfield work, name the
   adjacent convention.
3. **Learn with disposable spikes only when needed.** If code is the fastest
   way to reveal the shape, ask first, keep it local and small, and discard or
   rewrite it after convergence.
4. **Propose one target shape.** Recommend one option, name the key tradeoff,
   and mention rejected alternatives only when they explain the choice.
5. **Ask the next design question.** Ask the smallest question that changes the
   shape: approve, revise, or rule out the recommendation. List secondary
   uncertainties as notes, then revise the proposal from the user's answer.
6. **Route specialist design risks.** Use `domain-modeling` for data, state,
   effects, and invariants; `contract-first` for contract approval; and the
   domain skill for API, persistence, async, security, errors, observability,
   performance, UI, accessibility, or release risks.
7. **Converge before planning.** Iterate until the human agrees on the design
   direction or rules it out. Then hand off to planning, implementation, proof,
   or review.
8. **Capture only what will be used.** If an artifact is needed, choose the
   smallest useful form after convergence and save it in checked-in `docs/`
   when the team should keep it. Record what the user actually approved, not
   just what was proposed.

## Artifact Types

- ADR: accepted decision with context and consequences.
- RFC: proposal needing review, with tradeoffs and approval state.
- Tech spec: implementation-ready design for a scoped change, including proof
  obligations.
- Note: lightweight memory that is useful but not yet a formal decision.

When an artifact lists interfaces or domain shapes, mark each one approved or
proposed, so the build inherits an explicit list of what still needs sign-off.

## Verification

- [ ] Current surface is backed by `file:line` evidence or named greenfield
      conventions.
- [ ] The proposed shape recommends one option, names the key tradeoff,
      compatibility pressure, unresolved decisions, and proof obligations.
- [ ] User-owned decisions are approved, narrowed, or explicitly left open.
- [ ] Open questions are genuine blockers that change the design, not template
      residue or deferrable details.
- [ ] Caller-facing interfaces have `contract-first` approval before
      implementation, or implementation remains out of scope.
- [ ] An approving design or RFC approves the direction, not the concrete
      shapes. Interfaces and domain structure still get `contract-first` and
      `domain-modeling` applied during build, with sign-off on the concrete
      shapes.
- [ ] Any artifact records the agreed shape and has a purpose-fit destination.

## Tripwires

| Trigger | Do this instead | False alarm |
|---|---|---|
| "I already know what the design should be" | A design written before reading code is speculation. Read and cite the current surface first. | Greenfield work where the adjacent convention is named instead. |
| "I'll build it to discover the shape" | Ask first, keep spikes local, small, and disposable; building the whole thing turns discovery into unapproved implementation. | The user approved a disposable spike. |
| "The design file exists, so the contract is approved" | A design file is not approval for a contract, migration, config surface, or caller dependency; get the explicit decision. | The user explicitly approved those decisions in the artifact. |
| "Ask about everything at once" | Ask the smallest question that changes the shape; one recommended decision with notes beats a question barrage. | None. |
| "The human should come up with the design" | Design-partner means the agent proposes concrete options; the human approves, revises, or rules them out. | None. |
| "Leave the open question for code review" | Open questions that block the design get asked now. | The question is a deferrable detail that does not change the shape. |

## Handoffs

- `contract-first`: contract approval.
- `writing`: the artifact itself; ADR, RFC, tech spec, and analysis prose
  and structure.
- `documentation`: docs placement and rot risk once the artifact exists.
- `domain-modeling`: data shapes, invariants, transitions, and effects.
- `architecture`: boundaries, ownership, layering, and system shape.
- `proof`: design proof obligations.
- `api`, `database`, `async-systems`, `security`, `error-handling`,
  `observability`, `performance`, `ui-design`, `accessibility`, and `release`:
  specialist lenses when the design touches those domains.

## References

- ADR template: status, date, context, decision, consequences.
- The standalone Pi contract-first runtime package has been removed; use this
  skill directly when interface design needs an explicit gate.
