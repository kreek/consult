# Consult

Drawn from 25 years of software engineering across startups and large
organizations, Consult is a human in the loop focused portable skill library for
raising the engineering maturity of coding agents.

Humans are good at mapping real-world issues to technical solutions, and, given enough context,
coding agents are good at generating a correct implementation. Consult does not try to
change either side of that equation: it does not automate humans away, and it
does not change how coding agents, or their harnesses, work internally. Instead, it
augments the collaboration between them so agent-assisted work produces simpler,
trustworthy, and maintainable production-grade software while humans still own
intent, design, and acceptance.

Consult is not a vibe-coding safety net. It works best when you have
enough software fundamentals to judge plans, tradeoffs, risk, and proof. Consult can
still suggest a solution, but it's more effective if you can make the hard
engineering decisions yourself (plus you'll actually know how the code works).

## What Consult guides agents to do

- Keep humans in the loop for significant and hard-to-change work: public
  interfaces, project structure, dependency picks, data boundaries, long-lived
  behavior, substantial new modules, non-trivial logic, and deliberate behavior
  changes.
- Use AI to improve the developer's mental model, not to replace it.
- Model data first: make values, states, and rules clear; limit side effects;
  keep state changes at the edges.
- Show their work: prove behavior with tests, contracts, logs, or visible
  checks rather than relying on what seems correct.
- Treat security, data safety, and accessibility as essential, not extras.
- Plan beyond launch: invest in observability, reliability, safe deployment,
  and a rollback plan.
- Organize work into clear, reviewable changes humans can trust and maintain.

## Ceremony scales with stakes

Consult is not a fixed approval pipeline. The `workflow` skill classifies each
task by significance (how much other code it impacts) and durability (how
costly it is to reverse), then sets the involvement level from those stakes.
Low-stakes, disposable work runs autonomously with no gates. Approval gates
(design direction, caller-facing interfaces, durable data shapes, migrations)
fire only when the output is significant or hard to change, and each gate asks
one decision question, not a barrage. If Consult feels like it is asking too
often on routine work, that is a bug: the eval suite tracks interruption count
per trial, and reports of gate fatigue are worth filing.

## Install

Most users should install the package for their primary agent. Use the manual
install only when you want one shared skill directory across several tools, or
when your tool does not support plugins.

### Claude Code

Inside Claude Code:

```text
/plugin marketplace add kreek/consult
/plugin install consult@consult
```

Prefer the plugin over `./setup.sh` on Claude Code. The plugin namespaces
skills as `/consult:<skill>`, which keeps them distinct from Claude Code's
built-in skills; `setup.sh` symlinks `~/.claude/skills` and registers bare
names, so `code-review` and `security` become ambiguous with the built-ins of
the same name. Running both also loads every skill twice. Pick one.

### Codex

```sh
codex plugin marketplace add kreek/consult
```

Then open `/plugins` in Codex, find **Consult** in the list,
press Enter to open its details, and select `Install plugin`.

To update:

```sh
codex plugin marketplace upgrade consult
```

Then open `/plugins`, find **Consult** in the list, press Enter
to open its details, and select `Install plugin` again.

### Cursor

Install from the [Cursor Marketplace](https://cursor.com/marketplace) (search for
**Consult** or submit this repo at
[cursor.com/marketplace/publish](https://cursor.com/marketplace/publish) if it is
not listed yet). Open the marketplace panel in Cursor, install **consult**, then
confirm skills under **Settings → Rules → Agent Decides**. Invoke a skill with
`/skill-name` in Agent chat (for example `/workflow`, `/proof`).

To test from a local checkout before marketplace listing:

```sh
mkdir -p ~/.cursor/plugins/local
cp -R /path/to/consult/plugin ~/.cursor/plugins/local/consult
```

Reload the window (**Developer: Reload Window**). Prefer `cp -R` over symlinks;
some Cursor builds do not load symlinked local plugins reliably.

If you also run `./setup.sh`, Cursor can load the same skills twice (plugin plus
`~/.agents/skills/`). Use either the Cursor plugin or manual install for Cursor,
not both.

Developing inside this repository with a local plugin copy also duplicates skills
(project `agents/.agents/skills/` plus the plugin). See
[`CONTRIBUTING.md`](CONTRIBUTING.md#local-plugin-development).

### Pi

```sh
pi install git:github.com/kreek/consult
```

`github:` is not a Pi package source prefix; use `git:` for GitHub shorthand.
After installing, run `/reload` inside Pi. Consult includes bundled skills plus
runtime extensions for `/proof` and `/consult:self-review`.

### Google Antigravity

Antigravity's CLI (`agy`) manages plugins with `agy plugin install`. Consult ships a
ready-to-install plugin at `plugin/` (a `plugin.json` marker plus a `skills/`
directory). Install it from a local checkout:

```sh
agy plugin install /path/to/consult/plugin
```

`agy` copies the plugin into `~/.gemini/antigravity-cli/plugins/consult` and
registers its skills; verify with `agy plugin list`. Because it copies rather
than links, re-run the command (or `./setup.sh`) after pulling new skills.
`./setup.sh` runs this automatically when `agy` is on your PATH.

### Manual (multi-agent or unsupported plugins)

Prerequisites: Git and GNU Stow. Install Stow with one of:

```sh
brew install stow   # macOS
apt install stow    # Debian/Ubuntu
dnf install stow    # Fedora/RHEL
```

```sh
git clone https://github.com/kreek/consult.git
cd consult
./setup.sh
```

`setup.sh` prints the actions it will take and confirms before changing
anything. It links `~/.agents/skills/`, installs the Antigravity plugin via
`agy plugin install`, and links tool-specific skill locations when those tools
are present. End-user installs do not need Python or uv.

## Skills

Consult includes 24 skills. Open a skill for its triggers, workflow, and
verification.

- Routing and proof:
  - [`workflow`](agents/.agents/skills/workflow/SKILL.md): Use first for almost every software engineering task to route risks, choose skills, and define proof.
  - [`proof`](agents/.agents/skills/proof/SKILL.md): Tests, claims, invariants, behavior specs, edge cases, and evidence.
  - [`contract-first`](agents/.agents/skills/contract-first/SKILL.md): Approve caller-facing interfaces or shared structure before implementation.
- Design:
  - [`specify`](agents/.agents/skills/specify/SKILL.md): Design-partner mode for discovery, tradeoffs, decisions, and design artifacts.
  - [`domain-modeling`](agents/.agents/skills/domain-modeling/SKILL.md): Data shapes, invariants, state transitions, parsing, and effects.
  - [`architecture`](agents/.agents/skills/architecture/SKILL.md): Architecture decisions, module boundaries, coupling, layering, and system shape.
- Correctness and change:
  - [`code-review`](agents/.agents/skills/code-review/SKILL.md): Review diffs and PRs for bugs, regressions, edge cases, and merge readiness.
  - [`debugging`](agents/.agents/skills/debugging/SKILL.md): Reproduce symptoms, isolate causes, inspect evidence, and fix bugs.
  - [`error-handling`](agents/.agents/skills/error-handling/SKILL.md): Error types, propagation, retries, user messages, and recovery.
  - [`refactoring`](agents/.agents/skills/refactoring/SKILL.md): Behavior-preserving change, tests, and safe rewrites.
  - [`official-source-check`](agents/.agents/skills/official-source-check/SKILL.md): Check external behavior against official sources.
- Safety:
  - [`security`](agents/.agents/skills/security/SKILL.md): Auth, secrets, crypto, input validation, dependency risk, and trust boundaries.
  - [`database`](agents/.agents/skills/database/SKILL.md): Schemas, migrations, indexes, transactions, query plans, and locking.
  - [`release`](agents/.agents/skills/release/SKILL.md): Release prep and release-artifact sync, on request or approval.
- Public surfaces:
  - [`api`](agents/.agents/skills/api/SKILL.md): REST API contracts: endpoints, fields, evolution, status codes, errors, pagination, idempotency.
  - [`documentation`](agents/.agents/skills/documentation/SKILL.md): READMEs, ADRs, runbooks, API docs, and comments.
  - [`ui-design`](agents/.agents/skills/ui-design/SKILL.md): Frontend UI, layouts, components, responsive behavior, and usability.
  - [`accessibility`](agents/.agents/skills/accessibility/SKILL.md): WCAG, ARIA, keyboard, focus, contrast, and inclusive states.
- Production quality:
  - [`async-systems`](agents/.agents/skills/async-systems/SKILL.md): Concurrency, queues, streams, pub/sub, ordering, and backpressure.
  - [`observability`](agents/.agents/skills/observability/SKILL.md): Logs, metrics, traces, health checks, dashboards, alerts, and SLOs.
  - [`performance`](agents/.agents/skills/performance/SKILL.md): Profiling, latency, throughput, allocation, caching, and hot paths.
- Repo workflow:
  - [`commit`](agents/.agents/skills/commit/SKILL.md): Staging reviewed work, commit splits, and messages.
  - [`scaffolding`](agents/.agents/skills/scaffolding/SKILL.md): New projects, package setup, quality tooling, CI, and repo structure.
  - [`git-workflow`](agents/.agents/skills/git-workflow/SKILL.md): Branches, history edits, conflicts, rebases, recovery, and force-push.

Greenfield stack templates live under
[`scaffolding/references/stacks/`](agents/.agents/skills/scaffolding/references/stacks/).
Shared language defaults are in
[`language-defaults.md`](agents/.agents/skills/scaffolding/references/language-defaults.md).

## How routing works

Consult routing is **collaboration-aware, quality-driven, and risk-triggered**.
Risk determines which skills load; working mode determines whether the agent
should continue, ask for approval, or stay read-only.

The working modes are **Direct**, **Guided**, **Design-partner**, and
**Review-only**. Most implementation work stays in Direct or Guided mode.

Consult is autonomous by default and consultative for significant or hard-to-change
work. The agent should get a plan or shape/API sign-off before significant new
code (a substantial new module or component, non-trivial logic, or a deliberate
behavior change) and before it locks in a caller-facing interface, class or
library API, project/package/module structure, structural runtime dependency,
data model, or boundary that future work will depend on. Local helpers, private
file moves, and narrow bug fixes that restore intended behavior should not become
consultation gates.

Caller-facing interfaces and shared structure trigger `contract-first`: the
agent stops at one recommended contract/API/structure and high-level plan, then
asks for approval before implementation continues.

See [`workflow`](agents/.agents/skills/workflow/SKILL.md) for the full
routing model and [`contract-first`](agents/.agents/skills/contract-first/SKILL.md)
for sign-off on interfaces and shared structure.

## Evaluation

[`eval/README.md`](eval/README.md) benchmarks Codex with and without Consult
against shared engineering tasks. It combines deterministic hidden tests with
LLM-judged engineering maturity, proof quality, simplicity, and risk handling.

## Contributing

See [`CONTRIBUTING.md`](CONTRIBUTING.md) for project conventions, the skill
authoring template, branching rules, checks, and maintenance steps. Skill
authoring rules and pack-versioning policy live in
[`AGENTS.md`](AGENTS.md#skill-anatomy-enforced-by-the-validator).

## License

MIT: see [`LICENSE`](LICENSE). Third-party/adapted extension notices are listed
in [`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md).

## Uninstall

Manual install:

```sh
stow --target="$HOME" -D agents
```

Manual cleanup may still be needed for tool-specific symlinks.

If you installed the Claude Code plugin, run these from inside Claude Code:

```text
/plugin uninstall consult@consult
/plugin marketplace remove consult
```

For Codex, remove Consult from the plugin UI or marketplace commands. For Cursor,
disable or uninstall **consult** from the marketplace panel (or remove
`~/.cursor/plugins/local/consult` and any `~/.cursor/plugins/cache/consult` copy). For
Antigravity, run `agy plugin uninstall consult`.
