# Changelog

All notable changes to Consult are recorded here. The format
follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and
the project follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Removed

- The Work Ledger: the `workflow` reference file and every mention in
  `workflow`, `proof`, `specify`, `code-review`, and `AGENTS.md`. Independent
  review now receives the stated intent and acceptance criteria directly, and
  `specify` artifacts go to checked-in `docs/` when the team should keep them.

## [11.11.0] (2026-08-04)

### Added

- Four anatomy validator rules: Tripwires sections must use the trigger table,
  no skill markdown may contain an em dash (references included), any skill
  invoking the approving-design-or-RFC concept must carry the canonical sentence
  verbatim, and the workflow routing tables are cross-checked both ways against
  the skill set. Self-test fixtures and CLI tests cover each rule.
- Two eval readouts: `skill_triggering` (intended-vs-read skills from the trial
  manifest's features list) and `non_interruption` (assistant messages ending in
  a question). Both are zero-weight deterministic scores, so skill reads never
  shift the overall score, but under-triggering and gate fatigue are reportable.
- README statement that Consult ceremony scales with stakes: gates fire on
  significance and durability, routine work runs autonomously, and interruption
  count is tracked so gate fatigue is a reportable bug.
- `make smoke` (`scripts/claude-smoke.mjs`): smoke-tests changed skills against
  a real Claude Code process. The load check reads the init event, which the
  host emits before any inference, so it costs nothing and is the only check
  that proves the host accepts a skill; `validate-skill-anatomy` checks our own
  schema and cannot see a skill the host silently drops. An optional
  behavioural trial runs one do-eval trial covering the changed skills.
  Auth comes from the existing Claude Code login, so no API billing.
- Two Claude Code eval arms: `claudeWithConsultPlugin` loads the shipped plugin
  through a session-scoped `--plugin-dir` layer, and `claudeBare` reuses the
  same agent object with no layers, so the delta between the arms isolates
  Consult rather than any launch-flag difference. Auth comes from the existing
  Claude Code login, not `ANTHROPIC_API_KEY`, and codex remains the default
  profile.
- The engineering-maturity plugin now reads `Skill` and `SlashCommand` tool
  calls as activation evidence. Claude Code injects plugin skills natively, so
  an activated skill leaves no `SKILL.md` read in the transcript; matching is
  scoped to the invoking tool call because the host advertises every available
  skill as `consult:<name>` up front.

### Fixed

- The eval's skill-layer capability list is derived from `plugin/skills/` at
  config load instead of hand-listed; the hardcoded copy had silently drifted
  to 21 names while the pack ships 24.

### Changed

- Every Tripwires section now uses the trigger / do-this-instead / false-alarm
  table, replacing the bullet lists in 15 skills and adding the missing section
  to `contract-first`. The six sign-off skills carry one canonical sentence for
  the direction-vs-shapes approval rule, and the trigger-poor descriptions on
  `specify`, `contract-first`, and `official-source-check` were sharpened.
- `workflow` now states that a host instruction to settle routine questions
  yourself and keep moving is describing mechanics, not authority: the sign-off
  gates are outcome requirements and outlast it. Work everything the gate does
  not block and state assumptions, but do not build the gated shape without the
  human.

## [11.10.0] (2026-07-25)

### Added

- **CI** (`.github/workflows/ci.yml`). The repo had no CI and never had any, so
  every check was local and opt-in. Runs the validator, its self-test,
  `check:links`, repo tests, and the Pi package tests as separate steps on every
  push and pull request, so one failure cannot mask the rest. Installs Tcl
  `expect` so the `setup.sh` confirmation tests actually execute, and asserts no
  tests skip on CI. Deliberately does **not** install GNU Stow: one test asserts
  `setup.sh` refuses to run without it.
- `make eval` for the eval suite, which needs the unpublished `do-eval` sibling.
- `commandExists()` in `tests/helpers.mjs`, for guarding tests that need an
  external binary.
- A generator test asserting every declared mirror destination is written, so
  dropping one from `MIRROR_DESTS` fails immediately instead of surfacing later as
  drift.

### Fixed

- **`pnpm install` failed on a clean clone.** `eval/` was a workspace package
  depending on `do-eval` via `file:../../do-eval` — an unpublished sibling, so a
  bare install died with `ENOENT` and installed nothing, taking root `vitest` and
  `remark` with it. Every command `AGENTS.md` prescribes as the bar was
  unrunnable as documented, and `make test` could not pass on any machine but the
  maintainer's. `eval/` is no longer a workspace package.
