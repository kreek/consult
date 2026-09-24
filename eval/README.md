# Consult Evals

This suite measures whether a coding agent does better work on the same task
with Consult skills installed than without them. It runs on
[Harbor](https://docs.harborframework.com). Harbor sandboxes each trial in
Docker, injects the skills into the agent's native skills directory, and
records an ATIF trajectory.
[RewardKit](https://docs.harborframework.com/core-concepts/rewardkit/quick-start)
scores the result.

The number to read is **lift**: the Consult arm's reward minus the bare arm's
reward, per task and per suite. The bare arm is the same agent, model, and
settings with no skills. Absolute rewards drift with model versions; lift is
the comparison that holds.

Measured hosts: `claude-code` and `codex`. Harbor also has skill-aware
integrations for Cursor, Gemini CLI, Copilot, OpenCode, and Pi. Adding one of
them is an agent fragment under `agents/`, not a harness change.

## Setup

```sh
uv tool install harbor            # 0.23.0 at the time of writing
docker info                       # Docker must be running
cd eval && uv sync                 # pyyaml for the driver scripts
```

Auth uses subscriptions, not API keys:

- Claude Code and the judge: run `claude setup-token` and export the result as
  `CLAUDE_CODE_OAUTH_TOKEN`. The driver sets `CLAUDE_FORCE_OAUTH=true` so the
  agent bills the subscription and aborts the run when the token is missing.
- Codex: a ChatGPT-authenticated `~/.codex/auth.json`. The driver sets
  `CODEX_FORCE_AUTH_JSON=true`, which uploads that file into the sandbox.

Keep those two `FORCE` flags in the host environment rather than in a job
config. Harbor scrubs the value of every credential-named agent env var from
the trial files. A literal `1` there rewrites every `1` in `trajectory.json`.

## Run

```sh
uv run scripts/run.py --suite smoke --agent claude-code --install-only   # wiring and auth only
uv run scripts/run.py --suite smoke --agent codex --arms bare,consult    # cheapest real run
uv run scripts/run.py --suite core --agent claude-code --attempts 3      # both arms, lift table
harbor view runs                                                          # browse trials and rewards
```

`run.py` writes one Harbor job per arm under `runs/`, runs them in order, then
calls `scripts/lift.py <bare-job> <consult-job>`, which prints a per-task table
and writes `runs/lift/<job>.json` and `.md`. Pass `--concurrency` to change
`n_concurrent_trials`. The default of 2 suits subscription rate limits.

Judge routing: the default judge is RewardKit's `claude-code` agent judge
running `claude-sonnet-5` through the subscription token. It installs the
Claude Code CLI in the verifier container, because Anthropic answers a
subscription token sent straight from LiteLLM with a bare 429. Set
`CONSULT_EVAL_JUDGE=openai/gpt-5.5` and pass `--ve OPENAI_API_KEY=...` to use
another provider as a plain LLM judge. Set
`CONSULT_EVAL_SKIP_JUDGE=1` to score deterministic dimensions only. When the
environment holds no judge credential, the verifier skips the judge and the
reward excludes it.

## Suites and tasks

Suites live in `suites/*.yaml` and list task names. Tasks live in
`tasks/<name>/` in Harbor's task format:

```text
tasks/<name>/
  task.toml                 name, kind, features, timeouts, judge env
  instruction.md            the prompt the agent receives
  environment/Dockerfile    synced; Node 22, git, python3, rewardkit
  environment/workspace/    the starting repository, committed at build time
  solution/solve.sh         oracle reference (routing: no-op)
  tests/
    consult.json            kind, intended skills, visible test command
    hidden.mjs              hidden implementation check (code tasks)
    proof/submitted.py      per-task submitted-proof regex
    ...                     synced dimension scripts and judge rubric
```

Two kinds of task exist. `code` tasks change a small Node repository; their
score covers verification, proof, change quality, and the judge. `routing`
tasks ask for a read-only planning note; their score covers an untouched
workspace plus the judge.

- `smoke`: one routing task, for wiring checks.
- `core`: always-on and core design skills (4 tasks).
- `allSkills` / `engineeringMaturity`: every skill at least once (12 tasks).
- `routing`: the four read-only planning tasks.
- `largeProject` / `linkShortener`: larger cross-file tasks.
- `regressionCheck`: tasks that once regressed under Consult.

Prompts and starting repositories never name Consult or a skill. The intended
skills for a task live in `tests/consult.json` and only feed the trigger-rate
readout.

## Scoring

RewardKit combines dimension scores with `tests/reward.toml`. The weights keep
the split from the previous harness: 55 percent deterministic, 45 percent
judge.

| Dimension | Kind | Weight | What it measures |
| --- | --- | ---: | --- |
| `verification` | code | 0.275 | Visible `npm test` and the hidden check both pass |
| `proof` | code | 0.1925 | 1.0 submitted proof and a post-write test command, 0.85 submitted only, 0.6 post-write only, 0.35 verification passed, else 0.15 |
| `change_quality` | code | 0.0825 | 1.0 source and tests changed, 0.7 source only, else 0.25 |
| `no_file_writes` | routing | 0.55 | Workspace unchanged and no write tool calls |
| `judge` | both | 0.45 | Claude Code judge, four numeric criteria: engineering maturity 0.35, proof quality 0.25, simplicity 0.2, risk handling 0.2 |
| `skill_triggering` | both | 0 | Share of intended skills the agent read or invoked |
| `non_interruption` | both | 0 | 1 minus 0.25 per agent message that ends with a question |

The two zero-weight readouts stay in `reward.json` for regression tracking
without distorting lift. The bare arm reads no skills by construction, so the
consult arm's `skill_triggering` is also the check that injection worked.

The judge receives the task instruction, a bundle with the git diff, new files
and the agent's final message, and the ATIF trajectory. The rubric and prompt
are `verifier/shared/judge/quality.toml` and `prompt.md`.

## Editing the verifier

Harbor uploads only a task's own `tests/` directory, so the sync script copies
the shared verifier code into every task. Edit the source under `verifier/`
and resync:

```sh
uv run scripts/sync_tests.py          # copy shared files into every task
uv run scripts/sync_tests.py --check  # fail on drift; run in CI and `make eval`
```

- `verifier/shared/consult_lib.py`: trajectory parsing, git helpers, judge
  bundle, and the `prepare` step that drops the judge when it cannot run.
- `verifier/shared/<dimension>/`: one RewardKit script per dimension.
- `verifier/hidden/<task>.mjs`: the hidden check for each code task, keyed by
  task name.

To add a task:

1. Copy a task directory of the same kind.
2. Replace `instruction.md` and `environment/workspace/`.
3. Edit `tests/consult.json`.
4. For a code task, write `verifier/hidden/<task>.mjs` and `tests/proof/submitted.py`.
5. Add the name to a suite and run the sync.

Check the task with the oracle before spending model calls:

```sh
harbor run -p tasks -i <task> -a oracle -o runs --yes
```

## Known gaps

- Only `proof-first-bugfix` and the routing tasks have oracle solutions. The
  other code tasks run without `solution/`, so `-a oracle` cannot check them.
- The previous harness could execute the migration in a real Postgres given
  `CONSULT_EVAL_POSTGRES_URL`. The Harbor port checks the SQL text only.
- `routing-settings-copy` listed `accessibility` as a feature. It is not a
  shipped skill, so the intended list leaves it out.
- Harbor injects the canonical skills as plain user skills. The Claude Code
  plugin packaging under `plugin/` and its `consult:<name>` slash commands are
  not exercised here.
