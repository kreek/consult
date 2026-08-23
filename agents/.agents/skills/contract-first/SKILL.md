---
name: contract-first
description: Use before locking in public functions, types, endpoints, schemas, CLI flags, event payloads, or shared structure.
---

# Contract First

## Iron Law

`CALLER-FACING INTERFACES AND SHARED STRUCTURE MUST BE APPROVED BEFORE IMPLEMENTATION.`

## When to Use

- A task defines or materially changes an interface or shared structure that
  callers outside the change will bind to: a function or type consumed by other
  modules or packages, HTTP endpoint, CLI/env/config surface, event payload,
  file format, database schema, migration step, package/module boundary, the
  public surface of a significant new module or component, project layout, or
  cross-component contract. An export with no caller outside the change is not
  yet a contract.
- A manual or installed Interface Design Gate asks for current interface,
  proposed interface, boundary reason, and user decision.
- Reviewing whether implementation started before contract approval.

## When NOT to Use

- Purely internal helper changes with no caller-facing or shared boundary
  outside the helper.
- Local file moves, private implementation organization, or refactors that do
  not create a package/module boundary future work will depend on.
- Typos, formatting, comment-only edits, or docs-only changes with no contract
  effect.
- Broad routing and skill selection; use `workflow`.
- The broader approach or solution direction is still unsettled; settle it in
  `specify` first.

## Core Ideas

1. A contract is any shape concrete enough that another caller, process,
   service, user, migration step, package, or future module will depend on it.
2. Contract-first designs that concrete contract and gets it approved before
   implementation. Working out the actual signatures, types, and shapes is this
   skill's job.
3. Approval covers the named shape only. Compatibility, rollout, renames,
   removals, and shims need their own explicit decision.
4. The gate scales with reversal cost. Gate a shape when outside callers will
   bind to it and changing it later means breakage or migration. For an
   additive, easily reversed change, state the shape in the close-out and
   continue; do not stop the work for it.
5. When no human can answer in this run (headless, scheduled, or delegated
   sessions), do not deadlock. Build the most conservative version, mark the
   contract provisional, and flag the pending decision in the close-out.
   Silence from a present user is still not approval.

## Workflow

1. **Stop before implementation lands.** Do not write source, migrations, or
   config that commit the boundary until approval is recorded.
2. **Name the current shape.** Cite file/line evidence, or state "new
   interface" or "new structure" for greenfield work.
3. **Propose the new shape.** Show the concrete signature, type, endpoint,
   CLI/env/config surface, event payload, schema, migration step, file format,
   package/module boundary, or project layout future work will bind to.
4. **Explain the boundary.** State why it belongs here, what owns each side,
   and the key tradeoff in the recommended option.
5. **Separate compatibility.** For public renames or removals, ask for a
   breaking change, alias/shim, deprecation path, or old surface retained.
6. **Record the decision.** List each proposed surface (signature, flags,
   schema, event payload, file format, or output shape) with its evidence,
   state the compatibility impact, and get one approve/revise/reject. An
   approving design or RFC approves the direction, not the concrete shapes;
   this list is the approval. Silence is not approval.
7. **Implement only the approved shape.** If implementation discovers a
   materially different contract, reopen the gate.

## Verification

- [ ] The current interface or structure is named with evidence, or marked as
      new.
- [ ] The proposed shape is concrete enough for callers or future modules to
      bind to.
- [ ] Boundary ownership and compatibility decisions are explicit.
- [ ] The proposed interfaces were listed for the user, who approved, revised,
      or rejected them before implementation landed; or no human was available
      and each shape is marked provisional in the close-out.
- [ ] Implementation matches the approved shape, or the gate was reopened.

## Tripwires

| Trigger | Do this instead | False alarm |
|---|---|---|
| "The design doc already covers this interface" | An approving design or RFC approves the direction, not the concrete shapes. List each concrete surface with evidence and get one approve/revise/reject. | The exact signature, schema, or surface was itself listed and approved. |
| "I'll implement it first and show the interface after" | Stop before implementation lands; propose the concrete shape and wait for the decision. | The surface is purely internal with no caller-facing or shared boundary. |
| "No objection means it's approved" | Silence is not approval; wait for an explicit approve, revise, or reject. | No human can answer in this run; the shape was built conservatively, marked provisional, and flagged for review. |
| "The rename is implied by the approved shape" | Compatibility (renames, removals, shims, deprecation paths) needs its own explicit decision. | The approval already named that compatibility path. |

## Optional Runtime Backstop

Some Consult installations include the manual Interface Design Gate runtime. Use
`/consult:contract [intent]` to start it when available.

## Handoffs

- `workflow`: broad routing.
- `specify`: unsettled approach or solution direction.
- `api`, `database`, `async-systems`, `security`: domain boundary risks.
- `architecture`: shared package/module/project structure.
- `proof`: prove the approved interface at the handoff where callers cross
  it; an approved contract without seam proof is unproven.