- **Half the generated mirrors escaped the validator.**
  `generate-plugin-symlinks.mjs` writes both `plugin/skills` and
  `consult/skills`, but the validator hardcoded only the first, so Pi-bundle drift
  was caught solely by a full `vitest` run — while `AGENTS.md` tells agents to run
  the narrow validator and skip root `pnpm test` for prose edits. The validator
  now iterates `MIRROR_DESTS` imported from the generator, so the two cannot drift
  apart and a future destination is covered automatically. Drift messages are
  labelled per mirror.
- **Four tests failed for a misdiagnosed reason.** The `setup.sh` confirmation
  tests need Tcl `expect`, not GNU Stow — `stow` is stubbed by `createFakeStow`.
  They now skip with an explicit reason when `expect` is absent, so a clean local
  run is genuinely green instead of "4 red is expected".
- `tests/helpers.mjs` silently discarded `spawnSync`'s `error`, turning a missing
  binary into `status: null` and an assertion failure on an exit code. That is
  what made the misdiagnosis above possible; it now throws with the binary name.
- `make test` no longer leads with `pnpm test`. It is fail-fast, so a single test
  failure prevented the anatomy validator from ever reporting. Cheap
  deterministic checks run first.

### Changed

- Description budget raised from 2,000 to 2,400 characters, with the reasoning
  recorded in both the validator and `AGENTS.md`. The pack sat at 1,993 with
  7 characters of headroom, and the old ceiling had never actually been enforced
  because descriptions were truncated at their first inner colon. The self-test's
  budget fixtures now scale with the constant instead of hardcoding a count.

## [11.9.0] (2026-07-25)

### Added

- **Work Ledger** (`workflow/references/work-ledger.md`): a durable per-work
  artifact at `.consult/ledger/<slug>.md` carrying the request, target, approved
  decisions, and Proof Contracts across compaction, a fresh session, or a handoff.
  Deliberately not a task list — sequencing stays with the host's planning mode.
  It records what a human approved and what is actually proven, so a resumed
  context does not re-derive approvals or trust a green that no longer applies to
  the code. Each proof row pins to a code state; uncommitted greens are
  provisional and re-run before the close. `workflow` writes it at framing and
  updates it as slices land, the fast path is explicitly exempt, `proof` persists
  Proof Contracts to it, and `specify` uses it in place of the Pi-specific
  `.pi/specify/` path.
- **Independent Review** in `code-review`: the reviewer receives the diff, the
  stated intent, the acceptance criteria, and the repo's declared constraints —
  but not the implementation rationale, since that rationale is what biases a
  reviewer into accepting a line. Satisfied by a subagent, a fresh session, or a
  cold re-read; a same-context review must be labelled as such and treated as
  weaker evidence.
- **Red-Green Mode** in `proof`: names test-first as the right tool for a bug with
  a reproducible symptom, a behavior change with a clear observable, and a
  contract change, with the reminder to verify the red as deliberately as the
  green. Test-first stays a tool, not a law — "match the proof to the claim"
  remains the rule.

### Changed

- `AGENTS.md` compaction guidance now reads the Work Ledger first, giving the
  existing advice an artifact to act on.
- `.gitignore` ignores `.consult/`, since Consult is developed with Consult.

## [11.8.0] (2026-07-25)

### Added

- Documented the attended-vs-unattended host posture in `AGENTS.md`: attended
  hosts get high-level guidance because a human is the gate, and Pi gets
  runtime enforcement because nobody is watching. Records why enforcement lives
  in `consult/extensions/` and must not migrate into shared skill prose.
- `workflow` now has an explicit fast path for work that is neither significant
  nor durable, so a small self-contained change is not routed through the full
  step list.

### Changed

- `git-workflow` and `code-review` now gate on GitHub *access* rather than on
  the `gh` CLI specifically, and name GitHub MCP servers and host GitHub tools
  as the other surfaces. `gh` is absent from some sandboxes and hosted
  sessions, where the old wording left the gate unreachable.
- `code-review` no longer claims a same-context second pass "reliably" surfaces
  defects. It states the limitation — the context that produced the code
  carries the reasoning that justified it — and prefers a fresh-context
  reviewer when the host has one.
- `workflow`'s skill table now says to load a skill only when reading it would
  change the next action or the proof obligation, and that its rows mean the
  Consult skill where a host ships a built-in of the same name.
- Trimmed the Oxford conjunction from 19 skill descriptions, bringing the
  pack-wide description total to 1993 characters, back under the documented
  2,000 ceiling. No trigger keywords were removed.
