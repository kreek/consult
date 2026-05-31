# Consult Evals

This eval suite measures whether Codex behaves better when Consult is installed
as a Codex plugin, and gates Consult changes against regressions.

**One profile, automatic baseline + lift.** There is a single profile,
`codexWithConsultSkills` (Codex with Consult enabled). Running a `regression`
over a suite automatically derives a **bare** baseline — the same profile with
its Consult layers stripped (plain Codex) — runs it once, caches it, and reports
**lift** = Consult score − bare score. So a normal regression run both tracks
drift against history *and* shows the directional win over unaided Codex, with no
separate cross-profile benchmark step.

Profile:

- `codexWithConsultSkills`: Codex with an isolated, freshly-authed home and the
  local repo registered as a codex plugin marketplace with the `consult@consult`
  plugin enabled — the same flow a real user gets after
  `codex plugin marketplace add`. Consult is applied entirely through the
  profile's `setup.layers`, so do-eval's `bareProfileOf` cleanly strips it to
  form the bare baseline.

Suites (membership in `eval/suites/*.yaml`; `eval.config.ts` owns profile, judge,
timeout, and budget policy only):

- `smoke`: one cheap read-only routing task for wiring checks.
- `core`: tasks for Consult's always-on and core design/correctness skills.
- `allSkills` / `engineeringMaturity`: a larger suite exercising every Consult
  skill at least once.
- `routing`: read-only triage/planning tasks.
- `largeProject` / `linkShortener`: larger project-style tasks for cross-file
  reasoning and end-to-end proof.
- `regressionCheck`: trials known to have regressed under Consult; rerun after
  fixes to confirm they landed.

The suite uses an LLM judge for qualitative output (engineering maturity, proof
quality, simplicity, risk handling). Deterministic scoring covers objective
evidence: forbidden file writes (routing), change quality, submitted/post-change
proof, and executable tests + hidden implementation checks. **Plugin activation
and baseline isolation are structural now:** the baseline literally has no
Consult layers, so it cannot load Consult, and each run reports how many Consult
skills it read as a finding — the lift number is the readout that activation
worked. The judge runs by default; pass `--no-judge` to inspect objective harness
checks only.

Trial prompts and starter files are intentionally neutral: they describe the
product or maintenance task without naming Consult, skills, or the quality lens
being scored. Intended skill coverage lives in each trial manifest's `features:`
list so suite coverage has one source of truth without leaking skill names into
the agent-visible task.

## Setup

This package depends on the local `do-eval` checkout through `package.json`:

```sh
cd eval
pnpm install
```

The workspace uses pnpm's `minimumReleaseAge` setting to avoid installing
registry versions published in the last 24 hours.

Set a model if the default is not what you want:

```sh
export CONSULT_EVAL_MODEL=gpt-5.3-codex
export CONSULT_EVAL_JUDGE_MODEL=gpt-5.3-codex
export CONSULT_EVAL_REASONING_EFFORT=low
```

By default, both eval workers and the judge use `gpt-5.5` with medium reasoning
effort. Codex worker effort is passed through `model_reasoning_effort`; the judge
receives the same value as its thinking setting. Epoch count defaults to 1;
override per run with `CONSULT_EVAL_EPOCHS` (the `core`/`routing` scripts set 3).

Codex authentication is read from `CODEX_HOME/auth.json` when set, otherwise from
`~/.codex/auth.json`. Each run gets a temporary isolated Codex home.

## Commands

```sh
pnpm run check            # validate config, suites, trials, plugins, coverage
pnpm run list             # show the profile, suites, and trials
pnpm run view             # start the do-eval web UI

# Regression — the default. Runs codexWithConsultSkills, auto-derives + caches a
# bare baseline, and reports lift vs that baseline (and drift vs history).
pnpm run regression:check # the two trials known to have regressed
pnpm run regression:core  # always-on and core design/correctness skills (3 epochs)
pnpm run regression:smoke # cheap routing wiring check
pnpm run regression:all   # full sweep

# Baseline — force-recompute the bare-Codex baseline for a suite (regression
# reuses the cached one automatically; run this to refresh it).
pnpm run baseline:all
pnpm run baseline:smoke

pnpm run trial -- proof-first-bugfix   # debug one trial

pnpm test                 # run eval harness tests
pnpm run typecheck        # type-check the eval harness
```

Results are written under `~/.cache/consult/eval/runs/` by default (override with
`CONSULT_EVAL_RUNS_DIR`). Trial workdirs live outside the repo to keep codex's
ancestor walk from auto-discovering Consult skills into the bare baseline.
