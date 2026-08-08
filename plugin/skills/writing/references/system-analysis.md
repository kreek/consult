# System Analysis

The document form of a gap analysis: current state, ideal state, and the
transition between them, written for readers who were not in the room. The
same movement `specify` runs interactively (current surface, target shape,
tradeoffs) becomes a standalone document a stakeholder can read cold.

## Shape

1. **Frame.** Why this document exists now, what is in scope, what is not.
   One short section; the reader should know by the end of it whether the
   document is for them.
2. **Current state.** What is true today, with evidence.
3. **Ideal state.** The target, and why it is worth reaching.
4. **Transition.** The phases that get from one to the other.
5. **Risks and open questions.** What could invalidate the plan.
6. **The ask.** The decision the reader is asked to make.

## Evidence bar by section

### Current state

- Every assertion about the system cites something checkable: a file or
  module, a metric with its source, an incident, a ticket, a measurement you
  ran. Hold prose to the `proof` standard: a claim without evidence is marked
  as opinion or cut.
- Adjectives without data ("fragile", "slow", "legacy") are claims, not
  descriptions. Attach the evidence or delete the adjective.
- Describe what is, not who caused it. Blame reads as editorializing and
  dates the document.
- Include what works. A current state with no strengths reads as a pitch,
  and the transition must preserve those strengths; name them so no phase
  destroys one by accident.

### Ideal state

- A target shape, not an adjective cloud: boundaries, ownership, invariants,
  and what an observer can check when the state is reached. Hold it to the
  `architecture` and `domain-modeling` standards the code itself would face.
- Name what stays the same. The delta between the two states defines the
  work, so an ideal state that silently redraws everything hides the true
  cost.
- No technology or vendor name without the tradeoff that selects it.

### Transition

- Phases, each with four parts: the outcome, an observable exit condition,
  what it de-risks, and the rollback story.
- Order phases by risk retired per unit of effort, not by ease of starting.
- Each phase leaves the system working. A phase whose value only arrives
  when a later phase lands is one phase drawn as two.
- Dates are estimates; exit conditions are commitments. A plan with dates
  and no exit conditions is a roadmap slide, not a transition plan.

### Risks and open questions

- Only genuine unknowns that would change the plan, each with what would
  settle it. Template residue ("adoption risk") that changes nothing is
  noise.

### The ask

- End with the specific decision: approve the direction, fund a phase, staff
  a team, accept a tradeoff. If there is no decision, the document is a
  status update and should be titled as one.

## Failure modes

- **Aspirational current state.** Describing what should be true instead of
  what is. The current-state section is observational; hope belongs in the
  ideal state.
- **Adjective-cloud ideal state.** "Scalable, maintainable, modern" commits
  to nothing an observer could check.
- **Slideware transition.** Dates and swimlanes with no exit conditions and
  no rollback story.
- **Theme drift.** Sections that answer a different question than the one
  the frame promised. Move them out; do not widen the frame to keep them.
- **The buried ask.** A decision hidden in the middle of a paragraph. The
  reader should never finish unsure of what is being asked of them.