- `README.md` now recommends the plugin over `./setup.sh` on Claude Code, since
  `setup.sh` registers bare skill names that collide with Claude Code built-ins
  and double-loads skills when both are installed.
- `eval/README.md` now states that all eval numbers come from Codex with
  `gpt-5.5`, and that other hosts are unmeasured.

### Fixed

- `scripts/validate-skill-anatomy.mjs` measured frontmatter descriptions only
  up to their first inner colon, because it split on `":"` with a limit of 2.
  Quoted descriptions containing a colon were under-counted (`api` measured 27
  characters instead of 104), so both the 120-character per-skill cap and the
  2,000-character pack total passed while the pack was actually over budget at
  2,069. Descriptions are now parsed in full, with quote delimiters excluded
  from the count, and the regression is covered in both the script self-test
  and the Vitest suite.

## [11.7.3] (2026-06-05)

### Changed

- Rewrote the `proof` skill in plainer, task-first language — leading with
  "prove every non-trivial claim before you call it done" — while keeping its
  structure, the Proof Contract fields, cross-skill referrals, and reference
  links unchanged.

## [11.7.2] (2026-06-05)

### Changed

- Tightened the Pi startup header logo spacing between the `L` and `T`.

## [11.7.1] (2026-06-05)

### Changed

- Updated the Pi startup header to use the compact Future-font Consult logo and
  show only provider, model, and Consult package version below it.
- Collapsed the proof widget after passing runs so approval prompts keep the
  proof count visible without repeating the individual test list.

## [11.7.0] (2026-06-01)

### Changed

- Aligned `workflow` with active-host mechanics. Consult now states that it owns
  engineering judgment and proof while the active agent host owns tool
  invocation, permission prompts, built-in skill workflows, and final response
  shape. The close step still requires outcome, evidence, and remaining risk,
  but no longer forces fixed labels.
- Removed the installable Claude instruction file and stopped shipped scaffold
  guidance from depending on `AGENTS.md`, keeping agent instruction files
  maintainer-only rather than part of the Consult skill library.
- Aligned the Pi package version with the other Consult plugin packages, fixed
  its startup header to spell CONSULT instead of ABP, and corrected the Pi GitHub
  install source prefix in the docs.

## [11.6.0] (2026-05-31)

### Changed

- Steered `domain-modeling` toward each language's standard parsing library. The
  skill described parsing at boundaries in language-agnostic terms, so at
  modeling time the model hand-rolled validators instead of reaching for the
  ecosystem's dominant tool (Pydantic in Python, Zod in TypeScript); that
  knowledge only lived in `code-review`'s language references, too late to shape
  the model. Core idea #4 now names the rule and a new tripwire reinforces it,
  guarded so it does not misfire where no clear leader exists or the project
  already standardized on another.

## [11.5.1] (2026-05-29)

### Changed

- Clarified skill prose for directness without changing doctrine. The `specify`
  description now leads with the imperative `Use for design-partner mode: ...`
  to match the other skills, and four dense sentences in `specify`, `workflow`,
  `database`, and `architecture` were split at semicolons/colons so each rule
  reads in one pass. No routing, gate, or proof rule changed.

## [11.5.0] (2026-05-25)

### Changed

- Made `proof` and `ui-design` default-on in the `workflow` router. The previous
  rows asked the model to judge whether the topic "mattered," which gave
  permission to skip both for "simple" work (a sandbox single-page calculator
  shipped without either, leaving a real linear-mode inconsistency bug in the
  results contract). `proof` is now framed as the completion gate and
  `ui-design` as the default for any user-facing UI surface, with the rare
  exclusions named instead of asking the model to decide. Concrete examples
  stay in each destination skill rather than crowding the high-level router.
- Widened `ui-design`'s "When to Use" so simple forms, single-page apps, and
  "just basic styling" qualify. The previous "materially changing" hedge was
  the same loophole at the skill level.

### Added

- `git-workflow` now requires the user to approve PR and issue title and body
  text before any `gh pr create`, `gh pr edit`, `gh issue create`, or
  `gh issue edit` runs. Permission for the `gh` command is no longer treated as
  approval for the author-facing text the command publishes.

## [11.4.0] (2026-05-25)

### Changed

