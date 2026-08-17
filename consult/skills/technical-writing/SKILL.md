---
name: technical-writing
description: "Use for forward-looking docs: design docs, ADRs, RFCs, tech specs, PRDs, requirements, system analyses, strategy."
---

# Technical Writing

## Iron Law

`THE READER'S UNDERSTANDING IS THE DELIVERABLE: PLAIN WORDS, ONE THEME, EVIDENCED CLAIMS.`

The style this skill produces is named load-bearing prose: technical writing
that is more Hemingway than David Foster Wallace. Every sentence carries
evidence, advances the document's one theme, or builds the reader's
knowledge; a sentence doing none of those is cut. Its opposite is signpost
language: words that point at the structure without holding any weight.

## When to Use

- A forward-looking document is the deliverable: one that records a decision
  or proposes a future. Design docs, ADRs, RFCs, tech specs, PRDs,
  requirements and acceptance criteria, system analyses, transition plans,
  technical strategy, proposals.
- Another skill (`specify`, `architecture`, `documentation`) produced a
  document whose readers were not in the room when the work happened.
- Reviewing or editing an existing document for voice, structure, knowledge
  build-up, or theme drift.

## When NOT to Use

- Documentation that describes code and systems as they exist (READMEs,
  runbooks, tutorials, reference docs, module docs, code comments), and doc
  placement, ownership, lifecycle, and rot; use `documentation`.
- The design decisions the document records; use `specify` and
  `architecture`. This skill owns how the document reads, not what it
  decides.
- Commit messages; use `commit`.
- CHANGELOG, release notes, and migration notes; use `release`.
- People-management artifacts (org design, performance, headcount). No
  Consult skill can check their claims; they are out of scope for this
  library.

## Core Ideas

1. **The reader's understanding is the deliverable.** Build knowledge in
   order: name the starting point, introduce each term before relying on it,
   and sequence sections so each uses only what came before. A reader who has
   to jump ahead or reread was failed by the structure, not by their
   attention.
2. **Accessible sophistication.** Plain, direct, concrete language; no
   academic jargon or flowery prose. Keep sentences short, but vary their
   length so the text has a natural cadence rather than blunt, isolated
   statements. Connect ideas with subtle logical transitions: "At its core",
   "Because of this", "In practice".
3. **Prefer the word the reader already has.** A technical term earns its
   place only when it is more precise than the plain description and the
   named audience owns it. "The generator only creates what is missing"
   beats "the generator is a reconciler"; "safe to re-run" beats
   "idempotent" unless the audience is engineers who use the word daily.
   The test: write the plain-words version first, and keep the term of art
   only if the plain version is longer, vaguer, or wrong. Section titles get
   the strictest reading, since a reader decides whether to read a section
   from its title alone.
4. **Active voice, strong verbs, direct claims.** Prefer a named actor doing
   the action over a passive construction, a strong verb over a verb propped
   up by an adverb, and a plain statement over one padded with qualifiers
   ("I think", "maybe", "somewhat"). Passive voice is right when the actor
   is irrelevant or unknown ("the token is signed"); a qualifier is right
   when the hedge is the claim itself, as when marking a statement unproven.
5. **Trust the reader's intelligence.** Do not over-explain or
   over-intellectualize. State the idea once, concretely, and let the weight
   of the idea do the work.
