---
name: documentation
description: "Use for docs describing existing code: READMEs, runbooks, API docs, module docs, comments."
---

# Documentation

## Iron Law

`DOCUMENT ONLY WHAT NEEDS PROSE. KEEP DOCS NEAR THE CODE, CONTRACT, OR TEAM THAT MAINTAINS THEM.`

## When to Use

- The user asks for or approves writing/reviewing READMEs, runbooks,
  tutorials, how-to guides, reference docs, module docs, or code comments:
  documentation that describes code and systems as they exist.
- Authoring or revising Consult SKILL.md files; skills are documentation for
  agents and follow the same clarity rules.
- Deciding whether prose is needed or whether a type, schema,
  generated reference, test, or command output should be the source of
  truth.

## When NOT to Use

- Forward-looking documents that record decisions or propose futures: design
  docs, ADRs, RFCs, tech specs, PRDs, requirements, acceptance criteria,
  system analyses, strategy; use `technical-writing`.
- Ordinary implementation where docs might later be useful but were not
  requested, approved, or required by a validator. Name the possible docs gap
  in the final response instead of editing docs.
- API contract design; use `api`.
- Release coordination, changelog process, release notes, version manifests,
  or migration notes; use `release`. Those artifacts land only during
  release prep.
- Alert mechanics and dashboards; use `observability`.

## Core Ideas

1. Documentation is a separate work product, not an implementation reflex.
   Before editing docs outside the user's request, ask whether docs are in
   scope unless a repo validator requires the update.
2. Living documentation has an owner, a nearby source of truth, and a
   change path; orphaned prose becomes misinformation.
3. One doc has one reader situation: tutorial, how-to, reference,
   explanation, or runbook.
4. Build the reader's knowledge in layers. Name the starting point,
   introduce terms before relying on them, and move from prerequisite
   concepts to working steps to deeper reference. Do not make readers
   infer the path.
5. Link to source-of-truth artifacts instead of restating generated
   facts. Put docs next to the code or service whose reviewers can
   catch drift.
6. Write the why, context, and tradeoffs; let code/tests/schemas prove
   mechanics.
7. Voice and prose structure follow `technical-writing`: plain, direct, concrete
   sentences, no em dashes, only words that earn their place. Load `technical-writing`
   when a document's prose quality is itself part of the deliverable.
8. Delete stale docs when you cannot fix them now.
9. Comments explain why and how when names, types, schemas, tests, or
   local structure cannot. Encode the rule in code or tests first; add a
   comment only when the reason remains non-obvious.
10. Runbooks are operational artifacts: symptom, diagnosis,
   remediation, verification, escalation.
11. Large project docs use the repo's existing docs system. If none exists,
    choose one during scaffolding or with user approval.

## Workflow

1. Confirm documentation should run now. Continue only when docs are requested,
   approved after a concrete gap is found, or required by validation.
2. Identify the reader's immediate question and choose the doc mode.
   Title the doc as that question.
3. Map the reader's starting knowledge. Add the missing concept, term,
   prerequisite, or example before the step that depends on it.
4. Check whether the answer already lives in code, schema, tests, CLI
   help, OpenAPI, or a dashboard. Write only the missing context and
   link authoritative sources.
5. Add verification: commands, expected state, review owner, or drill
   requirement. Remove stale or duplicated sections encountered during
   the edit.

## Verification

- [ ] The skill ran because docs were requested, approved after a concrete
      docs gap was found, or required by validation.
- [ ] The doc has one mode and one audience situation.
- [ ] The doc builds knowledge in order: starting point, terms,
      prerequisites, task, then deeper reference.
- [ ] Generated/reference facts link to the source of truth.
- [ ] README, runbook, or comment content matches its mode: concise README,
      operational runbook, non-obvious why/how comments.
- [ ] Stale sections are deleted or marked with a tracked rewrite owner.
- [ ] CHANGELOG, release notes, migration notes, and version manifests remain
      under `release`.

## Tripwires

| Trigger | Do this instead | False alarm |
|---|---|---|
| "Restate the API details in prose" | Link generated or authoritative sources and write only the missing context. | The source of truth is unlinkable and the fact is stable. |
| "A longer README looks more thorough" | Keep README to purpose, install/run, minimal usage, and links onward. | None. |
| "Readers will figure out the terms" | Teach terms and prerequisites before using them in steps or reference. | The doc's stated audience already owns those terms. |
| "Add a comment explaining this" | Encode rules in names, types, schemas, or tests first; comment only the why that remains non-obvious. | The reason cannot be expressed in code or tests. |
| "Note the release details in the README" | Route CHANGELOG, release notes, migration notes, and version manifests to `release`. | None. |
| "I'll update the docs while I'm here" | Ask before editing docs for an implementation change. | Docs were requested, or a repo validator requires the update. |
| "Leave the stale paragraph for now" | Delete stale prose or mark it with a tracked rewrite owner. | None. |
| "Long sentences sound professional" | Split long sentences; keep the concrete decision, contract, workflow, or reader action. | None. |

## Handoffs

- `technical-writing`: forward-looking documents: design docs, ADRs, RFCs, tech specs,
  PRDs, requirements, system analyses, and stakeholder prose generally.
- `api`: OpenAPI and wire-contract shape.
- `observability`: alert/runbook signal definitions.
- `git-workflow`: commit/PR history docs.
- `release`: CHANGELOG, release notes, migration notes, version manifests.

## References

- None; forward-looking artifact templates live with `technical-writing`.