- Made `contract-first` own designing the concrete contract instead of deferring
  it to `specify`. The skill had framed itself as an approval gate, "not a design
  conversation," and ejected to `specify` whenever the shape was still being
  explored, but `specify` defers concrete interfaces back to `contract-first`, so
  agents bounced contract design away too easily. Working out the actual
  signatures, types, and shapes is now stated as `contract-first`'s own job;
  ejecting to `specify` is reserved for when the broader approach is unsettled.
- Reshaped `contract-first` Core Ideas to follow the order an engineer reasons
  about a contract: recognize what makes a shape a contract, then design and gate
  it, then bound what approval covers. The recognition rule was a dangling
  fragment and is now a definitional judgment rule; the routing-to-`specify`
  content moved to When NOT to Use and Handoffs.

## [11.3.0] (2026-05-25)

### Changed

- Restructured `workflow`'s steps into a clean engineering progression: frame
  the request, classify the work by stakes, set the involvement level, load
  skills, gate durable decisions, slice the work, run the completion loop, and
  close. The previous order forced the agent to set involvement and name gates
  before classifying the work, choices the later steps then reversed.
- Gave the gate doctrine one home. The rule that an approving design or RFC does
  not approve the concrete interfaces and domain shapes under it now lives in
  the step-5 gate table and is referenced from Verification and Tripwires
  instead of being restated in roughly six places.
- Strengthened the completion loop: it now proves every behavior with specs via
  `proof` before running at least one `code-review` self-review pass, repeating
  until the specs pass and the review is clean. Added a matching Verification
  checkbox and flipped the `code-review` self-review note to the same
  proof-before-review order.
- Reworded the `workflow` tripwires in plain language.

## [11.2.1] (2026-05-25)

### Changed

- Rewrote `workflow` step 1 as a pure request router. It now names the level of
  user involvement the request needs (autonomous, brief updates, or
  options-and-approval before significant or durable decisions) and routes
  review or critique requests to `code-review`, replacing four capitalized mode
  labels (Direct, Guided, Design-partner, Review-only) that were defined and
  referenced nowhere.

## [11.2.0] (2026-05-25)

### Changed

- Bound the contract-first interface gate to implementation rather than design
  sign-off: approving a `specify` design or RFC no longer counts as approval of
  the concrete caller-facing surfaces invented during the build; each surface is
  listed for its own approve/revise/reject before it is written.
- Made `domain-modeling`'s durable core shape a real approval gate. It now
  appears in `workflow`'s enumeration of decisions needing human sign-off and
  carries its own sign-off step and verification, closing the gap where a
  non-caller-facing domain model from an approved RFC had no gate.
- Extended the "an approving design or RFC approves the direction, not the
  concrete shape" rule to `architecture` (module boundaries, shared structure,
  project layout) and `database` (schema, migration, destructive data changes)
  so every durable-decision gate states it uniformly.
- Reworded `workflow` Core Idea 3 to "consult before significant or durable
  decisions" so the headline names both gate axes instead of the abstract
  "hard-to-change work".

## [11.1.2] (2026-05-25)

### Changed

- Reframed `workflow` Core Idea 6 from "Compose over repeat" to "Don't repeat
  yourself" so it names the DRY principle directly instead of sharing the
  "Compose over" lead with idea 5.
- Removed em dashes across all skills and the README, CONTRIBUTING, and
  CHANGELOG, replacing each with a colon, comma, semicolon, or parentheses, and
  normalized the scaffolding stack YAML titles to a consistent comma form.
- Clarified `proof` contract-first testing: skip unit tests that would mostly
  restate helper internals already covered through a handoff, and test the
  contract so refactors can preserve behavior without rewriting proof.

### Added

- Added a project-local Codex `$ship` maintainer skill at
  `.agents/skills/ship/SKILL.md` for this repository's guarded release flow,
  documented in AGENTS.md. Repo-local tooling only: not part of the published
  Consult skill pack.

## [11.1.1] (2026-05-25)

### Changed

- Tightened the `workflow` skill description from "almost every coding task" to
  "every coding task" so the routing trigger reads unambiguously.

### Added

- Added `make update-installed-plugins` / `update-installed-plugins-dry-run`
  targets and the `scripts/update-installed-plugins.sh` helper to refresh
  installed plugins through each agent's official update path, with CONTRIBUTING
  notes and tests. Dev tooling only: not part of the published plugin or npm
  package.

## [11.1.0] (2026-05-25)

### Changed

- Strengthened the `workflow` skill trigger so Consult is used first for almost
  every coding task, including scaffolding, feature work, debugging, UI, tests,
  config, CI, dependencies, APIs, services, web apps, and read-only code
  questions unless they are truly trivial.