6. **Never comment on the writing itself.** No phrases that announce
   significance ("Here's the thing", "That distinction matters", "worth
   noting", "importantly"), no rhetorical questions answered by the next
   sentence, no "it's not just X, it's Y". These are instances of one
   category: language whose only job is to tell the reader how to feel about
   the next sentence. The test is deletion: cut the phrase, and if the
   passage loses no information, it was a signpost. State the claim and move
   on.
7. **One document, one theme.** The document answers one question, and every
   section advances it. Material that serves a different question moves to an
   appendix or another document.
8. **Prose claims are engineering claims.** A statement about the current
   system needs the same evidence a code claim needs: a file, a metric, an
   incident, a measurement. Polishing an unproven claim makes it more
   persuasive and no more true; mark it unproven instead.
9. **Length is a cost the reader pays.** Cut by selecting what to include,
   not by compressing sentences into fragments. Write documents in markdown.
   Never use em dashes; use periods, colons, commas, or parentheses.

## Workflow

1. **Name the reader and the question.** Write down who reads this document
   and the one question it answers. Title the document with that question or
   its answer.
2. **Pick the genre and load its reference.** For current-state, ideal-state,
   and transition documents, read `references/system-analysis.md`. For PRDs,
   requirements, user stories, or acceptance criteria, read
   `references/requirements-and-acceptance.md` and write from the user's goal
   to observable behavior. New genres land as references here, not as new
   skills.
3. **Outline the knowledge path.** List what the reader knows at the start
   and what each section must add for the next one to land.
4. **Gather evidence before drafting.** Collect the citations, metrics, and
   sources each claim needs, and route the substance to specialists:
   `architecture` for the target shape, `specify` for undecided directions,
   `proof` for the evidence bar.
5. **Draft in the voice.** Apply Core Ideas 2 through 6 while writing, not
   as a cleanup afterward.
6. **Edit as a separate pass.** Hunt theme drift, unintroduced terms,
   significance announcements, and sentences that do not change what the
   reader knows or decides. Delete them. Run
   `node references/style-check.mjs <file>` and clear every flag or keep it
   consciously (see the false-alarm column in Tripwires). When the document
   has another author, prefer the smallest edit that fixes the issue over
   rewriting their sentences into your own cadence.
7. **Close with the ask.** End with the decision or action the reader is
   asked to take. A document with no ask is a status update; title it as one.

## Verification

- [ ] The reader and the single question are named, and the title matches.
- [ ] Every term is introduced before a section relies on it.
- [ ] Every claim about the current system carries evidence or is marked
      unproven.
- [ ] Every phrase survives the deletion test: no significance
      announcements, no rhetorical questions answered by the next sentence,
      no "it's not just X, it's Y" constructions.
- [ ] Every term of art survives the substitution test: replacing it with a
      plain description would make the sentence longer, vaguer, or wrong.
      Headings and titles contain no term the named reader might not own.
- [ ] `references/style-check.mjs` reports no flags, or each remaining flag
      is a documented false alarm: passive with an irrelevant actor, a
      readable list sentence, a load-bearing hedge, a meaning-changing
      adverb.
- [ ] A final mechanics pass found no spelling, subject-verb agreement, or
      homophone errors (were/where, they're/their/there, its/it's,
      your/you're).
- [ ] Every section advances the document's one theme.
- [ ] The genre reference's per-section requirements are met (for a system
      analysis: every transition phase names its outcome, observable exit
      condition, risk retired, and rollback story).
- [ ] The document is markdown, contains no em dashes, and every sentence is
      load-bearing: it changes what the reader understands or decides.

## Tripwires

| Trigger | Do this instead | False alarm |
|---|---|---|
| "Open with 'Here's the thing'" | State the claim and move on. | None. |
| "This point deserves a signpost: 'worth noting', 'importantly'" | Delete the signpost; a point that matters shows it in the content. | None. |
| "It's not just X, it's Y" | Pick the claim you mean and state it once. | None. |
| "A rhetorical question will hook the reader" | Delete the question; keep the answer. | The question is the document's own question, asked once in the framing. |
| "More detail reads as more thorough" | Cut what does not change the reader's understanding or decision. | The reader asked for the exhaustive version; put it in an appendix. |
| "The reader will pick up the term as they go" | Introduce the term before the section that relies on it. | The named audience already owns the term. |
| "Define it by naming the pattern: 'X is a reconciler', 'X is a monad', 'X is an event-sourced store'" | State the behavior: what it does, what it never does, what re-running or failure costs. Name the pattern after, if at all, and link the precedent that uses the same semantics. | The named audience owns the term and the pattern name links to a prior decision the document leans on. |
| "The five-dollar word is more precise: 'idempotent', 'orthogonal', 'canonical', 'hermetic'" | Write the plain version first; keep the term only if the plain version is longer, vaguer, or wrong for this audience. | The document's named readers are specialists and the term is their working vocabulary. |
| "Passive voice reads as more formal and objective" | Name the actor and use active voice. | The actor is irrelevant or unknown ("the token is signed", "the pod is evicted"). |
| "The sentence is long, but it all belongs together" | Split it, or turn an in-sentence list into a bulleted list. | The items are few and parallel, and the sentence stays readable on one pass. |
| "A qualifier softens the claim politely: 'I think', 'maybe', 'somewhat'" | Delete the qualifier or replace it with the evidence state. | The hedge is the claim: marking a statement unproven is load-bearing. |
| "An adverb strengthens the verb: 'very', 'significantly', 'quickly'" | Pick a stronger verb or give the number. | The adverb changes meaning rather than intensity ("only", "never", "no longer"). |
| "Polish the claim now, evidence later" | Mark the claim unproven or get the evidence before the draft circulates. | The claim is uncontested ground for this audience. |
| "The template is filled in, so the spec is done" | Write concrete behavior, constraints, non-goals, and proof; templates do not replace acceptance criteria. | None. |

## Handoffs

- `specify`: the decisions the document records; design agreement before the
  document presents a direction as chosen.
- `architecture`: target-state boundaries, ownership, and system shape.
- `domain-modeling`: the data shapes and invariants an ideal state names.
- `proof`: the evidence bar for the claims the document makes.
- `documentation`: placement, ownership, and lifecycle once the document
  exists; docs that describe existing code.
- `release`: rollout plans, migration notes, and release communication.

## References

- System analysis (current state, ideal state, transition):
  `references/system-analysis.md`.
- Requirements and acceptance criteria (PRDs, specs, user stories):
  `references/requirements-and-acceptance.md`.
- ADR template: status, date, context, decision, consequences.
- Mechanical style checker (sentence length and grade, passive voice,
  adverbs, qualifiers, words with simpler alternatives):
  `references/style-check.mjs`. Run with
  `node references/style-check.mjs <file> [--max-grade N]`.
