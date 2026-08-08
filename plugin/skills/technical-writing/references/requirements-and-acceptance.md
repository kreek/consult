# Requirements and Acceptance Criteria

Use this reference when writing or tightening PRDs, specs, issues,
feature requests, user stories, or acceptance criteria.

## Purpose

The artifact should help a human and an agent agree on what behavior is
needed, what is out of scope, and what evidence will prove the work is
done. Prefer concrete behavior over product theater.

## Shape

- Goal: one sentence naming the user-visible outcome.
- Context: current behavior, problem, or constraint that makes the work
  necessary.
- Actors: the people, systems, or roles that interact with the behavior.
- Acceptance: observable outcomes written from the caller or user's
  point of view.
- Constraints: compatibility, security, accessibility, performance,
  data, rollout, or migration limits.
- Non-goals: plausible work that is intentionally out of scope.
- Proof: tests, inspections, logs, screenshots, contract checks, or
  rollout evidence that will demonstrate acceptance.

## Vague Idea Refinement

Use this before `specify` when the user has a rough idea but no
proposal worth designing yet. The goal is not a full PRD; it is a small,
reviewable brief that prevents the agent from inventing product behavior.

Capture:

- Problem: the current pain, opportunity, or user-visible gap.
- Audience: who benefits or operates the behavior.
- Outcome: the smallest useful result that would make the idea real.
- Non-goals: tempting adjacent work that is explicitly out of scope.
- Assumptions: business, technical, data, safety, or UX guesses that need
  validation before implementation.
- Proof: what would demonstrate that the idea is worth building or that the
  first slice works.

If the idea changes public contracts, data shape, workflow ownership, or
module boundaries, hand off to `specify` after this brief is clear.

## User Stories

Use the classic format only when it clarifies the reader's goal:

```text
As a <actor>, I want <capability>, so that <outcome>.
```

Do not stop there. A user story without acceptance criteria is not ready
for implementation.

## Acceptance Criteria

Prefer behavior-flavored criteria:

```text
Given <state or precondition>
When <action or event>
Then <observable result>
```

Plain bullets are fine when Given/When/Then becomes awkward. Each
criterion should be externally observable or directly provable by a
test, contract, log, screenshot, or reviewable inspection.

Good acceptance criteria:

- name the behavior, not the implementation;
- include failure and permission cases when they affect users or data;
- include compatibility and migration expectations when existing users
  or data are in scope;
- state the proof expected before the work is called done.

Avoid:

- vague outcomes such as "works correctly" or "improves UX";
- implementation tasks disguised as acceptance, such as "add a service";
- acceptance that depends on hidden internals;
- writing a story when the work is actually a bug report, migration
  note, or technical constraint.

## Clarifying Ambiguity

When the request is ambiguous, help the user sharpen it instead of
refusing the work. Draft the likely acceptance criteria, mark the
uncertain parts, and ask the smallest question that unlocks progress.

Use this pattern:

```markdown
I can proceed with this acceptance criterion unless you want different
behavior:

- Given ...
- When ...
- Then ...

Open question: should ...
```

## Tripwires

| Trigger | Do this instead | False alarm |
|---|---|---|
| "As a user..." is enough | Add concrete acceptance criteria and proof. | User explicitly asks only for a backlog title. |
| "The idea is obvious" | Write the problem, audience, smallest useful outcome, non-goals, assumptions, and proof before design. | User already provided a concrete PRD or accepted brief. |
| "The agent can infer the rest" | Draft likely criteria and ask for confirmation on the risky parts. | Mechanical implementation task with no behavior choice. |
| "Acceptance is implementation tasks" | Rewrite criteria as caller-visible behavior. | Internal-only refactor where the acceptance is unchanged public behavior plus tests. |
| "We'll know it when we see it" | Name the observable evidence before implementation starts. | Exploratory prototype clearly marked as disposable. |