## [11.0.1] (2026-05-25)

### Fixed

- Rescoped the `workflow` consultation guidance so it gates the durable
  decisions skills produce (a `specify` design direction, a `contract-first`
  interface, a `database` migration or destructive data change, a `release`
  artifact, and history-changing or destructive `git-workflow`) rather than
  the act of loading a skill. Reasoning with `domain-modeling` no longer reads
  as needing human approval.
- Harmonized the `specify` bug-fix carve-out with `workflow` and the README:
  narrow bug fixes that restore intended behavior, not "single-line" fixes.

## [11.0.0] (2026-05-24)

### Changed

- Renamed the pack from Highline Agent Skills to **Consult** across the README,
  AGENTS.md, CONTRIBUTING, SECURITY, skill prose, and plugin/marketplace
  display metadata, and clarified the README intro framing and guidance. This
  is a deliberate major-version milestone marking the rebrand. Plugin IDs
  (`consult`), slash commands (`/consult:*`), and npm package names are
  unchanged, so the bump is non-breaking for existing installs.

## [10.5.1] (2026-05-24)

### Changed

- Clarified `workflow` request routing: spelled out the Direct, Guided,
  Design-partner, and Review-only modes and which work normally needs explicit
  human approval before implementation.

## [10.5.0] (2026-05-24)

### Changed

- Broadened the human-in-the-loop gate so significant work, not only
  hard-to-change boundaries, gets a plan or shape/API sign-off before
  implementation. `workflow`, `specify`, and `contract-first` now treat a
  substantial new module or component, non-trivial logic, or a deliberate
  observable behavior change as consultative; routine, local, and disposable
  work (including narrow bug fixes that restore already-intended behavior)
  stays autonomous.
- Renamed the GitHub repository to `kreek/consult`. Updated install URLs,
  clone paths, and plugin/package metadata accordingly. Plugin IDs, slash
  commands, and npm package names are unchanged.

## [10.4.0] (2026-05-23)

### Changed

- Renamed the pack to **Highline Agent Skills** (**HAS**) across README,
  AGENTS.md, skill prose, plugin display metadata, eval docs, and install
  URLs (`kreek/highline-agent-skills`). Plugin IDs (`abp`), slash commands
  (`/abp:*`), and npm package names are unchanged.


### Added

- Cursor plugin packaging: `.cursor-plugin/marketplace.json` and
  `plugin/.cursor-plugin/plugin.json` (skills-only), plus README install,
  CONTRIBUTING local dev and marketplace submission notes, and a `setup.sh`
  warning when a Cursor plugin and manual `~/.agents/skills/` install would
  duplicate skills.

## [10.1.0] (2026-05-20)

### Changed

- Clarified the `commit` skill so agents group commits by behavior, not by
  branch, and added `Core Ideas` guidance for reader-facing history.

## [10.0.0] (2026-05-20)

### Changed

- Removed Claude Code and Codex plugin Stop hooks so Consult plugin packages are
  skills-only. Self-review remains part of the `workflow` completion loop, and
  the Pi package keeps its `/consult:self-review` runtime command.

## [9.12.0] (2026-05-16)

### Changed

- Cap the Consult self-review Stop hook at 3 firings per `session_id` to
  prevent doom loops when the model addresses the reminder by editing more
  files (changing the diff hash) without using an acknowledgement token.
  Configurable via `Consult_SELF_REVIEW_MAX_RUNS` (default `3`). State file
  shape extended from `{ sessionId: "hash" }` to
  `{ sessionId: { hash, count } }`; legacy string entries are read
  transparently and migrate on the next write.
- Foreground component handoffs as the primary proof target in the
  `proof` skill. New Core Idea names parser → validator → domain →
  persistence, service → service, producer → queue → consumer, and
  functional-core → imperative-shell seams as where production defects
  concentrate. The outermost caller boundary is reframed as the outermost
  handoff. A new Core Idea makes the TDD departure explicit: when data,
  logic, and I/O are separated and units stay pure, unit tests stay slim
  by design; internal helpers are exercised by handoff tests above them.
  `references/data-shape-boundaries.md` is now named as the canonical
  handoff reference. `contract-first`, `architecture`, `async-systems`,
  `domain-modeling`, and `api` Handoffs sections now route handoff-proof
  in caller language.

## [9.11.0] (2026-05-16)

### Changed

- Stop hook reframed from a narrow proof reminder into a final-pass
  self-review. The injected message now routes the model into the
  `consult:code-review` skill and asks for a findings-first severity pass
  across correctness, security, evidence, dead-surface / AI-risk, and
  simplicity lenses (with handoff to `consult:proof` for missing coverage).
  Gating semantics (production-file-only, once-per-session-hash,
  git-aware, Stop-only) are unchanged.
- Hook script renamed `plugin/scripts/proof-reminder.mjs` →
  `plugin/scripts/self-review.mjs`; test renamed in lockstep.
  Acknowledgement tokens broadened: `self-review:` and `findings:` join
  the existing `proof:`, `evidence:`, `unproven`. State file
  `~/.consult-proof-gate-state.json` → `~/.consult-self-review-state.json`;
  env override `Consult_PROOF_GATE_STATE_FILE` →
  `Consult_SELF_REVIEW_STATE_FILE`.

## [9.10.3] (2026-05-15)

### Fixed

- Proof-reminder Stop hook was emitting
  `hookSpecificOutput: { hookEventName: "Stop" }`, which Claude Code's
  hook-output schema does not allow (`hookSpecificOutput` is only
  defined for `PreToolUse`, `UserPromptSubmit`, `PostToolUse`, and
  `PostToolBatch`). Validation rejected the whole JSON, so the
  reminder never reached the model. Drop the field and rely on the
  top-level `decision` and `reason` only.

## [9.10.2] (2026-05-15)

### Removed

- The `proof`, `review`, and `workflow` slash-command wrappers (in
  `plugin/commands/` and the canonical `agents/.agents/commands/`).
  Claude Code already exposes each skill as its own slash command, so
  the wrappers showed up as duplicate `/proof`, `/review`, and
  `/workflow` entries. Trigger the skills directly instead.
- Symlink generator and skill-anatomy validator branches that mirrored
  and checked the deleted command files, plus their tests.

## [9.10.1] (2026-05-15)

### Fixed

- Stop hook crash under Claude Code (`Cannot find module
  '/scripts/proof-reminder.mjs'`). The Codex hooks file
  (`plugin/hooks/hooks.json`, which uses the Codex-only
  `${CODEX_PLUGIN_ROOT}` placeholder) sat on the path Claude Code
  auto-discovers, so Claude Code loaded it alongside the correct inline
  hook from `.claude-plugin/plugin.json` and the unsubstituted
  placeholder collapsed to an absolute `/scripts/...` path. Moved the
  Codex hooks file to `plugin/.codex-plugin/hooks.json` and updated the
  Codex plugin manifest reference, leaving Claude Code with only the
  working `${CLAUDE_PLUGIN_ROOT}`-based hook.

## [9.10.0] (2026-05-15)

### Added

- Light-touch end-of-turn proof reminder hook on the Claude Code and Codex
  plugin (`Stop` event). Interrupts once per task when production code
  changed and the agent has not named proof, pointing at the `consult:proof`
  skill. Honors `stop_hook_active` to avoid infinite loops; idempotent per
  session via a state file at `~/.consult-proof-gate-state.json`
  (override with `Consult_PROOF_GATE_STATE_FILE`). Skips silently on
  docs/config-only diffs, clean trees, non-git directories, and when the
  agent has already named proof in its last message. Codex users must
  enable `[features] hooks = true` in `~/.codex/config.toml`.
- Narrow `agents/AGENTS.md` carve-out permitting completion-gate hooks
  that ride on the host's native turn-end event and inject skill-aligned
  reminders only.

## [9.9.0] (2026-05-15)

### Changed

- BREAKING: Renamed the `technical-design` skill, `/skill:technical-design`
  invocation, Pi guard command `/consult:technical-design`, and
  `consult-technical-design` runtime package to `specify`,
  `/skill:specify`, `/consult:specify`, and
  `consult-specify`. Specify keeps the design-before-code
  conversation guard, routes durable interfaces through `contract-first`, and
  captures the agreed result as an ADR, RFC, tech spec, or note.
- Workflow guidance now separates work-location choices by branch state: on
  `main`/`master`, create a new branch or create a separate worktree and
  branch; on topic branches with distinct work, continue here, branch from
  this branch, or create a separate worktree from main. It also requires
  explicit compatibility decisions for public renames/removals, treats release
  prep as separate from implementation approval, and defers `release` to
  explicit release-prep requests or post-implementation/code-review checks so
  startup routing cannot silently expand into npm/version/changelog work.
- Renamed the `data-first` skill to `domain-modeling`. The new
  `contract-first` skill (Pi Interface Design Gate) owns the temporal
  "first" position in the workflow; `data-first` was always a doctrine
  about data shapes, invariants, parsing, and effect isolation rather
  than ordering, so the name now matches what the skill teaches.
  Cross-references in canonical skills, AGENTS, README, the npm package
  README, and the eval harness have been updated. The plugin mirror at
  `plugin/skills/` is regenerated from canonical.
- Promoted the workflow-only official-source rule into a canonical
  `official-source-check` skill. `workflow`, `agents/AGENTS.md`, and README
  now route framework, library, runtime, SDK, browser, cloud, and platform
  checks through that skill instead of hiding the rule in a reference file.

## [5.1.0] (2026-05-08)

### Added

- `scaffolding` now ships a `java/service-quarkus` Backstage stack template
  for native-ready JVM services with Quarkus REST, CDI, Gradle, JUnit 5,
  RestAssured, Panache, observability, auth, scheduler, and native-image
  choices.
- `workflow` now includes a version-verified implementation reference for
  version-sensitive framework, library, runtime, and platform work.
- `workflow` now includes a simple-not-easy doctrine reference for avoiding
  ceremony, over-broad skill loading, and hidden coupling disguised as safety.
- `data-first` now ships a `complecting.md` reference: a smell catalog with
  AST-level signals (mutable field + reader + writer = state/identity/value
  braid; switch-on-tag braids who/what; ORM lazy associations braid object
  and relational semantics; setter/getter pairs; mutating builders;
  singletons; pass-through parameters; etc.) and the smallest disentangling
  move per smell. Cross-cited by `code-review` for diff sweeps.
- `refactoring` now ships a `connascence.md` reference: the Page-Jones /
  Weirich axes (Name → Type → Meaning → Position → Algorithm → Execution →
  Timing → Identity) with strength, locality, and degree dimensions, used
  to score whether a refactor weakens coupling, reduces degree, or
  tightens locality. Cross-cited by `architecture` and `code-review`.
- `workflow` now ships a `vocabulary-map.md` reference: a crosswalk from
  SOLID, Clean Architecture, Hexagonal / Ports & Adapters, and DDD
  vocabulary into the Consult simplicity-shaped implementation, so the agent
  meets the user's dialect at design time rather than asserting a
  competing one at PR review. Cross-cited by `architecture`, `data-first`,
  `refactoring`, and `code-review`.
- `release` now includes a deprecation and migration reference covering
  advisory deprecation, compulsory migration, removal, and recovery proof.
- New Pi runtime package `consult-contract-first@1.0.0` hosts
  the Interface Design Gate as a soft runtime check that pauses
  mutating tool calls when interface/contract intent appears without
  an approved gate packet. Pairs with the `whiteboarding` and
  `workflow` skills.
- New meta-package `consult` (Pi-installable) depends on
  `consult-skills`, `consult-contract-first`, and
  `consult-proof`. One-command install for the full Consult-on-Pi
  experience.
- `consult-whiteboard` now includes a Pi final-response guard that
  asks agents to explain what changed, why it is better than what came before,
  and what it enables next after implementation work.

### Changed

- BREAKING (Pi): `pi-consult` is renamed to
  `consult-skills`@5.0.0 and is skills-only; Pi runtime
  extensions live in sibling packages now. The old
  `pi-consult` npm name is deprecated pointing at the new
  name; existing installs keep working until upgrade.
- BREAKING (Pi): `pi-proof` is renamed to `consult-proof`@2.0.0
  and is now built/published from this monorepo at
  `consult-proof/` instead of the standalone `kreek/pi-proof`
  repo. The old `pi-proof` npm name is deprecated pointing at the new
  name; package contents are functionally unchanged.
- BREAKING: Skills are consolidated to reduce Codex skill-list context
  pressure: `git` + `commit` -> `git-workflow`, `deployment` +
  `versioning` -> `release`, `concurrency` + `realtime` +
  `background-jobs` -> `async-systems`, `caching` -> `performance`,
  and `testing` -> `proof`.
- Consult routing doctrine is now described as quality-driven and risk-triggered:
  `workflow` is the entry point, `proof` is both the completion gate and a
  proof-work skill, and other skills are peers selected by quality concern.
- Consult now treats durable interfaces as contract/API sign-off gates: agents
  must design the boundary, propose the contract, and get user approval
  before implementation continues. In practice this means more pause/approve
  loops than 4.12.0; expect agents to stop on any new exported type, prop,
  schema, endpoint, or migration that crosses a module boundary. Internal-only
  exports and one-module refactors do not trip the gate.
- Adds `whiteboarding` skill: a mandatory pre-code artifact that maps current
  and proposed contracts (function signatures, schemas, events, CLI, config,
  types) and surfaces resolved decisions and open questions before any
  non-trivial change. `architecture` is now downstream of `whiteboarding`.
- Versioning guidance now treats optional additive public-surface changes as
  minor unless they force existing callers to change or accept new semantics;
  this guidance now lives in `release`.
- Workflow completion guidance now requires agents to explain what they changed,
  why it improves on the previous state, and/or what it enables next.
- Git workflow guidance now recommends a separate worktree when parallel
  work is expected, or when an in-flight branch has work that overlaps
  with or should stay separate from a new task; this guidance now lives
  in `git-workflow`.
- Skill frontmatter descriptions may now be up to 120 characters each, with a
  2,000-character pack-wide description budget enforced by the validator.
- `api` now treats continuation tokens such as cursors, page tokens, sync
  tokens, and resume tokens as caller input and requires explicit
  invalid-token behavior instead of silent position fallback.
- `workflow` now includes a documentation check in the completion loop, and
  `documentation` clarifies when explanatory comments should capture
  non-obvious why/how context without encouraging comment-count targets.
- Consult doctrine now explicitly says skills ride on host harnesses rather than
  replacing browser control, delegation, tool use, memory, planning, or
  system-prompt orchestration.
- `workflow` now separates internal Consult skill routing from user-facing
  readiness notes, so agents translate skills into domain lenses and exclude
  product scope instead of listing irrelevant tools.
- `documentation` now supports refining vague product ideas into problem,
  audience, smallest useful outcome, non-goals, assumptions, and proof before
  whiteboarding or implementation.
- `security`, `workflow`, `code-review`, and `refactoring` now make context
  trust and simplification guidance more concrete.
- Eval commands now use the Pi Do Eval **Bench**, **Regression**, and
  **Trial** vocabulary; the duplicate experiment command/scripts and config
  surface were removed.
- Consult eval suites now use Pi Do Eval's file-backed `eval/suites/*.yaml`
  workflow; `eval.config.ts` is limited to profile, Bench, judge, timeout,
  and budget policy.
- Consult eval trial metadata now lives in `eval/trials/*/trial.yaml`; generic
  Trial, Regression, and Bench runner code is provided by Pi Do Eval instead
  of project-local TypeScript.

### Fixed

- `consult` now exposes its dependency skills and runtime extensions
  through its Pi manifest, so `pi install npm:consult` activates the
  skills, Interface Design Gate, proof-first runtime, and whiteboarding guard in
  one install.
- `./setup.sh` now prunes legacy Consult-owned `~/.codex/skills/` links when the
  Consult Codex plugin is installed and warns that Codex can still duplicate Consult
  via direct `~/.agents/skills/` discovery if both install paths stay enabled.

## [2.2.0] (2026-04-26)

### Added

- `workflow` master entrypoint skill: load on every software
  engineering task, identify the risk profile, and select the narrower
  Consult skills that apply.
- Acceptance-clarity and branch-hygiene gates in the `workflow` skill
  flow, with matching tripwires.
- Requirements and acceptance criteria coverage in the `documentation`
  skill, plus a new `references/requirements-and-acceptance.md`.
- Codex plugin packaging under `plugin/.codex-plugin/`.
- API evolution reference in the `api` skill.
- `data-first` and `architecture` skills (extracted from the prior
  `domain-design` skill).
- `ui-design` skill (replacing the prior `frontend` skill).
- Skill anatomy validator at `scripts/validate_skill_anatomy.py` and
  pre-commit hook at `.githooks/pre-commit`.
- `LICENSE` (MIT), `CONTRIBUTING.md`, `SECURITY.md`, and this
  `CHANGELOG.md`.
- `license` and `keywords` fields in the Claude plugin manifests so
  marketplace listings have complete metadata.
- Release script at `scripts/release.sh` to bump every manifest
  version, promote `[Unreleased]` in the changelog, run validators,
  commit, and tag in one pass.

### Changed

- README repositioned: Consult is presented as ambient; agents use
  `workflow` automatically rather than via a `/`-style command.
- Documentation skill description and triggers expanded to cover
  PRDs, specs, user stories, and acceptance criteria.

### Removed

- `domain-design` skill (split into `data-first` and `architecture`).
- `frontend` skill (replaced by `ui-design`).
- `scripts/sync_agents_md.py` and its tests (replaced by the anatomy
  validator workflow).
